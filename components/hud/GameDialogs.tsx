
import React, { useMemo, useState, useEffect } from 'react';
import { useGameStore } from '../../store';
import { TEXT } from '../../services/i18n';
import { CAMPAIGN_LEVELS } from '../../campaign/levels';
import { ITEM_REGISTRY, getItemDef } from '../../rules/items';
import { getCampaignMetric } from '../../campaign/getCampaignMetric';
import { LogOut, X, Trophy, ArrowRight, RotateCcw, Target, Crown, Zap, HelpCircle, AlertTriangle, CheckCircle, Trash2, BookOpen, Lock, FileText, RefreshCw, Terminal, Timer, Coins, Sparkles, Info, Cpu, ShieldAlert, Layers, Download, Activity } from 'lucide-react';
import { ItemIcon, resolveItemText, getRarityBorder } from './HudShared';
import { Item } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import Fireworks from '../Fireworks';
import { MiniMonumentDialog } from './MiniMonumentDialog';
import { LevelExitDialog } from './LevelExitDialog';
import { audioService } from '../../services/audioService';


const EMPTY_ARRAY: string[] = [];

const getLevelIndexFromId = (id?: string | null): number => {
    if (!id) return 1;
    const parts = id.split('.');
    if (parts.length === 2) {
        const series = parseInt(parts[0], 10);
        const offset = parseInt(parts[1], 10);
        if (!isNaN(series) && !isNaN(offset)) {
            return (series - 1) * 10 + offset;
        }
    }
    return 1;
};

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

const SlotMachineBox = ({ targetNumber, labelLevel }: { targetNumber: number; labelLevel: number }) => {
    const [displayNumber, setDisplayNumber] = useState(0);
    const [displayLevel, setDisplayLevel] = useState(0);
    const [isSpinning, setIsSpinning] = useState(true);

    useEffect(() => {
        let startTime: number, animationFrame: number;
        const duration = 2000;
        let lastUpdate = 0;
        
        const tick = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = timestamp - startTime;
            
            if (progress < duration) {
                if (timestamp - lastUpdate > 100) { // Update frequency for slot machine roll
                    setDisplayNumber(Math.floor(Math.random() * 30));
                    setDisplayLevel(Math.floor(Math.random() * 5));
                    lastUpdate = timestamp;
                }
                animationFrame = requestAnimationFrame(tick);
            } else {
                setDisplayNumber(targetNumber);
                setDisplayLevel(labelLevel);
                setIsSpinning(false);
            }
        };
        animationFrame = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(animationFrame);
    }, [targetNumber, labelLevel]);

    const getColors = (level: number) => {
        const colors = [
            { main: '#1e293b', edge: '#0f172a', text: '#94a3b8' }, // 0: Slate
            { main: '#047857', edge: '#064e3b', text: '#34d399' }, // 1: Emerald
            { main: '#1d4ed8', edge: '#1e3a8a', text: '#60a5fa' }, // 2: Blue
            { main: '#b45309', edge: '#78350f', text: '#fbbf24' }, // 3: Amber
            { main: '#7e22ce', edge: '#581c87', text: '#c084fc' }, // 4: Purple
        ];
        return colors[level % colors.length];
    };
    
    const theme = getColors(displayLevel);

    return (
        <div className="flex flex-col items-center justify-center bg-black/40 border border-emerald-500/20 p-2 sm:p-2.5 rounded-lg overflow-hidden relative">
            
            {/* The slot machine hex */}
            <div className={`relative flex items-center justify-center w-10 h-10 mb-1.5 transition-transform overflow-hidden`}>
                <AnimatePresence mode="popLayout">
                    <motion.div
                        key={`${displayLevel}-${displayNumber}`} // Key forces unmount/mount for animation
                        initial={{ y: -40, opacity: 0, filter: 'blur(2px)' }}
                        animate={{ y: 0, opacity: 1, filter: 'blur(0px)' }}
                        exit={{ y: 40, opacity: 0, filter: 'blur(2px)' }}
                        transition={{ duration: 0.1, ease: "linear" }}
                        className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                        <svg viewBox="0 0 40 46" className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                            <polygon points="20,0 38,10 38,36 20,46 2,36 2,10" fill={theme.edge} />
                            <polygon points="20,0 38,10 38,30 20,40 2,30 2,10" fill={theme.main} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
                            <polyline points="2,10 20,20 38,10" stroke="rgba(255,255,255,0.3)" strokeWidth="1" fill="none" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center pb-2">
                            <span 
                                className="text-sm font-black font-sans tracking-tighter" 
                                style={{ color: theme.text, filter: "drop-shadow(0px 1px 1px rgba(0,0,0,0.9))" }}
                            >
                                L{displayLevel}
                            </span>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
            
            {/* The Number */}
            <div className={`flex items-center gap-1 z-10 transition-colors ${isSpinning ? 'text-emerald-500/60' : 'text-emerald-400'}`}>
                <span className="text-lg sm:text-xl font-extrabold font-mono tabular-nums tracking-tighter mix-blend-screen drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
                    +{displayNumber}
                </span>
            </div>

            <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none" />
        </div>
    );
};

