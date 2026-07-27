import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store';
import { audioService } from '../services/audioService';
import { ArrowRight, RotateCcw, LogOut, Trophy, Layers, Sparkles, Box } from 'lucide-react';

// --- THEME CONFIGURATION ---
type ThemeType = 'NEON_CASCADE' | 'CRIMSON_RIFT' | 'QUANTUM_VOID' | 'GOLDEN_SINGULARITY';

interface ThemeConfig {
    bgGradient: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    particleType: 'rain' | 'sparks' | 'dust' | 'fractals';
    titleText: string;
    logs: string[];
}

const getThemeForLevel = (levelId: string | undefined, language: 'RU' | 'EN'): ThemeConfig => {
    const series = levelId ? levelId.split('.')[0] : '1';
    const isRu = language === 'RU';

    switch (series) {
        case '2':
            return {
                bgGradient: 'from-red-950 via-rose-950 to-slate-950',
                primaryColor: '#ef4444',
                secondaryColor: '#f97316',
                accentColor: '#fbbf24',
                particleType: 'sparks',
                titleText: isRu ? 'КРАСНЫЙ РАЗЛОМ' : 'CRIMSON RIFT',
                logs: isRu ? ['[ЯДРО] Тепловой коллапс предотвращен', '[ЭНТРОПИЯ] Стабилизация разлома: 100%', '[СИСТЕМА] Багровый сектор очищен'] : ['[CORE] Thermal collapse averted', '[ENTROPY] Rift stabilization: 100%', '[SYSTEM] Crimson sector purged']
            };
        case '3':
            return {
                bgGradient: 'from-purple-950 via-indigo-950 to-slate-950',
                primaryColor: '#a855f7',
                secondaryColor: '#6366f1',
                accentColor: '#d946ef',
                particleType: 'dust',
                titleText: isRu ? 'КВАНТОВАЯ ПУСТОТА' : 'QUANTUM VOID',
                logs: isRu ? ['[ВАКУУМ] Квантовая пена осела', '[ДАННЫЕ] Парадоксы разрешены', '[ЯДРО] Пустота синхронизирована'] : ['[VACUUM] Quantum foam settled', '[DATA] Paradoxes resolved', '[CORE] Void synchronized']
            };
        case '4':
        case '5':
            return {
                bgGradient: 'from-amber-950 via-yellow-900 to-slate-950',
                primaryColor: '#f59e0b',
                secondaryColor: '#eab308',
                accentColor: '#ffffff',
                particleType: 'fractals',
                titleText: isRu ? 'ЗОЛОТАЯ СИНГУЛЯРНОСТЬ' : 'GOLDEN SINGULARITY',
                logs: isRu ? ['[СИНГУЛЯРНОСТЬ] Предел достигнут', '[ЭНЕРГИЯ] Золотое сечение активно', '[СИСТЕМА] Абсолютный резонанс'] : ['[SINGULARITY] Limit reached', '[ENERGY] Golden ratio active', '[SYSTEM] Absolute resonance']
            };
        case '1':
        default:
            return {
                bgGradient: 'from-emerald-950 via-cyan-950 to-slate-950',
                primaryColor: '#10b981',
                secondaryColor: '#06b6d4',
                accentColor: '#34d399',
                particleType: 'rain',
                titleText: isRu ? 'НЕОНОВЫЙ КАСКАД' : 'NEON CASCADE',
                logs: isRu ? ['[СЕТЬ] Изоляция завершена', '[ДАННЫЕ] Матрица расшифрована', '[ЯДРО] Вектор стабилен'] : ['[NET] Isolation complete', '[DATA] Matrix decrypted', '[CORE] Vector stable']
            };
    }
};

// --- HELPER FOR LEVEL INDEX AND HEX BADGE STYLES ---
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

