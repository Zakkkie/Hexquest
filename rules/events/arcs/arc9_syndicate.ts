import { OverworldEvent } from '../../../types.ts';

// Arc 9 — Гражданская война Синдиката
// Flag chain: syndicate_war_aware → syndicate_chose_resistance|voss → war_ended → resistance_victory|voss_victory
// Reputation: Resistance path req rep ≥ 0, Voss path always open (−20 rep)
// Key items: SEALED_LETTER, EXILE_MARK, PILGRIM_TOKEN, RESISTANCE_BADGE, VOSS_COMMISSION

export const ARC9_EVENTS: Record<string, OverworldEvent> = {

  voss_first_decree: {
    id: 'voss_first_decree',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/voss_decree/800/350',
        text: 'На стенах каждого города — приказ с чеканным профилем командора: «Братство Дороги признаётся вне закона. Укрывательство — государственная измена. Подписано: Командор Восс.» Рядом с вами — паломник в сером плаще читает листовку дрожащими руками.',
        choices: [
          {
            label: 'Сорвать листовку — демонстративно',
            action: 'GOTO_NODE',
            nextNode: 'tear_down',
            addReputation: 20,
          },
          {
            label: 'Сказать паломнику, что знаете убежище',
            action: 'GOTO_NODE',
            nextNode: 'help_pilgrim',
            reqItem: 'PILGRIM_TOKEN',
            addReputation: 15,
          },
          {
            label: 'Промолчать и запомнить',
            action: 'CLOSE',
            setFlag: 'syndicate_war_aware',
          },
          {
            label: 'Донести на паломника',
            action: 'GOTO_NODE',
            nextNode: 'inform_on_pilgrim',
            addReputation: -30,
          },
        ],
      },
      tear_down: {
        id: 'tear_down',
        text: 'Трое солдат Синдиката видят вас. Минута напряжения. Потом один из них отводит взгляд. Второй — делает шаг назад. Никто не арестовывает. Паломник смотрит на вас с уважением и быстро уходит.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            setFlag: ['syndicate_war_aware', 'voss_knows_player'],
            addReputation: 5,
          },
        ],
      },
      help_pilgrim: {
        id: 'help_pilgrim',
        text: 'Паломник сжимает вашу руку. «Брат.» Он называет вам явку — таверна «Три перекрёстка» в болотном квартале. «Командир Елена ждёт людей, которым можно доверять.»',
        choices: [
          {
            label: 'Принять информацию',
            action: 'CLOSE',
            setFlag: ['syndicate_war_aware', 'resistance_contact_known'],
          },
        ],
      },
      inform_on_pilgrim: {
        id: 'inform_on_pilgrim',
        text: 'Солдаты забирают паломника. Вам платят пятьдесят кредитов. Жетон в вашем кармане становится холодным.',
        choices: [
          {
            label: 'Взять деньги',
            action: 'CLOSE',
            setFlag: 'syndicate_war_aware',
            reward: { credits: 50 },
            addReputation: -40,
          },
        ],
      },
    },
  },

  resistance_leader: {
    id: 'resistance_leader',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/resistance_elena/800/350',
        text: 'Таверна полупустая. Женщина за угловым столом — короткие волосы, шрам через левую щеку. «Елена,» — говорит она. — «Командир Сопротивления. Мне сказали, ты порвал указ Восса.» Её взгляд оценивает.',
        choices: [
          {
            label: 'Сказать, что готов бороться',
            action: 'GOTO_NODE',
            nextNode: 'join_resistance',
            reqRepMin: 0,
            setFlag: 'syndicate_war_aware',
          },
          {
            label: 'Спросить — что Сопротивление предлагает',
            action: 'GOTO_NODE',
            nextNode: 'ask_terms',
            reqFlag: 'syndicate_war_aware',
          },
          {
            label: 'Показать EXILE_MARK',
            action: 'GOTO_NODE',
            nextNode: 'show_exile_mark',
            reqItem: 'EXILE_MARK',
          },
        ],
      },
      join_resistance: {
        id: 'join_resistance',
        image: 'https://picsum.photos/seed/resistance_badge/800/350',
        text: 'Елена улыбается — коротко, не по-военному. «Нам нужны люди с репутацией. Не солдаты — разведчики.» Она кладёт на стол нагрудный знак — простой металлический диск с изображением дороги. «Добро пожаловать в Сопротивление.»',
        choices: [
          {
            label: 'Взять знак и вступить',
            action: 'CLOSE',
            setFlag: 'syndicate_chose_resistance',
            reward: { items: ['RESISTANCE_BADGE'] },
            addReputation: 20,
          },
        ],
      },
      ask_terms: {
        id: 'ask_terms',
        text: '«Свобода Братства. Конец монополии Синдиката. И — справедливость для жертв Каскада.» Елена пьёт из кружки. «Взамен — риск. Восс не простит. Но молчание — тоже выбор. Только чужой.»',
        choices: [
          {
            label: 'Принять условия',
            action: 'GOTO_NODE',
            nextNode: 'join_resistance',
          },
          {
            label: 'Подумать',
            action: 'CLOSE',
          },
        ],
      },
      show_exile_mark: {
        id: 'show_exile_mark',
        text: 'Елена смотрит на знак долго. «Это — личный символ Марко. Ты видел его?» Когда вы рассказываете — её взгляд темнеет. «Он был нашим. Значит, посмертно передал тебя мне.»',
        choices: [
          {
            label: 'Вступить в Сопротивление с двойным доверием',
            action: 'CLOSE',
            setFlag: 'syndicate_chose_resistance',
            reward: { items: ['RESISTANCE_BADGE'], credits: 50 },
            addReputation: 25,
          },
        ],
      },
    },
  },

  syndicate_spy_hunt: {
    id: 'syndicate_spy_hunt',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/spy_hunt/800/350',
        text: 'На рынке — незнакомый человек следит за вами уже час. Серая накидка, слишком новая для нищего. Слишком незаметная для торговца. Агент Синдиката.',
        choices: [
          {
            label: 'Оторваться в толпе',
            action: 'ROLL_DICE',
            probability: 0.65,
            successNode: 'lose_tail',
            failNode: 'caught',
          },
          {
            label: 'Остановиться и встретить его',
            action: 'GOTO_NODE',
            nextNode: 'confront_spy',
            addReputation: 10,
          },
          {
            label: 'Привести его к Елене (req RESISTANCE_BADGE)',
            action: 'GOTO_NODE',
            nextNode: 'lead_to_elena',
            reqItem: 'RESISTANCE_BADGE',
          },
        ],
      },
      lose_tail: {
        id: 'lose_tail',
        text: 'Узкие переулки, изменение маршрута. Слежка потеряна. Агент бродит в толпе, не зная, куда вы делись.',
        choices: [
          { label: 'Уйти', action: 'CLOSE' },
        ],
      },
      caught: {
        id: 'caught',
        text: 'Агент настигает вас. «Тебя хочет видеть Командор.» Краткий допрос — без насилия, но с давлением. Потом отпускают. Но теперь они знают о вас больше.',
        choices: [
          {
            label: 'Уйти с предупреждением',
            action: 'CLOSE',
            setFlag: 'voss_knows_player',
            penalty: { credits: 30 },
          },
        ],
      },
      confront_spy: {
        id: 'confront_spy',
        text: 'Агент удивлён — его не ожидали заметить. Разговор короткий. «Ты смелее, чем думали.» Он уходит. Но информация пошла куда надо — Елена ценит это.',
        choices: [
          {
            label: 'Доложить Елене',
            action: 'CLOSE',
            reqFlag: 'syndicate_chose_resistance',
            reward: { credits: 40 },
            addReputation: 10,
          },
          {
            label: 'Забыть об этом',
            action: 'CLOSE',
          },
        ],
      },
      lead_to_elena: {
        id: 'lead_to_elena',
        text: 'Сопротивление берёт агента аккуратно. Тот оказывается перебежчиком — хотел сменить сторону, но боялся просить. Теперь у Елены новый информатор.',
        choices: [
          {
            label: 'Принять благодарность',
            action: 'CLOSE',
            reward: { credits: 60 },
            addReputation: 15,
          },
        ],
      },
    },
  },

  resistance_sabotage: {
    id: 'resistance_sabotage',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/sabotage/800/350',
        text: 'Елена указывает на карте: «Склад снабжения у северного аванпоста. Без него — войска Восса не смогут держать блокаду три месяца. Нам нужно его уничтожить.» Миссия требует точности и скорости.',
        choices: [
          {
            label: 'Взяться за миссию',
            action: 'GOTO_NODE',
            nextNode: 'sabotage_approach',
            reqFlag: 'syndicate_chose_resistance',
          },
          {
            label: 'Отказаться — слишком рискованно',
            action: 'CLOSE',
            reqFlag: 'syndicate_chose_resistance',
          },
        ],
      },
      sabotage_approach: {
        id: 'sabotage_approach',
        text: 'Три пути к складу: через главные ворота, через канализацию, или с крыши соседнего здания.',
        choices: [
          {
            label: 'Главные ворота — используй VOSS_COMMISSION или убедительность',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'sabotage_done',
            failNode: 'sabotage_alarm',
          },
          {
            label: 'Канализация — медленно, но незаметно',
            action: 'GOTO_NODE',
            nextNode: 'sabotage_sewers',
          },
        ],
      },
      sabotage_sewers: {
        id: 'sabotage_sewers',
        image: 'https://picsum.photos/seed/sabotage_done/800/350',
        text: 'Темно, мокро, холодно. Полчаса через болотную воду. Но вы внутри. Склад горит. Уходите незамеченным.',
        choices: [
          {
            label: 'Вернуться к Елене',
            action: 'CLOSE',
            setFlag: 'resistance_sabotage_done',
            penalty: { hp: 15, energy: 20 },
            reward: { credits: 80 },
            addReputation: 20,
          },
        ],
      },
      sabotage_done: {
        id: 'sabotage_done',
        text: 'Смелость сработала. Охрана пропустила. Склад сгорает. Елена обнимает вас. «Это меняет войну.»',
        choices: [
          {
            label: 'Принять победу',
            action: 'CLOSE',
            setFlag: 'resistance_sabotage_done',
            reward: { credits: 100 },
            addReputation: 25,
          },
        ],
      },
      sabotage_alarm: {
        id: 'sabotage_alarm',
        text: 'Тревога. Бегство через задние ворота. Склад не уничтожен. Елена понимает — «В следующий раз лучше подготовимся.»',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            penalty: { hp: 30 },
          },
        ],
      },
    },
  },

  voss_informant_task: {
    id: 'voss_informant_task',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/voss_task/800/350',
        text: 'Агент Синдиката предлагает встречу в закрытой комнате. «Командор Восс хочет вас нанять. Лично. Вот условия.» Он кладёт запечатанный пакет. Внутри — список имён и приказ об их слежке.',
        choices: [
          {
            label: 'Принять задание Восса',
            action: 'GOTO_NODE',
            nextNode: 'accept_voss',
            addReputation: -20,
          },
          {
            label: 'Отказаться',
            action: 'GOTO_NODE',
            nextNode: 'refuse_voss',
            addReputation: 10,
          },
          {
            label: 'Принять, но передать информацию Елене',
            action: 'GOTO_NODE',
            nextNode: 'double_agent',
            reqFlag: 'syndicate_chose_resistance',
            addReputation: 15,
          },
        ],
      },
      accept_voss: {
        id: 'accept_voss',
        text: 'Агент кивает. «Умный выбор.» Вам выдают приказ Командора — официальную бумагу с личной печатью Восса. Это открывает двери в Синдикате.',
        choices: [
          {
            label: 'Принять комиссию',
            action: 'CLOSE',
            setFlag: 'syndicate_chose_voss',
            reward: { items: ['VOSS_COMMISSION'], credits: 80 },
          },
        ],
      },
      refuse_voss: {
        id: 'refuse_voss',
        text: 'Агент убирает пакет. «Вы отказались от благосклонности Командора. Это запомнят.» Он уходит. Но вы спокойны.',
        choices: [
          { label: 'Уйти', action: 'CLOSE' },
        ],
      },
      double_agent: {
        id: 'double_agent',
        text: 'Принять приказ — и передать список имён Елене. Имена — члены Сопротивления. Она эвакуирует их до ареста. Восс думает, что вы работаете на него.',
        choices: [
          {
            label: 'Играть обе роли',
            action: 'CLOSE',
            setFlag: ['syndicate_chose_resistance', 'double_agent_active'],
            reward: { credits: 60 },
            addReputation: 20,
          },
        ],
      },
    },
  },

  voss_confrontation: {
    id: 'voss_confrontation',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/voss_meeting/800/350',
        text: 'Командор Восс сидит за столом с видом на город. Он выглядит старше, чем на портретах. «Присядь,» — говорит он без предисловий. — «Ты стал проблемой. Но проблемы можно решать разными способами.»',
        choices: [
          {
            label: 'Обвинить его в Каскаде — у вас есть доказательства',
            action: 'GOTO_NODE',
            nextNode: 'accuse_cascade',
            reqFlag: 'resistance_has_proof',
            addReputation: 15,
          },
          {
            label: 'Предложить сотрудничество',
            action: 'GOTO_NODE',
            nextNode: 'offer_deal',
            addReputation: -10,
          },
          {
            label: 'Хранить молчание и слушать',
            action: 'GOTO_NODE',
            nextNode: 'listen_only',
          },
        ],
      },
      accuse_cascade: {
        id: 'accuse_cascade',
        image: 'https://picsum.photos/seed/voss_accused/800/350',
        text: 'Восс долго молчит. Потом — смотрит в окно. «Ты умнее, чем я думал.» Пауза. «Я не мог остановить Инженеров. Но позволил это. Разница — тонкая.» Впервые — он выглядит не командором. Просто усталым человеком.',
        choices: [
          {
            label: 'Потребовать его отставки публично',
            action: 'GOTO_NODE',
            nextNode: 'demand_resignation',
            addReputation: 25,
          },
          {
            label: 'Предложить тихую амнистию',
            action: 'GOTO_NODE',
            nextNode: 'offer_amnesty',
          },
        ],
      },
      offer_deal: {
        id: 'offer_deal',
        text: 'Восс слушает внимательно. Сделка возможна — но ценой предательства Елены. «Одно имя — и ты свободен.» Решение — ваше.',
        choices: [
          {
            label: 'Отдать имя — купить свободу',
            action: 'CLOSE',
            setFlag: 'syndicate_chose_voss',
            addReputation: -35,
            reward: { credits: 100 },
          },
          {
            label: 'Отказаться',
            action: 'GOTO_NODE',
            nextNode: 'demand_resignation',
            addReputation: 20,
          },
        ],
      },
      listen_only: {
        id: 'listen_only',
        text: 'Восс говорит долго. О порядке, о жертвах, об «необходимом зле». Вы слушаете. Потом говорите: «Зло не бывает необходимым.» Он отпускает вас.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            addReputation: 10,
          },
        ],
      },
      demand_resignation: {
        id: 'demand_resignation',
        text: 'Восс смотрит долго. «Ты смелый. Или безрассудный.» Потом — медленно встаёт. «Хорошо. Это — последний мой приказ.» Синдикат получает новый курс.',
        choices: [
          {
            label: 'Принять его решение',
            action: 'CLOSE',
            setFlag: 'voss_resigned',
            addReputation: 30,
            reward: { credits: 80 },
          },
        ],
      },
      offer_amnesty: {
        id: 'offer_amnesty',
        text: 'Восс кивает. «Тихий уход. Никто не узнает.» Это — не победа. Но это — мир.',
        choices: [
          {
            label: 'Принять компромисс',
            action: 'CLOSE',
            setFlag: 'voss_resigned',
            addReputation: 10,
            reward: { credits: 50 },
          },
        ],
      },
    },
  },

  syndicate_war_battle: {
    id: 'syndicate_war_battle',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/war_battle/800/350',
        text: 'Финальная схватка за городские ворота. Сопротивление vs Синдикат. Елена смотрит на вас: «Это решающий момент. Где ты?» Или — посланник Восса держит другой приказ.',
        choices: [
          {
            label: 'Встать с Сопротивлением',
            action: 'GOTO_NODE',
            nextNode: 'fight_resistance',
            reqFlag: 'syndicate_chose_resistance',
          },
          {
            label: 'Встать с Синдикатом',
            action: 'GOTO_NODE',
            nextNode: 'fight_syndicate',
            reqFlag: 'syndicate_chose_voss',
          },
          {
            label: 'Попытаться остановить битву переговорами',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'negotiate_peace',
            failNode: 'negotiate_fail_war',
          },
        ],
      },
      fight_resistance: {
        id: 'fight_resistance',
        image: 'https://picsum.photos/seed/resistance_wins/800/350',
        text: 'Ворота пали. Синдикат отступил. Елена поднимает флаг Братства. «Мы сделали это.» Восс скрылся. Но народ — свободен.',
        choices: [
          {
            label: 'Принять победу',
            action: 'CLOSE',
            setFlag: ['war_ended', 'resistance_victory'],
            addReputation: 35,
            reward: { credits: 120, hp: 30 },
          },
        ],
      },
      fight_syndicate: {
        id: 'fight_syndicate',
        text: 'Сопротивление разбито. Елена взята в плен. Восс восстанавливает власть. Ваша лояльность вознаграждена — но мир стал темнее.',
        choices: [
          {
            label: 'Принять награду',
            action: 'CLOSE',
            setFlag: ['war_ended', 'voss_victory'],
            addReputation: -40,
            reward: { credits: 200 },
          },
        ],
      },
      negotiate_peace: {
        id: 'negotiate_peace',
        text: 'Невероятно — обе стороны слышат вас. Краткое перемирие. Восс уходит в отставку. Сопротивление получает представительство. Компромисс без победителей — но и без жертв.',
        choices: [
          {
            label: 'Принять мир',
            action: 'CLOSE',
            setFlag: ['war_ended', 'peace_victory'],
            addReputation: 40,
            reward: { credits: 100, energy: 30 },
          },
        ],
      },
      negotiate_fail_war: {
        id: 'negotiate_fail_war',
        text: 'Никто не слушает. Битва начинается. Вам остаётся выбрать сторону в последнюю секунду.',
        choices: [
          {
            label: 'Встать с Сопротивлением',
            action: 'GOTO_NODE',
            nextNode: 'fight_resistance',
          },
          {
            label: 'Отступить от боя',
            action: 'CLOSE',
            penalty: { hp: 20 },
          },
        ],
      },
    },
  },

  war_aftermath: {
    id: 'war_aftermath',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/war_aftermath/800/350',
        text: 'Через несколько дней после битвы. Город изменился. Вы идёте по знакомым улицам — но уже другим.',
        choices: [
          {
            label: 'Навестить Елену (победа Сопротивления)',
            action: 'GOTO_NODE',
            nextNode: 'elena_epilogue',
            reqFlag: 'resistance_victory',
          },
          {
            label: 'Уйти без слов (победа Восса)',
            action: 'GOTO_NODE',
            nextNode: 'dark_ending',
            reqFlag: 'voss_victory',
          },
          {
            label: 'Присутствовать на мирных переговорах',
            action: 'GOTO_NODE',
            nextNode: 'peace_epilogue',
            reqFlag: 'peace_victory',
          },
        ],
      },
      elena_epilogue: {
        id: 'elena_epilogue',
        image: 'https://picsum.photos/seed/elena_free/800/350',
        text: 'Елена снимает военный знак. «Командиром больше не буду. Буду строить.» Она жмёт вашу руку. «Без тебя — ничего бы не было.» Где-то вдали — первые нормальные смех детей за много месяцев.',
        choices: [
          {
            label: 'Принять прощание',
            action: 'CLOSE',
            reward: { credits: 80, hp: 50 },
            addReputation: 20,
          },
        ],
      },
      dark_ending: {
        id: 'dark_ending',
        text: 'Город под флагом Синдиката. Меньше людей на улицах. Больше патрулей. Вы идёте быстро. Деньги жгут карман. Где-то вдали — тюремный конвой. Может, это Елена.',
        choices: [
          {
            label: 'Жить с этим',
            action: 'CLOSE',
          },
        ],
      },
      peace_epilogue: {
        id: 'peace_epilogue',
        text: 'За круглым столом — Елена и представитель нового Совета Синдиката. Вы — как свидетель. Переговоры медленные, трудные. Но идут. «Иногда победа — это просто разговор,» — говорит Елена.',
        choices: [
          {
            label: 'Принять это',
            action: 'CLOSE',
            reward: { credits: 60, hp: 30 },
            addReputation: 15,
          },
        ],
      },
    },
  },
};
