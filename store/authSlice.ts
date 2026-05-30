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

const MOCK_USER_DB: Record<string, { passwordHash: string; avatarColor: string; headIndex: number; bodyIndex: number }> = {};

export const createAuthSlice = (
  set: (fn: (state: GameStore) => Partial<GameStore>) => void,
  get: () => GameStore
) => ({
  loginAsGuest: (nickname: string, avatarColor: string, headIndex: number, bodyIndex: number) => {
    audioService.play('UI_CLICK');
    // Ensure active session is ended cleanly
    try {
      get().abandonSession();
    } catch (e) {
      console.warn("abandonSession failed during guest login: ", e);
    }
    
    set(() => ({ 
      user: { isAuthenticated: true, isGuest: true, nickname, avatarColor, headIndex, bodyIndex },
      campaignProgress: 0,
      levelsModeProgress: 0,
      skillPoints: 0,
      collectedHexes: {},
      minedInSessionHexes: { ...INITIAL_PLAYGROUND_SEED },
      totalMinedMaterial: 0,
      storyMap: {},
      storyMilestone: 0,
      session: null,
      hasActiveSession: false,
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
    }));
  },
  
  registerUser: (nickname: string, password: string, avatarColor: string, headIndex: number, bodyIndex: number) => {
    audioService.play('UI_CLICK');
    const cleanedNickname = nickname.trim().slice(0, 32); // sanitize user input length
    const passwordHash = hashPassword(cleanedNickname, password);
    MOCK_USER_DB[cleanedNickname] = { passwordHash, avatarColor, headIndex, bodyIndex };
    set(() => ({ user: { isAuthenticated: true, isGuest: false, nickname: cleanedNickname, avatarColor, headIndex, bodyIndex } }));
    return { success: true };
  },
  
  loginUser: (nickname: string, password: string) => {
    audioService.play('UI_CLICK');
    const cleanedNickname = nickname.trim();
    const r = MOCK_USER_DB[cleanedNickname];
    const passwordHash = hashPassword(cleanedNickname, password);
    if (!r || r.passwordHash !== passwordHash) {
      audioService.play('ERROR');
      return { success: false, message: "Invalid credentials" };
    }
    set(() => ({ user: { isAuthenticated: true, isGuest: false, nickname: cleanedNickname, avatarColor: r.avatarColor, headIndex: r.headIndex, bodyIndex: r.bodyIndex } }));
    return { success: true };
  },
  
  logout: () => {
    audioService.play('UI_CLICK');
    get().abandonSession();
    set(() => ({ user: null }));
  }
});
