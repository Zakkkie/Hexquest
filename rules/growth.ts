
import { Hex, Entity, HexCoord } from '../types';

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
     if (hex.ownerId && hex.ownerId !== entity.id && targetLevel > 1) {
        return { canGrow: false, reason: 'HOSTILE SECTOR' };
     }
     return { canGrow: true };
  }

  // CRITICAL: ACQUISITION RULE (Level 0 -> 1)
  if (targetLevel === 1) {
      return { canGrow: true };
  }

  // CYCLE LOCK RULE
  if (targetLevel > 1) {
    if (entity.recentUpgrades.length < requiredQueueSize) {
      return { 
        canGrow: false, 
        reason: `CYCLE INCOMPLETE (${entity.recentUpgrades.length}/${requiredQueueSize})` 
      };
    }
  }

  // RANK LIMIT RULE
  if (entity.playerLevel < targetLevel - 1) {
    return { 
      canGrow: false, 
      reason: `RANK TOO LOW (NEED L${targetLevel - 1})` 
    };
  }

  // STAIRCASE SUPPORT RULE
  if (targetLevel > 1) {
    // 1. SATURATION CHECK ("The Valley Rule")
    const highLevelNeighborsCount = neighbors.filter(n => {
       const neighborHex = grid[`${n.q},${n.r}`];
       return neighborHex && neighborHex.maxLevel > hex.maxLevel;
    }).length;

    const isValley = highLevelNeighborsCount >= 5;

    // Only apply strict support rules if NOT in a valley
    if (!isValley) {
        // Find existing supports
        const supports = neighbors.filter(n => {
           const neighborHex = grid[`${n.q},${n.r}`];
           return neighborHex && neighborHex.maxLevel === hex.maxLevel;
        });

        if (supports.length < 2) {
          // Identify missing supports (neighbors that are too low level)
          // We prioritize owned neighbors or neutral ones that make sense to upgrade
          const potentialSupports = neighbors.filter(n => {
              const h = grid[`${n.q},${n.r}`];
              // It's a missing support if it exists and is lower level
              return h && h.maxLevel < hex.maxLevel;
          });

          return {
            canGrow: false, 
            reason: `NEED 2 SUPPORTS (L${hex.maxLevel})`,
            missingSupports: potentialSupports
          };
        }

        const occupiedSupportCount = supports.filter(s => 
            occupiedHexes.some(o => o.q === s.q && o.r === s.r)
        ).length;

        if (occupiedSupportCount > 1) {
            return {
                canGrow: false,
                reason: "SUPPORTS BLOCKED"
            };
        }
    }
  }

  return { canGrow: true };
}

export default checkGrowthCondition;
