
import { Hex, Entity, HexCoord } from '../types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';

export interface HexScore {
  hex: Hex;
  score: number;
  reason: string;
  action: 'BUILD' | 'DIG' | 'CLAIM' | 'AVOID';
}

/**
 * Checks if a hex is critical for supporting a higher-level neighbor.
 */
const isLoadBearing = (hex: Hex, grid: Record<string, Hex>): boolean => {
    if (!hex) return false;
    const neighbors = getNeighbors(hex.q, hex.r);
    
    for (const n of neighbors) {
        const nHex = grid[getHexKey(n.q, n.r)];
        if (nHex && nHex.structureType !== 'VOID' && nHex.maxLevel > 1) {
            if (hex.maxLevel >= nHex.maxLevel - 1) {
                const nNeighbors = getNeighbors(nHex.q, nHex.r);
                let supportCount = 0;
                for (const nn of nNeighbors) {
                    const nnHex = grid[getHexKey(nn.q, nn.r)];
                    if (nnHex && nnHex.structureType !== 'VOID' && nnHex.maxLevel >= nHex.maxLevel - 1) {
                        supportCount++;
                    }
                }
                if (supportCount <= 2) return true;
            }
        }
    }
    return false;
};

// Score hex for building potential
export const scoreHexForBuilding = (
  hex: Hex,
  bot: Entity,
  allBots: Entity[],
  grid: Record<string, Hex>
): HexScore => {
  let score = 0;
  const reasons: string[] = [];
  
  if (hex.structureType === 'VOID') return { hex, score: -999, reason: 'void', action: 'AVOID' };

  // Distance penalty
  const dist = cubeDistance(bot, hex);
  score += Math.max(0, 20 - (dist * 2)); 
  
  // Current level (higher = better foundation)
  score += hex.currentLevel * 10;
  
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

  // Accessibility Check (Crucial for decision making)
  const growCheck = checkGrowthCondition(hex, bot, neighbors, grid, []);
  if (growCheck.canGrow) {
      score += 25; // Actionable
      reasons.push('buildable');
  } else {
      score -= 50; // Not buildable
  }
  
  return {
    hex,
    score,
    reason: reasons.join(',') || 'neutral',
    action: score > 20 ? 'BUILD' : 'CLAIM'
  };
};

// Score hex for digging potential
export const scoreHexForDigging = (
  hex: Hex,
  bot: Entity,
  allBots: Entity[],
  grid: Record<string, Hex>
): HexScore => {
  let score = 0;
  const reasons: string[] = [];
  
  // Rule 1: Structural Integrity
  if (isLoadBearing(hex, grid)) {
      return { hex, score: -9999, reason: 'LOAD-BEARING', action: 'AVOID' };
  }

  // Rule 2: Don't dig the Master Tower foundation
  for (const b of allBots) {
      if (b.memory?.homeBase && cubeDistance(hex, b.memory.homeBase) <= 1 && hex.maxLevel > 0) {
          return { hex, score: -500, reason: 'BASE-FOUNDATION', action: 'AVOID' };
      }
  }

  // Rule 3: PRESERVE INFRASTRUCTURE
  // Avoid digging structures > L0 unless owned by self (logic handled by caller usually)
  // Here we penalize digging any structure to preserve the map.
  if (hex.maxLevel > 0) {
      const isMyHex = hex.ownerId === bot.id;
      const isAllyHex = allBots.some(b => b.id === hex.ownerId); 
      
      if (isMyHex || isAllyHex) {
           return { hex, score: -1000, reason: 'OWNED-INFRASTRUCTURE', action: 'AVOID' };
      } else {
           // Neutral/Enemy structures. Still avoid if just gathering material.
           score -= 300; 
           reasons.push('structure-avoid');
      }
  }

  // Distance penalty
  const dist = cubeDistance(bot, hex);
  score += Math.max(0, 15 - dist); 

  // Deep hexes are better quarries
  if (hex.currentLevel < 0) {
      score += 15 + Math.abs(hex.currentLevel) * 5;
      reasons.push('quarry');
  } else if (hex.currentLevel === 0) {
      score += 10; // Good surface mining
      reasons.push('surface');
  }
  
  // Accessibility
  const digCheck = checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid);
  if (digCheck.canGrow) {
    score += 20; // Actionable
    reasons.push('accessible');
  } else {
    score -= 50; // Not valid
  }
  
  return {
    hex,
    score,
    reason: reasons.join(',') || 'neutral',
    action: score > 15 ? 'DIG' : 'AVOID'
  };
};

export const findBestBuildTargets = (
  bot: Entity,
  grid: Record<string, Hex>,
  allBots: Entity[],
  maxResults: number = 5
): HexScore[] => {
  const allHexes = Object.values(grid);
  const scoredHexes = allHexes
    .map(h => scoreHexForBuilding(h, bot, allBots, grid))
    .filter(s => s.score > 5)
    .sort((a, b) => b.score - a.score);
  
  return scoredHexes.slice(0, maxResults);
};

export const findBestDigTargets = (
  bot: Entity,
  grid: Record<string, Hex>,
  allBots: Entity[],
  maxResults: number = 3,
  restrictedHexIds?: Set<string>
): HexScore[] => {
  const allHexes = Object.values(grid);
  const scoredHexes = allHexes
    .filter(h => !restrictedHexIds || !restrictedHexIds.has(h.id))
    .map(h => scoreHexForDigging(h, bot, allBots, grid))
    .filter(s => s.score > 5)
    .sort((a, b) => b.score - a.score);
  
  return scoredHexes.slice(0, maxResults);
};
