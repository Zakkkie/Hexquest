
import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store';
import { TEXT } from '../../services/i18n';
import { CAMPAIGN_LEVELS } from '../../campaign/levels';
import { ITEM_REGISTRY, getItemDef } from '../../rules/items';
import { LogOut, X, Trophy, ArrowRight, RotateCcw, Target, Swords, Crown, Zap, HelpCircle, AlertTriangle, CheckCircle, Trash2, BookOpen, Lock, FileText, RefreshCw, Terminal, Globe, Activity, Timer, Coins, Sparkles, Footprints, Info } from 'lucide-react';
import { ItemIcon, resolveItemText, getRarityBorder } from './HudShared';
import { Item } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import Fireworks from '../Fireworks';
import { MiniMonumentDialog } from './MiniMonumentDialog';

interface GameDialogsProps {
    activeModal: string | null;
    closeModal: () => void;
    helpTopic: string | null;
    closeHelp: () => void;
    inspectedItem: Item | null;
    closeInspect: () => void;
    victoryStage: 'HIDDEN' | 'SALUTE' | 'MODAL';
    setVictoryStage: (s: 'HIDDEN' | 'SALUTE' | 'MODAL') => void;
}

const GameDialogs: React.FC<GameDialogsProps> = ({ 
    activeModal, closeModal, helpTopic, closeHelp, inspectedItem, closeInspect, victoryStage, setVictoryStage
}) => {
    const sessionStatus = useGameStore(state => state.session?.gameStatus);
    const gameStatus = sessionStatus;
    const player = useGameStore(state => state.session?.player);
    const bots = useGameStore(state => state.session?.bots);
    const winCondition = useGameStore(state => state.session?.winCondition);
    const difficulty = useGameStore(state => state.session?.difficulty);
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const messageLog = useGameStore(state => state.session?.messageLog);

    const language = useGameStore(state => state.language);
    const playUiSound = useGameStore(state => state.playUiSound);
    const user = useGameStore(state => state.user);
    
    // Actions
    const abandonSession = useGameStore(state => state.abandonSession);
    const startMission = useGameStore(state => state.startMission);
    const startNewGame = useGameStore(state => state.startNewGame);
    const startCampaignLevel = useGameStore(state => state.startCampaignLevel);
    const destroyItem = useGameStore(state => state.destroyItem);
    const campaignMode = useGameStore(state => state.campaignMode);
    const setUIState = useGameStore(state => state.setUIState);
    const currentTurn = useGameStore(state => state.session?.currentTurn || 0);
    
    // Monument/Void Specifics
    const monumentDialogState = useGameStore(state => state.monumentDialogState);
    const monumentRequirements = useGameStore(state => state.session?.monumentRequirements);
    const monumentAlternatives = useGameStore(state => state.session?.monumentAlternatives);
    const monumentRevealedSlots = useGameStore(state => state.session?.monumentRevealedSlots);
    const closeMonumentDialog = useGameStore(state => state.closeMonumentDialog);
    const removeItemFromMonument = useGameStore(state => state.removeItemFromMonument);
    const activateMonument = useGameStore(state => state.activateMonument);
    const placeItemInMonument = useGameStore(state => state.placeItemInMonument);
    
    // Mini Monument Specifics
    const miniMonumentDialogState = useGameStore(state => state.miniMonumentDialogState);
    const closeMiniMonumentDialog = useGameStore(state => state.closeMiniMonumentDialog);

    const voidDialogTarget = useGameStore(state => state.voidDialogTarget);
    const closeVoidDialog = useGameStore(state => state.closeVoidDialog);
    const restoreVoidHex = useGameStore(state => state.restoreVoidHex);

    const t = TEXT[language].HUD;

    const resetProgress = useGameStore(state => state.resetProgress);
    const grid = useGameStore(state => state.session?.grid);
    const addCollectedHexes = useGameStore(state => state.addCollectedHexes);
    const addMinedHexes = useGameStore(state => state.addMinedHexes);

    const [selectedRewardItem, setSelectedRewardItem] = useState<import('../../types.ts').Item | null>(null);
    const [selectedHexes, setSelectedHexes] = useState<Record<number, number>>({});

    const minedHexes = useGameStore(state => state.session?.minedHexes);

    const availableHexes = useMemo(() => {
        if (!grid || !player || gameStatus !== 'VICTORY') return {};
        // Use minedHexes from the session instead of scanning the grid.
        return minedHexes || {};
    }, [grid, player, gameStatus, minedHexes]);

    const totalSelectedHexesCount = Object.values(selectedHexes).reduce((a,b) => a+b, 0);

    // --- LOGIC ---

    const handleNewGame = () => {
        playUiSound('CLICK');
        if (window.confirm(language === 'RU' ? 'Начать новую игру? Весь текущий прогресс будет сброшен.' : 'Start a new game? All current progress will be reset.')) {
            resetProgress();
        }
    };

    const handleNextLevel = () => {
        playUiSound('CLICK');
        if (campaignMode === 'LEVELS' && gameStatus === 'VICTORY') {
            addCollectedHexes(selectedHexes);
            addMinedHexes(selectedHexes);
        }
        
        const levelsToUse = CAMPAIGN_LEVELS;

        if (activeLevelConfig) {
            const currentIdx = levelsToUse.findIndex(l => l.id === activeLevelConfig.id);
            const nextLevel = levelsToUse[currentIdx + 1];
            if (nextLevel) {
                abandonSession();
                startCampaignLevel(nextLevel.id);
            } else {
                handleMenu();
            }
        } else {
            handleMenu();
        }
    };

    const handleRetry = () => {
        playUiSound('CLICK');
        if (activeLevelConfig) {
            abandonSession();
            startCampaignLevel(activeLevelConfig.id);
            return;
        }
        if (winCondition) {
            startNewGame(winCondition);
            return;
        }
        
        console.warn('[GameDialogs] handleRetry fallback - abandoning session');
        handleMenu();
    };

    const handleMenu = () => {
        playUiSound('CLICK');
        if (gameStatus === 'VICTORY') {
            addMinedHexes(selectedHexes);
        }
        
        if (campaignMode === 'LEVELS' && gameStatus === 'VICTORY') {
            addCollectedHexes(selectedHexes);
        }
        abandonSession();
        if (campaignMode === 'LEVELS' && activeLevelConfig) {
            setUIState('CAMPAIGN_MAP');
        }
    };

    // Rankings Logic
    const liveRankings = useMemo(() => {
        if (!player) return [];
        const botList = bots || [];
        const list = [
            {
                id: player.id, nickname: user?.nickname || (language === 'RU' ? 'Вы' : 'You'), isPlayer: true,
                level: player.playerLevel, coins: player.coins, moves: player.moves, color: player.avatarColor || '#3b82f6'
            },
            ...botList.map(b => ({
                id: b.id, nickname: language === 'RU' ? `Ривал ${b.id.replace('bot-', '')}` : `Rival ${b.id.replace('bot-', '')}`,
                isPlayer: false, level: b.playerLevel, coins: b.coins, moves: b.moves, color: b.avatarColor || '#ef4444'
            }))
        ];
        return list.sort((a, b) => b.level !== a.level ? b.level - a.level : b.coins - a.coins);
    }, [player, bots, user, language]);

    // Help Content
    const getHelpContent = () => {
        switch(helpTopic) {
            case 'RANK': return { title: t.RANK, desc: t.HELP_RANK_DESC, hint: t.HELP_RANK_GOAL.replace('{0}', String(winCondition?.targetLevel || 0)) };
            case 'MATERIAL': return { title: t.MATERIAL, desc: t.HELP_MAT_DESC, hint: t.HELP_MAT_GOAL };
            case 'COINS': return { title: t.CREDITS, desc: t.HELP_COINS_DESC, hint: t.HELP_COINS_GOAL.replace('{0}', String(winCondition?.targetCoins || 0)) };
            case 'MOVES': return { title: t.MOVES, desc: t.HELP_MOVES_DESC, hint: t.HELP_MOVES_HINT };
            case 'ENTROPY': return { title: t.HELP_ENTROPY_TITLE, desc: t.HELP_ENTROPY_DESC, extra: [t.HELP_ENTROPY_DRAIN, t.HELP_ENTROPY_SHIFT, t.HELP_ENTROPY_GAIN], hint: "Monitor the gauge carefully." };
            default: return null;
        }
    };
    const helpData = getHelpContent();

    // Drag Drop Logic for Monument
    const handleDrop = (e: React.DragEvent, slotIndex: number) => {
        e.preventDefault();
        const itemId = e.dataTransfer.getData("itemId");
        const item = player?.inventory.find(i => i.id === itemId);
        if (item && monumentRequirements && monumentRequirements.length > slotIndex) {
            const reqId = monumentRequirements[slotIndex];
            const isUnrevealed = !!(monumentRevealedSlots && !monumentRevealedSlots[slotIndex]);
            if (!isUnrevealed && reqId !== 'ANY') {
                const isRarityWild = reqId === 'COMMON' || reqId === 'UNCOMMON' || reqId === 'RARE' || reqId === 'LEGENDARY';
                const isOneOf = reqId === 'ONE_OF';
                if (isOneOf && !(monumentAlternatives ?? []).includes(item.baseId)) { playUiSound('ERROR'); return; }
                if (!isOneOf && !(isRarityWild ? item.rarity === reqId : item.baseId === reqId)) { playUiSound('ERROR'); return; }
            }
            if (!monumentDialogState.slots.some(s => s?.id === itemId)) placeItemInMonument(item, slotIndex);
        }
    };
    const handleAllowDrop = (e: React.DragEvent) => e.preventDefault();

    // Briefing Data
    let briefingTitle = winCondition?.label || "Mission Briefing";
    let briefingDesc = t.BRIEFING_DESC_TEMPLATE.replace('{0}', (winCondition?.targetLevel || 99).toString()).replace('{1}', (winCondition?.targetCoins || 0).toString());
    if (activeLevelConfig) {
        const levelKey = activeLevelConfig.id.replace('.', '_');
        const titleKey = `LEVEL_${levelKey}_TITLE` as any;
        const descKey = `LEVEL_${levelKey}_DESC` as any;
        briefingTitle = (TEXT[language].CAMPAIGN as Record<string, string>)[titleKey] || activeLevelConfig.title;
        briefingDesc = (TEXT[language].CAMPAIGN as Record<string, string>)[descKey] || activeLevelConfig.description;
    } else if (winCondition?.winType === 'SUMMIT') {
        briefingDesc = `SCENARIO: KING OF THE HILL\n\nA dormant Monument has been detected...`;
    }

    const entropy = useGameStore(state => state.session?.entropy);
    const totalMinedMaterial = useGameStore(state => state.session?.totalMinedMaterial || 0);
    const restoredHexesCount = useGameStore(state => state.session?.restoredHexesCount || 0);

    const totalDigs = useMemo(() => {
        return Object.values(minedHexes || {}).reduce((sum, val) => sum + val, 0);
    }, [minedHexes]);

    const campaignMetrics = useMemo(() => {
        if (!grid || !player || !activeLevelConfig) return null;
        const levelId = activeLevelConfig.id;
        const ownedByLevel = (minLvl: number) =>
            Object.values(grid).filter((h: any) => h.ownerId === player.id && h.maxLevel >= minLvl).length;

        if (levelId === '1.1') return { current: Math.max(0, ownedByLevel(1) - 1), target: 3, label: TEXT[language].HUD.TUT_1_1_COUNTER };
        if (levelId === '1.3') return { current: grid[`0,0`]?.maxLevel ?? 0, target: 2, label: 'LEVEL' };
        if (levelId === '1.4') return { current: grid[`0,0`]?.maxLevel ?? 0, target: 3, label: 'LEVEL' };
        if (levelId === '1.5') return { current: player.coins, target: 150, label: TEXT[language].HUD.TUT_1_5_COUNTER };
        if (levelId === '1.6') return { current: player.playerLevel, target: 4, label: 'RANK' };
        if (levelId === '1.7') {
           return { current: restoredHexesCount, target: 5, label: TEXT[language].HUD.TUT_1_7_COUNTER || 'RESTORED' };
        }
        
        if (levelId === '2.2') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        if (levelId === '2.3') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        if (levelId === '2.4') return { current: player.inventory?.length ?? 0, target: 2, label: 'ITEMS' };
        if (levelId === '2.5') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        
        if (levelId === '2.6') {
            const playerHex = grid[`${player.q},${player.r}`];
            const depth = playerHex ? -playerHex.currentLevel : 0;
            return { current: Math.max(0, depth), target: 5, label: 'DEPTH' };
        }

        if (levelId === '3.1') return { current: player.inventory?.filter(i => i.id === 'key_fragment').length || 0, target: 3, label: 'KEYS' };
        if (levelId === '3.2') return { current: player.coins, target: 200, label: 'CREDITS' };
        if (levelId === '3.3') return { current: grid[`0,0`]?.maxLevel ?? 0, target: 3, label: 'LEVEL' };
        if (levelId === '3.4') return { current: player.coins, target: 100, label: 'CREDITS' };
        if (levelId === '3.5') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };

        if (levelId === '4.1') return { current: ownedByLevel(2), target: 3, label: 'L2 HEXES' };
        if (levelId === '4.3') return { current: ownedByLevel(3), target: 2, label: 'L3 HEXES' };
        if (levelId === '4.4') return { current: grid[`0,0`]?.maxLevel ?? 0, target: 4, label: 'LEVEL' };
        if (levelId === '4.5') return { current: ownedByLevel(2), target: 6, label: 'L2 HEXES' };
        if (levelId === '4.6') return { current: ownedByLevel(3), target: 8, label: 'L3 HEXES' };
        if (levelId === '4.7') return { current: ownedByLevel(4), target: 2, label: 'L4 HEXES' };

        if (levelId === '4.8') {
             const onMon = grid[`${player.q},${player.r}`]?.structureType === 'MONUMENT';
             const isDone = onMon && ownedByLevel(3) >= 3 && player.coins >= 300 && player.inventory.length >= 2 && (entropy?.current ?? 0) < 60;
             return { current: isDone ? 1 : 0, target: 1, label: 'ASCEND' };
        }

        return null;
    }, [grid, player, activeLevelConfig, language, entropy, totalMinedMaterial, totalDigs, restoredHexesCount]);

    const availableInventory = player?.inventory.filter(i => !monumentDialogState.slots.some(s => s?.id === i.id)) || [];
    const isMonumentReady = monumentDialogState.slots.every(s => s !== null);

    // --- RENDER ---

    return (
        <>
            {/* SALUTE CLICK LAYER AND FIREWORKS */}
            {victoryStage === 'SALUTE' && (
                <div 
                    className="absolute inset-0 z-[150] pointer-events-auto cursor-pointer" 
                    onClick={() => setVictoryStage('MODAL')} 
                    onTouchStart={() => setVictoryStage('MODAL')}
                >
                    <Fireworks onComplete={() => setVictoryStage('MODAL')} />
                </div>
            )}

            {/* EXIT CONFIRMATION */}
            <AnimatePresence>
                {activeModal === 'EXIT' && (
                    <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-slate-950/90 border border-red-500/30 p-6 md:p-8 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] max-w-[340px] md:max-w-sm w-full text-center relative overflow-hidden backdrop-blur-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-red-500/50" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-red-500/50" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-red-500/50" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-red-500/50" />
                            
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-red-400" />
                            <div className="w-14 h-14 rounded-2xl bg-red-950/30 flex items-center justify-center mx-auto mb-4 border border-red-500/40 shadow-lg shadow-red-900/30">
                                <LogOut className="w-7 h-7 text-red-500" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase mb-2 tracking-tight break-words whitespace-pre-wrap">{t.ABORT_TITLE}</h3>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed px-2 break-words whitespace-pre-wrap">{t.ABORT_DESC}</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => { handleMenu(); playUiSound('CLICK'); }} className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 hover:brightness-110 text-white font-extrabold uppercase text-xs transition-all active:scale-95 shadow-lg shadow-red-900/40 cursor-pointer">{t.BTN_CONFIRM}</button>
                                <button onClick={() => { closeModal(); playUiSound('CLICK'); }} className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-850/80 text-slate-400 font-bold uppercase text-[10px] border border-slate-850 hover:border-slate-800 transition-all active:scale-95 cursor-pointer">{t.BTN_CANCEL}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* RESTART CONFIRMATION */}
            <AnimatePresence>
                {activeModal === 'RESTART' && (
                    <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-slate-950/90 border border-amber-500/30 p-6 md:p-8 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] max-w-[340px] md:max-w-sm w-full text-center relative overflow-hidden backdrop-blur-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-amber-500/50" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-amber-500/50" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-amber-500/50" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-amber-500/50" />

                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400" />
                            <div className="w-14 h-14 rounded-2xl bg-amber-950/30 flex items-center justify-center mx-auto mb-4 border border-amber-500/40 shadow-lg shadow-amber-900/30">
                                <RotateCcw className="w-7 h-7 text-amber-500" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase mb-2 tracking-tight break-words whitespace-pre-wrap">{t.BTN_RETRY}?</h3>
                            <p className="text-xs text-slate-400 mb-6 leading-relaxed px-2 break-words whitespace-pre-wrap">{language === 'RU' ? 'Начать уровень заново? Текущий прогресс будет потерян.' : 'Restart the level? Current progress will be lost.'}</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => { handleRetry(); closeModal(); playUiSound('CLICK'); }} className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 hover:brightness-110 text-white font-extrabold uppercase text-xs transition-shadow shadow-lg shadow-amber-900/40 cursor-pointer active:scale-95 transition-all">{t.BTN_CONFIRM}</button>
                                <button 
                                    onClick={() => { handleNewGame(); closeModal(); }} 
                                    className="w-full py-3 rounded-xl bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/40 hover:border-red-500/50 font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                                >
                                    <RefreshCw className="w-4 h-4 animate-[spin_20s_linear_infinite]" />
                                    {language === 'RU' ? 'Новая Игра (Сброс)' : 'New Game (Reset)'}
                                </button>
                                <button onClick={() => { closeModal(); playUiSound('CLICK'); }} className="w-full py-2 rounded-xl bg-transparent text-slate-500 hover:text-slate-300 font-bold uppercase text-[10px] transition-colors cursor-pointer">{t.BTN_CANCEL}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MISSION BRIEFING / DETAILS */}
            <AnimatePresence>
                {(activeModal === 'MISSION' || gameStatus === 'BRIEFING') && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 md:p-6 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => {
                                if (gameStatus !== 'BRIEFING') closeModal();
                            }}
                            className="absolute inset-0 bg-black/95 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 30, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 30, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="relative bg-slate-950/95 border-2 border-indigo-500/40 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.25)] max-w-lg w-full max-h-[92vh] md:max-h-[85vh] overflow-hidden flex flex-col backdrop-blur-xl group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/60 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500/60 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500/60 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/60 z-30 pointer-events-none" />

                            {/* Scanline effect */}
                            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/5 animate-scan-slow z-10" />

                            {/* Technical Header */}
                            <div className="bg-indigo-950/35 border-b border-indigo-500/30 p-4 flex items-center justify-between z-20 shrink-0">
                                <div className="flex items-center gap-3">
                                    <Terminal className="w-5 h-5 text-indigo-400" />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400/75 leading-none font-mono">MISSION_PROTOCOL_INIT</span>
                                        <span className="text-xs font-bold text-white uppercase tracking-widest truncate">{activeLevelConfig?.id || 'SKIRMISH_OPS'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="flex gap-1">
                                        {[1, 2, 3].map(i => <div key={i} className="w-1.5 h-1.5 bg-indigo-500 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}
                                    </div>
                                    <button onClick={() => {
                                        if (gameStatus === 'BRIEFING') {
                                            startMission();
                                        }
                                        closeModal();
                                    }} className="text-slate-500 hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5"/></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar relative z-20 p-5 md:p-8 flex flex-col gap-5 scrollbar-thin">
                                <div className="flex flex-col items-center shrink-0">
                                    <div className="relative mb-5">
                                        <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                                        <div className="relative w-20 h-20 bg-slate-900/60 border-2 border-indigo-500/30 rounded-xl flex items-center justify-center shadow-2xl">
                                            <Target className="w-10 h-10 text-indigo-400" />
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-1.5 rounded text-white shadow-lg">
                                            <Activity className="w-3.5 h-3.5 animate-pulse" />
                                        </div>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter text-center leading-none mb-3 break-words whitespace-pre-wrap">{briefingTitle}</h2>
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-850 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                            <Globe className="w-3 h-3" /> {difficulty || 'NORMAL'}
                                        </div>
                                        {bots && bots.length > 0 && (
                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/30 border border-red-500/30 rounded text-[9px] font-black text-red-400 uppercase tracking-widest">
                                                <Swords className="w-3 h-3"/> {t.BRIEFING_RIVAL}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                {/* 1. OVERALL OBJECTIVE & SPECIFICATION CARD */}
                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 md:p-5 flex flex-col gap-2.5">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 flex items-center gap-1.5 font-mono">
                                        <BookOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                        {language === 'RU' ? 'ОБЩАЯ ЦЕЛЬ СЦЕНАРИЯ' : 'OVERALL MISSION OBJECTIVE'}
                                    </span>
                                    <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-mono whitespace-pre-line break-words pl-1">
                                        {briefingDesc}
                                    </p>
                                    {activeLevelConfig?.goalText && (
                                        <div className="mt-2 pt-3 border-t border-slate-800/60">
                                            <span className="text-[9px] uppercase font-black tracking-wider text-amber-400/80 font-mono">
                                                {language === 'RU' ? 'ОСНОВНАЯ ДИРЕКТИВА' : 'PRIMARY DIRECTIVE'}
                                            </span>
                                            <p className="text-sm font-bold text-amber-300 font-sans mt-0.5">
                                                {activeLevelConfig.goalText}
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* 2. LIVE METRICS & CURRENT GOAL CARD */}
                                <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 md:p-5 flex flex-col gap-3">
                                    <span className="text-[10px] uppercase font-black tracking-widest text-indigo-400 flex items-center gap-1.5 font-mono">
                                        <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse shrink-0" />
                                        {language === 'RU' ? 'ТЕКУЩАЯ ЦЕЛЬ И ПРОГРЕСС' : 'CURRENT STATUS & LIVE GOALS'}
                                    </span>
                                    
                                    <div className="flex flex-col gap-3 mt-1.5 font-mono">
                                        {activeLevelConfig && campaignMetrics ? (() => {
                                            const progressPercent = Math.min(100, (campaignMetrics.current / campaignMetrics.target) * 100);
                                            const isCompleted = campaignMetrics.current >= campaignMetrics.target;
                                            return (
                                                <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-900">
                                                    <div className="flex items-center justify-between text-xs font-bold font-mono">
                                                        <span className="text-slate-300 uppercase shrink truncate">{campaignMetrics.label}</span>
                                                        <span className={isCompleted ? "text-emerald-400" : "text-amber-400"}>
                                                            {campaignMetrics.current} / {campaignMetrics.target}
                                                        </span>
                                                    </div>
                                                    
                                                    {/* Progress bar */}
                                                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                                        <div 
                                                            className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                            style={{ width: `${progressPercent}%` }}
                                                        />
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-1.5 text-[10px] mt-1 font-bold">
                                                        {isCompleted ? (
                                                            <span className="text-emerald-400 flex items-center gap-1">
                                                                <CheckCircle className="w-3.5 h-3.5" /> {language === 'RU' ? 'ЗАДАЧА ВЫПОЛНЕНА' : 'GOAL REACHED'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-500 flex items-center gap-1">
                                                                <Timer className="w-3.5 h-3.5" /> {language === 'RU' ? 'ОЖИДАНИЕ ВЫПОЛНЕНИЯ...' : 'PROCESSING...'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })() : (
                                            /* If in skirmish battle mode, show rank and/or credits targets depending on winType */
                                            winCondition && player ? (
                                                <div className="flex flex-col gap-3">
                                                    {/* Rank Goal */}
                                                    <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-900">
                                                        <div className="flex items-center justify-between text-xs font-bold font-mono">
                                                            <span className="text-slate-300 uppercase flex items-center gap-1">
                                                                <Crown className="w-3.5 h-3.5 text-indigo-450" />
                                                                {language === 'RU' ? 'ЦЕЛЕВОЙ РАНГ' : 'TARGET RANK'}
                                                            </span>
                                                            <span className={player.playerLevel >= winCondition.targetLevel ? "text-emerald-400" : "text-amber-400"}>
                                                                {player.playerLevel} / {winCondition.targetLevel}
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${player.playerLevel >= winCondition.targetLevel ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                                style={{ width: `${Math.min(100, (player.playerLevel / winCondition.targetLevel) * 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Coins Goal */}
                                                    {winCondition.winType !== 'SUMMIT' && winCondition.targetCoins > 0 && (
                                                        <div className="flex flex-col gap-2 p-3 rounded-lg bg-slate-950/60 border border-slate-900">
                                                            <div className="flex items-center justify-between text-xs font-bold font-mono">
                                                                <span className="text-slate-300 uppercase flex items-center gap-1">
                                                                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                                                                    {language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS'}
                                                                </span>
                                                                <span className={player.coins >= winCondition.targetCoins ? "text-emerald-400" : "text-amber-400"}>
                                                                    {player.coins} / {winCondition.targetCoins}
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-500 ${player.coins >= winCondition.targetCoins ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                                                    style={{ width: `${Math.min(100, (player.coins / winCondition.targetCoins) * 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-500 italic">No objectives assigned.</p>
                                            )
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer / Action */}
                            <div className="p-4 md:p-6 bg-slate-900/45 border-t border-indigo-500/20 z-20 shrink-0">
                                <button 
                                    onClick={() => {
                                        if (gameStatus === 'BRIEFING') {
                                            startMission();
                                        }
                                        closeModal();
                                    }} 
                                    className="group/btn relative flex w-full flex-col items-center justify-center gap-2 px-1 py-4 bg-slate-900 border border-indigo-500/50 hover:bg-indigo-950/20 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] overflow-hidden rounded-md text-indigo-400 hover:text-indigo-300 cursor-pointer active:scale-98"
                                >
                                    <div className="absolute inset-0 bg-indigo-500/10 opacity-0 transition-opacity group-hover/btn:opacity-100 pointer-events-none" />
                                    <div className="relative z-10 flex items-center justify-center gap-3 text-white font-black uppercase tracking-[0.3em] text-xs md:text-sm">
                                        {gameStatus === 'BRIEFING' ? t.BRIEFING_BTN_START : t.BTN_READY}
                                        <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1.5" />
                                    </div>
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* RANKINGS */}
            <AnimatePresence>
                {activeModal === 'RANKINGS' && (
                    <div className="absolute inset-0 z-[160] flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-slate-950/95 border-2 border-amber-500/40 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] w-full max-w-[340px] md:max-w-md max-h-[82vh] flex flex-col overflow-hidden relative backdrop-blur-xl group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/60 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/60 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/60 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/60 z-30 pointer-events-none" />

                            {/* Scanline effect */}
                            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                            
                            <div className="p-4 border-b border-amber-500/30 flex items-center justify-between bg-amber-950/20 z-20 shrink-0">
                                <div className="flex items-center gap-3">
                                    <Trophy className="w-5 h-5 text-amber-500" />
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-500/60 leading-none">NETWORK_HIERARCHY</span>
                                        <span className="text-xs font-bold text-white uppercase tracking-widest truncate">{t.MINI_LB_TITLE}</span>
                                    </div>
                                </div>
                                <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-1 cursor-pointer"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-3 z-20 bg-slate-950/40">
                                {liveRankings.length === 0 ? <div className="p-8 text-center text-slate-500 text-xs font-mono uppercase tracking-widest opacity-40">NO_DATA_STREAM</div> : 
                                    <div className="flex flex-col gap-2">{liveRankings.map((entry, idx) => (
                                        <div key={entry.id} className={`grid grid-cols-12 gap-2 items-center p-3 rounded-lg border-l-4 transition-all ${entry.isPlayer ? 'bg-indigo-900/20 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-slate-900/40 border-slate-700/60 hover:bg-slate-800'}`}>
                                            <div className="col-span-1 flex justify-center">
                                                <div className={`text-[10px] font-black font-mono ${idx === 0 ? 'text-amber-400 font-extrabold' : 'text-slate-500'}`}>
                                                    {String(idx + 1).padStart(2, '0')}
                                                </div>
                                            </div>
                                            <div className="col-span-5 flex items-center gap-2 overflow-hidden">
                                                <div className="w-1.5 h-4 shrink-0 rounded-sm" style={{ backgroundColor: entry.color }}></div>
                                                <span className={`text-[11px] font-black uppercase truncate tracking-tight ${entry.isPlayer ? 'text-indigo-300' : 'text-slate-300'}`}>
                                                    {entry.nickname}
                                                </span>
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <div className="text-[8px] font-black text-slate-600 uppercase mb-0.5 leading-none">LVL</div>
                                                <span className="text-[10px] font-mono text-emerald-400 font-bold">{entry.level}</span>
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <div className="text-[8px] font-black text-slate-600 uppercase mb-0.5 leading-none">CRD</div>
                                                <span className="text-[10px] font-mono text-amber-400 font-bold">{entry.coins}</span>
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <div className="text-[8px] font-black text-slate-600 uppercase mb-0.5 leading-none">MOV</div>
                                                <span className="text-[10px] font-mono text-blue-400 font-bold">{entry.moves}</span>
                                            </div>
                                        </div>
                                    ))}</div>
                                }
                            </div>
                            <div className="p-4 bg-slate-900/60 border-t border-amber-500/30 z-20 shadow-inner shrink-0">
                                <button onClick={closeModal} className="w-full py-3 bg-amber-600/20 border border-amber-500 hover:bg-amber-600 hover:text-white text-amber-400 font-extrabold uppercase text-xs tracking-[0.3em] transition-all rounded shadow-md cursor-pointer active:scale-98">
                                    {t.BTN_READY}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* LOG */}
            <AnimatePresence>
                {activeModal === 'LOG' && (
                    <div className="absolute inset-0 z-[160] flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 20, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-slate-950/95 border-2 border-indigo-500/40 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.25)] w-full max-w-[340px] md:max-w-2xl h-[80vh] md:h-[85vh] flex flex-col overflow-hidden relative backdrop-blur-xl group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/60 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500/60 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500/60 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/60 z-30 pointer-events-none" />

                            {/* Scanline effect */}
                            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                            
                            <div className="p-4 border-b border-indigo-500/30 flex items-center justify-between bg-indigo-950/20 z-20 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-500/20 rounded border border-indigo-500/30">
                                        <FileText className="w-4 h-4 text-indigo-400" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/60 leading-none">DATA_FETCH_COMPLETE</span>
                                        <span className="text-xs font-bold text-white uppercase tracking-widest truncate">{language === 'RU' ? 'Журнал Событий' : 'Event Log'}</span>
                                    </div>
                                </div>
                                <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-1 cursor-pointer"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2 bg-slate-950/40 z-20 custom-scrollbar">
                                {messageLog && messageLog.length > 0 ? (
                                    [...messageLog].reverse().map((log) => (
                                        <div key={log.id} className="relative flex gap-3 p-3 bg-slate-900/30 border border-slate-850 rounded hover:bg-slate-850/40 transition-all group/item overflow-hidden">
                                            <div className={`absolute top-0 left-0 w-1 h-full ${log.type === 'INFO' ? 'bg-indigo-505' : log.type === 'ERROR' ? 'bg-red-500' : log.type === 'WARN' ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ backgroundColor: log.type === 'INFO' ? 'rgb(99, 102, 241)' : undefined }} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${log.type === 'INFO' ? 'text-indigo-400' : log.type === 'ERROR' ? 'text-red-400' : log.type === 'WARN' ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                        [{log.type}]
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[8px] font-mono text-slate-600">STAMP::</span>
                                                        <span className="text-[9px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                    </div>
                                                </div>
                                                <p className="text-[11px] md:text-xs text-slate-200 font-mono leading-relaxed break-words whitespace-pre-wrap">
                                                    <span className="text-slate-600 mr-2 opacity-50">&gt;</span>
                                                    {log.text}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full opacity-10 gap-3 py-16">
                                        <Terminal className="w-16 h-16 text-slate-500" />
                                        <div className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">BUFFER_EMPTY</div>
                                    </div>
                                )}
                            </div>
                            <div className="p-4 bg-slate-900/60 border-t border-indigo-500/30 z-20 shadow-inner shrink-0">
                                <button onClick={closeModal} className="w-full py-3 bg-indigo-600/20 border border-indigo-500 hover:bg-indigo-600 hover:text-white text-indigo-400 font-extrabold uppercase text-xs tracking-[0.3em] transition-all rounded shadow-md cursor-pointer active:scale-98">
                                    {t.BTN_READY}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* CODEX */}
            <AnimatePresence>
                {activeModal === 'CODEX' && (
                    <div className="absolute inset-0 z-[160] flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeModal}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 25, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 25, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-slate-950/95 border-2 border-purple-500/40 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.25)] w-full max-w-[340px] md:max-w-3xl h-[80vh] md:h-[85vh] flex flex-col overflow-hidden relative backdrop-blur-xl group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500/60 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500/60 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500/60 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500/60 z-30 pointer-events-none" />

                            {/* Scanline effect */}
                            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                            <div className="absolute top-0 left-0 w-full h-1 bg-white/5 animate-scan-slow z-10" />

                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600 to-purple-400 z-10" />
                            <div className="p-4 border-b border-purple-500/30 flex items-center justify-between bg-purple-950/20 z-20 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                                        <BookOpen className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white leading-none">{language === 'RU' ? 'База Предметов' : 'Item Codex'}</h3>
                                </div>
                                <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-1 cursor-pointer"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-6 bg-slate-950/30 custom-scrollbar">
                                {(['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'] as const).map(rarity => {
                                    const items = ITEM_REGISTRY.filter(i => i.rarity === rarity);
                                    if (items.length === 0) return null;
                                    return (
                                        <div key={rarity}>
                                            <div className="flex items-center gap-3 mb-3">
                                                <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${rarity === 'COMMON' ? 'text-slate-400' : rarity === 'UNCOMMON' ? 'text-emerald-400' : rarity === 'RARE' ? 'text-purple-400' : 'text-amber-400'}`}>{rarity}</h4>
                                                <div className={`flex-1 h-px ${rarity === 'COMMON' ? 'bg-slate-800/60' : rarity === 'UNCOMMON' ? 'bg-emerald-900/40' : rarity === 'RARE' ? 'bg-purple-900/40' : 'bg-amber-900/40'}`} />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {items.map(def => (
                                                    <div key={def.idPrefix} className="flex gap-3 p-2.5 bg-slate-900/30 border border-slate-850 rounded-xl hover:bg-slate-800/30 transition-all group cursor-default">
                                                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-850 shrink-0 shadow-inner group-hover:scale-105 transition-transform ${getRarityBorder(def.rarity)}`}><ItemIcon def={def} size="w-7 h-7 md:w-9 md:h-9" /></div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-0.5"><span className="text-[11px] font-black text-white truncate group-hover:text-indigo-300 transition-colors">{def.name[language]}</span></div>
                                                            <p className="text-[9px] text-slate-500 italic leading-tight line-clamp-2">"{def.description[language]}"</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="p-3 bg-slate-950/50 border-t border-slate-850/65 shrink-0">
                                <button onClick={closeModal} className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 font-extrabold uppercase text-[10px] transition-all cursor-pointer active:scale-98">{t.BTN_READY}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* HELP */}
            <AnimatePresence>
                {helpTopic && helpData && (
                    <div className="absolute inset-0 z-[150] flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeHelp}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-slate-950/90 border border-indigo-500/30 p-6 md:p-8 rounded-xl shadow-2xl max-w-[340px] md:max-w-sm w-full max-h-[90vh] overflow-y-auto relative backdrop-blur-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-500/50" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-indigo-500/50" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-indigo-500/50" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-500/50" />

                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-indigo-450" />
                            <h3 className="text-xl font-black text-white uppercase mb-2 text-center tracking-tight break-words whitespace-pre-wrap">{helpData.title}</h3>
                            <p className="text-xs text-slate-400 mb-5 text-center leading-relaxed px-2 break-words whitespace-pre-wrap">{helpData.desc}</p>
                            {(helpData as any).extra ? (
                                <div className="flex flex-col gap-2 bg-slate-950/70 p-3 rounded-lg border border-slate-850 mb-5 max-h-[25vh] overflow-y-auto no-scrollbar">
                                    {(helpData as any).extra.map((line: string, i: number) => (
                                        <p key={i} className="text-[10px] text-slate-300 font-mono leading-tight border-l-2 border-indigo-500 pl-2 py-1 break-words whitespace-pre-wrap">{line}</p>
                                    ))}
                                </div>
                            ) : (
                                <div className="bg-slate-900/60 p-3 rounded-lg text-[10px] font-mono text-emerald-400 text-center mb-5 border border-emerald-950">
                                    {helpData.hint}
                                </div>
                            )}
                            <button onClick={closeHelp} className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs transition-shadow shadow-lg shadow-indigo-900/40 cursor-pointer active:scale-95 transition-all">{t.BTN_READY}</button>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* ITEM INSPECTION */}
            <AnimatePresence>
                {inspectedItem && (
                    <div className="absolute inset-0 z-[150] flex items-center justify-center p-4 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeInspect}
                            className="absolute inset-0 bg-black/85 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            transition={{ type: "spring", duration: 0.4 }}
                            className="bg-slate-950/95 border border-slate-800 rounded-xl shadow-2xl max-w-[340px] md:max-w-sm w-full max-h-[92vh] overflow-y-auto relative flex flex-col gap-4 p-5 md:p-8 backdrop-blur-xl"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Corner brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-500/50" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-indigo-500/50" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-indigo-500/50" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-500/50" />

                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-700" />
                            <button onClick={closeInspect} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors p-1 cursor-pointer"><X className="w-5 h-5"/></button>
                            {(() => {
                                const data = resolveItemText(inspectedItem, language);
                                return (
                                    <>
                                        <div className="flex flex-col items-center shrink-0">
                                            <div className={`w-20 h-20 rounded-2xl bg-slate-900/50 border flex items-center justify-center mb-3 shadow-inner ${getRarityBorder(inspectedItem.rarity)}`}><ItemIcon item={inspectedItem} size="w-12 h-12" /></div>
                                            <h3 className="text-base font-black text-white uppercase tracking-tight text-center leading-tight break-words whitespace-pre-wrap">{data.name}</h3>
                                            <span className={`text-[9px] font-black uppercase mt-1.5 px-2 py-0.5 rounded-full bg-slate-900 border ${getRarityBorder(inspectedItem.rarity)} text-slate-300`}>{inspectedItem.rarity}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 text-center italic leading-relaxed border-t border-b border-slate-900 py-3.5 break-words whitespace-pre-wrap shrink-0 font-mono">"{data.description}"</p>
                                        <div className="flex flex-col gap-2 flex-1 overflow-y-auto no-scrollbar py-1">
                                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><div className="min-w-0"><span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block mb-0.5 leading-none">Success</span><span className="text-[11px] text-emerald-100 font-mono leading-tight break-words whitespace-pre-wrap">{data.effectDesc}</span></div></div>
                                            {inspectedItem.negativeEffectType && <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-950/15 border border-red-900/25"><AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /><div className="min-w-0"><span className="text-[8px] font-black text-red-400 uppercase tracking-widest block mb-0.5 leading-none font-sans">Failure</span><span className="text-[11px] text-red-100 font-mono leading-tight break-words whitespace-pre-wrap">{data.negDesc}</span></div></div>}
                                        </div>
                                        <div className="flex flex-col gap-2 mt-2 shrink-0">
                                            <button onClick={closeInspect} className="w-full py-3 bg-white text-black hover:bg-slate-200 transition-colors rounded-lg font-black uppercase tracking-wider text-xs cursor-pointer">{t.BTN_READY}</button>
                                            <button onClick={() => { destroyItem(inspectedItem.id); closeInspect(); }} className="w-full py-2 bg-transparent hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-lg font-bold uppercase tracking-wider text-[10px] transition-colors flex items-center justify-center gap-2 group cursor-pointer active:scale-98"><Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Discard Item</button>
                                        </div>
                                    </>
                                );
                             })()}
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* VICTORY / DEFEAT */}
            {(gameStatus === 'DEFEAT' || (gameStatus === 'VICTORY' && victoryStage === 'MODAL')) && (
                <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-3xl animate-in fade-in duration-700 pointer-events-auto p-3 sm:p-6 md:p-8">
                    {/* Background Grid & Scanlines */}
                    <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none" />
                    <div className={`absolute inset-0 bg-gradient-to-b opacity-25 pointer-events-none ${gameStatus === 'VICTORY' ? 'from-emerald-500/20 to-transparent shadow-[inset_0_0_100px_rgba(16,185,129,0.1)]' : 'from-red-500/20 to-transparent shadow-[inset_0_0_100px_rgba(239,68,68,0.1)]'}`} />

                    {/* Premium Sci-Fi Terminal Layout */}
                    <div className="bg-slate-950/95 border-2 border-slate-800/80 rounded-2xl md:rounded-[2rem] shadow-[0_25px_60px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.05)] max-w-4xl w-full flex flex-col relative z-10 max-h-[98vh] overflow-y-auto no-scrollbar py-2 md:py-6 px-2 sm:px-6 md:px-8 border-t-indigo-500/30 group leading-tight">
                        {/* Corner brackets */}
                        <div className={`absolute top-0 left-0 w-3 h-3 md:w-5 md:h-5 border-t-2 border-l-2 z-30 pointer-events-none ${gameStatus === 'VICTORY' ? 'border-emerald-500/60' : 'border-red-500/60'}`} />
                        <div className={`absolute top-0 right-0 w-3 h-3 md:w-5 md:h-5 border-t-2 border-r-2 z-30 pointer-events-none ${gameStatus === 'VICTORY' ? 'border-emerald-500/60' : 'border-red-500/60'}`} />
                        <div className={`absolute bottom-0 left-0 w-3 h-3 md:w-5 md:h-5 border-b-2 border-l-2 z-30 pointer-events-none ${gameStatus === 'VICTORY' ? 'border-emerald-500/60' : 'border-red-500/60'}`} />
                        <div className={`absolute bottom-0 right-0 w-3 h-3 md:w-5 md:h-5 border-b-2 border-r-2 z-30 pointer-events-none ${gameStatus === 'VICTORY' ? 'border-emerald-500/60' : 'border-red-500/60'}`} />

                        {/* Terminal Decoration */}
                        <div className="w-full flex items-center gap-1 md:gap-4 mb-1.5 md:mb-6 opacity-45 shrink-0 px-2 mt-1 md:mt-0">
                            <div className="h-px flex-1 bg-current" style={{ color: gameStatus === 'VICTORY' ? '#10b981' : '#ef4444' }} />
                            <div className="text-[7.5px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.5em] font-mono whitespace-nowrap" style={{ color: gameStatus === 'VICTORY' ? '#10b981' : '#ef4444' }}>
                                {gameStatus === 'VICTORY' ? 'SYSTEM_STABILITY_RESTORED' : 'LINK_TERMINATED'}
                            </div>
                            <div className="h-px flex-1 bg-current" style={{ color: gameStatus === 'VICTORY' ? '#10b981' : '#ef4444' }} />
                        </div>

                        {/* Main Status Display */}
                        <div className="relative mb-2 md:mb-7 mx-auto shrink-0">
                            <div className={`absolute inset-0 blur-xl md:blur-3xl opacity-30 animate-pulse ${gameStatus === 'VICTORY' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div className={`relative px-3 py-1.5 sm:px-6 md:px-10 md:py-4 border-2 md:border-4 transform skew-x-[-12deg] ${gameStatus === 'VICTORY' ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'border-red-500 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]'}`}>
                                <h1 className={`text-xl sm:text-4xl md:text-6xl font-black uppercase tracking-tighter italic transform skew-x-[12deg] leading-none ${gameStatus === 'VICTORY' ? 'text-emerald-400' : 'text-red-500'}`}>
                                    {gameStatus === 'VICTORY' ? t.VICTORY : t.DEFEAT}
                                </h1>
                            </div>
                        </div>

                        {/* Mission Summary Data in Two-Column Layout */}
                        {(() => {
                            const baseScore = 15000;
                            const timePenalty = currentTurn * 10;
                            const actionsPenalty = (player?.actionsTaken || 0) * 50;
                            const resourcesBonus = (player?.playerLevel || 0) * 500 + (player?.totalCoinsEarned || 0) * 2;
                            
                            let finalScore = Math.max(0, baseScore - timePenalty - actionsPenalty + resourcesBonus);
                            if (gameStatus !== 'VICTORY') {
                              finalScore = Math.floor(finalScore * 0.1); 
                            } else {
                              finalScore = Math.floor(finalScore);
                            }

                            return (
                                <>
                                    {/* Responsive Dashboard Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 md:gap-5 w-full mb-1.5 md:mb-6 shrink-0 text-left px-1 md:px-0">
                                        
                                        {/* COLUMN 1: Score & detailed breakdown */}
                                        <div className="md:col-span-7 lg:col-span-7 flex flex-col justify-between">
                                            <div className="bg-slate-900/40 border border-purple-500/20 rounded-xl md:rounded-2xl p-2 md:p-5 flex flex-col flex-1 shadow-[0_4px_24px_rgba(147,51,234,0.05)] backdrop-blur-md relative overflow-hidden group">
                                                <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/5 blur-3xl rounded-full pointer-events-none" />
                                                
                                                <div className="text-[9px] md:text-xs font-bold uppercase tracking-[0.2em] text-purple-400 mb-0.5 z-10 flex items-center gap-1.5">
                                                    <Trophy className="w-3 md:w-3.5 h-3 md:h-3.5 text-purple-400 animate-pulse" />
                                                    {language === 'RU' ? 'ОЧКИ РЕЙТИНГА' : 'RATING POINTS (SCORE)'}
                                                </div>
                                                
                                                <div className="text-xl sm:text-3xl md:text-5xl font-black font-mono tracking-tight text-white mb-1.5 z-10 drop-shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all group-hover:drop-shadow-[0_0_20px_rgba(168,85,247,0.6)] leading-none">
                                                    {finalScore.toLocaleString()}
                                                </div>
                                                
                                                {/* Breakdown table with sleek design */}
                                                <div className="w-full z-10 border border-slate-800/80 rounded-xl bg-slate-950/60 p-2 md:p-3 text-[9px] md:text-[11.5px] font-mono space-y-1.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] mt-auto">
                                                    
                                                    {/* Base */}
                                                    <div className="flex items-center justify-between border-b border-slate-900/80 pb-1">
                                                        <span className="text-slate-400 flex items-center gap-1.5">
                                                            <span className="w-1.5 h-1.5 rounded bg-indigo-500 shadow-[0_0_6px_#6366f1]" />
                                                            <span>{language === 'RU' ? 'База' : 'Base'}</span>
                                                        </span>
                                                        <span className="text-white font-black">+15,000</span>
                                                    </div>
                                                    
                                                    {/* Time Penalty */}
                                                    <div className="flex items-center justify-between border-b border-slate-900/80 pb-1.5">
                                                        <span className="text-slate-400 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded bg-red-500 shadow-[0_0_6px_#ef4444]" />
                                                            <span>{language === 'RU' ? 'Время' : 'Time'}</span>
                                                            <span className="text-slate-500 text-[9px] md:text-[10px] font-normal">({currentTurn} {language === 'RU' ? 'ходов' : 'turns'} &times; -10)</span>
                                                        </span>
                                                        <span className="text-red-400 font-bold">-{timePenalty.toLocaleString()}</span>
                                                    </div>
                                                    
                                                    {/* Actions Penalty */}
                                                    <div className="flex items-center justify-between border-b border-slate-900/80 pb-1.5">
                                                        <span className="text-slate-400 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded bg-red-400 shadow-[0_0_6px_#f87171]" />
                                                            <span>{language === 'RU' ? 'Действия' : 'Action'}</span>
                                                            <span className="text-slate-500 text-[9px] md:text-[10px] font-normal">({player?.actionsTaken || 0} {language === 'RU' ? 'действ.' : 'acts'} &times; -50)</span>
                                                        </span>
                                                        <span className="text-red-400 font-bold font-semibold">-{actionsPenalty.toLocaleString()}</span>
                                                    </div>
                                                    
                                                    {/* Resource Bonus */}
                                                    <div className="flex items-center justify-between pt-0.5">
                                                        <span className="text-slate-400 flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded bg-emerald-500 shadow-[0_0_6px_#10b981] animate-pulse" />
                                                            <span>{language === 'RU' ? 'Бонусы' : 'Bonus'}</span>
                                                            <span className="text-slate-500 text-[8.5px] md:text-[9.5px] font-normal">
                                                                ({language === 'RU' ? 'Ранг' : 'Rank'} {player?.playerLevel || 1} &times; 500 + {player?.totalCoinsEarned || 0} &times; 2)
                                                            </span>
                                                        </span>
                                                        <span className="text-emerald-400 font-black">+{resourcesBonus.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        {/* COLUMN 2: Statistics & Assessment */}
                                        <div className="md:col-span-5 lg:col-span-5 flex flex-col gap-2.5 md:gap-3.5 h-full justify-between">
                                            {/* Grid */}
                                            <div className="grid grid-cols-2 gap-2 md:gap-3 w-full">
                                                {[
                                                    { label: language === 'RU' ? 'СТАТУС' : 'STATUS', value: gameStatus === 'VICTORY' ? (language === 'RU' ? 'УСПЕХ' : 'SUCCESS') : (language === 'RU' ? 'КРАХ' : 'FAILED'), color: gameStatus === 'VICTORY' ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold', icon: Activity },
                                                    { label: language === 'RU' ? 'ХОДОВ ПРОШЛО' : 'TURNS ELAPSED', value: currentTurn, color: 'text-slate-300', icon: Timer },
                                                    { label: language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS', value: player?.totalCoinsEarned || 0, color: 'text-amber-400', icon: Coins },
                                                    { label: language === 'RU' ? 'ДЕЙСТВИЙ' : 'ACTIONS TAKEN', value: player?.actionsTaken || 0, color: 'text-purple-400', icon: Footprints }
                                                ].map((stat, i) => {
                                                    const IconComponent = stat.icon;
                                                    return (
                                                        <div key={i} className="bg-slate-900/30 border border-slate-850/80 p-2 text-center rounded-xl flex flex-col items-center justify-center relative overflow-hidden group hover:border-slate-800 transition-colors">
                                                            <IconComponent className="w-3.5 h-3.5 text-slate-500 mb-1" />
                                                            <div className="text-[7.5px] md:text-[8px] font-black uppercase tracking-widest text-slate-500 mb-1">{stat.label}</div>
                                                            <div className={`text-sm md:text-base font-extrabold font-mono leading-none ${stat.color}`}>{stat.value}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* Performance Card */}
                                            {gameStatus === 'VICTORY' ? (
                                                <div className="bg-emerald-950/20 border border-emerald-500/25 p-3 md:p-4 rounded-xl flex flex-col justify-center flex-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                                                    <div className="flex items-center gap-1.5 mb-1 shrink-0 text-emerald-400 font-extrabold uppercase tracking-widest text-[9px] md:text-[9.5px]">
                                                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                                        <span>{language === 'RU' ? 'ЭФФЕКТИВНОСТЬ' : 'PERFORMANCE'}</span>
                                                    </div>
                                                    <p className="text-emerald-200/60 text-[10px] md:text-[10.5px] font-sans leading-relaxed">
                                                        {language === 'RU' ? 'Миссия закончена. Сектор стабилизирован. Начислен +1 балл улучшений.' : 'Simulated core extracted perfectly. +1 Skill Point awarded for upgrades.'}
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="bg-red-950/20 border border-red-500/25 p-3 md:p-4 rounded-xl flex flex-col justify-center flex-1 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                                                    <div className="flex items-center gap-1.5 mb-1 shrink-0 text-red-400 font-extrabold uppercase tracking-widest text-[9px] md:text-[9.5px]">
                                                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                                                        <span>{language === 'RU' ? 'ОТКАЗ СИСТЕМЫ' : 'FAULT REPORT'}</span>
                                                    </div>
                                                    <p className="text-red-200/60 text-[10px] md:text-[10.5px] font-sans leading-relaxed">
                                                        {language === 'RU' ? 'Ядро перегружено. Квантовая связь разорвана из-за критической энтропии.' : 'Core connection terminated. Link disrupted due to excessive system entropy.'}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                        {gameStatus === 'VICTORY' && (
                            <div className="w-full flex flex-col shrink-0 min-h-0 text-left px-1 md:px-0">
                                {/* Item extraction selection */}
                                {player?.inventory && player.inventory.length > 0 && (
                                    <div className="w-full bg-slate-900/15 border border-slate-900/60 p-2 md:p-4 rounded-xl mb-1.5 md:mb-3 shrink-0 flex flex-col">
                                        <div className="text-[9px] md:text-[11px] font-black uppercase tracking-widest text-slate-400 mb-1.5 md:mb-3 text-center">
                                            {language === 'RU' ? 'ВЫБЕРИТЕ ОДИН ПРЕДМЕТ ДЛЯ ЭКСТРАКЦИИ' : 'SELECT ONE ITEM TO EXTRACT'}
                                        </div>
                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 md:gap-2.5 w-full mt-0.5">
                                            {player.inventory.map(item => (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => { setSelectedRewardItem(item); playUiSound('CLICK'); }}
                                                    className={`p-1.5 md:p-2 border rounded-xl transition-all duration-300 flex flex-col items-center justify-center text-center ${selectedRewardItem?.id === item.id ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.3)] scale-[1.02]' : 'border-slate-800 bg-slate-950/40 hover:bg-slate-900/30 hover:border-slate-750'}`}
                                                >
                                                    <span className={`text-xl md:text-2xl mb-1 ${item.rarity === 'LEGENDARY' ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]' : item.rarity === 'RARE' ? 'text-purple-400' : 'text-blue-400'}`}>
                                                        {item.visualType === 'ARTIFACT' ? '💎' : item.visualType === 'TOOL' ? '⛏️' : item.visualType === 'HEAD' ? '🪖' : '👕'}
                                                    </span>
                                                    <span className="text-[8.5px] font-extrabold text-slate-200 uppercase tracking-wide truncate w-full">{item.name}</span>
                                                    <span className={`text-[7px] font-bold font-mono mt-0 md:mt-0.5 uppercase ${item.rarity === 'LEGENDARY' ? 'text-amber-400' : item.rarity === 'RARE' ? 'text-purple-400' : 'text-blue-400'}`}>{item.rarity}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Hex extraction extraction container */}
                                {campaignMode === 'LEVELS' && Object.keys(availableHexes).length > 0 && (
                                    <div className="bg-slate-900/20 border border-slate-905 p-2 rounded-xl mb-1.5 md:mb-4 shrink-0 mt-0.5">
                                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-900/80">
                                            <h3 className="text-emerald-400 font-extrabold uppercase tracking-wider text-[9px] md:text-xs">
                                                {language === 'RU' ? 'Протокол Извлечения Гексов' : 'Hex Extraction Protocol'}
                                            </h3>
                                            <div className="text-[8px] font-mono tracking-widest px-1.5 py-0.5 bg-slate-950 rounded text-amber-500 border border-amber-900/30">
                                                {language === 'RU' ? 'ВМЕСТИМОСТЬ' : 'CAPACITY'}: {totalSelectedHexesCount} / {Math.max(5, player?.maxInventorySize || 5)} 
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1 max-h-[100px] overflow-y-auto no-scrollbar">
                                            {Object.entries(availableHexes).map(([level, count]) => {
                                                const lvl = Number(level);
                                                const selected = selectedHexes[lvl] || 0;
                                                const capacityFull = totalSelectedHexesCount >= Math.max(5, player?.maxInventorySize || 5);
                                                
                                                return (
                                                    <div key={lvl} className="flex items-center justify-between bg-slate-950/60 p-1.5 md:p-2 rounded-lg border border-slate-900">
                                                        <div className="flex items-center gap-2 md:gap-3">
                                                            <div className={`w-5 h-5 md:w-6 md:h-6 rounded-md flex items-center justify-center text-[9px] md:text-[10px] font-mono font-bold ${
                                                                lvl < 0 ? 'bg-indigo-900/50 text-indigo-400' :
                                                                lvl === 0 ? 'bg-slate-800 text-slate-400' :
                                                                'bg-emerald-900/50 text-emerald-400'
                                                            }`}>
                                                                L{lvl}
                                                            </div>
                                                            <div className="text-[9px] md:text-xs font-bold text-slate-300">
                                                                {language === 'RU' ? 'Доступно:' : 'Available:'} {count}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex bg-slate-900 rounded-md overflow-hidden shadow-inner border border-slate-800">
                                                            <button 
                                                                onClick={() => {
                                                                    if (selected > 0) {
                                                                        playUiSound('CLICK');
                                                                        setSelectedHexes(prev => ({...prev, [lvl]: prev[lvl] - 1}));
                                                                    }
                                                                }}
                                                                disabled={selected <= 0}
                                                                className="w-5 h-5 md:w-7 md:h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-750 active:bg-slate-700 disabled:opacity-30 transition-colors text-white font-bold text-xs"
                                                            >-</button>
                                                            <div className="w-6 h-5 md:w-8 md:h-7 flex items-center justify-center font-mono text-emerald-400 text-[10px] md:text-xs font-bold">
                                                                {selected}
                                                            </div>
                                                            <button 
                                                                onClick={() => {
                                                                    if (selected < count && !capacityFull) {
                                                                        playUiSound('CLICK');
                                                                        setSelectedHexes(prev => ({...prev, [lvl]: (prev[lvl] || 0) + 1}));
                                                                    }
                                                                }}
                                                                disabled={selected >= count || capacityFull}
                                                                className="w-5 h-5 md:w-7 md:h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-755 active:bg-slate-700 disabled:opacity-30 transition-colors text-white font-bold text-xs"
                                                            >+</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Navigation buttons at the absolute bottom of the panel */}
                        <div className="w-full flex flex-col gap-1.5 md:gap-2 shrink-0 mt-1 md:mt-5 text-left px-1 md:px-0">
                            {gameStatus === 'VICTORY' && activeLevelConfig && (
                                <button onClick={handleNextLevel} className="w-full py-2 sm:py-3 md:py-4 bg-emerald-600 border-2 border-emerald-400/80 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-[0_4px_20px_rgba(16,185,129,0.3)] hover:shadow-[0_4px_25px_rgba(16,185,129,0.5)] rounded-xl transition-all flex items-center justify-center gap-2 text-[10px] md:text-sm">
                                    {t.BTN_NEXT} <ArrowRight className="w-3.5 h-3.5 md:w-5 md:h-5" />
                                </button>
                            )}
                            <div className="grid grid-cols-2 gap-1.5 md:gap-2 w-full">
                                <button onClick={handleRetry} className="py-2.5 md:py-4 bg-slate-900 border-2 border-slate-750 hover:bg-slate-800 text-white font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-[9px] md:text-sm">
                                    <RotateCcw className="w-3 h-3 md:w-5 md:h-5 animate-[spin_10s_linear_infinite]" /> {t.BTN_RETRY}
                                </button>
                                <button onClick={handleMenu} className="py-2.5 md:py-4 bg-slate-950 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 font-black uppercase tracking-[0.1em] sm:tracking-[0.15em] rounded-xl transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-[9px] md:text-sm">
                                    <LogOut className="w-3 h-3 md:w-5 md:h-5 animate-[pulse_2s_infinite]" /> {campaignMode === 'LEVELS' ? (language === 'RU' ? 'ВЫБОР УРОВНЕЙ' : 'LEVELS') : (t.BTN_MENU || 'MENU')}
                                </button>
                            </div>
                        </div>

                        {/* Extra Visual Detail (hidden on smallest screens to save space) */}
                        <div className="hidden md:block mt-6 text-[8px] font-mono opacity-20 uppercase tracking-[1em] text-center w-full shrink-0">
                            ENCRYPTION_KEY::0x7F2A_C0DE_NEBULA
                        </div>
                    </div>
                </div>
            )}

            {/* MINI MONUMENT DIALOG */}
            {miniMonumentDialogState?.isOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 pointer-events-auto">
                    <div className="bg-slate-950 border-2 border-indigo-500/40 p-4 md:p-6 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.25)] max-w-lg w-full relative overflow-hidden flex flex-col gap-4">
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/60 z-30 pointer-events-none" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500/60 z-30 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500/60 z-30 pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/60 z-30 pointer-events-none" />
                        
                        <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <button onClick={closeMiniMonumentDialog} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors z-20"><X className="w-5 h-5"/></button>

                        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 relative z-20">
                            <div className="p-2 bg-indigo-950/50 rounded-xl border border-indigo-900/50 shadow-inner"><Info className="w-6 h-6 text-indigo-500" /></div>
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter leading-none">Подсказка Обелиска</h3>
                            </div>
                        </div>

                        <div className="relative z-20 p-4 bg-slate-900 border border-slate-800 rounded-xl">
                            <p className="text-slate-300 font-mono text-sm whitespace-pre-wrap">{miniMonumentDialogState.hint}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* MONUMENT DIALOG */}
            {monumentDialogState.isOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 pointer-events-auto">
                    <div className="bg-slate-950 border-2 border-amber-500/40 p-4 md:p-6 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.25)] max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] relative overflow-hidden flex flex-col gap-4 md:gap-6 animate-in zoom-in-95 group">
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-amber-500/60 z-30 pointer-events-none" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-amber-500/60 z-30 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-amber-500/60 z-30 pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-amber-500/60 z-30 pointer-events-none" />

                        {/* Scanline effect */}
                        <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />

                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <button onClick={closeMonumentDialog} className="absolute top-3 right-3 md:top-4 md:right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-5 h-5 md:w-6 h-6"/></button>
                        <div className="flex items-center gap-3 md:gap-4 border-b border-slate-800 pb-3 md:pb-4 shrink-0 relative z-20">
                            <div className="p-2 md:p-3 bg-amber-950/50 rounded-xl border border-amber-900/50 shadow-inner"><Crown className="w-6 h-6 md:w-8 md:h-8 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" /></div>
                            <div><h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none break-words whitespace-pre-wrap">{t.MONUMENT_TITLE}</h3><p className="text-[10px] md:text-xs text-amber-600 uppercase tracking-widest font-mono mt-1 break-words whitespace-pre-wrap">{t.MONUMENT_SUB}</p></div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 md:gap-6 flex-1 overflow-y-auto md:overflow-hidden min-h-0">
                            <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col overflow-hidden min-h-[150px] md:min-h-0 shrink-0">
                                <div className="p-2 border-b border-slate-800 bg-slate-900"><span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{t.MONUMENT_KEYS}</span></div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                                    {availableInventory.length === 0 ? <div className="text-center text-slate-600 text-xs italic py-10">{t.MONUMENT_EMPTY_INV}</div> : availableInventory.map(item => (
                                        <div key={item.id} draggable onDragStart={(e) => e.dataTransfer.setData("itemId", item.id)} onClick={() => { 
                                            // Auto-add logic
                                            const reqs = monumentRequirements || Array(3).fill('ANY');
                                            const idx = reqs.findIndex((r: string, i: number) => {
                                                if (monumentDialogState.slots[i]) return false;
                                                const isUnrev = !!(monumentRevealedSlots && !monumentRevealedSlots[i]);
                                                if (isUnrev || r === 'ANY') return true;
                                                if (r === 'ONE_OF') return (monumentAlternatives ?? []).includes(item.baseId);
                                                const isRarityWild = r === 'COMMON' || r === 'UNCOMMON' || r === 'RARE' || r === 'LEGENDARY';
                                                return isRarityWild ? item.rarity === r : item.baseId === r;
                                            });
                                            if (idx !== -1) placeItemInMonument(item, idx);
                                        }} className={`flex items-center gap-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border cursor-grab active:cursor-grabbing group transition-all ${getRarityBorder(item.rarity)}`}>
                                            <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center border border-slate-800 overflow-hidden"><ItemIcon item={item} size="w-8 h-8" /></div>
                                            <div className="flex flex-col min-w-0"><span className="text-xs font-bold text-white group-hover:text-amber-200 truncate">{resolveItemText(item, language).name}</span><span className="text-[9px] text-slate-500 uppercase">{item.rarity}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-[1.2] flex flex-col justify-center items-center gap-4 relative">
                                <div className="flex gap-2 md:gap-4 relative z-10 flex-wrap justify-center">
                                    {(monumentRequirements || Array(3).fill('ANY')).map((reqId, idx) => {
                                        const slotItem = monumentDialogState.slots[idx];
                                        const isUnrevealed = !!(monumentRevealedSlots && !monumentRevealedSlots[idx]);
                                        const isWildcard = reqId === 'ANY';
                                        const RARITIES = ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'] as const;
                                        const isRarityWild = (RARITIES as readonly string[]).includes(reqId);
                                        const rarityColor: Record<string, string> = { COMMON: 'text-slate-300 border-slate-500', UNCOMMON: 'text-emerald-400 border-emerald-600', RARE: 'text-purple-400 border-purple-600', LEGENDARY: 'text-amber-400 border-amber-600' };
                                        const reqDef = !isUnrevealed && !isWildcard && !isRarityWild && reqId !== 'ONE_OF' ? getItemDef(reqId) : undefined;
                                        
                                        const resolveReqHint = () => {
                                            if (isUnrevealed) return t.MONUMENT_HINT_UNREVEALED;
                                            if (isWildcard) return t.MONUMENT_HINT_ANY;
                                            if (reqId === 'ONE_OF') return t.MONUMENT_HINT_ONE_OF;
                                            if (isRarityWild) return t.MONUMENT_HINT_RARITY.replace('{0}', reqId);
                                            const def = getItemDef(reqId);
                                            return t.MONUMENT_HINT_ITEM.replace('{0}', def?.name[language] || reqId);
                                        };

                                        const resolveReqName = () => {
                                            if (isWildcard) return language === 'RU' ? 'Любой' : 'Any';
                                            if (reqId === 'ONE_OF') return language === 'RU' ? 'Выбор' : 'Choice';
                                            if (isRarityWild) return reqId;
                                            return getItemDef(reqId)?.name[language] || reqId;
                                        };

                                        const hint = resolveReqHint();

                                        return (
                                            <div 
                                                key={idx} 
                                                onDrop={(e) => handleDrop(e, idx)} 
                                                onDragOver={handleAllowDrop} 
                                                className={`w-16 h-20 md:w-24 md:h-32 rounded-xl md:rounded-2xl border-2 flex flex-col items-center justify-center transition-all relative overflow-hidden group/slot ${slotItem ? `bg-slate-900 ${getRarityBorder(slotItem.rarity)}` : isUnrevealed ? 'bg-slate-900/20 border-slate-600 border-dashed' : 'bg-slate-900/30 border-slate-700 border-dashed'}`}
                                                title={hint}
                                            >
                                                
                                                {/* Interaction Layer */}
                                                <div 
                                                    className="absolute inset-0 z-10 cursor-pointer" 
                                                    onClick={() => {
                                                        if (slotItem) {
                                                            removeItemFromMonument(idx);
                                                        } else {
                                                            useGameStore.getState().showToast(hint, 'info');
                                                        }
                                                    }}
                                                />

                                                {/* Label */}
                                                {!slotItem && !isUnrevealed && (
                                                    <div className="absolute bottom-1 inset-x-1 z-0 pointer-events-none">
                                                        <div className="text-[7px] md:text-[9px] text-center text-slate-500 font-black uppercase truncate px-1 opacity-60">
                                                            {resolveReqName()}
                                                        </div>
                                                    </div>
                                                )}

                                                {slotItem ? <ItemIcon item={slotItem} size="w-10 h-10 md:w-16 md:h-16" /> : isUnrevealed ? (
                                                    <div className="flex flex-col items-center gap-1 animate-pulse">
                                                        <div className="w-8 h-8 md:w-12 md:h-12 rounded-full bg-slate-800/80 border border-slate-500 flex items-center justify-center shadow-[0_0_8px_rgba(148,163,184,0.3)]">
                                                            <span className="text-base md:text-xl font-black text-slate-400 select-none">?</span>
                                                        </div>
                                                        <span className="text-[7px] md:text-[9px] text-slate-500 uppercase font-mono tracking-wider">OBELISK</span>
                                                    </div>
                                                ) : (
                                                    reqId === 'ONE_OF' ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <div className="flex gap-0.5">
                                                                {(monumentAlternatives ?? []).map((altId, ai) => {
                                                                    const altDef = getItemDef(altId);
                                                                    return altDef ? <ItemIcon key={ai} def={altDef} size="w-4 h-4 md:w-5 md:h-5" opacity={0.3} grayscale /> : null;
                                                                })}
                                                            </div>
                                                            <span className="text-[8px] text-slate-500 uppercase font-mono tracking-wider">CHOICE</span>
                                                        </div>
                                                    ) : isRarityWild ? (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <HelpCircle className={`w-7 h-7 md:w-10 md:h-10 ${rarityColor[reqId]?.split(' ')[0] ?? 'text-slate-400'} opacity-80`} />
                                                            <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-wider border px-1 rounded ${rarityColor[reqId] ?? 'text-slate-400 border-slate-500'}`}>{reqId}</span>
                                                        </div>
                                                    ) : isWildcard ? <HelpCircle className="w-8 h-8 md:w-12 md:h-12 text-slate-400 opacity-60" /> :
                                                    (reqDef ? (
                                                        <div className="absolute inset-0 flex items-center justify-center opacity-60">
                                                            <ItemIcon def={reqDef} size="w-10 h-10 md:w-16 md:h-16" opacity={0.5} silhouette />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Lock className="w-5 h-5 md:w-8 md:h-8 text-slate-400 drop-shadow-md" />
                                                            </div>
                                                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center text-slate-300 font-mono">REQ</div>
                                                        </div>
                                                    ) : null)
                                                )}

                                                {/* Single Slot Reroll Button (Overlay) */}
                                                {!slotItem && !isUnrevealed && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            useGameStore.getState().rerollSingleMonumentRequirement(idx);
                                                        }}
                                                        className="absolute top-1 right-1 p-1 bg-indigo-500/20 hover:bg-indigo-500/40 rounded-md border border-indigo-500/30 transition-colors z-20 group-hover/slot:bg-indigo-500/50"
                                                        title={t.MONUMENT_REROLL_SLOT}
                                                    >
                                                        <RefreshCw className="w-3 h-3 text-indigo-300" />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="w-full px-2 md:px-4">
                                    <button onClick={activateMonument} disabled={!isMonumentReady} className={`w-full py-3 md:py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2 text-sm md:text-base ${isMonumentReady ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed grayscale'}`}>
                                        {isMonumentReady ? <><Zap className="w-4 h-4 md:w-5 md:h-5 fill-current" /> {t.MONUMENT_BTN_ACTIVE}</> : t.MONUMENT_BTN_INACTIVE}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VOID DIALOG */}
            {voidDialogTarget && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 pointer-events-auto" onClick={closeVoidDialog}>
                    <div className="bg-slate-950 border-2 border-red-500/40 p-4 md:p-6 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.25)] max-w-lg w-full max-h-[95vh] md:max-h-[90vh] relative overflow-hidden flex flex-col gap-4 md:gap-6 animate-in zoom-in-95 group" onClick={e => e.stopPropagation()}>
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-red-500/60 z-30 pointer-events-none" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-red-500/60 z-30 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-red-500/60 z-30 pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-red-500/60 z-30 pointer-events-none" />

                        {/* Scanline effect */}
                        <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />

                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <button onClick={closeVoidDialog} className="absolute top-3 right-3 md:top-4 md:right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-5 h-5 md:w-6 h-6"/></button>
                        <div className="flex items-center gap-3 md:gap-4 border-b border-slate-800 pb-3 md:pb-4 shrink-0 relative z-20">
                            <div className="p-2 md:p-3 bg-red-950/50 rounded-xl border border-red-900/50 shadow-inner animate-pulse"><AlertTriangle className="w-6 h-6 md:w-8 md:h-8 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" /></div>
                            <div><h3 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter leading-none break-words whitespace-pre-wrap">{t.VOID_TITLE}</h3><p className="text-[10px] md:text-xs text-red-400 uppercase tracking-widest font-mono mt-1 break-words whitespace-pre-wrap">{t.VOID_SUB}</p></div>
                        </div>
                        <div className="flex-1 overflow-y-auto flex flex-col gap-4 md:gap-6 min-h-0">
                            <p className="text-xs md:text-sm text-slate-400 leading-relaxed text-center px-2 md:px-4 shrink-0 break-words whitespace-pre-wrap">{t.VOID_DESC}<br/><span className="text-xs text-red-400 font-bold mt-2 block break-words whitespace-pre-wrap">{t.VOID_WARN}</span></p>
                            <div className="bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col overflow-hidden flex-1 min-h-[200px]">
                                <div className="p-2 border-b border-slate-800 bg-slate-900 shrink-0"><span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{t.VOID_SELECT}</span></div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                                {player?.inventory.length === 0 ? <div className="text-center text-slate-600 text-xs italic py-10">{t.VOID_EMPTY}</div> : player?.inventory.map(item => (
                                    <div key={item.id} onClick={() => restoreVoidHex(item.id)} className={`flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border cursor-pointer group transition-all ${getRarityBorder(item.rarity)}`}>
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded bg-slate-950 flex items-center justify-center border border-slate-800 overflow-hidden shrink-0"><ItemIcon item={item} size="w-8 h-8 md:w-10 md:h-10" /></div>
                                        <div className="flex flex-col min-w-0 flex-1"><span className="text-xs font-bold text-white group-hover:text-red-200 truncate">{resolveItemText(item, language).name}</span><span className="text-[9px] text-slate-500 uppercase">{item.rarity}</span></div>
                                        <div className="px-2 py-1 md:px-3 md:py-1 bg-red-900/20 border border-red-900/50 rounded text-[9px] text-red-400 font-bold uppercase whitespace-nowrap group-hover:bg-red-900/40 transition-colors">{t.VOID_BTN_SACRIFICE}</div>
                                    </div>
                                ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            <MiniMonumentDialog isOpen={miniMonumentDialogState.isOpen} hint={miniMonumentDialogState.hint} onClose={closeMiniMonumentDialog} />
        </>
    );
};

export default React.memo(GameDialogs);
