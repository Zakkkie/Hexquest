
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
      
      const nextGrid = { ...state.grid };
      
      for (const key of keys) {
          const old = nextGrid[key];
          if (old) {
              nextGrid[key] = { ...old, ...updates[key] };
          }
      }
      
      state.grid = nextGrid;
  }

  private cloneState(source: SessionState): SessionState {
    return {
      ...source,
      grid: source.grid, 
      player: { ...source.player }, 
      bots: [...source.bots], 
      messageLog: [...source.messageLog], 
      botActivityLog: [...source.botActivityLog],
      fullBotHistory: source.fullBotHistory,
      growingBotIds: [...source.growingBotIds],
      effects: [...source.effects],
      entropy: { ...source.entropy },
      activeLevelConfig: source.activeLevelConfig,
      outgoingEvents: [...(source.outgoingEvents || [])]
    };
  }

  public setPlayerIntent(isGrowing: boolean, intent: 'RECOVER' | 'UPGRADE' | 'DIG' | null) {
      if (!this._state) return;
      // Note: Direct state mutation here can still theoretically race with processTick cloning.
      // Ideally this should also be an action in the queue, but for UI toggles it's often acceptable.
      const nextState = this.cloneState(this._state);
      nextState.isPlayerGrowing = isGrowing;
      nextState.playerGrowthIntent = intent;
      nextState.stateVersion++;
      this._state = nextState;
  }

  public startMission() {
      if (!this._state) return;
      const nextState = this.cloneState(this._state);
      nextState.gameStatus = 'PLAYING';
      nextState.stateVersion++;
      this._state = nextState;
  }

  public applyAction(actorId: string, action: GameAction): ValidationResult {
    if (!this._state || !this._index || !this._actionProcessor) return { ok: false, reason: "Engine Destroyed" };
    
    // 1. Optimistic Validation
    // Validate against current state immediately to provide instant feedback to UI (e.g. "Not enough coins")
    // This doesn't catch conflicts that might occur when the action is actually processed (rare for player),
    // but ensures the UI doesn't queue invalid actions.
    const validation = this._actionProcessor.validateAction(this._state, this._index, actorId, action);
    if (!validation.ok) return validation;

    // 2. Enqueue for Serialization
    // Player actions get high priority (100) to be processed before Bot actions (50) in the same tick.
    const priority = actorId === this._state.player.id ? 100 : 50;
    this._transactionQueue.enqueue({
        actorId,
        action,
        priority,
        timestamp: Date.now()
    });

    // 3. Return Success
    // The actual state update will happen asynchronously during processTick().
    return { ok: true };
  }
  
  public async processTick(): Promise<TickResult | null> {
    if (!this._state || !this._index) return null;

    const nextState = this.cloneState(this._state);
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
    // This serializes all actions generated this tick (Player inputs + AI decisions)
    if (!this._transactionQueue.isEmpty()) {
        // Sync index before processing queue to ensure validity
        this._index.syncState(nextState);
        
        await this._transactionQueue.processQueue((actorId, action) => {
            // Apply action to the pending nextState
            // Note: actionProcessor updates nextState in place
            const result = this._actionProcessor!.applyAction(nextState, this._index!, actorId, action);
            
            if (result.ok) {
                // Incremental Index Sync for Movement
                // If an actor moved, we must update the index immediately so subsequent actions in the same tick 
                // (e.g. another bot trying to move to the same spot) see the new occupancy.
                if (action.type === 'MOVE') {
                    const actor = actorId === nextState.player.id ? nextState.player : nextState.bots.find(b => b.id === actorId);
                    if (actor) {
                        // Ideally we'd know the old position to do a cheap update, but full sync is safer here given the complexity
                        // Optimization: movementSystem handles index updates during its run, but that's separate.
                        // Here we are applying the action logic which modifies q/r.
                        // To be safe and collision-proof:
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

    this.enforceSafetyLimits(nextState);

    nextState.currentTurn++; 
    nextState.stateVersion++;
    this._state = nextState;

    return {
        state: this._state,
        events: tickEvents
    };
  }

  private enforceSafetyLimits(state: SessionState) {
      if (state.messageLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) {
          state.messageLog = state.messageLog.slice(0, SAFETY_CONFIG.MAX_LOG_SIZE);
      }
      if (state.botActivityLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) {
          state.botActivityLog = state.botActivityLog.slice(0, SAFETY_CONFIG.MAX_LOG_SIZE);
      }

      const entities = [state.player, ...state.bots];
      for (const ent of entities) {
          if (ent.movementQueue.length > SAFETY_CONFIG.MAX_MOVEMENT_QUEUE) {
              ent.movementQueue = ent.movementQueue.slice(0, SAFETY_CONFIG.MAX_MOVEMENT_QUEUE);
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
