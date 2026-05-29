import { GameState, UIState, WinCondition, SessionState, DeviceType, Item } from '../types.ts';

export interface AuthResponse {
  success: boolean;
  message?: string;
}

export type UiSoundType = 'HOVER' | 'CLICK' | 'ERROR' | 'WARNING' | 'SUCCESS';

export interface GameStore extends GameState {
  session: SessionState | null;
  isCampaignLoading: boolean;
  loadingLevelId: string | null;
  hasHydrated: boolean;
  
  // UI & System
  setUIState: (state: UIState) => void;
  setDeviceType: (type: DeviceType) => void;
  setLanguage: (lang: 'EN' | 'RU') => void;
  setCampaignMode: (mode: 'STORY' | 'LEVELS') => void;
  addMinedHexes: (hexes: Record<number, number>) => void;
  setSkillPoints: (points: number) => void;
  updateCampaignUpgrades: (upgrades: Partial<import('../types.ts').CampaignUpgrades>) => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleLiteMode: () => void;
  toggleCampaignHintCollapse: () => void;
  playUiSound: (type: UiSoundType) => void;
  showToast: (msg: string, type: 'error' | 'success' | 'info') => void;
  hideToast: () => void;
  
  // Auth
  loginAsGuest: (n: string, c: string, h: number, b: number) => void;
  registerUser: (n: string, p: string, c: string, h: number, b: number) => AuthResponse;
  loginUser: (n: string, p: string) => AuthResponse;
  logout: () => void;
  
  // Session Management
  startNewGame: (win?: WinCondition, levelConfig?: import('../types.ts').LevelConfig) => void;
  startCampaignLevel: (levelId: string) => void;
  startMission: () => void;
  abandonSession: () => void;
  resetProgress: () => void;
  downloadSessionLog: () => void;
  
  // Gameplay Actions
  tick: () => Promise<void>;
  togglePlayerGrowth: (intent?: 'RECOVER' | 'UPGRADE' | 'DIG') => void;
  rechargeMove: () => void;
  movePlayer: (q: number, r: number) => void;
  confirmPendingAction: () => void;
  cancelPendingAction: () => void;
  destroyItem: (itemId: string) => void;
  
  // Story Mode Actions
  addCollectedHexes: (hexes: Record<number, number>) => void;
  placeStoryHex: (q: number, r: number, level: number) => void;
  clearStoryMap: () => void;
  setStoryMilestone: (milestone: number) => void;
  activateHexBonus: (q: number, r: number) => void;

  // Interactions
  openVoidDialog: (q: number, r: number) => void;
  closeVoidDialog: () => void;
  restoreVoidHex: (itemId: string) => void;

  openMiniMonumentDialog: (hint: string) => void;
  closeMiniMonumentDialog: () => void;
  
  openMonumentDialog: () => void;
  closeMonumentDialog: () => void;
  placeItemInMonument: (item: Item, slotIndex: number) => void;
  removeItemFromMonument: (slotIndex: number) => void;
  rerollMonumentRequirements: () => void;
  rerollSingleMonumentRequirement: (slotIndex: number) => void;
  activateMonument: () => void;
  checkTutorialCamera: (deltaX: number) => void;

  setHasHydrated: (val: boolean) => void;
  
  equipItemSkirmish: (itemId: string) => void;
  unequipItemSkirmish: (slot: string) => void;
}
