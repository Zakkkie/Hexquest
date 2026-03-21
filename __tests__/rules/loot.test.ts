import { rollForLoot } from '../../rules/loot';

describe('rollForLoot', () => {
  describe('depth 0', () => {
    it('always returns NONE', () => {
      for (let i = 0; i < 100; i++) {
        const result = rollForLoot(0);
        expect(result.type).toBe('NONE');
      }
    });

    it('works with negative zero (abs(0) = 0)', () => {
      const result = rollForLoot(-0);
      expect(result.type).toBe('NONE');
    });
  });

  describe('result type validity', () => {
    it('only returns valid types', () => {
      const validTypes = new Set(['NONE', 'COIN', 'ITEM']);
      for (let depth = 1; depth <= 12; depth++) {
        for (let i = 0; i < 50; i++) {
          const result = rollForLoot(depth);
          expect(validTypes.has(result.type)).toBe(true);
        }
      }
    });

    it('accepts negative depths (uses abs value)', () => {
      // Negative depths are the canonical form — abs() is applied internally
      const validTypes = new Set(['NONE', 'COIN', 'ITEM']);
      for (let i = 0; i < 50; i++) {
        const result = rollForLoot(-5);
        expect(validTypes.has(result.type)).toBe(true);
      }
    });
  });

  describe('drop chance by depth', () => {
    // Helper: roll many times and count non-NONE results
    const measureDropRate = (depth: number, iterations = 2000): number => {
      let drops = 0;
      for (let i = 0; i < iterations; i++) {
        if (rollForLoot(depth).type !== 'NONE') drops++;
      }
      return drops / iterations;
    };

    it('depth 1 has ~20% drop chance', () => {
      const rate = measureDropRate(1, 3000);
      // Expected 0.20, allow ±0.08 tolerance
      expect(rate).toBeGreaterThan(0.12);
      expect(rate).toBeLessThan(0.28);
    });

    it('depth 5 has ~60% drop chance', () => {
      const rate = measureDropRate(5, 3000);
      expect(rate).toBeGreaterThan(0.52);
      expect(rate).toBeLessThan(0.68);
    });

    it('depth 9 has ~100% drop chance', () => {
      const rate = measureDropRate(9, 1000);
      // d=9 → dropChance = min(1, 0.10 + 9*0.10) = 1.0 (exactly 100%)
      expect(rate).toBe(1.0);
    });

    it('depth 10+ has 100% drop chance', () => {
      const rate = measureDropRate(10, 1000);
      expect(rate).toBe(1.0);
    });

    it('drop chance increases with depth (1 < 3 < 6 < 9)', () => {
      const r1 = measureDropRate(1, 3000);
      const r3 = measureDropRate(3, 3000);
      const r6 = measureDropRate(6, 3000);
      const r9 = measureDropRate(9, 2000);
      expect(r1).toBeLessThan(r3);
      expect(r3).toBeLessThan(r6);
      expect(r6).toBeLessThan(r9);
    });
  });

  describe('COIN amounts', () => {
    it.each([
      [1, 5,  'base 5, bonus 0'],
      [2, 7,  'base 5 + 1*2'],
      [4, 11, 'base 5 + 3*2'],
    ])('COIN amount at depth %d is %d (%s)', (depth, expected) => {
      let found = false;
      for (let i = 0; i < 5000; i++) {
        const result = rollForLoot(depth);
        if (result.type === 'COIN') {
          expect(result.amount).toBe(expected);
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });

    it('COIN formula: amount = 5 + (depth - 1) * 2', () => {
      for (let d = 1; d <= 5; d++) {
        const expected = 5 + (d - 1) * 2;
        let found = false;
        for (let i = 0; i < 5000; i++) {
          const result = rollForLoot(d);
          if (result.type === 'COIN') {
            expect(result.amount).toBe(expected);
            found = true;
            break;
          }
        }
        expect(found).toBe(true);
      }
    });
  });

  describe('rarity distribution', () => {
    // Roll N times and collect rarities of ITEM results
    const measureRarities = (depth: number, iterations = 3000) => {
      const counts = { COMMON: 0, UNCOMMON: 0, RARE: 0, LEGENDARY: 0 };
      let itemCount = 0;
      for (let i = 0; i < iterations; i++) {
        const result = rollForLoot(depth);
        if (result.type === 'ITEM') {
          itemCount++;
          counts[result.item.rarity]++;
        }
      }
      return { counts, itemCount };
    };

    it('depth 1: mostly COMMON items among item drops', () => {
      const { counts, itemCount } = measureRarities(1, 5000);
      if (itemCount > 20) {
        const commonFrac = counts.COMMON / itemCount;
        // Weights: common 69% (minus 60% coin split = 40% item), still majority
        expect(commonFrac).toBeGreaterThan(0.3);
      }
    });

    it('depth 9: mostly LEGENDARY among item drops', () => {
      // d=9: 100% drop, weights: rare 30%, legendary 70%, no common/uncommon
      const { counts, itemCount } = measureRarities(9, 3000);
      expect(itemCount).toBeGreaterThan(0);
      const legendaryFrac = counts.LEGENDARY / itemCount;
      // At d=9 all ITEM results must be RARE or LEGENDARY (common=0, uncommon=0)
      expect(counts.COMMON).toBe(0);
      expect(counts.UNCOMMON).toBe(0);
      expect(legendaryFrac).toBeGreaterThan(0.5);
    });

    it('depth 7: no COMMON item drops', () => {
      // weights at d=7: common=0
      const { counts } = measureRarities(7, 3000);
      expect(counts.COMMON).toBe(0);
    });

    it('depth 10+: only LEGENDARY items (or RARE from weights)', () => {
      // default weights: rare 10%, legendary 90%
      const { counts, itemCount } = measureRarities(10, 3000);
      if (itemCount > 10) {
        expect(counts.COMMON).toBe(0);
        expect(counts.UNCOMMON).toBe(0);
        const legendaryFrac = counts.LEGENDARY / itemCount;
        expect(legendaryFrac).toBeGreaterThan(0.7);
      }
    });
  });

  describe('ITEM results have valid structure', () => {
    it('ITEM results have all required fields', () => {
      // Keep rolling until we get an ITEM
      for (let i = 0; i < 10000; i++) {
        const result = rollForLoot(9); // depth 9 = 100% drop, all items
        if (result.type === 'ITEM') {
          const item = result.item;
          expect(item).toHaveProperty('id');
          expect(item).toHaveProperty('rarity');
          expect(item).toHaveProperty('name');
          expect(item).toHaveProperty('description');
          expect(item).toHaveProperty('effectType');
          expect(item).toHaveProperty('effectValue');
          expect(typeof item.id).toBe('string');
          expect(typeof item.name).toBe('string');
          break;
        }
      }
    });
  });

  describe('language parameter', () => {
    it('accepts RU language', () => {
      const validTypes = new Set(['NONE', 'COIN', 'ITEM']);
      for (let i = 0; i < 100; i++) {
        const result = rollForLoot(9, 'RU');
        expect(validTypes.has(result.type)).toBe(true);
      }
    });
  });
});
