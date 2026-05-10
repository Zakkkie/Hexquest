import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory, Plan, PlanStep } from '../types';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findBestDigTargets, findHiveTarget, resolveBuildChain } from './planning';
import { GAME_CONFIG } from '../rules/config';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES & CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

const HIVE_RADIUS         = 30;
const PLAN_TTL            = 200;
const MAX_WAIT_STREAK     = 4;   
const MONUMENT_ZONE_R     = 4;   
const MAX_BFS_STEPS       = 400;
const MAX_COLUMN_HEIGHT   = 8;   
const STUCK_THRESHOLD     = 5;   

const STOCKPILE_TARGET    = 3;   
const EXPLORE_RADIUS      = 50;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const hexKey = (q: number, r: number) => getHexKey(q, r);
const dist   = (a: HexCoord, b: HexCoord) => cubeDistance(a, b);

const currentHex = (bot: Entity, grid: Record<string, Hex>): Hex | null =>
    grid[hexKey(bot.q, bot.r)] ?? null;

const buildNavObstacles = (bot: Entity, obstacles: HexCoord[], reservedHexKeys?: Set<string>): HexCoord[] => {
    const nav = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r);
    if (reservedHexKeys) {
        reservedHexKeys.forEach(k => {
            const [q, r] = k.split(',').map(Number);
            nav.push({ q, r });
        });
    }
    return nav;
};

const buildClaimedSet = (bot: Entity, allBots: Entity[]): Set<string> => {
    const claimed = new Set<string>();
    for (const other of allBots) {
        if (other.id === bot.id) continue;
        if (other.memory?.targetHexId) claimed.add(other.memory.targetHexId);
    }
    return claimed;
};

const buildMonumentRestriction = (monument: Hex, index: WorldIndex, isCampaign?: boolean): Set<string> => {
    const restricted = new Set<string>();
    const radius = isCampaign ? 2 : MONUMENT_ZONE_R;
    const candidates = index.getHexesInRange(monument, radius);
    for (const hex of candidates) {
        restricted.add(hex.id); 
    }
    return restricted;
};

const getReachableHexes = (bot: Entity, grid: Record<string, Hex>, navObstacles: HexCoord[], maxDist: number = 20): Set<string> => {
    const reachable = new Set<string>();
    const startKey = hexKey(bot.q, bot.r);
    const queue: { q: number, r: number, dist: number }[] = [{ q: bot.q, r: bot.r, dist: 0 }];
    const obsKeys = new Set(navObstacles.map(o => hexKey(o.q, o.r)));
    
    reachable.add(startKey);
    
    let head = 0;
    while (head < queue.length) {
        const current = queue[head++];
        if (current.dist >= maxDist) continue;
        
        const currentHex = grid[hexKey(current.q, current.r)];
        const currentLevel = currentHex ? currentHex.maxLevel : 0;
        
        const neighbors = getNeighbors(current.q, current.r);
        for (const n of neighbors) {
            const nKey = hexKey(n.q, n.r);
            if (reachable.has(nKey) || obsKeys.has(nKey)) continue;
            
            const nHex = grid[nKey];
            if (!nHex || nHex.structureType === 'VOID') continue;
            if (nHex.maxLevel > bot.playerLevel) continue;
            if (Math.abs(currentLevel - nHex.maxLevel) > 1) continue;
            
            reachable.add(nKey);
            queue.push({ q: n.q, r: n.r, dist: current.dist + 1 });
        }
    }
    return reachable;
};

const yieldMove = (bot: Entity, grid: Record<string, Hex>, obstacles: HexCoord[], monument: Hex | null, stateVersion: number, mem: BotMemory, reason: string): AiResult | null => {
    const nbs = getNeighbors(bot.q, bot.r).filter(n => {
        const h = grid[hexKey(n.q, n.r)];
        if (!h || h.structureType === 'VOID' || h.maxLevel > bot.playerLevel) return false;
        if (obstacles.some(o => o.q === n.q && o.r === n.r)) return false;
        return true;
    });

    if (nbs.length === 0) return null;
    if (monument) nbs.sort((a, b) => dist(b, monument) - dist(a, monument));

    const cost = calculateMovementCost(bot, [nbs[0]], grid);
    if (!cost.canAfford) return null;

    return { action: { type: 'MOVE', path: [nbs[0]], stateVersion }, debug: `Yield(${reason})`, memory: { ...mem, waitStreak: 0 } };
};

// ─────────────────────────────────────────────────────────────────────────────
// GAME PHASE & MEMORY
// ─────────────────────────────────────────────────────────────────────────────

type GamePhase = 'EXPLORE' | 'STOCKPILE' | 'ASSAULT';

const detectGamePhase = (bot: Entity, monument: Hex | null, allBots: Entity[]): GamePhase => {
    if (!monument) return 'EXPLORE';
    const effectiveTarget = Math.min(STOCKPILE_TARGET, bot.maxStorage ?? 4);
    const selfReady       = bot.storage >= effectiveTarget;

    if (!selfReady) return 'STOCKPILE';

    const anyPeerStockpiling = allBots.some(b =>
        b.id !== bot.id && (b.storage ?? 0) < effectiveTarget &&
        (b.memory?.phase === 'STOCKPILE' || b.memory?.phase === 'EXPLORE' || !b.memory?.phase)
    );

    const waitedTooLong = (bot.memory?.stockpileWaitTicks ?? 0) > 30;
    if (anyPeerStockpiling && !waitedTooLong) return 'STOCKPILE';
    return 'ASSAULT';
};

