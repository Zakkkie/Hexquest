import React, { useMemo, useState } from 'react';
import { useGameStore } from '../../store.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Radar, Compass, ChevronDown, ChevronUp } from 'lucide-react';

export const RadarWidget: React.FC = () => {
    const session = useGameStore(state => state.session);
    const gameStatus = session?.gameStatus;
    const player = session?.player;
    const language = useGameStore(state => state.language);
    const isRu = language === 'RU';
    const [isCollapsed, setIsCollapsed] = useState(true);

    // Mini-Monument Radar scanning logic
    const radarData = useMemo(() => {
        if (!session || !player || gameStatus !== 'PLAYING') return null;
        
        // Find all MINI_MONUMENT hexes in the grid
        const monuments = Object.values(session.grid || {}).filter(
            (cell: any) => cell.structureType === 'MINI_MONUMENT'
        );
        
        if (monuments.length === 0) return null;
        
        const unactivated = monuments.filter(
            (cell: any) => !(session.activatedMiniMonuments || []).includes(`${cell.q},${cell.r}`)
        );
        
        if (unactivated.length === 0) return null;

        // Calculate minimum distance from player
        let minDistance = Infinity;
        
        for (const mon of unactivated) {
            const d = (Math.abs(player.q - mon.q) + Math.abs(player.r - mon.r) + Math.abs((player.q + player.r) - (mon.q + mon.r))) / 2;
            if (d < minDistance) {
                minDistance = d;
            }
        }

        return {
            distance: minDistance,
            unactivatedCount: unactivated.length,
            totalCount: monuments.length
        };
    }, [session, player, gameStatus]);

    if (!radarData) return null;

    const { distance, unactivatedCount, totalCount } = radarData;

    // Determine status styling and localized status string based on distance
    const getRadarStatus = () => {
        if (distance <= 2) {
            return {
                colorClass: 'text-amber-400 border-amber-500/40 bg-amber-950/20 shadow-[inset_0_0_12px_rgba(245,158,11,0.15)]',
                pulseColor: 'bg-amber-500',
                label: isRu ? 'СИГНАЛ: ВЫСОКОИНТЕНСИВНЫЙ' : 'SIGNAL: STRONG DEPTH',
                subtext: isRu ? 'Цель очень близко! Исследуйте соседние сектора.' : 'Anomalous core aligned! Reach adjacent grids.',
                animationDuration: 0.5,
                radarColor: '#f59e0b'
            };
        } else if (distance <= 4) {
            return {
                colorClass: 'text-yellow-400 border-yellow-500/30 bg-yellow-950/10 shadow-[inset_0_0_12px_rgba(234,179,8,0.1)]',
                pulseColor: 'bg-yellow-500',
                label: isRu ? 'СИГНАЛ: СРЕДНИЙ КАНАЛ' : 'SIGNAL: STABLE BEACON',
                subtext: isRu ? 'Поток улавливается. Двигайтесь по вектору изменения.' : 'Stable spatial fingerprint detected. Advance target.',
                animationDuration: 1.2,
                radarColor: '#eab308'
            };
        } else {
            return {
                colorClass: 'text-teal-400 border-teal-500/20 bg-teal-950/10 shadow-[inset_0_0_12px_rgba(20,184,166,0.05)]',
                pulseColor: 'bg-teal-500',
                label: isRu ? 'СИГНАЛ: НИЗКОЧАСТОТНЫЙ' : 'SIGNAL: WEAK FEEDWELL',
                subtext: isRu ? 'Обнаружены фоновые помехи. Начните сканирование сетки.' : 'Faint structural resonance. Sweep the external map.',
                animationDuration: 2.2,
                radarColor: '#14b8a6'
            };
        }
    };

    const status = getRadarStatus();

    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`w-full rounded-xl border backdrop-blur-md flex flex-col pointer-events-auto transition-all duration-300 overflow-hidden ${status.colorClass}`}
        >
            {/* Header with animating icon - clickable for collapse/expand */}
            <div 
                className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition-colors select-none"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-2">
                    <div className="relative flex items-center justify-center w-6 h-6">
                        <Radar className="w-5 h-5 shrink-0" style={{ color: status.radarColor }} />
                        {/* Sonar wavefront expansion ring */}
                        <motion.div
                            animate={{ scale: [1, 2.2], opacity: [0.6, 0] }}
                            transition={{
                                repeat: Infinity,
                                duration: status.animationDuration,
                                ease: "easeOut"
                            }}
                            className={`absolute w-4 h-4 rounded-full border ${status.pulseColor} opacity-50`}
                            style={{ borderColor: status.radarColor }}
                        />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold tracking-widest uppercase opacity-60">
                            {isRu ? 'РАДАР НЕБЬЮЛА' : 'NEBULA SENSOR'}
                        </span>
                        <span className="text-xs font-black tracking-wider uppercase">
                            {isCollapsed 
                                ? (isRu ? `ДИСТАНЦИЯ: ${distance} HEX` : `DIST: ${distance} HEX`)
                                : status.label
                            }
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Counter Badge */}
                    <div className="px-2 py-0.5 rounded-full bg-slate-900/80 border border-white/10 text-[10px] font-bold font-mono text-white/90 shrink-0">
                        📡 {totalCount - unactivatedCount} / {totalCount}
                    </div>
                    {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
                    ) : (
                        <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                </div>
            </div>

            {/* Expandable Body */}
            <AnimatePresence initial={false}>
                {!isCollapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="px-3 pb-3 flex flex-col gap-2.5 border-t border-white/5 pt-2.5"
                    >
                        {/* Main Radar Dashboard Interface */}
                        <div className="grid grid-cols-12 gap-3.5 items-center p-2 rounded-lg bg-slate-950/40 border border-white/5">
                            
                            {/* Distance Circular Meter */}
                            <div className="col-span-4 flex flex-col items-center justify-center border-r border-white/5 py-1">
                                <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase leading-none mb-1">
                                    {isRu ? 'ДИСТАНЦИЯ' : 'DISTANCE'}
                                </span>
                                <div className="flex items-baseline gap-0.5">
                                    <span className="text-xl font-black font-mono leading-none tracking-tight">
                                        {distance}
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-400">HEX</span>
                                </div>
                            </div>

                            {/* Proximity Progress Sbars */}
                            <div className="col-span-8 flex flex-col gap-1.5 pl-1">
                                <div className="flex justify-between items-center text-[9px] font-bold tracking-wider text-slate-400 uppercase">
                                    <span>{isRu ? 'ИНТЕНСИВНОСТЬ ИМПУЛЬСА' : 'PULSE INTENSITY'}</span>
                                    <span className="font-mono">{Math.max(10, Math.round(100 / Math.max(1, distance)))}%</span>
                                </div>
                                {/* Visual bar meter */}
                                <div className="relative h-2.5 w-full bg-slate-900 rounded-full border border-white/5 overflow-hidden flex gap-0.5 p-0.5">
                                    {Array.from({ length: 8 }).map((_, i) => {
                                        // High index is close, low index is far. Higher distance = fewer filled bars
                                        const fillThreshold = 8 - Math.min(7, distance - 1);
                                        const isFilled = i < fillThreshold;
                                        return (
                                            <div
                                                key={i}
                                                className={`h-full flex-1 rounded-sm transition-all duration-300 ${
                                                    isFilled 
                                                        ? status.pulseColor
                                                        : 'bg-slate-950'
                                                }`}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Action Advice / Status message */}
                        <div className="flex items-center gap-2 text-slate-300/90 text-[11px] leading-tight select-none">
                            <Compass className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="italic">{status.subtext}</span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};
