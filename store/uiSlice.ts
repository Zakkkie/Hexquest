import { GameStore, UiSoundType } from './types';
import { audioService } from '../services/audioService';
import { UIState, DeviceType } from '../types';

export const createUiSlice = (
  set: (fn: (state: GameStore) => Partial<GameStore> | Partial<GameStore>) => void,
  get: () => GameStore
) => ({
  setUIState: (uiState: UIState) => {
    set(() => ({ uiState }));
  },
  
  setDeviceType: (deviceType: DeviceType) => set(() => ({ deviceType })),
  
  setLanguage: (lang: 'EN' | 'RU') => set(() => ({ language: lang })),
  setIsStoryTutorialActive: (active: boolean) => set(() => ({ isStoryTutorialActive: active })),
  setShowNewGameTutorialModal: (show: boolean) => set(() => ({ showNewGameTutorialModal: show })),
  
  // Defense / StoryBuilder Tutorial State & Actions
  defenseTutorialState: {
    isActive: false,
    step: 'IDLE',
    targetHexes: [],
  },
  setDefenseTutorialStep: (step, targetHexes) => set((state) => ({
    defenseTutorialState: {
      ...state.defenseTutorialState,
      step,
      targetHexes: targetHexes !== undefined ? targetHexes : state.defenseTutorialState.targetHexes,
    }
  })),
  startDefenseTutorial: () => set(() => ({
    defenseTutorialState: {
      isActive: true,
      step: 'HIGHLIGHT_CORE',
      targetHexes: ['0,0'],
    }
  })),
  completeDefenseTutorial: () => {
    try { localStorage.setItem('hexopol_defense_tutorial_completed', 'true'); } catch {}
    set((state: any) => ({
      skillPoints: (state.skillPoints || 0) + 1,
      defenseTutorialState: {
        isActive: false,
        step: 'IDLE',
        targetHexes: [],
      }
    }));
  },
  
  showToast: (message: string, type: 'error' | 'success' | 'info') => {
    // Sanitize string to bypass potential injection bugs or too large messages
    const sanitizedMsg = message.slice(0, 150);
    set(() => ({ toast: { message: sanitizedMsg, type, timestamp: Date.now() } }));
  },
  
  hideToast: () => set(() => ({ toast: null })),

  setHasHydrated: (val: boolean) => set(() => ({ hasHydrated: val })),

  // --- AUDIO ACTIONS ---
  toggleMusic: () => {
    const val = !get().isMusicMuted;
    audioService.setMusicMuted(val);
    set(() => ({ isMusicMuted: val }));
  },
  
  toggleSfx: () => {
    const val = !get().isSfxMuted;
    audioService.setSfxMuted(val);
    set(() => ({ isSfxMuted: val }));
  },

  toggleLiteMode: () => {
    const nextVal = !get().isLiteMode;
    set(() => ({ isLiteMode: nextVal }));
    const msg = nextVal 
      ? (get().language === 'RU' ? 'Облегченный режим активирован! Эффекты отключены.' : 'Lite mode activated! Visual effects disabled.')
      : (get().language === 'RU' ? 'Стандартный режим активирован.' : 'Standard mode activated.');
    get().showToast(msg, 'success');
  },
  
  playUiSound: (type: UiSoundType, level?: number) => {
    if (type === 'TILE_PLACE') {
      audioService.playTilePlace(level ?? 0);
      return;
    }
    const map: Record<UiSoundType, string> = {
      'HOVER': 'UI_HOVER', 
      'CLICK': 'UI_CLICK', 
      'ERROR': 'ERROR', 
      'WARNING': 'WARNING', 
      'SUCCESS': 'SUCCESS',
      'TILE_PLACE': 'TILE_PLACE'
    };
    audioService.play(map[type] as any, level);
  }
});
