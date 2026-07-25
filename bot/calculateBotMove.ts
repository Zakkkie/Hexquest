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
// HELPER: TARGET HEX RESOLUTION & MODE CLASSIFICATION
// ─────────────────────────────────────────────────────────────────────────────

export type BotGameMode = 'CAMPAIGN' | 'SKIRMISH' | 'SIEGE';

export const getBotGameMode = (
    activeLevelConfig: LevelConfig | null | undefined,
    isDefenseMode: boolean,
    botRole?: string
): BotGameMode => {
    if (isDefenseMode || botRole?.startsWith('SIEGE_')) {
        return 'SIEGE';
    }
    if (activeLevelConfig) {
        return 'CAMPAIGN';
    }
    return 'SKIRMISH';
};

/**
 * Safely resolves a target hex by ID/key from grid, populating a default flat L0 hex if unmapped.
 */
const resolveTargetHex = (grid: Record<string, Hex>, targetId: string): Hex | null => {
    if (!targetId) return null;
    if (grid[targetId]) return grid[targetId];

    const parts = targetId.split(',');
    if (parts.length === 2) {
        const q = parseInt(parts[0], 10);
        const r = parseInt(parts[1], 10);
        if (!isNaN(q) && !isNaN(r)) {
            const fallback: Hex = {
                id: targetId,
                q,
                r,
                currentLevel: 0,
                maxLevel: 0,
                structureType: 'NONE',
                isPassable: true
            };
            grid[targetId] = fallback;
            return fallback;
        }
    }
    return null;
};

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
    debugPrefix: string,
    isDefenseModeParam?: boolean
): AiResult => {
    const d = cubeDistance(bot, target);
    if (d === 0) {
        const nbs   = getNeighbors(bot.q, bot.r);
        const isDefense = isDefenseModeParam !== undefined ? isDefenseModeParam : !!(bot.memory?.botRole?.startsWith('SIEGE_'));
        const check = actionType === 'UPGRADE' ? checkGrowthCondition(target, bot, nbs, grid, navObstacles, undefined, isDefense) : checkDigCondition(target, bot, nbs, grid, isDefense);

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
        const isDefense = isDefenseModeParam !== undefined ? isDefenseModeParam : !!(bot.memory?.botRole?.startsWith('SIEGE_'));
        if (!isDefense && ch && target.maxLevel > ch.maxLevel + 1 && checkGrowthCondition(ch, bot, getNeighbors(bot.q, bot.r), grid, navObstacles, undefined, isDefense).canGrow) {
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
    player: Entity,
    isDefenseModeParam?: boolean
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
        return moveAndAct(bot, target, 'DIG', grid, navObstacles, stateVersion, mem, 'Mine', isDefenseModeParam);
    }

    if (step.type === 'MOVE_TO') {
        const target = resolveTargetHex(grid, step.targetId);
        if (!target) return 'STEP_FAILED';
        mem.targetHexId = step.targetId;
        if (cubeDistance(bot, target) === 0) return 'STEP_DONE';

        const isDefenseMode = isDefenseModeParam || !!(bot.memory?.botRole?.startsWith('SIEGE_'));
        const isSiegeBot = !!(bot.memory?.botRole?.startsWith('SIEGE_')) || isDefenseMode;

        if (isSiegeBot && cubeDistance(bot, target) <= 1) {
            const isBlockedByEntity = allBots.some(b => b.id !== bot.id && b.q === target.q && b.r === target.r) || (player.q === target.q && player.r === target.r);
            if (isBlockedByEntity) {
                return { action: { type: 'WAIT', stateVersion }, debug: 'SiegeWaitPeer', memory: { ...mem, waitStreak: (mem.waitStreak ?? 0) + 1 } };
            }
            const botHex = grid[getHexKey(bot.q, bot.r)];
            const botLevel = botHex ? (botHex.currentLevel ?? 0) : 0;
            const targetLevel = target.currentLevel ?? 0;
            if (!checkHasVoidCore(bot)) {
                if (targetLevel - botLevel > 1) {
                    return { action: { type: 'DIG', coord: { q: target.q, r: target.r }, stateVersion }, debug: 'SiegeDigWall', memory: { ...mem, waitStreak: 0 } };
                }
                if (botLevel - targetLevel > 1) {
                    return { action: { type: 'UPGRADE', coord: { q: target.q, r: target.r }, intent: 'UPGRADE', stateVersion }, debug: 'SiegeBridgePit', memory: { ...mem, waitStreak: 0 } };
                }
            }
            return { action: { type: 'MOVE', path: [{ q: target.q, r: target.r }], stateVersion }, debug: 'SiegeStep', memory: { ...mem, waitStreak: 0 } };
        }

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
                const isDefense = isDefenseModeParam || !!(bot.memory?.botRole?.startsWith('SIEGE_'));
                if (!isDefense && ch && target.maxLevel > ch.maxLevel + 1 && checkGrowthCondition(ch, bot, getNeighbors(bot.q, bot.r), grid, navObstacles, undefined, isDefense).canGrow) {
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
        const target = resolveTargetHex(grid, step.targetId);
        if (!target) return 'STEP_FAILED';
        
        const isDefenseMode = isDefenseModeParam || !!(bot.memory?.botRole?.startsWith('SIEGE_'));
        const isSiegeBot = !!(bot.memory?.botRole?.startsWith('SIEGE_')) || isDefenseMode;
        
        if (isSiegeBot) {
            if (target.structureType === 'VOID' && step.type !== 'UPGRADE') return 'STEP_FAILED';
            if (cubeDistance(bot, target) > 1) return 'STEP_FAILED';
            return {
                action: step.type === 'UPGRADE' 
                    ? { type: 'UPGRADE', coord: { q: target.q, r: target.r }, intent: 'UPGRADE', stateVersion }
                    : { type: 'DIG', coord: { q: target.q, r: target.r }, stateVersion },
                debug: `Siege${step.type}`,
                memory: { ...mem, waitStreak: 0, stuckCounter: 0, targetHexId: step.type === 'DIG' ? null : mem.targetHexId }
            };
        }

        if (step.type === 'UPGRADE' && bot.storage < 1) return 'STEP_FAILED';
        
        if (cubeDistance(bot, target) > 1) return moveAndAct(bot, target, step.type, grid, navObstacles, stateVersion, mem, `Reach${step.type}`, isDefenseModeParam);

        const isDefense = isDefenseModeParam || !!(bot.memory?.botRole?.startsWith('SIEGE_'));
        const check = step.type === 'UPGRADE' ? checkGrowthCondition(target, bot, getNeighbors(target.q, target.r), grid, navObstacles, undefined, isDefense) : checkDigCondition(target, bot, getNeighbors(target.q, target.r), grid, isDefense);
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
    activeLevelConfig?: LevelConfig,
    isDefenseModeParam?: boolean
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
    const isDefenseMode = isDefenseModeParam ?? (activeLevelConfig ? false : !!(bot.memory?.botRole?.startsWith('SIEGE_')));
    const botMode = getBotGameMode(activeLevelConfig, isDefenseMode, bot.memory?.botRole);
    mem.botMode = botMode;

    const planStale = (stateVersion - (mem.plan?.createdAt ?? 0)) > PLAN_TTL || (mem.waitStreak ?? 0) >= MAX_WAIT_STREAK;
    if (!mem.plan || mem.plan.steps.length === 0 || planStale) {
        if (botMode === 'SIEGE') {
            if (!mem.botRole || !mem.botRole.startsWith('SIEGE_')) {
                mem.botRole = 'SIEGE_GRINDER';
            }
            const coreKey = getHexKey(0, 0);
            const botKey = getHexKey(bot.q, bot.r);
            const botHex = resolveTargetHex(grid, botKey)!;
            const botLevel = botHex ? (botHex.currentLevel ?? 0) : 0;

            // 1. If standing directly on the Core at (0, 0)
            if (bot.q === 0 && bot.r === 0) {
                const coreHex = resolveTargetHex(grid, coreKey);
                mem.plan = { steps: [{ type: 'DIG', targetId: coreHex?.id || coreKey }], createdAt: stateVersion, label: 'SIEGE_ATTACK_CORE' };
            }
            // 2. Priority check: If standing on negative level, check adjacent neighbors closer to core
            else {
                const botDistToCore = cubeDistance(bot, { q: 0, r: 0 });
                const neighbors = getNeighbors(bot.q, bot.r);
                
                // Find adjacent neighbor that is closer to core and at level 0 (or higher level than bot up to 0)
                let readyClimbNeighbor: { coord: HexCoord; hex: Hex } | null = null;
                for (const n of neighbors) {
                    if (cubeDistance(n, { q: 0, r: 0 }) < botDistToCore) {
                        const nKey = getHexKey(n.q, n.r);
                        const nHex = grid[nKey];
                        if (nHex && nHex.structureType !== 'VOID') {
                            const nLevel = nHex.currentLevel ?? 0;
                            // Check if neighbor is at Level 0 or higher than bot
                            if (nLevel >= 0 || nLevel > botLevel) {
                                const isOccupied = bots.some(b => b.id !== bot.id && b.q === n.q && b.r === n.r) || (player.q === n.q && player.r === n.r);
                                if (!isOccupied) {
                                    readyClimbNeighbor = { coord: n, hex: nHex };
                                    break;
                                }
                            }
                        }
                    }
                }

                if (readyClimbNeighbor && botLevel < 0) {
                    const nLevel = readyClimbNeighbor.hex.currentLevel ?? 0;
                    if (nLevel - botLevel <= 1) {
                        // Can step directly onto this level 0 / higher neighbor closer to core!
                        const targetKey = getHexKey(readyClimbNeighbor.coord.q, readyClimbNeighbor.coord.r);
                        mem.plan = { steps: [{ type: 'MOVE_TO', targetId: readyClimbNeighbor.hex.id || targetKey }], createdAt: stateVersion, label: 'SIEGE_CLIMB_L0_CORE' };
                    } else {
                        // Gap is too steep (e.g. L-2 to L0). Upgrade own tile to climb up!
                        mem.plan = { steps: [{ type: 'UPGRADE', targetId: botHex?.id || botKey }], createdAt: stateVersion, label: 'SIEGE_CLIMB_SELF_UP' };
                    }
                } else {
                    const occupiedKeys = new Set<string>();
                    for (const b of allBots) {
                        if (b.id !== bot.id) occupiedKeys.add(getHexKey(b.q, b.r));
                    }
                    if (player) occupiedKeys.add(getHexKey(player.q, player.r));

                    const siegePathResult = findSiegePath({ q: bot.q, r: bot.r }, { q: 0, r: 0 }, grid, bot.id, occupiedKeys);

                    if (siegePathResult && siegePathResult.path && siegePathResult.path.length > 0) {
                        const nextStep = siegePathResult.path[0];
                        const nextKey = getHexKey(nextStep.q, nextStep.r);
                        const nextHex = resolveTargetHex(grid, nextKey);

                        if (nextHex) {
                            const nextLevel = nextHex.currentLevel ?? 0;
                            
                            // Attack core if target is core (0,0)
                            if (nextStep.q === 0 && nextStep.r === 0) {
                                if (nextLevel > 0) {
                                    mem.plan = { steps: [{ type: 'DIG', targetId: nextHex?.id || nextKey }], createdAt: stateVersion, label: 'SIEGE_LEVEL_CORE_DOWN' };
                                } else if (nextLevel < 0 || nextHex.structureType === 'VOID') {
                                    mem.plan = { steps: [{ type: 'UPGRADE', targetId: nextHex?.id || nextKey }], createdAt: stateVersion, label: 'SIEGE_LEVEL_CORE_UP' };
                                } else {
                                    mem.plan = { steps: [{ type: 'DIG', targetId: nextHex?.id || nextKey }], createdAt: stateVersion, label: 'SIEGE_ATTACK_CORE' };
                                }
                            }
                            // Restore road to level 0 before stepping on next hex towards core
                            else if (nextLevel > 0) {
                                mem.plan = { steps: [{ type: 'DIG', targetId: nextHex?.id || nextKey }], createdAt: stateVersion, label: 'SIEGE_RESTORE_ROAD_DOWN' };
                            }
                            else if (nextLevel < 0 || nextHex.structureType === 'VOID') {
                                mem.plan = { steps: [{ type: 'UPGRADE', targetId: nextHex?.id || nextKey }], createdAt: stateVersion, label: 'SIEGE_RESTORE_ROAD_UP' };
                            }
                            // Level is 0: step onto it or upgrade self if too low to climb up directly
                            else {
                                if (nextLevel - botLevel > 1) {
                                    if (botLevel < 0) {
                                        mem.plan = { steps: [{ type: 'UPGRADE', targetId: botHex?.id || botKey }], createdAt: stateVersion, label: 'SIEGE_CLIMB_SELF_UP' };
                                    } else {
                                        mem.plan = { steps: [{ type: 'MOVE_TO', targetId: nextHex?.id || nextKey }], createdAt: stateVersion, label: 'SIEGE_STEP' };
                                    }
                                } else {
                                    mem.plan = { steps: [{ type: 'MOVE_TO', targetId: nextHex?.id || nextKey }], createdAt: stateVersion, label: 'SIEGE_STEP' };
                                }
                            }
                        }
                    } else {
                    // Fallback when adjacent to core or direct neighbor pathing is blocked
                    if (cubeDistance(bot, { q: 0, r: 0 }) <= 1) {
                        const coreHex = resolveTargetHex(grid, coreKey);
                        const coreLevel = coreHex?.currentLevel ?? 0;
                        if (coreLevel > 0) {
                            mem.plan = { steps: [{ type: 'DIG', targetId: coreHex?.id || coreKey }], createdAt: stateVersion, label: 'SIEGE_LEVEL_CORE_DOWN' };
                        } else if (coreLevel < 0 || coreHex?.structureType === 'VOID') {
                            mem.plan = { steps: [{ type: 'UPGRADE', targetId: coreHex?.id || coreKey }], createdAt: stateVersion, label: 'SIEGE_LEVEL_CORE_UP' };
                        } else {
                            mem.plan = { steps: [{ type: 'DIG', targetId: coreHex?.id || coreKey }], createdAt: stateVersion, label: 'SIEGE_ATTACK_CORE' };
                        }
                    } else {
                        // Intelligent terrain-climbing/digging fallbacks:
                        // If all accessible neighbors are uphill, build own tile up to climb
                        // If all accessible neighbors are downhill, dig own tile down to climb down
                        const neighbors = getNeighbors(bot.q, bot.r);
                        const accessibleNeighbors = neighbors.filter(n => {
                            const nHex = grid[getHexKey(n.q, n.r)];
                            return nHex && nHex.structureType !== 'VOID';
                        });

                        const allNeighborsUphill = accessibleNeighbors.length > 0 && accessibleNeighbors.every(n => {
                            const nHex = grid[getHexKey(n.q, n.r)];
                            return (nHex.currentLevel ?? 0) - botLevel > 1;
                        });

                        const allNeighborsDownhill = accessibleNeighbors.length > 0 && accessibleNeighbors.every(n => {
                            const nHex = grid[getHexKey(n.q, n.r)];
                            return (nHex.currentLevel ?? 0) - botLevel < -1;
                        });

                        if (allNeighborsUphill && botHex) {
                            if (botLevel < 0) {
                                mem.plan = { steps: [{ type: 'UPGRADE', targetId: botHex.id }], createdAt: stateVersion, label: 'SIEGE_CLIMB_OUT_PIT' };
                            } else {
                                let bestWall: Hex | null = null;
                                let minDistToCore = Infinity;
                                for (const n of accessibleNeighbors) {
                                    const nHex = grid[getHexKey(n.q, n.r)];
                                    if (nHex && (nHex.currentLevel ?? 0) > 0) {
                                        const dist = cubeDistance(n, { q: 0, r: 0 });
                                        if (dist < minDistToCore) {
                                            minDistToCore = dist;
                                            bestWall = nHex;
                                        }
                                    }
                                }
                                if (bestWall) {
                                    mem.plan = { steps: [{ type: 'DIG', targetId: bestWall.id }], createdAt: stateVersion, label: 'SIEGE_DEMOLISH_WALL' };
                                } else {
                                    mem.plan = { steps: [{ type: 'DIG', targetId: botHex.id }], createdAt: stateVersion, label: 'SIEGE_LEVEL_SELF_DOWN' };
                                }
                            }
                        } else if (allNeighborsDownhill && botHex) {
                            mem.plan = { steps: [{ type: 'DIG', targetId: botHex.id }], createdAt: stateVersion, label: 'SIEGE_LEVEL_SELF_DOWN' };
                        } else {
                            let bestNeighbor: HexCoord | null = null;
                            let minDist = Infinity;
                            for (const n of neighbors) {
                                const nKey = getHexKey(n.q, n.r);
                                const nHex = grid[nKey];
                                if (nHex && nHex.structureType === 'VOID') continue;
                                const dist = cubeDistance(n, { q: 0, r: 0 });
                                if (dist < minDist) {
                                    minDist = dist;
                                    bestNeighbor = n;
                                }
                            }
                            if (bestNeighbor) {
                                const targetKey = getHexKey(bestNeighbor.q, bestNeighbor.r);
                                const targetHex = resolveTargetHex(grid, targetKey)!;
                                const targetLevel = targetHex?.currentLevel ?? 0;
                                if (targetLevel > 0) {
                                    mem.plan = { steps: [{ type: 'DIG', targetId: targetKey }], createdAt: stateVersion, label: 'SIEGE_RESTORE_ROAD_DOWN' };
                                } else if (targetLevel < 0 || targetHex?.structureType === 'VOID') {
                                    mem.plan = { steps: [{ type: 'UPGRADE', targetId: targetKey }], createdAt: stateVersion, label: 'SIEGE_RESTORE_ROAD_UP' };
                                } else {
                                    mem.plan = { steps: [{ type: 'MOVE_TO', targetId: targetKey }], createdAt: stateVersion, label: 'SIEGE_STEP' };
                                }
                            }
                        }
                    }
                }
            }
        }
    } else if (botMode === 'CAMPAIGN') {
            mem.plan = buildPlan(bot, grid, monument, navObs, claimed, stateVersion, bots, mem, player, index, activeLevelId, activeLevelConfig, getReachable());
        } else {
            mem.plan = buildPlan(bot, grid, monument, navObs, claimed, stateVersion, bots, mem, player, index, undefined, undefined, getReachable());
        }
        mem.waitStreak = 0;
    }

    while (mem.plan && mem.plan.steps.length > 0) {
        const result = executeStep(mem.plan.steps[0], bot, grid, index, navObs, stateVersion, mem, monument, claimed, bots, getReachable(), player, isDefenseMode);
        
        if (result === 'STEP_DONE') { 
            mem.plan.steps.shift(); 
            if (mem.plan.steps.length === 0) {
                mem.plan = null;
            }
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
