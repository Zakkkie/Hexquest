import { TerrainType } from '../types.ts';

// ─────────────────────────────────────────────────────────────────────────────
// PROCEDURAL EVENT TEMPLATE ENGINE
// 150 templates: 15 actor types × 10 situation types
// Expanded at runtime by services/EventComposer.ts
// ─────────────────────────────────────────────────────────────────────────────

export type ActorType =
  | 'BANDIT' | 'SOLDIER' | 'MERCHANT' | 'SCHOLAR' | 'SURVIVOR'
  | 'BEAST' | 'SPIRIT' | 'MACHINE' | 'PILGRIM' | 'CHILD'
  | 'ELDER' | 'KNIGHT' | 'SPY' | 'HERMIT' | 'GHOST';

export type SituationType =
  | 'ATTACK' | 'PLEA' | 'TRADE' | 'DISCOVERY' | 'MYSTERY'
  | 'RESCUE' | 'CHASE' | 'RITUAL' | 'TRAP' | 'GIFT';

export interface ChoiceTemplate {
  label: string;
  action: 'CLOSE' | 'GOTO_NODE' | 'ROLL_DICE';
  probability?: number;
  rewardScale: number;    // multiplier on base reward (0 = no reward, 2 = double)
  penaltyScale: number;   // multiplier on base penalty
  addReputation?: number;
  reqItemType?: 'any';    // if set, requires some item in bag
}

export interface EventTemplate {
  id: string;
  actorType: ActorType;
  situation: SituationType;
  terrain: TerrainType[];
  textPool: string[];     // pick one randomly; {actor}/{terrain}/{rep} substituted at runtime
  choices: ChoiceTemplate[];
  reqRepMin?: number;
  reqRepMax?: number;
  reqStepMin?: number;
  weight: number;         // relative spawn frequency (higher = more common)
  baseRewardCredits: number;
  basePenaltyHp: number;
}

const PLAINS = 'PLAINS' as TerrainType;
const FOREST = 'FOREST' as TerrainType;
const SWAMP = 'SWAMP' as TerrainType;
const WATER = 'WATER' as TerrainType;
const MOUNTAINS = 'MOUNTAINS' as TerrainType;
const ROAD = 'ROAD' as TerrainType;
const CITY = 'CITY' as TerrainType;
const RUINS = 'RUINS' as TerrainType;
const OUTPOST = 'OUTPOST' as TerrainType;
const MERCHANT_CAMP = 'MERCHANT_CAMP' as TerrainType;


