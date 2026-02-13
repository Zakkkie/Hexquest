
import { GameAction, EntityState, ValidationResult, SessionState, Entity, MoveAction } from '../types';
import { WorldIndex } from './WorldIndex';
import { getHexKey, cubeDistance } from '../services/hexUtils';
import { ENTROPY_CONFIG } from '../rules/config';
import { calculateMovementCost } from '../rules/movement';

/**
 * ActionProcessor is now a STATELESS service.
 * It operates on the state object passed into its methods.
 */
export class ActionProcessor {
  constructor() {}
  
  public validateAction(state: SessionState, index: WorldIndex, actorId: string, action: GameAction): ValidationResult {
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

      switch (action.type) {
          case 'MOVE':
              return this.handleMove(state, index, actor, action);
          case 'UPGRADE':
              return this.handleUpgrade(state, index, actor, action);
          case 'DIG':
              return this.handleDig(state, index, actor, action);
          case 'RECHARGE_MOVE':
              return this.handleRecharge(state, actor);
          case 'DESTROY_ITEM':
              return this.handleDestroyItem(state, actor, action);
          case 'RESTORE_HEX':
              return this.handleRestoreHex(state, actor, action);
          case 'ACTIVATE_MONUMENT':
              return this.handleActivateMonument(state, actor, action);
          case 'WAIT':
              // Do nothing, just consume turn/cycle if needed
              return { ok: true };
          default:
              return { ok: false, reason: 'Unknown Action' };
      }
  }

  private handleMove(state: SessionState, index: WorldIndex, actor: Entity, action: MoveAction): ValidationResult {
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
      actor.lastMoveTime = Date.now(); 

      // Entropy Logic
      if (state.entropy.current > 0) {
          state.entropy.current = Math.max(0, state.entropy.current - ENTROPY_CONFIG.COST_ACTION_BASE);
      }

      return { ok: true };
  }

  private handleUpgrade(state: SessionState, index: WorldIndex, actor: Entity, action: any): ValidationResult {
      if (actor.q !== action.coord.q || actor.r !== action.coord.r) {
          return { ok: false, reason: 'Must be on target to upgrade' };
      }
      
      actor.movementQueue = [{ q: action.coord.q, r: action.coord.r, upgrade: true, intent: action.intent || 'UPGRADE' }];
      return { ok: true };
  }

  private handleDig(state: SessionState, index: WorldIndex, actor: Entity, action: any): ValidationResult {
      if (actor.q !== action.coord.q || actor.r !== action.coord.r) {
          return { ok: false, reason: 'Must be on target to dig' };
      }
      actor.movementQueue = [{ q: action.coord.q, r: action.coord.r, upgrade: true, intent: 'DIG' }];
      return { ok: true };
  }

  private handleRecharge(state: SessionState, actor: Entity): ValidationResult {
      const EXCHANGE_RATE = 5;
      if (actor.coins >= EXCHANGE_RATE) {
          actor.coins -= EXCHANGE_RATE;
          actor.moves += 1;
          return { ok: true };
      }
      return { ok: false, reason: 'Insufficient funds for recharge' };
  }

  private handleDestroyItem(state: SessionState, actor: Entity, action: any): ValidationResult {
      const idx = actor.inventory.findIndex(i => i.id === action.itemId);
      if (idx === -1) return { ok: false, reason: 'Item not found' };
      
      const item = actor.inventory[idx];
      actor.inventory.splice(idx, 1);
      
      // Scrap value
      const scrap = Math.floor(item.value * 0.1);
      actor.coins += scrap;
      
      return { ok: true };
  }

  private handleRestoreHex(state: SessionState, actor: Entity, action: any): ValidationResult {
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
      actor.inventory.splice(idx, 1);

      let chance = 0.25;
      if (item.rarity === 'UNCOMMON') chance = 0.50;
      if (item.rarity === 'RARE') chance = 0.75;
      if (item.rarity === 'LEGENDARY') chance = 1.00;

      if (Math.random() < chance) {
          state.grid[hexKey] = {
              ...hex,
              structureType: undefined,
              currentLevel: 0,
              maxLevel: 0,
              progress: 0,
              durability: undefined 
          };
          state.entropy.current = Math.min(state.entropy.max, state.entropy.current + ENTROPY_CONFIG.GAIN_RESTORE_SUCCESS);
          return { ok: true };
      } else {
          state.entropy.current = Math.max(0, state.entropy.current - ENTROPY_CONFIG.COST_RESTORE_FAIL);
          return { ok: false, reason: 'Stabilization Failed (Item Consumed)' };
      }
  }

  private handleActivateMonument(state: SessionState, actor: Entity, action: any): ValidationResult {
      if (!action.itemIds || action.itemIds.length !== 3) return { ok: false, reason: 'Requires 3 Keys' };
      
      const difficulty = state.difficulty;
      const items = [];
      
      for (const id of action.itemIds) {
          const item = actor.inventory.find(i => i.id === id);
          if (!item) return { ok: false, reason: `Key ${id} missing` };
          items.push(item);
      }

      for (const item of items) {
          if (difficulty === 'MEDIUM' && item.rarity === 'COMMON') return { ok: false, reason: 'Need Uncommon+ Keys' };
          if (difficulty === 'HARD' && (item.rarity === 'COMMON' || item.rarity === 'UNCOMMON')) return { ok: false, reason: 'Need Rare+ Keys' };
      }

      actor.inventory = actor.inventory.filter(i => !action.itemIds.includes(i.id));
      state.gameStatus = 'VICTORY';
      
      return { ok: true };
  }
}
