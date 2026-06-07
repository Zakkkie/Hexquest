import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { Group, Rect, Circle, Path } from 'react-konva';
import { THEME_PALETTE } from './MapRenderer.tsx';
import { textureService } from '../services/textureService.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { hexToPixel } from '../services/hexUtils.ts';
import Konva from 'konva';
import { BASE_POINTS, BASE_PATH_D } from './StoryBuilderData.ts';

export const NebulaBackground: React.FC<{ width: number; height: number }> = ({ width, height }) => {
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

    return (
        <Group>
            {clouds.map(c => (
                <Rect
                    key={`c-${c.id}`}
                    x={c.x - c.radius}
                    y={c.y - c.radius}
                    width={c.radius * 2}
                    height={c.radius * 2}
                    fillLinearGradientStartPoint={{ x: c.x - c.radius, y: c.y - c.radius }}
                    fillLinearGradientEndPoint={{ x: c.x + c.radius, y: c.y + c.radius }}
                    fillLinearGradientColorStops={[0, c.color, 1, 'transparent']}
                    opacity={0.3}
                    listening={false}
                />
            ))}

            {stars.map(s => (
                <Circle key={`s-${s.id}`} x={s.x} y={s.y} radius={s.radius} fill="white" opacity={s.opacity} />
            ))}
        </Group>
    );
};

