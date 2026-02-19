
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory, Plan, PlanStep } from '../types';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findBestBuildTargets, findBestDigTargets } from './planning';
import { GAME_CONFIG } from '../rules/config';

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const HIVE_RADIUS         = 30;
// stateVersion increments every ~100ms, bot thinks every ~1000ms.
// TTL is refreshed on every successful action, so 200 = ceiling for truly idle plans.
const PLAN_TTL            = 200;
const MAX_WAIT_STREAK     = 4;   // Replan after N consecutive WAITs
const MONUMENT_ZONE_R     = 4;   // Hex radius around monument (mining restriction)
const MAX_BFS_STEPS       = 120;
const MAX_PATH_CHECKS     = 4;
const MAX_COLUMN_HEIGHT   = 8;   // Safety cap: don't plan more upgrades than this per trip
const STUCK_THRESHOLD     = 5;   // stuckCounter before parachute fires

// ── Early-game phase thresholds ───────────────────────────────────────────────
// EXPLORE: bot spirals outward mining and looking for the monument.
// STOCKPILE: once a bot has "seen" the monument zone (via explore or shared
//            knowledge), all bots switch to hoarding materials before attacking.
//
// Stockpile target = how many materials each bot should carry before the
// staircase assault begins. High enough to build several levels in one trip,
// low enough that bots don't spend the whole game mining.
const STOCKPILE_TARGET    = 3;   // Materials each bot aims to carry before assault
// How far from spawn a bot will explore before giving up and assuming monument
// is in the other direction. Keeps bots from exploring forever on large maps.
const EXPLORE_RADIUS      = 20;
// Number of explore steps per plan (each step = move one hex outward).
// Short so the plan refreshes often and can react to the monument being revealed.
const EXPLORE_STEPS       = 6;

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const hexKey = (q: number, r: number) => getHexKey(q, r);
const dist   = (a: HexCoord, b: HexCoord) => cubeDistance(a, b);

const currentHex = (bot: Entity, grid: Record<string, Hex>): Hex | null =>
    grid[hexKey(bot.q, bot.r)] ?? null;

