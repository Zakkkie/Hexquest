import { OverworldEvent } from '../../../types.ts';

export const SWAMP_ENCOUNTERS: Record<string, OverworldEvent> = {
  swamp_quicksand: {
    id: 'swamp_quicksand',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_quicksand/800/350',
        text: 'Почва под ногами внезапно уходит вниз. Топь затягивает медленно, но неотвратимо — каждое движение ускоряет погружение. До твёрдого края метра три. Рядом — поваленное дерево и свисающие лозы.',
        choices: [
          {
            label: 'Дотянуться до лозы и вытащить себя',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'vine_escape',
            failNode: 'vine_fail',
          },
          {
            label: 'Лечь горизонтально и медленно ползти',
            action: 'ROLL_DICE',
            probability: 0.65,
            successNode: 'crawl_escape',
            failNode: 'deep_sink',
          },
          {
            label: 'Закричать и ждать помощи',
            action: 'GOTO_NODE',
            nextNode: 'cry_for_help',
          },
        ],
      },
      vine_escape: {
        id: 'vine_escape',
        text: 'Лоза выдерживает. Вы вытаскиваете себя рывком, падаете на берег, тяжело дышите. Болото выпускает вас — на этот раз.',
        choices: [
          {
            label: 'Отдышаться и двигаться дальше',
            action: 'CLOSE',
            penalty: { energy: 10 },
          },
        ],
      },
      vine_fail: {
        id: 'vine_fail',
        text: 'Лоза рвётся. Вы успеваете ухватиться за корень, но к тому моменту болото уже по пояс. Выбираетесь с трудом, потеряв часть снаряжения в топи.',
        choices: [
          {
            label: 'Выбраться с потерями',
            action: 'CLOSE',
            penalty: { hp: 20, credits: 30, energy: 15 },
          },
        ],
      },
      crawl_escape: {
        id: 'crawl_escape',
        text: 'Горизонтальное положение распределяет вес. Вы медленно, мучительно выползаете на твёрдую землю. В иле остаётся один сапог — ничего страшного.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            penalty: { energy: 8 },
          },
        ],
      },
      deep_sink: {
        id: 'deep_sink',
        text: 'Топь поглощает вас по грудь. В последний момент корень дерева попадается под руку. Вы вытягиваетесь, но ценой огромных усилий.',
        choices: [
          {
            label: 'Выбраться изможденным',
            action: 'CLOSE',
            penalty: { hp: 25, energy: 20 },
          },
        ],
      },
      cry_for_help: {
        id: 'cry_for_help',
        text: 'Кто-то откликается — из зарослей появляется болотный охотник с длинным шестом. Он вытаскивает вас без лишних слов, но потом протягивает ладонь.',
        choices: [
          {
            label: 'Заплатить за спасение (25 кредитов)',
            action: 'CLOSE',
            reqCredits: 25,
            penalty: { credits: 25 },
            addReputation: 5,
          },
          {
            label: 'Отдать провизию вместо денег',
            action: 'CLOSE',
            reqItem: 'food_banana',
            penalty: { items: ['food_banana'] },
            addReputation: 10,
          },
        ],
      },
    },
  },

  swamp_will_o_wisp: {
    id: 'swamp_will_o_wisp',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_will_o_wisp/800/350',
        text: 'В сгущающемся тумане между деревьями пляшет огонёк — голубовато-белый, почти прозрачный. Он будто приглашает следовать за ним. Болотные огни обычно ведут к гибели. Но этот кружит на одном месте, словно чего-то ждёт.',
        choices: [
          {
            label: 'Последовать за огнём',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'wisp_leads_good',
            failNode: 'wisp_leads_bad',
          },
          {
            label: 'Попытаться поймать огонь',
            action: 'GOTO_NODE',
            nextNode: 'catch_attempt',
          },
          {
            label: 'Игнорировать и держаться тропы',
            action: 'CLOSE',
            addReputation: 0,
          },
        ],
      },
      wisp_leads_good: {
        id: 'wisp_leads_good',
        text: 'Огонёк ведёт вас через лабиринт топей, где обычная тропа затоплена. Он выводит на сухой пригорок, где стоит старая беседка с запасами, оставленными давно умершим путником.',
        choices: [
          {
            label: 'Взять запасы',
            action: 'CLOSE',
            reward: { credits: 45, items: ['food_banana'], energy: 15 },
            addReputation: 5,
          },
        ],
      },
      wisp_leads_bad: {
        id: 'wisp_leads_bad',
        text: 'Огонёк ведёт прямо к топи, замаскированной тиной. Шаг — и вы по колено в жиже. Смеётся ли он? Кажется, да.',
        choices: [
          {
            label: 'Выбраться и вернуться на тропу',
            action: 'CLOSE',
            penalty: { hp: 15, energy: 15 },
          },
        ],
      },
      catch_attempt: {
        id: 'catch_attempt',
        text: 'Огонёк не убегает. Ваши руки смыкаются вокруг него — и он гаснет, оставив в ладонях тёплый лоскут реальности, светящийся изнутри.',
        choices: [
          {
            label: 'Взять лоскут',
            action: 'CLOSE',
            reward: { items: ['reality_patch'] },
            addReputation: 5,
          },
        ],
      },
    },
  },

  swamp_drowned_village: {
    id: 'swamp_drowned_village',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_drowned_village/800/350',
        text: 'Из воды торчат крыши домов. Деревня затоплена, но относительно недавно — в некоторых окнах сохранилось стекло. На поверхности воды плавают вещи и обломки. Где-то под водой — всё, что люди не успели забрать.',
        choices: [
          {
            label: 'Нырнуть и исследовать дома',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'dive_success',
            failNode: 'dive_danger',
          },
          {
            label: 'Собрать то, что плавает на поверхности',
            action: 'CLOSE',
            reward: { credits: 25, items: ['raw_container'] },
          },
          {
            label: 'Поискать выживших',
            action: 'GOTO_NODE',
            nextNode: 'search_survivors',
          },
          {
            label: 'Не тревожить затопленных мертвецов',
            action: 'CLOSE',
            addReputation: 5,
          },
        ],
      },
      dive_success: {
        id: 'dive_success',
        text: 'Видимость под водой лучше, чем ожидалось. В одном из домов — запаянный сундук, ещё не проржавевший. Внутри — диск данных, личные вещи и немного монет.',
        choices: [
          {
            label: 'Взять всё',
            action: 'CLOSE',
            reward: { credits: 60, items: ['data_disc'] },
            addReputation: -10,
          },
          {
            label: 'Взять только монеты',
            action: 'CLOSE',
            reward: { credits: 40 },
            addReputation: 0,
          },
        ],
      },
      dive_danger: {
        id: 'dive_danger',
        text: 'Под водой течение сильнее, чем кажется. Вас затягивает в дверной проём — и несколько страшных секунд вы не можете выбраться. Выплываете без добычи, но живым.',
        choices: [
          {
            label: 'Выбраться на берег',
            action: 'CLOSE',
            penalty: { hp: 20, energy: 20 },
          },
        ],
      },
      search_survivors: {
        id: 'search_survivors',
        text: 'На крыше самого высокого дома сидит старуха, обнявшая котёнка. Она смотрит на вас без страха. «Я никуда не уйду», — говорит она. — «Но если вы возьмёте этот диск данных — я буду благодарна».',
        choices: [
          {
            label: 'Взять диск и пообещать доставить',
            action: 'CLOSE',
            reward: { items: ['data_disc'], credits: 20 },
            addReputation: 20,
          },
          {
            label: 'Уговорить её уйти',
            action: 'CLOSE',
            penalty: { energy: 15 },
            reward: { credits: 35 },
            addReputation: 20,
          },
          {
            label: 'Уйти, оставив её',
            action: 'CLOSE',
            addReputation: -15,
          },
        ],
      },
    },
  },

  swamp_toxic_gas: {
    id: 'swamp_toxic_gas',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_toxic_gas/800/350',
        text: 'Над водой стелется желтоватый туман с резким запахом — болотный газ, концентрированный до опасного предела. Перед вами открытый участок, который нужно пересечь. Мертвые птицы у кромки воды — красноречивое предупреждение.',
        choices: [
          {
            label: 'Перебежать, задержав дыхание',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'breath_hold_success',
            failNode: 'breath_hold_fail',
          },
          {
            label: 'Использовать Свежий хлеб как фильтр',
            action: 'CLOSE',
            reqItem: 'food_bread',
            penalty: { items: ['food_bread'] },
            reward: { energy: 5 },
          },
          {
            label: 'Обойти через воду',
            action: 'CLOSE',
            penalty: { hp: 15, energy: 15 },
          },
        ],
      },
      breath_hold_success: {
        id: 'breath_hold_success',
        text: 'Вы пересекаете участок за один рывок, не вдохнув ни разу. На той стороне — чистый воздух. Лёгкие горят, но вы целы.',
        choices: [
          {
            label: 'Продолжить',
            action: 'CLOSE',
            penalty: { energy: 5 },
          },
        ],
      },
      breath_hold_fail: {
        id: 'breath_hold_fail',
        text: 'На середине вы невольно вдыхаете. Газ жжёт горло и глаза. Вы добираетесь до другого берега вслепую, кашляя и спотыкаясь.',
        choices: [
          {
            label: 'Отдышаться',
            action: 'CLOSE',
            penalty: { hp: 30, energy: 15 },
          },
        ],
      },
    },
  },

  swamp_giant_predator: {
    id: 'swamp_giant_predator',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_giant_predator/800/350',
        text: 'Что-то огромное движется под водой рядом с тропой. Только тёмный силуэт и волна на поверхности. Потом — пауза. Оно остановилось. Ждёт. Вокруг — никакой суши, кроме узкой кочки прямо впереди.',
        choices: [
          {
            label: 'Замереть и не двигаться',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'still_safe',
            failNode: 'attack',
          },
          {
            label: 'Броситься вперёд к кочке',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'dash_safe',
            failNode: 'attack',
          },
          {
            label: 'Бросить провизию в сторону — отвлечь',
            action: 'GOTO_NODE',
            nextNode: 'distract',
            reqItem: 'food_banana',
          },
        ],
      },
      still_safe: {
        id: 'still_safe',
        text: 'Существо теряет интерес и уходит. Минут через пять вы снова дышите. Тропа свободна.',
        choices: [
          {
            label: 'Пройти быстро',
            action: 'CLOSE',
            penalty: { energy: 5 },
          },
        ],
      },
      dash_safe: {
        id: 'dash_safe',
        text: 'Вы успеваете. Существо всплывает прямо за вашей спиной — пасть размером с лодку. Но вы уже на сухом.',
        choices: [
          {
            label: 'Уйти не оглядываясь',
            action: 'CLOSE',
            reward: { energy: 5 },
          },
        ],
      },
      attack: {
        id: 'attack',
        text: 'Существо атакует. Зубы смыкаются на вашей ноге — но не до конца, больше как предупреждение. Вас отбрасывает. Вы выживаете, но нога болит долго.',
        choices: [
          {
            label: 'Выбраться с раной',
            action: 'CLOSE',
            penalty: { hp: 40, energy: 10 },
          },
        ],
      },
      distract: {
        id: 'distract',
        text: 'Провизия летит в сторону. Существо реагирует мгновенно — разворачивается к новой добыче. У вас несколько секунд. Вы используете их правильно.',
        choices: [
          {
            label: 'Пройти пока оно отвлеклось',
            action: 'CLOSE',
            penalty: { items: ['food_banana'] },
            addReputation: 0,
          },
        ],
      },
    },
  },

  swamp_cursed_gold: {
    id: 'swamp_cursed_gold',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_cursed_gold/800/350',
        text: 'На полузатопленном бревне лежит кожаный мешочек с монетами. Совершенно один, в самом центре болота. Золото настоящее — вы видите блеск даже отсюда. Рядом нет ни следа человека. Слишком очевидно. Слишком заманчиво.',
        choices: [
          {
            label: 'Взять мешочек',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'gold_clean',
            failNode: 'gold_cursed',
          },
          {
            label: 'Изучить мешочек с расстояния',
            action: 'GOTO_NODE',
            nextNode: 'inspect',
          },
          {
            label: 'Оставить — слишком подозрительно',
            action: 'CLOSE',
            addReputation: 5,
          },
        ],
      },
      gold_clean: {
        id: 'gold_clean',
        text: 'Монеты настоящие и чистые. Никаких проклятий, никаких ловушек. Кто-то просто потерял мешочек — или оставил намеренно. Вам повезло.',
        choices: [
          {
            label: 'Забрать',
            action: 'CLOSE',
            reward: { credits: 70 },
          },
        ],
      },
      gold_cursed: {
        id: 'gold_cursed',
        text: 'Как только пальцы сжимают мешочек, кожу обжигает. Монеты рассыпаются в труху. Из болота поднимается туман с запахом горелой плоти, и несколько часов вас преследует головная боль.',
        choices: [
          {
            label: 'Уйти с пустыми руками',
            action: 'CLOSE',
            penalty: { hp: 20, energy: 10 },
            addReputation: -5,
          },
        ],
      },
      inspect: {
        id: 'inspect',
        text: 'Присмотревшись, вы замечаете: под мешочком — едва видимая тонкая нить, уходящая под воду. Ловушка. Кто-то ставит капканы на людей.',
        choices: [
          {
            label: 'Обезвредить ловушку и взять золото',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'gold_clean',
            failNode: 'gold_cursed',
          },
          {
            label: 'Уйти — не стоит возиться',
            action: 'CLOSE',
            addReputation: 5,
          },
        ],
      },
    },
  },

  swamp_old_ferry: {
    id: 'swamp_old_ferry',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_old_ferry/800/350',
        text: 'У шаткой пристани стоит паром — старый, но на ходу. Перевозчик, тощий мужчина с пустыми глазами, смотрит на вас. За спиной — широкая протока, обойти которую займёт полдня. «Перевезу», — говорит он без интонации. — «Цена — то, что вам дороже всего».',
        choices: [
          {
            label: 'Заплатить кредитами (40)',
            action: 'CLOSE',
            reqCredits: 40,
            penalty: { credits: 40 },
            reward: { energy: 15 },
          },
          {
            label: 'Предложить Серебряное кольцо',
            action: 'GOTO_NODE',
            nextNode: 'pilgrim_token_offer',
            reqItem: 'silver_ring',
          },
          {
            label: 'Поторговаться',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'bargain_success',
            failNode: 'bargain_fail',
          },
          {
            label: 'Обойти протоку пешком',
            action: 'CLOSE',
            penalty: { energy: 20 },
          },
        ],
      },
      pilgrim_token_offer: {
        id: 'pilgrim_token_offer',
        text: 'Перевозчик смотрит на кольцо долго. Что-то меняется в его пустых глазах. «Ты из тех, кто идёт к святилищу. Таким я не беру платы». Он переправляет вас и молчит всю дорогу.',
        choices: [
          {
            label: 'Переправиться',
            action: 'CLOSE',
            reward: { energy: 15, hp: 10 },
            addReputation: 15,
          },
        ],
      },
      bargain_success: {
        id: 'bargain_success',
        text: 'Перевозчик соглашается на меньшее. «Первый раз за десять лет», — бормочет он. Переправляет молча, но не берёт лишнего.',
        choices: [
          {
            label: 'Переправиться',
            action: 'CLOSE',
            penalty: { credits: 20 },
            reward: { energy: 15 },
          },
        ],
      },
      bargain_fail: {
        id: 'bargain_fail',
        text: 'Перевозчик разворачивается и уходит в каюту. «Нет денег — нет парома». Дверь закрывается.',
        choices: [
          {
            label: 'Искать другой путь',
            action: 'CLOSE',
            penalty: { energy: 20 },
          },
        ],
      },
    },
  },

  swamp_witch_doctor: {
    id: 'swamp_witch_doctor',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_witch_doctor/800/350',
        text: 'Хижина на сваях над водой украшена гирляндами из костей и цветного стекла. Внутри — свет. На шум ваших шагов выходит человек в маске из черепа животного. Он смотрит на вас и говорит на незнакомом наречии, потом переходит на общий: «Тело лечат травой. Душу — правдой. Что тебе нужно?»',
        choices: [
          {
            label: 'Попросить физического исцеления',
            action: 'GOTO_NODE',
            nextNode: 'physical_heal',
          },
          {
            label: 'Попросить информацию о болоте',
            action: 'CLOSE',
            reward: { credits: 20 },
            setFlag: 'swamp_path_known',
            addReputation: 5,
          },
          {
            label: 'Предложить Лоскут Реальности для его исследований',
            action: 'CLOSE',
            reqItem: 'reality_patch',
            penalty: { items: ['reality_patch'] },
            reward: { hp: 40, energy: 25, items: ['food_bread'] },
            addReputation: 15,
          },
          {
            label: 'Уйти — маска пугает',
            action: 'CLOSE',
          },
        ],
      },
      physical_heal: {
        id: 'physical_heal',
        text: 'Знахарь осматривает ваши раны и кивает. «Это можно исправить. Но нужно время и материал». Он называет цену.',
        choices: [
          {
            label: 'Заплатить кредитами (35)',
            action: 'CLOSE',
            reqCredits: 35,
            penalty: { credits: 35 },
            reward: { hp: 35 },
          },
          {
            label: 'Дать провизию',
            action: 'CLOSE',
            reqItem: 'food_banana',
            penalty: { items: ['food_banana'] },
            reward: { hp: 30, energy: 10 },
          },
          {
            label: 'Отказаться от цены',
            action: 'CLOSE',
            addReputation: -5,
          },
        ],
      },
    },
  },
};
