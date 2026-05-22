import { GameStore } from './types.ts';
import { GameEngine } from '../engine/GameEngine.ts';
import { audioService } from '../services/audioService.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { calculateMovementCost } from '../rules/movement.ts';
import { generateMonumentRecipe } from '../rules/items.ts';
import { effectPool } from '../services/effectPool.ts';
import { historyService } from '../services/historyService.ts';
import { createInitialSessionData } from '../services/sessionFactory.ts';
import { textureCache } from '../services/textureCache.ts';
import { TEXT } from '../services/i18n.ts';
import { getHexKey, findPath, cubeDistance } from '../services/hexUtils.ts';
import { 
  EntityState, 
  FloatingText, 
  Item, 
  LeaderboardEntry, 
  WinCondition, 
  LevelConfig, 
  GameEventType 
} from '../types.ts';

// --- SERVICE GLOBALS / MODULE SCOPE ---
let engine: GameEngine | null = null;
let tickCount = 0;
let isProcessingTick = false;

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

export const createGameplaySlice = (
  set: (fn: (state: GameStore) => Partial<GameStore> | Partial<GameStore>) => void,
  get: () => GameStore
) => ({
  // --- SESSION MANAGEMENT ---
  startNewGame: async (winCondition?: WinCondition, levelConfig?: LevelConfig) => {
    audioService.play('UI_CLICK');
    get().abandonSession();
    
    // Clear the rendering canvas/texture cache to free precious RAM/GPU memory on level transitions
    textureCache.clear();
    
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
        levelId: -1, 
        targetLevel: 6, 
        targetCoins: 0, 
        label: "Quick Summit",
        botCount: 0, 
        difficulty: 'MEDIUM', 
        queueSize: 2, 
        winType: 'SUMMIT',
        mapType: 'FLAT'
      };
    }

    const stateUser = get().user;
    const upgrades = get().campaignUpgrades;
    
    // Show loading state immediately while map generates
    set(() => ({ uiState: 'CAMPAIGN_LOADING', introNextState: 'GAME', isCampaignLoading: true }));
    await new Promise(resolve => setTimeout(resolve, 50));
    
    try {
      const initialSessionState = await createInitialSessionData(effectiveWin ?? null, levelConfig, get().language, stateUser, upgrades);
      engine = new GameEngine(initialSessionState); 
      set(() => ({ session: engine!.state, hasActiveSession: true, isCampaignLoading: false }));
    } catch (err) {
      console.error("Failed to start session", err);
      set(() => ({ isCampaignLoading: false, uiState: 'MENU' }));
      get().showToast("Failed to initialize sector", "error");
    }
  },

  startCampaignLevel: async (levelId: string) => {
    set(() => ({ isCampaignLoading: true, loadingLevelId: levelId }));
    await new Promise(r => setTimeout(r, 50)); // Allow UI to render loading state
    const cfg = CAMPAIGN_LEVELS.find(l => l.id === levelId);
    if (cfg) await get().startNewGame(undefined, cfg);
    set(() => ({ isCampaignLoading: false, loadingLevelId: null }));
  },

  startMission: () => {
    if (engine) {
      engine.startMission();
      set(() => ({ session: engine!.state }));
      audioService.play('UI_CLICK');
      // safe i18n access
      const toastConfig = TEXT[get().language]?.TOAST;
      const msg = toastConfig?.SIMULATION_VICTORY ? "Mission Started" : "Deploying...";
      get().showToast(msg, "info");
    }
  },

  abandonSession: () => {
    if (engine) {
      engine.destroy();
      engine = null;
    }
    historyService.clear();
    textureCache.clear();
    set(() => ({ 
      session: null, 
      hasActiveSession: false, 
      uiState: 'MENU', 
      voidDialogTarget: null, 
      monumentDialogState: { isOpen: false, slots: [null, null, null] }, 
      lastVisualEvent: undefined 
    }));
  },

  resetProgress: () => {
    get().abandonSession();
    set(() => ({ 
      campaignProgress: 0, 
      levelsModeProgress: 0,
    }));
  },

  downloadSessionLog: () => {
    const history = historyService.getHistory();
    const lText = TEXT[get().language]?.TOAST;
    if (!history || history.length === 0) {
      get().showToast(lText?.NO_HISTORY || "No action history available", "info");
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
    get().showToast(lText?.LOG_DOWNLOADED || "Log downloaded successfully", "success");
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
    set(() => ({ session: engine!.state }));
  },

  rechargeMove: () => {
    if (!engine || !engine.state) return;
    const res = engine.applyAction(engine.state.player.id, { type: 'RECHARGE_MOVE', stateVersion: engine.state.stateVersion });
    const tConfig = TEXT[get().language]?.TOAST;
    if (res.ok) {
      audioService.play('COIN'); 
      set(() => ({ session: engine!.state }));
    } else {
      audioService.play('ERROR');
      set(() => ({ toast: { message: res.reason || tConfig?.RECHARGE_FAILED || "Recharge failed", type: 'error', timestamp: Date.now() } }));
    }
  },

  destroyItem: (itemId: string) => {
    if (!engine || !engine.state) return;
    const res = engine.applyAction(engine.state.player.id, { type: 'DESTROY_ITEM', itemId, stateVersion: engine.state.stateVersion });
    if (res.ok) {
      audioService.play('CRACK');
      set(() => ({ session: engine!.state }));
    }
  },

  equipItemSkirmish: (itemId: string) => {
    if (!engine || !engine.state) return;
    const res = engine.applyAction(engine.state.player.id, { type: 'EQUIP_ITEM', itemId, stateVersion: engine.state.stateVersion } as any);
    if (res.ok) {
      audioService.play('SUCCESS');
      set(() => ({ session: engine!.state }));
    }
  },

  unequipItemSkirmish: (slot: string) => {
    if (!engine || !engine.state) return;
    const res = engine.applyAction(engine.state.player.id, { type: 'UNEQUIP_ITEM', slot, stateVersion: engine.state.stateVersion } as any);
    if (res.ok) {
      audioService.play('UI_HOVER');
      set(() => ({ session: engine!.state }));
    }
  },

  movePlayer: (tq: number, tr: number) => {
    if (!engine || !engine.state) return;
    const session = engine.state; 
    const { pendingConfirmation, confirmPendingAction, cancelPendingAction, openVoidDialog, openMonumentDialog } = get();
    const lConfig = TEXT[get().language];

    if (session.gameStatus === 'BRIEFING') return;

    const targetKey = getHexKey(tq, tr);
    const targetHex = session.grid[targetKey];
    const dist = cubeDistance(session.player, { q: tq, r: tr });

    // INTERACTION DIALOG CHECKS
    if (targetHex?.structureType === 'VOID' && dist === 1) {
      openVoidDialog(tq, tr);
      return;
    }
    if (targetHex?.structureType === 'MONUMENT' && dist === 0) {
      openMonumentDialog();
      return;
    }

    // PENDING CONFIRM ACTION CHECK
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
      set(() => ({ toast: { message: lConfig?.TOAST?.ACTOR_MOVING || "Actor busy", type: 'error', timestamp: Date.now() } }));
      return;
    }
    
    if (dist === 0 && targetHex?.structureType !== 'MONUMENT') return;

    if (!targetHex) {
      audioService.play('ERROR');
      set(() => ({ toast: { message: lConfig?.TOAST?.INVALID_HEX || "Invalid selection", type: 'error', timestamp: Date.now() } }));
      return;
    }
    
    // LEVEL RESTRICTIONS CHECKS
    if (targetHex && targetHex.structureType !== 'VOID' && targetHex.currentLevel > session.player.playerLevel) {
      audioService.play('ERROR');
      set(() => ({ toast: { message: lConfig?.HUD?.ERROR_RANK || "Insufficient Rank", type: 'error', timestamp: Date.now() } }));
      return;
    }

    const obstacles = session.bots.map(b => ({ q: b.q, r: b.r }));
    const pathResult = findPath({ q: session.player.q, r: session.player.r }, { q: tq, r: tr }, session.grid, session.player.playerLevel, obstacles);
    const path = pathResult.path;
    
    if (!path) {
      audioService.play('ERROR');
      let msg = lConfig?.TOAST?.PATH_BLOCKED || "Path blocked";
      if (pathResult.reason === 'VOID' || targetHex?.structureType === 'VOID') {
        msg = lConfig?.TOAST?.PATH_VOID || "Void in path";
      } else if (pathResult.reason === 'RANK') {
        msg = lConfig?.HUD?.ERROR_RANK || "Insufficient Rank";
      } else if (pathResult.reason === 'STEEP') {
        msg = lConfig?.TOAST?.TOO_STEEP || "Elevation change too steep";
      } else if (pathResult.reason === 'TOO_FAR') {
        msg = lConfig?.TOAST?.TOO_FAR || "Target too far";
      } else if (pathResult.reason === 'OBSTACLE') {
        msg = lConfig?.TOAST?.PATH_BLOCKED || "Obstacle in path";
      }
      set(() => ({ toast: { message: msg, type: 'error', timestamp: Date.now() } }));
      return;
    }

    const costResult = calculateMovementCost(session.player, path, session.grid);

    if (!costResult.canAfford) {
      audioService.play('ERROR');
      let msg = (lConfig?.TOAST?.NEED_CREDITS || "Requires {0} energy").replace('{0}', costResult.deductCoins.toString());
      if (costResult.reason === 'VOID') msg = lConfig?.TOAST?.PATH_VOID || "Void";
      else if (costResult.reason === 'STEEP') msg = lConfig?.TOAST?.TOO_STEEP || "Too steep";
      else if (costResult.reason === 'INSUFFICIENT_FUNDS') msg = (lConfig?.TOAST?.NEED_CREDITS || "Requires {0} energy").replace('{0}', costResult.deductCoins.toString());
      else if (costResult.reason) msg = costResult.reason;
      
      set(() => ({ toast: { message: msg, type: 'error', timestamp: Date.now() } }));
      return;
    }
    
    if (costResult.deductCoins > 0) {
      audioService.play('WARNING');
      set(() => ({ 
        pendingConfirmation: { type: 'MOVE_WITH_COINS', data: { path, costMoves: costResult.deductMoves, costCoins: costResult.deductCoins } },
        toast: { message: (lConfig?.TOAST?.CONFIRM_MOVE || "Paying {0} fuel to route").replace('{0}', costResult.deductCoins.toString()), type: 'info', timestamp: Date.now() } 
      }));
      return;
    }

    const res = engine.applyAction(session.player.id, { type: 'MOVE', path, stateVersion: session.stateVersion });
    if (res.ok) {
      audioService.play('MOVE');
      set(() => ({ session: engine!.state }));
    } else {
      audioService.play('ERROR');
      let msg = res.reason || lConfig?.TOAST?.GENERIC_ERROR || "Action failed";
      if (res.reason === 'VOID') msg = lConfig?.TOAST?.PATH_VOID || "Void";
      else if (res.reason === 'STEEP') msg = lConfig?.TOAST?.TOO_STEEP || "Too steep";
      else if (res.reason === 'RANK') msg = lConfig?.HUD?.ERROR_RANK || "Insufficient Rank";
      
      set(() => ({ toast: { message: msg, type: 'error', timestamp: Date.now() } }));
    }
  },

  confirmPendingAction: () => {
    if (!engine || !engine.state || !get().pendingConfirmation) return;
    const { path } = get().pendingConfirmation!.data;
    const res = engine.applyAction(engine.state.player.id, { type: 'MOVE', path, stateVersion: engine.state.stateVersion });
    const lConfig = TEXT[get().language];
    if (res.ok) {
      audioService.play('MOVE');
      set(() => ({ session: engine!.state, pendingConfirmation: null }));
    } else {
      audioService.play('ERROR');
      set(() => ({ toast: { message: res.reason || lConfig?.TOAST?.GENERIC_ERROR || "Error routing", type: 'error', timestamp: Date.now() }, pendingConfirmation: null }));
    }
  },

  cancelPendingAction: () => {
    if (get().pendingConfirmation) {
      audioService.play('UI_CLICK');
      set(() => ({ pendingConfirmation: null }));
    }
  },

  // --- INTERACTION DIALOGS ---
  openVoidDialog: (q: number, r: number) => { 
    audioService.play('UI_CLICK'); 
    set(() => ({ voidDialogTarget: { q, r } })); 
  },
  
  closeVoidDialog: () => { 
    audioService.play('UI_CLICK'); 
    set(() => ({ voidDialogTarget: null })); 
  },
  
  restoreVoidHex: (itemId: string) => {
    if (!engine || !engine.state) return;
    const target = get().voidDialogTarget;
    if (!target) return;

    const res = engine.applyAction(engine.state.player.id, { 
      type: 'RESTORE_HEX', coord: target, itemId, stateVersion: engine.state.stateVersion 
    });
    
    const lConfig = TEXT[get().language];
    if (res.ok) {
      audioService.play('GROWTH_START');
      set(() => ({ session: engine!.state, voidDialogTarget: null }));
    } else {
      audioService.play('ERROR');
      set(() => ({ toast: { message: res.reason || lConfig?.TOAST?.RESTORE_ERROR || "Restoration bad", type: 'error', timestamp: Date.now() } }));
    }
  },

  openMonumentDialog: () => {
    const state = get().session;
    // Only open if this level uses ACTIVATE_MONUMENT
    if (state?.monumentRequirements === undefined) return;
    const count = state.monumentRequirements.length;
    const slots = Array(count).fill(null);

    audioService.play('SUCCESS');
    set(() => ({ monumentDialogState: { isOpen: true, slots } }));
  },
  
  closeMonumentDialog: () => { 
    audioService.play('UI_CLICK'); 
    set(() => ({ monumentDialogState: { isOpen: false, slots: [null, null, null] } })); 
  },

  placeItemInMonument: (item: Item, slotIndex: number) => {
    const state = get();
    const requirements = state.session?.monumentRequirements;
    if (!requirements || requirements.length <= slotIndex) { 
      audioService.play('ERROR'); 
      return; 
    }

    const reqId = requirements[slotIndex];
    const revealedSlots = state.session?.monumentRevealedSlots;
    const isUnrevealed = !!(revealedSlots && !revealedSlots[slotIndex]);

    const lConfig = TEXT[state.language];

    if (!isUnrevealed && reqId !== 'ANY') {
      const isRarityWild = reqId === 'COMMON' || reqId === 'UNCOMMON' || reqId === 'RARE' || reqId === 'LEGENDARY';
      const isOneOf = reqId === 'ONE_OF';
      const alts = state.session?.monumentAlternatives ?? [];
      const mismatch = isOneOf ? !alts.includes(item.baseId)
        : isRarityWild ? item.rarity !== reqId : item.baseId !== reqId;
      if (mismatch) {
        audioService.play('ERROR');
        state.showToast(lConfig?.TOAST?.WRONG_ITEM || "Incompatible item slotting", "error");
        return;
      }
    }

    audioService.play('UI_CLICK');
    set((curr) => {
      const newSlots = [...curr.monumentDialogState.slots];
      newSlots[slotIndex] = item;
      return { monumentDialogState: { ...curr.monumentDialogState, slots: newSlots } };
    });
  },

  removeItemFromMonument: (slotIndex: number) => {
    audioService.play('UI_CLICK');
    set((curr) => {
      const newSlots = [...curr.monumentDialogState.slots];
      newSlots[slotIndex] = null;
      return { monumentDialogState: { ...curr.monumentDialogState, slots: newSlots } };
    });
  },

  rerollMonumentRequirements: () => {
    const state = get();
    const session = state.session;
    const lConfig = TEXT[state.language];
    if (!session || !session.monumentRequirements) {
      audioService.play('ERROR');
      return;
    }

    if (session.player.coins < 100) {
      audioService.play('ERROR');
      state.showToast((lConfig?.TOAST?.NEED_CREDITS || "Need {0} credits").replace('{0}', '100'), 'error');
      return;
    }
    
    audioService.play('SUCCESS');
    const newRequirements = generateMonumentRecipe(session.difficulty);
    
    set((curr) => {
      if (!curr.session) return {};
      const player = { ...curr.session.player, coins: curr.session.player.coins - 100 };
      return { 
        session: { 
          ...curr.session, 
          player,
          monumentRequirements: newRequirements,
          monumentRevealedSlots: []
        } 
      };
    });
    
    state.showToast(lConfig?.TOAST?.MONUMENT_UPDATED || "Recipe restructured", 'success');
  },

  rerollSingleMonumentRequirement: (slotIndex: number) => {
    const state = get();
    const session = state.session;
    const lConfig = TEXT[state.language];
    if (!session || !session.monumentRequirements || slotIndex >= session.monumentRequirements.length) {
      audioService.play('ERROR');
      return;
    }

    if (session.player.coins < 100) {
      audioService.play('ERROR');
      state.showToast((lConfig?.TOAST?.NEED_CREDITS || "Need {0} credits").replace('{0}', '100'), 'error');
      return;
    }

    audioService.play('SUCCESS');
    
    // Generate requirement alternatives
    const recipe = generateMonumentRecipe(session.difficulty);
    const newReq = recipe[Math.floor(Math.random() * recipe.length)];

    set((curr) => {
      if (!curr.session || !curr.session.monumentRequirements) return {};
      const player = { ...curr.session.player, coins: curr.session.player.coins - 100 };
      const monumentRequirements = [...curr.session.monumentRequirements];
      monumentRequirements[slotIndex] = newReq;
      
      const monumentRevealedSlots = curr.session.monumentRevealedSlots ? [...curr.session.monumentRevealedSlots] : [];
      if (monumentRevealedSlots.length > slotIndex) {
        monumentRevealedSlots[slotIndex] = true; // revealed
      }

      return { 
        session: { 
          ...curr.session, 
          player,
          monumentRequirements,
          monumentRevealedSlots
        } 
      };
    });

    state.showToast(lConfig?.TOAST?.MONUMENT_UPDATED || "Recipe restructured", 'success');
  },

  activateMonument: () => {
    if (!engine || !engine.state) return;
    const { monumentDialogState, session } = get();
    const reqCount = session?.monumentRequirements?.length ?? 3;
    const lConfig = TEXT[get().language];
    
    const items = monumentDialogState.slots.filter((i): i is Item => i !== null);
    if (items.length !== reqCount) {
      audioService.play('ERROR');
      get().showToast(lConfig?.TOAST?.SLOTS_FULL || "Fill all sockets first", 'error');
      return;
    }

    const res = engine.applyAction(engine.state.player.id, { 
      type: 'ACTIVATE_MONUMENT', itemIds: items.map(i => i.id), stateVersion: engine.state.stateVersion 
    });
    
    if (res.ok) {
      audioService.play('LEVEL_UP'); 
      set(() => ({ monumentDialogState: { isOpen: false, slots: Array(reqCount).fill(null) } }));
    } else {
      audioService.play('ERROR');
      get().showToast(res.reason || lConfig?.TOAST?.ACTIVATION_FAILED || "Activation bad", 'error');
    }
  },

  checkTutorialCamera: () => {}, 

  // --- GAME TICK LOOP ENCAPSULATION ---
  tick: async () => {
    if (!engine || !engine.state || isProcessingTick) return;
    if (engine.state.gameStatus !== 'PLAYING') return;
    
    isProcessingTick = true;
    const prevState = get().session;
    
    try {
      const result = await engine.processTick();
      if (!result || !result.state) return;

      set(() => ({ totalMinedMaterial: result.state.totalMinedMaterial }));

      tickCount++;
      const now = Date.now();

      // OPTIMIZED GC - CLEAN EFFECTS IN MAIN STATE
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
              set(() => ({ lastVisualEvent: { type: 'ENTROPY_SHIFT', time: now } }));
            }
          }

          // ACHIEVE PROGRESS / PROGRESSIONS
          if (event.type === 'VICTORY') {
            const currentId = engine?.state?.activeLevelConfig?.id;
            if (currentId) {
              const mode = get().campaignMode;
              
              if (mode === 'STORY') {
                const idx = CAMPAIGN_LEVELS.findIndex(l => l.id === currentId);
                if (idx !== -1 && idx >= get().campaignProgress) {
                  const nextP = Math.min(CAMPAIGN_LEVELS.length, idx + 1);
                  if (nextP > get().campaignProgress) {
                    set((curr) => ({ 
                      skillPoints: curr.skillPoints + 1,
                      campaignProgress: nextP 
                    }));
                  }
                }
              } else {
                // LEVELS mode
                const missionLevels = CAMPAIGN_LEVELS.filter(l => !l.isCityLevel);
                const idx = missionLevels.findIndex(l => l.id === currentId);
                if (idx !== -1 && idx >= get().levelsModeProgress) {
                  const nextP = Math.min(missionLevels.length, idx + 1);
                  if (nextP > get().levelsModeProgress) {
                    set((curr) => ({ 
                      skillPoints: curr.skillPoints + 1,
                      levelsModeProgress: nextP 
                    }));
                  }
                }
              }
            }
          }

          // LEADERBOARD UPDATES
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
              
              if (!existing.scoresByLevel[levelId] || entry.score > existing.scoresByLevel[levelId]) {
                existing.scoresByLevel[levelId] = entry.score;
              }
              
              existing.score = Object.values(existing.scoresByLevel).reduce((sum, val) => sum + val, 0);
              if (entry.maxLevel > existing.maxLevel) existing.maxLevel = entry.maxLevel;
              if (entry.maxCoins > existing.maxCoins) existing.maxCoins = entry.maxCoins;
              existing.timestamp = entry.timestamp;
            } else {
              entry.scoresByLevel = { [levelId]: entry.score };
              currentLB.push(entry);
            }
            
            currentLB.sort((a, b) => b.score - a.score);
            const sliced = currentLB.slice(0, 100);
            set(() => ({ leaderboard: sliced }));
          }

          // FLOATING EFFECTS GRAPHICS
          if (event.entityId || event.type === 'HEX_COLLAPSE') {
            const entity = isPlayer ? result.state.player : result.state.bots.find(b => b.id === event.entityId);
            const targetQ = event.data?.q !== undefined ? Number(event.data.q) : (entity?.q || 0);
            const targetR = event.data?.r !== undefined ? Number(event.data.r) : (entity?.r || 0);

            // Visibility barrier
            const targetHex = result.state.grid[getHexKey(targetQ, targetR)];
            if (!isPlayer && (!targetHex || !targetHex.revealed)) return;

            let text = '';
            let color = '#fff';
            let icon: FloatingText['icon'] = undefined;

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
                    text = String(event.data.customText); 
                    color = String(event.data.customColor || '#fbbf24'); 
                    icon = 'GEM';
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
        set(() => ({ session: result.state, toast: newToast }));
      }
    } finally {
      isProcessingTick = false;
    }
  }
});
