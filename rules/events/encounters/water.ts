import { OverworldEvent } from '../../../types.ts';

export const WATER_ENCOUNTERS: Record<string, OverworldEvent> = {

  water_sea_creature: {
    id: 'water_sea_creature',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/water_sea_creature/800/350',
        text: 'Вода под лодкой вдруг темнеет. Из глубины поднимается что-то огромное — тень размером с баржу. Поверхность бурлит. Существо не атакует — оно смотрит.',
        choices: [
          {
            label: 'Замереть и не двигаться',
            action: 'ROLL_DICE',
            probability: 0.65,
            successNode: 'still_success',
            failNode: 'still_fail',
          },
          {
            label: 'Бросить провизию в воду как подношение',
            action: 'GOTO_NODE',
            nextNode: 'offering',
            reqItem: 'food_bread',
            penalty: { items: ['food_bread'] },
          },
          {
            label: 'Грести изо всех сил к берегу',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'fled',
            failNode: 'capsized',
            penalty: { energy: 4 },
          },
        ],
      },
      still_success: {
        id: 'still_success',
        text: 'Существо медленно опускается обратно в темноту. Волна качает лодку, но вы целы. В воде остаётся слабое свечение — будто благодарность.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            reward: { energy: 3 },
          },
        ],
      },
      still_fail: {
        id: 'still_fail',
        text: 'Существо всё же задевает лодку хвостом — почти случайно. Вас выбрасывает в воду. Вы добираетесь до берега вплавь, потеряв часть снаряжения.',
        choices: [
          {
            label: 'Выбраться на берег',
            action: 'CLOSE',
            penalty: { hp: 20, energy: 3 },
          },
        ],
      },
      offering: {
        id: 'offering',
        text: 'Провизия уходит на дно. Тень замирает. Потом существо медленно разворачивается и уходит в глубину, оставив после себя клубок водорослей с чем-то внутри.',
        choices: [
          {
            label: 'Достать предмет из водорослей',
            action: 'CLOSE',
            reward: { credits: 40, energy: 2 },
          },
        ],
      },
      fled: {
        id: 'fled',
        text: 'Вы успеваете добраться до берега прежде, чем существо реагирует. Оглянувшись, видите лишь расходящиеся круги на воде.',
        choices: [{ label: 'Перевести дыхание', action: 'CLOSE' }],
      },
      capsized: {
        id: 'capsized',
        text: 'Лодка переворачивается. Существо, судя по всему, лишь проплывает мимо — но вы уже в воде, борясь с течением. Кое-как добираетесь до берега.',
        choices: [
          {
            label: 'Выбраться на сушу',
            action: 'CLOSE',
            penalty: { hp: 25, energy: 4 },
          },
        ],
      },
    },
  },

  water_message_in_bottle: {
    id: 'water_message_in_bottle',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/water_message_in_bottle/800/350',
        text: 'У борта покачивается закупоренная бутылка. Внутри — свёрнутый пергамент. Послание написано аккуратным, явно образованным почерком.',
        choices: [
          {
            label: 'Прочитать послание',
            action: 'GOTO_NODE',
            nextNode: 'read',
          },
          {
            label: 'Не трогать — мало ли что внутри',
            action: 'CLOSE',
          },
        ],
      },
      read: {
        id: 'read',
        text: '«Если ты нашёл это — значит, я мёртв. Мои карты хранятся в тайнике под третьим камнем у маяка на Серых Скалах. Они нужны Братству. Не Синдикату. Подпись: Т.»\n\nНа обороте — набросок карты.',
        choices: [
          {
            label: 'Запомнить тайник — может пригодиться',
            action: 'CLOSE',
            setFlag: 'knows_grey_cliffs_cache',
            reward: { energy: 1 },
          },
          {
            label: 'Уничтожить послание — опасно знать такое',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  water_survivor_island: {
    id: 'water_survivor_island',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/water_survivor_island/800/350',
        text: 'На крошечном островке посреди воды стоит человек и машет руками. Он явно провёл здесь не один день — исхудалый, оборванный.',
        choices: [
          {
            label: 'Подплыть и помочь',
            action: 'GOTO_NODE',
            nextNode: 'rescued',
            addReputation: 8,
          },
          {
            label: 'Пройти мимо — может, это ловушка',
            action: 'GOTO_NODE',
            nextNode: 'ignored',
          },
        ],
      },
      rescued: {
        id: 'rescued',
        text: 'Выживший — дезертир из Синдиката. Он благодарен до слёз. «У меня ничего нет, но я знаю кое-что. Восточный конвой идёт без охраны каждое третье новолуние. Это ваше.» Он протягивает старую карту.',
        choices: [
          {
            label: 'Принять карту и информацию',
            action: 'CLOSE',
            reward: { credits: 20, energy: 5 },
            setFlag: 'knows_convoy_schedule',
          },
          {
            label: 'Принять карту, но не доверять информации',
            action: 'CLOSE',
            reward: { credits: 20 },
          },
        ],
      },
      ignored: {
        id: 'ignored',
        text: 'Фигура на островке продолжает махать, пока не скрывается за горизонтом. Её крик разносится над водой ещё долго.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            addReputation: -5,
          },
        ],
      },
    },
  },

  water_ghost_ship: {
    id: 'water_ghost_ship',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/water_ghost_ship/800/350',
        text: 'В тумане появляется корабль без огней. Он плывёт без команды — паруса спущены, руль заброшен. На борту — следы боя, но ни одного тела.',
        choices: [
          {
            label: 'Взойти на борт и обыскать',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'searched',
            failNode: 'haunted',
          },
          {
            label: 'Держаться подальше',
            action: 'CLOSE',
          },
          {
            label: 'Использовать Древнюю реликвию для ориентации',
            action: 'GOTO_NODE',
            nextNode: 'map_used',
            reqItem: 'ancient_relic',
          },
        ],
      },
      searched: {
        id: 'searched',
        text: 'Трюм почти пуст, но в капитанской каюте — сундук с монетами и навигационными инструментами. Кто-то уже здесь побывал, но не всё забрал.',
        choices: [
          {
            label: 'Взять всё ценное',
            action: 'CLOSE',
            reward: { credits: 60, energy: 2 },
          },
        ],
      },
      haunted: {
        id: 'haunted',
        text: 'Посреди обыска корабль начинает крениться. Что-то двигается в трюме — невидимое, тяжёлое. Вы бросаетесь обратно в лодку.',
        choices: [
          {
            label: 'Уплыть как можно быстрее',
            action: 'CLOSE',
            penalty: { hp: 15, energy: 3 },
          },
        ],
      },
      map_used: {
        id: 'map_used',
        text: 'Карта указывает на особую отметку — этот корабль был нанесён на неё как «Хранилище Братства». Под настилом находится тайник с документами.',
        choices: [
          {
            label: 'Взять документы',
            action: 'CLOSE',
            reward: { credits: 30 },
            setFlag: 'brotherhood_documents',
          },
        ],
      },
    },
  },

  water_fishing_village: {
    id: 'water_fishing_village',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/water_fishing_village/800/350',
        text: 'На берегу — крошечная рыбацкая деревня. Люди смотрят настороженно, но не враждебно. Запах вяленой рыбы и дыма. Старуха у причала говорит: «Чужак. Нам редко везёт на чужаков.»',
        choices: [
          {
            label: 'Попросить о ночлеге и провизии',
            action: 'GOTO_NODE',
            nextNode: 'shelter',
          },
          {
            label: 'Спросить о местных водах и опасностях',
            action: 'GOTO_NODE',
            nextNode: 'info',
          },
          {
            label: 'Купить провизию (−30 кредитов)',
            action: 'CLOSE',
            reqCredits: 30,
            penalty: { credits: 30 },
            reward: { items: ['food_bread'] },
          },
        ],
      },
      shelter: {
        id: 'shelter',
        text: 'Деревня невелика, но гостеприимна. Вас кормят, дают угол для ночлега. Утром старуха говорит: «Уходи до рассвета. Налоговые сборщики Синдиката приходят раз в неделю — и сегодня их день.»',
        choices: [
          {
            label: 'Уйти до рассвета, благодарный',
            action: 'CLOSE',
            reward: { hp: 30, energy: 6 },
            addReputation: 5,
          },
        ],
      },
      info: {
        id: 'info',
        text: 'Старый рыбак рассказывает о странных явлениях: «На дне — что-то светится. С прошлого месяца. Рыба уходит. Сети рвутся без причины.» Он описывает точное место.',
        choices: [
          {
            label: 'Запомнить координаты',
            action: 'CLOSE',
            setFlag: 'glowing_depths_known',
            reward: { energy: 2 },
          },
        ],
      },
    },
  },

  water_water_spirit: {
    id: 'water_water_spirit',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/water_water_spirit/800/350',
        text: 'Вода вокруг лодки вдруг становится зеркально гладкой. Из неё поднимается фигура — человеческая, но сотканная из воды. Она говорит голосом, похожим на звук прибоя: «Что ты несёшь через мои воды, путник?»',
        choices: [
          {
            label: 'Ответить честно: «Сомнения и цель»',
            action: 'GOTO_NODE',
            nextNode: 'honest',
            addReputation: 5,
          },
          {
            label: 'Ответить: «Груз, не твоего ума дело»',
            action: 'GOTO_NODE',
            nextNode: 'rude',
          },
          {
            label: 'Предложить провизию как подношение',
            action: 'GOTO_NODE',
            nextNode: 'offered',
            reqItem: 'food_bread',
            penalty: { items: ['food_bread'] },
          },
        ],
      },
      honest: {
        id: 'honest',
        text: 'Дух молчит долго. Потом говорит: «Честность — редкость в этих водах. Я дам тебе часть своей силы. Вода запомнит тебя — и не будет врагом.»',
        choices: [
          {
            label: 'Принять дар духа',
            action: 'CLOSE',
            reward: { energy: 8, hp: 15 },
            setFlag: 'water_spirit_blessing',
          },
        ],
      },
      rude: {
        id: 'rude',
        text: 'Дух смотрит на вас долго. Потом вода взрывается — лодку захлёстывает волной. Когда всё успокаивается, духа нет. И провизия тоже.',
        choices: [
          {
            label: 'Выплеснуть воду из лодки',
            action: 'CLOSE',
            penalty: { energy: 3, hp: 10 },
          },
        ],
      },
      offered: {
        id: 'offered',
        text: 'Дух принимает подношение — оно растворяется в воде. «Ты уважаешь старые пути. Я покажу тебе дорогу сквозь туман.» Путь через воду становится ясным.',
        choices: [
          {
            label: 'Следовать за духом',
            action: 'CLOSE',
            reward: { energy: 5 },
            setFlag: 'water_spirit_guide',
          },
        ],
      },
    },
  },

  water_storm_shelter: {
    id: 'water_storm_shelter',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/water_storm_shelter/800/350',
        text: 'Шторм нагоняет неожиданно. Волны бьют в борта. Впереди — заброшенный маяк. Укрыться там — единственный вариант.',
        choices: [
          {
            label: 'Грести к маяку',
            action: 'GOTO_NODE',
            nextNode: 'lighthouse',
          },
          {
            label: 'Использовать запасы, чтобы переждать в море',
            action: 'GOTO_NODE',
            nextNode: 'waited',
            reqItem: 'food_bread',
            penalty: { items: ['food_bread'] },
          },
        ],
      },
      lighthouse: {
        id: 'lighthouse',
        text: 'Маяк не так уж заброшен — внутри кто-то живёт. Пожилая женщина без лишних слов впускает вас, даёт горячей воды и место у огня. Под утро шторм стихает. На стене маяка — символы, похожие на знаки Пустоты.',
        choices: [
          {
            label: 'Спросить о символах',
            action: 'CLOSE',
            reward: { hp: 25, energy: 5 },
            setFlag: 'void_symbols_seen',
          },
          {
            label: 'Поблагодарить и уйти молча',
            action: 'CLOSE',
            reward: { hp: 25, energy: 5 },
          },
        ],
      },
      waited: {
        id: 'waited',
        text: 'Провизия помогает поддерживать силы. Шторм бушует несколько часов, но лодка держится. Наконец — тишина.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            reward: { energy: 2 },
          },
        ],
      },
    },
  },

  water_sunken_cache: {
    id: 'water_sunken_cache',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/water_sunken_cache/800/350',
        text: 'Вода здесь прозрачная. На дне, в двух метрах, виден металлический ящик с цепью. Цепь прикована к якорю — кто-то намеренно опустил его сюда.',
        choices: [
          {
            label: 'Нырнуть за ящиком',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'retrieved',
            failNode: 'failed_dive',
            penalty: { energy: 3 },
          },
          {
            label: 'Использовать Древнюю реликвию — может, это отмечено',
            action: 'GOTO_NODE',
            nextNode: 'map_check',
            reqItem: 'ancient_relic',
          },
          {
            label: 'Не рисковать — идти дальше',
            action: 'CLOSE',
          },
        ],
      },
      retrieved: {
        id: 'retrieved',
        text: 'Ящик поднят. Внутри — монеты старой чеканки, небольшой нож и промасленный свёрток с документами, покрытыми незнакомым шифром.',
        choices: [
          {
            label: 'Взять всё содержимое',
            action: 'CLOSE',
            reward: { credits: 55, energy: 1 },
          },
        ],
      },
      failed_dive: {
        id: 'failed_dive',
        text: 'Течение сильнее, чем казалось. Вы достигаете ящика, но цепь не поддаётся. Приходится всплывать ни с чем, задыхаясь.',
        choices: [
          {
            label: 'Отдышаться и двигаться дальше',
            action: 'CLOSE',
            penalty: { hp: 10 },
          },
        ],
      },
      map_check: {
        id: 'map_check',
        text: 'Карта указывает: это хранилище Братства — «Тайник-7». Код замка: три поворота влево. Ящик открывается на удивление легко.',
        choices: [
          {
            label: 'Взять содержимое',
            action: 'CLOSE',
            reward: { credits: 70, items: ['food_bread'] },
          },
        ],
      },
    },
  },

};
