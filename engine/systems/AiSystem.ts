
import { System } from './System';
import { GameState, GameEvent, EntityState, EntityType, SessionState, BotLogEntry } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { calculateBotMove } from '../../bot/calculateBotMove';
import { ActionProcessor } from '../ActionProcessor';
import { GAME_CONFIG } from '../../rules/config';
import { getHexKey } from '../../services/hexUtils';

export class AiSystem implements System {
  private actionProcessor: ActionProcessor;

  constructor(actionProcessor: ActionProcessor) {
    this.actionProcessor = actionProcessor;
  }

  update(state: SessionState, index: WorldIndex, events: GameEvent[]): void {
    const now = Date.now();
    
    // CRITICAL: Sync full state (Grid + Entities) here.
    // The AI needs accurate entity references (coins, moves, level) to make decisions.
    index.syncState(state);
    
    const tickObstacles = index.getOccupiedHexesList();
    const tickReservedKeys = new Set<string>();

    if (state.bots.length === 0) return;

    // --- TIME SLICING OPTIMIZATION ---
    // Only process ONE bot per tick to distribute load.
    // This ensures that even with complex pathfinding, the game loop remains responsive.
    const activeBotIndex = state.currentTurn % state.bots.length;
    const bot = state.bots[activeBotIndex];

    if (!bot) return; 
    if (bot.state !== EntityState.IDLE) return;
    
    // --- SPEED THROTTLE ---
    // Bots below level 3 act at half speed (2x interval)
    const baseInterval = GAME_CONFIG.BOT_ACTION_INTERVAL_MS;
    const interval = bot.playerLevel < 3 ? baseInterval * 2 : baseInterval;
    
    // Initialization Stagger:
    // If a bot has no history, give it a random offset so they don't all align on the same tick.
    if (!bot.lastActionTime) {
        bot.lastActionTime = now - Math.floor(Math.random() * interval);
        return; // Skip first frame to let stagger take effect
    }
    
    const lastAct = bot.lastActionTime;
    if (now - lastAct < interval) {
        return; 
    }

    const aiResult = calculateBotMove(
      bot, 
      state.grid, 
      state.player, 
      state.winCondition, 
      tickObstacles, 
      index, 
      state.stateVersion,
      state.difficulty,
      tickReservedKeys 
    );

    // PERSIST MEMORY (Crucial for Master Goal logic)
    if (aiResult.memory) {
        bot.memory = aiResult.memory;
    }

    const logEntry: BotLogEntry = {
        botId: bot.id,
        action: aiResult.action ? aiResult.action.type : 'WAIT',
        reason: aiResult.debug,
        timestamp: now,
        target: aiResult.action && aiResult.action.type === 'MOVE' && aiResult.action.path.length > 0
            ? `${aiResult.action.path[aiResult.action.path.length-1].q},${aiResult.action.path[aiResult.action.path.length-1].r}`
            : undefined
    };

    // 1. Short-term circular buffer for UI Debugger
    state.botActivityLog.unshift(logEntry);
    // Limit is enforced in store.ts GC now, but keeping a small safety cap here is harmless
    if (state.botActivityLog.length > 60) state.botActivityLog.pop();

    // 2. Full History for File Export
    state.fullBotHistory.push(logEntry);

    if (aiResult.action && aiResult.action.type !== 'WAIT') {
        // The `state` object passed here is the mutable copy from the GameEngine tick.
        const res = this.actionProcessor.applyAction(state, index, bot.id, aiResult.action);
        if (!res.ok) {
            events.push({
                type: 'ERROR',
                message: `Bot ${bot.id} action failed: ${res.reason}`,
                timestamp: now
            });
            // If action failed, maybe reset memory/goal to force rethink next tick?
            if (bot.memory) {
                bot.memory.lastActionFailed = true;
                bot.memory.stuckCounter = (bot.memory.stuckCounter || 0) + 1;
            }
        } else {
            if (aiResult.action.type === 'MOVE') {
                const target = aiResult.action.path[aiResult.action.path.length - 1];
                if (target) {
                    tickReservedKeys.add(getHexKey(target.q, target.r));
                }
            }
            // Reset stuck counter on success
            if (bot.memory) bot.memory.stuckCounter = 0;
        }
    }
    
    // Update individual timestamp
    bot.lastActionTime = now;
    state.lastBotActionTime = now;
  }
}
