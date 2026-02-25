// In a stricter setup, we would move shared types to a 'core' module.
export type HexCoord = { q: number; r: number; upgrade?: boolean; intent?: 'UPGRADE' | 'RECOVER' | 'DIG' };

// Read-only view of a Hex for the Bot (Architecture Requirement)
export interface HexView {
  id: string;
  q: number;
  r: number;
  currentLevel: number;
  maxLevel: number;
  // ДОБАВЛЕНО: MINI_MONUMENT
  structureType?: 'NONE' | 'BARRIER' | 'CAPITAL' | 'VOID' | 'MONUMENT' | 'MINE' | 'MINI_MONUMENT';
  ownerId?: string; 
}

// Full State Hex
export interface Hex extends HexView {
  progress: number;
  revealed: boolean;
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
  
  botRole?: 'BUILDER' | 'DIGGER' | 'AGGRESSOR' | 'SUPPORTER' | 'MINER' | 'DESTROYER';
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
  stockpileWaitTicks?: number;
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
  moves: number;
  recentUpgrades: string[]; 
  
  storage: number;
  maxStorage: number;

  inventory: Item[];
  maxInventorySize?: number; 

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
  | 'STATUS_APPLIED'
  | 'ENTROPY_SHIFT'; 

export interface GameEvent {
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

export type UIState = 'MENU' | 'GAME' | 'LEADERBOARD' | 'CAMPAIGN_MAP';
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
  winType: 'OR' | 'AND' | 'SUMMIT'; 
  isTutorial?: boolean;
  initialStorage?: number; 
  mapType?: 'FLAT' | 'CHAOTIC'; 
}

export interface LeaderboardEntry {
  nickname: string;
  avatarColor: string;
  headIndex: number;
  bodyIndex: number;
  avatarIcon?: string;
  maxCoins: number;
  maxLevel: number;
  timestamp: number;
  difficulty: Difficulty;
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
}

export interface ScenarioHooks {
  checkWinCondition?: (state: SessionState) => boolean;
  checkLossCondition?: (state: SessionState) => boolean;
  onBeforeAction?: (state: SessionState, action: GameAction) => ValidationResult | null;
  onAfterAction?: (state: SessionState) => void;
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

  // --- ИСПРАВЛЕНИЕ: МАССИВЫ КООРДИНАТ ДЛЯ БОТОВ ---
  botRoutes?: HexCoord[][]; // Маршруты патрулей
  botSpawnPoints?: HexCoord[]; // ФИКС: Явные точки спавна для ИИ!

  objectiveHexes?: ObjectiveHex[];          
  blueprints?: Blueprint[];                  
  monumentRecipe?: MonumentRecipe;           
  miniMonumentCoords?: HexCoord[];           
  preGeneratedLootHexes?: HexCoord[];        

  aiMode: 'none' | 'dummy' | 'basic';
  hooks: ScenarioHooks;
}

export interface EntropyState {
  current: number;
  max: number;
  threshold: number;
}

export interface SessionState {
  stateVersion: number;
  sessionId: string; 
  sessionStartTime: number; 
  
  winCondition: WinCondition | null;
  activeLevelConfig?: LevelConfig; 
  secretMonumentCoord?: HexCoord;
  monumentRequirements?: string[];
  activeLootPings?: Record<string, number>; // Для Мини-монументов

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
  playerGrowthIntent: 'RECOVER' | 'UPGRADE' | 'DIG' | null; 
  growingBotIds: string[]; 
  effects: FloatingText[]; 
  language: Language; 
  
  entropy: EntropyState;
  outgoingEvents: GameEvent[];
}

export interface GameState {
  uiState: UIState;
  deviceType: DeviceType; 
  user: UserProfile | null;
  toast: ToastMessage | null;
  pendingConfirmation: PendingConfirmation | null;
  
  leaderboard: LeaderboardEntry[];
  campaignProgress: number; 
  hasActiveSession: boolean;
  isMusicMuted: boolean;
  isSfxMuted: boolean;
  language: Language;
  
  voidDialogTarget: HexCoord | null; 
  monumentDialogState: {
      isOpen: boolean;
      slots: (Item | null)[]; 
  };

  lastVisualEvent?: { type: string; time: number };
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

export type BotAction = MoveAction | UpgradeAction | DigAction | WaitAction | RechargeAction;
export type GameAction = BotAction | RechargeAction | DestroyItemAction | RestoreHexAction | ActivateMonumentAction | ActivateMiniMonumentAction;

export interface ValidationResult {
    ok: boolean;
    reason?: string;
}