const buildNavObstacles = (
    bot: Entity,
    obstacles: HexCoord[],
    reservedHexKeys?: Set<string>
): HexCoord[] => {
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

/**
 * TRUE hex-radius restriction around the monument.
 * FIX: Old code used a double for-loop over q,r offsets — that generates a
 * parallelogram in cube coords, not a circle. This version uses cubeDistance.
 * FIX: Stores hex.id (not hexKey) to match what findBestDigTargets filters on.
 */
const buildMonumentRestriction = (monument: Hex, grid: Record<string, Hex>): Set<string> => {
    const restricted = new Set<string>();
    for (const hex of Object.values(grid)) {
        if (dist(monument, hex) <= MONUMENT_ZONE_R) {
            restricted.add(hex.id); // ← hex.id, same key used in planning.ts
        }
    }
    return restricted;
};

/**
 * Yield: step sideways to free a blocked position.
 * Prefers direction away from monument to reduce peak congestion.
 */
const yieldMove = (
    bot: Entity,
    grid: Record<string, Hex>,
    obstacles: HexCoord[],
    monument: Hex | null,
    stateVersion: number,
    mem: BotMemory,
    reason: string
): AiResult | null => {
    const nbs = getNeighbors(bot.q, bot.r).filter(n => {
        const h = grid[hexKey(n.q, n.r)];
        if (!h || h.structureType === 'VOID') return false;
        if (h.maxLevel > bot.playerLevel) return false;
        if (obstacles.some(o => o.q === n.q && o.r === n.r)) return false;
        return true;
    });

    if (nbs.length === 0) return null;
    if (monument) nbs.sort((a, b) => dist(b, monument) - dist(a, monument));

    const cost = calculateMovementCost(bot, [nbs[0]], grid);
    if (!cost.canAfford) return null;

    return {
        action: { type: 'MOVE', path: [nbs[0]], stateVersion },
        debug: `Yield(${reason})`,
        memory: { ...mem, waitStreak: 0 },
    };
};

// ─────────────────────────────────────────────────────────────────────────────
// GAME PHASE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Three early-game phases before the main staircase assault:
 *
 *  EXPLORE   — Monument not yet revealed. Bot spirals outward mining along
 *              the way. As soon as any bot reveals the monument, all bots
 *              transition on their next plan tick.
 *
 *  STOCKPILE — Monument location is known. All bots rush to fill their
 *              storage to STOCKPILE_TARGET before approaching. Prevents the
 *              "one bot trickles in with 1 mat" anti-pattern.
 *
 *  ASSAULT   — Bot has enough materials. Full staircase mode (Phase A).
 */
type GamePhase = 'EXPLORE' | 'STOCKPILE' | 'ASSAULT';

const detectGamePhase = (
    bot: Entity,
    monument: Hex | null,
    allBots: Entity[]
): GamePhase => {
    if (!monument) return 'EXPLORE';

    const maxStorage      = bot.maxStorage ?? 4;
    const effectiveTarget = Math.min(STOCKPILE_TARGET, maxStorage);
    const selfReady       = bot.storage >= effectiveTarget;

    if (!selfReady) return 'STOCKPILE';

    // Self is ready — check if peers are still loading so we don't storm alone
    const anyPeerStockpiling = allBots.some(b =>
        b.id !== bot.id &&
        (b.storage ?? 0) < effectiveTarget &&
        (b.memory?.phase === 'STOCKPILE' || b.memory?.phase === 'EXPLORE' || !b.memory?.phase)
    );

    // Don't wait forever for a stuck/dead peer
    const waitedTooLong = (bot.memory?.stockpileWaitTicks ?? 0) > 30;

    if (anyPeerStockpiling && !waitedTooLong) return 'STOCKPILE';
    return 'ASSAULT';
};

// ─────────────────────────────────────────────────────────────────────────────
// MEMORY INIT
// ─────────────────────────────────────────────────────────────────────────────

const initMemory = (bot: Entity): BotMemory => ({
    lastPlayerPos:      null,
    currentGoal:        null,
    stuckCounter:       0,
    mode:               'GATHER',
    projectFailCount:   0,
    botRole:            'BUILDER',
    waitStreak:         0,
    targetHexId:        null,
    plan:               null,
    blacklistedTargets: [],
    phase:              'EXPLORE' as GamePhase,
    exploreAnchor:      null as HexCoord | null,
    stockpileWaitTicks: 0,
    ...(bot.memory ?? {}),
});

// ─────────────────────────────────────────────────────────────────────────────
// STAIRCASE TARGET SELECTION
// ─────────────────────────────────────────────────────────────────────────────

interface StaircaseTarget {
    hex: Hex;
    /** How many consecutive UPGRADEs are needed to reach idealLevel */
    levelsNeeded: number;
    idealLevel: number;
}

/**
 * BFS outward from monument. Returns the best hex to work on AND how many
 * levels it needs so the plan can enqueue multiple UPGRADE steps in one trip.
 *
 * Sorting priority:
 *  1. More progress already done (levelsNeeded < idealLevel) → finish what's started
 *  2. Closer to monument (innermost rings first)
 *  3. Closer to bot (reduce travel)
 *
 * KEY FIX for tall staircases: collects several candidates instead of returning
 * at first match, then picks the best by priority — this stops bots from
 * repeatedly choosing the nearest unfinished hex and never completing deep columns.
 */
const findStaircaseTarget = (
    bot: Entity,
    grid: Record<string, Hex>,
    monument: Hex,
    navObstacles: HexCoord[],
    claimedSet: Set<string>
): StaircaseTarget | null => {
    const open: Hex[] = [];
    const visited     = new Set<string>();
    const candidates: StaircaseTarget[] = [];
    let pathChecks    = 0;

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

        if (claimedSet.has(current.id)) continue;
        if (navObstacles.some(o => o.q === current.q && o.r === current.r)) continue;

        const d          = dist(monument, current);
        const idealLevel = Math.max(0, monument.maxLevel - d);

        if (current.currentLevel < idealLevel) {
            const levelsNeeded = idealLevel - current.currentLevel;
            const nbs          = getNeighbors(current.q, current.r);
            const growCheck    = checkGrowthCondition(current, bot, nbs, grid, navObstacles);

            if (growCheck.canGrow) {
                let reachable = dist(bot, current) <= 1;
                if (!reachable && pathChecks < MAX_PATH_CHECKS) {
                    pathChecks++;
                    const p = findPath({ q: bot.q, r: bot.r }, { q: current.q, r: current.r }, grid, bot.playerLevel, navObstacles);
                    reachable = !!(p && p.length > 0);
                }
                // Accept if reachable, or if we've used all path-check budget (best-effort)
                if (reachable || pathChecks >= MAX_PATH_CHECKS) {
                    candidates.push({ hex: current, levelsNeeded, idealLevel });
                    if (candidates.length >= 5) break; // enough to pick from
                }
            } else if (growCheck.missingSupports) {
                // Push missing supports to FRONT — resolve blockers before expanding outward
                for (const ms of growCheck.missingSupports) {
                    const mh = grid[hexKey(ms.q, ms.r)];
                    if (mh && !visited.has(mh.id)) open.unshift(mh);
                }
                // Expand outward so we don't dead-end on unsupported hexes
                for (const nb of getNeighbors(current.q, current.r)) {
                    const nh = grid[hexKey(nb.q, nb.r)];
                    if (nh && !visited.has(nh.id) && nh.structureType !== 'VOID' && dist(nh, monument) >= d) {
                        open.push(nh);
                    }
                }
            }
        }
    }

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => {
        // More built already → prioritise (reduces abandonment of in-progress columns)
        const progressA = a.idealLevel - a.levelsNeeded;
        const progressB = b.idealLevel - b.levelsNeeded;
        if (progressB !== progressA) return progressB - progressA;

        // Closer to monument (innermost rings)
        const dMonA = dist(monument, a.hex);
        const dMonB = dist(monument, b.hex);
        if (dMonA !== dMonB) return dMonA - dMonB;

        // Closer to bot (reduce walk)
        return dist(bot, a.hex) - dist(bot, b.hex);
    });

    return candidates[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPLORE PLAN BUILDER (UPDATED WITH DOGLEG)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shell (nautilus) exploration with Dogleg movement.
 * Reveals the map in concentric rings but moves in "L" shapes to avoid
 * straight-line bias towards map edges.
 */
const buildExplorePlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    allBots: Entity[]
): Plan => {
    // CHANGE: Use (0,0) as the anchor for exploration.
    // This forces bots to look for unrevealed hexes starting from the CENTER of the map (Ring 0, 1, 2...)
    // effectively making them rush inward if they spawn on the edge.
    // Previously used: (bot.memory?.exploreAnchor as HexCoord | null) ?? { q: bot.q, r: bot.r };
    const anchor: HexCoord = { q: 0, r: 0 };

    // ── 1. Find current shell ring ────────────────────────────────────────────
    let currentRing = 0; // Start searching from center
    let ringCandidates: Hex[] = [];

    // Search range expanded slightly to find any holes in map knowledge
    while (currentRing <= EXPLORE_RADIUS) {
        ringCandidates = Object.values(grid).filter(h => {
            if (h.structureType === 'VOID') return false;
            if (h.revealed) return false;
            // Only exact ring distance — this is what makes it a shell
            return dist(anchor, h) === currentRing;
        });
        if (ringCandidates.length > 0) break;
        currentRing++;
    }

    if (ringCandidates.length === 0) {
        // Fully explored radius — mine near current position
        return buildMinePlan(bot, grid, navObstacles, claimedSet, stateVersion, allBots, null);
    }

    // ── 2. Arc sweep: pick the ring hex that continues the clockwise arc ──────
    const hexAngle = (h: HexCoord): number =>
        Math.atan2(h.r - anchor.r, h.q - anchor.q);

    const botAngle = hexAngle({ q: bot.q, r: bot.r });

    const idHash    = bot.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const botCount  = Math.max(allBots.length, 1);
    
    // Separation offset (spreads bots out)
    const separationOffset = (idHash % botCount) * ((2 * Math.PI) / botCount);
    
    // Lead angle (Forces movement along the arc, i.e., CIRCULAR MOTION)
    // INCREASED to 60deg (PI/3) to force a wider turn ("Dogleg" potential)
    const leadAngle = Math.PI / 3; 

    const angularDist = (h: HexCoord): number => {
        const angle  = hexAngle(h);
        // Target is: My Angle + Separation + Lead
        // This makes the bot chase a point "ahead" of it on the circle.
        const target = botAngle + separationOffset + leadAngle;
        const d      = ((angle - target) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
        return Math.abs(d);
    };

    // FIX: Relax proximity constraint to allow following the ring even if it means a small walk
    // Since we are now anchoring to center, we might need to walk far (from spawn to center)
    const MAX_RING_WALK = 30; 
    const reachableCandidates = ringCandidates.filter(h => dist(bot, h) <= MAX_RING_WALK);
    const pool = reachableCandidates.length > 0 ? reachableCandidates : ringCandidates;

    pool.sort((a, b) => {
        const penA = claimedSet.has(a.id) ? 1 : 0;
        const penB = claimedSet.has(b.id) ? 1 : 0;
        if (penA !== penB) return penA - penB;
        // Prioritize ANGULAR MATCH (Circular motion) over simple proximity
        const scoreA = angularDist(a) * 0.8 + (dist(bot, a) / MAX_RING_WALK) * 0.2;
        const scoreB = angularDist(b) * 0.8 + (dist(bot, b) / MAX_RING_WALK) * 0.2;
        return scoreA - scoreB;
    });

    const exploreTarget = pool[0];

    // ── 3. DOGLEG LOGIC (Waypoints) ────────────────────────────────────────────
    // Instead of moving straight A->B, try to move A->Elbow->B to encourage turning.
    
    let pathSteps: PlanStep[] = [];
    let waypoint: Hex | null = null;
    
    if (dist(bot, exploreTarget) > 2) {
        // Calculate possible "Elbow" coordinates
        // Elbow 1: Keep Bot Q, take Target R
        const elbowAKey = hexKey(bot.q, exploreTarget.r);
        const elbowA = grid[elbowAKey];

        // Elbow 2: Take Target Q, Keep Bot R
        const elbowBKey = hexKey(exploreTarget.q, bot.r);
        const elbowB = grid[elbowBKey];

        // Check validity (Exists, Not Void, and is roughly equidistant/sensible)
        const isValidWaypoint = (h: Hex | undefined) => h && h.structureType !== 'VOID';

        // Prefer the one that exists and is safe
        if (isValidWaypoint(elbowA)) {
            waypoint = elbowA!;
        } else if (isValidWaypoint(elbowB)) {
            waypoint = elbowB!;
        }
    }

    if (waypoint && dist(bot, waypoint) > 0) {
        pathSteps = [
            { type: 'MOVE_TO', targetId: waypoint.id },
            { type: 'MOVE_TO', targetId: exploreTarget.id }
        ];
    } else {
        pathSteps = [{ type: 'MOVE_TO', targetId: exploreTarget.id }];
    }

    return {
        steps: pathSteps,
        createdAt:     stateVersion,
        label:         waypoint ? `Explore Inward (${waypoint.q},${waypoint.r}) -> R${currentRing}` : `Explore Center R${currentRing}`,
        exploreAnchor: anchor,
    } as Plan & { exploreAnchor: HexCoord };
};

// ─────────────────────────────────────────────────────────────────────────────
// STOCKPILE PLAN BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Monument is known but the bot (or team) isn't stocked up yet.
 * Mine aggressively OUTSIDE the monument zone so we don't clog it up
 * before the coordinated assault. Move toward the monument fringe when full
 * so we're in position the moment the assault begins.
 */
const buildStockpilePlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    monument: Hex,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    allBots: Entity[],
    mem: BotMemory
): Plan => {
    const maxStorage      = bot.maxStorage ?? 4;
    const effectiveTarget = Math.min(STOCKPILE_TARGET, maxStorage);

    // Already full → move to staging area near monument fringe and wait
    if (bot.storage >= effectiveTarget) {
        // Update wait ticks so detectGamePhase can time out stuck peers
        mem.stockpileWaitTicks = (mem.stockpileWaitTicks ?? 0) + 1;

        // Staging hex: closest non-monument-zone hex to monument
        const stagingHex = findStagingHex(bot, grid, monument, navObstacles);
        if (stagingHex && dist(bot, stagingHex) > 1) {
            return {
                steps: [{ type: 'MOVE_TO', targetId: stagingHex.id }],
                createdAt: stateVersion,
                label:     `Stockpile:Stage near (${monument.q},${monument.r})`,
            };
        }

        return { steps: [], createdAt: stateVersion, label: 'Stockpile:Waiting' };
    }

    mem.stockpileWaitTicks = 0;

    // Mine outside monument zone
    return buildMinePlan(bot, grid, navObstacles, claimedSet, stateVersion, allBots, monument);
};

