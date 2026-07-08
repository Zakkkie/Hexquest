import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { HEX_SIZE } from '../rules/config.ts';
import { hexToPixel, getHexKey } from '../services/hexUtils.ts';
import { textureService } from '../services/textureService.ts';
import {
    BASE_POINTS,
    getTheme,
    getHeightOffset,
    getPixiTexture,
    backOut,
    easeOut,
    easeInOut,
    backIn,
    THEME_PALETTE,
} from '../services/pixiHexRender.ts';

// ---- Shared geometry (squashed top-face hex points) ----
const SQUASHED_POINTS = BASE_POINTS.map(p => ({ x: p.x, y: p.y * 0.8 }));

const C = (hex: string): number => PIXI.Color.shared.setValue(hex).toNumber();

// ---- Cell render-data (mirror of StoryBuilderView.cellDataList + transient flags) ----
export interface StoryCellData {
    key: string;
    q: number;
    r: number;
    lvl: number | undefined;
    isBlueprint: boolean;
    blueprintLevel: number;
    isEligible: boolean;
    isCenterInitially: boolean;
    canPlaceHex: boolean;
    isCore?: boolean;
}

interface StoryBoardPixiProps {
    cells: StoryCellData[];
    camera: { x: number; y: number; scale: number };
    dimensions: { width: number; height: number };
    transient: {
        popupKey: string | null;
        flareKeys: Set<string>;
        lastPlacedKey: string | null;
        failedClickKey: string | null;
        hoveredKey: string | null;
    };
    contrastHighlighting?: number;
    figureIndex?: number;
    onCellClick: (q: number, r: number) => void;
    onCellDblClick: (q: number, r: number) => void;
    onHover: (key: string | null) => void;
    onCameraChange: (camera: { x: number; y: number; scale: number }) => void;
    onBackgroundClick?: () => void;
}

// Per-cell animation state, advanced by the ticker (ms-based, like Konva tween durations).
interface CellAnim {
    spawnT?: number;      // 0.5s spawn drop+fade (isNew)
    rippleT?: number;     // 0.65s ripple (isNew)
    flareT?: number;      // 1.6s flare glow (isFlaring)
    collapseStartMs?: number; // wall-clock ms when isFlaring began (collapse starts +1000ms)
    collapseT?: number;   // 0.6s collapse (isFlaring after 1000ms)
    failedT?: number;     // 0.5s blink (isFailedClick)
    pulseT?: number;      // looping pulse phase (isEligible+built)
    eligPulseT?: number;  // looping pulse for eligible unbuilt hexes
}

// Helper: build a hex polygon path on a Graphics from a point list.
const tracePoly = (g: PIXI.Graphics, points: { x: number; y: number }[]) => {
    g.beginPath();
    points.forEach((p, i) => {
        if (i === 0) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
    });
    g.closePath();
};

// Helper: linear interpolation between two hex colors (returns PIXI numeric color).
const lerpColorNum = (aHex: string, bHex: string, t: number): number => {
    const a = PIXI.Color.shared.setValue(aHex).toRgbArray();
    const b = PIXI.Color.shared.setValue(bHex).toRgbArray();
    const r = a[0] + (b[0] - a[0]) * t;
    const gg = a[1] + (b[1] - a[1]) * t;
    const bl = a[2] + (b[2] - a[2]) * t;
    return (Math.round(r * 255) << 16) | (Math.round(gg * 255) << 8) | Math.round(bl * 255);
};

// Sample a Konva-style colorStops array ([pos0, color0, pos1, color1, ...]) at fraction f.
const sampleStops = (stops: (number | string)[], f: number): number => {
    let i = 0;
    while (i + 2 < stops.length && (stops[i + 2] as number) < f) i += 2;
    const p0 = stops[i] as number;
    const c0 = stops[i + 1] as string;
    const p1 = (stops[i + 2] as number) ?? p0;
    const c1 = (stops[i + 3] as string) ?? c0;
    const span = p1 - p0;
    const local = span > 0 ? Math.max(0, Math.min(1, (f - p0) / span)) : 0;
    return lerpColorNum(c0, c1, local);
};

// Draw a vertical-gradient wall quad by segmenting it into bands and sampling the stops.
// Reproduces Konva fillLinearGradient (top->bottom) faithfully enough for the dark 3D look.
const GRADIENT_BANDS = 10;
const drawGradientWall = (
    g: PIXI.Graphics,
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    wallHeight: number,
    stops: (number | string)[],
    strokeColor: number
) => {
    for (let b = 0; b < GRADIENT_BANDS; b++) {
        const f0 = b / GRADIENT_BANDS;
        const f1 = (b + 1) / GRADIENT_BANDS;
        const y0a = p1.y + wallHeight * f0;
        const y0b = p2.y + wallHeight * f0;
        const y1a = p1.y + wallHeight * f1;
        const y1b = p2.y + wallHeight * f1;
        const midF = (f0 + f1) / 2;
        const col = sampleStops(stops, midF);
        g.beginPath();
        g.moveTo(p1.x, y0a);
        g.lineTo(p2.x, y0b);
        g.lineTo(p2.x, y1b);
        g.lineTo(p1.x, y1a);
        g.closePath();
        g.fill({ color: col });
    }
    // Outline the full quad with the side stroke.
    g.beginPath();
    g.moveTo(p1.x, p1.y);
    g.lineTo(p2.x, p2.y);
    g.lineTo(p2.x, p2.y + wallHeight);
    g.lineTo(p1.x, p1.y + wallHeight);
    g.closePath();
    g.stroke({ width: 1.5, color: strokeColor });
};

