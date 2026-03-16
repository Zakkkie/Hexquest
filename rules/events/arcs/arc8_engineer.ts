import { OverworldEvent } from '../../../types.ts';

// Arc 8 — Наследие Инженера (Engineer's Legacy)
// Flag chain: engineer_blueprint_found → engineer_parts_gathered → engineer_device_built → engineer_truth_known
// Terrain: RUINS, OUTPOST, MOUNTAINS, CITY
// Key items: data_disc, ancient_relic (quest items)

export const ARC8_EVENTS: Record<string, OverworldEvent> = {

  engineer_workshop: {
    id: 'engineer_workshop',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/engineer_workshop/800/350',
        text: 'В руинах старого квартала — замурованная дверь с инженерным замком. Символы на ней — не Синдикатские, древние. Ваш ancient_relic дрожит в кармане, будто реагирует.',
        choices: [
          {
            label: 'Открыть замком ancient_relic',
            action: 'GOTO_NODE',
            nextNode: 'enter_with_key',
            reqItem: 'ancient_relic',
          },
          {
            label: 'Вскрыть дверь буром Hornet Drill Bit',
            action: 'GOTO_NODE',
            nextNode: 'drill_in',
            reqItem: 'hornet_drill',
          },
          {
            label: 'Взломать механически (риск тревоги)',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'break_in_success',
            failNode: 'alarm_triggered',
          },
          {
            label: 'Осмотреть снаружи — не входить',
            action: 'GOTO_NODE',
            nextNode: 'observe_outside',
          },
        ],
      },
      enter_with_key: {
        id: 'enter_with_key',
        image: 'https://picsum.photos/seed/engineer_inside/800/350',
        text: 'Мастерская Инженера нетронута десятилетиями. На столах — чертежи, инструменты, кристаллические схемы. На самом видном месте — большой свиток с надписью «ПРОЕКТ КАСКАД». Рядом — дневник.',
        choices: [
          {
            label: 'Взять чертёж',
            action: 'GOTO_NODE',
            nextNode: 'take_blueprint',
          },
          {
            label: 'Прочитать дневник сначала',
            action: 'GOTO_NODE',
            nextNode: 'read_diary',
          },
        ],
      },
      drill_in: {
        id: 'drill_in',
        text: 'Бур «Шершень» с визгом вгрызается в замок. Искры летят во все стороны, но через минуту механизм сдаётся. Вы внутри, но шум наверняка привлёк внимание.',
        choices: [
          {
            label: 'Быстро войти',
            action: 'GOTO_NODE',
            nextNode: 'enter_with_key',
            addReputation: -5,
          },
        ],
      },
      take_blueprint: {
        id: 'take_blueprint',
        text: 'Чертёж — подробная схема устройства. Вы не понимаете всего, но видите: это реактор Пустоты. Что-то в комнате щёлкает — активировалась скрытая сигнализация. Нужно уходить.',
        choices: [
          {
            label: 'Схватить чертёж и бежать',
            action: 'CLOSE',
            setFlag: 'engineer_blueprint_found',
            reward: { items: ['data_disc'] },
          },
        ],
      },
      read_diary: {
        id: 'read_diary',
        image: 'https://picsum.photos/seed/engineer_diary/800/350',
        text: '«День 847. Синдикат требует ускориться. Мой ученик против — говорит, реактор нестабилен. Я устал спорить. Может, он прав...» Последняя запись — день Каскада. Автор — Главный Инженер Орден. Его ученик сбежал.',
        choices: [
          {
            label: 'Взять дневник и чертёж',
            action: 'CLOSE',
            setFlag: 'engineer_blueprint_found',
            reward: { items: ['data_disc', 'data_disc'] },
          },
        ],
      },
      break_in_success: {
        id: 'break_in_success',
        text: 'Замок поддаётся после десяти минут работы. Внутри — мастерская. Чертёж лежит на столе. Вы берёте его и быстро уходите.',
        choices: [
          {
            label: 'Уйти с чертежом',
            action: 'CLOSE',
            setFlag: 'engineer_blueprint_found',
            reward: { items: ['data_disc'] },
          },
        ],
      },
      alarm_triggered: {
        id: 'alarm_triggered',
        text: 'Механизм защиты срабатывает — стрелы из стен. Вы едва уворачиваетесь. Дверь блокируется снова. Снаружи — шум, кто-то слышал.',
        choices: [
          {
            label: 'Уйти быстро',
            action: 'CLOSE',
            penalty: { hp: 25 },
          },
        ],
      },
      observe_outside: {
        id: 'observe_outside',
        text: 'На дверном косяке — гравировка: «Только носитель ключа Рода войдёт с миром». У вас нет этого ключа. Но может, он где-то в руинах?',
        choices: [
          { label: 'Поискать позже', action: 'CLOSE' },
        ],
      },
    },
  },

  engineer_apprentice: {
    id: 'engineer_apprentice',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/engineer_apprentice/800/350',
        text: 'В таверне города — молодой мужчина с перепачканными маслом руками изучает что-то под столом. При вашем появлении он быстро прячет предметы. «Я ничего не делаю,» — говорит он слишком быстро.',
        choices: [
          {
            label: 'Спросить мягко — что прячет',
            action: 'GOTO_NODE',
            nextNode: 'gentle_ask',
          },
          {
            label: 'Показать чертёж Инженера',
            action: 'GOTO_NODE',
            nextNode: 'show_blueprint',
            reqItem: 'data_disc',
          },
          {
            label: 'Предложить помощь без вопросов',
            action: 'GOTO_NODE',
            nextNode: 'offer_help',
            addReputation: 5,
          },
        ],
      },
      gentle_ask: {
        id: 'gentle_ask',
        text: '«Я... ученик Инженера. Был им. Синдикат ищет меня — говорят, я знаю слишком много.» Он смотрит на вас с испугом. «Ты с ними?»',
        choices: [
          {
            label: 'Нет — предложить укрытие',
            action: 'GOTO_NODE',
            nextNode: 'shelter_him',
            addReputation: 10,
          },
          {
            label: 'Не твоё дело — но не предам',
            action: 'GOTO_NODE',
            nextNode: 'neutral_stance',
          },
        ],
      },
      show_blueprint: {
        id: 'show_blueprint',
        image: 'https://picsum.photos/seed/apprentice_react/800/350',
        text: 'Его глаза расширяются. «Откуда... ты был в мастерской?!» Он говорит быстро, не переводя дыхания: «Я — Карим, ученик Ордена. Я пытался остановить отца. Он не послушал. Мне нужно построить устройство — обратное. Нейтрализатор.»',
        choices: [
          {
            label: 'Помочь Кариму',
            action: 'GOTO_NODE',
            nextNode: 'shelter_him',
            addReputation: 15,
          },
          {
            label: 'Продать информацию Синдикату',
            action: 'GOTO_NODE',
            nextNode: 'betray_apprentice',
            addReputation: -25,
          },
        ],
      },
      shelter_him: {
        id: 'shelter_him',
        text: 'Карим благодарен — и напуган. «Я смогу помочь собрать нейтрализатор, если ты добудешь детали. Мне нужны: три блока металлолома, кристальный разъём и чертёж. Последний у тебя уже есть, если нашёл мастерскую.»',
        choices: [
          {
            label: 'Принять задание',
            action: 'CLOSE',
            setFlag: 'engineer_apprentice_found',
            reward: { credits: 30 },
          },
        ],
      },
      neutral_stance: {
        id: 'neutral_stance',
        text: 'Карим кивает. «Ладно. Я спрячусь сам. Но если найдёшь чертёж — ищи меня здесь. Буду ждать неделю.»',
        choices: [
          {
            label: 'Запомнить',
            action: 'CLOSE',
            setFlag: 'engineer_apprentice_seen',
          },
        ],
      },
      offer_help: {
        id: 'offer_help',
        text: 'Парень расслабляется. Он рассказывает о себе медленно — Карим, ученик Инженера. Он пытается создать нечто, что исправит ошибку учителя. Вам нужны только детали.',
        choices: [
          {
            label: 'Взяться за дело',
            action: 'CLOSE',
            setFlag: ['engineer_apprentice_found', 'engineer_blueprint_found'],
            reward: { credits: 20 },
          },
        ],
      },
      betray_apprentice: {
        id: 'betray_apprentice',
        text: 'Агенты Синдиката приходят быстро. Кариму дают уйти — или не дают. Вам платят хорошо. Тайна Инженеров остаётся тайной Синдиката.',
        choices: [
          {
            label: 'Взять деньги',
            action: 'CLOSE',
            reward: { credits: 120 },
            addReputation: -30,
          },
        ],
      },
    },
  },

  engineer_parts: {
    id: 'engineer_parts',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/engineer_parts/800/350',
        text: 'Карим объяснил: нужны три блока металлолома для каркаса нейтрализатора. На аванпосту хранится военный лом — именно такой. Охрана слабая, но есть. Можно купить, украсть или найти альтернативу.',
        choices: [
          {
            label: 'Купить металлолом у торговца (60 кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'buy_parts',
            reqCredits: 60,
            reqFlag: 'engineer_apprentice_found',
          },
          {
            label: 'Договориться с охраной аванпоста',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'negotiate_success',
            failNode: 'negotiate_fail',
            reqFlag: 'engineer_apprentice_found',
          },
          {
            label: 'Использовать food_bread для обмена',
            action: 'GOTO_NODE',
            nextNode: 'trade_supplies',
            reqItem: 'food_bread',
            reqFlag: 'engineer_apprentice_found',
          },
          {
            label: 'Предложить Emergency Generator в обмен',
            action: 'GOTO_NODE',
            nextNode: 'trade_generator',
            reqItem: 'emergency_gen',
            reqFlag: 'engineer_apprentice_found',
          },
        ],
      },
      buy_parts: {
        id: 'buy_parts',
        text: 'Торговец смотрит на вас с подозрением, но деньги берёт охотно. «Детали? Да, есть. Только не спрашивайте, откуда.» Металл тяжёлый, качественный.',
        choices: [
          {
            label: 'Забрать детали',
            action: 'CLOSE',
            setFlag: 'engineer_parts_gathered',
            penalty: { credits: 60 },
            reward: { items: ['data_disc'] },
          },
        ],
      },
      trade_generator: {
        id: 'trade_generator',
        text: 'Аварийный Генератор — это сокровище для аванпоста. Офицер не верит своим глазам. «Это решит все наши проблемы с энергией! Бери что хочешь, странник.» Вы забираете лучшие детали.',
        choices: [
          {
            label: 'Завершить сделку',
            action: 'CLOSE',
            setFlag: 'engineer_parts_gathered',
            penalty: { items: ['emergency_gen'] },
            reward: { credits: 50, energy: 20 },
            addReputation: 20,
          },
        ],
      },
      negotiate_success: {
        id: 'negotiate_success',
        text: 'Офицер аванпоста слушает вашу историю — о разработке, о Кариме. Он молчит минуту. «Мой брат погиб в Каскаде.» Он пропускает вас к складу.',
        choices: [
          {
            label: 'Взять детали',
            action: 'CLOSE',
            setFlag: 'engineer_parts_gathered',
            addReputation: 10,
          },
        ],
      },
      negotiate_fail: {
        id: 'negotiate_fail',
        text: 'Офицер хмурится. «Убирайся. Без ордера — не пущу.» Вас выпроваживают.',
        choices: [
          {
            label: 'Уйти и придумать другое',
            action: 'CLOSE',
          },
        ],
      },
      trade_supplies: {
        id: 'trade_supplies',
        text: 'Дефицит продовольствия в аванпосту острый. Ваши припасы меняются на детали без лишних вопросов.',
        choices: [
          {
            label: 'Завершить обмен',
            action: 'CLOSE',
            setFlag: 'engineer_parts_gathered',
            penalty: { items: ['food_bread'] },
          },
        ],
      },
    },
  },

  engineer_assembly: {
    id: 'engineer_assembly',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/engineer_build/800/350',
        text: 'Карим раскладывает детали на столе. Руки работают быстро. «С твоей помощью — за сутки справимся. Без — за три дня.» Он смотрит на чертёж. «Отец был гениален. Жаль, что использовал это против людей.»',
        choices: [
          {
            label: 'Помочь Кариму — работать вместе',
            action: 'GOTO_NODE',
            nextNode: 'build_together',
            reqFlag: 'engineer_parts_gathered',
          },
          {
            label: 'Дать ему работать одному',
            action: 'GOTO_NODE',
            nextNode: 'build_alone',
            reqFlag: 'engineer_parts_gathered',
          },
        ],
      },
      build_together: {
        id: 'build_together',
        image: 'https://picsum.photos/seed/engineer_done/800/350',
        text: 'Работа идёт гладко. Карим объясняет каждую деталь — вы понимаете половину, но хватает. Под утро устройство готово. Небольшое, в форме октаэдра, тихо гудит. «Оно работает,» — говорит Карим с дрожью в голосе.',
        choices: [
          {
            label: 'Взять прототип',
            action: 'CLOSE',
            setFlag: 'engineer_device_built',
            reward: { items: ['ancient_relic'] },
          },
        ],
      },
      build_alone: {
        id: 'build_alone',
        text: 'Три дня вы охраняете мастерскую. Карим почти не спит. На четвёртый — выходит с прибором. «Готово. Без тебя я бы не справился — ты защищал меня.»',
        choices: [
          {
            label: 'Получить прототип',
            action: 'CLOSE',
            setFlag: 'engineer_device_built',
            reward: { items: ['ancient_relic'] },
          },
        ],
      },
    },
  },

  engineer_demo: {
    id: 'engineer_demo',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/engineer_demo/800/350',
        text: 'Демонстрация проходит в заброшенной шахте. Карим активирует прибор. Пустотные трещины в стенах начинают затягиваться — медленно, но верно. Это работает. В этот момент в шахту входит агент Синдиката. «Интересный предмет.»',
        choices: [
          {
            label: 'Спрятать устройство — отрицать всё',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'deny_success',
            failNode: 'deny_fail',
            reqFlag: 'engineer_device_built',
          },
          {
            label: 'Продать устройство Синдикату',
            action: 'GOTO_NODE',
            nextNode: 'sell_device',
            addReputation: -20,
            reqFlag: 'engineer_device_built',
          },
          {
            label: 'Уничтожить устройство немедленно',
            action: 'GOTO_NODE',
            nextNode: 'destroy_device',
            reqFlag: 'engineer_device_built',
          },
        ],
      },
      deny_success: {
        id: 'deny_success',
        text: 'Агент уходит с пустыми руками. Карим выдыхает. «Нам нужно уходить из города. Устройство — с нами.»',
        choices: [
          {
            label: 'Уйти с Каримом',
            action: 'CLOSE',
            setFlag: 'engineer_truth_known',
            addReputation: 15,
          },
        ],
      },
      deny_fail: {
        id: 'deny_fail',
        text: 'Агент достаёт оружие. Короткий бой — вы отбиваетесь. Карим бежит с устройством. Вы уходите с ранениями, но живы.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            setFlag: 'engineer_truth_known',
            penalty: { hp: 35 },
          },
        ],
      },
      sell_device: {
        id: 'sell_device',
        text: 'Агент улыбается. Деньги меняются на устройство. Карим смотрит с ужасом. «Ты... ты продал всё.» Он уходит не оглядываясь.',
        choices: [
          {
            label: 'Взять награду',
            action: 'CLOSE',
            setFlag: 'engineer_truth_known',
            penalty: { items: ['ancient_relic'] },
            reward: { credits: 150 },
          },
        ],
      },
      destroy_device: {
        id: 'destroy_device',
        text: 'Вы разбиваете прибор о камень. Вспышка, треск. Агент смотрит на обломки. «Жаль,» — говорит он и уходит. Карим долго молчит. «Иногда уничтожить — единственный правильный выбор.»',
        choices: [
          {
            label: 'Принять последствия',
            action: 'CLOSE',
            setFlag: 'engineer_truth_known',
            addReputation: 20,
            penalty: { items: ['ancient_relic'] },
          },
        ],
      },
    },
  },

  engineer_revelation: {
    id: 'engineer_revelation',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/engineer_truth/800/350',
        text: 'Карим, наконец, показывает последнюю страницу дневника. «Здесь — имя командора, отдавшего приказ на запуск Каскада. Ты видел его лицо в Воротах Пустоты.» Имя и лицо совпадают. Текущий лидер Синдиката — он.',
        choices: [
          {
            label: 'Использовать это как оружие против Синдиката',
            action: 'GOTO_NODE',
            nextNode: 'use_as_weapon',
            reqRepMin: 0,
          },
          {
            label: 'Продать информацию — кто больше заплатит',
            action: 'GOTO_NODE',
            nextNode: 'sell_info',
            addReputation: -15,
          },
          {
            label: 'Хранить в тайне — знание — сила',
            action: 'GOTO_NODE',
            nextNode: 'keep_quiet',
          },
        ],
      },
      use_as_weapon: {
        id: 'use_as_weapon',
        text: 'Карим помогает вам подготовить доказательства. «Это меняет всё. Если народ узнает — Синдикат падёт.» Вы с ним в этом согласны.',
        choices: [
          {
            label: 'Передать доказательства Сопротивлению',
            action: 'CLOSE',
            setFlag: ['engineer_revelation_done', 'resistance_has_proof'],
            addReputation: 30,
            reward: { credits: 60 },
          },
        ],
      },
      sell_info: {
        id: 'sell_info',
        text: 'Два претендента, две цены. Вы выбираете богаче. Карим уходит. «Надеюсь, деньги стоят того.»',
        choices: [
          {
            label: 'Продать',
            action: 'CLOSE',
            setFlag: 'engineer_revelation_done',
            reward: { credits: 200 },
            addReputation: -20,
          },
        ],
      },
      keep_quiet: {
        id: 'keep_quiet',
        text: 'Карим кивает. «Это мудро. Наёмники Синдиката не будут охотиться за молчанием.» Вы прячете доказательства.',
        choices: [
          {
            label: 'Хранить тайну',
            action: 'CLOSE',
            setFlag: 'engineer_revelation_done',
            reward: { items: ['ancient_relic'] },
          },
        ],
      },
    },
  },
};
