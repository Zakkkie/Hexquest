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

export const getSymmetricShape = (targetSize: number, templateId: number): { q: number; r: number }[] => {
    const shape: { q: number; r: number }[] = [];
    const visited = new Set<string>();
    const add = (q: number, r: number) => {
        const key = `${q},${r}`;
        if (!visited.has(key)) {
            visited.add(key);
            shape.push({ q, r });
            return true;
        }
        return false;
    };

    // Always start with the origin
    add(0, 0);

    if (templateId === 0) {
        // Hexagonal Snowflake (Rotational symmetry)
        const dirs = [
            { q: 1, r: 0 }, { q: -1, r: 0 },
            { q: 0, r: 1 }, { q: 0, r: -1 },
            { q: 1, r: -1 }, { q: -1, r: 1 }
        ];
        let dIdx = 0;
        while (shape.length < targetSize) {
            const dir = dirs[dIdx % dirs.length];
            const multiplier = Math.floor(dIdx / dirs.length) + 1;
            add(dir.q * multiplier, dir.r * multiplier);
            dIdx++;
        }
    } else if (templateId === 1) {
        // Twin Pillars with Central Bridge
        const preCoords = [
            { q: 0, r: 0 }, { q: 1, r: 0 }, { q: -1, r: 0 },
            { q: 2, r: 0 }, { q: -2, r: 0 },
            { q: 2, r: -1 }, { q: -2, r: 1 },
            { q: 2, r: 1 }, { q: -2, r: -1 },
            { q: 1, r: 1 }, { q: -1, r: -1 },
            { q: 0, r: 1 }, { q: 0, r: -1 }
        ];
        for (const pt of preCoords) {
            if (shape.length >= targetSize) break;
            add(pt.q, pt.r);
        }
    } else if (templateId === 2) {
        // Crown Ring (Concentric Placement)
        const ring1 = [
            { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
            { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }
        ];
        const ring2 = [
            { q: 2, r: -2 }, { q: 2, r: -1 }, { q: 2, r: 0 },
            { q: 1, r: 1 }, { q: 0, r: 2 }, { q: -1, r: 2 },
            { q: -2, r: 2 }, { q: -2, r: 1 }, { q: -2, r: 0 },
            { q: -1, r: -1 }, { q: 0, r: -2 }, { q: 1, r: -2 }
        ];
        for (const pt of ring1) {
            if (shape.length >= targetSize) break;
            add(pt.q, pt.r);
        }
        for (const pt of ring2) {
            if (shape.length >= targetSize) break;
            add(pt.q, pt.r);
        }
    } else if (templateId === 3) {
        // Serpentine Path (Winding Curvy Line)
        let q = 0, r = 0;
        const moves = [
            { q: 1, r: -1 }, { q: 1, r: 0 }, { q: 0, r: 1 },
            { q: -1, r: 1 }, { q: -1, r: 0 }, { q: 0, r: -1 }
        ];
        let moveIdx = 0;
        let stepCount = 0;
        while (shape.length < targetSize) {
            const m = moves[moveIdx % moves.length];
            q += m.q;
            r += m.r;
            add(q, r);
            stepCount++;
            if (stepCount % 2 === 0) {
                moveIdx++; // Curve the snake
            }
        }
    } else if (templateId === 4) {
        // Mirror Butterfly Wings
        const order = [
            { q: 0, r: 1 }, { q: 0, r: -1 },
            { q: 1, r: 0 }, { q: -1, r: 1 },
            { q: 1, r: -1 }, { q: -1, r: 0 },
            { q: 2, r: -1 }, { q: -2, r: 1 },
            { q: 2, r: -2 }, { q: -2, r: 0 },
            { q: 1, r: 1 }, { q: -1, r: 2 }
        ];
        for (const pt of order) {
            if (shape.length >= targetSize) break;
            add(pt.q, pt.r);
        }
    } else if (templateId === 5) {
        // Symmetric Cross / Trident Arms
        for (let dist = 1; dist <= 4; dist++) {
            if (shape.length >= targetSize) break;
            add(dist, 0);
            if (shape.length >= targetSize) break;
            add(0, dist);
            if (shape.length >= targetSize) break;
            add(-dist, dist);

            if (shape.length >= targetSize) break;
            add(-dist, 0);
            if (shape.length >= targetSize) break;
            add(0, -dist);
            if (shape.length >= targetSize) break;
            add(dist, -dist);
        }
    } else {
        // Star Spiral
        let ring = 1;
        const dirs = [
            { q: 1, r: -1 }, { q: 0, r: -1 }, { q: -1, r: 0 },
            { q: -1, r: 1 }, { q: 0, r: 1 }, { q: 1, r: 0 }
        ];
        while (shape.length < targetSize) {
            let curQ = -ring;
            let curR = ring;
            for (let i = 0; i < 6; i++) {
                for (let step = 0; step < ring; step++) {
                    if (shape.length >= targetSize) break;
                    add(curQ, curR);
                    curQ += dirs[i].q;
                    curR += dirs[i].r;
                }
            }
            ring++;
            if (ring > 5) break;
        }
    }

    // Fail-safe size keeper to guarantee targetSize is reached and fully connected
    while (shape.length < targetSize) {
        let added = false;
        for (const pt of shape) {
            const neighbors = [
                { q: pt.q + 1, r: pt.r },
                { q: pt.q, r: pt.r + 1 },
                { q: pt.q - 1, r: pt.r + 1 },
                { q: pt.q - 1, r: pt.r },
                { q: pt.q, r: pt.r - 1 },
                { q: pt.q + 1, r: pt.r - 1 }
            ];
            for (const n of neighbors) {
                if (add(n.q, n.r)) {
                    added = true;
                    if (shape.length >= targetSize) break;
                }
            }
            if (shape.length >= targetSize) break;
        }
        if (!added) break;
    }

    return shape;
};

export const generateAllFiguresRaw = (): Figure[] => {
    const list: Figure[] = [];
    
    for (let index = 1; index <= 200; index++) {
        // Determine ID by chapters of 20 steps each
        const chapter = Math.floor((index - 1) / 20) + 1;
        const subIndex = ((index - 1) % 20) + 1;
        const id_str = `c${chapter}_f${subIndex}`;
        
        // 1. Determine Level/Height Tier Constraints beautifully
        // - up to 20: lvl 1
        // - up to 40: lvl 2
        // - up to 60: lvl 3
        // - up to 80 (c4): lvl 4
        // - up to 100 (c5): lvl 5
        // - up to 120 (c6): lvl 6
        // - up to 140 (c7): lvl 7
        // - up to 160 (c8): lvl 8
        // - up to 180 (c9): lvl 9
        // - up to 200 (c10): lvl 10
        let maxLvl = 1;
        if (index <= 20) {
            maxLvl = 1;
        } else if (index <= 40) {
            maxLvl = 2;
        } else if (index <= 60) {
            maxLvl = 3;
        } else if (index <= 80) {
            maxLvl = 4;
        } else if (index <= 100) {
            maxLvl = 5;
        } else if (index <= 120) {
            maxLvl = 6;
        } else if (index <= 140) {
            maxLvl = 7;
        } else if (index <= 160) {
            maxLvl = 8;
        } else if (index <= 180) {
            maxLvl = 9;
        } else {
            maxLvl = 10;
        }
        
        // 2. Shape size: grows organically from size 3 up to size 12-14 in each chapter.
        let size = ((index - 1) % 20) + 3;
        if (size > 14) size = 14;
        
        // 3. Selection of template coordinates (0 - 6)
        const templateId = index % 7;
        const rawCoords = getSymmetricShape(size, templateId);
        
        const shape: { q: number; r: number; lvl?: number }[] = [];
        
        // 4. Assign beautiful symmetric heights flowing elegantly
        for (let j = 0; j < rawCoords.length; j++) {
            const pt = rawCoords[j];
            let lvl = 1;

            if (templateId === 0) {
                // Snowflake Peak: center highest, edges fall beautifully
                const dist = Math.max(Math.abs(pt.q), Math.abs(pt.r), Math.abs(pt.q + pt.r));
                lvl = maxLvl - Math.min(maxLvl, dist);
            } else if (templateId === 1) {
                // Twin Pillars: high peaks, lower bridge in middle
                const isOuter = Math.abs(pt.q) >= 1;
                lvl = isOuter ? maxLvl : Math.max(0, maxLvl - 2);
            } else if (templateId === 2) {
                // Crown Ring alternating pattern
                const angle = Math.atan2(pt.r, pt.q);
                const normAngle = angle < 0 ? angle + 2 * Math.PI : angle;
                const waves = Math.sin(normAngle * 3);
                const factor = (waves + 1) / 2;
                lvl = Math.round(factor * maxLvl);
            } else if (templateId === 3) {
                // Serpent winding path sequential climbups
                const factor = j / (rawCoords.length - 1);
                lvl = Math.round(factor * maxLvl);
            } else if (templateId === 4) {
                // Mirror Butterfly
                const dist = Math.abs(pt.q);
                lvl = Math.max(0, maxLvl - dist);
            } else if (templateId === 5) {
                // Trident star arm endpoints are towers
                const dist = Math.max(Math.abs(pt.q), Math.abs(pt.r), Math.abs(pt.q + pt.r));
                lvl = Math.min(maxLvl, dist + 1);
            } else {
                // Winding spiral slope gradient
                const factor = 1 - (j / (rawCoords.length - 1));
                lvl = Math.round(factor * maxLvl);
            }

            // High priority safety clamp
            if (lvl < 0) lvl = 0;
            if (lvl > maxLvl) lvl = maxLvl;

            shape.push({ q: pt.q, r: pt.r, lvl });
        }
        
        // 5. Naming pairings to ensure 100% uniqueness without duplication
        const adjIndex = (index * 17) % ruAdjectives.length;
        const nounIndex = (index * 23 + 5) % ruNouns.length;
        
        const adjRu = ruAdjectives[adjIndex];
        const nounRu = ruNouns[nounIndex];
        const adjEn = enAdjectives[adjIndex];
        const nounEn = enNouns[nounIndex];
        
        const nameRU = `Шаг ${index}: ${adjRu} ${nounRu}`;
        const nameEN = `Step ${index}: ${adjEn} ${nounEn}`;
        
        const descRU = `Соберите структуру из ${size} смежных гексов. Максимальная высота достигает L${maxLvl}. Новые блоки гармонично перетекают из форм предыдущего этапа.`;
        const descEN = `Erect a continuous configuration of ${size} adjacent hexes. Maximum height reaches L${maxLvl}. The structure flows seamlessly from the geometries established in the prior step.`;
        
        const rewardSP = Math.max(1, Math.floor(maxLvl * 1.5));
        
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
