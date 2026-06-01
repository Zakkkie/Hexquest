import { GameStore, INITIAL_PLAYGROUND_SEED } from './types.ts';
import { audioService } from '../services/audioService.ts';

// Synchronous salted cryptographic hash function (cyrb53-based)
// This secures password storage in the mock in-memory DB by eliminating raw passwords.
export function hashPassword(nickname: string, passcode: string): string {
  const salt = "hexquest-salt-2026-secure-v2";
  const str = `${nickname}:${salt}:${passcode}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0, ch; i < str.length; i++) {
    ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

let MOCK_USER_DB: Record<string, { passwordHash: string; avatarColor: string; headIndex: number; bodyIndex: number }> = {};
try {
  if (typeof window !== 'undefined') {
    const storedDb = localStorage.getItem('hexquest_user_db');
    if (storedDb) {
      MOCK_USER_DB = JSON.parse(storedDb);
    }
  }
} catch (e) {
  console.error("Failed to load mock user db from localStorage:", e);
}

export const DEFAULT_PROGRESS = {
  campaignProgress: 0,
  levelsModeProgress: 0,
  skillPoints: 0,
  hexActivationPoints: 0,
  activatedHexes: {},
  collectedHexes: {},
  minedInSessionHexes: { ...INITIAL_PLAYGROUND_SEED },
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
  }
};

export function saveProfileProgress(nickname: string, state: any) {
  if (!nickname) return;
  const progress = {
    campaignProgress: state.campaignProgress,
    levelsModeProgress: state.levelsModeProgress,
    skillPoints: state.skillPoints,
    hexActivationPoints: state.hexActivationPoints,
    activatedHexes: state.activatedHexes,
    collectedHexes: state.collectedHexes,
    minedInSessionHexes: state.minedInSessionHexes,
    totalMinedMaterial: state.totalMinedMaterial,
    storyMap: state.storyMap,
    storyMilestone: state.storyMilestone,
    campaignUpgrades: state.campaignUpgrades
  };
  try {
    localStorage.setItem(`hexquest_progress_${nickname.toLowerCase()}`, JSON.stringify(progress));
  } catch (e) {
    console.error("Failed to save progress in localStorage:", e);
  }
}

export function loadProfileProgress(nickname: string) {
  if (!nickname) return null;
  try {
    const data = localStorage.getItem(`hexquest_progress_${nickname.toLowerCase()}`);
    if (data) {
      const parsed = JSON.parse(data);
      return {
        campaignProgress: typeof parsed.campaignProgress === 'number' ? parsed.campaignProgress : 0,
        levelsModeProgress: typeof parsed.levelsModeProgress === 'number' ? parsed.levelsModeProgress : 0,
        skillPoints: typeof parsed.skillPoints === 'number' ? parsed.skillPoints : 0,
        hexActivationPoints: typeof parsed.hexActivationPoints === 'number' ? parsed.hexActivationPoints : 0,
        activatedHexes: parsed.activatedHexes || {},
        collectedHexes: parsed.collectedHexes || {},
        minedInSessionHexes: parsed.minedInSessionHexes || { ...INITIAL_PLAYGROUND_SEED },
        totalMinedMaterial: typeof parsed.totalMinedMaterial === 'number' ? parsed.totalMinedMaterial : 0,
        storyMap: parsed.storyMap || {},
        storyMilestone: typeof parsed.storyMilestone === 'number' ? parsed.storyMilestone : 0,
        campaignUpgrades: { ...DEFAULT_PROGRESS.campaignUpgrades, ...parsed.campaignUpgrades }
      };
    }
  } catch (e) {
    console.error("Failed to load progress for " + nickname, e);
  }
  return null;
}

export const createAuthSlice = (
  set: (fn: (state: GameStore) => Partial<GameStore>) => void,
  get: () => GameStore
) => ({
  loginAsGuest: (nickname: string, avatarColor: string, headIndex: number, bodyIndex: number) => {
    audioService.play('UI_CLICK');
    
    // Save previous active user's progress first
    const currentUser = get().user;
    if (currentUser && currentUser.nickname) {
      saveProfileProgress(currentUser.nickname, get());
    }

    try {
      get().abandonSession();
    } catch (e) {
      console.warn("abandonSession failed during guest login: ", e);
    }
    
    const cleanedNickname = nickname.trim().slice(0, 32);
    
    // Reset guest's progress and completed figures to 0 for a completely fresh start
    try {
      localStorage.removeItem(`hexquest_progress_${cleanedNickname.toLowerCase()}`);
      localStorage.removeItem('hexopol_figure_index');
    } catch (e) {
      console.warn("localStorage clear failed during guest login:", e);
    }

    const loaded = DEFAULT_PROGRESS;

    set(() => ({ 
      user: { isAuthenticated: true, isGuest: true, nickname: cleanedNickname, avatarColor, headIndex, bodyIndex },
      session: null,
      hasActiveSession: false,
      ...loaded
    }));
  },
  
  registerUser: (nickname: string, password: string, avatarColor: string, headIndex: number, bodyIndex: number) => {
    audioService.play('UI_CLICK');
    
    const cleanedNickname = nickname.trim().slice(0, 32);
    const key = cleanedNickname.toLowerCase();
    
    if (MOCK_USER_DB[key]) {
      audioService.play('ERROR');
      return { success: false, message: "User already exists" };
    }

    // Save previous active user's progress first
    const currentUser = get().user;
    if (currentUser && currentUser.nickname) {
      saveProfileProgress(currentUser.nickname, get());
    }

    const passwordHash = hashPassword(cleanedNickname, password);
    MOCK_USER_DB[key] = { passwordHash, avatarColor, headIndex, bodyIndex };
    try {
      localStorage.setItem('hexquest_user_db', JSON.stringify(MOCK_USER_DB));
    } catch (e) {
      console.error("Failed to persist user db in localStorage:", e);
    }

    const loaded = loadProfileProgress(cleanedNickname) || DEFAULT_PROGRESS;

    set(() => ({ 
      user: { isAuthenticated: true, isGuest: false, nickname: cleanedNickname, avatarColor, headIndex, bodyIndex },
      session: null,
      hasActiveSession: false,
      ...loaded
    }));
    return { success: true };
  },
  
  loginUser: (nickname: string, password: string) => {
    audioService.play('UI_CLICK');
    const cleanedNickname = nickname.trim();
    const key = cleanedNickname.toLowerCase();
    
    const r = MOCK_USER_DB[key];
    const passwordHash = hashPassword(cleanedNickname, password);
    if (!r || r.passwordHash !== passwordHash) {
      audioService.play('ERROR');
      return { success: false, message: "Invalid credentials" };
    }

    // Save previous active user's progress first
    const currentUser = get().user;
    if (currentUser && currentUser.nickname) {
      saveProfileProgress(currentUser.nickname, get());
    }

    const loaded = loadProfileProgress(cleanedNickname) || DEFAULT_PROGRESS;

    set(() => ({ 
      user: { isAuthenticated: true, isGuest: false, nickname: cleanedNickname, avatarColor: r.avatarColor, headIndex: r.headIndex, bodyIndex: r.bodyIndex },
      session: null,
      hasActiveSession: false,
      ...loaded
    }));
    return { success: true };
  },
  
  logout: () => {
    audioService.play('UI_CLICK');
    
    // Save current active user's progress first
    const currentUser = get().user;
    if (currentUser && currentUser.nickname) {
      saveProfileProgress(currentUser.nickname, get());
    }

    get().abandonSession();
    set(() => ({ 
      user: null,
      session: null,
      hasActiveSession: false,
      ...DEFAULT_PROGRESS
    }));
  }
});
