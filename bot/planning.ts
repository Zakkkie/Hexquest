
import { Hex, Entity, HexCoord } from '../types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';

export interface HexScore {
  hex: Hex;
  score: number;
  reason: string;
  action: 'BUILD' | 'DIG' | 'CLAIM' | 'AVOID';
  requiredSupport?: Hex; // If this hex is the target, but needs support, this is the sub-target
}

/**
 * Checks if a hex is critical for supporting a higher-level neighbor.
 * Used to prevent bots from digging their own foundations.
 */
const isLoadBearing = (hex: Hex, grid: Record<string, Hex>): boolean => {
    if (!hex) return false;
    const neighbors = getNeighbors(hex.q, hex.r);
    
    for (const n of neighbors) {
        const nHex = grid[getHexKey(n.q, n.r)];
        // If neighbor is higher than me, I might be a support
        if (nHex && nHex.structureType !== 'VOID' && nHex.maxLevel > hex.maxLevel) {
            // Check if removing me (lowering level) would break nHex
            // Logic: Does nHex have enough *other* supports?
            const nNeighbors = getNeighbors(nHex.q, nHex.r);
            let otherSupports = 0;
            for (const nn of nNeighbors) {
                // Don't count myself
                if (nn.q === hex.q && nn.r === hex.r) continue;
                
                const nnHex = grid[getHexKey(nn.q, nn.r)];
                if (nnHex && nnHex.structureType !== 'VOID' && nnHex.maxLevel >= nHex.maxLevel - 1) {
                    otherSupports++;
                }
            }
            // If it has < 2 supports without me, I am load bearing.
            if (otherSupports < 2) return true;
        }
    }
    return false;
};

/**
 * Identifies the best "Tower Project" for the bot.
 * 1. Finds the highest owned/reachable hex (The Crown).
 * 2. If Crown needs support, finds the best neighbor to upgrade.
 * 3. Returns the actionable target (either the Crown or the Support).
 */
export const findStrategicBuildTarget = (
    bot: Entity,
    grid: Record<string, Hex>,
    allBots: Entity[],
    obstacles: HexCoord[]
): HexScore | null => {
    
    // 1. Identify "Crowns" (Potential Towers)
    // Preference: My highest hex > High neutral hex > Any hex
    const candidates = Object.values(grid).filter(h => 
        h.structureType !== 'VOID' && 
        h.structureType !== 'MONUMENT' &&
        cubeDistance(bot, h) < 15 // Focus on local area
    );

    if (candidates.length === 0) return null;

    // Sort by: Level DESC, IsOwned DESC, Distance ASC
    candidates.sort((a, b) => {
        if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
        const aOwned = a.ownerId === bot.id ? 1 : 0;
        const bOwned = b.ownerId === bot.id ? 1 : 0;
        if (bOwned !== aOwned) return bOwned - aOwned;
        return cubeDistance(bot, a) - cubeDistance(bot, b);
    });

    // We only check the top few candidates to save CPU
    const topCandidates = candidates.slice(0, 3);

    for (const crown of topCandidates) {
        // Can we upgrade this crown directly?
        const neighbors = getNeighbors(crown.q, crown.r);
        const check = checkGrowthCondition(crown, bot, neighbors, grid, obstacles);

        if (check.canGrow) {
            return { hex: crown, score: 100, reason: `Expand Crown L${crown.maxLevel}`, action: 'BUILD' };
        }

        // If not, we need support. Find the BEST neighbor to upgrade.
        // Best support is:
        // 1. Level < Crown Level (needs upgrade to become support)
        // 2. Highest Level (closest to being a support)
        if (check.missingSupports && check.missingSupports.length > 0) {
            // Find the neighbors corresponding to missing supports
            // Note: checkGrowthCondition returns neighbors that FAILED the check (are not high enough)
            
            const supportCandidates: Hex[] = [];
            
            for (const coord of check.missingSupports) {
                const sHex = grid[getHexKey(coord.q, coord.r)];
                if (sHex && sHex.structureType !== 'VOID') {
                    supportCandidates.push(sHex);
                }
            }

            // Sort supports: Highest level first (easiest to fix)
            supportCandidates.sort((a, b) => b.maxLevel - a.maxLevel);

            if (supportCandidates.length > 0) {
                const bestSupport = supportCandidates[0];
                
                // RECURSIVE CHECK: Can we upgrade the support?
                // If yes, target it. If no, we might need to support the support (Pyramid building).
                // For simplicity/CPU, we just return the support. 
                // The bot will re-evaluate next tick if it can't build this support.
                return { 
                    hex: bestSupport, 
                    score: 80, 
                    reason: `Support for L${crown.maxLevel}`, 
                    action: 'BUILD' 
                };
            }
        }
    }

    // Fallback: Just build nearest valid low-level hex to start something
    const nearest = candidates.sort((a, b) => cubeDistance(bot, a) - cubeDistance(bot, b))[0];
    return { hex: nearest, score: 10, reason: 'Foundation', action: 'BUILD' };
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
  
  // Rule 1: Structural Integrity (Don't dig supports)
  if (isLoadBearing(hex, grid)) {
      return { hex, score: -9999, reason: 'LOAD-BEARING', action: 'AVOID' };
  }

  // Rule 2: Don't dig High Ground (Assets)
  // If I own it and it's > 0, don't dig (unless I'm desperate, handled by logic caller)
  if (hex.ownerId === bot.id && hex.maxLevel > 0) {
      return { hex, score: -500, reason: 'OWNED-ASSET', action: 'AVOID' };
  }

  // Rule 3: PRESERVE INFRASTRUCTURE (Monuments, Bases)
  if (hex.structureType === 'MONUMENT') return { hex, score: -9999, reason: 'MONUMENT', action: 'AVOID' };

  // Distance penalty (prefer closer)
  const dist = cubeDistance(bot, hex);
  score += Math.max(0, 20 - dist); 

  // Deep hexes are better quarries (don't ruin the surface view)
  if (hex.currentLevel < 0) {
      score += 30 + Math.abs(hex.currentLevel) * 5;
      reasons.push('deep-quarry');
  } else if (hex.currentLevel === 0) {
      score += 10; // Surface mining
      reasons.push('surface');
  } else {
      score -= 20; // Digging a hill (inefficient)
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
    .filter(s => s.score > 0) // Only positive scores
    .sort((a, b) => b.score - a.score);
  
  return scoredHexes.slice(0, maxResults);
};
