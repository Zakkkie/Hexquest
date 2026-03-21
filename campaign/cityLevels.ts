import { LevelConfig } from '../campaign/types';
import { generateCityLevelLayout, CITY_NPC_ROUTES } from '../services/CityGenerator';
import { Hex } from '../types';

// ─── City Streets (Main Level) ────────────────────────────────────────────────

export const cityStreetsLevel: LevelConfig = {
    id: 'city_streets',
    title: 'Город',
    description: 'Улицы города. Исследуй кварталы, посещай здания и торгуй с жителями.',
    freeMovement: true,
    isCityLevel: true,
    mapConfig: {
        size: 7,
        type: 'fixed',
        generateWalls: false,
        customLayout: generateCityLevelLayout(),
    },
    startState: {
        credits: 0,
        moves: 999,
        rank: 0,
        materials: 0,
        initialEntropy: 0,
    },
    aiMode: 'dummy',
    botRoutes: CITY_NPC_ROUTES,
    goalText: 'Исследуй город',
    hooks: {
        checkWinCondition: () => false,
        checkLossCondition: () => false,
    },
};

// ─── Building Interior Layout Helper ─────────────────────────────────────────
// A small 3-wide × 5-tall room: 3×3 floor + 1 counter row + 1 entrance row.

function makeBuildingLayout(): Partial<Hex>[] {
    const layout: Partial<Hex>[] = [];
    // Floor area: 3×3 at r ∈ [-1,1], q ∈ [-1,1]
    for (let q = -1; q <= 1; q++) {
        for (let r = -1; r <= 1; r++) {
            layout.push({ q, r, maxLevel: 0, currentLevel: 0, revealed: true });
        }
    }
    // Counter row at back (r = -2)
    for (let q = -1; q <= 1; q++) {
        layout.push({ q, r: -2, maxLevel: 1, currentLevel: 1, revealed: true });
    }
    // Entrance (r = 2) — floor level, where player spawns
    for (let q = -1; q <= 1; q++) {
        layout.push({ q, r: 2, maxLevel: 0, currentLevel: 0, revealed: true });
    }
    return layout;
}

const BUILDING_START_STATE: LevelConfig['startState'] = {
    credits: 0,
    moves: 999,
    rank: 0,
    materials: 0,
    initialEntropy: 0,
};

const NO_WIN_LOSS: LevelConfig['hooks'] = {
    checkWinCondition:  () => false,
    checkLossCondition: () => false,
};

// ─── Building Mini-Levels ─────────────────────────────────────────────────────

export const cityBuildingLevels: LevelConfig[] = [
    {
        id: 'city_inn',
        title: 'Путников Трактир',
        description: 'Отдохни и восстанови здоровье за монеты.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'inn',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Отдохни в трактире',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_blacksmith',
        title: 'Кузница',
        description: 'Улучши снаряжение или закажи оружие у мастера.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'blacksmith',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Крафт и улучшение',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_market',
        title: 'Большой Рынок',
        description: 'Купи и продай предметы. Здесь найдёшь всё.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'market',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Торговля',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_alchemist',
        title: 'Лаборатория Алхимика',
        description: 'Создай зелья и алхимические составы.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'alchemist',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Алхимия',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_temple',
        title: 'Храм Строителей',
        description: 'Место силы. Влияй на свою репутацию и судьбу.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'temple',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Взаимодействие с Орденом',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_archive',
        title: 'Архив',
        description: 'Хранилище знаний эпохи Строителей. Найди ответы на вопросы.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'archive',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Исследование летописей',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_tavern',
        title: 'Таверна «Три перекрёстка»',
        description: 'Послушай слухи, выпей и узнай то, что не пишут в свитках.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'tavern',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Слухи и наводки',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_healer',
        title: 'Лечебница',
        description: 'Восстанови здоровье и энергию у целителя.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'healer',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Лечение',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_guard_post',
        title: 'Пост Стражи',
        description: 'Получи задания Синдиката или договорись со стражниками.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'guard_post',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Задания Синдиката',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_watchtower',
        title: 'Дозорная башня',
        description: 'С высоты открывается вид на земли вокруг. Сними туман.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'watchtower',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Разведка',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_notice_board',
        title: 'Доска объявлений',
        description: 'Задания, вознаграждения и слухи для всех желающих.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'notice_board',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Доска заданий',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_storage',
        title: 'Склад',
        description: 'Расширь место для хранения добытого.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'storage',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Расширение хранилища',
        hooks: NO_WIN_LOSS,
    },
    {
        id: 'city_hub',
        title: 'Центральная площадь',
        description: 'Сердце города. Отсюда открывается путь во все кварталы.',
        isCityLevel: true,
        freeMovement: true,
        buildingType: 'hub',
        mapConfig: { size: 3, type: 'fixed', generateWalls: false, customLayout: makeBuildingLayout() },
        startState: BUILDING_START_STATE,
        aiMode: 'none',
        goalText: 'Центральная площадь',
        hooks: NO_WIN_LOSS,
    },
];

export const allCityLevels: LevelConfig[] = [cityStreetsLevel, ...cityBuildingLevels];
