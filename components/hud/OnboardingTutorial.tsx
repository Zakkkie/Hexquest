import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store.ts';
import { audioService } from '../../services/audioService.ts';

interface Point {
    x: number;
    y: number;
    w: number;
    h: number;
}

export const OnboardingTutorial: React.FC = () => {
    const session = useGameStore(state => state.session);
    const language = useGameStore(state => state.language);
    
    // Check if player has already completed or skipped the onboarding
    const [isVisible, setIsVisible] = useState(false);
    const [step, setStep] = useState(0);
    const [cutout, setCutout] = useState<Point | null>(null);

    // Track dynamic real-time target coordinates of hex field
    const [hexCoords, setHexCoords] = useState<{
        player: Point | null;
        mine: Point | null;
        void: Point | null;
    }>({ player: null, mine: null, void: null });

    // Dynamic viewport size tracker
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    useEffect(() => {
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Listen to hex coordinate telemetry updates dispatched by MapRenderer
    useEffect(() => {
        const handleCoords = (e: Event) => {
            const customEvent = e as CustomEvent;
            if (customEvent.detail) {
                setHexCoords(customEvent.detail);
            }
        };
        window.addEventListener('hexquest-coordinates-update', handleCoords);
        return () => window.removeEventListener('hexquest-coordinates-update', handleCoords);
    }, []);

    // Check localStorage on mount or session state
    useEffect(() => {
        const handleForceOnboarding = () => {
            setIsVisible(true);
            setStep(0);
        };
        window.addEventListener('hexquest-show-onboarding', handleForceOnboarding);

        if (!session || session.gameStatus !== 'PLAYING') {
            setIsVisible(false);
            (window as any).isOnboardingActive = false;
            return () => window.removeEventListener('hexquest-show-onboarding', handleForceOnboarding);
        }

        try {
            const completed = localStorage.getItem('hexquest_onboarding_completed_p2');
            if (!completed) {
                setIsVisible(true);
                setStep(0);
            }
        } catch {
            setIsVisible(true);
        }

        return () => window.removeEventListener('hexquest-show-onboarding', handleForceOnboarding);
    }, [session?.sessionId, session?.gameStatus]);

    // Force recalculate target element bounding rects based on the Step
    useEffect(() => {
        if (!isVisible) {
            setCutout(null);
            (window as any).isOnboardingActive = false;
            return;
        }
        
        // Expose onboarding presence globally so other banners/tips yield screen space
        (window as any).isOnboardingActive = true;

        const translate = {
            RU: [
                { targetType: "player" },
                { targetType: "player_adj" },
                { targetType: "mine" },
                { targetType: "void" },
                { targetType: "dock" }
            ],
            EN: [
                { targetType: "player" },
                { targetType: "player_adj" },
                { targetType: "mine" },
                { targetType: "void" },
                { targetType: "dock" }
            ]
        };
        const currentSteps = language === 'RU' ? translate.RU : translate.EN;
        const currentStepConfig = currentSteps[step];
        if (!currentStepConfig) return;

        const targetType = currentStepConfig.targetType;

        if (targetType === 'player' && hexCoords.player) {
            setCutout(hexCoords.player);
        } else if (targetType === 'player_adj' && hexCoords.player) {
            setCutout(hexCoords.player);
        } else if (targetType === 'mine') {
            setCutout(hexCoords.mine || hexCoords.player);
        } else if (targetType === 'void') {
            setCutout(hexCoords.void || hexCoords.player);
        } else if (targetType === 'dock') {
            const el = document.getElementById('bottom-action-dock');
            if (el) {
                const rect = el.getBoundingClientRect();
                setCutout({
                    x: rect.left - 6,
                    y: rect.top - 6,
                    w: rect.width + 12,
                    h: rect.height + 12
                });
            } else {
                setCutout(null);
            }
        } else {
            setCutout(null);
        }
    }, [step, isVisible, hexCoords, windowSize]);

    // Clean up global state on unmount
    useEffect(() => {
        return () => {
            (window as any).isOnboardingActive = false;
        };
    }, []);

    if (!isVisible || !session) return null;

    const translate = {
        RU: [
            { targetText: "ЭТО ТЫ", targetType: "player" },
            { targetText: "ШАГ СЮДА", targetType: "player_adj" },
            { targetText: "КОПАТЬ: ДАЕТ ХОДЫ", targetType: "mine" },
            { targetText: "СТРОИТЬ: НУЖНА ОПОРА", targetType: "void" },
            { targetText: "ПОЛУЧИТЬ ЭНЕРГИЮ", targetType: "dock" }
        ],
        EN: [
            { targetText: "THIS IS YOU", targetType: "player" },
            { targetText: "STEP HERE", targetType: "player_adj" },
            { targetText: "DIG: RESTORES MOVES", targetType: "mine" },
            { targetText: "BUILD: NEEDS SUPPORT", targetType: "void" },
            { targetText: "DRAW ENERGY", targetType: "dock" }
        ]
    };

    const steps = language === 'RU' ? translate.RU : translate.EN;
    const currentStepConfig = steps[step];

    const handleNext = (e?: React.MouseEvent | React.TouchEvent) => {
        if (e) {
            e.stopPropagation();
            e.preventDefault();
        }
        audioService.play('UI_CLICK');
        if (step >= steps.length - 1) {
            handleClose();
        } else {
            setStep(prev => prev + 1);
        }
    };

    const handleClose = () => {
        audioService.play('SUCCESS');
        setIsVisible(false);
        (window as any).isOnboardingActive = false;
        try {
            localStorage.setItem('hexquest_onboarding_completed_p3', 'true');
        } catch { /* storage disabled */ }
    };

    return (
        <div 
            id="onboarding-onboarding-container" 
            className="fixed inset-0 z-[200] select-none pointer-events-auto cursor-pointer"
            onClick={handleNext}
            onTouchStart={handleNext}
        >
            
            {/* SVG Mask overlay for high-precision dimming and cutout */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none z-[80]">
                <defs>
                    <mask id="onboarding-spotlight-mask">
                        {/* Solid white blocks everything (dims with opacity) */}
                        <rect width="100%" height="100%" fill="white" />
                        {/* Black rect / circle opens a cutout area */}
                        {cutout && (
                            <rect 
                                x={cutout.x} 
                                y={cutout.y} 
                                width={cutout.w} 
                                height={cutout.h} 
                                rx={cutout.w > 200 ? 16 : 999} 
                                ry={cutout.w > 200 ? 16 : 999} 
                                fill="black" 
                            />
                        )}
                    </mask>
                </defs>
                {/* Standard dim backdrop outside the mask area */}
                <rect 
                    width="100%" 
                    height="100%" 
                    fill="rgba(5, 10, 25, 0.88)" 
                    mask="url(#onboarding-spotlight-mask)" 
                    className="pointer-events-none opacity-95 transition-all duration-300"
                />
            </svg>

            {/* Cutout highlighting ring + 2-3 word floating text near target area */}
            <AnimatePresence mode="popLayout">
                {cutout && (
                    <motion.div 
                        key={step}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute z-[90] pointer-events-none"
                        style={{
                            left: cutout.x,
                            top: cutout.y,
                            width: cutout.w,
                            height: cutout.h
                        }}
                    >
                        {/* Ring glowing background */}
                        <div className="absolute inset-0 rounded-full border-2 border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.6),inset_0_0_10px_rgba(52,211,153,0.4)] animate-pulse" 
                             style={{ borderRadius: cutout.w > 200 ? '16px' : '999px' }} />
                        
                        {/* Pulsing focal wave */}
                        <div className="absolute inset-[-8px] border-[3px] border-emerald-400/30 animate-ping duration-[2000ms]" 
                             style={{ borderRadius: cutout.w > 200 ? '20px' : '999px' }} />
                        
                        {/* Floating target text (2-3 words) directly nearby target */}
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-emerald-500/80 text-emerald-300 text-sm md:text-base font-black font-mono px-4 py-2 rounded-lg shadow-2xl whitespace-nowrap animate-bounce flex items-center justify-center gap-2">
                            <span>{currentStepConfig.targetText.toUpperCase()}</span>
                        </div>
                        
                        {/* Sub-text hint to tap anywhere */}
                        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-slate-400/80 text-[10px] font-sans font-medium whitespace-nowrap uppercase tracking-widest mt-4">
                            {language === 'RU' ? 'Нажмите в любое место' : 'Tap anywhere to continue'}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            {/* Skip Button */}
            <button 
                onClick={(e) => { e.stopPropagation(); handleClose(); }}
                className="absolute top-6 right-6 z-[100] text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-white px-4 py-2 rounded-full border border-slate-700/50 hover:bg-slate-800 transition-all pointer-events-auto shadow-lg bg-slate-900/50"
            >
                {language === 'RU' ? 'Пропустить' : 'Skip'}
            </button>
        </div>
    );
};
