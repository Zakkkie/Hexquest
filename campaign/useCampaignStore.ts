
import { create } from 'zustand';
import { CAMPAIGN_LEVELS } from './levels';
import { LevelConfig } from './types';

interface CampaignStore {
  activeLevelId: string | null;
  currentConfig: LevelConfig | null;
  
  startLevel: (levelId: string) => LevelConfig | undefined;
  clearLevel: () => void;
}

export const useCampaignStore = create<CampaignStore>((set) => ({
  activeLevelId: null,
  currentConfig: null,

  startLevel: (levelId) => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === levelId);
    if (level) {
      set({ activeLevelId: levelId, currentConfig: level });
    }
    return level;
  },

  clearLevel: () => set({ activeLevelId: null, currentConfig: null })
}));
