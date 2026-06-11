import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store.ts';
import { audioService } from '../../services/audioService.ts';
import { X, Sparkles } from 'lucide-react';

const TRANSLATE = {
    RU: [
        { 
            targetId: "tutorial-shape-list", 
            text: "Шаг 1. Выбор высоты блоков и фигур", 
            desc: "Внизу выберите нужную высоту (кликом по блоку с соответствующей уникальной геометрической фигурой):\n• L0 — Ровная плита (Без фигуры)\n• L1 — Круг\n• L2 — Квадрат\n• L3 — Треугольник\n• L4 — Ромб\n• L5 — Пятиугольник\n• L6 — Малый Шестиугольник\n• L7 — Двойное Кольцо\n• L8-L9 — Древние глифы/Звёзды ◆★\nВыбранный блок подсветится сияющим цветом.",
            position: "above", 
            align: "center", 
            skipPos: "top" 
        },
        { 
            targetId: "tutorial-hex-board", 
            text: "Шаг 2. Как строить без ошибок!", 
            desc: "Кликните на гекс на поле, чтобы возвести выбранную фигуру/высоту:\n• Уровень L1 (Круг) доступен для установки в любом месте без ограничений.\n• Для уровня L2 и выше (Квадрат, Треугольник, Ромб и т.д.) требуются как минимум 2 соседних блока с такой же фигурой/высотой или выше для физической опоры, иначе конструкция разрушится!",
            position: "above", 
            align: "center", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-blueprint-tablet", 
            text: "Шаг 3. Анализ Чертежа", 
            desc: "Вам необходимо собрать правильную фигуру на игровом поле. Обратите внимание на инженерный планшет сборки в центре (нажмите на капсулу посередине сверху чтобы его развернуть). Как только вы повторите схему из планшета на поле — модель будет засчитана!",
            position: "below", 
            align: "center", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-sp-badge", 
            text: "Шаг 4. Очки Навыков (SP) и Ранг", 
            desc: "Каждая собранная фигура даёт +1 SP. Нажмите на фиолетовый индикатор вверху, чтобы улучшить Ранг инженера и открыть плиты с высокими цифрами и сложными геометриями!",
            position: "below", 
            align: "right", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-levels-btn", 
            text: "Шаг 5. Смена симуляций", 
            desc: "Нажмите эту кнопку, чтобы вернуться на главную карту космических симуляций Nebula для выбора новых испытаний.",
            position: "above", 
            align: "center", 
            skipPos: "top" 
        }
    ],
    EN: [
        { 
            targetId: "tutorial-shape-list", 
            text: "Step 1. Choose Heights & Figures", 
            desc: "Select a level block at the bottom (blocks are stamped with unique geometric shapes corresponding to their height level):\n• L0 — Neutral plain (No shape)\n• L1 — Circle\n• L2 — Square\n• L3 — Triangle\n• L4 — Diamond\n• L5 — Pentagon\n• L6 — Small Hexagon\n• L7 — Double Ring\n• L8-L9 — Ancient Glyphs / Stars ◆★\nThe selected block highlights in vibrant cyan.",
            position: "above", 
            align: "center", 
            skipPos: "top" 
        },
        { 
            targetId: "tutorial-hex-board", 
            text: "Step 2. Smart Building & Stability", 
            desc: "Click any grid cell to place your selected figure/height:\n• Level L1 (Circle) can be placed anywhere without restrictions.\n• Level L2 or higher (Square, Triangle, Diamond, etc.) requires at least 2 adjacent neighbor blocks of that figure/height or higher as support, or it collapses!",
            position: "above", 
            align: "center", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-blueprint-tablet", 
            text: "Step 3. Blueprint Analysis", 
            desc: "You need to build the correct figure on the field. Check the engineering blueprint tablet in the center (click the top-center capsule to expand it). Once you replicate the blueprint's pattern on the board, the shape will be completed!",
            position: "below", 
            align: "center", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-sp-badge", 
            text: "Step 4. Engineering Skill Tree (SP)", 
            desc: "Solving patterns grants +1 Skill Point (SP). Click this glowing token to upgrade your Engineering Rank and access blocks with higher digits and complex shapes.",
            position: "below", 
            align: "right", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-levels-btn", 
            text: "Step 5. Change Simulation", 
            desc: "Press this navigation deck button to return to the simulation levels map to explore space zones and select challenges.",
            position: "above", 
            align: "center", 
            skipPos: "top" 
        }
    ]
};

