import React, { useState, useEffect, useRef, useMemo, useCallback, memo } from 'react';
import { useGameStore } from '../../store';
import { TEXT } from '../../services/i18n';
import { 
    Crown, Box, Wallet, Coins, Footprints, Settings, X, Music, VolumeX, Volume2, 
    Globe, BookOpen, Trophy, FileText, LogOut, RotateCcw, Zap, HelpCircle, ZoomIn, ZoomOut, Cpu 
} from 'lucide-react';
import { motion } from 'motion/react';
import EntropyGauge from '../EntropyGauge';
import { StorageBlocks } from './HudShared';

// --- TYPES ---
type StatType = 'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY';
type ModalType = 'EXIT' | 'RANKINGS' | 'CODEX' | 'AI_MONITOR' | 'RESTART';
type HelpTopic = 'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY';

interface TopStatsBarProps {
    onOpenModal: (modal: ModalType) => void;
    setHelpTopic: (topic: HelpTopic) => void;
}

// --- CONSTANTS (Moved outside to prevent memory allocation on every render) ---

const STAT_INFOS = {
    EN: {
        RANK: { title: "ENGINEER RANK", desc: "Limits maximum height you can construct.", theme: "text-indigo-400 border-indigo-500/30 bg-indigo-950/40" },
        MATERIAL: { title: "CONSTRUCTION MATERIAL", desc: "Collect by digging levels L >= 1. Used to build upwards.", theme: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40" },
        COINS: { title: "ENERGY CREDITS", desc: "Used to buy items or auto-buy movement turns (5cr = 1 turn).", theme: "text-amber-400 border-amber-500/30 bg-amber-950/40" },
        MOVES: { title: "MOVEMENT TURNS", desc: "Allows actions and footsteps. Dig deeper layers (L < 0) for moves.", theme: "text-blue-400 border-blue-500/30 bg-blue-950/40" },
        ENTROPY: { title: "STABILITY MONITOR", desc: "Core stability level. Drop below 85% triggers risk of orbital meteor strikes! Crit state (<30%) risks rapid cave collapse.", theme: "text-rose-400 border-rose-500/30 bg-rose-950/40" }
    },
    RU: {
        RANK: { title: "РАНГ ИНЖЕНЕРА", desc: "Ограничивает максимальный уровень строительства гексов.", theme: "text-indigo-400 border-indigo-500/30 bg-indigo-950/40" },
        MATERIAL: { title: "МАТЕРИАЛЫ КОРПУСА", desc: "Добывайте копанием плит выше L >= 1. Тратятся на стройку.", theme: "text-emerald-400 border-emerald-500/30 bg-emerald-950/40" },
        COINS: { title: "ЭНЕРГЕТИЧЕСКИЕ КРЕДИТЫ", desc: "Нужны для рынка и авто-конвертации в ходы (5 кр = 1 ход).", theme: "text-amber-400 border-amber-500/30 bg-amber-950/40" },
        MOVES: { title: "ЗАПАС ХОДОВ", desc: "Очки действий. Бурите шахты в глубину (L < 0) для восполнения.", theme: "text-blue-400 border-blue-500/30 bg-blue-950/40" },
        ENTROPY: { title: "СТАБИЛЬНОСТЬ ЯДРА", desc: "Метрика стабильности. Снижение ниже 85% активирует риск метеоритов! Крит (<30%) вызывает квантовый сдвиг.", theme: "text-rose-400 border-rose-500/30 bg-rose-950/40" }
    }
};

const HUD_STYLES = `
    .stats-scroll-hide::-webkit-scrollbar { display: none; }
    .stats-scroll-hide { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes wave-slide-x {
        0% { background-position-x: 0px; }
        100% { background-position-x: 100px; }
    }
`;

// --- SUBCOMPONENTS ---

interface StatWidgetProps {
    type: StatType;
    icon: React.ReactNode;
    label: string;
    isHighlighted?: boolean;
    isMoving?: boolean;
    storageChanged?: 'gain' | 'drain' | null;
    coinsChanged?: 'gain' | 'drain' | null;
    animKey?: number;
    onInteract: (type: StatType, action: 'enter' | 'leave' | 'click') => void;
    children: React.ReactNode;
}

const StatWidget: React.FC<StatWidgetProps> = memo(({
    type, icon, label, isHighlighted, isMoving, storageChanged, coinsChanged, animKey, onInteract, children
}) => {
    const themeClass = type === 'RANK' ? 'border-transparent hover:border-indigo-500/30' :
                       type === 'MATERIAL' ? (isHighlighted ? 'border-amber-500/50 bg-amber-500/10' : 'border-transparent hover:border-emerald-500/30') :
                       type === 'COINS' ? 'border-transparent hover:border-amber-500/30' :
                       type === 'MOVES' ? 'border-transparent hover:border-blue-500/30' :
                       'border-transparent hover:border-slate-500/30';

    const iconBgClass = type === 'RANK' ? 'bg-indigo-600 shadow-[0_0_12px_rgba(99,102,241,0.4)]' :
                        type === 'MATERIAL' ? 'bg-emerald-500/10 border border-emerald-500/20 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]' :
                        type === 'COINS' ? 'bg-amber-500/10 border border-amber-500/20 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]' :
                        type === 'MOVES' ? (isMoving ? 'bg-blue-600 border border-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.6)]' : 'bg-blue-500/10 border border-blue-500/20 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]') :
                        'bg-slate-900 border border-slate-800 group-hover:border-slate-600';

    return (
        <motion.div 
            onClick={() => onInteract(type, 'click')}
            onMouseEnter={() => onInteract(type, 'enter')}
            onMouseLeave={() => onInteract(type, 'leave')}
            animate={isHighlighted ? { scale: [1, 1.05, 1], borderColor: ['rgba(245,158,11,0.2)', 'rgba(245,158,11,1)', 'rgba(245,158,11,0.2)'] } : {}}
            transition={isHighlighted ? { duration: 1.5, repeat: Infinity } : {}}
            className={`relative flex items-center gap-1 sm:gap-1.5 md:gap-3 cursor-pointer group shrink-0 select-none py-0.5 md:py-1.5 transition-all duration-300 hover:bg-slate-900/40 px-1 sm:px-2 md:px-2.5 rounded-lg md:rounded-xl border ${themeClass}`}
        >
            <motion.div 
                animate={
                    storageChanged === 'gain' || coinsChanged === 'gain' ? { scale: [1, 1.2, 1], boxShadow: ['0 0 0px rgba(16,185,129,0)', '0 0 15px rgba(16,185,129,0.6)', '0 0 0px rgba(16,185,129,0)'] } :
                    storageChanged === 'drain' || coinsChanged === 'drain' ? { scale: [1, 1.2, 1], boxShadow: ['0 0 0px rgba(239,68,68,0)', '0 0 15px rgba(239,68,68,0.6)', '0 0 0px rgba(239,68,68,0)'] } : {}
                }
                transition={{ duration: 0.5 }}
                className={`w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 rounded md:rounded-lg flex items-center justify-center transition-all group-hover:scale-110 ${iconBgClass}`}
            >
                {icon}
            </motion.div>
            <div className="flex flex-col justify-center">
                <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-wider leading-none mb-0.5 hidden sm:block ${
                    type === 'RANK' ? 'text-indigo-300' :
                    type === 'MATERIAL' ? (isHighlighted ? 'text-amber-400' : 'text-emerald-400') :
                    type === 'COINS' ? 'text-amber-400' :
                    type === 'MOVES' ? 'text-blue-400' : 'text-slate-400'
                }`}>{label}</span>
                <motion.div 
                    key={animKey}
                    initial={{ scale: 1 }}
                    animate={(storageChanged || coinsChanged) ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.4 }}
                    className="flex items-center gap-1"
                >
                    {children}
                </motion.div>
            </div>
        </motion.div>
    );
});

interface SystemMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenModal: (modal: ModalType) => void;
}

const SystemMenu: React.FC<SystemMenuProps & { language: 'RU' | 'EN', t: any, isMusicMuted: boolean, isSfxMuted: boolean, isLiteMode: boolean, uiScale: number }> = memo(({
    isOpen, onClose, onOpenModal, language, t, isMusicMuted, isSfxMuted, isLiteMode, uiScale
}) => {
    const store = useGameStore.getState();
    
    const session = store.session;
    const winCond = session?.winCondition;
    const isBattleMode = winCond?.winType === 'SUMMIT' || winCond?.levelId === -1;

    if (!isOpen) return null;

    return (
        <div className="absolute top-full right-0 mt-2 bg-slate-950/95 backdrop-blur-xl border border-indigo-500/30 p-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] flex flex-col gap-2 min-w-[200px] max-w-[calc(100vw-24px)] z-[100] animate-in slide-in-from-top-2 duration-200">
            <div className="flex gap-2">
                <button onClick={() => { store.toggleMusic(); store.playUiSound('CLICK'); }} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isMusicMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-400'}`}>
                    {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                </button>
                <button onClick={() => { store.toggleSfx(); store.playUiSound('CLICK'); }} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isSfxMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'}`}>
                    {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
            </div>
            
            <div className="flex flex-col gap-1 border-t border-b border-slate-800/60 py-2 my-1">
                <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider">
                    {language === 'RU' ? 'МАСШТАБ ИНТЕРФЕЙСА' : 'INTERFACE SCALE'}
                </span>
                <div className="flex items-center justify-between gap-1.5 bg-slate-900/60 rounded-lg p-1 border border-slate-800">
                    <button onClick={() => { const SCALES = [0.75, 0.85, 1.0, 1.15, 1.30]; const idx = SCALES.indexOf(uiScale); if (idx > 0) { store.setUiScale(SCALES[idx - 1]); store.playUiSound('CLICK'); } }} disabled={uiScale <= 0.75} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-400 hover:text-white transition-colors">
                        <ZoomOut className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-[10px] font-black font-mono text-indigo-400 tracking-tight">{Math.round(uiScale * 100)}%</span>
                    <button onClick={() => { const SCALES = [0.75, 0.85, 1.0, 1.15, 1.30]; const idx = SCALES.indexOf(uiScale); if (idx < SCALES.length - 1) { store.setUiScale(SCALES[idx + 1]); store.playUiSound('CLICK'); } }} disabled={uiScale >= 1.30} className="w-7 h-7 flex items-center justify-center rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-400 hover:text-white transition-colors">
                        <ZoomIn className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <button onClick={() => { store.setLanguage(language === 'EN' ? 'RU' : 'EN'); store.playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600">
                <Globe className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold uppercase">{language === 'EN' ? 'English' : 'Русский'}</span>
            </button>
            <button onClick={() => { onOpenModal('CODEX'); onClose(); store.playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold uppercase">{language === 'RU' ? 'База Предметов' : 'Item Codex'}</span>
            </button>
            {isBattleMode && (
                <button onClick={() => { onOpenModal('RANKINGS'); onClose(); store.playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-900/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-bold uppercase">{t.LEADERBOARD_TITLE}</span>
                </button>
            )}
            <button onClick={() => { onOpenModal('AI_MONITOR'); onClose(); store.playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-400 border border-indigo-900/30 hover:border-indigo-500/50 transition-colors w-full text-left">
                <Cpu className="w-4 h-4 text-indigo-400 animate-pulse" />
                <span className="text-xs font-bold uppercase">{language === 'RU' ? 'ИИ Диагностика' : 'AI Diagnostics'}</span>
            </button>
            <button onClick={() => { store.toggleLiteMode(); store.playUiSound('CLICK'); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left border ${isLiteMode ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-400' : 'bg-slate-900/50 border-transparent hover:bg-slate-800 text-slate-300 hover:text-white hover:border-slate-600'}`}>
                <Zap className={`w-4 h-4 ${isLiteMode ? 'animate-pulse' : 'text-slate-400'}`} />
                <span className="text-xs font-bold uppercase">{language === 'RU' ? `Облегченный режим: ${isLiteMode ? 'ВКЛ' : 'ВЫКЛ'}` : `Lite Performance: ${isLiteMode ? 'ON' : 'OFF'}`}</span>
            </button>
            
            <div className="h-px bg-slate-700/50 my-1"></div>
            
            {isBattleMode && (
                <button onClick={() => { window.dispatchEvent(new CustomEvent('hexquest-show-onboarding')); onClose(); store.playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-900/10 hover:bg-indigo-900/30 text-indigo-400 border border-indigo-900/30 hover:border-indigo-500/50 transition-colors w-full text-left mb-1">
                    <HelpCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">{language === 'RU' ? 'Обучение' : 'Tutorial'}</span>
                </button>
            )}
            <button onClick={() => { onOpenModal('RESTART'); onClose(); store.playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-amber-900/10 hover:bg-amber-900/30 text-amber-400 border border-amber-900/30 hover:border-amber-500/50 transition-colors w-full text-left">
                <RotateCcw className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">{t.BTN_RETRY}</span>
            </button>
            <button onClick={() => { onOpenModal('EXIT'); onClose(); store.playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-900/10 hover:bg-red-900/30 text-red-400 border border-red-900/30 hover:border-red-500/50 transition-colors w-full text-left">
                <LogOut className="w-4 h-4" />
                <span className="text-xs font-bold uppercase">{t.BTN_MENU}</span>
            </button>
        </div>
    );
});

// --- MAIN COMPONENT ---

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
    const creepingVoid = useGameStore(state => state.session?.creepingVoid);
    
    const language = useGameStore(state => state.language);
    const isMusicMuted = useGameStore(state => state.isMusicMuted);
    const isSfxMuted = useGameStore(state => state.isSfxMuted);
    const isLiteMode = useGameStore(state => state.isLiteMode);
    const uiScale = useGameStore(state => state.uiScale);
    
    const playUiSound = useGameStore(state => state.playUiSound);
    const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
    const systemMenuRef = useRef<HTMLDivElement>(null);
    const statsBarRef = useRef<HTMLDivElement>(null);
    const [isPinned, setIsPinned] = useState(false);
    const [hoveredStat, setHoveredStat] = useState<StatType | null>(null);

    // Optimized change tracking using refs to prevent double renders
    const prevStorageRef = useRef(playerStorage);
    const [storageChanged, setStorageChanged] = useState<'gain' | 'drain' | null>(null);
    const [storageAnimKey, setStorageAnimKey] = useState(0);

    const prevCoinsRef = useRef(playerCoins);
    const [coinsChanged, setCoinsChanged] = useState<'gain' | 'drain' | null>(null);
    const [coinsAnimKey, setCoinsAnimKey] = useState(0);

    const entropy = entropyCurrent !== undefined && entropyMax !== undefined ? { current: entropyCurrent, max: entropyMax } : undefined;
    const isMoving = playerState === 'MOVING';
    const t = TEXT[language].HUD;
    const curLang = language === 'RU' ? 'RU' : 'EN';
    const activeStatTooltip = hoveredStat ? STAT_INFOS[curLang][hoveredStat] : null;

    // Effects for animations
    useEffect(() => {
        if (playerStorage !== prevStorageRef.current) {
            setStorageChanged(playerStorage > prevStorageRef.current ? 'gain' : 'drain');
            setStorageAnimKey(prev => prev + 1);
            prevStorageRef.current = playerStorage;
            const timer = setTimeout(() => setStorageChanged(null), 600);
            return () => clearTimeout(timer);
        }
    }, [playerStorage]);

    useEffect(() => {
        if (playerCoins !== prevCoinsRef.current) {
            setCoinsChanged(playerCoins > prevCoinsRef.current ? 'gain' : 'drain');
            setCoinsAnimKey(prev => prev + 1);
            prevCoinsRef.current = playerCoins;
            const timer = setTimeout(() => setCoinsChanged(null), 600);
            return () => clearTimeout(timer);
        }
    }, [playerCoins]);

    const handleInteraction = useCallback((stat: StatType, action: 'enter' | 'leave' | 'click') => {
        if (action === 'enter' && !isPinned) setHoveredStat(stat);
        else if (action === 'leave' && !isPinned) setHoveredStat(null);
        else if (action === 'click') {
            playUiSound('CLICK');
            if (hoveredStat === stat && isPinned) {
                setHoveredStat(null);
                setIsPinned(false);
            } else {
                setHoveredStat(stat);
                setIsPinned(true);
            }
        }
    }, [isPinned, hoveredStat, playUiSound]);

    // Click Outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (systemMenuRef.current && !systemMenuRef.current.contains(event.target as Node)) setIsSystemMenuOpen(false);
            if (statsBarRef.current && !statsBarRef.current.contains(event.target as Node)) {
                setHoveredStat(null);
                setIsPinned(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    if (!playerExists) return null;

    const getTooltipPositionClass = (stat: StatType) => {
        switch (stat) {
            case 'RANK': return 'left-0 md:left-2 translate-x-0 origin-top-left';
            case 'MATERIAL': return 'left-2 sm:left-8 md:left-[15%] translate-x-0 origin-top-left';
            case 'COINS': return 'left-1/2 -translate-x-1/2 origin-top';
            case 'MOVES': return 'right-2 sm:right-8 md:right-[15%] left-auto translate-x-0 origin-top-right';
            case 'ENTROPY': return 'right-0 md:right-2 left-auto translate-x-0 origin-top-right';
            default: return 'left-1/2 -translate-x-1/2 origin-top';
        }
    };

    return (
        <div className="absolute inset-x-0 top-0 p-1 sm:p-2 md:p-4 pointer-events-none z-[60] pt-[calc(env(safe-area-inset-top)+4px)] md:pt-[calc(env(safe-area-inset-top)+16px)]">
            <style>{HUD_STYLES}</style>
            <div className="w-full flex justify-between items-center gap-1 sm:gap-2 md:gap-4 max-w-7xl mx-auto relative pointer-events-none">
                
                {/* STATS STRIP */}
                <div className="flex flex-col gap-1 flex-1 min-w-0 md:flex-none md:w-fit relative pointer-events-auto" ref={statsBarRef} id="top-stats-bar">
                    <div className="flex items-center justify-between md:justify-start bg-slate-950/80 backdrop-blur-2xl rounded-xl md:rounded-[1.25rem] border border-slate-800/80 shadow-[0_10px_35px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.05)] px-2 py-1 sm:px-3 sm:py-2 md:px-5 md:py-3 pr-3 sm:pr-4 gap-1 sm:gap-2 md:gap-6 transition-all duration-300 hover:border-slate-700/60 overflow-x-auto overflow-y-hidden stats-scroll-hide w-full h-[38px] sm:h-[42px] md:h-auto md:shrink-0 relative">
                        
                        {/* Entropy Background */}
                        {entropy && (
                            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden rounded-xl md:rounded-[1.25rem]">
                                <div className="absolute inset-0 bg-slate-900/40" />
                                <motion.div 
                                    className="absolute left-0 top-0 bottom-0 opacity-30"
                                    animate={{
                                        width: `${(entropy.current / entropy.max) * 100}%`,
                                        background: entropy.current / entropy.max <= 0.3 
                                            ? 'linear-gradient(90deg, rgba(239,68,68,0) 0%, rgba(239,68,68,1) 100%)' 
                                            : entropy.current / entropy.max <= 0.6 
                                            ? 'linear-gradient(90deg, rgba(245,158,11,0) 0%, rgba(245,158,11,1) 100%)'
                                            : 'linear-gradient(90deg, rgba(16,185,129,0) 0%, rgba(16,185,129,1) 100%)'
                                    }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                >
                                    <div className="absolute inset-y-0 right-0 w-[200px] opacity-50" style={{ background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 100 100\' preserveAspectRatio=\'none\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0,50 Q25,30 50,50 T100,50 L100,100 L0,100 Z\' fill=\'white\' opacity=\'0.3\'/%3E%3C/svg%3E")', backgroundSize: '100px 100%', animation: 'wave-slide-x 1.5s linear infinite', transform: 'scaleX(-1)' }} />
                                </motion.div>
                                <motion.div 
                                    className="absolute left-0 bottom-0 h-1 md:h-1.5 shadow-[0_0_10px_rgba(255,255,255,0.5)] z-10"
                                    animate={{ width: `${(entropy.current / entropy.max) * 100}%`, backgroundColor: entropy.current / entropy.max <= 0.3 ? '#ef4444' : entropy.current / entropy.max <= 0.6 ? '#f59e0b' : '#10b981' }}
                                    transition={{ duration: 1, ease: 'easeOut' }}
                                >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 md:w-3 md:h-3 rounded-full bg-white shadow-[0_0_10px_#fff]" />
                                </motion.div>
                                <div className="absolute bottom-0 h-2 md:h-3 w-[2px] bg-red-500 z-10 shadow-[0_0_8px_rgba(239,68,68,1)]" style={{ left: '85%' }} />
                            </div>
                        )}

                        {/* RANK */}
                        <StatWidget type="RANK" icon={<Crown className="w-3.5 h-3.5 md:w-4 md:h-4 text-white" />} label={t.RANK} onInteract={handleInteraction} animKey={0}>
                            <div className="flex items-center gap-1">
                                <span className="text-xs md:text-base font-black text-white leading-none font-mono">{playerLevel}</span>
                                <span className="w-1 md:w-1.5 h-1 md:h-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8]" />
                            </div>
                        </StatWidget>

                        <div className="w-px h-4 md:h-7 bg-slate-800/80 shrink-0 mx-0.5 sm:mx-1 md:mx-2"></div>
                        
                        {/* MATERIAL */}
                        <StatWidget type="MATERIAL" icon={<Box className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />} label={t.MATERIAL} isHighlighted={isLevel14} storageChanged={storageChanged} animKey={storageAnimKey} onInteract={handleInteraction}>
                            <div className="flex items-center gap-1">
                                <div className="hidden lg:block"><StorageBlocks current={playerStorage} max={playerMaxStorage} /></div>
                                <motion.span animate={storageChanged === 'gain' ? { color: ['#fff', '#10b981', '#fff'] } : storageChanged === 'drain' ? { color: ['#fff', '#ef4444', '#fff'] } : {}} className="text-xs md:text-sm font-black leading-none font-mono text-white">{playerStorage}</motion.span>
                                <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shadow-[0_0_6px_#34d399] ${playerStorage >= playerMaxStorage ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            </div>
                        </StatWidget>

                        <div className="w-px h-4 md:h-7 bg-slate-800/80 shrink-0 mx-0.5 sm:mx-1 md:mx-2"></div>
                        
                        {/* COINS */}
                        <StatWidget type="COINS" icon={<Wallet className="w-3.5 h-3.5 md:w-4 md:h-4 text-amber-400" />} label={t.CREDITS} coinsChanged={coinsChanged} animKey={coinsAnimKey} onInteract={handleInteraction}>
                            <div className="flex items-center gap-1">
                                <motion.div animate={coinsChanged === 'gain' ? { rotate: [0, 360] } : {}} transition={{ duration: 0.5 }}>
                                    <Coins className="w-3 md:w-3.5 h-3 md:h-3.5 text-amber-400" />
                                </motion.div>
                                <motion.span animate={coinsChanged === 'gain' ? { color: ['#fff', '#10b981', '#fff'] } : coinsChanged === 'drain' ? { color: ['#fff', '#ef4444', '#fff'] } : {}} className="text-xs md:text-base font-black leading-none font-mono text-white">{playerCoins}</motion.span>
                            </div>
                        </StatWidget>

                        <div className="w-px h-4 md:h-7 bg-slate-800/80 shrink-0 mx-0.5 sm:mx-1 md:mx-2"></div>
                        
                        {/* MOVES */}
                        <StatWidget type="MOVES" icon={<Footprints className={`w-3.5 h-3.5 md:w-4 md:h-4 ${isMoving ? 'text-white' : 'text-blue-400'}`} />} label={t.MOVES} isMoving={isMoving} onInteract={handleInteraction} animKey={0}>
                            <div className="flex items-center gap-1">
                                <span className="text-xs md:text-base font-black text-white leading-none font-mono">{playerMoves}</span>
                                <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shadow-[0_0_6px_#60a5fa] ${playerMoves === 0 ? 'bg-red-500 animate-ping' : 'bg-blue-400 animate-pulse'}`} />
                            </div>
                        </StatWidget>

                        <div className="w-px h-4 md:h-7 bg-slate-800/80 shrink-0 mx-0.5 sm:mx-1 md:mx-2"></div>
                        
                        {/* ENTROPY */}
                        <StatWidget type="ENTROPY" icon={<EntropyGauge className="w-4 h-4 md:w-6 md:h-6" />} label={entropy && entropy.current / entropy.max < 0.3 ? (language === 'RU' ? 'КРИТ' : 'CRIT') : entropy && entropy.current / entropy.max < 0.6 ? (language === 'RU' ? 'ПРЕД' : 'WARN') : (language === 'RU' ? 'НОРМ' : 'STABLE')} onInteract={handleInteraction} animKey={0}>
                            <div className="flex items-center gap-1">
                                {entropy && (
                                    <span className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shadow-md ${
                                        entropy.current / entropy.max < 0.3 ? 'bg-red-500 shadow-red-500 animate-ping' :
                                        entropy.current / entropy.max < 0.6 ? 'bg-amber-400 shadow-amber-400 animate-pulse' :
                                        'bg-emerald-400 shadow-emerald-400'
                                    }`} />
                                )}
                            </div>
                        </StatWidget>
                    </div>

                    {/* TOOLTIP */}
                    {activeStatTooltip && (
                        <motion.div 
                            initial={{ opacity: 0, y: -4, scale: 0.95 }}
                            animate={{ opacity: 1, y: 3, scale: 1 }}
                            exit={{ opacity: 0, y: -4, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className={`absolute top-[110%] mt-1 max-w-[calc(100vw-24px)] w-[260px] p-3 bg-slate-950/95 backdrop-blur-md rounded-xl border shadow-2xl z-50 pointer-events-auto flex flex-col gap-2 border-slate-700/80 ${activeStatTooltip.theme} ${getTooltipPositionClass(hoveredStat!)}`}
                        >
                            <div className="text-[10px] font-black tracking-wider uppercase flex items-center justify-between border-b border-white/5 pb-1.5">
                                <span>{activeStatTooltip.title}</span>
                                {isPinned ? (
                                    <button onClick={(e) => { e.stopPropagation(); setHoveredStat(null); setIsPinned(false); playUiSound('CLICK'); }} className="text-[8px] text-red-400 hover:text-white px-1.5 py-0.5 rounded bg-red-950/40 border border-red-900/30 hover:bg-red-900/40 uppercase">{language === 'RU' ? 'ЗАКРЫТЬ' : 'CLOSE'}</button>
                                ) : (
                                    <button onClick={(e) => { e.stopPropagation(); setHelpTopic(hoveredStat!); playUiSound('CLICK'); }} className="text-[7.5px] text-slate-400 hover:text-white underline font-bold uppercase">{language === 'RU' ? 'ИНФО ↗' : 'GUIDE ↗'}</button>
                                )}
                            </div>
                            <div className="text-[10.5px] text-slate-300 leading-relaxed font-sans mb-1 break-words whitespace-pre-wrap">{activeStatTooltip.desc}</div>
                            
                            {hoveredStat === 'RANK' && (
                                <div className="border-t border-indigo-500/20 pt-1.5 mt-0.5">
                                    <div className="grid grid-cols-8 gap-1 mt-1 mb-1.5">
                                        {Array.from({ length: 8 }).map((_, idx) => (
                                            <div key={idx} className={`h-3 rounded-[3px] border ${idx < playerLevel ? 'bg-indigo-500 border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.7)]' : 'bg-indigo-950/60 border-indigo-900/30'} transition-all`} />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-indigo-300 font-mono font-bold mt-1">
                                        <span>{language === 'RU' ? 'РАНГ' : 'RANK'}:</span>
                                        <span className="text-white text-xs font-black font-mono">{playerLevel} / 8</span>
                                    </div>
                                </div>
                            )}
                            {hoveredStat === 'MATERIAL' && (
                                <div className="border-t border-emerald-500/20 pt-1.5 mt-0.5">
                                    <div className="grid gap-1 mt-1 mb-1.5" style={{ gridTemplateColumns: `repeat(${playerMaxStorage}, minmax(0, 1fr))` }}>
                                        {Array.from({ length: playerMaxStorage }).map((_, idx) => (
                                            <div key={idx} className={`h-3 rounded-[3px] border ${idx < playerStorage ? 'bg-emerald-400 border-emerald-300 shadow-[0_0_8px_rgba(52,211,153,0.7)]' : 'bg-emerald-950/60 border-emerald-950/30'} transition-all`} />
                                        ))}
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-emerald-400 font-mono font-bold mt-1">
                                        <span>{language === 'RU' ? 'ЯЧЕЙКИ' : 'CELLS'}:</span>
                                        <span className="text-white text-xs font-black font-mono">{playerStorage} / {playerMaxStorage}</span>
                                    </div>
                                </div>
                            )}
                            {hoveredStat === 'COINS' && (
                                <div className="border-t border-amber-500/20 pt-1.5 mt-0.5 flex justify-between items-center text-[10.5px] text-amber-400 font-mono font-bold">
                                    <span>{language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS'}:</span>
                                    <span className="text-white text-sm font-black font-mono flex items-center gap-1"><Coins className="w-3.5 h-3.5" />{playerCoins}</span>
                                </div>
                            )}
                            {hoveredStat === 'MOVES' && (
                                <div className="border-t border-blue-500/20 pt-1.5 mt-0.5 flex justify-between items-center text-[10.5px] text-blue-400 font-mono font-bold">
                                    <span>{language === 'RU' ? 'ХОДЫ' : 'TURNS'}:</span>
                                    <span className="text-white text-sm font-black font-mono flex items-center gap-1"><Footprints className="w-3.5 h-3.5 animate-pulse" />{playerMoves}</span>
                                </div>
                            )}
                            {hoveredStat === 'ENTROPY' && (
                                <div className="border-t border-rose-500/20 pt-1.5 mt-0.5 flex justify-between items-center text-[10.5px] text-rose-400 font-mono font-bold">
                                    <span>{language === 'RU' ? 'СТАБИЛЬНОСТЬ' : 'STABILITY'}:</span>
                                    <span className="text-white text-sm font-black font-mono">{entropy ? `${Math.floor((entropy.current / entropy.max) * 100)}%` : '--'}</span>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>

                {/* CREEPING VOID ALERT */}
                {activeLevelConfig?.creepingVoid && creepingVoid && !creepingVoid.sourceRestored && (() => {
                    const cvInterval = activeLevelConfig.creepingVoid.intervalMs ?? 75000;
                    const elapsed = Date.now() - creepingVoid.lastInfectTime;
                    const timeLeftMs = Math.max(0, cvInterval - elapsed);
                    const timeLeftSeconds = Math.ceil(timeLeftMs / 1000);
                    return (
                        <div className="pointer-events-auto flex items-center gap-1.5 md:gap-3 bg-gradient-to-r from-red-950/95 to-rose-950/90 backdrop-blur-xl border border-red-500/50 rounded-lg md:rounded-xl px-2 py-1 md:px-4 md:py-2 shadow-[0_0_20px_rgba(239,68,68,0.35)] animate-pulse shrink-0 self-center md:relative md:top-auto md:left-auto md:transform-none absolute top-[calc(env(safe-area-inset-top)+44px)] left-1/2 -translate-x-1/2 z-40">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
                            <div className="flex flex-row md:flex-col items-center md:items-start gap-1 md:gap-0.5 font-mono text-[8px] sm:text-[9px] md:text-[10px] leading-none">
                                <span className="font-black text-red-400 uppercase tracking-widest leading-none">
                                    {language === 'RU' ? 'ПУСТОТА:' : 'VOID:'}
                                </span>
                                <span className="font-bold text-red-200 leading-none flex items-center gap-0.5">
                                    {language === 'RU' ? 'через' : 'in'}
                                    <span className="font-black text-white text-[9px] sm:text-[10px] md:text-xs leading-none">{timeLeftSeconds}s</span>
                                </span>
                            </div>
                        </div>
                    );
                })()}

                {/* SYSTEM MENU */}
                <div className="pointer-events-auto flex items-center shrink-0 relative z-50" ref={systemMenuRef}>
                    <div className="relative">
                        <button onClick={() => { setIsSystemMenuOpen(!isSystemMenuOpen); playUiSound('CLICK'); }} className={`w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 flex items-center justify-center backdrop-blur-xl border rounded-xl transition-all shadow-lg active:scale-95 ${isSystemMenuOpen ? 'bg-slate-800 border-slate-500 text-white' : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:text-white'}`}>
                            {isSystemMenuOpen ? <X className="w-4 h-4 md:w-5 md:h-5" /> : <Settings className="w-4 h-4 md:w-5 md:h-5" />}
                        </button>
                        <SystemMenu 
                            isOpen={isSystemMenuOpen} 
                            onClose={() => setIsSystemMenuOpen(false)} 
                            onOpenModal={onOpenModal}
                            language={language}
                            t={t}
                            isMusicMuted={isMusicMuted}
                            isSfxMuted={isSfxMuted}
                            isLiteMode={isLiteMode}
                            uiScale={uiScale}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default memo(TopStatsBar);