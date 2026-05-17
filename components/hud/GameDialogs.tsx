
import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store';
import { TEXT } from '../../services/i18n';
import { CAMPAIGN_LEVELS } from '../../campaign/levels';
import { ITEM_REGISTRY, getItemDef } from '../../rules/items';
import { LogOut, X, Trophy, ArrowRight, RotateCcw, Target, Swords, Crown, Zap, HelpCircle, AlertTriangle, CheckCircle, Trash2, BookOpen, Lock, FileText, RefreshCw, Terminal, Globe, Activity } from 'lucide-react';
import { ItemIcon, resolveItemText, getRarityBorder } from './HudShared';
import { Item } from '../../types';

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
    const overworldStatus = useGameStore(state => state.overworld.gameStatus);
    const gameStatus = sessionStatus || overworldStatus;
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
    const returnToOverworld = useGameStore(state => state.returnToOverworld);
    const addRewardItem = useGameStore(state => state.addRewardItem);
    const isOverworldGenerated = useGameStore(state => state.overworld.isGenerated);
    const hasActiveSession = useGameStore(state => state.hasActiveSession);
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
    
    const voidDialogTarget = useGameStore(state => state.voidDialogTarget);
    const closeVoidDialog = useGameStore(state => state.closeVoidDialog);
    const restoreVoidHex = useGameStore(state => state.restoreVoidHex);

    const t = TEXT[language].HUD;

    const resetProgress = useGameStore(state => state.resetProgress);
    const initOverworld = useGameStore(state => state.initOverworld);
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
            initOverworld();
        }
    };

    const handleNextLevel = () => {
        playUiSound('CLICK');
        if (campaignMode === 'STORY' && isOverworldGenerated) {
            returnToOverworld('VICTORY', selectedRewardItem || undefined);
            return;
        }
        if (campaignMode === 'LEVELS' && gameStatus === 'VICTORY') {
            if (selectedRewardItem) addRewardItem(selectedRewardItem);
            addCollectedHexes(selectedHexes);
            addMinedHexes(selectedHexes);
        }
        
        const levelsToUse = campaignMode === 'LEVELS' 
            ? CAMPAIGN_LEVELS.filter(l => !l.isCityLevel)
            : CAMPAIGN_LEVELS;

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
        if (campaignMode === 'STORY' && isOverworldGenerated && hasActiveSession && activeLevelConfig) {
            returnToOverworld('DEFEAT');
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
        if (campaignMode === 'STORY' && isOverworldGenerated && hasActiveSession && activeLevelConfig) {
            returnToOverworld(gameStatus === 'VICTORY' ? 'VICTORY' : 'DEFEAT', selectedRewardItem || undefined);
        } else {
            if (campaignMode === 'LEVELS' && gameStatus === 'VICTORY') {
                if (selectedRewardItem) addRewardItem(selectedRewardItem);
                addCollectedHexes(selectedHexes);
            }
            abandonSession();
            if (campaignMode === 'LEVELS' && activeLevelConfig) {
                setUIState('CAMPAIGN_MAP');
            }
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

    const availableInventory = player?.inventory.filter(i => !monumentDialogState.slots.some(s => s?.id === i.id)) || [];
    const isMonumentReady = monumentDialogState.slots.every(s => s !== null);

    // --- RENDER ---

    return (
        <>
            {/* SALUTE CLICK LAYER */}
            {victoryStage === 'SALUTE' && <div className="absolute inset-0 z-[150] pointer-events-auto cursor-pointer" onClick={() => setVictoryStage('MODAL')} onTouchStart={() => setVictoryStage('MODAL')} />}

            {/* EXIT CONFIRMATION */}
            {activeModal === 'EXIT' && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={closeModal}>
                    <div className="bg-slate-900 border border-red-900/50 p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl max-w-[320px] md:max-w-sm w-full text-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-red-600"></div>
                        <div className="w-14 h-14 rounded-2xl bg-red-900/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30 shadow-lg shadow-red-900/20"><LogOut className="w-7 h-7 text-red-500" /></div>
                        <h3 className="text-xl font-black text-white uppercase mb-2 tracking-tight break-words whitespace-pre-wrap">{t.ABORT_TITLE}</h3>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed px-2 break-words whitespace-pre-wrap">{t.ABORT_DESC}</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => { handleMenu(); playUiSound('CLICK'); }} className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black uppercase text-xs transition-all active:scale-95 shadow-lg shadow-red-900/40">{t.BTN_CONFIRM}</button>
                            <button onClick={() => { closeModal(); playUiSound('CLICK'); }} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold uppercase text-[10px] transition-colors">{t.BTN_CANCEL}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* RESTART CONFIRMATION */}
            {activeModal === 'RESTART' && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={closeModal}>
                    <div className="bg-slate-900 border border-amber-900/50 p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl max-w-[320px] md:max-w-sm w-full text-center relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-amber-600"></div>
                        <div className="w-14 h-14 rounded-2xl bg-amber-900/20 flex items-center justify-center mx-auto mb-4 border border-amber-500/30 shadow-lg shadow-amber-900/20"><RotateCcw className="w-7 h-7 text-amber-500" /></div>
                        <h3 className="text-xl font-black text-white uppercase mb-2 tracking-tight break-words whitespace-pre-wrap">{t.BTN_RETRY}?</h3>
                        <p className="text-xs text-slate-400 mb-6 leading-relaxed px-2 break-words whitespace-pre-wrap">{language === 'RU' ? 'Начать уровень заново? Текущий прогресс будет потерян.' : 'Restart the level? Current progress will be lost.'}</p>
                        <div className="flex flex-col gap-3">
                            <button onClick={() => { handleRetry(); closeModal(); playUiSound('CLICK'); }} className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-black uppercase text-xs transition-all active:scale-95 shadow-lg shadow-amber-900/40">{t.BTN_CONFIRM}</button>
                            <button 
                                onClick={() => { handleNewGame(); closeModal(); }} 
                                className="w-full py-3 rounded-xl bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-900/30 hover:border-red-500/50 font-bold uppercase text-[10px] transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-4 h-4" />
                                {language === 'RU' ? 'Новая Игра (Сброс)' : 'New Game (Reset)'}
                            </button>
                            <button onClick={() => { closeModal(); playUiSound('CLICK'); }} className="w-full py-2 rounded-xl bg-transparent text-slate-500 hover:text-slate-300 font-bold uppercase text-[10px] transition-colors">{t.BTN_CANCEL}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MISSION BRIEFING / DETAILS */}
            {(activeModal === 'MISSION' || gameStatus === 'BRIEFING') && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 md:p-6 pointer-events-auto animate-in fade-in duration-300">
                    <div className="relative bg-slate-950 border-2 border-indigo-500/40 rounded-lg shadow-[0_0_40px_rgba(79,70,229,0.2)] max-w-lg w-full max-h-[95vh] md:max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 group">
                        {/* Scanline effect */}
                        <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                        <div className="absolute top-0 left-0 w-full h-1 bg-white/5 animate-scan-slow z-10" />

                        {/* Technical Header */}
                        <div className="bg-indigo-900/20 border-b border-indigo-500/30 p-3 flex items-center justify-between z-20">
                            <div className="flex items-center gap-3">
                                <Terminal className="w-5 h-5 text-indigo-400" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400/60 leading-none">MISSION_PROTOCOL_INIT</span>
                                    <span className="text-xs font-bold text-white uppercase tracking-widest">{activeLevelConfig?.id || 'SKIRMISH_OPS'}</span>
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
                                }} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5"/></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto no-scrollbar relative z-20 p-6 md:p-8 flex flex-col gap-6">
                            <div className="flex flex-col items-center">
                                <div className="relative mb-6">
                                    <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full" />
                                    <div className="relative w-20 h-20 bg-slate-900 border-2 border-indigo-500/30 rounded-xl flex items-center justify-center shadow-2xl">
                                        <Target className="w-10 h-10 text-indigo-400" />
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-indigo-600 p-1.5 rounded text-white shadow-lg">
                                        <Activity className="w-3.5 h-3.5" />
                                    </div>
                                </div>
                                <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter text-center leading-none mb-4">{briefingTitle}</h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        <Globe className="w-3 h-3" /> {difficulty || 'NORMAL'}
                                    </div>
                                    {bots && bots.length > 0 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-red-950/30 border border-red-500/30 rounded text-[10px] font-black text-red-400 uppercase tracking-widest">
                                            <Swords className="w-3 h-3"/> {t.BRIEFING_RIVAL}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="relative bg-slate-900/80 border border-indigo-500/20 rounded-lg overflow-hidden flex flex-col flex-1 min-h-[100px]">
                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500/40" />
                                <div className="absolute top-0 right-0 p-1">
                                    <FileText className="w-3 h-3 text-indigo-500/30" />
                                </div>
                                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 bg-slate-950/40">
                                    <div className="flex flex-col gap-3">
                                        <p className="text-xs md:text-sm text-indigo-100/90 leading-relaxed whitespace-pre-wrap font-mono break-words pl-2 pb-6">
                                            {briefingDesc}
                                        </p>
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none opacity-60" />
                            </div>
                        </div>

                        {/* Footer / Action */}
                        <div className="p-6 bg-slate-900/50 border-t border-indigo-500/20 z-20">
                            <button 
                                onClick={() => {
                                    if (gameStatus === 'BRIEFING') {
                                        startMission();
                                    }
                                    closeModal();
                                }} 
                                className="group/btn relative flex w-full flex-col items-center justify-center gap-2 px-12 py-5 bg-slate-900/80 border border-indigo-500/50 hover:bg-slate-800 transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] overflow-hidden rounded text-indigo-400 hover:text-indigo-300"
                            >
                                <div className="absolute inset-0 bg-indigo-500/10 opacity-0 transition-opacity group-hover/btn:opacity-100 pointer-events-none" />
                                <div className="relative z-10 flex items-center justify-center gap-3 text-white font-black uppercase tracking-[0.3em] text-sm">
                                    {gameStatus === 'BRIEFING' ? t.BRIEFING_BTN_START : t.BTN_READY}
                                    <ArrowRight className="w-5 h-5 transition-transform group-hover/btn:translate-x-1" />
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RANKINGS */}
            {activeModal === 'RANKINGS' && (
                <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={closeModal}>
                    <div className="bg-slate-950 border-2 border-amber-500/40 rounded-lg shadow-[0_0_40px_rgba(245,158,11,0.2)] w-full max-w-[340px] md:max-w-md max-h-[80vh] flex flex-col overflow-hidden relative group" onClick={e => e.stopPropagation()}>
                        {/* Scanline effect */}
                        <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                        
                        <div className="p-4 border-b border-amber-500/30 flex items-center justify-between bg-amber-900/10 z-20">
                            <div className="flex items-center gap-3">
                                <Trophy className="w-5 h-5 text-amber-500" />
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500/60 leading-none">NETWORK_HIERARCHY</span>
                                    <span className="text-xs font-bold text-white uppercase tracking-widest">{t.MINI_LB_TITLE}</span>
                                </div>
                            </div>
                            <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 z-20 bg-slate-950/40">
                            {liveRankings.length === 0 ? <div className="p-8 text-center text-slate-500 text-xs font-mono uppercase tracking-widest opacity-40">NO_DATA_STREAM</div> : 
                                <div className="flex flex-col gap-2">{liveRankings.map((entry, idx) => (
                                    <div key={entry.id} className={`grid grid-cols-12 gap-2 items-center p-3 rounded border-l-4 transition-all ${entry.isPlayer ? 'bg-indigo-900/20 border-indigo-500/60 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'bg-slate-900/60 border-slate-700/60 hover:bg-slate-800'}`}>
                                        <div className="col-span-1 flex justify-center">
                                            <div className={`text-[10px] font-black font-mono ${idx === 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                                                {String(idx + 1).padStart(2, '0')}
                                            </div>
                                        </div>
                                        <div className="col-span-5 flex items-center gap-2 overflow-hidden">
                                            <div className="w-1.5 h-4" style={{ backgroundColor: entry.color }}></div>
                                            <span className={`text-[11px] font-black uppercase truncate tracking-tight ${entry.isPlayer ? 'text-indigo-300' : 'text-slate-300'}`}>
                                                {entry.nickname}
                                            </span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <div className="text-[8px] font-black text-slate-600 uppercase mb-0.5">LVL</div>
                                            <span className="text-[10px] font-mono text-emerald-400 font-bold">{entry.level}</span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <div className="text-[8px] font-black text-slate-600 uppercase mb-0.5">CRD</div>
                                            <span className="text-[10px] font-mono text-amber-400 font-bold">{entry.coins}</span>
                                        </div>
                                        <div className="col-span-2 text-right">
                                            <div className="text-[8px] font-black text-slate-600 uppercase mb-0.5">MOV</div>
                                            <span className="text-[10px] font-mono text-blue-400 font-bold">{entry.moves}</span>
                                        </div>
                                    </div>
                                ))}</div>
                            }
                        </div>
                        <div className="p-4 bg-slate-900/80 border-t border-amber-500/30 z-20 shadow-inner">
                            <button onClick={closeModal} className="w-full py-3 bg-amber-600/20 border border-amber-500 hover:bg-amber-600 hover:text-white text-amber-400 font-black uppercase text-xs tracking-[0.3em] transition-all">
                                {t.BTN_READY}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LOG */}
            {activeModal === 'LOG' && (
                <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={closeModal}>
                    <div className="bg-slate-950 border-2 border-indigo-500/40 rounded-lg shadow-[0_0_40px_rgba(79,70,229,0.2)] w-full max-w-[340px] md:max-w-2xl h-[80vh] md:h-[85vh] flex flex-col overflow-hidden relative group" onClick={e => e.stopPropagation()}>
                        {/* Scanline effect */}
                        <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
                        
                        <div className="p-4 border-b border-indigo-500/30 flex items-center justify-between bg-indigo-900/10 z-20">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-indigo-500/20 rounded border border-indigo-500/30">
                                    <FileText className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-500/60 leading-none">DATA_FETCH_COMPLETE</span>
                                    <span className="text-xs font-bold text-white uppercase tracking-widest">{language === 'RU' ? 'Журнал Событий' : 'Event Log'}</span>
                                </div>
                            </div>
                            <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2 bg-slate-950/40 z-20">
                            {messageLog && messageLog.length > 0 ? (
                                [...messageLog].reverse().map((log) => (
                                    <div key={log.id} className="relative flex gap-3 p-3 bg-slate-900/40 border border-slate-800 hover:bg-slate-800 transition-all group/item overflow-hidden">
                                        <div className={`absolute top-0 left-0 w-1 h-full ${log.type === 'INFO' ? 'bg-indigo-500' : log.type === 'ERROR' ? 'bg-red-500' : log.type === 'WARN' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
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
                                <div className="flex flex-col items-center justify-center h-full opacity-10 gap-3">
                                    <Terminal className="w-16 h-16 text-slate-500" />
                                    <div className="text-center text-slate-500 text-[10px] font-black uppercase tracking-[0.5em]">BUFFER_EMPTY</div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 bg-slate-900/80 border-t border-indigo-500/30 z-20 shadow-inner">
                            <button onClick={closeModal} className="w-full py-3 bg-indigo-600/20 border border-indigo-500 hover:bg-indigo-600 hover:text-white text-indigo-400 font-black uppercase text-xs tracking-[0.3em] transition-all">
                                {t.BTN_READY}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CODEX */}
            {activeModal === 'CODEX' && (
                <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={closeModal}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl md:rounded-3xl shadow-2xl w-full max-w-[340px] md:max-w-3xl h-[80vh] md:h-[85vh] flex flex-col overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-purple-500"></div>
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-purple-500/20 rounded-lg border border-purple-500/30">
                                    <BookOpen className="w-4 h-4 text-purple-400" />
                                </div>
                                <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white break-words whitespace-pre-wrap">{language === 'RU' ? 'База Предметов' : 'Item Codex'}</h3>
                            </div>
                            <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors p-1"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-6 bg-slate-950/30">
                            {(['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'] as const).map(rarity => {
                                const items = ITEM_REGISTRY.filter(i => i.rarity === rarity);
                                if (items.length === 0) return null;
                                return (
                                    <div key={rarity}>
                                        <div className="flex items-center gap-3 mb-3">
                                            <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] ${rarity === 'COMMON' ? 'text-slate-400' : rarity === 'UNCOMMON' ? 'text-emerald-400' : rarity === 'RARE' ? 'text-purple-400' : 'text-amber-400'}`}>{rarity}</h4>
                                            <div className={`flex-1 h-px ${rarity === 'COMMON' ? 'bg-slate-800' : rarity === 'UNCOMMON' ? 'bg-emerald-900/50' : rarity === 'RARE' ? 'bg-purple-900/50' : 'bg-amber-900/50'}`} />
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {items.map(def => (
                                                <div key={def.idPrefix} className="flex gap-3 p-2.5 bg-slate-900/40 border border-slate-800/50 rounded-xl hover:bg-slate-800/40 transition-colors group">
                                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0 shadow-inner group-hover:scale-105 transition-transform ${getRarityBorder(def.rarity)}`}><ItemIcon def={def} size="w-7 h-7 md:w-9 md:h-9" /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5"><span className="text-[11px] font-bold text-white truncate group-hover:text-indigo-300 transition-colors break-words whitespace-pre-wrap">{def.name[language]}</span></div>
                                                        <p className="text-[9px] text-slate-500 italic leading-tight line-clamp-2 break-words whitespace-pre-wrap">"{def.description[language]}"</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="p-3 bg-slate-950/50 border-t border-slate-800">
                            <button onClick={closeModal} className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase text-[10px] transition-colors">{t.BTN_READY}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* HELP */}
            {helpTopic && helpData && (
                <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={closeHelp}>
                    <div className="bg-slate-900 border border-slate-700 p-5 md:p-8 rounded-2xl md:rounded-3xl shadow-2xl max-w-[320px] md:max-w-sm w-full max-h-[90vh] overflow-y-auto relative" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                        <h3 className="text-xl font-black text-white uppercase mb-2 text-center tracking-tight break-words whitespace-pre-wrap">{helpData.title}</h3>
                        <p className="text-xs text-slate-400 mb-5 text-center leading-relaxed px-2 break-words whitespace-pre-wrap">{helpData.desc}</p>
                        {(helpData as any).extra ? (
                            <div className="flex flex-col gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 mb-5">
                                {(helpData as any).extra.map((line: string, i: number) => (
                                    <p key={i} className="text-[10px] text-slate-300 font-mono leading-tight border-l-2 border-indigo-500 pl-2 py-1 break-words whitespace-pre-wrap">{line}</p>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-slate-800 p-3 rounded-xl text-[10px] font-mono text-emerald-400 text-center mb-5 border border-emerald-900/30">
                                {helpData.hint}
                            </div>
                        )}
                        <button onClick={closeHelp} className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold uppercase text-[10px] transition-colors">{t.BTN_READY}</button>
                    </div>
                </div>
            )}

            {/* ITEM INSPECTION */}
            {inspectedItem && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto animate-in fade-in duration-200" onClick={closeInspect}>
                    <div className="bg-slate-950 border border-slate-700 rounded-2xl md:rounded-3xl shadow-2xl max-w-[340px] md:max-w-sm w-full max-h-[90vh] overflow-y-auto relative flex flex-col gap-4 p-5 md:p-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
                        <button onClick={closeInspect} className="absolute top-3 right-3 text-slate-500 hover:text-white transition-colors p-1"><X className="w-5 h-5"/></button>
                        {(() => {
                            const data = resolveItemText(inspectedItem, language);
                            return (
                                <>
                                    <div className="flex flex-col items-center">
                                        <div className={`w-24 h-24 rounded-2xl bg-slate-900 border flex items-center justify-center mb-3 shadow-inner ${getRarityBorder(inspectedItem.rarity)}`}><ItemIcon item={inspectedItem} size="w-16 h-16" /></div>
                                        <h3 className="text-lg font-black text-white uppercase tracking-tight text-center leading-tight break-words whitespace-pre-wrap">{data.name}</h3>
                                        <span className={`text-[10px] font-bold uppercase mt-1.5 px-2 py-0.5 rounded-full bg-slate-900 border ${getRarityBorder(inspectedItem.rarity)} text-slate-300`}>{inspectedItem.rarity}</span>
                                    </div>
                                    <p className="text-xs text-slate-400 text-center italic leading-relaxed border-t border-b border-slate-800/50 py-4 break-words whitespace-pre-wrap">"{data.description}"</p>
                                    <div className="flex flex-col gap-2.5">
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/20 border border-emerald-900/30"><CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" /><div><span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest block mb-0.5 break-words whitespace-pre-wrap">Success</span><span className="text-[11px] text-emerald-100 font-mono leading-tight break-words whitespace-pre-wrap">{data.effectDesc}</span></div></div>
                                        {inspectedItem.negativeEffectType && <div className="flex items-start gap-3 p-3 rounded-xl bg-red-950/20 border border-red-900/30"><AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" /><div><span className="text-[9px] font-bold text-red-400 uppercase tracking-widest block mb-0.5 break-words whitespace-pre-wrap">Failure</span><span className="text-[11px] text-red-100 font-mono leading-tight break-words whitespace-pre-wrap">{data.negDesc}</span></div></div>}
                                    </div>
                                    <div className="flex flex-col gap-2 mt-2">
                                        <button onClick={closeInspect} className="w-full py-3 bg-white text-black hover:bg-slate-200 rounded-xl font-black uppercase tracking-wider text-xs transition-colors">Close</button>
                                        <button onClick={() => { destroyItem(inspectedItem.id); closeInspect(); }} className="w-full py-2.5 bg-transparent hover:bg-red-900/20 text-slate-500 hover:text-red-400 rounded-xl font-bold uppercase tracking-wider text-[10px] transition-colors flex items-center justify-center gap-2 group"><Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" /> Discard Item</button>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* VICTORY / DEFEAT */}
            {(gameStatus === 'DEFEAT' || (gameStatus === 'VICTORY' && victoryStage === 'MODAL')) && (
                <div className="absolute inset-0 z-[250] flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in duration-1000 pointer-events-auto p-4 md:p-8">
                    {/* Background Grid & Scanlines */}
                    <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none" />
                    <div className={`absolute inset-0 bg-gradient-to-b opacity-20 pointer-events-none ${gameStatus === 'VICTORY' ? 'from-emerald-500/20 to-transparent' : 'from-red-500/20 to-transparent'}`} />

                    <div className="flex flex-col items-center max-w-3xl w-full relative z-10 max-h-full overflow-y-auto no-scrollbar py-4 px-4 md:px-0">
                        {/* Terminal Decoration */}
                        <div className="w-full flex items-center gap-2 md:gap-4 mb-6 md:mb-10 opacity-40">
                            <div className="h-px flex-1 bg-current" style={{ color: gameStatus === 'VICTORY' ? '#10b981' : '#ef4444' }} />
                            <div className="text-[8px] md:text-[10px] font-black uppercase tracking-[0.2em] md:tracking-[0.5em] font-mono whitespace-nowrap" style={{ color: gameStatus === 'VICTORY' ? '#10b981' : '#ef4444' }}>
                                {gameStatus === 'VICTORY' ? 'SYSTEM_STABILITY_RESTORED' : 'LINK_TERMINATED'}
                            </div>
                            <div className="h-px flex-1 bg-current" style={{ color: gameStatus === 'VICTORY' ? '#10b981' : '#ef4444' }} />
                        </div>

                        {/* Main Status Display */}
                        <div className="relative mb-6 md:mb-10">
                            <div className={`absolute inset-0 blur-xl md:blur-3xl opacity-30 animate-pulse ${gameStatus === 'VICTORY' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div className={`relative px-6 py-4 md:px-10 md:py-6 border-2 md:border-4 transform skew-x-[-12deg] ${gameStatus === 'VICTORY' ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.3)] md:shadow-[0_0_50px_rgba(16,185,129,0.3)]' : 'border-red-500 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.3)] md:shadow-[0_0_50px_rgba(239,68,68,0.3)]'}`}>
                                <h1 className={`text-4xl sm:text-5xl md:text-7xl font-black uppercase tracking-tighter italic transform skew-x-[12deg] leading-none whitespace-nowrap ${gameStatus === 'VICTORY' ? 'text-emerald-400' : 'text-red-500'}`}>
                                    {gameStatus === 'VICTORY' ? t.VICTORY : t.DEFEAT}
                                </h1>
                            </div>
                        </div>

                        {/* Mission Summary Data */}
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
                                    {/* Final Score Banner */}
                                    <div className="w-full bg-slate-900/40 border border-purple-500/30 rounded-xl p-4 md:p-6 mb-6 flex flex-col items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.15)] backdrop-blur-md relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-500/10 to-transparent translate-x-[-100%] animate-[shimmer_2s_infinite]" />
                                        <div className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-purple-300 mb-1 z-10">RATING POINTS (SCORE)</div>
                                        <div className="text-3xl md:text-5xl font-black font-mono tracking-tight text-white mb-2 z-10 drop-shadow-[0_0_10px_rgba(168,85,247,0.5)]">
                                            {finalScore.toLocaleString()}
                                        </div>
                                        <div className="text-[9px] md:text-[10px] uppercase font-bold text-slate-400 flex items-center justify-center gap-4 flex-wrap text-center z-10">
                                            <span>Base: 15,000</span>
                                            <span className="text-red-400">Time: -{timePenalty}</span>
                                            <span className="text-red-400">Actions: -{actionsPenalty} ({player?.actionsTaken || 0})</span>
                                            <span className="text-emerald-400">Bonus: +{resourcesBonus}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3 lg:gap-4 w-full mb-6">
                                        {[
                                            { label: 'STATUS', value: gameStatus === 'VICTORY' ? 'SUCCESS' : 'FAILED', color: gameStatus === 'VICTORY' ? 'text-emerald-400' : 'text-red-400' },
                                            { label: 'TURNS ELAPSED', value: currentTurn, color: 'text-slate-300' },
                                            { label: 'CREDITS EXTRACTED', value: player?.totalCoinsEarned || 0, color: 'text-amber-400' },
                                            { label: 'ACTIONS TAKEN', value: player?.actionsTaken || 0, color: 'text-purple-400' }
                                        ].map((stat, i) => (
                                            <div key={i} className="bg-slate-900/50 border border-white/10 p-2 lg:p-4 rounded-lg backdrop-blur-md flex flex-col items-center justify-center text-center">
                                                <div className="text-[7px] md:text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-1 lg:mb-2">{stat.label}</div>
                                                <div className={`text-base md:text-lg lg:text-xl font-black font-mono leading-none ${stat.color}`}>{stat.value}</div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            );
                        })()}

                        {gameStatus === 'VICTORY' && (
                            <div className="w-full mb-6 md:mb-8 flex flex-col shrink-0 min-h-0">
                                <div className="bg-emerald-900/20 border border-emerald-500/30 p-3 md:p-4 rounded-lg mb-4 md:mb-6 shrink-0">
                                    <h3 className="text-emerald-400 font-bold uppercase tracking-wider text-xs md:text-sm mb-1 text-center md:text-left">Performance Assessment</h3>
                                    <p className="text-emerald-200/70 text-[10px] md:text-xs text-center md:text-left">Mission completed successfully. +1 Skill Point awarded for upgrades.</p>
                                </div>
                                
                                {player?.inventory && player.inventory.length > 0 && (
                                    <>
                                        <div className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-slate-400 mb-2 md:mb-3 text-center shrink-0">Select ONE item to extract</div>
                                        <div className="flex flex-wrap justify-center gap-2 md:gap-3 overflow-y-auto no-scrollbar pb-2 mb-4 mt-2">
                                            {player.inventory.map(item => (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => { setSelectedRewardItem(item); playUiSound('CLICK'); }}
                                                    className={`w-[45%] md:w-auto p-2 md:p-3 border-2 rounded-xl transition-all flex flex-col items-center ${selectedRewardItem?.id === item.id ? 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-600'}`}
                                                >
                                                    <span className={`text-xl md:text-2xl mb-1 md:mb-2 ${item.rarity === 'LEGENDARY' ? 'text-amber-400' : item.rarity === 'RARE' ? 'text-purple-400' : 'text-blue-400'}`}>
                                                        {item.visualType === 'ARTIFACT' ? '💎' : item.visualType === 'TOOL' ? '⛏️' : item.visualType === 'HEAD' ? '🪖' : '👕'}
                                                    </span>
                                                    <span className="text-[8px] md:text-[10px] font-bold text-white uppercase tracking-wider text-center line-clamp-1">{item.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {campaignMode === 'LEVELS' && Object.keys(availableHexes).length > 0 && (
                                    <div className="bg-slate-900/40 border border-slate-700 p-3 rounded-xl mb-4 shrink-0 mt-4">
                                        <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                                            <h3 className="text-emerald-400 font-bold uppercase tracking-wider text-xs md:text-sm">
                                                {language === 'RU' ? 'Протокол Извлечения Гексов' : 'Hex Extraction Protocol'}
                                            </h3>
                                            <div className="text-[10px] font-mono tracking-widest px-2 py-1 bg-slate-950 rounded text-amber-500">
                                                {language === 'RU' ? 'ВМЕСТИМОСТЬ' : 'CAPACITY'}: {totalSelectedHexesCount} / {Math.max(5, player?.maxInventorySize || 5)} 
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto no-scrollbar">
                                            {Object.entries(availableHexes).map(([level, count]) => {
                                                const lvl = Number(level);
                                                const selected = selectedHexes[lvl] || 0;
                                                const capacityFull = totalSelectedHexesCount >= Math.max(5, player?.maxInventorySize || 5);
                                                
                                                return (
                                                    <div key={lvl} className="flex items-center justify-between bg-slate-950 p-2 rounded border border-slate-800">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-mono font-bold ${
                                                                lvl < 0 ? 'bg-indigo-900/50 text-indigo-400' :
                                                                lvl === 0 ? 'bg-slate-800 text-slate-400' :
                                                                'bg-emerald-900/50 text-emerald-400'
                                                            }`}>
                                                                L{lvl}
                                                            </div>
                                                            <div className="text-xs font-bold text-slate-300">
                                                                {language === 'RU' ? 'Доступно:' : 'Available:'} {count}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="flex bg-slate-800 rounded overflow-hidden shadow-inner">
                                                            <button 
                                                                onClick={() => {
                                                                    if (selected > 0) {
                                                                        playUiSound('CLICK');
                                                                        setSelectedHexes(prev => ({...prev, [lvl]: prev[lvl] - 1}));
                                                                    }
                                                                }}
                                                                disabled={selected <= 0}
                                                                className="w-8 h-8 flex items-center justify-center bg-slate-700/50 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-30 transition-colors text-white font-bold"
                                                            >-</button>
                                                            <div className="w-8 h-8 flex items-center justify-center font-mono text-emerald-400">
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
                                                                className="w-8 h-8 flex items-center justify-center bg-slate-700/50 hover:bg-slate-600 active:bg-slate-500 disabled:opacity-30 transition-colors text-white font-bold"
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

                        {/* Action Protocol */}
                        <div className="w-full flex flex-col md:flex-row gap-2 md:gap-4 shrink-0 mt-auto">
                            {(isOverworldGenerated && campaignMode === 'STORY' && activeLevelConfig) ? (
                                <>
                                    <button 
                                        onClick={handleMenu} 
                                        className={`flex-1 py-3 md:py-5 relative overflow-hidden group/btn ${gameStatus === 'VICTORY' ? 'bg-emerald-600/20 border-2 border-emerald-500' : 'bg-slate-900 border-2 border-slate-700'}`}
                                    >
                                        <div className={`absolute inset-0 transform translate-y-full transition-transform duration-300 group-hover/btn:translate-y-0 ${gameStatus === 'VICTORY' ? 'bg-emerald-600' : 'bg-slate-700'}`} />
                                        <div className="relative flex items-center justify-center gap-2 md:gap-3 text-white font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-xs md:text-sm">
                                            {gameStatus === 'VICTORY' ? 'RETURN_TO_BASE' : 'RECALL_SIGNAL'} 
                                            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover/btn:translate-x-1" />
                                        </div>
                                    </button>
                                    {gameStatus === 'DEFEAT' && (
                                        <button 
                                            onClick={handleRetry} 
                                            className="flex-1 py-3 md:py-5 bg-indigo-600 border-2 border-indigo-400 relative overflow-hidden group/retry"
                                        >
                                            <div className="absolute inset-0 bg-indigo-500 transform scale-x-0 origin-left transition-transform duration-300 group-hover/retry:scale-x-100" />
                                            <div className="relative flex items-center justify-center gap-2 md:gap-3 text-white font-black uppercase tracking-[0.1em] md:tracking-[0.2em] text-xs md:text-sm">
                                                <RotateCcw className="w-4 h-4 md:w-5 md:h-5 transition-transform group-hover/retry:rotate-180" /> {t.BTN_RETRY}
                                            </div>
                                        </button>
                                    )}
                                </>
                            ) : (
                                <>
                                    {gameStatus === 'VICTORY' && activeLevelConfig && (
                                        <button onClick={handleNextLevel} className="flex-1 py-3 md:py-5 bg-emerald-600 border-2 border-emerald-400 hover:bg-emerald-500 text-white font-black uppercase tracking-[0.1em] md:tracking-[0.2em] shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm">
                                            {t.BTN_NEXT} <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
                                        </button>
                                    )}
                                    <button onClick={handleRetry} className="flex-1 py-3 md:py-5 bg-slate-900 border-2 border-slate-700 hover:bg-slate-800 text-white font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm">
                                        <RotateCcw className="w-4 h-4 md:w-5 md:h-5" /> {t.BTN_RETRY}
                                    </button>
                                    {/* Fallback Menu Button */}
                                    <button onClick={handleMenu} className="flex-1 py-3 md:py-5 bg-slate-950 border-2 border-slate-800 hover:bg-slate-900 text-slate-400 font-black uppercase tracking-[0.1em] md:tracking-[0.2em] transition-all flex items-center justify-center gap-2 md:gap-3 text-xs md:text-sm">
                                        <LogOut className="w-4 h-4 md:w-5 md:h-5" /> {campaignMode === 'LEVELS' ? (language === 'RU' ? 'ВЫБОР УРОВНЕЙ' : 'LEVELS MENU') : (t.BTN_MENU || 'MENU')}
                                    </button>
                                </>
                            )}
                        </div>

                        {/* Extra Visual Detail */}
                        <div className="mt-6 md:mt-12 text-[6px] md:text-[8px] font-mono opacity-20 uppercase tracking-[0.5em] md:tracking-[1em] text-center w-full shrink-0">
                            ENCRYPTION_KEY::0x7F2A_C0DE_NEBULA
                        </div>
                    </div>
                </div>
            )}

            {/* MONUMENT DIALOG */}
            {monumentDialogState.isOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 md:p-4 animate-in fade-in duration-300 pointer-events-auto">
                    <div className="bg-slate-950 border border-amber-900/50 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl max-w-2xl w-full max-h-[95vh] md:max-h-[90vh] relative overflow-hidden flex flex-col gap-4 md:gap-6 animate-in zoom-in-95">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <button onClick={closeMonumentDialog} className="absolute top-3 right-3 md:top-4 md:right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-5 h-5 md:w-6 h-6"/></button>
                        <div className="flex items-center gap-3 md:gap-4 border-b border-slate-800 pb-3 md:pb-4 shrink-0">
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
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 md:p-4 animate-in fade-in duration-300 pointer-events-auto" onClick={closeVoidDialog}>
                    <div className="bg-slate-950 border border-red-900/50 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-2xl max-w-lg w-full max-h-[95vh] md:max-h-[90vh] relative overflow-hidden flex flex-col gap-4 md:gap-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <button onClick={closeVoidDialog} className="absolute top-3 right-3 md:top-4 md:right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-5 h-5 md:w-6 h-6"/></button>
                        <div className="flex items-center gap-3 md:gap-4 border-b border-slate-800 pb-3 md:pb-4 shrink-0">
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
        </>
    );
};

export default GameDialogs;
