import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store.ts';
import { audioService } from '../../services/audioService.ts';
import { X, Sparkles, ChevronRight, Terminal, Lock, Unlock, Activity } from 'lucide-react';

// --- TYPES & CONSTANTS ---

interface TutorialStep {
    targetId: string;
    text: string;
    desc: string;
    position: 'above' | 'below';
    align: 'center' | 'right' | 'left';
    skipPos: 'top' | 'bottom';
}

const TRANSLATE: Record<'RU' | 'EN', TutorialStep[]> = {
    RU: [
        { 
            targetId: "tutorial-shape-list", 
            text: "Выбор высоты", 
            desc: "Выбери уровень гекса на панели внизу:\n• L0 — базовая равнина (платформа)\n• L1-L9 — уступы, стены и реакторы\nВыбранный блок подсвечен голубым.",
            position: "above", align: "center", skipPos: "top" 
        },
        { 
            targetId: "tutorial-hex-board", 
            text: "Правило поддержки", 
            desc: "Нажмите на пустой гекс для строительства.\nДля L2+ нужны минимум 2 соседа того же уровня для опоры, иначе конструкция обрушится!",
            position: "above", align: "center", skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-blueprint-tablet", 
            text: "Инженерные схемы", 
            desc: "Кликните на планшет чертежей вверху.\nСобирайте указанные геометрические фигуры для получения Очков Навыков (SP).",
            position: "below", align: "center", skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-sp-badge", 
            text: "Очки навыков (SP)", 
            desc: "Тратьте SP в древе улучшений. Нажмите на фиолетовый значок, чтобы повысить инженерный Ранг и открыть новые гексы.",
            position: "below", align: "right", skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-levels-btn", 
            text: "Карта симуляций", 
            desc: "Нажмите эту кнопку, чтобы вернуться к выбору уровней и открыть новые сектора испытаний.",
            position: "above", align: "center", skipPos: "top" 
        },
        { 
            targetId: "tutorial-hex-board", 
            text: "Защита ядра", 
            desc: "Каждые 5 уровней наступает волна ботов. Активируйте тревогу вверху, защитите ядро и заработайте ценные ресурсы!",
            position: "above", align: "center", skipPos: "bottom" 
        }
    ],
    EN: [
        { targetId: "tutorial-shape-list", text: "Height Selection", desc: "Select a hex tier at the bottom panel:\n• L0 — Base platform & plains\n• L1-L9 — Ledges, walls & reactors\nThe selected tier will glow cyan.", position: "above", align: "center", skipPos: "top" },
        { targetId: "tutorial-hex-board", text: "Support Rule", desc: "Tap an empty hex to build on the board.\nNote: L2+ requires 2 adjacent blocks of the same level for support, or it collapses!", position: "above", align: "center", skipPos: "bottom" },
        { targetId: "tutorial-blueprint-tablet", text: "Build Blueprints", desc: "Tap the tablet at the top to view designs.\nSynthesize specific hex shapes on the board to earn valuable Skill Points (SP).", position: "below", align: "center", skipPos: "bottom" },
        { targetId: "tutorial-sp-badge", text: "Skill Points (SP)", desc: "Spend SP in the upgrades tree. Tap the purple badge to increase your engineering Rank and unlock advanced modules.", position: "below", align: "right", skipPos: "bottom" },
        { targetId: "tutorial-levels-btn", text: "Simulation Map", desc: "Tap this button to return to level selection and unlock new tactical sectors.", position: "above", align: "center", skipPos: "top" },
        { targetId: "tutorial-hex-board", text: "Core Defense", desc: "Every 5 levels, hostile bots will attack. Trigger the core defense alert at the top, protect your base and earn rewards!", position: "above", align: "center", skipPos: "bottom" }
    ]
};

