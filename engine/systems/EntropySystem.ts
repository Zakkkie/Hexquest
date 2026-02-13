
import { System } from './System';
import { GameEvent, SessionState, Hex, EntityType } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { GameEventFactory } from '../events';
import { ENTROPY_CONFIG } from '../../rules/config';
import { getHexKey } from '../../services/hexUtils';

export class EntropySystem implements System {
  update(state: SessionState, index: WorldIndex, events: GameEvent[]): void {
    if (state.gameStatus !== 'PLAYING') return;

    // Check for Entropy Shift
    if (state.entropy.current <= 0) {
        this.triggerEntropyShift(state, events);
    }
  }

  private triggerEntropyShift(state: SessionState, events: GameEvent[]) {
      const now = Date.now();
      
      // 1. Log Event
      state.messageLog.unshift({
          id: `shift-${now}`,
          text: "CRITICAL: ENTROPY SHIFT DETECTED",
          type: 'ERROR',
          source: 'SYSTEM',
          timestamp: now
      });
      events.push(GameEventFactory.create('ENTROPY_SHIFT', "Reality distortion in progress", undefined));

      // 2. Modifying Grid
      const updates: Record<string, Hex> = {};
      const gridKeys = Object.keys(state.grid);

      for (const key of gridKeys) {
          const hex = state.grid[key];
          
          // Exception: Immutable Monuments
          if (hex.structureType === 'MONUMENT') continue;

          let newLevel = hex.currentLevel;
          let newType = hex.structureType;

          if (hex.currentLevel > 0) {
              // Rule 1: Peaks Erode
              newLevel = hex.currentLevel - 1;
          } else if (hex.currentLevel < 0) {
              // Rule 2: Pits Fill
              // Exception: Void (-99) handled separately?
              // The logic says "Level < 0". VOID is structureType='VOID'.
              // Usually VOID hexes have currentLevel 0 or -99?
              // Let's assume structureType='VOID' is immutable unless it was level 0.
              // But prompt says "Exception: Void hexes remain unchanged".
              if (hex.structureType === 'VOID') {
                  // Do nothing
              } else {
                  newLevel = hex.currentLevel + 1;
              }
          } else if (hex.currentLevel === 0) {
              // Rule 3: Plains to Void (20%)
              if (hex.structureType !== 'VOID' && Math.random() < ENTROPY_CONFIG.SHIFT_VOID_CHANCE) {
                  newType = 'VOID';
                  newLevel = 0; // Or -99 visual
              }
          }

          if (newLevel !== hex.currentLevel || newType !== hex.structureType) {
              updates[key] = {
                  ...hex,
                  currentLevel: newLevel,
                  maxLevel: newLevel, // Sync max level
                  structureType: newType,
                  progress: 0
              };
          }
      }

      state.grid = { ...state.grid, ...updates };

      // 3. Player Death Check
      const pKey = getHexKey(state.player.q, state.player.r);
      const pHex = state.grid[pKey];
      if (pHex && pHex.structureType === 'VOID') {
          state.gameStatus = 'DEFEAT';
          const msg = "Consumed by Entropy Shift.";
          state.messageLog.unshift({ id: `death-${now}`, text: msg, type: 'ERROR', source: 'SYSTEM', timestamp: now });
          events.push(GameEventFactory.create('DEFEAT', msg, state.player.id));
          return; 
      }

      // 4. Reset & Diminish
      state.entropy.max = state.entropy.max / 2;
      state.entropy.current = state.entropy.max;

      // 5. Global Game Over Check
      if (state.entropy.max < ENTROPY_CONFIG.THRESHOLD) {
          state.gameStatus = 'DEFEAT';
          const msg = "Sector Reality Collapsed. Entropy Critical.";
          state.messageLog.unshift({ id: `collapse-global-${now}`, text: msg, type: 'ERROR', source: 'SYSTEM', timestamp: now });
          events.push(GameEventFactory.create('DEFEAT', msg, undefined));
      }
  }
}
