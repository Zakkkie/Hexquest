import { GameStore } from './types.ts';
import { getHexKey } from '../services/hexUtils.ts';
import { CampaignUpgrades } from '../types.ts';

export const createCampaignSlice = (
  set: (fn: (state: GameStore) => Partial<GameStore>) => void
) => ({
  setCampaignMode: (mode: 'STORY' | 'LEVELS') => set(() => ({ campaignMode: mode })),
  
  setSkillPoints: (points: number) => set(() => ({ skillPoints: points })),
  
  updateCampaignUpgrades: (partial: Partial<CampaignUpgrades>) => set((state) => ({
    campaignUpgrades: { ...state.campaignUpgrades, ...partial }
  })),
  
  // --- STORY MODE ACTION IMPLEMENTATIONS ---
  addCollectedHexes: (hexes: Record<number, number>) => set((state) => {
    const newCollected = { ...state.collectedHexes };
    for (const [level, count] of Object.entries(hexes)) {
      const lvl = Number(level);
      if (isNaN(lvl)) continue;
      newCollected[lvl] = (newCollected[lvl] || 0) + count;
    }
    return { collectedHexes: newCollected };
  }),
  
  addMinedHexes: (hexes: Record<number, number>) => set((state) => {
    const newMined = { ...state.minedInSessionHexes };
    for (const [level, count] of Object.entries(hexes)) {
      const lvl = Number(level);
      if (isNaN(lvl)) continue;
      newMined[lvl] = (newMined[lvl] || 0) + count;
    }
    return { minedInSessionHexes: newMined };
  }),
  
  placeStoryHex: (q: number, r: number, level: number) => set((state) => {
    const key = getHexKey(q, r);
    
    const prevLevel = state.storyMap[key];
    const hasPrev = prevLevel !== undefined && prevLevel >= 0;

    const newCollected = { ...state.collectedHexes } as any;
    const newMined = { ...state.minedInSessionHexes };

    // 1. DEDUCT: If placing/upgrading to a level (level !== -999)
    if (level !== -999) {
      const currentCountCollected = state.collectedHexes[level] || (state.collectedHexes as any)[String(level)] || 0;
      const currentCountMined = state.minedInSessionHexes[level] || 0;
      const maxAvailable = Math.max(currentCountCollected, currentCountMined);
      
      // If we don't have this material in either inventory, abort placement
      if (maxAvailable <= 0) return {};

      // Safely decrement from mined first, then fall back to collected
      if (newMined[level] && newMined[level] > 0) {
        newMined[level] = newMined[level] - 1;
        if (newMined[level] <= 0) delete newMined[level];
      } else if (newCollected[level] && newCollected[level] > 0) {
        newCollected[level] = newCollected[level] - 1;
        if (newCollected[level] <= 0) delete newCollected[level];
      } else if (newCollected[String(level)] && newCollected[String(level)] > 0) {
        const sLevel = String(level);
        newCollected[sLevel] = newCollected[sLevel] - 1;
        if (newCollected[sLevel] <= 0) delete newCollected[sLevel];
      }
    }

    // 2. REFUND:
    // Case A: Demolishing or downgrading (level === -999)
    // Removed refunding logic for demolition per user request

    // Case B: Overwriting or upgrading an existing block (level !== -999 and hasPrev)
    if (level !== -999 && hasPrev) {
      // Refund the previous block's level material
      newMined[prevLevel] = (newMined[prevLevel] || 0) + 1;
    }

    // 3. MAP STATE UPDATE
    const newMap = { ...state.storyMap };
    if (level === -999) {
      if (hasPrev) {
        if (prevLevel > 0) {
          newMap[key] = prevLevel - 1;
        } else {
          delete newMap[key];
        }
      }
    } else {
      newMap[key] = level;
    }

    return { 
      storyMap: newMap, 
      collectedHexes: newCollected, 
      minedInSessionHexes: newMined 
    };
  }),

  consumeStoryHexes: (keys: string[]) => set((state) => {
    const newMap = { ...state.storyMap };
    
    // Save current canvas to siege map before consuming
    const savedSiegeMap = { ...newMap };
    
    // The keys that formed the completed figure are deleted (cleared) from the board,
    // which effectively makes them disappear.
    keys.forEach(key => {
      delete newMap[key];
    });

    return { 
      storyMap: newMap,
      savedSiegeMap: savedSiegeMap
    };
  }),

  transmuteHexes: (fromLvl: number, toLvl: number, count: number) => set((state) => {
    const cost = count * 3; // 3 to 1 transmutation
    const newMined = { ...state.minedInSessionHexes } as any;
    const newCollected = { ...state.collectedHexes } as any;
    
    const fromLvlStr = String(fromLvl);
    const toLvlStr = String(toLvl);

    // Check if player has enough resources across mined and collected
    const collectedCount = Number(newCollected[fromLvl] || newCollected[fromLvlStr] || 0);
    const minedCount = Number(newMined[fromLvl] || newMined[fromLvlStr] || 0);
    const total = collectedCount + minedCount;
    
    if (total < cost) return {};

    let remainingCost = cost;
    let deductedFromMined = 0;
    let deductedFromCollected = 0;

    // Deduct from mined first
    if (minedCount > 0) {
      const takeFromMined = Math.min(minedCount, remainingCost);
      const currentKey = newMined[fromLvl] !== undefined ? fromLvl : fromLvlStr;
      newMined[currentKey] = (newMined[currentKey] || 0) - takeFromMined;
      deductedFromMined += takeFromMined;
      remainingCost -= takeFromMined;
    }

    // Deduct remaining from collected
    if (remainingCost > 0 && collectedCount > 0) {
      const takeFromCollected = Math.min(collectedCount, remainingCost);
      const currentKey = newCollected[fromLvl] !== undefined ? fromLvl : fromLvlStr;
      newCollected[currentKey] = (newCollected[currentKey] || 0) - takeFromCollected;
      deductedFromCollected += takeFromCollected;
      remainingCost -= takeFromCollected;
    }

    // Clean up <= 0 keys in both
    if (newMined[fromLvl] !== undefined && newMined[fromLvl] <= 0) delete newMined[fromLvl];
    if (newMined[fromLvlStr] !== undefined && newMined[fromLvlStr] <= 0) delete newMined[fromLvlStr];
    if (newCollected[fromLvl] !== undefined && newCollected[fromLvl] <= 0) delete newCollected[fromLvl];
    if (newCollected[fromLvlStr] !== undefined && newCollected[fromLvlStr] <= 0) delete newCollected[fromLvlStr];

    // Decide where to add the crafted hex based on where we took the majority of the materials
    if (deductedFromCollected >= deductedFromMined) {
      const targetKey = newCollected[toLvl] !== undefined ? toLvl : toLvlStr;
      newCollected[targetKey] = (newCollected[targetKey] || 0) + count;
    } else {
      const targetKey = newMined[toLvl] !== undefined ? toLvl : toLvlStr;
      newMined[targetKey] = (newMined[targetKey] || 0) + count;
    }

    return { 
      minedInSessionHexes: newMined,
      collectedHexes: newCollected
    };
  }),

  clearStoryMap: () => set((state) => {
    const newMined = { ...state.minedInSessionHexes };
    for (const lvl of Object.values(state.storyMap)) {
      if (lvl !== undefined && lvl >= 0) {
        newMined[lvl] = (newMined[lvl] || 0) + 1;
      }
    }
    return {
      storyMap: {},
      minedInSessionHexes: newMined
    };
  }),

  unlockBlueprint: (blueprintIndex: number) => set((state) => {
    if (state.unlockedBlueprintIndices.includes(blueprintIndex)) return {};
    return {
      unlockedBlueprintIndices: [...state.unlockedBlueprintIndices, blueprintIndex]
    };
  }),

  claimLevelReward: (levelId: string) => set((state) => {
    const claimedSet = new Set(state.claimedLevelRewards || []);
    claimedSet.add(levelId);
    return {
      claimedLevelRewards: Array.from(claimedSet)
    };
  })
});
