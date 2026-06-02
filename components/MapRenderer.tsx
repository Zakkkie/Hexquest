
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Layer, Group, Line, Circle, Text } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { getHexKey, getNeighbors } from '../services/hexUtils.ts';
import { HexNode, HexNodeTheme } from './HexNode.tsx';
import Unit from './Unit.tsx';
import { EntityType, EntityState, FloatingText, Hex, Entity } from '../types.ts';
import { HEX_SIZE } from '../rules/config.ts';
import { getStatusModifiers } from '../services/hexUtils.ts';
import { safifyCoord } from '../utils/safeCoordinates.ts';

// Web Worker Import (Vite syntax)
// @ts-ignore
import VisualWorker from '../services/visualWorker.ts?worker';

const areGridsEqual = (a: Record<string, Hex> | null, b: Record<string, Hex> | null): boolean => {
    if (a === b) return true;
    if (!a || !b) return false;
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (let i = 0; i < keysA.length; i++) {
        const key = keysA[i];
        const hexA = a[key];
        const hexB = b[key];
        if (!hexB) return false;
        if (
            hexA.currentLevel !== hexB.currentLevel ||
            hexA.maxLevel !== hexB.maxLevel ||
            hexA.revealed !== hexB.revealed ||
            hexA.durability !== hexB.durability ||
            hexA.biome !== hexB.biome ||
            hexA.structureType !== hexB.structureType ||
            hexA.isPassable !== hexB.isPassable ||
            hexA.ownerId !== hexB.ownerId ||
            hexA.progress !== hexB.progress
        ) {
            return false;
        }
    }
    return true;
};

// Optimized Tutorial Status Check
const getTutorialData = (grid: Record<string, Hex>, player: Entity, levelId?: string) => {
    if (!levelId) return null;
    
    const data: any = { levelId };
    
    if (levelId === '1.3') {
        data.center = grid[getHexKey(0,0)];
        if (data.center) {
            data.centerNeighbors = getNeighbors(0,0).map(n => getHexKey(n.q, n.r));
            data.supportCount = data.centerNeighbors.filter((key: string) => {
                const h = grid[key];
                return h && h.maxLevel >= 1 && h.structureType !== 'VOID';
            }).length;
        }
    } else if (levelId === '1.4') {
        data.center = grid[getHexKey(0,0)];
        data.isPlayerOnCenter = player.q === 0 && player.r === 0;
    }
    
    return data;
};

