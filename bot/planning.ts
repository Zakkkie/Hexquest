
import { Hex, Entity, HexCoord, Difficulty } from '../types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { DIFFICULTY_SETTINGS } from '../rules/config';
import { WorldIndex } from '../engine/WorldIndex';

// ==========================================
// V70: HEX SCORING SYSTEM
// ==========================================

export interface HexScore {
  hex: Hex;
  score: number;
  reason: string;
  action: 'BUILD' | 'DIG' | 'CLAIM' | 'AVOID';
}

// V70: Score hex for building potential
export const scoreHexForBuilding = (
  hex: Hex,
  bot: Entity,
  allBots: Entity[],
  grid: Record<string, Hex>
): HexScore => {
  let score = 0;
  const reasons: string[] = [];
  
  // Distance from bot (closer is better)
  const dist = cubeDistance(bot, hex);
  score += Math.max(0, 10 - dist);
  
  // Current level (higher = better foundation)
  score += hex.currentLevel * 15;
  if (hex.currentLevel > 0) reasons.push(`L${hex.currentLevel}`);
  
  // Check if it's in another bot's territory
  for (const other of allBots) {
    if (other.id === bot.id) continue;
    if (other.memory?.homeBase) {
      const distToOther = cubeDistance(hex, other.memory.homeBase);
      if (distToOther < 5) {
        score -= 10;
        reasons.push('claimed');
        break;
      }
    }
  }
  
  // Pyramid potential - count neighbors at same level
  const neighbors = getNeighbors(hex.q, hex.r);
  let sameLevelNeighbors = 0;
  for (const n of neighbors) {
    const nHex = grid[getHexKey(n.q, n.r)];
    if (nHex && nHex.currentLevel >= hex.currentLevel) {
      sameLevelNeighbors++;
    }
  }
  score += sameLevelNeighbors * 5;
  if (sameLevelNeighbors >= 2) reasons.push('pyramid-ready');
  
  // Distance from center (edge areas good for expansion)
  const distFromCenter = cubeDistance(hex, {q:0, r:0});
  if (distFromCenter > 5 && distFromCenter < 15) {
    score += 5;
    reasons.push('expand-zone');
  }
  
  return {
    hex,
    score,
    reason: reasons.join(',') || 'neutral',
    action: score > 20 ? 'BUILD' : 'CLAIM'
  };
};

// V70: Score hex for digging potential
export const scoreHexForDigging = (
  hex: Hex,
  bot: Entity,
  allBots: Entity[],
  grid: Record<string, Hex>
): HexScore => {
  let score = 0;
  const reasons: string[] = [];
  
  // Deep hexes are better quarries
  score += Math.abs(Math.min(0, hex.currentLevel)) * 12;
  if (hex.currentLevel < 0) reasons.push(`D${hex.currentLevel}`);
  
  // Distance from builders (diggers should be near who they supply)
  for (const other of allBots) {
    if (other.memory?.botRole === 'BUILDER' && other.memory?.homeBase) {
      const distToBuilder = cubeDistance(hex, other.memory.homeBase);
      if (distToBuilder < 8) {
        score += 10;
        reasons.push('near-builder');
        break;
      }
    }
  }
  
  // Accessibility - can we actually dig here?
  const digCheck = checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid);
  if (digCheck.canGrow) {
    score += 7;
    reasons.push('accessible');
  }
  
  return {
    hex,
    score,
    reason: reasons.join(',') || 'neutral',
    action: score > 15 ? 'DIG' : 'AVOID'
  };
};

// V70: Find best build targets
export const findBestBuildTargets = (
  bot: Entity,
  grid: Record<string, Hex>,
  allBots: Entity[],
  maxResults: number = 5
): HexScore[] => {
  const allHexes = Object.values(grid);
  const scoredHexes = allHexes
    .map(h => scoreHexForBuilding(h, bot, allBots, grid))
    .filter(s => s.score > 10)
    .sort((a, b) => b.score - a.score);
  
  return scoredHexes.slice(0, maxResults);
};

// V70: Find best dig targets
export const findBestDigTargets = (
  bot: Entity,
  grid: Record<string, Hex>,
  allBots: Entity[],
  maxResults: number = 3
): HexScore[] => {
  const allHexes = Object.values(grid);
  const scoredHexes = allHexes
    .map(h => scoreHexForDigging(h, bot, allBots, grid))
    .filter(s => s.score > 10)
    .sort((a, b) => b.score - a.score);
  
  return scoredHexes.slice(0, maxResults);
};

/**
 * V62: Pyramid Foundation Planning
 * Calculates the optimal base size needed for a target height
 * For a pyramid of height H, we need a base of approximately H hexes radius
 * 
 * Returns array of hexes that should be built in order (foundation first)
 */
