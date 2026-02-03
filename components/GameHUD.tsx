
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { getHexKey, getNeighbors, getSecondsToGrow, cubeDistance } from '../services/hexUtils.ts';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth.ts';
import { EntityState, Hex } from '../types.ts';
import HexButton from './HexButton.tsx';
import { TEXT } from '../services/i18n.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { 
  Pause, Trophy, Footprints, LogOut,
  Crown, RefreshCw, Target, Wallet, Music, Volume2, VolumeX, X, Settings, Globe, AlertTriangle, ChevronsUp, Pickaxe, Box, RotateCcw, RotateCw, Info, FileText
} from 'lucide-react';

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
  const deviceType = useGameStore(state => state.deviceType);
  
  const setLanguage = useGameStore(state => state.setLanguage);
  const abandonSession = useGameStore(state => state.abandonSession);
  const togglePlayerGrowth = useGameStore(state => state.togglePlayerGrowth);
  const toggleMusic = useGameStore(state => state.toggleMusic);
  const toggleSfx = useGameStore(state => state.toggleSfx);
  const playUiSound = useGameStore(state => state.playUiSound);
  const startMission = useGameStore(state => state.startMission);
  const downloadBotLog = useGameStore(state => state.downloadBotLog);

  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | null>(null);
  
  // Unified Menu State
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const systemMenuRef = useRef<HTMLDivElement>(null);

  const [showLevelBriefing, setShowLevelBriefing] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);

  const t = TEXT[language].HUD;
  
  const queueSize = winCondition?.queueSize || 3;
  const currentHex = (grid && player) ? grid[getHexKey(player.q, player.r)] : undefined;
  const neighbors = player ? getNeighbors(player.q, player.r) : [];
  const safeBots = useMemo(() => (bots || []).filter(b => b && typeof b.q === 'number' && typeof b.r === 'number'), [bots]);
  const botPositions = useMemo(() => safeBots.map(b => ({ q: b.q, r: b.r })), [safeBots]);
  const isMoving = player?.state === EntityState.MOVING;
  const canRecover = player ? !player.recoveredCurrentHex : false;
  
  const isMobile = deviceType === 'MOBILE';

  // Level Tutorial Flags
  const isLevel1_1 = activeLevelConfig?.id === '1.1';
  const isLevel1_2 = activeLevelConfig?.id === '1.2';
  const isLevel1_3 = activeLevelConfig?.id === '1.3';
  const isLevel1_4 = activeLevelConfig?.id === '1.4';
  const isLevel1_5 = activeLevelConfig?.id === '1.5';
  const isLevel1_6 = activeLevelConfig?.id === '1.6';

  // --- LEVEL 1.5 TIMER LOGIC ---
  useEffect(() => {
      if (!isLevel1_5 || gameStatus !== 'PLAYING') return;
      const interval = setInterval(() => {
          const elapsed = Date.now() - sessionStartTime;
          const remaining = Math.max(0, 60 - Math.floor(elapsed / 1000));
          setTimeLeft(remaining);
      }, 200);
      return () => clearInterval(interval);
  }, [isLevel1_5, gameStatus, sessionStartTime]);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (systemMenuRef.current && !systemMenuRef.current.contains(event.target as Node)) {
              setIsSystemMenuOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
      if ((isLevel1_2 || isLevel1_3 || isLevel1_4 || isLevel1_5 || isLevel1_6) && gameStatus === 'PLAYING') {
          setShowLevelBriefing(true);
      }
  }, [isLevel1_2, isLevel1_3, isLevel1_4, isLevel1_5, isLevel1_6, gameStatus]);

  const upgradeCondition = useMemo(() => {
    if (!currentHex || !player || !grid) return { canGrow: false, reason: 'Invalid Hex' };
    const simulatedHex = { ...currentHex, currentLevel: Math.max(0, currentHex.maxLevel) };
    return checkGrowthCondition(simulatedHex, player, neighbors, grid, botPositions, queueSize);
  }, [currentHex, player, grid, neighbors, botPositions, queueSize]);

  const digCondition = useMemo(() => {
      if (!currentHex || !player || !grid) return { canGrow: false, reason: 'Invalid Hex' };
      return checkDigCondition(currentHex, player, neighbors, grid);
  }, [currentHex, player, grid, neighbors]);

  const canUpgrade = upgradeCondition.canGrow;
  const canDig = digCondition.canGrow;

  const timeData = useMemo(() => {
    if (!currentHex) return { totalNeeded: 1, totalDone: 0, percent: 0, mode: 'IDLE' };
    
    let totalNeeded = 0;
    let mode = 'IDLE';
    let currentStepNeeded = 30; // default 3s

    if (playerGrowthIntent === 'RECOVER') {
        totalNeeded = getSecondsToGrow(currentHex.maxLevel);
        mode = 'RECOVERY';
        currentStepNeeded = totalNeeded;
    } else if (playerGrowthIntent === 'DIG') {
        mode = 'DIG';
        currentStepNeeded = 30; // Digging takes 3s
    } else { // UPGRADE
        mode = 'UPGRADE';
        currentStepNeeded = getSecondsToGrow(currentHex.currentLevel + 1);
    }

    const currentStepProgress = currentHex.progress;
    const percent = currentStepNeeded > 0 ? (currentStepProgress / currentStepNeeded) * 100 : 0;
    const remainingTicks = Math.max(0, currentStepNeeded - currentStepProgress);
    const remainingSeconds = remainingTicks * 0.1;

    return { remainingSeconds, percent, mode };
  }, [currentHex, isPlayerGrowing, canUpgrade, canDig, playerGrowthIntent]);

  const formatTime = (seconds: number) => {
    const totalSeconds = Math.ceil(seconds);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const min = Math.floor(totalSeconds / 60);
    const sec = totalSeconds % 60;
    return `${min}m ${sec}s`;
  };

  const digTooltip = useMemo(() => {
      if (isMoving) return "Unit is moving";
      if (!digCondition.canGrow) return digCondition.reason || "Cannot Excavate";
      return "Excavate Sector (Lower Level)";
  }, [isMoving, digCondition]);

  const recoverTooltip = useMemo(() => {
      if (isMoving) return "Unit is moving";
      if (!canRecover) return "Already recovered resources on this sector";
      return "Recover Resources (Gain Moves & Credits)";
  }, [isMoving, canRecover]);

  const upgradeTooltip = useMemo(() => {
      if (isMoving) return "Unit is moving";
      if (!upgradeCondition.canGrow) return upgradeCondition.reason || "Cannot Upgrade";
      return "Upgrade Sector (Increase Level)";
  }, [isMoving, upgradeCondition]);

  // --- Campaign Objective Metrics ---
  const campaignMetrics = useMemo(() => {
      if (!grid || !player) return null;
      
      if (isLevel1_1) {
          const owned = Object.values(grid).filter((h: Hex) => h.ownerId === player.id && h.maxLevel >= 1).length;
          return { current: Math.max(0, owned - 1), target: 3, label: t.TUT_1_1_COUNTER };
      }
      if (isLevel1_2) {
          const target = { q: 5, r: -1 };
          const dist = cubeDistance({ q: player.q, r: player.r }, target);
          return { current: dist, target: 0, label: t.TUT_1_2_COUNTER, inverse: true };
      }
      if (isLevel1_3) {
          const centerNeighbors = getNeighbors(0,0);
          const supports = centerNeighbors.filter(n => {
              const h = grid[getHexKey(n.q, n.r)];
              return h && h.maxLevel >= 1 && h.structureType !== 'VOID';
          }).length;
          return { current: supports, target: 2, label: t.TUT_1_3_COUNTER };
      }
      if (isLevel1_4) {
          const center = grid[getHexKey(0,0)];
          return { current: center ? center.maxLevel : 0, target: 3, label: t.TUT_1_4_COUNTER };
      }
      if (isLevel1_5) {
          return { current: player.coins, target: 150, label: t.TUT_1_5_COUNTER };
      }
      if (isLevel1_6) {
          const botMax = bots ? Math.max(...bots.map(b => b.playerLevel)) : 0;
          return { current: player.playerLevel, target: 4, label: t.TUT_1_6_COUNTER, rival: botMax };
      }
      return null;
  }, [grid, player, bots, isLevel1_1, isLevel1_2, isLevel1_3, isLevel1_4, isLevel1_5, isLevel1_6, t]);

  if (!grid || !player || !bots) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none">
      
      {/* HEADER */}
      <div className="absolute inset-x-0 top-0 p-2 md:p-4 pointer-events-none z-30 pt-[max(0.5rem,env(safe-area-inset-top))]">
          <div className="w-full flex justify-between items-start gap-2 max-w-7xl mx-auto relative">
               
               {/* STATS BAR */}
               <div className="flex flex-col gap-2">
                   <div className="pointer-events-auto flex items-center bg-slate-900/95 backdrop-blur-xl rounded-2xl border border-slate-700/50 shadow-xl px-2.5 py-2 gap-2 md:px-3 md:gap-4 transition-all duration-300 hover:border-slate-600/50 overflow-x-auto no-scrollbar mask-linear-fade flex-1 md:flex-none md:w-fit md:shrink-0 max-w-[calc(100vw-70px)] md:max-w-none">
                       
                       {/* Rank */}
                       <div onClick={() => { setHelpTopic('RANK'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                           <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                               <Crown className="w-3.5 h-3.5 md:w-5 md:h-5 text-white" />
                           </div>
                           <div className="flex flex-col justify-center">
                               <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">{t.RANK}</span>
                               <span className="text-base md:text-xl font-black text-white leading-none">{player.playerLevel}</span>
                           </div>
                       </div>

                       <div className="w-px h-6 md:h-8 bg-slate-800 shrink-0"></div>

                       {/* Material Storage (Re-designed) */}
                       <div onClick={() => { setHelpTopic('MATERIAL'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                           <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-500/20 transition-colors">
                               <Box className="w-3.5 h-3.5 md:w-5 md:h-5 text-emerald-400" />
                           </div>
                           <div className="flex flex-col justify-center">
                               <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">{t.MATERIAL}</span>
                               <div className="flex items-center gap-0.5 md:gap-1">
                                   <span className={`text-base md:text-xl font-black leading-none ${player.storage >= player.maxStorage ? 'text-emerald-400' : 'text-white'}`}>
                                       {player.storage}
                                   </span>
                                   <span className="text-[10px] md:text-xs text-slate-500 font-bold self-end mb-0.5">/{player.maxStorage}</span>
                               </div>
                           </div>
                       </div>

                       <div className="w-px h-6 md:h-8 bg-slate-800 shrink-0"></div>

                       {/* Coins (Renamed from Credits) */}
                       <div onClick={() => { setHelpTopic('COINS'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                           <div className="w-7 h-7 md:w-10 md:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                               <Wallet className="w-3.5 h-3.5 md:w-5 md:h-5 text-amber-400" />
                           </div>
                           <div className="flex flex-col justify-center">
                               <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">{t.CREDITS}</span>
                               <span className="text-base md:text-xl font-black text-white leading-none">{player.coins}</span>
                           </div>
                       </div>

                       <div className="w-px h-6 md:h-8 bg-slate-800 shrink-0"></div>

                       {/* Moves */}
                       <div onClick={() => { setHelpTopic('MOVES'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0 pr-2">
                           <div className={`w-7 h-7 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors ${isMoving ? 'bg-blue-600 animate-pulse' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                               <Footprints className={`w-3.5 h-3.5 md:w-5 md:h-5 ${isMoving ? 'text-white' : 'text-blue-400'}`} />
                           </div>
                           <div className="flex flex-col justify-center">
                               <span className="text-[8px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">{t.MOVES}</span>
                               <span className="text-base md:text-xl font-black text-white leading-none">{player.moves}</span>
                           </div>
                       </div>
                   </div>

                   {/* CAMPAIGN OBJECTIVE TRACKER */}
                   {campaignMetrics && gameStatus === 'PLAYING' && (
                       <div className="bg-slate-900/80 backdrop-blur border border-indigo-500/30 rounded-xl px-4 py-2 self-start flex items-center gap-3 animate-in slide-in-from-top-4 duration-500">
                           <div className="p-1.5 bg-indigo-500/20 rounded-lg">
                               <Target className="w-4 h-4 text-indigo-400" />
                           </div>
                           <div className="flex flex-col">
                               <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{campaignMetrics.label}</span>
                               <div className="flex items-center gap-1">
                                   <span className={`text-lg font-black ${
                                       (campaignMetrics.inverse ? campaignMetrics.current <= campaignMetrics.target : campaignMetrics.current >= campaignMetrics.target) 
                                       ? 'text-emerald-400' : 'text-white'
                                   }`}>
                                       {campaignMetrics.current}
                                   </span>
                                   {!campaignMetrics.inverse && <span className="text-sm font-bold text-slate-500">/ {campaignMetrics.target}</span>}
                               </div>
                           </div>
                           {/* Rival Tracker for 1.6 */}
                           {campaignMetrics.rival !== undefined && (
                               <>
                                   <div className="w-px h-6 bg-slate-700 mx-1"></div>
                                   <div className="flex flex-col items-end">
                                       <span className="text-[9px] text-red-400 font-bold uppercase tracking-widest">{t.TUT_1_6_RIVAL}</span>
                                       <span className="text-lg font-black text-red-500">{campaignMetrics.rival}</span>
                                   </div>
                               </>
                           )}
                       </div>
                   )}
               </div>

               {/* SYSTEM CONTROLS (UNIFIED MENU) */}
               <div className="pointer-events-auto flex items-start shrink-0 relative z-50">
                   <div className="relative">
                        <button 
                            onClick={() => { setIsSystemMenuOpen(!isSystemMenuOpen); playUiSound('CLICK'); }} 
                            className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center backdrop-blur-xl border rounded-xl transition-all shadow-lg active:scale-95 ${isSystemMenuOpen ? 'bg-slate-800 border-slate-500 text-white' : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:text-white'}`}
                        >
                            {isSystemMenuOpen ? <X className="w-5 h-5" /> : <Settings className="w-5 h-5" />}
                        </button>

                        {isSystemMenuOpen && (
                            <div ref={systemMenuRef} className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[180px] z-[60] animate-in slide-in-from-top-2 duration-200">
                                {/* Audio Controls */}
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { toggleMusic(); playUiSound('CLICK'); }}
                                        className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isMusicMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-400'}`}
                                        title="Toggle Music"
                                    >
                                        {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                                    </button>
                                    <button 
                                        onClick={() => { toggleSfx(); playUiSound('CLICK'); }}
                                        className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isSfxMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'}`}
                                        title="Toggle SFX"
                                    >
                                        {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                                    </button>
                                </div>

                                {/* Language */}
                                <button 
                                    onClick={() => { setLanguage(language === 'EN' ? 'RU' : 'EN'); playUiSound('CLICK'); }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600"
                                >
                                    <Globe className="w-4 h-4 text-sky-400" />
                                    <span className="text-xs font-bold uppercase">{language === 'EN' ? 'English' : 'Русский'}</span>
                                </button>

                                {/* Leaderboard Toggle */}
                                <button 
                                    onClick={() => { setIsRankingsOpen(!isRankingsOpen); setIsSystemMenuOpen(false); playUiSound('CLICK'); }}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left border ${isRankingsOpen ? 'bg-amber-900/20 border-amber-500/50 text-amber-400' : 'bg-slate-800/50 border-transparent hover:bg-slate-800 text-slate-300 hover:text-white'}`}
                                >
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-bold uppercase">{isRankingsOpen ? 'Hide Ranks' : t.LEADERBOARD_TITLE}</span>
                                </button>

                                {/* Download Log Button */}
                                <button 
                                    onClick={() => { downloadBotLog(); setIsSystemMenuOpen(false); playUiSound('CLICK'); }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-400 hover:text-indigo-200 border border-indigo-900/30 hover:border-indigo-500/50 transition-colors w-full text-left"
                                >
                                    <FileText className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Download Log</span>
                                </button>

                                {/* Abort Mission */}
                                <div className="h-px bg-slate-700/50 my-1"></div>
                                <button 
                                    onClick={() => { setShowExitConfirmation(true); setIsSystemMenuOpen(false); playUiSound('CLICK'); }}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-900/10 hover:bg-red-900/30 text-red-400 hover:text-red-200 border border-red-900/30 hover:border-red-500/50 transition-colors w-full text-left"
                                >
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">{t.BTN_CONFIRM}</span>
                                </button>
                            </div>
                        )}
                   </div>
               </div>
          </div>
      </div>

      {/* HELP POPUP */}
      {helpTopic && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 pointer-events-auto" onClick={() => setHelpTopic(null)}>
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setHelpTopic(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                  <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                          <div className={`p-3 rounded-xl border ${
                              helpTopic === 'RANK' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' :
                              helpTopic === 'MATERIAL' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' :
                              helpTopic === 'COINS' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
                              'bg-blue-500/20 border-blue-500/50 text-blue-400'
                          }`}>
                              {helpTopic === 'RANK' && <Crown className="w-6 h-6" />}
                              {helpTopic === 'MATERIAL' && <Box className="w-6 h-6" />}
                              {helpTopic === 'COINS' && <Wallet className="w-6 h-6" />}
                              {helpTopic === 'MOVES' && <Footprints className="w-6 h-6" />}
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-white uppercase tracking-wider">
                                  {helpTopic === 'RANK' ? t.RANK : helpTopic === 'MATERIAL' ? t.MATERIAL : helpTopic === 'COINS' ? t.CREDITS : t.MOVES}
                              </h3>
                              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                                  {helpTopic === 'RANK' ? t.HELP_RANK_GOAL.replace('{0}', (winCondition?.targetLevel || 99).toString()) :
                                   helpTopic === 'MATERIAL' ? t.HELP_MAT_GOAL :
                                   helpTopic === 'COINS' ? t.HELP_COINS_GOAL.replace('{0}', (winCondition?.targetCoins || 9999).toString()) :
                                   t.HINT_MOVES}
                              </p>
                          </div>
                      </div>
                      
                      <div className="h-px bg-slate-800"></div>
                      
                      <p className="text-sm text-slate-300 leading-relaxed">
                          {helpTopic === 'RANK' && t.HELP_RANK_DESC}
                          {helpTopic === 'MATERIAL' && t.HELP_MAT_DESC}
                          {helpTopic === 'COINS' && t.HELP_COINS_DESC}
                          {helpTopic === 'MOVES' && t.HELP_MOVES_DESC}
                      </p>

                      {helpTopic === 'MOVES' && (
                          <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                              <p className="text-xs text-slate-400 italic">"{t.HELP_MOVES_HINT}"</p>
                          </div>
                      )}
                      
                      <button onClick={() => setHelpTopic(null)} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl uppercase tracking-widest text-xs mt-2">
                          {t.BTN_READY}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* FLOATING LEADERBOARD (Controlled by Menu) */}
      {isRankingsOpen && (
           <div className="absolute top-[80px] right-4 md:right-[max(2rem,env(safe-area-inset-right))] z-40 flex flex-col bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden w-64 animate-in fade-in slide-in-from-top-4 duration-300 pointer-events-auto">
               <div className="flex items-center justify-between p-3 border-b border-slate-700/50 bg-slate-950/30">
                   <div className="flex items-center gap-2">
                       <Trophy className="w-4 h-4 text-amber-500" />
                       <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">{t.LEADERBOARD_TITLE}</span>
                   </div>
                   <button onClick={() => setIsRankingsOpen(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
               </div>
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
           </div>
      )}

      {/* BRIEFING OVERLAY (SKIRMISH/START) */}
      {gameStatus === 'BRIEFING' && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 pointer-events-auto">
              <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden animate-in zoom-in-95 duration-300">
                  <div className="flex flex-col items-center text-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/50">
                          <Target className="w-8 h-8 text-indigo-400" />
                      </div>
                      <div>
                          <h2 className="text-2xl font-black text-white uppercase tracking-widest">{t.BRIEFING_TITLE}</h2>
                          <p className="text-slate-400 text-xs font-mono mt-1 uppercase">{winCondition?.label || t.SKIRMISH_OBJ}</p>
                      </div>
                      
                      <div className="w-full h-px bg-slate-800 my-2"></div>
                      
                      <div className="grid grid-cols-2 gap-4 w-full">
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.BRIEFING_TARGET_RANK}</span>
                              <span className="text-3xl font-black text-emerald-400">{winCondition?.targetLevel || 99}</span>
                          </div>
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col items-center">
                              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{t.BRIEFING_TARGET_FUNDS}</span>
                              <span className="text-3xl font-black text-amber-400">{winCondition?.targetCoins || 9999}</span>
                          </div>
                      </div>

                      {winCondition?.botCount > 0 && (
                          <div className="flex items-center gap-2 text-red-400 bg-red-950/30 px-3 py-1.5 rounded-lg border border-red-900/50">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="text-xs font-bold uppercase">{t.BRIEFING_RIVAL} ({winCondition.botCount})</span>
                          </div>
                      )}

                      <button 
                          onClick={() => { startMission(); playUiSound('SUCCESS'); }}
                          className="w-full py-4 bg-white hover:bg-slate-200 text-slate-900 font-black rounded-xl uppercase tracking-widest shadow-lg shadow-white/10 active:scale-95 transition-all mt-2"
                      >
                          {t.BRIEFING_BTN_START}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* CAMPAIGN LEVEL BRIEFING (IN-GAME) */}
      {showLevelBriefing && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6 pointer-events-auto">
              <div className="bg-slate-900 border border-indigo-500/50 p-6 rounded-3xl shadow-2xl max-w-sm w-full relative animate-in fade-in duration-300">
                  <button onClick={() => setShowLevelBriefing(false)} className="absolute top-3 right-3 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
                  <div className="flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/20 rounded-lg"><Info className="w-6 h-6 text-indigo-400" /></div>
                          <div>
                              <h3 className="text-sm font-bold text-white uppercase tracking-widest">{activeLevelConfig?.title}</h3>
                              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Operational Guide</p>
                          </div>
                      </div>
                      <div className="h-px bg-slate-700/50"></div>
                      <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
                          {activeLevelConfig?.description}
                      </p>
                      <button onClick={() => setShowLevelBriefing(false)} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest mt-2">
                          {t.BTN_READY}
                      </button>
                  </div>
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
            
            {isPlayerGrowing ? (
                <HexButton 
                    onClick={() => togglePlayerGrowth(timeData.mode === 'RECOVERY' ? 'RECOVER' : (timeData.mode === 'DIG' ? 'DIG' : 'UPGRADE'))} 
                    active={true} 
                    variant={timeData.mode === 'RECOVERY' ? 'blue' : (timeData.mode === 'DIG' ? 'red' : 'amber')} 
                    progress={timeData.percent} 
                    size={isMobile ? "xl" : "lg"} 
                    pulsate={true}
                >
                    <div className="flex flex-col items-center gap-1"><Pause className="w-6 h-6 md:w-8 md:h-8 fill-current" /><span className="text-[10px] font-mono font-bold">{formatTime(timeData.remainingSeconds)}</span></div>
                </HexButton>
            ) : (
                <>
                    {/* DIG BUTTON */}
                    <HexButton 
                        onClick={() => !isMoving && togglePlayerGrowth('DIG')} 
                        disabled={isMoving || !canDig} 
                        variant={(canDig && !isMoving) ? 'red' : 'slate'} 
                        size={isMobile ? "lg" : "md"}
                        title={digTooltip}
                    >
                        <Pickaxe className="w-6 h-6 md:w-8 md:h-8" />
                    </HexButton>

                    {/* RECOVER BUTTON */}
                    <HexButton 
                        onClick={() => !isMoving && togglePlayerGrowth('RECOVER')} 
                        disabled={isMoving} 
                        variant={(canRecover && !isMoving) ? 'blue' : 'slate'} 
                        size={isMobile ? "lg" : "md"}
                        title={recoverTooltip}
                    >
                        <RefreshCw className="w-6 h-6 md:w-8 md:h-8" />
                    </HexButton>
                    
                    {/* UPGRADE BUTTON */}
                    <div>
                        <HexButton 
                            onClick={() => !isMoving && togglePlayerGrowth('UPGRADE')} 
                            disabled={isMoving} 
                            variant={(canUpgrade && !isMoving) ? 'amber' : 'slate'} 
                            size={isMobile ? "xl" : "lg"} 
                            pulsate={canUpgrade}
                            title={upgradeTooltip}
                        >
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

      {/* MODALS (Help, Exit, etc.) */}
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
    </div>
  );
};

export default GameHUD;
