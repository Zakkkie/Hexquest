
import { GameAction, EntityType, EntityState, ValidationResult, SessionState, BotLogEntry, ItemRarity } from '../types';
import { WorldIndex } from './WorldIndex';
import { getHexKey, cubeDistance } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { GAME_CONFIG, SAFETY_CONFIG, DIFFICULTY_SETTINGS } from '../rules/config';
import { calculateMovementCost } from '../rules/movement';
import { GameEventFactory } from './events';

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
    if (actor.state === EntityState.MOVING && action.type === 'MOVE') return { ok: false, reason: 'Already moving' };

    switch (action.type) {
        case 'UPGRADE': {
            const key = getHexKey(action.coord.q, action.coord.r);
            const hex = state.grid[key];
            if (!hex) return { ok: false, reason: 'Invalid Coord' };

            // Special Case: RECOVER intent.
            if (action.intent === 'RECOVER') {
                return { ok: true };
            }

            // Normal UPGRADE Logic
            const neighbors = index.getValidNeighbors(action.coord.q, action.coord.r).map(h => ({q:h.q, r:h.r}));
            const occupied = index.getOccupiedHexesList();
            const queueSize = DIFFICULTY_SETTINGS[state.difficulty]?.queueSize || 3;

            const check = checkGrowthCondition(hex, actor, neighbors, state.grid, occupied, queueSize);
            if (!check.canGrow) return { ok: false, reason: check.reason };
            break;
        }
        case 'DIG': {
            const key = getHexKey(action.coord.q, action.coord.r);
            const hex = state.grid[key];
            if (!hex) return { ok: false, reason: 'Invalid Coord' };

            const neighbors = index.getValidNeighbors(action.coord.q, action.coord.r).map(h => ({q:h.q, r:h.r}));
            const check = checkDigCondition(hex, actor, neighbors, state.grid);
            if (!check.canGrow) return { ok: false, reason: check.reason };
            break;
        }
        case 'MOVE': {
            if (action.path.length === 0) return { ok: false, reason: 'Empty Path' };
            
            // SECURITY CHECK: Path Length Limit
            if (action.path.length > SAFETY_CONFIG.MAX_PATH_LENGTH) {
                return { ok: false, reason: 'Path too long (Safety Limit)' };
            }

            const destination = action.path[action.path.length - 1];
            const entityAtDest = index.getEntityAt(destination.q, destination.r);
            if (entityAtDest && entityAtDest.id !== actor.id) {
                return { ok: false, reason: `Destination (${destination.q},${destination.r}) is occupied by ${entityAtDest.id}` };
            }

            // CENTRALIZED COST CHECK
            const costResult = calculateMovementCost(actor, action.path, state.grid);
            if (!costResult.canAfford) {
                return { ok: false, reason: costResult.reason || 'Insufficient funds' };
            }
            break;
        }
        case 'RECHARGE_MOVE': {
            if (actor.coins < GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE) {
                return { ok: false, reason: 'Insufficient credits for recharge.' };
            }
            break;
        }
        case 'DESTROY_ITEM': {
            if (!actor.inventory || !actor.inventory.some(i => i.id === action.itemId)) {
                return { ok: false, reason: 'Item not found in inventory' };
            }
            break;
        }
        case 'RESTORE_HEX': {
            const key = getHexKey(action.coord.q, action.coord.r);
            const hex = state.grid[key];
            if (!hex) return { ok: false, reason: 'Target does not exist' };
            if (hex.structureType !== 'VOID') return { ok: false, reason: 'Target is not a VOID hex' };
            
            // Distance Check: Must be adjacent (dist 1)
            const dist = cubeDistance({q: actor.q, r: actor.r}, action.coord);
            if (dist > 1) return { ok: false, reason: 'Target too far (Must be adjacent)' };
            
            // Item Ownership Check
            if (!actor.inventory || !actor.inventory.some(i => i.id === action.itemId)) {
                return { ok: false, reason: 'Item not in inventory' };
            }
            break;
        }
        case 'ACTIVATE_MONUMENT': {
            // Must be standing on a Monument
            const key = getHexKey(actor.q, actor.r);
            const hex = state.grid[key];
            if (!hex || hex.structureType !== 'MONUMENT') {
                return { ok: false, reason: 'Not standing on a Monument' };
            }
            
            // Must have 3 items provided
            if (action.itemIds.length !== 3) {
                return { ok: false, reason: 'Requires 3 items' };
            }
            
            // Check ownership of all items
            if (!actor.inventory) return { ok: false, reason: 'No inventory' };
            for (const id of action.itemIds) {
                if (!actor.inventory.some(i => i.id === id)) {
                    return { ok: false, reason: 'Item missing from inventory' };
                }
            }
            
            // Rule: Rarity Check based on Difficulty
            const difficulty = state.difficulty;

            for (const id of action.itemIds) {
                const item = actor.inventory.find(i => i.id === id);
                if (!item) continue;
                
                if (difficulty === 'HARD') {
                    // Hard: Strict (Rare+)
                    if (item.rarity === 'COMMON' || item.rarity === 'UNCOMMON') {
                        return { ok: false, reason: 'HARD MODE: Keys must be RARE or LEGENDARY.' };
                    }
                } else if (difficulty === 'MEDIUM') {
                    // Medium: Uncommon+
                    if (item.rarity === 'COMMON') {
                        return { ok: false, reason: 'MEDIUM MODE: Keys must be UNCOMMON or better.' };
                    }
                }
                // EASY: Accepts ANY rarity (Common, Uncommon, Rare, Legendary).
            }
            break;
        }
    }

    return { ok: true };
  }

  /**
   * Applies an action by MUTATING the passed-in state object.
   * This is safe because the GameEngine provides a deep copy.
   */
  public applyAction(state: SessionState, index: WorldIndex, actorId: string, action: GameAction): ValidationResult {
    const validation = this.validateAction(state, index, actorId, action);
    const actor = state.player.id === actorId ? state.player : state.bots.find(b => b.id === actorId);
    
    if (!validation.ok) {
        if (actor && actor.type === EntityType.BOT) {
            if (!actor.memory) actor.memory = { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 };
            actor.memory.lastActionFailed = true;
            actor.memory.failReason = validation.reason;
        }
        return validation;
    }

    if (!actor) return { ok: false, reason: 'Actor vanished' };

    if (actor.memory) {
        actor.memory.lastActionFailed = false;
        actor.memory.failReason = undefined;
    }

    if (actor.state === EntityState.GROWING && action.type === 'MOVE') {
        actor.state = EntityState.IDLE;
        if (actor.id === state.player.id) {
            state.isPlayerGrowing = false;
            state.playerGrowthIntent = null;
        }
    }

    switch (action.type) {
      case 'MOVE': {
        // CENTRALIZED COST DEDUCTION
        const costResult = calculateMovementCost(actor, action.path, state.grid);
        
        // This should have been caught by validateAction, but acts as a double safety
        if (!costResult.canAfford) {
            return { ok: false, reason: 'Insufficient funds during execution' };
        }

        actor.moves -= costResult.deductMoves;
        actor.coins -= costResult.deductCoins;
        
        // Sanity clamp (should not be needed if logic is correct)
        actor.moves = Math.max(0, actor.moves);
        actor.coins = Math.max(0, actor.coins);

        actor.movementQueue = action.path;
        break;
      }
      case 'UPGRADE':
        actor.movementQueue = [{ q: action.coord.q, r: action.coord.r, upgrade: true, intent: action.intent }];
        break;
      case 'DIG':
        actor.movementQueue = [{ q: action.coord.q, r: action.coord.r, upgrade: true, intent: 'DIG' }];
        break;
      case 'RECHARGE_MOVE':
        actor.coins = Math.max(0, actor.coins - GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE);
        actor.moves += 1;
        break;
      case 'WAIT':
        break;
      case 'DESTROY_ITEM':
        actor.inventory = actor.inventory.filter(i => i.id !== action.itemId);
        break;
      case 'RESTORE_HEX': {
        const item = actor.inventory.find(i => i.id === action.itemId);
        if (!item) return { ok: false, reason: 'Item missing during execution' }; 

        // Consume Item
        actor.inventory = actor.inventory.filter(i => i.id !== action.itemId);

        // Determine Chance
        let successChance = 0;
        switch (item.rarity) {
            case 'COMMON': successChance = 0.25; break;
            case 'UNCOMMON': successChance = 0.50; break;
            case 'RARE': successChance = 0.75; break;
            case 'LEGENDARY': successChance = 1.00; break;
        }

        const roll = Math.random();
        const success = roll < successChance;
        const key = getHexKey(action.coord.q, action.coord.r);
        const hex = state.grid[key];

        if (success) {
            state.grid = {
                ...state.grid,
                [key]: {
                    ...hex,
                    structureType: undefined, 
                    currentLevel: 0,
                    maxLevel: 0,
                    progress: 0,
                    durability: undefined 
                }
            };
            const msg = `Stabilization SUCCESS: Sector Restored using ${item.name}`;
            state.messageLog.unshift({ id: `rest-ok-${Date.now()}`, text: msg, type: 'SUCCESS', source: actor.id, timestamp: Date.now() });
            state.effects.push({ id: `eff-rest-${Date.now()}`, q: action.coord.q, r: action.coord.r, text: "STABILIZED", color: "#10b981", icon: 'PLUS', startTime: Date.now(), lifetime: 1500 });
        } else {
            const msg = `Stabilization FAILED: ${item.name} consumed without effect.`;
            state.messageLog.unshift({ id: `rest-fail-${Date.now()}`, text: msg, type: 'ERROR', source: actor.id, timestamp: Date.now() });
             state.effects.push({ id: `eff-fail-${Date.now()}`, q: action.coord.q, r: action.coord.r, text: "FIZZLED", color: "#ef4444", icon: 'WARN', startTime: Date.now(), lifetime: 1500 });
        }
        break;
      }
      case 'ACTIVATE_MONUMENT': {
          // Consume items
          const ids = new Set(action.itemIds);
          actor.inventory = actor.inventory.filter(i => !ids.has(i.id));
          
          // Trigger Victory
          state.gameStatus = 'VICTORY';
          const msg = "MONUMENT ACTIVATED. PLANETARY CONTROL ESTABLISHED.";
          
          state.messageLog.unshift({
              id: `monument-win-${Date.now()}`,
              text: msg,
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
          });
          
          // VictorySystem will handle the rest
          break;
      }
    }

    // --- PLAYER ACTION LOGGING ---
    if (actor.type === EntityType.PLAYER && action.type !== 'DESTROY_ITEM' && action.type !== 'RESTORE_HEX' && action.type !== 'ACTIVATE_MONUMENT') {
        let targetStr: string | undefined = undefined;
        
        if (action.type === 'MOVE' && action.path.length > 0) {
            const dest = action.path[action.path.length - 1];
            const h = state.grid[getHexKey(dest.q, dest.r)];
            targetStr = `(${dest.q},${dest.r}) L:${h?.currentLevel??'?'}`;
        } else if (action.type === 'UPGRADE' || action.type === 'DIG') {
            const {q, r} = action.coord;
            const h = state.grid[getHexKey(q, r)];
            targetStr = `(${q},${r}) L:${h?.currentLevel??'?'}`;
        }

        const logEntry: BotLogEntry = {
            botId: actor.id,
            action: action.type,
            reason: 'Manual Control',
            timestamp: Date.now(),
            target: targetStr || '-'
        };

        state.fullBotHistory.push(logEntry);
        state.botActivityLog.unshift(logEntry);
        if (state.botActivityLog.length > 60) state.botActivityLog.pop();
    }
    
    return { ok: true };
  }
}
