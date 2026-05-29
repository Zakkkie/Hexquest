import { GameStore } from './types.ts';
import { getHexKey } from '../services/hexUtils.ts';
import { CampaignUpgrades } from '../types.ts';

export const createCampaignSlice = (
  set: (fn: (state: GameStore) => Partial<GameStore>) => void,
  get: () => GameStore
) => ({
  setCampaignMode: (mode: 'STORY' | 'LEVELS') => set(() => ({ campaignMode: mode })),
  
  setSkillPoints: (points: number) => set(() => ({ skillPoints: points })),
  
  updateCampaignUpgrades: (partial: Partial<CampaignUpgrades>) => set((state) => ({
    campaignUpgrades: { ...state.campaignUpgrades, ...partial }
  })),
  
  activateHexBonus: (q: number, r: number) => set((state) => {
    const key = `${q},${r}`;
    if (state.hexActivationPoints <= 0) {
      setTimeout(() => {
        get().playUiSound('ERROR');
        get().showToast(
          state.language === 'RU' ? 'Недостаточно Ключей Активации!' : 'Not enough Activation Keys!',
          'error'
        );
      }, 0);
      return {};
    }
    if (state.activatedHexes[key]) {
      return {};
    }

    const newActivated = { ...state.activatedHexes, [key]: true };
    const newKeys = state.hexActivationPoints - 1;

    // Deterministic reward type based on coordinate values
    const hash = Math.abs((q * 17 + r * 31) % 4);
    let rewardString = '';
    let bonusSkills = 0;
    const newCollected = { ...state.collectedHexes };

    if (hash === 0) {
      bonusSkills = 1;
      rewardString = state.language === 'RU' 
        ? 'Сервер Информации: +1 Очко Инженерии!' 
        : 'Information Server: +1 Engineering Point!';
    } else if (hash === 1) {
      newCollected[1] = (newCollected[1] || 0) + 12;
      newCollected[2] = (newCollected[2] || 0) + 4;
      rewardString = state.language === 'RU' 
        ? 'Сектор Раскопан: Найдено +12 Блоков L1 и +4 Блока L2!' 
        : 'Sector Uncovered: Found +12 L1 Blocks and +4 L2 Blocks!';
    } else if (hash === 2) {
      bonusSkills = 1;
      newCollected[1] = (newCollected[1] || 0) + 6;
      rewardString = state.language === 'RU' 
        ? 'Энергетический Хаб: +1 Очко Инженерии, +6 Блоков L1!' 
        : 'Energy Hub Reactivated: +1 Engineering Point, +6 L1 Blocks!';
    } else {
      newCollected[2] = (newCollected[2] || 0) + 10;
      rewardString = state.language === 'RU'
        ? 'Глубокая Жила: Получено +10 Блоков L2!'
        : 'Deep Mine Deposit: Gained +10 L2 Blocks!';
    }

    setTimeout(() => {
      get().playUiSound('SUCCESS');
      get().showToast(rewardString, 'success');
    }, 0);

    return {
      hexActivationPoints: newKeys,
      activatedHexes: newActivated,
      skillPoints: state.skillPoints + bonusSkills,
      collectedHexes: newCollected
    };
  }),
  
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
  
  setStoryMilestone: (storyMilestone: number) => set(() => ({ storyMilestone }))
});
