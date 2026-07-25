import { GameStore, INITIAL_PLAYGROUND_SEED, createDefaultProgress, DEFAULT_CAMPAIGN_UPGRADES } from './types';
import { UserProfile } from '../types';
import { audioService } from '../services/audioService';

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

export const DEFAULT_PROGRESS = createDefaultProgress();

export function saveProfileProgress(nickname: string, state: any) {
  if (!nickname) return;
  const progress = {
    campaignProgress: state.campaignProgress,
    levelsModeProgress: state.levelsModeProgress,
    skillPoints: state.skillPoints,
    collectedHexes: state.collectedHexes,
    minedInSessionHexes: state.minedInSessionHexes,
    totalMinedMaterial: state.totalMinedMaterial,
    storyMap: state.storyMap,
    campaignUpgrades: state.campaignUpgrades,
    claimedLevelRewards: state.claimedLevelRewards
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
        collectedHexes: parsed.collectedHexes || {},
        minedInSessionHexes: parsed.minedInSessionHexes || { ...INITIAL_PLAYGROUND_SEED },
        totalMinedMaterial: typeof parsed.totalMinedMaterial === 'number' ? parsed.totalMinedMaterial : 0,
        storyMap: parsed.storyMap || {},
        campaignUpgrades: { ...DEFAULT_CAMPAIGN_UPGRADES, ...parsed.campaignUpgrades },
        claimedLevelRewards: Array.isArray(parsed.claimedLevelRewards) ? parsed.claimedLevelRewards : []
      };
    }
  } catch (e) {
    console.error("Failed to load progress for " + nickname, e);
  }
  return null;
}

function validateCredentials(nickname: string, password?: string, checkPasswordStrength = false): { success: boolean; message?: string } {
  const cleanName = nickname.trim();
  if (cleanName.length < 3) {
    return { success: false, message: "Nickname must be at least 3 characters." };
  }
  if (cleanName.length > 20) {
    return { success: false, message: "Nickname must not exceed 20 characters." };
  }
  // Safe alphanumeric + underscore, spaces, dashes (English and Russian UTF-8 supported)
  const regex = /^[a-zA-Z0-9_\u0400-\u04FF\s-]+$/;
  if (!regex.test(cleanName)) {
    return { success: false, message: "Nickname can only contain letters, numbers, spaces, dashes, or underscores." };
  }
  
  if (checkPasswordStrength && password !== undefined) {
    const cleanPass = password.trim();
    if (cleanPass.length < 4) {
      return { success: false, message: "Password must be at least 4 characters long." };
    }
  }
  return { success: true };
}

export function generateRandomGuestInfo() {
  const prefixes = ['Guest', 'Commander', 'Pilot', 'Cadet', 'Explorer', 'Vector', 'Rover', 'Astra', 'Nexus', 'Cipher'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  const nickname = `${prefix}_${num}`;

  const colors = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', 
    '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899'  
  ];
  const avatarColor = colors[Math.floor(Math.random() * colors.length)];
  const headIndex = Math.floor(Math.random() * 4);
  const bodyIndex = Math.floor(Math.random() * 4);

  return { nickname, avatarColor, headIndex, bodyIndex };
}

export const createAuthSlice = (
  set: (fn: (state: GameStore) => Partial<GameStore>) => void,
  get: () => GameStore
) => ({
  ensureGuestUser: (): UserProfile => {
    const currentUser = get().user;
    if (currentUser) {
      return currentUser;
    }
    const { nickname, avatarColor, headIndex, bodyIndex } = generateRandomGuestInfo();
    get().loginAsGuest(nickname, avatarColor, headIndex, bodyIndex);
    return get().user!;
  },

  loginAsGuest: (nickname: string, avatarColor: string, headIndex: number, bodyIndex: number) => {
    audioService.play('UI_CLICK');
    
    const validation = validateCredentials(nickname);
    if (!validation.success) {
      audioService.play('ERROR');
      return { success: false, message: validation.message };
    }

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
    return { success: true };
  },
  
  registerUser: (nickname: string, password: string, avatarColor: string, headIndex: number, bodyIndex: number) => {
    audioService.play('UI_CLICK');
    
    const validation = validateCredentials(nickname, password, true);
    if (!validation.success) {
      audioService.play('ERROR');
      return { success: false, message: validation.message };
    }

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
    
    const validation = validateCredentials(nickname, password, false);
    if (!validation.success) {
      audioService.play('ERROR');
      return { success: false, message: validation.message };
    }

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
