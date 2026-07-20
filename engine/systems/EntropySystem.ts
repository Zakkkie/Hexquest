import { System } from './System';
import { GameEvent, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { GameEventFactory } from '../events';

export class EntropySystem implements System {
  update(state: SessionState, _index: WorldIndex, events: GameEvent[]): void {
    if (state.gameStatus !== 'PLAYING') return;

    // Check for 5-minute player inactivity
    const lastAction = state.lastPlayerActionTime || state.sessionStartTime || Date.now();
    if (Date.now() - lastAction >= 5 * 60 * 1000) {
      if (state.entropy.current > 0) {
        state.entropy.current = 0;
        const msg = state.language === 'RU'
          ? '⚠️ ОБНАРУЖЕН ПРОСТОЙ: Энтропия упала до нуля из-за бездействия!'
          : '⚠️ IDLE DETECTED: Entropy has collapsed to zero due to inactivity!';
        state.messageLog.unshift({
          id: `idle-entropy-collapse-${Date.now()}`,
          text: msg,
          type: 'ERROR',
          source: 'SYSTEM',
          timestamp: Date.now()
        });
      }
    }

    // Skip entropy mechanics for tutorial/intro levels (1.x) or defense/siege mode
    if (state.activeLevelConfig?.id?.startsWith('1.') || state.defense?.isDefenseMode) {
      // If idle collapse has occurred, let it stay 0, otherwise pin to max
      if (Date.now() - lastAction < 5 * 60 * 1000) {
        state.entropy.current = state.entropy.max;
      }
      return;
    }

    // Ensure entropy current is clamped to 0 at minimum.
    if (state.entropy.current <= 0) {
      state.entropy.current = 0;

      // 1. Emit ENTROPY_SHIFT event
      events.push(GameEventFactory.create('ENTROPY_SHIFT', 'ENTROPY SHIFT DETECTED!', state.player.id));

      // 2. Add message to log
      const msgText = state.language === 'RU'
        ? '⚠️ КРИТИЧЕСКИЙ СДВИГ ЭНТРОПИИ: Дестабилизация ядра!'
        : '⚠️ CRITICAL: ENTROPY SHIFT DETECTED! Core destabilization active!';
      state.messageLog.unshift({
        id: `entropy-shift-${Date.now()}`,
        text: msgText,
        type: 'ERROR',
        source: 'SYSTEM',
        timestamp: Date.now()
      });

      // 3. Shift terrain
      for (const key in state.grid) {
        const hex = state.grid[key];
        if (hex.structureType === 'MONUMENT') continue;

        if (hex.currentLevel >= 1) {
          // Collapse level 1+ hexes with 50% chance
          if (Math.random() < 0.5) {
            hex.currentLevel -= 1;
            // If player stands on this collapsing hex, decrease rank
            if (state.player.q === hex.q && state.player.r === hex.r) {
              state.player.playerLevel = Math.max(1, state.player.playerLevel - 1);
            }
          }
        } else if (hex.currentLevel < 0) {
          // Fill deep hexes (L < 0) with 50% chance
          if (Math.random() < 0.5) {
            hex.currentLevel += 1;
          }
        } else if (hex.currentLevel === 0 && hex.structureType !== 'VOID') {
          // Void 10% of level 0 hexes
          if (Math.random() < 0.1) {
            hex.structureType = 'VOID';
          }
        }
      }

      // Check if player stands on a VOID hex
      const playerHex = state.grid[`${state.player.q},${state.player.r}`];
      if (playerHex && playerHex.structureType === 'VOID') {
        state.gameStatus = 'DEFEAT';
        const defeatMsg = state.language === 'RU'
          ? '💥 ПОРАЖЕНИЕ: Гекс под вами превратился в Пустоту!'
          : '💥 DEFEAT: The hex under you collapsed into the Void!';
        state.messageLog.unshift({
          id: `player-void-defeat-${Date.now()}`,
          text: defeatMsg,
          type: 'ERROR',
          source: 'SYSTEM',
          timestamp: Date.now()
        });
        events.push(GameEventFactory.create('DEFEAT', defeatMsg, state.player.id));
        return;
      }

      // 4. Halve max and reset current
      state.entropy.max = Math.floor(state.entropy.max / 2);
      state.entropy.current = state.entropy.max;

      // 5. Trigger defeat if max below threshold
      if (state.entropy.max < state.entropy.threshold) {
        state.gameStatus = 'DEFEAT';
        const thresholdMsg = state.language === 'RU'
          ? '💥 ПОРАЖЕНИЕ: Предельная емкость энтропии упала ниже безопасного порога!'
          : '💥 DEFEAT: Entropy capacity dropped below safe threshold!';
        state.messageLog.unshift({
          id: `entropy-threshold-defeat-${Date.now()}`,
          text: thresholdMsg,
          type: 'ERROR',
          source: 'SYSTEM',
          timestamp: Date.now()
        });
        events.push(GameEventFactory.create('DEFEAT', thresholdMsg, state.player.id));
      }
    }
  }
}
