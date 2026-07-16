// In a stricter setup, we would move shared types to a 'core' module.
export type HexCoord = { q: number; r: number; upgrade?: boolean; intent?: 'UPGRADE' | 'RECOVER' | 'DIG' };

// Read-only view of a Hex for the Bot (Architecture Requirement)
export interface HexView {
  id: string;
  q: number;
  r: number;
  currentLevel: number;
  maxLevel: number;
  // ДОБАВЛЕНО: MINI_MONUMENT, CORE, TURRET
  structureType?: 'NONE' | 'BARRIER' | 'CAPITAL' | 'VOID' | 'MONUMENT' | 'MINE' | 'MINI_MONUMENT' | 'CORE' | 'TURRET';
  ownerId?: string; 
  neighborLevels?: number[];
  isExcavated?: boolean;
  isPlayerBuilt?: boolean;
}

// Full State Hex
export interface Hex extends HexView {
  progress: number;
  revealed: boolean;
  botRevealed?: Record<string, boolean>;
  structureHp?: number;
  durability?: number; // New: Lives for Level 1 hexes
  trap?: { active: boolean, potency?: number } | null;
  artifact?: { type: string };
  
  // V95 High Level Mechanics - RECOVERY SYSTEM v2
  recoveryCharges?: number;        // Current charges for L4+ (0-3)
  recoveryMaxCharges?: number;     // Always 3 for L4+, 1 for L0-L3 (Virtual)
  lastRecoveryUseTime?: number;    // Timestamp of last use
  cooldownEndTime?: number;        // Timestamp when cooldown expires (for L4+)

  // Loot History: Tracks negative levels where items/coins were already found
  lootedLevels?: number[];

  // НОВЫЕ МЕХАНИКИ КАМПАНИИ: Мини-монументы и пинги
  miniMonumentActivatedBy?: string[];
  lootHighlighted?: boolean;
  lootHighlightUntil?: number;

  // NEW: Biomes and POIs
  biome?: TerrainType;
  poiType?: string;
  isPassable?: boolean;
  isIndestructible?: boolean;

  // BASE DEFENSE & MINI-MONUMENT FIELDS
  isMiniMonument?: boolean;
  isCore?: boolean;
  isActivated?: boolean;
  hologramTargetLevel?: number; // Целевая плита для голографического контура (Этап 3)
  isTurret?: boolean;
  turretRange?: number;
  turretDamage?: number;
  turretCooldown?: number;
}

export enum SpecialStructureType {
  NONE = 'NONE',
  MONUMENT = 'MONUMENT',
  MINI_MONUMENT = 'MINI_MONUMENT',
  CORE = 'CORE',
  TURRET = 'TURRET'
}

export enum EntityType {
  PLAYER = 'PLAYER',
  BOT = 'BOT'
}

export enum EntityState {
  IDLE = 'IDLE',
  MOVING = 'MOVING',
  GROWING = 'GROWING',
  LOCKED = 'LOCKED'
}

// LOOT SYSTEM TYPES
export type ItemRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';

export type ItemEffectType = 
    | 'ADD_MOVES' 
    | 'ADD_CREDITS' 
    | 'ADD_MATERIAL' 
    | 'ADD_ENTROPY' 
    | 'REVEAL_MAP' 
    | 'INCREASE_STORAGE' 
    | 'BUFF_DIG' 
    | 'FREE_UPGRADES' 
    | 'LEVEL_UP' 
    | 'EXPAND_INVENTORY' 
    | 'GOD_MODE'
    | 'STATUS_GOLD_RUSH'
    | 'STATUS_FREE_BUILD'
    | 'STATUS_SCANNER_BUFF'
    | 'STATUS_ENTROPY_INVERSION';

export type NegativeEffectType =
    | 'LOSE_CREDITS'
    | 'LOSE_MOVES'
    | 'LOSE_RANK'
    | 'LOSE_ENTROPY'
    | 'RESET_MATERIALS'
    | 'FULL_RESET'
    | 'AMNESIA' 
    | 'STATUS_FATIGUE'      
    | 'STATUS_MINING_OFFLINE' 
    | 'STATUS_TUNNEL_VISION'  
    | 'STATUS_GOLD_CURSE'     
    | 'STATUS_SOIL_EATER'     
    | 'STATUS_BREAKDOWN_RISK'; 

export interface ActiveStatus {
    type: ItemEffectType | NegativeEffectType;
    label: string; 
    expiresAt?: number; 
    icon?: string; 
    description?: string; 
}

