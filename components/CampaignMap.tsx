
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGameStore } from '../store.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { ArrowLeft, Check, Lock, Play, MapPin, ShieldAlert, Crosshair, Globe, Radar, Layers } from 'lucide-react';
import HexButton from './HexButton.tsx';
import { audioService } from '../services/audioService.ts';
import { TEXT } from '../services/i18n.ts';

// --- DECORATIVE BACKGROUND COMPONENT ---
const CampaignBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
            {/* 1. Solid Base */}
            <div className="absolute inset-0 bg-slate-950" />

            {/* 2. Radial Glow (Valid Tailwind Class) */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/30 via-slate-950/80 to-slate-950" />

            {/* 3. Holographic Grid (CSS Perspective) */}
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
                {/* Outer Ring */}
                <div className="absolute inset-0 border border-indigo-500/40 rounded-full animate-[spin_60s_linear_infinite]" />
                
                {/* Middle Dashed Ring */}
                <div className="absolute inset-4 md:inset-20 border border-dashed border-cyan-500/30 rounded-full animate-[spin_40s_linear_infinite_reverse]" />
                
                {/* Inner Hex (SVG) */}
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

            {/* 6. Floating Particles */}
            <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-indigo-400 rounded-full animate-ping opacity-40" style={{ animationDuration: '4s' }} />
            <div className="absolute bottom-1/3 right-1/4 w-1 h-1 bg-cyan-400 rounded-full animate-ping opacity-60" style={{ animationDuration: '3s' }} />

            {/* 7. Corner HUD Elements */}
            <div className="absolute top-0 left-0 p-4 opacity-50 hidden md:block">
                <div className="flex items-center gap-2 text-indigo-400">
                    <Crosshair className="w-6 h-6" />
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono leading-none">SYS.NAV.ONLINE</span>
                        <span className="text-[8px] font-mono leading-none opacity-70">COORD: {Math.floor(Date.now()/1000)}</span>
                    </div>
                </div>
            </div>
            
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
  const setUIState = useGameStore(state => state.setUIState);
  const startCampaignLevel = useGameStore(state => state.startCampaignLevel);
  const playUiSound = useGameStore(state => state.playUiSound);
  const campaignProgress = useGameStore(state => state.campaignProgress);
  const deviceType = useGameStore(state => state.deviceType);
  const language = useGameStore(state => state.language);

  // Responsive State using Global Device Type
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
    // Initial check (timeout ensures ref is mounted)
    setTimeout(handleResize, 0);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Scroll to current level on mount
  useEffect(() => {
    if (currentLevelRef.current) {
        setTimeout(() => {
            currentLevelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
    }
  }, [campaignProgress]);

  // --- LAYOUT CALCULATION ---
  const layoutData = useMemo(() => {
    const ITEM_HEIGHT = isMobile ? 140 : 220;
    const START_OFFSET = 120;
    const positions: Array<{
        x: number;
        y: number;
        hasHeader: boolean;
        seriesId: string;
        level: typeof CAMPAIGN_LEVELS[0];
        index: number;
    }> = [];
    
    let currentY = START_OFFSET;
    let lastSeries = '';

    CAMPAIGN_LEVELS.forEach((level, index) => {
        const series = level.id.split('.')[0];
        let hasHeader = false;

        // Add extra space for series header
        if (series !== lastSeries) {
            if (index > 0) currentY += (isMobile ? 60 : 80);
            hasHeader = true;
            lastSeries = series;
        }

        // Calculate X position
        // Mobile: Fixed left offset for timeline view
        // Desktop: Zig-Zag (Left 35% / Right 65%)
        const isLeft = index % 2 === 0;
        const x = isMobile 
            ? 60 
            : (isLeft ? containerWidth * 0.35 : containerWidth * 0.65);

        positions.push({
            x,
            y: currentY,
            hasHeader,
            seriesId: series,
            level,
            index
        });

        currentY += ITEM_HEIGHT;
    });

    return { positions, totalHeight: currentY + (isMobile ? 100 : 200) };
  }, [containerWidth, isMobile]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-300">
      
      {/* Background Layer (Z-0) */}
      <CampaignBackground />

      {/* Main Card Container (Z-10) */}
      <div className="relative z-10 w-full h-full md:h-[85vh] md:w-[90vw] max-w-5xl flex flex-col md:bg-slate-900/40 md:backdrop-blur-xl md:border md:border-slate-700/50 md:rounded-3xl md:shadow-2xl overflow-hidden box-border">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/60 shrink-0 z-20 shadow-md backdrop-blur-md">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" /> {t.HEADER_TITLE}
            </h2>
            <p className="text-indigo-400/60 text-[10px] md:text-xs font-mono tracking-[0.2em] uppercase pl-1">{t.HEADER_SUBTITLE}</p>
          </div>
        </div>

        {/* Scrollable Map Area */}
        <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar">
            
            {/* SVG Layer for Connections */}
            <svg className="absolute inset-0 w-full pointer-events-none z-0" style={{ height: layoutData.totalHeight }}>
               <defs>
                 <linearGradient id="pathGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                   <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                   <stop offset="100%" stopColor="#10b981" stopOpacity="0.6" />
                 </linearGradient>
                 <filter id="glow">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                 </filter>
               </defs>

               {layoutData.positions.map((pos, i) => {
                   if (i === layoutData.positions.length - 1) return null;
                   
                   const nextPos = layoutData.positions[i + 1];
                   
                   // Determine if path is unlocked (if current level is unlocked)
                   // Logic: Path is unlocked if the NEXT level is unlocked or if current is completed
                   const isUnlocked = true; // i < campaignProgress;

                   // Bezier Curve Logic
                   const cpY1 = pos.y + (nextPos.y - pos.y) * 0.5;
                   const cpY2 = nextPos.y - (nextPos.y - pos.y) * 0.5;
                   
                   const pathD = `M ${pos.x} ${pos.y} C ${pos.x} ${cpY1}, ${nextPos.x} ${cpY2}, ${nextPos.x} ${nextPos.y}`;

                   return (
                       <path 
                         key={`path-${i}`}
                         d={pathD}
                         fill="none"
                         stroke={isUnlocked ? 'url(#pathGradient)' : '#1e293b'}
                         strokeWidth={isMobile ? "2" : "3"}
                         strokeDasharray={isUnlocked ? "0" : "6 6"}
                         className="transition-all duration-1000"
                         style={{ filter: isUnlocked ? 'url(#glow)' : 'none' }}
                       />
                   );
               })}
            </svg>

            {/* Level Nodes Layer */}
            <div className="relative z-10 w-full" style={{ height: layoutData.totalHeight }}>
                {layoutData.positions.map((pos, i) => {
                    const isUnlocked = true; // i <= campaignProgress; // Current level is unlocked
                    const isCompleted = i < campaignProgress;
                    const isCurrent = i === campaignProgress;
                    
                    // Lookup translation
                    const levelKey = pos.level.id.replace('.', '_');
                    const titleKey = `LEVEL_${levelKey}_TITLE` as keyof typeof TEXT.EN.CAMPAIGN;
                    const descKey = `LEVEL_${levelKey}_DESC` as keyof typeof TEXT.EN.CAMPAIGN;
                    
                    const displayTitle = TEXT[language].CAMPAIGN[titleKey] || pos.level.title;
                    const displayDesc = TEXT[language].CAMPAIGN[descKey] || pos.level.description;

                    const isLeft = i % 2 === 0;
                    // On mobile, always center column. On desktop, alternate.
                    // If left aligned (35%), text should be on RIGHT.
                    // If right aligned (65%), text should be on LEFT.
                    const textOnRight = isLeft; 

                    return (
                        <React.Fragment key={pos.level.id}>
                            {/* Series Header */}
                            {pos.hasHeader && (
                                <div 
                                    className="absolute left-0 right-0 flex items-center justify-center pointer-events-none"
                                    style={{ top: pos.y - (isMobile ? 100 : 120) }}
                                >
                                    <div className="flex items-center gap-4 px-6 py-2 bg-slate-900/80 backdrop-blur-md border border-indigo-500/30 rounded-full shadow-2xl shadow-indigo-500/10">
                                        <Layers className="w-4 h-4 text-indigo-400" />
                                        <span className="text-sm font-black uppercase tracking-[0.3em] text-indigo-200">
                                            Series {pos.seriesId}
                                        </span>
                                        <div className="h-px w-12 bg-indigo-500/50" />
                                    </div>
                                </div>
                            )}

                            {/* Level Node */}
                            <div 
                                ref={isCurrent ? currentLevelRef : null}
                                className="absolute flex items-center justify-center transition-all duration-500"
                                style={{ 
                                    left: pos.x, 
                                    top: pos.y,
                                    transform: 'translate(-50%, -50%)',
                                }}
                            >
                                <div className={`
                                    relative flex items-center justify-center group
                                    ${isUnlocked ? 'opacity-100' : 'opacity-40 grayscale'}
                                `}>
                                    
                                    {/* HEX BUTTON WRAPPER */}
                                    <div className="relative shrink-0 z-20">
                                        {/* Pulse Effect for Current */}
                                        {isCurrent && (
                                            <div className="absolute inset-0 bg-amber-500/30 rounded-full blur-xl animate-pulse" />
                                        )}
                                        
                                        <HexButton 
                                            size={isMobile ? 'md' : 'lg'} 
                                            variant={isCompleted ? 'emerald' : (isCurrent ? 'amber' : 'slate')} 
                                            active={isCurrent}
                                            pulsate={isCurrent}
                                            onClick={() => {
                                                if (isUnlocked) {
                                                    startCampaignLevel(pos.level.id);
                                                    playUiSound('CLICK');
                                                } else {
                                                    playUiSound('ERROR');
                                                }
                                            }}
                                            disabled={!isUnlocked}
                                            className="relative z-10 hover:scale-110 transition-transform duration-300"
                                        >
                                            {isCompleted ? <Check className="w-6 h-6 md:w-8 md:h-8" /> : (isUnlocked ? <Play className="w-6 h-6 md:w-8 md:h-8 fill-current ml-1" /> : <Lock className="w-5 h-5 md:w-6 md:h-6 opacity-50" />)}
                                        </HexButton>

                                        {/* Level Badge */}
                                        <div className={`
                                            absolute -top-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border shadow-lg z-20 whitespace-nowrap
                                            ${isCurrent ? 'bg-amber-500 text-slate-900 border-amber-400 animate-bounce' : 'bg-slate-800 text-slate-400 border-slate-600'}
                                        `}>
                                            {isCurrent ? t.BADGE_CURRENT : (isCompleted ? t.BADGE_DONE : t.BADGE_LOCKED)}
                                        </div>
                                    </div>

                                    {/* INFO CARD */}
                                    <div className={`
                                        absolute flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-3 md:p-4 rounded-xl shadow-xl w-[calc(100vw-120px)] md:w-[280px] max-w-[280px] transition-all duration-300 z-10
                                        ${isCurrent ? 'border-amber-500/30 shadow-amber-900/20' : 'hover:border-slate-500'}
                                        ${isMobile 
                                            ? 'left-full ml-4 text-left items-start' 
                                            : (textOnRight 
                                                ? 'left-full ml-8 text-left items-start' 
                                                : 'right-full mr-8 text-right items-end')}
                                    `}>
                                        <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isUnlocked ? 'text-indigo-400' : 'text-slate-600'}`}>
                                            {t.MISSION_PREFIX} {pos.level.id}
                                        </span>
                                        <h3 className={`text-sm md:text-lg font-black uppercase leading-tight mb-2 ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                                            {displayTitle.replace(/Simulation\s[\d.]+:\s|Сим\s[\d.]+:\s/, '')}
                                        </h3>
                                        
                                        {isUnlocked ? (
                                            <div className={`flex flex-col gap-1 ${isMobile ? 'items-start' : (textOnRight ? 'items-start' : 'items-end')}`}>
                                                <p className="text-[10px] text-slate-400 font-mono line-clamp-2 leading-relaxed">
                                                    {displayDesc.split('\n')[0]}
                                                </p>
                                                {pos.level.aiMode !== 'none' && (
                                                    <div className="flex items-center gap-1 text-[9px] text-red-400 mt-1 font-bold">
                                                        <ShieldAlert className="w-3 h-3" /> {t.HOSTILES}
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2 text-slate-600 w-full">
                                                <div className="h-1 flex-1 bg-slate-800 rounded overflow-hidden">
                                                    <div className="h-full bg-slate-700 w-1/2 animate-pulse"></div>
                                                </div>
                                                <span className="text-[9px] font-mono">{t.ENCRYPTED}</span>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

        </div>
        
        {/* Footer Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-900 to-transparent pointer-events-none z-20" />
      </div>
    </div>
  );
};

export default CampaignMap;