const getHexLevelStyle = (lvl: number) => {
    switch (lvl) {
        case 0: return { border: 'border-slate-500/50', text: 'text-slate-300', bg: 'bg-slate-900/80', glow: 'shadow-[0_0_12px_rgba(148,163,184,0.15)]', badge: 'bg-slate-800 text-slate-200' };
        case 1: return { border: 'border-emerald-500/50', text: 'text-emerald-400', bg: 'bg-emerald-950/70', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]', badge: 'bg-emerald-900/80 text-emerald-300' };
        case 2: return { border: 'border-blue-500/50', text: 'text-blue-400', bg: 'bg-blue-950/70', glow: 'shadow-[0_0_12px_rgba(59,130,246,0.25)]', badge: 'bg-blue-900/80 text-blue-300' };
        case 3: return { border: 'border-amber-500/50', text: 'text-amber-400', bg: 'bg-amber-950/70', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]', badge: 'bg-amber-900/80 text-amber-300' };
        case 4: return { border: 'border-purple-500/50', text: 'text-purple-400', bg: 'bg-purple-950/70', glow: 'shadow-[0_0_12px_rgba(168,85,247,0.25)]', badge: 'bg-purple-900/80 text-purple-300' };
        case 5: return { border: 'border-rose-500/50', text: 'text-rose-400', bg: 'bg-rose-950/70', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.25)]', badge: 'bg-rose-900/80 text-rose-300' };
        case 6: return { border: 'border-cyan-500/50', text: 'text-cyan-400', bg: 'bg-cyan-950/70', glow: 'shadow-[0_0_12px_rgba(6,182,212,0.25)]', badge: 'bg-cyan-900/80 text-cyan-300' };
        case 7: return { border: 'border-indigo-500/50', text: 'text-indigo-400', bg: 'bg-indigo-950/70', glow: 'shadow-[0_0_12px_rgba(99,102,241,0.25)]', badge: 'bg-indigo-900/80 text-indigo-300' };
        case 8: return { border: 'border-fuchsia-500/50', text: 'text-fuchsia-400', bg: 'bg-fuchsia-950/70', glow: 'shadow-[0_0_12px_rgba(217,70,239,0.25)]', badge: 'bg-fuchsia-900/80 text-fuchsia-300' };
        case 9: return { border: 'border-yellow-400/50', text: 'text-yellow-300', bg: 'bg-yellow-950/70', glow: 'shadow-[0_0_12px_rgba(234,179,8,0.25)]', badge: 'bg-yellow-900/80 text-yellow-200' };
        case 10: default: return { border: 'border-sky-400/50', text: 'text-sky-300', bg: 'bg-sky-950/70', glow: 'shadow-[0_0_15px_rgba(56,189,248,0.35)]', badge: 'bg-sky-900/80 text-sky-200' };
    }
};

// --- CANVAS PARTICLE ENGINE ---
interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    maxLife: number;
    color: string;
    rotation: number;
    vr: number;
}

interface VictorySequenceProps {
    isActive: boolean;
    levelId?: string;
    score?: number;
    onRetry: () => void;
    onNext: () => void;
    onMenu: () => void;
}

