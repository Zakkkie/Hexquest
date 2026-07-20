import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGameStore } from '../store.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { LevelConfig } from '../types.ts';
import { 
  Check, Lock, Play, MapPin, ShieldAlert, Crosshair, Layers, Cpu, 
  BatteryCharging, Coins, ArrowLeft, Terminal, Compass, Atom, Sparkles 
} from 'lucide-react';
import { TEXT } from '../services/i18n.ts';
import { UpgradesTree } from './UpgradesTree.tsx';
import { motion, AnimatePresence } from 'motion/react';

// --- PREMIUM DECORATIVE COSMIC BACKGROUND ---
const CampaignBackground: React.FC = React.memo(() => {
  const stars = useMemo(() => {
    return Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() * 1.8 + 1,
      delay: Math.random() * 5,
      duration: Math.random() * 10 + 10,
    }));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
      {/* Deep Space Indigo gradient base */}
      <div className="absolute inset-0 bg-slate-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,_rgba(99,102,241,0.16)_0%,_transparent_45%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_85%_85%,_rgba(6,182,212,0.14)_0%,_transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(15,23,42,0.75)_0%,_slate-950_100%)]" />

      {/* Futuristic Holographic Grid Projection */}
      <div className="absolute inset-0 opacity-[0.12] mix-blend-screen"
           style={{ 
               backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.2) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(99, 102, 241, 0.2) 1.5px, transparent 1.5px)',
               backgroundSize: '40px 40px',
               transform: 'perspective(700px) rotateX(55deg) scale(2) translateY(-60px)',
               transformOrigin: 'center top',
               maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 10%, rgba(0,0,0,0) 80%)'
           }} 
      />

      {/* Twinkling Space dust particles */}
      {stars.map(star => (
        <div
          key={star.id}
          className="absolute rounded-full bg-indigo-200/40 animate-pulse"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}

      {/* Orbit paths representation */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110vmin] h-[110vmin] opacity-[0.06]">
        <div className="absolute inset-0 border border-indigo-500/20 rounded-full animate-[spin_100s_linear_infinite]" />
        <div className="absolute inset-12 border border-dashed border-cyan-500/15 rounded-full animate-[spin_60s_linear_infinite_reverse]" />
      </div>

      {/* Interactive scanning horizontal laser bar */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-500/15 to-transparent shadow-[0_0_12px_rgba(6,182,212,0.3)] animate-[laser-scan_12s_linear_infinite]" />

      <style>{`
        @keyframes laser-scan {
            0% { transform: translateY(-5vh); opacity: 0; }
            8% { opacity: 1; }
            92% { opacity: 1; }
            100% { transform: translateY(105vh); opacity: 0; }
        }
        @keyframes pulse-dash {
            to { stroke-dashoffset: -40; }
        }
      `}</style>
    </div>
  );
});

