import { System } from './System';
import { GameEvent, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';

export class EntropySystem implements System {
  update(state: SessionState, _index: WorldIndex, _events: GameEvent[]): void {
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
    }
  }
}
