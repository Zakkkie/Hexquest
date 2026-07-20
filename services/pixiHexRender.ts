// Shared PixiJS hex-rendering helpers.
//
// These pure helpers are used by both the main game board (`components/MapRenderer.tsx`)
// and the StoryBuild board (`components/StoryBoardPixi.tsx`). Keeping them in one module
// avoids drift between the two renderers (identical colors, geometry, texture cache, and
// animation easings).
import * as PIXI from 'pixi.js';
import { HEX_SIZE } from '../rules/config.ts';

const DEG_TO_RAD = Math.PI / 180;

// Flag value used by the main renderer to mark fully-collapsed VOID hexes.
const VOID_LEVEL_FLAG = -99;

// PRE-COMPUTE HEX GEOMETRY FOR THE TOP SURFACE (Centered at 0,0).
// HEX_SIZE-based, identical to the BASE_POINTS used by StoryBuilderData.ts so the
// board dimensions match exactly between the two renderers.
export const BASE_POINTS: { x: number; y: number }[] = [];
for (let i = 0; i < 6; i++) {
  const angle = (60 * i + 30) * DEG_TO_RAD;
  BASE_POINTS.push({
    x: Math.cos(angle) * HEX_SIZE,
    y: Math.sin(angle) * HEX_SIZE,
  });
}

export const THEME_PALETTE: Record<string, { main: string; light: string; dark: string; stroke: string }> = {
    '0': { main: '#111827', light: '#2a3241', dark: '#020617', stroke: '#374151' },
    '1': { main: '#0f172a', light: '#1e3a8a', dark: '#01040a', stroke: '#38bdf8' },
    '2': { main: '#1e40af', light: '#3b82f6', dark: '#0f172a', stroke: '#60a5fa' },
    '3': { main: '#0369a1', light: '#0ea5e9', dark: '#011c2a', stroke: '#38bdf8' },
    '4': { main: '#3730a3', light: '#4f46e5', dark: '#120e2d', stroke: '#818cf8' },
    '5': { main: '#581c87', light: '#7e22ce', dark: '#21023a', stroke: '#c084fc' },
    '6': { main: '#701a75', light: '#a21caf', dark: '#2c0022', stroke: '#e879f9' },
    '7': { main: '#86198f', light: '#d946ef', dark: '#3b0231', stroke: '#f472b6' },
    '8': { main: '#9a3412', light: '#ea580c', dark: '#360505', stroke: '#f97316' },
    '9': { main: '#a16207', light: '#eab308', dark: '#341a04', stroke: '#facc15' },
    '10': { main: '#ca8a04', light: '#facc15', dark: '#422006', stroke: '#ffffff' },
    '-1': { main: '#1c1917', light: '#292524', dark: '#0c0a09', stroke: '#44403c' },
    '-2': { main: '#1c1512', light: '#3c2215', dark: '#050201', stroke: '#5c3725' },
    '-3': { main: '#0a0d0a', light: '#132c1c', dark: '#010402', stroke: '#10b981' },
    '-4': { main: '#420606', light: '#991b1b', dark: '#1a0202', stroke: '#ef4444' },
    '-5': { main: '#6d0e0e', light: '#b91c1c', dark: '#2a0303', stroke: '#f87171' },
    '-6': { main: '#881313', light: '#fca5a5', dark: '#370000', stroke: '#fca5a5' },
    '-7': { main: '#250833', light: '#6b21a8', dark: '#11001a', stroke: '#c084fc' },
    '-8': { main: '#040c1b', light: '#0ea5e9', dark: '#01040a', stroke: '#67e8f9' },
};

export const getTheme = (level: number) => {
    if (level > 8) return THEME_PALETTE['10'];
    if (level < -8) return THEME_PALETTE['-8'];
    const key = String(level);
    if (THEME_PALETTE[key]) return THEME_PALETTE[key];
    if (level > 0) {
        if (level <= 3) return THEME_PALETTE['1'];
        if (level <= 7) return THEME_PALETTE['4'];
        return THEME_PALETTE['8'];
    }
    if (level < 0) {
        if (level >= -3) return THEME_PALETTE['-1'];
        if (level >= -7) return THEME_PALETTE['-4'];
        return THEME_PALETTE['-8'];
    }
    return THEME_PALETTE['0'];
};

// Visual elevation offset (negative = up). Mirrors MapRenderer's getHeightOffset /
// getHexVisualHeight exactly.
export const getHeightOffset = (level: number) => {
    if (level <= VOID_LEVEL_FLAG) return 0;
    if (level >= 0) return -(10 + level * 10);
    return (Math.abs(level) - 1) * 10;
};

// CACHE SHARING DOM Texture -> WebGL textures.
const textureCache = new Map<HTMLCanvasElement | HTMLImageElement, PIXI.Texture>();
const keyTextureCache = new Map<string, PIXI.Texture>();

