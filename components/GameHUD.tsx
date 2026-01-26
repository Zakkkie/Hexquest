
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { getHexKey, getNeighbors, getSecondsToGrow, cubeDistance } from '../services/hexUtils.ts';
import { checkGrowthCondition } from '../rules/growth.ts';
import { EntityState, Hex } from '../types.ts';
import HexButton from './HexButton.tsx';
import { TEXT } from '../services/i18n.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { 
  Pause, Trophy, Footprints, LogOut,
  Crown, TrendingUp, ChevronUp, MapPin,
  RotateCcw, RotateCw, ChevronsUp, Volume2, VolumeX, XCircle, RefreshCw, ArrowRight, Target, Skull, Wallet, Music, Shield, Info, ChevronDown, AlertTriangle, Hexagon as HexIcon, RefreshCcw
} from 'lucide-react';

// FIREWORKS COMPONENT
const FireworksOverlay: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let particles: {x: number, y: number, vx: number, vy: number, alpha: number, color: string, size: number}[] = [];
        let animationFrameId: number;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const colors = ['#fbbf24', '#f59e0b', '#ef4444', '#ec4899', '#8b5cf6', '#3b82f6', '#10b981'];

        const spawnExplosion = () => {
            const cx = Math.random() * canvas.width;
            const cy = Math.random() * (canvas.height * 0.5); // Top 50%
            const color = colors[Math.floor(Math.random() * colors.length)];
            const particleCount = 40 + Math.random() * 40;

            for(let i=0; i<particleCount; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2 + Math.random() * 4;
                particles.push({
                    x: cx,
                    y: cy,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    alpha: 1,
                    color: color,
                    size: 1 + Math.random() * 3
                });
            }
        };

        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (Math.random() < 0.05) spawnExplosion();
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05; 
                p.vx *= 0.98; 
                p.vy *= 0.98;
                p.alpha -= 0.01;

                if (p.alpha <= 0) {
                    particles.splice(i, 1);
                    continue;
                }

                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
            ctx.globalAlpha = 1;
            animationFrameId = requestAnimationFrame(loop);
        };

        loop();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
};

