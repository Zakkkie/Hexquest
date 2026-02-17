
// In a stricter setup, we would move shared types to a 'core' module.
export type HexCoord = { q: number; r: number; upgrade?: boolean; intent?: 'UPGRADE' | 'RECOVER' | 'DIG' };

// Read-only view of a Hex for the Bot (Architecture Requirement)
export interface HexView {
  id: string;
  q: number;
  r: number;
  currentLevel: number;
  maxLevel: number;
  structureType?: 'NONE' | 'BARRIER' | 'MINE' | 'CAPITAL' | 'VOID' | 'MONUMENT'; // Added MONUMENT
  ownerId?: string; 
}

// Full State Hex
export interface Hex extends HexView {
  progress: number;
  revealed: boolean;
  structureHp?: number;
  durability?: number; // New: Lives for Level 1 hexes
  mineTimer?: number;
  trap?: { active: boolean, potency?: number } | null;
  attackPoint?: number;
  movePoint?: number;
  artifact?: { type: string };
  
  // V95 High Level Mechanics
  recoveryPoints?: number;    // Remaining uses for L4+ hexes (Max 3)
  lastRecoveryTime?: number;  // Timestamp of last use or upgrade
  
  // Loot History: Tracks negative levels where items/coins were already found
  lootedLevels?: number[];
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
    // Status Effects (Positive)
    | 'STATUS_GOLD_RUSH'
    | 'STATUS_FREE_BUILD'
    | 'STATUS_SCANNER_BUFF'
    | 'STATUS_ENTROPY_INVERSION'; // New: Actions add entropy instead of draining

export type NegativeEffectType =
    | 'LOSE_CREDITS'
    | 'LOSE_MOVES'
    | 'LOSE_RANK'
    | 'RESET_MATERIALS'
    | 'FULL_RESET'
    | 'AMNESIA' // Fog reset
    // Status Effects (Negative)
    | 'STATUS_FATIGUE'      // 2x Move Cost
    | 'STATUS_MINING_OFFLINE' // No passive income (not used in core loop yet, but tracked)
    | 'STATUS_TUNNEL_VISION'  // Fog radius 1
    | 'STATUS_GOLD_CURSE'     // No Loot
    | 'STATUS_SOIL_EATER'     // Upgrade destroys neighbor
    | 'STATUS_BREAKDOWN_RISK'; // Digging causes damage

export interface ActiveStatus {
    type: ItemEffectType | NegativeEffectType;
    label: string; // "Fatigue", "Gold Rush"
    expiresAt?: number; // Timestamp (Optional for permanent effects)
    icon?: string; // Icon identifier
    description?: string; // Detailed description for tooltip
}

export interface Item {
  id: string;
  baseId: string; // NEW: The type identifier (e.g. 'fuel_cell')
  rarity: ItemRarity;
  name: string; // Localized name
  description: string; // Visual description
  timestamp: number;
  
  // New props for specific mechanics
  visualType: string;
  
  // Positive (Success)
  effectType: ItemEffectType;
  effectValue: number;
  effectDescription: string; // "Recycle: +3 Moves"
  effectDuration?: number; // ms for status effects

  // Negative (Failure)
  negativeEffectType?: NegativeEffectType;
  negativeEffectValue?: number;
  negativeEffectLabel?: string;
  negativeEffectDuration?: number;
}

export type BotGoalType = 'EXPAND' | 'DEFEND' | 'ATTACK' | 'GROWTH' | 'IDLE' | 'PREPARE_CYCLE' | 'BUILD_SUPPORT' | 'GATHER_RESOURCES' | 'AGGRESSOR';

export interface BotGoal {
  type: BotGoalType;
  targetHexId?: string;
  targetQ?: number;
  targetR?: number;
  priority: number;
  expiresAt: number; 
}

export interface BotMemory {
  lastPlayerPos: HexCoord | null;
  currentGoal: BotGoal | null;
  
