
import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { Layer, Group, Line, Circle, Text } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { getHexKey, getNeighbors, pixelToHex } from '../services/hexUtils.ts';
import { HexNode, HexNodeTheme } from './HexNode.tsx';
import Unit from './Unit.tsx';
import { EntityType, EntityState, FloatingText, Hex, Entity } from '../types.ts';
import { checkGrowthCondition } from '../rules/growth.ts';
import { EXCHANGE_RATE_COINS_PER_MOVE, HEX_SIZE } from '../rules/config.ts';

const VOID_LEVEL_FLAG = -99;

// THEME CONFIGURATION
// Colors define the specific visual style per level range
// UPDATED: Gradients applied to make each level distinct
const THEME_PALETTE: Record<string, HexNodeTheme> = {
    // Neutral (L0)
    '0': { main: '#1e293b', light: '#334155', dark: '#0f172a', stroke: '#475569' }, // Slate

    // Positive: TECH (L1-L3) - Shift from Navy to Cyan
    '1': { main: '#0f172a', light: '#1e293b', dark: '#020617', stroke: '#0c4a6e' }, // Deep Navy
    '2': { main: '#172554', light: '#1e3a8a', dark: '#0f172a', stroke: '#0284c7' }, // Blue
    '3': { main: '#1e3a8a', light: '#2563eb', dark: '#172554', stroke: '#0ea5e9' }, // Sky Blue

    // Positive: CYBER (L4-L7) - Shift from Indigo to Neon Purple
    '4': { main: '#312e81', light: '#4338ca', dark: '#1e1b4b', stroke: '#6366f1' }, // Indigo
    '5': { main: '#4c1d95', light: '#5b21b6', dark: '#2e1065', stroke: '#8b5cf6' }, // Violet
    '6': { main: '#581c87', light: '#6b21a8', dark: '#3b0764', stroke: '#a855f7' }, // Purple
    '7': { main: '#701a75', light: '#86198f', dark: '#4a044e', stroke: '#d946ef' }, // Fuchsia

    // Positive: ASCENDED (L8+) - Shift from Bronze to Gold
    '8': { main: '#451a03', light: '#78350f', dark: '#271a0c', stroke: '#d97706' }, // Bronze
    '9': { main: '#713f12', light: '#a16207', dark: '#422006', stroke: '#f59e0b' }, // Gold
    '10': { main: '#854d0e', light: '#ca8a04', dark: '#713f12', stroke: '#fcd34d' }, // Bright Gold

    // Negative: SEDIMENT (L-1 to L-3) - Shift from Grey to Dark Stone
    '-1': { main: '#292524', light: '#44403c', dark: '#1c1917', stroke: '#57534e' }, // Warm Grey
    '-2': { main: '#1c1917', light: '#292524', dark: '#0c0a09', stroke: '#44403c' }, // Darker
    '-3': { main: '#0c0a09', light: '#1c1917', dark: '#000000', stroke: '#292524' }, // Near Black

    // Negative: MAGMA (L-4 to L-7) - Shift from Dark Red to Bright Heat
    '-4': { main: '#450a0a', light: '#7f1d1d', dark: '#2a0505', stroke: '#991b1b' }, // Dark Red
    '-5': { main: '#7f1d1d', light: '#991b1b', dark: '#450a0a', stroke: '#dc2626' }, // Red
    '-6': { main: '#991b1b', light: '#b91c1c', dark: '#7f1d1d', stroke: '#ef4444' }, // Bright Red
    '-7': { main: '#c2410c', light: '#ea580c', dark: '#7c2d12', stroke: '#f97316' }, // Orange Red

    // Negative: CORE (L-8+) - White Hot
    '-8': { main: '#fff7ed', light: '#ffedd5', dark: '#c2410c', stroke: '#ffffff' },
};