const getHexTutorialStatus = (hex: Hex, player: Entity, _grid: Record<string, Hex>, tutorialData: any, activeLevelConfig?: any) => {
    // If hex is not revealed, don't show tutorial markers/arrows to avoid spoiling monument location
    if (!hex.revealed) return { isTutorial: false, isArrow: false, tutColor: 'emerald' };

    if (!tutorialData && !activeLevelConfig?.objectiveHexes) return { isTutorial: false, isArrow: false, tutColor: 'emerald' };
    
    const levelId = tutorialData?.levelId || activeLevelConfig?.id;
    const isOccupiedByPlayer = hex.q === player.q && hex.r === player.r;
    let isTutorial = false;
    let isArrow = false;
    let tutColor: any = 'emerald';

    // Check objectiveHexes for arrows
    if (activeLevelConfig?.objectiveHexes) {
        const obj = activeLevelConfig.objectiveHexes.find((o: any) => o.q === hex.q && o.r === hex.r);
        if (obj) {
            let satisfied = false;
            const lid = activeLevelConfig.id;
            if (lid === '1.1') {
                const wavePath = [
                    { q: 0, r: 0 },
                    { q: 1, r: -1 },
                    { q: 2, r: -1 },
                    { q: 2, r: 0 },
                    { q: 1, r: 1 },
                    { q: 0, r: 2 },
                    { q: -1, r: 2 },
                    { q: -2, r: 2 },
                    { q: -3, r: 2 },
                    { q: -3, r: 1 },
                    { q: -2, r: 0 }
                ];
                const playerIdx = wavePath.findIndex(p => p.q === player.q && p.r === player.r);
                const hexIdx = wavePath.findIndex(p => p.q === hex.q && p.r === hex.r);
                if (playerIdx !== -1 && hexIdx !== -1) {
                    satisfied = playerIdx >= hexIdx;
                } else {
                    satisfied = hex.q === player.q && hex.r === player.r;
                }
            } else if (lid === '1.6') {
                satisfied = (player.coins ?? 0) >= 100;
            } else if (lid === '1.7') {
                satisfied = player.q === 3 && player.r === -1;
            } else if (lid === '1.8') {
                satisfied = hex.currentLevel <= obj.targetLevel;
            } else if (lid === '1.9') {
                satisfied = hex.structureType !== 'VOID';
            } else if (lid === '1.10') {
                satisfied = hex.currentLevel >= obj.targetLevel;
            } else {
                satisfied = hex.currentLevel === obj.targetLevel;
            }
            if (!satisfied) {
                return { isTutorial: true, isArrow: true, tutColor: obj.color || 'amber' };
            }
        }
    }

    if (!tutorialData) return { isTutorial, isArrow, tutColor };

    if (levelId === '1.0') {
         if (player.q === 0 && player.r === 0) {
             if (hex.q === 1 && hex.r === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'amber';
             }
         } else if (player.q === 1 && player.r === 0) {
             if (hex.q === 1 && hex.r === 0 && hex.currentLevel === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'amber';
             } else if (hex.currentLevel >= 1 && hex.q === 2 && hex.r === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'amber';
             }
         } else if (player.q === 3 && player.r === 0) {
             if (hex.q === 3 && hex.r === 0 && hex.currentLevel === 2) {
                 isTutorial = true; isArrow = true; tutColor = 'amber';
             } else if (hex.currentLevel <= 1 && hex.q === 4 && hex.r === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'amber';
             }
         } else if (player.q === 4 && player.r === 0) {
             if (hex.q === 5 && hex.r === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'emerald';
             }
         }
    } else if (levelId === '1.1') {
        // Fallback or specific logic for 1.1 if needed, but objectiveHexes should cover it now
    } else if (levelId === '1.2' || levelId === '3.1') {
        if (hex.structureType === 'CAPITAL') {
            isTutorial = true; isArrow = true; tutColor = 'emerald';
        }
    } else if (levelId === '1.3') {
        const { center, centerNeighbors, supportCount } = tutorialData;
        if (center) {
            if (supportCount >= 2 && center.maxLevel < 2) {
                if (hex.q === 0 && hex.r === 0) {
                    isTutorial = true; isArrow = true; tutColor = 'amber';
                }
            } else if (center.maxLevel < 2) {
                const isNeighbor = centerNeighbors.includes(hex.id);
                if (isNeighbor && hex.maxLevel < 1 && !isOccupiedByPlayer) {
                    isTutorial = true; isArrow = true; tutColor = 'cyan';
                }
            }
        }
    } else if (levelId === '1.4') {
        const { center, isPlayerOnCenter } = tutorialData;
        if (center && center.maxLevel < 3 && !isPlayerOnCenter) {
             if (hex.q === 0 && hex.r === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'amber';
             }
        } else if (isPlayerOnCenter && center && center.maxLevel < 3) {
            if (player.storage >= 1) {
                if (hex.q === 0 && hex.r === 0) {
                    isTutorial = true; isArrow = true; tutColor = 'amber';
                }
            } else {
                if (hex.maxLevel >= 2 && hex.id !== getHexKey(0,0)) {
                    isTutorial = true; isArrow = true; tutColor = 'red';
                }
            }
        }
    } else if (levelId === '1.6') {
        if (hex.q === 0 && hex.r === 0 && !isOccupiedByPlayer) {
             isTutorial = true; isArrow = true; tutColor = 'amber';
        }
    }
    return { isTutorial, isArrow, tutColor };
};

const FLOATING_EFFECT_RISE_DISTANCE = 80;
const FLOATING_EFFECT_BASE_Y_OFFSET = 20;
const FLOATING_EFFECT_VERTICAL_SPACING = 24;
const FLOATING_EFFECT_TEXT_WIDTH = 100;
const FLOATING_EFFECT_TEXT_X_OFFSET = -50;
const FLOATING_EFFECT_FONT_SIZE = 16;
const FLOATING_EFFECT_ENTRANCE_DURATION = 0.2;
const FLOATING_EFFECT_MIN_EXIT_DURATION = 0.1;