  // V50 Recursive Planning
  masterGoalId?: string | null; // The ultimate project center (Tower Peak / Pit Center)
  subGoalId?: string | null;    // The immediate dependency (Support hex)
  
  stuckCounter: number;
  lastActionFailed?: boolean;
  failReason?: string;
  scanTimer?: number; // V40 Variable Awareness
  
  // V20 Compatibility (Legacy)
  quarryKey?: string | null;    
  towerKey?: string | null;     

  // V21 Architect Memory
  mode?: 'GATHER' | 'BUILD' | 'AGGRESSOR';
  homeBase?: HexCoord;       // Coordinates of Tower Center
  quarrySite?: HexCoord;     // Coordinates of Quarry Center
  targetHexId?: string | null;      

  // V29 Settler Memory
  spawnTime?: number;
  migrationAngle?: number;

  // V48 Grand Architect
  projectFailCount?: number;
  
  // V60 Cooperative AI & Aggressor
  botRole?: 'BUILDER' | 'DIGGER' | 'AGGRESSOR' | 'SUPPORTER';
  sharedTowerKey?: string | null;   // Shared tower target for cooperative building
  sharedQuarryKey?: string | null;  // Shared quarry target for cooperative digging
  targetPlayerHexId?: string | null; // Target hex for aggressor to attack
  aggressorActive?: boolean;        // Whether aggressor mode is currently active
  aggressorStuckCount?: number;     // V61: Counter for aggressor being stuck
  
  // V71: Anti-stuck mechanism
  waitCounter?: number;             // Track consecutive WAIT actions
  lastActionType?: string;          // Track last action type for pattern detection
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
  
  // NEW: Material Storage Logic
  storage: number;
  maxStorage: number;

  // NEW: Loot Inventory
  inventory: Item[];
  maxInventorySize?: number; // Expandable inventory

  // NEW: Active Status Effects
  activeStatuses: ActiveStatus[];

  movementQueue: HexCoord[]; 
  
  memory?: BotMemory; 
  
  // Visual Customization
  avatarColor?: string; 
  headIndex: number;
  bodyIndex: number;

  attackTokens?: number;
  
  // Track if "Recovery" ability was used on the current hex
  recoveredCurrentHex?: boolean; 
  
  // Timestamp of the last physical move to throttle logic to animation speed
  lastMoveTime?: number; 

  // Timestamp of last AI action
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
  | 'ENTROPY_SHIFT'; // New

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

// UPDATED WIN CONDITION FOR CAMPAIGN
export interface WinCondition {
  levelId: number;
  targetLevel: number;
  targetCoins: number;
  label: string;
  botCount: number; 
  difficulty: Difficulty;
  queueSize: number;     
  winType: 'OR' | 'AND' | 'SUMMIT'; // Added SUMMIT type
  isTutorial?: boolean;
  initialStorage?: number; // Custom override for max storage capacity
  mapType?: 'FLAT' | 'CHAOTIC'; // New: Terrain generation preference
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

// MOVED FROM campaign/types.ts to resolve circular dependency
export interface ScenarioHooks {
  // Check for victory condition (called every tick/action)
  // Returns true if victory achieved
  checkWinCondition?: (state: SessionState) => boolean;

  // Check for loss condition (called every tick/action)
  // Returns true if defeat condition met
  checkLossCondition?: (state: SessionState) => boolean;
  
  // Validate a move before it happens or provide custom feedback
  // Returns a ValidationResult. If ok=false, the action is blocked with the reason.
  onBeforeAction?: (state: SessionState, action: GameAction) => ValidationResult | null;
  
  // Trigger events after an action
  onAfterAction?: (state: SessionState) => void;
}

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
    
    // NEW: Allow explicit hex definitions for puzzle levels
    customLayout?: Partial<Hex>[];
  };

  startState: {
    credits: number;
    moves: number;
    rank: number;
    materials?: number; // Added materials support
  };

  aiMode: 'none' | 'dummy' | 'basic';

