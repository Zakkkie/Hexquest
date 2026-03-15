import { OverworldEvent } from '../../../types.ts';

export const RUINS_ENCOUNTERS: Record<string, OverworldEvent> = {
  ruins_mechanical_sentinel: {
    id: 'ruins_mechanical_sentinel',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_mechanical_sentinel/800/350',
        text: 'В арке разрушенного здания стоит механическая конструкция — три метра высоты, покрытая ржавчиной и мхом. Она неподвижна. Но когда вы подходите ближе, из её грудной клетки начинает мерно мигать огонь — медленно, будто пульс спящего существа.',
        choices: [
          {
            label: 'Попробовать деактивировать стража',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'deactivated',
            failNode: 'sentinel_attacks',
          },
          {
            label: 'Предъявить Прототип устройства — может, он опознает своих',
            action: 'GOTO_NODE',
            nextNode: 'device_recognition',
            reqItem: 'PROTOTYPE_DEVICE',
          },
          {
            label: 'Обойти стороной',
            action: 'CLOSE',
            penalty: { energy: 10 },
          },
          {
            label: 'Разобрать на части, пока не проснулся',
            action: 'ROLL_DICE',
            probability: 0.35,
            successNode: 'salvaged',
            failNode: 'sentinel_attacks',
          },
        ],
      },
      deactivated: {
        id: 'deactivated',
        text: 'Правильная последовательность находится интуитивно — три нажатия в центр грудной клетки. Страж медленно опускается на колени и замирает. Из его спины выдвигается контейнер с данными.',
        choices: [
          {
            label: 'Взять контейнер',
            action: 'CLOSE',
            reward: { items: ['BLUEPRINT'], credits: 50 },
            addReputation: 10,
          },
        ],
      },
      sentinel_attacks: {
        id: 'sentinel_attacks',
        text: 'Страж просыпается. Его движения медленные, но удар — как удар стены. Вас отбрасывает на несколько метров. Вы успеваете выбежать из зоны его патрулирования, но ненамного.',
        choices: [
          {
            label: 'Бежать',
            action: 'CLOSE',
            penalty: { hp: 35, energy: 15 },
          },
        ],
      },
      device_recognition: {
        id: 'device_recognition',
        text: 'Страж замирает при виде прототипа. Его сенсоры сканируют предмет. Потом — неожиданно — он отходит в сторону, освобождая проход. Сигнальный огонь меняет цвет с красного на синий.',
        choices: [
          {
            label: 'Пройти свободно',
            action: 'CLOSE',
            reward: { energy: 10 },
            addReputation: 10,
          },
          {
            label: 'Войти вглубь и исследовать',
            action: 'CLOSE',
            reward: { credits: 60, items: ['RUNIC_TABLET'] },
            penalty: { energy: 15 },
          },
        ],
      },
      salvaged: {
        id: 'salvaged',
        text: 'Вы разбираете конструкцию методично. Материалы высокого качества — такие теперь не делают. Из внутренностей стража — компоненты, явно стоящие целое состояние на чёрном рынке.',
        choices: [
          {
            label: 'Взять всё',
            action: 'CLOSE',
            reward: { credits: 70, items: ['SCRAP', 'PROTOTYPE_DEVICE'] },
            addReputation: -10,
          },
        ],
      },
    },
  },

  ruins_time_echo: {
    id: 'ruins_time_echo',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_time_echo/800/350',
        text: 'В разрушенном зале вы видите людей. Они говорят, двигаются, смеются — но сквозь них просвечивают камни. Призраки? Нет. Это запись. Временной отпечаток эпохи, когда это место было живым. Вы стоите посреди чужого прошлого.',
        choices: [
          {
            label: 'Наблюдать и запоминать',
            action: 'GOTO_NODE',
            nextNode: 'observe',
          },
          {
            label: 'Попытаться взаимодействовать с призраком',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'echo_speaks',
            failNode: 'echo_fades',
          },
          {
            label: 'Найти источник аномалии',
            action: 'GOTO_NODE',
            nextNode: 'source',
          },
        ],
      },
      observe: {
        id: 'observe',
        text: 'Вы смотрите час, может, два. Сцены повторяются: обычная жизнь, споры, смех, последний день — паника, что-то пришло снизу. Один из людей в записи смотрит прямо на вас. Этого не должно быть.',
        choices: [
          {
            label: 'Уйти пока не поздно',
            action: 'CLOSE',
            reward: { credits: 20 },
            addReputation: 5,
          },
          {
            label: 'Продолжить наблюдение',
            action: 'GOTO_NODE',
            nextNode: 'echo_speaks',
          },
        ],
      },
      echo_speaks: {
        id: 'echo_speaks',
        text: 'Фигура в записи поворачивается к вам и говорит — звук искажён, слова обрывочны. Но одну фразу вы понимаете чётко: «Не открывай нижние уровни». Потом запись прерывается.',
        choices: [
          {
            label: 'Записать предупреждение',
            action: 'CLOSE',
            reward: { credits: 30 },
            setFlag: 'echo_warning_received',
            addReputation: 10,
          },
        ],
      },
      echo_fades: {
        id: 'echo_fades',
        text: 'Ваше вмешательство нарушает петлю. Образы рассыпаются, как пепел. Зал снова пуст. Что-то ценное было здесь — и вы его разрушили.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            penalty: { energy: 10 },
            addReputation: -5,
          },
        ],
      },
      source: {
        id: 'source',
        text: 'В полу — небольшой кристалл, пульсирующий светом в такт с голограммами. Именно он питает эхо. Вынуть его — значит уничтожить запись навсегда.',
        choices: [
          {
            label: 'Взять кристалл',
            action: 'CLOSE',
            reward: { items: ['VOID_SAMPLE'], credits: 40 },
            addReputation: -15,
          },
          {
            label: 'Оставить запись жить',
            action: 'CLOSE',
            addReputation: 15,
          },
        ],
      },
    },
  },

  ruins_hidden_library: {
    id: 'ruins_hidden_library',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_hidden_library/800/350',
        text: 'За обвалившейся стеной — целый зал с полками. Часть книг уничтожена сыростью, но многие сохранились под слоем пыли. Кто-то тщательно замуровал эту комнату — и столь же тщательно отсортировал коллекцию. Здесь явно не просто библиотека.',
        choices: [
          {
            label: 'Тщательно изучить коллекцию',
            action: 'GOTO_NODE',
            nextNode: 'study',
          },
          {
            label: 'Взять всё, что можно унести',
            action: 'CLOSE',
            reward: { credits: 55, items: ['MONASTERY_SCROLL', 'RUNIC_TABLET'] },
            addReputation: -5,
          },
          {
            label: 'Поискать что-то конкретное о Пустоте',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'void_found',
            failNode: 'nothing_relevant',
          },
        ],
      },
      study: {
        id: 'study',
        text: 'Библиотека — личный архив учёного, работавшего над природой Пустоты. Последние записи датируются несколькими годами до катастрофы. Он знал, что произойдёт. И знал, как это остановить.',
        choices: [
          {
            label: 'Скопировать ключевые страницы',
            action: 'CLOSE',
            reward: { items: ['RUNIC_TABLET'], credits: 40 },
            setFlag: 'knows_void_counter',
            penalty: { energy: 15 },
            addReputation: 15,
          },
          {
            label: 'Взять весь архив с собой',
            action: 'CLOSE',
            reward: { items: ['ELDER_MAP', 'RUNIC_TABLET', 'MONASTERY_SCROLL'] },
            penalty: { energy: 25 },
            addReputation: 10,
          },
        ],
      },
      void_found: {
        id: 'void_found',
        text: 'Один из томов — трактат о природе Пустоты, написанный от руки. Автор описывает её как живой организм. И называет три точки, в которых её можно ослабить.',
        choices: [
          {
            label: 'Взять трактат',
            action: 'CLOSE',
            reward: { items: ['VOID_SAMPLE'], credits: 50 },
            setFlag: 'void_weakpoints_known',
            addReputation: 15,
          },
        ],
      },
      nothing_relevant: {
        id: 'nothing_relevant',
        text: 'Тексты о Пустоте здесь есть, но повреждены сверх прочтения. Вы находите только общие сведения — ничего, чего уже не знали.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            reward: { credits: 20 },
          },
        ],
      },
    },
  },

  ruins_energy_pillar: {
    id: 'ruins_energy_pillar',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_energy_pillar/800/350',
        text: 'В центре разрушенного двора стоит столб из неизвестного материала — тёмный, почти чёрный, с прожилками электрического света, текущими вверх. Он тёплый на расстоянии десяти метров. Живой. Вокруг него — мёртвая зона: никаких растений, никаких насекомых.',
        choices: [
          {
            label: 'Прикоснуться к столбу',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'pillar_touch_good',
            failNode: 'pillar_touch_bad',
          },
          {
            label: 'Подключить Прототип устройства',
            action: 'GOTO_NODE',
            nextNode: 'connect_device',
            reqItem: 'PROTOTYPE_DEVICE',
          },
          {
            label: 'Взять образец материала',
            action: 'CLOSE',
            reward: { items: ['VOID_SAMPLE'] },
            penalty: { hp: 15 },
          },
          {
            label: 'Обойти и не касаться',
            action: 'CLOSE',
          },
        ],
      },
      pillar_touch_good: {
        id: 'pillar_touch_good',
        text: 'Ток пронзает вас — не болезненно, почти приятно. Столб передаёт что-то в ваше тело: концентрацию, ясность, энергию. Вы чувствуете себя полностью восстановленным.',
        choices: [
          {
            label: 'Отойти восстановленным',
            action: 'CLOSE',
            reward: { hp: 30, energy: 25 },
            addReputation: 5,
          },
        ],
      },
      pillar_touch_bad: {
        id: 'pillar_touch_bad',
        text: 'Разряд — резкий, жестокий. Вас отбрасывает на три метра, руки онемели. Столб светится ярче. Он насытился.',
        choices: [
          {
            label: 'Прийти в себя и уйти',
            action: 'CLOSE',
            penalty: { hp: 30, energy: 20 },
          },
        ],
      },
      connect_device: {
        id: 'connect_device',
        text: 'Прототип соединяется со столбом без труда — будто был создан для этого. Скачивается огромный массив данных. Устройство трещит от перегрузки, но держится.',
        choices: [
          {
            label: 'Прервать загрузку, сохранив данные',
            action: 'CLOSE',
            reward: { items: ['BLUEPRINT'], credits: 60 },
            addReputation: 10,
          },
          {
            label: 'Дождаться полной загрузки — рискованно',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'full_download',
            failNode: 'device_destroyed',
          },
        ],
      },
      full_download: {
        id: 'full_download',
        text: 'Загрузка завершается. Устройство нагрелось до предела, но работает. В нём теперь — полные чертежи объекта, созданного до катастрофы.',
        choices: [
          {
            label: 'Взять устройство с данными',
            action: 'CLOSE',
            reward: { items: ['BLUEPRINT', 'RUNIC_TABLET'], credits: 80 },
            addReputation: 15,
          },
        ],
      },
      device_destroyed: {
        id: 'device_destroyed',
        text: 'Устройство не выдерживает и плавится. Данные потеряны. Вы стоите со сломанным прибором в руках.',
        choices: [
          {
            label: 'Уйти с обломками',
            action: 'CLOSE',
            penalty: { items: ['PROTOTYPE_DEVICE'], energy: 10 },
          },
        ],
      },
    },
  },

  ruins_mass_grave: {
    id: 'ruins_mass_grave',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_mass_grave/800/350',
        text: 'Раскопки обнажили слои. Под фундаментом — не просто земля. Тысячи. Аккуратно уложенных. Со следами не войны, а чего-то методичного. Это не поле боя — это завод смерти. Воздух здесь другой. Давящий. Присутствующий.',
        choices: [
          {
            label: 'Возвести временный памятный знак',
            action: 'CLOSE',
            penalty: { energy: 10 },
            addReputation: 20,
            setFlag: 'marked_mass_grave',
          },
          {
            label: 'Искать документы — кто это сделал',
            action: 'GOTO_NODE',
            nextNode: 'search_docs',
          },
          {
            label: 'Уйти, не задерживаясь',
            action: 'CLOSE',
            addReputation: -5,
          },
        ],
      },
      search_docs: {
        id: 'search_docs',
        text: 'В кармане одного из мундиров — влагозащитный документ. Приказ. Дата, подписи, печать. Это официальная бумага. Орден. Имена исполнителей. Часть из них ещё жива.',
        choices: [
          {
            label: 'Сохранить документ как улику',
            action: 'CLOSE',
            reward: { items: ['SEALED_LETTER'], credits: 20 },
            setFlag: 'has_atrocity_evidence',
            addReputation: 20,
          },
          {
            label: 'Продать информацию за деньги',
            action: 'CLOSE',
            reward: { credits: 80 },
            addReputation: -15,
          },
          {
            label: 'Сжечь — некоторые правды лучше не знать',
            action: 'CLOSE',
            addReputation: -10,
          },
        ],
      },
    },
  },

  ruins_buried_ship: {
    id: 'ruins_buried_ship',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_buried_ship/800/350',
        text: 'Из земли торчит нос воздушного корабля — не потерпевшего крушение, а именно закопанного кем-то намеренно, очень давно. Вокруг — кольцо камней с символами. Часть обшивки вскрыта изнутри. Что-то уже побывало здесь до вас.',
        choices: [
          {
            label: 'Проникнуть внутрь через вскрытую обшивку',
            action: 'GOTO_NODE',
            nextNode: 'inside',
          },
          {
            label: 'Изучить символы на камнях',
            action: 'CLOSE',
            reward: { items: ['RUNIC_TABLET'], credits: 25 },
            addReputation: 5,
          },
          {
            label: 'Попробовать запустить двигатели',
            action: 'ROLL_DICE',
            probability: 0.25,
            successNode: 'engine_start',
            failNode: 'engine_fail',
          },
        ],
      },
      inside: {
        id: 'inside',
        text: 'Внутри — капсула времени. Личные вещи экипажа, бортовой журнал, груз. Журнал описывает миссию по перевозке «контейнера, который нельзя открывать». Контейнера нет. Люди исчезли. Груз исчез.',
        choices: [
          {
            label: 'Взять журнал',
            action: 'CLOSE',
            reward: { items: ['ELDER_MAP'], credits: 35 },
            setFlag: 'knows_missing_container',
            addReputation: 10,
          },
          {
            label: 'Взять личные вещи экипажа',
            action: 'CLOSE',
            reward: { credits: 50 },
            addReputation: -10,
          },
        ],
      },
      engine_start: {
        id: 'engine_start',
        text: 'Один из двигателей даёт искру — потом рёв — потом корабль дрожит. Он не взлетит, но генератор запускается. Несколько минут у вас есть электричество и доступ к системам.',
        choices: [
          {
            label: 'Скачать навигационные данные',
            action: 'CLOSE',
            reward: { items: ['ANCIENT_MAP', 'BLUEPRINT'], credits: 60 },
            addReputation: 10,
          },
        ],
      },
      engine_fail: {
        id: 'engine_fail',
        text: 'Двигатель взрывается — не катастрофически, но достаточно. Вспышка обжигает лицо, вас швыряет к стене. Корабль снова мёртв.',
        choices: [
          {
            label: 'Уйти с ожогами',
            action: 'CLOSE',
            penalty: { hp: 25, energy: 15 },
          },
        ],
      },
    },
  },

  ruins_inscription_fragment: {
    id: 'ruins_inscription_fragment',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_inscription_fragment/800/350',
        text: 'На стене — часть большой надписи, остальное раздроблено. Текст прерывается на полуслове. Но то, что осталось — содержит нечто знакомое: имя, координату, предупреждение. Алфавит старый, но читаемый.',
        choices: [
          {
            label: 'Расшифровать фрагмент самостоятельно',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'decoded',
            failNode: 'partial_decode',
          },
          {
            label: 'Использовать Руническую таблицу',
            action: 'GOTO_NODE',
            nextNode: 'tablet_decode',
            reqItem: 'RUNIC_TABLET',
          },
          {
            label: 'Сделать эстамп и двигаться дальше',
            action: 'CLOSE',
            reward: { credits: 20 },
          },
        ],
      },
      decoded: {
        id: 'decoded',
        text: 'Смысл проясняется: это предупреждение о том, что «Камень Равновесия» был разрушен намеренно, а не упал сам. И имя разрушителя — имя, которое вы слышали прежде.',
        choices: [
          {
            label: 'Записать и сохранить',
            action: 'CLOSE',
            reward: { credits: 30 },
            setFlag: 'knows_balance_stone_truth',
            addReputation: 10,
          },
        ],
      },
      partial_decode: {
        id: 'partial_decode',
        text: 'Вы понимаете только часть — что-то о «нарушении», «первородной ошибке» и координатах, которые не совпадают ни с одной известной точкой.',
        choices: [
          {
            label: 'Записать что удалось',
            action: 'CLOSE',
            reward: { credits: 15 },
          },
        ],
      },
      tablet_decode: {
        id: 'tablet_decode',
        text: 'Таблица реагирует немедленно — символы на стене и на таблице начинают резонировать. Полная надпись восстанавливается в воздухе как проекция. Вы читаете всё. Лучше бы — нет.',
        choices: [
          {
            label: 'Запомнить всё',
            action: 'CLOSE',
            reward: { items: ['ANCIENT_MAP'], credits: 50 },
            setFlag: ['knows_balance_stone_truth', 'inscription_fully_read'],
            penalty: { items: ['RUNIC_TABLET'] },
            addReputation: 15,
          },
        ],
      },
    },
  },

  ruins_collapsed_vault: {
    id: 'ruins_collapsed_vault',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_collapsed_vault/800/350',
        text: 'Лестница вниз частично завалена, но проходима. Внизу — хранилище с толстыми дверями, одна из которых сорвана с петель. Кто-то вскрыл хранилище раньше вас. Внутри — пусто. Почти. На полу — один оставленный предмет. Намеренно.',
        choices: [
          {
            label: 'Войти и взять предмет',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'vault_safe',
            failNode: 'vault_trap',
          },
          {
            label: 'Осмотреть следы — кто здесь был',
            action: 'GOTO_NODE',
            nextNode: 'inspect_tracks',
          },
          {
            label: 'Не спускаться — это слишком очевидная ловушка',
            action: 'CLOSE',
            addReputation: 5,
          },
        ],
      },
      vault_safe: {
        id: 'vault_safe',
        text: 'Предмет оказывается настоящим — один из тех, что принято называть «Ключами Основания». Артефакт явно сложного происхождения. Тот, кто ограбил хранилище, пропустил его. Или намеренно оставил.',
        choices: [
          {
            label: 'Взять ключ',
            action: 'CLOSE',
            reward: { items: ['ANCIENT_KEY'], credits: 60 },
            addReputation: 10,
          },
        ],
      },
      vault_trap: {
        id: 'vault_trap',
        text: 'Предмет — приманка. Как только вы его поднимаете, своды начинают осыпаться. Кто-то заминировал хранилище после ограбления. Вы бежите наверх, пока потолок не сложился окончательно.',
        choices: [
          {
            label: 'Выбраться до обвала',
            action: 'CLOSE',
            penalty: { hp: 30, energy: 15 },
          },
        ],
      },
      inspect_tracks: {
        id: 'inspect_tracks',
        text: 'Следы организованные — минимум пятеро, профессионалы. Орден или наёмники высокого класса. Они взяли всё основное, но торопились. На краю одной из полок — оброненный знак-идентификатор.',
        choices: [
          {
            label: 'Взять идентификатор',
            action: 'CLOSE',
            reward: { credits: 35 },
            setFlag: 'knows_vault_raiders',
            addReputation: 10,
          },
          {
            label: 'Всё равно спуститься и взять что осталось',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'vault_safe',
            failNode: 'vault_trap',
          },
        ],
      },
    },
  },
};
