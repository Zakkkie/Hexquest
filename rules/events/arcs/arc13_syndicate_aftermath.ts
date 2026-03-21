import { OverworldEvent } from '../../../types.ts';

// Arc 13 — Послевоенный Синдикат (Aftermath)
// Продолжает Arc 9. Требует флага war_ended.
//
// Flag chain:
//   war_ended → syndicate_aftermath_started
//     → (resistance_victory) → new_council_formed
//     → (voss_victory)       → voss_regime_stable
//
// Общие события (оба пути):
//   syndicate_tribunal        — трибунал, допрос о военных действиях (ROLL_DICE 0.6)
//   reckoning_of_the_street   — горожане требуют ответа у власти
//
// Путь A — Победа Сопротивления (reqFlag: resistance_victory):
//   aftermath_elena_council   — Елена просит помочь легитимизировать совет
//   rebuild_council_chamber   — восстановление зала (reqItem: data_disc, reqRepMin: 15)
//   new_council_vote          — финальное голосование → new_council_formed
//
// Путь B — Победа Восса (reqFlag: voss_victory):
//   voss_consolidation        — Восс укрепляет власть, предлагает место
//   captain_commission        — назначение (reqFlag: voss_knows_player | reqCredits: 300)
//   regime_ceremony           — церемония новой власти → voss_regime_stable

