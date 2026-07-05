import { GameStore, createDefaultProgress } from './types.ts';
import { GameEngine } from '../engine/GameEngine.ts';
import { audioService } from '../services/audioService.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { campaignLoadBalancer } from '../campaign/balancer.ts';
import { calculateMovementCost } from '../rules/movement.ts';
import { generateMonumentRecipe } from '../rules/items.ts';
import { effectPool } from '../services/effectPool.ts';
import { historyService } from '../services/historyService.ts';
import { createInitialSessionData } from '../services/sessionFactory.ts';
import { resourceService } from '../services/resourceService.ts';
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
  'METEOR_WARN': 'WARNING',
  'METEOR_STRIKE': 'COLLAPSE',
  'PLAYER_HIT_BY_METEOR': 'WARNING',
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
    resourceService.clear();
    
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
      const totalGoldEarned = get().totalGoldEarned || 0;
      const initialSessionState = await createInitialSessionData(effectiveWin ?? null, levelConfig, get().language, stateUser, upgrades);
      // Pass this directly to the session object
      initialSessionState.totalGoldEarned = totalGoldEarned;

      engine = new GameEngine(initialSessionState); 
      set(() => ({ 
        session: engine!.state, 
        hasActiveSession: true, 
        isCampaignLoading: false,
      }));
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

  startDefenseSiege: async () => {
    get().abandonSession();
    resourceService.clear();

    const siegeMap = get().storyMap;
    const initialGrid = {} as any;
    
    // Find player's furthest built hex in the storyMap to dynamically set the map size
    let maxBuiltDist = 0;
    Object.keys(siegeMap).forEach(key => {
        const lvl = siegeMap[key];
        if (lvl !== undefined && lvl !== -999 && lvl > 0) {
            const parts = key.split(',');
            const q = parseInt(parts[0], 10);
            const r = parseInt(parts[1], 10);
            const d = cubeDistance({q: 0, r: 0}, {q, r});
            if (d > maxBuiltDist) maxBuiltDist = d;
        }
    });

    // Make map size dynamic! Map radius is maxBuiltDist + 6 (minimum 7, maximum 10)
    const mapRadius = Math.max(7, Math.min(10, maxBuiltDist + 6));

    for (let q = -mapRadius; q <= mapRadius; q++) {
        for (let r = -mapRadius; r <= mapRadius; r++) {
            if (Math.abs(q + r) <= mapRadius) {
                const key = `${q},${r}`;
                const siegeLvl = siegeMap[key];
                const isCore = q === 0 && r === 0;

                 if (siegeLvl !== undefined && siegeLvl !== -999) {
                    initialGrid[key] = {
                        q, r,
                        currentLevel: siegeLvl,
                        maxLevel: siegeLvl,
                        progress: 0,
                        structureType: isCore ? 'CORE' : 'NONE',
                        isCore: isCore,
                        isPassable: true,
                        isExcavated: false,
                        isIndestructible: isCore,
                        revealed: true,
                        ownerId: isCore ? 'player-1' : (siegeLvl > 0 ? 'player-1' : undefined) // Mark built base hexes as player's
                    };
                } else {
                    // Generate rugged empty hexes between -1 and -3
                    const randomDepth = -1 - Math.floor(Math.random() * 3); // -1, -2, or -3
                    initialGrid[key] = {
                        q, r,
                        currentLevel: randomDepth,
                        maxLevel: randomDepth,
                        progress: 0,
                        structureType: 'NONE',
                        isPassable: true,
                        isExcavated: true,
                        revealed: true
                    };
                }
            }
        }
    }
    
    // Ensure core exists if it wasn't placed
    const coreKey = getHexKey(0, 0);
    if (!initialGrid[coreKey] || initialGrid[coreKey].structureType !== 'CORE') {
      initialGrid[coreKey] = {
        q: 0, r: 0, currentLevel: 0, maxLevel: 0, progress: 0,
        structureType: 'CORE', isCore: true, isPassable: true, isExcavated: false, isIndestructible: true, revealed: true, ownerId: 'player-1'
      };
    }

    const stateUser = get().user;
    const upgrades = get().campaignUpgrades;

    const winCondition = {
      levelId: -1, 
      targetLevel: 99, 
      targetCoins: 9999, 
      label: "Siege Defense",
      botCount: 4, 
      difficulty: 'HARD' as const, 
      queueSize: 2, 
      winType: 'SIEGE' as const,
      mapType: 'FLAT' as const
    };

    set(() => ({ uiState: 'CAMPAIGN_LOADING', introNextState: 'GAME', isCampaignLoading: true }));
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
      const initialSessionState = await createInitialSessionData(winCondition, undefined, get().language, stateUser, upgrades);
      initialSessionState.player.coins = 0;
      initialSessionState.player.totalCoinsEarned = 0;
      
      const finalGrid = { ...initialGrid };
      
      // Find player's furthest built hex in the grid
      let maxDist = 0;
      Object.values(finalGrid).forEach((hex: any) => {
          if (hex.ownerId === 'player-1') {
              const d = cubeDistance({q: 0, r: 0}, {q: hex.q, r: hex.r});
              if (d > maxDist) maxDist = d;
          }
      });
      
      const playerOwnedCells: any[] = Object.values(finalGrid).filter((h: any) => h.ownerId === 'player-1' || h.structureType === 'CORE' || h.isCore);

      const getSiegeSpawnPoint = (): { q: number; r: number } => {
          const candidates: { q: number; r: number }[] = [];
          for (let q = -mapRadius; q <= mapRadius; q++) {
              for (let r = -mapRadius; r <= mapRadius; r++) {
                  if (Math.abs(q + r) <= mapRadius) {
                      let isEligible = true;
                      for (const ph of playerOwnedCells) {
                          if (cubeDistance({ q: (ph as any).q, r: (ph as any).r }, { q, r }) <= 4) {
                              isEligible = false;
                              break;
                          }
                      }
                      if (isEligible) {
                          candidates.push({ q, r });
                      }
                  }
              }
          }
          if (candidates.length > 0) {
              return candidates[Math.floor(Math.random() * candidates.length)];
          }
          // Fallback: spawn on outer rim
          const angle = Math.random() * Math.PI * 2;
          return {
              q: Math.round(Math.cos(angle) * mapRadius),
              r: Math.round(Math.sin(angle) * mapRadius)
          };
      };

      // Ensure bot spawn points exist
      initialSessionState.bots.forEach((bot) => {
        const sp = getSiegeSpawnPoint();
        bot.q = sp.q;
        bot.r = sp.r;

        const key = getHexKey(bot.q, bot.r);
        if (!finalGrid[key] || finalGrid[key].structureType === 'VOID') {
            const randomDepth = -1 - Math.floor(Math.random() * 3);
            finalGrid[key] = { q: bot.q, r: bot.r, currentLevel: randomDepth, maxLevel: randomDepth, structureType: 'NONE', isPassable: true, isExcavated: true, revealed: false };
        }
        
        // Setup initial generic bots as GRINDER initially
        bot.avatarColor = '#EF4444'; // Red
        bot.headIndex = 4;
        bot.bodyIndex = 4;
        bot.playerLevel = 10;
        bot.moves = 10;
        bot.memory = { 
            lastPlayerPos: null,
            stuckCounter: 0,
            ...(bot.memory || {}), 
            botRole: 'SIEGE_GRINDER' 
        };
      });

      // Also ensure player start point exists (player starts at core)
      const pKey = getHexKey(initialSessionState.player.q, initialSessionState.player.r);
      if (!finalGrid[pKey] || finalGrid[pKey].structureType === 'VOID') {
          finalGrid[pKey] = { q: initialSessionState.player.q, r: initialSessionState.player.r, currentLevel: 0, maxLevel: 0, structureType: 'NONE', isPassable: true, isExcavated: false, revealed: true };
      }

      initialSessionState.grid = finalGrid;
      // Inject defense state
      initialSessionState.defense = {
        isDefenseMode: true,
        coreHealth: 100,
        maxCoreHealth: 100,
        survivalTimer: 180, // 3 minutes
        currentWave: 1,
        maxWaves: 3,
      };

      // Set initial player rank equal to maximum placed hex level
      const maxPlacedHexLevel = Object.values(finalGrid).reduce((max: number, h: any) => Math.max(max, h.currentLevel ?? 0), 0);
      initialSessionState.player.playerLevel = Math.max(1, maxPlacedHexLevel);

      engine = new GameEngine(initialSessionState); 
      set(() => ({ 
        session: engine!.state, 
        hasActiveSession: true, 
        isCampaignLoading: false,
        uiState: 'GAME'
      }));
    } catch (err) {
      console.error("Failed to start defense siege", err);
      set(() => ({ isCampaignLoading: false, uiState: 'STORY_BUILDER' }));
    }
  },

  startMission: () => {
    if (engine) {
      engine.startMission();
      set(() => ({ session: engine!.state }));
      audioService.play('UI_CLICK');
    }
  },

  abandonSession: () => {
    if (engine) {
      engine.destroy();
      engine = null;
    }
    historyService.clear();
    resourceService.clear();
    const isCustomEditor = get().session?.activeLevelConfig?.id === 'custom_editor_level';
    set(() => ({ 
      session: null, 
      hasActiveSession: false, 
      uiState: isCustomEditor ? 'LEVEL_EDITOR' : 'MENU', 
      voidDialogTarget: null, 
      monumentDialogState: { isOpen: false, slots: [null, null, null] }, 
      lastVisualEvent: undefined 
    }));
  },

  resetProgress: () => {
    get().abandonSession();
    try {
      localStorage.removeItem('hexopol_figure_index');
    } catch (e) {
      console.warn("Failed to reset hexopol_figure_index:", e);
    }
    set(() => ({ 
      ...createDefaultProgress()
    }));
  },

  // --- ACTIONS ---
  togglePlayerGrowth: (intent: 'RECOVER' | 'UPGRADE' | 'DIG' | 'TURRET' = 'RECOVER') => {
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
    get().tick(); // Trigger immediate tick to start growth action instantly!
  },

  destroyItem: (itemId: string) => {
    if (!engine || !engine.state) return;
    const res = engine.applyAction(engine.state.player.id, { type: 'DESTROY_ITEM', itemId, stateVersion: engine.state.stateVersion });
    if (res.ok) {
      audioService.play('CRACK');
      set(() => ({ session: engine!.state }));
      get().tick(); // Trigger immediate tick!
    }
  },

  equipItemSkirmish: (itemId: string) => {
    if (!engine || !engine.state) return;
    const res = engine.applyAction(engine.state.player.id, { type: 'EQUIP_ITEM', itemId, stateVersion: engine.state.stateVersion } as any);
    if (res.ok) {
      audioService.play('SUCCESS');
      set(() => ({ session: engine!.state }));
      get().tick(); // Trigger immediate tick!
    }
  },

  unequipItemSkirmish: (slot: string) => {
    if (!engine || !engine.state) return;
    const res = engine.applyAction(engine.state.player.id, { type: 'UNEQUIP_ITEM', slot, stateVersion: engine.state.stateVersion } as any);
    if (res.ok) {
      audioService.play('UI_HOVER');
      set(() => ({ session: engine!.state }));
      get().tick(); // Trigger immediate tick!
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
    if (targetHex?.structureType === 'MINI_MONUMENT' && dist === 0) {
      const action: import('../types').ActivateMiniMonumentAction = { 
        type: 'ACTIVATE_MINI_MONUMENT', 
        entityId: session.player.id, 
        miniMonumentHexKey: targetKey 
      };
      engine.applyAction(session.player.id, action);
      set(() => ({ session: engine!.state }));
      get().tick(); // Trigger immediate tick!
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
    
    if (dist === 0) {
      if (session.portalActive && session.portalHex && session.portalHex.q === tq && session.portalHex.r === tr) {
        const action: import('../types').ActivatePortalAction = {
          type: 'ACTIVATE_PORTAL',
          stateVersion: session.stateVersion
        };
        const res = engine.applyAction(session.player.id, action);
        if (res.ok) {
          audioService.play('TELEPORT');
          set(() => ({ session: engine!.state }));
          get().tick(); // Trigger immediate tick!
        } else {
          audioService.play('ERROR');
          set(() => ({ toast: { message: res.reason || "Action failed", type: 'error', timestamp: Date.now() } }));
        }
        return;
      }
      if (targetHex?.structureType !== 'MONUMENT') return;
    }

    if (!targetHex) {
      audioService.play('ERROR');
      set(() => ({ toast: { message: lConfig?.TOAST?.INVALID_HEX || "Invalid selection", type: 'error', timestamp: Date.now() } }));
      return;
    }
    
    // LEVEL RESTRICTIONS CHECKS
    if (!session.defense?.isDefenseMode && targetHex && targetHex.structureType !== 'VOID' && targetHex.currentLevel > session.player.playerLevel) {
      audioService.play('ERROR');
      set(() => ({ toast: { message: lConfig?.HUD?.ERROR_RANK || "Insufficient Rank", type: 'error', timestamp: Date.now() } }));
      return;
    }

    const hasVoidCore = (session.player.equipment && Object.values(session.player.equipment).some((item: any) => item && item.baseId === 'void_core')) ||
                        (session.player.activeStatuses && session.player.activeStatuses.some((s: any) => s.type === 'VOID_CORE' || s.label === 'Void Core'));
    const obstacles = session.bots.map(b => ({ q: b.q, r: b.r }));
    const pathResult = findPath({ q: session.player.q, r: session.player.r }, { q: tq, r: tr }, session.grid, session.defense?.isDefenseMode ? 100 : session.player.playerLevel, obstacles, hasVoidCore);
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

    const costResult = calculateMovementCost(session.player, path, session.grid, session);

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
      get().tick(); // Trigger immediate tick!
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
      get().tick(); // Trigger immediate tick!
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
      get().tick(); // Trigger immediate tick!
    } else {
      audioService.play('ERROR');
      set(() => ({ toast: { message: res.reason || lConfig?.TOAST?.RESTORE_ERROR || "Restoration bad", type: 'error', timestamp: Date.now() } }));
    }
  },

  openMiniMonumentDialog: (hint: string) => {
    audioService.play('UI_CLICK');
    set(() => ({ miniMonumentDialogState: { isOpen: true, hint } }));
  },

  closeMiniMonumentDialog: () => {
    audioService.play('UI_CLICK');
    set(() => ({ miniMonumentDialogState: { isOpen: false, hint: undefined } }));
  },

  oracleDialogOpen: false,
  openOracleDialog: () => {
    audioService.play('UI_CLICK');
    set(() => ({ oracleDialogOpen: true }));
  },
  closeOracleDialog: () => {
    audioService.play('UI_CLICK');
    set(() => ({ oracleDialogOpen: false }));
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
      get().tick(); // Trigger immediate tick!
    } else {
      audioService.play('ERROR');
      
      const updatedInventory = engine.state.player.inventory || [];
      const newSlots = monumentDialogState.slots.map(slotItem => {
          if (slotItem === null) return null;
          const stillExists = updatedInventory.some(i => i.id === slotItem.id);
          return stillExists ? slotItem : null;
      });
      
      set(() => ({ 
          session: engine!.state,
          monumentDialogState: { ...monumentDialogState, slots: newSlots }
      }));
      get().showToast(res.reason || lConfig?.TOAST?.ACTIVATION_FAILED || "Activation failed", 'error');
    }
  },

  // --- GAME TICK LOOP ENCAPSULATION ---
  tick: async () => {
    if (!engine || !engine.state || isProcessingTick) return;
    if (engine.state.gameStatus !== 'PLAYING') return;
    
    isProcessingTick = true;
    
    const prevEarned = engine.state.player.totalCoinsEarned || 0;
    
    try {
      const result = await engine.processTick();
      if (!result || !result.state) return;

      const newEarned = result.state.player.totalCoinsEarned || 0;
      const deltaGold = newEarned - prevEarned;

      set((curr) => {
          const payload: Partial<GameStore> = { totalMinedMaterial: result.state.totalMinedMaterial };
          if (deltaGold > 0) {
              payload.totalGoldEarned = (curr.totalGoldEarned || 0) + deltaGold;
          }
          return payload;
      });

      tickCount++;
      const now = Date.now();
      
      const playerId = result.state.player.id;
      const events = [...result.events];

      
      // OPTIMIZED GC - CLEAN EFFECTS IN MAIN STATE
      result.state.effects = result.state.effects.filter(e => e.startTime + e.lifetime > now);

      try {
        if (events.some(e => e.type === 'MONUMENT_REACHED')) {
          get().openMonumentDialog();
        }

        const miniEvent = events.find(e => e.type === 'MINI_MONUMENT_REACHED');
        if (miniEvent) {
            const customClue = (miniEvent as any).payload?.clueText;
            if (customClue) {
                get().openMiniMonumentDialog(customClue);
            } else {
                const shapes = get().session?.activeLevelConfig?.requiredShapes || [];
                if (shapes.length > 0) {
                    const hintText = shapes.map(s => s.hint).join('\n\n');
                    get().openMiniMonumentDialog(hintText);
                } else {
                    get().openMiniMonumentDialog(get().language === 'RU' ? "Фигур не требуется. Ищите капсулы в шахтах." : "No shapes required. Dig for hidden capsules.");
                }
            }
        }
      } catch (e) {
        console.warn("Error processing events, likely proxy revocation:", e);
      }

      if (events.length > 0) {
        const lang = get().language;
        const newEffectsData: Omit<FloatingText, 'id' | 'startTime'>[] = [];

        events.forEach(event => {
          const isPlayer = event.entityId === playerId;
          
          if (isPlayer || !event.entityId) {
            const sound = EVENT_SOUND_MAP[event.type];
            if (sound) audioService.play(sound as any);
          }

          const isMeteor = (event.message && /meteor|метеор/i.test(event.message)) ||
                           (event.data && typeof event.data.type === 'string' && /meteor|метеор/i.test(event.data.type));

          if (event.type === 'ENTROPY_SHIFT' || event.type === 'HEX_COLLAPSE' || event.type === 'CORE_DAMAGED' || event.type === 'TURRET_FIRED' || isMeteor) {
            const visualType = isMeteor ? 'METEOR_STRIKE' : event.type;
            set(() => ({ lastVisualEvent: { type: visualType, time: now } }));
          }

          // ACHIEVE PROGRESS / PROGRESSIONS
          if (event.type === 'VICTORY') {
            const currentId = engine?.state?.activeLevelConfig?.id;
            if (currentId) {
              const mode = get().campaignMode;

              if (mode === 'STORY') {
                const currentP = get().campaignProgress;
                const nextP = campaignLoadBalancer.calculateNextProgress(currentId, currentP, CAMPAIGN_LEVELS);
                if (nextP > currentP) {
                  set((curr) => ({ 
                    skillPoints: curr.skillPoints + 1,
                    campaignProgress: nextP 
                  }));
                }
              } else {
                // LEVELS mode
                const currentP = get().levelsModeProgress;
                const nextP = campaignLoadBalancer.calculateNextProgress(currentId, currentP, CAMPAIGN_LEVELS);
                if (nextP > currentP) {
                  set((curr) => ({ 
                    skillPoints: curr.skillPoints + 1,
                    levelsModeProgress: nextP 
                  }));
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
          if (event.entityId || event.type === 'HEX_COLLAPSE' || event.type === 'METEOR_STRIKE' || event.type === 'PLAYER_HIT_BY_METEOR') {
            const entity = isPlayer ? result.state.player : result.state.bots.find(b => b.id === event.entityId);
            const targetQ = event.data?.q !== undefined ? Number(event.data.q) : (entity?.q || 0);
            const targetR = event.data?.r !== undefined ? Number(event.data.r) : (entity?.r || 0);

            // Visibility barrier
            const targetHex = result.state.grid[getHexKey(targetQ, targetR)];
            const isDefenseMode = !!result.state.defense?.isDefenseMode;
            if (!isPlayer && !isDefenseMode && (!targetHex || !targetHex.revealed)) return;

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
              case 'METEOR_STRIKE':
                text = lang === 'RU' ? "☄️ УДАР!" : "☄️ IMPACT!";
                color = "#f97316";
                icon = 'DOWN';
                break;
              case 'PLAYER_HIT_BY_METEOR':
                text = lang === 'RU' ? "💥 РАНГ -1!" : "💥 RANK -1!";
                color = "#ef4444";
                icon = 'WARN';
                break;
              case 'CORE_DAMAGED': {
                const dmg = Number(event.data?.damage || 10);
                text = lang === 'RU' ? `⚠️ ЯДРО -${dmg}` : `⚠️ CORE -${dmg}`;
                color = "#f43f5e";
                icon = 'DOWN';
                break;
              }
              case 'ITEM_DROP': 
                text = lang === 'RU' ? "ПРЕДМЕТ!" : "ITEM FOUND!"; 
                color = "#fcd34d"; 
                icon = 'GEM'; 
                break;
              case 'ACTION_DENIED':
              case 'ERROR': {
                const msg = event.message || '';
                text = msg.toUpperCase();
                color = "#f87171";
                icon = 'WARN';
                break;
              }
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

      // For maximum smoothness of multi-bot activities & real-time animations, we commit the state on every single tick.
      // This eliminates rendering stutters, layout jitters, and visual delay offsets.
      set(() => ({ session: result.state, toast: newToast }));
    } catch (err: any) {
      console.error('Tick execution failed:', err);
      set(() => ({
        toast: { message: `Engine Error: ${err.message || 'Unknown tick failure'}`, type: 'error', timestamp: Date.now() }
      }));
    } finally {
      isProcessingTick = false;
    }
  }
});
