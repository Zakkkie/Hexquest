
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../../store';
import { TEXT } from '../../services/i18n';
import { Crown, Box, Wallet, Coins, Footprints, Settings, X, Music, VolumeX, Volume2, Globe, BookOpen, Trophy, FileText, LogOut, RotateCcw, Zap, HelpCircle } from 'lucide-react';
import { motion } from 'motion/react';
import EntropyGauge from '../EntropyGauge';
import { StorageBlocks } from './HudShared';

interface TopStatsBarProps {
    onOpenModal: (modal: 'EXIT' | 'RANKINGS' | 'CODEX' | 'LOG' | 'RESTART') => void;
    setHelpTopic: (topic: 'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY') => void;
}

const TopStatsBar: React.FC<TopStatsBarProps> = ({ onOpenModal, setHelpTopic }) => {
    const playerExists = useGameStore(state => !!state.session?.player);
    const playerLevel = useGameStore(state => state.session?.player?.playerLevel ?? 0);
    const playerStorage = useGameStore(state => state.session?.player?.storage ?? 0);
    const playerMaxStorage = useGameStore(state => state.session?.player?.maxStorage ?? 0);
    const playerCoins = useGameStore(state => state.session?.player?.coins ?? 0);
    const playerMoves = useGameStore(state => state.session?.player?.moves ?? 0);
    const playerState = useGameStore(state => state.session?.player?.state);

    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const isLevel14 = activeLevelConfig?.id === '1.4';
    const entropyCurrent = useGameStore(state => state.session?.entropy?.current);
    const entropyMax = useGameStore(state => state.session?.entropy?.max);
    
    const player = playerExists ? {
        playerLevel,
        storage: playerStorage,
        maxStorage: playerMaxStorage,
        coins: playerCoins,
        moves: playerMoves,
        state: playerState
    } : null;

    const entropy = entropyCurrent !== undefined && entropyMax !== undefined ? {
        current: entropyCurrent,
        max: entropyMax
    } : undefined;
    
    const language = useGameStore(state => state.language);
    const isMusicMuted = useGameStore(state => state.isMusicMuted);
    const isSfxMuted = useGameStore(state => state.isSfxMuted);
    const isLiteMode = useGameStore(state => state.isLiteMode);
    
    const setLanguage = useGameStore(state => state.setLanguage);
    const toggleMusic = useGameStore(state => state.toggleMusic);
    const toggleSfx = useGameStore(state => state.toggleSfx);
    const toggleLiteMode = useGameStore(state => state.toggleLiteMode);
    const playUiSound = useGameStore(state => state.playUiSound);
    const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
    const systemMenuRef = useRef<HTMLDivElement>(null);
    const statsBarRef = useRef<HTMLDivElement>(null);
    const [isPinned, setIsPinned] = useState(false);

    // Tracking Material changes
    const [prevStorage, setPrevStorage] = useState(playerStorage);
    const [storageChanged, setStorageChanged] = useState<'gain' | 'drain' | null>(null);
    const [storageAnimKey, setStorageAnimKey] = useState(0);

    // Tracking Credits value changes 
    const [prevCoins, setPrevCoins] = useState(playerCoins);
    const [coinsChanged, setCoinsChanged] = useState<'gain' | 'drain' | null>(null);
    const [coinsAnimKey, setCoinsAnimKey] = useState(0);

    const [hoveredStat, setHoveredStat] = useState<'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY' | null>(null);

    const STAT_INFOS = {
        EN: {
            RANK: { title: "ENGINEER RANK", desc: "Limits maximum height you can construct.", theme: "text-indigo-400 border-indigo-500/30 bg-indigo-950/40" },
            MATERIAL: { title: "CONSTRUCTION MATERIAL", desc: "Collect by digging levels L >= 1. Used to build upwards.", theme: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40" },
            COINS: { title: "ENERGY CREDITS", desc: "Used to buy items or auto-buy movement turns (5cr = 1 turn).", theme: "text-amber-400 border-amber-500/30 bg-amber-950/40" },
            MOVES: { title: "MOVEMENT TURNS", desc: "Allows actions and footsteps. Dig deeper layers (L < 0) for moves.", theme: "text-blue-400 border-blue-500/30 bg-blue-950/40" },
            ENTROPY: { title: "STABILITY MONITOR", desc: "Core stability level. Crit state (<30%) risks rapid cave collapse.", theme: "text-rose-400 border-rose-500/30 bg-rose-950/40" }
        },
        RU: {
            RANK: { title: "РАНГ ИНЖЕНЕРА", desc: "Ограничивает максимальный уровень строительства гексов.", theme: "text-indigo-400 border-indigo-500/30 bg-indigo-950/40" },
            MATERIAL: { title: "МАТЕРИАЛЫ КОРПУСА", desc: "Добывайте копанием плит выше L >= 1. Тратятся на стройку.", theme: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40" },
            COINS: { title: "ЭНЕРГЕТИЧЕСКИЕ КРЕДИТЫ", desc: "Нужны для рынка и авто-конвертации в ходы (5 кр = 1 ход).", theme: "text-amber-400 border-amber-500/30 bg-amber-950/40" },
            MOVES: { title: "ЗАПАС ХОДОВ И ЗАДОРА", desc: "Очки действий. Бурите шахты в глубину (L < 0) для восполнения.", theme: "text-blue-400 border-blue-500/30 bg-blue-950/40" },
            ENTROPY: { title: "СТАБИЛЬНОСТЬ ЯДРА", desc: "Метрика распада. Крит (<30%) вызывает квантовый сдвиг и осыпь.", theme: "text-rose-400 border-rose-500/30 bg-rose-950/40" }
        }
    };

    const curLang = language === 'RU' ? 'RU' : 'EN';
    const activeStatTooltip = hoveredStat ? STAT_INFOS[curLang][hoveredStat] : null;

    const getTooltipPositionClass = (stat: 'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY') => {
        // Safe left-alignment on mobile to prevent any screen overflow
        switch (stat) {
            case 'RANK':
                return 'left-0 sm:left-2 md:left-4 origin-top-left';
            case 'MATERIAL':
                return 'left-0 sm:left-2 md:left-[15%] origin-top-left';
            case 'COINS':
                return 'left-0 sm:left-1/2 sm:-translate-x-1/2 origin-top-left sm:origin-top';
            case 'MOVES':
                return 'right-0 sm:right-2 md:left-[50%] md:-translate-x-1/2 origin-top-right';
            case 'ENTROPY':
                return 'right-0 sm:right-2 md:right-4 origin-top-right';
            default:
                return 'left-0 sm:left-1/2 sm:-translate-x-1/2 origin-top-left';
        }
    };

    const handleInteraction = (stat: 'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY', action: 'enter' | 'leave' | 'click') => {
        if (action === 'enter') {
            if (!isPinned) {
                setHoveredStat(stat);
            }
        } else if (action === 'leave') {
            if (!isPinned) {
                setHoveredStat(null);
            }
        } else if (action === 'click') {
            playUiSound('CLICK');
            if (hoveredStat === stat && isPinned) {
                setHoveredStat(null);
                setIsPinned(false);
            } else {
                setHoveredStat(stat);
                setIsPinned(true);
            }
        }
    };

    useEffect(() => {
        if (player) {
            if (player.storage !== prevStorage) {
                setStorageChanged(player.storage > prevStorage ? 'gain' : 'drain');
                setStorageAnimKey(prev => prev + 1);
                setPrevStorage(player.storage);
            }
        }
    }, [player?.storage, prevStorage]);

    useEffect(() => {
        if (player) {
            if (player.coins !== prevCoins) {
                setCoinsChanged(player.coins > prevCoins ? 'gain' : 'drain');
                setCoinsAnimKey(prev => prev + 1);
                setPrevCoins(player.coins);
            }
        }
    }, [player?.coins, prevCoins]);

    const t = TEXT[language].HUD;
    const isMoving = player?.state === 'MOVING';

    // Click Outside for System Menu and Stats Tooltips
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (systemMenuRef.current && !systemMenuRef.current.contains(event.target as Node)) {
                setIsSystemMenuOpen(false);
            }
            if (statsBarRef.current && !statsBarRef.current.contains(event.target as Node)) {
                setHoveredStat(null);
                setIsPinned(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!player) return null;

    return (
        <div className="absolute inset-x-0 top-0 p-2 md:p-4 pointer-events-none z-[60] pt-[calc(env(safe-area-inset-top)+12px)] sm:pt-[calc(env(safe-area-inset-top)+16px)] animate-in fade-in">
            <style>{`
                .stats-scroll-hide::-webkit-scrollbar { display: none; }
                .stats-scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
            `}</style>
            <div className="w-full flex justify-between items-start gap-2 md:gap-4 max-w-7xl mx-auto relative pointer-events-none">
                
                {/* STATS STRIP wrapper with relative bounding to prevent tooltip overflow */}
                <div className="flex flex-col gap-1 flex-1 min-w-0 md:flex-none md:w-fit relative pointer-events-auto" ref={statsBarRef} id="top-stats-bar">
                    <div className="flex items-center justify-between md:justify-start bg-slate-950/85 backdrop-blur-xl rounded-xl md:rounded-[1.25rem] border border-slate-800/80 shadow-[0_10px_35px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.05)] px-1.5 py-1 pt-1 md:pt-1 md:px-4 md:py-2 gap-1 md:gap-4 transition-all duration-300 hover:border-slate-700/60 overflow-x-auto overflow-y-hidden stats-scroll-hide w-full h-[38.2px] md:h-auto md:shrink-0 relative">
                        
                        {/* RANK widget */}
                        <div 
                            onClick={() => handleInteraction('RANK', 'click')}
                            onMouseEnter={() => handleInteraction('RANK', 'enter')}
                            onMouseLeave={() => handleInteraction('RANK', 'leave')}
                            onTouchStart={() => handleInteraction('RANK', 'enter')}
                            onTouchEnd={() => handleInteraction('RANK', 'leave')}
                            className="relative flex items-center gap-1.5 md:gap-2.5 cursor-pointer group shrink-0 pr-1 select-none py-0.5 transition-all duration-300 hover:bg-slate-900/30 px-1.5 rounded-lg border border-transparent hover:border-indigo-500/20"
                        >
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-indigo-600 flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.3)] group-hover:scale-110 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.5)] transition-all">
                                <Crown className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[7px] md:text-[8px] text-indigo-300 font-black uppercase tracking-wider leading-none mb-0.5 hidden sm:block">{t.RANK}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs md:text-base font-black text-white leading-none font-mono">{player.playerLevel}</span>
                                    <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                                </div>
                            </div>
                        </div>

                        <div className="w-px h-5 md:h-7 bg-slate-800/80 shrink-0 -mx-[5px]"></div>
                        {/* MATERIAL widget */}
                        <motion.div 
                            onClick={() => handleInteraction('MATERIAL', 'click')}
                            onMouseEnter={() => handleInteraction('MATERIAL', 'enter')}
                            onMouseLeave={() => handleInteraction('MATERIAL', 'leave')}
                            onTouchStart={() => handleInteraction('MATERIAL', 'enter')}
                            onTouchEnd={() => handleInteraction('MATERIAL', 'leave')}
                            animate={isLevel14 ? {
                                scale: [1, 1.05, 1],
                                borderColor: ['rgba(245,158,11,0.2)', 'rgba(245,158,11,1)', 'rgba(245,158,11,0.2)'],
                                boxShadow: [
                                    '0 0 4px rgba(245,158,11,0.1)',
                                    '0 0 16px rgba(245,158,11,0.5)',
                                    '0 0 4px rgba(245,158,11,0.1)'
                                ]
                            } : {}}
                            transition={isLevel14 ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' } : {}}
                            className={`relative flex items-center gap-1.5 md:gap-2.5 cursor-pointer group shrink-0 pr-1 select-none py-0.5 transition-all duration-300 hover:bg-slate-900/30 px-1.5 rounded-lg border ${
                                isLevel14 ? 'border-amber-500 bg-amber-500/10' : 'border-transparent hover:border-emerald-500/20'
                            }`}
                        >
                            <motion.div 
                                animate={
                                    storageChanged === 'gain'
                                        ? { scale: [1, 1.15, 1], borderColor: ['rgba(16,185,129,0.3)', 'rgba(16,185,129,1)', 'rgba(16,185,129,0.3)'], boxShadow: ['0px 0px 0px rgba(16,185,129,0)', '0px 0px 10px rgba(16,185,129,0.4)', '0px 0px 0px rgba(16,185,129,0)'] }
                                        : storageChanged === 'drain'
                                            ? { scale: [1, 1.15, 1], borderColor: ['rgba(16,185,129,0.3)', 'rgba(239,68,68,1)', 'rgba(16,185,129,0.3)'], boxShadow: ['0px 0px 0px rgba(239,68,68,0)', '0px 0px 10px rgba(239,68,68,0.4)', '0px 0px 0px rgba(239,68,68,0)'] }
                                            : {}
                                }
                                transition={{ duration: 0.5 }}
                                className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(16,185,129,0.2)] transition-all"
                            >
                                <Box className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
                            </motion.div>
                            <div className="flex flex-col justify-center">
                                <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-wider leading-none mb-0.5 hidden sm:block ${isLevel14 ? 'text-amber-400' : 'text-emerald-400'}`}>{t.MATERIAL}</span>
                                <motion.div 
                                    key={storageAnimKey}
                                    initial={{ scale: 1 }}
                                    animate={
                                        storageChanged ? { scale: [1, 1.15, 1] } : {}
                                    }
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                    className="flex items-center gap-1"
                                >
                                    <div className="hidden lg:block">
                                        <StorageBlocks current={player.storage} max={player.maxStorage} />
                                    </div>
                                    <motion.span
                                        animate={
                                            storageChanged === 'gain'
                                                ? { color: ['#ffffff', '#10b981', '#ffffff'] }
                                                : storageChanged === 'drain'
                                                    ? { color: ['#ffffff', '#ef4444', '#ffffff'] }
                                                    : '#ffffff'
                                        }
                                        transition={{ duration: 0.6 }}
                                        className="text-xs md:text-sm font-black leading-none font-mono text-white"
                                    >
                                        {player.storage}
                                    </motion.span>
                                    <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shadow-[0_0_6px_#34d399] ${player.storage >= player.maxStorage ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                </motion.div>
                            </div>
                        </motion.div>

                        <div className="w-px h-5 md:h-7 bg-slate-800/80 shrink-0 -mx-[5px]"></div>
                        {/* CREDITS widget */}
                        <div 
                            onClick={() => handleInteraction('COINS', 'click')}
                            onMouseEnter={() => handleInteraction('COINS', 'enter')}
                            onMouseLeave={() => handleInteraction('COINS', 'leave')}
                            onTouchStart={() => handleInteraction('COINS', 'enter')}
                            onTouchEnd={() => handleInteraction('COINS', 'leave')}
                            className="relative flex items-center gap-1.5 md:gap-2.5 cursor-pointer group shrink-0 pr-1 select-none py-0.5 transition-all duration-300 hover:bg-slate-900/30 px-1.5 rounded-lg border border-transparent hover:border-amber-500/20"
                        >
                            <motion.div 
                                animate={
                                    coinsChanged === 'gain'
                                        ? { scale: [1, 1.15, 1], borderColor: ['rgba(245,158,11,0.3)', 'rgba(16,185,129,1)', 'rgba(245,158,11,0.3)'], boxShadow: ['0px 0px 0px rgba(16,185,129,0)', '0px 0px 10px rgba(16,185,129,0.4)', '0px 0px 0px rgba(16,185,129,0)'] }
                                        : coinsChanged === 'drain'
                                            ? { scale: [1, 1.15, 1], borderColor: ['rgba(245,158,11,0.3)', 'rgba(239,68,68,1)', 'rgba(245,158,11,0.3)'], boxShadow: ['0px 0px 0px rgba(239,68,68,0)', '0px 0px 10px rgba(239,68,68,0.4)', '0px 0px 0px rgba(239,68,68,0)'] }
                                            : {}
                                }
                                transition={{ duration: 0.5 }}
                                className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-all"
                            >
                                <Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" />
                            </motion.div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[7px] md:text-[8px] text-amber-400 font-black uppercase tracking-wider leading-none mb-0.5 hidden sm:block">{t.CREDITS}</span>
                                <motion.div 
                                    key={coinsAnimKey}
                                    initial={{ scale: 1 }}
                                    animate={
                                        coinsChanged ? { scale: [1, 1.15, 1] } : {}
                                    }
                                    transition={{ duration: 0.4, ease: 'easeOut' }}
                                    className="flex items-center gap-1"
                                >
                                    <motion.div
                                        animate={
                                            coinsChanged === 'gain'
                                                ? { scale: [1, 1.3, 1], rotate: [0, 180, 360] }
                                                : coinsChanged === 'drain'
                                                    ? { scale: [1, 0.8, 1] }
                                                    : { y: [0, -1.5, 0] }
                                        }
                                        transition={
                                            coinsChanged
                                                ? { duration: 0.5 }
                                                : { repeat: Infinity, duration: 4, ease: 'easeInOut' }
                                        }
                                        className="text-amber-400 shrink-0 select-none flex items-center justify-center"
                                    >
                                        <Coins className="w-3 md:w-3.5 h-3 md:h-3.5" />
                                    </motion.div>
                                    <motion.span
                                        animate={
                                            coinsChanged === 'gain'
                                                ? { color: ['#ffffff', '#10b981', '#ffffff'] }
                                                : coinsChanged === 'drain'
                                                    ? { color: ['#ffffff', '#ef4444', '#ffffff'] }
                                                    : '#ffffff'
                                        }
                                        transition={{ duration: 0.6 }}
                                        className="text-xs md:text-base font-black leading-none font-mono text-white"
                                    >
                                        {player.coins}
                                    </motion.span>
                                </motion.div>
                            </div>
                        </div>

                        <div className="w-px h-5 md:h-7 bg-slate-800/80 shrink-0 -mx-[5px]"></div>
                        {/* MOVES widget */}
                        <div 
                            onClick={() => handleInteraction('MOVES', 'click')}
                            onMouseEnter={() => handleInteraction('MOVES', 'enter')}
                            onMouseLeave={() => handleInteraction('MOVES', 'leave')}
                            onTouchStart={() => handleInteraction('MOVES', 'enter')}
                            onTouchEnd={() => handleInteraction('MOVES', 'leave')}
                            className="relative flex items-center gap-1.5 md:gap-2.5 cursor-pointer group shrink-0 pr-1 select-none py-0.5 transition-all duration-300 hover:bg-slate-900/30 px-1.5 rounded-lg border border-transparent hover:border-blue-500/20"
                        >
                            <div className={`w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg flex items-center justify-center border transition-all duration-300 group-hover:scale-110 ${isMoving ? 'bg-blue-600 border-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'bg-blue-500/10 border-blue-500/20 group-hover:shadow-[0_0_12px_rgba(59,130,246,0.2)]'}`}>
                                <Footprints className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isMoving ? 'text-white' : 'text-blue-400'}`} />
                            </div>
                            <div className="flex flex-col justify-center">
                                <span className="text-[7px] md:text-[8px] text-blue-400 font-black uppercase tracking-wider leading-none mb-0.5 hidden sm:block">{t.MOVES}</span>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs md:text-base font-black text-white leading-none font-mono">{player.moves}</span>
                                    <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shadow-[0_0_6px_#60a5fa] ${player.moves === 0 ? 'bg-red-500 animate-ping' : 'bg-blue-400 animate-pulse'}`} />
                                </div>
                            </div>
                        </div>

                        <div className="w-px h-5 md:h-7 bg-slate-800/80 shrink-0 -mx-[5px]"></div>
                        
                        {/* ENTROPY widget */}
                        <div 
                            id="entropy-gauge"
                            onClick={() => handleInteraction('ENTROPY', 'click')}
                            onMouseEnter={() => handleInteraction('ENTROPY', 'enter')}
                            onMouseLeave={() => handleInteraction('ENTROPY', 'leave')}
                            onTouchStart={() => handleInteraction('ENTROPY', 'enter')}
                            onTouchEnd={() => handleInteraction('ENTROPY', 'leave')}
                            className="relative flex items-center gap-1.5 md:gap-2.5 cursor-pointer group shrink-0 pr-1 select-none py-0.5 transition-all duration-300 hover:bg-slate-900/30 px-1.5 rounded-lg border border-transparent hover:border-slate-500/25"
                        >
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-md md:rounded-lg bg-slate-900 flex items-center justify-center border border-slate-800 shadow-inner group-hover:scale-110 group-hover:border-slate-500 transition-all font-mono">
                                <EntropyGauge className="w-4 h-4 md:w-6 md:h-6" />
                            </div>
                            <div className="flex flex-col justify-center font-mono">
                                <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-wider leading-none mb-0.5 hidden sm:block ${
                                    entropy && entropy.current / entropy.max < 0.3 ? 'text-red-400' :
                                    entropy && entropy.current / entropy.max < 0.6 ? 'text-amber-400' :
                                    'text-emerald-400'
                                }`}>
                                    {entropy && entropy.current / entropy.max < 0.3 ? (language === 'RU' ? 'КРИТ' : 'CRIT') :
                                     entropy && entropy.current / entropy.max < 0.6 ? (language === 'RU' ? 'ПРЕД' : 'WARN') :
                                     (language === 'RU' ? 'НОРМ' : 'STABLE')}
                                </span>
                                <div className="flex items-center gap-1">
                                    {entropy && (
                                        <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shadow-md ${
                                            entropy.current / entropy.max < 0.3 ? 'bg-red-500 shadow-red-500 animate-ping' :
                                            entropy.current / entropy.max < 0.6 ? 'bg-amber-400 shadow-amber-400 animate-pulse' :
                                            'bg-emerald-400 shadow-emerald-400'
                                        }`} />
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DYNAMIC INFORMATION SUB-CARD */}
                    {activeStatTooltip && (
                        <motion.div 
                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 3, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute top-[102%] mt-1 max-w-[calc(100vw-24px)] w-[260px] p-3 bg-slate-950/95 backdrop-blur-md rounded-xl border shadow-2xl z-50 pointer-events-auto flex flex-col gap-2 border-slate-700/80 ${activeStatTooltip.theme} ${getTooltipPositionClass(hoveredStat!)}`}
                        >
                            <div className="text-[10px] font-black tracking-wider uppercase flex items-center justify-between border-b border-white/5 pb-1.5">
                                <span>{activeStatTooltip.title}</span>
                                {isPinned ? (
                                    <button 
                                        onClick={(e) => { 
                                            e.stopPropagation(); 
                                            setHoveredStat(null); 
                                            setIsPinned(false); 
                                            playUiSound('CLICK'); 
                                        }} 
                                        className="text-[8px] text-[red-400] hover:text-white px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/30 hover:bg-red-900/40 uppercase tracking-tight"
                                    >
                                        {language === 'RU' ? 'ЗАКРЫТЬ' : 'CLOSE'}
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setHelpTopic(hoveredStat!);
                                            playUiSound('CLICK');
                                        }}
                                        className="text-[7.5px] text-slate-400 hover:text-white underline font-bold tracking-normal uppercase"
                                    >
                                        {language === 'RU' ? 'ИНФО-ГЛАВА ↗' : 'GUIDE ↗'}
                                    </button>
                                )}
                            </div>

                            <div className="text-[10.5px] text-slate-300 leading-relaxed font-sans mb-1 break-words whitespace-pre-wrap">
                                {activeStatTooltip.desc}
                            </div>

                            {/* Cell-based representation and numeric fallback display */}
                            {hoveredStat === 'RANK' && (
                                <div className="border-t border-indigo-500/20 pt-1.5 mt-0.5">
                                    <div className="grid grid-cols-8 gap-1 mt-1 mb-1.5">
                                        {Array.from({ length: 8 }).map((_, idx) => {
                                            const isFilled = idx < player.playerLevel;
                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`h-3 rounded-[3px] border ${
                                                        isFilled 
                                                            ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.7)]' 
                                                            : 'bg-indigo-950/60 border-indigo-900/30'
                                                    } transition-all duration-300`}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-indigo-300 font-mono font-bold mt-1">
                                        <span>{language === 'RU' ? 'РАНГ ИНЖЕНЕРА' : 'ENGINEER RANK'}:</span>
                                        <span className="text-white text-xs font-black font-mono">{player.playerLevel} / 8</span>
                                    </div>
                                </div>
                            )}

                            {hoveredStat === 'MATERIAL' && (
                                <div className="border-t border-emerald-500/20 pt-1.5 mt-0.5">
                                    <div className="grid gap-1 mt-1 mb-1.5" style={{ gridTemplateColumns: `repeat(${player.maxStorage}, minmax(0, 1fr))` }}>
                                        {Array.from({ length: player.maxStorage }).map((_, idx) => {
                                            const isFilled = idx < player.storage;
                                            return (
                                                <div 
                                                    key={idx}
                                                    className={`h-3 rounded-[3px] border ${
                                                        isFilled 
                                                            ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.7)]' 
                                                            : 'bg-emerald-950/60 border-emerald-950/30'
                                                    } transition-all duration-300`}
                                                />
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-emerald-400 font-mono font-bold mt-1">
                                        <span>{language === 'RU' ? 'МАТЕРИАЛЫ' : 'STORAGE CELLS'}:</span>
                                        <span className="text-white text-xs font-black font-mono">{player.storage} / {player.maxStorage}</span>
                                    </div>
                                </div>
                            )}

                            {hoveredStat === 'COINS' && (
                                <div className="border-t border-amber-500/20 pt-1.5 mt-0.5 flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-[10.5px] text-amber-400 font-mono font-bold">
                                        <span>{language === 'RU' ? 'КРЕДИТЫ' : 'ENERGY CREDITS'}:</span>
                                        <span className="text-white text-sm font-black font-mono flex items-center gap-1">
                                            <Coins className="w-3.5 h-3.5 text-amber-400" />
                                            {player.coins}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {hoveredStat === 'MOVES' && (
                                <div className="border-t border-blue-500/20 pt-1.5 mt-0.5 flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-[10.5px] text-blue-400 font-mono font-bold">
                                        <span>{language === 'RU' ? 'ХОДЫ' : 'MOVEMENT TURNS'}:</span>
                                        <span className="text-white text-sm font-black font-mono flex items-center gap-1">
                                            <Footprints className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                            {player.moves}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {hoveredStat === 'ENTROPY' && (
                                <div className="border-t border-rose-500/20 pt-1.5 mt-0.5 flex flex-col gap-1">
                                    <div className="flex justify-between items-center text-[10.5px] text-rose-400 font-mono font-bold">
                                        <span>{language === 'RU' ? 'СТАБИЛЬНОСТЬ' : 'CORE STABILITY'}:</span>
                                        <span className="text-white text-sm font-black font-mono">
                                            {entropy ? `${Math.floor((entropy.current / entropy.max) * 100)}%` : '--'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}
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
                                <button onClick={() => { toggleLiteMode(); playUiSound('CLICK'); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left border ${isLiteMode ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-400 hover:text-emerald-200' : 'bg-slate-800/50 border-transparent hover:bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600'}`}>
                                    <Zap className={`w-4 h-4 ${isLiteMode ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
                                    <span className="text-xs font-bold uppercase break-words whitespace-pre-wrap">
                                        {language === 'RU' 
                                            ? `Облегченный режим: ${isLiteMode ? 'ВКЛ' : 'ВЫКЛ'}` 
                                            : `Lite Performance: ${isLiteMode ? 'ON' : 'OFF'}`}
                                    </span>
                                </button>
                                <div className="h-px bg-slate-700/50 my-1"></div>
                                <button onClick={() => { window.dispatchEvent(new CustomEvent('hexquest-show-onboarding')); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-900/10 hover:bg-indigo-900/30 text-indigo-400 hover:text-indigo-200 border border-indigo-900/30 hover:border-indigo-500/50 transition-colors w-full text-left mb-1">
                                     <HelpCircle className="w-4 h-4 text-indigo-400" />
                                     <span className="text-xs font-bold uppercase break-words whitespace-pre-wrap">{language === 'RU' ? 'Обучение' : 'Tutorial'}</span>
                                 </button>
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
