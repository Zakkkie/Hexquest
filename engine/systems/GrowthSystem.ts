
import { System } from './System';
import { GameState, GameEvent, EntityState, Entity, EntityType, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { getHexKey } from '../../services/hexUtils';
import { GameEventFactory } from '../events';
import { checkGrowthCondition } from '../../rules/growth';
import { getLevelConfig, GAME_CONFIG, DIFFICULTY_SETTINGS } from '../../rules/config';

export class GrowthSystem implements System {
  update(state: SessionState, index: WorldIndex, events: GameEvent[]): void {
    const entities = [state.player, ...state.bots];
    const newGrowingBotIds: string[] = [];

    // Resolve Queue Size from WinCondition if available, otherwise Fallback
    const queueSize = state.winCondition?.queueSize || 3;

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
    let effectiveIntent: 'UPGRADE' | 'RECOVER' = 'RECOVER';
    
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
            const coinReward = (hex.maxLevel || 0) * 5 + 5; // Base + Scale
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

    // === BRANCH 2: UPGRADE ACTION (Timed) ===

    const neighbors = index.getValidNeighbors(entity.q, entity.r).map(h => ({ q: h.q, r: h.r }));
    const occupied = index.getOccupiedHexesList();
    
    const condition = checkGrowthCondition(hex, entity, neighbors, state.grid, occupied, queueSize);
    
    // Validation Failed (Now covers Funds Check too)
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
        entity.playerLevel = Math.max(entity.playerLevel, targetLevel);
        
        if (targetLevel === 1) {
             // ACQUISITION (L0 -> L1)
             // Rule: GAIN an Upgrade Point (Fill queue)
             newOwnerId = entity.id;
             newDurability = GAME_CONFIG.L1_HEX_MAX_DURABILITY; 
             
             // Add to queue (points)
             const q = [...entity.recentUpgrades, hex.id];
             while (q.length > queueSize) q.shift(); // Enforce Max Points
             entity.recentUpgrades = q;
             
             const msg = `${prefix} Sector L1 Acquired (+1 Point)`;
             state.messageLog.unshift({
                id: `acq-${Date.now()}-${entity.id}`,
                text: msg,
                type: 'SUCCESS',
                source: entity.id,
                timestamp: Date.now()
             });
             
             events.push(GameEventFactory.create('SECTOR_ACQUIRED', msg, entity.id));
        } else {
             // UPGRADE (L1 -> L2+)
             // Rule: SPEND 1 Upgrade Point (Was: Spend All)
             newDurability = undefined;

             // Consume 1 point
             if (entity.recentUpgrades.length > 0) {
                 entity.recentUpgrades.shift();
             }

             const msg = `${prefix} Reached Rank L${targetLevel} (-1 Point)`;
             
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

      // Rewards
      entity.coins += config.income;
      entity.totalCoinsEarned += config.income;
      entity.moves += 1;
      
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
}