export interface Item {
  id: string;
  baseId: string; 
  rarity: ItemRarity;
  name: string; 
  description: string; 
  timestamp: number;
  
  visualType: string;
  
  effectType: ItemEffectType;
  effectValue: number;
  effectDescription: string; 
  effectDuration?: number; 

  maxHpBonus?: number;
  maxEnergyBonus?: number;

  equipSlot?: 'head' | 'body' | 'feet' | 'necklace' | 'ring' | 'tool' | 'artifact';

  negativeEffectType?: NegativeEffectType;
  negativeEffectValue?: number;
  negativeEffectLabel?: string;
  negativeEffectDuration?: number;
}

export type PlanStep =
    | { type: 'MOVE_TO'; targetId: string }
    | { type: 'UPGRADE'; targetId: string }
    | { type: 'DIG'; targetId: string }
    | { type: 'MINE_UNTIL_FULL' }
    | { type: 'RECOVER' };

export interface Plan {
    steps: PlanStep[];
    createdAt: number; 
    label: string;     
}

export interface BotMemory {
  lastPlayerPos: HexCoord | null;
  stuckCounter: number;
  waitStreak?: number;
  lastPosKey?: string | null;
  stayStreak?: number;
  
  botRole?: 'BUILDER' | 'DIGGER' | 'AGGRESSOR' | 'SUPPORTER' | 'MINER' | 'DESTROYER' | 'GUARDIAN' | 'SIEGE_RUNNER' | 'SIEGE_GRINDER' | 'SIEGE_TANK';
  mode?: 'GATHER' | 'BUILD' | 'AGGRESSOR';
  
  patrolPath?: HexCoord[];
  patrolIndex?: number;
  lastDestroyTime?: number;

  targetHexId?: string | null;
  blacklistedTargets?: string[];
  plan?: Plan | null;
  lastActionType?: string | null;
  projectFailCount?: number;

  phase?: 'EXPLORE' | 'STOCKPILE' | 'ASSAULT';
  exploreAnchor?: HexCoord | null;
  exploreTickCount?: number;
  stockpileWaitTicks?: number;
  isCampaign?: boolean;
}

export interface Entity {
  id: string;
  type: EntityType;
  state: EntityState;
  
  q: number;
  r: number;
  
  playerLevel: number; 
  coins: number;
  totalCoinsEarned: number;
  actionsTaken?: number;
  moves: number;
  recentUpgrades: string[]; 
  
  storage: number;
  maxStorage: number;

  inventory: Item[];
  maxInventorySize?: number; 
  equipment?: Record<string, Item>;

  activeStatuses: ActiveStatus[];

  movementQueue: HexCoord[]; 
  memory?: BotMemory; 
  
  avatarColor?: string; 
  headIndex: number;
  bodyIndex: number;
  
  recoveredCurrentHex?: boolean; 
  lastMoveTime?: number; 
  lastActionTime?: number;
}

export type GameEventType = 
  | 'LEVEL_UP' 
  | 'SECTOR_ACQUIRED'
  | 'SECTOR_EXCAVATED' 
  | 'MOVE_COMPLETE' 
  | 'ERROR' 
  | 'VICTORY' 
  | 'DEFEAT' 
  | 'GROWTH_TICK'
  | 'ACTION_DENIED'
  | 'BOT_LOG'
  | 'LEADERBOARD_UPDATE'
  | 'RECOVERY_USED'
  | 'HEX_COLLAPSE'
  | 'HEX_DOWNGRADE'
  | 'ITEM_DROP' 
  | 'ITEM_DESTROYED' 
  | 'HEX_RESTORED' 
  | 'HEX_RESTORE_FAILED' 
  | 'MONUMENT_REACHED'
  | 'MINI_MONUMENT_REACHED'
  | 'STATUS_APPLIED'
  | 'ENTROPY_SHIFT'
  | 'CORE_DAMAGED'
  | 'CORE_DESTROYED'
  | 'TURRET_FIRED'
  | 'PUZZLE_REVEALED'
  | 'PUZZLE_COMPLETED'
  | 'METEOR_WARN'
  | 'METEOR_STRIKE'
  | 'PLAYER_HIT_BY_METEOR'; 