const LEVEL_COLORS: Record<string, { top: string; side: string; stroke: string }> = {
    '0': { top: '#1e293b', side: '#0f172a', stroke: '#475569' }, 
    '1': { top: '#0f172a', side: '#020617', stroke: '#0c4a6e' }, 
    '2': { top: '#172554', side: '#0f172a', stroke: '#0284c7' }, 
    '3': { top: '#1e3a8a', side: '#172554', stroke: '#0ea5e9' }, 
    '4': { top: '#312e81', side: '#1e1b4b', stroke: '#6366f1' }, 
    '5': { top: '#4c1d95', side: '#2e1065', stroke: '#8b5cf6' }, 
    '6': { top: '#581c87', side: '#3b0764', stroke: '#a855f7' }, 
    '7': { top: '#701a75', side: '#4a044e', stroke: '#d946ef' }, 
    '8': { top: '#451a03', side: '#271a0c', stroke: '#d97706' }, 
    '9': { top: '#713f12', side: '#422006', stroke: '#f59e0b' }
};

interface TutorialHexagonProps {
    level: number;
    isSelected?: boolean;
    isCorrect?: boolean;
    isIncorrect?: boolean;
    size?: number;
}

const TutorialHexagon: React.FC<TutorialHexagonProps> = ({
    level,
    isSelected = false,
    isCorrect = false,
    isIncorrect = false,
    size = 28
}) => {
    const rx = size;
    const ry = size * 0.6;
    
    // Proportional wall height mapping to represent 3D depth to the player
    const wallHeight = 4 + (level >= 0 ? level * 5 : 0);
    
    const cos30 = 0.866;
    const sin30 = 0.5;
    
    // Squashed pointy-topped hexagon corners
    const points = [
        { x: rx * cos30, y: ry * sin30 },     // Corner 0
        { x: 0, y: ry },                      // Corner 1
        { x: -rx * cos30, y: ry * sin30 },    // Corner 2
        { x: -rx * cos30, y: -ry * sin30 },   // Corner 3
        { x: 0, y: -ry },                     // Corner 4
        { x: rx * cos30, y: -ry * sin30 }     // Corner 5
    ];
    
    const colorTheme = LEVEL_COLORS[String(level)] || LEVEL_COLORS['0'];
    
    // Context-sensitive colors matching active modes
    let strokeColor = isSelected ? '#22d3ee' : (isCorrect ? '#10b981' : (isIncorrect ? '#ef4444' : colorTheme.stroke));
    let fillTop = isIncorrect ? '#4c0519' : (isCorrect ? '#064e3b' : colorTheme.top);
    let fillSide = isIncorrect ? '#310413' : (isCorrect ? '#022c22' : colorTheme.side);
    
    const topPathD = `M ${points[0].x} ${points[0].y} ` +
                     `L ${points[1].x} ${points[1].y} ` +
                     `L ${points[2].x} ${points[2].y} ` +
                     `L ${points[3].x} ${points[3].y} ` +
                     `L ${points[4].x} ${points[4].y} ` +
                     `L ${points[5].x} ${points[5].y} Z`;

    const sideWalls = [
        { p1: points[5], p2: points[0], opacity: 0.9 },
        { p1: points[0], p2: points[1], opacity: 0.95 },
        { p1: points[1], p2: points[2], opacity: 0.8 }
    ];
    
    const totalWidth = rx * 2.2;
    const totalHeight = ry * 2 + wallHeight + 6;
    const cx = totalWidth / 2;
    const cy = ry + 2;

    const renderGeometricMarker = () => {
        if (level === 0) return null;
        if (level === 1) {
            return <circle cx={0} cy={0} r={rx * 0.28} fill="none" stroke={strokeColor} strokeWidth={1.2} transform="scale(1, 0.6)" opacity={0.65} />;
        }
        if (level === 2) {
            return <rect x={-rx * 0.22} y={-rx * 0.22} width={rx * 0.44} height={rx * 0.44} fill="none" stroke={strokeColor} strokeWidth={1.2} transform="scale(1, 0.6)" opacity={0.65} />;
        }
        if (level === 3) {
            return <polygon points={`0,${-rx * 0.28} ${rx * 0.26},${rx * 0.20} ${-rx * 0.26},${rx * 0.20}`} fill="none" stroke={strokeColor} strokeWidth={1.2} transform="scale(1, 0.6)" opacity={0.65} />;
        }
        if (level === 4) {
            return <polygon points={`0,${-rx * 0.3} ${rx * 0.3},0 0,${rx * 0.3} ${-rx * 0.3},0`} fill="none" stroke={strokeColor} strokeWidth={1.2} transform="scale(1, 0.6)" opacity={0.65} />;
        }
        if (level === 5) {
            let pts = [];
            for (let i = 0; i < 5; i++) {
                const a = (i * 72 - 90) * Math.PI / 180;
                pts.push(`${(rx * 0.3 * Math.cos(a)).toFixed(1)},${(rx * 0.3 * Math.sin(a)).toFixed(1)}`);
            }
            return <polygon points={pts.join(' ')} fill="none" stroke={strokeColor} strokeWidth={1.2} transform="scale(1, 0.6)" opacity={0.65} />;
        }
        if (level === 6) {
            let pts = [];
            for (let i = 0; i < 6; i++) {
                const a = (i * 60 + 30) * Math.PI / 180;
                pts.push(`${(rx * 0.3 * Math.cos(a)).toFixed(1)},${(rx * 0.3 * Math.sin(a)).toFixed(1)}`);
            }
            return <polygon points={pts.join(' ')} fill="none" stroke={strokeColor} strokeWidth={1.2} transform="scale(1, 0.6)" opacity={0.65} />;
        }
        if (level === 7) {
            return (
                <g transform="scale(1, 0.6)" opacity={0.65}>
                    <circle cx={0} cy={0} r={rx * 0.3} fill="none" stroke={strokeColor} strokeWidth={1.2} />
                    <circle cx={0} cy={0} r={rx * 0.15} fill="none" stroke={strokeColor} strokeWidth={1.2} />
                </g>
            );
        }
        if (level >= 8) {
            const glyphs = ['◆', '★', '◈', 'Ω', '☼'];
            const glyph = glyphs[Math.min(glyphs.length - 1, level - 8)];
            return (
                <text 
                    x={0} 
                    y={1} 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    fill={strokeColor} 
                    fontSize={rx * 0.7} 
                    fontWeight="normal" 
                    opacity={0.4}
                >
                    {glyph}
                </text>
            );
        }
        if (level < 0) {
            return (
                <g transform="scale(1, 0.6)" opacity={0.5}>
                    {Array.from({ length: Math.min(3, Math.abs(level)) }).map((_, i) => (
                        <circle key={i} cx={0} cy={0} r={rx * (0.35 - i * 0.1)} fill="none" stroke={strokeColor} strokeWidth={1} />
                    ))}
                </g>
            );
        }
        return null;
    };
    
    return (
        <div className="relative flex flex-col items-center justify-center select-none shrink-0" style={{ width: totalWidth, height: totalHeight }}>
            <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} width={totalWidth} height={totalHeight} className="overflow-visible">
                <g transform={`translate(${cx}, ${cy})`}>
                    {/* Footprint Shadow */}
                    <ellipse cx={0} cy={ry + wallHeight - 1} rx={rx * 0.95} ry={ry * 0.45} fill="rgba(2, 6, 23, 0.75)" filter="blur(1px)" />
                    
                    {/* 3D Side Walls */}
                    {wallHeight > 0 && sideWalls.map((wall, idx) => {
                        const d = `M ${wall.p1.x} ${wall.p1.y} ` +
                                  `L ${wall.p2.x} ${wall.p2.y} ` +
                                  `L ${wall.p2.x} ${wall.p2.y + wallHeight} ` +
                                  `L ${wall.p1.x} ${wall.p1.y + wallHeight} Z`;
                        return (
                            <path 
                                key={idx} 
                                d={d} 
                                fill={fillSide} 
                                stroke={strokeColor} 
                                strokeWidth={1} 
                                opacity={wall.opacity} 
                                strokeLinejoin="round" 
                            />
                        );
                    })}
                    
                    {/* Top Floor Hexagonal Face */}
                    <path 
                        d={topPathD} 
                        fill={fillTop} 
                        stroke={strokeColor} 
                        strokeWidth={1.5} 
                        strokeLinejoin="round" 
                    />
                    
                    {/* Visual Bevel Line */}
                    <path 
                        d={`M ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} L ${points[4].x} ${points[4].y}`} 
                        fill="none" 
                        stroke="rgba(255,255,255,0.22)" 
                        strokeWidth={1} 
                    />
                    
                    {/* Selection Beacon Aura */}
                    {isSelected && (
                        <path 
                            d={topPathD} 
                            fill="none" 
                            stroke="#22d3ee" 
                            strokeWidth={2.5} 
                            opacity={0.8}
                        />
                    )}
                    
                    {/* Geometric Shape Stamp */}
                    {renderGeometricMarker()}
                    
                    {/* Level Height Digit */}
                    <text 
                        x={0} 
                        y={1.5} 
                        textAnchor="middle" 
                        dominantBaseline="middle" 
                        fill={isIncorrect ? '#fda4af' : (isCorrect ? '#a7f3d0' : (isSelected ? '#67e8f9' : '#ffffff'))} 
                        fontSize={rx * 0.78} 
                        fontWeight="900" 
                        fontFamily="monospace"
                        style={{ textShadow: `0 0 5px ${isSelected ? '#22d3ee' : colorTheme.stroke}` }}
                    >
                        {level}
                    </text>
                </g>
            </svg>
        </div>
    );
};