const LEVEL_COLORS: Record<string, { top: string; side: string; stroke: string }> = {
    '0': { top: '#1e293b', side: '#0f172a', stroke: '#475569' }, '1': { top: '#0f172a', side: '#020617', stroke: '#0c4a6e' }, '2': { top: '#172554', side: '#0f172a', stroke: '#0284c7' }, '3': { top: '#1e3a8a', side: '#172554', stroke: '#0ea5e9' }, '4': { top: '#312e81', side: '#1e1b4b', stroke: '#6366f1' }, '5': { top: '#4c1d95', side: '#2e1065', stroke: '#8b5cf6' }, '6': { top: '#581c87', side: '#3b0764', stroke: '#a855f7' }, '7': { top: '#701a75', side: '#4a044e', stroke: '#d946ef' }, '8': { top: '#451a03', side: '#271a0c', stroke: '#d97706' }, '9': { top: '#713f12', side: '#422006', stroke: '#f59e0b' }
};

// --- MEMOIZED VISUAL COMPONENTS ---

interface TutorialHexagonProps {
    level: number;
    isSelected?: boolean;
    isCorrect?: boolean;
    isIncorrect?: boolean;
    size?: number;
}

const TutorialHexagon = memo<TutorialHexagonProps>(({ level, isSelected = false, isCorrect = false, isIncorrect = false, size = 28 }) => {
    const rx = size, ry = size * 0.6;
    const wallHeight = 4 + (level >= 0 ? level * 5 : 0);
    const cos30 = 0.866, sin30 = 0.5;
    const points = useMemo(() => [
        { x: rx * cos30, y: ry * sin30 }, { x: 0, y: ry }, { x: -rx * cos30, y: ry * sin30 },
        { x: -rx * cos30, y: -ry * sin30 }, { x: 0, y: -ry }, { x: rx * cos30, y: -ry * sin30 }
    ], [rx, ry]);
    const colorTheme = LEVEL_COLORS[String(level)] || LEVEL_COLORS['0'];
    const strokeColor = isSelected ? '#22d3ee' : (isCorrect ? '#10b981' : (isIncorrect ? '#ef4444' : colorTheme.stroke));
    const fillTop = isIncorrect ? '#4c0519' : (isCorrect ? '#064e3b' : colorTheme.top);
    const fillSide = isIncorrect ? '#310413' : (isCorrect ? '#022c22' : colorTheme.side);
    const topPathD = `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} L ${points[4].x} ${points[4].y} L ${points[5].x} ${points[5].y} Z`;
    const sideWalls = [ { p1: points[5], p2: points[0], opacity: 0.9 }, { p1: points[0], p2: points[1], opacity: 0.95 }, { p1: points[1], p2: points[2], opacity: 0.8 } ];
    const totalWidth = rx * 2.2, totalHeight = ry * 2 + wallHeight + 6, cx = totalWidth / 2, cy = ry + 2;

    return (
        <div className="relative flex flex-col items-center justify-center select-none shrink-0" style={{ width: totalWidth, height: totalHeight }}>
            <svg viewBox={`0 0 ${totalWidth} ${totalHeight}`} width={totalWidth} height={totalHeight} className="overflow-visible">
                <g transform={`translate(${cx}, ${cy})`}>
                    <ellipse cx={0} cy={ry + wallHeight - 1} rx={rx * 0.95} ry={ry * 0.45} fill="rgba(2, 6, 23, 0.75)" filter="blur(1px)" />
                    {wallHeight > 0 && sideWalls.map((wall, idx) => {
                        const d = `M ${wall.p1.x} ${wall.p1.y} L ${wall.p2.x} ${wall.p2.y} L ${wall.p2.x} ${wall.p2.y + wallHeight} L ${wall.p1.x} ${wall.p1.y + wallHeight} Z`;
                        return <path key={idx} d={d} fill={fillSide} stroke={strokeColor} strokeWidth={1} opacity={wall.opacity} strokeLinejoin="round" />;
                    })}
                    <path d={topPathD} fill={fillTop} stroke={strokeColor} strokeWidth={1.5} strokeLinejoin="round" />
                    {isSelected && <path d={topPathD} fill="none" stroke="#22d3ee" strokeWidth={2.5} opacity={0.8} />}
                    <text x={0} y={1.5} textAnchor="middle" dominantBaseline="middle" fill={isIncorrect ? '#fda4af' : (isCorrect ? '#a7f3d0' : (isSelected ? '#67e8f9' : '#ffffff'))} fontSize={rx * 0.78} fontWeight="900" fontFamily="monospace" style={{ textShadow: `0 0 5px ${isSelected ? '#22d3ee' : colorTheme.stroke}` }}>{level}</text>
                </g>
            </svg>
        </div>
    );
});

