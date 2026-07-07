
import { GameAction, GameEvent, ValidationResult, SessionState, EntityState, Hex } from '../types';
import { WorldIndex } from './WorldIndex';
import { System } from './systems/System';
import { MovementSystem } from './systems/MovementSystem';
import { GrowthSystem } from './systems/GrowthSystem';
import { AiSystem } from './systems/AiSystem';
import { VictorySystem } from './systems/VictorySystem';
import { EntropySystem } from './systems/EntropySystem';
import { TurretSystem } from './systems/TurretSystem';
import { MeteorSystem } from './systems/MeteorSystem';
import { ActionProcessor } from './ActionProcessor';
import { TransactionQueue } from '../services/transactionQueue';
import { SAFETY_CONFIG } from '../rules/config';
import { createDraft, finishDraft, setAutoFreeze } from 'immer';

setAutoFreeze(false);

interface TickResult {
  state: SessionState;
  events: GameEvent[];
}

export class GameEngine {
  private _state: SessionState | null;
  private _index: WorldIndex | null;
  private _systems: System[];
  private _actionProcessor: ActionProcessor | null;
  private _transactionQueue: TransactionQueue;
  private _isTickInProgress: boolean = false;

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
      new TurretSystem(),
      new MeteorSystem(),
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

  public setPlayerIntent(isGrowing: boolean, intent: 'RECOVER' | 'UPGRADE' | 'DIG' | 'TURRET' | null) {
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
      nextState.sessionStartTime = Date.now();
      nextState.stateVersion++;
      this._state = finishDraft(nextState) as SessionState;
  }

