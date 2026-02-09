
// In a stricter setup, we would move shared types to a 'core' module.
export type HexCoord = { q: number; r: number; upgrade?: boolean; intent?: 'UPGRADE' | 'RECOVER' | 'DIG' };

// Read-only view of a Hex for the Bot (Architecture Requirement)
export interface HexView {
  id: string;
  q: number;
  r: number;
  currentLevel: number;
  maxLevel: number;
  structureType?: 'NONE' | 'BARRIER' | 'MINE' | 'CAPITAL' | 'VOID'; // Added VOID
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
  | 'HEX_COLLAPSE';

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
  winType: 'OR' | 'AND'; 
  isTutorial?: boolean;
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
  icon?: 'UP' | 'PLUS' | 'WARN' | 'COIN' | 'DOWN' | 'PICKAXE';
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
    wallType?: 'classic' | 'void_shatter'; 
    
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

// Authoritative state for a single game session, managed by GameEngine
export interface SessionState {
  stateVersion: number;
  sessionId: string; 
  sessionStartTime: number; 
  
  // Legacy WinCondition kept for Skirmish compatibility
  winCondition: WinCondition | null;
  
  // NEW: Campaign Configuration (Injected)
  activeLevelConfig?: LevelConfig; 

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
}

export type MoveAction = { type: 'MOVE'; path: { q: number; r: number }[]; stateVersion?: number };
export type UpgradeAction = { type: 'UPGRADE'; coord: { q: number; r: number }; intent?: 'UPGRADE' | 'RECOVER' | 'DIG'; upgradeType?: 'DEFAULT' | 'BARRIER' | 'MINE' | 'CAPITAL'; stateVersion?: number };
export type DigAction = { type: 'DIG'; coord: { q: number; r: number }; stateVersion?: number };
export type WaitAction = { type: 'WAIT'; stateVersion?: number };
export type RechargeAction = { type: 'RECHARGE_MOVE'; stateVersion?: number };

export type BotAction = MoveAction | UpgradeAction | DigAction | WaitAction | RechargeAction;
export type GameAction = BotAction | RechargeAction;

// Validates result of logic before execution (Architecture Requirement)
export interface ValidationResult {
    ok: boolean;
    reason?: string;
}
