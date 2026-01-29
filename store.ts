
import { create } from 'zustand';
import { GameState, Entity, Hex, EntityType, UIState, WinCondition, LeaderboardEntry, EntityState, MoveAction, RechargeAction, SessionState, LogEntry, FloatingText, Language } from './types.ts';
import { GAME_CONFIG } from './rules/config.ts';
import { getHexKey, getNeighbors, findPath } from './services/hexUtils.ts';
import { GameEngine } from './engine/GameEngine.ts';
import { audioService } from './services/audioService.ts';
import { CAMPAIGN_LEVELS } from './campaign/levels.ts';
import { LevelConfig } from './campaign/types.ts';
import { calculateMovementCost } from './rules/movement.ts';
import { generateMap } from './services/mapGenerator.ts';

const MOCK_USER_DB: Record<string, { password: string; avatarColor: string; avatarIcon: string }> = {};
const BOT_PALETTE = ['#ef4444', '#f97316', '#a855f7', '#ec4899']; 
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
  loginAsGuest: (n: string, c: string, i: string) => void;
  registerUser: (n: string, p: string, c: string, i: string) => AuthResponse;
  loginUser: (n: string, p: string) => AuthResponse;
  logout: () => void;
  startNewGame: (win?: WinCondition, levelConfig?: LevelConfig) => void;
  startCampaignLevel: (levelId: string) => void;
  startMission: () => void;
  abandonSession: () => void;
  togglePlayerGrowth: (intent?: 'RECOVER' | 'UPGRADE') => void;
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
}

let engine: GameEngine | null = null;
let tickCount = 0;

