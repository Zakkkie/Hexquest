import { Language } from '../types';

export interface Dictionary {
    MENU: {
        TITLE: string;
        SUBTITLE: string;
        CAMPAIGN: string;
        CAMPAIGN_SUB: string;
        SKIRMISH: string;
        SKIRMISH_SUB: string;
        RESUME: string;
        RESUME_SUB: string;
        LEADERBOARD: string;
        LEADERBOARD_SUB: string;
        END_SESSION: string;
        END_SESSION_SUB: string;
        EXIT: string;
        AUTH_GUEST: string;
        AUTH_LOGIN: string;
        AUTH_REGISTER: string;
        MODAL_LOGIN_TITLE: string;
        MODAL_REGISTER_TITLE: string;
        MODAL_GUEST_TITLE: string;
        MODAL_GUEST_SUBTITLE: string;
        MODAL_LOGIN_SUBTITLE: string;
        MODAL_REGISTER_SUBTITLE: string;
        BTN_LOGIN: string;
        BTN_REGISTER: string;
        BTN_GUEST: string;
        BTN_BACK_LOGIN: string;
        INPUT_NAME: string;
        INPUT_NAME_PH: string;
        INPUT_PASS: string;
        INPUT_PASS_PH: string;
        AUTH_AVATAR_COLOR: string;
        AUTH_INSIGNIA: string;
        UNIT_CONFIG: string;
        UNIT_HEAD: string;
        UNIT_HULL: string;
        UNIT_CHASSIS: string;
        CONFIG_TITLE: string;
        CONFIG_SUB: string;
        TERMINAL_ACTIVE: string;
        DIFF_EASY: string;
        DIFF_MEDIUM: string;
        DIFF_HARD: string;
        BTN_START: string;
        BTN_CANCEL: string;
        LOGOUT_CONFIRM: string;
        ABANDON_CONFIRM: string;
        BYPASS_SECURITY: string;
        
        // New Layout Keys
        COL_GOAL_TITLE: string;
        COL_GOAL_DESC: string;
        COL_SETUP_TITLE: string;
        COL_SETUP_DESC: string;
        LBL_DIFFICULTY: string;
        RULES_ENGAGEMENT: string;
        LBL_RIVALS: string;
        HIGH_CPU: string;
        CARGO_CAP: string;
        EST_REWARD: string;
        REWARD_STD: string;
        REWARD_MED: string;
        REWARD_HIGH: string;
        
        // Forecast / Details
        FORECAST_TITLE: string;
        STAT_MAP_SIZE: string;
        STAT_STORAGE: string;
        STAT_AI_BEHAVIOR: string;
        VAL_SMALL: string;
        VAL_MEDIUM: string;
        VAL_LARGE: string;
        VAL_PASSIVE: string;
        VAL_BALANCED: string;
        VAL_AGGRESSIVE: string;

        // Bot Labels
        BOT_LABEL_DUEL: string;
        BOT_LABEL_SKIRMISH: string;
        BOT_LABEL_WAR: string;
        BOT_LABEL_CHAOS: string;
        MODE_STORY: string;
        MODE_STORY_SUB: string;
        MODE_LEVELS: string;
        MODE_LEVELS_SUB: string;
    };
    CAMPAIGN_MAP: {
        HEADER_TITLE: string;
        HEADER_SUBTITLE: string;
        BTN_BACK: string;
        BADGE_CURRENT: string;
        BADGE_LOCKED: string;
        BADGE_DONE: string;
        MISSION_PREFIX: string;
        HOSTILES: string;
        ENCRYPTED: string;
        LVL_GRID_COORDINATES: string;
        LVL_START_RESOURCES: string;
        LVL_THREAT_LEVEL: string;
        LVL_THREAT_NONE: string;
        LVL_THREAT_BASIC: string;
        LVL_THREAT_HIGH: string;
        LVL_GOAL: string;
        LVL_STATUS_LOCKED: string;
        LVL_STATUS_READY: string;
        LVL_STATUS_COMPLETED: string;
    };
    HUD: {
        RANK: string;
        MATERIAL: string;
        CREDITS: string;
        MOVES: string;
        LEADERBOARD_TITLE: string;
        ABORT_TITLE: string;
        ABORT_DESC: string;
        BTN_CANCEL: string;
        BTN_CONFIRM: string;
        VICTORY: string;
        DEFEAT: string;
        MISSION_COMPLETE: string;
        MISSION_FAILED: string;
        WINNER: string;
        BTN_MENU: string;
        BTN_UPGRADES: string;
        BTN_NEXT: string;
        BTN_RETRY: string;
        BTN_VIEW_LEADERBOARD: string;
        TIME: string;
        BRIEFING_RIVAL: string;
        BRIEFING_TITLE: string;
        BRIEFING_TARGET_RANK: string;
        BRIEFING_TARGET_FUNDS: string;
        BRIEFING_BTN_START: string;
        BRIEFING_DESC_TEMPLATE: string; 
        BRIEFING_HINTS_TITLE: string; 
        BRIEFING_HINT_1: string; 
        BRIEFING_HINT_2: string; 
        BRIEFING_HINT_3: string; 
        HELP_RANK_DESC: string;
        HELP_RANK_GOAL: string;
        HELP_MAT_DESC: string;
        HELP_MAT_GOAL: string;
        HELP_COINS_DESC: string;
        HELP_COINS_GOAL: string;
        HELP_MOVES_DESC: string;
        HELP_MOVES_HINT: string;
        MINI_LB_COMMANDER: string;
        MINI_LB_CYCLE: string;
        MINI_LB_CREDITS: string;
        HINT_RANK: string;
        HINT_CREDITS: string;
        HINT_MOVES: string;
        HINT_CYCLE: string;
        BTN_CLAIM: string;
        BTN_REWARD: string;
        BTN_READY: string;
        SKIRMISH_OBJ: string;
        SKIRMISH_COND: string;
        TUT_1_1_TASK: string;
        TUT_1_1_COST: string;
        TUT_1_1_REWARD: string;
        TUT_1_1_GUIDE: string;
        TUT_1_1_COUNTER: string; 
        TUT_1_2_TASK: string;
        TUT_1_2_INTRO_TITLE: string;
        TUT_1_2_INTRO_DESC: string;
        TUT_1_2_LEGEND_SAFE: string;
        TUT_1_2_LEGEND_RISK: string;
        TUT_1_2_COUNTER: string;
        TUT_1_3_TASK: string;
        TUT_1_3_INTRO_TITLE: string;
        TUT_1_3_INTRO_DESC: string;
        TUT_1_3_REQ_LABEL: string;
        TUT_1_3_ERROR_STAIRCASE: string;
        TUT_1_3_COUNTER: string;
        TUT_1_4_TASK: string;
        TUT_1_4_INTRO_TITLE: string;
        TUT_1_4_INTRO_DESC: string;
        TUT_1_4_COUNTER: string;
        TUT_1_5_TASK: string;
        TUT_1_5_INTRO_TITLE: string;
        TUT_1_5_INTRO_DESC: string;
        TUT_1_5_TIMER_LABEL: string;
        TUT_1_5_COUNTER: string;
        TUT_1_6_TASK: string;
        TUT_1_6_INTRO_TITLE: string;
        TUT_1_6_INTRO_DESC: string;
        TUT_1_6_CYCLE_HINT: string;
        TUT_1_6_COUNTER: string;
        TUT_1_6_RIVAL: string;
        TUT_1_7_COUNTER: string;
        ERROR_RANK: string;
        
        VOID_TITLE: string;
        VOID_SUB: string;
        VOID_DESC: string;
        VOID_WARN: string;
        VOID_SELECT: string;
        VOID_EMPTY: string;
        VOID_BTN_SACRIFICE: string; 
        MONUMENT_TITLE: string;
        MONUMENT_SUB: string;
        MONUMENT_DESC_1: string;
        MONUMENT_DESC_2: string;
        MONUMENT_DESC_3: string;
        MONUMENT_KEYS: string;
        MONUMENT_BTN_ACTIVE: string;
        MONUMENT_BTN_INACTIVE: string;
        MONUMENT_EMPTY_INV: string;
        MONUMENT_REROLL: string;
        MONUMENT_REROLL_SLOT: string;
        MONUMENT_HINT_ANY: string;
        MONUMENT_HINT_RARITY: string;
        MONUMENT_HINT_ITEM: string;
        MONUMENT_HINT_ONE_OF: string;
        MONUMENT_HINT_UNREVEALED: string;
        MONUMENT_REQUIRED: string;
        MONUMENT_REQ_EASY: string;
        MONUMENT_REQ_MED: string;
        MONUMENT_REQ_HARD: string;
        EMPTY: string; 

        HELP_ENTROPY_TITLE: string;
        HELP_ENTROPY_DESC: string;
        HELP_ENTROPY_DRAIN: string;
        HELP_ENTROPY_SHIFT: string;
        HELP_ENTROPY_GAIN: string;
        MINI_LB_TITLE: string;
        MINI_LB_EMPTY: string;
    };
    POI: {
        CHECKPOINT: string;
    };
    TOAST: {
        RECHARGE_FAILED: string;
        TOO_FAR_VOID: string;
        PATH_BLOCKED: string;
        TOO_STEEP: string;
        IMPASSABLE: string;
        TOO_FAR: string;
        NEED_CREDITS: string;
        NEED_ENERGY: string;
        NEED_HP: string;
        CONFIRM_MOVE: string;
        GENERIC_ERROR: string;
        RESTORE_ERROR: string;
        WRONG_ITEM: string;
        SLOTS_FULL: string;
        ACTIVATION_FAILED: string;
        NO_HISTORY: string;
        MONUMENT_UPDATED: string;
        LOG_DOWNLOADED: string;
        STORAGE_FULL: string;
        TRAP_HIT: string;
        RIFT_DEFEAT: string;
        RIFT_VICTORY: string;
        SIMULATION_VICTORY?: string;
        SIMULATION_DEFEAT?: string;
        FOUND_CREDITS: string;
        FOUND_SUPPLIES: string;
        FOUND_SCRAP: string;
        NOTHING_HERE: string;
        WORLD_INIT_FAILED: string;
        CANNOT_DIG: string;
        GRADIENT_LOCK: string;
        UNSTABLE_DIG: string;
        EXCAVATED: string;
        CANNOT_BUILD_WATER: string;
        CANNOT_BUILD: string;
        UNSTABLE_BUILD: string;
        RAISED_TERRAIN: string;
        REST_SUPPLIES: string;
        REST_STARVING: string;
        RIFT_LOCKED: string;
        PATH_VOID: string;
        NOTHING_INTERACT: string;
        CAMPAIGN_COMPLETE: string;
        MISSING_ITEM: string;
        ITEM_EQUIPPED: string;
        BAG_FULL: string;
        ITEM_UNEQUIPPED: string;
        WRONG_SLOT: string;
        CANNOT_EQUIP: string;
        ENTITY_NOT_FOUND: string;
        ACTOR_LOCKED: string;
        ACTOR_MOVING: string;
        UNKNOWN_ACTION: string;
        CANNOT_AFFORD_MOVE: string;
        MUST_BE_ON_TARGET: string;
        INSUFFICIENT_FUNDS: string;
        ITEM_NOT_FOUND: string;
        NOT_A_VOID: string;
        STABILIZATION_FAILED: string;
        MONUMENT_STAND_REQUIRED: string;
        MONUMENT_WRONG_ITEMS: string;
        INDESTRUCTIBLE_MONUMENT: string;
        NEED_MATERIAL: string;
        ANCIENT_STRUCTURE: string;
        INVALID_HEX: string;
    };
    CAMPAIGN: {
        LEVEL_1_1_TITLE: string;
        LEVEL_1_1_DESC: string;
        LEVEL_1_2_TITLE: string;
        LEVEL_1_2_DESC: string;
        LEVEL_1_3_TITLE: string;
        LEVEL_1_3_DESC: string;
        LEVEL_1_4_TITLE: string;
        LEVEL_1_4_DESC: string;
        LEVEL_1_5_TITLE: string;
        LEVEL_1_5_DESC: string;
        LEVEL_1_6_TITLE: string;
        LEVEL_1_6_DESC: string;
        LEVEL_1_7_TITLE: string;
        LEVEL_1_7_DESC: string;
        LEVEL_1_8_TITLE: string;
        LEVEL_1_8_DESC: string;
        LEVEL_1_9_TITLE: string;
        LEVEL_1_9_DESC: string;
        LEVEL_1_10_TITLE: string;
        LEVEL_1_10_DESC: string;
        LEVEL_2_1_TITLE: string;
        LEVEL_2_1_DESC: string;
        LEVEL_2_2_TITLE: string;
        LEVEL_2_2_DESC: string;
        LEVEL_2_3_TITLE: string;
        LEVEL_2_3_DESC: string;
        LEVEL_2_4_TITLE: string;
        LEVEL_2_4_DESC: string;
        LEVEL_2_5_TITLE: string;
        LEVEL_2_5_DESC: string;
        LEVEL_2_6_TITLE: string;
        LEVEL_2_6_DESC: string;
        LEVEL_2_7_TITLE: string;
        LEVEL_2_7_DESC: string;
        LEVEL_2_8_TITLE: string;
        LEVEL_2_8_DESC: string;
        LEVEL_2_9_TITLE: string;
        LEVEL_2_9_DESC: string;
        LEVEL_2_10_TITLE: string;
        LEVEL_2_10_DESC: string;
        LEVEL_3_1_TITLE: string;
        LEVEL_3_1_DESC: string;
        LEVEL_3_2_TITLE: string;
        LEVEL_3_2_DESC: string;
        LEVEL_3_3_TITLE: string;
        LEVEL_3_3_DESC: string;
        LEVEL_3_4_TITLE: string;
        LEVEL_3_4_DESC: string;
        LEVEL_3_5_TITLE: string;
        LEVEL_3_5_DESC: string;
        LEVEL_3_6_TITLE: string;
        LEVEL_3_6_DESC: string;
        LEVEL_3_7_TITLE: string;
        LEVEL_3_7_DESC: string;
        LEVEL_3_8_TITLE: string;
        LEVEL_3_8_DESC: string;
        LEVEL_4_1_TITLE: string;
        LEVEL_4_1_DESC: string;
        LEVEL_4_2_TITLE: string;
        LEVEL_4_2_DESC: string;
        LEVEL_4_3_TITLE: string;
        LEVEL_4_3_DESC: string;
        LEVEL_4_4_TITLE: string;
        LEVEL_4_4_DESC: string;
        LEVEL_4_5_TITLE: string;
        LEVEL_4_5_DESC: string;
        LEVEL_4_6_TITLE: string;
        LEVEL_4_6_DESC: string;
        LEVEL_4_7_TITLE: string;
        LEVEL_4_7_DESC: string;
        LEVEL_4_8_TITLE: string;
        LEVEL_4_8_DESC: string;
    };
    TOOLTIP: {
        CURRENT_LOC: string;
        BLOCKED: string;
        NA: string;
        REQ: string;
        OCCUPIED: string;
        PLAYER: string;
    };
    TUTORIAL: {
        WELCOME_TITLE: string;
        WELCOME_DESC: string;
        BTN_START: string;
        CAMERA_DESC: string;
        CAMERA_HINT: string;
        MOVE_A: string;
        MOVE_B: string;
        MOVE_CENTER: string;
        ACQUIRE: string;
        ACQUIRE_DESC: string;
        UPGRADE_L2: string;
        UPGRADE_L2_DESC: string;
        FOUNDATION_TITLE: string;
        FOUNDATION_DESC: string;
        FOUNDATION_TASK: string;
        FINAL_TITLE: string;
        FINAL_DESC: string;
        NO_POINTS_TITLE: string;
        NO_POINTS_DESC: string;
        NO_POINTS_DESC_HINT: string;
        NO_POINTS_HINT: string;
    };
    LEADERBOARD: {
        TITLE: string;
        SUBTITLE: string;
        BTN_BACK: string;
        HEADER_COMM: string;
        HEADER_CREDITS: string;
        HEADER_RANK: string;
        EMPTY: string;
        LB_TERRAIN_DATA: string;
    };
    OVERWORLD: {
        EXPLORE: string;
        DIG: string;
        BUILD: string;
    };
}

