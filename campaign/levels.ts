
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

          // --- VOID PERIMETER ---
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
      credits: 500, 
      moves: 5,     
      rank: 1,
      materials: 5 // Increased from 4 to 5 to allow 2 mistakes/upgrades
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        // Win Condition: Own 4 hexes (Start + 3 captured)
        const ownedCount = Object.values(state.grid).filter(h => h.ownerId === state.player.id && h.maxLevel >= 1).length;
        return ownedCount >= 4;
      },
      checkLossCondition: (state) => {
        const ownedCount = Object.values(state.grid).filter(h => h.ownerId === state.player.id && h.maxLevel >= 1).length;
        // Loss if: Out of materials AND goal not met OR Stranded
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
    
    // Logic handled by mapGenerator.ts
    mapConfig: {
      size: 8, 
      type: 'fixed', 
      generateWalls: false
    },

    startState: {
      credits: 0, 
      moves: 20,  
      rank: 5, // Start Rank 5
      materials: 0
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        return !!(playerHex && playerHex.structureType === 'CAPITAL');
      },
      checkLossCondition: (state) => {
        // Loss if Rank drops to 1 (Player cannot sustain another hit)
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
      generateWalls: false,
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
          
          // Voids ring (Radius 2)
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
      credits: 300,  
      moves: 10,     
      rank: 2,
      materials: 3 // EXACTLY 3 materials needed: 2 for supports (L0->L1), 1 for center (L1->L2).
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          return center && center.maxLevel >= 2;
      },
      checkLossCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          // If we ran out of materials and center isn't L2, impossible to win.
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
      generateWalls: false,
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

          // Voids to lock arena
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
      credits: 1000, // Plenty of cash, focusing on Material constraint
      moves: 20,
      rank: 3,
      materials: 0 // Enforce digging
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          return center && center.maxLevel >= 3;
      },
      checkLossCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          // If stuck and goal not met
          if (isStranded(state) && center.maxLevel < 3) return true;
          return false;
      },
      onBeforeAction: (state, action) => {
          // Force player to learn Digging if they try to upgrade without material
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
    description: 'Protocol: Emergency Recovery.\n\nObjective: Collect 150 Credits in 60s.\n\nRule: Standard Recovery is single-use. You must MOVE to reset the tool.\n\nMethod: Use RECOVERY (Blue Button) on high sectors. Height yields more Credits.\n\nWARNING: High (Lvl 4+) sectors overheat (Cooldown 15s). Rotate between peaks.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // High Value targets nearby
          { q: 2, r: 0, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: -2, r: 0, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 0, r: 2, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 0, r: -2, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          
          // Connectors
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          
          // Fillers
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },

    startState: {
      credits: 0,
      moves: 6, // Increased to 6 to allow direct travel to L5 (Cost 1+5) OR Recovery strategy
      rank: 5,
      materials: 0
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          return state.player.coins >= 150;
      },
      checkLossCondition: (state) => {
          const limit = 60 * 1000; 
          const elapsed = Date.now() - state.sessionStartTime;
          if (elapsed > limit) return true;
          if (isStranded(state)) return true;
          return false;
      }
    }
  },
  {
    id: '1.6',
    title: 'Sim 1.6: The Architect',
    description: 'Protocol: Combat.\n\nObjective: Reach Level 4 before the Rival.\n\nBot "Architect V18" active. It can Gather materials and Build supports. Compete for limited space.',
    
    mapConfig: {
      size: 4, 
      type: 'fixed',
      generateWalls: true, 
      wallStartRadius: 3, // Very tight arena
      wallType: 'pit_ring', // Level -8 boundary
      customLayout: [
          // Player Side
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Bot Side
          { q: 0, r: -2, maxLevel: 1, currentLevel: 1, revealed: true },

          // Central Conflict Zone
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

    aiMode: 'basic', // Enables the bot

    hooks: {
      checkWinCondition: (state) => {
          return Object.values(state.grid).some(h => h.ownerId === state.player.id && h.maxLevel >= 4);
      },
      checkLossCondition: (state) => {
           // Loss if Bot reaches L4 first
           if (state.bots.some(b => b.playerLevel >= 4)) return true;
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
          
          // Player Start (Edge) - NOT on Monument
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Terrain (Flat L0) for pathing
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          
          // Surrounding filler
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
          // Goal: Physically stand on the monument (Center)
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
          // Low Monolith (Level 2 - Easy climb)
          { q: 0, r: 0, maxLevel: 2, currentLevel: 2, structureType: 'MONUMENT', revealed: true },
          
          // Player Start - Edge
          { q: -3, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // "Dig Site" - Pre-lowered terrain to hint where to dig
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
      moves: 30, // Lots of moves for digging
      rank: 2,
      materials: 2 // Low mats, forcing digging for items
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
    description: 'ALERT: Sector instability detected.\n\nObjective: Reach and Activate the Monolith before total collapse.\n\nMechanic: ENTROPY gauge is low. Digging and Building accelerates decay.\n\nOutcome: When Entropy hits 0, terrain shifts and voids open. Hurry.',
    
    mapConfig: {
      size: 6,
      type: 'fixed',
      generateWalls: true,
      wallStartRadius: 4,
      wallType: 'pit_ring',
      customLayout: [
          // High Monolith (Level 5)
          { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
          
          // Player Start - Edge
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // A narrow path of L0 that is vulnerable to Entropy Shift
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          
          // Side paths
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          
          // Surrounding hills (sources of mat)
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
           // Loss if player falls into Void generated by Entropy
           const pKey = getHexKey(state.player.q, state.player.r);
           const hex = state.grid[pKey];
           if (hex && hex.structureType === 'VOID') return true;
           if (isStranded(state)) return true;
           return false;
       }
    }
  },
  {
    id: '2.4',
    title: 'Sim 2.4: The Rivalry',
    description: 'Threat Assessment: Hostile Unit Detected.\n\nObjective: Secure Keys and activate the Spire before the Rival.\n\nIntel: Resources are scarce. If the Rival finds items first, you may need to dig aggressively to beat them to the summit.',
    
    mapConfig: {
      size: 6,
      type: 'fixed',
      generateWalls: true,
      wallStartRadius: 4,
      wallType: 'pit_ring',
      customLayout: [
          // Center Spire
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          
          // Player - Edge
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Bot - Opposite Edge
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
            return false; 
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