const initMemory = (bot: Entity): BotMemory => ({
    lastPlayerPos: null, stuckCounter: 0, mode: 'GATHER', projectFailCount: 0,
    botRole: 'BUILDER', waitStreak: 0, targetHexId: null, plan: null,
    blacklistedTargets: [], phase: 'EXPLORE', exploreAnchor: null, stockpileWaitTicks: 0,
    lastActionType: null,
    ...(bot.memory ?? {}),
});

// ─────────────────────────────────────────────────────────────────────────────
// STAIRCASE LOGIC
// ─────────────────────────────────────────────────────────────────────────────

interface StaircaseTarget { hex: Hex; levelsNeeded: number; idealLevel: number; }

const findStaircaseTarget = (bot: Entity, grid: Record<string, Hex>, monument: Hex, navObstacles: HexCoord[], claimedSet: Set<string>, blacklisted: string[], reachableSet: Set<string>): StaircaseTarget | null => {
    const open: Hex[] = [];
    const visited     = new Set<string>();
    const candidates: StaircaseTarget[] = [];

    for (const c of getNeighbors(monument.q, monument.r)) {
        const h = grid[hexKey(c.q, c.r)];
        if (h && h.structureType !== 'VOID') open.push(h);
    }

    let steps = 0;
    while (open.length > 0 && steps < MAX_BFS_STEPS) {
        steps++;
        const current = open.shift()!;
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        if (claimedSet.has(current.id) || blacklisted.includes(current.id)) continue; 
        if (navObstacles.some(o => o.q === current.q && o.r === current.r)) continue;

        const d          = dist(monument, current);
        const idealLevel = Math.max(0, monument.maxLevel - d);

        if (current.currentLevel < idealLevel) {
            const levelsNeeded = idealLevel - current.currentLevel;
            const nbs          = getNeighbors(current.q, current.r);
            const growCheck    = checkGrowthCondition(current, bot, nbs, grid, navObstacles);

            if (growCheck.canGrow) {
                if (reachableSet.has(current.id)) {
                    candidates.push({ hex: current, levelsNeeded, idealLevel });
                    if (candidates.length >= 5) break; 
                }
            } else if (growCheck.missingSupports) {
                for (const ms of growCheck.missingSupports) {
                    const mh = grid[hexKey(ms.q, ms.r)];
                    if (mh && !visited.has(mh.id)) open.unshift(mh);
                }
                for (const nb of getNeighbors(current.q, current.r)) {
                    const nh = grid[hexKey(nb.q, nb.r)];
                    if (nh && !visited.has(nh.id) && nh.structureType !== 'VOID' && dist(nh, monument) >= d) open.push(nh);
                }
            }
        }
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => {
        const progressA = a.idealLevel - a.levelsNeeded;
        const progressB = b.idealLevel - b.levelsNeeded;
        if (progressB !== progressA) return progressB - progressA;
        const dMonA = dist(monument, a.hex);
        const dMonB = dist(monument, b.hex);
        if (dMonA !== dMonB) return dMonA - dMonB;
        return dist(bot, a.hex) - dist(bot, b.hex);
    });

    return candidates[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// CONCENTRIC EXPLORE PLAN
// ─────────────────────────────────────────────────────────────────────────────

const buildExplorePlan = (bot: Entity, grid: Record<string, Hex>, index: WorldIndex, _navObstacles: HexCoord[], claimedSet: Set<string>, stateVersion: number, allBots: Entity[], mem: BotMemory, reachable: Set<string>): Plan => {
    // 1. Если мы бедные, сначала копаем/строим (экономика)
    if (bot.coins < 10) {
        if (bot.storage === 0) {
            const digTargets = findBestDigTargets(bot, grid, index, allBots, 5, undefined, reachable);
            for (const t of digTargets) {
                if (!reachable.has(t.hex.id)) continue;
                if (claimedSet.has(t.hex.id) || (mem.blacklistedTargets || []).includes(t.hex.id)) continue;
                return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Explore:EconomyDig' };
            }
        } else {
            // Try to build
            const botPos = { q: bot.q, r: bot.r };
            let bestBuild: Hex | null = null;
            let bestScore = -9999;
            for (const id of reachable) {
                const hex = grid[id];
                if (!hex || hex.structureType === 'VOID' || hex.structureType === 'MONUMENT') continue;
                if (hex.ownerId && hex.ownerId !== bot.id && hex.ownerId !== 'player-1') continue;
                if (hex.maxLevel > bot.playerLevel && dist(botPos, hex) > 0) continue;
                if (claimedSet.has(hex.id) || (mem.blacklistedTargets || []).includes(hex.id)) continue;

                const check = checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, _navObstacles);
                if (check.canGrow) {
                    const d = dist(botPos, hex);
                    let score = -d * 2;
                    score += hex.currentLevel * 50;
                    if (d === 0) score += 20;
                    if (hex.ownerId === bot.id) score += 10;
                    if (score > bestScore) {
                        bestScore = score;
                        bestBuild = hex;
                    }
                } else if (check.missingSupports && check.missingSupports.length > 0) {
                    const resolved = resolveBuildChain(hex, bot, grid, index, 0);
                    if (resolved && reachable.has(resolved.hex.id) && !(mem.blacklistedTargets || []).includes(resolved.hex.id)) {
                        const d = dist(botPos, resolved.hex);
                        let score = -d * 2;
                        score += resolved.hex.currentLevel * 50;
                        if (d === 0) score += 20;
                        if (resolved.hex.ownerId === bot.id) score += 10;
                        if (score > bestScore) {
                            bestScore = score;
                            bestBuild = resolved.hex;
                        }
                    }
                }
            }
            if (bestBuild) {
                return { steps: [{ type: 'MOVE_TO', targetId: bestBuild.id }, { type: 'UPGRADE', targetId: bestBuild.id }], createdAt: stateVersion, label: 'Explore:EconomyBuild' };
            }
        }
    }

    const anchor: HexCoord = { q: 0, r: 0 };
    
    // Optimized: Use reachable set directly
    const unrevealedByDist: Record<number, Hex[]> = {};
    
    for (const id of reachable) {
        const h = grid[id];
        const isRevealedForBot = h?.botRevealed && (h.botRevealed[bot.id] || h.botRevealed['SHARED_BOTS']);
        if (!h || h.structureType === 'VOID' || isRevealedForBot) continue;
        if ((mem.blacklistedTargets || []).includes(h.id)) continue;
        
        const d = dist(anchor, h);
        if (d > EXPLORE_RADIUS) continue;

        if (!unrevealedByDist[d]) unrevealedByDist[d] = [];
        unrevealedByDist[d].push(h);
    }

    let currentRing = 0; 
    let ringCandidates: Hex[] = [];

    while (currentRing <= EXPLORE_RADIUS) {
        if (unrevealedByDist[currentRing]) {
            ringCandidates = unrevealedByDist[currentRing];
            break;
        }
        currentRing++;
    }

    if (ringCandidates.length === 0) {
        return { steps: [], createdAt: stateVersion, label: 'Explore:Done' };
    }

    const getAngle = (q: number, r: number) => Math.atan2(Math.sqrt(3) * (q + r / 2), 1.5 * r);
    const idHash = bot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const botIndex = idHash % (allBots.length || 1);
    const idealAngle = (Math.PI * 2 / (allBots.length || 1)) * botIndex;

    const pool = ringCandidates.sort((a, b) => {
        const claimedA = claimedSet.has(a.id) ? 1 : 0;
        const claimedB = claimedSet.has(b.id) ? 1 : 0;
        if (claimedA !== claimedB) return claimedA - claimedB; 

        const angleA = getAngle(a.q, a.r);
        const angleB = getAngle(b.q, b.r);
        
        let diffA = Math.abs(angleA - idealAngle);
        if (diffA > Math.PI) diffA = (Math.PI * 2) - diffA;
        
        let diffB = Math.abs(angleB - idealAngle);
        if (diffB > Math.PI) diffB = (Math.PI * 2) - diffB;

        const scoreA = (diffA * 0.7) + (dist(bot, a) * 0.3);
        const scoreB = (diffB * 0.7) + (dist(bot, b) * 0.3);

        return scoreA - scoreB;
    });

    return { steps: [{ type: 'MOVE_TO', targetId: pool[0].id }], createdAt: stateVersion, label: `Explore R${currentRing}` };
};

// ─────────────────────────────────────────────────────────────────────────────
// MINING & STOCKPILING
// ─────────────────────────────────────────────────────────────────────────────

const buildMinePlan = (bot: Entity, grid: Record<string, Hex>, index: WorldIndex, _navObstacles: HexCoord[], claimedSet: Set<string>, stateVersion: number, allBots: Entity[], monument: Hex | null, mem: BotMemory, reachable: Set<string>): Plan => {
    const restriction = monument ? buildMonumentRestriction(monument, index, mem.isCampaign) : undefined;
    const digTargets  = findBestDigTargets(bot, grid, index, allBots, 10, restriction, reachable);

    for (const t of digTargets) {
        if (!reachable.has(t.hex.id)) continue;
        if (claimedSet.has(t.hex.id) || (mem.blacklistedTargets || []).includes(t.hex.id)) continue;
        if (dist(bot, t.hex) > HIVE_RADIUS) continue;
        return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Mine' };
    }
    return { steps: [], createdAt: stateVersion, label: 'Mine:NoTarget' };
};

const buildStockpilePlan = (bot: Entity, grid: Record<string, Hex>, index: WorldIndex, monument: Hex, navObstacles: HexCoord[], claimedSet: Set<string>, stateVersion: number, allBots: Entity[], mem: BotMemory, reachable: Set<string>): Plan => {
    const effectiveTarget = Math.min(STOCKPILE_TARGET, bot.maxStorage ?? 4);
    if (bot.storage >= effectiveTarget) {
        mem.stockpileWaitTicks = (mem.stockpileWaitTicks ?? 0) + 1;
        return { steps: [], createdAt: stateVersion, label: 'Stockpile:Waiting' };
    }
    mem.stockpileWaitTicks = 0;
    return buildMinePlan(bot, grid, index, navObstacles, claimedSet, stateVersion, allBots, monument, mem, reachable);
};

// ─────────────────────────────────────────────────────────────────────────────
// THE MERGED PLAN BUILDER
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// COMPETE MODE: для уровней без монумента — бот строит вверх на ближайшем доступном гексе
// Цель: конкурировать с игроком за ту же цель (ранг/кредиты)
// ─────────────────────────────────────────────────────────────────────────────

const buildCompetePlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    mem: BotMemory,
    reachable: Set<string>
): Plan => {
    // Шаг 1: если нет материалов — копать
    if (bot.storage === 0) {
        const digTargets = findBestDigTargets(bot, grid, index, [], 5, undefined, reachable);
        for (const t of digTargets) {
            if (!reachable.has(t.hex.id)) continue;
            if ((mem.blacklistedTargets || []).includes(t.hex.id)) continue;
            return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Compete:Dig' };
        }
    }

    // Шаг 2: есть материалы — найти лучший гекс для апгрейда
    // В кампании 1.6 цель - построить L4. Ищем самый высокий гекс, который мы можем апгрейдить.
    const botPos = { q: bot.q, r: bot.r };
    let bestBuild: Hex | null = null;
    let bestScore = -9999;

    // Optimized: Use reachable set directly
    for (const id of reachable) {
        const hex = grid[id];
        if (!hex || hex.structureType === 'VOID' || hex.structureType === 'MONUMENT') continue;
        
        // Не можем строить на чужих базах (но можем на нейтральных или своих)
        if (hex.ownerId && hex.ownerId !== bot.id && hex.ownerId !== 'player-1') continue;
        
        // Не можем залезть, если ранг слишком мал (кроме случая когда мы уже стоим на нем)
        if (hex.maxLevel > bot.playerLevel && dist(botPos, hex) > 0) continue;
        
        if (claimedSet.has(hex.id) || (mem.blacklistedTargets || []).includes(hex.id)) continue;

        const check = checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, navObstacles);
        if (check.canGrow) {
            const d = dist(botPos, hex);
            let score = -d * 2; // Штраф за дальность
            
            // Приоритет: Чем выше уровень, тем лучше (стремимся к L4)
            score += hex.currentLevel * 50;
            
            // Бонус за строительство под собой
            if (d === 0) score += 20;
            
            // Небольшой бонус за свои гексы
            if (hex.ownerId === bot.id) score += 10;

            if (score > bestScore) {
                bestScore = score;
                bestBuild = hex;
            }
        } else if (check.missingSupports && check.missingSupports.length > 0) {
            // Если не можем строить из-за опор, пытаемся найти опору для постройки
            const resolved = resolveBuildChain(hex, bot, grid, index, 0);
            if (resolved && reachable.has(resolved.hex.id)) {
                const d = dist(botPos, resolved.hex);
                let score = -d * 2;
                score += resolved.hex.currentLevel * 50;
                if (d === 0) score += 20;
                if (resolved.hex.ownerId === bot.id) score += 10;
                
                if (score > bestScore) {
                    bestScore = score;
                    bestBuild = resolved.hex;
                }
            }
        }
    }

    if (bestBuild) {
        return {
            steps: [{ type: 'MOVE_TO', targetId: bestBuild.id }, { type: 'UPGRADE', targetId: bestBuild.id }],
            createdAt: stateVersion,
            label: `Compete:Build L${bestBuild.currentLevel}->${bestBuild.currentLevel+1}`
        };
    }

    // Шаг 3: нет вариантов — копать (если есть место)
    if (bot.storage < (bot.maxStorage ?? 4)) {
        const digTargets2 = findBestDigTargets(bot, grid, index, [], 3, undefined, reachable);
        for (const t of digTargets2) {
            if ((mem.blacklistedTargets || []).includes(t.hex.id)) continue;
            return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Compete:DigFallback' };
        }
    }

    return { steps: [], createdAt: stateVersion, label: 'Compete:Idle' };
};


