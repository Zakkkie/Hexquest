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
        nameRU: 'Весёлый Смайлик',
        nameEN: 'Classic Smiley',
        descRU: 'Культовый жёлтый смайлик из интернета и чатов. Растет от глаз и носа к широкой улыбке.',
        descEN: 'The legendary yellow smiley face of internet culture. Grows from simple eyes and nose to a wide smiling face.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: -1 },
            { q: 2, r: -1 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: -1 },
            { q: 1, r: -1 },
            { q: -2, r: 1 },
            { q: 1, r: 1 },
            { q: 1, r: -2 },
            { q: 0, r: -2 },
            { q: 2, r: -2 },
            { q: -1, r: 2 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: -2, r: 0 },
            { q: 2, r: 0 },
            { q: -2, r: 3 },
            { q: -1, r: 3 },
            { q: 1, r: 2 }
        ],
        milestonesRU: ["Очки Эмоций", "Линия Улыбки", "Контур Лица", "Подмигивающий Глаз", "Идеальный Смайлик"],
        milestonesEN: ["Emotion Dots", "Smile Line", "Face Outline", "Winking Eye", "Ultimate Smiley"]
    },
    {
        seriesId: 2,
        nameRU: 'Ретро Пакман',
        nameEN: 'Retro Pac-Man',
        descRU: 'Культовый жёлтый пожиратель точек из ретро-аркад 80-х. Круглая форма со знаменитым открытым ртом.',
        descEN: 'The iconic yellow dot-munching hero of retro arcade cabinets. A circular shape featuring the open mouth.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: -1 },
            { q: 0, r: 1 },
            { q: -1, r: -1 },
            { q: -1, r: 1 },
            { q: 0, r: -1 },
            { q: 1, r: -2 },
            { q: -1, r: 2 },
            { q: -2, r: 0 },
            { q: 0, r: -2 },
            { q: 2, r: -2 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: 2, r: -1 },
            { q: 1, r: 1 },
            { q: -2, r: 1 },
            { q: -2, r: -1 },
            { q: 2, r: 0 },
            { q: 3, r: 0 },
            { q: 4, r: 0 },
            { q: 1, r: 0 }
        ],
        milestonesRU: ["Хрустящая Точка", "Открытый Рот", "Глаз Пакмана", "Жёлтый Корпус", "Легендарный Пакман"],
        milestonesEN: ["Munching Dot", "Open Mouth Curve", "Pac-Eye Sensor", "Yellow Arcade Shell", "Legendary Pac-Man"]
    },
    {
        seriesId: 3,
        nameRU: 'Световой Меч',
        nameEN: 'Laser Lightsaber',
        descRU: 'Изящное оружие джедаев и ситхов из Звёздных Войн. Энергетический клинок растет вверх от рукояти.',
        descEN: 'An elegant plasma weapon from a galaxy far, far away. The pure energy beam grows upwards from the hilt.',
        coords: [
            { q: 0, r: 0 },
            { q: 1, r: -1 },
            { q: 0, r: -1 },
            { q: -1, r: 2 },
            { q: -1, r: 3 },
            { q: 1, r: -2 },
            { q: 2, r: -3 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
            { q: 1, r: -3 },
            { q: 2, r: -4 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 3, r: -5 },
            { q: 2, r: -5 },
            { q: 3, r: -6 },
            { q: 4, r: -7 },
            { q: 3, r: -7 },
            { q: 4, r: -8 },
            { q: -2, r: 3 }
        ],
        milestonesRU: ["Кристалл Кайбер", "Джедайская Рукоять", "Кнопка Старта", "Излучатель Лезвия", "Световой Меч Силы"],
        milestonesEN: ["Kyber Crystal", "Jedi Grip Hilt", "Activation Key", "Emitter Shroud", "Legendary Lightsaber"]
    },
    {
        seriesId: 4,
        nameRU: 'Сердце Жизни',
        nameEN: 'Life Heart',
        descRU: 'Пиксельное сердечко здоровья и выносливости из Zelda и Minecraft. Восстанавливает жизненный тонус.',
        descEN: 'Pixel heart of life and stamina from Zelda, Minecraft, and iconic RPGs. Restores maximum health.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: -1 },
            { q: 0, r: 1 },
            { q: -1, r: -1 },
            { q: 1, r: -1 },
            { q: -1, r: 1 },
            { q: 1, r: 1 },
            { q: 0, r: -2 },
            { q: 2, r: -2 },
            { q: -1, r: 2 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: -1, r: -2 },
            { q: 1, r: -2 },
            { q: -2, r: 0 },
            { q: 2, r: 0 },
            { q: -2, r: 1 },
            { q: 2, r: 1 },
            { q: -2, r: 3 },
            { q: 3, r: -2 }
        ],
        milestonesRU: ["Пульсация Канала", "Изгиб Доли", "Левое Крыло", "Сетка Здоровья", "Красный Контейнер Сердца"],
        milestonesEN: ["Life Vibe", "Lobe Curve", "Left Wing Seal", "Heart Grid Shell", "Zelda Heart Container"]
    },
    {
        seriesId: 5,
        nameRU: 'Супер Гриб',
        nameEN: 'Super Mushroom',
        descRU: 'Культовый красно-белый гриб из вселенной Super Mario Bros, увеличивающий силу и размер героя.',
        descEN: 'The iconic red spotted power-up mushroom from the Super Mario Bros world. Grants growth and speed.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
            { q: 1, r: -1 },
            { q: 0, r: -1 },
            { q: 2, r: -1 },
            { q: -1, r: 2 },
            { q: 1, r: -2 },
            { q: 0, r: -2 },
            { q: 2, r: -2 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: -2, r: 0 },
            { q: 2, r: 0 },
            { q: -2, r: 3 },
            { q: -1, r: 3 },
            { q: -1, r: -1 },
            { q: -2, r: -1 },
            { q: 3, r: -2 },
            { q: 3, r: -1 }
        ],
        milestonesRU: ["Споры Роста", "Мухоморная Ножка", "Белые Пятна", "Шляпка Гриба", "Большой Супер-Гриб Марио"],
        milestonesEN: ["Growth Spores", "Mushroom Stem", "Spun White Spots", "Spacious Cap Banner", "Super Mario Mushroom"]
    },
    {
        seriesId: 6,
        nameRU: 'Шлем Вейдера',
        nameEN: 'Vader Helmet',
        descRU: 'Зловещая обсидиановая дыхательная маска Дарта Вейдера. Тёмная Сила и грозный вид.',
        descEN: 'The imposing obsidian respirator mask of Darth Vader. Sign of cosmic dark power and dominance.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: -1, r: 1 },
            { q: 0, r: 1 },
            { q: 0, r: -1 },
            { q: 1, r: -1 },
            { q: 1, r: -2 },
            { q: 0, r: -2 },
            { q: 2, r: -2 },
            { q: -1, r: -1 },
            { q: 2, r: -1 },
            { q: -2, r: 0 },
            { q: 2, r: 0 },
            { q: -1, r: 2 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: -3, r: 2 },
            { q: 1, r: 2 },
            { q: -2, r: 3 },
            { q: -3, r: 3 },
            { q: -1, r: 3 }
        ],
        milestonesRU: ["Респиратор Ситха", "Взгляд Окуляра", "Броня Черепа", "Имперский Купол", "Маска Дарта Вейдера"],
        milestonesEN: ["Respirator Core", "Visor Gaze", "Plated Skull", "Commanding Dome", "Darth Vader Helmet"]
    },
    {
        seriesId: 7,
        nameRU: 'Череп Зомби',
        nameEN: 'Zombie Skull',
        descRU: 'Квадратная зелёная голова зомби из Minecraft. Пустые пиксельные глаза и гнилой оттенок кожи.',
        descEN: 'The square pixel head of a Minecraft zombie. Empty hollow eyes and rotting undead block features.',
        coords: [
            { q: 0, r: 0 },
            { q: 0, r: -1 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: 1 },
            { q: 1, r: -2 },
            { q: -1, r: -1 },
            { q: 1, r: -1 },
            { q: -1, r: 1 },
            { q: 1, r: -2 },
            { q: 0, r: -2 },
            { q: 2, r: -2 },
            { q: -2, r: 0 },
            { q: 2, r: 0 },
            { q: -1, r: 2 },
            { q: -2, r: 1 },
            { q: 2, r: -1 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: -1, r: 3 },
            { q: -2, r: 3 },
            { q: 0, r: 3 }
        ],
        milestonesRU: ["Пиксельные Глазницы", "Зелёная Кожа", "Челюсть Нежити", "Плита Лба", "Череп Зомби Minecraft"],
        milestonesEN: ["Pixel Sockets", "Green Rotting Flesh", "Deceased Underjaw", "Frontal Brainplate", "Minecraft Zombie Skull"]
    },
    {
        seriesId: 8,
        nameRU: 'Квантовый Портал',
        nameEN: 'Quantum Portal',
        descRU: 'Двусторонние синие/оранжевые ворота искривления пространства от Aperture Science из Portal.',
        descEN: 'The orange-blue spatial tearing portal from Aperture Science labs. Transcends 3D geometry.',
        coords: [
            { q: 0, r: 0 },
            { q: 0, r: -1 },
            { q: 0, r: 1 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 1, r: -2 },
            { q: -1, r: 2 },
            { q: -1, r: -1 },
            { q: 2, r: -1 },
            { q: -2, r: 1 },
            { q: 1, r: 1 },
            { q: 1, r: -1 },
            { q: -1, r: 1 },
            { q: 0, r: -2 },
            { q: 2, r: -2 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: -2, r: 0 },
            { q: 2, r: 0 },
            { q: 1, r: -3 },
            { q: -3, r: 2 },
            { q: 1, r: 2 }
        ],
        milestonesRU: ["Порог Апертуры", "Матрица Запуска", "Квантовый Обод", "Голубое Свечение", "Квантовый Портал Апертур"],
        milestonesEN: ["Aperture Threshold", "Launcher Matrix", "Spatial Border Loop", "Portal Shimmer Blue", "Aperture Quantum Portal"]
    },
    {
        seriesId: 9,
        nameRU: 'Покебол',
        nameEN: 'Catch Pokeball',
        descRU: 'Красно-белый сферический контейнер для поимки диких Покемонов. Культовый шар с кнопкой.',
        descEN: 'The red-and-white spherical device used to capture and carry pocket monsters. Features central push button.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: -1 },
            { q: 0, r: 1 },
            { q: -1, r: -1 },
            { q: 1, r: -1 },
            { q: -1, r: 1 },
            { q: 1, r: 1 },
            { q: -2, r: 0 },
            { q: 2, r: 0 },
            { q: 1, r: -2 },
            { q: 0, r: -2 },
            { q: 2, r: -2 },
            { q: -1, r: 2 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: -3, r: 0 },
            { q: 3, r: 0 },
            { q: -1, r: -2 },
            { q: 1, r: 2 },
            { q: -2, r: 3 }
        ],
        milestonesRU: ["Кнопка Вызова", "Поясная Защёлка", "Сфера Покемонов", "Красная Сфера", "Легендарный Мастер-Покебол"],
        milestonesEN: ["Trigger Button", "Belt Capture Seal", "Capsule Inner Chamber", "Crimson Upper Hull", "Ultimate Master Pokeball"]
    },
    {
        seriesId: 10,
        nameRU: 'Крипер',
        nameEN: 'Minecraft Creeper',
        descRU: 'Взрывная зелёная пиксельная угроза из Minecraft. Знаменитая грустная гримаса.',
        descEN: 'The iconic green pixel explosives block monster from Minecraft. Famous sad huff warning face.',
        coords: [
            { q: 0, r: 0 },
            { q: -1, r: 0 },
            { q: 1, r: 0 },
            { q: 0, r: 1 },
            { q: -1, r: 1 },
            { q: 0, r: -1 },
            { q: 1, r: -1 },
            { q: 1, r: -2 },
            { q: 0, r: -2 },
            { q: 2, r: -2 },
            { q: 1, r: -3 },
            { q: 2, r: -3 },
            { q: -1, r: 2 },
            { q: -2, r: 2 },
            { q: 0, r: 2 },
            { q: -2, r: 3 },
            { q: -3, r: 3 },
            { q: -1, r: 3 },
            { q: 0, r: 3 },
            { q: -1, r: -1 },
            { q: -1, r: -2 },
            { q: 0, r: -3 }
        ],
        milestonesRU: ["Взгляд Вредителя", "Шипение Пороха", "Грустная Гримаса", "Зелёный Блок", "Гигантский Крипер Minecraft"],
        milestonesEN: ["Spying Eye", "Gunpowder Hiss", "Frowning Face Mask", "Emerald Block Skin", "World Creeper Monument"]
    }
];


