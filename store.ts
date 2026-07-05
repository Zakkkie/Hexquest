import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DeviceType } from './types.ts';
import { GameStore, INITIAL_PLAYGROUND_SEED, DEFAULT_CAMPAIGN_UPGRADES } from './store/types.ts';

// Import our new state slices
import { createAuthSlice, saveProfileProgress } from './store/authSlice.ts';
import { createUiSlice } from './store/uiSlice.ts';
import { createCampaignSlice } from './store/campaignSlice.ts';
import { createGameplaySlice } from './store/gameplaySlice.ts';
import { audioService } from './services/audioService.ts';

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
      minedInSessionHexes: { ...INITIAL_PLAYGROUND_SEED },
      totalMinedMaterial: 0,
      storyMap: {},
      savedSiegeMap: {},
      unlockedBlueprintIndices: [0],

      campaignUpgrades: { ...DEFAULT_CAMPAIGN_UPGRADES },
      campaignMode: 'STORY',
      hasActiveSession: false,
      hasHydrated: false,
      isMusicMuted: false,
      isSfxMuted: false,
      isLiteMode: false,
      session: null,
      language: 'RU', 
      voidDialogTarget: null,
      monumentDialogState: { isOpen: false, slots: [null, null, null] },
      miniMonumentDialogState: { isOpen: false },
      lastVisualEvent: undefined,
      isCampaignLoading: false,
      loadingLevelId: null,
      isStoryTutorialActive: (() => {
        try {
            return localStorage.getItem('hexopol_story_tutorial_completed') !== 'true';
        } catch { return true; }
      })(),

      // Camera & Zoom Zustand Store integrations (Bypassing React re-renders)
      cameraPos: { 
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400, 
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 30 : 300 
      },
      zoomScale: typeof window !== 'undefined' ? (window.innerWidth < 768 ? 1.55 : 2.15) : 2.0,
      setCameraPos: (pos: { x: number; y: number }) => set({ cameraPos: pos }),
      setZoomScale: (scale: number) => set({ zoomScale: scale }),

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
            // Synchronize loaded settings with the local synthesizer
            audioService.setMusicMuted(!!rehydratedState.isMusicMuted);
            audioService.setSfxMuted(!!rehydratedState.isSfxMuted);
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
        minedInSessionHexes: state.minedInSessionHexes,
        totalMinedMaterial: state.totalMinedMaterial,
        claimedLevelRewards: state.claimedLevelRewards,
        storyMap: state.storyMap,
        savedSiegeMap: state.savedSiegeMap,
        unlockedBlueprintIndices: state.unlockedBlueprintIndices,
        campaignUpgrades: state.campaignUpgrades,
        skillPoints: state.skillPoints,
        isMusicMuted: state.isMusicMuted,
        isSfxMuted: state.isSfxMuted,
        isLiteMode: state.isLiteMode,
        language: state.language
      })
    }
  )
);

// Subscribe to state updates to automatically back up progress to the user's dedicated save slot
useGameStore.subscribe((state) => {
  if (state.user && state.user.nickname) {
    saveProfileProgress(state.user.nickname, state);
  }
});

import { registerGameStore } from './services/hexUtils.ts';
registerGameStore(useGameStore);
