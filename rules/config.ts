
// Game Configuration and Constants

export const GAME_CONFIG = {
  HEX_SIZE: 35,
  INITIAL_MOVES: 0,
  INITIAL_COINS: 0,
  EXCHANGE_RATE_COINS_PER_MOVE: 5, 
  BOT_ACTION_INTERVAL_MS: 1000,
  L1_HEX_MAX_DURABILITY: 6, // Explicitly set to 6 as requested
  
  // Movement & Animation Speeds
  // Tuned for smoother transitions (0.5s = 40% slower than 0.3s)
  MOVEMENT_ANIMATION_DURATION: 0.5, // Seconds (Visual Tween)
  MOVEMENT_LOGIC_INTERVAL_MS: 500,  // Milliseconds (Logic Throttle - matches animation)

  // Growth Time in TICKS (1 tick = 100ms). So 30 ticks = 3 seconds.
  // UPDATED: Income formula = 5 * Level^2
  LEVELS: {
    0: { cost: 0,    growthTime: 30,  income: 1,   reqRank: 0 },
    1: { cost: 0,    growthTime: 30,  income: 5,   reqRank: 0 },   // Cost 0 to allow start from 0 resources
    2: { cost: 300,  growthTime: 30,  income: 20,  reqRank: 1 },   // 5 * 2^2 = 20
    3: { cost: 600,  growthTime: 30,  income: 45,  reqRank: 2 },   // 5 * 3^2 = 45
    4: { cost: 1000, growthTime: 30,  income: 80,  reqRank: 3 },   // 5 * 4^2 = 80
    5: { cost: 2000, growthTime: 30,  income: 125, reqRank: 4 },   // 5 * 5^2 = 125
    6: { cost: 4000, growthTime: 30,  income: 180, reqRank: 5 },   // 5 * 6^2 = 180
    7: { cost: 8000, growthTime: 30,  income: 245, reqRank: 6 },   // 5 * 7^2 = 245
    8: { cost: 15000, growthTime: 30, income: 320, reqRank: 7 },   // 5 * 8^2 = 320
    9: { cost: 30000, growthTime: 30, income: 405, reqRank: 8 },   // 5 * 9^2 = 405
  } as Record<number, { cost: number, growthTime: number, income: number, reqRank: number }>,

  STRUCTURES: {
    MINE: { cost: 50, incomePerTick: 1, maxHp: 20 },
    BARRIER: { cost: 20, hpPerLevel: 10 },
    CAPITAL: { cost: 500, defenseBonus: 2 }
  }
};

export const DIFFICULTY_SETTINGS = {
  EASY: { queueSize: 1 },
  MEDIUM: { queueSize: 2 },
  HARD: { queueSize: 3 }
};

// Resource & Computation Guards
export const SAFETY_CONFIG = {
  MAX_LOG_SIZE: 200,            // Increased for Level 1.4 Telemetry Tracking 
  MAX_PATH_LENGTH: 20,          
  MAX_SEARCH_ITERATIONS: 1000,  
  MAX_MOVEMENT_QUEUE: 25        
};

// Re-export specific constants for ease of use in UI components
export const HEX_SIZE = GAME_CONFIG.HEX_SIZE;
export const EXCHANGE_RATE_COINS_PER_MOVE = GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE;

export const getLevelConfig = (level: number) => {
  return GAME_CONFIG.LEVELS[level] || { 
    cost: level * 1000, 
    growthTime: 30, // Default 3s 
    income: 5 * level * level, // Dynamic Formula fallback
    reqRank: level - 1 
  };
};
