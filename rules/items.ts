
import { Item, ItemRarity, ItemEffectType, NegativeEffectType, Language, Difficulty } from '../types';

interface ItemDefinition {
    idPrefix: string;
    rarity: ItemRarity;
    name: Record<Language, string>;
    description: Record<Language, string>;
    visualType: 'CYLINDER' | 'CHIP' | 'BOX' | 'PATCH' | 'SCANNER' | 'PRISM' | 'DRILL' | 'GENERATOR' | 'PARTICLES' | 'SPINE' | 'CORE' | 'SKULL' | 'ARMOR' | 'BOOTS' | 'RING' | 'NECKLACE' | 'HELMET' | 'FOOD' | 'POTION' | 'GEM' | 'BAR' | 'SWORD' | 'DAGGER' | 'AXE' | 'MACE' | 'SPEAR' | 'STAFF' | 'BOW' | 'GUN' | 'FIST' | 'THROWING' | 'BOOK';
    visualColor: string;
    effectType: ItemEffectType;
    effectValue: number;
    effectDuration?: number; // ms
    effectLabel: Record<Language, string>;
    
    // Negative Effects
    negativeEffectType: NegativeEffectType;
    negativeEffectValue?: number;
    negativeEffectDuration?: number; // ms
    negativeEffectLabel: Record<Language, string>;

    iconUrl?: string;
    equipSlot?: 'head' | 'body' | 'feet' | 'necklace' | 'ring' | 'tool' | 'artifact';
    maxHpBonus?: number;
    maxEnergyBonus?: number;
}

