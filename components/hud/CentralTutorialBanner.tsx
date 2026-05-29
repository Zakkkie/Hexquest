import React, { useMemo, useEffect, useState } from 'react';
import { useGameStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, Navigation } from 'lucide-react';

const CentralTutorialBanner: React.FC = () => {
    const session = useGameStore(state => state.session);
    const activeLevelConfig = session?.activeLevelConfig;
    const player = session?.player;
    const grid = session?.grid;
    const language = useGameStore(state => state.language);
    const [prevHint, setPrevHint] = useState<string | null>(null);
    const [isPulsing, setIsPulsing] = useState(false);

    const isTutorialLevel = useMemo(() => {
        return activeLevelConfig?.id ? activeLevelConfig.id.startsWith('1.') : false;
    }, [activeLevelConfig?.id]);

    const tutorialHint = useMemo(() => {
        if (!grid || !player || !activeLevelConfig) return null;
        if (activeLevelConfig.getTutorialHint && session) {
            try {
                return activeLevelConfig.getTutorialHint(session);
            } catch (e) {
                console.error("Error evaluating getTutorialHint", e);
            }
        }
        return activeLevelConfig.goalText;
    }, [grid, player, activeLevelConfig, session]);

    // Flashing effect on step transition
    useEffect(() => {
        if (tutorialHint && tutorialHint !== prevHint) {
            setIsPulsing(true);
            const t = setTimeout(() => setIsPulsing(false), 1500);
            setPrevHint(tutorialHint);
            return () => clearTimeout(t);
        }
    }, [tutorialHint, prevHint]);

    // Calculate distance to target destination if exists (for 1.1, 1.7)
    const targetDistanceData = useMemo(() => {
        if (!player || !grid || !activeLevelConfig) return null;
        
        let targetQ = 0;
        let targetR = 0;
        let found = false;
        
        // Find Capital, Exit, or Green objective hex
        if (activeLevelConfig.id === '1.1') {
            targetQ = 3;
            targetR = -3;
            found = true;
        } else if (activeLevelConfig.id === '1.7') {
            targetQ = 3;
            targetR = -1;
            found = true;
        } else {
            const obj = activeLevelConfig.objectiveHexes?.find((o: any) => o.color === 'emerald' || o.label === 'Goal');
            if (obj) {
                targetQ = obj.q;
                targetR = obj.r;
                found = true;
            } else {
                const cap = Object.values(grid).find((h: any) => h.structureType === 'CAPITAL');
                if (cap) {
                    targetQ = cap.q;
                    targetR = cap.r;
                    found = true;
                }
            }
        }

        if (found) {
            const distance = (Math.abs(player.q - targetQ) + Math.abs(player.r - targetR) + Math.abs((player.q + player.r) - (targetQ + targetR))) / 2;
            return {
                distance,
                reached: distance === 0,
                coordinates: `q:${targetQ}, r:${targetR}`
            };
        }
        
        return null;
    }, [player, grid, activeLevelConfig]);

    if (!isTutorialLevel || !tutorialHint || session?.gameStatus !== 'PLAYING') return null;

    const isRu = language === 'RU';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: -20, x: '-50%' }}
                animate={{ 
                    opacity: 1, 
                    scale: 1, 
                    y: 0,
                    x: '-50%',
                    borderColor: isPulsing ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.25)',
                    boxShadow: isPulsing 
                        ? '0 10px 30px -5px rgba(239, 68, 68, 0.15), 0 0 15px rgba(239, 68, 68, 0.1)' 
                        : '0 4px 20px -5px rgba(0, 0, 0, 0.2)'
                }}
                exit={{ opacity: 0, scale: 0.95, y: -25, x: '-50%' }}
                transition={{ duration: 0.3 }}
                style={{
                    paddingLeft: '12px',
                    paddingRight: '12px',
                    paddingBottom: '8px',
                    marginLeft: '0px',
                    marginRight: '0px',
                    marginTop: '-80px',
                }}
                className="fixed top-[138px] md:top-[103px] left-1/2 z-40 w-[95%] max-w-lg bg-slate-950/20 border border-slate-800/45 rounded-2xl backdrop-blur-md flex flex-col gap-2 pointer-events-auto"
                id="central-tutorial-banner"
            >
                {/* Scanner/Grid lines details overlay */}
                <div className="absolute inset-0 rounded-2xl bg-scanlines opacity-10 pointer-events-none" />
                <div className="absolute top-0 left-0 w-full h-0.5 bg-emerald-500/20 animate-pulse" />

                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-[9px] font-black tracking-[0.2em] font-mono text-emerald-400 uppercase">
                            {isRu ? 'ИНСТРУКТАЖ СИСТЕМЫ' : 'SYSTEM TUTORIAL PROTOCOL'}
                        </span>
                    </div>
                    {targetDistanceData && !targetDistanceData.reached && (
                        <div className="flex items-center gap-1 text-[9.5px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                            <Navigation className="w-2.5 h-2.5 rotate-45 animate-pulse" />
                            <span>
                                {isRu ? 'ДИСТАНЦИЯ:' : 'DISTANCE:'} {targetDistanceData.distance} {isRu ? 'шаг.' : 'steps'}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-start gap-2.5 mt-0.5">
                    <div className="p-2 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center justify-center shrink-0">
                        <Compass className="w-5 h-5 animate-spin-slow" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono mb-0.5">
                            {isRu ? 'ТЕКУЩИЙ ШАГ' : 'CURRENT OBJECTIVE STEP'}
                        </div>
                        <p className="text-xs md:text-sm font-black text-slate-100 font-sans tracking-tight leading-normal uppercase">
                            {tutorialHint}
                        </p>
                    </div>
                </div>

                {isPulsing && (
                    <div className="absolute top-1 right-2 flex items-center gap-1 text-[8px] font-mono text-emerald-300 uppercase select-none pointer-events-none">
                        <Sparkles className="w-3 h-3 animate-pulse" />
                        <span>Updated</span>
                    </div>
                )}
            </motion.div>
        </AnimatePresence>
    );
};

export default React.memo(CentralTutorialBanner);
