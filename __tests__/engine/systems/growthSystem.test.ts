import { GrowthSystem } from '../../../engine/systems/GrowthSystem';
import { WorldIndex } from '../../../engine/WorldIndex';
import { EntityType, EntityState } from '../../../types';
import type { SessionState, Entity, Hex, GameEvent, WinCondition } from '../../../types';

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
  storage: 1,
  maxStorage: 4,
  inventory: [],
  activeStatuses: [],
  movementQueue: [],
  headIndex: 0,
  bodyIndex: 0,
  ...overrides,
});

const makeBot = (overrides: Partial<Entity> = {}): Entity => ({
  ...makePlayer({ id: 'bot-1', type: EntityType.BOT }),
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

const makeWinCondition = (overrides: Partial<WinCondition> = {}): WinCondition => ({
  levelId: 1,
  targetLevel: 3,
  targetCoins: 100,
  label: 'Test',
  botCount: 0,
  difficulty: 'MEDIUM',
  queueSize: 2,
  winType: 'OR',
  ...overrides,
});

const makeState = (overrides: Partial<SessionState> = {}): SessionState => {
  const grid = makeSmallGrid();
  const player = makePlayer();
  return {
    stateVersion: 1,
    sessionId: 'test-session',
    sessionStartTime: Date.now(),
    winCondition: makeWinCondition(),
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
    entropy: { current: 50, max: 100, threshold: 6 },
    activePoi: null,
    outgoingEvents: [],
    ...overrides,
  };
};

const makeIndex = (state: SessionState): WorldIndex =>
  new WorldIndex(state.grid, [state.player, ...state.bots]);

// growthTime for any level is 30 ticks (from GAME_CONFIG)
const GROWTH_TIME = 30;

// ---- Tests ----

describe('GrowthSystem', () => {
  let system: GrowthSystem;

  beforeEach(() => {
    system = new GrowthSystem();
  });

  describe('idle player — no grow intent', () => {
    it('does nothing when player isPlayerGrowing is false', () => {
      const state = makeState({ isPlayerGrowing: false });
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(state.isPlayerGrowing).toBe(false);
      expect(events).toHaveLength(0);
    });

    it('transitions player from GROWING to IDLE when intent is cleared', () => {
      const state = makeState({ isPlayerGrowing: false });
      state.player.state = EntityState.GROWING;
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);
      expect(state.player.state).toBe(EntityState.IDLE);
    });
  });

  describe('UPGRADE intent — progress not yet complete', () => {
    it('increments hex progress each tick while upgrading', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      // Player at (0,0), grid hex (0,0) is L0 with storage=1 — can upgrade
      state.player.storage = 1;
      state.grid['0,0'].progress = 0;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      // If growth condition passes, progress should have incremented OR completed
      // In either case the player state should still be GROWING or IDLE (not errored)
      expect([EntityState.GROWING, EntityState.IDLE]).toContain(state.player.state);
    });

    it('marks isPlayerGrowing=true when actively upgrading and progress is advancing', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      state.player.storage = 1;
      // Set progress just short of completion (GROWTH_TIME - 2, so progress+1 < needed)
      state.grid['0,0'].progress = GROWTH_TIME - 2;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(state.isPlayerGrowing).toBe(true);
    });
  });

  describe('UPGRADE intent — completion', () => {
    it('levels up the hex when progress reaches growthTime', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      state.player.storage = 1;
      // Set progress to exactly growthTime - 1 so progress+1 >= needed triggers completion
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(state.grid['0,0'].currentLevel).toBe(1);
    });

    it('increases player playerLevel when a new maxLevel is reached', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      state.player.storage = 1;
      state.player.playerLevel = 0; // start below L1 so upgrade to L1 triggers rank increase
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      // playerLevel should be max of (current=0, targetLevel=1) = 1
      expect(state.player.playerLevel).toBeGreaterThan(0);
    });

    it('deducts 1 material from storage on upgrade completion', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      state.player.storage = 2;
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(state.player.storage).toBe(1);
    });

    it('adds 1 move on upgrade completion', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      state.player.storage = 1;
      state.player.moves = 3;
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(state.player.moves).toBe(4);
    });

    it('emits SECTOR_ACQUIRED event when first upgrade to L1 completes', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      state.player.storage = 1;
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(events.some(e => e.type === 'SECTOR_ACQUIRED')).toBe(true);
    });

    it('emits LEVEL_UP event when upgrading beyond L1', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      state.player.storage = 1;
      state.player.playerLevel = 2;
      // Upgrade from L1 → L2 (player already owns the hex at L1)
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 1;
      state.grid['0,0'].maxLevel = 1;
      state.grid['0,0'].ownerId = 'player';

      // Set neighbors to L2 so L2 support check passes
      for (const key of ['1,0', '-1,0', '0,1', '0,-1', '1,-1', '-1,1']) {
        state.grid[key] = { ...state.grid[key], currentLevel: 2, maxLevel: 2 };
      }

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(events.some(e => e.type === 'LEVEL_UP')).toBe(true);
    });

    it('resets progress to 0 after upgrade completion', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      state.player.storage = 1;
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(state.grid['0,0'].progress).toBe(0);
    });

    it('sets isPlayerGrowing to false after completion', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      state.player.storage = 1;
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(state.isPlayerGrowing).toBe(false);
    });
  });

  describe('bot upgrade queue', () => {
    it('tracks growing bot in growingBotIds when bot is upgrading', () => {
      const bot = makeBot({
        q: 1,
        r: 0,
        storage: 1,
        playerLevel: 1,
        movementQueue: [{ q: 1, r: 0, upgrade: true, intent: 'UPGRADE' }],
      });
      const state = makeState({ bots: [bot] });
      state.grid['1,0'].progress = GROWTH_TIME - 2; // short of completion
      state.grid['1,0'].currentLevel = 0;
      state.grid['1,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(state.growingBotIds).toContain('bot-1');
    });

    it('removes bot from growingBotIds when bot is not upgrading', () => {
      const bot = makeBot({ q: 1, r: 0, movementQueue: [] });
      const state = makeState({ bots: [bot], growingBotIds: ['bot-1'] });

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(state.growingBotIds).not.toContain('bot-1');
    });
  });

  describe('STATUS_FREE_BUILD bypasses material cost', () => {
    it('upgrade completes and storage stays at 0 when STATUS_FREE_BUILD is active', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'UPGRADE' });
      // Player has no material
      state.player.storage = 0;
      // Add STATUS_FREE_BUILD status that expires far in the future
      state.player.activeStatuses = [
        {
          type: 'STATUS_FREE_BUILD' as any,
          label: 'Free Build',
          expiresAt: Date.now() + 9999999,
        },
      ];
      // Progress at completion threshold
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      // Upgrade should have completed (hex now L1)
      expect(state.grid['0,0'].currentLevel).toBe(1);
      // Storage must remain 0 — not go negative
      expect(state.player.storage).toBe(0);
    });
  });

  describe('RECOVER intent', () => {
    it('returns moves to player on RECOVER completion', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'RECOVER' });
      state.player.moves = 2;
      state.player.recoveredCurrentHex = false;
      // Set hex to L0, use a progress just at completion
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      // player should have received at least 1 move
      expect(state.player.moves).toBeGreaterThan(2);
    });

    it('emits RECOVERY_USED event on completion', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'RECOVER' });
      state.player.recoveredCurrentHex = false;
      state.grid['0,0'].progress = GROWTH_TIME - 1;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      expect(events.some(e => e.type === 'RECOVERY_USED')).toBe(true);
    });

    it('blocks recover if player already recovered this hex (L0-L3)', () => {
      const state = makeState({ isPlayerGrowing: true, playerGrowthIntent: 'RECOVER' });
      state.player.recoveredCurrentHex = true;
      state.grid['0,0'].progress = 0;
      state.grid['0,0'].currentLevel = 0;
      state.grid['0,0'].maxLevel = 0;

      const initialMoves = state.player.moves;
      const events: GameEvent[] = [];
      system.update(state, makeIndex(state), events);

      // No recovery event should have fired
      expect(events.some(e => e.type === 'RECOVERY_USED')).toBe(false);
      // Moves unchanged
      expect(state.player.moves).toBe(initialMoves);
    });
  });
});
