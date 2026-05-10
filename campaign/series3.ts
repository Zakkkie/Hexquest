import { LevelConfig } from '../types';
import { isStranded } from './utils';

/**
 * ============================================================================
 *  SERIES 3: OBELISK CHRONICLES  (8 levels)
 * ============================================================================
 *
 *  New mechanics:
 *  ─ OBELISK (MINI_MONUMENT at L3): visit to reveal a monument slot's silhouette.
 *    Without visiting, the slot shows '??' — player can still guess.
 *  ─ MONUMENT at L5+: activate with correct items to win.
 *  ─ TWO STRIKES: entropy depletes in exactly 2 fixed spikes.
 *    Spike every N turns; 2nd spike = defeat.
 *    initialEntropy / 2 = damage → bar shows "2 lives remaining".
 *
 *  Navigation:
 *  ─ Player starts with rank 5 (can navigate any pre-built terrain).
 *  ─ Pre-built staircases: each L step costs that many moves.
 *  ─ Path L1→L2→L3→L4→L5 costs 1+2+3+4+5 = 15 moves total.
 */

export const series3Levels: LevelConfig[] = [

  // ═══════════════════════════════════════════════════════════════════
  //  3.1  FIRST INSCRIPTION — 1 slot, 1 obelisk, linear map
  // ═══════════════════════════════════════════════════════════════════
  //
  //  LESSON: Obelisk reveals monument slot silhouette. Guess or verify.
  //
  //  MAP: Vertical shaft. Obelisk L3 branches off main path.
  //  Main: (0,5)L0 → (0,4)L1 → (0,3)L2 → (0,2)L3 → (0,1)L4 → (0,0)L5 MONUMENT
  //  Branch: (0,2)L3 → (-1,2)L3 OBELISK (reveals slot 0: 'cargo_prism')
  //  From obelisk: player can continue to (0,1)L4 directly ((-1,2) neighbors (0,1) ✓).
  //
  //  START INVENTORY: fuel_cell (COMMON), cargo_prism (UNCOMMON ← correct),
  //                   reality_patch (COMMON)
  //
  //  Direct path (no obelisk):  1+2+3+4+5 = 15 mv
  //  Path via obelisk:          1+2+3+3+4+5 = 18 mv  (3mv detour)
  //  Budget: 20mv. Both paths viable.
  //
  //  TWO STRIKES: entropy=20, interval=20, damage=10 → loss at turn 40.
  //
  {
    id: '3.1',
    title: 'Первая Надпись',
    description: 'Древняя передача, высеченная в камне.\n\nЗадача: Активируйте Монумент на вершине.\n\nМеханика: Обелиски (колонны Ур. 3) вписывают силуэт требуемого предмета в интерфейс Монумента. Посетите один, чтобы узнать, что ему нужно — или угадайте.\n\nЭнтропийное Предупреждение: Произойдут два события стабильности. Второе завершит миссию.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        // MAIN STAIRCASE
        { q: 0, r: 5, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 4, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 3, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // OBELISK BRANCH (accessible from (0,2)L3, connects back to (0,1)L4)
        { q: -1, r: 2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },
        // DECORATIVE PITS
        { q: 1, r: 4, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 4, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: 1, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -1, r: 3, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: 1, r: 0, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: {
      credits: 0, moves: 20, rank: 5, materials: 0, initialEntropy: 20,
      startInventory: ['fuel_cell', 'cargo_prism', 'reality_patch']
    },
    goalText: 'Activate the Monument',
    aiMode: 'none',
    hooks: {
      onAfterAction: (state) => {
        // Entropy spikes
        const turn = state.currentTurn ?? 0;
        if (turn > 0 && turn % 20 === 0) {
          state.entropy.current = Math.max(0, state.entropy.current - 10);
        }
        // Obelisk at (-1,2): reveals slot 0
        if (state.player.q === -1 && state.player.r === 2) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true];
          }
        }
      },
      checkWinCondition: () => false, // Victory set by ACTIVATE_MONUMENT
      checkLossCondition: (state) => {
        if (Math.floor((state.currentTurn ?? 0) / 20) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.2  TWIN BEACONS — 2 slots, 2 obelisks, Y-shape
  // ═══════════════════════════════════════════════════════════════════
  //
  //  LESSON: Two obelisks, each reveals one slot. Choose which to visit.
  //
  //  MAP: Y-shape. Both L3 obelisks are mandatory stepping stones from L2 to L4.
  //  Player MUST go through at least one obelisk to reach monument.
  //  The second obelisk is a costly detour (~7mv extra).
  //
  //  Start: (0,4)L0 → (0,3)L1 → (0,2)L2 → branch:
  //    Left:  (-1,2)L2 → (-1,1)L3 OBELISK_1 → (0,1)L4
  //    Right: (1,2)L2  → (1,1)L3  OBELISK_2 → (0,1)L4
  //  Junction: (0,1)L4 → (0,0)L5 MONUMENT
  //
  //  One-obelisk path: 1+2+2+3+4+5 = 17mv
  //  Both obelisks:    1+2+2+3+4+3+4+5 = 24mv (backtrack through (0,1))
  //  Budget: 22mv + 10cr(=2mv) = 24mv — both obelisks achievable!
  //
  //  TWO STRIKES: entropy=20, interval=20, damage=10 → loss at turn 40.
  //
  {
    id: '3.2',
    title: 'Близнецы-Маяки',
    description: 'Два обелиска стоят по бокам от вершины. Каждый хранит половину надписи.\n\nЗадача: Активируйте Монумент с 2 слотами.\n\nПуть: Маршрут разделяется. Каждая ветвь ведет через один обелиск. Посетите оба для получения полной информации — но это стоит ходов.\n\nСтратегия: Сможете ли вы угадать второй слот только по своему инвентарю?',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        // STEM
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        // LEFT BRANCH
        { q: -1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_1: slot 0
        // RIGHT BRANCH
        { q: 1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OBELISK_2: slot 1
        // JUNCTION AND SUMMIT
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // DECORATIVE
        { q: -2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: {
      credits: 10, moves: 22, rank: 5, materials: 0, initialEntropy: 20,
      startInventory: ['data_disc', 'hornet_drill', 'cargo_prism', 'emergency_gen', 'rusted_scanner']
    },
    goalText: 'Activate the 2-slot Monument',
    aiMode: 'none',
    hooks: {
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        if (turn > 0 && turn % 20 === 0) {
          state.entropy.current = Math.max(0, state.entropy.current - 10);
        }
        // OBELISK_1 at (-1,1): reveals slot 0 (hornet_drill)
        if (state.player.q === -1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true, state.monumentRevealedSlots[1] ?? false];
          }
        }
        // OBELISK_2 at (1,1): reveals slot 1 (emergency_gen)
        if (state.player.q === 1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[1]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, true];
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (Math.floor((state.currentTurn ?? 0) / 20) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.3  ECLIPSE DEPTH — rarity slot, obelisk on mandatory path, VOID walls
  // ═══════════════════════════════════════════════════════════════════
  //
  //  LESSON: Rarity requirements (UNCOMMON). Obelisk on the only valid path.
  //
  //  MAP: Linear path. VOID hexes block both side routes.
  //  Obelisk at L3 is the mandatory stepping stone from L2 to L4.
  //  Player ALWAYS visits the obelisk — it reveals the UNCOMMON rarity requirement.
  //
  //  Path: (0,4)L0 → (0,3)L1 → (0,2)L2 → (0,1)L3 OBELISK → (0,0)L4 → (0,-1)L5 MONUMENT
  //  Cost: 1+2+3+4+5 = 15mv
  //
  //  VOID walls: (-1,2) and (1,2) block side access — only central path exists.
  //
  //  START INVENTORY: fuel_cell (COMMON), cargo_prism (UNCOMMON ← correct),
  //                   data_disc (COMMON)
  //  Obelisk reveals: UNCOMMON rarity badge. Player sees cargo_prism matches.
  //
  //  TWO STRIKES: entropy=20, interval=18, damage=10 → loss at turn 36.
  //
  {
    id: '3.3',
    title: 'Глубина Затмения',
    description: 'Надпись требует качества, а не личности.\n\nЗадача: Активируйте Монумент НЕОБЫЧНЫМ предметом.\n\nОбелиск на вашем пути раскрывает требование к редкости. Обычный предмет не подойдет.\n\nСтены пустоты закрывают оба фланга. Есть только один путь вперед.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
        // MAIN PATH
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK: slot 0 = UNCOMMON
        { q: 0, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: -1, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // VOID WALLS (block flanks)
        { q: -1, r: 2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: 2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        // DECORATIVE DEPTH
        { q: -1, r: 3, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 1, r: 3, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: {
      credits: 0, moves: 20, rank: 5, materials: 0, initialEntropy: 20,
      startInventory: ['fuel_cell', 'cargo_prism', 'data_disc']
    },
    goalText: 'Activate the Monument (UNCOMMON item)',
    aiMode: 'none',
    hooks: {
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        if (turn > 0 && turn % 18 === 0) {
          state.entropy.current = Math.max(0, state.entropy.current - 10);
        }
        // OBELISK at (0,1): reveals slot 0 (UNCOMMON)
        if (state.player.q === 0 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true];
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (Math.floor((state.currentTurn ?? 0) / 18) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.4  ENTROPIC DISPATCH — 2 slots, 2 obelisks, TIGHT timer
  // ═══════════════════════════════════════════════════════════════════
  //
  //  LESSON: Time pressure. Choose one obelisk branch — can't visit both.
  //
  //  MAP: Fork from start. Two symmetric branches, each with one obelisk.
  //  Both paths converge at (0,1)L4 → (0,0)L5 MONUMENT.
  //
  //  Left:  (0,3)L0 → (-1,3)L1 → (-1,2)L2 → (-1,1)L3 OBELISK_1 → (0,1)L4
  //  Right: (0,3)L0 → (1,3)L1  → (1,2)L2  → (1,1)L3  OBELISK_2 → (0,1)L4
  //
  //  One-path cost: 1+2+3+4+5 = 15mv. Budget: 16mv. 1 spare.
  //  Two-path cost: ~22mv. IMPOSSIBLE within budget — player must choose.
  //
  //  TWO STRIKES: entropy=50, interval=10, damage=25 → loss at turn 20!
  //  (Only 19 turns. Player has NO room for detours.)
  //
  //  NOTE: reality_patch is slot 0, any RARE is slot 1.
  //  Left obelisk reveals slot 0. Right obelisk reveals slot 1.
  //  Player has both — the challenge is EFFICIENCY, not item discovery.
  //
  {
    id: '3.4',
    title: 'Энтропийная Депеша',
    description: 'Стабильность рушится. У вас мало времени.\n\nЗадача: Активируйте Монумент с 2 слотами до второго события.\n\nОпасность: Событие стабильности происходит каждые 10 действий. Два события = провал миссии.\n\nРешение: Два обелиска стоят по бокам пути. Вы можете добраться только до одного. Выбирайте мудро — или доверьтесь своему инвентарю.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
        // START
        { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        // LEFT BRANCH
        { q: -1, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_1: slot 0
        // RIGHT BRANCH
        { q: 1, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OBELISK_2: slot 1
        // CONVERGENCE
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // WALLS (block shortcuts)
        { q: 0, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: {
      credits: 5, moves: 16, rank: 5, materials: 0, initialEntropy: 50,
      startInventory: ['reality_patch', 'cortex_overclocker', 'fuel_cell', 'architect_nanites']
    },
    goalText: 'Activate the Monument (fast)',
    aiMode: 'none',
    hooks: {
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        if (turn > 0 && turn % 10 === 0) {
          state.entropy.current = Math.max(0, state.entropy.current - 25);
        }
        // OBELISK_1 at (-1,1): reveals slot 0 (reality_patch)
        if (state.player.q === -1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true, state.monumentRevealedSlots[1] ?? false];
          }
        }
        // OBELISK_2 at (1,1): reveals slot 1 (RARE)
        if (state.player.q === 1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[1]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, true];
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (Math.floor((state.currentTurn ?? 0) / 10) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.5  GUARDIAN'S KEEP — RARE slot, DESTROY bot guards obelisk
  // ═══════════════════════════════════════════════════════════════════
  //
  //  LESSON: Bot pressure. Obelisk near hostile territory.
  //
  //  MAP: Main path up the center. Obelisk branches off at junction L3.
  //  Bot spawns near the junction — player must time visit to dodge it.
  //
  //  Path (no obelisk): (0,4)L0→(0,3)L1→(0,2)L2→(0,1)L3→(0,0)L4→(0,-1)L5 = 15mv
  //  Obelisk at (-1,1)L3: from (0,1)L3, costs 3mv there + 3mv back + continue = +6mv
  //  Budget: 20mv + 10cr(=2mv) = 22mv. Obelisk path = 21mv. Feasible.
  //
  //  Bot at (1,1)L1: patrols near junction, threatens player approaching obelisk.
  //
  //  TWO STRIKES: entropy=30, interval=15, damage=15 → loss at turn 30.
  //
  {
    id: '3.5',
    title: "Цитадель Стража",
    description: 'Что-то следит за надписью.\n\nЗадача: Активируйте Монумент РЕДКИМ предметом.\n\nУгроза: Бот-страж патрулирует перекресток. Обелиск раскрывает, какой именно РЕДКИЙ предмет нужен — но добраться до него опасно.\n\nСтратегия: Сможете ли вы узнать нужный РЕДКИЙ предмет без посещения обелиска?',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
        // MAIN PATH
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: 1, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 0, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: -1, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // OBELISK BRANCH (off junction at (0,1)L3)
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK: slot 0 = RARE
        // BOT TERRITORY
        { q: 1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 2, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        // WALLS
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -1, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -1, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 1, r: 1 }],
    startState: {
      credits: 10, moves: 20, rank: 5, materials: 0, initialEntropy: 30,
      startInventory: ['fuel_cell', 'architect_nanites', 'data_disc']
    },
    goalText: 'Activate the Monument (RARE item)',
    hooks: {
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        if (turn > 0 && turn % 15 === 0) {
          state.entropy.current = Math.max(0, state.entropy.current - 15);
        }
        // OBELISK at (-1,1): reveals slot 0 (RARE)
        if (state.player.q === -1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true];
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (Math.floor((state.currentTurn ?? 0) / 15) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.6  THREE WHISPERS — 1 slot ONE_OF, 3 obelisks
  // ═══════════════════════════════════════════════════════════════════
  //
  //  LESSON: ONE_OF mechanic. Any of 3 fixed items activates the slot.
  //          Three obelisks each "whisper" the same secret: one slot that
  //          accepts cargo_prism, hornet_drill, OR emergency_gen.
  //
  //  MAP: Central junction with 3 obelisk branches + monument above.
  //  One obelisk (center) is on the mandatory path.
  //  Two others are optional side branches.
  //
  //  (0,4)L0 → (0,3)L1 → (0,2)L2 → (0,1)L3 OBELISK_3 → (0,0)L4 → (0,-1)L5 MONUMENT
  //  Branch left:  (0,2)L2 → (-1,2)L2 → (-1,1)L3 OBELISK_1
  //  Branch right: (0,3)L1 → (1,2)L2  → (1,1)L3  OBELISK_2  (1,2 = neighbor of (0,3) ✓)
  //
  //  Mandatory obelisk (center, at (0,1)) always reveals slot 0.
  //  Side obelisks give the same info — they're "echoes" of the same inscription.
  //
  //  START INVENTORY: rusted_scanner (COMMON), cargo_prism (UNCOMMON ← one of 3),
  //                   reality_patch (COMMON), fuel_cell (COMMON)
  //
  //  TWO STRIKES: entropy=20, interval=20, damage=10 → loss at turn 40.
  //
  {
    id: '3.6',
    title: 'Три Шепота',
    description: 'Монумент говорит тремя голосами — и все они говорят одно и то же.\n\nЗадача: Активируйте Монумент одним из трех возможных предметов.\n\nТри обелиска высекли одну и ту же надпись: слот принимает любой из 3 конкретных НЕОБЫЧНЫХ предметов. Найдите хотя бы один, чтобы победить.\n\nЦентральный обелиск неизбежен. Остальные открывают лишь отголоски.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
        // MAIN PATH
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_3 (center, mandatory)
        { q: 0, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: -1, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // LEFT OBELISK BRANCH
        { q: -1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_1
        // RIGHT OBELISK BRANCH (from (0,3)L1 → (1,2)L2 → (1,1)L3)
        { q: 1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OBELISK_2
        // WALLS
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 0, r: -2, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: {
      credits: 5, moves: 20, rank: 5, materials: 0, initialEntropy: 20,
      startInventory: ['rusted_scanner', 'cargo_prism', 'reality_patch', 'fuel_cell']
    },
    goalText: 'Activate the Monument (1 of 3 items)',
    aiMode: 'none',
    hooks: {
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        if (turn > 0 && turn % 20 === 0) {
          state.entropy.current = Math.max(0, state.entropy.current - 10);
        }
        // Any obelisk visit reveals slot 0 (ONE_OF — all 3 reveal the same slot)
        const px = state.player.q, py = state.player.r;
        const isOnObelisk = (px === 0 && py === 1) || (px === -1 && py === 1) || (px === 1 && py === 1);
        if (isOnObelisk) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true];
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (Math.floor((state.currentTurn ?? 0) / 20) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.7  ASCENDANCY — 2 slots, COMPETE bot, race to monument
  // ═══════════════════════════════════════════════════════════════════
  //
  //  LESSON: Two-slot monument under competitive pressure.
  //
  //  MAP: Same Y-shape as 3.2 but with a COMPETE bot racing for rank.
  //  Bot won't activate monument but adds movement pressure and entropy noise.
  //
  //  Slots: hornet_drill (slot 0) + matter_prism (slot 1).
  //  Both obelisks optional — player has both items in inventory.
  //
  //  TWO STRIKES: entropy=30, interval=15, damage=15 → loss at turn 30.
  //  Tight: 29 turns to visit 1-2 obelisks + reach monument + activate.
  //
  {
    id: '3.7',
    title: 'Господство',
    description: 'Другой агент рвется к вершине.\n\nЗадача: Активируйте Монумент с 2 слотами, пока энтропия не подвела.\n\nКонкуренция: Соперник наращивает ранг, создавая давление. Он не будет активировать монумент — но он поглощает время.\n\nДва обелиска хранят надпись. Сможете ли вы добраться до обоих за 29 действий?',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        // STEM
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        // LEFT BRANCH
        { q: -1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_1: slot 0
        // RIGHT BRANCH
        { q: 1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OBELISK_2: slot 1
        // JUNCTION AND SUMMIT
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // BOT TERRITORY (far side, buildable area)
        { q: 2, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 3, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 2, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 3, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 3, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        // WALLS
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    aiMode: 'basic',
    botObjective: 'COMPETE_RANK',
    botSpawnPoints: [{ q: 3, r: 3 }],
    startState: {
      credits: 10, moves: 22, rank: 5, materials: 0, initialEntropy: 30,
      startInventory: ['rusted_scanner', 'hornet_drill', 'matter_prism', 'fuel_cell']
    },
    goalText: 'Activate the 2-slot Monument',
    hooks: {
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        if (turn > 0 && turn % 15 === 0) {
          state.entropy.current = Math.max(0, state.entropy.current - 15);
        }
        // OBELISK_1 at (-1,1): reveals slot 0 (hornet_drill)
        if (state.player.q === -1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true, state.monumentRevealedSlots[1] ?? false];
          }
        }
        // OBELISK_2 at (1,1): reveals slot 1 (matter_prism)
        if (state.player.q === 1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[1]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, true];
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (Math.floor((state.currentTurn ?? 0) / 15) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.8  THE ARCHIVE — 3 slots, 3 obelisks, VOID maze, DESTROY bot
  // ═══════════════════════════════════════════════════════════════════
  //
  //  LESSON: Final exam. 3-slot monument, all obelisks nearly mandatory,
  //          hostile bot, VOID blocking, extreme time pressure.
  //
  //  MAP:
  //  Start → L1 → L2(junction) → L3(center obelisk OB1) [mandatory] → L4 → L5 MONUMENT
  //  From L2 junction: branch to OB2 at (-1,2)L3 and OB3 at (1,2)L3
  //  From OB2/OB3: reach (0,1)L4 via separate paths
  //  VOID at (-1,1) blocks shortcut left of center
  //
  //  Visiting all 3 obelisks:
  //  (0,5)→(0,4)→(0,3)→(1,2)[ob3]→(0,2)[ob1]→(-1,2)[ob2]→(0,1)→(0,0) = 1+2+3+3+3+4+5=21mv
  //  Mandatory OB1 path (skip others): 1+2+3+4+5=15mv
  //
  //  Budget: 22mv + 15cr(=3mv) = 25mv. Full obelisk run: 21mv → 4 spare ✓
  //  But 23-turn limit means visiting all 3 costs ~21 turns + activate = 22 turns. BARELY OK!
  //
  //  TWO STRIKES: entropy=40, interval=12, damage=20 → loss at turn 24.
  //
  {
    id: '3.8',
    title: 'Архив',
    description: 'Последняя запись. Три надписи. Один монумент.\n\nЗадача: Активируйте Монумент с 3 слотами.\n\nТри обелиска хранят три откровения слотов. Центральный неизбежен. Боковые обелиски требуют отклонения от маршрута — но без них вы будете гадать вслепую.\n\nВраждебный агент патрулирует верхние уровни. У вас есть 23 действия.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        // MAIN PATH
        { q: 0, r: 5, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 4, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 3, maxLevel: 2, currentLevel: 2, revealed: true },
        // CENTER OBELISK (mandatory L3 stepping stone)
        { q: 0, r: 2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OB1: slot 0
        // SIDE OBELISK 2 (branch from (0,3)L2 via (-1,3)L2)
        { q: -1, r: 3, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OB2: slot 1
        // SIDE OBELISK 3 (branch from (0,3)L2 via (1,3)L2... but (1,3) is neighbor of (0,4)L1 ✓)
        // Actually (1,2) is neighbor of (0,3)L2: neighbors of (0,3) include (1,2)?
        // neighbors of (0,3): (1,3),(-1,3),(0,4),(0,2),(1,2),(-1,4). YES (1,2) ✓ diff|2-3|=1 ✓
        { q: 1, r: 2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OB3: slot 2
        // JUNCTION (accessible from OB1, OB2)
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // VOID (blocks shortcut below OB2)
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        // BOT TERRITORY
        { q: 2, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 2, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
        // WALLS/PITS
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -2, r: 3, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 2, r: 3, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 2, r: 2 }],
    startState: {
      credits: 15, moves: 22, rank: 5, materials: 0, initialEntropy: 40,
      startInventory: ['cargo_prism', 'stability_scanner', 'matter_prism', 'fuel_cell', 'data_disc']
    },
    goalText: 'Activate the 3-slot Monument',
    hooks: {
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        if (turn > 0 && turn % 12 === 0) {
          state.entropy.current = Math.max(0, state.entropy.current - 20);
        }
        // OB1 at (0,2): slot 0 (cargo_prism = UNCOMMON)
        if (state.player.q === 0 && state.player.r === 2) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false, false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true, state.monumentRevealedSlots[1] ?? false, state.monumentRevealedSlots[2] ?? false];
          }
        }
        // OB2 at (-1,2): slot 1 (stability_scanner = UNCOMMON)
        if (state.player.q === -1 && state.player.r === 2) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false, false];
          if (!state.monumentRevealedSlots[1]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, true, state.monumentRevealedSlots[2] ?? false];
          }
        }
        // OB3 at (1,2): slot 2 (matter_prism = RARE)
        if (state.player.q === 1 && state.player.r === 2) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false, false];
          if (!state.monumentRevealedSlots[2]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, state.monumentRevealedSlots[1] ?? false, true];
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (Math.floor((state.currentTurn ?? 0) / 12) >= 2) return true;
        return isStranded(state);
      }
    }
  }
];
