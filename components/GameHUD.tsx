
import React, { useState, useMemo, useEffect, useRef, memo } from 'react';
import { useGameStore } from '../store.ts';
import { getHexKey, getNeighbors, getSecondsToGrow, cubeDistance } from '../services/hexUtils.ts';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth.ts';
import { EntityState, Hex, Item, ItemRarity, ActiveStatus } from '../types.ts';
import HexButton from './HexButton.tsx';
import EntropyGauge from './EntropyGauge.tsx';
import { TEXT } from '../services/i18n.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { 
  Pause, Trophy, Footprints, LogOut,
  Crown, RefreshCw, Target, Wallet, Music, Volume2, VolumeX, X, Settings, Globe, AlertTriangle, ChevronsUp, Pickaxe, Box, RotateCcw, RotateCw, Info, FileText, CheckCircle, XCircle, ArrowRight, RotateCcw as ReloadIcon, Clock, ChevronDown, ChevronUp, Hourglass, Scan, Mountain, Gem, Trash2, ChevronRight, Zap, Key, 
  Activity, EyeOff, Skull, Hammer, Flame, ShieldAlert, Backpack, Swords, BookOpen, WifiOff, HelpCircle
} from 'lucide-react';
import { itemRenderer } from '../services/itemRenderer.ts';
import { getItemDef, ITEM_REGISTRY } from '../rules/items.ts'; 

interface GameHUDProps {
  hoveredHexId: string | null;
  onRotateCamera: (direction: 'left' | 'right') => void;
  onCenterPlayer: () => void;
}

// ... StorageBlocks ... keep existing
const StorageBlocks: React.FC<{ current: number, max: number }> = ({ current, max }) => {
    return (
        <div className="flex items-center gap-0.5 md:gap-1">
            {Array.from({ length: Math.max(current, max) }).map((_, i) => {
                const isFilled = i < current;
                const isOverflow = i >= max;
                return (
                    <div 
                        key={i} 
                        className={`
                            w-1.5 h-3 md:w-2.5 md:h-4 rounded-[1px] md:rounded-sm transition-all duration-300
                            ${isOverflow 
                                ? 'bg-amber-500 shadow-[0_0_4px_#f59e0b]' 
                                : isFilled 
                                    ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' 
                                    : 'bg-emerald-900/30 border border-emerald-500/30'
                            }
                        `}
                    />
                );
            })}
        </div>
    );
};

// ... ItemIcon ... keep existing
const ItemIcon: React.FC<{ item?: Item, def?: any, size?: string, opacity?: number, grayscale?: boolean }> = ({ item, def, size = "w-8 h-8 md:w-10 md:h-10", opacity = 1, grayscale = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const target = item || def;
        if (!target) return;

        // Color mapping for visuals
        let visualColor = '#fff';
        const rarity = target.rarity || 'COMMON';
        if (rarity === 'COMMON') visualColor = '#cbd5e1';
        if (rarity === 'UNCOMMON') visualColor = '#4ade80';
        if (rarity === 'RARE') visualColor = '#c084fc';
        if (rarity === 'LEGENDARY') visualColor = '#fbbf24';

        const img = itemRenderer.getItemImage(target.visualType, visualColor, rarity);
        ctx.clearRect(0,0,64,64);
        
        ctx.globalAlpha = opacity;
        if (grayscale) ctx.filter = 'grayscale(100%) brightness(0.7)';
        ctx.drawImage(img, 0,0,64,64);
        ctx.filter = 'none';
        ctx.globalAlpha = 1.0;

    }, [item, def, opacity, grayscale]);

    return <canvas ref={canvasRef} width={64} height={64} className={`${size} object-contain`} />;
};