const getTheme = (level: number): HexNodeTheme => {
    // Clamp high levels to Gold theme
    if (level > 8) return THEME_PALETTE['10']; // Use 10 as max
    // Clamp low levels to Core theme
    if (level < -8) return THEME_PALETTE['-8'];
    
    // Check specific entry
    const key = String(level);
    if (THEME_PALETTE[key]) return THEME_PALETTE[key];

    // Fallback logic for ranges if specific key missing
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

// --- VISUAL EFFECTS ---
interface VisualParticle { id: number; x: number; y: number; color: string; }

const DustCloud: React.FC<VisualParticle & { onComplete: (id: number) => void }> = React.memo(({ id, x, y, color, onComplete }) => {
    const groupRef = useRef<Konva.Group>(null);
    useEffect(() => {
        const node = groupRef.current;
        if (!node) return;
        const puffs = node.find('Circle');
        puffs.forEach((puff) => {
             const angle = Math.random() * Math.PI * 2;
             const dist = 10 + Math.random() * 10;
             new Konva.Tween({
                 node: puff,
                 x: Math.cos(angle) * dist,
                 y: Math.sin(angle) * dist * 0.6,
                 scaleX: 0, scaleY: 0, opacity: 0,
                 duration: 0.4 + Math.random() * 0.2,
                 easing: Konva.Easings.EaseOut,
             }).play();
        });
        const t = setTimeout(() => onComplete(id), 600);
        return () => clearTimeout(t);
    }, [id, onComplete]);

    return (
        <Group ref={groupRef} x={x} y={y}>
            {[0, 1, 2, 3].map(i => <Circle key={i} radius={3 + Math.random()*3} fill={color} opacity={0.4} />)}
        </Group>
    );
});

// Re-implement simplified hexToPixel inside the component for floating effects to keep them light
const simpleHexToPixel = (q: number, r: number, rotation: number) => {
    const rawX = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
    const rawY = HEX_SIZE * (1.5 * r);
    const angleRad = rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    return { 
        x: rawX * cos - rawY * sin, 
        y: (rawX * sin + rawY * cos) * 0.8 
    };
};

const FloatingEffect: React.FC<{ effect: FloatingText; rotation: number }> = React.memo(({ effect, rotation }) => {
    const animRef = useRef<Konva.Group>(null);
    const { x, y } = simpleHexToPixel(effect.q, effect.r, rotation);
    useEffect(() => {
        const node = animRef.current;
        if (!node) return;
        node.y(0); node.opacity(0); node.scale({ x: 0.5, y: 0.5 });
        new Konva.Tween({
            node: node, y: -80, opacity: 0, scaleX: 1.2, scaleY: 1.2,
            duration: effect.lifetime / 1000, easing: Konva.Easings.EaseOut,
        }).play();
        node.to({ opacity: 1, scaleX: 1, scaleY: 1, duration: 0.2 });
    }, []); 
    return (
        <Group x={x} y={y - 20} listening={false}>
            <Group ref={animRef}>
                <Text text={effect.text} fontSize={16} fontStyle="bold" fill={effect.color} x={-50} width={100} align="center" shadowColor={effect.color} shadowBlur={10} />
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
}

const MapRenderer: React.FC<MapRendererProps> = ({ viewState, dimensions, rotation, onHexClick, onHover, hoveredHexId }) => {
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
    
    // OPTIMIZATION: Memoize callbacks to prevent Unit re-renders
    const removeParticle = useCallback((id: number) => {
        setParticles(p => p.filter(x => x.id !== id));
    }, []);

    const spawnDust = useCallback((x: number, y: number, color: string) => {
        setParticles(p => [...p, { id: Date.now() + Math.random(), x, y, color }]);
    }, []);

    const renderList = useMemo(() => {
        if (!grid || !player) return [];

        const items: any[] = [];
        const inverseScale = 1 / viewState.scale;
        
        // Calculate Visible Bounds in Screen Space
        const x0 = -viewState.x * inverseScale;
        const y0 = -viewState.y * inverseScale;
        const width = dimensions.width * inverseScale;
        const height = dimensions.height * inverseScale;
        
        // Convert screen center to hex to get an anchor
        const centerX = x0 + width / 2;
        const centerY = y0 + height / 2;
        const centerHex = pixelToHex(centerX, centerY, rotation);
        
        // Calculate a safe "radius" of hexes to render based on zoom
        const radius = Math.ceil(Math.sqrt(width*width + height*height) / (HEX_SIZE * 1.5)) + 4;

        const playerNeighbors = getNeighbors(player.q, player.r);
        const playerNeighborKeys = new Set(playerNeighbors.map(n => getHexKey(n.q, n.r)));
        const pendingTarget = pendingConfirmation?.data.path[pendingConfirmation.data.path.length - 1];
        const pendingKey = pendingTarget ? getHexKey(pendingTarget.q, pendingTarget.r) : null;

        // --- OPTIMIZATION: Pre-calculate Math Constants ---
        // We do this ONCE per frame/render, preventing thousands of Math.cos/sin calls in loop
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const SQRT3 = Math.sqrt(3);
        const SQRT3_2 = SQRT3 / 2;
        const ONE_POINT_FIVE = 1.5;

        // Inline fast projector to avoid function overhead and re-calc
        const fastProject = (q: number, r: number) => {
            const rawX = HEX_SIZE * (SQRT3 * q + SQRT3_2 * r);
            const rawY = HEX_SIZE * (ONE_POINT_FIVE * r);
            return {
                x: rawX * cos - rawY * sin,
                y: (rawX * sin + rawY * cos) * 0.8
            };
        };

        let missingSupports: Set<string> | null = null;
        if (hoveredHexId) {
            const hHex = grid[hoveredHexId];
            if (hHex && hHex.q === player.q && hHex.r === player.r) {
                const occupied = (bots || []).map(b => ({ q: b.q, r: b.r }));
                const res = checkGrowthCondition(hHex, player, playerNeighbors, grid, occupied, winCondition?.queueSize || 3);
                if (!res.canGrow && res.missingSupports) {
                    missingSupports = new Set(res.missingSupports.map(c => getHexKey(c.q, c.r)));
                }
            }
        }

        // --- OPTIMIZED LOOP: COORDINATE ITERATION ---
        for (let q = centerHex.q - radius; q <= centerHex.q + radius; q++) {
            for (let r = centerHex.r - radius; r <= centerHex.r + radius; r++) {
                
                const hex = grid[getHexKey(q, r)];
                if (!hex) continue; 

                // Use the fast projector
                const { x, y } = fastProject(q, r);
                
                const neighborLevels = new Array(6);
                const rawN = getNeighbors(hex.q, hex.r);
                for(let i=0; i<6; i++) {
                    const neighborIdx = 5 - i;
                    const nHex = grid[getHexKey(rawN[neighborIdx].q, rawN[neighborIdx].r)];
                    neighborLevels[i] = (nHex && (nHex.structureType as string) !== 'VOID') ? (nHex.currentLevel ?? 0) : VOID_LEVEL_FLAG;
                }

                const isPending = hex.id === pendingKey;
                
                let isTutorial = false;
                let tutColor: any = 'emerald';
                const isNeighbor = playerNeighborKeys.has(hex.id);
                if (!isPlayerGrowing && (hex.structureType as string) !== 'VOID') {
                    if (activeLevelConfig?.id === '1.1' && isNeighbor && hex.maxLevel === 0 && !hex.ownerId) isTutorial = true;
                    if (activeLevelConfig?.id === '1.3') {
                        if (hex.q===0 && hex.r===0 && hex.maxLevel<2) { isTutorial=true; tutColor='amber'; }
                        if (isNeighbor && hex.maxLevel<1) { isTutorial=true; tutColor='blue'; }
                    }
                    if (activeLevelConfig?.id === '1.4') {
                        if (isNeighbor && hex.maxLevel>=2) { isTutorial=true; tutColor='cyan'; }
                        if (hex.q === 0 && hex.r === 0 && hex.maxLevel < 3) { isTutorial=true; tutColor='amber'; }
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
                        tutorialColor: tutColor,
                        isMissingSupport: missingSupports ? missingSupports.has(hex.id) : false,
                        isOccupied: (hex.q===player.q && hex.r===player.r) || bots?.some(b => b.q===hex.q && b.r===hex.r),
                        isGrowing: hex.progress > 0 && (hex.structureType as string) !== 'VOID',
                        isRankLocked: hex.maxLevel > player.playerLevel,
                        progress: hex.progress,
                        durability: hex.durability,
                        artifactType: hex.artifact?.type,
                        onHexClick: onHexClick,
                        onHover: onHover
                    }
                });
            }
        }

        // 2. Process Units
        const allEntities = [{ ...player, isPlayer: true }, ...(bots || []).map(b => ({ ...b, isPlayer: false }))];
        for (const u of allEntities) {
            // Use fastProject for entities too
            const px = fastProject(u.q, u.r);
            
            // Strict Entity Culling
            if (px.x < x0 - 100 || px.x > x0 + width + 100 || px.y < y0 - 100 || px.y > y0 + height + 100) continue;
            
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

        // 3. Process Path Connections
        if (!isPlayerGrowing && player.state !== EntityState.MOVING) {
            const pStart = fastProject(player.q, player.r);
            const pHex = grid[getHexKey(player.q, player.r)];
            const startH = pHex ? (10 + pHex.maxLevel * 6) : 10;

            for (const n of playerNeighbors) {
                const nKey = getHexKey(n.q, n.r);
                const nHex = grid[nKey];
                const isBot = bots?.some(b => b.q===n.q && b.r===n.r);
                const isVoid = (nHex?.structureType as string) === 'VOID';
                if (isBot || isVoid) continue;

                const nPos = fastProject(n.q, n.r);
                const endH = nHex ? (10 + nHex.maxLevel * 6) : 10;
                
                if (Math.abs((pHex?.maxLevel||0) - (nHex?.maxLevel||0)) > 1) continue;

                const cost = (nHex && nHex.maxLevel >= 2) ? nHex.maxLevel : 1;
                const canAfford = player.moves >= cost || player.coins >= (cost * EXCHANGE_RATE_COINS_PER_MOVE);

                items.push({
                    type: 'CONN',
                    depth: Math.min(pStart.y, nPos.y),
                    props: {
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

    }, [grid, player, bots, viewState, rotation, hoveredHexId, pendingConfirmation, isPlayerGrowing, activeLevelConfig, winCondition, onHexClick, onHover, spawnDust]);

    return (
        <Layer>
            {renderList.map((item, i) => {
                const key = item.type === 'HEX' ? item.props.id : 
                            item.type === 'UNIT' ? item.props.id : `c-${i}`;
                            
                if (item.type === 'HEX') return <HexNode key={key} {...item.props} />;
                if (item.type === 'UNIT') return <Unit key={key} {...item.props} />;
                // Optimization: perfectDrawEnabled={false} prevents unnecessary hit graph generation for non-interactive lines
                if (item.type === 'CONN') return <Line key={key} {...item.props} strokeWidth={2} listening={false} perfectDrawEnabled={false} />;
                return null;
            })}
            
            {particles.map(p => <DustCloud key={p.id} {...p} onComplete={removeParticle} />)}
            {effects && effects.map(eff => <FloatingEffect key={eff.id} effect={eff} rotation={rotation} />)}
        </Layer>
    );
};

export default MapRenderer;
