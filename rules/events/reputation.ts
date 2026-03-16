import { OverworldEvent } from '../../types.ts';

export const REPUTATION_EVENTS: Record<string, OverworldEvent> = {

  // ─── REP >= +80 (Страж) ─────────────────────────────────────────────────────

  monks_seek_hero: {
    id: 'monks_seek_hero',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/monks_seek_hero/800/350',
        text: 'Трое монахов преграждают вам путь, склонив головы. «Страж. Мы слышали о ваших деяниях. Позвольте нам отблагодарить вас — и попросить о помощи.»',
        choices: [
          {
            label: 'Принять благословение и выслушать просьбу',
            action: 'GOTO_NODE',
            nextNode: 'accepted',
            reqRepMin: 80,
          },
          {
            label: 'Принять благословение, но отказаться от просьбы',
            action: 'GOTO_NODE',
            nextNode: 'blessing_only',
            reqRepMin: 80,
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      accepted: {
        id: 'accepted',
        text: 'Монахи просят отнести реликвию в дальний монастырь. «Дорога долгая. Но вы один из немногих, кому мы можем доверить это.» Они передают запечатанный свиток.',
        choices: [
          {
            label: 'Взять поручение',
            action: 'CLOSE',
            reward: { hp: 30, energy: 6 },
            setFlag: 'monastery_courier',
          },
        ],
      },
      blessing_only: {
        id: 'blessing_only',
        text: 'Монахи не настаивают. Они читают краткую молитву и уходят. Вы чувствуете лёгкость.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            reward: { hp: 20, energy: 4 },
          },
        ],
      },
    },
  },

  city_hero_welcome: {
    id: 'city_hero_welcome',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_hero_welcome/800/350',
        text: 'При входе в город стражники узнают вас. «Страж! Добро пожаловать.» Горожане собираются вокруг. Ворота открываются без проверки документов.',
        choices: [
          {
            label: 'Войти с честью',
            action: 'GOTO_NODE',
            nextNode: 'welcomed',
            reqRepMin: 80,
          },
          {
            label: 'Отказаться от внимания',
            action: 'CLOSE',
          },
        ],
      },
      welcomed: {
        id: 'welcomed',
        text: 'Трактирщик предлагает ночлег бесплатно. Лекарь осматривает раны. Городской совет приглашает на приём. Репутация открывает двери, которые деньги не откроют.',
        choices: [
          {
            label: 'Принять гостеприимство',
            action: 'CLOSE',
            reward: { hp: 40, energy: 8, credits: 30 },
          },
        ],
      },
    },
  },

  syndicate_assassination_attempt: {
    id: 'syndicate_assassination_attempt',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/syndicate_assassination_attempt/800/350',
        text: 'Записка под дверью: «Твоя репутация стала угрозой для Синдиката. Тебя устранят. Сегодня ночью.» Почерк профессиональный. Предупреждение — или провокация?',
        choices: [
          {
            label: 'Приготовиться к нападению',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'survived',
            failNode: 'ambushed',
            reqRepMin: 80,
          },
          {
            label: 'Немедленно покинуть город',
            action: 'CLOSE',
            penalty: { energy: 3 },
            reqRepMin: 80,
          },
        ],
      },
      survived: {
        id: 'survived',
        text: 'Убийца пришёл. Вы были готовы. Короткая схватка — профессионал отступил, поняв, что преимущество потеряно. На земле — метка Синдиката.',
        choices: [
          {
            label: 'Подобрать метку как трофей',
            action: 'CLOSE',
            reward: { credits: 40 },
            setFlag: 'survived_syndicate_hit',
            addReputation: 5,
          },
        ],
      },
      ambushed: {
        id: 'ambushed',
        text: 'Убийц было двое. Вы ожидали одного. Потрёпаны, но живы — спасли случайные прохожие, спугнувшие нападавших.',
        choices: [
          {
            label: 'Перевязать раны и уйти',
            action: 'CLOSE',
            penalty: { hp: 35, energy: 4 },
          },
        ],
      },
    },
  },

  guardian_blessing: {
    id: 'guardian_blessing',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/guardian_blessing/800/350',
        text: 'Древний страж — каменная фигура, которую принимали за статую — поворачивает голову, когда вы проходите мимо. «Страж светлого пути. Твои дела дошли до нас.» Голос — как гром под землёй.',
        choices: [
          {
            label: 'Склонить голову в ответ',
            action: 'GOTO_NODE',
            nextNode: 'blessed',
            reqRepMin: 80,
          },
          {
            label: 'Отступить в изумлении',
            action: 'CLOSE',
          },
        ],
      },
      blessed: {
        id: 'blessed',
        text: 'Страж кладёт каменную ладонь на ваше плечо. Тепло проходит сквозь тело — что-то исцеляется, восстанавливается. «Иди. Мир нуждается в тебе.»',
        choices: [
          {
            label: 'Принять благословение',
            action: 'CLOSE',
            reward: { hp: 50, energy: 10 },
            setFlag: 'ancient_guardian_blessed',
          },
        ],
      },
    },
  },

  // ─── REP >= +40 (Уважаемый) ─────────────────────────────────────────────────

  grateful_villager: {
    id: 'grateful_villager',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/grateful_villager/800/350',
        text: 'Пожилая женщина у обочины приглядывается к вам. «Это вы помогли нашей деревне несколько недель назад? О вас говорят добрые люди.» Она протягивает корзину с едой.',
        choices: [
          {
            label: 'Принять подарок с благодарностью',
            action: 'GOTO_NODE',
            nextNode: 'accepted',
            reqRepMin: 40,
          },
          {
            label: 'Отказаться — ей нужнее',
            action: 'CLOSE',
            addReputation: 5,
          },
        ],
      },
      accepted: {
        id: 'accepted',
        text: 'В корзине — хлеб, сыр и небольшой флакон с лечебной настойкой. «Берегите себя. Мир стал опаснее, чем я помню.»',
        choices: [
          {
            label: 'Поблагодарить и идти дальше',
            action: 'CLOSE',
            reward: { hp: 25, energy: 5, items: ['food_bread'] },
          },
        ],
      },
    },
  },

  guard_escort_offer: {
    id: 'guard_escort_offer',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/guard_escort_offer/800/350',
        text: 'Два стражника останавливают вас — не для проверки. «Мы слышали ваше имя. Опасный участок впереди. Разрешите сопроводить.»',
        choices: [
          {
            label: 'Принять эскорт',
            action: 'GOTO_NODE',
            nextNode: 'escorted',
            reqRepMin: 40,
          },
          {
            label: 'Поблагодарить и отказаться — идти одному',
            action: 'CLOSE',
          },
        ],
      },
      escorted: {
        id: 'escorted',
        text: 'Эскорт проходит мимо нескольких патрулей без вопросов. По пути стражники рассказывают о недавней активности Синдиката в районе.',
        choices: [
          {
            label: 'Запомнить информацию',
            action: 'CLOSE',
            reward: { energy: 4 },
            setFlag: 'syndicate_activity_briefed',
          },
        ],
      },
    },
  },

  discount_merchant: {
    id: 'discount_merchant',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/discount_merchant/800/350',
        text: 'Торговец узнаёт вас по описанию — уважаемый путник. «Для вас — особые цены. У меня есть кое-что интересное, и я не против иметь такого клиента.»',
        choices: [
          {
            label: 'Купить провизию по скидке (−15 кредитов)',
            action: 'CLOSE',
            reqCredits: 15,
            reqRepMin: 40,
            penalty: { credits: 15 },
            reward: { items: ['food_bread'], energy: 2 },
          },
          {
            label: 'Купить Паломнический Жетон (−30 кредитов)',
            action: 'CLOSE',
            reqCredits: 30,
            reqRepMin: 40,
            penalty: { credits: 30 },
            reward: { items: ['ancient_relic'] },
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  honest_trader: {
    id: 'honest_trader',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/honest_trader/800/350',
        text: 'Торговец с открытым лицом подходит первым: «Я слышал о вас. Честный человек заслуживает честной сделки.» Он предлагает обмен без скрытых условий.',
        choices: [
          {
            label: 'Обменять Диск данных на провизию и деньги',
            action: 'GOTO_NODE',
            nextNode: 'traded',
            reqItem: 'data_disc',
            reqRepMin: 40,
          },
          {
            label: 'Просто поговорить',
            action: 'GOTO_NODE',
            nextNode: 'talked',
            reqRepMin: 40,
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
      traded: {
        id: 'traded',
        text: 'Торговец тщательно осматривает письмо. «Да, это стоит. Вот — провизия и монеты. Честно и открыто.»',
        choices: [
          {
            label: 'Принять сделку',
            action: 'CLOSE',
            penalty: { items: ['data_disc'] },
            reward: { credits: 50, items: ['food_bread'] },
          },
        ],
      },
      talked: {
        id: 'talked',
        text: 'Торговец рассказывает о торговых путях Братства, о том, где можно найти редкий товар по честной цене. Полезная информация.',
        choices: [
          {
            label: 'Запомнить маршруты',
            action: 'CLOSE',
            reward: { energy: 2 },
            setFlag: 'brotherhood_trade_routes',
          },
        ],
      },
    },
  },

  // ─── REP <= -40 (Изгой) ─────────────────────────────────────────────────────

  outlaw_exclusive_trade: {
    id: 'outlaw_exclusive_trade',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outlaw_exclusive_trade/800/350',
        text: 'Человек в засаленном плаще выходит из тени. «Слышал о тебе. Ты не из тех, кто задаёт вопросы. У нас есть товар не для чистюль.»',
        choices: [
          {
            label: 'Купить Метку Изгоя (−25 кредитов)',
            action: 'CLOSE',
            reqCredits: 25,
            reqRepMax: -40,
            penalty: { credits: 25 },
            reward: { items: ['ancient_relic'] },
          },
          {
            label: 'Купить Осколок Пустоты (−40 кредитов)',
            action: 'CLOSE',
            reqCredits: 40,
            reqRepMax: -40,
            penalty: { credits: 40 },
            reward: { items: ['void_shard'] },
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  black_market_rare: {
    id: 'black_market_rare',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/black_market_rare/800/350',
        text: 'Подпольный рынок. Без вывески, без стражи — или вся стража здесь куплена. Торговец смотрит на вашу репутацию Изгоя и улыбается. «Ты свой. Смотри что есть.»',
        choices: [
          {
            label: 'Купить Диск данных (−35 кредитов)',
            action: 'CLOSE',
            reqCredits: 35,
            reqRepMax: -40,
            penalty: { credits: 35 },
            reward: { items: ['data_disc'] },
          },
          {
            label: 'Купить Схему (−45 кредитов)',
            action: 'CLOSE',
            reqCredits: 45,
            reqRepMax: -40,
            penalty: { credits: 45 },
            reward: { items: ['data_disc'] },
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  wanted_poster_player: {
    id: 'wanted_poster_player',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/wanted_poster_player/800/350',
        text: 'На столбе — плакат. На нём — ваше лицо. «РАЗЫСКИВАЕТСЯ. 150 кредитов за информацию.» Рядом с вами двое горожан уже начинают шептаться.',
        choices: [
          {
            label: 'Сорвать плакат и уйти быстро',
            action: 'GOTO_NODE',
            nextNode: 'torn',
            reqRepMax: -40,
          },
          {
            label: 'Предложить очевидцам деньги за молчание',
            action: 'GOTO_NODE',
            nextNode: 'bribed',
            reqRepMax: -40,
            penalty: { credits: 30 },
            reqCredits: 30,
          },
        ],
      },
      torn: {
        id: 'torn',
        text: 'Один плакат уничтожен. Но их ещё десятки по городу. Вы уходите, стараясь держаться в тени.',
        choices: [
          {
            label: 'Покинуть город',
            action: 'CLOSE',
            penalty: { energy: 2 },
          },
        ],
      },
      bribed: {
        id: 'bribed',
        text: 'Горожане берут деньги. Один из них, судя по взгляду, всё равно донесёт. Но у вас есть время уйти.',
        choices: [
          {
            label: 'Уйти немедленно',
            action: 'CLOSE',
            penalty: { energy: 3 },
          },
        ],
      },
    },
  },

  bounty_trap: {
    id: 'bounty_trap',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/bounty_trap/800/350',
        text: 'Незнакомец предлагает лёгкое задание за хорошие деньги. Слишком лёгкое. Слишком хорошие деньги. Что-то не так.',
        choices: [
          {
            label: 'Согласиться — деньги нужны',
            action: 'GOTO_NODE',
            nextNode: 'trap_sprung',
            reqRepMax: -40,
          },
          {
            label: 'Отказаться — чует нехорошее',
            action: 'CLOSE',
          },
          {
            label: 'Проследить за незнакомцем',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'trap_seen',
            failNode: 'trap_sprung',
            reqRepMax: -40,
          },
        ],
      },
      trap_sprung: {
        id: 'trap_sprung',
        text: 'Ловушка. Охотники за головами ждали в условленном месте. Бой. Вы уходите — едва.',
        choices: [
          {
            label: 'Бежать',
            action: 'CLOSE',
            penalty: { hp: 30, energy: 4 },
          },
        ],
      },
      trap_seen: {
        id: 'trap_seen',
        text: 'Вы видите засаду заранее. Охотников четверо. Вы уходите другим путём, незамеченным.',
        choices: [
          {
            label: 'Уйти спокойно',
            action: 'CLOSE',
            reward: { energy: 2 },
          },
        ],
      },
    },
  },

  // ─── REP <= -80 (Отверженный) ───────────────────────────────────────────────

  bounty_hunter_chase: {
    id: 'bounty_hunter_chase',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/bounty_hunter_chase/800/350',
        text: 'Из-за угла выходит человек в тяжёлых доспехах. «Отверженный. Награда за тебя — двести кредитов. Живым или мёртвым.» За ним — ещё двое.',
        choices: [
          {
            label: 'Сражаться',
            action: 'ROLL_DICE',
            probability: 0.45,
            successNode: 'fought_off',
            failNode: 'captured',
            reqRepMax: -80,
          },
          {
            label: 'Бежать',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'fled',
            failNode: 'cornered',
            reqRepMax: -80,
            penalty: { energy: 5 },
          },
        ],
      },
      fought_off: {
        id: 'fought_off',
        text: 'Двое обезврежены. Третий отступает. «Не стоит тех денег,» — бормочет он, уходя. Вы стоите в тишине, тяжело дыша.',
        choices: [
          {
            label: 'Уйти пока есть силы',
            action: 'CLOSE',
            penalty: { hp: 25 },
            reward: { credits: 40 },
          },
        ],
      },
      captured: {
        id: 'captured',
        text: 'Вас захватывают. Недолгий плен — но достаточно долгий, чтобы потерять ценности.',
        choices: [
          {
            label: 'Бежать при первой возможности',
            action: 'CLOSE',
            penalty: { hp: 40, credits: 50, energy: 5 },
          },
        ],
      },
      fled: {
        id: 'fled',
        text: 'Охотники теряют след в переулках. Вы переводите дыхание в тёмном закутке. Они уйдут. До следующего раза.',
        choices: [{ label: 'Осторожно выбраться', action: 'CLOSE' }],
      },
      cornered: {
        id: 'cornered',
        text: 'Тупик. Охотники окружают. Остаётся лишь торговаться — деньги или кровь.',
        choices: [
          {
            label: 'Откупиться',
            action: 'CLOSE',
            penalty: { credits: 60, hp: 20 },
          },
        ],
      },
    },
  },

  village_turns_away: {
    id: 'village_turns_away',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/village_turns_away/800/350',
        text: 'Деревня. Вы пытаетесь войти, но ворота закрываются перед носом. Через щель: «Уходи, Отверженный. Нам не нужны твои беды.» Дети смотрят из-за заборов.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            reqRepMax: -80,
            penalty: { energy: 2 },
          },
          {
            label: 'Попытаться доказать мирные намерения',
            action: 'ROLL_DICE',
            probability: 0.3,
            successNode: 'let_in',
            failNode: 'chased',
            reqRepMax: -80,
          },
        ],
      },
      let_in: {
        id: 'let_in',
        text: 'Один старик позволяет войти. «Один час. И уходишь.» Вы успеваете пополнить запасы и отдохнуть у огня.',
        choices: [
          {
            label: 'Уйти в назначенный срок',
            action: 'CLOSE',
            reward: { hp: 15, energy: 3 },
          },
        ],
      },
      chased: {
        id: 'chased',
        text: 'Деревенские выходят с вилами. Без слов. Вы уходите быстро.',
        choices: [
          {
            label: 'Бежать',
            action: 'CLOSE',
            penalty: { energy: 3 },
          },
        ],
      },
    },
  },

  dark_shrine_awakens: {
    id: 'dark_shrine_awakens',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/dark_shrine_awakens/800/350',
        text: 'Заброшенное святилище оживает, когда вы проходите мимо. Огонь без дров. Голос из темноты: «Отверженный. Я видел таких. Сила без цепей — вот что тебе предлагаю.»',
        choices: [
          {
            label: 'Принять силу тьмы',
            action: 'GOTO_NODE',
            nextNode: 'accepted',
            reqRepMax: -80,
            addReputation: -10,
          },
          {
            label: 'Уйти — эта сила не бесплатна',
            action: 'CLOSE',
          },
        ],
      },
      accepted: {
        id: 'accepted',
        text: 'Огонь касается вас. Боль. Потом — мощь. Вы чувствуете, как что-то в вас меняется навсегда. Цена неизвестна — но заплачена.',
        choices: [
          {
            label: 'Принять изменение',
            action: 'CLOSE',
            reward: { hp: 30, energy: 8, items: ['void_shard'] },
            setFlag: 'dark_shrine_touched',
          },
        ],
      },
    },
  },

  shadow_broker_contact: {
    id: 'shadow_broker_contact',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/shadow_broker_contact/800/350',
        text: 'Письмо без подписи: «Отверженный. Твоя репутация нас устраивает. Теневой Брокер предлагает сотрудничество. Найди нас на рынке после заката. Скажи: "Цена не обсуждается".»',
        choices: [
          {
            label: 'Прийти на встречу',
            action: 'GOTO_NODE',
            nextNode: 'met',
            reqRepMax: -80,
          },
          {
            label: 'Проигнорировать',
            action: 'CLOSE',
          },
        ],
      },
      met: {
        id: 'met',
        text: 'Брокер — человек без лица, буквально. Шлем скрывает всё. «Хорошо. Я даю задания. Ты выполняешь. Цена по результату. Первое задание — уже есть.» Он называет цель.',
        choices: [
          {
            label: 'Принять условия',
            action: 'CLOSE',
            setFlag: 'shadow_broker_employed',
            reward: { credits: 50 },
          },
          {
            label: 'Отказаться в последний момент',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  // ─── REP near 0 (Нейтральный) ───────────────────────────────────────────────

  neutral_merchant: {
    id: 'neutral_merchant',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/neutral_merchant/800/350',
        text: 'Обычный торговец. Обычные цены. «Покупаете что-нибудь?» Никакого особого отношения — ни хорошего, ни плохого.',
        choices: [
          {
            label: 'Купить провизию (−25 кредитов)',
            action: 'CLOSE',
            reqCredits: 25,
            penalty: { credits: 25 },
            reward: { items: ['food_bread'] },
          },
          {
            label: 'Купить Паломнический Жетон (−40 кредитов)',
            action: 'CLOSE',
            reqCredits: 40,
            penalty: { credits: 40 },
            reward: { items: ['ancient_relic'] },
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  drifter_info: {
    id: 'drifter_info',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/drifter_info/800/350',
        text: 'Бродяга у костра машет вам. «Эй. Ты явно куда-то идёшь. Я тут хожу давно. Знаю кое-что.» Он чешет затылок. «За монетку расскажу.»',
        choices: [
          {
            label: 'Заплатить за информацию (−10 кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'paid',
            reqCredits: 10,
            penalty: { credits: 10 },
            reqRepMin: -35,
            reqRepMax: 35,
          },
          {
            label: 'Отказать',
            action: 'CLOSE',
          },
        ],
      },
      paid: {
        id: 'paid',
        text: 'Бродяга рассказывает о нескольких укрытых тропах и точке, где можно набрать воды. Немного — но полезно.',
        choices: [
          {
            label: 'Запомнить',
            action: 'CLOSE',
            reward: { energy: 3 },
            setFlag: 'drifter_tips',
          },
        ],
      },
    },
  },

  wanderer_tale: {
    id: 'wanderer_tale',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/wanderer_tale/800/350',
        text: 'Старый путник у дороги предлагает разделить костёр. «Садись. Одному долго. Расскажу кое-что — не полезное, но правдивое.»',
        choices: [
          {
            label: 'Сесть и выслушать',
            action: 'GOTO_NODE',
            nextNode: 'tale',
            reqRepMin: -35,
            reqRepMax: 35,
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      tale: {
        id: 'tale',
        text: 'Путник рассказывает о войне тридцатилетней давности — о том, как Пустота уже приходила однажды, и была остановлена. «Но не победой. Только отсрочкой.» Он замолкает. Потом даёт вам горсть монет. «Держи. Тебе нужнее.»',
        choices: [
          {
            label: 'Принять',
            action: 'CLOSE',
            reward: { credits: 20, energy: 3 },
            setFlag: 'void_history_known',
          },
        ],
      },
    },
  },

  crossroads_fortune_teller: {
    id: 'crossroads_fortune_teller',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/crossroads_fortune_teller/800/350',
        text: 'На перекрёстке — шатёр с пологом. Женщина с картами у входа: «Судьба читается в пути. Хочешь знать, что впереди? Небольшая плата.»',
        choices: [
          {
            label: 'Узнать будущее (−15 кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'told',
            reqCredits: 15,
            penalty: { credits: 15 },
            reqRepMin: -35,
            reqRepMax: 35,
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      told: {
        id: 'told',
        text: 'Женщина раскладывает карты. Долгое молчание. «Впереди — выбор. Не между хорошим и плохим. Между двумя видами потери.» Она сворачивает карты. «Это всё, что я вижу. Остальное — за тобой.»',
        choices: [
          {
            label: 'Принять пророчество',
            action: 'CLOSE',
            setFlag: 'fortune_told',
            reward: { energy: 2 },
          },
        ],
      },
    },
  },

};
