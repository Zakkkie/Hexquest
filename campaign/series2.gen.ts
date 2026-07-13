// Series 2 — procedural level builders + parameter sweep.
// Spec: docs/superpowers/specs/2026-07-13-series2-expansion-60-levels-design.md
//
// Two builders cover the reliable archetypes:
//   buildPathLevel   — staircase to a monument (ramp / coins-overdraft), plus
//                      decoy spurs that strand a wrong turn. Hooks are trivial
//                      (win = portalActive, loss = isStranded) → engine-valid by
//                      construction and fully modeled by the MoveCalc solver.
//   buildObeliskLevel — k obelisks each dropping an L4 wall, gating the monument;
//                       geometry forces the order (each wall opens the next arm).
//
// The generation harness (tools/genSeries2.run.test.ts) sweeps params, scores each
// candidate with the solver, selects ~50 spanning difficulty tiers, and writes the
// chosen specs (with baked difficultyScore) to series2.gen.data.ts.
import { LevelConfig } from '../types';
import { isStranded } from './utils';
import { GEN_SPECS } from './series2.gen.data';

// Levels are built at module-init; inline the hex key (`${q},${r}`) instead of
// importing getHexKey so this file has no init-time dependency on hexUtils (which
// sits in an import cycle with the campaign modules and may not be ready yet).
const getHexKey = (q: number, r: number) => `${q},${r}`;

type Cell = { q: number; r: number; currentLevel: number; maxLevel: number;
  revealed: true; ownerId?: string; structureType?: 'MONUMENT' | 'MINI_MONUMENT' };

const cell = (q: number, r: number, lvl: number, extra: Partial<Cell> = {}): Cell =>
  ({ q, r, currentLevel: lvl, maxLevel: lvl, revealed: true, ...extra });

const enterCost = (lvl: number) => (lvl > 1 ? lvl : 1);

// Move-point cost of walking a staircase `path` (list of tile levels, in order,
// starting from the tile after the L0 start). Enter cost = L>1 ? L : 1.
export const pathCost = (levels: number[]) => levels.reduce((s, l) => s + enterCost(l), 0);

// --- decor: inert Δ≥2 scenery so the map reads as sculpted, never reachable ----
function decorate(used: Map<string, Cell>, spread: number) {
  const decor: [number, number, number][] = [
    [spread + 1, -2, 5], [spread + 2, -2, 4], [spread + 1, 1, 4],
    [-1, -1, -3], [-1, 2, -4], [-2, 1, -3],
  ];
  for (const [q, r, lvl] of decor) {
    const k = getHexKey(q, r);
    if (!used.has(k)) used.set(k, cell(q, r, lvl));
  }
}

const bilingual = (state: any, ru: string, en: string) => (state.language === 'RU' ? ru : en);

// ============================================================================
//  PATH LEVEL — ramp / coins-overdraft
// ============================================================================
export interface PathParams {
  /** absolute coords + level of each staircase tile after the L0 start; last = monument */
  path: { q: number; r: number; lvl: number }[];
  moves: number;
  credits?: number;
  /** decoy tiles: reachable-but-wasteful spurs or unenterable STEEP walls */
  decoys?: { q: number; r: number; lvl: number }[];
  rank?: number;
}

export function buildPathLevel(id: string, title: string, desc: string, p: PathParams): LevelConfig {
  const used = new Map<string, Cell>();
  used.set(getHexKey(0, 0), cell(0, 0, 0, { ownerId: 'player-1' }));
  const monument = p.path[p.path.length - 1];
  p.path.forEach((t, i) => {
    const isMon = i === p.path.length - 1;
    used.set(getHexKey(t.q, t.r), cell(t.q, t.r, t.lvl, isMon ? { structureType: 'MONUMENT' } : {}));
  });
  for (const d of p.decoys ?? []) {
    const k = getHexKey(d.q, d.r);
    if (!used.has(k)) used.set(k, cell(d.q, d.r, d.lvl));
  }
  const spread = Math.max(...p.path.map(t => t.q), 3);
  decorate(used, spread);

  return {
    id, title, description: desc,
    objectiveHexes: [{ q: monument.q, r: monument.r, targetLevel: monument.lvl, label: 'Monolith', color: 'emerald' }],
    mapConfig: { size: spread + 3, type: 'fixed', customLayout: [...used.values()] },
    startState: { credits: p.credits ?? 0, moves: p.moves, rank: p.rank ?? 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      if (state.portalActive) return bilingual(state, 'ПОБЕДА: Монолит активирован!', 'VICTORY: Monolith activated!');
      const pl = state.player;
      if (pl.q === monument.q && pl.r === monument.r) return bilingual(state, 'АКТИВИРУЙ Монолит!', 'ACTIVATE the Monolith!');
      return bilingual(state,
        'ЛЕСТНИЦА: поднимайся уступ за уступом к Монолиту — прыжок через >1 уровня невозможен.',
        'STAIRCASE: climb step by step to the Monolith — a jump over >1 level is impossible.');
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => isStranded(state),
    },
  };
}

