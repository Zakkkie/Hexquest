import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store.ts';
import { audioService } from '../../services/audioService.ts';
import { X, Sparkles } from 'lucide-react';

const TRANSLATE = {
    RU: [
        { 
            targetId: "tutorial-shape-list", 
            text: "Шаг 1. Выбор высоты блоков", 
            desc: "Внизу экрана выберите блок нужной высоты (L0, L1, L2). Выбранный блок подсветится сияющим цветом и будет подготовлен для строительства.",
            position: "above", 
            align: "center", 
            skipPos: "top" 
        },
        { 
            targetId: "tutorial-hex-board", 
            text: "Шаг 2. Как строить без ошибок!", 
            desc: "Кликните на гекс, чтобы изменить его высоту:\n• Высота L1 доступна без ограничений.\n• Для L2 и выше нужны 2 соседа такой же высоты или выше (опора), иначе блок станет неустойчивым!",
            position: "above", 
            align: "center", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-sp-badge", 
            text: "Шаг 3. Очки Навыков (SP) и Ранг", 
            desc: "Каждая фигура по чертежу даёт +1 SP. Нажмите на фиолетовый индикатор вверху, чтобы улучшить Ранг инженера и открыть высокие блоки (до L9)!",
            position: "below", 
            align: "right", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-levels-btn", 
            text: "Шаг 4. Смена симуляций", 
            desc: "Нажмите эту кнопку, чтобы вернуться на главную карту космических симуляций Nebula для выбора новых испытаний.",
            position: "above", 
            align: "center", 
            skipPos: "top" 
        }
    ],
    EN: [
        { 
            targetId: "tutorial-shape-list", 
            text: "Step 1. Choose Block Heights", 
            desc: "Tap any level block (e.g. L0, L1, L2) at the bottom. The selected block will highlight in vibrant cyan, ready to be built on the board.",
            position: "above", 
            align: "center", 
            skipPos: "top" 
        },
        { 
            targetId: "tutorial-hex-board", 
            text: "Step 2. Smart Building & Stability", 
            desc: "Click any grid hex to set height!\n• L1 elevations can be placed anywhere.\n• Level L2 or higher requires at least 2 adjacent neighbors of that height or higher, or it collapse!",
            position: "above", 
            align: "center", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-sp-badge", 
            text: "Step 3. Engineering Skill Tree (SP)", 
            desc: "Solving patterns grants +1 Skill Point (SP). Click this glowing token to upgrade your Engineering Rank and access blocks up to L9.",
            position: "below", 
            align: "right", 
            skipPos: "bottom" 
        },
        { 
            targetId: "tutorial-levels-btn", 
            text: "Step 4. Cosmic Control Map", 
            desc: "Press this navigation deck button to return to the simulation levels map to explore space zones and select challenges.",
            position: "above", 
            align: "center", 
            skipPos: "top" 
        }
    ]
};

