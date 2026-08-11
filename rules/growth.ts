
import { Hex, Entity, HexCoord } from '../types';
import { GAME_CONFIG, getLevelConfig } from './config';
import { getHexKey } from '../services/hexUtils';
import { useGameStore } from '../store';

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
  grid: Record<string, Hex>,
  isDefenseModeParam?: boolean
): GrowthCheckResult {
  
  const isBot = _entity.id?.startsWith('bot') || _entity.id?.startsWith('saboteur') || (_entity as any).type === 'BOT';
  const isSiegeBot = isBot && !!(_entity as any).memory?.botRole?.startsWith('SIEGE_');
  const isDefenseMode = isDefenseModeParam !== undefined ? (isDefenseModeParam || isSiegeBot) : (!!useGameStore.getState().session?.defense?.isDefenseMode || isSiegeBot);
  if (isBot && isDefenseMode) {
      if (hex.structureType === 'VOID') {
          return { canGrow: false, reason: "CANNOT DIG VOID" };
      }
      return { canGrow: true };
  }

  // IMPERATIVE: Monument Hexes are indestructible
  if (hex.structureType === 'MONUMENT') {
      return { canGrow: false, reason: "INDESTRUCTIBLE AREA" };
  }
  
  if (hex.isIndestructible) {
      if (hex.isCore && (_entity.id?.startsWith('bot') || _entity.id?.startsWith('saboteur'))) {
          // Bots can dig the core to damage it
          return { canGrow: true };
      }
      return { canGrow: false, reason: "INDESTRUCTIBLE AREA" };
  }

  // Use nullish coalescing to ensure 0 is treated as a valid number, not falsy
  const currentLevel = hex.currentLevel ?? 0;
  const targetLevel = currentLevel - 1;

  const neighborHexes = neighbors
      .map(n => grid[getHexKey(n.q, n.r)])
      .filter((h): h is Hex => !!(h && h.structureType !== 'VOID' && h.isPassable !== false));

  // 1. HIGH GROUND RULE (User Request)
  // "Dig up to not reaching 1 level to the level of the nearest hex"
  // Correction: Allow digging down TO the level of neighbors, but not BELOW them on high ground (L1+).
  if (currentLevel > 1) {
      if (neighborHexes.length > 0) {
          const minNeighborLevel = Math.min(...neighborHexes.map(h => h.currentLevel));

          // Exception: A player can always dig down if the target level is >= their Rank (Player Level).
          if (targetLevel < minNeighborLevel && targetLevel !== _entity.playerLevel) {
              return {
                  canGrow: false,
                  reason: `Нельзя копать ниже соседей (L${minNeighborLevel}) (Gradient Lock)`,
                  missingSupports: neighborHexes.filter(h => h.currentLevel > targetLevel + 1).map(h => ({q: h.q, r: h.r}))
              };
          }
      }
  }

  // 2. PIT ESCAPE CONSTRAINT (User Request)
  // Ensure that if we dig down to targetLevel, there is at least one non-void passable neighbor
  // we can safely transition to under the staircase rule (height difference <= 1) and of appropriate rank.
  const hasEscapeHex = neighborHexes.some(h => {
      const hLevel = h.currentLevel ?? 0;
      const heightDiff = Math.abs(targetLevel - hLevel);
      
      // If we are at or above neighbors, we aren't trapped in a hole, 
      // even if we can't jump to them yet (diff > 1), because we can keep digging down.
      if (targetLevel >= hLevel) return true;

      return heightDiff <= 1;
  });

  if (neighborHexes.length > 0 && !hasEscapeHex) {
      return {
          canGrow: false,
          reason: `TRAPPED! No escape route if you dig here. Вы застрянете в яме (все соседи выше и нет выхода).`
      };
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
          // Reverse Staircase Rule: Neighbors must be strictly equal to CurrentLevel
          return neighborLevel === currentLevel;
      });

      if (deepNeighbors.length < 2) {
          return { 
              canGrow: false, 
              reason: `Нет опоры: нужны 2 соседа строго на уровне L${currentLevel} (UNSTABLE)`,
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
  _requiredQueueSize: number = 3,
  isDefenseModeParam?: boolean
): GrowthCheckResult {
  if (!hex) return { canGrow: false, reason: 'Invalid Hex' };

  if (hex.structureType === 'MONUMENT' || hex.isIndestructible) {
      return { canGrow: false, reason: "ANCIENT STRUCTURE (IMMUTABLE)" };
  }

  const isBot = entity.id?.startsWith('bot') || entity.id?.startsWith('saboteur') || (entity as any).type === 'BOT';
  const isSiegeBot = isBot && !!(entity as any).memory?.botRole?.startsWith('SIEGE_');
  const isDefenseMode = isDefenseModeParam !== undefined ? (isDefenseModeParam || isSiegeBot) : (!!useGameStore.getState().session?.defense?.isDefenseMode || isSiegeBot);
  if (isBot && isDefenseMode) {
      return { canGrow: true };
  }

  const currentLevel = hex.currentLevel ?? 0;
  const targetLevel = currentLevel + 1;

  const activeLevelId = useGameStore.getState().session?.activeLevelConfig?.id;
  if (activeLevelId === '1.6' && targetLevel > 2) {
      return { 
          canGrow: false, 
          reason: useGameStore.getState().language === 'RU' 
              ? "ЗАПРЕЩЕНО: На Sim 1.6 нельзя строить выше уровня L2!" 
              : "BANNED: Building above L2 is prohibited in Sim 1.6!" 
      };
  }

  // 1. MATERIAL CHECK (Still costs material unless free status active)
  if (entity.storage < 1) {
      const hasFreeBuild = entity.activeStatuses?.some(s => s.type === 'STATUS_FREE_BUILD' || s.label === 'Free Build') || (isBot && isDefenseMode);
      if (!hasFreeBuild) {
          return { canGrow: false, reason: "NEED MATERIAL (DIG)" };
      }
  }

  // 2. RANK REQUIREMENT
  const config = getLevelConfig(targetLevel);
  if (entity.playerLevel < config.reqRank) {
      return { 
        canGrow: false, 
        reason: `RANK TOO LOW (Required: ${config.reqRank}, Current: ${entity.playerLevel})` 
      };
  }

  // 3. LEVEL 4 STRICT LIMIT CHECK
  if (targetLevel === 4) {
    const l4Count = Object.values(grid).filter(h => h && h.structureType !== 'VOID' && h.currentLevel === 4).length;
    if (l4Count >= 4 && currentLevel !== 4) {
      return {
        canGrow: false,
        reason: useGameStore.getState().language === 'RU'
          ? "ЛИМИТ L4: Достигнут максимум из 4 гексов Уровня 4!"
          : "MAX L4 LIMIT: Maximum 4 Level-4 hexes allowed!"
      };
    }
  }

  // 4. STABILITY CHECK (Strict Equal Level Rule for non-L0 with ZERO exceptions)
  if (currentLevel !== 0) {
    const supportNeighbors = neighbors.filter(n => {
       const h = grid[getHexKey(n.q, n.r)];
       return h && h.structureType !== 'VOID' && (h.currentLevel ?? 0) >= currentLevel;
     });

    if (supportNeighbors.length < 2) {
      return {
        canGrow: false, 
        reason: useGameStore.getState().language === 'RU'
          ? `UNSTABLE: Нет опоры: требуется минимум 2 смежные плиты уровня L${currentLevel} или выше (Правило 2 Опор).`
          : `UNSTABLE: Level L${targetLevel} requires at least 2 adjacent support tiles of Level L${currentLevel} or higher (2-Support Rule).`,
      };
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
  if (hex.maxLevel < GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
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
  const isDefense = session?.defense?.isDefenseMode;
  if (hex.maxLevel < GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
    // For L0-L3: Just mark time, entity flag handles the "once per visit" rule, and keep level unchanged
    return { 
        lastRecoveryUseTime: currentTime,
        currentLevel: hex.currentLevel
    };
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

    if (!isDefense) {
        charges = Math.max(0, charges - 1);
    }
    
    const updates: Partial<Hex> = {
        lastRecoveryUseTime: currentTime,
        recoveryCharges: isDefense ? maxCharges : charges,
        currentLevel: hex.currentLevel
    };
    
    // If depleted, start cooldown
    if (charges === 0 && !isDefense) {
      updates.cooldownEndTime = currentTime + cooldownMs;
    } else {
      // Ensure cooldown is cleared if we have charges (e.g. if we just reset from 0->3->2)
      updates.cooldownEndTime = undefined;
    }
    
    return updates;
  }
};

export default checkGrowthCondition;
