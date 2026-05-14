
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { Check, Lock, Play, MapPin, ShieldAlert, Crosshair, Layers } from 'lucide-react';
import HexButton from './HexButton.tsx';
import { TEXT } from '../services/i18n.ts';

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

  const currentProgress = campaignMode === 'STORY' ? campaignProgress : levelsModeProgress;

  // Responsive State
  const isMobile = deviceType === 'MOBILE';
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
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
    <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar">
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
                   <path key={`path-${i}`} d={pathD} fill="none" stroke={isPathUnlocked ? 'url(#pathGradient)' : '#1e293b'} strokeWidth={isMobile ? "2" : "3"} strokeDasharray={isPathUnlocked ? "0" : "6 6"} style={{ filter: isPathUnlocked ? 'url(#glow)' : 'none' }} />
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
                    <React.Fragment key={pos.level.id}>
                        {pos.hasHeader && (
                            <div className="absolute left-0 right-0 flex items-center justify-center pointer-events-none" style={{ top: pos.y - (isMobile ? 100 : 120) }}>
                                <div className="flex items-center gap-4 px-6 py-2 bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 rounded-full shadow-2xl">
                                    <Layers className="w-4 h-4 text-indigo-400" />
                                    <span className="text-sm font-black uppercase tracking-[0.3em] text-indigo-200">Series {pos.seriesId}</span>
                                </div>
                            </div>
                        )}
                        <div ref={isCurrent ? currentLevelRef : null} className="absolute flex items-center justify-center transform -translate-x-1/2 -translate-y-1/2" style={{ left: pos.x, top: pos.y }}>
                            <div className={`relative flex items-center justify-center group ${isUnlocked ? 'opacity-100' : 'opacity-40 grayscale'}`}>
                                <div className="relative z-20">
                                    {isCurrent && <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-xl animate-pulse" />}
                                    <HexButton size={isMobile ? 'md' : 'lg'} variant={isCompleted ? 'emerald' : (isCurrent ? 'amber' : 'slate')} active={isCurrent} pulsate={isCurrent}
                                        onClick={() => isUnlocked ? startCampaignLevel(pos.level.id) : playUiSound('ERROR')} disabled={!isUnlocked}>
                                        {isCompleted ? <Check className="w-6 h-6 md:w-8 md:h-8" /> : (isUnlocked ? <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" /> : <Lock className="w-5 h-5 md:w-6 md:h-6 opacity-50" />)}
                                    </HexButton>
                                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shadow-lg ${isCurrent ? 'bg-amber-500 text-slate-900 border-amber-400 animate-bounce' : 'bg-slate-800 text-slate-400 border-slate-600'}`}>
                                        {isCurrent ? t.BADGE_CURRENT : (isCompleted ? t.BADGE_DONE : t.BADGE_LOCKED)}
                                    </div>
                                </div>
                                <div className={`absolute flex flex-col bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-4 rounded-2xl shadow-2xl w-[260px] transition-all z-10 ${isMobile ? 'left-full ml-4 text-left' : (i % 2 === 0 ? 'left-full ml-8 text-left' : 'right-full mr-8 text-right items-end')}`}>
                                    <span className="text-[9px] font-bold uppercase tracking-[0.2em] mb-1 text-indigo-400">{t.MISSION_PREFIX} {pos.level.id}</span>
                                    <h3 className="text-sm md:text-lg font-black uppercase leading-tight mb-2 text-white">{displayTitle}</h3>
                                    {isUnlocked && <p className="text-[10px] text-slate-400 font-mono line-clamp-2 leading-relaxed italic opacity-80">{displayDesc}</p>}
                                </div>
                            </div>
                        </div>
                    </React.Fragment>
                );
            })}
        </div>
    </div>
  );

  const renderLevelGrid = () => (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-slate-950/40">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto pb-12 animate-in slide-in-from-bottom-4 duration-500">
            {levelsToDisplay.map((level, i) => {
                const isUnlocked = i <= levelsModeProgress;
                const isCompleted = i < levelsModeProgress;
                const isCurrent = i === levelsModeProgress;
                const displayTitle = ((TEXT[language].CAMPAIGN as any)[`LEVEL_${level.id.replace('.','_')}_TITLE`] || level.title).replace(/Simulation\s[\d.]+:\s|Сим\s[\d.]+:\s/, '');
                const threat = level.aiMode === 'none' ? 'NONE' : (level.aiMode === 'basic' ? 'BASIC' : 'HIGH');
                const threatColor = threat === 'NONE' ? 'text-emerald-400' : (threat === 'BASIC' ? 'text-amber-400' : 'text-red-500');

                return (
                    <button key={level.id} disabled={!isUnlocked} onClick={() => isUnlocked ? startCampaignLevel(level.id) : playUiSound('ERROR')}
                        className={`group relative flex flex-col border transition-all duration-300 rounded-2xl overflow-hidden text-left h-fit min-h-[220px]
                            ${isUnlocked ? 'bg-slate-900/60 border-slate-700/50 hover:border-indigo-500/50 hover:bg-slate-800/80 shadow-lg' : 'bg-slate-950/40 border-slate-800/50 grayscale opacity-60 cursor-not-allowed'}
                            ${isCurrent ? 'ring-2 ring-indigo-500/50 border-indigo-500/40 shadow-indigo-500/10' : ''}`}>
                        
                        <div className={`flex items-center justify-between px-4 py-2.5 border-b border-slate-700/30 ${isCompleted ? 'bg-emerald-500/10' : (isCurrent ? 'bg-indigo-500/10' : 'bg-slate-800/30')}`}>
                            <span className={`text-[10px] font-black font-mono px-2 py-0.5 rounded shadow-sm ${isCompleted ? 'bg-emerald-500 text-white' : (isCurrent ? 'bg-indigo-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400')}`}>
                                {isCompleted ? t.LVL_STATUS_COMPLETED : (isCurrent ? t.LVL_STATUS_READY : t.LVL_STATUS_LOCKED)}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{t.LVL_GRID_COORDINATES}: {level.id}</span>
                        </div>

                        <div className="p-5 flex-1 flex flex-col gap-4">
                            <div>
                                <h3 className={`text-lg md:text-xl font-black uppercase tracking-tight leading-none mb-2 mb-2 group-hover:text-indigo-300 transition-colors ${isUnlocked ? 'text-white' : 'text-slate-600'}`}>{displayTitle}</h3>
                                <div className="h-0.5 w-10 bg-indigo-500/40 rounded-full group-hover:w-full transition-all duration-700" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-2.5 flex flex-col">
                                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.LVL_THREAT_LEVEL}</span>
                                    <div className={`flex items-center gap-1.5 text-[10px] font-black ${threatColor}`}><ShieldAlert className="w-3 h-3" />{(t as any)[`LVL_THREAT_${threat}`]}</div>
                                </div>
                                <div className="bg-slate-950/60 border border-slate-800/40 rounded-xl p-2.5 flex flex-col">
                                    <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest mb-1">{t.LVL_START_RESOURCES}</span>
                                    <div className="flex items-center gap-3 text-[10px] font-mono text-indigo-300">
                                        <div className="flex items-center gap-1.5 text-indigo-400"><div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />{level.startState.moves}</div>
                                        <div className="flex items-center gap-1.5 text-emerald-400"><div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />{level.startState.credits}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-1">
                                <span className="text-[7px] font-black text-slate-500 uppercase flex items-center gap-1.5 mb-1.5"><Crosshair className="w-2.5 h-2.5" />{t.LVL_GOAL}</span>
                                <div className="bg-slate-950/50 rounded-xl p-3 border-l-2 border-indigo-500/50 min-h-[60px] flex items-center">
                                    <p className="text-[10px] font-mono text-slate-400 leading-relaxed italic line-clamp-3 select-none">
                                        {level.goalText || ((TEXT[language].CAMPAIGN as any)[`LEVEL_${level.id.replace('.','_')}_DESC`] || '').split('\n\n')[0]}
                                    </p>
                                </div>
                            </div>
                        </div>
                        {isUnlocked && !isCompleted && (
                            <div className="px-5 py-4 bg-indigo-500/10 border-t border-indigo-500/20 flex items-center justify-between group-hover:bg-indigo-500/20 transition-all">
                                <span className="text-[11px] font-black text-indigo-300 tracking-[0.2em]">ENGAGE PROTOCOL</span>
                                <Play className="w-4 h-4 text-indigo-400 fill-current" />
                            </div>
                        )}
                        {isCompleted && (
                            <div className="px-5 py-4 bg-emerald-500/5 border-t border-emerald-500/20 flex items-center justify-between">
                                <span className="text-[11px] font-black text-emerald-400 tracking-[0.2em]">MISSION SECURED</span>
                                <Check className="w-4 h-4 text-emerald-400" />
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-300">
      <CampaignBackground />
      <div className="relative z-10 w-full h-full md:h-[92vh] md:w-[94vw] max-w-7xl flex flex-col md:bg-slate-900/60 md:backdrop-blur-2xl md:border md:border-slate-700/50 md:rounded-[2.5rem] md:shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden box-border">
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-slate-900/40 shrink-0 z-20 backdrop-blur-xl">
          <div className="flex items-center gap-4">
             <div className={`p-3 rounded-2xl shadow-inner ${campaignMode === 'STORY' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-purple-500/20 text-purple-400'}`}>
               {campaignMode === 'STORY' ? <MapPin className="w-6 h-6" /> : <Layers className="w-6 h-6" />}
             </div>
             <div>
               <h2 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tighter italic leading-none mb-1">
                 {campaignMode === 'STORY' ? TEXT[language].MENU.MODE_STORY : TEXT[language].MENU.MODE_LEVELS}
               </h2>
               <p className="text-white/30 text-[10px] font-mono tracking-[0.4em] uppercase pl-1">{t.HEADER_SUBTITLE}</p>
             </div>
          </div>

          {campaignMode === 'LEVELS' && !isMobile && (
              <div className="flex items-center gap-10 border-l border-white/5 pl-10 ml-auto mr-10 group">
                  <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{TEXT[language].HUD.MISSION_COMPLETE}</span>
                      <span className="text-3xl font-black text-white font-mono leading-none group-hover:text-indigo-400 transition-colors">
                          {levelsModeProgress} <span className="text-slate-600 text-base">/ {levelsToDisplay.length}</span>
                      </span>
                  </div>
                  <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">AUTH CLEARANCE</span>
                      <div className="flex gap-1.5">
                          {[...Array(levelsModeProgress > 10 ? 10 : 8)].map((_, idx) => (
                              <div key={idx} className={`h-2 w-5 rounded-full shadow-inner transition-all duration-1000 ${levelsModeProgress >= (idx * 4) ? 'bg-indigo-500 shadow-indigo-500/50' : 'bg-slate-800'}`} />
                          ))}
                      </div>
                  </div>
              </div>
          )}

          <button onClick={() => { useGameStore.getState().setUIState('MENU'); playUiSound('CLICK'); }}
             className="group relative px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all text-xs font-black uppercase tracking-widest overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
             <span className="relative z-10">{TEXT[language].HUD.BTN_MENU}</span>
          </button>
        </div>
        {campaignMode === 'STORY' ? renderStoryTimeline() : renderLevelGrid()}
        <div className="absolute top-0 right-0 p-2 opacity-5 pointer-events-none select-none text-[80px] font-black italic tracking-tighter text-white overflow-hidden whitespace-nowrap">MISSION CONTROL DATA TERMINAL</div>
      </div>
    </div>
  );
};

export default CampaignMap;
