
import { create } from 'zustand';
import { GameState, Entity, Hex, EntityType, UIState, WinCondition, LeaderboardEntry, EntityState, MoveAction, RechargeAction, SessionState, LogEntry, FloatingText, Language } from './types.ts';
import { GAME_CONFIG } from './rules/config.ts';
import { getHexKey, getNeighbors, findPath } from './services/hexUtils.ts';
import { GameEngine } from './engine/GameEngine.ts';
import { audioService } from './services/audioService.ts';
import { CAMPAIGN_LEVELS } from './campaign/levels.ts';
import { LevelConfig } from './campaign/types.ts';

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
  // Map Generation Logic
  const initialGrid: Record<string, Hex> = {};
  
  if (levelConfig && levelConfig.mapConfig.customLayout) {
      // --- CUSTOM FIXED LAYOUT ---
      levelConfig.mapConfig.customLayout.forEach(hexDef => {
          if (hexDef.q === undefined || hexDef.r === undefined) return;
          const key = getHexKey(hexDef.q, hexDef.r);
          initialGrid[key] = {
              id: key,
              q: hexDef.q,
              r: hexDef.r,
              currentLevel: hexDef.currentLevel ?? 0,
              maxLevel: hexDef.maxLevel ?? 0,
              progress: 0,
              revealed: true,
              ownerId: hexDef.ownerId,
              structureType: hexDef.structureType,
              durability: hexDef.durability
          };
      });
  } else if (levelConfig && levelConfig.id === '1.2') {
      // --- LEVEL 1.2: PYRAMID RUN (GUARANTEED PATH, MINIMAL VOID) ---
      
      // 1. Define all coordinate sets first
      const walkableCoords = new Map<string, { q: number, r: number, isSafe: boolean, type?: string }>();
      
      // Start Platform (Safe)
      walkableCoords.set(getHexKey(0,0), { q:0, r:0, isSafe: true });

      // Corridor Generation
      let currentQ = 0;
      const validQs = [-1, 0, 1]; 
      const safePathCoords: {q: number, r: number}[] = [];

      for (let r = -1; r >= -6; r--) {
          const candidates = [currentQ, currentQ + 1];
          const validMoves = candidates.filter(q => validQs.includes(q));
          currentQ = validMoves.length > 0 ? validMoves[Math.floor(Math.random() * validMoves.length)] : 0;
          safePathCoords.push({ q: currentQ, r });
      }

      // Populate Corridor
      for (let r = -1; r >= -6; r--) {
          const safeHex = safePathCoords.find(c => c.r === r);
          const safeQ = safeHex ? safeHex.q : 0;

          validQs.forEach(q => {
              const isSafe = q === safeQ;
              walkableCoords.set(getHexKey(q,r), { q, r, isSafe });
          });
      }

      // Pyramid Base (L2) at Row -7
      // Connect to the safe path exit at row -6
      [-1, 0, 1].forEach(q => {
          walkableCoords.set(getHexKey(q, -7), { q, r: -7, isSafe: true, type: 'BASE' });
      });

      // Apex (L3) at Row -8
      walkableCoords.set(getHexKey(0, -8), { q: 0, r: -8, isSafe: true, type: 'APEX' });

      // 2. Build the Grid from Walkable Coords
      walkableCoords.forEach((data, key) => {
          let level = 1;
          let durability = data.isSafe ? 3 : 1;
          let structureType: 'CAPITAL' | undefined = undefined;

          if (data.type === 'BASE') { level = 2; durability = 3; }
          if (data.type === 'APEX') { level = 3; durability = 3; structureType = 'CAPITAL'; }

          initialGrid[key] = {
              id: key, q: data.q, r: data.r,
              currentLevel: level, maxLevel: level,
              progress: 0, revealed: true,
              ownerId: (data.q === 0 && data.r === 0) ? 'player-1' : undefined,
              durability,
              structureType
          };
      });

      // 3. Generate Bordering VOID
      // Only generate void for neighbors of walkable hexes that are NOT themselves walkable
      const voidCoords = new Set<string>();
      
      walkableCoords.forEach((data) => {
          getNeighbors(data.q, data.r).forEach(n => {
              const nKey = getHexKey(n.q, n.r);
              if (!walkableCoords.has(nKey)) {
                  voidCoords.add(nKey);
              }
          });
      });

      voidCoords.forEach(key => {
          const [q, r] = key.split(',').map(Number);
          initialGrid[key] = {
              id: key, q, r,
              currentLevel: 0, maxLevel: 0, progress: 0, revealed: true,
              structureType: 'VOID'
          };
      });

  } else {
      // --- STANDARD RADIAL GENERATION (Skirmish / Default) ---
      // For Skirmish (no levelConfig), we use a small radius (2) and NO walls
      // to simulate an infinite procedural world that expands as you move.
      const mapRadius = levelConfig ? levelConfig.mapConfig.size : 2; 
      const shouldGenerateWalls = levelConfig ? levelConfig.mapConfig.generateWalls : false; 
      const wallStartRadius = levelConfig?.mapConfig.wallStartRadius ?? mapRadius;
      const wallStartLevel = levelConfig?.mapConfig.wallStartLevel ?? 9;
      const wallType = levelConfig?.mapConfig.wallType ?? 'classic';

      for (let q = -mapRadius; q <= mapRadius; q++) {
          const r1 = Math.max(-mapRadius, -q - mapRadius);
          const r2 = Math.min(mapRadius, -q + mapRadius);
          for (let r = r1; r <= r2; r++) {
              const key = getHexKey(q, r);
              
              const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q-r));
              const isWall = shouldGenerateWalls && dist >= wallStartRadius;
              
              let level = 0;
              let structureType: 'BARRIER' | 'VOID' | undefined = undefined;

              if (isWall) {
                  if (wallType === 'void_shatter') {
                      if (dist === wallStartRadius) {
                          structureType = 'VOID';
                          level = 0;
                      } else {
                          const noise = Math.abs(Math.sin(q * 12.9898 + r * 78.233) * 43758.5453) % 1;
                          if (noise > 0.4) {
                              level = 1 + Math.floor((noise - 0.4) * 10); 
                              if (level > 5) level = 5;
                          } else {
                              level = 0;
                          }
                          structureType = undefined;
                      }
                  } else {
                      level = Math.min(99, wallStartLevel + (dist - wallStartRadius));
                      structureType = 'BARRIER';
                  }
              }

              // Determine Owner for Skirmish Start
              let ownerId: string | undefined = undefined;
              let maxLevel = level;
              let currentLevel = level;
              let durability: number | undefined = undefined;

              // If Skirmish (no levelConfig) and Center Hex
              // UPDATED: Start at 0/0 resources, so map must be L0 and Unowned
              if (!levelConfig && q === 0 && r === 0) {
                  ownerId = undefined; // No owner initially
                  maxLevel = 0;        // Level 0
                  currentLevel = 0;    // Level 0
                  durability = undefined;
              }

              // Apply correct durability if hex is Level 1 (e.g. from walls or noise)
              if (!durability && maxLevel === 1) {
                  durability = GAME_CONFIG.L1_HEX_MAX_DURABILITY;
              }

              initialGrid[key] = { 
                  id: key, 
                  q, 
                  r, 
                  currentLevel, 
                  maxLevel, 
                  progress: 0, 
                  revealed: true,
                  structureType,
                  ownerId,
                  durability
              };
          }
      }
  }

  // Ensure center exists if not created (Fallback)
  if (!initialGrid[getHexKey(0,0)]) {
      initialGrid[getHexKey(0,0)] = { 
          id: getHexKey(0,0), q:0, r:0, 
          currentLevel: 0, maxLevel: 0, progress: 0, revealed: true 
      };
  }
  
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
      // Actually, HUD handles UI blocking. Engine just receives move.
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
                        // Add notification about unlock?
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
                                icon = 'CO