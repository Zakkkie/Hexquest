
import { Item, ItemRarity, ItemEffectType, NegativeEffectType, Language } from '../types';

export interface ItemDefinition {
    idPrefix: string;
    rarity: ItemRarity;
    name: Record<Language, string>;
    description: Record<Language, string>;
    visualType: 'CYLINDER' | 'CHIP' | 'BOX' | 'PATCH' | 'SCANNER' | 'PRISM' | 'DRILL' | 'GENERATOR' | 'PARTICLES' | 'SPINE' | 'CORE' | 'SKULL';
    visualColor: string;
    effectType: ItemEffectType;
    effectValue: number;
    effectDuration?: number; // ms
    baseValue: number; // For selling
    effectLabel: Record<Language, string>;
    
    // Negative Effects
    negativeEffectType: NegativeEffectType;
    negativeEffectValue?: number;
    negativeEffectDuration?: number; // ms
    negativeEffectLabel: Record<Language, string>;
}

export const ITEM_REGISTRY: ItemDefinition[] = [
    // --- COMMON (Обычные) ---
    {
        idPrefix: 'fuel_cell',
        rarity: 'COMMON',
        name: { EN: 'Spent Fuel Cell', RU: 'Отработанный Элемент' },
        description: { EN: 'Dull glass cylinder with green residue.', RU: 'Потускневший цилиндр с осадком.' },
        visualType: 'CYLINDER',
        visualColor: '#4ade80',
        effectType: 'ADD_MOVES',
        effectValue: 3,
        baseValue: 5,
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
        effectType: 'ADD_CREDITS',
        effectValue: 15,
        baseValue: 15,
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
        effectType: 'ADD_MATERIAL',
        effectValue: 2,
        baseValue: 10,
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
        effectType: 'ADD_ENTROPY',
        effectValue: 3,
        baseValue: 10,
        effectLabel: { EN: '+3% Stability', RU: '+3% Энтропии' },
        negativeEffectType: 'LOSE_CREDITS',
        negativeEffectValue: 10,
        negativeEffectLabel: { EN: '-10 Credits (Waste)', RU: '-10 Кредитов' }
    },
    {
        idPrefix: 'rusted_scanner',
        rarity: 'COMMON',
        name: { EN: 'Rusted Scanner', RU: 'Ржавый Сканер' },
        description: { EN: 'Old screen taped to a handle.', RU: 'Старый экран на рукоятке.' },
        visualType: 'SCANNER',
        visualColor: '#94a3b8',
        effectType: 'REVEAL_MAP',
        effectValue: 1, 
        baseValue: 10,
        effectLabel: { EN: 'Reveal Fog', RU: 'Разведка' },
        negativeEffectType: 'LOSE_RANK',
        negativeEffectValue: 1,
        negativeEffectLabel: { EN: '-1 Rank (Malfunction)', RU: '-1 Ранг (Ожог)' }
    },

    // --- UNCOMMON (Необычные) ---
    {
        idPrefix: 'cargo_prism',
        rarity: 'UNCOMMON',
        name: { EN: 'Cargo Prism', RU: 'Грузовая Призма' },
        description: { EN: 'Translucent cube with hologram.', RU: 'Куб с голограммой ящика.' },
        visualType: 'PRISM',
        visualColor: '#34d399',
        effectType: 'INCREASE_STORAGE',
        effectValue: 1,
        baseValue: 50,
        effectLabel: { EN: '+1 Max Storage', RU: '+1 Вместимость' },
        negativeEffectType: 'STATUS_FATIGUE',
        negativeEffectDuration: 30000,
        negativeEffectLabel: { EN: 'Fatigue (Moves x2)', RU: 'Усталость (Ход x2)' }
    },
    {
        idPrefix: 'hornet_drill',
        rarity: 'UNCOMMON',
        name: { EN: 'Hornet Drill Bit', RU: 'Бур «Шершень»' },
        description: { EN: 'Yellow spiral drill, laser sharp.', RU: 'Желтый спиральный бур.' },
        visualType: 'DRILL',
        visualColor: '#facc15',
        effectType: 'STATUS_GOLD_RUSH',
        effectValue: 2, 
        effectDuration: 60000, // 60s
        baseValue: 50,
        effectLabel: { EN: 'Gold Rush (+2 Mat)', RU: 'Золотая Лихорадка' },
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
        effectType: 'ADD_CREDITS',
        effectValue: 55,
        baseValue: 55,
        effectLabel: { EN: '+55 Credits', RU: '+55 Кредитов' },
        negativeEffectType: 'STATUS_MINING_OFFLINE',
        negativeEffectDuration: 35000,
        negativeEffectLabel: { EN: 'Mining Offline', RU: 'Нет Майнинга' }
    },
    {
        idPrefix: 'stability_scanner',
        rarity: 'UNCOMMON',
        name: { EN: 'Stability Scanner', RU: 'Сканер Стабильности' },
        description: { EN: 'Radar lens with green grid.', RU: 'Линза радара с сеткой.' },
        visualType: 'SCANNER',
        visualColor: '#22c55e',
        effectType: 'ADD_MOVES',
        effectValue: 10,
        baseValue: 50,
        effectLabel: { EN: '+10 Moves', RU: '+10 Ходов' },
        negativeEffectType: 'STATUS_TUNNEL_VISION',
        negativeEffectDuration: 30000,
        negativeEffectLabel: { EN: 'Tunnel Vision (Fog)', RU: 'Туннельное Зрение' }
    },

    // --- RARE (Редкие) ---
    {
        idPrefix: 'architect_nanites',
        rarity: 'RARE',
        name: { EN: 'Architect Nanites', RU: 'Наниты-Архитекторы' },
        description: { EN: 'Swarm of silver particles.', RU: 'Рой серебристых частиц.' },
        visualType: 'PARTICLES',
        visualColor: '#e2e8f0',
        effectType: 'STATUS_FREE_BUILD',
        effectValue: 1, 
        effectDuration: 30000,
        baseValue: 150,
        effectLabel: { EN: 'Free Building', RU: 'Бесплатная Стройка' },
        negativeEffectType: 'LOSE_CREDITS', // Using LOSE_CREDITS but value logic handled specially if needed, or static
        negativeEffectValue: 50, // Placeholder, usually % logic in processor
        negativeEffectLabel: { EN: 'Greed (-50% Cr)', RU: 'Жадность (-50% Кр)' }
    },
    {
        idPrefix: 'cortex_overclocker',
        rarity: 'RARE',
        name: { EN: 'Cortex Overclocker', RU: 'Оверклокер Коры' },
        description: { EN: 'Chrome spine model.', RU: 'Хромированный позвоночник.' },
        visualType: 'SPINE',
        visualColor: '#a855f7',
        effectType: 'LEVEL_UP',
        effectValue: 1,
        baseValue: 200,
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
        effectType: 'EXPAND_INVENTORY',
        effectValue: 1,
        baseValue: 200,
        effectLabel: { EN: '+1 Inventory Slot', RU: '+1 Слот Инвентаря' },
        negativeEffectType: 'STATUS_SOIL_EATER',
        negativeEffectDuration: 45000,
        negativeEffectLabel: { EN: 'Soil Eater', RU: 'Пожирание Почвы' }
    },

    // --- LEGENDARY (Легендарные) ---
    {
        idPrefix: 'apex_core',
        rarity: 'LEGENDARY',
        name: { EN: 'Apex Core', RU: 'Ядро «Апекс»' },
        description: { EN: 'Pulsating heart of pure light.', RU: 'Пульсирующее сердце.' },
        visualType: 'CORE',
        visualColor: '#f43f5e',
        effectType: 'GOD_MODE', // +10 Rank, +1000 Cr, +100 Moves
        effectValue: 1,
        baseValue: 1000,
        effectLabel: { EN: 'God Mode', RU: 'Режим Бога' },
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
        effectType: 'ADD_CREDITS',
        effectValue: 1000,
        baseValue: 1000,
        effectLabel: { EN: '+1000 Credits', RU: '+1000 Кредитов' },
        negativeEffectType: 'STATUS_GOLD_CURSE',
        negativeEffectDuration: 999999, // Permanent-ish
        negativeEffectLabel: { EN: 'Gold Curse', RU: 'Проклятие Золота' }
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
        rarity: def.rarity,
        name: def.name[language],
        description: def.description[language],
        value: def.baseValue,
        timestamp: Date.now(),
        visualType: def.visualType,
        effectType: def.effectType,
        effectValue: def.effectValue,
        effectDescription: def.effectLabel[language],
        effectDuration: def.effectDuration,
        negativeEffectType: def.negativeEffectType,
        negativeEffectValue: def.negativeEffectValue,
        negativeEffectLabel: def.negativeEffectLabel[language],
        negativeEffectDuration: def.negativeEffectDuration
    };
};