// --- TIMELINE MAP (STORY MODE) ---
const StoryTimeline: React.FC<{
  containerWidth: number;
  isMobile: boolean;
  campaignProgress: number;
  onSelect: (id: string) => void;
}> = ({ containerWidth, isMobile, campaignProgress, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLevelRef = useRef<HTMLDivElement>(null);
  const t = TEXT[useGameStore.getState().language].CAMPAIGN_MAP;
  const language = useGameStore.getState().language;

  // Stagger parameters optimized for snug layouts without gaps
  const timelineLayout = useMemo(() => {
    const ITEM_HEIGHT = isMobile ? 155 : 270;
    const START_OFFSET = isMobile ? 45 : 85;
    const positions: any[] = [];
    let currentY = START_OFFSET;
    let lastSeries = '';

    CAMPAIGN_LEVELS.forEach((level, index) => {
      const series = level.id.split('.')[0];
      let hasHeader = false, headerY = 0;
      
      if (series !== lastSeries) {
        currentY += index > 0 ? (isMobile ? 70 : 130) : 0;
        headerY = currentY;
        currentY += isMobile ? 55 : 90;
        hasHeader = true;
        lastSeries = series;
      }
      
      const isLeft = index % 2 === 0;
      // On mobile, lock timeline to the left edge with precise margins to maximize card space
      const x = isMobile ? 38 : (isLeft ? containerWidth * 0.28 : containerWidth * 0.72);
      positions.push({ x, y: currentY, hasHeader, headerY, seriesId: series, level, index });
      currentY += ITEM_HEIGHT;
    });
    
    return { positions, totalHeight: currentY + (isMobile ? 60 : 100) };
  }, [containerWidth, isMobile]);

  // Center view on current active unlocked level node
  useEffect(() => {
    if (currentLevelRef.current) {
      const timer = setTimeout(() => {
        currentLevelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [campaignProgress]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar pb-16 touch-pan-y"
    >
      {/* Interactive Vector Connecting Paths */}
      <svg className="absolute inset-0 w-full pointer-events-none z-0" style={{ height: timelineLayout.totalHeight }}>
        <defs>
          <linearGradient id="unlockedTrack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="50%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
          <linearGradient id="inactiveTrack" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
        </defs>
        
        {timelineLayout.positions.map((pos, i) => {
          if (i === timelineLayout.positions.length - 1) return null;
          const nextPos = timelineLayout.positions[i + 1];
          const isPathUnlocked = i < campaignProgress;
          const cpY1 = pos.y + (nextPos.y - pos.y) * 0.55;
          const cpY2 = nextPos.y - (nextPos.y - pos.y) * 0.55;
          const pathD = `M ${pos.x} ${pos.y} C ${pos.x} ${cpY1}, ${nextPos.x} ${cpY2}, ${nextPos.x} ${nextPos.y}`;
          
          return (
            <g key={`path-${i}`}>
              {/* Core physical support beam */}
              <path 
                d={pathD} 
                fill="none" 
                stroke="url(#inactiveTrack)" 
                strokeWidth={isMobile ? "2.5" : "4"} 
              />
              
              {/* Glowing holographic energy glow (Unlocks) */}
              {isPathUnlocked && (
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke="url(#unlockedTrack)" 
                  strokeWidth={isMobile ? "4.5" : "7"} 
                  strokeOpacity="0.22" 
                  className="blur-[4px]" 
                />
              )}
              
              {/* Sharp foreground path line */}
              <path 
                d={pathD} 
                fill="none" 
                stroke={isPathUnlocked ? 'url(#unlockedTrack)' : '#334155'} 
                strokeWidth={isMobile ? "1.2" : "2"} 
                strokeDasharray={isPathUnlocked ? "0" : "4 4"} 
                className="transition-all duration-300"
              />
              
              {/* High energy current visual pulse */}
              {isPathUnlocked && (
                <path 
                  d={pathD} 
                  fill="none" 
                  stroke="#22d3ee" 
                  strokeWidth={isMobile ? "1.2" : "1.6"} 
                  strokeDasharray="6 26" 
                  className="animate-[pulse-dash_3s_linear_infinite]" 
                  style={{ filter: 'drop-shadow(0 0 3px #22d3ee)' }}
                />
              )}
            </g>
          );
        })}
      </svg>

      <div className="relative z-10 w-full" style={{ height: timelineLayout.totalHeight }}>
        {timelineLayout.positions.map((pos, i) => {
          const isUnlocked = i <= campaignProgress;
          const isCompleted = i < campaignProgress;
          const isCurrent = i === campaignProgress;
          const levelKey = pos.level.id.replace('.', '_');
          const displayTitle = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${levelKey}_TITLE`] || pos.level.title).replace(/^(?:Simulation|Sim|Сим|SIM|SIMULATION)\s*[\d.]+:?\s*/i, '');
          const displayDesc = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${levelKey}_DESC`] || pos.level.description);
          const threat = pos.level.aiMode === 'none' ? 'NONE' : (pos.level.aiMode === 'basic' ? 'BASIC' : 'HIGH');

          // Decide modular sub-icons representing different simulation setups
          const isDefenseLevel = pos.level.aiMode !== 'none';
          const isHighGroundLevel = pos.level.startState.materials > 2 || pos.level.mapRadius >= 5;

          return (
            <div key={pos.level.id}>
              {/* Neon Chapter Header Ribbon */}
              {pos.hasHeader && (
                <div className="absolute left-0 right-0 flex items-center justify-center pointer-events-none transform -translate-y-1/2 z-20" style={{ top: pos.headerY }}>
                  <div className="w-full max-w-sm flex items-center gap-2.5 px-4">
                    <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-indigo-500/20" />
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/90 backdrop-blur-xl border border-indigo-500/25 rounded-lg shadow-[0_0_15px_rgba(99,102,241,0.15)] shrink-0">
                      <Layers className="w-3 h-3 text-indigo-400" />
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-200 font-mono">Series {pos.seriesId}</span>
                    </div>
                    <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-indigo-500/20" />
                  </div>
                </div>
              )}

              {/* Main Interactive Node Wrap */}
              <div ref={isCurrent ? currentLevelRef : null} className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: pos.x, top: pos.y }}>
                <div className={`relative flex items-center justify-center group ${isUnlocked ? 'opacity-100' : 'opacity-85'}`}>
                  
                  {/* Dynamic Neon Anchor Point */}
                  <div className="relative z-20 flex items-center justify-center pointer-events-none select-none w-8 h-8">
                    {isCurrent && (
                      <>
                        <div className="absolute -inset-2.5 border border-amber-500/40 rounded-full animate-ping opacity-60" />
                        <div className="absolute -inset-1 border border-dashed border-amber-400/30 rounded-full animate-[spin_8s_linear_infinite]" />
                        <div className="absolute inset-1 bg-amber-500/10 rounded-full blur-sm" />
                      </>
                    )}
                    {isCompleted && (
                      <div className="absolute -inset-1.5 border border-emerald-500/15 rounded-full" />
                    )}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300 shadow-sm z-10 ${
                      isCompleted ? 'bg-emerald-500 border-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]' : 
                      (isCurrent ? 'bg-amber-400 border-white text-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.6)]' : 'bg-slate-900 border-slate-700/60')
                    }`}>
                      {isCompleted ? (
                        <Check className="w-3 h-3 text-slate-950 stroke-[3.5]" />
                      ) : (
                        isCurrent ? (
                          <div className="w-2 h-2 bg-slate-950 rounded-full animate-pulse" />
                        ) : (
                          <Lock className="w-2.5 h-2.5 text-slate-500" />
                        )
                      )}
                    </div>
                  </div>

                  {/* Frosted Cyber Level Interaction Deck */}
                  <motion.div 
                    whileHover={isUnlocked ? { scale: 1.025, y: -1 } : {}}
                    whileTap={isUnlocked ? { scale: 0.98 } : {}}
                    onClick={() => isUnlocked && onSelect(pos.level.id)}
                    className={`absolute flex flex-col bg-slate-950/65 backdrop-blur-2xl border p-3 rounded-2xl shadow-[0_8px_25px_rgba(0,0,0,0.5)] w-[calc(100vw-88px)] max-w-[245px] md:w-[270px] md:max-w-none transition-all duration-300 z-10 overflow-hidden group/card
                      ${isUnlocked ? 'cursor-pointer hover:bg-slate-900/65 hover:shadow-[0_12px_28px_rgba(0,0,0,0.65)]' : 'cursor-not-allowed'}
                      ${isCompleted ? 'border-emerald-500/25 hover:border-emerald-500/50' : (isCurrent ? 'border-amber-500/40 hover:border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-indigo-500/15')}
                      ${isMobile ? 'left-full ml-3.5 text-left' : (i % 2 === 0 ? 'left-full ml-6 text-left' : 'right-full mr-6 text-right items-end')}
                    `}
                  >
                    {/* Reflective light sheen overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/card:translate-x-full transition-transform duration-1000 ease-out pointer-events-none" />

                    {/* Left border-accent based on state */}
                    <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${isCompleted ? 'bg-emerald-500/60' : (isCurrent ? 'bg-amber-400/80 animate-pulse' : 'bg-slate-700/30')}`} />

                    {/* Top capsule info */}
                    <div className="flex items-center justify-between w-full mb-1 gap-1.5 pl-1.5">
                      <span className={`text-[8.5px] font-black tracking-widest font-mono uppercase px-1.5 py-0.5 rounded ${
                        isCompleted ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                        (isCurrent ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' : 'bg-slate-900/85 text-slate-500 border border-slate-800/40')
                      }`}>
                        {t.MISSION_PREFIX} {pos.level.id}
                      </span>
                      {isCompleted && (
                        <span className="text-[8px] font-black text-emerald-400 flex items-center gap-0.5 font-mono uppercase">
                          <Check className="w-2.5 h-2.5 stroke-[3]" /> DONE
                        </span>
                      )}
                    </div>

                    {/* Level Title with integrated thematic icon */}
                    <div className={`flex items-center gap-1.5 pl-1.5 ${isMobile ? '' : (i % 2 !== 0 ? 'flex-row-reverse' : '')}`}>
                      {isUnlocked && (
                        <div className={`shrink-0 ${isCompleted ? 'text-emerald-400' : isCurrent ? 'text-amber-400' : 'text-indigo-400'}`}>
                          {isDefenseLevel ? <Atom className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> : isHighGroundLevel ? <Compass className="w-3.5 h-3.5" /> : <Terminal className="w-3.5 h-3.5" />}
                        </div>
                      )}
                      <h3 className={`text-xs md:text-sm font-black uppercase tracking-wide leading-tight truncate ${
                        isCurrent ? 'text-amber-200 group-hover/card:text-amber-100' : 'text-slate-100 group-hover/card:text-white'
                      }`}>{displayTitle}</h3>
                    </div>
                    
                    {isUnlocked ? (
                      <div className="pl-1.5 mt-1 flex flex-col gap-2">
                        {/* Compact description view */}
                        <p className="text-[9.5px] text-slate-400/90 font-mono leading-relaxed italic line-clamp-2">
                          {displayDesc}
                        </p>
                        
                        {/* Control stats node summary */}
                        <div className="flex items-center justify-between gap-1.5 mt-1 pt-1.5 border-t border-white/5 w-full">
                          {/* Mini dynamic threat indicator */}
                          <div className={`flex items-center gap-1 bg-black/45 px-2 py-0.5 rounded-full border text-[8px] font-black tracking-wider uppercase ${
                            threat === 'NONE' ? 'text-emerald-400 border-emerald-500/20' : 
                            (threat === 'BASIC' ? 'text-amber-400 border-amber-500/20' : 'text-red-400 border-red-500/20')
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${threat === 'NONE' ? 'bg-emerald-400' : (threat === 'BASIC' ? 'bg-amber-400 animate-pulse' : 'bg-red-400 animate-ping')}`} />
                            <span>{(t as any)[`LVL_THREAT_${threat}`]}</span>
                          </div>
                          
                          {/* Starting Assets preview */}
                          <div className="flex items-center gap-1 shrink-0">
                            <div className="flex items-center gap-0.5 text-[8.5px] font-bold font-mono text-indigo-300 bg-indigo-950/25 px-1 py-0.5 rounded border border-indigo-500/10">
                              <BatteryCharging className="w-2.5 h-2.5 text-indigo-400" />
                              <span>{pos.level.startState.moves}</span>
                            </div>
                            <div className="flex items-center gap-0.5 text-[8.5px] font-bold font-mono text-emerald-300 bg-emerald-950/25 px-1 py-0.5 rounded border border-emerald-500/10">
                              <Coins className="w-2.5 h-2.5 text-emerald-400" />
                              <span>{pos.level.startState.credits}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-2.5 text-slate-600 font-mono w-full">
                        <Lock className="w-4 h-4 mb-0.5 opacity-30 text-slate-500" />
                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 leading-none">{t.LVL_STATUS_LOCKED}</p>
                      </div>
                    )}
                  </motion.div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

// --- MULTI-GRID BENTO LAYOUT (LEVELS LIST MODE) ---
const LevelGrid: React.FC<{ levelsModeProgress: number; onSelect: (id: string) => void; }> = ({ levelsModeProgress, onSelect }) => {
  const t = TEXT[useGameStore.getState().language].CAMPAIGN_MAP;
  const language = useGameStore.getState().language;
  
  const levelsBySeries = useMemo(() => {
    const grouped: { [key: string]: LevelConfig[] } = {};
    CAMPAIGN_LEVELS.forEach(level => {
      const series = level.id.split('.')[0] || '1';
      if (!grouped[series]) grouped[series] = [];
      grouped[series].push(level);
    });
    return grouped;
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex-1 overflow-y-auto p-3.5 md:p-6 no-scrollbar bg-slate-950/10 relative touch-pan-y">
      <div className="max-w-6xl mx-auto pb-12 z-10 relative flex flex-col gap-6 md:gap-8">
        {Object.entries(levelsBySeries).map(([seriesId, seriesLevels]) => (
          <div key={`series-${seriesId}`} className="flex flex-col gap-3">
            {/* Sector Header Block */}
            <div className="flex items-center gap-2 border-b border-indigo-500/10 pb-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <h3 className="text-[11px] md:text-sm font-black uppercase tracking-[0.2em] text-indigo-200">
                {language === 'RU' ? `Сектор ${seriesId}` : `Sector ${seriesId}`}
              </h3>
              <div className="h-1 w-1 bg-indigo-500/30 rounded-full" />
              <span className="text-[9px] text-slate-500 font-mono">
                {seriesLevels.filter((_, idx) => CAMPAIGN_LEVELS.findIndex(l => l.id === seriesLevels[idx].id) < levelsModeProgress).length} / {seriesLevels.length}
              </span>
            </div>
            
            {/* Compact bento grids */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 content-start">
              {seriesLevels.map((level, idx) => {
                const overallIndex = CAMPAIGN_LEVELS.findIndex(l => l.id === level.id);
                const isUnlocked = overallIndex <= levelsModeProgress;
                const isCompleted = overallIndex < levelsModeProgress;
                const isCurrent = overallIndex === levelsModeProgress;
                const displayTitle = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${level.id.replace('.','_')}_TITLE`] || level.title).replace(/^(?:Simulation|Sim|Сим|SIM|SIMULATION)\s*[\d.]+:?\s*/i, '');
                const threat = level.aiMode === 'none' ? 'NONE' : (level.aiMode === 'basic' ? 'BASIC' : 'HIGH');
                const glowColor = threat === 'NONE' ? 'emerald' : (threat === 'BASIC' ? 'amber' : 'red');

                return (
                  <motion.div 
                    key={level.id} 
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: Math.min(10, idx) * 0.02, duration: 0.25 }}
                    whileHover={isUnlocked ? { scale: 1.015, y: -1 } : {}}
                    whileTap={isUnlocked ? { scale: 0.98 } : {}}
                    onClick={() => isUnlocked && onSelect(level.id)}
                    className={`group relative flex flex-col p-3 rounded-xl transition-all duration-300 h-[115px] overflow-hidden ${isUnlocked ? 'cursor-pointer hover:shadow-[0_8px_20px_rgba(0,0,0,0.5)]' : 'grayscale-[35%] cursor-not-allowed'}`}
                  >
                    {/* Glass plate */}
                    <div className={`absolute inset-0 bg-slate-950/60 backdrop-blur-2xl border rounded-xl overflow-hidden transition-all duration-300 ${isUnlocked ? 'group-hover:bg-slate-950/85 group-hover:border-indigo-500/30' : 'bg-slate-950/20'} ${isCurrent ? 'border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.12)]' : 'border-white/5'}`} />
                    
                    {/* Radial background glowing mesh */}
                    <div className={`absolute -inset-[2px] rounded-xl bg-gradient-to-r ${glowColor === 'emerald' ? 'from-emerald-500/5' : (glowColor === 'amber' ? 'from-amber-500/10' : 'from-red-500/10')} to-transparent opacity-30 blur-[6px] -z-10 pointer-events-none group-hover:opacity-100`} />

                    <div className="relative z-10 flex flex-col h-full gap-1.5">
                      <div className="flex items-start gap-2">
                        <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-slate-950 border shadow-inner shrink-0 ${isUnlocked ? (threat === 'NONE' ? 'text-emerald-400 border-emerald-400/15' : threat === 'BASIC' ? 'text-amber-400 border-amber-400/15' : 'text-red-400 border-red-400/15') : 'text-slate-600 border-slate-800'}`}>
                          <MapPin className="w-3 h-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className={`text-[11.5px] font-black uppercase tracking-wide leading-tight mb-0.5 truncate ${isUnlocked ? 'text-slate-100' : 'text-slate-500'}`}>{displayTitle}</h3>
                          <div className={`inline-flex items-center px-1 py-0.2 rounded border text-[7.5px] font-mono uppercase font-bold leading-none ${isCompleted ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : (isCurrent ? 'bg-amber-500/20 text-amber-400 border-amber-500/25 animate-pulse' : 'bg-slate-900 text-slate-500 border-white/5')}`}>
                            {isCompleted ? t.LVL_STATUS_COMPLETED : (isCurrent ? t.LVL_STATUS_READY : t.LVL_STATUS_LOCKED)}
                          </div>
                        </div>
                      </div>

                      {/* Brief Objectives statement */}
                      <p className="text-[9px] text-slate-400/90 font-mono leading-relaxed italic line-clamp-1 truncate max-w-full px-1">
                        {level.goalText || ((TEXT[language].CAMPAIGN as any)[`LEVEL_${level.id.replace('.','_')}_DESC`] || '').split('\n\n')[0]}
                      </p>

                      {/* Info indicators */}
                      <div className="mt-auto flex items-center justify-between gap-1.5 pt-1 border-t border-white/5">
                        <div className={`flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded-full border text-[7.5px] font-black tracking-wider uppercase ${
                          threat === 'NONE' ? 'text-emerald-400 border-emerald-500/15' : 
                          (threat === 'BASIC' ? 'text-amber-400 border-amber-500/15' : 'text-red-400 border-red-500/15')
                        }`}>
                          <span className={`w-0.5 h-0.5 rounded-full ${threat === 'NONE' ? 'bg-emerald-400' : (threat === 'BASIC' ? 'bg-amber-400' : 'bg-red-400 animate-ping')}`} />
                          <span>{(t as any)[`LVL_THREAT_${threat}`]}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <div className="flex items-center gap-0.5 text-[8px] font-bold font-mono text-indigo-300 bg-indigo-950/25 px-1 py-0.5 rounded border border-indigo-500/10">
                            <BatteryCharging className="w-2.5 h-2.5 text-indigo-400" />
                            <span>{level.startState.moves}</span>
                          </div>
                          <div className="flex items-center gap-0.5 text-[8px] font-bold font-mono text-emerald-300 bg-emerald-950/25 px-1 py-0.5 rounded border border-emerald-500/10">
                            <Coins className="w-2.5 h-2.5 text-emerald-400" />
                            <span>{level.startState.credits}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {!isUnlocked && (
                      <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/45 backdrop-blur-[1px] rounded-xl">
                        <Lock className="w-3.5 h-3.5 text-slate-600/75" />
                      </div>
                    )}
                    {isUnlocked && !isCompleted && (
                      <div className="absolute bottom-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-3.5 h-3.5 rounded-full bg-indigo-500/25 flex items-center justify-center border border-indigo-500/40">
                          <Play className="w-1.5 text-indigo-400 fill-current ml-0.5" />
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

// --- CORE DIRECTIVE CONTROLLER ---
const CampaignMap: React.FC = () => {
  const startCampaignLevel = useGameStore(state => state.startCampaignLevel);
  const playUiSound = useGameStore(state => state.playUiSound);
  const campaignProgress = useGameStore(state => state.campaignProgress);
  const levelsModeProgress = useGameStore(state => state.levelsModeProgress);
  const campaignMode = useGameStore(state => state.campaignMode);
  const deviceType = useGameStore(state => state.deviceType);
  const language = useGameStore(state => state.language);
  const skillPoints = useGameStore(state => state.skillPoints);
  const user = useGameStore(state => state.user);
  const showToast = useGameStore(state => state.showToast);
  const claimedLevelRewards = useGameStore(state => state.claimedLevelRewards || []);

  const isSiegeActive = useMemo(() => {
    const completedNormalCount = claimedLevelRewards.filter(id => !id.startsWith('siege_completed_')).length;
    return completedNormalCount > 0 && completedNormalCount % 5 === 0 && !claimedLevelRewards.includes(`siege_completed_${completedNormalCount}`);
  }, [claimedLevelRewards]);
  
  const isMobile = deviceType === 'MOBILE';
  const [containerWidth, setContainerWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const t = TEXT[language].CAMPAIGN_MAP;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      setContainerWidth(Math.max(100, Math.floor(entries[0].contentRect.width)));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  const handleSelectLevel = useCallback((levelId: string) => {
    if (isSiegeActive) {
      playUiSound('ERROR');
      showToast(language === 'RU' ? 'АКТИВНА ЗАЩИТА ЯДРА! Завершите защиту.' : 'CORE DEFENSE ACTIVE! Complete the defense.', 'error');
      return;
    }
    playUiSound('CLICK');
    startCampaignLevel(levelId);
  }, [isSiegeActive, language, playUiSound, showToast, startCampaignLevel]);

  const progressPercent = useMemo(() => {
    const currentProgress = campaignMode === 'STORY' ? campaignProgress : levelsModeProgress;
    return Math.min(100, (currentProgress / CAMPAIGN_LEVELS.length) * 100);
  }, [campaignMode, campaignProgress, levelsModeProgress]);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6"
    >
      <CampaignBackground />
      <motion.div 
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full h-full lg:h-[93vh] lg:w-[94vw] max-w-[1500px] flex flex-col md:bg-slate-900/50 md:backdrop-blur-3xl md:border md:border-indigo-500/20 md:rounded-3xl md:shadow-[0_0_50px_rgba(0,0,0,0.75)] overflow-hidden box-border"
      >
        {/* TOP SCI-FI BANNER MODULE */}
        <div className="relative px-3 md:px-6 py-2.5 md:py-3.5 border-b border-indigo-500/15 flex items-center justify-between bg-slate-900/35 shrink-0 z-20 backdrop-blur-xl gap-3">
          
          {/* Neon track gauge indicator */}
          <div className="absolute bottom-0 left-0 h-[1.5px] bg-slate-800/40 w-full">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 shadow-[0_0_8px_#6366f1] transition-all duration-700 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center gap-2.5 min-w-0">
            {/* Standard tactile tactile back selector */}
            <motion.button 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              onClick={() => { useGameStore.getState().setUIState('STORY_BUILDER'); playUiSound('CLICK'); }} 
              className="p-2 md:p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 hover:bg-slate-900/80 text-slate-300 hover:text-white transition-all flex items-center justify-center cursor-pointer shadow-md shrink-0 min-h-[40px] min-w-[40px]"
            >
              <ArrowLeft className="w-4.5 h-4.5 md:w-5 md:h-5" />
            </motion.button>
            
            <div className="flex flex-col gap-0.5 min-w-0">
              <h2 className="text-xs md:text-xl font-black text-white uppercase tracking-wider italic leading-none drop-shadow-md truncate">
                {campaignMode === 'STORY' ? TEXT[language].MENU.MODE_STORY : TEXT[language].MENU.MODE_LEVELS}
              </h2>
              <div className="flex items-center gap-1.5">
                <p className="text-indigo-400/40 text-[7.5px] font-mono tracking-[0.25em] uppercase font-bold leading-none hidden sm:block">
                  {t.HEADER_SUBTITLE}
                </p>
                <div className="flex items-center gap-1 bg-indigo-500/10 border border-indigo-400/15 rounded-full px-1.5 py-0.5 text-[7.5px] font-mono text-indigo-300 shadow-[0_0_8px_rgba(99,102,241,0.08)] leading-none">
                  <div className="w-0.5 h-0.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_4px_#10b981]" />
                  <span className="truncate max-w-[80px]">{user ? user.nickname : 'Guest'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Core progress layout label */}
          {!isMobile && (
            <div className="flex items-center gap-5 border-l border-white/5 pl-4 ml-auto">
              <div className="flex flex-col">
                <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{TEXT[language].HUD.MISSION_COMPLETE}</span>
                <span className="text-base font-black text-white font-mono leading-none">
                  {campaignMode === 'STORY' ? campaignProgress : levelsModeProgress} 
                  <span className="text-slate-600 text-xs"> / {CAMPAIGN_LEVELS.length}</span>
                </span>
              </div>
            </div>
          )}

          {/* Engineering upgrades matrix node */}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            <motion.button 
              whileHover={{ scale: 1.03 }} 
              whileTap={{ scale: 0.97 }} 
              onClick={() => { setShowUpgrades(true); playUiSound('CLICK'); }} 
              className="group relative flex items-center gap-1.5 px-2.5 py-2 bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-100 rounded-lg border border-indigo-500/25 transition-all text-[8.5px] md:text-[10px] font-black uppercase tracking-widest shadow-sm cursor-pointer min-h-[40px]"
            >
              <Cpu className="w-3 h-3 md:w-3.5 md:h-3.5 text-indigo-400" />
              <span className="relative z-10 flex items-center gap-1 leading-none">
                {TEXT[language].HUD.BTN_UPGRADES || 'Upgrades'}
                {skillPoints > 0 && (
                  <span className="flex h-3.5 px-1 items-center justify-center rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)] border border-white/10 text-[8px] text-white animate-pulse font-mono font-bold leading-none">
                    {skillPoints}
                  </span>
                )}
              </span>
            </motion.button>
          </div>
        </div>

        {/* SIEGE SECURITY RESPONSE BANNER */}
        <AnimatePresence>
          {isSiegeActive && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="bg-red-950/80 border-b border-red-500/25 backdrop-blur-xl px-3.5 md:px-6 py-2 flex items-center justify-between gap-3 shrink-0 text-red-100 z-10 overflow-hidden">
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[8.5px] font-black uppercase tracking-[0.15em] text-red-400 leading-none mb-1">{language === 'RU' ? 'АКТИВИРОВАНА СИСТЕМА ЗАЩИТЫ ЯДРА' : 'CORE DEFENSE MODE ENGAGED'}</span>
                  <span className="text-[10.5px] font-medium truncate text-red-200">{language === 'RU' ? 'Прохождение заблокировано. Отразите нападение!' : 'Campaign locked. Defend against AI bots!'}</span>
                </div>
              </div>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => { useGameStore.getState().setUIState('STORY_BUILDER'); playUiSound('CLICK'); }} className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/35 text-red-200 rounded-lg border border-red-500/40 font-bold uppercase tracking-wider text-[8px] whitespace-nowrap cursor-pointer transition-all flex items-center gap-1 min-h-[34px]">
                <ArrowLeft className="w-3 h-3" /> <span>{language === 'RU' ? 'ЗАЩИТИТЬ' : 'DEFEND'}</span>
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CURRENT MODE VIEW WRAPPER */}
        <AnimatePresence mode="wait">
          {campaignMode === 'STORY' ? (
            <StoryTimeline key="story" containerWidth={containerWidth} isMobile={isMobile} campaignProgress={campaignProgress} onSelect={handleSelectLevel} />
          ) : (
            <LevelGrid key="grid" levelsModeProgress={levelsModeProgress} onSelect={handleSelectLevel} />
          )}
        </AnimatePresence>

        {/* HUD WATERMARK */}
        <div className="absolute top-0 right-0 p-2 opacity-[0.02] pointer-events-none select-none text-[50px] font-black italic tracking-tighter text-white overflow-hidden whitespace-nowrap z-0">MISSION CONTROL</div>

        <AnimatePresence>
          {showUpgrades && <UpgradesTree onClose={() => setShowUpgrades(false)} key="upgrades-tree" />}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default CampaignMap;
