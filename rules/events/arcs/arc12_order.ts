import { OverworldEvent } from '../../../types.ts';

// Arc 12 — Орден Строителей (Order of Builders)
// Flag chain: order_archivist_met → order_codex_fragment_found → order_ritual_attempted → order_beacon_lit | order_ritual_failed_void
// Terrain: RUINS, MOUNTAINS, MOUNTAINS (monastery), RUINS (terminal), MOUNTAINS (beacon summit)
// Key items: ancient_relic (required for codex discovery), void_core_fragment (heroic reward)
// NPC: Архивист Сейбл — старый учёный, холодный и точный, укрывается в горном монастыре
// Faction flags from other arcs: mountain_monastery_looted, mountain_monastery_welcomed

export const ARC12_EVENTS: Record<string, OverworldEvent> = {

  order_archivist_monastery: {
    id: 'order_archivist_monastery',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/order_monastery/800/350',
        text: 'Высоко в горах, за каменными воротами с символами Строителей, стоит монастырь Ордена. У входа — пожилая женщина в сером. Она смотрит на вас без выражения. «Странники сюда не ходят,» — говорит она ровно. — «Без причины.»',
        choices: [
          {
            label: 'Объяснить, что ищете знания о Строителях',
            action: 'GOTO_NODE',
            nextNode: 'seek_knowledge',
            reqFlagAbsent: 'mountain_monastery_looted',
          },
          {
            label: 'Показать артефакт Строителей',
            action: 'GOTO_NODE',
            nextNode: 'show_relic',
            reqItem: 'ancient_relic',
            reqFlagAbsent: 'mountain_monastery_looted',
          },
          {
            label: '(Монастырь разграблен) Сейбл смотрит на вас в упор',
            action: 'GOTO_NODE',
            nextNode: 'hostile_sable',
            reqFlag: 'mountain_monastery_looted',
          },
          {
            label: '(Монастырь принял вас) Войти как свой',
            action: 'GOTO_NODE',
            nextNode: 'welcomed_entry',
            reqFlag: 'mountain_monastery_welcomed',
          },
        ],
      },
      seek_knowledge: {
        id: 'seek_knowledge',
        image: 'https://picsum.photos/seed/order_sable_cold/800/350',
        text: '«Знания.» Сейбл повторяет слово, будто пробует на вкус. «Все ищут знания. Немногие способны их нести.» Она молчит долгую минуту, изучая вас. «Есть руины в восточных предгорьях. Там — остатки библиотеки Строителей. Если найдёте Кодекс и вернётесь живым — поговорим.»',
        choices: [
          {
            label: 'Принять задание',
            action: 'CLOSE',
            setFlag: 'order_archivist_met',
            addReputation: 5,
          },
          {
            label: 'Уйти — это не ваше дело',
            action: 'CLOSE',
          },
        ],
      },
      show_relic: {
        id: 'show_relic',
        image: 'https://picsum.photos/seed/order_sable_relic/800/350',
        text: 'Глаза Сейбл сужаются. Она делает шаг вперёд, берёт реликвию и долго держит в руках. «Это из Нижней Цитадели. Досиндикатский период.» Возвращает с лёгким поклоном. «Вы не простой мародёр. Идите в восточные руины — там ждёт фрагмент Кодекса. Он узнает вас.»',
        choices: [
          {
            label: 'Отправиться за Кодексом',
            action: 'CLOSE',
            setFlag: 'order_archivist_met',
            addReputation: 10,
          },
        ],
      },
      hostile_sable: {
        id: 'hostile_sable',
        text: 'Сейбл не двигается, но её голос становится холоднее стали: «Ты был здесь. Взял то, что не твоё.» Охранники Ордена появляются по обе стороны от неё. «Архивы помнят всё. И всех.» Разговора не получится — только если вы принесёте доказательство раскаяния.',
        choices: [
          {
            label: 'Предложить ancient_relic как компенсацию',
            action: 'GOTO_NODE',
            nextNode: 'relic_apology',
            reqItem: 'ancient_relic',
          },
          {
            label: 'Уйти — это тупик',
            action: 'CLOSE',
          },
        ],
      },
      relic_apology: {
        id: 'relic_apology',
        text: 'Сейбл смотрит на артефакт, потом на вас. «Это не возместит потерю. Но это... жест.» Долгое молчание. «Орден не забывает. Но Орден также умеет ждать.» Она убирает реликвию. «Найдите Кодекс в восточных руинах. Тогда поговорим о доверии.»',
        choices: [
          {
            label: 'Принять условие',
            action: 'CLOSE',
            setFlag: 'order_archivist_met',
            penalty: { items: ['ancient_relic'] },
          },
        ],
      },
      welcomed_entry: {
        id: 'welcomed_entry',
        image: 'https://picsum.photos/seed/order_sable_warm/800/350',
        text: 'Сейбл встречает вас у ворот сама. «Я слышала, что вы вернулись.» Первый раз в её голосе — не холод, а сдержанное уважение. «Орден бережёт тех, кто бережёт Орден. Есть задание — важное. Восточные руины хранят фрагмент Кодекса Строителей. Нам нужен он, и человек, способный его прочесть.»',
        choices: [
          {
            label: 'Взяться за задание',
            action: 'CLOSE',
            setFlag: 'order_archivist_met',
            addReputation: 15,
            reward: { credits: 40 },
          },
        ],
      },
    },
  },

  order_codex_ruins: {
    id: 'order_codex_ruins',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/order_ruins/800/350',
        text: 'Восточные руины — бывшая библиотека Строителей. Обугленные колонны, рухнувшие перекрытия, запах времени. В центральном зале под обломками виднеется каменная плита с символами. Ваш ancient_relic начинает тихо светиться.',
        choices: [
          {
            label: 'Использовать ancient_relic для активации плиты',
            action: 'GOTO_NODE',
            nextNode: 'relic_activates',
            reqItem: 'ancient_relic',
            reqFlag: 'order_archivist_met',
          },
          {
            label: 'Попытаться поднять плиту вручную',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'manual_open',
            failNode: 'manual_fail',
            reqFlag: 'order_archivist_met',
          },
          {
            label: 'Осмотреть руины — поискать другой вход',
            action: 'GOTO_NODE',
            nextNode: 'search_ruins',
            reqFlag: 'order_archivist_met',
          },
        ],
      },
      relic_activates: {
        id: 'relic_activates',
        image: 'https://picsum.photos/seed/order_codex_open/800/350',
        text: 'Реликвия вспыхивает ярким светом. Символы на плите отвечают — один за другим, снизу вверх. Камень сдвигается сам. В тайнике — тонкая металлическая пластина, покрытая гравировкой на языке Строителей. Кодекс. Рядом — схема устройства, похожего на маяк.',
        choices: [
          {
            label: 'Взять Кодекс и схему',
            action: 'CLOSE',
            setFlag: 'order_codex_fragment_found',
            reward: { credits: 30, items: ['data_disc'] },
            addReputation: 10,
          },
        ],
      },
      manual_open: {
        id: 'manual_open',
        text: 'Плита тяжёлая, но поддаётся. В тайнике — металлическая пластина с гравировкой Строителей. Кодекс. Текст частичный — часть разрушена, но ключевая схема цела.',
        choices: [
          {
            label: 'Взять Кодекс',
            action: 'CLOSE',
            setFlag: 'order_codex_fragment_found',
            reward: { credits: 15, items: ['data_disc'] },
          },
        ],
      },
      manual_fail: {
        id: 'manual_fail',
        text: 'Плита не двигается. При попытке вы тревожите нестабильные перекрытия — обломки сыплются сверху. Вы едва уходите из-под завала.',
        choices: [
          {
            label: 'Отступить и придумать другое',
            action: 'CLOSE',
            penalty: { hp: 15 },
          },
        ],
      },
      search_ruins: {
        id: 'search_ruins',
        text: 'Вы обходите зал по периметру. В восточном крыле — провал в полу. Под ним — небольшой подвал, нетронутый. На полке — металлическая пластина. Кодекс Строителей, хранившийся в темноте целые десятилетия.',
        choices: [
          {
            label: 'Взять пластину',
            action: 'CLOSE',
            setFlag: 'order_codex_fragment_found',
            reward: { credits: 20, items: ['data_disc'] },
            addReputation: 5,
          },
        ],
      },
    },
  },

  order_sable_deeper_knowledge: {
    id: 'order_sable_deeper_knowledge',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/order_sable_archive/800/350',
        text: 'Сейбл изучает Кодекс долго, в полной тишине. Потом поднимает взгляд. «Схема на обороте — это не просто маяк. Это Маяк Равновесия. Строители создали его, чтобы сдерживать Пустоту.» Она делает паузу. «Орден знал об этом семьдесят лет. Мы ждали кого-то, кто сможет активировать его.»',
        choices: [
          {
            label: '(Только для доверенных) Спросить о ритуале активации',
            action: 'GOTO_NODE',
            nextNode: 'ritual_briefing',
            reqFlag: 'order_codex_fragment_found',
            reqRepMin: 25,
          },
          {
            label: 'Спросить, почему Орден ждал так долго',
            action: 'GOTO_NODE',
            nextNode: 'why_waiting',
            reqFlag: 'order_codex_fragment_found',
          },
        ],
      },
      ritual_briefing: {
        id: 'ritual_briefing',
        image: 'https://picsum.photos/seed/order_sable_trust/800/350',
        text: '«Терминал Строителей — в руинах к северу. Кодекс — ключ. Но ритуал опасен.» Сейбл смотрит без эмоций. «Активация может потревожить Пустоту. Частичная активация — хуже, чем ничего: разбудит спящие нити. Полная — и маяк стабилизирует этот регион на годы.» Она кладёт руку на плечо. Жест редкий, тяжёлый. «Выбор ваш.»',
        choices: [
          {
            label: 'Идти к терминалу — активировать маяк',
            action: 'CLOSE',
            setFlag: 'order_ritual_briefed',
            addReputation: 10,
          },
          {
            label: 'Попросить время подумать',
            action: 'CLOSE',
          },
        ],
      },
      why_waiting: {
        id: 'why_waiting',
        text: '«Потому что активация требует человека с пониманием,» — говорит Сейбл тихо. — «Не силы. Понимания. Мы ждали. Большинство искателей хотят власти — они не подходят.» Она смотрит прямо. «Вы нашли Кодекс. Это уже ответ.»',
        choices: [
          {
            label: 'Спросить о ритуале',
            action: 'GOTO_NODE',
            nextNode: 'ritual_briefing',
            reqRepMin: 25,
          },
          {
            label: 'Уйти с этим',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  order_terminal_activation: {
    id: 'order_terminal_activation',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/order_terminal/800/350',
        text: 'Терминал Строителей — монолит из тёмного металла высотой в два человека. Поверхность покрыта символами, идентичными Кодексу. Рядом — следы старых костров: кто-то был здесь до вас. Кристаллический интерфейс в центре тускло мерцает — система в режиме ожидания уже десятилетия.',
        choices: [
          {
            label: 'Приложить Кодекс к интерфейсу (бросок)',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'terminal_partial',
            failNode: 'terminal_void_surge',
            reqFlag: 'order_codex_fragment_found',
          },
          {
            label: 'Изучить терминал перед активацией',
            action: 'GOTO_NODE',
            nextNode: 'study_terminal',
            reqFlag: 'order_codex_fragment_found',
          },
          {
            label: 'Уйти — риск слишком велик',
            action: 'CLOSE',
          },
        ],
      },
      terminal_partial: {
        id: 'terminal_partial',
        image: 'https://picsum.photos/seed/order_terminal_glow/800/350',
        text: 'Терминал оживает. Символы вспыхивают цепочкой — зелёный, зелёный, жёлтый... и стоп. Частичная активация. Маяк не зажигается, но где-то глубоко под землёй что-то пробудилось. Стены вибрируют. Из трещины в полу тянется чёрная нить — дремавшая нить Пустоты, разбуженная импульсом.',
        choices: [
          {
            label: 'Прижать нить и продолжить ритуал',
            action: 'GOTO_NODE',
            nextNode: 'push_through',
            penalty: { hp: 10 },
          },
          {
            label: 'Отступить — доложить Сейбл',
            action: 'CLOSE',
            setFlag: 'order_ritual_attempted',
            penalty: { hp: 10 },
          },
        ],
      },
      terminal_void_surge: {
        id: 'terminal_void_surge',
        text: 'Кодекс отвергнут — не той стороной, не в том порядке. Терминал молчит. Но импульс уже послан вглубь — что-то там шевельнулось. Из пола ползёт тёмное свечение. Нить Пустоты — тонкая, но живая.',
        choices: [
          {
            label: 'Немедленно уйти',
            action: 'CLOSE',
            setFlag: 'order_ritual_attempted',
            penalty: { hp: 10 },
          },
        ],
      },
      study_terminal: {
        id: 'study_terminal',
        text: 'Вы изучаете символы час, потом ещё один. Паттерн найден: активация требует прикладывать Кодекс снизу вверх, по спирали символов. Вы готовы.',
        choices: [
          {
            label: 'Активировать правильным способом (↑ шанс)',
            action: 'ROLL_DICE',
            probability: 0.7,
            successNode: 'terminal_partial',
            failNode: 'terminal_void_surge',
            reqFlag: 'order_codex_fragment_found',
          },
        ],
      },
      push_through: {
        id: 'push_through',
        image: 'https://picsum.photos/seed/order_terminal_beacon/800/350',
        text: 'Боль обжигает руку, но вы не отпускаете Кодекс. Символы продолжают цепочку — жёлтый становится зелёным. Последний символ загорается белым. Где-то в горах — тихий, но ощутимый толчок. Маяк Равновесия пробуждается.',
        choices: [
          {
            label: 'Держаться до конца',
            action: 'CLOSE',
            setFlag: 'order_ritual_attempted',
            addReputation: 15,
          },
        ],
      },
    },
  },

  order_beacon_summit: {
    id: 'order_beacon_summit',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/order_beacon/800/350',
        text: 'Вершина горы. Здесь — древняя башня Строителей, полузасыпанная снегом. Сейбл ждёт вас. Она смотрит на терминальный кристалл в ваших руках и кивает один раз. «Момент настал.» Башня открывается — внутри чисто, будто Строители ушли вчера.',
        choices: [
          {
            label: 'Установить кристалл в основание башни',
            action: 'GOTO_NODE',
            nextNode: 'beacon_heroic',
            reqFlag: 'order_ritual_attempted',
            reqFlagAbsent: 'order_ritual_failed_void',
          },
          {
            label: '(Ритуал провалился) Признать неудачу',
            action: 'GOTO_NODE',
            nextNode: 'beacon_failure_path',
            reqFlag: 'order_ritual_attempted',
          },
          {
            label: 'Попытаться активировать маяк в обход ритуала',
            action: 'GOTO_NODE',
            nextNode: 'beacon_bypass',
            reqFlagAbsent: 'order_ritual_attempted',
          },
        ],
      },
      beacon_heroic: {
        id: 'beacon_heroic',
        image: 'https://picsum.photos/seed/order_beacon_lit/800/350',
        text: 'Кристалл входит в паз с тихим щелчком. Башня вибрирует. Свет поднимается от основания к вершине — медленно, торжественно. Луч уходит в небо. Сейбл смотрит вверх, не моргая. «Семьдесят лет.» Тихо. Почти шёпот. «Пустота в этом регионе отступит. Не навсегда. Но достаточно.»',
        choices: [
          {
            label: 'Принять итог',
            action: 'CLOSE',
            setFlag: 'order_beacon_lit',
            reward: { credits: 200, items: ['void_core_fragment'] },
            addReputation: 30,
          },
        ],
      },
      beacon_failure_path: {
        id: 'beacon_failure_path',
        text: 'Сейбл слушает молча. «Нить пробудилась.» Она закрывает глаза. «Значит, башня уже не нейтральна. Если установить кристалл сейчас — Пустота войдёт через маяк, а не отступит от него.» Она смотрит на вас. «Есть способ — но он потребует всего.»',
        choices: [
          {
            label: 'Пойти на это',
            action: 'GOTO_NODE',
            nextNode: 'beacon_sacrifice',
          },
          {
            label: 'Отказаться — это слишком',
            action: 'CLOSE',
            setFlag: ['order_ritual_failed_void', 'void_tendril_active'],
            penalty: { hp: 25 },
          },
        ],
      },
      beacon_sacrifice: {
        id: 'beacon_sacrifice',
        image: 'https://picsum.photos/seed/order_beacon_struggle/800/350',
        text: 'Вы устанавливаете кристалл. Башня дрожит — свет и тьма борются внутри камня. Сейбл читает формулу по Кодексу вслух. Пустота рвётся наружу. Вы держите кристалл обеими руками. Боль нарастает. Потом — тишина. Луч уходит в небо. Слабый, неровный — но настоящий.',
        choices: [
          {
            label: 'Выдержать',
            action: 'CLOSE',
            setFlag: 'order_beacon_lit',
            reward: { credits: 180, items: ['void_core_fragment'] },
            penalty: { hp: 25 },
            addReputation: 25,
          },
        ],
      },
      beacon_bypass: {
        id: 'beacon_bypass',
        text: 'Без ритуала башня не реагирует. Сейбл смотрит на вас с привычным холодом: «Порядок существует не ради порядка. Сначала — Терминал. Потом — Маяк.» Путь закрыт.',
        choices: [
          {
            label: 'Отступить и завершить ритуал',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  order_void_manifestation: {
    id: 'order_void_manifestation',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/order_void_fail/800/350',
        text: 'Нить Пустоты, пробуждённая провальным ритуалом, стала толще. Она ползёт по руинам терминала, поглощая камень. Сейбл находит вас сама. Её лицо — непроницаемо, но в голосе — усталость: «Частичная активация. Худший исход.» Она смотрит на нить. «Теперь надо выбрать — запечатать немедленно или дать ей вырасти и изучить.»',
        choices: [
          {
            label: 'Запечатать нить сейчас (пожертвовать data_disc)',
            action: 'GOTO_NODE',
            nextNode: 'seal_tendril',
            reqItem: 'data_disc',
            reqFlag: 'order_ritual_attempted',
          },
          {
            label: 'Дать вырасти — изучить Пустоту',
            action: 'GOTO_NODE',
            nextNode: 'let_grow',
            reqFlag: 'order_ritual_attempted',
          },
          {
            label: 'Уйти — это не ваша проблема',
            action: 'CLOSE',
            setFlag: ['order_ritual_failed_void', 'void_tendril_active'],
            penalty: { hp: 25 },
            addReputation: -15,
          },
        ],
      },
      seal_tendril: {
        id: 'seal_tendril',
        text: 'Сейбл использует данные с диска — формула из архива Ордена. Нить сокращается, темнеет, затвердевает. Кристалл на конце — инертный, мёртвый. «Запечатано,» — говорит она. — «Временно. Маяк всё равно нужен.»',
        choices: [
          {
            label: 'Взять запечатанный кристалл',
            action: 'CLOSE',
            setFlag: 'order_tendril_sealed',
            clearFlag: 'order_ritual_attempted',
            penalty: { items: ['data_disc'] },
            reward: { credits: 50 },
            addReputation: 10,
          },
        ],
      },
      let_grow: {
        id: 'let_grow',
        text: 'Сейбл долго смотрит на вас. «Это опасно. Для вас и для региона.» Но кивает. Неделю вы наблюдаете за нитью. Данные бесценные — Орден узнаёт о Пустоте больше, чем за последние двадцать лет. Потом нить прорывается наружу и исчезает в земле. Пустота где-то рядом — и знает о вас.',
        choices: [
          {
            label: 'Принять последствия',
            action: 'CLOSE',
            setFlag: ['order_ritual_failed_void', 'void_tendril_active'],
            reward: { credits: 80, items: ['data_disc'] },
            penalty: { hp: 25 },
          },
        ],
      },
    },
  },

};
