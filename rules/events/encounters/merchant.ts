import { OverworldEvent } from '../../../types.ts';

export const MERCHANT_ENCOUNTERS: Record<string, OverworldEvent> = {

  merchant_rare_auction: {
    id: 'merchant_rare_auction',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/merchant_rare_auction/800/350',
        text: 'На торговой площадке разложен необычный товар. Торговец — пожилая женщина с острым взглядом — ведёт тихий аукцион среди немногих покупателей. «Только для серьёзных людей. Смотрите, но не трогайте.»',
        choices: [
          {
            label: 'Купить Битый Диск Данных (−60 кредитов)',
            action: 'CLOSE',
            reqCredits: 60,
            penalty: { credits: 60 },
            reward: { items: ['data_disc'] },
          },
          {
            label: 'Купить Древнюю Реликвию (−50 кредитов)',
            action: 'CLOSE',
            reqCredits: 50,
            penalty: { credits: 50 },
            reward: { items: ['ancient_relic'] },
          },
          {
            label: 'Поторговаться за лучшую цену',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'bargain_won',
            failNode: 'bargain_lost',
          },
          {
            label: 'Уйти — цены неподъёмные',
            action: 'CLOSE',
          },
        ],
      },
      bargain_won: {
        id: 'bargain_won',
        text: 'Торговка удивлена вашей настойчивостью. Небольшая уступка — двадцать кредитов. «Один раз. Больше не просите.»',
        choices: [
          {
            label: 'Купить Битый Диск Данных (−40 кредитов)',
            action: 'CLOSE',
            reqCredits: 40,
            penalty: { credits: 40 },
            reward: { items: ['data_disc'] },
          },
          {
            label: 'Уйти — всё равно дорого',
            action: 'CLOSE',
          },
        ],
      },
      bargain_lost: {
        id: 'bargain_lost',
        text: 'Торговка смотрит холодно. «Мои цены фиксированные. Уходите, если не готовы платить.» Другие покупатели смотрят с осуждением.',
        choices: [
          {
            label: 'Купить по обычной цене или уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  merchant_in_trouble: {
    id: 'merchant_in_trouble',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/merchant_in_trouble/800/350',
        text: 'Торговец в панике. Его телега застряла в грязи, товар рассыпался, а до закрытия ворот — час. «Помогите! Я заплачу! Хотя бы помогите собрать.»',
        choices: [
          {
            label: 'Помочь бесплатно',
            action: 'GOTO_NODE',
            nextNode: 'helped_free',
            addReputation: 7,
          },
          {
            label: 'Помочь за плату (−торговец заплатит сам)',
            action: 'GOTO_NODE',
            nextNode: 'helped_paid',
          },
          {
            label: 'Подобрать пару предметов с земли и уйти',
            action: 'CLOSE',
            reward: { credits: 15 },
            addReputation: -4,
          },
        ],
      },
      helped_free: {
        id: 'helped_free',
        text: 'Торговец благодарен до слёз. «Вы спасли меня. Берите что хотите — в разумных пределах, конечно.» Он открывает лучший ящик.',
        choices: [
          {
            label: 'Взять Свежий Хлеб',
            action: 'CLOSE',
            reward: { items: ['food_bread'], energy: 4 },
          },
          {
            label: 'Взять деньги',
            action: 'CLOSE',
            reward: { credits: 45, energy: 4 },
          },
        ],
      },
      helped_paid: {
        id: 'helped_paid',
        text: 'Работа сделана. Торговец считает монеты — немного, но честно. «Вы деловой человек. Уважаю. Приходите в следующий раз — дам скидку.»',
        choices: [
          {
            label: 'Принять оплату',
            action: 'CLOSE',
            reward: { credits: 30, energy: 2 },
            setFlag: 'merchant_discount',
          },
        ],
      },
    },
  },

  merchant_fake_goods: {
    id: 'merchant_fake_goods',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/merchant_fake_goods/800/350',
        text: 'Торговец предлагает «редкий артефакт Пустоты» по невероятно низкой цене. Что-то не так — печать слишком новая, краска не стёрта.',
        choices: [
          {
            label: 'Купить доверчиво (−30 кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'bought',
            penalty: { credits: 30 },
          },
          {
            label: 'Разоблачить подделку',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'exposed',
            failNode: 'wrong',
          },
          {
            label: 'Уйти, не покупая',
            action: 'CLOSE',
          },
        ],
      },
      bought: {
        id: 'bought',
        text: 'Дома — то есть в пути — вы обнаруживаете: это крашеный камень в красивой упаковке. Торговца уже нет. Деньги потрачены впустую.',
        choices: [{ label: 'Выбросить бесполезный камень', action: 'CLOSE' }],
      },
      exposed: {
        id: 'exposed',
        text: 'Торговец краснеет, потом вдруг расплывается в улыбке. «Хорошо замечено. Вы из тех, кого не обманешь. За это — реальный товар по честной цене.» Он достаёт другой ящик.',
        choices: [
          {
            label: 'Купить Свежий Хлеб (−20 кредитов)',
            action: 'CLOSE',
            reqCredits: 20,
            penalty: { credits: 20 },
            reward: { items: ['food_bread'] },
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
      wrong: {
        id: 'wrong',
        text: 'Оказывается, это был настоящий артефакт. Торговец обижен. «Я честный человек! Уходите!» Вы уходите ни с чем.',
        choices: [
          {
            label: 'Принести извинения и уйти',
            action: 'CLOSE',
            addReputation: -2,
          },
        ],
      },
    },
  },

  merchant_price_war: {
    id: 'merchant_price_war',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/merchant_price_war/800/350',
        text: 'Два торговца стоят друг напротив друга и кричат. «Мои цены ниже!» — «А мой товар лучше!» Между ними — покупатели в растерянности. Оба зовут вас к себе.',
        choices: [
          {
            label: 'Купить у левого торговца (дешевле)',
            action: 'GOTO_NODE',
            nextNode: 'left_merchant',
          },
          {
            label: 'Купить у правого торговца (лучше качество)',
            action: 'GOTO_NODE',
            nextNode: 'right_merchant',
          },
          {
            label: 'Сыграть их друг против друга',
            action: 'ROLL_DICE',
            probability: 0.55,
            successNode: 'played',
            failNode: 'backfired',
          },
        ],
      },
      left_merchant: {
        id: 'left_merchant',
        text: 'Свежий хлеб обходится дёшево, но качество среднее. Впрочем, голод не тётка.',
        choices: [
          {
            label: 'Купить (−20 кредитов)',
            action: 'CLOSE',
            reqCredits: 20,
            penalty: { credits: 20 },
            reward: { items: ['food_bread'] },
          },
        ],
      },
      right_merchant: {
        id: 'right_merchant',
        text: 'Отличное качество. Торговец гордится своим товаром. Цена выше — но восстановление сил лучше.',
        choices: [
          {
            label: 'Купить (−35 кредитов)',
            action: 'CLOSE',
            reqCredits: 35,
            penalty: { credits: 35 },
            reward: { items: ['food_bread'], energy: 2 },
          },
        ],
      },
      played: {
        id: 'played',
        text: 'Вы мастерски разыгрываете их конкуренцию. Оба снижают цены до абсурдного минимума. Вы уходите с полными руками.',
        choices: [
          {
            label: 'Забрать выигрыш',
            action: 'CLOSE',
            reward: { items: ['food_bread'], credits: 20, energy: 2 },
          },
        ],
      },
      backfired: {
        id: 'backfired',
        text: 'Торговцы замечают манипуляцию и объединяются против вас. «Уходи — обманщик.» Вас выгоняют с торговой площадки.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
    },
  },

  merchant_stolen_fence: {
    id: 'merchant_stolen_fence',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/merchant_stolen_fence/800/350',
        text: 'Торговец шёпотом предлагает скупить «товар особого происхождения». Явно краденое. Хорошие вещи по смешным ценам — но ярлыки срезаны, и кое-где видна чужая кровь.',
        choices: [
          {
            label: 'Купить (−25 кредитов)',
            action: 'CLOSE',
            reqCredits: 25,
            penalty: { credits: 25 },
            reward: { items: ['food_bread'], credits: 15 },
            addReputation: -5,
          },
          {
            label: 'Сообщить властям',
            action: 'GOTO_NODE',
            nextNode: 'reported',
            addReputation: 5,
          },
          {
            label: 'Уйти молча',
            action: 'CLOSE',
          },
        ],
      },
      reported: {
        id: 'reported',
        text: 'Стражники задерживают торговца. Часть товара оказывается из ограбленной аптеки. Аптекарь благодарит вас. Маленькая победа маленькой совести.',
        choices: [
          {
            label: 'Принять благодарность аптекаря',
            action: 'CLOSE',
            reward: { hp: 20, credits: 20 },
          },
        ],
      },
    },
  },

  merchant_mysterious_catalog: {
    id: 'merchant_mysterious_catalog',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/merchant_mysterious_catalog/800/350',
        text: 'Торговец протягивает потрёпанный каталог без обложки. «Специальный заказ. Всё что здесь — можно достать. Не спрашивайте как.» На страницах — предметы с символами Пустоты.',
        choices: [
          {
            label: 'Заказать Осколок Пустоты (−70 кредитов)',
            action: 'CLOSE',
            reqCredits: 70,
            penalty: { credits: 70 },
            reward: { items: ['void_shard'] },
          },
          {
            label: 'Заказать Битый Диск Данных (−50 кредитов)',
            action: 'CLOSE',
            reqCredits: 50,
            penalty: { credits: 50 },
            reward: { items: ['data_disc'] },
          },
          {
            label: 'Спросить об источнике товаров',
            action: 'GOTO_NODE',
            nextNode: 'asked_source',
          },
          {
            label: 'Уйти — слишком тёмный товар',
            action: 'CLOSE',
          },
        ],
      },
      asked_source: {
        id: 'asked_source',
        text: '«Источник? Везде и нигде. Некоторые вещи... выходят из Пустоты сами. Мы просто собираем.» Он закрывает каталог. «Если решитесь — я здесь до заката.»',
        choices: [
          {
            label: 'Заказать Осколок Пустоты (−70 кредитов)',
            action: 'CLOSE',
            reqCredits: 70,
            penalty: { credits: 70 },
            reward: { items: ['void_shard'] },
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
            setFlag: 'mysterious_catalog_seen',
          },
        ],
      },
    },
  },

};
