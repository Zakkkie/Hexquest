
import { Item, ItemRarity } from '../types';

export type LootResult = 
    | { type: 'NONE' }
    | { type: 'COIN'; amount: number }
    | { type: 'ITEM'; item: Item };

export const LOOT_COLORS: Record<ItemRarity, string> = {
    COMMON: '#94a3b8',   // Slate-400
    UNCOMMON: '#4ade80', // Green-400
    RARE: '#a855f7',     // Purple-500
    LEGENDARY: '#f97316' // Orange-500
};

const generateItem = (rarity: ItemRarity): Item => {
    return {
        id: `item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        rarity,
        name: `${rarity} Gem`,
        value: rarity === 'LEGENDARY' ? 500 : (rarity === 'RARE' ? 200 : (rarity === 'UNCOMMON' ? 50 : 10)),
        timestamp: Date.now()
    };
};

export const rollForLoot = (depth: number): LootResult => {
    // Depth is expected to be negative (e.g. -1, -5). We use Math.abs
    const d = Math.abs(depth);
    if (d === 0) return { type: 'NONE' };

    const rand = Math.random();

    // 1. DROP CHANCE based on Depth
    let dropChance = 0;
    if (d === 1) dropChance = 0.10;
    else if (d === 2) dropChance = 0.25;
    else if (d === 3) dropChance = 0.33;
    else if (d === 4) dropChance = 0.50;
    else if (d === 5) dropChance = 0.60;
    else if (d === 6) dropChance = 0.70;
    else if (d === 7) dropChance = 0.80;
    else if (d === 8) dropChance = 0.90;
    else if (d >= 9) dropChance = 1.00;

    if (rand > dropChance) return { type: 'NONE' };

    // 2. RARITY TABLE
    // Roll again for type/rarity distribution
    const roll = Math.random();

    if (d === 1) {
        // Reward: 5 coins or COMMON
        return roll < 0.5 
            ? { type: 'COIN', amount: 5 }
            : { type: 'ITEM', item: generateItem('COMMON') };
    }

    if (d === 2) {
        // COMMON (high) or UNCOMMON (low)
        return { type: 'ITEM', item: generateItem(roll < 0.8 ? 'COMMON' : 'UNCOMMON') };
    }

    if (d === 3) {
        // COMMON or UNCOMMON (Equal)
        return { type: 'ITEM', item: generateItem(roll < 0.5 ? 'COMMON' : 'UNCOMMON') };
    }

    if (d === 4) {
        // UNCOMMON (high), COMMON (low), RARE (rare)
        if (roll < 0.6) return { type: 'ITEM', item: generateItem('UNCOMMON') };
        if (roll < 0.9) return { type: 'ITEM', item: generateItem('COMMON') };
        return { type: 'ITEM', item: generateItem('RARE') };
    }

    if (d === 5) {
        // UNCOMMON or RARE (Equal)
        return { type: 'ITEM', item: generateItem(roll < 0.5 ? 'UNCOMMON' : 'RARE') };
    }

    if (d === 6) {
        // ONLY RARE
        return { type: 'ITEM', item: generateItem('RARE') };
    }

    if (d === 7) {
        // RARE (High) or LEGENDARY (Low)
        return { type: 'ITEM', item: generateItem(roll < 0.85 ? 'RARE' : 'LEGENDARY') };
    }

    if (d === 8) {
        // RARE or LEGENDARY (Equal)
        return { type: 'ITEM', item: generateItem(roll < 0.5 ? 'RARE' : 'LEGENDARY') };
    }

    // d >= 9
    return { type: 'ITEM', item: generateItem('LEGENDARY') };
};
