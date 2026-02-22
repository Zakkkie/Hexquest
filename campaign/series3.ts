import { LevelConfig } from '../campaign/types';
import { getHexKey, getNeighbors } from '../services/hexUtils';
import { isStranded } from '../campaign/utils';

export const series3Levels: LevelConfig[] = [
  {
    id: '3.1',
    title: 'Sim 3.1: The Bridge',
    description: 'PUZZLE: Path Construction.\n\nObjective: Reach the CAPITAL on the far side.\n\nProblem: A void chasm separates you. Use inventory to STABILIZE the void hexes.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        { q: -3, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
        { q: 3, r: 0, maxLevel: 1, currentLevel: 1, structureType: 'CAPITAL', revealed: true },

        // VOID PATH
        { q: -2, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -1, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 0, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 2, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },

        // VOID SURROUNDINGS
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
      checkWinCondition: (state) => !!(state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'CAPITAL'),
      checkLossCondition: (state) => {
        if (state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'CAPITAL') return false;
        if (isStranded(state)) return true;
        if (state.player.inventory.length === 0 && state.player.q < 0) return true;
        return false;
      }
    }
  },
  {
    id: '3.2',
    title: 'Sim 3.2: The Harvest',
    description: 'PUZZLE: Resource Accumulation.\n\nObjective: Accumulate 500 Credits in 3 minutes.\n\nMap: Chaotic terrain (-3 to +5). Balance movement costs.',
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
      checkWinCondition: (state) => state.player.coins >= 500,
      checkLossCondition: (state) => (Date.now() - state.sessionStartTime > 180_000) || isStranded(state)
    }
  },
  {
    id: '3.3',
    title: 'Sim 3.3: The Cascade',
    description: 'PUZZLE: Chain Reaction Planning.\n\nObjective: Build a Level 5 hex at the summit (0,0).\n\nRule: Each upgrade requires 2 neighbors at the SAME level. Resources: Exactly 14 Materials — no waste allowed.',
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
      checkWinCondition: (state) => !!(state.grid[getHexKey(0, 0)]?.maxLevel >= 5),
      checkLossCondition: (state) => {
        const summit = state.grid[getHexKey(0, 0)];
        if (summit && summit.maxLevel >= 5) return false;
        if (state.player.storage <= 0 && (!summit || summit.maxLevel < 5)) return true;
        return isStranded(state);
      },
      onBeforeAction: (state, action) => {
        if (action.type === 'UPGRADE' && action.intent !== 'RECOVER') {
          const hex = state.grid[getHexKey(action.coord.q, action.coord.r)];
          if (hex && hex.maxLevel >= 1) {
            const validSupports = getNeighbors(hex.q, hex.r).filter(n => {
              const h = state.grid[getHexKey(n.q, n.r)];
              return h && h.maxLevel >= hex.maxLevel && h.structureType !== 'VOID';
            });
            if (validSupports.length < 2) return { ok: false, reason: `UNSTABLE! Need 2 neighbors at L${hex.maxLevel}+` };
          }
        }
        return { ok: true };
      }
    }
  },
  {
    id: '3.4',
    title: 'Sim 3.4: The Gauntlet',
    description: 'PUZZLE: Entropy Survival.\n\nObjective: Survive 5 Entropy Waves.\n\nThreat: Every 5 actions you take, an Entropy Spike hits the sector.\n\nStrategy: Prioritize stability over expansion. Use Recovery Stations.',
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
      checkWinCondition: (state) => state.currentTurn > 30 && state.player.playerLevel > 1 && state.player.coins >= 200,
      checkLossCondition: (state) => state.player.playerLevel <= 1 || state.player.coins <= 0 || isStranded(state),
      onAfterAction: (state) => {
          if (state.currentTurn > 0 && state.currentTurn % 5 === 0) state.entropy.current = 0; 
      }
    }
  },
  {
    id: '3.5',
    title: 'Sim 3.5: The Heist',
    description: 'PUZZLE: Terrain Navigation vs Active Hunter.\n\nObjective: Collect 3 items and activate Monument.\n\nThreat: A "DESTROYER" Bot is actively hunting your structures. It has NO patrol route—it will seek out your highest towers and collapse them.\n\nTerrain: Utter chaos. Jagged peaks and deep craters block the way. Find the hidden path (+/- 1).',
    mapConfig: {
      size: 7, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
        { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
        { q: 0, r: 3, maxLevel: -1, currentLevel: -1, ownerId: 'player-1', revealed: true }, 
        { q: 0, r: -3, maxLevel: 3, currentLevel: 3, revealed: true }, 

        // Player's Path (+/- 1 diff)
        { q: 1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },

        // Bot's Path (+/- 1 diff)
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
        
        // Dig sites
        { q: 2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -2, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -2, r: -2, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 400, moves: 25, rank: 3, materials: 5, initialEntropy: 15 },
    botRoutes: [
        // Placeholder so UI doesn't crash, but Bot will use Hunt logic
        [{q: -1, r: -2}, {q: -1, r: -1}, {q: 0, r: 0}, {q: 1, r: 0}, {q: 1, r: 1}, {q: 0, r: 1}, {q: -1, r: 0}, {q: -2, r: 0}]
    ],
    aiMode: 'basic', 
    hooks: {
      checkWinCondition: () => false, 
      checkLossCondition: (state) => isStranded(state)
    }
  },
  {
    id: '3.6',
    title: 'Sim 3.6: The Maze of Echoes',
    description: 'FINAL PUZZLE: Survive the Fracture.\n\nObjective: \n  1. Own 5+ hexes at Level 2+\n  2. 300+ Credits\n  3. Activate Monument\n\nThreats: Two DESTROYER bots actively hunt your structures. Follow the single hidden continuous ridge (+/- 1) to the Monument.',
    mapConfig: {
      size: 8, type: 'fixed', generateWalls: true, wallStartRadius: 6, wallType: 'pit_ring',
      customLayout: [
        { q: -4, r: 4, maxLevel: -2, currentLevel: -2, ownerId: 'player-1', revealed: true }, 
        { q: 4, r: -4, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true }, 
        
        { q: -3, r: 0, maxLevel: 0, currentLevel: 0, revealed: true }, 
        { q: 3, r: -1, maxLevel: 3, currentLevel: 3, revealed: true }, 

        // THE PASSABLE SNAKE PATH (+/- 1 diff): 
        { q: -3, r: 3, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: -2, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 2, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 3, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 4, r: -3, maxLevel: 5, currentLevel: 5, revealed: true },

        // Bot 1 Path to Player's Snake: 
        { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },

        // Bounded Chaos [-3, 5]
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
        // Placeholder routes for UI
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
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
          if (state.currentTurn > 0 && state.currentTurn % 10 === 0) {
              const candidates = Object.values(state.grid).filter(h => 
                  h.structureType !== 'MONUMENT' && h.structureType !== 'VOID' &&
                  h.ownerId !== state.player.id && h.maxLevel > -3
              );
              if (candidates.length > 0) {
                  const target = candidates[Math.floor(Math.random() * candidates.length)];
                  const key = getHexKey(target.q, target.r);
                  state.grid[key] = { ...target, structureType: 'VOID', maxLevel: 0, currentLevel: 0 };
              }
          }
      }
    }
  },
  {
    id: '3.7',
    title: 'Sim 3.7: Twin Protocol',
    description: `ADVANCED PUZZLE: Two viable doctrines.\n\nObjective: Reach the Monument while proving one strategy:\n  A) 4 owned sectors at Level 3+ (engineering route), OR\n  B) 280+ Credits (economic route).\n\nDesign: The map contains two legal corridors to the objective. The upper ridge is safer for upgrades, the lower basin is richer but entropy-heavy.\n\nAnti-exploit: Mission fails if you stall beyond 45 actions.`,
    mapConfig: {
      size: 8, type: 'fixed', generateWalls: true, wallStartRadius: 6, wallType: 'pit_ring',
      customLayout: [
        { q: -3, r: 2, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 3, r: -2, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
        { q: -2, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 1, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 2, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: -2, r: 1, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: -1, r: 0, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 0, r: -1, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: 1, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 2, r: -3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 3, r: -3, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 2, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 0, r: -2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -3, r: 1, maxLevel: 5, currentLevel: 5, revealed: true },
        { q: -2, r: 3, maxLevel: 5, currentLevel: 5, revealed: true },
        { q: 0, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 2, r: 0, maxLevel: 5, currentLevel: 5, revealed: true },
        { q: 3, r: -1, maxLevel: -3, currentLevel: -3, revealed: true }
      ]
    },
    startState: { credits: 120, moves: 34, rank: 4, materials: 9, initialEntropy: 20 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const ownedL3Plus = Object.values(state.grid).filter(h => h.ownerId === state.player.id && h.maxLevel >= 3).length;
        const playerOnMonument = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        return playerOnMonument && (ownedL3Plus >= 4 || state.player.coins >= 280);
      },
      checkLossCondition: (state) => state.currentTurn > 45 || isStranded(state)
    }
  },
  {
    id: '3.8',
    title: 'Sim 3.8: Fractured Supply Line',
    description: `MASTER PUZZLE: Secure logistics under pressure.\n\nObjective:\n  1) Capture relay beacons at (0,2) and (2,0)\n  2) Hold 320+ Credits\n  3) Reach the Monument\n\nPlanned challenge: Solve through either a northern climb or a southern excavation route.\n\nAnti-exploit: Hard turn cap prevents infinite farming loops.`,
    mapConfig: {
      size: 8, type: 'fixed', generateWalls: true, wallStartRadius: 6, wallType: 'pit_ring',
      customLayout: [
        { q: -3, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, structureType: 'CAPITAL', revealed: true },
        { q: 2, r: 0, maxLevel: 2, currentLevel: 2, structureType: 'CAPITAL', revealed: true },
        { q: 4, r: -2, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
        { q: -2, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 2, r: 1, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 3, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: -2, r: 1, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: -1, r: 1, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 0, r: 0, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 2, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 3, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: -1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 3, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 2, r: -2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 3, r: -2, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: -3, r: 1, maxLevel: 5, currentLevel: 5, revealed: true },
        { q: -3, r: -1, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 2, r: 2, maxLevel: 5, currentLevel: 5, revealed: true },
        { q: 4, r: -1, maxLevel: -3, currentLevel: -3, revealed: true }
      ]
    },
    startState: { credits: 140, moves: 38, rank: 4, materials: 10, initialEntropy: 24 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const relayA = state.grid[getHexKey(0, 2)];
        const relayB = state.grid[getHexKey(2, 0)];
        const hasRelays = relayA?.ownerId === state.player.id && relayB?.ownerId === state.player.id;
        const hasCredits = state.player.coins >= 320;
        const onMonument = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        return !!(hasRelays && hasCredits && onMonument);
      },
      checkLossCondition: (state) => state.currentTurn > 48 || isStranded(state)
    }
  }
];