
import { Hex, Entity, HexCoord } from '../types';
import { GAME_CONFIG, getLevelConfig } from './config';
import { getHexKey } from '../services/hexUtils';

type GrowthCheckResult = {
  canGrow: boolean;
  reason?: string;
  missingSupports?: HexCoord[]; // Coordinates of neighbors causing the block
};

// --- DIGGING LOGIC (DOWN) ---
export function checkDigCondition(
  hex: Hex,
  _entity: Entity,
  neighbors: HexCoord[],
  grid: Record<string, Hex>
): GrowthCheckResult {
  
  // IMPERATIVE: Monument Hexes are indestructible
  if (hex.structureType === 'MONUMENT' || hex.isIndestructible) {
      return { canGrow: false, reason: "INDESTRUCTIBLE AREA" };
  }

  // Use nullish coalescing to ensure 0 is treated as a valid number, not falsy
  const currentLevel = hex.currentLevel ?? 0;
  const targetLevel = currentLevel - 1;

  // 1. PIT ESCAPE CONSTRAINT (User Request)
  // Ensure that if we dig down to targetLevel, there is at least one non-void passable neighbor
  // we can safely transition to under the staircase rule (height difference <= 1) and of appropriate rank.
  const neighborHexes = neighbors
      .map(n => grid[getHexKey(n.q, n.r)])
      .filter((h): h is Hex => !!(h && h.structureType !== 'VOID' && h.isPassable !== false));
  
  const hasEscapeHex = neighborHexes.some(h => {
      const hLevel = h.currentLevel ?? 0;
      const heightDiff = Math.abs(targetLevel - hLevel);
      const hasRank = h.maxLevel <= _entity.playerLevel;
      
      // If we are at or above neighbors, we aren't trapped in a hole, 
      // even if we can't jump to them yet (diff > 1), because we can keep digging down.
      if (targetLevel >= hLevel) return true;

      return heightDiff <= 1 && hasRank;
  });

  if (neighborHexes.length > 0 && !hasEscapeHex) {
      return {
          canGrow: false,
          reason: `TRAPPED! No escape route if you dig here. Вы застрянете в яме (все соседи выше и нет выхода).`
      };
  }

  // 2. HIGH GROUND RULE (User Request)
  // "Dig up to not reaching 1 level to the level of the nearest hex"
  // Correction: Allow digging down TO the level of neighbors, but not BELOW them on high ground (L1+).
  if (currentLevel > 1) {
      if (neighborHexes.length > 0) {
          const minNeighborLevel = Math.min(...neighborHexes.map(h => h.currentLevel));

          // Exception: A player can always dig down if the target level is >= their Rank (Player Level).
          if (targetLevel < minNeighborLevel && targetLevel < _entity.playerLevel) {
              return {
                  canGrow: false,
                  reason: `Gradient Lock! You cannot dig below the surrounding terrain (L${minNeighborLevel}) or below your engineering rank (Rank ${_entity.playerLevel}).`,
                  missingSupports: neighborHexes.filter(h => h.currentLevel > targetLevel + 1).map(h => ({q: h.q, r: h.r}))
              };
          }
      }
  }

  // 3. FIRST CUT EXCEPTION (If not blocked by High Ground Rule above)
  if (targetLevel >= -1) {
      return { canGrow: true };
  }

  // 4. REVERSE STAIRCASE RULE (Deep Digging currentLevel <= -1)
  if (currentLevel <= -1) {
      const deepNeighbors = neighbors.filter(n => {
          const neighborHex = grid[getHexKey(n.q, n.r)];
          if (!neighborHex || neighborHex.structureType === 'VOID') return false;
          
          const neighborLevel = neighborHex.currentLevel ?? 0;
          // Strict Rule: Neighbors must have EQUAL level to current level
          return neighborLevel === currentLevel;
      });

      if (deepNeighbors.length < 2) {
          return { 
              canGrow: false, 
              reason: `UNSTABLE! Need 2 neighbors at Level ${currentLevel} to dig deeper.`,
          };
      }
  }

  return { canGrow: true };
}

