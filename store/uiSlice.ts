import { GameStore, UiSoundType } from './types.ts';
import { audioService } from '../services/audioService.ts';
import { UIState, DeviceType } from '../types.ts';

export const createUiSlice = (
  set: (fn: (state: GameStore) => Partial<GameStore> | Partial<GameStore>) => void,
  get: () => GameStore
) => ({
  setUIState: (uiState: UIState) => {
    set(() => ({ uiState }));
  },
  
  setDeviceType: (deviceType: DeviceType) => set(() => ({ deviceType })),
  
  setLanguage: (lang: 'EN' | 'RU') => set(() => ({ language: lang })),
  
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
  
  playUiSound: (type: UiSoundType) => {
    const map: Record<UiSoundType, string> = {
      'HOVER': 'UI_HOVER', 
      'CLICK': 'UI_CLICK', 
      'ERROR': 'ERROR', 
      'WARNING': 'WARNING', 
      'SUCCESS': 'SUCCESS'
    };
    audioService.play(map[type] as any);
  }
});
