
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Layer, Group, Line, Circle, Text } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { getHexKey, getNeighbors, pixelToHex, cubeDistance } from '../services/hexUtils.ts';
import { HexNode, HexNodeTheme, HexRenderMode } from './HexNode.tsx';
import Unit from './Unit.tsx';
import { EntityType, EntityState, FloatingText, Hex, Entity } from '../types.ts';
import { checkGrowthCondition } from '../rules/growth.ts';
import { EXCHANGE_RATE_COINS_PER_MOVE, HEX_SIZE } from '../rules/config.ts';
import { safifyCoord } from '../utils/safeCoordinates.ts';

const VOID_LEVEL_FLAG = -99;

// VISUAL CONSTANTS
const FLOATING_EFFECT_VERTICAL_SPACING = 25;
const FLOATING_EFFECT_RISE_DISTANCE = 80;
const FLOATING_EFFECT_BASE_Y_OFFSET = 20;
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

// LOD CONFIGURATION
const LOD_LEVELS = {
    VERY_FAR: { maxDistance: 25, detail: 'minimal' },
    FAR: { maxDistance: 15, detail: 'reduced' },
    MEDIUM: { maxDistance: 8, detail: 'normal' },
    CLOSE: { maxDistance: 3, detail: 'full' }
};

const INTERACTION_LOD_RADIUS = 10;

const getHexRenderMode = (dist: number, isInteracting: boolean): HexRenderMode => {
    // DYNAMIC LOD: Force reduced detail during interaction (rotation/drag) to maintain high FPS
    // Optimization: Only downgrade quality for hexes far from center (focus), preserving detail near cursor/center.
    if (isInteracting && dist > INTERACTION_LOD_RADIUS) {
        return { detailLevel: 'reduced', showTexture: false, showGlow: false, showDetails: false };
    }

    if (dist > LOD_LEVELS.VERY_FAR.maxDistance) {
        return { detailLevel: 'minimal', showTexture: false, showGlow: false, showDetails: false };
    } else if (dist > LOD_LEVELS.FAR.maxDistance) {
        return { detailLevel: 'reduced', showTexture: false, showGlow: false, showDetails: false };
    } else if (dist > LOD_LEVELS.MEDIUM.maxDistance) {
        return { detailLevel: 'normal', showTexture: true, showGlow: false, showDetails: true }; // Normal: Textures but no glow
    } else {
        return { detailLevel: 'full', showTexture: true, showGlow: true, showDetails: true }; // Full: Everything
    }
};

// THEME CONFIGURATION
const THEME_PALETTE: Record<string, HexNodeTheme> = {
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

const getTheme = (level: number): HexNodeTheme => {
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

const getHeightOffset = (level: number) => {
    if (level <= VOID_LEVEL_FLAG) return 0;
    if (level >= 0) return -(10 + level * 10);
    return (Math.abs(level) - 1) * 10;
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
                <Text text={effect.text} fontSize={FLOATING_EFFECT_FONT_SIZE} fontStyle="bold" fill={effect.color} x={FLOATING_EFFECT_TEXT_X_OFFSET} width={FLOATING_EFFECT_TEXT_WIDTH} align="center" shadowColor={effect.color} shadowBlur={10} perfectDrawEnabled={false} />
            </Group>
        </Group>
    );
});

interface MapRendererProps {
    viewState: { x: number, y: number, scale: number };
    dimensions: { width: number, height: number };
    rotation: number;
    onHexClick: (q: number, r: number) => void;
    onHover: (id: string | null) => void;
    hoveredHexId: string | null;
    isInteracting: boolean; // OPTIMIZATION FLAG
}

