
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
      const playerHexKey = getHexKey(state.player.q, state.player.r);
      let playerHitByShift = false;

      for (const key of gridKeys) {
          const hex = state.grid[key];
          
          // Exception: Immutable Monuments
          if (hex.structureType === 'MONUMENT') continue;

          let newLevel = hex.currentLevel;
          let newType = hex.structureType;
          let hasChanged = false;

          if (hex.currentLevel >= 1) {
              if (Math.random() < ENTROPY_CONFIG.SHIFT_COLLAPSE_CHANCE) {
                  newLevel = hex.currentLevel - 1;
                  hasChanged = true;
              }
          } else if (hex.currentLevel <= -1) {
              if (Math.random() < ENTROPY_CONFIG.SHIFT_FILL_CHANCE) {
                  newLevel = hex.currentLevel + 1;
                  hasChanged = true;
              }
          } else if (hex.currentLevel === 0) {
              // Level 0 logic
              if (hex.structureType !== 'VOID' && Math.random() < ENTROPY_CONFIG.SHIFT_VOID_CHANCE) {
                  newType = 'VOID';
                  newLevel = 0; 
                  hasChanged = true;
              }
          }

          if (hasChanged) {
              Object.assign(state.grid[key], {
                  currentLevel: newLevel,
                  maxLevel: newLevel, // Sync max level
                  structureType: newType,
                  progress: 0
              });

              // Check if player is standing on this shifting hex
              if (key === playerHexKey) {
                  playerHitByShift = true;
              }
          }
      }

      // 3. Player Damage Logic
      if (playerHitByShift) {
          if (state.player.playerLevel > 1) {
              state.player.playerLevel -= 1;
              const dmgMsg = "Instability Damage! Rank -1";
              state.messageLog.unshift({ id: `dmg-${now}`, text: dmgMsg, type: 'WARN', source: 'SYSTEM', timestamp: now });
              events.push(GameEventFactory.create('HEX_DOWNGRADE', dmgMsg, state.player.id));
          }
      }

      // 4. Player Death Check (Specific Void Check)
      const pKey = getHexKey(state.player.q, state.player.r);
      const pHex = state.grid[pKey];
      if (pHex && pHex.structureType === 'VOID') {
          state.gameStatus = 'DEFEAT';
          const msg = "Consumed by Entropy Shift.";
          state.messageLog.unshift({ id: `death-${now}`, text: msg, type: 'ERROR', source: 'SYSTEM', timestamp: now });
          events.push(GameEventFactory.create('DEFEAT', msg, state.player.id));
          return; 
      }

      // 5. Reset & Diminish
      state.entropy.max = state.entropy.max / 2;
      state.entropy.current = state.entropy.max;

      // 6. Global Game Over Check
      // Overriding threshold for Level 2.3 specifically to allow survival at 5 max entropy
      const effectiveThreshold = state.activeLevelConfig?.id === '2.3' ? 2 : ENTROPY_CONFIG.THRESHOLD;

      if (state.entropy.max < effectiveThreshold) {
          state.gameStatus = 'DEFEAT';
          const msg = "Sector Reality Collapsed. Entropy Critical.";
          state.messageLog.unshift({ id: `collapse-global-${now}`, text: msg, type: 'ERROR', source: 'SYSTEM', timestamp: now });
          events.push(GameEventFactory.create('DEFEAT', msg, undefined));
      }
  }
}
