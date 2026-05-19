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
    description: 'Задача: Создайте "Кольцо Резонанса" - улучшите 3 РАЗНЫХ гекса до 2-го уровня одновременно.\n\nПравило: Для Ур. 2 нужно 2 соседа на Ур. 1. Планируйте порядок строительства.\nНачните с нуля — сначала копайте материалы.',
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
    description: 'Задача: Владейте ОБОИМИ гексами (-2,0) и (2,0) на уровне 1+.\n\nПрямой путь на восток заблокирован ПУСТОТОЙ. Найдите обходные пути или пожертвуйте предметы для восстановления.',
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
    description: 'Задача: Улучшите 2 гекса до 3-го уровня.\n\nДля каждого уровня требуется 2 соседа того же уровня в качестве поддержки.\nТщательно планируйте цепочку улучшений — стройте вширь, прежде чем строить ввысь.',
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
    description: 'Задача: Улучшите центральный гекс до 4-го уровня.\n\nОпасность: Каждое действие добавляет +3 к Энтропии. Старт с 70/100.\nПри 100 → коллапс сектора.\n\nУ вас есть около 10 действий. Каждый ход должен быть значимым.\nГотовая лестница: сосредоточьтесь на улучшении, а не на поиске пути.',
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
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        state.entropy.current = Math.min(100, (state.entropy.current ?? 70) + 3);
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
    description: 'Задача: Достигните 2 из 3 целей РАНЬШЕ Соперника:\n  А) Владейте 6+ гексами на Ур. 2+\n  Б) Накопите 200 Кредитов\n  В) Встаньте на Монумент\n\nСоперник приблизится примерно через 16 действий. Выберите 2 цели и действуйте.',
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
    description: 'Задача: 8+ гексов на 3-м уровне.\n\nОсобенность: Когда гекс достигает Ур. 3, все соседние гексы Ур. 2 МГНОВЕННО улучшаются до Ур. 3!\n\nСтратегия: Создайте большой кластер Ур. 2, затем запустите цепную реакцию.\n\nПредупреждение: Каскад не стоит материалов, но каждое вызванное улучшение — это действие (трата энтропии).',
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
    description: 'Задача: Владейте 4 гексами на Ур. 3+ И 2 гексами на Ур. 4+ одновременно.\n\nВызов: Для Ур. 4 требуется Ранг 3 и соседи на Ур. 3.\nВы должны строить и вширь (4×Ур. 3), и ввысь (2×Ур. 4) с нуля.\n\nКопайте глубоко для получения материалов. Планируйте цепочки поддержки.',
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
    description: 'ПОСЛЕДНЕЕ ИСПЫТАНИЕ: Все системы в критическом состоянии.\n\nДостигните ВСЕХ целей одновременно:\n  1. Владейте 3+ гексами на Уровне 3+\n  2. Накопите 300+ Кредитов\n  3. Встаньте на Монумент с 2+ предметами\n  4. Держите Энтропию ниже 60/100\n\nЭнтропия: +2 за действие. Старт: 40/100. Максимум ~30 действий.\n\nЭто конец. Используйте всё, чему вы научились.',
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
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        state.entropy.current = Math.min(100, (state.entropy.current ?? 40) + 2);
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
