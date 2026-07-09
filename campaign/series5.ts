import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

const countOwned = (state: any, minLevel: number): number =>
  Object.values(state.grid).filter((h: any) => h.ownerId === 'player-1' && h.maxLevel >= minLevel).length;

export const series5Levels: LevelConfig[] = [
  // 5.1: Загадка Древних
  {
    id: '5.1',
    title: 'Sim 5.1: Загадка Древних',
    description: 'СЕНСОРНАЯ ДЕПРИВАЦИЯ. Активировать 3 мини-монумента в тумане, открыть чертеж и построить башни L2 на метках. Оптические датчики отключены. Действуйте в условиях нулевой видимости.',
    mapConfig: { size: 5, type: 'procedural', generateWalls: true, revealMode: 'fog' },
    objectiveHexes: [
      { q: 0, r: 1, targetLevel: 2, label: 'Alpha', color: 'indigo' },
      { q: 1, r: -1, targetLevel: 2, label: 'Beta', color: 'indigo' },
      { q: -1, r: 0, targetLevel: 2, label: 'Gamma', color: 'indigo' }
    ],
    startState: { credits: 0, moves: 10, rank: 2, materials: 1 },
    aiMode: 'none',
    getTutorialHint: (state) => {
        const isRu = state.language === 'RU';
        const count = state.activatedMiniMonuments?.length || 0;
        if (count < 3) return isRu ? `Активируйте 3 мини-монумента (${count}/3)` : `Activate 3 mini-monuments (${count}/3)`;
        return isRu ? "Постройте 3 плиты Уровня 2 на метках" : "Build 3 Level 2 plates on markers";
    },
    hooks: {
        checkWinCondition: (state) => {
            const count = state.activatedMiniMonuments?.length || 0;
            if (count < 3) return false;
            const objs = state.activeLevelConfig?.objectiveHexes;
            if (!objs) return false;
            for (const obj of objs) {
                const h = state.grid[getHexKey(obj.q, obj.r)];
                if (!h || h.currentLevel < obj.targetLevel) return false;
            }
            return true;
        },
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: (state) => {
            const count = state.activatedMiniMonuments?.length || 0;
            if (count === 3 && !(state as any)._blueprintRevealed) {
                (state as any)._blueprintRevealed = true;
                if (state.activeLevelConfig?.objectiveHexes) {
                    for (const obj of state.activeLevelConfig.objectiveHexes) {
                        const key = getHexKey(obj.q, obj.r);
                        if (state.grid[key]) {
                            state.grid[key].hologramTargetLevel = obj.targetLevel;
                        }
                    }
                }
            }
        }
    }
  },
  // 5.2: Бестелесный Вектор
  {
    id: '5.2',
    title: 'Sim 5.2: Бестелесный Вектор',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Преодолеть стену высотой 5. Использование артефакта Void Core для телепортации. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    mapConfig: { size: 5, type: 'procedural', generateWalls: true, wallStartRadius: 2, wallStartLevel: 5 },
    objectiveHexes: [ { q: 0, r: -4, targetLevel: 1, label: 'Exit', color: 'emerald' } ],
    startState: { credits: 10, moves: 8, rank: 5, materials: 1, startInventory: ['void_core'] },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Используйте Void Core для прохождения сквозь стены." : "Use Void Core to phase through walls.",
    hooks: {
        checkWinCondition: (state) => {
            const p = state.player;
            return p.q === 0 && p.r === -4;
        },
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.3: Чертеж: Воздушный Замок
  {
    id: '5.3',
    title: 'Sim 5.3: Воздушный Замок',
    description: 'МАТЕРИАЛЬНЫЙ СИНТЕЗ. Собрать Стрелу L4 (LINE_3) над пропастью VOID. Оптимизируйте маршруты сбора, чтобы опередить деградацию кластера.',
    mapConfig: { size: 5, type: 'procedural', generateWalls: true, wallType: 'void_shatter' },
    startState: { credits: 20, moves: 12, rank: 5, materials: 1 },
    requiredShapes: [{ type: 'LINE_3', level: 4, hint: 'Build a LINE of 3 Level 4 hexes' }],
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Линия L4 (Стрела)." : "BLUEPRINT: L4 Line (Arrow).",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 5.4: Наниты Вечности
  {
    id: '5.4',
    title: 'Sim 5.4: Наниты Вечности',
    description: 'СТРУКТУРНОЕ ФОРМАТИРОВАНИЕ. Построить башню L5. Использование STATUS_FREE_BUILD для бесплатной постройки при 0 материалов. Требуется предельная точность позиционирования блоков в нестабильной зоне.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 0, moves: 12, rank: 5, materials: 0, startInventory: ['architect_nanites'] },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Используйте Architect Nanites для бесплатного строительства." : "Use Architect Nanites for free building.",
    hooks: {
        checkWinCondition: (state) => countOwned(state, 5) >= 1,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.5: Инверсия Энтропии
  {
    id: '5.5',
    title: 'Sim 5.5: Инверсия Энтропии',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Инициировать Квантовый Сдвиг со STATUS_ENTROPY_INVERSION для созидания. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 25, moves: 10, rank: 5, materials: 1, initialEntropy: 90, startInventory: ['stability_scanner'] },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Активируйте Stability Scanner перед Сдвигом!" : "Activate Stability Scanner before the Shift!",
    hooks: {
        checkWinCondition: (state) => countOwned(state, 3) >= 2,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.6: Золотое Проклятие
  {
    id: '5.6',
    title: 'Sim 5.6: Золотое Проклятие',
    description: 'МАТЕРИАЛЬНЫЙ СИНТЕЗ. Накопить 1500 Кредитов. Midas Chip дает золото, но убивает пассивный доход. Оптимизируйте маршруты сбора, чтобы опередить деградацию кластера.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 200, moves: 12, rank: 5, materials: 1, startInventory: ['midas_chip'] },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Накопите 1500 кредитов!" : "Collect 1500 credits!",
    hooks: {
        checkWinCondition: (state) => (state.player.coins || 0) >= 1500,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.7: Чертеж: Ромб Бездны
  {
    id: '5.7',
    title: 'Sim 5.7: Ромб Бездны',
    description: 'МАТЕРИАЛЬНЫЙ СИНТЕЗ. Собрать Ромб L3 (DIAMOND_4), стоящий на хрупких плитах L1. Оптимизируйте маршруты сбора, чтобы опередить деградацию кластера.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 30, moves: 15, rank: 5, materials: 2 },
    requiredShapes: [{ type: 'DIAMOND_4', level: 3, hint: 'Build a DIAMOND shape of Level 3 hexes' }],
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Ромб L3." : "BLUEPRINT: L3 Diamond.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 5.8: Амнезия Overclocker'а
  {
    id: '5.8',
    title: 'Sim 5.8: Амнезия Overclocker\'а',
    description: 'СЕНСОРНАЯ ДЕПРИВАЦИЯ. Получить Ранг 5. Использование Cortex Overclocker сбрасывает разведанную карту туманом. Оптические датчики отключены. Действуйте в условиях нулевой видимости.',
    mapConfig: { size: 6, type: 'procedural', revealMode: 'all' },
    startState: { credits: 30, moves: 12, rank: 4, materials: 2, startInventory: ['cortex_overclocker'] },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Используйте Overclocker для повышения Ранга до 5." : "Use Overclocker to increase Rank to 5.",
    hooks: {
        checkWinCondition: (state) => state.player.playerLevel >= 5,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.9: Хрупкое Равновесие
  {
    id: '5.9',
    title: 'Sim 5.9: Хрупкое Равновесие',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Удержать стабильность строго на 50% в течение 15 секунд. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 15, moves: 10, rank: 5, materials: 1, initialEntropy: 30 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Держите Энтропию ровно на 50%." : "Keep Entropy exactly at 50%.",
    hooks: {
        checkWinCondition: (state) => {
            const time = state.currentTurn ?? 0;
            if (time === 0) return false;
            if (state.entropy?.current === 50) {
                state.stableStartTime = state.stableStartTime || time;
                if (time - state.stableStartTime >= 15) return true;
            } else {
                state.stableStartTime = 0;
            }
            return false;
        },
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.10: Лабиринт Клаустрофобии
  {
    id: '5.10',
    title: 'Sim 5.10: Лабиринт Клаустрофобии',
    description: 'ЛОГИСТИЧЕСКИЙ ВЕКТОР. Достичь центра за 20 ходов. Узкий спиральный коридор, разрушающийся за спиной. Избегайте столкновений с защитными подпрограммами ИИ.',
    mapConfig: { size: 5, type: 'procedural', generateWalls: true, wallType: 'pit_ring' },
    objectiveHexes: [ { q: 0, r: 0, targetLevel: 1, label: 'Center', color: 'emerald' } ],
    startState: { credits: 10, moves: 8, rank: 2, materials: 1 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Достигните центра (0,0) за 20 ходов." : "Reach center (0,0) in 20 turns.",
    hooks: {
        checkWinCondition: (state) => state.player.q === 0 && state.player.r === 0,
        checkLossCondition: (state) => (state.currentTurn ?? 0) >= 20 || isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.11: Чертеж: Пирамида Хеопса
  {
    id: '5.11',
    title: 'Sim 5.11: Пирамида Хеопса',
    description: 'СТРУКТУРНОЕ ФОРМАТИРОВАНИЕ. Построить 3-ярусную ступенчатую пирамиду (PYRAMID_6 L3). Требуется предельная точность позиционирования блоков в нестабильной зоне.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 45, moves: 15, rank: 5, materials: 3 },
    requiredShapes: [{ type: 'PYRAMID_6', level: 3, hint: 'Build a PYRAMID shape with peak at Level 3' }],
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Пирамида L3." : "BLUEPRINT: L3 Pyramid.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 5.12: Проклятие Apex Core
  {
    id: '5.12',
    title: 'Sim 5.12: Проклятие Apex Core',
    description: 'ПРОТОКОЛ ВЫЖИВАНИЯ. Выжить 40 секунд. Активация Apex Core дает бессмертие, но затем обнуляет ресурсы. Активируйте защитные паттерны и следите за стабильностью сектора.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 50, moves: 15, rank: 5, materials: 2, startInventory: ['apex_core'] },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Выживите 40 секунд." : "Survive for 40 seconds.",
    hooks: {
        checkWinCondition: (state) => (state.currentTurn ?? 0) >= 40,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.13: Слияние Двух Миров
  {
    id: '5.13',
    title: 'Sim 5.13: Слияние Двух Миров',
    description: 'СТРУКТУРНОЕ ФОРМАТИРОВАНИЕ. Построить DIAMOND_4 в шахте L-2 и DIAMOND_4 на суше L2. Требуется предельная точность позиционирования блоков в нестабильной зоне.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 30, moves: 12, rank: 5, materials: 2 },
    requiredShapes: [
        { type: 'DIAMOND_4', level: -2, hint: 'Build a DIAMOND at Level -2' },
        { type: 'DIAMOND_4', level: 2, hint: 'Build a DIAMOND at Level 2' }
    ],
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Ромб L-2 и Ромб L2." : "BLUEPRINT: Diamond L-2 and Diamond L2.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 5.14: Термальный Предел
  {
    id: '5.14',
    title: 'Sim 5.14: Термальный Предел',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Охладить (восстановить) 3 реактора L4+. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    mapConfig: { size: 5, type: 'fixed', customLayout: [
        { q: 0, r: -2, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true },
        { q: 2, r: 0, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true },
        { q: -2, r: 2, maxLevel: 4, currentLevel: 4, ownerId: 'player-1', revealed: true }
    ] },
    startState: { credits: 20, moves: 10, rank: 5, materials: 1 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Активируйте Восстановление (RECOVER) на всех 3 башнях." : "Use RECOVER on all 3 towers.",
    hooks: {
        checkWinCondition: (state) => (state.restoredHexesCount ?? 0) >= 3,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.15: Чертеж: Глаз Бури
  {
    id: '5.15',
    title: 'Sim 5.15: Глаз Бури',
    description: 'МАТЕРИАЛЬНЫЙ СИНТЕЗ. Собрать Малое Кольцо L3 (RING_6), окруженное пустотой. Оптимизируйте маршруты сбора, чтобы опередить деградацию кластера.',
    mapConfig: { size: 6, type: 'procedural', generateWalls: true, wallType: 'void_shatter' },
    startState: { credits: 40, moves: 15, rank: 5, materials: 3 },
    requiredShapes: [{ type: 'RING_6', level: 3, hint: 'Build a RING shape of Level 3 hexes' }],
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Кольцо L3." : "BLUEPRINT: L3 Ring.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 5.16: Танец с Тенью
  {
    id: '5.16',
    title: 'Sim 5.16: Танец с Тенью',
    description: 'СЕНСОРНАЯ ДЕПРИВАЦИЯ. Избежать столкновения с ботом в тумане и собрать 200 Кредитов. Оптические датчики отключены. Действуйте в условиях нулевой видимости.',
    mapConfig: { size: 6, type: 'procedural', revealMode: 'fog' },
    startState: { credits: 25, moves: 12, rank: 3, materials: 2 },
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 0, r: -5 }],
    getTutorialHint: (state) => state.language === 'RU' ? "ТУМАН: Собери 200 Кредитов, избегая бота." : "FOG: Collect 200 Credits, avoid the bot.",
    hooks: {
        checkWinCondition: (state) => (state.player.coins || 0) >= 200,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.17: Фрактальный Коллапс
  {
    id: '5.17',
    title: 'Sim 5.17: Фрактальный Коллапс',
    description: 'МАТЕРИАЛЬНЫЙ СИНТЕЗ. Собрать Стрелу L3 (LINE_3) во время сильных энтропийных сдвигов. Оптимизируйте маршруты сбора, чтобы опередить деградацию кластера.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 30, moves: 12, rank: 4, materials: 2, initialEntropy: 95 },
    requiredShapes: [{ type: 'LINE_3', level: 3, hint: 'Build a LINE of 3 Level 3 hexes' }],
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Линия L3 в нестабильной зоне." : "BLUEPRINT: L3 Line in unstable zone.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 5.18: Шахты Забвения
  {
    id: '5.18',
    title: 'Sim 5.18: Шахты Забвения',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Пробурить шахту до -10 под пассивным секундным износом ходов. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 10, moves: 15, rank: 2, materials: 1 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Достигните глубины -10." : "Reach depth -10.",
    hooks: {
        checkWinCondition: (state) => {
            const h = state.grid[getHexKey(state.player.q, state.player.r)];
            return h && h.currentLevel <= -10;
        },
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.19: Чертеж: Тектонический Клин
  {
    id: '5.19',
    title: 'Sim 5.19: Тектонический Клин',
    description: 'СТРУКТУРНОЕ ФОРМАТИРОВАНИЕ. Выстроить 3 плиты уровня L4 (LINE_3 L4). Требуется предельная точность позиционирования блоков в нестабильной зоне.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 30, moves: 12, rank: 5, materials: 2 },
    requiredShapes: [{ type: 'LINE_3', level: 4, hint: 'Build a LINE of 3 Level 4 hexes' }],
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Линия L4." : "BLUEPRINT: L4 Line.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 5.20: Силовая Капсула
  {
    id: '5.20',
    title: 'Sim 5.20: Силовая Капсула',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Зарядить Монумент 500 кредитами. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    objectiveHexes: [ { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' } ],
    mapConfig: { size: 5, type: 'fixed', customLayout: [{q:0, r:0, maxLevel:5, currentLevel:5, structureType:'MONUMENT', revealed:true}] },
    startState: { credits: 50, moves: 12, rank: 5, materials: 1 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Накопите 500 Кредитов и активируйте Монумент." : "Collect 500 Credits and activate Monument.",
    hooks: {
        checkWinCondition: (state) => {
            const onMon = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
            return !!onMon && (state.player.coins || 0) >= 500;
        },
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.21: Проклятый Обелиск
  {
    id: '5.21',
    title: 'Sim 5.21: Проклятый Обелиск',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Нейтрализовать Обелиск, излучающий гравитационное поле. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 25, moves: 12, rank: 5, materials: 2 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Найдите и активируйте Обелиск!" : "Find and activate the Obelisk!",
    hooks: {
        checkWinCondition: (state) => (state.activatedMiniMonuments?.length || 0) > 0,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.22: Чертеж: Звездные Врата
  {
    id: '5.22',
    title: 'Sim 5.22: Звездные Врата',
    description: 'СТРУКТУРНОЕ ФОРМАТИРОВАНИЕ. Построить 2 смежных кольца уровня L2 (RING_6). Требуется предельная точность позиционирования блоков в нестабильной зоне.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 45, moves: 18, rank: 5, materials: 3 },
    requiredShapes: [
        { type: 'RING_6', level: 2, hint: 'Build a RING shape of Level 2 hexes' },
        { type: 'RING_6', level: 2, hint: 'Build a second RING shape of Level 2 hexes' }
    ],
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Два Кольца L2." : "BLUEPRINT: Two L2 Rings.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 5.23: Саботаж Энергосети
  {
    id: '5.23',
    title: 'Sim 5.23: Саботаж Энергосети',
    description: 'СТРУКТУРНОЕ ФОРМАТИРОВАНИЕ. Построить 5 реакторов (плит L4) под натиском ботов. Требуется предельная точность позиционирования блоков в нестабильной зоне.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 20, moves: 12, rank: 5, materials: 2 },
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: -4, r: 0 }, { q: 4, r: 0 }],
    getTutorialHint: (state) => state.language === 'RU' ? "Постройте 5 плит L4." : "Build 5 Level 4 plates.",
    hooks: {
        checkWinCondition: (state) => countOwned(state, 4) >= 5,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.24: Квантовая Суперпозиция
  {
    id: '5.24',
    title: 'Sim 5.24: Квантовая Суперпозиция',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Удержать две башни L4, избегая случайных сдвигов. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 30, moves: 12, rank: 5, materials: 2, initialEntropy: 85 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Удерживайте 2 плиты L4." : "Hold two Level 4 plates.",
    hooks: {
        checkWinCondition: (state) => {
             const c = countOwned(state, 4);
             if (c >= 2) {
                 state.stableStartTime = state.stableStartTime || state.currentTurn;
                 if ((state.currentTurn ?? 0) - (state.stableStartTime || 0) >= 10) return true;
             } else {
                 state.stableStartTime = 0;
             }
             return false;
        },
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.25: Чертеж: Бесконечная Петля
  {
    id: '5.25',
    title: 'Sim 5.25: Бесконечная Петля',
    description: 'МАТЕРИАЛЬНЫЙ СИНТЕЗ. Собрать звезду из 7 плит уровня L3 (STAR_7 L3). Оптимизируйте маршруты сбора, чтобы опередить деградацию кластера.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 40, moves: 15, rank: 5, materials: 3 },
    requiredShapes: [{ type: 'STAR_7', level: 3, hint: 'Build a STAR shape of Level 3 hexes' }],
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Звезда L3." : "BLUEPRINT: L3 Star.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: () => {} }
  },
  // 5.26: Нулевая Точка
  {
    id: '5.26',
    title: 'Sim 5.26: Нулевая Точка',
    description: 'МАТЕРИАЛЬНЫЙ СИНТЕЗ. Накопить 50 Кредитов. Экстремальный старт без ресурсов. Поиск первой крохи материалов в завалах. Оптимизируйте маршруты сбора, чтобы опередить деградацию кластера.',
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 0, moves: 0, rank: 1, materials: 0, startInventory: ['raw_container'] },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Используйте Container для получения ресурсов." : "Use Container to get initial resources.",
    hooks: {
        checkWinCondition: (state) => (state.player.coins || 0) >= 50,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.27: Могила Титанов
  {
    id: '5.27',
    title: 'Sim 5.27: Могила Титанов',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Активировать Древний Монолит, доставив 3 легендарных ключа. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    objectiveHexes: [ { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' } ],
    secretLootHexes: [
        {q: 0, r: -5, itemBaseId: 'apex_core', level: -2},
        {q: -4, r: 4, itemBaseId: 'void_core', level: -2},
        {q: 5, r: 0, itemBaseId: 'midas_chip', level: -2}
    ],
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 50, moves: 15, rank: 5, materials: 2 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Соберите ключи и активируйте Монумент." : "Collect keys and activate Monument.",
    hooks: { checkWinCondition: () => false, checkLossCondition: (state) => isStranded(state), onAfterAction: (state) => {
        if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [true, true, true];
    } }
  },
  // 5.28: Логическая Петля
  {
    id: '5.28',
    title: 'Sim 5.28: Логическая Петля',
    description: 'ЛОГИСТИЧЕСКИЙ ВЕКТОР. Достичь точки (3,3). Нарушение последовательности высот телепортирует игрока назад. Избегайте столкновений с защитными подпрограммами ИИ.',
    objectiveHexes: [ { q: 3, r: 3, targetLevel: 1, label: 'Target', color: 'emerald' } ],
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 35, moves: 12, rank: 5, materials: 2 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Достигните гекса (3,3)." : "Reach hex (3,3).",
    hooks: {
        checkWinCondition: (state) => state.player.q === 3 && state.player.r === 3,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.29: Избыточное Давление
  {
    id: '5.29',
    title: 'Sim 5.29: Избыточное Давление',
    description: 'СТРУКТУРНОЕ ФОРМАТИРОВАНИЕ. Возвести плиту L6. Требуется колоссальная, математически выверенная пирамида поддержки. Требуется предельная точность позиционирования блоков в нестабильной зоне.',
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 60, moves: 18, rank: 6, materials: 4 },
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Постройте платформу L6." : "Build a Level 6 platform.",
    hooks: {
        checkWinCondition: (state) => countOwned(state, 6) >= 1,
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: () => {}
    }
  },
  // 5.30: Омега Синтез
  {
    id: '5.30',
    title: 'Sim 5.30: Омега Синтез',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. Великий Финал. Удержать 3 гекса на L3+, собрать 300 Кредитов, вставить 2 ключа, Энтропия <60%. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    objectiveHexes: [ { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' } ],
    secretLootHexes: [
        {q: -3, r: 0, itemBaseId: 'apex_core', level: -2},
        {q: 3, r: -3, itemBaseId: 'void_core', level: -2}
    ],
    mapConfig: { size: 7, type: 'procedural' },
    startState: { credits: 60, moves: 15, rank: 5, materials: 3 },
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 0, r: -5 }, { q: -5, r: 5 }],
    getTutorialHint: (state) => state.language === 'RU' ? "ФИНАЛ: Выполните все условия и активируйте Монумент!" : "FINALE: Fulfill all conditions and activate the Monument!",
    hooks: {
        checkWinCondition: (state) => {
            // Must have activated monument (which sets portalActive = true)
            if (!state.portalActive) return false;
            // Uphold 3 hexes on L3+
            if (countOwned(state, 3) < 3) return false;
            // 300 Credits
            if ((state.player.coins || 0) < 300) return false;
            // Entropy < 60%
            if ((state.entropy?.current ?? 0) >= 60) return false;
            return true;
        },
        checkLossCondition: (state) => isStranded(state),
        onAfterAction: (state) => {
            if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [true, true];
        }
    }
  }
];