export const ITEM_REGISTRY: ItemDefinition[] = [
    {
        idPrefix: 'iron_plate',
        rarity: 'COMMON',
        name: { EN: 'Iron Plate', RU: 'Железная Пластина' },
        description: { EN: 'Basic iron protection. +15 Max HP.', RU: 'Базовая железная защита. +15 Макс. Здоровье.' },
        visualType: 'ARMOR',
        visualColor: '#94a3b8',
        iconUrl: 'A_Armour01.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+15 Max HP', RU: '+15 Макс. Здоровье' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 10,
        negativeEffectLabel: { EN: 'Heavy (-10 Cr)', RU: 'Тяжелая (-10 Кр)' },
        equipSlot: 'body',
        maxHpBonus: 15
    },
    {
        idPrefix: 'steel_plate',
        rarity: 'UNCOMMON',
        name: { EN: 'Steel Plate', RU: 'Стальной Доспех' },
        description: { EN: 'Strong steel protection. +30 Max HP.', RU: 'Прочная стальная защита. +30 Макс. Здоровье.' },
        visualType: 'ARMOR',
        visualColor: '#cbd5e1',
        iconUrl: 'A_Armour02.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+30 Max HP', RU: '+30 Макс. Здоровье' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 30000,
        negativeEffectLabel: { EN: 'Heavy (Fatigue)', RU: 'Тяжелая (Усталость)' },
        equipSlot: 'body',
        maxHpBonus: 30
    },
    {
        idPrefix: 'titanium_suit',
        rarity: 'RARE',
        name: { EN: 'Titanium Suit', RU: 'Титановый Костюм' },
        description: { EN: 'Advanced titanium protection. +50 Max HP.', RU: 'Продвинутая титановая защита. +50 Макс. Здоровье.' },
        visualType: 'ARMOR',
        visualColor: '#475569',
        iconUrl: 'A_Armor04.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+50 Max HP', RU: '+50 Макс. Здоровье' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 60000,
        negativeEffectLabel: { EN: 'Very Heavy (Fatigue)', RU: 'Очень тяжелая (Усталость)' },
        equipSlot: 'body',
        maxHpBonus: 50
    },
    {
        idPrefix: 'leather_boots',
        rarity: 'COMMON',
        name: { EN: 'Leather Boots', RU: 'Кожаные Сапоги' },
        description: { EN: 'Simple leather boots. +5 Max Energy.', RU: 'Простые кожаные сапоги. +5 Макс. Энергии.' },
        visualType: 'BOOTS',
        visualColor: '#78350f',
        iconUrl: 'A_Shoes01.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+5 Max Energy', RU: '+5 Макс. Энергии' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: 'Maintenance (-5 Cr)', RU: 'Обслуживание (-5 Кр)' },
        equipSlot: 'feet',
        maxEnergyBonus: 5
    },
    {
        idPrefix: 'tutorial_mark',
        rarity: 'RARE',
        name: { EN: 'Syndicate Mark', RU: 'Метка Синдиката' },
        description: { EN: 'A proof of completing a simulation level.', RU: 'Доказательство прохождения уровня симуляции.' },
        visualType: 'CHIP',
        visualColor: '#f59e0b',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: 'Proof of Rank', RU: 'Доказательство Ранга' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 0,
        negativeEffectLabel: { EN: '', RU: '' },
    },
    {
        idPrefix: 'speed_boots',
        rarity: 'UNCOMMON',
        name: { EN: 'Speed Boots', RU: 'Сапоги Скорости' },
        description: { EN: 'Aerodynamic boots. +15 Max Energy.', RU: 'Аэродинамичные сапоги. +15 Макс. Энергии.' },
        visualType: 'BOOTS',
        visualColor: '#38bdf8',
        iconUrl: 'A_Shoes03.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+15 Max Energy', RU: '+15 Макс. Энергии' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 15000,
        negativeEffectLabel: { EN: 'Overheat (Fatigue)', RU: 'Перегрев (Усталость)' },
        equipSlot: 'feet',
        maxEnergyBonus: 15
    },
    {
        idPrefix: 'silver_ring',
        rarity: 'COMMON',
        name: { EN: 'Silver Ring', RU: 'Серебряное Кольцо' },
        description: { EN: 'A simple silver band. +20 Credits.', RU: 'Простое серебряное кольцо. +20 Кредитов.' },
        visualType: 'RING',
        visualColor: '#94a3b8',
        iconUrl: 'Ac_Ring01.png',
        effectType: 'ADD_CREDITS',
        effectValue: 20,
        effectLabel: { EN: '+20 Credits', RU: '+20 Кредитов' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 1,
        negativeEffectLabel: { EN: 'Distraction (-1 Move)', RU: 'Отвлечение (-1 Ход)' },
        equipSlot: 'ring'
    },
    {
        idPrefix: 'ruby_ring',
        rarity: 'UNCOMMON',
        name: { EN: 'Ruby Ring', RU: 'Кольцо с Рубином' },
        description: { EN: 'A ring with a small ruby. +50 Credits.', RU: 'Кольцо с небольшим рубином. +50 Кредитов.' },
        visualType: 'RING',
        visualColor: '#f43f5e',
        iconUrl: 'Ac_Ring02.png',
        effectType: 'ADD_CREDITS',
        effectValue: 50,
        effectLabel: { EN: '+50 Credits', RU: '+50 Кредитов' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 2,
        negativeEffectLabel: { EN: 'Heavy (-2 Moves)', RU: 'Тяжелое (-2 Хода)' },
        equipSlot: 'ring'
    },
    {
        idPrefix: 'emerald_necklace',
        rarity: 'UNCOMMON',
        name: { EN: 'Emerald Necklace', RU: 'Изумрудное Ожерелье' },
        description: { EN: 'A necklace with an emerald. +5% Stability.', RU: 'Ожерелье с изумрудом. +5% Стабильности.' },
        visualType: 'NECKLACE',
        visualColor: '#10b981',
        iconUrl: 'Ac_Necklace01.png',
        effectType: 'ADD_ENTROPY',
        effectValue: 5,
        effectLabel: { EN: '+5% Stability', RU: '+5% Стабильности' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 20,
        negativeEffectLabel: { EN: 'Maintenance (-20 Cr)', RU: 'Обслуживание (-20 Кр)' },
        equipSlot: 'necklace'
    },
    {
        idPrefix: 'diamond_necklace',
        rarity: 'RARE',
        name: { EN: 'Diamond Necklace', RU: 'Бриллиантовое Ожерелье' },
        description: { EN: 'A necklace with a diamond. +15% Stability.', RU: 'Ожерелье с бриллиантом. +15% Стабильности.' },
        visualType: 'NECKLACE',
        visualColor: '#f1f5f9',
        iconUrl: 'Ac_Necklace02.png',
        effectType: 'ADD_ENTROPY',
        effectValue: 15,
        effectLabel: { EN: '+15% Stability', RU: '+15% Стабильности' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 50,
        negativeEffectLabel: { EN: 'Expensive (-50 Cr)', RU: 'Дорогое (-50 Кр)' },
        equipSlot: 'necklace'
    },
    {
        idPrefix: 'fuel_cell',
        rarity: 'COMMON',
        name: { EN: 'Spent Fuel Cell', RU: 'Отработанный Элемент' },
        description: { EN: 'Dull glass cylinder with green residue.', RU: 'Потускневший цилиндр с осадком.' },
        visualType: 'CYLINDER',
        visualColor: '#4ade80',
        iconUrl: 'I_Bottle01.png',
        effectType: 'ADD_MOVES',
        effectValue: 3,
        effectLabel: { EN: '+3 Moves', RU: '+3 Хода' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 15,
        negativeEffectLabel: { EN: '-15 Credits (Fine)', RU: '-15 Кредитов (Штраф)' }
    },
    {
        idPrefix: 'data_disc',
        rarity: 'COMMON',
        name: { EN: 'Fragmented Data Disc', RU: 'Битый Диск Данных' },
        description: { EN: 'Orange chip with a crack.', RU: 'Оранжевый чип с трещиной.' },
        visualType: 'CHIP',
        visualColor: '#fb923c',
        iconUrl: 'I_Scroll.png',
        effectType: 'ADD_CREDITS',
        effectValue: 15,
        effectLabel: { EN: '+15 Credits', RU: '+15 Кредитов' },
        negativeEffectType: 'RESET_MATERIALS',
        negativeEffectLabel: { EN: 'System Error: Mat=0', RU: 'Сбой: Материалы=0' }
    },
    {
        idPrefix: 'raw_container',
        rarity: 'COMMON',
        name: { EN: 'Raw Container', RU: 'Грубый Контейнер' },
        description: { EN: 'Rusty metal box, dark inside.', RU: 'Ржавый ящик, внутри темнота.' },
        visualType: 'BOX',
        visualColor: '#78350f',
        iconUrl: 'I_Chest01.png',
        effectType: 'ADD_MATERIAL',
        effectValue: 2,
        effectLabel: { EN: '+2 Material', RU: '+2 Материала' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 3,
        negativeEffectLabel: { EN: '-3 Moves (Exhaustion)', RU: '-3 Хода (Вскрытие)' }
    },
    {
        idPrefix: 'reality_patch',
        rarity: 'COMMON',
        name: { EN: 'Reality Patch', RU: 'Лоскут Реальности' },
        description: { EN: 'Tape made of frozen light.', RU: 'Скотч из застывшего света.' },
        visualType: 'PATCH',
        visualColor: '#60a5fa',
        iconUrl: 'I_Fabric.png',
        effectType: 'ADD_ENTROPY',
        effectValue: 3,
        effectLabel: { EN: '+3% Stability', RU: '+3% Энтропии' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 10,
        negativeEffectLabel: { EN: '-10 Credits (Waste)', RU: '-10 Кредитов' }
    },

    // --- ARMOR & CLOTHING ---
    {
        idPrefix: 'armor_light',
        rarity: 'COMMON',
        name: { EN: 'Light Armor', RU: 'Легкая Броня' },
        description: { EN: 'Simple leather vest.', RU: 'Простой кожаный жилет.' },
        visualType: 'ARMOR',
        visualColor: '#94a3b8',
        iconUrl: 'A_Armour01.png',
        effectType: 'ADD_MOVES',
        effectValue: 2,
        effectLabel: { EN: '+2 Moves', RU: '+2 Хода' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: 'Maintenance (-5 Cr)', RU: 'Обслуживание (-5 Кр)' },
        equipSlot: 'body'
    },
    {
        idPrefix: 'armor_plate',
        rarity: 'UNCOMMON',
        name: { EN: 'Plate Armor', RU: 'Пластинчатый Доспех' },
        description: { EN: 'Heavy steel plates.', RU: 'Тяжелые стальные пластины.' },
        visualType: 'ARMOR',
        visualColor: '#cbd5e1',
        iconUrl: 'A_Armour02.png',
        effectType: 'ADD_MOVES',
        effectValue: 5,
        effectLabel: { EN: '+5 Moves', RU: '+5 Ходов' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 30000,
        negativeEffectLabel: { EN: 'Heavy (Fatigue)', RU: 'Тяжелый (Усталость)' },
        equipSlot: 'body'
    },
    {
        idPrefix: 'armor_heavy',
        rarity: 'RARE',
        name: { EN: 'Heavy Armor', RU: 'Тяжелый Доспех' },
        description: { EN: 'Reinforced battle suit.', RU: 'Усиленный боевой костюм.' },
        visualType: 'ARMOR',
        visualColor: '#475569',
        iconUrl: 'A_Armor04.png',
        effectType: 'ADD_MOVES',
        effectValue: 10,
        effectLabel: { EN: '+10 Moves', RU: '+10 Ходов' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 60000,
        negativeEffectLabel: { EN: 'Very Heavy (Fatigue)', RU: 'Очень тяжелый (Усталость)' },
        equipSlot: 'body'
    },

    // --- SHOES ---
    {
        idPrefix: 'shoes_leather',
        rarity: 'COMMON',
        name: { EN: 'Leather Shoes', RU: 'Кожаные Сапоги' },
        description: { EN: 'Comfortable for walking.', RU: 'Удобны для ходьбы.' },
        visualType: 'BOOTS',
        visualColor: '#78350f',
        iconUrl: 'A_Shoes01.png',
        effectType: 'ADD_MOVES',
        effectValue: 4,
        effectLabel: { EN: '+4 Moves', RU: '+4 Хода' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 2,
        negativeEffectLabel: { EN: 'Wear (-2 Cr)', RU: 'Износ (-2 Кр)' },
        equipSlot: 'feet'
    },
    {
        idPrefix: 'shoes_swift',
        rarity: 'UNCOMMON',
        name: { EN: 'Swift Boots', RU: 'Сапоги Скорости' },
        description: { EN: 'Lightweight and aerodynamic.', RU: 'Легкие и аэродинамичные.' },
        visualType: 'BOOTS',
        visualColor: '#38bdf8',
        iconUrl: 'A_Shoes03.png',
        effectType: 'ADD_MOVES',
        effectValue: 8,
        effectLabel: { EN: '+8 Moves', RU: '+8 Ходов' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 10,
        negativeEffectLabel: { EN: 'Maintenance (-10 Cr)', RU: 'Обслуживание (-10 Кр)' },
        equipSlot: 'feet'
    },

    // --- ACCESSORIES ---
    {
        idPrefix: 'ring_gold',
        rarity: 'UNCOMMON',
        name: { EN: 'Gold Ring', RU: 'Золотое Кольцо' },
        description: { EN: 'Increases credit gain.', RU: 'Увеличивает доход.' },
        visualType: 'RING',
        visualColor: '#fbbf24',
        iconUrl: 'Ac_Ring01.png',
        effectType: 'ADD_CREDITS',
        effectValue: 50,
        effectLabel: { EN: '+50 Credits', RU: '+50 Кредитов' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 2,
        negativeEffectLabel: { EN: 'Heavy (-2 Moves)', RU: 'Тяжелое (-2 Хода)' },
        equipSlot: 'ring'
    },
    {
        idPrefix: 'necklace_gem',
        rarity: 'RARE',
        name: { EN: 'Gem Necklace', RU: 'Ожерелье с Самоцветом' },
        description: { EN: 'Radiates stability.', RU: 'Излучает стабильность.' },
        visualType: 'NECKLACE',
        visualColor: '#ec4899',
        iconUrl: 'Ac_Necklace01.png',
        effectType: 'ADD_ENTROPY',
        effectValue: 10,
        effectLabel: { EN: '+10% Stability', RU: '+10% Стабильности' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 40,
        negativeEffectLabel: { EN: 'Expensive (-40 Cr)', RU: 'Дорогое (-40 Кр)' },
        equipSlot: 'necklace'
    },

    // --- HEADGEAR ---
    {
        idPrefix: 'helm_iron',
        rarity: 'UNCOMMON',
        name: { EN: 'Iron Helmet', RU: 'Железный Шлем' },
        description: { EN: 'Protective headgear.', RU: 'Защитный головной убор.' },
        visualType: 'HELMET',
        visualColor: '#64748b',
        iconUrl: 'C_Elm01.png',
        effectType: 'STATUS_SCANNER_BUFF',
        effectValue: 1,
        effectDuration: 86400000,
        effectLabel: { EN: 'Scanner Boost (+1)', RU: 'Усиление Сканера (+1)' },
        negativeEffectType: 'STATUS_TUNNEL_VISION',
        negativeEffectDuration: 10000,
        negativeEffectLabel: { EN: 'Obscured Vision', RU: 'Ограниченный Обзор' },
        equipSlot: 'head'
    },

    // --- FOOD & CONSUMABLES ---
    {
        idPrefix: 'food_banana',
        rarity: 'COMMON',
        name: { EN: 'Banana', RU: 'Банан' },
        description: { EN: 'Quick energy boost.', RU: 'Быстрый прилив энергии.' },
        visualType: 'FOOD',
        visualColor: '#facc15',
        iconUrl: 'I_C_Banana.png',
        effectType: 'ADD_MOVES',
        effectValue: 5,
        effectLabel: { EN: '+5 Moves', RU: '+5 Ходов' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 2,
        negativeEffectLabel: { EN: 'Cost (-2 Cr)', RU: 'Цена (-2 Кр)' }
    },
    {
        idPrefix: 'food_bread',
        rarity: 'COMMON',
        name: { EN: 'Fresh Bread', RU: 'Свежий Хлеб' },
        description: { EN: 'Hearty and filling.', RU: 'Сытный и питательный.' },
        visualType: 'FOOD',
        visualColor: '#d97706',
        iconUrl: 'I_C_Bread.png',
        effectType: 'ADD_MOVES',
        effectValue: 8,
        effectLabel: { EN: '+8 Moves', RU: '+8 Ходов' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: 'Cost (-5 Cr)', RU: 'Цена (-5 Кр)' }
    },
    {
        idPrefix: 'potion_blue',
        rarity: 'UNCOMMON',
        name: { EN: 'Energy Potion', RU: 'Зелье Энергии' },
        description: { EN: 'Sparkling blue liquid.', RU: 'Искрящаяся синяя жидкость.' },
        visualType: 'POTION',
        visualColor: '#3b82f6',
        iconUrl: 'P_Blue01.png',
        effectType: 'ADD_MOVES',
        effectValue: 20,
        effectLabel: { EN: '+20 Moves', RU: '+20 Ходов' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 15000,
        negativeEffectLabel: { EN: 'Crash (15s)', RU: 'Откат (15с)' }
    },

    // --- GEMS & MATERIALS ---
    {
        idPrefix: 'gem_ruby',
        rarity: 'RARE',
        name: { EN: 'Ruby', RU: 'Рубин' },
        description: { EN: 'A valuable gemstone.', RU: 'Ценный драгоценный камень.' },
        visualType: 'GEM',
        visualColor: '#f43f5e',
        iconUrl: 'I_Ruby.png',
        effectType: 'ADD_CREDITS',
        effectValue: 250,
        effectLabel: { EN: '+250 Credits', RU: '+250 Кредитов' },
        negativeEffectType: 'LOSE_ENTROPY',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: '-5% Stability', RU: '-5% Стабильности' }
    },
    {
        idPrefix: 'mat_gold_bar',
        rarity: 'RARE',
        name: { EN: 'Gold Bar', RU: 'Золотой Слиток' },
        description: { EN: 'Pure gold.', RU: 'Чистое золото.' },
        visualType: 'BAR',
        visualColor: '#fbbf24',
        iconUrl: 'I_GoldBar.png',
        effectType: 'ADD_CREDITS',
        effectValue: 500,
        effectLabel: { EN: '+500 Credits', RU: '+500 Кредитов' },
        negativeEffectType: 'STATUS_GOLD_CURSE',
        negativeEffectDuration: 30000,
        negativeEffectLabel: { EN: 'Greed (30s)', RU: 'Жадность (30с)' }
    },
    {
        idPrefix: 'rusted_scanner',
        rarity: 'COMMON',
        name: { EN: 'Rusted Scanner', RU: 'Ржавый Сканер' },
        description: { EN: 'Old screen taped to a handle. Permanent Range Boost.', RU: 'Старый экран. Увеличивает радиус обзора.' },
        visualType: 'SCANNER',
        visualColor: '#94a3b8',
        iconUrl: 'I_Telescope.png',
        effectType: 'STATUS_SCANNER_BUFF',
        effectValue: 1, 
        effectDuration: 86400000, // 24 Hours (Effectively Permanent)
        effectLabel: { EN: 'Active Scanner (Range +1)', RU: 'Активный Сканер (Радиус +1)' },
        negativeEffectType: 'LOSE_RANK',
        negativeEffectValue: 1,
        negativeEffectLabel: { EN: '-1 Rank (Malfunction)', RU: '-1 Ранг (Ожог)' },
        equipSlot: 'head'
    },
    {
        idPrefix: 'scrap_visor',
        rarity: 'COMMON',
        name: { EN: 'Scrap Visor', RU: 'Визор из Металлолома' },
        description: { EN: 'Protects eyes from dust. +1 Max HP.', RU: 'Защищает глаза от пыли. +1 Макс. Здоровье.' },
        visualType: 'HELMET',
        visualColor: '#64748b',
        iconUrl: 'C_Elm03.png',
        effectType: 'ADD_MOVES', // Placeholder, handled by equipment logic
        effectValue: 0,
        effectLabel: { EN: '+1 Max HP', RU: '+1 Макс. Здоровье' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: 'Uncomfortable (-5 Cr)', RU: 'Неудобно (-5 Кр)' },
        equipSlot: 'head',
        maxHpBonus: 1
    },
    {
        idPrefix: 'ablative_armor',
        rarity: 'UNCOMMON',
        name: { EN: 'Ablative Armor', RU: 'Абляционная Броня' },
        description: { EN: 'Ceramic plates. +10 Max HP.', RU: 'Керамические плиты. +10 Макс. Здоровье.' },
        visualType: 'ARMOR',
        visualColor: '#94a3b8',
        iconUrl: 'A_Armour03.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+10 Max HP', RU: '+10 Макс. Здоровье' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 60000,
        negativeEffectLabel: { EN: 'Heavy (Fatigue)', RU: 'Тяжелая (Усталость)' },
        equipSlot: 'body',
        maxHpBonus: 10
    },
    {
        idPrefix: 'plasma_drill',
        rarity: 'RARE',
        name: { EN: 'Plasma Drill', RU: 'Плазменный Бур' },
        description: { EN: 'Cuts through anything. +50% Dig Reward.', RU: 'Режет всё. +50% Награда за копку.' },
        visualType: 'DRILL',
        visualColor: '#f43f5e',
        iconUrl: 'W_Axe012.png',
        effectType: 'STATUS_GOLD_RUSH',
        effectValue: 1.5,
        effectDuration: 86400000,
        effectLabel: { EN: '+50% Dig Reward', RU: '+50% Награда за копку' },
        negativeEffectType: 'STATUS_BREAKDOWN_RISK',
        negativeEffectDuration: 60000,
        negativeEffectLabel: { EN: 'Overheats', RU: 'Перегревается' },
        equipSlot: 'tool'
    },
    {
        idPrefix: 'chronos_core',
        rarity: 'LEGENDARY',
        name: { EN: 'Chronos Core', RU: 'Ядро Хроноса' },
        description: { EN: 'Bends time. +20 Max Energy.', RU: 'Искажает время. +20 Макс. Энергии.' },
        visualType: 'CORE',
        visualColor: '#0ea5e9',
        iconUrl: 'I_Clock.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+20 Max Energy', RU: '+20 Макс. Энергии' },
        negativeEffectType: 'FULL_RESET',
        negativeEffectLabel: { EN: 'Time Paradox', RU: 'Временной Парадокс' },
        equipSlot: 'artifact',
        maxEnergyBonus: 20
    },
    {
        idPrefix: 'ancient_relic',
        rarity: 'RARE',
        name: { EN: 'Ancient Relic', RU: 'Древняя Реликвия' },
        description: { EN: 'A mysterious artifact from a lost civilization. +25 Max HP, +10 Max Energy.', RU: 'Таинственный артефакт затерянной цивилизации. +25 Макс. HP, +10 Макс. Энергии.' },
        visualType: 'PARTICLES',
        visualColor: '#fbbf24',
        iconUrl: 'I_Jade.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+25 HP, +10 Energy', RU: '+25 HP, +10 Энергия' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 100,
        negativeEffectLabel: { EN: 'Cursed (-100 Cr)', RU: 'Проклята (-100 Кр)' },
        equipSlot: 'artifact',
        maxHpBonus: 25,
        maxEnergyBonus: 10
    },
    {
        idPrefix: 'void_shard',
        rarity: 'LEGENDARY',
        name: { EN: 'Void Shard', RU: 'Осколок Пустоты' },
        description: { EN: 'A fragment of pure nothingness. +50 Max Energy, -20 Max HP.', RU: 'Фрагмент чистой пустоты. +50 Макс. Энергии, -20 Макс. HP.' },
        visualType: 'CORE',
        visualColor: '#4c1d95',
        iconUrl: 'I_Amethist.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+50 Energy, -20 HP', RU: '+50 Энергия, -20 HP' },
        negativeEffectType: 'LOSE_ENTROPY',
        negativeEffectValue: 15,
        negativeEffectLabel: { EN: 'Unstable (-15% Stab)', RU: 'Нестабилен (-15% Стаб)' },
        equipSlot: 'artifact',
        maxHpBonus: -20,
        maxEnergyBonus: 50
    },
    {
        idPrefix: 'heartstone_map',
        rarity: 'LEGENDARY',
        name: { EN: 'Heartstone Map', RU: 'Карта Сердечного Камня' },
        description: { EN: 'A pulsating map showing the way to the Heartstone.', RU: 'Пульсирующая карта, указывающая путь к Сердечному Камню.' },
        visualType: 'CHIP',
        visualColor: '#fbbf24',
        iconUrl: 'I_Map.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: 'Quest Item', RU: 'Квестовый предмет' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 0,
        negativeEffectLabel: { EN: '', RU: '' }
    },
    {
        idPrefix: 'energy_cell_large',
        rarity: 'UNCOMMON',
        name: { EN: 'Large Energy Cell', RU: 'Большая Энергоячейка' },
        description: { EN: 'A high-capacity power source. +30 Max Energy.', RU: 'Источник питания большой емкости. +30 Макс. Энергии.' },
        visualType: 'CYLINDER',
        visualColor: '#3b82f6',
        iconUrl: 'I_Bottle02.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+30 Max Energy', RU: '+30 Макс. Энергии' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: 'Heavy (-5 Moves)', RU: 'Тяжелая (-5 Ходов)' },
        equipSlot: 'artifact',
        maxEnergyBonus: 30
    },
    {
        idPrefix: 'nanite_repair_kit',
        rarity: 'RARE',
        name: { EN: 'Nanite Repair Kit', RU: 'Нанитовый Ремкомплект' },
        description: { EN: 'Automated repair systems. +40 Max HP.', RU: 'Автоматизированные системы ремонта. +40 Макс. HP.' },
        visualType: 'PARTICLES',
        visualColor: '#10b981',
        iconUrl: 'I_Chest02.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+40 Max HP', RU: '+40 Макс. HP' },
        negativeEffectType: 'RESET_MATERIALS',
        negativeEffectLabel: { EN: 'Consumes Materials', RU: 'Потребляет материалы' },
        equipSlot: 'artifact',
        maxHpBonus: 40
    },

    // --- UNCOMMON (Необычные) ---
    {
        idPrefix: 'cargo_prism',
        rarity: 'UNCOMMON',
        name: { EN: 'Cargo Prism', RU: 'Грузовая Призма' },
        description: { EN: 'Translucent cube with hologram.', RU: 'Куб с голограммой ящика.' },
        visualType: 'PRISM',
        visualColor: '#34d399',
        iconUrl: 'I_Crystal01.png',
        effectType: 'INCREASE_STORAGE',
        effectValue: 1,
        effectLabel: { EN: '+1 Max Storage', RU: '+1 Вместимость' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 90000, // 90s
        negativeEffectLabel: { EN: 'Fatigue (90s)', RU: 'Усталость (90с)' }
    },
    {
        idPrefix: 'hornet_drill',
        rarity: 'UNCOMMON',
        name: { EN: 'Hornet Drill Bit', RU: 'Бур «Шершень»' },
        description: { EN: 'Yellow spiral drill, laser sharp.', RU: 'Желтый спиральный бур.' },
        visualType: 'DRILL',
        visualColor: '#facc15',
        iconUrl: 'W_Axe011.png',
        effectType: 'STATUS_GOLD_RUSH',
        effectValue: 2, 
        effectDuration: 300000, // 5 minutes
        effectLabel: { EN: 'Gold Rush (5m)', RU: 'Золотая Лихорадка (5м)' },
        negativeEffectType: 'STATUS_BREAKDOWN_RISK',
        negativeEffectDuration: 45000,
        negativeEffectLabel: { EN: 'Breakdown Risk', RU: 'Риск Поломки' }
    },
    {
        idPrefix: 'emergency_gen',
        rarity: 'UNCOMMON',
        name: { EN: 'Emergency Generator', RU: 'Аварийный Генератор' },
        description: { EN: 'Copper rotor in blue field.', RU: 'Медный ротор в поле.' },
        visualType: 'GENERATOR',
        visualColor: '#3b82f6',
        iconUrl: 'E_Metal01.png',
        effectType: 'ADD_CREDITS',
        effectValue: 55,
        effectLabel: { EN: '+55 Credits', RU: '+55 Кредитов' },
        negativeEffectType: 'STATUS_MINING_OFFLINE',
        negativeEffectDuration: 75000, // 75s
        negativeEffectLabel: { EN: 'No Income (75s)', RU: 'Нет Дохода (75с)' }
    },
    {
        idPrefix: 'stability_scanner',
        rarity: 'UNCOMMON',
        name: { EN: 'Stability Scanner', RU: 'Сканер Стабильности' },
        description: { EN: 'Radar lens with green grid.', RU: 'Линза радара с сеткой.' },
        visualType: 'SCANNER',
        visualColor: '#22c55e',
        iconUrl: 'I_Telescope.png',
        effectType: 'STATUS_ENTROPY_INVERSION',
        effectValue: 1,
        effectDuration: 120000, // 2 minutes? Keeping generous for a strong buff. Let's stick to standard or match prompt. Prompt didn't specify duration for Buff, but debuff is 60s. Let's make Buff 60s too.
        effectLabel: { EN: 'Entropy Inversion', RU: 'Инверсия Энтропии' },
        negativeEffectType: 'STATUS_TUNNEL_VISION',
        negativeEffectDuration: 60000, // 60s
        negativeEffectLabel: { EN: 'Tunnel Vision (60s)', RU: 'Туннельное Зрение (60с)' }
    },

    // --- RARE (Редкие) ---
    {
        idPrefix: 'architect_nanites',
        rarity: 'RARE',
        name: { EN: 'Architect Nanites', RU: 'Наниты-Архитекторы' },
        description: { EN: 'Swarm of silver particles.', RU: 'Рой серебристых частиц.' },
        visualType: 'PARTICLES',
        visualColor: '#e2e8f0',
        iconUrl: 'I_Opal.png',
        effectType: 'STATUS_FREE_BUILD',
        effectValue: 1, 
        effectDuration: 300000, // 300s
        effectLabel: { EN: 'Free Build (5m)', RU: 'Беспл. Стройка (5м)' },
        negativeEffectType: 'LOSE_CREDITS', 
        negativeEffectValue: 100, // 100% loss marker
        negativeEffectLabel: { EN: 'Greed (-100% Cr)', RU: 'Жадность (-100% Кр)' }
    },
    {
        idPrefix: 'cortex_overclocker',
        rarity: 'RARE',
        name: { EN: 'Cortex Overclocker', RU: 'Оверклокер Коры' },
        description: { EN: 'Chrome spine model.', RU: 'Хромированный позвоночник.' },
        visualType: 'SPINE',
        visualColor: '#a855f7',
        iconUrl: 'E_Bones02.png',
        effectType: 'LEVEL_UP',
        effectValue: 1,
        effectLabel: { EN: '+1 Rank (Level Up)', RU: '+1 Ранг' },
        negativeEffectType: 'AMNESIA',
        negativeEffectLabel: { EN: 'Amnesia (Map Reset)', RU: 'Амнезия (Туман)' }
    },
    {
        idPrefix: 'matter_prism',
        rarity: 'RARE',
        name: { EN: 'Matter Prism', RU: 'Призма Материи' },
        description: { EN: 'Rotating pyramid refracting light.', RU: 'Вращающаяся пирамида.' },
        visualType: 'PRISM',
        visualColor: '#d946ef',
        iconUrl: 'I_Crystal02.png',
        effectType: 'EXPAND_INVENTORY',
        effectValue: 1,
        effectLabel: { EN: '+1 Inventory Slot', RU: '+1 Слот Инвентаря' },
        negativeEffectType: 'STATUS_SOIL_EATER',
        negativeEffectDuration: 200000, // 200s
        negativeEffectLabel: { EN: 'Soil Eater (200s)', RU: 'Пожиратель (200с)' }
    },

    // --- LEGENDARY (Легендарные) ---
    {
        idPrefix: 'apex_core',
        rarity: 'LEGENDARY',
        name: { EN: 'Apex Core', RU: 'Ядро «Апекс»' },
        description: { EN: 'Pulsating heart of pure light.', RU: 'Пульсирующее сердце.' },
        visualType: 'CORE',
        visualColor: '#f43f5e',
        iconUrl: 'I_Eye.png',
        effectType: 'GOD_MODE', // Modified behavior in Processor: +10 Rank, +100 Ent, +100 Moves
        effectValue: 1,
        effectLabel: { EN: '+Rank, +Moves, +Stability', RU: '+Ранг, +Ходы, +Стаб.' },
        negativeEffectType: 'FULL_RESET',
        negativeEffectLabel: { EN: 'System Wipe', RU: 'Полный Сброс' }
    },
    {
        idPrefix: 'midas_chip',
        rarity: 'LEGENDARY',
        name: { EN: 'Midas Chip', RU: 'Чип «Мидас»' },
        description: { EN: 'Golden skull with pixel eyes.', RU: 'Золотой череп.' },
        visualType: 'SKULL',
        visualColor: '#fbbf24',
        iconUrl: 'E_Gold01.png',
        effectType: 'ADD_CREDITS',
        effectValue: 1000,
        effectLabel: { EN: '+1000 Credits', RU: '+1000 Кредитов' },
        negativeEffectType: 'STATUS_GOLD_CURSE',
        negativeEffectDuration: 300000, // 5 minutes
        negativeEffectLabel: { EN: 'Gold Curse (5m)', RU: 'Проклятие (5м)' }
    },
    {
        idPrefix: 'void_core',
        rarity: 'LEGENDARY',
        name: { EN: 'Void Core', RU: 'Ядро Пустоты' },
        description: { EN: 'Bypasses high ground requirements and staircase check completely + sets step cost to 1.', RU: 'Игнорирует проверку лестницы и устанавливает стоимость шага в 1.' },
        visualType: 'CORE',
        visualColor: '#8b5cf6',
        iconUrl: 'I_Core01.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: 'Gravity Shunt', RU: 'Гравитационное шунтирование' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 0,
        negativeEffectLabel: { EN: '', RU: '' },
        equipSlot: 'artifact'
    },

    // --- WEAPONS (Оружие) ---
    
    // Daggers (Common/Uncommon)
    {
        idPrefix: 'dagger_rusty',
        rarity: 'COMMON',
        name: { EN: 'Rusty Dagger', RU: 'Ржавый Кинжал' },
        description: { EN: 'A simple, slightly rusted blade.', RU: 'Простое, слегка заржавевшее лезвие.' },
        visualType: 'DAGGER',
        visualColor: '#94a3b8',
        iconUrl: 'W_Dagger001.png',
        effectType: 'ADD_MOVES',
        effectValue: 5,
        effectLabel: { EN: '+5 Moves', RU: '+5 Ходов' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 10,
        negativeEffectLabel: { EN: '-10 Credits', RU: '-10 Кредитов' }
    },
    {
        idPrefix: 'dagger_steel',
        rarity: 'UNCOMMON',
        name: { EN: 'Steel Dagger', RU: 'Стальной Кинжал' },
        description: { EN: 'Sharp and reliable.', RU: 'Острый и надежный.' },
        visualType: 'DAGGER',
        visualColor: '#cbd5e1',
        iconUrl: 'W_Dagger005.png',
        effectType: 'ADD_MOVES',
        effectValue: 10,
        effectLabel: { EN: '+10 Moves', RU: '+10 Ходов' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 25,
        negativeEffectLabel: { EN: '-25 Credits', RU: '-25 Кредитов' }
    },
    {
        idPrefix: 'dagger_poison',
        rarity: 'RARE',
        name: { EN: 'Poisoned Dagger', RU: 'Отравленный Кинжал' },
        description: { EN: 'Dripping with a strange green liquid.', RU: 'С него капает странная зеленая жидкость.' },
        visualType: 'DAGGER',
        visualColor: '#22c55e',
        iconUrl: 'W_Dagger012.png',
        effectType: 'STATUS_GOLD_RUSH',
        effectValue: 2,
        effectDuration: 120000,
        effectLabel: { EN: 'Toxic Rush (2m)', RU: 'Токсичный Рывок (2м)' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 60000,
        negativeEffectLabel: { EN: 'Nausea (Fatigue)', RU: 'Тошнота (Усталость)' }
    },

    // Swords (Uncommon/Rare)
    {
        idPrefix: 'sword_soldier',
        rarity: 'UNCOMMON',
        name: { EN: 'Soldier Sword', RU: 'Меч Солдата' },
        description: { EN: 'Standard issue military blade.', RU: 'Стандартный армейский клинок.' },
        visualType: 'SWORD',
        visualColor: '#94a3b8',
        iconUrl: 'W_Sword001.png',
        effectType: 'ADD_CREDITS',
        effectValue: 40,
        effectLabel: { EN: '+40 Credits', RU: '+40 Кредитов' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: '-5 Moves', RU: '-5 Ходов' }
    },
    {
        idPrefix: 'sword_knight',
        rarity: 'RARE',
        name: { EN: 'Knight Sword', RU: 'Меч Рыцаря' },
        description: { EN: 'Ornate and powerful.', RU: 'Украшенный и мощный.' },
        visualType: 'SWORD',
        visualColor: '#f1f5f9',
        iconUrl: 'W_Sword010.png',
        effectType: 'ADD_CREDITS',
        effectValue: 100,
        effectLabel: { EN: '+100 Credits', RU: '+100 Кредитов' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 10,
        negativeEffectLabel: { EN: '-10 Moves', RU: '-10 Ходов' }
    },

    // Axes (Common/Uncommon)
    {
        idPrefix: 'axe_wood',
        rarity: 'COMMON',
        name: { EN: 'Woodcutter Axe', RU: 'Топор Лесоруба' },
        description: { EN: 'Good for materials.', RU: 'Хорош для добычи материалов.' },
        visualType: 'AXE',
        visualColor: '#78350f',
        iconUrl: 'W_Axe001.png',
        effectType: 'ADD_MATERIAL',
        effectValue: 3,
        effectLabel: { EN: '+3 Materials', RU: '+3 Материала' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 4,
        negativeEffectLabel: { EN: '-4 Moves', RU: '-4 Хода' }
    },
    {
        idPrefix: 'axe_battle',
        rarity: 'UNCOMMON',
        name: { EN: 'Battle Axe', RU: 'Боевой Топор' },
        description: { EN: 'Heavy and destructive.', RU: 'Тяжелый и разрушительный.' },
        visualType: 'AXE',
        visualColor: '#475569',
        iconUrl: 'W_Axe008.png',
        effectType: 'ADD_MATERIAL',
        effectValue: 6,
        effectLabel: { EN: '+6 Materials', RU: '+6 Материалов' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 8,
        negativeEffectLabel: { EN: '-8 Moves', RU: '-8 Ходов' }
    },

    // Maces (Uncommon/Rare)
    {
        idPrefix: 'mace_iron',
        rarity: 'UNCOMMON',
        name: { EN: 'Iron Mace', RU: 'Железная Булава' },
        description: { EN: 'Crushes through defenses.', RU: 'Пробивает защиту.' },
        visualType: 'MACE',
        visualColor: '#64748b',
        iconUrl: 'W_Mace001.png',
        effectType: 'ADD_ENTROPY',
        effectValue: 5,
        effectLabel: { EN: '+5% Stability', RU: '+5% Стабильности' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 30,
        negativeEffectLabel: { EN: '-30 Credits', RU: '-30 Кредитов' }
    },
    {
        idPrefix: 'mace_heavy',
        rarity: 'RARE',
        name: { EN: 'Heavy Mace', RU: 'Тяжелая Булава' },
        description: { EN: 'Impact that ripples reality.', RU: 'Удар, искажающий реальность.' },
        visualType: 'MACE',
        visualColor: '#334155',
        iconUrl: 'W_Mace010.png',
        effectType: 'ADD_ENTROPY',
        effectValue: 12,
        effectLabel: { EN: '+12% Stability', RU: '+12% Стабильности' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 60,
        negativeEffectLabel: { EN: '-60 Credits', RU: '-60 Кредитов' }
    },

    // Spears (Common/Uncommon)
    {
        idPrefix: 'spear_simple',
        rarity: 'COMMON',
        name: { EN: 'Simple Spear', RU: 'Простое Копье' },
        description: { EN: 'Long reach.', RU: 'Длинная дистанция.' },
        visualType: 'SPEAR',
        visualColor: '#94a3b8',
        iconUrl: 'W_Spear001.png',
        effectType: 'STATUS_SCANNER_BUFF',
        effectValue: 1,
        effectDuration: 60000,
        effectLabel: { EN: 'Eagle Eye (1m)', RU: 'Глаз Орла (1м)' },
        negativeEffectType: 'LOSE_RANK',
        negativeEffectValue: 1,
        negativeEffectLabel: { EN: '-1 Rank', RU: '-1 Ранг' }
    },

    // Staffs (Rare/Legendary)
    {
        idPrefix: 'staff_mage',
        rarity: 'RARE',
        name: { EN: 'Mage Staff', RU: 'Посох Мага' },
        description: { EN: 'Glows with arcane energy.', RU: 'Светится магической энергией.' },
        visualType: 'STAFF',
        visualColor: '#a855f7',
        iconUrl: 'W_Staff01.png',
        effectType: 'STATUS_ENTROPY_INVERSION',
        effectValue: 1,
        effectDuration: 60000,
        effectLabel: { EN: 'Arcane Flux (1m)', RU: 'Магический Поток (1м)' },
        negativeEffectType: 'STATUS_TUNNEL_VISION',
        negativeEffectDuration: 30000,
        negativeEffectLabel: { EN: 'Mana Burn (Tunnel Vision)', RU: 'Выгорание маны' }
    },

    // Bows (Uncommon/Rare)
    {
        idPrefix: 'bow_short',
        rarity: 'UNCOMMON',
        name: { EN: 'Short Bow', RU: 'Короткий Лук' },
        description: { EN: 'Quick and light.', RU: 'Быстрый и легкий.' },
        visualType: 'BOW',
        visualColor: '#78350f',
        iconUrl: 'W_Bow01.png',
        effectType: 'REVEAL_MAP',
        effectValue: 5,
        effectLabel: { EN: 'Scout Area', RU: 'Разведка' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 3,
        negativeEffectLabel: { EN: '-3 Moves', RU: '-3 Хода' }
    },

    // Guns (Legendary)
    {
        idPrefix: 'gun_plasma',
        rarity: 'LEGENDARY',
        name: { EN: 'Plasma Gun', RU: 'Плазменная Пушка' },
        description: { EN: 'High-tech destruction.', RU: 'Высокотехнологичное разрушение.' },
        visualType: 'GUN',
        visualColor: '#0ea5e9',
        iconUrl: 'W_Gun001.png',
        effectType: 'GOD_MODE',
        effectValue: 1,
        effectLabel: { EN: 'Overdrive', RU: 'Перегрузка' },
        negativeEffectType: 'FULL_RESET',
        negativeEffectLabel: { EN: 'Meltdown', RU: 'Расплавление' }
    },

    // Gold Weapons (Legendary)
    {
        idPrefix: 'gold_sword',
        rarity: 'LEGENDARY',
        name: { EN: 'Golden Sword', RU: 'Золотой Меч' },
        description: { EN: 'A masterpiece of craftsmanship.', RU: 'Шедевр мастерства.' },
        visualType: 'SWORD',
        visualColor: '#fbbf24',
        iconUrl: 'W_Gold_Sword.png',
        effectType: 'ADD_CREDITS',
        effectValue: 1500,
        effectLabel: { EN: '+1500 Credits', RU: '+1500 Кредитов' },
        negativeEffectType: 'STATUS_GOLD_CURSE',
        negativeEffectDuration: 600000,
        negativeEffectLabel: { EN: 'Midas Curse (10m)', RU: 'Проклятие Мидаса (10м)' }
    },

    // Fists (Common)
    {
        idPrefix: 'fist_brass',
        rarity: 'COMMON',
        name: { EN: 'Brass Knuckles', RU: 'Кастет' },
        description: { EN: 'Brutal and direct.', RU: 'Грубо и эффективно.' },
        visualType: 'FIST',
        visualColor: '#94a3b8',
        iconUrl: 'W_Fist001.png',
        effectType: 'ADD_MOVES',
        effectValue: 2,
        effectLabel: { EN: '+2 Moves', RU: '+2 Хода' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: '-5 Credits', RU: '-5 Кредитов' }
    },

    // Throwables (Common/Uncommon)
    {
        idPrefix: 'throw_knife',
        rarity: 'COMMON',
        name: { EN: 'Throwing Knife', RU: 'Метательный Нож' },
        description: { EN: 'Lightweight and balanced.', RU: 'Легкий и сбалансированный.' },
        visualType: 'THROWING',
        visualColor: '#cbd5e1',
        iconUrl: 'W_Throw001.png',
        effectType: 'REVEAL_MAP',
        effectValue: 3,
        effectLabel: { EN: 'Quick Scout', RU: 'Быстрая Разведка' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 1,
        negativeEffectLabel: { EN: '-1 Move', RU: '-1 Ход' }
    },

    // Books (Rare)
    {
        idPrefix: 'book_ancient',
        rarity: 'RARE',
        name: { EN: 'Ancient Grimoire', RU: 'Древний Гримуар' },
        description: { EN: 'Contains forbidden knowledge.', RU: 'Содержит запретные знания.' },
        visualType: 'BOOK',
        visualColor: '#818cf8',
        iconUrl: 'W_Book01.png',
        effectType: 'LEVEL_UP',
        effectValue: 1,
        effectLabel: { EN: 'Forbidden Wisdom', RU: 'Запретная Мудрость' },
        negativeEffectType: 'LOSE_ENTROPY',
        negativeEffectValue: 10,
        negativeEffectLabel: { EN: '-10% Stability', RU: '-10% Стабильности' }
    },

    // --- AUTO-GENERATED OVERWORLD ASSETS ---
    // Armor
    {
        idPrefix: 'armor_heavy_04',
        rarity: 'RARE',
        name: { EN: 'Heavy Plate Armor', RU: 'Тяжелый Доспех' },
        description: { EN: 'Superior protection.', RU: 'Превосходная защита.' },
        visualType: 'ARMOR',
        visualColor: '#475569',
        iconUrl: 'A_Armor04.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+40 Max HP', RU: '+40 Макс. Здоровье' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 2,
        negativeEffectLabel: { EN: '-2 Moves', RU: '-2 Хода' },
        equipSlot: 'body',
        maxHpBonus: 40
    },
    {
        idPrefix: 'armor_heavy_05',
        rarity: 'LEGENDARY',
        name: { EN: 'Royal Guardian Plate', RU: 'Королевский Доспех' },
        description: { EN: 'The ultimate defense.', RU: 'Ультимативная защита.' },
        visualType: 'ARMOR',
        visualColor: '#fbbf24',
        iconUrl: 'A_Armor05.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+60 Max HP', RU: '+60 Макс. Здоровье' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 3,
        negativeEffectLabel: { EN: '-3 Moves', RU: '-3 Хода' },
        equipSlot: 'body',
        maxHpBonus: 60
    },
    // Weapons - Swords
    {
        idPrefix: 'sword_knight_01',
        rarity: 'UNCOMMON',
        name: { EN: 'Knight Sword', RU: 'Рыцарский Меч' },
        description: { EN: 'Standard issue for knights.', RU: 'Стандартный меч рыцаря.' },
        visualType: 'SWORD',
        visualColor: '#94a3b8',
        iconUrl: 'W_Sword001.png',
        effectType: 'ADD_MOVES',
        effectValue: 5,
        effectLabel: { EN: '+5 Moves', RU: '+5 Ходов' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 10,
        negativeEffectLabel: { EN: '-10 Credits', RU: '-10 Кредитов' }
    },
    {
        idPrefix: 'sword_knight_02',
        rarity: 'RARE',
        name: { EN: 'Elite Knight Sword', RU: 'Элитный Меч' },
        description: { EN: 'Forged for champions.', RU: 'Выкован для чемпионов.' },
        visualType: 'SWORD',
        visualColor: '#64748b',
        iconUrl: 'W_Sword002.png',
        effectType: 'ADD_MOVES',
        effectValue: 10,
        effectLabel: { EN: '+10 Moves', RU: '+10 Ходов' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 20,
        negativeEffectLabel: { EN: '-20 Credits', RU: '-20 Кредитов' }
    },
    // Potions
    {
        idPrefix: 'potion_blue_01',
        rarity: 'COMMON',
        name: { EN: 'Blue Potion', RU: 'Синее Зелье' },
        description: { EN: 'Restores energy.', RU: 'Восстанавливает энергию.' },
        visualType: 'POTION',
        visualColor: '#3b82f6',
        iconUrl: 'P_Blue01.png',
        effectType: 'ADD_MOVES',
        effectValue: 10,
        effectLabel: { EN: '+10 Moves', RU: '+10 Ходов' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: '-5 Credits', RU: '-5 Кредитов' }
    },
    {
        idPrefix: 'potion_red_01',
        rarity: 'COMMON',
        name: { EN: 'Red Potion', RU: 'Красное Зелье' },
        description: { EN: 'Restores health.', RU: 'Восстанавливает здоровье.' },
        visualType: 'POTION',
        visualColor: '#ef4444',
        iconUrl: 'P_Red01.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+20 HP', RU: '+20 ОЗ' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 2,
        negativeEffectLabel: { EN: '-2 Moves', RU: '-2 Хода' }
    },
    // Food
    {
        idPrefix: 'food_cherry',
        rarity: 'COMMON',
        name: { EN: 'Fresh Cherries', RU: 'Свежая Вишня' },
        description: { EN: 'A healthy snack.', RU: 'Здоровый перекус.' },
        visualType: 'FOOD',
        visualColor: '#ef4444',
        iconUrl: 'I_C_Cherry.png',
        effectType: 'ADD_MOVES',
        effectValue: 3,
        effectLabel: { EN: '+3 Moves', RU: '+3 Хода' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 2,
        negativeEffectLabel: { EN: '-2 Credits', RU: '-2 Кредитов' }
    },
    {
        idPrefix: 'food_bread_02',
        rarity: 'COMMON',
        name: { EN: 'Warm Bread', RU: 'Теплый Хлеб' },
        description: { EN: 'Filling and tasty.', RU: 'Сытно и вкусно.' },
        visualType: 'FOOD',
        visualColor: '#b45309',
        iconUrl: 'I_C_Bread.png',
        effectType: 'ADD_MOVES',
        effectValue: 5,
        effectLabel: { EN: '+5 Moves', RU: '+5 Ходов' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 4,
        negativeEffectLabel: { EN: '-4 Credits', RU: '-4 Кредитов' }
    },
    // Accessories
    {
        idPrefix: 'ring_gold_01',
        rarity: 'UNCOMMON',
        name: { EN: 'Gold Ring', RU: 'Золотое Кольцо' },
        description: { EN: 'A simple gold ring.', RU: 'Простое золотое кольцо.' },
        visualType: 'RING',
        visualColor: '#fbbf24',
        iconUrl: 'Ac_Ring01.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+10 Max Energy', RU: '+10 Макс. Энергия' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 50,
        negativeEffectLabel: { EN: 'Expensive (-50 Cr)', RU: 'Дорогое (-50 Кр)' },
        equipSlot: 'ring',
        maxEnergyBonus: 10
    },
    {
        idPrefix: 'necklace_silver_01',
        rarity: 'RARE',
        name: { EN: 'Silver Necklace', RU: 'Серебряное Ожерелье' },
        description: { EN: 'A beautiful silver necklace.', RU: 'Красивое серебряное ожерелье.' },
        visualType: 'NECKLACE',
        visualColor: '#cbd5e1',
        iconUrl: 'Ac_Necklace01.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+20 Max Energy', RU: '+20 Макс. Энергия' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 100,
        negativeEffectLabel: { EN: 'Expensive (-100 Cr)', RU: 'Дорогое (-100 Кр)' },
        equipSlot: 'necklace',
        maxEnergyBonus: 20
    },
    // Materials
    {
        idPrefix: 'mat_gold_bar_02',
        rarity: 'RARE',
        name: { EN: 'Gold Bar', RU: 'Золотой Слиток' },
        description: { EN: 'Pure gold.', RU: 'Чистое золото.' },
        visualType: 'BAR',
        visualColor: '#fbbf24',
        iconUrl: 'I_GoldBar.png',
        effectType: 'ADD_CREDITS',
        effectValue: 500,
        effectLabel: { EN: '+500 Credits', RU: '+500 Кредитов' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: 'Heavy (-5 Moves)', RU: 'Тяжелый (-5 Ходов)' }
    },
    {
        idPrefix: 'mat_ruby',
        rarity: 'RARE',
        name: { EN: 'Ruby', RU: 'Рубин' },
        description: { EN: 'A precious red gem.', RU: 'Драгоценный красный камень.' },
        visualType: 'GEM',
        visualColor: '#ef4444',
        iconUrl: 'I_Ruby.png',
        effectType: 'ADD_CREDITS',
        effectValue: 1000,
        effectLabel: { EN: '+1000 Credits', RU: '+1000 Кредитов' },
        negativeEffectType: 'LOSE_ENTROPY',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: '-5% Stability', RU: '-5% Стабильности' }
    },
    // Weapons - Axes & Daggers
    {
        idPrefix: 'axe_iron_02',
        rarity: 'UNCOMMON',
        name: { EN: 'Iron Axe', RU: 'Железный Топор' },
        description: { EN: 'Sharp and heavy.', RU: 'Острый и тяжелый.' },
        visualType: 'AXE',
        visualColor: '#94a3b8',
        iconUrl: 'W_Axe002.png',
        effectType: 'ADD_MATERIAL',
        effectValue: 4,
        effectLabel: { EN: '+4 Materials', RU: '+4 Материала' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 4,
        negativeEffectLabel: { EN: '-4 Moves', RU: '-4 Хода' }
    },
    {
        idPrefix: 'dagger_steel_02',
        rarity: 'UNCOMMON',
        name: { EN: 'Steel Dagger', RU: 'Стальной Кинжал' },
        description: { EN: 'Quick strikes.', RU: 'Быстрые удары.' },
        visualType: 'DAGGER',
        visualColor: '#cbd5e1',
        iconUrl: 'W_Dagger002.png',
        effectType: 'ADD_MOVES',
        effectValue: 4,
        effectLabel: { EN: '+4 Moves', RU: '+4 Хода' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 15,
        negativeEffectLabel: { EN: '-15 Credits', RU: '-15 Кредитов' }
    },
    // Tools & Artifacts
    {
        idPrefix: 'tool_pickaxe',
        rarity: 'COMMON',
        name: { EN: 'Mining Pickaxe', RU: 'Кирка' },
        description: { EN: 'Essential for digging.', RU: 'Необходима для копания.' },
        visualType: 'AXE',
        visualColor: '#64748b',
        iconUrl: 'W_Axe011.png',
        effectType: 'BUFF_DIG',
        effectValue: 2,
        effectLabel: { EN: 'Mining Luck', RU: 'Удача в добыче' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 3,
        negativeEffectLabel: { EN: '-3 Moves', RU: '-3 Хода' },
        equipSlot: 'tool'
    },
    {
        idPrefix: 'artifact_crystal',
        rarity: 'RARE',
        name: { EN: 'Energy Crystal', RU: 'Энергетический Кристалл' },
        description: { EN: 'Vibrates with power.', RU: 'Вибрирует от мощи.' },
        visualType: 'GEM',
        visualColor: '#3b82f6',
        iconUrl: 'I_Crystal01.png',
        effectType: 'ADD_MOVES',
        effectValue: 20,
        effectLabel: { EN: '+20 Moves', RU: '+20 Ходов' },
        negativeEffectType: 'LOSE_ENTROPY',
        negativeEffectValue: 8,
        negativeEffectLabel: { EN: '-8% Stability', RU: '-8% Стабильности' },
        equipSlot: 'artifact'
    },
    // Headgear
    {
        idPrefix: 'helm_knight',
        rarity: 'UNCOMMON',
        name: { EN: 'Knight Helmet', RU: 'Рыцарский Шлем' },
        description: { EN: 'Protects the head.', RU: 'Защищает голову.' },
        visualType: 'HELMET',
        visualColor: '#94a3b8',
        iconUrl: 'C_Elm01.png',
        effectType: 'ADD_MOVES',
        effectValue: 0,
        effectLabel: { EN: '+10 Max HP', RU: '+10 Макс. Здоровье' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 1,
        negativeEffectLabel: { EN: '-1 Move', RU: '-1 Ход' },
        equipSlot: 'head',
        maxHpBonus: 10
    },
    // Skill Artifacts
    {
        idPrefix: 'skill_fire_01',
        rarity: 'RARE',
        name: { EN: 'Fire Essence', RU: 'Эссенция Огня' },
        description: { EN: 'Warm to the touch.', RU: 'Теплая на ощупь.' },
        visualType: 'GEM',
        visualColor: '#ef4444',
        iconUrl: 'S_Fire01.png',
        effectType: 'STATUS_GOLD_RUSH',
        effectValue: 1,
        effectDuration: 120000,
        effectLabel: { EN: 'Fire Rush (2m)', RU: 'Огненная Спешка (2м)' },
        negativeEffectType: 'LOSE_MOVES',
        negativeEffectValue: 5,
        negativeEffectLabel: { EN: '-5 Moves', RU: '-5 Ходов' },
        equipSlot: 'artifact'
    }
];

export const getRandomItem = (rarity: ItemRarity, language: Language): Item => {
    const candidates = ITEM_REGISTRY.filter(i => i.rarity === rarity);
    
    if (candidates.length === 0) {
        return ITEM_REGISTRY[0] as unknown as Item;
    }

    const def = candidates[Math.floor(Math.random() * candidates.length)];
    
    return {
        id: `${def.idPrefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        baseId: def.idPrefix, // NEW: Type identifier
        rarity: def.rarity,
        name: def.name[language],
        description: def.description[language],
        timestamp: Date.now(),
        visualType: def.visualType,
        iconUrl: def.iconUrl,
        effectType: def.effectType,
        effectValue: def.effectValue,
        effectDescription: def.effectLabel[language],
        effectDuration: def.effectDuration,
        maxHpBonus: def.maxHpBonus,
        maxEnergyBonus: def.maxEnergyBonus,
        equipSlot: def.equipSlot,
        negativeEffectType: def.negativeEffectType,
        negativeEffectValue: def.negativeEffectValue,
        negativeEffectLabel: def.negativeEffectLabel[language],
        negativeEffectDuration: def.negativeEffectDuration
    };
};

export const createSpecificItem = (baseId: string, language: Language = 'EN'): Item => {
    const def = ITEM_REGISTRY.find(i => i.idPrefix === baseId);
    if (!def) {
        return getRandomItem('COMMON', language);
    }
    return {
        id: `${def.idPrefix}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
        baseId: def.idPrefix,
        rarity: def.rarity,
        name: def.name[language],
        description: def.description[language],
        timestamp: Date.now(),
        visualType: def.visualType,
        iconUrl: def.iconUrl,
        effectType: def.effectType,
        effectValue: def.effectValue,
        effectDescription: def.effectLabel[language],
        effectDuration: def.effectDuration,
        maxHpBonus: def.maxHpBonus,
        maxEnergyBonus: def.maxEnergyBonus,
        equipSlot: def.equipSlot,
        negativeEffectType: def.negativeEffectType,
        negativeEffectValue: def.negativeEffectValue,
        negativeEffectLabel: def.negativeEffectLabel[language],
        negativeEffectDuration: def.negativeEffectDuration
    };
};

export const getItemDef = (baseId: string): ItemDefinition | undefined => {
    return ITEM_REGISTRY.find(i => i.idPrefix === baseId);
};

export const generateMonumentRecipe = (difficulty: Difficulty): string[] => {
    const pick = (rarity: ItemRarity) => {
        const candidates = ITEM_REGISTRY.filter(i => i.rarity === rarity);
        if (candidates.length === 0) return ITEM_REGISTRY[0].idPrefix;
        return candidates[Math.floor(Math.random() * candidates.length)].idPrefix;
    };

    if (difficulty === 'EASY') {
        // 2 Common, 1 Uncommon
        return [pick('COMMON'), pick('COMMON'), pick('UNCOMMON')];
    } else if (difficulty === 'MEDIUM') {
        // 1 Common, 1 Uncommon, 1 Rare
        return [pick('COMMON'), pick('UNCOMMON'), pick('RARE')];
    } else {
        // HARD: 2 Rare, 1 Legendary
        return [pick('RARE'), pick('RARE'), pick('LEGENDARY')];
    }
};
