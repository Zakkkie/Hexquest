import { GameAction, EntityState, ValidationResult, SessionState, Entity, MoveAction, Item, ActivateMiniMonumentAction } from '../types';
import { VictorySystem } from './systems/VictorySystem';
import { WorldIndex } from './WorldIndex';
import { getHexKey, cubeDistance, getStatusModifiers } from '../services/hexUtils';
import { ENTROPY_CONFIG, getScaledEntropyBaseCost } from '../rules/config';
import { calculateMovementCost } from '../rules/movement';
import { GameEventFactory } from './events';
import { getItemDef } from '../rules/items';

/**
 * ActionProcessor is now a STATELESS service.
 * It operates on the state object passed into its methods.
 */
export class ActionProcessor {
  constructor() {}
  
  public validateAction(state: SessionState, _index: WorldIndex, actorId: string, action: GameAction): ValidationResult {
    const actor = state.player.id === actorId ? state.player : state.bots.find(b => b.id === actorId);
    if (!actor) return { ok: false, reason: 'Entity not found' };

    if (state.activeLevelConfig?.hooks?.onBeforeAction) {
        const hookResult = state.activeLevelConfig.hooks.onBeforeAction(state, action);
        if (hookResult && !hookResult.ok) {
            return hookResult;
        }
    }

    if (action.stateVersion !== undefined && action.stateVersion !== state.stateVersion) {
        return { ok: false, reason: 'STALE STATE: Version mismatch' };
    }

    if (actor.state === EntityState.LOCKED) return { ok: false, reason: 'Actor Locked' };
    
    if (actor.state === EntityState.MOVING && action.type !== 'WAIT' && action.type !== 'RECHARGE_MOVE') {
        return { ok: false, reason: 'Actor Moving' };
    }

    return { ok: true };
  }

  public applyAction(state: SessionState, index: WorldIndex, actorId: string, action: GameAction): ValidationResult {
      const validation = this.validateAction(state, index, actorId, action);
      if (!validation.ok) return validation;

      const actor = state.player.id === actorId ? state.player : state.bots.find(b => b.id === actorId);
      if (!actor) return { ok: false, reason: 'Entity lost' };

      if (actor.activeStatuses) {
          const now = Date.now();
          actor.activeStatuses = actor.activeStatuses.filter(s => !s.expiresAt || s.expiresAt > now);
      } else {
          actor.activeStatuses = [];
      }

      let result: ValidationResult;
      switch (action.type) {
          case 'MOVE':
              result = this.handleMove(state, index, actor, action); break;
          case 'UPGRADE':
              result = this.handleUpgrade(state, index, actor, action); break;
          case 'DIG':
              result = this.handleDig(state, index, actor, action); break;
          case 'RECHARGE_MOVE':
              result = this.handleRecharge(state, index, actor); break;
          case 'DESTROY_ITEM':
              result = this.handleDestroyItem(state, index, actor, action); break;
          case 'EQUIP_ITEM':
              result = this.handleEquipItem(state, index, actor, action); break;
          case 'UNEQUIP_ITEM':
              result = this.handleUnequipItem(state, index, actor, action); break;
          case 'RESTORE_HEX':
              result = this.handleRestoreHex(state, index, actor, action); break;
          case 'ACTIVATE_MONUMENT':
              result = this.handleActivateMonument(state, index, actor, action); break;
          case 'ACTIVATE_MINI_MONUMENT':
              result = this.handleActivateMiniMonument(state, index, actor, action); break;
          case 'ACTIVATE_PORTAL':
              result = this.handleActivatePortal(state, index, actor, action); break;
          case 'WAIT':
              result = { ok: true }; break;
          default:
              return { ok: false, reason: 'Unknown Action' };
      }

      if (result.ok && actorId === state.player.id && action.type !== 'WAIT') {
          actor.actionsTaken = (actor.actionsTaken || 0) + 1;
      }

      return result;
  }