// Custom interactive CSS/motion demonstration cards inside tooltips to explain mechanics visually
const TutorialVisualDemo: React.FC<{ step: number; language: string }> = ({ step, language }) => {
    const isRu = language === 'RU';

    if (step === 0) {
        return (
            <div className="w-full bg-slate-950/80 rounded-xl border border-white/5 relative p-2 sm:p-2.5 flex flex-col items-center justify-center overflow-hidden font-mono text-[9px] select-none h-24 sm:h-28 md:h-32 my-1">
                <div className="text-slate-400 font-extrabold uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 self-start text-[7.5px] sm:text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {isRu ? 'ВЫСОТА И ЦВЕТ ГЕКСАГРАММЫ (0...9)' : 'HEXAGON HEIGHT & COLORS (0...9)'}
                </div>
                
                {/* Visual carousel list with click animation using high-fidelity hexagons */}
                <div className="relative flex gap-3 sm:gap-4 items-center justify-center w-full h-12 sm:h-16 md:h-20 mt-1">
                    {[0, 1, 2, 3].map((lvl) => {
                        const isSel = lvl === 2;
                        return (
                            <div key={lvl} className="flex flex-col items-center relative">
                                <motion.div
                                    animate={isSel ? { y: [-2, 2, -2], filter: ["drop-shadow(0 0 4px rgba(34,211,238,0.3))", "drop-shadow(0 0 10px rgba(34,211,238,0.7))", "drop-shadow(0 0 4px rgba(34,211,238,0.3))"] } : {}}
                                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                >
                                    <TutorialHexagon level={lvl} isSelected={isSel} size={lvl === 3 ? 20 : lvl === 2 ? 18 : 16} />
                                </motion.div>
                                <span className={`text-[6px] sm:text-[7px] mt-1 font-black ${isSel ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`}>
                                    {isSel ? (isRu ? 'ОТБОР 2' : 'SEL 2') : `L${lvl}`}
                                </span>
                            </div>
                        );
                    })}

                    {/* Laser touch pointer hand clicking */}
                    <motion.div 
                        className="absolute w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-cyan-400 bg-cyan-400/20 z-10 flex items-center justify-center"
                        style={{ bottom: 14, right: '35%' }}
                        animate={{
                            scale: [1, 0.8, 1.15, 1],
                            opacity: [0, 1, 1, 0],
                            y: [12, -4, -4, 12]
                        }}
                        transition={{
                            repeat: Infinity,
                            duration: 2.2,
                            ease: "easeInOut"
                        }}
                    >
                        <div className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-cyan-300 animate-ping" />
                    </motion.div>
                </div>
            </div>
        );
    }

    if (step === 1) {
        return (
            <div className="w-full flex flex-col gap-1 sm:gap-1.5 font-mono select-none my-1">
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2 border-b border-white/5 pb-1">
                    {/* ACCORDING TO PHYSICAL CO-SUPPORT (CORRECT) */}
                    <div className="bg-emerald-955/20 rounded-xl border border-emerald-500/35 p-1.5 sm:p-2 flex flex-col items-center relative overflow-hidden h-26 sm:h-30 md:h-34 justify-between bg-slate-950/40">
                        <div className="text-emerald-400 font-black uppercase tracking-wider text-[7px] sm:text-[7.5px] flex items-center gap-1 self-start">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 flex items-center justify-center text-[5.5px] sm:text-[6px] text-black font-extrabold">✓</span>
                            {isRu ? 'СТАБИЛЬНО' : 'STABLE WAY'}
                        </div>
                        
                        <div className="relative w-full flex-1 flex items-center justify-center gap-1 mt-1">
                            <div className="flex flex-col items-center opacity-70">
                                <TutorialHexagon level={2} size={14} />
                                <span className="text-[4.5px] sm:text-[5px] text-slate-400 uppercase leading-none mt-1">{isRu ? 'ОПОРА' : 'SUPPORT'}</span>
                            </div>
                            <motion.div 
                                className="flex flex-col items-center"
                                animate={{ y: [1.5, -1.5, 1.5] }}
                                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                            >
                                <TutorialHexagon level={2} isCorrect={true} size={16} />
                                <span className="text-[4.5px] sm:text-[5px] text-emerald-300 uppercase font-black leading-none mt-1 animate-pulse">{isRu ? 'НОВЫЙ' : 'NEW'}</span>
                            </motion.div>
                            <div className="flex flex-col items-center opacity-70">
                                <TutorialHexagon level={2} size={14} />
                                <span className="text-[4.5px] sm:text-[5px] text-slate-400 uppercase leading-none mt-1">{isRu ? 'ОПОРА' : 'SUPPORT'}</span>
                            </div>
                        </div>
                        <span className="text-emerald-500/80 text-[6px] sm:text-[6.5px] font-black uppercase tracking-wider text-center mt-1">
                            {isRu ? '2 СОСЕДА РЯДОМ ✓' : '2 NEIGHBORS FOUND ✓'}
                        </span>
                    </div>

                    {/* UNSTABLE CRITICAL BREAKDOWN (INCORRECT) */}
                    <div className="bg-rose-955/20 rounded-xl border border-rose-500/30 p-1.5 sm:p-2 flex flex-col items-center relative overflow-hidden h-26 sm:h-30 md:h-34 justify-between bg-slate-950/40">
                        <div className="text-rose-400 font-black uppercase tracking-wider text-[7px] sm:text-[7.5px] flex items-center gap-1 self-start">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 flex items-center justify-center text-[5.5px] sm:text-[6px] text-black font-extrabold">✕</span>
                            {isRu ? 'ОБВАЛ' : 'UNSTABLE WAY'}
                        </div>

                        <div className="relative w-full flex-1 flex items-center justify-center gap-1 mt-1">
                            <div className="flex flex-col items-center opacity-30">
                                <TutorialHexagon level={0} size={13} />
                                <span className="text-[4.5px] sm:text-[5px] text-slate-500 uppercase leading-none mt-1">L0</span>
                            </div>
                            
                            <motion.div 
                                className="flex flex-col items-center"
                                animate={{
                                    x: [-0.8, 0.8, -1.2, 1.2, -0.8, 0],
                                    y: [0.8, -0.8, 1.2, -1.2, 0.8, 0]
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 0.9,
                                    repeatDelay: 0.1
                                }}
                            >
                                <TutorialHexagon level={2} isIncorrect={true} size={16} />
                                <span className="text-[4.5px] sm:text-[5px] text-rose-400 font-extrabold leading-none mt-1 uppercase animate-pulse">{isRu ? 'КРАХ' : 'CRASH'}</span>
                            </motion.div>

                            <div className="flex flex-col items-center opacity-30">
                                <TutorialHexagon level={0} size={13} />
                                <span className="text-[4.5px] sm:text-[5px] text-slate-500 uppercase leading-none mt-1">L0</span>
                            </div>
                        </div>

                        <span className="text-rose-405 text-[6px] sm:text-[6.5px] font-black uppercase text-center animate-pulse tracking-wide mt-1">
                            {isRu ? 'КРАХ! НЕТ ОПОРЫ ⚠️' : 'CRASH! NO BASIS ⚠️'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="w-full bg-slate-950/80 rounded-xl border border-white/5 relative p-2 sm:p-2.5 flex flex-col items-center justify-center overflow-hidden font-mono text-[9px] select-none h-24 sm:h-28 md:h-32 my-1">
                <div className="text-slate-400 font-extrabold uppercase tracking-widest mb-1 flex items-center gap-1.5 self-start text-[7.5px] sm:text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                    {isRu ? 'ПРИМЕРЫ СХЕМ (ЧЕРТЕЖЕЙ)' : 'BLUEPRINT EXAMPLES'}
                </div>
                
                <div className="flex items-center justify-center gap-4 sm:gap-6 w-full flex-1 mt-1">
                    {/* Example Figure 1 (Small Line) */}
                    <div className="flex flex-col items-center">
                        <div className="relative flex items-center justify-center w-14 h-14 bg-slate-900 border border-slate-700 rounded-lg shadow-inner">
                            <div className="absolute top-1.5 left-2"><TutorialHexagon level={0} size={9} isSelected={true}/></div>
                            <div className="absolute top-1.5 right-2"><TutorialHexagon level={0} size={9} isSelected={true}/></div>
                            <div className="absolute bottom-2"><TutorialHexagon level={0} size={9} isSelected={true}/></div>
                        </div>
                        <span className="text-[5.5px] sm:text-[6px] text-pink-400 font-black mt-1 uppercase tracking-widest">
                            {isRu ? 'ТРЕУГОЛЬНИК' : 'TRIANGLE'}
                        </span>
                    </div>

                    <motion.div 
                        animate={{ opacity: [0.3, 1, 0.3] }} 
                        transition={{ repeat: Infinity, duration: 2 }}
                    >
                        <span className="text-slate-600 font-black">---&gt;</span>
                    </motion.div>

                    {/* Example Figure 2 (Rhombus/Diamond) */}
                    <div className="flex flex-col items-center">
                        <div className="relative flex items-center justify-center w-14 h-14 bg-slate-900 border border-slate-700 rounded-lg shadow-inner">
                            <div className="absolute top-1"><TutorialHexagon level={0} size={8} isSelected={true}/></div>
                            <div className="absolute left-1.5 top-5"><TutorialHexagon level={0} size={8} isSelected={true}/></div>
                            <div className="absolute right-1.5 top-5"><TutorialHexagon level={0} size={8} isSelected={true}/></div>
                            <div className="absolute bottom-1"><TutorialHexagon level={0} size={8} isSelected={true}/></div>
                        </div>
                        <span className="text-[5.5px] sm:text-[6px] text-indigo-400 font-black mt-1 uppercase tracking-widest">
                            {isRu ? 'РОМБ' : 'RHOMBUS'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 3) {
        return (
            <div className="w-full bg-slate-950/80 rounded-xl border border-white/5 relative p-2 sm:p-2.5 flex flex-col items-center justify-center overflow-hidden font-mono text-[9px] select-none h-20 sm:h-24 md:h-28 my-1">
                <div className="text-slate-400 font-extrabold uppercase tracking-widest mb-1 sm:mb-1.5 flex items-center gap-1.5 self-start text-[7.5px] sm:text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                    {isRu ? 'ОЧКИ SP И РАНГ КОМАНДИРА' : 'SKILL POINTS & UPGRADES'}
                </div>
                <div className="flex items-center gap-3 sm:gap-4 relative mt-0.5 sm:mt-1">
                    {/* Trophy icon card */}
                    <div className="relative">
                        <motion.div 
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-indigo-950/70 border border-indigo-400/40 flex flex-col items-center justify-center shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                            animate={{ scale: [1, 1.10, 1] }}
                            transition={{ repeat: Infinity, duration: 1.8 }}
                        >
                            <span className="text-indigo-300 text-[6px] sm:text-[7px] font-extrabold tracking-tighter leading-none">SP</span>
                            <span className="text-white text-[10px] sm:text-xs font-black leading-none mt-0.5">+1</span>
                        </motion.div>
                        <div className="absolute -inset-1 rounded-full border border-indigo-300/20 border-dashed animate-spin duration-[5s] pointer-events-none" />
                    </div>

                    {/* Beam connector path */}
                    <div className="w-8 sm:w-10 h-[2px] bg-indigo-900 relative">
                        <motion.div 
                            className="absolute h-full w-[25%] bg-indigo-400 shadow-[0_0_6px_indigo]"
                            animate={{ left: ['0%', '75%', '0%'] }}
                            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                        />
                    </div>

                    {/* Advanced Lock Module */}
                    <div className="flex flex-col items-center">
                        <motion.div 
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center"
                            animate={{ borderColor: ['rgba(16,185,129,0.3)', 'rgba(52,211,153,0.8)', 'rgba(16,185,129,0.3)'] }}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <span className="text-[6.5px] sm:text-[7.5px] font-black text-center text-emerald-400 uppercase leading-none">{isRu ? 'РАНГ II' : 'RANK II'}</span>
                        </motion.div>
                        <span className="text-[5px] sm:text-[6px] text-emerald-400 mt-0.5 sm:mt-1 uppercase font-black tracking-widest">{isRu ? 'ОТКРЫТ!' : 'UNLOCKED'}</span>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 4) {
        return (
            <div className="w-full bg-slate-950/80 rounded-xl border border-white/5 relative p-2 sm:p-2.5 flex flex-col items-center justify-center overflow-hidden font-mono text-[9px] select-none h-20 sm:h-24 md:h-28 my-1">
                <div className="text-slate-400 font-extrabold uppercase tracking-widest mb-1 sm:mb-1.5 flex items-center gap-1.5 self-start text-[7.5px] sm:text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {isRu ? 'НАВИГАЦИОННЫЙ ЗАЛ' : 'LEVEL NAVIGATION MODULE'}
                </div>
                <div className="flex items-center justify-center gap-4 sm:gap-5 relative w-full h-8 sm:h-10 mt-0.5 sm:mt-1">
                    {/* Node 1 */}
                    <div className="relative">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-cyan-950 border border-cyan-400/80 flex items-center justify-center text-[6.5px] sm:text-[7.5px] text-cyan-300 font-black">1.1</div>
                        <div className="absolute -inset-1 rounded-full border border-cyan-400/30 animate-pulse pointer-events-none" />
                    </div>

                    {/* Orbital hyperpath link */}
                    <div className="w-10 sm:w-12 h-[1px] bg-slate-800 relative">
                        <motion.div 
                            className="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]"
                            animate={{ x: [0, 40, 0] }}
                            transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
                        />
                    </div>

                    {/* Node 2 */}
                    <div className="relative">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-[6.5px] sm:text-[7.5px] text-indigo-400">1.2</div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
};

export const StoryTutorial: React.FC = () => {
    const isTutorialActive = useGameStore(state => state.isStoryTutorialActive);
    const setIsTutorialActive = useGameStore(state => state.setIsStoryTutorialActive);
    const language = useGameStore(state => state.language);
    
    const [step, setStep] = useState(0);
    const [cutout, setCutout] = useState<{x: number, y: number, w: number, h: number} | null>(null);

    useEffect(() => {
        (window as any).startStoryTutorial = () => {
            setStep(0);
            setIsTutorialActive(true);
        };
        return () => {
            delete (window as any).startStoryTutorial;
        };
    }, [setIsTutorialActive]);

    const handleClose = () => {
        audioService.play('UI_CLICK');
        setIsTutorialActive(false);
        setStep(0);
        try {
            localStorage.setItem('hexopol_story_tutorial_completed', 'true');
        } catch { /* storage disabled */ }
    };

    const handleNext = (e?: React.MouseEvent | React.TouchEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        audioService.play('UI_CLICK');
        
        const steps = language === 'RU' ? TRANSLATE.RU : TRANSLATE.EN;
        if (step >= steps.length - 1) {
            handleClose();
        } else {
            setStep(prev => prev + 1);
        }
    };

    const steps = language === 'RU' ? TRANSLATE.RU : TRANSLATE.EN;
    const currentConfig = steps[step];

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const getCardStyle = () => {
        if (!isMobile) {
            // Desktop styling - relative to the cutout
            return {
                position: 'absolute' as const,
                width: '360px',
                ...(currentConfig?.position === 'above' ? { bottom: '100%', marginBottom: '24px' } : { top: '100%', marginTop: '24px' }),
                ...(currentConfig?.align === 'center' ? { left: '50%', transform: 'translateX(-50%)' } : {}),
                ...(currentConfig?.align === 'right' ? { right: 0, transformOrigin: 'right' } : {}),
                ...(currentConfig?.align === 'left' ? { left: 0, transformOrigin: 'left' } : {}),
            };
        }

        // Mobile styling - safe "fixed" orientation to guarantee visibility and prevent clipping
        if (currentConfig?.targetId === "tutorial-shape-list") {
            // Step 1: Bottom palette. Put explanation card high up on the screen.
            return {
                position: 'fixed' as const,
                top: '76px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100vw - 32px)',
                maxWidth: '290px',
            };
        } else if (currentConfig?.targetId === "tutorial-hex-board") {
            // Step 2: Main center board.
            // On mobile, put it right at the lower portion of the board inside the empty space.
            return {
                position: 'fixed' as const,
                bottom: '45px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100vw - 32px)',
                maxWidth: '290px',
            };
        } else {
            // Steps 3 & 4: Top elements (SP Badge, Simulation control).
            // Put explanation card in responsive bottom section of the screen.
            return {
                position: 'fixed' as const,
                bottom: '80px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: 'calc(100vw - 32px)',
                maxWidth: '290px',
            };
        }
    };

    useEffect(() => {
        if (!isTutorialActive) return;

        const updateCutout = () => {
            if (!currentConfig) return;
            const el = document.getElementById(currentConfig.targetId);
            
            let rect;
            if (currentConfig.targetId === "tutorial-hex-board") {
                rect = {
                    left: window.innerWidth / 2 - 80,
                    top: window.innerHeight / 2 - 80,
                    width: 160,
                    height: 160
                };
            } else if (el) {
                rect = el.getBoundingClientRect();
            }

            if (rect) {
                setCutout(prev => {
                    const next = {
                        x: rect.left,
                        y: Math.max(0, rect.top),
                        w: rect.width,
                        h: Math.min(window.innerHeight - rect.top, rect.height)
                    };
                    if (prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h) return prev;
                    return next;
                });
            } else {
                setCutout(prev => {
                    const next = {
                        x: window.innerWidth / 2 - 100,
                        y: window.innerHeight / 2 - 100,
                        w: 200,
                        h: 200
                    };
                    if (prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h) return prev;
                    return next;
                });
            }
        };

        updateCutout();
        const timeout = setTimeout(updateCutout, 300);
        window.addEventListener('resize', updateCutout);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', updateCutout);
        };
    }, [isTutorialActive, step, currentConfig]);

    if (!isTutorialActive) return null;

    const isLastStep = step === steps.length - 1;

    return (
        <div 
            id="story-onboarding-container" 
            className="fixed inset-0 z-[200] select-none pointer-events-auto cursor-pointer"
            onClick={handleNext}
            onTouchStart={handleNext}
        >
            {/* SVG Mask overlay with high visual precision */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[80]">
                <defs>
                    <mask id="story-spotlight-mask">
                        <rect width="100%" height="100%" fill="white" />
                        {cutout && (
                            <rect 
                                x={cutout.x - 8} 
                                y={cutout.y - 8} 
                                width={cutout.w + 16} 
                                height={cutout.h + 16} 
                                rx={cutout.w > 200 ? 24 : 12} 
                                fill="black" 
                            />
                        )}
                    </mask>
                </defs>
                <rect 
                    width="100%" 
                    height="100%" 
                    fill="rgba(2, 6, 23, 0.9)" 
                    mask="url(#story-spotlight-mask)" 
                    className="pointer-events-none opacity-95 transition-all duration-300"
                />
            </svg>

            <AnimatePresence mode="popLayout">
                {cutout && (
                    <motion.div 
                        key={step}
                        initial={{ opacity: 0, scale: 0.93 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.03 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="absolute z-[90] pointer-events-none flex flex-col items-center justify-center"
                        style={{
                            left: cutout.x,
                            top: cutout.y,
                            width: cutout.w,
                            height: cutout.h
                        }}
                    >
                        {/* Interactive HUD highlighting borders */}
                        <div className="absolute inset-[-10px] rounded-xl border-2 border-emerald-400 shadow-[0_0_30px_rgba(52,211,153,0.7),inset_0_0_15px_rgba(52,211,153,0.5)] animate-pulse" />
                        <div className="absolute inset-[-16px] border border-cyan-400/30 rounded-2xl" />
                        <div className="absolute inset-[-20px] border-2 border-emerald-400/20 rounded-2xl animate-ping duration-[2400ms]" />
                        
                        {/* Elegant Tooltip Card */}
                        <div 
                            style={{
                                ...getCardStyle(),
                                paddingLeft: '10px',
                                marginLeft: '0px',
                                marginTop: '0px',
                                marginBottom: '140px'
                            }}
                            className="bg-slate-950/98 border border-emerald-500/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.92)] p-2.5 sm:p-4 flex flex-col gap-1.5 sm:gap-2 max-w-[92vw] text-left backdrop-blur-xl transition-all duration-300 pointer-events-auto"
                        >
                            {/* Card Top Title bar */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-1 sm:pb-1.5">
                                <span className="font-mono text-[7.5px] sm:text-[9px] uppercase tracking-[0.2em] text-emerald-400 font-extrabold flex items-center gap-1">
                                    <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5 animate-pulse text-amber-400" />
                                    {language === 'RU' ? `ОБЗОР СЕКТОРА ${step + 1}/${steps.length}` : `TRAINING MISSION ${step + 1}/${steps.length}`}
                                </span>
                                <span className="font-mono text-[6.5px] sm:text-[8px] text-slate-500 font-bold uppercase tracking-wider">NEBULA_OPS_STABLE</span>
                            </div>

                            {/* Card Main Title */}
                            <h4 className="text-[10px] sm:text-[13px] md:text-sm font-black font-sans text-white uppercase tracking-wider leading-none mt-0.5 sm:mt-1">
                                {currentConfig.text}
                            </h4>

                            {/* Card Paragraph Detail */}
                            <p className="text-slate-300 text-[9px] sm:text-[11px] md:text-xs font-sans font-medium leading-normal sm:leading-relaxed select-none whitespace-pre-line">
                                {currentConfig.desc}
                            </p>

                            {/* Micro demonstration visual section */}
                            <TutorialVisualDemo step={step} language={language} />

                            {/* Card Bottom / Interactive Footer action */}
                            <div className="flex items-center justify-center w-full mt-1 pt-1.5 border-t border-white/5">
                                <span className="font-mono text-[7px] sm:text-[8px] font-black uppercase tracking-widest text-emerald-400 animate-pulse flex items-center gap-1 text-center justify-center w-full">
                                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                                    {isLastStep 
                                        ? (language === 'RU' ? 'КЛИКНИТЕ ДЛЯ ЗАВЕРШЕНИЯ ОБУЧЕНИЯ ✦' : 'TAP ANYWHERE TO ENTER MISSION ✦')
                                        : (language === 'RU' ? 'КЛИКНИТЕ ДЛЯ ПЕРЕХОДА ДАЛЕЕ' : 'TAP ANYWHERE TO ADVANCE')}
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Absolute Top-Right Skip Cross Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="absolute top-5 right-5 z-[250] w-9 h-9 rounded-full border border-slate-700/60 hover:border-emerald-500/50 hover:bg-slate-850/80 hover:scale-105 transition-all pointer-events-auto shadow-2xl bg-slate-950/95 flex items-center justify-center backdrop-blur-md active:scale-90"
                aria-label="Skip Tutorial"
                title={language === 'RU' ? 'Пропустить обучение' : 'Skip Tutorial'}
            >
                <X className="w-4 h-4 text-slate-400 hover:text-white transition-colors" />
            </button>
        </div>
    );
};
