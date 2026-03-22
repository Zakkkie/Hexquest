import { System } from './System';
import { GameEvent, EntityState, SessionState, BotLogEntry } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { calculateBotMove } from '../../bot/calculateBotMove';
import { TransactionQueue } from '../../services/transactionQueue';
import { GAME_CONFIG } from '../../rules/config';
import { getHexKey } from '../../services/hexUtils';
import { historyService } from '../../services/historyService';

export class AiSystem implements System {
  private transactionQueue: TransactionQueue;

  constructor(transactionQueue: TransactionQueue) {
    this.transactionQueue = transactionQueue;
  }

  update(state: SessionState, index: WorldIndex, _events: GameEvent[]): void {
    const now = Date.now();
    
    // CRITICAL: Sync full state (Grid + Entities) here.
    // The AI needs accurate entity references (coins, moves, level) to make decisions.
    index.syncState(state);
    
    const tickObstacles = index.getOccupiedHexesList();
    const tickReservedKeys = new Set<string>();

    if (state.bots.length === 0) return;

    // --- TIME SLICING OPTIMIZATION ---
    // Only process ONE bot per tick to distribute load.
    const activeBotIndex = state.currentTurn % state.bots.length;
    const bot = state.bots[activeBotIndex];

    if (!bot) return; 
    if (bot.state !== EntityState.IDLE) return;
    
    // --- SPEED THROTTLE ---
    const baseInterval = GAME_CONFIG.BOT_ACTION_INTERVAL_MS;
    // В кампании не замедляем бота по рангу — на закрытых картах он и так ограничен ресурсами
    const isCampaign = !!state.activeLevelConfig;
    const interval = (!isCampaign && bot.playerLevel < 3) ? baseInterval * 2 : baseInterval;
    
    if (!bot.lastActionTime) {
        bot.lastActionTime = now - Math.floor(Math.random() * interval);
        return; 
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
      tickReservedKeys,
      state.bots,
      state.activeLevelConfig  // передаём полный конфиг уровня (содержит botObjective)
    );

    // PERSIST MEMORY
    if (aiResult.memory) {
        bot.memory = aiResult.memory;
    }

    // Sync bot rank to its highest owned hex level (instant, no 3s delay)
    const ownedHexes = index.getHexesByOwner(bot.id);
    for (const hex of ownedHexes) {
        if (hex.maxLevel > bot.playerLevel) {
            bot.playerLevel = hex.maxLevel;
        }
    }

    // --- ENHANCED LOGGING ---
    let targetStr: string | undefined = undefined;
    if (aiResult.action) {
        let tQ: number | undefined;
        let tR: number | undefined;

        if (aiResult.action.type === 'MOVE' && aiResult.action.path.length > 0) {
            const dest = aiResult.action.path[aiResult.action.path.length - 1];
            tQ = dest.q;
            tR = dest.r;
        } else if (aiResult.action.type === 'UPGRADE' || aiResult.action.type === 'DIG') {
            tQ = aiResult.action.coord.q;
            tR = aiResult.action.coord.r;
        }

        if (tQ !== undefined && tR !== undefined) {
            const h = state.grid[getHexKey(tQ, tR)];
            const lvl = h ? h.currentLevel : '?';
            targetStr = `(${tQ},${tR}) L:${lvl}`;
        }
    }

    const logEntry: BotLogEntry = {
        botId: bot.id,
        action: aiResult.action ? aiResult.action.type : 'WAIT',
        reason: aiResult.debug,
        timestamp: now,
        target: targetStr
    };

    state.botActivityLog.unshift(logEntry);
    if (state.botActivityLog.length > 60) state.botActivityLog.pop();
    historyService.addEntry(logEntry);

    // ENQUEUE ACTION instead of applying immediately
    if (aiResult.action && aiResult.action.type !== 'WAIT') {
        this.transactionQueue.enqueue({
            actorId: bot.id,
            action: aiResult.action,
            priority: 50, // Standard Bot Priority
            timestamp: now
        });
        
        // Speculatively reserve the target to prevent other bots in same tick (if we processed >1) from targeting it
        if (aiResult.action.type === 'MOVE') {
            const target = aiResult.action.path[aiResult.action.path.length - 1];
            if (target) {
                tickReservedKeys.add(getHexKey(target.q, target.r));
            }
        }
    }
    
    // Update individual timestamp
    bot.lastActionTime = now;
    state.lastBotActionTime = now;
  }
}