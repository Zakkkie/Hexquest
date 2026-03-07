
import { Hex, Entity, HexCoord } from '../types';
import { getLevelConfig, GAME_CONFIG } from './config';
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

  // 1. HIGH GROUND RULE (User Request)
  // "Dig up to not reaching 1 level to the level of the nearest hex"
  // Interpretation: You can dig down, but the new level must strictly be higher than the lowest neighbor.
  // Example: Neighbors L0. Current L2. Dig to L1? (1 > 0) OK.
  // Example: Neighbors L0. Current L1. Dig to L0? (0 > 0) False. Blocked.
  if (currentLevel > 0) {
      const neighborHexes = neighbors
          .map(n => grid[getHexKey(n.q, n.r)])
          .filter(h => h && h.structureType !== 'VOID');
      
      if (neighborHexes.length > 0) {
          const minNeighborLevel = Math.min(...neighborHexes.map(h => h.currentLevel));

          if (targetLevel <= minNeighborLevel) {
              return {
                  canGrow: false,
                  reason: `Gradient Lock! Must stay above L${minNeighborLevel}.`,
                  missingSupports: neighborHexes.filter(h => h.currentLevel <= targetLevel).map(h => ({q: h.q, r: h.r}))
              };
          }
      }
  }

  // 2. FIRST CUT EXCEPTION (If not blocked by High Ground Rule above)
  if (targetLevel >= -1) {
      return { canGrow: true };
  }

  // 3. REVERSE STAIRCASE RULE (Deep Digging < -1)
  const deepNeighbors = neighbors.filter(n => {
      const neighborHex = grid[getHexKey(n.q, n.r)];
      // Void or missing hexes provide no support
      if (!neighborHex || neighborHex.structureType === 'VOID') return false;
      
      const neighborLevel = neighborHex.currentLevel ?? 0;
      // Strict Check: Neighbor must be at same depth (=).
      return neighborLevel === currentLevel;
  });

  if (deepNeighbors.length < 2) {
      const potentialSupports = neighbors.filter(n => {
          const h = grid[getHexKey(n.q, n.r)];
          if (!h || h.structureType === 'VOID') return false;
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

  if (hex.structureType === 'MONUMENT') {
      return { canGrow: false, reason: "ANCIENT STRUCTURE (IMMUTABLE)" };
  }

  const currentLevel = hex.currentLevel ?? 0;
  const targetLevel = currentLevel + 1;

  if (targetLevel <= hex.maxLevel) {
     return { canGrow: true };
  }

  if (entity.storage < 1) {
      return { canGrow: false, reason: "NEED MATERIAL (DIG)" };
  }

  if (targetLevel > 1) {
    const highLevelNeighborsCount = neighbors.filter(n => {
       const h = grid[getHexKey(n.q, n.r)];
       return h && h.structureType !== 'VOID' && h.maxLevel > hex.maxLevel;
    }).length;

    const isValley = highLevelNeighborsCount >= 5;

    if (!isValley) {
        const supports = neighbors.filter(n => {
           const h = grid[getHexKey(n.q, n.r)];
           if (!h || h.structureType === 'VOID') return false;
           return h.maxLevel === hex.maxLevel;
        });

        if (supports.length < 2) {
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

// --- RECOVERY SYSTEM V2 ---

export const getRecoveryReward = (hex: Hex): { moves: number; credits: number } => {
  // Base Reward: 10 Moves + 50 Credits (L0)
  // Scaling: +5 Moves/lvl, +25 Credits/lvl
  const baseLevel = Math.max(0, hex.currentLevel);
  const moves = 1;
  const credits = 5 * baseLevel;
  
  // Note: High levels (4+) use this formula too, but have 3 charges.
  return { moves, credits };
};

export const checkRecoveryCooldown = (hex: Hex, currentTime: number): { ready: boolean; remaining: number } => {
  // For L0-L3: No specific hex cooldown, handled by Entity's `recoveredCurrentHex` flag in System
  if (hex.currentLevel < GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
    return { ready: true, remaining: 0 };
  }
  
  // For L4+: Check charges and cooldown
  const charges = hex.recoveryCharges ?? GAME_CONFIG.MAX_RECOVERY_POINTS; // Default 3
  
  // If we have charges, we are ready
  if (charges > 0) return { ready: true, remaining: 0 };
  
  // If 0 charges, check cooldown
  const cooldownEnd = hex.cooldownEndTime ?? 0;
  if (currentTime < cooldownEnd) {
    return { ready: false, remaining: cooldownEnd - currentTime };
  }
  
  // Cooldown expired, logically ready (will need state update to refill charges)
  return { ready: true, remaining: 0 };
};

/**
 * Updates hex state after a successful recovery action.
 * Mutates the hex object (or returns props to update).
 */
export const applyRecovery = (hex: Hex, currentTime: number): Partial<Hex> => {
  if (hex.currentLevel < GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
    // For L0-L3: Just mark time, entity flag handles the "once per visit" rule
    return { lastRecoveryUseTime: currentTime };
  } else {
    // For L4+
    let charges = hex.recoveryCharges ?? GAME_CONFIG.MAX_RECOVERY_POINTS;
    
    // SAFETY: If cooldown expired but charges were 0, we treat it as fully charged before decrementing
    // This handles race conditions where the maintenance tick hasn't run yet.
    if (charges === 0 && hex.cooldownEndTime && currentTime >= hex.cooldownEndTime) {
        charges = GAME_CONFIG.MAX_RECOVERY_POINTS;
    }

    charges = Math.max(0, charges - 1);
    
    const updates: Partial<Hex> = {
        lastRecoveryUseTime: currentTime,
        recoveryCharges: charges
    };
    
    // If depleted, start cooldown
    if (charges === 0) {
      updates.cooldownEndTime = currentTime + GAME_CONFIG.RECOVERY_COOLDOWN_MS;
    } else {
      // Ensure cooldown is cleared if we have charges (e.g. if we just reset from 0->3->2)
      updates.cooldownEndTime = undefined;
    }
    
    return updates;
  }
};

export default checkGrowthCondition;
