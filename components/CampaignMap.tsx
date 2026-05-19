import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { Check, Lock, Play, MapPin, ShieldAlert, Crosshair, Layers, Cpu, BatteryCharging, Coins } from 'lucide-react';
import HexButton from './HexButton.tsx';
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

  const currentProgress = campaignMode === 'STORY' ? campaignProgress : levelsModeProgress;

  // Responsive State
  const isMobile = deviceType === 'MOBILE';
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const [showUpgrades, setShowUpgrades] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLevelRef = useRef<HTMLDivElement>(null);

  const t = TEXT[language].CAMPAIGN_MAP;

  useEffect(() => {
    const handleResize = () => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.clientWidth);
        }
    };
    window.addEventListener('resize', handleResize);
    setTimeout(handleResize, 0);
    return () => window.removeEventListener('resize', handleResize);
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
    const ITEM_HEIGHT = isMobile ? 140 : 220;
    const START_OFFSET = 120;
    const positions: any[] = [];
    let currentY = START_OFFSET;
    let lastSeries = '';

    CAMPAIGN_LEVELS.forEach((level, index) => {
        const series = level.id.split('.')[0];
        let hasHeader = false;
        if (series !== lastSeries) {
            if (index > 0) currentY += (isMobile ? 60 : 80);
            hasHeader = true;
            lastSeries = series;
        }
        const isLeft = index % 2 === 0;
        const x = isMobile ? 60 : (isLeft ? containerWidth * 0.35 : containerWidth * 0.65);
        positions.push({ x, y: currentY, hasHeader, seriesId: series, level, index });
        currentY += ITEM_HEIGHT;
    });
    return { positions, totalHeight: currentY + (isMobile ? 100 : 200) };
  }, [containerWidth, isMobile, campaignMode]);

  const levelsToDisplay = useMemo(() => CAMPAIGN_LEVELS.filter(l => !l.isCityLevel), []);

  const renderStoryTimeline = () => (
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
                const displayTitle = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${levelKey}_TITLE`] || pos.level.title).replace(/Simulation\s[\d.]+:\s|Сим\s[\d.]+:\s/, '');
                const displayDesc = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${levelKey}_DESC`] || pos.level.description).split('\n')[0];

                return (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        key={pos.level.id}
                    >
                        {pos.hasHeader && (
                            <div className="absolute left-0 right-0 flex items-center justify-center pointer-events-none" style={{ top: pos.y - (isMobile ? 100 : 120) }}>
                                <div className="flex items-center gap-4 px-6 py-2 bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.2)]">
                                    <Layers className="w-4 h-4 text-indigo-400" />
                                    <span className="text-sm font-black uppercase tracking-[0.3em] text-indigo-200">Series {pos.seriesId}</span>
                                </div>
                            </div>
                        )}
                        <div ref={isCurrent ? currentLevelRef : null} className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: pos.x, top: pos.y }}>
                            <div className={`relative flex items-center justify-center group ${isUnlocked ? 'opacity-100' : 'opacity-40 grayscale-[80%]'}`}>
                                <motion.div 
                                    whileHover={isUnlocked ? { scale: 1.05 } : {}}
                                    whileTap={isUnlocked ? { scale: 0.95 } : {}}
                                    className="relative z-20"
                                >
                                    {isCurrent && <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-xl animate-pulse" />}
                                    <HexButton size={isMobile ? 'md' : 'lg'} variant={isCompleted ? 'emerald' : (isCurrent ? 'amber' : 'slate')} active={isCurrent} pulsate={isCurrent}
                                        onClick={() => isUnlocked ? startCampaignLevel(pos.level.id) : playUiSound('ERROR')} disabled={!isUnlocked}>
                                        {isCompleted ? <Check className="w-6 h-6 md:w-8 md:h-8" /> : (isUnlocked ? <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" /> : <Lock className="w-5 h-5 md:w-6 md:h-6 opacity-50" />)}
                                    </HexButton>
                                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shadow-lg ${isCurrent ? 'bg-amber-500 text-slate-900 border-amber-400 animate-bounce' : 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                                        {isCurrent ? t.BADGE_CURRENT : (isCompleted ? t.BADGE_DONE : t.BADGE_LOCKED)}
                                    </div>
                                </motion.div>
                                <div className={`absolute flex flex-col bg-slate-900/80 backdrop-blur-xl border p-4 rounded-2xl md:rounded-[1.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.7)] w-[260px] md:w-[280px] transition-all duration-300 z-10 hover:border-indigo-400 group-hover:bg-slate-900/90
                                    ${isCompleted ? 'border-emerald-500/30' : (isCurrent ? 'border-amber-500/50' : 'border-indigo-500/20')}
                                    ${isMobile ? 'left-full ml-4 text-left' : (i % 2 === 0 ? 'left-full ml-8 text-left' : 'right-full mr-8 text-right items-end')}
                                `}>
                                    {/* Glowing accent spot */}
                                    <div className={`absolute top-0 w-24 h-24 bg-indigo-500/5 blur-[25px] rounded-full pointer-events-none -translate-y-6 ${i % 2 === 0 ? 'left-0' : 'right-0'}`} />

                                    <div className="flex items-center gap-1.5 mb-1.5 shrink-0">
                                        <div className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : (isCurrent ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]' : 'bg-slate-600')}`} />
                                        <span className={`text-[9.5px] font-black uppercase tracking-[0.2em] ${isCompleted ? 'text-emerald-400' : (isCurrent ? 'text-amber-400 animate-pulse' : 'text-indigo-400/80')}`}>{t.MISSION_PREFIX} {pos.level.id}</span>
                                    </div>

                                    <h3 className={`text-xs md:text-base font-black uppercase leading-tight mb-2 transition-colors duration-300 ${isCurrent ? 'text-amber-300' : 'text-slate-100'}`}>{displayTitle}</h3>
                                    
                                    {isUnlocked ? (
                                        <>
                                            <p className={`text-[10px] md:text-[11px] text-slate-400 font-mono leading-relaxed italic mb-3 opacity-90 line-clamp-2 ${i % 2 === 0 ? 'text-left' : 'text-right'}`}>{displayDesc}</p>
                                            
                                            {/* Mission Details matching card grid */}
                                            {pos.level && (
                                                <div className={`flex flex-wrap items-center gap-2 mt-auto pt-2 border-t border-white/5 w-full ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                                                    {/* Threat Tag */}
                                                    {(() => {
                                                        const threat = pos.level.aiMode === 'none' ? 'NONE' : (pos.level.aiMode === 'basic' ? 'BASIC' : 'HIGH');
                                                        return (
                                                            <div className="flex items-center gap-1 bg-black/30 px-1.5 py-0.5 rounded border border-white/5 text-[8px] font-bold text-slate-300 font-mono">
                                                                <ShieldAlert className={`w-2.5 h-2.5 ${threat === 'NONE' ? 'text-emerald-400' : (threat === 'BASIC' ? 'text-amber-400' : 'text-red-400')}`} />
                                                                <span>{(t as any)[`LVL_THREAT_${threat}`]}</span>
                                                            </div>
                                                        );
                                                    })()}
                                                    
                                                    {/* Goal/Stat Indicators */}
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex items-center gap-0.5 text-[8px] font-mono text-indigo-400 font-bold">
                                                            <BatteryCharging className="w-2.5 h-2.5 text-indigo-400" />
                                                            <span>{pos.level.startState.moves}</span>
                                                        </div>
                                                        <div className="flex items-center gap-0.5 text-[8px] font-mono text-emerald-400 font-bold">
                                                            <Coins className="w-2.5 h-2.5 text-emerald-400" />
                                                            <span>{pos.level.startState.credits}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <p className={`text-[10px] text-slate-600 font-semibold italic ${i % 2 === 0 ? 'text-left' : 'text-right'}`}>{t.LVL_STATUS_LOCKED}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    </motion.div>
  );

    const renderLevelGrid = () => (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-slate-950/20 relative"
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5 max-w-7xl mx-auto pb-12 z-10 relative content-start">
                {levelsToDisplay.map((level, i) => {
                    const isUnlocked = i <= levelsModeProgress;
                    const isCompleted = i < levelsModeProgress;
                    const isCurrent = i === levelsModeProgress;
                    const displayTitle = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${level.id.replace('.','_')}_TITLE`] || level.title).replace(/Simulation\s[\d.]+:\s|Сим\s[\d.]+:\s/, '');
                    const threat = level.aiMode === 'none' ? 'NONE' : (level.aiMode === 'basic' ? 'BASIC' : 'HIGH');
                    const glowColor = threat === 'NONE' ? 'emerald' : (threat === 'BASIC' ? 'amber' : 'red');
                    const delay = i * 0.03;

                    return (
                        <motion.div 
                            key={level.id} 
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay, duration: 0.4, type: 'spring', stiffness: 260, damping: 25 }}
                            whileHover={isUnlocked ? { scale: 1.02, y: -2 } : { scale: 1.01 }}
                            whileTap={isUnlocked ? { scale: 0.98 } : {}}
                            className={`group relative flex flex-col p-3 md:p-4 rounded-2xl md:rounded-[1.5rem] transition-all duration-300 h-full
                                ${isUnlocked ? 'cursor-pointer hover:shadow-[0_15px_30px_rgba(0,0,0,0.5)]' : 'opacity-60 grayscale-[40%] cursor-not-allowed'}
                            `}
                            onClick={() => isUnlocked ? startCampaignLevel(level.id) : playUiSound('ERROR')}
                        >
                            {/* Card Background */}
                            <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-lg border border-white/5 transition-all duration-300 rounded-2xl md:rounded-[1.5rem] overflow-hidden
                                ${isUnlocked ? 'group-hover:bg-slate-800/80 group-hover:border-white/20' : 'bg-slate-900/20'}
                                ${isCurrent ? 'border-indigo-500/30' : ''}
                            `} />

                            {/* Glowing Gradient Accent */}
                            {isUnlocked && (
                                <div className={`absolute inset-0 bg-gradient-to-br from-${glowColor}-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl md:rounded-[1.5rem] overflow-hidden`} />
                            )}
                            <div className={`absolute -top-4 -right-4 w-24 h-24 bg-${glowColor}-500/10 blur-[30px] rounded-full pointer-events-none group-hover:opacity-100 transition-opacity duration-500`} />

                            <div className="relative z-10 flex flex-col h-full gap-2.5">
                                {/* Header Section: Icon & Title & Status */}
                                <div className="flex items-start gap-3">
                                    <div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-950 border border-slate-700/40 shadow-inner group-hover:border-${glowColor}-400/30 transition-all duration-300 shrink-0 ${isUnlocked ? (threat === 'NONE' ? 'text-emerald-400' : (threat === 'BASIC' ? 'text-amber-400' : 'text-red-400')) : 'text-slate-600'}`}>
                                        <MapPin className="w-5 h-5 md:w-6 md:h-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                       <h3 className={`text-[11px] md:text-[13px] font-black uppercase tracking-wider leading-tight transition-colors duration-300 mb-1 line-clamp-1
                                           ${isUnlocked ? 'text-slate-100 group-hover:text-white' : 'text-slate-500'}
                                       `}>
                                           {displayTitle}
                                       </h3>
                                       <div className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[8px] font-mono tracking-tighter uppercase font-bold
                                          ${isCompleted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : (isCurrent ? 'bg-indigo-500 text-white border-white/20' : 'bg-slate-800/80 text-slate-500 border-white/5')}
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
                                <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-white/5 group-hover:border-white/10 transition-colors">
                                    <div className="flex items-center gap-1.5 bg-black/30 px-2 py-1 rounded-lg border border-white/5">
                                        <ShieldAlert className={`w-3 h-3 ${threat === 'NONE' ? 'text-emerald-400' : (threat === 'BASIC' ? 'text-amber-400' : 'text-red-400')}`} />
                                        <span className="text-[9px] font-bold text-slate-300">{(t as any)[`LVL_THREAT_${threat}`]}</span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-[10px] font-mono text-indigo-400/80">
                                            <BatteryCharging className="w-2.5 h-2.5" />
                                            {level.startState.moves}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-400/80">
                                            <Coins className="w-2.5 h-2.5" />
                                            {level.startState.credits}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Lock Overlay */}
                            {!isUnlocked && (
                                <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]">
                                    <Lock className="w-6 h-6 text-slate-700/50" />
                                </div>
                            )}

                            {/* Click Indicator on hover */}
                            {isUnlocked && !isCompleted && (
                                <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                    <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/40">
                                        <Play className="w-2.5 h-2.5 text-indigo-400 fill-current ml-0.5" />
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>
        </motion.div>
    );

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
          className="relative z-10 w-full h-full lg:h-[94vh] lg:w-[96vw] max-w-[1600px] flex flex-col md:bg-slate-900/60 md:backdrop-blur-2xl md:border md:border-indigo-500/30 md:rounded-[2.5rem] md:shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(99,102,241,0.1)] overflow-hidden box-border"
      >
        <div className="px-3 md:px-5 py-2.5 md:py-4 border-b border-indigo-500/20 flex flex-wrap md:flex-nowrap items-center justify-between bg-slate-900/40 shrink-0 z-20 backdrop-blur-xl gap-3 md:gap-4">
          <div className="flex items-center gap-3 md:gap-4">
             <div className={`p-2 md:p-3 rounded-lg md:rounded-xl shadow-inner transition-all duration-500 ${campaignMode === 'STORY' ? 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shadow-[inset_0_0_15px_rgba(99,102,241,0.1)]' : 'bg-purple-500/10 border border-purple-500/30 text-purple-400 shadow-[inset_0_0_15px_rgba(168,85,247,0.1)]'}`}>
               {campaignMode === 'STORY' ? <MapPin className="w-5 h-5 md:w-6 md:h-6" /> : <Layers className="w-5 h-5 md:w-6 md:h-6" />}
             </div>
             <div className="flex flex-col gap-0.5">
               <h2 className="text-lg md:text-3xl font-black text-white uppercase tracking-wider italic leading-none drop-shadow-md">
                 {campaignMode === 'STORY' ? TEXT[language].MENU.MODE_STORY : TEXT[language].MENU.MODE_LEVELS}
               </h2>
               <p className="text-indigo-400/50 text-[7px] md:text-[9px] font-mono tracking-[0.3em] uppercase pl-1 font-bold">{t.HEADER_SUBTITLE}</p>
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

          <div className={`flex items-center gap-2 md:gap-3 ${campaignMode === 'STORY' ? 'ml-auto' : ''}`}>
              <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => { setShowUpgrades(true); playUiSound('CLICK'); }}
                 className="group relative flex items-center gap-2 px-3 md:px-5 py-2 md:py-2.5 bg-indigo-600/10 hover:bg-indigo-600/30 text-indigo-100 rounded-lg md:rounded-xl border border-indigo-500/30 transition-all text-[9px] md:text-[10px] font-black uppercase tracking-widest overflow-hidden shadow-sm"
              >
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                 <Cpu className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400 drop-shadow-[0_0_5px_rgba(165,180,252,0.5)]" />
                 <span className="relative z-10">{TEXT[language].HUD.BTN_UPGRADES || 'Upgrades'}</span>
                 {skillPoints > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)] border border-white/20 text-[9px] md:text-[10px] text-white animate-pulse">{skillPoints}</span>}
              </motion.button>

              <motion.button 
                 whileHover={{ scale: 1.05 }}
                 whileTap={{ scale: 0.95 }}
                 onClick={() => { useGameStore.getState().setUIState('MENU'); playUiSound('CLICK'); }}
                 className="group relative px-3 md:px-5 py-2 md:py-2.5 bg-slate-800/30 hover:bg-slate-700/50 text-slate-300 hover:text-white rounded-lg md:rounded-xl border border-slate-700/50 transition-all text-[9px] md:text-[10px] font-black uppercase tracking-widest overflow-hidden shadow-sm active:scale-95"
              >
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                 <span className="relative z-10">{TEXT[language].HUD.BTN_MENU}</span>
              </motion.button>
          </div>
        </div>
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