/**
 * Find the best "staging" hex just outside the monument zone —
 * close enough to rush in, far enough not to block builders.
 */
const findStagingHex = (
    bot: Entity,
    grid: Record<string, Hex>,
    monument: Hex,
    navObstacles: HexCoord[]
): Hex | null => {
    const STAGING_RING = MONUMENT_ZONE_R + 1;

    const candidates = Object.values(grid).filter(h => {
        if (h.structureType === 'VOID') return false;
        const d = dist(monument, h);
        if (d < MONUMENT_ZONE_R || d > STAGING_RING + 2) return false;
        if (h.maxLevel > bot.playerLevel) return false;
        if (navObstacles.some(o => o.q === h.q && o.r === h.r)) return false;
        return true;
    });

    if (candidates.length === 0) return null;

    candidates.sort((a, b) => dist(bot, a) - dist(bot, b));
    return candidates[0];
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERIC MINE PLAN BUILDER (shared by explore + stockpile)
// ─────────────────────────────────────────────────────────────────────────────

const buildMinePlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    allBots: Entity[],
    monument: Hex | null
): Plan => {
    const restriction = monument ? buildMonumentRestriction(monument, grid) : undefined;
    const digTargets  = findBestDigTargets(bot, grid, allBots, 10, restriction);

    for (const t of digTargets) {
        if (claimedSet.has(t.hex.id)) continue;
        if (dist(bot, t.hex) > HIVE_RADIUS) continue;
        return {
            steps: [
                { type: 'MOVE_TO', targetId: t.hex.id },
                { type: 'DIG',     targetId: t.hex.id },
            ],
            createdAt: stateVersion,
            label:     'Mine',
        };
    }

    return { steps: [], createdAt: stateVersion, label: 'Mine:NoTarget' };
};

