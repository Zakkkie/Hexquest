
import { LevelConfig } from './types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { GAME_CONFIG } from '../rules/config';

// Helper to check if player is stranded (No moves, No money, No recovery option)
const isStranded = (state: any) => {
    return state.player.moves <= 0 && state.player.coins < GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE && !state.player.recoveredCurrentHex;
};

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  {
    id: '1.1',
    title: 'Sim 1.1: Expansion Protocol',
    description: 'Mission: Capture 3 NEW sectors.\n\nThe unit requires a foothold. Capture 3 adjacent Neutral Sectors (Lvl 0) to establish a perimeter.\n\nMethod: Move to a neutral hex and use UPGRADE (Amber Button) to build Level 1 (Cost: 1 Mat).\n\nWARNING: Materials are limited. Use them to expand.',
    
    mapConfig: {
      size: 5, 
      type: 'fixed',
      generateWalls: true, 
      wallStartRadius: 2, 
      wallType: 'pit_ring', 
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
      ]
    },

    startState: {
      credits: 500, 
      moves: 5,     
      rank: 1,
      materials: 5 
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        const ownedCount = Object.values(state.grid).filter(h => h.ownerId === state.player.id && h.maxLevel >= 1).length;
        return ownedCount >= 4;
      },
      checkLossCondition: (state) => {
        const ownedCount = Object.values(state.grid).filter(h => h.ownerId === state.player.id && h.maxLevel >= 1).length;
        if (state.player.storage <= 0 && ownedCount < 4) return true;
        if (isStranded(state)) return true;
        return false;
      }
    }
  },
  {
    id: '1.2',
    title: 'Sim 1.2: Solid Ground',
    description: 'Objective: Reach the Capital.\n\nSCANNER: A safe path (Durability 3) detected. Follow it through the void.\n\nDANGER: Environment UNSTABLE (Durability 1). Stepping off the path causes immediate collapse and Rank loss.\n\nFAILURE: Rank drops to 1.',
    
    mapConfig: {
      size: 8, 
      type: 'fixed', 
      generateWalls: false
    },

    startState: {
      credits: 0, 
      moves: 20,  
      rank: 5, 
      materials: 0
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        return !!(playerHex && playerHex.structureType === 'CAPITAL');
      },
      checkLossCondition: (state) => {
        if (state.player.playerLevel <= 1) return true;
        if (isStranded(state)) return true;
        return false;
      }
    }
  },
  {
    id: '1.3',
    title: 'Sim 1.3: Structural Supports',
    description: 'Protocol: Vertical Construction.\n\nObjective: Upgrade Center to Lvl 2.\n\nRule: Cannot build higher without foundation. A hex needs at least 2 neighbors of the SAME level to upgrade.\n\nTask: Build 2 Lvl 1 neighbors using provided materials, then upgrade center.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: true,
      wallStartRadius: 2, 
      wallType: 'pit_ring',
      customLayout: [
          // Center (Goal) - Starts L1
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true, durability: 6 },
          // Neighbors (L0) - Need to be built
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },

    startState: {
      credits: 300,  
      moves: 10,     
      rank: 2,
      materials: 3 
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          return center && center.maxLevel >= 2;
      },
      checkLossCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          if (state.player.storage <= 0 && center.maxLevel < 2) return true;
          if (isStranded(state)) return true;
          return false;
      },
      onBeforeAction: (state, action) => {
          if (action.type === 'UPGRADE') {
              const hex = state.grid[getHexKey(action.coord.q, action.coord.r)];
              if (hex && hex.maxLevel === 1 && action.intent !== 'RECOVER') {
                  const neighbors = getNeighbors(hex.q, hex.r);
                  const validSupports = neighbors.filter(n => {
                      const h = state.grid[getHexKey(n.q, n.r)];
                      return h && h.maxLevel >= 1 && h.structureType !== 'VOID';
                  });

                  if (validSupports.length < 2) {
                      return {
                          ok: false,
                          reason: "UNSTABLE! Upgrade 2 neighbors to Lvl 1 first."
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
    title: 'Sim 1.4: Excavation',
    description: 'Protocol: Resource Cycle.\n\nObjective: Upgrade Center to Lvl 3.\n\nProblem: You have 0 Materials. Construction is impossible.\n\nSolution: DIG (Red Button). Excavate surrounding mounds (Lvl 2) to harvest +1 Mat. Use them to upgrade center.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: true,
      wallStartRadius: 2,
      wallType: 'pit_ring',
      customLayout: [
          // Center (Goal) - Starts L1
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          // Surrounding Mounds (L2) - Sources of Material
          { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
      ]
    },

    startState: {
      credits: 1000, 
      moves: 20,
      rank: 3,
      materials: 0 
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          return center && center.maxLevel >= 3;
      },
      checkLossCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          if (isStranded(state) && center.maxLevel < 3) return true;
          return false;
      },
      onBeforeAction: (state, action) => {
          if (action.type === 'UPGRADE' && state.player.storage === 0 && action.intent !== 'RECOVER') {
             return { ok: false, reason: "NO MATERIALS! Dig the mounds (Lvl 2)." };
          }
          return { ok: true };
      }
    }
  },
  {
    id: '1.5',
    title: 'Sim 1.5: Oxygen March',
    description: 'Protocol: Emergency Recovery.\n\nObjective: Collect 150 Credits in 75s.\n\nRule: Standard Recovery is single-use. You must MOVE to reset the tool.\n\nMethod: Use RECOVERY (Blue Button) on high sectors. Height yields more Credits.\n\nWARNING: High (Lvl 4+) sectors overheat (Cooldown 15s). Rotate between peaks.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: true,
      wallStartRadius: 3, 
      wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 2, r: 0, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: -2, r: 0, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 0, r: 2, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 0, r: -2, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },

    startState: {
      credits: 0,
      moves: 6, 
      rank: 5,
      materials: 0
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          return state.player.coins >= 150;
      },
      checkLossCondition: (state) => {
          const limit = 75 * 1000; 
          const elapsed = Date.now() - state.sessionStartTime;
          if (elapsed > limit) return true;
          if (isStranded(state)) return true;
          return false;
      }
    }
  },
  {
    id: '1.6',
    title: 'Sim 1.6: Vertical Limit',
    description: 'Protocol: Altitude Test.\n\nObjective: Reach Level 4.\n\nConstraint: Space is extremely limited (Radius 3). You must manage your footprint and resources carefully to build the summit.',
    
    mapConfig: {
      size: 4, 
      type: 'fixed',
      generateWalls: true, 
      wallStartRadius: 3, 
      wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 0, r: -2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 0, maxLevel: 2, currentLevel: 2, revealed: true }, 
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },

    startState: {
      credits: 200, 
      moves: 10,
      rank: 1,
      materials: 5
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          return state.player.playerLevel >= 4;
      },
      checkLossCondition: (state) => {
           if (isStranded(state)) return true;
           return false;
      }
    }
  },
  // --- SERIES 2: THE ASCENT ---
  {
    id: '2.1',
    title: 'Sim 2.1: The Monolith',
    description: 'Target acquired: Unknown Spire.\n\nObjective: Stand on the Monolith (Center, Level 3).\n\nConstraint: The Monolith is indestructible and too high to climb directly.\n\nTask: Build a staircase (L1 -> L2) to reach the summit.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: true,
      wallStartRadius: 4,
      wallType: 'pit_ring',
      customLayout: [
          // The Monolith (Goal) - Center - REDUCED HEIGHT TO 3
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },

    startState: {
      credits: 500, 
      moves: 15,     
      rank: 2,
      materials: 6
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
          return playerHex && playerHex.structureType === 'MONUMENT';
      },
      checkLossCondition: (state) => {
          if (isStranded(state)) return true;
          return false;
      }
    }
  },
  {
    id: '2.2',
    title: 'Sim 2.2: Buried Secrets',
    description: 'Scan complete: Activation Key detected underground.\n\nObjective: Find items and activate the Monolith.\n\nHint: Dig deep (Level -1 or lower) near the center to find artifacts. You can use ANY 3 items to activate the Monolith structure.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: true,
      wallStartRadius: 4,
      wallType: 'pit_ring',
      customLayout: [
          // Low Monolith (Level 3 for conformity)
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: -3, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          // "Dig Site"
          { q: 2, r: 0, maxLevel: -1, currentLevel: -1, revealed: true }, 
          { q: 2, r: -1, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: 2, r: 1, maxLevel: -1, currentLevel: -1, revealed: true },
          // Path
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },

    startState: {
      credits: 300, 
      moves: 30, 
      rank: 2,
      materials: 2 
    },

    aiMode: 'none',

    hooks: {
      checkLossCondition: (state) => {
          if (isStranded(state)) return true;
          return false;
      }
    }
  },
  {
    id: '2.3',
    title: 'Sim 2.3: Entropy Rising',
    description: 'ALERT: Sector instability detected.\n\nObjective: Activate the Monolith (Level 4).\n\nMechanic: ENTROPY gauge starts at 10. After the first shift, it drops to 5. A second shift causes critical failure.\n\nTask: Find the specific key required.',
    
    mapConfig: {
      size: 6,
      type: 'fixed',
      generateWalls: true,
      wallStartRadius: 4,
      wallType: 'pit_ring',
      customLayout: [
          // High Monolith (Level 4)
          { q: 0, r: 0, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
      ]
    },

    startState: {
      credits: 1000, 
      moves: 15,
      rank: 3,
      materials: 10,
    },

    aiMode: 'none',

    hooks: {
       checkLossCondition: (state) => {
           const pKey = getHexKey(state.player.q, state.player.r);
           const hex = state.grid[pKey];
           if (hex && hex.structureType === 'VOID') return true;
           if (isStranded(state)) return true;
           // Entropy Logic handled in EntropySystem but we can double check here
           return false;
       }
    }
  },
  {
    id: '2.4',
    title: 'Sim 2.4: The Rivalry',
    description: 'Threat Assessment: Hostile Unit Detected.\n\nObjective: Activate the Monolith (Level 4) with 4 items.\n\nIntel: Entropy starts at 30. Compete against the Rival.',
    
    mapConfig: {
      size: 6,
      type: 'fixed',
      generateWalls: true,
      wallStartRadius: 4,
      wallType: 'pit_ring',
      customLayout: [
          // Center Spire (Level 4)
          { q: 0, r: 0, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
          // Player
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          // Bot
          { q: 0, r: -3, maxLevel: 1, currentLevel: 1, revealed: true }, 
          // Resources
          { q: 2, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -2, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 2, r: 1, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: -2, r: -1, maxLevel: -1, currentLevel: -1, revealed: true },
      ]
    },

    aiMode: 'basic',

    startState: {
      credits: 300, 
      moves: 20,
      rank: 3,
      materials: 5,
    },
    
    hooks: {
        checkWinCondition: (state) => {
            return false; // Victory via Monument Activation
        },
        checkLossCondition: (state) => {
            const botWin = state.bots.some(b => {
                const hex = state.grid[getHexKey(b.q, b.r)];
                return hex && hex.structureType === 'MONUMENT';
            });
            if (botWin) return true;
            if (isStranded(state)) return true;
            return false;
        }
    }
  }
];
