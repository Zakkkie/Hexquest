/*
Возникающая ошибка "Cannot convert undefined or null to object" во время
обновления дерева компонентов React-Konva чаще всего связана с тем, как
внутренний примитив сравнения свойств (reconciler) в React-Konva обрабатывает
изменения сложных свойств-объектов (таких как fillPatternScale,
fillPatternOffset или dash массивы), когда они переходят из состояния объекта в
null или undefined (или наоборот). Так как typeof null возвращает 'object',
попытка сравнить новые и старые свойства через Object.keys() приводит к
этой ошибке.

Кроме того, при сборке проекта через Vite могут возникать проблемы с циклической
зависимостью при импорте THEME_PALETTE из MapRenderer.tsx, из-за чего этот
объект временно может быть равен undefined в момент первого рендера
StoryHex.

Что было сделано для устранения ошибок:

1.  Разделение рендеринга Path: Логика <Path> в StoryHex разделена на два
    независимых элемента. Первый рендерит текстурированную плитку только
    при наличии topTexture (со стабильными значениями fillPatternScale и др.),
    второй рендерит обычный векторный шестиугольник. Это исключает передачу
    null в качестве изображений и объектов масштабирования.
2.  Безопасное значение свойства dash: Свойство dash теперь всегда принимает
    массив (передается [] вместо undefined). Это предотвращает сбои
    сравнения типов в React-Konva.
3.  Безопасный доступ к THEME_PALETTE: Добавлены проверки на существование
    палитры, предотвращающие падение при циклических импортах.
4.  Защита точек BASE_POINTS: Созданы вспомогательные функции getPointX и
    getPointY для безопасного построения фасок (bevels), что страхует от
    неопределенных индексов массива.
5.  Безопасное вычисление координат hexToPixel: Вычисления обернуты в блок
    try-catch с возвратом дефолтных координат { x: 0, y: 0 }.
6.  Исправление MiniFigureBlueprint: Добавлены дефолтные значения для shape и
    безопасный расчет границ SVG (minX, maxX, minY, maxY), предотвращающий
    появление значений Infinity при пустых массивах.

Полный исправленный код файла components/StoryBuilderComponents.tsx:
*/

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Group, Circle, Path } from 'react-konva';
import { THEME_PALETTE } from './MapRenderer.tsx';
import { textureService } from '../services/textureService.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { hexToPixel } from '../services/hexUtils.ts';
import Konva from 'konva';
import { BASE_POINTS, BASE_PATH_D } from './StoryBuilderData.ts';

export const NebulaBackground: React.FC<{ width: number; height: number }> = ({ width, height }) => {
    const groupRef = useRef<any>(null);

    const w = width || 1000;
    const h = height || 1000;

    const clouds = useMemo(() => Array.from({ length: 5 }).map((_, i) => ({
        id: i,
        x: Math.random() * (w + 200) - 100,
        y: Math.random() * (h + 200) - 100,
        radius: 300 + Math.random() * 300,
        color: ['#1e1b4b', '#312e81', '#1e3a8a', '#4c1d95', '#581c87'][i % 5],
    })), [w, h]);

    const stars = useMemo(() => Array.from({ length: 80 }).map((_, i) => ({
        id: i,
        x: Math.random() * (w + 200) - 100,
        y: Math.random() * (h + 200) - 100,
        radius: 0.5 + Math.random() * 1.5,
        opacity: 0.3 + Math.random() * 0.7,
        color: ['#ffffff', '#ffffff', '#e2e8f0', '#93c5fd', '#c084fc', '#22d3ee', '#fed7aa'][i % 7]
    })), [w, h]);

    // Tech circular radar ranges to imply spatial blueprint analysis coordinates
    const radarCircles = useMemo(() => {
        return [
            { r: 120, opacity: 0.08, dash: [4, 8] },
            { r: 280, opacity: 0.05, dash: [2, 12] },
            { r: 440, opacity: 0.03, dash: [10, 15] },
            { r: 600, opacity: 0.02, dash: [5, 20] }
        ];
    }, []);

    // Performant offline canvas caching to lock visual gradients in GPU memory
    useEffect(() => {
        if (groupRef.current) {
            try {
                // cache boundary covers entire bounds plus padding
                groupRef.current.cache({
                    x: -120,
                    y: -120,
                    width: w + 240,
                    height: h + 240,
                    pixelRatio: 1 // maximum memory efficiency
                });
            } catch (err) {
                console.warn("Could not cache NebulaBackground", err);
            }
        }
    }, [w, h, clouds, stars]);

    useEffect(() => {
        let animId: number;
        let time = 0;

        const animate = () => {
            if (groupRef.current) {
                time += 0.0003; // Extremely slow, cosmic scale motion
                
                // Slow drifting displacement
                const driftX = Math.sin(time * 1.4) * 40;
                const driftY = Math.cos(time * 1.1) * 35;
                const rotation = Math.sin(time * 0.4) * 4; // slow rotate drift

                groupRef.current.x(w / 2 + driftX);
                groupRef.current.y(h / 2 + driftY);
                groupRef.current.rotation(rotation);

                const layer = groupRef.current.getLayer();
                if (layer) {
                    layer.batchDraw();
                }
            }
            animId = requestAnimationFrame(animate);
        };

        animate();
        return () => {
            cancelAnimationFrame(animId);
        };
    }, [w, h]);

    return (
        <Group
            ref={groupRef}
            x={w / 2}
            y={h / 2}
            offsetX={w / 2}
            offsetY={h / 2}
        >
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
                    fillRadialGradientColorStops={[0, c.color, 0.6, `${c.color}22`, 1, 'transparent']}
                    opacity={0.4}
                    listening={false}
                />
            ))}

            {/* Faint high-tech ambient backdrop graphics */}
            {radarCircles.map((circle, i) => (
                <Circle
                    key={`radar-${i}`}
                    x={w / 2}
                    y={h / 2}
                    radius={circle.r}
                    stroke="#818cf8"
                    strokeWidth={1}
                    dash={circle.dash}
                    opacity={circle.opacity}
                    listening={false}
                />
            ))}

            {stars.map(s => (
                <Circle 
                    key={`s-${s.id}`} 
                    x={s.x} 
                    y={s.y} 
                    radius={s.radius} 
                    fill={s.color} 
                    opacity={s.opacity} 
                    listening={false}
                />
            ))}
        </Group>
    );
};

