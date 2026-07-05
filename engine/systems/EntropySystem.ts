
import { System } from './System';
import { GameEvent, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';

export class EntropySystem implements System {
  update(state: SessionState, _index: WorldIndex, _events: GameEvent[]): void {
    if (state.gameStatus !== 'PLAYING') return;

    if (state.activeLevelConfig?.id?.startsWith('1.') || state.defense?.isDefenseMode) {
      state.entropy.current = state.entropy.max;
      return;
    }

    // Check for Entropy Shift
    if (state.entropy.current <= 0) {
        state.entropy.current = 0; // clamp at 0 and do not trigger shift
    }
  }

}