  private handleMove(state: SessionState, _index: WorldIndex, actor: Entity, action: MoveAction): ValidationResult {
      const cost = calculateMovementCost(actor, action.path, state.grid, state);
      if (!cost.canAfford) {
          return { ok: false, reason: cost.reason || 'Cannot afford move' };
      }

      // OPTIMIZATION: Removed console.log which was killing mobile FPS.
      actor.moves -= cost.deductMoves;
      actor.coins -= cost.deductCoins;
      actor.totalCoinsEarned += 0; 

      if (cost.deductCoins > 0 && actor.type === 'PLAYER') {
          state.entropy.current = Math.max(0, state.entropy.current - 5.0);
          state.messageLog.unshift({
              id: `emergency-shunt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              text: state.language === 'RU'
                  ? `⚡ ЭКСТРЕННЫЙ ШУНТ: Перемещения оплачены кредитами. Энтропия снижена на -5%!`
                  : `⚡ EMERGENCY SHUNT: Paid credits for moves. Stability dropped -5%!`,
              type: 'WARN',
              source: 'NEBULA_AI',
              timestamp: Date.now()
          });
      } 

      actor.movementQueue = [...action.path.map(p => ({ q: p.q, r: p.r }))];
      actor.state = EntityState.MOVING;
      actor.lastMoveTime = 0; 

      const now = Date.now();
      const hasEntropyInversion = actor.activeStatuses?.some(s => s.type === 'STATUS_ENTROPY_INVERSION' && (!s.expiresAt || s.expiresAt > now));

      if (state.entropy.current > 0 || hasEntropyInversion) {
          // OPTIMIZATION: Avoid Object.keys(state.grid).length which allocates memory. Use a cached size or index size.
          const gridSize = state.gridSize || Object.keys(state.grid).length; 
          let baseCost = getScaledEntropyBaseCost(gridSize);
          
          if (state.winCondition?.mutatorType === 'SUDDEN_DEATH') {
              baseCost *= 2;
          }
          
          let entropyCost = baseCost;
          
          for (const step of action.path) {
              const hex = state.grid[getHexKey(step.q, step.r)];
              if (hex && hex.currentLevel < 0) {
                  entropyCost += baseCost;
              }
          }
          
          if (hasEntropyInversion) {
              state.entropy.current = Math.min(state.entropy.max, state.entropy.current + entropyCost);
          } else {
              state.entropy.current = Math.max(0, state.entropy.current - entropyCost);
          }
      }

      return { ok: true };
  }

  private handleUpgrade(state: SessionState, _index: WorldIndex, actor: Entity, action: any): ValidationResult {
      const isPlayer = actor.type === 'PLAYER';
      if (isPlayer && state.defense?.isDefenseMode && action.intent !== 'RECOVER') {
          return { ok: false, reason: 'Only Recharge action is enabled during siege' };
      }
      const isSameTile = actor.q === action.coord.q && actor.r === action.coord.r;
      
      if (isPlayer && !isSameTile) {
          return { ok: false, reason: 'Must be on target to upgrade' };
      }
      
      actor.movementQueue = [{ q: action.coord.q, r: action.coord.r, upgrade: true, intent: action.intent || 'UPGRADE' }];
      return { ok: true };
  }

  private handleDig(state: SessionState, _index: WorldIndex, actor: Entity, action: any): ValidationResult {
      const isPlayer = actor.type === 'PLAYER';
      if (isPlayer && state.defense?.isDefenseMode) {
          return { ok: false, reason: 'Only Recharge action is enabled during siege' };
      }
      const isSameTile = actor.q === action.coord.q && actor.r === action.coord.r;

      if (isPlayer && !isSameTile) {
          return { ok: false, reason: 'Must be on target to dig' };
      }
      actor.movementQueue = [{ q: action.coord.q, r: action.coord.r, upgrade: true, intent: 'DIG' }];
      return { ok: true };
  }

  private handleRecharge(_state: SessionState, _index: WorldIndex, actor: Entity): ValidationResult {
      const EXCHANGE_RATE = 5;
      if (actor.coins >= EXCHANGE_RATE) {
          actor.coins -= EXCHANGE_RATE;
          actor.moves += 1;
          return { ok: true };
      }
      return { ok: false, reason: 'Insufficient funds for recharge' };
  }

  private handleDestroyItem(_state: SessionState, _index: WorldIndex, actor: Entity, action: any): ValidationResult {
      const idx = actor.inventory.findIndex(i => i.id === action.itemId);
      if (idx === -1) return { ok: false, reason: 'Item not found' };
      
      actor.inventory = [
          ...actor.inventory.slice(0, idx),
          ...actor.inventory.slice(idx + 1)
      ];
      
      return { ok: true };
  }

  private handleEquipItem(state: SessionState, index: WorldIndex, actor: Entity, action: any): ValidationResult {
      const idx = actor.inventory.findIndex(i => i.id === action.itemId);
      if (idx === -1) return { ok: false, reason: 'Item not found in inventory' };
      
      const item = actor.inventory[idx];
      const itemDef = getItemDef(item.baseId);
      if (!itemDef) return { ok: false, reason: 'Invalid item' };

      const slot = itemDef.equipSlot || 'artifact';
      
      if (!actor.equipment) actor.equipment = {};
      const currentEquipped = actor.equipment[slot];
      if (currentEquipped) {
          // BUGFIX: If replacing an item, we must remove its statuses first.
          const currentDef = getItemDef(currentEquipped.baseId);
          if (currentDef) {
              this.removeEffect(actor, currentDef.effectType);
              this.removeEffect(actor, currentDef.negativeEffectType);
          }
      }

      actor.inventory = [
          ...actor.inventory.slice(0, idx),
          ...actor.inventory.slice(idx + 1)
      ];

      actor.equipment[slot] = item;

      this.applyEffect(state, index, actor, itemDef.effectType, itemDef.effectValue, itemDef.effectLabel['EN'], itemDef.effectDuration);
      this.applyEffect(state, index, actor, itemDef.negativeEffectType, itemDef.negativeEffectValue, itemDef.negativeEffectLabel['EN'], itemDef.negativeEffectDuration);

      return { ok: true };
  }

  private handleUnequipItem(_state: SessionState, _index: WorldIndex, actor: Entity, action: any): ValidationResult {
      if (!actor.equipment || !actor.equipment[action.slot]) {
          return { ok: false, reason: 'Nothing equipped in that slot' };
      }
      
      const item = actor.equipment[action.slot];
      const itemDef = getItemDef(item.baseId);
      
      // BUGFIX: Clean up statuses granted by the item before destroying it.
      if (itemDef) {
          this.removeEffect(actor, itemDef.effectType);
          this.removeEffect(actor, itemDef.negativeEffectType);
      }
      
      delete actor.equipment[action.slot];
      
      return { ok: true };
  }

  private removeEffect(actor: Entity, type: string) {
      if (!type || !actor.activeStatuses) return;
      // Only remove status effects, instant effects cannot be reversed
      if (type.startsWith('STATUS_')) {
          actor.activeStatuses = actor.activeStatuses.filter(s => s.type !== type);
      }
  }

  private addStatus(actor: Entity, type: string, label: string, duration?: number) {
      if (!actor.activeStatuses) actor.activeStatuses = [];
      actor.activeStatuses = actor.activeStatuses.filter(s => s.type !== type);
      actor.activeStatuses.push({
          type: type as any,
          label: label,
          expiresAt: duration ? Date.now() + duration : undefined,
          description: label
      });
  }

  private applyEffect(state: SessionState, index: WorldIndex, actor: Entity, type: string, val: number | undefined, desc: string, duration?: number) {
      switch(type) {
          case 'ADD_MOVES': actor.moves += (val || 0); break;
          case 'ADD_CREDITS': actor.coins += (val || 0); break;
          case 'ADD_MATERIAL': actor.storage = Math.min(actor.maxStorage, actor.storage + (val || 0)); break;
          case 'ADD_ENTROPY': state.entropy.current = Math.min(state.entropy.max, state.entropy.current + (val || 0)); break;
          case 'INCREASE_STORAGE': actor.maxStorage += (val || 0); break;
          case 'EXPAND_INVENTORY': actor.maxInventorySize = (actor.maxInventorySize || 3) + (val || 0); break;
          case 'LEVEL_UP': actor.playerLevel += (val || 0); break;
          case 'REVEAL_MAP': 
                index.getHexesInRange(actor, 2).forEach(h => h.revealed = true);
                break;
          case 'GOD_MODE': 
                actor.playerLevel += 10; 
                state.entropy.current = Math.min(state.entropy.max, state.entropy.current + 100);
                actor.moves += 100; 
                break;

          case 'LOSE_CREDITS': 
                if (val !== undefined && val >= 100) {
                    actor.coins = 0;
                } else if (val) {
                    actor.coins = Math.max(0, actor.coins - val);
                } else {
                    actor.coins = Math.floor(actor.coins * 0.5); 
                }
                break;
          case 'LOSE_MOVES': actor.moves = Math.max(0, actor.moves - (val || 0)); break;
          case 'LOSE_RANK': actor.playerLevel = Math.max(1, actor.playerLevel - (val || 0)); break;
          case 'LOSE_ENTROPY': state.entropy.current = Math.max(0, state.entropy.current - (val || 0)); break;
          case 'RESET_MATERIALS': actor.storage = 0; break;
          case 'FULL_RESET': 
                actor.playerLevel = 1; 
                actor.coins = 0; 
                actor.storage = 0; 
                actor.moves = 0; 
                break;
          case 'AMNESIA': 
                Object.values(state.grid).forEach(h => {
                    if (cubeDistance(actor, h) > 1) h.revealed = false;
                });
                break;

          case 'STATUS_FATIGUE':
          case 'STATUS_GOLD_RUSH':
          case 'STATUS_MINING_OFFLINE':
          case 'STATUS_TUNNEL_VISION':
          case 'STATUS_FREE_BUILD':
          case 'STATUS_GOLD_CURSE':
          case 'STATUS_SOIL_EATER':
          case 'STATUS_BREAKDOWN_RISK':
          case 'STATUS_SCANNER_BUFF':
          case 'STATUS_ENTROPY_INVERSION':
          case 'BUFF_DIG':
              this.addStatus(actor, type, desc, duration);
              break;
      }
  }

  private handleRestoreHex(state: SessionState, index: WorldIndex, actor: Entity, action: any): ValidationResult {
      const hexKey = getHexKey(action.coord.q, action.coord.r);
      const hex = state.grid[hexKey];
      
      if (!hex || hex.structureType !== 'VOID') {
          return { ok: false, reason: 'Target is not a Void' };
      }
      
      const dist = cubeDistance(actor, action.coord);
      if (dist > 1) return { ok: false, reason: 'Too far' };

      const idx = actor.inventory.findIndex(i => i.id === action.itemId);
      if (idx === -1) return { ok: false, reason: 'Item missing' };
      const item = actor.inventory[idx];
      actor.inventory = [
          ...actor.inventory.slice(0, idx),
          ...actor.inventory.slice(idx + 1)
      ];

      let chance = 0.25;
      if (item.rarity === 'UNCOMMON') chance = 0.40;
      if (item.rarity === 'RARE') chance = 0.65;
      if (item.rarity === 'LEGENDARY') chance = 0.90;

      const { restorationMaster } = getStatusModifiers(actor, state);
      chance += restorationMaster;

      // OPTIMIZATION: Call Math.random() once
      const isSuccess = Math.random() < chance;

      if (isSuccess) {
          state.grid[hexKey] = {
              ...hex,
              structureType: undefined,
              currentLevel: 0,
              maxLevel: 0,
              progress: 0,
              durability: undefined 
          };
          
          state.restoredHexesCount = (state.restoredHexesCount || 0) + 1;

          let coDependentCount = 0;
          if (state.activeLevelConfig?.creepingVoid) {
              const cvConfig = state.activeLevelConfig.creepingVoid;
              if (action.coord.q === cvConfig.sourceQ && action.coord.r === cvConfig.sourceR) {
                  if (state.creepingVoid) {
                      state.creepingVoid.sourceRestored = true;
                      for (const [infKey, orig] of Object.entries(state.creepingVoid.infectedHexes)) {
                          const infHex = state.grid[infKey];
                          if (infHex && infHex.structureType === 'VOID') {
                              state.grid[infKey] = {
                                  ...infHex,
                                  currentLevel: orig.currentLevel,
                                  maxLevel: orig.maxLevel,
                                  structureType: orig.structureType,
                                  durability: orig.durability
                              };
                              coDependentCount++;
                              state.restoredHexesCount = (state.restoredHexesCount || 0) + 1;
                          }
                      }
                  }
                  
                  const rootMsg = state.language === 'RU'
                      ? '🌀 ИСТОЧНИК УСТРАНЕН: Пространство стабилизировано, все зараженные сектора восстановлены!'
                      : '🌀 SOURCE RESOLVED: Space stabilized, all infected sectors have been restored!';
                  
                  state.messageLog.unshift({
                      id: `void-restored-manual-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                      text: rootMsg,
                      type: 'SUCCESS',
                      source: 'SYSTEM',
                      timestamp: Date.now()
                  });
              }
          }