export const ARC13_EVENTS: Record<string, OverworldEvent> = {

  // ─── ОБЩЕЕ: Трибунал Синдиката ────────────────────────────────────────────

  syndicate_tribunal: {
    id: 'syndicate_tribunal',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/tribunal_hall/800/350',
        text: 'Бывший склад — наспех переоборудованный зал суда. За длинным столом трое судей: один в цветах Сопротивления, один в форме Синдиката, один без опознавательных знаков. «Вы присутствовали при ключевых событиях войны. Трибунал желает показаний.»',
        choices: [
          {
            label: 'Попытаться уйти незамеченным',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'escape_tribunal',
            failNode: 'caught_tribunal',
          },
          {
            label: 'Дать показания добровольно',
            action: 'GOTO_NODE',
            nextNode: 'testify_freely',
          },
          {
            label: 'Потребовать адвоката и тянуть время',
            action: 'GOTO_NODE',
            nextNode: 'demand_lawyer',
            reqRepMin: 10,
          },
        ],
      },
      escape_tribunal: {
        id: 'escape_tribunal',
        text: 'Пока судьи спорят о порядке допросов — вы через боковую дверь. Переулок. Свежий воздух. Трибунал потеряет неделю, разыскивая вас.',
        choices: [
          {
            label: 'Исчезнуть',
            action: 'CLOSE',
            setFlag: 'syndicate_aftermath_started',
            reward: { credits: 100 },
          },
        ],
      },
      caught_tribunal: {
        id: 'caught_tribunal',
        text: 'Охранник замечает вас. Часовой допрос. Синдикат ищет козла отпущения, Сопротивление — героя. В итоге отпускают, но со штрафом «за неуважение к суду».',
        choices: [
          {
            label: 'Выйти с достоинством',
            action: 'CLOSE',
            setFlag: 'syndicate_aftermath_started',
            penalty: { credits: 80, hp: 20 },
          },
        ],
      },
      testify_freely: {
        id: 'testify_freely',
        text: 'Говорите честно. Судьи слушают молча. Безликий делает пометки. В конце — краткая благодарность и компенсация «за сотрудничество».',
        choices: [
          {
            label: 'Принять исход',
            action: 'CLOSE',
            setFlag: 'syndicate_aftermath_started',
            reward: { credits: 60 },
            addReputation: 10,
          },
        ],
      },
      demand_lawyer: {
        id: 'demand_lawyer',
        text: 'Безликий судья едва заметно улыбается. «Разумно.» Заседание откладывается. Вы уходите без показаний и без последствий.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            setFlag: 'syndicate_aftermath_started',
            addReputation: 5,
          },
        ],
      },
    },
  },

  // ─── ОБЩЕЕ: Расчёт на улицах ──────────────────────────────────────────────

  reckoning_of_the_street: {
    id: 'reckoning_of_the_street',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/street_reckoning/800/350',
        text: 'Толпа у сожжённой администрации. Пожилая женщина держит портрет пропавшего сына. Торговец кричит о разграбленном складе. Все смотрят в разные стороны — и ни в одну конкретно.',
        choices: [
          {
            label: 'Остановиться и выслушать молча',
            action: 'GOTO_NODE',
            nextNode: 'listen_crowd',
          },
          {
            label: 'Сказать, что видели войну изнутри',
            action: 'GOTO_NODE',
            nextNode: 'speak_to_crowd',
            reqFlag: 'syndicate_aftermath_started',
            addReputation: 10,
          },
          {
            label: 'Уйти — это не ваш бой',
            action: 'CLOSE',
          },
        ],
      },
      listen_crowd: {
        id: 'listen_crowd',
        text: 'Час в толпе. Имена, которых не знали. Лица, которым нечего ждать от любой победы. Город живёт этими людьми, а не флагами.',
        choices: [
          {
            label: 'Уйти тише, чем пришли',
            action: 'CLOSE',
            addReputation: 5,
          },
        ],
      },
      speak_to_crowd: {
        id: 'speak_to_crowd',
        text: 'Несколько минут люди слушают. Вы не оправдываете ни одну сторону. Толпа расходится медленнее обычного. Торговец молча жмёт руку.',
        choices: [
          {
            label: 'Принять этот жест',
            action: 'CLOSE',
            addReputation: 15,
            reward: { credits: 40 },
          },
        ],
      },
    },
  },

  // ─── ПУТЬ A: Победа Сопротивления ─────────────────────────────────────────

  aftermath_elena_council: {
    id: 'aftermath_elena_council',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/elena_council/800/350',
        text: 'Елена — в бывшем офисе Синдиката, заваленном бумагами. «Победить войну легче, чем победить мир. Три квартала отказываются признавать временный совет. Мне нужен кто-то с репутацией — не военной.»',
        choices: [
          {
            label: 'Согласиться помочь',
            action: 'GOTO_NODE',
            nextNode: 'agree_help_elena',
            reqFlag: 'resistance_victory',
          },
          {
            label: 'Спросить — что конкретно нужно',
            action: 'GOTO_NODE',
            nextNode: 'ask_elena_details',
            reqFlag: 'resistance_victory',
          },
          {
            label: 'Отказаться — политика не ваш путь',
            action: 'CLOSE',
          },
        ],
      },
      ask_elena_details: {
        id: 'ask_elena_details',
        text: '«Зал городского совета разграблен. Без него нет легитимного места для голосования. Нужно восстановить здание.» Она кладёт список — в конце значится диск данных с городскими реестрами.',
        choices: [
          {
            label: 'Взяться за это',
            action: 'GOTO_NODE',
            nextNode: 'agree_help_elena',
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
      agree_help_elena: {
        id: 'agree_help_elena',
        text: '«Хорошо.» Елена впервые улыбается — не командирски. «Начни с зала совета. Реестры на диске данных — он разблокирует восстановительные фонды.»',
        choices: [
          {
            label: 'Приступить',
            action: 'CLOSE',
            setFlag: 'elena_council_mission_active',
            addReputation: 10,
          },
        ],
      },
    },
  },

  rebuild_council_chamber: {
    id: 'rebuild_council_chamber',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/council_chamber/800/350',
        text: 'Зал совета — выбитые окна, перевёрнутые кресла. Кости здания целы. Архитектор: «Восстановим за неделю, если будут городские реестры собственности. Без них — половина работ незаконна.»',
        choices: [
          {
            label: 'Передать диск данных с реестрами',
            action: 'GOTO_NODE',
            nextNode: 'disc_submitted',
            reqItem: 'data_disc',
            reqRepMin: 15,
          },
          {
            label: 'Помочь физически — убирать завалы',
            action: 'GOTO_NODE',
            nextNode: 'manual_labor',
            reqFlag: 'elena_council_mission_active',
          },
          {
            label: 'Уйти — не сейчас',
            action: 'CLOSE',
          },
        ],
      },
      disc_submitted: {
        id: 'disc_submitted',
        image: 'https://picsum.photos/seed/chamber_restored/800/350',
        text: 'Архитектор подключает диск. Реестры загружаются. «Три дня — и зал готов к заседанию.» Вы смотрите, как рабочие начинают убирать обломки. Что-то строится.',
        choices: [
          {
            label: 'Принять благодарность',
            action: 'CLOSE',
            setFlag: 'council_chamber_rebuilt',
            reward: { credits: 120, hp: 20 },
            addReputation: 20,
          },
        ],
      },
      manual_labor: {
        id: 'manual_labor',
        text: 'Четыре часа с лопатой и тачкой. К вечеру зал расчищен. Медленнее без реестров — но хоть что-то. Рабочие угощают из общего котла.',
        choices: [
          {
            label: 'Принять еду и отдохнуть',
            action: 'CLOSE',
            reward: { hp: 30, energy: 20 },
            addReputation: 8,
          },
        ],
      },
    },
  },

  new_council_vote: {
    id: 'new_council_vote',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/council_vote/800/350',
        text: 'Зал полон. Представители кварталов, торговцы, беженцы. Елена открывает заседание. Первое голосование за двадцать лет без диктата Синдиката. Напряжение можно резать ножом.',
        choices: [
          {
            label: 'Выступить за сбалансированный состав совета',
            action: 'GOTO_NODE',
            nextNode: 'support_balance',
            reqFlag: 'council_chamber_rebuilt',
            addReputation: 15,
          },
          {
            label: 'Молча наблюдать — дать людям решить самим',
            action: 'GOTO_NODE',
            nextNode: 'observe_vote',
          },
        ],
      },
      support_balance: {
        id: 'support_balance',
        text: '«Один человек — один голос. Ни Синдикат, ни Братство не владеют этим городом.» Тишина. Потом аплодисменты с задних рядов. Голосование проходит без блокировок.',
        choices: [
          {
            label: 'Принять итог',
            action: 'CLOSE',
            setFlag: 'new_council_formed',
            reward: { credits: 200 },
            addReputation: 25,
          },
        ],
      },
      observe_vote: {
        id: 'observe_vote',
        text: 'Долго. Шумно. Три перерыва. Два скандала. К вечеру — совет избран без вашего вмешательства. Именно так, как должно быть.',
        choices: [
          {
            label: 'Уйти с лёгким сердцем',
            action: 'CLOSE',
            setFlag: 'new_council_formed',
            reward: { credits: 150 },
            addReputation: 15,
          },
        ],
      },
    },
  },

  // ─── ПУТЬ B: Победа Восса ─────────────────────────────────────────────────

  voss_consolidation: {
    id: 'voss_consolidation',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/voss_hq_new/800/350',
        text: 'Штаб Синдиката изменился: охраны вдвое, флаги новые, портреты Восса на стенах. Адъютант у входа: «Командор ждёт. Война окончена — теперь реконструкция. Он предлагает вам участвовать.»',
        choices: [
          {
            label: 'Войти — принять предложение',
            action: 'GOTO_NODE',
            nextNode: 'enter_hq',
            reqFlag: 'voss_victory',
          },
          {
            label: 'Спросить — что предлагается',
            action: 'GOTO_NODE',
            nextNode: 'ask_offer',
            reqFlag: 'voss_victory',
          },
          {
            label: 'Развернуться и уйти',
            action: 'CLOSE',
            addReputation: 5,
          },
        ],
      },
      ask_offer: {
        id: 'ask_offer',
        text: '«Должность. Ресурсы. Доступ,» — говорит адъютант коротко. — «Командор ценит людей, умеющих решать. Вы доказали это. Отказ тоже запомнят.»',
        choices: [
          {
            label: 'Войти',
            action: 'GOTO_NODE',
            nextNode: 'enter_hq',
          },
          {
            label: 'Уйти — слишком высокая цена',
            action: 'CLOSE',
            addReputation: 10,
          },
        ],
      },
      enter_hq: {
        id: 'enter_hq',
        image: 'https://picsum.photos/seed/voss_office_postwar/800/350',
        text: 'Восс у окна, спиной. «Сопротивление сломлено. Но у страха долгая память. Мне нужны люди, которым доверяет улица. Ты один из них.» Это не просьба.',
        choices: [
          {
            label: 'Принять роль представителя нового порядка',
            action: 'CLOSE',
            setFlag: 'syndicate_aftermath_started',
            addReputation: -15,
            reward: { credits: 80 },
          },
        ],
      },
    },
  },

  captain_commission: {
    id: 'captain_commission',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/captain_rank/800/350',
        text: 'Церемониальный зал. Восс лично вручает назначения. Ваше имя — в списке. «Капитан третьего округа. Полномочия, жалованье, ответственность.» Адъютант шепчет: «Кого Командор знает лично — получают сразу. Остальные платят.»',
        choices: [
          {
            label: 'Принять — Восс знает вас лично',
            action: 'GOTO_NODE',
            nextNode: 'commission_earned',
            reqFlag: 'voss_knows_player',
          },
          {
            label: 'Заплатить за доступ к должности',
            action: 'GOTO_NODE',
            nextNode: 'commission_bought',
            reqCredits: 300,
          },
          {
            label: 'Отказаться',
            action: 'CLOSE',
            addReputation: 10,
          },
        ],
      },
      commission_earned: {
        id: 'commission_earned',
        image: 'https://picsum.photos/seed/captain_badge/800/350',
        text: 'Восс смотрит с чем-то похожим на уважение. «Ты доказал лояльность делом, не деньгами.» Знак капитана — тяжёлый металл, холодный. Зал аплодирует по команде.',
        choices: [
          {
            label: 'Принять знак',
            action: 'CLOSE',
            setFlag: 'voss_captain_appointed',
            addReputation: -10,
            reward: { credits: 150 },
          },
        ],
      },
      commission_bought: {
        id: 'commission_bought',
        text: 'Адъютант принимает платёж молча. Знак тот же — металл, вес, холод. Разница только в том, что вы знаете цену. В буквальном смысле.',
        choices: [
          {
            label: 'Надеть знак',
            action: 'CLOSE',
            setFlag: 'voss_captain_appointed',
            addReputation: -20,
            penalty: { credits: 300 },
            reward: { credits: 50 },
          },
        ],
      },
    },
  },

  regime_ceremony: {
    id: 'regime_ceremony',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/regime_ceremony/800/350',
        text: 'Центральная площадь. Марш. Флаги. Речь Восса — о порядке, стабильности, единстве. Одни аплодируют с облегчением, другие из страха. Вы в первом ряду приглашённых.',
        choices: [
          {
            label: 'Аплодировать — играть свою роль',
            action: 'GOTO_NODE',
            nextNode: 'applaud_regime',
            reqFlag: 'voss_captain_appointed',
          },
          {
            label: 'Стоять молча среди аплодирующих',
            action: 'GOTO_NODE',
            nextNode: 'silent_attendance',
          },
          {
            label: 'Найти кого-то из бывшего Сопротивления в толпе',
            action: 'GOTO_NODE',
            nextNode: 'find_resistance_remnant',
            reqFlag: 'syndicate_aftermath_started',
          },
        ],
      },
      applaud_regime: {
        id: 'applaud_regime',
        text: 'Восс замечает вас. Короткий кивок — признание. После церемонии — конверт с жалованьем и кодами доступа. Система работает. Вы — часть системы.',
        choices: [
          {
            label: 'Принять это',
            action: 'CLOSE',
            setFlag: 'voss_regime_stable',
            reward: { credits: 200 },
            addReputation: -25,
          },
        ],
      },
      silent_attendance: {
        id: 'silent_attendance',
        text: 'Никто не замечает молчания одного человека в толпе. За каждым словом Восса вы слышите другое слово — которое он не произносит. Уходите первым.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            setFlag: 'voss_regime_stable',
            reward: { credits: 150 },
            addReputation: -10,
          },
        ],
      },
      find_resistance_remnant: {
        id: 'find_resistance_remnant',
        text: 'В боковой улочке — знакомое лицо. Один из людей Елены. Он смотрит на вашу форму. Долгая пауза. «Значит, так.» Уходит не прощаясь.',
        choices: [
          {
            label: 'Вернуться на площадь',
            action: 'CLOSE',
            setFlag: 'voss_regime_stable',
            reward: { credits: 120 },
            addReputation: -30,
          },
        ],
      },
    },
  },

};