// New Status Icon Component
const StatusIcon: React.FC<{ status: ActiveStatus }> = ({ status }) => {
    const now = Date.now();
    const remaining = status.expiresAt ? Math.max(0, status.expiresAt - now) : Infinity;
    const isPermanent = !status.expiresAt || status.expiresAt > now + 80000000; // > 22 hours
    const isNegative = status.type.includes('STATUS_FATIGUE') || status.type.includes('CURSE') || status.type.includes('RISK') || status.type.includes('VISION') || status.type.includes('OFFLINE');
    
    // Icon Mapping
    const getIcon = () => {
        if (status.type.includes('SCANNER')) return <Scan className="w-4 h-4" />;
        if (status.type.includes('FATIGUE')) return <Activity className="w-4 h-4" />;
        if (status.type.includes('GOLD_RUSH')) return <Pickaxe className="w-4 h-4" />;
        if (status.type.includes('FREE_BUILD')) return <Hammer className="w-4 h-4" />;
        if (status.type.includes('TUNNEL')) return <EyeOff className="w-4 h-4" />;
        if (status.type.includes('CURSE')) return <Skull className="w-4 h-4" />;
        if (status.type.includes('RISK')) return <Flame className="w-4 h-4" />;
        if (status.type.includes('OFFLINE')) return <WifiOff className="w-4 h-4" />;
        return <AlertTriangle className="w-4 h-4" />;
    };

    const colorClass = isNegative ? 'text-red-400 border-red-500/50 bg-red-950/80' : 'text-emerald-400 border-emerald-500/50 bg-emerald-950/80';
    const glowClass = isNegative ? 'shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'shadow-[0_0_10px_rgba(52,211,153,0.3)]';

    return (
        <div className={`
            relative group flex items-center justify-center w-10 h-10 rounded-full border backdrop-blur-md transition-all hover:scale-110 cursor-help
            ${colorClass} ${glowClass} animate-pulse-slow
        `}>
            {getIcon()}
            
            {/* Countdown Ring (SVG) */}
            {!isPermanent && status.expiresAt && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="100" strokeDashoffset={100 - (remaining / (status.type.includes('GOLD') ? 60000 : 30000)) * 100} className="opacity-50" />
                </svg>
            )}

            {/* Tooltip */}
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col gap-1">
                <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-700 pb-1 mb-1">{status.label}</div>
                <div className="text-[10px] text-slate-400 leading-tight mb-2">
                    {status.description || status.label}
                </div>
                <div className={`text-[10px] font-mono font-bold text-right ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isPermanent ? 'ACTIVE' : `${Math.ceil(remaining / 1000)}s LEFT`}
                </div>
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900/95"></div>
            </div>
        </div>
    );
};

const GameHUD: React.FC<GameHUDProps> = ({ hoveredHexId, onRotateCamera, onCenterPlayer }) => {
  // ... state hooks ... keep existing
  const grid = useGameStore(state => state.session?.grid);
  const player = useGameStore(state => state.session?.player);
  const bots = useGameStore(state => state.session?.bots);
  const winCondition = useGameStore(state => state.session?.winCondition);
  const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
  const gameStatus = useGameStore(state => state.session?.gameStatus);
  const isPlayerGrowing = useGameStore(state => state.session?.isPlayerGrowing);
  const playerGrowthIntent = useGameStore(state => state.session?.playerGrowthIntent);
  const sessionStartTime = useGameStore(state => state.session?.sessionStartTime);
  const difficulty = useGameStore(state => state.session?.difficulty || 'MEDIUM');
  const monumentRequirements = useGameStore(state => state.session?.monumentRequirements); 
  
  const language = useGameStore(state => state.language);
  const user = useGameStore(state => state.user);
  const voidDialogTarget = useGameStore(state => state.voidDialogTarget);
  const monumentDialogState = useGameStore(state => state.monumentDialogState);
  
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
  const downloadSessionLog = useGameStore(state => state.downloadSessionLog);
  const destroyItem = useGameStore(state => state.destroyItem);
  const closeVoidDialog = useGameStore(state => state.closeVoidDialog);
  const restoreVoidHex = useGameStore(state => state.restoreVoidHex);
  
  const closeMonumentDialog = useGameStore(state => state.closeMonumentDialog);
  const placeItemInMonument = useGameStore(state => state.placeItemInMonument);
  const removeItemFromMonument = useGameStore(state => state.removeItemFromMonument);
  const activateMonument = useGameStore(state => state.activateMonument);
  
  const startCampaignLevel = useGameStore(state => state.startCampaignLevel);
  const startNewGame = useGameStore(state => state.startNewGame);

  const [showExitConfirmation, setShowExitConfirmation] = useState(false);
  const [isRankingsOpen, setIsRankingsOpen] = useState(false);
  const [isCodexOpen, setIsCodexOpen] = useState(false);
  const [helpTopic, setHelpTopic] = useState<'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY' | null>(null);
  
  const [isSystemMenuOpen, setIsSystemMenuOpen] = useState(false);
  const systemMenuRef = useRef<HTMLDivElement>(null);
  
  const [showMissionDetails, setShowMissionDetails] = useState(false);
  const [inspectedItem, setInspectedItem] = useState<Item | null>(null);

  const [timeLeft, setTimeLeft] = useState(60);
  const [tick, setTick] = useState(0); 

  const [victoryStage, setVictoryStage] = useState<'HIDDEN' | 'SALUTE' | 'MODAL'>('HIDDEN');

  const t = TEXT[language].HUD;
  
  const queueSize = winCondition?.queueSize || 3;
  const currentHex = (grid && player) ? grid[getHexKey(player.q, player.r)] : undefined;
  const neighbors = player ? getNeighbors(player.q, player.r) : [];
  const safeBots = useMemo(() => (bots || []).filter(b => b && typeof b.q === 'number' && typeof b.r === 'number'), [bots]);
  const botPositions = useMemo(() => safeBots.map(b => ({ q: b.q, r: b.r })), [safeBots]);
  const isMoving = player?.state === EntityState.MOVING;
  
  const isMobile = deviceType === 'MOBILE';

  const isLevel1_1 = activeLevelConfig?.id === '1.1';
  const isLevel1_2 = activeLevelConfig?.id === '1.2';
  const isLevel1_3 = activeLevelConfig?.id === '1.3';
  const isLevel1_4 = activeLevelConfig?.id === '1.4';
  const isLevel1_5 = activeLevelConfig?.id === '1.5';
  const isLevel1_6 = activeLevelConfig?.id === '1.6';

  const isBriefingActive = gameStatus === 'BRIEFING';

  // HELPER: Resolve localized strings for an item dynamically
  const resolveItemText = (item: Item) => {
      const def = getItemDef(item.baseId);
      if (!def) return { 
          name: item.name, 
          description: item.description, 
          effectDesc: item.effectDescription, 
          negDesc: item.negativeEffectLabel
      };
      return {
          name: def.name[language],
          description: def.description[language],
          effectDesc: def.effectLabel[language],
          negDesc: def.negativeEffectLabel[language]
      };
  };

  useEffect(() => {
      if (gameStatus === 'VICTORY' && victoryStage === 'HIDDEN') {
          setVictoryStage('SALUTE');
          const timer = setTimeout(() => {
              setVictoryStage(current => current === 'SALUTE' ? 'MODAL' : current);
          }, 5000);
          return () => clearTimeout(timer);
      } else if (gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT') {
          setVictoryStage('HIDDEN');
      }
  }, [gameStatus]);

  const isHudVisible = victoryStage === 'HIDDEN' && !isBriefingActive;

  // --- LIVE RANKINGS CALCULATION ---
  const liveRankings = useMemo(() => {
      if (!player) return [];
      const botList = bots || [];
      
      const list = [
          {
              id: player.id,
              nickname: user?.nickname || (language === 'RU' ? 'Вы' : 'You'),
              isPlayer: true,
              level: player.playerLevel,
              coins: player.coins,
              moves: player.moves,
              color: player.avatarColor || '#3b82f6'
          },
          ...botList.map(b => ({
              id: b.id,
              nickname: language === 'RU' ? `Ривал ${b.id.replace('bot-', '')}` : `Rival ${b.id.replace('bot-', '')}`,
              isPlayer: false,
              level: b.playerLevel,
              coins: b.coins,
              moves: b.moves,
              color: b.avatarColor || '#ef4444'
          }))
      ];
      
      return list.sort((a, b) => {
          if (b.level !== a.level) return b.level - a.level;
          if (b.coins !== a.coins) return b.coins - a.coins;
          return b.moves - a.moves;
      });
  }, [player, bots, user, language]);

  const recoveryState = useMemo(() => {
      if (!currentHex || !player) return { canRecover: false, label: '', cooling: false, remainingCd: 0 };
      
      const isHighLevel = currentHex.maxLevel >= GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD;
      
      if (isHighLevel) {
          const now = Date.now();
          const lastUsed = currentHex.lastRecoveryTime || 0;
          const remaining = Math.max(0, GAME_CONFIG.RECOVERY_COOLDOWN_MS - (now - lastUsed));
          const cooling = remaining > 0;
          const uses = currentHex.recoveryPoints ?? GAME_CONFIG.MAX_RECOVERY_POINTS;
          
          if (cooling) {
              return { canRecover: false, label: `${Math.ceil(remaining/1000)}s`, cooling: true, remainingCd: remaining };
          }
          return { canRecover: true, label: `${uses}/${GAME_CONFIG.MAX_RECOVERY_POINTS}`, cooling: false, remainingCd: 0 };
      } else {
          const can = !player.recoveredCurrentHex;
          return { canRecover: can, label: '', cooling: false, remainingCd: 0 };
      }
  }, [currentHex, player, tick]); 

  useEffect(() => {
      const interval = setInterval(() => {
          setTick(t => t + 1);
          if (isLevel1_5 && gameStatus === 'PLAYING') {
              const elapsed = Date.now() - (sessionStartTime || 0);
              const remaining = Math.max(0, 60 - Math.floor(elapsed / 1000));
              setTimeLeft(remaining);
          }
      }, 250);
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
    let currentStepNeeded = 30; 

    if (playerGrowthIntent === 'RECOVER') {
        totalNeeded = getSecondsToGrow(currentHex.maxLevel);
        mode = 'RECOVERY';
        currentStepNeeded = totalNeeded;
    } else if (playerGrowthIntent === 'DIG') {
        mode = 'DIG';
        currentStepNeeded = 30; 
    } else { 
        mode = 'UPGRADE';
        currentStepNeeded = getSecondsToGrow(currentHex.currentLevel + 1);
    }

    const currentStepProgress = currentHex.progress;
    const percent = currentStepNeeded > 0 ? (currentStepProgress / currentStepNeeded) * 100 : 0;
    const remainingTicks = Math.max(0, currentStepNeeded - currentStepProgress);
    const remainingSeconds = remainingTicks * 0.1;

    return { remainingSeconds, percent, mode };
  }, [currentHex, isPlayerGrowing, canUpgrade, canDig, playerGrowthIntent]);

  const digTooltip = useMemo(() => {
      if (isMoving) return "Unit is moving";
      if (!digCondition.canGrow) return digCondition.reason || "Cannot Excavate";
      return "Excavate Sector (Lower Level)";
  }, [isMoving, digCondition]);

  const recoverTooltip = useMemo(() => {
      if (isMoving) return "Unit is moving";
      if (recoveryState.cooling) return `SYSTEM COOLING: ${recoveryState.label} remaining`;
      if (!recoveryState.canRecover) return "Already recovered here. Move to another sector to reset tools.";
      if (currentHex && currentHex.maxLevel >= GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD) {
          return `Advanced Recovery (${recoveryState.label} uses left)`;
      }
      return "Recover Resources (Gain Moves & Credits)";
  }, [isMoving, recoveryState, currentHex]);

  const upgradeTooltip = useMemo(() => {
      if (isMoving) return "Unit is moving";
      if (!upgradeCondition.canGrow) return upgradeCondition.reason || "Cannot Upgrade";
      return "Upgrade Sector (Increase Level)";
  }, [isMoving, upgradeCondition]);

  const renderActiveStatuses = () => {
      if (!player?.activeStatuses || player.activeStatuses.length === 0) return null;
      
      const now = Date.now();
      const validStatuses = player.activeStatuses.filter(s => !s.expiresAt || s.expiresAt > now);

      if (validStatuses.length === 0) return null;

      return (
          <div className="flex gap-4 mb-3 justify-center w-full pointer-events-auto">
              {validStatuses.map((status, idx) => (
                  <StatusIcon key={`${status.type}-${idx}`} status={status} />
              ))}
          </div>
      );
  };

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

  const handleNextLevel = () => {
      playUiSound('CLICK');
      if (activeLevelConfig) {
          const currentIdx = CAMPAIGN_LEVELS.findIndex(l => l.id === activeLevelConfig.id);
          const nextLevel = CAMPAIGN_LEVELS[currentIdx + 1];
          if (nextLevel) {
              startCampaignLevel(nextLevel.id);
          } else {
              abandonSession(); 
          }
      } else {
          abandonSession();
      }
  };

  const handleRetry = () => {
      playUiSound('CLICK');
      if (activeLevelConfig) {
          startCampaignLevel(activeLevelConfig.id);
      } else if (winCondition) {
          startNewGame(winCondition);
      } else {
          abandonSession();
      }
  };

  const handleStartMission = () => {
      playUiSound('SUCCESS');
      startMission();
  };

  // OPTIMIZATION: Reduced main button size to save space
  const mainButtonSize = "lg";

  const renderMissionStatus = () => {
      if (isLevel1_5 && timeLeft !== null) {
           const isCrit = timeLeft < 10;
           return (
               <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold font-mono">
                   <span className="text-slate-400">COINS:</span>
                   <span className={player.coins >= 150 ? "text-emerald-400" : "text-white"}>{player.coins}/150</span>
                   <span className={`ml-1 ${isCrit ? "text-red-500 animate-pulse" : "text-amber-400"}`}>{timeLeft}s</span>
               </div>
           );
      }
      
      if (campaignMetrics) {
          const isDone = campaignMetrics.current >= campaignMetrics.target;
          return (
               <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold font-mono">
                   <span className="text-slate-400 uppercase">{campaignMetrics.label}:</span>
                   <span className={isDone ? "text-emerald-400" : "text-white"}>
                      {campaignMetrics.current}/{campaignMetrics.target}
                   </span>
               </div>
          );
      }
      
      if (winCondition?.winType === 'SUMMIT') {
          return (
               <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold font-mono">
                   <span className="text-slate-400">SUMMIT:</span>
                   <span className="text-amber-400">LEVEL {winCondition?.targetLevel}</span>
                   <Mountain className="w-3 h-3 text-amber-500" />
               </div>
          );
      }
      
      return (
           <div className="flex items-center gap-2 text-[9px] md:text-[10px] font-bold font-mono">
               <span className="text-slate-400">GOAL:</span>
               <span className="text-white">L{winCondition?.targetLevel}</span>
               <span className="text-amber-400">{winCondition?.targetCoins}cr</span>
           </div>
      );
  };

  const handleDragStart = (e: React.DragEvent, item: any) => {
      e.dataTransfer.setData("itemId", item.id);
  };

  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
      e.preventDefault();
      const itemId = e.dataTransfer.getData("itemId");
      const item = player?.inventory.find(i => i.id === itemId);
      
      if (item && monumentRequirements && monumentRequirements.length > slotIndex) {
          const reqId = monumentRequirements[slotIndex];
          if (reqId !== 'ANY' && item.baseId !== reqId) {
              playUiSound('ERROR');
              return;
          }
          if (!monumentDialogState.slots.some(s => s?.id === itemId)) {
              placeItemInMonument(item, slotIndex);
          }
      }
  };

  const handleAllowDrop = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleInventoryClick = (item: Item) => {
      if (monumentDialogState.isOpen) {
          if (!monumentRequirements) return;

          const matchingSlotIndex = monumentRequirements.findIndex((reqId, idx) => {
              return (reqId === 'ANY' || reqId === item.baseId) && monumentDialogState.slots[idx] === null;
          });

          if (matchingSlotIndex !== -1 && !monumentDialogState.slots.some(s => s?.id === item.id)) {
              placeItemInMonument(item, matchingSlotIndex);
          } else {
              playUiSound('ERROR');
          }
      } else {
          setInspectedItem(item);
          playUiSound('CLICK');
      }
  };

  const handleVoidRestore = (item: Item) => {
      if (voidDialogTarget) {
          restoreVoidHex(item.id);
      }
  };

  if (!grid || !player || !bots) return null;

  let briefingTitle = winCondition?.label || "Mission Briefing";
  let briefingDesc = t.BRIEFING_DESC_TEMPLATE
      .replace('{0}', (winCondition?.targetLevel || 99).toString())
      .replace('{1}', (winCondition?.targetCoins || 0).toString());

  if (activeLevelConfig) {
      const levelKey = activeLevelConfig.id.replace('.', '_');
      const titleKey = `LEVEL_${levelKey}_TITLE` as keyof typeof TEXT.EN.CAMPAIGN;
      const descKey = `LEVEL_${levelKey}_DESC` as keyof typeof TEXT.EN.CAMPAIGN;
      briefingTitle = TEXT[language].CAMPAIGN[titleKey] || activeLevelConfig.title;
      briefingDesc = TEXT[language].CAMPAIGN[descKey] || activeLevelConfig.description;
  } else if (winCondition?.winType === 'SUMMIT') {
      briefingDesc = `SCENARIO: KING OF THE HILL\n\nA dormant Monument has been detected in the sector. It stands at Level ${winCondition.targetLevel}.\n\nYour unit cannot jump directly to the summit. You must construct a staircase (Raise adjacent terrain to Level ${winCondition.targetLevel - 1}, then jump).`;
  }

  const availableInventory = player.inventory.filter(i => !monumentDialogState.slots.some(s => s?.id === i.id));
  const isMonumentReady = monumentDialogState.slots.every(s => s !== null);

  const getRarityBorder = (rarity: ItemRarity) => {
      switch(rarity) {
          case 'COMMON': return 'border-slate-400';
          case 'UNCOMMON': return 'border-emerald-400';
          case 'RARE': return 'border-purple-500';
          case 'LEGENDARY': return 'border-amber-500 animate-pulse';
          default: return 'border-slate-600';
      }
  };

  const inventoryList = [0, 1, 2, 3, 4];
  const inspectedData = inspectedItem ? resolveItemText(inspectedItem) : null;

  const getHelpContent = () => {
      switch(helpTopic) {
          case 'RANK': return { title: t.RANK, desc: t.HELP_RANK_DESC, hint: t.HELP_RANK_GOAL.replace('{0}', String(winCondition?.targetLevel || 0)) };
          case 'MATERIAL': return { title: t.MATERIAL, desc: t.HELP_MAT_DESC, hint: t.HELP_MAT_GOAL };
          case 'COINS': return { title: t.CREDITS, desc: t.HELP_COINS_DESC, hint: t.HELP_COINS_GOAL.replace('{0}', String(winCondition?.targetCoins || 0)) };
          case 'MOVES': return { title: t.MOVES, desc: t.HELP_MOVES_DESC, hint: t.HELP_MOVES_HINT };
          case 'ENTROPY': 
              return { 
                  title: t.HELP_ENTROPY_TITLE, 
                  desc: t.HELP_ENTROPY_DESC,
                  extra: [t.HELP_ENTROPY_DRAIN, t.HELP_ENTROPY_SHIFT, t.HELP_ENTROPY_GAIN],
                  hint: "Monitor the gauge carefully." 
              };
          default: return null;
      }
  };
  const helpData = getHelpContent();

  return (
    <div className="absolute inset-0 pointer-events-none z-30 select-none">
      
      {victoryStage === 'SALUTE' && (
          <div 
              className="absolute inset-0 z-[150] pointer-events-auto cursor-pointer"
              onClick={() => setVictoryStage('MODAL')}
              onTouchStart={() => setVictoryStage('MODAL')}
          />
      )}

      {/* EXIT CONFIRMATION MODAL */}
      {showExitConfirmation && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={() => setShowExitConfirmation(false)}>
              <div className="bg-slate-900 border border-red-900/50 p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                  <div className="w-12 h-12 rounded-full bg-red-900/20 flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                      <LogOut className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="text-lg font-black text-white uppercase mb-2">{t.ABORT_TITLE}</h3>
                  <p className="text-xs text-slate-400 mb-6">{t.ABORT_DESC}</p>
                  <div className="flex gap-3">
                      <button 
                          onClick={() => { setShowExitConfirmation(false); playUiSound('CLICK'); }} 
                          className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase text-xs transition-colors"
                      >
                          {t.BTN_CANCEL}
                      </button>
                      <button 
                          onClick={() => { abandonSession(); playUiSound('CLICK'); }} 
                          className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs transition-colors shadow-lg shadow-red-900/20"
                      >
                          {t.BTN_CONFIRM}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MISSION DETAILS */}
      {(showMissionDetails || isBriefingActive) && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-6 pointer-events-auto animate-in fade-in duration-300">
              <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col gap-6 p-6 animate-in zoom-in-95">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
                  <button onClick={() => isBriefingActive ? handleStartMission() : setShowMissionDetails(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20">
                      <X className="w-6 h-6"/>
                  </button>
                  <div className="flex flex-col items-center text-center mt-2">
                      <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 border border-slate-800 shadow-inner">
                          <Target className="w-8 h-8 text-indigo-400" />
                      </div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tighter">{briefingTitle}</h2>
                      <div className="flex items-center gap-2 mt-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${difficulty === 'HARD' ? 'bg-red-900/30 text-red-400 border border-red-900/50' : (difficulty === 'MEDIUM' ? 'bg-amber-900/30 text-amber-400 border border-amber-900/50' : 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50')}`}>
                              {difficulty}
                          </span>
                          {bots && bots.length > 0 && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-900/20 text-red-400 border border-red-900/30 flex items-center gap-1">
                                  <Swords className="w-3 h-3"/> {t.BRIEFING_RIVAL}
                              </span>
                          )}
                      </div>
                  </div>
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800/50 max-h-[40vh] overflow-y-auto no-scrollbar">
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-mono">{briefingDesc}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex flex-col items-center text-center gap-1">
                          <ChevronsUp className="w-4 h-4 text-amber-400" />
                          <span className="text-[9px] text-slate-500 uppercase font-bold">{t.HINT_RANK}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex flex-col items-center text-center gap-1">
                          <Wallet className="w-4 h-4 text-emerald-400" />
                          <span className="text-[9px] text-slate-500 uppercase font-bold">{t.HINT_CREDITS}</span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg border border-slate-800 flex flex-col items-center text-center gap-1">
                          <Footprints className="w-4 h-4 text-blue-400" />
                          <span className="text-[9px] text-slate-500 uppercase font-bold">{t.HINT_MOVES}</span>
                      </div>
                  </div>
                  <button onClick={() => isBriefingActive ? handleStartMission() : setShowMissionDetails(false)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl uppercase tracking-widest shadow-xl shadow-indigo-900/30 transition-all active:scale-95 flex items-center justify-center gap-2">
                      {isBriefingActive ? t.BRIEFING_BTN_START : t.BTN_READY}
                  </button>
              </div>
          </div>
      )}

      {/* HEADER HUD */}
      {isHudVisible && (
      <div className="absolute inset-x-0 top-0 p-2 md:p-4 pointer-events-none z-30 pt-[max(0.5rem,env(safe-area-inset-top))] animate-in fade-in">
          <div className="w-full flex justify-between items-start gap-2 md:gap-2 max-w-7xl mx-auto relative">
               <div className="flex flex-col gap-2">
                   <div className="pointer-events-auto flex items-center bg-slate-900/95 backdrop-blur-xl rounded-xl md:rounded-2xl border border-slate-700/50 shadow-xl px-2 py-1.5 md:px-3 md:py-2 gap-2 md:gap-4 transition-all duration-300 hover:border-slate-600/50 overflow-x-auto no-scrollbar mask-linear-fade flex-1 md:flex-none md:w-fit md:shrink-0 max-w-[calc(100vw-80px)] md:max-w-none">
                       <div onClick={() => { setHelpTopic('RANK'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                           <div className="w-4.5 h-4.5 md:w-10 md:h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                               <Crown className="w-3 h-3 md:w-5 md:h-5 text-white" />
                           </div>
                           <div className="flex flex-col justify-center">
                               <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">{t.RANK}</span>
                               <span className="text-xs md:text-xl font-black text-white leading-none">{player.playerLevel}</span>
                           </div>
                       </div>
                       <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0"></div>
                       <div onClick={() => { setHelpTopic('MATERIAL'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                           <div className="w-4.5 h-4.5 md:w-10 md:h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/30 group-hover:bg-emerald-500/20 transition-colors">
                               <Box className="w-3 h-3 md:w-5 md:h-5 text-emerald-400" />
                           </div>
                           <div className="flex flex-col justify-center">
                               <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">{t.MATERIAL}</span>
                               <StorageBlocks current={player.storage} max={player.maxStorage} />
                           </div>
                       </div>
                       <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0"></div>
                       <div onClick={() => { setHelpTopic('COINS'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                           <div className="w-4.5 h-4.5 md:w-10 md:h-10 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/30">
                               <Wallet className="w-3 h-3 md:w-5 md:h-5 text-amber-400" />
                           </div>
                           <div className="flex flex-col justify-center">
                               <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">{t.CREDITS}</span>
                               <span className="text-xs md:text-xl font-black text-white leading-none">{player.coins}</span>
                           </div>
                       </div>
                       <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0"></div>
                       <div onClick={() => { setHelpTopic('MOVES'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0 pr-1">
                           <div className={`w-4.5 h-4.5 md:w-10 md:h-10 rounded-lg flex items-center justify-center transition-colors ${isMoving ? 'bg-blue-600 animate-pulse' : 'bg-blue-500/10 border border-blue-500/30'}`}>
                               <Footprints className={`w-3 h-3 md:w-5 md:h-5 ${isMoving ? 'text-white' : 'text-blue-400'}`} />
                           </div>
                           <div className="flex flex-col justify-center">
                               <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">{t.MOVES}</span>
                               <span className="text-xs md:text-xl font-black text-white leading-none">{player.moves}</span>
                           </div>
                       </div>
                       <div className="w-px h-5 md:h-8 bg-slate-800 shrink-0"></div>
                       <div onClick={() => { setHelpTopic('ENTROPY'); playUiSound('CLICK'); }} className="relative flex items-center gap-1.5 md:gap-2 cursor-pointer group shrink-0">
                           <div className="w-4.5 h-4.5 md:w-10 md:h-10 rounded-lg bg-slate-800 flex items-center justify-center border border-slate-700">
                               <EntropyGauge className="w-4 h-4 md:w-8 md:h-8" />
                           </div>
                           <div className="flex flex-col justify-center">
                               <span className="text-[7px] md:text-[9px] text-slate-400 font-bold uppercase tracking-wider leading-none mb-0.5">STABLE</span>
                           </div>
                       </div>
                   </div>
               </div>

               <div className="pointer-events-auto flex items-start shrink-0 relative z-50">
                   <div className="relative">
                        <button onClick={() => { setIsSystemMenuOpen(!isSystemMenuOpen); playUiSound('CLICK'); }} className={`w-9 h-9 md:w-12 md:h-12 flex items-center justify-center backdrop-blur-xl border rounded-xl transition-all shadow-lg active:scale-95 ${isSystemMenuOpen ? 'bg-slate-800 border-slate-500 text-white' : 'bg-slate-900/80 border-slate-700/50 text-slate-400 hover:text-white'}`}>
                            {isSystemMenuOpen ? <X className="w-4 h-4 md:w-5 md:h-5" /> : <Settings className="w-4 h-4 md:w-5 md:h-5" />}
                        </button>
                        {isSystemMenuOpen && (
                            <div ref={systemMenuRef} className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[180px] z-[60] animate-in slide-in-from-top-2 duration-200">
                                <div className="flex gap-2">
                                    <button onClick={() => { toggleMusic(); playUiSound('CLICK'); }} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isMusicMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-indigo-900/40 border-indigo-500/50 text-indigo-400'}`}>{isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}</button>
                                    <button onClick={() => { toggleSfx(); playUiSound('CLICK'); }} className={`flex-1 flex items-center justify-center p-2 rounded-lg transition-colors border ${isSfxMuted ? 'bg-slate-800 border-slate-700 text-slate-500' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-400'}`}>{isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
                                </div>
                                <button onClick={() => { setLanguage(language === 'EN' ? 'RU' : 'EN'); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600">
                                    <Globe className="w-4 h-4 text-sky-400" />
                                    <span className="text-xs font-bold uppercase">{language === 'EN' ? 'English' : 'Русский'}</span>
                                </button>
                                <button onClick={() => { setIsCodexOpen(true); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors w-full text-left border border-transparent hover:border-slate-600">
                                    <BookOpen className="w-4 h-4 text-purple-400" />
                                    <span className="text-xs font-bold uppercase">{language === 'RU' ? 'База Предметов' : 'Item Codex'}</span>
                                </button>
                                <button onClick={() => { setIsRankingsOpen(true); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left border bg-slate-800/50 border-transparent hover:bg-slate-800 text-slate-300 hover:text-white`}>
                                    <Trophy className="w-4 h-4 text-amber-500" />
                                    <span className="text-xs font-bold uppercase">{t.LEADERBOARD_TITLE}</span>
                                </button>
                                <button onClick={() => { downloadSessionLog(); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-indigo-900/20 hover:bg-indigo-900/40 text-indigo-400 hover:text-indigo-200 border border-indigo-900/30 hover:border-indigo-500/50 transition-colors w-full text-left">
                                    <FileText className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">Session Log</span>
                                </button>
                                <div className="h-px bg-slate-700/50 my-1"></div>
                                <button onClick={() => { setShowExitConfirmation(true); setIsSystemMenuOpen(false); playUiSound('CLICK'); }} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-900/10 hover:bg-red-900/30 text-red-400 hover:text-red-200 border border-red-900/30 hover:border-red-500/50 transition-colors w-full text-left">
                                    <LogOut className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase">{t.BTN_CONFIRM}</span>
                                </button>
                            </div>
                        )}
                   </div>
               </div>
          </div>
      </div>
      )}

      {/* FOOTER ACTION DOCK */}
      {isHudVisible && gameStatus === 'PLAYING' && (
          <div className="absolute inset-x-0 bottom-0 p-1 md:p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-6 pointer-events-none flex flex-col items-center justify-end">
              <div className="mb-2 pointer-events-auto">
                  {renderActiveStatuses()}
              </div>
              <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl p-1 md:p-1.5 pointer-events-auto flex items-end gap-1 md:gap-3 relative max-w-full overflow-hidden">
                  <div className="flex flex-col gap-1 md:gap-1.5 justify-end pb-0.5">
                      <div className="flex items-center gap-2 px-2 py-1 bg-black/40 rounded border border-white/5 cursor-pointer hover:bg-white/10 transition-colors" onClick={() => { setShowMissionDetails(true); playUiSound('CLICK'); }}>
                          {renderMissionStatus()}
                          <Info className="w-3 h-3 text-slate-500" />
                      </div>
                      <div className="flex items-center gap-0.5 md:gap-1">
                          {inventoryList.map(index => {
                              const item = player.inventory[index];
                              const slotSize = "w-7 h-7 md:w-9 md:h-9"; 
                              return (
                                  <div 
                                      key={index} 
                                      onClick={() => item && handleInventoryClick(item)}
                                      className={`
                                          ${slotSize} rounded-lg border flex items-center justify-center relative group cursor-pointer transition-all
                                          ${item 
                                              ? `bg-slate-800 ${getRarityBorder(item.rarity)} shadow-md hover:scale-105 active:scale-95` 
                                              : 'bg-slate-950/30 border-slate-800/50 border-dashed'}
                                      `}
                                  >
                                      {item ? <ItemIcon item={item} size={slotSize} /> : <div className="w-1 h-1 rounded-full bg-slate-800" />}
                                  </div>
                              );
                          })}
                      </div>
                  </div>
                  <div className="w-px h-14 md:h-16 bg-gradient-to-b from-transparent via-slate-500/30 to-transparent"></div>
                  <div className="flex items-end gap-1 md:gap-2">
                      <HexButton variant="red" size={mainButtonSize} onClick={() => { togglePlayerGrowth('DIG'); onCenterPlayer(); }} active={isPlayerGrowing && playerGrowthIntent === 'DIG'} disabled={!canDig} progress={timeData.mode === 'DIG' ? timeData.percent : 0} className={isPlayerGrowing && playerGrowthIntent === 'DIG' ? 'ring-4 ring-red-500/20 rounded-full' : ''} title={digTooltip}>
                          <Pickaxe className={`w-4 h-4 md:w-8 md:h-8 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'DIG' ? 'scale-110 rotate-12' : ''}`} />
                      </HexButton>
                      <HexButton variant="amber" size={mainButtonSize} onClick={() => { togglePlayerGrowth('UPGRADE'); onCenterPlayer(); }} active={isPlayerGrowing && playerGrowthIntent === 'UPGRADE'} disabled={!canUpgrade} pulsate={canUpgrade && !isPlayerGrowing} progress={timeData.mode === 'UPGRADE' ? timeData.percent : 0} className={isPlayerGrowing && playerGrowthIntent === 'UPGRADE' ? '-translate-y-1 ring-4 ring-amber-500/20 rounded-full' : ''} title={upgradeTooltip}>
                          <ChevronsUp className={`w-5 h-5 md:w-10 md:h-10 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'UPGRADE' ? 'scale-110 -translate-y-1' : ''}`} />
                      </HexButton>
                      <HexButton variant="blue" size={mainButtonSize} onClick={() => { togglePlayerGrowth('RECOVER'); onCenterPlayer(); }} active={isPlayerGrowing && playerGrowthIntent === 'RECOVER'} disabled={!recoveryState.canRecover} progress={timeData.mode === 'RECOVERY' ? timeData.percent : 0} className={isPlayerGrowing && playerGrowthIntent === 'RECOVER' ? 'ring-4 ring-blue-500/20 rounded-full' : ''} title={recoverTooltip}>
                          {recoveryState.cooling ? (
                              <div className="flex flex-col items-center">
                                  <Hourglass className="w-3 h-3 md:w-6 md:h-6 animate-spin-slow" />
                                  <span className="text-[8px] md:text-[10px] font-mono mt-0.5">{recoveryState.label}</span>
                              </div>
                          ) : (
                              <>
                                <RefreshCw className={`w-4 h-4 md:w-8 md:h-8 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'RECOVER' ? 'scale-110 rotate-180' : ''}`} />
                                {recoveryState.label && <span className="absolute -bottom-1 md:-bottom-2 bg-slate-900 px-1 rounded text-[7px] md:text-[8px] font-bold text-emerald-400">{recoveryState.label}</span>}
                              </>
                          )}
                      </HexButton>
                  </div>
              </div>
          </div>
      )}

      {/* INSPECTION CARD */}
      {inspectedItem && inspectedData && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6 pointer-events-auto animate-in fade-in duration-200">
              <div className="bg-slate-950 border border-slate-700 rounded-3xl shadow-2xl max-w-sm w-full relative overflow-hidden flex flex-col gap-6 p-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setInspectedItem(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-6 h-6"/></button>
                  <div className="flex flex-col items-center">
                      <div className="w-32 h-32 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 shadow-inner">
                          <ItemIcon item={inspectedItem} size="w-24 h-24" />
                      </div>
                      <h3 className="text-xl font-black text-white uppercase tracking-tight text-center">{inspectedData.name}</h3>
                      <span className={`text-xs font-bold uppercase mt-1 px-2 py-0.5 rounded-full bg-slate-900 border ${getRarityBorder(inspectedItem.rarity)} text-slate-300`}>{inspectedItem.rarity}</span>
                  </div>
                  <p className="text-sm text-slate-400 text-center italic leading-relaxed border-t border-b border-slate-800 py-4">"{inspectedData.description}"</p>
                  <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-900/50">
                          <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                          <div>
                              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest block mb-0.5">On Restoration Success</span>
                              <span className="text-xs text-emerald-100 font-mono">{inspectedData.effectDesc}</span>
                          </div>
                      </div>
                      {inspectedItem.negativeEffectType && (
                          <div className="flex items-start gap-3 p-3 rounded-xl bg-red-950/30 border border-red-900/50">
                              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                              <div>
                                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block mb-0.5">On Restoration Failure</span>
                                  <span className="text-xs text-red-100 font-mono">{inspectedData.negDesc}</span>
                              </div>
                          </div>
                      )}
                  </div>
                  <div className="flex gap-3 mt-2">
                      <button onClick={() => { destroyItem(inspectedItem.id); setInspectedItem(null); }} className="flex-1 py-3 bg-slate-800 hover:bg-red-900/50 text-slate-400 hover:text-red-300 border border-slate-700 hover:border-red-800 rounded-xl font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 group">
                          <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform" /> Discard
                      </button>
                      <button onClick={() => setInspectedItem(null)} className="flex-1 py-3 bg-white text-black hover:bg-slate-200 rounded-xl font-black uppercase tracking-wider text-xs transition-colors">Close</button>
                  </div>
              </div>
          </div>
      )}
      
      {(gameStatus === 'DEFEAT' || (gameStatus === 'VICTORY' && victoryStage === 'MODAL')) && (
          <div className="absolute inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-700 pointer-events-auto p-4">
              <div className="flex flex-col items-center max-w-md w-full">
                  <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 shadow-[0_0_50px_currentColor] animate-bounce ${gameStatus === 'VICTORY' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-500'}`}>
                      {gameStatus === 'VICTORY' ? <Trophy className="w-12 h-12" /> : <XCircle className="w-12 h-12" />}
                  </div>
                  <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2 text-transparent bg-clip-text ${gameStatus === 'VICTORY' ? 'bg-gradient-to-b from-emerald-300 to-emerald-600' : 'bg-gradient-to-b from-red-300 to-red-600'}`}>{gameStatus === 'VICTORY' ? t.VICTORY : t.DEFEAT}</h1>
                  <p className="text-slate-400 font-mono text-sm tracking-widest uppercase mb-8">{gameStatus === 'VICTORY' ? t.MISSION_COMPLETE : t.MISSION_FAILED}</p>
                  <div className="w-full flex flex-col gap-3">
                      {gameStatus === 'VICTORY' && <button onClick={handleNextLevel} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase tracking-widest shadow-xl shadow-emerald-900/30 transition-all active:scale-95 flex items-center justify-center gap-2">{t.BTN_NEXT} <ArrowRight className="w-5 h-5" /></button>}
                      <button onClick={handleRetry} className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"><ReloadIcon className="w-4 h-4" /> {t.BTN_RETRY}</button>
                      <button onClick={() => abandonSession()} className="w-full py-4 bg-transparent hover:bg-slate-800/50 text-slate-500 hover:text-white font-bold rounded-xl uppercase tracking-widest transition-colors text-xs">{t.BTN_MENU}</button>
                  </div>
              </div>
          </div>
      )}

      {monumentDialogState.isOpen && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300 pointer-events-auto">
              <div className="bg-slate-950 border border-amber-900/50 p-6 rounded-3xl shadow-2xl max-w-2xl w-full relative overflow-hidden flex flex-col gap-6 animate-in zoom-in-95">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  <button onClick={closeMonumentDialog} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-6 h-6"/></button>
                  <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                      <div className="p-3 bg-amber-950/50 rounded-xl border border-amber-900/50 shadow-inner">
                          <Crown className="w-8 h-8 text-amber-500 drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
                      </div>
                      <div>
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{t.MONUMENT_TITLE}</h3>
                          <p className="text-xs text-amber-600 uppercase tracking-widest font-mono mt-1">{t.MONUMENT_SUB}</p>
                      </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed text-center px-4">
                      {t.MONUMENT_DESC_1} <span className="text-amber-400 font-bold">{t.MONUMENT_DESC_2}</span> {t.MONUMENT_DESC_3}
                      <br/>
                      <span className="text-xs opacity-60">
                          {difficulty === 'EASY' ? t.MONUMENT_REQ_EASY : (difficulty === 'MEDIUM' ? t.MONUMENT_REQ_MED : t.MONUMENT_REQ_HARD)}
                      </span>
                  </p>
                  <div className="flex flex-col md:flex-row gap-6 h-[300px]">
                      <div className="flex-1 bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
                          <div className="p-2 border-b border-slate-800 bg-slate-900">
                              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{t.MONUMENT_KEYS}</span>
                          </div>
                          <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                              {availableInventory.length === 0 ? (
                                  <div className="text-center text-slate-600 text-xs italic py-10">{t.MONUMENT_EMPTY_INV}</div>
                              ) : (
                                  availableInventory.map(item => {
                                      const dynamicText = resolveItemText(item);
                                      return (
                                          <div 
                                              key={item.id}
                                              draggable
                                              onDragStart={(e) => handleDragStart(e, item)}
                                              onClick={() => handleInventoryClick(item)}
                                              className={`flex items-center gap-3 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border cursor-grab active:cursor-grabbing group transition-all ${getRarityBorder(item.rarity)}`}
                                          >
                                              <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center border border-slate-800 overflow-hidden">
                                                  <ItemIcon item={item} size="w-8 h-8" />
                                              </div>
                                              <div className="flex flex-col min-w-0">
                                                  <span className="text-xs font-bold text-white group-hover:text-amber-200 truncate">{dynamicText.name}</span>
                                                  <span className="text-[9px] text-slate-500 uppercase">{item.rarity}</span>
                                              </div>
                                              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                                                  <ArrowRight className="w-4 h-4 text-slate-500" />
                                              </div>
                                          </div>
                                      );
                                  })
                              )}
                          </div>
                      </div>
                      <div className="flex-[1.2] flex flex-col justify-center items-center gap-4 relative">
                          <div className="absolute inset-0 bg-amber-500/5 blur-3xl rounded-full pointer-events-none"></div>
                          <div className="flex gap-4 relative z-10">
                              {[0, 1, 2].map((idx) => {
                                  const slotItem = monumentDialogState.slots[idx];
                                  const reqId = monumentRequirements ? monumentRequirements[idx] : undefined;
                                  // Update for wildcard
                                  const isWildcard = reqId === 'ANY';
                                  const reqDef = reqId && !isWildcard ? getItemDef(reqId) : undefined;
                                  
                                  return (
                                      <div 
                                          key={idx}
                                          onDrop={(e) => handleDrop(e, idx)}
                                          onDragOver={handleAllowDrop}
                                          onClick={() => slotItem && removeItemFromMonument(idx)}
                                          className={`
                                              w-20 h-24 md:w-24 md:h-32 rounded-2xl border-2 flex flex-col items-center justify-center transition-all cursor-pointer relative overflow-hidden
                                              ${slotItem 
                                                  ? `bg-slate-900 ${getRarityBorder(slotItem.rarity)} shadow-[0_0_15px_rgba(245,158,11,0.3)]` 
                                                  : 'bg-slate-900/30 border-slate-700 border-dashed hover:border-slate-500 hover:bg-slate-800/30'
                                              }
                                          `}
                                      >
                                          {slotItem ? (
                                              <>
                                                  <ItemIcon item={slotItem} size="w-12 h-12 md:w-16 md:h-16" />
                                                  <div className="absolute bottom-0 w-full bg-black/60 py-1">
                                                      <span className="text-[8px] text-slate-300 uppercase block text-center truncate px-1">{slotItem.rarity}</span>
                                                  </div>
                                                  <div className="absolute top-1 right-1 p-1 bg-red-500/20 rounded-full opacity-0 hover:opacity-100 transition-opacity">
                                                      <X className="w-3 h-3 text-red-400" />
                                                  </div>
                                              </>
                                          ) : (
                                              <>
                                                  {isWildcard ? (
                                                      <div className="flex flex-col items-center opacity-60 grayscale group-hover:grayscale-0 transition-all">
                                                          <HelpCircle className="w-10 h-10 md:w-12 md:h-12 text-slate-400" />
                                                          <span className="text-[8px] text-slate-500 font-mono mt-1 text-center leading-tight">ANY KEY</span>
                                                      </div>
                                                  ) : (
                                                      reqDef ? (
                                                          <div className="flex flex-col items-center opacity-60 grayscale group-hover:grayscale-0 transition-all">
                                                              <ItemIcon def={reqDef} size="w-10 h-10 md:w-12 md:h-12" opacity={0.6} grayscale />
                                                              <span className="text-[8px] text-slate-500 font-mono mt-1 text-center leading-tight max-w-[60px]">{reqDef.name[language]}</span>
                                                          </div>
                                                      ) : (
                                                          <>
                                                              <Key className="w-6 h-6 text-slate-700 mb-1" />
                                                              <span className="text-[9px] text-slate-600 font-mono">SLOT {idx+1}</span>
                                                          </>
                                                      )
                                                  )}
                                              </>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                          <div className="w-full px-4">
                              <button 
                                  onClick={activateMonument}
                                  disabled={!isMonumentReady}
                                  className={`w-full py-4 rounded-xl font-black uppercase tracking-[0.2em] shadow-lg transition-all flex items-center justify-center gap-2 ${isMonumentReady ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-amber-900/40 active:scale-95' : 'bg-slate-800 text-slate-500 cursor-not-allowed grayscale'}`}
                              >
                                  {isMonumentReady ? <><Zap className="w-5 h-5 fill-current" /> {t.MONUMENT_BTN_ACTIVE}</> : t.MONUMENT_BTN_INACTIVE}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {voidDialogTarget && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-300 pointer-events-auto" onClick={closeVoidDialog}>
              <div className="bg-slate-950 border border-red-900/50 p-6 rounded-3xl shadow-2xl max-w-lg w-full relative overflow-hidden flex flex-col gap-6 animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  <button onClick={closeVoidDialog} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-20"><X className="w-6 h-6"/></button>
                  <div className="flex items-center gap-4 border-b border-slate-800 pb-4">
                      <div className="p-3 bg-red-950/50 rounded-xl border border-red-900/50 shadow-inner animate-pulse">
                          <AlertTriangle className="w-8 h-8 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                      </div>
                      <div>
                          <h3 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">{t.VOID_TITLE}</h3>
                          <p className="text-xs text-red-400 uppercase tracking-widest font-mono mt-1">{t.VOID_SUB}</p>
                      </div>
                  </div>
                  <p className="text-sm text-slate-400 leading-relaxed text-center px-4">
                      {t.VOID_DESC}
                      <br/>
                      <span className="text-xs text-red-400 font-bold mt-2 block">{t.VOID_WARN}</span>
                  </p>
                  <div className="bg-slate-900/50 rounded-2xl border border-slate-800 flex flex-col overflow-hidden max-h-[300px]">
                      <div className="p-2 border-b border-slate-800 bg-slate-900">
                          <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{t.VOID_SELECT}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar">
                          {player.inventory.length === 0 ? (
                              <div className="text-center text-slate-600 text-xs italic py-10">{t.VOID_EMPTY}</div>
                          ) : (
                              player.inventory.map(item => {
                                  const dynamicText = resolveItemText(item);
                                  return (
                                      <div 
                                          key={item.id}
                                          onClick={() => handleVoidRestore(item)}
                                          className={`flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 border cursor-pointer group transition-all ${getRarityBorder(item.rarity)}`}
                                      >
                                          <div className="w-10 h-10 rounded bg-slate-950 flex items-center justify-center border border-slate-800 overflow-hidden shrink-0">
                                              <ItemIcon item={item} size="w-10 h-10" />
                                          </div>
                                          <div className="flex flex-col min-w-0 flex-1">
                                              <span className="text-xs font-bold text-white group-hover:text-red-200 truncate">{dynamicText.name}</span>
                                              <span className="text-[9px] text-slate-500 uppercase">{item.rarity}</span>
                                          </div>
                                          <div className="px-3 py-1 bg-red-900/20 border border-red-900/50 rounded text-[9px] text-red-400 font-bold uppercase whitespace-nowrap group-hover:bg-red-900/40 transition-colors">
                                              SACRIFICE
                                          </div>
                                      </div>
                                  );
                              })
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {isRankingsOpen && (
          <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={() => setIsRankingsOpen(false)}>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                      <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-amber-500" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-white">{t.MINI_LB_TITLE}</h3>
                      </div>
                      <button onClick={() => setIsRankingsOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-900 text-[9px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800">
                      <div className="col-span-1 text-center">#</div>
                      <div className="col-span-5">Unit</div>
                      <div className="col-span-2 text-right">{t.RANK}</div>
                      <div className="col-span-2 text-right">{t.CREDITS}</div>
                      <div className="col-span-2 text-right">{t.MOVES}</div>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                      {liveRankings.length === 0 ? (
                          <div className="p-8 text-center text-slate-500 text-xs font-mono">{t.MINI_LB_EMPTY}</div>
                      ) : (
                          <div className="flex flex-col gap-1">
                              {liveRankings.map((entry, idx) => (
                                  <div key={entry.id} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border ${entry.isPlayer ? 'bg-indigo-900/20 border-indigo-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
                                      <div className="col-span-1 flex justify-center">
                                          <div className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black ${idx === 0 ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400'}`}>
                                              {idx + 1}
                                          </div>
                                      </div>
                                      <div className="col-span-5 flex items-center gap-2 overflow-hidden">
                                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }}></div>
                                          <span className={`text-xs font-bold truncate ${entry.isPlayer ? 'text-indigo-300' : 'text-slate-300'}`}>{entry.nickname}</span>
                                      </div>
                                      <div className="col-span-2 text-right">
                                          <span className="text-xs font-mono text-emerald-400 font-bold">L{entry.level}</span>
                                      </div>
                                      <div className="col-span-2 text-right">
                                          <span className="text-xs font-mono text-amber-400 font-bold">{entry.coins}</span>
                                      </div>
                                      <div className="col-span-2 text-right">
                                          <span className="text-xs font-mono text-blue-400 font-bold">{entry.moves}</span>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {isCodexOpen && (
          <div className="absolute inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={() => setIsCodexOpen(false)}>
              <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md md:max-w-2xl h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
                      <div className="flex items-center gap-3">
                          <BookOpen className="w-5 h-5 text-purple-500" />
                          <h3 className="text-sm font-black uppercase tracking-widest text-white">{language === 'RU' ? 'База Предметов' : 'Item Codex'}</h3>
                      </div>
                      <button onClick={() => setIsCodexOpen(false)} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-6">
                      {(['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'] as const).map(rarity => {
                          const items = ITEM_REGISTRY.filter(i => i.rarity === rarity);
                          if (items.length === 0) return null;
                          return (
                              <div key={rarity}>
                                  <h4 className={`text-[10px] font-black uppercase tracking-widest mb-3 border-b pb-1 ${
                                      rarity === 'COMMON' ? 'text-slate-400 border-slate-700' :
                                      rarity === 'UNCOMMON' ? 'text-emerald-400 border-emerald-900' :
                                      rarity === 'RARE' ? 'text-purple-400 border-purple-900' :
                                      'text-amber-400 border-amber-900'
                                  }`}>{rarity}</h4>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {items.map(def => (
                                          <div key={def.idPrefix} className="flex gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl hover:bg-slate-900 transition-colors">
                                              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0 ${getRarityBorder(def.rarity)}`}>
                                                  <ItemIcon def={def} size="w-8 h-8 md:w-10 md:h-10" />
                                              </div>
                                              <div className="flex-1 min-w-0">
                                                  <div className="flex items-center justify-between mb-0.5">
                                                      <span className="text-xs font-bold text-white truncate">{def.name[language]}</span>
                                                  </div>
                                                  <p className="text-[9px] text-slate-500 italic mb-2 line-clamp-2 leading-tight">"{def.description[language]}"</p>
                                                  <div className="flex flex-col gap-1">
                                                      <div className="flex items-center gap-1.5 text-[9px] text-emerald-300 bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-900/30 w-fit">
                                                          <CheckCircle className="w-3 h-3" />
                                                          <span>{def.effectLabel[language]}</span>
                                                      </div>
                                                      {def.negativeEffectType && (
                                                          <div className="flex items-center gap-1.5 text-[9px] text-red-300 bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/30 w-fit">
                                                              <AlertTriangle className="w-3 h-3" />
                                                              <span>{def.negativeEffectLabel[language]}</span>
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              </div>
          </div>
      )}

      {helpTopic && helpData && (
          <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 pointer-events-auto animate-in fade-in" onClick={() => setHelpTopic(null)}>
              <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
                  <h3 className="text-lg font-black text-white uppercase mb-2 text-center">{helpData.title}</h3>
                  <p className="text-xs text-slate-400 mb-4 text-center leading-relaxed">{helpData.desc}</p>
                  {(helpData as any).extra ? (
                      <div className="flex flex-col gap-2 bg-slate-950 p-3 rounded-xl border border-slate-800 mb-4">
                          {(helpData as any).extra.map((line: string, i: number) => (
                              <p key={i} className="text-[10px] text-slate-300 font-mono leading-tight border-l-2 border-indigo-500 pl-2 py-1">
                                  {line}
                              </p>
                          ))}
                      </div>
                  ) : (
                      <div className="bg-slate-800 p-2 rounded text-xs font-mono text-emerald-400 text-center mb-4">{helpData.hint}</div>
                  )}
                  <div className="flex justify-center mt-2">
                      <button onClick={() => setHelpTopic(null)} className="text-xs font-bold text-slate-500 hover:text-white uppercase tracking-wider py-2 px-4 rounded hover:bg-slate-800 transition-colors">Close</button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default memo(GameHUD);