// --- UPGRADE LOGIC (UP) ---
export function checkGrowthCondition(
  hex: Hex | null, 
  entity: Entity,
  neighbors: HexCoord[],
  grid: Record<string, Hex>,
  _occupiedHexes: HexCoord[] = [],
  _requiredQueueSize: number = 3
): GrowthCheckResult {
  if (!hex) return { canGrow: false, reason: 'Invalid Hex' };

  if (hex.structureType === 'MONUMENT' || hex.isIndestructible) {
      return { canGrow: false, reason: "ANCIENT STRUCTURE (IMMUTABLE)" };
  }

  const currentLevel = hex.currentLevel ?? 0;
  const targetLevel = currentLevel + 1;

  // 1. MATERIAL CHECK (Still costs material unless free status active)
  if (entity.storage < 1) {
      return { canGrow: false, reason: "NEED MATERIAL (DIG)" };
  }

  // 2. RANK REQUIREMENT
  const config = getLevelConfig(targetLevel);
  if (entity.playerLevel < config.reqRank) {
      return { 
        canGrow: false, 
        reason: `RANK TOO LOW (Required: ${config.reqRank}, Current: ${entity.playerLevel})` 
      };
  }

  // 4. STABILITY CHECK (Strict Equal Level Rule for L1+)
  if (currentLevel >= 1) {
    // Check if there are at least 5 neighbors strictly higher than the current hex (Depression rule)
    const higherNeighbors = neighbors.filter(n => {
       const h = grid[getHexKey(n.q, n.r)];
       return h && h.structureType !== 'VOID' && (h.currentLevel ?? 0) > currentLevel;
    });

    const isDepressionRule = higherNeighbors.length >= 5;

    if (!isDepressionRule) {
      const supportNeighbors = neighbors.filter(n => {
         const h = grid[getHexKey(n.q, n.r)];
         return h && h.structureType !== 'VOID' && (h.currentLevel ?? 0) === currentLevel;
       });

      if (supportNeighbors.length < 2) {
        return {
          canGrow: false, 
          reason: `UNSTABLE! Need 2 neighbors at Level ${currentLevel} to build higher, or 5 higher neighbors (depression rule).`,
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

export const checkRecoveryCooldown = (hex: Hex, currentTime: number, session?: import('../types.ts').SessionState): { ready: boolean; remaining: number } => {
  // For L0-L3: No specific hex cooldown, handled by Entity's `recoveredCurrentHex` flag in System
  if (hex.currentLevel < GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
    return { ready: true, remaining: 0 };
  }
  
  const capUpgrade = session?.campaignUpgrades?.reserveCapacitor || 0;
  const maxCharges = GAME_CONFIG.MAX_RECOVERY_POINTS + capUpgrade;

  // For L4+: Check charges and cooldown
  const charges = hex.recoveryCharges ?? maxCharges; // Default 3
  
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
export const applyRecovery = (hex: Hex, currentTime: number, session?: import('../types.ts').SessionState): Partial<Hex> => {
  if (hex.currentLevel < GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
    // For L0-L3: Just mark time, entity flag handles the "once per visit" rule
    return { lastRecoveryUseTime: currentTime };
  } else {
    const capUpgrade = session?.campaignUpgrades?.reserveCapacitor || 0;
    const maxCharges = GAME_CONFIG.MAX_RECOVERY_POINTS + capUpgrade;
    const turboRecharge = session?.campaignUpgrades?.turboRecharge || 0;
    const cooldownMs = GAME_CONFIG.RECOVERY_COOLDOWN_MS - (turboRecharge * 1000);

    // For L4+
    let charges = hex.recoveryCharges ?? maxCharges;
    
    // SAFETY: If cooldown expired but charges were 0, we treat it as fully charged before decrementing
    // This handles race conditions where the maintenance tick hasn't run yet.
    if (charges === 0 && hex.cooldownEndTime && currentTime >= hex.cooldownEndTime) {
        charges = maxCharges;
    }

    charges = Math.max(0, charges - 1);
    
    const updates: Partial<Hex> = {
        lastRecoveryUseTime: currentTime,
        recoveryCharges: charges
    };
    
    // If depleted, start cooldown
    if (charges === 0) {
      updates.cooldownEndTime = currentTime + cooldownMs;
    } else {
      // Ensure cooldown is cleared if we have charges (e.g. if we just reset from 0->3->2)
      updates.cooldownEndTime = undefined;
    }
    
    return updates;
  }
};

export default checkGrowthCondition;