  hooks: ScenarioHooks;
}

export interface EntropyState {
  current: number;
  max: number;
  threshold: number;
}

// Authoritative state for a single game session, managed by GameEngine
export interface SessionState {
  stateVersion: number;
  sessionId: string; 
  sessionStartTime: number; 
  
  // Legacy WinCondition kept for Skirmish compatibility
  winCondition: WinCondition | null;
  
  // NEW: Campaign Configuration (Injected)
  activeLevelConfig?: LevelConfig; 
  
  // NEW: Store the secret coordinate for the Monument
  secretMonumentCoord?: HexCoord;
  
  // NEW: Monument Recipe (Array of required baseIds)
  monumentRequirements?: string[];

  difficulty: Difficulty;
  grid: Record<string, Hex>; 
  player: Entity;
  bots: Entity[]; 
  currentTurn: number;
  gameStatus: 'BRIEFING' | 'PLAYING' | 'VICTORY' | 'DEFEAT';
  messageLog: LogEntry[]; 
  botActivityLog: BotLogEntry[]; // Circular buffer for UI
  fullBotHistory: BotLogEntry[]; // Full history for file export
  lastBotActionTime: number; 
  isPlayerGrowing: boolean; 
  playerGrowthIntent: 'RECOVER' | 'UPGRADE' | 'DIG' | null; 
  growingBotIds: string[]; 
  telemetry?: GameEvent[];
  effects: FloatingText[]; // Visual effects layer
  language: Language; // Language setting for session-level localization (e.g. hooks)
  
  // ENTROPY
  entropy: EntropyState;
  
  // Events queue from actions (to be consumed by renderer/store)
  outgoingEvents: GameEvent[];
}

// State for the entire application, managed by Zustand
export interface GameState {
  uiState: UIState;
  deviceType: DeviceType; // Added Device Type
  user: UserProfile | null;
  toast: ToastMessage | null;
  pendingConfirmation: PendingConfirmation | null;
  
  // Cross-session state
  leaderboard: LeaderboardEntry[];
  campaignProgress: number; // Highest unlocked level index (0-based)
  hasActiveSession: boolean;
  isMusicMuted: boolean;
  isSfxMuted: boolean;
  language: Language;
  
  // UI Dialog States
  voidDialogTarget: HexCoord | null; // Target hex for void restoration
  
  // Monument Activation State
  monumentDialogState: {
      isOpen: boolean;
      slots: (Item | null)[]; // Fixed size 3
  };

  // Triggers for View-level effects (Shake, Flash, etc)
  lastVisualEvent?: { type: string; time: number };
}

export type MoveAction = { type: 'MOVE'; path: { q: number; r: number }[]; stateVersion?: number };
export type UpgradeAction = { type: 'UPGRADE'; coord: { q: number; r: number }; intent?: 'UPGRADE' | 'RECOVER' | 'DIG'; upgradeType?: 'DEFAULT' | 'BARRIER' | 'MINE' | 'CAPITAL'; stateVersion?: number };
export type DigAction = { type: 'DIG'; coord: { q: number; r: number }; stateVersion?: number };
export type WaitAction = { type: 'WAIT'; stateVersion?: number };
export type RechargeAction = { type: 'RECHARGE_MOVE'; stateVersion?: number };
export type DestroyItemAction = { type: 'DESTROY_ITEM'; itemId: string; stateVersion?: number };
export type RestoreHexAction = { type: 'RESTORE_HEX'; coord: HexCoord; itemId: string; stateVersion?: number };
export type ActivateMonumentAction = { type: 'ACTIVATE_MONUMENT'; itemIds: string[]; stateVersion?: number };

export type BotAction = MoveAction | UpgradeAction | DigAction | WaitAction | RechargeAction;
export type GameAction = BotAction | RechargeAction | DestroyItemAction | RestoreHexAction | ActivateMonumentAction;

// Validates result of logic before execution (Architecture Requirement)
export interface ValidationResult {
    ok: boolean;
    reason?: string;
}
