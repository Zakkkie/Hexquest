import { WinCondition, SessionState, Difficulty, Item, Entity, EntityType, EntityState, HexCoord, LogEntry, Language, UserProfile, OverworldState } from '../types.ts';
import { LevelConfig } from '../types';
import { GAME_CONFIG, DIFFICULTY_SETTINGS, ENTROPY_CONFIG } from '../rules/config.ts';
import { getHexKey, getNeighbors } from './hexUtils.ts';
import { generateMap } from './mapGenerator.ts';
import { generateMonumentRecipe, getItemDef } from '../rules/items.ts';
// @ts-ignore
import MapWorker from './map.worker?worker';

const BOT_PALETTE = ['#ef4444', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e'];

export const generateMapAsync = async (levelConfig: LevelConfig | undefined, mapType: string): Promise<Record<string, any>> => {
  return new Promise((resolve) => {
    try {
      const worker = new MapWorker();
      worker.onmessage = (e: MessageEvent) => {
        resolve(e.data.grid);
        worker.terminate();
      };
      worker.onerror = (e: ErrorEvent) => {
        console.warn('MapWorker runtime error, falling back to sync map generation', e);
        resolve(generateMap(levelConfig, mapType as any));
        worker.terminate();
      };
      
      // Strip hooks from levelConfig before sending to worker to avoid cloning errors
      // Hooks contain functions which cannot be cloned for postMessage
      const safeLevelConfig = levelConfig ? {
        ...levelConfig,
        hooks: undefined
      } : undefined;
      
      worker.postMessage({ levelConfig: safeLevelConfig, mapType });
    } catch (err) {
      // Fallback to synchronous if worker fails to initialize or postMessage fails
      console.warn('WebWorker failed to initialize or postMessage failed, falling back to sync map generation', err);
      resolve(generateMap(levelConfig, mapType as any));
    }
  });
};

export const createInitialSessionDataAsync = async (
    winCondition: WinCondition | null,
    levelConfig: LevelConfig | undefined,
    language: Language,
    stateUser: UserProfile | null,
    overworldState: OverworldState
): Promise<SessionState> => {
  const mapType = winCondition?.mapType || 'FLAT';
  let initialGrid: Record<string, any> = {};

  if (levelConfig) {
    initialGrid = await generateMapAsync(levelConfig, mapType);
  } else {
    // SKIRMISH OPTIMIZATION: Start with minimal grid to avoid lag
    // Vision & Chaos rules will be applied below
    const { generateSingleHex } = await import('./mapGenerator.ts');
    const startHex = generateSingleHex(0, 0, undefined, mapType as any);
    startHex.revealed = true;
    initialGrid[getHexKey(0, 0)] = startHex;

    // Use BFS to generate up to radius 3
    const queue = [{ q: 0, r: 0, dist: 0 }];
    const visited = new Set<string>();
    visited.add(getHexKey(0, 0));

    let head = 0;
    while(head < queue.length) {
        const {q, r, dist} = queue[head++];
        if (dist >= 3) continue;

        getNeighbors(q, r).forEach(n => {
            const key = getHexKey(n.q, n.r);
            if (!visited.has(key)) {
                visited.add(key);
                const h = generateSingleHex(n.q, n.r, undefined, mapType as any);
                if (dist + 1 <= 2) {
                    h.revealed = true;
                }
                
                // Chaos Mode: Ensure staircase rule
                if (mapType === 'CHAOTIC') {
                    const parentHex = initialGrid[getHexKey(q, r)];
                    if (parentHex) {
                        const diff = h.currentLevel - parentHex.currentLevel;
                        if (Math.abs(diff) > 1) {
                            h.currentLevel = parentHex.currentLevel + (diff > 0 ? 1 : -1);
                            h.maxLevel = h.currentLevel;
                        }
                    }
                }
                initialGrid[key] = h;
                queue.push({q: n.q, r: n.r, dist: dist + 1});
            }
        });
    }
  }

  // Difficulty & Config Setup
  const difficulty: Difficulty = winCondition?.difficulty || 'MEDIUM';
  const diffSettings = DIFFICULTY_SETTINGS[difficulty];
  let maxStorage = winCondition?.initialStorage ?? diffSettings.maxStorage; 
  
  // Apply Overworld Equipment Bonuses
  let startCredits = levelConfig ? levelConfig.startState.credits : GAME_CONFIG.INITIAL_COINS;
  let startMoves = levelConfig ? levelConfig.startState.moves : GAME_CONFIG.INITIAL_MOVES;
  let startRank = levelConfig ? levelConfig.startState.rank : 1;
  let startStorage = levelConfig ? (levelConfig.startState.materials || 0) : 0;

  let activeStatuses: import('../types.ts').ActiveStatus[] = [];

  if (overworldState && overworldState.isGenerated) {
      const eq = overworldState.player.equipment;
      // Example bonuses based on equipment IDs
      if (eq.body === 'prospector_backpack' || eq.body === 'cargo_prism') {
          maxStorage += 1;
      }
      if (eq.head === 'rusted_scanner') {
          activeStatuses.push({ type: 'STATUS_SCANNER_BUFF', label: 'Active Scanner' });
      }
      if (eq.head === 'stability_scanner') {
          activeStatuses.push({ type: 'STATUS_ENTROPY_INVERSION', label: 'Entropy Inversion' });
      }
      if (eq.tool === 'hornet_drill') {
          startStorage += 1;
      }
      if (eq.tool === 'plasma_drill') {
          activeStatuses.push({ type: 'STATUS_GOLD_RUSH', label: 'Plasma Drill' });
      }
      if (eq.artifact === 'cortex_overclocker') {
          startRank += 1;
      }
  }
  
  // Player Position
  let startQ = 0, startR = 0;
  // Pick the lowest level hex owned by the player to avoid spawning on "peaks" where movement might be blocked by staircase rule
  const ownedHexes = Object.values(initialGrid).filter(h => h.ownerId === 'player-1');
  const playerStartHex = ownedHexes.sort((a, b) => (a.currentLevel || 0) - (b.currentLevel || 0))[0];
  
  if (playerStartHex) {
      startQ = playerStartHex.q;
      startR = playerStartHex.r;
  }

  // Generate Starting Inventory
  const initialInventory: Item[] = [];
  if (levelConfig && levelConfig.startState.startInventory) {
      levelConfig.startState.startInventory.forEach(baseId => {
          const def = getItemDef(baseId);
          if (def) {
              initialInventory.push({
                  id: `${baseId}-${Date.now()}-${Math.random().toString(36).substr(2,5)}`,
                  baseId: def.idPrefix,
                  rarity: def.rarity,
                  name: def.name[language],
                  description: def.description[language],
                  timestamp: Date.now(),
                  visualType: def.visualType,
                  effectType: def.effectType,
                  effectValue: def.effectValue,
                  effectDescription: def.effectLabel[language],
                  effectDuration: def.effectDuration,
                  negativeEffectType: def.negativeEffectType,
                  negativeEffectValue: def.negativeEffectValue,
                  negativeEffectLabel: def.negativeEffectLabel[language],
                  negativeEffectDuration: def.negativeEffectDuration
              });
          }
      });
  }

  // --- BOT SETUP & CUSTOM SPAWNS ---
  let botCount = 0;
  if (levelConfig) {
      if (levelConfig.aiMode !== 'none') {
          if (levelConfig.id === '2.5') botCount = 2;
          else if (levelConfig.botRoutes) botCount = levelConfig.botRoutes.length;
          else botCount = 1;
      }
  } else {
      botCount = winCondition?.botCount || 0;
  }

  const bots: Entity[] = [];
  const defaultSpawnPoints = [{ q: 0, r: -3 }, { q: 3, r: -3 }, { q: 3, r: 0 }, { q: 0, r: 3 }, { q: -3, r: 3 }, { q: -3, r: 0 }];
  
  const levelSpawns = levelConfig?.botSpawnPoints || null;

  for (let i = 0; i < botCount; i++) {
    const sp = levelSpawns && levelSpawns[i] ? levelSpawns[i] : defaultSpawnPoints[i % defaultSpawnPoints.length];
    
    const key = getHexKey(sp.q, sp.r);
    const botId = `bot-${i+1}`;
    if (!initialGrid[key]) {
        const { generateSingleHex } = await import('./mapGenerator.ts');
        const bHex = generateSingleHex(sp.q, sp.r, levelConfig, mapType as any);
        bHex.botRevealed = { 'SHARED_BOTS': true };
        initialGrid[key] = bHex;

        getNeighbors(sp.q, sp.r).forEach(n => {
            const nk = getHexKey(n.q, n.r);
            if (!initialGrid[nk]) {
                const nbHex = generateSingleHex(n.q, n.r, levelConfig, mapType as any);
                nbHex.botRevealed = { 'SHARED_BOTS': true };
                // Chaos rule for bots too
                if (mapType === 'CHAOTIC') {
                    const diff = nbHex.currentLevel - bHex.currentLevel;
                    if (Math.abs(diff) > 1) {
                        nbHex.currentLevel = bHex.currentLevel + (diff > 0 ? 1 : -1);
                        nbHex.maxLevel = nbHex.currentLevel;
                    }
                }
                initialGrid[nk] = nbHex;
            } else {
                initialGrid[nk].botRevealed = { ...initialGrid[nk].botRevealed, 'SHARED_BOTS': true };
            }
        });
    } else {
        initialGrid[key].botRevealed = { ...initialGrid[key].botRevealed, 'SHARED_BOTS': true };
    }

    const botStartMoves = levelConfig ? Math.max(5, startMoves) : startMoves;
    const botStartStorage = levelConfig ? (levelConfig.startState.materials || 0) : 0; 
    const botRoute = levelConfig?.botRoutes && levelConfig.botRoutes[i] ? levelConfig.botRoutes[i] : undefined;

    bots.push({
      id: botId, type: EntityType.BOT, state: EntityState.IDLE, q: sp.q, r: sp.r,
      playerLevel: startRank, 
      coins: startCredits,
      moves: botStartMoves,
      totalCoinsEarned: 0, movementQueue: [],
      storage: botStartStorage, maxStorage: maxStorage,
      inventory: [],
      memory: { 
          lastPlayerPos: null, 
          stuckCounter: 0,
          patrolPath: botRoute,
          patrolIndex: 0,
          lastDestroyTime: 0,
          isCampaign: !!levelConfig
      },
      avatarColor: BOT_PALETTE[Math.floor(Math.random() * BOT_PALETTE.length)],
      headIndex: Math.floor(Math.random() * 4),
      bodyIndex: Math.floor(Math.random() * 4),
      recoveredCurrentHex: false,
      recentUpgrades: [],
      activeStatuses: []
    });
  }

  let secretMonumentCoord: HexCoord | undefined = undefined;
  if (!levelConfig && winCondition?.winType === 'SUMMIT') {
      const angle = Math.random() * Math.PI * 2;
      const dist = 5 + Math.floor(Math.random() * 5); // 5 to 9 radius
      secretMonumentCoord = { q: Math.round(Math.cos(angle) * dist), r: Math.round(Math.sin(angle) * dist) };
  }

  let monumentRequirements: string[] | undefined;
  
  if (levelConfig) {
      switch (levelConfig.id) {
          case '2.1': monumentRequirements = []; break; 
          case '2.2': monumentRequirements = ['ANY', 'ANY', 'ANY']; break; 
          case '2.4': monumentRequirements = ['ANY', 'ANY']; break;
          case '2.5': monumentRequirements = ['ANY', 'ANY', 'ANY']; break; 
          case '3.5': monumentRequirements = ['ANY', 'ANY', 'ANY']; break;
          case '3.8': monumentRequirements = ['ANY', 'ANY']; break;
          case '4.8': monumentRequirements = ['ANY', 'ANY']; break;
          default: monumentRequirements = undefined;
      }
  } else if (winCondition?.winType === 'SUMMIT') {
      monumentRequirements = generateMonumentRecipe(difficulty);
  }

  let initialEntropy = levelConfig?.startState.initialEntropy ?? ENTROPY_CONFIG.INITIAL_MAX;

  const initialLog: LogEntry = {
    id: 'init-0',
    text: levelConfig ? levelConfig.description : `Mission: Rank ${winCondition?.targetLevel} ${winCondition?.winType} ${winCondition?.targetCoins} Credits.`,
    type: 'INFO',
    source: 'SYSTEM',
    timestamp: Date.now()
  };

  const session: SessionState = {
    stateVersion: 0,
    sessionId: Math.random().toString(36).substring(2, 15),
    sessionStartTime: Date.now(),
    winCondition,
    activeLevelConfig: levelConfig,
    activePoi: null,
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
      inventory: initialInventory, 
      recoveredCurrentHex: false,
      recentUpgrades: [],
      avatarColor: stateUser?.avatarColor || '#3b82f6',
      headIndex: stateUser?.headIndex || 0,
      bodyIndex: stateUser?.bodyIndex || 0,
      activeStatuses: activeStatuses
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

  // Dynamic objective for Level 1.2
  if (levelConfig?.id === '1.2' && session.activeLevelConfig) {
    const finishHex = Object.values(initialGrid).find(h => h.structureType === 'CAPITAL');
    if (finishHex) {
      session.activeLevelConfig = {
        ...levelConfig,
        objectiveHexes: [{ q: finishHex.q, r: finishHex.r, targetLevel: 99, label: '↑', color: 'emerald' }]
      };
    }
  }

  return session;
};

export const createInitialSessionData = createInitialSessionDataAsync;
