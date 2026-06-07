import React, { useMemo } from 'react';
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

    // Background gradient states depending on status
    const themeColor = useMemo(() => {
        if (isAccomplished) {
            return 'from-emerald-500/15 to-teal-500/5 hover:border-emerald-500/40 border-slate-800 text-emerald-300';
        }
        return 'from-indigo-500/10 to-purple-500/5 hover:border-indigo-500/40 border-slate-800 text-indigo-300';
    }, [isAccomplished]);

    const { isCollapsed, handleToggleCollapse } = useCollapsibleHint(progressText, playUiSound);

    if (!isSkirmish || !winCondition || !player) return null;
    
    // Hide for SUMMIT since MonumentHintBanner handles its multi-step logic
    if (winCondition.winType === 'SUMMIT') return null;

    return (
        <AnimatePresence mode="wait">
            {isCollapsed ? (
                <motion.div
                    key="collapsed-skirmish"
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleToggleCollapse}
                    className={`pointer-events-auto cursor-pointer w-full p-2.5 rounded-xl border bg-slate-950/90 backdrop-blur-md shadow-lg flex items-center justify-between gap-3 text-white transition-all select-none group bg-gradient-to-r ${themeColor}`}
                    title={language === 'RU' ? 'Развернуть' : 'Expand'}
                >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="p-1.5 rounded-lg bg-slate-900/95 border border-slate-800 shrink-0">
                            {isAccomplished ? (
                                <Trophy className="w-4 h-4 text-emerald-400 animate-bounce" />
                            ) : (
                                <Swords className="w-4 h-4 text-indigo-400 animate-pulse" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
                            <div className="flex items-center justify-between gap-2.5 leading-none">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 truncate">
                                    {title}
                                </span>
                                <span className={`text-[10px] font-mono font-bold whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800/60 leading-none ${isAccomplished ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {isAccomplished ? (language === 'RU' ? 'ВЫПОЛНЕНО' : 'COMPLETE') : `${Math.floor(progressPercent)}%`}
                                </span>
                            </div>
                            
                            {/* Horizontal progress bar */}
                            <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800/65">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${isAccomplished ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    {/* Expand indicator */}
                    <div className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white transition-colors shrink-0 flex items-center justify-center">
                        <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="expanded-skirmish"
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-auto w-full"
                >
                    <div className={`p-4 rounded-xl border bg-slate-950/92 backdrop-blur-md shadow-2xl flex flex-col gap-3 transition-all duration-300 relative overflow-hidden group border-slate-800/70`}>
                        {/* Header container */}
                        <div className="flex items-center justify-between gap-2.5 border-b border-slate-900 pb-2.5">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="p-1.5 rounded-lg bg-slate-900/95 border border-slate-800 shrink-0">
                                    {isAccomplished ? (
                                        <Trophy className="w-5 h-5 text-emerald-400 animate-bounce" />
                                    ) : (
                                        <Swords className="w-5 h-5 text-indigo-400 animate-pulse" />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0 justify-center">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 leading-none mb-1">
                                        {title}
                                    </span>
                                    <span className="text-[8.5px] text-slate-500 uppercase font-bold tracking-widest leading-none">
                                        {badge}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Collapse Button */}
                            <button 
                                onClick={handleToggleCollapse}
                                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center"
                                title={language === 'RU' ? 'Свернуть' : 'Collapse'}
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Text explanation */}
                        <p className="text-xs text-slate-200 font-medium leading-relaxed font-mono">
                            {progressText}
                        </p>

                        {/* Rich Split Progress bar for Rank & Credits if WinType is and/or */}
                        <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80 mt-0.5">
                            {/* Rank Tracker */}
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between text-[10px] font-mono font-bold leading-none">
                                    <span className="text-slate-400 uppercase">{language === 'RU' ? 'ИНЖЕНЕРНЫЙ РАНГ' : 'ENGINEERING RANK'}</span>
                                    <span className={player.playerLevel >= winCondition.targetLevel ? 'text-emerald-400' : 'text-indigo-400'}>
                                        {player.playerLevel} / {winCondition.targetLevel}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900/70">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${player.playerLevel >= winCondition.targetLevel ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${rankPercent}%` }}
                                    />
                                </div>
                            </div>

                            {/* Coin/Credits Tracker */}
                            {winCondition.targetCoins > 0 && (
                                <div className="flex flex-col gap-1 border-t border-slate-950/20 pt-1.5">
                                    <div className="flex items-center justify-between text-[10px] font-mono font-bold leading-none">
                                        <span className="text-slate-400 uppercase">{language === 'RU' ? 'КРЕДИТНЫЙ БАЛАНС' : 'CREDIT BALANCE'}</span>
                                        <span className={player.coins >= winCondition.targetCoins ? 'text-emerald-400' : 'text-amber-450'}>
                                            {player.coins} / {winCondition.targetCoins}
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-900/70">
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
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default React.memo(SkirmishHintBanner);
