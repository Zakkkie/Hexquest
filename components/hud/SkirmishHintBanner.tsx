import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Swords, X, HelpCircle } from 'lucide-react';

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
        return language === 'RU' ? 'Задача Битвы' : 'Skirmish Objective';
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

    // Background gradient states depending on status
    const themeColor = useMemo(() => {
        if (isAccomplished) {
            return 'from-emerald-500/25 to-teal-500/10 border-emerald-500/40 shadow-emerald-950/10 text-emerald-300';
        }
        return 'from-indigo-500/20 to-purple-500/10 border-indigo-500/40 shadow-indigo-900/10 text-indigo-300';
    }, [isAccomplished]);

    const [dismissedText, setDismissedText] = useState<string | null>(null);

    // Dynamic reset to auto-remind the player when values update
    useEffect(() => {
        if (progressText && dismissedText && dismissedText !== progressText) {
            setDismissedText(null);
        }
    }, [progressText, dismissedText]);

    if (!isSkirmish || !winCondition || !player) return null;
    
    // Hide for SUMMIT since MonumentHintBanner handles its multi-step logic
    if (winCondition.winType === 'SUMMIT') return null;
    
    if (dismissedText === progressText) return null;

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        playUiSound('CLICK');
        setDismissedText(progressText);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="pointer-events-auto cursor-pointer w-full"
                onClick={handleDismiss}
                title={language === 'RU' ? 'Нажмите, чтобы скрыть уведомление' : 'Click to dismiss notification'}
                id="skirmish-hint-banner"
            >
                <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl border bg-slate-950/85 backdrop-blur-md shadow-2xl flex items-start gap-3 transition-all duration-300 hover:bg-slate-900/90 active:scale-98 group bg-gradient-to-br ${themeColor}`}>
                    <div className="p-2 md:p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 shrink-0">
                        {isAccomplished ? (
                            <Trophy className="w-5 h-5 md:w-6 md:h-6 text-emerald-400 animate-bounce" />
                        ) : (
                            <Swords className="w-5 h-5 md:w-6 md:h-6 text-indigo-400 animate-pulse" />
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-400 font-sans group-hover:text-white transition-colors">
                                {title}
                            </span>
                            <span className="text-[7.5px] md:text-[8.5px] px-1.5 py-0.5 rounded bg-slate-900/60 font-semibold border border-slate-800 uppercase tracking-wider">
                                {badge}
                            </span>
                        </div>
                        <p className="text-xs text-white/90 font-medium leading-relaxed mt-1 tracking-tight pr-2">
                            {progressText}
                        </p>
                        <span className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 font-mono select-none flex items-center gap-1 group-hover:text-slate-400 transition-colors">
                            <HelpCircle className="w-2.5 h-2.5 inline" /> {language === 'RU' ? 'Скрыть нажатием в любое место' : 'Click anywhere to dismiss'}
                        </span>
                    </div>

                    <button 
                        onClick={handleDismiss}
                        className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/40 transition-all active:scale-90"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default React.memo(SkirmishHintBanner);
