
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
        CYCLE: string;
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
        HELP_RANK_DESC: string;
        HELP_RANK_GOAL: string;
        HELP_QUEUE_DESC: string;
        HELP_QUEUE_HINT: string;
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
            CYCLE: "Cycle",
            CREDITS: "Credits",
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
            BRIEFING_TARGET_FUNDS: "Target Funds",
            BRIEFING_BTN_START: "START MISSION",
            HELP_RANK_DESC: "Your Rank determines your maximum clearance level.",
            HELP_RANK_GOAL: "Goal: Rank",
            HELP_QUEUE_DESC: "You must rotate between {0} different sectors.",
            HELP_QUEUE_HINT: "Green dots show available upgrade points.",
            HELP_COINS_DESC: "Credits fund upgrades and can refuel movement.",
            HELP_COINS_GOAL: "Goal: {0} Credits",
            HELP_MOVES_DESC: "Moves are replenished by upgrading or recovering.",
            HELP_MOVES_HINT: "Tip: High levels cost more.",
            MINI_LB_COMMANDER: "Commander",
            MINI_LB_CYCLE: "Upgrade",
            MINI_LB_CREDITS: "Credits",
            HINT_RANK: "Clearance Lvl",
            HINT_CREDITS: "Money (Costs)",
            HINT_MOVES: "Fuel (Movement)",
            HINT_CYCLE: "Cooldowns",
            BTN_CLAIM: "CLAIM SECTOR",
            BTN_REWARD: "Reward: +Income & +1 Move",
            BTN_READY: "READY",
            TUT_1_1_TASK: "Objective: Expand Control",
            TUT_1_1_COST: "Cost: 100 Credits",
            TUT_1_1_REWARD: "Yields: +5 Income/Tick",
            TUT_1_1_GUIDE: "Move to highlighted zones",
            TUT_1_2_TASK: "Reach the Pyramid Apex",
            TUT_1_2_INTRO_TITLE: "STRUCTURAL HAZARD WARNING",
            TUT_1_2_INTRO_DESC: "The terrain ahead is critically unstable. You must navigate a path to the extraction point.\n\nOnly step on STABLE sectors. Damaged sectors will collapse instantly under your weight.",
            TUT_1_2_LEGEND_SAFE: "Stable (Safe)",
            TUT_1_2_LEGEND_RISK: "Critical (Do Not Step)",
            TUT_1_3_TASK: "Upgrade ANY to Level 2",
            TUT_1_3_INTRO_TITLE: "Construction Protocol: Verticality",
            TUT_1_3_INTRO_DESC: "You are isolated on a floating platform.\n\nObjective: Reinforce the foundation. Expand your territory, then upgrade ANY sector to Level 2.\n\nWARNING: Do not step into the Void.",
            TUT_1_3_REQ_LABEL: "L1 Supports Ready",
            TUT_1_3_ERROR_STAIRCASE: "UNSTABLE STRUCTURE! To build Level 2, you need 1 more neighbor at Level 1+.",
            TUT_1_4_TASK: "Reinforce The Bridge",
            TUT_1_4_INTRO_TITLE: "Protocol: Resource Cycle",
            TUT_1_4_INTRO_DESC: "Objective: UPGRADE the 3 HIGHLIGHTED bridge sectors to Level 2.\n\nPROBLEM: 'Cycle Lock' prevents rapid upgrades, and the bridge lacks structural support.\n\nSOLUTION: Use the widened bridge area to build supporting structures, and capture Debris Fields (L0) to charge your Cycle.",
            TUT_1_4_COUNTER: "Reinforced",
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
            HEADER_CREDITS: "Max Credits",
            HEADER_RANK: "Max Rank",
            EMPTY: "No records found."
        }
    },
    RU: {
        MENU: {
            TITLE: "HexQuest",
            SUBTITLE: "Протокол Расширения",
            CAMPAIGN: "Кампания",
            CAMPAIGN_SUB: "Обучение и История",
            SKIRMISH: "Схватка",
            SKIRMISH_SUB: "Настройка Симуляции",
            RESUME: "Продолжить",
            RESUME_SUB: "Вернуться в игру",
            LEADERBOARD: "Рекорды",
            LEADERBOARD_SUB: "Глобальный рейтинг",
            END_SESSION: "Завершить",
            END_SESSION_SUB: "Закрыть карту",
            EXIT: "Выход",
            AUTH_GUEST: "Гость",
            AUTH_LOGIN: "Вход",
            AUTH_REGISTER: "Рег-ция",
            MODAL_LOGIN_TITLE: "Терминал Доступа",
            MODAL_REGISTER_TITLE: "Новый Аккаунт",
            MODAL_GUEST_TITLE: "Гостевой Доступ",
            BTN_LOGIN: "Войти",
            BTN_REGISTER: "Создать",
            BTN_GUEST: "Войти как Гость",
            INPUT_NAME: "Позывной",
            INPUT_PASS: "Пароль",
            AUTH_AVATAR_COLOR: "Цвет Аватара",
            AUTH_INSIGNIA: "Эмблема",
            CONFIG_TITLE: "Настройка Миссии",
            CONFIG_SUB: "Выберите параметры операции",
            DIFF_EASY: "Кадет",
            DIFF_MEDIUM: "Ветеран",
            DIFF_HARD: "Элита",
            BTN_START: "Начать Миссию",
            BTN_CANCEL: "Отмена",
            LOGOUT_CONFIRM: "Выход завершит текущую сессию. Прогресс сохранен в профиле.",
            ABANDON_CONFIRM: "Вы уверены, что хотите завершить сессию? Карта будет закрыта."
        },
        HUD: {
            RANK: "Ранг",
            CYCLE: "Цикл",
            CREDITS: "Кредиты",
            MOVES: "Ходы",
            LEADERBOARD_TITLE: "Рейтинг",
            ABORT_TITLE: "Прервать Миссию?",
            ABORT_DESC: "Завершение сессии отключит вас от текущего сектора.",
            BTN_CANCEL: "Отмена",
            BTN_CONFIRM: "Выход",
            VICTORY: "ПОБЕДА",
            DEFEAT: "ПОРАЖЕНИЕ",
            MISSION_COMPLETE: "Кампания Завершена! Все сектора захвачены. Вы легенда.",
            MISSION_FAILED: "Цель провалена.",
            WINNER: "Победитель",
            BTN_MENU: "Меню",
            BTN_NEXT: "След. Сектор",
            BTN_RETRY: "Повторить",
            BTN_VIEW_LEADERBOARD: "К Рекордам",
            TIME: "Время",
            BRIEFING_RIVAL: "ОБНАРУЖЕН СОПЕРНИК",
            BRIEFING_TITLE: "Брифинг Миссии",
            BRIEFING_TARGET_RANK: "Целевой Ранг",
            BRIEFING_TARGET_FUNDS: "Целевой Капитал",
            BRIEFING_BTN_START: "НАЧАТЬ МИССИЮ",
            HELP_RANK_DESC: "Ранг определяет максимальный уровень доступа.",
            HELP_RANK_GOAL: "Цель: Ранг",
            HELP_QUEUE_DESC: "Необходимо чередовать {0} разных сектора для апгрейда.",
            HELP_QUEUE_HINT: "Зеленые точки показывают доступные очки.",
            HELP_COINS_DESC: "Кредиты нужны для улучшений и экстренного топлива.",
            HELP_COINS_GOAL: "Цель: {0} Кредитов",
            HELP_MOVES_DESC: "Ходы восполняются при улучшении или восстановлении.",
            HELP_MOVES_HINT: "Совет: Высокие уровни дороже в обслуживании.",
            MINI_LB_COMMANDER: "Командир",
            MINI_LB_CYCLE: "Апгрейд",
            MINI_LB_CREDITS: "Кр",
            HINT_RANK: "Уровень Доступа",
            HINT_CREDITS: "Валюта (Оплата)",
            HINT_MOVES: "Топливо (Движение)",
            HINT_CYCLE: "Откат Апгрейда",
            BTN_CLAIM: "ЗАХВАТИТЬ",
            BTN_REWARD: "Награда: +Доход и +1 Ход",
            BTN_READY: "ГОТОВ",
            TUT_1_1_TASK: "Задача: Расширение",
            TUT_1_1_COST: "Цена: 100 Кредитов",
            TUT_1_1_REWARD: "Доход: +5 Кр/Тик",
            TUT_1_1_GUIDE: "Идите в подсвеченные зоны",
            TUT_1_2_TASK: "Цель: Вершина Пирамиды",
            TUT_1_2_INTRO_TITLE: "ОПАСНОСТЬ ОБРУШЕНИЯ",
            TUT_1_2_INTRO_DESC: "Впереди нестабильная зона. Вы должны добраться до точки эвакуации.\n\nНаступайте только на ЦЕЛЫЕ сектора. Поврежденные сектора не выдержат ваш вес.",
            TUT_1_2_LEGEND_SAFE: "Стабильно (Безопасно)",
            TUT_1_2_LEGEND_RISK: "Критично (Не наступать)",
            TUT_1_3_TASK: "Цель: Любой до Уровня 2",
            TUT_1_3_INTRO_TITLE: "Протокол: Вертикальность",
            TUT_1_3_INTRO_DESC: "Вы изолированы на платформе.\n\nЦель: Укрепить фундамент. Расширьте территорию, затем улучшите ЛЮБОЙ сектор до 2 уровня.\n\nВНИМАНИЕ: Не наступайте в Пустоту (VOID).",
            TUT_1_3_REQ_LABEL: "Готовые опоры (L1)",
            TUT_1_3_ERROR_STAIRCASE: "НЕСТАБИЛЬНОСТЬ! Для Уровня 2 нужен еще 1 сосед уровня 1+.",
            TUT_1_4_TASK: "Укрепить Мост",
            TUT_1_4_INTRO_TITLE: "Протокол: Цикл Ресурсов",
            TUT_1_4_INTRO_DESC: "Цель: УЛУЧШИТЬ 3 ПОДСВЕЧЕННЫХ сектора моста до 2 уровня.\n\nПРОБЛЕМА: 'Блокировка Цикла' мешает быстрому апгрейду, а мост слишком узок для опор.\n\nРЕШЕНИЕ: Используйте расширенный мост для постройки опор и захватите Обломки (L0) для зарядки цикла.",
            TUT_1_4_COUNTER: "Укреплено",
        },
        TOOLTIP: {
            CURRENT_LOC: "Текущая позиция",
            BLOCKED: "ЗАБЛОКИРОВАНО",
            NA: "Н/Д",
            REQ: "ТРЕБ",
            OCCUPIED: "ЗАНЯТО",
            PLAYER: "ИГРОК"
        },
        TUTORIAL: {
            WELCOME_TITLE: "Обучение",
            WELCOME_DESC: "Сейчас необходимо достигнуть 3 уровня. Для роста улучшай гексы вокруг и создавай фундамент из 3 гексов одного уровня.",
            BTN_START: "Начать",
            CAMERA_DESC: "Вращение Камеры",
            CAMERA_HINT: "Обрати внимание на мигающие кнопки внизу. Они позволят тебе поворачивать карту.",
            MOVE_A: "Пройди на мигающий гекс используя очки ходов, просто нажав на него.",
            MOVE_B: "Продолжай улучшать гексы до 1 уровня дальше!",
            MOVE_CENTER: "Осталось еще одно улучшение для перехода на следующей уровень! Вперед!",
            ACQUIRE: "Апгрейд",
            ACQUIRE_DESC: "Улучши гекс 0 уровня до 1 уровня!",
            UPGRADE_L2: "Улучшить до Уровня 2",
            UPGRADE_L2_DESC: "Нужны опоры Ур.1",
            FOUNDATION_TITLE: "Фаза 2: Фундамент",
            FOUNDATION_DESC: "Создай из трёх гексов 2 уровня основание для роста 3 уровня! Не забудь про получение очков апгрейда!",
            FOUNDATION_TASK: "Подготовь 3 гекса 2 Уровня",
            FINAL_TITLE: "Фундамент Готов!",
            FINAL_DESC: "Вернитесь в центр и улучшите его до Уровня 3.",
            NO_POINTS_TITLE: "Нет Очков",
            NO_POINTS_DESC: "Нет очков апгрейда. Захватывай новые территории (L0->L1), чтобы получить очки апгрейда.",
            NO_POINTS_DESC_HINT: "Иди на подсветку за очками.",
            NO_POINTS_HINT: "Иди на подсветку за очками."
        },
        LEADERBOARD: {
            TITLE: "Зал Славы",
            SUBTITLE: "Лучшие результаты",
            BTN_BACK: "В Меню",
            HEADER_COMM: "Командир",
            HEADER_CREDITS: "Макс Кредиты",
            HEADER_RANK: "Макс Ранг",
            EMPTY: "Нет записей."
        }
    }
};
