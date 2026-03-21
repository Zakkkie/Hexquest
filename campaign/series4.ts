import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

/**
 * SERIES 4: ADVANCED PUZZLES (8 levels)
 * Full economic model — see Series 2 header for reference.
 * All starts: minimal resources, player earns through gameplay.
 */

// Helper: count player-owned hexes at given level
const countOwned = (state: any, minLevel: number): number =>
  Object.values(state.grid).filter((h: any) => h.ownerId === 'player-1' && h.maxLevel >= minLevel).length;

export const series4Levels: LevelConfig[] = [

  // 4.1 RESONANCE — Build 3 adjacent L2 hexes
  // Economy: DIG 9× → 9mat +12mv. Upgrade 9× → 150cr income. ~20 actions.
  {
    id: '4.1',
    title: 'Sim 4.1: Resonance Protocol',
    description: 'Objective: Create a "Ring of Resonance" - upgrade 3 DIFFERENT hexes to Level 2 simultaneously.\n\nRule: L2 needs 2 neighbors at L1. Plan your build order.\nStart empty — Dig for materials first.',
    mapConfig: {
      size: 4, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 1, materials: 0 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => countOwned(state, 2) >= 3,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // 4.2 MIRROR MAZE — Own symmetric positions (-2,0) and (2,0)
  // Economy: Recovery cycles for fuel. DIG 2× for mat. ~17 actions.
  {
    id: '4.2',
    title: 'Sim 4.2: Mirror Maze',
    description: 'Objective: Own BOTH (-2,0) and (2,0) at Level 1+.\n\nDirect east path blocked by VOID. Find detours or sacrifice items to restore.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // WEST PATH (clear)
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          // EAST PATH (blocked by VOID)
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          // EAST DETOUR (south route)
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          // DIG SITES
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          // WALLS
          { q: 1, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: {
      credits: 0, moves: 3, rank: 0, materials: 0,
      items: [
        { baseId: 'fuel_cell', rarity: 'COMMON' },
        { baseId: 'reality_patch', rarity: 'COMMON' },
      ]
    },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const a = state.grid[getHexKey(-2, 0)];
        const b = state.grid[getHexKey(2, 0)];
        return !!(a?.ownerId === 'player-1' && a.maxLevel >= 1 && b?.ownerId === 'player-1' && b.maxLevel >= 1);
      },
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // 4.3 RECURSION ENGINE — Build 2 hexes to L3
  // Economy: ~16mat from digging. Upgrade chain: L1→L2→L3. Income: 2×70cr=140cr. ~25 actions.
  {
    id: '4.3',
    title: 'Sim 4.3: Recursion Engine',
    description: 'Objective: Build 2 hexes to Level 3.\n\nEach level requires 2 neighbors at same level as support.\nPlan your upgrade chain carefully — build wide before building tall.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => countOwned(state, 3) >= 2,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // 4.4 THERMAL EQUILIBRIUM — Upgrade to L4 under entropy pressure
  // Entropy: +3 per action (via hook). Starts at 70 (of 100). At 100 → loss.
  // Player has ~10 actions before entropy overflows.
  // Economy: DIG 4× (+4mat,+6mv). Upgrade 4× (L0→L4 chain). Recovery for credits.
  // But: need rank 3 for L4! Start rank=3.
  {
    id: '4.4',
    title: 'Sim 4.4: Thermal Equilibrium',
    description: 'Objective: Build center hex to Level 4.\n\nHazard: Each action adds +3 Entropy. Starting at 70/100.\nAt 100 → sector collapse.\n\nYou have ~10 actions. Every move must count.\nPre-built staircase: focus on upgrading, not pathfinding.',
    mapConfig: {
      size: 4, type: 'fixed', generateWalls: true, wallStartRadius: 2, wallType: 'pit_ring',
      customLayout: [
          // Pre-built staircase to reduce action count
          { q: 0, r: 0, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          // L2 neighbors (support for center → L3)
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          // L3 neighbors (support for center → L4, after upgrading these to L3)
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
      ]
    },
    startState: { credits: 50, moves: 8, rank: 3, materials: 4, initialEntropy: 70 },
    aiMode: 'none',
    hooks: {
      onAfterAction: (state) => {
        state.entropy.current = Math.min(100, (state.entropy.current ?? 70) + 3);
        return state;
      },
      checkWinCondition: (state) => (state.grid[getHexKey(0, 0)]?.maxLevel ?? 0) >= 4,
      checkLossCondition: (state) => {
        if ((state.entropy.current ?? 0) >= 100) return true;
        return isStranded(state);
      }
    }
  },

  // 4.5 CONVERGENCE POINT — Achieve 2 of 3 goals before bot
  // Goals: (A) 5 owned L2+, (B) 200cr, (C) stand on monument.
  // Economy: DIG-heavy start. ~20 actions. Bot arrives in ~16.
  {
    id: '4.5',
    title: 'Sim 4.5: Convergence Point',
    description: 'Objective: Achieve 2 of 3 goals BEFORE the Rival:\n  A) Own 6+ hexes at L2+\n  B) Accumulate 200 Credits\n  C) Stand on the Monument\n\nThe Rival approaches in ~16 actions. Choose 2 goals and commit.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 0, r: -3, maxLevel: 2, currentLevel: 2, revealed: true }, // Bot
          // PLAYER BUILD AREA
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 4, maxLevel: 0, currentLevel: 0, revealed: true }, // Added one more for 6-hex goal
          // BOT PATH
          { q: 0, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          // WALLS
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: 0, maxLevel: 5, currentLevel: 5, revealed: true },
      ]
    },
    aiMode: 'basic',
    botObjective: 'MONUMENT_RACE',
    botSpawnPoints: [{ q: 0, r: -3 }],
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    hooks: {
      checkWinCondition: (state) => {
        let goals = 0;
        if (countOwned(state, 2) >= 6) goals++;
        if ((state.player.coins ?? 0) >= 200) goals++;
        if (state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT') goals++;
        return goals >= 2;
      },
      checkLossCondition: (state) => {
        if (state.bots?.some((b: any) => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      }
    }
  },

  // 4.6 CASCADE PROTOCOL — Chain reaction: L3 auto-upgrades neighbors
  // Hook: After each upgrade, if hex reaches L3, all adjacent L2 hexes auto-upgrade to L3.
  // Win: 8+ hexes at L3+.
  // Economy: Build L2 cluster, then trigger cascade by upgrading one to L3.
  {
    id: '4.6',
    title: 'Sim 4.6: Cascade Protocol',
    description: 'Objective: 8+ hexes at Level 3.\n\nSpecial: When a hex reaches L3, all adjacent L2 hexes INSTANTLY upgrade to L3!\n\nStrategy: Build a large L2 cluster, then trigger the chain reaction.\n\nWarning: Cascading costs NO material but each triggered upgrade is an action (entropy drain).',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // LARGE BUILD AREA (19-hex flower: center + 2 rings)
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          // RING 2
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    aiMode: 'none',
    hooks: {
      onAfterAction: (state) => {
        // CASCADE: Any hex that just reached L3 triggers adjacent L2→L3
        let cascaded = true;
        while (cascaded) {
          cascaded = false;
          const hexes = Object.values(state.grid) as any[];
          for (const hex of hexes) {
            if (hex.maxLevel === 3 && hex.ownerId === 'player-1') {
              const neighbors = [
                { q: hex.q + 1, r: hex.r }, { q: hex.q - 1, r: hex.r },
                { q: hex.q, r: hex.r + 1 }, { q: hex.q, r: hex.r - 1 },
                { q: hex.q + 1, r: hex.r - 1 }, { q: hex.q - 1, r: hex.r + 1 }
              ];
              for (const n of neighbors) {
                const nHex = state.grid[getHexKey(n.q, n.r)];
                if (nHex && nHex.maxLevel === 2 && nHex.ownerId === 'player-1') {
                  state.grid[getHexKey(n.q, n.r)] = {
                    ...nHex, currentLevel: 3, maxLevel: 3
                  };
                  // Cascading drain: each triggered upgrade reduces entropy by 1%
                  state.entropy.current = Math.max(0, (state.entropy.current ?? 100) - 1);
                  cascaded = true;
                }
              }
            }
          }
        }
        return state;
      },
      checkWinCondition: (state) => countOwned(state, 3) >= 8,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // 4.7 DUALITY ENGINE — Build 4×L3 AND 2×L4 simultaneously
  // Economy: ~20mat from digging. Heavy upgrade chain. ~35 actions.
  {
    id: '4.7',
    title: 'Sim 4.7: Duality Engine',
    description: 'Objective: Own 4 hexes at L3+ AND 2 hexes at L4+ simultaneously.\n\nChallenge: L4 requires Rank 3 and neighbors at L3.\nYou must build wide (4×L3) AND tall (2×L4) from scratch.\n\nDig deep for materials. Plan your support chains.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // LARGE BUILD AREA (same as 4.6 but slightly different)
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 3, materials: 0 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => countOwned(state, 3) >= 4 && countOwned(state, 4) >= 2,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // 4.8 OMEGA SYNTHESIS — Final trial. 4 simultaneous conditions + entropy.
  // Win: 3 L3+ hexes AND 300cr AND stand on monument AND ≥2 items.
  // Entropy: +2 per action. Start at 50/100. ~25 actions max.
  {
    id: '4.8',
    title: 'Sim 4.8: Omega Synthesis',
    description: 'ULTIMATE TRIAL: All Systems Critical.\n\nAchieve ALL simultaneously:\n  1. Own 3+ hexes at Level 3+\n  2. Accumulate 300+ Credits\n  3. Stand on Monument with 2+ items\n  4. Keep Entropy below 60/100\n\nEntropy: +2 per action. Start: 40/100. ~30 actions max.\n\nThis is the end. Use everything you have learned.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // STAIRCASE to monument
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          // BUILD AREA (player zone)
          { q: 1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 2, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          // DIG SITES
          { q: 2, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 4, maxLevel: 0, currentLevel: 0, revealed: true },
          // WALLS
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0, initialEntropy: 40 },
    aiMode: 'none',
    hooks: {
      onAfterAction: (state) => {
        state.entropy.current = Math.min(100, (state.entropy.current ?? 40) + 2);
        return state;
      },
      checkWinCondition: (state) => {
        const onMon = state.grid[getHexKey(state.player.q, state.player.r)]?.structureType === 'MONUMENT';
        const l3 = countOwned(state, 3);
        const coins = state.player.coins ?? 0;
        const items = state.player.inventory?.length ?? 0;
        const cool = (state.entropy.current ?? 0) < 60;
        return !!(onMon && l3 >= 3 && coins >= 300 && items >= 2 && cool);
      },
      checkLossCondition: (state) => {
        if ((state.entropy.current ?? 0) >= 100) return true;
        return isStranded(state);
      }
    }
  }
];