export const VIBRANT_NAMES: { nameRU: string; nameEN: string }[] = [
    // 1-20: Смайлик (Smiley)
    { nameRU: "Весёлый Смайлик", nameEN: "Classic Smiley" },
    { nameRU: "Простая Улыбка", nameEN: "Simple Smile" },
    { nameRU: "Желтый Колобок", nameEN: "Yellow Emoji" },
    { nameRU: "Искристый Смех", nameEN: "Jolly Laugh" },
    { nameRU: "Подмигивание", nameEN: "Winking Face" },
    { nameRU: "Хитрый Прищур", nameEN: "Sly Smirk" },
    { nameRU: "Радостный Взгляд", nameEN: "Vibrant Gaze" },
    { nameRU: "Добряк", nameEN: "Kind Soul" },
    { nameRU: "Смеюн", nameEN: "Chuckle Hub" },
    { nameRU: "Шептун", nameEN: "Soft Whisperer" },
    { nameRU: "Большое Лицо", nameEN: "Grand Outline" },
    { nameRU: "Скромняга", nameEN: "Shy Emoji" },
    { nameRU: "Озорник", nameEN: "Mischievous Dot" },
    { nameRU: "Круглый Смайл", nameEN: "Perfect Round" },
    { nameRU: "Эмодзи Радости", nameEN: "Joy Express" },
    { nameRU: "Весельчак", nameEN: "Happy Fellow" },
    { nameRU: "Философ", nameEN: "Thinker Cube" },
    { nameRU: "Мечтатель", nameEN: "Dreamer Core" },
    { nameRU: "Любимчик", nameEN: "Cute Face" },
    { nameRU: "Король Смайликов", nameEN: "Sovereign Smiley" },

    // 21-40: Пакман (Pacman)
    { nameRU: "Пиксельная Точка", nameEN: "Arcade Dot" },
    { nameRU: "Жёлтая Сфера", nameEN: "Yellow Arc" },
    { nameRU: "Открытый Рот", nameEN: "Pacman Mouth" },
    { nameRU: "Драже Силы", nameEN: "Power Pellet" },
    { nameRU: "Пожиратель Точек", nameEN: "Dot Muncher" },
    { nameRU: "Аркадная Вишня", nameEN: "Retro Cherry" },
    { nameRU: "Клубничка Сегмент", nameEN: "Arcade Strawberry" },
    { nameRU: "Беглец Блинки", nameEN: "Blinky Ghost" },
    { nameRU: "Беглец Пинки", nameEN: "Pinky Ghost" },
    { nameRU: "Беглец Инки", nameEN: "Inky Ghost" },
    { nameRU: "Беглец Клайд", nameEN: "Clyde Ghost" },
    { nameRU: "Ключ Квеста", nameEN: "Arcade Key" },
    { nameRU: "Угловой Туннель", nameEN: "Maze Corridor" },
    { nameRU: "Ретро-Джойстик", nameEN: "Retro Joystick" },
    { nameRU: "Игровой Автомат", nameEN: "Arcade Cabinet" },
    { nameRU: "Синее Напуганное Привидение", nameEN: "Frightened Ghost" },
    { nameRU: "Фрукт-Бонус", nameEN: "Bonus Fruit" },
    { nameRU: "Лабиринт Душ", nameEN: "Chamber Maze" },
    { nameRU: "Золотой Пакман", nameEN: "Golden Pacman" },
    { nameRU: "Ретро Пакман", nameEN: "Retro Pac-Man" },

    // 41-60: Световой Меч (Lightsaber)
    { nameRU: "Кристалл Кайбер", nameEN: "Kyber Crystal" },
    { nameRU: "Эмиттер Плазмы", nameEN: "Plasma Emitter" },
    { nameRU: "Рукоять Стали", nameEN: "Steel Hilt" },
    { nameRU: "Световой Стержень", nameEN: "Light Beam" },
    { nameRU: "Синее Лезвие", nameEN: "Blue Blade" },
    { nameRU: "Шахта Кайбера", nameEN: "Kyber Shaft" },
    { nameRU: "Гарда Меча", nameEN: "Blade Guard" },
    { nameRU: "Световой Стержень Йоды", nameEN: "Green Saber" },
    { nameRU: "Плазменный Луч ситхов", nameEN: "Crimson Saber" },
    { nameRU: "Фиолетовый Луч", nameEN: "Purple Saber" },
    { nameRU: "Кнопка Инициации", nameEN: "Power Switch" },
    { nameRU: "Орден Силы", nameEN: "Force Emblem" },
    { nameRU: "Стальной Держатель", nameEN: "Chassis Grip" },
    { nameRU: "Посох Ситха", nameEN: "Sith Staff" },
    { nameRU: "Двуручный Клинок", nameEN: "Zweihander Beam" },
    { nameRU: "Зубчатый Излучатель", nameEN: "Flared Shroud" },
    { nameRU: "Джедайский Меч", nameEN: "Knight Saber" },
    { nameRU: "Энергетический Щит", nameEN: "Aegis Saber" },
    { nameRU: "Меч Скайуокера", nameEN: "Skywalker Blade" },
    { nameRU: "Световой Меч Силы", nameEN: "Laser Lightsaber" },

    // 61-80: Сердечко (Pixel Heart)
    { nameRU: "Очко Здоровья", nameEN: "Health Dot" },
    { nameRU: "Дробь Жизни", nameEN: "Life Fraction" },
    { nameRU: "Красная Долька", nameEN: "Scarlet Lobe" },
    { nameRU: "Пиксельное Сердце", nameEN: "Pixel Heart" },
    { nameRU: "Левая Половинка", nameEN: "Left Chamber" },
    { nameRU: "Правая Половинка", nameEN: "Right Chamber" },
    { nameRU: "Рубин Силы", nameEN: "Power Ruby" },
    { nameRU: "Рупия Хайрула", nameEN: "Hyrule Rupee" },
    { nameRU: "Трифорс Золота", nameEN: "Golden Triforce" },
    { nameRU: "Контейнер Выносливости", nameEN: "Stamina Vessel" },
    { nameRU: "Амулет Сердца", nameEN: "Heart Charm" },
    { nameRU: "Сердечко Minecraft", nameEN: "Blocky Heart" },
    { nameRU: "Охрана Сердца", nameEN: "Armored Heart" },
    { nameRU: "Стеклянная Фляга Жизни", nameEN: "Elixir Bottle" },
    { nameRU: "Золотое Сердечко", nameEN: "Golden Heart" },
    { nameRU: "Кристалл Жизни", nameEN: "Lifestone Core" },
    { nameRU: "Сингулярность Любви", nameEN: "Loving Core" },
    { nameRU: "Искра Здоровья", nameEN: "Sanctuary Spark" },
    { nameRU: "Запасное Сердце", nameEN: "Reserve Heart" },
    { nameRU: "Контейнер Сердца Зельды", nameEN: "Zelda Heart Container" },

    // 81-100: Гриб Марио (Mario Mushroom)
    { nameRU: "Споры Гриба", nameEN: "Fungal Spore" },
    { nameRU: "Опорная Ножка", nameEN: "Mushroom Stem" },
    { nameRU: "Плоская Шляпка", nameEN: "Cap Base" },
    { nameRU: "Белая Крапинка", nameEN: "White Spot" },
    { nameRU: "Зеленый 1-UP Гриб", nameEN: "1-UP Spore" },
    { nameRU: "Красный Супер-Гриб", nameEN: "Super Spore" },
    { nameRU: "Монстр Гумба", nameEN: "Enemy Goomba" },
    { nameRU: "Труба Марио", nameEN: "Warp Pipe" },
    { nameRU: "Огненный Цветок", nameEN: "Fire Flower" },
    { nameRU: "Супер Золотая Звезда", nameEN: "Starman Power" },
    { nameRU: "Блок с Вопросом", nameEN: "Question Block" },
    { nameRU: "Луиджи Зеленка", nameEN: "Luigi Green" },
    { nameRU: "Замок Принцессы Пич", nameEN: "Peach Castle" },
    { nameRU: "Золотая Монетка", nameEN: "Retro Coin" },
    { nameRU: "Панцирь Черепахи Купы", nameEN: "Koopa Shell" },
    { nameRU: "Кирпичный Блок", nameEN: "Brick Block" },
    { nameRU: "Пингвин-костюм", nameEN: "Penguin Suit" },
    { nameRU: "Летающий Лист Тануки", nameEN: "Tanooki Leaf" },
    { nameRU: "Облачный Купол", nameEN: "Cloud Cap" },
    { nameRU: "Гигантский Гриб Марио", nameEN: "Super Mario Mushroom" },

    // 101-120: Шлем Вейдера (Vader Helmet)
    { nameRU: "Окуляр Ситха", nameEN: "Sith Lens" },
    { nameRU: "Решётка Дыхания", nameEN: "Respirator Mesh" },
    { nameRU: "Противогаз Тьмы", nameEN: "Shadow Filter" },
    { nameRU: "Купол Шлема", nameEN: "Iron Dome" },
    { nameRU: "Имперская Кокарда", nameEN: "Imperial Cog" },
    { nameRU: "Тёмный Офицер", nameEN: "Officer Skull" },
    { nameRU: "Маска Пилота", nameEN: "TIE Pilot Shroud" },
    { nameRU: "Крыло Разрушителя", nameEN: "Destroyer Hull" },
    { nameRU: "Тронный Столб", nameEN: "Throne Spire" },
    { nameRU: "Звезда Смерти Ядро", nameEN: "Death Star Core" },
    { nameRU: "Шлем Вейдера Сбоку", nameEN: "Vader Profile" },
    { nameRU: "Имперский Штурмовик", nameEN: "Stormtrooper Plate" },
    { nameRU: "Алая Гвардия", nameEN: "Royal Guard Visor" },
    { nameRU: "Клон-Шлем", nameEN: "Clone Phase II" },
    { nameRU: "Ситхский Медальон", nameEN: "Sith medallion" },
    { nameRU: "Звёздная Верфь", nameEN: "Star Forge" },
    { nameRU: "Маска Лорда", nameEN: "Lord Mask" },
    { nameRU: "Броня Из Тьмы", nameEN: "Obsidian Shell" },
    { nameRU: "Капюшон Ситха", nameEN: "Emperor Hood" },
    { nameRU: "Шлем Дарта Вейдера", nameEN: "Darth Vader Helmet" },

    // 121-140: Череп Зомби (Zombie Skull)
    { nameRU: "Зеленая Кожа", nameEN: "Rotten Skin" },
    { nameRU: "Пустая Челюсть", nameEN: "Undead Jaw" },
    { nameRU: "Взгляд Зомби", nameEN: "Zombie Gaze" },
    { nameRU: "Квадратная Голова", nameEN: "Cubic Head" },
    { nameRU: "Голова Стива", nameEN: "Steve Block" },
    { nameRU: "Скелет Кость", nameEN: "Skeleton Skull" },
    { nameRU: "Паучий Глаз", nameEN: "Spider Eye" },
    { nameRU: "Ведьмин Котёл", nameEN: "Witch Cauldron" },
    { nameRU: "Гнилая Плоть", nameEN: "Rotten Flesh" },
    { nameRU: "Кадавр пустыни", nameEN: "Husk Skull" },
    { nameRU: "Утопленник Тёмный", nameEN: "Drowned Head" },
    { nameRU: "Зомби-Свиночеловек", nameEN: "Zombie Pigman" },
    { nameRU: "Зомби Бродяга", nameEN: "Stray Face" },
    { nameRU: "Шлем Из Костей", nameEN: "Bone Headdress" },
    { nameRU: "Топор Дровосека", nameEN: "Iron Cleaver" },
    { nameRU: "Блок Земли", nameEN: "Dirt Block" },
    { nameRU: "Заражение Биома", nameEN: "Infested Soil" },
    { nameRU: "Орда Зомби", nameEN: "Zombie Swarm" },
    { nameRU: "Некро-Блок", nameEN: "Necro Block" },
    { nameRU: "Череп Зомби Minecraft", nameEN: "Minecraft Zombie Skull" },

    // 141-160: Квантовый Портал (Portal)
    { nameRU: "Генератор Порталов", nameEN: "Portal Gun" },
    { nameRU: "Голубой Свод", nameEN: "Blue Ring" },
    { nameRU: "Оранжевый Свод", nameEN: "Orange Ring" },
    { nameRU: "Куб Компаньон", nameEN: "Companion Cube" },
    { nameRU: "Мотор Уитли", nameEN: "Wheatley Sphere" },
    { nameRU: "Босс ГЛэДОС", nameEN: "GLaDOS Core" },
    { nameRU: "Турель Дозора", nameEN: "Sentry Turret" },
    { nameRU: "Апертур Тест-Комната", nameEN: "Aperture Tile" },
    { nameRU: "Гравитационный Гель", nameEN: "Bouncy Gel" },
    { nameRU: "Скоростной Гель", nameEN: "Speedy Gel" },
    { nameRU: "Решётка Очистки", nameEN: "Fizzler Grid" },
    { nameRU: "Утяжеленный Куб", nameEN: "Storage Cube" },
    { nameRU: "Лазерное Прицеливание", nameEN: "Laser Target" },
    { nameRU: "Кнопка Веса", nameEN: "Floor Button" },
    { nameRU: "Радио-Локатор", nameEN: "Radio Signal" },
    { nameRU: "Ядро Безумия", nameEN: "Anger Core" },
    { nameRU: "Разлом Реальности", nameEN: "Void Tearing" },
    { nameRU: "Овальный Переход", nameEN: "Oval Gateway" },
    { nameRU: "Лаборатория Торта", nameEN: "The Lie Cake" },
    { nameRU: "Портал Aperture Science", nameEN: "Aperture Quantum Portal" },

    // 161-180: Покебол (Pokeball)
    { nameRU: "Железная Защелка", nameEN: "Latch Button" },
    { nameRU: "Центральная Кнопка", nameEN: "Trigger Button" },
    { nameRU: "Красное Полушарие", nameEN: "Red Dome" },
    { nameRU: "Белая Чаша", nameEN: "White Base" },
    { nameRU: "Грейт-Бол", nameEN: "Great Ball" },
    { nameRU: "Ультра-Бол", nameEN: "Ultra Ball" },
    { nameRU: "Мастер-Бол", nameEN: "Master Ball" },
    { nameRU: "Кепка Тренера Эша", nameEN: "Trainers Cap" },
    { nameRU: "Щёчки Пикачу", nameEN: "Pikachu Cheeks" },
    { nameRU: "Уши Споты", nameEN: "Pika Ears" },
    { nameRU: "Молния Наволочка", nameEN: "Thunder Emblem" },
    { nameRU: "Сканер Покедекс", nameEN: "Pokedex Monitor" },
    { nameRU: "Ягодка Черри", nameEN: "Oran Berry" },
    { nameRU: "Лига Покемонов", nameEN: "League Pin" },
    { nameRU: "Водный Брызг Сквиртла", nameEN: "Water Blast" },
    { nameRU: "Огонёк Чармандера", nameEN: "Tail Flame" },
    { nameRU: "Бутон Бульбазавра", nameEN: "Seed Bulb" },
    { nameRU: "Трава Сафари", nameEN: "Safari Bush" },
    { nameRU: "Арена Боя", nameEN: "Battle Stadium" },
    { nameRU: "Покебол Ловли", nameEN: "Catch Pokeball" },

    // 181-200: Крипер (Creeper)
    { nameRU: "Запас Пороха", nameEN: "Gunpowder Chest" },
    { nameRU: "Веревка Саботажа", nameEN: "Igniting String" },
    { nameRU: "Минный Блок", nameEN: "Redstone Trap" },
    { nameRU: "Бесшумный Подход", nameEN: "Silent Hoof" },
    { nameRU: "Опасная Маска", nameEN: "Creeper Face" },
    { nameRU: "Красная Пыль Майнкрафта", nameEN: "Redstone Cable" },
    { nameRU: "Динамит Спичка", nameEN: "TNT Fuse" },
    { nameRU: "Грусть Крипера", nameEN: "Frowning Mouth" },
    { nameRU: "Заряженное Тело", nameEN: "Charged Shell" },
    { nameRU: "Вспышка Молнии", nameEN: "Lightning Strike" },
    { nameRU: "Кубическая Кожа", nameEN: "Green Pixels" },
    { nameRU: "Ужас Редстоуна", nameEN: "Redstone Horror" },
    { nameRU: "Глаза Взрывателя", nameEN: "Explosive Eyes" },
    { nameRU: "Обсидиановая Коробка", nameEN: "Obsidian Shell" },
    { nameRU: "Кирка Шахтера", nameEN: "Diamond Pickaxe" },
    { nameRU: "Алмазная Глыба", nameEN: "Diamond Ore" },
    { nameRU: "Эндер Портал", nameEN: "Ender Portal" },
    { nameRU: "Золотое Яблоко", nameEN: "Golden Apple" },
    { nameRU: "Взрыв Сегмента", nameEN: "Sizzling Hiss" },
    { nameRU: "Легендарный Крипер", nameEN: "Minecraft Creeper" }
];

