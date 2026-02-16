
import { Item, ItemRarity } from '../types';
import { getRandomItem } from './items';

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

export const rollForLoot = (depth: number, language: 'EN' | 'RU' = 'EN'): LootResult => {
    // Depth is expected to be negative (e.g. -1, -5). We use absolute value for calculation.
    const d = Math.abs(depth);
    if (d === 0) return { type: 'NONE' };

    const rand = Math.random();

    // 1. CALCULATE DROP CHANCE (Finding ANYTHING)
    // -1: 20%, -2: 30% ... -9: 100%
    let dropChance = Math.min(1.0, 0.10 + (d * 0.10)); 
    
    // Check if we found anything at all
    if (rand > dropChance) return { type: 'NONE' };

    // 2. WEIGHTED RARITY DISTRIBUTION
    // We use a weight system where weights sum to 100
    let weights = { common: 0, uncommon: 0, rare: 0, legendary: 0 };

    switch (d) {
        case 1: weights = { common: 69, uncommon: 20, rare: 10, legendary: 1 }; break;
        case 2: weights = { common: 55, uncommon: 30, rare: 13, legendary: 2 }; break;
        case 3: weights = { common: 45, uncommon: 35, rare: 17, legendary: 3 }; break;
        case 4: weights = { common: 30, uncommon: 40, rare: 25, legendary: 5 }; break;
        case 5: weights = { common: 15, uncommon: 40, rare: 35, legendary: 10 }; break;
        case 6: weights = { common: 5,  uncommon: 30, rare: 45, legendary: 20 }; break;
        case 7: weights = { common: 0,  uncommon: 20, rare: 50, legendary: 30 }; break;
        case 8: weights = { common: 0,  uncommon: 10, rare: 40, legendary: 50 }; break;
        case 9: weights = { common: 0,  uncommon: 0,  rare: 20, legendary: 80 }; break;
        default: weights = { common: 0, uncommon: 0,  rare: 0,  legendary: 100 }; break; // -10+
    }

    const rarityRoll = Math.random() * 100;
    let rarity: ItemRarity = 'COMMON';

    // Determine Rarity Bucket
    if (rarityRoll < weights.common) {
        rarity = 'COMMON';
    } else if (rarityRoll < weights.common + weights.uncommon) {
        rarity = 'UNCOMMON';
    } else if (rarityRoll < weights.common + weights.uncommon + weights.rare) {
        rarity = 'RARE';
    } else {
        rarity = 'LEGENDARY';
    }

    // 3. COMMON LOGIC: COINS vs ITEMS
    // Common tier is mostly coins (60%), sometimes items (40%)
    if (rarity === 'COMMON') {
        const coinRoll = Math.random();
        if (coinRoll < 0.60) {
            // Coins scale slightly with depth
            const baseCoins = 5;
            const depthBonus = (d - 1) * 2;
            return { type: 'COIN', amount: baseCoins + depthBonus };
        }
    }

    // 4. GENERATE ITEM
    return { type: 'ITEM', item: getRandomItem(rarity, language) };
};
