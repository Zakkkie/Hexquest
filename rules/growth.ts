
import { Hex, Entity, HexCoord } from '../types';
import { getLevelConfig } from './config';
import { getHexKey } from '../services/hexUtils';

export type GrowthCheckResult = {
  canGrow: boolean;
  reason?: string;
  missingSupports?: HexCoord[]; // Coordinates of neighbors causing the block
};

// --- DIGGING LOGIC (DOWN) ---
export function checkDigCondition(
  hex: Hex, 
  entity: Entity, 
  neighbors: HexCoord[], 
  grid: Record<string, Hex>
): GrowthCheckResult {
  
  // IMPERATIVE: Monument Hexes are indestructible
  if (hex.structureType === 'MONUMENT') {
      return { canGrow: false, reason: "INDESTRUCTIBLE MONUMENT" };
  }

  // Use nullish coalescing to ensure 0 is treated as a valid number, not falsy
  const currentLevel = hex.currentLevel ?? 0;
  const targetLevel = currentLevel - 1;

  // STORAGE LIMIT CHECK
  // If storage is full, you cannot dig (as digging produces material)
  if (entity.storage >= entity.maxStorage) {
      return { canGrow: false, reason: "STORAGE FULL (MAX MATERIAL)" };
  }

  // 1. FIRST CUT EXCEPTION
  // Digging down to -1 (or any level >= -1) is always allowed without support.
  // This covers leveling hills (5->4) and starting a pit (0->-1).
  // The restriction is ONLY for going deeper than -1.
  if (targetLevel >= -1) {
      return { canGrow: true };
  }

  // 2. REVERSE STAIRCASE RULE (Deep Digging < -1)
  // To dig deeper (e.g. -1 -> -2), we need at least 2 neighbors
  // that are at the SAME depth or deeper to prevent creating a solitary deep shaft.
  // Example: To go to -2, need supports at -1 or lower.
  
  const deepNeighbors = neighbors.filter(n => {
      const neighborHex = grid[getHexKey(n.q, n.r)];
      // Void or missing hexes provide no support
      if (!neighborHex || neighborHex.structureType === 'VOID') return false;
      
      const neighborLevel = neighborHex.currentLevel ?? 0;
      // Strict Check: Neighbor must be at same depth (=).
      // Example: We are at -1. We want to go to -2.
      // Neighbor at 0?  (0 <= -1) -> False.
      // Neighbor at -1? (-1 <= -1) -> True.
      // Neighbor at -2? (-2 <= -1) -> True.
      return neighborLevel === currentLevel;
  });

  if (deepNeighbors.length < 2) {
      // Calculate missing supports for UI visualization
      const potentialSupports = neighbors.filter(n => {
          const h = grid[getHexKey(n.q, n.r)];
          if (!h || h.structureType === 'VOID') return false;
          // Neighbors that failed the condition (too high)
          const nLevel = h.currentLevel ?? 0;
          return nLevel > currentLevel;
      });

      const reqLvlStr = currentLevel >= 0 ? `L${currentLevel}` : `${currentLevel}`;

      return { 
          canGrow: false, 
          reason: `UNSTABLE! Dig 2 neighbors to ${reqLvlStr} or lower.`,
          missingSupports: potentialSupports
      };
  }

  return { canGrow: true };
}

// --- UPGRADE LOGIC (UP) ---
export function checkGrowthCondition(
  hex: Hex | null, 
  entity: Entity,
  neighbors: HexCoord[],
  grid: Record<string, Hex>,
  occupiedHexes: HexCoord[] = [],
  requiredQueueSize: number = 3
): GrowthCheckResult {
  if (!hex) return { canGrow: false, reason: 'Invalid Hex' };

  // IMPERATIVE: Monument Hexes cannot be modified by players
  if (hex.structureType === 'MONUMENT') {
      return { canGrow: false, reason: "ANCIENT STRUCTURE (IMMUTABLE)" };
  }

  const currentLevel = hex.currentLevel ?? 0;
  const targetLevel = currentLevel + 1;

  // RECOVERY RULE: If current level is below max level (damaged/decayed), allow free growth
  if (targetLevel <= hex.maxLevel) {
     return { canGrow: true };
  }

  // CONDITION 1: MATERIAL STORAGE
  // To upgrade (L1->L2+ OR L0->L1), you need Material in storage.
  if (entity.storage < 1) {
      return { canGrow: false, reason: "NEED MATERIAL (DIG)" };
  }

  // CONDITION 2: STAIRCASE SUPPORT RULE
  // To reach Level L+1, you need neighbors that are at least Level L.
  if (targetLevel > 1) {
    // 1. SATURATION CHECK ("The Valley Rule")
    // Exception: If surrounded by high walls (5 or more neighbors are STRICTLY HIGHER level), you can fill the valley.
    const highLevelNeighborsCount = neighbors.filter(n => {
       const h = grid[getHexKey(n.q, n.r)];
       return h && h.structureType !== 'VOID' && h.maxLevel > hex.maxLevel;
    }).length;

    const isValley = highLevelNeighborsCount >= 5;

    // Only apply strict support rules if NOT in a valley
    if (!isValley) {
        // Find existing supports
        // STRICT RULE: Support MUST be exactly the same level.
        // Neighbors that are Higher Level do NOT count as supports (unless Valley rule triggers).
        const supports = neighbors.filter(n => {
           const h = grid[getHexKey(n.q, n.r)];
           // Void cannot support structure
           if (!h || h.structureType === 'VOID') return false;
           return h.maxLevel === hex.maxLevel;
        });

        if (supports.length < 2) {
          // Identify missing supports for UI hints (neighbors that are not equal level)
          const potentialSupports = neighbors.filter(n => {
              const h = grid[getHexKey(n.q, n.r)];
              if (!h || h.structureType === 'VOID') return false;
              return h.maxLevel !== hex.maxLevel;
          });

          return {
            canGrow: false, 
            reason: `UNSTABLE! Need 2 neighbors at Level ${hex.maxLevel}.`,
            missingSupports: potentialSupports
          };
        }
    }
  }

  return { canGrow: true };
}

export default checkGrowthCondition;
