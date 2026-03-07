
import { System } from './System';
import { GameState, GameEvent, EntityState, Entity, EntityType, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { getHexKey, getNeighbors, getStatusModifiers } from '../../services/hexUtils';
import { GameEventFactory } from '../events';
import { checkGrowthCondition, checkDigCondition, checkRecoveryCooldown, applyRecovery, getRecoveryReward } from '../../rules/growth';
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

  // Helper to check active status
  private hasStatus(entity: Entity, type: string): boolean {
      const now = Date.now();
      return !!entity.activeStatuses?.some(s => s.type === type && (!s.expiresAt || s.expiresAt > now));
  }

  private processEntity(entity: Entity, state: SessionState, index: WorldIndex, events: GameEvent[], queueSize: number): boolean {
    const hasUpgradeCmd = entity.movementQueue.length > 0 && entity.movementQueue[0].upgrade;
    const queuedIntent = hasUpgradeCmd ? entity.movementQueue[0].intent : null;
    const key = getHexKey(entity.q, entity.r);
    
    // We use 'let' here so we can update the reference if we perform maintenance
    let hex = state.grid[key];
    const now = Date.now();
    
    // Safety check
    if (!hex) {
         if (hasUpgradeCmd) entity.movementQueue.shift();
         entity.state = EntityState.IDLE;
         return false;
    }

    // --- MAINTENANCE: HIGH LEVEL COOLDOWN RESET ---
    // Ensure that if a cooldown has expired, the hex is visually and logically reset immediately,
    // regardless of whether the player is interacting with it.
    if (hex.maxLevel >= GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
        if (hex.cooldownEndTime && now >= hex.cooldownEndTime) {
             const updatedHex = {
                 ...hex,
                 recoveryCharges: GAME_CONFIG.MAX_RECOVERY_POINTS,
                 cooldownEndTime: undefined
             };
             // Commit to state (Copy-On-Write)
             state.grid = { ...state.grid, [key]: updatedHex };
             // Update local reference for the rest of this function
             hex = updatedHex;
        }
    }

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
        const isMiningOffline = this.hasStatus(entity, 'STATUS_MINING_OFFLINE');
        
        // 1. Check Cooldowns / Eligibility immediately
        if (isHighLevel) {
            // L4+: Check Charges & Cooldown Timer
            const status = checkRecoveryCooldown(hex, now);
            if (!status.ready) {
                // Cooldown Active
                if (entity.type === EntityType.PLAYER) {
                    state.isPlayerGrowing = false;
                    const seconds = Math.ceil(status.remaining / 1000);
                    state.messageLog.unshift({
                        id: `cd-${now}`,
                        text: `Sector Recharging: ${seconds}s left`,
                        type: 'WARN',
                        source: 'SYSTEM',
                        timestamp: now
                    });
                    events.push(GameEventFactory.create('ACTION_DENIED', `Cooldown: ${seconds}s`, entity.id));
                }
                entity.state = EntityState.IDLE;
                if (hasUpgradeCmd) entity.movementQueue.shift();
                return false;
            }
        } else {
            // L0-L3: Check Entity Flag
            if (entity.recoveredCurrentHex) {
                 if (entity.type === EntityType.PLAYER) {
                     state.isPlayerGrowing = false;
                     // Optional: Feedback "Move to reset"
                 }
                 if (hasUpgradeCmd) entity.movementQueue.shift();
                 entity.state = EntityState.IDLE;
                 return false;
            }
        }

        // 2. Process Growth Time
        const config = getLevelConfig(hex.maxLevel); 
        const needed = config.growthTime;

        if (hex.progress + 1 >= needed) {
            // ACTION COMPLETE
            
            // Calculate Reward
            const reward = getRecoveryReward(hex);
            
            // STATUS CHECK: Mining Offline
            const coinReward = isMiningOffline ? 0 : reward.credits;

            entity.moves = Math.min(entity.moves + reward.moves, 999); // Soft cap moves
            entity.coins += coinReward;
            entity.totalCoinsEarned += coinReward;
            
            if (!isHighLevel) {
                entity.recoveredCurrentHex = true; 
            }

            // Update Hex State (Charges/Cooldown)
            const updates = applyRecovery(hex, now);
            
            const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
            
            let msg = "";
            if (isHighLevel) {
                const chargesLeft = updates.recoveryCharges ?? 0;
                msg = `${prefix} Recovered (Uses: ${chargesLeft}/${GAME_CONFIG.MAX_RECOVERY_POINTS})`;
                if (chargesLeft === 0) msg += " [COOLDOWN]";
            } else {
                msg = `${prefix} Recovered 1 Move + ${coinReward} Credits`;
            }
            
            state.messageLog.unshift({ id: `rec-${now}-${entity.id}`, text: msg, type: 'SUCCESS', source: entity.id, timestamp: now });
            events.push(GameEventFactory.create('RECOVERY_USED', msg, entity.id, { coins: coinReward, moves: reward.moves }));
            
            // Commit Grid Update
            state.grid = { ...state.grid, [key]: { ...hex, progress: 0, ...updates } };
            
            // Stop Action
            if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
            if (hasUpgradeCmd) entity.movementQueue.shift();
            entity.state = EntityState.IDLE;
            return false;

        } else {
            // Tick Progress
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
             const newLevel = hex.currentLevel - 1;
             
             // --- DIG STATUS CHECKS ---
             const { digRewardMultiplier } = getStatusModifiers(entity);
             const hasBreakdownRisk = this.hasStatus(entity, 'STATUS_BREAKDOWN_RISK');

             // BREAKDOWN RISK: 10% chance to lose rank or receive error
             if (hasBreakdownRisk && Math.random() < 0.1) {
                 if (entity.playerLevel > 1) entity.playerLevel--;
                 const failMsg = "CRITICAL BREAKDOWN: Drill Malfunction!";
                 state.messageLog.unshift({ id: `breakdown-${Date.now()}`, text: failMsg, type: 'ERROR', source: 'SYSTEM', timestamp: Date.now() });
                 events.push(GameEventFactory.create('ERROR', failMsg, entity.id));
                 // Stop action
                 if (hasUpgradeCmd) entity.movementQueue.shift();
                 entity.state = EntityState.IDLE;
                 if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
                 return false;
             }

             // GOLD RUSH: Replaced raw check with unified multiplier
             const matGain = Math.floor(1 * digRewardMultiplier);
             let actualMatGain = 0;

             // CAP MATERIAL AT MAX STORAGE, BUT ALLOW ACTION TO PROCEED
             if (entity.storage < entity.maxStorage) {
                 const space = entity.maxStorage - entity.storage;
                 actualMatGain = Math.min(space, matGain);
                 entity.storage += actualMatGain;
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
             const newCooldown = undefined;
             
             // Determine new looted levels array to ensure persistence
             let nextLootedLevels = hex.lootedLevels ? [...hex.lootedLevels] : [];

             // --- LOOT LOGIC (BEFORE UPDATING STATE) ---
             // We process loot first to see if we need to update 'lootedLevels'
             if (entity.type === EntityType.PLAYER && newLevel < 0) {
                 // DEPLETION CHECK: Has this depth been looted on this hex before?
                 const isDepleted = nextLootedLevels.includes(newLevel);
                 
                 if (!isDepleted) {
                     // Mark this level as Depleted for this hex immediately to prevent farming
                     nextLootedLevels.push(newLevel);

                     const loot = rollForLoot(newLevel, state.language);
                     if (loot.type !== 'NONE') {
                         
                         if (loot.type === 'COIN') {
                             entity.coins += loot.amount;
                             entity.totalCoinsEarned += loot.amount;
                             const lootMsg = `FOUND: ${loot.amount} Coins!`;
                             state.messageLog.unshift({ id: `loot-${Date.now()}`, text: lootMsg, type: 'SUCCESS', source: 'LOOT', timestamp: Date.now() });
                             events.push(GameEventFactory.create('RECOVERY_USED', lootMsg, entity.id, { coins: loot.amount })); 
                         } else if (loot.type === 'ITEM') {
                             if (!entity.inventory) entity.inventory = [];
                             
                             const maxInv = entity.maxInventorySize || GAME_CONFIG.MAX_INVENTORY_SIZE;
                             if (entity.inventory.length < maxInv) {
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
                 } else {
                     // Depleted feedback is silent usually, or maybe a small toast if we want
                 }
             }

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
                      recoveryCharges: newRecoveryPoints,
                      lastRecoveryUseTime: newLastRecoveryTime,
                      cooldownEndTime: newCooldown,
                      lootedLevels: nextLootedLevels // Persist updated loot history
                  }
             };
             
             // --- ENTROPY COST ---
             const entropyCost = hex.currentLevel === 0 ? ENTROPY_CONFIG.COST_ACTION_BASE : (ENTROPY_CONFIG.COST_ACTION_BASE * Math.abs(hex.currentLevel));
             const hasEntropyInversion = this.hasStatus(entity, 'STATUS_ENTROPY_INVERSION');
             
             if (hasEntropyInversion) {
                 state.entropy.current = Math.min(state.entropy.max, state.entropy.current + entropyCost);
             } else {
                 state.entropy.current = Math.max(0, state.entropy.current - entropyCost);
             }

             const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
             let msg = `${prefix} Excavated to L${newLevel} (+${actualMatGain} Mat, +${depthReward} Moves)`;
             
             // WARN IF STORAGE WAS FULL
             if (actualMatGain < matGain) {
                 msg = `${prefix} Dig Complete (STORAGE FULL) +${depthReward} Moves`;
                 // Push specific error event to trigger red toast if needed
                 if (entity.type === EntityType.PLAYER) {
                     events.push(GameEventFactory.create('ERROR', "Storage Full - Material Wasted", entity.id));
                 }
             }
             
             state.messageLog.unshift({ id: `dig-ok-${Date.now()}`, text: msg, type: 'SUCCESS', source: 'SYSTEM', timestamp: Date.now() });
             
             events.push(GameEventFactory.create('SECTOR_EXCAVATED', msg, entity.id, { material: actualMatGain, moves: depthReward }));
             
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
        
        // STATUS CHECK: FREE BUILD
        // If Free Build active, ignore "NEED MATERIAL" reason
        const hasFreeBuild = this.hasStatus(entity, 'STATUS_FREE_BUILD');
        let canGrow = condition.canGrow;
        if (!canGrow && hasFreeBuild && condition.reason?.includes("NEED MATERIAL")) {
            canGrow = true;
        }

        // Validation Failed
        if (!canGrow) {
          if (hasUpgradeCmd) entity.movementQueue.shift(); 
          entity.state = EntityState.IDLE;
          
          if (entity.type === EntityType.PLAYER) {
             const msg = condition.reason || "Growth Conditions Not Met";
             state.messageLog.unshift({ id: `denied-${Date.now()}`, text: `Growth Failed: ${msg}`, type: 'WARN', source: 'SYSTEM', timestamp: Date.now() });
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
          let newRecoveryCharges = hex.recoveryCharges;
          let newLastRecoveryTime = hex.lastRecoveryUseTime;
          let newCooldown = hex.cooldownEndTime;

          const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;

          if (targetLevel > hex.maxLevel) {
            newMaxLevel = targetLevel;
            didMaxIncrease = true;
            entity.playerLevel = Math.max(entity.playerLevel, targetLevel);
            
            // STATUS CHECK: SOIL EATER
            if (this.hasStatus(entity, 'STATUS_SOIL_EATER')) {
                const liveNeighbors = neighbors.filter(n => {
                    const h = state.grid[getHexKey(n.q, n.r)];
                    return h && h.structureType !== 'VOID' && h.structureType !== 'MONUMENT';
                });
                if (liveNeighbors.length > 0) {
                    const victim = liveNeighbors[Math.floor(Math.random() * liveNeighbors.length)];
                    const vKey = getHexKey(victim.q, victim.r);
                    state.grid[vKey] = {
                        ...state.grid[vKey],
                        structureType: 'VOID',
                        maxLevel: 0,
                        currentLevel: 0
                    };
                    events.push(GameEventFactory.create('HEX_COLLAPSE', 'Soil Eater consumed land', entity.id, { q: victim.q, r: victim.r }));
                }
            }

            // Cost & Reward
            if (!hasFreeBuild) {
                entity.storage = Math.max(0, entity.storage - 1);
            }
            
            // STATUS CHECK: MINING OFFLINE
            const isMiningOffline = this.hasStatus(entity, 'STATUS_MINING_OFFLINE');
            const income = isMiningOffline ? 0 : Math.max(0, config.income);
            
            entity.coins += income;
            entity.totalCoinsEarned += income;
            entity.moves += 1;

            // --- ENTROPY COST ---
            const entropyCost = targetLevel === 0 ? ENTROPY_CONFIG.COST_ACTION_BASE : (ENTROPY_CONFIG.COST_ACTION_BASE * Math.abs(targetLevel));
            const hasEntropyInversion = this.hasStatus(entity, 'STATUS_ENTROPY_INVERSION');
            
            if (hasEntropyInversion) {
                state.entropy.current = Math.min(state.entropy.max, state.entropy.current + entropyCost);
            } else {
                state.entropy.current = Math.max(0, state.entropy.current - entropyCost);
            }

            if (targetLevel === 1) {
                 newOwnerId = entity.id;
                 newDurability = GAME_CONFIG.L1_HEX_MAX_DURABILITY;
                 const msg = `${prefix} Sector L1 Built (${hasFreeBuild ? '0' : '-1'} Mat, +Move, +Cr)`;
                 state.messageLog.unshift({ id: `acq-${Date.now()}`, text: msg, type: 'SUCCESS', source: entity.id, timestamp: Date.now() });
                 events.push(GameEventFactory.create('SECTOR_ACQUIRED', msg, entity.id, { level: 1 }));
            } else {
                 newDurability = undefined;
                 const msg = `${prefix} Upgraded to L${targetLevel} (${hasFreeBuild ? '0' : '-1'} Mat, +Move, +Cr)`;
                 state.messageLog.unshift({ id: `lvl-${Date.now()}`, text: msg, type: 'SUCCESS', source: entity.id, timestamp: Date.now() });
                 events.push(GameEventFactory.create('LEVEL_UP', msg, entity.id, { level: targetLevel }));
            }

            // INIT RECOVERY POINTS IF LEVEL >= 4
            // Reset to full charges if hitting L4 threshold or upgrading within high levels
            if (targetLevel >= GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
                newRecoveryCharges = GAME_CONFIG.MAX_RECOVERY_POINTS;
                newLastRecoveryTime = undefined; 
                newCooldown = undefined;
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
                  recoveryCharges: newRecoveryCharges,
                  lastRecoveryUseTime: newLastRecoveryTime,
                  cooldownEndTime: newCooldown
              }
          };
          
          let shouldContinue = targetLevel < newMaxLevel;
          
          if (!shouldContinue && effectiveIntent === 'UPGRADE' && !didMaxIncrease) {
              const nextCheck = checkGrowthCondition(state.grid[key], entity, neighbors, state.grid, occupied, queueSize);
              // Handle Free Build Override again for chaining
              let canNext = nextCheck.canGrow;
              if (!canNext && hasFreeBuild && nextCheck.reason?.includes("NEED MATERIAL")) canNext = true;
              
              if (canNext) shouldContinue = true;
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
