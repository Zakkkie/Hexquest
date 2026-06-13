import { GAME_CONFIG } from '../rules/config.ts';

export const DEG_TO_RAD = Math.PI / 180;

// Precompute hex vertices for volume drawing
export const BASE_POINTS: { x: number; y: number }[] = [];
for (let i = 0; i < 6; i++) {
    const angle = (60 * i + 30) * DEG_TO_RAD;
    BASE_POINTS.push({ x: Math.cos(angle) * GAME_CONFIG.HEX_SIZE, y: Math.sin(angle) * GAME_CONFIG.HEX_SIZE });
}

export interface Figure {
    id: string;
    nameRU: string;
    nameEN: string;
    cleanNameRU: string;
    cleanNameEN: string;
    congratsRU: string;
    congratsEN: string;
    descRU: string;
    descEN: string;
    shape: { q: number; r: number; lvl?: number }[];
    rewardSP: number;
}

export const MASTER_COORDS = [
    { q: 0, r: 0 },         // 0
    { q: 1, r: -1 },        // 1
    { q: 1, r: 0 },         // 2
    { q: 0, r: 1 },         // 3
    { q: -1, r: 1 },         // 4
    { q: -1, r: 0 },        // 5
    { q: 0, r: -1 },        // 6
    
    // Ring 2
    { q: 2, r: -2 },        // 7
    { q: 2, r: -1 },        // 8
    { q: 2, r: 0 },         // 9
    { q: 1, r: 1 },         // 10
    { q: 0, r: 2 },         // 11
    { q: -1, r: 2 },        // 12
    { q: -2, r: 2 },        // 13
    { q: -2, r: 1 },        // 14
    { q: -2, r: 0 },        // 15
    { q: -2, r: -1 },       // 16
    { q: -1, r: -1 },       // 17
    { q: 0, r: -2 },        // 18
    { q: 1, r: -2 },        // 19
    
    // Ring 3
    { q: 3, r: -3 },        // 20
    { q: 3, r: -2 },        // 21
    { q: 3, r: -1 },        // 22
    { q: 3, r: 0 },         // 23
    { q: 2, r: 1 },         // 24
    { q: 1, r: 2 },         // 25
    { q: 0, r: 3 },         // 26
    { q: -1, r: 3 },        // 27
    { q: -2, r: 3 },        // 28
    { q: -3, r: 3 },        // 29
    { q: -3, r: 2 },        // 30
    { q: -3, r: 1 },        // 31
    { q: -3, r: 0 },        // 32
    { q: -3, r: -1 },       // 33
    { q: -2, r: -2 },       // 34
    { q: -1, r: -2 },       // 35
    { q: 0, r: -3 },        // 36
    { q: 1, r: -3 },        // 37
    { q: 2, r: -3 },        // 38
    
    // Ring 4
    { q: 4, r: -4 },        // 39
    { q: 4, r: -3 },        // 40
    { q: 4, r: -2 },        // 41
    { q: 4, r: -1 },        // 42
    { q: 4, r: 0 },         // 43
    { q: 3, r: 1 },         // 44
    { q: 2, r: 2 },         // 45
    { q: 1, r: 3 },         // 46
    { q: 0, r: 4 },         // 47
    { q: -1, r: 4 },        // 48
    { q: -2, r: 4 },        // 49
    { q: -3, r: 4 }         // 50
];

interface SeriesConfig {
    seriesId: number;
    nameRU: string;
    nameEN: string;
    descRU: string;
    descEN: string;
    coords: { q: number; r: number }[];
    milestonesRU: string[];
    milestonesEN: string[];
}

