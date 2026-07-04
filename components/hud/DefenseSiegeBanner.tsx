import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store';
import { Hourglass, Crosshair, HeartPulse, ChevronDown, ChevronUp, Terminal, RotateCcw, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DefenseSiegeBanner: React.FC = () => {
    const session = useGameStore(state => state.session);
    const language = session?.language || 'EN';
    const startDefenseSiege = useGameStore(state => state.startDefenseSiege);

    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isMinimizedDesktop, setIsMinimizedDesktop] = useState(false);

    if (!session?.defense?.isDefenseMode) return null;

    const {
        coreHealth = 100,
        maxCoreHealth = 100,
        survivalTimer = 180,
        currentWave = 1,
        maxWaves = 3,
        totalEliminated = 0
    } = session.defense || {};

    const messageLog = session.messageLog || [];

    // Health Percent/State
    const healthPercent = Math.min(100, Math.max(0, (coreHealth / maxCoreHealth) * 100));
    const isCritical = healthPercent < 35;

    // Time Format
    const timeFormatted = useMemo(() => {
        const totalSeconds = Math.max(0, Math.floor(survivalTimer));
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, [survivalTimer]);

    // Latest 4 messages from the event log
    const recentLogs = useMemo(() => {
        return messageLog.slice(0, 5);
    }, [messageLog]);

    // Localizations
    const text = {
        coreIntegrity: language === 'RU' ? 'ИНТЕГРИТЕТ ЯДРА' : 'CORE INTEGRITY',
        wave: language === 'RU' ? 'ВОЛНА' : 'WAVE',
        neutralized: language === 'RU' ? 'ЛИКВИДИРОВАНО' : 'NEUTRALIZED',
        terminalLog: language === 'RU' ? 'ТЕРМИНАЛ СОБЫТИЙ' : 'EVENT LOG',
        noLogs: language === 'RU' ? 'НЕТ СИСТЕМНЫХ ЗАПИСЕЙ' : 'NO LOG ENTRIES',
        reset: language === 'RU' ? 'СБРОС' : 'RESET',
        close: language === 'RU' ? 'ЗАКРЫТЬ' : 'CLOSE',
        warningTitle: language === 'RU' ? 'ОБОРОНА ЯДРА АКТИВНА!' : 'CORE DEFENSE ACTIVE!',
        warningSub: language === 'RU' ? 'Уничтожьте нападающих ботов' : 'Neutralize incoming hostiles',
        collapsedLogs: language === 'RU' ? 'ЛОГ' : 'LOGS',
        tacticalTitle: language === 'RU' ? 'ТАКТИЧЕСКИЙ ЦЕНТР' : 'TACTICAL COMMAND',
        expand: language === 'RU' ? 'РАЗВЕРНУТЬ' : 'EXPAND',
        minimize: language === 'RU' ? 'СВЕРНУТЬ' : 'MINIMIZE',
    };

    return (
        <>
            {/* MOBILE LAYOUT (Compact Pill + Dropdown Card) */}
            <div className="block md:hidden fixed top-[calc(52px+env(safe-area-inset-top))] sm:top-[calc(56px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-sm pointer-events-none select-none">
                <div className="flex flex-col gap-1.5 w-full">
                    {/* Compact Pill */}
                    <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="pointer-events-auto w-full bg-slate-950/90 border border-rose-500/40 backdrop-blur-xl rounded-full py-1.5 px-3.5 flex items-center justify-between gap-1 shadow-[0_4px_20px_rgba(244,63,94,0.3)] cursor-pointer active:scale-[0.98] transition-all"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <HeartPulse className={`w-4.5 h-4.5 shrink-0 ${isCritical ? 'text-red-500 animate-pulse' : 'text-rose-500 animate-pulse'}`} />
                            <span className={`text-[11px] font-black font-mono leading-none ${isCritical ? 'text-red-400' : 'text-rose-400'}`}>
                                {Math.ceil(healthPercent)}%
                            </span>
                        </div>

                        <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded-full">
                            <Hourglass className="w-3 h-3 text-amber-500 animate-spin-slow shrink-0" />
                            <span className="text-[11px] font-black font-mono text-amber-400 tracking-wider leading-none">
                                {timeFormatted}
                            </span>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                                <Crosshair className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span className="text-[10px] font-black font-mono text-slate-300">
                                    {currentWave}/{maxWaves}
                                </span>
                            </div>
                            
                            <div className="w-px h-3 bg-slate-800" />
                            
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
                                className="p-0.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10"
                            >
                                {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                            </button>
                        </div>
                    </motion.div>

                    {/* Collapsible Mobile Drawer Card */}
                    <AnimatePresence>
                        {!isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, scale: 0.95 }}
                                animate={{ opacity: 1, height: 'auto', scale: 1 }}
                                exit={{ opacity: 0, height: 0, scale: 0.95 }}
                                className="pointer-events-auto w-full bg-slate-950/95 border border-rose-500/30 backdrop-blur-2xl rounded-2xl p-4 shadow-[0_12px_32px_rgba(0,0,0,0.85)] flex flex-col gap-3 overflow-hidden origin-top"
                            >
                                {/* Header Info */}
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black font-mono tracking-widest text-slate-500 uppercase leading-none">
                                            {text.coreIntegrity}
                                        </span>
                                        <span className={`text-sm font-black font-mono mt-1 leading-none ${isCritical ? 'text-red-400 animate-pulse' : 'text-rose-400'}`}>
                                            {coreHealth} / {maxCoreHealth} HP
                                        </span>
                                    </div>

                                    <button 
                                        onClick={startDefenseSiege}
                                        className="p-1.5 px-3 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600 hover:text-white transition-all text-[9px] font-bold font-mono tracking-wider flex items-center gap-1 active:scale-95 cursor-pointer"
                                    >
                                        <RotateCcw className="w-3 h-3" />
                                        <span>{text.reset}</span>
                                    </button>
                                </div>

                                {/* HP Bar */}
                                <div className="h-1.5 bg-slate-950 rounded-full border border-slate-900 overflow-hidden relative">
                                    <motion.div 
                                        className={`h-full rounded-full bg-gradient-to-r ${isCritical ? 'from-rose-600 to-red-500' : 'from-rose-500 to-pink-500'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${healthPercent}%` }}
                                        transition={{ duration: 0.4 }}
                                    />
                                </div>

                                {/* Progress Metrics */}
                                <div className="grid grid-cols-2 gap-2 bg-slate-900/40 p-2 rounded-lg border border-slate-900/60 text-[10px] font-bold font-mono">
                                    <div className="flex flex-col gap-0.5 border-r border-slate-800/80 pr-2">
                                        <span className="text-[8px] text-slate-500 uppercase font-black">{text.wave}</span>
                                        <span className="text-rose-400 font-black">{currentWave} / {maxWaves}</span>
                                    </div>
                                    <div className="flex flex-col gap-0.5 pl-1">
                                        <span className="text-[8px] text-slate-500 uppercase font-black">{text.neutralized}</span>
                                        <span className="text-emerald-400 font-black">{totalEliminated}</span>
                                    </div>
                                </div>

                                {/* Compact Terminal Logs */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center gap-1 text-[9px] font-black font-mono tracking-widest text-slate-500 uppercase">
                                        <Terminal className="w-3.5 h-3.5 text-slate-600" />
                                        <span>{text.terminalLog}</span>
                                    </div>
                                    <div className="bg-slate-950 p-2 rounded-lg border border-slate-900/80 flex flex-col gap-1 max-h-[70px] overflow-y-auto stats-scroll-hide">
                                        {recentLogs.length > 0 ? (
                                            recentLogs.slice(0, 3).map((log) => {
                                                const col = log.type === 'ERROR' ? 'text-rose-500 animate-pulse' : log.type === 'WARN' ? 'text-amber-400' : log.type === 'SUCCESS' ? 'text-emerald-400' : 'text-indigo-400';
                                                return (
                                                    <div key={log.id} className="text-[8.5px] font-mono leading-relaxed flex items-start gap-1">
                                                        <span className={`${col} font-black shrink-0`}>&gt;</span>
                                                        <span className="text-slate-300 break-words flex-1 leading-tight">{log.text}</span>
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="text-center text-[8px] font-mono text-slate-600 py-1">{text.noLogs}</div>
                                        )}
                                    </div>
                                </div>

                                {/* Close button */}
                                <button
                                    onClick={() => setIsCollapsed(true)}
                                    className="w-full py-1.5 text-center bg-slate-900 hover:bg-slate-850 border border-slate-800/60 rounded-xl text-[10px] font-bold text-slate-400 tracking-wider hover:text-white transition-colors cursor-pointer"
                                >
                                    {text.close}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* DESKTOP/TABLET LAYOUT (Tactical Command Sidebar on the Right) */}
            <div className="hidden md:block fixed right-4 top-[calc(104px+env(safe-area-inset-top))] z-40 w-80 pointer-events-none select-none">
                <AnimatePresence mode="wait">
                    {isMinimizedDesktop ? (
                        /* Minimized Floating Beacon Badge */
                        <motion.button
                            key="minimized"
                            initial={{ opacity: 0, x: 50, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 50, scale: 0.9 }}
                            onClick={() => setIsMinimizedDesktop(false)}
                            className="pointer-events-auto float-right bg-slate-950/95 border border-rose-500/45 rounded-xl p-3 shadow-[0_4px_25px_rgba(244,63,94,0.35)] flex items-center gap-3 cursor-pointer hover:border-white transition-all active:scale-95 duration-200"
                        >
                            <div className="relative flex items-center justify-center w-6 h-6 shrink-0">
                                <ShieldAlert className="w-5 h-5 text-red-500 animate-bounce" />
                                <span className="absolute inset-0 rounded-full border border-red-500/40 animate-ping" />
                            </div>
                            <div className="flex flex-col items-start leading-none text-left font-mono">
                                <span className="text-[10px] font-black text-rose-400 tracking-wider uppercase">{text.warningTitle}</span>
                                <span className="text-[9px] text-amber-500 font-bold tracking-tight mt-1">{timeFormatted} | {text.wave} {currentWave}/{maxWaves}</span>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-400 -rotate-90 ml-1" />
                        </motion.button>
                    ) : (
                        /* Complete High-Tech Tactical Command Sidebar Panel */
                        <motion.div
                            key="expanded"
                            initial={{ opacity: 0, x: 50, scale: 0.97 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 50, scale: 0.97 }}
                            className="pointer-events-auto w-full bg-slate-950/90 saturate-[130%] border border-rose-500/25 rounded-2xl p-4 shadow-[0_12px_36px_rgba(0,0,0,0.85)] flex flex-col gap-4 backdrop-blur-xl hover:border-rose-500/45 transition-colors duration-300"
                        >
                            {/* Title block with pulsing alert icon */}
                            <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black font-mono tracking-widest text-slate-100 uppercase">
                                            {text.tacticalTitle}
                                        </span>
                                        <span className="text-[9px] text-rose-400/80 font-mono tracking-tight font-semibold">
                                            {text.warningTitle}
                                        </span>
                                    </div>
                                </div>
                                
                                <button
                                    onClick={() => setIsMinimizedDesktop(true)}
                                    className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center hover:bg-slate-850"
                                    title={text.minimize}
                                >
                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                </button>
                            </div>

                            {/* Circular / Linear Health Bar */}
                            <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-[9px] font-black tracking-widest font-mono text-slate-400 uppercase">
                                        {text.coreIntegrity}
                                    </span>
                                    <span className={`text-xs font-black font-mono tracking-wider ${isCritical ? 'text-red-400 animate-pulse' : 'text-rose-400'}`}>
                                        {coreHealth} / {maxCoreHealth} HP
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-950 rounded-full border border-slate-900 overflow-hidden relative">
                                    <motion.div 
                                        className={`h-full rounded-full bg-gradient-to-r ${isCritical ? 'from-rose-600 to-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' : 'from-rose-500 to-pink-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'}`}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${healthPercent}%` }}
                                        transition={{ duration: 0.4 }}
                                    />
                                </div>
                            </div>

                            {/* Core stats grid */}
                            <div className="grid grid-cols-3 gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-900/60 font-mono text-center">
                                <div className="flex flex-col items-center justify-center border-r border-slate-800/80 py-1">
                                    <span className="text-[8px] font-black tracking-wider text-slate-500 uppercase leading-none mb-1">
                                        {language === 'RU' ? 'ВРЕМЯ' : 'TIMER'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Hourglass className="w-3.5 h-3.5 text-amber-500 animate-spin-slow shrink-0" />
                                        <span className="text-xs font-black text-amber-400 tracking-wider">
                                            {timeFormatted}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center border-r border-slate-800/80 py-1">
                                    <span className="text-[8px] font-black tracking-wider text-slate-500 uppercase leading-none mb-1">
                                        {text.wave}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <Crosshair className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span className="text-xs font-black text-rose-400 tracking-wider">
                                            {currentWave} / {maxWaves}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center justify-center py-1">
                                    <span className="text-[8px] font-black tracking-wider text-slate-500 uppercase leading-none mb-1">
                                        {language === 'RU' ? 'СБИТО' : 'KILLS'}
                                    </span>
                                    <span className="text-xs font-black text-emerald-400 font-mono tracking-wider">
                                        {totalEliminated}
                                    </span>
                                </div>
                            </div>

                            {/* Scrollable Command Terminal logs */}
                            <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                                <div className="flex items-center gap-1.5 text-[9px] font-black font-mono tracking-widest text-slate-500 uppercase">
                                    <Terminal className="w-4 h-4 text-slate-600" />
                                    <span>{text.terminalLog}</span>
                                </div>
                                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 flex flex-col gap-2 max-h-[140px] overflow-y-auto stats-scroll-hide">
                                    {recentLogs.length > 0 ? (
                                        recentLogs.map((log) => {
                                            const typeColors = {
                                                INFO: 'text-indigo-400',
                                                WARN: 'text-amber-400',
                                                ERROR: 'text-rose-500 animate-pulse',
                                                SUCCESS: 'text-emerald-400',
                                                DEBUG: 'text-slate-500'
                                            };
                                            const col = typeColors[log.type] || 'text-slate-300';
                                            return (
                                                <div key={log.id} className="text-[9px] font-mono leading-relaxed flex items-start gap-1.5 border-b border-slate-900/30 pb-1.5 last:border-none last:pb-0">
                                                    <span className={`${col} font-black uppercase shrink-0`}>&gt;</span>
                                                    <span className="text-slate-300 break-words flex-1 leading-normal">{log.text}</span>
                                                </div>
                                            );
                                        })
                                    ) : (
                                        <div className="text-center text-[9px] font-mono text-slate-600 py-3 uppercase tracking-widest">{text.noLogs}</div>
                                    )}
                                </div>
                            </div>

                            {/* Reset testing button */}
                            <button 
                                onClick={startDefenseSiege}
                                className="w-full py-2 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-black uppercase text-[10px] tracking-wider border border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.3)] flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                            >
                                <RotateCcw className="w-3.5 h-3.5 text-white" />
                                <span>{language === 'RU' ? 'ПЕРЕЗАПУСТИТЬ ТАКТИЧЕСКИЙ БОЙ' : 'RESTART CORE SIEGE'}</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    );
};
