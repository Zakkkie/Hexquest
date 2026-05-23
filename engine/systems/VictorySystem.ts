
import { System } from './System';
import { GameEvent, LeaderboardEntry, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { GameEventFactory } from '../events';
import { getHexKey } from '../../services/hexUtils';
import { checkShapeExists } from '../../services/shapeUtils';

export class VictorySystem implements System {
  update(state: SessionState, _index: WorldIndex, events: GameEvent[]): void {
    if (state.gameStatus === 'VICTORY' || state.gameStatus === 'DEFEAT') {
        return;
    }

    // --- CHECK SHAPE REQUIREMENTS ---
    if (state.activeLevelConfig && state.activeLevelConfig.requiredShapes && state.activeLevelConfig.requiredShapes.length > 0) {
        const allShapesBuilt = state.activeLevelConfig.requiredShapes.every(req => checkShapeExists(state, req));
        if (allShapesBuilt) {
            state.gameStatus = 'VICTORY';
            const msg = 'Shapes Completed!';
            state.messageLog.unshift({
                id: `win-shapes-${Date.now()}`,
                text: msg,
                type: 'SUCCESS',
                source: 'SYSTEM',
                timestamp: Date.now()
            });
            events.push(GameEventFactory.create('VICTORY', msg, state.player.id));
            this.generateLeaderboardEvent(state, events);
            return;
        }
    }

    // --- CHECK CAMPAIGN HOOKS ---
    if (state.activeLevelConfig && state.activeLevelConfig.hooks) {
        // 1. Victory Check
        if (state.activeLevelConfig.hooks.checkWinCondition) {
            const isCampaignWin = state.activeLevelConfig.hooks.checkWinCondition(state, _index);
            if (isCampaignWin) {
                 state.gameStatus = 'VICTORY';
                 const msg = 'Campaign Objective Achieved';
                 state.messageLog.unshift({
                    id: `win-camp-${Date.now()}`,
                    text: msg,
                    type: 'SUCCESS',
                    source: 'SYSTEM',
                    timestamp: Date.now()
                 });
                 events.push(GameEventFactory.create('VICTORY', msg, state.player.id));
                 this.generateLeaderboardEvent(state, events);
                 return;
            }
        }

        // 2. Loss Check
        if (state.activeLevelConfig.hooks.checkLossCondition) {
            const isCampaignLoss = state.activeLevelConfig.hooks.checkLossCondition(state, _index);
            if (isCampaignLoss) {
                 state.gameStatus = 'DEFEAT';
                 const msg = 'Critical Mission Failure';
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
        state.gameStatus = 'VICTORY';
        const msg = 'Mission Accomplished';
        
        state.messageLog.unshift({
            id: `win-${Date.now()}`,
            text: msg,
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
        });

        events.push(GameEventFactory.create('VICTORY', msg, state.player.id));
        this.generateLeaderboardEvent(state, events);
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

  private generateLeaderboardEvent(state: SessionState, events: GameEvent[]): void {
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