export const MiniFigureBlueprint: React.FC<{ 
    shape: { q: number, r: number, lvl?: number }[], 
    cellSize?: number, 
    className?: string,
    onCellClick?: (index: number) => void,
    selectedCellIndex?: number | null,
    style?: React.CSSProperties
}> = ({ shape, cellSize = 6, className, onCellClick, selectedCellIndex, style }) => {
    const size = cellSize;
    const hexToPixelSmall = (q: number, r: number) => {
        const x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
        const y = size * (1.5 * r);
        return { x, y };
    };

    const pixels = shape.map(pt => hexToPixelSmall(pt.q, pt.r));
    
    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    const minX = Math.min(...xs) - size - 4;
    const maxX = Math.max(...xs) + size + 4;
    const minY = Math.min(...ys) - size - 4;
    const maxY = Math.max(...ys) + size + 4;
    
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
            className={className || "w-16 h-16 bg-transparent shrink-0 flex items-center justify-center self-center overflow-visible"}
            style={style}
        >
            <defs>
                <filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
            {pixels.map((p, index) => {
                const pt = shape[index];
                const activeLvl = pt?.lvl !== undefined ? pt.lvl : 0;
                // Elegant theme palette colors matching the tier palette to make 3D height logical
                const themeColors: Record<string, string> = {
                    '0': '#22d3ee', // cyan-400
                    '1': '#c084fc', // purple-400
                    '2': '#fbbf24', // amber-400
                    '3': '#60a5fa', // blue-400
                    '4': '#818cf8', // indigo-400
                    '5': '#f472b6', // pink-400
                    '6': '#fb7185', // rose-400
                    '7': '#34d399', // emerald-400
                    '8': '#fb923c', // orange-400
                    '9': '#f87171'  // red-400
                };
                const strokeColor = themeColors[String(activeLvl)] || '#22d3ee';
                const isSelected = selectedCellIndex === index;
                
                return (
                    <g 
                        key={index} 
                        className={`transition-all duration-200 ${onCellClick ? 'cursor-pointer select-none hover:opacity-95' : ''}`}
                        onClick={() => { if (onCellClick) onCellClick(index); }}
                    >
                        {/* Glow back-highlight for selected cell */}
                        {isSelected && (
                            <polygon 
                                points={getHexPoints(p.x, p.y)}
                                fill={`${strokeColor}55`}
                                stroke="#ffffff"
                                strokeWidth={size * 0.3}
                                className="animate-pulse"
                            />
                        )}

                        {/* Beautiful outer thick neon glow underlay */}
                        <polygon 
                            points={getHexPoints(p.x, p.y)}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={size * 0.32}
                            opacity={0.8}
                            strokeLinejoin="round"
                            style={{ filter: 'url(#neon-glow)' }}
                        />

                        {/* Top crisp neon core stroke */}
                        <polygon 
                            points={getHexPoints(p.x, p.y)}
                            fill={isSelected ? `${strokeColor}55` : `${strokeColor}20`}
                            stroke={isSelected ? "#ffffff" : strokeColor}
                            strokeWidth={isSelected ? size * 0.2 : size * 0.12}
                            strokeLinejoin="round"
                        />

                        <text 
                            x={p.x} 
                            y={p.y + (size * 0.05)} 
                            textAnchor="middle" 
                            dominantBaseline="middle"
                            fill={isSelected ? "#ffffff" : "white"} 
                            fontSize={size * 0.72} 
                            fontWeight="900"
                            style={{ textShadow: `0 0 4px ${strokeColor}` }}
                        >
                            {activeLvl}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
};

export const StoryHex: React.FC<{ 
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
    isFlaring?: boolean,
    onClick: (q: number, r: number) => void,
    onDblClick?: (q: number, r: number) => void
}> = React.memo(({ q, r, level, isSelected, isBlueprint, blueprintLevel = 0, isEligible, isCenterInitially, isNew, canPlace, isFlaring, onClick, onDblClick }) => {
    const px = useMemo(() => hexToPixel(q, r), [q, r]);
    const isBuilt = level !== undefined && level >= 0;
    
    const colors = useMemo(() => {
        const defaultTheme = { main: '#1e293b', light: '#334155', dark: '#0f172a', stroke: '#475569' };
        const lvlStr = level !== undefined ? String(level) : '0';
        const theme = THEME_PALETTE[lvlStr] || THEME_PALETTE['0'] || defaultTheme;
        return { 
            side: theme.dark || '#0f172a', 
            top: theme.main || '#1e293b', 
            stroke: theme.stroke || '#475569',
            light: theme.light || '#334155' 
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
            const tween = new Konva.Tween({
                node: node,
                duration: 0.5,
                y: originalY,
                opacity: 1,
                easing: Konva.Easings.BackEaseOut
            });
            tween.play();
            return () => {
                tween.destroy();
            };
        }
    }, [isNew]);

    const rippleRef = useRef<Konva.Circle>(null);
    useEffect(() => {
        if (isNew && rippleRef.current) {
            const node = rippleRef.current;
            node.scale({ x: 1, y: 1 });
            node.opacity(0.9);
            node.strokeWidth(3);
            const tween = new Konva.Tween({
                node: node,
                duration: 0.65,
                scaleX: 1.85,
                scaleY: 1.85,
                opacity: 0,
                strokeWidth: 0.5,
                easing: Konva.Easings.EaseOut
            });
            tween.play();
            return () => {
                tween.destroy();
            };
        }
    }, [isNew]);

    const flareGlowRef = useRef<Konva.Path>(null);
    useEffect(() => {
        if (isFlaring && flareGlowRef.current) {
            const node = flareGlowRef.current;
            node.opacity(1.0);
            node.scale({ x: 1.05, y: 1.05 });
            
            const tween = new Konva.Tween({
                node: node,
                duration: 1.6,
                opacity: 0,
                scaleX: 0.95,
                scaleY: 0.95,
                easing: Konva.Easings.EaseOut
            });
            tween.play();
            return () => {
                tween.destroy();
            };
        }
    }, [isFlaring]);

    const [isHovered, setIsHovered] = useState(false);

    // Front-facing sides for isometric view (0, 1, 5)
    const visibleSides = useMemo(() => {
        if (!isBuilt) return [];
        const squashedPoints = (BASE_POINTS || []).map(p => {
            if (!p) return { x: 0, y: 0 };
            return { x: p.x ?? 0, y: (p.y ?? 0) * 0.8 };
        });
        
        // Point-up hex, front facing sides are 0, 1 and 5
        return [0, 1, 5].map(i => {
            const next = (i + 1) % 6;
            const p1 = squashedPoints[i] || { x: 0, y: 0 };
            const p2 = squashedPoints[next] || { x: 0, y: 0 };
            const p3 = { x: p2.x ?? 0, y: (p2.y ?? 0) + wallHeight };
            const p4 = { x: p1.x ?? 0, y: (p1.y ?? 0) + wallHeight };
            const minY = Math.min(p1.y ?? 0, p2.y ?? 0);
            const maxY = Math.max(p3.y ?? 0, p4.y ?? 0);
            return { 
                id: i, 
                data: `M ${p1.x ?? 0} ${p1.y ?? 0} L ${p2.x ?? 0} ${p2.y ?? 0} L ${p3.x ?? 0} ${p3.y ?? 0} L ${p4.x ?? 0} ${p4.y ?? 0} Z`,
                midX: ((p1.x ?? 0) + (p2.x ?? 0)) / 2,
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
            {isBuilt && colors && visibleSides && visibleSides.length > 0 && (
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
                {isCenterInitially && (
                    <Circle 
                        x={0}
                        y={0}
                        radius={25}
                        stroke="#10b981"
                        strokeWidth={3}
                        shadowColor="#10b981"
                        shadowBlur={20}
                        shadowOpacity={1.0}
                        opacity={0.9}
                        listening={false}
                    />
                )}
                <Path
                    data={BASE_PATH_D}
                    fillPatternImage={topTexture as any}
                    fill={topTexture ? undefined : (isBuilt ? colors?.top : (isCenterInitially ? 'rgba(16, 185, 129, 0.18)' : (isEligible ? 'rgba(34, 211, 238, 0.04)' : 'rgba(255,255,255,0.01)')))}
                    fillPatternScale={{ x: GAME_CONFIG.HEX_SIZE / 32, y: GAME_CONFIG.HEX_SIZE / 32 }}
                    fillPatternOffset={{ x: 32, y: 32 }}
                    fillPatternRepeat="repeat"
                    stroke={isBuilt ? '#06b6d4' : (isCenterInitially ? '#10b981' : (isEligible ? 'rgba(34, 211, 238, 0.55)' : 'rgba(255,255,255,0.075)'))}
                    strokeWidth={isBuilt ? 2.5 : (isCenterInitially ? 3.5 : (isEligible ? 1.5 : 0.8))}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                    dash={isEligible || isBlueprint ? [4, 4] : undefined}
                />
                
                {/* Visual plus (+) for center initially and eligible targets */}
                {!isBuilt && (isCenterInitially || isEligible) && (
                    <Group listening={false}>
                        <Path 
                            data="M -6 0 L 6 0"
                            stroke={isCenterInitially ? "#10b981" : "rgba(34, 211, 238, 0.95)"}
                            strokeWidth={2}
                            shadowColor={isCenterInitially ? "#10b981" : "#22d3ee"}
                            shadowBlur={6}
                            shadowOpacity={0.8}
                            listening={false}
                        />
                        <Path 
                            data="M 0 -6 L 0 6"
                            stroke={isCenterInitially ? "#10b981" : "rgba(34, 211, 238, 0.95)"}
                            strokeWidth={2}
                            shadowColor={isCenterInitially ? "#10b981" : "#22d3ee"}
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
                    <Circle x={0} y={0} r={4} fill="#22d3ee" opacity={0.8} listening={false} />
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
                        ref={rippleRef}
                        r={GAME_CONFIG.HEX_SIZE * 0.8}
                        stroke="#22d3ee"
                        strokeWidth={3}
                        opacity={0.9}
                        listening={false}
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

            {/* COMPLETED SHAPE NEON FLARE EFFECT */}
            {isFlaring && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                    <Path
                        ref={flareGlowRef}
                        data={BASE_PATH_D}
                        fill="#ffffff"
                        stroke="#ffffff"
                        strokeWidth={4}
                        shadowColor="#22d3ee"
                        shadowBlur={25}
                        shadowOpacity={1.0}
                        listening={false}
                    />
                </Group>
            )}
        </Group>
    );
});
