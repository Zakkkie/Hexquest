import { WinCondition, SessionState, Difficulty, Item, Entity, EntityType, EntityState, HexCoord, LogEntry, Language, UserProfile, OverworldState } from '../types.ts';
import { LevelConfig } from '../campaign/types.ts';
import { GAME_CONFIG, DIFFICULTY_SETTINGS, ENTROPY_CONFIG } from '../rules/config.ts';
import { getHexKey, getNeighbors } from './hexUtils.ts';
import { generateMap } from './mapGenerator.ts';
import { generateMonumentRecipe, getItemDef } from '../rules/items.ts';

const BOT_PALETTE = ['#ef4444', '#f97316', '#a855f7', '#ec4899', '#14b8a6', '#f43f5e'];

export const createInitialSessionData = (
    winCondition: WinCondition | null,
    levelConfig: LevelConfig | undefined,
    language: Language,
    stateUser: UserProfile | null,
    overworldState: OverworldState
): SessionState => {
  const mapType = winCondition?.mapType || 'FLAT';
  const initialGrid = generateMap(levelConfig, mapType);

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
  const playerStartHex = Object.values(initialGrid).find(h => h.ownerId === 'player-1');
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
  const defaultSpawnPoints = [{ q: 0, r: -2 }, { q: 2, r: -2 }, { q: 2, r: 0 }, { q: 0, r: 2 }, { q: -2, r: 2 }, { q: -2, r: 0 }];
  
  const campaignBotSpawns: Record<string, HexCoord[]> = {
      '1.6': [{ q: 0, r: -2 }],
      '2.4': [{ q: 0, r: -3 }],
      '2.5': [{ q: 3, r: -3 }, { q: -3, r: 0 }],
      '3.5': [{ q: 3, r: 0 }],
      '3.6': [{ q: -1, r: 0 }],
      '4.5': [{ q: 0, r: -3 }],
  };

  const levelSpawns = levelConfig ? (levelConfig.botSpawnPoints || campaignBotSpawns[levelConfig.id]) : null;

  for (let i = 0; i < botCount; i++) {
    const sp = levelSpawns && levelSpawns[i] ? levelSpawns[i] : defaultSpawnPoints[i % defaultSpawnPoints.length];
    
    const key = getHexKey(sp.q, sp.r);
    if (!initialGrid[key]) {
        initialGrid[key] = { id: key, q: sp.q, r: sp.r, currentLevel: 0, maxLevel: 0, progress: 0, revealed: true };
        getNeighbors(sp.q, sp.r).forEach(n => {
            const nk = getHexKey(n.q, n.r);
            if (!initialGrid[nk]) initialGrid[nk] = { id: nk, q: n.q, r: n.r, currentLevel: 0, maxLevel: 0, progress: 0, revealed: true };
        });
    }

    const botStartMoves = levelConfig ? Math.max(5, startMoves) : startMoves;
    const botStartStorage = levelConfig ? (levelConfig.startState.materials || 0) : 0; 
    const botRoute = levelConfig?.botRoutes && levelConfig.botRoutes[i] ? levelConfig.botRoutes[i] : undefined;

    bots.push({
      id: `bot-${i+1}`, type: EntityType.BOT, state: EntityState.IDLE, q: sp.q, r: sp.r,
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
      const dist = 4 + Math.floor(Math.random() * 3);
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
};
