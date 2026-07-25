import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DeviceType } from './types.ts';
import { GameStore, INITIAL_PLAYGROUND_SEED, DEFAULT_CAMPAIGN_UPGRADES } from './store/types.ts';
import { createAuthSlice, saveProfileProgress } from './store/authSlice.ts';
import { createUiSlice } from './store/uiSlice.ts';
import { createCampaignSlice } from './store/campaignSlice.ts';
import { createGameplaySlice } from './store/gameplaySlice.ts';
import { audioService } from './services/audioService.ts';

export type { UiSoundType, AuthResponse, GameStore } from './store/types.ts';

const getDeviceType = (): DeviceType => {
  if (typeof window === 'undefined') return 'DESKTOP';
  const w = window.innerWidth;
  if (w < 768) return 'MOBILE';
  if (w < 1024) return 'TABLET';
  return 'DESKTOP';
};

// Safe localStorage wrapper to prevent crashes on quota limits or private browsing
const safeStorage = {
  getItem: (name: string): string | null => {
    try { return localStorage.getItem(name); } 
    catch { return null; }
  },
  setItem: (name: string, value: string): void => {
    try { localStorage.setItem(name, value); } 
    catch (error) { console.error('LocalStorage quota exceeded:', error); }
  },
  removeItem: (name: string): void => {
    try { localStorage.removeItem(name); } 
    catch { /* noop */ }
  },
};

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      // --- CORE GAME STATE ---
      uiState: 'MENU',
      introNextState: 'GAME',
      deviceType: getDeviceType(),
      user: null,
      toast: null, // Ephemeral
      pendingConfirmation: null, // Ephemeral
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
      session: null, // Ephemeral
      language: 'RU',
      voidDialogTarget: null, // Ephemeral
      monumentDialogState: { isOpen: false, slots: [null, null, null] }, // Ephemeral
      miniMonumentDialogState: { isOpen: false }, // Ephemeral
      lastVisualEvent: undefined, // Ephemeral
      isCampaignLoading: false, // Ephemeral
      loadingLevelId: null, // Ephemeral
      
      isStoryTutorialActive: (() => {
        try {
          return localStorage.getItem('hexopol_story_tutorial_completed') !== 'true';
        } catch { return true; }
      })(),
      showNewGameTutorialModal: false,
      
      // Camera & Zoom (Bypassing React re-renders)
      cameraPos: {
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 400,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 - 30 : 300
      },
      zoomScale: typeof window !== 'undefined' ? (window.innerWidth < 768 ? 1.55 : 2.15) : 2.0,
      setCameraPos: (pos: { x: number; y: number }) => set({ cameraPos: pos }),
      setZoomScale: (scale: number) => set({ zoomScale: scale }),
      
      uiScale: 1.0,
      setUiScale: (scale: number) => set({ uiScale: scale }),
      
      // --- SLICES ---
      ...createAuthSlice(set as any, get as any),
      ...createUiSlice(set as any, get as any),
      ...createCampaignSlice(set as any),
      ...createGameplaySlice(set as any, get as any),
    }),
    {
      name: 'hexquest-storage-v5', // Incremented version to avoid conflicts with old format
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: (_state) => {
        return (rehydratedState, error) => {
          if (error) {
            console.error('Hydration error:', error);
          } else if (rehydratedState) {
            rehydratedState.setHasHydrated(true);
            audioService.setMusicMuted(!!rehydratedState.isMusicMuted);
            audioService.setSfxMuted(!!rehydratedState.isSfxMuted);
          }
        };
      },
      // ONLY persist non-ephemeral data
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
        language: state.language,
        uiScale: state.uiScale
        // Ephemeral properties like toast, session, dialog states are intentionally excluded
      })
    }
  )
);

// Throttle saveProfileProgress to avoid network spam on every state change
let saveTimeout: NodeJS.Timeout | null = null;
useGameStore.subscribe((state) => {
  if (state.user && state.user.nickname) {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveProfileProgress(state.user!.nickname, state);
    }, 1000); // Save at most once per second
  }
});

import { registerGameStore } from './services/hexUtils.ts';
registerGameStore(useGameStore);