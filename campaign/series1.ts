import { LevelConfig } from '../types';
import { isStranded } from './utils';

export const series1Levels: LevelConfig[] = [
  // 1.1: Инициация Движения
  {
    id: '1.1',
    title: 'Sim 1.1: Инициация Движения',
    description: 'Обучение азам и навигации по высотам. Цель: научитесь строить, раскапывать и преодолейте космическую улитку высот.',
    goalText: 'Reach the Portal',
    mapConfig: {
      size: 5,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, ownerId: 'player-1' }, // Start
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true }, // Movement target / Build tutorial
        { q: 2, r: 0, currentLevel: 2, maxLevel: 2, revealed: true }, // Walker target
        { q: 3, r: 0, currentLevel: 2, maxLevel: 2, revealed: true }, // Dig tutorial
        { q: 4, r: 0, currentLevel: 0, maxLevel: 0, revealed: true }, // Walkway
        { q: 5, r: 0, currentLevel: 0, maxLevel: 0, revealed: true }, // Checkpoint / Snail start
        // Snail Escalation path (starting from 5,0 L0 and ending at -2,3 L10)
        { q: 6, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 6, r: 1, currentLevel: 2, maxLevel: 2, revealed: true },
        { q: 5, r: 2, currentLevel: 3, maxLevel: 3, revealed: true },
        { q: 4, r: 3, currentLevel: 4, maxLevel: 4, revealed: true },
        { q: 3, r: 3, currentLevel: 5, maxLevel: 5, revealed: true },
        { q: 2, r: 3, currentLevel: 6, maxLevel: 6, revealed: true },
        { q: 1, r: 3, currentLevel: 7, maxLevel: 7, revealed: true },
        { q: 0, r: 3, currentLevel: 8, maxLevel: 8, revealed: true },
        { q: -1, r: 3, currentLevel: 9, maxLevel: 9, revealed: true },
        { q: -2, r: 3, currentLevel: 10, maxLevel: 10, revealed: true, structureType: 'CAPITAL' },
        
        // --- COSMIC OCEAN DECORATIVE SHELF ---
        { q: 0, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 1, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 2, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 3, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 4, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 5, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 6, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        
        // Outer rings around the snail spiral
        { q: 7, r: 0, currentLevel: -3, maxLevel: -3, revealed: true, isPassable: false },
        { q: 7, r: 1, currentLevel: -3, maxLevel: -3, revealed: true, isPassable: false },
        { q: 6, r: 2, currentLevel: -3, maxLevel: -3, revealed: true, isPassable: false },
        { q: 5, r: 3, currentLevel: -5, maxLevel: -5, revealed: true, isPassable: false },
        { q: 4, r: 4, currentLevel: -5, maxLevel: -5, revealed: true, isPassable: false },
        { q: 3, r: 4, currentLevel: -5, maxLevel: -5, revealed: true, isPassable: false },
        { q: 2, r: 4, currentLevel: -6, maxLevel: -6, revealed: true, isPassable: false },
        { q: 1, r: 4, currentLevel: -6, maxLevel: -6, revealed: true, isPassable: false },
        { q: 0, r: 4, currentLevel: -6, maxLevel: -6, revealed: true, isPassable: false },
        { q: -1, r: 4, currentLevel: -6, maxLevel: -6, revealed: true, isPassable: false },
        { q: -2, r: 4, currentLevel: -6, maxLevel: -6, revealed: true, isPassable: false },
        { q: -3, r: 4, currentLevel: -6, maxLevel: -6, revealed: true, isPassable: false },
        { q: -3, r: 3, currentLevel: -6, maxLevel: -6, revealed: true, isPassable: false },
        { q: -2, r: 2, currentLevel: -5, maxLevel: -5, revealed: true, isPassable: false },
        { q: -1, r: 2, currentLevel: -5, maxLevel: -5, revealed: true, isPassable: false },
        { q: 0, r: 2, currentLevel: -5, maxLevel: -5, revealed: true, isPassable: false },
        { q: 1, r: 2, currentLevel: -5, maxLevel: -5, revealed: true, isPassable: false },
        { q: 2, r: 2, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 3, r: 2, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 4, r: 2, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false }
      ]
    },
    objectiveHexes: [
      { q: 1, r: 0, targetLevel: 1, label: 'Build', color: 'amber' },
      { q: 2, r: 0, targetLevel: 2, label: 'Move', color: 'cyan' },
      { q: 3, r: 0, targetLevel: 1, label: 'Dig', color: 'red' },
      { q: 4, r: 0, targetLevel: 0, label: 'Move', color: 'cyan' },
      { q: 5, r: 0, targetLevel: 0, label: 'Checkpoint', color: 'amber' },
      // Snail path objectives
      { q: 6, r: 0, targetLevel: 1, label: 'Move', color: 'cyan' },
      { q: 6, r: 1, targetLevel: 2, label: 'Move', color: 'cyan' },
      { q: 5, r: 2, targetLevel: 3, label: 'L3', color: 'amber' },
      { q: 4, r: 3, targetLevel: 4, label: 'Move', color: 'cyan' },
      { q: 3, r: 3, targetLevel: 5, label: 'Move', color: 'cyan' },
      { q: 2, r: 3, targetLevel: 6, label: 'L6', color: 'amber' },
      { q: 1, r: 3, targetLevel: 7, label: 'Move', color: 'cyan' },
      { q: 0, r: 3, targetLevel: 8, label: 'Move', color: 'cyan' },
      { q: -1, r: 3, targetLevel: 9, label: 'Move', color: 'cyan' },
      { q: -2, r: 3, targetLevel: 10, label: 'Portal', color: 'emerald' }
    ],
    startState: { credits: 0, moves: 120, rank: 10, materials: 5, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const player = state.player;
      const grid = state.grid;
      const pq = player.q;
      const pr = player.r;

      if (pq === -2 && pr === 3) {
        return isRu ? "ПОБЕДА: Вы достигли Портала!" : "VICTORY: You reached the portal!";
      }

      if (pq === 0 && pr === 0) {
        return isRu ? "ИДИ НА УКАЗАТЕЛЬ: Шагай вперед на гекс (1,0)." : "MOVE TO TARGET: Step forward to hex (1,0).";
      }

      if (pq === 1 && pr === 0) {
        const currentHex = grid['1,0'];
        if (currentHex && currentHex.currentLevel === 0) {
          return isRu 
            ? "СТРОЙ: Подними уровень земли до L1, чтобы зайти на следующий уступ." 
            : "BUILD: Raise the ground level to L1 to proceed.";
        }
        return isRu ? "ИДИ НА УКАЗАТЕЛЬ: Препятствие пройдено, шагай на гекс (2,0)." : "MOVE TO TARGET: Obstacle cleared, step to (2,0).";
      }

      if (pq === 2 && pr === 0) {
        return isRu ? "ИДИ НА УКАЗАТЕЛЬ: Продолжай маршрут, шагай на (3,0)." : "MOVE TO TARGET: Keep following the path to (3,0).";
      }

      if (pq === 3 && pr === 0) {
        const currentHex = grid['3,0'];
        if (currentHex && currentHex.currentLevel === 2) {
          return isRu 
            ? "КОПАЙ: Впереди обрыв. Опусти свою платформу до L1, чтобы safely спрыгнуть." 
            : "DIG: Cliff ahead. Lower your platform to L1 to jump down safely.";
        }
        return isRu ? "ИДИ НА УКАЗАТЕЛЬ: Шагай вниз на (4,0)." : "MOVE TO TARGET: Step down to (4,0).";
      }

      if (pq === 4 && pr === 0) {
        return isRu ? "ИДИ НА УКАЗАТЕЛЬ: Наступи на (5,0), чтобы начать восхождение." : "MOVE TO TARGET: Step to (5,0) to begin ascension.";
      }

      if (pq === 5 && pr === 0) {
        return isRu ? "ИДИ НА УКАЗАТЕЛЬ: Иди по спирали Улитки. Шагай на уровень L1." : "MOVE TO TARGET: Follow the Snail spiral up to L1.";
      }

      // Snail path progress indicator
      const snailPath = [
        { q: 5, r: 0 },
        { q: 6, r: 0 },
        { q: 6, r: 1 },
        { q: 5, r: 2 },
        { q: 4, r: 3 },
        { q: 3, r: 3 },
        { q: 2, r: 3 },
        { q: 1, r: 3 },
        { q: 0, r: 3 },
        { q: -1, r: 3 },
        { q: -2, r: 3 }
      ];
      const snailIdx = snailPath.findIndex(p => p.q === pq && p.r === pr);
      if (snailIdx !== -1) {
        return isRu
          ? `ИДИ НА УКАЗАТЕЛЬ: Поднимайся выше! Шаг ${snailIdx}/10.`
          : `MOVE TO TARGET: Keep climbing higher! Step ${snailIdx}/10.`;
      }

      return isRu 
        ? "ИДИ НА УКАЗАТЕЛЬ: Двигайтесь к Порталу!"
        : "MOVE TO TARGET: Keep moving to the Portal!";
    },
    hooks: {
      checkWinCondition: (state) => state.player.q === -2 && state.player.r === 3,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // 1.2: Сбор Материалов
  {
    id: '1.2',
    title: 'Sim 1.2: Сбор Материалов',
    description: 'Добывайте строительные материалы и проложите путь к Столице холмов.',
    goalText: 'Доберитесь до Столицы',
    mapConfig: {
      size: 4,
      type: 'fixed',
      customLayout: []
    },
    objectiveHexes: [
      { q: -4, r: -1, targetLevel: 3, label: 'L3 Ridge', color: 'amber' },
      { q: -8, r: 0, targetLevel: 1, label: 'Capital', color: 'emerald' },
    ],
    startState: { credits: 0, moves: 40, rank: 10, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const player = state.player;
      const finished = player.q === -8 && player.r === 0;
      if (finished) {
        return isRu ? "ПОБЕДА: Вы у цели!" : "VICTORY: You reached the objective!";
      }
      const hex = state.grid[`${player.q},${player.r}`];
      
      if (hex && hex.durability === 1) {
        return isRu 
          ? "БЕГИ: Плита разрушается! Двигайся вперед без остановок!"
          : "RUN: Tile is collapsing! Move forward without stopping!";
      }
      
      if (player.r === -1) {
        return isRu
          ? "КОПАЙ: Срежь вершину под собой до L1, чтобы сэкономить силы (ОД) для движения!"
          : "DIG: Cut the peak under you down to L1 to save movement points!";
      }
      
      const hasReachedFork = (player.q === 0 && player.r === 0) || (player.q === -1 && player.r === 0);
      if (hasReachedFork) {
        return isRu
          ? "ИДИ НА УКАЗАТЕЛЬ: Выбери путь - Хрупкий центр, Безопасный Юг или Хребет на Севере!"
          : "MOVE: Choose your path - Fragile center, Safe South, or Ridge on the North!";
      }

      return isRu
        ? "ИДИ НА УКАЗАТЕЛЬ: Двигайтесь к выходу (-8, 0)!"
        : "MOVE TO TARGET: Proceed to the exit target (-8, 0)!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.player.q === -8 && state.player.r === 0;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.3: Замок Градиента
  {
    id: '1.3',
    title: 'Sim 1.3: Замок Градиента',
    description: 'Снизьте высоту центрального гекса, соблюдая правила геологической стабильности.',
    goalText: 'Срежьте центральный сектор до базового уровня',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 2, maxLevel: 2, revealed: true }, // Центр L2 (Цель)
        
        // Inner Ring (L1)
        { q: 1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' },
        { q: 1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },

        // Outer Ring - height 0
        { q: 0, r: -2, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: 2, r: -2, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: 2, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: 0, r: 2, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: -2, r: 2, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: -2, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },

        // Outer Ring - rifts
        { q: 1, r: -2, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 2, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 1, r: 1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -1, r: 2, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -2, r: 1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -1, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false }
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 0, label: 'Goal', color: 'red' },
    ],
    startState: { credits: 0, moves: 30, rank: 2, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const h00 = state.grid['0,0']?.currentLevel ?? 2;
      const neighbors = ['1,-1', '1,0', '0,1', '-1,1', '-1,0', '0,-1'];
      const neighborLevels = neighbors.map(key => state.grid[key]?.currentLevel ?? 1);
      const minNeighbor = Math.min(...neighborLevels);
      
      const player = state.player;
      const isAtCenter = player.q === 0 && player.r === 0;
      const isAtStartingHex = player.q === 1 && player.r === -1;
      const h11 = state.grid['1,-1']?.currentLevel ?? 1;

      if (h00 <= 0) {
        return isRu
          ? "ПОБЕДА: Центр спущен до L0!"
          : "VICTORY: Center lowered to L0!";
      }

      if (isAtStartingHex && h11 === 1) {
        return isRu
          ? "КОПАЙ: Нажми КОПАТЬ, чтобы опустить себя до L0."
          : "DIG: Press DIG to lower your hex to L0.";
      }

      if (h00 === 2) {
        if (isAtCenter) {
          return isRu
            ? "КОПАЙ: Опусти Центр до L1."
            : "DIG: Lower Center to L1.";
        } else {
          return isRu
            ? "ИДИ НА УКАЗАТЕЛЬ: Иди в Центр (0,0) и КОПАЙ."
            : "MOVE: Move to Center (0,0) and DIG.";
        }
      }

      if (minNeighbor >= 1) {
        if (isAtCenter) {
          return isRu
            ? "БЛОКИРОВКА: Иди на любую соседнюю клетку и КОПАЙ её до L0, чтобы открыть путь!"
            : "LOCK: Move to any neighbor and DIG it to L0!";
        } else {
          return isRu
            ? "КОПАЙ: Опусти текущий гекс до L0, чтобы снять замок Градиента."
            : "DIG: Lower this hex to L0 to break Gradient Lock.";
        }
      }

      if (isAtCenter) {
        return isRu
          ? "КОПАЙ: Замок снят! Копай Центр до L0 для победы!"
          : "DIG: Lock broken! Dig Center to L0 to win!";
      } else {
        return isRu
          ? "ИДИ НА УКАЗАТЕЛЬ: Замок снят! Иди в Центр (0,0) и КОПАЙ его до L0."
          : "MOVE: Lock broken! Move to Center (0,0) and DIG to L0.";
      }
    },
    hooks: {
      checkWinCondition: (state) => {
        return (state.grid['0,0']?.currentLevel ?? 2) <= 0;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.4: Архитектура Опор
  {
    id: '1.4',
    title: 'Sim 1.4: Архитектура Опор',
    description: 'Плотина высокого уровня требует крепкой конструкции. Постройте многоуровневый каскад поддерживающих плит, чтобы возвести башню L3.',
    goalText: 'Возведите башню уровня L3 в центре',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 3, revealed: true, ownerId: 'player-1' }, // Center
        { q: 1, r: -1, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 1, r: 0, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 0, r: 1, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: -1, r: 1, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: -1, r: 0, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 0, r: -1, currentLevel: 0, maxLevel: 3, revealed: true },
        // Expanded second degree neighbors for cascades
        { q: 2, r: -2, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 2, r: -1, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 0, r: 2, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: -2, r: 2, currentLevel: 0, maxLevel: 3, revealed: true },
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Goal L3', color: 'emerald' },
    ],
    startState: { credits: 0, moves: 50, rank: 3, materials: 14, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const h00 = state.grid['0,0']?.currentLevel ?? 0;
      if (h00 >= 3) {
        return isRu
          ? "Поздравляем! Архитектурная башня L3 успешно зафиксирована на пике."
          : "Congratulations! Architectural L3 tower successfully anchored on the peak.";
      }

      const centerNeighbors = ['1,-1', '1,0', '0,1', '-1,1', '-1,0', '0,-1'];
      const l3Supports = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 3).length;
      
      if (h00 === 2) {
        if (l3Supports < 2) {
          return isRu
            ? `СТРОЙ БАШНИ L3: Чтобы поднять Центр до L3, нужно возвести 2 соседние плиты до высоты L3! Готово: ${l3Supports}/2`
            : `BUILD L3 TOWERS: Upgrade 2 neighboring tiles to height L3 to unlock the Center! Progress: ${l3Supports}/2`;
        }
        return isRu
          ? "ИДИ В ЦЕНТР: Ваши опоры готовы! Шагни в (0,0) и СТРОЙ до L3!"
          : "MOVE TO CENTER: Supports ready! Step in Center (0,0) and BUILD to L3!";
      }

      const l2Supports = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 2).length;
      if (h00 === 1) {
        if (l2Supports < 2) {
          return isRu
            ? `СТРОЙ ОПОРЫ L2: Чтобы поднять Центр до L2, нужно минимум 2 опорных гекса на уровне L2 вокруг! Готово: ${l2Supports}/2`
            : `BUILD L2 SUPPORTS: Need at least 2 neighboring hexes at L2 to upgrade the Center! Ready: ${l2Supports}/2`;
        }
        return isRu
          ? "ИДИ В ЦЕНТР: Опоры готовы. Шагни на (0,0) и СТРОЙ до L2."
          : "MOVE TO CENTER: Supports ready. Step to (0,0) and BUILD to L2.";
      }

      const l1Supports = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 1).length;
      if (l1Supports < 2) {
        return isRu
          ? `СТРОЙ ФУНДАМЕНТ: Улучши любые 2 соседние плиты до L1, чтобы затем поднять Центр. Готово: ${l1Supports}/2`
          : `BUILD FOUNDATION: Upgrade any 2 neighbors to L1 to unlock the Center build. Progress: ${l1Supports}/2`;
      }
      return isRu
        ? "ИДИ В ЦЕНТР: Фундамент заложен! Шагни на (0,0) и СТРОЙ до L1."
        : "MOVE TO CENTER: Foundation set! Step to (0,0) and BUILD to L1.";
    },
    hooks: {
      checkWinCondition: (state) => {
        return (state.grid['0,0']?.currentLevel ?? 0) >= 3;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.5: Потоки Энергии
  {
    id: '1.5',
    title: 'Sim 1.5: Потоки Энергии',
    description: 'Научитесь собирать энергию с реакторов и накопите необходимые кредиты.',
    goalText: 'Накопите требуемые кредиты',
    mapConfig: {
      size: 3,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 4, maxLevel: 4, revealed: true, ownerId: 'player-1' }, // Реактор L4
        { q: 1, r: -1, currentLevel: 3, maxLevel: 3, revealed: true }, // Буферная L3
        { q: -1, r: 1, currentLevel: 3, maxLevel: 3, revealed: true }, // Буферная L3
        { q: 2, r: -2, currentLevel: 2, maxLevel: 2, revealed: true }, // Спуск L2
        { q: -2, r: 2, currentLevel: 2, maxLevel: 2, revealed: true }, // Спуск L2
        // Symmetric wings
        { q: 1, r: 0, currentLevel: 3, maxLevel: 3, revealed: true },
        { q: -1, r: 0, currentLevel: 3, maxLevel: 3, revealed: true },
        { q: 0, r: -1, currentLevel: 3, maxLevel: 3, revealed: true },
        { q: 0, r: 1, currentLevel: 3, maxLevel: 3, revealed: true },
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 4, label: 'Reactor L4', color: 'cyan' },
    ],
    startState: { credits: 0, moves: 30, rank: 4, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if ((state.player.coins ?? 0) >= 100) {
        return isRu ? "ПОБЕДА: Вы накопили 100 кредитов!" : "VICTORY: You accumulated 100 credits!";
      }
      return isRu
        ? "ВОССТАНОВЛЕНИЕ: Встаньте на реактор L4 в центре (0,0) и нажмите кнопку RECOVER (Синяя) 3 раза, чтобы снять энергию!"
        : "RECOVERY: Stand on the L4 reactor at (0,0) and click RECOVER (Blue button) 3 times to drain energy!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return (state.player.coins ?? 0) >= 100;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.6: Крах и Регенерация
  {
    id: '1.6',
    title: 'Sim 1.6: Крах и Регенерация',
    description: 'Заделайте пространственный разлом Ядром Реальности и выкопайте глубокую устойчивую шахту.',
    goalText: 'Заделайте разлом и углубите шахту в центре до -2',
    mapConfig: {
      size: 3,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, ownerId: 'player-1' }, // Center
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, revealed: true, structureType: 'VOID' }, // Rift to heal
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true }, // Neighbor 1
        { q: -1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true }, // Neighbor 2
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, revealed: true }, // Neighbor 3
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true }, // Neighbor 4
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, revealed: true }, // Neighbor 5
        
        // --- EXPANDED PLATFORM ---
        { q: 2, r: -2, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 2, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 2, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 1, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: 2, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -1, r: 2, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -2, r: 2, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -2, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -2, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -1, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: -2, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 1, r: -2, currentLevel: 0, maxLevel: 0, revealed: true },

        // --- COSMIC BOUNDARY FLOATING LOOK ---
        { q: 3, r: -3, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 3, r: -2, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 3, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 3, r: 0, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 2, r: 1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 1, r: 2, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 0, r: 3, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -1, r: 3, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -2, r: 3, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -3, r: 3, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -3, r: 2, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -3, r: 1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -3, r: 0, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -2, r: -1, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: -1, r: -2, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 0, r: -3, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 1, r: -3, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false },
        { q: 2, r: -3, currentLevel: -4, maxLevel: -4, revealed: true, isPassable: false }
      ]
    },
    objectiveHexes: [
      { q: 1, r: -1, targetLevel: 0, label: 'Heal', color: 'rose' },
      { q: 0, r: 0, targetLevel: -2, label: 'Deep Mine', color: 'emerald' },
    ],
    startState: {
      credits: 0,
      moves: 30,
      rank: 2,
      materials: 0,
      initialEntropy: 100,
      startInventory: ['reality_patch']
    },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const voidHex = state.grid['1,-1'];
      const centerHex = state.grid['0,0'];
      const hasPatch = state.player.inventory.some(i => i.baseId === 'reality_patch');

      if ((centerHex?.currentLevel ?? 0) <= -2 && voidHex?.structureType !== 'VOID') {
        return isRu ? "ПОБЕДА: Аномалия полностью запечатана!" : "VICTORY: Rift successfully resolved!";
      }

      if (voidHex && voidHex.structureType === 'VOID') {
        if (hasPatch) {
          return isRu
            ? "ПРИМЕНИ ЛОСКУТ: Открой ИНВЕНТАРЬ и используй Лоскут Реальности на VOID (1,-1)!"
            : "USE PATCH: Open INVENTORY and apply Reality Patch on VOID (1,-1)!";
        } else {
          return isRu
            ? "ОШИБКА: Лоскут потерян. Начните уровень заново."
            : "ERROR: Reality Patch lost. Please restart level.";
        }
      }

      const minedNeighbors = [state.grid['1,-1'], state.grid['0,1'], state.grid['-1,0'], state.grid['0,-1'], state.grid['1,0'], state.grid['-1,1']].filter(h => h && h.currentLevel <= -1).length;
      if (minedNeighbors < 2) {
        return isRu
          ? `УКРЕПИ ШАХТУ: Опусти как минимум 2 соседних гекса до уровня L-1 или ниже для поддержки! Готово: ${minedNeighbors}/2`
          : `STRENGTHEN MINE: Dig at least 2 neighboring hexes down to L-1 or lower to avoid collapse! Progress: ${minedNeighbors}/2`;
      }

      return isRu
        ? "БУРИ ЦЕНТР: Контур готов! Шагни в Центр (0,0) и КОПАЙ его дважды до глубины L-2!"
        : "DRILL CENTER: Support ready! Step to Center (0,0) and DIG it twice down to depth L-2!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return (state.grid['0,0']?.currentLevel ?? 0) <= -2 && state.grid['1,-1']?.structureType !== 'VOID';
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        const voidHex = state.grid['1,-1'];
        
        // Initial Message
        if (turn === 1 && !(state as any)._init15) {
          (state as any)._init15 = true;
          state.messageLog.unshift({
            id: `msg-15-init-${Date.now()}`,
            text: isRu 
              ? 'ИНЖЕНЕРНАЯ СЛУЖБА: Космический сектор поврежден! Рядом на (1,-1) находится разлом (VOID). Откройте инвентарь и используйте Reality Patch (Лоскут реальности) на этот гекс. Чтобы выкопать центр шахты (0,0) до L-2, сначала углубите 2 любых соседних гекса.'
              : 'ENGINEERING DEPT: Ruptured sector detected! A spatial rift (VOID) is next to you at (1,-1). Open inventory and apply Reality Patch to heal it. To drill the center (0,0) to L-2, you must first lower 2 neighbor hexes.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // When void gets healed
        if (voidHex && voidHex.structureType !== 'VOID' && !(state as any)._healed15) {
          (state as any)._healed15 = true;
          state.messageLog.unshift({
            id: `msg-15-healed-${Date.now()}`,
            text: isRu
              ? 'ОТЧЕТ ДАТЧИКОВ: Разлом на (1,-1) запечатан! Поле стабильно. Займитесь шахтой: опустите 2 соседние плиты до L-1 для поддержки кратера, затем прокопайте центр до L-2.'
              : 'SENSOR REPORT: Rift at (1,-1) sealed! Field stable. Focus on the mine: lower 2 neighboring plates to L-1 to support the crater, then drill the center to L-2.',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        // Track neighbor support levels
        const minedNeighbors = [state.grid['1,-1'], state.grid['0,1'], state.grid['-1,0'], state.grid['0,-1'], state.grid['1,0'], state.grid['-1,1']].filter(h => h && h.currentLevel <= -1).length;
        if (minedNeighbors === 1 && !(state as any)._mineSupport1) {
          (state as any)._mineSupport1 = true;
          state.messageLog.unshift({
            id: `msg-15-sup1-${Date.now()}`,
            text: isRu
              ? 'ИНСТРУКЦИЯ: 1 опорная плита готова. Чтобы копать центр глубже L-1, требуется подготовить еще как минимум 1 соседа!'
              : 'GUIDELINE: 1 support plate prepared. To dig center below L-1, you need at least 1 more neighbor prepared!',
            type: 'INFO',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }
        
        if (minedNeighbors >= 2 && !(state as any)._mineSupport2) {
          (state as any)._mineSupport2 = true;
          state.messageLog.unshift({
            id: `msg-15-sup2-${Date.now()}`,
            text: isRu
              ? 'БЕЗОПАСНОСТЬ: Опорных плит подготовлено: ' + minedNeighbors + '. Контур поддержки стабилен! Шагните в Центр (0,0) и бурите его до L-2.'
              : 'SAFETY: Support plates ready: ' + minedNeighbors + '. Support contour stable! Step to Center (0,0) and drill down to L-2.',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // 1.7: Три Столпа Реальности
  {
    id: '1.7',
    title: 'Sim 1.7: Три Столпа Реальности',
    description: 'Доберитесь до 3-го столпа, добывая Лоскуты Реальности на глубине -2 и восстанавливая Бездны.',
    goalText: 'Доберитесь до Столицы на 3-м столпе',
    mapConfig: {
      size: 6,
      type: 'fixed',
      customLayout: [
        // --- PILLAR 1 (Center at 0,0) ---
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, ownerId: 'player-1' },
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },

        // --- GAP 1 ---
        { q: 2, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, structureType: 'VOID' },

        // --- PILLAR 2 (Center at 4,0) ---
        { q: 4, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 5, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 5, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 4, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 3, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 3, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 4, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },

        // --- GAP 2 ---
        { q: 6, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, structureType: 'VOID' },

        // --- PILLAR 3 (Center/Capital at 8,0) ---
        { q: 8, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, structureType: 'CAPITAL' },
        { q: 9, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 9, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 8, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 7, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 7, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 8, r: -1, currentLevel: 0, maxLevel: 0, revealed: true }
      ]
    },
    objectiveHexes: [
      { q: 8, r: 0, targetLevel: 0, label: 'Capital', color: 'emerald' }
    ],
    startState: {
      credits: 30,
      moves: 50,
      rank: 2,
      materials: 0,
      initialEntropy: 100,
      startInventory: []
    },
    secretLootHexes: [
      { q: 0, r: 0, level: -2, itemBaseId: 'reality_patch' },
      { q: 0, r: 1, level: -2, itemBaseId: 'reality_patch' },
      { q: -1, r: 0, level: -2, itemBaseId: 'reality_patch' },
      { q: 4, r: 0, level: -2, itemBaseId: 'reality_patch' },
      { q: 4, r: 1, level: -2, itemBaseId: 'reality_patch' },
      { q: 3, r: 0, level: -2, itemBaseId: 'reality_patch' }
    ],
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const player = state.player;
      const grid = state.grid;

      const hasReachedDestination = (player.q === 8 && player.r === 0);
      if (hasReachedDestination) {
        return isRu ? "ПОБЕДА: Вы благополучно добрались до Столицы!" : "VICTORY: You successfully reached the Capital!";
      }

      const void1Healed = grid['2,0']?.structureType !== 'VOID';
      const void2Healed = grid['6,0']?.structureType !== 'VOID';
      const hasPatch = player.inventory.some(i => i.baseId === 'reality_patch');

      if (!void1Healed) {
        if (hasPatch) {
          return isRu
            ? "ПРИМЕНИ ЛОСКУТ: Иди на край (1,0), открой ИНВЕНТАРЬ и примени Лоскут на Бездну (2,0)!"
            : "USE PATCH: Move to edge (1,0), open INVENTORY and apply Patch on VOID (2,0)!";
        } else {
          return isRu
            ? "КОПАЙ: Встань на Центр 1-го столпа (0,0) и КОПАЙ его дважды до глубины L-2, чтобы извлечь скрытый Лоскут!"
            : "DIG: Stand on Pillar 1 Center (0,0) and DIG it down twice to L-2 to find the hidden Patch!";
        }
      }

      if (!void2Healed) {
        if (hasPatch) {
          return isRu
            ? "ПРИМЕНИ ЛОСКУТ: Иди на край (5,0), открой ИНВЕНТАРЬ и примени Лоскут на Бездну (6,0)!"
            : "USE PATCH: Move to edge (5,0), open INVENTORY and apply Patch on VOID (6,0)!";
        } else {
          return isRu
            ? "КОПАЙ: Встань на Центр 2-го столпа (4,0) и КОПАЙ его дважды до глубины L-2, чтобы добыть второй Лоскут!"
            : "DIG: Move to Pillar 2 Center (4,0) and DIG it down twice to L-2 to harvest the second Patch!";
        }
      }

      return isRu
        ? "ИДИ НА УКАЗАТЕЛЬ: Иди на 3-й столп и встань на Столицу (8,0) для триумфа!"
        : "MOVE TO TARGET: Cross to Pillar 3 and step on the Capital (8,0) to triumph!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.player.q === 8 && state.player.r === 0;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        const grid = state.grid;
        
        // Initial Message
        if (turn === 1 && !(state as any)._init16) {
          (state as any)._init16 = true;
          state.messageLog.unshift({
            id: `msg-16-init-${Date.now()}`,
            text: isRu 
              ? 'ИНЖЕНЕРНАЯ СЛУЖБА: Вы на первом из 3 столпов. Чтобы добраться до Столицы (8,0), залатайте Бездны на (2,0) и (6,0). Раскопайте центр текущего столпа (0,0) до глубины L-2, чтобы извлечь Лоскут Реальности!'
              : 'ENGINEERING DEPT: You are on the first of 3 pillars. To reach the Capital (8,0), patch the Voids at (2,0) and (6,0). Dig the center of this pillar (0,0) down to L-2 to extract a Reality Patch!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        const p1CenterLevel = grid['0,0']?.currentLevel ?? 0;
        const p2CenterLevel = grid['4,0']?.currentLevel ?? 0;
        const void1Healed = grid['2,0']?.structureType !== 'VOID';
        const void2Healed = grid['6,0']?.structureType !== 'VOID';

        // Mined Pillar 1 Center
        if (p1CenterLevel <= -2 && !void1Healed && !(state as any)._p1Mined) {
          (state as any)._p1Mined = true;
          state.messageLog.unshift({
            id: `msg-16-p1mined-${Date.now()}`,
            text: isRu
              ? 'СЕНСОРЫ: Обнаружен Лоскут Реальности! Теперь идите на край столпа (1,0) и примените его через инвентарь на Бездну (2,0).'
              : 'SENSORS: Reality Patch detected! Now move to the pillar edge (1,0) and apply it via inventory to the VOID (2,0).',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        // Void 1 Healed
        if (void1Healed && !(state as any)._void1HealedMsg) {
          (state as any)._void1HealedMsg = true;
          state.messageLog.unshift({
            id: `msg-16-v1healed-${Date.now()}`,
            text: isRu
              ? 'ИНЖЕНЕР: Первый мост стабилизирован! Переходите на второй столп. Копайте его центр (4,0) до L-2, чтобы извлечь второй Лоскут.'
              : 'ENGINEER: First bridge stabilized! Cross to the second pillar. Dig its center (4,0) down to L-2 to extract the second Patch.',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        // Mined Pillar 2 Center
        if (p2CenterLevel <= -2 && void1Healed && !void2Healed && !(state as any)._p2Mined) {
          (state as any)._p2Mined = true;
          state.messageLog.unshift({
            id: `msg-16-p2mined-${Date.now()}`,
            text: isRu
              ? 'ДАТЧИКИ: Второй Лоскут извлечен! Перемещайтесь на правый край столпа (5,0) и заделайте Бездну (6,0).'
              : 'DETECTORS: Second Patch extracted! Move to the eastern edge of the pillar (5,0) and seal the VOID (6,0).',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        // Void 2 Healed
        if (void2Healed && !(state as any)._void2HealedMsg) {
          (state as any)._void2HealedMsg = true;
          state.messageLog.unshift({
            id: `msg-16-v2healed-${Date.now()}`,
            text: isRu
              ? 'ТЕЛЕМЕТРИЯ: Финальный проход зафиксирован! Путь к Столице открыт. Доберитесь до (8,0) для триумфального финала!'
              : 'TELEMETRY: Final passage established! Path to Capital is clear. Proceed to (8,0) for a triumphant victory!',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // 1.8: Финал: Линия Суши
  {
    id: '1.8',
    title: 'Sim 1.8: Финал: Линия Суши',
    description: 'Примените все полученные инженерные навыки и постройте линию блоков равной высоты.',
    goalText: 'Выстройте линию плит высокого уровня',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: -1, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Точка старта L1
        { q: 0, r: 0, currentLevel: 1, maxLevel: 1, revealed: true }, // Центр L1
        { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true }, // Ступень L1
        // Вспомогательные боковые плиты для быстрого наращивания опор!
        { q: 1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true }, // Опора для (0,1)
      ]
    },
    objectiveHexes: [
      { q: 0, r: -1, targetLevel: 2, label: 'L2', color: 'amber' },
      { q: 0, r: 0, targetLevel: 2, label: 'L2', color: 'amber' },
      { q: 0, r: 1, targetLevel: 2, label: 'L2', color: 'amber' },
    ],
    startState: { credits: 0, moves: 30, rank: 2, materials: 6, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const key1 = '0,-1';
      const key2 = '0,0';
      const key3 = '0,1';
      const l1 = state.grid[key1]?.currentLevel ?? 0;
      const l2 = state.grid[key2]?.currentLevel ?? 0;
      const l3 = state.grid[key3]?.currentLevel ?? 0;
      
      const ready = (l1 >= 2 && l2 >= 2 && l3 >= 2);
      if (ready) {
        return isRu ? "ПОБЕДА: Выстроена успешная линия L2!" : "VICTORY: Perfect L2 cascade sequence complete!";
      }
      
      const supports = ['1,-1', '-1,0', '1,0'].filter(k => (state.grid[k]?.currentLevel ?? 0) >= 2).length;
      if (supports < 3) {
           return isRu
            ? `СТРОЙ: Улучши боковые плиты до L2, чтобы использовать их как опоры. Готово: ${supports}/3`
            : `BUILD: Upgrade side plates to L2 to use them as supports. Progress: ${supports}/3`;
      }

      return isRu
        ? `СТРОЙ ЦЕЛЕВЫЕ: Улучши целевую линию из трех центральных гексов до уровня L2! Статус: ${l1}/2, ${l2}/2, ${l3}/2`
        : `BUILD CORES: Raise the central target line blocks to L2! Current: ${l1}/2, ${l2}/2, ${l3}/2`;
    },
    hooks: {
      checkWinCondition: (state) => {
        const l1 = state.grid['0,-1']?.currentLevel ?? 0;
        const l2 = state.grid['0,0']?.currentLevel ?? 0;
        const l3 = state.grid['0,1']?.currentLevel ?? 0;
        return l1 >= 2 && l2 >= 2 && l3 >= 2;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.9: Инженерный Ранг
  {
    id: '1.9',
    title: 'Sim 1.9: Инженерный Ранг',
    description: 'Ознакомьтесь с ограничениями инженерного ранга. Добудьте наниты и повысьте свой Ранг до 2, улучшив плиту до L2.',
    goalText: 'Повысьте Ранг до 2 (Постройте L2 плиту)',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Start
        { q: 1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: -1, currentLevel: 1, maxLevel: 1, revealed: true }
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 2, label: 'Target L2', color: 'amber' }
    ],
    startState: { credits: 0, moves: 25, rank: 1, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const playerLevel = state.player.playerLevel;
      if (playerLevel >= 2) {
        return isRu ? "ПОБЕДА: Вы получили Инженерный Ранг 2!" : "VICTORY: You attained Engineering Rank 2!";
      }

      if (state.player.storage === 0) {
        return isRu
          ? "КОПАЙ: У вас 0 материалов! Нажмите КОПАТЬ на соседней L1 плите, чтобы срыть её до L0 и получить +1 материал!"
          : "DIG: You have 0 materials! Press DIG on a neighboring L1 plate to lower it to L0 and gather +1 material!";
      }

      return isRu
        ? "СТРОЙ: Теперь встаньте в Центр (0,0) и улучшите его до уровня L2! (Для апгрейда до L2 нужен Ранг 1, который у вас уже есть)."
        : "BUILD: Now stand in the Center (0,0) and upgrade it to Level 2! (Requires Rank 1, which you already have).";
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.player.playerLevel >= 2;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-19-start-${Date.now()}`,
            text: isRu
              ? 'РУКОВОДСТВО: Добро пожаловать в Симуляцию 1.9. У вас Ранг 1 и 0 материалов. Чтобы выполнить апгрейд плиты до L2, сначала добудьте 1 материал, раскопав (DIG) соседнюю сухую плиту!'
              : 'GUIDE: Welcome to Simulation 1.9. You have Rank 1 and 0 materials. To upgrade a plate to L2, first gather 1 material by digging (DIG) a neighboring dry tile!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // 1.10: Слияние Лимитов
  {
    id: '1.10',
    title: 'Sim 1.10: Слияние Лимитов',
    description: 'Выпускной экзамен первой серии. Добудьте ресурсы, постройте уступы и соберите 50 Кредитов, возведя плиту уровня L3.',
    goalText: 'Достигните Ранга 3 и соберите 50 Кредитов',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Center
        { q: 1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: -1, currentLevel: 1, maxLevel: 1, revealed: true }
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Core L3', color: 'emerald' }
    ],
    startState: { credits: 0, moves: 30, rank: 1, materials: 2, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const playerLevel = state.player.playerLevel;
      const coins = state.player.coins;

      if (playerLevel >= 3 && coins >= 50) {
        return isRu ? "ПОБЕДА: Выпускной экзамен сдан!" : "VICTORY: Graduation exam passed successfully!";
      }

      if (playerLevel < 2) {
        return isRu
          ? "СТРОЙ L2: Сначала поднимите Центр (0,0) до L2, чтобы получить Ранг 2."
          : "BUILD L2: First, upgrade the Center (0,0) to Level 2 to attain Rank 2.";
      }

      if (playerLevel < 3) {
        const centerNeighbors = ['1,-1', '1,0', '0,1', '-1,1', '-1,0', '0,-1'];
        const l2Supports = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 2).length;
        if (l2Supports < 2) {
          return isRu
            ? `СТРОЙ ОПОРЫ L2: Чтобы поднять Центр до L3, вам нужно построить как минимум 2 соседних гекса до L2! Готово: ${l2Supports}/2. Бурите гексы L1, если нужны материалы.`
            : `BUILD L2 SUPPORTS: To raise Center to L3, you must upgrade at least 2 neighboring hexes to L2! Ready: ${l2Supports}/2. Dig L1 plates if materials are needed.`;
        }
        return isRu
          ? "СТРОЙ L3: Опоры готовы! Шагайте в Центр (0,0) и поднимите его до L3, чтобы получить Ранг 3!"
          : "BUILD L3: Supports ready! Step to the Center (0,0) and raise it to L3 to reach Rank 3!";
      }

      if (coins < 50) {
        return isRu
          ? `РЕАКТОР И СЪЕМ: Ваш ранг равен 3! Теперь используйте синюю кнопку RECOVER на плите L3, чтобы снять термо-кредиты! Нужно: ${coins}/50.`
          : `REACTOR RECOVERY: Your rank is 3! Now click RECOVER (Blue button) on your L3 plate to drain thermo-credits! Progress: ${coins}/50.`;
      }

      return isRu ? "ПОЗДРАВЛЯЕМ: Условия выполнены!" : "CONGRATULATIONS: Objectives completed!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.player.playerLevel >= 3 && state.player.coins >= 50;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-110-start-${Date.now()}`,
            text: isRu
              ? 'ЭКЗАМЕНАТОР: Это ультимативный тест первой серии. Вам нужно достичь Ранга 3 (построив плиту L3) и накопить 50 Кредитов, восстанавливая энергию с неё.'
              : 'EXAMINER: This is the ultimate test of Series 1. You must attain Rank 3 (by building an L3 plate) and gather 50 Credits by recovering energy from it.',
            type: 'SUCCESS',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  }
];
