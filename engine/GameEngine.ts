
import { GameAction, GameEvent, ValidationResult, SessionState, EntityState, LeaderboardEntry, Hex } from '../types';
import { WorldIndex } from './WorldIndex';
import { System } from './systems/System';
import { MovementSystem } from './systems/MovementSystem';
import { GrowthSystem } from './systems/GrowthSystem';
import { AiSystem } from './systems/AiSystem';
import { VictorySystem } from './systems/VictorySystem';
import { EntropySystem } from './systems/EntropySystem';
import { ActionProcessor } from './ActionProcessor';
import { TransactionQueue } from '../services/transactionQueue';
import { SAFETY_CONFIG } from '../rules/config';
import { GameEventFactory } from './events';
import { createDraft, finishDraft, setAutoFreeze } from 'immer';

setAutoFreeze(false);

export interface TickResult {
  state: SessionState;
  events: GameEvent[];
}

export class GameEngine {
  private _state: SessionState | null;
  private _index: WorldIndex | null;
  private _systems: System[];
  private _actionProcessor: ActionProcessor | null;
  private _transactionQueue: TransactionQueue;

  constructor(initialState: SessionState) {
    this._state = { ...initialState };
    this._state.stateVersion = this._state.stateVersion || 0;
    
    this._index = new WorldIndex(this._state!.grid, [this._state!.player, ...this._state!.bots]);
    this._actionProcessor = new ActionProcessor();
    this._transactionQueue = new TransactionQueue();
    
    this._systems = [
      new GrowthSystem(),
      new AiSystem(this._transactionQueue), // Pass Queue to AI
      new MovementSystem(),
      new EntropySystem(), 
      new VictorySystem()
    ];
  }

  public get state(): SessionState | null {
    return this._state;
  }

  public static safeGridUpdate(state: SessionState, updates: Record<string, Partial<Hex>>) {
      const keys = Object.keys(updates);
      if (keys.length === 0) return;
      
      // Since state.grid is now an immer draft during the tick, we can just mutate it directly!
      for (const key of keys) {
          const old = state.grid[key];
          if (old) {
              Object.assign(old, updates[key]);
          }
      }
  }

  public setPlayerIntent(isGrowing: boolean, intent: 'RECOVER' | 'UPGRADE' | 'DIG' | null) {
      if (!this._state) return;
      const nextState = createDraft(this._state);
      nextState.isPlayerGrowing = isGrowing;
      nextState.playerGrowthIntent = intent;
      nextState.stateVersion++;
      this._state = finishDraft(nextState) as SessionState;
  }

  public startMission() {
      if (!this._state) return;
      const nextState = createDraft(this._state);
      nextState.gameStatus = 'PLAYING';
      nextState.stateVersion++;
      this._state = finishDraft(nextState) as SessionState;
  }

  public applyAction(actorId: string, action: GameAction): ValidationResult {
    if (!this._state || !this._index || !this._actionProcessor) return { ok: false, reason: "Engine Destroyed" };
    
    const validation = this._actionProcessor.validateAction(this._state, this._index, actorId, action);
    if (!validation.ok) return validation;

    const priority = actorId === this._state.player.id ? 100 : 50;
    this._transactionQueue.enqueue({
        actorId,
        action,
        priority,
        timestamp: Date.now()
    });

    return { ok: true };
  }
  
  public async processTick(): Promise<TickResult | null> {
    if (!this._state || !this._index) return null;

    // Create an immer draft for the entire state to enable structural sharing without GC pressure
    const nextState = createDraft(this._state);
    
    this._index.syncGrid(nextState.grid); 

    const tickEvents: GameEvent[] = [...nextState.outgoingEvents];
    nextState.outgoingEvents = []; 

    // 1. Cleanup old effects
    const now = Date.now();
    const activeEffects = nextState.effects.filter(e => now - e.startTime < e.lifetime);
    if (activeEffects.length !== nextState.effects.length) {
        nextState.effects = activeEffects;
    }

    // 2. Update Systems (AI will populate TransactionQueue)
    for (const system of this._systems) {
        system.update(nextState, this._index, tickEvents);
    }

    // 3. Process Transaction Queue (Async)
    if (!this._transactionQueue.isEmpty()) {
        this._index.syncState(nextState);
        
        await this._transactionQueue.processQueue((actorId, action) => {
            const result = this._actionProcessor!.applyAction(nextState, this._index!, actorId, action);
            
            if (result.ok) {
                if (action.type === 'MOVE') {
                    const actor = actorId === nextState.player.id ? nextState.player : nextState.bots.find(b => b.id === actorId);
                    if (actor) {
                        this._index!.syncState(nextState);
                    }
                }
            } else {
                tickEvents.push({
                    type: 'ERROR',
                    message: `Action Failed: ${result.reason}`,
                    entityId: actorId,
                    timestamp: Date.now()
                });
            }
            return result;
        });
    }

    // 4. Campaign Hook: onAfterAction
    if (nextState.activeLevelConfig?.hooks?.onAfterAction) {
        nextState.activeLevelConfig.hooks.onAfterAction(nextState);
    }

    this.enforceSafetyLimits(nextState);

    nextState.currentTurn++; 
    nextState.stateVersion++;
    
    // Finalize the state draft
    const finalState = finishDraft(nextState) as SessionState;
    this._state = finalState;
    
    // Sync index with final immutable state
    this._index.syncState(this._state);
    this._index.syncGrid(this._state.grid);

    return {
        state: this._state,
        events: tickEvents
    };
  }

  private enforceSafetyLimits(state: SessionState) {
      if (state.messageLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) {
          state.messageLog.splice(SAFETY_CONFIG.MAX_LOG_SIZE);
      }
      if (state.botActivityLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) {
          state.botActivityLog.splice(SAFETY_CONFIG.MAX_LOG_SIZE);
      }

      const entities = [state.player, ...state.bots];
      for (const ent of entities) {
          if (ent.movementQueue.length > SAFETY_CONFIG.MAX_MOVEMENT_QUEUE) {
              ent.movementQueue.splice(SAFETY_CONFIG.MAX_MOVEMENT_QUEUE);
              ent.state = EntityState.IDLE; 
          }
      }
  }

  public dispose() {
    this._index?.dispose();
    this._index = null;
    this._systems = [];
    this._state = null;
    this._actionProcessor = null;
    this._transactionQueue.clear();
  }

  public destroy() {
    this.dispose();
  }
}