const MapRenderer: React.FC<MapRendererProps> = ({ viewState, dimensions, rotation, onHexClick, onHover, hoveredHexId, isInteracting }) => {
    const grid = useGameStore(state => state.session?.grid) as Record<string, Hex> | undefined;
    const player = useGameStore(state => state.session?.player) as Entity | undefined;
    const bots = useGameStore(state => state.session?.bots) as Entity[] | undefined;
    const effects = useGameStore(state => state.session?.effects);
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const pendingConfirmation = useGameStore(state => state.pendingConfirmation);
    const winCondition = useGameStore(state => state.session?.winCondition);
    const isPlayerGrowing = useGameStore(state => state.session?.isPlayerGrowing);
    const selectedHexId = useGameStore(state => state.session?.grid && state.session.player ? getHexKey(state.session.player.q, state.session.player.r) : null);

    const [particles, setParticles] = useState<VisualParticle[]>([]);
    
    // Explicitly memoize onHexClick to ensure stability for renderList
    const memoizedOnHexClick = useCallback((q: number, r: number) => {
        onHexClick(q, r);
    }, [onHexClick]);

    const removeParticle = useCallback((id: string) => {
        setParticles(p => p.filter(x => x.id !== id));
    }, []);

    // Explicitly memoize spawnDust
    const spawnDust = useCallback((x: number, y: number, color: string) => {
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

    const renderList = useMemo(() => {
        if (!grid || !player) return [];

        const items: any[] = [];
        const inverseScale = 1 / viewState.scale;
        
        // Calculate viewport bounds in stage local coordinates
        const x0 = -viewState.x * inverseScale;
        const y0 = -viewState.y * inverseScale;
        const width = dimensions.width * inverseScale;
        const height = dimensions.height * inverseScale;
        
        // Culling Padding (keeps objects visible slightly offscreen)
        const CULL_PADDING = 150;

        const centerX = x0 + width / 2;
        const centerY = y0 + height / 2;
        const centerHex = pixelToHex(centerX, centerY, rotation);
        
        const radius = Math.ceil(Math.sqrt(width*width + height*height) / (HEX_SIZE * 1.5)) + 2;

        const playerNeighbors = getNeighbors(player.q, player.r);
        const pendingTarget = pendingConfirmation?.data.path[pendingConfirmation.data.path.length - 1];
        const pendingKey = pendingTarget ? getHexKey(pendingTarget.q, pendingTarget.r) : null;

        // Retrieve pre-calculated values
        const { cos, sin } = projectionCache;
        const SQRT3 = Math.sqrt(3);
        const SQRT3_2 = SQRT3 / 2;
        const ONE_POINT_FIVE = 1.5;

        const fastProject = (q: number, r: number) => {
            const rawX = HEX_SIZE * (SQRT3 * q + SQRT3_2 * r);
            const rawY = HEX_SIZE * (ONE_POINT_FIVE * r);
            
            const px = rawX * cos - rawY * sin;
            const py = (rawX * sin + rawY * cos) * 0.8;
            
            return safifyCoord(px, py);
        };

        const levelId = activeLevelConfig?.id;

        // --- OPTIMIZED LOOP: COORDINATE ITERATION ---
        for (let q = centerHex.q - radius; q <= centerHex.q + radius; q++) {
            for (let r = centerHex.r - radius; r <= centerHex.r + radius; r++) {
                
                const hexKey = getHexKey(q, r);
                const hex = grid[hexKey];
                if (!hex) continue; 

                const { x, y } = fastProject(q, r);
                
                // FRUSTUM CULLING
                // Skip rendering if hex is significantly off-screen
                if (x < x0 - CULL_PADDING || x > x0 + width + CULL_PADDING || y < y0 - CULL_PADDING || y > y0 + height + CULL_PADDING) {
                    continue;
                }
                
                // Calculate LOD
                const distToCamera = cubeDistance(centerHex, { q, r });
                const renderMode = getHexRenderMode(distToCamera, isInteracting);

                const neighborLevels = new Array(6);
                const rawN = getNeighbors(hex.q, hex.r);
                for(let i=0; i<6; i++) {
                    const neighborIdx = 5 - i;
                    const nHex = grid[getHexKey(rawN[neighborIdx].q, rawN[neighborIdx].r)];
                    neighborLevels[i] = (nHex && (nHex.structureType as string) !== 'VOID') ? (nHex.currentLevel ?? 0) : VOID_LEVEL_FLAG;
                }

                const isPending = hex.id === pendingKey;
                const isOccupiedByPlayer = hex.q === player.q && hex.r === player.r;
                
                let isTutorial = false;
                let isArrow = false;
                let tutColor: any = 'emerald';
                
                // --- CAMPAIGN TUTORIAL LOGIC ---
                // Only process if in close view (LOD Optimization)
                if (renderMode.showDetails && !isPlayerGrowing && (hex.structureType as string) !== 'VOID') {
                    // Level 1.1: Expansion (Arrows on neutral L0)
                    if (levelId === '1.1') {
                        if (hex.maxLevel === 0 && !hex.ownerId && !isOccupiedByPlayer) {
                            isTutorial = true;
                            isArrow = true;
                            tutColor = 'amber';
                        }
                    }
                    // Level 1.2: Reach Capital (Arrow on Capital)
                    else if (levelId === '1.2') {
                        if (hex.structureType === 'CAPITAL') {
                            isTutorial = true;
                            isArrow = true;
                            tutColor = 'emerald';
                        }
                    }
                    // Level 1.3: Support (Arrow on Center after supports built)
                    else if (levelId === '1.3') {
                        // Check if center (0,0) needs upgrade
                        const center = grid[getHexKey(0,0)];
                        if (center) {
                            // Count L1+ neighbors around center
                            const cn = getNeighbors(0,0);
                            const supportCount = cn.filter(n => {
                                const h = grid[getHexKey(n.q, n.r)];
                                return h && h.maxLevel >= 1 && h.structureType !== 'VOID';
                            }).length;

                            if (supportCount >= 2 && center.maxLevel < 2) {
                                // Point to Center
                                if (hex.q === 0 && hex.r === 0) {
                                    isTutorial = true; isArrow = true; tutColor = 'amber';
                                }
                            } else if (center.maxLevel < 2) {
                                // Point to neighbors to build them
                                const isNeighbor = cn.some(n => n.q === hex.q && n.r === hex.r);
                                if (isNeighbor && hex.maxLevel < 1 && !isOccupiedByPlayer) {
                                    isTutorial = true; isArrow = true; tutColor = 'cyan';
                                }
                            }
                        }
                    }
                    // Level 1.4: Excavation (Center Logic Improved)
                    else if (levelId === '1.4') {
                        const center = grid[getHexKey(0,0)];
                        const isPlayerOnCenter = player.q === 0 && player.r === 0;

                        // 1. If player stepped away, guide them BACK to the center if it needs upgrading
                        if (center && center.maxLevel < 3 && !isPlayerOnCenter) {
                             if (hex.q === 0 && hex.r === 0) {
                                 isTutorial = true; isArrow = true; tutColor = 'amber';
                             }
                        }
                        // 2. If player is ON center
                        else if (isPlayerOnCenter && center && center.maxLevel < 3) {
                            if (player.storage >= 1) {
                                // Has mats -> Upgrade center (Show arrow on self to click button, or center hex)
                                if (hex.q === 0 && hex.r === 0) {
                                    isTutorial = true; isArrow = true; tutColor = 'amber';
                                }
                            } else {
                                // Needs mats -> Dig mounds
                                if (hex.maxLevel >= 2 && hex.id !== getHexKey(0,0)) {
                                    isTutorial = true; isArrow = true; tutColor = 'red';
                                }
                            }
                        }
                    }
                    // Level 1.6: Vertical Limit (Arrow on Summit)
                    else if (levelId === '1.6') {
                        // For 1.6 specifically, let's point to (0,0) as it's the center conflict zone.
                        if (hex.q === 0 && hex.r === 0 && !isOccupiedByPlayer) {
                             isTutorial = true; isArrow = true; tutColor = 'amber';
                        }
                    }
                }

                items.push({
                    type: 'HEX',
                    depth: y, 
                    props: {
                        x, y,
                        rotation,
                        q: hex.q,
                        r: hex.r,
                        id: hex.id, 
                        offsetY: (hex.structureType as string) === 'VOID' ? -2 : getHeightOffset((hex.structureType as string) === 'VOID' ? 0 : hex.maxLevel),
                        level: hex.currentLevel ?? 0,
                        maxLevel: hex.maxLevel,
                        structureType: hex.structureType as string,
                        neighborLevels,
                        theme: getTheme((hex.structureType as string) === 'VOID' ? 0 : hex.maxLevel),
                        isSelected: selectedHexId === hex.id,
                        isPending,
                        pendingCost: isPending && pendingConfirmation ? pendingConfirmation.data.costCoins : null,
                        isTutorialTarget: isTutorial,
                        isTargetArrow: isArrow, 
                        tutorialColor: tutColor,
                        isMissingSupport: false, 
                        isOccupied: isOccupiedByPlayer || bots?.some(b => b.q===hex.q && b.r===hex.r),
                        isGrowing: hex.progress > 0 && (hex.structureType as string) !== 'VOID',
                        isRankLocked: hex.maxLevel > player.playerLevel,
                        progress: hex.progress,
                        durability: hex.durability,
                        artifactType: hex.artifact?.type,
                        onHexClick: memoizedOnHexClick,
                        onHover: onHover,
                        renderMode: renderMode // Pass LOD Mode
                    }
                });
            }
        }

        const allEntities = [{ ...player, isPlayer: true }, ...(bots || []).map(b => ({ ...b, isPlayer: false }))];
        for (const u of allEntities) {
            const px = fastProject(u.q, u.r);
            // Viewport culling for entities
            if (px.x < x0 - CULL_PADDING || px.x > x0 + width + CULL_PADDING || px.y < y0 - CULL_PADDING || px.y > y0 + height + CULL_PADDING) continue;
            
            const uHex = grid[getHexKey(u.q, u.r)];
            const hLevel = uHex ? uHex.maxLevel : 0;
            const isMoving = u.state === EntityState.MOVING;
            const depthBias = isMoving ? 50 : 1; 

            items.push({
                type: 'UNIT',
                depth: px.y + depthBias, 
                props: {
                    id: u.id,
                    q: u.q, r: u.r,
                    type: u.isPlayer ? EntityType.PLAYER : EntityType.BOT,
                    color: u.avatarColor,
                    rotation,
                    hexLevel: hLevel,
                    totalCoinsEarned: u.totalCoinsEarned,
                    upgradePointCount: u.recentUpgrades?.length || 0,
                    headIndex: u.headIndex,
                    bodyIndex: u.bodyIndex,
                    onMoveComplete: spawnDust 
                }
            });
        }

        if (!isPlayerGrowing && player.state !== EntityState.MOVING) {
            const pStart = fastProject(player.q, player.r);
            const pHex = grid[getHexKey(player.q, player.r)];
            const startH = pHex ? (10 + pHex.maxLevel * 6) : 10;

            for (const n of playerNeighbors) {
                const nKey = getHexKey(n.q, n.r);
                const nHex = grid[nKey];
                
                // --- CULLING FOR CONNECTORS ---
                // We use the player's position, assuming connections are local.
                // If player is visible, connectors likely are. If player is culled, units loop handled it.
                // But double checking neighbor pos doesn't hurt.
                
                const isBot = bots?.some(b => b.q===n.q && b.r===n.r);
                const isVoid = (nHex?.structureType as string) === 'VOID';
                if (isBot || isVoid) continue;

                const nPos = fastProject(n.q, n.r);
                const endH = nHex ? (10 + nHex.maxLevel * 6) : 10;
                
                if (Math.abs((pHex?.maxLevel||0) - (nHex?.maxLevel||0)) > 1) continue;

                const level = nHex ? nHex.maxLevel : 0;
                const cost = level > 1 ? level : 1;
                
                const canAfford = player.moves >= cost || player.coins >= (cost * EXCHANGE_RATE_COINS_PER_MOVE);

                const connId = `conn-${pStart.x.toFixed(0)}-${pStart.y.toFixed(0)}-${nPos.x.toFixed(0)}-${nPos.y.toFixed(0)}`;

                items.push({
                    type: 'CONN',
                    depth: Math.min(pStart.y, nPos.y),
                    props: {
                        id: connId,
                        points: [pStart.x, pStart.y - startH, nPos.x, nPos.y - endH],
                        stroke: canAfford ? '#3b82f6' : '#ef4444',
                        dash: [5, 5],
                        opacity: (nHex && nHex.maxLevel > player.playerLevel) ? 0.2 : 0.6
                    }
                });
            }
        }

        items.sort((a, b) => a.depth - b.depth);
        return items;

    }, [grid, player, bots, viewState, rotation, hoveredHexId, pendingConfirmation, isPlayerGrowing, activeLevelConfig, winCondition, memoizedOnHexClick, onHover, spawnDust, projectionCache, isInteracting]); // Added isInteracting dependency

    return (
        <Layer>
            {renderList.map((item, i) => {
                const key = item.props.id || `item-${i}`;
                            
                if (item.type === 'HEX') return <HexNode key={key} {...item.props} />;
                if (item.type === 'UNIT') return <Unit key={key} {...item.props} />;
                if (item.type === 'CONN') return <Line key={key} {...item.props} strokeWidth={2} listening={false} perfectDrawEnabled={false} />;
                return null;
            })}
            
            {particles.map(p => <DustCloud key={p.id} {...p} onComplete={removeParticle} />)}
            {/* Render stacked floating effects */}
            {stackedEffects.map(eff => <FloatingEffect key={eff.id} effect={eff} rotation={rotation} stackIndex={eff.stackIndex} />)}
        </Layer>
    );
};

export default MapRenderer;
