import { OverworldEvent } from '../../../types.ts';

// Arc 11 — Путь Братства (Brotherhood of the Road)
// Flag chain: brotherhood_met_elena → brotherhood_safe_house_known → brotherhood_mission_accepted
//             → brotherhood_relic_delivered | brotherhood_betrayed_elena
// Reputation: Heroic path req rep ≥ 10; Elena trusts immediately if road_helped_pilgrim is set
// Flags from other arcs: voss_knows_player (Elena suspicious), road_helped_pilgrim (trust boost)
// Key items: silver_ring (trust token), data_disc (safe house key), ancient_relic (final reward)

export const ARC11_EVENTS: Record<string, OverworldEvent> = {

  // EVENT 1 — Первая встреча с Еленой (Brotherhood POV)
  brotherhood_crossroads: {
    id: 'brotherhood_crossroads',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/brotherhood_crossroads/800/350',
        text: 'Таверна «Три перекрёстка». Женщина за угловым столом — короткие волосы, шрам через левую щеку — смотрит на вас прежде, чем вы успеваете сесть. «Командир Елена,» — говорит она тихо. — «Братство Дороги. Я слышала о тебе.» Пауза. «Но слышала разное.»',
        choices: [
          {
            label: 'Показать серебряное кольцо — знак паломника',
            action: 'GOTO_NODE',
            nextNode: 'ring_trust',
            reqItem: 'silver_ring',
            addReputation: 15,
          },
          {
            label: '«Я помогал твоим людям на дороге» (нужна метка)',
            action: 'GOTO_NODE',
            nextNode: 'road_trust',
            reqFlag: 'road_helped_pilgrim',
            addReputation: 10,
          },
          {
            label: 'Молча представиться — без слов о прошлом',
            action: 'GOTO_NODE',
            nextNode: 'neutral_intro',
          },
          {
            label: 'Она права в подозрениях — вы работали на Синдикат',
            action: 'GOTO_NODE',
            nextNode: 'voss_shadow',
            reqFlag: 'voss_knows_player',
          },
        ],
      },
      ring_trust: {
        id: 'ring_trust',
        image: 'https://picsum.photos/seed/brotherhood_ring/800/350',
        text: 'Елена смотрит на кольцо. Её плечи чуть опускаются. «Это кольцо носил Марко. Мы думали, он погиб у Синдикатского поста.» Она накрывает кольцо ладонью. «Значит, ты шёл его дорогой. Добро пожаловать в Братство.»',
        choices: [
          {
            label: 'Вступить в Братство',
            action: 'CLOSE',
            setFlag: 'brotherhood_met_elena',
            penalty: { items: ['silver_ring'] },
            addReputation: 20,
            reward: { credits: 30 },
          },
        ],
      },
      road_trust: {
        id: 'road_trust',
        text: '«Паломники упоминали тебя. Сказали — ты не прошёл мимо.» Елена кивает коротко. «В Братстве не смотрят на прошлое. Смотрят, кто ты сейчас.» Она придвигает кружку через стол.',
        choices: [
          {
            label: 'Принять кружку и знакомство',
            action: 'CLOSE',
            setFlag: 'brotherhood_met_elena',
            addReputation: 15,
          },
        ],
      },
      neutral_intro: {
        id: 'neutral_intro',
        text: 'Елена изучает тебя долго. Потом: «Молчание — тоже ответ. Осторожность — не трусость.» Она называет явку в складском квартале. «Приходи, если решишься. Братство не торопит.»',
        choices: [
          {
            label: 'Запомнить явку',
            action: 'CLOSE',
            setFlag: 'brotherhood_met_elena',
          },
        ],
      },
      voss_shadow: {
        id: 'voss_shadow',
        text: 'Елена откидывается на спинку стула. «Значит, Восс знает твоё лицо. Это делает тебя обузой — или оружием. Пока не решила.» Она встаёт. «Принеси диск данных из архива Синдиката — тогда поговорим.»',
        choices: [
          {
            label: 'Принять условие',
            action: 'CLOSE',
            setFlag: 'brotherhood_met_elena',
            addReputation: -5,
          },
          {
            label: 'Отказаться и уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  // EVENT 2 — Патруль у тайного склада (проникновение с кубиком удачи)
  brotherhood_patrol: {
    id: 'brotherhood_patrol',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/brotherhood_patrol/800/350',
        text: 'У входа в складской квартал — двое солдат Синдиката. Патруль новый: после декрета о запрете Братства проходы проверяют дважды в час. Внутри — явка, где ждут свежие сведения для Елены.',
        choices: [
          {
            label: 'Прокрасться мимо патруля',
            action: 'ROLL_DICE',
            probability: 0.60,
            successNode: 'sneak_success',
            failNode: 'sneak_caught',
          },
          {
            label: 'Предъявить диск данных как «технический пропуск»',
            action: 'GOTO_NODE',
            nextNode: 'disc_pass',
            reqItem: 'data_disc',
          },
          {
            label: 'Подождать смены — потерять час',
            action: 'GOTO_NODE',
            nextNode: 'wait_shift',
          },
        ],
      },
      sneak_success: {
        id: 'sneak_success',
        image: 'https://picsum.photos/seed/brotherhood_inside/800/350',
        text: 'Тень за штабелями ящиков. Шаги — тихо. Патруль прошёл в метре, не заметил. Вы внутри. На явке вас ждёт связной Братства с картой безопасного дома.',
        choices: [
          {
            label: 'Получить карту и уйти',
            action: 'CLOSE',
            setFlag: 'brotherhood_safe_house_known',
            addReputation: 10,
          },
        ],
      },
      sneak_caught: {
        id: 'sneak_caught',
        text: 'Вас замечают. Короткий допрос у стены. «Куда идёшь?» Вы называете вымышленный адрес. Солдат не верит, но отпускает с предупреждением. Явка провалена на сегодня.',
        choices: [
          {
            label: 'Отступить и попробовать позже',
            action: 'CLOSE',
            setFlag: 'voss_knows_player',
            penalty: { hp: 10, energy: 15 },
          },
        ],
      },
      disc_pass: {
        id: 'disc_pass',
        text: 'Солдат сканирует диск. «Технический персонал — проходи.» Коды Синдиката работают. Вы внутри без риска. Связной Братства удивлён: «Где достал такой диск?» Вы не отвечаете.',
        choices: [
          {
            label: 'Забрать карту безопасного дома',
            action: 'CLOSE',
            setFlag: 'brotherhood_safe_house_known',
            penalty: { items: ['data_disc'] },
            addReputation: 15,
          },
        ],
      },
      wait_shift: {
        id: 'wait_shift',
        text: 'Час в подворотне. Холодно. Смена приходит позже, чем ожидалось. Но вы внутри. Связной рад: «Ты терпелив. Это редкость.»',
        choices: [
          {
            label: 'Получить карту',
            action: 'CLOSE',
            setFlag: 'brotherhood_safe_house_known',
            penalty: { energy: 20 },
          },
        ],
      },
    },
  },

  // EVENT 3 — Елена раскрывает миссию (выбор пути + репутационный порог)
  brotherhood_mission: {
    id: 'brotherhood_mission',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/brotherhood_mission/800/350',
        text: 'Безопасный дом — подвал под сапожной мастерской. Елена раскладывает на столе две карты. «Архив Строителей. Синдикат не знает, что он здесь. Диск данных откроет вход.» Она смотрит на тебя. «Но мне нужно знать — ты с нами до конца?»',
        choices: [
          {
            label: 'Принять миссию — путь Братства',
            action: 'GOTO_NODE',
            nextNode: 'accept_mission',
            reqFlag: 'brotherhood_safe_house_known',
            reqRepMin: 10,
            addReputation: 10,
          },
          {
            label: 'Принять миссию — без условий репутации',
            action: 'GOTO_NODE',
            nextNode: 'accept_simple',
            reqFlag: 'brotherhood_safe_house_known',
          },
          {
            label: 'Спросить — что в архиве Строителей',
            action: 'GOTO_NODE',
            nextNode: 'ask_archive',
          },
          {
            label: 'Передать информацию Синдикату',
            action: 'GOTO_NODE',
            nextNode: 'betray_start',
          },
        ],
      },
      accept_mission: {
        id: 'accept_mission',
        image: 'https://picsum.photos/seed/brotherhood_oath/800/350',
        text: 'Елена кивает — не просто как командир, а как человек. «Это — не приказ. Это доверие.» Она передаёт тебе диск данных с кодом входа. «Доставь реликвию в архив. Братство не забывает своих.»',
        choices: [
          {
            label: 'Взять диск и принять миссию',
            action: 'CLOSE',
            setFlag: 'brotherhood_mission_accepted',
            reward: { items: ['data_disc'], credits: 40 },
            addReputation: 15,
          },
        ],
      },
      accept_simple: {
        id: 'accept_simple',
        text: '«Не знаю твоего прошлого,» — говорит Елена. — «Но ты здесь. Этого пока достаточно.» Она вручает тебе диск данных. «Архив — три улицы на север. Стража меняется на рассвете.»',
        choices: [
          {
            label: 'Принять задание',
            action: 'CLOSE',
            setFlag: 'brotherhood_mission_accepted',
            reward: { items: ['data_disc'] },
          },
        ],
      },
      ask_archive: {
        id: 'ask_archive',
        text: '«Чертежи Строителей. Технологии до Каскада,» — отвечает Елена. — «Если Синдикат найдёт их первым — это оружие. Если Орден — это знание. Если мы — это свобода. Разница имеет значение.»',
        choices: [
          {
            label: 'Принять миссию после объяснения',
            action: 'GOTO_NODE',
            nextNode: 'accept_simple',
          },
          {
            label: 'Подумать — уйти без ответа',
            action: 'CLOSE',
          },
        ],
      },
      betray_start: {
        id: 'betray_start',
        text: 'Елена смотрит на тебя. Долго. Потом закрывает карту. «Выход — там.» Тихо. Без злобы. Это хуже.',
        choices: [
          {
            label: 'Уйти и донести Синдикату',
            action: 'CLOSE',
            setFlag: 'brotherhood_betrayed_elena',
            addReputation: -40,
            reward: { credits: 80 },
          },
          {
            label: 'Остановиться у двери — вернуться',
            action: 'GOTO_NODE',
            nextNode: 'accept_simple',
            addReputation: 5,
          },
        ],
      },
    },
  },

  // EVENT 4 — Доставка реликвии в архив Строителей
  brotherhood_archive: {
    id: 'brotherhood_archive',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/brotherhood_archive/800/350',
        text: 'Вход в архив Строителей — замаскированная дверь в фундаменте старого акведука. Диск данных вставляется в паз замка. Механизм приходит в движение впервые за, возможно, десятилетия.',
        choices: [
          {
            label: 'Открыть архив диском данных',
            action: 'GOTO_NODE',
            nextNode: 'archive_open',
            reqItem: 'data_disc',
            reqFlag: 'brotherhood_mission_accepted',
          },
          {
            label: 'Взломать замок без диска (риск тревоги)',
            action: 'ROLL_DICE',
            probability: 0.40,
            successNode: 'archive_forced',
            failNode: 'archive_alarm',
          },
          {
            label: 'Осмотреть вход — ничего не трогать',
            action: 'GOTO_NODE',
            nextNode: 'archive_observe',
          },
        ],
      },
      archive_open: {
        id: 'archive_open',
        image: 'https://picsum.photos/seed/brotherhood_builder/800/350',
        text: 'Внутри — высокие своды, полки с кристаллическими носителями, рабочие столы нетронуты. В центре — алтарь с выемкой в форме реликвии. Братство знало об этом месте. Строители проектировали его для них.',
        choices: [
          {
            label: 'Поместить реликвию в алтарь',
            action: 'GOTO_NODE',
            nextNode: 'relic_placed',
            reqItem: 'ancient_relic',
          },
          {
            label: 'Исследовать архив — не трогать алтарь',
            action: 'GOTO_NODE',
            nextNode: 'explore_archive',
          },
        ],
      },
      relic_placed: {
        id: 'relic_placed',
        image: 'https://picsum.photos/seed/brotherhood_light/800/350',
        text: 'Реликвия входит в паз с мягким щелчком. Кристаллические полки начинают светиться. Проекция Строителя — голос из прошлого: «Сеть активирована. Узел Трёх Перекрёстков — онлайн.» Архив открыт для Братства. Елена будет рада.',
        choices: [
          {
            label: 'Вернуться к Елене с вестью',
            action: 'CLOSE',
            setFlag: 'brotherhood_relic_delivered',
            penalty: { items: ['ancient_relic', 'data_disc'] },
            addReputation: 30,
            reward: { credits: 100, energy: 25 },
          },
        ],
      },
      explore_archive: {
        id: 'explore_archive',
        text: 'Носители хранят карты дорог до Каскада, списки убежищ, имена Строителей. Часть информации — о Пустоте и о том, как её остановить. Это не просто архив. Это — план выживания.',
        choices: [
          {
            label: 'Поместить реликвию — активировать архив',
            action: 'GOTO_NODE',
            nextNode: 'relic_placed',
            reqItem: 'ancient_relic',
          },
          {
            label: 'Забрать один носитель и уйти',
            action: 'CLOSE',
            setFlag: 'brotherhood_relic_delivered',
            penalty: { items: ['data_disc'] },
            reward: { credits: 60 },
            addReputation: 10,
          },
        ],
      },
      archive_forced: {
        id: 'archive_forced',
        text: 'Замок взломан — грубо, но тихо. Внутри холоднее, чем должно быть. Без диска данных архив распознаёт нарушителя: половина полок заблокирована. Только часть знания — ваша.',
        choices: [
          {
            label: 'Взять что можно и уйти',
            action: 'CLOSE',
            penalty: { hp: 15 },
            reward: { credits: 50 },
          },
        ],
      },
      archive_alarm: {
        id: 'archive_alarm',
        text: 'Замок сопротивляется — и кричит. Не звуком, а сигналом. Синдикатский патруль появится через минуту. Бегство обязательно.',
        choices: [
          {
            label: 'Бежать',
            action: 'CLOSE',
            setFlag: 'voss_knows_player',
            penalty: { hp: 25, energy: 20 },
          },
        ],
      },
      archive_observe: {
        id: 'archive_observe',
        text: 'Вокруг двери — старые знаки Строителей. Один символ — открытая ладонь. Это не просто архив. Это передача от одной эпохи к следующей. Диск данных, который вы несёте, — ключ. Буквально.',
        choices: [
          {
            label: 'Открыть дверь диском',
            action: 'GOTO_NODE',
            nextNode: 'archive_open',
            reqItem: 'data_disc',
          },
          {
            label: 'Уйти — ещё не время',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  // EVENT 5 — Развязка: Братство воздаёт
  brotherhood_epilogue: {
    id: 'brotherhood_epilogue',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/brotherhood_epilogue/800/350',
        text: 'Таверна «Три перекрёстка». Людей больше, чем раньше: паломники, дорожные торговцы, несколько людей без знаков фракций — но с кольцами на пальцах. Братство здесь. Елена встаёт, когда видит вас.',
        choices: [
          {
            label: 'Принять признание Братства (реликвия доставлена)',
            action: 'GOTO_NODE',
            nextNode: 'hero_ending',
            reqFlag: 'brotherhood_relic_delivered',
          },
          {
            label: 'Объяснить — архив найден, но реликвия не доставлена',
            action: 'GOTO_NODE',
            nextNode: 'partial_ending',
            reqFlag: 'brotherhood_mission_accepted',
            reqFlagAbsent: 'brotherhood_relic_delivered',
          },
          {
            label: 'Смотреть на Елену — ты предал их',
            action: 'GOTO_NODE',
            nextNode: 'betrayal_ending',
            reqFlag: 'brotherhood_betrayed_elena',
          },
        ],
      },
      hero_ending: {
        id: 'hero_ending',
        image: 'https://picsum.photos/seed/brotherhood_victory/800/350',
        text: '«Узел Трёх Перекрёстков активен,» — говорит Елена перед всеми. — «Это значит — сеть убежищ Строителей жива. Братство больше не бездомное.» Она смотрит на тебя. «Ты не просто шёл нашей дорогой. Ты её проложил заново.»',
        choices: [
          {
            label: 'Принять реликвию Братства как благодарность',
            action: 'CLOSE',
            addReputation: 35,
            reward: { items: ['ancient_relic'], credits: 120, hp: 30 },
          },
        ],
      },
      partial_ending: {
        id: 'partial_ending',
        text: '«Архив найден — это уже победа,» — говорит Елена. — «Реликвия найдёт свой путь.» Она жмёт твою руку. «Братство помнит тех, кто шёл.»',
        choices: [
          {
            label: 'Принять благодарность',
            action: 'CLOSE',
            addReputation: 15,
            reward: { credits: 60 },
          },
        ],
      },
      betrayal_ending: {
        id: 'betrayal_ending',
        text: 'Елена смотрит на тебя через зал. Не с ненавистью. С усталостью. «Дороги, которые мы выбираем, остаются с нами.» Она отворачивается. Братство не преследует. Но не забывает.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            addReputation: -35,
          },
        ],
      },
    },
  },

};
