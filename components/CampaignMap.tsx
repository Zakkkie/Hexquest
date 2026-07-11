import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { LevelConfig } from '../types.ts';
import { Check, Lock, Play, MapPin, ShieldAlert, Crosshair, Layers, Cpu, BatteryCharging, Coins, ArrowLeft } from 'lucide-react';
import { TEXT } from '../services/i18n.ts';
import { UpgradesTree } from './UpgradesTree.tsx';
import { motion, AnimatePresence } from 'motion/react';

// --- DECORATIVE BACKGROUND COMPONENT ---
const CampaignBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
            {/* 1. Solid Base */}
            <div className="absolute inset-0 bg-slate-950" />

            {/* 2. Radial Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950/80 to-slate-950" />

            {/* 3. Holographic Grid */}
            <div className="absolute inset-0 opacity-20"
                 style={{ 
                     backgroundImage: 'linear-gradient(rgba(99, 102, 241, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.3) 1px, transparent 1px)',
                     backgroundSize: '50px 50px',
                     transform: 'perspective(1000px) rotateX(60deg) scale(2.5) translateY(-100px)',
                     transformOrigin: 'center top',
                     maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 80%)'
                 }} 
            />

            {/* 4. Rotating Orbital Rings */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vmin] h-[100vmin] opacity-20">
                <div className="absolute inset-0 border border-indigo-500/40 rounded-full animate-[spin_60s_linear_infinite]" />
                <div className="absolute inset-4 md:inset-20 border border-dashed border-cyan-500/30 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                <div className="absolute inset-[25%] flex items-center justify-center animate-[spin_30s_linear_infinite]">
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible opacity-40">
                        <path d="M50 5 L90 27.5 L90 72.5 L50 95 L10 72.5 L10 27.5 Z" fill="none" stroke="#38bdf8" strokeWidth="1" />
                        <circle cx="50" cy="50" r="2" fill="#38bdf8" />
                        <line x1="50" y1="5" x2="50" y2="25" stroke="#38bdf8" strokeWidth="0.5" />
                        <line x1="50" y1="95" x2="50" y2="75" stroke="#38bdf8" strokeWidth="0.5" />
                    </svg>
                </div>
            </div>

            {/* 5. Scanning Radar Effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/10 to-transparent h-[10vh] w-full animate-[scan_6s_linear_infinite]" style={{ top: '-10vh' }} />

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-20vh); }
                    100% { transform: translateY(120vh); }
                }
                @keyframes pulse-dash {
                    to { stroke-dashoffset: -40; }
                }
            `}</style>
        </div>
    );
};

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
    return completedNormalCount > 0 && 
           completedNormalCount % 5 === 0 && 
           !claimedLevelRewards.includes(`siege_completed_${completedNormalCount}`);
  }, [claimedLevelRewards]);
  
  const currentProgress = campaignMode === 'STORY' ? campaignProgress : levelsModeProgress;

  // Responsive State
  const isMobile = deviceType === 'MOBILE';
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLevelRef = useRef<HTMLDivElement>(null);

  const t = TEXT[language].CAMPAIGN_MAP;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
        const handleResize = () => {
            setContainerWidth(window.innerWidth);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }

    const observer = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0) return;
        const width = entries[0].contentRect.width;
        setContainerWidth(Math.max(100, Math.floor(width)));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Scroll to current level on mount (Story only)
  useEffect(() => {
    if (campaignMode === 'STORY' && currentLevelRef.current) {
        setTimeout(() => {
            currentLevelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
    }
  }, [currentProgress, campaignMode]);

  // --- LAYOUT (STORY) ---
  const timelineLayout = useMemo(() => {
    if (campaignMode !== 'STORY') return { positions: [], totalHeight: 0 };
    
    // Generous heights and vertical gaps to absolutely ensure no visual overlaps
    const ITEM_HEIGHT = isMobile ? 220 : 310;
    const START_OFFSET = isMobile ? 70 : 100;
    
    const positions: any[] = [];
    let currentY = START_OFFSET;
    let lastSeries = '';

    CAMPAIGN_LEVELS.forEach((level, index) => {
        const series = level.id.split('.')[0];
        let hasHeader = false;
        let headerY = 0;
        
        if (series !== lastSeries) {
            // Leave clear spacing for the Series header to prevent overlaps
            const priorGap = index > 0 ? (isMobile ? 120 : 180) : 0;
            const headerOffset = isMobile ? 80 : 120;
            
            currentY += priorGap;
            headerY = currentY;
            currentY += headerOffset;
            
            hasHeader = true;
            lastSeries = series;
        }
        
        const isLeft = index % 2 === 0;
        const x = isMobile ? 54 : (isLeft ? containerWidth * 0.30 : containerWidth * 0.70);
        
        positions.push({ 
            x, 
            y: currentY, 
            hasHeader, 
            headerY, 
            seriesId: series, 
            level, 
            index 
        });
        
        currentY += ITEM_HEIGHT;
    });
    
    return { positions, totalHeight: currentY + (isMobile ? 80 : 120) };
  }, [containerWidth, isMobile, campaignMode]);

  const levelsToDisplay = CAMPAIGN_LEVELS;

  const renderStoryTimeline = () => {
    if (isMobile) {
        // Group levels by series
        const levelsBySeries: { [key: string]: { level: LevelConfig, index: number }[] } = {};
        CAMPAIGN_LEVELS.forEach((level, index) => {
            const series = level.id.split('.')[0] || '1';
            if (!levelsBySeries[series]) {
                levelsBySeries[series] = [];
            }
            levelsBySeries[series].push({ level, index });
        });

        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto p-4 pb-12 space-y-10 no-scrollbar select-none"
            >
                {Object.entries(levelsBySeries).map(([seriesId, seriesItems]) => (
                    <div key={`mobile-series-${seriesId}`} className="flex flex-col gap-5">
                        {/* Section Table of Contents / Series Name Header */}
                        <div className="flex items-center gap-3 border-b border-indigo-500/20 pb-2.5">
                            <Layers className="w-4 h-4 text-indigo-400" />
                            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-200">
                                {language === 'RU' ? `Серия ${seriesId}` : `Series ${seriesId}`}
                            </h3>
                            <div className="text-[9px] font-mono font-bold text-slate-500 bg-slate-900 border border-white/5 px-2 py-0.5 rounded-full leading-none">
                                {seriesItems.length} {language === 'RU' ? 'Миссий' : 'Missions'}
                            </div>
                        </div>

                        {/* Connection Line & Floating/Stacked Cards */}
                        <div className="relative pl-6 space-y-5">
                            {/* Vertical Line indicator */}
                            <div className="absolute left-1.5 top-0 bottom-3 w-[2px] bg-indigo-500/15" />

                            {seriesItems.map(({ level, index: overallIndex }, sIdx) => {
                                const isUnlocked = overallIndex <= campaignProgress;
                                const isCompleted = overallIndex < campaignProgress;
                                const isCurrent = overallIndex === campaignProgress;
                                const levelKey = level.id.replace('.', '_');
                                
                                const displayTitle = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${levelKey}_TITLE`] || level.title)
                                    .replace(/^(?:Simulation|Sim|Сим|SIM|SIMULATION)\s*[\d.]+:?\s*/i, '');
                                const displayDesc = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${levelKey}_DESC`] || level.description);
                                const threat = level.aiMode === 'none' ? 'NONE' : (level.aiMode === 'basic' ? 'BASIC' : 'HIGH');

                                return (
                                    <motion.div 
                                        key={level.id}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: sIdx * 0.05 }}
                                        className="relative flex items-start gap-3"
                                    >
                                        {/* Status bullet node on the line */}
                                        <div className="absolute left-[-24px] top-4 z-10 flex items-center justify-center">
                                            {isCurrent && <div className="absolute w-[18px] h-[18px] bg-amber-500/25 rounded-full blur-[3px] animate-pulse" />}
                                            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all duration-300 ${
                                                isCompleted ? 'bg-emerald-500 border-emerald-400 text-slate-900 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 
                                                (isCurrent ? 'bg-amber-500 border-amber-400 text-slate-900 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : 'bg-slate-800 border-slate-700 text-slate-500')
                                            }`}>
                                                {isCompleted ? <Check className="w-2.5 h-2.5 text-slate-950 stroke-[3.5px]" /> : (isUnlocked ? <div className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" /> : <Lock className="w-1.5 h-1.5 text-slate-500" />)}
                                            </div>
                                        </div>

                                        {/* Compact Responsive Mobile Cards with beautiful spacing */}
                                        <motion.div 
                                            whileTap={isUnlocked ? { scale: 0.98 } : {}}
                                            onClick={() => {
                                                if (isSiegeActive) {
                                                    playUiSound('ERROR');
                                                    showToast(
                                                        language === 'RU' 
                                                            ? 'АКТИВНА ЗАЩИТА ЯДРА! Завершите защиту, чтобы продолжить кампанию.' 
                                                            : 'CORE DEFENSE ACTIVE! Complete the defense to continue campaign.', 
                                                        'error'
                                                    );
                                                    return;
                                                }
                                                if (isUnlocked) {
                                                    startCampaignLevel(level.id);
                                                } else {
                                                    playUiSound('ERROR');
                                                }
                                            }}
                                            className="flex-1 flex flex-col bg-slate-950/40 backdrop-blur-md border p-3.5 rounded-xl shadow-lg transition-all duration-300 relative overflow-hidden cursor-pointer hover:bg-slate-900/50 border-indigo-500/15"
                                            style={{
                                                borderColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : (isCurrent ? 'rgba(245, 158, 11, 0.4)' : 'rgba(99, 102, 241, 0.1)'),
                                                opacity: isUnlocked ? 1 : 0.55
                                            }}
                                        >
                                            {/* Glowing back element */}
                                            <div className={`absolute -inset-[1px] bg-gradient-to-r ${
                                                isCompleted ? 'from-emerald-500/10 to-transparent' : 
                                                (isCurrent ? 'from-amber-500/15 to-transparent' : 'from-indigo-500/5 to-transparent')
                                            } opacity-50 blur-[6px] -z-10 pointer-events-none`} />

                                            <div className="flex items-center gap-1.5 mb-1">
                                                <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : (isCurrent ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]' : 'bg-slate-600')}`} />
                                                <span className={`text-[9px] font-black uppercase tracking-[0.15em] ${isCompleted ? 'text-emerald-400' : (isCurrent ? 'text-amber-400' : 'text-indigo-400/80')}`}>{t.MISSION_PREFIX} {level.id}</span>
                                            </div>

                                            <h3 className={`text-xs font-black uppercase leading-tight mb-1.5 ${isCurrent ? 'text-amber-300' : 'text-slate-100'}`}>{displayTitle}</h3>
                                            
                                            {isUnlocked ? (
                                                <>
                                                    <p className="text-[10px] text-slate-400 font-mono leading-relaxed italic mb-3 opacity-90 line-clamp-2">{displayDesc}</p>
                                                    <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-white/5 w-full">
                                                        <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 text-[8px] font-bold text-slate-300 font-mono">
                                                            <ShieldAlert className={`w-3 h-3 ${threat === 'NONE' ? 'text-emerald-400' : (threat === 'BASIC' ? 'text-amber-400' : 'text-red-400')}`} />
                                                            <span>{(t as any)[`LVL_THREAT_${threat}`]}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                                            <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-400 font-bold bg-slate-900/60 p-1 rounded-lg border border-indigo-500/15 shadow-inner px-2 leading-none">
                                                                <BatteryCharging className="w-3 h-3 text-indigo-400 animate-pulse" />
                                                                <span>{level.startState.moves}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400 font-bold bg-slate-900/60 p-1 rounded-lg border border-emerald-500/15 shadow-inner px-2 leading-none">
                                                                <Coins className="w-3 h-3 text-emerald-400" />
                                                                <span>{level.startState.credits}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="text-[9.5px] text-slate-600 font-semibold italic">{t.LVL_STATUS_LOCKED}</p>
                                            )}
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </motion.div>
        );
    }

    return (
      <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar"
      >
          <svg className="absolute inset-0 w-full pointer-events-none z-0" style={{ height: timelineLayout.totalHeight }}>
             <defs>
               <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                 <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                 <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
               </linearGradient>
               <filter id="glow">
                  <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
               </filter>
             </defs>
             {timelineLayout.positions.map((pos, i) => {
                 if (i === timelineLayout.positions.length - 1) return null;
                 const nextPos = timelineLayout.positions[i + 1];
                 const isPathUnlocked = i < campaignProgress;
                 const cpY1 = pos.y + (nextPos.y - pos.y) * 0.5;
                 const cpY2 = nextPos.y - (nextPos.y - pos.y) * 0.5;
                 const pathD = `M ${pos.x} ${pos.y} C ${pos.x} ${cpY1}, ${nextPos.x} ${cpY2}, ${nextPos.x} ${nextPos.y}`;
                 return (
                     <React.Fragment key={`paths-grp-${i}`}>
                         {/* Base connection state path */}
                         <path 
                             d={pathD} 
                             fill="none" 
                             stroke={isPathUnlocked ? 'url(#pathGradient)' : '#1e293b'} 
                             strokeWidth={isMobile ? "2" : "3"} 
                             strokeDasharray={isPathUnlocked ? "0" : "6 6"} 
                             style={{ filter: isPathUnlocked ? 'url(#glow)' : 'none' }} 
                         />
                         {/* High-voltage flowing data particle thread */}
                         {isPathUnlocked && (
                             <path 
                                 d={pathD} 
                                 fill="none" 
                                 stroke="#06b6d4" 
                                 strokeWidth={isMobile ? "1.5" : "2"} 
                                 strokeDasharray="4 14" 
                                 className="animate-[pulse-dash_3s_linear_infinite]" 
                                 style={{ filter: 'drop-shadow(0 0 4px #06b6d4)' }}
                             />
                         )}
                     </React.Fragment>
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

                  return (
                      <motion.div 
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          key={pos.level.id}
                      >
                          {pos.hasHeader && (
                              <div className="absolute left-0 right-0 flex items-center justify-center pointer-events-none transform -translate-y-1/2" style={{ top: pos.headerY }}>
                                  <div className="flex items-center gap-4 px-6 py-2 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-full shadow-[0_0_25px_rgba(99,102,241,0.4)] md:px-7 md:py-2.5">
                                      <Layers className="w-4 h-4 text-indigo-400" />
                                      <span className="text-xs md:text-sm font-black uppercase tracking-[0.3em] text-indigo-200 font-sans">Series {pos.seriesId}</span>
                                  </div>
                              </div>
                          )}
                          <div ref={isCurrent ? currentLevelRef : null} className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: pos.x, top: pos.y }}>
                              <div className={`relative flex items-center justify-center group ${isUnlocked ? 'opacity-100' : 'opacity-40 grayscale-[80%]'}`}>
                                  {/* Timeline Micro Milestone Node */}
                                  <div className="relative z-20 flex items-center justify-center pointer-events-none select-none">
                                      {isCurrent && <div className="absolute w-8 h-8 bg-amber-500/35 rounded-full blur-md animate-pulse" />}
                                      <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-500 shadow-md ${
                                          isCompleted ? 'bg-emerald-500 border-emerald-400 text-slate-900 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 
                                          (isCurrent ? 'bg-amber-500 border-amber-400 text-slate-900 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-slate-800 border-slate-700 text-slate-500')
                                      }`}>
                                          {isCompleted ? <Check className="w-3 h-3 text-slate-950 stroke-[3.5px]" /> : (isUnlocked ? <div className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-ping" /> : <Lock className="w-2.5 h-2.5 text-slate-500" />)}
                                      </div>
                                      <div className={`absolute -top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-[4px] text-[7.5px] font-black uppercase tracking-wider border shadow-md font-sans whitespace-nowrap leading-none ${
                                          isCurrent ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-400 border-slate-700/50'
                                      }`}>
                                          {isCurrent ? t.BADGE_CURRENT : (isCompleted ? t.BADGE_DONE : t.BADGE_LOCKED)}
                                      </div>
                                  </div>

                                  {/* Clickable interactive level card */}
                                  <motion.div 
                                      whileHover={isUnlocked ? { scale: 1.03, y: -2, borderColor: isCurrent ? 'rgba(245,158,11,0.8)' : 'rgba(99,102,241,0.8)' } : {}}
                                      whileTap={isUnlocked ? { scale: 0.98 } : {}}
                                      onClick={() => {
                                          if (isSiegeActive) {
                                              playUiSound('ERROR');
                                              showToast(
                                                  language === 'RU' 
                                                      ? 'АКТИВНА ЗАЩИТА ЯДРА! Завершите защиту, чтобы продолжить кампанию.' 
                                                      : 'CORE DEFENSE ACTIVE! Complete the defense to continue campaign.', 
                                                  'error'
                                              );
                                              return;
                                          }
                                          if (isUnlocked) {
                                              startCampaignLevel(pos.level.id);
                                          } else {
                                              playUiSound('ERROR');
                                          }
                                      }}
                                      className={`absolute flex flex-col bg-slate-950/35 backdrop-blur-[18px] border p-3.5 xs:p-4 rounded-2xl md:rounded-[1.5rem] shadow-[0_15px_35px_rgba(0,0,0,0.6)] w-[calc(100vw-110px)] max-w-[260px] md:w-[280px] transition-all duration-300 z-10
                                          ${isUnlocked ? 'cursor-pointer hover:bg-slate-900/60' : 'cursor-not-allowed opacity-[0.55]'}
                                          ${isCompleted ? 'border-emerald-500/20' : (isCurrent ? 'border-amber-500/50' : 'border-indigo-500/10')}
                                          ${isMobile ? 'left-full ml-4 text-left' : (i % 2 === 0 ? 'left-full ml-8 text-left' : 'right-full mr-8 text-right items-end')}
                                      `}
                                  >
                                      {/* Glassmorphism blurred glow on background */}
                                      <div className={`absolute -inset-[2px] rounded-2xl md:rounded-[1.5rem] bg-gradient-to-r ${
                                          isCompleted ? 'from-emerald-500/20 via-emerald-600/5 to-transparent' : 
                                          (isCurrent ? 'from-amber-500/30 via-amber-600/10 to-transparent' : 'from-indigo-500/10 via-indigo-600/5 to-transparent')
                                      } opacity-75 blur-[12px] -z-10 pointer-events-none group-hover:opacity-100 transition-opacity duration-300`} />

                                      {/* Additional ambient subtle circle */}
                                      <div className={`absolute top-0 w-24 h-24 blur-[25px] rounded-full pointer-events-none -translate-y-6 ${isMobile ? 'left-0' : (i % 2 === 0 ? 'left-0' : 'right-0')} ${isCompleted ? 'bg-emerald-500/5' : (isCurrent ? 'bg-amber-500/5' : 'bg-indigo-500/5')}`} />

                                      <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                                          <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : (isCurrent ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-600')}`} />
                                          <span className={`text-[9.5px] font-black uppercase tracking-[0.2em] ${isCompleted ? 'text-emerald-400' : (isCurrent ? 'text-amber-400 animate-pulse' : 'text-indigo-400/80')}`}>{t.MISSION_PREFIX} {pos.level.id}</span>
                                      </div>

                                      <h3 className={`text-xs md:text-base font-black uppercase leading-tight mb-2 transition-colors duration-300 ${isCurrent ? 'text-amber-300' : 'text-slate-100'}`}>{displayTitle}</h3>
                                      
                                      {isUnlocked ? (
                                          <>
                                              <p className={`text-[10px] md:text-[11px] text-slate-400 font-mono leading-relaxed italic mb-3 opacity-90 line-clamp-2 ${isMobile ? 'text-left' : (i % 2 === 0 ? 'text-left' : 'text-right')}`}>{displayDesc}</p>
                                              
                                              {/* Mission Details matching card grid */}
                                              {pos.level && (
                                                  <div className="flex items-center justify-between gap-2 mt-auto pt-2 border-t border-white/5 w-full">
                                                      {/* Threat Tag */}
                                                      {(() => {
                                                          const threat = pos.level.aiMode === 'none' ? 'NONE' : (pos.level.aiMode === 'basic' ? 'BASIC' : 'HIGH');
                                                          return (
                                                              <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 text-[8px] font-bold text-slate-300 font-mono">
                                                                  <ShieldAlert className={`w-3 h-3 ${threat === 'NONE' ? 'text-emerald-400' : (threat === 'BASIC' ? 'text-amber-400' : 'text-red-400')}`} />
                                                                  <span>{(t as any)[`LVL_THREAT_${threat}`]}</span>
                                                              </div>
                                                          );
                                                      })()}
                                                      
                                                      {/* Goal/Stat Indicators - Made larger and placed to right side */}
                                                      <div className="flex items-center gap-2 ml-auto shrink-0">
                                                          <div className="flex items-center gap-1 text-[11px] md:text-xs font-mono text-indigo-400 font-bold bg-slate-900/60 p-1 md:p-1.5 rounded-lg border border-indigo-500/15 shadow-inner px-2 leading-none">
                                                              <BatteryCharging className="w-3 h-3 text-indigo-400 animate-pulse" />
                                                              <span>{pos.level.startState.moves}</span>
                                                          </div>
                                                          <div className="flex items-center gap-1 text-[11px] md:text-xs font-mono text-emerald-400 font-bold bg-slate-900/60 p-1 md:p-1.5 rounded-lg border border-emerald-500/15 shadow-inner px-2 leading-none">
                                                              <Coins className="w-3 h-3 text-emerald-400" />
                                                              <span>{pos.level.startState.credits}</span>
                                                          </div>
                                                      </div>
                                                  </div>
                                              )}
                                          </>
                                      ) : (
                                          <p className={`text-[10px] text-slate-600 font-semibold italic ${isMobile ? 'text-left' : (i % 2 === 0 ? 'text-left' : 'text-right')}`}>{t.LVL_STATUS_LOCKED}</p>
                                      )}
                                  </motion.div>
                              </div>
                          </div>
                      </motion.div>
                  );
              })}
          </div>
      </motion.div>
    );
  };

    const renderLevelGrid = () => {
        // Group levels by series
        const levelsBySeries: { [key: string]: typeof levelsToDisplay } = {};
        levelsToDisplay.forEach(level => {
            const series = level.id.split('.')[0] || '1';
            if (!levelsBySeries[series]) {
                levelsBySeries[series] = [];
            }
            levelsBySeries[series].push(level);
        });

        return (
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-slate-950/20 relative"
            >
                <div className="max-w-7xl mx-auto pb-12 z-10 relative flex flex-col gap-8 md:gap-10">
                    {Object.entries(levelsBySeries).map(([seriesId, seriesLevels]) => (
                        <div key={`series-${seriesId}`} className="flex flex-col gap-3 md:gap-4">
                            {/* Series Header */}
                            <div className="flex items-center gap-3 border-b border-indigo-500/10 pb-2 mb-1">
                                <Layers className="w-4 h-4 text-indigo-400" />
                                <h3 className="text-sm md:text-lg font-black uppercase tracking-[0.2em] text-indigo-200">
                                    {language === 'RU' ? `Серия ${seriesId}` : `Series ${seriesId}`}
                                </h3>
                                <div className="text-[10px] font-mono text-slate-500 bg-slate-900/40 px-2 py-0.5 rounded border border-white/5">
                                    {seriesLevels.length} {language === 'RU' ? 'Миссий' : 'Missions'}
                                </div>
                            </div>

                            {/* Cards Grid with small gaps */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 content-start">
                                {seriesLevels.map((level) => {
                                    const overallIndex = levelsToDisplay.findIndex(l => l.id === level.id);
                                    const isUnlocked = overallIndex <= levelsModeProgress;
                                    const isCompleted = overallIndex < levelsModeProgress;
                                    const isCurrent = overallIndex === levelsModeProgress;
                                    const displayTitle = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${level.id.replace('.','_')}_TITLE`] || level.title).replace(/^(?:Simulation|Sim|Сим|SIM|SIMULATION)\s*[\d.]+:?\s*/i, '');
                                    const threat = level.aiMode === 'none' ? 'NONE' : (level.aiMode === 'basic' ? 'BASIC' : 'HIGH');
                                    const glowColor = threat === 'NONE' ? 'emerald' : (threat === 'BASIC' ? 'amber' : 'red');
                                    const delay = overallIndex * 0.03;

                                    return (
                                        <motion.div 
                                            key={level.id} 
                                            initial={{ opacity: 0, y: 15, scale: 0.98 }}
                                            animate={{ opacity: 1, y: 0, scale: 1 }}
                                            transition={{ delay, duration: 0.35, type: 'spring', stiffness: 260, damping: 25 }}
                                            whileHover={isUnlocked ? { scale: 1.02, y: -2 } : { scale: 1.01 }}
                                            whileTap={isUnlocked ? { scale: 0.98 } : {}}
                                            className={`group relative flex flex-col p-3 md:p-3.5 rounded-2xl md:rounded-[1.3rem] transition-all duration-300 h-full
                                                ${isUnlocked ? 'cursor-pointer hover:shadow-[0_12px_24px_rgba(0,0,0,0.4)]' : 'opacity-65 grayscale-[40%] cursor-not-allowed'}
                                            `}
                                            onClick={() => {
                                                if (isSiegeActive) {
                                                    playUiSound('ERROR');
                                                    showToast(
                                                        language === 'RU' 
                                                            ? 'АКТИВНА ЗАЩИТА ЯДРА! Завершите защиту, чтобы продолжить кампанию.' 
                                                            : 'CORE DEFENSE ACTIVE! Complete the defense to continue campaign.', 
                                                        'error'
                                                    );
                                                    return;
                                                }
                                                if (isUnlocked) {
                                                    startCampaignLevel(level.id);
                                                } else {
                                                    playUiSound('ERROR');
                                                }
                                            }}
                                        >
                                            {/* Card Background - Glassmorphism */}
                                            <div className={`absolute inset-0 bg-slate-950/25 backdrop-blur-[18px] border border-white/5 transition-all duration-300 rounded-2xl md:rounded-[1.3rem] overflow-hidden
                                                ${isUnlocked ? 'group-hover:bg-slate-950/40 group-hover:border-white/15' : 'bg-slate-950/10'}
                                                ${isCurrent ? 'border-amber-500/30' : ''}
                                            `} />

                                            {/* Glassmorphism blurred glow on background */}
                                            <div className={`absolute -inset-[2px] rounded-2xl md:rounded-[1.3rem] bg-gradient-to-r ${
                                                glowColor === 'emerald' ? 'from-emerald-500/10 via-emerald-600/5 to-transparent' : 
                                                (glowColor === 'amber' ? 'from-amber-500/15 via-amber-600/5 to-transparent' : 'from-red-500/15 via-red-600/5 to-transparent')
                                            } opacity-50 blur-[8px] -z-10 pointer-events-none group-hover:opacity-75 transition-opacity duration-300`} />

                                            <div className={`absolute -top-4 -right-4 w-20 h-20 blur-[20px] rounded-full pointer-events-none group-hover:opacity-100 transition-opacity duration-500 ${
                                                glowColor === 'emerald' ? 'bg-emerald-500/5' : (glowColor === 'amber' ? 'bg-amber-500/5' : 'bg-red-500/5')
                                            }`} />

                                            <div className="relative z-10 flex flex-col h-full gap-2.5">
                                                {/* Header Section: Icon & Title & Status */}
                                                <div className="flex items-start gap-2.5">
                                                    <div className={`flex items-center justify-center w-9 h-9 md:w-10 md:h-10 rounded-xl bg-slate-950 border border-slate-700/40 shadow-inner transition-all duration-300 shrink-0 ${
                                                        isUnlocked ? (threat === 'NONE' ? 'text-emerald-400' : (threat === 'BASIC' ? 'text-amber-400' : 'text-red-400')) : 'text-slate-600'
                                                    } ${
                                                        glowColor === 'emerald' ? 'group-hover:border-emerald-400/30' : (glowColor === 'amber' ? 'group-hover:border-amber-400/30' : 'group-hover:border-red-400/30')
                                                    }`}>
                                                        <MapPin className="w-4 h-4 md:w-5 md:h-5" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className={`text-xs md:text-sm font-black uppercase tracking-wider leading-tight transition-colors duration-300 mb-0.5 line-clamp-1
                                                           ${isUnlocked ? 'text-slate-100 group-hover:text-white' : 'text-slate-500'}
                                                       `}>
                                                           {displayTitle}
                                                       </h3>
                                                       <div className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[8px] font-mono tracking-tighter uppercase font-bold
                                                          ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : (isCurrent ? 'bg-amber-500/25 text-amber-400 border-amber-500/35' : 'bg-slate-800/80 text-slate-500 border-white/5')}
                                                       `}>
                                                           {isCompleted ? t.LVL_STATUS_COMPLETED : (isCurrent ? t.LVL_STATUS_READY : t.LVL_STATUS_LOCKED)}
                                                       </div>
                                                    </div>
                                                </div>

                                                {/* Body Section: Goal */}
                                                <div className="flex-1">
                                                    <div className="bg-black/20 rounded-lg p-2 border-l border-indigo-500/20 group-hover:border-indigo-500/40 transition-colors">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <Crosshair className="w-2 h-2 text-slate-600" />
                                                            <span className="text-[7px] font-bold text-slate-500 uppercase tracking-widest">{t.LVL_GOAL}</span>
                                                        </div>
                                                        <p className="text-[9px] md:text-[10px] text-slate-400 font-mono leading-relaxed italic line-clamp-2 select-none">
                                                            {level.goalText || ((TEXT[language].CAMPAIGN as any)[`LEVEL_${level.id.replace('.','_')}_DESC`] || '').split('\n\n')[0]}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Bottom Footer: Threat & Resources */}
                                                <div className="mt-auto flex items-center justify-between gap-1.5 pt-2 border-t border-white/5 group-hover:border-white/10 transition-colors">
                                                    <div className="flex items-center gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5">
                                                        <ShieldAlert className={`w-3 h-3 ${threat === 'NONE' ? 'text-emerald-400' : (threat === 'BASIC' ? 'text-amber-400' : 'text-red-400')}`} />
                                                        <span className="text-[8px] font-bold text-slate-300">{(t as any)[`LVL_THREAT_${threat}`]}</span>
                                                    </div>

                                                    {/* Starting items */}
                                                    <div className="flex items-center gap-1.5 ml-auto shrink-0">
                                                        <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-mono text-indigo-400 font-bold bg-slate-900/60 p-1 rounded-md border border-indigo-500/15 shadow-inner px-1.5 leading-none">
                                                            <BatteryCharging className="w-2.5 h-2.5 text-indigo-400 animate-pulse" />
                                                            <span>{level.startState.moves}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[9px] md:text-[10px] font-mono text-emerald-400 font-bold bg-slate-900/60 p-1 rounded-md border border-emerald-500/15 shadow-inner px-1.5 leading-none">
                                                            <Coins className="w-2.5 h-2.5 text-emerald-400" />
                                                            <span>{level.startState.credits}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {/* Lock Overlay */}
                                            {!isUnlocked && (
                                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px] rounded-2xl md:rounded-[1.3rem]">
                                                    <Lock className="w-5 h-5 text-slate-700/50" />
                                                </div>
                                            )}

                                            {/* Click Indicator on hover */}
                                            {isUnlocked && !isCompleted && (
                                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <div className="w-4 h-4 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40">
                                                        <Play className="w-2 text-indigo-400 fill-current ml-0.5" />
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

  return (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-0 md:p-6"
    >
      <CampaignBackground />
      <motion.div 
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative z-10 w-full h-full lg:h-[94vh] lg:w-[96vw] max-w-[1600px] flex flex-col md:bg-slate-900/60 md:backdrop-blur-2xl md:border md:border-indigo-500/30 md:rounded-3xl md:shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(99,102,241,0.1)] overflow-hidden box-border"
      >
        <div className="px-4 md:px-8 py-4 md:py-8 h-14 box-content border-b border-indigo-500/20 flex items-center justify-between bg-slate-900/40 shrink-0 z-20 backdrop-blur-xl gap-3">
          <div className="flex items-center gap-3 md:gap-4 min-w-0">
             <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { useGameStore.getState().setUIState('STORY_BUILDER'); playUiSound('CLICK'); }}
                className="p-2.5 md:p-3 rounded-xl bg-slate-900/60 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-500 text-slate-300 hover:text-white transition-all duration-300 flex items-center justify-center cursor-pointer shadow-md shadow-black/20 shrink-0 active:scale-95"
             >
                <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
             </motion.button>
             <div className="flex flex-col gap-0.5">
               <h2 className="text-sm md:text-2xl font-black text-white uppercase tracking-wider italic leading-none drop-shadow-md truncate font-sans">
                 {campaignMode === 'STORY' ? TEXT[language].MENU.MODE_STORY : TEXT[language].MENU.MODE_LEVELS}
               </h2>
               <div className="flex items-center gap-2">
                 <p className="text-indigo-400/50 text-[7px] md:text-[9px] font-mono tracking-[0.3em] uppercase pl-1 font-bold leading-none hidden xs:block">{t.HEADER_SUBTITLE}</p>
                 <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-400/20 rounded-full px-2 py-0.5 text-[8px] md:text-[8.5px] font-mono text-indigo-300 select-none shadow-[0_0_10px_rgba(99,102,241,0.1)] leading-none inline-flex max-w-[124px] xs:max-w-none truncate">
                   <div className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_#10b981]" />
                   <span className="truncate">{user ? user.nickname : 'Guest'}</span>
                 </div>
               </div>
             </div>
          </div>

          {campaignMode === 'LEVELS' && !isMobile && (
              <div className="flex items-center gap-6 lg:gap-10 border-l border-white/10 pl-6 lg:pl-10 ml-auto group">
                  <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{TEXT[language].HUD.MISSION_COMPLETE}</span>
                      <span className="text-2xl font-black text-white font-mono leading-none group-hover:text-indigo-400 transition-colors drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                          {levelsModeProgress} <span className="text-slate-600 text-sm">/ {levelsToDisplay.length}</span>
                      </span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">AUTH CLEARANCE</span>
                      <div className="flex gap-1">
                          {[...Array(8)].map((_, idx) => (
                              <div key={idx} className={`h-2 w-4 md:w-5 rounded-full shadow-inner transition-all duration-700 ${levelsModeProgress >= (idx * 4) ? 'bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.6)]' : 'bg-slate-800 border border-slate-700/30'}`} />
                          ))}
                      </div>
                  </div>
              </div>
          )}

          <div className="flex items-center gap-2 md:gap-3 ml-auto">
              <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => { setShowUpgrades(true); playUiSound('CLICK'); }}
                 className="group relative flex items-center gap-2 px-2.5 xs:px-3 md:px-5 py-2 md:py-2.5 bg-indigo-600/10 hover:bg-indigo-600/25 text-indigo-100 rounded-lg md:rounded-xl border border-indigo-500/35 transition-all text-[9px] xs:text-[9.5px] md:text-[10.5px] font-black uppercase tracking-widest shadow-sm cursor-pointer"
              >
                 <Cpu className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400 drop-shadow-[0_0_5px_rgba(165,180,252,0.5)]" />
                 <span className="relative z-10 flex items-center gap-1.5 leading-none">
                    {TEXT[language].HUD.BTN_UPGRADES || 'Upgrades'}
                    {skillPoints > 0 && (
                        <span className="flex h-4 px-1.5 items-center justify-center rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] border border-white/20 text-[8px] md:text-[9px] text-white animate-pulse font-mono font-bold leading-none">
                           {skillPoints}
                        </span>
                    )}
                 </span>
              </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {isSiegeActive && (
              <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-red-950/80 border-b border-red-500/40 backdrop-blur-xl px-4 md:px-8 py-2 md:py-3 flex items-center justify-between gap-3 shrink-0 text-red-100 z-10 overflow-hidden"
              >
                  <div className="flex items-center gap-2.5 min-w-0">
                      <ShieldAlert className="w-5 h-5 text-red-400 animate-pulse shrink-0" />
                      <div className="flex flex-col min-w-0">
                          <span className="text-[10px] md:text-[11px] font-black uppercase tracking-[0.15em] text-red-400 leading-none mb-1">
                              {language === 'RU' ? 'АКТИВИРОВАНА СИСТЕМА ЗАЩИТЫ ЯДРА' : 'CORE DEFENSE MODE ENGAGED'}
                          </span>
                          <span className="text-xs md:text-sm font-semibold truncate leading-none text-red-200">
                              {language === 'RU' 
                                  ? 'Прохождение миссий заблокировано. Вернитесь на поле синтеза и отразите нападение автономных ИИ-ботов!' 
                                  : 'Campaign missions are locked. Return to the canvas board to defend against autonomous AI bots!'}
                          </span>
                      </div>
                  </div>
                  <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { useGameStore.getState().setUIState('STORY_BUILDER'); playUiSound('CLICK'); }}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-200 rounded-lg border border-red-500/40 font-bold font-sans uppercase tracking-wider text-[9px] md:text-[10px] whitespace-nowrap cursor-pointer transition-all active:scale-95 shadow-lg shadow-red-950/50 flex items-center gap-1.5"
                  >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{language === 'RU' ? 'ЗАЩИТИТЬ ЯДРО' : 'DEFEND CORE'}</span>
                  </motion.button>
              </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
            {campaignMode === 'STORY' ? renderStoryTimeline() : renderLevelGrid()}
        </AnimatePresence>
        <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none select-none text-[80px] font-black italic tracking-tighter text-white overflow-hidden whitespace-nowrap">MISSION CONTROL DATA TERMINAL</div>
        <AnimatePresence>
          {showUpgrades && <UpgradesTree onClose={() => setShowUpgrades(false)} key="upgrades-tree" />}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

export default CampaignMap;