const createInitialSessionData = (winCondition: WinCondition | null, levelConfig?: LevelConfig, language: Language = 'EN'): SessionState => {
  // Map Generation Logic (Delegate to service)
  const initialGrid = generateMap(levelConfig);
  
  const botCount = levelConfig ? (levelConfig.aiMode === 'none' ? 0 : 1) : (winCondition?.botCount || 0);
  
  // Skirmish Defaults vs Level Config
  // UPDATED: Start with 0 in Skirmish to force acquisition loop
  const startCredits = levelConfig ? levelConfig.startState.credits : 0;
  const startMoves = levelConfig ? levelConfig.startState.moves : 0;
  const startRank = levelConfig ? levelConfig.startState.rank : 1;
  
  const bots: Entity[] = [];
  // Spawn points at edge of radius 2
  const spawnPoints = [{ q: 0, r: -2 }, { q: 2, r: -2 }, { q: 2, r: 0 }, { q: 0, r: 2 }, { q: -2, r: 2 }, { q: -2, r: 0 }];

  for (let i = 0; i < Math.min(botCount, spawnPoints.length); i++) {
    const sp = spawnPoints[i];
    // Ensure bot spawn hex exists (expand map if necessary for bots)
    if (!initialGrid[getHexKey(sp.q, sp.r)]) {
        initialGrid[getHexKey(sp.q, sp.r)] = { id: getHexKey(sp.q,sp.r), q:sp.q, r:sp.r, currentLevel:0, maxLevel:0, progress:0, revealed:true };
        getNeighbors(sp.q, sp.r).forEach(n => {
            const k = getHexKey(n.q, n.r);
            if (!initialGrid[k]) initialGrid[k] = { id:k, q:n.q, r:n.r, currentLevel:0, maxLevel:0, progress:0, revealed:true };
        });
    }
    bots.push({
      id: `bot-${i+1}`, type: EntityType.BOT, state: EntityState.IDLE, q: sp.q, r: sp.r,
      playerLevel: 0, coins: startCredits, moves: startMoves,
      totalCoinsEarned: 0, recentUpgrades: [], movementQueue: [],
      memory: { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 },
      avatarColor: BOT_PALETTE[i % BOT_PALETTE.length],
      recoveredCurrentHex: false
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
    difficulty: winCondition?.difficulty || 'MEDIUM',
    grid: initialGrid,
    player: {
      id: 'player-1', type: EntityType.PLAYER, state: EntityState.IDLE, q: 0, r: 0,
      playerLevel: startRank, coins: startCredits, 
      moves: startMoves,
      totalCoinsEarned: 0, recentUpgrades: [], movementQueue: [],
      recoveredCurrentHex: false
    },
    bots,
    currentTurn: 0,
    messageLog: [initialLog],
    botActivityLog: [], 
    // IF SKIRMISH (No Level Config), START IN BRIEFING. IF CAMPAIGN, START PLAYING (Campaign HUD handles intro).
    gameStatus: levelConfig ? 'PLAYING' : 'BRIEFING',
    lastBotActionTime: Date.now(),
    isPlayerGrowing: false,
    playerGrowthIntent: null,
    growingBotIds: [],
    telemetry: [],
    effects: [],
    language
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  uiState: 'MENU',
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
  
  setLanguage: (lang) => set({ language: lang }),
  setUIState: (uiState) => set({ uiState }),
  
  loginAsGuest: (nickname, avatarColor, avatarIcon) => {
    audioService.play('UI_CLICK');
    set({ user: { isAuthenticated: true, isGuest: true, nickname, avatarColor, avatarIcon } });
  },
  registerUser: (nickname, password, avatarColor, avatarIcon) => { 
    audioService.play('UI_CLICK');
    MOCK_USER_DB[nickname] = { password, avatarColor, avatarIcon }; 
    set({ user: { isAuthenticated: true, isGuest: false, nickname, avatarColor, avatarIcon } }); 
    return { success: true }; 
  },
  loginUser: (nickname, password) => { 
    audioService.play('UI_CLICK');
    const r = MOCK_USER_DB[nickname]; 
    if (!r || r.password !== password) {
      audioService.play('ERROR');
      return { success: false }; 
    }
    set({ user: { isAuthenticated: true, isGuest: false, nickname, avatarColor: r.avatarColor, avatarIcon: r.avatarIcon } }); 
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
      // Use fallback wincondition if not provided but level config is present
      const effectiveWin = winCondition || (levelConfig ? {
          levelId: -1,
          targetLevel: 99,
          targetCoins: 9999,
          label: levelConfig.title,
          botCount: 0,
          difficulty: 'MEDIUM',
          queueSize: 1,
          winType: 'AND'
      } : null);

      const initialSessionState = createInitialSessionData(effectiveWin, levelConfig, get().language);
      engine = new GameEngine(initialSessionState); 
      set({ session: engine.state, hasActiveSession: true, uiState: 'GAME' });

      // Show objective popup if campaign
      if (levelConfig) {
          const startMsg = initialSessionState.messageLog[0]?.text;
          if (startMsg) get().showToast(startMsg, 'info');
      }
  },

  startCampaignLevel: (levelId) => {
     // Check new campaign levels first
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
          set({ session: null, hasActiveSession: false, uiState: 'MENU' });
      }
  },
  
  showToast: (message, type) => set({ toast: { message, type, timestamp: Date.now() } }),
  hideToast: () => set({ toast: null }),

  togglePlayerGrowth: (intent: 'RECOVER' | 'UPGRADE' = 'RECOVER') => {
      if (!engine) return;
      const session = engine.state; // Use authoritative state
      if (!session) return;

      if (session.player.state === EntityState.MOVING) {
        audioService.play('ERROR');
        return;
      }
      
      const isCurrentlyGrowing = session.isPlayerGrowing;
      const nextStateGrowing = !isCurrentlyGrowing;
      
      if (nextStateGrowing) {
        audioService.play('GROWTH_START');
      } else {
        audioService.play('UI_CLICK');
      }

      engine.setPlayerIntent(nextStateGrowing, isCurrentlyGrowing ? null : intent);
      set({ session: engine.state });
  },

  rechargeMove: () => {
      if (!engine || !engine.state) return;
      // CRITICAL: Use engine.state.stateVersion, NOT the potentially stale UI state version.
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

  movePlayer: (tq, tr) => {
      if (!engine || !engine.state) return;
      
      // Use authoritative state from engine to avoid version mismatch errors
      const session = engine.state; 
      const { pendingConfirmation, confirmPendingAction, cancelPendingAction } = get();

      // IF LEVEL 1.2: Check if briefing is active or game is not ready
      if (session.gameStatus === 'BRIEFING') return;

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
      
      const obstacles = session.bots.map(b => ({ q: b.q, r: b.r }));
      const path = findPath({ q: session.player.q, r: session.player.r }, { q: tq, r: tr }, session.grid, session.player.playerLevel, obstacles);
      
      if (!path) {
        audioService.play('ERROR');
        set({ toast: { message: "Path Blocked / Invalid", type: 'error', timestamp: Date.now() } });
        return;
      }

      // --- CENTRALIZED COST CALCULATION ---
      const costResult = calculateMovementCost(session.player, path, session.grid);

      if (!costResult.canAfford) {
        audioService.play('ERROR');
        set({ toast: { message: costResult.reason || `Need ${costResult.deductCoins} credits`, type: 'error', timestamp: Date.now() } });
        return;
      }
      
      // Warning for coin usage
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
      // CRITICAL FIX: Use engine.state.stateVersion
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
      // Legacy tutorial function retained to prevent breakages, but does nothing now
  },

  tick: () => {
      // STRICT CHECK: Only process logic if game is actively PLAYING.
      if (!engine || !engine.state) return;
      if (engine.state.gameStatus !== 'PLAYING' && engine.state.gameStatus !== 'VICTORY') return;
      
      const prevState = get().session;
      
      // 1. LOGIC (60 FPS)
      const result = engine.processTick();
      if (!result || !result.state) return;

      tickCount++;

      // Process Events Immediately (Sound, Toast, Tutorial)
      if (result.events.length > 0) {
          result.events.forEach(event => {
            const isPlayer = event.entityId === result.state.player.id;
            
            if (isPlayer || !event.entityId) {
               switch (event.type) {
                 case 'LEVEL_UP': audioService.play('LEVEL_UP'); break;
                 case 'SECTOR_ACQUIRED': audioService.play('SUCCESS'); break;
                 case 'RECOVERY_USED': audioService.play('COIN'); break;
                 case 'HEX_COLLAPSE': audioService.play('COLLAPSE'); break;
                 case 'VICTORY': audioService.play('SUCCESS'); break;
                 case 'DEFEAT': audioService.play('ERROR'); break;
               }
            }

            if (event.type === 'VICTORY' && engine?.state?.activeLevelConfig) {
                // AUTO UNLOCK NEXT CAMPAIGN LEVEL
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
                    entry.avatarIcon = user.avatarIcon;
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

                    switch (event.type) {
                        case 'LEVEL_UP':
                            text = isPlayer ? "RANK UP" : "RIVAL UP"; 
                            color = isPlayer ? "#fbbf24" : "#f87171"; 
                            icon = 'UP';
                            break;
                        case 'SECTOR_ACQUIRED':
                            text = "LINKED"; 
                            color = isPlayer ? "#4ade80" : "#f87171"; 
                            icon = 'PLUS';
                            break;
                        case 'RECOVERY_USED':
                            if (isPlayer) {
                                text = "+MOVES";
                                color = "#34d399";
                                icon = 'COIN';
                            }
                            break;
                        case 'HEX_COLLAPSE':
                            text = "COLLAPSE -1 RANK"; 
                            color = "#ef4444";
                            icon = 'DOWN';
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

      const shouldRender = tickCount % 3 === 0;
      const hasCriticalEvents = result.events.length > 0 || newToast !== get().toast;
      const playerStateChanged = prevState && prevState.player.state !== result.state.player.state;

      if (shouldRender || hasCriticalEvents || playerStateChanged) {
        set({ 
            session: engine.state, 
            toast: newToast,
        });
      }
  }
}));
