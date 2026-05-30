import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Stage, Layer, Group, Path, Rect, Circle } from 'react-konva';
import { useGameStore } from '../store.ts';
import { getHexKey, hexToPixel } from '../services/hexUtils.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { THEME_PALETTE } from './MapRenderer.tsx';
import { textureService } from '../services/textureService.ts';
import { ArrowLeft, Crown, Settings, Volume2, VolumeX, Music, Languages, HelpCircle, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, Trophy, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Konva from 'konva';

const DEG_TO_RAD = Math.PI / 180;

// Precompute hex vertices for volume drawing
const BASE_POINTS: { x: number; y: number }[] = [];
for (let i = 0; i < 6; i++) {
    const angle = (60 * i + 30) * DEG_TO_RAD;
    BASE_POINTS.push({ x: Math.cos(angle) * GAME_CONFIG.HEX_SIZE, y: Math.sin(angle) * GAME_CONFIG.HEX_SIZE });
}

interface Figure {
    id: string;
    nameRU: string;
    nameEN: string;
    descRU: string;
    descEN: string;
    shape: { q: number, r: number, lvl?: number }[];
    rewardSP: number;
}

const FIGURES_COLLECTION: Figure[] = [
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
        nameRU: 'Шаг 8: Внешний Кристалл (8 гексов L0)',
        nameEN: 'Step 8: Outer Crystal (8 Hexes L0)',
        descRU: 'Добавьте длинный фокусный луч ко все еще растущей матрице Ядра из 8-ми гексов L0.',
        descEN: 'Extend the growing floral matrix with an additional outer node using 8 level 0 hexes.',
        shape: [
            { q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 0 },
            { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 0 }, { q: 0, r: -1, lvl: 0 }, { q: 2, r: -2, lvl: 0 }
        ],
        rewardSP: 1
    },
    {
        id: 'c1_f9',
        nameRU: 'Шаг 9: Сигнальная Рама (9 гексов L0)',
        nameEN: 'Step 9: Signaling Frame (9 Hexes L0)',
        descRU: 'Укрепите внешний контур, собрав систему передатчиков из 9-ти гексов L0.',
        descEN: 'Reinforce the signal array structure by forming a 9-hex level 0 frame.',
        shape: [
            { q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 0 },
            { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 0 }, { q: 0, r: -1, lvl: 0 },
            { q: 2, r: -2, lvl: 0 }, { q: 2, r: -1, lvl: 0 }
        ],
        rewardSP: 1
    },
    {
        id: 'c1_f10',
        nameRU: 'Шаг 10: Завершенное Ядро Нексуса (10 гексов L0)',
        nameEN: 'Step 10: Completed Nexus Core (10 Hexes L0)',
        descRU: 'Завершите Первую Главу! Создайте великое энергетическое ядро Нексуса из 10 гексов L0.',
        descEN: 'Finish Chapter One! Create the magnificent finished core matrix utilizing 10 level 0 hexes.',
        shape: [
            { q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 0 },
            { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 0 }, { q: 0, r: -1, lvl: 0 },
            { q: 2, r: -2, lvl: 0 }, { q: 2, r: -1, lvl: 0 }, { q: 1, r: 1, lvl: 0 }
        ],
        rewardSP: 2
    },

    // --- CHAPTER II: RADIANT TOWER (11-20) ---
    {
        id: 'c2_f1',
        nameRU: 'Шаг 11: Колонна Лифта (L0 и L1)',
        nameEN: 'Step 11: Lift Pillar (L0 & L1)',
        descRU: 'Установите платформу L0 и поднимите над ней колонну лифта уровня L1 для транзита энергии.',
        descEN: 'Lay a level 0 base and elevate a level 1 transit pillar on top of it.',
        shape: [{ q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 1 }],
        rewardSP: 1
    },
    {
        id: 'c2_f2',
        nameRU: 'Шаг 12: Опорная Арка (L0 и L1)',
        nameEN: 'Step 12: Base Archway (L0 & L1)',
        descRU: 'Соберите арочную конструкцию из 2-х гексов L0 и 1-й высоты L1.',
        descEN: 'Build an elegant support arch consisting of 2 level 0 bases and 1 level 1 cap.',
        shape: [{ q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 1 }, { q: 1, r: 0, lvl: 0 }],
        rewardSP: 1
    },
    {
        id: 'c2_f3',
        nameRU: 'Шаг 13: Башни-Близнецы (L0 и L1)',
        nameEN: 'Step 13: Twin Pillars (L0 & L1)',
        descRU: 'Постройте два симметричных вертикальных пилона L1 на прочной опоре L0.',
        descEN: 'Erect two symmetrical level 1 spires side-by-side on stable level 0 foundations.',
        shape: [{ q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 1 }, { q: 1, r: 0, lvl: 0 }, { q: 2, r: -1, lvl: 1 }],
        rewardSP: 1
    },
    {
        id: 'c2_f4',
        nameRU: 'Шаг 14: Виадук Сияния (L0 и L1)',
        nameEN: 'Step 14: Radiant Overpass (L0 & L1)',
        descRU: 'Создайте протяженный мост из чередующихся уровней 0 и 1.',
        descEN: 'Develop an overlapping bridgeway utilizing alternating L0 and L1 heights.',
        shape: [
            { q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 1 }, { q: 1, r: 0, lvl: 0 },
            { q: 2, r: -1, lvl: 1 }, { q: 2, r: 0, lvl: 0 }
        ],
        rewardSP: 1
    },
    {
        id: 'c2_f5',
        nameRU: 'Шаг 15: Крестовые Ворота (L0 и L1)',
        nameEN: 'Step 15: Cross Gateway (L0 & L1)',
        descRU: 'Соорудите проход из 6 гексов, усиленный 2-мя поднятыми шпилями уровня L1.',
        descEN: 'Establish a crossroads tunnel using a layout of 4 level 0 bases and 2 level 1 columns.',
        shape: [
            { q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 1 }, { q: 1, r: 0, lvl: 0 },
            { q: 2, r: -1, lvl: 0 }, { q: 0, r: 1, lvl: 1 }, { q: -1, r: 1, lvl: 0 }
        ],
        rewardSP: 1
    },
    {
        id: 'c2_f6',
        nameRU: 'Шаг 16: Обитель Шпиля (L0 и L1)',
        nameEN: 'Step 16: Spire Sanctuary (L0 & L1)',
        descRU: 'Постройте святилище с одной возвышающейся центральной колонной L1 посреди кольца L0.',
        descEN: 'Erect a temple with a single high level 1 heart encircled by 6 level 0 blocks.',
        shape: [
            { q: 0, r: 0, lvl: 1 }, { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 0 },
            { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 0 }, { q: 0, r: -1, lvl: 0 }
        ],
        rewardSP: 1
    },
    {
        id: 'c2_f7',
        nameRU: 'Шаг 17: Форт Гребня (L0 и L1)',
        nameEN: 'Step 17: Crest Bastion (L0 & L1)',
        descRU: 'Расширьте обитель, добавив внешний сигнальный маяк уровня L1 в общую сеть.',
        descEN: 'Upgrade the hub network by introducing a secondary level 1 tower on the rim.',
        shape: [
            { q: 0, r: 0, lvl: 1 }, { q: 1, r: -1, lvl: 0 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 0 },
            { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 0 }, { q: 0, r: -1, lvl: 0 }, { q: 2, r: -2, lvl: 1 }
        ],
        rewardSP: 1
    },
    {
        id: 'c2_f8',
        nameRU: 'Шаг 18: Корона Бастиона (L0 и L1)',
        nameEN: 'Step 18: Bastion Crown (L0 & L1)',
        descRU: 'Создайте кольцо с 3-мя чередующимися высокими пилонами L1 вокруг центра L0.',
        descEN: 'Erect a crown-like enclosure with exactly 3 alternating high L1 blocks and L0 links.',
        shape: [
            { q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 1 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 0 }
        ],
        rewardSP: 1
    },
    {
        id: 'c2_f9',
        nameRU: 'Шаг 19: Крыло Обелиска (L0 и L1)',
        nameEN: 'Step 19: Obelisk Wing (L0 & L1)',
        descRU: 'Преобразите корону в крылатую асимметричную матрицу передатчиков из 9-ти элементов.',
        descEN: 'Sculpture the crown further into an asymmetric cybernetic wing pattern of 9 plates.',
        shape: [
            { q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 1 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 0 },
            { q: 2, r: -2, lvl: 1 }, { q: 2, r: -1, lvl: 0 }
        ],
        rewardSP: 1
    },
    {
        id: 'c2_f10',
        nameRU: 'Шаг 20: Завершенная Сияющая Башня (L0 и L1)',
        nameEN: 'Step 20: Completed Radiant Tower (L0 & L1)',
        descRU: 'Завершите Вторую Главу! Возведите финальную Сияющую Высотную Башню из 10-ти гексов.',
        descEN: 'Finish Chapter Two! Complete the monumental Radiant Tower assembly of 10 hybrid elements.',
        shape: [
            { q: 0, r: 0, lvl: 0 }, { q: 1, r: -1, lvl: 1 }, { q: 1, r: 0, lvl: 0 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 0 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 0 },
            { q: 2, r: -2, lvl: 1 }, { q: 2, r: -1, lvl: 0 }, { q: 1, r: 1, lvl: 1 }
        ],
        rewardSP: 2
    },

    // --- CHAPTER III: CELESTIAL ZIGGURAT (21-30) ---
    {
        id: 'c3_f1',
        nameRU: 'Шаг 21: Ступени Набора (L1, L2 и L3)',
        nameEN: 'Step 21: Stair Cascade (L1, L2 & L3)',
        descRU: 'Постройте трехступенчатую восходящую лестницу высот L1 -> L2 -> L3.',
        descEN: 'Construct a precise ascending staircase of high tiers: L1 -> L2 -> L3.',
        shape: [{ q: 0, r: 0, lvl: 1 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 3 }],
        rewardSP: 1
    },
    {
        id: 'c3_f2',
        nameRU: 'Шаг 22: База Террасы (L1, L2 и L3)',
        nameEN: 'Step 22: Terrace Bed (L1, L2 & L3)',
        descRU: 'Укрепите лестницу, пристроив дополнительный опорный фланг L2 к шпилю L3.',
        descEN: 'Secure the steps layout by adding an extra level 2 backing plate to the level 3 spike.',
        shape: [{ q: 0, r: 0, lvl: 1 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 3 }, { q: 2, r: -1, lvl: 2 }],
        rewardSP: 1
    },
    {
        id: 'c3_f3',
        nameRU: 'Шаг 23: Два Гребня Зиккурата (L1, L2 и L3)',
        nameEN: 'Step 23: Twin Spires (L1, L2 & L3)',
        descRU: 'Соберите монумент с двумя возвышающимися вершинами уровня L3 и мостом L2.',
        descEN: 'Assemble a balanced layout with two level 3 peaks separated by level 2 supports.',
        shape: [
            { q: 0, r: 0, lvl: 1 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 3 },
            { q: 2, r: -1, lvl: 2 }, { q: 2, r: 0, lvl: 3 }
        ],
        rewardSP: 1
    },
    {
        id: 'c3_f4',
        nameRU: 'Шаг 24: Высотные Врата (L1, L2 и L3)',
        nameEN: 'Step 24: High Gateways (L1, L2 & L3)',
        descRU: 'Достройте проходной спуск уровня L1 с противоположного конца двух вершин.',
        descEN: 'Integrate an opposite ramp level 1 outflow flanking the peaks of the high temple.',
        shape: [
            { q: 0, r: 0, lvl: 1 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 3 },
            { q: 2, r: -1, lvl: 2 }, { q: 2, r: 0, lvl: 3 }, { q: 3, r: -1, lvl: 1 }
        ],
        rewardSP: 1
    },
    {
        id: 'c3_f5',
        nameRU: 'Шаг 25: Круг Собора (L1, L2 и L3)',
        nameEN: 'Step 25: Sanctuary Ring (L1, L2 & L3)',
        descRU: 'Сформируйте величественную купольную чашу с ядром L3 посреди стен L2 и L1.',
        descEN: 'Establish a dome template with a high level 3 core surrounded by L2 and L1 rings.',
        shape: [
            { q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 2 }
        ],
        rewardSP: 1
    },
    {
        id: 'c3_f6',
        nameRU: 'Шаг 26: Портал Алтаря (L1, L2 и L3)',
        nameEN: 'Step 26: Scribe Altar (L1, L2 & L3)',
        descRU: 'Установите высотную фокусную пристройку L3 к северному сектору круга собора.',
        descEN: 'Position a high level 3 transmitter onto the northern flank of the sanctuary.',
        shape: [
            { q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 2 }, { q: 2, r: -2, lvl: 3 }
        ],
        rewardSP: 1
    },
    {
        id: 'c3_f7',
        nameRU: 'Шаг 27: Подиум Палаты (L1, L2 и L3)',
        nameEN: 'Step 27: Podium Chamber (L1, L2 & L3)',
        descRU: 'Создайте симметричный спуск, добавив переходную площадку уровня L2 перед маяком L3.',
        descEN: 'Construct a visual step transition by laying a level 2 block in front of the L3 altar.',
        shape: [
            { q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 2 },
            { q: 2, r: -2, lvl: 3 }, { q: 2, r: -1, lvl: 2 }
        ],
        rewardSP: 1
    },
    {
        id: 'c3_f8',
        nameRU: 'Шаг 28: Венец Силы (L1, L2 и L3)',
        nameEN: 'Step 28: Crown of Power (L1, L2 & L3)',
        descRU: 'Заложите каркас короны, добавив второй южный пилон L3 к общему ансамблю.',
        descEN: 'Unify the high skyline by elevating a second level 3 peak in the southern sector.',
        shape: [
            { q: 0, r: 0, lvl: 3 }, { q: 1, r: -1, lvl: 2 }, { q: 1, r: 0, lvl: 2 }, { q: 0, r: 1, lvl: 1 },
            { q: -1, r: 1, lvl: 1 }, { q: -1, r: 0, lvl: 1 }, { q: 0, r: -1, lvl: 2 },
            { q: 2, r: -2, lvl: 3 }, { q: 2, r: -1, lvl: 2 }, { q: 1, r: 1, lvl: 3 }
        ],
        rewardSP: 1
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

const getBasePathD = () => {
    let d = `M ${BASE_POINTS[0].x} ${BASE_POINTS[0].y}`;
    for (let i = 1; i < 6; i++) d += ` L ${BASE_POINTS[i].x} ${BASE_POINTS[i].y}`;
    return d + " Z";
};
const BASE_PATH_D = getBasePathD();

const NebulaBackground: React.FC<{ width: number; height: number }> = ({ width, height }) => {
    const clouds = useMemo(() => Array.from({ length: 6 }).map((_, i) => ({
        id: i,
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        radius: 400 + Math.random() * 500,
        color: ['#1e1b4b', '#312e81', '#1e3a8a', '#4338ca', '#1e1b4b', '#2e1065'][i % 6],
    })), [width, height]);

    const stars = useMemo(() => Array.from({ length: 150 }).map((_, i) => ({
        id: i,
        x: Math.random() * width - width / 2,
        y: Math.random() * height - height / 2,
        radius: Math.random() * 1.2,
        opacity: 0.3 + Math.random() * 0.7
    })), [width, height]);

    const lines = useMemo(() => Array.from({ length: 8 }).map((_, i) => {
        const s1 = stars[Math.floor(Math.random() * stars.length)];
        const s2 = stars[Math.floor(Math.random() * stars.length)];
        return { id: i, x1: s1.x, y1: s1.y, x2: s2.x, y2: s2.y };
    }), [stars]);

    return (
        <Group opacity={0.4} listening={false}>
            <Rect x={-2000} y={-2000} width={4000} height={4000} fill="#020617" />
            
            {clouds.map(c => (
                <Circle
                    key={`c-${c.id}`}
                    x={c.x}
                    y={c.y}
                    radius={c.radius}
                    fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                    fillRadialGradientStartRadius={0}
                    fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                    fillRadialGradientEndRadius={c.radius}
                    fillRadialGradientColorStops={[0, c.color, 0.4, c.color + '66', 1, 'transparent']}
                />
            ))}

            {lines.map(l => (
                <Path 
                    key={`l-${l.id}`}
                    data={`M ${l.x1} ${l.y1} L ${l.x2} ${l.y2}`}
                    stroke="rgba(99, 102, 241, 0.15)"
                    strokeWidth={0.5}
                />
            ))}

            {stars.map(s => (
                <Circle key={`s-${s.id}`} x={s.x} y={s.y} radius={s.radius} fill="white" opacity={s.opacity} />
            ))}
        </Group>
    );
};

const MiniFigureBlueprint: React.FC<{ shape: { q: number, r: number, lvl?: number }[] }> = ({ shape }) => {
    const size = 6;
    const hexToPixelSmall = (q: number, r: number) => {
        const x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
        const y = size * (1.5 * r);
        return { x, y };
    };

    const pixels = shape.map(pt => hexToPixelSmall(pt.q, pt.r));
    
    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    const minX = Math.min(...xs) - size - 2;
    const maxX = Math.max(...xs) + size + 2;
    const minY = Math.min(...ys) - size - 2;
    const maxY = Math.max(...ys) + size + 2;
    
    const width = maxX - minX;
    const height = maxY - minY;

    const getHexPoints = (cx: number, cy: number) => {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (60 * i + 30) * Math.PI / 180;
            points.push(`${cx + Math.cos(angle) * size},${cy + Math.sin(angle) * size}`);
        }
        return points.join(' ');
    };

    return (
        <svg 
            viewBox={`${minX} ${minY} ${width} ${height}`} 
            className="w-16 h-16 bg-slate-950/80 border border-indigo-500/20 rounded-xl p-1 shrink-0 drop-shadow-[0_0_10px_rgba(99,102,241,0.25)] flex items-center justify-center self-center"
        >
            {pixels.map((p, index) => {
                const pt = shape[index];
                const activeLvl = pt?.lvl !== undefined ? pt.lvl : 0;
                // Elegant theme palette colors matching the tier palette to make 3D height logical
                const themeColors: Record<string, string> = {
                    '0': '#06b6d4', // cyan-500
                    '1': '#a855f7', // purple-500
                    '2': '#eab308', // yellow-500 / amber-500
                    '3': '#3b82f6'  // blue-500 / indigo-500
                };
                const strokeColor = themeColors[String(activeLvl)] || '#06b6d4';
                return (
                    <g key={index}>
                        <polygon 
                            points={getHexPoints(p.x, p.y)}
                            fill={`${strokeColor}33`}
                            stroke={strokeColor}
                            strokeWidth="1.2"
                        />
                        <text 
                            x={p.x} 
                            y={p.y + 1} 
                            textAnchor="middle" 
                            dominantBaseline="middle"
                            fill="white" 
                            fontSize="5" 
                            fontWeight="900"
                        >
                            {activeLvl}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

const StoryHex: React.FC<{ 
    q: number, 
    r: number, 
    level: number | undefined, 
    isSelected: boolean,
    isBlueprint: boolean,
    blueprintLevel?: number,
    isEligible: boolean,
    isCenterInitially: boolean,
    isNew?: boolean,
    canPlace: boolean,
    onClick: (q: number, r: number) => void,
    onDblClick?: (q: number, r: number) => void
}> = React.memo(({ q, r, level, isSelected, isBlueprint, blueprintLevel = 0, isEligible, isCenterInitially, isNew, canPlace, onClick, onDblClick }) => {
    const px = useMemo(() => hexToPixel(q, r), [q, r]);
    const isBuilt = level !== undefined && level >= 0;
    
    const colors = useMemo(() => {
        if (level === undefined || level < 0) return null;
        const theme = THEME_PALETTE[String(level)] || THEME_PALETTE['0'];
        return { 
            side: theme.dark, 
            top: theme.main, 
            stroke: theme.stroke,
            light: theme.light 
        };
    }, [level]);

    const topTexture = useMemo(() => {
        if (level === undefined) return null;
        return textureService.getTexture(level, q, r, undefined);
    }, [level, q, r]);

    const sideTexture = useMemo(() => {
        if (level === undefined) return null;
        return textureService.getSideTexture(level, undefined);
    }, [level]);

    // Height calculation - visual depth
    const height = level !== undefined ? (level >= 0 ? 12 + level * 12 : 12) : 0;
    const yOffset = level !== undefined ? (level >= 0 ? -height : (Math.abs(level) - 1) * 12) : 0;
    const wallHeight = level !== undefined ? (level >= 0 ? height : Math.abs(level) * 12) : 0;

    const groupRef = useRef<Konva.Group>(null);
    useEffect(() => {
        if (isNew && groupRef.current) {
            const node = groupRef.current;
            const originalY = node.y();
            node.y(originalY - 60);
            node.opacity(0);
            new Konva.Tween({
                node: node,
                duration: 0.5,
                y: originalY,
                opacity: 1,
                easing: Konva.Easings.BackEaseOut
            }).play();
        }
    }, [isNew]);

    const [isHovered, setIsHovered] = useState(false);

    // Front-facing sides for isometric view (0, 1, 5)
    const visibleSides = useMemo(() => {
        if (!isBuilt) return null;
        const squashedPoints = BASE_POINTS.map(p => ({ x: p.x, y: p.y * 0.8 }));
        
        // Point-up hex, front facing sides are 0, 1 and 5
        return [0, 1, 5].map(i => {
            const next = (i + 1) % 6;
            const p1 = squashedPoints[i];
            const p2 = squashedPoints[next];
            const p3 = { x: p2.x, y: p2.y + wallHeight };
            const p4 = { x: p1.x, y: p1.y + wallHeight };
            const minY = Math.min(p1.y, p2.y);
            const maxY = Math.max(p3.y, p4.y);
            return { 
                id: i, 
                data: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z`,
                midX: (p1.x + p2.x) / 2,
                minY,
                maxY
            };
        });
    }, [isBuilt, wallHeight]);

    const getSideOpacity = useCallback((id: number) => {
        if (id === 0) return 0.95;
        if (id === 1) return 0.75;
        return 0.85; // id === 5
    }, []);

    // Draw conditions: Cover the entire game space with a wireframe grid as requested!

    return (
        <Group 
            ref={groupRef} 
            x={px.x} 
            y={px.y} 
            onClick={(e) => { e.cancelBubble = true; setIsHovered(false); onClick(q, r); }} 
            onTap={(e) => { e.cancelBubble = true; setIsHovered(false); onClick(q, r); }}
            onDblClick={() => onDblClick && onDblClick(q, r)}
            onDblTap={() => onDblClick && onDblClick(q, r)}
            onMouseEnter={(e) => {
                // Prevent hover sticking on pure touch devices, but allow if using a mouse
                if (e.evt && e.evt.type && e.evt.type.includes('touch')) return;
                setIsHovered(true);
            }}
            onMouseLeave={() => setIsHovered(false)}
            onTouchEnd={() => setIsHovered(false)}
            perfectDrawEnabled={false}
            transformsEnabled="position"
        >
            {/* 3D Sides / Walls */}
            {isBuilt && colors && visibleSides && (
                <Group y={yOffset}>
                    {visibleSides.map(side => (
                        <Path
                            key={side.id}
                            data={side.data}
                            fillPatternImage={sideTexture as any}
                            fillEnabled={!sideTexture}
                            fillLinearGradientStartPoint={{ x: side.midX, y: side.minY }}
                            fillLinearGradientEndPoint={{ x: side.midX, y: side.maxY }}
                            fillLinearGradientColorStops={[
                                0, colors.top,
                                0.25, colors.side,
                                1, 'rgba(11, 17, 32, 0.05)'
                            ]}
                            stroke={colors.side}
                            strokeWidth={1.5}
                            opacity={getSideOpacity(side.id)}
                            listening={false}
                            perfectDrawEnabled={false}
                            shadowForStrokeEnabled={false}
                        />
                    ))}
                </Group>
            )}

            {/* Top Face */}
            <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                <Path
                    data={BASE_PATH_D}
                    fillPatternImage={topTexture as any}
                    fill={topTexture ? undefined : (isBuilt ? colors?.top : (isCenterInitially ? 'rgba(6, 182, 212, 0.08)' : (isEligible ? 'rgba(34, 211, 238, 0.04)' : 'rgba(255,255,255,0.01)')))}
                    fillPatternScale={{ x: GAME_CONFIG.HEX_SIZE / 32, y: GAME_CONFIG.HEX_SIZE / 32 }}
                    fillPatternOffset={{ x: 32, y: 32 }}
                    fillPatternRepeat="repeat"
                    stroke={isBuilt ? '#06b6d4' : (isCenterInitially ? '#06b6d4' : (isEligible ? 'rgba(34, 211, 238, 0.55)' : 'rgba(255,255,255,0.075)'))}
                    strokeWidth={isBuilt ? 2.5 : (isCenterInitially ? 2 : (isEligible ? 1.5 : 0.8))}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                    dash={isEligible || isBlueprint ? [4, 4] : undefined}
                />
                
                {/* Visual plus (+) for center initially and eligible targets, requested by user */}
                {!isBuilt && (isCenterInitially || isEligible) && (
                    <Group listening={false}>
                        <Path 
                            data="M -6 0 L 6 0"
                            stroke={isCenterInitially ? "#22d3ee" : "rgba(34, 211, 238, 0.95)"}
                            strokeWidth={2}
                            shadowColor="#22d3ee"
                            shadowBlur={6}
                            shadowOpacity={0.8}
                            listening={false}
                        />
                        <Path 
                            data="M 0 -6 L 0 6"
                            stroke={isCenterInitially ? "#22d3ee" : "rgba(34, 211, 238, 0.95)"}
                            strokeWidth={2}
                            shadowColor="#22d3ee"
                            shadowBlur={6}
                            shadowOpacity={0.8}
                            listening={false}
                        />
                    </Group>
                )}
                
                {isBuilt && colors && (
                    <>
                        {/* Always outline built hex with cyan glow */}
                        <Path 
                            data={BASE_PATH_D}
                            stroke="#22d3ee"
                            strokeWidth={1.2}
                            opacity={0.8}
                            listening={false}
                        />
                        {/* Top/Light Bevel */}
                        <Path 
                            data={`M ${BASE_POINTS[2].x} ${BASE_POINTS[2].y} L ${BASE_POINTS[3].x} ${BASE_POINTS[3].y} L ${BASE_POINTS[4].x} ${BASE_POINTS[4].y} L ${BASE_POINTS[5].x} ${BASE_POINTS[5].y}`}
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth={2}
                            listening={false}
                            perfectDrawEnabled={false}
                        />
                        {/* Bottom/Dark Bevel */}
                        <Path 
                            data={`M ${BASE_POINTS[5].x} ${BASE_POINTS[5].y} L ${BASE_POINTS[0].x} ${BASE_POINTS[0].y} L ${BASE_POINTS[1].x} ${BASE_POINTS[1].y} L ${BASE_POINTS[2].x} ${BASE_POINTS[2].y}`}
                            stroke="rgba(0,0,0,0.6)"
                            strokeWidth={2}
                            listening={false}
                            perfectDrawEnabled={false}
                        />
                    </>
                )}
            </Group>

            {/* Empty Holographic blueprint decoration inside blueprint ghost targets */}
            {!isBuilt && isBlueprint && !isCenterInitially && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                    <Path
                        data={BASE_PATH_D}
                        scaleX={0.9}
                        scaleY={0.9}
                        stroke={isHovered ? 'rgba(168, 85, 247, 0.85)' : 'rgba(168, 85, 247, 0.5)'}
                        strokeWidth={1.5}
                        dash={[4, 3]}
                        listening={false}
                    />
                    {blueprintLevel > 0 && (
                        <Path
                            data={BASE_PATH_D}
                            scaleX={0.7}
                            scaleY={0.7}
                            stroke="rgba(168, 85, 247, 0.3)"
                            strokeWidth={1}
                            dash={[2, 2]}
                            listening={false}
                        />
                    )}
                    {/* Visual color dot representing the target level palette for the ghost block */}
                    <Circle 
                        x={0} 
                        y={0} 
                        r={4} 
                        fill={THEME_PALETTE[String(blueprintLevel)]?.main || 'rgba(168, 85, 247, 0.6)'} 
                        stroke="#fff"
                        strokeWidth={1}
                        listening={false} 
                    />
                </Group>
            )}

            {/* Initial Center Beacon Highlight */}
            {!isBuilt && isCenterInitially && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                    <Path
                        data={BASE_PATH_D}
                        scaleX={0.94}
                        scaleY={0.94}
                        stroke="#22d3ee"
                        strokeWidth={2}
                        shadowColor="#22d3ee"
                        shadowBlur={12}
                        shadowOpacity={0.6}
                        listening={false}
                    />
                    <Circle x={0} y={0} r={4} fill="#22d3ee" opacity={0.8} listening={false} className="animate-pulse" />
                </Group>
            )}

            {/* Pulse Placement Helper Outline for Neighbors */}
            {!isBuilt && isEligible && !isCenterInitially && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                    <Path
                        data={BASE_PATH_D}
                        scaleX={0.96}
                        scaleY={0.96}
                        stroke={'rgba(34, 211, 238, 0.65)'}
                        strokeWidth={2.2}
                        dash={[5, 4]}
                        opacity={0.9}
                        shadowColor="#22d3ee"
                        shadowBlur={6}
                        listening={false}
                    />
                </Group>
            )}

            {/* Selection Outline */}
            {isSelected && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                    <Path
                        data={BASE_PATH_D}
                        scaleX={0.9}
                        scaleY={0.9}
                        stroke="#a855f7"
                        strokeWidth={3}
                        dash={[4, 4]}
                        opacity={0.94}
                        shadowColor="#a855f7"
                        shadowBlur={14}
                        listening={false}
                    />
                </Group>
            )}

            {/* Place Block isometric ripple effect */}
            {isNew && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                    <Circle
                        r={GAME_CONFIG.HEX_SIZE * 0.8}
                        stroke="#22d3ee"
                        strokeWidth={3}
                        opacity={0.9}
                        listening={false}
                        ref={(node) => {
                            if (node) {
                                new Konva.Tween({
                                    node: node,
                                    duration: 0.65,
                                    scaleX: 1.85,
                                    scaleY: 1.85,
                                    opacity: 0,
                                    strokeWidth: 0.5,
                                    easing: Konva.Easings.EaseOut
                                }).play();
                            }
                        }}
                    />
                </Group>
            )}

            {/* Placement / Hover Overlay Feedback */}
            {isHovered && !isBlueprint && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false} listening={false}>
                    <Path
                        data={BASE_PATH_D}
                        fill={canPlace ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'}
                        stroke={canPlace ? '#10b981' : '#ef4444'}
                        strokeWidth={4}
                        opacity={1}
                        shadowColor={canPlace ? '#10b981' : '#ef4444'}
                        shadowBlur={16}
                        shadowOpacity={0.9}
                        listening={false}
                    />
                </Group>
            )}
        </Group>
    );
});

const drawInventoryHex = (lvl: number, theme: any) => {
    return (
        <svg viewBox="0 0 40 46" className="w-7 h-8 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] select-none pointer-events-none transition-all duration-300">
            {/* 3D Bottom/Side extrusion */}
            <polygon points="20,0 38,10 38,36 20,46 2,36 2,10" fill={theme.dark} />
            {/* Top plate */}
            <polygon points="20,0 38,10 38,30 20,40 2,30 2,10" fill={theme.main} stroke={theme.stroke} strokeWidth="2" />
            
            {/* Soft top bevel line */}
            <polyline points="2,10 20,20 38,10" stroke="rgba(255,255,255,0.25)" strokeWidth="1" fill="none" />
            
            <text 
                x="20" 
                y="20" 
                textAnchor="middle" 
                fill={theme.light} 
                className="text-[14px] font-[900]"
                dominantBaseline="central"
            >
                {lvl}
            </text>
        </svg>
    );
};

const StoryBuilderView: React.FC = () => {
    const setUIState = useGameStore(state => state.setUIState);
    const playUiSound = useGameStore(state => state.playUiSound);
    const minedInSessionHexes = useGameStore(state => state.minedInSessionHexes);
    const storyMap = useGameStore(state => state.storyMap);
    const placeStoryHex = useGameStore(state => state.placeStoryHex);
    const addMinedHexes = useGameStore(state => state.addMinedHexes);
    const clearStoryMap = useGameStore(state => state.clearStoryMap);
    const skillPoints = useGameStore(state => state.skillPoints);
    const setSkillPoints = useGameStore(state => state.setSkillPoints);
    const language = useGameStore(state => state.language);
    const setLanguage = useGameStore(state => state.setLanguage);
    const isMusicMuted = useGameStore(state => state.isMusicMuted);
    const isSfxMuted = useGameStore(state => state.isSfxMuted);
    const toggleMusic = useGameStore(state => state.toggleMusic);
    const toggleSfx = useGameStore(state => state.toggleSfx);

    // Active unlocked state index
    const [unlockedFigureIndex, setUnlockedFigureIndex] = useState(() => {
        try {
            return Number(localStorage.getItem('hexopol_figure_index') || '0');
        } catch {
            return 0;
        }
    });

    const activeFigure = useMemo(() => {
        return FIGURES_COLLECTION[unlockedFigureIndex] || FIGURES_COLLECTION[0];
    }, [unlockedFigureIndex]);

    const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [cameraPos, setCameraPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 30 });
    const [zoomScale, setZoomScale] = useState(window.innerWidth < 768 ? 0.45 : 0.7);
    const [isNarrativeCollapsed, setIsNarrativeCollapsed] = useState(true); // Optimized space by defaulting to true
    const isUiHidden = false;
    const [lastPlacedKey, setLastPlacedKey] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [popupCell, setPopupCell] = useState<{ q: number, r: number } | null>(null);
    const [selectedBuildLevel, setSelectedBuildLevel] = useState<number>(0); // 0-9 for building higher levels, or -999 for demolish/снос
    const [errorMessage, setErrorMessage] = useState<string | null>(null); // Visual feedback warning toast
    const [destroyButtonCell, setDestroyButtonCell] = useState<{ q: number, r: number } | null>(null);
    
    // Auto-dismiss destroyButtonCell when clicking anywhere else on the document
    useEffect(() => {
        if (!destroyButtonCell) return;
        const autoDismiss = () => {
            setDestroyButtonCell(null);
        };
        const timer = setTimeout(() => {
            window.addEventListener('click', autoDismiss);
            window.addEventListener('touchstart', autoDismiss);
        }, 10);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('click', autoDismiss);
            window.removeEventListener('touchstart', autoDismiss);
        };
    }, [destroyButtonCell]);
    
    const containerRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);

    const handleResetCamera = useCallback(() => {
        const w = containerRef.current?.clientWidth || window.innerWidth;
        const h = containerRef.current?.clientHeight || window.innerHeight;
        setCameraPos({ x: w / 2, y: h / 2 - (w < 768 ? 20 : 50) });
        setZoomScale(w < 768 ? 0.45 : 0.7);
        playUiSound('CLICK');
    }, [playUiSound]);

    const handleScrollLeft = useCallback(() => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: -140, behavior: 'smooth' });
            playUiSound('CLICK');
        }
    }, [playUiSound]);

    const handleScrollRight = useCallback(() => {
        if (carouselRef.current) {
            carouselRef.current.scrollBy({ left: 140, behavior: 'smooth' });
            playUiSound('CLICK');
        }
    }, [playUiSound]);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) {
            // Fallback
            const handleResize = () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                setStageSize({ width: w, height: h });
                setCameraPos({ x: w / 2, y: h / 2 - (w < 768 ? 20 : 50) });
            };
            window.addEventListener('resize', handleResize);
            handleResize();
            return () => window.removeEventListener('resize', handleResize);
        }

        const observer = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            const w = Math.max(100, Math.floor(width));
            const h = Math.max(100, Math.floor(height));
            setStageSize({ width: w, height: h });
            setCameraPos({ x: w / 2, y: h / 2 - (w < 768 ? 20 : 50) });
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    // Shape completeness check - checks if the placed level 0 or higher hexes match the active figure's coordinates
    // under any translation offset (allows random placement anywhere on the board!)
    const targetCompleted = useMemo(() => {
        const shape = activeFigure.shape;
        const activeHexKeys = Object.entries(storyMap)
            .filter(([_, lvl]) => lvl !== undefined && lvl >= 0)
            .map(([key, lvl]) => {
                const [q, r] = key.split(',').map(Number);
                return { q, r, lvl };
            });
        
        if (activeHexKeys.length < shape.length) return false;

        for (const anchor of activeHexKeys) {
            let matchesAll = true;
            for (const pt of shape) {
                // Determine layout coordinates relative to anchor offset
                const targetKey = getHexKey(anchor.q + pt.q, anchor.r + pt.r);
                const targetLvl = storyMap[targetKey];
                if (targetLvl === undefined || targetLvl < 0) {
                    matchesAll = false;
                    break;
                }
                const reqLvl = pt.lvl !== undefined ? pt.lvl : 0;
                if (targetLvl !== reqLvl) {
                    matchesAll = false;
                    break;
                }
            }
            if (matchesAll) return true;
        }
        return false;
    }, [storyMap, activeFigure]);

    const hasAnyHex = useMemo(() => {
        return Object.values(storyMap).some(lvl => lvl !== undefined && lvl >= 0);
    }, [storyMap]);

    // Direct placement eligibility calculation
    const isEligibleForPlacement = useCallback((q: number, r: number, forceLevel?: number) => {
        const lvlToBuild = forceLevel !== undefined ? forceLevel : selectedBuildLevel;
        const currentMap = storyMap;
        if (lvlToBuild === -999) return false; // Demolish is not a placement

        const currentLvl = currentMap[getHexKey(q, r)];
        const currentlyBuilt = currentLvl !== undefined && currentLvl >= 0;

        if (!currentlyBuilt && lvlToBuild !== 0) {
            return false;
        }

        if (!hasAnyHex) {
            if (q === 0 && r === 0) {
                return lvlToBuild === 0;
            }
            return false;
        }

        if (currentlyBuilt) {
            if (lvlToBuild <= currentLvl) return false;
        } else {
            if (lvlToBuild !== 0) return false;
        }
        
        const neighbors = [
            { dq: 1, dr: -1 }, { dq: 1, dr: 0 }, { dq: 0, dr: 1 },
            { dq: -1, dr: 1 }, { dq: -1, dr: 0 }, { dq: 0, dr: -1 }
        ];

        let hasValidNeighbor = false;
        let supportCount = 0;

        for (const n of neighbors) {
            let nLvl = currentMap[getHexKey(q + n.dq, r + n.dr)];
            
            if (nLvl !== undefined && nLvl >= 0) {
                hasValidNeighbor = true;
                
                // Staircase rule between occupied cells: absolute height difference can be at most 1
                if (Math.abs(lvlToBuild - nLvl) > 1) {
                    return false;
                }
                
                if (nLvl === lvlToBuild - 1) {
                    supportCount++;
                }
            }
        }

        if (!currentlyBuilt && !hasValidNeighbor) {
            return false;
        }

        if (lvlToBuild >= 1 && supportCount < 2) {
            return false;
        }

        // Rule: To place a level 1 hex, there must be support of at least 3 adjacent built hexes (lvl >= 0).
        if (lvlToBuild === 1 && hasAnyHex) {
            let builtNeighborsCount = 0;
            if (currentlyBuilt) {
                builtNeighborsCount += 3; // Intrinsic support from the base itself!
            } else {
                for (const n of neighbors) {
                    const nKey = getHexKey(q + n.dq, r + n.dr);
                    const nLvl = currentMap[nKey];
                    if (nLvl !== undefined && nLvl >= 0) {
                        builtNeighborsCount++;
                    }
                }
            }
            if (builtNeighborsCount < 3) {
                return false;
            }
        }

        return true;
    }, [storyMap, selectedBuildLevel, hasAnyHex]);

    const gridPoints = useMemo(() => {
        const points = [];
        const RADIUS = 12;
        for (let q = -RADIUS; q <= RADIUS; q++) {
            for (let r = -RADIUS; r <= RADIUS; r++) {
                if (Math.abs(q + r) <= RADIUS) {
                    const px = hexToPixel(q, r);
                    points.push({ q, r, x: px.x, y: px.y });
                }
            }
        }
        
        return points.sort((a, b) => {
            const depthA = (a.y * 10) + (a.x * 0.1);
            const depthB = (b.y * 10) + (b.x * 0.1);
            return depthA - depthB;
        });
    }, []);

    const isPanning = useRef(false);

    const handleCellClick = useCallback((q: number, r: number) => {
        if (isPanning.current) return;
        
        const map = storyMap;
        const buildLevel = selectedBuildLevel;
        const anyHex = hasAnyHex;
        const key = getHexKey(q, r);
        const currentLvl = map[key];
        const isCurrentlyBuilt = currentLvl !== undefined && currentLvl >= 0;

        const eligible = isEligibleForPlacement(q, r);
        
        if (isCurrentlyBuilt) {
            if (currentLvl === buildLevel && buildLevel !== -999) {
                playUiSound('CLICK');
                setDestroyButtonCell(prev => (prev && prev.q === q && prev.r === r) ? null : { q, r });
                return;
            }
            // Dismiss destroy button cell on other cell interactions
            setDestroyButtonCell(null);
            if (eligible && buildLevel !== -999) {
                // If it's an existing tile, and the current selected level is valid for upgrading
                // (It will fall through to execute placement)
            } else {
                if (buildLevel === -999) {
                    // Demolish popup
                    playUiSound('CLICK');
                    setPopupCell({ q, r });
                    return;
                } else {
                    // Trying to place a forbidden upgraded hex (support or height-step violation)
                    playUiSound('ERROR');
                    setErrorMessage(
                        language === 'RU'
                            ? 'Размещение здесь запрещено! Разместите гекс 0 уровня (или другого соответствующего уровня в соответствии с опорами).'
                            : 'Placement is forbidden here! Place a level 0 hex (or other corresponding level matching supports).'
                    );
                    setTimeout(() => {
                        setErrorMessage(curr => curr?.includes('соответствующего уровня') || curr?.includes('corresponding level') ? null : curr);
                    }, 5000);
                    return;
                }
            }
        } else if (!eligible) {
            setDestroyButtonCell(null);
            playUiSound('ERROR');
            if (buildLevel !== 0) {
                setErrorMessage(
                    language === 'RU'
                        ? 'Размещение запрещено! На пустой гекс допускается только установка плитки 0 уровня.'
                        : 'Placement is forbidden! On empty hexes, only a level 0 tile can be placed.'
                );
            } else {
                setErrorMessage(
                    language === 'RU'
                        ? 'Этот гекс недоступен! Разместите гекс 0 уровня на стартовой позиции или рядом с существующими гексами.'
                        : 'This hex is unavailable! Place a level 0 hex on starting coordinates or next to existing hexes.'
                );
            }
            setTimeout(() => {
                setErrorMessage(curr => curr?.includes('допускается только') || curr?.includes('недоступен') || curr?.includes('unavailable') || curr?.includes('only a level 0') ? null : curr);
            }, 5000);
            return;
        }

        // Ensure player has the selected block in inventory
        const availableCount = minedInSessionHexes[buildLevel] || 0;
        if (availableCount <= 0) {
            playUiSound('WARNING');
            return;
        }

        // Rule: To place a level 1 hex, there must be support of at least 3 adjacent built hexes (lvl >= 0).
        // (if not placing on an empty map completely center)
        if (buildLevel === 1 && anyHex) {
            const neighborsList = [
                { dq: 1, dr: -1 }, { dq: 1, dr: 0 }, { dq: 0, dr: 1 },
                { dq: -1, dr: 1 }, { dq: -1, dr: 0 }, { dq: 0, dr: -1 }
            ];
            let builtNeighborsCount = 0;
            // Also count the cell ITSELF as base if we are UPGRADING it (because it already provides support!)
            if (isCurrentlyBuilt) {
                builtNeighborsCount += 3; // Intrinsic support from the base itself!
            } else {
                for (const n of neighborsList) {
                    const nKey = getHexKey(q + n.dq, r + n.dr);
                    const nLvl = map[nKey];
                    if (nLvl !== undefined && nLvl >= 0) {
                        builtNeighborsCount++;
                    }
                }
            }
            if (builtNeighborsCount < 3) {
                playUiSound('ERROR');
                setErrorMessage(
                    language === 'RU' 
                        ? 'Нестабильно! Для установки гекса L1 требуется опора из 3-х соседних гексов' 
                        : 'Unstable! Supporting base of level L1 requires at least 3 adjacent hexes'
                );
                setTimeout(() => setErrorMessage(p => p), 4000); 
                return;
            }
        }

        // Place new block!
        placeStoryHex(q, r, buildLevel);
        playUiSound('SUCCESS');
        setLastPlacedKey(key);
        setErrorMessage(null); // clear any previous warning
    }, [isPanning, isEligibleForPlacement, minedInSessionHexes, placeStoryHex, addMinedHexes, playUiSound, setErrorMessage, language, setDestroyButtonCell, storyMap, selectedBuildLevel, hasAnyHex]);

    const handleCellDblClick = useCallback((q: number, r: number) => {
        const key = getHexKey(q, r);
        const currentLvl = storyMap[key];
        const isCurrentlyBuilt = currentLvl !== undefined && currentLvl >= 0;
        
        if (!isCurrentlyBuilt) {
            handleResetCamera();
        }
    }, [storyMap, handleResetCamera]);

    const handleDragStart = () => { 
        isPanning.current = true; 
        setDestroyButtonCell(null);
    };
    const handleDragEnd = (e: any) => { 
        setCameraPos({ x: e.target.x(), y: e.target.y() });
        setTimeout(() => { isPanning.current = false; }, 50); 
    };

    const lastDist = useRef<number | null>(null);

    const handleWheel = (e: any) => {
        if (e.evt && typeof e.evt.preventDefault === 'function') {
            e.evt.preventDefault();
        }
        setDestroyButtonCell(null);
        const stage = e.target.getStage();
        if (!stage) return;
        
        const scaleBy = 1.05;
        const oldScale = zoomScale;
        
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const mousePointTo = {
            x: (pointer.x - cameraPos.x) / oldScale,
            y: (pointer.y - cameraPos.y) / oldScale,
        };

        const newScale = e.evt.deltaY < 0 ? oldScale / scaleBy : oldScale * scaleBy;
        const clampedScale = Math.max(0.4, Math.min(2.0, newScale));
        
        setZoomScale(clampedScale);
        setCameraPos({
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        });
    };

    const handleTouchStart = (e: any) => {
        setDestroyButtonCell(null);
        const touches = e.evt?.touches || e.touches || [];
        const touch1 = touches[0];
        const touch2 = touches[1];
        if (touch1 && touch2) {
            const dist = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );
            lastDist.current = dist;
        } else {
            lastDist.current = null;
        }
    };

    const handleTouchMove = (e: any) => {
        const touches = e.evt?.touches || e.touches || [];
        const touch1 = touches[0];
        const touch2 = touches[1];

        if (touch1 && touch2) {
            const rawEvt = e.evt || e;
            if (rawEvt && typeof rawEvt.preventDefault === 'function') {
                rawEvt.preventDefault();
            }
            isPanning.current = true;
            setDestroyButtonCell(null);
            const dist = Math.sqrt(
                Math.pow(touch2.clientX - touch1.clientX, 2) +
                Math.pow(touch2.clientY - touch1.clientY, 2)
            );

            if (lastDist.current !== null && lastDist.current > 0) {
                const center = {
                    x: (touch1.clientX + touch2.clientX) / 2,
                    y: (touch1.clientY + touch2.clientY) / 2,
                };

                const oldScale = zoomScale;
                const pointTo = {
                    x: (center.x - cameraPos.x) / oldScale,
                    y: (center.y - cameraPos.y) / oldScale,
                };

                const scaleFactor = dist / lastDist.current;
                const newScale = Math.max(0.4, Math.min(2.0, oldScale * scaleFactor));
                setZoomScale(newScale);

                setCameraPos({
                    x: center.x - pointTo.x * newScale,
                    y: center.y - pointTo.y * newScale,
                });
            }
            lastDist.current = dist;
        } else {
            lastDist.current = null;
        }
    };

    const handleTouchEnd = () => { 
        lastDist.current = null; 
        setTimeout(() => { isPanning.current = false; }, 50);
    };

    // Advances to next figure when completed
    const handleClaimReward = () => {
        playUiSound('SUCCESS');
        // Grant 1 SP (Skill Point) to the store
        setSkillPoints(skillPoints + 1);
        
        const nextIndex = unlockedFigureIndex + 1;
        if (nextIndex < FIGURES_COLLECTION.length) {
            setUnlockedFigureIndex(nextIndex);
            try {
                localStorage.setItem('hexopol_figure_index', String(nextIndex));
            } catch (e) {
                console.warn(e);
            }
        } else {
            // Completed all figures! Wrap around or reset
            setUnlockedFigureIndex(0);
            try {
                localStorage.setItem('hexopol_figure_index', '0');
            } catch {}
        }
        
        setPopupCell(null);
    };

    // Clear board reset
    const handleClearBoard = () => {
        if (window.confirm(language === 'RU' ? 'Вы уверены, что хотите очистить поле?' : 'Are you sure you want to clear the hexopl?')) {
            playUiSound('CLICK');
            clearStoryMap();
            setPopupCell(null);
        }
    };

    return (
        <div ref={containerRef} className="absolute inset-0 bg-[#020617] flex flex-col font-sans overflow-hidden">
            {/* CANVAS */}
            <div 
                className="absolute inset-0 z-0"
            >
                <Stage 
                    width={stageSize.width} 
                    height={stageSize.height}
                    onWheel={handleWheel}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onClick={() => setDestroyButtonCell(null)}
                    onTap={() => setDestroyButtonCell(null)}
                >
                    <Layer listening={false}>
                        <NebulaBackground width={stageSize.width} height={stageSize.height} />
                        <Rect
                            x={0}
                            y={0}
                            width={stageSize.width}
                            height={stageSize.height}
                            fillRadialGradientStartPoint={{ x: stageSize.width/2, y: stageSize.height/2 }}
                            fillRadialGradientStartRadius={Math.min(stageSize.width, stageSize.height) * 0.4}
                            fillRadialGradientEndPoint={{ x: stageSize.width/2, y: stageSize.height/2 }}
                            fillRadialGradientEndRadius={Math.max(stageSize.width, stageSize.height) * 0.8}
                            fillRadialGradientColorStops={[0, 'transparent', 1, 'rgba(2, 6, 23, 1)']}
                            listening={false}
                        />
                    </Layer>
                    <Layer 
                        x={cameraPos.x} 
                        y={cameraPos.y} 
                        scaleX={zoomScale}
                        scaleY={zoomScale}
                        draggable 
                        onDragStart={handleDragStart} 
                        onDragEnd={handleDragEnd}
                        dragBoundFunc={(pos) => {
                            const BOUND_X = stageSize.width * 2.2 * Math.max(1, zoomScale);
                            const BOUND_Y = stageSize.height * 2.2 * Math.max(1, zoomScale);
                            const centerX = stageSize.width / 2;
                            const centerY = stageSize.height / 2 - (stageSize.width < 768 ? 20 : 50);
                            return {
                                x: Math.max(Math.min(pos.x, centerX + BOUND_X), centerX - BOUND_X),
                                y: Math.max(Math.min(pos.y, centerY + BOUND_Y), centerY - BOUND_Y),
                            };
                        }}
                    >
                        <Group>
                            {gridPoints.map(coord => {
                                const key = getHexKey(coord.q, coord.r);
                                const lvl = storyMap[key];
                                const blueprintPt = activeFigure.shape.find(pt => pt.q === coord.q && pt.r === coord.r);
                                const isBlueprint = !!blueprintPt && (lvl === undefined || lvl < 0);
                                const blueprintLvl = blueprintPt?.lvl !== undefined ? blueprintPt.lvl : 0;
                                
                                const isEligible = isEligibleForPlacement(coord.q, coord.r);
                                const isCenterInitially = coord.q === 0 && coord.r === 0 && !hasAnyHex;
                                const isDemolishMode = selectedBuildLevel === -999;
                                const availableCount = minedInSessionHexes[selectedBuildLevel] || 0;
                                const canPlaceHex = isDemolishMode ? (lvl !== undefined && lvl >= 0) : (isEligible && availableCount > 0);

                                return (
                                    <StoryHex
                                        key={key}
                                        q={coord.q}
                                        r={coord.r}
                                        level={lvl}
                                        isBlueprint={isBlueprint}
                                        blueprintLevel={blueprintLvl}
                                        isEligible={isEligible}
                                        isCenterInitially={isCenterInitially}
                                        isSelected={popupCell !== null && popupCell.q === coord.q && popupCell.r === coord.r}
                                        isNew={lastPlacedKey === key}
                                        canPlace={canPlaceHex}
                                        onClick={handleCellClick}
                                        onDblClick={handleCellDblClick}
                                    />
                                );
                            })}
                        </Group>
                    </Layer>
                </Stage>
            </div>
            
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between overflow-hidden p-4 md:p-8">
                
                {/* FLOATING LIGHTWEIGHT ERROR MESSAGE (Moved ergonomically to perfectly centered bottom position, avoiding overflow) */}
                <AnimatePresence>
                    {errorMessage && (
                        <motion.div
                            initial={{ opacity: 0, y: 30, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 30, scale: 0.95 }}
                            className="absolute bottom-36 md:bottom-28 left-0 right-0 mx-auto z-[100] pointer-events-auto w-[calc(100%-3rem)] max-w-sm flex justify-center"
                        >
                            <div 
                                onClick={() => { playUiSound('CLICK'); setErrorMessage(null); }}
                                className="bg-slate-950/98 border border-slate-800 text-red-400 font-mono font-black uppercase text-xs tracking-wider px-4 py-3 rounded-lg shadow-xl w-full cursor-pointer hover:bg-slate-900 transition-all select-none text-center"
                            >
                                {errorMessage}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* FLOATING ACTION TOOLTIP FOR SAME-LEVEL HEX DEMOLISHING */}
                <AnimatePresence>
                    {destroyButtonCell && (() => {
                        const { q, r } = destroyButtonCell;
                        const key = getHexKey(q, r);
                        const lvl = storyMap[key];
                        if (lvl === undefined || lvl < 0) return null;
                        
                        const px = hexToPixel(q, r);
                        const heightVal = 12 + lvl * 12;
                        const yOffsetOffset = -heightVal;
                        const topFaceY = px.y + yOffsetOffset;
                        
                        // Calculate screen position
                        const leftPos = cameraPos.x + px.x * zoomScale;
                        const topPos = cameraPos.y + topFaceY * zoomScale - 46 * zoomScale; // place it 46px above the hex top face
                        
                        return (
                            <motion.div 
                                initial={{ scale: 0, opacity: 0, y: 10 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0, opacity: 0, y: 10 }}
                                style={{
                                    position: 'absolute',
                                    left: `${leftPos}px`,
                                    top: `${topPos}px`,
                                    transform: `translate(-50%, -100%) scale(${Math.max(0.75, Math.min(1.25, zoomScale))})`,
                                    zIndex: 120,
                                }}
                                className="pointer-events-auto"
                            >
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playUiSound('SUCCESS');
                                        placeStoryHex(q, r, -999);
                                        addMinedHexes({ [lvl]: 1 });
                                        setDestroyButtonCell(null);
                                    }}
                                    className="bg-red-650 hover:bg-red-700 text-white font-black uppercase text-[8px] md:text-[9.5px] tracking-wider px-2.5 py-1.5 rounded-lg shadow-[0_5px_15px_rgba(239,68,68,0.4)] border border-red-500 flex items-center gap-1 cursor-pointer transition-all active:scale-95 whitespace-nowrap"
                                >
                                    <span>✖</span>
                                    <span>{language === 'RU' ? 'УНИЧТОЖИТЬ' : 'DESTROY'}</span>
                                </button>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>
                
                {/* TOP HEADER STATUS */}
                <motion.div 
                    animate={{ y: isUiHidden ? -100 : 0, opacity: isUiHidden ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-between items-center w-full pointer-events-auto h-10"
                >
                    <div className="flex items-center gap-2 h-full">
                        <button 
                            onClick={() => { playUiSound('CLICK'); setUIState('MENU'); }}
                            className="flex items-center justify-center w-10 h-10 bg-slate-900/95 border border-white/10 rounded-xl hover:bg-slate-800 text-white transition-all shadow-md backdrop-blur-md hover:border-indigo-500/50 cursor-pointer"
                        >
                            <ArrowLeft className="w-5 h-5" /> 
                        </button>
                    </div>

                    <div className="flex items-center gap-2 h-full">
                        {/* Skill Points Scoreboard */}
                        <div className="bg-slate-900/95 border border-indigo-500/35 rounded-xl px-2.5 h-10 flex items-center gap-1.5 backdrop-blur-md shadow-md text-indigo-200 cursor-default">
                            <Trophy className="w-4 h-4 text-indigo-400 shrink-0" />
                            <span className="text-white font-black text-[12px] md:text-[13px]">{skillPoints} SP</span>
                        </div>

                        {/* Settings Button */}
                        <div className="relative h-full">
                            <button 
                                onClick={() => { playUiSound('CLICK'); setIsSettingsOpen(!isSettingsOpen); }}
                                className={`w-10 h-10 flex items-center justify-center backdrop-blur-xl border rounded-xl transition-all shadow-md active:scale-95 cursor-pointer ${
                                    isSettingsOpen 
                                        ? 'bg-slate-800 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                                        : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:text-white'
                                }`}
                            >
                                <Settings className={`w-4.5 h-4.5 ${isSettingsOpen ? 'rotate-90' : ''} transition-transform duration-500`} />
                            </button>

                            <AnimatePresence>
                                {isSettingsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        className="absolute top-full right-0 mt-2 p-3 bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-2 min-w-[200px] z-[60] origin-top-right"
                                    > 
                                        <button 
                                            onClick={() => { playUiSound('CLICK'); setIsHelpOpen(true); setIsSettingsOpen(false); }}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all w-full text-left font-black uppercase text-[9px] tracking-[0.1em]"
                                        >
                                            <HelpCircle className="w-4 h-4 shrink-0" />
                                            <span>{language === 'RU' ? 'Справка Гексагона' : 'Hexagon Guide'}</span>
                                        </button>

                                        <button 
                                            onClick={handleClearBoard}
                                            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-655/15 border border-red-550/20 text-red-400 hover:bg-red-900/40 hover:text-white transition-all w-full text-left font-black uppercase text-[9px] tracking-[0.1em]"
                                        >
                                            <RefreshCw className="w-4 h-4 shrink-0 transition-transform hover:rotate-180" />
                                            <span>{language === 'RU' ? 'Очистить карту' : 'Clear Board'}</span>
                                        </button>

                                        <div className="h-px bg-white/5 my-0.5" />

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { playUiSound('CLICK'); toggleMusic(); }}
                                                className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isMusicMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-400'}`}
                                            >
                                                {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                                            </button>
                                            <button 
                                                onClick={() => { playUiSound('CLICK'); toggleSfx(); }}
                                                className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isSfxMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'}`}
                                            >
                                                {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <div className="h-px bg-white/5 my-0.5" />

                                        <div className="px-1 py-1 flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-500 tracking-widest pl-1">
                                                <Languages className="w-3 h-3" />
                                                {language === 'RU' ? 'Язык' : 'Language'}
                                            </div>
                                            <div className="flex gap-1">
                                                <button 
                                                    onClick={() => { playUiSound('CLICK'); setLanguage('RU'); }}
                                                    className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${language === 'RU' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    RU
                                                </button>
                                                <button 
                                                    onClick={() => { playUiSound('CLICK'); setLanguage('EN'); }}
                                                    className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${language === 'EN' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                                >
                                                    EN
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </motion.div>

                {/* TOP INSTRUCTIONS PANEL (MOVED UP) */}
                <motion.div 
                    initial={{ y: -50, opacity: 0 }}
                    animate={{ 
                        y: isUiHidden ? -100 : 0, 
                        opacity: isUiHidden ? 0 : 1,
                        pointerEvents: isUiHidden ? 'none' : 'auto'
                    }}
                    transition={{ duration: 0.3 }}
                    className="w-full max-w-sm md:max-w-md mx-auto mt-3 pointer-events-none flex justify-center z-[45]"
                >
                    <div 
                        onClick={() => { playUiSound('CLICK'); setIsNarrativeCollapsed(!isNarrativeCollapsed); }}
                        className="bg-[#020617]/90 border border-white/10 rounded-2xl w-full shadow-2xl backdrop-blur-md flex flex-col overflow-hidden pointer-events-auto p-3.5 relative cursor-pointer hover:border-indigo-500/40 hover:bg-[#020617]/95 transition-all select-none"
                    >
                        {/* Sleek Top Edge Progress Line */}
                        <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-slate-900/60 overflow-hidden">
                            <div 
                                className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 transition-all duration-500"
                                style={{ width: `${((unlockedFigureIndex + 1) / FIGURES_COLLECTION.length) * 100}%` }}
                            />
                        </div>

                        <AnimatePresence mode="wait">
                        {!isNarrativeCollapsed ? (
                            <motion.div
                                key={`expanded-${unlockedFigureIndex}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col"
                            >
                                <div className="flex justify-between items-center mb-2 border-b border-white/5 pb-1">
                                    <div className="flex items-center gap-1.5 min-w-0">
                                        <span className="text-[7.5px] font-black text-cyan-400 uppercase tracking-widest leading-none shrink-0">
                                            {language === 'RU' ? 'АКТИВНЫЙ ЧЕРТЕЖ' : 'ACTIVE BLUEPRINT'}
                                        </span>
                                        <span className="bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[7px] font-mono font-black text-indigo-300 leading-none">
                                            {unlockedFigureIndex + 1}/{FIGURES_COLLECTION.length}
                                        </span>
                                    </div>
                                    <div className="text-[7.5px] font-black text-cyan-400 hover:text-cyan-300 uppercase flex items-center gap-0.5 shrink-0">
                                        <ChevronUp className="w-3 h-3" />
                                        <span>{language === 'RU' ? 'СВЕРНУТЬ' : 'COLLAPSE'}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3.5 mb-2.5">
                                    {/* Mini SVG representation showing where to build it */}
                                    <MiniFigureBlueprint shape={activeFigure.shape} />
                                    
                                    <div className="flex flex-col justify-center">
                                        <h3 className="text-[11px] md:text-xs font-black text-white uppercase tracking-tight leading-tight mb-0.5">
                                            {language === 'RU' ? activeFigure.nameRU : activeFigure.nameEN}
                                        </h3>
                                        <p className="text-slate-400 text-[9.5px] leading-snug font-sans font-medium">
                                            {language === 'RU' ? activeFigure.descRU : activeFigure.descEN}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-2 bg-slate-950/40 border border-white/5 rounded-lg mb-2.5 flex flex-col gap-1 text-[8px] text-slate-400 font-sans leading-tight font-medium">
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
                                        <span>{language === 'RU' ? '1. Почва L0 выделена голубым при клике' : '1. Deploy Level 0 (Ground) cells'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                                        <span>{language === 'RU' ? '2. Составляйте фигуру по чертежу или в любом месте' : '2. Match coordinates or build anywhere'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
                                        <span>{language === 'RU' ? '3. Вы получите +1 SP за правильную фигуру!' : '3. Claim 1 SP on completion!'}</span>
                                    </div>
                                </div>

                                {/* Claim & Completion Button */}
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                    {targetCompleted ? (
                                        <motion.button
                                            onClick={(e) => { e.stopPropagation(); handleClaimReward(); }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            className="w-full py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-black uppercase text-[9px] tracking-widest rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2 border border-purple-400"
                                        >
                                            <Crown className="w-3.5 h-3.5" />
                                            <span>{language === 'RU' ? 'ПРИНЯТЬ: +1 SP // СЛЕД. ФИГУРА' : 'COLLECT: +1 SP // NEXT'}</span>
                                        </motion.button>
                                    ) : (
                                        <div className="w-full py-2 bg-slate-950/50 border border-white/5 text-slate-500 font-black uppercase text-[8.5px] tracking-widest rounded-xl text-center italic">
                                            {language === 'RU' ? 'ФИГУРА ЕЩЕ НЕ СОБРАНА' : 'FIGURE NOT YET COMPLETED'}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div
                                key={`collapsed-${unlockedFigureIndex}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="flex justify-between items-center w-full font-sans"
                            >
                                <div className="flex flex-col gap-1 min-w-0 pr-2">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[7.5px] font-black text-indigo-400 uppercase tracking-widest leading-none shrink-0">
                                            {language === 'RU' ? 'СТРОИТЕЛЬНАЯ ЗАДАЧА' : 'CONSTRUCT OBJECTIVE'}
                                        </span>
                                        <span className="bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-500/20 text-[7px] font-mono font-black text-indigo-300 leading-none">
                                            {unlockedFigureIndex + 1}/{FIGURES_COLLECTION.length}
                                        </span>
                                    </div>
                                    <h3 className="text-[11px] md:text-xs font-black text-white uppercase tracking-tight leading-tight line-clamp-1">
                                        {language === 'RU' ? activeFigure.nameRU : activeFigure.nameEN}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {targetCompleted && (
                                        <span className="bg-emerald-950 border border-emerald-500/30 text-emerald-400 text-[6.5px] font-black px-1.5 py-0.5 rounded leading-none shrink-0">DONE!</span>
                                    )}
                                    <div className="text-[7.5px] font-black text-cyan-400 hover:text-cyan-300 uppercase flex items-center gap-0.5 shrink-0">
                                        <ChevronDown className="w-3 h-3 animate-pulse" />
                                        <span>{language === 'RU' ? 'ИНФО' : 'INFO'}</span>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </div>
                </motion.div>

                {/* BOTTOM CONTENT - Compact Inventory Carousel */}
                <div className="mt-auto flex justify-center pointer-events-none pt-4 w-full max-w-5xl mx-auto px-4 md:px-0 select-none pb-2">
                    
                    {/* COMPACT CAROUSEL - relocated elegantly to the center (cells made smaller, L0 to L9, eraser) */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ 
                            y: isUiHidden ? 100 : 0, 
                            opacity: isUiHidden ? 0 : 1,
                            pointerEvents: isUiHidden ? 'none' : 'auto'
                        }}
                        transition={{ duration: 0.3 }}
                        className="w-full md:max-w-md lg:max-w-xl flex flex-col items-stretch pointer-events-auto"
                    >
                        <div className="w-full bg-[#090d1f]/85 border border-white/5 rounded-2xl p-2 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-indigo-500/20 to-transparent" />
                            
                            {/* Carousel Wrapper */}
                            <div className="relative flex items-center w-full px-5">
                                
                                {/* Left Scroll Command */}
                                <button
                                    onClick={handleScrollLeft}
                                    className="absolute left-0 z-20 w-6 h-6 rounded-lg bg-[#0c132c]/90 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all shadow-md active:scale-95 cursor-pointer"
                                    title={language === 'RU' ? 'Назад' : 'Prev'}
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                </button>

                                {/* Scrolling container */}
                                <div 
                                    ref={carouselRef}
                                    className="w-full flex flex-row gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-nowrap scroll-smooth"
                                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                >
                                    
                                {/* Levels L0 to L9 */}
                                    {Array.from({ length: 10 }).map((_, lvl) => {
                                        const qty = minedInSessionHexes[lvl] || 0;
                                        const isSelected = selectedBuildLevel === lvl;
                                        const theme = THEME_PALETTE[String(lvl)] || THEME_PALETTE['0'];
                                        return (
                                            <button
                                                key={lvl}
                                                onClick={() => { playUiSound('CLICK'); setSelectedBuildLevel(lvl); }}
                                                className={`flex-shrink-0 flex flex-col items-center justify-between p-1 rounded-lg border text-center transition-all w-11 h-15 relative cursor-pointer outline-none group ${
                                                    isSelected
                                                        ? 'bg-indigo-950/40 border-cyan-400/50 text-cyan-200 shadow-[0_0_15px_rgba(34,211,238,0.25)] scale-102'
                                                        : qty > 0 
                                                            ? 'bg-slate-950/50 border-white/5 text-slate-300 hover:bg-[#0f1530] hover:border-white/10'
                                                            : 'bg-slate-950/20 border-white/5 opacity-50 text-slate-500 hover:opacity-70'
                                                }`}
                                            >
                                                <span className="text-[6.5px] font-black tracking-widest uppercase leading-none text-slate-400">
                                                    L{lvl}
                                                </span>
                                                
                                                <div className="w-7 h-8 flex items-center justify-center">
                                                    {drawInventoryHex(lvl, theme)}
                                                </div>

                                                <span className={`text-[7px] font-mono font-bold leading-none ${qty > 0 ? 'text-indigo-400' : 'text-slate-600'}`}>
                                                    x{qty}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Right Scroll Command */}
                                <button
                                    onClick={handleScrollRight}
                                    className="absolute right-0 z-20 w-6 h-6 rounded-lg bg-[#0c132c]/90 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-indigo-600 transition-all shadow-md active:scale-95 cursor-pointer"
                                    title={language === 'RU' ? 'Вперед' : 'Next'}
                                >
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* HIGH TECH INTENSIVE PHYSICAL RULES */}
            <AnimatePresence>
                {isHelpOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto"
                        onClick={() => setIsHelpOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-950 border-2 border-indigo-500/40 rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-[0_0_50px_rgba(79,70,229,0.25)] relative overflow-hidden text-left"
                        >
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />

                            <div className="flex justify-between items-start mb-6 z-20 relative">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-500/15 rounded-lg border border-indigo-500/35 text-indigo-400">
                                        <Info className="w-5 h-5 text-cyan-400 shrink-0" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/60 leading-none mb-1">SYSTEM_GUIDE</span>
                                        <h2 className="text-base md:text-lg font-black text-white uppercase tracking-wider leading-none">
                                            {language === 'RU' ? 'Правила Гексагона' : 'Hexagon Guide rules'}
                                        </h2>
                                    </div>
                                </div>
                                <button onClick={() => { playUiSound('CLICK'); setIsHelpOpen(false); }} className="text-slate-500 hover:text-white transition-all transform hover:scale-110 active:scale-95 cursor-pointer">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed relative z-20">
                                {language === 'RU' 
                                    ? 'Гексагон — это творческое логическое пространство, где вы собираете древние фигуры из гексов. Накапливайте Очки Умений для развития вашей Кампании:' 
                                    : 'The Hexagon is a sanctuary of spatial construction where you shape hex figures. Use your analytical wits to claim Skill Points and power your global campaign Upgrades:'}
                            </p>

                            <div className="space-y-4 mb-6 relative z-20 max-h-[45vh] overflow-y-auto no-scrollbar pr-1">
                                <div className="p-3 bg-slate-900/40 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]" />
                                        {language === 'RU' ? '1. Подача ресурсов (Плитки 0 уровня)' : '1. Supply Level 0 Tiles'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        {language === 'RU'
                                            ? 'Вам изначально дается 10 плиток почвы 0-го уровня. При размещении новых плиток баланс автоматически пополняется до 10 штук, так что у вас всегда есть материал!'
                                            : 'You receive 10 level 0 tiles initially. Placement consumes a block, though the matrix maintains your backup buffer at 10 tiles, ensuring you never run out!'}
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-900/40 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
                                        {language === 'RU' ? '2. Очерёдность и Обводка' : '2. Adjacency Outline'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        {language === 'RU'
                                            ? 'Первая плитка выкладывается в самый центр (0,0), который упруго мигает синим вектором. Каждая последующая должна соприкасаться с уже уложенными гексами. Все доступные для укладки клетки обводятся синим пунктиром.'
                                            : 'The first cell sits exactly at the anchor center (0,0), which glows with energetic cyan. All subsequent hexes must attach adjacent to built ones. Valid placement borders dynamically outline in dashed line.'}
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-900/40 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2 font-mono">
                                        <span className="w-1.5 h-1.5 rounded-full bg-pink-400 shadow-[0_0_8px_rgba(244,114,182,0.5)]" />
                                        {language === 'RU' ? '3. Выкладывание по чертежам или случайно' : '3. Blueprint or Organic Shape'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        {language === 'RU'
                                            ? 'Каждая фигура имеет фиолетовый призрак-чертёж на поле. Вы можете собрать её строго по чертежу вокруг центра, а можете случайно разместить где угодно в стороне. Как только нужная форма совпадёт — она будет засчитана!'
                                            : 'Each figure renders as a faint purple holographic ghost blueprint at the center. You can shape it on coordinates or organically assemble it anywhere offset. Once the form structure matches, the system validates it!'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => { playUiSound('CLICK'); setIsHelpOpen(false); }}
                                className="w-full bg-indigo-600/25 border border-indigo-500 text-indigo-400 hover:bg-indigo-600 hover:text-white font-black py-3 rounded-xl transition-all uppercase tracking-[0.25em] text-xs shadow-xl active:scale-98 cursor-pointer relative z-20"
                            >
                                {language === 'RU' ? 'Вернуться в игру' : 'Resume Hexopl'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* INTERACTIVE DEMOLITION CONFIRMATION MODAL */}
            <AnimatePresence>
                {popupCell && (() => {
                    const key = getHexKey(popupCell.q, popupCell.r);
                    const currentLevel = storyMap[key];
                    if (currentLevel === undefined) return null;
                    
                    return (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 pointer-events-auto"
                            onClick={() => setPopupCell(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, y: 15 }}
                                animate={{ scale: 1, y: 0 }}
                                exit={{ scale: 0.95, y: 15 }}
                                onClick={(e) => e.stopPropagation()}
                                className="bg-slate-950 border-2 border-red-500/30 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(239,68,68,0.2)] relative text-left"
                            >
                                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500/40 z-30 pointer-events-none" />
                                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500/40 z-30 pointer-events-none" />
                                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500/40 z-30 pointer-events-none" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500/40 z-30 pointer-events-none" />
                                <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                                
                                <div className="text-center p-2 z-20 relative">
                                    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                                        <X className="w-7 h-7 font-black" />
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase tracking-wider mb-1.5 text-center">
                                        {language === 'RU' ? 'ПОДТВЕРДИТЬ СНОС?' : 'CONFIRM DEMOLITION?'}
                                    </h4>
                                    <p className="text-slate-400 text-[10px] mb-6 text-center leading-relaxed">
                                        {language === 'RU' 
                                            ? `Вы уверены, что хотите демонтировать и убрать этот гекс уровня L${currentLevel}? Плитка будет перенесена обратно на ваш склад.`
                                            : `Are you sure you want to demolish and remove this L${currentLevel} hex? The tile will be reclaimed and placed back inside your depository.`}
                                    </p>
                                    
                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={() => { playUiSound('CLICK'); setPopupCell(null); }}
                                            className="flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest bg-slate-900 border border-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                                        >
                                            {language === 'RU' ? 'ОТМЕНА' : 'CANCEL'}
                                        </button>
                                        <button
                                            onClick={() => {
                                                playUiSound('SUCCESS');
                                                placeStoryHex(popupCell.q, popupCell.r, -999);
                                                addMinedHexes({ [currentLevel]: 1 });
                                                setPopupCell(null);
                                            }}
                                            className="flex-1 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest bg-red-650 text-white hover:bg-red-700 hover:shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-1 cursor-pointer border border-red-500"
                                        >
                                            <span className="text-[11px] leading-none">✖</span>
                                            <span>{language === 'RU' ? 'СНЕСТИ' : 'DEMOLISH'}</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>


        </div>
    );
};

export default StoryBuilderView;
