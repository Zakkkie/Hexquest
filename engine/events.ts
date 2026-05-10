
import { GameEvent, GameEventType } from '../types';

export class GameEventFactory {
  static create(type: GameEventType, message?: string, entityId?: string, data?: Record<string, unknown>): GameEvent {
    return {
      id: Math.random().toString(36).substring(7),
      type,
      message,
      entityId,
      data,
      timestamp: Date.now()
    };
  }
}
