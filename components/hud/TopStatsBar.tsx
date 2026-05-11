
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../../store';
import { TEXT } from '../../services/i18n';
import { Crown, Box, Wallet, Footprints, Settings, X, Music, VolumeX, Volume2, Globe, BookOpen, Trophy, FileText, LogOut, Clock, RotateCcw, Info, Mountain } from 'lucide-react';
import EntropyGauge from '../EntropyGauge';
import { StorageBlocks } from './HudShared';
import { getHexKey } from '../../services/hexUtils';
import { Hex } from '../../types';

interface TopStatsBarProps {
    onOpenModal: (modal: 'EXIT' | 'RANKINGS' | 'CODEX' | 'LOG' | 'RESTART' | 'MISSION') => void;
    setHelpTopic: (topic: 'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY') => void;
}

const TopStatsBar: React.FC<TopStatsBarProps> = ({ onOpenModal, setHelpTopic }) => {
    const player = useGameStore(state => state.session?.player);
    const gameStatus = useGameStore(state => state.session?.gameStatus);
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const sessionStartTime = useGameStore(state => state.session?.sessionStartTime);
    const entropy = useGameStore(state => state.session?.entropy);
    
    const language = useGameStore(state => state.language);
    const grid = useGameStore(state => state.session?.grid);
    const winCondition = useGameStore(state => state.session?.winCondition);
    const currentTurn = useGameStore(state => state.session?.currentTurn);
    const isMusicMuted = useGameStore(state => state.isMusicMuted);
    const isSfxMuted = useGameStore(state => state.isSfxMuted);
    
    const setLanguage = useGameStore(state => state.setLanguage);
    const toggleMusic = useGameStore(state => state.toggleMusic);
    const toggleSfx = useGameStore(state => state.toggleSfx);
    const playUiSound = useGameStore(state => state.playUiSound);
    const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
    const systemMenuRef = useRef<HTMLDivElement>(null);
    const [timeLeft, setTimeLeft] = useState(75);

    const t = TEXT[language].HUD;
    const isMoving = player?.state === 'MOVING';
    const isLevel1_5 = activeLevelConfig?.id === '1.5';
    const isLevel3_2 = activeLevelConfig?.id === '3.2';

    // Campaign Metrics
    const campaignMetrics = useMemo(() => {
        if (!grid || !player || !activeLevelConfig) return null;
        const levelId = activeLevelConfig.id;
        const ownedByLevel = (minLvl: number) =>
            Object.values(grid).filter((h: Hex) => h.ownerId === player.id && h.maxLevel >= minLvl).length;

        if (levelId === '1.1') return { current: Math.max(0, ownedByLevel(1) - 1), target: 3, label: TEXT[language].HUD.TUT_1_1_COUNTER };
        if (levelId === '1.3') return { current: grid[getHexKey(0, 0)]?.maxLevel ?? 0, target: 2, label: 'LEVEL' };
        if (levelId === '1.4') return { current: grid[getHexKey(0, 0)]?.maxLevel ?? 0, target: 3, label: 'LEVEL' };
        if (levelId === '1.5') return { current: player.coins, target: 150, label: TEXT[language].HUD.TUT_1_5_COUNTER };
        if (levelId === '1.6') return { current: player.playerLevel, target: 4, label: 'RANK' };
        if (levelId === '2.2') return { current: player.inventory?.length ?? 0, target: 2, label: 'ITEMS' };
        if (levelId === '2.3') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        if (levelId === '2.4') return { current: player.inventory?.length ?? 0, target: 2, label: 'ITEMS' };
        if (levelId === '2.5') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        if (levelId === '3.2') return { current: player.coins, target: 200, label: TEXT[language].HUD.TUT_1_5_COUNTER };
        if (levelId === '3.3') return { current: grid[getHexKey(0, 0)]?.maxLevel ?? 0, target: 3, label: 'LEVEL' };
        if (levelId === '3.4') return { current: player.coins, target: 100, label: TEXT[language].HUD.TUT_1_5_COUNTER };
        if (levelId === '3.5') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        if (levelId === '4.1') return { current: ownedByLevel(2), target: 3, label: 'L2 HEXES' };
        if (levelId === '4.3') return { current: ownedByLevel(3), target: 2, label: 'L3 HEXES' };
        if (levelId === '4.4') return { current: grid[getHexKey(0, 0)]?.maxLevel ?? 0, target: 4, label: 'LEVEL' };
        if (levelId === '4.5') return { current: ownedByLevel(2), target: 6, label: 'L2 HEXES' };
        if (levelId === '4.6') return { current: ownedByLevel(3), target: 8, label: 'L3 HEXES' };
        if (levelId === '4.7') return { current: ownedByLevel(4), target: 2, label: 'L4 HEXES' };

        return null;
    }, [grid, player, activeLevelConfig, language, currentTurn]);

    const renderMissionStatus = () => {
        if (campaignMetrics) {
            const isDone = campaignMetrics.current >= campaignMetrics.target;
            return (
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 uppercase tracking-tighter">{campaignMetrics.label}:</span>
                    <span className={isDone ? "text-emerald-400" : "text-white"}>
                        {campaignMetrics.current}/{campaignMetrics.target}
                    </span>
                </div>
            );
        }
        if (activeLevelConfig?.goalText) {
            return (
                <div className="flex items-center gap-2 overflow-hidden">
                    <span className="text-slate-400 shrink-0 tracking-tighter">GOAL:</span>
                    <span className="text-amber-300 truncate min-w-0">{activeLevelConfig.goalText}</span>
                </div>
            );
        }
        if (winCondition?.winType === 'SUMMIT') {
            return (
                <div className="flex items-center gap-2">
                    <span className="text-slate-400 tracking-tighter">SUMMIT:</span>
                    <span className="text-amber-400">L{winCondition?.targetLevel}</span>
                    <Mountain className="w-3 h-3 text-amber-500" />
                </div>
            );
        }
        return (
            <div className="flex items-center gap-2">
                <span className="text-slate-400 tracking-tighter">GOAL:</span>
                <span className="text-white">L{winCondition?.targetLevel}</span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400">{winCondition?.targetCoins}cr</span>
            </div>
        );
    };

    // Click Outside for System Menu
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (systemMenuRef.current && !systemMenuRef.current.contains(event.target as Node)) {
                setIsSystemMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Timer Logic for L1.5 and L3.2
    useEffect(() => {
        const isTimedLevel = isLevel1_5 || isLevel3_2;
        if (isTimedLevel && gameStatus === 'PLAYING') {
            const timeLimit = isLevel3_2 ? 180 : 75; // 3 minutes for 3.2, 75s for 1.5
            const interval = setInterval(() => {
                const elapsed = Date.now() - (sessionStartTime || 0);
                const remaining = Math.max(0, timeLimit - Math.floor(elapsed / 1000));
                setTimeLeft(remaining);
            }, 250);
            return () => clearInterval(interval);
        }
    }, [isLevel1_5, isLevel3_2, gameStatus, sessionStartTime]);

    if (!player) return null;

    return (
        <div className="absolute inset-x-0 top-0 p-2 md:p-4 pointer-events-none z-30 pt-[max(0.5rem,env(safe-area-inset-top))] animate-in fade-in">
            {/* Timer Overlay */}
            {(isLevel1_5 || isLevel3_2) && gameStatus === 'PLAYING' && (
                <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in slide-in-from-top-4">
                    <div className={`px-4 py-2 bg-slate-900/90 border-2 rounded-xl shadow-xl flex items-center gap-2 ${timeLeft < 10 ? 'border-red-500 animate-pulse' : 'border-slate-600'}`}>
                        <Clock className={`w-5 h-5 ${timeLeft < 10 ? 'text-red-500' : 'text-amber-400'}`} />
                        <span className={`text-xl font-black font-mono leading-none ${timeLeft < 10 ? 'text-red-400' : 'text-white'}`}>
                            {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                        </span>
                    </div>
                </div>
            )}

            <div className="w-full flex justify-between items-start gap-2 md:gap-4 max-w-7xl mx-auto relative pointer-events-none">
                
                {/* STATS STRIP */}
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="pointer-events-auto flex items-center bg-slate-900/95 backdrop-blur-xl rounded-xl md:rounded-2xl border border-slate-700/50 shadow-xl px-2 py-1.5 md:px-3 md:py-2 gap-1.5 md:gap-4 transition-all duration-300 hover:border-slate-600/50 overflow-x-auto no-scrollbar mask-linear-fade w-full md:w-fit md:shrink-0">
                        <div onClick={() => { setHelpTopic('RANK'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                                <Crown className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5 break-words whitespace-pre-wrap">{t.RANK}</span>
                                <span className="text-sm md:text-xl font-black text-white leading-none">{player.playerLevel}</span>
                            </div>
                        </div>
                        <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0"></div>
                        <div onClick={() => { setHelpTopic('MATERIAL'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-500/20 transition-colors">
                                <Box className="w-3.5 h-3.5 md:w-5 md:h-5 text-emerald-400" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5 break-words whitespace-pre-wrap">{t.MATERIAL}</span>
                                <StorageBlocks current={player.storage} max={player.maxStorage} />
                            </div>
                        </div>
                        <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0"></div>
                        <div onClick={() => { setHelpTopic('COINS'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                                <Wallet className="w-3.5 h-3.5 md:w-5 md:h-5 text-amber-400" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5 break-words whitespace-pre-wrap">{t.CREDITS}</span>
                                <span className="text-sm md:text-xl font-black text-white leading-none">{player.coins}</span>
                            </div>
                        </div>
                        <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0"></div>
                        <div onClick={() => { setHelpTopic('MOVES'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0 pr-1">
                            <div className={`w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-lg flex items-center justify-center transition-colors ${isMoving ? 'bg-blue-600 animate-pulse' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                                <Footprints className={`w-3.5 h-3.5 md:w-5 md:h-5 ${isMoving ? 'text-white' : 'text-blue-400'}`} />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5 break-words whitespace-pre-wrap">{t.MOVES}</span>
                                <span className="text-sm md:text-xl font-black text-white leading-none">{player.moves}</span>
                            </div>
                        </div>
                        <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0"></div>
                        <div onClick={() => { setHelpTopic('ENTROPY'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                                <EntropyGauge className="w-5 h-5 md:w-8 md:h-8" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className={`text-[8px] md:text-[9px] font-bold uppercase tracking-wider leading-none mb-0.5 break-words whitespace-pre-wrap ${
                                    entropy && entropy.current / entropy.max < 0.3 ? 'text-red-400' :
                                    entropy && entropy.current / entropy.max < 0.6 ? 'text-amber-400' :
                                    'text-slate-400'
                                }`}>
                                    {entropy && entropy.current / entropy.max < 0.3 ? 'CRIT' :
                                     entropy && entropy.current / entropy.max < 0.6 ? 'WARN' :
                                     'STABLE'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* MISSION STATUS ROW */}
                    <div className="pointer-events-auto flex items-center bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-700/50 px-2 py-1 gap-3 max-w-full md:w-fit overflow-hidden animate-in slide-in-from-top-2">
                        <div 
                            onClick={() => { onOpenModal('MISSION'); playUiSound('CLICK'); }}
                            className="flex items-center gap-2 cursor-pointer group"
                        >
                            <div className="flex-1 text-[10px] md:text-[11px] font-black font-mono overflow-hidden">
                                {renderMissionStatus()}
                            </div>
                            <div className="w-5 h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-indigo-600 transition-colors shrink-0">
                                <Info className="w-3 h-3 text-slate-400 group-hover:text-white" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* SYSTEM MENU */}
                <div className="pointer-events-auto flex items-start shrink-0 relative z-50">
                    <div className="relative">
                        <button onClick={() => { setIsSystemMenuOpen(!isSystemMenuOpen); playUiSound('CLICK'); }} className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center backdrop-blur-xl border rounded-xl transition-all shadow-lg active:scale-95 ${isSystemMenuOpen ? 'bg-slate-800 border-slate-500 text-white' : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:text-white'}`}>
                            {isSystemMenuOpen ? <X className="w-5 h-5 md:w-5 md:h-5" /> : <Settings className="w-5 h-5 md:w-5 md:h-5" />}
                        </button>
                        {isSystemMenuOpen && (
                            <div ref={systemMenuRef} className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[180px] z-[60] animate-in slide-in-from-top-2 duration-200">
                                <div className="flex gap-2">
                                    <button onClick={() => { toggleMusic(); playUiSound('CLICK'); }} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isMusicMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-400'}`}>{isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}</button>
                                    <button onClick={() => { toggleSfx(); playUiSound('CLICK'); }} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isSfxMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'}`}>{isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                                </div>
                                <button onClick={() => { setLanguage(language === 'EN' ? 'RU' : 'EN'); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600">
                                    <Globe className="w-4 h-4 text-sky-400" />
                                    <span className="text-xs font-bold uppercase break-words whitespace-pre-wrap">{language === 'EN' ? 'English' : 'Русский'}</span>
                                </button>
                                <button onClick={() => { onOpenModal('CODEX'); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600">
                                    <BookOpen className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-bold uppercase break-words whitespace-pre-wrap">{language === 'RU' ? 'База Предметов' : 'Item Codex'}</span>
                                </button>
                                <button onClick={() => { onOpenModal('RANKINGS'); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left border bg-slate-800/50 border-transparent hover:bg-slate-800 text-slate-300 hover:text-white`}>
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-bold uppercase break-words whitespace-pre-wrap">{t.LEADERBOARD_TITLE}</span>
                                </button>
                                <button onClick={() => { onOpenModal('LOG'); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-400 hover:text-indigo-200 border border-indigo-900/30 hover:border-indigo-500/50 transition-colors w-full text-left">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase break-words whitespace-pre-wrap">{language === 'RU' ? 'Журнал Событий' : 'Event Log'}</span>
                                </button>
                                <div className="h-px bg-slate-700/50 my-1"></div>
                                <button onClick={() => { onOpenModal('RESTART'); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-900/10 hover:bg-amber-900/30 text-amber-400 hover:text-amber-200 border border-amber-900/30 hover:border-amber-500/50 transition-colors w-full text-left">
                                    <RotateCcw className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase break-words whitespace-pre-wrap">{t.BTN_RETRY}</span>
                                </button>
                                <button onClick={() => { onOpenModal('EXIT'); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-900/10 hover:bg-red-900/30 text-red-400 hover:text-red-200 border border-red-900/30 hover:border-red-500/50 transition-colors w-full text-left">
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase break-words whitespace-pre-wrap">{t.BTN_MENU}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopStatsBar;
