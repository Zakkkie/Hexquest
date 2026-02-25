import { Hex, Entity, HexCoord, Difficulty } from '../types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';

export interface ScoredTarget {
    hex: Hex;
    score: number;
    reason: string;
    actionType: 'UPGRADE' | 'DIG' | 'MOVE_ONLY';
}

const MAX_RECURSION_DEPTH = 3;

/**
 * Проверка: Не рухнет ли башня, если мы выкопаем этот гекс?
 */
export const isLoadBearing = (hex: Hex, grid: Record<string, Hex>): boolean => {
    // ФУНДАМЕНТАЛЬНОЕ ИСПРАВЛЕНИЕ: Гексы уровня 0 и ниже физически не могут быть опорами!
    // Опоры требуются только зданиям L2 и выше (им нужны соседи L1+).
    if (hex.maxLevel < 1) return false;

    const nbs = getNeighbors(hex.q, hex.r);
    for (const nCoord of nbs) {
        const neighbor = grid[getHexKey(nCoord.q, nCoord.r)];
        
        // Проверяем, является ли текущий гекс РЕАЛЬНОЙ опорой для соседа
        if (neighbor && neighbor.maxLevel >= 2 && hex.maxLevel === neighbor.maxLevel - 1) {
            const nNeighbors = getNeighbors(neighbor.q, neighbor.r);
            let otherSupports = 0;
            for (const nn of nNeighbors) {
                if (nn.q === hex.q && nn.r === hex.r) continue; // Себя не считаем
                const sup = grid[getHexKey(nn.q, nn.r)];
                if (sup && sup.maxLevel >= neighbor.maxLevel - 1) {
                    otherSupports++;
                }
            }
            // Если у соседа останется меньше 2 других опор, то наш гекс сносить НЕЛЬЗЯ
            if (otherSupports < 2) return true; 
        }
    }
    return false;
};

const resolveBuildChain = (
    target: Hex,
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    depth: number
): ScoredTarget | null => {
    if (depth > MAX_RECURSION_DEPTH) return null;
    if (target.maxLevel >= 99) return null;

    const nbs = getNeighbors(target.q, target.r);
    const occupied = index.getOccupiedHexesList();
    const check = checkGrowthCondition(target, bot, nbs, grid, occupied);

    if (check.canGrow) {
        return {
            hex: target,
            score: 0,
            reason: depth === 0 ? 'Direct Build' : `Support for L${target.maxLevel+1}`,
            actionType: 'UPGRADE'
        };
    }

    if (check.missingSupports && check.missingSupports.length > 0) {
        const supports = check.missingSupports
            .map(c => grid[getHexKey(c.q, c.r)])
            .filter(h => h && h.structureType !== 'VOID')
            .sort((a,b) => b.currentLevel - a.currentLevel);

        for (const supp of supports) {
            const res = resolveBuildChain(supp, bot, grid, index, depth + 1);
            if (res) return res;
        }
    }
    return null;
};

const resolveDigChain = (
    target: Hex,
    bot: Entity,
    grid: Record<string, Hex>,
    depth: number
): ScoredTarget | null => {
    if (depth > MAX_RECURSION_DEPTH) return null;
    if (target.structureType === 'VOID' || target.structureType === 'MONUMENT') return null;

    const nbs = getNeighbors(target.q, target.r);
    const check = checkDigCondition(target, bot, nbs, grid);

    if (check.canGrow) {
        return { 
            hex: target, 
            score: 0, 
            reason: depth === 0 ? 'Direct Dig' : `Expand Pit`,
            actionType: 'DIG'
        };
    }

    if (check.missingSupports && check.missingSupports.length > 0) {
        const blockers = check.missingSupports
            .map(c => grid[getHexKey(c.q, c.r)])
            .filter(h => h && h.structureType !== 'VOID')
            .sort((a,b) => b.currentLevel - a.currentLevel);

        for (const blocker of blockers) {
            const res = resolveDigChain(blocker, bot, grid, depth + 1);
            if (res) return res;
        }
    }
    return null;
};

/**
 * Logic for the DESTROYER bot role.
 * Follows a patrol path and deviates to destroy player-owned hexes if nearby.
 */
