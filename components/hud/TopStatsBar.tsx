
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store';
import { TEXT } from '../../services/i18n';
import { Crown, Box, Wallet, Footprints, Settings, X, Music, VolumeX, Volume2, Globe, BookOpen, Trophy, FileText, LogOut, Clock, RotateCcw } from 'lucide-react';
import EntropyGauge from '../EntropyGauge';
import { StorageBlocks } from './HudShared';

interface TopStatsBarProps {
    onOpenModal: (modal: 'EXIT' | 'RANKINGS' | 'CODEX' | 'LOG' | 'RESTART') => void;
    setHelpTopic: (topic: 'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY') => void;
}

const TopStatsBar: React.FC<TopStatsBarProps> = ({ onOpenModal, setHelpTopic }) => {
    const player = useGameStore(state => state.session?.player);
    const gameStatus = useGameStore(state => state.session?.gameStatus);
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const sessionStartTime = useGameStore(state => state.session?.sessionStartTime);
    const entropy = useGameStore(state => state.session?.entropy);
    
    const language = useGameStore(state => state.language);
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
                    <div className="pointer-events-auto flex items-center bg-slate-950/80 backdrop-blur-xl rounded-xl md:rounded-[1.25rem] border border-slate-800/80 shadow-[0_10px_40px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.05),inset_0_-1px_1px_rgba(0,0,0,0.8)] px-2.5 py-1.5 md:px-4 md:py-2.5 gap-2 md:gap-5 transition-all duration-300 hover:border-indigo-500/30 overflow-x-auto no-scrollbar mask-linear-fade w-full md:w-fit md:shrink-0">
                        
                        {/* RANK widget */}
                        <div onClick={() => { setHelpTopic('RANK'); playUiSound('CLICK'); }} className="relative flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0 pr-1 select-none">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-xl bg-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.4)] group-hover:scale-105 group-hover:shadow-[0_0_25px_rgba(99,102,241,0.6)] transition-all">
                                <Crown className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[7.5px] md:text-[8.5px] text-indigo-300 font-extrabold uppercase tracking-[0.15em] leading-none mb-1 break-words whitespace-pre-wrap">{t.RANK}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs md:text-lg font-black text-white leading-none font-mono">{player.playerLevel}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shadow-[0_0_6px_#818cf8] animate-pulse" />
                                </div>
                            </div>
                        </div>

                        <div className="w-px h-5 md:h-8 bg-slate-800/80 shrink-0"></div>

                        {/* MATERIAL widget */}
                        <div onClick={() => { setHelpTopic('MATERIAL'); playUiSound('CLICK'); }} className="relative flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0 pr-1 select-none">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all">
                                <Box className="w-3.5 h-3.5 md:w-5 md:h-5 text-emerald-400" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[7.5px] md:text-[8.5px] text-emerald-400 font-extrabold uppercase tracking-[0.15em] leading-none mb-1 break-words whitespace-pre-wrap">{t.MATERIAL}</span>
                                <div className="flex items-center gap-1.5">
                                    <StorageBlocks current={player.storage} max={player.maxStorage} />
                                    <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_6px_#34d399] ${player.storage >= player.maxStorage ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                </div>
                            </div>
                        </div>

                        <div className="w-px h-5 md:h-8 bg-slate-800/80 shrink-0"></div>

                        {/* CREDITS widget */}
                        <div onClick={() => { setHelpTopic('COINS'); playUiSound('CLICK'); }} className="relative flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0 pr-1 select-none">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/30 group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.2)] transition-all">
                                <Wallet className="w-3.5 h-3.5 md:w-5 md:h-5 text-amber-400" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[7.5px] md:text-[8.5px] text-amber-400 font-extrabold uppercase tracking-[0.15em] leading-none mb-1 break-words whitespace-pre-wrap">{t.CREDITS}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs md:text-lg font-black text-white leading-none font-mono">{player.coins}</span>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse" />
                                </div>
                            </div>
                        </div>

                        <div className="w-px h-5 md:h-8 bg-slate-800/80 shrink-0"></div>

                        {/* MOVES widget */}
                        <div onClick={() => { setHelpTopic('MOVES'); playUiSound('CLICK'); }} className="relative flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0 pr-1 select-none">
                            <div className={`w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105 ${isMoving ? 'bg-blue-600 border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-blue-500/10 border-blue-500/30 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.2)]'}`}>
                                <Footprints className={`w-3.5 h-3.5 md:w-5 md:h-5 ${isMoving ? 'text-white' : 'text-blue-400'}`} />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[7.5px] md:text-[8.5px] text-blue-400 font-extrabold uppercase tracking-[0.15em] leading-none mb-1 break-words whitespace-pre-wrap">{t.MOVES}</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs md:text-lg font-black text-white leading-none font-mono">{player.moves}</span>
                                    <span className={`w-1.5 h-1.5 rounded-full shadow-[0_0_6px_#60a5fa] ${player.moves === 0 ? 'bg-red-500 animate-ping' : 'bg-blue-400 animate-pulse'}`} />
                                </div>
                            </div>
                        </div>

                        <div className="w-px h-5 md:h-8 bg-slate-800/80 shrink-0"></div>

                        {/* ENTROPY widget */}
                        <div onClick={() => { setHelpTopic('ENTROPY'); playUiSound('CLICK'); }} className="relative flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0 pr-1 select-none">
                            <div className="w-6 h-6 md:w-10 md:h-10 rounded-md md:rounded-xl bg-slate-900 flex items-center justify-center border border-slate-700/80 shadow-inner group-hover:scale-105 group-hover:border-slate-500 transition-all">
                                <EntropyGauge className="w-5 h-5 md:w-8 md:h-8" />
                            </div>
                            <div className="flex flex-col justify-center font-mono">
                                <span className={`text-[7.5px] md:text-[8.5px] font-extrabold uppercase tracking-[0.15em] leading-none mb-1 break-words whitespace-pre-wrap ${
                                    entropy && entropy.current / entropy.max < 0.3 ? 'text-red-400' :
                                    entropy && entropy.current / entropy.max < 0.6 ? 'text-amber-400' :
                                    'text-emerald-400'
                                }`}>
                                    {entropy && entropy.current / entropy.max < 0.3 ? (language === 'RU' ? 'КРИТ' : 'CRIT') :
                                     entropy && entropy.current / entropy.max < 0.6 ? (language === 'RU' ? 'ПРЕД' : 'WARN') :
                                     (language === 'RU' ? 'НОРМ' : 'STABLE')}
                                </span>
                                <div className="flex items-center gap-1.5">
                                    <span className="text-xs md:text-sm font-black text-slate-100 leading-none">
                                        {entropy ? `${Math.floor((entropy.current / entropy.max) * 100)}%` : '--'}
                                    </span>
                                    {entropy && (
                                        <span className={`w-1.5 h-1.5 rounded-full shadow-md ${
                                            entropy.current / entropy.max < 0.3 ? 'bg-red-500 shadow-red-500 animate-ping' :
                                            entropy.current / entropy.max < 0.6 ? 'bg-amber-400 shadow-amber-400 animate-pulse' :
                                            'bg-emerald-400 shadow-emerald-400'
                                        }`} />
                                    )}
                                </div>
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

export default React.memo(TopStatsBar);