export interface GameEvent {
  id: string;
  type: GameEventType;
  entityId?: string;
  message?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface BotLogEntry {
  botId: string;
  action: string;
  reason: string;
  target?: string;
  timestamp: number;
  phase?: string;
  role?: string;
  planLabel?: string;
  resources?: string;
  rank?: number;
}

export interface LogEntry {
  id: string;
  text: string;
  type: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' | 'DEBUG';
  source: string;
  timestamp: number;
}

export interface ToastMessage {
  message: string;
  type: 'error' | 'success' | 'info';
  timestamp: number;
}

export type TerrainType = 'STANDARD';

export type UIState = 'MENU' | 'GAME' | 'LEADERBOARD' | 'CAMPAIGN_MAP' | 'INTRO' | 'CAMPAIGN_LOADING' | 'STORY_BUILDER' | 'LEVEL_EDITOR';
export type DeviceType = 'MOBILE' | 'TABLET' | 'DESKTOP';

export interface UserProfile {
  isAuthenticated: boolean;
  isGuest: boolean;
  nickname: string;
  avatarColor: string;
  headIndex: number;
  bodyIndex: number;
}

export interface PendingConfirmation {
  type: 'MOVE_WITH_COINS';
  data: {
    path: HexCoord[];
    costMoves: number;
    costCoins: number;
  };
}

export type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type Language = 'EN' | 'RU';

export interface WinCondition {
  levelId: number;
  targetLevel: number;
  targetCoins: number;
  label: string;
  botCount: number; 
  difficulty: Difficulty;
  queueSize: number;     
  winType: 'OR' | 'AND' | 'SUMMIT' | 'SIEGE' | 'PUZZLE'; 
  isTutorial?: boolean;
  initialStorage?: number; 
  mapType?: 'FLAT' | 'CHAOTIC'; 
  startingArtifactId?: string;
  startingCreditsBonus?: number;
  startingMovesBonus?: number;
  mutatorType?: 'NONE' | 'SUDDEN_DEATH' | 'RICH_VEINS' | 'FRAGILE_GROUND' | 'NANO_STORM';
}

export interface LeaderboardEntry {
  nickname: string;
  avatarColor: string;
  headIndex: number;
  bodyIndex: number;
  avatarIcon?: string;
  maxCoins: number;
  maxLevel: number;
  score: number;
  timestamp: number;
  difficulty: Difficulty;
  levelId?: string;
  scoresByLevel?: Record<string, number>;
}

export interface FloatingText {
  id: string;
  q: number;
  r: number;
  text: string;
  color: string;
  startTime: number;
  lifetime: number;
  icon?: 'UP' | 'PLUS' | 'WARN' | 'COIN' | 'DOWN' | 'PICKAXE' | 'GEM' | 'SKULL' | 'FOOTPRINTS';
  sourceQ?: number;
  sourceR?: number;
}

import type { WorldIndex } from './engine/WorldIndex';

export interface ScenarioHooks {
  checkWinCondition?: (state: SessionState, index: WorldIndex) => boolean;
  checkLossCondition?: (state: SessionState, index: WorldIndex) => boolean;
  onBeforeAction?: (state: SessionState, action: GameAction) => ValidationResult | null;
  onAfterAction?: (state: SessionState, index: WorldIndex) => void;
}

export interface SecretLootHex {
  q: number;
  r: number;
  itemBaseId: string;
  level: number;
  found?: boolean;
}

// --- НОВЫЕ МЕХАНИКИ КАМПАНИИ (ЧЕРТЕЖИ И РЕЦЕПТЫ) ---

export interface Blueprint {
  q: number;
  r: number;
  targetLevel: number;
  label?: string;
  color?: string;
}

export interface RecipeSlot {
  rarity?: ItemRarity;
  minRarity?: ItemRarity;
  any?: boolean;
  hint?: string;
}

export interface MonumentRecipe {
  mode: 'ALL' | 'ANY_COMBO';
  slots: RecipeSlot[];
  combos?: RecipeSlot[][];
}

export interface ObjectiveHex {
  q: number;
  r: number;
  targetLevel: number;
  label?: string;
  color?: string;
}

// ------------------------------

/** Describes what behaviour the campaign bot should pursue on a given level */
export type BotObjective =
    | 'COMPETE_RANK'    // Race the player to the highest-level structure (rank win)
    | 'MONUMENT_RACE'   // Collect items & activate the Monument before the player
    | 'DESTROY_PLAYER'  // Hunt and dig down player-owned structures
    | 'GUARD_HEXES'     // Restore dug/damaged hexes back to their maxLevel state
    | 'OWN_HEXES';      // Try to claim more hexes than the player

export interface LevelConfig {
  id: string;
  title: string;
  description: string;
  
