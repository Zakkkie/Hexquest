import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DeviceType } from './types.ts';
import { GameStore } from './store/types.ts';

// Import our new state slices
import { createAuthSlice } from './store/authSlice.ts';
import { createUiSlice } from './store/uiSlice.ts';
import { createCampaignSlice } from './store/campaignSlice.ts';
import { createGameplaySlice } from './store/gameplaySlice.ts';

// Export types for background compatibility across components
export type { UiSoundType, AuthResponse, GameStore } from './store/types.ts';

const getDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'DESKTOP';
  const w = window.innerWidth;
  if (w < 768) return 'MOBILE';
  if (w < 1024) return 'TABLET';
  return 'DESKTOP';
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // --- CORE GAME STATE (STORAGE) ---
      uiState: 'MENU',
      introNextState: 'GAME',
      deviceType: getDeviceType(),
      user: null,
      toast: null,
      pendingConfirmation: null,
      leaderboard: [], 
      campaignProgress: 0, 
      levelsModeProgress: 0,
      skillPoints: 0,
      
      collectedHexes: {},
      minedInSessionHexes: {},
      totalMinedMaterial: 0,
      storyMap: {},
      storyMilestone: 0,

      campaignUpgrades: {
        inventorySlots: 3,
        startingEnergy: 0,
        startingMoves: 0,
        startingGold: 0,
        startingMaterials: 0,
        maxMaterials: 3,
        fuelEfficiency: 0,
        scanRadius: 0,
        fatigueResistance: 0,
        growthAccelerator: 0,
        foundationStrength: 0,
        economicMultiplier: 0,
        diggerLuck: 0,
        doubleDigChance: 0,
        reserveCapacitor: 0,
        turboRecharge: 0,
        entropyResistance: 0,
        restorationMaster: 0,
      },
      campaignMode: 'STORY',
      hasActiveSession: false,
      hasHydrated: false,
      isMusicMuted: false,
      isSfxMuted: false,
      session: null,
      language: 'RU', 
      voidDialogTarget: null,
      monumentDialogState: { isOpen: false, slots: [null, null, null] },
      lastVisualEvent: undefined,
      isCampaignLoading: false,
      loadingLevelId: null,
      isCampaignHintCollapsed: false,

      // --- ASSEMBLE COMBINED ACTIONS VIA SLICES ---
      ...createAuthSlice(set as any, get as any),
      ...createUiSlice(set as any, get as any),
      ...createCampaignSlice(set as any),
      ...createGameplaySlice(set as any, get as any),
    }),
    {
      name: 'hexquest-storage-v4',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: (_state) => {
        return (rehydratedState, error) => {
          if (error) {
            console.error('Hydration error:', error);
          } else if (rehydratedState) {
            rehydratedState.setHasHydrated(true);
          }
        };
      },
      partialize: (state) => ({ 
        user: state.user, 
        leaderboard: state.leaderboard,
        campaignProgress: state.campaignProgress,
        levelsModeProgress: state.levelsModeProgress,
        campaignMode: state.campaignMode,
        collectedHexes: state.collectedHexes,
        storyMap: state.storyMap,
        storyMilestone: state.storyMilestone,
        isMusicMuted: state.isMusicMuted,
        isSfxMuted: state.isSfxMuted,
        language: state.language
      })
    }
  )
);
