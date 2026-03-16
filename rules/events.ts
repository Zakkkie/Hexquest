import { OverworldEvent } from '../types.ts';
import { ARC7_EVENTS } from './events/arcs/arc7_void.ts';
import { ARC8_EVENTS } from './events/arcs/arc8_engineer.ts';
import { ARC9_EVENTS } from './events/arcs/arc9_syndicate.ts';
import { ARC10_EVENTS } from './events/arcs/arc10_heartstone.ts';
import { PLAINS_ENCOUNTERS } from './events/encounters/plains.ts';
import { FOREST_ENCOUNTERS } from './events/encounters/forest.ts';
import { MOUNTAIN_ENCOUNTERS } from './events/encounters/mountains.ts';
import { SWAMP_ENCOUNTERS } from './events/encounters/swamp.ts';
import { RUINS_ENCOUNTERS } from './events/encounters/ruins.ts';
import { ROAD_ENCOUNTERS } from './events/encounters/road.ts';
import { WATER_ENCOUNTERS } from './events/encounters/water.ts';
import { CITY_ENCOUNTERS } from './events/encounters/city.ts';
import { OUTPOST_ENCOUNTERS } from './events/encounters/outpost.ts';
import { MERCHANT_ENCOUNTERS } from './events/encounters/merchant.ts';
import { REPUTATION_EVENTS } from './events/reputation.ts';
import { TIMED_EVENTS } from './events/timed.ts';

// ─────────────────────────────────────────────────────────────────────────────
// EVENT REGISTRY
//
// Story Arcs & Flag Chains:
//  Arc 1 – Brotherhood of the Road:  road_helped_pilgrim → road_in_path → road_has_token
//  Arc 2 – The Forest Elder:         forest_met_elder → forest_elder_quest →
//                                    forest_elder_quest_done → forest_elder_grateful
//  Arc 3 – The Cursed Inscription:   ruins_inscription_copied / ruins_curse_active → ruins_vision_seen
//  Arc 4 – Mountain Monastery:       mountain_monastery_found → mountain_monastery_welcomed →
//                                    mountain_monastery_looted
//  Arc 5 – The Exiles:               water_met_exiles → water_exile_ally
//  Arc 6 – The Merchant's Secret:    merchant_purchased_once → merchant_regular →
//                                    merchant_secret_known
// ─────────────────────────────────────────────────────────────────────────────