const DUST_FADE_DURATION_MIN = 0.4;
const DUST_FADE_DURATION_VARIANCE = 0.2;
const DUST_LIFETIME_MS = 600;
const DUST_DISPERSION_MIN = 10;
const DUST_DISPERSION_VARIANCE = 10;

// BASE PATH FOR SELECTION GLOW
const DEG_TO_RAD = Math.PI / 180;
const BASE_POINTS = [];
for (let i = 0; i < 6; i++) {
    const angle = (60 * i + 30) * DEG_TO_RAD;
    BASE_POINTS.push({ x: Math.cos(angle) * HEX_SIZE, y: Math.sin(angle) * HEX_SIZE });
}
let BASE_PATH_D = `M ${BASE_POINTS[0].x} ${BASE_POINTS[0].y}`;
for (let i = 1; i < 6; i++) BASE_PATH_D += ` L ${BASE_POINTS[i].x} ${BASE_POINTS[i].y}`;
BASE_PATH_D += " Z";


// THEME CONFIGURATION
export const THEME_PALETTE: Record<string, HexNodeTheme> = {
    '0': { main: '#1e293b', light: '#334155', dark: '#0f172a', stroke: '#475569' }, 
    '1': { main: '#0f172a', light: '#1e293b', dark: '#020617', stroke: '#0c4a6e' }, 
    '2': { main: '#172554', light: '#1e3a8a', dark: '#0f172a', stroke: '#0284c7' }, 
    '3': { main: '#1e3a8a', light: '#2563eb', dark: '#172554', stroke: '#0ea5e9' }, 
    '4': { main: '#312e81', light: '#4338ca', dark: '#1e1b4b', stroke: '#6366f1' }, 
    '5': { main: '#4c1d95', light: '#5b21b6', dark: '#2e1065', stroke: '#8b5cf6' }, 
    '6': { main: '#581c87', light: '#6b21a8', dark: '#3b0764', stroke: '#a855f7' }, 
    '7': { main: '#701a75', light: '#86198f', dark: '#4a044e', stroke: '#d946ef' }, 
    '8': { main: '#451a03', light: '#7f1d1d', dark: '#271a0c', stroke: '#d97706' }, 
    '9': { main: '#713f12', light: '#a16207', dark: '#422006', stroke: '#f59e0b' }, 
    '10': { main: '#854d0e', light: '#ca8a04', dark: '#713f12', stroke: '#fcd34d' }, 
    '-1': { main: '#292524', light: '#44403c', dark: '#1c1917', stroke: '#57534e' }, 
    '-2': { main: '#1c1917', light: '#292524', dark: '#0c0a09', stroke: '#44403c' }, 
    '-3': { main: '#0c0a09', light: '#1c1917', dark: '#000000', stroke: '#292524' }, 
    '-4': { main: '#450a0a', light: '#7f1d1d', dark: '#2a0505', stroke: '#991b1b' }, 
    '-5': { main: '#7f1d1d', light: '#991b1b', dark: '#450a0a', stroke: '#dc2626' }, 
    '-6': { main: '#991b1b', light: '#b91c1c', dark: '#7f1d1d', stroke: '#ef4444' }, 
    '-7': { main: '#c2410c', light: '#ea580c', dark: '#7c2d12', stroke: '#f97316' }, 
    '-8': { main: '#fff7ed', light: '#ffedd5', dark: '#c2410c', stroke: '#ffffff' },
};