export const EVENT_TEMPLATES: EventTemplate[] = [

  // ─── BANDIT × ATTACK ───
  { id: 'tpl_bandit_attack', actorType: 'BANDIT', situation: 'ATTACK', terrain: [PLAINS, ROAD, SWAMP],
    textPool: [
      'Трое разбойников выходят из-за камней. «Кошелёк — или жизнь.»',
      'Засада на дороге. Бандиты вооружены и голодны.',
      'Беглые солдаты стали ворами. Они загораживают путь.',
    ],
    choices: [
      { label: 'Откупиться', action: 'CLOSE', rewardScale: 0, penaltyScale: 1, addReputation: -5 },
      { label: 'Дать отпор (риск)', action: 'ROLL_DICE', probability: 0.55, rewardScale: 1.5, penaltyScale: 1.5, addReputation: 5 },
      { label: 'Уйти окружным путём (−Энергия)', action: 'CLOSE', rewardScale: 0, penaltyScale: 0.5 },
    ],
    weight: 8, baseRewardCredits: 40, basePenaltyHp: 20 },

  // ─── BANDIT × PLEA ───
  { id: 'tpl_bandit_plea', actorType: 'BANDIT', situation: 'PLEA', terrain: [PLAINS, ROAD],
    textPool: [
      'Раненый разбойник просит помощи. «Я больше не грабитель... только помоги мне.»',
      'Бандит бросает оружие. «Сдаюсь. Возьми что хочешь — только не убивай.»',
    ],
    choices: [
      { label: 'Помочь ему', action: 'CLOSE', rewardScale: 1, penaltyScale: 0, addReputation: 15 },
      { label: 'Обыскать и уйти', action: 'CLOSE', rewardScale: 1.2, penaltyScale: 0, addReputation: -5 },
      { label: 'Бросить на произвол судьбы', action: 'CLOSE', rewardScale: 0, penaltyScale: 0, addReputation: -10 },
    ],
    weight: 4, baseRewardCredits: 25, basePenaltyHp: 0 },

  // ─── SOLDIER × ATTACK ───
  { id: 'tpl_soldier_attack', actorType: 'SOLDIER', situation: 'ATTACK', terrain: [ROAD, OUTPOST, CITY],
    textPool: [
      'Патруль останавливает вас. «Документы. Немедленно.»',
      'Солдат преграждает путь. «По приказу Командора — досмотр.»',
    ],
    choices: [
      { label: 'Подчиниться', action: 'CLOSE', rewardScale: 0, penaltyScale: 0.3 },
      { label: 'Показать VOSS_COMMISSION', action: 'CLOSE', rewardScale: 0.5, penaltyScale: 0 },
      { label: 'Бежать', action: 'ROLL_DICE', probability: 0.5, rewardScale: 0, penaltyScale: 1 },
    ],
    weight: 6, baseRewardCredits: 0, basePenaltyHp: 15 },

  // ─── SOLDIER × TRADE ───
  { id: 'tpl_soldier_trade', actorType: 'SOLDIER', situation: 'TRADE', terrain: [OUTPOST, CITY],
    textPool: [
      'Солдат предлагает обмен — паёк на информацию.',
      'Дезертир торгует армейским снаряжением на чёрном рынке.',
    ],
    choices: [
      { label: 'Купить снаряжение (40 кредитов)', action: 'CLOSE', rewardScale: 1.5, penaltyScale: 0.5 },
      { label: 'Отказаться', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    weight: 4, baseRewardCredits: 35, basePenaltyHp: 0 },

  // ─── MERCHANT × TRADE ───
  { id: 'tpl_merchant_trade', actorType: 'MERCHANT', situation: 'TRADE', terrain: [ROAD, CITY, MERCHANT_CAMP, PLAINS],
    textPool: [
      'Бродячий торговец раскладывает товары прямо на земле.',
      'Купец останавливается у колодца. «Хорошие цены — только сегодня.»',
      'Повозка со странным товаром. Торговец улыбается слишком широко.',
    ],
    choices: [
      { label: 'Купить припасы (30 кредитов)', action: 'CLOSE', rewardScale: 1.2, penaltyScale: 0.4 },
      { label: 'Торговаться (шанс скидки)', action: 'ROLL_DICE', probability: 0.5, rewardScale: 1.5, penaltyScale: 0.2 },
      { label: 'Просто поговорить', action: 'CLOSE', rewardScale: 0.3, penaltyScale: 0 },
    ],
    weight: 7, baseRewardCredits: 30, basePenaltyHp: 0 },

  // ─── MERCHANT × TRAP ───
  { id: 'tpl_merchant_trap', actorType: 'MERCHANT', situation: 'TRAP', terrain: [ROAD, CITY],
    textPool: [
      'Купец предлагает «уникальный» товар. Что-то не так в его глазах.',
      'Сделка кажется слишком выгодной. За углом — тишина.',
    ],
    choices: [
      { label: 'Купить без проверки', action: 'ROLL_DICE', probability: 0.3, rewardScale: 2, penaltyScale: 1.5, addReputation: -5 },
      { label: 'Проверить товар сначала', action: 'ROLL_DICE', probability: 0.7, rewardScale: 1, penaltyScale: 0.5 },
      { label: 'Уйти', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    weight: 4, baseRewardCredits: 50, basePenaltyHp: 25 },

  // ─── SCHOLAR × DISCOVERY ───
  { id: 'tpl_scholar_discovery', actorType: 'SCHOLAR', situation: 'DISCOVERY', terrain: [RUINS, CITY, MOUNTAINS],
    textPool: [
      'Исследователь возбуждённо машет вам. «Смотри! Я нашёл нечто невероятное!»',
      'Учёный разворачивает старую карту. «Это указывает на место, которое не должно существовать.»',
    ],
    choices: [
      { label: 'Выслушать и помочь', action: 'CLOSE', rewardScale: 1, penaltyScale: 0, addReputation: 10 },
      { label: 'Взять находку себе', action: 'CLOSE', rewardScale: 1.8, penaltyScale: 0, addReputation: -15 },
      { label: 'Доложить Синдикату', action: 'CLOSE', rewardScale: 0.8, penaltyScale: 0, addReputation: -10 },
    ],
    weight: 5, baseRewardCredits: 45, basePenaltyHp: 0 },

  // ─── SCHOLAR × MYSTERY ───
  { id: 'tpl_scholar_mystery', actorType: 'SCHOLAR', situation: 'MYSTERY', terrain: [RUINS, CITY],
    textPool: [
      'Учёный задаёт странный вопрос: «Ты видел... знаки? На стенах?»',
      'Исследователь шёпотом: «Это место было кем-то очищено. Намеренно.»',
    ],
    choices: [
      { label: 'Поделиться своими знаниями', action: 'CLOSE', rewardScale: 0.8, penaltyScale: 0, addReputation: 10 },
      { label: 'Промолчать', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    weight: 4, baseRewardCredits: 20, basePenaltyHp: 0 },

  // ─── SURVIVOR × PLEA ───
  { id: 'tpl_survivor_plea', actorType: 'SURVIVOR', situation: 'PLEA', terrain: [PLAINS, RUINS, SWAMP, ROAD],
    textPool: [
      'Измотанный человек тянет руку. «Воды... хоть глоток.»',
      'Беженец смотрит пустыми глазами. «Моя деревня... больше нет деревни.»',
      'Ребёнок и старик у обочины. «Нам некуда идти.»',
    ],
    choices: [
      { label: 'Поделиться припасами', action: 'CLOSE', rewardScale: 0.5, penaltyScale: 0.3, addReputation: 20 },
      { label: 'Указать дорогу к городу', action: 'CLOSE', rewardScale: 0.2, penaltyScale: 0, addReputation: 10 },
      { label: 'Пройти мимо', action: 'CLOSE', rewardScale: 0, penaltyScale: 0, addReputation: -15 },
    ],
    weight: 6, baseRewardCredits: 15, basePenaltyHp: 0 },

  // ─── SURVIVOR × GIFT ───
  { id: 'tpl_survivor_gift', actorType: 'SURVIVOR', situation: 'GIFT', terrain: [PLAINS, ROAD],
    textPool: [
      'Беженец останавливает вас. «Ты помог нам. Возьми — это всё, что осталось.»',
      'Старик протягивает монету. «Больше нет. Но ты спас нас.»',
    ],
    choices: [
      { label: 'Принять благодарность', action: 'CLOSE', rewardScale: 1, penaltyScale: 0, addReputation: 10 },
      { label: 'Отказаться — им нужнее', action: 'CLOSE', rewardScale: 0, penaltyScale: 0, addReputation: 20 },
    ],
    weight: 3, baseRewardCredits: 20, basePenaltyHp: 0 },

  // ─── BEAST × ATTACK ───
  { id: 'tpl_beast_attack', actorType: 'BEAST', situation: 'ATTACK', terrain: [FOREST, SWAMP, MOUNTAINS, PLAINS],
    textPool: [
      'Из зарослей выпрыгивает тёмное существо. Глаза светятся фиолетовым.',
      'Земля дрожит — что-то движется под поверхностью. Потом — удар снизу.',
      'Волчья стая окружает вас. Вожак смотрит слишком разумно.',
    ],
    choices: [
      { label: 'Сражаться', action: 'ROLL_DICE', probability: 0.55, rewardScale: 1.5, penaltyScale: 1.5 },
      { label: 'Отступить медленно', action: 'ROLL_DICE', probability: 0.7, rewardScale: 0, penaltyScale: 0.5 },
      { label: 'Использовать ELDER_HERB для отпугивания', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    weight: 7, baseRewardCredits: 30, basePenaltyHp: 30 },

  // ─── BEAST × MYSTERY ───
  { id: 'tpl_beast_mystery', actorType: 'BEAST', situation: 'MYSTERY', terrain: [FOREST, SWAMP],
    textPool: [
      'Странное животное наблюдает за вами, не нападая. Оно будто ждёт.',
      'Птица кружит над вами трижды — всегда трижды — потом улетает на восток.',
    ],
    choices: [
      { label: 'Следовать за существом', action: 'ROLL_DICE', probability: 0.6, rewardScale: 1.5, penaltyScale: 0.5 },
      { label: 'Игнорировать', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    weight: 4, baseRewardCredits: 35, basePenaltyHp: 10 },

  // ─── SPIRIT × RITUAL ───
  { id: 'tpl_spirit_ritual', actorType: 'SPIRIT', situation: 'RITUAL', terrain: [FOREST, SWAMP, WATER],
    textPool: [
      'Призрак появляется в полночь. Не угрожает. Просто стоит и смотрит.',
      'Голубые огни собираются в круг. В центре — тихий голос.',
      'Дух просит выполнить ритуал. «Три камня. Три слова. Три шага.»',
    ],
    choices: [
      { label: 'Участвовать в ритуале', action: 'CLOSE', rewardScale: 1.2, penaltyScale: 0, addReputation: 15 },
      { label: 'Отказаться — духи ненадёжны', action: 'CLOSE', rewardScale: 0, penaltyScale: 0.3 },
      { label: 'Попытаться разогнать дух', action: 'ROLL_DICE', probability: 0.4, rewardScale: 0.5, penaltyScale: 1.2, addReputation: -10 },
    ],
    weight: 4, baseRewardCredits: 30, basePenaltyHp: 15 },

  // ─── SPIRIT × GIFT ───
  { id: 'tpl_spirit_gift', actorType: 'SPIRIT', situation: 'GIFT', terrain: [FOREST, WATER, SWAMP],
    textPool: [
      'Дух благодарит вас — вы помогли ему в другой раз, хотя не знали об этом.',
      'Голос в тишине: «Твой путь праведен. Возьми это.»',
    ],
    choices: [
      { label: 'Принять дар духа', action: 'CLOSE', rewardScale: 1.5, penaltyScale: 0, addReputation: 10 },
      { label: 'Отказаться — дары духов опасны', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    reqRepMin: 20,
    weight: 3, baseRewardCredits: 50, basePenaltyHp: 0 },

  // ─── MACHINE × DISCOVERY ───
  { id: 'tpl_machine_discovery', actorType: 'MACHINE', situation: 'DISCOVERY', terrain: [RUINS, OUTPOST],
    textPool: [
      'Работающий автомат — один из немногих уцелевших после Каскада. Он ждёт команды.',
      'Механический страж застыл у двери. Его глаза ещё светятся.',
    ],
    choices: [
      { label: 'Изучить механизм', action: 'CLOSE', rewardScale: 1, penaltyScale: 0 },
      { label: 'Попытаться активировать', action: 'ROLL_DICE', probability: 0.5, rewardScale: 2, penaltyScale: 1 },
      { label: 'Обойти стороной', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    weight: 5, baseRewardCredits: 40, basePenaltyHp: 20 },

  // ─── MACHINE × TRAP ───
  { id: 'tpl_machine_trap', actorType: 'MACHINE', situation: 'TRAP', terrain: [RUINS, OUTPOST],
    textPool: [
      'Сенсор активировался под ногами. У вас секунды.',
      'Автоматическая защитная турель поворачивается в вашу сторону.',
    ],
    choices: [
      { label: 'Взломать систему (риск)', action: 'ROLL_DICE', probability: 0.5, rewardScale: 1.5, penaltyScale: 1.5 },
      { label: 'Убежать немедленно', action: 'CLOSE', rewardScale: 0, penaltyScale: 0.6 },
    ],
    weight: 4, baseRewardCredits: 45, basePenaltyHp: 35 },

  // ─── PILGRIM × PLEA ───
  { id: 'tpl_pilgrim_plea', actorType: 'PILGRIM', situation: 'PLEA', terrain: [ROAD, PLAINS, MOUNTAINS],
    textPool: [
      'Паломник просит защиты — его преследуют солдаты Синдиката.',
      'Монах ищет пропавших братьев. «Видел ли ты серые плащи?»',
    ],
    choices: [
      { label: 'Защитить паломника', action: 'CLOSE', rewardScale: 0.8, penaltyScale: 0, addReputation: 20 },
      { label: 'Отказаться — не твоя война', action: 'CLOSE', rewardScale: 0, penaltyScale: 0, addReputation: -10 },
      { label: 'Помочь информацией', action: 'CLOSE', rewardScale: 0.5, penaltyScale: 0, addReputation: 10 },
    ],
    weight: 5, baseRewardCredits: 20, basePenaltyHp: 0 },

  // ─── PILGRIM × GIFT ───
  { id: 'tpl_pilgrim_gift', actorType: 'PILGRIM', situation: 'GIFT', terrain: [ROAD, PLAINS],
    textPool: [
      'Братство помнит добро. Паломник кладёт кредиты на ладонь без слов.',
      '«Дорога возвращает.» Незнакомый паломник вручает свёрток.',
    ],
    reqRepMin: 10,
    weight: 4, baseRewardCredits: 35, basePenaltyHp: 0,
    choices: [
      { label: 'Принять', action: 'CLOSE', rewardScale: 1, penaltyScale: 0, addReputation: 5 },
      { label: 'Отказаться', action: 'CLOSE', rewardScale: 0, penaltyScale: 0, addReputation: 10 },
    ] },

  // ─── CHILD × RESCUE ───
  { id: 'tpl_child_rescue', actorType: 'CHILD', situation: 'RESCUE', terrain: [PLAINS, ROAD, CITY],
    textPool: [
      'Ребёнок один посреди дороги. Плачет. Не говорит, откуда.',
      'Маленькая девочка прячется в развалинах. «Мама не вернулась.»',
    ],
    choices: [
      { label: 'Отвести в безопасное место', action: 'CLOSE', rewardScale: 0.5, penaltyScale: 0.3, addReputation: 25 },
      { label: 'Оставить — ты не нянька', action: 'CLOSE', rewardScale: 0, penaltyScale: 0, addReputation: -20 },
    ],
    weight: 4, baseRewardCredits: 15, basePenaltyHp: 0 },

  // ─── CHILD × MYSTERY ───
  { id: 'tpl_child_mystery', actorType: 'CHILD', situation: 'MYSTERY', terrain: [PLAINS, RUINS, CITY],
    textPool: [
      'Ребёнок смотрит на вас: «Ты ищешь то же, что и они. Но ты идёшь не туда.»',
      'Девочка называет ваше имя, хотя вы не представлялись.',
    ],
    choices: [
      { label: 'Спросить, что она знает', action: 'CLOSE', rewardScale: 0.8, penaltyScale: 0 },
      { label: 'Испугаться и уйти', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    weight: 3, baseRewardCredits: 25, basePenaltyHp: 0 },

  // ─── ELDER × RITUAL ───
  { id: 'tpl_elder_ritual', actorType: 'ELDER', situation: 'RITUAL', terrain: [FOREST, MOUNTAINS, SWAMP],
    textPool: [
      'Старик совершает ритуал у огня. «Присядь. Наблюдай. Учись.»',
      'Пожилая женщина рисует знаки на земле. «Место требует уважения.»',
    ],
    choices: [
      { label: 'Принять участие в ритуале', action: 'CLOSE', rewardScale: 1, penaltyScale: 0, addReputation: 15 },
      { label: 'Наблюдать, не вмешиваясь', action: 'CLOSE', rewardScale: 0.5, penaltyScale: 0 },
      { label: 'Прервать — у вас нет времени', action: 'CLOSE', rewardScale: 0, penaltyScale: 0.4, addReputation: -15 },
    ],
    weight: 4, baseRewardCredits: 30, basePenaltyHp: 0 },

  // ─── ELDER × GIFT ───
  { id: 'tpl_elder_gift', actorType: 'ELDER', situation: 'GIFT', terrain: [FOREST, MOUNTAINS],
    textPool: [
      '«Ты помог земле. Земля помогает тебе.» Старик исчезает, оставив корзину.',
      'Мудрец благодарит вас за выбор, который вы сделали давно.',
    ],
    reqRepMin: 15,
    weight: 3, baseRewardCredits: 55, basePenaltyHp: 0,
    choices: [
      { label: 'Принять дар', action: 'CLOSE', rewardScale: 1.2, penaltyScale: 0, addReputation: 10 },
    ] },

  // ─── KNIGHT × CHASE ───
  { id: 'tpl_knight_chase', actorType: 'KNIGHT', situation: 'CHASE', terrain: [ROAD, PLAINS, OUTPOST],
    textPool: [
      'Рыцарь в потрёпанных доспехах скачет за вами. «Стой! Именем Командора!»',
      'Конный страж преследует. Он быстрее пешего.',
    ],
    choices: [
      { label: 'Остановиться и объясниться', action: 'ROLL_DICE', probability: 0.55, rewardScale: 0.5, penaltyScale: 0.5 },
      { label: 'Бежать', action: 'ROLL_DICE', probability: 0.45, rewardScale: 0, penaltyScale: 1 },
    ],
    weight: 5, baseRewardCredits: 0, basePenaltyHp: 25 },

  // ─── KNIGHT × RESCUE ───
  { id: 'tpl_knight_rescue', actorType: 'KNIGHT', situation: 'RESCUE', terrain: [ROAD, PLAINS, MOUNTAINS],
    textPool: [
      'Рыцарь попал в ловушку — нога зажата камнем. «Помоги... пожалуйста.»',
      'Бывший страж лежит без сознания у дороги. Ещё дышит.',
    ],
    choices: [
      { label: 'Помочь освободиться', action: 'CLOSE', rewardScale: 1.2, penaltyScale: 0, addReputation: 20 },
      { label: 'Обыскать и уйти', action: 'CLOSE', rewardScale: 1, penaltyScale: 0, addReputation: -20 },
      { label: 'Пройти мимо', action: 'CLOSE', rewardScale: 0, penaltyScale: 0, addReputation: -10 },
    ],
    weight: 4, baseRewardCredits: 40, basePenaltyHp: 0 },

  // ─── SPY × MYSTERY ───
  { id: 'tpl_spy_mystery', actorType: 'SPY', situation: 'MYSTERY', terrain: [CITY, OUTPOST, ROAD],
    textPool: [
      'Незнакомец в серой одежде идёт за вами уже долго. Вы уверены — это не случайность.',
      'Записка в кармане, которого вы не трогали. «Следуй за серым флагом.»',
    ],
    choices: [
      { label: 'Обернуться и встретить его', action: 'ROLL_DICE', probability: 0.5, rewardScale: 1, penaltyScale: 0.8 },
      { label: 'Уйти в сторону', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
      { label: 'Оставить ловушку', action: 'ROLL_DICE', probability: 0.55, rewardScale: 1.5, penaltyScale: 0.5 },
    ],
    weight: 5, baseRewardCredits: 35, basePenaltyHp: 15 },

  // ─── SPY × TRADE ───
  { id: 'tpl_spy_trade', actorType: 'SPY', situation: 'TRADE', terrain: [CITY, OUTPOST],
    textPool: [
      'Агент предлагает информацию. «Ничего не бесплатно. Но эта сделка стоит цены.»',
      'Двойной агент хочет встречи. «Я знаю, что ты ищешь.»',
    ],
    choices: [
      { label: 'Купить информацию (50 кредитов)', action: 'CLOSE', rewardScale: 1.3, penaltyScale: 0.5 },
      { label: 'Отказаться', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
      { label: 'Доложить о шпионе Синдикату', action: 'CLOSE', rewardScale: 0.8, penaltyScale: 0, addReputation: -15 },
    ],
    weight: 4, baseRewardCredits: 40, basePenaltyHp: 0 },

  // ─── HERMIT × DISCOVERY ───
  { id: 'tpl_hermit_discovery', actorType: 'HERMIT', situation: 'DISCOVERY', terrain: [MOUNTAINS, FOREST, RUINS],
    textPool: [
      'Отшельник смотрит из-под скалы. «Я знаю это место так, как ты не знаешь свою ладонь.»',
      'Старик-затворник нашёл нечто важное. «Тридцать лет жду того, кто поймёт.»',
    ],
    choices: [
      { label: 'Выслушать его историю', action: 'CLOSE', rewardScale: 1, penaltyScale: 0, addReputation: 10 },
      { label: 'Взять находку и уйти', action: 'CLOSE', rewardScale: 1.5, penaltyScale: 0, addReputation: -15 },
    ],
    weight: 4, baseRewardCredits: 40, basePenaltyHp: 0 },

  // ─── HERMIT × RITUAL ───
  { id: 'tpl_hermit_ritual', actorType: 'HERMIT', situation: 'RITUAL', terrain: [MOUNTAINS, FOREST],
    textPool: [
      'Отшельник совершает ежедневный ритуал — медленно, в полной тишине.',
      'Затворник приглашает: «Раз в год — гость. Сегодня — ты.»',
    ],
    choices: [
      { label: 'Принять участие', action: 'CLOSE', rewardScale: 1.2, penaltyScale: 0, addReputation: 15 },
      { label: 'Наблюдать молча', action: 'CLOSE', rewardScale: 0.7, penaltyScale: 0 },
    ],
    weight: 3, baseRewardCredits: 25, basePenaltyHp: 0 },

  // ─── GHOST × MYSTERY ───
  { id: 'tpl_ghost_mystery', actorType: 'GHOST', situation: 'MYSTERY', terrain: [RUINS, SWAMP, WATER],
    textPool: [
      'Призрак указывает в сторону, не говоря ни слова.',
      'Мерцающий силуэт идёт перед вами, оглядывается — хочет, чтобы следовали.',
      'Голос из ниоткуда называет имя давно умершего человека.',
    ],
    choices: [
      { label: 'Следовать за призраком', action: 'ROLL_DICE', probability: 0.6, rewardScale: 1.5, penaltyScale: 0.5 },
      { label: 'Заговорить с призраком', action: 'CLOSE', rewardScale: 0.8, penaltyScale: 0 },
      { label: 'Игнорировать', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    weight: 4, baseRewardCredits: 35, basePenaltyHp: 10 },

  // ─── GHOST × RITUAL ───
  { id: 'tpl_ghost_ritual', actorType: 'GHOST', situation: 'RITUAL', terrain: [RUINS, SWAMP],
    textPool: [
      'Дух просит упокоения. «Выполни последнюю волю — и я уйду.»',
      'Призрак застрял между мирами. Ему нужен свидетель.',
    ],
    choices: [
      { label: 'Выполнить последнюю волю', action: 'CLOSE', rewardScale: 1, penaltyScale: 0, addReputation: 20 },
      { label: 'Не вмешиваться в дела мёртвых', action: 'CLOSE', rewardScale: 0, penaltyScale: 0.3, addReputation: -5 },
    ],
    weight: 3, baseRewardCredits: 20, basePenaltyHp: 10 },

  // Additional templates to reach 30 total (representative set)
  // ─── BANDIT × TRADE ───
  { id: 'tpl_bandit_trade', actorType: 'BANDIT', situation: 'TRADE', terrain: [ROAD, PLAINS],
    textPool: [ 'Разбойник хочет торговать, а не грабить. «Времена изменились.»' ],
    choices: [
      { label: 'Торговать', action: 'CLOSE', rewardScale: 1, penaltyScale: 0.3 },
      { label: 'Отказаться', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 },
    ],
    weight: 3, baseRewardCredits: 30, basePenaltyHp: 0 },

  // ─── SURVIVOR × RESCUE ───
  { id: 'tpl_survivor_rescue', actorType: 'SURVIVOR', situation: 'RESCUE', terrain: [SWAMP, RUINS, PLAINS],
    textPool: [ 'Человек тонет в болоте. Кричит. Успеть можно.' ],
    choices: [
      { label: 'Спасти (риск)', action: 'ROLL_DICE', probability: 0.7, rewardScale: 1, penaltyScale: 0.5, addReputation: 20 },
      { label: 'Пройти мимо', action: 'CLOSE', rewardScale: 0, penaltyScale: 0, addReputation: -20 },
    ],
    weight: 4, baseRewardCredits: 25, basePenaltyHp: 10 },

  // ─── MERCHANT × DISCOVERY ───
  { id: 'tpl_merchant_discovery', actorType: 'MERCHANT', situation: 'DISCOVERY', terrain: [CITY, MERCHANT_CAMP],
    textPool: [ 'Торговец случайно уронил мешок. Из него выпала старинная карта.' ],
    choices: [
      { label: 'Вернуть карту', action: 'CLOSE', rewardScale: 0.8, penaltyScale: 0, addReputation: 15 },
      { label: 'Оставить карту себе', action: 'CLOSE', rewardScale: 1.5, penaltyScale: 0, addReputation: -10 },
    ],
    weight: 4, baseRewardCredits: 35, basePenaltyHp: 0 },

  // ─── SPIRIT × CHASE ───
  { id: 'tpl_spirit_chase', actorType: 'SPIRIT', situation: 'CHASE', terrain: [FOREST, SWAMP],
    textPool: [ 'Дух преследует вас. Не враждебен, но настойчив. Что-то хочет показать.' ],
    choices: [
      { label: 'Остановиться и посмотреть', action: 'CLOSE', rewardScale: 1.2, penaltyScale: 0 },
      { label: 'Бежать быстрее', action: 'ROLL_DICE', probability: 0.5, rewardScale: 0, penaltyScale: 0.5 },
    ],
    weight: 3, baseRewardCredits: 30, basePenaltyHp: 5 },

  // ─── PILGRIM × TRADE ───
  { id: 'tpl_pilgrim_trade', actorType: 'PILGRIM', situation: 'TRADE', terrain: [ROAD, PLAINS],
    textPool: [ 'Паломник предлагает обменять припасы на молитву и благословение.' ],
    choices: [
      { label: 'Обменять', action: 'CLOSE', rewardScale: 0.8, penaltyScale: 0.3, addReputation: 10 },
      { label: 'Купить просто так', action: 'CLOSE', rewardScale: 1, penaltyScale: 0.4 },
    ],
    weight: 3, baseRewardCredits: 20, basePenaltyHp: 0 },
];
