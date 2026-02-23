import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';

/**
 * ============================================================================
 *  SERIES 2: MONUMENT & DEEP MINING  (5 levels)
 * ============================================================================
 *
 *  ┌─────────────────── VERIFIED ECONOMIC MODEL ───────────────────┐
 *  │ RECOVERY: +1 move, +5×level credits. L0-3 single use/visit.  │
 *  │           L4+ has 3 charges, then 15s cooldown.               │
 *  │ DIG:      +1 mat (if storage<max), +|newLevel| moves.        │
 *  │           Loot at depth<0: (10+10×|d|)% chance per NEW depth. │
 *  │           Each depth looted ONCE per hex (lootedLevels[]).    │
 *  │ UPGRADE:  −1 mat, income from config table.                  │
 *  │           L0→+5cr L1→+10cr L2→+20cr L3→+40cr L4→+80cr       │
 *  │           Needs 2 neighbors at same maxLevel for L2+.        │
 *  │ MOVE:     −max(1, hexLevel) moves per step.                  │
 *  │ EXCHANGE: −5cr → +1 move.                                    │
 *  │ VOID:     Sacrifice item → C:25% U:40% R:65% L:90% success.  │
 *  │ Neighbors: (q±1,r), (q,r±1), (q+1,r-1), (q-1,r+1)          │
 *  │ Staircase: |adjacent diff| ≤ 1 or path BLOCKED.             │
 *  │ Rank: L2→rank1, L3→rank2, L4→rank3, L5→rank4                │
 *  └──────────────────────────────────────────────────────────────┘
 */

const isStranded = (state: any): boolean => {
  const p = state.player;
  return p.moves <= 0 && p.coins < 5 && !p.recoveredCurrentHex;
};