export const getTheme = (level: number): HexNodeTheme => {
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

interface VisualParticle { id: string; x: number; y: number; color: string; }

const DustCloud: React.FC<VisualParticle & { onComplete: (id: string) => void }> = React.memo(({ id, x, y, color, onComplete }) => {
    const groupRef = useRef<Konva.Group>(null);
    const tweensRef = useRef<Konva.Tween[]>([]);

    useEffect(() => {
        const node = groupRef.current;
        if (!node) return;
        
        const puffs = node.find('Circle');
        tweensRef.current = [];

        puffs.forEach((puff) => {
             const angle = Math.random() * Math.PI * 2;
             const dist = DUST_DISPERSION_MIN + Math.random() * DUST_DISPERSION_VARIANCE;
             
             const tween = new Konva.Tween({
                 node: puff,
                 x: Math.cos(angle) * dist,
                 y: Math.sin(angle) * dist * 0.6,
                 scaleX: 0, scaleY: 0, opacity: 0,
                 duration: DUST_FADE_DURATION_MIN + Math.random() * DUST_FADE_DURATION_VARIANCE,
                 easing: Konva.Easings.EaseOut,
             });
             
             tween.play();
             tweensRef.current.push(tween);
        });
        
        const t = setTimeout(() => onComplete(id), DUST_LIFETIME_MS);
        
        return () => {
            clearTimeout(t);
            tweensRef.current.forEach(t => t.destroy());
        };
    }, [id, onComplete]);

    return (
        <Group ref={groupRef} x={x} y={y} listening={false} perfectDrawEnabled={false}>
            {[0, 1, 2, 3].map(i => <Circle key={i} radius={3 + Math.random()*3} fill={color} opacity={0.4} perfectDrawEnabled={false} />)}
        </Group>
    );
});

const simpleHexToPixel = (q: number, r: number, rotation: number) => {
    const rawX = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const rawY = HEX_SIZE * (1.5 * r);
    const angleRad = rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    
    const x = rawX * cos - rawY * sin;
    const y = (rawX * sin + rawY * cos) * 0.8;
    return safifyCoord(x, y);
};

const FloatingEffect: React.FC<{ effect: FloatingText; rotation: number; stackIndex: number }> = React.memo(({ effect, rotation, stackIndex }) => {
    const animRef = useRef<Konva.Group>(null);
    const tweensRef = useRef<Konva.Tween[]>([]);
    const { x, y } = simpleHexToPixel(effect.q, effect.r, rotation);
    
    // Offset each concurrent effect vertically to prevent overlap
    const verticalOffset = stackIndex * FLOATING_EFFECT_VERTICAL_SPACING; 

    useEffect(() => {
        const node = animRef.current;
        if (!node) return;
        
        node.y(0); 
        node.opacity(0); 
        node.scale({ x: 0.5, y: 0.5 });
        
        tweensRef.current = [];

        // 1. Entrance: Pop In
        const fadeIn = new Konva.Tween({
            node: node,
            opacity: 1,
            scaleX: 1,
            scaleY: 1,
            duration: FLOATING_EFFECT_ENTRANCE_DURATION,
            easing: Konva.Easings.EaseOut,
            onFinish: () => {
                // 2. Exit: Float Up and Fade Out
                const floatOut = new Konva.Tween({
                    node: node,
                    y: -FLOATING_EFFECT_RISE_DISTANCE, // Move up relative to starting point
                    opacity: 0,
                    scaleX: 1.2,
                    scaleY: 1.2,
                    duration: Math.max(FLOATING_EFFECT_MIN_EXIT_DURATION, (effect.lifetime / 1000) - FLOATING_EFFECT_ENTRANCE_DURATION), 
                    easing: Konva.Easings.EaseOut,
                });
                floatOut.play();
                tweensRef.current.push(floatOut);
            }
        });
        
        fadeIn.play();
        tweensRef.current.push(fadeIn);

        return () => {
            tweensRef.current.forEach(t => t.destroy());
        };
    }, [effect.lifetime]); 

    return (
        // Apply starting vertical offset here
        <Group x={x} y={y - FLOATING_EFFECT_BASE_Y_OFFSET - verticalOffset} listening={false} perfectDrawEnabled={false}>
            <Group ref={animRef} perfectDrawEnabled={false}>
                <Text text={effect.text} fontSize={FLOATING_EFFECT_FONT_SIZE} fontStyle="bold" fill={effect.color} x={FLOATING_EFFECT_TEXT_X_OFFSET} width={FLOATING_EFFECT_TEXT_WIDTH} align="center" perfectDrawEnabled={false} />
            </Group>
        </Group>
    );
});

const FULL_RENDER_MODE = { 
    detailLevel: 'full', 
    showTexture: true, 
    showGlow: true, 
    showDetails: true 
};

const LITE_RENDER_MODE = { 
    detailLevel: 'simple', 
    showTexture: false, 
    showGlow: false, 
    showDetails: false 
};

interface MapRendererProps {
    rotation: number;
    onHexClick: (q: number, r: number) => void;
    onHover: (id: string | null) => void;
    hoveredHexId: string | null;
    camera?: { x: number; y: number; scale: number; rotation: number };
    dimensions?: { width: number; height: number };
}

const MapRenderer: React.FC<MapRendererProps> = ({ rotation, onHexClick, onHover, hoveredHexId, camera, dimensions }) => {
    const grid = useGameStore(state => state.session?.grid);
    const player = useGameStore(state => state.session?.player);
    const bots = useGameStore(state => state.session?.bots);
    const effects = useGameStore(state => state.session?.effects);
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const pendingConfirmation = useGameStore(state => state.pendingConfirmation);
    const isPlayerGrowing = useGameStore(state => state.session?.isPlayerGrowing);
    const campaignUpgrades = useGameStore(state => state.campaignUpgrades);
    const playerGrowthIntent = useGameStore(state => state.session?.playerGrowthIntent);
    const evacuationActive = useGameStore(state => state.session?.evacuationActive);
    const playerQ = player?.q ?? 0;
    const playerR = player?.r ?? 0;
    const playerStorage = player?.storage ?? 0;
    const isLiteMode = useGameStore(state => state.isLiteMode);
    const selectedHexId = useMemo(() => 
        (playerQ !== undefined && playerR !== undefined) ? getHexKey(playerQ, playerR) : null
    , [playerQ, playerR]);

    const [particles, setParticles] = useState<VisualParticle[]>([]);
    
    // Web Worker for calculating neighbor levels and render list
    const [workerData, setWorkerData] = useState<{
        renderItems: any[];
    }>({ renderItems: [] });
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // Initialize worker
        const worker = new VisualWorker();
        workerRef.current = worker;
        
        worker.onmessage = (e: MessageEvent) => {
            const { renderItems } = e.data;
            if (renderItems) {
                setWorkerData({
                    renderItems
                });
            }
        };

        return () => {
            worker.terminate();
        };
    }, []);

    // Update worker when grid or view changes
    const pendingTarget = pendingConfirmation?.data.path[pendingConfirmation.data.path.length - 1];
    const pendingKey = pendingTarget ? getHexKey(pendingTarget.q, pendingTarget.r) : null;

    const lastPostedRef = useRef<{
        grid: any;
        rotation: number;
        player: any;
        bots: any;
        pendingKey: any;
        selectedHexId: any;
        camera: any;
        dimensions: any;
    }>({
        grid: null,
        rotation: -999,
        player: null,
        bots: null,
        pendingKey: null,
        selectedHexId: null,
        camera: null,
        dimensions: null
    });

    // Unified Worker Update Strategy: Consolidates both grid & view to minimize serializing overhead and prevent multiple cloning frames.
    useEffect(() => {
        if (grid && player && workerRef.current) {
            const last = lastPostedRef.current;
            
            // Check if anything significant changed to avoid redundant postMessage calls
            const gridChanged = !areGridsEqual(grid, last.grid);
            
            // Spatial, rank, and visual state verification, ignoring coins/moves/storage to prevent 100ms interval spam
            const playerChanged = !last.player || 
                player.q !== last.player.q || 
                player.r !== last.player.r || 
                player.playerLevel !== last.player.playerLevel || 
                player.state !== last.player.state;

            let botsChanged = !last.bots || !bots || bots.length !== last.bots.length;
            if (!botsChanged && bots && last.bots) {
                for (let i = 0; i < bots.length; i++) {
                    const b = bots[i];
                    const lb = last.bots[i];
                    if (!lb || 
                        b.q !== lb.q || 
                        b.r !== lb.r || 
                        b.state !== lb.state || 
                        b.playerLevel !== lb.playerLevel
                    ) {
                        botsChanged = true;
                        break;
                    }
                }
            }

            const pendingKeyChanged = pendingKey !== last.pendingKey;
            const selectedHexIdChanged = selectedHexId !== last.selectedHexId;
            
            // Throttling/Debouncing rotation changes: Only update depth sorting if changed by > 4 degrees
            const rotationChanged = Math.abs(rotation - last.rotation) > 4;

            const cameraChanged = !last.camera || !camera || 
                Math.abs(camera.x - last.camera.x) > 10 || 
                Math.abs(camera.y - last.camera.y) > 10 || 
                camera.scale !== last.camera.scale;

            const dimensionsChanged = !last.dimensions || !dimensions || 
                dimensions.width !== last.dimensions.width || 
                dimensions.height !== last.dimensions.height;

            if (gridChanged || playerChanged || botsChanged || pendingKeyChanged || selectedHexIdChanged || rotationChanged || cameraChanged || dimensionsChanged) {
                lastPostedRef.current = { grid, rotation, player, bots, pendingKey, selectedHexId, camera, dimensions };
                workerRef.current.postMessage({ 
                    grid: gridChanged ? grid : undefined,
                    rotation, 
                    player, 
                    bots,
                    pendingKey,
                    selectedHexId,
                    camera,
                    dimensions,
                    isCampaign: !!activeLevelConfig
                });
            }
        }
    }, [grid, rotation, player, bots, pendingKey, selectedHexId, activeLevelConfig, camera, dimensions]);

    // Explicitly memoize onHexClick to ensure stability for renderList
    const memoizedOnHexClick = useCallback((q: number, r: number) => {
        onHexClick(q, r);
    }, [onHexClick]);

    const removeParticle = useCallback((id: string) => {
        setParticles(p => p.filter(x => x.id !== id));
    }, []);

    // Explicitly memoize spawnDust
    const spawnDust = useCallback((x: number, y: number, color: string) => {
        if (useGameStore.getState().isLiteMode) return;
        const id = `dust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setParticles(p => [...p, { id, x, y, color }]);
    }, []);

    const stackedEffects = useMemo(() => {
        if (!effects) return [];
        // Group by coordinate AND active time window to stack properly
        // Sort by time first to ensure stability
        const sorted = [...effects].sort((a, b) => a.startTime - b.startTime);
        const counts: Record<string, number> = {};
        
        return sorted.map(eff => {
            const key = `${eff.q},${eff.r}`;
            const idx = counts[key] || 0;
            counts[key] = idx + 1;
            return { ...eff, stackIndex: idx };
        });
    }, [effects]);

    // Cache trigonometric calculations to optimize render loop
    const projectionCache = useMemo(() => {
        const angleRad = rotation * (Math.PI / 180);
        return {
            cos: Math.cos(angleRad),
            sin: Math.sin(angleRad)
        };
    }, [rotation]);

    const connections = useMemo(() => {
        if (!grid || !player || isPlayerGrowing || player.state === EntityState.MOVING) return [];

        const { cos, sin } = projectionCache;
        const SQRT3 = Math.sqrt(3);
        const SQRT3_2 = SQRT3 / 2;
        const ONE_POINT_FIVE = 1.5;

        const rawPX = HEX_SIZE * (SQRT3 * player.q + SQRT3_2 * player.r);
        const rawPY = HEX_SIZE * (ONE_POINT_FIVE * player.r);
        const ppx = rawPX * cos - rawPY * sin;
        const ppy = (rawPX * sin + rawPY * cos) * 0.8;

        const pHex = grid[getHexKey(player.q, player.r)];
        const startH = pHex ? (10 + pHex.currentLevel * 10) : 10;
        const neighbors = getNeighbors(player.q, player.r);
        const conns: any[] = [];

        for (const n of neighbors) {
            const nHex = grid[getHexKey(n.q, n.r)];
            const isReallyVoid = (nHex?.structureType as string) === 'VOID';
            const isBlocked = nHex?.isPassable === false;
            
            if (isReallyVoid || isBlocked) continue;

            const rawNX = HEX_SIZE * (SQRT3 * n.q + SQRT3_2 * n.r);
            const rawNY = HEX_SIZE * (ONE_POINT_FIVE * n.r);
            const npx = rawNX * cos - rawNY * sin;
            const npy = (rawNX * sin + rawNY * cos) * 0.8;

            const endH = nHex ? (10 + nHex.currentLevel * 10) : 10;
            
            const currentLevel = pHex ? pHex.currentLevel : 0;
            const nextLevel = nHex ? nHex.currentLevel : 0;
            if (Math.abs(currentLevel - nextLevel) > 1) continue;

            const level = nHex ? nHex.currentLevel : 0;
            const cost = level > 1 ? level : 1;
            const { exchangeRate } = getStatusModifiers(player, { campaignUpgrades });
            const canAfford = player.moves >= cost || player.coins >= (cost * exchangeRate);

            conns.push({
                points: [ppx, ppy - startH, npx, npy - endH],
                stroke: canAfford ? '#34d399' : '#ef4444',
                dash: [5, 5],
                opacity: (nHex && nHex.currentLevel > player.playerLevel) ? 0.2 : 0.6
            });
        }
        return conns;
    }, [grid, player, isPlayerGrowing, projectionCache, campaignUpgrades]);

    const tutorialData = useMemo(() => {
        if (!grid || !player) return null;
        return getTutorialData(grid, player, activeLevelConfig?.id);
    }, [grid, playerQ, playerR, activeLevelConfig?.id]);

    const renderList = useMemo(() => {
        if (!grid || !player || !workerData.renderItems.length) return { items: [] };

        const tempPlayer = { 
            q: playerQ, 
            r: playerR, 
            storage: playerStorage,
            coins: player.coins ?? 0,
            playerLevel: player.playerLevel ?? 0
        } as any;

        const items = workerData.renderItems.map(item => {
            if (item.type === 'HEX') {
                const hex = grid[item.id];
                if (!hex) return null;

                const { isTutorial, isArrow, tutColor } = getHexTutorialStatus(hex, tempPlayer, grid, tutorialData, activeLevelConfig);
                const theme = getTheme(item.props.isRevealed ? hex.maxLevel : 0);

                const isRevealed = !!item.props.isRevealed;
                
                return {
                    ...item,
                    props: {
                        ...item.props,
                        theme,
                        drawVoidWalls: isRevealed,
                        pendingCost: item.props.isPending && pendingConfirmation ? pendingConfirmation.data.costCoins : null,
                        isTutorialTarget: isTutorial,
                        isTargetArrow: isArrow,
                        tutorialColor: tutColor,
                        renderMode: isLiteMode ? LITE_RENDER_MODE : FULL_RENDER_MODE,
                        isExcavated: hex.isExcavated,
                        isPlayerBuilt: hex.isPlayerBuilt,
                    }
                };
            } else {
                // UNIT
                return {
                    ...item,
                    props: {
                        ...item.props,
                        type: item.props.isPlayer ? EntityType.PLAYER : EntityType.BOT,
                        onMoveComplete: spawnDust
                    }
                };
            }
        }).filter(Boolean);

        return { items };
    }, [grid, playerQ, playerR, playerStorage, pendingConfirmation, tutorialData, activeLevelConfig, spawnDust, workerData.renderItems, isLiteMode]);

    return (
        <>
            <Layer>
                {renderList.items.map(item => {
                    if (item.type === 'HEX') {
                        return (
                            <HexNode 
                                key={item.props.id} 
                                {...item.props} 
                                onHexClick={memoizedOnHexClick} 
                                onHover={onHover} 
                                isHovered={hoveredHexId === item.props.id} 
                                playerQ={playerQ}
                                playerR={playerR}
                                playerGrowthIntent={playerGrowthIntent}
                                growthAccelerator={campaignUpgrades?.growthAccelerator || 0}
                            />
                        );
                    } else {
                        return (
                            <Unit 
                                key={item.props.id} 
                                {...item.props} 
                                evacuationActive={item.props.isPlayer && evacuationActive}
                            />
                        );
                    }
                })}

                {connections.map((conn, i) => (
                    <Line key={`conn-${i}`} {...conn} strokeWidth={2} listening={false} perfectDrawEnabled={false} />
                ))}
            </Layer>
            {!isLiteMode && (
                <Layer listening={false}>
                    {particles.map(p => <DustCloud key={p.id} {...p} onComplete={removeParticle} />)}
                    {stackedEffects.map(eff => <FloatingEffect key={eff.id} effect={eff} rotation={rotation} stackIndex={eff.stackIndex} />)}
                </Layer>
            )}
        </>
    );
};

export default React.memo(MapRenderer);