// ─────────────────────────────────────────────────────────────────────────────
// PLAN BUILDING (master dispatcher)
// ─────────────────────────────────────────────────────────────────────────────

const buildPlan = (
    bot: Entity,
    grid: Record<string, Hex>,
    monument: Hex | null,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    stateVersion: number,
    allBots: Entity[],
    mem: BotMemory
): Plan => {
    const phase = detectGamePhase(bot, monument, allBots);
    mem.phase   = phase; // write back so peers can read our phase next tick

    // ── EXPLORE: monument unknown → shell rings outward ──────────────────────
    if (phase === 'EXPLORE') {
        // Mine one hex first if completely empty so the bot has materials ready
        // when the monument is revealed. One DIG only — don't let mining
        // hijack the explore phase and create deep local pits.
        if (bot.storage === 0) {
            const quickMine = buildMinePlan(bot, grid, navObstacles, claimedSet, stateVersion, allBots, null);
            if (quickMine.steps.length > 0) return quickMine;
        }
        return buildExplorePlan(bot, grid, navObstacles, claimedSet, stateVersion, allBots);
    }

    // ── STOCKPILE: monument known, team loading up ───────────────────────────
    if (phase === 'STOCKPILE') {
        return buildStockpilePlan(bot, grid, monument!, navObstacles, claimedSet, stateVersion, allBots, mem);
    }

    // ── ASSAULT: everyone ready → build the staircase ────────────────────────

    if (bot.storage < 1) {
        return { steps: [{ type: 'MINE_UNTIL_FULL' }], createdAt: stateVersion, label: 'Assault:Refill' };
    }

    const target = findStaircaseTarget(bot, grid, monument!, navObstacles, claimedSet);

    if (target) {
        const { hex, levelsNeeded } = target;
        const upgrades = Math.min(
            levelsNeeded,
            bot.storage,
            Math.max(0, MAX_COLUMN_HEIGHT - hex.currentLevel)
        );

        if (upgrades <= 0) {
            return { steps: [], createdAt: stateVersion, label: 'Staircase:AtCap' };
        }

        return {
            steps: [
                { type: 'MOVE_TO', targetId: hex.id },
                ...Array.from({ length: upgrades }, (): PlanStep => ({ type: 'UPGRADE', targetId: hex.id })),
            ],
            createdAt: stateVersion,
            label: `Staircase ×${upgrades} on ${hex.id.slice(-4)} (L${hex.currentLevel}→${hex.currentLevel + upgrades}, need L${target.idealLevel})`,
        };
    }

    return { steps: [], createdAt: stateVersion, label: 'Staircase:Idle' };
};

