import React, { useState, useEffect, useRef, useCallback, useMemo, useId } from 'react';
import { useGameStore } from '../store.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, LogOut, Ghost, ArrowRight, X, LogIn, Lock, Target, Gem, Crown, 
  Bot, Volume2, VolumeX, BookOpen, Music, ChevronLeft, ChevronRight, 
  Swords, Layers, Map as MapIcon, Box, Hexagon, UserPlus, Fingerprint, User, 
  Mountain, Crosshair, Shuffle, Settings, Minus, Plus, Compass, Check, Cpu
} from 'lucide-react';

import { WinCondition, Difficulty } from '../types.ts';
import { TEXT } from '../services/i18n.ts';
import { audioService } from '../services/audioService.ts';
import { DIFFICULTY_SETTINGS } from '../rules/config.ts';

// --- CONSTANTS & STATIC DATA (Prevented from recreating on every render) ---

const AVATAR_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e', 
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'  
];

const GLOBAL_CSS = `
  @keyframes float-particle {
    0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.15; }
    50% { transform: translate3d(var(--float-x), -150px, 0) scale(1.4); opacity: 0.7; }
    100% { transform: translate3d(0, -300px, 0) scale(1); opacity: 0.15; }
  }
  @keyframes nebula-slow-1 {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    33% { transform: translate3d(30px, -20px, 0) scale(1.1); }
    66% { transform: translate3d(-15px, 40px, 0) scale(0.9); }
    100% { transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes nebula-slow-2 {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(-40px, 30px, 0) scale(1.15); }
    100% { transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes nebula-slow-3 {
    0% { transform: translate3d(0, 0, 0) scale(1); }
    50% { transform: translate3d(20px, -30px, 0) scale(1.2); }
    100% { transform: translate3d(0, 0, 0) scale(1); }
  }
  @keyframes float-hex {
    0% { transform: translate3d(0, 0, 0) rotate(var(--hex-rot)) scale(0.8); opacity: 0.03; }
    50% { transform: translate3d(var(--hex-x), -100px, 0) rotate(calc(var(--hex-rot) + 180deg)) scale(1.15); opacity: 0.18; }
    100% { transform: translate3d(0, -200px, 0) rotate(calc(var(--hex-rot) + 360deg)) scale(0.8); opacity: 0.03; }
  }
  @keyframes grid-slow {
    0% { transform: rotateX(12deg) translate3d(0, 0, 0); }
    50% { transform: rotateX(16deg) translate3d(0, -15px, 0); }
    100% { transform: rotateX(12deg) translate3d(0, 0, 0); }
  }
  @keyframes spin-sweep { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes glint-sweep {
    0% { transform: translate3d(-100%, 0, 0) skewX(-20deg); }
    30% { transform: translate3d(200%, 0, 0) skewX(-20deg); }
    100% { transform: translate3d(200%, 0, 0) skewX(-20deg); }
  }
`;

const MENU_BUTTON_STYLES = {
  primary: 'bg-gradient-to-r from-indigo-950/50 to-indigo-900/30 border-indigo-500/40 hover:from-indigo-900/60 hover:to-indigo-800/40 text-white hover:border-indigo-400 shadow-[0_4px_24px_rgba(99,102,241,0.15)] hover:shadow-[0_4px_30px_rgba(99,102,241,0.35)]',
  campaign: 'bg-gradient-to-r from-violet-950/50 via-purple-950/40 to-violet-950/50 border-purple-500/40 hover:border-purple-400 hover:from-purple-900/60 hover:via-indigo-900/40 hover:to-purple-900/60 text-white shadow-[0_4px_24px_rgba(168,85,247,0.15)] hover:shadow-[0_4px_30px_rgba(168,85,247,0.35)]',
  battle: 'bg-gradient-to-r from-rose-950/50 via-red-950/40 to-rose-950/50 border-rose-500/40 hover:border-red-400 hover:from-red-900/60 hover:via-rose-900/40 hover:to-red-900/60 text-white shadow-[0_4px_24px_rgba(244,63,94,0.15)] hover:shadow-[0_4px_30px_rgba(244,63,94,0.35)]',
  resume: 'bg-gradient-to-r from-amber-950/60 via-yellow-950/50 to-amber-950/60 border-amber-500/60 hover:border-amber-400 hover:from-amber-900/70 hover:to-amber-900/60 text-amber-50 shadow-[0_0_25px_rgba(245,158,11,0.25)] hover:shadow-[0_0_35px_rgba(245,158,11,0.45)] border-t-amber-400/20',
  danger: 'bg-red-950/25 border-red-900/30 hover:bg-red-900/30 hover:border-red-500/50 text-red-100',
  default: 'bg-slate-900/50 border-slate-700/60 hover:bg-slate-800/60 hover:border-indigo-500/50 text-slate-200 hover:text-white shadow-[0_4px_20px_rgba(0,0,0,0.25)]'
};

const MENU_ICON_STYLES = {
  primary: 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 group-hover:bg-indigo-500/25 group-hover:text-white group-hover:scale-110',
  campaign: 'bg-purple-500/10 border border-purple-500/30 text-purple-300 group-hover:bg-purple-500/25 group-hover:text-white group-hover:scale-110',
  battle: 'bg-rose-500/10 border border-rose-500/30 text-rose-300 group-hover:bg-rose-500/25 group-hover:text-white group-hover:scale-110',
  resume: 'bg-amber-500/15 border border-amber-500/40 text-amber-300 group-hover:bg-amber-500/30 group-hover:text-white group-hover:scale-110 animate-pulse',
  danger: 'bg-red-500/10 border border-red-500/20 text-red-400 group-hover:bg-red-500/20 group-hover:text-red-200',
  default: 'bg-slate-800/40 border border-slate-700/50 text-slate-400 group-hover:bg-indigo-500/10 group-hover:border-indigo-500/30 group-hover:text-indigo-300 group-hover:scale-110'
};

const LED_COLORS = {
  primary: 'bg-indigo-500 shadow-[0_0_8px_#6366f1]',
  campaign: 'bg-purple-500 shadow-[0_0_8px_#a855f7]',
  battle: 'bg-rose-500 shadow-[0_0_8px_#f43f5e]',
  resume: 'bg-amber-400 shadow-[0_0_12px_#fbbf24]',
  danger: 'bg-red-500 shadow-[0_0_8px_#ef4444]',
  default: 'bg-indigo-400/40'
};

const SPOTLIGHT_COLORS = {
  primary: 'rgba(99,102,241,0.12)',
  campaign: 'rgba(168,85,247,0.12)',
  battle: 'rgba(244,63,94,0.12)',
  resume: 'rgba(245,158,11,0.12)',
  danger: 'rgba(239,68,68,0.1)',
  default: 'rgba(129,140,248,0.08)'
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 140, damping: 16 } }
} as const;

// --- MEMOIZED UI COMPONENTS ---

const MainMenuStyleBlock = React.memo(() => (
  <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
));

const NebulaBackground = React.memo(() => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
    <div className="absolute inset-0 bg-transparent" />
    <div className="absolute top-[-10%] left-[-15%] w-[70vw] h-[70vw] rounded-full bg-indigo-900/20 blur-[120px]" style={{ animation: 'nebula-slow-1 30s infinite ease-in-out', willChange: 'transform' }} />
    <div className="absolute bottom-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-fuchsia-950/20 blur-[130px]" style={{ animation: 'nebula-slow-2 25s infinite ease-in-out', willChange: 'transform' }} />
    <div className="absolute top-[40%] right-[20%] w-[50vw] h-[50vw] rounded-full bg-cyan-950/15 blur-[100px]" style={{ animation: 'nebula-slow-3 22s infinite ease-in-out', willChange: 'transform' }} />
  </div>
));

