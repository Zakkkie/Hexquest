import { Entity, Hex, HexCoord, BotMemory, Plan, PlanStep, LevelConfig } from '../types';
import { getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { findBestDigTargets, findHiveTarget, resolveBuildChain, findBestBuildTarget } from './planning';
import {
    HIVE_RADIUS,
    MAX_BFS_STEPS,
    MAX_COLUMN_HEIGHT,
    STOCKPILE_TARGET,
    EXPLORE_RADIUS,
    MAX_EXPLORE_TICKS,
    hexKey,
    dist,
    buildMonumentRestriction,
    detectGamePhase,
    findCooperativeBuildTarget
} from './helpers';

interface StaircaseTarget { hex: Hex; levelsNeeded: number; idealLevel: number; }

export const findStaircaseTarget = (
    bot: Entity,
    grid: Record<string, Hex>,
    monument: Hex,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    blacklisted: string[],
    reachableSet: Set<string>
): StaircaseTarget | null => {
    const open: Hex[] = [];
    let head = 2000;
    let tail = 2000;
    const visited     = new Set<string>();
    const candidates: StaircaseTarget[] = [];
    const obsKeys     = new Set(navObstacles.map(o => hexKey(o.q, o.r)));

    for (const c of getNeighbors(monument.q, monument.r)) {
        const h = grid[hexKey(c.q, c.r)];
        if (h && h.structureType !== 'VOID') {
            open[tail++] = h;
        }
    }

    let steps = 0;
    while (head < tail && steps < MAX_BFS_STEPS) {
        steps++;
        const current = open[head++];
        if (visited.has(current.id)) continue;
        visited.add(current.id);

        if (claimedSet.has(current.id) || blacklisted.includes(current.id)) continue; 
        if (obsKeys.has(current.id)) continue;

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
                    if (mh && !visited.has(mh.id)) {
                        open[--head] = mh;
                    }
                }
                for (const nb of getNeighbors(current.q, current.r)) {
                    const nh = grid[hexKey(nb.q, nb.r)];
                    if (nh && !visited.has(nh.id) && nh.structureType !== 'VOID' && dist(nh, monument) >= d) {
                        open[tail++] = nh;
                    }
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

export const buildExplorePlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    _navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    allBots: Entity[],
    mem: BotMemory,
    reachable: Set<string>
): Plan => {
    mem.exploreTickCount = (mem.exploreTickCount ?? 0) + 1;
    if (mem.exploreTickCount > MAX_EXPLORE_TICKS) {
        mem.botRole = 'MINER';
    }

    if (bot.coins < 10) {
        if (bot.storage === 0) {
            const digTargets = findBestDigTargets(bot, grid, index, allBots, 5, undefined, reachable);
            for (const t of digTargets) {
                if (!reachable.has(t.hex.id)) continue;
                if (claimedSet.has(t.hex.id) || (mem.blacklistedTargets || []).includes(t.hex.id)) continue;
                return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Explore:EconomyDig' };
            }
        } else {
            const bestBuild = findBestBuildTarget(bot, grid, index, _navObstacles, claimedSet, mem.blacklistedTargets || [], reachable, { allowPlayerOwner: true });
            if (bestBuild) {
                return { steps: [{ type: 'MOVE_TO', targetId: bestBuild.id }, { type: 'UPGRADE', targetId: bestBuild.id }], createdAt: stateVersion, label: 'Explore:EconomyBuild' };
            }
        }
    }

    const anchor: HexCoord = { q: 0, r: 0 };
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

export const buildMinePlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    _navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    allBots: Entity[],
    monument: Hex | null,
    mem: BotMemory,
    reachable: Set<string>
): Plan => {
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

export const buildStockpilePlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    monument: Hex,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    allBots: Entity[],
    mem: BotMemory,
    reachable: Set<string>
): Plan => {
    const effectiveTarget = Math.min(STOCKPILE_TARGET, bot.maxStorage ?? 4);
    if (bot.storage >= effectiveTarget) {
        mem.stockpileWaitTicks = (mem.stockpileWaitTicks ?? 0) + 1;
        return { steps: [], createdAt: stateVersion, label: 'Stockpile:Waiting' };
    }
    mem.stockpileWaitTicks = 0;
    return buildMinePlan(bot, grid, index, navObstacles, claimedSet, stateVersion, allBots, monument, mem, reachable);
};

export const buildCompetePlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    mem: BotMemory,
    reachable: Set<string>,
    allBots: Entity[] = []
): Plan => {
    if (bot.storage > 0) {
        const coopTargetId = findCooperativeBuildTarget(bot, grid, allBots, navObstacles, reachable);
        if (coopTargetId) {
            const coopHex = grid[coopTargetId];
            if (coopHex) {
                return {
                    steps: [{ type: 'MOVE_TO', targetId: coopTargetId }, { type: 'UPGRADE', targetId: coopTargetId }],
                    createdAt: stateVersion,
                    label: `CooperativeSupport: Help friendly bot build ${coopTargetId.slice(-4)}`
                };
            }
        }
    }

    if (bot.storage === 0) {
        const digTargets = findBestDigTargets(bot, grid, index, [], 5, undefined, reachable);
        for (const t of digTargets) {
            if (!reachable.has(t.hex.id)) continue;
            if ((mem.blacklistedTargets || []).includes(t.hex.id)) continue;
            return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Compete:Dig' };
        }
    }

    const bestBuild = findBestBuildTarget(bot, grid, index, navObstacles, claimedSet, mem.blacklistedTargets || [], reachable, { allowPlayerOwner: true });

    if (bestBuild) {
        return {
            steps: [{ type: 'MOVE_TO', targetId: bestBuild.id }, { type: 'UPGRADE', targetId: bestBuild.id }],
            createdAt: stateVersion,
            label: `Compete:Build L${bestBuild.currentLevel}->${bestBuild.currentLevel+1}`
        };
    }

    if (bot.storage < (bot.maxStorage ?? 4)) {
        const digTargets2 = findBestDigTargets(bot, grid, index, [], 3, undefined, reachable);
        for (const t of digTargets2) {
            if ((mem.blacklistedTargets || []).includes(t.hex.id)) continue;
            return { steps: [{ type: 'MOVE_TO', targetId: t.hex.id }, { type: 'DIG', targetId: t.hex.id }], createdAt: stateVersion, label: 'Compete:DigFallback' };
        }
    }

    return { steps: [], createdAt: stateVersion, label: 'Compete:Idle' };
};

export const buildCampaignPlan = (
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
    activeLevelConfig?: LevelConfig,
    reachable: Set<string>
): Plan => {
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

    if (activeLevelConfig?.botObjective === 'COMPETE_RANK' || activeLevelId === '1.6' || activeLevelId === '3.7') {
        return buildCompetePlan(bot, grid, index, navObstacles, claimedSet, stateVersion, mem, reachable, allBots);
    }

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

                const bestNeutral = findBestBuildTarget(bot, grid, index, navObstacles, claimedSet, mem.blacklistedTargets || [], reachable, { allowPlayerOwner: false, campaignScoring: true });

                if (bestNeutral) {
                    return {
                        steps: [{ type: 'MOVE_TO', targetId: bestNeutral.id }, { type: 'UPGRADE', targetId: bestNeutral.id }],
                        createdAt: stateVersion,
                        label: 'Race:BuildAnywhere'
                    };
                }
                
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

export const buildPlan = (
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
    activeLevelConfig?: LevelConfig,
    reachable?: Set<string>
): Plan => {
    const actualReachable = reachable!;

    if (activeLevelId) {
        return buildCampaignPlan(bot, grid, monument, navObstacles, claimedSet, stateVersion, allBots, mem, player, index, activeLevelId, activeLevelConfig, actualReachable);
    }

    if (bot.storage >= (bot.maxStorage ?? 5)) mem.botRole = 'BUILDER';
    else if (bot.storage <= 0) mem.botRole = 'MINER';

    const phase = detectGamePhase(bot, monument, allBots);
    mem.phase   = phase; 

    if (phase === 'EXPLORE') {
        if ((bot.moves ?? 0) < 10 && (bot.coins ?? 0) < 50) {
            const competePlan = buildCompetePlan(bot, grid, index, navObstacles, claimedSet, stateVersion, mem, actualReachable, allBots);
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