const SERIES_DEFS: SeriesConfig[] = [
    {
        seriesId: 1,
        nameRU: 'Смайлик',
        nameEN: 'Smiley',
        descRU: 'Модуль эмоциональной симуляции. Развивается от глаз и носа к широкой улыбке.',
        descEN: 'Emotion simulation module. Progresses from eyes and nose to a wide smiling face.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: -1 },
            { q: 1, r: 0 },
            { q: 0, r: -1 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
            { q: -1, r: -1 },
            { q: 1, r: 1 },
            { q: -2, r: 1 },
            { q: 2, r: -1 },
            { q: 0, r: -2 },
            { q: -2, r: 2 },
            { q: 2, r: -2 },
            { q: 0, r: 2 }
        ],
        milestonesRU: ["Очки Эмоций", "Линия Рта", "Форма Лица", "Подмигивание", "Финальный Смайлик"],
        milestonesEN: ["Emotion Dots", "Mouth Line", "Face Outline", "Winking Face", "Ultimate Smiley"]
    },
    {
        seriesId: 2,
        nameRU: 'Захватчик',
        nameEN: 'Invader',
        descRU: 'Легендарный пиксельный пришелец. Растет в стороны, выпуская антенны.',
        descEN: 'Legendary pixel invader. Grows sideways, extending antennae and leg claws.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: -1 },
            { q: -1, r: -1 },
            { q: 1, r: -1 },
            { q: 0, r: 1 },
            { q: -2, r: 1 },
            { q: 2, r: -1 },
            { q: -2, r: 0 },
            { q: 2, r: -2 },
            { q: -2, r: 2 },
            { q: 2, r: 0 },
            { q: 1, r: 1 },
            { q: -1, r: 1 }
        ],
        milestonesRU: ["Инкубатор ЯДра", "Сенсоры Пришельца", "Боковые Дроиды", "Клешни Чужого", "Легендарный Space Invader"],
        milestonesEN: ["Core Incubator", "Invader Sensors", "Side Droids", "Alien Pincers", "Legendary Space Invader"]
    },
    {
        seriesId: 3,
        nameRU: 'Меч',
        nameEN: 'Sword',
        descRU: 'Выкованный плазменный клинок. Растет от гарды вниз к рукояти и вверх к острию.',
        descEN: 'Forged plasma blade. Grows from the crossguard down to the hilt and up to the tip.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: -1 },
            { q: 0, r: -2 },
            { q: 0, r: -3 },
            { q: 0, r: -4 },
            { q: 0, r: 1 },
            { q: 0, r: 2 },
            { q: -1, r: -1 },
            { q: 1, r: -1 },
            { q: -2, r: 0 },
            { q: 2, r: 0 },
            { q: -1, r: 1 },
            { q: 1, r: 1 }
        ],
        milestonesRU: ["Рукоять Клинка", "Шпиль Стали", "Гарда Оруженосца", "Закаленное Лезвие", "Королевский Экскалибур"],
        milestonesEN: ["Hilt of Blade", "Steel Spire", "Squire Guard", "Tempered Edge", "Royal Excalibur"]
    },
    {
        seriesId: 4,
        nameRU: 'Сердце',
        nameEN: 'Heart',
        descRU: 'Резонирующее сердце аномалии. Закругляется в верхних долях и сходится в острие.',
        descEN: 'Resonating heart of anomaly. Curves into upper lobes and converges to a sharp tip.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: -1 },
            { q: 1, r: 0 },
            { q: 0, r: 1 },
            { q: -1, r: 1 },
            { q: -1, r: -1 },
            { q: 0, r: -1 },
            { q: 2, r: -1 },
            { q: -2, r: 0 },
            { q: -2, r: 1 },
            { q: 2, r: -2 },
            { q: 1, r: -2 },
            { q: -2, r: 2 },
            { q: 2, r: 0 }
        ],
        milestonesRU: ["Дрожь Любви", "Пульсация Канала", "Доли Энергии", "Форма Валентинки", "Квантовое Сердце Вселенной"],
        milestonesEN: ["Love Vibe", "Channel Pulse", "Energy Lobes", "Valentine Silhouette", "Quantum Universe Heart"]
    },
    {
        seriesId: 5,
        nameRU: 'Звезда',
        nameEN: 'Star',
        descRU: 'Пятиконечный космический маяк. Растет лучами во все пять направлений.',
        descEN: 'Five-pointed cosmic beacon. Extends beams symmetrically in all directions.',
        coords: [
            { q: 0, r: 0 },
            { q: 0, r: -1 },
            { q: -1, r: 1 },
            { q: 1, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: -1 },
            { q: 0, r: -2 },
            { q: -2, r: 2 },
            { q: 2, r: 0 },
            { q: -2, r: 0 },
            { q: 2, r: -2 },
            { q: 0, r: 1 },
            { q: -1, r: -1 },
            { q: 1, r: 1 },
            { q: 0, r: 2 }
        ],
        milestonesRU: ["Искра Пыли", "Перекрестие Высот", "Лучи Спутника", "Звёздная Пыль", "Сверхновая Звезда Сектора"],
        milestonesEN: ["Spark of Dust", "Cross of Altitude", "Satellite Rays", "Shooting Star", "Supernova Sector Star"]
    },
    {
        seriesId: 6,
        nameRU: 'Корона',
        nameEN: 'Crown',
        descRU: 'Корона верховного лорда. Нижний венец держит опорные зубцы и венчающий кристалл.',
        descEN: 'Crown of the supreme lord. The lower band locks upward defensive spikes and crown jewel.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
            { q: 1, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: -1 },
            { q: -2, r: 1 },
            { q: 2, r: -1 },
            { q: -2, r: 0 },
            { q: 0, r: -1 },
            { q: 2, r: -2 },
            { q: -1, r: -1 },
            { q: 1, r: -2 },
            { q: 0, r: -2 },
            { q: 0, r: 2 }
        ],
        milestonesRU: ["Ободок Власти", "Опора Лорда", "Боковые Зубцы", "Царский Кастет", "Императорская Корона Симуляции"],
        milestonesEN: ["Band of Sovereignty", "Lord Base", "Side Spikes", "Regal Battlements", "Imperial Crown of Simulation"]
    },
    {
        seriesId: 7,
        nameRU: 'Древо',
        nameEN: 'Tree',
        descRU: 'Вековое био-инженерное древо. Произрастает от корня к кроне.',
        descEN: 'Venerable bio-engineered tree. Grows from roots up the trunk to the crowned canopy.',
        coords: [
            { q: 0, r: 0 },
            { q: 0, r: 1 },
            { q: 0, r: 2 },
            { q: -1, r: 1 },
            { q: 1, r: 0 },
            { q: 0, r: -1 },
            { q: -1, r: 0 },
            { q: 1, r: -1 },
            { q: 0, r: -2 },
            { q: -1, r: -1 },
            { q: 1, r: -2 },
            { q: -2, r: 2 },
            { q: 2, r: 0 },
            { q: 0, r: -3 },
            { q: 0, r: 3 }
        ],
        milestonesRU: ["Росток Бурения", "Ствол Дерева", "Латеральные Ветки", "Купол Эфира", "Тектоническое Древо Миров"],
        milestonesEN: ["Drill Sprout", "Tree Trunk", "Lateral Branches", "Aether Canopy", "Tectonic Tree of Worlds"]
    },
    {
        seriesId: 8,
        nameRU: 'Портал',
        nameEN: 'Portal',
        descRU: 'Древние пространственные врата. Несущая арка смыкается над центральной пустотой.',
        descEN: 'Ancient spatial stargate. The load-bearing arch closes over the central portal void.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: -1 },
            { q: -1, r: 1 },
            { q: 1, r: 0 },
            { q: -1, r: -1 },
            { q: 1, r: -2 },
            { q: 0, r: -2 },
            { q: -2, r: 2 },
            { q: 2, r: -1 },
            { q: -2, r: 1 },
            { q: 2, r: -2 },
            { q: 0, r: -1 },
            { q: 0, r: 1 },
            { q: 0, r: 2 }
        ],
        milestonesRU: ["Столбы Врат", "Свод Арки", "Якорь Поля", "Стабилизатор Вихря", "Врата Вечности Небулы"],
        milestonesEN: ["Portal Pillars", "Arch Keystone", "Field Anchor", "Vortex Stabilizer", "Eternity Gates of Nebula"]
    },
    {
        seriesId: 9,
        nameRU: 'Покебол',
        nameEN: 'Pokeball',
        descRU: 'Красная сфера ловли аномалий (Покебол). Растет кругом во все направления.',
        descEN: 'Red capture sphere for quantum anomalies (Pokeball). Grows outwards, defining a circular shape.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: -1 },
            { q: -1, r: -1 },
            { q: 1, r: -1 },
            { q: 0, r: 1 },
            { q: -1, r: 1 },
            { q: 1, r: 1 },
            { q: -2, r: 1 },
            { q: 2, r: -1 },
            { q: 0, r: -2 },
            { q: 0, r: 2 },
            { q: -2, r: 0 },
            { q: 2, r: -2 },
            { q: -1, r: 2 },
            { q: 1, r: -2 },
            { q: -2, r: 2 },
            { q: 2, r: 0 },
            { q: 0, r: -3 }
        ],
        milestonesRU: ["Клипсовый Фиксатор", "Сегменты Диска", "Капсула Ловли", "Красная Сфера Захвата", "Легендарный Покебол"],
        milestonesEN: ["Lock Button", "Disc Segments", "Catch Capsule", "Red Sphere Capture", "Legendary Master Pokeball"]
    },
    {
        seriesId: 10,
        nameRU: 'Крипер',
        nameEN: 'Creeper',
        descRU: 'Зеленый крипер-саботер из кубических пикселей. Известное грустное лицо.',
        descEN: 'Green creeper saboteur made of cubic pixels. Features the famous frowning facial features.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: -1 },
            { q: 1, r: -2 },
            { q: 0, r: 1 },
            { q: -1, r: 1 },
            { q: 1, r: 0 },
            { q: 0, r: -1 },
            { q: -2, r: 1 },
            { q: 2, r: -2 },
            { q: -1, r: 0 },
            { q: 1, r: -1 },
            { q: -2, r: 0 },
            { q: 2, r: -1 },
            { q: 0, r: -2 },
            { q: -1, r: -2 },
            { q: 1, r: -3 },
            { q: 0, r: 2 },
            { q: -1, r: 2 },
            { q: 1, r: 1 },
            { q: -2, r: 2 }
        ],
        milestonesRU: ["Взгляд Саботера", "Грустный Рот", "Пиксельная Маска", "Защита Шеи", "Тектонический Крипер Майнкрафта"],
        milestonesEN: ["Saboteur Gaze", "Frowning Smile", "Pixel Mask", "Guard Plate", "Tectonic Creeper of Minecraft"]
    },
    {
        seriesId: 11,
        nameRU: 'Космонавт',
        nameEN: 'Crewmate',
        descRU: 'Космонавт из выживания в космосе. Стеклянный щиток скафандра и ранец жизнеобеспечения.',
        descEN: 'Heroic survival space explorer. Features the thick glass visor and oxygen lifepack.',
        coords: [
            { q: 0, r: 0 },
            { q: 1, r: -1 },
            { q: -1, r: 0 },
            { q: 0, r: -1 },
            { q: 1, r: -2 },
            { q: -1, r: 1 },
            { q: -2, r: 1 },
            { q: 0, r: 1 },
            { q: 1, r: 0 },
            { q: 0, r: 2 },
            { q: -1, r: 2 },
            { q: 1, r: 1 },
            { q: -1, r: 3 },
            { q: 1, r: 2 },
            { q: 0, r: 3 },
            { q: -1, r: -1 },
            { q: -2, r: 2 },
            { q: 2, r: -1 },
            { q: 2, r: -2 },
            { q: 0, r: -2 }
        ],
        milestonesRU: ["Визор Скафандра", "Кислородный Баллон", "Скафандр Защиты", "Сигнальный Шлем", "Космонавт Амонг Ас"],
        milestonesEN: ["Visor Shield", "Oxygen Backpack", "Protective Suit", "Beaming Helmet", "Among Us Crewmate Astronaut"]
    },
    {
        seriesId: 12,
        nameRU: 'Бастион',
        nameEN: 'Citadel',
        descRU: 'Небесный королевский бастион. Включает изгиб крепостных стен, башни дозора и величественный шпиль.',
        descEN: 'Celestial royal bastion. Features curved protection battlements, sentinel watchtowers, and a grand spire.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: -1 },
            { q: -1, r: 1 },
            { q: 1, r: 0 },
            { q: -2, r: 0 },
            { q: 2, r: -2 },
            { q: -2, r: -1 },
            { q: 2, r: -3 },
            { q: -2, r: -2 },
            { q: 2, r: -4 },
            { q: 0, r: -1 },
            { q: 0, r: -2 },
            { q: 0, r: -3 },
            { q: -1, r: -1 },
            { q: 1, r: -2 },
            { q: -3, r: 1 },
            { q: 3, r: -3 },
            { q: -3, r: 0 },
            { q: 3, r: -2 }
        ],
        milestonesRU: ["Внутренний Засов", "Опускные Опоры", "Башни Лордов", "Замок Бастиона", "Небесный Бастион Цитадели"],
        milestonesEN: ["Inner Portcullis", "Foundation Anchors", "Lords Watchtowers", "Keep Fortress", "Celestial Grand Bastion"]
    }
];


