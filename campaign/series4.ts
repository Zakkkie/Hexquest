import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

/**
 * ============================================================================
 *  SERIES 4: ADVANCED PUZZLES (8 levels)
 * ============================================================================
 */

// Helper: count player-owned hexes at given level
const countOwned = (state: any, minLevel: number): number =>
  Object.values(state.grid).filter((h: any) => h.ownerId === 'player-1' && h.maxLevel >= minLevel).length;

export const series4Levels: LevelConfig[] = [

  // 4.1 RESONANCE — Build 3 adjacent L2 hexes
  {
    id: '4.1',
    title: 'Sim 4.1: Протокол Резонанса',
    description: 'Создайте три разных гекса Уровня 2 одновременно.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 2, label: 'Pillar 1', color: 'amber' },
      { q: 1, r: -1, targetLevel: 2, label: 'Pillar 2', color: 'amber' },
      { q: -1, r: 1, targetLevel: 2, label: 'Pillar 3', color: 'amber' }
    ],
    mapConfig: {
      size: 4, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 1, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const c = countOwned(state, 2);
      if (c >= 3) return isRu ? "ПОБЕДА: Условие Резонанса выполнено!" : "VICTORY: Resonance complete!";
      return isRu 
        ? `СТРОЙ: Копай для материалов, затем построй 3 гекса L2! Готово: ${Math.min(3, c)}/3` 
        : `BUILD: Dig for materials, then build 3 hexes to L2! Built: ${Math.min(3, c)}/3`;
    },
    hooks: {
      checkWinCondition: (state) => countOwned(state, 2) >= 3,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-41-init-${Date.now()}`,
            text: isRu
              ? 'ИИ-Помощник: Начните цикл. Сначала КОПАЙТЕ (Красная кнопка) Ур. 0, чтобы накопить конструкционный материал. Проектируйте уступы для Ранга 2!'
              : 'AI-Assistant: Start the cycle. First, DIG (Red button) on Level 0 hexes to extract raw materials. Design step ladders to reach Rank 2 support constraints!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Refund bonus at (0, 0) for smart start
        const centerHex = state.grid[getHexKey(0, 0)];
        if (centerHex && centerHex.maxLevel === 1 && !(state as any)._resonanceInitiated) {
          (state as any)._resonanceInitiated = true;
          state.player.storage = Math.min(state.player.maxStorage, state.player.storage + 1);
          state.messageLog.unshift({
            id: `msg-41-bonus-${Date.now()}`,
            text: isRu
              ? 'ГАРМОНИКА: Центральный гекс (0,0) настроен отлично! Материал возвращен: +1.'
              : 'HARMONICS: Center hex (0,0) resonance point activated! Materials refunded: +1.',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // 4.2 MIRROR MAZE — Own symmetric positions (-2,0) and (2,0)
  {
    id: '4.2',
    title: 'Sim 4.2: Зеркальный Лабиринт',
    description: 'Захватите обе противоположные ключевые точки ландшафта.',
    objectiveHexes: [
      { q: -2, r: 0, targetLevel: 1, label: 'Beacon A', color: 'emerald' },
      { q: 2, r: 0, targetLevel: 1, label: 'Beacon B', color: 'emerald' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // WEST PATH (clear)
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true }, // Adjusted to owned to allow expansion/checks
          // EAST PATH (blocked by VOID)
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          // EAST DETOUR (south route)
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          // DIG SITES
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          // WALLS
          { q: 1, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: {
      credits: 0, moves: 3, rank: 1, materials: 0,
      items: [
        { baseId: 'fuel_cell', rarity: 'COMMON' },
        { baseId: 'reality_patch', rarity: 'COMMON' },
      ]
    },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const a = state.grid['-2,0'];
      const b = state.grid['2,0'];
      const aDone = !!(a?.ownerId === state.player.id && a.currentLevel >= 1);
      const bDone = !!(b?.ownerId === state.player.id && b.currentLevel >= 1);
      if (aDone && bDone) return isRu ? "ПОБЕДА: Маяки захвачены!" : "VICTORY: Beacons captured!";
      return isRu 
        ? "ЗАХВАТИ МАЯКИ: Возьми под контроль и возведи до L1 гексы (-2,0) и (2,0)!" 
        : "CAPTURE BEACONS: Take control and build to L1 on hexes (-2,0) and (2,0)!";
    },
    hooks: {
      checkWinCondition: (state) => {
        const a = state.grid[getHexKey(-2, 0)];
        const b = state.grid[getHexKey(2, 0)];
        return !!(a?.ownerId === 'player-1' && a.maxLevel >= 1 && b?.ownerId === 'player-1' && b.maxLevel >= 1);
      },
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-42-init-${Date.now()}`,
            text: isRu
              ? 'СИСТЕМА: Прямой проход разрушен разломом Пустоты на (1, 0). Используйте южный объезд (-1, 0 → 1, -1), либо пожертвуйте Reality Patch для быстрого восстановления клетки (шансы: Common: 25%)!'
              : 'SYSTEM: Direct pathway collapsed by Void at (1,0). Use the southern detour (-1,0 → 1,-1) or sacrifice your Reality Patch item to restore the hex directly (Common success rate: 25%)!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // 4.3 RECURSION ENGINE — Build 2 hexes to L3
  {
    id: '4.3',
    title: 'Sim 4.3: Рекурсивный Движок',
    description: 'Улучшите два любых гекса до 3-го уровня.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Pillar A', color: 'amber' },
      { q: 1, r: -1, targetLevel: 3, label: 'Pillar B', color: 'amber' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const c = countOwned(state, 3);
      if (c >= 2) return isRu ? "ПОБЕДА: Готово!" : "VICTORY: Done!";
      return isRu 
        ? `СТРОЙ: Возведи 2 любых гекса до L3! Готово: ${Math.min(2, c)}/2` 
        : `BUILD: Upgrade any 2 hexes to L3! Built L3: ${Math.min(2, c)}/2`;
    },
    hooks: {
      checkWinCondition: (state) => countOwned(state, 3) >= 2,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-43-init-${Date.now()}`,
            text: isRu
              ? 'ТЕКТОНИКА: Вы начинаете с Рангом 2. Копайте глубоко, чтобы добывать ресурсы и золото. Для возведения Ур. 3 понадобится развернуть широкий фундамент!'
              : 'TECTONICS: You start with Rank 2. Dig deep to accumulate construction elements and income. Erecting a Level 3 hex requires a sound broad base platform!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // 4.4 THERMAL EQUILIBRIUM — Upgrade to L4 under entropy pressure
  {
    id: '4.4',
    title: 'Sim 4.4: Тепловое Равновесие',
    description: 'Улучшите центральный гекс до 4-го уровня.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 4, label: 'Central Apex L4', color: 'amber' }
    ],
    mapConfig: {
      size: 4, type: 'fixed', generateWalls: true, wallStartRadius: 2, wallType: 'pit_ring',
      customLayout: [
          // Pre-built staircase to reduce action count
          { q: 0, r: 0, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          // L2 neighbors (support for center → L3)
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          // L3 neighbors (support for center → L4, after upgrading these to L3)
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
      ]
    },
    startState: { credits: 50, moves: 8, rank: 3, materials: 4, initialEntropy: 70 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const centerHex = state.grid['0,0'];
      const c = centerHex?.currentLevel || centerHex?.maxLevel || 0;
      if (c >= 4) return isRu ? "ПОБЕДА: Готово!" : "VICTORY: Complete!";
      return isRu 
        ? `СТРОЙ: Улучши центральный гекс (0,0) до L4! Охладись на (0,1).` 
        : `BUILD: Upgrade central hex (0,0) to L4! Cool down at (0,1).`;
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        // onAfterAction runs every ~100ms tick, not per action — heat only on a real
        // player action (actionsTaken delta), else +3/tick auto-loses the level in ~1s.
        const _a44 = state.player.actionsTaken ?? 0;
        if (_a44 > ((state as any)._heat44 ?? 0)) {
          (state as any)._heat44 = _a44;
          state.entropy.current = Math.min(100, (state.entropy.current ?? 70) + 3);
        }
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-44-init-${Date.now()}`,
            text: isRu
              ? 'ТЕРМАЛЬНЫЙ КОНТУР: Внимание! Каждое действие повышает нагрев (Энтропия) на +3. Шаг на клетку (0,1) поглотит флуктуации и охладит ядро на -15 пунктов стабильности!'
              : 'THERMAL CORE: Caution! Every single action expands core temperature (Entropy) by +3. Stepping on hex (0,1) discharges heat by -15 Entropy points!',
            type: 'WARN',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Cooling valve at (0, 1) L2
        if (state.player.q === 0 && state.player.r === 1 && !(state as any)._thermalEquilibriumCooled) {
          (state as any)._thermalEquilibriumCooled = true;
          state.entropy.current = Math.max(0, state.entropy.current - 15);
          state.messageLog.unshift({
            id: `msg-44-cooled-${Date.now()}`,
            text: isRu
              ? 'ОХЛАЖДЕНИЕ: Охладительный вентиль на (0,1) задействован. Энтропия аварийно снижена на -15 пунктов!'
              : 'COOLING VALVE: Thermal safety discharge triggered at (0,1). Core temperature reduced by -15 points!',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        return state;
      },
      checkWinCondition: (state) => (state.grid[getHexKey(0, 0)]?.maxLevel ?? 0) >= 4,
      checkLossCondition: (state) => {
        if ((state.entropy.current ?? 0) >= 100) return true;
        return isStranded(state);
      }
    }
  },

  // 4.5 CONVERGENCE POINT — Achieve 2 of 3 goals before bot
  {
    id: '4.5',
    title: 'Sim 4.5: Точка Конвергенции',
    description: 'Выполните две из трех целей раньше бота-соперника.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Monument Core', color: 'emerald' },
      { q: -1, r: 1, targetLevel: 2, label: 'Secure Node A', color: 'amber' },
      { q: 1, r: 1, targetLevel: 2, label: 'Secure Node B', color: 'amber' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 0, r: -3, maxLevel: 2, currentLevel: 2, revealed: true }, // Bot
          // PLAYER BUILD AREA
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 4, maxLevel: 0, currentLevel: 0, revealed: true }, // Added one more for 6-hex goal
          // BOT PATH
          { q: 0, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          // WALLS
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: 0, maxLevel: 5, currentLevel: 5, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    aiMode: 'basic',
    botObjective: 'MONUMENT_RACE',
    botSpawnPoints: [{ q: 0, r: -3 }],
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      let goals = 0;
      if (countOwned(state, 2) >= 6) goals++;
      if ((state.player.coins ?? 0) >= 200) goals++;
      if (state.grid[`${state.player.q},${state.player.r}`]?.structureType === 'MONUMENT') goals++;
      
      if (goals >= 2) return isRu ? "ПОБЕДА: Условия выполнены!" : "VICTORY: Conditions met!";
      
      return isRu 
        ? `ВЫПОЛНИТЕ 2 ИЗ 3: Соберите 200 Кредитов, постройте 6 гексов L2, или станьте на Монумент! Выполнено: ${goals}/2` 
        : `COMPLETE 2 OF 3: Gather 200 Credits, build 6 L2 hexes, or step on Monument! Completed: ${goals}/2`;
    },
    hooks: {
      checkWinCondition: (state) => {
        let goals = 0;
        if (countOwned(state, 2) >= 6) goals++;
        if ((state.player.coins ?? 0) >= 200) goals++;
        if (state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT') goals++;
        return goals >= 2;
      },
      checkLossCondition: (state) => {
        if (state.bots?.some((b: any) => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-45-init-${Date.now()}`,
            text: isRu
              ? 'ГОНКА НА КОНВЕРГЕНЦИЮ: Дрон Scout-Race приближается с севера. Сфокусируйтесь на Кредитах (глубокие раскопки) и наборе 6 гексов Ур. 2 — это быстрейший путь.'
              : 'CONVERGENCE RACE: Racing drone Scout-Race accelerates from (0,-3). Concentrate on Gold accumulation (deep mining) and securing 6 Level 2 hexes!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // 4.6 CASCADE PROTOCOL — Chain reaction: L3 auto-upgrades neighbors
  {
    id: '4.6',
    title: 'Sim 4.6: Каскадный Протокол',
    description: 'Создайте цепную реакцию для каскадного обновления плит до 3-го уровня.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Cascade Core', color: 'amber' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // LARGE BUILD AREA (19-hex flower: center + 2 rings)
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          // RING 2
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const c = countOwned(state, 3);
      if (c >= 8) return isRu ? "ПОБЕДА: Каскад запущен!" : "VICTORY: Cascade complete!";
      return isRu 
        ? `КАСКАД: Строй L3 рядом с L2 для авто-расширения! Нужно гексов L3: ${Math.min(8, c)}/8` 
        : `CASCADE: Build L3 near L2 to trigger auto-expand! Need L3 hexes: ${Math.min(8, c)}/8`;
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const isRu = state.language === 'RU';
        
        // CASCADE: Any hex that just reached L3 triggers adjacent L2→L3
        let cascaded = false;
        let cascadeCount = 0;
        let keepChecking = true;

        while (keepChecking) {
          keepChecking = false;
          const hexes = Object.values(state.grid) as any[];
          for (const hex of hexes) {
            if (hex.maxLevel === 3 && hex.ownerId === 'player-1') {
              const neighbors = [
                { q: hex.q + 1, r: hex.r }, { q: hex.q - 1, r: hex.r },
                { q: hex.q, r: hex.r + 1 }, { q: hex.q, r: hex.r - 1 },
                { q: hex.q + 1, r: hex.r - 1 }, { q: hex.q - 1, r: hex.r + 1 }
              ];
              for (const n of neighbors) {
                const nHex = state.grid[getHexKey(n.q, n.r)];
                if (nHex && nHex.maxLevel === 2 && nHex.ownerId === 'player-1') {
                  state.grid[getHexKey(n.q, n.r)] = {
                    ...nHex, currentLevel: 3, maxLevel: 3
                  };
                  state.entropy.current = Math.max(0, (state.entropy.current ?? 100) - 1);
                  cascaded = true;
                  cascadeCount++;
                  keepChecking = true;
                }
              }
            }
          }
        }

        if (cascaded && cascadeCount > 0) {
          state.messageLog.unshift({
            id: `msg-46-cascade-${Date.now()}`,
            text: isRu
              ? `ЦЕПНАЯ РЕАКЦИЯ: Высота 3 запустила резонансные микроколебания! Каскадно улучшено гексов: +${cascadeCount}!`
              : `RESONANCE CASCADE: Level 3 triggered kinetic pulse wave alignments! Auto-upgraded: +${cascadeCount} sectors!`,
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        return state;
      },
      checkWinCondition: (state) => countOwned(state, 3) >= 8,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // 4.7 DUALITY ENGINE — Build 4×L3 AND 2×L4 simultaneously
  {
    id: '4.7',
    title: 'Sim 4.7: Двойной Движок',
    description: 'Отрегулируйте баланс и владейте четырьмя плитами Ур.3 и двумя плитами Ур.4.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 4, label: 'Apex Peak A', color: 'amber' },
      { q: 1, r: -1, targetLevel: 4, label: 'Apex Peak B', color: 'amber' },
      { q: 0, r: 1, targetLevel: 3, label: 'Support Pillar A', color: 'amber' },
      { q: -1, r: 0, targetLevel: 3, label: 'Support Pillar B', color: 'amber' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // LARGE BUILD AREA (same as 4.6 but slightly different)
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 3, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const l3 = countOwned(state, 3);
      const l4 = countOwned(state, 4);
      if (l3 >= 4 && l4 >= 2) return isRu ? "ПОБЕДА: Движок запущен!" : "VICTORY: Engine running!";
      return isRu 
        ? `СТРОЙ: Построй одновременно 4 гекса L3 (${Math.min(4, l3)}/4) и 2 гекса L4 (${Math.min(2, l4)}/2)!` 
        : `BUILD: Simultaneously build 4 L3 hexes (${Math.min(4, l3)}/4) and 2 L4 hexes (${Math.min(2, l4)}/2)!`;
    },
    hooks: {
      checkWinCondition: (state) => countOwned(state, 3) >= 4 && countOwned(state, 4) >= 2,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-47-init-${Date.now()}`,
            text: isRu
              ? 'КАЛИБРОВКА: Два потока одновременно. Развивайте широкую базу Ур. 3, прежде чем наращивать конус высоты Ур. 4.'
              : 'CALIBRATION: Dual vector tasks. Broaden your Level 3 arrays before extending into Level 4 structural cones.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // 4.8 OMEGA SYNTHESIS — Final trial. 4 simultaneous conditions + entropy.
  {
    id: '4.8',
    title: 'Sim 4.8: Омега Синтез',
    description: 'Финальный синтез: выполните все четыре цели до температурного коллапса.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Monument', color: 'emerald' },
      { q: 0, r: 1, targetLevel: 3, label: 'Omega Support', color: 'amber' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // STAIRCASE to monument
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          // BUILD AREA (player zone)
          { q: 1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          // DIG SITES
          { q: 2, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 4, maxLevel: 0, currentLevel: 0, revealed: true },
          // WALLS
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0, initialEntropy: 40 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const l3 = countOwned(state, 3);
      const coins = state.player.coins ?? 0;
      const items = state.player.inventory?.length ?? 0;
      const cool = (state.entropy.current ?? 0) < 60;
      
      const onMon = state.grid[`${state.player.q},${state.player.r}`]?.structureType === 'MONUMENT';
      if (onMon && l3 >= 3 && coins >= 300 && items >= 2 && cool) {
          return isRu ? "ПОБЕДА: Омега Синтез завершен!" : "VICTORY: Omega Synthesis complete!";
      }
      
      const cStr = `L3: ${Math.min(3, l3)}/3`;
      const gStr = `Gold: ${Math.min(300, coins)}/300`;
      const iStr = `Items: ${Math.min(2, items)}/2`;
      const eStr = `Cool: ${cool ? 'OK' : 'HOT'}`;
      
      return isRu 
        ? `ЦЕЛИ: Заверши: [${cStr}] [${gStr}] [${iStr}] [${eStr}], затем иди на Монумент!` 
        : `COMPLETE: Finish [${cStr}] [${gStr}] [${iStr}] [${eStr}], then step on Monument!`;
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        // Heat per real action, not per tick (onAfterAction runs ~10x/s).
        const _a48 = state.player.actionsTaken ?? 0;
        if (_a48 > ((state as any)._heat48 ?? 0)) {
          (state as any)._heat48 = _a48;
          state.entropy.current = Math.min(100, (state.entropy.current ?? 40) + 2);
        }
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-48-init-${Date.now()}`,
            text: isRu
              ? 'ФИНАЛЬНЫЙ СУММАТОР: Все системы на пике износа. Накопите 300 Кредитов, владейте 3+ гексами Ур. 3, соберите 2 предмета в инвентарь и зайдите на Монумент при Энтропии < 60!'
              : 'FINAL INTEGRATOR: All indicators in tension. Gather 300 Credits, own 3+ Level 3 slots, hold 2 items in hand and activate the Monument with Entropy < 60%!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Tense status logs every 5 turns
        if (turn > 0 && turn % 5 === 0) {
          state.messageLog.unshift({
            id: `msg-48-tension-${turn}-${Date.now()}`,
            text: isRu
              ? `ОМЕГА МОНИТОР: Шаг ${turn}. Энтропия ядра: ${state.entropy.current}%. Время уплотняется!`
              : `OMEGA CORE MONITOR: Step ${turn}. Entropy current: ${state.entropy.current}%. Coordinates contracting!`,
            type: 'WARN',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        return state;
      },
      checkWinCondition: (state) => {
        const onMon = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        const l3 = countOwned(state, 3);
        const coins = state.player.coins ?? 0;
        const items = state.player.inventory?.length ?? 0;
        const cool = (state.entropy.current ?? 0) < 60;
        return !!(onMon && l3 >= 3 && coins >= 300 && items >= 2 && cool);
      },
      checkLossCondition: (state) => {
        if ((state.entropy.current ?? 0) >= 100) return true;
        return isStranded(state);
      }
    }
  }
];
