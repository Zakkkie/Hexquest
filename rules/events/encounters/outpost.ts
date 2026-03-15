import { OverworldEvent } from '../../../types.ts';

export const OUTPOST_ENCOUNTERS: Record<string, OverworldEvent> = {

  outpost_corrupt_captain: {
    id: 'outpost_corrupt_captain',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outpost_corrupt_captain/800/350',
        text: 'Капитан поста — грузный мужчина с хитрыми глазами — предлагает «неофициальное сотрудничество». «Я закрываю глаза на кое-что. Ты делишься тем, что знаешь о Братстве. Все довольны.»',
        choices: [
          {
            label: 'Предать информацию о Братстве',
            action: 'GOTO_NODE',
            nextNode: 'betrayed',
            addReputation: -15,
          },
          {
            label: 'Дать взятку Комиссией Восса',
            action: 'GOTO_NODE',
            nextNode: 'voss_bribe',
            reqItem: 'VOSS_COMMISSION',
          },
          {
            label: 'Отказаться',
            action: 'GOTO_NODE',
            nextNode: 'refused',
          },
        ],
      },
      betrayed: {
        id: 'betrayed',
        text: 'Капитан доволен. Вы получаете деньги и пропуск. Где-то в Братстве кто-то попадёт под арест из-за ваших слов. Вы стараетесь не думать об этом.',
        choices: [
          {
            label: 'Взять деньги и уйти',
            action: 'CLOSE',
            reward: { credits: 60 },
            setFlag: 'brotherhood_betrayed',
          },
        ],
      },
      voss_bribe: {
        id: 'voss_bribe',
        text: 'Капитан смотрит на Комиссию Восса и бледнеет. Это документ, подписанный его прямым начальством. Он мгновенно теряет весь лоск. «П-проходите. Ничего не было.»',
        choices: [
          {
            label: 'Пройти с достоинством',
            action: 'CLOSE',
            reward: { energy: 3 },
          },
        ],
      },
      refused: {
        id: 'refused',
        text: 'Капитан сжимает зубы. «Пожалеешь. Этот пост запомнит твоё лицо.» Вам дают проход, но под пристальным взглядом каждого солдата.',
        choices: [
          {
            label: 'Уйти с прямой спиной',
            action: 'CLOSE',
            setFlag: 'outpost_captain_enemy',
            addReputation: 5,
          },
        ],
      },
    },
  },

  outpost_double_agent: {
    id: 'outpost_double_agent',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outpost_double_agent/800/350',
        text: 'Молодой лейтенант отводит вас в сторону. Нервно оглядывается. «Вы не из Синдиката. Я вижу. Я тоже — нет. Уже три месяца. Мне нужна помощь с выходом.»',
        choices: [
          {
            label: 'Помочь лейтенанту дезертировать',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'helped_deserter',
            failNode: 'caught',
            addReputation: 8,
          },
          {
            label: 'Сообщить командованию о двойном агенте',
            action: 'GOTO_NODE',
            nextNode: 'reported',
            addReputation: -12,
          },
          {
            label: 'Отказаться — слишком опасно',
            action: 'CLOSE',
          },
        ],
      },
      helped_deserter: {
        id: 'helped_deserter',
        text: 'Операция прошла чисто. Лейтенант исчезает в ночи. Перед уходом передаёт вам план внутренней охраны поста и коды патрулей.',
        choices: [
          {
            label: 'Принять информацию',
            action: 'CLOSE',
            reward: { credits: 40, energy: 3 },
            setFlag: 'outpost_codes_known',
          },
        ],
      },
      caught: {
        id: 'caught',
        text: 'Кто-то видит. Тревога. Вам едва удаётся уйти — лейтенант, похоже, задержан. Вы не знаете, что с ним будет.',
        choices: [
          {
            label: 'Бежать',
            action: 'CLOSE',
            penalty: { hp: 20, energy: 4 },
          },
        ],
      },
      reported: {
        id: 'reported',
        text: 'Лейтенанта арестовывают на ваших глазах. Капитан жмёт вам руку. «Синдикат ценит таких граждан.» Деньги в кармане. Тошнота — в желудке.',
        choices: [
          {
            label: 'Взять вознаграждение',
            action: 'CLOSE',
            reward: { credits: 50 },
            setFlag: 'syndicate_informant',
            addReputation: -12,
          },
        ],
      },
    },
  },

  outpost_prisoner_rescue: {
    id: 'outpost_prisoner_rescue',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outpost_prisoner_rescue/800/350',
        text: 'Через решётку подвального окна — шёпот: «Помоги. Я не виновен. Братство знает обо мне.» Заключённый выглядит измученно. В коридоре — шаги патруля.',
        choices: [
          {
            label: 'Попытаться освободить заключённого',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'freed',
            failNode: 'caught',
            addReputation: 10,
          },
          {
            label: 'Показать Метку Изгоя — дать надежду',
            action: 'GOTO_NODE',
            nextNode: 'mark_shown',
            reqItem: 'EXILE_MARK',
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      freed: {
        id: 'freed',
        text: 'Заключённый свободен. Он уходит через чёрный ход. «Найди Братство — скажи, что Эдан жив. Они отблагодарят.» Имя остаётся в памяти.',
        choices: [
          {
            label: 'Запомнить имя',
            action: 'CLOSE',
            setFlag: 'edan_freed',
            reward: { energy: 3 },
            addReputation: 10,
          },
        ],
      },
      caught: {
        id: 'caught',
        text: 'Патруль замечает вас у решётки. Задержание. Долгий допрос. В конце концов отпускают — за отсутствием доказательств. Но данные занесены в журнал.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            penalty: { energy: 4, credits: 20 },
          },
        ],
      },
      mark_shown: {
        id: 'mark_shown',
        text: 'Заключённый смотрит на Метку. «Ты один из нас. Слушай — в третьей комнате слева хранят конфискованные вещи. Там кое-что важное для Братства.»',
        choices: [
          {
            label: 'Запомнить подсказку',
            action: 'CLOSE',
            setFlag: 'outpost_stash_location',
          },
          {
            label: 'Попытаться сразу добраться до комнаты',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'stash_found',
            failNode: 'caught',
          },
        ],
      },
      stash_found: {
        id: 'stash_found',
        text: 'В комнате — несколько конфискованных предметов Братства. Вы берёте наиболее ценное и уходите незамеченным.',
        choices: [
          {
            label: 'Уйти с добычей',
            action: 'CLOSE',
            reward: { credits: 45, items: ['RESISTANCE_BADGE'] },
          },
        ],
      },
    },
  },

  outpost_supply_theft: {
    id: 'outpost_supply_theft',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outpost_supply_theft/800/350',
        text: 'Склад поста охраняется слабо. Внутри — провизия Синдиката, предназначенная для гарнизона. Страж дремлет у входа.',
        choices: [
          {
            label: 'Отвлечь стража и проникнуть на склад',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'stolen',
            failNode: 'caught',
          },
          {
            label: 'Не рисковать',
            action: 'CLOSE',
          },
        ],
      },
      stolen: {
        id: 'stolen',
        text: 'Вы уходите с полными руками. Страж так и не проснулся. Провизия пригодится — или можно раздать нуждающимся.',
        choices: [
          {
            label: 'Оставить себе',
            action: 'CLOSE',
            reward: { items: ['SUPPLIES'], credits: 20 },
          },
          {
            label: 'Раздать деревенским',
            action: 'CLOSE',
            addReputation: 8,
            reward: { energy: 3 },
          },
        ],
      },
      caught: {
        id: 'caught',
        text: 'Страж просыпается в самый неподходящий момент. Тревога. Вы едва успеваете уйти, бросив часть добычи.',
        choices: [
          {
            label: 'Бежать',
            action: 'CLOSE',
            penalty: { hp: 15, energy: 3 },
          },
        ],
      },
    },
  },

  outpost_loyalty_test: {
    id: 'outpost_loyalty_test',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outpost_loyalty_test/800/350',
        text: 'Офицер в штатском проводит вас в отдельную комнату. «Простая проверка. Мы хотим знать, кому вы служите.» Перед вами кладут список имён. «Отметьте тех, кого знаете как врагов Синдиката.»',
        choices: [
          {
            label: 'Отметить реальных противников Синдиката',
            action: 'GOTO_NODE',
            nextNode: 'real_names',
            addReputation: -20,
          },
          {
            label: 'Написать случайные имена',
            action: 'GOTO_NODE',
            nextNode: 'fake_names',
          },
          {
            label: 'Отказаться заполнять список',
            action: 'GOTO_NODE',
            nextNode: 'refused',
            addReputation: 8,
          },
        ],
      },
      real_names: {
        id: 'real_names',
        text: 'Офицер доволен. Список уходит наверх. Те, чьи имена вы написали, будут арестованы. Деньги в кармане жгут.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            reward: { credits: 60 },
            setFlag: 'syndicate_collaborator',
          },
        ],
      },
      fake_names: {
        id: 'fake_names',
        text: 'Синдикат арестует нескольких ни в чём не повинных людей по вашему списку. Невинные пострадают. Но вы живы и свободны.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            reward: { credits: 30 },
            penalty: { hp: 5 },
          },
        ],
      },
      refused: {
        id: 'refused',
        text: 'Офицер хмурится. «Неразумно.» Вас выводят из поста под конвоем — и выгоняют за периметр. Без объяснений. Но совесть чиста.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  outpost_deserter_plea: {
    id: 'outpost_deserter_plea',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outpost_deserter_plea/800/350',
        text: 'На выходе из поста к вам бросается солдат в измятой форме. «Возьмите меня с собой. Я больше не могу это делать. Три года в Синдикате — и я только сейчас понял, кто мы такие.»',
        choices: [
          {
            label: 'Взять дезертира с собой',
            action: 'GOTO_NODE',
            nextNode: 'taken',
            addReputation: 7,
          },
          {
            label: 'Отказать — слишком опасно',
            action: 'CLOSE',
          },
          {
            label: 'Передать в руки Сопротивления',
            action: 'GOTO_NODE',
            nextNode: 'resistance_sent',
            reqItem: 'RESISTANCE_BADGE',
            addReputation: 10,
          },
        ],
      },
      taken: {
        id: 'taken',
        text: 'Дезертир молчалив. Через час он рассказывает о тайном маршруте снабжения Синдиката. Информация стоящая. Потом он уходит своей дорогой.',
        choices: [
          {
            label: 'Принять информацию',
            action: 'CLOSE',
            reward: { credits: 25, energy: 2 },
            setFlag: 'syndicate_supply_route',
          },
        ],
      },
      resistance_sent: {
        id: 'resistance_sent',
        text: 'Знак Сопротивления убеждает дезертира. Вы указываете направление и даёте знак опознавания. Он уходит. Братство получит ценного информатора.',
        choices: [
          {
            label: 'Проводить взглядом',
            action: 'CLOSE',
            reward: { energy: 3 },
            setFlag: 'deserter_to_resistance',
          },
        ],
      },
    },
  },

  outpost_underground_meeting: {
    id: 'outpost_underground_meeting',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outpost_underground_meeting/800/350',
        text: 'В подвале ближайшего здания — голоса. Люди в капюшонах, карты на столе. Один оборачивается. «Ты пришёл в неудачное время. Или удачное — зависит от того, кто ты.»',
        choices: [
          {
            label: 'Показать Метку Изгоя как знак',
            action: 'GOTO_NODE',
            nextNode: 'exile_mark',
            reqItem: 'EXILE_MARK',
          },
          {
            label: 'Показать Знак Сопротивления',
            action: 'GOTO_NODE',
            nextNode: 'resistance_mark',
            reqItem: 'RESISTANCE_BADGE',
          },
          {
            label: 'Ничего не показывать — назвать себя другом',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'trusted',
            failNode: 'thrown_out',
          },
        ],
      },
      exile_mark: {
        id: 'exile_mark',
        text: 'Метка Изгоя — сигнал для подполья. Собравшиеся переглядываются. «Один из нас.» Вас вводят в курс дела. Планируется операция против склада Синдиката.',
        choices: [
          {
            label: 'Присоединиться к планированию',
            action: 'CLOSE',
            setFlag: 'underground_network_joined',
            reward: { energy: 3 },
          },
        ],
      },
      resistance_mark: {
        id: 'resistance_mark',
        text: 'Знак Сопротивления вызывает доверие немедленно. Вас угощают едой и рассказывают о сети связных от юга до севера. Ценная информация.',
        choices: [
          {
            label: 'Принять информацию',
            action: 'CLOSE',
            setFlag: 'resistance_network_map',
            reward: { credits: 30, energy: 4 },
          },
        ],
      },
      trusted: {
        id: 'trusted',
        text: 'Вас принимают осторожно — дают небольшое поручение и отпускают. Испытательный срок.',
        choices: [
          {
            label: 'Выполнить поручение',
            action: 'CLOSE',
            setFlag: 'underground_prospect',
            reward: { credits: 20 },
          },
        ],
      },
      thrown_out: {
        id: 'thrown_out',
        text: 'Вас грубо выставляют. «Не знаем тебя. Уходи и забудь, что видел.» Никаких насилий — только холодный взгляд и закрытая дверь.',
        choices: [{ label: 'Уйти', action: 'CLOSE' }],
      },
    },
  },

  outpost_siege_warning: {
    id: 'outpost_siege_warning',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outpost_siege_warning/800/350',
        text: 'Посыльный влетает в ворота поста с криком: «Пустота! Пустота движется с севера! Два часа, может меньше!» Пост приходит в движение. Капитан смотрит на вас: «Боец? Или беглец?»',
        choices: [
          {
            label: 'Остаться и помочь обороне',
            action: 'GOTO_NODE',
            nextNode: 'defended',
            addReputation: 12,
          },
          {
            label: 'Уйти пока есть время',
            action: 'GOTO_NODE',
            nextNode: 'fled',
            addReputation: -5,
          },
          {
            label: 'Предложить план — показать Комиссию Восса как знак авторитета',
            action: 'GOTO_NODE',
            nextNode: 'led_defense',
            reqItem: 'VOSS_COMMISSION',
            addReputation: 10,
          },
        ],
      },
      defended: {
        id: 'defended',
        text: 'Осада была тяжёлой. Пустота отступила — с потерями с обеих сторон. Вы выжили. Солдаты смотрят с уважением. Капитан молча протягивает монеты.',
        choices: [
          {
            label: 'Принять награду',
            action: 'CLOSE',
            reward: { credits: 65, hp: -20, energy: 2 },
          },
        ],
      },
      fled: {
        id: 'fled',
        text: 'Вы уходите. Издалека слышен грохот боя. Потом — тишина. Неизвестно, выстоял ли пост.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            setFlag: 'abandoned_outpost',
          },
        ],
      },
      led_defense: {
        id: 'led_defense',
        text: 'Комиссия Восса даёт вам временные полномочия. Вы перестраиваете оборону. Пустота отступает с меньшими потерями для гарнизона. Легенда поста.',
        choices: [
          {
            label: 'Принять благодарность гарнизона',
            action: 'CLOSE',
            reward: { credits: 80, energy: 4 },
            setFlag: 'outpost_defender_legend',
          },
        ],
      },
    },
  },

};
