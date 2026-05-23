
import React from 'react';

interface HexButtonProps {
  onClick?: () => void;
  onDisabledClick?: () => void; // New prop for clicks when disabled
  children: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  dimmed?: boolean; // New prop for tutorial dimming
  variant?: 'blue' | 'amber' | 'emerald' | 'slate' | 'red';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  progress?: number; 
  className?: string;
  pulsate?: boolean;
  title?: string;
}

const HexButton: React.FC<HexButtonProps> = ({ 
  onClick, onDisabledClick, children, active, disabled, dimmed, variant = 'slate', size = 'md', progress = 0, className = '', pulsate = false, title
}) => {
  
  // RESPONSIVE SIZE MAPPING
  // Optimized for cleaner UI footprint but larger touch targets on mobile (40px/48px thresholds)
  const sizeClasses = {
    sm: 'w-10 h-10 md:w-12 md:h-12',
    md: 'w-12 h-12 md:w-16 md:h-16',
    lg: 'w-14 h-14 md:w-20 md:h-20',
    xl: 'w-16 h-16 md:w-24 md:h-24'
  };
  
  const sClass = sizeClasses[size];
  
  // NEON / GLASS Configuration
  const colors = {
    slate:   { stop1: 'rgba(148, 163, 184, 0.1)', stop2: 'rgba(15, 23, 42, 0.4)', stroke: '#475569', highlight: '#94a3b8', glow: 'rgba(148, 163, 184, 0.1)' },
    blue:    { stop1: 'rgba(56, 189, 248, 0.2)', stop2: 'rgba(3, 105, 161, 0.4)', stroke: '#0ea5e9', highlight: '#7dd3fc', glow: 'rgba(14, 165, 233, 0.6)' },
    amber:   { stop1: 'rgba(251, 191, 36, 0.2)', stop2: 'rgba(180, 83, 9, 0.4)', stroke: '#f59e0b', highlight: '#fde68a', glow: 'rgba(245, 158, 11, 0.6)' },
    emerald: { stop1: 'rgba(52, 211, 153, 0.2)', stop2: 'rgba(6, 95, 70, 0.4)', stroke: '#10b981', highlight: '#6ee7b7', glow: 'rgba(16, 185, 129, 0.6)' },
    red:     { stop1: 'rgba(248, 113, 113, 0.2)', stop2: 'rgba(153, 27, 27, 0.4)', stroke: '#ef4444', highlight: '#fca5a5', glow: 'rgba(239, 68, 68, 0.6)' },
  };
  
  const c = colors[variant];
  const pathData = "M50 2 L93 27 L93 73 L50 98 L7 73 L 7 27 Z";
  
  const baseClasses = `relative flex items-center justify-center select-none transition-all duration-500 touch-manipulation focus:outline-none ${className}`;
  
  // Interactive Classes
  let interactClasses = 'cursor-pointer hover:scale-105 active:scale-95 hover:brightness-110 hover:drop-shadow-[0_0_12px_rgba(255,255,255,0.3)] focus-visible:ring-2 focus-visible:ring-white rounded-none bg-transparent border-none appearance-none';
  
  if (disabled) {
      interactClasses = 'opacity-40 grayscale-[80%] cursor-not-allowed bg-transparent border-none appearance-none';
  } else if (dimmed) {
      interactClasses = 'opacity-30 grayscale saturate-0 cursor-default scale-95 bg-transparent border-none appearance-none'; // Dimmed state
  }

  const glowClass = (active || pulsate) && !dimmed ? 'animate-pulse' : '';

  return (
    <button 
      type="button"
      className={`${baseClasses} ${interactClasses} ${glowClass} ${sClass}`}
      onClick={(!disabled && !dimmed) ? onClick : onDisabledClick}
      title={title}
    >
      {/* Dynamic Ambient Glow Behind the Button */}
      {(active || (!disabled && !dimmed && pulsate)) && (
          <div className="absolute inset-0 blur-xl rounded-full scale-110 opacity-60 transition-opacity duration-300 pointer-events-none" style={{ backgroundColor: c.highlight }}></div>
      )}

      {/* Glass Backdrop */}
      <div 
         className="absolute inset-0 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)] border-none" 
         style={{ 
             clipPath: 'polygon(50% 2%, 93% 27%, 93% 73%, 50% 98%, 7% 73%, 7% 27%)',
             backdropFilter: 'blur(8px)',
             background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.2) 100%)'
         }} 
      />

      {/* Optional Scanlines */}
      {!disabled && !dimmed && (
         <div 
           className="absolute inset-0 opacity-10 pointer-events-none"
           style={{
               clipPath: 'polygon(50% 2%, 93% 27%, 93% 73%, 50% 98%, 7% 73%, 7% 27%)',
               backgroundImage: 'linear-gradient(0deg, transparent 50%, rgba(255,255,255,0.1) 50%)',
               backgroundSize: '100% 4px'
           }}
         />
      )}

      <svg width="100%" height="100%" viewBox="0 0 100 100" className="overflow-visible relative z-10 transition-transform duration-300">
        <defs>
          <linearGradient id={`neon-grad-${variant}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={c.stop1} />
            <stop offset="40%" stopColor={'rgba(0,0,0,0.1)'} />
            <stop offset="100%" stopColor={c.stop2} />
          </linearGradient>
          
          <filter id={`neon-glow-${variant}`} x="-50%" y="-50%" width="200%" height="200%">
             <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
             <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
             </feMerge>
          </filter>
        </defs>

        {/* Inner shadow/glow highlight */}
        {(active || (!disabled && !dimmed)) && (
             <path 
               d={pathData} 
               fill="none" 
               stroke={c.highlight} 
               strokeWidth="1.5"
               className="opacity-40"
               style={{ filter: `blur(2px)` }}
             />
        )}

        {/* Glow Shadow Path */}
        {(active || (!disabled && !dimmed)) && (
             <path 
               d={pathData} 
               fill="none" 
               stroke={c.stroke} 
               strokeWidth="0"
               style={{ filter: `drop-shadow(0 0 12px ${c.glow})` }}
             />
        )}

        <path 
          d={pathData} 
          fill={`url(#neon-grad-${variant})`} 
          stroke="none"
          className="transition-all duration-300"
        />

        {/* Main Edge Ring */}
        <path 
          d={pathData} 
          fill="none" 
          stroke={active ? '#ffffff' : (disabled ? '#334155' : c.stroke)} 
          strokeWidth={active ? 3 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="transition-colors duration-300"
          style={active ? { filter: `url(#neon-glow-${variant})` } : {}}
        />

        {/* Progress Ring Overlay */}
        {progress > 0 && !dimmed && (
          <path 
            d={pathData} 
            fill="none" 
            stroke="#ffffff" 
            strokeWidth="4" 
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="100"
            strokeDasharray="100"
            strokeDashoffset={100 - Math.min(100, Math.max(0, progress))}
            className="transition-all duration-200 ease-linear"
            style={{ filter: 'drop-shadow(0 0 4px #fff)' }}
          />
        )}
      </svg>
      
      <div className={`absolute inset-0 flex flex-col items-center justify-center text-white pointer-events-none z-20 break-words whitespace-pre-wrap ${active ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.8)]' : 'text-slate-200 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]'}`}>
        {children}
      </div>
    </button>
  );
};

export default HexButton;
