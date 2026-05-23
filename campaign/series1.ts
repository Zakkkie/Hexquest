import { LevelConfig } from '../types';
import { getHexKey, getNeighbors } from '../services/hexUtils';
import { isStranded } from './utils';

const generateSymmetricLayout = (radius: number) => {
  const layout = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const d = Math.round((Math.abs(q) + Math.abs(r) + Math.abs(q + r)) / 2);
      const level = d % 3;
      const hex: any = { q, r, currentLevel: level, maxLevel: level, revealed: true };
      if (q === 1 && r === 0) hex.ownerId = 'player-1';
      if (q === -1 && r === 0) hex.ownerId = 'bot-1';
      layout.push(hex);
    }
  }
  return layout;
};

export const series1Levels: LevelConfig[] = [
  {
    id: '1.1',
    title: 'Sim 1.1: Протокол Инициации',
    description: 'Цель: Улучшите 3 отмеченных гекса вокруг вас. Не тратьте материалы на другие гексы. Если вы потратите материал не на цель, вы проиграете.',
    goalText: 'Улучшите 3 отмеченных гекса',
    mapConfig: {
      size: 1, type: 'fixed', generateWalls: false,
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
      ]
    },
    objectiveHexes: [
      { q: 1, r: 0, targetLevel: 1, label: '↑', color: 'amber' },
      { q: -1, r: 1, targetLevel: 1, label: '↑', color: 'amber' },
      { q: 0, r: -1, targetLevel: 1, label: '↑', color: 'amber' },
    ],
    startState: { credits: 10, moves: 5, rank: 1, materials: 3, initialEntropy: 100 },
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
      onBeforeAction: (_state, action) => {
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
    title: 'Sim 1.2: Твердая Почва',
    description: 'Цель: Достигните Столицы.\n\nСКАНЕР: Обнаружен безопасный путь (Прочность 3). Следуйте по нему через пустоту.\n\nОПАСНОСТЬ: Окружающая среда НЕСТАБИЛЬНА (Прочность 1). Сход с пути вызывает немедленное обрушение и потерю Ранга.\n\nПРОВАЛ: Ранг падает до 1.',
    mapConfig: { size: 8, type: 'fixed', generateWalls: false },
    startState: { credits: 12, moves: 8, rank: 5, materials: 0, initialEntropy: 15 },
    goalText: 'Достигните Столицы',
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => !!(state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'CAPITAL'),
      checkLossCondition: (state) => state.player.playerLevel <= 1 || isStranded(state)
    }
  },
  {
    id: '1.3',
    title: 'Sim 1.3: Структурные Опоры',
    description: 'Протокол: Вертикальное Строительство.\n\nЦель: Улучшите Центр до 2-го уровня.\n\nПравило: Нельзя строить выше без фундамента. Гексу нужно как минимум 2 соседа ТАКОГО ЖЕ уровня для улучшения.',
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
    startState: { credits: 15, moves: 10, rank: 2, materials: 3, initialEntropy: 15 },
    goalText: 'Улучшите Центр до 2-го уровня',
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
                  if (validSupports.length < 2) return { ok: false, reason: "НЕСТАБИЛЬНО! Сначала улучшите 2 соседей до 1-го уровня." };
              }
          }
          return { ok: true };
      }
    }
  },
  {
    id: '1.4',
    title: 'Sim 1.4: Раскопки',
    description: 'Протокол: Цикл Ресурсов.\n\nЦель: Улучшите Центр до 3-го уровня.\n\nПроблема: У вас 0 Материалов. Строительство невозможно.\n\nРешение: КОПАЙТЕ (Красная кнопка). Раскапывайте окружающие насыпи (Ур. 2), чтобы добыть +1 Материал.',
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
    startState: { credits: 15, moves: 12, rank: 3, materials: 0, initialEntropy: 15 },
    goalText: 'Улучшите Центр до 3-го уровня',
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => (state.grid[getHexKey(0,0)]?.maxLevel >= 3),
      checkLossCondition: (state) => isStranded(state) && state.grid[getHexKey(0,0)]?.maxLevel < 3,
      onBeforeAction: (state, action) => {
          if (action.type === 'UPGRADE' && state.player.storage === 0 && action.intent !== 'RECOVER') {
             return { ok: false, reason: "НЕТ МАТЕРИАЛОВ! Раскапывайте насыпи (Ур. 2)." };
          }
          return { ok: true };
      }
    }
  },
  {
    id: '1.5',
    title: 'Sim 1.5: Кислородный Марш',
    description: 'Протокол: Экстренное Восстановление.\n\nЦель: Соберите 150 Кредитов за 75 секунд.\n\nПравило: Стандартное Восстановление одноразовое. Вы должны ПЕРЕМЕСТИТЬСЯ, чтобы сбросить инструмент.\n\nМетод: Используйте ВОССТАНОВЛЕНИЕ (Синяя кнопка) на высоких секторах.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 2, r: 0, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: -2, r: 0, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 0, r: 2, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 0, r: -2, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 10, moves: 6, rank: 5, materials: 0, initialEntropy: 15 },
    goalText: 'Соберите 150 Кредитов',
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => state.player.coins >= 150,
      checkLossCondition: (state) => (Date.now() - state.sessionStartTime > 75000) || isStranded(state)
    }
  },
  {
    id: '1.6',
    title: 'Sim 1.6: Вертикальный Предел',
    description: 'Цель: Достигните 4-го уровня быстрее бота.\n\nПоле радиусом 5 гексов с симметричным рельефом (уровни 0-2). Игрок и бот начинают на равных условиях на 1-м уровне.',
    goalText: 'Достигните 4-го уровня быстрее бота',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: false,
      customLayout: generateSymmetricLayout(5)
    },
    startState: { credits: 20, moves: 15, rank: 1, materials: 5, initialEntropy: 100 },
    botSpawnPoints: [{ q: -1, r: 0 }],
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
  },
  {
    id: '1.7',
    title: 'Sim 1.7: Восстановите Пустоту',
    description: 'Цель: Восстановите 5 пустотных гексов.\n\nЭнтропия разрушила сектора, образовав разломы Пустоты. Вам выданы аварийные припасы: подойдите к Пустоте и пожертвуйте предметом из рюкзака, чтобы материализовать спасительный грунт.\n\nПодсказка: чтобы использовать предмет, встаньте рядом с Пустотой и кликните на нее.',
    goalText: 'Восстановите 5 гексов Пустоты',
    mapConfig: {
      size: 3, type: 'fixed', generateWalls: false,
      customLayout: [
        // Center (Starting hex)
        { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
        
        // Ring 1 (Radius 1)
        { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: -1, structureType: 'VOID', maxLevel: 0, currentLevel: 0, revealed: true },
        
        // Ring 2 (Radius 2)
        { q: 2, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, structureType: 'VOID', maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 0, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -1, r: 2, structureType: 'VOID', maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -2, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -2, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -2, r: 0, structureType: 'VOID', maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: -2, structureType: 'VOID', maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 1, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 2, r: -2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 2, r: -1, maxLevel: 2, currentLevel: 2, revealed: true }
      ]
    },
    startState: { 
      credits: 30, 
      moves: 20, 
      rank: 2, 
      materials: 0, 
      initialEntropy: 30,
      items: [
        { baseId: 'fuel_cell', rarity: 'COMMON' },
        { baseId: 'fuel_cell', rarity: 'COMMON' },
        { baseId: 'data_disc', rarity: 'COMMON' },
        { baseId: 'raw_container', rarity: 'UNCOMMON' },
        { baseId: 'reality_patch', rarity: 'RARE' },
        { baseId: 'reality_patch', rarity: 'LEGENDARY' },
        { baseId: 'emerald_necklace', rarity: 'RARE' },
        { baseId: 'shoes_leather', rarity: 'COMMON' },
        { baseId: 'plasma_drill', rarity: 'RARE' }
      ]
    },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        return (state.restoredHexesCount || 0) >= 5;
      },
      checkLossCondition: (state) => {
        return isStranded(state) && (state.restoredHexesCount || 0) < 5;
      }
    }
  },
  {
    id: '1.8',
    title: 'Sim 1.8: Энтропийный Щит',
    description: 'Цель: Стабилизируйте сектор.\n\nЭнтропия растет. Вы должны удерживать уровень Энтропии ниже 50% в течение 30 секунд, используя Восстановление и Артефакты Стабилизации.',
    goalText: 'Стабилизируйте Энтропию ниже 50% на 30 сек',
    mapConfig: {
      size: 4, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
         { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
         { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
         { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
         { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
         { q: -1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
         { q: 0, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
         { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
      ]
    },
    startState: { credits: 25, moves: 15, rank: 2, materials: 2, initialEntropy: 60 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        if (state.entropy.current < 50) {
            if (!state.stableStartTime) state.stableStartTime = Date.now();
            return (Date.now() - state.stableStartTime) > 30000;
        }
        state.stableStartTime = undefined;
        return false;
      },
      checkLossCondition: (state) => isStranded(state) || state.entropy.current >= 100
    }
  },
  {
    id: '1.9',
    title: 'Sim 1.9: Обелиски Создателей',
    description: 'Вам стали доступны подсказки Обелисков. Подойдите к минимонументу, чтобы узнать требуемую форму и собрать фигуру на карте.',
    mapConfig: {
      size: 3, type: 'fixed', generateWalls: false,
      customLayout: [
        { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
        { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: -1, structureType: 'MINI_MONUMENT', maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 50, moves: 15, rank: 3, materials: 5, initialEntropy: 10 },
    goalText: 'Выполните требование Обелиска',
    aiMode: 'none',
    requiredShapes: [
      {
        type: 'LINE_3',
        level: 1,
        hint: 'Постройте прямую Линию из 3-х гексов уровня 1 или выше. Они должны принадлежать вам.'
      }
    ],
    hooks: {
      checkWinCondition: () => false, // Handled automatically by requiredShapes Check inside VictorySystem
      checkLossCondition: (state) => isStranded(state)
    }
  }
];