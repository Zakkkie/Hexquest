
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
            VAL_AGGRESSIVE: "Hostile"
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
            EMPTY: "Empty."
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
            LEVEL_1_5_DESC: 'Protocol: Emergency Recovery.\n\nObjective: Collect 150 Credits in 60s.\n\nRule: Standard Recovery is single-use. You must MOVE to reset the tool.\n\nMethod: Use RECOVERY (Blue Button) on high sectors. Height yields more Credits.\n\nWARNING: High (Lvl 4+) sectors overheat (Cooldown 15s). Rotate between peaks.',
            LEVEL_1_6_TITLE: 'Sim 1.6: The Architect',
            LEVEL_1_6_DESC: 'Protocol: Combat.\n\nObjective: Reach Level 4 before the Rival.\n\nBot "Architect V18" active. It can Gather materials and Build supports. Compete for limited space.'
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
            EMPTY: "Empty."
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
            VAL_AGGRESSIVE: "Агрессия"
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
            EMPTY: "Пусто."
        },
        CAMPAIGN: {
            LEVEL_1_1_TITLE: 'Сим 1.1: Протокол Экспансии',
            LEVEL_1_1_DESC: 'Миссия: Захватить 3 НОВЫХ сектора.\n\nЮниту нужен плацдарм. Захватите 3 соседних Нейтральных Сектора (Ур.0), чтобы создать периметр.\n\nМетод: Перейдите на нейтральный гекс и используйте УЛУЧШЕНИЕ (Желтая кнопка), чтобы построить Уровень 1 (Цена: 1 Мат.).\n\nВНИМАНИЕ: Материалы ограничены. Используйте их для расширения.',
            LEVEL_1_2_TITLE: 'Сим 1.2: Твердая Почва',
            LEVEL_1_2_DESC: 'Цель: Достичь Столицы.\n\nСКАНЕР: Обнаружен безопасный путь (Прочность 3). Следуйте ему через пустоту.\n\nОПАСНОСТЬ: Окружение НЕСТАБИЛЬНО (Прочность 1). Сход с пути вызывает мгновенный обвал и потерю Ранга.\n\nПРОВАЛ: Падение Ранга до 1.',
            LEVEL_1_3_TITLE: 'Сим 1.3: Опорные Конструкции',
            LEVEL_1_3_DESC: 'Протокол: Вертикальная Стройка.\n\nЦель: Улучшить Центр до Ур. 2.\n\nПравило: Нельзя строить выше без фундамента. Гексу нужно минимум 2 соседа того же уровня для улучшения.\n\nЗадача: Постройте 2 соседа Ур. 1 используя выданные материалы, затем улучшите центр.',
            LEVEL_1_4_TITLE: 'Сим 1.4: Раскопки',
            LEVEL_1_4_DESC: 'Протокол: Ресурсный Цикл.\n\nЦель: Улучшить Центр до Ур. 3.\n\nПроблема: У вас 0 Материалов. Стройка невозможна.\n\nРешение: РАСКОПКИ (Красная кнопка). Копайте окружающие холмы (Ур. 2), чтобы добыть +1 Мат. Используйте их для улучшения центра.',
            LEVEL_1_5_TITLE: 'Сим 1.5: Кислородный Марш',
            LEVEL_1_5_DESC: 'Протокол: Экстренное Восстановление.\n\nЦель: Собрать 150 Кред. за 60с.\n\nПравило: Восстановление доступно 1 раз за визит. Вы должны СДВИНУТЬСЯ, чтобы сбросить инструмент.\n\nМетод: Используйте ВОССТАНОВЛЕНИЕ (Синяя кнопка) на высоких секторах. Высота дает больше Денег.\n\nВНИМАНИЕ: Высокие (Ур. 4+) сектора перегреваются (КД 15с). Перемещайтесь между пиками.',
            LEVEL_1_6_TITLE: 'Сим 1.6: Архитектор',
            LEVEL_1_6_DESC: 'Протокол: Бой.\n\nЦель: Достичь Уровня 4 раньше соперника.\n\nБот "Архитектор V18" активен. Он умеет Копать материалы и Строить опоры. Сражайтесь за ограниченное пространство.'
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
            EMPTY: "Пусто."
        }
    }
};
