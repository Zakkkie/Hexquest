import { WinCondition, SessionState, Difficulty, Item, Entity, EntityType, EntityState, HexCoord, LogEntry, Language, UserProfile } from '../types.ts';
import { LevelConfig } from '../types';
import { GAME_CONFIG, DIFFICULTY_SETTINGS, ENTROPY_CONFIG } from '../rules/config.ts';
import { getHexKey, getNeighbors } from './hexUtils.ts';
import { generateMap, generateSingleHex } from './mapGenerator.ts';
import { generateMonumentRecipe, getItemDef, ITEM_REGISTRY } from '../rules/items.ts';
import MapWorker from './map.worker?worker';

const BOT_PALETTE = ['#ef4444', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e'];

export const generateMapAsync = async (levelConfig: LevelConfig | undefined, mapType: string): Promise<Record<string, any>> => {
  const size = levelConfig?.mapConfig?.size || 0;
  
  // For standard campaign maps, synchronous generation is significantly faster
  // and avoids the main-thread micro-freezes caused by WebWorker instantiation.
  if (size <= 20) {
    const grid = generateMap(levelConfig, mapType as any);
    
    // Pre-calculate neighborLevels for initial rendering optimization (matching worker logic)
    for (const key in grid) {
      const hex = grid[key];
      const neighbors = getNeighbors(hex.q, hex.r);
      hex.neighborLevels = neighbors.map(n => {
        const nKey = getHexKey(n.q, n.r);
        const nHex = grid[nKey];
        return nHex ? nHex.maxLevel : -99; // -99 is VOID_LEVEL_FLAG
      });
    }
    
    return Promise.resolve(grid);
  }

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

import { getMilestoneModifiers } from '../campaign/milestones.ts';
import { useGameStore } from '../store.ts';

export const createInitialSessionData = async (
    winCondition: WinCondition | null,
    levelConfig: LevelConfig | undefined,
    language: Language,
    stateUser: UserProfile | null,
    campaignUpgrades: import('../types.ts').CampaignUpgrades
): Promise<SessionState> => {
  const mapType = winCondition?.mapType || 'FLAT';
  let initialGrid: Record<string, any> = {};

  if (levelConfig) {
    initialGrid = await generateMapAsync(levelConfig, mapType);
  } else {
    // SKIRMISH OPTIMIZATION: Start with minimal grid to avoid lag
    // Vision & Chaos rules will be applied below
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
  if (levelConfig && campaignUpgrades) {
    maxStorage = campaignUpgrades.maxMaterials;
  }
  
  // Apply Overworld Equipment Bonuses & Campaign Upgrades
  let startCredits = levelConfig ? levelConfig.startState.credits : GAME_CONFIG.INITIAL_COINS;
  let startMoves = levelConfig ? levelConfig.startState.moves : GAME_CONFIG.INITIAL_MOVES;
  const startRank = levelConfig ? levelConfig.startState.rank : 1;
  let startStorage = levelConfig ? (levelConfig.startState.materials || 0) : 0;

  if (levelConfig && campaignUpgrades) {
      startCredits += campaignUpgrades.startingGold;
      startMoves += campaignUpgrades.startingMoves;
      startStorage += campaignUpgrades.startingMaterials;
  }

  try {
      const totalGoldEarned = useGameStore.getState().totalGoldEarned || 0;
      if (totalGoldEarned > 0) {
          const milestones = getMilestoneModifiers(totalGoldEarned);
          startMoves += milestones.extraFuel;
          startStorage += milestones.extraStartingMats;
      }
  } catch (e) {
      // Ignored for headless tests
  }

  const activeStatuses: import('../types.ts').ActiveStatus[] = [];

  // Player Position
  let startQ = 0, startR = 0;
  // Pick the highest level hex owned by the player
  let candidateHexes = Object.values(initialGrid).filter(h => h.ownerId === 'player-1' && h.structureType !== 'VOID');
  
  // FALLBACK: If no owned hex, pick ANY highest level reachable hex in the grid
  if (candidateHexes.length === 0) {
      candidateHexes = Object.values(initialGrid).filter(h => h.structureType !== 'VOID' && h.isPassable !== false);
  }

  const playerStartHex = candidateHexes.sort((a, b) => (b.currentLevel || 0) - (a.currentLevel || 0))[0];
  
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
          else if (levelConfig.botSpawnPoints) botCount = levelConfig.botSpawnPoints.length;
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

    const botStartMoves = levelConfig ? Math.max(5, startMoves) : Math.max(10, startMoves);
    const botStartStorage = levelConfig ? (levelConfig.startState.materials || 0) : 0; 
    const botRoute = levelConfig?.botRoutes && levelConfig.botRoutes[i] ? levelConfig.botRoutes[i] : undefined;

    bots.push({
      id: botId, type: EntityType.BOT, state: EntityState.IDLE, q: sp.q, r: sp.r,
      playerLevel: startRank, 
      coins: startCredits,
      moves: botStartMoves,
      totalCoinsEarned: 0, actionsTaken: 0, movementQueue: [],
      storage: botStartStorage, maxStorage: maxStorage,
      inventory: [],
      maxInventorySize: GAME_CONFIG.MAX_INVENTORY_SIZE,
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
  let monumentAlternatives: string[] | undefined;
  
  if (levelConfig) {
      switch (levelConfig.id) {
          case '2.1': monumentRequirements = []; break; 
          case '2.2': monumentRequirements = ['ANY', 'ANY', 'ANY']; break; 
          case '2.3': monumentRequirements = []; break;
          case '2.4': monumentRequirements = ['ANY']; break;
          case '2.5': monumentRequirements = []; break; 
          case '2.6': monumentRequirements = []; break;
          case '2.7': monumentRequirements = []; break;
          case '2.8': monumentRequirements = []; break;
          case '2.9': monumentRequirements = []; break;
          case '2.10': monumentRequirements = ['fuel_cell', 'reality_patch']; break; 
          case '3.1': monumentRequirements = ['cargo_prism']; break;
          case '3.2': monumentRequirements = ['hornet_drill', 'emergency_gen']; break;
          case '3.3': monumentRequirements = ['UNCOMMON']; break;
          case '3.4': monumentRequirements = ['reality_patch', 'RARE']; break;
          case '3.5': monumentRequirements = ['RARE']; break;
          case '3.6': 
              monumentRequirements = ['ONE_OF']; 
              monumentAlternatives = ['cargo_prism', 'hornet_drill', 'emergency_gen'];
              break;
          case '3.7': monumentRequirements = ['hornet_drill', 'matter_prism']; break;
          case '3.8': monumentRequirements = ['cargo_prism', 'stability_scanner', 'matter_prism']; break;
          case '4.2': monumentRequirements = []; break;
          case '4.4': monumentRequirements = []; break;
          case '4.5': monumentRequirements = []; break;
          case '4.8': monumentRequirements = ['ANY', 'ANY']; break;
          default: monumentRequirements = undefined;
      }
  } else if (winCondition?.winType === 'SUMMIT') {
      monumentRequirements = generateMonumentRecipe(difficulty);
  }

  const initialEntropy = levelConfig?.startState.initialEntropy ?? ENTROPY_CONFIG.INITIAL_MAX;

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
    monumentAlternatives,
    difficulty,
    grid: initialGrid,
    player: {
      id: 'player-1', type: EntityType.PLAYER, state: EntityState.IDLE, q: startQ, r: startR,
      playerLevel: startRank, 
      coins: startCredits, 
      moves: startMoves,
      totalCoinsEarned: 0, actionsTaken: 0, movementQueue: [],
      storage: startStorage, 
      maxStorage: maxStorage,
      inventory: initialInventory, 
      maxInventorySize: (levelConfig && campaignUpgrades) ? campaignUpgrades.inventorySlots : GAME_CONFIG.MAX_INVENTORY_SIZE,
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
    campaignUpgrades,
    totalMinedMaterial: 0,
    minedHexes: {},
    outgoingEvents: []
  };

  // --- SECRET LOOT HEXES GENERATION FOR MONUMENTS ---
  if (levelConfig?.secretLootHexes) {
    session.secretLootHexes = levelConfig.secretLootHexes.map((h: any) => ({ ...h, found: false }));
    session.activatedMiniMonuments = [];
  } else if (monumentRequirements && monumentRequirements.length > 0) {
    const secretLootHexes: any[] = [];
    const candidates = Object.values(initialGrid).filter(h => 
      h.structureType !== 'MONUMENT' && 
      h.structureType !== 'MINI_MONUMENT' && 
      h.structureType !== 'VOID' && 
      h.structureType !== 'CAPITAL' &&
      !(h.q === startQ && h.r === startR)
    );

    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    
    for (let i = 0; i < monumentRequirements.length; i++) {
      const req = monumentRequirements[i];
      const hexCandidate = shuffled[i % shuffled.length];
      if (hexCandidate) {
        let itemBaseId = req;
        if (['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'].includes(req)) {
          const matching = ITEM_REGISTRY.filter(item => item.rarity === req);
          const chosen = matching[Math.floor(Math.random() * matching.length)];
          itemBaseId = chosen ? chosen.idPrefix : 'cargo_prism';
        } else if (req === 'ANY') {
          const chosen = ITEM_REGISTRY[Math.floor(Math.random() * ITEM_REGISTRY.length)];
          itemBaseId = chosen ? chosen.idPrefix : 'cargo_prism';
        } else if (req === 'ONE_OF') {
          const pool = monumentAlternatives && monumentAlternatives.length > 0 ? monumentAlternatives : ['cargo_prism'];
          itemBaseId = pool[Math.floor(Math.random() * pool.length)];
        }

        secretLootHexes.push({
          q: hexCandidate.q,
          r: hexCandidate.r,
          itemBaseId: itemBaseId,
          level: -1 - Math.floor(Math.random() * 3), // -1, -2, -3, -4
          found: false
        });
      }
    }
    session.secretLootHexes = secretLootHexes;
    session.activatedMiniMonuments = [];
  }

  // Dynamic objective for Level 1.1
  if (levelConfig?.id === '1.1' && session.activeLevelConfig) {
    const finishHex = Object.values(initialGrid).find(h => h.structureType === 'CAPITAL');
    if (finishHex) {
      session.activeLevelConfig = {
        ...levelConfig,
        objectiveHexes: [{ q: finishHex.q, r: finishHex.r, targetLevel: 99, label: '↑', color: 'emerald' }]
      };
    }
  }

  // --- PUZZLE SETUP FOR SERIES 5 ---
  if (levelConfig?.id?.startsWith('5.')) {
      const allHexes = Object.values(session.grid).filter(h => h.structureType === 'NONE' && (Math.abs(h.q) + Math.abs(h.r)) >= 3);
      const miniMonuments: any[] = [];
      
      while(miniMonuments.length < 3 && allHexes.length > 0) {
        const idx = Math.floor(Math.random() * allHexes.length);
        const candidate = allHexes[idx];
        allHexes.splice(idx, 1);
        
        let valid = true;
        for (const m of miniMonuments) {
           // use cube distance
           const dist = (Math.abs(m.q - candidate.q) + Math.abs(m.r - candidate.r) + Math.abs((m.q + m.r) - (candidate.q + candidate.r))) / 2;
           if (dist < 3) {
               valid = false;
               break;
           }
        }
        if (valid) {
           miniMonuments.push(candidate);
        }
      }
      
      for (const m of miniMonuments) {
         const key = `${m.q},${m.r}`;
         if (session.grid[key]) {
             session.grid[key].structureType = 'MINI_MONUMENT';
             session.grid[key].isMiniMonument = true;
             session.grid[key].currentLevel = 1;
             session.grid[key].maxLevel = 1;
         }
      }
      session.activatedMiniMonuments = [];
  }

  // Portal starts active for the merged Level 1.0
  if (levelConfig?.id === '1.0') {
    session.portalActive = true;
    session.portalHex = { q: -2, r: 3 };
  }

  if (levelConfig?.creepingVoid) {
    session.creepingVoid = {
      lastInfectTime: Date.now(),
      infectedHexes: {},
      sourceRestored: false
    };
  }

  return session;
};