const FloatingParticles = React.memo(() => {
  // Generate particles only once using useMemo to prevent GC spikes on re-renders
  const particles = useMemo(() => Array.from({ length: 25 }).map(() => ({
    size: Math.random() * 3 + 1.5,
    initialX: Math.random() * 100,
    initialY: Math.random() * 100,
    duration: Math.random() * 12 + 10,
    delay: Math.random() * -12,
    floatX: Math.random() * 30 - 15,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-indigo-400/20 blur-[0.5px]"
          style={{
            width: p.size, height: p.size,
            left: `${p.initialX}%`, top: `${p.initialY}%`,
            boxShadow: '0 0 6px rgba(129, 140, 248, 0.5)',
            animation: `float-particle ${p.duration}s infinite ease-in-out`,
            animationDelay: `${p.delay}s`,
            willChange: 'transform, opacity',
            '--float-x': `${p.floatX}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
});

const GridAtmosphere = React.memo(() => (
  <div 
    className="absolute inset-0 overflow-hidden pointer-events-none z-0 opacity-15"
    style={{
      backgroundImage: `linear-gradient(rgba(79, 70, 229, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(79, 70, 229, 0.08) 1px, transparent 1px)`,
      backgroundSize: '40px 40px',
      backgroundPosition: 'center',
      perspective: '1000px',
    }}
  >
    <div className="absolute inset-0" style={{ transformStyle: "preserve-3d", animation: 'grid-slow 20s infinite ease-in-out', willChange: 'transform' }} />
  </div>
));

const FloatingHexagons = React.memo(() => {
  const hexes = useMemo(() => Array.from({ length: 6 }).map(() => ({
    size: Math.random() * 40 + 20,
    initialX: Math.random() * 100,
    initialY: Math.random() * 100,
    duration: Math.random() * 20 + 20,
    delay: Math.random() * -20,
    rotate: Math.random() * 360,
    hexX: Math.random() * 40 - 20,
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
      {hexes.map((h, i) => (
        <div
          key={i}
          className="absolute text-indigo-500/15"
          style={{
            width: h.size, height: h.size,
            left: `${h.initialX}%`, top: `${h.initialY}%`,
            animation: `float-hex ${h.duration}s infinite ease-in-out`,
            animationDelay: `${h.delay}s`,
            willChange: 'transform',
            '--hex-rot': `${h.rotate}deg`,
            '--hex-x': `${h.hexX}px`,
          } as React.CSSProperties}
        >
          <Hexagon className="w-full h-full stroke-current fill-none" strokeWidth={0.8} />
        </div>
      ))}
    </div>
  );
});

// CharacterPreview with unique SVG IDs to prevent filter collisions
const CharacterPreview = React.memo<{ head: number, body: number, color: string }>(({ head, body, color }) => {
    const uid = useId().replace(/:/g, '');
    const headY = 43;
    const bodyY = 55;
    const eyeColor = '#22d3ee';

    const glowId = `glow-${uid}`;
    const blurId = `blur-${uid}`;
    const gliderGradId = `glider-${uid}`;
    const monoGradId = `mono-${uid}`;
    const prismGradId = `prism-${uid}`;
    const tacGradId = `tac-${uid}`;
    const cylGradId = `cyl-${uid}`;

    const renderHead = () => {
        switch(head % 4) {
            case 0: 
                return (
                    <g>
                        <path d={`M 40 ${headY} A 10 10 0 0 1 60 ${headY} Z`} fill="#1e293b" />
                        <rect x="40" y={headY} width="20" height="5" fill="#1e293b" />
                        <line x1="44" y1={headY-8} x2="40" y2={headY-18} stroke="#94a3b8" strokeWidth="2" />
                        <circle cx="40" cy={headY-18} r="1.5" fill={eyeColor} />
                        <circle cx="50" cy={headY-4} r="3" fill={eyeColor} filter={`url(#${glowId})`} />
                    </g>
                );
            case 1: 
                return (
                    <g>
                        <path d={`M 42 ${headY+6} L 58 ${headY+6} L 62 ${headY} L 38 ${headY} Z`} fill={color} />
                        <path d={`M 40 ${headY} L 60 ${headY} L 56 ${headY-12} L 44 ${headY-12} Z`} fill={`url(#${tacGradId})`} />
                        <rect x="42" y={headY-5} width="16" height="3" fill={eyeColor} filter={`url(#${glowId})`} />
                    </g>
                );
            case 2: 
                return (
                    <g>
                        <rect x="42" y={headY-14} width="16" height="20" rx="2" fill={`url(#${cylGradId})`} />
                        <rect x="42" y={headY-10} width="16" height="2" fill="#0f172a" />
                        <rect x="42" y={headY-5} width="16" height="2" fill="#0f172a" />
                        <rect x="42" y={headY} width="16" height="2" fill="#0f172a" />
                        <rect x="48" y={headY-12} width="4" height="14" fill={eyeColor} filter={`url(#${glowId})`} />
                    </g>
                );
            case 3: 
                return (
                    <g>
                        <ellipse cx="50" cy={headY-4} rx="14" ry="8" fill={color} />
                        <ellipse cx="50" cy={headY-4} rx="10" ry="5" fill="#0f172a" />
                        <circle cx="50" cy={headY-4} r="3" fill={eyeColor} filter={`url(#${glowId})`} />
                        <circle cx="50" cy={headY-4} r="1" fill="#ffffff" />
                        <circle cx="34" cy={headY-4} r="2" fill="#38bdf8" />
                        <circle cx="66" cy={headY-4} r="2" fill="#38bdf8" />
                    </g>
                );
            default: return <circle cx="50" cy={headY} r="14" fill={color} />;
        }
    };

    const renderBody = () => {
        const shadow = <ellipse cx="50" cy="67" rx="14" ry="5" fill="rgba(0,0,0,0.4)" filter={`url(#${blurId})`} />;

        switch(body % 4) {
            case 0:
                return (
                    <g>
                        {shadow}
                        <rect x="32" y={bodyY-6} width="10" height="20" rx="3" fill="#1e293b" />
                        <rect x="58" y={bodyY-6} width="10" height="20" rx="3" fill="#1e293b" />
                        <rect x="34" y={bodyY-4} width="6" height="16" fill={color} />
                        <rect x="60" y={bodyY-4} width="6" height="16" fill={color} />
                        <rect x="34" y={bodyY-4} width="2" height="16" fill="rgba(255,255,255,0.4)" />
                        <rect x="60" y={bodyY-4} width="2" height="16" fill="rgba(255,255,255,0.4)" />
                        <path d={`M 40 ${bodyY-10} L 60 ${bodyY-10} L 62 ${bodyY+8} L 38 ${bodyY+8} Z`} fill="#0f172a" />
                        <circle cx="50" cy={bodyY} r="4" fill="#38bdf8" filter={`url(#${glowId})`} />
                    </g>
                );
            case 1:
                return (
                    <g>
                        {shadow}
                        <ellipse cx="50" cy={bodyY+8} rx="12" ry="4" fill="#10b981" filter={`url(#${glowId})`} />
                        <path d={`M 50 ${bodyY-16} L 70 ${bodyY} L 60 ${bodyY+8} L 50 ${bodyY+2} L 40 ${bodyY+8} L 30 ${bodyY} Z`} fill={`url(#${gliderGradId})`} />
                        <path d={`M 50 ${bodyY-10} L 60 ${bodyY} L 40 ${bodyY} Z`} fill="#0f172a" />
                        <circle cx="34" cy={bodyY} r="1.5" fill="#38bdf8" />
                        <circle cx="66" cy={bodyY} r="1.5" fill="#38bdf8" />
                    </g>
                );
            case 2:
                return (
                    <g>
                        {shadow}
                        <path d={`M 44 ${bodyY} L 56 ${bodyY} L 50 ${bodyY+14} Z`} fill="#f59e0b" />
                        <path d={`M 47 ${bodyY} L 53 ${bodyY} L 50 ${bodyY+8} Z`} fill="#fef08a" />
                        <rect x="36" y={bodyY-18} width="28" height="22" fill={`url(#${monoGradId})`} />
                        <rect x="36" y={bodyY-18} width="28" height="2" fill="rgba(255,255,255,0.15)" />
                        <rect x="36" y={bodyY-18} width="2" height="22" fill="rgba(255,255,255,0.15)" />
                        <rect x="40" y={bodyY-14} width="20" height="6" fill="#0f172a" />
                        <rect x="40" y={bodyY-4} width="20" height="4" fill="#0f172a" />
                        <rect x="48" y={bodyY-12} width="4" height="10" fill="#e2e8f0" />
                    </g>
                );
            case 3:
                return (
                    <g>
                        {shadow}
                        <path d={`M 34 ${bodyY-10} L 39 ${bodyY-4} L 30 ${bodyY+2} Z`} fill={color} />
                        <path d={`M 66 ${bodyY-10} L 61 ${bodyY-4} L 70 ${bodyY+2} Z`} fill={color} />
                        <path d={`M 50 ${bodyY-22} L 62 ${bodyY-2} L 50 ${bodyY+14} L 38 ${bodyY-2} Z`} fill={`url(#${prismGradId})`} />
                        <path d={`M 50 ${bodyY-22} L 38 ${bodyY-2} L 50 ${bodyY+14} Z`} fill="rgba(255,255,255,0.3)" />
                    </g>
                );
            default: return <rect x="38" y={bodyY} width="24" height="40" rx="8" fill={color} />;
        }
    };

    return (
        <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-2xl overflow-visible">
            <defs>
                <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id={blurId} x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" />
                </filter>
                <linearGradient id={gliderGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor={color} />
                    <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id={monoGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id={prismGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="20%" stopColor={color} />
                    <stop offset="80%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#000000" />
                </linearGradient>
                <linearGradient id={tacGradId} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id={cylGradId} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="50%" stopColor={color} />
                    <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
            </defs>
            {renderBody()}
            {renderHead()}
        </svg>
    );
});

const MenuButton = React.memo<{ 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  subLabel?: string; 
  variant?: 'primary' | 'battle' | 'campaign' | 'danger' | 'default' | 'resume';
  className?: string;
  style?: React.CSSProperties;
}>(({ onClick, icon, label, subLabel, variant = 'default', className = '', style }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setCoords({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  // Lookup maps instead of switch statements for cleaner code and performance
  const styleClass = MENU_BUTTON_STYLES[variant] || MENU_BUTTON_STYLES.default;
  const iconClass = MENU_ICON_STYLES[variant] || MENU_ICON_STYLES.default;
  const ledClass = LED_COLORS[variant] || LED_COLORS.default;
  const spotlightColor = SPOTLIGHT_COLORS[variant] || SPOTLIGHT_COLORS.default;

  return (
    <motion.button 
      ref={buttonRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 350, damping: 14 }}
      className={`group w-full flex items-center gap-4 p-4 md:p-5 rounded-2xl border backdrop-blur-xl transition-all duration-300 relative overflow-hidden touch-manipulation cursor-pointer ${styleClass} ${className}`}
      style={style}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-[4px] transition-all duration-300 ${ledClass}`} />

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none transition-opacity duration-300"
            style={{
              background: `radial-gradient(130px circle at ${coords.x}px ${coords.y}px, ${spotlightColor}, transparent)`,
              mixBlendMode: 'screen'
            }}
          />
        )}
      </AnimatePresence>

      <div className={`p-3 rounded-xl transition-all duration-300 relative z-10 ${iconClass}`}>
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5 md:w-5 md:h-5 drop-shadow-md' })}
      </div>

      <div className="flex flex-col items-start relative z-10 text-left">
        <span className="text-sm md:text-sm font-black uppercase tracking-wider transition-all duration-300">
          {label}
        </span>
        {subLabel && (
          <span className="text-[11px] font-mono text-slate-400/80 group-hover:text-slate-200 transition-colors mt-0.5 max-w-[200px] md:max-w-xs break-words">
            {subLabel}
          </span>
        )}
      </div>
      
      <div className="ml-auto opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300 text-white/50 relative z-10">
        <ChevronRight className="w-4 h-4" />
      </div>

      <motion.div 
         className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" 
         initial={{ x: '-100%' }}
         animate={{ x: '200%' }}
         transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 1.5 }}
      />
    </motion.button>
  );
});

type AuthMode = 'GUEST' | 'LOGIN' | 'REGISTER' | null;

// --- MAIN COMPONENT ---

const MainMenu: React.FC = () => {
  const user = useGameStore(state => state.user);
  const hasActiveSession = useGameStore(state => state.hasActiveSession);
  const campaignProgress = useGameStore(state => state.campaignProgress);
  const storyMap = useGameStore(state => state.storyMap);
  const hasProgress = campaignProgress > 0 || Object.keys(storyMap || {}).length > 0;
  const isMusicMuted = useGameStore(state => state.isMusicMuted);
  const isSfxMuted = useGameStore(state => state.isSfxMuted);
  const isLiteMode = useGameStore(state => state.isLiteMode);
  const language = useGameStore(state => state.language);
  
  const startNewGame = useGameStore(state => state.startNewGame);
  const setUIState = useGameStore(state => state.setUIState);
  const setLanguage = useGameStore(state => state.setLanguage);
  const setCampaignMode = useGameStore(state => state.setCampaignMode);
  const logout = useGameStore(state => state.logout);
  const loginAsGuest = useGameStore(state => state.loginAsGuest);
  const loginUser = useGameStore(state => state.loginUser);
  const registerUser = useGameStore(state => state.registerUser);
  const abandonSession = useGameStore(state => state.abandonSession);
  const resetProgress = useGameStore(state => state.resetProgress);
  const toggleMusic = useGameStore(state => state.toggleMusic);
  const toggleSfx = useGameStore(state => state.toggleSfx);
  const toggleLiteMode = useGameStore(state => state.toggleLiteMode);
  const playUiSound = useGameStore(state => state.playUiSound);

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [showMissionConfig, setShowMissionConfig] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[5]); 
  const [selectedHead, setSelectedHead] = useState(0);
  const [selectedBody, setSelectedBody] = useState(0);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isGuestRegistration, setIsGuestRegistration] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{type: 'ABANDON_CAMPAIGN' | 'ABANDON_NEW_GAME' | 'LOGOUT' | 'RESET_PROGRESS_ALL', payload?: any} | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);
  const parallaxRef = useRef<HTMLDivElement>(null);

  const [logoVisible, setLogoVisible] = useState(false);

  // Parallax background optimized with requestAnimationFrame
  useEffect(() => {
    if (isLiteMode) {
      if (parallaxRef.current) parallaxRef.current.style.transform = 'translate3d(0, 0, 0)';
      return;
    }
    
    let raf = 0;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (!parallaxRef.current) return;
        const x = (e.clientX / window.innerWidth - 0.5) * 18;
        const y = (e.clientY / window.innerHeight - 0.5) * 18;
        parallaxRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(raf);
    };
  }, [isLiteMode]);

  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [botCount, setBotCount] = useState<number>(1);
  const [storageCap, setStorageCap] = useState<number>(4); 
  const [mapType, setMapType] = useState<'FLAT' | 'CHAOTIC'>('FLAT');
  const [startingArtifactId, setStartingArtifactId] = useState<string>('NONE');
  const [startingCreditsBonus, setStartingCreditsBonus] = useState<number>(0);
  const [startingMovesBonus, setStartingMovesBonus] = useState<number>(0);
  const [mutatorType, setMutatorType] = useState<'NONE' | 'SUDDEN_DEATH' | 'RICH_VEINS' | 'FRAGILE_GROUND' | 'NANO_STORM'>('NONE');

  const t = TEXT[language].MENU;
  
  const MISSION_TIERS = useMemo(() => ({
    1: { level: 5, coins: 0, label: language === 'RU' ? 'ПИК УР.5' : 'SUMMIT L5', time: '~10m', color: 'text-blue-400', difficulty: 'EASY' as Difficulty, icon: Mountain, desc: 'Recon' },
    2: { level: 6, coins: 0, label: language === 'RU' ? 'ПИК УР.6' : 'SUMMIT L6', time: '~15m', color: 'text-amber-400', difficulty: 'MEDIUM' as Difficulty, icon: Target, desc: 'Std Ops' },
    3: { level: 7, coins: 0, label: language === 'RU' ? 'ПИК УР.7' : 'SUMMIT L7', time: '~25m', color: 'text-red-400', difficulty: 'HARD' as Difficulty, icon: Crown, desc: 'Apex' }
  }), [language]);

  useEffect(() => {
      const timer = setTimeout(() => setLogoVisible(true), 100);
      
      if (useGameStore.getState().isLiteMode) {
          useGameStore.setState({ isLiteMode: false });
      }
      
      audioService.startMusic();
      audioService.updateMusic(250, 500);
      
      return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
              setIsSettingsOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startCampaignWithMode = useCallback((mode: 'STORY' | 'LEVELS') => {
    playUiSound('CLICK');
    if (!user) {
        setAuthMode('LOGIN');
        setErrorMessage(null);
        return;
    }
    setCampaignMode(mode);
    if (hasActiveSession) {
        setConfirmAction({ type: 'ABANDON_CAMPAIGN', payload: mode });
    } else {
        setUIState(mode === 'STORY' ? 'STORY_BUILDER' : 'CAMPAIGN_MAP');
    }
  }, [user, hasActiveSession, playUiSound, setCampaignMode, setUIState]);

  const handleNewGameClick = useCallback(() => {
    playUiSound('CLICK');
    if (!user) {
        setAuthMode('LOGIN');
        setErrorMessage(null);
        return;
    }
    if (hasActiveSession) {
      setConfirmAction({ type: 'ABANDON_NEW_GAME' });
    } else {
      setShowMissionConfig(true);
      setSelectedTier(1);
      setDifficulty('EASY');
    }
  }, [user, hasActiveSession, playUiSound]);

  const randomizeConfig = useCallback(() => {
      playUiSound('CLICK');
      const rTier = (Math.floor(Math.random() * 3) + 1) as 1|2|3;
      const diffs: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
      const rDiff = diffs[Math.floor(Math.random() * 3)];
      const rBots = Math.floor(Math.random() * 6) + 1;
      const rStor = Math.floor(Math.random() * 4) + 3;
      const rMap = Math.random() > 0.5 ? 'CHAOTIC' : 'FLAT';

      const artifacts = ['NONE', 'fuel_cell', 'data_disc', 'raw_container', 'reality_patch', 'void_core', 'architect_nanites'];
      const rArt = artifacts[Math.floor(Math.random() * artifacts.length)];

      const creditsBonuses = [0, 20, 50, 100];
      const rCredits = creditsBonuses[Math.floor(Math.random() * creditsBonuses.length)];

      const movesBonuses = [0, 5, 10, 20];
      const rMoves = movesBonuses[Math.floor(Math.random() * movesBonuses.length)];

      const mutators: ('NONE' | 'SUDDEN_DEATH' | 'RICH_VEINS' | 'FRAGILE_GROUND' | 'NANO_STORM')[] = ['NONE', 'SUDDEN_DEATH', 'RICH_VEINS', 'FRAGILE_GROUND', 'NANO_STORM'];
      const rMutator = mutators[Math.floor(Math.random() * mutators.length)];

      setSelectedTier(rTier);
      setDifficulty(rDiff);
      setBotCount(rBots);
      setStorageCap(rStor);
      setMapType(rMap);
      setStartingArtifactId(rArt);
      setStartingCreditsBonus(rCredits);
      setStartingMovesBonus(rMoves);
      setMutatorType(rMutator);
  }, [playUiSound]);

  const confirmMissionStart = useCallback(() => {
    playUiSound('CLICK');
    const tier = MISSION_TIERS[selectedTier as 1|2|3];
    const winCondition: WinCondition = {
      levelId: -1,
      targetLevel: tier.level,
      targetCoins: tier.coins,
      botCount: botCount,
      difficulty: difficulty,
      label: `${tier.label}`,
      queueSize: DIFFICULTY_SETTINGS[difficulty].queueSize,
      winType: 'SUMMIT',
      initialStorage: storageCap,
      mapType: mapType,
      startingArtifactId: startingArtifactId !== 'NONE' ? startingArtifactId : undefined,
      startingCreditsBonus: startingCreditsBonus > 0 ? startingCreditsBonus : undefined,
      startingMovesBonus: startingMovesBonus > 0 ? startingMovesBonus : undefined,
      mutatorType: mutatorType !== 'NONE' ? mutatorType : undefined
    };
    
    startNewGame(winCondition);
    setShowMissionConfig(false);
  }, [playUiSound, MISSION_TIERS, selectedTier, botCount, difficulty, storageCap, mapType, startingArtifactId, startingCreditsBonus, startingMovesBonus, mutatorType, startNewGame]);

  const handleLogout = useCallback(() => {
    playUiSound('CLICK');
    if (hasActiveSession) {
      setConfirmAction({ type: 'LOGOUT' });
    } else {
      logout();
    }
  }, [playUiSound, hasActiveSession, logout]);

  const executeConfirmAction = useCallback(() => {
    playUiSound('CLICK');
    if (!confirmAction) return;

    if (confirmAction.type === 'ABANDON_CAMPAIGN') {
      abandonSession();
      setUIState(confirmAction.payload === 'STORY' ? 'STORY_BUILDER' : 'CAMPAIGN_MAP');
    } else if (confirmAction.type === 'ABANDON_NEW_GAME') {
      setShowMissionConfig(true);
      setSelectedTier(1);
      setDifficulty('EASY');
    } else if (confirmAction.type === 'LOGOUT') {
      logout();
    } else if (confirmAction.type === 'RESET_PROGRESS_ALL') {
      resetProgress();
    }
    setConfirmAction(null);
  }, [playUiSound, confirmAction, abandonSession, setUIState, logout, resetProgress]);

  const cancelConfirmAction = useCallback(() => {
    playUiSound('CLICK');
    setConfirmAction(null);
  }, [playUiSound]);

  const handleAuthSubmit = useCallback(() => {
    playUiSound('CLICK');
    setErrorMessage(null);
    if (!inputName.trim()) {
      setErrorMessage("Name is required.");
      return;
    }

    const safeColor = selectedColor || AVATAR_COLORS[0];

    if (authMode === 'LOGIN') {
      if (!inputPassword.trim()) {
        setErrorMessage("Password is required.");
        return;
      }
      const res = loginUser(inputName, inputPassword);
      if (res.success) {
        setAuthMode(null);
      } else {
        setErrorMessage(res.message || "Login failed.");
      }
    } else if (authMode === 'REGISTER') {
      if (isGuestRegistration) {
        const res = loginAsGuest(inputName, safeColor, selectedHead, selectedBody);
        if (res.success) {
          setAuthMode(null);
        } else {
          setErrorMessage(res.message || "Guest login failed.");
        }
      } else {
        if (!inputPassword.trim()) {
          setErrorMessage("Password is required.");
          return;
        }
        const res = registerUser(inputName, inputPassword, safeColor, selectedHead, selectedBody);
        if (res.success) {
          setAuthMode(null);
        } else {
          setErrorMessage(res.message || "Registration failed.");
        }
      }
    }
  }, [playUiSound, inputName, selectedColor, authMode, inputPassword, isGuestRegistration, selectedHead, selectedBody, loginUser, loginAsGuest, registerUser]);

  const renderAvatar = useCallback((color: string, head: number, body: number, size = 'md') => {
    const dims = size === 'lg' ? 'w-16 h-16' : (size === 'sm' ? 'w-7 h-7' : 'w-10 h-10');
    return (
      <div className={`${dims} rounded-full flex items-center justify-center border-2 border-indigo-400/30 shadow-[0_0_12px_rgba(99,102,241,0.2)] bg-[#0c0d1e] overflow-hidden relative shrink-0`}>
         <div className="scale-50 translate-y-1">
            <CharacterPreview head={head} body={body} color={color} />
         </div>
      </div>
    );
  }, []);

  const getBotLabel = useCallback((count: number) => {
      if (count === 1) return t.BOT_LABEL_DUEL;
      if (count <= 3) return t.BOT_LABEL_SKIRMISH;
      if (count <= 5) return t.BOT_LABEL_WAR;
      return t.BOT_LABEL_CHAOS;
  }, [t.BOT_LABEL_DUEL, t.BOT_LABEL_SKIRMISH, t.BOT_LABEL_WAR, t.BOT_LABEL_CHAOS]);

  const cycleOption = useCallback((setter: (v: number) => void, current: number, direction: 1 | -1, max: number) => {
      let next = current + direction;
      if (next < 0) next = max - 1;
      if (next >= max) next = 0;
      setter(next);
      playUiSound('CLICK');
  }, [playUiSound]);

  // Static arrays to prevent recreation in JSX
  const tierIds = useMemo(() => [1, 2, 3], []);
  const artifactsList = useMemo(() => ([
      { id: 'NONE', label: language === 'RU' ? 'Нет' : 'None' },
      { id: 'fuel_cell', label: language === 'RU' ? 'Топливо' : 'Fuel Cell' },
      { id: 'data_disc', label: language === 'RU' ? 'Диск' : 'Data Disc' },
      { id: 'raw_container', label: language === 'RU' ? 'Ящик' : 'Container' },
      { id: 'reality_patch', label: language === 'RU' ? 'Патч' : 'Patch' },
      { id: 'void_core', label: language === 'RU' ? 'Ядро' : 'Void Core' },
      { id: 'architect_nanites', label: language === 'RU' ? 'Наниты' : 'Nanites' }
  ]), [language]);
  
  const creditBonuses = useMemo(() => [0, 20, 50, 100], []);
  const moveBonuses = useMemo(() => [0, 5, 10, 20], []);
  const mutatorsList = useMemo(() => ([
      { id: 'NONE', label: language === 'RU' ? 'Стандарт' : 'Standard' },
      { id: 'SUDDEN_DEATH', label: language === 'RU' ? 'Внез. Смерть' : 'Sudden Death' },
      { id: 'RICH_VEINS', label: language === 'RU' ? 'Бог. Жилы' : 'Rich Veins' },
      { id: 'FRAGILE_GROUND', label: language === 'RU' ? 'Хрупкий Пол' : 'Fragile Ground' },
      { id: 'NANO_STORM', label: language === 'RU' ? 'Нано-Шторм' : 'Nano-Storm' }
  ]), [language]);

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-auto overflow-hidden font-sans">
      <MainMenuStyleBlock />
      
      <div 
        ref={parallaxRef}
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          transition: 'transform 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
          willChange: 'transform'
        }}
      >
        <NebulaBackground />
        <GridAtmosphere />
        <FloatingHexagons />
        <FloatingParticles />
      </div>
      
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 pt-[calc(env(safe-area-inset-top)+14px)] flex justify-between items-center z-50 pointer-events-auto">
        
        <div className="flex items-center gap-2">
            {!user ? (
              <motion.button 
                onClick={() => { setAuthMode('LOGIN'); setInputName(''); setInputPassword(''); setErrorMessage(null); playUiSound('CLICK'); }} 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-950/40 hover:bg-indigo-900/40 text-indigo-200 hover:text-white rounded-full border border-indigo-500/30 hover:border-indigo-400/80 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] backdrop-blur-xl group cursor-pointer"
              >
                 <Fingerprint className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 drop-shadow-[0_0_8px_currentColor]" />
                 <span className="text-[10px] font-black uppercase tracking-widest drop-shadow-md">{t.MODAL_LOGIN_TITLE}</span>
              </motion.button>
            ) : (
              <div className="flex items-center gap-3 bg-[#0d0f26]/65 backdrop-blur-xl p-1.5 pl-4 pr-1.5 rounded-full border border-indigo-500/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-indigo-500/40 transition-all group">
                <div className="flex flex-col items-start leading-tight">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-black text-white max-w-[110px] truncate drop-shadow-md">{user.nickname}</span>
                    {!user.isGuest ? <Crown className="w-3 h-3 text-amber-400 drop-shadow-[0_0_4px_rgba(245,158,11,0.5)]" /> : null}
                  </div>
                  <span className="text-[9px] text-indigo-300 font-mono uppercase tracking-[0.15em]">
                    {user.isGuest ? t.AUTH_GUEST : 'Commander'}
                  </span>
                </div>
                {renderAvatar(user.avatarColor, user.headIndex, user.bodyIndex, 'sm')}
                <motion.button 
                  onClick={handleLogout} 
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ type: "spring", stiffness: 450, damping: 14 }}
                  className="p-2 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/15 transition-all bg-black/30 border border-slate-800 hover:border-red-500/40 cursor-pointer"
                  title="Logout"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </motion.button>
              </div>
            )}
        </div>

        <div className="relative" ref={settingsMenuRef}>
            <motion.button 
              onClick={() => { setIsSettingsOpen(!isSettingsOpen); playUiSound('CLICK'); }}
              whileHover={{ scale: 1.08, rotate: 10 }}
              whileTap={{ scale: 0.92, rotate: -10 }}
              transition={{ type: "spring", stiffness: 400, damping: 12 }}
              className="w-10 h-10 md:w-11 md:h-11 flex items-center justify-center backdrop-blur-xl rounded-full transition-all border border-indigo-500/30 bg-[#0d0f26]/65 text-indigo-300 hover:text-white hover:border-indigo-400/80 hover:bg-indigo-900/30 hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] shadow-[0_4px_20px_rgba(0,0,0,0.3)] cursor-pointer"
            >
              <Settings className="w-5 h-5" />
            </motion.button>

            <AnimatePresence>
            {isSettingsOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 220 }}
                    className="absolute top-full right-0 mt-2 bg-[#090a18]/95 backdrop-blur-2xl border-2 border-indigo-500/40 p-4 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.7)] flex flex-col gap-3.5 min-w-[260px] z-[60]"
                >
                    <div className="flex flex-col border-b border-indigo-500/20 pb-2 mb-0.5">
                        <span className="text-[9px] font-mono text-indigo-400 uppercase tracking-widest leading-none">SYSTEM PARAMS</span>
                        <span className="text-xs font-black text-white uppercase tracking-wider mt-1">{language === 'RU' ? 'Панель настроек' : 'Control Deck'}</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{language === 'RU' ? 'ЯЗЫК ИНТЕРФЕЙСА' : 'SYSTEM LANGUAGE'}</span>
                        <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-black/40 rounded-xl border border-white/5">
                            <motion.button 
                                onClick={() => { setLanguage('EN'); playUiSound('CLICK'); }}
                                className={`py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${language === 'EN' ? 'bg-indigo-600/30 text-white border border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {language === 'EN' && <Check className="w-3 h-3 text-indigo-400" />}
                                English
                            </motion.button>
                            <motion.button 
                                onClick={() => { setLanguage('RU'); playUiSound('CLICK'); }}
                                className={`py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1 ${language === 'RU' ? 'bg-indigo-600/30 text-white border border-indigo-500/30 shadow-[0_0_8px_rgba(99,102,241,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {language === 'RU' && <Check className="w-3 h-3 text-indigo-400" />}
                                Русский
                            </motion.button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{language === 'RU' ? 'СИГНАЛЫ И ЗВУКИ' : 'AUDIO OUTPUT'}</span>
                        <div className="flex flex-col gap-1.5">
                            <motion.button 
                                onClick={() => { toggleMusic(); playUiSound('CLICK'); }} 
                                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left cursor-pointer ${isMusicMuted ? 'border-slate-800 bg-black/20 text-slate-500' : 'border-indigo-500/30 bg-indigo-950/20 text-indigo-300 hover:bg-indigo-950/30'}`}
                            >
                                <div className="flex items-center gap-2">
                                    {isMusicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5 text-indigo-400" />}
                                    <span className="text-[10px] font-black uppercase tracking-wider">{language === 'RU' ? 'Музыка' : 'Music'}</span>
                                </div>
                                <span className="text-[9px] font-mono leading-none font-bold">{isMusicMuted ? 'OFF' : 'ON'}</span>
                            </motion.button>
                            <motion.button 
                                onClick={() => { toggleSfx(); playUiSound('CLICK'); }} 
                                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left cursor-pointer ${isSfxMuted ? 'border-slate-800 bg-black/20 text-slate-500' : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/30'}`}
                            >
                                <div className="flex items-center gap-2">
                                    {isSfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                                    <span className="text-[10px] font-black uppercase tracking-wider">{language === 'RU' ? 'Эффекты' : 'SFX'}</span>
                                </div>
                                <span className="text-[9px] font-mono leading-none font-bold">{isSfxMuted ? 'OFF' : 'ON'}</span>
                            </motion.button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-1.5">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{language === 'RU' ? 'ПРОИЗВОДИТЕЛЬНОСТЬ' : 'PERFORMANCE'}</span>
                        <div className="flex flex-col gap-1.5">
                            <motion.button 
                                onClick={() => { toggleLiteMode(); playUiSound('CLICK'); }} 
                                className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all text-left cursor-pointer ${isLiteMode ? 'border-amber-500/30 bg-amber-950/20 text-amber-300 hover:bg-amber-950/30' : 'border-slate-800 bg-black/20 text-slate-500 hover:bg-slate-900/30'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Cpu className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[10px] font-black uppercase tracking-wider">{language === 'RU' ? 'Облегченный режим' : 'Lite Mode'}</span>
                                </div>
                                <span className="text-[9px] font-mono leading-none font-bold">{isLiteMode ? 'ON' : 'OFF'}</span>
                            </motion.button>
                        </div>
                    </div>

                    <div className="flex flex-col border-t border-indigo-500/20 pt-3.5 mt-0.5">
                        <motion.button 
                            onClick={() => { setIsSettingsOpen(false); setUIState('LEADERBOARD'); playUiSound('CLICK'); }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center justify-center gap-2 w-full p-2.5 bg-gradient-to-r from-indigo-950/40 to-indigo-900/10 border border-indigo-500/30 hover:border-indigo-400/60 rounded-xl hover:bg-indigo-900/30 hover:text-white transition-all text-center text-indigo-300 text-[10px] font-black uppercase tracking-wider cursor-pointer shadow-inner"
                        >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>{language === 'RU' ? 'Рейтинг лидеров' : 'Launch Rankings'}</span>
                        </motion.button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-12 gap-8 md:gap-14 lg:gap-16 w-full max-w-sm md:max-w-4xl lg:max-w-5xl px-6 md:px-10 z-10 max-h-screen overflow-y-auto no-scrollbar py-24 md:py-6 items-center justify-center">
        
        <motion.div 
            initial={{ opacity: 0, x: -30, scale: 0.95 }}
            animate={{ opacity: logoVisible ? 1 : 0, x: logoVisible ? 0 : -30, scale: logoVisible ? 1 : 0.95 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-6 lg:col-span-7 flex flex-col items-center md:items-start text-center md:text-left select-none relative"
        >
            <motion.div 
                whileHover="hover"
                className="relative w-28 h-28 md:w-36 md:h-36 mb-5 flex items-center justify-center select-none group cursor-pointer"
            >
                <div className="absolute w-32 h-32 md:w-44 md:h-44 bg-indigo-500/20 blur-[30px] md:blur-[45px] rounded-full animate-[pulse_4s_ease-in-out_infinite]" />

                <motion.svg 
                    variants={{ hover: { rotate: 360, transition: { duration: 15, repeat: Infinity, ease: "linear" } } }}
                    className="absolute w-full h-full animate-[spin_25s_linear_infinite]" 
                    viewBox="0 0 100 100"
                >
                    <circle cx="50" cy="50" r="44" stroke="#4f46e5" strokeWidth="1.2" strokeDasharray="6 8 36 8 16 12" fill="none" opacity="0.4" />
                    <circle cx="50" cy="50" r="44" stroke="#c084fc" strokeWidth="2" strokeDasharray="2 18" fill="none" opacity="0.6" />
                </motion.svg>

                <motion.div 
                    variants={{ hover: { rotate: -360, transition: { duration: 8, repeat: Infinity, ease: "linear" } } }}
                    className="absolute inset-1.5 border border-dotted border-indigo-400/30 rounded-full animate-[spin_12s_linear_infinite_reverse]" 
                />

                <div className="absolute inset-3 border border-dashed border-indigo-500/20 rounded-full animate-[spin_18s_linear_infinite]" />

                <motion.div 
                    variants={{ hover: { scale: 1.1, borderColor: "rgba(129, 140, 248, 0.8)", boxShadow: "0 0 20px rgba(99, 102, 241, 0.6)" } }}
                    transition={{ type: "spring", stiffness: 300, damping: 15 }}
                    className="relative z-10 p-1 bg-[#060714]/90 rounded-2xl border-2 border-indigo-500/40 shadow-[inset_0_0_15px_rgba(99,102,241,0.4)] transition-all duration-300"
                >
                    <Hexagon className="w-14 h-14 md:w-16 md:h-16 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.6)] fill-indigo-950/50" strokeWidth={1} />
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                        <Target className="w-5 h-5 md:w-6 md:h-6 text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
                    </div>
                </motion.div>

                <div className="absolute top-1 left-1 text-[7px] text-indigo-400/40 font-mono">X+12.4</div>
                <div className="absolute bottom-1 right-1 text-[7px] text-indigo-400/40 font-mono">Y-45.9</div>
            </motion.div>

            <div className="flex flex-col items-center md:items-start mt-2 relative">
                <div className="relative flex items-center">
                    <span className="hidden md:inline-block text-indigo-500/30 text-4xl lg:text-5xl font-mono mr-3 select-none leading-none animate-pulse">[</span>
                    
                    <h1 className="relative flex select-none uppercase font-black italic tracking-tighter">
                        {Array.from(t.TITLE || "HEXQUEST").map((char, index) => (
                          <motion.span
                            key={index}
                            initial={{ opacity: 0, y: 15, rotateX: -45 }}
                            animate={{ opacity: 1, y: 0, rotateX: 0 }}
                            transition={{ type: "spring", stiffness: 140, damping: 12, delay: index * 0.04 + 0.15 }}
                            whileHover={{ 
                              scale: 1.15, y: -4, color: '#818cf8',
                              textShadow: '0 0 20px rgba(129, 140, 248, 0.8)',
                              transition: { type: "spring", stiffness: 300, damping: 10 } 
                            }}
                            className="inline-block text-5xl sm:text-6xl md:text-5xl lg:text-7xl xl:text-8xl text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-50 to-indigo-200 cursor-default"
                            style={{ WebkitTextStroke: '1.2px rgba(255,255,255,0.25)', filter: 'drop-shadow(0 0 12px rgba(99,102,241,0.3))' }}
                          >
                            {char === ' ' ? '\u00A0' : char}
                          </motion.span>
                        ))}
                        
                        <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent pointer-events-none mix-blend-color-dodge"
                            initial={{ x: '-100%', skewX: -20 }}
                            animate={{ x: '200%' }}
                            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", repeatDelay: 1.5 }}
                        />
                    </h1>

                    <span className="hidden md:inline-block text-indigo-500/30 text-4xl lg:text-5xl font-mono ml-3 select-none leading-none animate-pulse">]</span>
                </div>

                <div className="relative mt-2 px-4 py-1 rounded bg-slate-950/40 border border-indigo-500/10 backdrop-blur-md shadow-[inset_0_0_12px_rgba(99,102,241,0.15)] overflow-hidden">
                    <div className="absolute inset-x-0 bottom-0 h-[1.5px] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent animate-pulse" />
                    <div className="text-xs sm:text-sm md:text-xs lg:text-base text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-fuchsia-400 to-pink-400 font-mono font-black uppercase tracking-[0.3em] md:tracking-[0.4em] drop-shadow-[0_0_8px_rgba(168,85,247,0.3)]">
                        {language === 'RU' ? 'ЭКОНОМИКА' : 'ECONOMY'}
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-3 mt-5 md:mt-6 w-full justify-center md:justify-start">
                <div className="h-[2px] w-10 md:w-14 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent"></div>
                <p className="text-[10px] md:text-[11px] text-indigo-200/95 font-mono font-black tracking-[0.2em] uppercase drop-shadow-[0_0_8px_rgba(99,102,241,0.5)] whitespace-nowrap">
                    {t.SUBTITLE}
                </p>
                <div className="h-[2px] w-10 md:w-14 bg-gradient-to-l from-transparent via-indigo-500/50 to-transparent"></div>
            </div>

            <div className="hidden md:flex items-center gap-2 mt-5 text-[8.5px] text-slate-500 font-mono uppercase tracking-wider select-none">
                <span>VER: 2.0.0 // LIVE</span>
                <span>•</span>
                <span>CORE_INIT_SUCCESS</span>
                <span>•</span>
                <span>SECURE_SESSION</span>
            </div>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="md:col-span-6 lg:col-span-5 flex flex-col gap-3.5 w-full max-w-sm shrink-0"
        >
          <div className="bg-[#0b0c1e]/40 border-2 border-indigo-500/15 p-4 md:p-5 rounded-3xl backdrop-blur-2xl shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex flex-col gap-3.5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] to-transparent pointer-events-none" />
            
            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-indigo-500/20 pointer-events-none" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-indigo-500/20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-indigo-500/20 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-indigo-500/20 pointer-events-none" />

            <motion.div variants={itemVariants}>
              <MenuButton 
                  onClick={() => startCampaignWithMode('STORY')} 
                  variant="campaign" 
                  icon={<BookOpen className="w-5 h-5" />} 
                  label={hasProgress ? t.CONTINUE_GAME : t.CAMPAIGN} 
                  subLabel={hasProgress ? t.CONTINUE_GAME_SUB : t.CAMPAIGN_SUB} 
              />
            </motion.div>

            <motion.div variants={itemVariants}>
              <MenuButton 
                  onClick={handleNewGameClick} 
                  variant="battle" 
                  icon={<Swords className="w-5 h-5" />} 
                  label={t.SKIRMISH} 
                  subLabel={t.SKIRMISH_SUB} 
              />
            </motion.div>

            {hasActiveSession && (
              <motion.div variants={itemVariants} className="relative">
                <div className="absolute -inset-1 bg-amber-500/10 rounded-2xl blur-md animate-pulse pointer-events-none" />
                <MenuButton 
                    onClick={() => { setUIState('GAME'); playUiSound('CLICK'); }} 
                    variant="resume"
                    icon={<Compass className="w-5 h-5" />} 
                    label={t.RESUME} 
                    subLabel={t.RESUME_SUB} 
                />
              </motion.div>
            )}
          </div>
        </motion.div>

      </div>

      <AnimatePresence>
      {authMode && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-xl z-50 flex items-center justify-center p-4 pointer-events-auto"
        >
          <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-slate-950/45 border border-indigo-500/25 rounded-2xl shadow-[0_0_50px_rgba(99,102,241,0.15)] w-full max-w-sm relative overflow-hidden flex flex-col backdrop-blur-xl"
          >
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-indigo-500/40 pointer-events-none" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-indigo-500/40 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-indigo-500/40 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-indigo-500/40 pointer-events-none" />

              <div className="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none" />
              
            <div className="grid grid-cols-2 border-b border-indigo-500/20 bg-[#0d0f22]/60 shrink-0">
                <button 
                    onClick={() => { setAuthMode('LOGIN'); setErrorMessage(null); playUiSound('CLICK'); }} 
                    className={`py-4 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${authMode === 'LOGIN' ? 'bg-[#0f1129]/60 text-indigo-400 border-b-2 border-indigo-500 shadow-[inset_0_0_12px_rgba(99,102,241,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    {t.AUTH_LOGIN}
                </button>
                <button 
                    onClick={() => { setAuthMode('REGISTER'); setErrorMessage(null); playUiSound('CLICK'); }} 
                    className={`py-4 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${authMode === 'REGISTER' ? 'bg-[#0f1129]/60 text-emerald-400 border-b-2 border-emerald-500 shadow-[inset_0_0_12px_rgba(16,185,129,0.2)]' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    {t.AUTH_REGISTER}
                </button>
            </div>

            <div className="p-5 md:p-6 flex flex-col gap-4 overflow-y-auto no-scrollbar max-h-[75vh]">
              <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border shrink-0 ${authMode === 'REGISTER' && isGuestRegistration ? 'bg-slate-800/40 border-slate-700 text-slate-300' : (authMode === 'LOGIN' ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-400' : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400')}`}>
                      {authMode === 'REGISTER' && isGuestRegistration ? <Ghost className="w-5 h-5" /> : (authMode === 'LOGIN' ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
                  </div>
                  <div className="leading-tight text-left">
                      <h2 className="text-base font-bold text-white uppercase tracking-tight">{authMode === 'REGISTER' && isGuestRegistration ? t.MODAL_GUEST_TITLE : (authMode === 'LOGIN' ? t.MODAL_LOGIN_TITLE : t.MODAL_REGISTER_TITLE)}</h2>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5 uppercase tracking-wider">{authMode === 'REGISTER' && isGuestRegistration ? t.MODAL_GUEST_SUBTITLE : (authMode === 'LOGIN' ? t.MODAL_LOGIN_SUBTITLE : t.MODAL_REGISTER_SUBTITLE)}</p>
                  </div>
              </div>

              <AnimatePresence>
              {errorMessage && (
                  <motion.div 
                      initial={{ opacity: 0, y: -5 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -5 }} 
                      className="p-3 bg-red-950/20 border border-red-500/30 rounded-xl text-red-400 text-[10px] font-mono font-black uppercase tracking-wider text-center"
                  >
                      {errorMessage}
                  </motion.div>
              )}
              </AnimatePresence>

              <div className="space-y-4 text-left">
                  {authMode === 'REGISTER' && (
                      <div className="bg-[#0c0d1e]/80 rounded-2xl border border-indigo-500/10 p-3.5 flex flex-col items-center gap-3">
                          <span className="text-[8px] font-black uppercase text-slate-500 tracking-wider w-full text-center">{t.UNIT_CONFIG}</span>
                          <div className="w-20 h-20 flex items-center justify-center bg-black/40 rounded-full border border-indigo-500/20 shadow-inner">
                              <CharacterPreview head={selectedHead} body={selectedBody} color={selectedColor} />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 w-full items-center text-center">
                              <div className="flex flex-col items-center gap-1 bg-black/30 p-1.5 rounded-lg border border-slate-900">
                                  <span className="text-[7px] uppercase font-bold text-slate-500">{t.UNIT_HEAD}</span>
                                  <div className="flex items-center">
                                      <button onClick={() => cycleOption(setSelectedHead, selectedHead, -1, 4)} className="p-0.5 hover:bg-slate-800 text-indigo-400 cursor-pointer"><ChevronLeft className="w-3 h-3"/></button>
                                      <button onClick={() => cycleOption(setSelectedHead, selectedHead, 1, 4)} className="p-0.5 hover:bg-slate-800 text-indigo-400 cursor-pointer"><ChevronRight className="w-3 h-3"/></button>
                                  </div>
                              </div>
                              <div className="flex flex-col items-center gap-1 bg-black/30 p-1.5 rounded-lg border border-slate-900 col-span-1">
                                  <span className="text-[7px] uppercase font-bold text-slate-500">{t.UNIT_HULL}</span>
                                  <div className="flex gap-1 justify-center max-w-full overflow-x-auto py-0.5">
                                      {AVATAR_COLORS.slice(0, 4).map(c => (
                                        <button 
                                          key={c} 
                                          onClick={() => setSelectedColor(c)} 
                                          style={{backgroundColor: c}} 
                                          className={`w-3 h-3 rounded-full shrink-0 ${selectedColor === c ? 'ring-2 ring-white scale-110' : 'opacity-40'} cursor-pointer transition-all`} 
                                        />
                                      ))}
                                  </div>
                              </div>
                              <div className="flex flex-col items-center gap-1 bg-black/30 p-1.5 rounded-lg border border-slate-900">
                                  <span className="text-[7px] uppercase font-bold text-slate-500">{t.UNIT_CHASSIS}</span>
                                  <div className="flex items-center">
                                      <button onClick={() => cycleOption(setSelectedBody, selectedBody, -1, 4)} className="p-0.5 hover:bg-slate-800 text-indigo-400 cursor-pointer"><ChevronLeft className="w-3 h-3"/></button>
                                      <button onClick={() => cycleOption(setSelectedBody, selectedBody, 1, 4)} className="p-0.5 hover:bg-slate-800 text-indigo-400 cursor-pointer"><ChevronRight className="w-3 h-3"/></button>
                                  </div>
                              </div>
                          </div>

                          <button
                              onClick={() => { setIsGuestRegistration(!isGuestRegistration); playUiSound('CLICK'); setErrorMessage(null); }}
                              className="w-full py-2 px-3 border border-indigo-500/15 rounded-xl flex items-center justify-between hover:bg-indigo-950/20 transition-all cursor-pointer"
                          >
                              <div className="flex items-center gap-1.5">
                                  <Ghost className={`w-3.5 h-3.5 ${isGuestRegistration ? 'text-emerald-400' : 'text-slate-500'}`} />
                                  <span className={`text-[8.5px] uppercase tracking-wider font-bold ${isGuestRegistration ? 'text-emerald-400' : 'text-slate-400'}`}>
                                      {isGuestRegistration ? t.BTN_GUEST : t.BYPASS_SECURITY}
                                  </span>
                              </div>
                              <div className={`w-7 h-4 rounded-full border p-0.5 flex ${isGuestRegistration ? 'bg-emerald-500/20 justify-end border-emerald-500/30' : 'bg-black justify-start border-slate-700'} transition-all`}>
                                  <div className={`w-2.5 h-2.5 rounded-full ${isGuestRegistration ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                              </div>
                          </button>
                      </div>
                  )}

                  <div>
                      <label className="text-[8.5px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center gap-1"><User className="w-3 h-3 text-indigo-400" /> {t.INPUT_NAME}</label>
                      <input 
                        type="text" 
                        value={inputName} 
                        onChange={(e) => setInputName(e.target.value)} 
                        placeholder={t.INPUT_NAME_PH} 
                        className="w-full bg-black/60 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono text-xs shadow-inner" 
                        maxLength={16} 
                      />
                  </div>

                  {(authMode === 'LOGIN' || (authMode === 'REGISTER' && !isGuestRegistration)) && (
                      <div>
                          <label className="text-[8.5px] uppercase font-bold text-slate-500 tracking-wider mb-1 flex items-center gap-1"><Lock className="w-3 h-3 text-indigo-400" /> {t.INPUT_PASS}</label>
                          <input 
                            type="password" 
                            value={inputPassword} 
                            onChange={(e) => setInputPassword(e.target.value)} 
                            placeholder={t.INPUT_PASS_PH} 
                            className="w-full bg-black/60 border border-slate-800 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 transition-all font-mono text-xs shadow-inner" 
                          />
                      </div>
                  )}

                  <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAuthSubmit} 
                      className={`w-full py-3.5 mt-3 font-black rounded-xl uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 relative overflow-hidden group ${(authMode === 'REGISTER' && isGuestRegistration) ? 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700 shadow-[0_4px_15px_rgba(0,0,0,0.3)]' : (authMode === 'LOGIN' ? 'bg-indigo-600 text-white shadow-[0_4px_20px_rgba(99,102,241,0.4)] hover:bg-indigo-500' : 'bg-emerald-600 text-white shadow-[0_4px_20px_rgba(16,185,129,0.4)] hover:bg-emerald-500')}`}
                  >
                      <span>{(authMode === 'REGISTER' && isGuestRegistration) ? t.BTN_GUEST : (authMode === 'LOGIN' ? t.BTN_LOGIN : t.BTN_REGISTER)}</span> 
                      <ArrowRight className="w-4 h-4" />
                  </motion.button>
              </div>
            </div>

            <button 
              onClick={() => { setAuthMode(null); setErrorMessage(null); }} 
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-500 hover:text-white hover:bg-slate-800/50 transition-colors rounded-full cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {confirmAction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-xl z-[60] flex items-center justify-center p-4 pointer-events-auto"
            onClick={cancelConfirmAction}
          >
            <motion.div 
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-950/45 border border-amber-500/25 rounded-2xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(245,158,11,0.15)] relative text-center backdrop-blur-xl overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-amber-500/40 pointer-events-none" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-amber-500/40 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-amber-500/40 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-amber-500/40 pointer-events-none" />

                <div className="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none" />
                <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-3 bg-amber-500/10 animate-bounce">
                    <span className="text-amber-500 text-xl font-bold font-mono">!</span>
                </div>
                <h3 className="text-lg font-black font-mono text-white mb-1.5 tracking-tight uppercase">
                    {language === 'RU' ? 'ВНИМАНИЕ' : 'SECURITY WARNING'}
                </h3>
                <p className="text-slate-300 mb-5 text-xs md:text-sm px-2 text-center leading-relaxed">
                    {confirmAction.type === 'LOGOUT' 
                        ? (language === 'RU' ? t.LOGOUT_CONFIRM : t.LOGOUT_CONFIRM)
                        : confirmAction.type === 'RESET_PROGRESS_ALL'
                        ? (language === 'RU' 
                            ? 'Вы уверены, что хотите сбросить ВЕСЬ прогресс обучения, чертежи и очков в 0? Это действие необратимо.' 
                            : 'Are you sure you want to reset ALL training progression, blueprints, and points back to 0? This action is irreversible.')
                        : (language === 'RU' ? t.ABANDON_CONFIRM : t.ABANDON_CONFIRM)}
                </p>
                <div className="flex gap-3 shrink-0">
                    <button 
                        onClick={cancelConfirmAction}
                        className="flex-1 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold uppercase tracking-wider text-xs rounded-xl transition-all border border-slate-800 cursor-pointer"
                    >
                        {language === 'RU' ? 'Отмена' : 'Cancel'}
                    </button>
                    <button 
                        onClick={executeConfirmAction}
                        className="flex-1 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase tracking-wider text-xs rounded-xl transition-all border border-amber-500/40 shadow-[0_4px_15px_rgba(245,158,11,0.3)] cursor-pointer"
                    >
                        {language === 'RU' ? 'Продолжить' : 'Proceed'}
                    </button>
                </div>
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
      {showMissionConfig && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-xl z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 pointer-events-auto"
        >
          <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 280 }}
              className="bg-slate-950/45 border border-indigo-500/25 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-[0_0_50px_rgba(99,102,241,0.15)] w-full max-w-md sm:max-w-xl md:max-w-3xl h-full sm:h-auto max-h-[92vh] sm:max-h-[85vh] md:max-h-[90vh] relative overflow-hidden flex flex-col transition-all duration-300"
          >
              <div className="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/10 blur-[60px] rounded-full pointer-events-none" />
              <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-rose-500/10 blur-[60px] rounded-full pointer-events-none" />

              <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-indigo-500/40 pointer-events-none rounded-tl-2xl sm:rounded-tl-3xl" />
              <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-indigo-500/40 pointer-events-none rounded-tr-2xl sm:rounded-tr-3xl" />
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-indigo-500/40 pointer-events-none rounded-bl-2xl sm:rounded-bl-3xl" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-indigo-500/40 pointer-events-none rounded-br-2xl sm:rounded-br-3xl" />

              <div className="absolute inset-0 bg-scanlines opacity-[0.03] pointer-events-none" />

              <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-white/5 md:border-indigo-500/20 bg-white/2 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2.5 sm:gap-3.5">
                    <motion.div 
                        whileHover={{ rotate: 15, scale: 1.05 }}
                        className="p-2 sm:p-2.5 bg-red-500/10 border border-red-500/20 md:border-red-500/35 rounded-xl sm:rounded-2xl shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                    >
                        <Swords className="w-4 h-4 sm:w-5.5 sm:h-5.5 text-red-500" />
                    </motion.div>
                    <div className="text-left">
                        <h2 className="text-sm sm:text-lg md:text-xl font-black text-white uppercase tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-100 bg-clip-text text-transparent">{t.CONFIG_TITLE}</h2>
                        <div className="flex items-center gap-1.5 mt-0.5 sm:mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                            <p className="text-[8px] sm:text-[10px] text-emerald-400 uppercase tracking-widest font-mono font-black">{t.TERMINAL_ACTIVE}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                    <motion.button 
                        whileHover={{ scale: 1.05, rotate: 180 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={randomizeConfig} 
                        className="p-1.5 sm:p-2.5 text-slate-400 hover:text-white transition-colors rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-indigo-500/40 cursor-pointer" 
                        title="Randomize Parameters"
                    >
                        <Shuffle className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5" />
                    </motion.button>
                    <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setShowMissionConfig(false)} 
                        className="text-slate-400 hover:text-rose-400 transition-colors p-1.5 sm:p-2.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
                    </motion.button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-4 sm:p-6 space-y-4 sm:space-y-6 text-left">
                  
                  <div>
                    <h3 className="text-[8.5px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400/80 flex items-center gap-1.5 mb-2 sm:mb-3">
                        <Target className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-indigo-400" /> {t.COL_GOAL_TITLE}
                    </h3>
                    <div className="grid grid-cols-3 gap-1.5 sm:gap-3">
                        {tierIds.map(id => {
                              const tier = MISSION_TIERS[id as 1|2|3];
                              const isSelected = selectedTier === id;
                              const Icon = tier.icon;
                              return (
                                <motion.button 
                                  whileHover={{ scale: 1.02, y: -2 }}
                                  whileTap={{ scale: 0.98 }}
                                  key={id} 
                                  onClick={() => { setSelectedTier(id as 1|2|3); setDifficulty(tier.difficulty); playUiSound('CLICK'); }}
                                  className={`
                                    relative flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-300 h-14 sm:h-20 md:h-24 lg:h-26 overflow-hidden cursor-pointer text-center
                                    ${isSelected 
                                        ? 'bg-indigo-500/15 border-indigo-500/70 shadow-[0_0_20px_rgba(99,102,241,0.25)] text-white' 
                                        : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/10 text-slate-400'}
                                  `}
                                >
                                   {isSelected && (
                                     <span className="absolute top-1.5 right-1.5 w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-indigo-400 animate-ping" />
                                   )}
                                   <Icon className={`w-3.5 h-3.5 sm:w-5 sm:h-5 mb-1 sm:mb-1.5 transition-all duration-300 ${isSelected ? 'text-indigo-400 scale-110' : 'text-slate-500'}`} />
                                   <span className={`text-[8px] sm:text-[10px] md:text-xs font-black uppercase tracking-wide leading-tight ${isSelected ? 'text-white' : 'text-slate-400'}`}>{tier.label}</span>
                                   <span className={`text-[7px] sm:text-[8px] md:text-[9.5px] font-mono mt-0.5 ${isSelected ? 'text-indigo-300' : 'text-slate-600'}`}>{tier.time}</span>
                                </motion.button>
                              );
                        })}
                    </div>
                  </div>

                  <div className="h-px bg-white/5 w-full" />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-5">
                      
                      <div className="flex flex-col">
                        <div className="bg-white/5 border border-white/5 hover:border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 shadow-lg hover:bg-white/8 transition-all h-full">
                            <div className="flex flex-col text-left">
                                <h3 className="text-[8.5px] sm:text-[10.5px] md:text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                    <MapIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400" /> {language === 'RU' ? 'Рельеф Сектора' : 'Sector Terrain'}
                                </h3>
                                <span className="text-[7.5px] sm:text-[9px] md:text-[10px] text-slate-500 mt-1 sm:mt-1.5 font-mono uppercase tracking-wide leading-relaxed">
                                    {mapType === 'FLAT' 
                                        ? (language === 'RU' ? 'Устойчивые ровные плиты' : 'Flat stable hex tiles') 
                                        : (language === 'RU' ? 'Крутые аномальные уступы' : 'Steep vertical heights')}
                                </span>
                            </div>

                            <div className="flex bg-black/40 p-0.5 rounded-lg sm:rounded-xl border border-white/5 shrink-0 w-24 sm:w-32 md:w-36">
                                <button 
                                    onClick={() => { setMapType('FLAT'); playUiSound('CLICK'); }}
                                    className={`flex-1 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[7.5px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${mapType === 'FLAT' ? 'bg-slate-800 text-white shadow-[0_0_8px_rgba(255,255,255,0.1)]' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {language === 'RU' ? 'Плоский' : 'Flat'}
                                </button>
                                <button 
                                    onClick={() => { setMapType('CHAOTIC'); playUiSound('CLICK'); }}
                                    className={`flex-1 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[7.5px] sm:text-[9px] md:text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer ${mapType === 'CHAOTIC' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    {language === 'RU' ? 'Хаос' : 'Chaos'}
                                </button>
                            </div>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="bg-white/5 border border-white/5 hover:border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 shadow-lg hover:bg-white/8 transition-all h-full">
                            <div className="flex flex-col text-left flex-1">
                                <h3 className="text-[8.5px] sm:text-[10.5px] md:text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                    <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-500" /> {t.LBL_RIVALS}
                                </h3>
                                <span className="text-[7.5px] sm:text-[9px] md:text-[10px] text-slate-500 font-mono mt-1 sm:mt-1.5 uppercase tracking-wide leading-none">
                                    {getBotLabel(botCount)}
                                </span>
                                
                                <div className="flex gap-0.5 sm:gap-1 mt-2 sm:mt-2.5">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div 
                                            key={i} 
                                            className={`w-1 sm:w-1.5 h-1.5 sm:h-2 rounded-[1px] transition-all duration-300 ${i < botCount ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'bg-slate-800'}`} 
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center bg-black/40 p-0.5 border border-white/5 rounded-lg sm:rounded-xl shrink-0 w-20 sm:w-24 md:w-28 justify-between">
                                <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => { if (botCount > 1) { setBotCount(botCount - 1); playUiSound('CLICK'); } }}
                                    disabled={botCount <= 1}
                                    className={`w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center transition-all ${botCount <= 1 ? 'text-slate-800 opacity-20' : 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer'}`}
                                >
                                    <Minus className="w-3 sm:w-4 h-3 sm:h-4" />
                                </motion.button>
                                <span className="text-[10px] sm:text-xs font-mono font-black text-rose-500">{botCount}</span>
                                <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    onClick={() => { if (botCount < 6) { setBotCount(botCount + 1); playUiSound('CLICK'); } }}
                                    disabled={botCount >= 6}
                                    className={`w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center transition-all ${botCount >= 6 ? 'text-slate-800 opacity-20' : 'text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 cursor-pointer'}`}
                                >
                                    <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
                                </motion.button>
                            </div>
                        </div>
                      </div>

                      <div className="col-span-1 sm:col-span-2 bg-white/5 border border-white/5 hover:border-white/10 rounded-xl sm:rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 sm:gap-4 shadow-lg hover:bg-white/8 transition-all">
                          <div className="flex flex-col text-left flex-1">
                              <h3 className="text-[8.5px] sm:text-[10.5px] md:text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                  <Box className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" /> {t.CARGO_CAP}
                              </h3>
                              <span className="text-[7.5px] sm:text-[9px] md:text-[10px] text-slate-500 font-mono mt-1 sm:mt-1.5 uppercase tracking-wide leading-none">
                                  {language === 'RU' ? `Предел хранения: ${storageCap}` : `Inventory Slot Limit: ${storageCap}`}
                              </span>
                              
                              <div className="flex gap-0.5 sm:gap-1 mt-2 sm:mt-2.5">
                                  {Array.from({ length: 6 }).map((_, i) => (
                                      <div 
                                          key={i} 
                                          className={`w-1 sm:w-1.5 h-1.5 sm:h-2 rounded-[1px] transition-all duration-300 ${i < storageCap ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : 'bg-slate-800'}`} 
                                      />
                                  ))}
                              </div>
                          </div>

                          <div className="flex items-center bg-black/40 p-0.5 border border-white/5 rounded-lg sm:rounded-xl shrink-0 w-20 sm:w-24 md:w-28 justify-between">
                              <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => { if (storageCap > 3) { setStorageCap(storageCap - 1); playUiSound('CLICK'); } }}
                                  disabled={storageCap <= 3}
                                  className={`w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center transition-all ${storageCap <= 3 ? 'text-slate-800 opacity-20' : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer'}`}
                              >
                                  <Minus className="w-3 sm:w-4 h-3 sm:h-4" />
                              </motion.button>
                              <span className="text-[10px] sm:text-xs font-mono font-black text-emerald-400">{storageCap}</span>
                              <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  onClick={() => { if (storageCap < 6) { setStorageCap(storageCap + 1); playUiSound('CLICK'); } }}
                                  disabled={storageCap >= 6}
                                  className={`w-5.5 h-5.5 sm:w-7 sm:h-7 rounded-md sm:rounded-lg flex items-center justify-center transition-all ${storageCap >= 6 ? 'text-slate-800 opacity-20' : 'text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 cursor-pointer'}`}
                              >
                                  <Plus className="w-3 sm:w-4 h-3 sm:h-4" />
                              </motion.button>
                          </div>
                      </div>

                      <div className="col-span-1 sm:col-span-2 border-t border-white/5 pt-4">
                          <h3 className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-indigo-400" />
                              {language === 'RU' ? 'ДЕСАНТНЫЕ СРЕДСТВА И СНАРЯЖЕНИЕ' : 'PRE-MISSION DEPLOYMENT & GEAR'}
                          </h3>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white/2 border border-white/5 hover:border-indigo-500/15 rounded-xl p-3 sm:p-4 transition-all">
                                  <span className="text-[8px] sm:text-[9.5px] font-black text-slate-300 uppercase tracking-widest block mb-2">
                                      {language === 'RU' ? 'НАЧАЛЬНЫЙ АРТЕФАКТ' : 'STARTING ARTIFACT'}
                                  </span>
                                  <div className="grid grid-cols-4 gap-1.5">
                                      {artifactsList.map(art => {
                                          const isSelected = startingArtifactId === art.id;
                                          return (
                                              <button
                                                  key={art.id}
                                                  onClick={() => { setStartingArtifactId(art.id); playUiSound('CLICK'); }}
                                                  className={`py-1.5 px-1 rounded-lg text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all border cursor-pointer ${
                                                      isSelected 
                                                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_10px_rgba(99,102,241,0.25)]' 
                                                          : 'bg-black/30 border-white/5 text-slate-400 hover:border-white/10 hover:bg-black/40'
                                                  }`}
                                              >
                                                  {art.label}
                                              </button>
                                          );
                                      })}
                                  </div>
                                  <p className="text-[7.5px] sm:text-[9px] text-indigo-300 font-mono mt-2 uppercase tracking-wide min-h-[24px]">
                                      {startingArtifactId === 'NONE' && (language === 'RU' ? 'Без снаряжения' : 'Begin the simulation without initial gear.')}
                                      {startingArtifactId === 'fuel_cell' && (language === 'RU' ? '+3 Хода на старте | Штраф -15 Кредитов (в ущерб балансу)' : 'Spent Fuel Cell: +3 starting Moves, penalizes initial credits by -15')}
                                      {startingArtifactId === 'data_disc' && (language === 'RU' ? '+15 Кредитов | Аннулирует и сжигает весь стартовый материал' : 'Fragmented Data Disc: +15 starting Credits, obliterates starting materials')}
                                      {startingArtifactId === 'raw_container' && (language === 'RU' ? '+2 Материала | Отнимает -3 Хода на старте' : 'Raw Container: +2 starting Materials, costs -3 starting Moves')}
                                      {startingArtifactId === 'reality_patch' && (language === 'RU' ? '+3% Стабильности щита | Штраф -10 Кредитов' : 'Reality Patch: +3% stability, costs -10 initial credits')}
                                      {startingArtifactId === 'void_core' && (language === 'RU' ? 'Шунт гравитации: Свободный шаг сквозь стены и крутые уступы за 1 ход' : 'Void Core: Shunts gravity, enabling step movement through walls and cliffs')}
                                      {startingArtifactId === 'architect_nanites' && (language === 'RU' ? 'Наниты: Позволяют строить БЕСПЛАТНО, но урезают доход на 100%' : 'Architect Nanites: Free tile upgrades, penalizes passive credits gain by 100%')}
                                  </p>
                              </div>

                              <div className="bg-white/2 border border-white/5 rounded-xl p-3 sm:p-4 flex flex-col justify-between">
                                  <div>
                                      <span className="text-[8px] sm:text-[9.5px] font-black text-slate-300 uppercase tracking-widest block mb-1.5">
                                          {language === 'RU' ? 'НАЧАЛЬНЫЕ СУБСИДИИ (КРЕДИТЫ)' : 'STARTING CREDIT ALLOCATIONS'}
                                      </span>
                                      <div className="flex gap-1 mb-3">
                                          {creditBonuses.map(val => (
                                              <button
                                                  key={val}
                                                  onClick={() => { setStartingCreditsBonus(val); playUiSound('CLICK'); }}
                                                  className={`flex-1 py-1 rounded-lg text-[8.5px] sm:text-[10px] font-mono font-black border cursor-pointer ${
                                                      startingCreditsBonus === val 
                                                          ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_8px_rgba(245,158,11,0.2)]' 
                                                          : 'bg-black/30 border-white/5 text-slate-500 hover:text-slate-300'
                                                  }`}
                                              >
                                                  +{val} Cr
                                              </button>
                                          ))}
                                      </div>

                                      <span className="text-[8px] sm:text-[9.5px] font-black text-slate-300 uppercase tracking-widest block mb-1.5">
                                          {language === 'RU' ? 'АВАРИЙНЫЕ ЭНЕРГО-РЕЗЕРВЫ (ХОДЫ)' : 'EMERGENCY ENERGY ALLOCATIONS'}
                                      </span>
                                      <div className="flex gap-1">
                                          {moveBonuses.map(val => (
                                              <button
                                                  key={val}
                                                  onClick={() => { setStartingMovesBonus(val); playUiSound('CLICK'); }}
                                                  className={`flex-1 py-1 rounded-lg text-[8.5px] sm:text-[10px] font-mono font-black border cursor-pointer ${
                                                      startingMovesBonus === val 
                                                          ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                                                          : 'bg-black/30 border-white/5 text-slate-500 hover:text-slate-300'
                                                  }`}
                                              >
                                                  +{val} Mvs
                                              </button>
                                          ))}
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </div>

                      <div className="col-span-1 sm:col-span-2 border-t border-white/5 pt-4">
                          <h3 className="text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5">
                              <Compass className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-cyan-400" />
                              {language === 'RU' ? 'АКТИВНЫЙ АНОМАЛЬНЫЙ МУТАТОР' : 'ACTIVE SECTOR ANOMALY MUTATOR'}
                          </h3>
                          
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                              {mutatorsList.map(mut => {
                                  const isSelected = mutatorType === mut.id;
                                  return (
                                      <button
                                          key={mut.id}
                                          onClick={() => { setMutatorType(mut.id as any); playUiSound('CLICK'); }}
                                          className={`py-2 px-1.5 rounded-xl text-[8px] sm:text-[9.5px] font-black uppercase tracking-wider transition-all border flex flex-col items-center justify-center gap-1 cursor-pointer ${
                                              isSelected 
                                                  ? 'bg-indigo-500/15 border-indigo-400 text-white shadow-lg' 
                                                  : 'bg-white/5 border-white/5 text-slate-400 hover:border-white/10 hover:bg-white/8'
                                          }`}
                                      >
                                          <span className={`font-black ${isSelected ? 'text-white' : ''}`}>{mut.label}</span>
                                      </button>
                                  );
                              })}
                          </div>

                          <div className="mt-2.5 bg-black/40 border border-white/5 rounded-xl p-2.5">
                              <p className="text-[7.5px] sm:text-[9.5px] text-slate-400 font-mono uppercase tracking-wide leading-relaxed">
                                  {mutatorType === 'NONE' && (language === 'RU' ? 'Нет активных аномальных эффектов. Чистая симуляция по умолчанию.' : 'No active anomaly effects. Baseline environment.')}
                                  {mutatorType === 'SUDDEN_DEATH' && (language === 'RU' ? 'ВНЕЗАПНАЯ СМЕРТЬ: Все действия (DIG/UPGRADE/RECOVER) вызывают ДВОЙНОЙ износ стабильности сектора (2x Entropy), но Кредиты при глубокой добыче (L < 0) увеличены на +50%!' : 'SUDDEN DEATH: All actions incur 2x higher Entropy impact on sector stability, but Deep Mined coins (L < 0) are boosted by +50%!')}
                                  {mutatorType === 'RICH_VEINS' && (language === 'RU' ? 'БОГАТЫЕ ЖИЛЫ: Все глубинные руды и жилы удваивают денежные выплаты за добычу, но ИИ-боты ускорены на 30%!' : 'RICH VEINS: Double coins from all mineral veins, but rival bots make actions 30% faster!')}
                                  {mutatorType === 'FRAGILE_GROUND' && (language === 'RU' ? 'ХРУПКИЙ ГРУНТ: Опорная прочность треснутых плит L1 снижена ВДВОЕ (3 шага до обрушения вместо 6)! Остерегайтесь бездны.' : 'FRAGILE GROUND: Cracked tiles L1 have half of their structural durability (3 steps to collapse instead of 6). Walk with care!')}
                                  {mutatorType === 'NANO_STORM' && (language === 'RU' ? 'НАНО-ШТОРМ: Стоимость шагов на любых плитах повышена на +1 Ход, но нанотехнологическая буря делает UPGRADE абсолютно БЕСПЛАТНЫМ!' : 'NANO-STORM: Moves step cost increased by +1 on all levels, but Nanite Free Build is active for all entities!')}
                              </p>
                          </div>
                      </div>

                  </div>
              </div>

              <div className="p-3 sm:p-5 border-t border-white/5 md:border-indigo-500/20 bg-white/2 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 flex-row">
                  <div className="flex flex-col text-left leading-tight">
                      <span className="text-[7.5px] sm:text-[9px] text-slate-500 font-black uppercase tracking-wider">{t.EST_REWARD}</span>
                      <span className="text-xs sm:text-sm md:text-base font-mono font-black text-amber-400 flex items-center gap-1 mt-0.5">
                        <Gem className="w-3.5 h-3.5 sm:w-4.5 sm:h-4.5 text-amber-400" />
                        {selectedTier === 3 ? t.REWARD_HIGH : (selectedTier === 2 ? t.REWARD_MED : t.REWARD_STD)}
                      </span>
                  </div>

                  <div className="flex gap-2 sm:gap-3 shrink-0">
                     <motion.button
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          playUiSound('CLICK');
                          setShowMissionConfig(false);
                          setUIState('LEVEL_EDITOR');
                        }}
                        className="px-3 py-1.5 sm:px-4 sm:py-2.5 bg-white/5 border border-white/10 hover:border-indigo-500/50 text-indigo-300 hover:text-white font-bold rounded-lg sm:rounded-xl text-[8.5px] sm:text-[10px] md:text-xs uppercase tracking-wider transition-all flex items-center gap-1 sm:gap-1.5 font-mono cursor-pointer"
                     >
                        <Layers className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-400" />
                        {language === 'RU' ? 'Чертежи' : 'Level Editor'}
                     </motion.button>

                     <motion.button 
                        whileHover={{ scale: 1.03, y: -1, boxShadow: "0 0 20px rgba(99,102,241,0.5)" }}
                        whileTap={{ scale: 0.97 }}
                        onClick={confirmMissionStart}
                        className="px-4 py-1.5 sm:px-5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-lg sm:rounded-xl border-t border-indigo-400/30 uppercase tracking-widest transition-all flex items-center justify-center gap-1 sm:gap-2 group text-[9px] sm:text-xs cursor-pointer shadow-[0_4px_15px_rgba(99,102,241,0.3)]"
                     >
                        <Crosshair className="w-3 h-3 sm:w-4 sm:h-4 text-indigo-100 group-hover:rotate-90 transition-all duration-500" />
                        <span>{t.BTN_START}</span>
                     </motion.button>
                  </div>
              </div>

          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
};

export default MainMenu;