// ─────────────────────────────────────────────────────────────────────────────
// CAMPAIGN PLAN BUILDER
// ─────────────────────────────────────────────────────────────────────────────

const buildCampaignPlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    monument: Hex | null,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    allBots: Entity[],
    mem: BotMemory,
    player: Entity,
    index: WorldIndex,
    activeLevelId: string,
    activeLevelConfig: any,
    reachable: Set<string>
): Plan => {
    // 1. HUNT_PLAYER (3.5, 3.6)
    if (activeLevelConfig?.botObjective === 'DESTROY_PLAYER' || activeLevelId === '3.5' || activeLevelId === '3.6') {
        mem.botRole = 'DESTROYER';
        const targetInfo = findHiveTarget(bot, grid, index, 'DESTROYER', HIVE_RADIUS, player);
        if (targetInfo) {
            if (!reachable.has(targetInfo.hex.id)) return { steps: [], createdAt: stateVersion, label: 'HUNT: Unreachable' };
            const steps: PlanStep[] = [{ type: 'MOVE_TO', targetId: targetInfo.hex.id }];
            if (targetInfo.actionType !== 'MOVE_ONLY') steps.push({ type: targetInfo.actionType, targetId: targetInfo.hex.id });
            return { steps, createdAt: stateVersion, label: `HUNT: ${targetInfo.reason}` };
        }
        return { steps: [], createdAt: stateVersion, label: 'HUNT: Idle' };
    }

    // 2. COMPETE_RANK (1.6, 3.7)
    if (activeLevelConfig?.botObjective === 'COMPETE_RANK' || activeLevelId === '1.6' || activeLevelId === '3.7') {
        return buildCompetePlan(bot, grid, index, navObstacles, claimedSet, stateVersion, mem, reachable);
    }

    // 3. MONUMENT_RACE (2.4, 2.5, 4.5)
    if (activeLevelConfig?.botObjective === 'MONUMENT_RACE' || activeLevelId === '2.4' || activeLevelId === '2.5' || activeLevelId === '4.5') {
        const requiredItems = activeLevelId === '2.4' ? 2 : (activeLevelId === '4.5' ? 0 : 3);
        const currentItems = bot.inventory?.length || 0;

        if (currentItems < requiredItems) {
            if (bot.storage === 0) {
                const restriction = monument ? buildMonumentRestriction(monument, index, mem.isCampaign) : undefined;
                const digTargets = findBestDigTargets(bot, grid, index, allBots, 10, restriction, reachable);
                for (const t of digTargets) {
                    if (claimedSet.has(t.hex.id) || (mem.blacklistedTargets || []).includes(t.hex.id)) continue;
                    return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Race:DigForItems' };
                }
            } else {
                // Try to upgrade owned hexes first
                const ownedHexes = index.getHexesByOwner(bot.id)
                    .filter(h => h.structureType !== 'VOID')
                    .sort((a, b) => b.maxLevel - a.maxLevel);
                
                for (const owned of ownedHexes) {
                    if (!reachable.has(owned.id)) continue;
                    if ((mem.blacklistedTargets || []).includes(owned.id)) continue;
                    const check = checkGrowthCondition(owned, bot, getNeighbors(owned.q, owned.r), grid, navObstacles);
                    if (check.canGrow) {
                        return {
                            steps: [{ type: 'MOVE_TO', targetId: owned.id }, { type: 'UPGRADE', targetId: owned.id }],
                            createdAt: stateVersion,
                            label: `Race:UpgradeRank L${owned.maxLevel}`
                        };
                    } else if (check.missingSupports && check.missingSupports.length > 0) {
                        const resolved = resolveBuildChain(owned, bot, grid, index, 0);
                        if (resolved && reachable.has(resolved.hex.id) && !(mem.blacklistedTargets || []).includes(resolved.hex.id)) {
                            return {
                                steps: [{ type: 'MOVE_TO', targetId: resolved.hex.id }, { type: 'UPGRADE', targetId: resolved.hex.id }],
                                createdAt: stateVersion,
                                label: `Race:ResolveSupport L${resolved.hex.maxLevel}`
                            };
                        }
                    }
                }
                for (const owned of ownedHexes) {
                    const nbs = getNeighbors(owned.q, owned.r);
                    for (const nb of nbs) {
                        const nbHex = grid[hexKey(nb.q, nb.r)];
                        if (!nbHex || nbHex.ownerId || nbHex.structureType === 'VOID') continue;
                        if (!reachable.has(nbHex.id)) continue;
                        if (claimedSet.has(nbHex.id) || (mem.blacklistedTargets || []).includes(nbHex.id)) continue;
                        const nbCheck = checkGrowthCondition(nbHex, bot, getNeighbors(nb.q, nb.r), grid, navObstacles);
                        if (nbCheck.canGrow) {
                            return {
                                steps: [{ type: 'MOVE_TO', targetId: nbHex.id }, { type: 'UPGRADE', targetId: nbHex.id }],
                                createdAt: stateVersion,
                                label: 'Race:ExpandRank'
                            };
                        } else if (nbCheck.missingSupports && nbCheck.missingSupports.length > 0) {
                            const resolved = resolveBuildChain(nbHex, bot, grid, index, 0);
                            if (resolved && reachable.has(resolved.hex.id) && !(mem.blacklistedTargets || []).includes(resolved.hex.id)) {
                                return {
                                    steps: [{ type: 'MOVE_TO', targetId: resolved.hex.id }, { type: 'UPGRADE', targetId: resolved.hex.id }],
                                    createdAt: stateVersion,
                                    label: 'Race:ResolveExpandRank'
                                };
                            }
                        }
                    }
                }

                // Try to build on ANY neutral hex if we have no owned hexes or couldn't expand
                const botPos = { q: bot.q, r: bot.r };
                let bestNeutral: Hex | null = null;
                let bestScore = -9999;

                // Optimized: Use reachable set directly
                for (const id of reachable) {
                    const hex = grid[id];
                    if (!hex || hex.structureType === 'VOID' || hex.structureType === 'MONUMENT') continue;
                    if (hex.ownerId && hex.ownerId !== bot.id) continue;
                    if (hex.maxLevel > bot.playerLevel && dist(botPos, hex) > 0) continue;
                    
                    if (claimedSet.has(hex.id) || (mem.blacklistedTargets || []).includes(hex.id)) continue;
                    
                    const check = checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, navObstacles);
                    if (check.canGrow) {
                        const d = dist(botPos, hex);
                        let score = -d;
                        if (hex.currentLevel === 0) score += 5;
                        if (score > bestScore) {
                            bestScore = score;
                            bestNeutral = hex;
                        }
                    } else if (check.missingSupports && check.missingSupports.length > 0) {
                        const resolved = resolveBuildChain(hex, bot, grid, index, 0);
                        if (resolved && reachable.has(resolved.hex.id) && !(mem.blacklistedTargets || []).includes(resolved.hex.id)) {
                            const d = dist(botPos, resolved.hex);
                            let score = -d;
                            if (resolved.hex.currentLevel === 0) score += 5;
                            if (score > bestScore) {
                                bestScore = score;
                                bestNeutral = resolved.hex;
                            }
                        }
                    }
                }

                if (bestNeutral) {
                    return {
                        steps: [{ type: 'MOVE_TO', targetId: bestNeutral.id }, { type: 'UPGRADE', targetId: bestNeutral.id }],
                        createdAt: stateVersion,
                        label: 'Race:BuildAnywhere'
                    };
                }
                
                // If we STILL couldn't build, and we have space to dig, dig.
                if (bot.storage < (bot.maxStorage ?? 4)) {
                    const restriction = monument ? buildMonumentRestriction(monument, index, mem.isCampaign) : undefined;
                    const digTargets = findBestDigTargets(bot, grid, index, allBots, 10, restriction, reachable);
                    for (const t of digTargets) {
                        if (claimedSet.has(t.hex.id) || (mem.blacklistedTargets || []).includes(t.hex.id)) continue;
                        return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Race:DigForItems' };
                    }
                }
            }
        } else {
            if (monument) {
                const target = findStaircaseTarget(bot, grid, monument, navObstacles, claimedSet, mem.blacklistedTargets || [], reachable);
                if (target) {
                    const { hex, levelsNeeded } = target;
                    const upgrades = Math.min(levelsNeeded, bot.storage, Math.max(0, MAX_COLUMN_HEIGHT - hex.currentLevel));
                    if (upgrades > 0) {
                        return {
                            steps: [
                                { type: 'MOVE_TO', targetId: hex.id },
                                ...Array.from({ length: upgrades }, (): PlanStep => ({ type: 'UPGRADE', targetId: hex.id })),
                            ],
                            createdAt: stateVersion,
                            label: `Race:Staircase ×${upgrades}`,
                        };
                    } else if (levelsNeeded > 0 && bot.storage === 0) {
                        const restriction = buildMonumentRestriction(monument, index, mem.isCampaign);
                        const digTargets = findBestDigTargets(bot, grid, index, allBots, 10, restriction, reachable);
                        for (const t of digTargets) {
                            if (claimedSet.has(t.hex.id) || (mem.blacklistedTargets || []).includes(t.hex.id)) continue;
                            return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Race:DigForStairs' };
                        }
                    }
                }
                
                return { steps: [{ type: 'MOVE_TO', targetId: monument.id }], createdAt: stateVersion, label: 'Race:ClaimMonument' };
            }
        }
    }

    return { steps: [], createdAt: stateVersion, label: 'Campaign:Idle' };
};

const buildPlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    monument: Hex | null,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    allBots: Entity[],
    mem: BotMemory,
    player: Entity,
    index: WorldIndex,
    activeLevelId?: string,
    activeLevelConfig?: any,
    reachable?: Set<string>
): Plan => {
    const actualReachable = reachable ?? getReachableHexes(bot, grid, navObstacles, 20);

    if (activeLevelId) {
        return buildCampaignPlan(bot, grid, monument, navObstacles, claimedSet, stateVersion, allBots, mem, player, index, activeLevelId, activeLevelConfig, actualReachable);
    }

    // SKIRMISH MODE
    if (bot.storage >= (bot.maxStorage ?? 5)) mem.botRole = 'BUILDER';
    else if (bot.storage <= 0) mem.botRole = 'MINER';

    const phase = detectGamePhase(bot, monument, allBots);
    mem.phase   = phase; 

    if (phase === 'EXPLORE') {
        // Fallback for campaign/skirmish: if bot is poor, prioritize economy over aimless wandering
        // This prevents the "recovery-move" loop where bot spends every single move on ring-walking
        if ((bot.moves ?? 0) < 10 && (bot.coins ?? 0) < 50) {
            const competePlan = buildCompetePlan(bot, grid, index, navObstacles, claimedSet, stateVersion, mem, actualReachable);
            if (competePlan.steps.length > 0 && !competePlan.label.includes('Idle')) {
                return competePlan;
            }
        }

        if (bot.storage === 0) {
            const quickMine = buildMinePlan(bot, grid, index, navObstacles, claimedSet, stateVersion, allBots, null, mem, actualReachable);
            if (quickMine.steps.length > 0) return quickMine;
        }
        
        const explorePlan = buildExplorePlan(bot, grid, index, navObstacles, claimedSet, stateVersion, allBots, mem, actualReachable);
        
        if (explorePlan.label === 'Explore:Done') {
            const targetInfo = findHiveTarget(bot, grid, index, mem.botRole as any, HIVE_RADIUS, player);
            if (targetInfo) {
                if (!actualReachable.has(targetInfo.hex.id)) return { steps: [], createdAt: stateVersion, label: 'HIVE: Unreachable' };
                const steps: PlanStep[] = [{ type: 'MOVE_TO', targetId: targetInfo.hex.id }];
                if (targetInfo.actionType !== 'MOVE_ONLY') steps.push({ type: targetInfo.actionType, targetId: targetInfo.hex.id });
                return { steps, createdAt: stateVersion, label: `HIVE: ${targetInfo.reason}` };
            }
        }
        
        return explorePlan;
    }

    if (phase === 'STOCKPILE') {
        return buildStockpilePlan(bot, grid, index, monument!, navObstacles, claimedSet, stateVersion, allBots, mem, actualReachable);
    }

    if (bot.storage < 1) {
        return { steps: [{ type: 'MINE_UNTIL_FULL' }], createdAt: stateVersion, label: 'Assault:Refill' };
    }

    const target = findStaircaseTarget(bot, grid, monument!, navObstacles, claimedSet, mem.blacklistedTargets || [], actualReachable);
    
    if (target) {
        const { hex, levelsNeeded } = target;
        const upgrades = Math.min(levelsNeeded, bot.storage, Math.max(0, MAX_COLUMN_HEIGHT - hex.currentLevel));
        if (upgrades <= 0) return { steps: [], createdAt: stateVersion, label: 'Staircase:AtCap' };

        return {
            steps: [
                { type: 'MOVE_TO', targetId: hex.id },
                ...Array.from({ length: upgrades }, (): PlanStep => ({ type: 'UPGRADE', targetId: hex.id })),
            ],
            createdAt: stateVersion,
            label: `Staircase ×${upgrades} on ${hex.id.slice(-4)}`,
        };
    }

    return { 
        steps: [{ type: 'MOVE_TO', targetId: monument!.id }], 
        createdAt: stateVersion, 
        label: 'Assault:ClaimMonument' 
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP EXECUTION & MOVEMENT
// ─────────────────────────────────────────────────────────────────────────────

const moveAndAct = (bot: Entity, target: Hex, actionType: 'UPGRADE' | 'DIG', grid: Record<string, Hex>, navObstacles: HexCoord[], stateVersion: number, mem: BotMemory, debugPrefix: string): AiResult => {
    const d = dist(bot, target);
    if (d === 0) {
        const nbs   = getNeighbors(bot.q, bot.r);
        const check = actionType === 'UPGRADE' ? checkGrowthCondition(target, bot, nbs, grid, navObstacles) : checkDigCondition(target, bot, nbs, grid);

        if (check.canGrow) {
            const action: BotAction = actionType === 'UPGRADE' ? { type: 'UPGRADE', coord: { q: target.q, r: target.r }, intent: 'UPGRADE', stateVersion } : { type: 'DIG', coord: { q: target.q, r: target.r }, stateVersion };
            return { action, debug: `${debugPrefix}:Act`, memory: { ...mem, waitStreak: 0, stuckCounter: 0 } };
        }
        if (!bot.recoveredCurrentHex && currentHex(bot, grid)?.structureType !== 'VOID') {
            return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'ActRecover', memory: mem };
        }
        return { action: { type: 'WAIT', stateVersion }, debug: `${debugPrefix}:Blocked`, memory: { ...mem, stuckCounter: (mem.stuckCounter ?? 0) + 1 } };
    }

    const pathResult = findPath({ q: bot.q, r: bot.r }, { q: target.q, r: target.r }, grid, bot.playerLevel, navObstacles);
    const path = pathResult.path;
    if (path && path.length > 0) {
        const cost = calculateMovementCost(bot, [path[0]], grid);
        if (cost.canAfford) return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: `${debugPrefix}:Move`, memory: { ...mem, waitStreak: 0, stuckCounter: 0 } };
        if (!bot.recoveredCurrentHex && currentHex(bot, grid)?.structureType !== 'VOID') return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'MoveRecover', memory: mem };
    }
    
    if (d === 1 && bot.storage > 0) {
        const ch = currentHex(bot, grid);
        if (ch && target.maxLevel > ch.maxLevel + 1 && checkGrowthCondition(ch, bot, getNeighbors(bot.q, bot.r), grid, navObstacles).canGrow) {
            return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'UPGRADE', stateVersion }, debug: 'Mountaineer', memory: { ...mem, stuckCounter: 0 } };
        }
    }
    return { action: { type: 'WAIT', stateVersion }, debug: `${debugPrefix}:NoPath`, memory: { ...mem, stuckCounter: (mem.stuckCounter ?? 0) + 1 } };
};