const StoryBoardPixi: React.FC<StoryBoardPixiProps> = ({
    cells,
    camera,
    dimensions,
    transient,
    contrastHighlighting = 0,
    figureIndex = 9999,
    onCellClick,
    onCellDblClick,
    onHover,
    onCameraChange,
    onBackgroundClick,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const appRef = useRef<PIXI.Application | null>(null);
    const worldRef = useRef<PIXI.Container | null>(null);
    const boardRef = useRef<PIXI.Container | null>(null);
    const bgRef = useRef<PIXI.Container | null>(null);
    const cellCache = useRef<Map<string, PIXI.Container>>(new Map());
    const animStates = useRef<Map<string, CellAnim>>(new Map());
    const [isReady, setIsReady] = React.useState(false);

    // Latest props for use inside imperative handlers / ticker.
    const cellsRef = useRef(cells);
    const transientRef = useRef(transient);
    const cameraRef = useRef(camera);
    const lastAppliedLocalCamera = useRef<{ x: number; y: number; scale: number } | null>(null);
    const dimsRef = useRef(dimensions);
    const contrastRef = useRef(contrastHighlighting);
    const figureIndexRef = useRef(figureIndex);
    const onCellClickRef = useRef(onCellClick);
    const onCellDblClickRef = useRef(onCellDblClick);
    const onHoverRef = useRef(onHover);
    const onCameraChangeRef = useRef(onCameraChange);
    const onBackgroundClickRef = useRef(onBackgroundClick);

    cellsRef.current = cells;
    transientRef.current = transient;
    cameraRef.current = camera;
    dimsRef.current = dimensions;
    contrastRef.current = contrastHighlighting;
    figureIndexRef.current = figureIndex;
    onCellClickRef.current = onCellClick;
    onCellDblClickRef.current = onCellDblClick;
    onHoverRef.current = onHover;
    onCameraChangeRef.current = onCameraChange;
    onBackgroundClickRef.current = onBackgroundClick;

    // ---------- Nebula background (drawn once, drift+pulse in ticker) ----------
    const nebulaRef = useRef<PIXI.Container | null>(null);
    const vignetteRef = useRef<PIXI.Graphics | null>(null);
    const starsRef = useRef<PIXI.Graphics | null>(null);
    const nebulaTimeRef = useRef(0);

    const buildBackground = () => {
        const bg = bgRef.current;
        if (!bg) return;
        // Clear previous
        bg.removeChildren().forEach(c => c.destroy({ children: true }));

        const w = dimsRef.current.width || 1000;
        const h = dimsRef.current.height || 1000;

        // Nebula group, rotated/translated like NebulaBackground (offset to its own center).
        const nebula = new PIXI.Container();
        nebula.x = w / 2;
        nebula.y = h / 2;
        nebula.pivot.set(w / 2, h / 2);
        nebulaRef.current = nebula;
        bg.addChild(nebula);

        const rand = (seed: number) => {
            const x = Math.sin(seed * 999.13) * 43758.5453;
            return x - Math.floor(x);
        };

        // Clouds (radial gradient circles) — approximate with layered alpha circles.
        const cloudColors = ['#1e1b4b', '#312e81', '#1e3a8a', '#4c1d95', '#581c87'];
        for (let i = 0; i < 5; i++) {
            const cx = rand(i + 1) * (w + 200) - 100;
            const cy = rand(i + 100) * (h + 200) - 100;
            const radius = 300 + rand(i + 200) * 300;
            const color = cloudColors[i % 5];
            const cg = new PIXI.Graphics();
            const RINGS = 36; // Increased from 6 to 36 for complete smoothness
            for (let k = RINGS; k >= 1; k--) {
                const rr = radius * (k / RINGS);
                const ratio = (k - 1) / RINGS;
                // Soft non-linear falling power curve completely dissolves circle borders
                const a = 0.18 * Math.pow(1 - ratio, 2.5);
                cg.beginPath();
                cg.circle(cx, cy, rr);
                cg.fill({ color: C(color), alpha: a });
            }
            nebula.addChild(cg);
        }

        // Radar circles (faint dashed strokes).
        const radarCircles = [
            { r: 120, opacity: 0.08, dash: [4, 8] },
            { r: 280, opacity: 0.05, dash: [2, 12] },
            { r: 440, opacity: 0.03, dash: [10, 15] },
            { r: 600, opacity: 0.02, dash: [5, 20] },
        ];
        radarCircles.forEach(circle => {
            const rg = new PIXI.Graphics();
            const segs = 180;
            const dashOn = circle.dash[0];
            const dashOff = circle.dash[1];
            const period = dashOn + dashOff;
            let acc = 0;
            for (let s = 0; s < segs; s++) {
                const a0 = (s / segs) * Math.PI * 2;
                const a1 = ((s + 1) / segs) * Math.PI * 2;
                const arcLen = (Math.PI * 2 * circle.r) / segs;
                const phase = acc % period;
                if (phase < dashOn) {
                    rg.moveTo(w / 2 + Math.cos(a0) * circle.r, h / 2 + Math.sin(a0) * circle.r);
                    rg.lineTo(w / 2 + Math.cos(a1) * circle.r, h / 2 + Math.sin(a1) * circle.r);
                }
                acc += arcLen;
            }
            rg.stroke({ width: 1, color: C('#818cf8'), alpha: circle.opacity });
            nebula.addChild(rg);
        });

        // Stars.
        const starColors = ['#ffffff', '#ffffff', '#e2e8f0', '#93c5fd', '#c084fc', '#22d3ee', '#fed7aa'];
        const sg = new PIXI.Graphics();
        for (let i = 0; i < 80; i++) {
            const sx = rand(i + 500) * (w + 200) - 100;
            const sy = rand(i + 600) * (h + 200) - 100;
            const radius = 0.5 + rand(i + 700) * 1.5;
            const opacity = 0.3 + rand(i + 800) * 0.7;
            sg.beginPath();
            sg.circle(sx, sy, radius);
            sg.fill({ color: C(starColors[i % 7]), alpha: opacity });
        }
        sg.x = w / 2;
        sg.y = h / 2;
        sg.pivot.set(w / 2, h / 2);
        starsRef.current = sg;
        bg.addChild(sg);

        // Radial vignette (transparent center -> dark edge), drawn as adjacent concentric rings.
        const vignette = new PIXI.Graphics();
        const innerR = Math.min(w, h) * 0.15;
        const outerR = Math.max(w, h) * 1.5;
        const VBANDS = 80; // Increased from 40 to 80 for seamless blending
        const step = (outerR - innerR) / VBANDS;
        for (let b = 1; b <= VBANDS; b++) {
            const f = b / VBANDS;
            const rr = innerR + step * (b - 0.5);
            // Non-linear power curve for perfect seamless transition without ring borders
            const alpha = Math.pow(f, 2.0) * 0.95;
            vignette.beginPath();
            vignette.circle(w / 2, h / 2, rr);
            vignette.stroke({ width: step + 1.5, color: C('#020617'), alpha: alpha });
        }
        vignetteRef.current = vignette;
        bg.addChild(vignette);
    };

    // ---------- Pixi lifecycle ----------
    useEffect(() => {
        if (!containerRef.current) return;

        const app = new PIXI.Application();
        appRef.current = app;

        const tickerCallback = tickerCallbackRef.current;
        const cache = cellCache;
        const states = animStates;

        const initPixi = async () => {
            try {
                await app.init({
                    width: dimsRef.current.width || window.innerWidth,
                    height: dimsRef.current.height || window.innerHeight,
                    backgroundAlpha: 0,
                    antialias: true,
                    resolution: window.devicePixelRatio || 1,
                    autoDensity: true,
                });
            } catch (err) {
                console.error('Failed to initialize StoryBoard Pixi:', err);
                return;
            }

            if (!containerRef.current || appRef.current !== app) {
                try {
                    app.destroy(true, { children: true });
                } catch (e) {
                    if (typeof (app as any)._cancelResize !== 'function') {
                        (app as any)._cancelResize = () => { /* empty */ };
                    }
                    try { app.destroy(true, { children: true }); } catch (e2) { /* empty */ }
                }
                return;
            }

            containerRef.current.appendChild(app.canvas);

            // bgContainer (non-interactive nebula + vignette), stays in screen space.
            const bg = new PIXI.Container();
            bg.eventMode = 'none';
            bgRef.current = bg;
            app.stage.addChild(bg);

            // world (camera) -> board (depth-sorted cells).
            const world = new PIXI.Container();
            worldRef.current = world;
            app.stage.addChild(world);

            const board = new PIXI.Container();
            board.sortableChildren = true;
            boardRef.current = board;
            world.addChild(board);

            buildBackground();

            // Apply initial camera.
            world.x = cameraRef.current.x;
            world.y = cameraRef.current.y;
            world.scale.set(cameraRef.current.scale, cameraRef.current.scale);

            app.ticker.add(tickerCallback);

            if (app.renderer) {
                app.renderer.resize(dimsRef.current.width, dimsRef.current.height);
            }

            setIsReady(true);
        };

        initPixi();

        return () => {
            setIsReady(false);
            if (appRef.current === app) {
                appRef.current = null;
                if (app.ticker) {
                    try { app.ticker.remove(tickerCallback); } catch (e) { /* empty */ }
                }
                try {
                    app.destroy(true, { children: true });
                } catch (e) {
                    if (typeof (app as any)._cancelResize !== 'function') {
                        (app as any)._cancelResize = () => { /* empty */ };
                    }
                    try { app.destroy(true, { children: true }); } catch (e2) { /* empty */ }
                }
                worldRef.current = null;
                boardRef.current = null;
                bgRef.current = null;
                nebulaRef.current = null;
                vignetteRef.current = null;
                cache.current.clear();
                states.current.clear();
            }
        };
         
    }, []);

    // Resize.
    useEffect(() => {
        const app = appRef.current;
        if (app && app.renderer && dimensions) {
            app.renderer.resize(dimensions.width, dimensions.height);
            buildBackground();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dimensions.width, dimensions.height]);

    // Live camera sync (from store-driven camera prop, e.g. reset button).
    useEffect(() => {
        const world = worldRef.current;
        if (world && camera) {
            // Avoid applying store updates that were triggered by our own local active dragging or zoom interactions (echoes)
            const last = lastAppliedLocalCamera.current;
            if (last && Math.abs(last.x - camera.x) < 0.1 && Math.abs(last.y - camera.y) < 0.1 && Math.abs(last.scale - camera.scale) < 0.001) {
                return;
            }
            world.x = camera.x;
            world.y = camera.y;
            world.scale.set(camera.scale, camera.scale);
            cameraRef.current = camera;
        }
    }, [camera, isReady]);

    // ---------- Per-cell scene build (rebuild on cells/transient change) ----------
    const rebuildCells = () => {
        const board = boardRef.current;
        if (!board) return;
        const list = cellsRef.current;
        const tr = transientRef.current;
        const contrast = contrastRef.current;
        const figIndex = figureIndexRef.current;
        const active = new Set<string>();

        const hasAnyPlaceable = list.some(cell => cell.canPlaceHex);

        list.forEach(cell => {
            const { key, q, r, lvl, blueprintLevel, isEligible, isCenterInitially, canPlaceHex } = cell;
            const isCore = cell.isCore || (q === 0 && r === 0);
            const showDashed = contrast > 0 && figIndex < contrast * 20;
            const isBlueprint = cell.isBlueprint && showDashed;
            const isVoid = lvl === -999;
            if (isVoid) return; // StoryHex returns null for VOID
            active.add(key);

            const isSelected = tr.popupKey === key;
            const isNew = tr.lastPlacedKey === key;
            const isFlaring = tr.flareKeys.has(key);
            const isFailedClick = tr.failedClickKey === key;
            const isHovered = tr.hoveredKey === key;

            const isBuilt = lvl !== undefined && lvl >= 0;
            const colors = (() => {
                const theme = getTheme(lvl !== undefined ? lvl : 0);
                return { side: theme.dark, top: theme.main, stroke: theme.stroke, light: theme.light };
            })();

            const activeLvl = lvl !== undefined ? lvl : (isBlueprint ? blueprintLevel : undefined);
            const isBuiltOrBlueprint = isBuilt || isBlueprint;
            const height = isBuiltOrBlueprint && activeLvl !== undefined ? (activeLvl >= 0 ? 10 + activeLvl * 10 : 10) : 0;
            const yOffset = isBuiltOrBlueprint && activeLvl !== undefined ? (activeLvl >= 0 ? -height : (Math.abs(activeLvl) - 1) * 10) : 0;
            const wallHeight = isBuiltOrBlueprint && activeLvl !== undefined ? (activeLvl >= 0 ? height : Math.abs(activeLvl) * 10) : 0;

            const px = hexToPixel(q, r);

            let container = cellCache.current.get(key);
            const isNewContainer = !container;
            if (!container) {
                container = new PIXI.Container();
                container.name = key;
                board.addChild(container);
                cellCache.current.set(key, container);
            }
            container.x = px.x;
            container.y = px.y; // baseline; spawn anim adjusts via collapse/spawn groups
            // Depth sort: deeper (larger y) drawn on top, matching Konva paint order.
            container.zIndex = py(q, r);

            // Interaction.
            container.eventMode = 'static';
            container.cursor = 'pointer';

            // Cache the pixel position for zero-allocation ticker access
            (container as any).px = px;

            // collapse group (scaled/faded by collapse + spawn handled at container level).
            let collapse = container.getChildByName('collapse') as PIXI.Container;
            if (!collapse) {
                collapse = new PIXI.Container();
                collapse.name = 'collapse';
                container.addChild(collapse);
            }
            // Reset collapse transform when not flaring (StoryHex resets scale/opacity).
            if (!isFlaring) {
                collapse.scale.set(1, 1);
                collapse.alpha = 1;
            }

            // High Performance Cache Key Check
            const stateKey = `${lvl}_${isBlueprint}_${blueprintLevel}_${isEligible}_${isCenterInitially}_${canPlaceHex}_${isCore}`;
            const mustRedraw = isNewContainer || (container as any).stateKey !== stateKey;

            if (mustRedraw) {
                (container as any).stateKey = stateKey;

            // ---- WALLS (3D sides) ----
            let walls = collapse.getChildByName('walls') as PIXI.Graphics;
            if (!walls) {
                walls = new PIXI.Graphics();
                walls.name = 'walls';
                collapse.addChild(walls);
            }
            walls.clear();
            walls.visible = isBuilt && wallHeight > 0;
            if (walls.visible) {
                walls.y = yOffset;
                [0, 1, 2, 5].forEach(i => {
                    const next = (i + 1) % 6;
                    const p1 = SQUASHED_POINTS[i];
                    const p2 = SQUASHED_POINTS[next];
                    const isLit = i === 1;
                    const isMild = i !== 0 && i !== 1;
                    let stops: (number | string)[];
                    if (isLit) {
                        stops = [0.0, colors.top, 0.15, colors.top, 0.5, colors.side, 1.0, '#010410'];
                    } else if (isMild) {
                        stops = [0.0, colors.top, 0.12, colors.top, 0.45, colors.side, 1.0, '#01020a'];
                    } else {
                        stops = [0.0, colors.top, 0.1, colors.side, 0.45, '#0c101d', 1.0, '#000000'];
                    }
                    drawGradientWall(walls, p1, p2, wallHeight, stops, C(colors.side));
                });
            }

            // ---- TOP FACE (group: y=yOffset, scaleY=0.8) ----
            let topGroup = collapse.getChildByName('topGroup') as PIXI.Container;
            if (!topGroup) {
                topGroup = new PIXI.Container();
                topGroup.name = 'topGroup';
                collapse.addChild(topGroup);
            }
            topGroup.y = yOffset;
            topGroup.scale.set(1, 0.8);

            // center initial ring (green)
            let centerRing = topGroup.getChildByName('centerRing') as PIXI.Graphics;
            if (isCenterInitially) {
                if (!centerRing) {
                    centerRing = new PIXI.Graphics();
                    centerRing.name = 'centerRing';
                    topGroup.addChild(centerRing);
                }
                centerRing.clear();
                centerRing.beginPath();
                centerRing.circle(0, 0, 25);
                centerRing.stroke({ width: 3, color: C('#10b981') });
                centerRing.alpha = 0.9;
                centerRing.visible = true;
            } else if (centerRing) {
                centerRing.visible = false;
            }

            // top face: textured sprite OR solid graphic
            let faceSprite = topGroup.getChildByName('faceSprite') as PIXI.Sprite;
            let faceSolid = topGroup.getChildByName('faceSolid') as PIXI.Graphics;
            const topTexture = (() => {
                if (lvl === undefined) return null;
                try { return textureService.getTexture(lvl, q, r, undefined, isCore ? 'CORE' : undefined) || null; } catch { return null; }
            })();

            if (isBuilt && topTexture) {
                if (faceSolid) faceSolid.visible = false;
                const tex = getPixiTexture(topTexture);
                if (!faceSprite) {
                    faceSprite = new PIXI.Sprite(tex);
                    faceSprite.name = 'faceSprite';
                    faceSprite.anchor.set(0.5, 0.5);
                    topGroup.addChild(faceSprite);
                }
                faceSprite.texture = tex;
                // Scale baked: HEX_SIZE/32 in X; in Y the topGroup already applies 0.8.
                faceSprite.scale.set(HEX_SIZE / 32, HEX_SIZE / 32);
                faceSprite.visible = true;

                // Outline + bevels overlay on top of texture
                let faceOutline = topGroup.getChildByName('faceOutline') as PIXI.Graphics;
                if (!faceOutline) {
                    faceOutline = new PIXI.Graphics();
                    faceOutline.name = 'faceOutline';
                    topGroup.addChild(faceOutline);
                }
                faceOutline.clear();
                tracePoly(faceOutline, BASE_POINTS);
                faceOutline.stroke({ width: isCore ? 3.0 : 2.0, color: C(isCore ? '#f43f5e' : '#06b6d4') });
                faceOutline.visible = true;
            } else {
                if (faceSprite) faceSprite.visible = false;
                const faceOutline = topGroup.getChildByName('faceOutline') as PIXI.Graphics;
                if (faceOutline) faceOutline.visible = false;

                if (!faceSolid) {
                    faceSolid = new PIXI.Graphics();
                    faceSolid.name = 'faceSolid';
                    topGroup.addChild(faceSolid);
                }
                faceSolid.clear();
                faceSolid.visible = true;

                const fillColor =
                    isBuilt ? colors.top
                    : isCore ? 'rgba(244, 63, 94, 0.22)'
                    : isCenterInitially ? 'rgba(16, 185, 129, 0.18)'
                    : isEligible ? 'rgba(34, 211, 238, 0.15)'
                    : 'rgba(255,255,255,0.01)';
                const strokeColor =
                    isBuilt ? (isCore ? '#f43f5e' : '#06b6d4')
                    : isCore ? '#f43f5e'
                    : isCenterInitially ? '#10b981'
                    : isBlueprint ? 'rgba(168, 85, 247, 0.75)'
                    : isEligible ? 'rgba(34, 211, 238, 0.85)'
                    : 'rgba(255,255,255,0.075)';
                const strokeWidth =
                    isBuilt ? (isCore ? 3.0 : 2.0)
                    : isCore ? 3.0
                    : isCenterInitially ? 3.0
                    : isBlueprint ? 1.5
                    : isEligible ? 2.5
                    : 0.8;
                const dash = (isEligible || isBlueprint) && !isCore;

                // fill (parse rgba)
                const fc = PIXI.Color.shared.setValue(fillColor);
                tracePoly(faceSolid, BASE_POINTS);
                faceSolid.fill({ color: fc.toNumber(), alpha: fc.alpha });

                const sc = PIXI.Color.shared.setValue(strokeColor);
                if (dash) {
                    // dashed [5,4] outline
                    drawDashedPoly(faceSolid, BASE_POINTS, 5, 4, strokeWidth, sc.toNumber(), sc.alpha);
                } else {
                    tracePoly(faceSolid, BASE_POINTS);
                    faceSolid.stroke({ width: strokeWidth, color: sc.toNumber(), alpha: sc.alpha });
                }

            }

            // ---- eligibility glow (now on all eligible cells across all levels) ----
            let eligGlow = topGroup.getChildByName('eligGlow') as PIXI.Graphics;
            if (isEligible) {
                if (!eligGlow) {
                    eligGlow = new PIXI.Graphics();
                    eligGlow.name = 'eligGlow';
                    topGroup.addChild(eligGlow);
                }
                eligGlow.clear();
                // Draw a shape fitted within the boundaries of the hex
                tracePoly(eligGlow, BASE_POINTS);
                eligGlow.fill({ color: 0x22d3ee, alpha: 0.15 });
                tracePoly(eligGlow, BASE_POINTS.map(p => ({ x: p.x * 0.95, y: p.y * 0.95 })));
                eligGlow.stroke({ width: 2.5, color: 0x22d3ee, alpha: 0.4 });
                eligGlow.visible = true;
            } else if (eligGlow) {
                eligGlow.visible = false;
            }

            // plus marker (+) for center / eligible empty cells
            let plus = topGroup.getChildByName('plus') as PIXI.Graphics;
            if (!isBuilt && (isCenterInitially || isEligible || isCore)) {
                if (!plus) {
                    plus = new PIXI.Graphics();
                    plus.name = 'plus';
                    topGroup.addChild(plus);
                }
                plus.clear();
                const pc = isCore ? C('#f43f5e') : (isCenterInitially ? C('#10b981') : PIXI.Color.shared.setValue('rgba(34, 211, 238, 0.75)').toNumber());
                const pa = (isCore || isCenterInitially) ? 1 : 0.75;
                plus.moveTo(-5, 0); plus.lineTo(5, 0);
                plus.moveTo(0, -5); plus.lineTo(0, 5);
                plus.stroke({ width: 1.5, color: pc, alpha: pa });
                plus.visible = true;
            } else if (plus) {
                plus.visible = false;
            }

            // bevels (top light, bottom dark) for built cells
            let bevels = topGroup.getChildByName('bevels') as PIXI.Graphics;
            if (isBuilt) {
                if (!bevels) {
                    bevels = new PIXI.Graphics();
                    bevels.name = 'bevels';
                    topGroup.addChild(bevels);
                }
                bevels.clear();
                const gp = (i: number) => BASE_POINTS[i];
                // Light bevel: points 2->3->4->5
                bevels.moveTo(gp(2).x, gp(2).y);
                bevels.lineTo(gp(3).x, gp(3).y);
                bevels.lineTo(gp(4).x, gp(4).y);
                bevels.lineTo(gp(5).x, gp(5).y);
                bevels.stroke({ width: 1.5, color: 0xffffff, alpha: 0.4 });
                // Dark bevel: points 5->0->1->2
                bevels.moveTo(gp(5).x, gp(5).y);
                bevels.lineTo(gp(0).x, gp(0).y);
                bevels.lineTo(gp(1).x, gp(1).y);
                bevels.lineTo(gp(2).x, gp(2).y);
                bevels.stroke({ width: 1.5, color: 0x000000, alpha: 0.5 });
                bevels.visible = true;
            } else if (bevels) {
                bevels.visible = false;
            }

            // ---- blueprint beacon (small dot) for ghost targets ----
            let bpBeacon = collapse.getChildByName('bpBeacon') as PIXI.Graphics;
            if (!isBuilt && isBlueprint && !isCenterInitially) {
                if (!bpBeacon) {
                    bpBeacon = new PIXI.Graphics();
                    bpBeacon.name = 'bpBeacon';
                    collapse.addChild(bpBeacon);
                }
                bpBeacon.clear();
                bpBeacon.y = yOffset;
                bpBeacon.scale.set(1, 0.8);
                const beaconColor = (THEME_PALETTE[String(blueprintLevel)]?.main) || 'rgba(168, 85, 247, 0.6)';
                const bc = PIXI.Color.shared.setValue(beaconColor);
                bpBeacon.beginPath();
                bpBeacon.circle(0, 0, 5);
                bpBeacon.fill({ color: bc.toNumber(), alpha: bc.alpha });
                bpBeacon.stroke({ width: 1.2, color: 0xffffff });
                bpBeacon.visible = true;
            } else if (bpBeacon) {
                bpBeacon.visible = false;
            }

            // ---- center beacon (initial center, empty) ----
            let centerBeacon = collapse.getChildByName('centerBeacon') as PIXI.Graphics;
            if (!isBuilt && isCenterInitially) {
                if (!centerBeacon) {
                    centerBeacon = new PIXI.Graphics();
                    centerBeacon.name = 'centerBeacon';
                    collapse.addChild(centerBeacon);
                }
                centerBeacon.clear();
                centerBeacon.y = yOffset;
                centerBeacon.scale.set(1, 0.8);
                tracePoly(centerBeacon, BASE_POINTS.map(p => ({ x: p.x * 0.94, y: p.y * 0.94 })));
                centerBeacon.stroke({ width: 2, color: C('#22d3ee') });
                centerBeacon.beginPath();
                centerBeacon.circle(0, 0, 4);
                centerBeacon.fill({ color: C('#22d3ee'), alpha: 0.8 });
                centerBeacon.visible = true;
            } else if (centerBeacon) {
                centerBeacon.visible = false;
            }

            // ---- Energy Core text & marker at 0,0 ----
            let coreMarker = collapse.getChildByName('coreMarker') as PIXI.Text;
            if (q === 0 && r === 0) {
                if (!coreMarker) {
                    coreMarker = new PIXI.Text({
                        text: '⎔ CORE',
                        style: {
                            fontSize: 10,
                            fill: '#ec4899',
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                        }
                    });
                    coreMarker.name = 'coreMarker';
                    coreMarker.anchor.set(0.5, 0.5);
                    coreMarker.zIndex = 50;
                    collapse.addChild(coreMarker);
                }
                coreMarker.y = yOffset - 4;
                coreMarker.visible = false; // Hide text overlay so the core texture is clean
                
                // Draw a pulsing pink ring on the core cell
                let corePulseRing = collapse.getChildByName('corePulseRing') as PIXI.Graphics;
                if (!corePulseRing) {
                    corePulseRing = new PIXI.Graphics();
                    corePulseRing.name = 'corePulseRing';
                    collapse.addChild(corePulseRing);
                }
                corePulseRing.clear();
                corePulseRing.y = yOffset;
                corePulseRing.scale.set(1, 0.8);
                tracePoly(corePulseRing, BASE_POINTS.map(p => ({ x: p.x * 0.85, y: p.y * 0.85 })));
                corePulseRing.stroke({ width: 1.5, color: '#ec4899', alpha: 0.8 });
                corePulseRing.visible = true;
            } else {
                if (coreMarker) coreMarker.visible = false;
                const corePulseRing = collapse.getChildByName('corePulseRing') as PIXI.Graphics;
                if (corePulseRing) corePulseRing.visible = false;
            }

            // ---- pulse outline (eligible + built, looping) ----
            let pulse = collapse.getChildByName('pulse') as PIXI.Graphics;
            if (isEligible && !isCenterInitially && isBuilt) {
                if (!pulse) {
                    pulse = new PIXI.Graphics();
                    pulse.name = 'pulse';
                    collapse.addChild(pulse);
                }
                pulse.clear();
                pulse.y = yOffset;
                pulse.scale.set(1, 0.8);
                const ring = BASE_POINTS.map(p => ({ x: p.x * 0.96, y: p.y * 0.96 }));
                tracePoly(pulse, ring);
                pulse.fill({ color: C('#22d3ee'), alpha: 0.05 });
                tracePoly(pulse, ring);
                pulse.stroke({ width: 1.5, color: canPlaceHex ? C('#22d3ee') : C('#a855f7') });
                pulse.visible = true;
            } else if (pulse) {
                pulse.visible = false;
            }
            } // end of mustRedraw

            // ---- failed click overlay (red blink) ----
            let failed = collapse.getChildByName('failed') as PIXI.Graphics;
            if (isFailedClick) {
                if (!failed) {
                    failed = new PIXI.Graphics();
                    failed.name = 'failed';
                    collapse.addChild(failed);
                }
                failed.clear();
                failed.y = yOffset;
                failed.scale.set(1, 0.8);
                tracePoly(failed, BASE_POINTS);
                failed.fill({ color: C('#ef4444'), alpha: 0.55 });
                tracePoly(failed, BASE_POINTS);
                failed.stroke({ width: 3, color: C('#ef4444') });
                failed.visible = true;
            } else if (failed) {
                failed.visible = false;
            }

            // ---- selection outline ----
            let selection = collapse.getChildByName('selection') as PIXI.Graphics;
            if (isSelected) {
                if (!selection) {
                    selection = new PIXI.Graphics();
                    selection.name = 'selection';
                    collapse.addChild(selection);
                }
                selection.clear();
                selection.y = yOffset;
                selection.scale.set(1, 0.8);
                tracePoly(selection, BASE_POINTS.map(p => ({ x: p.x * 0.95, y: p.y * 0.95 })));
                selection.stroke({ width: 2.5, color: C('#d946ef'), alpha: 0.95 });
                selection.visible = true;
            } else if (selection) {
                selection.visible = false;
            }

            // ---- ripple (isNew) ----
            let ripple = collapse.getChildByName('ripple') as PIXI.Graphics;
            if (isNew) {
                if (!ripple) {
                    ripple = new PIXI.Graphics();
                    ripple.name = 'ripple';
                    collapse.addChild(ripple);
                }
                ripple.clear();
                ripple.y = yOffset;
                ripple.beginPath();
                ripple.circle(0, 0, HEX_SIZE * 0.8);
                ripple.stroke({ width: 3, color: C('#22d3ee') });
                // base scale group applies 0.8 squash on Y; ripple anim multiplies on top
                ripple.scale.set(1, 0.8);
                ripple.alpha = 0.9;
                ripple.visible = true;
            } else if (ripple) {
                ripple.visible = false;
            }

            // ---- blueprint dashed pink contour (flat on floor) ----
            let bpDashed = collapse.getChildByName('bpDashed') as PIXI.Graphics;
            if (isBlueprint) {
                if (!bpDashed) {
                    bpDashed = new PIXI.Graphics();
                    bpDashed.name = 'bpDashed';
                    collapse.addChild(bpDashed);
                }
                bpDashed.clear();
                bpDashed.y = 0;
                bpDashed.scale.set(1, 0.8);
                drawDashedPoly(bpDashed, BASE_POINTS, 5, 4, 2.4, C('#ec4899'), 1);
                bpDashed.visible = true;
            } else if (bpDashed) {
                bpDashed.visible = false;
            }

            // ---- hover overlay (green/red) ----
            let hover = collapse.getChildByName('hover') as PIXI.Graphics;
            if (isHovered) {
                if (!hover) {
                    hover = new PIXI.Graphics();
                    hover.name = 'hover';
                    collapse.addChild(hover);
                }
                hover.clear();
                hover.y = yOffset;
                hover.scale.set(1, 0.8);
                const ok = canPlaceHex;
                tracePoly(hover, BASE_POINTS);
                hover.fill({ color: ok ? C('#10b981') : C('#ef4444'), alpha: 0.4 });
                tracePoly(hover, BASE_POINTS);
                hover.stroke({ width: 4, color: ok ? C('#10b981') : C('#ef4444') });
                hover.visible = true;
            } else if (hover) {
                hover.visible = false;
            }

            // ---- flare glow (isFlaring) ----
            let flare = collapse.getChildByName('flare') as PIXI.Graphics;
            if (isFlaring) {
                if (!flare) {
                    flare = new PIXI.Graphics();
                    flare.name = 'flare';
                    collapse.addChild(flare);
                }
                flare.clear();
                flare.y = yOffset;
                tracePoly(flare, BASE_POINTS);
                flare.fill({ color: 0xffffff });
                tracePoly(flare, BASE_POINTS);
                flare.stroke({ width: 4, color: 0xffffff });
                // base scaleY 0.8; anim adjusts overall scale + alpha
                flare.scale.set(1.05, 1.05 * 0.8);
                flare.alpha = 1.0;
                flare.visible = true;
            } else if (flare) {
                flare.visible = false;
            }

            // ----- Animation state triggers -----
            let st = animStates.current.get(key);
            if (!st) { st = { /* empty */ }; animStates.current.set(key, st); }

            const targetAlpha = (hasAnyPlaceable && !canPlaceHex) ? 0.35 : 1.0;
            (container as any).targetAlpha = targetAlpha;

            if (isNew) {
                if (st.spawnT === undefined) st.spawnT = 0;
                if (st.rippleT === undefined) st.rippleT = 0;
            } else {
                st.spawnT = undefined;
                st.rippleT = undefined;
                // ensure resting position/opacity
                container.y = px.y;
                container.alpha = targetAlpha;
            }

            if (isFlaring) {
                if (st.flareT === undefined) st.flareT = 0;
                if (st.collapseStartMs === undefined) st.collapseStartMs = performance.now();
            } else {
                st.flareT = undefined;
                st.collapseStartMs = undefined;
                st.collapseT = undefined;
            }

            if (isFailedClick) {
                if (st.failedT === undefined) st.failedT = 0;
            } else {
                st.failedT = undefined;
            }

            if (isEligible && !isCenterInitially && isBuilt) {
                if (st.pulseT === undefined) st.pulseT = 0;
            } else {
                st.pulseT = undefined;
            }

            if (isEligible) {
                if (st.eligPulseT === undefined) st.eligPulseT = Math.random() * 2;
            } else {
                st.eligPulseT = undefined;
            }
        });

        // Evict stale cells.
        for (const [id, container] of cellCache.current.entries()) {
            if (!active.has(id)) {
                board.removeChild(container);
                container.destroy({ children: true });
                cellCache.current.delete(id);
                animStates.current.delete(id);
            }
        }

        board.sortChildren();
    };

    // Rebuild whenever render-data changes.
    useEffect(() => {
        if (!isReady) return;
        rebuildCells();
         
    }, [cells, transient, contrastHighlighting, figureIndex, isReady]);

    // ---------- Ticker: advance animations + nebula drift ----------
    const updateLoop = () => {
        const app = appRef.current;
        if (!app) return;
        const dtMs = app.ticker.deltaMS;

        // Nebula drift + vignette pulse.
        const nebula = nebulaRef.current;
        if (nebula) {
            nebulaTimeRef.current += 0.0018 * (dtMs / 16.6667); // Accelerated from 0.0003 for high-speed dynamic background
            const time = nebulaTimeRef.current;
            const w = dimsRef.current.width || 1000;
            const h = dimsRef.current.height || 1000;
            const driftX = Math.sin(time * 1.4) * 65; // increased drift amplitude
            const driftY = Math.cos(time * 1.1) * 55;
            const rotation = Math.sin(time * 0.4) * 6 * (Math.PI / 180); // wider rotation angle
            nebula.x = w / 2 + driftX;
            nebula.y = h / 2 + driftY;
            nebula.rotation = rotation;
        }

        const stars = starsRef.current;
        if (stars) {
            const time = nebulaTimeRef.current;
            const w = dimsRef.current.width || 1000;
            const h = dimsRef.current.height || 1000;
            // Stars drift independently from the color clouds for a rich parallax effect
            const starDriftX = Math.cos(time * 2.8) * 80;
            const starDriftY = Math.sin(time * 2.2) * 70;
            stars.x = w / 2 + starDriftX;
            stars.y = h / 2 + starDriftY;
            // Stars rotate at a faster, continuous speed
            stars.rotation = time * 0.95;
            // Shimmering twinkle animation
            stars.alpha = 0.75 + Math.sin(time * 14.0) * 0.25;
        }

        const vignette = vignetteRef.current;
        if (vignette) {
            const time = nebulaTimeRef.current;
            const w = dimsRef.current.width || 1000;
            const h = dimsRef.current.height || 1000;
            const vigTime = time * 0.35; // smoothed down vignette movement so edges remain clean
            const driftX = Math.sin(vigTime * 1.1) * 20;
            const driftY = Math.cos(vigTime * 0.9) * 15;
            const scale = 1.0 + Math.sin(vigTime * 1.5) * 0.03;
            vignette.pivot.set(w / 2, h / 2);
            vignette.position.set(w / 2 + driftX, h / 2 + driftY);
            vignette.scale.set(scale);
            vignette.alpha = 0.95 + Math.sin(vigTime * 1.2) * 0.04;
        }

        // Per-cell animations.
        animStates.current.forEach((st, key) => {
            const container = cellCache.current.get(key);
            if (!container) return;
            const collapse = container.getChildByName('collapse') as PIXI.Container;
            const px = (container as any).px;
            if (!px) return;

            // 1. spawn (BackEaseOut, 0.5s): y targetY-60 -> targetY, opacity 0->1
            if (st.spawnT !== undefined) {
                st.spawnT = Math.min(1, st.spawnT + dtMs / 500);
                const e = backOut(st.spawnT);
                container.y = (px.y - 60) + 60 * e;
                // Konva tweens opacity with the same BackEaseOut curve (clamped 0..1).
                const targetAlpha = (container as any).targetAlpha ?? 1.0;
                container.alpha = e < 0 ? 0 : Math.min(targetAlpha, e * targetAlpha);
                if (st.spawnT >= 1) {
                    container.y = px.y;
                    container.alpha = targetAlpha;
                    st.spawnT = undefined;
                }
            }

            // 2. ripple (EaseOut, 0.65s): scale 1->1.85, opacity 0.9->0, sw 3->0.5
            const ripple = collapse?.getChildByName('ripple') as PIXI.Graphics;
            if (st.rippleT !== undefined && ripple) {
                st.rippleT = Math.min(1, st.rippleT + dtMs / 650);
                const e = easeOut(st.rippleT);
                const s = 1 + (1.85 - 1) * e;
                ripple.scale.set(s, s * 0.8);
                ripple.alpha = 0.9 + (0 - 0.9) * e;
                if (st.rippleT >= 1) {
                    ripple.alpha = 0;
                    st.rippleT = undefined;
                }
            }

            // 3. flare glow (EaseOut, 1.6s): opacity 1->0, scale 1.05->0.95
            const flare = collapse?.getChildByName('flare') as PIXI.Graphics;
            if (st.flareT !== undefined && flare) {
                st.flareT = Math.min(1, st.flareT + dtMs / 1600);
                const e = easeOut(st.flareT);
                const s = 1.05 + (0.95 - 1.05) * e;
                flare.scale.set(s, s * 0.8);
                flare.alpha = 1 + (0 - 1) * e;
                if (st.flareT >= 1) { flare.alpha = 0; st.flareT = undefined; }
            }

            // 6. collapse (BackEaseIn, 0.6s, starts 1000ms after flaring): scale 1->0.01, opacity 1->0
            if (st.collapseStartMs !== undefined && collapse) {
                const elapsed = performance.now() - st.collapseStartMs;
                if (elapsed >= 1000) {
                    if (st.collapseT === undefined) st.collapseT = 0;
                    st.collapseT = Math.min(1, st.collapseT + dtMs / 600);
                    const e = backIn(st.collapseT);
                    const s = 1 + (0.01 - 1) * e;
                    collapse.scale.set(s, s);
                    collapse.alpha = 1 + (0 - 1) * e;
                    if (st.collapseT >= 1) {
                        collapse.scale.set(0.01, 0.01);
                        collapse.alpha = 0;
                    }
                }
            }

            // 5. failed click (EaseOut, 0.5s): opacity 1->0
            const failed = collapse?.getChildByName('failed') as PIXI.Graphics;
            if (st.failedT !== undefined && failed) {
                st.failedT = Math.min(1, st.failedT + dtMs / 500);
                const e = easeOut(st.failedT);
                failed.alpha = 1 + (0 - 1) * e;
                if (st.failedT >= 1) { failed.alpha = 0; st.failedT = undefined; }
            }

            // 4. pulse outline (EaseInOut, 1.4s yoyo loop): opacity 0.5<->0.9
            const pulse = collapse?.getChildByName('pulse') as PIXI.Graphics;
            if (st.pulseT !== undefined && pulse) {
                st.pulseT = (st.pulseT + dtMs / 1400);
                // yoyo: triangle wave on [0,1] mapped through easeInOut
                const phase = st.pulseT % 2;
                const tri = phase <= 1 ? phase : 2 - phase;
                const e = easeInOut(tri);
                pulse.alpha = 0.5 + (0.9 - 0.5) * e;
            }

            // 4b. eligible glow pulse (EaseInOut, 1.5s yoyo loop): scale 0.82<->1.0, alpha 0.45<->1.0
            const topGroup = collapse?.getChildByName('topGroup') as PIXI.Container;
            const eligGlow = topGroup?.getChildByName('eligGlow') as PIXI.Graphics;
            if (st.eligPulseT !== undefined && eligGlow) {
                st.eligPulseT = (st.eligPulseT + dtMs / 1500);
                const phase = st.eligPulseT % 2;
                const tri = phase <= 1 ? phase : 2 - phase;
                const e = easeInOut(tri);
                const s = 0.82 + 0.18 * e;
                eligGlow.scale.set(s, s);
                eligGlow.alpha = 0.45 + 0.55 * e;
            }
        });
    };

    const latestUpdateLoop = useRef(updateLoop);
    latestUpdateLoop.current = updateLoop;
    const tickerCallbackRef = useRef<() => void>(() => { latestUpdateLoop.current(); });

    // ---------- Pointer hit-test (unproject, rotation = 0) ----------
    const hitTest = (clientX: number, clientY: number): { q: number; r: number } | null => {
        const app = appRef.current;
        if (!app || !app.renderer || !app.canvas) return null;
        const rect = app.canvas.getBoundingClientRect();
        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;
        const cam = cameraRef.current;
        const rx = (canvasX - cam.x) / cam.scale;
        const ry = (canvasY - cam.y) / cam.scale;

        // rotation = 0: rawX = rx, rawY = ry / 0.8
        const rawX = rx;
        const rawY = ry / 0.8;

        const fracR = rawY / (1.5 * HEX_SIZE);
        const fracQ = rawX / (Math.sqrt(3) * HEX_SIZE) - fracR / 2;
        const fracS = -fracQ - fracR;
        let q = Math.round(fracQ);
        let r = Math.round(fracR);
        const s = Math.round(fracS);
        const qDiff = Math.abs(q - fracQ);
        const rDiff = Math.abs(r - fracR);
        const sDiff = Math.abs(s - fracS);
        if (qDiff > rDiff && qDiff > sDiff) q = -r - s;
        else if (rDiff > sDiff) r = -q - s;

        // Build lookup of valid cells (honoring height offset).
        const list = cellsRef.current;
        const cellMap = new Map<string, StoryCellData>();
        list.forEach(c => cellMap.set(c.key, c));

        let bestKey: string | null = null;
        let bestDist = Infinity;
        for (let dq = -4; dq <= 4; dq++) {
            for (let dr = Math.max(-4, -4 - dq); dr <= Math.min(4, 4 - dq); dr++) {
                const cq = q + dq;
                const cr = r + dr;
                const ckey = getHexKey(cq, cr);
                const cand = cellMap.get(ckey);
                if (!cand) continue;
                if (cand.lvl === -999) continue;
                const center = hexToPixel(cq, cr);
                const isBuilt = cand.lvl !== undefined && cand.lvl >= 0;
                const isBuiltOrBlueprint = isBuilt || cand.isBlueprint;
                const activeLvl = cand.lvl !== undefined ? cand.lvl : (cand.isBlueprint ? cand.blueprintLevel : undefined);
                const offsetY = isBuiltOrBlueprint && activeLvl !== undefined ? getHeightOffset(activeLvl) : 0;
                const py = center.y + offsetY;
                const dist = Math.hypot(center.x - rx, py - ry);
                if (dist < bestDist && dist < HEX_SIZE * 1.5) {
                    bestDist = dist;
                    bestKey = ckey;
                }
            }
        }
        if (bestKey) {
            const [bq, br] = bestKey.split(',').map(Number);
            return { q: bq, r: br };
        }
        return null;
    };

    // ---------- Camera input (wheel / pinch / drag) ----------
    const isDragging = useRef(false);
    const dragMoved = useRef(false);
    const dragStart = useRef<{ x: number; y: number; camX: number; camY: number }>({ x: 0, y: 0, camX: 0, camY: 0 });
    const pinchStart = useRef<{ dist: number; scale: number; pointTo: { x: number; y: number } } | null>(null);
    const lastTapRef = useRef<{ t: number; q: number; r: number }>({ t: 0, q: NaN, r: NaN });

    const clampPan = (pos: { x: number; y: number }, scale: number) => {
        const w = dimsRef.current.width;
        const h = dimsRef.current.height;
        const BOUND_X = w * 2.2 * Math.max(1, scale);
        const BOUND_Y = h * 2.2 * Math.max(1, scale);
        const centerX = w / 2;
        const centerY = h / 2 - (w < 768 ? 20 : 50);
        return {
            x: Math.max(Math.min(pos.x, centerX + BOUND_X), centerX - BOUND_X),
            y: Math.max(Math.min(pos.y, centerY + BOUND_Y), centerY - BOUND_Y),
        };
    };

    const applyCamera = (cam: { x: number; y: number; scale: number }) => {
        cameraRef.current = cam;
        lastAppliedLocalCamera.current = cam;
        const world = worldRef.current;
        if (world) {
            world.x = cam.x;
            world.y = cam.y;
            world.scale.set(cam.scale, cam.scale);
        }
        onCameraChangeRef.current(cam);
    };

    const handleWheel = (e: React.WheelEvent) => {
        e.preventDefault();
        const app = appRef.current;
        if (!app || !app.renderer || !app.canvas) return;
        const rect = app.canvas.getBoundingClientRect();
        const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const cam = cameraRef.current;
        const scaleBy = 1.05;
        const oldScale = cam.scale;
        const mousePointTo = {
            x: (pointer.x - cam.x) / oldScale,
            y: (pointer.y - cam.y) / oldScale,
        };
        const newScale = e.deltaY < 0 ? oldScale / scaleBy : oldScale * scaleBy;
        const clampedScale = Math.max(0.45, Math.min(2.0, newScale));
        const newPos = {
            x: pointer.x - mousePointTo.x * clampedScale,
            y: pointer.y - mousePointTo.y * clampedScale,
        };
        applyCamera({ x: newPos.x, y: newPos.y, scale: clampedScale });
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        if (pinchStart.current) return;
        const isMultiTouch = e.pointerType === 'touch' && (e.nativeEvent as any).touches && (e.nativeEvent as any).touches.length > 1;
        if (isMultiTouch) {
            isDragging.current = false;
            return;
        }
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        (e.target as Element).setPointerCapture?.(e.pointerId);
        isDragging.current = true;
        dragMoved.current = false;
        const cam = cameraRef.current;
        dragStart.current = { x: e.clientX, y: e.clientY, camX: cam.x, camY: cam.y };
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        // hover (mouse only)
        if (e.pointerType === 'mouse' && !isDragging.current) {
            const hit = hitTest(e.clientX, e.clientY);
            const key = hit ? getHexKey(hit.q, hit.r) : null;
            if (key !== transientRef.current.hoveredKey) onHoverRef.current(key);
        }
        if (!isDragging.current || pinchStart.current) return;
        const isMultiTouch = e.pointerType === 'touch' && (e.nativeEvent as any).touches && (e.nativeEvent as any).touches.length > 1;
        if (isMultiTouch) {
            isDragging.current = false;
            return;
        }
        const ds = dragStart.current;
        const dx = e.clientX - ds.x;
        const dy = e.clientY - ds.y;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved.current = true;
        const cam = cameraRef.current;
        const newPos = clampPan({ x: ds.camX + dx, y: ds.camY + dy }, cam.scale);
        applyCamera({ x: newPos.x, y: newPos.y, scale: cam.scale });
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        const wasDrag = dragMoved.current;
        isDragging.current = false;
        dragMoved.current = false;
        if (wasDrag) return;
        // treat as click / tap
        const hit = hitTest(e.clientX, e.clientY);
        if (!hit) {
            // Tapped empty space: matches the old Stage onClick/onTap behavior.
            onBackgroundClickRef.current?.();
            return;
        }
        const now = performance.now();
        const last = lastTapRef.current;
        if (now - last.t < 300 && last.q === hit.q && last.r === hit.r) {
            onCellDblClickRef.current(hit.q, hit.r);
            lastTapRef.current = { t: 0, q: NaN, r: NaN };
        } else {
            onCellClickRef.current(hit.q, hit.r);
            lastTapRef.current = { t: now, q: hit.q, r: hit.r };
        }
    };

    const handlePointerLeave = () => {
        if (transientRef.current.hoveredKey !== null) onHoverRef.current(null);
    };

    // ---- Touch pinch (two-finger) ----
    const handleTouchStart = (e: React.TouchEvent) => {
        if (e.touches.length === 2) {
            isDragging.current = false;
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const cam = cameraRef.current;
            const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
            pinchStart.current = {
                dist,
                scale: cam.scale,
                pointTo: { x: (center.x - cam.x) / cam.scale, y: (center.y - cam.y) / cam.scale },
            };
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (e.touches.length === 2 && pinchStart.current) {
            e.preventDefault();
            dragMoved.current = true;
            const t1 = e.touches[0];
            const t2 = e.touches[1];
            const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
            const ps = pinchStart.current;
            if (ps.dist > 0) {
                const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
                const scaleFactor = dist / ps.dist;
                const newScale = Math.max(0.45, Math.min(2.0, ps.scale * scaleFactor));
                const newPos = {
                    x: center.x - ps.pointTo.x * newScale,
                    y: center.y - ps.pointTo.y * newScale,
                };
                applyCamera({ x: newPos.x, y: newPos.y, scale: newScale });
            }
        }
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (e.touches.length < 2) {
            pinchStart.current = null;
        }
        isDragging.current = false; // Prevent drag jumps when fingers are lifted
    };

    return (
        <div
            ref={containerRef}
            className="absolute inset-0"
            style={{ width: '100%', height: '100%', touchAction: 'none' }}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        />
    );
};

// Compute a depth z-index from axial coords (matches gridPoints sort: y*10 + x*0.1).
function py(q: number, r: number): number {
    const p = hexToPixel(q, r);
    return p.y * 10 + p.x * 0.1;
}

// Draw a dashed polygon outline.
function drawDashedPoly(
    g: PIXI.Graphics,
    points: { x: number; y: number }[],
    dashLen: number,
    gapLen: number,
    width: number,
    color: number,
    alpha: number
) {
    const pts = [...points, points[0]];
    for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i];
        const b = pts[i + 1];
        const segLen = Math.hypot(b.x - a.x, b.y - a.y);
        const dirX = (b.x - a.x) / segLen;
        const dirY = (b.y - a.y) / segLen;
        let pos = 0;
        while (pos < segLen) {
            const start = pos;
            const end = Math.min(pos + dashLen, segLen);
            g.moveTo(a.x + dirX * start, a.y + dirY * start);
            g.lineTo(a.x + dirX * end, a.y + dirY * end);
            pos += dashLen + gapLen;
        }
    }
    g.stroke({ width, color, alpha });
}

export default StoryBoardPixi;