interface GameHUDProps {
  hoveredHexId: string | null;
  onRotateCamera: (direction: 'left' | 'right') => void;
  onCenterPlayer: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ hoveredHexId, onRotateCamera, onCenterPlayer }) => {
  const grid = useGameStore(state => state.session?.grid);
  const player = useGameStore(state => state.session?.player);
  const bots = useGameStore(state => state.session?.bots);
  const winCondition = useGameStore(state => state.session?.winCondition);
  const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
  const gameStatus = useGameStore(state => state.session?.gameStatus);
  const isPlayerGrowing = useGameStore(state => state.session?.isPlayerGrowing);
  const playerGrowthIntent = useGameStore(state => state.session?.playerGrowthIntent);
  const sessionStartTime = useGameStore(state => state.session?.sessionStartTime);
  const language = useGameStore(state => state.language);
  const user = useGameStore(state => state.user);
  
  const isMusicMuted = useGameStore(state => state.isMusicMuted);
  const isSfxMuted = useGameStore(state => state.isSfxMuted);
  
  const setUIState = useGameStore(state => state.setUIState);
  const abandonSession = useGameStore(state => state.abandonSession);
  const togglePlayerGrowth = useGameStore(state => state.togglePlayerGrowth);
  const toggleMusic = useGameStore(state => state.toggleMusic);
  const toggleSfx = useGameStore(state => state.toggleSfx);
  const playUiSound = useGameStore(state => state.playUiSound);
  const startCampaignLevel = useGameStore(state => state.startCampaignLevel);

  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<'RANK' | 'CYCLE' | 'COINS' | 'MOVES' | null>(null);
  
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const soundMenuRef = useRef<HTMLDivElement>(null);

  // Level 1.2 State: Show Intro Briefing (Blocking)
  const [showLevelBriefing, setShowLevelBriefing] = useState(false);

  // New state for collapsible mission HUD
  const [isMissionExpanded, setIsMissionExpanded] = useState(false);

  const t = TEXT[language].HUD;
  
  const queueSize = winCondition?.queueSize || 3;
  const currentHex = (grid && player) ? grid[getHexKey(player.q, player.r)] : undefined;
  const neighbors = player ? getNeighbors(player.q, player.r) : [];
  const safeBots = useMemo(() => (bots || []).filter(b => b && typeof b.q === 'number' && typeof b.r === 'number'), [bots]);
  const botPositions = useMemo(() => safeBots.map(b => ({ q: b.q, r: b.r })), [safeBots]);
  const isMoving = player?.state === EntityState.MOVING;
  const canRecover = player ? !player.recoveredCurrentHex : false;

  // Level Tutorial Flags
  const isLevel1_1 = activeLevelConfig?.id === '1.1';
  const isLevel1_2 = activeLevelConfig?.id === '1.2';

  // Level 1.1 Progress
  const ownedCount = useMemo(() => {
    if (!grid || !player) return 0;
    return Object.values(grid).filter((h: Hex) => h.ownerId === player.id).length;
  }, [grid, player]);

  // Level 1.2 Progress (Distance to Goal)
  const distanceToGoal = useMemo(() => {
      if (!player) return 99;
      // Goal is at 0, -8
      return cubeDistance({ q: player.q, r: player.r }, { q: 0, r: -8 });
  }, [player]);

  // Determine Next Level
  const nextLevelId = useMemo(() => {
      if (!activeLevelConfig) return null;
      const idx = CAMPAIGN_LEVELS.findIndex(l => l.id === activeLevelConfig.id);
      if (idx !== -1 && idx < CAMPAIGN_LEVELS.length - 1) {
          return CAMPAIGN_LEVELS[idx + 1].id;
      }
      return null;
  }, [activeLevelConfig]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (soundMenuRef.current && !soundMenuRef.current.contains(event.target as Node)) {
              setShowSoundMenu(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // TRIGGER LEVEL 1.2 BRIEFING
  useEffect(() => {
      if (isLevel1_2 && gameStatus === 'PLAYING') {
          setShowLevelBriefing(true);
      }
  }, [isLevel1_2, gameStatus]);

  const upgradeCondition = useMemo(() => {
    if (!currentHex || !player || !grid) return { canGrow: false, reason: 'Invalid Hex' };
    const simulatedHex = { ...currentHex, currentLevel: Math.max(0, currentHex.maxLevel) };
    return checkGrowthCondition(simulatedHex, player, neighbors, grid, botPositions, queueSize);
  }, [currentHex, player, grid, neighbors, botPositions, queueSize]);

  const canUpgrade = upgradeCondition.canGrow;

  // Determine if we are claiming a new sector (Level 0 -> 1)
  const isClaiming = canUpgrade && currentHex && currentHex.maxLevel === 0;

  const timeData = useMemo(() => {
    if (!currentHex) return { totalNeeded: 1, totalDone: 0, percent: 0, mode: 'IDLE' };
    const isRecovering = playerGrowthIntent === 'RECOVER';
    let totalNeeded = 0;
    let mode = 'IDLE';

    if (isRecovering) {
        totalNeeded = getSecondsToGrow(currentHex.maxLevel);
        mode = 'RECOVERY';
    } else {
        const calculationTarget = currentHex.maxLevel + 1;
        for (let l = currentHex.currentLevel + 1; l <= calculationTarget; l++) {
            totalNeeded += getSecondsToGrow(l);
        }
        mode = 'UPGRADE';
    }

    const currentStepProgress = currentHex.progress;
    const currentStepNeeded = isRecovering 
        ? getSecondsToGrow(currentHex.maxLevel) 
        : getSecondsToGrow(currentHex.currentLevel + 1);

    const percent = currentStepNeeded > 0 ? (currentStepProgress / currentStepNeeded) * 100 : 0;
    const remainingTicks = Math.max(0, currentStepNeeded - currentStepProgress);
    const remainingSeconds = remainingTicks * 0.1;

    return { totalNeeded, remainingSeconds, percent, mode };
  }, [currentHex, isPlayerGrowing, canUpgrade, playerGrowthIntent]);

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.ceil(seconds);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}m ${sec}s`;
  };

  const winner = useMemo(() => {
      if (gameStatus === 'VICTORY') return player;
      if (gameStatus === 'DEFEAT' && winCondition && safeBots) {
          const w = safeBots.find(b => {
              const reachedLevel = b.playerLevel >= winCondition.targetLevel;
              const reachedCoins = b.totalCoinsEarned >= winCondition.targetCoins;
              if (winCondition.winType === 'AND') return reachedLevel && reachedCoins;
              return reachedLevel || reachedCoins;
          });
          return w || safeBots[0];
      }
      return null;
  }, [gameStatus, player, safeBots, winCondition]);

  if (!grid || !player || !bots) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none">
      
      {/* HEADER */}
      <div className="absolute inset-x-0 top-0 p-2 md:p-4 pointer-events-none z-30 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="w-full flex justify-between items-start gap-2 max-w-7xl mx-auto relative">
               
               {/* STATS BAR: Uses w-fit to clamp width to content (MOVES) */}
               <div className="pointer-events-auto flex items-center bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl px-2 py-2 md:px-6 md:py-3 gap-3 md:gap-8 w-fit transition-all duration-300 hover:border-slate-600/50 overflow-x-auto no-scrollbar mask-linear-fade shrink-0">
                   
                   {/* Rank */}
                   <div onClick={() => { setHelpTopic('RANK'); playUiSound('CLICK'); }} className="relative flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0">
                       <div className="p-1.5 md:p-2 rounded-lg bg-indigo-500/10 group-hover:bg-indigo-500/20 transition-colors">
                           <Crown className="w-4 h-4 md:w-5 md:h-5 text-indigo-400" />
                       </div>
                       <div className="flex flex-col justify-center">
                           <span className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1 group-hover:text-indigo-300 transition-colors">{t.RANK}</span>
                           <div className="flex items-baseline leading-none">
                             <span className="text-sm md:text-xl font-black text-white">{player.playerLevel}</span>
                             <span className="text-[10px] md:text-xs text-slate-600 font-bold ml-px md:ml-1">/{winCondition?.targetLevel || '?'}</span>
                           </div>
                       </div>
                       {isLevel1_1 && (
                           <div className="absolute top-full left-0 mt-2 bg-indigo-900/90 text-indigo-200 text-[9px] px-2 py-1 rounded whitespace-nowrap font-bold shadow-lg animate-pulse border border-indigo-500/30">
                               {t.HINT_RANK}
                           </div>
                       )}
                   </div>

                   <div className="w-px h-6 md:h-10 bg-slate-800 shrink-0"></div>

                   {/* Upgrade Status */}
                   <div onClick={() => { setHelpTopic('CYCLE'); playUiSound('CLICK'); }} className="relative flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0">
                       <div className="p-1.5 md:p-2 rounded-lg bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
                           <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                       </div>
                       <div className="flex flex-col justify-center">
                           <span className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1 group-hover:text-emerald-300 transition-colors">{t.CYCLE}</span>
                           <div className="flex gap-1 md:gap-1.5 h-3 md:h-5 items-center">
                               {Array.from({length: queueSize}).map((_, i) => (
                                  <div key={i} className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full transition-all duration-500 ${player.recentUpgrades.length > i ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] scale-110' : 'bg-slate-800'}`} />
                               ))}
                           </div>
                       </div>
                       {isLevel1_1 && (
                           <div className="absolute top-full left-0 mt-2 bg-emerald-900/90 text-emerald-200 text-[9px] px-2 py-1 rounded whitespace-nowrap font-bold shadow-lg animate-pulse border border-emerald-500/30">
                               {t.HINT_CYCLE}
                           </div>
                       )}
                   </div>

                   <div className="w-px h-6 md:h-10 bg-slate-800 shrink-0"></div>

                   {/* Credits */}
                   <div onClick={() => { setHelpTopic('COINS'); playUiSound('CLICK'); }} className="relative flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0">
                       <div className="p-1.5 md:p-2 rounded-lg bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
                           <Wallet className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />
                       </div>
                       <div className="flex flex-col justify-center">
                           <span className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1 group-hover:text-amber-300 transition-colors">{t.CREDITS}</span>
                           <div className="flex items-baseline leading-none">
                             <span className="text-sm md:text-xl font-black text-white">{player.coins}</span>
                             <span className="hidden md:inline text-xs text-slate-600 font-bold ml-1">/{winCondition?.targetCoins || '?'}</span>
                           </div>
                       </div>
                       {isLevel1_1 && (
                           <div className="absolute top-full left-0 mt-2 bg-amber-900/90 text-amber-200 text-[9px] px-2 py-1 rounded whitespace-nowrap font-bold shadow-lg animate-pulse border border-amber-500/30">
                               {t.HINT_CREDITS}
                           </div>
                       )}
                   </div>

                   <div className="w-px h-6 md:h-10 bg-slate-800 shrink-0"></div>

                   {/* Moves */}
                   <div onClick={() => { setHelpTopic('MOVES'); playUiSound('CLICK'); }} className="relative flex items-center gap-2 md:gap-3 cursor-pointer group shrink-0">
                       <div className={`p-1.5 md:p-2 rounded-lg transition-colors ${isMoving ? 'bg-blue-500/20' : 'bg-blue-500/10 group-hover:bg-blue-500/20'}`}>
                           <Footprints className={`w-4 h-4 md:w-5 md:h-5 ${isMoving ? 'text-blue-300 animate-pulse' : 'text-blue-400'}`} />
                       </div>
                       <div className="flex flex-col justify-center">
                           <span className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1 group-hover:text-blue-300 transition-colors">{t.MOVES}</span>
                           <span className="text-sm md:text-xl font-black text-white leading-none">{player.moves}</span>
                       </div>
                       {isLevel1_1 && (
                           <div className="absolute top-full left-0 mt-2 bg-blue-900/90 text-blue-200 text-[9px] px-2 py-1 rounded whitespace-nowrap font-bold shadow-lg animate-pulse border border-blue-500/30">
                               {t.HINT_MOVES}
                           </div>
                       )}
                   </div>
               </div>

               {/* SYSTEM CONTROLS */}
               <div className="pointer-events-auto flex items-start gap-1 md:gap-2 shrink-0 relative z-50">
                   <div className="relative">
                        <button onClick={() => { setShowSoundMenu(!showSoundMenu); playUiSound('CLICK'); }} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95">
                            <Volume2 className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                        {showSoundMenu && (
                            <div ref={soundMenuRef} className="absolute top-full right-0 md:left-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[140px] z-[60]">
                                <button 
                                    onClick={() => { toggleMusic(); playUiSound('CLICK'); }}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left ${isMusicMuted ? 'text-slate-500 hover:bg-slate-800' : 'text-indigo-400 bg-indigo-900/20 hover:bg-indigo-900/30'}`}
                                >
                                    {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                                    <span className="text-xs font-bold uppercase">Music</span>
                                </button>
                                <button 
                                    onClick={() => { toggleSfx(); playUiSound('CLICK'); }}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left ${isSfxMuted ? 'text-slate-500 hover:bg-slate-800' : 'text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/30'}`}
                                >
                                    {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                    <span className="text-xs font-bold uppercase">SFX</span>
                                </button>
                            </div>
                        )}
                   </div>

                   <div className={`flex flex-col bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top-right absolute right-[48px] md:static md:right-auto ${isRankingsOpen ? 'w-56 md:w-80' : 'w-10 md:w-14 h-10 md:h-14'}`}>
                       <div onClick={() => { setIsRankingsOpen(!isRankingsOpen); playUiSound('CLICK'); }} className="flex items-center justify-center w-full h-10 md:h-14 cursor-pointer hover:bg-white/5 transition-colors">
                           {isRankingsOpen ? <div className="flex items-center justify-between w-full px-3"><div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /><span className="text-[10px] font-bold text-slate-300 uppercase">{t.LEADERBOARD_TITLE}</span></div><ChevronUp className="w-3 h-3 text-slate-500" /></div> : <Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />}
                       </div>
                       {isRankingsOpen && (
                           <div className="flex flex-col p-2 gap-1.5 max-h-[40vh] overflow-y-auto no-scrollbar">
                               {[player, ...safeBots].sort((a, b) => (b.coins || 0) - (a.coins || 0)).map((e) => {
                                   const isP = e.type === 'PLAYER';
                                   const color = isP ? (user?.avatarColor || '#3b82f6') : (e.avatarColor || '#ef4444');
                                   return (
                                       <div key={e.id} className="grid grid-cols-5 items-center p-2 rounded-lg bg-slate-950/50 border border-slate-800/50 gap-1">
                                           <div className="col-span-2 flex items-center gap-2 overflow-hidden"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} /><span className={`text-[10px] font-bold truncate ${isP ? 'text-white' : 'text-slate-400'}`}>{isP ? 'YOU' : e.id.toUpperCase()}</span></div>
                                           <div className="col-span-1 text-center font-mono text-[9px] text-indigo-400">L{e.playerLevel}</div>
                                           <div className="col-span-1 text-right font-mono text-amber-500 font-bold text-[10px]">{e.coins}</div>
                                           <div className="col-span-1 text-right font-mono text-blue-400 font-bold text-[9px] flex items-center justify-end gap-0.5"><Footprints className="w-2 h-2 opacity-70" />{e.moves}</div>
                                       </div>
                                   );
                               })}
                           </div>
                       )}
                   </div>
                   <button onClick={() => { setShowExitConfirmation(true); playUiSound('CLICK'); }} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95">
                      <LogOut className="w-4 h-4 md:w-5 md:h-5" />
                   </button>
               </div>
          </div>
      </div>

      {/* LEVEL 1.1 TUTORIAL DASHBOARD (Optimized Pill Style) */}
      {isLevel1_1 && (
          <div 
            className="absolute top-[80px] md:top-[120px] right-2 md:right-auto md:left-1/2 md:-translate-x-1/2 pointer-events-auto z-20 flex flex-col items-end md:items-center group"
            onMouseEnter={() => setIsMissionExpanded(true)}
            onMouseLeave={() => setIsMissionExpanded(false)}
            onClick={() => setIsMissionExpanded(!isMissionExpanded)}
          >
              <div className={`
                  bg-slate-900/60 backdrop-blur-md border border-indigo-500/30 shadow-2xl transition-all duration-300 ease-out overflow-hidden
                  ${isMissionExpanded ? 'rounded-2xl p-4 w-[240px]' : 'rounded-full px-4 py-2 w-auto'}
              `}>
                  {/* Collapsed View (Pill) */}
                  {!isMissionExpanded && (
                      <div className="flex items-center gap-2 cursor-pointer">
                          <div className={`w-2 h-2 rounded-full ${ownedCount >= 6 ? 'bg-emerald-500' : 'bg-indigo-500 animate-pulse'}`} />
                          <span className="text-xs font-bold text-indigo-100 whitespace-nowrap">Captured: <span className="font-mono text-white">{ownedCount}/6</span></span>
                          <ChevronDown className="w-3 h-3 text-indigo-400" />
                      </div>
                  )}

                  {/* Expanded View */}
                  {isMissionExpanded && (
                      <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                              <div className="flex items-center gap-2">
                                  <Info className="w-4 h-4 text-indigo-400" />
                                  <span className="text-xs font-bold text-white uppercase tracking-wider">{t.TUT_1_1_TASK}</span>
                              </div>
                              <div className="text-xs font-mono font-bold text-white bg-indigo-900/50 px-2 py-0.5 rounded">{ownedCount} / 6</div>
                          </div>
                          
                          <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-300">
                                  <span>{t.TUT_1_1_COST}</span>
                                  <span className="font-mono text-amber-400 font-bold">100 CR</span>
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-slate-300">
                                  <span>{t.TUT_1_1_REWARD}</span>
                                  <span className="font-mono text-emerald-400 font-bold">+5</span>
                              </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-indigo-300 italic text-center">
                              "{t.TUT_1_1_GUIDE}"
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* LEVEL 1.2 DASHBOARD */}
      {isLevel1_2 && !showLevelBriefing && (
          <div 
            className="absolute top-[80px] md:top-[120px] right-2 md:right-auto md:left-1/2 md:-translate-x-1/2 pointer-events-auto z-20 flex flex-col items-end md:items-center group"
            onMouseEnter={() => setIsMissionExpanded(true)}
            onMouseLeave={() => setIsMissionExpanded(false)}
            onClick={() => setIsMissionExpanded(!isMissionExpanded)}
          >
              <div className={`
                  bg-slate-900/60 backdrop-blur-md border border-red-500/30 shadow-2xl transition-all duration-300 ease-out overflow-hidden
                  ${isMissionExpanded ? 'rounded-2xl p-4 w-[240px]' : 'rounded-full px-4 py-2 w-auto'}
              `}>
                  {/* Collapsed View (Pill) */}
                  {!isMissionExpanded && (
                      <div className="flex items-center gap-2 cursor-pointer">
                          <div className={`w-2 h-2 rounded-full ${distanceToGoal <= 0 ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
                          <span className="text-xs font-bold text-red-100 whitespace-nowrap">{t.TUT_1_2_DIST}: <span className="font-mono text-white">{distanceToGoal}</span></span>
                          <ChevronDown className="w-3 h-3 text-red-400" />
                      </div>
                  )}

                  {/* Expanded View */}
                  {isMissionExpanded && (
                      <div className="flex flex-col gap-2 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-1">
                              <div className="flex items-center gap-2">
                                  <Target className="w-4 h-4 text-red-400" />
                                  <span className="text-xs font-bold text-white uppercase tracking-wider">{t.TUT_1_2_TASK}</span>
                              </div>
                          </div>
                          
                          <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[10px] text-slate-300">
                                  <span>{t.TUT_1_2_DIST}</span>
                                  <span className="font-mono text-white font-bold">{distanceToGoal}</span>
                              </div>
                          </div>

                          <div className="mt-2 pt-2 border-t border-white/5 text-[10px] text-red-300 italic text-center">
                              "{t.TUT_1_2_GOAL}"
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {/* LEVEL 1.2: PRE-GAME BRIEFING (Blocking) */}
      {isLevel1_2 && showLevelBriefing && (
          <div className="absolute inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center pointer-events-auto p-6 animate-in fade-in duration-500">
              <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden flex flex-col gap-6">
                  {/* Warning Strip */}
                  <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-pulse"></div>
                  
                  <div className="flex flex-col items-center text-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-red-950 border border-red-500 flex items-center justify-center">
                          <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
                      </div>
                      
                      <div>
                          <h2 className="text-2xl font-black text-white uppercase tracking-wider mb-2">{t.TUT_1_2_INTRO_TITLE}</h2>
                          <p className="text-slate-300 text-sm leading-relaxed">{t.TUT_1_2_INTRO_DESC}</p>
                      </div>
                  </div>

                  {/* Legend */}
                  <div className="bg-black/40 rounded-xl p-4 border border-white/5 flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-blue-900 border border-blue-500 flex items-center justify-center shrink-0">
                              <div className="w-3 h-3 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.8)]"></div>
                          </div>
                          <span className="text-sm font-bold text-white">{t.TUT_1_2_LEGEND_SAFE}</span>
                      </div>
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-blue-900 border border-blue-500 flex items-center justify-center shrink-0 relative overflow-hidden">
                              <div className="absolute inset-0 bg-black/40"></div>
                              <div className="absolute top-2 left-2 w-2 h-2 bg-black rounded-full"></div>
                              <div className="absolute bottom-2 right-3 w-3 h-3 bg-black rounded-full"></div>
                          </div>
                          <span className="text-sm font-bold text-red-400">{t.TUT_1_2_LEGEND_RISK}</span>
                      </div>
                  </div>

                  <button 
                      onClick={() => { setShowLevelBriefing(false); playUiSound('CLICK'); }}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl uppercase tracking-widest shadow-lg shadow-emerald-900/50 transition-all hover:scale-[1.02] active:scale-95"
                  >
                      {t.BTN_READY}
                  </button>
              </div>
          </div>
      )}

      {/* BOTTOM CONTROLS */}
      <div className={`absolute bottom-4 md:bottom-8 w-full flex justify-center items-end gap-2 md:gap-5 pointer-events-none z-40 pb-[env(safe-area-inset-bottom)] origin-bottom`}>
        <div className="pointer-events-auto mb-1">
            <HexButton size="sm" onClick={() => { onRotateCamera('left'); playUiSound('CLICK'); }} variant='slate'>
                <RotateCcw className="w-4 h-4 md:w-5 md:h-5" />
            </HexButton>
        </div>
        
        {/* HIDE ACTION BUTTONS IN LEVEL 1.2 (Movement Only) */}
        {!isLevel1_2 && (
            <div className="pointer-events-auto flex items-end gap-2 md:gap-3 relative">
            {/* Level 1.1 Hints over Upgrade Button */}
            {isLevel1_1 && isClaiming && !isMoving && !isPlayerGrowing && (
                    <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                        <div className="bg-amber-500 text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-lg shadow-lg border-2 border-white uppercase whitespace-nowrap">
                            {t.BTN_CLAIM}
                        </div>
                        <div className="bg-slate-900/90 text-amber-400 text-[9px] font-mono px-2 py-1 rounded mt-1 border border-amber-500/30">
                            {t.BTN_REWARD}
                        </div>
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-amber-500 mt-[-1px]"></div>
                    </div>
            )}

            {isPlayerGrowing ? (
                <HexButton onClick={() => togglePlayerGrowth(timeData.mode === 'RECOVERY' ? 'RECOVER' : 'UPGRADE')} active={true} variant={timeData.mode === 'RECOVERY' ? 'blue' : 'amber'} progress={timeData.percent} size="lg" pulsate={true}>
                    <div className="flex flex-col items-center gap-1"><Pause className="w-6 h-6 md:w-8 md:h-8 fill-current" /><span className="text-[10px] font-mono font-bold">{formatTime(timeData.remainingSeconds)}</span></div>
                </HexButton>
            ) : (
                <>
                    <HexButton onClick={() => !isMoving && togglePlayerGrowth('RECOVER')} disabled={isMoving} variant={(canRecover && !isMoving) ? 'blue' : 'slate'} size="lg">
                        <RefreshCw className="w-6 h-6 md:w-8 md:h-8" />
                    </HexButton>
                    <div>
                        <HexButton onClick={() => !isMoving && togglePlayerGrowth('UPGRADE')} disabled={isMoving} variant={(canUpgrade && !isMoving) ? 'amber' : 'slate'} size="lg" pulsate={canUpgrade}>
                            <ChevronsUp className="w-8 h-8 md:w-10 md:h-10" />
                        </HexButton>
                    </div>
                </>
            )}
            </div>
        )}

        <div className="pointer-events-auto mb-1">
            <HexButton size="sm" onClick={() => { onRotateCamera('right'); playUiSound('CLICK'); }} variant='slate'>
                <RotateCw className="w-4 h-4 md:w-5 md:h-5" />
            </HexButton>
        </div>
      </div>

      {/* MODALS */}
      {helpTopic && (
        <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto p-4" onClick={() => setHelpTopic(null)}>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl max-w-sm w-full relative max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <button onClick={() => setHelpTopic(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><XCircle className="w-5 h-5"/></button>
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                        {helpTopic === 'RANK' && <Crown className="w-6 h-6 text-indigo-500" />}
                        {helpTopic === 'CYCLE' && <TrendingUp className="w-6 h-6 text-emerald-500" />}
                        {helpTopic === 'COINS' && <Wallet className="w-6 h-6 text-amber-500" />}
                        {helpTopic === 'MOVES' && <Footprints className="w-6 h-6 text-blue-500" />}
                    </div>
                    <h3 className="text-xl font-black text-white mb-2 uppercase">{helpTopic && t[helpTopic]}</h3>
                    <div className="text-sm text-slate-400 leading-relaxed">
                        {helpTopic === 'RANK' && (<><p>{t.HELP_RANK_DESC}</p><p className="text-indigo-400 font-bold">{t.HELP_RANK_GOAL} {winCondition?.targetLevel}</p></>)}
                        {helpTopic === 'CYCLE' && (<><p>{t.HELP_QUEUE_DESC.replace('{0}', queueSize.toString())}</p><p className="text-emerald-400 font-bold">{t.HELP_QUEUE_HINT}</p></>)}
                        {helpTopic === 'COINS' && (<><p>{t.HELP_COINS_DESC}</p><p className="text-amber-500 font-bold">{t.HELP_COINS_GOAL.replace('{0}', (winCondition?.targetCoins || 0).toString())}</p><p className="text-[10px] mt-2 text-slate-500">(Current wallet balance shown in HUD)</p></>)}
                        {helpTopic === 'MOVES' && (<><p>{t.HELP_MOVES_DESC}</p><p className="text-blue-400 font-bold">{t.HELP_MOVES_HINT}</p></>)}
                    </div>
                </div>
            </div>
        </div>
      )}

      {showExitConfirmation && (
        <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto p-4">
          <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden">
             <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4"><LogOut className="w-6 h-6 text-red-500" /></div>
             <h3 className="text-xl font-bold text-white mb-2">{t.ABORT_TITLE}</h3>
             <p className="text-slate-400 text-xs mb-6">{t.ABORT_DESC}</p>
             <div className="flex gap-3">
               <button onClick={() => setShowExitConfirmation(false)} className="flex-1 py-3 bg-slate-800 rounded-xl text-slate-300 font-bold text-xs uppercase">{t.BTN_CANCEL}</button>
               <button onClick={() => { abandonSession(); setShowExitConfirmation(false); }} className="flex-1 py-3 bg-red-900/50 rounded-xl text-red-200 font-bold text-xs uppercase">{t.BTN_CONFIRM}</button>
             </div>
          </div>
        </div>
      )}

      {/* BRIEFING MODAL REMOVED - REPLACED BY TOAST NOTIFICATION IN STORE */}

      { (gameStatus === 'VICTORY' || gameStatus === 'DEFEAT') && (
        <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-lg flex items-center justify-center pointer-events-auto p-4 animate-in fade-in duration-500">
            {gameStatus === 'VICTORY' && <FireworksOverlay />}
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center relative overflow-hidden z-10 max-h-[90vh] overflow-y-auto">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2 ${gameStatus === 'VICTORY' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'}`}>{gameStatus === 'VICTORY' ? <Trophy className="w-8 h-8 text-amber-500" /> : <Shield className="w-8 h-8 text-red-500" />}</div>
                <h2 className={`text-4xl font-black mb-2 uppercase ${gameStatus === 'VICTORY' ? 'text-amber-400' : 'text-red-500'}`}>{gameStatus === 'VICTORY' ? t.VICTORY : t.DEFEAT}</h2>
                <p className="text-slate-400 text-sm mb-4">{`${winCondition?.label} ${gameStatus === 'VICTORY' ? 'Complete' : 'Failed'}`}</p>
                {gameStatus === 'DEFEAT' && winner && winner.type !== 'PLAYER' && (<div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl mb-6 flex items-center justify-between px-6"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full" style={{ backgroundColor: winner.avatarColor }} /><div className="text-left"><div className="text-[10px] font-bold text-red-300 uppercase">{t.WINNER}</div><div className="text-white font-bold text-sm">{winner.id.toUpperCase()}</div></div></div><div className="text-right flex flex-col"><span className="text-amber-400 font-mono font-bold text-sm">{winner.coins} CR</span><span className="text-indigo-400 font-mono font-bold text-sm">L{winner.playerLevel} RANK</span></div></div>)}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-8 flex justify-around text-left">
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">{t.TIME}</span><span className="text-white font-mono font-bold text-lg">{formatTime((Date.now() - sessionStartTime) / 1000)}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">{t.CREDITS}</span><span className="text-amber-400 font-mono font-bold text-lg">{player.coins}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">{t.RANK}</span><span className="text-indigo-400 font-mono font-bold text-lg">L{player.playerLevel}</span></div>
                </div>
                <div className="flex gap-4">
                    <button onClick={abandonSession} className="flex-1 py-4 bg-slate-800 rounded-xl text-slate-300 font-bold text-xs uppercase">{t.BTN_MENU}</button>
                    {gameStatus === 'VICTORY' && nextLevelId ? (
                        <button onClick={() => startCampaignLevel(nextLevelId)} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all">
                            <span>{t.BTN_NEXT}</span> <ArrowRight className="w-4 h-4" />
                        </button>
                    ) : gameStatus === 'DEFEAT' && activeLevelConfig ? (
                        <button onClick={() => startCampaignLevel(activeLevelConfig.id)} className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-white font-bold text-xs uppercase flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20 transition-all">
                            <span>{t.BTN_RETRY}</span> <RefreshCcw className="w-4 h-4" />
                        </button>
                    ) : (
                        <button onClick={() => { abandonSession(); setUIState('LEADERBOARD'); }} className="flex-1 py-4 bg-indigo-600 rounded-xl text-white font-bold text-xs uppercase">{t.BTN_VIEW_LEADERBOARD}</button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default GameHUD;
