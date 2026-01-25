
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
            HELP_QUEUE_HINT: "Green dots show momentum.",
            HELP_COINS_DESC: "Credits fund upgrades and can refuel movement.",
            HELP_COINS_GOAL: "Goal: {0} Credits",
            HELP_MOVES_DESC: "Moves are replenished by upgrading or recovering.",
            HELP_MOVES_HINT: "Tip: High levels cost more.",
            MINI_LB_COMMANDER: "Commander",
            MINI_LB_CYCLE: "Cycle",
            MINI_LB_CREDITS: "Credits"
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
            NO_POINTS_TITLE: "Cycle Empty",
            NO_POINTS_DESC: "Continue upgrading other hexes to L2, but don't forget upgrade points!",
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
            HELP_QUEUE_HINT: "Зеленые точки показывают импульс.",
            HELP_COINS_DESC: "Кредиты нужны для улучшений и экстренного топлива.",
            HELP_COINS_GOAL: "Цель: {0} Кредитов",
            HELP_MOVES_DESC: "Ходы восполняются при улучшении или восстановлении.",
            HELP_MOVES_HINT: "Совет: Высокие уровни дороже в обслуживании.",
            MINI_LB_COMMANDER: "Командир",
            MINI_LB_CYCLE: "Цикл",
            MINI_LB_CREDITS: "Кр"
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
            NO_POINTS_DESC: "Нет заряда цикла. Захватывай новые территории (L0->L1), чтобы получить очки апгрейда.",
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
