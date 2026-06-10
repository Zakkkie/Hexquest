import { GameState, UIState, WinCondition, SessionState, DeviceType, Item, CampaignUpgrades } from '../types.ts';

export const INITIAL_PLAYGROUND_SEED: Record<number, number> = {
  0: 30,
  1: 15,
  2: 15,
  3: 10,
  4: 10,
  5: 8,
  6: 8,
  7: 6,
  8: 5,
  9: 5
};

export const DEFAULT_CAMPAIGN_UPGRADES: CampaignUpgrades = {
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
};

export const createDefaultProgress = () => ({
  campaignProgress: 0,
  levelsModeProgress: 0,
  skillPoints: 0,
  collectedHexes: {},
  minedInSessionHexes: { ...INITIAL_PLAYGROUND_SEED },
  totalMinedMaterial: 0,
  storyMap: {},
  campaignUpgrades: { ...DEFAULT_CAMPAIGN_UPGRADES }
});

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
  isStoryTutorialActive?: boolean;
  
  // UI & System
  setUIState: (state: UIState) => void;
  setIsStoryTutorialActive: (active: boolean) => void;
  setDeviceType: (type: DeviceType) => void;
  setLanguage: (lang: 'EN' | 'RU') => void;
  setCampaignMode: (mode: 'STORY' | 'LEVELS') => void;
  addMinedHexes: (hexes: Record<number, number>) => void;
  setSkillPoints: (points: number) => void;
  updateCampaignUpgrades: (upgrades: Partial<import('../types.ts').CampaignUpgrades>) => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleLiteMode: () => void;
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
  
  // Gameplay Actions
  tick: () => Promise<void>;
  togglePlayerGrowth: (intent?: 'RECOVER' | 'UPGRADE' | 'DIG') => void;
  movePlayer: (q: number, r: number) => void;
  confirmPendingAction: () => void;
  cancelPendingAction: () => void;
  destroyItem: (itemId: string) => void;
  
  // Story Mode Actions
  addCollectedHexes: (hexes: Record<number, number>) => void;
  placeStoryHex: (q: number, r: number, level: number) => void;
  clearStoryMap: () => void;

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
  rerollSingleMonumentRequirement: (slotIndex: number) => void;
  activateMonument: () => void;

  setHasHydrated: (val: boolean) => void;
  
  equipItemSkirmish: (itemId: string) => void;
  unequipItemSkirmish: (slot: string) => void;

  // --- REGION: PENDING & DEPRECATED ACTIONS (TODO) ---
  // TODO: Implement activateHexBonus once the hex passive bonus system is developed
  activateHexBonus?: (hexKey: string) => void;
  // TODO: Implement setStoryMilestone for progress checkpoint tracking in Story Mode
  setStoryMilestone?: (milestone: number) => void;
}
