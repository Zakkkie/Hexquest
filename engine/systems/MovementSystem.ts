
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
        // Убедитесь, что эта константа в конфиге (например, 300) совпадает с duration анимации Unit.tsx
        if (now - lastMove < (GAME_CONFIG.MOVEMENT_LOGIC_INTERVAL_MS || 300)) {
            return; 
        }
    }

    const nextStep = entity.movementQueue[0];

    if (nextStep.upgrade) return; 

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
    // Собираем все изменения в один объект, чтобы не копировать grid 3 раза
    const gridUpdates: Record<string, Hex> = {};

    // A. HEX COLLAPSE (ON EXIT)
    const oldHex = state.grid[oldHexKey];
    // Проверка: L1 и не VOID
    if (oldHex && oldHex.maxLevel === 1 && oldHex.structureType !== 'VOID') {
        const d = oldHex.durability !== undefined ? oldHex.durability : 3;
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
            
            // Записываем в буфер
            // Logic becomes VOID immediately to prevent back-tracking,
            // but Visuals in Hexagon.tsx will "fake" delay for animation.
            gridUpdates[oldHexKey] = collapsedHex;
            
            // --- PENALTY LOGIC: SHOCKWAVE DAMAGE ---
            if (entity.playerLevel > 0) {
                entity.playerLevel--;
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
    // Берем hex из updates если он там уже есть (редкий случай), иначе из state
    const newHex = gridUpdates[newHexKey] || state.grid[newHexKey];
    
    if (newHex && newHex.maxLevel === 1 && newHex.structureType !== 'VOID') {
        const currentDurability = newHex.durability !== undefined ? newHex.durability : 3;
        const newDurability = currentDurability - 1;
        
        // Записываем в буфер (объединяя с возможными предыдущими изменениями)
        gridUpdates[newHexKey] = { ...newHex, durability: newDurability };
    }

    // C. FOG OF WAR
    const neighbors = getNeighbors(entity.q, entity.r);
    [...neighbors, { q: entity.q, r: entity.r }].forEach(n => {
      const k = getHexKey(n.q, n.r);
      
      // Сначала смотрим в буфер updates, потом в реальный грид
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
    // Применяем все изменения за один раз (Copy-On-Write)
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
