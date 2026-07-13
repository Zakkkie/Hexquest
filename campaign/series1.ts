import { LevelConfig } from '../types';
import { isStranded } from './utils';

export const series1Levels: LevelConfig[] = [
  // 1.0: Basic Level & Height Snail (Merged)
  {
    id: '1.0',
    title: 'Sim 1.0: Инициация и Вертикаль',
    description: 'БАЗОВЫЙ ПРОТОКОЛ. Изучите основы навигации в многоуровневом пространстве. Овладейте терраформингом (Строительство и Бурение), чтобы преодолеть спиральную аномалию и достичь Портала.',
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
            ? "КОПАЙ: Впереди обрыв. Опусти свою платформу до L1, чтобы безопасно спрыгнуть." 
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

  // 1.1: Сбор Материалов / Excavation & Materials
  {
    id: '1.1',
    title: 'Sim 1.1: Сбор Материалов',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. СБОР РЕСУРСОВ. Локация нестабильна. Добывайте строительные материалы (ОД), избегая обрушения хрупких платформ, чтобы проложить безопасный маршрут к Столице. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    goalText: 'Доберитесь до Столицы',
    mapConfig: {
      size: 4,
      type: 'fixed',
      customLayout: [
        { q: 1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Start peak
        { q: 0, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 }, // Fork 1
        { q: -1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 }, // Fork 2

        // --- FRAGILE CENTER (Cracked tiles) ---
        { q: -2, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -3, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -4, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -5, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -6, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -7, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },

        // --- SAFE SOUTH ---
        { q: -1, r: 1, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -2, r: 1, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -3, r: 1, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -4, r: 2, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -5, r: 2, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -6, r: 2, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },
        { q: -7, r: 1, currentLevel: 1, maxLevel: 1, revealed: true, durability: 1 },

        // --- NORTHERN RIDGE ---
        { q: 0, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -2, r: -1, currentLevel: 2, maxLevel: 2, revealed: true },
        { q: -3, r: -1, currentLevel: 2, maxLevel: 2, revealed: true },
        { q: -4, r: -1, currentLevel: 3, maxLevel: 3, revealed: true }, // L3 Ridge target
        { q: -5, r: -1, currentLevel: 2, maxLevel: 2, revealed: true },
        { q: -6, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -7, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },

        // --- CAPITAL (Destination) ---
        { q: -8, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, structureType: 'CAPITAL' }
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 1, label: 'Path', color: 'cyan' },
      { q: -1, r: 0, targetLevel: 1, label: 'Path', color: 'cyan' },
      { q: -2, r: 0, targetLevel: 1, label: 'Path', color: 'cyan' },
      { q: -3, r: 0, targetLevel: 1, label: 'Path', color: 'cyan' },
      { q: -4, r: -1, targetLevel: 3, label: 'L3 Ridge', color: 'amber' },
      { q: -8, r: 0, targetLevel: 1, label: 'Capital', color: 'emerald' },
    ],
    startState: { credits: 0, moves: 40, rank: 7, materials: 0, initialEntropy: 100 },
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
          ? "КОПАЙ: Срежь вершину под собой до L1, чтобы сэкономить силы(ОД) для движения!"
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

  // 1.2: Замок Градиента / High Ground Gradient Lock
  {
    id: '1.2',
    title: 'Sim 1.2: Замок Градиента',
    description: 'ПРОТОКОЛ ВЫРАВНИВАНИЯ. Центральный сектор опасно возвышен. Используйте бурение для поэтапного снижения высоты до базового уровня, не нарушая геологический баланс.',
    goalText: 'Срежьте центральный сектор до базового уровня',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 2, maxLevel: 2, revealed: true }, // Center
        
        // Inner Ring (L1) - Symmetrical base
        { q: 1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Starting hex
        { q: 1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },

        // Outer Ring - Star-spokes of height 0 (stable base)
        { q: 0, r: -2, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: 2, r: -2, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: 2, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: 0, r: 2, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: -2, r: 2, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },
        { q: -2, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, isPassable: true },

        // Outer Ring - Dark abyssal boundary rifts (depth -4) separating the star tips
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

  // 1.3: Съем энергии и Реакторы / Recovery Energy & Reactors
  {
    id: '1.3',
    title: 'Sim 1.3: Потоки Энергии',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Научитесь собирать энергию с реакторов и накопите необходимые кредиты. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    goalText: 'Накопите требуемые кредиты',
    mapConfig: {
      size: 3,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Reactor L1
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, revealed: true }, // Buffer L0
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, revealed: true }, // Buffer L0
        { q: 2, r: -2, currentLevel: -1, maxLevel: -1, revealed: true }, // Slide L-1
        { q: -2, r: 2, currentLevel: -1, maxLevel: -1, revealed: true }, // Slide L-1
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 2, r: 0, currentLevel: -1, maxLevel: -1, revealed: true },
        { q: -2, r: 0, currentLevel: -1, maxLevel: -1, revealed: true },
        { q: 0, r: -2, currentLevel: -1, maxLevel: -1, revealed: true },
        { q: 0, r: 2, currentLevel: -1, maxLevel: -1, revealed: true },
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 1, label: 'Reactor', color: 'blue' },
      { q: 1, r: -1, targetLevel: 0, label: 'L0', color: 'blue' },
      { q: -1, r: 1, targetLevel: 0, label: 'L0', color: 'blue' },
      { q: 2, r: -2, targetLevel: -1, label: 'L-1', color: 'blue' },
      { q: -2, r: 2, targetLevel: -1, label: 'L-1', color: 'blue' },
    ],
    startState: { credits: 0, moves: 12, rank: 1, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const credits = state.player.coins;
      const reactor = state.grid['0,0'];
      
      if (credits >= 15) {
        return isRu ? "ПОБЕДА: Лимит набран!" : "VICTORY: Quota satisfied!";
      }
      
      if (state.player.q === 0 && state.player.r === 0) {
        if (reactor?.recoveryCharges && reactor.recoveryCharges > 0) {
          return isRu
            ? `СБОР ЭНЕРГИИ: Жми ВОССТАНОВИТЬ (Синяя кнопка) 3 раза! Заряды: ${reactor.recoveryCharges}/3`
            : `RECOVER: Press RECOVER (Blue button) 3 times! Charges: ${reactor.recoveryCharges}/3`;
        }
        return isRu
          ? "ИДИ НА УКАЗАТЕЛЬ: Реактор остывает! Покинь Центр и сними энергию на плитах ниже!"
          : "MOVE: Reactor cooling down! Descend to buffer plates for recovery!";
      }
      
      return isRu
        ? "СБОР ЭНЕРГИИ: Жми ВОССТАНОВИТЬ, затем иди на следующий гекс!"
        : "RECOVER: Press RECOVER, then move to the next hex!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.player.coins >= 15;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.4: Архитектура Опор / Support Architecture
  {
    id: '1.4',
    title: 'Sim 1.4: Архитектура Опор',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Плотина высокого уровня требует крепкой конструкции. Постройте многоуровневый каскад поддерживающих плит, чтобы возвести башню L3. Следуйте указаниям навигационного модуля и берегите ресурсы.',
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
        // Radius 2 Ring
        { q: 0, r: -2, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 1, r: -2, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 2, r: -2, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 2, r: -1, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 2, r: 0, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 1, r: 1, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: 0, r: 2, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: -1, r: 2, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: -2, r: 2, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: -2, r: 1, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: -2, r: 0, currentLevel: 0, maxLevel: 3, revealed: true },
        { q: -1, r: -1, currentLevel: 0, maxLevel: 3, revealed: true },
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Goal L3', color: 'emerald' },
    ],
    startState: { credits: 0, moves: 80, rank: 3, materials: 30, initialEntropy: 100 },
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
      const l2SupportsForL3 = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 2).length;
      
      if (h00 === 2) {
        if (l2SupportsForL3 < 2) {
          return isRu
            ? `СТРОЙ БАШНИ L3: Чтобы поднять Центр до L3, нужно возвести 2 соседние плиты до высоты L2! Готово: ${l2SupportsForL3}/2`
            : `BUILD L3 TOWERS: Upgrade 2 neighboring tiles to height L2 to unlock the Center! Progress: ${l2SupportsForL3}/2`;
        }
        return isRu
          ? "ИДИ В ЦЕНТР: Ваши опоры готовы! Шагни в (0,0) и СТРОЙ до L3!"
          : "MOVE TO CENTER: Supports ready! Step in Center (0,0) and BUILD to L3!";
      }

      const l1SupportsForL2 = centerNeighbors.filter(key => (state.grid[key]?.currentLevel ?? 0) >= 1).length;
      if (h00 === 1) {
        if (l1SupportsForL2 < 2) {
          return isRu
            ? `СТРОЙ ОПОРЫ L2: Чтобы поднять Центр до L2, нужно минимум 2 опорных гекса на уровне L1 вокруг! Готово: ${l1SupportsForL2}/2`
            : `BUILD L2 SUPPORTS: Need at least 2 neighboring hexes at L1 to upgrade the Center! Ready: ${l1SupportsForL2}/2`;
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

  // 1.5: Крах и Регенерация / Collapse & Regeneration
  {
    id: '1.5',
    title: 'Sim 1.5: Крах и Регенерация',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Заделайте пространственный разлом Ядром Реальности и выкопайте глубокую устойчивую шахту. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    goalText: 'Заделайте разлом и углубите шахту в центре до -2',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, ownerId: 'player-1' }, // Center
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, revealed: true, structureType: 'VOID' }, // Rift
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true }, // Mine gate neighbor
        { q: -1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
      ]
    },
    objectiveHexes: [
      { q: 1, r: -1, targetLevel: 0, label: 'Heal', color: 'rose' },
      { q: 0, r: 0, targetLevel: -2, label: 'Deep Mine', color: 'emerald' },
    ],
    creepingVoid: {
      sourceQ: 1,
      sourceR: -1,
      intervalMs: 75000
    },
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
        return isRu ? "ПОБЕДА: Аномалия устранена!" : "VICTORY: Rift resolved!";
      }

      if (voidHex && voidHex.structureType === 'VOID') {
        if (hasPatch) {
          return isRu
            ? "ПРИМЕНИ ЛОСКУТ: Открой ИНВЕНТАРЬ и примени Лоскут Реальности на VOID (1,-1)!"
            : "USE PATCH: Open INVENTORY and apply Reality Patch on VOID (1,-1)!";
        } else {
          return isRu
            ? "ПРОВАЛ: Лоскут потерян."
            : "FAIL: Patch lost.";
        }
      }

      const minedNeighbors = [state.grid['1,-1'], state.grid['0,1']].filter(h => h && h.currentLevel <= -1).length;
      if (minedNeighbors < 2) {
        return isRu
          ? `КОПАЙ: Углуби двух соседей (1,-1) и (0,1) на высоту L-1 для поддержки! Готово: ${minedNeighbors}/2`
          : `DIG: Lower two neighbors (1,-1) and (0,1) down to L-1 for support! Progress: ${minedNeighbors}/2`;
      }

      return isRu
        ? "КОПАЙ: Теперь иди в Центр (0,0) и КОПАЙ его дважды до глубины L-2!"
        : "DIG: Now step to the Center (0,0) and DIG it twice down to depth L-2!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return (state.grid['0,0']?.currentLevel ?? 0) <= -2 && state.grid['1,-1']?.structureType !== 'VOID';
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.6: Три Столпа Реальности
  {
    id: '1.6',
    title: 'Sim 1.6: Три Столпа Реальности',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Доберитесь до 3-го столпа, добывая Лоскуты Реальности на глубине -2 и восстанавливая Бездны. Следуйте указаниям навигационного модуля и берегите ресурсы.',
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
        return isRu ? "Поздравляем! Вы добрались до Столицы на третьем столпе!" : "Congratulations! You reached the Capital on the third pillar!";
      }

      const void1Healed = grid['2,0']?.structureType !== 'VOID';
      const void2Healed = grid['6,0']?.structureType !== 'VOID';
      const hasPatch = player.inventory.some(i => i.baseId === 'reality_patch');

      if (!void1Healed) {
        if (hasPatch) {
          return isRu
            ? "ПРИМЕНИ ЛОСКУТ: Иди на край (1,0), открой ИНВЕНТАРЬ и примени Лоскут на VOID (2,0)!"
            : "USE PATCH: Move to edge (1,0), open INVENTORY and apply Patch on VOID (2,0)!";
        } else {
          return isRu
            ? "КОПАЙ: Встань на Центр 1-го столпа (0,0) и КОПАЙ его до уровня L-2, чтобы найти Лоскут!"
            : "DIG: Stand on Pillar 1 Center (0,0) and DIG to L-2 to find the Patch!";
        }
      }

      if (!void2Healed) {
        if (hasPatch) {
          return isRu
            ? "ПРИМЕНИ ЛОСКУТ: Иди на край (5,0), открой ИНВЕНТАРЬ и примени Лоскут на VOID (6,0)!"
            : "USE PATCH: Move to edge (5,0), open INVENTORY and apply Patch on VOID (6,0)!";
        } else {
          return isRu
            ? "КОПАЙ: Иди на Центр 2-го столпа (4,0) и КОПАЙ его до уровня L-2 за вторым Лоскутом!"
            : "DIG: Move to Pillar 2 Center (4,0) and DIG to L-2 for the second Patch!";
        }
      }

      return isRu
        ? "ИДИ НА УКАЗАТЕЛЬ: Иди на 3-й столп и встань на Столицу (8,0) для победы!"
        : "MOVE TO TARGET: Cross to Pillar 3 and reach Capital (8,0) to win!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.player.q === 8 && state.player.r === 0;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.7: Финал: Квантовый Пик L4
  {
    id: '1.7',
    title: 'Sim 1.7: Финал: Квантовый Пик L4',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Для возведения центрального гекса до уровня L4 требуется пирамидальное основание со строгим соблюдением правил боковой поддержки. Математический расчёт показывает, что минимально необходимая площадка составляет ровно 7 гексов (центральный гекс и 6 его непосредственных соседей, образующие плотный кластер радиуса 1). Для завершения строительства до уровня L4 потребуется совершить как минимум 16 улучшений плит (10 материалов даются на старте, а остальные можно восполнить с помощью добычи или энергообмена).',
    goalText: 'Возведите центральную плиту до уровня L4',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, ownerId: 'player-1' }, // Center starting point L0
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
        { q: -1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 4, label: 'L4', color: 'amber' },
    ],
    startState: { credits: 0, moves: 80, rank: 3, materials: 10, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const level = state.grid['0,0']?.currentLevel ?? 0;
      if (level >= 4) {
        return isRu ? "ПОБЕДА: Вы успешно возвели пик до L4!" : "VICTORY: Perfect L4 peak complete!";
      }
      return isRu
        ? `ПОСТРОЙ ПИК L4: Улучши центральный гекс (0,0) до уровня L4! Текущий уровень: L${level}. (Требуется 16 улучшений, 10 материалов дано на старте, добывайте новые материалы из соседних плит).`
        : `BUILD L4 PEAK: Upgrade the central hex (0,0) to Level L4! Current: L${level}. (Requires 16 upgrades, 10 materials provided on start, mine more materials from adjacent tiles).`;
    },
    hooks: {
      checkWinCondition: (state) => {
        const level = state.grid['0,0']?.currentLevel ?? 0;
        return level >= 4;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  }
];