export const MiniFigureBlueprint: React.FC<{ 
    shape?: { q: number, r: number, lvl?: number }[], 
    cellSize?: number, 
    className?: string,
    onCellClick?: (index: number) => void,
    selectedCellIndex?: number | null,
    style?: React.CSSProperties
}> = ({ shape = [], cellSize = 6, className, onCellClick, selectedCellIndex, style }) => {
    const size = cellSize;
    const hexToPixelSmall = (q: number, r: number) => {
        const x = size * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
        const y = size * (1.5 * r);
        return { x, y };
    };

    const pixels = shape.map(pt => hexToPixelSmall(pt.q, pt.r));
    
    const xs = pixels.map(p => p.x);
    const ys = pixels.map(p => p.y);
    const minX = xs.length > 0 ? Math.min(...xs) - size - 4 : -20;
    const maxX = xs.length > 0 ? Math.max(...xs) + size + 4 : 20;
    const minY = ys.length > 0 ? Math.min(...ys) - size - 4 : -20;
    const maxY = ys.length > 0 ? Math.max(...ys) + size + 4 : 20;
    
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
    isFailedClick?: boolean,
    onClick: (q: number, r: number) => void,
    onDblClick?: (q: number, r: number) => void
}> = React.memo(({ q, r, level, isSelected, isBlueprint, blueprintLevel = 0, isEligible, isCenterInitially, isNew, canPlace, isFlaring, isFailedClick, onClick, onDblClick }) => {
    
    const px = useMemo(() => {
        try {
            return hexToPixel(q, r) || { x: 0, y: 0 };
        } catch {
            return { x: 0, y: 0 };
        }
    }, [q, r]);

    const isBuilt = level !== undefined && level >= 0;
    const isVoid = level === -999;

    if (isVoid) {
        return null;
    }
    
    const colors = useMemo(() => {
        const defaultTheme = { main: '#1e293b', light: '#334155', dark: '#0f172a', stroke: '#475569' };
        const lvlStr = level !== undefined ? String(level) : '0';
        const palette = THEME_PALETTE || {};
        const theme = palette[lvlStr] || palette['0'] || defaultTheme;
        return { 
            side: theme?.dark || '#0f172a', 
            top: theme?.main || '#1e293b', 
            stroke: theme?.stroke || '#475569',
            light: theme?.light || '#334155' 
        };
    }, [level]);

    const topTexture = useMemo(() => {
        if (level === undefined) return null;
        try {
            return textureService?.getTexture(level, q, r, undefined) || null;
        } catch {
            return null;
        }
    }, [level, q, r]);

    // Height calculation - visual depth
    const activeLvl = useMemo(() => {
        if (level !== undefined) {
            const n = Number(level);
            return isNaN(n) ? 0 : n;
        }
        if (isBlueprint) {
            const n = Number(blueprintLevel);
            return isNaN(n) ? 0 : n;
        }
        return undefined;
    }, [level, isBlueprint, blueprintLevel]);

    const isBuiltOrBlueprint = isBuilt || isBlueprint;
    const height = isBuiltOrBlueprint && activeLvl !== undefined ? (activeLvl >= 0 ? 10 + activeLvl * 10 : 10) : 0;
    const yOffset = isBuiltOrBlueprint && activeLvl !== undefined ? (activeLvl >= 0 ? -height : (Math.abs(activeLvl) - 1) * 10) : 0;
    const wallHeight = isBuiltOrBlueprint && activeLvl !== undefined ? (activeLvl >= 0 ? height : Math.abs(activeLvl) * 10) : 0;

    const groupRef = useRef<Konva.Group>(null);
    
    // Hard synchronization of raw konva properties to fix tween interruption hanging.
    useEffect(() => {
        if (groupRef.current && !isNew) {
            groupRef.current.y(px.y);
            groupRef.current.opacity(1);
        }
    }, [px.y, isNew]);

    useEffect(() => {
        if (isNew && groupRef.current) {
            const node = groupRef.current;
            const targetY = px.y;
            node.y(targetY - 60);
            node.opacity(0);
            const tween = new Konva.Tween({
                node: node,
                duration: 0.5,
                y: targetY,
                opacity: 1,
                easing: Konva.Easings.BackEaseOut
            });
            tween.play();
            return () => {
                try {
                    tween.destroy();
                } catch (e) {
                    console.warn("Safe tween destroy failed for isNew group", e);
                }
                // Ensure it ends at the target Y in case tween is destroyed early
                node.y(targetY);
                node.opacity(1);
            };
        }
    }, [isNew, px.y]);

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
                try {
                    tween.destroy();
                } catch (e) {
                    console.warn("Safe tween destroy failed for ripple", e);
                }
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
                try {
                    tween.destroy();
                } catch (e) {
                    console.warn("Safe tween destroy failed for flare glow", e);
                }
            };
        }
    }, [isFlaring]);

    // Elegant and performant pulsing outline animation for valid placement slots
    const pulseOutlineRef = useRef<Konva.Group>(null);
    useEffect(() => {
        if (isEligible && pulseOutlineRef.current) {
            const node = pulseOutlineRef.current;
            node.opacity(0.5);
            const tween = new Konva.Tween({
                node: node,
                duration: 1.4,
                opacity: 0.9,
                yoyo: true,
                loop: true,
                easing: Konva.Easings.EaseInOut
            });
            tween.play();
            return () => {
                try {
                    tween.destroy();
                } catch (e) {
                    console.warn("Safe tween destroy failed for pulse outline", e);
                }
            };
        }
    }, [isEligible]);

    // Rapid warning blink animation of red hex silhouette when failed click is triggered
    const failedClickRef = useRef<Konva.Group>(null);
    useEffect(() => {
        if (isFailedClick && failedClickRef.current) {
            const node = failedClickRef.current;
            node.opacity(1.0);
            const tween = new Konva.Tween({
                node: node,
                duration: 0.5,
                opacity: 0,
                easing: Konva.Easings.EaseOut
            });
            tween.play();
            return () => {
                try {
                    tween.destroy();
                } catch (e) {
                    console.warn("Safe tween destroy failed for failed click indicator", e);
                }
            };
        }
    }, [isFailedClick]);

    const [isHovered, setIsHovered] = useState(false);

    // Front-facing sides for isometric view (0, 1, 2, 5)
    const visibleSides = useMemo(() => {
        if (!isBuilt) return [];
        const squashedPoints = (BASE_POINTS || []).map(p => {
            if (!p) return { x: 0, y: 0 };
            return { x: p.x ?? 0, y: (p.y ?? 0) * 0.8 };
        });
        
        // Point-up hex, front facing sides are 0, 1, 2 and 5
        return [0, 1, 2, 5].map(i => {
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

    const getPointX = (index: number) => BASE_POINTS?.[index]?.x ?? 0;
    const getPointY = (index: number) => BASE_POINTS?.[index]?.y ?? 0;

    const collapseRef = useRef<Konva.Group>(null);
    useEffect(() => {
        if (collapseRef.current && !isFlaring) {
            collapseRef.current.scale({ x: 1, y: 1 });
            collapseRef.current.opacity(1);
        }
    }, [isFlaring]);

    useEffect(() => {
        if (isFlaring && collapseRef.current) {
            const node = collapseRef.current;
            const timeout = setTimeout(() => {
                const tween = new Konva.Tween({
                    node: node,
                    duration: 0.6,
                    scaleX: 0.01,
                    scaleY: 0.01,
                    opacity: 0,
                    easing: Konva.Easings.BackEaseIn
                });
                tween.play();
                (node as any).activeCollapseTween = tween;
            }, 1000);
            return () => {
                clearTimeout(timeout);
                if ((node as any).activeCollapseTween) {
                    try {
                        (node as any).activeCollapseTween.destroy();
                    } catch (e) {
                        console.warn("Err destroying activeCollapseTween", e);
                    }
                    (node as any).activeCollapseTween = null;
                }
            };
        } else if (!isFlaring && collapseRef.current) {
            const node = collapseRef.current;
            if ((node as any).activeCollapseTween) {
                try {
                    (node as any).activeCollapseTween.destroy();
                } catch (e) {
                    console.warn("Err destroying inactive activeCollapseTween", e);
                }
                (node as any).activeCollapseTween = null;
            }
            node.scale({ x: 1, y: 1 });
            node.opacity(1);
        }
    }, [isFlaring]);

    // Render base elements for all cells (removed heavy filtering optimization to always show base grid as requested)
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
            <Group ref={collapseRef} perfectDrawEnabled={false}>
                {/* 3D Sides / Walls */}
            {isBuilt && colors && visibleSides && visibleSides.length > 0 && (
                <Group y={yOffset}>
                    {visibleSides.map(side => {
                        const isLit = side.id === 1;
                        const isMild = side.id !== 0 && side.id !== 1;
                        
                        let colorStops;
                        if (isLit) {
                            colorStops = [
                                0.0, colors.top,
                                0.15, colors.top,
                                0.5, colors.side,
                                1.0, '#010410'
                            ];
                        } else if (isMild) {
                            colorStops = [
                                0.0, colors.top,
                                0.12, colors.top,
                                0.45, colors.side,
                                1.0, '#01020a'
                            ];
                        } else {
                            // Shadowed
                            colorStops = [
                                0.0, colors.top,
                                0.1, colors.side,
                                0.45, '#0c101d',
                                1.0, '#000000'
                            ];
                        }

                        return (
                            <Path
                                key={side.id}
                                data={side.data}
                                fillLinearGradientStartPoint={{ x: side.midX, y: side.minY }}
                                fillLinearGradientEndPoint={{ x: side.midX, y: side.maxY }}
                                fillLinearGradientColorStops={colorStops}
                                stroke={colors.side}
                                strokeWidth={1.5}
                                listening={false}
                                perfectDrawEnabled={false}
                                shadowForStrokeEnabled={false}
                            />
                        );
                    })}
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
                {isBuilt && topTexture ? (
                    <Path
                        key="textured-top-face"
                        data={BASE_PATH_D}
                        fillPatternImage={topTexture as any}
                        fillPatternScale={{ x: ((GAME_CONFIG && GAME_CONFIG.HEX_SIZE) || 30) / 32, y: ((GAME_CONFIG && GAME_CONFIG.HEX_SIZE) || 30) / 32 }}
                        fillPatternOffset={{ x: 32, y: 32 }}
                        fillPatternRepeat="repeat"
                        stroke="#06b6d4"
                        strokeWidth={2.0}
                        perfectDrawEnabled={false}
                        shadowForStrokeEnabled={false}
                    />
                ) : (
                    <Path
                        key="solid-top-face"
                        data={BASE_PATH_D}
                        fill={isVoid ? 'rgba(5, 5, 12, 0.98)' : (isBuilt ? colors?.top : (isCenterInitially ? 'rgba(16, 185, 129, 0.18)' : (isEligible ? 'rgba(34, 211, 238, 0.04)' : 'rgba(255,255,255,0.01)')))}
                        stroke={isVoid ? 'rgba(124, 58, 237, 0.25)' : (isBuilt ? '#06b6d4' : (isCenterInitially ? '#10b981' : (isBlueprint ? 'rgba(168, 85, 247, 0.75)' : (isEligible ? 'rgba(34, 211, 238, 0.55)' : 'rgba(255,255,255,0.075)'))))}
                        strokeWidth={isVoid ? 1.2 : (isBuilt ? 2.0 : (isCenterInitially ? 3.0 : (isBlueprint ? 1.5 : (isEligible ? 1.5 : 0.8))))}
                        perfectDrawEnabled={false}
                        shadowForStrokeEnabled={false}
                        dash={isVoid ? [3, 4] : (isEligible || isBlueprint ? [5, 4] : [])}
                    />
                )}
                
                {/* Visual plus (+) for center initially and eligible targets */}
                {!isBuilt && (isCenterInitially || isEligible) && (
                    <Group listening={false}>
                        <Path 
                            data="M -5 0 L 5 0"
                            stroke={isCenterInitially ? "#10b981" : "rgba(34, 211, 238, 0.75)"}
                            strokeWidth={1.5}
                            listening={false}
                        />
                        <Path 
                            data="M 0 -5 L 0 5"
                            stroke={isCenterInitially ? "#10b981" : "rgba(34, 211, 238, 0.75)"}
                            strokeWidth={1.5}
                            listening={false}
                        />
                    </Group>
                )}
                
                {isBuilt && colors && (
                    <>
                        {/* Bevels properly aligned with the already-offset and scaled top face */}
                        <Group perfectDrawEnabled={false}>
                            {/* Top/Light Bevel */}
                            <Path 
                                data={`M ${getPointX(2)} ${getPointY(2)} L ${getPointX(3)} ${getPointY(3)} L ${getPointX(4)} ${getPointY(4)} L ${getPointX(5)} ${getPointY(5)}`}
                                stroke="rgba(255,255,255,0.4)"
                                strokeWidth={1.5}
                                listening={false}
                                perfectDrawEnabled={false}
                            />
                            {/* Bottom/Dark Bevel */}
                            <Path 
                                data={`M ${getPointX(5)} ${getPointY(5)} L ${getPointX(0)} ${getPointY(0)} L ${getPointX(1)} ${getPointY(1)} L ${getPointX(2)} ${getPointY(2)}`}
                                stroke="rgba(0,0,0,0.5)"
                                strokeWidth={1.5}
                                listening={false}
                                perfectDrawEnabled={false}
                            />
                        </Group>
                    </>
                )}
            </Group>

            {/* Empty Holographic blueprint coordinate beacon inside blueprint ghost targets (Simplified to a gorgeous clean coordinate beacon) */}
            {!isBuilt && isBlueprint && !isCenterInitially && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                    <Circle 
                        x={0} 
                        y={0} 
                        r={5} 
                        fill={(THEME_PALETTE && THEME_PALETTE[String(blueprintLevel)]?.main) || 'rgba(168, 85, 247, 0.6)'} 
                        stroke="#ffffff"
                        strokeWidth={1.2}
                        shadowColor={(THEME_PALETTE && THEME_PALETTE[String(blueprintLevel)]?.main) || '#a855f7'}
                        shadowBlur={6}
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

            {/* Glowing Pulsing Helper for Placement/Upgrade (Decluttered to a clean built-state overlay only) */}
            {isEligible && !isCenterInitially && isBuilt && (
                <Group ref={pulseOutlineRef} y={yOffset} scaleY={0.8} perfectDrawEnabled={false} listening={false}>
                    <Path
                        data={BASE_PATH_D}
                        scaleX={0.96}
                        scaleY={0.96}
                        fill="rgba(34, 211, 238, 0.05)"
                        stroke={canPlace ? "#22d3ee" : "#a855f7"}
                        strokeWidth={1.5}
                        listening={false}
                    />
                </Group>
            )}

            {/* Failed Click Overlay / Beautiful Flashing Red Warning */}
            {isFailedClick && (
                <Group ref={failedClickRef} y={yOffset} scaleY={0.8} perfectDrawEnabled={false} listening={false}>
                    <Path
                        data={BASE_PATH_D}
                        fill="rgba(239, 68, 68, 0.55)"
                        stroke="#ef4444"
                        strokeWidth={3}
                        shadowColor="#ef4444"
                        shadowBlur={18}
                        shadowOpacity={1.0}
                        listening={false}
                    />
                </Group>
            )}

            {/* Selection Outline (Glows as a solid, high-contrast, premium selection ring) */}
            {isSelected && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                    <Path
                        data={BASE_PATH_D}
                        scaleX={0.95}
                        scaleY={0.95}
                        stroke="#d946ef"
                        strokeWidth={2.5}
                        opacity={0.95}
                        shadowColor="#d946ef"
                        shadowBlur={8}
                        listening={false}
                    />
                </Group>
            )}

            {/* Place Block isometric ripple effect */}
            {isNew && (
                <Group y={yOffset} scaleY={0.8} perfectDrawEnabled={false}>
                    <Circle
                        ref={rippleRef}
                        r={((GAME_CONFIG && GAME_CONFIG.HEX_SIZE) || 30) * 0.8}
                        stroke="#22d3ee"
                        strokeWidth={3}
                        opacity={0.9}
                        listening={false}
                    />
                </Group>
            )}

            {/* Placement / Hover Overlay Feedback */}
            {isHovered && (
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
        </Group>
    );
});
