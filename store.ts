
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GameState, Entity, Hex, EntityType, UIState, WinCondition, LeaderboardEntry, EntityState, MoveAction, RechargeAction, SessionState, LogEntry, FloatingText, Language, DeviceType, Difficulty, HexCoord, DestroyItemAction, RestoreHexAction, Item, ActivateMonumentAction, GameEventType } from './types.ts';
import { GAME_CONFIG, DIFFICULTY_SETTINGS, SAFETY_CONFIG, ENTROPY_CONFIG } from './rules/config.ts';
import { getHexKey, getNeighbors, findPath, cubeDistance } from './services/hexUtils.ts';
import { GameEngine } from './engine/GameEngine.ts';
import { audioService } from './services/audioService.ts';
import { CAMPAIGN_LEVELS } from './campaign/levels.ts';
import { LevelConfig } from './campaign/types.ts';
import { calculateMovementCost } from './rules/movement.ts';
import { generateMap } from './services/mapGenerator.ts';
import { TEXT } from './services/i18n.ts';
import { generateMonumentRecipe } from './rules/items.ts';
import { effectPool } from './services/effectPool.ts';

// --- CONSTANTS & HELPERS ---

const MOCK_USER_DB: Record<string, { password: string; avatarColor: string; headIndex: number; bodyIndex: number }> = {};
const BOT_PALETTE = ['#ef4444', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e']; 

// Sound Mapping for Events
const EVENT_SOUND_MAP: Partial<Record<GameEventType, string>> = {
    'LEVEL_UP': 'LEVEL_UP',
    'SECTOR_ACQUIRED': 'SUCCESS',
    'SECTOR_EXCAVATED': 'CRACK',
    'RECOVERY_USED': 'COIN',
    'HEX_COLLAPSE': 'COLLAPSE',
    'VICTORY': 'SUCCESS',
    'DEFEAT': 'ERROR',
    'ITEM_DROP': 'SUCCESS',
    'ITEM_DESTROYED': 'CRACK',
};

const getDeviceType = (): DeviceType => {
    const w = window.innerWidth;
    if (w < 768) return 'MOBILE';
    if (w < 1024) return 'TABLET';
    return 'DESKTOP';
};

interface AuthResponse { success: boolean; message?: string; }
export type UiSoundType = 'HOVER' | 'CLICK' | 'ERROR' | 'WARNING' | 'SUCCESS';

interface GameStore extends GameState {
  session: SessionState | null;
  
  // UI & System
  setUIState: (state: UIState) => void;
  setDeviceType: (type: DeviceType) => void;
  setLanguage: (lang: 'EN' | 'RU') => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
  playUiSound: (type: UiSoundType) => void;
  showToast: (msg: string, type: 'error' | 'success' | 'info') => void;
  hideToast: () => void;
  
  // Auth
  loginAsGuest: (n: string, c: string, h: number, b: number) => void;
  registerUser: (n: string, p: string, c: string, h: number, b: number) => AuthResponse;
  loginUser: (n: string, p: string) => AuthResponse;
  logout: () => void;
  
  // Session Management
  startNewGame: (win?: WinCondition, levelConfig?: LevelConfig) => void;
  startCampaignLevel: (levelId: string) => void;
  startMission: () => void;
  abandonSession: () => void;
  downloadSessionLog: () => void;
  
  // Gameplay Actions
  tick: () => Promise<void>;
  togglePlayerGrowth: (intent?: 'RECOVER' | 'UPGRADE' | 'DIG') => void;
  rechargeMove: () => void;
  movePlayer: (q: number, r: number) => void;
  confirmPendingAction: () => void;
  cancelPendingAction: () => void;
  destroyItem: (itemId: string) => void;
  
  // Interactions
  openVoidDialog: (q: number, r: number) => void;
  closeVoidDialog: () => void;
  restoreVoidHex: (itemId: string) => void;
  
  openMonumentDialog: () => void;
  closeMonumentDialog: () => void;
  placeItemInMonument: (item: Item, slotIndex: number) => void;
  removeItemFromMonument: (slotIndex: number) => void;
  activateMonument: () => void;
  
  checkTutorialCamera: (deltaX: number) => void;
}

let engine: GameEngine | null = null;
let tickCount = 0;
let isProcessingTick = false; // Guard for async tick

// --- SESSION FACTORY ---

const createInitialSessionData = (winCondition: WinCondition | null, levelConfig?: LevelConfig, language: Language = 'EN'): SessionState => {
  // Use mapType from winCondition if available (Skirmish), default to FLAT
  const mapType = winCondition?.mapType || 'FLAT';
  const initialGrid = generateMap(levelConfig, mapType);
  
  // Access store state for user preferences to apply to new session player entity
  const stateUser = useGameStore.getState().user; 

  // Difficulty & Config Setup
  const difficulty: Difficulty = winCondition?.difficulty || 'MEDIUM';
  const diffSettings = DIFFICULTY_SETTINGS[difficulty];
  const maxStorage = winCondition?.initialStorage ?? diffSettings.maxStorage; 
  
  // Determine Start State
  const startCredits = levelConfig ? levelConfig.startState.credits : GAME_CONFIG.INITIAL_COINS;
  const startMoves = levelConfig ? levelConfig.startState.moves : GAME_CONFIG.INITIAL_MOVES;
  const startRank = levelConfig ? levelConfig.startState.rank : 1;
  const startStorage = levelConfig ? (levelConfig.startState.materials || 0) : 0;
  
  // Player Position
  let startQ = 0, startR = 0;
  const playerStartHex = Object.values(initialGrid).find(h => h.ownerId === 'player-1');
  if (playerStartHex) {
      startQ = playerStartHex.q;
      startR = playerStartHex.r;
  }

  // Bot Setup
  const botCount = levelConfig ? (levelConfig.aiMode === 'none' ? 0 : 1) : (winCondition?.botCount || 0);
  const bots: Entity[] = [];
  const spawnPoints = [{ q: 0, r: -2 }, { q: 2, r: -2 }, { q: 2, r: 0 }, { q: 0, r: 2 }, { q: -2, r: 2 }, { q: -2, r: 0 }];

  for (let i = 0; i < Math.min(botCount, spawnPoints.length); i++) {
    const sp = spawnPoints[i];
    // Create/Ensure bot spawn hex
    const key = getHexKey(sp.q, sp.r);
    if (!initialGrid[key]) {
        initialGrid[key] = { id: key, q: sp.q, r: sp.r, currentLevel: 0, maxLevel: 0, progress: 0, revealed: true };
        getNeighbors(sp.q, sp.r).forEach(n => {
            const nk = getHexKey(n.q, n.r);
            if (!initialGrid[nk]) initialGrid[nk] = { id: nk, q: n.q, r: n.r, currentLevel: 0, maxLevel: 0, progress: 0, revealed: true };
        });
    }

    // CAMPAIGN HANDICAP: Bots start with 0 resources in campaign
    const botStartMoves = levelConfig ? 0 : startMoves;
    const botStartStorage = 0; 

    bots.push({
      id: `bot-${i+1}`, type: EntityType.BOT, state: EntityState.IDLE, q: sp.q, r: sp.r,
      playerLevel: 0, 
      coins: startCredits,
      moves: botStartMoves,
      totalCoinsEarned: 0, movementQueue: [],
      storage: botStartStorage, maxStorage: maxStorage,
      inventory: [],
      memory: { lastPlayerPos: null, stuckCounter: 0 },
      avatarColor: BOT_PALETTE[Math.floor(Math.random() * BOT_PALETTE.length)],
      headIndex: Math.floor(Math.random() * 4),
      bodyIndex: Math.floor(Math.random() * 4),
      recoveredCurrentHex: false,
      recentUpgrades: [],
      activeStatuses: []
    });
  }

  // Secret Monument Calculation (Skirmish Summit Mode)
  let secretMonumentCoord: HexCoord | undefined = undefined;
  if (!levelConfig && winCondition?.winType === 'SUMMIT') {
      const angle = Math.random() * Math.PI * 2;
      const dist = 4 + Math.floor(Math.random() * 3);
      secretMonumentCoord = { q: Math.round(Math.cos(angle) * dist), r: Math.round(Math.sin(angle) * dist) };
  }

  // Monument Requirements
  let monumentRequirements: string[] | undefined;
  
  if (levelConfig) {
      if (levelConfig.id === '2.2') {
          monumentRequirements = ['ANY', 'ANY', 'ANY'];
      } else if (levelConfig.id === '2.3') {
          monumentRequirements = ['apex_core', 'apex_core', 'apex_core']; // Specific item as requested
      } else if (levelConfig.id === '2.4') {
          monumentRequirements = ['ANY', 'ANY', 'ANY', 'ANY']; // 4 items
      }
  } else if (winCondition?.winType === 'SUMMIT') {
      monumentRequirements = generateMonumentRecipe(difficulty);
  }

  // Entropy Configuration for specific levels
  let initialEntropy = ENTROPY_CONFIG.INITIAL_MAX;
  if (levelConfig?.id === '2.3') initialEntropy = 10;
  if (levelConfig?.id === '2.4') initialEntropy = 30;

  const initialLog: LogEntry = {
    id: 'init-0',
    text: levelConfig ? levelConfig.description : `Mission: Rank ${winCondition?.targetLevel} ${winCondition?.winType} ${winCondition?.targetCoins} Credits.`,
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
    monumentRequirements,
    difficulty,
    grid: initialGrid,
    player: {
      id: 'player-1', type: EntityType.PLAYER, state: EntityState.IDLE, q: startQ, r: startR,
      playerLevel: startRank, 
      coins: startCredits, 
      moves: startMoves,
      totalCoinsEarned: 0, movementQueue: [],
      storage: startStorage, 
      maxStorage: maxStorage,
      inventory: [], 
      recoveredCurrentHex: false,
      recentUpgrades: [],
      avatarColor: stateUser?.avatarColor || '#3b82f6',
      headIndex: stateUser?.headIndex || 0,
      bodyIndex: stateUser?.bodyIndex || 0,
      activeStatuses: []
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
    effects: [],
    language,
    entropy: {
        current: initialEntropy,
        max: initialEntropy,
        threshold: ENTROPY_CONFIG.THRESHOLD
    },
    outgoingEvents: []
  };
};

// --- STORE IMPLEMENTATION ---

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      uiState: 'MENU',
      deviceType: getDeviceType(),
      user: null,
      toast: null,
      pendingConfirmation: null,
      leaderboard: [], 
      campaignProgress: 0, 
      hasActiveSession: false,
      isMusicMuted: false,
      isSfxMuted: false,
      session: null,
      language: 'RU', 
      voidDialogTarget: null,
      monumentDialogState: { isOpen: false, slots: [null, null, null] },
      lastVisualEvent: undefined,
      
      // --- UI SETTERS ---
      setLanguage: (lang) => set({ language: lang }),
      setUIState: (uiState) => set({ uiState }),
      setDeviceType: (deviceType) => set({ deviceType }),
      showToast: (message, type) => set({ toast: { message, type, timestamp: Date.now() } }),
      hideToast: () => set({ toast: null }),

      // --- AUDIO ---
      toggleMusic: () => {
          const val = !get().isMusicMuted;
          audioService.setMusicMuted(val);
          set({ isMusicMuted: val });
      },
      toggleSfx: () => {
          const val = !get().isSfxMuted;
          audioService.setSfxMuted(val);
          set({ isSfxMuted: val });
      },
      playUiSound: (type) => {
        const map: Record<UiSoundType, any> = {
            'HOVER': 'UI_HOVER', 'CLICK': 'UI_CLICK', 'ERROR': 'ERROR', 'WARNING': 'WARNING', 'SUCCESS': 'SUCCESS'
        };
        audioService.play(map[type]);
      },

      // --- AUTH ---
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

      // --- GAME SESSION ---
      startNewGame: (winCondition, levelConfig) => {
          audioService.play('UI_CLICK');
          get().abandonSession();
          
          let effectiveWin = winCondition;

          if (levelConfig) {
              effectiveWin = {
                  levelId: -1,
                  targetLevel: 99,
                  targetCoins: 9999,
                  label: levelConfig.title,
                  botCount: 0,
                  difficulty: levelConfig.id === '1.6' ? 'EASY' : 'MEDIUM',
                  queueSize: levelConfig.id === '1.6' ? 1 : 2,
                  winType: 'AND'
              };
          } else if (!winCondition) {
              effectiveWin = {
                  levelId: -1, targetLevel: 6, targetCoins: 0, label: "Quick Summit",
                  botCount: 0, difficulty: 'MEDIUM', queueSize: 2, winType: 'SUMMIT',
                  mapType: 'FLAT'
              };
          }

          const initialSessionState = createInitialSessionData(effectiveWin, levelConfig, get().language);
          engine = new GameEngine(initialSessionState); 
          set({ session: engine.state, hasActiveSession: true, uiState: 'GAME' });
      },

      startCampaignLevel: (levelId) => {
         const cfg = CAMPAIGN_LEVELS.find(l => l.id === levelId);
         if (cfg) get().startNewGame(undefined, cfg);
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
              set({ session: null, hasActiveSession: false, uiState: 'MENU', voidDialogTarget: null, monumentDialogState: { isOpen: false, slots: [null, null, null] }, lastVisualEvent: undefined });
          }
      },

      downloadSessionLog: () => {
         if (!engine || !engine.state) return;
         const history = engine.state.fullBotHistory;
         if (!history || history.length === 0) {
             get().showToast(TEXT[get().language].TOAST.NO_HISTORY, "info");
             return;
         }
         const lines = history.map(e => `${new Date(e.timestamp).toISOString().split('T')[1]} | ${e.botId} | ${e.action} | ${e.target} | ${e.reason}`);
         const content = `HEXQUEST LOG\n${new Date().toISOString()}\n------------------\n` + lines.join('\n');
         
         const blob = new Blob([content], { type: 'text/plain' });
         const url = URL.createObjectURL(blob);
         const a = document.createElement('a');
         a.href = url;
         a.download = `session_${Date.now()}.txt`;
         a.click();
         URL.revokeObjectURL(url);
         get().showToast(TEXT[get().language].TOAST.LOG_DOWNLOADED, "success");
      },

      // --- ACTIONS ---
      togglePlayerGrowth: (intent: 'RECOVER' | 'UPGRADE' | 'DIG' = 'RECOVER') => {
          if (!engine || !engine.state) return;
          
          const { isPlayerGrowing, playerGrowthIntent, player } = engine.state;
          if (player.state === EntityState.MOVING) {
            audioService.play('ERROR');
            return;
          }
          
          const shouldGrow = !(isPlayerGrowing && playerGrowthIntent === intent);
          if (shouldGrow) audioService.play('GROWTH_START'); else audioService.play('UI_CLICK');

          engine.setPlayerIntent(shouldGrow, shouldGrow ? intent : null);
          set({ session: engine.state });
      },

      rechargeMove: () => {
          if (!engine || !engine.state) return;
          const res = engine.applyAction(engine.state.player.id, { type: 'RECHARGE_MOVE', stateVersion: engine.state.stateVersion });
          if (res.ok) {
            audioService.play('COIN'); 
            set({ session: engine.state });
          } else {
            audioService.play('ERROR');
            set({ toast: { message: res.reason || TEXT[get().language].TOAST.RECHARGE_FAILED, type: 'error', timestamp: Date.now() } });
          }
      },

      destroyItem: (itemId) => {
          if (!engine || !engine.state) return;
          const res = engine.applyAction(engine.state.player.id, { type: 'DESTROY_ITEM', itemId, stateVersion: engine.state.stateVersion });
          if (res.ok) {
              audioService.play('CRACK');
              set({ session: engine.state });
          }
      },

      movePlayer: (tq, tr) => {
          if (!engine || !engine.state) return;
          const session = engine.state; 
          const { pendingConfirmation, confirmPendingAction, cancelPendingAction, openVoidDialog, openMonumentDialog } = get();

          if (session.gameStatus === 'BRIEFING') return;

          const targetKey = getHexKey(tq, tr);
          const targetHex = session.grid[targetKey];
          const dist = cubeDistance(session.player, { q: tq, r: tr });

          // INTERACTION CHECKS
          if (targetHex?.structureType === 'VOID' && dist === 1) {
              openVoidDialog(tq, tr);
              return;
          }
          if (targetHex?.structureType === 'MONUMENT' && dist === 0) {
              openMonumentDialog();
              return;
          }

          // PENDING CONFIRMATION CHECK
          if (pendingConfirmation) {
              const last = pendingConfirmation.data.path[pendingConfirmation.data.path.length - 1];
              if (last.q === tq && last.r === tr) {
                  confirmPendingAction();
                  return;
              } else {
                  cancelPendingAction(); 
              }
          }

          if (session.player.state === EntityState.MOVING) return;
          
          // MOVEMENT LOGIC
          if (targetHex && targetHex.structureType !== 'VOID' && targetHex.maxLevel > session.player.playerLevel) {
              audioService.play('ERROR');
              set({ toast: { message: TEXT[get().language].HUD.ERROR_RANK, type: 'error', timestamp: Date.now() } });
              return;
          }

          const obstacles = session.bots.map(b => ({ q: b.q, r: b.r }));
          const path = findPath({ q: session.player.q, r: session.player.r }, { q: tq, r: tr }, session.grid, session.player.playerLevel, obstacles);
          
          if (!path) {
            // Void check for far clicks
            if (targetHex?.structureType === 'VOID') {
                 audioService.play('ERROR');
                 set({ toast: { message: TEXT[get().language].TOAST.TOO_FAR_VOID, type: 'error', timestamp: Date.now() } });
                 return;
            }
            audioService.play('ERROR');
            set({ toast: { message: TEXT[get().language].TOAST.PATH_BLOCKED, type: 'error', timestamp: Date.now() } });
            return;
          }

          const costResult = calculateMovementCost(session.player, path, session.grid);

          if (!costResult.canAfford) {
            audioService.play('ERROR');
            const msg = costResult.reason || TEXT[get().language].TOAST.NEED_CREDITS.replace('{0}', costResult.deductCoins.toString());
            set({ toast: { message: msg, type: 'error', timestamp: Date.now() } });
            return;
          }
          
          if (costResult.deductCoins > 0) {
            audioService.play('WARNING');
            set({ 
                 pendingConfirmation: { type: 'MOVE_WITH_COINS', data: { path, costMoves: costResult.deductMoves, costCoins: costResult.deductCoins } },
                 toast: { message: TEXT[get().language].TOAST.CONFIRM_MOVE.replace('{0}', costResult.deductCoins.toString()), type: 'info', timestamp: Date.now() } 
            });
            return;
          }

          const res = engine.applyAction(session.player.id, { type: 'MOVE', path, stateVersion: session.stateVersion });
          if (res.ok) {
            audioService.play('MOVE');
            set({ session: engine.state });
          } else {
            audioService.play('ERROR');
            set({ toast: { message: res.reason || TEXT[get().language].TOAST.GENERIC_ERROR, type: 'error', timestamp: Date.now() } });
          }
      },

      confirmPendingAction: () => {
          if (!engine || !engine.state || !get().pendingConfirmation) return;
          const { path } = get().pendingConfirmation!.data;
          const res = engine.applyAction(engine.state.player.id, { type: 'MOVE', path, stateVersion: engine.state.stateVersion });
          if (res.ok) {
            audioService.play('MOVE');
            set({ session: engine.state, pendingConfirmation: null });
          } else {
            audioService.play('ERROR');
            set({ toast: { message: res.reason || TEXT[get().language].TOAST.GENERIC_ERROR, type: 'error', timestamp: Date.now() }, pendingConfirmation: null });
          }
      },

      cancelPendingAction: () => {
        if (get().pendingConfirmation) {
            audioService.play('UI_CLICK');
            set({ pendingConfirmation: null });
        }
      },

      // --- INTERACTION DIALOGS ---
      openVoidDialog: (q, r) => { audioService.play('UI_CLICK'); set({ voidDialogTarget: { q, r } }); },
      closeVoidDialog: () => { audioService.play('UI_CLICK'); set({ voidDialogTarget: null }); },
      
      restoreVoidHex: (itemId) => {
          if (!engine || !engine.state) return;
          const target = get().voidDialogTarget;
          if (!target) return;

          const res = engine.applyAction(engine.state.player.id, { 
              type: 'RESTORE_HEX', coord: target, itemId, stateVersion: engine.state.stateVersion 
          });
          
          if (res.ok) {
              audioService.play('GROWTH_START');
              set({ session: engine.state, voidDialogTarget: null });
          } else {
              audioService.play('ERROR');
              set({ toast: { message: res.reason || TEXT[get().language].TOAST.RESTORE_ERROR, type: 'error', timestamp: Date.now() } });
          }
      },

      openMonumentDialog: () => { 
          // Initialize slots based on requirements size (Dynamic for 2.4)
          const state = get().session;
          const count = state?.monumentRequirements?.length || 3;
          const slots = Array(count).fill(null);
          
          audioService.play('SUCCESS'); 
          set({ monumentDialogState: { isOpen: true, slots } }); 
      },
      closeMonumentDialog: () => { 
          audioService.play('UI_CLICK'); 
          // Reset to 3 or dynamic? Doesn't matter if closed.
          set({ monumentDialogState: { isOpen: false, slots: [null, null, null] } }); 
      },

      placeItemInMonument: (item, slotIndex) => {
          const state = get();
          const requirements = state.session?.monumentRequirements;
          if (!requirements || requirements.length <= slotIndex) { audioService.play('ERROR'); return; }

          if (requirements[slotIndex] !== 'ANY' && item.baseId !== requirements[slotIndex]) {
              audioService.play('ERROR');
              state.showToast(TEXT[state.language].TOAST.WRONG_ITEM, "error");
              return;
          }

          audioService.play('UI_CLICK');
          set(state => {
              const newSlots = [...state.monumentDialogState.slots];
              newSlots[slotIndex] = item;
              return { monumentDialogState: { ...state.monumentDialogState, slots: newSlots } };
          });
      },

      removeItemFromMonument: (slotIndex) => {
          audioService.play('UI_CLICK');
          set(state => {
              const newSlots = [...state.monumentDialogState.slots];
              newSlots[slotIndex] = null;
              return { monumentDialogState: { ...state.monumentDialogState, slots: newSlots } };
          });
      },

      activateMonument: () => {
          if (!engine || !engine.state) return;
          const { monumentDialogState, session } = get();
          const reqCount = session?.monumentRequirements?.length || 3;
          
          const items = monumentDialogState.slots.filter((i): i is Item => i !== null);
          if (items.length !== reqCount) {
              audioService.play('ERROR');
              get().showToast(TEXT[get().language].TOAST.SLOTS_FULL, 'error');
              return;
          }

          const res = engine.applyAction(engine.state.player.id, { 
              type: 'ACTIVATE_MONUMENT', itemIds: items.map(i => i.id), stateVersion: engine.state.stateVersion 
          });
          
          if (res.ok) {
              audioService.play('LEVEL_UP'); 
              set({ monumentDialogState: { isOpen: false, slots: Array(reqCount).fill(null) } });
          } else {
              audioService.play('ERROR');
              get().showToast(res.reason || TEXT[get().language].TOAST.ACTIVATION_FAILED, 'error');
          }
      },

      checkTutorialCamera: () => {}, 

      // --- GAME LOOP ---
      tick: async () => {
          if (!engine || !engine.state || isProcessingTick) return;
          if (engine.state.gameStatus !== 'PLAYING' && engine.state.gameStatus !== 'VICTORY') return;
          
          isProcessingTick = true;
          const prevState = get().session;
          
          try {
              const result = await engine.processTick();
              if (!result || !result.state) return;

              tickCount++;
              const now = Date.now();

              // OPTIMIZED GC
              if (tickCount % 50 === 0) {
                  if (result.state.messageLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) result.state.messageLog = result.state.messageLog.slice(0, SAFETY_CONFIG.MAX_LOG_SIZE);
                  if (result.state.botActivityLog.length > SAFETY_CONFIG.MAX_LOG_SIZE) result.state.botActivityLog = result.state.botActivityLog.slice(0, SAFETY_CONFIG.MAX_LOG_SIZE);
                  if (result.state.fullBotHistory.length > SAFETY_CONFIG.MAX_HISTORY_SIZE) result.state.fullBotHistory = result.state.fullBotHistory.slice(result.state.fullBotHistory.length - SAFETY_CONFIG.MAX_HISTORY_SIZE);
                  result.state.effects = result.state.effects.filter(e => e.startTime + e.lifetime > now);
              }

              if (result.events.some(e => e.type === 'MONUMENT_REACHED')) {
                  get().openMonumentDialog();
              }

              if (result.events.length > 0) {
                  const lang = get().language;
                  
                  const newEffectsData: Omit<FloatingText, 'id' | 'startTime'>[] = [];

                  result.events.forEach(event => {
                    const isPlayer = event.entityId === result.state.player.id;
                    
                    if (isPlayer || !event.entityId) {
                        const sound = EVENT_SOUND_MAP[event.type];
                        if (sound) audioService.play(sound as any);
                        if (event.type === 'ENTROPY_SHIFT') {
                            set({ lastVisualEvent: { type: 'ENTROPY_SHIFT', time: now } });
                        }
                    }

                    if (event.type === 'VICTORY') {
                        const currentId = engine?.state?.activeLevelConfig?.id;
                        if (currentId) {
                            const idx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentId);
                            if (idx !== -1 && idx >= get().campaignProgress) {
                                const nextP = Math.min(CAMPAIGN_LEVELS.length, idx + 1);
                                if (nextP > get().campaignProgress) {
                                    set({ campaignProgress: nextP });
                                }
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
                            if (entry.maxLevel > currentLB[existingIdx].maxLevel || (entry.maxLevel === currentLB[existingIdx].maxLevel && entry.maxCoins > currentLB[existingIdx].maxCoins)) {
                                currentLB[existingIdx] = entry;
                            }
                        } else {
                            currentLB.push(entry);
                        }
                        currentLB.sort((a, b) => b.maxLevel !== a.maxLevel ? b.maxLevel - a.maxLevel : b.maxCoins - a.maxCoins);
                        const sliced = currentLB.slice(0, 100);
                        set({ leaderboard: sliced });
                    }

                    // Floating Text
                    if (event.entityId || event.type === 'HEX_COLLAPSE') {
                         const entity = isPlayer ? result.state.player : result.state.bots.find(b => b.id === event.entityId);
                         const targetQ = event.data?.q !== undefined ? Number(event.data.q) : (entity?.q || 0);
                         const targetR = event.data?.r !== undefined ? Number(event.data.r) : (entity?.r || 0);

                         let text = '', color = '#fff', icon: FloatingText['icon'] = undefined;

                         switch (event.type) {
                                case 'LEVEL_UP': text = lang === 'RU' ? "+1 УР" : "+1 LVL"; color = isPlayer ? "#818cf8" : "#f87171"; icon = 'UP'; break;
                                case 'SECTOR_ACQUIRED': text = lang === 'RU' ? "+1 УР" : "+1 LVL"; color = isPlayer ? "#818cf8" : "#f87171"; icon = 'PLUS'; break;
                                
                                case 'SECTOR_EXCAVATED': {
                                    const mat = Number(event.data?.material || 0);
                                    const mvs = Number(event.data?.moves || 0);
                                    
                                    if (mat > 0) {
                                        newEffectsData.push({
                                             q: targetQ, r: targetR,
                                             text: lang === 'RU' ? `+${mat} МАТ` : `+${mat} MAT`, 
                                             color: "#34d399", 
                                             icon: 'PICKAXE',
                                             lifetime: 1200 
                                        });
                                    }
                                    if (mvs > 0) {
                                        newEffectsData.push({
                                             q: targetQ, r: targetR,
                                             text: lang === 'RU' ? `+${mvs} ХОД` : `+${mvs} MOVE`, 
                                             color: "#60a5fa", 
                                             icon: 'FOOTPRINTS',
                                             lifetime: 1200 
                                        });
                                    }
                                    text = ''; // Handled above
                                    break;
                                }

                                case 'RECOVERY_USED': {
                                    if (isPlayer) {
                                        if (event.data?.customText) {
                                            text = String(event.data.customText); color = String(event.data.customColor || '#fbbf24'); icon = 'GEM';
                                        } else {
                                            const c = Number(event.data?.coins || 0);
                                            const m = Number(event.data?.moves || 0);
                                            
                                            if (c > 0) {
                                                newEffectsData.push({
                                                    q: targetQ, r: targetR,
                                                    text: lang === 'RU' ? `+${c} МОН` : `+${c} COIN`,
                                                    color: "#fbbf24",
                                                    icon: 'COIN',
                                                    lifetime: 1200
                                                });
                                            }
                                            
                                            if (m > 0) {
                                                newEffectsData.push({
                                                    q: targetQ, r: targetR,
                                                    text: lang === 'RU' ? `+${m} ХОД` : `+${m} MOVE`,
                                                    color: "#60a5fa",
                                                    icon: 'FOOTPRINTS',
                                                    lifetime: 1200
                                                });
                                            }
                                            text = ''; // Handled above
                                        }
                                    }
                                    break;
                                }

                                case 'HEX_COLLAPSE': text = lang === 'RU' ? "-1 УР" : "-1 LVL"; color = "#ef4444"; icon = 'DOWN'; break;
                                case 'ITEM_DROP': text = lang === 'RU' ? "ПРЕДМЕТ!" : "ITEM FOUND!"; color = "#fcd34d"; icon = 'GEM'; break;
                         }

                         if (text) {
                             newEffectsData.push({
                                 q: targetQ, r: targetR,
                                 text, color, icon,
                                 lifetime: 1200 
                             });
                         }
                    }
                  });
                  
                  // Limit effects using EffectPool to prevent canvas overload
                  result.state.effects = effectPool.addBatch(result.state.effects, newEffectsData);
              }

              let newToast = get().toast;
              const error = result.events.find(e => e.type === 'ACTION_DENIED' || e.type === 'ERROR');
              if (error && error.entityId === engine?.state?.player.id) {
                  // Fallback for engine errors that don't have explicit store UI handling
                  newToast = { message: error.message || 'Error', type: 'error', timestamp: now };
              }

              const shouldRender = tickCount % 2 === 0; 
              const hasCriticalEvents = result.events.length > 0 || newToast !== get().toast;
              const playerStateChanged = prevState && prevState.player.state !== result.state.player.state;

              if (shouldRender || hasCriticalEvents || playerStateChanged) {
                set({ session: result.state, toast: newToast });
              }
          } finally {
              isProcessingTick = false;
          }
      }
    }),
    {
      name: 'hexquest-storage-v4',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
          user: state.user, 
          leaderboard: state.leaderboard,
          campaignProgress: state.campaignProgress,
          isMusicMuted: state.isMusicMuted,
          isSfxMuted: state.isSfxMuted,
          language: state.language
      })
    }
  )
);