// ============================================================================
//  OBELISK LEVEL — k gated obelisks, each drops one L4 wall (order forced)
// ============================================================================
export interface ObeliskParams { k: number; moves: number; rank?: number }

export function buildObeliskLevel(id: string, title: string, desc: string, p: ObeliskParams): LevelConfig {
  const k = p.k;
  const used = new Map<string, Cell>();
  used.set(getHexKey(0, 0), cell(0, 0, 0, { ownerId: 'player-1' }));

  // Obelisk j (1..k) sits on a spur; wall j at (2j-1,0) L4 blocks the corridor
  // until obelisk j is hacked (drops to L1). Corridor tiles at even x are L1.
  const obeliskKeys: string[] = [];
  const drops: [string, number, number][] = []; // [obeliskKey, wallQ, wallR]
  for (let j = 1; j <= k; j++) {
    const wq = 2 * j - 1;
    used.set(getHexKey(wq, 0), cell(wq, 0, 4));            // wall
    let oq: number, or: number;
    if (j === 1) { // first obelisk on a north spur off the start
      used.set(getHexKey(0, 1), cell(0, 1, 1));
      oq = 0; or = 2; used.set(getHexKey(oq, or), cell(oq, or, 2, { structureType: 'MINI_MONUMENT' }));
    } else {       // subsequent obelisks hang north off the corridor tile (2(j-1),0)
      const cx = 2 * (j - 1);
      used.set(getHexKey(cx, 0), cell(cx, 0, 1));          // corridor tile
      oq = cx; or = -1; used.set(getHexKey(oq, or), cell(oq, or, 2, { structureType: 'MINI_MONUMENT' }));
    }
    const ok = getHexKey(oq, or);
    obeliskKeys.push(ok);
    drops.push([ok, wq, 0]);
  }
  // final corridor tile + monument
  const monQ = 2 * k;
  used.set(getHexKey(monQ, 0), cell(monQ, 0, 2, { structureType: 'MONUMENT' }));
  const spread = monQ;
  decorate(used, spread);

  return {
    id, title, description: desc,
    objectiveHexes: [
      ...obeliskKeys.map((kk) => { const [q, r] = kk.split(',').map(Number); return { q, r, targetLevel: 2, label: 'Obelisk', color: 'blue' as const }; }),
      { q: monQ, r: 0, targetLevel: 2, label: 'Monolith', color: 'emerald' as const },
    ],
    mapConfig: { size: spread + 3, type: 'fixed', customLayout: [...used.values()] },
    startState: { credits: 0, moves: p.moves, rank: p.rank ?? 2, materials: 0 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      if (state.portalActive) return bilingual(state, 'ПОБЕДА: Монолит активирован!', 'VICTORY: Monolith activated!');
      const done = (state.activatedMiniMonuments || []).length;
      return bilingual(state,
        `ОБЕЛИСКИ ПО ПОРЯДКУ (${done}/${k}): каждый снимает свою стену L4 и открывает путь к следующему.`,
        `OBELISKS IN ORDER (${done}/${k}): each drops its L4 wall and opens the way to the next.`);
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
      checkLossCondition: (state) => isStranded(state),
      onBeforeAction: (state, action) => {
        const pl = state.player;
        if (action.type === 'ACTIVATE_MINI_MONUMENT') {
          if ((action as any).miniMonumentHexKey !== `${pl.q},${pl.r}`)
            return { ok: false, reason: bilingual(state, 'Встаньте на Обелиск', 'Stand on the Obelisk') };
        }
        if (action.type === 'ACTIVATE_MONUMENT') {
          const done = state.activatedMiniMonuments || [];
          if (!obeliskKeys.every(kk => done.includes(kk)))
            return { ok: false, reason: bilingual(state, 'ФАЙРВОЛ: активируйте все Обелиски', 'FIREWALL: activate all Obelisks first') };
        }
        return null;
      },
      onAfterAction: (state) => {
        const done = state.activatedMiniMonuments || [];
        for (const [ok, wq, wr] of drops) {
          if (done.includes(ok)) {
            const wk = getHexKey(wq, wr);
            const w = state.grid[wk];
            if (w && w.currentLevel === 4) state.grid[wk] = { ...w, currentLevel: 1 };
          }
        }
      },
    },
  };
}

// ============================================================================
//  BUILD from a chosen spec (attaches baked difficultyScore)
// ============================================================================
export type GenSpec =
  | { kind: 'path'; id: string; title: string; desc: string; score: number; min: number; p: PathParams }
  | { kind: 'obelisk'; id: string; title: string; desc: string; score: number; min: number; p: ObeliskParams };

export function buildLevel(s: GenSpec): LevelConfig {
  const lvl = s.kind === 'path'
    ? buildPathLevel(s.id, s.title, s.desc, s.p)
    : buildObeliskLevel(s.id, s.title, s.desc, s.p);
  lvl.difficultyScore = s.score;
  lvl.movePointCost = s.min;
  return lvl;
}

export const series2Generated: LevelConfig[] = GEN_SPECS.map(buildLevel);
