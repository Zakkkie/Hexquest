import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../../store.ts';
import { Sparkles, Hexagon, ArrowRight, X, Award, CheckCircle2 } from 'lucide-react';

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

    const handleStartTutorial = () => {
        playUiSound('CLICK');
        // Grant starter hex plates for StoryBuild
        const starterHexes = { 0: 10, 1: 5, 2: 3, 3: 1 };
        addCollectedHexes(starterHexes);
        addMinedHexes(starterHexes);
        
        setShowModal(false);
        setUIState('STORY_BUILDER');
        setIsStoryTutorialActive(true);
        try { localStorage.setItem('hexopol_story_tutorial_completed', 'true'); } catch {}
        try { sessionStorage.setItem('story_tutorial_seen', 'true'); } catch {}
    };

    const handleSkipAndClaim = () => {
        playUiSound('CLICK');
        // Grant starter hex plates anyway as promised
        const starterHexes = { 0: 10, 1: 5, 2: 3, 3: 1 };
        addCollectedHexes(starterHexes);
        addMinedHexes(starterHexes);
        
        setShowModal(false);
        try { localStorage.setItem('hexopol_story_tutorial_completed', 'true'); } catch {}
        try { sessionStorage.setItem('story_tutorial_seen', 'true'); } catch {}
    };

    return (
        <AnimatePresence>
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none font-sans">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        className="w-full max-w-lg bg-slate-900 border border-indigo-500/30 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.25)] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="relative px-6 py-5 bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border-b border-indigo-500/20 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                                    <Sparkles className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <h2 className="text-white font-black text-base tracking-wide uppercase">
                                        {isRu ? 'Обучение и Стартовый Бонус' : 'Tutorial & Starting Bonus'}
                                    </h2>
                                    <span className="text-[11px] font-mono text-cyan-400 uppercase tracking-widest">
                                        {isRu ? 'Начало новой игры в HexQuest' : 'HexQuest New Game Initialization'}
                                    </span>
                                </div>
                            </div>
                            <button
                                onClick={handleSkipAndClaim}
                                className="w-8 h-8 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 flex flex-col gap-5">
                            <p className="text-slate-300 text-sm leading-relaxed font-medium">
                                {isRu
                                    ? 'Вы начали новую игру! Желаете пройти интерактивное обучение по основам строительства и управления?\n\nВ награду за старт обучения вы гарантированно получите ценные стартовые гексоплиты (L0-L3) для режима StoryBuild, которые помогут вам в возведении базы.'
                                    : 'You started a new game! Would you like to take the interactive tutorial on building and resource management?\n\nAs a reward, you will receive starting hex plates (L0-L3) for StoryBuild mode to kickstart your base construction!'}
                            </p>

                            {/* Reward Hex Plates Showcase */}
                            <div className="bg-slate-950/60 border border-indigo-500/20 rounded-xl p-4 flex flex-col gap-3">
                                <div className="flex items-center gap-2 text-xs font-black uppercase text-indigo-300 tracking-wider">
                                    <Award className="w-4 h-4 text-amber-400" />
                                    <span>{isRu ? 'Награда в StoryBuild:' : 'StoryBuild Reward Plates:'}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { level: 0, count: 10, label: 'L0 Plain' },
                                        { level: 1, count: 5, label: 'L1 Ledge' },
                                        { level: 2, count: 3, label: 'L2 Platform' },
                                        { level: 3, count: 1, label: 'L3 Reactor' },
                                    ].map((item) => (
                                        <div key={item.level} className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 flex flex-col items-center justify-center text-center">
                                            <div className="flex items-center gap-1 mb-1">
                                                <Hexagon className="w-3.5 h-3.5 text-cyan-400 fill-cyan-500/20" />
                                                <span className="text-white font-mono font-bold text-xs">L{item.level}</span>
                                            </div>
                                            <span className="text-emerald-400 font-mono font-black text-sm">+{item.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="px-6 py-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-end gap-3">
                            <button
                                onClick={handleSkipAndClaim}
                                className="px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white font-extrabold text-xs tracking-wider uppercase transition-all cursor-pointer border border-slate-700/60"
                            >
                                {isRu ? 'Пропустить и забрать плиты' : 'Skip & Claim Reward'}
                            </button>
                            <button
                                onClick={handleStartTutorial}
                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-black text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center gap-2 cursor-pointer border border-indigo-400/30"
                            >
                                <CheckCircle2 className="w-4 h-4 text-cyan-200" />
                                <span>{isRu ? 'Начать обучение' : 'Start Tutorial'}</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
