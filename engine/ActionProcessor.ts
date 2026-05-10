
import { GameAction, EntityState, ValidationResult, SessionState, Entity, MoveAction, Item } from '../types';
import { WorldIndex } from './WorldIndex';
import { getHexKey, cubeDistance } from '../services/hexUtils';
import { ENTROPY_CONFIG } from '../rules/config';
import { calculateMovementCost } from '../rules/movement';
import { GameEventFactory } from './events';

/**
 * ActionProcessor is now a STATELESS service.
 * It operates on the state object passed into its methods.
 */
export class ActionProcessor {
  constructor() {}
  
  public validateAction(state: SessionState, _index: WorldIndex, actorId: string, action: GameAction): ValidationResult {
    const actor = state.player.id === actorId ? state.player : state.bots.find(b => b.id === actorId);
    if (!actor) return { ok: false, reason: 'Entity not found' };

    // CAMPAIGN HOOK: Check if the current level has custom validation rules
    if (state.activeLevelConfig?.hooks?.onBeforeAction) {
        const hookResult = state.activeLevelConfig.hooks.onBeforeAction(state, action);
        if (hookResult && !hookResult.ok) {
            return hookResult;
        }
    }

    if (action.stateVersion !== undefined && action.stateVersion !== state.stateVersion) {
         return { ok: false, reason: `STALE STATE (v${action.stateVersion} vs v${state.stateVersion})` };
    }

    if (actor.state === EntityState.LOCKED) return { ok: false, reason: 'Actor Locked' };
    
    // Check if actor is busy moving (unless it's a Recharge action or Wait)
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

      // Clean expired statuses before action
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
          case 'RESTORE_HEX':
              result = this.handleRestoreHex(state, index, actor, action); break;
          case 'ACTIVATE_MONUMENT':
              result = this.handleActivateMonument(state, index, actor, action); break;
          case 'ACTIVATE_MINI_MONUMENT':
              result = this.handleActivateMiniMonument(state, index, actor, action as any); break;
          case 'VISIT_POI':
              result = this.handleVisitPoi(state, index, actor, action); break;
          case 'WAIT':
              result = { ok: true }; break;
          default:
              return { ok: false, reason: 'Unknown Action' };
      }

