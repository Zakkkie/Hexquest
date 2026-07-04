import { calculateMovementCost } from '../../../rules/movement';
import { EntityType, EntityState } from '../../../types';
import type { Entity, Hex } from '../../../types';

// Helper factories
const makeEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'test-entity',
  type: EntityType.PLAYER,
  state: EntityState.IDLE,
  q: 0,
  r: 0,
  playerLevel: 1,
  coins: 100,
  totalCoinsEarned: 0,
  moves: 10,
  recentUpgrades: [],
  storage: 0,
  maxStorage: 5,
  inventory: [],
  activeStatuses: [],
  movementQueue: [],
  headIndex: 0,
  bodyIndex: 0,
  ...overrides,
});

const makeHex = (q: number, r: number, level: number, overrides: Partial<Hex> = {}): Hex => ({
  id: `${q},${r}`,
  q,
  r,
  currentLevel: level,
  maxLevel: level,
  progress: 0,
  revealed: true,
  structureType: 'NONE',
  ...overrides,
});

const buildGrid = (hexes: Hex[]): Record<string, Hex> => {
  const grid: Record<string, Hex> = {};
  for (const hex of hexes) {
    grid[`${hex.q},${hex.r}`] = hex;
  }
  return grid;
};

describe('calculateMovementCost', () => {
  describe('flat terrain costs', () => {
    it('single step to L0 hex costs 1 move point', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 5 });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 0),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.totalPoints).toBe(1);
      expect(result.canAfford).toBe(true);
    });

    it('single step to L1 hex costs 1 move point (L1 not > 1)', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 5 });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 1),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.totalPoints).toBe(1);
    });

    it('single step to negative hex costs 1 move point', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 5 });
      // Use -1 so height diff from L0 is only 1 (satisfies staircase rule)
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, -1),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.totalPoints).toBe(1);
    });
  });

  describe('high ground costs', () => {
    it('single step to L2 hex costs 2 move points', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      const grid = buildGrid([
        makeHex(0, 0, 1),
        makeHex(1, 0, 2),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.totalPoints).toBe(2);
      expect(result.canAfford).toBe(true);
    });

    it('single step to L3 hex costs 3 move points', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      const grid = buildGrid([
        makeHex(0, 0, 2),
        makeHex(1, 0, 3),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.totalPoints).toBe(3);
    });

    it('multi-step path accumulates costs correctly', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      // L0 -> L1 -> L2: costs 1 + 2 = 3
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 1),
        makeHex(2, 0, 2),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }, { q: 2, r: 0 }], grid);
      expect(result.totalPoints).toBe(3);
    });
  });

  describe('staircase rule (height diff > 1 is blocked)', () => {
    it('stepping from L0 to L2 is blocked (STEEP)', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 2),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.canAfford).toBe(false);
      expect(result.reason).toBe('STEEP');
    });

    it('stepping from L0 to L3 is blocked', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 3),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.canAfford).toBe(false);
      expect(result.reason).toBe('STEEP');
    });

    it('stepping down more than 1 level is also blocked (L3 to L1)', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      const grid = buildGrid([
        makeHex(0, 0, 3),
        makeHex(1, 0, 1),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.canAfford).toBe(false);
      expect(result.reason).toBe('STEEP');
    });

    it('stepping from L1 to L2 is allowed (diff = 1)', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      const grid = buildGrid([
        makeHex(0, 0, 1),
        makeHex(1, 0, 2),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.reason).not.toBe('STEEP');
    });
  });

  describe('VOID hex blocks movement', () => {
    it('stepping into a VOID hex returns canAfford=false with reason VOID', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 0, { structureType: 'VOID' }),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.canAfford).toBe(false);
      expect(result.reason).toBe('VOID');
    });
  });

  describe('impassable hex blocks movement', () => {
    it('stepping into an isPassable=false hex returns canAfford=false with reason BLOCKED', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 0, { isPassable: false }),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.canAfford).toBe(false);
      expect(result.reason).toBe('BLOCKED');
    });
  });

  describe('STATUS_FATIGUE doubles cost', () => {
    it('fatigue doubles move points for flat terrain', () => {
      const entity = makeEntity({
        q: 0, r: 0,
        moves: 10,
        activeStatuses: [{
          type: 'STATUS_FATIGUE',
          label: 'Fatigue',
          expiresAt: Date.now() + 60000, // expires in future
        }],
      });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 0),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      // Base cost 1 × fatigue multiplier 2 = 2
      expect(result.totalPoints).toBe(2);
    });

    it('fatigue doubles move points for L2 terrain', () => {
      const entity = makeEntity({
        q: 0, r: 0,
        moves: 10,
        activeStatuses: [{
          type: 'STATUS_FATIGUE',
          label: 'Fatigue',
          expiresAt: Date.now() + 60000,
        }],
      });
      const grid = buildGrid([
        makeHex(0, 0, 1),
        makeHex(1, 0, 2),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      // Base cost 2 × fatigue 2 = 4
      expect(result.totalPoints).toBe(4);
    });

    it('expired fatigue status has no effect', () => {
      const entity = makeEntity({
        q: 0, r: 0,
        moves: 10,
        activeStatuses: [{
          type: 'STATUS_FATIGUE',
          label: 'Fatigue',
          expiresAt: Date.now() - 1000, // already expired
        }],
      });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 0),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      // Expired, no multiplier
      expect(result.totalPoints).toBe(1);
    });
  });

  describe('coin exchange (insufficient moves)', () => {
    it('when moves are insufficient, uses coins at EXCHANGE_RATE_COINS_PER_MOVE', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 0, coins: 100 });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 0),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      // 1 move point needed, 0 moves → need 1 move from coins → 1 * 5 coins
      expect(result.deductMoves).toBe(0);
      expect(result.deductCoins).toBe(5);
      expect(result.canAfford).toBe(true);
    });

    it('canAfford is false when neither moves nor coins are sufficient', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 0, coins: 4 });
      const grid = buildGrid([
        makeHex(0, 0, 0),
        makeHex(1, 0, 0),
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      // Need 5 coins, only have 4
      expect(result.canAfford).toBe(false);
      expect(result.reason).toBe('INSUFFICIENT_FUNDS');
    });

    it('mixes moves and coins correctly when partially funded by moves', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 1, coins: 100 });
      const grid = buildGrid([
        makeHex(0, 0, 1),
        makeHex(1, 0, 2),
        makeHex(2, 0, 3),
      ]);
      // Step 1: L2 costs 2, Step 2: L3 costs 3 → total 5
      // With 1 move, deficit = 4, deductCoins = ceil(4 * 5) = 20
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }, { q: 2, r: 0 }], grid);
      expect(result.totalPoints).toBe(5);
      expect(result.deductMoves).toBe(1);
      expect(result.deductCoins).toBe(20);
    });
  });

  describe('empty path', () => {
    it('empty path costs 0 and is always affordable', () => {
      const entity = makeEntity({ q: 0, r: 0, moves: 0, coins: 0 });
      const grid = buildGrid([makeHex(0, 0, 0)]);
      const result = calculateMovementCost(entity, [], grid);
      expect(result.totalPoints).toBe(0);
      expect(result.canAfford).toBe(true);
    });
  });

  describe('currentLevel governs cost, not maxLevel', () => {
    it('hex with maxLevel=3 but currentLevel=1 costs 1 move point (governed by currentLevel)', () => {
      // A hex that was previously built to L3 then dug down to L1.
      // Movement cost uses currentLevel (1), not maxLevel (3).
      const entity = makeEntity({ q: 0, r: 0, moves: 10 });
      const grid = buildGrid([
        makeHex(0, 0, 2, { maxLevel: 2 }), // origin at maxLevel 2 so staircase allows step to maxLevel 3
        makeHex(1, 0, 1, { maxLevel: 3 }),  // target: currentLevel=1, maxLevel=3
      ]);
      const result = calculateMovementCost(entity, [{ q: 1, r: 0 }], grid);
      expect(result.totalPoints).toBe(1);
    });
  });
});