export const getPixiTexture = (canvas: HTMLCanvasElement | HTMLImageElement): PIXI.Texture => {
    const key = (canvas as any).__cacheKey;
    if (key) {
        let tex = keyTextureCache.get(key);
        if (!tex) {
            tex = PIXI.Texture.from(canvas);
            keyTextureCache.set(key, tex);
        }
        return tex;
    }

    let tex = textureCache.get(canvas);
    if (!tex) {
        tex = PIXI.Texture.from(canvas);
        textureCache.set(canvas, tex);
    }
    return tex;
};

export const clearPixiTextureCache = () => {
    for (const tex of keyTextureCache.values()) {
        try {
            tex.destroy(true);
        } catch (e) {
            // ignore
        }
    }
    keyTextureCache.clear();

    for (const tex of textureCache.values()) {
        try {
            tex.destroy(true);
        } catch (e) {
            // ignore
        }
    }
    textureCache.clear();
};

// --- Easing utilities (normalized: f(p) where p in [0,1] -> eased fraction) ---
// Ports of the Konva.Easings used by the StoryBuild tweens so the Pixi ticker
// reproduces the exact same motion curves.
const BACK_S = 1.70158;

// Konva.Easings.BackEaseOut
export const backOut = (p: number): number => {
    const t = p - 1;
    return t * t * ((BACK_S + 1) * t + BACK_S) + 1;
};

// Konva.Easings.EaseOut  (c * sin(t/d * PI/2))
export const easeOut = (p: number): number => Math.sin(p * (Math.PI / 2));

// Konva.Easings.EaseInOut  (-c/2 * (cos(PI*t/d) - 1))
export const easeInOut = (p: number): number => -0.5 * (Math.cos(Math.PI * p) - 1);

// Konva.Easings.BackEaseIn
export const backIn = (p: number): number => p * p * ((BACK_S + 1) * p - BACK_S);

/**
 * Returns the appropriate emoji icon for a given Point of Interest type.
 */
export const getPoiIcon = (type: string): string => {
  switch (type) {
    case "city_hub": return "🏛️";
    case "tavern_travelers": return "🍺";
    case "bulletin_board": return "📋";
    case "guard_post": return "🛡️";
    case "forge": return "⚒️";
    case "alchemist": return "🧪";
    case "watchtower": return "🔭";
    case "market": return "⚖️";
    case "warehouse": return "📦";
    case "healer": return "🩹";
    case "temple": return "⛪";
    case "archive": return "📜";
    case "tavern_spirit": return "🍷";
    case "RIFT_S1_2": return "🌀";
    case "RIFT_S3_4": return "🌋";
    default: return "📍";
  }
};

/**
 * Translates tactical arrow labels for Russian locale.
 */
export function translateArrowLabel(label: string, isRu: boolean): string {
    if (!isRu) return label;
    const lower = label.toLowerCase().trim();
    
    // Exact matches
    if (lower === 'build') return 'Строй';
    if (lower === 'move') return 'Шаг';
    if (lower === 'dig') return 'Бур';
    if (lower === 'dig x2') return 'Бур x2';
    if (lower === 'checkpoint') return 'Точка';
    if (lower === 'portal') return 'Портал';
    if (lower === 'path') return 'Путь';
    if (lower === 'capital') return 'Капитолий';
    if (lower === 'goal') return 'Цель';
    if (lower === 'reactor') return 'Реактор';
    if (lower === 'l3 ridge') return 'Хребет L3';
    if (lower === 'goal l3') return 'Цель L3';
    if (lower === 'heal') return 'Лечить';
    if (lower === 'deep mine') return 'Шахта';
    if (lower === 'monolith') return 'Монолит';
    if (lower === 'shaft') return 'Шахта';
    if (lower === 'obelisk') return 'Обелиск';
    if (lower === 'sunken monolith') return 'Затонувший Монолит';
    if (lower === 'stabilizer') return 'Стабилизатор';
    if (lower === 'monument') return 'Монумент';
    if (lower === 'alpha') return 'Альфа';
    if (lower === 'beta') return 'Бета';
    if (lower === 'gamma') return 'Гамма';
    if (lower === 'exit') return 'Выход';
    if (lower === 'center') return 'Центр';
    if (lower === 'target') return 'Мишень';
    if (lower === 'l2') return 'L2';
    if (lower === 'l0') return 'L0';
    if (lower === 'l-1') return 'L-1';
    
    // Partial translations for things with numbers or variable parts
    let result = label;
    result = result.replace(/Obelisk/gi, 'Обелиск');
    result = result.replace(/Dig/gi, 'Бур');
    result = result.replace(/Build/gi, 'Строй');
    result = result.replace(/Move/gi, 'Шаг');
    
    return result;
}
