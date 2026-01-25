
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

    if (!state.winCondition) return;
    
    // REMOVED: Tutorial guard. We now allow the tutorial to finish naturally via objectives.
    // if (state.winCondition.isTutorial) return;

    const { targetLevel, targetCoins, winType } = state.winCondition;
    const pLevel = state.player.playerLevel;
    const pCoins = state.player.totalCoinsEarned;
    
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

        // Pass player ID to identify it as player victory
        events.push(GameEventFactory.create('VICTORY', msg, state.player.id));
        this.generateLeaderboardEvent(state, events);
        return;
    }

    const winningBot = state.bots.find(b => {
         const bLevel = b.playerLevel;
         const bCoins = b.totalCoinsEarned;
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
        maxCoins: state.player.totalCoinsEarned,
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
