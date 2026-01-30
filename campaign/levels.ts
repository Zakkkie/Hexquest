
import { LevelConfig } from './types';
import { GameEventFactory } from '../engine/events';
import { getHexKey, getNeighbors } from '../services/hexUtils';
import { TEXT } from '../services/i18n';

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  {
    id: '1.1',
    title: 'Simulation 1.1: Expansion',
    description: 'Objective: Secure 3 sectors.\n\nThe navigation system needs calibration. Capture adjacent sectors to establish a perimeter.',
    
    mapConfig: {
      size: 5, 
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          // Player Start (L1)
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Neighbors (L0) - Playable Area
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },

          // --- VOID PERIMETER (Ring 2 - Distance 2 from Center) ---
          // Seals the 7-hex cluster perfectly
          { q: 0, r: -2, structureType: 'VOID', revealed: true },
          { q: 1, r: -2, structureType: 'VOID', revealed: true },
          { q: 2, r: -2, structureType: 'VOID', revealed: true },
          { q: 2, r: -1, structureType: 'VOID', revealed: true },
          { q: 2, r: 0, structureType: 'VOID', revealed: true },
          { q: 1, r: 1, structureType: 'VOID', revealed: true },
          { q: 0, r: 2, structureType: 'VOID', revealed: true },
          { q: -1, r: 2, structureType: 'VOID', revealed: true },
          { q: -2, r: 2, structureType: 'VOID', revealed: true },
          { q: -2, r: 1, structureType: 'VOID', revealed: true },
          { q: -2, r: 0, structureType: 'VOID', revealed: true },
          { q: -1, r: -1, structureType: 'VOID', revealed: true },
      ]
    },

    startState: {
      credits: 1000, 
      moves: 10,     
      rank: 1        
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        // Win Condition: Player must own 4 hexes total (1 Start + 3 Captured)
        // This allows capturing ANY 3 neighbors instead of specific ones.
        const ownedCount = Object.values(state.grid).filter(h => h.ownerId === state.player.id).length;
        return ownedCount >= 4;
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
        // Target: Reaching the Pyramid Apex (marked as CAPITAL in mapGenerator)
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        if (playerHex && playerHex.structureType === 'CAPITAL') {
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
    description: 'Vertical construction protocol. \nObjective: Upgrade ANY sector to Level 2. \n\nProblem: You lack supports. \nSolution: Upgrade 2 neighbors to Level 1 first, then build Level 2.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          // --- PLAYABLE AREA (Triangle) ---
          
          // 1. START (Edge Support): L1. Player starts here.
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true, durability: 6 },
          
          // 2. CENTER: Was L1, Now L0 (Neutral/Empty).
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          
          // 3. LEFT: L0 (Neutral/Empty).
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          
          // --- BOUNDARIES (Void Ring surrounding the 3 hexes) ---
          { q: 1, r: -1, structureType: 'VOID', revealed: true }, 
          { q: 1, r: 0, structureType: 'VOID', revealed: true },  
          { q: 0, r: 1, structureType: 'VOID', revealed: true },  
          { q: -1, r: 2, structureType: 'VOID', revealed: true }, 
          { q: -2, r: 2, structureType: 'VOID', revealed: true }, 
          { q: -2, r: 1, structureType: 'VOID', revealed: true }, 
          { q: -2, r: 0, structureType: 'VOID', revealed: true }, 
          { q: -1, r: -1, structureType: 'VOID', revealed: true }, 
          { q: 0, r: -1, structureType: 'VOID', revealed: true }, 
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
          { q: 3, r: -1, structureType: 'VOID', revealed: true }, // Void Hole

          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true }, // Bottom Row
          { q: 2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 3, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },

          // 4. END BASE (Level 2 - Safe)
          { q: 4, r: 0, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },

          // 5. START DEBRIS (L0) - Extra charge if needed
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },

          // --- VOID BOUNDARIES (COMPREHENSIVE SEAL) ---
          
          // Left Cap (Expanded)
          { q: -2, r: -1, structureType: 'VOID', revealed: true }, // Top Left Corner
          { q: -2, r: 0, structureType: 'VOID', revealed: true },
          { q: -2, r: 1, structureType: 'VOID', revealed: true },
          { q: -1, r: 1, structureType: 'VOID', revealed: true },
          { q: -1, r: 2, structureType: 'VOID', revealed: true }, // Bottom Left Seal (Fixes Gap)
          { q: -1, r: -1, structureType: 'VOID', revealed: true },
          
          // Top Edge
          { q: 0, r: -2, structureType: 'VOID', revealed: true },
          { q: 1, r: -2, structureType: 'VOID', revealed: true },
          { q: 2, r: -2, structureType: 'VOID', revealed: true },
          { q: 3, r: -2, structureType: 'VOID', revealed: true },
          { q: 4, r: -2, structureType: 'VOID', revealed: true }, // Top Right Corner
          { q: 4, r: -1, structureType: 'VOID', revealed: true },

          // Bottom Edge
          { q: 0, r: 2, structureType: 'VOID', revealed: true },
          { q: 1, r: 2, structureType: 'VOID', revealed: true },
          { q: 2, r: 2, structureType: 'VOID', revealed: true },
          { q: 3, r: 2, structureType: 'VOID', revealed: true },
          { q: 4, r: 2, structureType: 'VOID', revealed: true }, // Bottom Right Corner
          { q: 4, r: 1, structureType: 'VOID', revealed: true },

          // Right Cap (Expanded)
          { q: 5, r: 0, structureType: 'VOID', revealed: true },
          { q: 5, r: -1, structureType: 'VOID', revealed: true },
          { q: 5, r: 1, structureType: 'VOID', revealed: true },
          { q: 5, r: -2, structureType: 'VOID', revealed: true }, // Cap Padding
          { q: 5, r: 2, structureType: 'VOID', revealed: true },  // Cap Padding
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
  },
  {
    id: '1.5',
    title: 'Simulation 1.5: Deep Recovery',
    description: 'Protocol: Recovery Cycle\nObjective: Accumulate 100 Credits in 60s.\n\nStart with 0 Credits and 3 Moves. Use the "Recovery" action on high-level debris to regenerate moves and gain credits.',
    
    mapConfig: {
      size: 15,
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          // CENTER (START - Safe Zone)
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true, durability: 6 },

          // INNER RING (L1 & L2 Mix - Smooth Start)
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 0, r: -1, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },

          // RING 2 (Climbing to L3)
          // Ensure valid adjacency (neighbors differ by <= 1 level)
          { q: 2, r: 0, maxLevel: 3, currentLevel: 3, ownerId: 'player-1', revealed: true }, // Adj to (1,0)L2
          { q: 2, r: -1, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          { q: 2, r: -2, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true }, // Easy entry point
          
          { q: 1, r: 1, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          { q: 0, r: 2, maxLevel: 3, currentLevel: 3, ownerId: 'player-1', revealed: true }, // Adj to (-1,1)L2 or (0,1)L1? Wait (0,1) is L1. Need L2 in between.
          // Fix: (0,1) is L1. (0,2) is L3 -> too high? (0,2) neighbors (0,1)L1, (1,1)L2, (-1,2), (-1,1)L2.
          // So (0,2) has L2 neighbors. Accessible via (1,1) or (-1,1).

          { q: -1, r: 2, maxLevel: 3, currentLevel: 3, ownerId: 'player-1', revealed: true },
          { q: -2, r: 2, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          { q: -2, r: 1, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          
          { q: -2, r: 0, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          { q: -1, r: -1, maxLevel: 3, currentLevel: 3, ownerId: 'player-1', revealed: true }, // Adj to (-1,0)L1? No, (-1,0) is L1. (-1,-1) needs L2 neighbor. (0,-1) is L2. OK.
          
          { q: 0, r: -2, maxLevel: 3, currentLevel: 3, ownerId: 'player-1', revealed: true },
          { q: 1, r: -2, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },

          // RING 3 (High Value L4/L5)
          { q: 3, r: 0, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true },
          { q: 3, r: -1, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true },
          { q: 4, r: 0, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true }, // The Peak

          { q: -2, r: 3, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true },
          { q: -3, r: 3, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true }, // The Peak

          // EXTRA LOW LEVEL FILLER (For movement currency)
          { q: 3, r: -2, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          { q: 3, r: -3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: -3, r: 2, maxLevel: 3, currentLevel: 3, ownerId: 'player-1', revealed: true },
          { q: -3, r: 1, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          
          // Void border implies rest is empty space (auto-handled)
      ]
    },

    startState: {
      credits: 0,
      moves: 3,
      rank: 8 // High rank to allow access to L8 hexes
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          return state.player.coins >= 100;
      },
      checkLossCondition: (state) => {
          // TIME LIMIT: 60 Seconds
          const limit = 60 * 1000; 
          const elapsed = Date.now() - state.sessionStartTime;
          
          if (elapsed > limit) return true;

          // Also lose if fell into void (Rank drop)
          if (state.player.playerLevel < 8) return true;

          return false;
      }
    }
  },
  {
    id: '1.6',
    title: 'Simulation 1.6: Cycle Protocol',
    description: 'Objective: Reach Level 3 on ANY sector.\n\nConstraint: QUEUE SIZE = 1.\nYou cannot upgrade the same sector twice in a row. Alternate targets.',
    
    mapConfig: {
      size: 4, 
      type: 'fixed',
      generateWalls: true, 
      wallStartRadius: 4, // Void ring at distance 4
      customLayout: [
          // CENTER & IMMEDIATE NEIGHBORS (Safe Zone)
          // Player starts at (0,0)
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Primary Alternator Target
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Backup (L0) in case they mess up
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },

          // Everything else out to Radius 3 is L0/Empty space handled by generateMap default or explicit voids
          // We let the 'generateWalls: true' handle the outer rim at R=4
      ]
    },

    startState: {
      credits: 500, // Enough for L1->L2 (20) + L2->L3 (45) multiple times
      moves: 5,
      rank: 1
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          // Win: Player owns any hex >= Level 3
          return Object.values(state.grid).some(h => 
              h.ownerId === state.player.id && h.maxLevel >= 3
          );
      }
    }
  }
];
