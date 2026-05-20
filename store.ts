import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { GameState, UIState, WinCondition, LeaderboardEntry, EntityState, SessionState, FloatingText, DeviceType, Item, GameEventType } from './types.ts';
import { getHexKey, findPath, cubeDistance } from './services/hexUtils.ts';
import { GameEngine } from './engine/GameEngine.ts';
import { audioService } from './services/audioService.ts';
import { CAMPAIGN_LEVELS } from './campaign/levels.ts';
import { LevelConfig } from './types';
import { calculateMovementCost } from './rules/movement.ts';
import { TEXT } from './services/i18n.ts';
import { generateMonumentRecipe } from './rules/items.ts';
import { effectPool } from './services/effectPool.ts';
import { historyService } from './services/historyService.ts';

// --- CONSTANTS & HELPERS ---

import { createInitialSessionData } from './services/sessionFactory.ts';

const MOCK_USER_DB: Record<string, { password: string; avatarColor: string; headIndex: number; bodyIndex: number }> = {};

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
  isCampaignLoading: boolean;
  loadingLevelId: string | null;
  
  // UI & System
  setUIState: (state: UIState) => void;
  setDeviceType: (type: DeviceType) => void;
  setLanguage: (lang: 'EN' | 'RU') => void;
  setCampaignMode: (mode: 'STORY' | 'LEVELS') => void;
  addMinedHexes: (hexes: Record<number, number>) => void;
  setSkillPoints: (points: number) => void;
  updateCampaignUpgrades: (upgrades: Partial<import('./types.ts').CampaignUpgrades>) => void;
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
  
  // Story Mode Actions
  addCollectedHexes: (hexes: Record<number, number>) => void;
  placeStoryHex: (q: number, r: number, level: number) => void;
  setStoryMilestone: (milestone: number) => void;

  // Interactions
  openVoidDialog: (q: number, r: number) => void;
  closeVoidDialog: () => void;
  restoreVoidHex: (itemId: string) => void;
  
  openMonumentDialog: () => void;
  closeMonumentDialog: () => void;
  placeItemInMonument: (item: Item, slotIndex: number) => void;
  removeItemFromMonument: (slotIndex: number) => void;
  rerollMonumentRequirements: () => void;
  rerollSingleMonumentRequirement: (slotIndex: number) => void;
  activateMonument: () => void;
  checkTutorialCamera: (deltaX: number) => void;

  hasHydrated: boolean;
  setHasHydrated: (val: boolean) => void;
  
  equipItemSkirmish: (itemId: string) => void;
  unequipItemSkirmish: (slot: string) => void;
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
      levelsModeProgress: 0,
      skillPoints: 0,
      
      collectedHexes: {},
      minedInSessionHexes: {},
      totalMinedMaterial: 0,
      storyMap: {},
      storyMilestone: 0,

      campaignUpgrades: {
          inventorySlots: 3,
          startingEnergy: 0,
          startingMoves: 0,
          startingGold: 0,
          startingMaterials: 0,
          maxMaterials: 3,
          fuelEfficiency: 0,
          scanRadius: 0,
          fatigueResistance: 0,
          growthAccelerator: 0,
          foundationStrength: 0,
          economicMultiplier: 0,
          diggerLuck: 0,
          doubleDigChance: 0,
          reserveCapacitor: 0,
          turboRecharge: 0,
          entropyResistance: 0,
          restorationMaster: 0,
      },
      campaignMode: 'STORY',
      hasActiveSession: false,
      hasHydrated: false,
      isMusicMuted: false,
      isSfxMuted: false,
      session: null,
      language: 'RU', 
      voidDialogTarget: null,
      monumentDialogState: { isOpen: false, slots: [null, null, null] },
      lastVisualEvent: undefined,
      isCampaignLoading: false,
      loadingLevelId: null,
      
      // --- UI SETTERS ---
      setLanguage: (lang) => set({ language: lang }),
      setCampaignMode: (mode) => set({ campaignMode: mode }),
      setSkillPoints: (points) => set({ skillPoints: points }),
      updateCampaignUpgrades: (partial) => set(state => ({ campaignUpgrades: { ...state.campaignUpgrades, ...partial }})),
      
      // --- STORY MODE SETTERS ---
      addCollectedHexes: (hexes) => set(state => {
        const newCollected = { ...state.collectedHexes };
        for (const [level, count] of Object.entries(hexes)) {
            const lvl = Number(level);
            newCollected[lvl] = (newCollected[lvl] || 0) + count;
        }
        return { collectedHexes: newCollected };
      }),
      addMinedHexes: (hexes) => set(state => {
        const newMined = { ...state.minedInSessionHexes };
        for (const [level, count] of Object.entries(hexes)) {
            const lvl = Number(level);
            newMined[lvl] = (newMined[lvl] || 0) + count;
        }
        return { minedInSessionHexes: newMined };
      }),
      placeStoryHex: (q: number, r: number, level: number) => set(state => {
          const key = getHexKey(q, r);
          // Deduct from inventory
          const currentCount = state.collectedHexes[level] || 0;
          if (currentCount <= 0 && level !== -999) return state; // ignore if empty (unless debugging)
          
          let newCollected = { ...state.collectedHexes };
          if (level !== -999) { // Using -999 as a potential debug bypass if needed
            newCollected[level] = currentCount - 1;
            if (newCollected[level] <= 0) delete newCollected[level];
          }

          const newMap = { ...state.storyMap };
          newMap[key] = level;
          
          return { storyMap: newMap, collectedHexes: newCollected };
      }),
      setStoryMilestone: (storyMilestone) => set({ storyMilestone }),

      setUIState: (uiState) => {
        set({ uiState });
      },
      setDeviceType: (deviceType) => set({ deviceType }),
      showToast: (message, type) => set({ toast: { message, type, timestamp: Date.now() } }),
      hideToast: () => set({ toast: null }),

      setHasHydrated: (val) => set({ hasHydrated: val }),

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
      startNewGame: async (winCondition, levelConfig) => {
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
          const upgrades = get().campaignUpgrades;
          
          // Show loading state immediately while map generates in worker
          set({ uiState: 'CAMPAIGN_LOADING', introNextState: 'GAME', isCampaignLoading: true });
          await new Promise(resolve => setTimeout(resolve, 50));
          
          try {
            const initialSessionState = await createInitialSessionData(effectiveWin ?? null, levelConfig, get().language, stateUser, upgrades);
            engine = new GameEngine(initialSessionState); 
            set({ session: engine.state, hasActiveSession: true, isCampaignLoading: false });
          } catch (err) {
            console.error("Failed to start session", err);
            set({ isCampaignLoading: false, uiState: 'MENU' });
            get().showToast("Failed to initialize sector", "error");
          }
      },

      startCampaignLevel: async (levelId) => {
         set({ isCampaignLoading: true, loadingLevelId: levelId });
         await new Promise(r => setTimeout(r, 50)); // Allow UI to render loading state
         const cfg = CAMPAIGN_LEVELS.find(l => l.id === levelId);
         if (cfg) await get().startNewGame(undefined, cfg);
         set({ isCampaignLoading: false, loadingLevelId: null });
      },

      startMission: () => {
          if (engine) {
              engine.startMission();
              set({ session: engine.state });
              audioService.play('UI_CLICK');
              get().showToast(TEXT[get().language].TOAST?.SIMULATION_VICTORY ? "Mission Started" : "Deploying...", "info"); // simple fallback toast
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
          set({ 
              campaignProgress: 0, 
              levelsModeProgress: 0,
          });
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

      equipItemSkirmish: (itemId) => {
          if (!engine || !engine.state) return;
          const res = engine.applyAction(engine.state.player.id, { type: 'EQUIP_ITEM', itemId, stateVersion: engine.state.stateVersion } as any);
          if (res.ok) {
              audioService.play('SUCCESS');
              set({ session: engine.state });
          }
      },

      unequipItemSkirmish: (slot) => {
          if (!engine || !engine.state) return;
          const res = engine.applyAction(engine.state.player.id, { type: 'UNEQUIP_ITEM', slot, stateVersion: engine.state.stateVersion } as any);
          if (res.ok) {
              audioService.play('UI_HOVER');
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

      rerollMonumentRequirements: () => {
          const state = get();
          const session = state.session;
          if (!session || !session.monumentRequirements) {
              audioService.play('ERROR');
              return;
          }

          if (session.player.coins < 100) {
              audioService.play('ERROR');
              state.showToast(TEXT[state.language].TOAST.NEED_CREDITS.replace('{0}', '100'), 'error');
              return;
          }
          
          audioService.play('SUCCESS');
          const newRequirements = generateMonumentRecipe(session.difficulty);
          
          set(state => {
              if (!state.session) return {};
              const player = { ...state.session.player, coins: state.session.player.coins - 100 };
              return { 
                  session: { 
                      ...state.session, 
                      player,
                      monumentRequirements: newRequirements,
                      monumentRevealedSlots: [] // Use empty array instead of undefined
                  } 
              };
          });
          
          state.showToast(TEXT[state.language].TOAST.MONUMENT_UPDATED, 'success');
      },

      rerollSingleMonumentRequirement: (slotIndex: number) => {
          const state = get();
          const session = state.session;
          if (!session || !session.monumentRequirements || slotIndex >= session.monumentRequirements.length) {
              audioService.play('ERROR');
              return;
          }

          if (session.player.coins < 100) {
              audioService.play('ERROR');
              state.showToast(TEXT[state.language].TOAST.NEED_CREDITS.replace('{0}', '100'), 'error');
              return;
          }

          audioService.play('SUCCESS');
          
          // Generate a single requirement
          // Since generateMonumentRecipe returns a full list, we'll just take one element that isn't the same if possible
          const recipe = generateMonumentRecipe(session.difficulty);
          const newReq = recipe[Math.floor(Math.random() * recipe.length)];

          set(state => {
              if (!state.session || !state.session.monumentRequirements) return {};
              const player = { ...state.session.player, coins: state.session.player.coins - 100 };
              const monumentRequirements = [...state.session.monumentRequirements];
              monumentRequirements[slotIndex] = newReq;
              
              // Also ensure revealed slots is set
              const monumentRevealedSlots = state.session.monumentRevealedSlots ? [...state.session.monumentRevealedSlots] : [];
              if (monumentRevealedSlots.length > slotIndex) {
                  monumentRevealedSlots[slotIndex] = true; // Rerolled slot is revealed
              }

              return { 
                  session: { 
                      ...state.session, 
                      player,
                      monumentRequirements,
                      monumentRevealedSlots
                  } 
              };
          });

          state.showToast(TEXT[state.language].TOAST.MONUMENT_UPDATED, 'success');
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

      checkTutorialCamera: () => {}, 

      // --- GAME LOOP ---

      // --- GAME LOOP ---
      tick: async () => {
          if (!engine || !engine.state || isProcessingTick) return;
          if (engine.state.gameStatus !== 'PLAYING') return;
          
          isProcessingTick = true;
          const prevState = get().session;
          
          try {
              const result = await engine.processTick();
              if (!result || !result.state) return;

              set({ totalMinedMaterial: result.state.totalMinedMaterial });

              tickCount++;
              const now = Date.now();

              // OPTIMIZED GC
              result.state.effects = result.state.effects.filter(e => e.startTime + e.lifetime > now);

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
                            const mode = get().campaignMode;
                            
                            if (mode === 'STORY') {
                                const idx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentId);
                                if (idx !== -1 && idx >= get().campaignProgress) {
                                    // Award SP ONLY ON FIRST COMPLETION
                                    const nextP = Math.min(CAMPAIGN_LEVELS.length, idx + 1);
                                    if (nextP > get().campaignProgress) {
                                        set(state => ({ 
                                            skillPoints: state.skillPoints + 1,
                                            campaignProgress: nextP 
                                        }));
                                    }
                                }
                            } else {
                                // LEVELS mode - only mission levels
                                const missionLevels = CAMPAIGN_LEVELS.filter(l => !l.isCityLevel);
                                const idx = missionLevels.findIndex(l => l.id === currentId);
                                if (idx !== -1 && idx >= get().levelsModeProgress) {
                                    // Award SP ONLY ON FIRST COMPLETION
                                    const nextP = Math.min(missionLevels.length, idx + 1);
                                    if (nextP > get().levelsModeProgress) {
                                        set(state => ({ 
                                            skillPoints: state.skillPoints + 1,
                                            levelsModeProgress: nextP 
                                        }));
                                    }
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
                        const existingIdx = currentLB.findIndex(e => e.nickname === entry.nickname);
                        
                        const levelId = entry.levelId || 'unknown';
                        
                        if (existingIdx !== -1) {
                            const existing = currentLB[existingIdx];
                            existing.scoresByLevel = existing.scoresByLevel || {};
                            
                            // Only update if it's a new level or a better score
                            if (!existing.scoresByLevel[levelId] || entry.score > existing.scoresByLevel[levelId]) {
                                existing.scoresByLevel[levelId] = entry.score;
                            }
                            
                            // Re-sum the total score
                            existing.score = Object.values(existing.scoresByLevel).reduce((sum, val) => sum + val, 0);
                            
                            if (entry.maxLevel > existing.maxLevel) existing.maxLevel = entry.maxLevel;
                            if (entry.maxCoins > existing.maxCoins) existing.maxCoins = entry.maxCoins;
                            existing.timestamp = entry.timestamp;
                        } else {
                            // First time entry for this player
                            entry.scoresByLevel = { [levelId]: entry.score };
                            currentLB.push(entry);
                        }
                        
                        // Sort by accumulated score
                        currentLB.sort((a, b) => b.score - a.score);
                        const sliced = currentLB.slice(0, 100);
                        set({ leaderboard: sliced });
                    }

                    // Floating Text
                    if (event.entityId || event.type === 'HEX_COLLAPSE') {
                         const entity = isPlayer ? result.state.player : result.state.bots.find(b => b.id === event.entityId);
                         const targetQ = event.data?.q !== undefined ? Number(event.data.q) : (entity?.q || 0);
                         const targetR = event.data?.r !== undefined ? Number(event.data.r) : (entity?.r || 0);

                         // VISION FILTER: Only show popups for player or revealed hexes
                         const targetHex = result.state.grid[getHexKey(targetQ, targetR)];
                         if (!isPlayer && (!targetHex || !targetHex.revealed)) return;

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
      onRehydrateStorage: (_state) => {
        return (rehydratedState, error) => {
          if (error) {
            console.error('Hydration error:', error);
          } else if (rehydratedState) {
            rehydratedState.setHasHydrated(true);
          }
        };
      },
      partialize: (state) => ({ 
          user: state.user, 
          leaderboard: state.leaderboard,
          campaignProgress: state.campaignProgress,
          levelsModeProgress: state.levelsModeProgress,
          campaignMode: state.campaignMode,
          collectedHexes: state.collectedHexes,
          storyMap: state.storyMap,
          storyMilestone: state.storyMilestone,
          isMusicMuted: state.isMusicMuted,
          isSfxMuted: state.isSfxMuted,
          language: state.language
      })
    }
  )
);