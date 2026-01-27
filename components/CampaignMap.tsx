
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { ArrowLeft, Check, Lock, Play, MapPin, ShieldAlert } from 'lucide-react';
import HexButton from './HexButton.tsx';
import { audioService } from '../services/audioService.ts';

const CampaignMap: React.FC = () => {
  const setUIState = useGameStore(state => state.setUIState);
  const startCampaignLevel = useGameStore(state => state.startCampaignLevel);
  const playUiSound = useGameStore(state => state.playUiSound);
  const campaignProgress = useGameStore(state => state.campaignProgress);

  // Responsive State
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [containerWidth, setContainerWidth] = useState(window.innerWidth);
  const containerRef = useRef<HTMLDivElement>(null);

  // Constants for layout mathematics
  const ITEM_HEIGHT = isMobile ? 140 : 180; // Distance between row centers
  const START_OFFSET = isMobile ? 80 : 100; // Top padding inside scroll view

  useEffect(() => {
    const handleResize = () => {
        setIsMobile(window.innerWidth < 768);
        if (containerRef.current) {
            setContainerWidth(containerRef.current.clientWidth);
        }
    };
    
    window.addEventListener('resize', handleResize);
    // Initial check (timeout ensures ref is mounted)
    setTimeout(handleResize, 0);
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* Dynamic Background Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(56, 189, 248, 0.3) 1px, transparent 0)', backgroundSize: '40px 40px' }} 
      />

      {/* Main Card Container */}
      <div className="w-full h-full md:h-[85vh] md:w-[90vw] max-w-5xl flex flex-col md:bg-slate-900/90 md:border md:border-slate-700/50 md:rounded-3xl md:shadow-2xl overflow-hidden relative box-border">
        
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-slate-700/50 flex items-center justify-between bg-slate-900/80 shrink-0 z-20 shadow-md">
          <div className="flex flex-col">
            <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-400" /> Campaign
            </h2>
            <p className="text-indigo-400/60 text-[10px] md:text-xs font-mono tracking-[0.2em] uppercase pl-1">Sector Operations Map</p>
          </div>
          <button 
            onClick={() => { setUIState('MENU'); playUiSound('CLICK'); }}
            className="group flex items-center gap-2 px-4 py-2 md:px-5 md:py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-slate-500 text-slate-300 hover:text-white transition-all shadow-lg active:scale-95"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> 
            <span className="text-xs font-bold uppercase tracking-wider">Back</span>
          </button>
        </div>

        {/* Scrollable Map Area */}
        <div ref={containerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar bg-slate-950/30">
            
            {/* SVG Layer for Connections */}
            <svg className="absolute inset-0 w-full pointer-events-none z-0" style={{ height: (CAMPAIGN_LEVELS.length * ITEM_HEIGHT) + 200 }}>
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

               {CAMPAIGN_LEVELS.map((_, index) => {
                   if (index === CAMPAIGN_LEVELS.length - 1) return null;
                   
                   const isUnlocked = index < campaignProgress;
                   
                   // Coordinate Logic matches the DOM layout
                   const y1 = START_OFFSET + (index * ITEM_HEIGHT) + (isMobile ? 28 : 36); // Center of Hex roughly
                   const y2 = START_OFFSET + ((index + 1) * ITEM_HEIGHT) + (isMobile ? 28 : 36);

                   let pathD = "";

                   if (isMobile) {
                       // Straight line down center
                       const cx = containerWidth / 2;
                       pathD = `M ${cx} ${y1} L ${cx} ${y2}`;
                   } else {
                       // Snake Layout Logic
                       const isEven = index % 2 === 0;
                       // These percentages must align with the flexbox layout below
                       // Left Side: 25% padding -> center is approx 25% + (HexWidth/2)
                       // Right Side: 25% padding -> center is approx 75% - (HexWidth/2)
                       // We simplify to 30% and 70% of container width
                       const x1 = isEven ? containerWidth * 0.3 : containerWidth * 0.7;
                       const x2 = !isEven ? containerWidth * 0.3 : containerWidth * 0.7;
                       
                       const cpY1 = y1 + (ITEM_HEIGHT * 0.5);
                       const cpY2 = y2 - (ITEM_HEIGHT * 0.5);
                       
                       pathD = `M ${x1} ${y1} C ${x1} ${cpY1}, ${x2} ${cpY2}, ${x2} ${y2}`;
                   }

                   return (
                       <path 
                         key={`path-${index}`}
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
            <div className="relative z-10 w-full pb-24" style={{ paddingTop: START_OFFSET - (isMobile ? 28 : 36) }}>
                {CAMPAIGN_LEVELS.map((level, index) => {
                    const isUnlocked = index <= campaignProgress;
                    const isCompleted = index < campaignProgress;
                    const isCurrent = index === campaignProgress;
                    
                    // Layout Classes
                    // Mobile: Always centered
                    // Desktop: Alternating Left (30%) / Right (70%)
                    const rowStyle = isMobile 
                        ? { justifyContent: 'center' }
                        : { 
                            justifyContent: index % 2 === 0 ? 'flex-start' : 'flex-end',
                            paddingLeft: index % 2 === 0 ? '20%' : '0',
                            paddingRight: index % 2 !== 0 ? '20%' : '0'
                          };

                    // Direction of text relative to hex
                    // Mobile: Text below
                    // Desktop: Text to the side (Away from center)
                    const contentDir = isMobile 
                        ? 'flex-col' 
                        : (index % 2 === 0 ? 'flex-row' : 'flex-row-reverse text-right');

                    return (
                        <div 
                            key={level.id} 
                            className="flex w-full px-4 mb-[20px]" // mb helps spacing, but ITEM_HEIGHT handles main vertical rhythm
                            style={{ 
                                height: ITEM_HEIGHT, 
                                ...rowStyle 
                            }}
                        >
                            <div className={`
                                flex items-center gap-4 md:gap-8 transition-all duration-500 group
                                ${contentDir}
                                ${isUnlocked ? 'opacity-100 translate-y-0' : 'opacity-40 grayscale translate-y-2'}
                            `}>
                                
                                {/* HEX BUTTON WRAPPER */}
                                <div className="relative shrink-0">
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
                                                startCampaignLevel(level.id);
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
                                        {isCurrent ? 'Current' : (isCompleted ? 'Done' : 'Locked')}
                                    </div>
                                </div>

                                {/* INFO CARD */}
                                <div className={`
                                    flex flex-col bg-slate-900/80 backdrop-blur-md border border-slate-700/50 p-3 md:p-4 rounded-xl shadow-xl max-w-[200px] md:max-w-xs transition-all duration-300
                                    ${isCurrent ? 'border-amber-500/30 shadow-amber-900/20' : 'hover:border-slate-500'}
                                `}>
                                    <span className={`text-[9px] font-bold uppercase tracking-widest mb-1 ${isUnlocked ? 'text-indigo-400' : 'text-slate-600'}`}>
                                        Mission {level.id}
                                    </span>
                                    <h3 className={`text-sm md:text-lg font-black uppercase leading-tight mb-2 ${isUnlocked ? 'text-white' : 'text-slate-500'}`}>
                                        {level.title.replace(/Simulation\s[\d.]+\:\s/, '')}
                                    </h3>
                                    
                                    {isUnlocked ? (
                                        <div className="flex flex-col gap-1">
                                            <p className="text-[10px] text-slate-400 font-mono line-clamp-2 leading-relaxed">
                                                {level.description.split('\n')[0]}
                                            </p>
                                            {level.aiMode !== 'none' && (
                                                <div className="flex items-center gap-1 text-[9px] text-red-400 mt-1 font-bold">
                                                    <ShieldAlert className="w-3 h-3" /> Hostiles Detected
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <div className="h-1 flex-1 bg-slate-800 rounded overflow-hidden">
                                                <div className="h-full bg-slate-700 w-1/2 animate-pulse"></div>
                                            </div>
                                            <span className="text-[9px] font-mono">ENCRYPTED</span>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
        
        {/* Footer Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none z-20" />
      </div>
    </div>
  );
};

export default CampaignMap;
