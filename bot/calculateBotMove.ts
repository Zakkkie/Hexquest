import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory, PlanStep, LevelConfig } from '../types';
import { getHexKey, getNeighbors, findPath, findSiegePath, getStatusModifiers, cubeDistance } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findBestDigTargets, findHiveTarget } from './planning';
import {
    AiResult,
    REALTIME_STUCK_MS,
    STUCK_THRESHOLD,
    MAX_WAIT_STREAK,
    PLAN_TTL,
    initMemory,
    buildNavObstacles,
    buildClaimedSet,
    currentHex,
    finalize,
    getReachableHexes,
    buildMonumentRestriction,
    checkHasVoidCore
} from './helpers';
import { buildPlan } from './plans';

// ─────────────────────────────────────────────────────────────────────────────
// STEP EXECUTION & MOVEMENT
// ─────────────────────────────────────────────────────────────────────────────

const moveAndAct = (
    bot: Entity,
    target: Hex,
    actionType: 'UPGRADE' | 'DIG',
    grid: Record<string, Hex>,
    navObstacles: HexCoord[],
    stateVersion: number,
    mem: BotMemory,
    debugPrefix: string
): AiResult => {
    const d = cubeDistance(bot, target);
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

    const hasVoidCore = checkHasVoidCore(bot);
    const pathResult = findPath({ q: bot.q, r: bot.r }, { q: target.q, r: target.r }, grid, bot.playerLevel, navObstacles, hasVoidCore, false, true);
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

const executeStep = (
    step: PlanStep,
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    navObstacles: HexCoord[],
    stateVersion: number,
    mem: BotMemory,
    monument: Hex | null,
    claimedSet: Set<string>,
    allBots: Entity[],
    reachable: Set<string>,
    player: Entity
): AiResult | 'STEP_DONE' | 'STEP_FAILED' => {
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
        if (cubeDistance(bot, target) === 0) return 'STEP_DONE';

        const hasVoidCore = checkHasVoidCore(bot);
        const pathResult = findPath({ q: bot.q, r: bot.r }, { q: target.q, r: target.r }, grid, bot.playerLevel, navObstacles, hasVoidCore, false, true);
        const path = pathResult.path;
        if (!path || path.length === 0) {
            const testPathResult = findPath({ q: bot.q, r: bot.r }, { q: target.q, r: target.r }, grid, bot.playerLevel, [], hasVoidCore, false, true);
            if (testPathResult.path && testPathResult.path.length > 0) {
                const nextStep = testPathResult.path[0];
                const isBlockedByEntity = allBots.some(b => b.q === nextStep.q && b.r === nextStep.r) || (player.q === nextStep.q && player.r === nextStep.r);
                if (isBlockedByEntity) {
                    return { action: { type: 'WAIT', stateVersion }, debug: 'WaitPeer', memory: mem };
                } else {
                    const cost = calculateMovementCost(bot, [nextStep], grid);
                    if (cost.canAfford) {
                        return { action: { type: 'MOVE', path: [nextStep], stateVersion }, debug: 'QueueMove', memory: { ...mem, waitStreak: 0 } };
                    }
                }
            }

            if (cubeDistance(bot, target) === 1 && bot.storage > 0) {
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
            return 'STEP_FAILED';
        }

        if (bot.moves <= 1 && !bot.recoveredCurrentHex && currentHex(bot, grid)?.structureType !== 'VOID') {
             return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'BufferMove', memory: mem };
        }
        return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: `MoveTo`, memory: { ...mem, waitStreak: 0 } };
    }

    if (step.type === 'UPGRADE' || step.type === 'DIG') {
        const target = grid[step.targetId];
        if (!target) return 'STEP_FAILED';
        if (step.type === 'UPGRADE' && bot.storage < 1) return 'STEP_FAILED';
        
        if (cubeDistance(bot, target) > 1) return moveAndAct(bot, target, step.type, grid, navObstacles, stateVersion, mem, `Reach${step.type}`);

        const check = step.type === 'UPGRADE' ? checkGrowthCondition(target, bot, getNeighbors(target.q, target.r), grid, navObstacles) : checkDigCondition(target, bot, getNeighbors(target.q, target.r), grid);
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
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────

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
    activeLevelConfig?: LevelConfig
): AiResult => {
    if (!bot) return { action: null, debug: '', memory: { lastPlayerPos: null, stuckCounter: 0 } };

    const mem = initMemory(bot);
    mem.isCampaign = !!activeLevelConfig;
    if (!mem.exploreAnchor) mem.exploreAnchor = { q: bot.q, r: bot.r };

    const currentPosKey = `${bot.q},${bot.r}`;
    if (bot.lastMoveTime === undefined) {
        bot.lastMoveTime = Date.now();
    }
    const timeSinceMove = Date.now() - bot.lastMoveTime;
    const isRealtimeStuck = timeSinceMove > REALTIME_STUCK_MS;

    if (mem.lastPosKey === currentPosKey) {
        mem.stayStreak = (mem.stayStreak ?? 0) + 1;
    } else {
        mem.stayStreak = 0;
        mem.stuckCounter = 0;
    }
    mem.lastPosKey = currentPosKey;

    if (isRealtimeStuck || (mem.stayStreak ?? 0) >= STUCK_THRESHOLD) {
        if (mem.targetHexId) {
            mem.blacklistedTargets = [...(mem.blacklistedTargets ?? []), mem.targetHexId].slice(-50);
        }
        mem.plan = null;
        mem.targetHexId = null;
        mem.waitStreak = 0;
        mem.stuckCounter = STUCK_THRESHOLD;
        mem.stayStreak = 0;
    }

    const navObs   = buildNavObstacles(bot, obstacles, reservedHexKeys);
    const claimed  = buildClaimedSet(bot, allBots ?? []);
    const monument = index.getHexesByStructureType('MONUMENT').find(h => h.botRevealed && (h.botRevealed[bot.id] || h.botRevealed['SHARED_BOTS'])) ?? null;
    const bots     = allBots ?? [];
    
    let reachableCache: Set<string> | null = null;
    const getReachable = (): Set<string> => {
        if (!reachableCache) {
            reachableCache = getReachableHexes(bot, grid, navObs, 35, checkHasVoidCore(bot));
        }
        return reachableCache;
    };

    const { exchangeRate } = getStatusModifiers(bot);
    const needsSurvival = bot.moves === 0 && bot.coins < exchangeRate && !bot.recoveredCurrentHex && currentHex(bot, grid)?.structureType !== 'VOID';
    
    if (needsSurvival) {
        if (mem.lastActionType === 'UPGRADE') {
            mem.stuckCounter = (mem.stuckCounter ?? 0) + 1; 
        } else {
            return finalize({ action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'Survival', memory: mem }, mem);
        }
    }

    const isBlockingPeer = bots.some(other => {
        if (other.id === bot.id) return false;
        if (other.memory?.targetHexId === currentPosKey) return true;
        return false;
    });

    if (isBlockingPeer && (bot.moves ?? 0) > 0) {
        const vacantNeighbor = getNeighbors(bot.q, bot.r).find(n => {
            const h = grid[getHexKey(n.q, n.r)];
            if (!h || h.structureType === 'VOID' || h.currentLevel > bot.playerLevel) return false;
            const isOccupied = bots.some(o => o.q === n.q && o.r === n.r) || (player.q === n.q && player.r === n.r);
            if (isOccupied) return false;
            return true;
        });
        if (vacantNeighbor) {
            return finalize({
                action: { type: 'MOVE', path: [vacantNeighbor], stateVersion },
                debug: 'Solidarity: Step aside for peer',
                memory: { ...mem, waitStreak: 0, stuckCounter: 0 }
            }, mem);
        }
    }

    const activeLevelId = activeLevelConfig?.id;
    const isSiege = !!(bot.memory?.botRole?.startsWith('SIEGE_'));

    const planStale = (stateVersion - (mem.plan?.createdAt ?? 0)) > PLAN_TTL || (mem.waitStreak ?? 0) >= MAX_WAIT_STREAK;
    if (!mem.plan || mem.plan.steps.length === 0 || planStale) {
        if (isSiege) {
            if (!mem.botRole || !mem.botRole.startsWith('SIEGE_')) {
                mem.botRole = 'DESTROYER';
            }
            const coreKey = getHexKey(0, 0);
            
            // Find optimal path to the core (0, 0)
            const siegePathResult = findSiegePath({ q: bot.q, r: bot.r }, { q: 0, r: 0 }, grid);
            if (siegePathResult && siegePathResult.path && siegePathResult.path.length > 0) {
                const path = siegePathResult.path;
                const nextStep = path[0];
                const nextKey = getHexKey(nextStep.q, nextStep.r);
                const nextHex = grid[nextKey];
                const nextLevel = nextHex ? nextHex.currentLevel : 0;
                
                const botHex = grid[getHexKey(bot.q, bot.r)];
                const botLevel = botHex ? botHex.currentLevel : 0;

                if (nextHex && nextHex.structureType !== 'VOID') {
                    // 1. Is it a wall (level > 1)?
                    if (nextLevel > 1) {
                        mem.plan = { 
                            steps: [{ type: 'DIG', targetId: nextHex.id }], 
                            createdAt: stateVersion, 
                            label: 'SIEGE_LASER_WALL' 
                        };
                    }
                    // 2. Is there a steep uphill slope (> 1)?
                    else if (nextLevel > botLevel + 1) {
                        mem.plan = { 
                            steps: [{ type: 'DIG', targetId: nextHex.id }], 
                            createdAt: stateVersion, 
                            label: 'SIEGE_LASER_UPHILL' 
                        };
                    }
                    // 3. Is there a steep downhill slope (< -1)?
                    else if (nextLevel < botLevel - 1) {
                        mem.plan = { 
                            steps: [{ type: 'UPGRADE', targetId: nextHex.id }], 
                            createdAt: stateVersion, 
                            label: 'SIEGE_UPGRADE_DOWNHILL' 
                        };
                    }
                    // 4. Standard move step
                    else {
                        mem.plan = { 
                            steps: [{ type: 'MOVE_TO', targetId: nextHex.id }], 
                            createdAt: stateVersion, 
                            label: 'SIEGE_STEP' 
                        };
                    }
                }
            } else {
                if (getReachable().has(coreKey)) {
                    mem.plan = { steps: [{ type: 'MOVE_TO', targetId: coreKey }, { type: 'DIG', targetId: coreKey }], createdAt: stateVersion, label: 'SIEGE_TARGET_CORE' };
                } else {
                    const targetInfo = findHiveTarget(bot, grid, index, mem.botRole as any, 50, player);
                    if (targetInfo && getReachable().has(targetInfo.hex.id)) {
                        const steps: PlanStep[] = [{ type: 'MOVE_TO', targetId: targetInfo.hex.id }];
                        if (targetInfo.actionType !== 'MOVE_ONLY') steps.push({ type: targetInfo.actionType, targetId: targetInfo.hex.id });
                        mem.plan = { steps, createdAt: stateVersion, label: `SIEGE_NAV: ${targetInfo.reason}` };
                    } else {
                        mem.plan = buildPlan(bot, grid, monument, navObs, claimed, stateVersion, bots, mem, player, index, activeLevelId, activeLevelConfig, getReachable());
                    }
                }
            }
        } else {
            mem.plan = buildPlan(bot, grid, monument, navObs, claimed, stateVersion, bots, mem, player, index, activeLevelId, activeLevelConfig, getReachable());
        }
        mem.waitStreak = 0;
    }

    while (mem.plan && mem.plan.steps.length > 0) {
        const result = executeStep(mem.plan.steps[0], bot, grid, index, navObs, stateVersion, mem, monument, claimed, bots, getReachable(), player);
        
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
