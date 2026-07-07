import { LevelConfig, Hex } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

/**
 * ============================================================================
 *  SERIES 6: «ТЕОРЕМЫ» — 8 логических пазл-уровней (endgame, общий трек)
 * ----------------------------------------------------------------------------
 *  Каждый уровень: одна механика-«ага», детерминированная раскладка
 *  (type:'fixed' customLayout), доказуемо решаемое эталонное решение
 *  (см. services/__tests__/campaign/series6.solve.test.ts). Динамические
 *  угрозы — только детерминированные, через хук onAfterAction (не через
 *  случайные MeteorSystem/EntropyShift). aiMode:'none' — чистая логика.
 *  Дизайн-спек: docs/superpowers/specs/2026-07-06-series6-puzzles-design.md
 * ============================================================================
 */

// Хелпер: горизонтальный ряд L0-плит от (q0..q1, r) — заготовка для мостов/коридоров.
const rowL0 = (q0: number, q1: number, r: number): Partial<Hex>[] => {
  const out: Partial<Hex>[] = [];
  for (let q = q0; q <= q1; q++) out.push({ q, r, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true });
  return out;
};

export const series6Levels: LevelConfig[] = [
  // ─── 6.1 «Лестница из ниоткуда» — опоры + лестница (интро, статичный) ───
  {
    id: '6.1',
    title: 'Sim 6.1: Лестница из ниоткуда',
    description: 'Стена L2 преграждает путь к выходу. Материала ровно на одну ступень — постройте пандус.',
    mapConfig: {
      size: 5, type: 'fixed', customLayout: [
        ...rowL0(0, 0, 0),
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true }, // ступень L1 (строим — обязательна)
        { q: 2, r: 0, currentLevel: 2, maxLevel: 2, structureType: 'NONE', revealed: true }, // стена L2 (перепрыгнуть с L0 нельзя)
        { q: 3, r: 0, currentLevel: 2, maxLevel: 2, structureType: 'NONE', revealed: true }, // вершина-выход L2
      ]
    },
    objectiveHexes: [{ q: 3, r: 0, targetLevel: 2, label: 'Summit', color: 'emerald' }],
    startState: { credits: 0, moves: 20, rank: 3, materials: 2 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const ramp = state.grid?.['1,0']?.currentLevel ?? 0;
      if (ramp < 1) {
        return isRu
          ? 'ЛЕСТНИЦА: с ранга 1 нельзя шагнуть сразу на стену L2. Постройте ступень L1 на клетке рядом (жёлтая стрелка), затем поднимайтесь.'
          : 'STAIRCASE: at rank 1 you cannot step straight onto the L2 wall. Build an L1 step on the adjacent tile (yellow arrow), then climb.';
      }
      return isRu ? 'Ступень готова — поднимитесь на стену и шагните к выходу.' : 'Step is ready — climb the wall and reach the exit.';
    },
    hooks: {
      checkWinCondition: (state) => state.player.q === 3 && state.player.r === 0,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: () => {},
    }
  },

  // ─── 6.2 «Метроном» — детерминированный метеор ───
  {
    id: '6.2',
    title: 'Sim 6.2: Метроном',
    description: 'Мост под метеоритным обстрелом. Удары идут по расписанию — читайте ритм.',
    mapConfig: { size: 6, type: 'fixed', customLayout: rowL0(0, 6, 0) },
    objectiveHexes: [{ q: 6, r: 0, targetLevel: 0, label: 'Exit', color: 'emerald' }],
    startState: { credits: 0, moves: 20, rank: 3, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      return isRu
        ? 'МЕТРОНОМ: каждый 3-й ход метеор бьёт по клетке ПОЗАДИ вас — не мешкайте, идите к выходу без остановок.'
        : 'METRONOME: every 3rd turn a meteor hits the tile BEHIND you — do not linger, march to the exit.';
    },
    hooks: {
      checkWinCondition: (state) => state.player.q === 6 && state.player.r === 0,
      checkLossCondition: (state) => isStranded(state),
      // Детерминированный метеор: каждый 3-й ход обрушивает клетку позади игрока в VOID.
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        if (turn > 0 && turn % 3 === 0) {
          const behindQ = state.player.q - 1;
          if (behindQ >= 0) {
            const key = getHexKey(behindQ, 0);
            const hex = state.grid[key];
            if (hex && hex.structureType !== 'VOID') {
              state.grid[key] = { ...hex, structureType: 'VOID', currentLevel: 0, maxLevel: 0, ownerId: undefined };
              state.effects = state.effects || [];
              state.effects.push({ id: `mtr-62-${turn}`, q: behindQ, r: 0, text: '☄', color: '#F97316', startTime: Date.now(), lifetime: 1000, icon: 'WARN' } as any);
            }
          }
        }
      },
    }
  },

  // ─── 6.3 «Градиентный замок» — раскопки + замок градиента ───
  {
    id: '6.3',
    title: 'Sim 6.3: Градиентный замок',
    description: 'Опустите центр до −2. Замок градиента запрещает копать глубже соседей — копайте по порядку.',
    mapConfig: {
      size: 5, type: 'fixed', customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },  // центр — копать до -2
        ...rowL0(1, 1, 0), ...rowL0(-1, -1, 0),
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
      ]
    },
    objectiveHexes: [{ q: 0, r: 0, targetLevel: -2, label: 'Shaft', color: 'red' }],
    startState: { credits: 0, moves: 40, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const c = state.grid?.['0,0']?.currentLevel ?? 0;
      if (c > -2) {
        return isRu
          ? `ЗАМОК ГРАДИЕНТА: нельзя копать клетку глубже, чем на 1 ниже соседей. Сначала опустите соседа, потом центр. Центр сейчас: ${c}, цель −2.`
          : `GRADIENT LOCK: a tile cannot be dug more than 1 below its neighbours. Lower a neighbour first, then the centre. Centre now: ${c}, target -2.`;
      }
      return isRu ? 'Шахта пробита до −2!' : 'Shaft reached -2!';
    },
    hooks: {
      checkWinCondition: (state) => (state.grid?.['0,0']?.currentLevel ?? 0) <= -2,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: () => {},
    }
  },

  // ─── 6.4 «Хрупкий мост» — хрупкие плиты (durability) ───
  {
    id: '6.4',
    title: 'Sim 6.4: Хрупкий мост',
    description: 'Хрупкие плиты рушатся после прохода. Найдите путь, где ни одна не пройдена сверх прочности.',
    mapConfig: {
      size: 5, type: 'fixed', customLayout: [
        // Прямой мост из хрупких L1-плит durability 1 (проходятся по разу).
        { q: 0, r: 0, currentLevel: 1, maxLevel: 1, structureType: 'NONE', durability: 5, revealed: true }, // старт крепкий
        { q: 1, r: 0, currentLevel: 1, maxLevel: 1, structureType: 'NONE', durability: 1, revealed: true },
        { q: 2, r: 0, currentLevel: 1, maxLevel: 1, structureType: 'NONE', durability: 1, revealed: true },
        { q: 3, r: 0, currentLevel: 1, maxLevel: 1, structureType: 'NONE', durability: 1, revealed: true },
        { q: 4, r: 0, currentLevel: 1, maxLevel: 1, structureType: 'NONE', durability: 5, revealed: true }, // выход крепкий
      ]
    },
    objectiveHexes: [{ q: 4, r: 0, targetLevel: 1, label: 'Exit', color: 'emerald' }],
    startState: { credits: 0, moves: 12, rank: 3, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      return isRu
        ? 'ХРУПКОСТЬ: плиты моста выдерживают один проход и рушатся в Пустоту. Идите вперёд без возвратов — назад пути не будет.'
        : 'BRITTLE: bridge tiles survive one crossing then fall into the Void. Go forward, never backtrack — there is no way back.';
    },
    hooks: {
      checkWinCondition: (state) => state.player.q === 4 && state.player.r === 0,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: () => {},
    }
  },

  // ─── 6.5 «Заплатка» — заделка VOID предметами ───
  {
    id: '6.5',
    title: 'Sim 6.5: Заплатка',
    description: 'Расщелина Пустоты между вами и выходом. Патчей ровно на прямой переход — не тратьте зря.',
    mapConfig: {
      size: 5, type: 'fixed', customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },      // старт
        { q: 1, r: 0, structureType: 'VOID', currentLevel: 0, maxLevel: 0, revealed: true },       // расщелина
        { q: 2, r: 0, structureType: 'VOID', currentLevel: 0, maxLevel: 0, revealed: true },       // расщелина
        { q: 3, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },      // выход
      ]
    },
    objectiveHexes: [{ q: 3, r: 0, targetLevel: 0, label: 'Exit', color: 'emerald' }],
    startState: { credits: 0, moves: 12, rank: 2, materials: 0, startInventory: ['reality_patch', 'reality_patch'] },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      return isRu
        ? 'ЗАПЛАТКА: встаньте рядом с Пустотой, откройте инвентарь и примените Лоскут на разлом — он станет твёрдой землёй. Патчей ровно 2, на прямой переход.'
        : 'PATCH: stand next to the Void, open inventory and apply a Reality Patch on the rift — it becomes solid ground. Exactly 2 patches for the straight crossing.';
    },
    hooks: {
      checkWinCondition: (state) => state.player.q === 3 && state.player.r === 0,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: () => {},
    }
  },

  // ─── 6.6 «Теорема Опор» — правило поддержки (построить башню L3) ───
  {
    id: '6.6',
    title: 'Sim 6.6: Теорема Опор',
    description: 'Возведите башню L3 в центре. Без двух соседей-опор высокая плита не устоит.',
    mapConfig: {
      size: 5, type: 'fixed', customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },  // центр → L3
        ...rowL0(1, 1, 0), ...rowL0(-1, -1, 0),
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
      ]
    },
    objectiveHexes: [{ q: 0, r: 0, targetLevel: 3, label: 'Tower', color: 'amber' }],
    startState: { credits: 0, moves: 120, rank: 5, materials: 40 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      const c = state.grid?.['0,0']?.currentLevel ?? 0;
      if (c < 3) {
        return isRu
          ? `ОПОРЫ: чтобы поднять центр до L${Math.max(2, c + 1)}, у него должно быть 2 соседа не ниже целевой высоты. Стройте соседей-опоры, потом центр. Сейчас центр: ${c}/3.`
          : `SUPPORTS: to raise the centre to L${Math.max(2, c + 1)} it needs 2 neighbours at or above the target height. Build support neighbours first. Centre now: ${c}/3.`;
      }
      return isRu ? 'Башня L3 возведена!' : 'L3 tower complete!';
    },
    hooks: {
      checkWinCondition: (state) => (state.grid?.['0,0']?.currentLevel ?? 0) >= 3,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: () => {},
    }
  },

  // ─── 6.7 «Кольцо Эфира» — форма RING_6 (взаимная опора по кругу) ───
  {
    id: '6.7',
    title: 'Sim 6.7: Кольцо Эфира',
    description: 'Соберите замкнутое Кольцо из шести плит L2. Каждая держится за счёт соседей по кругу.',
    mapConfig: {
      size: 5, type: 'fixed', customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true }, // центр кольца
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: -1, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
      ]
    },
    requiredShapes: [{ type: 'RING_6', level: 2, hint: 'Build a RING of Level 2 hexes' }],
    startState: { credits: 0, moves: 160, rank: 5, materials: 60 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      return isRu
        ? 'ЧЕРТЁЖ: Кольцо L2 вокруг центра. Сначала поднимите все клетки до L1 (опоры не нужны), затем по кругу до L2 — соседи по кольцу держат друг друга.'
        : 'BLUEPRINT: an L2 Ring around the centre. Raise every tile to L1 first (no supports needed), then around to L2 — ring neighbours support each other.';
    },
    hooks: {
      checkWinCondition: () => false, // победа по requiredShapes (VictorySystem)
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: () => {},
    }
  },

  // ─── 6.8 «Финал: Каскад» — опоры + форма (капстоун) ───
  {
    id: '6.8',
    title: 'Sim 6.8: Финал — Каскад',
    description: 'Итог серии: возведите Треугольник L3 из опор в верном порядке под давлением бюджета.',
    mapConfig: {
      size: 5, type: 'fixed', customLayout: [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 0, r: 1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 1, r: -1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: -1, r: 1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: -1, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
        { q: 0, r: -1, currentLevel: 0, maxLevel: 0, structureType: 'NONE', revealed: true },
      ]
    },
    requiredShapes: [{ type: 'TRIANGLE_3', level: 3, hint: 'Build a TRIANGLE of Level 3 hexes' }],
    startState: { credits: 0, moves: 200, rank: 5, materials: 80 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      return isRu
        ? 'ФИНАЛ: соберите Треугольник из трёх плит L3. Поднимайте их согласованно — каждая служит опорой соседней. Порядок и бюджет решают.'
        : 'FINALE: assemble a Triangle of three L3 plates. Raise them in concert — each supports the next. Order and budget decide.';
    },
    hooks: {
      checkWinCondition: () => false, // победа по requiredShapes
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: () => {},
    }
  },
];