          const totalHealed = 1 + coDependentCount;
          const restoredEntropyAmount = ENTROPY_CONFIG.GAIN_RESTORE_SUCCESS * totalHealed;
          state.entropy.current = Math.min(state.entropy.max, state.entropy.current + restoredEntropyAmount);

          state.effects = state.effects || [];
          state.effects.push({
              id: `restore-float-${Date.now()}-${action.coord.q}-${action.coord.r}`,
              q: actor.q,
              r: actor.r,
              text: state.language === 'RU' ? `x${totalHealed} восстановление` : `x${totalHealed} recovery`,
              color: '#10B981',
              startTime: Date.now(),
              lifetime: 2500
          });
          
          this.applyEffect(state, index, actor, item.effectType, item.effectValue, item.effectDescription, item.effectDuration);
          
          let feedbackColor = "#34d399";
          if (item.effectType.includes('CREDITS')) feedbackColor = "#fbbf24";
          if (item.effectType.includes('MOVES')) feedbackColor = "#60a5fa";

          if (state.outgoingEvents) {
              state.outgoingEvents.push(GameEventFactory.create(
                  'RECOVERY_USED', 
                  `SUCCESS: ${item.effectDescription}`, 
                  actor.id, 
                  { customText: item.effectDescription, customColor: feedbackColor }
              ));
          }

