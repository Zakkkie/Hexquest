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
        BAR: string;
        BANK: string;
        SHOP: string;
        WORKSHOP: string;
        CAPITOL: string;
        HUB: string;
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
        DEATH_OVERWORLD: string;
        STARVED_OVERWORLD: string;
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
        CITY_EXIT_SUCCESS: string;
        CITY_EXIT_DENIED: string;
        CANNOT_DIG: string;
        GRADIENT_LOCK: string;
        UNSTABLE_DIG: string;
        EXCAVATED: string;
        CANNOT_BUILD_WATER: string;
        CANNOT_BUILD: string;
        UNSTABLE_BUILD: string;
        RAISED_TERRAIN: string;
        REST_CITY: string;
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
            CAMPAIGN: "Campaign",
            CAMPAIGN_SUB: "Story & Training",
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
            MODE_STORY: "Story Mode",
            MODE_STORY_SUB: "Plot & Cities",
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
            BAR: "Bar",
            BANK: "Bank",
            SHOP: "Shop",
            WORKSHOP: "Workshop",
            CAPITOL: "Capitol",
            HUB: "Hub",
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
            DEATH_OVERWORLD: "You died in the overworld... Respawned in the city. Lost half credits.",
            CITY_EXIT_SUCCESS: "The path is open. Welcome to the wasteland.",
            CITY_EXIT_DENIED: "The checkpoint is closed. You need 6 tutorial marks to leave the city.",
            STARVED_OVERWORLD: "You starved to death... Respawned in the city. Lost half credits.",
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
            UNSTABLE_DIG: "UNSTABLE! Dig 2 neighbors to {0} or lower.",
            EXCAVATED: "Excavated the ground.",
            CANNOT_BUILD_WATER: "Cannot build on water!",
            CANNOT_BUILD: "Cannot build here!",
            UNSTABLE_BUILD: "UNSTABLE! Need 2 neighbors at Level {0} to build higher.",
            RAISED_TERRAIN: "Raised the terrain.",
            REST_CITY: "Rested safely in the city (-5 Credits)",
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
            LEVEL_1_1_TITLE: 'Sim 1.1: Expansion Protocol',
            LEVEL_1_1_DESC: 'Capture 3 NEW sectors.\n\nThe unit requires a foothold. Capture 3 adjacent Neutral Sectors (Lvl 0) to establish a perimeter.\n\nMove to a neutral hex and use UPGRADE (Amber Button) to build Level 1 (Cost: 1 Mat).\n\nMaterials are limited. Use them to expand.',
            LEVEL_1_2_TITLE: 'Sim 1.2: Solid Ground',
            LEVEL_1_2_DESC: 'Reach the Capital.\n\nA safe path (Durability 3) detected. Follow it through the void.\n\nEnvironment UNSTABLE (Durability 1). Stepping off the path causes immediate collapse and Rank loss.\n\nFail: Rank drops to 1.',
            LEVEL_1_3_TITLE: 'Sim 1.3: Structural Supports',
            LEVEL_1_3_DESC: 'Upgrade Center to Lvl 2.\n\nCannot build higher without foundation. A hex needs at least 2 neighbors of the SAME level to upgrade.\n\nBuild 2 Lvl 1 neighbors using provided materials, then upgrade center.',
            LEVEL_1_4_TITLE: 'Sim 1.4: Excavation',
            LEVEL_1_4_DESC: 'Upgrade Center to Lvl 3.\n\nYou have 0 Materials. Construction is impossible.\n\nDIG (Red Button). Excavate surrounding mounds (Lvl 2) to harvest +1 Mat. Use them to upgrade center.',
            LEVEL_1_5_TITLE: 'Sim 1.5: Oxygen March',
            LEVEL_1_5_DESC: 'Collect 150 Credits in 75s.\n\nStandard Recovery is single-use. You must MOVE to reset the tool.\n\nUse RECOVERY (Blue Button) on high sectors. Height yields more Credits.\n\nHigh (Lvl 4+) sectors overheat (Cooldown 15s). Rotate between peaks.',
            LEVEL_1_6_TITLE: 'Sim 1.6: Vertical Limit',
            LEVEL_1_6_DESC: 'Reach Level 4.\n\nSpace is extremely limited. A rival is competing for the same peak. Manage your footprint carefully.',
            LEVEL_1_7_TITLE: 'Sim 1.7: Energy Crisis',
            LEVEL_1_7_DESC: 'Collect 10 materials. Dig deep, but watch your moves. Every step is expensive. Use credit-to-move exchange if you get stuck.',
            LEVEL_2_1_TITLE: 'Sim 2.1: The Monolith',
            LEVEL_2_1_DESC: 'Reach the Monolith (Center, L3). It requires NO items to activate. Just step on it and press ACTIVATE in the interface.\n\nDirect path blocked by L4 wall. Find the staircase along the left ridge.\n\nAlmost no fuel. Use RECOVERY (Blue) on your start hex, then MOVE away and back to reset it. Repeat to stockpile fuel.',
            LEVEL_2_2_TITLE: 'Sim 2.2: Buried Secrets',
            LEVEL_2_2_DESC: 'Activation Keys detected underground.\n\nCollect 3 ANY ITEMS. Step onto the Monolith, insert them into the slots, and press ACTIVATE.\n\nDIG (Red) below L0. Each new negative depth has a loot chance. Deeper = better odds (20% at -1, 30% at -2, 40% at -3...).\n\nDigging gives +Moves and +Material. You earn fuel by exploring.',
            LEVEL_2_3_TITLE: 'Sim 2.3: Entropy Rising',
            LEVEL_2_3_DESC: 'ALERT: Sector highly unstable.\n\nObjective: Reach the Monolith (L4) and ACTIVATE it.\n\nConstraint: You start at Rank 3. The Monolith is L4. You CANNOT step on it yet. You must use your starting Materials to BUILD a supporting L4 hex nearby to gain Rank 4!\n\nMechanic: Every action costs Entropy (Starts at 15). At 0 → catastrophic shift.',
            LEVEL_2_4_TITLE: 'Sim 2.4: The Rivalry',
            LEVEL_2_4_DESC: 'Threat: Hostile unit approaching.\n\nObjective: Find 2 ITEMS and activate the Monolith BEFORE the Rival.\n\nStart: Nearly empty. DIG sites along your path for fuel and artifacts. The Rival approaches from the north.\n\nDEFEAT: The Bot reaches the Monument first OR you become Stranded.',
            LEVEL_2_5_TITLE: 'Sim 2.5: The Singularity',
            LEVEL_2_5_DESC: 'FINAL TEST: Two hostiles converge.\n\nObjective: Collect 3 ITEMS and activate the Core (L5) first.\n\nStart: Near-empty. DIG deep along your spiral for fuel + artifacts. Two rivals approach from the North and East.\n\nTip: Deeper digs give more Moves AND better loot odds.',
            LEVEL_2_6_TITLE: 'Sim 2.6: Deep Echo',
            LEVEL_2_6_DESC: 'Objective: Descend to depth -5. Use reinforcements to avoid collapse. Deep layers are unstable but hold ancient artifacts.',
            LEVEL_3_1_TITLE: 'Sim 3.1: First Inscription',
            LEVEL_3_1_DESC: 'An ancient transmission carved into stone.\n\nObjective: Activate the Monument at the summit.\n\nMechanic: Obelisks (L3 pillars) inscribe the required item silhouette into the Monument interface. Visit one to learn what it needs — or guess.\n\nEntropic Warning: Two stability events will occur. The second ends the mission.',
            LEVEL_3_2_TITLE: 'Sim 3.2: Twin Beacons',
            LEVEL_3_2_DESC: 'Two obelisks flank the summit. Each holds half the inscription.\n\nObjective: Activate the 2-slot Monument.\n\nPath: The route splits. Each branch leads through one obelisk. Visit both for full information — but it costs moves.\n\nStrategy: Can you infer the second slot from your inventory alone?',
            LEVEL_3_3_TITLE: 'Sim 3.3: Eclipse Depth',
            LEVEL_3_3_DESC: 'The inscription demands quality, not identity.\n\nObjective: Activate the Monument with an UNCOMMON item.\n\nThe obelisk on your path reveals the rarity requirement. A common item will not suffice.\n\nVoid walls close both flanks. There is only one way forward.',
            LEVEL_3_4_TITLE: 'Sim 3.4: Entropic Dispatch',
            LEVEL_3_4_DESC: 'Stability is collapsing. You have moments.\n\nObjective: Activate the 2-slot Monument before the second event.\n\nHazard: A stability event occurs every 10 actions. Two events = mission failure.\n\nDecision: Two obelisks flank the path. You can only reach one. Choose wisely — or trust your inventory.',
            LEVEL_3_5_TITLE: "Sim 3.5: Guardian's Keep",
            LEVEL_3_5_DESC: 'Something watches the inscription.\n\nObjective: Activate the Monument with a RARE item.\n\nThreat: A guardian bot patrols the junction. The obelisk reveals which RARE item is needed — but reaching it is dangerous.\n\nStrategy: Can you recognize the RARE item you carry without visiting the obelisk?',
            LEVEL_3_6_TITLE: 'Sim 3.6: Three Whispers',
            LEVEL_3_6_DESC: 'The monument speaks in three voices — all saying the same thing.\n\nObjective: Activate the Monument with one of three possible items.\n\nThree obelisks have carved the same inscription: the slot accepts any of 3 specific UNCOMMON items. Find even one to win.\n\nThe center obelisk is unavoidable. The others reveal only echoes.',
            LEVEL_3_7_TITLE: 'Sim 3.7: Ascendancy',
            LEVEL_3_7_DESC: 'Another agent races for the summit.\n\nObjective: Activate the 2-slot Monument before entropy fails.\n\nCompetition: A rival agent builds toward rank, adding pressure. They won\'t activate the monument — but they consume time.\n\nTwo obelisks hold the inscription. Can you reach both within 29 actions?',
            LEVEL_3_8_TITLE: 'Sim 3.8: The Archive',
            LEVEL_3_8_DESC: 'Final entry. Three inscriptions. One monument.\n\nObjective: Activate the 3-slot Monument.\n\nThree obelisks hold three slot revelations. The central one is unavoidable. Side obelisks require detours — but without them, you guess blind.\n\nA hostile agent patrols the upper levels. You have 23 actions.',
            LEVEL_4_1_TITLE: 'Sim 4.1: Resonance Protocol',
            LEVEL_4_1_DESC: 'Objective: Create a "Ring of Resonance" - upgrade 3 DIFFERENT hexes to Level 2 simultaneously.\n\nRule: L2 needs 2 neighbors at L1. Plan your build order.\nStart empty — Dig for materials first.',
            LEVEL_4_2_TITLE: 'Sim 4.2: Mirror Maze',
            LEVEL_4_2_DESC: 'Objective: Own BOTH (-2,0) and (2,0) at Level 1+.\n\nDirect east path blocked by VOID. Find detours or sacrifice items to restore.',
            LEVEL_4_3_TITLE: 'Sim 4.3: Recursion Engine',
            LEVEL_4_3_DESC: 'Objective: Build 2 hexes to Level 3.\n\nEach level requires 2 neighbors at same level as support.\nPlan your upgrade chain carefully — build wide before building tall.',
            LEVEL_4_4_TITLE: 'Sim 4.4: Thermal Equilibrium',
            LEVEL_4_4_DESC: 'Objective: Build center hex to Level 4.\n\nHazard: Each action adds +3 Entropy. Starting at 70/100.\nAt 100 → sector collapse.\n\nYou have ~10 actions. Every move must count.\nPre-built staircase: focus on upgrading, not pathfinding.',
            LEVEL_4_5_TITLE: 'Sim 4.5: Convergence Point',
            LEVEL_4_5_DESC: 'Objective: Achieve 2 of 3 goals BEFORE the Rival:\n  A) Own 6+ hexes at L2+\n  B) Accumulate 200 Credits\n  C) Stand on the Monument\n\nThe Rival approaches in ~16 actions. Choose 2 goals and commit.',
            LEVEL_4_6_TITLE: 'Sim 4.6: Cascade Protocol',
            LEVEL_4_6_DESC: 'Objective: 8+ hexes at Level 3.\n\nSpecial: When a hex reaches L3, all adjacent L2 hexes INSTANTLY upgrade to L3!\n\nStrategy: Build a large L2 cluster, then trigger the chain reaction.\n\nWarning: Cascading costs NO material but each triggered upgrade is an action (entropy drain).',
            LEVEL_4_7_TITLE: 'Sim 4.7: Duality Engine',
            LEVEL_4_7_DESC: 'Objective: Own 4 hexes at L3+ AND 2 hexes at L4+ simultaneously.\n\nChallenge: L4 requires Rank 3 and neighbors at L3.\nYou must build wide (4×L3) AND tall (2×L4) from scratch.\n\nDig deep for materials. Plan your support chains.',
            LEVEL_4_8_TITLE: 'Sim 4.8: Omega Synthesis',
            LEVEL_4_8_DESC: 'ULTIMATE TRIAL: All Systems Critical.\n\nAchieve ALL simultaneously:\n  1. Own 3+ hexes at Level 3+\n  2. Accumulate 300+ Credits\n  3. Stand on Monument with 2+ items\n  4. Keep Entropy below 60/100\n\nEntropy: +2 per action. Start: 40/100. ~30 actions max.\n\nThis is the end. Use everything you have learned.',
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
            CAMPAIGN: "Кампания",
            CAMPAIGN_SUB: "Сюжет и обучение",
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
            MODE_STORY: "История",
            MODE_STORY_SUB: "Сюжет и города",
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
            BAR: "Бар",
            BANK: "Банк",
            SHOP: "Магазин",
            WORKSHOP: "Мастерская",
            CAPITOL: "Капитолий",
            HUB: "Хаб",
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
            NO_HISTORY: "Нет записи истории.",
            LOG_DOWNLOADED: "Лог Скачан",
            STORAGE_FULL: "Склад Полон!",
            DEATH_OVERWORLD: "Вы погибли в пустошах... Возрождение в городе. Потеряна половина кредитов.",
            CITY_EXIT_SUCCESS: "Путь открыт. Добро пожаловать в пустоши.",
            CITY_EXIT_DENIED: "Блокпост закрыт. Вам нужно 6 меток обучения, чтобы покинуть город.",
            STARVED_OVERWORLD: "Вы умерли от голода... Возрождение в городе. Потеряна половина кредитов.",
            TRAP_HIT: "Попали в ловушку! -{0} ОЗ",
            RIFT_DEFEAT: "Поражение в Разломе! -{0} ОЗ",
            RIFT_VICTORY: "Разлом зачищен! +{0} Кред.",
            SIMULATION_VICTORY: "Симуляция пройдена! +{0} Кред.",
            SIMULATION_DEFEAT: "Симуляция провалена. Попробуйте еще раз.",
            FOUND_CREDITS: "Найдено {0} Кред.!",
            FOUND_SUPPLIES: "Найдены припасы!",
            FOUND_SCRAP: "Найден металлолом!",
            NOTHING_HERE: "Здесь больше ничего нет.",
            WORLD_INIT_FAILED: "Не удалось инициализировать мир",
            CANNOT_DIG: "Здесь нельзя копать!",
            GRADIENT_LOCK: "Блокировка градиента! Нужно оставаться выше уровня {0}.",
            UNSTABLE_DIG: "НЕСТАБИЛЬНО! Раскопайте 2 соседние клетки до уровня {0} или ниже.",
            EXCAVATED: "Земля раскопана.",
            CANNOT_BUILD_WATER: "Нельзя строить на воде!",
            CANNOT_BUILD: "Здесь нельзя строить!",
            UNSTABLE_BUILD: "НЕСТАБИЛЬНО! Нужно 2 соседние клетки уровня {0}, чтобы строить выше.",
            RAISED_TERRAIN: "Терраса поднята.",
            REST_CITY: "Безопасный отдых в городе (-5 Кредитов)",
            REST_SUPPLIES: "Отдых с использованием припасов",
            REST_STARVING: "Отдых без припасов... Голодание! (-10 ОЗ)",
            RIFT_LOCKED: "Разлом заблокирован. Завершите предыдущие серии.",
            NOTHING_INTERACT: "Здесь не с чем взаимодействовать",
            CAMPAIGN_COMPLETE: "Кампания Завершена! Поздравляем!",
            MISSING_ITEM: "Отсутствует необходимый предмет: {0}",
            ITEM_EQUIPPED: "Предмет экипирован",
            BAG_FULL: "Сумка полна!",
            ITEM_UNEQUIPPED: "Предмет снят",
            WRONG_SLOT: "Неверный слот экипировки!",
            CANNOT_EQUIP: "Этот предмет нельзя экипировать.",
            ENTITY_NOT_FOUND: "Сущность не найдена",
            ACTOR_LOCKED: "Действие заблокировано",
            ACTOR_MOVING: "Сущность в движении",
            UNKNOWN_ACTION: "Неизвестное действие",
            CANNOT_AFFORD_MOVE: "Недостаточно средств для перемещения",
            MUST_BE_ON_TARGET: "Нужно находиться на целевом гексе",
            INSUFFICIENT_FUNDS: "Недостаточно средств",
            ITEM_NOT_FOUND: "Предмет не найден",
            NOT_A_VOID: "Цель не является пустотой",
            STABILIZATION_FAILED: "Стабилизация не удалась",
            MONUMENT_STAND_REQUIRED: "Нужно стоять на монументе",
            MONUMENT_WRONG_ITEMS: "Неверные предметы для монумента",
            INDESTRUCTIBLE_MONUMENT: "Монумент неразрушим",
            NEED_MATERIAL: "Нужен материал",
            ANCIENT_STRUCTURE: "Древнее строение",
            INVALID_HEX: "Неверный гекс",
        },
        CAMPAIGN: {
            LEVEL_1_1_TITLE: 'Сим 1.1: Протокол Экспансии',
            LEVEL_1_1_DESC: 'Захватить 3 НОВЫХ сектора.\n\nЗахватите 3 соседних Нейтральных Сектора (Ур.0), чтобы создать периметр.\n\nПерейдите на нейтральный гекс и используйте УЛУЧШЕНИЕ (Желтая кнопка), чтобы построить Уровень 1 (Цена: 1 Мат.).',
            LEVEL_1_2_TITLE: 'Сим 1.2: Твердая Почва',
            LEVEL_1_2_DESC: 'Достичь Столицы.\n\nОбнаружен безопасный путь (Прочность 3). Следуйте ему через пустоту.\n\nОкружение НЕСТАБИЛЬНО (Прочность 1). Сход с пути вызывает мгновенный обвал и потерю Ранга.\n\nКоллапс при падении Ранга до 1.',
            LEVEL_1_3_TITLE: 'Сим 1.3: Опорные Конструкции',
            LEVEL_1_3_DESC: 'Улучшить Центр до Ур. 2.\n\nНельзя строить выше без фундамента. Гексу нужно минимум 2 соседа того же уровня для улучшения.\n\nПостройте 2 соседа Ур. 1 используя выданные материалы, затем улучшите центр.',
            LEVEL_1_4_TITLE: 'Сим 1.4: Раскопки',
            LEVEL_1_4_DESC: 'Улучшить Центр до Ур. 3.\n\nУ вас 0 Материалов. Стройка невозможна.\n\nРАСКОПКИ (Красная кнопка). Копайте окружающие холмы (Ур. 2), чтобы добыть +1 Мат. Используйте их для улучшения центра.',
            LEVEL_1_5_TITLE: 'Сим 1.5: Кислородный Марш',
            LEVEL_1_5_DESC: 'Собрать 150 Кред. за 75с.\n\nВосстановление доступно 1 раз за визит. Вы должны СДВИНУТЬСЯ, чтобы сбросить инструмент.\n\nИспользуйте ВОССТАНОВЛЕНИЕ (Синяя кнопка) на высоких секторах. Высота дает больше Кредитов.\n\nВысокие (Ур. 4+) сектора перегреваются (КД 15с). Перемещайтесь между пиками.',
            LEVEL_1_6_TITLE: 'Сим 1.6: Вертикальный Предел',
            LEVEL_1_6_DESC: 'Достичь Уровня 4.\n\nПространство крайне ограничено. Соперник претендует на тот же пик. Тщательно планируйте свои действия.',
            LEVEL_1_7_TITLE: 'Сим 1.7: Энергетический Кризис',
            LEVEL_1_7_DESC: 'Соберите 10 материалов. Копайте глубоко, но следите за ходами. Каждый шаг стоит дорого. Используйте обмен кредитов на ходы, если застрянете.',
            LEVEL_2_1_TITLE: 'Сим 2.1: Монолит',
            LEVEL_2_1_DESC: 'Встать на Монолит (Центр, Ур.3). Для активации НЕ нужны предметы. Просто встаньте на него и нажмите АКТИВИРОВАТЬ в интерфейсе.\n\nДоступ заблокирован стеной Ур.4. Найдите лестницу вдоль левого хребта.\n\nИспользуйте ВОССТАНОВЛЕНИЕ (Синяя кнопка) на старте, затем СДВИНЬТЕСЬ для сброса. Повторяйте для накопления топлива.',
            LEVEL_2_2_TITLE: 'Сим 2.2: Тайны Недр',
            LEVEL_2_2_DESC: 'Ключи под землей.\n\nСобрать 3 ПРЕДМЕТА. Встаньте на Монолит, вставьте их в слоты и нажмите АКТИВИРОВАТЬ.\n\nКОПАЙТЕ (Красная) ниже Ур.0. Каждый уровень глубины — шанс на лут (20% на -1, 30% на -2, 40% на -3...).\n\nКопка дает +Топливо и +Материалы. Вы получаете энергию, исследуя недра.',
            LEVEL_2_3_TITLE: 'Сим 2.3: Рост Энтропии',
            LEVEL_2_3_DESC: 'ВНИМАНИЕ: Сектор крайне нестабилен.\n\nЦЕЛЬ: Достичь Монолита (Ур.4) и АКТИВИРОВАТЬ его.\n\nОграничение: Вы начинаете с Рангом 3. Монолит — Ур.4. Вы НЕ МОЖЕТЕ на него зайти. Используйте материалы, чтобы ПОСТРОИТЬ соседний гекс Ур.4 и получить Ранг 4!\n\nМеханика: Каждое действие тратит Энтропию (старт: 15). При 0 → катастрофа.',
            LEVEL_2_4_TITLE: 'Сим 2.4: Противостояние',
            LEVEL_2_4_DESC: 'УГРОЗА: Враждебный юнит.\n\nЦЕЛЬ: Найти 2 ПРЕДМЕТА и активировать Монолит РАНЬШЕ Соперника.\n\nСтарт: Почти пусто. КОПАЙТЕ участки на пути за топливо и артефакты. Соперник приближается с севера.\n\nПОРАЖЕНИЕ: Бот достигает Монумента первым ИЛИ у вас кончается топливо.',
            LEVEL_2_5_TITLE: 'Сим 2.5: Сингулярность',
            LEVEL_2_5_DESC: 'ФИНАЛЬНЫЙ ТЕСТ: Двое врагов.\n\nЦЕЛЬ: Собрать 3 ПРЕДМЕТА и активировать Ядро (Ур. 5) первым.\n\nСтарт: Почти пусто. КОПАЙТЕ глубоко по спирали за топливо и артефакты. Два соперника приближаются с севера и востока.\n\nПодсказка: Глубокие раскопки дают больше Топлива И лучшие шансы на лут.',
            LEVEL_2_6_TITLE: 'Сим 2.6: Глубинное Эхо',
            LEVEL_2_6_DESC: 'Цель: Опуститесь на глубину -5. Используйте укрепления, чтобы избежать обвала. Глубокие слои нестабильны, но хранят древние артефакты.',
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