export const getCustomShapeForName = (nameEN: string, seriesCoords: { q: number; r: number }[]): { q: number; r: number }[] => {
    const nameLower = nameEN.toLowerCase();

    if (nameLower.includes("pikachu") || nameLower.includes("pika")) {
        return [
            { q: 0, r: 0 }, { q: -1, r: 0 }, { q: 1, r: 0 },
            { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 1 }, { q: -2, r: 1 }, { q: 2, r: 0 },
            { q: -1, r: -1 }, { q: 1, r: -1 }, { q: 0, r: -1 },
            { q: -2, r: -1 }, { q: -3, r: -2 }, { q: -4, r: -2 },
            { q: 2, r: -2 }, { q: 3, r: -3 }, { q: 4, r: -4 }
        ];
    }
    if (nameLower.includes("ghost") || nameLower.includes("blinky") || nameLower.includes("pinky") || nameLower.includes("inky") || nameLower.includes("clyde")) {
        return [
            { q: 0, r: 0 },
            { q: 0, r: -1 }, { q: -1, r: 0 }, { q: 1, r: -1 },
            { q: -1, r: -1 }, { q: 1, r: -2 },
            { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 0 },
            { q: -2, r: 1 }, { q: 2, r: -1 },
            { q: -1, r: 2 }, { q: 1, r: 1 },
            { q: -2, r: 2 }, { q: 2, r: 0 }
        ];
    }
    if (nameLower.includes("cherry") || nameLower.includes("strawberry") || nameLower.includes("berry") || nameLower.includes("fruit")) {
        return [
            { q: 0, r: 1 }, { q: -1, r: 2 }, { q: 0, r: 2 },
            { q: 1, r: 0 }, { q: 2, r: -1 }, { q: 2, r: 0 },
            { q: 0, r: 0 }, { q: 1, r: -1 }, { q: 1, r: -2 }, { q: 0, r: -1 }
        ];
    }
    if (nameLower.includes("key")) {
        return [
            { q: 0, r: 0 }, { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 }, { q: -1, r: 0 },
            { q: 1, r: 1 }, { q: 2, r: 2 }, { q: 3, r: 3 },
            { q: 2, r: 3 }, { q: 3, r: 4 }
        ];
    }
    if (nameLower.includes("joystick")) {
        return [
            { q: 0, r: 2 }, { q: -1, r: 2 }, { q: 1, r: 1 }, { q: 0, r: 3 }, { q: -1, r: 3 },
            { q: 0, r: 1 }, { q: 0, r: 0 },
            { q: 0, r: -1 }, { q: -1, r: -1 }, { q: 1, r: -1 }, { q: 0, r: -2 }
        ];
    }
    if (nameLower.includes("crystal") || nameLower.includes("ruby") || nameLower.includes("rupee") || nameLower.includes("gem") || nameLower.includes("lifestone") || nameLower.includes("loving")) {
        return [
            { q: 0, r: 0 },
            { q: 0, r: -1 }, { q: 0, r: 1 },
            { q: -1, r: 1 }, { q: 1, r: -1 },
            { q: -1, r: 2 }, { q: 1, r: -2 },
            { q: 0, r: -2 }, { q: 0, r: 2 }
        ];
    }
    if (nameLower.includes("hilt") || nameLower.includes("grip") || nameLower.includes("emitter")) {
        return [
            { q: 0, r: 0 }, { q: 1, r: -1 }, { q: -1, r: 1 },
            { q: 0, r: -1 }, { q: 1, r: -2 },
            { q: -1, r: 0 }, { q: -2, r: 1 },
            { q: 0, r: 1 }, { q: -1, r: 2 }
        ];
    }
    if (nameLower.includes("emblem") || nameLower.includes("starman") || nameLower.includes("star") || nameLower.includes("orden")) {
        return [
            { q: 0, r: 0 },
            { q: 0, r: -1 }, { q: 0, r: 1 },
            { q: -1, r: 0 }, { q: 1, r: 0 },
            { q: 1, r: -1 }, { q: -1, r: 1 },
            { q: -2, r: 1 }, { q: 2, r: -1 },
            { q: 1, r: -2 }, { q: -1, r: 2 },
            { q: -2, r: 2 }, { q: 2, r: -2 }
        ];
    }
    if (nameLower.includes("triforce")) {
        return [
            { q: 0, r: -2 }, { q: -1, r: -1 }, { q: 1, r: -2 },
            { q: -2, r: 1 }, { q: -1, r: 1 }, { q: -2, r: 2 },
            { q: 1, r: 1 }, { q: 2, r: 0 }, { q: 2, r: 1 }
        ];
    }
    if (nameLower.includes("bottle") || nameLower.includes("flask") || nameLower.includes("vial") || nameLower.includes("elixir")) {
        return [
            { q: 0, r: -2 }, { q: 0, r: -1 },
            { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 },
            { q: -1, r: 1 }, { q: 1, r: 1 },
            { q: 0, r: 1 },
            { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 2 }
        ];
    }
    if (nameLower.includes("pipe")) {
        return [
            { q: -1, r: -1 }, { q: 0, r: -1 }, { q: 1, r: -1 },
            { q: -1, r: 0 }, { q: 0, r: 0 }, { q: 1, r: 0 },
            { q: 0, r: 1 }, { q: 1, r: 1 },
            { q: 0, r: 2 }, { q: 1, r: 2 },
            { q: 0, r: 3 }
        ];
    }
    if (nameLower.includes("block") || nameLower.includes("box") || nameLower.includes("cube") || nameLower.includes("question") || nameLower.includes("chest") || nameLower.includes("ore") || nameLower.includes("pixels") || nameLower.includes("soil")) {
        return [
            { q: 0, r: 0 }, { q: -1, r: 0 }, { q: 1, r: 0 },
            { q: 0, r: -1 }, { q: 1, r: -1 }, { q: -1, r: 1 }, { q: 0, r: 1 },
            { q: -1, r: -1 }, { q: 1, r: -2 }, { q: 0, r: -2 }, { q: -1, r: 2 }, { q: 0, r: 2 },
            { q: -2, r: 0 }, { q: 2, r: 0 }, { q: -2, r: 1 }, { q: 2, r: -1 }
        ];
    }
    if (nameLower.includes("death star")) {
        return [
            { q: 0, r: 0 }, { q: 0, r: -1 }, { q: 0, r: 1 }, { q: -1, r: 0 }, { q: 1, r: 0 },
            { q: -1, r: -1 }, { q: -1, r: 1 }, { q: 1, r: 1 },
            { q: -2, r: 1 }, { q: 2, r: -1 }, { q: 0, r: -2 }, { q: 2, r: -2 },
            { q: -1, r: 2 }, { q: 0, r: 2 }, { q: -2, r: 2 },
            { q: -2, r: 0 }, { q: 2, r: 0 }
        ];
    }
    if (nameLower.includes("pickaxe") || nameLower.includes("axe") || nameLower.includes("cleaver") || nameLower.includes("sword") || nameLower.includes("blade") || nameLower.includes("staff")) {
        return [
            { q: 0, r: 0 }, { q: -1, r: 1 }, { q: -2, r: 2 }, { q: -3, r: 3 }, { q: -4, r: 4 },
            { q: 1, r: -1 }, { q: 2, r: -2 }, { q: 3, r: -3 },
            { q: 0, r: -1 }, { q: -1, r: -1 }, { q: -1, r: -2 }
        ];
    }
    if (nameLower.includes("turret") || nameLower.includes("sentry")) {
        return [
            { q: 0, r: -2 },
            { q: 0, r: -1 }, { q: -1, r: -1 }, { q: 1, r: -2 },
            { q: 0, r: 0 }, { q: -1, r: 0 }, { q: 1, r: 0 },
            { q: -1, r: 1 }, { q: 1, r: 1 },
            { q: -2, r: 2 }, { q: 0, r: 2 }, { q: 2, r: 2 }
        ];
    }
    if (nameLower.includes("ender portal") || nameLower.includes("frame")) {
        return [
            { q: -2, r: -2 }, { q: -1, r: -2 }, { q: 0, r: -2 }, { q: 1, r: -2 }, { q: 2, r: -2 },
            { q: -2, r: -1 }, { q: 2, r: -1 },
            { q: -2, r: 0 }, { q: 2, r: 0 },
            { q: -2, r: 1 }, { q: 2, r: 1 },
            { q: -2, r: 2 }, { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 2 }, { q: 2, r: 2 }
        ];
    }
    if (nameLower.includes("bulb") || nameLower.includes("seed") || nameLower.includes("spore")) {
        return [
            { q: 0, r: 0 }, { q: -1, r: 0 }, { q: 1, r: 0 },
            { q: 0, r: -1 }, { q: -1, r: 1 }, { q: 1, r: -1 },
            { q: 0, r: -2 }, { q: -1, r: -1 }, { q: 1, r: -2 },
            { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 1 }
        ];
    }
    if (nameLower.includes("beam") || nameLower.includes("line")) {
        return [
            { q: 0, r: 0 }, { q: 0, r: -1 }, { q: 0, r: -2 }, { q: 0, r: -3 }, { q: 0, r: -4 }, { q: 0, r: -5 }, { q: 0, r: 1 }, { q: 0, r: 2 }
        ];
    }
    if (nameLower.includes("wink")) {
        return seriesCoords.filter(c => !(c.q === -1 && c.r === -1));
    }

    return seriesCoords;
};

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
        const { series } = getSeriesForIndex(index);
        
        // 1. Level constraint logic:
        // First 10 figures must be level 0 strictly. Then we unlock a new level tier every 20 levels.
        let maxLvl = 0;
        if (index <= 10) {
            maxLvl = 0;
        } else {
            const tier = Math.floor((index - 11) / 20);
            maxLvl = Math.min(9, tier + 1);
        }

        // Get the signature unique name of the figure
        const nameUnit = VIBRANT_NAMES[index - 1] || { nameRU: `Фигура ${index}`, nameEN: `Figure ${index}` };
        const nameRU = nameUnit.nameRU;
        const nameEN = nameUnit.nameEN;

        // Custom shape lookup based on name to keep ALL shapes highly recognizable and complete
        const baseCoords = getCustomShapeForName(nameEN, series.coords);
        const size = baseCoords.length;

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
