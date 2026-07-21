import { Entity, Hex, HexCoord, BotMemory, BotAction, LevelConfig } from '../types';
import { getHexKey, cubeDistance, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { useGameStore } from '../store';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

export const HIVE_RADIUS         = 30;
export const PLAN_TTL            = 200;
export const MAX_WAIT_STREAK     = 4;   
export const MONUMENT_ZONE_R     = 4;   
export const MAX_BFS_STEPS       = 400;
export const MAX_COLUMN_HEIGHT   = 8;   
export const STUCK_THRESHOLD     = 7;   
export const REALTIME_STUCK_MS   = 10000; // 10 seconds

export const STOCKPILE_TARGET    = 3;   
export const EXPLORE_RADIUS      = 50;
export const MAX_EXPLORE_TICKS   = 40;

export const hexKey = (q: number, r: number) => getHexKey(q, r);
export const dist   = (a: HexCoord, b: HexCoord) => cubeDistance(a, b);

export const currentHex = (bot: Entity, grid: Record<string, Hex>): Hex | null =>
    grid[hexKey(bot.q, bot.r)] ?? null;

export const buildNavObstacles = (bot: Entity, obstacles: HexCoord[], reservedHexKeys?: Set<string>): HexCoord[] => {
    const nav = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r);
    if (reservedHexKeys) {
        reservedHexKeys.forEach(k => {
            const [q, r] = k.split(',').map(Number);
            nav.push({ q, r });
        });
    }
    return nav;
};

export const buildClaimedSet = (bot: Entity, allBots: Entity[]): Set<string> => {
    const claimed = new Set<string>();
    for (const other of allBots) {
        if (other.id === bot.id) continue;
        if (other.memory?.targetHexId) claimed.add(other.memory.targetHexId);
    }
    return claimed;
};

export const buildMonumentRestriction = (monument: Hex, index: WorldIndex, levelConfig?: LevelConfig): Set<string> => {
    const restricted = new Set<string>();
    const radius = levelConfig?.monumentZoneRadius ?? MONUMENT_ZONE_R;
    const candidates = index.getHexesInRange(monument, radius);
    for (const hex of candidates) {
        restricted.add(hex.id); 
    }
    return restricted;
};

export const checkHasVoidCore = (bot: Entity): boolean => {
    return !!(
        (bot.equipment && Object.values(bot.equipment).some(item => item && item.baseId === 'void_core')) ||
        (bot.activeStatuses && bot.activeStatuses.some(s => (s.type as string) === 'VOID_CORE' || s.label === 'Void Core'))
    );
};

export const getReachableHexes = (
    bot: Entity,
    grid: Record<string, Hex>,
    navObstacles: HexCoord[],
    maxDist: number = 20,
    hasVoidCore?: boolean
): Set<string> => {
    const reachable = new Set<string>();
    const startKey = hexKey(bot.q, bot.r);
    const queue: { q: number, r: number, dist: number }[] = [{ q: bot.q, r: bot.r, dist: 0 }];
    
    const obsKeys = new Set<string>();
    for (const o of navObstacles) {
        obsKeys.add(hexKey(o.q, o.r));
    }
    
    const finalHasVoidCore = hasVoidCore !== undefined ? hasVoidCore : checkHasVoidCore(bot);
    
    const isDefenseMode = !!useGameStore.getState().session?.defense?.isDefenseMode;
    
    reachable.add(startKey);
    
    let head = 0;
    while (head < queue.length) {
        const current = queue[head++];
        if (current.dist >= maxDist) continue;
        
        const currentHexHex = grid[hexKey(current.q, current.r)];
        const currentLevel = currentHexHex ? currentHexHex.currentLevel : 0;
        
        const neighbors = getNeighbors(current.q, current.r);
        for (const n of neighbors) {
            const nKey = hexKey(n.q, n.r);
            if (reachable.has(nKey) || obsKeys.has(nKey)) continue;
            
            const nHex = grid[nKey];
            if (!nHex || nHex.structureType === 'VOID') continue;
            if (isDefenseMode && nHex.currentLevel > 1) continue;
            if (nHex.currentLevel > bot.playerLevel) continue;
            if (!finalHasVoidCore && Math.abs(currentLevel - nHex.currentLevel) > 1) continue;
            
            reachable.add(nKey);
            queue.push({ q: n.q, r: n.r, dist: current.dist + 1 });
        }
    }
    return reachable;
};

export type GamePhase = 'EXPLORE' | 'STOCKPILE' | 'ASSAULT';

export const detectGamePhase = (bot: Entity, monument: Hex | null, allBots: Entity[]): GamePhase => {
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

export const initMemory = (bot: Entity): BotMemory => ({
    lastPlayerPos: null, stuckCounter: 0, mode: 'GATHER', projectFailCount: 0,
    botRole: 'BUILDER', waitStreak: 0, targetHexId: null, plan: null,
    blacklistedTargets: [], phase: 'EXPLORE', exploreAnchor: null, stockpileWaitTicks: 0,
    lastActionType: null, stayStreak: 0, lastPosKey: null,
    ...(bot.memory ?? {}),
});

export const findCooperativeBuildTarget = (
    bot: Entity,
    grid: Record<string, Hex>,
    allBots: Entity[],
    navObstacles: HexCoord[],
    reachable: Set<string>
): string | null => {
    for (const other of allBots) {
        if (other.id === bot.id) continue;
        const otherTargetId = other.memory?.targetHexId;
        if (!otherTargetId) continue;

        const otherTarget = grid[otherTargetId];
        if (!otherTarget || otherTarget.structureType === 'VOID' || otherTarget.structureType === 'MONUMENT') continue;

        const check = checkGrowthCondition(otherTarget, other, getNeighbors(otherTarget.q, otherTarget.r), grid, navObstacles);
        
        if (check.missingSupports && check.missingSupports.length > 0) {
            for (const ms of check.missingSupports) {
                const msHexKey = getHexKey(ms.q, ms.r);
                if (reachable.has(msHexKey)) {
                    const msHex = grid[msHexKey];
                    if (msHex && msHex.structureType !== 'VOID' && checkGrowthCondition(msHex, bot, getNeighbors(ms.q, ms.r), grid, navObstacles).canGrow) {
                        return msHexKey;
                    }
                }
            }
        }

        if (check.canGrow && reachable.has(otherTargetId) && bot.storage > 0) {
            return otherTargetId;
        }
    }
    return null;
};

export const finalize = (result: AiResult, mem: BotMemory): AiResult => {
    result.memory.waitStreak = result.action?.type === 'WAIT' ? (mem.waitStreak ?? 0) + 1 : 0;
    result.memory.lastActionType = result.action?.type ?? null; 
    return result;
};
