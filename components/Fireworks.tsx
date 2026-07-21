import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store';
import { audioService } from '../services/audioService';
import { ArrowRight, RotateCcw, LogOut, Trophy } from 'lucide-react';

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
    const [theme, setTheme] = useState<ThemeConfig>(getThemeForLevel(levelId, language));
    const [visibleLogs, setVisibleLogs] = useState<string[]>([]);
    const [showUI, setShowUI] = useState(false);

    useEffect(() => {
        if (isActive) {
            setTheme(getThemeForLevel(levelId, language));
            audioService.play('SUCCESS');
            const timer = setTimeout(() => audioService.play('LEVEL_UP'), 600);
            const uiTimer = setTimeout(() => setShowUI(true), 1200);
            return () => { clearTimeout(timer); clearTimeout(uiTimer); };
        } else {
            setShowUI(false);
            setVisibleLogs([]);
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
            grad.addColorStop(0, `${theme.primaryColor}15`); // 15 = hex opacity ~8%
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

                // Physics per type
                if (theme.particleType === 'sparks') p.vy += 0.05; // Gravity
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
                className="fixed inset-0 z-[250] flex flex-col items-center justify-center overflow-hidden pointer-events-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
            >
                {/* Canvas Background */}
                <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
                <div className={`absolute inset-0 bg-gradient-to-b ${theme.bgGradient} opacity-80 pointer-events-none`} />
                <div className="absolute inset-0 bg-scanlines opacity-[0.05] pointer-events-none" />

                {/* Content Container */}
                <div className="relative z-10 flex flex-col items-center justify-between h-full w-full p-6 sm:p-10 max-w-4xl mx-auto">
                    
                    {/* Top: Title */}
                    <motion.div 
                        className="flex flex-col items-center gap-4 mt-10 sm:mt-0"
                        initial={{ y: -50, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                        <div className="flex items-center gap-2 px-4 py-1.5 bg-black/40 border rounded-full backdrop-blur-md" style={{ borderColor: `${theme.primaryColor}50` }}>
                            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: theme.primaryColor }} />
                            <span className="text-[10px] font-mono font-black uppercase tracking-[0.3em]" style={{ color: theme.accentColor }}>
                                {language === 'RU' ? 'СИНХРОНИЗАЦИЯ ЗАВЕРШЕНА' : 'SYNCHRONIZATION COMPLETE'}
                            </span>
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 uppercase">
                            {language === 'RU' ? 'ПОБЕДА' : 'VICTORY'}
                        </h1>
                        <p className="text-xs font-mono uppercase tracking-[0.2em] text-slate-400">{theme.titleText}</p>
                    </motion.div>

                    {/* Middle: Score & Stats (If visible) */}
                    {showUI && (
                        <motion.div 
                            className="flex flex-col items-center gap-6 my-8"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 200 }}
                        >
                            <div className="flex flex-col items-center bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-6 min-w-[280px]">
                                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">
                                    <Trophy className="w-3.5 h-3.5" />
                                    {language === 'RU' ? 'ОЧКИ РЕЙТИНГА' : 'RATING POINTS'}
                                </div>
                                <div className="text-4xl font-black font-mono" style={{ color: theme.primaryColor }}>
                                    {score.toLocaleString()}
                                </div>
                            </div>
                            
                            {/* Terminal Logs Box */}
                            <div className="w-full max-w-sm bg-black/50 border rounded-xl p-3 h-32 overflow-hidden backdrop-blur-sm" style={{ borderColor: `${theme.primaryColor}30` }}>
                                <div className="text-[8px] font-mono uppercase tracking-widest pb-1 mb-1 border-b border-white/5" style={{ color: theme.secondaryColor }}>
                                    SYSTEM_LOGS // SECURE
                                </div>
                                <div className="flex flex-col gap-1 text-[10px] font-mono">
                                    <AnimatePresence>
                                        {visibleLogs.map((log, i) => (
                                            <motion.div 
                                                key={i} 
                                                initial={{ opacity: 0, x: -10 }} 
                                                animate={{ opacity: 1, x: 0 }}
                                                className="flex items-center gap-2"
                                            >
                                                <span style={{ color: theme.primaryColor }}>&gt;</span>
                                                <span className="text-slate-300">{log}</span>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Bottom: Actions */}
                    {showUI && (
                        <motion.div 
                            className="w-full max-w-sm flex flex-col gap-3 mb-10 sm:mb-0"
                            initial={{ y: 50, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                        >
                            <motion.button 
                                whileHover={{ scale: 1.02 }} 
                                whileTap={{ scale: 0.98 }} 
                                onClick={onNext}
                                className="w-full py-4 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg transition-all"
                                style={{ backgroundColor: theme.primaryColor, color: '#000', boxShadow: `0 0 25px ${theme.primaryColor}50` }}
                            >
                                {language === 'RU' ? 'СЛЕДУЮЩИЙ УРОВЕНЬ' : 'NEXT LEVEL'}
                                <ArrowRight className="w-5 h-5" />
                            </motion.button>
                            
                            <div className="grid grid-cols-2 gap-3">
                                <motion.button 
                                    whileHover={{ scale: 1.02 }} 
                                    whileTap={{ scale: 0.98 }} 
                                    onClick={onRetry}
                                    className="py-3 bg-slate-800/80 hover:bg-slate-700 text-white font-bold uppercase tracking-wider text-xs rounded-lg flex items-center justify-center gap-2 transition-all border border-white/10"
                                >
                                    <RotateCcw className="w-4 h-4" />
                                    {language === 'RU' ? 'ЗАНОВО' : 'RETRY'}
                                </motion.button>
                                <motion.button 
                                    whileHover={{ scale: 1.02 }} 
                                    whileTap={{ scale: 0.98 }} 
                                    onClick={onMenu}
                                    className="py-3 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white font-bold uppercase tracking-wider text-xs rounded-lg flex items-center justify-center gap-2 transition-all border border-white/5"
                                >
                                    <LogOut className="w-4 h-4" />
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