export const VictorySequence: React.FC<VictorySequenceProps> = ({ isActive, levelId, score = 0, onRetry, onNext, onMenu }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const language = useGameStore(state => state.language);
    const session = useGameStore(state => state.session);
    const claimedLevelRewards = useGameStore(state => state.claimedLevelRewards);
    const claimLevelReward = useGameStore(state => state.claimLevelReward);
    const addCollectedHexes = useGameStore(state => state.addCollectedHexes);
    const addMinedHexes = useGameStore(state => state.addMinedHexes);
    const playUiSound = useGameStore(state => state.playUiSound);

    const playerInventory = session?.player?.inventory;

    const [theme, setTheme] = useState<ThemeConfig>(getThemeForLevel(levelId, language));
    const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
    const [showUI, setShowUI] = useState(false);

    // Victory Rewards State
    const [victoryRewards, setVictoryRewards] = useState<{
        l0: number;
        l1: number;
        l2: number;
        lvl0: number;
        lvl1: number;
        lvl2: number;
    } | null>(null);
    const [wasRewardPreviouslyClaimed, setWasRewardPreviouslyClaimed] = useState(false);

    // Calculate level rewards once upon victory
    useEffect(() => {
        if (isActive && !victoryRewards) {
            if (session?.winCondition?.winType === 'SIEGE') {
                const claimedList = claimedLevelRewards || [];
                const completedNormalCount = claimedList.filter(id => !id.startsWith('siege_completed_') && !id.startsWith('siege_pending_')).length;
                const currentBlock = Math.max(1, Math.floor((completedNormalCount - 1) / 5) + 1);
                const siegeId = `siege_completed_${currentBlock}`;
                const isAlreadyClaimed = claimedList.includes(siegeId);
                
                setWasRewardPreviouslyClaimed(isAlreadyClaimed);
                setVictoryRewards({ l0: 15, l1: 10, l2: 5, lvl0: 1, lvl1: 2, lvl2: 3 });
                
                if (!isAlreadyClaimed) {
                    addCollectedHexes({ 1: 15, 2: 10, 3: 5 });
                    addMinedHexes({ 1: 15, 2: 10, 3: 5 });
                    claimLevelReward(siegeId);
                    
                    const currentSP = useGameStore.getState().skillPoints;
                    useGameStore.getState().setSkillPoints(currentSP + 3);
                }
            } else {
                const claimedList = claimedLevelRewards || [];
                const currentLevelId = levelId || session?.activeLevelConfig?.id;
                const isAlreadyClaimed = currentLevelId ? claimedList.includes(currentLevelId) : false;
                
                setWasRewardPreviouslyClaimed(isAlreadyClaimed);

                if (isAlreadyClaimed) {
                    setVictoryRewards({ l0: 0, l1: 0, l2: 0, lvl0: 0, lvl1: 1, lvl2: 2 });
                } else {
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
                    if (currentLevelId) {
                        claimLevelReward(currentLevelId);
                    }
                }
            }
        }
    }, [isActive, victoryRewards, addCollectedHexes, addMinedHexes, claimedLevelRewards, session?.activeLevelConfig, session?.winCondition?.winType, claimLevelReward, levelId]);

    // Reset when modal closes
    useEffect(() => {
        if (!isActive) {
            setVictoryRewards(null);
            setWasRewardPreviouslyClaimed(false);
            setShowUI(false);
            setVisibleLogs([]);
        } else {
            setTheme(getThemeForLevel(levelId, language));
            audioService.play('SUCCESS');
            const timer = setTimeout(() => audioService.play('LEVEL_UP'), 600);
            const uiTimer = setTimeout(() => setShowUI(true), 1000);
            return () => { clearTimeout(timer); clearTimeout(uiTimer); };
        }
    }, [isActive, levelId, language]);

    // Terminal Log Effect
    useEffect(() => {
        if (!isActive) return;
        let logIndex = 0;
        const logInterval = setInterval(() => {
            if (logIndex < theme.logs.length) {
                setVisibleLogs(prev => [...prev, theme.logs[logIndex]]);
                logIndex++;
                audioService.play('UI_HOVER');
            } else {
                clearInterval(logInterval);
            }
        }, 400);
        return () => clearInterval(logInterval);
    }, [isActive, theme]);

    // Canvas Animation
    useEffect(() => {
        if (!isActive) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d', { alpha: true });
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        let w = window.innerWidth;
        let h = window.innerHeight;
        
        const resize = () => {
            w = window.innerWidth;
            h = window.innerHeight;
            canvas.width = w * dpr;
            canvas.height = h * dpr;
            canvas.style.width = `${w}px`;
            canvas.style.height = `${h}px`;
            ctx.scale(dpr, dpr);
        };
        resize();

        const particles: Particle[] = [];
        let frameCount = 0;

        const spawnParticle = () => {
            const maxLife = 100 + Math.random() * 100;
            const colorRand = Math.random();
            const color = colorRand < 0.5 ? theme.primaryColor : colorRand < 0.8 ? theme.secondaryColor : theme.accentColor;

            switch (theme.particleType) {
                case 'rain':
                    particles.push({
                        x: Math.random() * w, y: -20,
                        vx: 0, vy: Math.random() * 3 + 2,
                        size: Math.random() * 12 + 4, life: 0, maxLife,
                        color, rotation: 0, vr: 0
                    });
                    break;
                case 'sparks':
                    particles.push({
                        x: w / 2 + (Math.random() - 0.5) * 100, y: h + 20,
                        vx: (Math.random() - 0.5) * 2, vy: -(Math.random() * 4 + 3),
                        size: Math.random() * 4 + 2, life: 0, maxLife,
                        color, rotation: 0, vr: 0
                    });
                    break;
                case 'dust':
                    particles.push({
                        x: Math.random() * w, y: Math.random() * h,
                        vx: (Math.random() - 0.5) * 0.5, vy: (Math.random() - 0.5) * 0.5,
                        size: Math.random() * 2 + 1, life: 0, maxLife: 200,
                        color, rotation: 0, vr: 0
                    });
                    break;
                case 'fractals':
                    particles.push({
                        x: w / 2, y: h / 2,
                        vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6,
                        size: Math.random() * 6 + 2, life: 0, maxLife: 120,
                        color, rotation: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.1
                    });
                    break;
            }
        };

        let animId: number;
        const loop = () => {
            ctx.clearRect(0, 0, w, h);
            frameCount++;

            // Draw radial glow
            const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
            grad.addColorStop(0, `${theme.primaryColor}15`);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, w, h);

            // Spawn logic
            if (frameCount % 3 === 0 && particles.length < 150) {
                spawnParticle();
            }

            // Update & Draw
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life++;
                p.rotation += p.vr;

                if (theme.particleType === 'sparks') p.vy += 0.05;
                if (theme.particleType === 'dust') {
                    p.vx += (Math.random() - 0.5) * 0.1;
                    p.vy += (Math.random() - 0.5) * 0.1;
                }

                if (p.life > p.maxLife || p.y > h + 50 || p.y < -50) {
                    particles.splice(i, 1);
                    continue;
                }

                const fadeIn = Math.min(1, p.life / 20);
                const fadeOut = Math.min(1, (p.maxLife - p.life) / 30);
                const alpha = Math.min(fadeIn, fadeOut);

                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.fillStyle = p.color;
                ctx.shadowColor = p.color;
                ctx.shadowBlur = 10;

                if (theme.particleType === 'rain') {
                    ctx.font = `bold ${p.size}px monospace`;
                    ctx.fillText(Math.random() > 0.5 ? '0' : '1', p.x, p.y);
                } else if (theme.particleType === 'fractals') {
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.rotation);
                    ctx.beginPath();
                    for (let j = 0; j < 6; j++) {
                        const angle = (Math.PI / 3) * j;
                        ctx.lineTo(Math.cos(angle) * p.size, Math.sin(angle) * p.size);
                    }
                    ctx.closePath();
                    ctx.fill();
                } else {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            }

            animId = requestAnimationFrame(loop);
        };

        loop();
        window.addEventListener('resize', resize);
        return () => {
            cancelAnimationFrame(animId);
            window.removeEventListener('resize', resize);
        };
    }, [isActive, theme]);

    if (!isActive) return null;

    return (
        <AnimatePresence>
            <motion.div 
                className="fixed inset-0 z-[250] flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden pointer-events-auto bg-slate-950/90 backdrop-blur-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Canvas Background */}
                <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
                <div className={`absolute inset-0 bg-gradient-to-b ${theme.bgGradient} opacity-80 pointer-events-none`} />
                <div className="absolute inset-0 bg-scanlines opacity-[0.05] pointer-events-none" />

                {/* Content Container */}
                <div className="relative z-10 flex flex-col items-center justify-between h-full w-full max-w-2xl mx-auto py-2">
                    
                    {/* Top Header: Title */}
                    <motion.div 
                        className="flex flex-col items-center gap-2 mt-2 sm:mt-4 text-center shrink-0"
                        initial={{ y: -30, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                    >
                        <div className="flex items-center gap-2 px-3.5 py-1 bg-black/50 border rounded-full backdrop-blur-md" style={{ borderColor: `${theme.primaryColor}50` }}>
                            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.primaryColor }} />
                            <span className="text-[10px] font-mono font-black uppercase tracking-[0.25em]" style={{ color: theme.accentColor }}>
                                {language === 'RU' ? 'СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА' : 'SYNCHRONIZATION COMPLETE'}
                            </span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-200 to-slate-400 uppercase drop-shadow-md">
                            {language === 'RU' ? 'ПОБЕДА' : 'VICTORY'}
                        </h1>
                        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-slate-400">{theme.titleText}</p>
                    </motion.div>

                    {/* Middle Scrollable Section: Score, Logs, Rewards, Roulette & Items */}
                    {showUI && (
                        <motion.div 
                            className="w-full flex flex-col items-center gap-4 my-3 my-2 overflow-y-auto max-h-[55vh] sm:max-h-[60vh] pr-1.5 custom-scrollbar"
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                        >
                            {/* Score & Logs row */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                                {/* Rating Box */}
                                <div className="flex flex-col items-center justify-center bg-slate-950/70 backdrop-blur-md border border-white/10 rounded-xl p-3.5 text-center shadow-lg">
                                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                        {language === 'RU' ? 'ОЧКИ РЕЙТИНГА' : 'RATING POINTS'}
                                    </div>
                                    <div className="text-3xl font-black font-mono" style={{ color: theme.primaryColor }}>
                                        {score.toLocaleString()}
                                    </div>
                                </div>

                                {/* Terminal Logs Box */}
                                <div className="w-full bg-slate-950/70 border rounded-xl p-3 h-24 overflow-hidden backdrop-blur-md flex flex-col justify-between shadow-lg" style={{ borderColor: `${theme.primaryColor}30` }}>
                                    <div className="text-[8px] font-mono uppercase tracking-widest pb-1 border-b border-white/5 flex items-center justify-between" style={{ color: theme.secondaryColor }}>
                                        <span>SYSTEM_LOGS // SECURE</span>
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                    </div>
                                    <div className="flex flex-col gap-0.5 text-[9.5px] font-mono overflow-hidden">
                                        <AnimatePresence>
                                            {visibleLogs.map((log, i) => (
                                                <motion.div 
                                                    key={i} 
                                                    initial={{ opacity: 0, x: -10 }} 
                                                    animate={{ opacity: 1, x: 0 }}
                                                    className="flex items-center gap-1.5 truncate"
                                                >
                                                    <span style={{ color: theme.primaryColor }}>&gt;</span>
                                                    <span className="text-slate-300 truncate">{log}</span>
                                                </motion.div>
                                            ))}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>

                            {/* 1. GUARANTEED BUILDING HEX REWARDS SECTION */}
                            <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur-xl shadow-lg">
                                <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-emerald-400" />
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                                            {language === 'RU' ? 'ГЕКСЫ ДЛЯ СТРОИТЕЛЬСТВА' : 'ACQUIRED BUILDING HEXES'}
                                        </h3>
                                    </div>
                                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-900 px-2 py-0.5 border border-slate-700/60 rounded-md">
                                        {language === 'RU' ? 'ГАРАНТИРОВАННО' : 'GUARANTEED'}
                                    </span>
                                </div>

                                {wasRewardPreviouslyClaimed ? (
                                    <div className="bg-slate-900/60 border border-amber-500/30 p-2.5 rounded-xl text-center">
                                        <p className="text-amber-300/80 text-[11px] font-mono font-bold uppercase tracking-wide">
                                            {language === 'RU' 
                                                ? '⚠️ Награда за этот уровень уже была получена ранее' 
                                                : '⚠️ Level reward already claimed previously'}
                                        </p>
                                    </div>
                                ) : victoryRewards ? (
                                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                        {[
                                            { lvl: victoryRewards.lvl0, count: victoryRewards.l0 },
                                            { lvl: victoryRewards.lvl1, count: victoryRewards.l1 },
                                            { lvl: victoryRewards.lvl2, count: victoryRewards.l2 },
                                        ].map((item, idx) => {
                                            const style = getHexLevelStyle(item.lvl);
                                            return (
                                                <div 
                                                    key={idx} 
                                                    className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border ${style.border} ${style.bg} ${style.glow} transition-all`}
                                                >
                                                    <div className={`px-2 py-0.5 rounded text-[10px] font-black font-mono ${style.badge} mb-1`}>
                                                        L{item.lvl}
                                                    </div>
                                                    <span className={`text-xs sm:text-sm font-black font-mono ${style.text}`}>
                                                        +{item.count} {language === 'RU' ? 'шт' : 'qty'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-slate-500 text-xs text-center py-2 font-mono">
                                        {language === 'RU' ? 'Расчет наград...' : 'Calculating rewards...'}
                                    </div>
                                )}
                            </div>

                            {/* 2. ITEM EXTRACTION SECTION (IF PLAYER INVENTORY HAS ITEMS) */}
                            {playerInventory && playerInventory.length > 0 && (
                                <div className="w-full bg-slate-950/70 border border-slate-800/80 rounded-2xl p-3.5 backdrop-blur-xl shadow-lg">
                                    <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-800/80">
                                        <div className="flex items-center gap-2">
                                            <Box className="w-4 h-4 text-purple-400" />
                                            <h3 className="text-xs font-black uppercase tracking-wider text-purple-300">
                                                {language === 'RU' ? 'ЭКСТРАКЦИЯ ПРЕДМЕТОВ' : 'ITEM EXTRACTION'}
                                            </h3>
                                        </div>
                                        <span className="text-[9px] font-mono font-bold text-purple-400 uppercase tracking-widest bg-purple-950/40 px-2 py-0.5 border border-purple-800/60 rounded-md">
                                            {playerInventory.length} {language === 'RU' ? 'ПРЕДМ.' : 'ITEMS'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {playerInventory.map(item => (
                                            <div 
                                                key={item.id}
                                                className={`p-2 border rounded-xl bg-slate-900/60 flex flex-col items-center justify-center text-center ${
                                                    item.rarity === 'LEGENDARY' ? 'border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]' :
                                                    item.rarity === 'RARE' ? 'border-purple-500/60' : 'border-blue-500/60'
                                                }`}
                                            >
                                                <span className="text-lg mb-0.5">
                                                    {item.visualType === 'ARTIFACT' ? '💎' : item.visualType === 'TOOL' ? '⛏️' : item.visualType === 'HEAD' ? '🪖' : '👕'}
                                                </span>
                                                <span className="text-[9px] font-extrabold text-slate-200 uppercase truncate w-full">{item.name}</span>
                                                <span className={`text-[7.5px] font-mono font-bold uppercase ${
                                                    item.rarity === 'LEGENDARY' ? 'text-amber-400' :
                                                    item.rarity === 'RARE' ? 'text-purple-400' : 'text-blue-400'
                                                }`}>{item.rarity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Bottom Action Buttons */}
                    {showUI && (
                        <motion.div 
                            className="w-full max-w-md flex flex-col gap-2.5 mt-2 shrink-0"
                            initial={{ y: 30, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
                        >
                            <motion.button 
                                whileHover={{ scale: 1.02 }} 
                                whileTap={{ scale: 0.98 }} 
                                onClick={onNext}
                                className="w-full py-3 sm:py-3.5 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xl transition-all"
                                style={{ backgroundColor: theme.primaryColor, color: '#000', boxShadow: `0 0 25px ${theme.primaryColor}50` }}
                            >
                                {language === 'RU' ? 'СЛЕДУЮЩИЙ УРОВЕНЬ' : 'NEXT LEVEL'}
                                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
                            </motion.button>
                            
                            <div className="grid grid-cols-2 gap-2.5">
                                <motion.button 
                                    whileHover={{ scale: 1.02 }} 
                                    whileTap={{ scale: 0.98 }} 
                                    onClick={onRetry}
                                    className="py-2.5 bg-slate-800/90 hover:bg-slate-700 text-white font-bold uppercase tracking-wider text-xs rounded-lg flex items-center justify-center gap-2 transition-all border border-white/10"
                                >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    {language === 'RU' ? 'ЗАНОВО' : 'RETRY'}
                                </motion.button>
                                <motion.button 
                                    whileHover={{ scale: 1.02 }} 
                                    whileTap={{ scale: 0.98 }} 
                                    onClick={onMenu}
                                    className="py-2.5 bg-slate-900/90 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase tracking-wider text-xs rounded-lg flex items-center justify-center gap-2 transition-all border border-white/5"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    {language === 'RU' ? 'ВЫХОД' : 'EXIT'}
                                </motion.button>
                            </div>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VictorySequence;
