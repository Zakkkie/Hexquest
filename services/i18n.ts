
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
        BTN_LOGIN: string;
        BTN_REGISTER: string;
        BTN_GUEST: string;
        INPUT_NAME: string;
        INPUT_PASS: string;
        AUTH_AVATAR_COLOR: string;
        AUTH_INSIGNIA: string;
        CONFIG_TITLE: string;
        CONFIG_SUB: string;
        DIFF_EASY: string;
        DIFF_MEDIUM: string;
        DIFF_HARD: string;
        BTN_START: string;
        BTN_CANCEL: string;
        LOGOUT_CONFIRM: string;
        ABANDON_CONFIRM: string;
        
        // New Layout Keys
        COL_GOAL_TITLE: string;
        COL_GOAL_DESC: string;
        COL_SETUP_TITLE: string;
        COL_SETUP_DESC: string;
        LBL_DIFFICULTY: string;
        LBL_RIVALS: string;
        
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
        BRIEFING_DESC_TEMPLATE: string; // New
        BRIEFING_HINTS_TITLE: string; // New
        BRIEFING_HINT_1: string; // New
        BRIEFING_HINT_2: string; // New
        BRIEFING_HINT_3: string; // New
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
            BTN_LOGIN: "Authenticate",
            BTN_REGISTER: "Join Ranks",
            BTN_GUEST: "Play as Guest",
            INPUT_NAME: "Callsign",
            INPUT_PASS: "Password",
            AUTH_AVATAR_COLOR: "Suit Color",
            AUTH_INSIGNIA: "Insignia",
            CONFIG_TITLE: "Battle Configuration",
            CONFIG_SUB: "Define mission parameters",
            DIFF_EASY: "Easy",
            DIFF_MEDIUM: "Medium",
            DIFF_HARD: "Hard",
            BTN_START: "Initiate Battle",
            BTN_CANCEL: "Cancel",
            LOGOUT_CONFIRM: "Logging out will end your session.",
            ABANDON_CONFIRM: "Abort mission? Progress will be lost.",
            
            COL_GOAL_TITLE: "Mission Objectives",
            COL_GOAL_DESC: "Select the victory criteria.",
            COL_SETUP_TITLE: "Simulation Settings",
            COL_SETUP_DESC: "Configure threats and difficulty.",
            LBL_DIFFICULTY: "Challenge Level",
            LBL_RIVALS: "Bots",

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
            TUT_1_3_COUNTER: "SUPPORTS",
            TUT_1_4_TASK: "Reach Level 3",
            TUT_1_4_INTRO_TITLE: "Excavation",
            TUT_1_4_INTRO_DESC: "Dig mounds for material.",
            TUT_1_4_COUNTER: "LVL",
            TUT_1_5_TASK: "Emergency Run",
            TUT_1_5_INTRO_TITLE: "Oxygen Low",
            TUT_1_5_INTRO_DESC: "Collect 150 Coins fast!",
            TUT_1_5_TIMER_LABEL: "ТАЙМЕР",
            TUT_1_5_COUNTER: "COINS",
            TUT_1_6_TASK: "Race for L4",
            TUT_1_6_INTRO_TITLE: "The Rival",
            TUT_1_6_INTRO_DESC: "Beat the Architect.",
            TUT_1_6_CYCLE_HINT: "Locked!",
            TUT_1_6_COUNTER: "RANK",
            TUT_1_6_RIVAL: "RIVAL",
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
            RESUME: "Продолжить",
            RESUME_SUB: "Вернуться в сектор",
            LEADERBOARD: "Рейтинги",
            LEADERBOARD_SUB: "Зал славы",
            END_SESSION: "Прервать",
            END_SESSION_SUB: "Закрыть сектор",
            EXIT: "Выход",
            AUTH_GUEST: "Гость",
            AUTH_LOGIN: "Вход",
            AUTH_REGISTER: "Регистрация",
            MODAL_LOGIN_TITLE: "Войти",
            MODAL_REGISTER_TITLE: "Новый Контракт",
            MODAL_GUEST_TITLE: "Гостевой Режим",
            BTN_LOGIN: "Войти",
            BTN_REGISTER: "Создать Профиль",
            BTN_GUEST: "Играть как Гость",
            INPUT_NAME: "Позывной",
            INPUT_PASS: "Пароль",
            AUTH_AVATAR_COLOR: "Цвет Снаряжения",
            AUTH_INSIGNIA: "Эмблема",
            CONFIG_TITLE: "Настройка Битвы",
            CONFIG_SUB: "Параметры симуляции",
            DIFF_EASY: "Легкий",
            DIFF_MEDIUM: "Средний",
            DIFF_HARD: "Сложный",
            BTN_START: "Начать Битву",
            BTN_CANCEL: "Отмена",
            LOGOUT_CONFIRM: "Выход завершит текущую сессию.",
            ABANDON_CONFIRM: "Прервать миссию? Прогресс будет потерян.",
            
            COL_GOAL_TITLE: "Цели Миссии",
            COL_GOAL_DESC: "Выберите условия победы.",
            COL_SETUP_TITLE: "Параметры Симуляции",
            COL_SETUP_DESC: "Сложность и враждебность.",
            LBL_DIFFICULTY: "Уровень Сложности",
            LBL_RIVALS: "Боты",

            FORECAST_TITLE: "Тактический Прогноз",
            STAT_MAP_SIZE: "Радиус Карты",
            STAT_STORAGE: "Лимит Склада",
            STAT_AI_BEHAVIOR: "Поведение ИИ",
            VAL_SMALL: "Компакт",
            VAL_MEDIUM: "Стандарт",
            VAL_LARGE: "Обширный",
            VAL_PASSIVE: "Защитное",
            VAL_BALANCED: "Баланс",
            VAL_AGGRESSIVE: "Агрессия"
        },
        HUD: {
            RANK: "Ранг",
            MATERIAL: "Мат.",
            CREDITS: "Монеты",
            MOVES: "Топливо",
            LEADERBOARD_TITLE: "Топ",
            ABORT_TITLE: "Выход?",
            ABORT_DESC: "Прервать связь с сектором?",
            BTN_CANCEL: "Отмена",
            BTN_CONFIRM: "Да",
            VICTORY: "ПОБЕДА",
            DEFEAT: "ПОРАЖЕНИЕ",
            MISSION_COMPLETE: "Сектор захвачен.",
            MISSION_FAILED: "Операция провалена.",
            WINNER: "Победитель",
            BTN_MENU: "В Меню",
            BTN_NEXT: "След. Сектор",
            BTN_RETRY: "Заново",
            BTN_VIEW_LEADERBOARD: "Рекорды",
            TIME: "Время",
            BRIEFING_RIVAL: "Враг",
            BRIEFING_TITLE: "ЗАДАЧА",
            BRIEFING_TARGET_RANK: "Нужный Ранг",
            BRIEFING_TARGET_FUNDS: "Нужно Монет",
            BRIEFING_BTN_START: "ВЫСАДКА",
            BRIEFING_DESC_TEMPLATE: "Установите контроль над сектором. Достигните Ранга {0} и заработайте {1} Монет для выполнения миссии.",
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
            MINI_LB_CREDITS: "Монеты",
            HINT_RANK: "Ранг",
            HINT_CREDITS: "Деньги",
            HINT_MOVES: "Топливо",
            HINT_CYCLE: "Цикл",
            BTN_CLAIM: "ЗАХВАТ",
            BTN_REWARD: "Награда: Доход",
            BTN_READY: "ПОНЯТНО",
            SKIRMISH_OBJ: "Задача",
            SKIRMISH_COND: "Условия Победы",
            TUT_1_1_TASK: "Захватите 3 сектора",
            TUT_1_1_COST: "Цена: 100",
            TUT_1_1_REWARD: "+5 Доход",
            TUT_1_1_GUIDE: "Идите на подсвеченные клетки.",
            TUT_1_1_COUNTER: "ЗАХВАЧЕНО",
            TUT_1_2_TASK: "Дойти до Пика",
            TUT_1_2_INTRO_TITLE: "ОПАСНОСТЬ",
            TUT_1_2_INTRO_DESC: "Земля нестабильна. Идите по безопасному пути.",
            TUT_1_2_LEGEND_SAFE: "Надежно",
            TUT_1_2_LEGEND_RISK: "Опасно",
            TUT_1_2_COUNTER: "ДИСТАНЦИЯ",
            TUT_1_3_TASK: "Построить L2",
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
            TUT_1_6_TASK: "Гонка до L4",
            TUT_1_6_INTRO_TITLE: "Соперник",
            TUT_1_6_INTRO_DESC: "Опередите Архитектора.",
            TUT_1_6_CYCLE_HINT: "Блок!",
            TUT_1_6_COUNTER: "РАНГ",
            TUT_1_6_RIVAL: "ВРАГ",
        },
        TOOLTIP: {
            CURRENT_LOC: "Местоположение",
            BLOCKED: "БЛОК",
            NA: "-",
            REQ: "НУЖНО",
            OCCUPIED: "ЗАНЯТО",
            PLAYER: "ЮНИТ"
        },
        TUTORIAL: {
            WELCOME_TITLE: "Обучение",
            WELCOME_DESC: "Достигните 3 ранга. Расширяйтесь.",
            BTN_START: "Начать",
            CAMERA_DESC: "Камера",
            CAMERA_HINT: "Вращайте кнопками снизу.",
            MOVE_A: "Нажмите на гекс.",
            MOVE_B: "Стройте фундамент L1.",
            MOVE_CENTER: "Улучшайте до L2!",
            ACQUIRE: "Стройка",
            ACQUIRE_DESC: "Поднимите L0 до L1.",
            UPGRADE_L2: "Ур. 2",
            UPGRADE_L2_DESC: "Нужна опора.",
            FOUNDATION_TITLE: "База",
            FOUNDATION_DESC: "Постройте 3 гекса L2.",
            FOUNDATION_TASK: "3x L2",
            FINAL_TITLE: "Готово",
            FINAL_DESC: "Стройте L3 в центре.",
            NO_POINTS_TITLE: "Пусто",
            NO_POINTS_DESC: "Копайте материалы.",
            NO_POINTS_DESC_HINT: "Ищите холмы.",
            NO_POINTS_HINT: "Копать здесь."
        },
        LEADERBOARD: {
            TITLE: "Зал Славы",
            SUBTITLE: "Лучшие Боевые Рекорды",
            BTN_BACK: "Меню",
            HEADER_COMM: "Юнит",
            HEADER_CREDITS: "Монеты",
            HEADER_RANK: "Ранг",
            EMPTY: "Пусто."
        }
    }
};
