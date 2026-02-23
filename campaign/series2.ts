import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

export const series2Levels: LevelConfig[] = [
  {
    id: '2.1',
    title: 'Sim 2.1: The Monolith',
    description: 'Target acquired: Unknown Spire.\n\nObjective: Stand on the Monolith (Center, Level 3).\n\nTerrain: The surrounding land is heavily fractured into peaks and trenches.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // The Golden Path (+/- 1)
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
      checkWinCondition: (state) => !!(state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT'),
      checkLossCondition: (state) => isStranded(state)
    }
  },
  {
    id: '2.2',
    title: 'Sim 2.2: Buried Secrets',
    description: 'Scan complete: Activation Key detected underground.\n\nObjective: Find items and activate the Monolith.\n\nHint: Dig deep (Level -1 or lower) near the center to find artifacts.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: -3, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          { q: 2, r: 0, maxLevel: -1, currentLevel: -1, revealed: true, artifact: { type: 'matter_prism' } }, 
          { q: 2, r: -1, maxLevel: -1, currentLevel: -1, revealed: true, artifact: { type: 'matter_prism' } },
          { q: 2, r: 1, maxLevel: -1, currentLevel: -1, revealed: true, artifact: { type: 'matter_prism' } },
          
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
      checkWinCondition: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        const onMonument = playerHex && playerHex.structureType === 'MONUMENT';
        const hasItems = state.player.inventory.length >= 1;
        return !!(onMonument && hasItems);
      },
      checkLossCondition: (state) => isStranded(state) 
    }
  },
  {
    id: '2.3',
    title: 'Sim 2.3: Entropy Rising',
    description: 'ALERT: Sector instability detected.\n\nObjective: Activate the Monolith (Level 4).\n\nMechanic: ENTROPY gauge starts at 12 (Very Low). Digging and Building accelerates decay.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },

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
       checkWinCondition: (state) => !!(state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT'),
       checkLossCondition: (state) => state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'VOID' || isStranded(state)
    }
  },
  {
    id: '2.4',
    title: 'Sim 2.4: The Rivalry',
    description: 'Threat Assessment: Hostile Unit Detected.\n\nObjective: Activate the Monolith (Level 4) with 4 items.\n\nIntel: Entropy starts at 30. Compete against the Rival in chaotic terrain. Both units have a hidden stable path (+/- 1).',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: -1, currentLevel: -1, ownerId: 'player-1', revealed: true },
          { q: 0, r: -3, maxLevel: 3, currentLevel: 3, revealed: true }, 
          
          // Player's Path
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },

          // Bot's Path
          { q: -1, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -1, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },

          // Resources hidden in Chaos
          { q: 2, r: -1, maxLevel: -2, currentLevel: -2, revealed: true, artifact: { type: 'matter_prism' } },
          { q: -2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true, artifact: { type: 'matter_prism' } },
          { q: 2, r: 1, maxLevel: -1, currentLevel: -1, revealed: true, artifact: { type: 'matter_prism' } },

          // Chaos [-3, 4]
          { q: -1, r: 3, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 1, r: 1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 0, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 0, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 0, r: -2, maxLevel: -3, currentLevel: -3, revealed: true, artifact: { type: 'matter_prism' } },
          { q: 1, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
      ]
    },
    aiMode: 'basic',
    startState: { credits: 300, moves: 20, rank: 3, materials: 5 },
    hooks: {
        checkWinCondition: (state) => {
            const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
            const onMonument = playerHex && playerHex.structureType === 'MONUMENT';
            // Check for 4 items (any items, based on description "with 4 items")
            // Assuming state.player.inventory is an array of items
            const hasItems = state.player.inventory && state.player.inventory.length >= 4;
            return !!(onMonument && hasItems);
        },
        checkLossCondition: (state) => state.bots.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT') || isStranded(state)
    }
  },
  {
    id: '2.5',
    title: 'Sim 2.5: The Singularity',
    description: 'FINAL TEST: Two Hostiles Detected.\n\nObjective: Stabilize the Core (Lvl 5) with 3 RARE items.\n\nCondition: Map is a massive crater. Digging accelerates Entropy. Follow the spiral path.',
    mapConfig: {
      size: 7, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 4, maxLevel: -2, currentLevel: -2, ownerId: 'player-1', revealed: true },
          { q: 4, r: -4, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -4, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          
          // Spiral Path for Player
          { q: -1, r: 3, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -2, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },

          // Path for Bot 1
          { q: 3, r: -3, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 2, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: -1, maxLevel: 5, currentLevel: 5, revealed: true },

          // Path for Bot 2
          { q: -3, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -2, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },

          // Deep Resource Nodes
          { q: 2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true, artifact: { type: 'cortex_overclocker' } },
          { q: -2, r: -1, maxLevel: -3, currentLevel: -3, revealed: true, artifact: { type: 'cortex_overclocker' } },
          { q: 1, r: -3, maxLevel: -3, currentLevel: -3, revealed: true, artifact: { type: 'cortex_overclocker' } },

          // Chaos [-3, 4]
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
            const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
            const onMonument = playerHex && playerHex.structureType === 'MONUMENT';
            // Check for 3 items
            const hasItems = state.player.inventory && state.player.inventory.length >= 3;
            return !!(onMonument && hasItems);
        }, 
        checkLossCondition: (state) => state.bots.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT') || isStranded(state)
    }
  }
];