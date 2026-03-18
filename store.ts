import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GameState, Entity, Hex, EntityType, UIState, WinCondition, LeaderboardEntry, EntityState, MoveAction, RechargeAction, SessionState, LogEntry, FloatingText, Language, DeviceType, Difficulty, HexCoord, DestroyItemAction, RestoreHexAction, Item, ActivateMonumentAction, GameEventType, OverworldState } from './types.ts';
import { GAME_CONFIG, DIFFICULTY_SETTINGS, SAFETY_CONFIG, ENTROPY_CONFIG } from './rules/config.ts';
import { getHexKey, getNeighbors, findPath, cubeDistance } from './services/hexUtils.ts';
import { CITY_NAME } from './services/CityGenerator.ts';
import { GameEngine } from './engine/GameEngine.ts';
import { audioService } from './services/audioService.ts';
import { CAMPAIGN_LEVELS } from './campaign/levels.ts';
import { LevelConfig } from './campaign/types.ts';
import { calculateMovementCost } from './rules/movement.ts';
import { generateMap } from './services/mapGenerator.ts';
import { TEXT } from './services/i18n.ts';
import { generateMonumentRecipe, getItemDef } from './rules/items.ts';
import { effectPool } from './services/effectPool.ts';
import { historyService } from './services/historyService.ts';
import { EVENT_REGISTRY } from './rules/events.ts';
import { runtimeEventCache, getGeneratedEvent } from './services/EventComposer.ts';
import { pickOverworldEvent } from './services/eventPicker.ts';
import { getHexHeight } from './services/OverworldGenerator.ts';

// --- CONSTANTS & HELPERS ---

import { createInitialSessionData } from './services/sessionFactory.ts';

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
  resetProgress: () => void;
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
  visitPoi: () => void;
  closeInterior: () => void;
  
  checkTutorialCamera: (deltaX: number) => void;

  // Overworld
  initOverworld: (skipIntro?: boolean) => void;
  moveOverworldPlayer: (path: HexCoord[]) => Promise<void>;
  exploreOverworld: () => void;
  digOverworld: () => void;
  buildOverworld: () => void;
  restOverworld: () => void;
  interactOverworld: (targetQ?: number, targetR?: number) => void;
  completeStartQuiz: (rewards: { credits?: number, reputation?: number, items?: string[] }) => void;
  addTutorialMark: () => void;
  setOverworldActionProgress: (progress: number) => void;
  setOverworldActiveAction: (action: 'DIG' | 'BUILD' | 'EXPLORE' | 'REST' | null) => void;
  transitionToWorldMap: () => Promise<void>;
  enterRift: (riftId: string) => void;
  returnToOverworld: (result: 'VICTORY' | 'DEFEAT') => void;
  triggerEvent: (eventId: string) => void;
  resolveEventChoice: (choice: import('./types.ts').OverworldEventChoice) => void;
  closeEventSummary: () => void;
  equipItem: (itemId: string, slot: 'head' | 'body' | 'tool' | 'artifact', bagIndex: number) => void;
  unequipItem: (slot: 'head' | 'body' | 'tool' | 'artifact' | 'feet' | 'necklace' | 'ring') => void;
  buyItem: (itemId: string, cost: number) => void;
  sellItem: (bagIndex: number, price: number) => void;
  restAtBar: () => void;
}

let engine: GameEngine | null = null;
let tickCount = 0;
let isProcessingTick = false; 

