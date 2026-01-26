
import { System } from './System';
import { GameEvent, LeaderboardEntry, SessionState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { GameEventFactory } from '../events';

export class VictorySystem implements System {
  update(state: SessionState, index: WorldIndex, events: GameEvent[]): void {
    if (state.gameStatus === 'VICTORY' || state.gameStatus === 'DEFEAT') {
        const alreadyUpdated = events.some(e => e.type === 'LEADERBOARD_UPDATE');
        if (!alreadyUpdated) {
            this.generateLeaderboardEvent(state, events);
        }
        return;
    }

    // --- CHECK CAMPAIGN HOOKS ---
    if (state.activeLevelConfig && state.activeLevelConfig.hooks) {
        // 1. Victory Check
        if (state.activeLevelConfig.hooks.checkWinCondition) {
            const isCampaignWin = state.activeLevelConfig.hooks.checkWinCondition(state);
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
            const isCampaignLoss = state.activeLevelConfig.hooks.checkLossCondition(state);
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
    const statsEntry: LeaderboardEntry = {
        nickname: 'Player', 
        avatarColor: '#000', 
        avatarIcon: 'user',
        maxCoins: state.player.coins, 
        maxLevel: state.player.playerLevel,
        difficulty: state.difficulty,
        timestamp: Date.now()
    };

    events.push(GameEventFactory.create(
        'LEADERBOARD_UPDATE', 
        'Stats submitted', 
        state.player.id, 
        { entry: statsEntry }
    ));
  }
}
