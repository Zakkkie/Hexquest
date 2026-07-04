import { getRandomItem, ITEM_REGISTRY } from '../../../rules/items';
import type { ItemRarity } from '../../../types';

describe('ITEM_REGISTRY', () => {
  it('contains items', () => {
    expect(ITEM_REGISTRY.length).toBeGreaterThan(0);
  });

  it('every item definition has required fields', () => {
    for (const def of ITEM_REGISTRY) {
      expect(def).toHaveProperty('idPrefix');
      expect(def).toHaveProperty('rarity');
      expect(def).toHaveProperty('name');
      expect(def).toHaveProperty('description');
      expect(def).toHaveProperty('effectType');
      expect(def).toHaveProperty('effectValue');
      expect(def).toHaveProperty('negativeEffectType');

      expect(typeof def.idPrefix).toBe('string');
      expect(def.idPrefix.length).toBeGreaterThan(0);

      expect(def.name).toHaveProperty('EN');
      expect(def.name).toHaveProperty('RU');
      expect(typeof def.name.EN).toBe('string');
      expect(typeof def.name.RU).toBe('string');

      expect(def.description).toHaveProperty('EN');
      expect(def.description).toHaveProperty('RU');
    }
  });

  it('all rarities are valid values', () => {
    const validRarities = new Set<ItemRarity>(['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY']);
    for (const def of ITEM_REGISTRY) {
      expect(validRarities.has(def.rarity)).toBe(true);
    }
  });

  it('contains at least one item per rarity', () => {
    const rarities: ItemRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'];
    for (const rarity of rarities) {
      const count = ITEM_REGISTRY.filter(i => i.rarity === rarity).length;
      expect(count).toBeGreaterThan(0);
    }
  });

  it('contains known LEGENDARY items (chronos_core, void_shard)', () => {
    const ids = ITEM_REGISTRY.map(i => i.idPrefix);
    expect(ids).toContain('chronos_core');
    expect(ids).toContain('void_shard');
  });

  it('idPrefix values are unique', () => {
    const ids = ITEM_REGISTRY.map(i => i.idPrefix);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe('getRandomItem', () => {
  describe('returns valid Item structure', () => {
    it('returns an item with all required fields for COMMON', () => {
      const item = getRandomItem('COMMON', 'EN');
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('rarity');
      expect(item).toHaveProperty('name');
      expect(item).toHaveProperty('description');
      expect(item).toHaveProperty('effectType');
      expect(item).toHaveProperty('effectValue');
      expect(item).toHaveProperty('negativeEffectType');
    });

    it('returned id is a non-empty string', () => {
      const item = getRandomItem('COMMON', 'EN');
      expect(typeof item.id).toBe('string');
      expect(item.id.length).toBeGreaterThan(0);
    });

    it('returned name is a non-empty string', () => {
      const item = getRandomItem('COMMON', 'EN');
      expect(typeof item.name).toBe('string');
      expect(item.name.length).toBeGreaterThan(0);
    });

    it('returned description is a string', () => {
      const item = getRandomItem('COMMON', 'EN');
      expect(typeof item.description).toBe('string');
    });

    it('effectValue is a number', () => {
      const item = getRandomItem('COMMON', 'EN');
      expect(typeof item.effectValue).toBe('number');
    });
  });

  describe('rarity matching', () => {
    it('COMMON rarity returns a COMMON item', () => {
      for (let i = 0; i < 20; i++) {
        const item = getRandomItem('COMMON', 'EN');
        expect(item.rarity).toBe('COMMON');
      }
    });

    it('UNCOMMON rarity returns an UNCOMMON item', () => {
      for (let i = 0; i < 20; i++) {
        const item = getRandomItem('UNCOMMON', 'EN');
        expect(item.rarity).toBe('UNCOMMON');
      }
    });

    it('RARE rarity returns a RARE item', () => {
      for (let i = 0; i < 20; i++) {
        const item = getRandomItem('RARE', 'EN');
        expect(item.rarity).toBe('RARE');
      }
    });

    it('LEGENDARY rarity returns a LEGENDARY item', () => {
      for (let i = 0; i < 20; i++) {
        const item = getRandomItem('LEGENDARY', 'EN');
        expect(item.rarity).toBe('LEGENDARY');
      }
    });
  });

  describe('language handling', () => {
    it('EN language returns English strings', () => {
      // Run enough times to get items with names from registry
      const seenNames = new Set<string>();
      for (let i = 0; i < 20; i++) {
        const item = getRandomItem('COMMON', 'EN');
        seenNames.add(item.name);
      }
      // All EN names from registry for COMMON — verify they exist in registry as EN names
      const registryEnNames = ITEM_REGISTRY
        .filter(d => d.rarity === 'COMMON')
        .map(d => d.name.EN);
      for (const name of seenNames) {
        expect(registryEnNames).toContain(name);
      }
    });

    it('RU language returns Russian strings', () => {
      const seenNames = new Set<string>();
      for (let i = 0; i < 30; i++) {
        const item = getRandomItem('COMMON', 'RU');
        seenNames.add(item.name);
      }
      const registryRuNames = ITEM_REGISTRY
        .filter(d => d.rarity === 'COMMON')
        .map(d => d.name.RU);
      for (const name of seenNames) {
        expect(registryRuNames).toContain(name);
      }
    });

    it('EN and RU may produce different names for the same item slot', () => {
      // Find a registry item that has different EN and RU names
      const hasTranslation = ITEM_REGISTRY.some(d => d.name.EN !== d.name.RU);
      expect(hasTranslation).toBe(true);
    });
  });

  describe('unique IDs', () => {
    it('each call produces a unique id', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 50; i++) {
        const item = getRandomItem('COMMON', 'EN');
        ids.add(item.id);
      }
      // Synchronous calls must never collide — all 50 ids should be distinct
      expect(ids.size).toBe(50);
    });
  });

  describe('baseId field', () => {
    it('returned item has baseId matching a registry idPrefix', () => {
      const registryIds = ITEM_REGISTRY.map(d => d.idPrefix);
      const item = getRandomItem('LEGENDARY', 'EN');
      expect(registryIds).toContain(item.baseId);
    });

    it('baseId corresponds to correct rarity', () => {
      for (const rarity of ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'] as ItemRarity[]) {
        const item = getRandomItem(rarity, 'EN');
        const def = ITEM_REGISTRY.find(d => d.idPrefix === item.baseId);
        expect(def).toBeDefined();
        expect(def!.rarity).toBe(rarity);
      }
    });
  });

  describe('visualType and timestamp fields', () => {
    it('returned item has visualType as a string and timestamp as a number', () => {
      for (const rarity of ['COMMON', 'UNCOMMON', 'RARE', 'LEGENDARY'] as ItemRarity[]) {
        const item = getRandomItem(rarity, 'EN');
        expect(typeof item.visualType).toBe('string');
        expect(typeof item.timestamp).toBe('number');
      }
    });
  });
});
