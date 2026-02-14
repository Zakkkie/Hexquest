
import { create } from 'zustand';
import { GameState, Entity, Hex, EntityType, UIState, WinCondition, LeaderboardEntry, EntityState, MoveAction, RechargeAction, SessionState, LogEntry, FloatingText, Language, DeviceType, Difficulty, HexCoord, DestroyItemAction, RestoreHexAction, Item, ActivateMonumentAction } from './types.ts';
import { GAME_CONFIG, DIFFICULTY_SETTINGS, SAFETY_CONFIG, ENTROPY_CONFIG } from './rules/config.ts';
import { getHexKey, getNeighbors, findPath, cubeDistance } from './services/hexUtils.ts';
import { GameEngine } from './engine/GameEngine.ts';
import { audioService } from './services/audioService.ts';
import { CAMPAIGN_LEVELS } from './campaign/levels.ts';
import { LevelConfig } from './campaign/types.ts';
import { calculateMovementCost } from './rules/movement.ts';
import { generateMap } from './services/mapGenerator.ts';
import { TEXT } from './services/i18n.ts';

const MOCK_USER_DB: Record<string, { password: string; avatarColor: string; headIndex: number; bodyIndex: number }> = {};
const BOT_PALETTE = ['#ef4444', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e']; 
const LEADERBOARD_STORAGE_KEY = 'hexquest_leaderboard_v3'; 
const CAMPAIGN_PROGRESS_KEY = 'hexquest_campaign_progress_v1';

const loadLeaderboard = (): LeaderboardEntry[] => {
  try {
    const stored = localStorage.getItem(LEADERBOARD_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Failed to load leaderboard", e);
    return [];
  }
};

const saveLeaderboard = (entries: LeaderboardEntry[]) => {
    localStorage.setItem(LEADERBOARD_STORAGE_KEY, JSON.stringify(entries));
};

const loadCampaignProgress = (): number => {
    try {
        const stored = localStorage.getItem(CAMPAIGN_PROGRESS_KEY);
        return stored ? parseInt(stored, 10) : 0;
    } catch (e) {
        return 0;
    }
};

const saveCampaignProgress = (levelIndex: number) => {
    localStorage.setItem(CAMPAIGN_PROGRESS_KEY, levelIndex.toString());
};

interface AuthResponse { success: boolean; message?: string; }

// Expanded UI Sound Types
export type UiSoundType = 'HOVER' | 'CLICK' | 'ERROR' | 'WARNING' | 'SUCCESS';

interface GameStore extends GameState {
  session: SessionState | null;
  setUIState: (state: UIState) => void;
  setDeviceType: (type: DeviceType) => void;
  loginAsGuest: (n: string, c: string, h: number, b: number) => void;
  registerUser: (n: string, p: string, c: string, h: number, b: number) => AuthResponse;
  loginUser: (n: string, p: string) => AuthResponse;
  logout: () => void;
  startNewGame: (win?: WinCondition, levelConfig?: LevelConfig) => void;
  startCampaignLevel: (levelId: string) => void;
  startMission: () => void;
  abandonSession: () => void;
  togglePlayerGrowth: (intent?: 'RECOVER' | 'UPGRADE' | 'DIG') => void;
  rechargeMove: () => void;
  movePlayer: (q: number, r: number) => void;
  confirmPendingAction: () => void;
  cancelPendingAction: () => void;
  checkTutorialCamera: (deltaX: number) => void;
  tick: () => void;
  showToast: (msg: string, type: 'error' | 'success' | 'info') => void;
  hideToast: () => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
  playUiSound: (type: UiSoundType) => void;
  setLanguage: (lang: 'EN' | 'RU') => void;
  downloadSessionLog: () => void;
  destroyItem: (itemId: string) => void;
  
  // Void Restoration
  openVoidDialog: (q: number, r: number) => void;
  closeVoidDialog: () => void;
  restoreVoidHex: (itemId: string) => void;

  // Monument Activation
  openMonumentDialog: () => void;
  closeMonumentDialog: () => void;
  placeItemInMonument: (item: Item, slotIndex: number) => void;
  removeItemFromMonument: (slotIndex: number) => void;
  activateMonument: () => void;
}

let engine: GameEngine | null = null;
let tickCount = 0;

const createInitialSessionData = (winCondition: WinCondition | null, levelConfig?: LevelConfig, language: Language = 'EN'): SessionState => {
  // Map Generation Logic (Delegate to service)
  
  const initialGrid = generateMap(levelConfig);
  let secretMonumentCoord: HexCoord | undefined = undefined;
  
  if (!levelConfig && winCondition?.winType === 'SUMMIT') {
      // Calculate secret location between Radius 4 and 6
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.floor(Math.random() * 3); // 4, 5, or 6
      
      const x = Math.cos(angle) * dist;
      const y = Math.sin(angle) * dist;
      
      const q = Math.round(x);
      const r = Math.round(y);
      
      secretMonumentCoord = { q, r };
      console.log(`[SYS] Monument Coordinates Set: ${q}, ${r}`);
  }
  
  // Access store strictly for USER data
  const user = useGameStore.getState().user;

  const botCount = levelConfig ? (levelConfig.aiMode === 'none' ? 0 : 1) : (winCondition?.botCount || 0);
  const difficulty: Difficulty = winCondition?.difficulty || 'MEDIUM';
  const diffSettings = DIFFICULTY_SETTINGS[difficulty];
  
  // CUSTOM STORAGE LOGIC:
  // Check if winCondition has 'initialStorage' (passed from MainMenu hack), otherwise fallback to Difficulty
  const maxStorage = winCondition?.initialStorage ?? diffSettings.maxStorage; 
  
  // Skirmish Defaults vs Level Config
  const startCredits = levelConfig ? levelConfig.startState.credits : GAME_CONFIG.INITIAL_COINS;
  const startMoves = levelConfig ? levelConfig.startState.moves : GAME_CONFIG.INITIAL_MOVES;
  const startRank = levelConfig ? levelConfig.startState.rank : 1;
  const startStorage = levelConfig ? (levelConfig.startState.materials || 0) : 0;
  
  const bots: Entity[] = [];
  const spawnPoints = [{ q: 0, r: -2 }, { q: 2, r: -2 }, { q: 2, r: 0 }, { q: 0, r: 2 }, { q: -2, r: 2 }, { q: -2, r: 0 }];

  for (let i = 0; i < Math.min(botCount, spawnPoints.length); i++) {
    const sp = spawnPoints[i];
    // Ensure bot spawn points exist in grid
    if (!initialGrid[getHexKey(sp.q, sp.r)]) {
        initialGrid[getHexKey(sp.q, sp.r)] = { id: getHexKey(sp.q,sp.r), q:sp.q, r:sp.r, currentLevel:0, maxLevel:0, progress:0, revealed:true };
        getNeighbors(sp.q, sp.r).forEach(n => {
            const k = getHexKey(n.q, n.r);
            if (!initialGrid[k]) initialGrid[k] = { id:k, q:n.q, r:n.r, currentLevel:0, maxLevel:0, progress:0, revealed:true };
        });
    }
    bots.push({
      id: `bot-${i+1}`, type: EntityType.BOT, state: EntityState.IDLE, q: sp.q, r: sp.r,
      playerLevel: 0, 
      coins: startCredits,
      moves: startMoves,
      totalCoinsEarned: 0, movementQueue: [],
      storage: 0, maxStorage: maxStorage,
      inventory: [],
      memory: { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 },
      avatarColor: BOT_PALETTE[Math.floor(Math.random() * BOT_PALETTE.length)], // Random color
      headIndex: Math.floor(Math.random() * 4), // Random head (0-3)
      bodyIndex: Math.floor(Math.random() * 4), // Random body (0-3)
      recoveredCurrentHex: false,
      recentUpgrades: []
    });
  }
  
  let initialText = levelConfig ? levelConfig.description : `Mission: Rank ${winCondition?.targetLevel} ${winCondition?.winType} ${winCondition?.targetCoins} Credits.`;

  const initialLog: LogEntry = {
    id: 'init-0',
    text: initialText,
    type: 'INFO',
    source: 'SYSTEM',
    timestamp: Date.now()
  };

  return {
    stateVersion: 0,
    sessionId: Math.random().toString(36).substring(2, 15),
    sessionStartTime: Date.now(),
    winCondition,
    activeLevelConfig: levelConfig,
    secretMonumentCoord,
    difficulty: difficulty,
    grid: initialGrid,
    player: {
      id: 'player-1', type: EntityType.PLAYER, state: EntityState.IDLE, q: 0, r: 0,
      playerLevel: startRank, 
      coins: startCredits, 
      moves: startMoves,
      totalCoinsEarned: 0, movementQueue: [],
      storage: startStorage, 
      maxStorage: maxStorage,
      inventory: [], // Init empty inventory
      recoveredCurrentHex: false,
      recentUpgrades: [],
      // Use User preferences or default
      avatarColor: user?.avatarColor || '#3b82f6',
      headIndex: user?.headIndex || 0,
      bodyIndex: user?.bodyIndex || 0
    },
    bots,
    currentTurn: 0,
    messageLog: [initialLog],
    botActivityLog: [],
    fullBotHistory: [], 
    gameStatus: levelConfig ? 'BRIEFING' : 'PLAYING',
    lastBotActionTime: Date.now(),
    isPlayerGrowing: false,
    playerGrowthIntent: null,
    growingBotIds: [],
    telemetry: [],
    effects: [],
    language,
    entropy: {
        current: ENTROPY_CONFIG.INITIAL_MAX,
        max: ENTROPY_CONFIG.INITIAL_MAX,
        threshold: ENTROPY_CONFIG.THRESHOLD
    }
  };
};

// Initial device type detection
const getDeviceType = (): DeviceType => {
    const w = window.innerWidth;
    if (w < 768) return 'MOBILE';
    if (w < 1024) return 'TABLET';
    return 'DESKTOP';
};

export const useGameStore = create<GameStore>((set, get) => ({
  uiState: 'MENU',
  deviceType: getDeviceType(),
  user: null,
  toast: null,
  pendingConfirmation: null,
  leaderboard: loadLeaderboard(),
  campaignProgress: loadCampaignProgress(),
  hasActiveSession: false,
  isMusicMuted: false,
  isSfxMuted: false,
  session: null,
  language: 'EN',
  voidDialogTarget: null,
  monumentDialogState: { isOpen: false, slots: [null, null, null] },
  
  setLanguage: (lang) => set({ language: lang }),
  setUIState: (uiState) => set({ uiState }),
  setDeviceType: (deviceType) => set({ deviceType }),
  
  loginAsGuest: (nickname, avatarColor, headIndex, bodyIndex) => {
    audioService.play('UI_CLICK');
    set({ user: { isAuthenticated: true, isGuest: true, nickname, avatarColor, headIndex, bodyIndex } });
  },
  registerUser: (nickname, password, avatarColor, headIndex, bodyIndex) => { 
    audioService.play('UI_CLICK');
    MOCK_USER_DB[nickname] = { password, avatarColor, headIndex, bodyIndex }; 
    set({ user: { isAuthenticated: true, isGuest: false, nickname, avatarColor, headIndex, bodyIndex } }); 
    return { success: true }; 
  },
  loginUser: (nickname, password) => { 
    audioService.play('UI_CLICK');
    const r = MOCK_USER_DB[nickname]; 
    if (!r || r.password !== password) {
      audioService.play('ERROR');
      return { success: false, message: "Invalid credentials" }; 
    }
    set({ user: { isAuthenticated: true, isGuest: false, nickname, avatarColor: r.avatarColor, headIndex: r.headIndex, bodyIndex: r.bodyIndex } }); 
    return { success: true }; 
  },
  logout: () => {
    audioService.play('UI_CLICK');
    get().abandonSession();
    set({ user: null });
  },

  toggleMusic: () => {
      const newVal = !get().isMusicMuted;
      audioService.setMusicMuted(newVal);
      set({ isMusicMuted: newVal });
  },

  toggleSfx: () => {
      const newVal = !get().isSfxMuted;
      audioService.setSfxMuted(newVal);
      set({ isSfxMuted: newVal });
  },

  playUiSound: (type) => {
    switch (type) {
        case 'HOVER': audioService.play('UI_HOVER'); break;
        case 'CLICK': audioService.play('UI_CLICK'); break;
        case 'ERROR': audioService.play('ERROR'); break;
        case 'WARNING': audioService.play('WARNING'); break;
        case 'SUCCESS': audioService.play('SUCCESS'); break;
        default: break;
    }
  },

  startNewGame: (winCondition, levelConfig) => {
      audioService.play('UI_CLICK');
      get().abandonSession();
      
      let effectiveWin = winCondition;

      if (levelConfig) {
          let difficulty: Difficulty = 'MEDIUM';
          let queueSize = 2; 

          if (levelConfig.id === '1.6') {
              difficulty = 'EASY';
              queueSize = 1;
          }

          effectiveWin = {
              levelId: -1,
              targetLevel: 99,
              targetCoins: 9999,
              label: levelConfig.title,
              botCount: 0,
              difficulty: difficulty,
              queueSize: queueSize,
              winType: 'AND'
          };
      } else if (!winCondition) {
          // Default Quick Start to a simple summit run
          effectiveWin = {
              levelId: -1,
              targetLevel: 6, // Medium Summit
              targetCoins: 0,
              label: "Quick Summit",
              botCount: 0,
              difficulty: 'MEDIUM',
              queueSize: 2,
              winType: 'SUMMIT'
          };
      }

      const initialSessionState = createInitialSessionData(effectiveWin, levelConfig, get().language);
      engine = new GameEngine(initialSessionState); 
      set({ session: engine.state, hasActiveSession: true, uiState: 'GAME' });

      // Removed Toast for briefing start as the Modal covers it
  },

  startCampaignLevel: (levelId) => {
     const levelConfig = CAMPAIGN_LEVELS.find(l => l.id === levelId);
     if (levelConfig) {
         get().startNewGame(undefined, levelConfig);
     } else {
         console.warn(`Level ${levelId} not found`);
     }
  },

  startMission: () => {
      if (engine) {
          engine.startMission();
          set({ session: engine.state });
          audioService.play('UI_CLICK');
      }
  },

  abandonSession: () => {
      if (engine) {
          engine.destroy();
          engine = null;
          set({ session: null, hasActiveSession: false, uiState: 'MENU', voidDialogTarget: null, monumentDialogState: { isOpen: false, slots: [null, null, null] } });
      }
  },
  
  showToast: (message, type) => set({ toast: { message, type, timestamp: Date.now() } }),
  hideToast: () => set({ toast: null }),

  togglePlayerGrowth: (intent: 'RECOVER' | 'UPGRADE' | 'DIG' = 'RECOVER') => {
      if (!engine) return;
      const session = engine.state; 
      if (!session) return;

      if (session.player.state === EntityState.MOVING) {
        audioService.play('ERROR');
        return;
      }
      
      const isCurrentlyGrowing = session.isPlayerGrowing;
      const currentIntent = session.playerGrowthIntent;
      
      let nextStateGrowing = true;
      
      if (isCurrentlyGrowing && currentIntent === intent) {
          nextStateGrowing = false;
      }
      
      if (nextStateGrowing) {
        audioService.play('GROWTH_START');
      } else {
        audioService.play('UI_CLICK');
      }

      engine.setPlayerIntent(nextStateGrowing, nextStateGrowing ? intent : null);
      set({ session: engine.state });
  },

  rechargeMove: () => {
      if (!engine || !engine.state) return;
      const action: RechargeAction = { type: 'RECHARGE_MOVE', stateVersion: engine.state.stateVersion };
      const res = engine.applyAction(engine.state.player.id, action);
      if (res.ok) {
        audioService.play('COIN'); 
        set({ session: engine.state });
      } else {
        audioService.play('ERROR');
        set({ toast: { message: res.reason || "Recharge Failed", type: 'error', timestamp: Date.now() } });
      }
  },

  destroyItem: (itemId: string) => {
      if (!engine || !engine.state) return;
      const action: DestroyItemAction = { type: 'DESTROY_ITEM', itemId, stateVersion: engine.state.stateVersion };
      const res = engine.applyAction(engine.state.player.id, action);
      if (res.ok) {
          audioService.play('CRACK');
          set({ session: engine.state });
      }
  },

  openVoidDialog: (q, r) => {
      audioService.play('UI_CLICK');
      set({ voidDialogTarget: { q, r } });
  },

  closeVoidDialog: () => {
      audioService.play('UI_CLICK');
      set({ voidDialogTarget: null });
  },

  restoreVoidHex: (itemId: string) => {
      if (!engine || !engine.state) return;
      const target = get().voidDialogTarget;
      if (!target) return;

      const action: RestoreHexAction = { 
          type: 'RESTORE_HEX', 
          coord: target, 
          itemId, 
          stateVersion: engine.state.stateVersion 
      };
      
      const res = engine.applyAction(engine.state.player.id, action);
      
      if (res.ok) {
          audioService.play('GROWTH_START'); // Sound for attempt
          set({ session: engine.state, voidDialogTarget: null });
      } else {
          audioService.play('ERROR');
          set({ toast: { message: res.reason || "Restoration Error", type: 'error', timestamp: Date.now() } });
      }
  },

  movePlayer: (tq, tr) => {
      if (!engine || !engine.state) return;
      
      const session = engine.state; 
      const { pendingConfirmation, confirmPendingAction, cancelPendingAction, openVoidDialog } = get();

      if (session.gameStatus === 'BRIEFING') return;

      // VOID INTERACTION LOGIC
      // If clicking a VOID hex that is ADJACENT, open the restoration dialog instead of moving
      const targetKey = getHexKey(tq, tr);
      const targetHex = session.grid[targetKey];
      
      if (targetHex && targetHex.structureType === 'VOID') {
          const dist = cubeDistance(session.player, { q: tq, r: tr });
          if (dist === 1) {
              openVoidDialog(tq, tr);
              return; // Stop movement logic
          }
      }

      if (pendingConfirmation) {
          const target = pendingConfirmation.data.path[pendingConfirmation.data.path.length - 1];
          if (target.q === tq && target.r === tr) {
              confirmPendingAction();
              return;
          } else {
              cancelPendingAction(); 
          }
      }

      if (session.player.state === EntityState.MOVING) return;
      
      // Standard Movement Checks
      if (targetHex && targetHex.structureType !== 'VOID' && targetHex.maxLevel > session.player.playerLevel) {
          audioService.play('ERROR');
          const lang = get().language;
          const msg = TEXT[lang].HUD.ERROR_RANK || "RANK TOO LOW";
          set({ toast: { message: msg, type: 'error', timestamp: Date.now() } });
          return;
      }

      const obstacles = session.bots.map(b => ({ q: b.q, r: b.r }));
      
      const path = findPath({ q: session.player.q, r: session.player.r }, { q: tq, r: tr }, session.grid, session.player.playerLevel, obstacles);
      
      if (!path) {
        // Only show error if we weren't trying to interact with a void hex (which handled above)
        // If it's a void hex far away, we fall here
        if (targetHex && targetHex.structureType === 'VOID') {
             audioService.play('ERROR');
             set({ toast: { message: "Too far to stabilize", type: 'error', timestamp: Date.now() } });
             return;
        }

        audioService.play('ERROR');
        set({ toast: { message: "Path Blocked / Invalid", type: 'error', timestamp: Date.now() } });
        return;
      }

      const costResult = calculateMovementCost(session.player, path, session.grid);

      if (!costResult.canAfford) {
        audioService.play('ERROR');
        set({ toast: { message: costResult.reason || `Need ${costResult.deductCoins} credits`, type: 'error', timestamp: Date.now() } });
        return;
      }
      
      if (costResult.deductCoins > 0) {
        audioService.play('WARNING');
        set({ 
             pendingConfirmation: { type: 'MOVE_WITH_COINS', data: { path, costMoves: costResult.deductMoves, costCoins: costResult.deductCoins } },
             toast: { message: `Click again to confirm (${costResult.deductCoins}cr)`, type: 'info', timestamp: Date.now() } 
        });
        return;
      }

      const action: MoveAction = { type: 'MOVE', path, stateVersion: session.stateVersion };
      const res = engine.applyAction(session.player.id, action);
      
      if (res.ok) {
        audioService.play('MOVE');
        set({ session: engine.state });
      } else {
        audioService.play('ERROR');
        set({ toast: { message: res.reason || "Error", type: 'error', timestamp: Date.now() } });
      }
  },

  confirmPendingAction: () => {
      if (!engine || !engine.state) return;
      const { pendingConfirmation } = get();
      if (!pendingConfirmation) return;
      
      const { path } = pendingConfirmation.data;
      const action: MoveAction = { type: 'MOVE', path, stateVersion: engine.state.stateVersion };
      const res = engine.applyAction(engine.state.player.id, action);
      
      if (res.ok) {
        audioService.play('MOVE');
        set({ session: engine.state, pendingConfirmation: null });
      } else {
        audioService.play('ERROR');
        set({ toast: { message: res.reason || "Error", type: 'error', timestamp: Date.now() }, pendingConfirmation: null });
      }
  },

  cancelPendingAction: () => {
    if (get().pendingConfirmation) {
        audioService.play('UI_CLICK');
        set({ pendingConfirmation: null });
    }
  },

  checkTutorialCamera: (deltaX: number) => {
      // Placeholder for tutorial camera tracking
      // Logic would go here to detect if player rotated camera during tutorial
  },

  downloadSessionLog: () => {
     if (!engine || !engine.state) return;
     const history = engine.state.fullBotHistory;
     if (!history || history.length === 0) {
         get().showToast("No history recorded.", "info");
         return;
     }

     const lines = history.map(e => {
         const timeStr = new Date(e.timestamp).toISOString().split('T')[1].replace('Z', '');
         const action = e.action.padEnd(10, ' ');
         const target = (e.target || '-').padEnd(18, ' ');
         return `${timeStr} | ${e.botId.toUpperCase()} | ${action} | Tgt: ${target} | ${e.reason}`;
     });

     const content = `HEXQUEST SESSION LOG\nSession ID: ${engine.state.sessionId}\nDate: ${new Date().toISOString()}\n------------------------\n` + lines.join('\n');
     
     const blob = new Blob([content], { type: 'text/plain' });
     const url = URL.createObjectURL(blob);
     const a = document.createElement('a');
     a.href = url;
     a.download = `session_log_${Date.now()}.txt`;
     document.body.appendChild(a);
     a.click();
     document.body.removeChild(a);
     URL.revokeObjectURL(url);
     
     get().showToast("Session Log Downloaded", "success");
  },

  openMonumentDialog: () => {
      audioService.play('SUCCESS'); // Mystical sound prefered
      set({ monumentDialogState: { isOpen: true, slots: [null, null, null] } });
  },

  closeMonumentDialog: () => {
      audioService.play('UI_CLICK');
      set({ monumentDialogState: { isOpen: false, slots: [null, null, null] } });
  },

  placeItemInMonument: (item: Item, slotIndex: number) => {
      audioService.play('UI_CLICK');
      set(state => {
          const newSlots = [...state.monumentDialogState.slots];
          newSlots[slotIndex] = item;
          return { monumentDialogState: { ...state.monumentDialogState, slots: newSlots } };
      });
  },

  removeItemFromMonument: (slotIndex: number) => {
      audioService.play('UI_CLICK');
      set(state => {
          const newSlots = [...state.monumentDialogState.slots];
          newSlots[slotIndex] = null;
          return { monumentDialogState: { ...state.monumentDialogState, slots: newSlots } };
      });
  },

  activateMonument: () => {
      if (!engine || !engine.state) return;
      const { monumentDialogState } = get();
      
      const items = monumentDialogState.slots.filter((i): i is Item => i !== null);
      if (items.length !== 3) {
          audioService.play('ERROR');
          get().showToast("All slots must be filled!", 'error');
          return;
      }

      const action: ActivateMonumentAction = { 
          type: 'ACTIVATE_MONUMENT', 
          itemIds: items.map(i => i.id), 
          stateVersion: engine.state.stateVersion 
      };

      const res = engine.applyAction(engine.state.player.id, action);
      
      if (res.ok) {
          audioService.play('LEVEL_UP'); 
          set({ monumentDialogState: { isOpen: false, slots: [null, null, null] } });
          // Victory should be handled by VictorySystem events
      } else {
          audioService.play('ERROR');
          get().showToast(res.reason || "Activation Failed", 'error');
      }
  },

  tick: () => {
      if (!engine || !engine.state) return;
      if (engine.state.gameStatus !== 'PLAYING' && engine.state.gameStatus !== 'VICTORY') return;
      
      const prevState = get().session;
      
      const result = engine.processTick();
      if (!result || !result.state) return;

      tickCount++;
      
      if (tickCount % 50 === 0) {
          // MEMORY OPTIMIZATION: Aggressive pruning of history arrays
          if (result.state.messageLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) {
              result.state.messageLog = result.state.messageLog.slice(0, SAFETY_CONFIG.MAX_LOG_SIZE);
          }
          if (result.state.botActivityLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) {
              result.state.botActivityLog = result.state.botActivityLog.slice(0, SAFETY_CONFIG.MAX_LOG_SIZE);
          }
          
          // CRITICAL: Limit the infinite growth of fullBotHistory
          const historyLimit = SAFETY_CONFIG.MAX_HISTORY_SIZE || 3000;
          if (result.state.fullBotHistory.length > historyLimit) {
              result.state.fullBotHistory = result.state.fullBotHistory.slice(result.state.fullBotHistory.length - historyLimit);
          }
          
          if (result.state.telemetry && result.state.telemetry.length > 100) {
              result.state.telemetry = result.state.telemetry.slice(result.state.telemetry.length - 100);
          }
          const now = Date.now();
          result.state.effects = result.state.effects.filter(e => e.startTime + e.lifetime > now);
      }

      if (result.state.activeLevelConfig?.id === '1.5' && result.state.gameStatus === 'PLAYING') {
          const elapsed = Date.now() - result.state.sessionStartTime;
          const timeLeft = Math.max(0, 60000 - elapsed);
          
          if (timeLeft <= 10000 && timeLeft > 0) {
              const interval = timeLeft < 5000 ? 5 : 10;
              if (tickCount % interval === 0) {
                  audioService.play('WARNING');
              }
          }
      }

      // Check for Monument Entry Event
      if (result.events.some(e => e.type === 'MONUMENT_REACHED')) {
          get().openMonumentDialog();
      }

      if (result.events.length > 0) {
          result.events.forEach(event => {
            const isPlayer = event.entityId === result.state.player.id;
            
            if (isPlayer || !event.entityId) {
               switch (event.type) {
                 case 'LEVEL_UP': audioService.play('LEVEL_UP'); break;
                 case 'SECTOR_ACQUIRED': audioService.play('SUCCESS'); break;
                 case 'SECTOR_EXCAVATED': audioService.play('CRACK'); break;
                 case 'RECOVERY_USED': audioService.play('COIN'); break;
                 case 'HEX_COLLAPSE': audioService.play('COLLAPSE'); break;
                 case 'VICTORY': audioService.play('SUCCESS'); break;
                 case 'DEFEAT': audioService.play('ERROR'); break;
                 case 'ITEM_DROP': audioService.play('SUCCESS'); break; 
                 case 'ITEM_DESTROYED': audioService.play('CRACK'); break; 
                 case 'ENTROPY_SHIFT': audioService.play('COLLAPSE'); break;
               }
            }

            if (event.type === 'VICTORY' && engine?.state?.activeLevelConfig) {
                const currentId = engine.state.activeLevelConfig.id;
                const currentIdx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentId);
                const progress = get().campaignProgress;
                
                if (currentIdx !== -1 && currentIdx >= progress) {
                    const nextProgress = Math.min(CAMPAIGN_LEVELS.length - 1, currentIdx + 1);
                    if (nextProgress > progress) {
                        saveCampaignProgress(nextProgress);
                        set({ campaignProgress: nextProgress });
                    }
                }
            }

            if (event.type === 'LEADERBOARD_UPDATE' && event.data?.entry) {
                const entry = event.data.entry as LeaderboardEntry;
                const user = get().user;
                if (user) {
                    entry.nickname = user.nickname;
                    entry.avatarColor = user.avatarColor;
                    entry.headIndex = user.headIndex;
                    entry.bodyIndex = user.bodyIndex;
                }
                
                const currentLB = [...get().leaderboard];
                const existingIdx = currentLB.findIndex(e => e.nickname === entry.nickname && e.difficulty === entry.difficulty);
                
                if (existingIdx !== -1) {
                    const existing = currentLB[existingIdx];
                    if (entry.maxLevel > existing.maxLevel || (entry.maxLevel === existing.maxLevel && entry.maxCoins > existing.maxCoins)) {
                        currentLB[existingIdx] = entry;
                    }
                } else {
                    currentLB.push(entry);
                }
                
                currentLB.sort((a, b) => b.maxLevel !== a.maxLevel ? b.maxLevel - a.maxLevel : b.maxCoins - a.maxCoins);
                const slicedLB = currentLB.slice(0, 100);
                saveLeaderboard(slicedLB);
                set({ leaderboard: slicedLB });
            }

            if (event.entityId || event.type === 'HEX_COLLAPSE') {
                 const entity = result.state.player.id === event.entityId 
                    ? result.state.player 
                    : result.state.bots.find(b => b.id === event.entityId);
                 const targetQ = event.data?.q !== undefined ? Number(event.data.q) : (entity?.q || 0);
                 const targetR = event.data?.r !== undefined ? Number(event.data.r) : (entity?.r || 0);

                 if (entity || event.type === 'HEX_COLLAPSE') {
                    let text = '';
                    let color = '#ffffff';
                    let icon: FloatingText['icon'] = undefined;
                    
                    const lang = get().language;

                    switch (event.type) {
                        case 'LEVEL_UP':
                            text = lang === 'RU' ? "+1 УР" : "+1 LVL";
                            color = isPlayer ? "#818cf8" : "#f87171"; 
                            icon = 'UP';
                            break;
                        case 'SECTOR_ACQUIRED':
                            text = lang === 'RU' ? "+1 УР" : "+1 LVL"; 
                            color = isPlayer ? "#818cf8" : "#f87171";
                            icon = 'PLUS';
                            break;
                        case 'SECTOR_EXCAVATED':
                            text = lang === 'RU' ? "+1 МАТ" : "+1 MAT";
                            color = "#34d399"; 
                            icon = 'PICKAXE';
                            break;
                        case 'RECOVERY_USED':
                            if (isPlayer) {
                                const coinGain = (event.data?.coins as number) || 0;
                                const moveGain = (event.data?.moves as number) || 0;
                                if (coinGain > 0) {
                                    text = lang === 'RU' ? `+${coinGain} МОН` : `+${coinGain} COIN`;
                                    color = "#fbbf24"; 
                                } else {
                                    text = lang === 'RU' ? "+1 ХОД" : "+1 MOVE";
                                    color = "#60a5fa"; 
                                }
                                icon = 'COIN';
                            }
                            break;
                        case 'HEX_COLLAPSE':
                            text = lang === 'RU' ? "-1 УР" : "-1 LVL"; 
                            color = "#ef4444";
                            icon = 'DOWN';
                            break;
                        case 'ITEM_DROP':
                            text = lang === 'RU' ? "ПРЕДМЕТ!" : "ITEM FOUND!";
                            color = "#fcd34d";
                            icon = 'GEM';
                            break;
                    }

                    if (text) {
                        result.state.effects.push({
                            id: `fx-${Date.now()}-${Math.random()}`,
                            q: targetQ,
                            r: targetR,
                            text,
                            color,
                            icon,
                            startTime: Date.now(),
                            lifetime: 1200 
                        });
                    }
                 }
            }
          });
      }

      let newToast = get().toast;
      const error = result.events.find(e => e.type === 'ACTION_DENIED' || e.type === 'ERROR');
      if (error && error.entityId === engine?.state?.player.id) {
          newToast = { message: error.message || 'Error', type: 'error', timestamp: Date.now() };
      }

      const shouldRender = tickCount % 2 === 0; 
      const hasCriticalEvents = result.events.length > 0 || newToast !== get().toast;
      const playerStateChanged = prevState && prevState.player.state !== result.state.player.state;

      if (shouldRender || hasCriticalEvents || playerStateChanged) {
        set({ 
            session: result.state, 
            toast: newToast,
        });
      }
  }
}));
