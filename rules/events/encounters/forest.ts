import { OverworldEvent } from '../../../types.ts';

export const FOREST_ENCOUNTERS: Record<string, OverworldEvent> = {
  forest_spirit_grove: {
    id: 'forest_spirit_grove',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_spirit_grove/800/350',
        text: 'Деревья расступаются, открывая поляну в идеальном круге. Трава здесь — изумрудно-зелёная, хотя лес вокруг давно засох. В центре поляны — камень, покрытый мхом, и перед ним слабо мерцает силуэт существа без чёткой формы. Тишина здесь физически ощутима.',
        choices: [
          {
            label: 'Приблизиться и поклониться',
            action: 'GOTO_NODE',
            nextNode: 'approach',
          },
          {
            label: 'Предложить Древнюю реликвию как дар',
            action: 'CLOSE',
            reqItem: 'ancient_relic',
            penalty: { items: ['ancient_relic'] },
            reward: { hp: 40, energy: 20, items: ['data_disc'] },
            addReputation: 20,
          },
          {
            label: 'Попытаться захватить существо для изучения',
            action: 'ROLL_DICE',
            probability: 0.2,
            successNode: 'capture_attempt',
            failNode: 'spirit_wrath',
          },
          {
            label: 'Тихо уйти, не тревожа место',
            action: 'CLOSE',
            reward: { energy: 8 },
          },
        ],
      },
      approach: {
        id: 'approach',
        text: 'Существо наклоняется к вам — если у него есть голова. Из ниоткуда рождается голос, похожий на скрип старых ветвей: «Ты несёшь метку чужого мира. Зачем ты здесь — служить или разрушать?»',
        choices: [
          {
            label: 'Ответить: «Я ищу путь, а не власть»',
            action: 'CLOSE',
            reward: { energy: 15, items: ['food_bread'] },
            addReputation: 15,
          },
          {
            label: 'Ответить: «Я служу тем, кто платит»',
            action: 'CLOSE',
            penalty: { energy: 10 },
            addReputation: -10,
          },
          {
            label: 'Промолчать и ждать',
            action: 'CLOSE',
            reward: { hp: 20 },
            addReputation: 5,
          },
        ],
      },
      capture_attempt: {
        id: 'capture_attempt',
        text: 'Дух позволяет себя изучить — или, скорее, сам изучает вас. Он оставляет на вашей ладони светящийся знак, который исчезает через час, но вы чувствуете, что что-то изменилось.',
        choices: [
          {
            label: 'Принять метку',
            action: 'CLOSE',
            reward: { credits: 50, hp: 20 },
            addReputation: 10,
          },
        ],
      },
      spirit_wrath: {
        id: 'spirit_wrath',
        text: 'Поляна взрывается ослепительным светом. Вас отбрасывает к стволам деревьев — дух не терпит жадности. Вы приходите в себя на краю леса.',
        choices: [
          {
            label: 'Прийти в себя и уйти',
            action: 'CLOSE',
            penalty: { hp: 35, energy: 20 },
            addReputation: -20,
          },
        ],
      },
    },
  },

  forest_trapped_animal: {
    id: 'forest_trapped_animal',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_trapped_animal/800/350',
        text: 'Из зарослей доносится низкое рычание, переходящее в скулёж. Крупный зверь — что-то среднее между волком и медведем — попал лапой в ловушку-капкан. Его шерсть покрыта засохшей кровью. Он смотрит на вас с ненавистью и отчаянием одновременно.',
        choices: [
          {
            label: 'Попытаться освободить зверя',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'freed',
            failNode: 'bitten',
          },
          {
            label: 'Использовать Свежий хлеб, чтобы усыпить его',
            action: 'GOTO_NODE',
            nextNode: 'sedate',
            reqItem: 'food_bread',
          },
          {
            label: 'Добить раненого зверя',
            action: 'CLOSE',
            reward: { credits: 25 },
            addReputation: -15,
          },
          {
            label: 'Уйти, не вмешиваясь',
            action: 'CLOSE',
          },
        ],
      },
      freed: {
        id: 'freed',
        text: 'Вы медленно разводите зубья капкана. Зверь секунду смотрит на вас — потом осторожно отходит. У края поляны он оборачивается. На месте ловушки остался странный амулет, явно не случайный.',
        choices: [
          {
            label: 'Взять амулет',
            action: 'CLOSE',
            reward: { items: ['data_disc'], hp: 10 },
            addReputation: 15,
          },
        ],
      },
      bitten: {
        id: 'bitten',
        text: 'Зверь в панике бросается на вас прежде, чем вы успели освободить лапу. Укус глубокий. Вам удаётся отскочить, но ловушка остаётся закрытой, а рана — открытой.',
        choices: [
          {
            label: 'Отступить и перевязаться',
            action: 'CLOSE',
            penalty: { hp: 25 },
          },
        ],
      },
      sedate: {
        id: 'sedate',
        text: 'Травы действуют быстро. Зверь засыпает, и вы спокойно освобождаете его лапу. Когда он очнётся, он будет в безопасности. На поясе охотника, поставившего ловушку, вы замечаете вещевой мешок.',
        choices: [
          {
            label: 'Обыскать мешок охотника',
            action: 'CLOSE',
            penalty: { items: ['food_bread'] },
            reward: { credits: 40, energy: 10 },
            addReputation: 5,
          },
          {
            label: 'Уйти с чистой совестью',
            action: 'CLOSE',
            penalty: { items: ['food_bread'] },
            reward: { energy: 15 },
            addReputation: 20,
          },
        ],
      },
    },
  },

  forest_witch_hut: {
    id: 'forest_witch_hut',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_witch_hut/800/350',
        text: 'За плетёной оградой из высохших костей стоит изба, явно живущая дольше, чем должна. Дым из трубы пахнет горелым металлом и сладкими травами. На пороге сидит старуха с лицом, избороздённым шрамами, и смотрит на вас так, будто ждала.',
        choices: [
          {
            label: 'Войти и представиться',
            action: 'GOTO_NODE',
            nextNode: 'inside',
          },
          {
            label: 'Попросить о лечении за кредиты (40)',
            action: 'CLOSE',
            reqCredits: 40,
            penalty: { credits: 40 },
            reward: { hp: 40, energy: 15 },
          },
          {
            label: 'Попробовать обыскать хижину в её отсутствие',
            action: 'ROLL_DICE',
            probability: 0.3,
            successNode: 'search_success',
            failNode: 'search_fail',
          },
          {
            label: 'Обойти стороной — плохое место',
            action: 'CLOSE',
          },
        ],
      },
      inside: {
        id: 'inside',
        text: 'Внутри — полки с образцами, схемы, явно доцифровой эпохи. Ведьма изучает вас долго, потом говорит: «Ты несёшь Пустоту за собой. Я могу вырезать её. Это будет больно».',
        choices: [
          {
            label: 'Согласиться на ритуал',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'ritual_success',
            failNode: 'ritual_fail',
          },
          {
            label: 'Отказаться и предложить обмен информацией',
            action: 'CLOSE',
            reward: { items: ['data_disc'], credits: 20 },
            addReputation: 5,
          },
        ],
      },
      ritual_success: {
        id: 'ritual_success',
        text: 'Ритуал длится час. Когда вы приходите в себя, вы чувствуете себя легче — как будто груз, о котором вы не знали, был снят. Старуха смотрит на вас с чем-то похожим на удовлетворение.',
        choices: [
          {
            label: 'Поблагодарить и уйти',
            action: 'CLOSE',
            reward: { hp: 35, energy: 20 },
            addReputation: 15,
          },
        ],
      },
      ritual_fail: {
        id: 'ritual_fail',
        text: 'Ритуал идёт не так. Старуха качает головой: «Пустота держится крепко». Вы теряете сознание и приходите в себя на улице — через несколько часов, ограбленный, но живой.',
        choices: [
          {
            label: 'Уйти, пока не стало хуже',
            action: 'CLOSE',
            penalty: { hp: 20, credits: 30 },
            addReputation: -10,
          },
        ],
      },
      search_success: {
        id: 'search_success',
        text: 'Старуха куда-то ушла. В хижине вы находите запасы трав, странный кристалл и несколько монет в щели под половицей.',
        choices: [
          {
            label: 'Взять и уйти быстро',
            action: 'CLOSE',
            reward: { credits: 50, items: ['food_bread', 'reality_patch'] },
            addReputation: -20,
          },
        ],
      },
      search_fail: {
        id: 'search_fail',
        text: 'Старуха не ушла никуда — она просто исчезла из виду. Теперь она стоит у вас за спиной. «Воровство — дорогое удовольствие», — говорит она тихо.',
        choices: [
          {
            label: 'Заплатить штраф и уйти живым',
            action: 'CLOSE',
            penalty: { hp: 30, credits: 60 },
            addReputation: -20,
          },
        ],
      },
    },
  },

  forest_lost_expedition: {
    id: 'forest_lost_expedition',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_lost_expedition/800/350',
        text: 'Среди деревьев — разбитый лагерь. Шатры разорваны, оборудование разбросано, костёр давно погас. Судя по дневнику, оставленному на столе, экспедиция геологов вошла в лес две недели назад. Из записей следует, что они нашли нечто под землёй — и оно нашло их в ответ.',
        choices: [
          {
            label: 'Прочитать дневник полностью',
            action: 'GOTO_NODE',
            nextNode: 'read_journal',
          },
          {
            label: 'Обыскать лагерь на предмет снаряжения',
            action: 'CLOSE',
            reward: { credits: 35, items: ['data_disc'] },
            addReputation: -5,
          },
          {
            label: 'Поискать выживших',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'survivor_found',
            failNode: 'no_survivor',
          },
        ],
      },
      read_journal: {
        id: 'read_journal',
        text: 'Последние записи описывают структуру под землёй — идеально правильные коридоры, явно созданные разумом. Автор пишет о «пульсации», которую слышат все участники. Последняя запись: «Оно не опасно. Оно просто хочет знать».',
        choices: [
          {
            label: 'Взять дневник с собой — это ценные данные',
            action: 'CLOSE',
            reward: { credits: 40, items: ['ancient_relic'] },
            setFlag: 'knows_underground_structure',
            addReputation: 5,
          },
          {
            label: 'Оставить дневник — пусть лежит',
            action: 'CLOSE',
            reward: { energy: 5 },
          },
        ],
      },
      survivor_found: {
        id: 'survivor_found',
        text: 'За опрокинутым ящиком сидит молодой учёный — глаза пустые, рот шепчет числа. Физически он цел. Он узнаёт вас и тихо говорит: «Координаты. Вам нужны координаты». Протягивает карту.',
        choices: [
          {
            label: 'Взять карту и вывести его из леса',
            action: 'CLOSE',
            penalty: { energy: 15 },
            reward: { items: ['data_disc'] },
            addReputation: 20,
          },
          {
            label: 'Взять только карту',
            action: 'CLOSE',
            reward: { items: ['data_disc'] },
            addReputation: -10,
          },
        ],
      },
      no_survivor: {
        id: 'no_survivor',
        text: 'Выживших нет. На краю лагеря — следы, уходящие в землю. Буквально. Как будто люди провалились сквозь твёрдую почву.',
        choices: [
          {
            label: 'Уйти и не думать об этом',
            action: 'CLOSE',
            penalty: { energy: 5 },
          },
        ],
      },
    },
  },

  forest_corrupted_beast: {
    id: 'forest_corrupted_beast',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_corrupted_beast/800/350',
        text: 'Лес впереди мёртв — деревья почернели, листья осыпались в середине лета. В центре этой мёртвой зоны движется существо, некогда бывшее оленем. Теперь его шкуру покрывают чёрные наросты, из пасти капает дымящаяся слизь, а глаза светятся мутным пурпуром.',
        choices: [
          {
            label: 'Атаковать — зверь страдает и опасен',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'beast_killed',
            failNode: 'beast_wounds',
          },
          {
            label: 'Попытаться обойти заражённую зону',
            action: 'CLOSE',
            penalty: { energy: 15 },
          },
          {
            label: 'Взять образец заразы',
            action: 'GOTO_NODE',
            nextNode: 'take_sample',
          },
          {
            label: 'Использовать Лоскут Реальности для изучения',
            action: 'CLOSE',
            reqItem: 'reality_patch',
            reward: { credits: 60 },
            addReputation: 10,
            setFlag: 'corruption_analyzed',
          },
        ],
      },
      beast_killed: {
        id: 'beast_killed',
        text: 'Существо падает. Наросты рассыпаются в чёрный пепел. Под ними — прекрасное, трагическое создание, умершее задолго до сегодняшнего дня. Вы находите в наростах плотный кристалл.',
        choices: [
          {
            label: 'Взять кристалл',
            action: 'CLOSE',
            reward: { credits: 50, items: ['reality_patch'] },
            penalty: { hp: 20 },
            addReputation: 10,
          },
        ],
      },
      beast_wounds: {
        id: 'beast_wounds',
        text: 'Существо значительно сильнее обычного зверя. Его удар отбрасывает вас на несколько метров. Вы едва уходите, пока оно не переключилось на что-то другое.',
        choices: [
          {
            label: 'Бежать',
            action: 'CLOSE',
            penalty: { hp: 35, energy: 15 },
          },
        ],
      },
      take_sample: {
        id: 'take_sample',
        text: 'Зверь не реагирует на вас — он занят чем-то своим. Вам удаётся аккуратно соскрести образец нароста в пустой контейнер. Прикосновение обжигает через перчатку.',
        choices: [
          {
            label: 'Уйти с образцом',
            action: 'CLOSE',
            reward: { items: ['reality_patch'] },
            penalty: { hp: 10 },
            addReputation: 5,
          },
        ],
      },
    },
  },

  forest_mushroom_circle: {
    id: 'forest_mushroom_circle',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_mushroom_circle/800/350',
        text: 'Идеальный круг гигантских грибов — их шляпки светятся слабым голубым светом в сумерках. Внутри круга время, кажется, течёт иначе: воздух густой, звуки приглушены. На траве в центре лежит предмет, явно кем-то оставленный здесь намеренно.',
        choices: [
          {
            label: 'Войти в круг и взять предмет',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'circle_safe',
            failNode: 'circle_trap',
          },
          {
            label: 'Попробовать один гриб — может, это лекарство',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'mushroom_heal',
            failNode: 'mushroom_poison',
          },
          {
            label: 'Изучить круг снаружи и уйти',
            action: 'CLOSE',
            reward: { energy: 5 },
          },
        ],
      },
      circle_safe: {
        id: 'circle_safe',
        text: 'Внутри круга — тишина и тепло. Предмет оказывается свёртком из вощёной бумаги с запиской: «Тому, кто осмелится. Ты прошёл. Это твоё». Внутри — горсть монет и засушенный цветок с вечным запахом.',
        choices: [
          {
            label: 'Взять всё',
            action: 'CLOSE',
            reward: { credits: 45, energy: 15 },
            addReputation: 10,
          },
        ],
      },
      circle_trap: {
        id: 'circle_trap',
        text: 'Как только вы входите, круг закрывается. Грибы начинают рассыпать споры. Вы бежите, кашляете, спотыкаетесь — и вырываетесь с трудом, но что-то прилипло к вашей коже.',
        choices: [
          {
            label: 'Выбраться и избавиться от спор',
            action: 'CLOSE',
            penalty: { hp: 25, energy: 10 },
          },
        ],
      },
      mushroom_heal: {
        id: 'mushroom_heal',
        text: 'Гриб горький, но через несколько минут вы чувствуете прилив сил — усталость отступает, боль в ногах проходит. Старая рана на плече почти не беспокоит.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            reward: { hp: 30, energy: 20 },
            addReputation: 5,
          },
        ],
      },
      mushroom_poison: {
        id: 'mushroom_poison',
        text: 'Через пять минут начинается горячка. Зрение двоится, ноги не слушаются. Вы теряете несколько часов, лёжа на земле, пока яд не ослабевает сам собой.',
        choices: [
          {
            label: 'Прийти в себя и двигаться дальше',
            action: 'CLOSE',
            penalty: { hp: 30, energy: 20 },
          },
        ],
      },
    },
  },

  forest_smuggler_path: {
    id: 'forest_smuggler_path',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_smuggler_path/800/350',
        text: 'Тропинка, которой нет ни на одной карте, уводит вглубь леса. Следы свежие, груз тяжёлый. Между деревьями мелькают фигуры с оружием. Контрабандисты. Они вас уже видели.',
        choices: [
          {
            label: 'Предложить сопровождение за долю',
            action: 'GOTO_NODE',
            nextNode: 'negotiate',
          },
          {
            label: 'Притвориться патрульным — пугануть',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'bluff_success',
            failNode: 'bluff_fail',
          },
          {
            label: 'Молча разойтись — не ваши дела',
            action: 'CLOSE',
          },
          {
            label: 'Обыскать схрон, пока они отвлеклись',
            action: 'ROLL_DICE',
            probability: 0.35,
            successNode: 'stash_found',
            failNode: 'stash_caught',
          },
        ],
      },
      negotiate: {
        id: 'negotiate',
        text: 'Главарь смотрит на вас оценивающим взглядом. «Лишние руки нужны. Но если ты лишний рот — это дороже стоит». Он называет условие.',
        choices: [
          {
            label: 'Согласиться и помочь донести груз',
            action: 'CLOSE',
            penalty: { energy: 15 },
            reward: { credits: 55, items: ['raw_container'] },
            addReputation: -5,
          },
          {
            label: 'Отказаться на своих условиях',
            action: 'CLOSE',
            addReputation: 0,
          },
        ],
      },
      bluff_success: {
        id: 'bluff_success',
        text: 'Контрабандисты паникуют и разбегаются, бросив часть груза. Вы выигрываете несколько минут, чтобы взять то, что вам нужно.',
        choices: [
          {
            label: 'Взять брошенный груз',
            action: 'CLOSE',
            reward: { credits: 65, items: ['raw_container'] },
            addReputation: -10,
          },
        ],
      },
      bluff_fail: {
        id: 'bluff_fail',
        text: 'Главарь смеётся. «Патрульный без мундира и с пустыми руками — редкость». Вас обыскивают и отпускают только после того, как забирают лишнее.',
        choices: [
          {
            label: 'Уйти с потерями',
            action: 'CLOSE',
            penalty: { credits: 45, energy: 10 },
          },
        ],
      },
      stash_found: {
        id: 'stash_found',
        text: 'Под корнями — небольшой ящик с товаром. Часть — медикаменты для деревень, часть — явно военная контрабанда. Вы берёте медикаменты.',
        choices: [
          {
            label: 'Взять медикаменты',
            action: 'CLOSE',
            reward: { hp: 25, credits: 30 },
            addReputation: 5,
          },
        ],
      },
      stash_caught: {
        id: 'stash_caught',
        text: 'Охранник был за деревом. Он видел всё. Удар рукояткой — и вы приходите в себя без снаряжения и с гудящей головой.',
        choices: [
          {
            label: 'Уйти сконфуженным',
            action: 'CLOSE',
            penalty: { hp: 30, credits: 40 },
            addReputation: -15,
          },
        ],
      },
    },
  },

  forest_poison_bloom: {
    id: 'forest_poison_bloom',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_poison_bloom/800/350',
        text: 'Целая поляна покрыта цветами невиданной красоты — глубокий фиолетово-чёрный цвет, запах сладкий до одурения. Насекомые вокруг них мертвы. Птицы облетают стороной. Цветы явно ядовиты. И явно ценны.',
        choices: [
          {
            label: 'Собрать цветы в защитных перчатках',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'harvest_success',
            failNode: 'harvest_poisoned',
          },
          {
            label: 'Изучить, но не трогать',
            action: 'CLOSE',
            reward: { credits: 20 },
            addReputation: 5,
          },
          {
            label: 'Сжечь поляну — это угроза',
            action: 'CLOSE',
            penalty: { energy: 10 },
            addReputation: -5,
          },
        ],
      },
      harvest_success: {
        id: 'harvest_success',
        text: 'Перчатки держат. Вы аккуратно собираете несколько бутонов в контейнер. Алхимики заплатят хорошие деньги, а яд в малых дозах бывает лекарством.',
        choices: [
          {
            label: 'Продать позже',
            action: 'CLOSE',
            reward: { credits: 70, items: ['food_bread'] },
            addReputation: 5,
          },
        ],
      },
      harvest_poisoned: {
        id: 'harvest_poisoned',
        text: 'Одного прокола в перчатке оказывается достаточно. Яд быстрый — через минуту вы на земле, через час — на ногах, но измотанный, как никогда.',
        choices: [
          {
            label: 'Прийти в себя и уйти',
            action: 'CLOSE',
            penalty: { hp: 35, energy: 20 },
          },
        ],
      },
    },
  },
};