  mapConfig: {
    size: number;
    type: 'procedural' | 'fixed';
    generateWalls?: boolean; 
    wallStartRadius?: number; 
    wallStartLevel?: number;  
    wallType?: 'classic' | 'void_shatter' | 'pit_ring'; 
    revealMode?: 'fog' | 'all'; 
    customLayout?: Partial<Hex>[];
  };

  startState: {
    credits: number;
    moves: number;
    rank: number;
    materials?: number; 
    startInventory?: string[]; 
    items?: { baseId: string; rarity: ItemRarity }[]; 
    initialEntropy?: number; 
  };

  // --- МАССИВЫ КООРДИНАТ ДЛЯ БОТОВ ---
  botRoutes?: HexCoord[][]; // Маршруты патрулей
  botSpawnPoints?: HexCoord[]; // Явные точки спавна для ИИ

  /** Цель бота в кампании — определяет стратегию buildCampaignPlan */
  botObjective?: BotObjective;

  /** Короткий текст цели миссии (≤35 символов), отображается в нижнем тулбаре */
  goalText?: string;

  objectiveHexes?: ObjectiveHex[];
  blueprints?: Blueprint[];
  monumentRecipe?: MonumentRecipe;
  miniMonumentCoords?: HexCoord[];
  monumentZoneRadius?: number;
  preGeneratedLootHexes?: HexCoord[];
  requiredShapes?: import('./services/shapeUtils').RequiredShape[];
  secretLootHexes?: SecretLootHex[];

  aiMode: 'none' | 'dummy' | 'basic';
  getTutorialHint?: (state: SessionState) => string | null;
  hooks: ScenarioHooks;
  creepingVoid?: {
    sourceQ: number;
    sourceR: number;
    intervalMs?: number;
  };
}

export interface EntropyState {
  current: number;
  max: number;
  threshold: number;
}

export interface DefenseState {
  isDefenseMode: boolean; // запущен ли режим осады базы
  coreHealth: number;     // здоровье ядра (0 - 100)
  maxCoreHealth: number;  // максимальное здоровье
  survivalTimer: number;   // оставшееся время в секундах / ходах
  currentWave: number;    // текущая волна
  maxWaves: number;       // максимум волн
  waveSpawnTimer?: number; 
  totalEliminated?: number;
}

export interface PuzzleState {
  miniMonumentsActive: number; // количество активированных мини-монументов
  isSchemeRevealed: boolean;   // раскрыта ли схема фигуры
  targetShapeId?: string;      // ID целевой фигуры
}

export interface MeteorState {
  id: string;
  q: number;
  r: number;
  warnTicksRemaining: number;
  maxWarnTicks: number;
}

export interface SessionState {
  stateVersion: number;
  sessionId: string; 
  sessionStartTime: number; 
  lastPlayerActionTime?: number; 
  
  winCondition: WinCondition | null;
  activeLevelConfig?: LevelConfig; 
  secretMonumentCoord?: HexCoord;
  monumentRequirements?: string[];
  monumentAlternatives?: string[];          // baseIds for ONE_OF slot (level 2.5)
  monumentRevealedSlots?: boolean[];        // which monument slots have been revealed by visiting obelisks
  activatedMiniMonuments?: string[];        // list of keys of activated mini monuments (obelisks)
  secretLootHexes?: SecretLootHex[];        // pre-determined exact coordinates/levels for key items
  activeLootPings?: Record<string, number>; // Для Мини-монументов
  minedHexes?: Record<number, number>;
  restoredHexesCount?: number;
  stableStartTime?: number;

  difficulty: Difficulty;
  grid: Record<string, Hex>; 
  player: Entity;
  bots: Entity[]; 
  currentTurn: number;
  gameStatus: 'BRIEFING' | 'PLAYING' | 'VICTORY' | 'DEFEAT';
  messageLog: LogEntry[]; 
  botActivityLog: BotLogEntry[]; 
  fullBotHistory: BotLogEntry[];
  lastBotActionTime: number; 
  isPlayerGrowing: boolean; 
  playerGrowthIntent: 'RECOVER' | 'UPGRADE' | 'DIG' | 'TURRET' | null; 
  growingBotIds: string[]; 
  effects: FloatingText[]; 
  language: Language; 
  
  totalMinedMaterial?: number;
  totalGoldEarned?: number;
  portalActive?: boolean;
  evacuationActive?: boolean;
  evacuationCompletionTime?: number;
  completedShapeCoords?: HexCoord[];
  portalHex?: HexCoord | null;

  entropy: EntropyState;
  activePoi: string | null;
  outgoingEvents: GameEvent[];
  campaignUpgrades?: CampaignUpgrades;