export const VIBRANT_NAMES: { nameRU: string; nameEN: string }[] = [
    // 1-20: Смайлик (Smiley)
    { nameRU: "Смайлик", nameEN: "Smiley" },
    { nameRU: "Улыбка", nameEN: "Happy Face" },
    { nameRU: "Подмигивание", nameEN: "Wink Face" },
    { nameRU: "Смех", nameEN: "Laughing Face" },
    { nameRU: "Взгляд", nameEN: "Silent Gaze" },
    { nameRU: "Радость", nameEN: "Pure Joy" },
    { nameRU: "Румянец", nameEN: "Blush Tint" },
    { nameRU: "Гримаса", nameEN: "Funny Grimace" },
    { nameRU: "Шепот", nameEN: "Soft Whisper" },
    { nameRU: "Хитрец", nameEN: "Sly Smirk" },
    { nameRU: "Восторг", nameEN: "Mega Delight" },
    { nameRU: "Милашка", nameEN: "Cute Face" },
    { nameRU: "Озорник", nameEN: "Mischievous Kid" },
    { nameRU: "Весельчак", nameEN: "Jolly Spirit" },
    { nameRU: "Розыгрыш", nameEN: "Playful Prank" },
    { nameRU: "Скромняга", nameEN: "Shy Face" },
    { nameRU: "Мечтатель", nameEN: "Dreamy Explorer" },
    { nameRU: "Философ", nameEN: "Thinker Node" },
    { nameRU: "Добряк", nameEN: "Kind Heart" },
    { nameRU: "Хохот", nameEN: "Loud Laugh" },

    // 21-40: Захватчик (Invader)
    { nameRU: "Дроид", nameEN: "Scout Droid" },
    { nameRU: "Пришелец", nameEN: "Star Invader" },
    { nameRU: "Антенна", nameEN: "Signal Receiver" },
    { nameRU: "Захватчик", nameEN: "Galaxy Raider" },
    { nameRU: "Киборг", nameEN: "Metal Cyborg" },
    { nameRU: "Спрут", nameEN: "Space Squid" },
    { nameRU: "Саботажник", nameEN: "Orbit Saboteur" },
    { nameRU: "Мутант", nameEN: "Gamma Mutant" },
    { nameRU: "Робокраб", nameEN: "Robo Crab" },
    { nameRU: "Паук", nameEN: "Void Spider" },
    { nameRU: "Жужжалка", nameEN: "Orbit Buzzer" },
    { nameRU: "Клешня", nameEN: "Steel Pincer" },
    { nameRU: "Ксеноморф", nameEN: "Xenomorph Spawn" },
    { nameRU: "Сталкер", nameEN: "Nebula Stalker" },
    { nameRU: "Пилигрим", nameEN: "Void Traveler" },
    { nameRU: "Мимик", nameEN: "Mimic Bot" },
    { nameRU: "Разведчик", nameEN: "Deep Scout" },
    { nameRU: "Инквизитор", nameEN: "Sector Inquisitor" },
    { nameRU: "Генерал", nameEN: "Alien Warlord" },
    { nameRU: "Властелин", nameEN: "Sovereign Master" },

    // 41-60: Меч (Sword)
    { nameRU: "Кинжал", nameEN: "Sharp Dagger" },
    { nameRU: "Стилет", nameEN: "Swift Stiletto" },
    { nameRU: "Палаш", nameEN: "Broad Sword" },
    { nameRU: "Рапира", nameEN: "Fine Rapier" },
    { nameRU: "Эспадон", nameEN: "Grand Zweihander" },
    { nameRU: "Катана", nameEN: "Steel Katana" },
    { nameRU: "Ятаган", nameEN: "Curved Scimitar" },
    { nameRU: "Глефа", nameEN: "Light Glaive" },
    { nameRU: "Копье", nameEN: "Quartz Spear" },
    { nameRU: "Топор", nameEN: "Heavy Axe" },
    { nameRU: "Секира", nameEN: "Battle Axe" },
    { nameRU: "Тесак", nameEN: "Cleaver Blade" },
    { nameRU: "Кортик", nameEN: "Dirk Blade" },
    { nameRU: "Шпага", nameEN: "Swift Foil" },
    { nameRU: "Сабля", nameEN: "Guard Saber" },
    { nameRU: "Экскалибур", nameEN: "Excalibur Sword" },
    { nameRU: "Клеймор", nameEN: "Claymore Blade" },
    { nameRU: "Фламберг", nameEN: "Wave Sword" },
    { nameRU: "Алебарда", nameEN: "Guard Halberd" },
    { nameRU: "Трезубец", nameEN: "Sea Trident" },

    // 61-80: Сердце (Heart)
    { nameRU: "Искра", nameEN: "Energy Spark" },
    { nameRU: "Пульс", nameEN: "Core Beating" },
    { nameRU: "Валентинка", nameEN: "Sweet Valentine" },
    { nameRU: "Амулет", nameEN: "Mystic Amulet" },
    { nameRU: "Рубин", nameEN: "Crimson Ruby" },
    { nameRU: "Аметист", nameEN: "Purple Amethyst" },
    { nameRU: "Изумруд", nameEN: "Green Emerald" },
    { nameRU: "Сапфир", nameEN: "Blue Sapphire" },
    { nameRU: "Алмаз", nameEN: "Pure Diamond" },
    { nameRU: "Кристалл", nameEN: "Prism Crystal" },
    { nameRU: "Талисман", nameEN: "Lucky Charm" },
    { nameRU: "Родонит", nameEN: "Pink Rhodonite" },
    { nameRU: "Янтарь", nameEN: "Amber Stone" },
    { nameRU: "Нефрит", nameEN: "Jade Carving" },
    { nameRU: "Оберег", nameEN: "Ward Rune" },
    { nameRU: "Узел", nameEN: "Unity Knot" },
    { nameRU: "Роза", nameEN: "Glass Rose" },
    { nameRU: "Пламя", nameEN: "Loving Flame" },
    { nameRU: "Магма", nameEN: "Burning Heart" },
    { nameRU: "Вечность", nameEN: "Eternal Bond" },

    // 81-100: Звезда (Star)
    { nameRU: "Вспышка", nameEN: "Nova Flare" },
    { nameRU: "Спутник", nameEN: "Orbit Satellite" },
    { nameRU: "Метеор", nameEN: "Swift Meteor" },
    { nameRU: "Комета", nameEN: "Blue Comet" },
    { nameRU: "Андромеда", nameEN: "Andromeda Cloud" },
    { nameRU: "Квазар", nameEN: "Power Quasar" },
    { nameRU: "Пульсар", nameEN: "Cosmic Pulsar" },
    { nameRU: "Сверхновая", nameEN: "Supernova Core" },
    { nameRU: "Галактика", nameEN: "Spiral Galaxy" },
    { nameRU: "Туманность", nameEN: "Nebula Dust" },
    { nameRU: "Созвездие", nameEN: "Star Cluster" },
    { nameRU: "Астероид", nameEN: "Gray Asteroid" },
    { nameRU: "Орбита", nameEN: "High Orbit" },
    { nameRU: "Затмение", nameEN: "Solar Eclipse" },
    { nameRU: "Рассвет", nameEN: "Space Sunrise" },
    { nameRU: "Зенит", nameEN: "High Zenith" },
    { nameRU: "Надир", nameEN: "Deep Nadir" },
    { nameRU: "Космос", nameEN: "Deep Void" },
    { nameRU: "Бездна", nameEN: "Infinite Abyss" },
    { nameRU: "Маяк", nameEN: "Star Beacon" },

    // 101-120: Корона (Crown)
    { nameRU: "Венец", nameEN: "Royal Diadem" },
    { nameRU: "Тиара", nameEN: "Bright Tiara" },
    { nameRU: "Шлем", nameEN: "Guard Helmet" },
    { nameRU: "Забрало", nameEN: "Iron Visor" },
    { nameRU: "Наплечник", nameEN: "Steel Pauldron" },
    { nameRU: "Нагрудник", nameEN: "Solid Breastplate" },
    { nameRU: "Перчатка", nameEN: "Iron Gauntlet" },
    { nameRU: "Поножи", nameEN: "Plate Greaves" },
    { nameRU: "Щит", nameEN: "Aegis Shield" },
    { nameRU: "Скипетр", nameEN: "Golden Scepter" },
    { nameRU: "Держава", nameEN: "Royal Orb" },
    { nameRU: "Трон", nameEN: "Marble Throne" },
    { nameRU: "Мантия", nameEN: "Velvet Cloak" },
    { nameRU: "Герб", nameEN: "Crest Banner" },
    { nameRU: "Печать", nameEN: "Signature Seal" },
    { nameRU: "Кольцо", nameEN: "Signet Ring" },
    { nameRU: "Кулон", nameEN: "Royal Pendant" },
    { nameRU: "Барбют", nameEN: "Barbuta Helmet" },
    { nameRU: "Посох", nameEN: "Eldritch Staff" },
    { nameRU: "Корона", nameEN: "Sovereign Crown" },

    // 121-140: Древо (Tree)
    { nameRU: "Росток", nameEN: "Fresh Sprout" },
    { nameRU: "Корень", nameEN: "Deep Root" },
    { nameRU: "Стебель", nameEN: "Green Stem" },
    { nameRU: "Листок", nameEN: "Ivy Leaf" },
    { nameRU: "Крона", nameEN: "Forest Canopy" },
    { nameRU: "Ветка", nameEN: "Oak Branch" },
    { nameRU: "Почка", nameEN: "Spring Bud" },
    { nameRU: "Кора", nameEN: "Thick Bark" },
    { nameRU: "Хвоя", nameEN: "Pine Needle" },
    { nameRU: "Желудь", nameEN: "Golden Acorn" },
    { nameRU: "Саженец", nameEN: "Tree Sapling" },
    { nameRU: "Клен", nameEN: "Red Maple" },
    { nameRU: "Ольха", nameEN: "Alder Shrub" },
    { nameRU: "Орех", nameEN: "Hazel Nut" },
    { nameRU: "Пихта", nameEN: "Silver Fir" },
    { nameRU: "Бамбук", nameEN: "Green Bamboo" },
    { nameRU: "Лотос", nameEN: "Sacred Lotus" },
    { nameRU: "Лилия", nameEN: "White Lily" },
    { nameRU: "Кактус", nameEN: "Desert Cactus" },
    { nameRU: "Древо", nameEN: "World Tree" },

    // 141-160: Портал (Portal)
    { nameRU: "Излом", nameEN: "Reality Fracture" },
    { nameRU: "Разлом", nameEN: "Void Rift" },
    { nameRU: "Трещина", nameEN: "Spatial Crack" },
    { nameRU: "Проход", nameEN: "Passage Way" },
    { nameRU: "Дверь", nameEN: "Secret Door" },
    { nameRU: "Ворота", nameEN: "Iron Gate" },
    { nameRU: "Арка", nameEN: "Gothic Arch" },
    { nameRU: "Скважина", nameEN: "Keyhole Slot" },
    { nameRU: "Туннель", nameEN: "Quantum Tunnel" },
    { nameRU: "Воронка", nameEN: "Swirling Vortex" },
    { nameRU: "Коридор", nameEN: "Vector Corridor" },
    { nameRU: "Мост", nameEN: "Aether Bridge" },
    { nameRU: "Свод", nameEN: "Keystone Vault" },
    { nameRU: "Окно", nameEN: "Mirror Window" },
    { nameRU: "Зеркало", nameEN: "Reality Reflector" },
    { nameRU: "Врата", nameEN: "Stargate Arch" },
    { nameRU: "Телепорт", nameEN: "Teleport Node" },
    { nameRU: "Сингулярность", nameEN: "Gravitational Singularity" },
    { nameRU: "Червоточина", nameEN: "Wormhole Path" },
    { nameRU: "Портал", nameEN: "Prime Portal" },

    // 161-180: Покебол (Pokeball)
    { nameRU: "Диск", nameEN: "Data Disc" },
    { nameRU: "Шар", nameEN: "Energy Sphere" },
    { nameRU: "Сфера", nameEN: "Perfect Orb" },
    { nameRU: "Ядро", nameEN: "Core Reactor" },
    { nameRU: "Капсула", nameEN: "Cargo Pod" },
    { nameRU: "Кнопка", nameEN: "Action Key" },
    { nameRU: "Чип", nameEN: "Micro Chip" },
    { nameRU: "Плата", nameEN: "Circuit Board" },
    { nameRU: "Контроллер", nameEN: "Input Pad" },
    { nameRU: "Джойстик", nameEN: "Game Lever" },
    { nameRU: "Кассета", nameEN: "Retro Tape" },
    { nameRU: "Картридж", nameEN: "Game Cartridge" },
    { nameRU: "Монета", nameEN: "Gold Coin" },
    { nameRU: "Жетон", nameEN: "Game Token" },
    { nameRU: "Сержант", nameEN: "Star Emblem" },
    { nameRU: "Радар", nameEN: "Intel Radar" },
    { nameRU: "Куб", nameEN: "Cosmic Cube" },
    { nameRU: "Призма", nameEN: "Light Prism" },
    { nameRU: "Покебол", nameEN: "Catch Pokeball" },
    { nameRU: "Артефакт", nameEN: "Master Artifact" },

    // 181-200: Крипер (Creeper)
    { nameRU: "Зомби", nameEN: "Rotten Zombie" },
    { nameRU: "Скелет", nameEN: "Bone Archer" },
    { nameRU: "Паук", nameEN: "Cave Spider" },
    { nameRU: "Эндермен", nameEN: "Shadow Enderman" },
    { nameRU: "Слизень", nameEN: "Green Slime" },
    { nameRU: "Гаст", nameEN: "Floating Ghast" },
    { nameRU: "Пиглин", nameEN: "Piglin Trader" },
    { nameRU: "Ифрит", nameEN: "Blaze Spawner" },
    { nameRU: "Чешуйница", nameEN: "Silverfish Spawn" },
    { nameRU: "Ведьма", nameEN: "Swamp Witch" },
    { nameRU: "Свинозомби", nameEN: "Zombie Pigman" },
    { nameRU: "Кадавр", nameEN: "Desert Husk" },
    { nameRU: "Зимогор", nameEN: "Ice Stray" },
    { nameRU: "Утопленник", nameEN: "Drowned Walker" },
    { nameRU: "Фантом", nameEN: "Night Phantom" },
    { nameRU: "Хоглин", nameEN: "Hoglin Beast" },
    { nameRU: "Страж", nameEN: "Elder Guardian" },
    { nameRU: "Разбойник", nameEN: "Pillager Outlaw" },
    { nameRU: "Разоритель", nameEN: "Ravager Beast" },
    { nameRU: "Крипер", nameEN: "Redstone Creeper" }
];

