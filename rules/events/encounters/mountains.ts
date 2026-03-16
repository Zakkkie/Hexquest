import { OverworldEvent } from '../../../types.ts';

export const MOUNTAIN_ENCOUNTERS: Record<string, OverworldEvent> = {
  mountains_rope_bridge: {
    id: 'mountains_rope_bridge',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountains_rope_bridge/800/350',
        text: 'Узкий навесной мост над пропастью — единственный переход через ущелье. Верёвки наполовину перегнили, несколько досок отсутствуют. На той стороне виден дым — там кто-то есть. Ветер раскачивает мост даже без нагрузки.',
        choices: [
          {
            label: 'Перейти быстро, не задумываясь',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'cross_success',
            failNode: 'cross_fail',
          },
          {
            label: 'Укрепить мост перед переходом',
            action: 'ROLL_DICE',
            probability: 0.7,
            successNode: 'cross_success',
            failNode: 'cross_fail',
            penalty: { energy: 10 },
          },
          {
            label: 'Поискать обходной путь',
            action: 'CLOSE',
            penalty: { energy: 20 },
          },
          {
            label: 'Окликнуть тех, кто на той стороне',
            action: 'GOTO_NODE',
            nextNode: 'call_across',
          },
        ],
      },
      cross_success: {
        id: 'cross_success',
        text: 'Мост скрипит и раскачивается, но держит. Вы добираетесь до другого берега, и ноги рады твёрдой земле. С той стороны на вас смотрит удивлённый старик с чайником в руке.',
        choices: [
          {
            label: 'Поговорить со стариком',
            action: 'CLOSE',
            reward: { energy: 15, credits: 25 },
            addReputation: 10,
          },
        ],
      },
      cross_fail: {
        id: 'cross_fail',
        text: 'Доска под ногой ломается. Вы хватаетесь за верёвку, болтаетесь над пропастью несколько секунд, которые кажутся вечностью, и с трудом вытягиваетесь назад. Мост теперь явно непригоден.',
        choices: [
          {
            label: 'Искать обходной путь с болью в руках',
            action: 'CLOSE',
            penalty: { hp: 20, energy: 25 },
          },
        ],
      },
      call_across: {
        id: 'call_across',
        text: 'Старик кричит в ответ — он говорит, что есть верёвка, которую он может перекинуть, если вы поймаете. Он выглядит старым, но голос у него твёрдый.',
        choices: [
          {
            label: 'Поймать верёвку — переправиться с помощью',
            action: 'CLOSE',
            reward: { energy: 5 },
            addReputation: 5,
          },
          {
            label: 'Отказаться — не доверять незнакомцу',
            action: 'CLOSE',
            penalty: { energy: 20 },
          },
        ],
      },
    },
  },

  mountains_altitude_sickness: {
    id: 'mountains_altitude_sickness',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountains_altitude_sickness/800/350',
        text: 'На высоте воздух разрежен. У вас кружится голова, каждый шаг даётся тяжелее прошлого. Перед глазами — рябь. Тело требует остановиться, но горный перевал ещё далеко, а погода ухудшается.',
        choices: [
          {
            label: 'Использовать Свежий хлеб',
            action: 'CLOSE',
            reqItem: 'food_bread',
            penalty: { items: ['food_bread'] },
            reward: { hp: 25, energy: 20 },
          },
          {
            label: 'Остановиться и отдохнуть — потерять время',
            action: 'CLOSE',
            penalty: { energy: 5 },
            reward: { hp: 15 },
          },
          {
            label: 'Продолжить через силу',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'push_through',
            failNode: 'collapse',
          },
          {
            label: 'Спуститься ниже и найти другой путь',
            action: 'CLOSE',
            penalty: { energy: 15 },
          },
        ],
      },
      push_through: {
        id: 'push_through',
        text: 'Организм адаптируется быстрее, чем вы ожидали. Головная боль отступает, дыхание выравнивается. Вы добираетесь до перевала до темноты.',
        choices: [
          {
            label: 'Спуститься с другой стороны',
            action: 'CLOSE',
            reward: { credits: 20, energy: 5 },
          },
        ],
      },
      collapse: {
        id: 'collapse',
        text: 'Тело не выдерживает. Вы падаете на камни. Приходите в себя через несколько часов — живой, но с разбитыми коленями и пустым желудком. Ночь в горах едва не стала последней.',
        choices: [
          {
            label: 'Медленно спуститься',
            action: 'CLOSE',
            penalty: { hp: 30, energy: 20 },
          },
        ],
      },
    },
  },

  mountains_eagle_nest: {
    id: 'mountains_eagle_nest',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountains_eagle_nest/800/350',
        text: 'На уступе скалы — огромное гнездо. Орёл необычного вида, со стальным отблеском на перьях, смотрит на вас сверху. В гнезде что-то блестит. Орёл не нападает — просто наблюдает. Но размах его крыльев — четыре метра.',
        choices: [
          {
            label: 'Попробовать добраться до гнезда',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'nest_reached',
            failNode: 'nest_attack',
          },
          {
            label: 'Оставить птице еду в знак уважения',
            action: 'GOTO_NODE',
            nextNode: 'offering',
            reqItem: 'food_banana',
          },
          {
            label: 'Понаблюдать и продолжить путь',
            action: 'CLOSE',
            reward: { energy: 5 },
          },
        ],
      },
      nest_reached: {
        id: 'nest_reached',
        text: 'Орёл позволяет вам забраться. В гнезде — битый диск данных, явно не природного происхождения, и пара монет, явно принесённых птицей откуда-то снизу.',
        choices: [
          {
            label: 'Взять диск',
            action: 'CLOSE',
            reward: { credits: 40, items: ['data_disc'] },
            addReputation: 5,
          },
        ],
      },
      nest_attack: {
        id: 'nest_attack',
        text: 'Орёл атакует стремительно. Его когти разрывают плечо, удар крыла сбивает с ног. Вы скатываетесь по склону и чудом удерживаетесь за выступ.',
        choices: [
          {
            label: 'Отступить',
            action: 'CLOSE',
            penalty: { hp: 35, energy: 15 },
          },
        ],
      },
      offering: {
        id: 'offering',
        text: 'Орёл слетает к еде и смотрит на вас долгим взглядом — умным, как человеческий. Потом подбирает монету из гнезда и роняет к вашим ногам. Обмен.',
        choices: [
          {
            label: 'Принять дар',
            action: 'CLOSE',
            penalty: { items: ['food_banana'] },
            reward: { credits: 55 },
            addReputation: 15,
          },
        ],
      },
    },
  },

  mountains_cave_system: {
    id: 'mountains_cave_system',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountains_cave_system/800/350',
        text: 'Вход в пещеру замаскирован за водопадом. Внутри — разветвлённая система туннелей. Из глубины доносится едва слышимый ритмичный звук — не капель воды. Что-то регулярное, механическое. На стенах — следы пребывания людей, довольно старые.',
        choices: [
          {
            label: 'Пройти вглубь с осторожностью',
            action: 'GOTO_NODE',
            nextNode: 'deep',
          },
          {
            label: 'Обыскать только входную камеру',
            action: 'CLOSE',
            reward: { credits: 30, items: ['raw_container'] },
          },
          {
            label: 'Заблокировать вход и уйти',
            action: 'CLOSE',
            addReputation: -5,
          },
        ],
      },
      deep: {
        id: 'deep',
        text: 'Туннели ведут к подземному залу. В центре — механизм неизвестного назначения, всё ещё работающий. Стены покрыты схемами и данными. Кто-то работал здесь десятилетиями.',
        choices: [
          {
            label: 'Скопировать данные',
            action: 'CLOSE',
            reward: { items: ['data_disc', 'ancient_relic'] },
            penalty: { energy: 15 },
            addReputation: 10,
          },
          {
            label: 'Попробовать активировать механизм',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'mechanism_active',
            failNode: 'mechanism_fail',
          },
          {
            label: 'Взять детали механизма на металлолом',
            action: 'CLOSE',
            reward: { credits: 50, items: ['raw_container'] },
            addReputation: -10,
          },
        ],
      },
      mechanism_active: {
        id: 'mechanism_active',
        text: 'Механизм запускается — и свод пещеры раздвигается, открывая выход прямо на перевал. Создатель предусмотрел короткий путь.',
        choices: [
          {
            label: 'Выйти через перевал',
            action: 'CLOSE',
            reward: { energy: 20, credits: 40 },
            addReputation: 10,
          },
        ],
      },
      mechanism_fail: {
        id: 'mechanism_fail',
        text: 'Механизм взрывается от перегрузки. Вас засыпает мелкой щебёнкой, дым заполняет пещеру. Вы выбираетесь наощупь, кашляя.',
        choices: [
          {
            label: 'Выбраться живым',
            action: 'CLOSE',
            penalty: { hp: 25, energy: 20 },
          },
        ],
      },
    },
  },

  mountains_rockfall: {
    id: 'mountains_rockfall',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountains_rockfall/800/350',
        text: 'Грохот нарастает сверху. Камнепад — сотни тонн породы летят вниз по склону, прямо к тропе. У вас секунды, чтобы принять решение.',
        choices: [
          {
            label: 'Броситься вперёд — проскочить',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'sprint_success',
            failNode: 'sprint_fail',
          },
          {
            label: 'Укрыться за скальным выступом',
            action: 'ROLL_DICE',
            probability: 0.7,
            successNode: 'shelter_safe',
            failNode: 'shelter_partial',
          },
          {
            label: 'Отступить назад на открытый участок',
            action: 'CLOSE',
            penalty: { energy: 10 },
          },
        ],
      },
      sprint_success: {
        id: 'sprint_success',
        text: 'Вы проскакиваете опасный участок за секунды до того, как камни накрывают тропу. Позади — облако пыли и завал. Сердце колотится, но вы целы.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            reward: { credits: 10 },
            addReputation: 5,
          },
        ],
      },
      sprint_fail: {
        id: 'sprint_fail',
        text: 'Камень задевает плечо — удар оглушительный. Вас бросает в сторону, и вы падаете на острые обломки. Живы — но едва.',
        choices: [
          {
            label: 'Выбраться из-под обломков',
            action: 'CLOSE',
            penalty: { hp: 40, energy: 15 },
          },
        ],
      },
      shelter_safe: {
        id: 'shelter_safe',
        text: 'Выступ держит. Камни летят мимо. Когда пыль оседает, вы обнаруживаете, что осыпь обнажила стену скалы — и в ней видна ниша с чем-то явно старым.',
        choices: [
          {
            label: 'Исследовать нишу',
            action: 'CLOSE',
            reward: { credits: 35, items: ['data_disc'] },
            addReputation: 5,
          },
        ],
      },
      shelter_partial: {
        id: 'shelter_partial',
        text: 'Выступ частично защищает — крупные камни проходят мимо, но мелкая осыпь засыпает вас по пояс. Выкапываетесь долго и болезненно.',
        choices: [
          {
            label: 'Выкопаться и продолжить',
            action: 'CLOSE',
            penalty: { hp: 20, energy: 20 },
          },
        ],
      },
    },
  },

  mountains_stone_carving: {
    id: 'mountains_stone_carving',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountains_stone_carving/800/350',
        text: 'На обрыве — барельеф в скале, явно доисторический. Изображены фигуры, несущие нечто к горной вершине. Язык надписи — неизвестен, но отдельные символы совпадают с теми, что вы видели в развалинах. Барельеф свежее, чем должен быть.',
        choices: [
          {
            label: 'Зарисовать символы',
            action: 'CLOSE',
            reward: { items: ['ancient_relic'], credits: 20 },
            addReputation: 5,
          },
          {
            label: 'Попробовать прочитать с помощью Древней реликвии',
            action: 'GOTO_NODE',
            nextNode: 'decode',
            reqItem: 'ancient_relic',
          },
          {
            label: 'Пройти мимо — не ваша область знаний',
            action: 'CLOSE',
          },
        ],
      },
      decode: {
        id: 'decode',
        text: 'Реликвия резонирует при сближении с барельефом. Символы вспыхивают голубым — и в вашей памяти всплывает смысл: «Несущий Пустоту найдёт здесь начало пути. Несущий страх — его конец». Под одной из плит что-то есть.',
        choices: [
          {
            label: 'Поднять плиту',
            action: 'CLOSE',
            reward: { items: ['silver_ring', 'data_disc'] },
            penalty: { items: ['ancient_relic'] },
            addReputation: 15,
          },
          {
            label: 'Оставить как есть — предупреждение серьёзное',
            action: 'CLOSE',
            penalty: { items: ['ancient_relic'] },
            reward: { energy: 10 },
            addReputation: 10,
          },
        ],
      },
    },
  },

  mountains_monster_lair: {
    id: 'mountains_monster_lair',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountains_monster_lair/800/350',
        text: 'Тропа ведёт мимо расщелины, из которой смердит. На камнях — остатки снаряжения, кости животных, следы когтей на скале. Это чья-то нора. Обитатель, судя по следам, огромен. И, судя по свежим следам, недавно вернулся.',
        choices: [
          {
            label: 'Прокрасться мимо бесшумно',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'sneak_past',
            failNode: 'monster_awoken',
          },
          {
            label: 'Отвлечь существо шумом и обойти',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'distracted',
            failNode: 'monster_awoken',
          },
          {
            label: 'Атаковать логово пока хозяин спит',
            action: 'ROLL_DICE',
            probability: 0.35,
            successNode: 'lair_looted',
            failNode: 'monster_awoken',
          },
          {
            label: 'Найти длинный обход',
            action: 'CLOSE',
            penalty: { energy: 20 },
          },
        ],
      },
      sneak_past: {
        id: 'sneak_past',
        text: 'Вы проходите мимо бесшумно, задержав дыхание. Из расщелины доносится медленное тяжёлое дыхание — хозяин спит. Вы уходите в безопасность.',
        choices: [
          {
            label: 'Уйти быстрее',
            action: 'CLOSE',
            reward: { energy: 5 },
          },
        ],
      },
      distracted: {
        id: 'distracted',
        text: 'Сброшенный камень уводит существо в другую сторону. Вы проходите. Когда оно возвращается — вас уже нет.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
      lair_looted: {
        id: 'lair_looted',
        text: 'В логове — целая коллекция, собранная за годы: монеты, обломки оружия, кости, и — странно — несколько запаянных контейнеров явно промышленного происхождения.',
        choices: [
          {
            label: 'Взять ценное и бежать',
            action: 'CLOSE',
            reward: { credits: 80, items: ['data_disc', 'raw_container'] },
            addReputation: -5,
          },
        ],
      },
      monster_awoken: {
        id: 'monster_awoken',
        text: 'Существо просыпается. Оно огромно — три метра высотой, камень под ним трескается. Вы бежите. Оно догоняет. Вы отделываетесь, только нырнув в слишком узкую для него щель.',
        choices: [
          {
            label: 'Выбраться с другой стороны',
            action: 'CLOSE',
            penalty: { hp: 35, energy: 20 },
          },
        ],
      },
    },
  },

  mountains_pilgrim_stranger: {
    id: 'mountains_pilgrim_stranger',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountains_pilgrim_stranger/800/350',
        text: 'На перевале — фигура в паломническом плаще. Старик сидит у небольшого алтаря и смотрит на закат. Он оборачивается, когда вы подходите. Лицо изрезано морщинами, глаза — ясные, острые. «Я видел тебя во сне», — говорит он спокойно.',
        choices: [
          {
            label: 'Поговорить — что за сон?',
            action: 'GOTO_NODE',
            nextNode: 'dream_talk',
          },
          {
            label: 'Попросить благословения пути',
            action: 'CLOSE',
            reward: { energy: 20, hp: 15 },
            addReputation: 10,
          },
          {
            label: 'Показать Серебряное кольцо',
            action: 'CLOSE',
            reqItem: 'silver_ring',
            reward: { items: ['data_disc'], credits: 30 },
            addReputation: 20,
          },
          {
            label: 'Пройти мимо без слов',
            action: 'CLOSE',
          },
        ],
      },
      dream_talk: {
        id: 'dream_talk',
        text: 'Старик описывает сон с поразительной точностью — ваш путь, ваши решения, лицо человека, которого вы потеряли. «Я не пророк», — говорит он. — «Просто горы шепчут тем, кто умеет слушать». Он протягивает диск данных.',
        choices: [
          {
            label: 'Принять диск',
            action: 'CLOSE',
            reward: { items: ['data_disc'] },
            addReputation: 15,
          },
          {
            label: 'Отказаться — это пугает',
            action: 'CLOSE',
            addReputation: -5,
          },
          {
            label: 'Спросить, как он узнал',
            action: 'CLOSE',
            reward: { energy: 10, credits: 20 },
            addReputation: 10,
          },
        ],
      },
    },
  },
};