      return result;
  }

  private handleMove(state: SessionState, _index: WorldIndex, actor: Entity, action: MoveAction): ValidationResult {
      // Validate Path
      const cost = calculateMovementCost(actor, action.path, state.grid);
      if (!cost.canAfford) {
          return { ok: false, reason: cost.reason || 'Cannot afford move' };
      }

      // Deduct Cost
      actor.moves -= cost.deductMoves;
      actor.coins -= cost.deductCoins;
      actor.totalCoinsEarned += 0; 

      // Queue Movement
      actor.movementQueue = [...action.path.map(p => ({ q: p.q, r: p.r }))];
      actor.state = EntityState.MOVING;
      
      // FIX: Set lastMoveTime to 0 ensures the MovementSystem processes the first step immediately
      // instead of waiting for the throttle interval (650ms).
      actor.lastMoveTime = 0; 

      // Entropy Logic (Movement tax)
      // Check for Entropy Inversion status
      const now = Date.now();
      const hasEntropyInversion = actor.activeStatuses?.some(s => s.type === 'STATUS_ENTROPY_INVERSION' && (!s.expiresAt || s.expiresAt > now));

      if (state.entropy.current > 0 || hasEntropyInversion) {
          let entropyCost = ENTROPY_CONFIG.COST_ACTION_BASE;
          
          // Iterate path to detect negative levels and increase tax
          for (const step of action.path) {
              const hex = state.grid[getHexKey(step.q, step.r)];
              if (hex && hex.currentLevel < 0) {
                  // Double the entropy impact for stepping on negative hexes
                  entropyCost += ENTROPY_CONFIG.COST_ACTION_BASE;
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

  private handleUpgrade(_state: SessionState, _index: WorldIndex, actor: Entity, action: any): ValidationResult {
      if (actor.q !== action.coord.q || actor.r !== action.coord.r) {
          return { ok: false, reason: 'Must be on target to upgrade' };
      }
      
      actor.movementQueue = [{ q: action.coord.q, r: action.coord.r, upgrade: true, intent: action.intent || 'UPGRADE' }];
      return { ok: true };
  }

  private handleDig(_state: SessionState, _index: WorldIndex, actor: Entity, action: any): ValidationResult {
      if (actor.q !== action.coord.q || actor.r !== action.coord.r) {
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
      
      // Removed scrap value logic as requested - items have no coin value on disposal
      
      return { ok: true };
  }

  private addStatus(actor: Entity, type: string, label: string, duration?: number) {
      if (!actor.activeStatuses) actor.activeStatuses = [];
      // Remove existing of same type
      actor.activeStatuses = actor.activeStatuses.filter(s => s.type !== type);
      actor.activeStatuses.push({
          type: type as any,
          label: label,
          expiresAt: duration ? Date.now() + duration : undefined, // Explicit undefined means permanent/very long
          description: label
      });
  }

  private applyEffect(state: SessionState, index: WorldIndex, actor: Entity, type: string, val: number | undefined, desc: string, duration?: number) {
      switch(type) {
          // --- INSTANT EFFECTS ---
          case 'ADD_MOVES': actor.moves += (val || 0); break;
          case 'ADD_CREDITS': actor.coins += (val || 0); break;
          case 'ADD_MATERIAL': actor.storage = Math.min(actor.maxStorage, actor.storage + (val || 0)); break;
          case 'ADD_ENTROPY': state.entropy.current = Math.min(state.entropy.max, state.entropy.current + (val || 0)); break;
          case 'INCREASE_STORAGE': actor.maxStorage += (val || 0); break;
          case 'EXPAND_INVENTORY': actor.maxInventorySize = (actor.maxInventorySize || 3) + (val || 0); break;
          case 'LEVEL_UP': actor.playerLevel += (val || 0); break;
          case 'REVEAL_MAP': 
                // Reveal fog around player radius 2
                index.getHexesInRange(actor, 2).forEach(h => h.revealed = true);
                break;
          case 'GOD_MODE': 
                // Apex Core: +10 Ranks, +100 Entropy, +100 Moves (No Coins)
                actor.playerLevel += 10; 
                state.entropy.current = Math.min(state.entropy.max, state.entropy.current + 100);
                actor.moves += 100; 
                break;

          // --- NEGATIVE INSTANT ---
          case 'LOSE_CREDITS': 
                if (val !== undefined && val >= 100) {
                    actor.coins = 0; // 100% Loss
                } else if (val) {
                    actor.coins = Math.max(0, actor.coins - val);
                } else {
                    // "Greed" Logic fallback: 50% loss if value not specified
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
                // Reset Fog
                Object.values(state.grid).forEach(h => {
                    if (cubeDistance(actor, h) > 1) h.revealed = false;
                });
                break;

          // --- STATUS EFFECTS (Both Pos & Neg) ---
          case 'STATUS_FATIGUE':
          case 'STATUS_GOLD_RUSH':
          case 'STATUS_MINING_OFFLINE':
          case 'STATUS_TUNNEL_VISION':
          case 'STATUS_FREE_BUILD':
          case 'STATUS_GOLD_CURSE':
          case 'STATUS_SOIL_EATER':
          case 'STATUS_BREAKDOWN_RISK':
          case 'STATUS_SCANNER_BUFF':
          case 'STATUS_ENTROPY_INVERSION': // New
          case 'BUFF_DIG': // Mapped to gold rush internally usually, or custom
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

      // Updated Probability Logic
      let chance = 0.25; // Common (Default)
      if (item.rarity === 'UNCOMMON') chance = 0.40;
      if (item.rarity === 'RARE') chance = 0.65;
      if (item.rarity === 'LEGENDARY') chance = 0.90;

      if (Math.random() < chance) {
          // --- SUCCESS ---
          state.grid[hexKey] = {
              ...hex,
              structureType: undefined,
              currentLevel: 0,
              maxLevel: 0,
              progress: 0,
              durability: undefined 
          };
          
          state.entropy.current = Math.min(state.entropy.max, state.entropy.current + ENTROPY_CONFIG.GAIN_RESTORE_SUCCESS);
          
          // APPLY POSITIVE
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
          // --- FAILURE ---
          state.entropy.current = Math.max(0, state.entropy.current - ENTROPY_CONFIG.COST_RESTORE_FAIL);
          
          // APPLY NEGATIVE
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
      // Actor must be standing on a Monument hex to activate it
      const currentHex = state.grid[getHexKey(actor.q, actor.r)];
      if (!currentHex || currentHex.structureType !== 'MONUMENT') {
          return { ok: false, reason: 'Must be standing on the Monument to activate it' };
      }

      const requirements = state.monumentRequirements ?? [];

      // Validate item count matches requirements
      if (!action.itemIds) action.itemIds = [];
      if (action.itemIds.length !== requirements.length) {
          return { ok: false, reason: `Requires ${requirements.length} items, got ${action.itemIds.length}` };
      }

      // Validate each item exists, is unique, and matches requirement
      const items: Item[] = [];
      const usedIds = new Set<string>();
      for (let i = 0; i < action.itemIds.length; i++) {
          const id = action.itemIds[i];
          if (usedIds.has(id)) return { ok: false, reason: `Duplicate item id: ${id}` };
          usedIds.add(id);
          const item = actor.inventory.find(inv => inv.id === id);
          if (!item) return { ok: false, reason: `Item ${id} not in inventory` };

          // Check if item matches requirement: ANY wildcard, rarity wildcard, ONE_OF, or specific baseId
          const req = requirements[i];
          const isRarityWild = req === 'COMMON' || req === 'UNCOMMON' || req === 'RARE' || req === 'LEGENDARY';
          const isOneOf = req === 'ONE_OF';
          if (req !== 'ANY') {
              if (isOneOf) {
                  const alts = state.monumentAlternatives ?? [];
                  if (!alts.includes(item.baseId)) {
                      return { ok: false, reason: `Slot ${i+1}: item not in the required set` };
                  }
              } else if (isRarityWild && item.rarity !== req) {
                  return { ok: false, reason: `Slot ${i+1}: need ${req} item, got ${item.rarity}` };
              } else if (!isRarityWild && item.baseId !== req) {
                  return { ok: false, reason: `Slot ${i+1}: need ${req}, got ${item.baseId}` };
              }
          }
          items.push(item);
      }

      // Remove used items from inventory
      actor.inventory = actor.inventory.filter(i => !action.itemIds.includes(i.id));

      // Victory!
      state.gameStatus = 'VICTORY';

      return { ok: true };
  }

  private handleVisitPoi(state: SessionState, _index: WorldIndex, actor: Entity, _action: any): ValidationResult {
      const currentHex = state.grid[getHexKey(actor.q, actor.r)];
      if (!currentHex || !currentHex.poiType) {
          return { ok: false, reason: 'No Point of Interest here' };
      }

      const poiType = currentHex.poiType;
      
      // Handle different POI types
      if (poiType.startsWith('RIFT')) {
          // Rifts lead to dungeons (Overworld events or special campaign triggers)
          if (state.outgoingEvents) {
              state.outgoingEvents.push(GameEventFactory.create(
                  'MONUMENT_REACHED', 
                  `Entering Rift: ${poiType}`, 
                  actor.id,
                  { poiType }
              ));
          }
          // For now, just grant some moves and credits as a "discovery" reward
          actor.moves += 5;
          actor.coins += 50;
      } else if (poiType.startsWith('city_')) {
          // City buildings
          if (state.outgoingEvents) {
              state.outgoingEvents.push(GameEventFactory.create(
                  'MONUMENT_REACHED', 
                  `Visited ${poiType.replace('city_', '').replace('_', ' ')}`, 
                  actor.id,
                  { poiType }
              ));
          }
      }

      return { ok: true };
  }

  private handleActivateMiniMonument(state: SessionState, _index: WorldIndex, actor: Entity, action: any): ValidationResult {
      if (!state.grid[action.miniMonumentHexKey]) {
          return { ok: false, reason: 'Mini monument hex not found' };
      }
      
      if (state.outgoingEvents) {
          state.outgoingEvents.push(GameEventFactory.create(
              'MONUMENT_REACHED',
              'Mini Monument Activated!',
              actor.id,
              { hexKey: action.miniMonumentHexKey }
          ));
      }

      return { ok: true };
  }
}
