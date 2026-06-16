
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Layer, Group, Line, Circle, Text, Shape } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { useEphemeralStore } from '../store/ephemeralStore.ts';
import { HexNode, HexNodeTheme } from './HexNode.tsx';
import Unit from './Unit.tsx';
import { EntityType, EntityState, FloatingText, Hex, Entity } from '../types.ts';
import { HEX_SIZE } from '../rules/config.ts';
import { getHexKey, getNeighbors, getStatusModifiers } from '../services/hexUtils.ts';
import { safifyCoord } from '../utils/safeCoordinates.ts';

// Web Worker Import (Vite syntax)
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

// --- MULTI-GRID COORDINATE MATHEMATICS ---
const getRawCoords = (x: number, y: number, rotation: number) => {
    const angleRad = -rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    
    const unscaledY = y / 0.8;
    const rawX = x * cos - unscaledY * sin;
    const rawY = x * sin + unscaledY * cos;
    return { rawX, rawY };
};

const cubeRound = (fracQ: number, fracR: number) => {
    const fracS = -fracQ - fracR;
    
    let q = Math.round(fracQ);
    let r = Math.round(fracR);
    let s = Math.round(fracS);
    
    const qDiff = Math.abs(q - fracQ);
    const rDiff = Math.abs(r - fracR);
    const sDiff = Math.abs(s - fracS);
    
    if (qDiff > rDiff && qDiff > sDiff) {
        q = -r - s;
    } else if (rDiff > sDiff) {
        r = -q - s;
    }
    return { q, r };
};

const getRangeNeighbors = (centerQ: number, centerR: number, radius: number) => {
    const results = [];
    for (let dq = -radius; dq <= radius; dq++) {
        const maxDr = Math.min(radius, radius - dq);
        const minDr = Math.max(-radius, -radius - dq);
        for (let dr = minDr; dr <= maxDr; dr++) {
            results.push({ q: centerQ + dq, r: centerR + dr });
        }
    }
    return results;
};

const getHeightOffset = (level: number) => {
    if (level <= -99) return 0;
    if (level >= 0) return -(10 + level * 10);
    return (Math.abs(level) - 1) * 10;
};

const getArrowColor = (type: string, part: 'main' | 'shadow'): string => {
    const isShadow = part === 'shadow';
    switch(type) {
        case 'amber': return isShadow ? '#b45309' : '#fbbf24';
        case 'cyan': return isShadow ? '#0e7490' : '#22d3ee';
        case 'red': return isShadow ? '#991b1b' : '#ef4444';
        default: return isShadow ? '#0f766e' : '#34d399'; // emerald
    }
};

const blendColor = (color1: string, color2: string, weight: number): string => {
    // Basic hex color blending helper for wall shadows
    const c1 = color1.startsWith('#') ? color1.slice(1) : color1;
    const c2 = color2.startsWith('#') ? color2.slice(1) : color2;
    
    const r1 = parseInt(c1.substring(0, 2), 16);
    const g1 = parseInt(c1.substring(2, 4), 16);
    const b1 = parseInt(c1.substring(4, 6), 16);
    
    const r2 = parseInt(c2.substring(0, 2), 16);
    const g2 = parseInt(c2.substring(2, 4), 16);
    const b2 = parseInt(c2.substring(4, 6), 16);
    
    const r = Math.round(r1 * (1 - weight) + r2 * weight);
    const g = Math.round(g1 * (1 - weight) + g2 * weight);
    const b = Math.round(b1 * (1 - weight) + b2 * weight);
    
    const rs = r.toString(16).padStart(2, '0');
    const gs = g.toString(16).padStart(2, '0');
    const bs = b.toString(16).padStart(2, '0');
    
    return `#${rs}${gs}${bs}`;
};

