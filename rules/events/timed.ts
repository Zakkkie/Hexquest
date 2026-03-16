import { OverworldEvent } from '../../types.ts';

export const TIMED_EVENTS: Record<string, OverworldEvent> = {

  // ─── Ранние события (день 1-2, шаги 20-40) ──────────────────────────────────

  day1_new_laws: {
    id: 'day1_new_laws',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/day1_new_laws/800/350',
        text: 'На стенах городов и дорожных столбах появляются листовки: «По указу Синдиката — введён запрет на ночные перемещения без пропусков. Нарушители подлежат задержанию.» Всё изменилось за одну ночь.',
        choices: [
          {
            label: 'Прочитать весь указ',
            action: 'GOTO_NODE',
            nextNode: 'full_decree',
            reqStepMin: 20,
          },
          {
            label: 'Запомнить суть и идти',
            action: 'CLOSE',
            setFlag: 'new_laws_known',
            reqStepMin: 20,
          },
        ],
      },
      full_decree: {
        id: 'full_decree',
        text: 'В указе — список запрещённых предметов, новые правила торговли и расширенные полномочия для патрулей. «Всё во имя стабильности и порядка.» Подписано: Управляющий Восс.',
        choices: [
          {
            label: 'Запомнить детали',
            action: 'CLOSE',
            setFlag: ['new_laws_details_known', 'voss_knows_player'],
          },
          {
            label: 'Сорвать листовку',
            action: 'CLOSE',
            setFlag: 'new_laws_torn',
            addReputation: -3,
          },
        ],
      },
    },
  },

  day2_patrol_doubled: {
    id: 'day2_patrol_doubled',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/day2_patrol_doubled/800/350',
        text: 'Дороги заполнились солдатами. Патрули удвоены, на каждом перекрёстке — пост. Торговцы жалуются шёпотом: «Раньше одного стражника хватало на версту. Сейчас — пятеро на каждом углу.»',
        choices: [
          {
            label: 'Расспросить торговца о причинах',
            action: 'GOTO_NODE',
            nextNode: 'asked',
            reqStepMin: 20,
          },
          {
            label: 'Принять как данность и двигаться осторожнее',
            action: 'CLOSE',
            setFlag: 'patrol_doubled_known',
            reqStepMin: 20,
            penalty: { energy: 1 },
          },
        ],
      },
      asked: {
        id: 'asked',
        text: '«Говорят, Сопротивление активизировалось. Или Синдикат нашёл что-то на севере — и боится, что другие тоже найдут.» Торговец замолкает при виде приближающегося солдата.',
        choices: [
          {
            label: 'Запомнить слова',
            action: 'CLOSE',
            setFlag: 'syndicate_war_aware',
            reward: { energy: 1 },
          },
        ],
      },
    },
  },

  // ─── Первая неделя (шаги 40-80) ─────────────────────────────────────────────

  week1_plague_spotted: {
    id: 'week1_plague_spotted',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/week1_plague_spotted/800/350',
        text: 'Болота. Деревня у края трясины стоит тихо. Слишком тихо. На воротах — знак карантина. Врач в маске машет, чтобы вы держались подальше.',
        choices: [
          {
            label: 'Предложить помощь',
            action: 'GOTO_NODE',
            nextNode: 'helped',
            reqStepMin: 40,
            addReputation: 8,
          },
          {
            label: 'Обойти деревню стороной',
            action: 'CLOSE',
            reqStepMin: 40,
            penalty: { energy: 2 },
          },
          {
            label: 'Поговорить с врачом с безопасного расстояния',
            action: 'GOTO_NODE',
            nextNode: 'talked',
            reqStepMin: 40,
          },
        ],
      },
      helped: {
        id: 'helped',
        text: 'Вы помогаете врачу с сортировкой больных. Риск заражения — реальный. Но деревня справляется с вашей помощью быстрее. «Если есть Лечебное Зелье — оно нужно здесь.»',
        choices: [
          {
            label: 'Передать Красное Зелье',
            action: 'CLOSE',
            reqItem: 'potion_red_01',
            penalty: { items: ['potion_red_01'] },
            reward: { credits: 50 },
            addReputation: 12,
            setFlag: 'plague_contained',
          },
          {
            label: 'Помочь без трав',
            action: 'CLOSE',
            reward: { credits: 20, energy: 2 },
          },
        ],
      },
      talked: {
        id: 'talked',
        text: '«Болезнь пришла из воды. Что-то загрязнило источник. Говорят, у северных шахт — похожая история.» Врач предупреждает: в ближайшие недели болота станут опаснее.',
        choices: [
          {
            label: 'Запомнить предупреждение',
            action: 'CLOSE',
            setFlag: 'plague_origin_known',
            reward: { energy: 1 },
          },
        ],
      },
    },
  },

  day3_food_shortage: {
    id: 'day3_food_shortage',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/day3_food_shortage/800/350',
        text: 'По городу ходят слухи о нехватке продовольствия. На рынке — пустые прилавки. Очереди у хлебных лавок. Торговцы провизией подняли цены втрое.',
        choices: [
          {
            label: 'Продать свои запасы еды по рыночной цене (+45 кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'sold',
            reqItem: 'food_bread',
            reqStepMin: 60,
            penalty: { items: ['food_bread'] },
          },
          {
            label: 'Отдать еду нуждающимся бесплатно',
            action: 'CLOSE',
            reqItem: 'food_bread',
            reqStepMin: 60,
            penalty: { items: ['food_bread'] },
            addReputation: 15,
          },
          {
            label: 'Придержать запасы — самому нужны',
            action: 'CLOSE',
            reqStepMin: 60,
          },
        ],
      },
      sold: {
        id: 'sold',
        text: 'Деньги получены. Купец, забравший провизию, не выглядит голодающим. Возможно, вы только что накормили спекулянта, а не нуждающихся.',
        choices: [
          {
            label: 'Взять деньги и не думать об этом',
            action: 'CLOSE',
            reward: { credits: 45 },
          },
        ],
      },
    },
  },

  week2_resistance_broadcast: {
    id: 'week2_resistance_broadcast',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/week2_resistance_broadcast/800/350',
        text: 'Из брошенного дома доносится треск помех. Потом — голос, прерывистый, но разборчивый: «...Братство жив... Сопротивление... точки сбора... северный...» Сигнал обрывается.',
        choices: [
          {
            label: 'Войти и попытаться поймать сигнал снова',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'signal_caught',
            failNode: 'signal_lost',
            reqStepMin: 60,
          },
          {
            label: 'Пройти мимо — опасно задерживаться',
            action: 'CLOSE',
            reqStepMin: 60,
          },
        ],
      },
      signal_caught: {
        id: 'signal_caught',
        text: 'Вам удаётся настроить частоту. Голос говорит о точке сбора Сопротивления — конкретное место, конкретное время. «Если слышите — приходите. Мы вас ждём.»',
        choices: [
          {
            label: 'Запомнить координаты',
            action: 'CLOSE',
            setFlag: 'resistance_rally_point',
            reward: { energy: 2 },
          },
        ],
      },
      signal_lost: {
        id: 'signal_lost',
        text: 'Сигнал теряется окончательно. Статика. Потом — тишина. Вы слышали лишь обрывки.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  week3_merchant_network: {
    id: 'week3_merchant_network',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/week3_merchant_network/800/350',
        text: 'Торговцы на дорогах кивают вам по-особому — условный знак Братства. «Торговые маршруты открыты. Если знаете знак — проходите без пошлин.»',
        choices: [
          {
            label: 'Воспользоваться Железной Пластиной Братства',
            action: 'GOTO_NODE',
            nextNode: 'used_sign',
            reqItem: 'iron_plate',
            reqStepMin: 80,
          },
          {
            label: 'Признаться, что не знаете знака',
            action: 'GOTO_NODE',
            nextNode: 'no_sign',
            reqStepMin: 80,
          },
        ],
      },
      used_sign: {
        id: 'used_sign',
        text: 'Торговцы открывают лучшие маршруты. Провизия по ценам ниже рыночных. Информация о Синдикате бесплатно. Сеть работает.',
        choices: [
          {
            label: 'Воспользоваться преимуществами',
            action: 'CLOSE',
            reward: { credits: 40, items: ['food_bread'], energy: 3 },
            setFlag: 'brotherhood_trade_active',
          },
        ],
      },
      no_sign: {
        id: 'no_sign',
        text: 'Торговец улыбается: «Честность стоит дороже знака. Пользуйся маршрутами — один раз. Потом найди Братство.»',
        choices: [
          {
            label: 'Принять разовый пропуск',
            action: 'CLOSE',
            reward: { credits: 20, energy: 2 },
          },
        ],
      },
    },
  },

  week4_new_leader: {
    id: 'week4_new_leader',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/week4_new_leader/800/350',
        text: 'По городу ходят слухи: прежний Управляющий городом умер — или убит. На его место назначен новый человек Синдиката. «Говорят, он хуже прежнего. Или лучше — зависит от того, что ты считаешь лучшим.»',
        choices: [
          {
            label: 'Разузнать о новом лидере',
            action: 'GOTO_NODE',
            nextNode: 'inquired',
            reqStepMin: 100,
          },
          {
            label: 'Не интересоваться местной политикой',
            action: 'CLOSE',
            reqStepMin: 100,
          },
        ],
      },
      inquired: {
        id: 'inquired',
        text: 'Новый управляющий — молодой, амбициозный, беспощадный. «Но,» — добавляет информатор, — «у него есть слабость. Он боится того, что под землёй. Боится Пустоты.» Знание — сила.',
        choices: [
          {
            label: 'Запомнить слабость нового лидера',
            action: 'CLOSE',
            setFlag: 'new_leader_weakness',
            reward: { energy: 2 },
          },
        ],
      },
    },
  },

  // ─── Первый месяц (шаги 100-120) ────────────────────────────────────────────

  month1_void_spreads: {
    id: 'month1_void_spreads',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/month1_void_spreads/800/350',
        text: 'Пустота расширяется — это уже очевидно всем. Целые кварталы на севере опустели. Люди двигаются на юг. «Она растёт быстрее, чем мы успеваем уходить,» — говорит беженец с пустыми глазами.',
        choices: [
          {
            label: 'Исследовать границу Пустоты',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'explored',
            failNode: 'retreated',
            reqStepMin: 100,
          },
          {
            label: 'Помочь беженцам',
            action: 'GOTO_NODE',
            nextNode: 'helped_refugees',
            reqStepMin: 100,
            addReputation: 8,
          },
        ],
      },
      explored: {
        id: 'explored',
        text: 'На границе Пустоты — удивительное. Она движется не случайно. Есть ритм. Как дыхание. Это не катастрофа — это процесс. Чей-то план.',
        choices: [
          {
            label: 'Записать наблюдение',
            action: 'CLOSE',
            setFlag: 'void_pattern_observed',
            reward: { energy: 2 },
          },
        ],
      },
      retreated: {
        id: 'retreated',
        text: 'Слишком близко. Вы чувствуете притяжение Пустоты — буквально. Едва уходите.',
        choices: [
          {
            label: 'Отступить',
            action: 'CLOSE',
            penalty: { hp: 20, energy: 3 },
          },
        ],
      },
      helped_refugees: {
        id: 'helped_refugees',
        text: 'Беженцы благодарны. Один из них — бывший учёный Синдиката. «Я знаю кое-что о Пустоте. Если найдёте Краеугольный Камень — несите его к свету, не во тьму.»',
        choices: [
          {
            label: 'Запомнить слова учёного',
            action: 'CLOSE',
            reward: { credits: 20, energy: 3 },
            setFlag: 'heartstone_light_path',
          },
        ],
      },
    },
  },

  month1_ancient_waking: {
    id: 'month1_ancient_waking',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/month1_ancient_waking/800/350',
        text: 'Руины, которые считали мёртвыми, просыпаются. Камни светятся. Земля вибрирует. Что-то древнее — старше Синдиката, старше городов — открывает глаза.',
        choices: [
          {
            label: 'Войти в руины',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'found_power',
            failNode: 'driven_back',
            reqStepMin: 100,
          },
          {
            label: 'Наблюдать с безопасного расстояния',
            action: 'GOTO_NODE',
            nextNode: 'observed',
            reqStepMin: 100,
          },
        ],
      },
      found_power: {
        id: 'found_power',
        text: 'Внутри — библиотека, запечатанная тысячелетиями. Таблички, свитки, символы. Древнее знание о Пустоте — о том, что она такое на самом деле.',
        choices: [
          {
            label: 'Взять то, что можно унести',
            action: 'CLOSE',
            reward: { items: ['data_disc'], credits: 30 },
            setFlag: 'ancient_library_visited',
          },
        ],
      },
      driven_back: {
        id: 'driven_back',
        text: 'Что-то отталкивает вас на подходе. Невидимая сила. Руины не хотят вас видеть. Пока.',
        choices: [
          {
            label: 'Отступить',
            action: 'CLOSE',
            penalty: { hp: 15 },
          },
        ],
      },
      observed: {
        id: 'observed',
        text: 'Из руин выходит фигура в древних доспехах. Она смотрит на вас долго — потом уходит обратно. Приглашение? Предупреждение?',
        choices: [
          {
            label: 'Решить, что это приглашение',
            action: 'CLOSE',
            setFlag: 'ancient_guardian_contact',
          },
          {
            label: 'Решить, что лучше уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  // ─── Второй месяц (шаги 120-150) ────────────────────────────────────────────

  month2_heartstone_pulse: {
    id: 'month2_heartstone_pulse',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/month2_heartstone_pulse/800/350',
        text: 'Древняя Реликвия начинает светиться. Если она у вас есть — вы чувствуете пульс. Ровный, как сердцебиение. Что-то зовёт с севера. Источник зова — не человеческий.',
        choices: [
          {
            label: 'Следовать за пульсом Реликвии',
            action: 'GOTO_NODE',
            nextNode: 'followed',
            reqItem: 'ancient_relic',
            reqStepMin: 120,
          },
          {
            label: 'У меня нет реликвии — но я слышу зов',
            action: 'GOTO_NODE',
            nextNode: 'no_map',
            reqStepMin: 120,
          },
        ],
      },
      followed: {
        id: 'followed',
        text: 'Реликвия ведёт к заброшенной башне. Внутри — кристалл размером с кулак, пульсирующий тем же ритмом, что и реликвия. Краеугольный Камень. Настоящий.',
        choices: [
          {
            label: 'Взять Краеугольный Камень',
            action: 'CLOSE',
            reward: { items: ['ancient_relic'] },
            setFlag: 'heartstone_found',
          },
        ],
      },
      no_map: {
        id: 'no_map',
        text: 'Зов ведёт вас к башне, но без реликвии — дверь заперта. За стеклом видно нечто светящееся. Нужен ключ или реликвия.',
        choices: [
          {
            label: 'Искать способ войти позже',
            action: 'CLOSE',
            setFlag: 'heartstone_location_known',
          },
        ],
      },
    },
  },

  month2_refugees_flood: {
    id: 'month2_refugees_flood',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/month2_refugees_flood/800/350',
        text: 'Дороги запружены людьми. Тысячи беженцев из зон Пустоты движутся на юг. Города закрывают ворота. «Нет места. Нет еды. Нет законов для вас.» Синдикат молчит.',
        choices: [
          {
            label: 'Помочь организовать лагерь',
            action: 'GOTO_NODE',
            nextNode: 'organized',
            reqStepMin: 120,
            addReputation: 12,
          },
          {
            label: 'Пройти сквозь толпу',
            action: 'CLOSE',
            reqStepMin: 120,
            penalty: { energy: 2 },
          },
          {
            label: 'Раздать провизию',
            action: 'CLOSE',
            reqItem: 'food_bread',
            reqStepMin: 120,
            penalty: { items: ['food_bread'] },
            addReputation: 15,
            reward: { energy: 3 },
          },
        ],
      },
      organized: {
        id: 'organized',
        text: 'Вам удаётся собрать людей, распределить ресурсы. Лагерь становится организованным. Среди беженцев — опытные бойцы, учёные, лекари. Потенциальные союзники.',
        choices: [
          {
            label: 'Установить связи с ключевыми людьми',
            action: 'CLOSE',
            setFlag: 'refugee_network',
            reward: { credits: 30, energy: 4 },
          },
        ],
      },
    },
  },

  // ─── Третий месяц (шаги 150+) ───────────────────────────────────────────────

  month3_war_escalates: {
    id: 'month3_war_escalates',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/month3_war_escalates/800/350',
        text: 'Война больше не скрытая. Сопротивление атаковало три ключевых поста Синдиката. Синдикат ответил. Дороги горят. Нет нейтральных зон — только стороны конфликта.',
        choices: [
          {
            label: 'Встать на сторону Сопротивления',
            action: 'GOTO_NODE',
            nextNode: 'resistance_side',
            reqStepMin: 150,
            addReputation: 15,
          },
          {
            label: 'Встать на сторону Синдиката',
            action: 'GOTO_NODE',
            nextNode: 'syndicate_side',
            reqStepMin: 150,
            addReputation: -15,
          },
          {
            label: 'Остаться нейтральным — искать третий путь',
            action: 'CLOSE',
            reqStepMin: 150,
            setFlag: 'war_neutral',
          },
        ],
      },
      resistance_side: {
        id: 'resistance_side',
        text: 'Сопротивление принимает вас. «Нам нужны все, кто готов сражаться. Задание первое: разведка склада на севере.»',
        choices: [
          {
            label: 'Принять задание',
            action: 'CLOSE',
            setFlag: 'resistance_fighter',
            reward: { energy: 5 },
          },
        ],
      },
      syndicate_side: {
        id: 'syndicate_side',
        text: 'Синдикат платит хорошо. Офицер кивает: «Нам нужны люди без вопросов. Первое задание — выявить информаторов среди торговцев.»',
        choices: [
          {
            label: 'Принять задание',
            action: 'CLOSE',
            setFlag: 'syndicate_soldier',
            reward: { credits: 80 },
          },
        ],
      },
    },
  },

  month3_void_siege: {
    id: 'month3_void_siege',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/month3_void_siege/800/350',
        text: 'Пустота осаждает пост. Не метафора — буквально. Тёмные формы двигаются по периметру. Гарнизон держится, но еле-еле. «Нам нужна помощь!» — кричит часовой.',
        choices: [
          {
            label: 'Помочь гарнизону',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'siege_broken',
            failNode: 'siege_endured',
            reqStepMin: 150,
            addReputation: 10,
          },
          {
            label: 'Использовать Осколок Пустоты для переговоров',
            action: 'GOTO_NODE',
            nextNode: 'void_parley',
            reqItem: 'void_shard',
            reqStepMin: 150,
          },
          {
            label: 'Уйти — это не ваша война',
            action: 'CLOSE',
            reqStepMin: 150,
          },
        ],
      },
      siege_broken: {
        id: 'siege_broken',
        text: 'Совместными усилиями осада отбита. Пустота отступает. Гарнизон жив. Командир жмёт руку молча — слова излишни.',
        choices: [
          {
            label: 'Принять благодарность',
            action: 'CLOSE',
            reward: { credits: 70, energy: 4 },
            setFlag: 'void_siege_survived',
          },
        ],
      },
      siege_endured: {
        id: 'siege_endured',
        text: 'Осада затянулась. Вы держитесь, но цена высокая. Под утро Пустота отступает — по неизвестной причине.',
        choices: [
          {
            label: 'Залечить раны',
            action: 'CLOSE',
            penalty: { hp: 30 },
            reward: { credits: 40 },
          },
        ],
      },
      void_parley: {
        id: 'void_parley',
        text: 'Образец Пустоты резонирует с осаждающими формами. Они останавливаются. Это не переговоры — скорее, узнавание. Пустота узнаёт своё. Осада прекращается.',
        choices: [
          {
            label: 'Понять, что произошло',
            action: 'CLOSE',
            setFlag: 'void_sample_resonance',
            reward: { energy: 5 },
          },
        ],
      },
    },
  },

  // ─── Эндгейм (шаги 180-200+) ────────────────────────────────────────────────

  endgame_last_stand: {
    id: 'endgame_last_stand',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/endgame_last_stand/800/350',
        text: 'Последний защитный рубеж. Горстка людей удерживает переправу. «Если они прорвутся — следующие города не выдержат.» Командир смотрит на вас: «Ты ещё здесь. Значит, ты один из нас.»',
        choices: [
          {
            label: 'Встать в строй',
            action: 'GOTO_NODE',
            nextNode: 'stood',
            reqStepMin: 180,
            addReputation: 15,
          },
          {
            label: 'Взять командование',
            action: 'GOTO_NODE',
            nextNode: 'commanded',
            reqStepMin: 180,
            reqRepMin: 40,
            addReputation: 10,
          },
        ],
      },
      stood: {
        id: 'stood',
        text: 'Бой длился три часа. Рубеж выстоял. Цена — высокая. Но переправа в руках защитников.',
        choices: [
          {
            label: 'Перевести дыхание',
            action: 'CLOSE',
            reward: { credits: 60 },
            penalty: { hp: 30 },
            setFlag: 'last_stand_held',
          },
        ],
      },
      commanded: {
        id: 'commanded',
        text: 'Ваше командование меняет исход. Меньше потерь, эффективнее оборона. Переправа выстояла. Люди смотрят на вас по-новому.',
        choices: [
          {
            label: 'Принять роль лидера',
            action: 'CLOSE',
            reward: { credits: 80, energy: 5 },
            penalty: { hp: 20 },
            setFlag: 'last_stand_commander',
          },
        ],
      },
    },
  },

  endgame_final_warning: {
    id: 'endgame_final_warning',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/endgame_final_warning/800/350',
        text: 'Старик в развалинах хватает вас за руку: «Слушай. Краеугольный Камень нельзя уничтожить. Его можно только перенести. Туда, где Пустота не дотянется. Ты знаешь это место?»',
        choices: [
          {
            label: '«Знаю» — если Древняя Реликвия найдена',
            action: 'GOTO_NODE',
            nextNode: 'knows',
            reqItem: 'ancient_relic',
            reqStepMin: 200,
          },
          {
            label: '«Нет» — нужно найти это место',
            action: 'GOTO_NODE',
            nextNode: 'doesnt_know',
            reqStepMin: 200,
          },
        ],
      },
      knows: {
        id: 'knows',
        text: 'Старик кивает. «Тогда иди. Не медли. Окно закрывается.» Он отпускает руку. В его глазах — не страх. Надежда.',
        choices: [
          {
            label: 'Идти',
            action: 'CLOSE',
            setFlag: 'final_path_known',
            reward: { energy: 8 },
          },
        ],
      },
      doesnt_know: {
        id: 'doesnt_know',
        text: 'Старик вздыхает. «Тогда найди Древнюю Реликвию. Без неё ты слеп.» Он называет место, где её искать — если ещё не поздно.',
        choices: [
          {
            label: 'Записать координаты',
            action: 'CLOSE',
            setFlag: 'heartstone_final_hint',
          },
        ],
      },
    },
  },

};