export const TEXT: Record<Language, Dictionary> = {
    EN: {
        MENU: {
            TITLE: "HexQuest",
            SUBTITLE: "Strategic Expansion Protocol",
            CAMPAIGN: "New Game",
            CAMPAIGN_SUB: "Develop your space",
            SKIRMISH: "Battle",
            SKIRMISH_SUB: "Custom Conflict",
            RESUME: "Resume",
            RESUME_SUB: "Return to sector",
            LEADERBOARD: "Rankings",
            LEADERBOARD_SUB: "Global hall of fame",
            END_SESSION: "Abort",
            END_SESSION_SUB: "Close current sector",
            EXIT: "Exit",
            AUTH_GUEST: "Guest",
            AUTH_LOGIN: "Login",
            AUTH_REGISTER: "Sign Up",
            MODAL_LOGIN_TITLE: "Login",
            MODAL_REGISTER_TITLE: "New Commission",
            MODAL_GUEST_TITLE: "Guest Mode",
            MODAL_GUEST_SUBTITLE: "Restricted Access",
            MODAL_LOGIN_SUBTITLE: "Identify User",
            MODAL_REGISTER_SUBTITLE: "Create Credentials",
            BTN_LOGIN: "Authenticate",
            BTN_REGISTER: "Join Ranks",
            BTN_GUEST: "Play as Guest",
            BTN_BACK_LOGIN: "Back to Secure Login",
            INPUT_NAME: "Callsign",
            INPUT_NAME_PH: "Commander Name",
            INPUT_PASS: "Password",
            INPUT_PASS_PH: "Access Code",
            AUTH_AVATAR_COLOR: "Suit Color",
            AUTH_INSIGNIA: "Insignia",
            UNIT_CONFIG: "Unit Configuration",
            UNIT_HEAD: "Head",
            UNIT_HULL: "Hull",
            UNIT_CHASSIS: "Chassis",
            CONFIG_TITLE: "Battle Configuration",
            CONFIG_SUB: "Define mission parameters",
            TERMINAL_ACTIVE: "Terminal Active",
            DIFF_EASY: "Easy",
            DIFF_MEDIUM: "Medium",
            DIFF_HARD: "Hard",
            BTN_START: "Initiate Battle",
            BTN_CANCEL: "Cancel",
            LOGOUT_CONFIRM: "Logging out will end your session.",
            ABANDON_CONFIRM: "Abort mission? Progress will be lost.",
            BYPASS_SECURITY: "Bypass Security",
            
            COL_GOAL_TITLE: "Mission Objectives",
            COL_GOAL_DESC: "Select the victory criteria.",
            COL_SETUP_TITLE: "Simulation Settings",
            COL_SETUP_DESC: "Configure threats and difficulty.",
            LBL_DIFFICULTY: "Challenge Level",
            RULES_ENGAGEMENT: "Rules of Engagement",
            LBL_RIVALS: "Bots",
            HIGH_CPU: "HIGH CPU",
            CARGO_CAP: "Cargo Capacity",
            EST_REWARD: "Est. Reward",
            REWARD_STD: "Standard",
            REWARD_MED: "Medium",
            REWARD_HIGH: "High",

            FORECAST_TITLE: "Tactical Forecast",
            STAT_MAP_SIZE: "Map Radius",
            STAT_STORAGE: "Storage Cap",
            STAT_AI_BEHAVIOR: "AI Behavior",
            VAL_SMALL: "Compact",
            VAL_MEDIUM: "Standard",
            VAL_LARGE: "Expansive",
            VAL_PASSIVE: "Defensive",
            VAL_BALANCED: "Balanced",
            VAL_AGGRESSIVE: "Hostile",

            BOT_LABEL_DUEL: "DUEL",
            BOT_LABEL_SKIRMISH: "SKIRMISH",
            BOT_LABEL_WAR: "WAR",
            BOT_LABEL_CHAOS: "CHAOS",
            MODE_STORY: "Hexagon",
            MODE_STORY_SUB: "Figure Blueprints",
            MODE_LEVELS: "Ranked Missions",
            MODE_LEVELS_SUB: "Sequence 1.1 - 4.8"
        },
        CAMPAIGN_MAP: {
            HEADER_TITLE: "Campaign",
            HEADER_SUBTITLE: "Sector Operations Map",
            BTN_BACK: "Back",
            BADGE_CURRENT: "Current",
            BADGE_LOCKED: "Locked",
            BADGE_DONE: "Done",
            MISSION_PREFIX: "Mission",
            HOSTILES: "Hostiles Detected",
            ENCRYPTED: "ENCRYPTED",
            LVL_GRID_COORDINATES: "Sector ID",
            LVL_START_RESOURCES: "Initial Core",
            LVL_THREAT_LEVEL: "Threat Assessment",
            LVL_THREAT_NONE: "MINIMAL",
            LVL_THREAT_BASIC: "MODERATE",
            LVL_THREAT_HIGH: "HOSTILE",
            LVL_GOAL: "Directives",
            LVL_STATUS_LOCKED: "ACCESS DENIED",
            LVL_STATUS_READY: "READY",
            LVL_STATUS_COMPLETED: "SECURED"
        },
        HUD: {
            RANK: "Rank",
            MATERIAL: "Mat.",
            CREDITS: "Credits",
            MOVES: "Fuel",
            LEADERBOARD_TITLE: "Ranks",
            ABORT_TITLE: "Abort?",
            ABORT_DESC: "Close connection to sector?",
            BTN_CANCEL: "Cancel",
            BTN_CONFIRM: "Confirm",
            VICTORY: "VICTORY",
            DEFEAT: "DEFEAT",
            MISSION_COMPLETE: "Sector Secured.",
            MISSION_FAILED: "Operation Failed.",
            WINNER: "Winner",
            BTN_MENU: "Main Menu",
            BTN_UPGRADES: "Upgrades",
            BTN_NEXT: "Next Sector",
            BTN_RETRY: "Retry",
            BTN_VIEW_LEADERBOARD: "Leaderboard",
            TIME: "Time",
            BRIEFING_RIVAL: "Rival Presence",
            BRIEFING_TITLE: "TASK",
            BRIEFING_TARGET_RANK: "Target Rank",
            BRIEFING_TARGET_FUNDS: "Target Credits",
            BRIEFING_BTN_START: "DEPLOY UNIT",
            BRIEFING_DESC_TEMPLATE: "Target: Rank {0}, {1} Credits.",
            BRIEFING_HINTS_TITLE: "Tactical Advice",
            BRIEFING_HINT_1: "Move to neutral hexes to claim them.",
            BRIEFING_HINT_2: "Build a foundation before upgrading vertically.",
            BRIEFING_HINT_3: "Monitor your material storage.",
            HELP_RANK_DESC: "Your clearance level. Increased by building higher structures.",
            HELP_RANK_GOAL: "Goal: Reach Rank {0}",
            HELP_MAT_DESC: "Material is required to build. Dig ground to harvest.",
            HELP_MAT_GOAL: "Build Resource",
            HELP_COINS_DESC: "Currency for upgrades and emergency movement.",
            HELP_COINS_GOAL: "Goal: {0} Credits",
            HELP_MOVES_DESC: "Fuel for actions. Replenished by active operations.",
            HELP_MOVES_HINT: "Tip: High terrain costs more fuel.",
            MINI_LB_COMMANDER: "Unit",
            MINI_LB_CYCLE: "Rank",
            MINI_LB_CREDITS: "Credits",
            HINT_RANK: "Rank",
            HINT_CREDITS: "Credits",
            HINT_MOVES: "Fuel",
            HINT_CYCLE: "Cycle",
            BTN_CLAIM: "CLAIM",
            BTN_REWARD: "Reward: +Income",
            BTN_READY: "UNDERSTOOD",
            SKIRMISH_OBJ: "Objective",
            SKIRMISH_COND: "Win Conditions",
            TUT_1_1_TASK: "Capture 3 Sectors",
            TUT_1_1_COST: "Cost: 100",
            TUT_1_1_REWARD: "+5 Income",
            TUT_1_1_GUIDE: "Move to highlighted hexes.",
            TUT_1_1_COUNTER: "CAPTURED",
            TUT_1_2_TASK: "Reach Apex",
            TUT_1_2_INTRO_TITLE: "DANGER",
            TUT_1_2_INTRO_DESC: "Ground is unstable. Follow the safe path.",
            TUT_1_2_LEGEND_SAFE: "Stable",
            TUT_1_2_LEGEND_RISK: "Critical",
            TUT_1_2_COUNTER: "DISTANCE",
            TUT_1_3_TASK: "Build Level 2",
            TUT_1_3_INTRO_TITLE: "Foundation",
            TUT_1_3_INTRO_DESC: "Build supports before going higher.",
            TUT_1_3_REQ_LABEL: "Ready",
            TUT_1_3_ERROR_STAIRCASE: "UNSTABLE",
            TUT_1_3_COUNTER: "OPPORTS",
            TUT_1_4_TASK: "Reach Level 3",
            TUT_1_4_INTRO_TITLE: "Excavation",
            TUT_1_4_INTRO_DESC: "Dig mounds for material.",
            TUT_1_4_COUNTER: "LVL",
            TUT_1_5_TASK: "Emergency Run",
            TUT_1_5_INTRO_TITLE: "Oxygen Low",
            TUT_1_5_INTRO_DESC: "Collect 150 Credits fast!",
            TUT_1_5_TIMER_LABEL: "TIMER",
            TUT_1_5_COUNTER: "CREDITS",
            TUT_1_6_TASK: "Race for L4",
            TUT_1_6_INTRO_TITLE: "The Rival",
            TUT_1_6_INTRO_DESC: "Beat the Architect.",
            TUT_1_6_CYCLE_HINT: "Locked!",
            TUT_1_6_COUNTER: "RANK",
            TUT_1_6_RIVAL: "RIVAL",
            TUT_1_7_COUNTER: "DIGS",
            ERROR_RANK: "RANK TOO LOW",
            
            VOID_TITLE: "Sector Collapsed",
            VOID_SUB: "Void Stabilization",
            VOID_DESC: "This sector has destabilized. Insert matter from your inventory to attempt restoration to Level 0.",
            VOID_WARN: "Warning: Item will be consumed.",
            VOID_SELECT: "Select Matter Source",
            VOID_EMPTY: "No stability matter available.",
            VOID_BTN_SACRIFICE: "SACRIFICE",
            
            MONUMENT_TITLE: "Monument Activation",
            MONUMENT_SUB: "Key Authorization Required",
            MONUMENT_DESC_1: "Insert",
            MONUMENT_DESC_2: "3 Keys",
            MONUMENT_DESC_3: "to override the security protocol.",
            MONUMENT_KEYS: "Available Keys",
            MONUMENT_BTN_ACTIVE: "ACTIVATE",
            MONUMENT_BTN_INACTIVE: "INSERT KEYS",
            MONUMENT_EMPTY_INV: "No items available.",
            MONUMENT_REROLL: "Reroll (100 Cr)",
            MONUMENT_REROLL_SLOT: "Reset Slot (100 Cr)",
            MONUMENT_HINT_ANY: "Any item",
            MONUMENT_HINT_RARITY: "{0} item",
            MONUMENT_HINT_ITEM: "Specific: {0}",
            MONUMENT_HINT_ONE_OF: "One of multiple",
            MONUMENT_HINT_UNREVEALED: "Visit Obelisk to reveal",
            MONUMENT_REQUIRED: "Required: {0}",
            MONUMENT_REQ_EASY: "(Accepts ANY Rarity)",
            MONUMENT_REQ_MED: "(Requires: UNCOMMON+)",
            MONUMENT_REQ_HARD: "(Requires: RARE+)",
            EMPTY: "Empty.",

            HELP_ENTROPY_TITLE: "Reality Stability",
            HELP_ENTROPY_DESC: "Measures the structural integrity of the sector.",
            HELP_ENTROPY_DRAIN: "▼ DRAIN: Every Move, Build, and Dig action reduces stability. Digging deep and moving on Void-adjacent tiles accelerates this.",
            HELP_ENTROPY_SHIFT: "⚠ CRITICAL ZERO: An 'Entropy Shift' occurs. The map distorts: High ground collapses, pits fill, and voids may open randomly.",
            HELP_ENTROPY_GAIN: "▲ RESTORE: Successfully stabilizing a Void hex (using items) restores system stability.",
            MINI_LB_TITLE: "Local Sector Rankings",
            MINI_LB_EMPTY: "No active signals."
        },
        POI: {
            CHECKPOINT: "Checkpoint",
        },
        TOAST: {
            RECHARGE_FAILED: "Recharge Failed",
            TOO_FAR_VOID: "Too far to stabilize",
            PATH_VOID: "Path Blocked: Void",
            PATH_BLOCKED: "Path Blocked / Invalid",
            TOO_STEEP: "Too Steep!",
            IMPASSABLE: "Impassable Terrain",
            TOO_FAR: "Target Too Far",
            NEED_CREDITS: "Need {0} credits",
            NEED_ENERGY: "Need {0} energy",
            NEED_HP: "Need {0} health",
            CONFIRM_MOVE: "Click again ({0}cr)",
            GENERIC_ERROR: "Error",
            RESTORE_ERROR: "Restoration Error",
            WRONG_ITEM: "Wrong item type!",
            SLOTS_FULL: "Fill all slots!",
            ACTIVATION_FAILED: "Activation Failed",
            MONUMENT_UPDATED: "Requirements updated!",
            NO_HISTORY: "No history.",
            LOG_DOWNLOADED: "Log Saved",
            STORAGE_FULL: "Storage Full!",
            TRAP_HIT: "Triggered a trap! -{0} HP",
            RIFT_DEFEAT: "Defeated in the Rift! -{0} HP",
            RIFT_VICTORY: "Rift cleared! +{0} Credits",
            SIMULATION_VICTORY: "Simulation complete! +{0} Credits",
            SIMULATION_DEFEAT: "Simulation failed. Try again.",
            FOUND_CREDITS: "Found {0} Credits!",
            FOUND_SUPPLIES: "Found Supplies!",
            FOUND_SCRAP: "Found Scrap Material!",
            NOTHING_HERE: "There is nothing left here.",
            WORLD_INIT_FAILED: "Failed to initialize world",
            CANNOT_DIG: "Cannot dig here!",
            GRADIENT_LOCK: "Gradient Lock! Must stay above L{0}.",
            UNSTABLE_DIG: "UNSTABLE! Dig 2 neighbors to exactly level {0}.",
            EXCAVATED: "Excavated the ground.",
            CANNOT_BUILD_WATER: "Cannot build on water!",
            CANNOT_BUILD: "Cannot build here!",
            UNSTABLE_BUILD: "UNSTABLE! Need 2 neighbors at Level {0} to build higher.",
            RAISED_TERRAIN: "Raised the terrain.",
            REST_SUPPLIES: "Rested using Supplies",
            REST_STARVING: "Rested without supplies... Starving! (-10 HP)",
            RIFT_LOCKED: "Rift is locked. Complete previous series.",
            NOTHING_INTERACT: "Nothing to interact with here",
            CAMPAIGN_COMPLETE: "Campaign Completed! Congratulations!",
            MISSING_ITEM: "Missing required item: {0}",
            ITEM_EQUIPPED: "Item equipped",
            BAG_FULL: "Bag is full!",
            ITEM_UNEQUIPPED: "Item unequipped",
            WRONG_SLOT: "Wrong equipment slot!",
            CANNOT_EQUIP: "This item cannot be equipped.",
            ENTITY_NOT_FOUND: "Entity not found",
            ACTOR_LOCKED: "Actor is locked",
            ACTOR_MOVING: "Actor is moving",
            UNKNOWN_ACTION: "Unknown action",
            CANNOT_AFFORD_MOVE: "Cannot afford move",
            MUST_BE_ON_TARGET: "Must be on target hex",
            INSUFFICIENT_FUNDS: "Insufficient funds",
            ITEM_NOT_FOUND: "Item not found",
            NOT_A_VOID: "Target is not a void",
            STABILIZATION_FAILED: "Stabilization failed",
            MONUMENT_STAND_REQUIRED: "Must stand on monument",
            MONUMENT_WRONG_ITEMS: "Wrong items for monument",
            INDESTRUCTIBLE_MONUMENT: "Monument is indestructible",
            NEED_MATERIAL: "Need material",
            ANCIENT_STRUCTURE: "Ancient structure",
            INVALID_HEX: "Invalid hex",
        },
        CAMPAIGN: {
            LEVEL_1_1_TITLE: 'Sim 1.1: Height Limits',
            LEVEL_1_1_DESC: 'Learn to navigate the terrain. Ascend the ridge step-by-step and reach the portal.',
            LEVEL_1_2_TITLE: 'Sim 1.2: Harvesting Materials',
            LEVEL_1_2_DESC: 'Shed tile heights using the Red action to harvest constructor materials and reach the Capital.',
            LEVEL_1_3_TITLE: 'Sim 1.3: Gradient Lock',
            LEVEL_1_3_DESC: 'Lower the center tile using excavation. You must dig neighboring tiles first to bypass the gradient lock.',
            LEVEL_1_4_TITLE: 'Sim 1.4: Support Foundation',
            LEVEL_1_4_DESC: 'Raise the center tile height to Level 2. Ensure supporting neighbors are established first.',
            LEVEL_1_5_TITLE: 'Sim 1.5: Rigid Supports',
            LEVEL_1_5_DESC: 'Raise the central plate to Level 1 without external support structures.',
            LEVEL_1_6_TITLE: 'Sim 1.6: Energy Streams',
            LEVEL_1_6_DESC: 'Extract energy flows and accumulate 100 Credits using the Recovery action.',
            LEVEL_1_7_TITLE: 'Sim 1.7: Fatigue & Teleport',
            LEVEL_1_7_DESC: 'Sustain your move resource under extreme fatigue and reach the Capital.',
            LEVEL_1_8_TITLE: 'Sim 1.8: Deep Mining',
            LEVEL_1_8_DESC: 'Drill the center shaft down to Level -2. Dig adjacent supports first to stabilize the mine.',
            LEVEL_1_9_TITLE: 'Sim 1.9: Sealing Spacetime Voids',
            LEVEL_1_9_DESC: 'Heal the spacetime void using a Reality Patch from your inventory.',
            LEVEL_1_10_TITLE: 'Sim 1.10: Land Line Final',
            LEVEL_1_10_DESC: 'Establish a continuous straight line of 3 adjacent Level 2 tiles.',
            LEVEL_2_1_TITLE: 'Sim 2.1: The Monolith',
            LEVEL_2_1_DESC: 'Navigate the left ridge and step on the central Monolith to active it.',
            LEVEL_2_2_TITLE: 'Sim 2.2: Buried Secrets',
            LEVEL_2_2_DESC: 'Dig tunnels to find three items, insert them into the Monolith slabs, and activate it.',
            LEVEL_2_3_TITLE: 'Sim 2.3: Entropy Rising',
            LEVEL_2_3_DESC: 'Obtain engineering Rank 4 by raising a nearby tile to Level 4, then activate the Monolith.',
            LEVEL_2_4_TITLE: 'Sim 2.4: The First Signal',
            LEVEL_2_4_DESC: 'Activate the Obelisk to disable the firewall, then find the hidden key to activate the Monolith.',
            LEVEL_2_5_TITLE: 'Sim 2.5: Linear Matrix',
            LEVEL_2_5_DESC: 'Construct a straight Line of three adjacent Level 2+ tiles.',
            LEVEL_2_6_TITLE: 'Sim 2.6: Resonant Triangle',
            LEVEL_2_6_DESC: 'Construct a Triangle of three adjacent Level 2+ tiles while avoiding the Scout drone.',
            LEVEL_2_7_TITLE: 'Sim 2.7: Aether Diamond',
            LEVEL_2_7_DESC: 'Erect a Diamond of four adjacent Level 3+ tiles.',
            LEVEL_2_8_TITLE: 'Sim 2.8: Void Ring',
            LEVEL_2_8_DESC: 'Form a Ring of six Level 3+ tiles around the central black hole.',
            LEVEL_2_9_TITLE: 'Sim 2.9: Double Confluence',
            LEVEL_2_9_DESC: 'Construct both a Line and a Triangle of Level 3+ tiles while avoiding the Destroyer bot.',
            LEVEL_2_10_TITLE: 'Sim 2.10: Cosmic Alignment',
            LEVEL_2_10_DESC: 'Activate all three surrounding Obelisks, construct a surrounding Ring of Level 3+ tiles, retrieve the hidden keys, and activate the Monolith.',
            LEVEL_3_1_TITLE: 'Sim 3.1: First Inscription',
            LEVEL_3_1_DESC: 'Activate the Monument by uncovering the required slot icons via Obelisks.',
            LEVEL_3_2_TITLE: 'Sim 3.2: Twin Beacons',
            LEVEL_3_2_DESC: 'Unravel the requirements for the 2-slot Monument by scouting both Obelisks.',
            LEVEL_3_3_TITLE: 'Sim 3.3: Eclipse Depth',
            LEVEL_3_3_DESC: 'Activate the Monument using an Uncommon item as revealed by the Obelisk.',
            LEVEL_3_4_TITLE: 'Sim 3.4: Entropic Dispatch',
            LEVEL_3_4_DESC: 'Activate the 2-slot Monument rapidly before stability collapses.',
            LEVEL_3_5_TITLE: "Sim 3.5: Guardian's Keep",
            LEVEL_3_5_DESC: 'Activate the Monument with a Rare item while dodging the guardian patrol.',
            LEVEL_3_6_TITLE: 'Sim 3.6: Three Whispers',
            LEVEL_3_6_DESC: 'Activate the Monument with any of the three acceptable items shown by the Obelisks.',
            LEVEL_3_7_TITLE: 'Sim 3.7: Ascendancy',
            LEVEL_3_7_DESC: 'Activate the 2-slot Monument faster than your rival builds rank.',
            LEVEL_3_8_TITLE: 'Sim 3.8: The Archive',
            LEVEL_3_8_DESC: 'Navigate a complex maze, decipher three Obelisks, and activate the 3-slot Monument.',
            LEVEL_4_1_TITLE: 'Sim 4.1: Resonance Protocol',
            LEVEL_4_1_DESC: 'Create three different Level 2 hexes simultaneously.',
            LEVEL_4_2_TITLE: 'Sim 4.2: Mirror Maze',
            LEVEL_4_2_DESC: 'Conquer and hold both opposite critical nodes of the landscape.',
            LEVEL_4_3_TITLE: 'Sim 4.3: Recursion Engine',
            LEVEL_4_3_DESC: 'Elevate two different hexes to Level 3.',
            LEVEL_4_4_TITLE: 'Sim 4.4: Thermal Equilibrium',
            LEVEL_4_4_DESC: 'Elevate the central hex to Level 4 before heat buildup triggers a collapse.',
            LEVEL_4_5_TITLE: 'Sim 4.5: Convergence Point',
            LEVEL_4_5_DESC: 'Accomplish two of the three objectives before the rival agent arrives.',
            LEVEL_4_6_TITLE: 'Sim 4.6: Cascade Protocol',
            LEVEL_4_6_DESC: 'Form a cluster of Level 2 tiles, then raise one to trigger a massive Level 3 cascade.',
            LEVEL_4_7_TITLE: 'Sim 4.7: Duality Engine',
            LEVEL_4_7_DESC: 'Coordinate your building to hold four Level 3 tiles and two Level 4 tiles simultaneously.',
            LEVEL_4_8_TITLE: 'Sim 4.8: Omega Synthesis',
            LEVEL_4_8_DESC: 'Perform the final synthesis: accomplish all four primary objectives under high temperature limits.',
        },
        TOOLTIP: {
            CURRENT_LOC: "Location",
            BLOCKED: "BLOCKED",
            NA: "-",
            REQ: "REQ",
            OCCUPIED: "OCCUPIED",
            PLAYER: "UNIT"
        },
        TUTORIAL: {
            WELCOME_TITLE: "Training",
            WELCOME_DESC: "Reach Level 3. Expand and build.",
            BTN_START: "Start",
            CAMERA_DESC: "Camera",
            CAMERA_HINT: "Rotate using buttons below.",
            MOVE_A: "Click hex to walk.",
            MOVE_B: "Build L1 foundation.",
            MOVE_CENTER: "Upgrade to L2!",
            ACQUIRE: "Build",
            ACQUIRE_DESC: "Upgrade L0 to L1.",
            UPGRADE_L2: "Lvl 2",
            UPGRADE_L2_DESC: "Needs supports.",
            FOUNDATION_TITLE: "Base",
            FOUNDATION_DESC: "Build 3x L2 hexes.",
            FOUNDATION_TASK: "3x L2",
            FINAL_TITLE: "Ready",
            FINAL_DESC: "Build L3 center.",
            NO_POINTS_TITLE: "Empty",
            NO_POINTS_DESC: "Dig to get mats.",
            NO_POINTS_DESC_HINT: "Find mounds.",
            NO_POINTS_HINT: "Dig here."
        },
        LEADERBOARD: {
            TITLE: "Hall of Fame",
            SUBTITLE: "Top Battle Records",
            BTN_BACK: "Menu",
            HEADER_COMM: "Unit",
            HEADER_CREDITS: "Coins",
            HEADER_RANK: "Rank",
            EMPTY: "Empty.",
            LB_TERRAIN_DATA: "Rank Spectrum (Terrain Data)"
        },
        OVERWORLD: {
            EXPLORE: "EXPLORE",
            DIG: "DIG",
            BUILD: "BUILD"
        }
    },
    RU: {
        MENU: {
            TITLE: "HexQuest",
            SUBTITLE: "Протокол Расширения",
            CAMPAIGN: "Новая игра",
            CAMPAIGN_SUB: "Развивай свое пространство",
            SKIRMISH: "Битва",
            SKIRMISH_SUB: "Настраиваемое сражение",
            RESUME: "В Игру",
            RESUME_SUB: "Вернуться в сектор",
            LEADERBOARD: "Рейтинг",
            LEADERBOARD_SUB: "Зал славы",
            END_SESSION: "Прервать",
            END_SESSION_SUB: "Закрыть сектор",
            EXIT: "Выход",
            AUTH_GUEST: "Гость",
            AUTH_LOGIN: "Вход",
            AUTH_REGISTER: "Регистрация",
            MODAL_LOGIN_TITLE: "Доступ",
            MODAL_REGISTER_TITLE: "Новый Контракт",
            MODAL_GUEST_TITLE: "Гостевой Режим",
            MODAL_GUEST_SUBTITLE: "Ограниченный Доступ",
            MODAL_LOGIN_SUBTITLE: "Идентификация",
            MODAL_REGISTER_SUBTITLE: "Создание Учетной Записи",
            BTN_LOGIN: "Войти",
            BTN_REGISTER: "Создать",
            BTN_GUEST: "Играть как Гость",
            BTN_BACK_LOGIN: "Вернуться ко входу",
            INPUT_NAME: "Позывной",
            INPUT_NAME_PH: "Имя Командира",
            INPUT_PASS: "Пароль",
            INPUT_PASS_PH: "Код Доступа",
            AUTH_AVATAR_COLOR: "Цвет Снаряжения",
            AUTH_INSIGNIA: "Эмблема",
            UNIT_CONFIG: "Конфигурация Юнита",
            UNIT_HEAD: "Голова",
            UNIT_HULL: "Корпус",
            UNIT_CHASSIS: "Шасси",
            CONFIG_TITLE: "Настройка",
            CONFIG_SUB: "Параметры симуляции",
            TERMINAL_ACTIVE: "ТЕРМИНАЛ АКТИВЕН",
            DIFF_EASY: "Легкий",
            DIFF_MEDIUM: "Средний",
            DIFF_HARD: "Сложный",
            BTN_START: "В БОЙ",
            BTN_CANCEL: "Отмена",
            LOGOUT_CONFIRM: "Выход завершит текущую сессию.",
            ABANDON_CONFIRM: "Прервать миссию? Прогресс будет потерян.",
            BYPASS_SECURITY: "Обход Защиты",
            
            COL_GOAL_TITLE: "Цели",
            COL_GOAL_DESC: "Выберите условия победы.",
            COL_SETUP_TITLE: "Параметры",
            COL_SETUP_DESC: "Сложность и враждебность.",
            LBL_DIFFICULTY: "Сложность",
            RULES_ENGAGEMENT: "Правила Боя",
            LBL_RIVALS: "Боты",
            HIGH_CPU: "НАГРУЗКА",
            CARGO_CAP: "Грузоподъемность",
            EST_REWARD: "Ожид. Награда",
            REWARD_STD: "Стандарт",
            REWARD_MED: "Средняя",
            REWARD_HIGH: "Высокая",

            FORECAST_TITLE: "Прогноз",
            STAT_MAP_SIZE: "Карта",
            STAT_STORAGE: "Склад",
            STAT_AI_BEHAVIOR: "ИИ",
            VAL_SMALL: "Компакт",
            VAL_MEDIUM: "Стандарт",
            VAL_LARGE: "Большая",
            VAL_PASSIVE: "Защита",
            VAL_BALANCED: "Баланс",
            VAL_AGGRESSIVE: "Агрессия",

            BOT_LABEL_DUEL: "ДУЭЛЬ",
            BOT_LABEL_SKIRMISH: "СТЫЧКА",
            BOT_LABEL_WAR: "ВОЙНА",
            BOT_LABEL_CHAOS: "ХАОС",
            MODE_STORY: "Гексагон",
            MODE_STORY_SUB: "Чертежи фигур",
            MODE_LEVELS: "Уровни",
            MODE_LEVELS_SUB: "Прогрессия 1.1 - 4.8"
        },
        CAMPAIGN_MAP: {
            HEADER_TITLE: "Кампания",
            HEADER_SUBTITLE: "Карта Сектора",
            BTN_BACK: "Назад",
            BADGE_CURRENT: "Текущая",
            BADGE_LOCKED: "Закрыто",
            BADGE_DONE: "Готово",
            MISSION_PREFIX: "Миссия",
            HOSTILES: "Враги",
            ENCRYPTED: "ЗАШИФРОВАНО",
            LVL_GRID_COORDINATES: "Код сектора",
            LVL_START_RESOURCES: "Базовый пакет",
            LVL_THREAT_LEVEL: "Уровень угрозы",
            LVL_THREAT_NONE: "МИНИМАЛЬНЫЙ",
            LVL_THREAT_BASIC: "УМЕРЕННЫЙ",
            LVL_THREAT_HIGH: "ВРАЖДЕБНЫЙ",
            LVL_GOAL: "Директивы",
            LVL_STATUS_LOCKED: "ДОСТУП ЗАКРЫТ",
            LVL_STATUS_READY: "ГОТОВ",
            LVL_STATUS_COMPLETED: "ВЫПОЛНЕНО"
        },
        HUD: {
            RANK: "Ранг",
            MATERIAL: "Мат.",
            CREDITS: "Кред.",
            MOVES: "Топливо",
            LEADERBOARD_TITLE: "Топ",
            ABORT_TITLE: "Выход?",
            ABORT_DESC: "Прервать связь с сектором?",
            BTN_CANCEL: "Отмена",
            BTN_CONFIRM: "ОК",
            VICTORY: "ПОБЕДА",
            DEFEAT: "ПОРАЖЕНИЕ",
            MISSION_COMPLETE: "Сектор захвачен.",
            MISSION_FAILED: "Операция провалена.",
            WINNER: "Лидер",
            BTN_MENU: "Меню",
            BTN_UPGRADES: "Узлы",
            BTN_NEXT: "Далее",
            BTN_RETRY: "Заново",
            BTN_VIEW_LEADERBOARD: "Рекорды",
            TIME: "Время",
            BRIEFING_RIVAL: "Враг",
            BRIEFING_TITLE: "ЗАДАЧА",
            BRIEFING_TARGET_RANK: "Ранг",
            BRIEFING_TARGET_FUNDS: "Кредиты",
            BRIEFING_BTN_START: "ВЫСАДКА",
            BRIEFING_DESC_TEMPLATE: "Цель: Ранг {0}, {1} Кредитов.",
            BRIEFING_HINTS_TITLE: "Тактика",
            BRIEFING_HINT_1: "Захватывайте нейтральные гексы.",
            BRIEFING_HINT_2: "Создавайте фундамент для роста вверх.",
            BRIEFING_HINT_3: "Следите за запасом материалов.",
            HELP_RANK_DESC: "Ваш уровень доступа. Растет при строительстве высоких этажей.",
            HELP_RANK_GOAL: "Цель: Достичь Ранга {0}",
            HELP_MAT_DESC: "Материалы нужны для стройки. Копайте землю, чтобы их добыть.",
            HELP_MAT_GOAL: "Ресурс для стройки",
            HELP_COINS_DESC: "Валюта для апгрейдов и экстренных перемещений.",
            HELP_COINS_GOAL: "Цель: {0} Кредитов",
            HELP_MOVES_DESC: "Энергия для действий. Восполняется при активных работах.",
            HELP_MOVES_HINT: "Совет: Горы требуют больше топлива.",
            MINI_LB_COMMANDER: "Юнит",
            MINI_LB_CYCLE: "Ранг",
            MINI_LB_CREDITS: "Кредиты",
            HINT_RANK: "Ранг",
            HINT_CREDITS: "Кредиты",
            HINT_MOVES: "Топливо",
            HINT_CYCLE: "Цикл",
            BTN_CLAIM: "ЗАХВАТ",
            BTN_REWARD: "Награда",
            BTN_READY: "ПОНЯТНО",
            SKIRMISH_OBJ: "Задача",
            SKIRMISH_COND: "Победа",
            TUT_1_1_TASK: "Захват x3",
            TUT_1_1_COST: "Цена: 100",
            TUT_1_1_REWARD: "+5 Доход",
            TUT_1_1_GUIDE: "Идите на подсвеченные клетки.",
            TUT_1_1_COUNTER: "ЗАХВАТ",
            TUT_1_2_TASK: "На Пик",
            TUT_1_2_INTRO_TITLE: "ОПАСНОСТЬ",
            TUT_1_2_INTRO_DESC: "Земля нестабильна. Идите по безопасному пути.",
            TUT_1_2_LEGEND_SAFE: "Надежно",
            TUT_1_2_LEGEND_RISK: "Опасно",
            TUT_1_2_COUNTER: "ПУТЬ",
            TUT_1_3_TASK: "Стройка L2",
            TUT_1_3_INTRO_TITLE: "Фундамент",
            TUT_1_3_INTRO_DESC: "Создайте опоры перед ростом вверх.",
            TUT_1_3_REQ_LABEL: "Готово",
            TUT_1_3_ERROR_STAIRCASE: "НЕУСТОЙЧИВО",
            TUT_1_3_COUNTER: "ОПОРЫ",
            TUT_1_4_TASK: "Ранг 3",
            TUT_1_4_INTRO_TITLE: "Раскопки",
            TUT_1_4_INTRO_DESC: "Копайте холмы для материалов.",
            TUT_1_4_COUNTER: "УР",
            TUT_1_5_TASK: "Эвакуация",
            TUT_1_5_INTRO_TITLE: "Мало Кислорода",
            TUT_1_5_INTRO_DESC: "Соберите 150 Кредитов быстро!",
            TUT_1_5_TIMER_LABEL: "ТАЙМЕР",
            TUT_1_5_COUNTER: "КРЕДИТЫ",
            TUT_1_6_TASK: "Гонка L4",
            TUT_1_6_INTRO_TITLE: "Соперник",
            TUT_1_6_INTRO_DESC: "Опередите Архитектора.",
            TUT_1_6_CYCLE_HINT: "Блок!",
            TUT_1_6_COUNTER: "РАНГ",
            TUT_1_6_RIVAL: "ВРАГ",
            TUT_1_7_COUNTER: "Вскопано",
            ERROR_RANK: "РАНГ МАЛ",
            
            VOID_TITLE: "Сбой Реальности",
            VOID_SUB: "Стабилизация",
            VOID_DESC: "Сектор дестабилизирован. Внесите материю для восстановления.",
            VOID_WARN: "Предмет исчезнет.",
            VOID_SELECT: "Источник",
            VOID_EMPTY: "Нет материи.",
            VOID_BTN_SACRIFICE: "ЖЕРТВА",
            
            MONUMENT_TITLE: "Активация",
            MONUMENT_SUB: "Нужен Ключ",
            MONUMENT_DESC_1: "Вставьте",
            MONUMENT_DESC_2: "3 Ключа",
            MONUMENT_DESC_3: "для обхода протокола безопасности.",
            MONUMENT_KEYS: "Доступные Ключи",
            MONUMENT_BTN_ACTIVE: "АКТИВАЦИЯ",
            MONUMENT_BTN_INACTIVE: "ТРЕБУЮТСЯ КЛЮЧИ",
            MONUMENT_EMPTY_INV: "В инвентаре пусто.",
            MONUMENT_REROLL: "Обновить (100 Кр)",
            MONUMENT_REROLL_SLOT: "Сброс слота (100 Кр)",
            MONUMENT_HINT_ANY: "Любой предмет",
            MONUMENT_HINT_RARITY: "{0} предмет",
            MONUMENT_HINT_ITEM: "Нужен предмет: {0}",
            MONUMENT_HINT_ONE_OF: "Один из списка",
            MONUMENT_HINT_UNREVEALED: "Нужен Обелиск для расшифровки",
            MONUMENT_REQUIRED: "Требуется: {0}",
            MONUMENT_REQ_EASY: "(Любые)",
            MONUMENT_REQ_MED: "(Необычные+)",
            MONUMENT_REQ_HARD: "(Редкие+)",
            EMPTY: "Пусто.",

            HELP_ENTROPY_TITLE: "Стабильность",
            HELP_ENTROPY_DESC: "Показатель структурной целостности сектора.",
            HELP_ENTROPY_DRAIN: "▼ ИСТОЩЕНИЕ: Любое действие (Ход, Стройка, Раскопки) снижает стабильность.",
            HELP_ENTROPY_SHIFT: "⚠ СДВИГ РЕАЛЬНОСТИ: При 0 происходит 'Сдвиг'. Ландшафт искажается: Горы рушатся, ямы заполняются, открываются Разломы.",
            HELP_ENTROPY_GAIN: "▲ ВОССТАНОВЛЕНИЕ: Успешная стабилизация Разлома (предметом) восстанавливает систему.",
            MINI_LB_TITLE: "Локальный Рейтинг",
            MINI_LB_EMPTY: "Нет сигналов."
        },
        POI: {
            CHECKPOINT: "Блокпост",
        },
        TOAST: {
            RECHARGE_FAILED: "Сбой Перезарядки",
            TOO_FAR_VOID: "Слишком далеко",
            PATH_VOID: "Путь заблокирован: Пустота",
            PATH_BLOCKED: "Путь Заблокирован",
            TOO_STEEP: "Слишком круто!",
            IMPASSABLE: "Непроходимая местность",
            TOO_FAR: "Слишком далеко",
            NEED_CREDITS: "Требуется {0} кред.",
            NEED_ENERGY: "Нужно {0} энергии",
            NEED_HP: "Нужно {0} здоровья",
            CONFIRM_MOVE: "Нажмите для подтверждения ({0} кред.)",
            GENERIC_ERROR: "Ошибка",
            RESTORE_ERROR: "Ошибка Восстановления",
            WRONG_ITEM: "Неверный предмет!",
            SLOTS_FULL: "Заполните все слоты!",
            ACTIVATION_FAILED: "Сбой Активации",
            MONUMENT_UPDATED: "Требования обновлены!",
            NO_HISTORY: "История пуста.",
            LOG_DOWNLOADED: "Журнал сохранен",
            STORAGE_FULL: "Склад заполнен!",
            TRAP_HIT: "Активирована ловушка! -{0} ОЗ",
            RIFT_DEFEAT: "Поражение в Разломе! -{0} ОЗ",
            RIFT_VICTORY: "Разлом зачищен! +{0} Кредитов",
            SIMULATION_VICTORY: "Симуляция завершена! +{0} Кредитов",
            SIMULATION_DEFEAT: "Симуляция провалена. Попробуйте снова.",
            FOUND_CREDITS: "Найдено {0} Кредитов!",
            FOUND_SUPPLIES: "Найдены припасы!",
            FOUND_SCRAP: "Найден кусок материала!",
            NOTHING_HERE: "Здесь больше ничего нет.",
            WORLD_INIT_FAILED: "Не удалось инициализировать мир",
            CANNOT_DIG: "Здесь нельзя копать!",
            GRADIENT_LOCK: "Замок градиента! Должен быть выше L{0}.",
            UNSTABLE_DIG: "НЕСТАБИЛЬНО! Прокопайте 2 соседей ровно до уровня {0}.",
            EXCAVATED: "Почва раскопана.",
            CANNOT_BUILD_WATER: "Нельзя строить на воде!",
            CANNOT_BUILD: "Здесь нельзя строить!",
            UNSTABLE_BUILD: "НЕСТАБИЛЬНО! Нужно 2 соседа на уровне {0}, чтобы строить выше.",
            RAISED_TERRAIN: "Высота увеличена.",
            REST_SUPPLIES: "Отдых с использованием припасов",
            REST_STARVING: "Отдых без припасов... Голодание! (-10 ОЗ)",
            RIFT_LOCKED: "Разлом заблокирован. Завершите предыдущую серию.",
            NOTHING_INTERACT: "Не с чем взаимодействовать здесь",
            CAMPAIGN_COMPLETE: "Кампания завершена! Поздравляем!",
            MISSING_ITEM: "Отсутствует необходимый предмет: {0}",
            ITEM_EQUIPPED: "Предмет экипирован",
            BAG_FULL: "Сумка полна!",
            ITEM_UNEQUIPPED: "Предмет снят",
            WRONG_SLOT: "Неверный слот экипировки!",
            CANNOT_EQUIP: "Этот предмет нельзя экипировать.",
            ENTITY_NOT_FOUND: "Сущность не найдена",
            ACTOR_LOCKED: "Персонаж заблокирован",
            ACTOR_MOVING: "Персонаж движется",
            UNKNOWN_ACTION: "Неизвестное действие",
            CANNOT_AFFORD_MOVE: "Недостаточно ресурсов для перемещения",
            MUST_BE_ON_TARGET: "Необходимо находиться на целевом гексе",
            INSUFFICIENT_FUNDS: "Недостаточно средств",
            ITEM_NOT_FOUND: "Предмет не найден",
            NOT_A_VOID: "Цель не является пустотой",
            STABILIZATION_FAILED: "Сбой стабилизации",
            MONUMENT_STAND_REQUIRED: "Необходимо находиться на монументе",
            MONUMENT_WRONG_ITEMS: "Неверные предметы для монумента",
            INDESTRUCTIBLE_MONUMENT: "Монумент неразрушим",
            NEED_MATERIAL: "Необходим материал",
            ANCIENT_STRUCTURE: "Древнее строение",
            INVALID_HEX: "Неверный гекс",
        },
        CAMPAIGN: {
            LEVEL_1_1_TITLE: 'Сим 1.1: Пределы Высоты',
            LEVEL_1_1_DESC: 'Научитесь передвигаться по ландшафту. Шаг за шагом поднимитесь по хребту и доберитесь до портала.',
            LEVEL_1_2_TITLE: 'Сим 1.2: Сбор Материалов',
            LEVEL_1_2_DESC: 'Срезайте высоту плит с помощью раскопок для сбора материалов и доберитесь до Столицы.',
            LEVEL_1_3_TITLE: 'Сим 1.3: Замок Градиента',
            LEVEL_1_3_DESC: 'Срежьте центральный гекс до уровня L0. Сначала подготовьте соседние участки, чтобы снять замок градиента.',
            LEVEL_1_4_TITLE: 'Сим 1.4: Фундамент Опор',
            LEVEL_1_4_DESC: 'Поднимите высоту центрального гекса до уровня L2. Сначала подготовьте опорный фундамент вокруг.',
            LEVEL_1_5_TITLE: 'Сим 1.5: Жесткие Опоры',
            LEVEL_1_5_DESC: 'Поднимите центральный гекс до уровня L1 без внешних опорных конструкций.',
            LEVEL_1_6_TITLE: 'Сим 1.6: Потоки Энергии',
            LEVEL_1_6_DESC: 'Направьте потоки энергии и накопите 100 Кредитов с помощью функции восстановления.',
            LEVEL_1_7_TITLE: 'Сим 1.7: Усталость и Телепорт',
            LEVEL_1_7_DESC: 'Доберитесь до Столицы в условиях высокой усталости, используя энергию и преобразование кредитов.',
            LEVEL_1_8_TITLE: 'Сим 1.8: Глубокое Бурение',
            LEVEL_1_8_DESC: 'Пробурите центральную шахту до уровня -2. Сначала выкопайте соседние опоры для стабилизации шахты.',
            LEVEL_1_9_TITLE: 'Сим 1.9: Герметизация Пустот',
            LEVEL_1_9_DESC: 'Исцелите пространственно-временную пустоту с помощью Reality Patch из вашего инвентаря.',
            LEVEL_1_10_TITLE: 'Сим 1.10: Прямая Линия',
            LEVEL_1_10_DESC: 'Создайте непрерывную прямую линию из 3 смежных плит уровня 2.',
            LEVEL_2_1_TITLE: 'Сим 2.1: Монолит',
            LEVEL_2_1_DESC: 'Пройдите по левому хребту и встаньте на центральный Монолит, чтобы активировать его.',
            LEVEL_2_2_TITLE: 'Сим 2.2: Погребенные Секреты',
            LEVEL_2_2_DESC: 'Копайте туннели, чтобы найти три предмета, вставьте их в плиты Монолита и активируйте его.',
            LEVEL_2_3_TITLE: 'Сим 2.3: Растущая Энтропия',
            LEVEL_2_3_DESC: 'Получите инженерный Ранг 4, подняв соседнюю плиту до уровня 4, затем активируйте Монолит.',
            LEVEL_2_4_TITLE: 'Сим 2.4: Первый Сигнал',
            LEVEL_2_4_DESC: 'Активируйте Обелиск, чтобы отключить брандмауэр, затем найдите скрытый ключ для активации Монолита.',
            LEVEL_2_5_TITLE: 'Сим 2.5: Линейная Матрица',
            LEVEL_2_5_DESC: 'Постройте прямую линию из трех смежных плит уровня 2+.',
            LEVEL_2_6_TITLE: 'Сим 2.6: Резонансный Треугольник',
            LEVEL_2_6_DESC: 'Постройте Треугольник из трех смежных плит уровня 2+, уклоняясь от дрона-разведчика.',
            LEVEL_2_7_TITLE: 'Сим 2.7: Ромб Эфира',
            LEVEL_2_7_DESC: 'УРОВЕНЬ 3 И СВЯЗЬ:\n\nЗадача: Постройте Ромб из 4-х смежных гексов Уровня 3+ (DIAMOND_4).\n\nСовет: Уровень 3 требует Ранга 3. Помните, что для подъема плиты до Уровня 3 требуется обеспечить фундамент поддержки из смежных гексов Ур.2+!',
            LEVEL_2_8_TITLE: 'Сим 2.8: Кольцо Пустоты',
            LEVEL_2_8_DESC: 'ГЕРМЕТИЗАЦИЯ СИНГУЛЯРНОСТИ:\n\nЗадача: Постройте Кольцо из 6 гексов Уровня 3 (RING_6) вокруг центральной Пустоты (0,0).\n\nОграничение: Черная дыра пожирает 1% дополнительной Энтропии за каждый шаг. Действуйте экономно и выверенно.',
            LEVEL_2_9_TITLE: 'Сим 2.9: Двойная Динамика',
            LEVEL_2_9_DESC: 'МАТРИЦА ФИГУР И САБОТАЖ:\n\nЗадача: Постройте одновременно Линию (LINE_3) и Треугольник (TRIANGLE_3) Уровня 3+.\n\nОпасность: Опасный Бот-Саботажник десантировался на юге. Он целенаправленно идет крушить ваши высокие плиты Ур.3.',
            LEVEL_2_10_TITLE: 'Сим 2.10: Космическое Выравнивание',
            LEVEL_2_10_DESC: 'ТРИУМФ НЕБУЛЫ:\n\nИнструкции:\n1. Активируйте 3 Обелиска по краям (3,-3), (-3,3), (0,-3).\n2. Постройте Кольцо Уровня 3 (RING_6) вокруг центрального Монолита (0,0) для фокусировки векторов.\n3. Раскопайте тайники за ключами (Spent Fuel Cell и Reality Patch).\n4. Зайдите на (0,0) и АКТИВИРУЙТЕ Монолит!',
            LEVEL_3_1_TITLE: 'Сим 3.1: Первая Надпись',
            LEVEL_3_1_DESC: 'Древняя передача, высеченная в камне.\n\nЦЕЛЬ: Активировать Монумент на вершине.\n\nМеханика: Обелиски (колонны Ур.3) наносят силуэт нужного предмета в интерфейс Монумента. Посетите один, чтобы узнать, что нужно — или гадайте.\n\nВнимание: Произойдет два события стабильности. Второе завершит миссию.',
            LEVEL_3_2_TITLE: 'Сим 3.2: Близнецы-Маяки',
            LEVEL_3_2_DESC: 'Два обелиска по бокам от вершины. Каждый хранит половину надписи.\n\nЦЕЛЬ: Активировать Монумент с 2 слотами.\n\nПуть: Маршрут разделяется. Каждая ветвь ведет через один обелиск. Посетите оба для полной информации — но это стоит ходов.\n\nСтратегия: Сможете ли вы угадать второй слот по своему инвентарю?',
            LEVEL_3_3_TITLE: 'Сим 3.3: Глубина Затмения',
            LEVEL_3_3_DESC: 'Надпись требует качества, а не имени.\n\nЦЕЛЬ: Активировать Монумент НЕОБЫЧНЫМ предметом.\n\nОбелиск на вашем пути раскроет требование к редкости. Обычный предмет не подойдет.\n\nСтены пустоты закрывают оба фланга. Есть только один путь вперед.',
            LEVEL_3_4_TITLE: 'Сим 3.4: Энтропийная Депеша',
            LEVEL_3_4_DESC: 'Стабильность рушится. У вас мало времени.\n\nЦЕЛЬ: Активировать Монумент с 2 слотами до второго события.\n\nОпасность: Событие стабильности происходит каждые 10 действий. Два события — провал миссии.\n\nРешение: Два обелиска по бокам. Вы успеете только к одному. Выбирайте с умом — или доверьтесь интуиции.',
            LEVEL_3_5_TITLE: 'Сим 3.5: Цитадель Стража',
            LEVEL_3_5_DESC: 'Что-то охраняет надпись.\n\nЦЕЛЬ: Активировать Монумент РЕДКИМ предметом.\n\nУгроза: Бот-страж патрулирует перекресток. Обелиск покажет, какой РЕДКИЙ предмет нужен — но добраться до него опасно.\n\nСтратегия: Узнаете ли вы редкий предмет в своем инвентаре без посещения обелиска?',
            LEVEL_3_6_TITLE: 'Сим 3.6: Три Шепота',
            LEVEL_3_6_DESC: 'Монумент говорит тремя голосами — и все твердят одно.\n\nЦЕЛЬ: Активировать Монумент одним из трех возможных предметов.\n\nТри обелиска хранят одну надпись: слот принимает любой из 3 конкретных НЕОБЫЧНЫХ предметов. Найдите хотя бы один.\n\nЦентральный обелиск неизбежен. Остальные — лишь эхо.',
            LEVEL_3_7_TITLE: 'Сим 3.7: Восхождение',
            LEVEL_3_7_DESC: 'Другой агент рвется к вершине.\n\nЦЕЛЬ: Активировать Монумент с 2 слотами, пока энтропия не иссякла.\n\nКонкуренция: Соперник строит ранг, создавая давление. Он не активирует монумент — но он тратит ваше время.\n\nДва обелиска хранят надпись. Успеете ли вы к обоим за 29 действий?',
            LEVEL_3_8_TITLE: 'Сим 3.8: Архив',
            LEVEL_3_8_DESC: 'Последняя запись. Три надписи. Один монумент.\n\nЦЕЛЬ: Активировать Монумент с 3 слотами.\n\nТри обелиска хранят три тайны. Центральный неизбежен. Боковые требуют отклонения от пути — но без них вы будете гадать вслепую.\n\nВраждебный агент патрулирует верхние уровни. У вас 23 действия.',
            LEVEL_4_1_TITLE: 'Сим 4.1: Протокол Резонанса',
            LEVEL_4_1_DESC: 'ЦЕЛЬ: Создать "Кольцо Резонанса" - улучшить 3 РАЗНЫХ гекса до Уровня 2 одновременно.\n\nПравило: Ур.2 требует 2 соседа Ур.1. Планируйте порядок стройки.\nНачните с нуля — копайте материалы.',
            LEVEL_4_2_TITLE: 'Сим 4.2: Зеркальный Лабиринт',
            LEVEL_4_2_DESC: 'ЦЕЛЬ: Владеть ОБОИМИ гексами (-2,0) и (2,0) на Уровне 1+.\n\nПрямой путь на восток закрыт ПУСТОТОЙ. Ищите обход или жертвуйте предметы для восстановления.',
            LEVEL_4_3_TITLE: 'Сим 4.3: Рекурсивный Двигатель',
            LEVEL_4_3_DESC: 'ЦЕЛЬ: Построить 2 гекса до Уровня 3.\n\nКаждый уровень требует 2 соседа того же уровня для опоры.\nТщательно планируйте цепочку — стройте вширь перед тем как расти вверх.',
            LEVEL_4_4_TITLE: 'Сим 4.4: Термальное Равновесие',
            LEVEL_4_4_DESC: 'ЦЕЛЬ: Построить центральный гекс до Уровня 4.\n\nУгроза: Каждое действие дает +3 Энтропии. Старт: 70/100.\nПри 100 → коллапс сектора.\n\nУ вас ~10 действий. Каждый ход важен.\nЛестница готова: сфокусируйтесь на стройке, а не на пути.',
            LEVEL_4_5_TITLE: 'Сим 4.5: Точка Схождения',
            LEVEL_4_5_DESC: 'ЦЕЛЬ: Выполнить 2 из 3 задач РАНЬШЕ Соперника:\n  A) Владеть 6+ гексами Ур.2+\n  B) Набрать 200 Кредитов\n  C) Встать на Монумент\n\nСоперник прибудет через ~16 действий. Выберите 2 цели и действуйте.',
            LEVEL_4_6_TITLE: 'Сим 4.6: Протокол Каскада',
            LEVEL_4_6_DESC: 'ЦЕЛЬ: 8+ гексов Уровня 3.\n\nОсобое: Когда гекс достигает Ур.3, все соседние гексы Ур.2 МГНОВЕННО улучшаются до Ур.3!\n\nСтратегия: Создайте большой кластер Ур.2, затем запустите цепную реакцию.\n\nВнимание: Каскад БЕСПЛАТЕН, но каждый апгрейд тратит энтропию.',
            LEVEL_4_7_TITLE: 'Сим 4.7: Двигатель Дуальности',
            LEVEL_4_7_DESC: 'ЦЕЛЬ: Владеть 4 гексами Ур.3+ И 2 гексами Ур.4+ одновременно.\n\nВызов: Ур.4 требует Ранг 3 и соседей Ур.3.\nВы должны строить и вширь (4×Ур.3), и ввысь (2×Ур.4) с нуля.\n\nКопайте глубоко. Планируйте опоры.',
            LEVEL_4_8_TITLE: 'Сим 4.8: Омега Синтез',
            LEVEL_4_8_DESC: 'ВЫСШЕЕ ИСПЫТАНИЕ: Критическое Состояние.\n\nВыполните ВСЁ одновременно:\n  1. Владейте 3+ гексами Уровня 3+\n  2. Наберите 300+ Кредитов\n  3. Встаньте на Монумент с 2+ предметами\n  4. Удержите Энтропию ниже 60/100\n\nЭнтропия: +2 за ход. Старт: 40/100. Максимум ~30 действий.\n\nЭто финал. Используйте всё, чему научились.',
        },
        TOOLTIP: {
            CURRENT_LOC: "Позиция",
            BLOCKED: "БЛОК",
            NA: "-",
            REQ: "НАДО",
            OCCUPIED: "ЗАНЯТО",
            PLAYER: "ЮНИТ"
        },
        TUTORIAL: {
            WELCOME_TITLE: "Обучение",
            WELCOME_DESC: "Достигните 3 ранга. Расширяйтесь.",
            BTN_START: "Начать",
            CAMERA_DESC: "Камера",
            CAMERA_HINT: "Вращайте кнопками.",
            MOVE_A: "Клик для хода.",
            MOVE_B: "Стройте L1.",
            MOVE_CENTER: "Улучшайте до L2!",
            ACQUIRE: "Стройка",
            ACQUIRE_DESC: "L0 -> L1.",
            UPGRADE_L2: "Ур. 2",
            UPGRADE_L2_DESC: "Нужна опора.",
            FOUNDATION_TITLE: "База",
            FOUNDATION_DESC: "Постройте 3x L2.",
            FOUNDATION_TASK: "3x L2",
            FINAL_TITLE: "Готово",
            FINAL_DESC: "Центр в L3.",
            NO_POINTS_TITLE: "Пусто",
            NO_POINTS_DESC: "Копайте мат.",
            NO_POINTS_DESC_HINT: "Ищите холмы.",
            NO_POINTS_HINT: "Копать тут."
        },
        LEADERBOARD: {
            TITLE: "Зал Славы",
            SUBTITLE: "Рекорды",
            BTN_BACK: "Меню",
            HEADER_COMM: "Юнит",
            HEADER_CREDITS: "Счет",
            HEADER_RANK: "Ранг",
            EMPTY: "Пусто.",
            LB_TERRAIN_DATA: "Спектр Рангов (Ландшафт)"
        },
        OVERWORLD: {
            EXPLORE: "ИССЛЕДОВАТЬ",
            DIG: "КОПАТЬ",
            BUILD: "СТРОИТЬ"
        }
    }
};