const TutorialVisualDemo = memo<{ step: number; language: 'RU' | 'EN'; isMobile: boolean }>(({ step, language, isMobile }) => {
    const isRu = language === 'RU';

    // Скрываем демо при очень маленькой высоте экрана, чтобы избежать наложений
    if (isMobile && window.innerHeight < 560) {
        return null;
    }

    if (step === 0) {
        const hexSize = isMobile ? 15 : 20;
        return (
            <div className={`w-full bg-slate-950/80 rounded-xl border border-white/5 relative flex flex-col items-center justify-center overflow-hidden font-mono text-[9px] select-none my-1 ${isMobile ? 'h-20 p-2' : 'h-28 p-3'}`}>
                <div className="absolute inset-0 bg-grid-pattern opacity-15 pointer-events-none" />
                <div className="text-slate-400 font-extrabold uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 self-start text-[8px] relative z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {isRu ? 'ВЫСОТА И ЦВЕТ (0...9)' : 'HEIGHT & COLORS (0...9)'}
                </div>
                <div className="relative flex gap-3 sm:gap-4 items-center justify-center w-full flex-1 z-10">
                    {[0, 1, 2, 3].map((lvl) => {
                        const isSel = lvl === 2;
                        return (
                            <motion.div key={lvl} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 * lvl }} className="flex flex-col items-center relative">
                                <motion.div animate={isSel ? { y: [-1, 1, -1], filter: ["drop-shadow(0 0 4px rgba(34,211,238,0.3))", "drop-shadow(0 0 10px rgba(34,211,238,0.7))", "drop-shadow(0 0 4px rgba(34,211,238,0.3))"] } : {}} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                                    <TutorialHexagon level={lvl} isSelected={isSel} size={lvl === 3 ? hexSize + 2 : lvl === 2 ? hexSize : hexSize - 2} />
                                </motion.div>
                                <span className={`text-[7px] mt-0.5 font-black ${isSel ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`}>{isSel ? (isRu ? 'ВЫБРАН' : 'SELECTED') : `L${lvl}`}</span>
                            </motion.div>
                        );
                    })}
                </div>
            </div>
        );
    }

    if (step === 1) {
        const hexSize = isMobile ? 12 : 16;
        return (
            <div className="w-full flex flex-col gap-2 my-1">
                <div className="grid grid-cols-2 gap-2">
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={`bg-emerald-950/20 rounded-xl border border-emerald-500/35 flex flex-col items-center relative overflow-hidden justify-between ${isMobile ? 'h-20 p-1.5' : 'h-28 p-2'}`}>
                        <div className="text-emerald-400 font-black uppercase tracking-wider text-[8px] flex items-center gap-1 self-start"><span className="w-2 h-2 rounded-full bg-emerald-500 flex items-center justify-center text-[6px] text-black font-extrabold">✓</span>{isRu ? 'СТАБИЛЬНО' : 'STABLE'}</div>
                        <div className="relative w-full flex-1 flex items-center justify-center gap-0.5 sm:gap-1">
                            <div className="flex flex-col items-center opacity-70"><TutorialHexagon level={2} size={hexSize - 2} /></div>
                            <motion.div animate={{ y: [1, -1, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                                <TutorialHexagon level={2} isCorrect={true} size={hexSize} />
                            </motion.div>
                            <div className="flex flex-col items-center opacity-70"><TutorialHexagon level={2} size={hexSize - 2} /></div>
                        </div>
                        <span className="text-emerald-500/80 text-[7px] font-black uppercase tracking-wider text-center">{isRu ? '2 СОСЕДА ✓' : '2 NEIGHBORS ✓'}</span>
                    </motion.div>
                    <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className={`bg-rose-950/20 rounded-xl border border-rose-500/30 flex flex-col items-center relative overflow-hidden justify-between ${isMobile ? 'h-20 p-1.5' : 'h-28 p-2'}`}>
                        <div className="text-rose-400 font-black uppercase tracking-wider text-[8px] flex items-center gap-1 self-start"><span className="w-2 h-2 rounded-full bg-rose-500 flex items-center justify-center text-[6px] text-black font-extrabold">✕</span>{isRu ? 'ОБВАЛ' : 'UNSTABLE'}</div>
                        <div className="relative w-full flex-1 flex items-center justify-center gap-0.5 sm:gap-1">
                            <div className="flex flex-col items-center opacity-30"><TutorialHexagon level={0} size={hexSize - 4} /></div>
                            <motion.div animate={{ x: [-0.5, 0.5, -0.7, 0.7, -0.5, 0], y: [0.3, -0.3, 0.5, -0.5, 0.3, 0] }} transition={{ repeat: Infinity, duration: 0.5, repeatDelay: 0.2 }}>
                                <TutorialHexagon level={2} isIncorrect={true} size={hexSize} />
                            </motion.div>
                            <div className="flex flex-col items-center opacity-30"><TutorialHexagon level={0} size={hexSize - 4} /></div>
                        </div>
                        <span className="text-rose-400 text-[7px] font-black uppercase text-center animate-pulse tracking-wide">{isRu ? 'НЕТ ОПОРЫ ⚠️' : 'NO BASIS ⚠️'}</span>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`w-full bg-slate-950/90 rounded-xl border border-indigo-500/30 relative flex flex-col overflow-hidden font-mono text-[9px] select-none shadow-[0_0_20px_rgba(99,102,241,0.1)] ${isMobile ? 'h-22 p-2 gap-1' : 'h-32 p-3 gap-2'}`}>
                <div className="flex items-center gap-1.5 text-indigo-400 font-black text-[8px] uppercase tracking-widest border-b border-indigo-500/20 pb-1 sm:pb-1.5">
                    <Terminal className="w-3 h-3" /> SYS_TERMINAL.EXE
                </div>
                <div className="space-y-1">
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-emerald-400 text-[8px] sm:text-[9px]">{'>'} INITIALIZING SANDBOX MODE...</motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-cyan-400 text-[8px] sm:text-[9px] flex items-center gap-1">{'>'} LOADING BUILD NODES: <span className="text-white text-[7px] sm:text-[8px]">[###]</span> 100%</motion.div>
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="text-amber-400 text-[8px] sm:text-[9px]">{'>'} AWAITING COMMANDER INPUT...</motion.div>
                </div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="absolute bottom-1.5 right-2 sm:bottom-2 sm:right-3 text-white text-[9px] font-bold">▮</motion.div>
            </motion.div>
        );
    }

    if (step === 3) {
        const iconSize = isMobile ? 'w-8 h-8' : 'w-10 h-10';
        return (
            <div className={`w-full bg-slate-950/80 rounded-xl border border-white/5 relative flex flex-col items-center justify-center overflow-hidden font-mono text-[9px] select-none my-1 ${isMobile ? 'h-20 p-2' : 'h-28 p-3'}`}>
                <div className="text-slate-400 font-extrabold uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 self-start text-[8px]"><span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />{isRu ? 'ОЧКИ SP И РАНГ' : 'SKILL POINTS & RANK'}</div>
                <div className="flex items-center gap-3 sm:gap-4 relative mt-1">
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1, boxShadow: "0 0 15px rgba(99,102,241,0.6)" }} transition={{ type: "spring", stiffness: 200, damping: 10 }} className={`${iconSize} rounded-full bg-indigo-950/70 border border-indigo-400/40 flex flex-col items-center justify-center`}>
                        <span className="text-indigo-300 text-[6px] sm:text-[7px] font-extrabold tracking-tighter leading-none">SP</span><span className="text-white text-[9px] sm:text-[11px] font-black leading-none mt-0.5">+1</span>
                    </motion.div>
                    <div className="w-8 sm:w-12 h-[2px] bg-indigo-900 relative">
                        <motion.div className="absolute top-[-3px] w-2 h-2 rounded-full bg-indigo-400 shadow-[0_0_8px_indigo]" initial={{ left: 0 }} animate={{ left: '100%' }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
                    </div>
                    <motion.div initial={{ scale: 0.8, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col items-center">
                        <div className={`${iconSize} rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center relative`}>
                            <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 2, delay: 1 }}><Lock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" /></motion.div>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="absolute inset-0 flex items-center justify-center"><Unlock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /></motion.div>
                        </div>
                        <span className="text-[5px] sm:text-[6px] text-emerald-400 mt-1 uppercase font-black tracking-widest">{isRu ? 'ОТКРЫТ!' : 'UNLOCKED'}</span>
                    </motion.div>
                </div>
            </div>
        );
    }

    if (step === 4) {
        const nodeSize = isMobile ? 'w-7 h-7 text-[7px]' : 'w-8 h-8 text-[8px]';
        return (
            <div className={`w-full bg-slate-950/80 rounded-xl border border-white/5 relative flex flex-col items-center justify-center overflow-hidden font-mono text-[9px] select-none my-1 ${isMobile ? 'h-20 p-2' : 'h-28 p-3'}`}>
                <div className="text-slate-400 font-extrabold uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 self-start text-[8px]"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />{isRu ? 'НАВИГАЦИЯ' : 'NAVIGATION'}</div>
                <div className="flex items-center justify-center gap-4 sm:gap-6 relative w-full flex-1">
                    <div className="relative"><div className={`${nodeSize} rounded-full bg-cyan-950 border border-cyan-400/80 flex items-center justify-center text-cyan-300 font-black`}>1.1</div><div className="absolute -inset-1 rounded-full border border-cyan-400/30 animate-ping pointer-events-none" /></div>
                    <div className="w-8 sm:w-12 h-[1px] bg-slate-800 relative"><motion.div className="absolute w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_cyan]" animate={{ x: isMobile ? [0, 28, 0] : [0, 44, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} /></div>
                    <div className="relative"><div className={`${nodeSize} rounded-full bg-indigo-950/40 border border-indigo-500/20 flex items-center justify-center text-indigo-400`}>1.2</div></div>
                </div>
            </div>
        );
    }

    if (step === 5) {
        const coreSize = isMobile ? 'w-10 h-10 text-[7px]' : 'w-12 h-12 text-[8px]';
        return (
            <div className={`w-full bg-slate-950/80 rounded-xl border border-white/5 relative flex flex-col items-center justify-center overflow-hidden font-mono text-[9px] select-none my-1 ${isMobile ? 'h-22 p-2' : 'h-32 p-3'}`}>
                <div className="absolute inset-0 bg-red-950/5 pointer-events-none" /><div className="absolute inset-0 bg-grid-pattern opacity-10 pointer-events-none" />
                <div className="text-slate-400 font-extrabold uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 self-start text-[8px]"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />{isRu ? 'ОБОРОНА ЯДРА' : 'CORE DEFENSE'}</div>
                <div className="relative w-full flex-1 flex items-center justify-center gap-3 sm:gap-4">
                    <div className="relative z-10">
                        <motion.div className={`${coreSize} rounded-full bg-rose-950/50 border-2 border-rose-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.4)]`} animate={{ scale: [1, 1.08, 1] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}>
                            <span className="font-extrabold tracking-tight">CORE</span>
                        </motion.div>
                        <div className="absolute -inset-1.5 border border-rose-500/20 rounded-full animate-ping duration-[2s]" />
                    </div>
                    <div className="relative w-16 sm:w-24 h-10 sm:h-12">
                        <svg className="w-full h-full" viewBox="0 0 80 40">
                            <motion.path d="M 30, 5 A 25,25 0 0,0 30,35" fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} />
                            <motion.circle r="2.5" fill="#ef4444" animate={{ cx: [70, 30], cy: [20, 20], opacity: [0, 1, 0.2, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: "linear" }} />
                            <motion.circle cx="30" cy="20" r="2.5" fill="#38bdf8" animate={{ scale: [0, 2, 0], opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.6, delay: 0.8 }} />
                        </svg>
                    </div>
                    <div className="text-right">
                        <span className="text-rose-400 font-extrabold uppercase leading-none tracking-wider animate-pulse block text-[8px] sm:text-[9px]">{isRu ? 'АТАКА' : 'WAVE'}</span>
                        <span className="text-cyan-400 font-bold uppercase block text-[7px] sm:text-[8px] mt-0.5">{isRu ? 'ЩИТ' : 'SHIELD'}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
});

// --- MAIN COMPONENT ---

export const StoryTutorial: React.FC = () => {
    const isTutorialActive = useGameStore(state => state.isStoryTutorialActive);
    const setIsTutorialActive = useGameStore(state => state.setIsStoryTutorialActive);
    const language = useGameStore(state => state.language);
    
    const [step, setStep] = useState(0);
    const [cutout, setCutout] = useState<{x: number, y: number, w: number, h: number} | null>(null);
    const [isMobile, setIsMobile] = useState(false);

    const tutorialEventTarget = useMemo(() => new EventTarget(), []);

    useEffect(() => {
        const startTutorial = () => { setStep(0); setIsTutorialActive(true); };
        tutorialEventTarget.addEventListener('start-story-tutorial', startTutorial);
        (window as any).startStoryTutorial = () => tutorialEventTarget.dispatchEvent(new Event('start-story-tutorial'));
        return () => {
            tutorialEventTarget.removeEventListener('start-story-tutorial', startTutorial);
            delete (window as any).startStoryTutorial;
        };
    }, [setIsTutorialActive, tutorialEventTarget]);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        if (isTutorialActive) {
            const setCollapsed = step !== 2; 
            if (typeof (window as any).setStoryNarrativeCollapsed === 'function') {
                (window as any).setStoryNarrativeCollapsed(setCollapsed);
            }
        }
    }, [step, isTutorialActive]);

    const handleClose = useCallback(() => {
        audioService.play('UI_CLICK');
        setIsTutorialActive(false);
        setStep(0);
        try { localStorage.setItem('hexopol_story_tutorial_completed', 'true'); } catch { /* storage disabled */ }
    }, [setIsTutorialActive]);

    const handleNext = useCallback((e?: React.MouseEvent | React.TouchEvent) => {
        if (e) { e.stopPropagation(); e.preventDefault(); }
        audioService.play('UI_CLICK');
        const steps = language === 'RU' ? TRANSLATE.RU : TRANSLATE.EN;
        if (step >= steps.length - 1) { handleClose(); } else { setStep(prev => prev + 1); }
    }, [language, step, handleClose]);

    const steps = language === 'RU' ? TRANSLATE.RU : TRANSLATE.EN;
    const currentConfig = steps[step];

    useEffect(() => {
        if (!isTutorialActive || !currentConfig) return;

        const updateCutout = () => {
            const el = document.getElementById(currentConfig.targetId);
            let rect;
            const centerSize = isMobile ? 140 : 160;
            if (currentConfig.targetId === "tutorial-hex-board") {
                rect = { left: window.innerWidth / 2 - centerSize/2, top: window.innerHeight / 2 - centerSize/2, width: centerSize, height: centerSize };
            } else if (el) {
                rect = el.getBoundingClientRect();
            }

            if (rect) {
                const next = { x: rect.left, y: Math.max(0, rect.top), w: rect.width, h: Math.min(window.innerHeight - rect.top, rect.height) };
                setCutout(prev => { if (prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h) return prev; return next; });
            } else {
                const next = { x: window.innerWidth / 2 - 100, y: window.innerHeight / 2 - 100, w: 200, h: 200 };
                setCutout(prev => { if (prev && prev.x === next.x && prev.y === next.y && prev.w === next.w && prev.h === next.h) return prev; return next; });
            }
        };

        updateCutout();
        const timeout = setTimeout(updateCutout, 300);
        window.addEventListener('resize', updateCutout);
        return () => { clearTimeout(timeout); window.removeEventListener('resize', updateCutout); };
    }, [isTutorialActive, step, currentConfig, isMobile]);

    const getCardStyle = useCallback((): React.CSSProperties => {
        if (!isMobile) {
            const baseStyle: React.CSSProperties = { position: 'absolute', width: '380px', maxWidth: '92vw' };
            if (currentConfig?.position === 'above') { baseStyle.bottom = '100%'; baseStyle.marginBottom = '24px'; } 
            else { baseStyle.top = '100%'; baseStyle.marginTop = '24px'; }
            if (currentConfig?.align === 'center') { baseStyle.left = '50%'; baseStyle.transform = 'translateX(-50%)'; } 
            else if (currentConfig?.align === 'right') { baseStyle.right = 0; baseStyle.transformOrigin = 'right'; } 
            else { baseStyle.left = 0; baseStyle.transformOrigin = 'left'; }
            return baseStyle;
        }

        // На мобильных устройствах весь контент накрыт темной маской. Карта находится вне фокуса,
        // поэтому мы можем задействовать максимум вертикального пространства без искусственных ограничений.
        const safeTop = 55;     // Отступ для выреза/статус-бара и кнопки закрытия
        const safeBottom = 35;  // Отступ для домашнего индикатора iPhone / углов экрана
        const gap = 12;         // Зазор между подсвеченной областью и карточкой
        const sidePadding = 12; // Боковые отступы от краев экрана

        if (!cutout) {
            return { 
                position: 'fixed', 
                bottom: `${safeBottom}px`, 
                left: `${sidePadding}px`, 
                right: `${sidePadding}px`, 
                width: 'auto', 
                maxHeight: `calc(100vh - ${safeTop + safeBottom}px)`,
                display: 'flex',
                flexDirection: 'column'
            };
        }

        const spaceAbove = cutout.y - safeTop;
        const spaceBelow = window.innerHeight - (cutout.y + cutout.h) - safeBottom;
        const putAbove = spaceAbove > spaceBelow;

        if (putAbove) {
            return {
                position: 'fixed',
                bottom: `${window.innerHeight - cutout.y + gap}px`,
                left: `${sidePadding}px`,
                right: `${sidePadding}px`,
                width: 'auto',
                maxHeight: `${Math.max(160, cutout.y - gap - safeTop)}px`,
                display: 'flex',
                flexDirection: 'column',
            };
        } else {
            return {
                position: 'fixed',
                top: `${cutout.y + cutout.h + gap}px`,
                left: `${sidePadding}px`,
                right: `${sidePadding}px`,
                width: 'auto',
                maxHeight: `${Math.max(160, window.innerHeight - safeBottom - (cutout.y + cutout.h + gap))}px`,
                display: 'flex',
                flexDirection: 'column',
            };
        }
    }, [isMobile, cutout, currentConfig]);

    if (!isTutorialActive) return null;

    const isLastStep = step === steps.length - 1;

    return (
        <div 
            id="story-onboarding-container" 
            className="fixed inset-0 z-[200] select-none pointer-events-auto cursor-pointer"
            onClick={handleNext}
            onTouchStart={handleNext}
        >
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[80]">
                <defs>
                    <mask id="story-spotlight-mask">
                        <rect width="100%" height="100%" fill="white" />
                        {cutout && (
                            <motion.rect 
                                initial={false}
                                animate={{ 
                                    x: cutout.x - 16, 
                                    y: cutout.y - 16, 
                                    width: cutout.w + 32, 
                                    height: cutout.h + 32, 
                                    rx: 24 
                                }}
                                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                                fill="black" 
                            />
                        )}
                    </mask>
                </defs>
                <rect width="100%" height="100%" fill="rgba(2, 6, 23, 0.96)" mask="url(#story-spotlight-mask)" className="pointer-events-none" />
            </svg>

            <AnimatePresence mode="popLayout">
                {cutout && (
                    <motion.div 
                        key={step}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="absolute z-[90] pointer-events-none flex flex-col items-center justify-center"
                        style={{ left: cutout.x, top: cutout.y, width: cutout.w, height: cutout.h }}
                    >
                        <motion.div 
                            className="absolute inset-[-12px] rounded-2xl border-2 border-cyan-400 shadow-[0_0_30px_rgba(34,211,238,0.6),inset_0_0_15px_rgba(34,211,238,0.4)]" 
                            animate={{ opacity: [0.6, 1, 0.6] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                        <div className="absolute inset-[-18px] border border-indigo-400/40 rounded-3xl pointer-events-none" />
                        <div className="absolute inset-[-24px] border-2 border-cyan-400/20 rounded-3xl animate-ping duration-[2000ms] pointer-events-none" />
                        
                        {/* Tooltip Card Container */}
                        <div 
                            style={getCardStyle()}
                            className="bg-slate-950/95 border border-cyan-500/40 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.95)] p-3 sm:p-4 flex flex-col gap-1.5 sm:gap-2 text-left backdrop-blur-2xl pointer-events-auto overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80"></div>
                            
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-2 shrink-0">
                                <span className="font-mono text-[9px] sm:text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-extrabold flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                                    {language === 'RU' ? `ШАГ ${step + 1} / ${steps.length}` : `STEP ${step + 1} / ${steps.length}`}
                                </span>
                                <span className="font-mono text-[7px] sm:text-[8px] text-slate-500 font-bold uppercase tracking-wider hidden sm:block">NEBULA_OS</span>
                            </div>

                            {/* Scrollable Content Area */}
                            <div className="flex-1 overflow-y-auto no-scrollbar min-h-0 pr-1">
                                <motion.h4 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    transition={{ delay: 0.1 }}
                                    className="text-sm sm:text-base md:text-lg font-black font-sans text-white uppercase tracking-wider leading-tight mb-1"
                                >
                                    {currentConfig.text}
                                </motion.h4>

                                <motion.p 
                                    initial={{ opacity: 0, x: -10 }} 
                                    animate={{ opacity: 1, x: 0 }} 
                                    transition={{ delay: 0.2 }}
                                    className="text-slate-300 text-[11px] sm:text-xs md:text-sm font-sans font-medium leading-relaxed select-none whitespace-pre-line mb-2"
                                >
                                    {currentConfig.desc}
                                </motion.p>

                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    transition={{ delay: 0.3 }}
                                >
                                    <TutorialVisualDemo step={step} language={language} isMobile={isMobile} />
                                </motion.div>
                            </div>

                            {/* Progress & Footer */}
                            <div className="shrink-0 pt-2 mt-1 border-t border-white/5">
                                <div className="w-full h-[3px] bg-slate-800 rounded-full overflow-hidden mb-3">
                                    <motion.div 
                                        className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
                                        transition={{ duration: 0.5, ease: "easeOut" }}
                                    />
                                </div>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleNext(); }}
                                    className="w-full bg-gradient-to-r from-cyan-600/80 to-indigo-600/80 hover:from-cyan-500 hover:to-indigo-500 border border-cyan-400/50 text-white font-black uppercase tracking-widest text-[10px] sm:text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95 shadow-[0_0_15px_rgba(34,211,238,0.3)]"
                                >
                                    {isLastStep 
                                        ? (language === 'RU' ? 'ЗАВЕРШИТЬ' : 'FINISH')
                                        : (language === 'RU' ? 'ПРОДОЛЖИТЬ' : 'NEXT')}
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Skip Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="absolute top-[calc(env(safe-area-inset-top)+16px)] right-[16px] z-[250] w-10 h-10 rounded-full border border-slate-700/60 hover:border-rose-500/50 hover:bg-rose-950/40 transition-all pointer-events-auto shadow-2xl bg-slate-950/95 flex items-center justify-center backdrop-blur-md active:scale-90 group"
                aria-label="Skip Tutorial"
                title={language === 'RU' ? 'Пропустить обучение' : 'Skip Tutorial'}
            >
                <X className="w-4 h-4 text-slate-400 group-hover:text-rose-400 transition-colors" />
            </button>
        </div>
    );
};