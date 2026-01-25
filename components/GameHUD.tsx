
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { getHexKey, getNeighbors, getSecondsToGrow, findPath } from '../services/hexUtils.ts';
import { checkGrowthCondition } from '../rules/growth.ts';
import { EXCHANGE_RATE_COINS_PER_MOVE, DIFFICULTY_SETTINGS } from '../rules/config.ts';
import { EntityState, TutorialStep } from '../types.ts';
import HexButton from './HexButton.tsx';
import { CAMPAIGN_LEVELS } from '../rules/campaign.ts';
import { TEXT } from '../services/i18n.ts';
import { 
  AlertCircle, Pause, Trophy, Coins, Footprints, AlertTriangle, LogOut,
  Crown, TrendingUp, ChevronUp, ChevronDown, Shield, MapPin,
  RotateCcw, RotateCw, CheckCircle2, ChevronsUp, Lock, Volume2, VolumeX, XCircle, Zap, RefreshCw, X, ArrowRight, MousePointer2, Move3d, ArrowDown, PlusCircle, Target, Skull, Wallet
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

            // Spawn
            if (Math.random() < 0.05) spawnExplosion();

            // Update & Draw
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.vy += 0.05; // Gravity
                p.vx *= 0.98; // Drag
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

// TUTORIAL OVERLAY COMPONENT
const TutorialOverlay: React.FC<{ step: TutorialStep; onNext: () => void }> = ({ step, onNext }) => {
    const [isVisible, setIsVisible] = useState(true);
    const language = useGameStore(state => state.language);
    const player = useGameStore(state => state.session?.player);
    const winCondition = useGameStore(state => state.session?.winCondition);
    
    const t = TEXT[language].TUTORIAL;
    
    useEffect(() => {
        setIsVisible(true);
    }, [step]);

    if (step === 'NONE' || step === 'FREE_PLAY' || step === 'VICTORY_ANIMATION') return null;

    const queueSize = winCondition?.queueSize || 1;
    const hasUpgradePoint = player && player.recentUpgrades.length >= queueSize;

    const handleDismiss = () => {
        setIsVisible(false);
    };

    const renderInstructionPanel = (title: string, desc: string, highlight: boolean = false) => (
        <div className={`absolute top-20 left-1/2 -translate-x-1/2 max-w-sm w-[90%] pointer-events-auto bg-slate-900/95 border ${highlight ? 'border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.3)]' : 'border-slate-600'} p-4 rounded-xl flex flex-col items-center text-center animate-in fade-in slide-in-from-top-4 duration-500`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${highlight ? 'text-amber-400' : 'text-white'}`}>{title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{desc}</p>
        </div>
    );

    return (
        <div className="absolute inset-0 z-[60] pointer-events-none select-none overflow-hidden">
            <div className="absolute inset-0 bg-black/20" />

            {step === 'WELCOME' && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-auto p-4">
                    <div className="bg-slate-900/90 border border-amber-500 p-6 md:p-8 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.3)] text-center max-w-sm w-full">
                        <h2 className="text-xl md:text-2xl font-black text-amber-500 mb-2 uppercase">{t.WELCOME_TITLE}</h2>
                        <p className="text-slate-300 text-xs md:text-sm mb-6">{t.WELCOME_DESC}</p>
                        <button onClick={onNext} className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-slate-900 font-bold rounded-xl uppercase tracking-wider transition-colors shadow-lg text-sm">
                            {t.BTN_START}
                        </button>
                    </div>
                </div>
            )}

            {step === 'CAMERA_ROTATE' && renderInstructionPanel(t.CAMERA_DESC, t.CAMERA_HINT, true)}
            {step === 'MOVE_1' && renderInstructionPanel(t.MOVE_A, "", true)}
            {step === 'MOVE_2' && renderInstructionPanel(t.MOVE_B, "", true)}
            {step === 'MOVE_3' && renderInstructionPanel(t.MOVE_CENTER, "", true)}
            {step === 'ACQUIRE_1' && renderInstructionPanel(t.ACQUIRE, t.ACQUIRE_DESC, true)}
            {step === 'ACQUIRE_2' && renderInstructionPanel(t.ACQUIRE, t.ACQUIRE_DESC, true)}
            {step === 'ACQUIRE_3' && renderInstructionPanel(t.ACQUIRE, t.ACQUIRE_DESC, true)}
            {step === 'UPGRADE_CENTER_2' && renderInstructionPanel(t.UPGRADE_L2, t.UPGRADE_L2_DESC, true)}

            {(step === 'BUILD_FOUNDATION' || step === 'UPGRADE_CENTER_3') && isVisible && (
                <div className="absolute top-16 md:top-24 left-1/2 -translate-x-1/2 w-[95%] md:w-96 flex flex-col items-center gap-2 pointer-events-auto">
                    {hasUpgradePoint ? (
                        step === 'BUILD_FOUNDATION' ? (
                            <div className="bg-slate-900/95 border border-blue-500 p-3 rounded-2xl shadow-xl flex items-center gap-4 w-full md:block md:text-center md:p-6">
                                <div className="p-2 bg-blue-500/20 rounded-xl shrink-0 md:hidden"><TrendingUp className="w-5 h-5 text-blue-400" /></div>
                                <div className="flex-1 min-w-0">
                                    <div className="md:hidden flex flex-col"><h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">{t.FOUNDATION_TITLE}</h3><p className="text-[10px] text-slate-400 truncate">{t.FOUNDATION_TASK}</p></div>
                                    <div className="hidden md:block">
                                        <button onClick={handleDismiss} className="absolute top-2 right-2 text-slate-500 hover:text-white p-1"><X className="w-4 h-4"/></button>
                                        <h3 className="text-lg font-bold text-blue-400 mb-2 uppercase flex items-center justify-center gap-2"><TrendingUp className="w-5 h-5"/> {t.FOUNDATION_TITLE}</h3>
                                        <p className="text-slate-300 text-xs leading-relaxed mb-4">{t.FOUNDATION_DESC}</p>
                                        <div className="bg-black/40 p-2 rounded text-blue-200 text-xs font-mono">{t.FOUNDATION_TASK}</div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-indigo-900/95 border border-indigo-400 p-3 rounded-2xl shadow-xl flex items-center gap-4 w-full md:block md:text-center md:p-6 animate-bounce md:animate-none">
                                <div className="p-2 bg-indigo-500/20 rounded-xl shrink-0 md:hidden"><Crown className="w-5 h-5 text-amber-400" /></div>
                                <div className="flex-1 min-w-0">
                                     <div className="md:hidden flex flex-col"><h3 className="text-xs font-bold text-white uppercase tracking-wider">{t.FINAL_TITLE}</h3><p className="text-[10px] text-indigo-200 truncate">{t.FINAL_DESC}</p></div>
                                    <div className="hidden md:block">
                                        <button onClick={handleDismiss} className="absolute top-2 right-2 text-indigo-300 hover:text-white p-1"><X className="w-4 h-4"/></button>
                                        <h3 className="text-lg font-bold text-white mb-2 uppercase flex items-center justify-center gap-2"><Crown className="w-5 h-5 text-amber-400"/> {t.FINAL_TITLE}</h3>
                                        <p className="text-indigo-100 text-xs leading-relaxed">{t.FINAL_DESC}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="bg-red-950/95 border border-red-500 p-2 md:p-4 rounded-xl shadow-xl w-full text-center relative animate-pulse flex items-center gap-3 md:block">
                             <div className="md:hidden p-2"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
                             <div className="text-left md:text-center flex-1">
                                <h3 className="text-xs md:text-lg font-bold text-red-400 uppercase">{t.NO_POINTS_TITLE}</h3>
                                <p className="text-[10px] md:text-xs text-white md:mb-2 hidden md:block">{t.NO_POINTS_DESC}</p>
                                <p className="text-[9px] text-red-200 md:hidden">{t.NO_POINTS_HINT}</p>
                             </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
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
  const gameStatus = useGameStore(state => state.session?.gameStatus);
  const isPlayerGrowing = useGameStore(state => state.session?.isPlayerGrowing);
  const playerGrowthIntent = useGameStore(state => state.session?.playerGrowthIntent);
  const sessionStartTime = useGameStore(state => state.session?.sessionStartTime);
  const tutorialStep = useGameStore(state => state.session?.tutorialStep);
  const advanceTutorial = useGameStore(state => state.advanceTutorial);
  const language = useGameStore(state => state.language);
  const user = useGameStore(state => state.user);
  const isMuted = useGameStore(state => state.isMuted);
  const setUIState = useGameStore(state => state.setUIState);
  const abandonSession = useGameStore(state => state.abandonSession);
  const togglePlayerGrowth = useGameStore(state => state.togglePlayerGrowth);
  const toggleMute = useGameStore(state => state.toggleMute);
  const playUiSound = useGameStore(state => state.playUiSound);
  const startCampaignLevel = useGameStore(state => state.startCampaignLevel);
  const startMission = useGameStore(state => state.startMission);
  const showToast = useGameStore(state => state.showToast); 

  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<'RANK' | 'QUEUE' | 'COINS' | 'MOVES' | null>(null);

  const t = TEXT[language].HUD;
  const tt = TEXT[language].TOOLTIP; 
  
  const queueSize = winCondition?.queueSize || 3;
  const currentHex = (grid && player) ? grid[getHexKey(player.q, player.r)] : undefined;
  const neighbors = player ? getNeighbors(player.q, player.r) : [];
  const safeBots = useMemo(() => (bots || []).filter(b => b && typeof b.q === 'number' && typeof b.r === 'number'), [bots]);
  const botPositions = useMemo(() => safeBots.map(b => ({ q: b.q, r: b.r })), [safeBots]);
  const isMoving = player?.state === EntityState.MOVING;
  const canRecover = player ? !player.recoveredCurrentHex : false;

  const growthCondition = useMemo(() => {
    if (!currentHex || !player || !grid) return { canGrow: false, reason: 'Invalid Hex' };
    return checkGrowthCondition(currentHex, player, neighbors, grid, botPositions, queueSize);
  }, [currentHex, player, grid, neighbors, botPositions, queueSize]);

  const upgradeCondition = useMemo(() => {
    if (!currentHex || !player || !grid) return { canGrow: false, reason: 'Invalid Hex' };
    const simulatedHex = { ...currentHex, currentLevel: Math.max(0, currentHex.maxLevel) };
    return checkGrowthCondition(simulatedHex, player, neighbors, grid, botPositions, queueSize);
  }, [currentHex, player, grid, neighbors, botPositions, queueSize]);

  const canUpgrade = upgradeCondition.canGrow;

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

  const isCampaignLevel = winCondition && winCondition.levelId >= 0;
  const showNextLevel = gameStatus === 'VICTORY' && isCampaignLevel && CAMPAIGN_LEVELS.some(l => l.levelId === winCondition.levelId + 1);
  const isCampaignComplete = gameStatus === 'VICTORY' && isCampaignLevel && !showNextLevel;
  const showRetry = gameStatus === 'DEFEAT' && isCampaignLevel;
  const isTutorialActive = tutorialStep && tutorialStep !== 'NONE' && tutorialStep !== 'FREE_PLAY' && tutorialStep !== 'VICTORY_ANIMATION';
  const isActionStep = ['ACQUIRE_1', 'ACQUIRE_2', 'ACQUIRE_3', 'UPGRADE_CENTER_2', 'UPGRADE_CENTER_3'].includes(tutorialStep || '');
  const dimNav = isTutorialActive && tutorialStep !== 'CAMERA_ROTATE' && tutorialStep !== 'BUILD_FOUNDATION' && !tutorialStep?.startsWith('MOVE_');
  const dimRecover = isTutorialActive && tutorialStep !== 'BUILD_FOUNDATION'; 
  const dimUpgrade = isTutorialActive && !isActionStep && tutorialStep !== 'BUILD_FOUNDATION';

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none">
      {tutorialStep && <TutorialOverlay step={tutorialStep} onNext={() => tutorialStep === 'WELCOME' && advanceTutorial('CAMERA_ROTATE')} />}

      {/* HEADER */}
      <div className="absolute inset-x-0 top-0 p-2 md:p-4 pointer-events-none z-30 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="w-full flex justify-between items-start gap-2 max-w-7xl mx-auto">
               <div className="pointer-events-auto flex items-center bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-lg overflow-hidden px-2 md:px-3 py-2 gap-1 md:gap-2 h-14 md:h-16 flex-1 min-w-0 max-w-fit">
                   {/* Rank Progress */}
                   <div onClick={() => { setHelpTopic('RANK'); playUiSound('CLICK'); }} className="flex items-center gap-1 md:gap-2 cursor-pointer md:cursor-help opacity-90 hover:opacity-100 group shrink-0 px-2 md:px-4 md:bg-slate-800/30 md:rounded-xl md:h-full transition-colors">
                       <Crown className="w-4 h-4 text-indigo-400" />
                       <div className="flex flex-col justify-center">
                           <span className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">{t.RANK}</span>
                           <div className="flex items-baseline leading-none">
                             <span className="text-sm md:text-lg font-black text-white">{player.playerLevel}</span>
                             <span className="text-[10px] md:text-xs text-slate-500 font-bold ml-px md:ml-0.5">/{winCondition?.targetLevel || '?'}</span>
                           </div>
                       </div>
                   </div>

                   <div className="w-px h-6 md:h-8 bg-slate-700/50 shrink-0"></div>

                   {/* Cycle/Queue Status */}
                   <div onClick={() => { setHelpTopic('QUEUE'); playUiSound('CLICK'); }} className="flex items-center gap-1 md:gap-2 cursor-pointer md:cursor-help opacity-90 hover:opacity-100 group shrink-0 px-2 md:px-4 md:bg-slate-800/30 md:rounded-xl md:h-full transition-colors">
                       <TrendingUp className="w-4 h-4 text-emerald-400" />
                       <div className="flex flex-col justify-center">
                           <span className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">{t.CYCLE}</span>
                           <div className="flex gap-1">
                               {Array.from({length: queueSize}).map((_, i) => (
                                  <div key={i} className={`w-1.5 h-3 md:w-2 md:h-2 rounded-[1px] transition-all duration-300 ${player.recentUpgrades.length > i ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]' : 'bg-slate-700/50'}`} />
                               ))}
                           </div>
                       </div>
                   </div>

                   <div className="w-px h-6 md:h-8 bg-slate-700/50 shrink-0"></div>

                   {/* Mission Credits Progress */}
                   <div onClick={() => { setHelpTopic('COINS'); playUiSound('CLICK'); }} className="flex items-center gap-1 md:gap-2 cursor-pointer md:cursor-help opacity-90 hover:opacity-100 group shrink-0 px-2 md:px-4 md:bg-slate-800/30 md:rounded-xl md:h-full transition-colors">
                       <Wallet className="w-4 h-4 text-amber-400" />
                       <div className="flex flex-col justify-center">
                           <span className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">{t.CREDITS}</span>
                           <div className="flex items-baseline leading-none">
                             {/* SHOW ACTUAL AVAILABLE COINS FOR SPENDING */}
                             <span className="text-sm md:text-lg font-black text-white">{player.coins}</span>
                             {/* Small indicator of target progress */}
                             <span className="text-[10px] md:text-xs text-slate-500 font-bold ml-px md:ml-0.5" title="Goal"> / {winCondition?.targetCoins || '?'}</span>
                           </div>
                       </div>
                   </div>

                   <div className="w-px h-6 md:h-8 bg-slate-700/50 shrink-0"></div>

                   {/* Current Moves */}
                   <div onClick={() => { setHelpTopic('MOVES'); playUiSound('CLICK'); }} className="flex items-center gap-1 md:gap-2 cursor-pointer md:cursor-help opacity-90 hover:opacity-100 group shrink-0 px-2 md:px-4 md:bg-slate-800/30 md:rounded-xl md:h-full transition-colors pr-2">
                       <Footprints className={`w-4 h-4 ${isMoving ? 'text-slate-200 animate-pulse' : 'text-blue-400'}`} />
                       <div className="flex flex-col justify-center">
                           <span className="hidden md:block text-[10px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-1">{t.MOVES}</span>
                           <span className="text-sm md:text-lg font-black text-white leading-none">{player.moves}</span>
                       </div>
                   </div>
               </div>

               {/* SYSTEM CONTROLS */}
               <div className="pointer-events-auto flex items-start gap-1 md:gap-2 shrink-0">
                   <button onClick={() => { toggleMute(); playUiSound('CLICK'); }} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl text-slate-400 hover:text-white transition-all shadow-lg active:scale-95">
                      {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5" />}
                   </button>
                   <div className={`flex flex-col bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top-right ${isRankingsOpen ? 'w-56 md:w-80' : 'w-10 md:w-14 h-10 md:h-14'}`}>
                       <div onClick={() => { setIsRankingsOpen(!isRankingsOpen); playUiSound('CLICK'); }} className="flex items-center justify-center w-full h-10 md:h-14 cursor-pointer hover:bg-white/5 transition-colors">
                           {isRankingsOpen ? <div className="flex items-center justify-between w-full px-3"><div className="flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" /><span className="text-[10px] font-bold text-slate-300 uppercase">{t.LEADERBOARD_TITLE}</span></div><ChevronUp className="w-3 h-3 text-slate-500" /></div> : <Trophy className="w-4 h-4 md:w-5 md:h-5 text-amber-500" />}
                       </div>
                       {isRankingsOpen && (
                           <div className="flex flex-col p-2 gap-1.5 max-h-[40vh] overflow-y-auto no-scrollbar">
                               {[player, ...safeBots].sort((a, b) => (b.totalCoinsEarned || 0) - (a.totalCoinsEarned || 0)).map((e) => {
                                   const isP = e.type === 'PLAYER';
                                   const color = isP ? (user?.avatarColor || '#3b82f6') : (e.avatarColor || '#ef4444');
                                   return (
                                       <div key={e.id} className="grid grid-cols-4 items-center p-2 rounded-lg bg-slate-950/50 border border-slate-800/50">
                                           <div className="col-span-2 flex items-center gap-2 overflow-hidden"><div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} /><span className={`text-[10px] font-bold truncate ${isP ? 'text-white' : 'text-slate-400'}`}>{isP ? 'YOU' : e.id.toUpperCase()}</span></div>
                                           <div className="col-span-1 text-center font-mono text-[9px] text-indigo-400">L{e.playerLevel}</div>
                                           <div className="col-span-1 text-right font-mono text-amber-500 font-bold text-[10px]">{e.totalCoinsEarned}</div>
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

      {/* BOTTOM CONTROLS */}
      <div className={`absolute bottom-4 md:bottom-8 w-full flex justify-center items-end gap-3 md:gap-5 pointer-events-none z-40 pb-[env(safe-area-inset-bottom)] scale-90 md:scale-100 origin-bottom`}>
        <div className="pointer-events-auto mb-1"><HexButton size="sm" onClick={() => { onRotateCamera('left'); playUiSound('CLICK'); }} variant={tutorialStep === 'CAMERA_ROTATE' ? 'amber' : 'slate'} dimmed={dimNav}><RotateCcw className="w-5 h-5" /></HexButton></div>
        <div className="pointer-events-auto flex items-end gap-3">
           {isPlayerGrowing ? (
              <HexButton onClick={() => togglePlayerGrowth(timeData.mode === 'RECOVERY' ? 'RECOVER' : 'UPGRADE')} active={true} variant={timeData.mode === 'RECOVERY' ? 'blue' : 'amber'} progress={timeData.percent} size="lg" pulsate={true}>
                  <div className="flex flex-col items-center gap-1"><Pause className="w-8 h-8 fill-current" /><span className="text-[10px] font-mono font-bold">{formatTime(timeData.remainingSeconds)}</span></div>
              </HexButton>
           ) : (
              <>
                <HexButton onClick={() => !isMoving && togglePlayerGrowth('RECOVER')} disabled={isMoving} variant={(canRecover && !isMoving) ? 'blue' : 'slate'} size="lg" dimmed={dimRecover}><RefreshCw className="w-8 h-8" /></HexButton>
                <div className={isActionStep ? 'animate-bounce' : ''}><HexButton onClick={() => !isMoving && togglePlayerGrowth('UPGRADE')} disabled={isMoving} variant={(canUpgrade && !isMoving) ? 'amber' : 'slate'} size="lg" pulsate={canUpgrade || isActionStep} dimmed={dimUpgrade}><ChevronsUp className="w-10 h-10" /></HexButton></div>
              </>
           )}
        </div>
        <div className="pointer-events-auto mb-1"><HexButton size="sm" onClick={() => { onRotateCamera('right'); playUiSound('CLICK'); }} variant={tutorialStep === 'CAMERA_ROTATE' ? 'amber' : 'slate'} dimmed={dimNav}><RotateCw className="w-5 h-5" /></HexButton></div>
      </div>

      {/* MODALS */}
      {helpTopic && (
        <div className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto p-4" onClick={() => setHelpTopic(null)}>
            <div className="bg-slate-900 border border-slate-700 p-6 rounded-3xl shadow-2xl max-w-sm w-full relative" onClick={e => e.stopPropagation()}>
                <button onClick={() => setHelpTopic(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><XCircle className="w-5 h-5"/></button>
                <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                        {helpTopic === 'RANK' && <Crown className="w-6 h-6 text-indigo-500" />}
                        {helpTopic === 'QUEUE' && <TrendingUp className="w-6 h-6 text-emerald-500" />}
                        {helpTopic === 'COINS' && <Wallet className="w-6 h-6 text-amber-500" />}
                        {helpTopic === 'MOVES' && <Footprints className="w-6 h-6 text-blue-500" />}
                    </div>
                    <h3 className="text-xl font-black text-white mb-2 uppercase">{helpTopic && t[helpTopic]}</h3>
                    <div className="text-sm text-slate-400 leading-relaxed">
                        {helpTopic === 'RANK' && (<><p>{t.HELP_RANK_DESC}</p><p className="text-indigo-400 font-bold">{t.HELP_RANK_GOAL} {winCondition?.targetLevel}</p></>)}
                        {helpTopic === 'QUEUE' && (<><p>{t.HELP_QUEUE_DESC.replace('{0}', queueSize.toString())}</p><p className="text-emerald-400 font-bold">{t.HELP_QUEUE_HINT}</p></>)}
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

      {/* BRIEFING SCREEN */}
      {gameStatus === 'BRIEFING' && (
          <div className="absolute inset-0 z-[80] bg-black/90 backdrop-blur-md flex items-center justify-center pointer-events-auto p-4 animate-in fade-in duration-500">
              <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center flex flex-col items-center">
                  <div className="p-4 bg-indigo-500/10 rounded-full border border-indigo-500/30 mb-6 animate-pulse"><Target className="w-10 h-10 text-indigo-400" /></div>
                  <h2 className="text-3xl font-black text-white mb-2 uppercase">{t.BRIEFING_TITLE}</h2>
                  <p className="text-slate-400 text-sm font-mono tracking-widest uppercase mb-8">{winCondition?.label}</p>
                  {winCondition && winCondition.botCount > 0 && (<div className="bg-red-950/30 border border-red-500/50 rounded-xl p-3 mb-6 flex items-center gap-3 w-full"><Skull className="w-6 h-6 text-red-500" /><span className="text-red-300 font-bold uppercase text-xs">{t.BRIEFING_RIVAL}</span></div>)}
                  <div className="grid grid-cols-2 gap-4 w-full mb-8">
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center">
                          <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">{t.BRIEFING_TARGET_RANK}</div>
                          <div className="text-2xl font-black text-indigo-400">L{winCondition?.targetLevel}</div>
                      </div>
                      <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center">
                          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">{t.BRIEFING_TARGET_FUNDS}</div>
                          <div className="text-2xl font-black text-amber-400">{winCondition?.targetCoins}</div>
                      </div>
                  </div>
                  <button onClick={startMission} className="w-full py-4 bg-white text-slate-900 font-black text-sm uppercase rounded-xl transition-all transform hover:scale-[1.02]">{t.BRIEFING_BTN_START}</button>
              </div>
          </div>
      )}

      { (gameStatus === 'VICTORY' || gameStatus === 'DEFEAT') && (
        <div className="absolute inset-0 z-[80] bg-black/80 backdrop-blur-lg flex items-center justify-center pointer-events-auto p-4 animate-in fade-in duration-500">
            {gameStatus === 'VICTORY' && <FireworksOverlay />}
            <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-lg w-full text-center relative overflow-hidden z-10">
                <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 border-2 ${gameStatus === 'VICTORY' ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'}`}>{gameStatus === 'VICTORY' ? <Trophy className="w-8 h-8 text-amber-500" /> : <Shield className="w-8 h-8 text-red-500" />}</div>
                <h2 className={`text-4xl font-black mb-2 uppercase ${gameStatus === 'VICTORY' ? 'text-amber-400' : 'text-red-500'}`}>{gameStatus === 'VICTORY' ? t.VICTORY : t.DEFEAT}</h2>
                <p className="text-slate-400 text-sm mb-4">{isCampaignComplete ? t.MISSION_COMPLETE : `${winCondition?.label} ${gameStatus === 'VICTORY' ? '' : t.MISSION_FAILED}`}</p>
                {gameStatus === 'DEFEAT' && winner && winner.type !== 'PLAYER' && (<div className="bg-red-950/20 border border-red-900/30 p-3 rounded-xl mb-6 flex items-center justify-between px-6"><div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full" style={{ backgroundColor: winner.avatarColor }} /><div className="text-left"><div className="text-[10px] font-bold text-red-300 uppercase">{t.WINNER}</div><div className="text-white font-bold text-sm">{winner.id.toUpperCase()}</div></div></div><div className="text-right flex flex-col"><span className="text-amber-400 font-mono font-bold text-sm">{winner.totalCoinsEarned} CR</span><span className="text-indigo-400 font-mono font-bold text-sm">L{winner.playerLevel} RANK</span></div></div>)}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-8 flex justify-around text-left">
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">{t.TIME}</span><span className="text-white font-mono font-bold text-lg">{formatTime((Date.now() - sessionStartTime) / 1000)}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">{t.CREDITS}</span><span className="text-amber-400 font-mono font-bold text-lg">{player.totalCoinsEarned}</span></div>
                    <div className="flex flex-col"><span className="text-xs font-bold text-slate-500 uppercase">{t.RANK}</span><span className="text-indigo-400 font-mono font-bold text-lg">L{player.playerLevel}</span></div>
                </div>
                <div className="flex gap-4">
                    <button onClick={abandonSession} className="flex-1 py-4 bg-slate-800 rounded-xl text-slate-300 font-bold text-xs uppercase">{t.BTN_MENU}</button>
                    {showNextLevel ? (<button onClick={() => startCampaignLevel(winCondition!.levelId + 1)} className="flex-1 py-4 bg-emerald-600 rounded-xl text-white font-bold text-xs uppercase flex items-center justify-center gap-2"><span>{t.BTN_NEXT}</span><ArrowRight className="w-4 h-4" /></button>) : showRetry ? (<button onClick={() => startCampaignLevel(winCondition!.levelId)} className="flex-1 py-4 bg-amber-600 rounded-xl text-white font-bold text-xs uppercase flex items-center justify-center gap-2"><span>{t.BTN_RETRY}</span><RotateCcw className="w-4 h-4" /></button>) : (<button onClick={() => { abandonSession(); setUIState('LEADERBOARD'); }} className="flex-1 py-4 bg-indigo-600 rounded-xl text-white font-bold text-xs uppercase">{t.BTN_VIEW_LEADERBOARD}</button>)}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default GameHUD;
