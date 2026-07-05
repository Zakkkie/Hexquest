import React, { useMemo, useEffect, useState } from 'react';
import { useGameStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Sparkles, Navigation, ChevronUp, ChevronDown, Crown } from 'lucide-react';
import { useCollapsibleHint } from './useCollapsibleHint.ts';

import { getCampaignMetric } from '../../campaign/getCampaignMetric';

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
        return activeLevelConfig.goalText;
    }, [grid, player, activeLevelConfig, session]);

    // Metrics computation matching getCampaignMetric precisely
    const metrics = useMemo(() => {
        return getCampaignMetric(activeLevelConfig, grid, player, session, language, entropy?.current);
    }, [grid, player, activeLevelConfig, language, entropy, session]);

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
                    className={`w-full bg-slate-950/92 border rounded-xl backdrop-blur-md flex items-center justify-between px-3.5 py-2.5 pointer-events-auto cursor-pointer relative shadow-xl select-none transition-all ${
                        toast
                            ? (toast.type === 'error'
                                ? 'border-rose-500/40 bg-gradient-to-r from-rose-950/20 to-red-950/5'
                                : toast.type === 'success'
                                ? 'border-emerald-500/40 bg-gradient-to-r from-emerald-950/20 to-green-950/5'
                                : 'border-amber-500/40 bg-gradient-to-r from-amber-950/20 to-yellow-950/5')
                            : 'border-emerald-500/20 hover:border-emerald-500/40 bg-gradient-to-r from-emerald-950/10 to-teal-950/5'
                    }`}
                    id="central-tutorial-banner-collapsed"
                >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        {toast ? (
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                    toast.type === 'error' ? 'bg-rose-400' : toast.type === 'success' ? 'bg-emerald-400' : 'bg-amber-400'
                                }`}></span>
                                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                    toast.type === 'error' ? 'bg-rose-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
                                }`}></span>
                            </span>
                        ) : (
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                        )}
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                            {toast ? (
                                <>
                                    <span className={`text-[10px] font-black tracking-widest font-mono uppercase shrink-0 ${
                                        toast.type === 'error' ? 'text-rose-400' : toast.type === 'success' ? 'text-emerald-400' : 'text-amber-400'
                                    }`}>
                                        {toast.type === 'error' ? (isRu ? 'ОШИБКА' : 'ERROR') : toast.type === 'success' ? (isRu ? 'УСПЕХ' : 'SUCCESS') : (isRu ? 'ИНФО' : 'INFO')}
                                    </span>
                                    <div className={`text-[11px] font-semibold truncate ${
                                        toast.type === 'error' ? 'text-rose-300' : toast.type === 'success' ? 'text-emerald-300' : 'text-amber-300'
                                    }`}>
                                        {toast.message}
                                    </div>
                                </>
                             ) : (
                                <>
                                    <span className="text-[10px] font-black tracking-widest font-mono text-emerald-400 uppercase shrink-0">
                                        {isRu ? 'ИНСТРУКТАЖ' : 'TUTORIAL'}
                                    </span>
                                    <div className="text-[11px] text-slate-300 font-semibold truncate flex items-center gap-1">
                                        {tutorialHint.replace(/\(.*\)/, '')}
                                        {tutorialHint.match(/\(.*\)/) && <Crown className="w-3.5 h-3.5 text-amber-400 inline mb-0.5" />}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                        {/* Inline current progress metrics in collapsed state */}
                        {metrics && !toast && (
                            <span className="text-[10px] font-mono font-bold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                                {metrics.current} / {metrics.target} {metrics.label}
                            </span>
                        )}

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
                        borderColor: toast 
                            ? (toast.type === 'error' ? 'rgba(239, 68, 68, 0.5)' : toast.type === 'success' ? 'rgba(16, 185, 129, 0.5)' : 'rgba(245, 158, 11, 0.5)')
                            : (isPulsing ? 'rgba(239, 68, 68, 0.5)' : 'rgba(16, 185, 129, 0.4)'),
                        boxShadow: toast
                            ? (toast.type === 'error' ? '0 10px 30px -5px rgba(239, 68, 68, 0.2), 0 0 15px rgba(239, 68, 68, 0.15)' : toast.type === 'success' ? '0 10px 30px -5px rgba(16, 185, 129, 0.2), 0 0 15px rgba(16, 185, 129, 0.15)' : '0 10px 30px -5px rgba(245, 158, 11, 0.2), 0 0 15px rgba(245, 158, 11, 0.15)')
                            : (isPulsing 
                                ? '0 10px 30px -5px rgba(239, 68, 68, 0.2), 0 0 15px rgba(239, 68, 68, 0.15)' 
                                : '0 10px 30px -5px rgba(0, 0, 0, 0.5)')
                    }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className={`w-full bg-slate-950/92 border rounded-xl md:rounded-2xl backdrop-blur-md flex flex-col gap-2.5 p-3 md:p-3.5 pointer-events-auto relative shadow-2xl cursor-pointer select-none transition-all ${
                        toast
                            ? (toast.type === 'error'
                                ? 'bg-gradient-to-br from-rose-950/15 to-red-950/10'
                                : toast.type === 'success'
                                ? 'bg-gradient-to-br from-emerald-950/15 to-teal-950/10'
                                : 'bg-gradient-to-br from-amber-950/15 to-yellow-950/10')
                            : 'bg-gradient-to-br from-emerald-950/15 to-teal-950/10'
                    }`}
                    onClick={handleToggleCollapse}
                    id="central-tutorial-banner-expanded"
                >
                    {/* Scanner/Grid lines details overlay */}
                    <div className="absolute inset-0 rounded-2xl bg-scanlines opacity-10 pointer-events-none" />
                    <div className={`absolute top-0 left-0 w-full h-0.5 animate-pulse ${
                        toast
                            ? (toast.type === 'error' ? 'bg-rose-500/20' : toast.type === 'success' ? 'bg-emerald-500/20' : 'bg-amber-500/20')
                            : 'bg-emerald-500/20'
                    }`} />
 
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                            {toast ? (
                                <span className="relative flex h-2 w-2">
                                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                        toast.type === 'error' ? 'bg-rose-400' : toast.type === 'success' ? 'bg-emerald-400' : 'bg-amber-400'
                                    }`}></span>
                                    <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                        toast.type === 'error' ? 'bg-rose-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
                                    }`}></span>
                                </span>
                            ) : (
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                            )}
                            <span className={`text-[9px] font-black tracking-[0.2em] font-mono uppercase ${
                                toast
                                    ? (toast.type === 'error' ? 'text-rose-400' : toast.type === 'success' ? 'text-emerald-400' : 'text-amber-400')
                                    : 'text-emerald-400'
                            }`}>
                                {toast 
                                    ? (toast.type === 'error' ? (isRu ? 'ОШИБКА СИСТЕМЫ' : 'SYSTEM ERROR DETECTED') : toast.type === 'success' ? (isRu ? 'УСПЕШНАЯ ОПЕРАЦИЯ' : 'SUCCESSFUL OPERATION') : (isRu ? 'СИСТЕМНОЕ СООБЩЕНИЕ' : 'SYSTEM INFORMATION MESSAGE'))
                                    : (isRu ? 'ИНСТРУКТАЖ СИСТЕМЫ' : 'SYSTEM TUTORIAL PROTOCOL')}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {targetDistanceData && !targetDistanceData.reached && !toast && (
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
                        {toast ? (
                            <div className={`p-2 border rounded-xl flex items-center justify-center shrink-0 ${
                                toast.type === 'error'
                                    ? 'bg-rose-950/30 border-rose-500/20 text-rose-400 animate-pulse'
                                    : toast.type === 'success'
                                    ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400'
                                    : 'bg-amber-950/30 border-amber-500/20 text-amber-400'
                            }`}>
                                <Sparkles className="w-5 h-5" />
                            </div>
                        ) : (
                            <div className="p-2 bg-emerald-950/30 border border-emerald-500/20 rounded-xl text-emerald-400 flex items-center justify-center shrink-0">
                                <Compass className="w-5 h-5 animate-spin-slow" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 font-mono mb-0.5">
                                {toast ? (
                                    <span className={toast.type === 'error' ? 'text-rose-400' : toast.type === 'success' ? 'text-emerald-400' : 'text-amber-400'}>
                                        {toast.type === 'error' ? (isRu ? 'ОТЧЕТ ОБ ОШИБКЕ' : 'ERROR REPORT') : toast.type === 'success' ? (isRu ? 'СОБЫТИЕ' : 'EVENT') : (isRu ? 'ИНФОРМАЦИЯ' : 'INFORMATION')}
                                    </span>
                                ) : (
                                    isRu ? 'ТЕКУЩИЙ ШАГ' : 'CURRENT OBJECTIVE STEP'
                                )}
                            </div>
                            <p className={`text-xs md:text-sm font-black font-sans tracking-tight leading-normal uppercase flex flex-wrap items-center gap-1 ${
                                toast
                                    ? (toast.type === 'error' ? 'text-rose-200' : toast.type === 'success' ? 'text-emerald-200' : 'text-amber-200')
                                    : 'text-slate-100'
                            }`}>
                                {toast ? toast.message : tutorialHint.replace(/\(.*\)/, '')}
                                {!toast && tutorialHint.match(/\(.*\)/) && <Crown className="w-4 h-4 text-amber-400 inline drop-shadow-md pb-0.5" />}
                            </p>
                            {!toast && onOpenHelpDetail && (
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
                    {metrics && !toast && (
                        <div 
                            className="mt-1.5 p-2 rounded-lg bg-slate-900/50 border border-slate-800/80 flex flex-col gap-1.5"
                            onClick={(e) => e.stopPropagation()} /* Do not collapse when clicking individual metrics area */
                        >
                            <div className="flex items-center justify-between text-[10px] font-mono font-bold leading-none">
                                <span className="text-slate-400 uppercase">
                                    {isRu ? 'ТЕКУЩАЯ ЗАДАЧА' : 'CURRENT GOAL'}
                                </span>
                                <span className="text-amber-400 font-bold font-mono">
                                    {metrics.current} / {metrics.target} <span className="text-slate-400 uppercase text-[9px] ml-0.5">{metrics.label}</span>
                                </span>
                            </div>
                            
                            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900/60">
                                <div 
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 transition-all duration-500"
                                    style={{ width: `${Math.min(100, (metrics.current / metrics.target) * 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
 
                    {isPulsing && !toast && (
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
