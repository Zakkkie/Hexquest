
import { LevelConfig } from './types';
import { GameEventFactory } from '../engine/events';

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  {
    id: '1.1',
    title: 'Simulation 1.1: Initialization',
    description: 'Objective: Capture 5 neutral sectors. \n\nBoundaries have collapsed. A void moat surrounds the playable area, followed by unstable fragments of high-level terrain. Watch your step.',
    
    mapConfig: {
      size: 7, // Radius 7 to fit the shattered outskirts
      type: 'procedural',
      generateWalls: true,
      wallStartRadius: 3, // Playable area radius 2. Void moat at 3.
      wallStartLevel: 6,
      wallType: 'void_shatter' // New "ragged" boundary style
    },

    startState: {
      credits: 5000, 
      moves: 50,     
      rank: 1        
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        // Win Condition: Player must own at least 6 hexes 
        // (1 starting hex + 5 captured neutral hexes)
        const ownedCount = Object.values(state.grid).filter(h => h.ownerId === state.player.id).length;
        return ownedCount >= 6;
      },
      
      onAfterAction: (state) => {
          // Hooks remain passive for now
      }
    }
  },
  {
    id: '1.2',
    title: 'Simulation 1.2: Thin Ice',
    description: 'Objective: Reach the Pyramid Apex.\n\nNavigate the unstable corridor. One path is safe, others will crumble. If you fall and your rank drops below 3, the simulation ends immediately.',
    
    mapConfig: {
      size: 8, // Canvas size large enough to hold the corridor and void
      type: 'fixed', 
      generateWalls: false
    },

    startState: {
      credits: 0, // No credits needed, pure movement puzzle
      moves: 25,  
      rank: 6     // Start High
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        // Target: Reaching the Pyramid Apex at (0, -7) which is L3
        // Note: Map Generation in store.ts must align with this coordinate
        if (state.player.q === 0 && state.player.r === -8) {
            return true;
        }
        return false;
      },
      checkLossCondition: (state) => {
          // Immediate Loss if rank drops below 3
          return state.player.playerLevel < 3;
      }
    }
  }
];
