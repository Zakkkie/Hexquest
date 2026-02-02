
import { System } from './System';
import { GameState, GameEvent, EntityState, Entity, EntityType, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { getHexKey } from '../../services/hexUtils';
import { GameEventFactory } from '../events';
import { checkGrowthCondition, checkDigCondition } from '../../rules/growth';
import { getLevelConfig, GAME_CONFIG, DIFFICULTY_SETTINGS } from '../../rules/config';

export class GrowthSystem implements System {
  update(state: SessionState, index: WorldIndex, events: GameEvent[]): void {
    const entities = [state.player, ...state.bots];
    const newGrowingBotIds: string[] = [];

    // Resolve Queue Size from WinCondition if available, otherwise Fallback
    const queueSize = state.winCondition?.queueSize || 2;

    for (const entity of entities) {
      const isGrowing = this.processEntity(entity, state, index, events, queueSize);
      
      // Update tracking flags for state
      if (isGrowing) {
        if (entity.type === EntityType.PLAYER) {
           state.isPlayerGrowing = true;
        } else {
           newGrowingBotIds.push(entity.id);
        }
      } else {
        if (entity.type === EntityType.PLAYER) {
           state.isPlayerGrowing = false;
        }
      }
    }
    
    state.growingBotIds = newGrowingBotIds;
  }

  private processEntity(entity: Entity, state: SessionState, index: WorldIndex, events: GameEvent[], queueSize: number): boolean {
    const hasUpgradeCmd = entity.movementQueue.length > 0 && entity.movementQueue[0].upgrade;
    const queuedIntent = hasUpgradeCmd ? entity.movementQueue[0].intent : null;
    const key = getHexKey(entity.q, entity.r);
    const hex = state.grid[key];
    
    // Determine Intent
    let isUserIntentActive = entity.type === EntityType.PLAYER && state.isPlayerGrowing;
    let userIntentType = entity.type === EntityType.PLAYER ? state.playerGrowthIntent : null;
    
    const shouldBeGrowing = hasUpgradeCmd || (entity.type === EntityType.PLAYER && isUserIntentActive);

    // FSM: Transition out of GROWING if not actively growing
    if (!shouldBeGrowing) {
      if (entity.state === EntityState.GROWING) {
        entity.state = EntityState.IDLE;
      }
      return false;
    }

    // FSM: Transition to GROWING
    entity.state = EntityState.GROWING;
    
    // Safety check
    if (!hex) {
         if (hasUpgradeCmd) entity.movementQueue.shift();
         entity.state = EntityState.IDLE;
         return false;
    }

    // Determine Effective Intent
    let effectiveIntent: 'UPGRADE' | 'RECOVER' | 'DIG' = 'RECOVER';
    
    if (entity.type === EntityType.PLAYER) {
        effectiveIntent = userIntentType || 'RECOVER';
    } else {
        effectiveIntent = queuedIntent || 'UPGRADE';
    }

    // === BRANCH 1: RECOVERY ACTION (Timed) ===
    if (effectiveIntent === 'RECOVER') {
        if (entity.recoveredCurrentHex) {
             // Already done for this visit/turn
             if (entity.type === EntityType.PLAYER) {
                state.isPlayerGrowing = false;
             }
             if (hasUpgradeCmd) entity.movementQueue.shift();
             entity.state = EntityState.IDLE;
             return false;
        }

        const config = getLevelConfig(hex.maxLevel); 
        const needed = config.growthTime;

        if (hex.progress + 1 >= needed) {
            // FINISH RECOVERY
            // Fix: Ensure reward is never negative for deep pits (levels < -1)
            const rawReward = (hex.maxLevel || 0) * 5 + 5; 
            const coinReward = Math.max(0, rawReward);

            entity.moves += 1;
            entity.coins += coinReward;
            entity.totalCoinsEarned += coinReward;
            entity.recoveredCurrentHex = true; // Mark used

            const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
            const msg = `${prefix} Recovered 1 Move + ${coinReward} Credits`;
            
            state.messageLog.unshift({
                id: `rec-${Date.now()}-${entity.id}`,
                text: msg,
                type: 'SUCCESS',
                source: entity.id,
                timestamp: Date.now()
            });
            
            events.push(GameEventFactory.create('RECOVERY_USED', msg, entity.id));
            
            // Reset Progress and Stop (Copy-On-Write)
            state.grid = { ...state.grid, [key]: { ...hex, progress: 0 } };
            
            if (entity.type === EntityType.PLAYER) {
                 state.isPlayerGrowing = false;
            }
            if (hasUpgradeCmd) entity.movementQueue.shift();
            entity.state = EntityState.IDLE;
            return false;
        } else {
            // Tick Progress (Copy-On-Write)
            state.grid = { ...state.grid, [key]: { ...hex, progress: hex.progress + 1 } };
            return true;
        }
    }

    // === BRANCH 2: DIG ACTION (Timed) ===
    if (effectiveIntent === 'DIG') {
         const neighbors = index.getValidNeighbors(entity.q, entity.r).map(h => ({ q: h.q, r: h.r }));
         const condition = checkDigCondition(hex, entity, neighbors, state.grid);

         if (!condition.canGrow) {
             if (hasUpgradeCmd) entity.movementQueue.shift();
             entity.state = EntityState.IDLE;
             if (entity.type === EntityType.PLAYER) {
                 const msg = condition.reason || "Dig Failed";
                 state.messageLog.unshift({ id: `dig-fail-${Date.now()}`, text: msg, type: 'WARN', source: 'SYSTEM', timestamp: Date.now() });
                 events.push(GameEventFactory.create('ACTION_DENIED', msg, entity.id));
                 state.isPlayerGrowing = false;
             }
             return false;
         }

        // Logic for Dig Progress
        const needed = 30; // 3 seconds fixed
        if (hex.progress + 1 >= needed) {
             // Finish Dig: Lower Level
             const newLevel = hex.currentLevel - 1;
             
             // --- DIG REWARDS ---
             // Gain Material (If space permits, checked by condition)
             if (entity.storage < entity.maxStorage) {
                 entity.storage = entity.storage + 1;
             }
             
             // Gain Move
             entity.moves += 1;
             
             // NO COINS FOR DIGGING

             // Handle Durability Logic for new level
             let newDurability = hex.durability;
             if (newLevel === 1) {
                 newDurability = GAME_CONFIG.L1_HEX_MAX_DURABILITY; // Restore durability if rebuilt to L1
             } else if (newLevel <= 0 || newLevel >= 2) {
                 newDurability = undefined; // No durability for L0/Pits or L2+
             }

             // Update Hex (Copy-On-Write)
             state.grid = { 
                  ...state.grid, 
                  [key]: { 
                      ...hex, 
                      currentLevel: newLevel, 
                      maxLevel: newLevel, 
                      progress: 0,
                      structureType: undefined, // Clears structures
                      durability: newDurability
                  }
             };
             
             const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
             const msg = `${prefix} Excavated to L${newLevel} (+1 Mat, +1 Move)`;
             
             state.messageLog.unshift({ id: `dig-ok-${Date.now()}`, text: msg, type: 'SUCCESS', source: 'SYSTEM', timestamp: Date.now() });
             events.push(GameEventFactory.create('SECTOR_EXCAVATED', msg, entity.id));
             
             if (hasUpgradeCmd) entity.movementQueue.shift();
             entity.state = EntityState.IDLE;
             if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
             return false;
        } else {
             state.grid = { ...state.grid, [key]: { ...hex, progress: hex.progress + 1 } };
             return true;
        }
    }

    // === BRANCH 3: UPGRADE ACTION (Timed) ===
    if (effectiveIntent === 'UPGRADE') {
        const neighbors = index.getValidNeighbors(entity.q, entity.r).map(h => ({ q: h.q, r: h.r }));
        const occupied = index.getOccupiedHexesList();
        
        const condition = checkGrowthCondition(hex, entity, neighbors, state.grid, occupied, queueSize);
        
        // Validation Failed
        if (!condition.canGrow) {
          if (hasUpgradeCmd) entity.movementQueue.shift(); 
          entity.state = EntityState.IDLE;
          
          // Notify player
          if (entity.type === EntityType.PLAYER) {
             const msg = condition.reason || "Growth Conditions Not Met";
             state.messageLog.unshift({
                 id: `denied-${Date.now()}`,
                 text: `Growth Failed: ${msg}`,
                 type: 'WARN',
                 source: 'SYSTEM',
                 timestamp: Date.now()
             });
             
             events.push(GameEventFactory.create('ACTION_DENIED', msg, entity.id));
             state.isPlayerGrowing = false; 
          }
          return false;
        }

        // Calculate Growth
        const targetLevel = hex.currentLevel + 1;
        const config = getLevelConfig(targetLevel);
        const needed = config.growthTime;

        // Check Progress
        if (hex.progress + 1 >= needed) {
          // LEVEL UP
          let newMaxLevel = hex.maxLevel;
          let didMaxIncrease = false;
          let newOwnerId = hex.ownerId; 
          let newDurability = hex.durability;

          const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;

          if (targetLevel > hex.maxLevel) {
            newMaxLevel = targetLevel;
            didMaxIncrease = true;
            
            // RANK UP LOGIC:
            entity.playerLevel = Math.max(entity.playerLevel, targetLevel);
            
            // --- UPGRADE COSTS & REWARDS ---
            
            // COST: Spend 1 Material
            entity.storage = Math.max(0, entity.storage - 1);
            
            // REWARD: Gain Coins + Moves
            const income = Math.max(0, config.income);
            entity.coins += income;
            entity.totalCoinsEarned += income;
            entity.moves += 1;

            if (targetLevel === 1) {
                 newOwnerId = entity.id;
                 newDurability = GAME_CONFIG.L1_HEX_MAX_DURABILITY; 
                 
                 const msg = `${prefix} Sector L1 Built (-1 Mat, +Move, +Cr)`;
                 state.messageLog.unshift({
                    id: `acq-${Date.now()}-${entity.id}`,
                    text: msg,
                    type: 'SUCCESS',
                    source: entity.id,
                    timestamp: Date.now()
                 });
                 events.push(GameEventFactory.create('SECTOR_ACQUIRED', msg, entity.id));
            } else {
                 newDurability = undefined;
                 const msg = `${prefix} Upgraded to L${targetLevel} (-1 Mat, +Move, +Cr)`;
                 state.messageLog.unshift({
                    id: `lvl-${Date.now()}-${entity.id}`,
                    text: msg,
                    type: 'SUCCESS',
                    source: entity.id,
                    timestamp: Date.now()
                 });
                 events.push(GameEventFactory.create('LEVEL_UP', msg, entity.id));
            }
          }

          // Update Hex (Copy-On-Write)
          state.grid = { 
              ...state.grid, 
              [key]: { 
                  ...hex, 
                  currentLevel: targetLevel, 
                  maxLevel: newMaxLevel, 
                  progress: 0,
                  ownerId: newOwnerId,
                  durability: newDurability
              }
          };
          
          let shouldContinue = targetLevel < newMaxLevel;
          
          if (!shouldContinue && effectiveIntent === 'UPGRADE' && !didMaxIncrease) {
              const nextCheck = checkGrowthCondition(
                 state.grid[key],
                 entity, neighbors, state.grid, occupied, queueSize
              );
              if (nextCheck.canGrow) shouldContinue = true;
          }

          if (!shouldContinue) {
             if (hasUpgradeCmd) entity.movementQueue.shift();
             entity.state = EntityState.IDLE;
             return false;
          }
          
          return true;

        } else {
          // Tick Progress (Copy-On-Write)
          state.grid = { ...state.grid, [key]: { ...hex, progress: hex.progress + 1 } };
          return true;
        }
    }

    // Default return if no intent matched
    return false;
  }
}
