import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store.ts';
import { audioService } from '../../services/audioService.ts';
import { X } from 'lucide-react';

const TRANSLATE = {
    RU: [
        { targetId: "tutorial-shape-list", text: "ВЫБЕРИ ФИГУРУ", position: "above", align: "center", skipPos: "top" },
        { targetId: "tutorial-hex-board", text: "ПОСТАВЬ СЮДА", position: "below", align: "center", skipPos: "top" },
        { targetId: "tutorial-sp-badge", text: "ПРОКАЧАЙ НАВЫК", position: "below", align: "right", skipPos: "bottom" },
        { targetId: "tutorial-levels-btn", text: "КАРТА УРОВНЕЙ", position: "above", align: "center", skipPos: "top" }
    ],
    EN: [
        { targetId: "tutorial-shape-list", text: "CHOOSE SHAPE", position: "above", align: "center", skipPos: "top" },
        { targetId: "tutorial-hex-board", text: "PLACE HERE", position: "below", align: "center", skipPos: "top" },
        { targetId: "tutorial-sp-badge", text: "UPGRADE SKILL", position: "below", align: "right", skipPos: "bottom" },
        { targetId: "tutorial-levels-btn", text: "LEVELS MAP", position: "above", align: "center", skipPos: "top" }
    ]
};

export const StoryTutorial: React.FC = () => {
    const isTutorialActive = useGameStore(state => state.isStoryTutorialActive);
    const setIsTutorialActive = useGameStore(state => state.setIsStoryTutorialActive);
    const language = useGameStore(state => state.language);
    
    const [step, setStep] = useState(0);
    const [cutout, setCutout] = useState<{x: number, y: number, w: number, h: number} | null>(null);

    // Provide globally so parent views can trigger it if needed
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

    useEffect(() => {
        if (!isTutorialActive) return;

        const updateCutout = () => {
            if (!currentConfig) return;
            const el = document.getElementById(currentConfig.targetId);
            
            let rect;
            if (currentConfig.targetId === "tutorial-hex-board") {
                rect = {
                    left: window.innerWidth / 2 - 50,
                    top: window.innerHeight / 2 - 50,
                    width: 100,
                    height: 100
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
                // Fallback to center if element not on screen yet
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
        const timeout = setTimeout(updateCutout, 300); // Wait for animations
        window.addEventListener('resize', updateCutout);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', updateCutout);
        };
    }, [isTutorialActive, step, currentConfig]);

    if (!isTutorialActive) return null;

    return (
        <div 
            id="story-onboarding-container" 
            className="fixed inset-0 z-[200] select-none pointer-events-auto cursor-pointer"
            onClick={handleNext}
            onTouchStart={handleNext}
        >
            {/* SVG Mask overlay for high-precision dimming and cutout */}
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
                                rx={cutout.w > 200 ? 16 : 8} 
                                fill="black" 
                            />
                        )}
                    </mask>
                </defs>
                <rect 
                    width="100%" 
                    height="100%" 
                    fill="rgba(5, 10, 25, 0.88)" 
                    mask="url(#story-spotlight-mask)" 
                    className="pointer-events-none opacity-95 transition-all duration-300"
                />
            </svg>

            <AnimatePresence mode="popLayout">
                {cutout && (
                    <motion.div 
                        key={step}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-[90] pointer-events-none flex flex-col items-center justify-center"
                        style={{
                            left: cutout.x,
                            top: cutout.y,
                            width: cutout.w,
                            height: cutout.h
                        }}
                    >
                        {/* Glowing Ring */}
                        <div className="absolute inset-[-8px] rounded-xl border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6),inset_0_0_10px_rgba(52,211,153,0.4)] animate-pulse" />
                        
                        {/* Ping Wave */}
                        <div className="absolute inset-[-14px] border-[3px] border-emerald-400/30 rounded-xl animate-ping duration-[2000ms]" />
                        
                        {/* Target Text Label */}
                        <div 
                            className={`absolute bg-slate-950/95 border border-emerald-500/80 text-emerald-300 text-sm md:text-base font-black font-mono px-4 py-2 rounded-lg shadow-2xl animate-bounce flex items-center justify-center gap-2 max-w-[90vw] text-center
                                ${currentConfig.position === 'above' ? '-top-16' : '-bottom-12'}
                                ${currentConfig.align === 'center' ? 'left-1/2 -translate-x-1/2 w-max' : ''}
                                ${currentConfig.align === 'right' ? 'right-0 w-max origin-right' : ''}
                                ${currentConfig.align === 'left' ? 'left-0 w-max origin-left' : ''}
                            `}
                        >
                            <span className="whitespace-nowrap overflow-hidden text-ellipsis block">{currentConfig.text.toUpperCase()}</span>
                        </div>
                        
                        {/* Sub-text hint to tap anywhere */}
                        <div 
                            className={`absolute text-slate-400/80 text-[10px] font-sans font-medium whitespace-nowrap uppercase tracking-widest
                                ${currentConfig.position === 'above' ? '-top-[90px]' : '-bottom-[60px]'}
                                ${currentConfig.align === 'center' ? 'left-1/2 -translate-x-1/2' : ''}
                                ${currentConfig.align === 'right' ? 'right-0' : ''}
                                ${currentConfig.align === 'left' ? 'left-0' : ''}
                            `}
                        >
                            {language === 'RU' ? 'Нажмите в любое место' : 'Tap anywhere to continue'}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Skip Button - Positioned consistently and safely in the vertical center-bottom area to avoid any UI overlap */}
            <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className={`absolute z-[250] text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-white px-5 py-2.5 rounded-full border border-slate-700/50 hover:bg-slate-800 transition-all pointer-events-auto shadow-2xl bg-slate-900/90 flex items-center justify-center backdrop-blur-md
                    ${currentConfig?.skipPos === 'bottom' ? 'bottom-20 left-1/2 -translate-x-1/2' : 'top-20 left-1/2 -translate-x-1/2'}
                `}
            >
                <X className="w-3.5 h-3.5 mr-1" />
                {language === 'RU' ? 'Пропустить' : 'Skip'}
            </button>
        </div>
    );
};