// ─────────────────────────────────────────────────────────────────────────────
// STEP EXECUTION
// ─────────────────────────────────────────────────────────────────────────────

const executeStep = (
    step: PlanStep,
    bot: Entity,
    grid: Record<string, Hex>,
    navObstacles: HexCoord[],
    stateVersion: number,
    mem: BotMemory,
    monument: Hex | null,
    claimedSet: Set<string>,
    allBots: Entity[]
): AiResult | 'STEP_DONE' | 'STEP_FAILED' => {

    // ── RECOVER ──────────────────────────────────────────────────────────────
    if (step.type === 'RECOVER') {
        const ch = currentHex(bot, grid);
        if (ch && ch.structureType !== 'VOID' && !bot.recoveredCurrentHex) {
            return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: mem };
        }
        return 'STEP_DONE';
    }

    // ── MINE_UNTIL_FULL ──────────────────────────────────────────────────────
    if (step.type === 'MINE_UNTIL_FULL') {
        if (bot.storage >= (bot.maxStorage ?? 4)) return 'STEP_DONE';

        const restriction = monument ? buildMonumentRestriction(monument, grid) : undefined;
        const digTargets  = findBestDigTargets(bot, grid, allBots, 10, restriction);
        let bestTarget: Hex | null = null;
        for (const t of digTargets) {
            if (claimedSet.has(t.hex.id)) continue;
            bestTarget = t.hex;
            break;
        }
        if (!bestTarget) return 'STEP_FAILED';

        mem.targetHexId = bestTarget.id;
        return moveAndAct(bot, bestTarget, 'DIG', grid, navObstacles, stateVersion, mem, 'Mine');
    }

    // ── MOVE_TO ──────────────────────────────────────────────────────────────
    if (step.type === 'MOVE_TO') {
        const target = grid[step.targetId];
        if (!target) return 'STEP_FAILED';

        mem.targetHexId = step.targetId;
        if (dist(bot, target) === 0) return 'STEP_DONE';

        const path = findPath({ q: bot.q, r: bot.r }, { q: target.q, r: target.r }, grid, bot.playerLevel, navObstacles);
        if (!path || path.length === 0) {
            // Mountaineer: adjacent cliff → build a step up
            if (dist(bot, target) === 1 && bot.storage > 0) {
                const ch = currentHex(bot, grid);
                if (ch && target.maxLevel > ch.maxLevel + 1) {
                    const check = checkGrowthCondition(ch, bot, getNeighbors(bot.q, bot.r), grid, navObstacles);
                    if (check.canGrow) {
                        return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'UPGRADE', stateVersion }, debug: 'Mountaineer', memory: { ...mem, waitStreak: 0 } };
                    }
                }
            }
            return 'STEP_FAILED';
        }

        const cost = calculateMovementCost(bot, [path[0]], grid);
        if (!cost.canAfford) {
            if (!bot.recoveredCurrentHex) {
                const ch = currentHex(bot, grid);
                if (ch && ch.structureType !== 'VOID') {
                    return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'FundRecover', memory: mem };
                }
            }
            return 'STEP_FAILED';
        }

        return {
            action: { type: 'MOVE', path: [path[0]], stateVersion },
            debug: `MoveTo(${step.targetId.slice(-4)})`,
            memory: { ...mem, waitStreak: 0 },
        };
    }

    // ── UPGRADE ──────────────────────────────────────────────────────────────
    if (step.type === 'UPGRADE') {
        const target = grid[step.targetId];
        if (!target) return 'STEP_FAILED';

        // Out of materials mid-trip → fail so plan rebuilds with MINE_UNTIL_FULL
        if (bot.storage < 1) return 'STEP_FAILED';

        if (dist(bot, target) > 0) {
            return moveAndAct(bot, target, 'UPGRADE', grid, navObstacles, stateVersion, mem, 'ReachUpgrade');
        }

        const nbs   = getNeighbors(bot.q, bot.r);
        const check = checkGrowthCondition(target, bot, nbs, grid, navObstacles);
        if (!check.canGrow) return 'STEP_FAILED';

        return {
            action: { type: 'UPGRADE', coord: { q: target.q, r: target.r }, intent: 'UPGRADE', stateVersion },
            debug: `Upgrade(L${target.currentLevel}→${target.currentLevel + 1})`,
            memory: { ...mem, waitStreak: 0, stuckCounter: 0 },
        };
    }

    // ── DIG ──────────────────────────────────────────────────────────────────
    if (step.type === 'DIG') {
        const target = grid[step.targetId];
        if (!target) return 'STEP_FAILED';

        if (dist(bot, target) > 0) {
            return moveAndAct(bot, target, 'DIG', grid, navObstacles, stateVersion, mem, 'ReachDig');
        }

        const nbs   = getNeighbors(bot.q, bot.r);
        const check = checkDigCondition(target, bot, nbs, grid);
        if (!check.canGrow) return 'STEP_FAILED';

        return {
            action: { type: 'DIG', coord: { q: target.q, r: target.r }, stateVersion },
            debug: `Dig(L${target.currentLevel})`,
            memory: { ...mem, waitStreak: 0, stuckCounter: 0, targetHexId: null },
        };
    }

    return 'STEP_FAILED';
};

