import { OverworldEvent } from '../../../types.ts';

export const PLAINS_ENCOUNTERS: Record<string, OverworldEvent> = {
  plains_patrol: {
    id: 'plains_patrol',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_patrol/800/350',
        text: 'На выжженной равнине перед вами появляется отряд вооружённых людей в потрёпанных мундирах неизвестной фракции. Они двигаются чётким строем, сержант поднимает кулак — привал. Его взгляд буравит вас с нескрываемым подозрением.',
        choices: [
          {
            label: 'Предъявить документы и пройти беспрепятственно',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'pass_success',
            failNode: 'pass_fail',
          },
          {
            label: 'Откупиться (30 кредитов)',
            action: 'CLOSE',
            reqCredits: 30,
            penalty: { credits: 30 },
            reward: { energy: 5 },
            addReputation: -5,
          },
          {
            label: 'Показать Железную Пластину',
            action: 'GOTO_NODE',
            nextNode: 'resistance_talk',
            reqItem: 'iron_plate',
            addReputation: 10,
          },
          {
            label: 'Обойти патруль стороной — потерять время',
            action: 'CLOSE',
            penalty: { energy: 8 },
            addReputation: 0,
          },
        ],
      },
      pass_success: {
        id: 'pass_success',
        text: 'Сержант кивает, не найдя ничего подозрительного, и жестом велит пропустить вас. Один из солдат тихо бросает вслед: «Удачи, путник. Здесь она нужна каждому».',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            reward: { credits: 10 },
            addReputation: 5,
          },
        ],
      },
      pass_fail: {
        id: 'pass_fail',
        text: 'Документы вызывают слишком много вопросов. Солдаты обыскивают вас и конфискуют часть снаряжения под предлогом «временного изъятия на нужды обороны».',
        choices: [
          {
            label: 'Подчиниться и уйти',
            action: 'CLOSE',
            penalty: { credits: 40, energy: 10 },
            addReputation: -10,
          },
        ],
      },
      resistance_talk: {
        id: 'resistance_talk',
        text: 'Сержант незаметно сжимает такой же знак на своём запястье и коротко кивает. Он тихим голосом сообщает, что в двух днях пути на север засада — Орден перекрыл дорогу.',
        choices: [
          {
            label: 'Поблагодарить и принять предупреждение',
            action: 'CLOSE',
            reward: { energy: 10 },
            setFlag: 'warned_northern_ambush',
            addReputation: 15,
          },
        ],
      },
    },
  },

  plains_refugee_camp: {
    id: 'plains_refugee_camp',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_refugee_camp/800/350',
        text: 'Среди пожухлой травы раскинулся лагерь беженцев — сотни людей, едва укрытых промокшей парусиной. Детский плач и запах болезни висят в воздухе. Старейшина, опираясь на палку, медленно поднимается вам навстречу.',
        choices: [
          {
            label: 'Отдать Свежий Хлеб',
            action: 'CLOSE',
            reqItem: 'food_bread',
            penalty: { items: ['food_bread'] },
            reward: { credits: 30 },
            addReputation: 20,
          },
          {
            label: 'Предложить провести через опасный участок',
            action: 'GOTO_NODE',
            nextNode: 'escort_offer',
          },
          {
            label: 'Пройти мимо, не ввязываясь',
            action: 'CLOSE',
            addReputation: -15,
          },
          {
            label: 'Расспросить о местности',
            action: 'CLOSE',
            reward: { energy: 5, credits: 15 },
            addReputation: 5,
          },
        ],
      },
      escort_offer: {
        id: 'escort_offer',
        text: 'Старейшина смотрит на вас долгим взглядом. «Нам некуда идти и не на что надеяться. Если вы выведете хотя бы детей — я отдам всё, что у нас осталось». Он открывает суму.',
        choices: [
          {
            label: 'Согласиться — потратить энергию, но получить награду',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'escort_success',
            failNode: 'escort_fail',
          },
          {
            label: 'Отказаться — слишком опасно',
            action: 'CLOSE',
            addReputation: -10,
          },
        ],
      },
      escort_success: {
        id: 'escort_success',
        text: 'Вам удаётся провести колонну через опасный участок. Старейшина дрожащими руками протягивает потрёпанную карту и горсть монет — последнее, что у него есть.',
        choices: [
          {
            label: 'Принять дар',
            action: 'CLOSE',
            reward: { credits: 60, items: ['data_disc'] },
            penalty: { energy: 15 },
            addReputation: 20,
          },
        ],
      },
      escort_fail: {
        id: 'escort_fail',
        text: 'На полпути на колонну нападают мародёры. Вам едва удаётся отбиться, но часть людей рассеялась в ночи. Старейшина смотрит на вас с незаслуженным укором.',
        choices: [
          {
            label: 'Уйти, неся груз вины',
            action: 'CLOSE',
            penalty: { hp: 25, energy: 15 },
            addReputation: -5,
          },
        ],
      },
    },
  },

  plains_crashed_vehicle: {
    id: 'plains_crashed_vehicle',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_crashed_vehicle/800/350',
        text: 'Посреди равнины догорает механический транспортёр — обшивка вскрыта изнутри, как будто что-то пробивалось наружу. Груз частично разбросан вокруг. Рядом — следы нескольких пар ног, уходящие на восток.',
        choices: [
          {
            label: 'Обыскать обломки в поисках ценного',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'loot_success',
            failNode: 'loot_fail',
          },
          {
            label: 'Изучить следы и попытаться понять, что произошло',
            action: 'GOTO_NODE',
            nextNode: 'investigate',
          },
          {
            label: 'Не задерживаться — это чужая беда',
            action: 'CLOSE',
            addReputation: 0,
          },
        ],
      },
      loot_success: {
        id: 'loot_success',
        text: 'Под скрученным металлом вы находите запаянный контейнер с инструментами и несколько уцелевших энергоячеек. Чьё-то несчастье обернулось вашей удачей.',
        choices: [
          {
            label: 'Забрать всё',
            action: 'CLOSE',
            reward: { credits: 50, items: ['iron_plate'] },
            addReputation: -5,
          },
        ],
      },
      loot_fail: {
        id: 'loot_fail',
        text: 'Пока вы копаетесь в обломках, острый металлический край вспарывает руку. Груз оказался либо уже мародёрствован, либо сгорел без остатка.',
        choices: [
          {
            label: 'Отступить с ранением',
            action: 'CLOSE',
            penalty: { hp: 20 },
          },
        ],
      },
      investigate: {
        id: 'investigate',
        text: 'Следы обрываются в нескольких сотнях шагов — здесь была перестрелка. Судя по гильзам, кто-то организовал засаду. На борту транспортёра едва различим знак Ордена.',
        choices: [
          {
            label: 'Записать координаты для доклада Сопротивлению',
            action: 'CLOSE',
            reward: { credits: 20 },
            setFlag: 'found_order_activity',
            addReputation: 10,
          },
          {
            label: 'Взять с собой детали для будущего использования',
            action: 'CLOSE',
            reward: { items: ['data_disc'] },
            addReputation: -5,
          },
        ],
      },
    },
  },

  plains_lost_child: {
    id: 'plains_lost_child',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_lost_child/800/350',
        text: 'На обочине пустой дороги сидит ребёнок лет восьми, прижимая к груди старую куклу. Он смотрит на вас огромными испуганными глазами и не отвечает на вопросы — только мотает головой. На запястье — странный браслет с незнакомыми символами.',
        choices: [
          {
            label: 'Взять с собой и искать взрослых',
            action: 'GOTO_NODE',
            nextNode: 'search',
            penalty: { energy: 8 },
          },
          {
            label: 'Оставить еду и указать направление к ближайшему поселению',
            action: 'CLOSE',
            reqItem: 'food_bread',
            penalty: { items: ['food_bread'] },
            addReputation: 10,
          },
          {
            label: 'Рассмотреть браслет',
            action: 'GOTO_NODE',
            nextNode: 'bracelet',
          },
          {
            label: 'Пройти мимо — не ваша забота',
            action: 'CLOSE',
            addReputation: -20,
          },
        ],
      },
      search: {
        id: 'search',
        text: 'После двух часов поиска вы находите деревню на краю выжженного поля. Женщина в слезах бросается к ребёнку. Она объясняет — мальчик убежал, когда солдаты забирали его отца.',
        choices: [
          {
            label: 'Расспросить о захваченном отце',
            action: 'CLOSE',
            reward: { credits: 25, energy: 10 },
            setFlag: 'knows_prisoner_location',
            addReputation: 20,
          },
          {
            label: 'Просто уйти, выполнив доброе дело',
            action: 'CLOSE',
            reward: { energy: 5 },
            addReputation: 15,
          },
        ],
      },
      bracelet: {
        id: 'bracelet',
        text: 'Символы на браслете — маркировка Проекта «Эхо». Такие метки ставили детям, которых отбирали для экспериментов. Ребёнок — беглец из засекреченного объекта. Это меняет всё.',
        choices: [
          {
            label: 'Взять ребёнка под защиту — огромный риск',
            action: 'CLOSE',
            penalty: { energy: 20 },
            setFlag: 'protecting_echo_child',
            addReputation: 20,
          },
          {
            label: 'Сделать вид, что ничего не заметил',
            action: 'CLOSE',
            addReputation: -15,
          },
        ],
      },
    },
  },

  plains_plague_rumor: {
    id: 'plains_plague_rumor',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_plague_rumor/800/350',
        text: 'Встречный торговец преграждает вам дорогу трясущимися руками. Он говорит, что в соседней деревне — чума. Сыпь, бред, смерть за сутки. «Не ходите туда», — шепчет он. Но именно через ту деревню ведёт кратчайший путь.',
        choices: [
          {
            label: 'Пройти через деревню напрямую',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'shortcut_safe',
            failNode: 'shortcut_infected',
          },
          {
            label: 'Обойти стороной — потратить энергию',
            action: 'CLOSE',
            penalty: { energy: 12 },
            addReputation: 5,
          },
          {
            label: 'Использовать Банан для защиты',
            action: 'CLOSE',
            reqItem: 'food_banana',
            penalty: { items: ['food_banana'] },
            reward: { energy: 5 },
            addReputation: 10,
          },
        ],
      },
      shortcut_safe: {
        id: 'shortcut_safe',
        text: 'Слухи оказались преувеличены — болезнь уже отступила. Деревня опустела, но дорога свободна. Вы находите брошенную аптечку у колодца.',
        choices: [
          {
            label: 'Забрать аптечку и двигаться дальше',
            action: 'CLOSE',
            reward: { hp: 20, energy: 8, credits: 20 },
          },
        ],
      },
      shortcut_infected: {
        id: 'shortcut_infected',
        text: 'Слухи были правдой. Вы успеваете пройти, но несколько дней спустя чувствуете жар. Болезнь не убивает, но выматывает тело и разум.',
        choices: [
          {
            label: 'Переболеть и продолжить путь',
            action: 'CLOSE',
            penalty: { hp: 30, energy: 20 },
            addReputation: -5,
          },
        ],
      },
    },
  },

  plains_bounty_hunter: {
    id: 'plains_bounty_hunter',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_bounty_hunter/800/350',
        text: 'Перед вами появляется человек в тёмном плаще с эмблемой гильдии охотников. Он неторопливо разворачивает свиток и сравнивает ваше лицо с рисунком. «Похоже или нет — дело второе», — произносит он холодно. — «Кто-то готов заплатить за вашу голову».',
        choices: [
          {
            label: 'Откупиться (50 кредитов)',
            action: 'CLOSE',
            reqCredits: 50,
            penalty: { credits: 50 },
            addReputation: -5,
          },
          {
            label: 'Сразиться',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'fight_win',
            failNode: 'fight_lose',
          },
          {
            label: 'Предъявить Битый Диск Данных',
            action: 'CLOSE',
            reqItem: 'data_disc',
            addReputation: 5,
            reward: { credits: 20 },
          },
          {
            label: 'Предложить информацию о более ценной цели',
            action: 'GOTO_NODE',
            nextNode: 'negotiate',
          },
        ],
      },
      fight_win: {
        id: 'fight_win',
        text: 'Охотник недооценил вас. После короткой схватки он отступает с разбитым носом и без свитка — вы забрали документ. Теперь ваша цена вырастет.',
        choices: [
          {
            label: 'Уйти с трофеем',
            action: 'CLOSE',
            reward: { credits: 40 },
            penalty: { hp: 15 },
            addReputation: 10,
          },
        ],
      },
      fight_lose: {
        id: 'fight_lose',
        text: 'Охотник оказался опытнее. Он берёт вас в захват, обыскивает и, не найдя контрактного знака, отпускает — но не без «компенсации за беспокойство».',
        choices: [
          {
            label: 'Уйти с потерями',
            action: 'CLOSE',
            penalty: { hp: 30, credits: 35 },
            addReputation: -10,
          },
        ],
      },
      negotiate: {
        id: 'negotiate',
        text: 'Охотник слушает вас с каменным лицом. Наконец, он складывает свиток. «У меня профессия, а не принципы. Если информация стоит больше — сделка».',
        choices: [
          {
            label: 'Указать на местонахождение Ордена',
            action: 'CLOSE',
            reqFlag: 'found_order_activity',
            reward: { credits: 30 },
            addReputation: -10,
          },
          {
            label: 'Блефовать — рискнуть',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'fight_win',
            failNode: 'fight_lose',
          },
        ],
      },
    },
  },

  plains_ghost_soldier: {
    id: 'plains_ghost_soldier',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_ghost_soldier/800/350',
        text: 'На закате вы видите фигуру в старом мундире, которая маршем идёт по пустому полю — туда и обратно, снова и снова. Войны давно нет, но этот солдат продолжает нести вахту. Он не замечает вас. Или делает вид.',
        choices: [
          {
            label: 'Окликнуть его',
            action: 'GOTO_NODE',
            nextNode: 'call_out',
          },
          {
            label: 'Понаблюдать молча и уйти',
            action: 'CLOSE',
            reward: { energy: 5 },
          },
          {
            label: 'Попробовать прикоснуться к нему',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'touch_safe',
            failNode: 'touch_fail',
          },
        ],
      },
      call_out: {
        id: 'call_out',
        text: 'Солдат останавливается. Поворачивается. Его лицо — правильное, человеческое, но в глазах — тысячелетняя усталость. «Когда война закончилась?» — спрашивает он. Вы не знаете, о какой войне он говорит.',
        choices: [
          {
            label: 'Сказать правду — война давно окончена',
            action: 'CLOSE',
            reward: { credits: 30, items: ['data_disc'] },
            addReputation: 10,
          },
          {
            label: 'Сказать, что война ещё идёт',
            action: 'CLOSE',
            penalty: { energy: 15 },
            addReputation: -10,
          },
        ],
      },
      touch_safe: {
        id: 'touch_safe',
        text: 'Ваша рука проходит сквозь него, как сквозь холодный туман. Солдат смотрит на своё плечо, потом на вас — и впервые за долгое время улыбается. Из-под мундира выпадает ключ.',
        choices: [
          {
            label: 'Поднять ключ',
            action: 'CLOSE',
            reward: { items: ['data_disc'] },
            addReputation: 5,
          },
        ],
      },
      touch_fail: {
        id: 'touch_fail',
        text: 'В момент прикосновения вас пронзает ледяной разряд. Солдат поворачивается — теперь это уже не человек. Его лицо — маска ярости. Вы бежите.',
        choices: [
          {
            label: 'Уйти с холодом в костях',
            action: 'CLOSE',
            penalty: { hp: 25, energy: 10 },
          },
        ],
      },
    },
  },

  plains_signal_fire: {
    id: 'plains_signal_fire',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_signal_fire/800/350',
        text: 'На холме горит сигнальный огонь — три вспышки, пауза, две. Это старый код партизан. Но вы в открытой местности, и если Орден следит за этим квадратом — вы уже замечены.',
        choices: [
          {
            label: 'Ответить на сигнал и выйти на связь',
            action: 'GOTO_NODE',
            nextNode: 'signal_answer',
          },
          {
            label: 'Погасить огонь, пока его не заметили враги',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'fire_extinguished',
            failNode: 'fire_exposed',
          },
          {
            label: 'Игнорировать и пройти мимо',
            action: 'CLOSE',
            addReputation: -5,
          },
        ],
      },
      signal_answer: {
        id: 'signal_answer',
        text: 'Из темноты выходит женщина с перевязанным плечом. Она из разведотряда — потеряла своих и ждёт эвакуации. Ей нужна ваша помощь, или хотя бы молчание.',
        choices: [
          {
            label: 'Передать ей Железную Пластину',
            action: 'CLOSE',
            reqItem: 'iron_plate',
            reward: { credits: 40, energy: 10 },
            addReputation: 20,
          },
          {
            label: 'Помочь добраться до укрытия',
            action: 'CLOSE',
            penalty: { energy: 15 },
            reward: { credits: 25 },
            addReputation: 15,
          },
          {
            label: 'Донести о ней Ордену',
            action: 'CLOSE',
            reward: { credits: 60 },
            addReputation: -20,
            setFlag: 'betrayed_resistance',
          },
        ],
      },
      fire_extinguished: {
        id: 'fire_extinguished',
        text: 'Вам удаётся быстро сбить пламя до того, как патруль добрался до холма. Тишина. Угроза миновала, хотя тот, кто зажёг костёр, так и не дождался ответа.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            addReputation: -5,
          },
        ],
      },
      fire_exposed: {
        id: 'fire_exposed',
        text: 'Патруль Ордена появляется раньше, чем вы успели потушить огонь. Вас задерживают для допроса. Выкрутиться стоит дорого.',
        choices: [
          {
            label: 'Откупиться',
            action: 'CLOSE',
            penalty: { credits: 50, energy: 10 },
            addReputation: -10,
          },
        ],
      },
    },
  },

  plains_merchant_dispute: {
    id: 'plains_merchant_dispute',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_merchant_dispute/800/350',
        text: 'Два торговца кричат друг на друга посреди дороги. Один обвиняет другого в краже товара, второй грозит оружием. Повозка перевёрнута, груз рассыпан. Вот-вот прольётся кровь.',
        choices: [
          {
            label: 'Встать между ними и потребовать разойтись',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'mediation_success',
            failNode: 'mediation_fail',
          },
          {
            label: 'Встать на сторону обвинителя (требует оценки)',
            action: 'GOTO_NODE',
            nextNode: 'side_accuser',
          },
          {
            label: 'Воспользоваться хаосом и подобрать рассыпанный товар',
            action: 'CLOSE',
            reward: { credits: 35, items: ['iron_plate'] },
            addReputation: -15,
          },
          {
            label: 'Уйти, пока не вляпались',
            action: 'CLOSE',
          },
        ],
      },
      mediation_success: {
        id: 'mediation_success',
        text: 'Ваш спокойный голос и железный взгляд охлаждают горячие головы. Торговцы нехотя расходятся. Оба жмут вам руку и предлагают небольшую плату за вмешательство.',
        choices: [
          {
            label: 'Принять благодарность',
            action: 'CLOSE',
            reward: { credits: 40 },
            addReputation: 15,
          },
        ],
      },
      mediation_fail: {
        id: 'mediation_fail',
        text: 'Оба торговца разворачиваются на вас — чужак лезет не в своё дело. Ситуация выходит из-под контроля, вы получаете несколько болезненных ударов прежде, чем вырваться.',
        choices: [
          {
            label: 'Уйти с синяками',
            action: 'CLOSE',
            penalty: { hp: 20, energy: 8 },
            addReputation: -5,
          },
        ],
      },
      side_accuser: {
        id: 'side_accuser',
        text: 'Обвинитель показывает вам накладную — всё указывает на то, что второй торговец действительно подменил товар. Вы можете выступить свидетелем или потребовать долю за молчание.',
        choices: [
          {
            label: 'Выступить честным свидетелем',
            action: 'CLOSE',
            reward: { credits: 25 },
            addReputation: 15,
          },
          {
            label: 'Потребовать долю за молчание у виновного',
            action: 'CLOSE',
            reward: { credits: 55 },
            addReputation: -10,
          },
        ],
      },
    },
  },

  plains_war_zone: {
    id: 'plains_war_zone',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_war_zone/800/350',
        text: 'Равнина превратилась в театр военных действий. Дым, грохот далёких орудий, горящие фермы. Два отряда сошлись в полукилометре от вас. Между ними — дорога. Ваша дорога.',
        choices: [
          {
            label: 'Прорваться через линию огня',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'breakthrough',
            failNode: 'caught_in_crossfire',
          },
          {
            label: 'Подождать окончания боя',
            action: 'CLOSE',
            penalty: { energy: 15 },
            reward: { credits: 20 },
          },
          {
            label: 'Помочь раненым с одной из сторон',
            action: 'GOTO_NODE',
            nextNode: 'help_wounded',
          },
          {
            label: 'Найти обходной путь через руины',
            action: 'CLOSE',
            penalty: { energy: 20 },
            addReputation: 0,
          },
        ],
      },
      breakthrough: {
        id: 'breakthrough',
        text: 'Вам удаётся проскользнуть в момент, когда обе стороны перегруппировываются. Пули свистят, но мимо. Вы выходите на ту сторону — живые, злые и быстрые.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            reward: { energy: 5 },
            addReputation: 5,
          },
        ],
      },
      caught_in_crossfire: {
        id: 'caught_in_crossfire',
        text: 'Попав под перекрёстный огонь, вы укрываетесь в воронке. Осколки режут одежду и кожу. Вы выбираетесь живым, но едва.',
        choices: [
          {
            label: 'Отступить и зализать раны',
            action: 'CLOSE',
            penalty: { hp: 35, energy: 15 },
            addReputation: -5,
          },
        ],
      },
      help_wounded: {
        id: 'help_wounded',
        text: 'На нейтральной полосе лежит раненый офицер — неясно, чьей стороны. Он шепчет координаты, умоляя передать их «своим».',
        choices: [
          {
            label: 'Вынести офицера с поля боя',
            action: 'CLOSE',
            penalty: { hp: 20, energy: 20 },
            reward: { credits: 70, items: ['data_disc'] },
            addReputation: 20,
          },
          {
            label: 'Оставить — вы не знаете, кто он',
            action: 'CLOSE',
            addReputation: -10,
          },
        ],
      },
    },
  },
};
