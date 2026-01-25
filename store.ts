
import { create } from 'zustand';
import { GameState, Entity, Hex, EntityType, UIState, WinCondition, LeaderboardEntry, EntityState, MoveAction, RechargeAction, SessionState, LogEntry, FloatingText, TutorialStep } from './types.ts';
import { GAME_CONFIG } from './rules/config.ts';
import { getHexKey, getNeighbors, findPath } from './services/hexUtils.ts';
import { GameEngine } from './engine/GameEngine.ts';
import { audioService } from './services/audioService.ts';
import { CAMPAIGN_LEVELS } from './rules/campaign.ts';

const MOCK_USER_DB: Record<string, { password: string; avatarColor: string; avatarIcon: string }> = {};
const BOT_PALETTE = ['#ef4444', '#f97316', '#a855f7', '#ec4899']; 
const LEADERBOARD_STORAGE_KEY = 'hexquest_leaderboard_v3'; 

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

interface AuthResponse { success: boolean; message?: string; }

interface GameStore extends GameState {
  session: SessionState | null;
  setUIState: (state: UIState) => void;
  loginAsGuest: (n: string, c: string, i: string) => void;
  registerUser: (n: string, p: string, c: string, i: string) => AuthResponse;
  loginUser: (n: string, p: string) => AuthResponse;
  logout: () => void;
  startNewGame: (win: WinCondition) => void;
  startCampaignLevel: (levelId: number) => void;
  startMission: () => void;
  abandonSession: () => void;
  togglePlayerGrowth: (intent?: 'RECOVER' | 'UPGRADE') => void;
  rechargeMove: () => void;
  movePlayer: (q: number, r: number) => void;
  confirmPendingAction: () => void;
  cancelPendingAction: () => void;
  advanceTutorial: (step: TutorialStep) => void;
  checkTutorialCamera: (deltaX: number) => void;
  tick: () => void;
  showToast: (msg: string, type: 'error' | 'success' | 'info') => void;
  hideToast: () => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
  playUiSound: (type: 'HOVER' | 'CLICK') => void;
  setLanguage: (lang: 'EN' | 'RU') => void;
}

let engine: GameEngine | null = null;
let tickCount = 0;

const createInitialSessionData = (winCondition: WinCondition): SessionState => {
  const startHex = { id: getHexKey(0,0), q:0, r:0, currentLevel: 0, maxLevel: 0, progress: 0, revealed: true };
  const initialGrid: Record<string, Hex> = { [getHexKey(0,0)]: startHex };
  getNeighbors(0, 0).forEach(n => { initialGrid[getHexKey(n.q, n.r)] = { id: getHexKey(n.q,n.r), q:n.q, r:n.r, currentLevel:0, maxLevel:0, progress:0, revealed:true }; });
  
  const botCount = winCondition.botCount || 0;
  const bots: Entity[] = [];
  const spawnPoints = [{ q: 0, r: -2 }, { q: 2, r: -2 }, { q: 2, r: 0 }, { q: 0, r: 2 }, { q: -2, r: 2 }, { q: -2, r: 0 }];

  for (let i = 0; i < Math.min(botCount, spawnPoints.length); i++) {
    const sp = spawnPoints[i];
    if (!initialGrid[getHexKey(sp.q, sp.r)]) {
        initialGrid[getHexKey(sp.q, sp.r)] = { id: getHexKey(sp.q,sp.r), q:sp.q, r:sp.r, currentLevel:0, maxLevel:0, progress:0, revealed:true };
        getNeighbors(sp.q, sp.r).forEach(n => {
            const k = getHexKey(n.q, n.r);
            if (!initialGrid[k]) initialGrid[k] = { id:k, q:n.q, r:n.r, currentLevel:0, maxLevel:0, progress:0, revealed:true };
        });
    }
    bots.push({
      id: `bot-${i+1}`, type: EntityType.BOT, state: EntityState.IDLE, q: sp.q, r: sp.r,
      playerLevel: 0, coins: GAME_CONFIG.INITIAL_COINS, moves: GAME_CONFIG.INITIAL_MOVES,
      totalCoinsEarned: 0, recentUpgrades: [], movementQueue: [],
      memory: { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 },
      avatarColor: BOT_PALETTE[i % BOT_PALETTE.length],
      recoveredCurrentHex: false
    });
  }
  
  let initialText = `Mission: Rank ${winCondition.targetLevel} ${winCondition.winType} ${winCondition.targetCoins} Credits.`;
  if (winCondition.isTutorial) {
      initialText = "TUTORIAL: Follow the on-screen instructions.";
  }

  const initialLog: LogEntry = {
    id: 'init-0',
    text: initialText,
    type: 'INFO',
    source: 'SYSTEM',
    timestamp: Date.now()
  };

  const initialMoves = winCondition.isTutorial ? 1 : GAME_CONFIG.INITIAL_MOVES;

  return {
    stateVersion: 0,
    sessionId: Math.random().toString(36).substring(2, 15),
    sessionStartTime: Date.now(),
    winCondition,
    difficulty: winCondition.difficulty,
    grid: initialGrid,
    player: {
      id: 'player-1', type: EntityType.PLAYER, state: EntityState.IDLE, q: 0, r: 0,
      playerLevel: 0, coins: GAME_CONFIG.INITIAL_COINS, 
      moves: initialMoves,
      totalCoinsEarned: 0, recentUpgrades: [], movementQueue: [],
      recoveredCurrentHex: false
    },
    bots,
    currentTurn: 0,
    messageLog: [initialLog],
    botActivityLog: [], 
    gameStatus: 'BRIEFING',
    lastBotActionTime: Date.now(),
    isPlayerGrowing: false,
    playerGrowthIntent: null,
    growingBotIds: [],
    telemetry: [],
    effects: [],
    tutorialStep: winCondition.isTutorial ? 'WELCOME' : 'NONE'
  };
};