// ─────────────────────────────────────────────────────────────────────────────
// MOVEMENT + INTERACTION (low-level fallback)
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
    const d = dist(bot, target);

    if (d === 0) {
        const nbs   = getNeighbors(bot.q, bot.r);
        const check = actionType === 'UPGRADE'
            ? checkGrowthCondition(target, bot, nbs, grid, navObstacles)
            : checkDigCondition(target, bot, nbs, grid);

        if (check.canGrow) {
            const action: BotAction = actionType === 'UPGRADE'
                ? { type: 'UPGRADE', coord: { q: target.q, r: target.r }, intent: 'UPGRADE', stateVersion }
                : { type: 'DIG', coord: { q: target.q, r: target.r }, stateVersion };
            return { action, debug: `${debugPrefix}:Act`, memory: { ...mem, waitStreak: 0, stuckCounter: 0 } };
        }

        if (!bot.recoveredCurrentHex) {
            const ch = currentHex(bot, grid);
            if (ch && ch.structureType !== 'VOID') {
                return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'ActRecover', memory: mem };
            }
        }

        return { action: { type: 'WAIT', stateVersion }, debug: `${debugPrefix}:Blocked`, memory: { ...mem, stuckCounter: (mem.stuckCounter ?? 0) + 1 } };
    }

    const path = findPath({ q: bot.q, r: bot.r }, { q: target.q, r: target.r }, grid, bot.playerLevel, navObstacles);
    if (path && path.length > 0) {
        const cost = calculateMovementCost(bot, [path[0]], grid);
        if (cost.canAfford) {
            return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: `${debugPrefix}:Move`, memory: { ...mem, waitStreak: 0, stuckCounter: 0 } };
        }
        if (!bot.recoveredCurrentHex) {
            const ch = currentHex(bot, grid);
            if (ch && ch.structureType !== 'VOID') {
                return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'MoveRecover', memory: mem };
            }
        }
        return { action: { type: 'WAIT', stateVersion }, debug: 'Broke', memory: { ...mem, stuckCounter: (mem.stuckCounter ?? 0) + 1 } };
    }

    // Mountaineer
    if (d === 1 && bot.storage > 0) {
        const ch = currentHex(bot, grid);
        if (ch && target.maxLevel > ch.maxLevel + 1) {
            const check = checkGrowthCondition(ch, bot, getNeighbors(bot.q, bot.r), grid, navObstacles);
            if (check.canGrow) {
                return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'UPGRADE', stateVersion }, debug: 'Mountaineer', memory: { ...mem, stuckCounter: 0 } };
            }
        }
    }

    return { action: { type: 'WAIT', stateVersion }, debug: `${debugPrefix}:NoPath`, memory: { ...mem, stuckCounter: (mem.stuckCounter ?? 0) + 1 } };
};

