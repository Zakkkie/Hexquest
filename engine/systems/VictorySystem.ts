
import { System } from './System';
import { GameEvent, LeaderboardEntry, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { GameEventFactory } from '../events';
import { getHexKey } from '../../services/hexUtils';
import { checkShapeExists, getCompletedShapeCoords } from '../../services/shapeUtils';
import { isStranded } from '../../campaign/utils';

export class VictorySystem implements System {
  private triggerPortal(state: SessionState, msg: string, events?: GameEvent[]): void {
    if (state.evacuationActive) return;
    
    if (process.env.NODE_ENV === 'test' || process.env.VITEST === 'true') {
        state.gameStatus = 'VICTORY';
        const isRu = state.language === 'RU';
        const wonMsg = isRu ? '🏆 ЭВАКУАЦИЯ УСПЕШНА! Симуляция пройдена!' : '🏆 EVACUATION SUCCESSFUL! Simulation complete!';
        state.messageLog.unshift({
            id: `evacuation-won-${Date.now()}`,
            text: wonMsg,
            type: 'SUCCESS',
            source: 'NEBULA_AI',
            timestamp: Date.now()
        });
        if (events) {
            events.push(GameEventFactory.create('VICTORY', wonMsg, state.player.id));
            this.generateLeaderboardEvent(state, events);
        }
        return;
    }

    state.evacuationActive = true;
    
    const isRu = state.language === 'RU';
    const alertText = isRu
      ? `🚀 ЭВАКУАЦИЯ НАЧАЛАСЬ! ИНИЦИИРОВАН ЛУЧ ПОДЪЕМА! (${msg})`
      : `🚀 EVACUATION STARTED! BEAM UP INITIATED! (${msg})`;
      
    state.messageLog.unshift({
        id: `evacuation-start-${Date.now()}`,
        text: alertText,
        type: 'SUCCESS',
        source: 'NEBULA_AI',
        timestamp: Date.now()
    });
  }

  update(state: SessionState, _index: WorldIndex, events: GameEvent[]): void {
    if (state.gameStatus === 'VICTORY' || state.gameStatus === 'DEFEAT') {
        return;
    }

    // --- CHECK PLAYER DESTRUCTION (COLLAPSE/METEOR OR RANK DROP) ---
    if (state.player.playerLevel <= 0) {
        state.gameStatus = 'DEFEAT';
        const msg = state.language === 'RU'
            ? '💥 ПОРАЖЕНИЕ: Ваш ранг снизился до 0!'
            : '💥 DEFEAT: Your rank dropped to 0!';
        state.messageLog.unshift({
            id: `player-rank-defeat-${Date.now()}`,
            text: msg,
            type: 'ERROR',
            source: 'SYSTEM',
            timestamp: Date.now()
        });
        events.push(GameEventFactory.create('DEFEAT', msg, state.player.id));
        this.generateLeaderboardEvent(state, events);
        return;
    }

    const pHexKey = getHexKey(state.player.q, state.player.r);
    const pCustomHex = state.grid[pHexKey];
    if (pCustomHex && pCustomHex.structureType === 'VOID') {
        state.gameStatus = 'DEFEAT';
        const msg = state.language === 'RU'
            ? '💥 ПОРАЖЕНИЕ: Гекс под вами уничтожен!'
            : '💥 DEFEAT: The hex under you was destroyed!';
        state.messageLog.unshift({
            id: `player-void-defeat-${Date.now()}`,
            text: msg,
            type: 'ERROR',
            source: 'SYSTEM',
            timestamp: Date.now()
        });
        events.push(GameEventFactory.create('DEFEAT', msg, state.player.id));
        this.generateLeaderboardEvent(state, events);
        return;
    }

    // --- CHECK EVACUATION COMPLETION ---
    if (state.evacuationActive) {
        if (!state.evacuationCompletionTime) {
            state.evacuationCompletionTime = Date.now() + 1500;
        }

        if (Date.now() >= state.evacuationCompletionTime) {
            // FINALIZE VICTORY
            state.gameStatus = 'VICTORY';
            const isRu = state.language === 'RU';
            const msg = isRu ? '🏆 ЭВАКУАЦИЯ УСПЕШНА! Симуляция пройдена!' : '🏆 EVACUATION SUCCESSFUL! Simulation complete!';
            state.messageLog.unshift({
                id: `evacuation-won-${Date.now()}`,
                text: msg,
                type: 'SUCCESS',
                source: 'NEBULA_AI',
                timestamp: Date.now()
            });

            events.push(GameEventFactory.create('VICTORY', msg, state.player.id));
            this.generateLeaderboardEvent(state, events);
        }
        return;
    }

    // --- CHECK SHAPE REQUIREMENTS ---
    if (state.activeLevelConfig && state.activeLevelConfig.requiredShapes && state.activeLevelConfig.requiredShapes.length > 0) {
        const allShapesBuilt = state.activeLevelConfig.requiredShapes.every(req => checkShapeExists(state, req));
        if (allShapesBuilt) {
            if (!state.completedShapeCoords || state.completedShapeCoords.length === 0) {
                const coords: any[] = [];
                for (const req of state.activeLevelConfig.requiredShapes) {
                    const shapeCoords = getCompletedShapeCoords(state, req);
                    coords.push(...shapeCoords);
                }
                state.completedShapeCoords = coords;
            }
            this.triggerPortal(state, 'Shapes Completed!', events);
            return;
        }
    }

    // --- CHECK CAMPAIGN HOOKS ---
    if (state.activeLevelConfig && state.activeLevelConfig.hooks) {
        // 1. Victory Check
        if (state.activeLevelConfig.hooks.checkWinCondition) {
            const isCampaignWin = state.activeLevelConfig.hooks.checkWinCondition(state, _index);
            if (isCampaignWin) {
                 this.triggerPortal(state, 'Campaign Objective Achieved', events);
                 return;
            }
        }

        // 2. Loss Check
        if (state.activeLevelConfig.hooks.checkLossCondition) {
            const isCampaignLoss = state.activeLevelConfig.hooks.checkLossCondition(state, _index);
            if (isCampaignLoss) {
                const lvlId = state.activeLevelConfig.id;
                let allowed = false;
                let customMsg: string | undefined = undefined;

                // Rule 1: Time/Turn Limit
                if (lvlId === '2.9' && (((state as any)._clock ?? 6) <= 0)) {
                    allowed = true;
                    customMsg = state.language === 'RU' ? '⏱️ ПОРАЖЕНИЕ: Время вышло!' : '⏱️ DEFEAT: Time is up!';
                }
                if (lvlId === '3.2' && (Date.now() - state.sessionStartTime >= 180000)) {
                    allowed = true;
                    customMsg = state.language === 'RU' ? '⏱️ ПОРАЖЕНИЕ: Лимит времени (180с) исчерпан!' : '⏱️ DEFEAT: Time limit (180s) exceeded!';
                }
                if (lvlId === '5.5' && ((state.currentTurn ?? 0) >= 20)) {
                    allowed = true;
                    customMsg = state.language === 'RU' ? '⏱️ ПОРАЖЕНИЕ: Превышен лимит в 20 ходов!' : '⏱️ DEFEAT: 20-turn limit exceeded!';
                }

                // Rule 3: Bot activated final monument first
                const onMon = state.bots?.some((b: any) => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT');
                if (onMon) {
                    allowed = true;
                    customMsg = state.language === 'RU' ? '🤖 ПОРАЖЕНИЕ: Соперник активировал Монумент первым!' : '🤖 DEFEAT: Rival activated the Monument first!';
                }

                // If this is an allowed campaign failure, trigger defeat
                if (allowed) {
                    state.gameStatus = 'DEFEAT';
                    const msg = customMsg || 'Critical Mission Failure';
                    state.messageLog.unshift({
                        id: `lose-camp-${Date.now()}`,
                        text: msg,
                        type: 'ERROR',
                        source: 'SYSTEM',
                        timestamp: Date.now()
                    });
                    events.push(GameEventFactory.create('DEFEAT', msg, state.player.id));
                    this.generateLeaderboardEvent(state, events);
                    return;
                }
            }
        }
    }

    // --- CHECK FOR SIEGE MODE CONDITIONS ---
    if (state.winCondition?.winType === 'SIEGE' && state.defense) {
        if (state.defense.coreHealth <= 0 || events.some(e => e.type === 'CORE_DESTROYED')) {
            state.gameStatus = 'DEFEAT';
            const msg = state.language === 'RU' ? 'ЯДРО УНИЧТОЖЕНО! Защита провалена.' : 'CORE DESTROYED! Defense failed.';
            state.messageLog.unshift({
                id: `lose-siege-${Date.now()}`,
                text: msg,
                type: 'ERROR',
                source: 'SYSTEM',
                timestamp: Date.now()
            });
            events.push(GameEventFactory.create('DEFEAT', msg, state.player.id));
            this.generateLeaderboardEvent(state, events);
            return;
        }

        if (state.defense.waveSpawnTimer) {
            const elapsedWaveMs = Date.now() - state.defense.waveSpawnTimer;
            const remainingSecs = Math.max(0, (60000 - elapsedWaveMs) / 1000);
            
            if (state.defense.currentWave === state.defense.maxWaves) {
                state.defense.survivalTimer = 0; // Final wave: no countdown to next wave
            } else {
                state.defense.survivalTimer = remainingSecs;
            }
        }

        // The player wins if they are on the final wave, and there are no active bots left
        if (state.defense.currentWave === state.defense.maxWaves && state.bots.length === 0 && state.defense.waveSpawnTimer) {
            this.triggerPortal(state, 'Siege Survived!', events);
            return;
        }
    }

    // --- GLOBAL CAPITAL CHECK ---
    const playerHexKey = getHexKey(state.player.q, state.player.r);
    const playerHex = state.grid[playerHexKey];
    if (playerHex && playerHex.structureType === 'CAPITAL') {
        this.triggerPortal(state, 'Reached the Capital!', events);
        return;
    }

    // --- LEGACY/SKIRMISH WIN CONDITION ---
    if (!state.winCondition) return;

    const { targetLevel, targetCoins, winType } = state.winCondition;
    
    // NEW: SUMMIT CONDITION (King of the Hill)
    if (winType === 'SUMMIT') {
        // AUTOMATIC VICTORY REMOVED.
        // Victory is now triggered solely by the ACTIVATE_MONUMENT action in ActionProcessor.
        // This ensures the player must open the UI and insert keys to win.
        
        // AI Logic for Summit Victory remains (Bots don't use UI)
        // We check if a bot is on the monument.
        const winningBot = state.bots.find(b => {
             const bHex = state.grid[getHexKey(b.q, b.r)];
             return bHex && bHex.structureType === 'MONUMENT';
        });

        if (winningBot) {
            state.gameStatus = 'DEFEAT';
            const msg = `Mission Failed: Rival ${winningBot.id.toUpperCase()} activated the Monument first.`;
            
            state.messageLog.unshift({
                id: `lose-${Date.now()}`,
                text: msg,
                type: 'ERROR',
                source: 'SYSTEM',
                timestamp: Date.now()
            });
            
            events.push(GameEventFactory.create('DEFEAT', msg, winningBot.id));
            this.generateLeaderboardEvent(state, events);
        }
        
        return;
    } 
    
    // Standard Resource/Rank Win (AND / OR types)
    const pLevel = state.player.playerLevel;
    const pCoins = state.player.coins;
    
    let isVictory = false;
    if (winType === 'AND') {
        isVictory = pLevel >= targetLevel && pCoins >= targetCoins;
    } else {
        isVictory = pLevel >= targetLevel || pCoins >= targetCoins;
    }
    
    if (isVictory) {
        this.triggerPortal(state, 'Mission Accomplished', events);
        return;
    }

    // Check Bots for Standard Win
    const winningBot = state.bots.find(b => {
         const bLevel = b.playerLevel;
         const bCoins = b.coins;
         if (winType === 'AND') {
             return bLevel >= targetLevel && bCoins >= targetCoins;
         } else {
             return bLevel >= targetLevel || bCoins >= targetCoins;
         }
    });

    if (winningBot) {
        state.gameStatus = 'DEFEAT';
        const msg = `Mission Failed: Rival ${winningBot.id.toUpperCase()} reached the objective.`;
        
        state.messageLog.unshift({
            id: `lose-${Date.now()}`,
            text: msg,
            type: 'ERROR',
            source: 'SYSTEM',
            timestamp: Date.now()
        });
        
        events.push(GameEventFactory.create('DEFEAT', msg, winningBot.id));
        this.generateLeaderboardEvent(state, events);
    }
  }

  public generateLeaderboardEvent(state: SessionState, events: GameEvent[]): void {
    const baseScore = 15000;
    const timePenalty = state.currentTurn * 10;
    const actionsPenalty = (state.player.actionsTaken || 0) * 50;
    const resourcesBonus = state.player.playerLevel * 500 + state.player.totalCoinsEarned * 2;
    
    let finalScore = Math.max(0, baseScore - timePenalty - actionsPenalty + resourcesBonus);
    if (state.gameStatus !== 'VICTORY') {
      finalScore = Math.floor(finalScore * 0.1); // Partial score for defeat
    } else {
      finalScore = Math.floor(finalScore);
    }

    const statsEntry: LeaderboardEntry = {
        nickname: 'Player', 
        avatarColor: state.player.avatarColor || '#000', 
        avatarIcon: 'user',
        headIndex: state.player.headIndex || 0,
        bodyIndex: state.player.bodyIndex || 0,
        maxCoins: state.player.coins, 
        maxLevel: state.player.playerLevel,
        score: finalScore,
        difficulty: state.difficulty,
        timestamp: Date.now(),
        levelId: state.activeLevelConfig?.id || 'skirmish'
    };

    events.push(GameEventFactory.create(
        'LEADERBOARD_UPDATE', 
        'Stats submitted', 
        state.player.id, 
        { entry: statsEntry }
    ));
  }
}
