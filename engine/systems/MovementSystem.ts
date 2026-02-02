
import { System } from './System';
import { GameState, GameEvent, EntityState, Entity, SessionState, Hex, EntityType } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { getHexKey, getNeighbors } from '../../services/hexUtils';
import { GameEventFactory } from '../events';
import { GAME_CONFIG } from '../../rules/config';

export class MovementSystem implements System {
  update(state: SessionState, index: WorldIndex, events: GameEvent[]): void {
    const entities = [state.player, ...state.bots];

    for (const entity of entities) {
      this.processEntity(entity, state, index, events);
    }
  }

  private processEntity(entity: Entity, state: SessionState, index: WorldIndex, events: GameEvent[]) {
    if (entity.state !== EntityState.IDLE && entity.state !== EntityState.MOVING) {
      return;
    }

    // 1. Completion Check
    if (entity.movementQueue.length === 0) {
      if (entity.state === EntityState.MOVING) {
         entity.state = EntityState.IDLE;
         entity.recoveredCurrentHex = false;
         events.push(GameEventFactory.create('MOVE_COMPLETE', undefined, entity.id));
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
    
    if (oldHex && oldHex.maxLevel === 1 && oldHex.structureType !== 'VOID') {
        const d = oldHex.durability !== undefined ? oldHex.durability : GAME_CONFIG.L1_HEX_MAX_DURABILITY;
        if (d <= 0) {
             const collapsedHex: Hex = {
                ...oldHex,
                maxLevel: 0,
                currentLevel: 0,
                progress: 0,
                ownerId: undefined,
                durability: 0,
                structureType: 'VOID'
            };
            
            gridUpdates[oldHexKey] = collapsedHex;
            
            // --- PENALTY LOGIC: SHOCKWAVE DAMAGE ---
            if (entity.playerLevel > 0) {
                entity.playerLevel--;
                
                // STUMBLE CHECK: If user lost rank while climbing, they fall/stop.
                const currentHexKey = getHexKey(entity.q, entity.r);
                const currentHex = gridUpdates[currentHexKey] || state.grid[currentHexKey];
                
                // If we moved to a hex that is now higher than our *previous* position (ascending),
                // and we just lost a rank, we likely aren't qualified or are stumbling.
                const isAscending = currentHex && currentHex.maxLevel > oldHex.maxLevel;
                
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
    
    if (newHex && newHex.maxLevel === 1 && newHex.structureType !== 'VOID') {
        const currentDurability = newHex.durability !== undefined ? newHex.durability : GAME_CONFIG.L1_HEX_MAX_DURABILITY;
        const newDurability = currentDurability - 1;
        
        gridUpdates[newHexKey] = { ...newHex, durability: newDurability };
    }

    // C. FOG OF WAR
    const neighbors = getNeighbors(entity.q, entity.r);
    [...neighbors, { q: entity.q, r: entity.r }].forEach(n => {
      const k = getHexKey(n.q, n.r);
      const existingHex = gridUpdates[k] || state.grid[k];
      
      if (!existingHex) {
        gridUpdates[k] = { 
          id: k, q: n.q, r: n.r, 
          currentLevel: 0, maxLevel: 0, progress: 0, 
          revealed: true 
        };
      } else if (!existingHex.revealed) {
        gridUpdates[k] = { ...existingHex, revealed: true };
      }
    });

    // --- APPLY BATCH UPDATE ---
    if (Object.keys(gridUpdates).length > 0) {
        state.grid = { ...state.grid, ...gridUpdates };
    }

    // 4. Update State
    const hasMoreMoves = entity.movementQueue.length > 0 && !entity.movementQueue[0].upgrade;
    
    if (!hasMoreMoves) {
        entity.state = EntityState.IDLE;
        entity.recoveredCurrentHex = false;
        events.push(GameEventFactory.create('MOVE_COMPLETE', undefined, entity.id));
    } else {
        entity.state = EntityState.MOVING;
    }
  }
}
