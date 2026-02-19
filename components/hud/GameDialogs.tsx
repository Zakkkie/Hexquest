
import React, { useMemo } from 'react';
import { useGameStore } from '../../store';
import { TEXT } from '../../services/i18n';
import { CAMPAIGN_LEVELS } from '../../campaign/levels';
import { ITEM_REGISTRY, getItemDef } from '../../rules/items';
import { LogOut, X, Trophy, XCircle, ArrowRight, RotateCcw, Target, ChevronsUp, Wallet, Footprints, ShieldAlert, Swords, Crown, Zap, HelpCircle, AlertTriangle, CheckCircle, Trash2, BookOpen, Lock } from 'lucide-react';
import { ItemIcon, resolveItemText, getRarityBorder } from './HudShared';
import { Item, ItemRarity } from '../../types';

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
    const session = useGameStore(state => state.session);
    const language = useGameStore(state => state.language);
    const playUiSound = useGameStore(state => state.playUiSound);
    const user = useGameStore(state => state.user);
    const leaderboard = useGameStore(state => state.leaderboard);
    
    // Actions
    const abandonSession = useGameStore(state => state.abandonSession);
    const startMission = useGameStore(state => state.startMission);
    const startNewGame = useGameStore(state => state.startNewGame);
    const startCampaignLevel = useGameStore(state => state.startCampaignLevel);
    const destroyItem = useGameStore(state => state.destroyItem);
    
    // Monument/Void Specifics
    const monumentDialogState = useGameStore(state => state.monumentDialogState);
    const monumentRequirements = useGameStore(state => state.session?.monumentRequirements);
    const closeMonumentDialog = useGameStore(state => state.closeMonumentDialog);
    const removeItemFromMonument = useGameStore(state => state.removeItemFromMonument);
    const activateMonument = useGameStore(state => state.activateMonument);
    const placeItemInMonument = useGameStore(state => state.placeItemInMonument);
    
    const voidDialogTarget = useGameStore(state => state.voidDialogTarget);
    const closeVoidDialog = useGameStore(state => state.closeVoidDialog);
    const restoreVoidHex = useGameStore(state => state.restoreVoidHex);

    const t = TEXT[language].HUD;
    const player = session?.player;
    const bots = session?.bots;
    const winCondition = session?.winCondition;
    const activeLevelConfig = session?.activeLevelConfig;
    const gameStatus = session?.gameStatus;
    const difficulty = session?.difficulty;

    // --- LOGIC ---

    const handleNextLevel = () => {
        playUiSound('CLICK');
        if (activeLevelConfig) {
            const currentIdx = CAMPAIGN_LEVELS.findIndex(l => l.id === activeLevelConfig.id);
            const nextLevel = CAMPAIGN_LEVELS[currentIdx + 1];
            if (nextLevel) startCampaignLevel(nextLevel.id);
            else abandonSession(); 
        } else {
            abandonSession();
        }
    };

    const handleRetry = () => {
        playUiSound('CLICK');
        if (activeLevelConfig) startCampaignLevel(activeLevelConfig.id);
        else if (winCondition) startNewGame(winCondition);
        else abandonSession();
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
            if (reqId !== 'ANY' && item.baseId !== reqId) { playUiSound('ERROR'); return; }
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
        briefingTitle = TEXT[language].CAMPAIGN[titleKey] || activeLevelConfig.title;
        briefingDesc = TEXT[language].CAMPAIGN[descKey] || activeLevelConfig.description;
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
                    <div className="bg-slate-900 border border-red-900/50 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                        <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30"><LogOut className="w-6 h-6 text-red-500" /></div>
                        <h3 className="text-lg font-black text-white uppercase mb-2">{t.ABORT_TITLE}</h3>
                        <p className="text-xs text-slate-400 mb-6">{t.ABORT_DESC}</p>
                        <div className="flex gap-3">
                            <button onClick={() => { closeModal(); playUiSound('CLICK'); }} className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-xs transition-colors">{t.BTN_CANCEL}</button>
                            <button onClick={() => { abandonSession(); playUiSound('CLICK'); }} className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs transition-colors shadow-lg shadow-red-900/20">{t.BTN_CONFIRM}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MISSION BRIEFING / DETAILS */}
            {(activeModal === 'MISSION' || gameStatus === 'BRIEFING') && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-6 pointer-events-auto animate-in fade-in duration-300">
                    <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col gap-6 p-6 animate-in zoom-in-95">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                        <button onClick={() => gameStatus === 'BRIEFING' ? startMission() : closeModal()} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-6 h-6"/></button>
                        <div className="flex flex-col items-center text-center mt-2">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-800 shadow-inner"><Target className="w-8 h-8 text-indigo-400" /></div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{briefingTitle}</h2>
                            <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${difficulty === 'HARD' ? 'bg-red-900/30 text-red-400' : 'bg-amber-900/30 text-amber-400'}`}>{difficulty || 'NORMAL'}</span>
                                {bots && bots.length > 0 && <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-900/20 text-red-400 border border-red-900/30 flex items-center gap-1"><Swords className="w-3 h-3"/> {t.BRIEFING_RIVAL}</span>}
                            </div>
                        </div>
                        <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 max-h-[40vh] overflow-y-auto no-scrollbar">
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">{briefingDesc}</p>
                        </div>
                        <button onClick={() => gameStatus === 'BRIEFING' ? startMission() : closeModal()} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl uppercase tracking-widest shadow-xl transition-all active:scale-95">{gameStatus === 'BRIEFING' ? t.BRIEFING_BTN_START : t.BTN_READY}</button>
                    </div>
                </div>
            )}

            {/* RANKINGS */}
            {activeModal === 'RANKINGS' && (
                <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={closeModal}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                            <div className="flex items-center gap-3"><Trophy className="w-5 h-5 text-amber-500" /><h3 className="text-sm font-black uppercase tracking-widest text-white">{t.MINI_LB_TITLE}</h3></div>
                            <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                            {liveRankings.length === 0 ? <div className="p-8 text-center text-slate-500 text-xs font-mono">{t.MINI_LB_EMPTY}</div> : 
                                <div className="flex flex-col gap-1">{liveRankings.map((entry, idx) => (
                                    <div key={entry.id} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border ${entry.isPlayer ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                                        <div className="col-span-1 flex justify-center"><div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${idx === 0 ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400'}`}>{idx + 1}</div></div>
                                        <div className="col-span-5 flex items-center gap-2 overflow-hidden"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div><span className={`text-xs font-bold truncate ${entry.isPlayer ? 'text-indigo-300' : 'text-slate-300'}`}>{entry.nickname}</span></div>
                                        <div className="col-span-2 text-right"><span className="text-xs font-mono text-emerald-400 font-bold">L{entry.level}</span></div>
                                        <div className="col-span-2 text-right"><span className="text-xs font-mono text-amber-400 font-bold">{entry.coins}</span></div>
                                        <div className="col-span-2 text-right"><span className="text-xs font-mono text-blue-400 font-bold">{entry.moves}</span></div>
                                    </div>
                                ))}</div>
                            }
                        </div>
                    </div>
                </div>
            )}

            {/* CODEX */}
            {activeModal === 'CODEX' && (
                <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={closeModal}>
                    <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md md:max-w-2xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                            <div className="flex items-center gap-3"><BookOpen className="w-5 h-5 text-purple-500" /><h3 className="text-sm font-black uppercase tracking-widest text-white">{language === 'RU' ? 'База Предметов' : 'Item Codex'}</h3></div>
                            <button onClick={closeModal} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
                            {(['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'] as const).map(rarity => {
                                const items = ITEM_REGISTRY.filter(i => i.rarity === rarity);
                                if (items.length === 0) return null;
                                return (
                                    <div key={rarity}>
                                        <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 border-b pb-1 ${rarity === 'COMMON' ? 'text-slate-400 border-slate-700' : rarity === 'UNCOMMON' ? 'text-emerald-400 border-emerald-900' : rarity === 'RARE' ? 'text-purple-400 border-purple-900' : 'text-amber-400 border-amber-900'}`}>{rarity}</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {items.map(def => (
                                                <div key={def.idPrefix} className="flex gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-900 transition-colors">
                                                    <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0 ${getRarityBorder(def.rarity)}`}><ItemIcon def={def} size="w-8 h-8 md:w-10 md:h-10" /></div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between mb-0.5"><span className="text-xs font-bold text-white truncate">{def.name[language]}</span></div>
                                                        <p className="text-[9px] text-slate-500 italic mb-2 line-clamp-2 leading-tight">"{def.description[language]}"</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* HELP */}
            {helpTopic && helpData && (
                <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={closeHelp}>
                    <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-black text-white uppercase mb-2 text-center">{helpData.title}</h3>
                        <p className="text-xs text-slate-400 mb-4 text-center leading-relaxed">{helpData.desc}</p>
                        {(helpData as any).extra ? <div className="flex flex-col gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4">{(helpData as any).extra.map((line: string, i: number) => <p key={i} className="text-[10px] text-slate-300 font-mono leading-tight border-l-2 border-indigo-500 pl-2 py-1">{line}</p>)}</div> : <div className="bg-slate-800 p-2 rounded text-xs font-mono text-emerald-400 text-center mb-4">{helpData.hint}</div>}
                        <div className="flex justify-center mt-2"><button onClick={closeHelp} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-wider py-2 px-4 rounded hover:bg-slate-800 transition-colors">Close</button></div>
                    </div>
                </div>
            )}

            {/* ITEM INSPECTION */}
            {inspectedItem && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 pointer-events-auto animate-in fade-in duration-200" onClick={closeInspect}>
                    <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden flex flex-col gap-6 p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <button onClick={closeInspect} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-6 h-6"/></button>
                        {(() => {
                            const data = resolveItemText(inspectedItem, language);
                            return (
                                <>
                                    <div className="flex flex-col items-center">
                                        <div className="w-32 h-32 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-inner"><ItemIcon item={inspectedItem} size="w-24 h-24" /></div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight text-center">{data.name}</h3>
                                        <span className={`text-xs font-bold uppercase mt-1 px-2 py-0.5 rounded-full bg-slate-900 border ${getRarityBorder(inspectedItem.rarity)} text-slate-300`}>{inspectedItem.rarity}</span>
                                    </div>
                                    <p className="text-sm text-slate-400 text-center italic leading-relaxed border-t border-b border-slate-800 py-4">"{data.description}"</p>
                                    <div className="flex flex-col gap-3">
                                        <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50"><CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /><div><span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">Success</span><span className="text-xs text-emerald-100 font-mono">{data.effectDesc}</span></div></div>
                                        {inspectedItem.negativeEffectType && <div className="flex items-start gap-3 p-3 rounded-xl bg-red-950/30 border border-red-900/50"><AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" /><div><span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-0.5">Failure</span><span className="text-xs text-red-100 font-mono">{data.negDesc}</span></div></div>}
                                    </div>
                                    <div className="flex gap-3 mt-2"><button onClick={() => { destroyItem(inspectedItem.id); closeInspect(); }} className="flex-1 py-3 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-800 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 group"><Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Discard</button><button onClick={closeInspect} className="flex-1 py-3 bg-white text-black hover:bg-slate-200 rounded-xl font-black uppercase tracking-wider text-xs transition-colors">Close</button></div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* VICTORY / DEFEAT */}
            {(gameStatus === 'DEFEAT' || (gameStatus === 'VICTORY' && victoryStage === 'MODAL')) && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-700 pointer-events-auto p-4">
                    <div className="flex flex-col items-center max-w-md w-full">
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_currentColor] animate-bounce ${gameStatus === 'VICTORY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>{gameStatus === 'VICTORY' ? <Trophy className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}</div>
                        <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 text-transparent bg-clip-text ${gameStatus === 'VICTORY' ? 'bg-gradient-to-b from-emerald-300 to-emerald-600' : 'bg-gradient-to-b from-red-300 to-red-600'}`}>{gameStatus === 'VICTORY' ? t.VICTORY : t.DEFEAT}</h1>
                        <p className="text-slate-400 font-mono text-sm tracking-widest uppercase mb-8">{gameStatus === 'VICTORY' ? t.MISSION_COMPLETE : t.MISSION_FAILED}</p>
                        <div className="w-full flex flex-col gap-3">
                            {gameStatus === 'VICTORY' && <button onClick={handleNextLevel} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-900/30 transition-all active:scale-95 flex items-center justify-center gap-2">{t.BTN_NEXT} <ArrowRight className="w-5 h-5" /></button>}
                            <button onClick={handleRetry} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"><RotateCcw className="w-4 h-4" /> {t.BTN_RETRY}</button>
                            <button onClick={() => abandonSession()} className="w-full py-4 bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-white font-bold rounded-xl uppercase tracking-widest transition-colors text-xs">{t.BTN_MENU}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MONUMENT DIALOG */}
            {monumentDialogState.isOpen && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300 pointer-events-auto">
                    <div className="bg-slate-950 border border-amber-900/50 p-6 rounded-3xl shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col gap-6 animate-in zoom-in-95">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <button onClick={closeMonumentDialog} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-6 h-6"/></button>
                        <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                            <div className="p-3 bg-amber-950/50 rounded-xl border border-amber-900/50 shadow-inner"><Crown className="w-8 h-8 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" /></div>
                            <div><h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{t.MONUMENT_TITLE}</h3><p className="text-xs text-amber-600 uppercase tracking-widest font-mono mt-1">{t.MONUMENT_SUB}</p></div>
                        </div>
                        <div className="flex flex-col md:flex-row gap-6 h-[300px]">
                            <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
                                <div className="p-2 border-b border-slate-800 bg-slate-900"><span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{t.MONUMENT_KEYS}</span></div>
                                <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                                    {availableInventory.length === 0 ? <div className="text-center text-slate-600 text-xs italic py-10">{t.MONUMENT_EMPTY_INV}</div> : availableInventory.map(item => (
                                        <div key={item.id} draggable onDragStart={(e) => e.dataTransfer.setData("itemId", item.id)} onClick={() => { 
                                            // Auto-add logic
                                            const reqs = monumentRequirements || Array(3).fill('ANY');
                                            const idx = reqs.findIndex((r, i) => (r === 'ANY' || r === item.baseId) && !monumentDialogState.slots[i]);
                                            if (idx !== -1) placeItemInMonument(item, idx);
                                        }} className={`flex items-center gap-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border cursor-grab active:cursor-grabbing group transition-all ${getRarityBorder(item.rarity)}`}>
                                            <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center border border-slate-800 overflow-hidden"><ItemIcon item={item} size="w-8 h-8" /></div>
                                            <div className="flex flex-col min-w-0"><span className="text-xs font-bold text-white group-hover:text-amber-200 truncate">{resolveItemText(item, language).name}</span><span className="text-[9px] text-slate-500 uppercase">{item.rarity}</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex-[1.2] flex flex-col justify-center items-center gap-4 relative">
                                <div className="flex gap-4 relative z-10 flex-wrap justify-center">
                                    {(monumentRequirements || Array(3).fill('ANY')).map((reqId, idx) => {
                                        const slotItem = monumentDialogState.slots[idx];
                                        const isWildcard = reqId === 'ANY';
                                        const reqDef = !isWildcard ? getItemDef(reqId) : undefined;
                                        return (
                                            <div key={idx} onDrop={(e) => handleDrop(e, idx)} onDragOver={handleAllowDrop} onClick={() => slotItem && removeItemFromMonument(idx)} className={`w-16 h-20 md:w-24 md:h-32 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden ${slotItem ? `bg-slate-900 ${getRarityBorder(slotItem.rarity)}` : 'bg-slate-900/30 border-slate-700 border-dashed hover:border-slate-500'}`}>
                                                {slotItem ? <ItemIcon item={slotItem} size="w-10 h-10 md:w-16 md:h-16" /> : (
                                                    isWildcard ? <HelpCircle className="w-8 h-8 md:w-12 md:h-12 text-slate-400 opacity-60" /> : 
                                                    (reqDef ? (
                                                        <div className="relative">
                                                            <ItemIcon def={reqDef} size="w-8 h-8 md:w-12 md:h-12" opacity={0.4} grayscale />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <Lock className="w-4 h-4 md:w-6 md:h-6 text-slate-500" />
                                                            </div>
                                                            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[8px] text-center text-slate-300 font-mono">REQ</div>
                                                        </div>
                                                    ) : null)
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="w-full px-4">
                                    <button onClick={activateMonument} disabled={!isMonumentReady} className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2 ${isMonumentReady ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white' : 'bg-slate-800 text-slate-500 cursor-not-allowed grayscale'}`}>
                                        {isMonumentReady ? <><Zap className="w-5 h-5 fill-current" /> {t.MONUMENT_BTN_ACTIVE}</> : t.MONUMENT_BTN_INACTIVE}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* VOID DIALOG */}
            {voidDialogTarget && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300 pointer-events-auto" onClick={closeVoidDialog}>
                    <div className="bg-slate-950 border border-red-900/50 p-6 rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col gap-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <button onClick={closeVoidDialog} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-6 h-6"/></button>
                        <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                            <div className="p-3 bg-red-950/50 rounded-xl border border-red-900/50 shadow-inner animate-pulse"><AlertTriangle className="w-8 h-8 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" /></div>
                            <div><h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{t.VOID_TITLE}</h3><p className="text-xs text-red-400 uppercase tracking-widest font-mono mt-1">{t.VOID_SUB}</p></div>
                        </div>
                        <p className="text-sm text-slate-400 leading-relaxed text-center px-4">{t.VOID_DESC}<br/><span className="text-xs text-red-400 font-bold mt-2 block">{t.VOID_WARN}</span></p>
                        <div className="bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col overflow-hidden max-h-[300px]">
                            <div className="p-2 border-b border-slate-800 bg-slate-900"><span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{t.VOID_SELECT}</span></div>
                            <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                                {player?.inventory.length === 0 ? <div className="text-center text-slate-600 text-xs italic py-10">{t.VOID_EMPTY}</div> : player?.inventory.map(item => (
                                    <div key={item.id} onClick={() => restoreVoidHex(item.id)} className={`flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border cursor-pointer group transition-all ${getRarityBorder(item.rarity)}`}>
                                        <div className="w-10 h-10 rounded bg-slate-950 flex items-center justify-center border border-slate-800 overflow-hidden shrink-0"><ItemIcon item={item} size="w-10 h-10" /></div>
                                        <div className="flex flex-col min-w-0 flex-1"><span className="text-xs font-bold text-white group-hover:text-red-200 truncate">{resolveItemText(item, language).name}</span><span className="text-[9px] text-slate-500 uppercase">{item.rarity}</span></div>
                                        <div className="px-3 py-1 bg-red-900/20 border border-red-900/50 rounded text-[9px] text-red-400 font-bold uppercase whitespace-nowrap group-hover:bg-red-900/40 transition-colors">{t.VOID_BTN_SACRIFICE}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default GameDialogs;
