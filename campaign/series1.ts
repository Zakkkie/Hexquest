import { LevelConfig } from '../types';
import { getHexKey, getNeighbors } from '../services/hexUtils';
import { isStranded } from './utils';

export const series1Levels: LevelConfig[] = [
  {
    id: '1.1',
    title: 'Sim 1.1: Expansion Protocol',
    description: 'Mission: Capture 3 NEW sectors.\n\nThe unit requires a foothold. Capture 3 adjacent Neutral Sectors (Lvl 0) to establish a perimeter.\n\nMethod: Move to a neutral hex and use UPGRADE (Amber Button) to build Level 1 (Cost: 1 Mat).\n\nWARNING: Materials are limited. Use them to expand.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 2, wallType: 'pit_ring', 
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
        return isStranded(state);
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
      checkWinCondition: (state) => !!(state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'CAPITAL'),
      checkLossCondition: (state) => state.player.playerLevel <= 1 || isStranded(state)
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
      checkWinCondition: (state) => (state.grid[getHexKey(0,0)]?.maxLevel >= 2),
      checkLossCondition: (state) => (state.player.storage <= 0 && state.grid[getHexKey(0,0)]?.maxLevel < 2) || isStranded(state),
      onBeforeAction: (state, action) => {
          if (action.type === 'UPGRADE') {
              const hex = state.grid[getHexKey(action.coord.q, action.coord.r)];
              if (hex && hex.maxLevel === 1 && action.intent !== 'RECOVER') {
                  const validSupports = getNeighbors(hex.q, hex.r).filter(n => {
                      const h = state.grid[getHexKey(n.q, n.r)];
                      return h && h.maxLevel >= 1 && h.structureType !== 'VOID';
                  });
                  if (validSupports.length < 2) return { ok: false, reason: "UNSTABLE! Upgrade 2 neighbors to Lvl 1 first." };
              }
          }
          return { ok: true };
      }
    }
  },
  {
    id: '1.4',
    title: 'Sim 1.4: Excavation',
    description: 'Protocol: Resource Cycle.\n\nObjective: Upgrade Center to Lvl 3.\n\nProblem: You have 0 Materials. Construction is impossible.\n\nSolution: DIG (Red Button). Excavate surrounding mounds (Lvl 2) to harvest +1 Mat.',
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
      checkWinCondition: (state) => (state.grid[getHexKey(0,0)]?.maxLevel >= 3),
      checkLossCondition: (state) => isStranded(state) && state.grid[getHexKey(0,0)]?.maxLevel < 3,
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
    description: 'Protocol: Emergency Recovery.\n\nObjective: Collect 150 Credits in 75s.\n\nRule: Standard Recovery is single-use. You must MOVE to reset the tool.\n\nMethod: Use RECOVERY (Blue Button) on high sectors.',
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
      checkWinCondition: (state) => state.player.coins >= 150,
      checkLossCondition: (state) => (Date.now() - state.sessionStartTime > 75000) || isStranded(state)
    }
  },
  {
    id: '1.6',
    title: 'Sim 1.6: Vertical Limit',
    description: 'Protocol: Altitude Test.\n\nObjective: Reach Level 4.\n\nConstraint: Space is extremely limited. Manage your footprint carefully.',
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
      checkWinCondition: (state) => state.player.playerLevel >= 4,
      checkLossCondition: (state) => isStranded(state)
    }
  }
];