import { OverworldEvent } from '../../../types.ts';

// Arc 7 — Охотники на Пустоту (Void Hunters)
// Flag chain: void_hunters_met → void_hunters_quest → void_corruption_active → void_hunters_ended
// Terrain: SWAMP, WATER, RUINS
// Key items: RUNIC_TABLET, VOID_SAMPLE (new quest item)

export const ARC7_EVENTS: Record<string, OverworldEvent> = {

  void_hunter_camp: {
    id: 'void_hunter_camp',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/void_hunters/800/350',
        text: 'В болоте, замаскированном густой ряской, вы натыкаетесь на лагерь. Три человека в потрёпанных рясах изучают клубящееся чёрное свечение в стеклянных колбах. «Стой!» — резко говорит худая женщина. — «Ты что — за Синдикатом следишь?»',
        choices: [
          {
            label: 'Объяснить, что вы одиночка',
            action: 'GOTO_NODE',
            nextNode: 'explain_self',
            setFlag: 'void_hunters_met',
          },
          {
            label: 'Спросить, что за образцы в колбах',
            action: 'GOTO_NODE',
            nextNode: 'ask_samples',
            setFlag: 'void_hunters_met',
          },
          {
            label: 'Пригрозить донести Синдикату',
            action: 'GOTO_NODE',
            nextNode: 'threaten',
            addReputation: -15,
          },
          {
            label: 'Осторожно уйти',
            action: 'CLOSE',
          },
        ],
      },
      explain_self: {
        id: 'explain_self',
        image: 'https://picsum.photos/seed/void_camp_inside/800/350',
        text: 'Женщина — Риа — смотрит на вас долгую секунду. «Хорошо. Мы изучаем Пустоту. Не ради Синдиката — ради выживания. Каскад уничтожил наши дома. Мы хотим знать — почему.» Она предлагает вам сесть. «Помоги нам — и ты узнаешь то, чего не знает никто.»',
        choices: [
          {
            label: 'Согласиться помочь охотникам',
            action: 'CLOSE',
            setFlag: 'void_hunters_quest',
            addReputation: 10,
            reward: { credits: 25 },
          },
          {
            label: 'Отказаться — это слишком опасно',
            action: 'CLOSE',
          },
        ],
      },
      ask_samples: {
        id: 'ask_samples',
        text: '«Это — сама Пустота,» — говорит молодой охотник, не отрывая взгляда от колбы. — «Мы научились её собирать. Нейтрализованная — это просто данные. Но сырая... сырая — это нечто иное.» Риа закрывает его рот рукой. «Достаточно. Странник, ты с нами или нет?»',
        choices: [
          {
            label: 'Присоединиться — эта тайна стоит риска',
            action: 'CLOSE',
            setFlag: ['void_hunters_met', 'void_hunters_quest'],
            addReputation: 10,
            reward: { credits: 25 },
          },
          {
            label: 'Попросить пустотный образец в обмен на помощь',
            action: 'GOTO_NODE',
            nextNode: 'sample_negotiation',
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
      sample_negotiation: {
        id: 'sample_negotiation',
        text: 'Риа долго молчит. «Образец можно дать только тому, кому доверяешь. Докажи — помоги нам сначала.» Её взгляд — серьёзный, измотанный. За ним — годы потерь.',
        choices: [
          {
            label: 'Принять условия — сначала доверие',
            action: 'CLOSE',
            setFlag: ['void_hunters_met', 'void_hunters_quest'],
            addReputation: 5,
          },
          {
            label: 'Отказаться',
            action: 'CLOSE',
          },
        ],
      },
      threaten: {
        id: 'threaten',
        text: 'Риа кладёт руку на нож. Охотники мгновенно окружают вас. «Значит, шпион.» В воздухе — тишина перед грозой.',
        choices: [
          {
            label: 'Быстро извиниться — это была шутка',
            action: 'GOTO_NODE',
            nextNode: 'explain_self',
            addReputation: -5,
          },
          {
            label: 'Развернуться и уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  void_sample_found: {
    id: 'void_sample_found',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/void_sample/800/350',
        text: 'Посреди болотных зарослей вы находите мёртвую зону — идеальный круг голой земли в три метра. В центре, в растрескавшейся почве, пульсирует тёмный кристалл. Охотники искали именно такое. Риа предупреждала: сырая Пустота заразна.',
        choices: [
          {
            label: 'Взять кристалл (риск заражения)',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'take_success',
            failNode: 'take_corrupted',
            reqFlag: 'void_hunters_quest',
          },
          {
            label: 'Использовать RUNIC_TABLET для безопасного извлечения',
            action: 'GOTO_NODE',
            nextNode: 'safe_extract',
            reqItem: 'RUNIC_TABLET',
            reqFlag: 'void_hunters_quest',
          },
          {
            label: 'Отметить место и доложить Риа',
            action: 'CLOSE',
            reqFlag: 'void_hunters_quest',
            reward: { credits: 15 },
          },
          {
            label: 'Уйти — слишком опасно',
            action: 'CLOSE',
          },
        ],
      },
      take_success: {
        id: 'take_success',
        text: 'Пальцы покалывают, но кристалл остаётся тёмным в вашей ладони — не активируется. Вы справились. «Образец Пустоты — у тебя,» — звучит в голове странный голос. Потом — тишина.',
        choices: [
          {
            label: 'Сохранить образец',
            action: 'CLOSE',
            setFlag: 'void_sample_collected',
            reward: { items: ['VOID_SAMPLE'] },
          },
        ],
      },
      take_corrupted: {
        id: 'take_corrupted',
        text: 'Кристалл вспыхивает при прикосновении. Чёрные нити расползаются по запястью — потом гаснут. Но что-то изменилось. Вы слышите шёпот на языке, которого не знаете. Образец у вас, но Пустота знает о вас теперь.',
        choices: [
          {
            label: 'Принять это — образец стоит риска',
            action: 'CLOSE',
            setFlag: ['void_sample_collected', 'void_corruption_active'],
            reward: { items: ['VOID_SAMPLE'] },
            penalty: { hp: 20 },
          },
        ],
      },
      safe_extract: {
        id: 'safe_extract',
        text: 'Руны на табличке светятся при приближении к кристаллу. Вы следуете символам — медленно, точно. Кристалл выходит из земли без вспышки, чистый. Руническая табличка рассыпается в прах — она была создана для этого.',
        choices: [
          {
            label: 'Взять образец',
            action: 'CLOSE',
            setFlag: 'void_sample_collected',
            reward: { items: ['VOID_SAMPLE'] },
            penalty: { items: ['RUNIC_TABLET'] },
          },
        ],
      },
    },
  },

  void_corruption_spreads: {
    id: 'void_corruption_spreads',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/void_visions/800/350',
        text: 'Ночью вам снятся картины: города, пожираемые тьмой. Голоса называют вас по имени. Утром вы просыпаетесь с чёрными прожилками на коже — они исчезают на солнце. Риа смотрит серьёзно: «Пустота коснулась тебя. Есть два пути.»',
        choices: [
          { label: '', action: 'GOTO_NODE', nextNode: 'fight_option', reqFlag: 'void_corruption_active' },
          { label: '', action: 'GOTO_NODE', nextNode: 'no_corruption', reqFlagAbsent: 'void_corruption_active' },
        ],
      },
      fight_option: {
        id: 'fight_option',
        text: 'Риа говорит: «Борись с видениями — очищение болезненно, но ты останешься собой. Или прими — Пустота даст силу, но заберёт часть разума.»',
        choices: [
          {
            label: 'Бороться с заражением',
            action: 'GOTO_NODE',
            nextNode: 'fight_visions',
            addReputation: 15,
          },
          {
            label: 'Принять Пустоту — сила важнее',
            action: 'GOTO_NODE',
            nextNode: 'embrace_void',
            addReputation: -20,
          },
        ],
      },
      no_corruption: {
        id: 'no_corruption',
        text: 'Риа говорит спокойно: «Ты чист. Это редкость. Пустота тебя не взяла.» Она достаёт флягу с мутной жидкостью. «Вакцина. Тебе не нужна — но кому-нибудь другому...»',
        choices: [
          {
            label: 'Взять вакцину',
            action: 'CLOSE',
            reward: { items: ['ELDER_HERB'], energy: 20 },
            setFlag: 'void_corruption_handled',
          },
        ],
      },
      fight_visions: {
        id: 'fight_visions',
        text: 'Три дня боли. Прожилки поднимаются выше — к сердцу. Но вы держитесь. На четвёртый день они бледнеют. Риа улыбается: «Мало кто выдерживает. Ты — другой.» Шёпот не исчезает, но больше не управляет вами.',
        choices: [
          {
            label: 'Продолжить с охотниками',
            action: 'CLOSE',
            setFlag: 'void_corruption_handled',
            clearFlag: 'void_corruption_active',
            reward: { hp: 20 },
            penalty: { hp: 30 },
          },
        ],
      },
      embrace_void: {
        id: 'embrace_void',
        text: 'Нити уходят глубже. Боль прекращается. Вместо неё — холодная ясность. Вы видите мир иначе — трещины Пустоты светятся, как дороги. Риа смотрит с тревогой: «Не слушай, что она говорит тебе делать.»',
        choices: [
          {
            label: 'Принять изменение',
            action: 'CLOSE',
            setFlag: ['void_corruption_handled', 'void_embraced'],
            reward: { energy: 30 },
          },
        ],
      },
    },
  },

  void_purification: {
    id: 'void_purification',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/void_ritual/800/350',
        text: 'Риа ведёт вас к древнему камню посреди болота — идеальный круг, покрытый рунами. «Ритуал очищения. Он изгонит заражение из области. Но требует жертвы — либо припасы, либо твою кровь.»',
        choices: [
          {
            label: 'Использовать SUPPLIES для ритуала',
            action: 'GOTO_NODE',
            nextNode: 'ritual_supplies',
            reqItem: 'SUPPLIES',
            reqFlag: 'void_hunters_quest',
          },
          {
            label: 'Пожертвовать кровью (−30 HP)',
            action: 'GOTO_NODE',
            nextNode: 'ritual_blood',
            reqFlag: 'void_hunters_quest',
          },
          {
            label: 'Отказаться от ритуала',
            action: 'CLOSE',
          },
        ],
      },
      ritual_supplies: {
        id: 'ritual_supplies',
        text: 'Припасы горят медленно, дым поднимается нитями. Руны на камне вспыхивают одна за другой. Болотные огни — вечные спутники этих мест — гаснут. «Готово,» — говорит Риа тихо. — «Эта территория чиста на несколько дней.»',
        choices: [
          {
            label: 'Завершить ритуал',
            action: 'CLOSE',
            setFlag: 'void_purification_done',
            penalty: { items: ['SUPPLIES'] },
            reward: { credits: 40, energy: 15 },
            addReputation: 20,
          },
        ],
      },
      ritual_blood: {
        id: 'ritual_blood',
        text: 'Нож разрезает ладонь. Кровь капает на камень — и исчезает, впитываясь в руны. Боль острая, но ритуал работает. Болото замолкает. «Ты пожертвовал собой ради других,» — говорит Риа. — «Пустота это запомнит.»',
        choices: [
          {
            label: 'Принять последствия',
            action: 'CLOSE',
            setFlag: 'void_purification_done',
            penalty: { hp: 30 },
            reward: { credits: 60, energy: 20 },
            addReputation: 25,
          },
        ],
      },
    },
  },

  void_origin_revealed: {
    id: 'void_origin_revealed',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/void_truth/800/350',
        text: 'Устройство охотников — примитивное, но работает. Образец Пустоты в колбе разворачивается, как карта. В её структуре — рукотворные узлы. Риа шепчет: «Это не природная катастрофа. Каскад был создан намеренно.»',
        choices: [
          { label: 'Кем?', action: 'GOTO_NODE', nextNode: 'reveal_engineers' },
          { label: 'Зачем?', action: 'GOTO_NODE', nextNode: 'reveal_purpose' },
        ],
      },
      reveal_engineers: {
        id: 'reveal_engineers',
        text: '«Инженеры,» — говорит Риа. — «Не простые мастера — Древний Орден. Они испытывали технологию контроля Пустоты. Вышло из-под контроля. А Синдикат это скрыл.» Молчание. «Что будешь делать с этим?»',
        choices: [
          {
            label: 'Сообщить всем — люди должны знать',
            action: 'GOTO_NODE',
            nextNode: 'tell_everyone',
            addReputation: 20,
          },
          {
            label: 'Доложить только в Синдикат',
            action: 'GOTO_NODE',
            nextNode: 'tell_syndicate',
            addReputation: -10,
          },
          {
            label: 'Хранить тайну — знание опасно',
            action: 'GOTO_NODE',
            nextNode: 'keep_secret',
          },
        ],
      },
      reveal_purpose: {
        id: 'reveal_purpose',
        text: '«Власть,» — говорит Риа просто. — «Тот, кто контролирует Пустоту, контролирует страх. А страх — это управление.» Она смотрит на вас. «Синдикат знал. Может, и создал. Мы не уверены.»',
        choices: [
          { label: 'Глубже — кто именно?', action: 'GOTO_NODE', nextNode: 'reveal_engineers' },
        ],
      },
      tell_everyone: {
        id: 'tell_everyone',
        text: 'Риа кивает. «Это будет опасно. Синдикат придёт за тобой.» Молодой охотник пожимает вашу руку. «Но правда — это тоже оружие.»',
        choices: [
          {
            label: 'Принять последствия',
            action: 'CLOSE',
            setFlag: 'void_truth_public',
            reward: { credits: 50 },
          },
        ],
      },
      tell_syndicate: {
        id: 'tell_syndicate',
        text: 'Риа смотрит с горечью. «Ты выбрал власть над правдой. Что ж. Это тоже выбор.» Она уходит в болото. Образец остаётся у вас — ваш козырь.',
        choices: [
          {
            label: 'Принять выбор',
            action: 'CLOSE',
            setFlag: 'void_truth_syndicate',
            reward: { credits: 80 },
          },
        ],
      },
      keep_secret: {
        id: 'keep_secret',
        text: 'Риа устало кивает. «Иногда это мудрость. Иногда — трусость. Только время покажет.» Вы забираете записи. Тайна остаётся с вами.',
        choices: [
          {
            label: 'Хранить молчание',
            action: 'CLOSE',
            setFlag: 'void_truth_secret',
            reward: { items: ['ANCIENT_MAP'] },
          },
        ],
      },
    },
  },

  void_gate_opened: {
    id: 'void_gate_opened',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/void_gate/800/350',
        text: 'Посреди руин вы видите то, что охотники искали годами: ворота Пустоты. Восьмигранная арка из чёрного камня пульсирует. За ней — тьма, не похожая на обычную темноту. Риа смотрит на вас: «Образец — ключ. Выбор за тобой.»',
        choices: [
          {
            label: 'Запечатать ворота (пожертвовать VOID_SAMPLE)',
            action: 'GOTO_NODE',
            nextNode: 'seal_gate',
            reqItem: 'VOID_SAMPLE',
          },
          {
            label: 'Пройти сквозь ворота',
            action: 'GOTO_NODE',
            nextNode: 'enter_gate',
          },
          {
            label: 'Уничтожить ворота силой',
            action: 'GOTO_NODE',
            nextNode: 'destroy_gate',
          },
        ],
      },
      seal_gate: {
        id: 'seal_gate',
        image: 'https://picsum.photos/seed/void_seal/800/350',
        text: 'Образец разбивается о камень. Руны загораются ярко — ворота содрогаются. Тьма за ними схлопывается. Долгая тишина. Затем — первый нормальный восход солнца над этим болотом за долгие годы. «Ты закрыл рану мира,» — говорит Риа.',
        choices: [
          {
            label: 'Принять итог',
            action: 'CLOSE',
            setFlag: 'void_hunters_ended',
            penalty: { items: ['VOID_SAMPLE'] },
            reward: { hp: 40, credits: 100, energy: 30 },
            addReputation: 30,
          },
        ],
      },
      enter_gate: {
        id: 'enter_gate',
        image: 'https://picsum.photos/seed/void_inside/800/350',
        text: 'По ту сторону — не пустота, а бесконечная сеть кристаллов. Картина прошлого: Инженеры активируют устройство. Люди бегут. Каскад — жёлтая вспышка на горизонте. Вы видите лицо командора, отдающего приказ. Вас выбрасывает обратно.',
        choices: [
          {
            label: 'Запомнить увиденное',
            action: 'CLOSE',
            setFlag: ['void_hunters_ended', 'void_commander_seen'],
            reward: { credits: 60 },
          },
        ],
      },
      destroy_gate: {
        id: 'destroy_gate',
        text: 'Ворота не поддаются. Каждый удар — и тьма пульсирует сильнее. Риа хватает вас за руку: «Нельзя — это только откроет её шире!» Вы останавливаетесь на краю.',
        choices: [
          {
            label: 'Отступить и запечатать',
            action: 'GOTO_NODE',
            nextNode: 'seal_gate',
            reqItem: 'VOID_SAMPLE',
          },
          {
            label: 'Уйти — пусть охотники решают',
            action: 'CLOSE',
          },
        ],
      },
    },
  },
};