export const padCoords = (seriesCoords: { q: number; r: number }[]): { q: number; r: number }[] => {
    const result = [...seriesCoords];
    const seen = new Set(result.map(c => `${c.q},${c.r}`));
    for (const mc of MASTER_COORDS) {
        const key = `${mc.q},${mc.r}`;
        if (!seen.has(key)) {
            result.push(mc);
            seen.add(key);
            if (result.length >= 25) break;
        }
    }
    return result;
};

export const getSeriesForIndex = (index: number): { series: SeriesConfig; offset: number; count: number } => {
    const cycleSize = 20;
    const seriesIdx = Math.min(9, Math.floor((index - 1) / cycleSize));
    const offset = (index - 1) % cycleSize;
    return { series: SERIES_DEFS[seriesIdx], offset, count: cycleSize };
};

export const generateAllFiguresRaw = (): Figure[] => {
    const list: Figure[] = [];

    for (let index = 1; index <= 200; index++) {
        const { series, offset } = getSeriesForIndex(index);
        
        // 1. Level constraint logic:
        // First 10 figures must be level 0 strictly. Then we unlock a new level tier every 20 levels.
        let maxLvl = 0;
        if (index <= 10) {
            maxLvl = 0;
        } else {
            const tier = Math.floor((index - 11) / 20);
            maxLvl = Math.min(9, tier + 1);
        }

        // 2. Continuous growing size definition:
        // Size grows from 3 to 22 within each 20-figure cycle, making a satisfying loop
        const size = 3 + offset;

        // Pad sequence to ensure we can safely slice up to 22 coords
        const paddedCoords = padCoords(series.coords);
        const baseCoords = paddedCoords.slice(0, size);

        // Assign levels in a clean progressive ramp
        const shape: { q: number; r: number; lvl?: number }[] = [];
        for (let i = 0; i < baseCoords.length; i++) {
            const pt = baseCoords[i];
            let lvl = 0;
            if (maxLvl > 0 && baseCoords.length > 1) {
                // Slope levels from 0 to maxLvl progressively
                lvl = Math.round((i / (baseCoords.length - 1)) * maxLvl);
            }
            // clamp for safety
            if (lvl < 0) lvl = 0;
            if (lvl > maxLvl) lvl = maxLvl;

            shape.push({ q: pt.q, r: pt.r, lvl: lvl });
        }

        // Ensure at least one coordinate reaches maxLvl (fallback safety)
        if (!shape.some(pt => pt.lvl === maxLvl) && shape.length > 0) {
            shape[shape.length - 1].lvl = maxLvl;
        }

        // Get the signature unique name of the figure
        const nameUnit = VIBRANT_NAMES[index - 1] || { nameRU: `Фигура ${index}`, nameEN: `Figure ${index}` };
        const nameRU = nameUnit.nameRU;
        const nameEN = nameUnit.nameEN;

        const congratsRU = `Прекрасно! Фигура "${nameRU}" была верифицирована!`;
        const congratsEN = `Excellent! The structure "${nameEN}" has been verified!`;

        const descRU = `${series.descRU} Этап ${index} расширяет структуру "${nameRU}" до ${size} гексов. Требуемая высота: L${maxLvl}.`;
        const descEN = `${series.descEN} Phase ${index} expands the structure "${nameEN}" to ${size} hexes. Required altitude: L${maxLvl}.`;

        // Determine ID based on chapter rules
        let id_str = '';
        if (index <= 50) {
            id_str = `c1_f${index}`;
        } else if (index <= 100) {
            id_str = `c2_f${index - 50}`;
        } else if (index <= 150) {
            id_str = `c3_f${index - 100}`;
        } else {
            id_str = `c4_f${index - 150}`;
        }

        const tier = Math.floor((index - 1) / 20);
        const rewardSP = tier + 1;

        list.push({
            id: id_str,
            nameRU,
            nameEN,
            cleanNameRU: nameRU,
            cleanNameEN: nameEN,
            congratsRU,
            congratsEN,
            descRU,
            descEN,
            shape,
            rewardSP
        });
    }

    return list;
};

export const STATIC_FIGURES: Figure[] = generateAllFiguresRaw().slice(0, 30);

export const generateAdditionalFigures = (): Figure[] => {
    return generateAllFiguresRaw().slice(30);
};

export const FIGURES_COLLECTION: Figure[] = [
    ...STATIC_FIGURES,
    ...generateAdditionalFigures()
];

export const getBasePathD = () => {
    let d = `M ${BASE_POINTS[0].x} ${BASE_POINTS[0].y}`;
    for (let i = 1; i < 6; i++) d += ` L ${BASE_POINTS[i].x} ${BASE_POINTS[i].y}`;
    return d + " Z";
};

export const BASE_PATH_D = getBasePathD();