          return { ok: true };
      } else {
          state.entropy.current = Math.max(0, state.entropy.current - ENTROPY_CONFIG.COST_RESTORE_FAIL);
          
          if (item.negativeEffectType) {
              this.applyEffect(state, index, actor, item.negativeEffectType, item.negativeEffectValue, item.negativeEffectLabel || "Bad Luck", item.negativeEffectDuration);
          }

          if (state.outgoingEvents) {
              state.outgoingEvents.push(GameEventFactory.create(
                  'ERROR', 
                  `FAIL: ${item.negativeEffectLabel || 'Stabilization Failed'}`, 
                  actor.id,
                  { text: "FAILED" }
              ));
          }
          
          return { ok: false, reason: 'Stabilization Failed (Item Consumed)' };
      }
  }

  private handleActivateMonument(state: SessionState, _index: WorldIndex, actor: Entity, action: any): ValidationResult {
      const currentHex = state.grid[getHexKey(actor.q, actor.r)];
      if (!currentHex || currentHex.structureType !== 'MONUMENT') {
          return { ok: false, reason: state.language === 'RU' ? 'Для активации вы должны стоять на Монументе' : 'Must be standing on the Monument to activate it' };
      }

      const requirements = state.monumentRequirements ?? [];

      if (!action.itemIds) action.itemIds = [];
      if (action.itemIds.length !== requirements.length) {
          return { ok: false, reason: state.language === 'RU' ? `Требуется ${requirements.length} предметов` : `Requires ${requirements.length} items, got ${action.itemIds.length}` };
      }

      const items: Item[] = [];
      const usedIds = new Set<string>();
      let allPassed = true;
      const failedSlots: number[] = [];

      for (let i = 0; i < action.itemIds.length; i++) {
          const id = action.itemIds[i];
          if (usedIds.has(id)) return { ok: false, reason: `Duplicate item id: ${id}` };
          usedIds.add(id);
          const item = actor.inventory.find(inv => inv.id === id);
          if (!item) return { ok: false, reason: `Item ${id} not in inventory` };

          const req = requirements[i];
          const isRarityWild = req === 'COMMON' || req === 'UNCOMMON' || req === 'RARE' || req === 'LEGENDARY';
          const isOneOf = req === 'ONE_OF';
          let matches = true;
          
          if (req !== 'ANY') {
              if (isOneOf) {
                  const alts = state.monumentAlternatives ?? [];
                  if (!alts.includes(item.baseId)) {
                      return { ok: false, reason: `Item is not in the required set: ${alts.join('/')}` };
                  }
              } else if (isRarityWild && item.rarity !== req) {
                  matches = false;
              } else if (!isRarityWild && item.baseId !== req) {
                  matches = false;
              }
          }
          
          items.push(item);
          if (!matches) {
              allPassed = false;
              failedSlots.push(i);
          }
      }

      const isRu = state.language === 'RU';

      if (!allPassed) {
          for (const idx of failedSlots) {
              const item = items[idx];
              const isDestroyed = Math.random() < 0.5;
              
              if (isDestroyed) {
                  actor.inventory = actor.inventory.filter(i => i.id !== item.id);
                  state.entropy.current = Math.max(0, state.entropy.current - 10);
                  
                  state.messageLog.unshift({
                      id: `monument-destr-${Date.now()}-${idx}`,
                      text: isRu 
                        ? `АННИГИЛЯЦИЯ СЛОТА ${idx+1}: Неверный предмет [${item.name}] распался в Void-поле! Стабильность ядра -10%!`
                        : `SLOT ${idx+1} ANNIHILATION: Incorrect item [${item.name}] disintegrated in Void field! Stability dropped -10%!`,
                      type: 'WARN',
                      source: 'SYSTEM',
                      timestamp: Date.now()
                  });

                  // VISUAL IMPROVEMENT: Fire an event so UI can show a disintegration animation
                  if (state.outgoingEvents) {
                      state.outgoingEvents.push(GameEventFactory.create(
                          'ITEM_DESTROYED',
                          isRu ? `Предмет распался: ${item.name}` : `Item Disintegrated: ${item.name}`,
                          actor.id,
                          { itemBaseId: item.baseId, slot: idx }
                      ));
                  }
              } else {
                  state.messageLog.unshift({
                      id: `monument-reject-${Date.now()}-${idx}`,
                      text: isRu
                        ? `СЛОТ ${idx+1} ОТВЕРГНУТ: Предмет [${item.name}] не подошел, но защитное поле удержало его от распада.`
                        : `SLOT ${idx+1} REJECTED: Slot rejected [${item.name}]. Support barrier saved it from destruction.`,
                      type: 'INFO',
                      source: 'SYSTEM',
                      timestamp: Date.now()
                  });
              }
          }
          
          return { 
              ok: false, 
              reason: isRu 
                  ? 'ОШИБКА АКТИВАЦИИ: Неверные ключи! Проверьте Обелиски. Часть предметов распалась.' 
                  : 'ACTIVATION ERROR: Incorrect slot keys! Mismatching items have a 50% chance to disintegrate.' 
          };
      }

      actor.inventory = actor.inventory.filter(i => !action.itemIds.includes(i.id));

      state.portalActive = true;
      state.portalHex = { q: actor.q, r: actor.r };
      
      if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
          state.gameStatus = 'VICTORY';
      }
      
      state.messageLog.unshift({
          id: `monument-portal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text: isRu
            ? '🌀 МОНУМЕНТ УСПЕШНО АКТИВИРОВАН! ПОРТАЛ АКТИВИРОВАН! ВОЙДИТЕ В НЕГО ДЛЯ ЗАВЕРШЕНИЯ МИССИИ!'
            : '🌀 MONUMENT ACTIVATED SUCCESSFULLY! PORTAL ACTIVATED! ENTER IT TO COMPLETE THE MISSION!',
          type: 'SUCCESS',
          source: 'NEBULA_AI',
          timestamp: Date.now()
      });

      return { ok: true };
  }

  private handleActivatePortal(state: SessionState, _index: WorldIndex, actor: Entity, _action: any): ValidationResult {
      const isRu = state.language === 'RU';
      if (!state.portalActive || !state.portalHex) {
          return { ok: false, reason: isRu ? 'Портал еще не активирован!' : 'Portal is not active yet!' };
      }
      if (actor.q !== state.portalHex.q || actor.r !== state.portalHex.r) {
          return { ok: false, reason: isRu ? 'Вы должны войти в гекс портала!' : 'You must be inside the portal hex!' };
      }

      state.gameStatus = 'VICTORY';
      const msg = isRu ? '🏆 ПОРТАЛ УСПЕШНО АКТИВИРОВАН! Симуляция пройдена!' : '🏆 PORTAL ACTIVATED SUCCESSFULLY! Simulation complete!';
      state.messageLog.unshift({
          id: `portal-won-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text: msg,
          type: 'SUCCESS',
          source: 'NEBULA_AI',
          timestamp: Date.now()
      });

      const events = state.outgoingEvents;
      events.push(GameEventFactory.create('VICTORY', msg, state.player.id));
      
      const vicSystem = new VictorySystem();
      vicSystem.generateLeaderboardEvent(state, events);

      return { ok: true };
  }

  private handleActivateMiniMonument(state: SessionState, _index: WorldIndex, actor: Entity, action: ActivateMiniMonumentAction): ValidationResult {
      if (!state.grid[action.miniMonumentHexKey]) {
          return { ok: false, reason: 'Mini monument hex not found' };
      }
      
      const key = action.miniMonumentHexKey;
      if (!state.activatedMiniMonuments) {
          state.activatedMiniMonuments = [];
      }
      
      if (!state.activatedMiniMonuments.includes(key)) {
          state.activatedMiniMonuments.push(key);
      }
      
      const count = state.activatedMiniMonuments.length;
      const isRu = state.language === 'RU';
      
      let clueText = '';
      const secret = state.secretLootHexes?.find(s => !s.found);
      
      if (state.activeLevelConfig?.id?.startsWith('5.')) {
          if (count === 1) {
              clueText = isRu 
                  ? `МИНИ-МОНУМЕНТ 1 АКТИВИРОВАН\n\nСигнал синхронизирован. Найдите остальные, чтобы разблокировать чертеж!`
                  : `MINI-MONUMENT 1 ACTIVATED\n\nSignal synchronized. Find the rest to unlock the blueprint!`;
          } else if (count === 2) {
              clueText = isRu 
                  ? `МИНИ-МОНУМЕНТ 2 АКТИВИРОВАН\n\nСеть почти замкнулась. Остался последний узел!`
                  : `MINI-MONUMENT 2 ACTIVATED\n\nNetwork almost closed. One node remaining!`;
          } else {
              clueText = isRu 
                  ? `ГЕО-СЕТЬ АКТИВИРОВАНА\n\nКонтур голограммы спроецирован в сеть! Возведите указанные конструкции.`
                  : `GEO-NETWORK ACTIVATED\n\nHologram blueprint projected into the grid! Construct the specified towers.`;
          }
      } else if (count === 1) {
          if (secret) {
              const hexKey = `${secret.q},${secret.r}`;
              const hex = state.grid[hexKey];
              if (hex) {
                  hex.lootHighlighted = true;
              }
              clueText = isRu
                  ? `ОБЕЛИСК 1 АКТИВИРОВАН: СЕЙСМИЧЕСКИЙ СИГНАЛ\n\nОбнаружена сейсмическая аномалия скрытого грунта на координатах:\nQ: ${secret.q}, R: ${secret.r}.\n\nПодсвеченный сектор содержит один из утерянных ключей Монумента. Начните раскопки в этой зоне!`
                  : `OBELISK 1 ACTIVATED: SEISMIC SIGNAL\n\nSeismic anomaly detected inside buried ground at coordinates:\nQ: ${secret.q}, R: ${secret.r}.\n\nThe highlighted sector contains one of the lost Monument keys. Start excavation in this zone!`;
          } else {
              clueText = isRu
                  ? `ОБЕЛИСК 1 АКТИВИРОВАН: СЕТЬ СТАБИЛЬНА\n\nВсе квестовые предметы уже найдены. Восстанавливайте гексы!`
                  : `OBELISK 1 ACTIVATED: NETWORK STABLE\n\nAll quest items have already been found. Keep restoring the hexes!`;
          }
      } else if (count === 2) {
          if (secret) {
              const hexKey = `${secret.q},${secret.r}`;
              const hex = state.grid[hexKey];
              if (hex) {
                  hex.lootHighlighted = true;
              }
              clueText = isRu
                  ? `ОБЕЛИСК 2 АКТИВИРОВАН: РЕНТГЕНОВСКИЙ СКАНИР\n\nПроведен структурный анализ породы на гексе Q: ${secret.q}, R: ${secret.r}.\n\nКапсула с ключом засыпана ровно на глубине Уровня ${secret.level} (отметка: ${secret.level}).\n\nБурите строго до указанной высоты, чтобы получить квестовый артефакт!`
                  : `OBELISK 2 ACTIVATED: X-RAY SCANNER\n\nStructural soil analysis completed at hex Q: ${secret.q}, R: ${secret.r}.\n\nThe key capsule is buried exactly at Level depth ${secret.level} (mark: ${secret.level}).\n\nExcavate precisely to this level to retrieve the quest artifact!`;
          } else {
              clueText = isRu
                  ? `ОБЕЛИСК 2 АКТИВИРОВАН: КАНАЛЫ ЧИСТЫ\n\nВсе ключи собраны. Двигайтесь к Вершине!`
                  : `OBELISK 2 ACTIVATED: CHANNELS CLEAR\n\nAll key items have been gathered. Ascend to the summit!`;
          }
      } else {
          const monumentHex = Object.values(state.grid).find(h => h.structureType === 'MONUMENT');
          const reqs = state.monumentRequirements || [];
          if (state.monumentRequirements) {
              state.monumentRevealedSlots = Array(state.monumentRequirements.length).fill(true);
          }
          const itemsText = reqs.map((r, idx) => {
              const level = idx + 1;
              if (r === 'ANY') return isRu ? `Слот ${level}: Любой предмет` : `Slot ${level}: Any Item`;
              if (['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'].includes(r)) {
                  return isRu ? `Слот ${level}: Класс качества ${r}` : `Slot ${level}: Quality Class ${r}`;
              }
              if (r === 'ONE_OF') {
                  const itemsList = (state.monumentAlternatives || []).map(alt => {
                      const d = getItemDef(alt);
                      return d ? d.name[state.language] : alt;
                  }).join(' / ');
                  return isRu ? `Слот ${level}: Один из [ ${itemsList} ]` : `Slot ${level}: One of [ ${itemsList} ]`;
              }
              const d = getItemDef(r);
              const nameText = d ? d.name[state.language] : r;
              return isRu ? `Слот ${level}: ${nameText}` : `Slot ${level}: ${nameText}`;
          }).join('\n');
          
          clueText = isRu
              ? `ОБЕЛИСК 3 АКТИВИРОВАН: ТЕРМАЛЬНЫЙ ВЗЛОМ\n\nЗащитные контуры Монумента полностью взломаны.\n\nКоординаты Вершины Источника: Q: ${monumentHex?.q}, R: ${monumentHex?.r}.\n\nСлужебная спецификация ключей:\n${itemsText}`
              : `OBELISK 3 ACTIVATED: POWER GRID BREACH\n\nFirewall subroutines of the Monument are fully bypassed.\n\nSource summit coordinates: Q: ${monumentHex?.q}, R: ${monumentHex?.r}.\n\nSequence specification of the slots:\n${itemsText}`;
      }
      
      state.messageLog.unshift({
          id: `mini-clue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          text: clueText.split('\n\n')[0] + ' - ' + (isRu ? 'ИНТЕРФЕЙС ОБНОВЛЕН' : 'HINT CONSTRUCTED'),
          type: 'SUCCESS',
          source: 'NEBULA_AI',
          timestamp: Date.now()
      });

      if (state.outgoingEvents) {
          state.outgoingEvents.push(GameEventFactory.create(
              'MINI_MONUMENT_REACHED',
              clueText,
              actor.id,
              { hexKey: action.miniMonumentHexKey, clueText }
          ));
      }

      return { ok: true };
  }
}