const executeStep = (step: PlanStep, bot: Entity, grid: Record<string, Hex>, index: WorldIndex, navObstacles: HexCoord[], stateVersion: number, mem: BotMemory, monument: Hex | null, claimedSet: Set<string>, allBots: Entity[], reachable: Set<string>): AiResult | 'STEP_DONE' | 'STEP_FAILED' => {
    if (step.type === 'RECOVER') {
        if (!bot.recoveredCurrentHex && currentHex(bot, grid)?.structureType !== 'VOID') return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: mem };
        return 'STEP_DONE';
    }

    if (step.type === 'MINE_UNTIL_FULL') {
        if (bot.storage >= (bot.maxStorage ?? 4)) return 'STEP_DONE';
        const restriction = monument ? buildMonumentRestriction(monument, index, mem.isCampaign) : undefined;
        const target = findBestDigTargets(bot, grid, index, allBots, 10, restriction, reachable).find(t => !claimedSet.has(t.hex.id) && !(mem.blacklistedTargets || []).includes(t.hex.id))?.hex;
        if (!target) return 'STEP_FAILED';
        mem.targetHexId = target.id;
        return moveAndAct(bot, target, 'DIG', grid, navObstacles, stateVersion, mem, 'Mine');
    }

    if (step.type === 'MOVE_TO') {
        const target = grid[step.targetId];
        if (!target) return 'STEP_FAILED';
        mem.targetHexId = step.targetId;
        if (dist(bot, target) === 0) return 'STEP_DONE';

        const pathResult = findPath({ q: bot.q, r: bot.r }, { q: target.q, r: target.r }, grid, bot.playerLevel, navObstacles);
        const path = pathResult.path;
        if (!path || path.length === 0) {
            if (dist(bot, target) === 1 && bot.storage > 0) {
                const ch = currentHex(bot, grid);
                if (ch && target.maxLevel > ch.maxLevel + 1 && checkGrowthCondition(ch, bot, getNeighbors(bot.q, bot.r), grid, navObstacles).canGrow) {
                    return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'UPGRADE', stateVersion }, debug: 'Mountaineer', memory: { ...mem, waitStreak: 0 } };
                }
            }
            return 'STEP_FAILED';
        }

        if (!calculateMovementCost(bot, [path[0]], grid).canAfford) {
            if (!bot.recoveredCurrentHex && currentHex(bot, grid)?.structureType !== 'VOID') {
                return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'FundMove', memory: mem };
            }
            // If we can't recover more on this hex but still can't afford move, we are stuck or need to wait
            return 'STEP_FAILED';
        }

        // Recovery-move loop prevention: if we only have 1 move, and we are in a multi-step plan,
        // try to recover more if possible before spending the last move.
        if (bot.moves <= 1 && !bot.recoveredCurrentHex && currentHex(bot, grid)?.structureType !== 'VOID') {
             return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'BufferMove', memory: mem };
        }
        return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: `MoveTo`, memory: { ...mem, waitStreak: 0 } };
    }

    if (step.type === 'UPGRADE' || step.type === 'DIG') {
        const target = grid[step.targetId];
        if (!target) return 'STEP_FAILED';
        if (step.type === 'UPGRADE' && bot.storage < 1) return 'STEP_FAILED';
        if (dist(bot, target) > 0) return moveAndAct(bot, target, step.type, grid, navObstacles, stateVersion, mem, `Reach${step.type}`);

        const check = step.type === 'UPGRADE' ? checkGrowthCondition(target, bot, getNeighbors(bot.q, bot.r), grid, navObstacles) : checkDigCondition(target, bot, getNeighbors(bot.q, bot.r), grid);
        if (!check.canGrow) return 'STEP_FAILED';

        return {
            action: step.type === 'UPGRADE' ? { type: 'UPGRADE', coord: { q: target.q, r: target.r }, intent: 'UPGRADE', stateVersion } : { type: 'DIG', coord: { q: target.q, r: target.r }, stateVersion },
            debug: `${step.type}`,
            memory: { ...mem, waitStreak: 0, stuckCounter: 0, targetHexId: step.type === 'DIG' ? null : mem.targetHexId },
        };
    }
    return 'STEP_FAILED';
};

