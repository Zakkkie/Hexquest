
import { System } from './System';
import { GameEvent, EntityState, Entity, SessionState, Hex, EntityType } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { getHexKey, getNeighbors, cubeDistance, getStatusModifiers } from '../../services/hexUtils';
import { GameEventFactory } from '../events';
import { GAME_CONFIG, ENTROPY_CONFIG } from '../../rules/config';
import { generateSingleHex } from '../../services/mapGenerator';

export class MovementSystem implements System {
  update(state: SessionState, index: WorldIndex, events: GameEvent[]): void {
    const entities = [state.player, ...state.bots];

    for (const entity of entities) {
      this.processEntity(entity, state, index, events, state);
    }
  }

  private processEntity(entity: Entity, state: SessionState, index: WorldIndex, events: GameEvent[], fullState: SessionState) {
    this.updateVision(entity, state, index);
    if (entity.state !== EntityState.IDLE && entity.state !== EntityState.MOVING) {
      return;
    }

    // 1. Completion Check
    if (entity.movementQueue.length === 0) {
      if (entity.state === EntityState.MOVING) {
         entity.state = EntityState.IDLE;
         entity.recoveredCurrentHex = false;
         events.push(GameEventFactory.create('MOVE_COMPLETE', undefined, entity.id));
         
         // MONUMENT CHECK
         if (entity.type === EntityType.PLAYER) {
             const key = getHexKey(entity.q, entity.r);
             const hex = fullState.grid[key];
             if (hex && hex.structureType === 'MONUMENT') {
                 // Verify height requirement logic if needed, but if they are ON it, they climbed it.
                 events.push(GameEventFactory.create('MONUMENT_REACHED', 'Monument Connection Established', entity.id));
             }
         }
      }
      return;
    }

    // --- ANIMATION THROTTLE ---
    const now = Date.now();
    if (entity.state === EntityState.MOVING) {
        const lastMove = entity.lastMoveTime || 0;
        // Ensure this constant (e.g., 300) matches animation duration in Unit.tsx
        if (now - lastMove < (GAME_CONFIG.MOVEMENT_LOGIC_INTERVAL_MS || 300)) {
            return; 
        }
    }

    const nextStep = entity.movementQueue[0];

    if (nextStep.upgrade) return; 

    // --- TARGET VALIDATION: VOID CHECK ---
    // If the hex we are trying to step into is destroyed, stop immediately.
    const targetKey = getHexKey(nextStep.q, nextStep.r);
    const targetHex = state.grid[targetKey];
    if (targetHex && targetHex.structureType === 'VOID') {
        entity.movementQueue = []; // Clear path
        entity.state = EntityState.IDLE;
        
        const msg = "Path Collapsed: Destination is Void";
        if (entity.type === EntityType.PLAYER) {
            state.messageLog.unshift({
                id: `void-stop-${Date.now()}`,
                text: msg,
                type: 'WARN',
                source: 'SYSTEM',
                timestamp: Date.now()
            });
        }
        events.push(GameEventFactory.create('ACTION_DENIED', msg, entity.id));
        return;
    }

    // 2. Collision Check
    if (index.isOccupied(nextStep.q, nextStep.r)) {
      if (nextStep.q !== entity.q || nextStep.r !== entity.r) {
          entity.movementQueue = [];
          entity.state = EntityState.IDLE;
          
          const blockerId = index.getEntityAt(nextStep.q, nextStep.r)?.id || 'UNKNOWN';
          const msg = `Path Blocked by ${blockerId}`;
          
          state.messageLog.unshift({
             id: `col-${Date.now()}-${entity.id}`,
             text: msg,
             type: 'WARN',
             source: entity.id,
             timestamp: Date.now()
          });
          
          events.push(GameEventFactory.create('ACTION_DENIED', msg, entity.id));
          return;
      }
    }

    // 3. Execute Move
    entity.movementQueue.shift();

    const oldQ = entity.q;
    const oldR = entity.r;
    const oldHexKey = getHexKey(oldQ, oldR);
    
    entity.q = nextStep.q;
    entity.r = nextStep.r;
    entity.lastMoveTime = now;

    index.updateEntityPosition(entity.id, oldQ, oldR, entity.q, entity.r);

    // --- BATCH GRID UPDATES START ---
    const gridUpdates: Record<string, Hex> = {};

    // A. HEX COLLAPSE (ON EXIT)
    const oldHex = state.grid[oldHexKey];
    
    // SAFETY: Monument Hexes are indestructible physics objects. They never collapse.
    if (oldHex && oldHex.maxLevel === 1 && oldHex.structureType !== 'VOID' && oldHex.structureType !== 'MONUMENT') {
        const d = oldHex.durability !== undefined ? oldHex.durability : GAME_CONFIG.L1_HEX_MAX_DURABILITY;
        if (d <= 0) {
             const collapsedHex: Hex = {
                ...oldHex,
                maxLevel: oldHex.maxLevel, // FIXED: Preserve maxLevel for regrowth
                currentLevel: 0,
                progress: 0,
                ownerId: undefined,
                durability: 0,
                structureType: 'VOID'
            };
            
            gridUpdates[oldHexKey] = collapsedHex;
            
            // ENTROPY PENALTY FOR VOID CREATION
            state.entropy.current = Math.max(0, state.entropy.current - ENTROPY_CONFIG.COST_VOID_CREATION);
            
            // --- PENALTY LOGIC: SHOCKWAVE DAMAGE ---
            if (entity.playerLevel > 0) {
                entity.playerLevel--;
                
                // STUMBLE CHECK: If user lost rank while climbing, they fall/stop.
                const currentHexKey = getHexKey(entity.q, entity.r);
                const currentHex = gridUpdates[currentHexKey] || state.grid[currentHexKey];
                
                // If we moved to a hex that is now higher than our *previous* position (ascending),
                // and we just lost a rank, we likely aren't qualified or are stumbling.
                const isAscending = currentHex && currentHex.currentLevel > oldHex.currentLevel;
                
                if (isAscending) {
                    entity.movementQueue = [];
                    entity.state = EntityState.IDLE;
                    
                    const stumbleMsg = "Stumbled by Shockwave! Movement Halted.";
                    if (entity.type === EntityType.PLAYER) {
                        state.messageLog.unshift({
                            id: `stumble-${Date.now()}`,
                            text: stumbleMsg,
                            type: 'WARN',
                            source: 'SYSTEM',
                            timestamp: Date.now()
                        });
                    }
                }
            }

            events.push(GameEventFactory.create('HEX_COLLAPSE', undefined, entity.id, { q: oldHex.q, r: oldHex.r }));
            
            if (entity.type === EntityType.PLAYER) {
                state.messageLog.unshift({
                    id: `collapse-${Date.now()}`,
                    text: `CRITICAL: Shockwave hit! Rank -1`,
                    type: 'ERROR',
                    source: 'SYSTEM',
                    timestamp: Date.now()
                });
            }
        }
    }

    // B. HEX DAMAGE (ON ENTRY)
    const newHexKey = getHexKey(entity.q, entity.r);
    // Take from updates if available, else state
    const newHex = gridUpdates[newHexKey] || state.grid[newHexKey];
    
    // SAFETY: Monument Hexes do not take durability damage.
    if (newHex && newHex.maxLevel === 1 && newHex.structureType !== 'VOID' && newHex.structureType !== 'MONUMENT') {
        const currentDurability = newHex.durability !== undefined ? newHex.durability : GAME_CONFIG.L1_HEX_MAX_DURABILITY;
        const newDurability = currentDurability - 1;
        
        gridUpdates[newHexKey] = { ...newHex, durability: newDurability };
    }

    // --- APPLY BATCH UPDATE ---
    if (Object.keys(gridUpdates).length > 0) {
        Object.assign(state.grid, gridUpdates);
    }

    // 4. Update State
    const hasMoreMoves = entity.movementQueue.length > 0 && !entity.movementQueue[0].upgrade;
    
    if (!hasMoreMoves) {
        entity.state = EntityState.IDLE;
        entity.recoveredCurrentHex = false;
        events.push(GameEventFactory.create('MOVE_COMPLETE', undefined, entity.id));
        
        // RE-CHECK: If we finished moving, check for Monument again (safety for instant arrival)
        if (entity.type === EntityType.PLAYER) {
             const key = getHexKey(entity.q, entity.r);
             const hex = fullState.grid[key];
             if (hex && hex.structureType === 'MONUMENT') {
                 events.push(GameEventFactory.create('MONUMENT_REACHED', undefined, entity.id));
             }
        }
    } else {
        entity.state = EntityState.MOVING;
    }
  }

