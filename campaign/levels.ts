import { LevelConfig } from './types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { GAME_CONFIG } from '../rules/config';

// Helper to check if player is stranded (No moves, No money, No recovery option)
const isStranded = (state: any) => {
    return state.player.moves <= 0 && state.player.coins < GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE && !state.player.recoveredCurrentHex;
};

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  // --- SERIES 1: PROTOCOLS ---
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
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 500, moves: 5, rank: 1, materials: 5 },
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
    mapConfig: { size: 8, type: 'fixed', generateWalls: false },
    startState: { credits: 0, moves: 20, rank: 5, materials: 0 },
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
    description: 'Protocol: Vertical Construction.\n\nObjective: Upgrade Center to Lvl 2.\n\nRule: Cannot build higher without foundation. A hex needs at least 2 neighbors of the SAME level to upgrade.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 2, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true, durability: 6 },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 300, moves: 10, rank: 2, materials: 3 },
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
                      return { ok: false, reason: "UNSTABLE! Upgrade 2 neighbors to Lvl 1 first." };
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
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 2, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
      ]
    },
    startState: { credits: 1000, moves: 20, rank: 3, materials: 0 },
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
    description: 'Protocol: Emergency Recovery.\n\nObjective: Collect 150 Credits in 75s.\n\nRule: Standard Recovery is single-use. You must MOVE to reset the tool.\n\nMethod: Use RECOVERY (Blue Button) on high sectors. Height yields more Credits.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
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
    startState: { credits: 0, moves: 6, rank: 5, materials: 0 },
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
      size: 4, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 0, r: -2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 0, maxLevel: 2, currentLevel: 2, revealed: true }, 
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    startState: { credits: 200, moves: 10, rank: 1, materials: 5 },
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
    description: 'Target acquired: Unknown Spire.\n\nObjective: Stand on the Monolith (Center, Level 3).\n\nTerrain: The surrounding land is heavily fractured into peaks and trenches.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Golden Path (+/- 1)
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          
          // Bounded Chaos [-3, 4]
          { q: 1, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 2, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -1, r: 3, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 1, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 2, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 0, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
      ]
    },
    startState: { credits: 500, moves: 15, rank: 2, materials: 6 },
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
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: -3, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          { q: 2, r: 0, maxLevel: -1, currentLevel: -1, revealed: true }, 
          { q: 2, r: -1, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: 2, r: 1, maxLevel: -1, currentLevel: -1, revealed: true },
          
          // Golden Path (+/- 1)
          { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },

          // Bounded Chaos [-3, 4]
          { q: 0, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: -2, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
      ]
    },
    startState: { credits: 300, moves: 30, rank: 2, materials: 2 },
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
    description: 'ALERT: Sector instability detected.\n\nObjective: Activate the Monolith (Level 4).\n\nMechanic: ENTROPY gauge starts at 12 (Very Low). Digging and Building accelerates decay.\n\nTask: Find the specific key required before total collapse.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Golden Path (+/- 1)
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },

          // Bounded Chaos [-3, 5]
          { q: -1, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: 1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: -1, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 2, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 2, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -2, r: 1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -2, r: 2, maxLevel: 4, currentLevel: 4, revealed: true },
      ]
    },
    startState: { credits: 1000, moves: 15, rank: 3, materials: 10, initialEntropy: 12 },
    aiMode: 'none',
    hooks: {
       checkLossCondition: (state) => {
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
    description: 'Threat Assessment: Hostile Unit Detected.\n\nObjective: Activate the Monolith (Level 4) with 4 items.\n\nIntel: Entropy starts at 30. Compete against the Rival in chaotic terrain. Both units have a hidden stable path (+/- 1).',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          // Monolith, Player & Bot
          { q: 0, r: 0, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: -1, currentLevel: -1, ownerId: 'player-1', revealed: true },
          { q: 0, r: -3, maxLevel: 3, currentLevel: 3, revealed: true }, 
          
          // Player's Path (+/- 1): (0,3)[-1] -> (0,2)[0] -> (0,1)[1] -> (1,0)[2] -> (1,-1)[3] -> (0,0)[4]
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },

          // Bot's Path (+/- 1): (0,-3)[3] -> (-1,-2)[3] -> (-1,-1)[3] -> (0,0)[4]
          { q: -1, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -1, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },

          // Resources hidden in Chaos
          { q: 2, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 2, r: 1, maxLevel: -1, currentLevel: -1, revealed: true },

          // Extreme but Bounded Chaos [-3, 4]
          { q: -1, r: 3, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 1, r: 1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 0, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 0, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 0, r: -2, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
      ]
    },
    aiMode: 'basic',
    startState: { credits: 300, moves: 20, rank: 3, materials: 5 },
    hooks: {
        checkWinCondition: (state) => {
            return false;
        },
        checkLossCondition: (state) => {
            const botWin = state.bots.some(b => {
                const hex = state.grid[getHexKey(b.q, b.r)];
                return hex && hex.structureType === 'MONUMENT';
            });
            return botWin || isStranded(state);
        }
    }
  },
  {
    id: '2.5',
    title: 'Sim 2.5: The Singularity',
    description: 'FINAL TEST: Two Hostiles Detected.\n\nObjective: Stabilize the Core (Lvl 5) with 3 RARE items.\n\nCondition: Map is a massive crater. Digging accelerates Entropy. Follow the spiral path.',
    mapConfig: {
      size: 7, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          // Monolith, Player & Bots
          { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 4, maxLevel: -2, currentLevel: -2, ownerId: 'player-1', revealed: true },
          { q: 4, r: -4, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -4, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          
          // Spiral Path for Player (+/- 1): (0,4)[-2] -> (-1,3)[-1] -> (-1,2)[0] -> (-1,1)[1] -> (-2,1)[2] -> (-1,0)[3] -> (0,-1)[4] -> (0,0)[5]
          { q: -1, r: 3, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -2, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },

          // Path for Bot 1 (+/- 1): (4,-4)[2] -> (3,-3)[3] -> (2,-2)[4] -> (1,-1)[5] -> (0,0)[5]
          { q: 3, r: -3, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 2, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: -1, maxLevel: 5, currentLevel: 5, revealed: true },

          // Path for Bot 2 (+/- 1): (-4,0)[2] -> (-3,0)[3] -> (-2,0)[4] -> (-1,0)[3] (intercepts player path)
          { q: -3, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -2, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },

          // Deep Resource Nodes
          { q: 2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: -3, maxLevel: -3, currentLevel: -3, revealed: true },

          // Bounded Chaos [-3, 4]
          { q: 1, r: 3, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 0, r: 3, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 0, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 1, r: 1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 2, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 1, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 0, r: -2, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -3, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -3, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
      ]
    },
    aiMode: 'basic', 
    startState: { credits: 500, moves: 30, rank: 4, materials: 8 },
    hooks: {
        checkWinCondition: (state) => {
            return false;
        },
        checkLossCondition: (state) => {
            const botWin = state.bots.some(b => {
                const hex = state.grid[getHexKey(b.q, b.r)];
                return hex && hex.structureType === 'MONUMENT';
            });
            return botWin || isStranded(state);
        }
    }
  },

  // --- SERIES 3: LOGIC PUZZLES ---
  {
    id: '3.1',
    title: 'Sim 3.1: The Bridge',
    description: 'PUZZLE: Path Construction.\n\nObjective: Reach the CAPITAL on the far side.\n\nProblem: A void chasm separates you from the goal. There is NO path.\n\nSolution: Use your inventory (RARE items) to STABILIZE the void hexes.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        { q: -3, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
        { q: 3, r: 0, maxLevel: 1, currentLevel: 1, structureType: 'CAPITAL', revealed: true },

        { q: -2, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -1, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 0, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 2, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },

        { q: -3, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -2, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 0, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 2, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 3, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },

        { q: -3, r: -1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -2, r: -1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -1, r: -1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 0, r: -1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: -1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 2, r: -1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 3, r: -1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        
        { q: -2, r: 2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -1, r: 2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 0, r: 2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: 2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        
        { q: -2, r: -2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -1, r: -2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 0, r: -2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: -2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
      ]
    },
    startState: {
      credits: 200, moves: 10, rank: 1, materials: 0,
      startInventory: ['architect_nanites', 'cortex_overclocker', 'matter_prism', 'architect_nanites', 'cortex_overclocker'] 
    },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        return !!(playerHex && playerHex.structureType === 'CAPITAL');
      },
      checkLossCondition: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        if (playerHex && playerHex.structureType === 'CAPITAL') return false;
        if (isStranded(state)) return true;
        if (state.player.inventory.length === 0 && state.player.q < 0) return true;
        return false;
      }
    }
  },
  {
    id: '3.2',
    title: 'Sim 3.2: The Harvest',
    description: 'PUZZLE: Resource Accumulation.\n\nObjective: Accumulate 500 Credits in 3 minutes.\n\nMap: Chaotic terrain (-3 to +5). No flat ground.\n\nMethod: Use Recovery on high ground for credits, or dig low ground for loot. Balance movement costs.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        { q: 0, r: 0, maxLevel: 3, currentLevel: 3, ownerId: 'player-1', revealed: true },
        { q: 1, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 1, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 0, maxLevel: 5, currentLevel: 5, revealed: true },
        { q: 0, r: -1, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: 2, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 2, r: -2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 0, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: -2, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -2, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 5, currentLevel: 5, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 20, rank: 5, materials: 0 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        return state.player.coins >= 500;
      },
      checkLossCondition: (state) => {
        const elapsed = Date.now() - state.sessionStartTime;
        if (elapsed > 180_000) return true;
        if (isStranded(state)) return true;
        return false;
      }
    }
  },
  {
    id: '3.3',
    title: 'Sim 3.3: The Cascade',
    description: 'PUZZLE: Chain Reaction Planning.\n\nObjective: Build a Level 5 hex at the summit (0,0).\n\nRule: Each upgrade requires 2 neighbors at the SAME level (structural support). You must plan your upgrades in the correct CASCADE order.\n\nResources: Exactly 14 Materials — no waste allowed. Build from the base upwards.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
        { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 0, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 1, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 2, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 2000, moves: 50, rank: 5, materials: 14 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const summit = state.grid[getHexKey(0, 0)];
        return !!(summit && summit.maxLevel >= 5);
      },
      checkLossCondition: (state) => {
        const summit = state.grid[getHexKey(0, 0)];
        if (summit && summit.maxLevel >= 5) return false;
        if (state.player.storage <= 0 && (!summit || summit.maxLevel < 5)) return true;
        if (isStranded(state)) return true;
        return false;
      },
      onBeforeAction: (state, action) => {
        if (action.type === 'UPGRADE' && action.intent !== 'RECOVER') {
          const hex = state.grid[getHexKey(action.coord.q, action.coord.r)];
          if (hex && hex.maxLevel >= 1) {
            const neighbors = getNeighbors(hex.q, hex.r);
            const validSupports = neighbors.filter(n => {
              const h = state.grid[getHexKey(n.q, n.r)];
              return h && h.maxLevel >= hex.maxLevel && h.structureType !== 'VOID';
            });
            if (validSupports.length < 2) {
              return {
                ok: false,
                reason: `UNSTABLE! Need 2 neighbors at L${hex.maxLevel}+ to upgrade to L${hex.maxLevel + 1}.`
              };
            }
          }
        }
        return { ok: true };
      }
    }
  },
  {
    id: '3.4',
    title: 'Sim 3.4: The Gauntlet',
    description: 'PUZZLE: Entropy Survival.\n\nObjective: Survive 5 Entropy Waves.\n\nThreat: Every 5 actions you take, an Entropy Spike hits the sector.\n\nFail Condition: If your Rank drops to 1 OR your Credits fall below 200 by the 5th wave, you fail.\n\nStrategy: Prioritize stability over expansion. Use Recovery Stations.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        { q: 0, r: 0, maxLevel: 3, currentLevel: 3, ownerId: 'player-1', structureType: 'CAPITAL', revealed: true },
        { q: 2, r: -1, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true },
        { q: -2, r: 1, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true },
        { q: 0, r: -2, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true },
        { q: 0, r: 2, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true },
        { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    startState: { credits: 500, moves: 25, rank: 4, materials: 5, initialEntropy: 25 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        return state.currentTurn > 30 && state.player.playerLevel > 1 && state.player.coins >= 200;
      },
      checkLossCondition: (state) => {
        if (state.player.playerLevel <= 1) return true;
        if (state.player.coins <= 0) return true; 
        if (isStranded(state)) return true;
        return false;
      },
      onAfterAction: (state) => {
          if (state.currentTurn > 0 && state.currentTurn % 5 === 0) {
              state.entropy.current = 0; 
          }
      }
    }
  },
  {
    id: '3.5',
    title: 'Sim 3.5: The Heist',
    description: 'PUZZLE: Terrain Navigation vs Active Hunter.\n\nObjective: Collect 3 items and activate Monument.\n\nThreat: A "DESTROYER" Bot is actively hunting your structures. It has NO patrol route—it will seek out your highest towers and collapse them.\n\nTerrain: Utter chaos. Jagged peaks (Lvl 4) and deep craters (Lvl -3) block the way. Find the hidden path (+/- 1).',
    mapConfig: {
      size: 7, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
        // Monument & Starts
        { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
        { q: 0, r: 3, maxLevel: -1, currentLevel: -1, ownerId: 'player-1', revealed: true }, 
        { q: 0, r: -3, maxLevel: 3, currentLevel: 3, revealed: true }, 

        // Player's Path (+/- 1 diff): (0,3)[-1] -> (1,2)[0] -> (1,1)[1] -> (1,0)[2] -> (0,0)[3]
        { q: 1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },

        // Bot's Path (+/- 1 diff): (0,-3)[3] -> (-1,-2)[3] -> (-1,-1)[3] -> (0,0)[3]
        { q: -1, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: -1, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },

        // Bounded Chaos [-3, 4]
        { q: 0, r: 2, maxLevel: -3, currentLevel: -3, revealed: true }, 
        { q: -1, r: 3, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: -1, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 2, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: -1, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 2, r: 0, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -2, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -2, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: -2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: -2, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 2, r: -2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 3, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 3, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
        
        // Dig sites hidden in pits
        { q: 2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -2, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -2, r: -2, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 400, moves: 25, rank: 3, materials: 5, initialEntropy: 15 },
    botRoutes: [
        // Basic Patrol loop for UI representation, Bot logic overrides to Hunt
        [
            {q: -1, r: -2}, {q: -1, r: -1}, {q: 0, r: 0}, {q: 1, r: 0}, 
            {q: 1, r: 1}, {q: 0, r: 1}, {q: -1, r: 0}, {q: -2, r: 0}
        ]
    ],
    aiMode: 'basic', 
    hooks: {
      checkWinCondition: (state) => {
        return false; 
      },
      checkLossCondition: (state) => {
        if (isStranded(state)) return true;
        return false;
      }
    }
  },
  {
    id: '3.6',
    title: 'Sim 3.6: The Maze of Echoes',
    description: 'FINAL PUZZLE: Survive the Fracture.\n\nObjective: \n  1. Own 5+ hexes at Level 2+\n  2. 300+ Credits\n  3. Activate Monument\n\nThreats: Two DESTROYER bots actively hunt your structures. SCANNER: Follow the single hidden continuous ridge (+/- 1) to the Monument.',
    mapConfig: {
      size: 8, type: 'fixed', generateWalls: true, wallStartRadius: 6, wallType: 'pit_ring',
      customLayout: [
        // Monument & Player
        { q: -4, r: 4, maxLevel: -2, currentLevel: -2, ownerId: 'player-1', revealed: true }, 
        { q: 4, r: -4, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true }, 
        
        // Bots
        { q: -3, r: 0, maxLevel: 0, currentLevel: 0, revealed: true }, 
        { q: 3, r: -1, maxLevel: 3, currentLevel: 3, revealed: true }, 

        // THE PASSABLE SNAKE PATH for Player (+/- 1 diff): 
        // (-4,4)[-2] -> (-3,3)[-1] -> (-2,2)[0] -> (-1,1)[1] -> (0,1)[2] -> (1,0)[3] -> (2,-1)[4] -> (3,-2)[4] -> (4,-3)[5] -> (4,-4)[5]
        { q: -3, r: 3, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: -2, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 2, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 3, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 4, r: -3, maxLevel: 5, currentLevel: 5, revealed: true },

        // Bot 1 Path to Player's Snake: (-3,0)[0] -> (-2,0)[0] -> (-2,1)[0] -> (-2,2)[0]
        { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },

        // Bot 2 Path to Monument: (3,-1)[3] -> (2,-1)[4]
        // Bot 2 is already connected to the snake path at (2,-1)

        // Bounded Chaos [-3, 5] to fill the rest of the map
        { q: -4, r: 3, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -3, r: 4, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: -2, r: 3, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -3, r: 2, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: -1, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 0, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, revealed: true }, 
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 2, r: 0, maxLevel: 5, currentLevel: 5, revealed: true },
        { q: 3, r: -3, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 2, r: -2, maxLevel: 5, currentLevel: 5, revealed: true },
        { q: 4, r: -2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 3, r: -4, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: -1, maxLevel: 5, currentLevel: 5, revealed: true },
        { q: 0, r: -2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -1, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: -1, r: -2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
      ]
    },
    startState: { credits: 500, moves: 40, rank: 4, materials: 15, initialEntropy: 35 },
    botRoutes: [
        // Base Patrol loops for UI representation
        [{q: -3, r: 1}, {q: -3, r: 2}, {q: -2, r: 2}, {q: -1, r: 1}, {q: -1, r: 0}, {q: -2, r: 0}],
        [{q: 3, r: -1}, {q: 2, r: -1}, {q: 1, r: -1}, {q: 1, r: -2}, {q: 2, r: -3}, {q: 3, r: -3}]
    ],
    aiMode: 'basic', 
    hooks: {
      checkWinCondition: (state) => {
        const ownedL2Plus = Object.values(state.grid).filter(
          h => h.ownerId === state.player.id && h.maxLevel >= 2
        ).length;
        const hasEnoughCredits = state.player.coins >= 300;
        const hasEnoughHexes = ownedL2Plus >= 5;
        const playerOnMonument = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        return hasEnoughCredits && hasEnoughHexes && playerOnMonument;
      },
      checkLossCondition: (state) => {
        if (isStranded(state)) return true;
        return false;
      },
      onAfterAction: (state) => {
          if (state.currentTurn > 0 && state.currentTurn % 10 === 0) {
              const candidates = Object.values(state.grid).filter(h => 
                  h.structureType !== 'MONUMENT' && 
                  h.structureType !== 'VOID' &&
                  h.ownerId !== state.player.id &&
                  h.maxLevel > -3
              );
              if (candidates.length > 0) {
                  const target = candidates[Math.floor(Math.random() * candidates.length)];
                  const key = getHexKey(target.q, target.r);
                  state.grid[key] = { ...target, structureType: 'VOID', maxLevel: 0, currentLevel: 0 };
              }
          }
      }
    }
  }
];