// ─────────────────────────────────────────────────────────────────────────────
// PARACHUTE & MAIN
// ─────────────────────────────────────────────────────────────────────────────

const parachuteAction = (bot: Entity, grid: Record<string, Hex>, navObstacles: HexCoord[], monument: Hex | null, stateVersion: number, mem: BotMemory): AiResult | null => {
    if ((mem.stuckCounter ?? 0) < STUCK_THRESHOLD) return null;
    const ch = currentHex(bot, grid);
    const rm = { ...mem, stuckCounter: 0, plan: null, targetHexId: null };

    if (ch && ch.maxLevel >= 2 && checkDigCondition(ch, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
        return { action: { type: 'DIG', coord: { q: bot.q, r: bot.r }, stateVersion }, debug: 'Parachute:Dig', memory: rm };
    }
    
    if (ch && ch.maxLevel < 0 && bot.storage > 0 && checkGrowthCondition(ch, bot, getNeighbors(bot.q, bot.r), grid, navObstacles).canGrow) {
        return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'UPGRADE', stateVersion }, debug: 'Parachute:Build', memory: rm };
    }
    
    if (bot.storage === 0) {
        for (const n of getNeighbors(bot.q, bot.r)) {
            const nbHex = grid[hexKey(n.q, n.r)];
            if (nbHex && nbHex.structureType !== 'VOID' && checkDigCondition(nbHex, bot, getNeighbors(n.q, n.r), grid).canGrow) {
                return { action: { type: 'DIG', coord: { q: n.q, r: n.r }, stateVersion }, debug: 'Parachute:MineNeighbor', memory: rm };
            }
        }
    }

    return yieldMove(bot, grid, navObstacles, monument, stateVersion, rm, 'Stuck');
};