  private updateVision(entity: Entity, state: SessionState, index: WorldIndex) {
    const gridUpdates: Record<string, Hex> = {};
    
    // C. MONUMENT DISCOVERY & FOG REVEAL
    // Only check if secret exists
    if (state.secretMonumentCoord) {
        const secret = state.secretMonumentCoord;
        // Check distance to secret center. If <= 2, we are standing on the complex (Center, Moat, or Outer)
        const distToSecret = cubeDistance({ q: entity.q, r: entity.r }, secret);
        
        if (distToSecret <= 2) {
            // MONUMENT COMPLEX DISCOVERY EVENT
            // We need to generate/update the entire 2-radius complex
            const monumentKey = getHexKey(secret.q, secret.r);
            
            // Check if already discovered to prevent re-spamming (check center hex structure)
            const centerHex = state.grid[monumentKey] || gridUpdates[monumentKey];
            const isNewDiscovery = !centerHex || centerHex.structureType !== 'MONUMENT';

            if (isNewDiscovery) {
                if (entity.type === EntityType.PLAYER) {
                    state.messageLog.unshift({
                        id: `monument-found-${Date.now()}`,
                        text: `ANOMALY DETECTED: Monument Complex Found!`,
                        type: 'SUCCESS',
                        source: 'SYSTEM',
                        timestamp: Date.now()
                    });
                }

                // Iterate over Radius 0, 1, 2 from Secret Center
                for (let q = secret.q - 2; q <= secret.q + 2; q++) {
                    for (let r = secret.r - 2; r <= secret.r + 2; r++) {
                        if (cubeDistance({ q, r }, secret) > 2) continue;

                        const hexKey = getHexKey(q, r);
                        // Generate fresh hex properties based on position in complex
                        const dist = cubeDistance({ q, r }, secret);
                        
                        // Create or fetch hex
                        // Note: We use generateSingleHex to get base props, but override level
                        const baseHex = generateSingleHex(q, r, state.activeLevelConfig);
                        
                        // Force Reveal
                        if (entity.type === EntityType.PLAYER) {
                            baseHex.revealed = true;
                        } else {
                            baseHex.botRevealed = { 'SHARED_BOTS': true };
                        }

                        if (dist === 0) {
                            // CENTER: Monument
                            baseHex.structureType = 'MONUMENT';
                            baseHex.maxLevel = state.winCondition?.targetLevel || 5;
                            baseHex.currentLevel = state.winCondition?.targetLevel || 5;
                        } else if (dist === 1) {
                            // RING 1: Moat (-1)
                            baseHex.structureType = undefined;
                            baseHex.maxLevel = -1;
                            baseHex.currentLevel = -1;
                        } else {
                            // RING 2: Outer Ring (0)
                            // Don't overwrite if it was already something cooler (unlikely in proc gen)
                            // But for "landing zone" safety, we ensure it's L0.
                            baseHex.structureType = undefined;
                            baseHex.maxLevel = 0;
                            baseHex.currentLevel = 0;
                        }

                        gridUpdates[hexKey] = baseHex;
                        index.registerHex(baseHex); // Register new hexes
                    }
                }
            }
        }
    }

    // D. STANDARD FOG OF WAR (If no monument event overrides)
    // Dynamic Fog Radius based on active statuses
    const { fogRadius } = getStatusModifiers(entity);
    const revealRadius = fogRadius;

    // Use BFS logic to get hexes in radius
    const visited = new Set<string>();
    const queue: { q: number, r: number, dist: number }[] = [{ q: entity.q, r: entity.r, dist: 0 }];
    const startKey = getHexKey(entity.q, entity.r);
    visited.add(startKey);

    // Initial hex check
    let startHex = gridUpdates[startKey] || state.grid[startKey];
    if (!startHex) {
        // Fallback for initial spot
        startHex = generateSingleHex(entity.q, entity.r, state.activeLevelConfig, state.winCondition?.mapType);
        if (entity.type === EntityType.PLAYER) {
            startHex.revealed = true;
        } else {
            startHex.botRevealed = { [entity.id]: true };
        }
        gridUpdates[startKey] = startHex;
        index.registerHex(startHex);
    } else {
        const isPlayer = entity.type === EntityType.PLAYER;
        if (isPlayer && !startHex.revealed) {
            gridUpdates[startKey] = { ...startHex, revealed: true };
        } else if (!isPlayer && (!startHex.botRevealed || !startHex.botRevealed['SHARED_BOTS'])) {
            gridUpdates[startKey] = { ...startHex, botRevealed: { ...startHex.botRevealed, 'SHARED_BOTS': true } };
        }
    }

    // BFS Loop
    let head = 0;
    while(head < queue.length) {
        const { q, r, dist } = queue[head++];
        if (dist >= revealRadius) continue;

        const neighbors = getNeighbors(q, r);
        for (const n of neighbors) {
            const key = getHexKey(n.q, n.r);
            if (!visited.has(key)) {
                visited.add(key);
                let hex = gridUpdates[key] || state.grid[key];
                
                if (!hex) {
                    // Generate new hex
                    const maxRadius = state.activeLevelConfig?.mapConfig.size ?? 45;
                    const dToCenter = cubeDistance(n, { q: 0, r: 0 });
                    if (dToCenter > maxRadius) continue;

                    const newHex = generateSingleHex(n.q, n.r, state.activeLevelConfig, state.winCondition?.mapType);
                    
                    // --- CHAOTIC RELATIVE TERRAIN LOGIC ---
                    // If in Chaotic Skirmish Mode, ignore the random level from mapGenerator and instead
                    // base the new level on the hex the player is currently standing on (startHex).
                    if (state.winCondition?.mapType === 'CHAOTIC' && !state.activeLevelConfig) {
                        const currentRefLevel = startHex ? startHex.maxLevel : 0;
                        const rand = Math.random();
                        let modifier = 0;
                        
                        // 30% chance +1, 30% chance -1, 40% chance same
                        if (rand < 0.3) modifier = 1;
                        else if (rand < 0.6) modifier = -1;
                        
                        const newLevel = currentRefLevel + modifier;
                        
                        newHex.currentLevel = newLevel;
                        newHex.maxLevel = newLevel;
                        
                        // Correct durability based on the new relative level
                        if (newLevel === 1) {
                            newHex.durability = GAME_CONFIG.L1_HEX_MAX_DURABILITY;
                        } else {
                            newHex.durability = undefined;
                        }
                    }

                    if (entity.type === EntityType.PLAYER) {
                        newHex.revealed = true;
                    } else {
                        newHex.botRevealed = { 'SHARED_BOTS': true };
                    }
                    gridUpdates[key] = newHex;
                    index.registerHex(newHex); // Incrementally index
                } else {
                    const isPlayer = entity.type === EntityType.PLAYER;
                    const needsPlayerReveal = isPlayer && !hex.revealed;
                    const needsBotReveal = !isPlayer && (!hex.botRevealed || !hex.botRevealed['SHARED_BOTS']);
                    
                    if (needsPlayerReveal) {
                        gridUpdates[key] = { ...(gridUpdates[key] || hex), revealed: true };
                    } else if (needsBotReveal) {
                        gridUpdates[key] = { ...(gridUpdates[key] || hex), botRevealed: { ...hex.botRevealed, 'SHARED_BOTS': true } };
                    }
                }
                
                queue.push({ q: n.q, r: n.r, dist: dist + 1 });
            }
        }
    }

    if (Object.keys(gridUpdates).length > 0) {
        Object.assign(state.grid, gridUpdates);
    }
  }
}