export const findDestroyerTarget = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    player: Entity,
    scanRadius: number
): ScoredTarget | null => {
    
    if (bot.memory?.patrolPath && bot.memory.patrolPath.length > 0) {
        const path = bot.memory.patrolPath;
        let currentIndex = bot.memory.patrolIndex ?? 0;
        
        const currentTarget = path[currentIndex];
        if (bot.q === currentTarget.q && bot.r === currentTarget.r) {
            currentIndex = (currentIndex + 1) % path.length;
            if (bot.memory) bot.memory.patrolIndex = currentIndex;
        }
        
        const nextTargetCoord = path[currentIndex];
        const nextTargetHex = grid[getHexKey(nextTargetCoord.q, nextTargetCoord.r)];

        // --- DESTRUCTION LOGIC (Dynamic Scan) ---
        const scanRadiusForDestroyer = 3; 
        const structuresInSight = index.getHexesInRange({q: bot.q, r: bot.r}, scanRadiusForDestroyer)
            .filter(h => h && h.ownerId === player.id && h.maxLevel > 0 && h.structureType !== 'VOID');
        
        if (structuresInSight.length > 0) {
            const lastDestroy = bot.memory?.lastDestroyTime || 0;
            const now = Date.now();
            
            if (now > lastDestroy + 5000) { 
                const victim = structuresInSight.sort((a, b) => b.maxLevel - a.maxLevel)[0];
                const digChain = resolveDigChain(victim, bot, grid, 0);
                if (digChain) {
                    if (bot.memory) bot.memory.lastDestroyTime = now;
                    return {
                        ...digChain,
                        reason: "Target Acquired: Deviating from patrol to destroy player structure"
                    };
                }
            }
        }

        // --- PATROL LOGIC ---
        if (nextTargetHex) {
            return {
                hex: nextTargetHex,
                score: 1000,
                reason: `Patrol: Moving to (${nextTargetCoord.q}, ${nextTargetCoord.r})`,
                actionType: 'MOVE_ONLY' 
            };
        }
    }

    const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, scanRadius);
    let bestTarget: ScoredTarget | null = null;
    let maxScore = -9999;

    for (const hex of candidates) {
        if (hex.structureType === 'VOID' || hex.structureType === 'MONUMENT') continue;
        
        // НОВОЕ ИСПРАВЛЕНИЕ: Игнорируем гексы, на которые бот не может залезть из-за ранга
        if (hex.maxLevel > bot.playerLevel) continue;
        
        let score = 0;
        if (hex.ownerId === player.id) {
            score += 100 + (hex.maxLevel * 20);
        }
        
        const distToPlayer = cubeDistance(hex, player);
        if (distToPlayer <= 2 && hex.maxLevel > 0) score += 50;
        score -= cubeDistance(bot, hex) * 5;

        const chain = resolveDigChain(hex, bot, grid, 0);
        
        if (chain) {
            if (score > maxScore) {
                maxScore = score;
                bestTarget = chain;
            }
        }
    }
    
    return bestTarget;
};

