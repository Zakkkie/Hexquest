import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';
import { series2Generated } from './series2.gen';

/**
 * ============================================================================
 *  SERIES 2: MONUMENT & ANCIENT ALIGNMENT (10 levels)
 * ============================================================================
 */

const series2Base: LevelConfig[] = [

  // ═══════════════════════════════════════════════════════════════════
  //  2.1  THE MONOLITH — Staircase Navigation + Recovery Bootstrap
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.1',
    title: 'Sim 2.1: Монолит',
    description: 'Активируйте Монолит: перепрыгнуть стену нельзя — поднимайтесь лестницей, уступ за уступом.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.1) — «Лестница + цена подъёма»
    //  Единственный маршрут: (0,0)L0 →(1,0)L1 →(2,0)L2 →(3,0)MON L3.
    //  Стоимость входа: L≤1 = 1 ход, L>1 = высота. 1 + 2 + 3 = 6 ходов.
    //  Бюджет 7 (запас 1). Тупики: (1,-1)L3 — Δ2 от L1 (STEEP, войти
    //  нельзя); (0,1)→(0,2) — ложная лестница в никуда (перерасход).
    //  Декор (Δ≥2 от всех проходимых, чистая эстетика): NE-гряда кристаллов
    //  L4/L5 за Монолитом + SW-каньон (ямы L-2..-4) под стартовой равниной.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 3, r: 0, targetLevel: 3, label: 'Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed',
      customLayout: [
          // START
          { q: 0, r: 0, currentLevel: 0, maxLevel: 0, ownerId: 'player-1', revealed: true },
          // RAMP — the only route: L1 → L2 → L3 monument
          { q: 1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 2, r: 0, currentLevel: 2, maxLevel: 2, revealed: true },
          { q: 3, r: 0, currentLevel: 3, maxLevel: 3, structureType: 'MONUMENT', revealed: true },
          // STEEP DECOY off the ramp — Δ2 from (1,0)L1, unenterable
          { q: 1, r: -1, currentLevel: 3, maxLevel: 3, revealed: true },
          // FAKE NORTH RAMP — climbs to nowhere (budget trap)
          { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 0, r: 2, currentLevel: 2, maxLevel: 2, revealed: true },
          // ── DECOR: NE crystal ridge behind the Monolith (Δ≥2, scenery) ──
          { q: 3, r: -2, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 4, r: -2, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 4, r: -1, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 2, r: 1, currentLevel: 5, maxLevel: 5, revealed: true },
          // ── DECOR: SW canyon below the start plain (Δ≥2, scenery) ──
          { q: 0, r: -1, currentLevel: -2, maxLevel: -2, revealed: true },
          { q: -1, r: 0, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: -1, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: -1, r: 2, currentLevel: -4, maxLevel: -4, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 7, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const p = state.player;
      if (p.q === 3 && p.r === 0) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      if (p.r === 0 && p.q >= 1 && p.q <= 2) {
        return isRu
          ? 'ЛЕСТНИЦА: продолжайте подъём — каждый уступ на 1 выше. Верхний шаг на L3 стоит 3 хода.'
          : 'STAIRCASE: keep climbing — each step is +1 higher. The top L3 step costs 3 moves.';
      }
      return isRu
        ? 'ИДИ НА УКАЗАТЕЛЬ: стену L3 не перепрыгнуть с L0. Иди на восток лестницей (1,0)→(2,0)→(3,0). Северный подъём — тупик.'
        : 'MOVE TO TARGET: an L3 wall cannot be jumped from L0. Take the east staircase (1,0)→(2,0)→(3,0). The north climb is a dead-end.';
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-21-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Прямой прыжок на Монолит невозможен — перепад высот больше 1. Стройте маршрут по лестнице: L1 → L2 → L3. Вход на высокий уступ стоит его высоту в ходах.'
              : 'NEBULA_AI: A direct jump onto the Monolith is impossible — the height gap exceeds 1. Route along the staircase: L1 → L2 → L3. Entering a high step costs its height in moves.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.2  BURIED SECRETS — Dig for Loot + Activate Monument
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.2',
    title: 'Sim 2.2: Погребённый ключ',
    description: 'Ходов не хватает на подъём. Пробурите шахту — глубина возвращает ходы, — затем взойдите к Монолиту.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.2) — «Копай, чтобы взойти»
    //  Копка регенерирует ходы: +max(1,|L|) за уступ вниз. Реверс-лестница
    //  требует 2 соседей того же уровня для спуска ниже -1.
    //  План: dig(1,0)→-1, dig(0,1)→-1, dig(0,0)→-1, dig(0,0)→-2 (+2).
    //  Затем подъём (0,0)L-2 →(1,0)-1 →(2,0)0 →(3,0)1 →(4,0)2 →(5,0)MON L3
    //  = 1+1+1+2+3 = 8 ходов, оплаченных банком раскопок. Бюджет 6.
    //  Тупики: (1,-1)L4 — Δ4 от старта (STEEP); подъём без копки = 8>6
    //  (без банка ходов не хватает — доказано starvation-тестом).
    //  Декор (Δ≥2): NE-гряда L4/L5 за Монолитом + S-каньон (ямы) под шахтой.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: -2, label: 'Shaft', color: 'red' },
      { q: 5, r: 0, targetLevel: 3, label: 'Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed',
      customLayout: [
          // START + DIG CLUSTER (mine these to bank moves & supports)
          { q: 0, r: 0, currentLevel: 0, maxLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
          { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },
          // ASCENDING RAMP out of the shaft to the Monolith
          { q: 2, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },
          { q: 3, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 4, r: 0, currentLevel: 2, maxLevel: 2, revealed: true },
          { q: 5, r: 0, currentLevel: 3, maxLevel: 3, structureType: 'MONUMENT', revealed: true },
          // STEEP SURFACE WALL — the shaft cannot be skipped on the surface
          { q: 1, r: -1, currentLevel: 4, maxLevel: 4, revealed: true },
          // ── DECOR: NE crystal ridge behind the Monolith (Δ≥2) ──
          { q: 5, r: -1, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 6, r: -2, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 4, r: 1, currentLevel: 5, maxLevel: 5, revealed: true },
          // ── DECOR: south canyon under the shaft (Δ≥2) ──
          { q: 0, r: 2, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: 1, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: -1, r: 1, currentLevel: -4, maxLevel: -4, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 6, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const p = state.player;
      if (p.q === 5 && p.r === 0) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      const centre = state.grid?.['0,0']?.currentLevel ?? 0;
      if (centre <= -2) {
        return isRu
          ? 'ПОДЪЁМ: шахта пробита, ходы в банке. Выходи на восток: (1,0)→(2,0)→(3,0)→(4,0)→(5,0) к Монолиту.'
          : 'ASCEND: shaft banked your moves. Climb out east: (1,0)→(2,0)→(3,0)→(4,0)→(5,0) to the Monolith.';
      }
      return isRu
        ? 'КОПАЙ ШАХТУ: спуск возвращает ходы. Прокопай (1,0) и (0,1) до -1, затем центр (0,0) до -2. Стену L4 не перейти.'
        : 'DIG THE SHAFT: descending refunds moves. Dig (1,0) & (0,1) to -1, then centre (0,0) to -2. The L4 wall is impassable.';
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-22-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Ходов мало, а стена L4 глушит поверхность. Каждый спуск в шахту ВОЗВРАЩАЕТ ходы (+глубина). Прокопай соседей до -1, затем центр до -2 — и запаса хватит на подъём к Монолиту.'
              : 'NEBULA_AI: Moves are scarce and an L4 wall blocks the surface. Each descent REFUNDS moves (+depth). Dig neighbours to -1, then the centre to -2 — the bank will fund the climb to the Monolith.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.3  ENTROPY RISING — Action Economy Under Pressure
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.3',
    title: 'Sim 2.3: Брешь Обелиска',
    description: 'Монолит за стеной L4. Взломайте периферийный Обелиск — стена падёт, и только тогда откроется активация.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.3) — «Обелиск как ключ»
    //  Обелиск (0,2)L2 — ключ. onBeforeAction блокирует активацию Монолита,
    //  пока (0,2) не взломан; активация Обелиска требует стоять на нём.
    //  onAfterAction опускает стену (1,0) L4→L1 после взлома.
    //  Маршрут: (0,1)L1 →(0,2)OBL L2 = 1+2 = 3; взлом; назад
    //  (0,1)→(0,0)→(1,0)L1 →(2,0)MON L2 = 1+1+1+2 = 5. Итого 8. Бюджет 9.
    //  Тупики: (1,0)L4 — Δ4 от старта (STEEP, к Монолиту не пройти); ранняя
    //  активация Монолита — отклонена файрволом (gated).
    //  Декор (Δ≥2): пилоны L4 у Монолита, гряда за Обелиском, каньон.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 0, r: 2, targetLevel: 2, label: 'Obelisk', color: 'blue' },
      { q: 2, r: 0, targetLevel: 2, label: 'Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed',
      customLayout: [
          // START
          { q: 0, r: 0, currentLevel: 0, maxLevel: 0, ownerId: 'player-1', revealed: true },
          // OBELISK RAMP (north)
          { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 0, r: 2, currentLevel: 2, maxLevel: 2, structureType: 'MINI_MONUMENT', revealed: true },
          // BARRIER + MONOLITH (east) — wall drops to L1 once the obelisk is hacked
          { q: 1, r: 0, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 2, r: 0, currentLevel: 2, maxLevel: 2, structureType: 'MONUMENT', revealed: true },
          // ── DECOR: pillars flanking the Monolith (Δ≥2) ──
          { q: 2, r: -1, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 2, r: 1, currentLevel: 4, maxLevel: 4, revealed: true },
          // ── DECOR: ridge behind the Obelisk (Δ≥2) ──
          { q: 0, r: 3, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: -1, r: 3, currentLevel: 5, maxLevel: 5, revealed: true },
          // ── DECOR: west canyon (Δ≥2) ──
          { q: -1, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: 0, r: -1, currentLevel: -2, maxLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 9, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const p = state.player;
      const hacked = state.activatedMiniMonuments?.includes('0,2');
      if (!hacked) {
        if (p.q === 0 && p.r === 2) return isRu ? 'ВЗЛОМ: жми АКТИВИРОВАТЬ на Обелиске, чтобы снять стену!' : 'HACK: press ACTIVATE on the Obelisk to drop the wall!';
        return isRu
          ? 'ИДИ К ОБЕЛИСКУ: стена L4 у (1,0) непроходима. Поднимись на север (0,1)→(0,2) и взломай Обелиск.'
          : 'GO TO THE OBELISK: the L4 wall at (1,0) is impassable. Climb north (0,1)→(0,2) and hack the Obelisk.';
      }
      if (p.q === 2 && p.r === 0) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      return isRu
        ? 'ПУТЬ ОТКРЫТ: стена пала. Иди на восток (0,0)→(1,0)→(2,0) и активируй Монолит.'
        : 'PATH OPEN: the wall is down. Head east (0,0)→(1,0)→(2,0) and activate the Monolith.';
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => isStranded(state),
      onBeforeAction: (state, action) => {
        const isRu = state.language === 'RU';
        const p = state.player;
        if (action.type === 'ACTIVATE_MINI_MONUMENT') {
          const key = (action as any).miniMonumentHexKey;
          if (key !== `${p.q},${p.r}`) {
            return { ok: false, reason: isRu ? 'Подойдите к Обелиску, чтобы взломать его' : 'Stand on the Obelisk to hack it' };
          }
        }
        if (action.type === 'ACTIVATE_MONUMENT') {
          if (!state.activatedMiniMonuments?.includes('0,2')) {
            return { ok: false, reason: isRu ? 'ФАЙРВОЛ: сначала взломайте Обелиск (0,2), чтобы снять барьер' : 'FIREWALL: hack the Obelisk (0,2) first to drop the barrier' };
          }
        }
        return null;
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        // Wall (1,0) drops from L4 to L1 the moment the obelisk is hacked (idempotent).
        if (state.activatedMiniMonuments?.includes('0,2')) {
          const wall = state.grid[getHexKey(1, 0)];
          if (wall && wall.currentLevel === 4) {
            state.grid[getHexKey(1, 0)] = { ...wall, currentLevel: 1 };
            state.messageLog.unshift({
              id: `msg-23-wall-${Date.now()}`,
              text: isRu
                ? 'БАРЬЕР СНЯТ: стена у (1,0) опустилась до L1 — путь к Монолиту открыт.'
                : 'BARRIER DOWN: the wall at (1,0) lowered to L1 — the path to the Monolith is open.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-23-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Монолит закрыт файрволом — стена L4 у (1,0) непроходима, а активация отклоняется. Ключ — Обелиск на севере (0,2). Взломай его: барьер опустится и активация разблокируется.'
              : 'NEBULA_AI: The Monolith is firewalled — the L4 wall at (1,0) is impassable and activation is refused. The key is the Obelisk to the north (0,2). Hack it: the barrier lowers and activation unlocks.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.4  THE HYPER_SIGNAL — Mini-Monuments (Obelisks) Introduced
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.4',
    title: 'Sim 2.4: Реактор',
    description: 'Ходов не хватит на переход. Перевали через пик-реактор L4: три заряда дают кредиты — ими оплатишь спуск к Монолиту.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.4) — «Реактор L4 + овердрафт»
    //  Путь идёт ЧЕРЕЗ пик: подъём (1,0)(2,0)(3,0)(4,0)L4 = 1+2+3+4 = 10;
    //  спуск (5,0)(6,0)(7,0)(8,0) = 3+2+1+1 = 7. Всего 17 ходов.
    //  Реактор L4 = 3 заряда: каждый +1 ход и +20 кредитов (5·4).
    //  Бюджет 12. Без реактора: 12<17 → сухо на спуске (тупик доказан).
    //  С реактором: +3 хода +60 кредитов (=12 ходов) → хватает ровно.
    //  Декор (Δ≥2): парные шпили L5 у реактора, ямы каньона.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 4, r: 0, targetLevel: 4, label: 'Reactor', color: 'blue' },
      { q: 8, r: 0, targetLevel: 0, label: 'Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 7, type: 'fixed',
      customLayout: [
          { q: 0, r: 0, currentLevel: 0, maxLevel: 0, ownerId: 'player-1', revealed: true },
          // ASCENT to the reactor peak
          { q: 1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 2, r: 0, currentLevel: 2, maxLevel: 2, revealed: true },
          { q: 3, r: 0, currentLevel: 3, maxLevel: 3, revealed: true },
          { q: 4, r: 0, currentLevel: 4, maxLevel: 4, revealed: true },   // REACTOR (3 charges)
          // DESCENT to the Monolith
          { q: 5, r: 0, currentLevel: 3, maxLevel: 3, revealed: true },
          { q: 6, r: 0, currentLevel: 2, maxLevel: 2, revealed: true },
          { q: 7, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 8, r: 0, currentLevel: 0, maxLevel: 0, structureType: 'MONUMENT', revealed: true },
          // ── DECOR: twin reactor spires + canyon pits (Δ≥2) ──
          { q: 4, r: -1, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 4, r: 1, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 2, r: -1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: 6, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 12, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const p = state.player;
      if (p.q === 8 && p.r === 0) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      if (p.q === 4 && p.r === 0) return isRu ? 'РЕАКТОР: жми ВОССТАНОВЛЕНИЕ трижды — 3 заряда дадут кредиты на спуск.' : 'REACTOR: press RECOVER three times — 3 charges give the credits for the descent.';
      if (p.q > 4) return isRu ? 'СПУСК: кредиты реактора оплатят шаги (5:1). Иди к Монолиту (8,0).' : 'DESCENT: reactor credits pay your steps (5:1). Head to the Monolith (8,0).';
      return isRu
        ? 'К РЕАКТОРУ: поднимись на пик L4 (4,0). Там 3 заряда — сними их ВОССТАНОВЛЕНИЕМ ради кредитов, иначе спуска не оплатить.'
        : 'TO THE REACTOR: climb the L4 peak (4,0). It holds 3 charges — RECOVER them for credits, or the descent is unaffordable.';
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-24-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Ходов на весь переход не хватит. Пик (4,0) — термореактор L4 на 3 заряда: каждый даёт ход и кредиты. Сними все три ВОССТАНОВЛЕНИЕМ, затем спускайся — при нуле ходов шаги оплатятся кредитами (5:1).'
              : 'NEBULA_AI: You lack the moves for the whole crossing. Peak (4,0) is an L4 reactor with 3 charges — each yields a move and credits. RECOVER all three, then descend — at zero moves steps auto-pay with credits (5:1).',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.5  LINEAR MATRIX — Construction of Geometry (LINE_3)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.5',
    title: 'Sim 2.5: Обменный курс',
    description: 'Ходов почти нет — зато полон кошелёк. Каждый шаг покупается (5 кредитов = 1 ход). Выбирай самый дешёвый подъём.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.5) — «Кредиты = ходы (5:1)»
    //  Прямой рывок (1,0)L3 — Δ3 от старта L0 (STEEP). Единственный путь —
    //  дешёвая полка L1: (0,1)(1,1)(2,1)(3,1) →(3,0)L2 →(3,-1)MON L3.
    //  Σ = 1+1+1+1+2+3 = 9. Бюджет: 2 хода + 35 кредитов (=7 ходов) = 9.
    //  Тупик: (1,0)L3 не войти; любой крюк выводит счёт за 35 → нехватка.
    //  Декор (Δ≥2): пики NE, каньон под полкой.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 3, r: -1, targetLevel: 3, label: 'Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed',
      customLayout: [
          { q: 0, r: 0, currentLevel: 0, maxLevel: 0, ownerId: 'player-1', revealed: true },
          // DIRECT DECOY — steep wall (Δ3 from start, Δ2 from shelf)
          { q: 1, r: 0, currentLevel: 3, maxLevel: 3, revealed: true },
          // CHEAP SHELF (the only route): L1×4 → L2 → L3 monument
          { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 1, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 2, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 3, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 3, r: 0, currentLevel: 2, maxLevel: 2, revealed: true },
          { q: 3, r: -1, currentLevel: 3, maxLevel: 3, structureType: 'MONUMENT', revealed: true },
          // ── DECOR: NE peaks + S canyon (Δ≥2) ──
          { q: 4, r: -1, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 4, r: -2, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 2, r: -1, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: -1, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: 0, r: -1, currentLevel: -2, maxLevel: -2, revealed: true },
          { q: 1, r: 2, currentLevel: -3, maxLevel: -3, revealed: true },
      ]
    },
    startState: { credits: 35, moves: 2, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const p = state.player;
      if (p.q === 3 && p.r === -1) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      return isRu
        ? 'КРЕДИТЫ = ХОДЫ: рывок (1,0) заблокирован (Δ3). Иди дешёвой полкой L1 на юг: (0,1)→(1,1)→(2,1)→(3,1)→(3,0)→(3,-1). Кошелёк оплатит ходы 5:1.'
        : 'CREDITS = MOVES: the (1,0) dash is walled (Δ3). Take the cheap L1 shelf south: (0,1)→(1,1)→(2,1)→(3,1)→(3,0)→(3,-1). Your purse pays 5:1.';
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-25-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Всего 2 хода, но 35 кредитов. При нуле ходов шаг автоматически покупается за кредиты (5 за 1). Прямой путь заблокирован стеной — иди дешёвой полкой L1, и кошелька хватит ровно до Монолита.'
              : 'NEBULA_AI: Only 2 moves, but 35 credits. At zero moves each step is auto-bought with credits (5 per move). The direct path is walled — take the cheap L1 shelf and the purse lasts exactly to the Monolith.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.6  RESONANCE TRIANGLE — Shapes under Bot Pressure
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.6',
    title: 'Sim 2.6: Замок глубины',
    description: 'Монолит на дне шахты (L-3). Выройте посадку по порядку: замок градиента не даст углубиться раньше опор.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.6) — «Замок + реверс-лестница»
    //  Монолит (2,0) на L-3 достижим только с посадки L-2 (Δ1). Чтобы
    //  опустить (1,0) до -2, нужны 2 соседа на -1: (0,1) и (1,-1).
    //  Порядок: dig(0,1)→-1, dig(1,-1)→-1, dig(1,0)→-1, dig(1,0)→-2, шаг(2,0).
    //  Копка возвращает ходы, поэтому решает не бюджет (4), а ПОРЯДОК.
    //  Тупик: dig(1,0)→-2 без опор → UNSTABLE (отказ); прямой шаг Δ3 STEEP.
    //  Декор (Δ≥2): пики обода + более глубокие ямы каньона.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 2, r: 0, targetLevel: -3, label: 'Sunken Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed',
      customLayout: [
          { q: 0, r: 0, currentLevel: 0, maxLevel: 0, ownerId: 'player-1', revealed: true },
          // DIG CLUSTER: two supports + the landing
          { q: 0, r: 1, currentLevel: 0, maxLevel: 0, revealed: true },   // support A → -1
          { q: 1, r: -1, currentLevel: 0, maxLevel: 0, revealed: true },  // support B → -1
          { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true },   // landing → -2
          // SUNKEN MONOLITH at the shaft floor
          { q: 2, r: 0, currentLevel: -3, maxLevel: -3, structureType: 'MONUMENT', revealed: true },
          // ── DECOR: rim peaks + deeper canyon pits (Δ≥2) ──
          { q: 2, r: -1, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 1, r: 1, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 0, r: -1, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: -1, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: -1, r: 0, currentLevel: -3, maxLevel: -3, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 4, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const p = state.player;
      if (p.q === 2 && p.r === 0) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      const landing = state.grid?.['1,0']?.currentLevel ?? 0;
      if (landing <= -2) return isRu ? 'СПУСК: посадка на -2 готова. Шагни на Монолит (2,0) на дне.' : 'DESCEND: the -2 landing is ready. Step onto the Monolith (2,0) at the floor.';
      return isRu
        ? 'ПОРЯДОК КОПКИ: сначала опусти соседей (0,1) и (1,-1) до -1, только потом (1,0) до -2. Ниже соседей копать нельзя (замок градиента).'
        : 'DIG ORDER: lower the neighbours (0,1) and (1,-1) to -1 FIRST, only then (1,0) to -2. You cannot dig below your neighbours (gradient lock).';
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-26-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Монолит на дне шахты (L-3). Замок градиента запрещает копать глубже соседей. Сначала опусти двух соседей посадки до -1, затем саму посадку до -2 — и спустишься к нему. Копка возвращает ходы.'
              : 'NEBULA_AI: The Monolith rests at the shaft floor (L-3). The gradient lock forbids digging below your neighbours. Lower the two landing-neighbours to -1 first, then the landing to -2 — then descend. Digging refunds moves.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.7  AETHER DIAMOND — Four-Hex Construction Link
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.7',
    title: 'Sim 2.7: Хрупкая переправа',
    description: 'Хрупкие плиты рушатся после одного прохода. На развилке лишь одна ветка ведёт к Монолиту — назад пути нет.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.7) — «Односторонний мост»
    //  Плиты L1 durability 1: при сходе рушатся в VOID. Верный путь —
    //  (1,0)(2,0)(3,0) →(3,-1) →(4,-2)MON = 5 ходов (бюджет 6).
    //  Тупик: восточная ветка (4,0)(5,0) — сход с (3,0) рушит его в VOID,
    //  связь с Монолитом обрывается → checkLoss → DEFEAT.
    //  Декор (Δ≥2): пики над мостом, пропасть под ним.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 4, r: -2, targetLevel: 1, label: 'Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed',
      customLayout: [
          { q: 0, r: 0, currentLevel: 1, maxLevel: 1, durability: 5, ownerId: 'player-1', revealed: true },
          // MAIN SPAN (brittle, durability 1)
          { q: 1, r: 0, currentLevel: 1, maxLevel: 1, durability: 1, revealed: true },
          { q: 2, r: 0, currentLevel: 1, maxLevel: 1, durability: 1, revealed: true },
          { q: 3, r: 0, currentLevel: 1, maxLevel: 1, durability: 1, revealed: true }, // branch point
          // CORRECT FORK (north) → Monolith
          { q: 3, r: -1, currentLevel: 1, maxLevel: 1, durability: 1, revealed: true },
          { q: 4, r: -2, currentLevel: 1, maxLevel: 1, durability: 5, structureType: 'MONUMENT', revealed: true },
          // DECOY FORK (east) — dead-end, severs the route on the way back
          { q: 4, r: 0, currentLevel: 1, maxLevel: 1, durability: 1, revealed: true },
          { q: 5, r: 0, currentLevel: 1, maxLevel: 1, durability: 1, revealed: true },
          // ── DECOR: peaks above the span + chasm below (Δ≥2) ──
          { q: 3, r: 1, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 5, r: -1, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 1, r: -1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: 0, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 6, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const p = state.player;
      if (p.q === 4 && p.r === -2) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      return isRu
        ? 'НЕ ВОЗВРАЩАЙСЯ: плиты рушатся после прохода. На развилке (3,0) сверни на СЕВЕР: (3,-1)→(4,-2). Восточная ветка (4,0) — тупик, обрывающий путь.'
        : 'NEVER BACKTRACK: tiles collapse after one crossing. At the fork (3,0) turn NORTH: (3,-1)→(4,-2). The east branch (4,0) is a dead-end that severs the route.';
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) =>
        isStranded(state) ||
        (state.player.r === 0 && state.player.q >= 4 && state.grid[getHexKey(3, 0)]?.structureType === 'VOID'),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-27-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Мост из хрупких плит — каждая выдерживает один проход и обрушивается в Пустоту. Иди только вперёд. На развилке (3,0) верный поворот — на север к Монолиту; восточный рукав обрывает возврат.'
              : 'NEBULA_AI: A bridge of brittle plates — each survives one crossing then falls into the Void. Go forward only. At the fork (3,0) the correct turn is north to the Monolith; the east arm severs your return.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.8  VOID RING — Circle containment under unstable decay
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.8',
    title: 'Sim 2.8: Три обелиска',
    description: 'Монолит за тремя стенами. Каждый Обелиск снимает одну — и открывает путь к следующему. Порядок задан геометрией.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.8) — «Три ключа по порядку»
    //  A(0,2) снимает стену1 (1,0); B(2,-1) — стену2 (3,0); C(4,-1) —
    //  стену3 (5,0). Монолит (6,0) активируется лишь при всех трёх ключах
    //  (onBeforeAction). Стены L4 = STEEP: неверный порядок физически
    //  заблокирован. Решает ПОРЯДОК, бюджет ходов щедрый (30).
    //  Декор (Δ≥2): пилоны у обелисков, ямы между рукавами.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 0, r: 2, targetLevel: 2, label: 'Obelisk A', color: 'blue' },
      { q: 2, r: -1, targetLevel: 2, label: 'Obelisk B', color: 'blue' },
      { q: 4, r: -1, targetLevel: 2, label: 'Obelisk C', color: 'blue' },
      { q: 6, r: 0, targetLevel: 2, label: 'Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 7, type: 'fixed',
      customLayout: [
          { q: 0, r: 0, currentLevel: 0, maxLevel: 0, ownerId: 'player-1', revealed: true },
          // A spur (north)
          { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 0, r: 2, currentLevel: 2, maxLevel: 2, structureType: 'MINI_MONUMENT', revealed: true },
          // WALL1 + corridor to B
          { q: 1, r: 0, currentLevel: 4, maxLevel: 4, revealed: true },   // WALL1 → L1 on A
          { q: 2, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 2, r: -1, currentLevel: 2, maxLevel: 2, structureType: 'MINI_MONUMENT', revealed: true }, // B
          // WALL2 + corridor to C
          { q: 3, r: 0, currentLevel: 4, maxLevel: 4, revealed: true },   // WALL2 → L1 on B
          { q: 4, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 4, r: -1, currentLevel: 2, maxLevel: 2, structureType: 'MINI_MONUMENT', revealed: true }, // C
          // WALL3 + Monolith
          { q: 5, r: 0, currentLevel: 4, maxLevel: 4, revealed: true },   // WALL3 → L1 on C
          { q: 6, r: 0, currentLevel: 2, maxLevel: 2, structureType: 'MONUMENT', revealed: true },
          // ── DECOR (Δ≥2) ──
          { q: 0, r: 3, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 2, r: -2, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 4, r: -2, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 3, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: 1, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 30, rank: 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const done = state.activatedMiniMonuments || [];
      const n = ['0,2', '2,-1', '4,-1'].filter(k => done.includes(k)).length;
      if (state.player.q === 6 && state.player.r === 0) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      return isRu
        ? `ОБЕЛИСКИ ПО ПОРЯДКУ (${n}/3): взломай A(0,2)→откроется путь к B(2,-1)→затем C(4,-1). Каждый снимает свою стену L4.`
        : `OBELISKS IN ORDER (${n}/3): hack A(0,2)→opens the way to B(2,-1)→then C(4,-1). Each drops its own L4 wall.`;
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => isStranded(state),
      onBeforeAction: (state, action) => {
        const isRu = state.language === 'RU';
        const p = state.player;
        if (action.type === 'ACTIVATE_MINI_MONUMENT') {
          const key = (action as any).miniMonumentHexKey;
          if (key !== `${p.q},${p.r}`) {
            return { ok: false, reason: isRu ? 'Подойдите к Обелиску, чтобы взломать его' : 'Stand on the Obelisk to hack it' };
          }
        }
        if (action.type === 'ACTIVATE_MONUMENT') {
          const done = state.activatedMiniMonuments || [];
          if (!['0,2', '2,-1', '4,-1'].every(k => done.includes(k))) {
            return { ok: false, reason: isRu ? 'ФАЙРВОЛ: активируйте все три Обелиска' : 'FIREWALL: activate all three Obelisks first' };
          }
        }
        return null;
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        const done = state.activatedMiniMonuments || [];
        const drops: [string, number, number][] = [['0,2', 1, 0], ['2,-1', 3, 0], ['4,-1', 5, 0]];
        for (const [k, wq, wr] of drops) {
          if (done.includes(k)) {
            const wk = getHexKey(wq, wr);
            const w = state.grid[wk];
            if (w && w.currentLevel === 4) {
              state.grid[wk] = { ...w, currentLevel: 1 };
              state.messageLog.unshift({
                id: `msg-28-wall-${wk}-${Date.now()}`,
                text: isRu ? `БАРЬЕР СНЯТ: стена (${wq},${wr}) опустилась.` : `BARRIER DOWN: wall (${wq},${wr}) lowered.`,
                type: 'SUCCESS', source: 'SYSTEM', timestamp: Date.now()
              });
            }
          }
        }
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-28-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Три стены L4 отделяют вас от Монолита. Каждый Обелиск снимает одну и открывает следующий рукав — иди строго A→B→C. Пока не взломаны все три, Монолит отвергает активацию.'
              : 'NEBULA_AI: Three L4 walls separate you from the Monolith. Each Obelisk drops one and opens the next arm — go strictly A→B→C. Until all three are hacked, the Monolith refuses activation.',
            type: 'INFO', source: 'NEBULA_AI', timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.9  DOUBLE CONFLUENCE — Multishape Matrix vs Saboteur Bot
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.9',
    title: 'Sim 2.9: Энтропийный обход',
    description: 'Каждое действие точит Энтропию. Успей к Монолиту прежде, чем она обнулится — по пути перезаряди Стабилизатор.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.9) — «Часы Энтропии»
    //  Дренаж 2 Энтропии за ДЕЙСТВИЕ (actionsTaken). Старт 6.
    //  Прямой пандус (1,0)(2,0)(3,0): 3 действия × 2 = -6 → Энтропия 0 у
    //  вершины (DEFEAT). Обход к Стабилизатору (0,-2) даёт +20 — тогда
    //  часов хватает на подъём. Стабилизатор ОБЯЗАТЕЛЕН (доказано тестом).
    //  Декор (Δ≥2): пики над пандусом, ямы каньона.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 0, r: -1, targetLevel: 1, label: 'Stabilizer', color: 'blue' },
      { q: 3, r: 0, targetLevel: 3, label: 'Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed',
      customLayout: [
          { q: 0, r: 0, currentLevel: 0, maxLevel: 0, ownerId: 'player-1', revealed: true },
          // RAMP to the Monolith
          { q: 1, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 2, r: 0, currentLevel: 2, maxLevel: 2, revealed: true },
          { q: 3, r: 0, currentLevel: 3, maxLevel: 3, structureType: 'MONUMENT', revealed: true },
          // STABILIZER (north, 1 step) — +40 Stability once
          { q: 0, r: -1, currentLevel: 1, maxLevel: 1, revealed: true },
          // ── DECOR (Δ≥2) ──
          { q: 1, r: -1, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 3, r: -1, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: -1, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: 1, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
      ]
    },
    // initialEntropy pinned high: this level's timer is the private _clock, and
    // engine entropy must stay > 0 or EntropySystem fires a terrain-eroding shift.
    startState: { credits: 0, moves: 20, rank: 2, materials: 0, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const p = state.player;
      if (p.q === 3 && p.r === 0) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      if ((state as any)._discharged) { const ent = (state as any)._clock ?? 6; return isRu ? `СТАБИЛЬНОСТЬ ${ent}%: часы пополнены, поднимайся к Монолиту (1,0)→(2,0)→(3,0).` : `STABILITY ${ent}%: clock topped up, climb to the Monolith (1,0)→(2,0)→(3,0).`; }
      return isRu
        ? 'СТАБИЛЬНОСТЬ ПАДАЕТ: прямого пути не хватит по времени. Сначала шагни на север к Стабилизатору (0,-1) за +40, только потом на пандус к Монолиту.'
        : 'STABILITY FALLING: the direct path runs out of time. Step north to the Stabilizer (0,-1) for +40 first, only then up the ramp to the Monolith.';
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => (((state as any)._clock ?? 6) <= 0) || isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        // Stability clock = pure function of actionsTaken (no persisted delta
        // counter → immune to immer draft-persistence quirks; NOT engine entropy,
        // so no probabilistic EntropySystem shifts). Discharge is a set-once flag.
        const S = state as any;
        const acts = (state.player as any).actionsTaken ?? 0;
        if (state.player.q === 0 && state.player.r === -1 && !S._discharged) {
          S._discharged = true;
          state.messageLog.unshift({
            id: `msg-29-charge-${Date.now()}`,
            text: isRu ? 'РАЗРЯДКА: Стабилизатор восстановил +40 Стабильности.' : 'DISCHARGE: the Stabilizer restored +40 Stability.',
            type: 'SUCCESS', source: 'NEBULA_AI', timestamp: Date.now()
          });
        }
        S._clock = 6 + (S._discharged ? 40 : 0) - 3 * acts;

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-29-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Стабильность ядра 6% и падает на 3 за каждое действие. Прямого пандуса не хватит — сначала шагни на север к Стабилизатору (0,-1) за +40, затем поднимайся к Монолиту.'
              : 'NEBULA_AI: Core stability is 6% and drops 3 per action. The direct ramp is not enough — step north to the Stabilizer (0,-1) for +40 first, then climb to the Monolith.',
            type: 'WARN', source: 'SYSTEM', timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.10 COSMIC ALIGNMENT — The Ultimate Convergence (Apeks)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.10',
    title: 'Sim 2.10: Космическое выравнивание',
    description: 'Экзамен: два Обелиска снимают барьеры, кредиты оплачивают финальный подъём, а Энтропия торопит. Проходит лишь выверенный маршрут.',
    // ─────────────────────────────────────────────────────────────────
    //  ИТОГОВЫЙ ПРОСЧЁТ ДВИЖЕНИЯ (spec §3 2.10) — КАПСТОУН
    //  Врата: A(0,2) снимает стену1 (1,0); B(2,-1) — стену2 (3,0).
    //  Монолит (5,0)L3 активируется лишь при обоих ключах (onBeforeAction).
    //  Экономия: финальный подъём (4,0)L2 (5,0)L3 оплачивается кредитами
    //  (овердрафт). Σ ≈ 16 ходов = 8 ходов + 40 кредитов (=8). Часы Энтропии
    //  (дренаж 1/действие, старт 40) торопят. Тупики: стены L4 STEEP до
    //  ключей; ранняя активация Монолита — файрвол.
    //  Декор (Δ≥2): шпили L5, пилоны L4, ямы каньона.
    // ─────────────────────────────────────────────────────────────────
    objectiveHexes: [
      { q: 0, r: 2, targetLevel: 2, label: 'Obelisk A', color: 'blue' },
      { q: 2, r: -1, targetLevel: 2, label: 'Obelisk B', color: 'blue' },
      { q: 5, r: 0, targetLevel: 3, label: 'Monolith', color: 'emerald' }
    ],
    mapConfig: {
      size: 7, type: 'fixed',
      customLayout: [
          { q: 0, r: 0, currentLevel: 0, maxLevel: 0, ownerId: 'player-1', revealed: true },
          // A spur (north)
          { q: 0, r: 1, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 0, r: 2, currentLevel: 2, maxLevel: 2, structureType: 'MINI_MONUMENT', revealed: true },
          // WALL1 + corridor to B
          { q: 1, r: 0, currentLevel: 4, maxLevel: 4, revealed: true },   // WALL1 → L1 on A
          { q: 2, r: 0, currentLevel: 1, maxLevel: 1, revealed: true },
          { q: 2, r: -1, currentLevel: 2, maxLevel: 2, structureType: 'MINI_MONUMENT', revealed: true }, // B
          // WALL2 + final climb
          { q: 3, r: 0, currentLevel: 4, maxLevel: 4, revealed: true },   // WALL2 → L1 on B
          { q: 4, r: 0, currentLevel: 2, maxLevel: 2, revealed: true },
          { q: 5, r: 0, currentLevel: 3, maxLevel: 3, structureType: 'MONUMENT', revealed: true },
          // ── DECOR (Δ≥2) ──
          { q: 0, r: 3, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 2, r: -2, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 5, r: -1, currentLevel: 5, maxLevel: 5, revealed: true },
          { q: 4, r: 1, currentLevel: 4, maxLevel: 4, revealed: true },
          { q: 1, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
          { q: 3, r: 1, currentLevel: -3, maxLevel: -3, revealed: true },
      ]
    },
    startState: { credits: 40, moves: 8, rank: 2, materials: 0, initialEntropy: 40 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? 'ПОБЕДА: Монолит активирован!' : 'VICTORY: Monolith activated!';
      const p = state.player;
      const done = state.activatedMiniMonuments || [];
      if (p.q === 5 && p.r === 0) return isRu ? 'АКТИВИРУЙ: жми АКТИВИРОВАТЬ на Монолите!' : 'ACTIVATE: press ACTIVATE on the Monolith!';
      const n = ['0,2', '2,-1'].filter(k => done.includes(k)).length;
      const ent = state.entropy?.current ?? 0;
      return isRu
        ? `КАПСТОУН (${n}/2): взломай Обелиск A(0,2)→стена падёт→B(2,-1)→стена падёт. Финальный подъём к (5,0) оплатят кредиты. Энтропия ${ent}% — не мешкай.`
        : `CAPSTONE (${n}/2): hack Obelisk A(0,2)→wall drops→B(2,-1)→wall drops. Credits pay the final climb to (5,0). Entropy ${ent}% — don't dawdle.`;
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => state.entropy.current <= 0 || isStranded(state),
      onBeforeAction: (state, action) => {
        const isRu = state.language === 'RU';
        const p = state.player;
        if (action.type === 'ACTIVATE_MINI_MONUMENT') {
          const key = (action as any).miniMonumentHexKey;
          if (key !== `${p.q},${p.r}`) {
            return { ok: false, reason: isRu ? 'Подойдите к Обелиску, чтобы взломать его' : 'Stand on the Obelisk to hack it' };
          }
        }
        if (action.type === 'ACTIVATE_MONUMENT') {
          const done = state.activatedMiniMonuments || [];
          if (!['0,2', '2,-1'].every(k => done.includes(k))) {
            return { ok: false, reason: isRu ? 'ФАЙРВОЛ: активируйте оба Обелиска' : 'FIREWALL: activate both Obelisks first' };
          }
        }
        return null;
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        const done = state.activatedMiniMonuments || [];
        const drops: [string, number, number][] = [['0,2', 1, 0], ['2,-1', 3, 0]];
        for (const [k, wq, wr] of drops) {
          if (done.includes(k)) {
            const wk = getHexKey(wq, wr);
            const w = state.grid[wk];
            if (w && w.currentLevel === 4) state.grid[wk] = { ...w, currentLevel: 1 };
          }
        }
        const acts = (state.player as any).actionsTaken ?? 0;
        const seen = (state as any)._entSeen ?? 0;
        if (acts > seen) {
          (state as any)._entSeen = acts;
          state.entropy.current = Math.max(0, state.entropy.current - (acts - seen));
        }
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-210-intro-${Date.now()}`,
            text: isRu
              ? 'NEBULA_AI: Финал. Два Обелиска (0,2) и (2,-1) снимают барьеры к Монолиту. Взломай оба по очереди, затем оплати финальный подъём кредитами (овердрафт). Энтропия тикает — действуй без лишних шагов.'
              : 'NEBULA_AI: The finale. Two Obelisks (0,2) and (2,-1) drop the barriers to the Monolith. Hack both in turn, then pay the final climb with credits (overdraft). Entropy is ticking — waste no steps.',
            type: 'INFO', source: 'NEBULA_AI', timestamp: Date.now()
          });
        }
      }
    }
  }
];

// Baked MoveCalc difficulty (score, min move-points) for the 10 hand-authored
// levels, from the solver's difficulty report (see docs .../2026-07-13-series2-…).
const BASE_SCORES: Record<string, number> = {
  '2.1': 52, '2.2': 44, '2.3': 50, '2.4': 49, '2.5': 55,
  '2.6': 32, '2.7': 44, '2.8': 43, '2.9': 36, '2.10': 43,
};
const BASE_MIN: Record<string, number> = {
  '2.1': 6, '2.2': 8, '2.3': 7, '2.4': 17, '2.5': 8,
  '2.6': 3, '2.7': 4, '2.8': 15, '2.9': 8, '2.10': 14,
};
series2Base.forEach(l => { l.difficultyScore = BASE_SCORES[l.id]; l.movePointCost = BASE_MIN[l.id]; });

// Series 2 = 10 hand-authored + 50 procedurally generated levels, ordered by
// baked difficulty so play progression runs easy → hard (no solver at runtime).
// Tie-break by raw execution length (movePointCost) for a stable, sensible order.
export const series2Levels: LevelConfig[] = [...series2Base, ...series2Generated]
  .sort((a, b) => (a.difficultyScore ?? 0) - (b.difficultyScore ?? 0)
    || (a.movePointCost ?? 0) - (b.movePointCost ?? 0));

// Renumber id + title sequentially in difficulty order so both run 2.1 … 2.60
// (id number = difficulty rank = play position). Level hooks key off coords, not
// id, so reassigning here is safe; id-keyed consumers (getCampaignMetric, the
// solve-test) are generic / look levels up by stable title-name instead.
series2Levels.forEach((l, i) => {
  const n = i + 1;
  l.id = `2.${n}`;
  l.title = l.title.replace(/Sim 2\.\d+:/, `Sim 2.${n}:`);
});
