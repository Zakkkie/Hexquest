import React, { useMemo, useEffect, useState } from 'react';
import { useGameStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, Navigation, ChevronUp, ChevronDown, Crown } from 'lucide-react';
import { useCollapsibleHint } from './useCollapsibleHint.ts';

import { getCampaignMetric } from '../../campaign/getCampaignMetric';
import { useMonumentProgress } from './useMonumentProgress.ts';
import { getLocalizedGoalText } from '../../services/i18n.ts';

interface CentralTutorialBannerProps {
    onOpenHelpDetail?: () => void;
}

const CentralTutorialBanner: React.FC<CentralTutorialBannerProps> = ({ onOpenHelpDetail }) => {
    const session = useGameStore(state => state.session);
    const toast = useGameStore(state => state.toast);
    const activeLevelConfig = session?.activeLevelConfig;
    const playerExists = useGameStore(state => !!state.session?.player);
    const playerId = useGameStore(state => state.session?.player?.id);
    const playerQ = useGameStore(state => state.session?.player?.q ?? 0);
    const playerR = useGameStore(state => state.session?.player?.r ?? 0);
    const playerCoins = useGameStore(state => state.session?.player?.coins ?? 0);
    const playerLevel = useGameStore(state => state.session?.player?.playerLevel ?? 0);
    const playerInventory = useGameStore(state => state.session?.player?.inventory);
    const playerStorage = useGameStore(state => state.session?.player?.storage ?? 0);
    const playerMoves = useGameStore(state => state.session?.player?.moves ?? 0);
    const playerRecoveredCurrentHex = useGameStore(state => state.session?.player?.recoveredCurrentHex ?? false);

    const player = useMemo(() => {
        if (!playerExists) return null;
        return {
            id: playerId,
            q: playerQ,
            r: playerR,
            coins: playerCoins,
            playerLevel,
            inventory: playerInventory ?? [],
            storage: playerStorage,
            moves: playerMoves,
            recoveredCurrentHex: playerRecoveredCurrentHex
        };
    }, [playerExists, playerId, playerQ, playerR, playerCoins, playerLevel, playerInventory, playerStorage, playerMoves, playerRecoveredCurrentHex]);

    const grid = session?.grid;
    const entropy = session?.entropy;
    const language = useGameStore(state => state.language);
    const playUiSound = useGameStore(state => state.playUiSound);

    const [prevHint, setPrevHint] = useState<string | null>(null);
    const [isPulsing, setIsPulsing] = useState(false);

    const isCampaignLevel = useMemo(() => {
        return activeLevelConfig?.id ? (
            activeLevelConfig.id.startsWith('1.') || 
            activeLevelConfig.id.startsWith('2.') || 
            activeLevelConfig.id.startsWith('3.') || 
            activeLevelConfig.id.startsWith('4.') ||
            activeLevelConfig.id.startsWith('5.')
        ) : false;
    }, [activeLevelConfig?.id]);

    const tutorialHint = useMemo(() => {
        if (!grid || !player || !activeLevelConfig) return null;
        if (activeLevelConfig.getTutorialHint && session) {
            try {
                const hint = activeLevelConfig.getTutorialHint(session);
                if (hint) return hint;
            } catch (e) {
                console.error("Error evaluating getTutorialHint", e);
            }
        }
        return getLocalizedGoalText(activeLevelConfig, language);
    }, [grid, player, activeLevelConfig, session, language]);

    // Metrics computation matching getCampaignMetric precisely
    const metrics = useMemo(() => {
        return getCampaignMetric(activeLevelConfig, grid, player, session, language, entropy?.current);
    }, [grid, player, activeLevelConfig, language, entropy, session]);

    const { monument, info: monumentInfo, progressValueText, currentProgressPercent } = useMonumentProgress();

    // Flashing effect on step/hint transition
    useEffect(() => {
        if (tutorialHint && tutorialHint !== prevHint) {
            setIsPulsing(true);
            const t = setTimeout(() => setIsPulsing(false), 1500);
            setPrevHint(tutorialHint);
            return () => clearTimeout(t);
        }
    }, [tutorialHint, prevHint]);

    // Use shared collapsible hook with tutorialHint auto-expansion trigger
    const { isCollapsed, setIsCollapsed, handleToggleCollapse } = useCollapsibleHint(tutorialHint, playUiSound);

    // Auto-minimize expanded banner on global click/touch outside
    useEffect(() => {
        if (isCollapsed) return;
        const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            const modal = document.getElementById("central-tutorial-banner-expanded");
            if (modal && !modal.contains(target)) {
                setIsCollapsed(true);
            }
        };

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("touchstart", handleOutsideClick);
        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("touchstart", handleOutsideClick);
        };
    }, [isCollapsed, setIsCollapsed]);

    // Calculate distance to target destination if exists (for 1.1, 1.7)
    const targetDistanceData = useMemo(() => {
        if (!player || !grid || !activeLevelConfig) return null;
        
        let targetQ = 0;
        let targetR = 0;
        let found = false;
        
        // Find Capital, Exit, or Green objective hex
        if (activeLevelConfig.id === '1.0') {
            targetQ = -2;
            targetR = 3;
            found = true;
        } else if (activeLevelConfig.id === '1.1') {
            targetQ = -8;
            targetR = 0;
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

    if ((window as any).isOnboardingActive) return null;
    if (!isCampaignLevel || !tutorialHint || session?.gameStatus !== 'PLAYING') return null;

    const isRu = language === 'RU';

    return (
        <AnimatePresence mode="wait">
            {isCollapsed ? (
                <motion.div
                    key="collapsed"
                    initial={{ opacity: 0, scale: 0.98, y: -5 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: -5 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleToggleCollapse}
                    className="w-full bg-slate-950/92 border-transparent rounded-xl backdrop-blur-md flex items-center justify-between px-3.5 py-2.5 pointer-events-auto cursor-pointer relative shadow-lg select-none transition-all bg-gradient-to-r from-emerald-950/10 to-teal-950/5"
                    id="central-tutorial-banner-collapsed"
                >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="relative flex h-2 w-2 shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-[10px] font-black tracking-widest font-mono text-emerald-400 uppercase shrink-0">
                                {isRu ? 'ИНСТРУКТАЖ' : 'TUTORIAL'}
                            </span>
                            <div className="text-[11px] text-slate-300 font-semibold truncate flex items-center gap-1">
                                {tutorialHint.replace(/\(.*\)/, '')}
                                {tutorialHint.match(/\(.*\)/) && <Crown className="w-3.5 h-3.5 text-amber-400 inline mb-0.5" />}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        {/* Inline current progress metrics in collapsed state */}
                        {monument && monumentInfo ? (
                            <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                {progressValueText}
                            </span>
                        ) : metrics ? (
                            <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                {metrics.current} / {metrics.target} {metrics.label}
                            </span>
                        ) : null}

                        <div className="p-0.5 rounded bg-slate-900/60 border border-slate-800 text-slate-400">
                            <ChevronDown className="w-3.5 h-3.5" />
                        </div>
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="expanded"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ 
                        opacity: 1, 
                        scale: 1, 
                        y: 0,
                        borderColor: 'transparent',
                        boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.5)'
                    }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="w-full bg-slate-950/92 border-transparent rounded-xl md:rounded-2xl backdrop-blur-md flex flex-col gap-2.5 p-3 md:p-3.5 pointer-events-auto relative shadow-2xl cursor-pointer select-none transition-all bg-gradient-to-br from-emerald-950/15 to-teal-950/10"
                    onClick={handleToggleCollapse}
                    id="central-tutorial-banner-expanded"
                >
                    {/* Scanner/Grid lines details overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-scanlines opacity-10 pointer-events-none" />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="text-[9px] font-black tracking-[0.2em] font-mono uppercase text-emerald-400">
                                {isRu ? 'ИНСТРУКТАЖ СИСТЕМЫ' : 'SYSTEM TUTORIAL PROTOCOL'}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {targetDistanceData && !targetDistanceData.reached && (
                                <div className="flex items-center gap-1 text-[9.5px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/20 px-1.5 py-0.5 rounded-md leading-none">
                                    <Navigation className="w-2.5 h-2.5 rotate-45 animate-pulse" />
                                    <span>
                                        {isRu ? 'ДИСТАНЦИЯ:' : 'DISTANCE:'} {targetDistanceData.distance} {isRu ? 'шаг.' : 'steps'}
                                    </span>
                                </div>
                            )}

                            <button 
                                onClick={handleToggleCollapse}
                                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-start gap-2.5 mt-0.5">
                        <div className="p-2 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center justify-center shrink-0">
                            <Compass className="w-5 h-5 animate-spin-slow" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono mb-0.5">
                                {isRu ? 'ТЕКУЩИЙ ШАГ' : 'CURRENT OBJECTIVE STEP'}
                            </div>
                            <p className="text-xs md:text-sm font-black font-sans tracking-tight leading-normal uppercase flex flex-wrap items-center gap-1 text-slate-100">
                                {tutorialHint.replace(/\(.*\)/, '')}
                                {tutorialHint.match(/\(.*\)/) && <Crown className="w-4 h-4 text-amber-400 inline drop-shadow-md pb-0.5" />}
                            </p>
                            {onOpenHelpDetail && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        playUiSound('CLICK');
                                        onOpenHelpDetail();
                                    }}
                                    className="mt-2 text-[10px] md:text-[11px] font-mono font-black text-emerald-400 hover:text-emerald-300 transition-colors uppercase cursor-pointer flex items-center gap-1 select-none tracking-wider underline decoration-dotted underline-offset-4"
                                >
                                    <span>{isRu ? 'ПОДРОБНЕЕ О ПРАВИЛАХ И ЦЕЛЯХ →' : 'MORE INFO / MISSION BRIEFING →'}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Unified campaign goal progress indicator */}
                    {(metrics || monument) && (
                        <div 
                            className="mt-1.5 p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 flex flex-col gap-1.5"
                            onClick={(e) => e.stopPropagation()} /* Do not collapse when clicking individual metrics area */
                        >
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold leading-none">
                                <span className="text-slate-400 uppercase">
                                    {monument && monumentInfo ? monumentInfo.title : isRu ? 'ТЕКУЩАЯ ЗАДАЧА' : 'CURRENT GOAL'}
                                </span>
                                <span className="text-amber-400 font-bold font-mono flex items-center gap-1">
                                    {monument && monumentInfo ? progressValueText : `${metrics?.current} / ${metrics?.target}`}
                                    {!monument && <span className="text-slate-400 uppercase text-[9px] ml-0.5">{metrics?.label}</span>}
                                </span>
                            </div>
                            
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900/60">
                                <div 
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                                    style={{ width: `${monument ? currentProgressPercent : Math.min(100, (metrics!.current / metrics!.target) * 100)}%` }}
                                />
                            </div>
                            
                            {monument && monumentInfo && (
                                <p className="text-[9px] text-slate-400 font-mono mt-0.5 opacity-80 leading-tight">
                                    {monumentInfo.text}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Loss Condition Indicator */}
                    {activeLevelConfig && (
                        <div 
                            className="mt-1.5 p-2 rounded-lg bg-rose-950/15 border border-rose-500/15 flex flex-col gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-1.5 text-[9px] font-mono font-black text-rose-400 uppercase leading-none">
                                <span className="relative flex h-1.5 w-1.5 shrink-0">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500"></span>
                                </span>
                                <span>{isRu ? 'Критерий поражения' : 'Loss Conditions'}</span>
                            </div>
                            <p className="text-[10px] text-slate-300 font-sans leading-relaxed mt-0.5">
                                {(() => {
                                    const lvlId = activeLevelConfig.id;
                                    const isSiege = activeLevelConfig.botObjective === 'DESTROY_PLAYER';
                                    const isRace = activeLevelConfig.botObjective === 'MONUMENT_RACE';
                                    
                                    if (lvlId === '2.9') {
                                        return isRu
                                            ? 'Окончание времени раунда (таймер), крах ранга до 0 или уничтожение плитки под вами.'
                                            : 'Round time limit reached, rank collapse to 0, or destruction of the hex under you.';
                                    }
                                    if (lvlId === '3.2') {
                                        return isRu
                                            ? 'Превышение лимита времени в 180 секунд, крах ранга до 0 или уничтожение плитки под вами.'
                                            : 'Time limit of 180 seconds exceeded, rank collapse to 0, or destruction of the hex under you.';
                                    }
                                    if (lvlId === '5.5') {
                                        return isRu
                                            ? 'Превышение предела в 20 ходов, крах ранга до 0 или уничтожение плитки под вами.'
                                            : 'Exceeding the 20-turn limit, rank collapse to 0, or destruction of the hex under you.';
                                    }
                                    if (isSiege) {
                                        return isRu
                                            ? 'Разрушение защищаемого ядра вашей базы, крах ранга до 0 или уничтожение плитки под вами.'
                                            : 'Destruction of your base core, rank collapse to 0, or destruction of the hex under you.';
                                    }
                                    if (isRace) {
                                        return isRu
                                            ? 'Соперник занял и активировал Монумент первым, крах ранга до 0 или уничтожение плитки под вами.'
                                            : 'Rival activates the final Monument first, rank collapse to 0, or destruction of the hex under you.';
                                    }
                                    return isRu
                                        ? 'Крах инженерного ранга до 0 или уничтожение опорной плитки непосредственно под вашим вектором.'
                                        : 'Engineering rank collapse to 0 or destruction of the support hex directly beneath your vector.';
                                })()}
                            </p>
                        </div>
                    )}
 
                    {isPulsing && (
                        <div className="absolute top-1 right-2 flex items-center gap-1 text-[8px] font-mono text-emerald-300 uppercase select-none pointer-events-none">
                            <Sparkles className="w-3 h-3 animate-pulse" />
                            <span>{isRu ? 'Обновлено' : 'Updated'}</span>
                        </div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default React.memo(CentralTutorialBanner);
