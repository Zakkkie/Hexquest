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
    descRU: string;
    descEN: string;
    shape: { q: number, r: number, lvl?: number }[];
    rewardSP: number;
}

export const STATIC_FIGURES: Figure[] = [
    // --- CHAPTER I: NEXUS CORE (1-10) ---
    {
        id: 'c1_f1',
        nameRU: 'Шаг 1: Опорный Анкер (1 гекс L0)',
        nameEN: 'Step 1: Anchor Node (1 Hex L0)',
        descRU: 'Установите базовый гекс 0-го уровня в центре поля для начала постройки Ядра Нексуса.',
        descEN: 'Place the central starting level 0 hex on the field to begin anchoring the Nexus Core network.',
        shape: [{ q: 0, r: 0, lvl: 0 }],
        rewardSP: 1
    },
    {
        id: 'c1_f2',
        nameRU: 'Шаг 2: Векторная Связь (2 гекса L0)',
        nameEN: 'Step 2: Vector Link (2 Hexes L0)',
        descRU: 'Объедините два смежных гекса L0. Это создаст первичный направленный энергетический канал.',
        descEN: 'Deploy two adjacent L0 hexes side by side to establish a primary energy link vector.',
        shape: [{ q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 0 }],
        rewardSP: 1
    },
    {
        id: 'c1_f3',
        nameRU: 'Шаг 3: Искровой Треугольник (3 гекса L0)',
        nameEN: 'Step 3: Spark Triangle (3 Hexes L0)',
        descRU: 'Составьте базовый треугольник из 3-х смежных гексов 0-го уровня вокруг опорной зоны.',
        descEN: 'Form a compact triangle layout using 3 adjacent level 0 hexes.',
        shape: [{ q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }],
        rewardSP: 1
    },
    {
        id: 'c1_f4',
        nameRU: 'Шаг 4: Ячейка Ромба (4 гекса L0)',
        nameEN: 'Step 4: Rhombus Cell (4 Hexes L0)',
        descRU: 'Расширьте треугольник в ромб из 4-х гексов L0. Это усилит стабильность структуры ядра.',
        descEN: 'Expand the configuration to a rhombus shape using 4 adjacent level 0 hexes.',
        shape: [{ q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }, { q: 2, r: -1, lvl: 0 }],
        rewardSP: 1
    },
    {
        id: 'c1_f5',
        nameRU: 'Шаг 5: Стрела Нексуса (5 гексов L0)',
        nameEN: 'Step 5: Nexus Arrow (5 Hexes L0)',
        descRU: 'Сформируйте направленную стрелу из 5 гексов L0 для фокусирования энергетических полей.',
        descEN: 'Construct an arrow-shaped formation with 5 level 0 hexes to channel the core focus.',
        shape: [{ q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }, { q: 2, r: -1, lvl: 0 }, { q: 2, r: 0, lvl: 0 }],
        rewardSP: 1
    },
    {
        id: 'c1_f6',
        nameRU: 'Шаг 6: Малое Кольцо (6 гексов L0)',
        nameEN: 'Step 6: Small Hex-Ring (6 Hexes L0)',
        descRU: 'Соберите защитный барьер из 6 гексов L0 кольцом вокруг пустой центральной точки.',
        descEN: 'Assemble a protective perimeter of 6 level 0 hexes forming a ring around an empty coordinate.',
        shape: [
            { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 0 },
            { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 0 }, { q: 0, r: -1, lvl: 0 }
        ],
        rewardSP: 1
    },
    {
        id: 'c1_f7',
        nameRU: 'Шаг 7: Звездный Хаб (7 гексов L0)',
        nameEN: 'Step 7: Star Hub (7 Hexes L0)',
        descRU: 'Заполните пустоту в кольце, выложив цветок из 7-ми гексов L0 с центральным узлом.',
        descEN: 'Fill the center of the ring, completing a solid flower blossom of 7 level 0 hexes.',
        shape: [
            { q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 },
            { q: 0, r: 1, lvl: 0 }, { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 0 }, { q: 0, r: -1, lvl: 0 }
        ],
        rewardSP: 1
    },
    {
        id: 'c1_f8',
        nameRU: 'Шаг 8: Облачная Ветвь (5 гексов L1)',
        nameEN: 'Step 8: Cloud Branch (5 Hexes L1)',
        descRU: 'Постройте прямую энергетическую ветвь из 5-ти смежных гексов 1-го уровня.',
        descEN: 'Erect a linear configuration of 5 adjacent level 1 hexes.',
        shape: [
            { q: 0, r: 0, lvl: 1 }, { q: 1, r: -1, lvl: 1 }, { q: 2, r: -2, lvl: 1 },
            { q: 3, r: -3, lvl: 1 }, { q: 4, r: -4, lvl: 1 }
        ],
        rewardSP: 2
    },
    {
        id: 'c1_f9',
        nameRU: 'Шаг 9: Воздушный Пропеллер (7 гексов L1)',
        nameEN: 'Step 9: Sky Propeller (7 Hexes L1)',
        descRU: 'Сформируйте вращающийся пропеллер из 7 гексов L1, балансируя энергетические контуры.',
        descEN: 'Structure a rotating 3-blade propeller shape out of 7 level 1 hexes.',
        shape: [
            { q: 0, r: 0, lvl: 1 }, { q: 1, r: -1, lvl: 1 }, { q: 2, r: -2, lvl: 1 },
            { q: -1, r: 1, lvl: 1 }, { q: -2, r: 2, lvl: 1 }, { q: 1, r: 0, lvl: 1 }, { q: 2, r: 0, lvl: 1 }
        ],
        rewardSP: 2
    },
    {
        id: 'c1_f10',
        nameRU: 'Шаг 10: Монолитное Кольцо (12 гексов L0 и L1)',
        nameEN: 'Step 10: Monolithic Halo (12 Hexes L0 & L1)',
        descRU: 'Соберите монументальное внешнее кольцо. Торжественно завершите Первую Главу!',
        descEN: 'Assemble a massive composite outer ring structure to complete Chapter One!',
        shape: [
            { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 0 },
            { q: -1, r: 1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 1 },
            { q: 2, r: -2, lvl: 0 }, { q: 2, r: 0, lvl: 0 }, { q: -2, r: 2, lvl: 1 },
            { q: -2, r: 0, lvl: 1 }, { q: 0, r: 2, lvl: 0 }, { q: 0, r: -2, lvl: 1 }
        ],
        rewardSP: 3
    },

    // --- CHAPTER II: ELEVATION RESONANCE (11-20) ---
    {
        id: 'c2_f1',
        nameRU: 'Шаг 11: Одинокий Столп (1 гекс L2)',
        nameEN: 'Step 11: Lone Pillar (1 Hex L2)',
        descRU: 'Возведите одинокую вершину уровня L2. Используйте опору для прочности.',
        descEN: 'Raise a single level 2 hex pillar in the center of the target grid.',
        shape: [{ q: 0, r: 0, lvl: 2 }],
        rewardSP: 1
    },
    {
        id: 'c2_f2',
        nameRU: 'Шаг 12: Двутавровая Балка (2 гекса L2)',
        nameEN: 'Step 12: Twin Pillars (2 Hexes L2)',
        descRU: 'Установите две соседние башни L2 для создания первого высотного барьера.',
        descEN: 'Erect two adjacent level 2 pillars on the blueprint mesh blocks.',
        shape: [{ q: 0, r: 0, lvl: 2 }, { q: 1, r: -1, lvl: 2 }],
        rewardSP: 1
    },
    {
        id: 'c2_f3',
        nameRU: 'Шаг 13: Малый Каскад (3 гекса: L1 и L2)',
        nameEN: 'Step 13: Mini Cascade (3 Hexes: L1 & L2)',
        descRU: 'Сформируйте лестничный подъем из одной плиты L1 и двух высотных пиков L2.',
        descEN: 'Form a stepped slope cascade containing one level 1 and two level 2 hexes.',
        shape: [{ q: 0, r: 0, lvl: 2 }, { q: 1, r: -1, lvl: 2 }, { q: 0, r: 1, lvl: 1 }],
        rewardSP: 1
    },
    {
        id: 'c2_f4',
        nameRU: 'Шаг 14: Камерный Алтарь (4 гекса: L1 и L2)',
        nameEN: 'Step 14: Chamber Altar (4 Hexes: L1 & L2)',
        descRU: 'Постройте алтарь, защищенный по бокам плитами L1. Две центральные башни — L2.',
        descEN: 'Design a hollow altar layout with level 1 wings and level 2 central focus peaks.',
        shape: [{ q: 0, r: 0, lvl: 2 }, { q: 1, r: -1, lvl: 2 }, { q: 0, r: 1, lvl: 1 }, { q: 1, r: 0, lvl: 1 }],
        rewardSP: 1
    },
    {
        id: 'c2_f5',
        nameRU: 'Шаг 15: Двойной Восходящий Вектор (5 гексов: L1 и L2)',
        nameEN: 'Step 15: Twin Ascent Vector (5 Hexes: L1 & L2)',
        descRU: 'Соберите ступенчатый узор: 3 плиты L1 в основании, 2 башни L2 на вершине.',
        descEN: 'Deploy three level 1 foundation blocks supporting two level 2 towers.',
        shape: [{ q: 0, r: 0, lvl: 2 }, { q: 1, r: -1, lvl: 2 }, { q: 0, r: 1, lvl: 1 }, { q: 1, r: 0, lvl: 1 }, { q: -1, r: 1, lvl: 1 }],
        rewardSP: 1
    },
    {
        id: 'c2_f6',
        nameRU: 'Шаг 16: Зубчатая Корона (6 гексов: L1 и L2)',
        nameEN: 'Step 16: Jagged Crown (6 Hexes: L1 & L2)',
        descRU: 'Расположите три башни L2, разделенные опорными низинами L1 в форме короны.',
        descEN: 'Construct a royal crown perimeter utilizing alternating level 1 and level 2 hexes.',
        shape: [{ q: 0, r: 0, lvl: 2 }, { q: 1, r: 0, lvl: 1 }, { q: 2, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 1 }, { q: 1, r: 1, lvl: 2 }, { q: -1, r: 1, lvl: 1 }],
        rewardSP: 1
    },
    {
        id: 'c2_f7',
        nameRU: 'Шаг 17: Энергетический Клин (7 гексов: L1 и L2)',
        nameEN: 'Step 17: Energy Wedge (7 Hexes: L1 & L2)',
        descRU: 'Выложите ромбовидный клин: центральное ребро L2, лепестки и основание — L1.',
        descEN: 'Arrange a triangular wedge shield layout with level 2 center edge and level 1 flanks.',
        shape: [
            { q: 0, r: 0, lvl: 2 }, { q: 1, r: -1, lvl: 2 }, { q: -1, r: 1, lvl: 1 },
            { q: 1, r: 0, lvl: 1 }, { q: 0, r: 1, lvl: 1 }, { q: 2, r: -1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }
        ],
        rewardSP: 2
    },
    {
        id: 'c2_f8',
        nameRU: 'Шаг 18: Тектонический Купол (8 гексов L2)',
        nameEN: 'Step 18: Tectonic Dome (8 Hexes L2)',
        descRU: 'Возведите обширную ровную горизонтальную платформу L2 из 8-ми смежных гексов.',
        descEN: 'Cover an extensive planar continuous surface using 8 adjacent level 2 tiles.',
        shape: [
            { q: 0, r: 0, lvl: 2 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 2 },
            { q: -1, r: 1, lvl: 2 }, { q: -1, r: 0, lvl: 2 }, { q: 0, r: -1, lvl: 2 }, { q: 2, r: -1, lvl: 2 }
        ],
        rewardSP: 2
    },
    {
        id: 'c2_f9',
        nameRU: 'Шаг 19: Квантовый Конденсатор (9 гексов: L1 и L2)',
        nameEN: 'Step 19: Quantum Capacitor (9 Hexes: L1 & L2)',
        descRU: 'Постройте замкнутый накопитель: 4 накопительных ядра L2, опоясанных барьером L1.',
        descEN: 'Organize a closed battery pack of 4 level 2 storage nodes and 5 perimeter level 1 nodes.',
        shape: [
            { q: 0, r: 0, lvl: 2 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 1 }, { q: 2, r: -1, lvl: 2 },
            { q: 2, r: -2, lvl: 1 }
        ],
        rewardSP: 2
    },
    {
        id: 'c2_f10',
        nameRU: 'Шаг 20: Крепостной Бастион (10 гексов: L1 и L2)',
        nameEN: 'Step 20: Citadel Bastion (10 Hexes: L1 & L2)',
        descRU: 'Выстройте оборонительную цитадель. Величественно закройте Вторую Главу!',
        descEN: 'Construct a military stronghold bastion layer. Heroically finalize Chapter Two!',
        shape: [
            { q: 0, r: 0, lvl: 2 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 1 }, { q: 2, r: -1, lvl: 2 },
            { q: 2, r: -2, lvl: 1 }, { q: -2, r: 2, lvl: 1 }
        ],
        rewardSP: 3
    },

    // --- CHAPTER III: APEX SPARK (21-30) ---
    {
        id: 'c3_f1',
        nameRU: 'Шаг 21: Воздушный Шпиль (1 гекс L3)',
        nameEN: 'Step 21: Aether Spire (1 Hex L3)',
        descRU: 'Возведите сложную супервысокую башню L3 в самом эпицентре.',
        descEN: 'Erect an advanced towering level 3 gravity spout.',
        shape: [{ q: 0, r: 0, lvl: 3 }],
        rewardSP: 1
    },
    {
        id: 'c3_f2',
        nameRU: 'Шаг 22: Ворота Асгарда (2 гекса L3)',
        nameEN: 'Step 22: Asgard Gate (2 Hexes L3)',
        descRU: 'Установите две величественные арки уровня L3 для приема восходящих потоков.',
        descEN: 'Place two hyper-high level 3 gateway pillars side by side.',
        shape: [{ q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 3 }],
        rewardSP: 1
    },
    {
        id: 'c3_f3',
        nameRU: 'Шаг 23: Высотный Кронштейн (3 гекса: L2 и L3)',
        nameEN: 'Step 23: High Bracket (3 Hexes: L2 & L3)',
        descRU: 'Создайте ступенчатый карниз: две вершины L3 опираются на одну подпорку L2.',
        descEN: 'Assemble a high platform with two level 3 nodes cantilevered on a level 2 support.',
        shape: [{ q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 3 }, { q: 0, r: 1, lvl: 2 }],
        rewardSP: 1
    },
    {
        id: 'c3_f4',
        nameRU: 'Шаг 24: Обелиск Небес (4 гекса: L2 и L3)',
        nameEN: 'Step 24: Heaven Obelisk (4 Hexes: L2 & L3)',
        descRU: 'Постройте треугольный обелиск с тремя пиками L3 и прочной центральной опорой L2.',
        descEN: 'Construct a sky tripod layout using three level 3 spikes and one level 2 hub block.',
        shape: [{ q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 3 }, { q: 1, r: 0, lvl: 3 }, { q: 0, r: 1, lvl: 2 }],
        rewardSP: 1
    },
    {
        id: 'c3_f5',
        nameRU: 'Шаг 25: Драккар (5 гексов: L2 и L3)',
        nameEN: 'Step 25: Drakkar Ship (5 Hexes: L2 & L3)',
        descRU: 'Сформируйте очертания корабля: нос и корма L3, палуба и борта — L2.',
        descEN: 'Deploy a ship-shaped profile with level 3 bow/stern and level 2 hull plates.',
        shape: [{ q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 3 }, { q: 0, r: 1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: -1, r: 1, lvl: 2 }],
        rewardSP: 1
    },
    {
        id: 'c3_f6',
        nameRU: 'Шаг 26: Трезубец Борея (6 гексов: L2 и L3)',
        nameEN: 'Step 26: Boreas Trident (6 Hexes: L2 & L3)',
        descRU: 'Выложите мощный трезубец с тремя направленными ребрами L3 и рукоятью L2.',
        descEN: 'Erect a legendary trident pitch utilizing level 3 spikes and level 2 central joint.',
        shape: [{ q: 0, r: 0, lvl: 3 }, { q: 1, r: 0, lvl: 2 }, { q: 2, r: 0, lvl: 3 }, { q: 0, r: 1, lvl: 2 }, { q: 1, r: 1, lvl: 3 }, { q: -1, r: 1, lvl: 2 }],
        rewardSP: 1
    },
    {
        id: 'c3_f7',
        nameRU: 'Шаг 27: Золотой Алтарь (7 гексов L3)',
        nameEN: 'Step 27: Sovereign Altar (7 Hexes L3)',
        descRU: 'Полностью выложите сплошную величественную платформу L3 из 7-ми гексов.',
        descEN: 'Form a continuous, premium seven-element circular platform strictly made of level 3 blocks.',
        shape: [
            { q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 3 }, { q: 1, r: 0, lvl: 3 },
            { q: 0, r: 1, lvl: 3 }, { q: -1, r: 1, lvl: 3 }, { q: -1, r: 0, lvl: 3 }, { q: 0, r: -1, lvl: 3 }
        ],
        rewardSP: 2
    },
    {
        id: 'c3_f8',
        nameRU: 'Шаг 28: Храмовый Шлейф (8 гексов: L2 и L3)',
        nameEN: 'Step 28: Temple Wings (8 Hexes: L2 & L3)',
        descRU: 'Соберите красивейший Храм: центральные купола L3 окружены крыльями-опорами L2.',
        descEN: 'Construct a temple facade with level 3 domes protected by level 2 outer wingwalls.',
        shape: [
            { q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 3 }, { q: 1, r: 0, lvl: 3 }, { q: 0, r: 1, lvl: 2 },
            { q: -1, r: 1, lvl: 2 }, { q: -1, r: 0, lvl: 2 }, { q: 0, r: -1, lvl: 2 }, { q: 2, r: -2, lvl: 3 }
        ],
        rewardSP: 2
    },
    {
        id: 'c3_f9',
        nameRU: 'Шаг 29: Храмовые Леса (L1, L2 и L3)',
        nameEN: 'Step 29: Temple Scaffold (L1, L2 & L3)',
        descRU: 'Расширьте крылья собора, добавив боковой опорный блок L1 для устойчивости.',
        descEN: 'Extend the temple outposts with an additional side level 1 platform support.',
        shape: [
            { q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 2 },
            { q: 2, r: -2, lvl: 3 }, { q: 2, r: -1, lvl: 2 }, { q: 1, r: 1, lvl: 3 },
            { q: -2, r: 1, lvl: 1 }
        ],
        rewardSP: 1
    },
    {
        id: 'c3_f10',
        nameRU: 'Шаг 30: Преславный Небесный Зиккурат (L1, L2 и L3)',
        nameEN: 'Step 30: Grand Celestial Ziggurat (L1, L2 & L3)',
        descRU: 'Постройте величайший 3D Зиккурат из 12-ти модулей! Триумфально закройте Третью Главу!',
        descEN: 'Erect the ultimate 12-element 3D Ziggurat temple! Triumpantly complete Chapter Three!',
        shape: [
            { q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 2 },
            { q: 2, r: -2, lvl: 3 }, { q: 2, r: -1, lvl: 2 }, { q: 1, r: 1, lvl: 3 },
            { q: -2, r: 1, lvl: 1 }, { q: -2, r: 2, lvl: 1 }
        ],
        rewardSP: 3
    }
];

