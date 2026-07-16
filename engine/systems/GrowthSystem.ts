
import { System } from './System';
import { GameEvent, EntityState, Entity, EntityType, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { getHexKey, getStatusModifiers, cubeDistance } from '../../services/hexUtils';
import { GameEventFactory } from '../events';
import { checkGrowthCondition, checkDigCondition, checkRecoveryCooldown, applyRecovery, getRecoveryReward } from '../../rules/growth';
import { getLevelConfig, GAME_CONFIG, ENTROPY_CONFIG, getScaledEntropyBaseCost } from '../../rules/config';
import { rollForLoot } from '../../rules/loot';
import { createSpecificItem } from '../../rules/items';

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
    
    // For bots (and maybe player queued actions), target could be adjacent
    let targetQ = entity.q;
    let targetR = entity.r;
    
    if (hasUpgradeCmd && entity.type !== 'PLAYER') {
         targetQ = entity.movementQueue[0].q;
         targetR = entity.movementQueue[0].r;
    }

    const key = getHexKey(targetQ, targetR);
    
    // We use 'let' here so we can update the reference if we perform maintenance
    let hex = state.grid[key];
    const now = Date.now();
    
    // Safety check
    if (!hex) {
         if (hasUpgradeCmd) entity.movementQueue.shift();
         entity.state = EntityState.IDLE;
         return false;
    }

    // In siege mode, bots can only act within a 1-hex radius
    if (entity.type !== EntityType.PLAYER && state.defense?.isDefenseMode) {
        const dist = cubeDistance(entity, { q: targetQ, r: targetR });
        if (dist > 1) {
            if (hasUpgradeCmd) entity.movementQueue.shift();
            entity.state = EntityState.IDLE;
            return false;
        }
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
             // Commit to state (Mutate draft)
             Object.assign(state.grid[key], updatedHex);
             // Update local reference for the rest of this function
             hex = state.grid[key];
        }
    }

    if (hex && (typeof hex.progress !== 'number' || isNaN(hex.progress))) {
        hex.progress = 0;
    }

    // Determine Intent
    const isUserIntentActive = entity.type === EntityType.PLAYER && state.isPlayerGrowing;
    const userIntentType = entity.type === EntityType.PLAYER ? state.playerGrowthIntent : null;
    
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
    let effectiveIntent: 'UPGRADE' | 'RECOVER' | 'DIG' | 'TURRET' = 'RECOVER';
    
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
            const status = checkRecoveryCooldown(hex, now, state);
            if (!status.ready && !state.defense?.isDefenseMode) {
                // Cooldown Active
                if (entity.type === EntityType.PLAYER) {
                    state.isPlayerGrowing = false;
                    const seconds = Math.ceil(status.remaining / 1000);
                    // Reactor melt shock penalty
                    state.entropy.current = Math.max(0, state.entropy.current - 10.0);
                    const errorLabel = state.language === 'RU'
                        ? `💥 РЕАКТОРНЫЙ ШОК: Попытка съема энергии перегретого сектора снижает стабильность на -10%!`
                        : `💥 REACTOR SHOCK: Attempting recovery of overheating sector drops stability by -10%!`;
                    state.messageLog.unshift({
                        id: `cd-${now}`,
                        text: `${state.language === 'RU' ? `Сектор на перезарядке: осталось ${seconds}с` : `Sector Recharging: ${seconds}s left`}. ${errorLabel}`,
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
            if (entity.recoveredCurrentHex && !state.defense?.isDefenseMode) {
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
            const { economicMultiplier } = getStatusModifiers(entity, state);
            const coinReward = isMiningOffline ? 0 : Math.floor(reward.credits * economicMultiplier);

            entity.moves = Math.min(entity.moves + reward.moves, 999); // Soft cap moves
            entity.coins += coinReward;
            entity.totalCoinsEarned += coinReward;
            
            if (!isHighLevel) {
                entity.recoveredCurrentHex = state.defense?.isDefenseMode ? false : true; 
            }

            // Update Hex State (Charges/Cooldown)
            const updates = applyRecovery(hex, now, state);
            
            const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
            const isVisible = entity.type === EntityType.PLAYER || hex.revealed;
            
            let msg = "";
            if (isHighLevel) {
                const chargesLeft = updates.recoveryCharges ?? 0;
                msg = `${prefix} Recovered (Uses: ${chargesLeft}/${GAME_CONFIG.MAX_RECOVERY_POINTS}) - Level decreased to L${updates.currentLevel}`;
                if (chargesLeft === 0) msg += " [COOLDOWN]";
            } else {
                msg = `${prefix} Recovered 1 Move + ${coinReward} Credits`;
            }
            
            if (isVisible) {
                state.messageLog.unshift({ id: `rec-${now}-${entity.id}`, text: msg, type: 'SUCCESS', source: entity.id, timestamp: now });
                events.push(GameEventFactory.create('RECOVERY_USED', msg, entity.id, { coins: coinReward, moves: reward.moves }));
            }
            
            // Commit Grid Update (Mutate draft)
            Object.assign(state.grid[key], { progress: 0, ...updates });
            
            // Stop Action
            if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
            if (hasUpgradeCmd) entity.movementQueue.shift();
            entity.state = EntityState.IDLE;
            return false;

        } else {
            // Tick Progress
            state.grid[key].progress++;
            return true;
        }
    }

    // === BRANCH 2: DIG ACTION (Timed) ===
    if (effectiveIntent === 'DIG') {
         const neighbors = index.getValidNeighbors(targetQ, targetR).map(h => ({ q: h.q, r: h.r }));
         const condition = checkDigCondition(hex, entity, neighbors, state.grid);

         if (!condition.canGrow) {
             if (hasUpgradeCmd) entity.movementQueue.shift();
             entity.state = EntityState.IDLE;
             if (entity.type === EntityType.PLAYER) {
                 const msg = condition.reason || "Dig Failed";
                 // Deduct entropy for player error / drilling mistake!
                 state.entropy.current = Math.max(0, state.entropy.current - 5.0);
                 const errorLabel = state.language === 'RU'
                     ? `⚠️ СЕЙСМИЧЕСКАЯ ОШИБКА: Ошибка бурения дестабилизирует стабильность ядра (-5% энтропии)!`
                     : `⚠️ SEISMIC ERROR: Excavation failure destabilizes the core stability (-5% entropy)!`;
                 state.messageLog.unshift({ id: `dig-fail-${Date.now()}`, text: `${msg}. ${errorLabel}`, type: 'WARN', source: 'SYSTEM', timestamp: Date.now() });
                 events.push(GameEventFactory.create('ACTION_DENIED', msg, entity.id));
                 state.isPlayerGrowing = false;
             }
             return false;
         }

        // Logic for Dig Progress
        const { growthAccelerator } = getStatusModifiers(entity, state);
        const isBot = entity.type !== EntityType.PLAYER;
        const isDefenseMode = !!state.defense?.isDefenseMode;
        const needed = (isBot && isDefenseMode) ? 3 : Math.max(10, 30 - (growthAccelerator * 5));
        if (hex.progress + 1 >= needed) {
             const newLevel = hex.currentLevel - 1;
             
             // --- SIEGE CORE DAMAGE ---
             if (hex.isCore) {
                 if (state.defense) {
                     state.defense.coreHealth = Math.max(0, state.defense.coreHealth - 10);
                     events.push(GameEventFactory.create('CORE_DAMAGED', undefined, entity.id, { damage: 10, remaining: state.defense.coreHealth }));
                     
                     if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
                     if (hasUpgradeCmd) entity.movementQueue.shift();
                     entity.state = EntityState.IDLE;
                     state.grid[key].progress = 0;
                     
                     if (state.defense.coreHealth === 0) {
                         events.push(GameEventFactory.create('CORE_DESTROYED', undefined, entity.id));
                     }
                     return false;
                 }
             }

             // --- DIG STATUS CHECKS ---
             const { digRewardMultiplier, diggerLuck, doubleDigChance } = getStatusModifiers(entity, state);
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
             let matGain = Math.floor(1 * digRewardMultiplier);
             if (newLevel >= 0 && Math.random() < doubleDigChance) {
                 matGain *= 2;
             }
             let actualMatGain = 0;

             // CAP MATERIAL AT MAX STORAGE, BUT ALLOW ACTION TO PROCEED
             if (entity.storage < entity.maxStorage) {
                 const space = entity.maxStorage - entity.storage;
                 actualMatGain = Math.min(space, matGain);
                 entity.storage += actualMatGain;
             }
             state.totalMinedMaterial = (state.totalMinedMaterial || 0) + actualMatGain;

             if (entity.type === 'PLAYER') {
                 if (!state.minedHexes) state.minedHexes = {};
                 state.minedHexes[hex.currentLevel] = (state.minedHexes[hex.currentLevel] || 0) + 1;
             }
             
             const depthReward = Math.max(1, Math.abs(newLevel));
             entity.moves += depthReward;
             
             // Handle Durability Logic for new level
             let newDurability = hex.durability;
             if (newLevel === 1) {
                 const { foundationStrength } = getStatusModifiers(entity, state);
                 newDurability = GAME_CONFIG.L1_HEX_MAX_DURABILITY + (foundationStrength * 2); 
             } else if (newLevel <= 0 || newLevel >= 2) {
                 newDurability = undefined; 
             }

             // Reset Recovery Stats on Level Change
             const newRecoveryPoints = undefined;
             const newLastRecoveryTime = undefined;
             const newCooldown = undefined;
             
             // Determine new looted levels array to ensure persistence
             const nextLootedLevels = hex.lootedLevels ? [...hex.lootedLevels] : [];

             // --- LOOT LOGIC (BEFORE UPDATING STATE) ---
             // We process loot first to see if we need to update 'lootedLevels'
             if (entity.type === EntityType.PLAYER && newLevel < 0) {
                 // DEPLETION CHECK: Has this depth been looted on this hex before?
                 const isDepleted = nextLootedLevels.includes(newLevel);
                 
                 if (!isDepleted) {
                     // Mark this level as Depleted for this hex immediately to prevent farming
                     nextLootedLevels.push(newLevel);

                     // Check for secret loot hex match first!
                     const secretMatch = state.secretLootHexes?.find(s => s.q === hex.q && s.r === hex.r && s.level === newLevel && !s.found);
                     let loot: any = { type: 'NONE' };
                     if (secretMatch) {
                         secretMatch.found = true;
                         const questItem = createSpecificItem(secretMatch.itemBaseId, state.language);
                         loot = { type: 'ITEM', item: questItem };
                     } else {
                         const levelId = state.activeLevelConfig?.id;
                         if (levelId === '1.5' || levelId === '1.6') {
                             // Boost drop chance and ensure useful drops in levels 1.5 and 1.6
                             const roll = Math.random();
                             if (roll < 0.80) {
                                 // 80% chance to drop a highly useful item!
                                 const possibleItemIds = ['reality_patch', 'fuel_cell', 'data_disc', 'raw_container'];
                                 const randomItemId = possibleItemIds[Math.floor(Math.random() * possibleItemIds.length)];
                                 const item = createSpecificItem(randomItemId, state.language);
                                 loot = { type: 'ITEM', item };
                             } else {
                                 // 20% chance to drop solid capital!
                                 loot = { type: 'COIN', amount: 25 };
                             }
                         } else {
                             loot = rollForLoot(newLevel - diggerLuck, state.language);
                         }
                     }
                     if (loot.type !== 'NONE') {
                         
                         if (loot.type === 'COIN') {
                             let finalAmount = loot.amount;
                             if (state.winCondition?.mutatorType === 'SUDDEN_DEATH') {
                                 finalAmount = Math.round(finalAmount * 1.5);
                             } else if (state.winCondition?.mutatorType === 'RICH_VEINS') {
                                 finalAmount = finalAmount * 2;
                             }
                             entity.coins += finalAmount;
                             entity.totalCoinsEarned += finalAmount;
                             const lootMsg = `FOUND: ${finalAmount} Coins!`;
                             state.messageLog.unshift({ id: `loot-${Date.now()}`, text: lootMsg, type: 'SUCCESS', source: 'LOOT', timestamp: Date.now() });
                             events.push(GameEventFactory.create('RECOVERY_USED', lootMsg, entity.id, { coins: finalAmount })); 
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

             // Update Hex (Mutate draft)
             Object.assign(state.grid[key], { 
                 currentLevel: newLevel, 
                 maxLevel: Math.max(hex.maxLevel, newLevel), 
                 progress: 0,
                 structureType: undefined, 
                 durability: newDurability,
                 recoveryCharges: newRecoveryPoints,
                 lastRecoveryUseTime: newLastRecoveryTime,
                 cooldownEndTime: newCooldown,
                 lootedLevels: nextLootedLevels, // Persist updated loot history
                  isExcavated: entity.type === EntityType.PLAYER ? true : hex.isExcavated,
                  isPlayerBuilt: entity.type === EntityType.PLAYER ? false : hex.isPlayerBuilt
             });
             
             // --- ENTROPY COST ---
             const gridSize = Object.keys(state.grid).length;
             const scaledBaseCost = getScaledEntropyBaseCost(gridSize);
             const entropyCost = hex.currentLevel === 0 ? scaledBaseCost : (scaledBaseCost * Math.abs(hex.currentLevel));
             const hasEntropyInversion = this.hasStatus(entity, 'STATUS_ENTROPY_INVERSION');
             
             if (hasEntropyInversion) {
                 state.entropy.current = Math.min(state.entropy.max, state.entropy.current + entropyCost);
             } else {
                 state.entropy.current = Math.max(0, state.entropy.current - entropyCost);
             }

             const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
             const isVisible = entity.type === EntityType.PLAYER || hex.revealed;
             let msg = `${prefix} Excavated to L${newLevel} (+${actualMatGain} Mat, +${depthReward} Moves)`;
             
             // WARN IF STORAGE WAS FULL
             if (actualMatGain < matGain) {
                 msg = `${prefix} Dig Complete (STORAGE FULL) +${depthReward} Moves`;
                 // Push specific error event to trigger red toast if needed
                 if (entity.type === EntityType.PLAYER) {
                     events.push(GameEventFactory.create('ERROR', "Storage Full - Material Wasted", entity.id));
                 }
             }
             
             if (isVisible) {
                 state.messageLog.unshift({ id: `dig-ok-${Date.now()}`, text: msg, type: 'SUCCESS', source: 'SYSTEM', timestamp: Date.now() });
                 events.push(GameEventFactory.create('SECTOR_EXCAVATED', msg, entity.id, { material: actualMatGain, moves: depthReward }));
             }

             if (hasUpgradeCmd) entity.movementQueue.shift();
             entity.state = EntityState.IDLE;
             if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
             return false;
        } else {
             state.grid[key].progress++;
             return true;
        }
    }

    // === BRANCH 3: UPGRADE ACTION (Timed) ===
    if (effectiveIntent === 'UPGRADE') {
        const neighbors = index.getValidNeighbors(targetQ, targetR).map(h => ({ q: h.q, r: h.r }));
        const occupied = index.getOccupiedHexesList();
        
        const condition = checkGrowthCondition(hex, entity, neighbors, state.grid, occupied, queueSize);
        
        // STATUS CHECK: FREE BUILD
        // If Free Build active, ignore "NEED MATERIAL" reason
        const hasFreeBuild = this.hasStatus(entity, 'STATUS_FREE_BUILD') || state.winCondition?.mutatorType === 'NANO_STORM';
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
             // Deduct entropy for player error / invalid build attempt!
             state.entropy.current = Math.max(0, state.entropy.current - 5.0);
             const errorLabel = state.language === 'RU'
                 ? `⚠️ СТРУКТУРНЫЙ СБОЙ: Попытка неверного строительства дестабилизирует эфир (-5% энтропии)!`
                 : `⚠️ STRUCTURAL FAILURE: Invalid construction attempt destabilizes the field (-5% entropy)!`;
             state.messageLog.unshift({ id: `denied-${Date.now()}`, text: `Growth Failed: ${msg}. ${errorLabel}`, type: 'WARN', source: 'SYSTEM', timestamp: Date.now() });
             events.push(GameEventFactory.create('ACTION_DENIED', msg, entity.id));
             state.isPlayerGrowing = false; 
          }
          return false;
        }

        // Calculate Growth
        const targetLevel = hex.currentLevel + 1;
        const config = getLevelConfig(targetLevel);
        const { growthAccelerator } = getStatusModifiers(entity, state);
        const isBot = entity.type !== EntityType.PLAYER;
        const isDefenseMode = !!state.defense?.isDefenseMode;
        const needed = (isBot && isDefenseMode) ? 3 : Math.max(10, config.growthTime - (growthAccelerator * 5));

        // Check Progress
        if (hex.progress + 1 >= needed) {
          // LEVEL UP
          let newMaxLevel = hex.maxLevel;
          let newOwnerId = entity.id; 
          let newDurability = hex.durability;
          let newRecoveryCharges = hex.recoveryCharges;
          let newLastRecoveryTime = hex.lastRecoveryUseTime;
          let newCooldown = hex.cooldownEndTime;

          const prefix = entity.type === EntityType.PLAYER ? "[YOU]" : `[${entity.id}]`;
          const isVisible = entity.type === EntityType.PLAYER || hex.revealed;

          if (targetLevel > hex.maxLevel) {
            newMaxLevel = targetLevel;
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
                        structureType: 'VOID'
                    };
                    events.push(GameEventFactory.create('HEX_COLLAPSE', 'Soil Eater consumed land', entity.id, { q: victim.q, r: victim.r }));
                }
            }
          }

          // Cost & Reward (Deducted always)
          if (!hasFreeBuild) {
              entity.storage = Math.max(0, entity.storage - 1);
          }
          
          // STATUS CHECK: MINING OFFLINE
          const isMiningOffline = this.hasStatus(entity, 'STATUS_MINING_OFFLINE');
          const { economicMultiplier } = getStatusModifiers(entity, state);
          const income = isMiningOffline ? 0 : Math.max(0, Math.floor(config.income * economicMultiplier));
          
          entity.coins += income;
          entity.totalCoinsEarned += income;
          entity.moves += 1;

          // --- ENTROPY COST ---
          let baseCostMultiplier = 1;
          if (state.winCondition?.mutatorType === 'SUDDEN_DEATH') {
              baseCostMultiplier = 2;
          }
          const gridSize = Object.keys(state.grid).length;
          const scaledBaseCost = getScaledEntropyBaseCost(gridSize);
          const baseEntropyCost = (targetLevel === 0 ? scaledBaseCost : (scaledBaseCost * Math.abs(targetLevel))) * baseCostMultiplier;
          const { entropyResistance } = getStatusModifiers(entity, state);
          const entropyCost = Math.max(0, baseEntropyCost * (1 - entropyResistance));
          
          const hasEntropyInversion = this.hasStatus(entity, 'STATUS_ENTROPY_INVERSION');
          
          if (hasEntropyInversion) {
              state.entropy.current = Math.min(state.entropy.max, state.entropy.current + entropyCost);
          } else {
              state.entropy.current = Math.max(0, state.entropy.current - entropyCost);
          }

          if (targetLevel === 1) {
               newOwnerId = entity.id;
               const { foundationStrength } = getStatusModifiers(entity, state);
               newDurability = GAME_CONFIG.L1_HEX_MAX_DURABILITY + (foundationStrength * 2);
               
               const msg = `${prefix} Sector L1 Built (${hasFreeBuild ? '0' : '-1'} Mat, +Move, +Cr)`;
               
               if (isVisible) {
                  state.messageLog.unshift({ id: `acq-${Date.now()}`, text: msg, type: 'SUCCESS', source: entity.id, timestamp: Date.now() });
                  events.push(GameEventFactory.create('SECTOR_ACQUIRED', msg, entity.id, { level: 1 }));
               }
          } else {
               newDurability = undefined;
               
               const msg = `${prefix} Upgraded to L${targetLevel} (${hasFreeBuild ? '0' : '-1'} Mat, +Move, +Cr)`;
               
               if (isVisible) {
                  state.messageLog.unshift({ id: `lvl-${Date.now()}`, text: msg, type: 'SUCCESS', source: entity.id, timestamp: Date.now() });
                  events.push(GameEventFactory.create('LEVEL_UP', msg, entity.id, { level: targetLevel }));
               }
          }

          // INIT RECOVERY POINTS IF LEVEL >= 4
          // Reset to full charges if hitting L4 threshold or upgrading within high levels
          if (targetLevel >= GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
              const { reserveCapacitor } = getStatusModifiers(entity, state);
              newRecoveryCharges = GAME_CONFIG.MAX_RECOVERY_POINTS + reserveCapacitor;
              newLastRecoveryTime = undefined; 
              newCooldown = undefined;
          }

          // Update Hex (Mutate draft)
          Object.assign(state.grid[key], { 
              currentLevel: targetLevel, 
              maxLevel: newMaxLevel, 
              progress: 0,
              structureType: state.grid[key].structureType === 'VOID' ? undefined : state.grid[key].structureType,
              ownerId: newOwnerId,
              durability: newDurability,
              recoveryCharges: newRecoveryCharges,
              lastRecoveryUseTime: newLastRecoveryTime,
              cooldownEndTime: newCooldown,
              isPlayerBuilt: entity.type === EntityType.PLAYER ? true : hex.isPlayerBuilt,
              isExcavated: entity.type === EntityType.PLAYER ? false : hex.isExcavated
          });
          
          const shouldContinue = false;

          if (!shouldContinue) {
             if (hasUpgradeCmd) entity.movementQueue.shift();
             entity.state = EntityState.IDLE;
             if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
             return false;
          }
          
          return true;

        } else {
          state.grid[key].progress++;
          return true;
        }
    }

    // === BRANCH 4: TURRET PLACEMENT ACTION (Timed) ===
    if (effectiveIntent === 'TURRET') {
        const hasFreeBuild = this.hasStatus(entity, 'STATUS_FREE_BUILD') || state.winCondition?.mutatorType === 'NANO_STORM';
        
        // 1. Initial Validation
        let canBuild = true;
        let reason = "";

        if (hex.currentLevel < 2) {
            canBuild = false;
            reason = "Hex level must be L2+ (Highland)";
        } else if (hex.structureType !== 'NONE' && hex.structureType !== undefined) {
            canBuild = false;
            reason = `Already occupied by ${hex.structureType}`;
        } else if (!hasFreeBuild && entity.storage < 3) {
            canBuild = false;
            reason = "Need 3 materials to construct turret";
        }

        if (!canBuild) {
            if (hasUpgradeCmd) entity.movementQueue.shift();
            entity.state = EntityState.IDLE;
            if (entity.type === EntityType.PLAYER) {
                state.messageLog.unshift({
                    id: `turret-fail-${now}`,
                    text: `Turret Build Failed: ${reason}`,
                    type: 'WARN',
                    source: 'SYSTEM',
                    timestamp: now
                });
                events.push(GameEventFactory.create('ACTION_DENIED', reason, entity.id));
                state.isPlayerGrowing = false;
            }
            return false;
        }

        // 2. Tick progress (needs 40 ticks)
        const needed = 40;
        if (hex.progress + 1 >= needed) {
            // Deduct Materials
            if (!hasFreeBuild) {
                entity.storage = Math.max(0, entity.storage - 3);
            }

            // Build completed!
            Object.assign(state.grid[key], {
                structureType: 'TURRET',
                isTurret: true,
                turretRange: 2,
                turretDamage: 3,
                turretCooldown: 3000,
                progress: 0,
                isPlayerBuilt: true
            });

            const msg = `🛡️ Built Defensive Turret at (${hex.q}, ${hex.r})! Setup completed.`;
            state.messageLog.unshift({
                id: `turret-build-ok-${now}`,
                text: msg,
                type: 'SUCCESS',
                source: entity.id,
                timestamp: now
            });

            events.push({
                type: 'TURRET_BUILT' as any,
                actorId: entity.id,
                gridKey: key,
                payload: { q: hex.q, r: hex.r }
            } as any);

            // Reset action State
            if (hasUpgradeCmd) entity.movementQueue.shift();
            entity.state = EntityState.IDLE;
            if (entity.type === EntityType.PLAYER) state.isPlayerGrowing = false;
            return false;
        } else {
            state.grid[key].progress++;
            return true;
        }
    }

    return false;
  }
}
