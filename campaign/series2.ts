import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

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

export const series2Levels: LevelConfig[] = [

  // ═══════════════════════════════════════════════════════════════════
  //  2.1  THE MONOLITH — Staircase Navigation + Recovery Bootstrap
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.1',
    title: 'Sim 2.1: The Monolith',
    description: 'Target: Unknown Spire.\n\nObjective: Reach the Monolith (Center, L3). It requires NO items to activate. Just step on it and press ACTIVATE in the interface.\n\nProblem: Direct path blocked by L4 wall. Find the staircase along the left ridge.\n\nStart: Almost no fuel. Use RECOVERY (Blue) on your start hex, then MOVE away and back to reset it. Repeat to stockpile fuel.\n\nLOSS CONDITION: Stranded (No moves, no credits, no recovery options).',
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
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.2  BURIED SECRETS — Dig for Loot + Activate Monument
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.2',
    title: 'Sim 2.2: Buried Secrets',
    description: 'Scan: Activation Keys detected underground.\n\nObjective: Collect 3 ANY ITEMS. Step onto the Monolith, insert them into the slots, and press ACTIVATE.\n\nMethod: DIG (Red) below L0. Each new negative depth has a loot chance. Deeper = better odds (20% at -1, 30% at -2, 40% at -3...).\n\nTip: Digging gives +Moves and +Material. You earn fuel by exploring.\n\nLOSS CONDITION: Stranded.',
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
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.3  ENTROPY RISING — Action Economy Under Pressure
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.3',
    title: 'Sim 2.3: Entropy Rising',
    description: 'ALERT: Sector highly unstable.\n\nObjective: Reach the Monolith (L4) and ACTIVATE it.\n\nConstraint: You start at Rank 3. The Monolith is L4. You CANNOT step on it yet. You must use your starting Materials to BUILD a supporting L4 hex nearby to gain Rank 4!\n\nMechanic: Every action costs Entropy (Starts at 15). At 0 → catastrophic shift.\n\nLOSS CONDITION: Entropy reaches 0, you fall into VOID, OR become Stranded.',
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
    // Игроку выдано 4 материала, чтобы он мог достроить опоры и получить Ранг 4 для захода на Монумент
    startState: { credits: 0, moves: 2, rank: 3, materials: 4, initialEntropy: 15 },
    aiMode: 'none',
    hooks: {
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false, 
      checkLossCondition: (state) => {
        // Поражение, если игрок провалился в пустоту
        const currentHex = state.grid[getHexKey(state.player.q, state.player.r)];
        if (currentHex?.structureType === 'VOID') return true;
        
        // Поражение по нулевой Энтропии
        if (state.entropy.current <= 0) return true;
        
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.4  THE RIVALRY — Race vs Bot (Dig to Bootstrap)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.4',
    title: 'Sim 2.4: The Rivalry',
    description: 'THREAT: Hostile unit approaching.\n\nObjective: Find 2 ITEMS and activate the Monolith BEFORE the Rival.\n\nStart: Nearly empty. DIG sites along your path for fuel and artifacts. The Rival approaches from the north.\n\nDEFEAT: The Bot reaches the Monument first OR you become Stranded.',
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
    botSpawnPoints: [{ q: 0, r: -3 }],
    startState: { credits: 0, moves: 2, rank: 2, materials: 0 },
    hooks: {
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.bots?.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.5  THE SINGULARITY — Two Bots, Maximum Pressure
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.5',
    title: 'Sim 2.5: The Singularity',
    description: 'FINAL TEST: Two hostiles converge.\n\nObjective: Collect 3 ITEMS and activate the Core (L5) first.\n\nStart: Near-empty. DIG deep along your spiral for fuel + artifacts. Two rivals approach from the North and East.\n\nTip: Deeper digs give more Moves AND better loot odds.\n\nDEFEAT: Any Bot reaches the Monument first OR you become Stranded.',
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
    botSpawnPoints: [{ q: 3, r: -3 }, { q: -3, r: 0 }],
    startState: { credits: 0, moves: 2, rank: 4, materials: 0 },
    hooks: {
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.bots?.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      }
    }
  }
];