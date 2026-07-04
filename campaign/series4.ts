import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

const countOwned = (state: any, minLevel: number): number =>
  Object.values(state.grid).filter((h: any) => h.ownerId === 'player-1' && h.maxLevel >= minLevel).length;

const countBotOwned = (state: any, minLevel: number): number =>
  Object.values(state.grid).filter((h: any) => h.ownerId?.startsWith('bot') && h.maxLevel >= minLevel).length;

export const series4Levels: LevelConfig[] = [
  // 4.1: Первая Кровь
  {
    id: '4.1',
    title: 'Sim 4.1: Первая Кровь',
    description: 'Выжить 30 ходов против агрессивного бота DESTROYER.',
    mapConfig: { size: 4, type: 'procedural', generateWalls: true, wallType: 'pit_ring' },
    startState: { credits: 0, moves: 30, rank: 2, materials: 10, initialEntropy: 0 },
    goalText: 'Survive 30 turns against bot',
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 0, r: -3 }],
    getTutorialHint: (state) => {
        const isRu = state.language === 'RU';
        const turns = state.currentTurn ?? 0;
        if (turns >= 30) return isRu ? "ПОБЕДА: Вы выжили!" : "VICTORY: You survived!";
        return isRu ? `ВЫЖИТЬ: Продержитесь 30 ходов. Выжито: ${turns}/30` : `SURVIVE: Last 30 turns. Survived: ${turns}/30`;
    },
    hooks: {
        checkWinCondition: (state) => (state.currentTurn ?? 0) >= 30,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 4.2: Оборона Высот
  {
    id: '4.2',
    title: 'Sim 4.2: Оборона Высот',
    description: 'Возвести и удержать 2 башни L4 под натиском бота.',
    mapConfig: { size: 5, type: 'procedural', generateWalls: true },
    startState: { credits: 50, moves: 25, rank: 4, materials: 8 },
    goalText: 'Build and hold 2 Level 4 hexes',
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 0, r: -4 }],
    getTutorialHint: (state) => {
        const c = countOwned(state, 4);
        const isRu = state.language === 'RU';
        if (c >= 2) return isRu ? "ПОБЕДА: Высоты удержаны!" : "VICTORY: Heights secured!";
        return isRu ? `ЦЕЛЬ: Постройте 2 башни L4 (${c}/2).` : `GOAL: Build 2 L4 towers (${c}/2).`;
    },
    hooks: {
        checkWinCondition: (state) => countOwned(state, 4) >= 2,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 4.3: Вражеская Архитектура
  {
    id: '4.3',
    title: 'Sim 4.3: Вражеская Архитектура',
    description: 'Остановите бота BUILDER и постройте свою башню L5.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 0, moves: 20, rank: 5, materials: 10 },
    goalText: 'Build Level 5 hex before bot',
    aiMode: 'basic',
    botObjective: 'COMPETE_RANK',
    botSpawnPoints: [{ q: 0, r: -4 }],
    getTutorialHint: (state) => {
        const isRu = state.language === 'RU';
        return isRu ? "ОПЕРЕДИТЕ БОТА: Постройте L5 первым!" : "RACE BOT: Build L5 first!";
    },
    hooks: {
        checkWinCondition: (state) => countOwned(state, 5) >= 1,
        checkLossCondition: (state) => isStranded(state) || countBotOwned(state, 5) >= 1,
        onAfterAction: () => {}
    }
  },
  // 4.4: Захват Монолита
  {
    id: '4.4',
    title: 'Sim 4.4: Захват Монолита',
    description: 'Опередить бота GUARDIAN и активировать Монумент первым.',
    objectiveHexes: [ { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' } ],
    mapConfig: { size: 4, type: 'fixed', customLayout: [{q:0, r:0, maxLevel:5, currentLevel:5, structureType:'MONUMENT', revealed:true}] },
    startState: { credits: 50, moves: 35, rank: 5, materials: 5 },
    goalText: 'Activate Monument before bot',
    aiMode: 'basic',
    botObjective: 'MONUMENT_RACE',
    botSpawnPoints: [{ q: 0, r: -3 }],
    getTutorialHint: (state) => {
        const isRu = state.language === 'RU';
        return isRu ? "ГОНКА: Достигните Монумента раньше бота!" : "RACE: Reach Monument before the bot!";
    },
    hooks: {
        checkWinCondition: () => false,
        checkLossCondition: (state) => {
            const onMon = state.bots?.some((b: any) => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT');
            return onMon || isStranded(state);
        },
        onAfterAction: () => {}
    }
  },
  // 4.5: Чертеж в Тумане
  {
    id: '4.5',
    title: 'Sim 4.5: Чертеж в Тумане',
    description: 'Собрать STAR_7 L2, отбиваясь от скрытого бота.',
    mapConfig: { size: 5, type: 'procedural', revealMode: 'fog' },
    startState: { credits: 100, moves: 30, rank: 2, materials: 15 },
    goalText: 'Build STAR_7 shape (Level 2)',
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 0, r: -4 }],
    requiredShapes: [{ type: 'STAR_7', level: 2, hint: 'Build a STAR shape of Level 2 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ТУМАН: Постройте звезду L2." : "FOG: Build L2 Star.",
    hooks: {
        checkWinCondition: () => false,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 4.6: Охотники в Пустоте
  {
    id: '4.6',
    title: 'Sim 4.6: Охотники в Пустоте',
    description: 'Поиск ключа Apex Core в тумане, преследуемый двумя ботами.',
    objectiveHexes: [ { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' } ],
    mapConfig: { size: 6, type: 'procedural', revealMode: 'fog' },
    secretLootHexes: [{q: 0, r: -4, itemBaseId: 'apex_core', level: -3}],
    startState: { credits: 150, moves: 40, rank: 5, materials: 10 },
    goalText: 'Find Apex Core and Activate Monument',
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: -4, r: 0 }, { q: 4, r: 0 }],
    getTutorialHint: (state) => state.language === 'RU' ? "ТУМАН: Найди Apex Core!" : "FOG: Find Apex Core!",
    hooks: {
        checkWinCondition: () => false,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: (state) => {
            if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [true];
        }
    }
  },
  // 4.7: Гонка на Выживание
  {
    id: '4.7',
    title: 'Sim 4.7: Гонка на Выживание',
    description: 'Набрать 300 Кредитов раньше, чем бот накопит их.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 80, moves: 25, rank: 3, materials: 12 },
    goalText: 'Collect 300 Credits',
    aiMode: 'basic',
    botObjective: 'COMPETE_RANK',
    botSpawnPoints: [{ q: 0, r: -4 }],
    getTutorialHint: (state) => {
        const isRu = state.language === 'RU';
        const pCoins = state.player.coins || 0;
        return isRu ? `ЗОЛОТО: Наберите 300 Кредитов (${pCoins}/300)` : `GOLD: Collect 300 Credits (${pCoins}/300)`;
    },
    hooks: {
        checkWinCondition: (state) => (state.player.coins || 0) >= 300,
        checkLossCondition: (state) => {
            const bCoins = state.bots?.[0]?.coins || 0;
            return bCoins >= 300 || isStranded(state);
        },
        onAfterAction: () => {}
    }
  },
  // 4.8: Осада
  {
    id: '4.8',
    title: 'Sim 4.8: Осада',
    description: 'Собрать Бастион (HEXAGON_7 L3) под атакой пары ботов.',
    mapConfig: { size: 4, type: 'procedural' },
    startState: { credits: 0, moves: 50, rank: 4, materials: 20 },
    goalText: 'Build HEXAGON_7 (Level 3)',
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: -3, r: 0 }, { q: 3, r: 0 }],
    requiredShapes: [{ type: 'HEXAGON_7', level: 3, hint: 'Build a HEXAGON shape of Level 3 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Гексагон L3." : "BLUEPRINT: L3 Hexagon.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 4.9: Инверсия Ролей
  {
    id: '4.9',
    title: 'Sim 4.9: Инверсия Ролей',
    description: 'Опустить все плиты ИИ (уровня L3) до L0.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 50, moves: 30, rank: 5, materials: 8 },
    goalText: 'Destroy all Bot L3+ hexes',
    aiMode: 'basic',
    botObjective: 'COMPETE_RANK',
    botSpawnPoints: [{ q: 0, r: -4 }],
    getTutorialHint: (state) => {
        const isRu = state.language === 'RU';
        const b = countBotOwned(state, 3);
        return isRu ? `СЛОМАЙ ИИ: Уничтожь базы бота. Осталось L3: ${b}` : `DESTROY AI: Break bot bases. Remaining L3: ${b}`;
    },
    hooks: {
        checkWinCondition: (state) => {
            const b = countBotOwned(state, 3);
            return (state.currentTurn ?? 0) > 2 && b === 0;
        },
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 4.10: Сектор Омега
  {
    id: '4.10',
    title: 'Sim 4.10: Сектор Омега',
    description: 'Уничтожить главного бота-защитника. Впервые боты используют туман.',
    mapConfig: { size: 5, type: 'procedural', revealMode: 'fog' },
    startState: { credits: 150, moves: 40, rank: 5, materials: 15 },
    goalText: 'Defeat the Guardian Bot',
    aiMode: 'basic',
    botObjective: 'GUARD_HEXES',
    botSpawnPoints: [{ q: 0, r: -4 }],
    getTutorialHint: (state) => state.language === 'RU' ? "ЦЕЛЬ: Уничтожить GUARDIAN-бота." : "GOAL: Eliminate GUARDIAN bot.",
    hooks: {
        checkWinCondition: (state) => (state.bots?.length ?? 0) === 0,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 4.11: Эскорт Ключа
  {
    id: '4.11',
    title: 'Sim 4.11: Эскорт Ключа',
    description: 'Доставить Stability Scanner к Монументу через территорию патруля GUARDIAN.',
    objectiveHexes: [ { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' } ],
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 120, moves: 30, rank: 5, materials: 10, startInventory: ['stability_scanner'] },
    goalText: 'Deliver Stability Scanner to Monument',
    aiMode: 'basic',
    botObjective: 'GUARD_HEXES',
    botSpawnPoints: [{ q: 0, r: -3 }, { q: -3, r: 0 }],
    getTutorialHint: (state) => state.language === 'RU' ? "ДОСТАВКА: Донесите артефакт." : "DELIVERY: Bring artifact to Monument.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: (state) => {
        if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [true];
    } }
  },
  // 4.12: Темная Матрица
  {
    id: '4.12',
    title: 'Sim 4.12: Темная Матрица',
    description: 'Найти Обелиски в тумане и собрать DIAMOND_4 L3, избегая патрулей.',
    mapConfig: { size: 5, type: 'procedural', revealMode: 'fog' },
    startState: { credits: 80, moves: 35, rank: 3, materials: 12 },
    goalText: 'Build DIAMOND_4 (Level 3)',
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: -4, r: 0 }, { q: 4, r: 0 }],
    requiredShapes: [{ type: 'DIAMOND_4', level: 3, hint: 'Build a DIAMOND shape of Level 3 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ТУМАН: Собери Ромб L3." : "FOG: Build L3 Diamond.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 4.13: Тектонический Резонанс
  {
    id: '4.13',
    title: 'Sim 4.13: Тектонический Резонанс',
    description: 'Собрать RING_6 L2 на карте с постоянными энтропийными сдвигами и активным BUILDER.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 100, moves: 40, rank: 3, materials: 15, initialEntropy: 80 },
    goalText: 'Build RING_6 (Level 2)',
    aiMode: 'basic',
    botObjective: 'COMPETE_RANK',
    botSpawnPoints: [{ q: 0, r: -4 }],
    requiredShapes: [{ type: 'RING_6', level: 2, hint: 'Build a RING shape of Level 2 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "РЕЗОНАНС: Собери Кольцо L2." : "RESONANCE: Build L2 Ring.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 4.14: Ловушка Времени
  {
    id: '4.14',
    title: 'Sim 4.14: Ловушка Времени',
    description: 'Продержаться 30 ходов, не потеряв ни одной плиты L2, против бота.',
    mapConfig: { size: 4, type: 'fixed', customLayout: [
        { q: 0, r: 0, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
        { q: 1, r: -1, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
        { q: -1, r: 1, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
    ] },
    startState: { credits: 50, moves: 20, rank: 2, materials: 8 },
    goalText: 'Survive 30 turns without losing L2 hexes',
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 0, r: -3 }],
    getTutorialHint: (state) => {
        const isRu = state.language === 'RU';
        const turns = state.currentTurn ?? 0;
        return isRu ? `ЗАЩИТА: Продержитесь 30 ходов (${turns}/30)` : `DEFEND: Last 30 turns (${turns}/30)`;
    },
    hooks: {
        checkWinCondition: (state) => (state.currentTurn ?? 0) >= 30,
        checkLossCondition: (state) => {
            const l2 = countOwned(state, 2);
            return l2 < 3 || isStranded(state);
        },
        onAfterAction: () => {}
    }
  },
  // 4.15: Захваченный Реактор
  {
    id: '4.15',
    title: 'Sim 4.15: Захваченный Реактор',
    description: 'Отбить у бота L5 плиту, понизить ее и построить свою L5 на другом конце карты.',
    mapConfig: { size: 5, type: 'fixed', customLayout: [
        { q: 0, r: -4, maxLevel: 5, currentLevel: 5, ownerId: 'bot-1', revealed: true }
    ] },
    startState: { credits: 0, moves: 30, rank: 5, materials: 10 },
    goalText: 'Destroy bot L5 hex and build your own L5',
    aiMode: 'basic',
    botObjective: 'GUARD_HEXES',
    botSpawnPoints: [{ q: 0, r: -4 }],
    getTutorialHint: (state) => state.language === 'RU' ? "РЕАКТОР: Уничтожь вражескую башню и построй свою." : "REACTOR: Break enemy tower, build yours.",
    hooks: {
        checkWinCondition: (state) => countOwned(state, 5) >= 1 && countBotOwned(state, 5) === 0,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 4.16: Чертеж: Двойная Спираль
  {
    id: '4.16',
    title: 'Sim 4.16: Двойная Спираль',
    description: 'Собрать две линии LINE_3 L3 в тумане, борясь за ресурсы с ботом.',
    mapConfig: { size: 6, type: 'procedural', revealMode: 'fog' },
    startState: { credits: 150, moves: 45, rank: 5, materials: 20 },
    goalText: 'Build two LINE_3 shapes (Level 3)',
    aiMode: 'basic',
    botObjective: 'OWN_HEXES',
    botSpawnPoints: [{ q: 0, r: -5 }],
    requiredShapes: [{ type: 'LINE_3', level: 3, hint: 'Build a LINE of 3 Level 3 hexes' }, { type: 'LINE_3', level: 3, hint: 'Build a LINE of 3 Level 3 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: 2 Линии L3 в тумане." : "BLUEPRINT: 2 L3 Lines in fog.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 4.17: Синдикат
  {
    id: '4.17',
    title: 'Sim 4.17: Синдикат',
    description: 'Одновременно противостоять BUILDER, DIGGER и DESTROYER. Собрать TRIANGLE_3 L4.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 200, moves: 50, rank: 5, materials: 25 },
    goalText: 'Build TRIANGLE_3 (Level 4)',
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 0, r: -5 }, { q: -4, r: 0 }, { q: 4, r: -4 }],
    requiredShapes: [{ type: 'TRIANGLE_3', level: 4, hint: 'Build a TRIANGLE shape of Level 4 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Треугольник L4." : "BLUEPRINT: L4 Triangle.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 4.18: Темное Ядро
  {
    id: '4.18',
    title: 'Sim 4.18: Темное Ядро',
    description: 'Доставить Void Core на Монумент в условиях полной потери видимости.',
    objectiveHexes: [ { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' } ],
    mapConfig: { size: 5, type: 'procedural', revealMode: 'fog' },
    startState: { credits: 100, moves: 35, rank: 5, materials: 12, startInventory: ['void_core'] },
    goalText: 'Deliver Void Core to Monument',
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: -4, r: 4 }],
    getTutorialHint: (state) => state.language === 'RU' ? "ДОСТАВКА: Void Core к Монументу!" : "DELIVERY: Void Core to Monument!",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: (state) => {
        if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [true];
    } }
  },
  // 4.19: Гонка Резонанса
  {
    id: '4.19',
    title: 'Sim 4.19: Гонка Резонанса',
    description: 'Опередить ИИ в постройке Бастиона HEXAGON_7 L3.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 180, moves: 40, rank: 5, materials: 18 },
    goalText: 'Build HEXAGON_7 (Level 3) before bot',
    aiMode: 'basic',
    botObjective: 'COMPETE_RANK',
    botSpawnPoints: [{ q: 0, r: -5 }],
    requiredShapes: [{ type: 'HEXAGON_7', level: 3, hint: 'Build a HEXAGON shape of Level 3 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ГОНКА: Собери Гексагон L3 быстрее бота!" : "RACE: Build L3 Hexagon faster than bot!",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 4.20: Автономный Фронт
  {
    id: '4.20',
    title: 'Sim 4.20: Автономный Фронт',
    description: 'Эпическое сражение. Активировать Монумент, преодолевая отряды всех ботов.',
    objectiveHexes: [ { q: 0, r: -4, targetLevel: 5, label: 'Monument', color: 'emerald' } ],
    mapConfig: { size: 6, type: 'fixed', customLayout: [
        { q: 0, r: -4, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true }
    ] },
    startState: { credits: 300, moves: 60, rank: 5, materials: 30, startInventory: ['apex_core', 'architect_nanites'] },
    goalText: 'Activate Monument against the swarm',
    aiMode: 'basic',
    botObjective: 'GUARD_HEXES',
    botSpawnPoints: [
        { q: 0, r: -3 },
        { q: -3, r: 0 },
        { q: 3, r: -3 },
        { q: 4, r: -4 }
    ],
    getTutorialHint: (state) => state.language === 'RU' ? "ФИНАЛ: Прорвитесь к Монументу!" : "FINALE: Break through to the Monument!",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: (state) => {
        if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [true, true];
    } }
  }
];
