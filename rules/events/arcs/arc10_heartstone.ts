import { OverworldEvent } from '../../../types.ts';

// Arc 10 — Сердечный Камень (The Heartstone Finale)
// Prerequisites: forest_elder_grateful + HEARTSTONE_MAP in bag + ≥3 arcs completed
// Flag chain: heartstone_map_decoded → heartstone_path_cleared → heartstone_guardian_passed → heartstone_restored
// Items: HEARTSTONE_MAP, MONASTERY_SCROLL, RUNIC_TABLET (all three needed)

export const ARC10_EVENTS: Record<string, OverworldEvent> = {

  heartstone_decode: {
    id: 'heartstone_decode',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/heartstone_map/800/350',
        text: 'Карта в вашем кармане начинает светиться — золотым, пульсирующим светом. Старец Леса говорил об этом: «Когда мир готов исцелиться, карта покажет дорогу.» Символы на ней — те же, что на руническом планшете.',
        choices: [
          {
            label: 'Использовать RUNIC_TABLET для расшифровки',
            action: 'GOTO_NODE',
            nextNode: 'decode_with_tablet',
            reqItem: 'RUNIC_TABLET',
            reqFlag: 'forest_elder_grateful',
          },
          {
            label: 'Изучить карту без планшета',
            action: 'GOTO_NODE',
            nextNode: 'study_alone',
            reqFlag: 'forest_elder_grateful',
          },
          {
            label: 'Показать карту Кариму (если знаком)',
            action: 'GOTO_NODE',
            nextNode: 'show_karim',
            reqFlag: 'engineer_truth_known',
          },
        ],
      },
      decode_with_tablet: {
        id: 'decode_with_tablet',
        image: 'https://picsum.photos/seed/decode_tablet/800/350',
        text: 'Руны совпадают. Карта разворачивается до трёхмерной проекции — горный хребет, скрытая долина, путь через болота. «Сердечный Камень лежит в месте, где Пустота никогда не касалась земли.» Планшет рассыпается.',
        choices: [
          {
            label: 'Запомнить маршрут',
            action: 'CLOSE',
            setFlag: 'heartstone_map_decoded',
            reward: { energy: 20 },
            penalty: { items: ['RUNIC_TABLET'] },
          },
        ],
      },
      study_alone: {
        id: 'study_alone',
        text: 'Медленно, по символу. Три часа работы. Карта открывает путь — но не полностью. Вы знаете направление, но не все детали.',
        choices: [
          {
            label: 'Отправиться с неполной картой',
            action: 'CLOSE',
            setFlag: 'heartstone_map_decoded',
          },
        ],
      },
      show_karim: {
        id: 'show_karim',
        text: 'Карим смотрит на карту долго. «Это — геологическая аномалия. Место, где земля сохранилась чистой от древней катастрофы. Именно туда реактор никогда не дотянулся.» Он помогает расшифровать путь полностью.',
        choices: [
          {
            label: 'Поблагодарить Карима',
            action: 'CLOSE',
            setFlag: 'heartstone_map_decoded',
            reward: { credits: 30, energy: 20 },
          },
        ],
      },
    },
  },

  heartstone_path: {
    id: 'heartstone_path',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/heartstone_path/800/350',
        text: 'Тропа к долине заросла — не за годы, а намеренно. Кто-то не хотел, чтобы это место нашли. Впереди — три препятствия: обвалившийся мост, патруль Синдиката и заросли ядовитого плюща.',
        choices: [
          {
            label: 'Починить мост (использовать MONASTERY_SCROLL)',
            action: 'GOTO_NODE',
            nextNode: 'fix_bridge',
            reqItem: 'MONASTERY_SCROLL',
            reqFlag: 'heartstone_map_decoded',
          },
          {
            label: 'Обойти всё по скалам (−30 HP)',
            action: 'GOTO_NODE',
            nextNode: 'climb_route',
            reqFlag: 'heartstone_map_decoded',
          },
          {
            label: 'Договориться с патрулём (50 кредитов)',
            action: 'GOTO_NODE',
            nextNode: 'bribe_patrol',
            reqCredits: 50,
            reqFlag: 'heartstone_map_decoded',
          },
        ],
      },
      fix_bridge: {
        id: 'fix_bridge',
        image: 'https://picsum.photos/seed/bridge_fixed/800/350',
        text: 'Свиток содержит строительные заклинания монахов. Мост восстанавливается за час. Патруль смотрит в удивлении и отходит — явно не понимая, как это работает.',
        choices: [
          {
            label: 'Пройти по мосту',
            action: 'CLOSE',
            setFlag: 'heartstone_path_cleared',
            penalty: { items: ['MONASTERY_SCROLL'] },
            reward: { energy: 15 },
          },
        ],
      },
      climb_route: {
        id: 'climb_route',
        text: 'Путь по скалам — долгий и изматывающий. Вы падаете дважды. На третий раз — находите смотровую площадку с видом на долину. Красота стоит боли.',
        choices: [
          {
            label: 'Добраться до цели',
            action: 'CLOSE',
            setFlag: 'heartstone_path_cleared',
            penalty: { hp: 30, energy: 20 },
          },
        ],
      },
      bribe_patrol: {
        id: 'bribe_patrol',
        text: 'Командир патруля берёт деньги. «Что долина? Там ничего нет. Идите.» Он отворачивается. Вы идёте.',
        choices: [
          {
            label: 'Пройти',
            action: 'CLOSE',
            setFlag: 'heartstone_path_cleared',
            penalty: { credits: 50 },
          },
        ],
      },
    },
  },

  heartstone_guardian: {
    id: 'heartstone_guardian',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/heartstone_guardian/800/350',
        text: 'У входа в долину — фигура из камня и света. Страж. Не враждебный — но непреклонный. «Три вопроса. Три ответа. Неверный ответ — три дня ожидания. Ты готов?»',
        choices: [
          {
            label: 'Готов',
            action: 'GOTO_NODE',
            nextNode: 'question_1',
            reqFlag: 'heartstone_path_cleared',
          },
          {
            label: 'Попросить время на подготовку',
            action: 'CLOSE',
          },
        ],
      },
      question_1: {
        id: 'question_1',
        text: '«Первый вопрос: что ты принёс этому миру — разрушение или созидание?»',
        choices: [
          {
            label: 'Созидание — я помогал людям',
            action: 'GOTO_NODE',
            nextNode: 'question_2',
            reqRepMin: 10,
          },
          {
            label: 'Оба — мир сложнее простых ответов',
            action: 'GOTO_NODE',
            nextNode: 'question_2',
          },
          {
            label: 'Разрушение — но ради большего блага',
            action: 'GOTO_NODE',
            nextNode: 'question_1_fail',
          },
        ],
      },
      question_1_fail: {
        id: 'question_1_fail',
        text: 'Страж медленно кивает. «Честность ценю. Но не готовность.» Дорога закрывается на три дня.',
        choices: [
          {
            label: 'Вернуться позже',
            action: 'CLOSE',
          },
        ],
      },
      question_2: {
        id: 'question_2',
        text: '«Второй вопрос: ты видел тьму изнутри — и вышел. Что ты сохранил?»',
        choices: [
          {
            label: 'Милосердие — даже к врагам',
            action: 'GOTO_NODE',
            nextNode: 'question_3',
            reqRepMin: 0,
          },
          {
            label: 'Любопытство — желание понять',
            action: 'GOTO_NODE',
            nextNode: 'question_3',
          },
          {
            label: 'Ничего — тьма взяла своё',
            action: 'GOTO_NODE',
            nextNode: 'question_2_fail',
          },
        ],
      },
      question_2_fail: {
        id: 'question_2_fail',
        text: 'Страж молчит долго. «Тогда ты ещё не готов нести камень.»',
        choices: [
          { label: 'Принять отказ', action: 'CLOSE' },
        ],
      },
      question_3: {
        id: 'question_3',
        text: '«Третий вопрос: Каскад — чья вина?»',
        choices: [
          {
            label: 'Инженеров и тех, кто их не остановил',
            action: 'GOTO_NODE',
            nextNode: 'guardian_passed',
          },
          {
            label: 'Всех нас — молчанием мы позволяем злу',
            action: 'GOTO_NODE',
            nextNode: 'guardian_passed',
            addReputation: 10,
          },
          {
            label: 'Синдиката — только их',
            action: 'GOTO_NODE',
            nextNode: 'question_3_partial',
          },
        ],
      },
      question_3_partial: {
        id: 'question_3_partial',
        text: 'Страж качает головой. «Упрощение — это тоже ложь.» Но дорога открывается. «Ты не совершенен. Но достаточно честен.»',
        choices: [
          {
            label: 'Войти',
            action: 'CLOSE',
            setFlag: 'heartstone_guardian_passed',
          },
        ],
      },
      guardian_passed: {
        id: 'guardian_passed',
        image: 'https://picsum.photos/seed/guardian_passed/800/350',
        text: 'Страж отступает. «Ты прошёл. Иди — камень ждёт.» Свет за ним — мягкий, золотой.',
        choices: [
          {
            label: 'Войти в долину',
            action: 'CLOSE',
            setFlag: 'heartstone_guardian_passed',
            addReputation: 20,
          },
        ],
      },
    },
  },

  heartstone_chamber: {
    id: 'heartstone_chamber',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/heartstone_chamber/800/350',
        text: 'В центре долины — белый камень высотой в два человека. Вокруг него — три алтаря. На каждом — символ: Разум. Жертва. Память. «Тебе предстоят три испытания,» — говорит голос из ниоткуда.',
        choices: [
          {
            label: 'Подойти к алтарю Разума',
            action: 'GOTO_NODE',
            nextNode: 'trial_wisdom',
            reqFlag: 'heartstone_guardian_passed',
          },
          {
            label: 'Подойти к алтарю Жертвы',
            action: 'GOTO_NODE',
            nextNode: 'trial_sacrifice_start',
            reqFlag: 'heartstone_guardian_passed',
          },
          {
            label: 'Подойти к алтарю Памяти',
            action: 'GOTO_NODE',
            nextNode: 'trial_memory',
            reqFlag: 'heartstone_guardian_passed',
          },
        ],
      },
      trial_wisdom: {
        id: 'trial_wisdom',
        text: 'Алтарь Разума показывает видение: руины, где вы нашли надпись. Вопрос формируется сам: «Что означает символ Пустоты — конец или начало?»',
        choices: [
          {
            label: '«Начало нового — если выбрать исцеление»',
            action: 'CLOSE',
            setFlag: 'trial_wisdom_passed',
            addReputation: 15,
            reward: { energy: 25 },
          },
          {
            label: '«Конец того, что не нужно было создавать»',
            action: 'CLOSE',
            setFlag: 'trial_wisdom_passed',
            reward: { credits: 40 },
          },
        ],
      },
      trial_sacrifice_start: {
        id: 'trial_sacrifice_start',
        text: 'Алтарь Жертвы горит холодным пламенем. «Оставь лучшее, что у тебя есть. Не то, что легко отдать — то, что трудно.»',
        choices: [
          {
            label: 'Пожертвовать лучший предмет из сумки',
            action: 'GOTO_NODE',
            nextNode: 'sacrifice_made',
          },
          {
            label: 'Пожертвовать репутацией (−20)',
            action: 'CLOSE',
            setFlag: 'trial_sacrifice_passed',
            addReputation: -20,
            reward: { hp: 40 },
          },
        ],
      },
      sacrifice_made: {
        id: 'sacrifice_made',
        text: 'Пламя принимает жертву. Тепло разливается — не от огня, а изнутри. «Ты знаешь, что важнее вещей.»',
        choices: [
          {
            label: 'Принять очищение',
            action: 'CLOSE',
            setFlag: 'trial_sacrifice_passed',
            reward: { hp: 50, energy: 20 },
          },
        ],
      },
      trial_memory: {
        id: 'trial_memory',
        text: 'Алтарь Памяти показывает лица: паломники, Риа, Карим, Елена. «Кого ты помнишь — того не теряешь.» Голос мягкий. «Вспомни одного — и дай ему имя.»',
        choices: [
          {
            label: 'Вспомнить погибших во время Каскада',
            action: 'CLOSE',
            setFlag: 'trial_memory_passed',
            addReputation: 20,
            reward: { hp: 30 },
          },
          {
            label: 'Вспомнить тех, кому помог в пути',
            action: 'CLOSE',
            setFlag: 'trial_memory_passed',
            reward: { energy: 30 },
          },
        ],
      },
    },
  },

  heartstone_restored: {
    id: 'heartstone_restored',
    isUnique: true,
    startNodeId: 'start',
    nodes: {
      start: {
        id: 'start',
        image: 'https://picsum.photos/seed/heartstone_final/800/350',
        text: 'Три испытания пройдены. Камень пульсирует ярче. Голос Стража звучит последний раз: «Все три — пройдены. Ты — достоин. Прикоснись.» Перед вами — судьба этого мира.',
        choices: [
          {
            label: 'Прикоснуться к камню',
            action: 'GOTO_NODE',
            nextNode: 'touch_stone',
            reqFlag: 'trial_wisdom_passed',
            reqFlagAbsent: 'heartstone_restored',
          },
          {
            label: 'Подождать — убедиться, что готов',
            action: 'CLOSE',
          },
        ],
      },
      touch_stone: {
        id: 'touch_stone',
        image: 'https://picsum.photos/seed/heartstone_glow/800/350',
        text: 'Свет. Тишина. Потом — далёкий звук дождя. Трещины в земле вокруг начинают зарастать. Пустотные пятна в небе над горизонтом светлеют. Процесс медленный — на это уйдут годы. Но он начался.',
        choices: [
          {
            label: 'Наблюдать за рождением нового мира',
            action: 'GOTO_NODE',
            nextNode: 'true_ending',
          },
        ],
      },
      true_ending: {
        id: 'true_ending',
        image: 'https://picsum.photos/seed/heartstone_dawn/800/350',
        text: '«Это не конец,» — говорит голос камня. — «Это — утро.» Старец Леса возникает рядом — моложе, чем вы его помните. Риа. Карим. Елена. Они все здесь, в памяти камня. Ваш путь стал частью этого места навсегда.',
        choices: [
          {
            label: 'Принять наследие своих странствий',
            action: 'CLOSE',
            setFlag: 'heartstone_restored',
            addReputation: 50,
            reward: { hp: 100, energy: 100, credits: 300 },
          },
        ],
      },
    },
  },
};
