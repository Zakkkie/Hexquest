import { EntropySystem } from '../../../engine/systems/EntropySystem';
import { WorldIndex } from '../../../engine/WorldIndex';
import { EntityType, EntityState } from '../../../types';
import { ENTROPY_CONFIG } from '../../../rules/config';
import type { SessionState, Entity, Hex, GameEvent } from '../../../types';

// ---- Factories ----

const makeHex = (q: number, r: number, overrides: Partial<Hex> = {}): Hex => ({
  id: `${q},${r}`,
  q,
  r,
  currentLevel: 0,
  maxLevel: 0,
  progress: 0,
  revealed: true,
  structureType: 'NONE',
  ...overrides,
});

const makePlayer = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'player',
  type: EntityType.PLAYER,
  state: EntityState.IDLE,
  q: 0,
  r: 0,
  playerLevel: 1,
  coins: 0,
  totalCoinsEarned: 0,
  moves: 5,
  recentUpgrades: [],
  storage: 0,
  maxStorage: 4,
  inventory: [],
  activeStatuses: [],
  movementQueue: [],
  headIndex: 0,
  bodyIndex: 0,
  ...overrides,
});

const buildGrid = (hexes: Hex[]): Record<string, Hex> => {
  const grid: Record<string, Hex> = {};
  for (const h of hexes) grid[`${h.q},${h.r}`] = h;
  return grid;
};

/** 7-hex small grid: center + 6 neighbors */
const makeSmallGrid = (): Record<string, Hex> =>
  buildGrid([
    makeHex(0, 0),
    makeHex(1, 0),
    makeHex(-1, 0),
    makeHex(0, 1),
    makeHex(0, -1),
    makeHex(1, -1),
    makeHex(-1, 1),
  ]);

const makeState = (overrides: Partial<SessionState> = {}): SessionState => {
  const grid = makeSmallGrid();
  const player = makePlayer();
  return {
    stateVersion: 1,
    sessionId: 'test-session',
    sessionStartTime: Date.now(),
    winCondition: null,
    activeLevelConfig: undefined,
    difficulty: 'MEDIUM',
    grid,
    player,
    bots: [],
    currentTurn: 0,
    gameStatus: 'PLAYING',
    messageLog: [],
    botActivityLog: [],
    fullBotHistory: [],
    lastBotActionTime: 0,
    isPlayerGrowing: false,
    playerGrowthIntent: null,
    growingBotIds: [],
    effects: [],
    language: 'EN',
    entropy: { current: 50, max: 100, threshold: ENTROPY_CONFIG.THRESHOLD },
    activePoi: null,
    outgoingEvents: [],
    ...overrides,
  };
};

const makeIndex = (state: SessionState): WorldIndex =>
  new WorldIndex(state.grid, [state.player, ...state.bots]);

// ---- Tests ----

