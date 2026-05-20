import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Stage, Layer, Group, Path, Rect, Circle } from 'react-konva';
import { useGameStore } from '../store.ts';
import { getHexKey, hexToPixel } from '../services/hexUtils.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { THEME_PALETTE } from './MapRenderer.tsx';
import { textureService } from '../services/textureService.ts';
import { ArrowLeft, BookOpen, Crown, ChevronRight, Settings, Volume2, VolumeX, Music, Languages, HelpCircle, Info, Sparkles, Eye, EyeOff, ZoomIn, ZoomOut, Compass, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Konva from 'konva';

const DEG_TO_RAD = Math.PI / 180;

// Precompute hex vertices for volume drawing
const BASE_POINTS: { x: number; y: number }[] = [];
for (let i = 0; i < 6; i++) {
    const angle = (60 * i + 30) * DEG_TO_RAD;
    BASE_POINTS.push({ x: Math.cos(angle) * GAME_CONFIG.HEX_SIZE, y: Math.sin(angle) * GAME_CONFIG.HEX_SIZE });
}

const TARGET_SHAPE = [
    {q: 0, r: 0},
    {q: 1, r: 0}, {q: 0, r: 1}, {q: -1, r: 1}, {q: -1, r: 0}, {q: 0, r: -1}, {q: 1, r: -1}, // Ring 1
    {q: 0, r: -2}, {q: -2, r: 2}, {q: 2, r: 0} // 3 points of Ring 2
];

const TARGET_KEYS = new Set(TARGET_SHAPE.map(c => getHexKey(c.q, c.r)));

const isValidPlacement = (currentLvl: number | undefined, selectedLvl: number | null, isTarget: boolean) => {
    if (selectedLvl === null) return false;
    if (!isTarget) return false;
    if (currentLvl === undefined) {
        return selectedLvl === 0;
    } else {
        return Math.abs(currentLvl - selectedLvl) === 1;
    }
};

const STORY_STEPS = [
    { reqLevel: 0, reqCount: 10, title: "Пробуждение Архитектора", text: "Вы стоите перед пустой бездной. Чтобы восстановить этот мир, вам необходимо заложить фундамент. Выложите 10 гексов 0 уровня. Фигура скрыта во тьме воображения, нащупайте ее форму." },
    { reqLevel: 1, reqCount: 10, altReqLevel: -1, title: "Структуры Власти", text: "Фундамент заложен. Теперь вам нужно расти ввысь, либо копать вглубь. Возведите 10 гексов 1-го (или минус 1-го) уровня на существующем фундаменте." },
    { reqLevel: 2, reqCount: 10, altReqLevel: -2, title: "Резонанс", text: "Реальность начинает обретать форму. Необходимо закрепить этот успех. Поднимите 10 гексов до 2-го (или минус 2-го) уровня." },
    { reqLevel: 3, reqCount: 5, altReqLevel: -3, title: "Апекс-Синтез", text: "Мир почти собран. Осталось внести последние мощные элементы. Выложите 5 гексов 3-го (или минус 3-го) уровня для завершения сборки." }
];

const getBasePathD = () => {
    let d = `M ${BASE_POINTS[0].x} ${BASE_POINTS[0].y * 0.8}`;
    for (let i = 1; i < 6; i++) d += ` L ${BASE_POINTS[i].x} ${BASE_POINTS[i].y * 0.8}`;
    return d + " Z";
};
const SQUASHED_BASE_PATH_D = getBasePathD();

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

const StoryHex: React.FC<{ 
    q: number, 
    r: number, 
    level: number | undefined, 
    isSelected: boolean,
    isTarget: boolean,
    isEligible: boolean,
    isNew?: boolean,
    onClick: (q: number, r: number) => void 
}> = React.memo(({ q, r, level, isSelected, isTarget, isEligible, isNew, onClick }) => {
    const px = useMemo(() => hexToPixel(q, r), [q, r]);
    const isBuilt = level !== undefined;
    
    const colors = useMemo(() => {
        if (level === undefined) return null;
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

    // Front-facing sides for isometric view
    const visibleSides = useMemo(() => {
        if (!isBuilt) return null;
        const squashedPoints = BASE_POINTS.map(p => ({ x: p.x, y: p.y * 0.8 }));
        
        // Point-up hex, front sides are 1,2,3,4
        return [1, 2, 3, 4].map(i => {
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
    }, [isBuilt, wallHeight, level]);

    return (
        <Group 
            ref={groupRef} 
            x={px.x} 
            y={px.y} 
            onClick={() => onClick(q, r)} 
            onTouchStart={() => onClick(q, r)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            perfectDrawEnabled={false}
            transformsEnabled="position"
        >
            {/* 3D Sides */}
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
                                strokeWidth={0.5}
                                opacity={1 - ((side.id - 1) % 4) * 0.15}
                                listening={false}
                                perfectDrawEnabled={false}
                                shadowForStrokeEnabled={false}
                            />
                    ))}
                </Group>
            )}

            {/* Top Face */}
            <Group y={yOffset}>
                <Path
                    data={SQUASHED_BASE_PATH_D}
                    fillPatternImage={topTexture as any}
                    fill={topTexture ? undefined : (isBuilt ? colors?.top : (isHovered ? 'rgba(99, 102, 241, 0.35)' : (isTarget ? 'rgba(99, 102, 241, 0.08)' : 'rgba(255,255,255,0.01)')))}
                    fillPatternScale={{ x: GAME_CONFIG.HEX_SIZE / 32, y: GAME_CONFIG.HEX_SIZE / 32 }}
                    fillPatternOffset={{ x: 32, y: 32 }}
                    fillPatternRepeat="repeat"
                    stroke={isBuilt ? colors?.stroke : (isHovered ? 'rgba(34, 211, 238, 0.8)' : (isTarget ? 'rgba(99, 102, 241, 0.35)' : 'rgba(255,255,255,0.06)'))}
                    strokeWidth={isBuilt ? 2 : (isHovered ? 2 : 1)}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                />
                {isBuilt && colors && (
                    <>
                        {/* Top/Light Bevel */}
                        <Path 
                            data={`M ${BASE_POINTS[2].x} ${BASE_POINTS[2].y * 0.8} L ${BASE_POINTS[3].x} ${BASE_POINTS[3].y * 0.8} L ${BASE_POINTS[4].x} ${BASE_POINTS[4].y * 0.8} L ${BASE_POINTS[5].x} ${BASE_POINTS[5].y * 0.8}`}
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth={2}
                            listening={false}
                            perfectDrawEnabled={false}
                        />
                        {/* Bottom/Dark Bevel */}
                        <Path 
                            data={`M ${BASE_POINTS[5].x} ${BASE_POINTS[5].y * 0.8} L ${BASE_POINTS[0].x} ${BASE_POINTS[0].y * 0.8} L ${BASE_POINTS[1].x} ${BASE_POINTS[1].y * 0.8} L ${BASE_POINTS[2].x} ${BASE_POINTS[2].y * 0.8}`}
                            stroke="rgba(0,0,0,0.6)"
                            strokeWidth={2}
                            listening={false}
                            perfectDrawEnabled={false}
                        />
                    </>
                )}
            </Group>

            {/* Empty Holographic blueprint decoration inside targets */}
            {!isBuilt && isTarget && (
                <Group y={yOffset}>
                    <Path
                        data={SQUASHED_BASE_PATH_D}
                        scaleX={0.75}
                        scaleY={0.75}
                        stroke={isHovered ? 'rgba(34, 211, 238, 0.5)' : 'rgba(99, 102, 241, 0.22)'}
                        strokeWidth={1}
                        dash={[3, 4]}
                        listening={false}
                    />
                    <Circle x={0} y={0} r={2} fill={isHovered ? 'rgb(34, 211, 238)' : 'rgba(99, 102, 241, 0.4)'} listening={false} />
                    <Circle x={-14} y={0} r={1.2} fill="rgba(99, 102, 241, 0.2)" listening={false} />
                    <Circle x={14} y={0} r={1.2} fill="rgba(99, 102, 241, 0.2)" listening={false} />
                </Group>
            )}

            {/* Pulse Build Indicator for Eligible Placement Cells */}
            {isEligible && (
                <Group y={yOffset}>
                    <Path
                        data={SQUASHED_BASE_PATH_D}
                        scaleX={1.12}
                        scaleY={1.12}
                        stroke={isHovered ? '#ec4899' : '#22d3ee'}
                        strokeWidth={2}
                        dash={[5, 4]}
                        opacity={0.9}
                        shadowColor={isHovered ? '#ec4899' : '#22d3ee'}
                        shadowBlur={isHovered ? 12 : 8}
                        shadowOpacity={0.5}
                        listening={false}
                    />
                    <Group scaleX={0.65} scaleY={0.65} y={-1} listening={false}>
                        <Path 
                            data="M -8 0 L 8 0 M 0 -8 L 0 8" 
                            stroke="#22d3ee" 
                            strokeWidth={2} 
                            opacity={0.8} 
                        />
                    </Group>
                </Group>
            )}

            {/* Selection Outline */}
            {isSelected && (
                <Path
                    y={yOffset}
                    data={SQUASHED_BASE_PATH_D}
                    scaleX={1.18}
                    scaleY={1.18}
                    stroke="#a855f7"
                    strokeWidth={2.5}
                    dash={[4, 4]}
                    opacity={0.8}
                    shadowColor="#a855f7"
                    shadowBlur={10}
                    listening={false}
                    perfectDrawEnabled={false}
                />
            )}

            {/* Place Block Isometric Ripple Particle Effect */}
            {isNew && (
                <Circle
                    y={yOffset}
                    r={GAME_CONFIG.HEX_SIZE * 0.8}
                    stroke="#ffffff"
                    strokeWidth={3}
                    opacity={0.9}
                    scaleX={1}
                    scaleY={0.8}
                    listening={false}
                    ref={(node) => {
                        if (node) {
                            new Konva.Tween({
                                node: node,
                                duration: 0.65,
                                scaleX: 1.85,
                                scaleY: 1.48,
                                opacity: 0,
                                strokeWidth: 0.5,
                                easing: Konva.Easings.EaseOut
                            }).play();
                        }
                    }}
                />
            )}
        </Group>
    );
});

const StoryBuilderView: React.FC = () => {
    const setCampaignMode = useGameStore(state => state.setCampaignMode);
    const setUIState = useGameStore(state => state.setUIState);
    const playUiSound = useGameStore(state => state.playUiSound);
    const minedInSessionHexes = useGameStore(state => state.minedInSessionHexes);
    const storyMap = useGameStore(state => state.storyMap);
    const placeStoryHex = useGameStore(state => state.placeStoryHex);
    const storyMilestone = useGameStore(state => state.storyMilestone);
    const setStoryMilestone = useGameStore(state => state.setStoryMilestone);
    const language = useGameStore(state => state.language);
    const setLanguage = useGameStore(state => state.setLanguage);
    const isMusicMuted = useGameStore(state => state.isMusicMuted);
    const isSfxMuted = useGameStore(state => state.isSfxMuted);
    const toggleMusic = useGameStore(state => state.toggleMusic);
    const toggleSfx = useGameStore(state => state.toggleSfx);

    const [stageSize, setStageSize] = useState({ width: window.innerWidth, height: window.innerHeight });
    const [cameraPos, setCameraPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 30 });
    const [zoomScale, setZoomScale] = useState(window.innerWidth < 768 ? 0.75 : 1.1);
    const [isNarrativeCollapsed, setIsNarrativeCollapsed] = useState(window.innerWidth < 768);
    const [isUiHidden, setIsUiHidden] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const [isInitialHintDismissed, setIsInitialHintDismissed] = useState(false);
    const [lastPlacedKey, setLastPlacedKey] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                const w = containerRef.current.clientWidth;
                const h = containerRef.current.clientHeight;
                setStageSize({ width: w, height: h });
                setCameraPos({ x: w / 2, y: h / 2 - (w < 768 ? 20 : 50) });
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Check Milestones
    useEffect(() => {
        const currentStep = STORY_STEPS[storyMilestone];
        if (!currentStep) return;

        let count = 0;
        for (const lvl of Object.values(storyMap)) {
            if (lvl === currentStep.reqLevel || lvl === currentStep.altReqLevel) count++;
        }

        if (count >= currentStep.reqCount) {
            setStoryMilestone(storyMilestone + 1);
            playUiSound('SUCCESS');
        }
    }, [storyMap, storyMilestone, setStoryMilestone, playUiSound]);

    // Generate grid points for building (-7 to 7 for buffer)
    const gridPoints = useMemo(() => {
        const points = [];
        const RADIUS = 6;
        for (let q = -RADIUS; q <= RADIUS; q++) {
            for (let r = -RADIUS; r <= RADIUS; r++) {
                if (Math.abs(q + r) <= RADIUS) {
                    const px = hexToPixel(q, r);
                    points.push({ q, r, x: px.x, y: px.y });
                }
            }
        }
        
        // Depth Sort: primarily by Y coordinate (px.y) for perfect isometric stacking
        // and incorporating level for z-index effect
        return points.sort((a, b) => {
            // Core coordinate-based depth
            const depthA = (a.y * 10) + (a.x * 0.1);
            const depthB = (b.y * 10) + (b.x * 0.1);
            
            // Adjust depth if one is much higher than the other and they are close
            // This prevents tall hexes from being drawn UNDER things that should be behind them but are obscured
            return depthA - depthB;
        });
    }, [storyMap]);

    const stateRef = useRef({ storyMap, selectedLevel, minedInSessionHexes });
    useEffect(() => {
        stateRef.current = { storyMap, selectedLevel, minedInSessionHexes };
    }, [storyMap, selectedLevel, minedInSessionHexes]);

    const handleCellClick = useCallback((q: number, r: number) => {
        if (isPanning.current) return;
        const { storyMap: currentStoryMap, selectedLevel: currentSelectedLevel, minedInSessionHexes: currentMinedHexes } = stateRef.current;
        const key = getHexKey(q, r);
        
        if (currentSelectedLevel === null) {
            return; 
        }

        const count = currentMinedHexes[currentSelectedLevel] || 0;
        if (count <= 0) {
            playUiSound('ERROR');
            return;
        }

        if (!TARGET_KEYS.has(key)) {
            playUiSound('ERROR');
            return;
        }

        const currentLevel = currentStoryMap[key];

        // Placement Rules
        if (currentLevel === undefined) {
            if (currentSelectedLevel !== 0) {
                playUiSound('ERROR');
                return;
            }
            placeStoryHex(q, r, currentSelectedLevel);
            setLastPlacedKey(key);
            playUiSound('CLICK');
        } else {
            const diff = Math.abs(currentLevel - currentSelectedLevel);
            if (diff !== 1 && currentLevel !== currentSelectedLevel) {
                playUiSound('ERROR');
                return; 
            }
            if (currentLevel === currentSelectedLevel) {
                 playUiSound('ERROR');
                 return;
            }
            placeStoryHex(q, r, currentSelectedLevel);
            setLastPlacedKey(key);
            playUiSound('CLICK');
        }
    }, [placeStoryHex, playUiSound]);

    const isPanning = useRef(false);
    const handleDragStart = () => { isPanning.current = true; };
    const handleDragEnd = (e: any) => { 
        setCameraPos({ x: e.target.x(), y: e.target.y() });
        setTimeout(() => { isPanning.current = false; }, 50); 
    };

    const handleZoomIn = () => {
        setZoomScale(prev => Math.min(2.0, prev + 0.15));
        playUiSound('CLICK');
    };

    const handleZoomOut = () => {
        setZoomScale(prev => Math.max(0.4, prev - 0.15));
        playUiSound('CLICK');
    };

    const handleResetCamera = () => {
        const w = containerRef.current?.clientWidth || window.innerWidth;
        const h = containerRef.current?.clientHeight || window.innerHeight;
        setCameraPos({ x: w / 2, y: h / 2 - (w < 768 ? 20 : 50) });
        setZoomScale(w < 768 ? 0.75 : 1.1);
        playUiSound('CLICK');
    };

    return (
        <div ref={containerRef} className="absolute inset-0 bg-[#020617] flex flex-col font-sans overflow-hidden">
            {/* CANVAS */}
            <div className="absolute inset-0 z-0">
                <Stage 
                    width={stageSize.width} 
                    height={stageSize.height}
                >
                    <Layer listening={false}>
                        <NebulaBackground width={stageSize.width} height={stageSize.height} />
                        {/* Vignette Effect */}
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
                            // Boundary logic adjusted for zoom scale
                            const BOUND_X = stageSize.width * 0.7 * Math.max(1, zoomScale);
                            const BOUND_Y = stageSize.height * 0.7 * Math.max(1, zoomScale);
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
                                const isTarget = TARGET_KEYS.has(key);
                                
                                return (
                                    <StoryHex
                                        key={key}
                                        q={coord.q}
                                        r={coord.r}
                                        level={lvl}
                                        isTarget={isTarget}
                                        isEligible={isValidPlacement(lvl, selectedLevel, isTarget)}
                                        isSelected={lvl === selectedLevel}
                                        isNew={lastPlacedKey === key}
                                        onClick={handleCellClick}
                                    />
                                );
                            })}
                        </Group>
                    </Layer>
                </Stage>
            </div>
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between overflow-hidden p-4 md:p-8">
                
                {/* TOP HEADER STATUS */}
                <motion.div 
                    animate={{ y: isUiHidden ? -100 : 0, opacity: isUiHidden ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                    className="flex justify-between items-center w-full pointer-events-auto"
                >
                    <div className="flex items-center gap-2 md:gap-3">
                        <button 
                            onClick={() => { playUiSound('CLICK'); setUIState('MENU'); }}
                            className="flex items-center justify-center w-10 h-10 bg-slate-900/90 border border-white/10 rounded-2xl hover:bg-slate-800 text-white transition-all shadow-[0_0_20px_rgba(0,0,0,0.5)] backdrop-blur-md hover:border-indigo-500/50"
                        >
                            <ArrowLeft className="w-5 h-5" /> 
                        </button>

                        <div className="bg-slate-900/95 border border-white/10 rounded-2xl px-3 py-1.5 md:px-4 md:py-2 flex items-center gap-2 backdrop-blur-md shadow-2xl">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                            <div className="flex flex-col">
                                <span className="text-[8px] text-slate-400 tracking-wider font-bold leading-none mb-0.5">
                                    {language === 'RU' ? 'РЕЖИМ СИНХРОНИЗАЦИИ' : 'SYNCHRONIZER MATRIX'}
                                </span>
                                <span className="text-white font-black uppercase text-[10px] md:text-xs">
                                    {language === 'RU' ? 'ГЛАВА' : 'CHAPTER'} {storyMilestone + 1}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 relative">
                        {/* Settings Button & Popover */}
                        <div className="relative">
                            <button 
                                onClick={() => { playUiSound('CLICK'); setIsSettingsOpen(!isSettingsOpen); }}
                                className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center backdrop-blur-xl border rounded-xl transition-all shadow-lg active:scale-95 ${
                                    isSettingsOpen 
                                        ? 'bg-slate-800 border-indigo-500/50 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]' 
                                        : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:text-white'
                                }`}
                                title={language === 'RU' ? 'Настройки и Правила' : 'Settings & Rules'}
                            >
                                <Settings className={`w-5 h-5 ${isSettingsOpen ? 'rotate-90' : ''} transition-transform duration-500`} />
                            </button>

                            <AnimatePresence>
                                {isSettingsOpen && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                                        className="absolute top-full right-0 mt-2 p-3 bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col gap-2 min-w-[180px] z-[60] origin-top-right font-sans"
                                    >
                                        {/* Unified Vector Rules Button inside Settings Popover */}
                                        <button 
                                            onClick={() => { playUiSound('CLICK'); setIsHelpOpen(true); setIsSettingsOpen(false); }}
                                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white transition-all w-full text-left font-black uppercase text-[10px] tracking-[0.15em] shadow-sm active:scale-95"
                                        >
                                            <HelpCircle className="w-4 h-4 shrink-0" />
                                            <span>{language === 'RU' ? 'Физика Векторов' : 'Vector Rules'}</span>
                                        </button>

                                        <div className="h-px bg-white/5 my-0.5" />

                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => { playUiSound('CLICK'); toggleMusic(); }}
                                                className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isMusicMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-400'}`}
                                                title={language === 'RU' ? 'Музыка' : 'Music'}
                                            >
                                                {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                                            </button>
                                            <button 
                                                onClick={() => { playUiSound('CLICK'); toggleSfx(); }}
                                                className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isSfxMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'}`}
                                                title={language === 'RU' ? 'Звуки' : 'Sounds'}
                                            >
                                                {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <div className="h-px bg-white/5 my-0.5" />

                                        <div className="px-1 py-1 flex flex-col gap-1.5">
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

                        <div className="bg-slate-950/50 text-[10px] text-indigo-400 px-3 py-1.5 rounded-xl border border-indigo-500/20 font-mono tracking-widest hidden lg:block">
                            COORD: [Q, R] ISOMETRIC_Z
                        </div>
                    </div>
                </motion.div>

                {/* HELPER MATRIX STATUS AND BLOCK SELECTOR DOCK */}
                <motion.div 
                    animate={{ y: isUiHidden ? -180 : 0, opacity: isUiHidden ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                    className="w-full flex flex-col items-center gap-2 mt-2 pointer-events-auto max-w-xl mx-auto md:max-w-2xl"
                >
                    
                    {/* Active Instruction Bar describing placement validation */}
                    <AnimatePresence mode="wait">
                        {selectedLevel !== null && (
                            <motion.div 
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="w-full bg-slate-950/90 border border-cyan-500/30 rounded-xl px-3 py-1.5 backdrop-blur-md shadow-lg flex items-center gap-2"
                            >
                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                                <p className="text-[9px] md:text-xs text-cyan-300 font-medium leading-snug">
                                    {language === 'RU' 
                                        ? selectedLevel === 0 
                                            ? "Гекс 0 уровня (Фундамент) можно выкладывать на любые свободные контурные ячейки."
                                            : `Блок уровня ${selectedLevel} требует для размещения смежные блоки с перепадом высоты ровно в 1 уровень.`
                                        : selectedLevel === 0
                                            ? "Level 0 block (Foundation) can be laid onto any available template paths."
                                            : `Level ${selectedLevel} block requires placing onto adjacent structures with exactly 1 level difference.`}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Cyber Dock (Fluid and scrollable horizontally for any amount of blocks) */}
                    <div className="w-full bg-slate-900/90 border border-white/10 rounded-2xl md:rounded-3xl p-2 md:p-3.5 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-indigo-500/20 to-transparent" />
                        
                        <div className="flex sm:flex-row flex-col justify-between items-stretch sm:items-center gap-2 md:gap-4">
                            <div className="flex flex-col">
                                <span className="text-[7.5px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                    <Sparkles className="w-3 h-3 text-indigo-400" />
                                    {language === 'RU' ? 'ХРАНИЛИЩЕ ДОБЫТЫХ ФРАГМЕНТОВ' : 'EXTRACTED FRAGMENTS STORAGE'}
                                </span>
                                <span className="text-[9px] md:text-xs text-slate-300 font-bold hidden sm:block">
                                    {language === 'RU' ? 'Выберите блок, затем кликните по мишени на поле:' : 'Select a block to deploy onto field targets:'}
                                </span>
                            </div>

                            {/* Dock Items */}
                            {Object.keys(minedInSessionHexes).length === 0 ? (
                                <span className="text-xs font-black text-slate-500 uppercase tracking-widest italic animate-pulse py-1">
                                    {language === 'RU' ? 'Секторы пусты (играйте уровни)' : 'Matrix blank (complete levels)'}
                                </span>
                            ) : (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-full py-1">
                                    {Object.entries(minedInSessionHexes).sort((a,b) => Number(a[0]) - Number(b[0])).map(([level, count]) => {
                                        const lvl = Number(level);
                                        const isSelected = selectedLevel === lvl;
                                        const hexCol = lvl < 0 ? '#4338ca' : (lvl === 0 ? '#475569' : (lvl === 1 ? '#059669' : (lvl === 2 ? '#d97706' : '#dc2626')));
                                        if (count <= 0) return null;

                                        return (
                                            <motion.button
                                                key={lvl}
                                                whileHover={{ scale: 1.05 }}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => { playUiSound('CLICK'); setSelectedLevel(isSelected ? null : lvl); }}
                                                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all relative ${isSelected ? 'bg-indigo-600/30 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.25)]' : 'bg-slate-950/60 border-white/5 hover:border-indigo-500/30'}`}
                                            >
                                                <div className="w-3 h-3 rotate-12 relative flex items-center justify-center rounded-sm" style={{ backgroundColor: hexCol }}>
                                                    <span className="text-[7px] text-white/50 font-black absolute">{lvl}</span>
                                                </div>
                                                <div className="flex flex-col items-start leading-none gap-0.5">
                                                    <span className="text-[7.5px] text-slate-400 uppercase font-black tracking-wider">
                                                        {lvl === 0 ? (language === 'RU' ? 'Почва' : 'Ground') : (lvl < 0 ? (language === 'RU' ? 'Шахта' : 'Depth') : (language === 'RU' ? 'Пик' : 'Peak'))}
                                                    </span>
                                                    <span className="text-[10px] font-black text-white">x{count}</span>
                                                </div>
                                                {isSelected && (
                                                    <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-ping" />
                                                )}
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </motion.div>

                {/* IMMERSIVE COMPASS & ZOOM DECK CONTROLS */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 z-30 pointer-events-auto flex flex-col gap-2 bg-slate-900/90 border border-white/10 rounded-2xl p-2 backdrop-blur-md shadow-2xl animate-fade-in">
                    <button 
                        onClick={handleZoomIn}
                        title={language === 'RU' ? 'Приблизить' : 'Zoom In'}
                        className="w-9 h-9 bg-slate-950/40 border border-white/5 hover:bg-indigo-600 hover:text-white rounded-xl flex items-center justify-center text-slate-300 transition-all shadow-sm"
                    >
                        <ZoomIn className="w-4.5 h-4.5" />
                    </button>
                    <button 
                        onClick={handleZoomOut}
                        title={language === 'RU' ? 'Отдалить' : 'Zoom Out'}
                        className="w-9 h-9 bg-slate-950/40 border border-white/5 hover:bg-indigo-600 hover:text-white rounded-xl flex items-center justify-center text-slate-300 transition-all shadow-sm"
                    >
                        <ZoomOut className="w-4.5 h-4.5" />
                    </button>
                    <button 
                        onClick={handleResetCamera}
                        title={language === 'RU' ? 'Сбросить обзор' : 'Reset Focus'}
                        className="w-9 h-9 bg-slate-950/40 border border-white/5 hover:bg-indigo-600 hover:text-white rounded-xl flex items-center justify-center text-slate-300 transition-all shadow-sm"
                    >
                        <Compass className="w-4.5 h-4.5" />
                    </button>
                    <div className="h-px bg-white/10 mx-1" />
                    <button 
                        onClick={() => { playUiSound('CLICK'); setIsUiHidden(!isUiHidden); }}
                        title={isUiHidden ? (language === 'RU' ? 'Показать интерфейс' : 'Show UI') : (language === 'RU' ? 'Скрыть интерфейс' : 'Hide UI')}
                        className={`w-9 h-9 border rounded-xl flex items-center justify-center transition-all ${isUiHidden ? 'bg-cyan-500 border-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]' : 'bg-slate-950/40 border-white/5 hover:bg-indigo-600 hover:text-white text-slate-300'}`}
                    >
                        {isUiHidden ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                    </button>
                </div>

                {/* BOTTOM CONTENT - Narrative & Settings Container */}
                <div className="mt-auto flex md:flex-row flex-col items-stretch md:items-end justify-between gap-4 pointer-events-none pt-4 w-full">
                    
                    {/* NARRATIVE CONSTRUCT PANEL */}
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ 
                            y: isUiHidden ? 100 : 0, 
                            opacity: isUiHidden ? 0 : 1,
                            pointerEvents: isUiHidden ? 'none' : 'auto'
                        }}
                        transition={{ duration: 0.3 }}
                        className="bg-slate-950/95 border border-white/10 rounded-2xl w-full max-w-[calc(100vw-32px)] md:max-w-sm lg:max-w-md shadow-2xl backdrop-blur-3xl flex flex-col overflow-hidden pointer-events-auto p-4 md:p-5 relative"
                    >
                        {/* Dots Chapter Indicator */}
                        <div className="absolute top-4 right-4 flex gap-1">
                            {STORY_STEPS.map((_, i) => (
                                <div key={i} className={`w-1 h-1 rounded-full transition-all duration-500 ${i < storyMilestone ? 'bg-indigo-500' : (i === storyMilestone ? 'bg-gradient-to-r from-cyan-400 to-indigo-500 w-3' : 'bg-slate-800')}`} />
                            ))}
                        </div>

                        <AnimatePresence mode="wait">
                        {!isNarrativeCollapsed ? (
                            <motion.div
                                key={`expanded-${storyMilestone}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="flex flex-col"
                            >
                                <div className="flex justify-between items-start mb-1 pr-12">
                                    <span className="text-[7.5px] font-black text-indigo-400 uppercase tracking-widest">
                                        {language === 'RU' ? 'ЗАДАЧА НА ГЛАВУ' : 'CHAPTER OBJECTIVE'}
                                    </span>
                                    <button 
                                        onClick={() => { playUiSound('CLICK'); setIsNarrativeCollapsed(true); }}
                                        className="text-[8px] font-black text-cyan-400 hover:text-cyan-300 uppercase underline pointer-events-auto flex items-center gap-0.5 animate-pulse"
                                    >
                                        <ChevronDown className="w-3.5 h-3.5" />
                                        <span>{language === 'RU' ? 'СВЕРНУТЬ' : 'COLLAPSE'}</span>
                                    </button>
                                </div>

                                {STORY_STEPS[storyMilestone] ? (
                                    <>
                                        <h3 className="text-xs md:text-sm font-black text-white uppercase tracking-tight mb-1 pr-12 leading-tight">
                                            {STORY_STEPS[storyMilestone].title}
                                        </h3>
                                        
                                        <p className="text-slate-400 text-[10px] md:text-xs leading-relaxed mb-3 font-medium italic opacity-95">
                                            "{STORY_STEPS[storyMilestone].text}"
                                        </p>
                                        
                                        <div className="flex items-center gap-3">
                                            <div className="flex-1 font-sans">
                                                <div className="flex justify-between text-[8px] md:text-[9px] font-black font-mono text-cyan-400 mb-1 uppercase tracking-widest">
                                                    <span>{language === 'RU' ? 'ДИСПЕРСИЯ СЕТКИ' : 'MATRIX ALIGNMENT'}</span>
                                                    <span className="bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/20">
                                                        {Object.values(storyMap).filter(l => l === STORY_STEPS[storyMilestone].reqLevel || l === STORY_STEPS[storyMilestone].altReqLevel).length} / {STORY_STEPS[storyMilestone].reqCount}
                                                    </span>
                                                </div>
                                                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                                                    <motion.div 
                                                        className="h-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.6)]"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${Math.min(100, Math.floor((Object.values(storyMap).filter(l => l === STORY_STEPS[storyMilestone].reqLevel || l === STORY_STEPS[storyMilestone].altReqLevel).length / STORY_STEPS[storyMilestone].reqCount) * 100))}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Action Button */}
                                            <button 
                                                onClick={() => { 
                                                    playUiSound('CLICK'); 
                                                    if (Object.keys(minedInSessionHexes).length === 0) {
                                                        setCampaignMode('LEVELS');
                                                        setUIState('CAMPAIGN_MAP');
                                                    }
                                                }}
                                                className="w-10 h-10 bg-indigo-600 hover:bg-slate-800 text-white rounded-2xl flex items-center justify-center transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400/50 grow-0 shrink-0 hover:border-indigo-500"
                                            >
                                                <ChevronRight className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="py-2 flex items-center gap-3 block w-full">
                                        <Crown className="w-6 h-6 text-amber-400 animate-bounce" />
                                        <div className="flex flex-col font-sans">
                                            <h3 className="text-xs md:text-sm font-black text-amber-400 uppercase tracking-tight">
                                                {language === 'RU' ? 'ПРОСТРАНСТВО СТАБИЛИЗИРОВАНО' : 'CHRONOS SYNCHRONIZED'}
                                            </h3>
                                            <p className="text-[9px] text-amber-200/50 italic font-medium">
                                                {language === 'RU' ? 'Сектор Небула полностью спроектирован.' : 'Nebula sector successfully aligned.'}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key={`collapsed-${storyMilestone}`}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="flex justify-between items-center pr-12 w-full font-sans pointer-events-auto"
                            >
                                <div className="flex flex-col">
                                    <span className="text-[7px] font-black text-indigo-400 uppercase tracking-widest leading-none mb-1">
                                        {language === 'RU' ? 'ЗАДАЧА' : 'OBJECTIVE'}
                                    </span>
                                    <h3 className="text-[10px] md:text-xs font-black text-white uppercase tracking-tight line-clamp-1 pr-4">
                                        {STORY_STEPS[storyMilestone] ? STORY_STEPS[storyMilestone].title : (language === 'RU' ? 'СТАБИЛИЗИРОВАНО' : 'ALIGNED')}
                                    </h3>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    {STORY_STEPS[storyMilestone] && (
                                        <span className="bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-500/30 text-[9px] font-black font-mono text-cyan-400">
                                            {Object.values(storyMap).filter(l => l === STORY_STEPS[storyMilestone].reqLevel || l === STORY_STEPS[storyMilestone].altReqLevel).length}/{STORY_STEPS[storyMilestone].reqCount}
                                        </span>
                                    )}
                                    <button 
                                        onClick={() => { playUiSound('CLICK'); setIsNarrativeCollapsed(false); }}
                                        className="text-[8px] font-black text-cyan-400 hover:text-cyan-300 uppercase underline flex items-center gap-0.5 animate-pulse"
                                    >
                                        <ChevronUp className="w-3.5 h-3.5" />
                                        <span>{language === 'RU' ? 'ОБЗОР' : 'EXPAND'}</span>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            {/* HIGH TECH INTERACTIVE VECTOR GUIDELINES MANUAL (Rulebook Modal) */}
            <AnimatePresence>
                {isHelpOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-slate-950/90 [backdrop-filter:blur(8px)] flex items-center justify-center p-4 pointer-events-auto"
                        onClick={() => setIsHelpOpen(false)}
                    >
                        <motion.div 
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-slate-900 border border-indigo-500/40 rounded-3xl p-6 md:p-8 max-w-lg w-full shadow-2xl relative overflow-hidden text-left"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500" />
                            
                            <div className="flex items-center gap-3 mb-5">
                                <Info className="w-6 h-6 text-cyan-400 shrink-0" />
                                <h2 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">
                                    {language === 'RU' ? 'КОНСТРУКЦИЯ И ГЕОМЕТРИЯ' : 'CONSTRUCTION SPECS MATRIX'}
                                </h2>
                            </div>

                            <p className="text-slate-400 text-xs md:text-sm mb-6 leading-relaxed">
                                {language === 'RU' 
                                    ? 'Векторная сетка сектора подчиняется строгим законам стабильности пространства. Чтобы успешно синхронизировать элементы, соблюдайте следующие правила:' 
                                    : 'The sectors vector grid obeys strict spatial stability equations. To successfully align and persist templates, adhere to the mechanics below:'}
                            </p>

                            <div className="space-y-4 mb-6">
                                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                        {language === 'RU' ? 'Правило Нулевой Базы (Фундамент)' : 'Ground Foundations (Level 0)'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        {language === 'RU'
                                            ? 'Гексы 0 уровня формируют базовую энерго-опору. Их можно беспрепятственно выкладывать на любые свободные чертежные ячейки (мишени).'
                                            : 'Level 0 blocks serve as the vital base ground state. They can be freely placed onto any empty design templates.'}
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                        {language === 'RU' ? 'Правило Лестницы (Перепад высот)' : 'Staircase Rule (Step Heights)'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        {language === 'RU'
                                            ? 'Конструкция остальных уровней требует опоры. Вы можете поставить гекс только тогда, когда перепад высоты с соседней ячейкой составляет ровно 1 шаг по модулю (|ΔH| = 1).'
                                            : 'Other tiers require physical support. You can only deploy a block if the height delta to an adjacent structured cell is exactly 1 step (|ΔH| = 1).'}
                                    </p>
                                </div>

                                <div className="p-3 bg-slate-950/60 rounded-xl border border-white/5">
                                    <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                                        {language === 'RU' ? 'Целевая Подсветка диапазонов' : 'Holographic Range Indicators'}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-normal">
                                        {language === 'RU'
                                            ? 'При выборе любого блока из Хранилища, все доступные для строительства ячейки замигают бирюзовыми кольцами!'
                                            : 'When selecting any block from your Storage, all valid constructive targets instantly pulse with cyan indicators.'}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={() => { playUiSound('CLICK'); setIsHelpOpen(false); }}
                                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-3 rounded-2xl transition-all uppercase tracking-widest text-xs shadow-xl"
                            >
                                {language === 'RU' ? 'Запустить Синхронизатор' : 'Resume Matrix'}
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* INITIAL HINT OVERLAY */}
            <AnimatePresence>
                {Object.values(minedInSessionHexes).reduce((a, b) => a + b, 0) === 0 && !isInitialHintDismissed && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 text-center pointer-events-auto"
                    >
                        <div className="max-w-md bg-slate-900 border border-indigo-500/50 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-cyan-400 to-indigo-500" />
                            <BookOpen className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-4 italic">
                                {language === 'RU' ? 'Ваша История еще не началась' : 'Your Story hasn\'t started yet'}
                            </h2>
                            <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                                {language === 'RU' 
                                    ? 'Этот режим требует физические фрагменты миров. Чтобы получить их, отправляйтесь на Карту Уровней и одержите победу. В конце уровня вы сможете забрать с собой добытые гексы.'
                                    : 'This mode requires physical fragments of worlds. To get them, go to the Levels Map and achieve victory. At the end of each level, you can extract collected hexes.'}
                            </p>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => { playUiSound('CLICK'); setCampaignMode('LEVELS'); setUIState('CAMPAIGN_MAP'); }}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-xl uppercase tracking-widest text-xs"
                                >
                                    {language === 'RU' ? 'К Картам' : 'To Maps'}
                                </button>
                                <button 
                                    onClick={() => { playUiSound('CLICK'); setIsInitialHintDismissed(true); }}
                                    className="px-6 border border-white/10 hover:bg-white/5 text-slate-400 font-bold rounded-2xl transition-all text-xs"
                                >
                                    {language === 'RU' ? 'Позже' : 'Later'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default StoryBuilderView;