  public applyAction(actorId: string, action: GameAction): ValidationResult {
    if (!this._state || !this._index || !this._actionProcessor) return { ok: false, reason: "Engine Destroyed" };
    if (this._isTickInProgress) return { ok: false, reason: "Simulation Busy" };
    
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
    if (this._isTickInProgress) return null;

    this._isTickInProgress = true;
    
    // Create an immer draft for the entire state to enable structural sharing without GC pressure
    const nextState = createDraft(this._state);
    
    try {
        if (nextState.defense?.isDefenseMode) {
            const maxPlacedHexLevel = Object.values(nextState.grid).reduce((max, h) => Math.max(max, h.currentLevel ?? 0), 0);
            nextState.player.playerLevel = Math.max(1, maxPlacedHexLevel);
        }

        this._index.syncGrid(nextState.grid); 

        const tickEvents: GameEvent[] = [...nextState.outgoingEvents];
        nextState.outgoingEvents = []; 

        // 1. Cleanup old effects every tick
        const now = Date.now();
        nextState.effects = nextState.effects.filter(e => now - e.startTime < e.lifetime);
        if (nextState.effects.length > 30) {
            nextState.effects.splice(0, nextState.effects.length - 30);
        }

        // 2. Update Systems (AI will populate TransactionQueue)
        for (const system of this._systems) {
            system.update(nextState, this._index, tickEvents);
        }

        // 3. Process Transaction Queue
        if (!this._transactionQueue.isEmpty()) {
            this._index.syncState(nextState);
            
            this._transactionQueue.processQueue((actorId, action) => {
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
                        id: Math.random().toString(36).substring(7),
                        type: 'ERROR',
                        message: `Action Failed: ${result.reason}`,
                        entityId: actorId,
                        timestamp: Date.now()
                    });
                }
                return result;
            });
        }

        // --- CREEPING VOID TICKING ---
        if (nextState.activeLevelConfig?.creepingVoid && nextState.gameStatus === 'PLAYING') {
            const cvConfig = nextState.activeLevelConfig.creepingVoid;
            if (!nextState.creepingVoid) {
                nextState.creepingVoid = {
                    lastInfectTime: Date.now(),
                    infectedHexes: {},
                    sourceRestored: false
                };
            }
            
            const cvState = nextState.creepingVoid;
            const sourceKey = `${cvConfig.sourceQ},${cvConfig.sourceR}`;
            const sourceHex = nextState.grid[sourceKey];
            
            if (!cvState.sourceRestored) {
                if (sourceHex && sourceHex.structureType !== 'VOID') {
                    cvState.sourceRestored = true;
                    
                    // Restore all infected hexes
                    for (const [key, orig] of Object.entries(cvState.infectedHexes)) {
                        if (nextState.grid[key]) {
                            nextState.grid[key] = {
                                ...nextState.grid[key],
                                currentLevel: orig.currentLevel,
                                maxLevel: orig.maxLevel,
                                structureType: orig.structureType,
                                durability: orig.durability
                            };
                        }
                    }
                    
                    tickEvents.push({
                        id: `void-restored-${Date.now()}`,
                        type: 'MESSAGE',
                        message: nextState.language === 'RU'
                            ? '🌀 ИСТОЧНИК УСТРАНЕН: Пространство стабилизировано, все зараженные сектора восстановлены!'
                            : '🌀 SOURCE RESOLVED: Space stabilized, all infected sectors have been restored!',
                        timestamp: Date.now()
                    });
                } else {
                    const intervalMs = cvConfig.intervalMs ?? 75000;
                    const nowMs = Date.now();
                    if (nowMs - cvState.lastInfectTime >= intervalMs) {
                        cvState.lastInfectTime = nowMs;
                        
                        // Gather all current VOID keys
                        const voidKeys = Object.keys(nextState.grid).filter(key => nextState.grid[key].structureType === 'VOID');
                        
                        const candidateKeys = new Set<string>();
                        for (const key of voidKeys) {
                            const [qStr, rStr] = key.split(',');
                            const q = parseInt(qStr);
                            const r = parseInt(rStr);
                            
                            const neighbors = [
                                { q: q + 1, r: r }, { q: q - 1, r: r },
                                { q: q, r: r + 1 }, { q: q, r: r - 1 },
                                { q: q + 1, r: r - 1 }, { q: q - 1, r: r + 1 }
                            ];
                            
                            for (const n of neighbors) {
                                const nKey = `${n.q},${n.r}`;
                                const nHex = nextState.grid[nKey];
                                const reservedStructures = ['CAPITAL', 'MONUMENT', 'MINI_MONUMENT', 'CORE'];
                                if (nHex && nHex.structureType !== 'VOID' && !reservedStructures.includes(nHex.structureType || '')) {
                                    // Prevent infecting player or bots
                                    const isPlayerOnIt = nextState.player.q === n.q && nextState.player.r === n.r;
                                    const isBotOnIt = nextState.bots.some(b => b.q === n.q && b.r === n.r);
                                    if (!isPlayerOnIt && !isBotOnIt) {
                                        candidateKeys.add(nKey);
                                    }
                                }
                            }
                        }
                        
                        if (candidateKeys.size > 0) {
                            const candidates = Array.from(candidateKeys);
                            const chosenKey = candidates[Math.floor(Math.random() * candidates.length)];
                            const hexToInfect = nextState.grid[chosenKey];
                            if (hexToInfect) {
                                cvState.infectedHexes[chosenKey] = {
                                    currentLevel: hexToInfect.currentLevel ?? 0,
                                    maxLevel: hexToInfect.maxLevel ?? 0,
                                    structureType: hexToInfect.structureType,
                                    durability: hexToInfect.durability
                                };
                                
                                nextState.grid[chosenKey] = {
                                    ...hexToInfect,
                                    currentLevel: 0,
                                    maxLevel: 0,
                                    structureType: 'VOID',
                                    durability: undefined
                                };
                                
                                tickEvents.push({
                                    id: `void-infected-${Date.now()}`,
                                    type: 'MESSAGE',
                                    message: nextState.language === 'RU'
                                        ? `⚠️ ПУСТОТА РАСПОЛЗАЕТСЯ: Сектор (${chosenKey}) поглощен бездной!`
                                        : `⚠️ VOID CREEPING: Sector (${chosenKey}) has been consumed by the abyss!`,
                                    timestamp: Date.now()
                                });
                            }
                        }
                    }
                }
            }
        }

        // 4. Campaign Hook: onAfterAction
        if (nextState.activeLevelConfig?.hooks?.onAfterAction && this._index) {
            nextState.activeLevelConfig.hooks.onAfterAction(nextState, this._index);
        }

        if (nextState.defense?.isDefenseMode) {
            const maxPlacedHexLevel = Object.values(nextState.grid).reduce((max, h) => Math.max(max, h.currentLevel ?? 0), 0);
            nextState.player.playerLevel = Math.max(1, maxPlacedHexLevel);
        }

        this.enforceSafetyLimits(nextState);

        nextState.currentTurn++; 
        nextState.stateVersion++;
        
        // Strip any remaining Immer proxy references inside events to prevent "proxy revoked" errors
        // This MUST be done before finishDraft is called, because once finishDraft resolves,
        // all Immer proxies are revoked and accessing their properties throws an error.
        // WARNING (a0ea8cd): This JSON serialization strips non-JSON fields (like classes or methods).
        let cleanEvents: GameEvent[] = tickEvents;
        if (tickEvents.length > 0) {
            cleanEvents = JSON.parse(JSON.stringify(tickEvents));
        }

        // Finalize the state draft
        const finalState = finishDraft(nextState) as SessionState;
        
        // CRITICAL: Sync index with final immutable state BEFORE updating this._state
        // This prevents listeners from hitting the revoked proxies inside the index
        // when they react to the state change.
        if (this._index) {
            this._index.syncState(finalState);
        }
        
        this._state = finalState;

        return {
            state: this._state,
            events: cleanEvents
        };
    } catch (error) {
        console.error('GameEngine: processTick failed', error);
        throw error;
    } finally {
        this._isTickInProgress = false;
    }
  }

  private enforceSafetyLimits(state: SessionState) {
    if (state.activeLevelConfig?.id?.startsWith('1.')) {
      state.entropy.current = state.entropy.max;
    }

    // 1. Cleanup old effects every tick to prevent accumulation
    const now = Date.now();
    state.effects = state.effects.filter(e => now - e.startTime < e.lifetime);
    
    // Limit total effects to prevent state bloat
    if (state.effects.length > 30) {
        state.effects.splice(0, state.effects.length - 30);
    }
    
    if (state.messageLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) {
        state.messageLog.splice(0, state.messageLog.length - SAFETY_CONFIG.MAX_LOG_SIZE);
    }
    if (state.botActivityLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) {
        state.botActivityLog.splice(0, state.botActivityLog.length - SAFETY_CONFIG.MAX_LOG_SIZE);
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