// ─────────────────────────────────────────────────────────────────────────────
// SURVIVAL
// ─────────────────────────────────────────────────────────────────────────────

const survivalAction = (bot: Entity, grid: Record<string, Hex>, stateVersion: number, mem: BotMemory): AiResult | null => {
    if (bot.moves > 0) return null;
    if (bot.coins >= GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE) return null;
    if (bot.recoveredCurrentHex) return null;
    const ch = currentHex(bot, grid);
    if (ch && ch.structureType !== 'VOID') {
        return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, debug: 'Survival', memory: mem };
    }
    return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// PARACHUTE (emergency unstuck)
// ─────────────────────────────────────────────────────────────────────────────

const parachuteAction = (
    bot: Entity,
    grid: Record<string, Hex>,
    navObstacles: HexCoord[],
    monument: Hex | null,
    stateVersion: number,
    mem: BotMemory
): AiResult | null => {
    if ((mem.stuckCounter ?? 0) < STUCK_THRESHOLD) return null;

    const ch       = currentHex(bot, grid);
    const resetMem = { ...mem, stuckCounter: 0, plan: null, targetHexId: null };

    if (ch && ch.maxLevel >= 2) {
        const check = checkDigCondition(ch, bot, getNeighbors(bot.q, bot.r), grid);
        if (check.canGrow) {
            return { action: { type: 'DIG', coord: { q: bot.q, r: bot.r }, stateVersion }, debug: 'Parachute:Dig', memory: resetMem };
        }
    }

    if (ch && ch.maxLevel < 0 && bot.storage > 0) {
        const check = checkGrowthCondition(ch, bot, getNeighbors(bot.q, bot.r), grid, navObstacles);
        if (check.canGrow) {
            return { action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'UPGRADE', stateVersion }, debug: 'Parachute:Build', memory: resetMem };
        }
    }

    return yieldMove(bot, grid, navObstacles, monument, stateVersion, resetMem, 'Stuck');
};