export const EVENT_REGISTRY: Record<string, OverworldEvent> = {

  // ───────────────────────────── ARC 1: BROTHERHOOD OF THE ROAD ─────────────

  road_pilgrims: {
    id: 'road_pilgrims',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/road_pilgrims/800/350',
        text: 'Посреди дороги вы замечаете небольшой отряд паломников в серых плащах. Их повозку занесло в колею — одно колесо сломано. Пожилая женщина с татуировками Синдиката на запястьях поднимает взгляд. «Не пройдёшь мимо, странник?»',
        choices: [
          {
            label: 'Помочь починить повозку (−5 Энергии)',
            action: 'GOTO_NODE',
            nextNode: 'helped_them',
            reqFlagAbsent: 'road_helped_pilgrim',
          },
          {
            label: '«Снова встретились» — помочь им (они вас узнают)',
            action: 'GOTO_NODE',
            nextNode: 'pilgrim_reunion',
            reqFlag: 'road_helped_pilgrim',
          },
          {
            label: 'Узнать, что впереди на дороге',
            action: 'GOTO_NODE',
            nextNode: 'ask_info',
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      helped_them: {
        id: 'helped_them',
        text: '«Ты добрый человек в злое время,» — говорит женщина, пока вы вставляете колесо. — «Если нужно убежище — назови себя другом Пути в любой таверне. Это откроет двери.» Она вкладывает в вашу ладонь кожаный жетон с изображением дороги.',
        choices: [
          {
            label: 'Взять жетон Братства',
            action: 'CLOSE',
            setFlag: ['road_helped_pilgrim', 'road_in_path'],
            reward: { items: ['silver_ring'], credits: 15 },
            penalty: { energy: 5 },
          },
        ],
      },
      pilgrim_reunion: {
        id: 'pilgrim_reunion',
        text: 'Женщина широко улыбается при виде вас. «Снова ты! Братство помнит своих.» Молодой паломник суёт в ваши руки свёрток с едой и несколько монет. «Дорога впереди опасна. Там рыщут люди Командора Восса — избегай перекрёстков после заката.»',
        choices: [
          {
            label: 'Принять предупреждение',
            action: 'CLOSE',
            reward: { credits: 30, energy: 10 },
          },
        ],
      },
      ask_info: {
        id: 'ask_info',
        text: '«На севере — Разрушители,» — говорит паломник, не поднимая глаз. — «Патрулируют каждый перекрёсток. На востоке — говорят, видели огни в горах. Монастырь ожил после долгих лет.» Он замолкает, будто сказал лишнего.',
        choices: [
          {
            label: 'Поблагодарить и уйти',
            action: 'CLOSE',
          },
          {
            label: 'Помочь им в обмен на жетон',
            action: 'GOTO_NODE',
            nextNode: 'helped_them',
          },
        ],
      },
    },
  },

  road_night_traveler: {
    id: 'road_night_traveler',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/night_traveler/800/350',
        text: 'Туман затягивает дорогу. В белесой мгле вырисовывается фигура: человек в капюшоне тащит телегу без лошади. На ней — накрытые мешковиной предметы странной формы. «Покупай, путник. Товар хороший. Цена — справедливая.»',
        choices: [
          {
            label: 'Купить Карту (30 Кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'buy_map',
            reqCredits: 30,
          },
          {
            label: 'Купить Припасы (20 Кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'buy_supplies_night',
            reqCredits: 20,
          },
          {
            label: 'Показать жетон Братства',
            action: 'GOTO_NODE',
            nextNode: 'token_reaction',
            reqItem: 'PILGRIM_TOKEN',
          },
          {
            label: 'Уйти не оглядываясь',
            action: 'CLOSE',
          },
        ],
      },
      buy_map: {
        id: 'buy_map',
        text: 'Торговец разворачивает потёртый свиток. Карта — точная, подробная, с отметками, которых нет ни на одной официальной схеме. Когда вы поднимаете взгляд — телеги нет. И следов тоже.',
        choices: [
          {
            label: 'Изучить карту',
            action: 'CLOSE',
            reward: { items: ['data_disc'] },
            penalty: { credits: 30 },
          },
        ],
      },
      buy_supplies_night: {
        id: 'buy_supplies_night',
        text: 'Тряпичный свёрток тяжёлый. Внутри — настоящие припасы, в куда лучшем состоянии, чем ожидалось. На дне — записка: «Братство всегда заботится о своих».',
        choices: [
          {
            label: 'Взять',
            action: 'CLOSE',
            reward: { items: ['food_bread', 'food_bread'] },
            penalty: { credits: 20 },
          },
        ],
      },
      token_reaction: {
        id: 'token_reaction',
        text: 'Торговец на долю секунды замирает. Потом медленно кивает. «Значит, своих не предаёшь. Тогда бери — бесплатно. Это нужнее на пути.» Суёт в руки небольшой мешочек и растворяется в тумане.',
        choices: [
          {
            label: 'Взять',
            action: 'CLOSE',
            reward: { credits: 60, items: ['SUPPLIES'] },
          },
        ],
      },
    },
  },

  wounded_courier: {
    id: 'wounded_courier',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/courier_road/800/350',
        text: 'На обочине дороги лежит раненый курьер. Форма Синдиката разодрана, глаза мутные. «Они... они забрали груз. Но письмо... письмо важнее... Доставь его в Аванпост. Пожалуйста.»',
        choices: [
          {
            label: 'Взять письмо и пообещать доставить',
            action: 'GOTO_NODE',
            nextNode: 'take_letter',
          },
          {
            label: 'Помочь ему (дать SUPPLIES)',
            action: 'GOTO_NODE',
            nextNode: 'help_with_supplies',
            reqItem: 'SUPPLIES',
          },
          {
            label: 'Оставить его и уйти',
            action: 'CLOSE',
          },
        ],
      },
      take_letter: {
        id: 'take_letter',
        text: 'Курьер вкладывает в вашу руку запечатанный конверт с гербом Синдиката. «Скажи им... скажи, что Марко выполнил... обещание...» Он теряет сознание. Вы кладёте его в тень и продолжаете путь.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            reward: { items: ['book_ancient'] },
          },
        ],
      },
      help_with_supplies: {
        id: 'help_with_supplies',
        text: 'Вы даёте курьеру воды и перевязываете рану. Он приходит в себя немного. «Спасибо... возьми письмо. И это — тоже. За добро.» Он суёт вам ещё один конверт, неподписанный. «Это моё. На случай, если Восс у власти. Но ты поймёшь, когда время.»',
        choices: [
          {
            label: 'Взять оба конверта',
            action: 'CLOSE',
            reward: { items: ['book_ancient', 'ruby_ring'] },
            penalty: { items: ['SUPPLIES'] },
          },
        ],
      },
    },
  },

  // ───────────────────────────── ARC 2: THE FOREST ELDER ────────────────────

  forest_elder_encounter: {
    id: 'forest_elder_encounter',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_elder/800/350',
        text: 'Среди вековых деревьев вы замечаете маленькое святилище — сложенное из камней, увитое мхом. Рядом сидит старик с закрытыми глазами. Не открывая их, он говорит: «Лес привёл тебя. Это неспроста.»',
        choices: [
          {
            label: 'Спросить о том, что впереди',
            action: 'GOTO_NODE',
            nextNode: 'elder_prophecy',
            setFlag: 'forest_met_elder',
          },
          {
            label: 'Попросить помощи — вы ранены',
            action: 'GOTO_NODE',
            nextNode: 'elder_heal',
            setFlag: 'forest_met_elder',
          },
          {
            label: 'Уйти молча',
            action: 'CLOSE',
          },
        ],
      },
      elder_prophecy: {
        id: 'elder_prophecy',
        image: 'https://picsum.photos/seed/forest_shrine/800/350',
        text: '«Впереди — разрушенный Говор. Там спит что-то древнее. Оно не злое... но голодное.» Старик наконец открывает глаза — серые, как зимнее небо. «Если услышишь шёпот — не отвечай.» Он суёт вам пучок трав.',
        choices: [
          {
            label: 'Взять травы и поблагодарить',
            action: 'CLOSE',
            reward: { hp: 15, items: ['food_banana'] },
          },
        ],
      },
      elder_heal: {
        id: 'elder_heal',
        text: 'Старик не говорит ни слова. Просто достаёт засохший пучок трав и растирает их между ладонями. Тепло расходится по вашим ранам быстрее, чем должно. «Возвращайся, если понадоблюсь,» — говорит он тихо.',
        choices: [
          {
            label: 'Поблагодарить',
            action: 'CLOSE',
            reward: { hp: 35 },
          },
        ],
      },
    },
  },

  forest_elder_revisit: {
    id: 'forest_elder_revisit',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_ruins_shrine/800/350',
        text: 'Святилище разорено. Камни сдвинуты, свитки разбросаны. Старик сидит среди обломков, и его руки дрожат. «Ночью пришли люди Командора. Забрали карту. Без неё... я не найду Сердечный Камень. Умру, не найдя.»',
        choices: [
          {
            label: 'Пообещать найти и вернуть карту',
            action: 'GOTO_NODE',
            nextNode: 'promise_map',
          },
          {
            label: 'Отдать Припасы',
            action: 'GOTO_NODE',
            nextNode: 'gave_supplies',
            reqItem: 'SUPPLIES',
          },
          {
            label: 'Посочувствовать и уйти',
            action: 'CLOSE',
          },
        ],
      },
      promise_map: {
        id: 'promise_map',
        text: 'Старик поднимает взгляд. «В лесу к востоку — лагерь бандитов. Они носят знаки Синдиката, но давно предались собственной алчности. Карта у их старшего. Возвращайся.»',
        choices: [
          {
            label: 'Пообещать вернуться с картой',
            action: 'CLOSE',
            setFlag: 'forest_elder_quest',
            reward: { items: ['ELDER_HERB'] },
          },
        ],
      },
      gave_supplies: {
        id: 'gave_supplies',
        text: 'Старик смотрит на припасы долго. Потом бережно принимает. «Я не могу отплатить деньгами. Но возьми это.» Снимает с шеи кожаный шнурок с небольшим камнем. «Монахи в горах узнают этот знак. Он откроет тебе дверь.»',
        choices: [
          {
            label: 'Взять знак монастыря',
            action: 'CLOSE',
            setFlag: 'forest_elder_helped',
            reward: { items: ['emerald_necklace'] },
            penalty: { items: ['SUPPLIES'] },
          },
        ],
      },
    },
  },

  forest_bandit_camp: {
    id: 'forest_bandit_camp',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/bandit_camp/800/350',
        text: 'В глубине леса — костёр и разложенная добыча. Трое бандитов в потрёпанной форме Синдиката режутся в карты. На одном из ящиков — свёрнутый в трубку свиток. Наверняка карта старца.',
        choices: [
          {
            label: 'Прокрасться и схватить карту (Шанс 70%)',
            action: 'ROLL_DICE',
            probability: 0.7,
            successNode: 'sneak_success',
            failNode: 'sneak_fail',
          },
          {
            label: 'Напасть открыто (Шанс 40%)',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'fight_success',
            failNode: 'fight_fail',
          },
          {
            label: 'Уйти и не рисковать',
            action: 'CLOSE',
          },
        ],
      },
      sneak_success: {
        id: 'sneak_success',
        text: 'Пока один из бандитов отошёл за кустами, а остальные заспорили о ставке, вы подкрадываетесь к ящику. Свиток — в ваших руках. Отходите бесшумно, почти не дыша.',
        choices: [
          {
            label: 'Скрыться с картой',
            action: 'CLOSE',
            setFlag: 'forest_elder_quest_done',
            reward: { items: ['data_disc'] },
          },
        ],
      },
      sneak_fail: {
        id: 'sneak_fail',
        text: 'Ветка под ногой хрустит в самый неудачный момент. Бандиты вскакивают. Вам удаётся сбежать — но без карты и с синяком под глазом.',
        choices: [
          {
            label: 'Убраться',
            action: 'CLOSE',
            penalty: { hp: 15 },
          },
        ],
      },
      fight_success: {
        id: 'fight_success',
        text: 'Бой жёсткий, но короткий. Двое бегут, третий сдаётся. Вы находите карту, немного денег и ещё кое-что полезное среди их вещей.',
        choices: [
          {
            label: 'Забрать добычу',
            action: 'CLOSE',
            setFlag: 'forest_elder_quest_done',
            reward: { items: ['data_disc', 'iron_plate'], credits: 40 },
          },
        ],
      },
      fight_fail: {
        id: 'fight_fail',
        text: 'Их оказалось больше, чем казалось — четвёртый выходит из тени. Вы едва вырываетесь с разбитыми руками, потеряв немного снаряжения.',
        choices: [
          {
            label: 'Отступить',
            action: 'CLOSE',
            penalty: { hp: 30, credits: 20 },
          },
        ],
      },
    },
  },

  forest_elder_reward: {
    id: 'forest_elder_reward',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/elder_reward/800/350',
        text: 'Старик смотрит на карту в ваших руках. Долгая пауза. Потом он встаёт — медленно, как человек, несущий груз лет. «Ты сделал это. Я думал, что умру, не дождавшись.» Берёт карту и сразу же протягивает её обратно. «Нет. Возьми. Ты молодой. Сердечный Камень нужен живым.»',
        choices: [
          {
            label: 'Принять карту к Сердечному Камню',
            action: 'CLOSE',
            setFlag: 'forest_elder_grateful',
            reward: { items: ['data_disc'], credits: 80, hp: 30 },
            penalty: { items: ['data_disc'] },
          },
        ],
      },
    },
  },

  forest_ambush: {
    id: 'forest_ambush',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/forest_wolves/800/350',
        text: 'Пробираясь через густой лес, вы слышите хруст веток. Из-за деревьев появляются мутировавшие волки — трое, с горящими глазами. Их вожак скалит зубы.',
        choices: [
          {
            label: 'Сражаться (Шанс 50%)',
            action: 'ROLL_DICE',
            successNode: 'fight_success',
            failNode: 'fight_fail',
          },
          {
            label: 'Убежать (−10 Энергии)',
            action: 'GOTO_NODE',
            nextNode: 'run_away',
          },
          {
            label: 'Предложить Припасы (отвлечь)',
            action: 'GOTO_NODE',
            nextNode: 'distract',
            reqItem: 'SUPPLIES',
          },
        ],
      },
      fight_success: {
        id: 'fight_success',
        text: 'Вы отбиваетесь от стаи. Среди их добычи — чьи-то вещи и немного кредитов.',
        choices: [
          { label: 'Продолжить путь', action: 'CLOSE', reward: { credits: 30 } },
        ],
      },
      fight_fail: {
        id: 'fight_fail',
        text: 'Волки оказались слишком сильны. Вы получаете ранения, прежде чем удаётся спастись.',
        choices: [
          { label: 'Зализать раны', action: 'CLOSE', penalty: { hp: 20 } },
        ],
      },
      run_away: {
        id: 'run_away',
        text: 'Вы бросаетесь наутёк, тратя последние силы, но остаётесь целы.',
        choices: [
          { label: 'Перевести дух', action: 'CLOSE', penalty: { energy: 10 } },
        ],
      },
      distract: {
        id: 'distract',
        text: 'Вы бросаете припасы в сторону. Волки набрасываются на еду, и вы спокойно проходите мимо.',
        choices: [
          {
            label: 'Уйти пока есть возможность',
            action: 'CLOSE',
            penalty: { items: ['SUPPLIES'] },
          },
        ],
      },
    },
  },

  // ─────────────────────────── ARC 3: THE CURSED INSCRIPTION ───────────────

  ruins_inscription: {
    id: 'ruins_inscription',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_obelisk/800/350',
        text: 'Среди руин стоит обелиск — целый, не тронутый временем. Буквы на нём горят едва заметным светом — не огнём, скорее памятью о свете. Вы чувствуете, что стоите у чего-то важного.',
        choices: [
          {
            label: 'Изучить и скопировать надпись (Шанс 60%)',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'copy_success',
            failNode: 'copy_fail',
          },
          {
            label: 'Коснуться центрального знака (Шанс 50%)',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'touch_vision',
            failNode: 'touch_reject',
          },
          {
            label: 'Сфотографировать и уйти',
            action: 'CLOSE',
            reward: { credits: 20 },
          },
        ],
      },
      copy_success: {
        id: 'copy_success',
        image: 'https://picsum.photos/seed/rune_scroll/800/350',
        text: 'Часть языка вдруг складывается в понятное. Вы торопливо переносите символы на ткань. Среди прочего — описание чего-то, что существовало до Каскада. «Они строили города из света,» — гласит фрагмент. Знание жжёт изнутри.',
        choices: [
          {
            label: 'Сохранить копию',
            action: 'CLOSE',
            setFlag: 'ruins_inscription_copied',
            reward: { items: ['artifact_crystal'], credits: 30 },
          },
        ],
      },
      copy_fail: {
        id: 'copy_fail',
        text: 'В момент, когда вы почти расшифровали третью строку, что-то из обелиска вырывается наружу. Будто кто-то оттолкнул вас от двери изнутри. Голова раскалывается.',
        choices: [
          {
            label: 'Встать и уйти',
            action: 'CLOSE',
            setFlag: 'ruins_curse_active',
            penalty: { hp: 20 },
          },
        ],
      },
      touch_vision: {
        id: 'touch_vision',
        image: 'https://picsum.photos/seed/ancient_city_vision/800/350',
        text: 'Вы видите: город, высокий, из стекла и металла, живой. Люди смеются. Потом — вспышка. Тишина. Прах. Обелиск отпускает вас. Вы стоите на дрожащих ногах, но чувствуете что-то похожее на понимание.',
        choices: [
          {
            label: 'Осмыслить увиденное',
            action: 'CLOSE',
            setFlag: 'ruins_vision_seen',
            reward: { energy: 20, hp: 10 },
          },
        ],
      },
      touch_reject: {
        id: 'touch_reject',
        text: 'Знак будто обжигает ладонь холодом. Вас отбрасывает назад. Когда вы поднимаетесь — на ладони нет ожога, но рука не слушается несколько минут.',
        choices: [
          {
            label: 'Отступить',
            action: 'CLOSE',
            penalty: { hp: 15 },
          },
        ],
      },
    },
  },

  ruins_nightmare: {
    id: 'ruins_nightmare',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_nightmare/800/350',
        text: 'Среди руин вам становится нехорошо. Другой обелиск — обломки, но кое-где знаки сохранились. И они шевелятся. «Ты прочитал — теперь слушай,» — шепчет воздух.',
        choices: [
          {
            label: 'Сопротивляться шёпоту (Шанс 50%)',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'resist_success',
            failNode: 'resist_fail',
          },
          {
            label: 'Принять видение',
            action: 'GOTO_NODE',
            nextNode: 'accept_vision',
          },
          {
            label: 'Использовать знания табличек',
            action: 'GOTO_NODE',
            nextNode: 'use_tablet',
            reqItem: 'artifact_crystal',
          },
        ],
      },
      resist_success: {
        id: 'resist_success',
        text: 'Вам удаётся отвести взгляд и выйти из руин. Шёпот стихает. Голова гудит, но вы в порядке.',
        choices: [
          { label: 'Уйти', action: 'CLOSE' },
        ],
      },
      resist_fail: {
        id: 'resist_fail',
        text: 'Голоса слишком настойчивы. Вы приходите в себя снаружи, не помня, как вышли. Что-то изменилось — как будто часть вас осталась там.',
        choices: [
          {
            label: 'Попытаться вспомнить',
            action: 'CLOSE',
            penalty: { hp: 25, energy: 10 },
          },
        ],
      },
      accept_vision: {
        id: 'accept_vision',
        image: 'https://picsum.photos/seed/ruins_map_vision/800/350',
        text: 'Вы видите карту — с живыми линиями. Три места отмечены чем-то похожим на обещание. Когда видение гаснет — вы знаете, где искать.',
        choices: [
          {
            label: 'Запомнить',
            action: 'CLOSE',
            setFlag: 'ruins_vision_seen',
            clearFlag: 'ruins_curse_active',
            reward: { credits: 40 },
          },
        ],
      },
      use_tablet: {
        id: 'use_tablet',
        text: 'Символы из таблички совпадают с теми, что шепчут в голове. Вы произносите их вслух — голоса замолкают. Обелиск перед вами гаснет. Проклятие снято.',
        choices: [
          {
            label: 'Выдохнуть',
            action: 'CLOSE',
            clearFlag: 'ruins_curse_active',
            reward: { hp: 20 },
          },
        ],
      },
    },
  },

  ruins_echo: {
    id: 'ruins_echo',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ruins_echo/800/350',
        text: 'Другие руины. Другой обелиск — обломки, но кое-где знаки сохранились. Теперь вы их узнаёте. Это как встретить старого знакомого в незнакомом городе. Часть надписи — новая.',
        choices: [
          {
            label: 'Прочитать новый фрагмент',
            action: 'GOTO_NODE',
            nextNode: 'new_fragment',
          },
          {
            label: 'Сравнить с уже известным',
            action: 'GOTO_NODE',
            nextNode: 'compare_fragments',
          },
          {
            label: 'Забрать осколок',
            action: 'CLOSE',
            reward: { items: ['iron_plate'], credits: 20 },
          },
        ],
      },
      new_fragment: {
        id: 'new_fragment',
        text: '«...и те, кто возведёт Сердечный Камень обратно, получат право назвать себя Архитекторами Нового.» Слова оседают в вас, как тяжёлый груз. Или как обещание.',
        choices: [
          {
            label: 'Записать',
            action: 'CLOSE',
            reward: { credits: 35 },
          },
        ],
      },
      compare_fragments: {
        id: 'compare_fragments',
        text: 'Картина становится чуть яснее — это не просто язык. Это архитектурные схемы. Города строились по определённым принципам, которые... кажется, можно применить и сейчас.',
        choices: [
          {
            label: 'Использовать знание',
            action: 'CLOSE',
            reward: { credits: 50, energy: 10 },
          },
        ],
      },
    },
  },

  ancient_ruins: {
    id: 'ancient_ruins',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/ancient_ruins/800/350',
        text: 'Перед вами возвышаются руины эпохи до Каскада Энтропии. Воздух здесь гудит от остаточной энергии. Из обломков торчат конструкции непонятного назначения.',
        choices: [
          {
            label: 'Исследовать руины (Шанс 50%)',
            action: 'ROLL_DICE',
            successNode: 'ruins_success',
            failNode: 'ruins_fail',
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      ruins_success: {
        id: 'ruins_success',
        text: 'Среди обломков вы находите древний артефакт и странный ключ.',
        choices: [
          { label: 'Забрать', action: 'CLOSE', reward: { items: ['ANCIENT_KEY', 'SCRAP'] } },
        ],
      },
      ruins_fail: {
        id: 'ruins_fail',
        text: 'Срабатывает древняя ловушка! Вы едва успеваете увернуться от лазерного луча.',
        choices: [
          { label: 'Уйти', action: 'CLOSE', penalty: { hp: 10 } },
        ],
      },
    },
  },

  hidden_cache: {
    id: 'hidden_cache',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/hidden_vault/800/350',
        text: 'Вы натыкаетесь на скрытый бункер. Массивная дверь заперта, но есть скважина для необычного ключа.',
        choices: [
          {
            label: 'Использовать Древний Ключ',
            reqItem: 'ancient_relic',
            action: 'GOTO_NODE',
            nextNode: 'open_cache',
          },
          {
            label: 'Попытаться взломать (Шанс 20%)',
            action: 'ROLL_DICE',
            probability: 0.2,
            successNode: 'hack_success',
            failNode: 'hack_fail',
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
      open_cache: {
        id: 'open_cache',
        text: 'Ключ идеально подходит. Внутри — редкое снаряжение и кредиты!',
        choices: [
          {
            label: 'Забрать добычу',
            action: 'CLOSE',
            reward: { credits: 200, items: ['ablative_armor'] },
            penalty: { items: ['ANCIENT_KEY'] },
          },
        ],
      },
      hack_success: {
        id: 'hack_success',
        text: 'Вам чудом удаётся обойти систему безопасности.',
        choices: [
          {
            label: 'Забрать добычу',
            action: 'CLOSE',
            reward: { credits: 200, items: ['ablative_armor'] },
          },
        ],
      },
      hack_fail: {
        id: 'hack_fail',
        text: 'Система безопасности активируется! Вас бьёт током.',
        choices: [
          { label: 'Отступить', action: 'CLOSE', penalty: { hp: 30 } },
        ],
      },
    },
  },

  // ─────────────────────────── ARC 4: MOUNTAIN MONASTERY ───────────────────

  mountain_monastery: {
    id: 'mountain_monastery',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountain_monastery/800/350',
        text: 'Среди скал вырисовывается силуэт крепости. Высокие стены, башни. С надвратной башни смотрит монах в белом. После долгой паузы голос спускается вниз: «Путник. Назови цель или уйди в мире.»',
        choices: [
          {
            label: 'Предъявить знак Старца леса',
            action: 'GOTO_NODE',
            nextNode: 'show_sign',
            reqItem: 'MONASTERY_SIGN',
          },
          {
            label: '«Ищу знания»',
            action: 'GOTO_NODE',
            nextNode: 'ask_knowledge',
            reqFlagAbsent: 'mountain_monastery_found',
            setFlag: 'mountain_monastery_found',
          },
          {
            label: 'Войти — вас здесь уже ждут',
            action: 'GOTO_NODE',
            nextNode: 'return_visit',
            reqFlag: 'mountain_monastery_welcomed',
          },
          {
            label: 'Попытаться войти силой',
            action: 'GOTO_NODE',
            nextNode: 'force_entry',
            reqFlagAbsent: 'mountain_monastery_banned',
          },
          {
            label: 'Уйти с миром',
            action: 'CLOSE',
            setFlag: 'mountain_monastery_found',
          },
        ],
      },
      ask_knowledge: {
        id: 'ask_knowledge',
        text: 'Монах долго молчит. «Знания даются тем, кто не берёт силой.» Пауза. «Мы видели тебя в снах. Вернись, когда руки не запятнаны жадностью.» Врата закрываются.',
        choices: [
          { label: 'Уйти', action: 'CLOSE' },
        ],
      },
      show_sign: {
        id: 'show_sign',
        image: 'https://picsum.photos/seed/monastery_gate/800/350',
        text: 'Монах видит знак и что-то меняется в его лице. «Старец... он жив ещё? Заходи, странник. Любой, кто помог хранителю — наш гость.» Врата открываются.',
        choices: [
          {
            label: 'Войти',
            action: 'GOTO_NODE',
            nextNode: 'monastery_interior',
            setFlag: 'mountain_monastery_welcomed',
            penalty: { items: ['MONASTERY_SIGN'] },
          },
        ],
      },
      return_visit: {
        id: 'return_visit',
        text: 'Врата открываются, едва вы появляетесь на дороге. «Возвращайся, странник. Мы ждали.» Монахи кланяются.',
        choices: [
          {
            label: 'Войти',
            action: 'GOTO_NODE',
            nextNode: 'monastery_interior',
          },
        ],
      },
      force_entry: {
        id: 'force_entry',
        text: 'Не успеваете шагнуть — что-то невидимое толкает вас назад. Вы падаете. Монах сверху смотрит без злобы. «Уходи. В следующий раз врата не просто закроются.»',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            setFlag: 'mountain_monastery_banned',
            penalty: { hp: 20 },
          },
        ],
      },
      monastery_interior: {
        id: 'monastery_interior',
        image: 'https://picsum.photos/seed/monastery_interior/800/350',
        text: 'Внутри — тишина и свет. Старший монах встречает вас в центральном дворе. «Ты можешь выбрать один дар. Только один — так завещано.»',
        choices: [
          {
            label: 'Исцеляющий источник',
            action: 'GOTO_NODE',
            nextNode: 'gift_healing',
          },
          {
            label: 'Древняя книга',
            action: 'GOTO_NODE',
            nextNode: 'gift_knowledge',
          },
          {
            label: 'Свиток с картой тайника',
            action: 'GOTO_NODE',
            nextNode: 'gift_map',
          },
        ],
      },
      gift_healing: {
        id: 'gift_healing',
        text: 'Вас ведут к небольшому роднику в камне. Вода — ледяная, но боль уходит с первого же глотка. Вы выходите обновлённым.',
        choices: [
          {
            label: 'Поблагодарить монахов',
            action: 'CLOSE',
            setFlag: 'mountain_monastery_looted',
            reward: { hp: 100, energy: 50 },
          },
        ],
      },
      gift_knowledge: {
        id: 'gift_knowledge',
        text: 'Книга написана на смеси трёх языков. Вы понимаете не всё, но главное — понимаете. О структурах мира, о том, как строить так, чтобы стояло вечно.',
        choices: [
          {
            label: 'Принять',
            action: 'CLOSE',
            setFlag: 'mountain_monastery_looted',
            reward: { items: ['MONASTERY_SCROLL'], credits: 50 },
          },
        ],
      },
      gift_map: {
        id: 'gift_map',
        text: 'Свиток с пометками точными, нанесёнными твёрдой рукой. На нём отмечен схрон, где монахи хранили припасы для паломников в тяжёлые времена.',
        choices: [
          {
            label: 'Принять',
            action: 'CLOSE',
            setFlag: 'mountain_monastery_looted',
            reward: { credits: 100, items: ['SUPPLIES', 'SUPPLIES'] },
          },
        ],
      },
    },
  },

  mountain_hermit: {
    id: 'mountain_hermit',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/mountain_hermit/800/350',
        text: 'На уступе скалы — небольшая пещера. У входа сидит человек с длинной спутанной бородой и смотрит на горизонт. «Пришёл за советом или за грибами? Грибов у меня больше.»',
        choices: [
          {
            label: 'За советом',
            action: 'GOTO_NODE',
            nextNode: 'ask_hermit',
          },
          {
            label: 'Обменять Металлолом на грибы',
            action: 'GOTO_NODE',
            nextNode: 'trade_mushrooms',
            reqItem: 'SCRAP',
          },
          {
            label: 'Рассказать о видении',
            action: 'GOTO_NODE',
            nextNode: 'shared_vision',
            reqFlag: 'ruins_vision_seen',
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
      ask_hermit: {
        id: 'ask_hermit',
        text: '«Монастырь? — усмехается он. — Они хорошие люди, просто напуганные. Покажи им, что ты не хищник, и откроют дверь.» Пауза. «Или найди знак хранителя. Старик у леса — он знает.»',
        choices: [
          {
            label: 'Поблагодарить',
            action: 'CLOSE',
            reward: { energy: 10 },
          },
        ],
      },
      trade_mushrooms: {
        id: 'trade_mushrooms',
        text: 'Он смотрит на металлолом с неожиданным интересом. «О. Мне нужен нарост из металла для одного дела.» Уходит в пещеру. Возвращается с охапкой тёмных грибов. «Жуй медленно. И не ложись спать сразу.»',
        choices: [
          {
            label: 'Взять грибы',
            action: 'CLOSE',
            reward: { hp: 35, energy: 20 },
            penalty: { items: ['SCRAP'] },
          },
        ],
      },
      shared_vision: {
        id: 'shared_vision',
        image: 'https://picsum.photos/seed/hermit_vision/800/350',
        text: 'Отшельник поворачивается. Впервые смотрит прямо. «И ты видел? Город из стекла?» Долгое молчание. «Я думал, это только у меня. Двадцать лет думал.» Берёт вашу руку. «Слушай: это не прошлое. Это возможное будущее.»',
        choices: [
          {
            label: 'Слушать его рассказ',
            action: 'CLOSE',
            reward: { energy: 30, credits: 20 },
          },
        ],
      },
    },
  },

  mountain_avalanche: {
    id: 'mountain_avalanche',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/avalanche_mountain/800/350',
        text: 'Земля дрожит. Снежная лавина срывается с вершины горы прямо на вас!',
        choices: [
          {
            label: 'Спрятаться за скалой (Шанс 70%)',
            action: 'ROLL_DICE',
            probability: 0.7,
            successNode: 'hide_success',
            failNode: 'hide_fail',
          },
          {
            label: 'Использовать Припасы для укрытия',
            reqItem: 'SUPPLIES',
            action: 'GOTO_NODE',
            nextNode: 'use_supplies',
          },
        ],
      },
      hide_success: {
        id: 'hide_success',
        text: 'Вы успеваете укрыться за выступом. Лавина проходит мимо.',
        choices: [
          { label: 'Продолжить подъём', action: 'CLOSE' },
        ],
      },
      hide_fail: {
        id: 'hide_fail',
        text: 'Вас задевает краем лавины. Вы теряете часть снаряжения и получаете ушибы.',
        choices: [
          { label: 'Выбраться из снега', action: 'CLOSE', penalty: { hp: 15 } },
        ],
      },
      use_supplies: {
        id: 'use_supplies',
        text: 'Вы сооружаете надёжное укрытие из своих припасов и благополучно пережидаете стихию.',
        choices: [
          {
            label: 'Продолжить путь',
            action: 'CLOSE',
            penalty: { items: ['SUPPLIES'] },
          },
        ],
      },
    },
  },

  // ─────────────────────────────── SWAMP EVENTS ────────────────────────────

  swamp_fisherman: {
    id: 'swamp_fisherman',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_fisher/800/350',
        text: 'На краю болота рыбачит человек. Точнее — сидит с удочкой и дремлет. Открывает один глаз. «Ничего не клюёт уже три дня. Зато думать хорошо.» Он смотрит на вас. «Ты не местный.»',
        choices: [
          {
            label: 'Поговорить о болоте',
            action: 'GOTO_NODE',
            nextNode: 'swamp_talk',
          },
          {
            label: 'Купить травы (20 Кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'buy_herbs',
            reqCredits: 20,
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
      swamp_talk: {
        id: 'swamp_talk',
        text: '«В этом болоте раньше было озеро — чистое. Потом Каскад. Теперь — это.» Машет рукой. «На дне до сих пор стоит старый форпост. Я нырял однажды. Не советую.» Пауза. «Но там правда кое-что есть.»',
        choices: [
          {
            label: 'Нырнуть (Шанс 50%)',
            action: 'ROLL_DICE',
            probability: 0.5,
            successNode: 'dive_success',
            failNode: 'dive_fail',
          },
          {
            label: 'Не рисковать',
            action: 'CLOSE',
          },
        ],
      },
      buy_herbs: {
        id: 'buy_herbs',
        text: 'Рыбы в ведре нет. Зато есть корни и странные травы. «Болотный лук. Не вкусно, но сытно и лечит.» Пожимает плечами.',
        choices: [
          {
            label: 'Купить',
            action: 'CLOSE',
            reward: { hp: 25, energy: 15 },
            penalty: { credits: 20 },
          },
        ],
      },
      dive_success: {
        id: 'dive_success',
        text: 'Вода холодная и мутная, но в глубине — ящик, покрытый илом. Вы поднимаете его и обнаруживаете старое снаряжение. Рыбак присвистывает. «Надо же. Три года не пытался.»',
        choices: [
          {
            label: 'Взять содержимое',
            action: 'CLOSE',
            reward: { items: ['SCRAP', 'SCRAP'], credits: 30 },
          },
        ],
      },
      dive_fail: {
        id: 'dive_fail',
        text: 'Что-то хватает вас за ногу под водой. Вы вырываетесь — ценой вывихнутого плеча. Рыбак кивает. «Я ведь предупреждал.»',
        choices: [
          {
            label: 'Выбраться на берег',
            action: 'CLOSE',
            penalty: { hp: 20 },
          },
        ],
      },
    },
  },

  swamp_ruins: {
    id: 'swamp_ruins',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_wreck/800/350',
        text: 'В мутной воде болота вы замечаете полузатопленный остов старого транспорта. Что-то поблёскивает внутри.',
        choices: [
          {
            label: 'Обыскать транспорт (Шанс 40%)',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'search_success',
            failNode: 'search_fail',
          },
          {
            label: 'Не рисковать',
            action: 'CLOSE',
          },
        ],
      },
      search_success: {
        id: 'search_success',
        text: 'Внутри вы находите герметичный контейнер с ценными деталями!',
        choices: [
          { label: 'Забрать', action: 'CLOSE', reward: { items: ['SCRAP', 'SCRAP'] } },
        ],
      },
      search_fail: {
        id: 'search_fail',
        text: 'Транспорт оказывается гнездом болотных пиявок. Они присасываются к вам!',
        choices: [
          {
            label: 'Отбиться',
            action: 'CLOSE',
            penalty: { energy: 15, hp: 5 },
          },
        ],
      },
    },
  },

  swamp_ambush: {
    id: 'swamp_ambush',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/swamp_monster/800/350',
        text: 'Из трясины поднимается ржавый Разрушитель. Его визоры горят красным. Он был там давно — может, с самого Каскада.',
        choices: [
          {
            label: 'Сразиться (Рифт)',
            action: 'START_BATTLE',
            riftId: '1.1',
          },
          {
            label: 'Сбежать (Шанс 50%)',
            action: 'ROLL_DICE',
            successNode: 'escape_success',
            failNode: 'escape_fail',
          },
          {
            label: 'Использовать ЭМИ-гранату',
            reqItem: 'EMP_GRENADE',
            action: 'AUTO_WIN',
            nextNode: 'emp_success',
            reward: { credits: 100 },
          },
        ],
      },
      escape_success: {
        id: 'escape_success',
        text: 'Вам удалось скрыться в тумане, оставив монстра позади.',
        choices: [
          { label: 'Уйти', action: 'CLOSE' },
        ],
      },
      escape_fail: {
        id: 'escape_fail',
        text: 'Монстр настигает вас! Вы получаете урон, но успеваете вырваться.',
        choices: [
          { label: 'Уйти', action: 'CLOSE', penalty: { hp: 20 } },
        ],
      },
      emp_success: {
        id: 'emp_success',
        text: 'ЭМИ-граната отключает Разрушителя. Вы разбираете его на запчасти.',
        choices: [
          { label: 'Собрать лут', action: 'CLOSE', reward: { items: ['SCRAP'] } },
        ],
      },
    },
  },

  // ─────────────────────────────── PLAINS EVENTS ───────────────────────────

  plains_caravan: {
    id: 'plains_caravan',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_caravan/800/350',
        text: 'На равнине вы встречаете разбитый торговый обоз. Один из торговцев просит помощи с повреждённой осью.',
        choices: [
          {
            label: 'Помочь починить (Требует Металлолом)',
            reqItem: 'SCRAP',
            action: 'GOTO_NODE',
            nextNode: 'help_caravan',
          },
          {
            label: 'Ограбить их (Шанс 80%)',
            action: 'ROLL_DICE',
            probability: 0.8,
            successNode: 'rob_success',
            failNode: 'rob_fail',
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      help_caravan: {
        id: 'help_caravan',
        text: 'Вы чините ось. В благодарность торговцы щедро платят.',
        choices: [
          {
            label: 'Принять награду',
            action: 'CLOSE',
            reward: { credits: 80 },
            penalty: { items: ['SCRAP'] },
          },
        ],
      },
      rob_success: {
        id: 'rob_success',
        text: 'Вы забираете их припасы, пока охрана смотрит в другую сторону.',
        choices: [
          {
            label: 'Уйти',
            action: 'CLOSE',
            reward: { items: ['SUPPLIES'] },
          },
        ],
      },
      rob_fail: {
        id: 'rob_fail',
        text: 'У них была скрытая охрана! Вас избивают и прогоняют.',
        choices: [
          { label: 'Уползти', action: 'CLOSE', penalty: { hp: 25 } },
        ],
      },
    },
  },

  plains_battlefield: {
    id: 'plains_battlefield',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/plains_battle/800/350',
        text: 'На равнине — следы давнего сражения. Оплавленный металл, остатки техники, кратеры. Вороны. На ветру развевается клочок ткани — цвета Синдиката. Следы ещё свежие.',
        choices: [
          {
            label: 'Обыскать поле боя (Шанс 60%)',
            action: 'ROLL_DICE',
            probability: 0.6,
            successNode: 'search_success',
            failNode: 'search_fail',
          },
          {
            label: 'Пойти по следам (Шанс 40%)',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'track_success',
            failNode: 'track_fail',
          },
          {
            label: 'Уйти',
            action: 'CLOSE',
          },
        ],
      },
      search_success: {
        id: 'search_success',
        text: 'Под обломком машины — запечатанный контейнер Синдиката. Внутри — ценный груз, который они не успели вывезти.',
        choices: [
          {
            label: 'Взять содержимое',
            action: 'CLOSE',
            reward: { credits: 50, items: ['SCRAP', 'SUPPLIES'] },
          },
        ],
      },
      search_fail: {
        id: 'search_fail',
        text: 'Земля под ногами нестабильная. Кратер оседает, вы проваливаетесь по колено. Выбираетесь с повреждённой ногой.',
        choices: [
          { label: 'Выбраться', action: 'CLOSE', penalty: { hp: 20 } },
        ],
      },
      track_success: {
        id: 'track_success',
        text: 'Следы ведут к наспех закопанному схрону. Внутри — снаряжение беглецов.',
        choices: [
          {
            label: 'Забрать вещи',
            action: 'CLOSE',
            reward: { credits: 40, items: ['SUPPLIES', 'SCRAP'] },
          },
        ],
      },
      track_fail: {
        id: 'track_fail',
        text: 'Следы заводят в засаду. Двое дезертиров требуют отдать ценное. Вам удаётся прорваться, но не без потерь.',
        choices: [
          {
            label: 'Вырваться',
            action: 'CLOSE',
            penalty: { hp: 25, credits: 20 },
          },
        ],
      },
    },
  },

  // ─────────────────────────── ARC 5: THE EXILES (WATER) ───────────────────

  water_strange_vessel: {
    id: 'water_strange_vessel',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/water_raft/800/350',
        text: 'К берегу причаливает плот — грубо сколоченный, с тремя людьми на борту. На каждом — остатки формы с эмблемой Синдиката, но перечёркнутой. Старшая — женщина с седыми волосами и ожогами на лице — смотрит устало. «Мы не враги. Мы те, кто отказался. И за это нас выбросили.»',
        choices: [
          {
            label: 'Помочь им причалить',
            action: 'GOTO_NODE',
            nextNode: 'help_exiles',
          },
          {
            label: 'Спросить об их истории',
            action: 'GOTO_NODE',
            nextNode: 'exile_story',
          },
          {
            label: 'Упомянуть Братство Пути',
            action: 'GOTO_NODE',
            nextNode: 'brotherhood_recognition',
            reqFlag: 'road_in_path',
          },
          {
            label: 'Прогнать их',
            action: 'CLOSE',
            setFlag: 'water_rejected_exiles',
          },
        ],
      },
      help_exiles: {
        id: 'help_exiles',
        text: '«Ты первый, кто не убежал при виде нас,» — говорит женщина. — «Слушай: Командор Восс планирует зачистку западного сектора. У него — список. Будь осторожен с любым блокпостом.»',
        choices: [
          {
            label: 'Принять предупреждение',
            action: 'CLOSE',
            setFlag: 'water_met_exiles',
            reward: { energy: 20, credits: 30 },
          },
        ],
      },
      exile_story: {
        id: 'exile_story',
        image: 'https://picsum.photos/seed/exile_faces/800/350',
        text: '«Нам приказали расстрелять деревню. Мы отказались. Восс объявил нас дезертирами.» Голос ровный, но руки на коленях сжимаются. «Мы ищем Братство Пути. Говорят, они дают убежище.»',
        choices: [
          {
            label: 'Рассказать им о Братстве',
            action: 'GOTO_NODE',
            nextNode: 'tell_brotherhood',
          },
          {
            label: 'Отдать им Припасы',
            action: 'GOTO_NODE',
            nextNode: 'give_supplies',
            reqItem: 'SUPPLIES',
          },
          {
            label: 'Пожать плечами и уйти',
            action: 'CLOSE',
          },
        ],
      },
      tell_brotherhood: {
        id: 'tell_brotherhood',
        text: 'Их лица меняются. Старшая что-то шепчет остальным. «Спасибо. Мы долго искали.» Снимает с запястья браслет с инициалами, которые явно не её. «Возьми. Это свидетельство. Полезно будет.»',
        choices: [
          {
            label: 'Взять браслет',
            action: 'CLOSE',
            setFlag: 'water_met_exiles',
            reward: { items: ['EXILE_MARK'] },
          },
        ],
      },
      give_supplies: {
        id: 'give_supplies',
        text: '«Не нужно было,» — говорит женщина, но берёт. — «Скажу кое-что взамен: в разрушенном форпосте к северо-востоку — схрон. Мы спрятали там кое-что, когда бежали. Теперь уже не вернёмся.»',
        choices: [
          {
            label: 'Запомнить',
            action: 'CLOSE',
            setFlag: 'water_met_exiles',
            reward: { credits: 50 },
            penalty: { items: ['SUPPLIES'] },
          },
        ],
      },
      brotherhood_recognition: {
        id: 'brotherhood_recognition',
        image: 'https://picsum.photos/seed/exile_oath/800/350',
        text: 'При упоминании Братства глаза женщины расширяются. «Ты из Пути? Нас отправил старший Кейра. Он сказал, ждите человека с жетоном.» Они уважительно склоняют головы. «Мы в твоём распоряжении, страж.»',
        choices: [
          {
            label: 'Принять их поддержку',
            action: 'CLOSE',
            setFlag: ['water_met_exiles', 'water_exile_ally'],
            reward: { credits: 60, items: ['SUPPLIES', 'SCRAP'] },
          },
        ],
      },
    },
  },

  // ─────────────────────────── ARC 6: THE MERCHANT'S SECRET ───────────────

  merchant_camp_visit: {
    id: 'merchant_camp_visit',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/merchant_camp/800/350',
        text: 'У небольшого костра — торговец. Его товары разложены на старом одеяле. Поднимает взгляд и улыбается зубами, которых чуть меньше, чем должно быть. «А, путник! Хороший товар, недорого.»',
        choices: [
          {
            label: 'Купить Припасы (20 Кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'buy_supplies',
            reqCredits: 20,
            setFlag: 'merchant_purchased_once',
          },
          {
            label: 'Купить ЭМИ-гранату (50 Кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'buy_emp',
            reqCredits: 50,
            setFlag: 'merchant_purchased_once',
          },
          {
            label: 'Обменять Металлолом',
            action: 'GOTO_NODE',
            nextNode: 'trade_scrap',
            reqItem: 'SCRAP',
            setFlag: 'merchant_purchased_once',
          },
          {
            label: '«Вы уже знакомы» — поговорить',
            action: 'GOTO_NODE',
            nextNode: 'regular_talk',
            reqFlag: 'merchant_purchased_once',
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      buy_supplies: {
        id: 'buy_supplies',
        text: 'Торговец ловко упаковывает припасы. «Лучшие в округе. Ну, или единственные.» Смеётся своей же шутке.',
        choices: [
          {
            label: 'Взять',
            action: 'GOTO_NODE',
            nextNode: 'start',
            reward: { items: ['SUPPLIES'] },
            penalty: { credits: 20 },
          },
        ],
      },
      buy_emp: {
        id: 'buy_emp',
        text: 'Торговец достаёт гранату из-под одеяла. «Отличная вещь. Только не роняй.»',
        choices: [
          {
            label: 'Взять',
            action: 'GOTO_NODE',
            nextNode: 'start',
            reward: { items: ['EMP_GRENADE'] },
            penalty: { credits: 50 },
          },
        ],
      },
      trade_scrap: {
        id: 'trade_scrap',
        text: 'Торговец перебирает металл с неожиданным знанием дела. «О. Это от Синдиковской машины. За такое дам двойную цену.»',
        choices: [
          {
            label: 'Согласиться',
            action: 'GOTO_NODE',
            nextNode: 'start',
            reward: { credits: 40 },
            penalty: { items: ['SCRAP'] },
          },
        ],
      },
      regular_talk: {
        id: 'regular_talk',
        image: 'https://picsum.photos/seed/merchant_secret/800/350',
        text: 'Торговец наклоняется ближе. «Раз уж ты тут снова — есть кое-что. Не для всех.» Говорит быстро и тихо: «Я работаю на Остаток. Синдиkat думает, что я их агент. Но вся информация, которую я передаю им — ложная. Если встретишь Командора Восса на посту...» Замолкает. «Просто не упоминай меня.»',
        choices: [
          {
            label: 'Пообещать молчать',
            action: 'CLOSE',
            setFlag: 'merchant_secret_known',
            reward: { credits: 30 },
          },
          {
            label: 'Потребовать плату за молчание',
            action: 'CLOSE',
            reward: { credits: 60 },
            setFlag: 'merchant_betrayed',
          },
        ],
      },
    },
  },

  wandering_merchant: {
    id: 'wandering_merchant',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/wandering_trade/800/350',
        text: 'Вы встречаете странствующего торговца. «Есть припасы, недорого!»',
        choices: [
          {
            label: 'Купить Припасы (20 Кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'buy_supplies',
            reqCredits: 20,
          },
          {
            label: 'Купить ЭМИ-гранату (50 Кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'buy_emp',
            reqCredits: 50,
          },
          {
            label: 'Пройти мимо',
            action: 'CLOSE',
          },
        ],
      },
      buy_supplies: {
        id: 'buy_supplies',
        text: 'Торговец передаёт вам припасы.',
        choices: [
          {
            label: 'Забрать',
            action: 'CLOSE',
            penalty: { credits: 20 },
            reward: { items: ['SUPPLIES'] },
          },
        ],
      },
      buy_emp: {
        id: 'buy_emp',
        text: 'Торговец передаёт вам ЭМИ-гранату.',
        choices: [
          {
            label: 'Забрать',
            action: 'CLOSE',
            penalty: { credits: 50 },
            reward: { items: ['EMP_GRENADE'] },
          },
        ],
      },
    },
  },

  // ──────────────────────────── CITY HUB (flag-enhanced) ────────────────────

  city_hub: {
    id: 'city_hub',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/city_hub_main/800/350',
        text: 'Столица гудит. Больше стражи у ворот, торговцы говорят вполголоса. На площади — новый указ Командора. Вы чувствуете взгляды.',
        choices: [
          {
            label: 'Отдохнуть в таверне',
            action: 'GOTO_NODE',
            nextNode: 'rest',
          },
          {
            label: 'Купить Припасы (50 Кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'buy_supplies',
            reqCredits: 50,
          },
          {
            label: '«Я друг Пути» — в заднюю комнату',
            action: 'GOTO_NODE',
            nextNode: 'brotherhood_inn',
            reqItem: 'PILGRIM_TOKEN',
          },
          {
            label: 'Разузнать о планах Командора',
            action: 'GOTO_NODE',
            nextNode: 'spy_info',
            reqItem: 'EXILE_MARK',
          },
          {
            label: 'Расспросить о руинах',
            action: 'GOTO_NODE',
            nextNode: 'ruins_info',
            reqFlag: 'ruins_inscription_copied',
          },
          {
            label: 'Покинуть город',
            action: 'CLOSE',
          },
        ],
      },
      rest: {
        id: 'rest',
        text: 'Таверна тёплая, шумная. Вы засыпаете почти сразу. Просыпаетесь другим человеком — или почти.',
        choices: [
          {
            label: 'Выйти обновлённым',
            action: 'GOTO_NODE',
            nextNode: 'start',
            reward: { hp: 60, energy: 60 },
          },
        ],
      },
      buy_supplies: {
        id: 'buy_supplies',
        text: 'Торговец собирает вам пакет. Сверху — незаметный листок с чужим почерком: «Командор знает о тебе. Не ходи к посту у северных скал ближайшие три дня.»',
        choices: [
          {
            label: 'Взять и запомнить предупреждение',
            action: 'GOTO_NODE',
            nextNode: 'start',
            reward: { items: ['SUPPLIES'] },
            penalty: { credits: 50 },
          },
        ],
      },
      brotherhood_inn: {
        id: 'brotherhood_inn',
        image: 'https://picsum.photos/seed/brotherhood_inn/800/350',
        text: 'Хозяин таверны едва заметно кивает. Ведёт в заднюю комнату. Там — несколько человек с серыми плащами Пути и накрытый стол. «Садись. Ты заслужил.»',
        choices: [
          {
            label: 'Принять гостеприимство',
            action: 'GOTO_NODE',
            nextNode: 'start',
            reward: { hp: 100, energy: 100, credits: 40 },
          },
        ],
      },
      spy_info: {
        id: 'spy_info',
        text: 'Показываете метку Изгоев бармену. Он смотрит на неё дольше, чем нужно. «Этих людей я знал.» Тихо: «Командор Восс готовит зачистку. На следующей неделе. Уходи из западного сектора.»',
        choices: [
          {
            label: 'Запомнить и действовать',
            action: 'GOTO_NODE',
            nextNode: 'start',
            reward: { credits: 60 },
            penalty: { items: ['EXILE_MARK'] },
          },
        ],
      },
      ruins_info: {
        id: 'ruins_info',
        text: 'Местный учёный поднимает бровь при виде ваших записей. «Это язык Строителей. Довольно редкий. Знаешь, что они говорили? Что однажды кто-то прочтёт это — и будет готов.» Протягивает старый ключ. «Возьми. Открывает кое-что в старом квартале.»',
        choices: [
          {
            label: 'Взять ключ',
            action: 'GOTO_NODE',
            nextNode: 'start',
            reward: { items: ['ANCIENT_KEY'] },
          },
        ],
      },
    },
  },

  // ────────────────────── OUTPOST CHECKPOINT (flag-enhanced) ────────────────

  outpost_checkpoint: {
    id: 'outpost_checkpoint',
    isUnique: false,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/outpost_gate/800/350',
        text: 'Дорогу преграждает блокпост Синдиката. Вооружённые охранники смотрят холодно. «Пропуск или пошлина. Третьего не дано.»',
        choices: [
          {
            label: 'Предъявить Запечатанное Письмо',
            reqItem: 'SEALED_LETTER',
            action: 'GOTO_NODE',
            nextNode: 'give_letter',
          },
          {
            label: 'Показать жетон Братства',
            action: 'GOTO_NODE',
            nextNode: 'brotherhood_pass',
            reqItem: 'PILGRIM_TOKEN',
          },
          {
            label: 'Показать метку Изгоев (рискованно)',
            action: 'ROLL_DICE',
            probability: 0.3,
            successNode: 'exile_pass_success',
            failNode: 'exile_pass_fail',
            reqItem: 'EXILE_MARK',
          },
          {
            label: 'Заплатить пошлину (50 Кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'pay_toll',
            reqCredits: 50,
          },
          {
            label: 'Прокрасться в обход (Шанс 40%)',
            action: 'ROLL_DICE',
            probability: 0.4,
            successNode: 'sneak_success',
            failNode: 'sneak_fail',
          },
          {
            label: 'Уйти другим путём',
            action: 'CLOSE',
          },
        ],
      },
      give_letter: {
        id: 'give_letter',
        text: 'Охранник читает письмо. Его лицо бледнеет. «Господин Восс не упоминал... Проходи. И извини за задержку.» Вас пропускают с почти испуганной учтивостью.',
        choices: [
          {
            label: 'Войти в аванпост',
            action: 'CLOSE',
            reward: { credits: 100, items: ['SUPPLIES'] },
            penalty: { items: ['SEALED_LETTER'] },
          },
        ],
      },
      brotherhood_pass: {
        id: 'brotherhood_pass',
        text: 'Один из охранников — тот, что помоложе — видит жетон. Быстро переглядывается с напарником. «Друг Пути проходит бесплатно,» — говорит он почти шёпотом.',
        choices: [
          {
            label: 'Пройти',
            action: 'CLOSE',
            reward: { energy: 15 },
          },
        ],
      },
      exile_pass_success: {
        id: 'exile_pass_success',
        text: 'Молодой охранник смотрит на метку долго. Потом отступает. «Иди. Я ничего не видел.» Шёпотом добавляет: «Командор — чудовище. Они правильно сделали, что ушли.»',
        choices: [
          {
            label: 'Пройти',
            action: 'CLOSE',
            reward: { credits: 20 },
          },
        ],
      },
      exile_pass_fail: {
        id: 'exile_pass_fail',
        text: 'Старший охранник узнаёт метку. «Это символ предателей!» Свисток. Вам едва удаётся сбежать.',
        choices: [
          {
            label: 'Убраться',
            action: 'CLOSE',
            penalty: { hp: 30, credits: 30 },
          },
        ],
      },
      pay_toll: {
        id: 'pay_toll',
        text: 'Охранник небрежно берёт кредиты и отходит в сторону.',
        choices: [
          {
            label: 'Пройти',
            action: 'CLOSE',
            penalty: { credits: 50 },
          },
        ],
      },
      sneak_success: {
        id: 'sneak_success',
        text: 'Между сменами охраны — узкое окно. Вы проскальзываете незамеченным.',
        choices: [
          { label: 'Уйти подальше', action: 'CLOSE' },
        ],
      },
      sneak_fail: {
        id: 'sneak_fail',
        text: 'Вас замечают. Короткий бой, побег. Охранники кричат что-то вслед.',
        choices: [
          { label: 'Убраться', action: 'CLOSE', penalty: { hp: 25 } },
        ],
      },
    },
  },

  // Spread all sub-registries
  ...ARC7_EVENTS,
  ...ARC8_EVENTS,
  ...ARC9_EVENTS,
  ...ARC10_EVENTS,
  ...PLAINS_ENCOUNTERS,
  ...FOREST_ENCOUNTERS,
  ...MOUNTAIN_ENCOUNTERS,
  ...SWAMP_ENCOUNTERS,
  ...RUINS_ENCOUNTERS,
  ...ROAD_ENCOUNTERS,
  ...WATER_ENCOUNTERS,
  ...CITY_ENCOUNTERS,
  ...OUTPOST_ENCOUNTERS,
  ...MERCHANT_ENCOUNTERS,
  ...REPUTATION_EVENTS,
  ...TIMED_EVENTS,
};
