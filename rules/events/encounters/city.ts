import { OverworldEvent } from '../../../types.ts';

export const CITY_ENCOUNTERS: Record<string, OverworldEvent> = {

  city_market_riot: {
    id: 'city_market_riot',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_market_riot/800/350',
        text: 'Рынок охвачен беспорядками. Торговцы разбегаются, толпа переворачивает телеги. Солдаты Синдиката оцепляют квартал. Где-то горит навес. Крики: «Долой налоги!»',
        choices: [
          {
            label: 'Помочь мирным жителям выбраться',
            action: 'GOTO_NODE',
            nextNode: 'helped_civilians',
            addReputation: 10,
            reqFlag: 'syndicate_war_aware',
          },
          {
            label: 'Воспользоваться суматохой и пополнить запасы',
            action: 'GOTO_NODE',
            nextNode: 'looted_chaos',
            addReputation: -5,
            reqFlag: 'syndicate_war_aware',
          },
          {
            label: 'Уйти — это не твоя война',
            action: 'CLOSE',
          },
        ],
      },
      helped_civilians: {
        id: 'helped_civilians',
        text: 'Вы помогаете нескольким людям выбраться из давки. Среди них — пожилой аптекарь. «Возьмите это,» — говорит он, прижимая к груди связку трав. — «Вы спасли мне жизнь.»',
        choices: [
          {
            label: 'Принять благодарность',
            action: 'CLOSE',
            reward: { hp: 30, energy: 4 },
          },
        ],
      },
      looted_chaos: {
        id: 'looted_chaos',
        text: 'В суматохе удаётся подобрать несколько ценных вещей. Никто не видел. Но в толпе — чьи-то острые глаза. Наблюдатель Синдиката.',
        choices: [
          {
            label: 'Уйти быстро',
            action: 'CLOSE',
            reward: { credits: 45 },
            setFlag: 'syndicate_eye_on_you',
          },
        ],
      },
    },
  },

  city_strange_auction: {
    id: 'city_strange_auction',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_strange_auction/800/350',
        text: 'В подвале таверны — закрытый аукцион. Ведущий в маске предлагает лоты без названий. Лот номер три: запечатанный деревянный ящик. «Начальная цена — сорок кредитов.»',
        choices: [
          {
            label: 'Купить ящик (−40 кредитов)',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'good_item',
            failNode: 'bad_item',
            reqCredits: 40,
            penalty: { credits: 40 },
          },
          {
            label: 'Перебить ставку — 60 кредитов',
            action: 'GOTO_NODE',
            nextNode: 'outbid',
            reqCredits: 60,
            penalty: { credits: 60 },
          },
          {
            label: 'Не участвовать — наблюдать',
            action: 'GOTO_NODE',
            nextNode: 'observed',
          },
        ],
      },
      good_item: {
        id: 'good_item',
        text: 'Внутри — старинная шкатулка с редким артефактом. Вы не уверены в его происхождении, но ценность очевидна.',
        choices: [
          {
            label: 'Забрать',
            action: 'CLOSE',
            reward: { items: ['ANCIENT_KEY'], credits: 10 },
          },
        ],
      },
      bad_item: {
        id: 'bad_item',
        text: 'Ящик содержит бесполезный хлам — старые гвозди и кусок ткани. Вас явно обманули. Ведущий в маске смотрит с нескрываемым удовольствием.',
        choices: [
          {
            label: 'Уйти молча — урок получен',
            action: 'CLOSE',
          },
        ],
      },
      outbid: {
        id: 'outbid',
        text: 'Никто не перебивает вашу ставку. В ящике — документы Синдиката с печатями. Явно краденые. Ценные и опасные.',
        choices: [
          {
            label: 'Взять документы — это оружие',
            action: 'CLOSE',
            reward: { credits: 20 },
            setFlag: 'has_syndicate_docs',
          },
          {
            label: 'Уничтожить — слишком опасно',
            action: 'CLOSE',
          },
        ],
      },
      observed: {
        id: 'observed',
        text: 'Наблюдая за торгами, вы замечаете знакомое лицо — агент Синдиката в штатском активно перебивает ставки. Что-то здесь важнее денег.',
        choices: [
          {
            label: 'Последить за агентом после аукциона',
            action: 'CLOSE',
            setFlag: 'syndicate_agent_tracked',
          },
          {
            label: 'Уйти — не твоё дело',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  city_bar_fight: {
    id: 'city_bar_fight',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_bar_fight/800/350',
        text: 'Таверна. Пьяный солдат вламывается в ваш столик и опрокидывает кружку. «Ты! Я тебя знаю. Ты из тех предателей.» Всё стихает. Люди смотрят.',
        choices: [
          {
            label: 'Встать и ответить ударом',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'fight_won',
            failNode: 'fight_lost',
          },
          {
            label: 'Достать Запечатанное Письмо и показать',
            action: 'GOTO_NODE',
            nextNode: 'letter_shown',
            reqItem: 'SEALED_LETTER',
          },
          {
            label: 'Сесть и молча выдержать унижение',
            action: 'GOTO_NODE',
            nextNode: 'endured',
          },
          {
            label: 'Тихо покинуть таверну',
            action: 'CLOSE',
            penalty: { energy: 1 },
          },
        ],
      },
      fight_won: {
        id: 'fight_won',
        text: 'Солдат падает со стула. Таверна взрывается гулом — кто-то смеётся, кто-то аплодирует. Хозяин кивает: «Этот пьянчуга давно напрашивался. Выпейте за мой счёт.»',
        choices: [
          {
            label: 'Принять угощение',
            action: 'CLOSE',
            reward: { hp: 10, energy: 3 },
            addReputation: 5,
          },
        ],
      },
      fight_lost: {
        id: 'fight_lost',
        text: 'Солдат оказывается не так пьян, как казалось. Вы оказываетесь на полу, под смешки публики. Хозяин выпроваживает обоих.',
        choices: [
          {
            label: 'Убраться с достоинством',
            action: 'CLOSE',
            penalty: { hp: 20 },
          },
        ],
      },
      letter_shown: {
        id: 'letter_shown',
        text: 'Солдат читает печать письма и резко трезвеет. «Я... простите. Ошибся.» Он уходит, не поднимая глаз. Остальные смотрят на вас с уважением — и страхом.',
        choices: [
          {
            label: 'Вернуться к трапезе',
            action: 'CLOSE',
            reward: { energy: 2 },
          },
        ],
      },
      endured: {
        id: 'endured',
        text: 'Вы молчите. Солдат теряет интерес и уходит. Рядом садится старик: «Правильно сделал. Это был провокатор Синдиката. Проверял реакцию.» Он наклоняется ближе.',
        choices: [
          {
            label: 'Выслушать старика',
            action: 'CLOSE',
            setFlag: 'syndicate_test_passed',
            reward: { energy: 2 },
          },
        ],
      },
    },
  },

  city_mysterious_client: {
    id: 'city_mysterious_client',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_mysterious_client/800/350',
        text: 'К вам подходит человек в плаще с капюшоном. Без предисловий: «У меня есть задание. Доставить пакет в южный квартал. Пятьдесят кредитов. Не задавайте вопросов — это ваш лучший вариант.»',
        choices: [
          {
            label: 'Согласиться (взять пакет)',
            action: 'GOTO_NODE',
            nextNode: 'accepted',
          },
          {
            label: 'Потребовать больше информации',
            action: 'GOTO_NODE',
            nextNode: 'questioned',
          },
          {
            label: 'Отказаться',
            action: 'CLOSE',
          },
        ],
      },
      accepted: {
        id: 'accepted',
        text: 'Пакет лёгкий. В южном квартале вас встречает юноша в балахоне Сопротивления. Он берёт пакет и сует вам монеты. «Спасибо. Вы не знаете, что сделали.» Возможно, это правда.',
        choices: [
          {
            label: 'Взять деньги и уйти',
            action: 'CLOSE',
            reward: { credits: 50 },
            setFlag: 'resistance_contact_made',
          },
        ],
      },
      questioned: {
        id: 'questioned',
        text: 'Незнакомец молчит секунду. «Содержимое пакета не опасно для вас. Опасно для Синдиката. Этого достаточно?» Он смотрит прямо в глаза.',
        choices: [
          {
            label: 'Согласиться после объяснения',
            action: 'CLOSE',
            reward: { credits: 50 },
            setFlag: 'resistance_contact_made',
            addReputation: 5,
          },
          {
            label: 'Всё равно отказаться',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  city_festival_day: {
    id: 'city_festival_day',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_festival_day/800/350',
        text: 'В городе — праздник. Флаги Синдиката везде, музыка громкая и фальшивая. Толпа веселится из-под палки. Но еда дешевле обычного, и стражников меньше.',
        choices: [
          {
            label: 'Смешаться с толпой и отдохнуть',
            action: 'GOTO_NODE',
            nextNode: 'joined',
          },
          {
            label: 'Воспользоваться сниженной охраной',
            action: 'GOTO_NODE',
            nextNode: 'used_opening',
            setFlag: 'used_festival_distraction',
          },
          {
            label: 'Уйти — праздник чужой власти не для тебя',
            action: 'CLOSE',
          },
        ],
      },
      joined: {
        id: 'joined',
        text: 'Несмотря на принуждённость веселья, еда и отдых восстанавливают силы. Случайный сосед рассказывает городские новости. «Тюрьму расширяют. Говорят, для политических.»',
        choices: [
          {
            label: 'Запомнить новость',
            action: 'CLOSE',
            reward: { hp: 20, energy: 5, credits: 10 },
            setFlag: 'prison_expansion_known',
          },
        ],
      },
      used_opening: {
        id: 'used_opening',
        text: 'Снижение охраны позволяет вам добраться до закрытого склада. Внутри — припасы Синдиката. Берёте немного — не жадничая.',
        choices: [
          {
            label: 'Уйти с добычей',
            action: 'CLOSE',
            reward: { items: ['SUPPLIES'], credits: 30 },
            addReputation: -3,
          },
        ],
      },
    },
  },

  city_black_market: {
    id: 'city_black_market',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_black_market/800/350',
        text: 'Подворотня. Запах сырости. Торговец с бегающими глазами шепчет: «Есть всё, чего нет на рынке. Печати, документы, артефакты. Дорого — но настоящее.»',
        choices: [
          {
            label: 'Купить Жетон Сопротивления (−50 кредитов)',
            action: 'CLOSE',
            reqCredits: 50,
            penalty: { credits: 50 },
            reward: { items: ['RESISTANCE_BADGE'] },
          },
          {
            label: 'Купить Запечатанное Письмо (−40 кредитов)',
            action: 'CLOSE',
            reqCredits: 40,
            penalty: { credits: 40 },
            reward: { items: ['SEALED_LETTER'] },
          },
          {
            label: 'Предложить Комиссию Восса взамен на скидки',
            action: 'GOTO_NODE',
            nextNode: 'voss_deal',
            reqItem: 'VOSS_COMMISSION',
          },
          {
            label: 'Уйти — слишком рискованно',
            action: 'CLOSE',
          },
        ],
      },
      voss_deal: {
        id: 'voss_deal',
        text: 'Торговец смотрит на Комиссию Восса. Пауза. «Это... ценная бумага. Хорошо. Я дам вам кое-что взамен — и мы в расчёте.»',
        choices: [
          {
            label: 'Принять обмен',
            action: 'CLOSE',
            penalty: { items: ['VOSS_COMMISSION'] },
            reward: { credits: 80, items: ['RESISTANCE_BADGE'] },
          },
        ],
      },
    },
  },

  city_rumors_spread: {
    id: 'city_rumors_spread',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_rumors_spread/800/350',
        text: 'В таверне разговоры не стихают. «Слышали? Пустота расширяется на севере. Три деревни исчезли за ночь. Синдикат молчит.» Каждый говорит своё — и каждый верит в своё.',
        choices: [
          {
            label: 'Слушать и собирать информацию',
            action: 'GOTO_NODE',
            nextNode: 'gathered_info',
          },
          {
            label: 'Добавить собственный слух — дезинформация',
            action: 'GOTO_NODE',
            nextNode: 'spread_rumor',
            addReputation: -3,
          },
          {
            label: 'Уйти из таверны',
            action: 'CLOSE',
          },
        ],
      },
      gathered_info: {
        id: 'gathered_info',
        text: 'Из обрывков разговоров складывается картина: Синдикат проводит эксперименты в северных шахтах. Несколько рабочих пропало. Кто-то упоминает «Голубой Огонь» под землёй.',
        choices: [
          {
            label: 'Запомнить всё услышанное',
            action: 'CLOSE',
            setFlag: 'blue_fire_rumor',
            reward: { energy: 1 },
          },
        ],
      },
      spread_rumor: {
        id: 'spread_rumor',
        text: 'Вы добавляете к слухам несуществующую деталь. К утру она обрастёт подробностями и станет «фактом». Этот город будет обсуждать её неделю.',
        choices: [
          {
            label: 'Посмотреть, к чему это приведёт',
            action: 'CLOSE',
            setFlag: 'planted_rumor',
          },
        ],
      },
    },
  },

  city_assassination_attempt: {
    id: 'city_assassination_attempt',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_assassination_attempt/800/350',
        text: 'Стрела выбивает кружку из вашей руки. Снайпер — на крыше напротив. Второй выстрел последует через секунду. Вы знали, что Восс рано или поздно пришлёт убийц.',
        choices: [
          {
            label: 'Уйти в укрытие немедленно',
            action: 'ROLL_DICE',
            probability: 0.65,
            successNode: 'escaped',
            failNode: 'hit',
            reqFlag: 'voss_knows_player',
          },
          {
            label: 'Предъявить Комиссию Восса — может, убийца отступит',
            action: 'GOTO_NODE',
            nextNode: 'commission_shown',
            reqItem: 'VOSS_COMMISSION',
            reqFlag: 'voss_knows_player',
          },
          {
            label: 'Контратаковать немедленно',
            action: 'GOTO_NODE',
            nextNode: 'counterattack',
            reqFlag: 'voss_knows_player',
          },
        ],
      },
      escaped: {
        id: 'escaped',
        text: 'Вы уходите в проулок, прижимаясь к стенам. Убийца теряет цель в толпе. Оглянувшись — никого. Пока.',
        choices: [
          {
            label: 'Исчезнуть из города',
            action: 'CLOSE',
            setFlag: 'survived_voss_assassin',
          },
        ],
      },
      hit: {
        id: 'hit',
        text: 'Второй выстрел достигает цели — скользящее ранение. Больно, но не смертельно. Убийца исчезает в толпе прежде, чем вы успеваете что-то предпринять.',
        choices: [
          {
            label: 'Залечить рану и убраться из города',
            action: 'CLOSE',
            penalty: { hp: 35 },
          },
        ],
      },
      commission_shown: {
        id: 'commission_shown',
        text: 'Вы поднимаете Комиссию над головой. Стрелы прекращаются. Через минуту на крыше — никого. Контракт был отозван — или убийца решил пересмотреть условия.',
        choices: [
          {
            label: 'Убраться из города, пока есть время',
            action: 'CLOSE',
            setFlag: 'survived_voss_assassin',
            reward: { energy: 2 },
          },
        ],
      },
      counterattack: {
        id: 'counterattack',
        text: 'Вы атакуете убийцу неожиданно — он не ждал этого. Схватка короткая. Убийца уходит раненым. На земле остаётся записка: «Это только начало. —В.»',
        choices: [
          {
            label: 'Подобрать записку',
            action: 'CLOSE',
            setFlag: 'survived_voss_assassin',
            addReputation: 5,
            reward: { energy: 2 },
          },
        ],
      },
    },
  },

};
