
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Layer, Group, Line, Circle, Text } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { getHexKey, getNeighbors, hexToPixel } from '../services/hexUtils.ts';
import { HexNode, HexNodeTheme } from './HexNode.tsx';
import Unit from './Unit.tsx';
import { EntityType, EntityState, FloatingText, Hex, Entity } from '../types.ts';
import { checkGrowthCondition } from '../rules/growth.ts';
import { EXCHANGE_RATE_COINS_PER_MOVE } from '../rules/config.ts';

const VIEWPORT_PADDING = 200;
const VOID_LEVEL_FLAG = -99;

// THEME CONFIGURATION
const THEME_PALETTE: Record<string, HexNodeTheme> = {
    '0': { main: '#1e293b', light: '#334155', dark: '#0f172a', stroke: '#334155' },
    '1': { main: '#475569', light: '#64748b', dark: '#334155', stroke: '#64748b' },
    '2': { main: '#0891b2', light: '#22d3ee', dark: '#155e75', stroke: '#22d3ee' },
    '3': { main: '#0284c7', light: '#38bdf8', dark: '#0c4a6e', stroke: '#38bdf8' },
    '4': { main: '#2563eb', light: '#60a5fa', dark: '#1e3a8a', stroke: '#60a5fa' },
    '5': { main: '#4f46e5', light: '#818cf8', dark: '#312e81', stroke: '#818cf8' },
    '6': { main: '#7c3aed', light: '#a78bfa', dark: '#4c1d95', stroke: '#a78bfa' },
    '-1': { main: '#3f1a0a', light: '#5c2415', dark: '#260e05', stroke: '#3f1a0a' },
    '-2': { main: '#2a0a0a', light: '#451a1a', dark: '#140303', stroke: '#2a0a0a' },
    '-3': { main: '#1a0505', light: '#330a0a', dark: '#000000', stroke: '#1a0505' },
};

const getTheme = (level: number): HexNodeTheme => {
    if (level > 6) return THEME_PALETTE['6'];
    if (level < -3) return THEME_PALETTE['-3'];
    return THEME_PALETTE[String(level)] || THEME_PALETTE['0'];
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

const FloatingEffect: React.FC<{ effect: FloatingText; rotation: number }> = React.memo(({ effect, rotation }) => {
    const animRef = useRef<Konva.Group>(null);
    const { x, y } = hexToPixel(effect.q, effect.r, rotation);
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
    const removeParticle = (id: number) => setParticles(p => p.filter(x => x.id !== id));
    const spawnDust = (x: number, y: number, color: string) => setParticles(p => [...p, { id: Date.now() + Math.random(), x, y, color }]);

    const renderList = useMemo(() => {
        if (!grid || !player) return [];

        const items: any[] = [];
        const inverseScale = 1 / viewState.scale;
        
        // Viewport Culling
        const x0 = -viewState.x * inverseScale - VIEWPORT_PADDING;
        const y0 = -viewState.y * inverseScale - VIEWPORT_PADDING;
        const x1 = (dimensions.width - viewState.x) * inverseScale + VIEWPORT_PADDING;
        const y1 = (dimensions.height - viewState.y) * inverseScale + VIEWPORT_PADDING;

        const playerNeighbors = getNeighbors(player.q, player.r);
        const playerNeighborKeys = new Set(playerNeighbors.map(n => getHexKey(n.q, n.r)));
        const pendingTarget = pendingConfirmation?.data.path[pendingConfirmation.data.path.length - 1];
        const pendingKey = pendingTarget ? getHexKey(pendingTarget.q, pendingTarget.r) : null;

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

        const hexes = Object.values(grid);

        for (const hex of hexes) {
            const { x, y } = hexToPixel(hex.q, hex.r, rotation);
            
            // Cull invisible hexes
            if (x < x0 || x > x1 || y < y0 || y > y1) continue;

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
                if (activeLevelConfig?.id === '1.4' && isNeighbor && hex.maxLevel>=2) { isTutorial=true; tutColor='cyan'; }
            }

            items.push({
                type: 'HEX',
                depth: y, 
                props: {
                    x, y,
                    rotation,
                    q: hex.q,
                    r: hex.r,
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
                    onClick: () => onHexClick(hex.q, hex.r),
                    onHover: () => onHover(hex.id),
                    onHoverEnd: () => onHover(null)
                }
            });
        }

        // 2. Process Units
        const allEntities = [{ ...player, isPlayer: true }, ...(bots || []).map(b => ({ ...b, isPlayer: false }))];
        for (const u of allEntities) {
            const px = hexToPixel(u.q, u.r, rotation);
            if (px.x < x0 || px.x > x1 || px.y < y0 || px.y > y1) continue;
            
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
                    onMoveComplete: spawnDust
                }
            });
        }

        // 3. Process Path Connections
        if (!isPlayerGrowing && player.state !== EntityState.MOVING) {
            const pStart = hexToPixel(player.q, player.r, rotation);
            const pHex = grid[getHexKey(player.q, player.r)];
            const startH = pHex ? (10 + pHex.maxLevel * 6) : 10;

            for (const n of playerNeighbors) {
                const nKey = getHexKey(n.q, n.r);
                const nHex = grid[nKey];
                const isBot = bots?.some(b => b.q===n.q && b.r===n.r);
                const isVoid = (nHex?.structureType as string) === 'VOID';
                if (isBot || isVoid) continue;

                const nPos = hexToPixel(n.q, n.r, rotation);
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

    }, [grid, player, bots, viewState, rotation, hoveredHexId, pendingConfirmation, isPlayerGrowing, activeLevelConfig, winCondition]);

    return (
        <Layer>
            {renderList.map((item, i) => {
                const key = item.type === 'HEX' ? `h-${item.props.q}-${item.props.r}` : 
                            item.type === 'UNIT' ? item.props.id : `c-${i}`;
                            
                if (item.type === 'HEX') return <HexNode key={key} {...item.props} />;
                if (item.type === 'UNIT') return <Unit key={key} {...item.props} />;
                if (item.type === 'CONN') return <Line key={key} {...item.props} strokeWidth={2} listening={false} />;
                return null;
            })}
            
            {particles.map(p => <DustCloud key={p.id} {...p} onComplete={removeParticle} />)}
            {effects && effects.map(eff => <FloatingEffect key={eff.id} effect={eff} rotation={rotation} />)}
        </Layer>
    );
};

export default MapRenderer;