export const findHiveTarget = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    role: 'BUILDER' | 'MINER' | 'DESTROYER',
    scanRadius: number,
    player?: Entity
): ScoredTarget | null => {
    
    if (role === 'DESTROYER' && player) {
        return findDestroyerTarget(bot, grid, index, player, scanRadius);
    }

    let bestTarget: ScoredTarget | null = null;
    let maxScore = -9999;

    if (role === 'BUILDER') {
        const monument = Object.values(grid).find(h => h.structureType === 'MONUMENT' && h.revealed);
        if (monument && monument.currentLevel < 10) {
            const chainResult = resolveBuildChain(monument, bot, grid, index, 0);
            if (chainResult) {
                return {
                    ...chainResult,
                    score: 10000, 
                    reason: `MONUMENT PRIORITY: ${chainResult.reason}`
                };
            }
        }
    }

    const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, scanRadius);

    for (const hex of candidates) {
        if (hex.structureType === 'VOID' || hex.structureType === 'MONUMENT') continue;

        // НОВОЕ ИСПРАВЛЕНИЕ: Игнорируем гексы, на которые бот не может залезть из-за ранга
        if (hex.maxLevel > bot.playerLevel) continue;

        let potentialScore = 0;
        let chainResult: ScoredTarget | null = null;
        const d = cubeDistance(bot, hex);

        if (role === 'MINER') {
            // ИСПРАВЛЕНИЕ 3 (УМНАЯ ЗАЩИТА): Шахтер не должен сносить ПОСТРОЙКИ (свои или чужие).
            // Но природные ничейные горы (currentLevel > 0 без ownerId) копать МОЖНО!
            if (hex.currentLevel > 0 && hex.ownerId) continue;
            
            potentialScore = (Math.abs(hex.currentLevel) * 10) - d;
            if (hex.currentLevel > 0) potentialScore = (hex.currentLevel * 15) - d; // Приоритет природным горам
            if (hex.currentLevel < -5) potentialScore -= 50; 
            chainResult = resolveDigChain(hex, bot, grid, 0);
        } 
        else {
            if (hex.maxLevel >= 10) continue;
            potentialScore = (hex.maxLevel * 20) - d;
            if (maxScore > 500) continue; 
            if (hex.ownerId === bot.id) potentialScore += 10;
            chainResult = resolveBuildChain(hex, bot, grid, index, 0);
        }

        if (chainResult) {
            const finalScore = potentialScore + 50;
            if (finalScore > maxScore) {
                maxScore = finalScore;
                bestTarget = chainResult;
            }
        }
    }

    return bestTarget;
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORTED FOR ADVANCED MINERS (EXPLORE / STOCKPILE PHASES)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ищет лучшие цели для раскопок (добычи материалов).
 * Отбраковывает гексы в запретной зоне (restrictedArea), чтобы не снести
 * фундамент вокруг Монумента.
 */
export const findBestDigTargets = (
    bot: Entity,
    grid: Record<string, Hex>,
    allBots: Entity[],
    limit: number = 5,
    restrictedArea?: Set<string>
): { hex: Hex; score: number }[] => {
    
    const candidates: { hex: Hex; score: number }[] = [];
    const botPos = { q: bot.q, r: bot.r };

    for (const hex of Object.values(grid)) {
        if (hex.structureType === 'VOID' || hex.structureType === 'MONUMENT') continue;
        if (restrictedArea && restrictedArea.has(hex.id)) continue;
        
        // 1. Игнорируем гексы, на которые бот не может залезть из-за ранга
        // (Но если он уже стоит на нём — игнорировать не нужно!)
        if (hex.maxLevel > bot.playerLevel && cubeDistance(botPos, hex) > 0) continue;

        // 2. Защита: не копаем чужие базы (если мы не DESTROYER)
        if (hex.ownerId && hex.ownerId !== bot.id && hex.maxLevel > 0) continue;

        const d = cubeDistance(botPos, hex);

        // 3. УМНАЯ ЗАЩИТА СЕБЯ: Не сносим свои собственные постройки (базы > 0).
        // ИСКЛЮЧЕНИЕ: Если мы стоим прямо на этой базе (d === 0), у нас 0 материалов, 
        // и мы застряли (потому что ищем цель для раскопок), то снести её под собой МОЖНО!
        if (hex.currentLevel > 0 && hex.ownerId === bot.id && d > 0) continue;

        if (isLoadBearing(hex, grid)) continue;
        if (d > 20) continue; 

        // 4. Проверка геометрии (можем ли вообще выкопать этот гекс)
        const check = checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid);
        if (!check.canGrow) continue;

        let score = 0;
        if (hex.currentLevel > 0) {
            score += hex.currentLevel * 10; 
        } else {
            score += Math.abs(hex.currentLevel) * 5; 
        }
        
        // Если это наша собственная база под нами, даем ей очень высокий приоритет,
        // чтобы бот мгновенно снес её и спустился, а не зависал, глядя на недоступные L0.
        if (d === 0 && hex.currentLevel > 0 && hex.ownerId === bot.id) {
            score += 100;
        }

        score -= d * 2; 

        candidates.push({ hex, score });
    }

    return candidates.sort((a, b) => b.score - a.score).slice(0, limit);
};