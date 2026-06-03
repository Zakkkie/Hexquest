import { LevelConfig } from '../types';
import { isStranded, generateBasicLevelGrid } from './utils';

export const series1Levels: LevelConfig[] = [
  // 1.0: Basic Level
  {
    id: '1.0',
    title: 'Sim 1.0: Basic Level',
    description: 'Обучающий уровень базовых механик.\nДобро пожаловать в HexQuest Economy. Цель: доберитесь до Столицы (5,0).',
    goalText: 'Reach the Capital (5,0)',
    mapConfig: {
      size: 5,
      type: 'fixed',
      customLayout: generateBasicLevelGrid()
    },
    objectiveHexes: [
      { q: 5, r: 0, targetLevel: 1, label: 'Capital', color: 'emerald' }
    ],
    startState: { credits: 0, moves: 50, rank: 5, materials: 5, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const player = state.player;
      const grid = state.grid;
      
      if (player.q === 5 && player.r === 0) {
        return isRu ? "Победа! Вы достигли Столицы." : "Victory! You have reached the Capital.";
      }
      
      if (player.q === 0 && player.r === 0) {
        return isRu ? "ДВИЖЕНИЕ: Нажмите на соседний свободный гекс, чтобы переместиться." : "MOVEMENT: Click an adjacent empty hex to step onto it.";
      }

      if (player.q === 1 && player.r === 0) {
          const currentHex = grid['1,0'];
          if (currentHex && currentHex.currentLevel === 0) {
              return isRu ? "ПОСТРОЙКА: Следующий гекс слишком высоко. Нажмите СТРОИТЬ, чтобы поднять текущий уровень." : "UPGRADES: The next hex is too high. Click UPGRADE to raise your current height.";
          }
          return isRu ? "ДВИЖЕНИЕ: Теперь вы можете сделать шаг на следующий уровень." : "MOVEMENT: You can now step onto the next level.";
      }

      if (player.q === 2 && player.r === 0) {
          return isRu ? "ОСМОТР: Используйте свайп или мышь для вращения камеры. Продолжайте путь." : "CAMERA: Swipe or drag to rotate camera. Continue your path.";
      }

      if (player.q === 3 && player.r === 0) {
          const currentHex = grid['3,0'];
          if (currentHex && currentHex.currentLevel === 2) {
              return isRu ? "РАСКОПКА: Склон слишком крутой. Нажмите КОПАТЬ, чтобы спустить уровень." : "DIGGING: The drop is too steep. Click DIG to lower your current height.";
          }
          return isRu ? "ДВИЖЕНИЕ: Идеально. Сделайте шаг вперёд к финишу." : "MOVEMENT: Perfect. Step forward towards the finish.";
      }

      if (player.q === 4 && player.r === 0) {
          return isRu ? "ФИНИШ: Сделайте последний шаг в Столицу!" : "FINISH: Take the final step into the Capital!";
      }
      
      return isRu 
        ? "Двигайтесь по координатам к Столице. Обращайте внимание на высоту!"
        : "Move along the path to the Capital. Pay attention to height changes!";
    },
    hooks: {
      checkWinCondition: (state) => state.player.q === 5 && state.player.r === 0,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // 1.1: Протокол Движения / Movement & Staircase Rule
  {
    id: '1.1',
    title: 'Sim 1.1: Пределы Высоты',
    description: 'Ограничение: 2 минуты. Поднимитесь по хребту и дойдите до портала!\nНельзя перемещаться, если разница высот больше 1 уровня.',
    goalText: 'Успей по указателям дойти вверх до портала',
    mapConfig: {
      size: 4,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, ownerId: 'player-1' },
        { q: 1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 2, r: -1, currentLevel: 2, maxLevel: 2, revealed: true },
        { q: 2, r: 0, currentLevel: 3, maxLevel: 3, revealed: true },
        { q: 1, r: 1, currentLevel: 4, maxLevel: 4, revealed: true },
        { q: 0, r: 2, currentLevel: 5, maxLevel: 5, revealed: true },
        { q: -1, r: 2, currentLevel: 6, maxLevel: 6, revealed: true },
        { q: -2, r: 2, currentLevel: 7, maxLevel: 7, revealed: true },
        { q: -3, r: 2, currentLevel: 8, maxLevel: 8, revealed: true },
        { q: -3, r: 1, currentLevel: 9, maxLevel: 9, revealed: true },
        { q: -2, r: 0, currentLevel: 10, maxLevel: 10, revealed: true, structureType: 'CAPITAL' }
      ]
    },
    objectiveHexes: [
      { q: 2, r: 0, targetLevel: 3, label: 'L3', color: 'amber' },
      { q: -1, r: 2, targetLevel: 6, label: 'L6', color: 'amber' },
      { q: -2, r: 0, targetLevel: 10, label: 'Portal', color: 'emerald' }
    ],
    startState: { credits: 0, moves: 120, rank: 10, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const player = state.player;
      const q = player.q;
      const r = player.r;
      
      const wavePath = [
        { q: 0, r: 0, lvl: 0 },
        { q: 1, r: -1, lvl: 1 },
        { q: 2, r: -1, lvl: 2 },
        { q: 2, r: 0, lvl: 3 },
        { q: 1, r: 1, lvl: 4 },
        { q: 0, r: 2, lvl: 5 },
        { q: -1, r: 2, lvl: 6 },
        { q: -2, r: 2, lvl: 7 },
        { q: -3, r: 2, lvl: 8 },
        { q: -3, r: 1, lvl: 9 },
        { q: -2, r: 0, lvl: 10 }
      ];
      
      const playerIdx = wavePath.findIndex(p => p.q === q && p.r === r);
      if (playerIdx === -1) {
        return isRu 
          ? "Вернитесь на волнообразную лесенку!"
          : "Return to the wave staircase!";
      }
      if (playerIdx === wavePath.length - 1) {
        return isRu
          ? "Поздравляем! Вы покорили вершину L10!"
          : "Congratulations! You reached the peak at L10!";
      }
      
      return isRu
        ? `Успей по указателям дойти вверх до портала!`
        : `Hurry, follow the pointers up to the portal!`;
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.player.q === -2 && state.player.r === 0;
      },
      checkLossCondition: (state) => {
        const elapsedS = (Date.now() - (state.sessionStartTime || 0)) / 1000;
        if (elapsedS >= 120) return true;
        return isStranded(state);
      }
    }
  },

  // 1.2: Раскопки и Материалы / Excavation & Materials
  {
    id: '1.2',
    title: 'Sim 1.2: Сбор Материалов',
    description: 'Доступно 3 пути к Столице: длинная южная дорога, осыпающийся короткий путь, либо северно-горная тропа.\nСовет: Копайте горы под собой для получения материалов.',
    goalText: 'Достичь Столицы (-8,0)',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: []
    },
    objectiveHexes: [
      { q: -3, r: -1, targetLevel: 3, label: 'L3 Ridge', color: 'amber' },
      { q: -8, r: 0, targetLevel: 1, label: 'Capital', color: 'emerald' },
    ],
    startState: { credits: 0, moves: 40, rank: 10, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const player = state.player;
      const finished = player.q === -8 && player.r === 0;
      if (finished) {
        return isRu ? "Вы у цели!" : "You reached the objective!";
      }
      const hex = state.grid[`${player.q},${player.r}`];
      
      if (hex && hex.durability === 1) {
        return isRu 
          ? "Опасно! Плита хрупкая и обрушится, когда вы сойдете с неё. Быстро двигайтесь вперед без остановок и backtracking!"
          : "Danger! This tile is fragile and will collapse when you leave. Move forward swiftly with no stops or backtracking!";
      }
      
      if (player.r === -1) {
        return isRu
          ? "Вы на горной тропе! Наступая на пики L2-L3, вы тратите больше ходов. Нажмите РАСКОПКА под собой, чтобы срезать вершину до L1 и собрать материалы!"
          : "You are on the mountain trail! Climbing L2-L3 peaks consumes extra moves. Use DIG under your feet to level them down to L1 and gather materials!";
      }

      const hasReachedFork = player.q === -1 && player.r === 0;
      if (hasReachedFork) {
        return isRu
          ? "Развилка перед вами! Идите прямо на (-2,0) по хрупкому обрушающемуся пути, или поднимитесь на север (-1,-1) на горный хребет (копайте его для материалов)!"
          : "You are at the fork! Go straight to (-2,0) for the fragile collapsing shortcut, or climb north to (-1,-1) to traverse high peaks (DIG them for materials)!";
      }

      return isRu
        ? "Выберите путь! На выбор: безопасная длинная южная дорога (r>0), авантюрный хрупкий центр, или северный хребет с добычей ресурсов."
        : "Choose your path! Your choices: safe long southern loop (r>0), direct fragile direct middle road, or northern ridge to mine resources.";
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

  // 1.3: Замок Градиента / High Ground Gradient Lock
  {
    id: '1.3',
    title: 'Sim 1.3: Замок Градиента',
    description: 'Правило стабильности: вы не можете раскопать гекс ниже самого низкого его соседа.\nСначала сровняйте соседей!',
    goalText: 'Срежьте Центр (0,0) до L0',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 2, maxLevel: 2, revealed: true }, // Центр L2 (Цель)
        { q: 1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Соседи L1, игрок стартует здесь
        { q: 1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: -1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
        { q: 0, r: -1, currentLevel: 1, maxLevel: 1, revealed: true }
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 0, label: 'Goal', color: 'emerald' },
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
          ? "Отлично! Центр успешно опущен до уровня L0."
          : "Excellent! Center is successfully lowered to level L0.";
      }
      
      if (isAtStartingHex && h11 === 1) {
        return isRu
          ? "Вы начали на гексе (1,-1). Вы можете сразу раскопать его под собой (кнопка РАСКОПКА) до уровня L0, чтобы открыть путь к понижению Центра!"
          : "You started on the hex (1,-1). You can DIG it right now under your feet (DIG button) down to level L0 to open the path for lowering the Center!";
      }

      if (h00 === 2) {
        if (isAtCenter) {
          return isRu
            ? "Вы в Центре! Раскопайте его сначала до уровня L1."
            : "You are in the Center! DIG it down to level L1 first.";
        } else {
          return isRu
            ? "Перейдите в Центр (0,0) и раскопайте его до уровня L1, либо сначала раскопайте ваш текущий гекс до L0!"
            : "Move to the Center (0,0) and dig it down to level L1, or dig your current hex down to L0 first!";
        }
      }

      if (minNeighbor >= 1) {
        if (isAtCenter) {
          return isRu
            ? "Замок градиента активен! Все соседи Центра равны L1 или выше, так что вы не можете копать Центр ниже L1. Сделайте шаг на соседнюю клетку и прокопайте её до L0!"
            : "Gradient lock active! All neighboring tiles of the Center are L1 or higher, so you cannot DIG Center below L1. Move to a neighbor and DIG it to L0!";
        } else {
          return isRu
            ? "Прокопайте ваш текущий гекс до уровня L0, чтобы снять замок градиента с Центра."
            : "DIG your current hex down to level L0 to break the gradient lock on the Center.";
        }
      }

      if (isAtCenter) {
        return isRu
          ? "Замок градиента спал! Вы в Центре, раскопайте его до уровня L0 для победы!"
          : "Gradient lock is broken! You are in the Center, DIG it down to level L0 to win!";
      } else {
        return isRu
          ? "Замок градиента спал! Теперь перейдите в Центр (0,0) и раскопайте его до уровня L0."
          : "Gradient lock is broken! Now move to the Center (0,0) and dig it down to level L0.";
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

  // 1.4: Строительство и Фундамент / Upgrading & Support
  {
    id: '1.4',
    title: 'Sim 1.4: Фундамент Опор',
    description: 'Чтобы повысить гекс до L2 и выше, ему нужна опора:\nМинимум 2 соседних гекса должны быть не ниже желаемого уровня.',
    goalText: 'Возведите башню L2 в центре',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Центр L1
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true }, // Опора 1
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true }, // Опора 2
      ]
    },
    objectiveHexes: [
      { q: 1, r: 0, targetLevel: 1, label: 'UP', color: 'amber' },
      { q: 0, r: 1, targetLevel: 1, label: 'UP', color: 'amber' },
      { q: 0, r: 0, targetLevel: 2, label: 'Goal', color: 'emerald' },
    ],
    startState: { credits: 0, moves: 15, rank: 2, materials: 3, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const h00 = state.grid['0,0']?.currentLevel;
      
      if (h00 >= 2) {
        return isRu ? "Изумительно! Центр поднят на высоту 2!" : "Superb! Center raised to height level 2!";
      }
      
      const okNeighbors = [state.grid['1,0'], state.grid['0,1']].filter(h => h && h.currentLevel >= 1).length;
      if (okNeighbors < 2) {
        return isRu
          ? `Фундамент не готов. Постройте (Оранжевая кнопка «УЛУЧШИТЬ») опоры рядом до уровня L1. Выстроено: ${okNeighbors}/2`
          : `We need support. Upgrade (Orange button «UPGRADE») adjacent neighbors to level L1. Active: ${okNeighbors}/2`;
      }
      
      return isRu
        ? "Опоры готовы! Шагайте в Центр и улучшайте его до уровня L2."
        : "Pillars are ready! Stand in the Center and upgrade it to Level L2.";
    },
    hooks: {
      checkWinCondition: (state) => {
        return (state.grid['0,0']?.currentLevel ?? 1) >= 2;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.5: Регенерация ландшафта / Exception: Regrowth & Valley
  {
    id: '1.5',
    title: 'Sim 1.5: Жесткие Опоры',
    description: 'В пустоте возвысить изолированный гекс выше L1 невозможно.\nВсегда стройте опорное плато из смежных блоков!',
    goalText: 'Улучшите Центр до уровня L1',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 1, revealed: true, ownerId: 'player-1' }, // Лимит L1
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 1, label: 'L1 Peak', color: 'emerald' },
    ],
    startState: { credits: 0, moves: 10, rank: 3, materials: 3, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const h00 = state.grid['0,0']?.currentLevel ?? 0;
      if (h00 >= 1) {
        return isRu
          ? "Отлично! Вы подняли гекс до уровня L1. Выше подняться нельзя без соседних опорных плит."
          : "Great! You raised the hex to Level L1. You cannot go higher without supporting adjacent tiles.";
      }
      return isRu
        ? "Попробуйте улучшить Центр до уровня L1."
        : "Try to upgrade the Center to level L1.";
    },
    hooks: {
      checkWinCondition: (state) => {
        return (state.grid['0,0']?.currentLevel ?? 0) >= 1;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.6: Съем энергии и Реакторы / Recovery Energy & Reactors
  {
    id: '1.6',
    title: 'Sim 1.6: Потоки Энергии',
    description: 'Синяя кнопка восстанавливает Ходы и Кредиты на плите.\nПлиты L4+ являются реакторами на 3 заряда (можно откачивать 3 раза подряд).',
    goalText: 'Накопите 100 Кредитов',
    mapConfig: {
      size: 3,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 4, maxLevel: 4, revealed: true, ownerId: 'player-1' }, // Реактор L4
        { q: 1, r: -1, currentLevel: 3, maxLevel: 3, revealed: true }, // Буферная L3
        { q: -1, r: 1, currentLevel: 3, maxLevel: 3, revealed: true }, // Буферная L3
        { q: 2, r: -2, currentLevel: 2, maxLevel: 2, revealed: true }, // Спуск L2
        { q: -2, r: 2, currentLevel: 2, maxLevel: 2, revealed: true }, // Спуск L2
      ]
    },
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 4, label: 'Reactor', color: 'blue' },
      { q: 1, r: -1, targetLevel: 3, label: 'L3', color: 'blue' },
      { q: -1, r: 1, targetLevel: 3, label: 'L3', color: 'blue' },
      { q: 2, r: -2, targetLevel: 2, label: 'L2', color: 'blue' },
      { q: -2, r: 2, targetLevel: 2, label: 'L2', color: 'blue' },
    ],
    startState: { credits: 0, moves: 12, rank: 4, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const credits = state.player.coins;
      const reactor = state.grid['0,0'];
      
      if (credits >= 100) {
        return isRu ? "Лимит набран! Стабилизатор готов." : "Quota satisfied! Stabilizer pre-charged.";
      }
      
      if (state.player.q === 0 && state.player.r === 0) {
        if (reactor?.recoveryCharges && reactor.recoveryCharges > 0) {
          return isRu
            ? `Вы на реакторе L4. Сделайте 3 съема энергии кнопкой ВОССТАНОВЛЕНИЕ (Синяя кнопка). Заряды: ${reactor.recoveryCharges}/3`
            : `You are on the L4 Reactor. Use RECOVER (Blue button) 3 times. Charges remaining: ${reactor.recoveryCharges}/3`;
        }
        return isRu
          ? "Реактор остывает! Спуститесь на плиты вокруг, снимите там энергию!"
          : "Reactor on cooldown! Descend to buffer plates for recovery!";
      }
      
      const onL3 = Math.abs(state.player.q) === 1 && Math.abs(state.player.r) === 1;
      return isRu
        ? (onL3 
            ? "Вы на промежуточной плите. Нажмите ВОССТАНОВЛЕНИЕ (Синяя кнопка), затем спуститесь ниже!"
            : "Нажмите ВОССТАНОВЛЕНИЕ (Синяя кнопка), затем перебегайте на другую сторону!")
        : (onL3 
            ? "You are on the buffer step. Click RECOVER (Blue button), then step down!"
            : "Click RECOVER (Blue button), then head to the alternate slope!");
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.player.coins >= 100;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.7: Усталость и Логика Шагов / Energy, Fatigue & Emergency conversion
  {
    id: '1.7',
    title: 'Sim 1.7: Усталость и Телепорт',
    description: 'Статус УСТАЛОСТЬ удваивает стоимость ходов.\nПри Move=0 шаг стоит 5 Кредитов! Используйте артефакт Void Core в инвентаре.',
    goalText: 'Перейдите в Столицу (3,-1)',
    mapConfig: {
      size: 4,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, ownerId: 'player-1' },
        { q: 1, r: -1, currentLevel: 2, maxLevel: 2, revealed: true }, // Ступенька L2
        { q: 2, r: -1, currentLevel: 3, maxLevel: 3, revealed: true }, // Ступенька L3
        { q: 3, r: -1, currentLevel: 0, maxLevel: 0, revealed: true, structureType: 'CAPITAL' }, // Столица L0
      ]
    },
    objectiveHexes: [
      { q: 3, r: -1, targetLevel: 0, label: 'Capital', color: 'emerald' },
    ],
    startState: {
      credits: 60,
      moves: 0,
      rank: 3,
      materials: 0,
      initialEntropy: 100,
      startInventory: ['void_core']
    },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const hasVoidCore = state.player.inventory.some(i => i.baseId === 'void_core');
      
      if (state.player.q === 3 && state.player.r === -1) {
        return isRu ? "Отличная работа! Цель достигнута." : "Excellent work! Destination reached.";
      }
      
      if (hasVoidCore) {
        return isRu
          ? "Откройте ИНВЕНТАРЬ (кнопка с рюкзаком внизу) и примените Ядро Пустоты (Void Core), чтобы пролетать любые высоты за 1 ход!"
          : "Open the INVENTORY (bag icon below) and use the Void Core to ignore heights, fatigue, and move over rifts safely!";
      }
      
      return isRu
        ? "Ядро активировано. Теперь спокойно кликайте на Столицу для перемещения!"
        : "Void form active. Just click the Capital to teleport!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.player.q === 3 && state.player.r === -1;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.8: Глубинное Бурение / Deep Mines & Negative Levels
  {
    id: '1.8',
    title: 'Sim 1.8: Глубинная Добыча',
    description: 'Шахты ниже L0 восстанавливает Ходы. \nНо бурить на глубину -2 и ниже можно только при наличии 2 углубленных соседей!',
    goalText: 'Выкопайте шахту -2 в центре',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, ownerId: 'player-1' }, // Центр
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, revealed: true }, // Ствол 1
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true }, // Ствол 2
      ]
    },
    objectiveHexes: [
      { q: 1, r: -1, targetLevel: -1, label: '-1', color: 'amber' },
      { q: 0, r: 1, targetLevel: -1, label: '-1', color: 'amber' },
      { q: 0, r: 0, targetLevel: -2, label: 'Goal -2', color: 'emerald' },
    ],
    startState: { credits: 0, moves: 8, rank: 2, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const h00 = state.grid['0,0']?.currentLevel;
      
      if (h00 <= -2) {
        return isRu ? "Невероятно глубоко! Протокол шахтной вентиляции сдам!" : "Incredible. Shaft stability protocol validated.";
      }
      
      const minedNeighbors = [state.grid['1,-1'], state.grid['0,1']].filter(h => h && h.currentLevel <= -1).length;
      if (minedNeighbors < 2) {
        return isRu
          ? `Для прокопки центра глубоко, углубите соседей на уровень -1. Готово: ${minedNeighbors}/2`
          : `To drill the center deeply, lower surrounding gate neighbors to level -1. Completed: ${minedNeighbors}/2`;
      }
      
      return isRu
        ? "Соседи укреплены! Возвращайтесь в Центр и дважды копайте до самого глубокого уровня для быстрой победы."
        : "Arches set! Return to the Center and dig down twice to the deepest level.";
    },
    hooks: {
      checkWinCondition: (state) => {
        return (state.grid['0,0']?.currentLevel ?? 0) <= -2;
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.9: Заживление Пустот / Sealing Spacetime Voids
  {
    id: '1.9',
    title: 'Sim 1.9: Заживление Пустоты',
    description: 'Разломы пустоты можно запечатать:\nВстаньте рядом, кликните по черному гексу и используйте Reality Patch из рюкзака!',
    goalText: 'Запечатайте Пробой на (1,-1)',
    mapConfig: {
      size: 2,
      type: 'fixed',
      customLayout: [
        { q: 0, r: 0, currentLevel: 1, maxLevel: 1, revealed: true, ownerId: 'player-1' },
        { q: 1, r: -1, currentLevel: 1, maxLevel: 1, revealed: true, structureType: 'VOID' }, // Место ремонта
      ]
    },
    objectiveHexes: [
      { q: 1, r: -1, targetLevel: 0, label: 'Rift', color: 'rose' },
    ],
    startState: {
      credits: 0,
      moves: 5,
      rank: 1,
      materials: 0,
      initialEntropy: 100,
      startInventory: ['reality_patch']
    },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const voidHex = state.grid['1,-1'];
      
      if (voidHex && voidHex.structureType !== 'VOID') {
        return isRu ? "Отлично! Пространство восстановлено." : "Superb! Spacetime fracture successfully healed.";
      }
      
      return isRu
        ? "Кликните на черную ячейку под стрелкой и пожертвуйте Лоскут Реальности (Reality Patch)!"
        : "Click on the dark Void tile under the arrow and consume your Reality Patch!";
    },
    hooks: {
      checkWinCondition: (state) => {
        return state.grid['1,-1']?.structureType !== 'VOID';
      },
      checkLossCondition: (state) => {
        return isStranded(state);
      }
    }
  },

  // 1.10: Секторный Монумент / Monument Blueprint Sequences
  {
    id: '1.10',
    title: 'Sim 1.10: Финал: Линия Суши',
    description: 'Зачет.\nИспользуя все знания добычи и опор, выстройте прямую линию уровня 2 по вертикали q=0.',
    goalText: 'Постройте 3 гекса высотой L2 на q=0',
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
      { q: 0, r: -1, targetLevel: 2, label: 'L2', color: 'emerald' },
      { q: 0, r: 0, targetLevel: 2, label: 'L2', color: 'emerald' },
      { q: 0, r: 1, targetLevel: 2, label: 'L2', color: 'emerald' },
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
        return isRu ? "Чертеж готов! Нажмите Завершить сессию на боковой панели." : "Perfect straight cascade sequence complete! Victory achieved.";
      }
      
      return isRu
        ? `Поднимите целевые плиты до высоты 2, задействуя боковые плиты для бесплатных опор. Статус: ${l1}/2, ${l2}/2, ${l3}/2`
        : `Raise target blocks to level L2. Current: ${l1}/2, ${l2}/2, ${l3}/2`;
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
  }
];
