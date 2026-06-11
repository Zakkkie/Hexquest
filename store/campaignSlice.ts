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
    // Deduct from inventory safely
    const currentCountCollected = state.collectedHexes[level] || 0;
    const currentCountMined = state.minedInSessionHexes[level] || 0;
    const maxAvailable = Math.max(currentCountCollected, currentCountMined);
    
    // Ignore invalid/empty blocks (except debug override)
    if (maxAvailable <= 0 && level !== -999) return {};
    
    const newCollected = { ...state.collectedHexes };
    const newMined = { ...state.minedInSessionHexes };
    
    if (level !== -999) {
      newCollected[level] = Math.max(0, (state.collectedHexes[level] || maxAvailable) - 1);
      if (newCollected[level] <= 0) delete newCollected[level];
      
      newMined[level] = Math.max(0, (state.minedInSessionHexes[level] || maxAvailable) - 1);
      if (newMined[level] <= 0) delete newMined[level];
    }

    const newMap = { ...state.storyMap };
    if (level === -999) {
      const currentLevel = state.storyMap[key];
      if (currentLevel !== undefined && currentLevel > 0) {
        newMap[key] = currentLevel - 1;
      } else {
        delete newMap[key];
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
