
import { GameState, GameAction, GameEvent, ValidationResult, SessionState, EntityState, LeaderboardEntry, Hex } from '../types';
import { WorldIndex } from './WorldIndex';
import { System } from './systems/System';
import { MovementSystem } from './systems/MovementSystem';
import { GrowthSystem } from './systems/GrowthSystem';
import { AiSystem } from './systems/AiSystem';
import { VictorySystem } from './systems/VictorySystem';
import { ActionProcessor } from './ActionProcessor';
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

  constructor(initialState: SessionState) {
    // CRITICAL: Use object spread (shallow copy) for the top-level session state
    // instead of JSON serialization to preserve function references in activeLevelConfig.
    // Deep properties (grid, player, bots) will be cloned separately if modified by systems via Copy-On-Write.
    this._state = { ...initialState };
    this._state.stateVersion = this._state.stateVersion || 0;
    
    this._index = new WorldIndex(this._state!.grid, [this._state!.player, ...this._state!.bots]);
    this._actionProcessor = new ActionProcessor();
    
    this._systems = [
      new GrowthSystem(),
      new AiSystem(this._actionProcessor!),
      new MovementSystem(),
      new VictorySystem()
    ];
  }

  public get state(): SessionState | null {
    return this._state;
  }

  /**
   * Safe Grid Update Helper
   * Ensures the grid container is copied (Copy-On-Write) before applying updates.
   * This preserves the immutability of the previous state while batching updates efficiently.
   */
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
      // COPY-ON-WRITE:
      // We copy the reference to the grid object. Systems handle grid updates via COW.
      grid: source.grid, 
      
      player: { ...source.player }, // Shallow copy
      
      // OPTIMIZATION: Shallow copy bots array.
      bots: [...source.bots], 
      
      // Shallow copy logs to prevent mutation of history
      messageLog: [...source.messageLog], 
      botActivityLog: [...source.botActivityLog],
      
      growingBotIds: [...source.growingBotIds],
      
      telemetry: source.telemetry ? [...source.telemetry] : undefined,
      
      // Shallow copy effects
      effects: [...source.effects],
      
      // Preserve activeLevelConfig reference (it contains functions)
      activeLevelConfig: source.activeLevelConfig 
    };
  }

  public setPlayerIntent(isGrowing: boolean, intent: 'RECOVER' | 'UPGRADE' | null) {
      if (!this._state) return;
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
    const nextState = this.cloneState(this._state);
    this._index.syncState(nextState);
    const result = this._actionProcessor.applyAction(nextState, this._index, actorId, action);
    if (result.ok) {
        nextState.stateVersion++;
        this._state = nextState;
    }
    return result;
  }
  
  public processTick(): TickResult {
    if (!this._state || !this._index) return { state: {} as any, events: [] };

    const nextState = this.cloneState(this._state);
    this._index.syncGrid(nextState.grid); // Still sync grid structure for pathfinding safety

    const tickEvents: GameEvent[] = [];

    // 1. Cleanup old effects
    const now = Date.now();
    const activeEffects = nextState.effects.filter(e => now - e.startTime < e.lifetime);
    if (activeEffects.length !== nextState.effects.length) {
        nextState.effects = activeEffects;
    }

    // 2. Update Systems
    for (const system of this._systems) {
        system.update(nextState, this._index, tickEvents);
    }

    this.enforceSafetyLimits(nextState);

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
      if (state.telemetry && state.telemetry.length > SAFETY_CONFIG.MAX_LOG_SIZE) {
          state.telemetry = state.telemetry.slice(state.telemetry.length - SAFETY_CONFIG.MAX_LOG_SIZE);
      }

      const entities = [state.player, ...state.bots];
      for (const ent of entities) {
          if (ent.movementQueue.length > SAFETY_CONFIG.MAX_MOVEMENT_QUEUE) {
              ent.movementQueue = ent.movementQueue.slice(0, SAFETY_CONFIG.MAX_MOVEMENT_QUEUE);
              ent.state = EntityState.IDLE; 
          }
      }
  }

  public destroy() {
    this._systems = [];
    this._index = null;
    this._state = null;
    this._actionProcessor = null;
  }
}
