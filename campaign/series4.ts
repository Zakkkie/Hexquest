import { LevelConfig } from '../types';
import { getHexKey, getNeighbors } from '../services/hexUtils';
import { isStranded } from './utils';

export const series4Levels: LevelConfig[] = [
  {
    id: '4.1',
    title: 'Sim 4.1: Resonance Protocol',
    description: `PUZZLE: Harmonic Construction.\n\nObjective: Create a "Resonance Ring" - upgrade 3 DIFFERENT hexes to the SAME level.\n\nRule: All 3 hexes must be adjacent to your starting position and reach Level 2 simultaneously.\n\nTip: Build symmetrically. Balanced structures are more stable.`,
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 2, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 400, moves: 12, rank: 2, materials: 6 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const center = state.grid[getHexKey(0, 0)];
        if (!center || center.maxLevel < 2) return false;
        
        const neighbors = getNeighbors(0, 0);
        const levelTwoNeighbors = neighbors.filter(n => {
          const hex = state.grid[getHexKey(n.q, n.r)];
          return hex && hex.maxLevel === 2;
        }).length;
        
        return levelTwoNeighbors >= 3;
      },
      checkLossCondition: (state) => {
        if (state.player.storage <= 0) {
          const center = state.grid[getHexKey(0, 0)];
          const neighbors = getNeighbors(0, 0);
          const levelTwoNeighbors = neighbors.filter(n => {
            const hex = state.grid[getHexKey(n.q, n.r)];
            return hex && hex.maxLevel === 2;
          }).length;
          if (center?.maxLevel < 2 || levelTwoNeighbors < 3) return true;
        }
        return isStranded(state);
      }
    }
  },
  {
    id: '4.2',
    title: 'Sim 4.2: Mirror Maze',
    description: `PUZZLE: Bilateral Navigation.\n\nObjective: Place 2 Recovery Beacons (use items) at symmetric positions relative to center.\n\nTerrain: Map is divided into LEFT and RIGHT halves. Chaos on both sides.\n\nStrategy: Find identical landing spots on each side. Use terrain memory.`,
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // LEFT SIDE (chaos)
          { q: -2, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 0, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -3, r: 1, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: -3, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
          
          // RIGHT SIDE (identical chaos)
          { q: 2, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 0, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 2, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 3, r: 1, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: 3, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: { 
      credits: 250, moves: 28, rank: 3, materials: 2,
      startInventory: ['recovery_beacon', 'recovery_beacon']
    },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const leftBeacon = state.grid[getHexKey(-2, 0)];
        const rightBeacon = state.grid[getHexKey(2, 0)];
        return leftBeacon?.ownerId === state.player.id && rightBeacon?.ownerId === state.player.id;
      },
      checkLossCondition: (state) => {
        if (state.player.inventory.filter(i => i === 'recovery_beacon').length > 0) {
          return isStranded(state);
        }
        const leftBeacon = state.grid[getHexKey(-2, 0)];
        const rightBeacon = state.grid[getHexKey(2, 0)];
        if (!(leftBeacon?.ownerId === state.player.id && rightBeacon?.ownerId === state.player.id)) {
          return isStranded(state);
        }
        return false;
      }
    }
  },
  {
    id: '4.3',
    title: 'Sim 4.3: Recursion Engine',
    description: `PUZZLE: Fractal Building.\n\nObjective: Build a "Fractal Tower" - each level requires the previous level's support structure.\n  - Level 1: 2 hexes at L1\n  - Level 2: 4 hexes at L2 (neighbors of L1 group)\n  - Level 3: 2 hexes at L3 (neighbors of L2 group)\n\nResources: Exactly 16 Materials. No waste.`,
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 3000, moves: 60, rank: 5, materials: 16 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        // Check for 2 L3 hexes
        const l3Hexes = Object.values(state.grid).filter(h => h.maxLevel === 3).length;
        return l3Hexes >= 2;
      },
      checkLossCondition: (state) => {
        const l3Hexes = Object.values(state.grid).filter(h => h.maxLevel === 3).length;
        if (state.player.storage <= 0 && l3Hexes < 2) return true;
        return isStranded(state);
      },
      onBeforeAction: (state, action) => {
        if (action.type === 'UPGRADE' && action.intent !== 'RECOVER') {
          const hex = state.grid[getHexKey(action.coord.q, action.coord.r)];
          if (!hex) return { ok: true };
          
          const targetLevel = hex.maxLevel + 1;
          const neighbors = getNeighbors(hex.q, hex.r);
          const supportingNeighbors = neighbors.filter(n => {
            const h = state.grid[getHexKey(n.q, n.r)];
            return h && h.maxLevel === targetLevel - 1;
          }).length;
          
          if (targetLevel <= 2 && supportingNeighbors < 1) {
            return { ok: false, reason: `Need 1+ neighbor at Level ${targetLevel - 1}` };
          }
          
          return { ok: true };
        }
        return { ok: true };
      }
    }
  },
  {
    id: '4.4',
    title: 'Sim 4.4: Thermal Equilibrium',
    description: `PUZZLE: Heat Dissipation.\n\nObjective: Maintain Entropy below 50 while upgrading Center to Level 4.\n\nMechanic: Each UPGRADE adds +8 Entropy. Each RECOVERY reduces by -5. Entropy ceiling is 100 (auto-loss).\n\nStrategy: Balance aggression with maintenance. Plan your moves like a cooling system.`,
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    startState: { credits: 800, moves: 25, rank: 3, materials: 8, initialEntropy: 20 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => state.grid[getHexKey(0, 0)]?.maxLevel >= 4,
      checkLossCondition: (state) => {
        if ((state.entropy?.current || 0) >= 100) return true;
        if (state.grid[getHexKey(0, 0)]?.maxLevel < 4 && state.player.storage <= 0) return true;
        return isStranded(state);
      }
    }
  },
  {
    id: '4.5',
    title: 'Sim 4.5: Convergence Point',
    description: `PUZZLE: Multi-Objective Race.\n\nObjective: Achieve ANY 2 of 3 goals BEFORE the Neutral Bot reaches its Monument:\n  A) 6 owned hexes at Level 2+\n  B) 600 Credits\n  C) Stand on the Central Monolith\n\nPressure: Bot moves every 3 of YOUR actions. First to complete their objective wins.`,
    mapConfig: {
      size: 7, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
          { q: -3, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 3, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          
          // Player's path
          { q: -2, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          
          // Bot's path
          { q: 2, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 2, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          
          // Resources in chaos
          { q: 0, r: 1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 0, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 1, r: -2, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: -2, r: -1, maxLevel: 5, currentLevel: 5, revealed: true },
      ]
    },
    startState: { credits: 200, moves: 30, rank: 3, materials: 5 },
    aiMode: 'basic',
    botRoutes: [
      [{q: 3, r: 0}, {q: 2, r: 0}, {q: 1, r: 0}, {q: 0, r: 0}]
    ],
    hooks: {
      checkWinCondition: (state) => {
        const ownedL2Plus = Object.values(state.grid).filter(
          h => h.ownerId === state.player.id && h.maxLevel >= 2
        ).length;
        const onMonument = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        const conditionsMet = [
          ownedL2Plus >= 6,
          state.player.coins >= 600,
          onMonument
        ].filter(c => c).length;
        return conditionsMet >= 2;
      },
      checkLossCondition: (state) => {
        // Bot reaches monument
        if (state.bots?.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) {
          return true;
        }
        return isStranded(state);
      }
    }
  },
  {
    id: '4.6',
    title: 'Sim 4.6: Cascade Protocol',
    description: `PUZZLE: Chain Reaction Builder.\n\nObjective: Trigger a "Cascade" - when you reach Level 3, automatically upgrade all adjacent Level 2 hexes to Level 3.\n\nChallenge: Set up a domino pattern. 5 cascades must occur to win.\n\nLimitation: Manual upgrades only trigger cascades when reaching L3. Plan carefully.`,
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 1500, moves: 50, rank: 4, materials: 18 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        // Track cascades in metadata (simplified: count L3 hexes)
        const l3Count = Object.values(state.grid).filter(h => h.maxLevel === 3).length;
        return l3Count >= 10; // Result of cascades
      },
      checkLossCondition: (state) => {
        const l3Count = Object.values(state.grid).filter(h => h.maxLevel === 3).length;
        if (state.player.storage <= 0 && l3Count < 10) return true;
        return isStranded(state);
      },
      onAfterAction: (state, action) => {
        // Simplified cascade: if hex reached L3, upgrade adjacent L2 hexes
        if (action.type === 'UPGRADE' && action.intent !== 'RECOVER') {
          const upgraded = state.grid[getHexKey(action.coord.q, action.coord.r)];
          if (upgraded && upgraded.maxLevel === 3) {
            const neighbors = getNeighbors(action.coord.q, action.coord.r);
            neighbors.forEach(n => {
              const neighbor = state.grid[getHexKey(n.q, n.r)];
              if (neighbor && neighbor.maxLevel === 2 && neighbor.ownerId === state.player.id) {
                neighbor.maxLevel = 3;
                neighbor.currentLevel = 3;
              }
            });
          }
        }
      }
    }
  },
  {
    id: '4.7',
    title: 'Sim 4.7: Duality Engine',
    description: `PUZZLE: Two Brains, One Body.\n\nObjective: Own BOTH a "Logic Nexus" (6+ hexes at L3) AND an "Energy Core" (4+ hexes at L4).\n\nTwist: You must support BOTH structures simultaneously with materials flowing between them.\n\nDesign Challenge: Manage two growth fronts with limited resources. Strategic patience required.`,
    mapConfig: {
      size: 7, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          { q: -2, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true }, // Nexus start
          { q: 2, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },  // Core start
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },                        // Bridge
          
          // Nexus cluster (left)
          { q: -3, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          
          // Core cluster (right)
          { q: 3, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          
          // Chaos nodes
          { q: -3, r: 1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 3, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    startState: { credits: 700, moves: 45, rank: 4, materials: 20 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const nexusL3 = Object.values(state.grid).filter(
          h => h.ownerId === state.player.id && h.maxLevel === 3
        ).length;
        const coreL4 = Object.values(state.grid).filter(
          h => h.ownerId === state.player.id && h.maxLevel === 4
        ).length;
        return nexusL3 >= 6 && coreL4 >= 4;
      },
      checkLossCondition: (state) => {
        const nexusL3 = Object.values(state.grid).filter(
          h => h.ownerId === state.player.id && h.maxLevel === 3
        ).length;
        const coreL4 = Object.values(state.grid).filter(
          h => h.ownerId === state.player.id && h.maxLevel === 4
        ).length;
        if (state.player.storage <= 0 && !(nexusL3 >= 6 && coreL4 >= 4)) return true;
        return isStranded(state);
      }
    }
  },
  {
    id: '4.8',
    title: 'Sim 4.8: Omega Synthesis',
    description: `FINAL TRIAL: Complete Mastery.\n\nObjective: Multi-phase victory:\n  Phase 1: Stabilize 3 different terrain types (L0, L2, L3 sectors owned)\n  Phase 2: Accumulate 800 Credits\n  Phase 3: Reach and activate the Omega Monument (L5)\n  Phase 4: Maintain Entropy below 60\n\nRewards: Unlocks advanced modes. You are the architect of worlds.`,
    mapConfig: {
      size: 8, type: 'fixed', generateWalls: true, wallStartRadius: 6, wallType: 'pit_ring',
      customLayout: [
          { q: -4, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
          { q: 4, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          
          // Terrain diversity setup
          { q: -3, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },  // L0 terrain
          { q: -2, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },  // L2 terrain
          { q: 1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },   // L3 terrain
          { q: 2, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 3, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          
          // Support structures
          { q: -2, r: 1, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: -2, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: -1, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: 1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 2, r: 1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 2, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 3, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 3, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          
          // Chaos resources
          { q: -4, r: 1, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: 4, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -3, r: 1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 4, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
      ]
    },
    startState: { credits: 300, moves: 50, rank: 5, materials: 20, initialEntropy: 30 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        // Phase 1: Terrain diversity
        const hasL0 = Object.values(state.grid).some(h => h.ownerId === state.player.id && h.maxLevel === 0);
        const hasL2 = Object.values(state.grid).some(h => h.ownerId === state.player.id && h.maxLevel === 2);
        const hasL3 = Object.values(state.grid).some(h => h.ownerId === state.player.id && h.maxLevel === 3);
        const terrainDiverse = hasL0 && hasL2 && hasL3;
        
        // Phase 2: Credits
        const hasCredits = state.player.coins >= 800;
        
        // Phase 3: Monument
        const onMonument = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        
        // Phase 4: Entropy
        const entropySafe = (state.entropy?.current || 0) < 60;
        
        return terrainDiverse && hasCredits && onMonument && entropySafe;
      },
      checkLossCondition: (state) => {
        const onMonument = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        if ((state.entropy?.current || 0) >= 100) return true;
        if (onMonument && (state.entropy?.current || 0) < 60 && state.player.coins >= 800) return false;
        if (state.player.storage <= 0 && state.player.coins < 800) return true;
        return isStranded(state);
      }
    }
  }
];
