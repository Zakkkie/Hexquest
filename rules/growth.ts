
import { Hex, Entity, HexCoord } from '../types';
import { getLevelConfig } from './config';
import { getHexKey } from '../services/hexUtils';

export type GrowthCheckResult = {
  canGrow: boolean;
  reason?: string;
  missingSupports?: HexCoord[]; // Coordinates of neighbors causing the block
};

export function checkGrowthCondition(
  hex: Hex | null, 
  entity: Entity,
  neighbors: HexCoord[],
  grid: Record<string, Hex>,
  occupiedHexes: HexCoord[] = [],
  requiredQueueSize: number = 3
): GrowthCheckResult {
  if (!hex) return { canGrow: false, reason: 'Invalid Hex' };

  const currentLevel = Number(hex.currentLevel || 0);
  const targetLevel = currentLevel + 1;

  if (hex.maxLevel >= 99) {
    return { canGrow: false, reason: 'MAX LEVEL' };
  }

  // RECOVERY RULE: If current level is below max level (damaged/decayed), allow free growth
  if (targetLevel <= hex.maxLevel) {
     return { canGrow: true };
  }

  // CRITICAL: ACQUISITION RULE (Level 0 -> 1)
  // Always allowed. Does not check supports.
  if (targetLevel === 1) {
      return { canGrow: true };
  }

  // CONDITION: STAIRCASE SUPPORT RULE
  // To reach Level L+1, you need neighbors that are at least Level L.
  if (targetLevel > 1) {
    // 1. SATURATION CHECK ("The Valley Rule")
    // Exception: If surrounded by high walls (5 or more neighbors are STRICTLY HIGHER level), you can fill the valley.
    const highLevelNeighborsCount = neighbors.filter(n => {
       const neighborHex = grid[getHexKey(n.q, n.r)];
       return neighborHex && neighborHex.maxLevel > hex.maxLevel;
    }).length;

    const isValley = highLevelNeighborsCount >= 5;

    // Only apply strict support rules if NOT in a valley
    if (!isValley) {
        // Find existing supports
        // STRICT RULE: Support MUST be exactly the same level.
        // Neighbors that are Higher Level do NOT count as supports (unless Valley rule triggers).
        const supports = neighbors.filter(n => {
           const neighborHex = grid[getHexKey(n.q, n.r)];
           return neighborHex && neighborHex.maxLevel === hex.maxLevel;
        });

        if (supports.length < 2) {
          // Identify missing supports for UI hints (neighbors that are not equal level)
          const potentialSupports = neighbors.filter(n => {
              const h = grid[getHexKey(n.q, n.r)];
              return h && h.maxLevel !== hex.maxLevel;
          });

          return {
            canGrow: false, 
            reason: `NEED 2 SUPPORTS (EXACTLY L${hex.maxLevel})`,
            missingSupports: potentialSupports
          };
        }
    }
  }

  return { canGrow: true };
}

export default checkGrowthCondition;