describe('EntropySystem', () => {
  let system: EntropySystem;

  beforeEach(() => {
    system = new EntropySystem();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('skips when not PLAYING', () => {
    it('does nothing when gameStatus is VICTORY', () => {
      const state = makeState({ gameStatus: 'VICTORY', entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      // Should not have triggered shift — max should be unchanged
      expect(state.entropy.max).toBe(100);
      expect(events).toHaveLength(0);
    });

    it('does nothing when gameStatus is DEFEAT', () => {
      const state = makeState({ gameStatus: 'DEFEAT', entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(state.entropy.max).toBe(100);
      expect(events).toHaveLength(0);
    });
  });

  describe('no shift when entropy > 0', () => {
    it('does nothing when entropy.current is above 0', () => {
      const state = makeState({ entropy: { current: 1, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(events).toHaveLength(0);
      expect(state.gameStatus).toBe('PLAYING');
    });

    it('does nothing when entropy.current is exactly 0.01', () => {
      const state = makeState({ entropy: { current: 0.01, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(events).toHaveLength(0);
    });
  });

  describe('entropy shift at 0', () => {
    it('emits ENTROPY_SHIFT event when entropy.current <= 0', () => {
      const state = makeState({ entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(events.some(e => e.type === 'ENTROPY_SHIFT')).toBe(true);
    });

    it('logs a CRITICAL message to messageLog on shift', () => {
      const state = makeState({ entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(state.messageLog.some(m => m.text.includes('ENTROPY SHIFT'))).toBe(true);
    });

    it('resets entropy.current to entropy.max / 2 after shift', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1); // prevent any hex from becoming VOID
      const state = makeState({ entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(state.entropy.max).toBe(50);
      expect(state.entropy.current).toBe(50);
    });

    it('halves entropy.max after every shift', () => {
      vi.spyOn(Math, 'random').mockReturnValue(1); // prevent any hex from becoming VOID
      const state = makeState({ entropy: { current: 0, max: 80, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(state.entropy.max).toBe(40);
      expect(state.entropy.current).toBe(40);
    });

    it('triggers DEFEAT when post-shift entropy.max drops below THRESHOLD', () => {
      // max=10 → halved to 5 → 5 < THRESHOLD(6)
      const state = makeState({ entropy: { current: 0, max: 10, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(state.gameStatus).toBe('DEFEAT');
      expect(events.some(e => e.type === 'DEFEAT')).toBe(true);
    });

    it('does NOT trigger global DEFEAT when post-shift max is still >= THRESHOLD', () => {
      // max=100 → halved to 50 → 50 >= THRESHOLD(6)
      vi.spyOn(Math, 'random').mockReturnValue(1); // prevent random voiding of player hex
      const state = makeState({ entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(state.gameStatus).toBe('PLAYING');
    });

    it('does not affect MONUMENT hexes during shift', () => {
      const grid = makeSmallGrid();
      grid['1,0'] = makeHex(1, 0, { structureType: 'MONUMENT', currentLevel: 3, maxLevel: 3 });
      const state = makeState({ grid, entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      // Monument hex must remain unchanged
      expect(state.grid['1,0'].structureType).toBe('MONUMENT');
      expect(state.grid['1,0'].currentLevel).toBe(3);
    });
  });

  describe('player impact during shift', () => {
    it('reduces player rank by 1 when player is on a hex that collapses during shift', () => {
      // Player is on (0,0). Force that hex to level 1 so it can collapse.
      const grid = makeSmallGrid();
      grid['0,0'] = makeHex(0, 0, { currentLevel: 1, maxLevel: 1 });
      const player = makePlayer({ playerLevel: 3, q: 0, r: 0 });
      const state = makeState({ grid, player, entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      // Spy on Math.random to force the collapse to happen
      vi.spyOn(Math, 'random').mockReturnValue(0); // 0 < 0.5, so collapse always fires
      system.update(state, makeIndex(state), events);

      // If the player's hex changed, playerLevel (rank) should have dropped
      expect(state.player.playerLevel).toBeLessThan(3);
    });

    it('sets DEFEAT when player stands on a newly VOIDed hex', () => {
      // Player on (0,0), L0 hex. Force void creation (random < 0.1).
      const grid = makeSmallGrid();
      grid['0,0'] = makeHex(0, 0, { currentLevel: 0, maxLevel: 0 });
      const player = makePlayer({ q: 0, r: 0 });
      const state = makeState({ grid, player, entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      // 0 < SHIFT_VOID_CHANCE(0.1) → void creation fires
      vi.spyOn(Math, 'random').mockReturnValue(0);
      system.update(state, makeIndex(state), events);

      expect(state.gameStatus).toBe('DEFEAT');
    });

    it('does NOT void player hex when random is above SHIFT_VOID_CHANCE', () => {
      const grid = makeSmallGrid();
      grid['0,0'] = makeHex(0, 0, { currentLevel: 0, maxLevel: 0 });
      const player = makePlayer({ q: 0, r: 0 });
      const state = makeState({ grid, player, entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      // 0.5 > SHIFT_VOID_CHANCE(0.1) → void creation does NOT fire
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      system.update(state, makeIndex(state), events);

      expect(state.grid['0,0'].structureType).not.toBe('VOID');
    });
  });

  describe('level-1+ hex collapse during shift', () => {
    it('collapses L1+ hex when random < SHIFT_COLLAPSE_CHANCE', () => {
      const grid = makeSmallGrid();
      grid['1,0'] = makeHex(1, 0, { currentLevel: 2, maxLevel: 2 });
      const state = makeState({ grid, entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      vi.spyOn(Math, 'random').mockReturnValue(0); // 0 < 0.5, collapse fires
      system.update(state, makeIndex(state), events);

      expect(state.grid['1,0'].currentLevel).toBe(1);
    });

    it('does NOT collapse L1+ hex when random >= SHIFT_COLLAPSE_CHANCE', () => {
      const grid = makeSmallGrid();
      grid['1,0'] = makeHex(1, 0, { currentLevel: 2, maxLevel: 2 });
      const state = makeState({ grid, entropy: { current: 0, max: 100, threshold: 6 } });
      const events: GameEvent[] = [];
      vi.spyOn(Math, 'random').mockReturnValue(0.9); // 0.9 >= 0.5, no collapse
      system.update(state, makeIndex(state), events);

      expect(state.grid['1,0'].currentLevel).toBe(2);
    });
  });
});
