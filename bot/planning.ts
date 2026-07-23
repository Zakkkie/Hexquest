import { Hex, Entity, HexCoord } from '../types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';

interface ScoredTarget {
    hex: Hex;
    score: number;
    reason: string;
    actionType: 'UPGRADE' | 'DIG' | 'MOVE_ONLY';
}

const MAX_RECURSION_DEPTH = 3;

/**
 * Проверка: Не рухнет ли башня, если мы выкопаем этот гекс?
 */
const isLoadBearing = (hex: Hex, grid: Record<string, Hex>): boolean => {
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

export const resolveBuildChain = (
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
    if (target.structureType === 'VOID') return null;
    const isDefenseMode = !!(bot.memory?.botRole?.startsWith('SIEGE_'));
    if (!isDefenseMode && target.structureType === 'MONUMENT') return null;

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
const findDestroyerTarget = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    player: Entity,
    _scanRadius: number
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
            .filter(h => h && (h.isCore || (h.ownerId === player.id && h.maxLevel > 0)) && h.structureType !== 'VOID');
        
        if (structuresInSight.length > 0) {
            const lastDestroy = bot.memory?.lastDestroyTime || 0;
            const now = Date.now();
            
            if (now > lastDestroy + 15000) { 
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

    // Fallback if no patrol path: scan in a larger radius (use passed _scanRadius)
    const scanRadiusForDestroyerFallback = _scanRadius > 3 ? _scanRadius : 3;
    const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, scanRadiusForDestroyerFallback);
    let bestTarget: ScoredTarget | null = null;
    let maxScore = -9999;
    const isDefenseMode = !!(bot.memory?.botRole?.startsWith('SIEGE_'));

    for (const hex of candidates) {
        if (hex.structureType === 'VOID') continue;
        if (!isDefenseMode && hex.structureType === 'MONUMENT') continue;
        
        // НОВОЕ ИСПРАВЛЕНИЕ: Игнорируем гексы, на которые бот не может залезть из-за ранга
        // ИСКЛЮЧЕНИЕ: Боты в осаде могут атаковать любой гекс независимо от ранга!
        if (!isDefenseMode && hex.currentLevel > bot.playerLevel) continue;
        
        let score = 0;
        if (hex.ownerId === player.id || hex.isCore) {
            score += 100 + (hex.maxLevel * 20);
            if (hex.isCore) {
                score += 500;
            }
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
    role: 'BUILDER' | 'MINER' | 'DESTROYER' | 'SIEGE_RUNNER' | 'SIEGE_GRINDER' | 'SIEGE_TANK',
    scanRadius: number,
    player?: Entity
): ScoredTarget | null => {
    
    if ((role === 'DESTROYER' || role.startsWith('SIEGE_')) && player) {
        return findDestroyerTarget(bot, grid, index, player, scanRadius);
    }

    let bestTarget: ScoredTarget | null = null;
    let maxScore = -9999;

    if (role === 'BUILDER') {
        const monument = index.getHexesInRange({q: 0, r: 0}, 100).find(h => h.structureType === 'MONUMENT' && h.botRevealed && h.botRevealed[bot.id]);
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
        if (hex.currentLevel > bot.playerLevel) continue;

        let potentialScore = 0;
        let chainResult: ScoredTarget | null = null;
        const d = cubeDistance(bot, hex);

        if (role === 'MINER') {
            // Solidarity: never dig friendly bot territory
            if (hex.ownerId && hex.ownerId !== bot.id && hex.ownerId !== 'player-1') continue;
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
    index: WorldIndex,
    _allBots: Entity[],
    limit: number = 5,
    restrictedArea?: Set<string>,
    reachable?: Set<string>
): { hex: Hex; score: number }[] => {
    
    const candidates: { hex: Hex; score: number }[] = [];
    const botPos = { q: bot.q, r: bot.r };

    let searchCandidates: Hex[] = [];
    if (reachable) {
        for (const id of reachable) {
            const hex = grid[id];
            if (hex) searchCandidates.push(hex);
        }
    } else {
        const searchRadius = 20;
        searchCandidates = index.getHexesInRange(botPos, searchRadius);
    }

    for (const hex of searchCandidates) {
        if (hex.structureType === 'VOID' || hex.structureType === 'MONUMENT') continue;
        if (restrictedArea && restrictedArea.has(hex.id)) continue;
        
        // 1. Игнорируем гексы, на которые бот не может залезть из-за ранга
        // (Но если он уже стоит на нём — игнорировать не нужно!)
        if (hex.currentLevel > bot.playerLevel && cubeDistance(botPos, hex) > 0) continue;

        // 2. Защита: не копаем чужие базы (если мы не DESTROYER)
        // Solidarity: never dig friendly bot territory
        if (hex.ownerId && hex.ownerId !== bot.id && hex.ownerId !== 'player-1') continue;
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

export const findBestBuildTarget = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    navObstacles: HexCoord[],
    claimedSet: Set<string>,
    blacklisted: string[],
    reachable: Set<string>,
    options?: { allowPlayerOwner?: boolean; campaignScoring?: boolean }
): Hex | null => {
    const botPos = { q: bot.q, r: bot.r };
    let bestBuild: Hex | null = null;
    let bestScore = -9999;

    for (const id of reachable) {
        const hex = grid[id];
        if (!hex || hex.structureType === 'VOID' || hex.structureType === 'MONUMENT') continue;
        
        if (options?.allowPlayerOwner) {
            if (hex.ownerId && hex.ownerId !== bot.id && hex.ownerId !== 'player-1') continue;
        } else {
            if (hex.ownerId && hex.ownerId !== bot.id) continue;
        }

        if (hex.currentLevel > bot.playerLevel && cubeDistance(botPos, hex) > 0) continue;
        if (claimedSet.has(hex.id) || blacklisted.includes(hex.id)) continue;

        const check = checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, navObstacles);
        if (check.canGrow) {
            const d = cubeDistance(botPos, hex);
            let score = 0;
            if (options?.campaignScoring) {
                score = -d;
                if (hex.currentLevel === 0) score += 5;
            } else {
                score = -d * 2;
                score += hex.currentLevel * 50;
                if (d === 0) score += 20;
                if (hex.ownerId === bot.id) score += 10;
            }

            if (score > bestScore) {
                bestScore = score;
                bestBuild = hex;
            }
        } else if (check.missingSupports && check.missingSupports.length > 0) {
            const resolved = resolveBuildChain(hex, bot, grid, index, 0);
            if (resolved && reachable.has(resolved.hex.id) && !blacklisted.includes(resolved.hex.id)) {
                const d = cubeDistance(botPos, resolved.hex);
                let score = 0;
                if (options?.campaignScoring) {
                    score = -d;
                    if (resolved.hex.currentLevel === 0) score += 5;
                } else {
                    score = -d * 2;
                    score += resolved.hex.currentLevel * 50;
                    if (d === 0) score += 20;
                    if (resolved.hex.ownerId === bot.id) score += 10;
                }
                
                if (score > bestScore) {
                    bestScore = score;
                    bestBuild = resolved.hex;
                }
            }
        }
    }

    return bestBuild;
};