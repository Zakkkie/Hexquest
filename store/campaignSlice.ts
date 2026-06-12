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

    const newCollected = { ...state.collectedHexes };
    const newMined = { ...state.minedInSessionHexes };

    // 1. DEDUCT: If placing/upgrading to a level (level !== -999)
    if (level !== -999) {
      const currentCountCollected = state.collectedHexes[level] || 0;
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
      }
    }

    // 2. REFUND:
    // Case A: Demolishing or downgrading (level === -999)
    if (level === -999) {
      if (hasPrev) {
        // Refund the level of the block before downgrade
        newMined[prevLevel] = (newMined[prevLevel] || 0) + 1;
      }
    } 
    // Case B: Overwriting or upgrading an existing block (level !== -999 and hasPrev)
    else if (hasPrev) {
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

  claimLevelReward: (levelId: string) => set((state) => {
    const claimedSet = new Set(state.claimedLevelRewards || []);
    claimedSet.add(levelId);
    return {
      claimedLevelRewards: Array.from(claimedSet)
    };
  })
});