const finalize = (result: AiResult, mem: BotMemory): AiResult => {
    result.memory.waitStreak = result.action?.type === 'WAIT' ? (mem.waitStreak ?? 0) + 1 : 0;
    result.memory.lastActionType = result.action?.type ?? null; 
    return result;
};

export const calculateBotMove = (
    bot: Entity,
    grid: Record<string, Hex>,
    player: Entity,
    _winCondition: WinCondition | null,
    obstacles: HexCoord[],
    index: WorldIndex,
    stateVersion: number,
    _difficulty: Difficulty,
    reservedHexKeys?: Set<string>,
    allBots?: Entity[],
    activeLevelConfig?: any // Changed from string to any to match AiSystem
): AiResult => {
    if (!bot) return { action: null, debug: 'ERR', memory: { lastPlayerPos: null, stuckCounter: 0 } };

    const mem = initMemory(bot);
    mem.isCampaign = !!activeLevelConfig;
    if (!mem.exploreAnchor) mem.exploreAnchor = { q: bot.q, r: bot.r };

    const navObs   = buildNavObstacles(bot, obstacles, reservedHexKeys);
    const claimed  = buildClaimedSet(bot, allBots ?? []);
    const monument = index.getHexesByStructureType('MONUMENT').find(h => h.botRevealed && (h.botRevealed[bot.id] || h.botRevealed['SHARED_BOTS'])) ?? null;
    const bots     = allBots ?? [];
    
    const reachable = getReachableHexes(bot, grid, navObs, 50);

    const needsSurvival = bot.moves === 0 && bot.coins < GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE && !bot.recoveredCurrentHex && currentHex(bot, grid)?.structureType !== 'VOID';
    
    if (needsSurvival) {
        if (mem.lastActionType === 'UPGRADE') {
            mem.stuckCounter = (mem.stuckCounter ?? 0) + 1; 
        } else {
            return finalize({ action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'Survival', memory: mem }, mem);
        }
    }

    const pc = parachuteAction(bot, grid, navObs, monument, stateVersion, mem);
    if (pc) return finalize(pc, mem);

    // activeLevelId передаётся напрямую из AiSystem (state.activeLevelConfig?.id)
    const activeLevelId = activeLevelConfig?.id;

    const planStale = (stateVersion - (mem.plan?.createdAt ?? 0)) > PLAN_TTL || (mem.waitStreak ?? 0) >= MAX_WAIT_STREAK;
    if (!mem.plan || mem.plan.steps.length === 0 || planStale) {
        mem.plan = buildPlan(bot, grid, monument, navObs, claimed, stateVersion, bots, mem, player, index, activeLevelId, activeLevelConfig, reachable);
        mem.waitStreak = 0;
        mem.stuckCounter = 0;
    }

    while (mem.plan && mem.plan.steps.length > 0) {
        const result = executeStep(mem.plan.steps[0], bot, grid, index, navObs, stateVersion, mem, monument, claimed, bots, reachable);
        
        if (result === 'STEP_DONE') { 
            mem.plan.steps.shift(); 
            continue; 
        }
        
        if (result === 'STEP_FAILED') {
            if (mem.targetHexId) mem.blacklistedTargets = [...(mem.blacklistedTargets ?? []), mem.targetHexId].slice(-50);
            mem.plan = null; 
            mem.targetHexId = null;
            mem.stuckCounter = (mem.stuckCounter ?? 0) + 1;
            return finalize({ action: { type: 'WAIT', stateVersion }, debug: 'PlanFail', memory: mem }, mem);
        }
        
        if (result.action?.type !== 'WAIT' && mem.plan) mem.plan.createdAt = stateVersion;
        return finalize(result, mem);
    }

    return finalize({ action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem }, mem);
};