export const planPyramidConstruction = (
    centerHex: Hex,
    targetHeight: number,
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex
): Hex[] => {
    const buildOrder: Hex[] = [];
    
    // Calculate required base radius for target height
    // For height H, we need base radius of at least H (for safety, use H+1)
    const baseRadius = Math.min(targetHeight + 1, 4); // Cap at 4 to avoid too wide bases
    
    // Gather all hexes within base radius
    const baseHexes: Hex[] = [];
    const allHexes = Object.values(grid);
    
    for (const hex of allHexes) {
        const dist = cubeDistance(centerHex, hex);
        if (dist <= baseRadius && hex.structureType !== 'VOID') {
            baseHexes.push(hex);
        }
    }
    
    // Sort by distance from center (closer = built first)
    baseHexes.sort((a, b) => {
        const distA = cubeDistance(centerHex, a);
        const distB = cubeDistance(centerHex, b);
        if (distA !== distB) return distA - distB;
        // For same distance, sort by current level (lower = prioritize)
        return a.currentLevel - b.currentLevel;
    });
    
    // Group hexes by desired level in the pyramid
    // Level 1: All hexes at base radius
    // Level 2: Hexes at radius-1
    // etc.
    const levelGroups: Hex[][] = [];
    for (let level = 1; level <= targetHeight; level++) {
        const maxRadiusForLevel = baseRadius - level + 1;
        const hexesAtLevel = baseHexes.filter(h => {
            const dist = cubeDistance(centerHex, h);
            return dist <= maxRadiusForLevel && h.currentLevel < level;
        });
        if (hexesAtLevel.length > 0) {
            levelGroups.push(hexesAtLevel);
        }
    }
    
    // Flatten groups into build order (level 1 first, then level 2, etc.)
    for (const group of levelGroups) {
        buildOrder.push(...group);
    }
    
    return buildOrder;
};

/**
 * Finds the immediate actionable hex required to support a long-term goal.
 * V62: Enhanced with pyramid-aware planning
 * Uses Depth-First Search (DFS) to focus on completing local support structures
 * before moving to distant ones, preventing the bot from "jumping" around.
 */

const SEARCH_DEPTH_LIMIT = 200; 

export const findNextConstructionTarget = (
    goalHex: Hex,
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    difficulty: Difficulty
): Hex | null => {
    
    // Stack for DFS (LIFO)
    const stack: Hex[] = [goalHex];
    const visited = new Set<string>();
    visited.add(goalHex.id);
    
    let iterations = 0;
    const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 2;

    while (stack.length > 0 && iterations < SEARCH_DEPTH_LIMIT) {
        iterations++;
        const current = stack.pop()!; 
        
        // 1. Check if we can build this NOW
        const neighbors = getNeighbors(current.q, current.r);
        const occupied = index.getOccupiedHexesList();
        
        const check = checkGrowthCondition(current, bot, neighbors, grid, occupied, queueSize);

        if (check.canGrow) {
            // Valid if empty OR occupied by SELF.
            // (We cannot build if another bot is standing there)
            const occupant = index.getEntityAt(current.q, current.r);
            if (!occupant || occupant.id === bot.id) {
                return current; 
            }
            // If blocked by another bot, we skip this specific node 
            // but continue processing the stack to see if other branches are viable.
            continue; 
        }

        // 2. If blocked by missing supports, add them to the stack
        if (check.missingSupports && check.missingSupports.length > 0) {
            
            // SORTING IS CRITICAL FOR STABILITY:
            // We want to pop the CLOSEST support first.
            // Since Stack is LIFO, we push Furthest -> Closest.
            // So we sort Descending by Distance.
            
            const sortedSupports = [...check.missingSupports].sort((a, b) => {
                const distA = cubeDistance(bot, a);
                const distB = cubeDistance(bot, b);
                return distB - distA; // Descending
            });

            for (const coord of sortedSupports) {
                const key = getHexKey(coord.q, coord.r);
                if (visited.has(key)) continue;
                
                const supportHex = grid[key];
                
                // Only consider valid hexes
                if (supportHex && supportHex.structureType !== 'VOID') {
                    visited.add(key);
                    stack.push(supportHex);
                }
            }
        }
    }

    return null; // Could not find a solvable path
};

export const findNextExcavationTarget = (
    goalHex: Hex,
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex
): Hex | null => {
    
    // DFS for Digging (Reverse Pyramid)
    const stack: Hex[] = [goalHex];
    const visited = new Set<string>();
    visited.add(goalHex.id);
    let iterations = 0;

    while (stack.length > 0 && iterations < SEARCH_DEPTH_LIMIT) {
        iterations++;
        const current = stack.pop()!;

        const neighbors = getNeighbors(current.q, current.r);
        const check = checkDigCondition(current, bot, neighbors, grid);

        if (check.canGrow) {
            const occupant = index.getEntityAt(current.q, current.r);
            if (!occupant || occupant.id === bot.id) {
               return current;
            }
            continue;
        }

        if (check.missingSupports && check.missingSupports.length > 0) {
            // Sort Descending Distance (Process Closest First)
            const sortedSupports = [...check.missingSupports].sort((a, b) => {
                const distA = cubeDistance(bot, a);
                const distB = cubeDistance(bot, b);
                return distB - distA;
            });

            for (const coord of sortedSupports) {
                const key = getHexKey(coord.q, coord.r);
                if (visited.has(key)) continue;
                
                const supportHex = grid[key];
                if (supportHex && supportHex.structureType !== 'VOID') {
                    visited.add(key);
                    stack.push(supportHex);
                }
            }
        }
    }

    return null;
};
