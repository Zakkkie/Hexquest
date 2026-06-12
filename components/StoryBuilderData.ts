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
    shape: { q: number; r: number; lvl?: number }[];
    rewardSP: number;
}

const MASTER_COORDS = [
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

const ruAdjectives = [
    'Квантовый', 'Эфирный', 'Небесный', 'Тектонический', 'Опорный',
    'Высотный', 'Парящий', 'Кристальный', 'Звездный', 'Горный',
    'Священный', 'Солнечный', 'Космический', 'Галактический', 'Абсолютный',
    'Исполинский', 'Преславный', 'Сингулярный', 'Вечный', 'Омега',
    'Альфа', 'Призматический', 'Векторный', 'Спектральный', 'Парадоксальный'
];

const ruNouns = [
    'Анкер', 'Вектор', 'Клин', 'Ромб', 'Шпиль',
    'Обелиск', 'Каскад', 'Алтарь', 'Купол', 'Бастион',
    'Зиккурат', 'Маяк', 'Свод', 'Резонатор', 'Портал',
    'Хребет', 'Утес', 'Купол', 'Бастион', 'Собор',
    'Монолит', 'Аванпост', 'Импульсник', 'Сигнал', 'Центроид'
];

const enAdjectives = [
    'Quantum', 'Aether', 'Celestial', 'Tectonic', 'Support',
    'Towering', 'Levitating', 'Crystal', 'Stellar', 'Mountain',
    'Sacred', 'Solar', 'Cosmic', 'Galactic', 'Absolute',
    'Colossal', 'Glorious', 'Singular', 'Eternal', 'Omega',
    'Alpha', 'Prismatic', 'Vector', 'Spectral', 'Paradoxical'
];

const enNouns = [
    'Anchor', 'Vector', 'Wedge', 'Rhombus', 'Spire',
    'Obelisk', 'Cascade', 'Altar', 'Dome', 'Bastion',
    'Ziggurat', 'Lighthouse', 'Arch', 'Resonator', 'Portal',
    'Ridge', 'Cliffs', 'Dome', 'Keep', 'Cathedral',
    'Monolith', 'Outpost', 'Impulser', 'Signal', 'Centroid'
];

export const generateAllFiguresRaw = (): Figure[] => {
    const list: Figure[] = [];
    
    for (let index = 1; index <= 110; index++) {
        // Determine ID
        let id_str = '';
        if (index <= 10) {
            id_str = `c1_f${index}`;
        } else if (index <= 20) {
            id_str = `c2_f${index - 10}`;
        } else if (index <= 30) {
            id_str = `c3_f${index - 20}`;
        } else {
            id_str = `c4_f${index}`;
        }
        
        // 1. Determine Level Tier Constraint (steps 1-20 -> Tier 0; steps 21-40 -> Tier 1, etc.)
        const tier = Math.floor((index - 1) / 20); // 0, 1, 2, 3, 4, 5
        const maxLvl = tier + 1; // L1 based, L2 based, etc.
        
        // 2. Shape size: grows organically from size 1 up to size 14 as steps increase within the 20-step chapter.
        let size = ((index - 1) % 20) + 1;
        if (size > 14) size = 14; // Cap size so maps fit neatly in viewport
        
        const shape: { q: number; r: number; lvl?: number }[] = [];
        
        // 3. Select topographical mode for level allocation
        const mode = index % 4;
        
        for (let j = 0; j < size; j++) {
            const coord = MASTER_COORDS[j % MASTER_COORDS.length];
            let lvl = 0;
            
            if (size <= 1) {
                lvl = maxLvl;
            } else {
                if (mode === 0) {
                    // Symmetrical Peak: highest in center, falls to 0 at edges
                    const mid = (size - 1) / 2;
                    const distFromMid = Math.abs(j - mid);
                    const factor = 1 - distFromMid / mid;
                    lvl = Math.round(factor * maxLvl);
                } else if (mode === 1) {
                    // Continuous Rise: climb from 0 to maxLvl
                    const factor = j / (size - 1);
                    lvl = Math.round(factor * maxLvl);
                } else if (mode === 2) {
                    // Saddle Valley: high on edges, low in center
                    const mid = (size - 1) / 2;
                    const distFromMid = Math.abs(j - mid);
                    const factor = distFromMid / mid;
                    lvl = Math.round(factor * maxLvl);
                } else {
                    // Serrated Comb: alternating between maxLvl and 0
                    lvl = (j % 2 === 0) ? maxLvl : Math.max(0, maxLvl - 2);
                }
            }
            
            // Safety bounds
            if (lvl < 0) lvl = 0;
            if (lvl > maxLvl) lvl = maxLvl;
            
            shape.push({ q: coord.q, r: coord.r, lvl: lvl });
        }
        
        // 4. Unique localized naming determinism
        const adjIndex = (index * 7 + 3) % ruAdjectives.length;
        const nounIndex = (index * 13 + 1) % ruNouns.length;
        
        const adjRu = ruAdjectives[adjIndex];
        const nounRu = ruNouns[nounIndex];
        const adjEn = enAdjectives[adjIndex];
        const nounEn = enNouns[nounIndex];
        
        const nameRU = `Шаг ${index}: ${adjRu} ${nounRu}`;
        const nameEN = `Step ${index}: ${adjEn} ${nounEn}`;
        
        const descRU = `Соберите структуру из ${size} смежных гексов. Максимальная высота достигает L${maxLvl}. Новые блоки гармонично перетекают из форм предыдущего этапа.`;
        const descEN = `Erect a continuous configuration of ${size} adjacent hexes. Maximum height reaches L${maxLvl}. The structure flows seamlessly from the geometries established in the prior step.`;
        
        // Calculate SP reward
        const rewardSP = tier + 1;
        
        list.push({
            id: id_str,
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