// Programmatic 200 campaign levels dynamic translator
(() => {
    const SHAPE_TEMPLATES = [
        { type: 'LINE_3', titleEn: 'Linear Alignment', titleRu: 'Линейное выравнивание', descEn: '3-tile straight line.', descRu: 'Прямая линия из 3 плит.' },
        { type: 'TRIANGLE_3', titleEn: 'Triangular Delta', titleRu: 'Треугольная дельта', descEn: 'Stable 3-tile delta shape.', descRu: 'Стабильная 3-плиточная дельта.' },
        { type: 'SQUARE_4', titleEn: 'Cubic block', titleRu: 'Кубический блок', descEn: 'Symmetrical 4-tile square.', descRu: 'Симметричный квадрат из 4 плит.' },
        { type: 'CROSS_5', titleEn: 'Celestial cross', titleRu: 'Небесный крест', descEn: 'Beautiful 5-tile symmetric cross.', descRu: 'Красивый 5-плиточный симметричный крест.' },
        { type: 'RING_6', titleEn: 'Vortex Core Ring', titleRu: 'Вихревое кольцо', descEn: 'Hollow ring of 6 tiles.', descRu: 'Полое кольцо из 6 плит.' },
        { type: 'CROWN_5', titleEn: 'Imperial Crown', titleRu: 'Имперская корона', descEn: 'Symmetrical crown of 5 tiles.', descRu: 'Симметричная корона из 5 плит.' },
        { type: 'HEXAGON_7', titleEn: 'Symmetrical Honeycomb', titleRu: 'Симметричные соты', descEn: 'Solid 7-tile honeycomb core.', descRu: 'Прочный блок из 7 гексагональных сот.' },
        { type: 'HEART_6', titleEn: 'Symmetrical Heart', titleRu: 'Симметричное сердце', descEn: 'Symmetrical heart of 6 tiles.', descRu: 'Симметричное сердце из 6 плит.' },
        { type: 'STAR_7', titleEn: 'Stellar Nebula Star', titleRu: 'Звезда Туманности', descEn: '6-pronged star around central core.', descRu: 'Космический пульсар из 7 плит.' },
        { type: 'PYRAMID_6', titleEn: 'Symmetrical Ziggurat', titleRu: 'Симметричный зиккурат', descEn: 'Majestic 6-tile pyramid structure.', descRu: 'Величественный зиккурат из 6 плит.' }
    ];

    const enCampaign = TEXT.EN.CAMPAIGN as any;
    const ruCampaign = TEXT.RU.CAMPAIGN as any;

    for (let i = 1; i <= 200; i++) {
        const seriesId = Math.ceil(i / 10);
        const levelOffset = i % 10 === 0 ? 10 : i % 10;
        const key = `LEVEL_${seriesId}_${levelOffset}`;

        const shape = SHAPE_TEMPLATES[(i - 1) % SHAPE_TEMPLATES.length];
        const targetLevel = i < 20 ? 1 : Math.floor(i / 20);

        // Inject English
        if (!enCampaign[`${key}_TITLE`]) {
            enCampaign[`${key}_TITLE`] = `Sim ${seriesId}.${levelOffset}: ${shape.titleEn}`;
        }
        if (!enCampaign[`${key}_DESC`]) {
            enCampaign[`${key}_DESC`] = `SHAPE OBJECTIVE:\n\nConstruct a symmetrical ${shape.type} shape at height Level L${targetLevel}+.\n\nGuide: Drill elevated tiles for materials inside the deep mine, build side supporting plates, and construct the geometric target model to open the evacuation portal!`;
        }

        // Inject Russian
        if (!ruCampaign[`${key}_TITLE`]) {
            ruCampaign[`${key}_TITLE`] = `Сим ${seriesId}.${levelOffset}: ${shape.titleRu}`;
        }
        if (!ruCampaign[`${key}_DESC`]) {
            ruCampaign[`${key}_DESC`] = `ЦЕЛЬ ФИГУРЫ:\n\nПостройте симметричную форму ${shape.type} на уровне высоты L${targetLevel}+.\n\nИнструкция: Срезайте возвышенности красной кнопкой для добычи материалов, выстраивайте опорный фундамент плит и соберите нужную геометрию для запуска портала эвакуации!`;
        }
    }
})();