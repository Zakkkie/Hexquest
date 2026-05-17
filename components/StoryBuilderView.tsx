import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Stage, Layer, Group, Path, Rect, Circle } from 'react-konva';
import { useGameStore } from '../store.ts';
import { getHexKey, hexToPixel } from '../services/hexUtils.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { THEME_PALETTE } from './MapRenderer.tsx';
import { textureService } from '../services/textureService.ts';
import { ArrowLeft, BookOpen, Crown, ChevronRight, Settings, Volume2, VolumeX, Music, Music2, Languages } from 'lucide-react';
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
    isNew?: boolean,
    onClick: (q: number, r: number) => void 
}> = React.memo(({ q, r, level, isSelected, isTarget, isNew, onClick }) => {
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

    // Height calculation - visual depth - matching HexNode logic
    // Level 0: 10px thickness (offsetY=-10)
    // Level 1+: Thickness increases, offsetY decreases (moves UP)
    // Level -1-: Moves DOWN
    const height = level !== undefined ? (level >= 0 ? 12 + level * 12 : 12) : 0;
    const yOffset = level !== undefined ? (level >= 0 ? -height : (Math.abs(level) - 1) * 12) : 0;
    const wallHeight = level !== undefined ? (level >= 0 ? height : Math.abs(level) * 12) : 0;

    const groupRef = useRef<Konva.Group>(null);
    useEffect(() => {
        if (isNew && groupRef.current) {
            const node = groupRef.current;
            const originalY = node.y();
            node.y(originalY - 50);
            node.opacity(0);
            new Konva.Tween({
                node: node,
                duration: 0.4,
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
            return { id: i, data: `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} L ${p4.x} ${p4.y} Z` };
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
                                fill={sideTexture ? undefined : colors.side}
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
                    fill={topTexture ? undefined : (isBuilt ? colors?.top : (isHovered ? 'rgba(99, 102, 241, 0.4)' : (isTarget ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.02)')))}
                    fillPatternScale={{ x: GAME_CONFIG.HEX_SIZE / 32, y: GAME_CONFIG.HEX_SIZE / 32 }}
                    fillPatternOffset={{ x: 32, y: 32 }}
                    fillPatternRepeat="repeat"
                    stroke={isBuilt ? colors?.stroke : (isHovered ? 'rgba(99, 102, 241, 0.8)' : (isTarget ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255,255,255,0.1)'))}
                    strokeWidth={isBuilt ? 2 : (isHovered ? 2 : 1)}
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
                />
                {isBuilt && colors && (
                    <>
                        {/* Top/Light Bevel matching HexNode */}
                        <Path 
                            data={`M ${BASE_POINTS[2].x} ${BASE_POINTS[2].y * 0.8} L ${BASE_POINTS[3].x} ${BASE_POINTS[3].y * 0.8} L ${BASE_POINTS[4].x} ${BASE_POINTS[4].y * 0.8} L ${BASE_POINTS[5].x} ${BASE_POINTS[5].y * 0.8}`}
                            stroke="rgba(255,255,255,0.4)"
                            strokeWidth={2}
                            listening={false}
                            perfectDrawEnabled={false}
                        />
                        {/* Bottom/Dark Bevel matching HexNode */}
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

            {/* Selection/Hover Glow */}
            {isSelected && (
                <Path
                    y={yOffset}
                    data={SQUASHED_BASE_PATH_D}
                    scaleX={1.1}
                    scaleY={1.1}
                    stroke="#22d3ee"
                    strokeWidth={2}
                    dash={[5, 5]}
                    opacity={0.6}
                    listening={false}
                    perfectDrawEnabled={false}
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
    const [cameraPos, setCameraPos] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 - 50 });
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const [isInitialHintDismissed, setIsInitialHintDismissed] = useState(false);
    const [lastPlacedKey, setLastPlacedKey] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setStageSize({ width: containerRef.current.clientWidth, height: containerRef.current.clientHeight });
                // Only center camera if it's the very first hit
                if (cameraPos.x === window.innerWidth / 2 && cameraPos.y === window.innerHeight / 2) {
                    setCameraPos({ x: containerRef.current.clientWidth / 2, y: containerRef.current.clientHeight / 2 - 50 });
                }
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
                        draggable 
                        onDragStart={handleDragStart} 
                        onDragEnd={handleDragEnd}
                        dragBoundFunc={(pos) => {
                            // Tighter boundary logic for the story mode
                            const BOUND_X = stageSize.width * 0.4;
                            const BOUND_Y = stageSize.height * 0.4;
                            const centerX = stageSize.width / 2;
                            const centerY = stageSize.height / 2 - 50;
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

            {/* UI LAYER */}
            <div className="absolute inset-0 z-10 pointer-events-none flex flex-col overflow-hidden p-6 md:p-8">
                
                {/* TOP ELEMENTS */}
                <div className="flex justify-between items-start w-full">
                    <div className="flex items-center gap-4 md:gap-6 pointer-events-auto">
                        <button 
                            onClick={() => { playUiSound('CLICK'); setUIState('MENU'); }}
                            className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 bg-slate-900/80 border border-white/10 rounded-full hover:bg-slate-800 text-white transition-all shadow-2xl backdrop-blur-md"
                        >
                            <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" /> 
                        </button>

                        <div className="hidden sm:flex flex-col">
                            {Object.keys(minedInSessionHexes).length === 0 ? (
                                <span className="text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-[0.2em] italic">
                                    {language === 'RU' ? 'Хранилища пусты' : 'Vaults empty'}
                                </span>
                            ) : (
                                <div className="flex gap-2 no-scrollbar py-1">
                                    {Object.entries(minedInSessionHexes).sort((a,b) => Number(a[0]) - Number(b[0])).map(([level, count]) => {
                                        const lvl = Number(level);
                                        const isSelected = selectedLevel === lvl;
                                        const hexCol = lvl < 0 ? '#4338ca' : (lvl === 0 ? '#475569' : (lvl === 1 ? '#059669' : (lvl === 2 ? '#d97706' : '#dc2626')));
                                        if (count <= 0) return null;

                                        return (
                                            <motion.button
                                                key={lvl}
                                                whileTap={{ scale: 0.95 }}
                                                onClick={() => { playUiSound('CLICK'); setSelectedLevel(isSelected ? null : lvl); }}
                                                className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all relative ${isSelected ? 'bg-indigo-600/30 border-indigo-500 shadow-[0_0_15px_rgba(34,211,238,0.2)]' : 'bg-slate-900/50 border-white/5 hover:border-indigo-500/30'}`}
                                            >
                                                <div className="w-4 h-4 rotate-12" style={{ backgroundColor: hexCol, borderRadius: '3px' }} />
                                                <span className="text-[10px] font-black text-white">x{count}</span>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-white/10 rounded-2xl px-3 py-2 md:px-4 md:py-2 flex items-center gap-2 md:gap-3 backdrop-blur-md pointer-events-auto shadow-2xl">
                        <BookOpen className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400" />
                        <span className="text-white font-black uppercase tracking-[0.15em] text-[9px] md:text-xs whitespace-nowrap">
                            {language === 'RU' ? 'ГЛАВА' : 'CHAPTER'} {storyMilestone + 1}
                        </span>
                    </div>
                </div>

                {/* Mobile Resource Bar */}
                <div className="flex sm:hidden w-full mt-4 justify-start pointer-events-auto">
                    <div className="bg-slate-900/60 backdrop-blur-lg rounded-2xl border border-white/5 p-2 flex gap-2 overflow-x-auto no-scrollbar max-w-full">
                        {Object.entries(minedInSessionHexes).sort((a,b) => Number(a[0]) - Number(b[0])).map(([level, count]) => {
                            const lvl = Number(level);
                            const isSelected = selectedLevel === lvl;
                            const hexCol = lvl < 0 ? '#4338ca' : (lvl === 0 ? '#475569' : (lvl === 1 ? '#059669' : (lvl === 2 ? '#d97706' : '#dc2626')));
                            if (count <= 0) return null;

                            return (
                                <button
                                    key={lvl}
                                    onClick={() => { playUiSound('CLICK'); setSelectedLevel(isSelected ? null : lvl); }}
                                    className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${isSelected ? 'bg-indigo-600/30 border-indigo-500' : 'bg-slate-950/50 border-white/5'}`}
                                >
                                    <div className="w-3 h-3 rotate-12" style={{ backgroundColor: hexCol, borderRadius: '2px' }} />
                                    <span className="text-[10px] font-black text-white">x{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* BOTTOM CONTENT - Narrative & Controls */}
                <div className="mt-auto flex items-end justify-between gap-4 pointer-events-none">
                    <motion.div 
                        initial={{ y: 50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="bg-[#0b1120]/95 border border-white/10 rounded-2xl md:rounded-[40px] w-full max-w-[calc(100vw-32px)] md:max-w-sm lg:max-w-md shadow-2xl backdrop-blur-3xl flex flex-col overflow-hidden pointer-events-auto p-4 md:p-8 relative"
                    >
                        {/* Dots Indicator */}
                        <div className="absolute top-4 right-4 md:top-8 md:right-8 flex gap-1 md:gap-1.5">
                            {STORY_STEPS.map((_, i) => (
                                <div key={i} className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full transition-all duration-500 ${i < storyMilestone ? 'bg-indigo-500' : (i === storyMilestone ? 'bg-white w-3 md:w-4' : 'bg-slate-700')}`} />
                            ))}
                        </div>

                        {STORY_STEPS[storyMilestone] ? (
                            <>
                                <h3 className="text-sm md:text-xl font-black text-white uppercase tracking-tight mb-2 md:mb-4 pr-10 md:pr-16 leading-tight">
                                    {STORY_STEPS[storyMilestone].title}
                                </h3>
                                
                                <p className="text-slate-400 text-[10px] md:text-sm leading-relaxed mb-4 md:mb-8 font-medium italic opacity-90 line-clamp-3 md:line-clamp-none">
                                    "{STORY_STEPS[storyMilestone].text}"
                                </p>
                                
                                <div className="flex items-center gap-3 md:gap-6">
                                    <div className="flex-1">
                                    <div className="flex justify-between text-[9px] md:text-[11px] font-black font-mono text-indigo-400 mb-1.5 md:mb-2 uppercase tracking-widest">
                                        <span>{language === 'RU' ? 'СИНХРОНИЗАЦИЯ' : 'SYNC'}</span>
                                        <span>
                                            {Object.values(storyMap).filter(l => l === STORY_STEPS[storyMilestone].reqLevel || l === STORY_STEPS[storyMilestone].altReqLevel).length} / {STORY_STEPS[storyMilestone].reqCount}
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 md:h-2 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                            <motion.div 
                                                className="h-full bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
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
                                        className="w-8 h-8 md:w-12 md:h-12 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg md:rounded-2xl flex items-center justify-center transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] border border-indigo-400/50 grow-0 shrink-0"
                                    >
                                        <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="py-2 flex items-center gap-4">
                                <Crown className="w-6 h-6 md:w-10 md:h-10 text-amber-400" />
                                <div className="flex flex-col">
                                    <h3 className="text-sm md:text-xl font-black text-amber-400 uppercase tracking-tight">
                                        {language === 'RU' ? 'МИР ВОССТАНОВЛЕН' : 'WORLD RESTORED'}
                                    </h3>
                                    <p className="text-[9px] md:text-xs text-amber-200/50 italic font-medium">
                                        {language === 'RU' ? 'Полотно завершено.' : 'Canvas complete.'}
                                    </p>
                                </div>
                            </div>
                        )}
                    </motion.div>

                    {/* SETTINGS AREA */}
                    <div className="flex flex-col gap-2 pointer-events-auto relative">
                        <AnimatePresence>
                            {isSettingsOpen && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                    className="absolute bottom-full right-0 mb-2 p-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-2xl flex flex-col gap-1 min-w-[140px]"
                                >
                                    <button 
                                        onClick={() => { playUiSound('CLICK'); toggleMusic(); }}
                                        className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all"
                                    >
                                        <div className="flex items-center gap-2">
                                            {isMusicMuted ? <Music className="w-4 h-4 text-slate-500" /> : <Music2 className="w-4 h-4 text-indigo-400" />}
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">{language === 'RU' ? 'Музыка' : 'Music'}</span>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${isMusicMuted ? 'bg-slate-700' : 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'}`} />
                                    </button>

                                    <button 
                                        onClick={() => { playUiSound('CLICK'); toggleSfx(); }}
                                        className="flex items-center justify-between gap-3 px-3 py-2 hover:bg-white/5 rounded-xl transition-all"
                                    >
                                        <div className="flex items-center gap-2">
                                            {isSfxMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-indigo-400" />}
                                            <span className="text-[10px] font-bold text-white uppercase tracking-wider">{language === 'RU' ? 'Звуки' : 'Sounds'}</span>
                                        </div>
                                        <div className={`w-2 h-2 rounded-full ${isSfxMuted ? 'bg-slate-700' : 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]'}`} />
                                    </button>

                                    <div className="h-px bg-white/5 my-1" />

                                    <div className="px-3 py-2 flex flex-col gap-2">
                                        <div className="flex items-center gap-2 text-[8px] font-black uppercase text-slate-500 tracking-widest">
                                            <Languages className="w-3 h-3" />
                                            {language === 'RU' ? 'Язык' : 'Language'}
                                        </div>
                                        <div className="flex gap-1">
                                            <button 
                                                onClick={() => { playUiSound('CLICK'); setLanguage('RU'); }}
                                                className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${language === 'RU' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                            >
                                                RU
                                            </button>
                                            <button 
                                                onClick={() => { playUiSound('CLICK'); setLanguage('EN'); }}
                                                className={`flex-1 py-1 rounded-lg text-[9px] font-black border transition-all ${language === 'EN' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-white/5 text-slate-500 hover:text-slate-300'}`}
                                            >
                                                EN
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => { playUiSound('CLICK'); setIsSettingsOpen(!isSettingsOpen); }}
                            className={`w-14 h-14 border rounded-full flex items-center justify-center transition-all shadow-2xl backdrop-blur-md ${isSettingsOpen ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white'}`}
                        >
                            <Settings className={`w-6 h-6 ${isSettingsOpen ? 'rotate-90' : ''} transition-transform duration-500`} />
                        </motion.button>
                    </div>
                </div>
            </div>

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
