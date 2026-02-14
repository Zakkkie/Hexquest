
import { System } from './System';
import { GameState, GameEvent, EntityState, Entity, EntityType, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { getHexKey } from '../../services/hexUtils';
import { GameEventFactory } from '../events';
import { checkGrowthCondition, checkDigCondition } from '../../rules/growth';
import { getLevelConfig, GAME_CONFIG, DIFFICULTY_SETTINGS, ENTROPY_CONFIG } from '../../rules/config';
import { rollForLoot, LOOT_COLORS } from '../../rules/loot';

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
        const isHighLevel = hex.maxLevel >= GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD;
        
        // --- 1A: HIGH LEVEL LOGIC (Cooldown + Charges) ---
        if (isHighLevel) {
            const now = Date.now();
            const lastUsed = hex.lastRecoveryTime || 0;
            const cooldown = GAME_CONFIG.RECOVERY_COOLDOWN_MS;
            const remaining = Math.max(0, cooldown - (now - lastUsed));
            
            // Check Cooldown
            if (remaining > 0) {
                // Not ready, just wait (or stop if player)
                // We return true to keep "GROWING" state active but visual progress might stall
                // Actually, if on cooldown, we should probably stop intent to tell user "Wait"
                if (entity.type === EntityType.PLAYER) {
                    state.isPlayerGrowing = false;
                    const seconds = Math.ceil(remaining / 1000);
                    state.messageLog.unshift({
                        id: `cd-${now}`,
                        text: `Sector Recharging: ${seconds}s left`,
                        type: 'WARN',
                        source: 'SYSTEM',
                        timestamp: now
                    });
                }
                entity.state = EntityState.IDLE;
                if (hasUpgradeCmd) entity.movementQueue.shift();
                return false;
            }

            // Check Charges
            // Default to max points if undefined (e.g. pre-existing map)
            const currentPoints = hex.recoveryPoints ?? GAME_CONFIG.MAX_RECOVERY_POINTS;
            
            // Should theoretically not happen if cooldown logic works, but safety check
            if (currentPoints <= 0) {
                 // Already depleted? Should have downgraded.
                 // This block handles edge case where it sits at 0.
            }

            // Progress Logic (Same 3s cast time)
            const needed = getLevelConfig(hex.maxLevel).growthTime;
            
            if (hex.progress + 1 >= needed) {
                // EXECUTE HIGH LEVEL RECOVERY
                const rawReward = (hex.maxLevel || 0) * 5 + 5; 
                const coinReward = Math.max(0, rawReward);

                entity.moves += 1;
                entity.coins += coinReward;
                entity.totalCoinsEarned += coinReward;
                
                // Deduct Charge & Set Cooldown
                const nextPoints = currentPoints - 1;
                const newUpdates: Partial<typeof hex> = {
                    progress: 0,
                    recoveryPoints: nextPoints,
                    lastRecoveryTime: now
                };

                const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
                
                if (nextPoints <= 0) {
                    // --- COLLAPSE CONDITION ---
                    newUpdates.maxLevel = hex.maxLevel - 1;
                    newUpdates.currentLevel = hex.currentLevel - 1;
                    newUpdates.recoveryPoints = GAME_CONFIG.MAX_RECOVERY_POINTS; // Reset for new lower level? Or keep 0? Prompt says "loses level". Usually reset.
                    // Resetting points for the NEW (lower) level implies it's fresh.
                    // If new level < 4, points are irrelevant anyway.
                    
                    const msg = `${prefix} Depleted Sector! Level -1.`;
                    state.messageLog.unshift({
                        id: `degrade-${now}-${entity.id}`,
                        text: msg,
                        type: 'WARN',
                        source: entity.id,
                        timestamp: now
                    });
                    events.push(GameEventFactory.create('HEX_DOWNGRADE', msg, entity.id));
                    events.push(GameEventFactory.create('HEX_COLLAPSE', undefined, entity.id)); // Visual Shake
                } else {
                    const msg = `${prefix} Recovered (Uses: ${nextPoints}/${GAME_CONFIG.MAX_RECOVERY_POINTS})`;
                    state.messageLog.unshift({
                        id: `rec-high-${now}-${entity.id}`,
                        text: msg,
                        type: 'SUCCESS',
                        source: entity.id,
                        timestamp: now
                    });
                    // PASS DATA FOR FLOATING TEXT
                    events.push(GameEventFactory.create('RECOVERY_USED', msg, entity.id, { coins: coinReward, moves: 1 }));
                }

                state.grid = { ...state.grid, [key]: { ...hex, ...newUpdates } };

                if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
                if (hasUpgradeCmd) entity.movementQueue.shift();
                entity.state = EntityState.IDLE;
                return false;

            } else {
                state.grid = { ...state.grid, [key]: { ...hex, progress: hex.progress + 1 } };
                return true;
            }

        } else {
            // --- 1B: LOW LEVEL LOGIC (Standard: Once per visit) ---
            if (entity.recoveredCurrentHex) {
                 if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
                 if (hasUpgradeCmd) entity.movementQueue.shift();
                 entity.state = EntityState.IDLE;
                 return false;
            }

            const config = getLevelConfig(hex.maxLevel); 
            const needed = config.growthTime;

            if (hex.progress + 1 >= needed) {
                const rawReward = (hex.maxLevel || 0) * 5 + 5; 
                const coinReward = Math.max(0, rawReward);

                entity.moves += 1;
                entity.coins += coinReward;
                entity.totalCoinsEarned += coinReward;
                entity.recoveredCurrentHex = true; 

                const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
                const msg = `${prefix} Recovered 1 Move + ${coinReward} Credits`;
                
                state.messageLog.unshift({
                    id: `rec-${Date.now()}-${entity.id}`,
                    text: msg,
                    type: 'SUCCESS',
                    source: entity.id,
                    timestamp: Date.now()
                });
                
                // PASS DATA FOR FLOATING TEXT
                events.push(GameEventFactory.create('RECOVERY_USED', msg, entity.id, { coins: coinReward, moves: 1 }));
                
                state.grid = { ...state.grid, [key]: { ...hex, progress: 0 } };
                
                if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
                if (hasUpgradeCmd) entity.movementQueue.shift();
                entity.state = EntityState.IDLE;
                return false;
            } else {
                state.grid = { ...state.grid, [key]: { ...hex, progress: hex.progress + 1 } };
                return true;
            }
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
             if (entity.storage < entity.maxStorage) {
                 entity.storage = entity.storage + 1;
             }
             
             const depthReward = Math.max(1, Math.abs(newLevel));
             entity.moves += depthReward;
             
             // Handle Durability Logic for new level
             let newDurability = hex.durability;
             if (newLevel === 1) {
                 newDurability = GAME_CONFIG.L1_HEX_MAX_DURABILITY; 
             } else if (newLevel <= 0 || newLevel >= 2) {
                 newDurability = undefined; 
             }

             // Reset Recovery Stats on Level Change
             const newRecoveryPoints = undefined;
             const newLastRecoveryTime = undefined;

             // Update Hex (Copy-On-Write)
             state.grid = { 
                  ...state.grid, 
                  [key]: { 
                      ...hex, 
                      currentLevel: newLevel, 
                      maxLevel: newLevel, 
                      progress: 0,
                      structureType: undefined, 
                      durability: newDurability,
                      recoveryPoints: newRecoveryPoints,
                      lastRecoveryTime: newLastRecoveryTime
                  }
             };
             
             // --- ENTROPY COST ---
             const entropyCost = hex.currentLevel === 0 ? ENTROPY_CONFIG.COST_ACTION_BASE : (ENTROPY_CONFIG.COST_ACTION_BASE * Math.abs(hex.currentLevel));
             state.entropy.current = Math.max(0, state.entropy.current - entropyCost);

             const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
             const msg = `${prefix} Excavated to L${newLevel} (+1 Mat, +${depthReward} Moves)`;
             
             state.messageLog.unshift({ id: `dig-ok-${Date.now()}`, text: msg, type: 'SUCCESS', source: 'SYSTEM', timestamp: Date.now() });
             
             // PASS DATA FOR FLOATING TEXT
             events.push(GameEventFactory.create('SECTOR_EXCAVATED', msg, entity.id, { material: 1, moves: depthReward }));

             // --- LOOT LOGIC ---
             // Only grant loot if the new level is negative (deep digging)
             if (entity.type === EntityType.PLAYER && newLevel < 0) {
                 const loot = rollForLoot(newLevel);
                 if (loot.type === 'COIN') {
                     entity.coins += loot.amount;
                     entity.totalCoinsEarned += loot.amount;
                     const lootMsg = `FOUND: ${loot.amount} Coins!`;
                     state.messageLog.unshift({ id: `loot-${Date.now()}`, text: lootMsg, type: 'SUCCESS', source: 'LOOT', timestamp: Date.now() });
                     // Reuse recovery used for sound, but pass COIN data for visual
                     events.push(GameEventFactory.create('RECOVERY_USED', lootMsg, entity.id, { coins: loot.amount })); 
                 } else if (loot.type === 'ITEM') {
                     if (!entity.inventory) entity.inventory = [];
                     
                     if (entity.inventory.length < GAME_CONFIG.MAX_INVENTORY_SIZE) {
                         entity.inventory = [...entity.inventory, loot.item];
                         const lootMsg = `FOUND: ${loot.item.name}!`;
                         state.messageLog.unshift({ id: `loot-item-${Date.now()}`, text: lootMsg, type: 'SUCCESS', source: 'LOOT', timestamp: Date.now() });
                         events.push(GameEventFactory.create('ITEM_DROP', lootMsg, entity.id));
                     } else {
                         state.messageLog.unshift({ id: `loot-full-${Date.now()}`, text: "Inventory Full! Item Discarded.", type: 'WARN', source: 'LOOT', timestamp: Date.now() });
                         events.push(GameEventFactory.create('ERROR', "Inventory Full", entity.id));
                     }
                 }
             }
             
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
          
          // High Level Recovery Props
          let newRecoveryPoints = hex.recoveryPoints;
          let newLastRecoveryTime = hex.lastRecoveryTime;

          const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;

          if (targetLevel > hex.maxLevel) {
            newMaxLevel = targetLevel;
            didMaxIncrease = true;
            entity.playerLevel = Math.max(entity.playerLevel, targetLevel);
            
            // Cost & Reward
            entity.storage = Math.max(0, entity.storage - 1);
            const income = Math.max(0, config.income);
            entity.coins += income;
            entity.totalCoinsEarned += income;
            entity.moves += 1;

            // --- ENTROPY COST ---
            const entropyCost = targetLevel === 0 ? ENTROPY_CONFIG.COST_ACTION_BASE : (ENTROPY_CONFIG.COST_ACTION_BASE * Math.abs(targetLevel));
            state.entropy.current = Math.max(0, state.entropy.current - entropyCost);

            if (targetLevel === 1) {
                 newOwnerId = entity.id;
                 newDurability = GAME_CONFIG.L1_HEX_MAX_DURABILITY; 
                 
                 const msg = `${prefix} Sector L1 Built (-1 Mat, +Move, +Cr)`;
                 state.messageLog.unshift({ id: `acq-${Date.now()}`, text: msg, type: 'SUCCESS', source: entity.id, timestamp: Date.now() });
                 // PASS LEVEL DATA
                 events.push(GameEventFactory.create('SECTOR_ACQUIRED', msg, entity.id, { level: 1 }));
            } else {
                 newDurability = undefined;
                 const msg = `${prefix} Upgraded to L${targetLevel} (-1 Mat, +Move, +Cr)`;
                 state.messageLog.unshift({ id: `lvl-${Date.now()}`, text: msg, type: 'SUCCESS', source: entity.id, timestamp: Date.now() });
                 // PASS LEVEL DATA
                 events.push(GameEventFactory.create('LEVEL_UP', msg, entity.id, { level: targetLevel }));
            }

            // INIT RECOVERY POINTS IF LEVEL >= 4
            // When reaching/passing the threshold, we grant the initial set of points and set the timer.
            // This forces the "wait 15s after upgrade" rule.
            if (targetLevel >= GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
                newRecoveryPoints = GAME_CONFIG.MAX_RECOVERY_POINTS;
                newLastRecoveryTime = Date.now(); // Cooldown starts NOW
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
                  durability: newDurability,
                  recoveryPoints: newRecoveryPoints,
                  lastRecoveryTime: newLastRecoveryTime
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
          state.grid = { ...state.grid, [key]: { ...hex, progress: hex.progress + 1 } };
          return true;
        }
    }

    return false;
  }
}
