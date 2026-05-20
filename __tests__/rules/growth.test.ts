import { checkGrowthCondition, checkDigCondition } from '../../rules/growth';
import { EntityType, EntityState } from '../../types';
import type { Hex, Entity } from '../../types';

// Helper factories
const makeEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'test-entity',
  type: EntityType.PLAYER,
  state: EntityState.IDLE,
  q: 0,
  r: 0,
  playerLevel: 0,
  coins: 100,
  totalCoinsEarned: 0,
  moves: 5,
  recentUpgrades: [],
  storage: 1, // Has material by default
  maxStorage: 5,
  inventory: [],
  activeStatuses: [],
  movementQueue: [],
  headIndex: 0,
  bodyIndex: 0,
  ...overrides,
});

const makeHex = (q: number, r: number, level: number, maxLevel?: number, overrides: Partial<Hex> = {}): Hex => ({
  id: `${q},${r}`,
  q,
  r,
  currentLevel: level,
  maxLevel: maxLevel ?? level,
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

// Empty neighbors (no neighbors in grid)
const NO_NEIGHBORS: { q: number; r: number }[] = [];

describe('checkGrowthCondition', () => {
  describe('null/invalid hex', () => {
    it('returns canGrow=false for null hex', () => {
      const entity = makeEntity();
      const result = checkGrowthCondition(null, entity, NO_NEIGHBORS, {});
      expect(result.canGrow).toBe(false);
      expect(result.reason).toBe('Invalid Hex');
    });
  });

  describe('MONUMENT / indestructible hex', () => {
    it('cannot upgrade a MONUMENT hex', () => {
      const hex = makeHex(0, 0, 1, 1, { structureType: 'MONUMENT' });
      const entity = makeEntity({ storage: 5 });
      const result = checkGrowthCondition(hex, entity, NO_NEIGHBORS, {});
      expect(result.canGrow).toBe(false);
      expect(result.reason).toContain('ANCIENT');
    });

    it('cannot upgrade an indestructible hex', () => {
      const hex = makeHex(0, 0, 0, 0, { isIndestructible: true } as Partial<Hex>);
      const entity = makeEntity({ storage: 5 });
      const result = checkGrowthCondition(hex, entity, NO_NEIGHBORS, {});
      expect(result.canGrow).toBe(false);
    });
  });

  describe('material requirement (L0 → L1)', () => {
    it('can upgrade L0 → L1 with 1 material', () => {
      const hex = makeHex(0, 0, 0, 0);
      const entity = makeEntity({ storage: 1 });
      const result = checkGrowthCondition(hex, entity, NO_NEIGHBORS, {});
      expect(result.canGrow).toBe(true);
    });

    it('cannot upgrade L0 → L1 without material', () => {
      const hex = makeHex(0, 0, 0, 0);
      const entity = makeEntity({ storage: 0 });
      const result = checkGrowthCondition(hex, entity, NO_NEIGHBORS, {});
      expect(result.canGrow).toBe(false);
      expect(result.reason).toContain('MATERIAL');
    });
  });

  describe('neighbor support requirement (L1 → L2+)', () => {
    it('can upgrade L1 → L2 with 2 neighbors at maxLevel 2', () => {
      // hex at (0,0) currently L1, targetLevel=2; upgrading to L2
      const hex = makeHex(0, 0, 1, 1);
      const entity = makeEntity({ storage: 2, playerLevel: 1 });

      // Two neighbors at maxLevel == targetLevel (2)
      const n1 = makeHex(1, 0, 2, 2);
      const n2 = makeHex(-1, 0, 2, 2);
      const neighbors = [{ q: 1, r: 0 }, { q: -1, r: 0 }];
      const grid = buildGrid([hex, n1, n2]);

      const result = checkGrowthCondition(hex, entity, neighbors, grid);
      expect(result.canGrow).toBe(true);
    });

    it('cannot upgrade L1 → L2 with only 1 neighbor at maxLevel 2', () => {
      const hex = makeHex(0, 0, 1, 1);
      const entity = makeEntity({ storage: 2, playerLevel: 1 });

      const n1 = makeHex(1, 0, 2, 2); // one matching neighbor
      const n2 = makeHex(-1, 0, 0, 0); // wrong level
      const neighbors = [{ q: 1, r: 0 }, { q: -1, r: 0 }];
      const grid = buildGrid([hex, n1, n2]);

      const result = checkGrowthCondition(hex, entity, neighbors, grid);
      expect(result.canGrow).toBe(false);
      expect(result.reason).toContain('UNSTABLE');
    });

    it('cannot upgrade L1 → L2 with zero matching neighbors', () => {
      const hex = makeHex(0, 0, 1, 1);
      const entity = makeEntity({ storage: 2, playerLevel: 1 });
      // Neighbors at different levels
      const n1 = makeHex(1, 0, 0, 0);
      const n2 = makeHex(-1, 0, 1, 1);
      const neighbors = [{ q: 1, r: 0 }, { q: -1, r: 0 }];
      const grid = buildGrid([hex, n1, n2]);

      const result = checkGrowthCondition(hex, entity, neighbors, grid);
      expect(result.canGrow).toBe(false);
    });

    it('valley exception: 5+ high-level neighbors bypass support check', () => {
      const hex = makeHex(0, 0, 1, 1);
      const entity = makeEntity({ storage: 2, playerLevel: 1 });

      // 5 neighbors all at maxLevel > targetLevel (they are L3 to hex's target L2)
      const neighbors = [
        { q: 1, r: 0 },
        { q: -1, r: 0 },
        { q: 0, r: 1 },
        { q: 0, r: -1 },
        { q: 1, r: -1 },
        { q: -1, r: 1 },
      ];
      const grid = buildGrid([
        hex,
        makeHex(1, 0, 3, 3),
        makeHex(-1, 0, 3, 3),
        makeHex(0, 1, 3, 3),
        makeHex(0, -1, 3, 3),
        makeHex(1, -1, 3, 3),
        makeHex(-1, 1, 3, 3),
      ]);

      const result = checkGrowthCondition(hex, entity, neighbors, grid);
      // All 6 neighbors are at maxLevel=3 > targetLevel=2 → valley
      expect(result.canGrow).toBe(true);
    });

    it('valley exception: exactly 5 matching neighbors → canGrow: true (>= 5 threshold)', () => {
      const hex = makeHex(0, 0, 1, 1);
      const entity = makeEntity({ storage: 2, playerLevel: 1 });

      // 5 high-level neighbors + 1 same-level neighbor (not high level)
      const neighbors = [
        { q: 1, r: 0 },
        { q: -1, r: 0 },
        { q: 0, r: 1 },
        { q: 0, r: -1 },
        { q: 1, r: -1 },
        { q: -1, r: 1 },
      ];
      const grid = buildGrid([
        hex,
        makeHex(1, 0, 3, 3),   // high-level
        makeHex(-1, 0, 3, 3),  // high-level
        makeHex(0, 1, 3, 3),   // high-level
        makeHex(0, -1, 3, 3),  // high-level
        makeHex(1, -1, 3, 3),  // high-level
        makeHex(-1, 1, 2, 2),  // same level — NOT a high-level neighbor
      ]);

      const result = checkGrowthCondition(hex, entity, neighbors, grid);
      // 5 neighbors at maxLevel=3 > targetLevel=2 → valley exception passes
      expect(result.canGrow).toBe(true);
    });

    it('4 high-level neighbors + 0 same-level neighbors → canGrow: true (passes support check via high-level neighbors)', () => {
      const hex = makeHex(0, 0, 1, 1);
      const entity = makeEntity({ storage: 2, playerLevel: 1 });

      // Support check requires 2 neighbors at maxLevel >= targetLevel (2).
      // Here we have 4 high-level neighbors, so this resolves to true immediately.
      // (The valley bypass is actually redundant unless the rules change to ==!).
      const neighbors = [
        { q: 1, r: 0 },
        { q: -1, r: 0 },
        { q: 0, r: 1 },
        { q: 0, r: -1 },
        { q: 1, r: -1 },
        { q: -1, r: 1 },
      ];
      const grid = buildGrid([
        hex,
        makeHex(1, 0, 3, 3),   // high-level (support)
        makeHex(-1, 0, 3, 3),  // high-level (support)
        makeHex(0, 1, 3, 3),   // high-level (support)
        makeHex(0, -1, 3, 3),  // high-level (support)
        makeHex(1, -1, 0, 0),  // lower level
        makeHex(-1, 1, 0, 0),  // lower level
      ]);

      const result = checkGrowthCondition(hex, entity, neighbors, grid);
      expect(result.canGrow).toBe(true);
    });
  });

  describe('VOID hex cannot be upgraded', () => {
    it('VOID neighbor is excluded from support count', () => {
      const hex = makeHex(0, 0, 1, 1);
      const entity = makeEntity({ storage: 2, playerLevel: 1 });
      // Only "valid" neighbor is at correct level, but VOID neighbors don't count
      const n1 = makeHex(1, 0, 1, 1, { structureType: 'VOID' });
      const n2 = makeHex(-1, 0, 1, 1, { structureType: 'VOID' });
      const neighbors = [{ q: 1, r: 0 }, { q: -1, r: 0 }];
      const grid = buildGrid([hex, n1, n2]);

      const result = checkGrowthCondition(hex, entity, neighbors, grid);
      // Both neighbors are VOID, so 0 supports → cannot grow
      expect(result.canGrow).toBe(false);
    });
  });
});

describe('checkDigCondition', () => {
  describe('indestructible structures', () => {
    it('cannot dig a MONUMENT hex', () => {
      const hex = makeHex(0, 0, 1, 1, { structureType: 'MONUMENT' });
      const entity = makeEntity();
      const result = checkDigCondition(hex, entity, NO_NEIGHBORS, {});
      expect(result.canGrow).toBe(false);
      expect(result.reason).toContain('INDESTRUCTIBLE');
    });

    it('cannot dig an isIndestructible hex', () => {
      const hex = makeHex(0, 0, 1, 1, { isIndestructible: true } as Partial<Hex>);
      const entity = makeEntity();
      const result = checkDigCondition(hex, entity, NO_NEIGHBORS, {});
      expect(result.canGrow).toBe(false);
    });
  });

  describe('gradient lock (high ground rule)', () => {
    it('can dig L2 when neighbors are at L0 (result L1 > L0)', () => {
      const hex = makeHex(0, 0, 2, 2);
      const entity = makeEntity();
      const n1 = makeHex(1, 0, 0, 0);
      const neighbors = [{ q: 1, r: 0 }];
      const grid = buildGrid([hex, n1]);

      // Dig to L1 (targetLevel=1). Min neighbor = 0. 1 > 0 → OK
      const result = checkDigCondition(hex, entity, neighbors, grid);
      expect(result.canGrow).toBe(true);
    });

    it('can dig L1 when neighbors are at L0 (exception: L1 can be dug to L0 without support)', () => {
      const hex = makeHex(0, 0, 1, 1);
      const entity = makeEntity();
      const n1 = makeHex(1, 0, 0, 0);
      const neighbors = [{ q: 1, r: 0 }];
      const grid = buildGrid([hex, n1]);

      // Dig to L0 (targetLevel=0). L1 to L0 doesn't check gradient lock/support anymore.
      const result = checkDigCondition(hex, entity, neighbors, grid);
      expect(result.canGrow).toBe(true);
    });
  });

  describe('first cut exception', () => {
    it('can dig L0 to -1 (first cut always allowed)', () => {
      const hex = makeHex(0, 0, 0, 0);
      const entity = makeEntity();
      // targetLevel = -1 >= -1 → first cut OK
      const result = checkDigCondition(hex, entity, NO_NEIGHBORS, {});
      expect(result.canGrow).toBe(true);
    });
  });

  describe('deep digging (reverse staircase rule)', () => {
    it('cannot dig -1 to -2 without 2 neighbors at same depth (-1)', () => {
      const hex = makeHex(0, 0, -1, 0);
      const entity = makeEntity();
      // No neighbors at same depth → unstable
      const result = checkDigCondition(hex, entity, NO_NEIGHBORS, {});
      expect(result.canGrow).toBe(false);
      expect(result.reason).toContain('UNSTABLE');
    });

    it('can dig -1 to -2 with 2 neighbors at depth -1', () => {
      const hex = makeHex(0, 0, -1, 0);
      const entity = makeEntity();
      const n1 = makeHex(1, 0, -1, 0);
      const n2 = makeHex(-1, 0, -1, 0);
      const neighbors = [{ q: 1, r: 0 }, { q: -1, r: 0 }];
      const grid = buildGrid([hex, n1, n2]);

      const result = checkDigCondition(hex, entity, neighbors, grid);
      expect(result.canGrow).toBe(true);
    });

    it('cannot dig -2 to -3 without enough support at -2', () => {
      const hex = makeHex(0, 0, -2, 0);
      const entity = makeEntity();
      // Only 1 neighbor at same depth → unstable
      const n1 = makeHex(1, 0, -2, 0);
      const neighbors = [{ q: 1, r: 0 }];
      const grid = buildGrid([hex, n1]);

      const result = checkDigCondition(hex, entity, neighbors, grid);
      expect(result.canGrow).toBe(false);
      expect(result.reason).toContain('UNSTABLE');
    });
  });
});