export const generateAdditionalFigures = (): Figure[] => {
    const list: Figure[] = [];
    const dirs = [
        { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
        { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }
    ];
    
    for (let i = 31; i <= 110; i++) {
        const id = `c4_f${i}`;
        const indexInChapter = i - 30;
        let nameRU = '';
        let nameEN = '';
        let descRU = '';
        let descEN = '';
        const shape: { q: number, r: number, lvl?: number }[] = [];
        let rewardSP = 1;
        
        const size = 3 + Math.floor((i - 31) / 8); 
        
        let minLvl = 1;
        let maxLvl = 3;
        let themeNameRU = '';
        let themeNameEN = '';
        
        if (i <= 45) {
            minLvl = 1; maxLvl = 4;
            themeNameRU = 'Квантовая Цепь';
            themeNameEN = 'Quantum Circuit';
            rewardSP = 1;
        } else if (i <= 60) {
            minLvl = 2; maxLvl = 5;
            themeNameRU = 'Техно-Спираль';
            themeNameEN = 'Tech Spiral';
            rewardSP = 2;
        } else if (i <= 75) {
            minLvl = 3; maxLvl = 6;
            themeNameRU = 'Гиперпространственные Врата';
            themeNameEN = 'Hyper-Gate';
            rewardSP = 2;
        } else if (i <= 90) {
            minLvl = 4; maxLvl = 7;
            themeNameRU = 'Резонансный Обелиск';
            themeNameEN = 'Resonance Obelisk';
            rewardSP = 3;
        } else if (i <= 100) {
            minLvl = 5; maxLvl = 8;
            themeNameRU = 'Сингулярный Импульсник';
            themeNameEN = 'Singularity Pulser';
            rewardSP = 3;
        } else {
            minLvl = 6; maxLvl = 10;
            themeNameRU = 'Матрица Омега';
            themeNameEN = 'Omega Matrix';
            rewardSP = 4;
        }
        
        nameRU = `Шаг ${i}: ${themeNameRU} #-` + indexInChapter;
        nameEN = `Step ${i}: ${themeNameEN} #-` + indexInChapter;
        
        descRU = `Соберите геометрическую структуру "${themeNameRU}" из ${size} последовательных блоков высотой от L${minLvl} до L${maxLvl}.`;
        descEN = `Construct the connected "${themeNameEN}" geometry utilizing ${size} sequential blocks spanning levels L${minLvl} to L${maxLvl}.`;
        
        let curQ = 0;
        let r_val = 0;
        shape.push({ q: curQ, r: r_val, lvl: minLvl });
        
        const visited = new Set<string>();
        visited.add(`${curQ},${r_val}`);
        
        for (let j = 1; j < size; j++) {
            const dirIndex = (i * 17 + j * 29) % 6;
            const dir = dirs[dirIndex];
            
            let nextQ = curQ + dir.q;
            let nextR = r_val + dir.r;
            
            if (visited.has(`${nextQ},${nextR}`)) {
                for (let k = 1; k < 6; k++) {
                    const altDir = dirs[(dirIndex + k) % 6];
                    if (!visited.has(`${curQ + altDir.q},${r_val + altDir.r}`)) {
                        nextQ = curQ + altDir.q;
                        nextR = r_val + altDir.r;
                        break;
                    }
                }
            }
            
            curQ = nextQ;
            r_val = nextR;
            visited.add(`${curQ},${r_val}`);
            
            const relativeLvl = minLvl + (j % (maxLvl - minLvl + 1));
            shape.push({ q: curQ, r: r_val, lvl: relativeLvl });
        }
        
        list.push({
            id,
            nameRU,
            nameEN,
            descRU,
            descEN,
            shape,
            rewardSP
        });
    }
    
    return list;
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