  defense?: DefenseState;
  puzzle?: PuzzleState;
  activeMeteors?: MeteorState[];
  lastMeteorTick?: number;
  creepingVoid?: {
    lastInfectTime: number;
    infectedHexes: Record<string, { currentLevel: number; maxLevel: number; structureType?: any; durability?: number }>;
    sourceRestored: boolean;
  };
}

export interface GameState {
  uiState: UIState;
  introNextState: UIState;
  deviceType: DeviceType; 
  user: UserProfile | null;
  toast: ToastMessage | null;
  pendingConfirmation: PendingConfirmation | null;
  
  leaderboard: LeaderboardEntry[];
  campaignProgress: number; 
  levelsModeProgress: number;
  skillPoints: number;
  campaignUpgrades: CampaignUpgrades;
  campaignMode: 'STORY' | 'LEVELS';
  
  collectedHexes: Record<number, number>;
  minedInSessionHexes: Record<number, number>;
  totalMinedMaterial?: number;
  totalGoldEarned?: number;
  storyMap: Record<string, number>;
  savedSiegeMap: Record<string, number>;
  unlockedBlueprintIndices: number[];
  claimedLevelRewards?: string[];

  hasActiveSession: boolean;
  isMusicMuted: boolean;
  isSfxMuted: boolean;
  language: Language;
  
  voidDialogTarget: HexCoord | null; 
  monumentDialogState: {
      isOpen: boolean;
      slots: (Item | null)[]; 
  };
  miniMonumentDialogState: {
      isOpen: boolean;
      hint?: string;
  };

  lastVisualEvent?: { type: string; time: number };
  isCampaignLoading: boolean;
  loadingLevelId: string | null;
  isLiteMode?: boolean;
}

// --- ACTION TYPES ---
export type MoveAction = { type: 'MOVE'; path: { q: number; r: number }[]; stateVersion?: number };
export type UpgradeAction = { type: 'UPGRADE'; coord: { q: number; r: number }; intent?: 'UPGRADE' | 'RECOVER' | 'DIG'; upgradeType?: 'DEFAULT' | 'BARRIER' | 'MINE' | 'CAPITAL'; stateVersion?: number };
export type DigAction = { type: 'DIG'; coord: { q: number; r: number }; stateVersion?: number };
export type WaitAction = { type: 'WAIT'; stateVersion?: number };
export type RechargeAction = { type: 'RECHARGE_MOVE'; stateVersion?: number };
export type DestroyItemAction = { type: 'DESTROY_ITEM'; itemId: string; stateVersion?: number };
export type RestoreHexAction = { type: 'RESTORE_HEX'; coord: HexCoord; itemId: string; stateVersion?: number };
export type ActivateMonumentAction = { type: 'ACTIVATE_MONUMENT'; itemIds: string[]; stateVersion?: number };
export type ActivateMiniMonumentAction = { type: 'ACTIVATE_MINI_MONUMENT'; entityId: string; miniMonumentHexKey: string; stateVersion?: number }; // НОВОЕ ДЕЙСТВИЕ
export type EquipItemAction = { type: 'EQUIP_ITEM'; itemId: string; stateVersion?: number };
export type UnequipItemAction = { type: 'UNEQUIP_ITEM'; slot: string; stateVersion?: number };
export type ActivatePortalAction = { type: 'ACTIVATE_PORTAL'; stateVersion?: number };

export type BotAction = MoveAction | UpgradeAction | DigAction | WaitAction | RechargeAction;
export type GameAction = BotAction | RechargeAction | DestroyItemAction | RestoreHexAction | ActivateMonumentAction | ActivateMiniMonumentAction | EquipItemAction | UnequipItemAction | ActivatePortalAction;

export interface PathResult {
    path: HexCoord[] | null;
    reason?: string;
}

export interface ValidationResult {
    ok: boolean;
    reason?: string;
}

export interface CampaignUpgrades {
  inventorySlots: number;
  startingEnergy: number;
  startingMoves: number;
  startingGold: number;
  startingMaterials: number;
  maxMaterials: number;
  fuelEfficiency: number;
  scanRadius: number;
  fatigueResistance: number;
  growthAccelerator: number;
  foundationStrength: number;
  economicMultiplier: number;
  diggerLuck: number;
  doubleDigChance: number;
  reserveCapacitor: number;
  turboRecharge: number;
  entropyResistance: number;
  restorationMaster: number;
  contrastHighlighting: number;
}