// ─────────────────────────────────────────────────────────────────────────────
// FINALIZE
// ─────────────────────────────────────────────────────────────────────────────

const finalize = (result: AiResult, mem: BotMemory): AiResult => {
    const isWait             = result.action?.type === 'WAIT';
    result.memory.waitStreak = isWait ? (mem.waitStreak ?? 0) + 1 : 0;
    result.memory.lastActionType = result.action?.type ?? null;
    return result;
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ENTRY POINT
// ─────────────────────────────────────────────────────────────────────────────

export const calculateBotMove = (
    bot: Entity,
    grid: Record<string, Hex>,
    player: Entity,
    winCondition: WinCondition | null,
    obstacles: HexCoord[],
    index: WorldIndex,
    stateVersion: number,
    difficulty: Difficulty,
    reservedHexKeys?: Set<string>,
    allBots?: Entity[]
): AiResult => {
    if (!bot) {
        return { action: null, debug: 'ERR:NoBot', memory: { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 } };
    }

    const mem      = initMemory(bot);
    // CRITICAL: Persist the explore anchor (spawn point) so spiral searches are stable
    if (!mem.exploreAnchor) {
        mem.exploreAnchor = { q: bot.q, r: bot.r };
    }

    const navObs   = buildNavObstacles(bot, obstacles, reservedHexKeys);
    const claimed  = buildClaimedSet(bot, allBots ?? []);
    const monument = Object.values(grid).find(h => h.structureType === 'MONUMENT' && h.revealed) ?? null;
    const bots     = allBots ?? [];

    // ── 1. Survival (highest priority) ───────────────────────────────────────
    const sv = survivalAction(bot, grid, stateVersion, mem);
    if (sv) return finalize(sv, mem);

    // ── 2. Parachute (emergency unstuck) ─────────────────────────────────────
    const pc = parachuteAction(bot, grid, navObs, monument, stateVersion, mem);
    if (pc) return finalize(pc, mem);

    // ── 3. Plan lifecycle ─────────────────────────────────────────────────────
    const planAge   = stateVersion - (mem.plan?.createdAt ?? 0);
    const planStale = planAge > PLAN_TTL || (mem.waitStreak ?? 0) >= MAX_WAIT_STREAK;
    const planEmpty = !mem.plan || mem.plan.steps.length === 0;

    if (planEmpty || planStale) {
        mem.plan         = buildPlan(bot, grid, monument, navObs, claimed, stateVersion, bots, mem);
        mem.waitStreak   = 0;
        mem.stuckCounter = 0;
    }

    // ── 4. Execute current plan step ─────────────────────────────────────────
    while (mem.plan && mem.plan.steps.length > 0) {
        const step   = mem.plan.steps[0];
        const result = executeStep(step, bot, grid, navObs, stateVersion, mem, monument, claimed, bots);

        if (result === 'STEP_DONE') {
            mem.plan.steps.shift();
            continue;
        }

        if (result === 'STEP_FAILED') {
            if (mem.targetHexId) {
                mem.blacklistedTargets = [...(mem.blacklistedTargets ?? []), mem.targetHexId].slice(-6);
            }
            mem.plan        = null;
            mem.targetHexId = null;

            const y = yieldMove(bot, grid, navObs, monument, stateVersion, mem, 'PlanFail');
            return finalize(y ?? { action: { type: 'WAIT', stateVersion }, debug: 'PlanFail:Trapped', memory: mem }, mem);
        }

        // Refresh plan TTL on real progress (prevents expiry mid-walk)
        if (result.action?.type !== 'WAIT' && mem.plan) {
            mem.plan.createdAt = stateVersion;
        }

        return finalize(result, mem);
    }

    // ── 5. Nothing to do → yield or idle ─────────────────────────────────────
    const y = yieldMove(bot, grid, navObs, monument, stateVersion, mem, 'Idle');
    return finalize(y ?? { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem }, mem);
};
