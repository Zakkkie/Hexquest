import { GameState, UIState, WinCondition, SessionState, DeviceType, Item, CampaignUpgrades, UserProfile } from '../types';

export const INITIAL_PLAYGROUND_SEED: Record<number, number> = {
  0: 13,
  1: 9,
  2: 4,
  3: 1,
  4: 0,
  5: 0,
  6: 0,
  7: 0,
  8: 0,
  9: 0
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
  contrastHighlighting: 0,
  turretSpeed: 0,
};

export const createDefaultProgress = () => ({
  campaignProgress: 0,
  levelsModeProgress: 0,
  skillPoints: 0,
  collectedHexes: {},
  minedInSessionHexes: { ...INITIAL_PLAYGROUND_SEED },
  totalMinedMaterial: 0,
  totalGoldEarned: 0,
  storyMap: {},
  savedSiegeMap: {},
  unlockedBlueprintIndices: [0],
  campaignUpgrades: { ...DEFAULT_CAMPAIGN_UPGRADES },
  claimedLevelRewards: [] as string[],
  defenseTutorialState: { isActive: false, step: 'IDLE' as const, targetHexes: [] as string[] }
});

export interface AuthResponse {
  success: boolean;
  message?: string;
}

export type UiSoundType = 'HOVER' | 'CLICK' | 'ERROR' | 'WARNING' | 'SUCCESS';

export type DefenseTutorialStep =
  | 'IDLE'
  | 'HIGHLIGHT_CORE'
  | 'HIGHLIGHT_TOOLBAR'
  | 'PLACE_L0'
  | 'SHOW_DEFENSE_POPUP'
  | 'UPGRADE_CORE'
  | 'LEVEL_1_0'
  | 'UPGRADE_STORAGE'
  | 'UPGRADE_L2'
  | 'STAGE3_SIEGE';

export interface DefenseTutorialState {
  isActive: boolean;
  step: DefenseTutorialStep;
  targetHexes: string[];
}

export interface GameStore extends GameState {
  session: SessionState | null;
  isCampaignLoading: boolean;
  loadingLevelId: string | null;
  hasHydrated: boolean;
  isStoryTutorialActive?: boolean;
  showNewGameTutorialModal: boolean;
  setShowNewGameTutorialModal: (show: boolean) => void;
  
  // Defense / StoryBuilder Core Defense Tutorial State
  defenseTutorialState: DefenseTutorialState;
  setDefenseTutorialStep: (step: DefenseTutorialStep, targetHexes?: string[]) => void;
  startDefenseTutorial: () => void;
  completeDefenseTutorial: () => void;
  
  // Camera & Zoom Zustand Store integrations (Bypassing React re-renders)
  cameraPos: { x: number; y: number };
  zoomScale: number;
  setCameraPos: (pos: { x: number; y: number }) => void;
  setZoomScale: (scale: number) => void;
  
  // UI & System
  uiScale: number;
  setUiScale: (scale: number) => void;
  setUIState: (state: UIState) => void;
  setIsStoryTutorialActive: (active: boolean) => void;
  setDeviceType: (type: DeviceType) => void;
  setLanguage: (lang: 'EN' | 'RU') => void;
  setCampaignMode: (mode: 'STORY' | 'LEVELS') => void;
  addMinedHexes: (hexes: Record<number, number>) => void;
  setSkillPoints: (points: number | ((prev: number) => number)) => void;
  updateCampaignUpgrades: (upgrades: Partial<import('../types.ts').CampaignUpgrades>) => void;
  toggleMusic: () => void;
  toggleSfx: () => void;
  toggleLiteMode: () => void;
  playUiSound: (type: UiSoundType) => void;
  showToast: (msg: string, type: 'error' | 'success' | 'info') => void;
  hideToast: () => void;
  
  // Auth
  loginAsGuest: (n: string, c: string, h: number, b: number) => AuthResponse;
  registerUser: (n: string, p: string, c: string, h: number, b: number) => AuthResponse;
  loginUser: (n: string, p: string) => AuthResponse;
  ensureGuestUser: () => UserProfile;
  logout: () => void;
  
  // Session Management
  startNewGame: (win?: WinCondition, levelConfig?: import('../types.ts').LevelConfig) => void;
  startCampaignLevel: (levelId: string) => void;
  startMission: () => void;
  abandonSession: () => void;
  resetProgress: () => void;
  
  // Gameplay Actions
  tick: () => Promise<void>;
  togglePlayerGrowth: (intent?: 'RECOVER' | 'UPGRADE' | 'DIG' | 'TURRET') => void;
  movePlayer: (q: number, r: number) => void;
  confirmPendingAction: () => void;
  cancelPendingAction: () => void;
  destroyItem: (itemId: string) => void;
  
  // Story Mode Actions
  addCollectedHexes: (hexes: Record<number, number>) => void;
  placeStoryHex: (q: number, r: number, level: number) => void;
  consumeStoryHexes: (keys: string[]) => void;
  transmuteHexes: (fromLvl: number, toLvl: number, count: number) => void;
  clearStoryMap: () => void;
  claimLevelReward: (levelId: string) => void;

  startLevelEditorTest?: () => void;
  startDefenseSiege: () => void;

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
