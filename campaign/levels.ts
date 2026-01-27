
import { LevelConfig } from './types';
import { GameEventFactory } from '../engine/events';
import { getHexKey, getNeighbors } from '../services/hexUtils';
import { TEXT } from '../services/i18n';

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
    description: 'Objective: Reach the Pyramid Apex.\n\nNavigate the unstable corridor. Some sectors are barely holding together and will collapse if you step on them. Observe the cracks carefully.',
    
    mapConfig: {
      size: 7, // Canvas size, actual hexes are fixed
      type: 'fixed', 
      generateWalls: false
    },

    startState: {
      credits: 0, // No credits needed, pure movement puzzle
      moves: 20,  // Enough to reach the end if careful
      rank: 6     // Start High
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        // Target: Reaching the Pyramid Apex at (0, -7) which is L3
        // Only win if actually standing on it
        if (state.player.q === 0 && state.player.r === -7) {
            return true;
        }
        return false;
      },
      checkLossCondition: (state) => {
        // LOSS CONDITION: Falling rank (fell into void/collapsed hex)
        // Player starts at Rank 6. If they trigger collapse, they lose 1 rank per collapse.
        // Falling below rank 3 means they failed too many steps.
        return state.player.playerLevel < 3;
      }
    }
  },
  {
    id: '1.3',
    title: 'Simulation 1.3: The Foundation',
    description: 'Vertical construction protocol. \nObjective: Upgrade ANY sector to Level 2. \nTheory: "The Staircase Rule" - A structure cannot rise higher than its supports. Requires 2 neighbors of equal or lower tier.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          // --- PLAYABLE AREA (Triangle) ---
          // NOTE: Player spawns at (0,0) by default in engine.
          
          // 1. START (Edge Support): L1. Player starts here.
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true, durability: 6 },
          
          // 2. CENTER (Target Candidate): L1.
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true, durability: 6 },
          
          // 3. LEFT (Broken Support): L0. Needs to become L1 to support Center.
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          
          // --- BOUNDARIES (Void Ring surrounding the 3 hexes) ---
          
          { q: 1, r: -1, structureType: 'VOID', revealed: true }, // Right of Start
          { q: 1, r: 0, structureType: 'VOID', revealed: true },  // Bottom Right of Start
          { q: 0, r: 1, structureType: 'VOID', revealed: true },  // Bottom of Start / Right of L0
          { q: -1, r: 2, structureType: 'VOID', revealed: true }, // Bottom of L0
          { q: -2, r: 2, structureType: 'VOID', revealed: true }, // Left of L0
          { q: -2, r: 1, structureType: 'VOID', revealed: true }, // Left of Center
          { q: -2, r: 0, structureType: 'VOID', revealed: true }, // Top Left of Center
          { q: -1, r: -1, structureType: 'VOID', revealed: true }, // Top of Center
          { q: 0, r: -1, structureType: 'VOID', revealed: true }, // Top of Start
      ]
    },

    startState: {
      credits: 500,  // Enough for Upgrade (100) + Upgrade (300) + Buffer
      moves: 10,     
      rank: 2 
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          // Win if ANY owned hex is Level 2 or higher
          return Object.values(state.grid).some(h => 
              h.ownerId === state.player.id && h.maxLevel >= 2
          );
      },
      checkLossCondition: (state) => {
          // LOSS 1: Player stepped into VOID
          const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
          if (playerHex && playerHex.structureType === 'VOID') {
              return true;
          }

          // LOSS 2: Softlock
          // If no hex is L2, and we have less than 100 credits (cant build L1) and 0 moves.
          const hasLevel2 = Object.values(state.grid).some(h => h.maxLevel >= 2);
          if (!hasLevel2 && state.player.coins < 100 && state.player.moves === 0) {
              return true;
          }
          return false;
      },
      
      onBeforeAction: (state, action) => {
          // Tutorial Hint Logic: Check ANY upgrade to Level 2 attempt
          if (action.type === 'UPGRADE') {
              const hex = state.grid[getHexKey(action.coord.q, action.coord.r)];
              
              // If trying to upgrade FROM Level 1 TO Level 2
              if (hex && hex.maxLevel === 1 && action.intent !== 'RECOVER') {
                  const requiredLevel = 1; 
                  const neighbors = getNeighbors(hex.q, hex.r);
                  
                  const validSupports = neighbors.filter(n => {
                      const h = state.grid[getHexKey(n.q, n.r)];
                      // Must be at least level 1 to support a level 2 structure
                      return h && h.maxLevel >= requiredLevel;
                  });

                  if (validSupports.length < 2) {
                      const lang = state.language || 'EN';
                      return {
                          ok: false,
                          reason: TEXT[lang].HUD.TUT_1_3_ERROR_STAIRCASE
                      };
                  }
              }
          }
          return { ok: true };
      }
    }
  },
  {
    id: '1.4',
    title: 'Simulation 1.4: Reinforcement',
    description: 'Logistics stress-test. \nTask: Reinforce the central path to Level 2.\n\nProblem: You have no Upgrade Points and lack support structures. \nSolution: Capture the debris on the sides (L0) to charge your Cycle and create support.',
    
    mapConfig: {
      size: 7,
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          // 1. START BASE (Level 2 - Safe)
          { q: 0, r: 0, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          
          // 2. CENTRAL BRIDGE PATH (Level 1 - Fragile, Owned)
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 2, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 3, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // 3. SIDE DEBRIS (L0 - Neutral)
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true }, // Top Row
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 3, r: -1, structureType: 'VOID', revealed: true }, // Replaced with VOID as requested

          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true }, // Bottom Row
          { q: 2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 3, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },

          // 4. END BASE (Level 2 - Safe)
          { q: 4, r: 0, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },

          // 5. START DEBRIS (L0) - Extra charge if needed
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },

          // --- VOID BOUNDARIES (TIGHT SEAL) ---
          
          // Top Row Walls (r = -2)
          { q: -1, r: -2, structureType: 'VOID', revealed: true },
          { q: 0, r: -2, structureType: 'VOID', revealed: true },
          { q: 1, r: -2, structureType: 'VOID', revealed: true },
          { q: 2, r: -2, structureType: 'VOID', revealed: true },
          { q: 3, r: -2, structureType: 'VOID', revealed: true },
          { q: 4, r: -2, structureType: 'VOID', revealed: true },

          // Bottom Row Walls (r = 2)
          { q: -1, r: 2, structureType: 'VOID', revealed: true },
          { q: 0, r: 2, structureType: 'VOID', revealed: true },
          { q: 1, r: 2, structureType: 'VOID', revealed: true },
          { q: 2, r: 2, structureType: 'VOID', revealed: true },
          { q: 3, r: 2, structureType: 'VOID', revealed: true },
          { q: 4, r: 2, structureType: 'VOID', revealed: true },

          // Right Cap
          { q: 5, r: -1, structureType: 'VOID', revealed: true },
          { q: 5, r: 0, structureType: 'VOID', revealed: true },
          { q: 5, r: 1, structureType: 'VOID', revealed: true },
          
          // Left Cap
          { q: -1, r: -1, structureType: 'VOID', revealed: true },
          { q: -1, r: 1, structureType: 'VOID', revealed: true },
          { q: -2, r: 0, structureType: 'VOID', revealed: true },
          { q: -2, r: 1, structureType: 'VOID', revealed: true }, // Corner fill
          { q: -2, r: -1, structureType: 'VOID', revealed: true }, // Corner fill
      ]
    },

    startState: {
      credits: 6000,   // High credits
      moves: 20,       
      rank: 2          
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          // Win: The 3 CENTRAL bridge hexes (1,0), (2,0), (3,0) must be Level 2+
          const bridgeKeys = [getHexKey(1,0), getHexKey(2,0), getHexKey(3,0)];
          const bridgeHexes = bridgeKeys.map(k => state.grid[k]);
          
          // Check if all exist and are L2+
          const allReinforced = bridgeHexes.every(h => h && h.maxLevel >= 2);
          return allReinforced;
      },
      checkLossCondition: (state) => {
          // Loss 1: Rank drop (fell into void)
          if (state.player.playerLevel < 2) return true;
          
          // Loss 2: Central Bridge collapsed (Any CENTER bridge hex became VOID)
          const bridgeKeys = [getHexKey(1,0), getHexKey(2,0), getHexKey(3,0)];
          const anyCollapsed = bridgeKeys.some(k => state.grid[k]?.structureType === 'VOID');
          if (anyCollapsed) return true;

          return false;
      }
    }
  }
];