const GameDialogs: React.FC<GameDialogsProps> = ({ 
    activeModal, closeModal, helpTopic, closeHelp, inspectedItem, closeInspect, victoryStage, setVictoryStage
}) => {
    const sessionStatus = useGameStore(state => state.session?.gameStatus);
    const gameStatus = sessionStatus;
    const player = useGameStore(state => state.session?.player);
    const bots = useGameStore(state => state.session?.bots);
    const winCondition = useGameStore(state => state.session?.winCondition);
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
    
    const monumentDialogState = useGameStore(state => state.monumentDialogState);
    const [tutorialLoading, setTutorialLoading] = useState(false);
    
    // Monument/Void Specifics
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
    const session = useGameStore(state => state.session);
    const grid = useGameStore(state => state.session?.grid);
    const addCollectedHexes = useGameStore(state => state.addCollectedHexes);
    const addMinedHexes = useGameStore(state => state.addMinedHexes);

    const [selectedRewardItem, setSelectedRewardItem] = useState<import('../../types.ts').Item | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    const [rewardHexCells, setRewardHexCells] = useState<{id: number, revealedLevel: number | null, isClaimed: boolean}[]>([
        {id: 0, revealedLevel: null, isClaimed: false},
        {id: 1, revealedLevel: null, isClaimed: false},
        {id: 2, revealedLevel: null, isClaimed: false}
    ]);

    const [animatingCellId, setAnimatingCellId] = useState<number | null>(null);
    const [rouletteValue, setRouletteValue] = useState<number>(0);
    const [victoryRewards, setVictoryRewards] = useState<{
        l0: number;
        l1: number;
        l2: number;
        lvl0: number;
        lvl1: number;
        lvl2: number;
    } | null>(null);
    const [wasRewardPreviouslyClaimed, setWasRewardPreviouslyClaimed] = useState(false);

    const claimedLevelRewards = useGameStore(state => state.claimedLevelRewards || EMPTY_ARRAY);
    const claimLevelReward = useGameStore(state => state.claimLevelReward);

    useEffect(() => {
        if (gameStatus === 'VICTORY' && !victoryRewards) {
            if (session?.winCondition?.winType === 'SIEGE') {
                const completedNormalCount = claimedLevelRewards.filter(id => !id.startsWith('siege_completed_') && !id.startsWith('siege_pending_')).length;
                const currentBlock = Math.max(1, Math.floor((completedNormalCount - 1) / 5) + 1);
                const siegeId = `siege_completed_${currentBlock}`;
                const isAlreadyClaimed = claimedLevelRewards.includes(siegeId);
                
                setWasRewardPreviouslyClaimed(isAlreadyClaimed);
                setVictoryRewards({ l0: 15, l1: 10, l2: 5, lvl0: 1, lvl1: 2, lvl2: 3 });
                
                if (!isAlreadyClaimed) {
                    addCollectedHexes({ 1: 15, 2: 10, 3: 5 });
                    addMinedHexes({ 1: 15, 2: 10, 3: 5 });
                    claimLevelReward(siegeId);
                    
                    // Add 3 Skill Points (SP)
                    const currentSP = useGameStore.getState().skillPoints;
                    useGameStore.getState().setSkillPoints(currentSP + 3);
                    
                    useGameStore.getState().showToast(
                        language === 'RU' 
                            ? '🏆 ЯДРО ЗАЩИЩЕНО! Получено +3 SP и бонусные гексы!' 
                            : '🏆 CORE DEFENSE SURVIVED! Gained +3 SP and bonus hexes!', 
                        'success'
                    );
                }
            } else {
                const levelId = session?.activeLevelConfig?.id;
                const isAlreadyClaimed = levelId ? claimedLevelRewards.includes(levelId) : false;
                
                setWasRewardPreviouslyClaimed(isAlreadyClaimed);

                if (isAlreadyClaimed) {
                    setVictoryRewards({ l0: 0, l1: 0, l2: 0, lvl0: 0, lvl1: 1, lvl2: 2 });
                } else {
                    // Determine target level of current simulation config
                    const requiredShapes = session?.activeLevelConfig?.requiredShapes || [];
                    const T = requiredShapes[0]?.level || 1;

                    const lvl0 = Math.max(0, T - 1);
                    const lvl1 = Math.max(1, T);
                    const lvl2 = Math.min(10, T + 1);

                    const l0 = Math.floor(Math.random() * 11) + 5;
                    const l1 = Math.floor(Math.random() * 6) + 5;
                    const l2 = Math.floor(Math.random() * 5) + 1;
                    
                    setVictoryRewards({ l0, l1, l2, lvl0, lvl1, lvl2 });
                    addCollectedHexes({ [lvl0]: l0, [lvl1]: l1, [lvl2]: l2 });
                    addMinedHexes({ [lvl0]: l0, [lvl1]: l1, [lvl2]: l2 });
                    if (levelId) {
                        claimLevelReward(levelId);
                    }
                }
            }
        }
    }, [gameStatus, victoryRewards, addCollectedHexes, addMinedHexes, claimedLevelRewards, session?.activeLevelConfig, session?.winCondition?.winType, claimLevelReward, language]);

    useEffect(() => {
        if (gameStatus === 'BRIEFING') {
            setRewardHexCells([
                {id: 0, revealedLevel: null, isClaimed: false},
                {id: 1, revealedLevel: null, isClaimed: false},
                {id: 2, revealedLevel: null, isClaimed: false}
            ]);
            setVictoryRewards(null);
            setWasRewardPreviouslyClaimed(false);
        }
    }, [gameStatus]);

    const handleRevealHex = (id: number) => {
        if (rewardHexCells.find(c => c.id === id)?.revealedLevel !== null) return;
        if (animatingCellId !== null) return; // wait for current animation
        
        if (playUiSound) playUiSound('CLICK');
        
        const levelId = session?.activeLevelConfig?.id;
        const levelIndex = getLevelIndexFromId(levelId);
        const maxAllowed = Math.min(10, 2 + Math.floor(levelIndex / 20));

        const r = Math.random();
        let finalLevel = 10;
        if (r < 0.3) finalLevel = 0;
        else if (r < 0.5) finalLevel = 1;
        else if (r < 0.65) finalLevel = 2;
        else if (r < 0.77) finalLevel = 3;
        else if (r < 0.86) finalLevel = 4;
        else if (r < 0.92) finalLevel = 5;
        else if (r < 0.96) finalLevel = 6;
        else if (r < 0.985) finalLevel = 7;
        else if (r < 0.995) finalLevel = 8;
        else if (r < 0.999) finalLevel = 9;

        if (finalLevel > maxAllowed) {
            finalLevel = maxAllowed;
        }

        setAnimatingCellId(id);
        
        let counter = 0;
        const interval = setInterval(() => {
            setRouletteValue(Math.floor(Math.random() * (maxAllowed + 1)));
            counter++;
            if (counter > 20) {
                clearInterval(interval);
                setAnimatingCellId(null);
                setRewardHexCells(prev => prev.map(c => c.id === id ? { ...c, revealedLevel: finalLevel, isClaimed: true } : c));
                
                const countToGrant = finalLevel === 0 ? 20 
                                   : finalLevel === 1 ? 15 
                                   : finalLevel === 2 ? 12 
                                   : finalLevel === 3 ? 10 
                                   : finalLevel === 4 ? 8 
                                   : finalLevel === 5 ? 6 
                                   : 5;

                addCollectedHexes({ [finalLevel]: countToGrant });
                addMinedHexes({ [finalLevel]: countToGrant });
            }
        }, 50);
    };

    // --- LOGIC ---

    const handleNewGame = () => {
        playUiSound('CLICK');
        setShowResetConfirm(true);
    };

    const executeNewGame = () => {
        playUiSound('CLICK');
        resetProgress();
        setShowResetConfirm(false);
    };

    const handleNextLevel = () => {
        playUiSound('CLICK');
        
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
            if (activeLevelConfig.id === 'custom_editor_level') {
                startNewGame(undefined, activeLevelConfig);
            } else {
                startCampaignLevel(activeLevelConfig.id);
            }
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


    const entropy = useGameStore(state => state.session?.entropy);

    const campaignMetrics = useMemo(() => {
        return getCampaignMetric(activeLevelConfig, grid, player, session, language, entropy?.current);
    }, [grid, player, activeLevelConfig, language, entropy, session]);

    const rewardSlots = useMemo(() => {
        const isSiege = session?.winCondition?.winType === 'SIEGE';
        if (isSiege) {
            return [
                { level: 1, count: '15' },
                { level: 2, count: '10' },
                { level: 3, count: '5' }
            ];
        }
        
        const requiredShapes = session?.activeLevelConfig?.requiredShapes || [];
        const T = requiredShapes[0]?.level || winCondition?.targetLevel || player?.playerLevel || 1;
        
        const lvl0 = Math.max(0, T - 1);
        const lvl1 = Math.max(1, T);
        const lvl2 = Math.min(10, T + 1);
        
        return [
            { level: lvl0, count: '5-15' },
            { level: lvl1, count: '5-10' },
            { level: lvl2, count: '1-5' }
        ];
    }, [session?.activeLevelConfig, session?.winCondition?.winType, winCondition?.targetLevel, player?.playerLevel]);

    const getHexColorByLevel = (lvl: number) => {
        const colors = [
            { border: 'border-slate-500/30', text: 'text-slate-400', bg: 'bg-slate-950/40', bgGlow: 'from-slate-500/10 to-transparent', icon: 'text-slate-400' }, // L0
            { border: 'border-emerald-500/30', text: 'text-emerald-400', bg: 'bg-emerald-950/20', bgGlow: 'from-emerald-500/10 to-transparent', icon: 'text-emerald-400' }, // L1
            { border: 'border-blue-500/30', text: 'text-blue-400', bg: 'bg-blue-950/20', bgGlow: 'from-blue-500/10 to-transparent', icon: 'text-blue-400' }, // L2
            { border: 'border-amber-500/30', text: 'text-amber-400', bg: 'bg-amber-950/20', bgGlow: 'from-amber-500/10 to-transparent', icon: 'text-amber-400' }, // L3
            { border: 'border-purple-500/30', text: 'text-purple-400', bg: 'bg-purple-950/20', bgGlow: 'from-purple-500/10 to-transparent', icon: 'text-purple-400' }, // L4
        ];
        return colors[lvl % colors.length];
    };

    const availableInventory = player?.inventory.filter(i => !monumentDialogState.slots.some(s => s?.id === i.id)) || [];
    const isMonumentReady = monumentDialogState.slots.every(s => s !== null);

    // --- RENDER ---

    return (
        <>
            {/* NEW IMMERSIVE VICTORY SEQUENCE */}
            {gameStatus === 'VICTORY' && (
                <Fireworks
                    isActive={gameStatus === 'VICTORY'}
                    levelId={activeLevelConfig?.id}
                    score={(() => {
                        const baseScore = 15000;
                        const timePenalty = currentTurn * 10;
                        const actionsPenalty = (player?.actionsTaken || 0) * 50;
                        const resourcesBonus = (player?.playerLevel || 0) * 500 + (player?.totalCoinsEarned || 0) * 2;
                        return Math.max(0, baseScore - timePenalty - actionsPenalty + resourcesBonus);
                    })()}
                    onRetry={handleRetry}
                    onNext={handleNextLevel}
                    onMenu={handleMenu}
                />
            )}

            {/* EXIT CONFIRMATION */}
            <LevelExitDialog
                isOpen={activeModal === 'EXIT'}
                onClose={closeModal}
                onConfirm={handleMenu}
                mode="GAME"
                language={language}
                playUiSound={playUiSound}
            />

            {/* RESTART CONFIRMATION */}
            <AnimatePresence>
                {activeModal === 'RESTART' && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && (
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
                            className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-6 md:p-8 w-[92vw] max-w-md text-center relative overflow-hidden group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Cyber Corner Brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-amber-500/50 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-amber-500/50 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-amber-500/50 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-amber-500/50 pointer-events-none" />

                            {/* Glowing top accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600/30 via-amber-500/60 to-amber-600/30 pointer-events-none" />
                            <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-lg shadow-amber-900/30">
                                <RotateCcw className="w-7 h-7 text-amber-500" />
                            </div>
                            <h3 className="text-xl font-extrabold text-slate-100 uppercase mb-2 tracking-wider break-words whitespace-pre-wrap">{t.BTN_RETRY}?</h3>
                            <p className="text-sm text-slate-300 mb-6 leading-relaxed px-2 break-words whitespace-pre-wrap">{language === 'RU' ? 'Начать уровень заново? Текущий прогресс будет потерян.' : 'Restart the level? Current progress will be lost.'}</p>
                            <div className="flex flex-col gap-3">
                                <button onClick={() => { handleRetry(); closeModal(); playUiSound('CLICK'); }} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-extrabold uppercase tracking-wider text-xs shadow-lg shadow-emerald-500/20 cursor-pointer active:scale-95 transition-all">{t.BTN_CONFIRM}</button>
                                <button 
                                    onClick={() => { handleNewGame(); closeModal(); }} 
                                    className="w-full py-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 font-bold uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
                                >
                                    <RefreshCw className="w-4 h-4 animate-[spin_20s_linear_infinite]" />
                                    {language === 'RU' ? 'Новая Игра (Сброс)' : 'New Game (Reset)'}
                                </button>
                                <button onClick={() => { closeModal(); playUiSound('CLICK'); }} className="w-full py-2.5 rounded-xl bg-slate-900/80 border border-slate-700/60 hover:bg-slate-800 text-slate-200 font-bold uppercase tracking-wider text-[10px] transition-colors cursor-pointer">{t.BTN_CANCEL}</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

{/* MISSION BRIEFING / DETAILS */}
<AnimatePresence>
    {activeModal === 'MISSION' && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 pointer-events-auto">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeModal}
                className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div 
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: "spring", duration: 0.4 }}
                className="relative bg-slate-950/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[94vw] max-w-2xl sm:max-w-3xl h-[82vh] sm:h-[86vh] max-h-[92vh] my-auto flex flex-col overflow-hidden group"
                onClick={e => e.stopPropagation()}
            >
                {/* Ambient Effects */}
                <div className="absolute inset-0 bg-scanlines opacity-5 pointer-events-none z-10" />
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600/40 to-purple-600/40 pointer-events-none z-20" />
                <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                {/* Compact Header */}
                <div className="bg-slate-900/60 backdrop-blur-sm border-b border-slate-800/80 p-2.5 sm:p-3.5 flex items-center justify-between z-20 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shrink-0">
                            <Terminal className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-[7.5px] sm:text-[8px] font-extrabold uppercase tracking-[0.2em] text-indigo-400/80 leading-none font-mono">
                                {language === 'RU' ? 'ПРОТОКОЛ ИНИЦИАЛИЗАЦИИ' : 'MISSION_PROTOCOL_INIT'}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-xs sm:text-sm font-extrabold text-slate-100 uppercase tracking-wider truncate">
                                    {language === 'RU' ? 'ПРОФИЛЬ СИМУЛЯЦИИ' : 'SIMULATION PROFILE'}
                                </span>
                                {bots && bots.length > 0 && (
                                    <span className="text-[7px] px-1.5 py-0.5 bg-red-950/80 border border-red-500/30 rounded font-black text-red-400 uppercase tracking-widest leading-none shrink-0">
                                        VS {t.BRIEFING_RIVAL}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => { closeModal(); playUiSound('CLICK'); }} className="text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all cursor-pointer shrink-0">
                        <X className="w-4 h-4"/>
                    </button>
                </div>

                {/* Dashboard Content */}
                <div className="flex-1 flex flex-col p-2.5 sm:p-3 gap-2 sm:gap-2.5 z-20 overflow-y-auto no-scrollbar min-h-0">
                    
                    {/* 1. Briefing Description (Compact) */}
                    <div className="bg-slate-900/50 border border-indigo-500/20 p-2.5 rounded-xl flex flex-col gap-1 relative overflow-hidden shrink-0">
                        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/80 shadow-[0_0_12px_rgba(99,102,241,0.8)]" />
                        <h2 className="text-xs sm:text-sm font-black text-white tracking-wide uppercase font-sans leading-tight pl-1 truncate">
                            {session?.defense?.isDefenseMode ? (language === 'RU' ? '🚨 ПРОТОКОЛ: ОБОРОНА ЯДРА' : '🚨 PROTOCOL: CORE DEFENSE') : (activeLevelConfig?.title || (language === 'RU' ? 'Свободный Сектор' : 'Custom Sector'))}
                        </h2>
                        <p className="text-[10px] sm:text-xs text-indigo-100/80 leading-snug font-sans font-medium pl-1 line-clamp-2">
                            {session?.defense?.isDefenseMode ? (language === 'RU' ? 'Защитите Центральное Ядро (0,0) от волн дронов. Стройте турели на высоте!' : 'Defend the Central Core (0,0) from drone waves. Build turrets on high ground!') : (activeLevelConfig?.description || (language === 'RU' ? 'Пользовательская симуляция.' : 'Standard simulation protocol.'))}
                        </p>
                    </div>

                    {/* 2. Core Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5 flex-1 min-h-0">
                        
                        {/* Col A: Stats & Win Condition */}
                        <div className="flex flex-col gap-2 min-h-0">
                            {/* Mini Stats Array */}
                            <div className="grid grid-cols-4 gap-1 sm:gap-1.5 shrink-0">
                                <div className="bg-black/40 border border-slate-800/60 p-1 sm:p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5">
                                    <Timer className="w-3 h-3 text-sky-400" />
                                    <span className="text-[7.5px] sm:text-[8px] text-slate-500 uppercase font-black">Moves</span>
                                    <span className="text-[10px] sm:text-[11px] font-black text-sky-300 font-mono leading-none">{activeLevelConfig?.startState.moves ?? winCondition?.queueSize ?? 0}</span>
                                </div>
                                <div className="bg-black/40 border border-slate-800/60 p-1 sm:p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5">
                                    <Coins className="w-3 h-3 text-amber-400" />
                                    <span className="text-[7.5px] sm:text-[8px] text-slate-500 uppercase font-black">Credits</span>
                                    <span className="text-[10px] sm:text-[11px] font-black text-amber-300 font-mono leading-none">{activeLevelConfig?.startState.credits ?? 0}</span>
                                </div>
                                <div className="bg-black/40 border border-slate-800/60 p-1 sm:p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5">
                                    <Layers className="w-3 h-3 text-emerald-400" />
                                    <span className="text-[7.5px] sm:text-[8px] text-slate-500 uppercase font-black">Mats</span>
                                    <span className="text-[10px] sm:text-[11px] font-black text-emerald-300 font-mono leading-none">{activeLevelConfig?.startState.materials ?? 5}</span>
                                </div>
                                <div className="bg-black/40 border border-slate-800/60 p-1 sm:p-1.5 rounded-lg flex flex-col items-center justify-center gap-0.5">
                                    <Crown className="w-3 h-3 text-indigo-400" />
                                    <span className="text-[7.5px] sm:text-[8px] text-slate-500 uppercase font-black">Limit</span>
                                    <span className="text-[10px] sm:text-[11px] font-black text-indigo-300 font-mono leading-none">{activeLevelConfig?.startState.rank ?? 5}</span>
                                </div>
                            </div>

                            {/* Win Condition Matrix */}
                            <div className="bg-amber-950/20 border border-amber-500/20 p-2 sm:p-2.5 rounded-lg flex-1 flex flex-col gap-1 sm:gap-1.5 min-h-0 justify-center">
                                <span className="text-[8px] uppercase font-black tracking-widest text-amber-500 font-mono flex items-center gap-1 shrink-0">
                                    <Target className="w-3 h-3" /> {language === 'RU' ? 'МАТРИЦА УСПЕХА' : 'WIN CONDITION'}
                                </span>
                                
                                {/* Win Logic - Compact */}
                                <div className="bg-black/40 p-1.5 sm:p-2 rounded-md border border-amber-900/40 flex flex-col gap-1">
                                    {activeLevelConfig && campaignMetrics ? (
                                        <>
                                            <div className="flex justify-between items-center text-[9.5px] font-mono font-bold">
                                                <span className="text-slate-400 uppercase truncate pr-2">{campaignMetrics.label}</span>
                                                <span className={campaignMetrics.current >= campaignMetrics.target ? "text-emerald-400" : "text-amber-500"}>
                                                    {campaignMetrics.current} / {campaignMetrics.target}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full transition-all duration-500 ${campaignMetrics.current >= campaignMetrics.target ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`}
                                                    style={{ width: `${Math.min(100, (campaignMetrics.current / campaignMetrics.target) * 100)}%` }}
                                                />
                                            </div>
                                        </>
                                    ) : winCondition && player ? (
                                        <>
                                            <div className="flex justify-between items-center text-[9.5px] font-mono font-bold">
                                                <span className="text-slate-400 uppercase flex items-center gap-1"><Crown className="w-2.5 h-2.5 text-indigo-400" /> Rank</span>
                                                <span className={player.playerLevel >= winCondition.targetLevel ? "text-emerald-400" : "text-amber-500"}>
                                                    {player.playerLevel} / {winCondition.targetLevel}
                                                </span>
                                            </div>
                                            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                <div 
                                                    className={`h-full rounded-full ${player.playerLevel >= winCondition.targetLevel ? 'bg-emerald-500' : 'bg-amber-500'}`}
                                                    style={{ width: `${Math.min(100, (player.playerLevel / winCondition.targetLevel) * 100)}%` }}
                                                />
                                            </div>
                                            {winCondition.targetCoins > 0 && (
                                                <div className="flex justify-between items-center text-[9.5px] font-mono font-bold mt-0.5">
                                                    <span className="text-slate-400 uppercase flex items-center gap-1"><Coins className="w-2.5 h-2.5 text-amber-400" /> Credits</span>
                                                    <span className={player.coins >= winCondition.targetCoins ? "text-emerald-400" : "text-amber-500"}>
                                                        {player.coins} / {winCondition.targetCoins}
                                                    </span>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-[9.5px] text-slate-500 italic text-center py-1">No objectives assigned.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Col B: AI Threat & Loss Conditions */}
                        <div className="flex flex-col gap-2 min-h-0">
                            
                            {/* AI Threat (if active) */}
                            {((activeLevelConfig?.aiMode && activeLevelConfig.aiMode !== 'none') || session?.defense?.isDefenseMode) && (
                                <div className="bg-red-950/15 border border-red-500/20 p-2 sm:p-2.5 rounded-lg flex flex-col gap-1 relative overflow-hidden shrink-0">
                                    <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 blur-2xl rounded-full pointer-events-none animate-pulse" />
                                    <span className="text-[8px] uppercase font-black tracking-widest text-red-400 font-mono flex items-center gap-1.5">
                                        <span className="relative flex h-1.5 w-1.5">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                                        </span>
                                        {language === 'RU' ? 'АКТИВНА ИИ-УГРОЗА' : 'AI THREAT ACTIVE'}
                                    </span>
                                    <div className="flex items-center gap-2 bg-black/45 px-2 py-1 rounded border border-red-950/80">
                                        <Cpu className="w-3.5 h-3.5 text-red-400 shrink-0 animate-[spin_12s_linear_infinite]" />
                                        <div className="flex flex-col min-w-0">
                                            <span className="text-[6.5px] font-black text-red-400 uppercase leading-none">{language === 'RU' ? 'ПРОФИЛЬ ДРОНА' : 'DRONE PROFILE'}</span>
                                            <span className="text-[9px] sm:text-[10px] font-black text-white uppercase tracking-wider mt-0.5 truncate">
                                                {session?.defense?.isDefenseMode ? (language === 'RU' ? 'ОРДА ДИВЕРСАНТОВ' : 'SABOTEUR SWARM') : activeLevelConfig?.botObjective ? (language === 'RU' ? 'СОПЕРНИК-ИСКИНА' : 'RIVAL AGENT') : (language === 'RU' ? 'БАЗОВОЕ БУРЕНИЕ' : 'STANDARD EXCAVATION')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Loss Conditions (Compact Tags) */}
                            <div className="bg-rose-950/10 border border-rose-500/10 p-2 sm:p-2.5 rounded-lg flex-1 flex flex-col gap-1 min-h-0 justify-center">
                                <span className="text-[8px] uppercase font-black tracking-widest text-rose-500 font-mono flex items-center gap-1 shrink-0 mb-0.5">
                                    <ShieldAlert className="w-3 h-3" /> {language === 'RU' ? 'УСЛОВИЯ СБОЯ' : 'LOSS CONDITIONS'}
                                </span>
                                <div className="flex flex-col gap-1 text-[8.5px] font-mono">
                                    <div className="flex items-center gap-1.5 bg-rose-950/20 border border-rose-500/10 px-2 py-0.5 rounded text-rose-300/90">
                                        <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">{language === 'RU' ? 'Ранг 0 или Падение в Бездну' : 'Rank 0 or Hex Void'}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 bg-rose-950/20 border border-rose-500/10 px-2 py-0.5 rounded text-rose-300/90">
                                        <Timer className="w-2.5 h-2.5 shrink-0" />
                                        <span className="truncate">{language === 'RU' ? 'Бездействие 5 мин (Метеориты)' : '5 Min Idle (Meteors)'}</span>
                                    </div>
                                    {activeLevelConfig?.botObjective === 'MONUMENT_RACE' && (
                                        <div className="flex items-center gap-1.5 bg-rose-950/20 border border-rose-500/10 px-2 py-0.5 rounded text-rose-300/90">
                                            <Crown className="w-2.5 h-2.5 shrink-0" />
                                            <span className="truncate">{language === 'RU' ? 'Бот активировал Монумент' : 'Bot Activated Monument'}</span>
                                        </div>
                                    )}
                                    {session?.defense?.isDefenseMode && (
                                        <div className="flex items-center gap-1.5 bg-rose-950/20 border border-rose-500/10 px-2 py-0.5 rounded text-rose-300/90">
                                            <ShieldAlert className="w-2.5 h-2.5 shrink-0" />
                                            <span className="truncate">{language === 'RU' ? 'Прочность Ядра 0%' : 'Core HP 0%'}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer / Deploy Button */}
                <div className="p-2 sm:p-2.5 bg-slate-900/90 border-t border-indigo-500/20 z-20 shrink-0">
                    <motion.button 
                        whileHover={{ scale: 1.01, filter: "brightness(1.1)" }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => {
                            closeModal();
                        }} 
                        className="group/btn relative flex w-full flex-col items-center justify-center py-2.5 sm:py-3 bg-emerald-600 border border-emerald-400 hover:bg-emerald-500 text-white rounded-lg shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] transition-all cursor-pointer overflow-hidden font-mono"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none" />
                        <div className="relative z-10 flex items-center justify-center gap-2 text-white font-black uppercase tracking-[0.2em] text-xs sm:text-sm">
                            <span>{t.BTN_READY}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-white transition-transform group-hover/btn:translate-x-1" />
                        </div>
                    </motion.button>
                </div>
            </motion.div>
        </div>
    )}
            </AnimatePresence>

            {/* RANKINGS */}
            <AnimatePresence>
                {activeModal === 'RANKINGS' && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && (
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
                            className="bg-slate-950/45 backdrop-blur-xl border border-amber-500/25 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] w-[92vw] max-w-[350px] md:max-w-md max-h-[85vh] flex flex-col overflow-hidden relative group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Cyber Corner Brackets */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-amber-500/50 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-amber-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-amber-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-amber-500/50 z-30 pointer-events-none" />

                            {/* Glowing top accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600/30 via-amber-500/60 to-amber-600/30 pointer-events-none" />

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
                                <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 active:scale-95 cursor-pointer flex items-center justify-center translate-x-1"><X className="w-5 h-5" /></button>
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

            {/* AI MONITOR */}
            <AnimatePresence>
                {activeModal === 'AI_MONITOR' && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && (
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
                            className="bg-slate-950/45 backdrop-blur-xl border border-indigo-500/25 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.15)] w-[94vw] max-w-2xl h-[85vh] md:h-[90vh] flex flex-col overflow-hidden relative group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Cyber Corner Brackets */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-indigo-500/50 z-30 pointer-events-none" />

                            {/* Glowing top accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600/30 via-indigo-500/60 to-indigo-600/30 pointer-events-none" />

                            {/* Scanline effect */}
                            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                            
                            <div className="p-4 border-b border-indigo-500/30 flex items-center justify-between bg-indigo-950/20 z-20 shrink-0">
                                <div className="flex items-center gap-3">
                                    <div className="p-1.5 bg-indigo-500/20 rounded border border-indigo-500/30">
                                        <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/60 leading-none">NEXUS COGNITIVE OVERLAY</span>
                                        <span className="text-xs font-bold text-white uppercase tracking-widest truncate">{language === 'RU' ? 'ИИ Монитор Небьюла' : 'AI Monitor & Telemetry'}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const timestamp = new Date().toISOString();
                                            const mode = session?.defense?.isDefenseMode ? 'Core Siege Mode' : (session?.activeLevelConfig?.id ? `Level ${session.activeLevelConfig.id}` : 'Skirmish Battle Mode');
                                            const turn = session?.currentTurn || 0;
                                            const botList = bots || [];
                                            const botLogs = session?.botActivityLog || [];

                                            let content = `==================================================\n`;
                                            content += `HEXQUEST ECONOMY - AI MONITOR & TELEMETRY REPORT\n`;
                                            content += `Export Timestamp: ${timestamp}\n`;
                                            content += `Game Mode: ${mode} | Turn: ${turn}\n`;
                                            content += `Core Health: ${session?.defense?.coreHealth ?? 100}% | Stability: ${session?.entropy?.current ?? 0}%\n`;
                                            content += `Active AI Vectors (${botList.length}):\n`;
                                            botList.forEach((bot: any, idx: number) => {
                                                content += `  Vector #${idx + 1} [${bot.id}]: Role=${bot.memory?.botRole || bot.state} Pos=(q:${bot.q}, r:${bot.r}) Plan=${bot.memory?.plan?.label || 'IDLE'}\n`;
                                            });
                                            content += `==================================================\n\n`;
                                            content += `--- AI COGNITIVE AUDIT LOG (${botLogs.length} entries) ---\n\n`;
                                            if (botLogs.length > 0) {
                                                [...botLogs].reverse().forEach((log: any) => {
                                                    content += `[${new Date(log.timestamp).toISOString()}] [${log.type}] ${log.text}\n`;
                                                });
                                            } else {
                                                content += `No bot cognitive logs recorded.\n`;
                                            }

                                            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
                                            const url = URL.createObjectURL(blob);
                                            const link = document.createElement('a');
                                            link.href = url;
                                            link.download = `hexquest_ai_telemetry_${Date.now()}.txt`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                            URL.revokeObjectURL(url);
                                        }}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600/30 hover:bg-indigo-500/50 border border-indigo-500/50 rounded-lg text-indigo-300 hover:text-white text-[10px] font-bold uppercase transition-all cursor-pointer shadow-md active:scale-95"
                                        title={language === 'RU' ? 'Экспорт телеметрии ИИ в .txt' : 'Export AI telemetry report'}
                                    >
                                        <Download className="w-3.5 h-3.5" />
                                        <span>{language === 'RU' ? 'Экспорт .TXT' : 'Export .TXT'}</span>
                                    </button>
                                    <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 active:scale-95 cursor-pointer flex items-center justify-center translate-x-1"><X className="w-5 h-5" /></button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-4 bg-slate-950/40 z-20 custom-scrollbar">
                                {/* Summary KPIs */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 flex flex-col gap-1">
                                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                                            {language === 'RU' ? 'Активные Боты' : 'Active Vectors'}
                                        </span>
                                        <span className="text-xl font-black font-mono text-white">
                                            {bots?.length || 0}
                                        </span>
                                    </div>
                                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 flex flex-col gap-1">
                                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                                            {language === 'RU' ? 'Здоровье Ядра' : 'Core Health'}
                                        </span>
                                        <span className={`text-xl font-black font-mono ${(session?.defense?.coreHealth ?? 100) < 30 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                                            {session?.defense?.coreHealth ?? 100}%
                                        </span>
                                    </div>
                                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 flex flex-col gap-1">
                                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                                            {language === 'RU' ? 'Энтропия Сетки' : 'System Entropy'}
                                        </span>
                                        <span className="text-xl font-black font-mono text-amber-400">
                                            {Math.round(session?.entropy?.current || 0)}%
                                        </span>
                                    </div>
                                    <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 flex flex-col gap-1">
                                        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-mono">
                                            {language === 'RU' ? 'Записи ИИ' : 'Audit Logs'}
                                        </span>
                                        <span className="text-xl font-black font-mono text-indigo-400">
                                            {session?.botActivityLog?.length || 0}
                                        </span>
                                    </div>
                                </div>

                                {/* Active Vectors Heap Section */}
                                <div className="space-y-2.5">
                                    <h4 className="text-[10px] font-black tracking-widest font-mono text-slate-400 uppercase flex items-center gap-1.5">
                                        <Activity className="w-3.5 h-3.5 text-indigo-400" />
                                        {language === 'RU' ? 'Активные Векторы ИИ (Автономные Боты)' : 'Active AI Vector Heap'}
                                    </h4>

                                    {(!bots || bots.length === 0) ? (
                                        <div className="p-6 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800/80 rounded-xl">
                                            {language === 'RU' ? 'Активные враждебные боты в симуляции не обнаружены.' : 'No active hostile bots detected in simulation.'}
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                            {bots.map((bot: any) => {
                                                const hasPlan = bot.memory?.plan && bot.memory.plan.steps.length > 0;
                                                const currentLevel = session?.grid?.[`${bot.q},${bot.r}`]?.currentLevel ?? 0;
                                                return (
                                                    <div 
                                                        key={bot.id}
                                                        className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl flex flex-col gap-2 relative overflow-hidden group"
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div 
                                                                    className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                                                                    style={{ backgroundColor: bot.avatarColor || '#6366f1' }}
                                                                />
                                                                <span className="text-xs font-bold font-mono text-white">
                                                                    Vector #{bot.id.slice(-4).toUpperCase()}
                                                                </span>
                                                            </div>
                                                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
                                                                {bot.memory?.botRole || 'SIEGE_GRINDER'}
                                                            </span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-400 bg-slate-950/50 p-2 rounded-lg border border-slate-900">
                                                            <div>POS: <span className="text-white font-bold">({bot.q}, {bot.r})</span></div>
                                                            <div>ELEV: <span className="text-emerald-400 font-bold">L{currentLevel}</span></div>
                                                            <div>MOVES: <span className="text-blue-400 font-bold">{bot.moves}</span></div>
                                                        </div>
                                                        <div className="flex items-center justify-between text-[10px] font-mono">
                                                            <span className="text-slate-500">PLAN: <span className="text-amber-400 font-semibold">{bot.memory?.plan?.label || 'IDLE'}</span></span>
                                                            <span className={(bot.memory?.stuckCounter ?? 0) > 0 ? 'text-rose-400 font-bold' : (bot.memory?.waitStreak ?? 0) > 0 ? 'text-amber-400 font-bold' : hasPlan ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                                                                {(bot.memory?.stuckCounter ?? 0) > 0 ? `STUCK (${bot.memory.stuckCounter})` : (bot.memory?.waitStreak ?? 0) > 0 ? `WAIT (${bot.memory.waitStreak})` : hasPlan ? 'ACTIVE' : 'STALLED'}
                                                            </span>
                                                        </div>
                                                        <div className="text-[10px] font-mono text-indigo-300/90 bg-indigo-950/40 px-2 py-1 rounded border border-indigo-500/20 truncate">
                                                            <span className="text-slate-500 mr-1">&gt;</span>
                                                            {bot.memory?.lastDebug || 'Active'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Cognitive Audit Logs Section */}
                                <div className="space-y-2.5 pt-2">
                                    <h4 className="text-[10px] font-black tracking-widest font-mono text-slate-400 uppercase flex items-center gap-1.5">
                                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                                        {language === 'RU' ? 'Журнал Когнитивных Собствий ИИ' : 'Cognitive Audit Stream'}
                                    </h4>

                                    <div className="space-y-1.5">
                                        {session?.botActivityLog && session.botActivityLog.length > 0 ? (
                                            session.botActivityLog.map((log: any, idx: number) => {
                                                const type = log.type || (log.action === 'WAIT' ? 'WARN' : 'INFO');
                                                const typeColor = type === 'ERROR' ? 'text-rose-400 border-rose-500/30 bg-rose-950/20' : type === 'WARN' ? 'text-amber-400 border-amber-500/30 bg-amber-950/20' : 'text-indigo-300 border-slate-800/80 bg-slate-900/30';
                                                const logText = log.text || `Vector #${(log.botId || '').slice(-4).toUpperCase()} [${log.action || 'WAIT'}] ${log.target ? `@ ${log.target}` : ''} | Reason: ${log.reason || 'OK'}`;
                                                return (
                                                    <div key={log.id || `${log.botId}-${idx}`} className={`p-2.5 rounded-lg border font-mono text-[11px] flex flex-col gap-1 ${typeColor}`}>
                                                        <div className="flex items-center justify-between opacity-75 text-[9px]">
                                                            <span className="font-bold uppercase">[{type}]</span>
                                                            <span>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                                        </div>
                                                        <p className="text-slate-200 break-words leading-relaxed">
                                                            <span className="text-slate-500 mr-2">&gt;</span>
                                                            {logText}
                                                        </p>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="p-8 text-center text-slate-500 text-xs font-mono border border-dashed border-slate-850 rounded-xl">
                                                {language === 'RU' ? 'Журнал когнитивных событий пуст.' : 'No cognitive audit entries recorded.'}
                                            </div>
                                        )}
                                    </div>
                                </div>
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
                {activeModal === 'CODEX' && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && (
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
                            className="bg-slate-950/45 backdrop-blur-xl border border-purple-500/25 rounded-2xl shadow-[0_0_50px_rgba(168,85,247,0.15)] w-[94vw] max-w-3xl h-[80vh] md:h-[85vh] flex flex-col overflow-hidden relative group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Cyber Corner Brackets */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-purple-500/50 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-purple-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-purple-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-purple-500/50 z-30 pointer-events-none" />

                            {/* Glowing top accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-600/30 via-purple-500/60 to-purple-600/30 pointer-events-none" />

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
                                <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 active:scale-95 cursor-pointer flex items-center justify-center translate-x-1"><X className="w-5 h-5" /></button>
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
                {helpTopic && helpData && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && (
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
                            className="bg-slate-950/45 backdrop-blur-xl border border-indigo-500/25 p-5 md:p-8 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.15)] w-[92vw] max-w-[350px] md:max-w-sm max-h-[90vh] overflow-y-auto relative group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Cyber Corner Brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-indigo-500/50 z-30 pointer-events-none" />

                            {/* Glowing top accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600/30 via-indigo-500/60 to-indigo-600/30 pointer-events-none" />

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
                {inspectedItem && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && (
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
                            className="bg-slate-950/45 backdrop-blur-xl border border-slate-800/30 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.15)] w-[92vw] max-w-[350px] md:max-w-sm max-h-[92vh] overflow-y-auto relative flex flex-col gap-4 p-4 md:p-8 group"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Cyber Corner Brackets */}
                            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-indigo-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-indigo-500/50 z-30 pointer-events-none" />

                            {/* Glowing top accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600/30 via-indigo-500/60 to-indigo-600/30 pointer-events-none" />

                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-indigo-700" />
                            <button onClick={closeInspect} className="absolute top-1 right-1 w-11 h-11 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 active:scale-95 transition-all rounded-full cursor-pointer z-30"><X className="w-5 h-5"/></button>
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
            <AnimatePresence>
                {gameStatus === 'DEFEAT' && (
                    <div className="absolute inset-0 z-[250] flex items-center justify-center pointer-events-auto p-3 sm:p-6 md:p-8">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md pointer-events-none"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 25, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 25, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 25 }}
                            className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] w-[96vw] max-w-4xl flex flex-col relative z-10 max-h-[96vh] overflow-y-auto no-scrollbar py-2 md:py-6 px-2 sm:px-6 md:px-8 group leading-tight"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Glowing top accent */}
                            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gameStatus === 'VICTORY' ? 'from-emerald-600/30 via-emerald-500/60 to-emerald-600/30' : 'from-red-600/30 via-red-500/60 to-red-600/30'} pointer-events-none z-30`} />

                            {/* Corner brackets */}
                            <div className={`absolute top-0 left-0 w-3 h-3 md:w-5 md:h-5 border-t border-l z-30 pointer-events-none ${gameStatus === 'VICTORY' ? 'border-emerald-500/60' : 'border-red-500/60'}`} />
                            <div className={`absolute top-0 right-0 w-3 h-3 md:w-5 md:h-5 border-t border-r z-30 pointer-events-none ${gameStatus === 'VICTORY' ? 'border-emerald-500/60' : 'border-red-500/60'}`} />
                            <div className={`absolute bottom-0 left-0 w-3 h-3 md:w-5 md:h-5 border-b border-l z-30 pointer-events-none ${gameStatus === 'VICTORY' ? 'border-emerald-500/60' : 'border-red-500/60'}`} />
                            <div className={`absolute bottom-0 right-0 w-3 h-3 md:w-5 md:h-5 border-b border-r z-30 pointer-events-none ${gameStatus === 'VICTORY' ? 'border-emerald-500/60' : 'border-red-500/60'}`} />

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
                                        
                                        {/* COLUMN 2: Finalized Simulation Results */}
                                        <div className="md:col-span-5 lg:col-span-5 flex flex-col gap-2.5 md:gap-3.5 h-full justify-between text-left">
                                            {gameStatus === 'VICTORY' ? (
                                                <div className="flex flex-col gap-2 md:gap-3 flex-1">
                                                    {/* Title */}
                                                    <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                                                        <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                                                        <span className="text-xs font-black uppercase text-slate-200 tracking-wider font-mono">
                                                            {language === 'RU' ? 'РЕЗУЛЬТАТЫ СИМУЛЯЦИИ' : 'SIMULATION RESULTS'}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-col gap-2 mt-1 px-1">
                                                        <span className="text-xs font-bold text-slate-300">
                                                            {language === 'RU' ? 'Награда за завершение' : 'Completion Reward'}
                                                        </span>
                                                        {wasRewardPreviouslyClaimed ? (
                                                            <div className="text-[10px] text-amber-500/80 italic font-mono mb-2">
                                                                {language === 'RU' ? 'Награда за этот уровень уже получена ранее.' : 'Reward for this level has already been claimed.'}
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-3 gap-2">
                                                                <SlotMachineBox targetNumber={victoryRewards?.l0 || 0} labelLevel={victoryRewards?.lvl0 ?? 0} />
                                                                <SlotMachineBox targetNumber={victoryRewards?.l1 || 0} labelLevel={victoryRewards?.lvl1 ?? 1} />
                                                                <SlotMachineBox targetNumber={victoryRewards?.l2 || 0} labelLevel={victoryRewards?.lvl2 ?? 2} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-3 flex-1 justify-center">
                                                    <div className="bg-red-950/20 border border-red-500/25 p-4 rounded-xl flex flex-col justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
                                                        <div className="flex items-center gap-1.5 mb-2.5 shrink-0 text-red-400 font-extrabold uppercase tracking-widest text-[9.5px]">
                                                            <AlertTriangle className="w-4 h-4 text-red-400" />
                                                            <span>{language === 'RU' ? 'СВЯЗЬ РАЗОРВАНА (КРАХ)' : 'FAULT REPORT (FAILED)'}</span>
                                                        </div>
                                                        <p className="text-red-200/60 text-xs font-sans leading-relaxed">
                                                            {language === 'RU' ? 'Ядро перегружено. Квантовая связь разорвана из-за критической энтропии. Награды утеряны.' : 'Core connection terminated. Link disrupted due to excessive system entropy. No rewards secured.'}
                                                        </p>
                                                    </div>
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

                                {campaignMode === 'LEVELS' && !wasRewardPreviouslyClaimed && (
                                    <div className="bg-slate-900/20 border border-slate-900 p-2 rounded-xl mb-1.5 md:mb-4 shrink-0 mt-0.5">
                                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-900/80">
                                            <h3 className="text-emerald-400 font-extrabold uppercase tracking-wider text-[9px] md:text-xs">
                                                {language === 'RU' ? 'Получены новые гексы' : 'New Hexes Acquired'}
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            {rewardHexCells.map(cell => (
                                                <button 
                                                    key={cell.id} 
                                                    onClick={() => handleRevealHex(cell.id)}
                                                    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border transition-all duration-300 ${cell.isClaimed ? 'bg-emerald-950/40 border-emerald-500/50 scale-100' : 'bg-slate-950/60 border-slate-700/50 hover:bg-slate-900/80 hover:scale-[1.02] cursor-pointer'}`}
                                                >
                                                    {cell.isClaimed ? (
                                                        <>
                                                            <div className="w-10 h-10 rounded bg-emerald-900/50 border border-emerald-500/50 flex items-center justify-center text-emerald-400 font-black font-mono text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                                                L{cell.revealedLevel}
                                                            </div>
                                                            <span className="text-[8px] sm:text-[9px] font-bold text-emerald-400 mt-2 uppercase tracking-wide">
                                                                +{cell.revealedLevel === 0 ? 20 : cell.revealedLevel === 1 ? 15 : cell.revealedLevel === 2 ? 12 : cell.revealedLevel === 3 ? 10 : cell.revealedLevel === 4 ? 8 : cell.revealedLevel === 5 ? 6 : 5} {language === 'RU' ? 'шт!' : 'qty!'}
                                                            </span>
                                                        </>
                                                    ) : animatingCellId === cell.id ? (
                                                        <>
                                                            <div className="w-10 h-10 rounded bg-blue-900/50 border border-blue-500/50 flex items-center justify-center text-blue-400 font-black font-mono text-lg animate-pulse">
                                                                L{rouletteValue}
                                                            </div>
                                                            <span className="text-[8px] sm:text-[9px] font-bold text-blue-400 mt-2 uppercase tracking-wide">
                                                                {language === 'RU' ? 'Синтез...' : 'Synthesis...'}
                                                            </span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <div className="w-10 h-10 rounded bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 font-black text-xl animate-pulse">
                                                                ?
                                                            </div>
                                                            <span className="text-[8px] sm:text-[9px] font-bold text-slate-400 mt-2 uppercase tracking-wide">
                                                                {language === 'RU' ? 'Нажмите' : 'Click'}
                                                            </span>
                                                        </>
                                                    )}
                                                </button>
                                            ))}
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
                    </motion.div>
                </div>
            )}
            </AnimatePresence>

            {/* MONUMENT DIALOG */}
            <AnimatePresence>
                {monumentDialogState.isOpen && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && activeModal !== 'EXIT' && activeModal !== 'RESTART' && !showResetConfirm && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-2 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeMonumentDialog}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-4 md:p-6 w-[94vw] max-w-2xl max-h-[94vh] md:max-h-[90vh] relative overflow-hidden flex flex-col gap-4 md:gap-6 group z-20"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Cyber Corner Brackets */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-amber-500/50 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-amber-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-amber-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-amber-500/50 z-30 pointer-events-none" />

                            {/* Glowing top accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600/30 via-amber-500/60 to-amber-600/30 pointer-events-none" />

                        {/* Scanline effect */}
                        <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />

                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <button onClick={closeMonumentDialog} className="absolute top-1 right-1 md:top-2 md:right-2 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 active:scale-95 transition-all rounded-full cursor-pointer z-35"><X className="w-5 h-5 md:w-6 h-6"/></button>
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* VOID DIALOG */}
            <AnimatePresence>
                {voidDialogTarget && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && activeModal !== 'EXIT' && activeModal !== 'RESTART' && !showResetConfirm && (
                    <div className="absolute inset-0 z-[100] flex items-center justify-center p-2 pointer-events-auto">
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeVoidDialog}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        <motion.div 
                            initial={{ scale: 0.95, y: 15, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.95, y: 15, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 350, damping: 25 }}
                            className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-4 md:p-6 w-[94vw] max-w-lg max-h-[92vh] md:max-h-[90vh] relative overflow-hidden flex flex-col gap-4 md:gap-6 group z-20"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Cyber Corner Brackets */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-red-500/50 z-30 pointer-events-none" />
                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-red-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-red-500/50 z-30 pointer-events-none" />
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-red-500/50 z-30 pointer-events-none" />

                            {/* Glowing top accent */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/30 via-red-500/60 to-red-600/30 pointer-events-none" />

                        {/* Scanline effect */}
                        <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />

                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <button onClick={closeVoidDialog} className="absolute top-1 right-1 md:top-2 md:right-2 w-11 h-11 md:w-12 md:h-12 flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 active:scale-95 transition-all rounded-full cursor-pointer z-30"><X className="w-5 h-5 md:w-6 h-6"/></button>
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
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {miniMonumentDialogState?.isOpen && gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT' && activeModal !== 'EXIT' && activeModal !== 'RESTART' && !showResetConfirm && (
                <MiniMonumentDialog isOpen={miniMonumentDialogState.isOpen} hint={miniMonumentDialogState.hint} onClose={closeMiniMonumentDialog} />
            )}

            {/* CONFIRM RESET ACTION MODAL */}
            <AnimatePresence>
            {showResetConfirm && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center p-4 pointer-events-auto">
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        onClick={() => setShowResetConfirm(false)}
                    />
                    <motion.div 
                        initial={{ scale: 0.95, y: 10 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 10 }}
                        className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800/80 rounded-2xl md:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] p-6 md:p-8 w-[90vw] max-w-md relative text-center z-10 group"
                    >
                        {/* Cyber Corner Brackets */}
                        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-red-500/50 pointer-events-none" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-red-500/50 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-red-500/50 pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-red-500/50 pointer-events-none" />

                        {/* Glowing top accent */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/30 via-red-500/60 to-red-600/30 pointer-events-none" />
                        <div className="w-12 h-12 rounded-full border-2 border-red-500/30 flex items-center justify-center mx-auto mb-4 bg-red-500/10">
                            <AlertTriangle className="text-red-500 w-6 h-6" />
                        </div>
                        <h3 className="text-xl md:text-2xl font-black font-mono text-white mb-2 tracking-tight uppercase">
                            {language === 'RU' ? 'ВНИМАНИЕ' : 'WARNING'}
                        </h3>
                        <p className="text-slate-300 mb-6 text-sm md:text-base px-2">
                            {language === 'RU' ? 'Начать новую игру? Весь текущий прогресс будет сброшен.' : 'Start a new game? All current progress will be reset.'}
                        </p>
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setShowResetConfirm(false)}
                                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider text-xs md:text-sm rounded-xl transition-all border border-slate-700 active:scale-95 touch-manipulation"
                            >
                                {language === 'RU' ? 'Отмена' : 'Cancel'}
                            </button>
                            <button 
                                onClick={executeNewGame}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase tracking-wider text-xs md:text-sm rounded-xl transition-all border border-red-500/50 shadow-[0_4px_15px_rgba(239,68,68,0.4)] active:scale-95 touch-manipulation"
                            >
                                {language === 'RU' ? 'Сброс' : 'Reset'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            </AnimatePresence>

            <AnimatePresence>
            {tutorialLoading && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center p-6 text-center pointer-events-auto"
                >
                    <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-6" />
                    <h2 className="text-xl md:text-2xl font-black text-emerald-400 uppercase tracking-widest mb-2 font-mono">
                        {language === 'RU' ? 'ЗАГРУЗКА ИНСТРУКТАЖА' : 'INITIALIZING TUTORIAL'}
                    </h2>
                    <p className="text-sm md:text-base text-emerald-500/70 font-mono italic tracking-wider">
                        {language === 'RU' ? 'Подготовка изолированной среды...' : 'Preparing safe environment...'}
                    </p>
                </motion.div>
            )}
            </AnimatePresence>


        </>
    );
};

export default React.memo(GameDialogs);