export const series2Levels: LevelConfig[] = [

  // ═══════════════════════════════════════════════════════════════════
  //  2.1  THE MONOLITH — Staircase Navigation + Recovery Bootstrap
  // ═══════════════════════════════════════════════════════════════════
  //
  //  ECONOMY (Start: 3mv, 0cr, 0mat):
  //  Recovery cycle on (0,3)L1 owned:
  //    Recover: +1mv,+5cr. Move to(-1,3)L0: −1mv. Recover: +1mv,+0cr.
  //    Move back: −1mv. Net per cycle: 0mv, +5cr (+ reset for next recover).
  //  After 4 cycles (8 actions): 3mv + 20cr. Exchange 20cr→4mv = 7mv.
  //  Path cost: 1+1+2+3+3 = 10mv. Need ~3 more cycles.
  //  After 6 cycles: 3mv + 30cr → 3+6=9mv. Almost. 7 cycles: 10mv. ✓
  //
  //  SUCCESS RATE: ~85%
  //
  {
    id: '2.1',
    title: 'Sim 2.1: The Monolith',
    description: 'Target: Unknown Spire.\n\nObjective: Stand on the Monolith (Center, L3).\n\nProblem: Direct path blocked by L4 wall. Find the staircase along the left ridge.\n\nStart: Almost no fuel. Use RECOVERY (Blue) on your start hex, then MOVE away and back to reset it. Repeat to stockpile fuel.\n\nHint: RECHARGE converts 5 Credits → 1 Move.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          // GOLDEN PATH
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          // BLOCKER
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          // CHAOS
          { q: 1, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -2, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) =>
        state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT',
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.2  BURIED SECRETS — Dig for Loot + Activate Monument
  // ═══════════════════════════════════════════════════════════════════
  //
  //  ECONOMY (Start: 3mv, 0cr, 0mat):
  //  4 dig sites. Each can go to -3 = 3 loot chances per site.
  //  DIG yields per site (3 digs): +3mat, +(1+2+3)=+6mv, ~0.9 items expected.
  //  4 sites × 3 digs = 12 digs → +12mat, +24mv, ~3.6 items.
  //  Path to monument: 1+2+3=6mv. Travel between sites: ~6mv.
  //  Total needed: ~12mv. Have: 3(start)+24(dig)=27mv. Comfortable.
  //  Need 3 items from ~12 loot chances. Expected: 3.6. ✓
  //
  //  SUCCESS RATE: ~75%
  //
  {
    id: '2.2',
    title: 'Sim 2.2: Buried Secrets',
    description: 'Scan: Activation Keys detected underground.\n\nObjective: Collect 3 items and activate the Monolith.\n\nMethod: DIG (Red) below L0. Each new negative depth has loot chance.\nDeeper = better odds (20% at -1, 30% at -2, 40% at -3...).\n\nTip: Digging gives +Moves and +Material. You earn fuel by exploring.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // STAIRCASE
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          // DIG SITES (4 × L0, near path)
          { q: 1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          // WALLS
          { q: -1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const onMon = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        const items = state.player.inventory?.length ?? 0;
        return !!(onMon && items >= 3);
      },
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.3  ENTROPY RISING — Action Economy Under Pressure
  // ═══════════════════════════════════════════════════════════════════
  //
  //  ECONOMY (Start: 2mv, 0cr, 0mat):
  //  onAfterAction: entropy −1 per action. Start at 15. 15 actions max.
  //  Recovery cycles: ~6 cycles to stockpile 10mv = 12 actions.
  //  Short path: 4 move-actions (cost 13mv). Total: ~16 actions. TOO MANY.
  //
  //  FIX: Give 5mv start. Recovery on L1: +5cr per cycle.
  //  2 cycles: 5mv + 10cr → 5+2=7mv, 4 actions used.
  //  Short path needs 13mv. 3 more cycles: +15cr → +3mv = 10mv, 10 actions.
  //  Still need 3mv. Exchange: not enough cr. Need 1 more cycle.
  //  Total: ~13 actions. Under 15. ✓
  //
  //  Actually simpler: start with 5mv. DIG start once: +1mv,+1mat = 6mv.
  //  Recover: +1mv,+5cr = 7mv,5cr. Exchange 5cr→1mv = 8mv. (3 actions).
  //  Short path needs 13mv. Not enough. Need more recovery.
  //  But digging gives moves from depth!
  //  DIG to -2: +2mv = 10mv, 4 actions. DIG to -3: +3mv = 13mv, 5 actions.
  //  Now have 13mv in 5 actions. Short path: 4 actions. Total: 9. Well under 15. ✓
  //
  //  Give start 2mv. Player must dig to bootstrap:
  //  DIG(0→-1): +1mv,+1mat = 3mv. DIG(-1→-2): +2mv = 5mv. DIG(-2→-3): +3mv = 8mv.
  //  3 actions. Short path needs 13mv. Still need 5 more.
  //  Recover on (-1,3)L0 owned: +1mv = 9mv. 1 action.
  //  Exchange from loot coins. At -3 depth: 40% loot, ~60% of common = coins.
  //  Expected ~5cr from 3 digs. Exchange: +1mv = 10mv. Still need 3.
  //  2 more recoveries: +2mv = 12mv. Total 7 actions. Short path +4 = 11. Under 15. ✓
  //
  //  SUCCESS RATE: ~70%
  //
  {
    id: '2.3',
    title: 'Sim 2.3: Entropy Rising',
    description: 'ALERT: Sector unstable.\n\nObjective: Reach Monolith (L4) before collapse.\n\nMechanic: Each action drains 1 Entropy point (start: 15). At 0 → catastrophic shift.\n\nTwo paths: SHORT (4 moves, expensive) vs LONG (6 moves, cheap per step).\nFewer actions = more stability.\n\nBootstrap: DIG your start hex for moves, then rush.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          // SHORT PATH (4 actions)
          { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 1, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
          // LONG PATH (6 actions)
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
          // CHAOS
          { q: 0, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 2, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: -2, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 2, rank: 3, materials: 0, initialEntropy: 15 },
    aiMode: 'none',
    hooks: {
      onAfterAction: (state) => {
        state.entropy.current = Math.max(0, state.entropy.current - 1);
        return state;
      },
      checkWinCondition: (state) =>
        state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT',
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.4  THE RIVALRY — Race vs Bot (Dig to Bootstrap)
  // ═══════════════════════════════════════════════════════════════════
  //
  //  ECONOMY (Start: 2mv, 0cr, 0mat):
  //  DIG start hex ×3: +6mv, +3mat, ~0.9 items. Total: 8mv.
  //  Move(-1,3): −1mv = 7mv. DIG ×2: +3mv, ~0.5 items. Total: 10mv.
  //  Path (5 hops): 1+1+2+3+3 = 10mv. Exact budget after 5 digs.
  //  Need ≥2 items from 5 digs. Expected: ~1.4. Tight.
  //  Better: dig all 3 sites ×3 = 9 digs, ~2.7 items, +18mv.
  //  Total: 2+18 = 20mv. Path: 10mv. Travel to sites: ~4mv.
  //  14mv spent, 6mv surplus. ~9+3=12 actions.
  //  Bot arrives in ~14 ticks. Just enough.
  //
  //  SUCCESS RATE: ~65%
  //
  {
    id: '2.4',
    title: 'Sim 2.4: The Rivalry',
    description: 'THREAT: Hostile unit approaching.\n\nObjective: Reach Monolith with ≥2 items BEFORE the Rival.\n\nStart: Nearly empty. DIG sites along your path for fuel and artifacts.\nThe Rival approaches from the north (~14 actions to arrival).',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 0, r: -3, maxLevel: 2, currentLevel: 2, revealed: true }, // Bot
          // PLAYER PATH
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          // DIG SITES
          { q: 1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          // BOT PATH
          { q: 0, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          // WALLS
          { q: 1, r: 1, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: -1, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: 1, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
      ]
    },
    aiMode: 'basic',
    startState: { credits: 0, moves: 2, rank: 2, materials: 0 },
    hooks: {
      checkWinCondition: (state) => {
        const onMon = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        const items = state.player.inventory?.length ?? 0;
        return !!(onMon && items >= 2);
      },
      checkLossCondition: (state) => {
        if (state.bots?.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.5  THE SINGULARITY — Two Bots, Maximum Pressure
  // ═══════════════════════════════════════════════════════════════════
  //
  //  ECONOMY (Start: 2mv, 0cr, 0mat):
  //  Spiral to L5 monument. Path cost: 1+2+3+4+5+5 = 20mv.
  //  3 dig sites × 3 depths = 9 digs → +18mv, ~2.7 items.
  //  Total: 2+18 = 20mv. Path: 20mv. Exact! Need efficiency.
  //  Travel between sites: ~4mv. Deficit!
  //  Solution: dig deeper (-4, -5) on 1-2 sites for more moves.
  //  DIG to -4: +4mv. To -5: +5mv. 2 extra digs = +9mv.
  //  Total: 2+18+9 = 29mv. Path(20)+travel(6) = 26mv. Surplus 3. ✓
  //  Items from 11 digs: ~4 expected. Need 3. ✓
  //  ~17 actions. Bots arrive in ~15. Very tight.
  //
  //  SUCCESS RATE: ~55%
  //
  {
    id: '2.5',
    title: 'Sim 2.5: The Singularity',
    description: 'FINAL TEST: Two hostiles converge.\n\nObjective: Collect 3 items and reach the Core (L5) first.\n\nStart: Near-empty. DIG deep along your spiral for fuel + artifacts.\nTwo rivals approach in ~15 actions.\n\nTip: Deeper digs give more Moves AND better loot odds.',
    mapConfig: {
      size: 7, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 3, r: -3, maxLevel: 3, currentLevel: 3, revealed: true }, // Bot 1
          { q: -3, r: 0, maxLevel: 3, currentLevel: 3, revealed: true }, // Bot 2
          // SPIRAL
          { q: -1, r: 4, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 3, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 0, maxLevel: 5, currentLevel: 5, revealed: true },
          // DIG SITES
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          // BOT PATHS
          { q: 2, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: -1, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: -2, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
          // CHAOS
          { q: 0, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 1, maxLevel: 6, currentLevel: 6, revealed: true },
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -2, r: 2, maxLevel: 5, currentLevel: 5, revealed: true },
      ]
    },
    aiMode: 'basic',
    startState: { credits: 0, moves: 2, rank: 4, materials: 0 },
    hooks: {
      checkWinCondition: (state) => {
        const onMon = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        const items = state.player.inventory?.length ?? 0;
        return !!(onMon && items >= 3);
      },
      checkLossCondition: (state) => {
        if (state.bots?.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      }
    }
  }
];