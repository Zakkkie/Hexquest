
import { GameState, GameAction, GameEvent, ValidationResult, SessionState, EntityState, TutorialStep, LeaderboardEntry, Hex } from '../types';
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
    this._state = JSON.parse(JSON.stringify(initialState));
    this._state!.stateVersion = this._state!.stateVersion || 0;
    
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
      
      // Copy container (O(1) reference copy of the dictionary, effectively)
      // Actually spread syntax { ...grid } is O(N) where N is number of keys in grid.
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
    // PERFORMANCE OPTIMIZATION:
    // Use shallow copies for arrays where possible to avoid mapping new objects every tick.
    // Systems must create new object references if they mutate individual items.
    return {
      ...source,
      // COPY-ON-WRITE:
      // We copy the reference to the grid object. Systems handle grid updates via COW.
      grid: source.grid, 
      
      player: { ...source.player }, // Shallow copy
      
      // OPTIMIZATION: Shallow copy bots array.
      // NOTE: Systems must treat bot objects as immutable if they change properties.
      bots: [...source.bots], 
      
      // Shallow copy logs
      messageLog: source.messageLog, // Log is usually append-only or replace, reference is fine until modification
      botActivityLog: source.botActivityLog,
      
      growingBotIds: [...source.growingBotIds],
      
      telemetry: source.telemetry,
      
      // Shallow copy effects
      effects: [...source.effects]
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

  public setTutorialStep(step: TutorialStep) {
      if (!this._state) return;
      const nextState = this.cloneState(this._state);
      nextState.tutorialStep = step;
      nextState.stateVersion++;
      this._state = nextState;
  }

  /**
   * Завершает туториал и генерирует необходимые события для UI
   */
  public triggerVictory() {
      if (!this._state) return;
      const nextState = this.cloneState(this._state);
      nextState.gameStatus = 'VICTORY';
      
      const msg = 'Tutorial Complete: Sector Secured';
      
      // Mutate new log array safely
      nextState.messageLog = [{
          id: `win-manual-${Date.now()}`,
          text: msg,
          type: 'SUCCESS',
          source: 'SYSTEM',
          timestamp: Date.now()
      }, ...nextState.messageLog];
      
      // Генерируем события вручную, так как VictorySystem может быть уже пройдена в этом тике
      const winEvent = GameEventFactory.create('VICTORY', msg, nextState.player.id);
      
      const statsEntry: LeaderboardEntry = {
          nickname: 'Commander', 
          avatarColor: '#000', 
          avatarIcon: 'user',
          maxCoins: nextState.player.totalCoinsEarned,
          maxLevel: nextState.player.playerLevel,
          difficulty: nextState.difficulty,
          timestamp: Date.now()
      };
      const lbEvent = GameEventFactory.create('LEADERBOARD_UPDATE', 'Tutorial stats synchronized', nextState.player.id, { entry: statsEntry });

      if (!nextState.telemetry) nextState.telemetry = [];
      nextState.telemetry.push(winEvent, lbEvent);

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
    // PERFORMANCE OPTIMIZATION: 
    // Removed unconditional `this._index.syncState(nextState)` from here.
    // AiSystem will now handle synchronization when needed, avoiding O(N) rebuilds every tick.
    this._index.syncGrid(nextState.grid); // Still sync grid structure for pathfinding safety

    const tickEvents: GameEvent[] = [];

    // 1. Очистка старых эффектов (Floating Text)
    const now = Date.now();
    const activeEffects = nextState.effects.filter(e => now - e.startTime < e.lifetime);
    if (activeEffects.length !== nextState.effects.length) {
        nextState.effects = activeEffects;
    }

    // 2. Обновление систем
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
      // Cleanup telemetry to prevent infinite growth
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