export const useGameStore = create<GameStore>((set, get) => ({
  uiState: 'MENU',
  user: null,
  toast: null,
  pendingConfirmation: null,
  leaderboard: loadLeaderboard(),
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
    if (type === 'HOVER') audioService.play('UI_HOVER');
    if (type === 'CLICK') audioService.play('UI_CLICK');
  },

  startNewGame: (winCondition) => {
      audioService.play('UI_CLICK');
      get().abandonSession();
      const initialSessionState = createInitialSessionData(winCondition);
      engine = new GameEngine(initialSessionState); 
      set({ session: engine.state, hasActiveSession: true, uiState: 'GAME' });
  },

  startCampaignLevel: (levelId) => {
     const config = CAMPAIGN_LEVELS.find(l => l.levelId === levelId) || CAMPAIGN_LEVELS[0];
     get().startNewGame(config);
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
      const { pendingConfirmation, confirmPendingAction, cancelPendingAction, advanceTutorial } = get();

      if (session.gameStatus === 'BRIEFING') return;

      if (session.tutorialStep !== 'FREE_PLAY' && session.tutorialStep !== 'NONE') {
          const moveSteps = ['MOVE_1', 'MOVE_2', 'MOVE_3', 'BUILD_FOUNDATION', 'UPGRADE_CENTER_3']; 
          if (!moveSteps.includes(session.tutorialStep)) {
              audioService.play('ERROR');
              return;
          }
          
          if (session.tutorialStep === 'MOVE_1') {
              if (tq !== 1 || tr !== -1) { 
                  audioService.play('ERROR'); 
                  set({ toast: { message: "Wrong Sector. Target marked in BLUE (1, -1)", type: 'error', timestamp: Date.now() } });
                  return; 
              }
          }
          if (session.tutorialStep === 'MOVE_2') {
              if (tq !== 0 || tr !== -1) { 
                  audioService.play('ERROR'); 
                  set({ toast: { message: "Wrong Sector. Target marked in BLUE (0, -1)", type: 'error', timestamp: Date.now() } });
                  return; 
              }
          }
          if (session.tutorialStep === 'MOVE_3') {
              if (tq !== 0 || tr !== 0) { 
                  audioService.play('ERROR'); 
                  set({ toast: { message: "Return to Center (0, 0)", type: 'error', timestamp: Date.now() } });
                  return; 
              }
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
      
      const obstacles = session.bots.map(b => ({ q: b.q, r: b.r }));
      const path = findPath({ q: session.player.q, r: session.player.r }, { q: tq, r: tr }, session.grid, session.player.playerLevel, obstacles);
      
      if (!path) {
        audioService.play('ERROR');
        set({ toast: { message: "Path Blocked / Invalid", type: 'error', timestamp: Date.now() } });
        return;
      }

      let totalMoveCost = 0;
      for (const step of path) {
        const hex = session.grid[getHexKey(step.q, step.r)];
        totalMoveCost += (hex && hex.maxLevel >= 2) ? hex.maxLevel : 1;
      }

      const costMoves = Math.min(session.player.moves, totalMoveCost);
      const costCoins = (totalMoveCost - costMoves) * GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE;

      if (session.player.coins < costCoins) {
        audioService.play('ERROR');
        set({ toast: { message: `Need ${costCoins} credits`, type: 'error', timestamp: Date.now() } });
        return;
      }
      
      if (costCoins > 0) {
        audioService.play('WARNING');
        set({ 
             pendingConfirmation: { type: 'MOVE_WITH_COINS', data: { path, costMoves, costCoins } },
             toast: { message: `Click again to confirm (${costCoins}cr)`, type: 'info', timestamp: Date.now() } 
        });
        return;
      }

      // CRITICAL FIX: Use engine.state.stateVersion, not from potentially stale Zustand store
      const action: MoveAction = { type: 'MOVE', path, stateVersion: session.stateVersion };
      const res = engine.applyAction(session.player.id, action);
      
      if (res.ok) {
        audioService.play('MOVE');
        if (session.tutorialStep === 'MOVE_1') get().advanceTutorial('ACQUIRE_1');
        else if (session.tutorialStep === 'MOVE_2') get().advanceTutorial('ACQUIRE_2');
        else if (session.tutorialStep === 'MOVE_3') get().advanceTutorial('ACQUIRE_3');
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

  advanceTutorial: (step) => {
    if (!engine) return;
    engine.setTutorialStep(step);
    set({ session: engine.state });
  },

  checkTutorialCamera: (deltaX: number) => {
      const { session, advanceTutorial } = get();
      if (session?.tutorialStep === 'CAMERA_ROTATE') {
          if (Math.abs(deltaX) > 50) { 
              advanceTutorial('MOVE_1');
          }
      }
  },

  tick: () => {
      // STRICT CHECK: Only process logic if game is actively PLAYING.
      if (!engine || !engine.state) return;
      if (engine.state.gameStatus !== 'PLAYING') return;
      
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

               if (event.type === 'SECTOR_ACQUIRED' && isPlayer) {
                   const step = result.state.tutorialStep;
                   if (step === 'ACQUIRE_1') get().advanceTutorial('MOVE_2');
                   if (step === 'ACQUIRE_2') get().advanceTutorial('MOVE_3');
                   if (step === 'ACQUIRE_3') get().advanceTutorial('UPGRADE_CENTER_2');
                   
                   if (step === 'BUILD_FOUNDATION') {
                        const neighbors = getNeighbors(0,0);
                        const l2Count = neighbors.filter(n => result.state.grid[getHexKey(n.q, n.r)]?.maxLevel >= 2).length;
                        if (l2Count >= 3) get().advanceTutorial('UPGRADE_CENTER_3');
                   }
               }
               if (event.type === 'LEVEL_UP' && isPlayer) {
                   const step = result.state.tutorialStep;
                   if (step === 'UPGRADE_CENTER_2') get().advanceTutorial('BUILD_FOUNDATION');
                   if (step === 'BUILD_FOUNDATION') {
                        const neighbors = getNeighbors(0,0);
                        const l2Count = neighbors.filter(n => result.state.grid[getHexKey(n.q, n.r)]?.maxLevel >= 2).length;
                        if (l2Count >= 3) get().advanceTutorial('UPGRADE_CENTER_3');
                   }
                   if (step === 'UPGRADE_CENTER_3') {
                        get().advanceTutorial('VICTORY_ANIMATION');
                        engine?.triggerVictory(); 
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
                            text = "COLLAPSE -1 RANK"; // Updated text
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

      // 2. RENDER THROTTLE OPTIMIZATION
      // Update React state normally every 3 frames (20 FPS).
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
