import { LevelConfig } from '../types';
import { getHexKey, getNeighbors } from '../services/hexUtils';
import { isStranded } from './utils';

export const series1Levels: LevelConfig[] = [
  {
    id: '1.1',
    title: 'Sim 1.1: Протокол Инициации',
    description: 'Цель: Улучшите 3 отмеченных гекса вокруг вас. Не тратьте материалы на другие гексы. Если вы потратите материал не на цель, вы проиграете.',
    goalText: 'Улучшите 3 отмеченных гекса',
    mapConfig: {
      size: 3, type: 'fixed', generateWalls: false,
      customLayout: [
        // Центр (Игрок)
        { q: 0, r: 0, maxLevel: 0, currentLevel: 0, revealed: true, ownerId: 'player-1' },
        // Радиус 1 (7 гексов уровня 0)
        { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
        // Радиус 2 (Окружение уровня -8)
        { q: 2, r: 0, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: 2, r: -1, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: 2, r: -2, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: 1, r: -2, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: 0, r: -2, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: -1, r: -1, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: -2, r: 0, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: -2, r: 1, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: -2, r: 2, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: -1, r: 2, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: 0, r: 2, maxLevel: -8, currentLevel: -8, revealed: true },
        { q: 1, r: 1, maxLevel: -8, currentLevel: -8, revealed: true },
      ]
    },
    objectiveHexes: [
      { q: 1, r: 0, targetLevel: 1, label: '↑', color: 'amber' },
      { q: -1, r: 1, targetLevel: 1, label: '↑', color: 'amber' },
      { q: 0, r: -1, targetLevel: 1, label: '↑', color: 'amber' },
    ],
    startState: { credits: 100, moves: 50, rank: 1, materials: 3, initialEntropy: 100 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const targets = [getHexKey(1, 0), getHexKey(-1, 1), getHexKey(0, -1)];
        return targets.every(key => (state.grid[key]?.maxLevel ?? 0) >= 1);
      },
      checkLossCondition: (state) => {
        const targets = [getHexKey(1, 0), getHexKey(-1, 1), getHexKey(0, -1)];
        const upgradedTargets = targets.filter(key => (state.grid[key]?.maxLevel ?? 0) >= 1).length;
        const remainingTargets = 3 - upgradedTargets;
        
        if ((state.player.storage ?? 0) < remainingTargets) return true;
        
        return isStranded(state);
      },
      onBeforeAction: (state, action) => {
        if (action.type === 'UPGRADE') {
          const key = getHexKey(action.coord.q, action.coord.r);
          const targets = [getHexKey(1, 0), getHexKey(-1, 1), getHexKey(0, -1)];
          if (!targets.includes(key)) {
            return { ok: true }; 
          }
        }
        return { ok: true };
      }
    }
  },
  {
    id: '1.2',
    title: 'Sim 1.2: Solid Ground',
    description: 'Objective: Reach the Capital.\n\nSCANNER: A safe path (Durability 3) detected. Follow it through the void.\n\nDANGER: Environment UNSTABLE (Durability 1). Stepping off the path causes immediate collapse and Rank loss.\n\nFAILURE: Rank drops to 1.',
    mapConfig: { size: 8, type: 'fixed', generateWalls: false },
    startState: { credits: 0, moves: 20, rank: 5, materials: 0, initialEntropy: 15 },
    goalText: 'Reach the Capital',
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
    startState: { credits: 300, moves: 10, rank: 2, materials: 3, initialEntropy: 15 },
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
    startState: { credits: 1000, moves: 20, rank: 3, materials: 0, initialEntropy: 15 },
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
    startState: { credits: 0, moves: 6, rank: 5, materials: 0, initialEntropy: 15 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => state.player.coins >= 150,
      checkLossCondition: (state) => (Date.now() - state.sessionStartTime > 75000) || isStranded(state)
    }
  },
  {
    id: '1.6',
    title: 'Sim 1.6: Vertical Limit',
    description: 'Protocol: Altitude Test.\n\nObjective: Reach Level 4.\n\nConstraint: Space is extremely limited. A rival is competing for the same peak. Manage your footprint carefully.',
    mapConfig: {
      size: 4, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 2,  maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 0, r: 1,  maxLevel: 1, currentLevel: 1, revealed: true },   // Bridge (player → center)
          { q: 0, r: 0,  maxLevel: 2, currentLevel: 2, revealed: true },   // Central L2 (starting point for L3)
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },   // Bridge (center → bot)
          { q: 0, r: -2, maxLevel: 1, currentLevel: 1, ownerId: 'bot-1',   revealed: true },
          // L2 support neighbors to enable L3 progression (pre-built)
          { q: 1, r: 0,  maxLevel: 2, currentLevel: 2, revealed: true },   // L2 support (east)
          { q: -1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },   // L2 support (west)
      ]
    },
    startState: { credits: 30, moves: 5, rank: 1, materials: 8, initialEntropy: 30 },
    botSpawnPoints: [{ q: 0, r: -2 }],
    botObjective: 'COMPETE_RANK',
    aiMode: 'basic',
    hooks: {
      checkWinCondition: (state) => state.player.playerLevel >= 4,
      checkLossCondition: (state) => {
        // Бот побеждает если достиг Rank 4 раньше игрока
        const bot = state.bots[0];
        if (bot && bot.playerLevel >= 4) return true;
        return isStranded(state);
      }
    }
  }
];