
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

    // 1. CALCULATE DROP CHANCE (Based on Depth)
    // Deeper = Higher chance to find SOMETHING
    let dropChance = 0;
    if (d === 1) dropChance = 0.15;      // 15%
    else if (d === 2) dropChance = 0.30; // 30%
    else if (d === 3) dropChance = 0.45; // 45%
    else if (d === 4) dropChance = 0.60; // 60%
    else if (d === 5) dropChance = 0.70; // 70%
    else if (d === 6) dropChance = 0.80; // 80%
    else if (d === 7) dropChance = 0.90; // 90%
    else if (d >= 8) dropChance = 1.00;  // 100%

    // If check fails, no loot
    if (rand > dropChance) return { type: 'NONE' };

    // 2. DETERMINE RARITY (Based on Depth)
    // Strictly determine the rarity bucket first, before picking the item.
    const roll = Math.random();
    let rarity: ItemRarity = 'COMMON';

    // Depth 1: Mostly Coins or Common junk
    if (d === 1) {
        return roll < 0.6 ? { type: 'COIN', amount: 5 } : { type: 'ITEM', item: getRandomItem('COMMON', language) };
    }

    // Depth 2: Common (80%), Uncommon (20%)
    else if (d === 2) {
        if (roll < 0.80) rarity = 'COMMON';
        else rarity = 'UNCOMMON';
    }
    
    // Depth 3: Common (50%), Uncommon (50%)
    else if (d === 3) {
        if (roll < 0.50) rarity = 'COMMON';
        else rarity = 'UNCOMMON';
    }

    // Depth 4: Common (30%), Uncommon (50%), Rare (20%)
    else if (d === 4) {
        if (roll < 0.30) rarity = 'COMMON';
        else if (roll < 0.80) rarity = 'UNCOMMON';
        else rarity = 'RARE';
    }

    // Depth 5: Common (10%), Uncommon (50%), Rare (40%)
    else if (d === 5) {
        if (roll < 0.10) rarity = 'COMMON';
        else if (roll < 0.60) rarity = 'UNCOMMON';
        else rarity = 'RARE';
    }

    // Depth 6: Uncommon (40%), Rare (60%)
    else if (d === 6) {
        if (roll < 0.40) rarity = 'UNCOMMON';
        else rarity = 'RARE';
    }

    // Depth 7: Uncommon (20%), Rare (60%), Legendary (20%)
    else if (d === 7) {
        if (roll < 0.20) rarity = 'UNCOMMON';
        else if (roll < 0.80) rarity = 'RARE';
        else rarity = 'LEGENDARY';
    }

    // Depth 8: Rare (50%), Legendary (50%)
    else if (d === 8) {
        if (roll < 0.50) rarity = 'RARE';
        else rarity = 'LEGENDARY';
    }

    // Depth 9+: Always Legendary
    else {
        rarity = 'LEGENDARY';
    }

    // 3. SELECT RANDOM ITEM OF DETERMINED RARITY
    return { type: 'ITEM', item: getRandomItem(rarity, language) };
};
