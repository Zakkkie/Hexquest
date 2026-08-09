import React, { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store.ts';
import { Sparkles, Hexagon, X, Award, CheckCircle2, ArrowRight } from 'lucide-react';

// Выносим стартовые плиты в константу, чтобы не дублировать
const STARTER_HEXES = { 0: 13, 1: 9, 2: 7, 3: 1 };

export const OnboardingTutorial: React.FC = () => {
    const showModal = useGameStore(state => state.showNewGameTutorialModal);
    const setShowModal = useGameStore(state => state.setShowNewGameTutorialModal);
    const language = useGameStore(state => state.language);
    const addCollectedHexes = useGameStore(state => state.addCollectedHexes);
    const addMinedHexes = useGameStore(state => state.addMinedHexes);
    const setIsStoryTutorialActive = useGameStore(state => state.setIsStoryTutorialActive);
    const setUIState = useGameStore(state => state.setUIState);
    const playUiSound = useGameStore(state => state.playUiSound);

    const isRu = language === 'RU';

    // Единая функция для выдачи наград и закрытия
    const claimRewardsAndClose = useCallback((startTutorial: boolean) => {
        playUiSound('CLICK');
        
        // Выдаем стартовые гексы
        addCollectedHexes(STARTER_HEXES);
        addMinedHexes(STARTER_HEXES);
        
        if (startTutorial) {
            try { 
                localStorage.removeItem('hexopol_defense_tutorial_completed'); 
            } catch (e) {
                console.warn("LocalStorage access denied", e);
            }
            setUIState('STORY_BUILDER');
            useGameStore.getState().startDefenseTutorial();
        } else {
            try { 
                localStorage.setItem('hexopol_defense_tutorial_completed', 'true'); 
            } catch (e) {
                console.warn("LocalStorage access denied", e);
            }
        }
        
        setShowModal(false);
    }, [playUiSound, addCollectedHexes, addMinedHexes, setUIState, setShowModal]);

    // Закрытие по Escape
    useEffect(() => {
        if (!showModal) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') claimRewardsAndClose(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showModal, claimRewardsAndClose]);

    return (
        <AnimatePresence>
            {showModal && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-sans pointer-events-none"
                    onClick={() => claimRewardsAndClose(false)} // Backdrop click handler
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()} // Prevent close on modal body click
                        className="relative w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden flex flex-col pointer-events-auto"
                    >
                        {/* Декоративный фоновый блик */}
                        <div className="absolute -top-20 -left-20 w-40 h-40 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />
                        
                        {/* Header */}
                        <div className="relative px-6 py-5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                                    <Sparkles className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-white font-black text-base tracking-wide uppercase">
                                        {isRu ? 'Обучение и Стартовый Бонус' : 'Tutorial & Starting Bonus'}
                                    </h2>
                                    <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
                                        {isRu ? 'Инициализация новой игры' : 'New Game Initialization'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={() => claimRewardsAndClose(false)}
                                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                                title={isRu ? "Пропустить" : "Skip"}
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col gap-5 z-10">
                            <p className="text-slate-300 text-sm leading-relaxed font-medium whitespace-pre-line">
                                {isRu
                                    ? 'Вы начали новую игру! Желаете пройти интерактивное обучение по основам строительства и управления?\n\nВ награду за старт обучения вы гарантированно получите ценные стартовые гексоплиты (L0-L3) для режима StoryBuild, которые помогут вам в возведении базы.'
                                    : 'You started a new game! Would you like to take the interactive tutorial on building and resource management?\n\nAs a reward, you will receive starting hex plates (L0-L3) for StoryBuild mode to kickstart your base construction!'}
                            </p>

                            {/* Reward Hex Plates Showcase */}
                            <div className="bg-slate-950/60 border border-indigo-500/20 rounded-xl p-4 flex flex-col gap-3 relative overflow-hidden">
                                <div className="absolute inset-0 bg-grid-slate-900/50 pointer-events-none opacity-50" style={{ backgroundImage: 'linear-gradient(to right, rgba(99,102,241,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(99,102,241,0.05) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
                                
                                <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-300 tracking-wider relative z-10">
                                    <Award className="w-4 h-4 text-amber-400" />
                                    <span>{isRu ? 'Награда в StoryBuild:' : 'StoryBuild Reward Plates:'}</span>
                                </div>
                                
                                <div className="grid grid-cols-4 gap-2 relative z-10">
                                    {[
                                        { level: 0, count: 10, label: 'L0 Plain' },
                                        { level: 1, count: 5, label: 'L1 Ledge' },
                                        { level: 2, count: 3, label: 'L2 Platform' },
                                        { level: 3, count: 1, label: 'L3 Reactor' },
                                    ].map((item, index) => (
                                        <motion.div 
                                            key={item.level} 
                                            initial={{ opacity: 0, y: 10, scale: 0.8 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ delay: 0.2 + index * 0.1, type: "spring", stiffness: 200 }}
                                            className="bg-gradient-to-b from-slate-900 to-slate-950 border border-indigo-500/20 hover:border-indigo-400/50 rounded-lg p-2.5 flex flex-col items-center justify-center text-center gap-1 transition-all cursor-default"
                                        >
                                            <div className="flex items-center gap-1">
                                                <Hexagon className="w-3.5 h-3.5 text-cyan-400 fill-cyan-500/20 animate-pulse" />
                                                <span className="text-white font-mono font-bold text-xs">L{item.level}</span>
                                            </div>
                                            <span className="text-emerald-400 font-mono font-black text-base drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]">+{item.count}</span>
                                            <span className="text-[8px] text-slate-500 uppercase tracking-wider hidden sm:block">{item.label}</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3 z-10">
                            <button
                                onClick={() => claimRewardsAndClose(false)}
                                className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white font-extrabold text-xs tracking-wider uppercase transition-all cursor-pointer border border-slate-700/60"
                            >
                                {isRu ? 'Пропустить' : 'Skip'}
                            </button>
                            <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => claimRewardsAndClose(true)}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/30 relative overflow-hidden group"
                            >
                                {/* Эффект блика на кнопке */}
                                <span className="absolute inset-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-[200%] group-hover:translate-x-[400%] transition-transform duration-700 ease-out"></span>
                                <CheckCircle2 className="w-4 h-4 text-cyan-200 relative z-10" />
                                <span className="relative z-10">{isRu ? 'Начать обучение' : 'Start Tutorial'}</span>
                                <ArrowRight className="w-4 h-4 text-cyan-200 relative z-10 transition-transform group-hover:translate-x-1" />
                            </motion.button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};