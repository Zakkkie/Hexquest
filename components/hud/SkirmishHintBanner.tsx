import React, { useMemo, useEffect } from 'react';
import { useGameStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Swords, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { useCollapsibleHint } from './useCollapsibleHint.ts';

const SkirmishHintBanner: React.FC = () => {
    const winCondition = useGameStore(state => state.session?.winCondition);
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const playerExists = useGameStore(state => !!state.session?.player);
    const playerLevel = useGameStore(state => state.session?.player?.playerLevel ?? 0);
    const playerCoins = useGameStore(state => state.session?.player?.coins ?? 0);

    const player = useMemo(() => {
        if (!playerExists) return null;
        return { playerLevel, coins: playerCoins };
    }, [playerExists, playerLevel, playerCoins]);

    const language = useGameStore(state => state.language);
    const playUiSound = useGameStore(state => state.playUiSound);

    // Is it skirmish / battle mode?
    const isSkirmish = useMemo(() => {
        return !activeLevelConfig && !!winCondition;
    }, [activeLevelConfig, winCondition]);

    const title = useMemo(() => {
        return language === 'RU' ? 'ЗАДАЧА БИТВЫ' : 'SKIRMISH OBJECTIVE';
    }, [language]);

    const badge = useMemo(() => {
        if (!winCondition) return '';
        if (winCondition.winType === 'SUMMIT') {
            return language === 'RU' ? 'Вершина' : 'Summit';
        }
        return language === 'RU' ? 'Доминирование' : 'Domination';
    }, [winCondition, language]);

    // Format target objective requirements with current progress live values
    const progressText = useMemo(() => {
        if (!winCondition || !player) return '';

        const isRu = language === 'RU';
        const currentRank = player.playerLevel;
        const targetRank = winCondition.targetLevel;
        const currentCoins = player.coins;
        const targetCoins = winCondition.targetCoins;

        if (winCondition.winType === 'SUMMIT') {
            return isRu 
                ? `Достигните вершины (Ранг ${targetRank}). Текущий ранг: ${currentRank}`
                : `Reach the apex of the terrain (Rank ${targetRank}). Current: ${currentRank}`;
        }

        const rankWord = isRu ? 'Ранг' : 'Rank';
        const coinsWord = isRu ? 'Кредиты' : 'Credits';

        if (winCondition.winType === 'AND') {
            return isRu
                ? `Необходимо: ${rankWord} ${currentRank}/${targetRank} и ${coinsWord} ${currentCoins}/${targetCoins}`
                : `Required: ${rankWord} ${currentRank}/${targetRank} AND ${coinsWord} ${currentCoins}/${targetCoins}`;
        } else {
            // OR
            return isRu
                ? `Необходимо: ${rankWord} ${currentRank}/${targetRank} или ${coinsWord} ${currentCoins}/${targetCoins}`
                : `Required: ${rankWord} ${currentRank}/${targetRank} OR ${coinsWord} ${currentCoins}/${targetCoins}`;
        }
    }, [winCondition, player, language]);

    // Check if achieved
    const isAccomplished = useMemo(() => {
        if (!winCondition || !player) return false;
        const rankDone = player.playerLevel >= winCondition.targetLevel;
        const coinsDone = player.coins >= winCondition.targetCoins;
        if (winCondition.winType === 'SUMMIT') return rankDone;
        if (winCondition.winType === 'AND') return rankDone && coinsDone;
        return rankDone || coinsDone;
    }, [winCondition, player]);

    // Calculate progression percentage for the progress trackers
    const { progressPercent, rankPercent, coinsPercent } = useMemo(() => {
        if (!winCondition || !player) return { progressPercent: 0, rankPercent: 0, coinsPercent: 0 };
        const rp = Math.min(100, (player.playerLevel / winCondition.targetLevel) * 100);
        const cp = winCondition.targetCoins > 0 ? Math.min(100, (player.coins / winCondition.targetCoins) * 100) : 100;
        
        let avgPercent = rp;
        if (winCondition.winType === 'AND') {
            avgPercent = (rp + cp) / 2;
        } else if (winCondition.winType === 'OR') {
            avgPercent = Math.max(rp, cp);
        }
        return { progressPercent: avgPercent, rankPercent: rp, coinsPercent: cp };
    }, [winCondition, player]);

    const { isCollapsed, setIsCollapsed, handleToggleCollapse } = useCollapsibleHint(progressText, playUiSound);

    // Auto-minimize expanded banner on global click/touch outside
    useEffect(() => {
        if (isCollapsed) return;
        const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            const modal = document.getElementById("skirmish-hint-banner-expanded");
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

    if ((window as any).isOnboardingActive) return null;
    if (!isSkirmish || !winCondition || !player) return null;
    
    // Hide for SUMMIT since MonumentHintBanner handles its multi-step logic
    if (winCondition.winType === 'SUMMIT') return null;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ 
                layout: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                duration: 0.2 
            }}
            onClick={handleToggleCollapse}
            className={`pointer-events-auto cursor-pointer w-full p-3 rounded-xl border border-white/10 bg-slate-950/85 backdrop-blur-xl shadow-xl flex flex-col transition-all select-none relative overflow-hidden group ${
                isAccomplished ? 'text-emerald-300' : 'text-indigo-300'
            }`}
            id={isCollapsed ? "skirmish-hint-banner-collapsed" : "skirmish-hint-banner-expanded"}
        >
            {/* Scanlines layer */}
            <div className="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none" />

            {/* Always-visible top header bar */}
            <div className="flex items-center justify-between gap-2.5 relative z-10 min-w-0">
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="p-1.5 rounded-lg bg-slate-950/60 border border-white/5 shrink-0">
                        {isAccomplished ? (
                            <Trophy className="w-4 h-4 text-emerald-400 animate-bounce" />
                        ) : (
                            <Swords className="w-4 h-4 text-indigo-400 animate-pulse" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0 justify-center flex-1">
                        <div className="flex items-center justify-between gap-2 leading-none">
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 truncate">
                                {title}
                            </span>
                            <span className={`text-[10px] font-mono font-bold whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/60 border border-white/5 leading-none ${isAccomplished ? 'text-emerald-400' : 'text-amber-450'}`}>
                                {isAccomplished ? (language === 'RU' ? 'ВЫПОЛНЕНО' : 'COMPLETE') : `${Math.floor(progressPercent)}%`}
                            </span>
                        </div>
                        
                        {/* Compact progress bar when collapsed */}
                        {isCollapsed && (
                            <div className="w-full bg-slate-950/60 h-1.5 rounded-full mt-1.5 overflow-hidden border border-white/5">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${isAccomplished ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Chevron expand indicator */}
                <motion.div 
                    animate={{ rotate: isCollapsed ? 0 : 180 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="p-1 rounded bg-slate-950/60 border border-white/5 text-slate-400 group-hover:text-white transition-colors shrink-0 flex items-center justify-center relative z-10"
                >
                    <ChevronDown className="w-3.5 h-3.5" />
                </motion.div>
            </div>

            {/* Expandable details body */}
            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <motion.div
                        key="expanded-skirmish-details"
                        initial={{ height: 0, opacity: 0, marginTop: 0 }}
                        animate={{ 
                            height: 'auto', 
                            opacity: 1, 
                            marginTop: 12,
                            transition: {
                                height: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.25, delay: 0.08 }
                            }
                        }}
                        exit={{ 
                            height: 0, 
                            opacity: 0, 
                            marginTop: 0,
                            transition: {
                                height: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
                                opacity: { duration: 0.15 }
                            }
                        }}
                        className="overflow-hidden flex flex-col gap-3 border-t border-white/5 pt-3 relative z-10"
                    >
                        {/* Text explanation */}
                        <p className="text-xs text-slate-200 font-medium leading-relaxed font-mono">
                            {progressText}
                        </p>

                        {/* Rich Split Progress bar for Rank & Credits */}
                        <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-950/40 border border-white/5 mt-0.5">
                            {/* Rank Tracker */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] font-mono font-bold leading-none">
                                    <span className="text-slate-400 uppercase">{language === 'RU' ? 'ИНЖЕНЕРНЫЙ РАНГ' : 'ENGINEERING RANK'}</span>
                                    <span className={player.playerLevel >= winCondition.targetLevel ? 'text-emerald-400' : 'text-indigo-400'}>
                                        {player.playerLevel} / {winCondition.targetLevel}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${player.playerLevel >= winCondition.targetLevel ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${rankPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Coin/Credits Tracker */}
                            {winCondition.targetCoins > 0 && (
                                <div className="flex flex-col gap-1 border-t border-white/5 pt-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-mono font-bold leading-none">
                                        <span className="text-slate-400 uppercase">{language === 'RU' ? 'КРЕДИТНЫЙ БАЛАНС' : 'CREDIT BALANCE'}</span>
                                        <span className={player.coins >= winCondition.targetCoins ? 'text-emerald-400' : 'text-indigo-400'}>
                                            {player.coins} / {winCondition.targetCoins}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-950/60 h-1.5 rounded-full overflow-hidden border border-white/5">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-500 ${player.coins >= winCondition.targetCoins ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                            style={{ width: `${coinsPercent}%` }}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider font-mono select-none flex items-center gap-1.5">
                            <HelpCircle className="w-3 h-3 text-slate-600" /> 
                            {language === 'RU' ? 'Выполните требования для активации выхода' : 'Meet the parameters to establish exit portal trace'}
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default React.memo(SkirmishHintBanner);