// Custom interactive CSS/motion demonstration cards inside tooltips to explain mechanics visually
const TutorialVisualDemo: React.FC<{ step: number; language: string }> = ({ step, language }) => {
    const isRu = language === 'RU';

    if (step === 0) {
        return (
            <div className="w-full bg-slate-950/80 rounded-xl border border-white/5 relative p-2 sm:p-2.5 flex flex-col items-center justify-center overflow-hidden font-mono text-[9px] select-none h-20 sm:h-24 md:h-28 my-1">
                <div className="text-slate-400 font-extrabold uppercase tracking-widest mb-1 sm:mb-2 flex items-center gap-1.5 self-start text-[7.5px] sm:text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    {isRu ? 'ВЫБОР ВЫСОТЫ L0...L9' : 'SELECTING TARGET HEIGHT'}
                </div>
                
                {/* Visual carousel list with click animation */}
                <div className="relative flex gap-1.5 sm:gap-2 items-end justify-center w-full h-8 sm:h-10 md:h-11 mt-0.5 sm:mt-1">
                    {[
                        { label: 'L0', h: 'h-3 sm:h-4 bg-slate-800' },
                        { label: 'L1', h: 'h-5 sm:h-6 bg-slate-700' },
                        { label: 'L2', h: 'h-7 sm:h-9 bg-cyan-500/25 border-cyan-400 border shadow-[0_0_12px_rgba(34,211,238,0.4)]', selected: true },
                        { label: 'L3', h: 'h-9 sm:h-11 bg-slate-600/40' },
                    ].map((item, idx) => (
                        <div key={idx} className="flex flex-col items-center w-8 sm:w-11 relative">
                            <motion.div 
                                className={`w-full ${item.h} rounded-md flex items-center justify-center text-[7px] sm:text-[8px] font-black ${item.selected ? 'text-cyan-300' : 'text-slate-500 border border-slate-700/50'}`}
                                animate={item.selected ? { scale: [1, 1.05, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 2 }}
                            >
                                {item.label}
                            </motion.div>
                            <span className={`text-[6px] sm:text-[7px] mt-0.5 sm:mt-1 font-bold ${item.selected ? 'text-cyan-400 animate-pulse' : 'text-slate-600'}`}>
                                {item.selected ? (isRu ? 'СЕКЦИЯ' : 'ACTIVE') : 'READY'}
                            </span>
                        </div>
                    ))}

                    {/* Laser touch pointer hand clicking */}
                    <motion.div 
                        className="absolute w-4 h-4 sm:w-5 sm:h-5 rounded-full border border-cyan-400 bg-cyan-400/20 z-10 flex items-center justify-center"
                        style={{ bottom: -2, right: '35%' }}
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
                <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {/* ACCORDING TO PHYSICAL CO-SUPPORT (CORRECT) */}
                    <div className="bg-emerald-950/20 rounded-xl border border-emerald-500/35 p-1.5 sm:p-2 flex flex-col items-center relative overflow-hidden h-24 sm:h-28 md:h-32 justify-between">
                        <div className="text-emerald-400 font-black uppercase tracking-wider text-[7px] sm:text-[7.5px] flex items-center gap-1 self-start">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 flex items-center justify-center text-[5.5px] sm:text-[6px] text-black font-extrabold">✓</span>
                            {isRu ? 'СТАБИЛЬНО' : 'STABLE WAY'}
                        </div>
                        
                        <div className="relative w-full flex-1 flex items-center justify-center gap-1">
                            <div className="w-6 h-8 sm:w-8 sm:h-12 bg-emerald-900/30 border border-emerald-500/30 rounded-md flex flex-col items-center justify-center">
                                <span className="text-[8px] sm:text-[10px] font-black text-emerald-400/80">L2</span>
                                <span className="text-[4px] sm:text-[5px] text-slate-500 uppercase leading-none">{isRu ? 'ОПОРА' : 'SUPPORT'}</span>
                            </div>
                            <motion.div 
                                className="w-6 h-8 sm:w-8 sm:h-12 bg-emerald-600/40 border-2 border-emerald-400 rounded-md flex flex-col items-center justify-center"
                                animate={{ y: [2, 0, 2] }}
                                transition={{ repeat: Infinity, duration: 1.8 }}
                            >
                                <span className="text-[8px] sm:text-[10px] font-black text-emerald-300">L2</span>
                                <span className="text-[4px] sm:text-[5px] text-white uppercase font-black leading-none">{isRu ? 'НОВЫЙ' : 'NEW'}</span>
                                <div className="absolute inset-0 border border-emerald-300/30 rounded-md animate-ping pointer-events-none" />
                            </motion.div>
                            <div className="w-6 h-8 sm:w-8 sm:h-12 bg-emerald-900/30 border border-emerald-500/30 rounded-md flex flex-col items-center justify-center">
                                <span className="text-[8px] sm:text-[10px] font-black text-emerald-400/80">L2</span>
                                <span className="text-[4px] sm:text-[5px] text-slate-500 uppercase leading-none">{isRu ? 'ОПОРА' : 'SUPPORT'}</span>
                            </div>
                        </div>
                        <span className="text-emerald-500/80 text-[6px] sm:text-[6.5px] font-black uppercase tracking-wider text-center">
                            {isRu ? '2 СОСЕДА РЯДОМ ✓' : '2 NEIGHBORS FOUND ✓'}
                        </span>
                    </div>

                    {/* UNSTABLE CRITICAL BREAKDOWN (INCORRECT) */}
                    <div className="bg-rose-950/25 rounded-xl border border-rose-500/30 p-1.5 sm:p-2 flex flex-col items-center relative overflow-hidden h-24 sm:h-28 md:h-32 justify-between">
                        <div className="text-rose-400 font-black uppercase tracking-wider text-[7px] sm:text-[7.5px] flex items-center gap-1 self-start">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-rose-500 flex items-center justify-center text-[5.5px] sm:text-[6px] text-black font-extrabold">✕</span>
                            {isRu ? 'НЕЛЬЗЯ СТРОИТЬ' : 'UNSTABLE WAY'}
                        </div>

                        <div className="relative w-full flex-1 flex items-center justify-center gap-1">
                            <div className="w-6 h-5 sm:w-8 sm:h-7 opacity-20 bg-slate-800 border border-slate-700 rounded-md flex items-center justify-center">
                                <span className="text-[6px] sm:text-[7px] text-slate-500">L0</span>
                            </div>
                            
                            <motion.div 
                                className="w-6 h-8 sm:w-8 sm:h-12 bg-rose-900/60 border-2 border-rose-400 rounded-md flex flex-col items-center justify-center text-center px-0.5"
                                animate={{
                                    x: [-1, 1, -1.5, 1.5, -1, 0],
                                    y: [1, -1, 1.5, -1, 0, 0],
                                    borderColor: ['#f43f5e', '#ef4444', '#f43f5e']
                                }}
                                transition={{
                                    repeat: Infinity,
                                    duration: 0.9,
                                    repeatDelay: 0.1
                                }}
                            >
                                <span className="text-[8px] sm:text-[10px] font-black text-rose-300">L2</span>
                                <span className="text-[4px] sm:text-[5px] text-rose-400 font-extrabold leading-tight uppercase animate-pulse">{isRu ? 'ПЛАТЫ НЕТ' : 'NO BACKING'}</span>
                            </motion.div>

                            <div className="w-6 h-5 sm:w-8 sm:h-7 opacity-20 bg-slate-800 border border-slate-700 rounded-md flex items-center justify-center">
                                <span className="text-[6px] sm:text-[7px] text-slate-500">L0</span>
                            </div>
                        </div>

                        <span className="text-rose-400 text-[6px] sm:text-[6.5px] font-black uppercase text-center animate-pulse tracking-wide">
                            {isRu ? 'КРАХ! НЕТ ОПОРЫ ⚠️' : 'CRASH! NO BASIS ⚠️'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    if (step === 2) {
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

    if (step === 3) {
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