// --- STORE IMPLEMENTATION ---

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      uiState: 'MENU',
      introNextState: 'GAME',
      deviceType: getDeviceType(),
      user: null,
      toast: null,
      pendingConfirmation: null,
      leaderboard: [], 
      campaignProgress: 0, 
      activePoi: null,
      hasActiveSession: false,
      isMusicMuted: false,
      isSfxMuted: false,
      session: null,
      language: 'RU', 
      voidDialogTarget: null,
      monumentDialogState: { isOpen: false, slots: [null, null, null] },
      lastVisualEvent: undefined,
      overworld: {
          grid: {},
          player: {
              q: 0, r: 0, hp: 100, maxHp: 100, energy: 50, maxEnergy: 50, credits: 0,
              equipment: {}, bag: [], reputation: 0, stepCount: 0
          },
          isGenerated: false,
          seed: 0,
          flags: {},
          activeEventId: null,
          activeEventNodeId: null,
          actionProgress: 0,
          activeAction: null,
          visitedHexes: {},
          isOverworldMoving: false,
          isWorldMap: false,
          lastChoiceResult: null,
      },
      
      // --- UI SETTERS ---
      setLanguage: (lang) => set({ language: lang }),
      setUIState: (uiState) => {
        set({ uiState });
      },
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

          const stateUser = get().user;
          const overworldState = get().overworld;
          const initialSessionState = createInitialSessionData(effectiveWin, levelConfig, get().language, stateUser, overworldState);
          engine = new GameEngine(initialSessionState); 
          set({ session: engine.state, hasActiveSession: true, uiState: 'CAMPAIGN_LOADING', introNextState: 'GAME' });
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
          }
          historyService.clear();
          set({ session: null, hasActiveSession: false, uiState: 'MENU', voidDialogTarget: null, monumentDialogState: { isOpen: false, slots: [null, null, null] }, lastVisualEvent: undefined });
      },

      resetProgress: () => {
          get().abandonSession();
          set({ campaignProgress: 0, overworld: undefined });
      },

      downloadSessionLog: () => {
         const history = historyService.getHistory();
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

          if (session.player.state === EntityState.MOVING) {
              audioService.play('ERROR');
              set({ toast: { message: TEXT[get().language].TOAST.ACTOR_MOVING, type: 'error', timestamp: Date.now() } });
              return;
          }
          
          if (dist === 0 && targetHex?.structureType !== 'MONUMENT') return;

          if (!targetHex) {
              audioService.play('ERROR');
              set({ toast: { message: TEXT[get().language].TOAST.INVALID_HEX, type: 'error', timestamp: Date.now() } });
              return;
          }
          
          // MOVEMENT LOGIC
          if (targetHex && targetHex.structureType !== 'VOID' && targetHex.maxLevel > session.player.playerLevel) {
              audioService.play('ERROR');
              set({ toast: { message: TEXT[get().language].HUD.ERROR_RANK, type: 'error', timestamp: Date.now() } });
              return;
          }

          const obstacles = session.bots.map(b => ({ q: b.q, r: b.r }));
          const pathResult = findPath({ q: session.player.q, r: session.player.r }, { q: tq, r: tr }, session.grid, session.player.playerLevel, obstacles);
          const path = pathResult.path;
          
          if (!path) {
            audioService.play('ERROR');
            let msg = TEXT[get().language].TOAST.PATH_BLOCKED;
            if (pathResult.reason === 'VOID' || targetHex?.structureType === 'VOID') {
                 msg = TEXT[get().language].TOAST.PATH_VOID;
            } else if (pathResult.reason === 'RANK') {
                 msg = TEXT[get().language].HUD.ERROR_RANK;
            } else if (pathResult.reason === 'STEEP') {
                 msg = TEXT[get().language].TOAST.TOO_STEEP;
            } else if (pathResult.reason === 'TOO_FAR') {
                 msg = TEXT[get().language].TOAST.TOO_FAR;
            } else if (pathResult.reason === 'OBSTACLE') {
                 msg = TEXT[get().language].TOAST.PATH_BLOCKED;
            }
            set({ toast: { message: msg, type: 'error', timestamp: Date.now() } });
            return;
          }

          const costResult = calculateMovementCost(session.player, path, session.grid);

          if (!costResult.canAfford) {
            audioService.play('ERROR');
            let msg = TEXT[get().language].TOAST.NEED_CREDITS.replace('{0}', costResult.deductCoins.toString());
            if (costResult.reason === 'VOID') msg = TEXT[get().language].TOAST.PATH_VOID;
            else if (costResult.reason === 'STEEP') msg = TEXT[get().language].TOAST.TOO_STEEP;
            else if (costResult.reason === 'INSUFFICIENT_FUNDS') msg = TEXT[get().language].TOAST.NEED_CREDITS.replace('{0}', costResult.deductCoins.toString());
            else if (costResult.reason) msg = costResult.reason;
            
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
            let msg = res.reason || TEXT[get().language].TOAST.GENERIC_ERROR;
            if (res.reason === 'VOID') msg = TEXT[get().language].TOAST.PATH_VOID;
            else if (res.reason === 'STEEP') msg = TEXT[get().language].TOAST.TOO_STEEP;
            else if (res.reason === 'RANK') msg = TEXT[get().language].HUD.ERROR_RANK;
            
            set({ toast: { message: msg, type: 'error', timestamp: Date.now() } });
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
          const state = get().session;
          // Only open if this level uses ACTIVATE_MONUMENT (has explicit requirements set)
          if (state?.monumentRequirements === undefined) return;
          const count = state.monumentRequirements.length;
          const slots = Array(count).fill(null);

          audioService.play('SUCCESS');
          set({ monumentDialogState: { isOpen: true, slots } });
      },
      closeMonumentDialog: () => { 
          audioService.play('UI_CLICK'); 
          set({ monumentDialogState: { isOpen: false, slots: [null, null, null] } }); 
      },
      closeInterior: () => {
          audioService.play('UI_CLICK');
          set(state => {
              if (state.session) {
                  const newSession = { ...state.session };
                  newSession.activePoi = null;
                  return { session: newSession, uiState: 'GAME', activePoi: null };
              }
              return { uiState: 'OVERWORLD', activePoi: null };
          });
      },

      placeItemInMonument: (item, slotIndex) => {
          const state = get();
          const requirements = state.session?.monumentRequirements;
          if (!requirements || requirements.length <= slotIndex) { audioService.play('ERROR'); return; }

          const reqId = requirements[slotIndex];
          const revealedSlots = state.session?.monumentRevealedSlots;
          const isUnrevealed = !!(revealedSlots && !revealedSlots[slotIndex]);

          if (!isUnrevealed && reqId !== 'ANY') {
              const isRarityWild = reqId === 'COMMON' || reqId === 'UNCOMMON' || reqId === 'RARE' || reqId === 'LEGENDARY';
              const isOneOf = reqId === 'ONE_OF';
              const alts = state.session?.monumentAlternatives ?? [];
              const mismatch = isOneOf ? !alts.includes(item.baseId)
                  : isRarityWild ? item.rarity !== reqId : item.baseId !== reqId;
              if (mismatch) {
                  audioService.play('ERROR');
                  state.showToast(TEXT[state.language].TOAST.WRONG_ITEM, "error");
                  return;
              }
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
          const reqCount = session?.monumentRequirements?.length ?? 3;
          
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

      visitPoi: () => {
          if (!engine || !engine.state) return;
          const session = engine.state;
          const currentHex = session.grid[getHexKey(session.player.q, session.player.r)];
          
          if (!currentHex || !currentHex.poiType) {
              audioService.play('ERROR');
              return;
          }

          const res = engine.applyAction(session.player.id, { 
              type: 'VISIT_POI', poiType: currentHex.poiType, stateVersion: session.stateVersion 
          });

          if (res.ok) {
              audioService.play('SUCCESS');
              set({ session: engine.state });
          } else {
              audioService.play('ERROR');
              get().showToast(res.reason || "Action Failed", 'error');
          }
      },

      checkTutorialCamera: () => {}, 

      // --- OVERWORLD ---
      initOverworld: async (skipIntro = false) => {
          const isFirstTime = !get().overworld.isGenerated;
          if (isFirstTime && !skipIntro) {
              set({ uiState: 'INTRO', introNextState: 'INTERIOR' });
          }
          try {
              const { generateOverworld } = await import('./services/OverworldGenerator.ts');
              const seed = Math.random();
              const grid = generateOverworld(20, seed, false); // Start in City View
              set(state => ({
                  overworld: {
                      ...state.overworld,
                      grid,
                      isGenerated: true,
                      seed,
                      isWorldMap: false,
                      player: {
                          q: 0, r: 0, hp: 100, maxHp: 100, energy: 50, maxEnergy: 50, credits: 0,
                          equipment: {}, bag: [], reputation: 0, stepCount: 0
                      },
                      flags: {},
                      activeEventId: null,
                      activeEventNodeId: null,
                      visitedHexes: { [getHexKey(0, 0)]: true },
                      isOverworldMoving: false,
                      hasCompletedStartQuiz: false,
                      tutorialMarks: 0,
                      cityName: CITY_NAME
                  },
                  activePoi: 'city_capitol',
                  uiState: (isFirstTime && !skipIntro) ? state.uiState : 'INTERIOR'
              }));
          } catch (err) {
              console.error('Failed to init overworld:', err);
              get().showToast(TEXT[get().language].TOAST.WORLD_INIT_FAILED, 'error');
              set({ uiState: 'OVERWORLD' });
          }
      },

      moveOverworldPlayer: async (path: HexCoord[]) => {
          if (path.length === 0 || get().overworld.isOverworldMoving) return;
          
          set(state => ({ overworld: { ...state.overworld, isOverworldMoving: true } }));
          
          const { generateHexData, getSpecialFeature, getHexHeight } = await import('./services/OverworldGenerator.ts');
          
          try {
              for (const step of path) {
                  const state = get();
                  const currentOverworld = state.overworld;
                  const player = currentOverworld.player;
                  const key = getHexKey(step.q, step.r);
                  let hex = currentOverworld.grid[key];

                  // Lazy generation: if hex doesn't exist, generate it to check moveCost
                  if (!hex) {
                      const baseHex = generateHexData(step.q, step.r, currentOverworld.seed);
                      const special = getSpecialFeature(step.q, step.r, currentOverworld.seed, 20);
                      const terrainType = special.terrainType || baseHex.terrainType;
                      const moveCost = special.moveCost ?? baseHex.moveCost;
                      hex = {
                          ...baseHex,
                          ...special,
                          terrainType,
                          moveCost,
                          isPassable: moveCost < 999,
                          height: special.height ?? (special.terrainType ? getHexHeight(special.terrainType) : baseHex.height)
                      };
                  }

                  if (player.hp <= 0) {
                      get().showToast(TEXT[state.language].TOAST.NEED_HP.replace('{0}', '1'), 'error');
                      break;
                  }

                  if (player.energy < hex.moveCost) {
                      get().showToast(TEXT[state.language].TOAST.NEED_ENERGY.replace('{0}', hex.moveCost.toString()), 'error');
                      break;
                  }

                  let shouldBreak = false;
                  let justLeftCity = false;
                  
                  const currentDist = cubeDistance({ q: 0, r: 0 }, { q: player.q, r: player.r });
                  const nextDist = cubeDistance({ q: 0, r: 0 }, { q: step.q, r: step.r });
                  
                  if (currentDist <= 2 && nextDist > 2) {
                      const marks = currentOverworld.tutorialMarks || 0;
                      if (marks < 6) {
                          get().showToast(state.language === 'RU' 
                              ? `Для выхода нужно 6 меток обучения. У вас: ${marks}` 
                              : `You need 6 tutorial marks to exit. You have: ${marks}`, 'error');
                          break;
                      } else if (!currentOverworld.flags.hasLeftCity) {
                          justLeftCity = true;
                          get().showToast(state.language === 'RU'
                              ? `Путь открыт. Добро пожаловать в пустоши.`
                              : `The path is clear. Welcome to the wastelands.`, 'success');
                      }
                  }

                  set(state => {
                      const newOverworld = { ...state.overworld };
                      if (!newOverworld.flags) newOverworld.flags = {};
                      if (justLeftCity) {
                          newOverworld.flags = { ...newOverworld.flags, hasLeftCity: true };
                      }
                      newOverworld.visitedHexes = { ...(newOverworld.visitedHexes || {}) };
                      
                      const player = { ...newOverworld.player };
                      const grid = { ...newOverworld.grid };
                      
                      // Ensure hex is in grid
                      if (!grid[key]) {
                          grid[key] = hex;
                      }
                      
                      if (hex.moveCost >= 999) {
                          shouldBreak = true;
                          return state;
                      }
                      
                      player.energy -= hex.moveCost;
                      player.q = step.q;
                      player.r = step.r;
                      player.stepCount = (player.stepCount ?? 0) + 1;
                      
                      // Reveal fog of war (radius 1)
                      const revealRadius = 1;
                      for (let dq = -revealRadius; dq <= revealRadius; dq++) {
                          for (let dr = Math.max(-revealRadius, -dq - revealRadius); dr <= Math.min(revealRadius, -dq + revealRadius); dr++) {
                              const nq = step.q + dq;
                              const nr = step.r + dr;
                              const nk = getHexKey(nq, nr);
                              
                              if (!grid[nk]) {
                                  // Generate neighbors too if they don't exist
                                  const baseN = generateHexData(nq, nr, newOverworld.seed);
                                  const specialN = getSpecialFeature(nq, nr, newOverworld.seed, 20);
                                  const terrainType = specialN.terrainType || baseN.terrainType;
                                  const moveCost = specialN.moveCost ?? baseN.moveCost;
                                  
                                  grid[nk] = {
                                      ...baseN,
                                      ...specialN,
                                      terrainType,
                                      moveCost,
                                      isPassable: moveCost < 999,
                                      height: specialN.height ?? (specialN.terrainType ? getHexHeight(specialN.terrainType) : baseN.height)
                                  };
                              }
                              
                              grid[nk] = { ...grid[nk], isRevealed: true };
                          }
                      }
                      
                      newOverworld.player = player;
                      newOverworld.grid = grid;
                      
                      // Check if already visited to prevent repeating events
                      const alreadyVisited = !!newOverworld.visitedHexes[key];
                      newOverworld.visitedHexes[key] = true;

                      if (!alreadyVisited) {
                          // Random event chance on step, or guaranteed event on POI
                          if (hex.poiId) {
                              // High chance to trigger a specific event for POIs
                              if (Math.random() < 0.5) {
                                  const flags = newOverworld.flags || {};
                                  const eventId = pickOverworldEvent(hex.terrainType, flags, player.reputation ?? 0, player.stepCount ?? 0);
                                  if (eventId) {
                                      setTimeout(() => get().triggerEvent(eventId), 10);
                                      shouldBreak = true;
                                  }
                              }
                          } else if (!hex.riftId && hex.terrainType !== 'CITY') {
                              // No random events inside the city walls
                              const distToCenter = cubeDistance({ q: 0, r: 0 }, { q: hex.q, r: hex.r });
                              if (distToCenter > 6) {
                                  const chance = hex.terrainType === 'ROAD' ? 0.15 : 0.08;
                                  if (Math.random() < chance) {
                                      const flags = newOverworld.flags || {};
                                      const eventId = pickOverworldEvent(hex.terrainType, flags, player.reputation ?? 0, player.stepCount ?? 0);
                                      if (eventId) {
                                          setTimeout(() => get().triggerEvent(eventId), 10);
                                          shouldBreak = true;
                                      }
                                  }
                              }
                          }
                      }

                      return { overworld: newOverworld };
                  });
                  
                  // Check for city exit
                  if (!currentOverworld.isWorldMap && hex.poiId === 'city_checkpoint') {
                      const marks = currentOverworld.tutorialMarks || 0;
                      if (marks >= 6) {
                          await get().transitionToWorldMap();
                          shouldBreak = true;
                      } else {
                          get().showToast(TEXT[state.language].TOAST.CITY_EXIT_DENIED, 'error');
                          shouldBreak = true;
                      }
                  }
                  
                  if (shouldBreak) break;
                  
                  // Wait for animation (slightly longer than 400ms to ensure completion)
                  await new Promise(resolve => setTimeout(resolve, 500));
              }
          } finally {
              set(state => ({ overworld: { ...state.overworld, isOverworldMoving: false } }));
          }
      },

      exploreOverworld: () => {
          const state = get();
          if (state.overworld.activeAction) return;

          const player = state.overworld.player;
          const key = getHexKey(player.q, player.r);
          const hex = state.overworld.grid[key];

          if (hex?.terrainType === 'CITY') {
              get().showToast(state.language === 'RU' ? 'В городе нельзя проводить исследования' : 'Cannot explore inside the city', 'error');
              return;
          }

          if (player.hp < 10) {
              get().showToast(TEXT[get().language].TOAST.NEED_HP.replace('{0}', '10'), 'error');
              return;
          }
          if (player.energy < 3) {
              get().showToast(TEXT[get().language].TOAST.NEED_ENERGY.replace('{0}', '3'), 'error');
              return;
          }

          // Start action
          get().setOverworldActiveAction('EXPLORE');
          
          const duration = 3000;
          const interval = 100;
          let elapsed = 0;

          const timer = setInterval(() => {
              elapsed += interval;
              const progress = Math.min(100, (elapsed / duration) * 100);
              get().setOverworldActionProgress(progress);

              if (elapsed >= duration) {
                  clearInterval(timer);
                  set(state => {
                      const newOverworld = { ...state.overworld };
                      const player = { ...newOverworld.player };
                      player.bag = [...(player.bag ?? [])];

                      newOverworld.activeAction = null;
                      newOverworld.actionProgress = 0;

                      player.energy -= 3;
                      
                      const roll = Math.random();
                      
                      // 30% chance to trigger an event
                      if (roll < 0.3) {
                          const flags = newOverworld.flags || {};
                          const currentHex = newOverworld.grid[getHexKey(player.q, player.r)];
                          const eventId = pickOverworldEvent(currentHex?.terrainType || 'PLAINS', flags, player.reputation ?? 0, player.stepCount ?? 0);
                          if (eventId) {
                              setTimeout(() => get().triggerEvent(eventId), 10);
                              newOverworld.player = player;
                              return { overworld: newOverworld };
                          }
                      }
                      
                      // Normal exploration (70% chance)
                      if (roll < 0.7) {
                          // Success
                          const rewardRoll = Math.random();
                          if (rewardRoll < 0.33) {
                              player.credits += 10;
                              get().showToast(TEXT[get().language].TOAST.FOUND_CREDITS.replace('{0}', '10'), 'success');
                          } else if (rewardRoll < 0.66) {
                              player.bag.push('SUPPLIES');
                              get().showToast(TEXT[get().language].TOAST.FOUND_SUPPLIES, 'success');
                          } else {
                              player.bag.push('SCRAP');
                              get().showToast(TEXT[get().language].TOAST.FOUND_SCRAP, 'success');
                          }
                      } else {
                          // Failure
                          player.hp -= 10;
                          get().showToast(TEXT[get().language].TOAST.TRAP_HIT.replace('{0}', '10'), 'error');
                          if (player.hp <= 0) {
                              player.hp = player.maxHp;
                              player.energy = player.maxEnergy;
                              player.credits = Math.floor(player.credits * 0.5);
                              const cityHex = Object.values(newOverworld.grid).find(h => h.terrainType === 'CITY');
                              if (cityHex) {
                                  player.q = cityHex.q;
                                  player.r = cityHex.r;
                              } else {
                                  player.q = 0;
                                  player.r = 0;
                              }
                              get().showToast(TEXT[get().language].TOAST.DEATH_OVERWORLD, 'error');
                          }
                      }

                      newOverworld.player = player;
                      return { overworld: newOverworld };
                  });
              }
          }, interval);
      },

      completeStartQuiz: (rewards) => {
          set(state => {
              const newOverworld = { ...state.overworld };
              newOverworld.hasCompletedStartQuiz = true;
              
              if (rewards.credits) newOverworld.player.credits += rewards.credits;
              if (rewards.reputation) newOverworld.player.reputation += rewards.reputation;
              if (rewards.items) {
                  newOverworld.player.bag = [...newOverworld.player.bag, ...rewards.items];
              }
              
              return { overworld: newOverworld };
          });
      },

      addTutorialMark: () => {
          set(state => {
              const newOverworld = { ...state.overworld };
              newOverworld.tutorialMarks = (newOverworld.tutorialMarks || 0) + 1;
              return { overworld: newOverworld };
          });
      },

      transitionToWorldMap: async () => {
          const state = get();
          const { generateOverworld } = await import('./services/OverworldGenerator.ts');
          const seed = state.overworld.seed;
          const grid = generateOverworld(20, seed, true);
          
          set(state => ({
              overworld: {
                  ...state.overworld,
                  grid,
                  isWorldMap: true,
                  player: {
                      ...state.overworld.player,
                      q: 0,
                      r: 0
                  },
                  visitedHexes: { [getHexKey(0, 0)]: true }
              }
          }));
          
          get().showToast(TEXT[get().language].TOAST.CITY_EXIT_SUCCESS, 'success');
      },

      setOverworldActionProgress: (progress: number) => {
          set(state => ({
              overworld: { ...state.overworld, actionProgress: progress }
          }));
      },

      setOverworldActiveAction: (action: 'DIG' | 'BUILD' | 'EXPLORE' | 'REST' | null) => {
          set(state => ({
              overworld: { ...state.overworld, activeAction: action, actionProgress: 0 }
          }));
      },

      digOverworld: () => {
          const state = get();
          if (state.overworld.activeAction) return;

          const player = state.overworld.player;
          const key = getHexKey(player.q, player.r);
          const hex = state.overworld.grid[key];

          if (player.hp < 5) {
              get().showToast(TEXT[get().language].TOAST.NEED_HP.replace('{0}', '5'), 'error');
              return;
          }
          if (player.energy < 2) {
              get().showToast(TEXT[get().language].TOAST.NEED_ENERGY.replace('{0}', '2'), 'error');
              return;
          }

          if (hex.terrainType === 'CITY' || hex.riftId || hex.isIndestructible) {
              get().showToast(TEXT[get().language].TOAST.CANNOT_DIG, 'error');
              return;
          }

          const currentHeight = hex.height ?? getHexHeight(hex.terrainType);
          const targetHeight = currentHeight - 1;

          // 1. HIGH GROUND RULE
          if (currentHeight > 0) {
              const neighbors = getNeighbors(player.q, player.r);
              const neighborHexes = neighbors
                  .map(n => state.overworld.grid[getHexKey(n.q, n.r)])
                  .filter(h => h);
              
              if (neighborHexes.length > 0) {
                  const minNeighborLevel = Math.min(...neighborHexes.map(h => h.height ?? getHexHeight(h.terrainType)));
                  if (targetHeight <= minNeighborLevel) {
                      get().showToast(TEXT[get().language].TOAST.GRADIENT_LOCK.replace('{0}', minNeighborLevel.toString()), 'error');
                      return;
                  }
              }
          } else if (targetHeight < -1) {
              // 3. REVERSE STAIRCASE RULE (Deep Digging < -1)
              const neighbors = getNeighbors(player.q, player.r);
              const deepNeighbors = neighbors.filter(n => {
                  const h = state.overworld.grid[getHexKey(n.q, n.r)];
                  if (!h) return false;
                  const hHeight = h.height ?? getHexHeight(h.terrainType);
                  return hHeight === currentHeight;
              });
              if (deepNeighbors.length < 2) {
                  const reqLvlStr = currentHeight >= 0 ? `L${currentHeight}` : `${currentHeight}`;
                  get().showToast(TEXT[get().language].TOAST.UNSTABLE_DIG.replace('{0}', reqLvlStr), 'error');
                  return;
              }
          }

          // Start action
          get().setOverworldActiveAction('DIG');
          
          const duration = 3000;
          const interval = 100;
          let elapsed = 0;

          const timer = setInterval(() => {
              elapsed += interval;
              const progress = Math.min(100, (elapsed / duration) * 100);
              get().setOverworldActionProgress(progress);

              if (elapsed >= duration) {
                  clearInterval(timer);
                  set(state => {
                      const newOverworld = { ...state.overworld };
                      const player = { ...newOverworld.player };
                      const key = getHexKey(player.q, player.r);
                      const hex = { ...newOverworld.grid[key] };
                      hex.height = targetHeight;
                      newOverworld.grid[key] = hex;
                      
                      player.energy -= 2;
                      newOverworld.player = player;
                      newOverworld.activeAction = null;
                      newOverworld.actionProgress = 0;
                      
                      audioService.play('CRACK');
                      get().showToast(TEXT[get().language].TOAST.EXCAVATED, 'success');

                      return { overworld: newOverworld };
                  });
              }
          }, interval);
      },

      buildOverworld: () => {
          const state = get();
          if (state.overworld.activeAction) return;

          const player = state.overworld.player;
          const key = getHexKey(player.q, player.r);
          const hex = state.overworld.grid[key];

          if (player.hp < 5) {
              get().showToast(TEXT[get().language].TOAST.NEED_HP.replace('{0}', '5'), 'error');
              return;
          }
          if (player.energy < 2) {
              get().showToast(TEXT[get().language].TOAST.NEED_ENERGY.replace('{0}', '2'), 'error');
              return;
          }

          if (hex.terrainType === 'WATER') {
              get().showToast(TEXT[get().language].TOAST.CANNOT_BUILD_WATER, 'error');
              return;
          }

          if (hex.terrainType === 'CITY' || hex.riftId || hex.isIndestructible) {
              get().showToast(TEXT[get().language].TOAST.CANNOT_BUILD, 'error');
              return;
          }

          const currentHeight = hex.height ?? getHexHeight(hex.terrainType);
          const targetHeight = currentHeight + 1;

          if (targetHeight > 1) {
              const neighbors = getNeighbors(player.q, player.r);
              const supports = neighbors.filter(n => {
                  const h = state.overworld.grid[getHexKey(n.q, n.r)];
                  if (!h) return false;
                  const hHeight = h.height ?? getHexHeight(h.terrainType);
                  return hHeight >= currentHeight;
              });
              if (supports.length < 2) {
                  get().showToast(TEXT[get().language].TOAST.UNSTABLE_BUILD.replace('{0}', currentHeight.toString()), 'error');
                  return;
              }
          }

          // Start action
          get().setOverworldActiveAction('BUILD');
          
          const duration = 3000;
          const interval = 100;
          let elapsed = 0;

          const timer = setInterval(() => {
              elapsed += interval;
              const progress = Math.min(100, (elapsed / duration) * 100);
              get().setOverworldActionProgress(progress);

              if (elapsed >= duration) {
                  clearInterval(timer);
                  set(state => {
                      const newOverworld = { ...state.overworld };
                      const player = { ...newOverworld.player };
                      const key = getHexKey(player.q, player.r);
                      const hex = { ...newOverworld.grid[key] };
                      hex.height = targetHeight;
                      newOverworld.grid[key] = hex;
                      
                      player.energy -= 2;
                      newOverworld.player = player;
                      newOverworld.activeAction = null;
                      newOverworld.actionProgress = 0;
                      
                      audioService.play('GROWTH_START');
                      get().showToast(TEXT[get().language].TOAST.RAISED_TERRAIN, 'success');

                      return { overworld: newOverworld };
                  });
              }
          }, interval);
      },

      restOverworld: () => {
          const state = get();
          if (state.overworld.activeAction) return;

          const player = state.overworld.player;
          const key = getHexKey(player.q, player.r);
          const hex = state.overworld.grid[key];

          // Check prerequisites
          if (hex.terrainType === 'CITY') {
              if (player.credits < 5) {
                  get().showToast(TEXT[get().language].TOAST.NEED_CREDITS.replace('{0}', '5'), 'error');
                  return;
              }
          } else {
              const supplyIndex = player.bag.indexOf('SUPPLIES');
              if (supplyIndex === -1 && player.hp <= 10) {
                  // If no supplies and low HP, we might die, but we can still try to rest
              }
          }

          // Start action
          get().setOverworldActiveAction('REST');
          
          const duration = 3000;
          const interval = 100;
          let elapsed = 0;

          const timer = setInterval(() => {
              elapsed += interval;
              const progress = Math.min(100, (elapsed / duration) * 100);
              get().setOverworldActionProgress(progress);

              if (elapsed >= duration) {
                  clearInterval(timer);
                  let toastMsg = '';
                  let toastType: 'success' | 'error' | 'info' = 'success';

                  set(state => {
                      const newOverworld = { ...state.overworld };
                      const player = { ...newOverworld.player };
                      player.bag = [...(player.bag ?? [])];
                      const key = getHexKey(player.q, player.r);
                      const hex = newOverworld.grid[key];

                      newOverworld.activeAction = null;
                      newOverworld.actionProgress = 0;

                      if (hex.terrainType === 'CITY') {
                          if (player.credits >= 5) {
                              player.credits -= 5;
                              player.energy = player.maxEnergy;
                              player.hp = Math.min(player.maxHp, player.hp + 20);
                              toastMsg = TEXT[get().language].TOAST.REST_CITY;
                              toastType = 'success';
                          } else {
                              toastMsg = TEXT[get().language].TOAST.NEED_CREDITS.replace('{0}', '5');
                              toastType = 'error';
                          }
                      } else {
                          const supplyIndex = player.bag.indexOf('SUPPLIES');
                          if (supplyIndex !== -1) {
                              player.bag.splice(supplyIndex, 1);
                              player.energy = player.maxEnergy;
                              player.hp = Math.min(player.maxHp, player.hp + 20);
                              toastMsg = TEXT[get().language].TOAST.REST_SUPPLIES;
                              toastType = 'success';
                          } else {
                              if (player.hp <= 10) {
                                  player.hp = 0;
                                  player.energy = player.maxEnergy;
                                  player.credits = Math.floor(player.credits * 0.5);
                                  const cityHex = Object.values(newOverworld.grid).find(h => h.terrainType === 'CITY');
                                  if (cityHex) {
                                      player.q = cityHex.q;
                                      player.r = cityHex.r;
                                  } else {
                                      player.q = 0;
                                      player.r = 0;
                                  }
                                  player.hp = player.maxHp;
                                  toastMsg = TEXT[get().language].TOAST.STARVED_OVERWORLD;
                                  toastType = 'error';
                              } else {
                                  player.energy = Math.min(player.maxEnergy, player.energy + Math.floor(player.maxEnergy / 2));
                                  player.hp -= 10;
                                  toastMsg = TEXT[get().language].TOAST.REST_STARVING;
                                  toastType = 'error';
                              }
                          }
                      }

                      newOverworld.player = player;
                      return { overworld: newOverworld };
                  });

                  if (toastMsg) {
                      get().showToast(toastMsg, toastType);
                  }
              }
          }, interval);
      },

      interactOverworld: (targetQ?: number, targetR?: number) => {
          const state = get();
          const player = state.overworld.player;
          let q = targetQ !== undefined ? targetQ : player.q;
          let r = targetR !== undefined ? targetR : player.r;
          let key = getHexKey(q, r);
          let hex = state.overworld.grid[key];
          const flags = state.overworld.flags || {};

          // If no target specified and current hex has no interactable, check neighbors
          if (targetQ === undefined && targetR === undefined && (!hex || (!hex.poiId && !hex.riftId))) {
              const neighbors = getNeighbors(player.q, player.r);
              for (const n of neighbors) {
                  const nKey = getHexKey(n.q, n.r);
                  const nHex = state.overworld.grid[nKey];
                  if (nHex && (nHex.poiId || nHex.riftId)) {
                      q = n.q;
                      r = n.r;
                      key = nKey;
                      hex = nHex;
                      break;
                  }
              }
          }

          if (!hex || (!hex.poiId && !hex.riftId)) {
              state.showToast(TEXT[state.language].TOAST.NOTHING_INTERACT, 'info');
              return;
          }

          if (hex.poiId) {

              if (hex.poiId === 'city_checkpoint') {
                  const marks = state.overworld.tutorialMarks || 0;
                  if (marks >= 6) {
                      get().transitionToWorldMap();
                  } else {
                      state.showToast(TEXT[state.language].TOAST.CITY_EXIT_DENIED, 'error');
                      audioService.play('ERROR');
                  }
                  return;
              }

              if (hex.poiId.startsWith('city_')) {
                  set({ activePoi: hex.poiId, uiState: 'INTERIOR' });
                  return;
              }
              const eventDef = EVENT_REGISTRY[hex.poiId];
              const isCompleted = flags[`${hex.poiId}_completed`];
              
              if (eventDef?.isUnique && isCompleted) {
                  state.showToast(TEXT[state.language].TOAST.NOTHING_HERE, 'info');
              } else {
                  state.triggerEvent(hex.poiId);
              }
          } else if (hex.riftId) {
              // Check if rift is unlocked
              const riftIdNum = parseInt(hex.riftId);
              const progress = state.campaignProgress;
              
              // Series 1: 1-6, Series 2: 7-11, Series 3: 12-19, Series 4: 20-26
              let isLocked = false;
              if (riftIdNum >= 7 && riftIdNum <= 11 && progress < 6) isLocked = true;
              if (riftIdNum >= 12 && riftIdNum <= 19 && progress < 11) isLocked = true;
              if (riftIdNum >= 20 && progress < 19) isLocked = true;

              if (isLocked) {
                  state.showToast(TEXT[state.language].TOAST.RIFT_LOCKED, 'info');
                  audioService.play('ERROR');
              } else {
                  state.enterRift(hex.riftId);
              }
          } else if (hex.terrainType === 'OUTPOST') {
              state.triggerEvent('outpost_checkpoint');
          } else if (hex.terrainType === 'RUINS') {
              const f = state.overworld.flags || {};
              const eventId = !f['ruins_inscription_completed']
                  ? 'ruins_inscription'
                  : !f['hidden_cache_completed']
                  ? 'hidden_cache'
                  : f['ruins_curse_active']
                  ? 'ruins_nightmare'
                  : f['ruins_inscription_copied']
                  ? 'ruins_echo'
                  : 'ancient_ruins';
              state.triggerEvent(eventId);
          } else if (hex.terrainType === 'MERCHANT_CAMP') {
              state.triggerEvent('merchant_camp_visit');
          } else if (hex.terrainType === 'ROAD') {
              const f = state.overworld.flags || {};
              const eventId = !f['wounded_courier_completed'] ? 'wounded_courier' : 'road_pilgrims';
              state.triggerEvent(eventId);
          } else {
              state.showToast(TEXT[state.language].TOAST.NOTHING_INTERACT, 'info');
          }
      },

      enterRift: (riftId: string) => {
          const state = get();
          const player = state.overworld.player;
          
          if (player.hp < 20) {
              get().showToast(TEXT[get().language].TOAST.NEED_HP.replace('{0}', '20'), 'error');
              return;
          }
          if (player.energy < 10) {
              get().showToast(TEXT[get().language].TOAST.NEED_ENERGY.replace('{0}', '10'), 'error');
              return;
          }

          get().startCampaignLevel(riftId);
      },

      returnToOverworld: (result: 'VICTORY' | 'DEFEAT') => {
          set(state => {
              const newOverworld = { ...state.overworld };
              const player = { ...newOverworld.player };
              const key = getHexKey(player.q, player.r);
              const hex = newOverworld.grid[key];

                      if (result === 'VICTORY') {
                          // Reward
                          player.credits += 50;
                          
                          const levelId = state.session?.activeLevelConfig?.id || '';
                          const levelIdNum = parseInt(levelId);
                          const isSimulation = levelIdNum >= 1 && levelIdNum <= 6;
                          
                          if (isSimulation) {
                              get().showToast(TEXT[get().language].TOAST.SIMULATION_VICTORY?.replace('{0}', '50') || `Simulation complete! +50 credits`, 'success');
                              
                              // Award Tutorial Mark if it was a Season 1 level and not already completed
                              if (!newOverworld.flags) newOverworld.flags = {};
                              if (!newOverworld.flags[`level_${levelId}_completed`]) {
                                  newOverworld.tutorialMarks = (newOverworld.tutorialMarks || 0) + 1;
                                  newOverworld.flags[`level_${levelId}_completed`] = true;
                              }
                          } else {
                          get().showToast(TEXT[get().language].TOAST.RIFT_VICTORY.replace('{0}', '50'), 'success');
                      }

                      // Close the rift
                      if (hex && hex.riftId) {
                          newOverworld.grid = {
                              ...newOverworld.grid,
                              [key]: { ...hex, riftId: undefined, isRevealed: true }
                          };
                      }

                      // Check for Campaign Victory
                      const remainingRifts = Object.values(newOverworld.grid).filter(h => h.riftId).length;
                      const totalRiftsGenerated = Object.values(newOverworld.grid).filter(h => h.riftId || (newOverworld.flags && newOverworld.flags[`${h.riftId}_completed`])).length;
                      
                      // Only trigger victory if we've generated at least some rifts and cleared them all
                      if (remainingRifts === 0 && totalRiftsGenerated > 5) {
                          setTimeout(() => {
                              set({ uiState: 'INTRO', introNextState: 'MENU' });
                              get().showToast(TEXT[get().language].TOAST.CAMPAIGN_COMPLETE, 'success');
                          }, 2000);
                      }
                  } else {
                  // Penalty
                  const isSimulation = state.session?.activeLevelConfig?.id?.startsWith('1.');
                  
                  if (isSimulation) {
                      get().showToast(TEXT[get().language].TOAST.SIMULATION_DEFEAT || `Simulation failed. Try again.`, 'error');
                  } else {
                      player.hp -= 30;
                      get().showToast(TEXT[get().language].TOAST.RIFT_DEFEAT.replace('{0}', '30'), 'error');
                      if (player.hp <= 0) {
                          player.hp = player.maxHp;
                          player.energy = player.maxEnergy;
                          player.credits = Math.floor(player.credits * 0.5); // Lose half credits
                          
                          // Find city to respawn
                          const cityHex = Object.values(newOverworld.grid).find(h => h.terrainType === 'CITY');
                          if (cityHex) {
                              player.q = cityHex.q;
                              player.r = cityHex.r;
                          } else {
                              player.q = 0;
                              player.r = 0;
                          }
                          get().showToast(TEXT[get().language].TOAST.DEATH_OVERWORLD, 'error');
                      }
                  }
              }

              newOverworld.player = player;

              // Cleanup game session
              if (engine) {
                  engine.destroy();
                  engine = null;
              }

              return { 
                  overworld: newOverworld,
                  session: null,
                  hasActiveSession: false,
                  uiState: 'OVERWORLD',
                  voidDialogTarget: null,
                  monumentDialogState: { isOpen: false, slots: [null, null, null] },
                  lastVisualEvent: undefined
              };
          });
      },

      triggerEvent: (eventId: string) => {
          set(state => {
              const newOverworld = { ...state.overworld };
              const event = EVENT_REGISTRY[eventId] ?? runtimeEventCache[eventId];
              if (!event) return state;
              newOverworld.activeEventId = eventId;
              newOverworld.activeEventNodeId = event.startNodeId;
              return { overworld: newOverworld };
          });
      },

      closeEventSummary: () => {
          set(state => {
              const newOverworld = { ...state.overworld };
              newOverworld.activeEventId = null;
              newOverworld.activeEventNodeId = null;
              newOverworld.lastChoiceResult = null;
              return { overworld: newOverworld };
          });
      },

      resolveEventChoice: (choice: import('./types.ts').OverworldEventChoice) => {
          set(state => {
              const newOverworld = { ...state.overworld };
              if (!newOverworld.flags) newOverworld.flags = {};
              const player = { ...newOverworld.player };
              player.bag = [...(player.bag ?? [])];
              const eventId = newOverworld.activeEventId;
              
              if (!eventId) return state;

              // Validate prerequisites before processing
              if (choice.reqCredits && player.credits < choice.reqCredits) {
                  get().showToast(TEXT[get().language].TOAST.NEED_CREDITS.replace('{0}', choice.reqCredits.toString()), 'error');
                  return state;
              }
              if (choice.reqItem && !player.bag.includes(choice.reqItem)) {
                  get().showToast(TEXT[get().language].TOAST.WRONG_ITEM, 'error');
                  return state;
              }
              if (choice.reqFlag && !newOverworld.flags[choice.reqFlag]) return state;
              if (choice.reqFlagAbsent && newOverworld.flags[choice.reqFlagAbsent]) return state;
              const rep = player.reputation ?? 0;
              if (choice.reqRepMin !== undefined && rep < choice.reqRepMin) return state;
              if (choice.reqRepMax !== undefined && rep > choice.reqRepMax) return state;
              if (choice.reqStepMin !== undefined && (player.stepCount ?? 0) < choice.reqStepMin) return state;

              // Apply rewards
              if (choice.reward) {
                  if (choice.reward.credits) player.credits += choice.reward.credits;
                  if (choice.reward.hp) player.hp = Math.min(player.maxHp, player.hp + choice.reward.hp);
                  if (choice.reward.energy) player.energy = Math.min(player.maxEnergy, player.energy + choice.reward.energy);
                  if (choice.reward.items) player.bag.push(...choice.reward.items);
              }

              // Apply penalties
              if (choice.penalty) {
                  if (choice.penalty.credits) player.credits = Math.max(0, player.credits - choice.penalty.credits);
                  if (choice.penalty.hp) player.hp = Math.max(0, player.hp - choice.penalty.hp);
                  if (choice.penalty.energy) player.energy = Math.max(0, player.energy - choice.penalty.energy);
                  if (choice.penalty.items) {
                      choice.penalty.items.forEach(item => {
                          const idx = player.bag.indexOf(item);
                          if (idx > -1) player.bag.splice(idx, 1);
                      });
                  }
                  
                  if (player.hp <= 0) {
                      player.hp = player.maxHp;
                      player.energy = player.maxEnergy;
                      player.credits = Math.floor(player.credits * 0.5);
                      const cityHex = Object.values(newOverworld.grid).find(h => h.terrainType === 'CITY');
                      if (cityHex) {
                          player.q = cityHex.q;
                          player.r = cityHex.r;
                      } else {
                          player.q = 0;
                          player.r = 0;
                      }
                      get().showToast(TEXT[get().language].TOAST.DEATH_OVERWORLD, 'error');
                      newOverworld.activeEventId = null;
                      newOverworld.activeEventNodeId = null;
                      newOverworld.player = player;
                      return { overworld: newOverworld };
                  }
              }

              // Apply reputation change
              if (choice.addReputation) {
                  player.reputation = Math.max(-100, Math.min(100, (player.reputation ?? 0) + choice.addReputation));
              }

              newOverworld.player = player;

              // Apply flag changes
              if (choice.setFlag) {
                  const flags = Array.isArray(choice.setFlag) ? choice.setFlag : [choice.setFlag];
                  flags.forEach(f => { newOverworld.flags[f] = true; });
              }
              if (choice.clearFlag) delete newOverworld.flags[choice.clearFlag];

              // Handle action
              switch (choice.action) {
                  case 'CLOSE':
                      newOverworld.flags[`${eventId}_completed`] = true;
                      if (choice.reward || choice.penalty) {
                          newOverworld.lastChoiceResult = {
                              reward: choice.reward,
                              penalty: choice.penalty
                          };
                      } else {
                          newOverworld.activeEventId = null;
                          newOverworld.activeEventNodeId = null;
                      }
                      break;
                  case 'GOTO_NODE':
                      if (choice.nextNode) {
                          newOverworld.activeEventNodeId = choice.nextNode;
                      } else {
                          newOverworld.activeEventId = null;
                          newOverworld.activeEventNodeId = null;
                      }
                      break;
                  case 'START_BATTLE':
                      newOverworld.flags[`${eventId}_completed`] = true;
                      newOverworld.activeEventId = null;
                      newOverworld.activeEventNodeId = null;
                      if (choice.riftId) {
                          setTimeout(() => get().enterRift(choice.riftId!), 100);
                      }
                      break;
                  case 'ROLL_DICE':
                      const roll = Math.random();
                      if (roll < (choice.probability ?? 0.5)) {
                          newOverworld.activeEventNodeId = choice.successNode || null;
                      } else {
                          newOverworld.activeEventNodeId = choice.failNode || null;
                      }
                      if (!newOverworld.activeEventNodeId) {
                          newOverworld.activeEventId = null;
                      }
                      break;
                  case 'AUTO_WIN':
                      if (choice.reqItem) {
                          const itemIndex = player.bag.indexOf(choice.reqItem);
                          if (itemIndex !== -1) {
                              player.bag.splice(itemIndex, 1);
                              newOverworld.activeEventNodeId = choice.nextNode || null;
                              if (!newOverworld.activeEventNodeId) {
                                  newOverworld.activeEventId = null;
                              }
                          } else {
                              get().showToast(TEXT[get().language].TOAST.MISSING_ITEM.replace('{0}', choice.reqItem), 'error');
                          }
                      }
                      break;
              }

              return { overworld: newOverworld };
          });
      },

      equipItem: (itemId: string, slot: 'head' | 'body' | 'tool' | 'artifact' | 'feet' | 'necklace' | 'ring', bagIndex: number) => {
          set(state => {
              const newOverworld = { ...state.overworld };
              const player = { ...newOverworld.player };
              player.bag = [...(player.bag ?? [])];
              const eq = { ...player.equipment };
              
              // Validate slot
              const newDef = getItemDef(itemId);
              if (!newDef || !newDef.equipSlot) {
                  get().showToast(TEXT[get().language].TOAST.CANNOT_EQUIP, 'error');
                  return state;
              }
              if (newDef.equipSlot !== slot) {
                  get().showToast(TEXT[get().language].TOAST.WRONG_SLOT, 'error');
                  return state;
              }

              // If there's already an item in the slot, put it back in the bag
              const currentItem = eq[slot];
              
              // Remove the new item from the bag
              player.bag.splice(bagIndex, 1);
              
              if (currentItem) {
                  player.bag.push(currentItem);
                  const currentDef = getItemDef(currentItem);
                  if (currentDef?.maxHpBonus) {
                      player.maxHp -= currentDef.maxHpBonus;
                      player.hp = Math.min(player.hp, player.maxHp);
                  }
                  if (currentDef?.maxEnergyBonus) {
                      player.maxEnergy -= currentDef.maxEnergyBonus;
                      player.energy = Math.min(player.energy, player.maxEnergy);
                  }
              }
              
              // Apply new item effects
              if (newDef?.maxHpBonus) {
                  player.maxHp += newDef.maxHpBonus;
                  player.hp += newDef.maxHpBonus;
              }
              if (newDef?.maxEnergyBonus) {
                  player.maxEnergy += newDef.maxEnergyBonus;
                  player.energy += newDef.maxEnergyBonus;
              }
              
              eq[slot] = itemId;
              player.equipment = eq;
              newOverworld.player = player;
              
              get().showToast(TEXT[get().language].TOAST.ITEM_EQUIPPED, 'success');
              
              return { overworld: newOverworld };
          });
      },

      unequipItem: (slot: 'head' | 'body' | 'tool' | 'artifact' | 'feet' | 'necklace' | 'ring') => {
          set(state => {
              const newOverworld = { ...state.overworld };
              const player = { ...newOverworld.player };
              player.bag = [...(player.bag ?? [])];
              const eq = { ...player.equipment };
              
              const currentItem = eq[slot];
              if (currentItem) {
                  if (player.bag.length >= 20) {
                      get().showToast(TEXT[get().language].TOAST.BAG_FULL, 'error');
                      return state;
                  }
                  player.bag.push(currentItem);
                  
                  const currentDef = getItemDef(currentItem);
                  if (currentDef?.maxHpBonus) {
                      player.maxHp -= currentDef.maxHpBonus;
                      player.hp = Math.min(player.hp, player.maxHp);
                  }
                  if (currentDef?.maxEnergyBonus) {
                      player.maxEnergy -= currentDef.maxEnergyBonus;
                      player.energy = Math.min(player.energy, player.maxEnergy);
                  }
                  
                  delete eq[slot];
                  
                  player.equipment = eq;
                  newOverworld.player = player;
                  
                  get().showToast(TEXT[get().language].TOAST.ITEM_UNEQUIPPED, 'success');
                  return { overworld: newOverworld };
              }
              
              return state;
          });
      },

      buyItem: (itemId: string, cost: number) => {
          set(state => {
              const newOverworld = { ...state.overworld };
              const player = { ...newOverworld.player };
              
              if (player.credits < cost) {
                  get().showToast(TEXT[get().language].TOAST.NEED_CREDITS.replace('{0}', cost.toString()), 'error');
                  return state;
              }
              if ((player.bag?.length || 0) >= 20) {
                  get().showToast(TEXT[get().language].TOAST.BAG_FULL || 'Bag Full', 'error');
                  return state;
              }
              
              player.credits -= cost;
              player.bag = [...(player.bag || []), itemId];
              newOverworld.player = player;
              
              audioService.play('COIN');
              return { overworld: newOverworld };
          });
      },

      sellItem: (bagIndex: number, price: number) => {
          set(state => {
              const newOverworld = { ...state.overworld };
              const player = { ...newOverworld.player };
              
              if (!player.bag || !player.bag[bagIndex]) {
                  return state;
              }
              
              player.bag = [...player.bag];
              player.bag.splice(bagIndex, 1);
              player.credits += price;
              newOverworld.player = player;
              
              audioService.play('COIN');
              return { overworld: newOverworld };
          });
      },

      restAtBar: () => {
          set(state => {
              const newOverworld = { ...state.overworld };
              const player = { ...newOverworld.player };
              
              if (player.credits < 50) {
                  get().showToast(TEXT[get().language].TOAST.NEED_CREDITS.replace('{0}', '50'), 'error');
                  return state;
              }
              
              if (player.energy >= player.maxEnergy && player.hp >= player.maxHp) {
                  get().showToast(TEXT[get().language].TOAST.GENERIC_ERROR || 'Already fully rested', 'info');
                  return state;
              }
              
              player.credits -= 50;
              player.energy = player.maxEnergy;
              player.hp = player.maxHp;
              newOverworld.player = player;
              
              audioService.play('SUCCESS');
              get().showToast(get().language === 'RU' ? 'Силы восстановлены' : 'Rested successfully', 'success');
              
              return { overworld: newOverworld };
          });
      },

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
              result.state.effects = result.state.effects.filter(e => e.startTime + e.lifetime > now);

              if (result.events.some(e => e.type === 'MONUMENT_REACHED')) {
                  if (result.state.activePoi) {
                      set({ uiState: 'INTERIOR' });
                  } else {
                      get().openMonumentDialog();
                  }
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
                                        }
                                    }
                                    break;
                                }

                                case 'HEX_COLLAPSE': text = lang === 'RU' ? "-1 УР" : "-1 LVL"; color = "#ef4444"; icon = 'DOWN'; break;
                                case 'ITEM_DROP': text = lang === 'RU' ? "ПРЕДМЕТ!" : "ITEM FOUND!"; color = "#fcd34d"; icon = 'GEM'; break;
                         }

                         if (text) {
                             newEffectsData.push({ q: targetQ, r: targetR, text, color, icon, lifetime: 1200 });
                         }
                    }
                  });
                  
                  result.state.effects = effectPool.addBatch(result.state.effects, newEffectsData);
              }

              let newToast = get().toast;
              const error = result.events.find(e => e.type === 'ACTION_DENIED' || e.type === 'ERROR');
              if (error && error.entityId === engine?.state?.player.id) {
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
          language: state.language,
          overworld: state.overworld
      })
    }
  )
);