const isPointInViewport = (
    x: number,
    y: number,
    offsetY: number,
    rotation: number,
    dWidth: number,
    dHeight: number,
    cam: { x: number; y: number; scale: number; rotation: number } | undefined,
    padding = 200
) => {
    if (!cam) return true;
    const angleOffset = rotation * (Math.PI / 180);
    const cos = Math.cos(angleOffset);
    const sin = Math.sin(angleOffset);
    const cx = x * cos - y * sin;
    const cy = (x * sin + y * cos) * 0.8 + offsetY;

    const screenX = cam.x + cx * cam.scale;
    const screenY = cam.y + cy * cam.scale;

    return (
        screenX >= -padding &&
        screenX <= dWidth + padding &&
        screenY >= -padding &&
        screenY <= dHeight + padding
    );
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
                const isGoalReached = (player.coins ?? 0) >= 100;
                if (isGoalReached) {
                    satisfied = true;
                } else {
                    const reactor = _grid[`0,0`];
                    const isReactorOnCooldown = reactor && (reactor.recoveryCharges === 0 || (reactor.cooldownEndTime && Date.now() < reactor.cooldownEndTime));
                    if (hex.q === 0 && hex.r === 0) {
                        satisfied = !!isReactorOnCooldown;
                    } else {
                        satisfied = !isReactorOnCooldown;
                    }
                }
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
                 isTutorial = true; isArrow = true; tutColor = 'cyan';
             } else if (hex.currentLevel >= 1 && hex.q === 2 && hex.r === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'amber';
             }
         } else if (player.q === 2 && player.r === 0) {
             if (hex.q === 3 && hex.r === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'amber';
             }
         } else if (player.q === 3 && player.r === 0) {
             if (hex.q === 3 && hex.r === 0 && hex.currentLevel === 2) {
                 isTutorial = true; isArrow = true; tutColor = 'red';
             } else if (hex.currentLevel <= 1 && hex.q === 4 && hex.r === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'amber';
             }
         } else if (player.q === 4 && player.r === 0) {
             if (hex.q === 5 && hex.r === 0) {
                 isTutorial = true; isArrow = true; tutColor = 'emerald';
             }
         } else if (player.q === 5 && player.r === 0) {
             if (hex.q === 5 && hex.r === 0) {
                 isTutorial = false; isArrow = false;
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

// THEME CONFIGURATION
export const THEME_PALETTE: Record<string, HexNodeTheme> = {
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
    camera?: { x: number; y: number; scale: number; rotation: number };
    dimensions?: { width: number; height: number };
}

const MapRenderer: React.FC<MapRendererProps> = ({ rotation, onHexClick, onHover, camera, dimensions }) => {
    const dWidth = dimensions?.width ?? 800;
    const dHeight = dimensions?.height ?? 600;
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

    // Dispatch real-time screen coordinates of key hex elements for the onboarding tutorial
    useEffect(() => {
        if (!player || !grid) return;

        const getScreenCoordsOfHex = (q: number, r: number, level: number) => {
            const SQRT3 = Math.sqrt(3);
            const SQRT3_2 = SQRT3 / 2;
            const ONE_POINT_FIVE = 1.5;
            
            const rawNX = HEX_SIZE * (SQRT3 * q + SQRT3_2 * r);
            const rawNY = HEX_SIZE * (ONE_POINT_FIVE * r);
            
            const angleOffset = rotation * (Math.PI / 180);
            const cos = Math.cos(angleOffset);
            const sin = Math.sin(angleOffset);
            
            const cx = rawNX * cos - rawNY * sin;
            const cy = (rawNX * sin + rawNY * cos) * 0.8 + getHeightOffset(level);
            
            const cam = camera || { x: 0, y: 0, scale: 1 };
            const screenX = cam.x + cx * cam.scale;
            const screenY = cam.y + cy * cam.scale;
            
            return {
                x: screenX - (HEX_SIZE * cam.scale),
                y: screenY - (HEX_SIZE * cam.scale * 0.8),
                w: HEX_SIZE * cam.scale * 2,
                h: HEX_SIZE * cam.scale * 1.6
            };
        };

        const pHex = grid[`${playerQ},${playerR}`];
        if (!pHex) return;

        const playerScreen = getScreenCoordsOfHex(playerQ, playerR, pHex.currentLevel);

        let mineScreen = null;
        let voidScreen = null;

        const neighbors = getNeighbors(playerQ, playerR);
        for (const n of neighbors) {
            const nHex = grid[`${n.q},${n.r}`];
            if (nHex) {
                if (nHex.currentLevel < 0 && !mineScreen) {
                    mineScreen = getScreenCoordsOfHex(n.q, n.r, nHex.currentLevel);
                }
                if (nHex.structureType === 'VOID' && !voidScreen) {
                    voidScreen = getScreenCoordsOfHex(n.q, n.r, nHex.currentLevel);
                }
            }
        }

        const updateEvent = new CustomEvent('hexquest-coordinates-update', {
            detail: {
                player: playerScreen,
                mine: mineScreen,
                void: voidScreen
            }
        });
        window.dispatchEvent(updateEvent);
    }, [player, playerQ, playerR, camera?.x, camera?.y, camera?.scale, rotation, grid]);
    
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
    const hoveredHexId = useEphemeralStore(state => state.hoveredHexId);

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
            } else {
                // Keep references updated to prevent O(N) areGridsEqual loop on subsequent high-frequency camera-only render frames
                last.grid = grid;
                last.player = player;
                last.bots = bots;
                last.pendingKey = pendingKey;
                last.selectedHexId = selectedHexId;
                last.rotation = rotation;
                last.camera = camera;
                last.dimensions = dimensions;
            }
        }
    }, [grid, rotation, player, bots, pendingKey, selectedHexId, activeLevelConfig, camera, dimensions]);

    const removeParticle = useCallback((id: string) => {
        setParticles(p => p.filter(x => x.id !== id));
    }, []);

    // Explicitly memoize onHexClick to ensure stability for renderList
    const memoizedOnHexClick = useCallback((q: number, r: number) => {
        onHexClick(q, r);
    }, [onHexClick]);

    // Explicitly memoize spawnDust
    const spawnDust = useCallback((x: number, y: number, color: string) => {
        if (useGameStore.getState().isLiteMode) return;
        const id = `dust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        setParticles(p => [...p, { id, x, y, color }]);
    }, []);

    // --- INTEGRATED SINGLE-SHAPE EVENT HANDLERS ---
    const handleShapeClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const cam = camera || { x: 0, y: 0, scale: 1 };
        const rx = (pointer.x - cam.x) / cam.scale;
        const ry = (pointer.y - cam.y) / cam.scale;

        const { rawX, rawY } = getRawCoords(rx, ry, rotation);
        const fracR = rawY / (1.5 * HEX_SIZE);
        const fracQ = rawX / (Math.sqrt(3) * HEX_SIZE) - fracR / 2;
        const baseCoord = cubeRound(fracQ, fracR);

        let bestHexKey: string | null = null;
        let bestDist = Infinity;

        const candidates = getRangeNeighbors(baseCoord.q, baseCoord.r, 2);
        for (const cand of candidates) {
            const k = getHexKey(cand.q, cand.r);
            const hex = grid ? grid[k] : null;
            if (!hex) continue;

            const isRevealed = !!hex.revealed || !!activeLevelConfig;
            if (!isRevealed) continue;

            // Simple projection accounting for offset
            const rawXCenter = HEX_SIZE * (Math.sqrt(3) * cand.q + (Math.sqrt(3) / 2) * cand.r);
            const rawYCenter = HEX_SIZE * (1.5 * cand.r);
            const angleRad = rotation * (Math.PI / 180);
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);
            
            const px = rawXCenter * cos - rawYCenter * sin;
            const pyBase = (rawXCenter * sin + rawYCenter * cos) * 0.8;

            const isVoid = hex.structureType === 'VOID';
            const currentLevel = hex.currentLevel ?? 0;
            const offsetY = isVoid ? -10 : getHeightOffset(isVoid ? 0 : currentLevel);

            const py = pyBase + offsetY;
            const dist = Math.hypot(px - rx, py - ry);
            if (dist < bestDist && dist < HEX_SIZE * 1.3) {
                bestDist = dist;
                bestHexKey = k;
            }
        }

        if (bestHexKey && grid && grid[bestHexKey]) {
            const targetHex = grid[bestHexKey];
            onHexClick(targetHex.q, targetHex.r);
        }
    }, [grid, rotation, camera, activeLevelConfig, onHexClick]);

    const handleShapeMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

        const cam = camera || { x: 0, y: 0, scale: 1 };
        const rx = (pointer.x - cam.x) / cam.scale;
        const ry = (pointer.y - cam.y) / cam.scale;

        const { rawX, rawY } = getRawCoords(rx, ry, rotation);
        const fracR = rawY / (1.5 * HEX_SIZE);
        const fracQ = rawX / (Math.sqrt(3) * HEX_SIZE) - fracR / 2;
        const baseCoord = cubeRound(fracQ, fracR);

        let bestHexKey: string | null = null;
        let bestDist = Infinity;

        const candidates = getRangeNeighbors(baseCoord.q, baseCoord.r, 2);
        for (const cand of candidates) {
            const k = getHexKey(cand.q, cand.r);
            const hex = grid ? grid[k] : null;
            if (!hex) continue;

            const isRevealed = !!hex.revealed || !!activeLevelConfig;
            if (!isRevealed) continue;

            const rawXCenter = HEX_SIZE * (Math.sqrt(3) * cand.q + (Math.sqrt(3) / 2) * cand.r);
            const rawYCenter = HEX_SIZE * (1.5 * cand.r);
            const angleRad = rotation * (Math.PI / 180);
            const cos = Math.cos(angleRad);
            const sin = Math.sin(angleRad);
            
            const px = rawXCenter * cos - rawYCenter * sin;
            const pyBase = (rawXCenter * sin + rawYCenter * cos) * 0.8;

            const isVoid = hex.structureType === 'VOID';
            const currentLevel = hex.currentLevel ?? 0;
            const offsetY = isVoid ? -10 : getHeightOffset(isVoid ? 0 : currentLevel);

            const py = pyBase + offsetY;
            const dist = Math.hypot(px - rx, py - ry);
            if (dist < bestDist && dist < HEX_SIZE * 1.3) {
                bestDist = dist;
                bestHexKey = k;
            }
        }

        if (bestHexKey) {
            if (useEphemeralStore.getState().hoveredHexId !== bestHexKey) {
                onHover(bestHexKey);
            }
        } else {
            if (useEphemeralStore.getState().hoveredHexId !== null) {
                onHover(null);
            }
        }
    }, [grid, rotation, camera, activeLevelConfig, onHover]);

    const handleShapeMouseLeave = useCallback(() => {
        if (useEphemeralStore.getState().hoveredHexId !== null) {
            onHover(null);
        }
    }, [onHover]);

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

    const hexItems = useMemo(() => {
        return renderList.items.filter(item => item.type === 'HEX');
    }, [renderList.items]);

    const hexIndexMap = useMemo(() => {
        const sorted = [...hexItems].sort((a, b) => {
            if (a.props.q !== b.props.q) return a.props.q - b.props.q;
            return a.props.r - b.props.r;
        });
        const map = new Map<string, number>();
        sorted.forEach((item, idx) => {
            map.set(item.props.id, idx);
        });
        return map;
    }, [hexItems]);

    return (
        <>
            <Layer>
                {/* 1. SINGLE-PASS HIGH PERFORMANCE HEX GRID RENDERING WITH FRUSTUM CULLING */}
                {isLiteMode ? (
                    <Shape
                        perfectDrawEnabled={false}
                        listening={true}
                        sceneFunc={(context) => {
                            const items = hexItems;
                            const ctx = context;
                            
                            const angleOffset = rotation * (Math.PI / 180);
                            const cos = Math.cos(angleOffset);
                            const sin = Math.sin(angleOffset);
                            const DEG_TO_RAD = Math.PI / 180;

                            // Pre-allocated vertices array to completely avoid Garbage Collection during render loop
                            const vertices = [
                                { x: 0, y: 0 },
                                { x: 0, y: 0 },
                                { x: 0, y: 0 },
                                { x: 0, y: 0 },
                                { x: 0, y: 0 },
                                { x: 0, y: 0 }
                            ];

                            for (let k = 0; k < items.length; k++) {
                                const item = items[k];
                                const props = item.props;
                                const { x, y, offsetY, level, theme, isSelected, isPending, isTutorialTarget, tutorialColor, isTargetArrow, structureType, neighborLevels, opacity } = props;
                                const isHovered = hoveredHexId === item.props.id;
                                
                                // Frustum Culling
                                if (!isPointInViewport(x, y, offsetY, rotation, dWidth, dHeight, camera, 150)) {
                                    continue;
                                }

                                // Transform coordinates
                                const cx = x * cos - y * sin;
                                const cy = (x * sin + y * cos) * 0.8 + offsetY;
                                
                                const isRevealed = !!props.isRevealed;
                                const isVoid = structureType === 'VOID';
                                
                                // Mutate pre-allocated vertices directly to avoid object instantiation overhead
                                for (let i = 0; i < 6; i++) {
                                    const angle = (60 * i + 30) * DEG_TO_RAD + angleOffset;
                                    vertices[i].x = cx + Math.cos(angle) * HEX_SIZE;
                                    vertices[i].y = cy + Math.sin(angle) * HEX_SIZE * 0.8;
                                }
                                
                                // Apply visibility opacity
                                ctx.globalAlpha = opacity ?? 1;
                                
                                // DRAW WALLS (SIDES)
                                if (isRevealed && !isVoid) {
                                    for (let i = 0; i < 6; i++) {
                                        const next_i = (i + 1) % 6;
                                        const nLevel = neighborLevels[i];
                                        
                                        // Midpoint angle to check front/back facing
                                        const midAngle = (60 * i + 60) * DEG_TO_RAD + angleOffset;
                                        const isFrontFacing = Math.sin(midAngle) > 0;
                                        
                                        if (isFrontFacing && nLevel !== undefined && level > nLevel) {
                                            const effectiveNLevel = nLevel === -99 ? -3 : nLevel;
                                            const drop = Math.max(0, (level - effectiveNLevel) * 10);
                                            if (drop > 0) {
                                                // Shaded 3D lighting based on side angle to camera
                                                const sinVal = Math.sin(midAngle);
                                                ctx.fillStyle = blendColor(theme.dark, '#000000', 0.25 * (1 - sinVal));
                                                
                                                ctx.beginPath();
                                                ctx.moveTo(vertices[i].x, vertices[i].y);
                                                ctx.lineTo(vertices[next_i].x, vertices[next_i].y);
                                                ctx.lineTo(vertices[next_i].x, vertices[next_i].y + drop);
                                                ctx.lineTo(vertices[i].x, vertices[i].y + drop);
                                                ctx.closePath();
                                                ctx.fill();
                                            }
                                        }
                                    }
                                }
                                
                                // DRAW TOP FACE
                                if (isVoid) {
                                    ctx.fillStyle = '#090514'; // Void
                                } else if (!isRevealed) {
                                    ctx.fillStyle = '#1e293b'; // Unrevealed slate grey
                                } else {
                                    ctx.fillStyle = theme.main;
                                }
                                
                                ctx.beginPath();
                                ctx.moveTo(vertices[0].x, vertices[0].y);
                                for (let i = 1; i < 6; i++) {
                                    ctx.lineTo(vertices[i].x, vertices[i].y);
                                }
                                ctx.closePath();
                                ctx.fill();
                                
                                // Top highlights (3D volume sunlight shading)
                                if (isRevealed && !isVoid) {
                                    ctx.fillStyle = theme.light;
                                    ctx.globalAlpha = (opacity ?? 1) * 0.12;
                                    ctx.beginPath();
                                    ctx.moveTo(vertices[0].x, vertices[0].y);
                                    ctx.lineTo(vertices[1].x, vertices[1].y);
                                    ctx.lineTo(vertices[2].x, vertices[2].y);
                                    ctx.lineTo(cx, cy);
                                    ctx.closePath();
                                    ctx.fill();
                                    ctx.globalAlpha = opacity ?? 1;
                                }
                                
                                // DRAW TOP OUTLINE
                                if (isVoid) {
                                    ctx.strokeStyle = '#3b0764'; // Deep dark violet
                                } else {
                                    ctx.strokeStyle = theme.stroke;
                                }
                                ctx.lineWidth = 1.3;
                                ctx.stroke();
                                
                                // SPECIAL STRUCTURES: MONUMENTS
                                if (isRevealed && (structureType === 'MONUMENT' || structureType === 'MINI_MONUMENT')) {
                                    const isMon = structureType === 'MONUMENT';
                                    const height = isMon ? 24 : 14;
                                    const width = isMon ? 14 : 9;
                                    
                                    // Draw 3D Tower monument
                                    ctx.fillStyle = '#b45309'; // warm monument golden brown
                                    ctx.fillRect(cx - width/2, cy - height, width, height);
                                    
                                    // Cap highlight
                                    ctx.fillStyle = '#fbbf24'; // gleaming active center
                                    ctx.fillRect(cx - width/2, cy - height - 3, width, 4);
                                    
                                    ctx.strokeStyle = '#78350f';
                                    ctx.lineWidth = 1;
                                    ctx.strokeRect(cx - width/2, cy - height, width, height);
                                }
                                
                                // RENDER SELECTION & HOVER STATUS RING HIGHLIGHTS
                                if (isSelected) {
                                    ctx.strokeStyle = '#38bdf8'; // Sky blue border
                                    ctx.lineWidth = 3;
                                    ctx.stroke();
                                } else if (isPending) {
                                    ctx.strokeStyle = '#f59e0b'; // Amber cost placement
                                    ctx.lineWidth = 2.5;
                                    ctx.stroke();
                                } else if (isHovered) {
                                    ctx.strokeStyle = '#ffffff'; // White hovered ring
                                    ctx.lineWidth = 2;
                                    ctx.stroke();
                                }
                                
                                if (isTutorialTarget) {
                                    ctx.strokeStyle = getArrowColor(tutorialColor, 'main');
                                    ctx.lineWidth = 2.5;
                                    ctx.stroke();
                                }
                                
                                // Draw bouncing arrow on top
                                if (isTargetArrow) {
                                    const bounceY = Math.sin(Date.now() * 0.007) * 4;
                                    const arrowY = cy - 22 + bounceY;
                                    
                                    ctx.fillStyle = getArrowColor(tutorialColor, 'main');
                                    ctx.beginPath();
                                    ctx.moveTo(cx, arrowY);
                                    ctx.lineTo(cx - 5, arrowY - 9);
                                    ctx.lineTo(cx + 5, arrowY - 9);
                                    ctx.closePath();
                                    ctx.fill();
                                }
                            }
                            ctx.globalAlpha = 1;
                        }}
                        onClick={handleShapeClick}
                        onTap={handleShapeClick}
                        onMouseMove={handleShapeMouseMove}
                        onMouseLeave={handleShapeMouseLeave}
                    />
                ) : (
                    <>
                        {/* 1a. UNREVEALED INVISIBLE HEXES DRAWN VIA A SINGLE SHAPE */}
                        <Shape
                            perfectDrawEnabled={false}
                            listening={false}
                            sceneFunc={(context) => {
                                const allHexes = hexItems;
                                const ctx = context;
                                
                                const angleOffset = rotation * (Math.PI / 180);
                                const cos = Math.cos(angleOffset);
                                const sin = Math.sin(angleOffset);
                                const DEG_TO_RAD = Math.PI / 180;

                                // Pre-allocated vertices array to completely avoid Garbage Collection during render loop
                                const vertices = [
                                    { x: 0, y: 0 },
                                    { x: 0, y: 0 },
                                    { x: 0, y: 0 },
                                    { x: 0, y: 0 },
                                    { x: 0, y: 0 },
                                    { x: 0, y: 0 }
                                ];

                                for (let k = 0; k < allHexes.length; k++) {
                                    const item = allHexes[k];
                                    const props = item.props;
                                    if (props.isRevealed) continue;

                                    const { x, y, offsetY, theme, opacity } = props;
                                    
                                    // Frustum Culling
                                    if (!isPointInViewport(x, y, offsetY, rotation, dWidth, dHeight, camera, 150)) {
                                        continue;
                                    }

                                    // Transform coordinates
                                    const cx = x * cos - y * sin;
                                    const cy = (x * sin + y * cos) * 0.8 + offsetY;
                                    
                                    // Mutate pre-allocated vertices directly to avoid object instantiation overhead
                                    for (let i = 0; i < 6; i++) {
                                        const angle = (60 * i + 30) * DEG_TO_RAD + angleOffset;
                                        vertices[i].x = cx + Math.cos(angle) * HEX_SIZE;
                                        vertices[i].y = cy + Math.sin(angle) * HEX_SIZE * 0.8;
                                    }
                                    
                                    // Apply visibility opacity
                                    ctx.globalAlpha = opacity ?? 1;
                                    
                                    // DRAW TOP FACE
                                    ctx.fillStyle = '#1e293b'; // Unrevealed slate grey
                                    
                                    ctx.beginPath();
                                    ctx.moveTo(vertices[0].x, vertices[0].y);
                                    for (let i = 1; i < 6; i++) {
                                        ctx.lineTo(vertices[i].x, vertices[i].y);
                                    }
                                    ctx.closePath();
                                    ctx.fill();
                                    
                                    // DRAW TOP OUTLINE
                                    ctx.strokeStyle = theme.stroke;
                                    ctx.lineWidth = 1.3;
                                    ctx.stroke();
                                }
                                ctx.globalAlpha = 1;
                            }}
                        />

                        {/* 1b. REVEALED VISIBLE OPTIMIZED HEXNODES WITH FRUSTUM CULLING */}
                        {hexItems
                            .filter(item => !!item.props.isRevealed)
                            .filter(item => isPointInViewport(item.props.x, item.props.y, item.props.offsetY, rotation, dWidth, dHeight, camera, 150))
                            .map(item => (
                                <HexNode 
                                    key={item.props.id} 
                                    {...item.props} 
                                    onHexClick={memoizedOnHexClick} 
                                    onHover={onHover} 
                                    playerQ={playerQ}
                                    playerR={playerR}
                                    playerGrowthIntent={playerGrowthIntent}
                                    growthAccelerator={campaignUpgrades?.growthAccelerator || 0}
                                    figureIndex={hexIndexMap.get(item.props.id) ?? 9999}
                                />
                            ))
                        }
                    </>
                )}

                {/* 2. UNIT ENTITIES */}
                {renderList.items.filter(item => item.type === 'UNIT').map(item => (
                    <Unit 
                        key={item.props.id} 
                        {...item.props} 
                        evacuationActive={item.props.isPlayer && evacuationActive}
                    />
                ))}

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