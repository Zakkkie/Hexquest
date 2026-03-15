import { OverworldEvent } from '../../../types.ts';

export const ROAD_ENCOUNTERS: Record<string, OverworldEvent> = {

  road_toll_booth: {
    id: 'road_toll_booth',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/road_toll_booth/800/350',
        text: 'На дороге выставлен шлагбаум. Двое стражников Синдиката в запыленных мундирах смотрят на вас без каких-либо теплых чувств. «Дорожная пошлина. Двадцать кредитов — или разворачивайся.»',
        choices: [
          {
            label: 'Заплатить пошлину (−20 кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'paid',
            reqCredits: 20,
            penalty: { credits: 20 },
          },
          {
            label: 'Показать Паломнический Жетон',
            action: 'GOTO_NODE',
            nextNode: 'token_shown',
            reqItem: 'PILGRIM_TOKEN',
          },
          {
            label: 'Предъявить Печать Изгоя и пройти силой',
            action: 'ROLL_DICE',
            probability: 0.45,
            reqItem: 'EXILE_MARK',
            successNode: 'exile_intimidated',
            failNode: 'exile_failed',
            penalty: { hp: 15 },
          },
          {
            label: 'Обойти стороной по полю',
            action: 'GOTO_NODE',
            nextNode: 'detour',
          },
        ],
      },
      paid: {
        id: 'paid',
        text: 'Стражник нехотя убирает шлагбаум и смотрит вслед с нескрываемым презрением. Дорога открыта.',
        choices: [{ label: 'Продолжить путь', action: 'CLOSE' }],
      },
      token_shown: {
        id: 'token_shown',
        text: 'Старший стражник щурится на жетон, потом тихо переговаривается с напарником. «Паломники освобождены от пошлины по указу третьего квартала.» Он нехотя делает знак пропустить.',
        choices: [
          {
            label: 'Пройти с достоинством',
            action: 'CLOSE',
            reward: { energy: 2 },
          },
        ],
      },
      exile_intimidated: {
        id: 'exile_intimidated',
        text: 'Печать Изгоя производит неожиданный эффект — стражники бледнеют и расступаются. Видимо, кое-кто знает, что стоит за этим клеймом.',
        choices: [{ label: 'Пройти молча', action: 'CLOSE' }],
      },
      exile_failed: {
        id: 'exile_failed',
        text: 'Стражники невозмутимо достают дубинки. «Таких клейменых мы видели. Плати или уходи в синяках.» Приходится отступить с побоями.',
        choices: [{ label: 'Отступить', action: 'CLOSE' }],
      },
      detour: {
        id: 'detour',
        text: 'Вы петляете по пыльным межам. Долго, утомительно — но бесплатно. Ноги гудят.',
        choices: [
          {
            label: 'Выйти на дорогу дальше',
            action: 'CLOSE',
            penalty: { energy: 3 },
          },
        ],
      },
    },
  },

  road_carriage_accident: {
    id: 'road_carriage_accident',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/road_carriage_accident/800/350',
        text: 'Перевернутая карета лежит на обочине. Лошадь убежала. Возница без сознания, колесо расколото. Из-под кареты слышен слабый стон.',
        choices: [
          {
            label: 'Помочь вытащить пострадавшего',
            action: 'GOTO_NODE',
            nextNode: 'helped',
            addReputation: 5,
          },
          {
            label: 'Обыскать карету, пока никто не видит',
            action: 'GOTO_NODE',
            nextNode: 'looted',
            addReputation: -8,
          },
          {
            label: 'Пройти мимо — чужие беды не твоя забота',
            action: 'CLOSE',
          },
        ],
      },
      helped: {
        id: 'helped',
        text: 'Под каретой оказался молодой купец. Он благодарен, хотя и дезориентирован. «Я должник ваш. Возьмите — это всё, что у меня есть при себе.» Он сует горсть монет и уходит прочь.',
        choices: [
          {
            label: 'Принять награду',
            action: 'CLOSE',
            reward: { credits: 35, energy: 3 },
          },
        ],
      },
      looted: {
        id: 'looted',
        text: 'В карете — ящик с провизией и несколько монет. Когда вы оборачиваетесь, возница открывает глаза и смотрит на вас. Он запомнит лицо.',
        choices: [
          {
            label: 'Уйти быстро',
            action: 'CLOSE',
            reward: { credits: 20 },
            setFlag: 'known_thief',
          },
        ],
      },
    },
  },

  road_soldier_patrol: {
    id: 'road_soldier_patrol',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/road_soldier_patrol/800/350',
        text: 'Патруль из четырёх солдат Синдиката перекрывает дорогу. Сержант смотрит на вас цепко. «Документы. Имя. Откуда и куда.»',
        choices: [
          {
            label: 'Предъявить Запечатанное Письмо',
            action: 'GOTO_NODE',
            nextNode: 'letter_shown',
            reqItem: 'SEALED_LETTER',
          },
          {
            label: 'Назвать вымышленное имя',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'bluff_success',
            failNode: 'bluff_failed',
          },
          {
            label: 'Сотрудничать полностью',
            action: 'GOTO_NODE',
            nextNode: 'cooperative',
          },
          {
            label: 'Бежать',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'fled',
            failNode: 'caught',
            penalty: { hp: 20 },
          },
        ],
      },
      letter_shown: {
        id: 'letter_shown',
        text: 'Сержант внимательно изучает печать письма. Его брови ползут вверх. Он возвращает письмо с нарочитой небрежностью и командует патрулю разойтись. «Проходите, господин.»',
        choices: [{ label: 'Пройти', action: 'CLOSE', reward: { energy: 1 } }],
      },
      bluff_success: {
        id: 'bluff_success',
        text: 'Сержант скучающе записывает выдуманное имя в журнал. «Двигайтесь.» Вы уходите, стараясь не оглядываться.',
        choices: [{ label: 'Продолжить путь', action: 'CLOSE' }],
      },
      bluff_failed: {
        id: 'bluff_failed',
        text: 'Сержант хмурится. «В третий раз за неделю "Иван из Предместья". Задержать.» Вас обыскивают и отпускают — но уже засветло, потеряв время и кредиты.',
        choices: [
          {
            label: 'Уйти, злобно сжимая зубы',
            action: 'CLOSE',
            penalty: { credits: 25, energy: 2 },
          },
        ],
      },
      cooperative: {
        id: 'cooperative',
        text: 'Патруль методично проверяет ваши вещи. Ничего запрещённого не находят. «Свободны. И держитесь подальше от Болот — там неспокойно.»',
        choices: [
          {
            label: 'Поблагодарить за предупреждение',
            action: 'CLOSE',
            setFlag: 'swamp_danger_known',
          },
        ],
      },
      fled: {
        id: 'fled',
        text: 'Вам удаётся скрыться в придорожных кустах. Солдаты некоторое время прочёсывают округу, потом уходят. Вы выбираетесь на дорогу дальше.',
        choices: [{ label: 'Продолжить путь', action: 'CLOSE' }],
      },
      caught: {
        id: 'caught',
        text: 'Вас догоняют в два счёта. Обыск, штраф, синяк от приклада — «за попытку уклонения». Отпускают с предупреждением.',
        choices: [
          {
            label: 'Утереться и идти дальше',
            action: 'CLOSE',
            penalty: { credits: 30, hp: 20 },
          },
        ],
      },
    },
  },

  road_traveling_monk: {
    id: 'road_traveling_monk',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/road_traveling_monk/800/350',
        text: 'На обочине сидит старый монах в выцветших одеждах. Перед ним — небольшой алтарь из камней. Он поднимает взгляд. «Путник. Ты несёшь в себе Пустоту или свет? Это важно знать, прежде чем идти дальше.»',
        choices: [
          {
            label: 'Поговорить с монахом',
            action: 'GOTO_NODE',
            nextNode: 'talk',
          },
          {
            label: 'Оставить монаху Паломнический Жетон',
            action: 'GOTO_NODE',
            nextNode: 'token_given',
            reqItem: 'PILGRIM_TOKEN',
            penalty: { items: ['PILGRIM_TOKEN'] },
            addReputation: 10,
          },
          {
            label: 'Идти дальше, не останавливаясь',
            action: 'CLOSE',
          },
        ],
      },
      talk: {
        id: 'talk',
        text: '«Я прошёл через семь городов,» — говорит монах. «В каждом — страдание. Но в каждом — и тот, кто помогал другому. Это равновесие не случайно. Возьми.» Он протягивает вам травяной компресс.',
        choices: [
          {
            label: 'Принять дар',
            action: 'CLOSE',
            reward: { hp: 20, energy: 2 },
          },
          {
            label: 'Оставить дар монаху — ему нужнее',
            action: 'CLOSE',
            addReputation: 8,
          },
        ],
      },
      token_given: {
        id: 'token_given',
        text: 'Монах бережно берёт жетон и кладёт на алтарь. Долгое молчание. «Ты уже на пути. Я укажу тебе на одну тропу, которую не видно с дороги.» Он шёпотом называет обходной маршрут.',
        choices: [
          {
            label: 'Запомнить слова монаха',
            action: 'CLOSE',
            reward: { energy: 5 },
            setFlag: 'monk_road_blessing',
          },
        ],
      },
    },
  },

  road_road_ghost: {
    id: 'road_road_ghost',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/road_road_ghost/800/350',
        text: 'С наступлением сумерек на дороге появляется фигура — прозрачная, мерцающая. Призрак идёт вам навстречу. Его лицо — лицо человека, погибшего много лет назад. Он открывает рот, но звука нет.',
        choices: [
          {
            label: 'Попытаться понять знаки призрака',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'understood',
            failNode: 'failed',
          },
          {
            label: 'Спросить словами: «Что ты хочешь?»',
            action: 'GOTO_NODE',
            nextNode: 'spoken',
          },
          {
            label: 'Пройти сквозь призрак, игнорируя его',
            action: 'GOTO_NODE',
            nextNode: 'ignored',
          },
        ],
      },
      understood: {
        id: 'understood',
        text: 'Призрак жестикулирует — вы понимаете: засада впереди. Три солдата прячутся за поворотом. Призрак растворяется, довольный.',
        choices: [
          {
            label: 'Обойти засаду',
            action: 'CLOSE',
            setFlag: 'ghost_warning_heeded',
            reward: { energy: 2 },
          },
        ],
      },
      failed: {
        id: 'failed',
        text: 'Призрак смотрит на вас с отчаянием. Вы не понимаете его. Он рассеивается, как дым. Впереди — неизвестность.',
        choices: [{ label: 'Продолжить путь', action: 'CLOSE' }],
      },
      spoken: {
        id: 'spoken',
        text: 'Призрак на секунду обретает форму. Вы слышите шёпот: «...не ходи к восточному посту...» — и он исчезает. Предупреждение или ловушка?',
        choices: [
          {
            label: 'Принять предупреждение',
            action: 'CLOSE',
            setFlag: 'eastern_post_warned',
          },
          {
            label: 'Игнорировать слова мертвеца',
            action: 'CLOSE',
          },
        ],
      },
      ignored: {
        id: 'ignored',
        text: 'Холод. Пронзительный, как игла. Призрак проходит сквозь вас — и вы чувствуете, как что-то уходит. Жизненная сила, воля... что-то.',
        choices: [
          {
            label: 'Прийти в себя',
            action: 'CLOSE',
            penalty: { hp: 15, energy: 2 },
          },
        ],
      },
    },
  },

  road_wanted_poster: {
    id: 'road_wanted_poster',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/road_wanted_poster/800/350',
        text: 'На столбе прибит плакат. Грубый рисунок лица — и надпись: «РАЗЫСКИВАЕТСЯ. Вознаграждение 200 кредитов». Лицо неуловимо напоминает кого-то знакомого. Или... вас?',
        choices: [
          {
            label: 'Сорвать плакат',
            action: 'GOTO_NODE',
            nextNode: 'torn',
            addReputation: -3,
          },
          {
            label: 'Изучить плакат внимательно',
            action: 'GOTO_NODE',
            nextNode: 'studied',
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      torn: {
        id: 'torn',
        text: 'Плакат в ваших руках. Это не вы — но сходство пугает. Возможно, Синдикат намеренно использует похожие описания для массовой слежки.',
        choices: [
          {
            label: 'Сохранить плакат как улику',
            action: 'CLOSE',
            setFlag: 'has_wanted_poster',
          },
          {
            label: 'Сжечь',
            action: 'CLOSE',
          },
        ],
      },
      studied: {
        id: 'studied',
        text: 'Разыскивают некоего «Кирела из Предместья» — предположительно связного Сопротивления. Описание расплывчато. Внизу мелким шрифтом: «Доносите Капитану Восточного поста».',
        choices: [
          {
            label: 'Запомнить имя — возможно, пригодится',
            action: 'CLOSE',
            setFlag: 'knows_kirel',
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  road_beggar_vision: {
    id: 'road_beggar_vision',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/road_beggar_vision/800/350',
        text: 'У края дороги сидит нищий с остекленевшим взглядом. Когда вы проходите мимо, он хватает вас за руку. «Я вижу! Вижу тебя в пламени! И за тобой — тьма, которая хочет стать светом!» Прохожие смотрят с опаской.',
        choices: [
          {
            label: 'Остановиться и выслушать',
            action: 'GOTO_NODE',
            nextNode: 'listened',
          },
          {
            label: 'Дать монету и идти дальше',
            action: 'CLOSE',
            penalty: { credits: 5 },
            addReputation: 3,
          },
          {
            label: 'Вырвать руку и уйти',
            action: 'CLOSE',
          },
        ],
      },
      listened: {
        id: 'listened',
        text: 'Нищий говорит долго и бессвязно — о Пустоте, о сердце из камня, о реке, текущей вспять. Но один момент вы запоминаете: «...тот, кто несёт письмо без имени, умрёт первым». Потом он засыпает прямо посреди речи.',
        choices: [
          {
            label: 'Принять слова как предупреждение',
            action: 'CLOSE',
            setFlag: 'seer_vision_road',
            reward: { energy: 1 },
          },
          {
            label: 'Решить, что это бред сумасшедшего',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  road_crossroads_choice: {
    id: 'road_crossroads_choice',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/road_crossroads_choice/800/350',
        text: 'Перекрёсток. Четыре дороги расходятся в стороны. Посередине — старый указатель с облупившейся краской. На одном из столбов кто-то вырезал ножом: «Выбор — это иллюзия. Все дороги ведут к Пустоте».',
        choices: [
          {
            label: 'Идти на север — к Синдикатским землям',
            action: 'GOTO_NODE',
            nextNode: 'north',
            setFlag: 'took_northern_road',
          },
          {
            label: 'Идти на юг — в обход через деревни',
            action: 'GOTO_NODE',
            nextNode: 'south',
            setFlag: 'took_southern_road',
          },
          {
            label: 'Остаться на перекрёстке и подождать попутчиков',
            action: 'GOTO_NODE',
            nextNode: 'waited',
          },
        ],
      },
      north: {
        id: 'north',
        text: 'Северная дорога прямая и быстрая — но вдоль неё стоят посты Синдиката на каждой версте. Вы движетесь быстро, но каждый шаг под наблюдением.',
        choices: [
          {
            label: 'Продолжить',
            action: 'CLOSE',
            reward: { energy: 3 },
            penalty: { credits: 10 },
          },
        ],
      },
      south: {
        id: 'south',
        text: 'Южный путь извилист, проходит через несколько деревень. Медленнее, но люди здесь приветливее — и иногда угощают едой.',
        choices: [
          {
            label: 'Продолжить',
            action: 'CLOSE',
            reward: { credits: 15, hp: 10 },
          },
        ],
      },
      waited: {
        id: 'waited',
        text: 'Час ожидания. Мимо проходит группа паломников. Они предлагают присоединиться и рассказывают о безопасном маршруте в обход патрулей.',
        choices: [
          {
            label: 'Присоединиться на часть пути',
            action: 'CLOSE',
            reward: { energy: 4, hp: 5 },
            setFlag: 'pilgrim_company',
          },
          {
            label: 'Поблагодарить и идти одному',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

};
