
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
        // Help Tooltips
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
        // NEW HINTS
        HINT_RANK: string;
        HINT_CREDITS: string;
        HINT_MOVES: string;
        HINT_CYCLE: string;
        BTN_CLAIM: string;
        BTN_REWARD: string;
        BTN_READY: string;
        // SKIRMISH BRIEFING
        SKIRMISH_OBJ: string;
        SKIRMISH_COND: string;
        // TUTORIAL 1.1 SPECIFIC
        TUT_1_1_TASK: string;
        TUT_1_1_COST: string;
        TUT_1_1_REWARD: string;
        TUT_1_1_GUIDE: string;
        // TUTORIAL 1.2 SPECIFIC
        TUT_1_2_TASK: string;
        TUT_1_2_INTRO_TITLE: string;
        TUT_1_2_INTRO_DESC: string;
        TUT_1_2_LEGEND_SAFE: string;
        TUT_1_2_LEGEND_RISK: string;
        // TUTORIAL 1.3 SPECIFIC
        TUT_1_3_TASK: string;
        TUT_1_3_INTRO_TITLE: string;
        TUT_1_3_INTRO_DESC: string;
        TUT_1_3_REQ_LABEL: string;
        TUT_1_3_ERROR_STAIRCASE: string;
        // TUTORIAL 1.4 SPECIFIC
        TUT_1_4_TASK: string;
        TUT_1_4_INTRO_TITLE: string;
        TUT_1_4_INTRO_DESC: string;
        TUT_1_4_COUNTER: string;
        // TUTORIAL 1.5 SPECIFIC
        TUT_1_5_TASK: string;
        TUT_1_5_INTRO_TITLE: string;
        TUT_1_5_INTRO_DESC: string;
        TUT_1_5_TIMER_LABEL: string;
        // TUTORIAL 1.6 SPECIFIC
        TUT_1_6_TASK: string;
        TUT_1_6_INTRO_TITLE: string;
        TUT_1_6_INTRO_DESC: string;
        TUT_1_6_CYCLE_HINT: string;
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
            CAMPAIGN_SUB: "Start Tutorial & Story",
            SKIRMISH: "Skirmish",
            SKIRMISH_SUB: "Custom Simulation",
            RESUME: "Resume Session",
            RESUME_SUB: "Return to active command",
            LEADERBOARD: "Leaderboard",
            LEADERBOARD_SUB: "Global rankings",
            END_SESSION: "End Session",
            END_SESSION_SUB: "Close current map",
            EXIT: "Exit to Desktop",
            AUTH_GUEST: "Guest",
            AUTH_LOGIN: "Login",
            AUTH_REGISTER: "Register",
            MODAL_LOGIN_TITLE: "Access Terminal",
            MODAL_REGISTER_TITLE: "New Commission",
            MODAL_GUEST_TITLE: "Guest Identity",
            BTN_LOGIN: "Authenticate",
            BTN_REGISTER: "Establish Link",
            BTN_GUEST: "Proceed as Guest",
            INPUT_NAME: "Callsign",
            INPUT_PASS: "Password",
            AUTH_AVATAR_COLOR: "Avatar Color",
            AUTH_INSIGNIA: "Insignia",
            CONFIG_TITLE: "Mission Config",
            CONFIG_SUB: "Select Operational Parameters",
            DIFF_EASY: "Cadet",
            DIFF_MEDIUM: "Veteran",
            DIFF_HARD: "Elite",
            BTN_START: "Initialize Mission",
            BTN_CANCEL: "Cancel",
            LOGOUT_CONFIRM: "Logging out will end your current session. All progress is saved to your profile.",
            ABANDON_CONFIRM: "Are you sure you want to end this session? The map will be closed."
        },
        HUD: {
            RANK: "Rank",
            MATERIAL: "Mat.",
            CREDITS: "Coins",
            MOVES: "Moves",
            LEADERBOARD_TITLE: "Rankings",
            ABORT_TITLE: "Abort Mission?",
            ABORT_DESC: "Terminating the session will disconnect from the current sector.",
            BTN_CANCEL: "Cancel",
            BTN_CONFIRM: "Confirm Exit",
            VICTORY: "VICTORY",
            DEFEAT: "DEFEAT",
            MISSION_COMPLETE: "Campaign Complete! All sectors secured. You are a legend.",
            MISSION_FAILED: "Objective Failed.",
            WINNER: "Winner",
            BTN_MENU: "Main Menu",
            BTN_NEXT: "Next Sector",
            BTN_RETRY: "Retry Sector",
            BTN_VIEW_LEADERBOARD: "View Leaderboard",
            TIME: "Time",
            BRIEFING_RIVAL: "Rival Presence Detected",
            BRIEFING_TITLE: "Mission Briefing",
            BRIEFING_TARGET_RANK: "Target Rank",
            BRIEFING_TARGET_FUNDS: "Target Coins",
            BRIEFING_BTN_START: "START MISSION",
            HELP_RANK_DESC: "Your Rank determines your maximum clearance level. Increase it by upgrading structures.",
            HELP_RANK_GOAL: "Goal: Reach Rank {0}",
            HELP_MAT_DESC: "Material is required to build or upgrade structures. Dig ground to gather it.",
            HELP_MAT_GOAL: "Used for construction",
            HELP_COINS_DESC: "Coins fund upgrades and can refuel movement (Emergency Propulsion).",
            HELP_COINS_GOAL: "Goal: {0} Coins",
            HELP_MOVES_DESC: "Moves are replenished by upgrading, recovering, or digging.",
            HELP_MOVES_HINT: "Tip: High levels cost more to traverse.",
            MINI_LB_COMMANDER: "Commander",
            MINI_LB_CYCLE: "Upgrade",
            MINI_LB_CREDITS: "Coins",
            HINT_RANK: "Clearance Lvl",
            HINT_CREDITS: "Money (Costs)",
            HINT_MOVES: "Fuel (Movement)",
            HINT_CYCLE: "Cooldowns",
            BTN_CLAIM: "CLAIM SECTOR",
            BTN_REWARD: "Reward: +Income & +1 Move",
            BTN_READY: "READY",
            SKIRMISH_OBJ: "Skirmish Objectives",
            SKIRMISH_COND: "Win Conditions",
            TUT_1_1_TASK: "Objective: Capture 3 Sectors",
            TUT_1_1_COST: "Cost: 100 Coins",
            TUT_1_1_REWARD: "Yields: +5 Income/Tick",
            TUT_1_1_GUIDE: "Move to and CLAIM the 3 highlighted hexes.",
            TUT_1_2_TASK: "Reach the Pyramid Apex",
            TUT_1_2_INTRO_TITLE: "STRUCTURAL HAZARD WARNING",
            TUT_1_2_INTRO_DESC: "The terrain ahead is critically unstable. You must navigate a path to the extraction point.\n\nOnly step on STABLE sectors. Damaged sectors will collapse instantly under your weight.\n\nNOTE: Your Rank protects you from shockwaves. Don't let it reach 0.",
            TUT_1_2_LEGEND_SAFE: "Stable (3 HP)",
            TUT_1_2_LEGEND_RISK: "Critical (1 HP)",
            TUT_1_3_TASK: "Build Foundation & Reach L2",
            TUT_1_3_INTRO_TITLE: "Construction Protocol: Verticality",
            TUT_1_3_INTRO_DESC: "You are isolated on a floating platform. The supports have collapsed.\n\nObjective: Rebuild the foundation (L1) around you, then upgrade ANY sector to Level 2.\n\nWARNING: Do not step into the Void.",
            TUT_1_3_REQ_LABEL: "L1 Supports Ready",
            TUT_1_3_ERROR_STAIRCASE: "UNSTABLE STRUCTURE! To build Level 2, you need 1 more neighbor at Level 1+.",
            TUT_1_4_TASK: "Reinforce The Bridge",
            TUT_1_4_INTRO_TITLE: "Protocol: Resource Cycle",
            TUT_1_4_INTRO_DESC: "Objective: UPGRADE the 3 HIGHLIGHTED bridge sectors to Level 2.\n\nPROBLEM: 'Cycle Lock' prevents rapid upgrades, and the bridge lacks structural support.\n\nSOLUTION: Use the widened bridge area to build supporting structures, and capture Debris Fields (L0) to charge your Cycle.",
            TUT_1_4_COUNTER: "Reinforced",
            TUT_1_5_TASK: "Deep Recovery Cycle",
            TUT_1_5_INTRO_TITLE: "Protocol: Rapid Extraction",
            TUT_1_5_INTRO_DESC: "CRITICAL: Life Support Failing.\n\nGoal: Accumulate 150 Coins in 60 Seconds.\n\nYou have minimal moves. You must exploit the 'Recovery' mechanic on high-level debris to generate movement fuel and credits.",
            TUT_1_5_TIMER_LABEL: "OXYGEN",
            TUT_1_6_TASK: "Reach Level 3",
            TUT_1_6_INTRO_TITLE: "Protocol: Cycle Lock",
            TUT_1_6_INTRO_DESC: "Objective: Upgrade 1 hex to Level 3.\n\nCONSTRAINT: Queue Size = 1.\n\nPROBLEM: You cannot upgrade the same sector twice in a row.\n\nSOLUTION: Alternate upgrades between two different sectors (Pattern A -> B -> A) to clear the Cycle Queue.",
            TUT_1_6_CYCLE_HINT: "Cycle Locked! Upgrade another hex first.",
        },
        TOOLTIP: {
            CURRENT_LOC: "Current Location",
            BLOCKED: "BLOCKED",
            NA: "N/A",
            REQ: "REQ",
            OCCUPIED: "OCCUPIED",
            PLAYER: "PLAYER"
        },
        TUTORIAL: {
            WELCOME_TITLE: "Training",
            WELCOME_DESC: "Goal: Reach Level 3. You must improve surrounding hexes to create a foundation for higher levels.",
            BTN_START: "Start",
            CAMERA_DESC: "Camera Control",
            CAMERA_HINT: "Note the flashing buttons below. Use them or right-click drag to rotate.",
            MOVE_A: "Walk to the flashing hex using move points by clicking on it.",
            MOVE_B: "Continue improving hexes to L1!",
            MOVE_CENTER: "One more upgrade left to reach the next level! Forward!",
            ACQUIRE: "Upgrade",
            ACQUIRE_DESC: "Improve the L0 hex to L1!",
            UPGRADE_L2: "Upgrade to Level 2",
            UPGRADE_L2_DESC: "Requires L1 Supports",
            FOUNDATION_TITLE: "Phase 2: Foundation",
            FOUNDATION_DESC: "Create a foundation of three L2 hexes for L3 growth! Don't forget upgrade points!",
            FOUNDATION_TASK: "Build 3x Level 2 Hexes",
            FINAL_TITLE: "Foundation Ready!",
            FINAL_DESC: "Return to the center and upgrade to Level 3 to complete mission.",
            NO_POINTS_TITLE: "No Upgrades",
            NO_POINTS_DESC: "No upgrade points. Capture new sectors (L0->L1) to gain upgrade points.",
            NO_POINTS_DESC_HINT: "Look for highlighted empty hexes.",
            NO_POINTS_HINT: "Look for highlighted empty hexes."
        },
        LEADERBOARD: {
            TITLE: "Hall of Fame",
            SUBTITLE: "Best Recorded Performance",
            BTN_BACK: "Back to Menu",
            HEADER_COMM: "Commander",
            HEADER_CREDITS: "Max Coins",
            HEADER_RANK: "Max Rank",
            EMPTY: "No records found."
        }
    },
    RU: {
        MENU: {
            TITLE: "HexQuest",
            SUBTITLE: "Протокол Расширения",
            CAMPAIGN: "Кампания",
            CAMPAIGN_SUB: "Сюжетный режим",
            SKIRMISH: "Схватка",
            SKIRMISH_SUB: "Быстрая игра",
            RESUME: "Продолжить",
            RESUME_SUB: "Вернуться в бой",
            LEADERBOARD: "Рекорды",
            LEADERBOARD_SUB: "Зал славы",
            END_SESSION: "Завершить",
            END_SESSION_SUB: "Покинуть карту",
            EXIT: "Выход",
            AUTH_GUEST: "Гость",
            AUTH_LOGIN: "Вход",
            AUTH_REGISTER: "Регистрация",
            MODAL_LOGIN_TITLE: "Авторизация",
            MODAL_REGISTER_TITLE: "Создание профиля",
            MODAL_GUEST_TITLE: "Гостевой вход",
            BTN_LOGIN: "Войти",
            BTN_REGISTER: "Создать",
            BTN_GUEST: "Играть как Гость",
            INPUT_NAME: "Позывной",
            INPUT_PASS: "Пароль",
            AUTH_AVATAR_COLOR: "Цвет интерфейса",
            AUTH_INSIGNIA: "Эмблема",
            CONFIG_TITLE: "Параметры Миссии",
            CONFIG_SUB: "Настройка сложности",
            DIFF_EASY: "Новичок",
            DIFF_MEDIUM: "Боец",
            DIFF_HARD: "Элита",
            BTN_START: "Начать",
            BTN_CANCEL: "Отмена",
            LOGOUT_CONFIRM: "Выход завершит текущую сессию. Прогресс будет сохранен.",
            ABANDON_CONFIRM: "Вы уверены? Весь несохраненный прогресс на карте будет утерян."
        },
        HUD: {
            RANK: "Ранг",
            MATERIAL: "Мат.",
            CREDITS: "Монеты",
            MOVES: "Ходы",
            LEADERBOARD_TITLE: "Топ Игроков",
            ABORT_TITLE: "Покинуть миссию?",
            ABORT_DESC: "Текущий прогресс в секторе будет потерян.",
            BTN_CANCEL: "Отмена",
            BTN_CONFIRM: "Выйти",
            VICTORY: "ПОБЕДА",
            DEFEAT: "ПОРАЖЕНИЕ",
            MISSION_COMPLETE: "Сектор зачищен. Отличная работа, командир.",
            MISSION_FAILED: "Задача провалена. Инициализация отхода...",
            WINNER: "Победитель",
            BTN_MENU: "В Меню",
            BTN_NEXT: "След. Уровень",
            BTN_RETRY: "Заново",
            BTN_VIEW_LEADERBOARD: "Таблица Рекордов",
            TIME: "Время",
            BRIEFING_RIVAL: "ВРАГ ОБНАРУЖЕН",
            BRIEFING_TITLE: "Брифинг",
            BRIEFING_TARGET_RANK: "Цель: Ранг",
            BRIEFING_TARGET_FUNDS: "Цель: Монеты",
            BRIEFING_BTN_START: "В БОЙ",
            HELP_RANK_DESC: "Ваш уровень доступа. Повышается при строительстве новых уровней гексов.",
            HELP_RANK_GOAL: "Цель: Ранг {0}",
            HELP_MAT_DESC: "Материалы нужны для строительства. Добываются раскопками (Dig) земли.",
            HELP_MAT_GOAL: "Ресурс для стройки",
            HELP_COINS_DESC: "Монеты оплачивают строительство и позволяют двигаться без ходов (5 мон = 1 ход).",
            HELP_COINS_GOAL: "Цель: {0} Мон.",
            HELP_MOVES_DESC: "Энергия движения. Восполняется при Апгрейде, Раскопках или Восстановлении (Recover).",
            HELP_MOVES_HINT: "Совет: Движение по высоким горам стоит дороже.",
            MINI_LB_COMMANDER: "Игрок",
            MINI_LB_CYCLE: "Апгрейд",
            MINI_LB_CREDITS: "Мон.",
            HINT_RANK: "Уровень Доступа",
            HINT_CREDITS: "Валюта",
            HINT_MOVES: "Топливо",
            HINT_CYCLE: "Перезарядка",
            BTN_CLAIM: "ЗАХВАТ",
            BTN_REWARD: "Награда: Ресурсы",
            BTN_READY: "ПОНЯТНО",
            SKIRMISH_OBJ: "Свободная игра",
            SKIRMISH_COND: "Наберите ресурсы для победы",
            TUT_1_1_TASK: "Захватите 3 Сектора",
            TUT_1_1_COST: "Цена: 100 Мон.",
            TUT_1_1_REWARD: "Доход: +5/сек",
            TUT_1_1_GUIDE: "Идите на подсвеченные клетки для захвата.",
            TUT_1_2_TASK: "Добраться до Вершины",
            TUT_1_2_INTRO_TITLE: "ОПАСНОСТЬ ОБРУШЕНИЯ",
            TUT_1_2_INTRO_DESC: "Земля нестабильна. Гексы 1-го уровня разрушаются, когда вы сходите с них.\n\nВысокий ранг служит вам БРОНЕЙ от ударных волн. Не дайте ему упасть до 0.",
            TUT_1_2_LEGEND_SAFE: "Надежно (3 HP)",
            TUT_1_2_LEGEND_RISK: "Опасно (1 HP)",
            TUT_1_3_TASK: "Построй Фундамент",
            TUT_1_3_INTRO_TITLE: "Правило: Опоры",
            TUT_1_3_INTRO_DESC: "Вы на острове.\n\nЦель: Поднимите любой сектор до 2 уровня.\n\nПРАВИЛО: Чтобы построить 2 этаж, нужно минимум 2 соседа 1 этажа (фундамент). Используйте выданные материалы.",
            TUT_1_3_REQ_LABEL: "Готовые опоры",
            TUT_1_3_ERROR_STAIRCASE: "ОПАСНО! Нужно больше соседей 1 уровня для опоры.",
            TUT_1_4_TASK: "Добыча Материалов",
            TUT_1_4_INTRO_TITLE: "Цикл Ресурсов",
            TUT_1_4_INTRO_DESC: "У вас нет материалов для стройки.\n\nРешение: Используйте РАСКОПКИ (красная кнопка) на высоких холмах, чтобы добыть материал.",
            TUT_1_4_COUNTER: "Укреплено",
            TUT_1_5_TASK: "Сбор Ресурсов",
            TUT_1_5_INTRO_TITLE: "Экстренная Ситуация",
            TUT_1_5_INTRO_DESC: "Кислород на исходе. Соберите 150 монет за 60 секунд.\n\nИспользуйте 'Восстановление' (синяя кнопка) на своих клетках, чтобы получить ресурсы.",
            TUT_1_5_TIMER_LABEL: "КИСЛОРОД",
            TUT_1_6_TASK: "Достигнуть 3 Уровня",
            TUT_1_6_INTRO_TITLE: "Блокировка Очереди",
            TUT_1_6_INTRO_DESC: "Нельзя улучшать одну и ту же клетку дважды подряд.\n\nЧередуйте стройку между двумя клетками, чтобы сбросить блокировку.",
            TUT_1_6_CYCLE_HINT: "Заблокировано! Улучши другую клетку.",
        },
        TOOLTIP: {
            CURRENT_LOC: "Вы здесь",
            BLOCKED: "НЕДОСТУПНО",
            NA: "-",
            REQ: "ТРЕБ",
            OCCUPIED: "ЗАНЯТО",
            PLAYER: "ИГРОК"
        },
        TUTORIAL: {
            WELCOME_TITLE: "Обучение",
            WELCOME_DESC: "Добро пожаловать, Командир. Следуйте инструкциям для освоения управления.",
            BTN_START: "Начать",
            CAMERA_DESC: "Камера",
            CAMERA_HINT: "Вращайте карту правой кнопкой мыши или кнопками внизу экрана.",
            MOVE_A: "Нажмите на клетку, чтобы двигаться.",
            MOVE_B: "Продолжайте движение к цели.",
            MOVE_CENTER: "Почти у цели. Вперед!",
            ACQUIRE: "Апгрейд",
            ACQUIRE_DESC: "Нажмите 'Улучшить', чтобы поднять уровень земли.",
            UPGRADE_L2: "Уровень 2",
            UPGRADE_L2_DESC: "Нужен фундамент вокруг.",
            FOUNDATION_TITLE: "Строительство",
            FOUNDATION_DESC: "Подготовьте площадку для высокого здания.",
            FOUNDATION_TASK: "Постройте 3 клетки 2 уровня",
            FINAL_TITLE: "Готово",
            FINAL_DESC: "Теперь можно строить 3 уровень в центре.",
            NO_POINTS_TITLE: "Нет Материалов",
            NO_POINTS_DESC: "Используйте Раскопки (Dig) для добычи.",
            NO_POINTS_DESC_HINT: "Ищите высокие холмы.",
            NO_POINTS_HINT: "Копайте здесь."
        },
        LEADERBOARD: {
            TITLE: "Зал Славы",
            SUBTITLE: "Лучшие Командиры",
            BTN_BACK: "Назад",
            HEADER_COMM: "Игрок",
            HEADER_CREDITS: "Монеты",
            HEADER_RANK: "Ранг",
            EMPTY: "Список пуст."
        }
    }
};
