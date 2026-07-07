
// Game Configuration and Constants

export const GAME_CONFIG = {
  HEX_SIZE: 35,
  INITIAL_MOVES: 0, // Restored from 0
  INITIAL_COINS: 0, // Restored from 0
  EXCHANGE_RATE_COINS_PER_MOVE: 5, 
  BOT_ACTION_INTERVAL_MS: 1000,
  L1_HEX_MAX_DURABILITY: 6, // Explicitly set to 6 as requested
  
  // High Level Recovery Logic
  HIGH_LEVEL_RECOVERY_THRESHOLD: 1, // Level 4+ triggers advanced mechanics
  RECOVERY_COOLDOWN_MS: 15000,      // 15 Seconds cooldown
  MAX_RECOVERY_POINTS: 3,           // Max uses before degradation
  
  // Loot System
  MAX_INVENTORY_SIZE: 5, // Updated from 3 to 5 for new UI layout

  // Movement & Animation Speeds
  // Tuned for responsive, snappy and completely stutter-free transitions.
  // The animation finishes safely within 350ms, before the next logic step registers at 380ms.
  MOVEMENT_ANIMATION_DURATION: 0.35, // Seconds (Visual Tween)
  MOVEMENT_LOGIC_INTERVAL_MS: 380,  // Milliseconds (Logic Throttle) - Buffer prevents timing overlaps
  
  // Performance Limits
  MAX_FLOATING_TEXTS: 50, // Limit simultaneous floating numbers

  // Growth Time in TICKS (1 tick = 100ms). So 30 ticks = 3 seconds.
  // UPDATED: Income formula = 5 * Level^2
  // COSTS: Are 0 for levels as costs are handled via Material storage now (1 Material per upgrade).
  // Structures (Mine/Barrier/Capital) still have Credit costs.
  LEVELS: {
    0: { cost: 0,    growthTime: 30,  income: 5,   reqRank: 0 }, // Bumped from 1
    1: { cost: 0,    growthTime: 30,  income: 10,  reqRank: 0 }, // Bumped from 5  
    2: { cost: 0,    growthTime: 30,  income: 20,  reqRank: 1 },   
    3: { cost: 0,    growthTime: 30,  income: 40,  reqRank: 2 },   
    4: { cost: 0,    growthTime: 30,  income: 80,  reqRank: 3 },   
    5: { cost: 0,    growthTime: 30,  income: 125, reqRank: 4 },   
    6: { cost: 0,    growthTime: 30,  income: 180, reqRank: 5 },   
    7: { cost: 0,    growthTime: 30,  income: 245, reqRank: 6 },   
    8: { cost: 0,    growthTime: 30,  income: 320, reqRank: 7 },   
    9: { cost: 0,    growthTime: 30,  income: 405, reqRank: 8 },   
  } as Record<number, { cost: number, growthTime: number, income: number, reqRank: number }>
};

export const ENTROPY_CONFIG = {
  INITIAL_MAX: 100,
  THRESHOLD: 6,
  COST_ACTION_BASE: 0.1, // %
  COST_VOID_CREATION: 2.0, // %
  COST_RESTORE_FAIL: 1.0, // %
  GAIN_RESTORE_SUCCESS: 3.0, // %
  SHIFT_VOID_CHANCE: 0.1, // 10%
  SHIFT_COLLAPSE_CHANCE: 0.5, // 50%
  SHIFT_FILL_CHANCE: 0.5 // 50%
};

export const DIFFICULTY_SETTINGS = {
  EASY:   { queueSize: 1, maxStorage: 5 },
  MEDIUM: { queueSize: 2, maxStorage: 4 },
  HARD:   { queueSize: 3, maxStorage: 3 }
};

// Resource & Computation Guards
export const SAFETY_CONFIG = {
  MAX_LOG_SIZE: 30,             // Reduced to 30 for memory optimization
  MAX_HISTORY_SIZE: 3000,       // Strict limit on full history to prevent lag (approx 20-30 mins of play)
  MAX_PATH_LENGTH: 20,          
  MAX_SEARCH_ITERATIONS: 1000,  
  MAX_MOVEMENT_QUEUE: 25        
};

// Re-export specific constants for ease of use in UI components
export const HEX_SIZE = GAME_CONFIG.HEX_SIZE;
export const EXCHANGE_RATE_COINS_PER_MOVE = GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE;

export const BOT_CONFIG = {
    DESTROYER_SCAN_RADIUS: 2,
    DESTROYER_COOLDOWN_MS: 12000
};

export const getLevelConfig = (level: number) => {
  // Handle Negative Levels (Pits) - No Income currently
  if (level < 0) {
      return { cost: 0, growthTime: 30, income: 0, reqRank: 0 };
  }
  return GAME_CONFIG.LEVELS[level] || { 
    cost: 0, // Fallback cost 0
    growthTime: 30, // Default 3s 
    income: 5 * level * level, // Dynamic Formula fallback
    reqRank: level - 1 
  };
};
