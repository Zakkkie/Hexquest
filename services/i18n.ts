
import { Language } from '../types';

interface Dictionary {
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
        
        // NEW KEYS FOR MONUMENT & VOID
        VOID_TITLE: string;
        VOID_SUB: string;
        VOID_DESC: string;
        VOID_WARN: string;
        VOID_SELECT: string;
        VOID_EMPTY: string;
        VOID_BTN_SACRIFICE: string; // New Key
        MONUMENT_TITLE: string;
        MONUMENT_SUB: string;
        MONUMENT_DESC_1: string;
        MONUMENT_DESC_2: string;
        MONUMENT_DESC_3: string;
        MONUMENT_KEYS: string;
        MONUMENT_BTN_ACTIVE: string;
        MONUMENT_BTN_INACTIVE: string;
        MONUMENT_EMPTY_INV: string;
        MONUMENT_REQ_EASY: string;
        MONUMENT_REQ_MED: string;
        MONUMENT_REQ_HARD: string;
        EMPTY: string; // Added Missing Key

        // ENTROPY SPECIFIC
        HELP_ENTROPY_TITLE: string;
        HELP_ENTROPY_DESC: string;
        HELP_ENTROPY_DRAIN: string;
        HELP_ENTROPY_SHIFT: string;
        HELP_ENTROPY_GAIN: string;
        MINI_LB_TITLE: string;
        MINI_LB_EMPTY: string;
    };
    TOAST: {
        RECHARGE_FAILED: string;
        TOO_FAR_VOID: string;
        PATH_BLOCKED: string;
        NEED_CREDITS: string;
        CONFIRM_MOVE: string;
        GENERIC_ERROR: string;
        RESTORE_ERROR: string;
        WRONG_ITEM: string;
        SLOTS_FULL: string;
        ACTIVATION_FAILED: string;
        NO_HISTORY: string;
        LOG_DOWNLOADED: string;
        STORAGE_FULL: string;
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
        LB_TERRAIN_DATA: string; // New Key
    }
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
            BOT_LABEL_CHAOS: "CHAOS"
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
            ENCRYPTED: "ENCRYPTED"
        },
        HUD: {
            RANK: "Rank",
            MATERIAL: "Mat.",
            CREDITS: "Coins",
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
            BTN_NEXT: "Next Sector",
            BTN_RETRY: "Retry",
            BTN_VIEW_LEADERBOARD: "Leaderboard",
            TIME: "Time",
            BRIEFING_RIVAL: "Rival Presence",
            BRIEFING_TITLE: "TASK",
            BRIEFING_TARGET_RANK: "Target Rank",
            BRIEFING_TARGET_FUNDS: "Target Coins",
            BRIEFING_BTN_START: "DEPLOY UNIT",
            BRIEFING_DESC_TEMPLATE: "Establish dominance in the sector. Upgrade your position to Rank {0} and accumulate {1} Credits to complete the mission.",
            BRIEFING_HINTS_TITLE: "Tactical Advice",
            BRIEFING_HINT_1: "Move to neutral hexes to claim them.",
            BRIEFING_HINT_2: "Build a foundation before upgrading vertically.",
            BRIEFING_HINT_3: "Monitor your material storage.",
            HELP_RANK_DESC: "Your clearance level. Increased by building higher structures.",
            HELP_RANK_GOAL: "Goal: Reach Rank {0}",
            HELP_MAT_DESC: "Material is required to build. Dig ground to harvest.",
            HELP_MAT_GOAL: "Build Resource",
            HELP_COINS_DESC: "Currency for upgrades and emergency movement.",
            HELP_COINS_GOAL: "Goal: {0} Coins",
            HELP_MOVES_DESC: "Fuel for actions. Replenished by active operations.",
            HELP_MOVES_HINT: "Tip: High terrain costs more fuel.",
            MINI_LB_COMMANDER: "Unit",
            MINI_LB_CYCLE: "Rank",
            MINI_LB_CREDITS: "Coins",
            HINT_RANK: "Rank",
            HINT_CREDITS: "Money",
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
            TUT_1_5_INTRO_DESC: "Collect 150 Coins fast!",
            TUT_1_5_TIMER_LABEL: "TIMER",
            TUT_1_5_COUNTER: "COINS",
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
        TOAST: {
            RECHARGE_FAILED: "Recharge Failed",
            TOO_FAR_VOID: "Too far to stabilize",
            PATH_BLOCKED: "Path Blocked / Invalid",
            NEED_CREDITS: "Need {0} credits",
            CONFIRM_MOVE: "Click again ({0}cr)",
            GENERIC_ERROR: "Error",
            RESTORE_ERROR: "Restoration Error",
            WRONG_ITEM: "Wrong item type!",
            SLOTS_FULL: "Fill all slots!",
            ACTIVATION_FAILED: "Activation Failed",
            NO_HISTORY: "No history.",
            LOG_DOWNLOADED: "Log Saved",
            STORAGE_FULL: "Storage Full!"
        },
        CAMPAIGN: {
            LEVEL_1_1_TITLE: 'Sim 1.1: Expansion Protocol',
            LEVEL_1_1_DESC: 'Mission: Capture 3 NEW sectors.\n\nThe unit requires a foothold. Capture 3 adjacent Neutral Sectors (Lvl 0) to establish a perimeter.\n\nMethod: Move to a neutral hex and use UPGRADE (Amber Button) to build Level 1 (Cost: 1 Mat).\n\nWARNING: Materials are limited. Use them to expand.',
            LEVEL_1_2_TITLE: 'Sim 1.2: Solid Ground',
            LEVEL_1_2_DESC: 'Objective: Reach the Capital.\n\nSCANNER: A safe path (Durability 3) detected. Follow it through the void.\n\nDANGER: Environment UNSTABLE (Durability 1). Stepping off the path causes immediate collapse and Rank loss.\n\nFAILURE: Rank drops to 1.',
            LEVEL_1_3_TITLE: 'Sim 1.3: Structural Supports',
            LEVEL_1_3_DESC: 'Protocol: Vertical Construction.\n\nObjective: Upgrade Center to Lvl 2.\n\nRule: Cannot build higher without foundation. A hex needs at least 2 neighbors of the SAME level to upgrade.\n\nTask: Build 2 Lvl 1 neighbors using provided materials, then upgrade center.',
            LEVEL_1_4_TITLE: 'Sim 1.4: Excavation',
            LEVEL_1_4_DESC: 'Protocol: Resource Cycle.\n\nObjective: Upgrade Center to Lvl 3.\n\nProblem: You have 0 Materials. Construction is impossible.\n\nSolution: DIG (Red Button). Excavate surrounding mounds (Lvl 2) to harvest +1 Mat. Use them to upgrade center.',
            LEVEL_1_5_TITLE: 'Sim 1.5: Oxygen March',
            LEVEL_1_5_DESC: 'Protocol: Emergency Recovery.\n\nObjective: Collect 150 Credits in 75s.\n\nRule: Standard Recovery is single-use. You must MOVE to reset the tool.\n\nMethod: Use RECOVERY (Blue Button) on high sectors. Height yields more Credits.\n\nWARNING: High (Lvl 4+) sectors overheat (Cooldown 15s). Rotate between peaks.',
            LEVEL_1_6_TITLE: 'Sim 1.6: The Architect',
            LEVEL_1_6_DESC: 'Protocol: Combat.\n\nObjective: Reach Level 4 before the Rival.\n\nBot "Architect V18" active. It can Gather materials and Build supports. Compete for limited space.',
            LEVEL_2_1_TITLE: 'Sim 2.1: The Monolith',
            LEVEL_2_1_DESC: 'Target acquired: Unknown Spire.\n\nObjective: Stand on the Monolith (Center, Level 3).\n\nConstraint: The Monolith is indestructible and too high to climb directly.\n\nTask: Build a staircase (L1 -> L2 -> L3) to reach the summit.',
            LEVEL_2_2_TITLE: 'Sim 2.2: Buried Secrets',
            LEVEL_2_2_DESC: 'Scan complete: Activation Key detected underground.\n\nObjective: Find items and activate the Monolith.\n\nHint: Dig deep (Level -1 or lower) near the center to find artifacts. You need 3 items to activate the Monolith structure.',
            LEVEL_2_3_TITLE: 'Sim 2.3: Entropy Rising',
            LEVEL_2_3_DESC: 'ALERT: Sector instability detected.\n\nObjective: Reach and Activate the Monolith before total collapse.\n\nMechanic: ENTROPY gauge is low. Digging and Building accelerates decay.\n\nOutcome: When Entropy hits 0, terrain shifts and voids open. Hurry.',
            LEVEL_2_4_TITLE: 'Sim 2.4: The Rivalry',
            LEVEL_2_4_DESC: 'Threat Assessment: Hostile Unit Detected.\n\nObjective: Secure Keys and activate the Spire before the Rival.\n\nIntel: Resources are scarce. If the Rival finds items first, you may need to dig aggressively to beat them to the summit.',
            LEVEL_2_5_TITLE: 'Sim 2.5: The Singularity',
            LEVEL_2_5_DESC: 'FINAL TEST: Two Hostiles Detected.\n\nObjective: Stabilize the Core (Lvl 5) with 3 RARE items.\n\nCondition: Map is large but crumbling. Deep mining is required to find Rare items, but digging accelerates Entropy.\n\nSurvival: Do not let the bots claim the core.',
            LEVEL_3_1_TITLE: 'Sim 3.1: The Bridge',
            LEVEL_3_1_DESC: 'PUZZLE: Path Construction.\n\nObjective: Reach the CAPITAL on the far side.\n\nProblem: A void chasm separates you from the goal. Build a bridge of L1 hexes across the gap.\n\nConstraint: Materials are scarce — no room for mistakes.',
            LEVEL_3_2_TITLE: 'Sim 3.2: The Harvest',
            LEVEL_3_2_DESC: 'PUZZLE: Resource Optimization.\n\nObjective: Accumulate 480-520 Credits.\n\nCatch: Standing on a Mine for 3+ ticks DESTROYS it. Rotate between mines to maximize yield.\n\nOvershoot Warning: Going above 520 also fails.',
            LEVEL_3_3_TITLE: 'Sim 3.3: The Cascade',
            LEVEL_3_3_DESC: 'PUZZLE: Chain Reaction.\n\nObjective: Build a Level 5 hex at the summit.\n\nRule: Each upgrade requires 2 neighbors at the SAME level. Plan your upgrades in correct order.\n\nResources: Exactly 14 Materials — no waste allowed.',
            LEVEL_3_4_TITLE: 'Sim 3.4: The Gauntlet',
            LEVEL_3_4_DESC: 'PUZZLE: Entropy Survival.\n\nObjective: Survive 120 seconds without losing your Capital.\n\nEntropy starts LOW and decays fast. Use Recovery and items to stabilize.\n\nStrategy: Rotate between recovery stations.',
            LEVEL_3_5_TITLE: 'Sim 3.5: The Heist',
            LEVEL_3_5_DESC: 'PUZZLE: Item Race.\n\nObjective: Collect 3 items and activate the Monument before the Rival.\n\nTwist: Items have negative effects — choose wisely.\n\nEntropy is low. Race, but don\'t rush blindly.',
            LEVEL_3_6_TITLE: 'Sim 3.6: The Maze of Echoes',
            LEVEL_3_6_DESC: 'FINAL PUZZLE: Multi-objective Mastery.\n\nAchieve ALL simultaneously:\n  1. Own 5+ hexes at L2+\n  2. 300+ Credits\n  3. Activate Monument with 2 items\n\nTwo rival bots patrol the maze. Every 30s a new void appears.'
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
            BOT_LABEL_CHAOS: "ХАОС"
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
            ENCRYPTED: "ЗАШИФРОВАНО"
        },
        HUD: {
            RANK: "Ранг",
            MATERIAL: "Мат.",
            CREDITS: "Кред.",
            MOVES: "Ходы",
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
            BTN_NEXT: "Далее",
            BTN_RETRY: "Заново",
            BTN_VIEW_LEADERBOARD: "Рекорды",
            TIME: "Время",
            BRIEFING_RIVAL: "Враг",
            BRIEFING_TITLE: "ЗАДАЧА",
            BRIEFING_TARGET_RANK: "Ранг",
            BRIEFING_TARGET_FUNDS: "Счет",
            BRIEFING_BTN_START: "ВЫСАДКА",
            BRIEFING_DESC_TEMPLATE: "Доминируйте. Наберите Ранг {0} и {1} Кред.",
            BRIEFING_HINTS_TITLE: "Тактика",
            BRIEFING_HINT_1: "Захватывайте нейтральные гексы.",
            BRIEFING_HINT_2: "Создавайте фундамент для роста вверх.",
            BRIEFING_HINT_3: "Следите за запасом материалов.",
            HELP_RANK_DESC: "Ваш уровень доступа. Растет при строительстве высоких этажей.",
            HELP_RANK_GOAL: "Цель: Ранг {0}",
            HELP_MAT_DESC: "Материалы нужны для стройки. Копайте землю, чтобы их добыть.",
            HELP_MAT_GOAL: "Ресурс для стройки",
            HELP_COINS_DESC: "Валюта для апгрейдов и экстренных перемещений.",
            HELP_COINS_GOAL: "Цель: {0} Монет",
            HELP_MOVES_DESC: "Энергия для действий. Восполняется при активных работах.",
            HELP_MOVES_HINT: "Совет: Горы требуют больше топлива.",
            MINI_LB_COMMANDER: "Юнит",
            MINI_LB_CYCLE: "Ранг",
            MINI_LB_CREDITS: "Счет",
            HINT_RANK: "Ранг",
            HINT_CREDITS: "Кред.",
            HINT_MOVES: "Ходы",
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
            TUT_1_5_INTRO_DESC: "Соберите 150 монет быстро!",
            TUT_1_5_TIMER_LABEL: "ТАЙМЕР",
            TUT_1_5_COUNTER: "МОНЕТЫ",
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
            MONUMENT_DESC_3: "для доступа.",
            MONUMENT_KEYS: "Ключи",
            MONUMENT_BTN_ACTIVE: "АКТИВИРОВАТЬ",
            MONUMENT_BTN_INACTIVE: "ВСТАВЬТЕ КЛЮЧИ",
            MONUMENT_EMPTY_INV: "Пусто.",
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
        TOAST: {
            RECHARGE_FAILED: "Сбой Перезарядки",
            TOO_FAR_VOID: "Слишком далеко",
            PATH_BLOCKED: "Путь Заблокирован",
            NEED_CREDITS: "Требуется {0} кред.",
            CONFIRM_MOVE: "Нажмите для подтверждения ({0} кред.)",
            GENERIC_ERROR: "Ошибка",
            RESTORE_ERROR: "Ошибка Восстановления",
            WRONG_ITEM: "Неверный предмет!",
            SLOTS_FULL: "Заполните все слоты!",
            ACTIVATION_FAILED: "Сбой Активации",
            NO_HISTORY: "Нет записи истории.",
            LOG_DOWNLOADED: "Лог Скачан",
            STORAGE_FULL: "Склад Полон!"
        },
        CAMPAIGN: {
            LEVEL_1_1_TITLE: 'Сим 1.1: Протокол Экспансии',
            LEVEL_1_1_DESC: 'ЦЕЛЬ: Захватить 3 НОВЫХ сектора.\n\nЮниту нужен плацдарм. Захватите 3 соседних Нейтральных Сектора (Ур.0), чтобы создать периметр.\n\nМетод: Перейдите на нейтральный гекс и используйте УЛУЧШЕНИЕ (Желтая кнопка), чтобы построить Уровень 1 (Цена: 1 Мат.).\n\nВНИМАНИЕ: Материалы ограничены. Используйте их для расширения.',
            LEVEL_1_2_TITLE: 'Сим 1.2: Твердая Почва',
            LEVEL_1_2_DESC: 'ЦЕЛЬ: Достичь Столицы.\n\nСКАНЕР: Обнаружен безопасный путь (Прочность 3). Следуйте ему через пустоту.\n\nОПАСНОСТЬ: Окружение НЕСТАБИЛЬНО (Прочность 1). Сход с пути вызывает мгновенный обвал и потерю Ранга.\n\nПРОВАЛ: Падение Ранга до 1.',
            LEVEL_1_3_TITLE: 'Сим 1.3: Опорные Конструкции',
            LEVEL_1_3_DESC: 'Протокол: Вертикальная Стройка.\n\nЦЕЛЬ: Улучшить Центр до Ур. 2.\n\nПравило: Нельзя строить выше без фундамента. Гексу нужно минимум 2 соседа того же уровня для улучшения.\n\nЗадача: Постройте 2 соседа Ур. 1 используя выданные материалы, затем улучшите центр.',
            LEVEL_1_4_TITLE: 'Сим 1.4: Раскопки',
            LEVEL_1_4_DESC: 'Протокол: Ресурсный Цикл.\n\nЦЕЛЬ: Улучшить Центр до Ур. 3.\n\nПроблема: У вас 0 Материалов. Стройка невозможна.\n\nРешение: РАСКОПКИ (Красная кнопка). Копайте окружающие холмы (Ур. 2), чтобы добыть +1 Мат. Используйте их для улучшения центра.',
            LEVEL_1_5_TITLE: 'Сим 1.5: Кислородный Марш',
            LEVEL_1_5_DESC: 'Протокол: Экстренное Восстановление.\n\nЦЕЛЬ: Собрать 150 Кред. за 75с.\n\nПравило: Восстановление доступно 1 раз за визит. Вы должны СДВИНУТЬСЯ, чтобы сбросить инструмент.\n\nМетод: Используйте ВОССТАНОВЛЕНИЕ (Синяя кнопка) на высоких секторах. Высота дает больше Денег.\n\nВНИМАНИЕ: Высокие (Ур. 4+) сектора перегреваются (КД 15с). Перемещайтесь между пиками.',
            LEVEL_1_6_TITLE: 'Сим 1.6: Архитектор',
            LEVEL_1_6_DESC: 'Протокол: Бой.\n\nЦЕЛЬ: Достичь Уровня 4 раньше соперника.\n\nБот "Архитектор V18" активен. Он умеет Копать материалы и Строить опоры. Сражайтесь за ограниченное пространство.',
            LEVEL_2_1_TITLE: 'Сим 2.1: Монолит',
            LEVEL_2_1_DESC: 'Обнаружен Неизвестный Шпиль.\n\nЦЕЛЬ: Встать на Вершину Монолита (Центр, Ур. 3).\n\nОграничение: Монолит неразрушим. Прямой подъем невозможен.\n\nЗадача: Постройте лестницу (Ур.1 -> Ур.2), чтобы взобраться на пик.',
            LEVEL_2_2_TITLE: 'Сим 2.2: Тайны Недр',
            LEVEL_2_2_DESC: 'Сканирование: Ключи Активации под землей.\n\nЦЕЛЬ: Собрать 3 предмета и активировать Монолит.\n\nПодсказка: Копайте глубоко (Ур. -1 и ниже) рядом с центром, чтобы найти артефакты. Для активации нужно 3 любых предмета.',
            LEVEL_2_3_TITLE: 'Сим 2.3: Рост Энтропии',
            LEVEL_2_3_DESC: 'ВНИМАНИЕ: Нестабильность сектора.\n\nЦЕЛЬ: Добраться до Монолита и Активировать его до коллапса.\n\nМеханика: Шкала ЭНТРОПИИ падает. Стройка и Копка ускоряют распад.\n\nИсход: При 0 энтропии реальность искажается. Спешите.',
            LEVEL_2_4_TITLE: 'Сим 2.4: Противостояние',
            LEVEL_2_4_DESC: 'Угроза: Враждебный Юнит.\n\nЦЕЛЬ: Добраться до Монолита с 2+ предметами раньше Соперника.\n\nРазведка: Ресурсов мало. Если враг найдет предметы первым, вам придется действовать агрессивно.',
            LEVEL_2_5_TITLE: 'Сим 2.5: Сингулярность',
            LEVEL_2_5_DESC: 'ФИНАЛЬНЫЙ ТЕСТ: Двое врагов.\n\nЦЕЛЬ: Собрать 3 предмета и достичь Ядра (Ур. 5) первым.\n\nУсловия: Карта огромна, но распадается. Глубокие раскопки (Ур. -3) обязательны для поиска Редких ключей, но копка ускоряет Энтропию.\n\nВыживание: Не дайте ботам захватить Ядро.',
            LEVEL_3_1_TITLE: 'Сим 3.1: Мост',
            LEVEL_3_1_DESC: 'ПАЗЗЛ: Строительство пути.\n\nЦЕЛЬ: Добраться до Монолита на другой стороне.\n\nПроблема: Пропасть пустоты разделяет вас и цель. Постройте мост из L1 секторов.\n\nОграничение: Материалов впритык — ошибки недопустимы.',
            LEVEL_3_2_TITLE: 'Сим 3.2: Жатва',
            LEVEL_3_2_DESC: 'ПАЗЗЛ: Оптимизация ресурсов.\n\nЦЕЛЬ: Набрать 200 Кредитов за 3 минуты.\n\nПодвох: Стоянка на Шахте 3+ тика УНИЧТОЖАЕТ её. Чередуйте шахты.\n\nОсторожно: Превышение 520 тоже приводит к поражению.',
            LEVEL_3_3_TITLE: 'Сим 3.3: Каскад',
            LEVEL_3_3_DESC: 'ПАЗЗЛ: Цепная реакция.\n\nЦЕЛЬ: Построить сектор Уровня 3 на вершине.\n\nПравило: Для повышения нужно 2 соседа ТОГО ЖЕ уровня. Планируйте апгрейды в правильном порядке.\n\nРесурсы: Ровно 14 Материалов — без потерь.',
            LEVEL_3_4_TITLE: 'Сим 3.4: Перчатка',
            LEVEL_3_4_DESC: 'ПАЗЗЛ: Выживание в Энтропии.\n\nЦЕЛЬ: Набрать 100 Кредитов И выжить 20 ходов.\n\nЭнтропия стартует НИЗКО и падает быстро. Используйте Восстановление и предметы.\n\nСтратегия: Чередуйте станции восстановления.',
            LEVEL_3_5_TITLE: 'Сим 3.5: Ограбление',
            LEVEL_3_5_DESC: 'ПАЗЗЛ: Гонка за предметами.\n\nЦЕЛЬ: Собрать 3 предмета и активировать Монумент раньше Соперника.\n\nПодвох: У предметов есть негативные эффекты — выбирайте с умом.\n\nЭнтропия низкая. Спешите, но не безрассудно.',
            LEVEL_3_6_TITLE: 'Сим 3.6: Лабиринт Эха',
            LEVEL_3_6_DESC: 'ФИНАЛЬНЫЙ ПАЗЗЛ: Многоцелевое мастерство.\n\nЦЕЛЬ: Выполните ВСЁ одновременно:\n  1. Владейте 3+ секторами L2+\n  2. 150+ Кредитов\n  3. Активируйте Монумент двумя предметами\n\nДва бота патрулируют лабиринт. Каждые 30с появляется новая пустота.',
            LEVEL_3_7_TITLE: 'Сим 3.7: Двойной Протокол',
            LEVEL_3_7_DESC: 'ПАЗЗЛ: Выбор пути.\n\nЦЕЛЬ: Либо 4 гекса Ур.3+, Либо 250 Кредитов.\n\nДва пути к победе. Выберите один и следуйте ему.',
            LEVEL_3_8_TITLE: 'Сим 3.8: Разрыв Линии Снабжения',
            LEVEL_3_8_DESC: 'ФИНАЛЬНЫЙ ЭКЗАМЕН: Все системы.\n\nЦЕЛЬ: 2 гекса Ур.3+, 200 Кредитов, Монумент, 2 предмета.\n\nЛимит ходов: 45. Действуйте быстро.',
            LEVEL_4_1_TITLE: 'Сим 4.1: Протокол Резонанса',
            LEVEL_4_1_DESC: 'ПАЗЗЛ: Гармоничное Строительство.\n\nЦЕЛЬ: Создать "Кольцо Резонанса" - улучшить 3 РАЗНЫХ гекса до одного уровня (Ур. 2) одновременно.\n\nПравило: Все 3 гекса должны быть соседями старта.',
            LEVEL_4_2_TITLE: 'Сим 4.2: Зеркальный Лабиринт',
            LEVEL_4_2_DESC: 'ПАЗЗЛ: Симметрия.\n\nЦЕЛЬ: Разместить 2 Маяка Восстановления симметрично относительно центра.\n\nХаос слева и справа одинаков. Используйте память.',
            LEVEL_4_3_TITLE: 'Сим 4.3: Рекурсивный Двигатель',
            LEVEL_4_3_DESC: 'ПАЗЗЛ: Фрактальная Башня.\n\nЦЕЛЬ: Построить структуру:\n  - Ур.1: 2 гекса\n  - Ур.2: 4 гекса\n  - Ур.3: 2 гекса\n\nРесурсы ограничены.',
            LEVEL_4_4_TITLE: 'Сим 4.4: Термальное Равновесие',
            LEVEL_4_4_DESC: 'ПАЗЗЛ: Охлаждение.\n\nЦЕЛЬ: Улучшить Центр до Ур. 4, удерживая Энтропию ниже 50.\n\nКаждый апгрейд нагревает систему (+8 Энтропии). Восстановление охлаждает (-5).',
            LEVEL_4_5_TITLE: 'Сим 4.5: Точка Схождения',
            LEVEL_4_5_DESC: 'ГОНКА: Многозадачность.\n\nЦЕЛЬ: Выполнить 2 из 3 задач ДО того, как Бот достигнет Монумента:\n  A) 6 гексов Ур.2+\n  B) 600 Кредитов\n  C) Встать на Монумент',
            LEVEL_4_6_TITLE: 'Сим 4.6: Протокол Каскада',
            LEVEL_4_6_DESC: 'ПАЗЗЛ: Цепная Реакция.\n\nЦЕЛЬ: Вызвать "Каскад" - 10 гексов Уровня 3.\n\nПри достижении Ур.3 гекс автоматически улучшает соседей Ур.2.',
            LEVEL_4_7_TITLE: 'Сим 4.7: Двигатель Дуальности',
            LEVEL_4_7_DESC: 'ПАЗЗЛ: Два Ядра.\n\nЦЕЛЬ: Владеть "Логическим Ядром" (6+ гексов Ур.3) И "Энергоблоком" (4+ гекса Ур.4).\n\nБалансируйте ресурсы между двумя центрами.',
            LEVEL_4_8_TITLE: 'Сим 4.8: Омега Синтез',
            LEVEL_4_8_DESC: 'ФИНАЛ: Полное Мастерство.\n\nЦЕЛЬ: Выполнить 4 фазы:\n  1. Разные ландшафты (Ур.0, 2, 3)\n  2. 800 Кредитов\n  3. Монумент (Ур.5)\n  4. Энтропия < 60'
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
        }
    }
};
