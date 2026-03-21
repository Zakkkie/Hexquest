import { VictorySystem } from '../../../engine/systems/VictorySystem';
import { WorldIndex } from '../../../engine/WorldIndex';
import { EntityType, EntityState } from '../../../types';
import type { SessionState, Entity, Hex, GameEvent, LevelConfig, WinCondition } from '../../../types';

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
  label: 'Test Win',
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
    entropy: { current: 50, max: 100, threshold: 6 },
    activePoi: null,
    outgoingEvents: [],
    ...overrides,
  };
};

const makeIndex = (state: SessionState): WorldIndex =>
  new WorldIndex(state.grid, [state.player, ...state.bots]);

// ---- Tests ----

describe('VictorySystem', () => {
  let system: VictorySystem;

  beforeEach(() => {
    system = new VictorySystem();
  });

  describe('default state — no conditions', () => {
    it('does nothing when no winCondition and no activeLevelConfig', () => {
      const state = makeState();
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('PLAYING');
      expect(events).toHaveLength(0);
    });

    it('does nothing when gameStatus is already VICTORY', () => {
      const state = makeState({ gameStatus: 'VICTORY' });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('VICTORY');
      expect(events).toHaveLength(0);
    });

    it('does nothing when gameStatus is already DEFEAT', () => {
      const state = makeState({ gameStatus: 'DEFEAT' });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('DEFEAT');
      expect(events).toHaveLength(0);
    });
  });

  describe('campaign hooks', () => {
    it('sets VICTORY when checkWinCondition returns true', () => {
      const activeLevelConfig = {
        id: 'test-1',
        hooks: { checkWinCondition: () => true },
      } as unknown as LevelConfig;
      const state = makeState({ activeLevelConfig });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('VICTORY');
    });

    it('emits VICTORY and LEADERBOARD_UPDATE events on campaign win', () => {
      const activeLevelConfig = {
        id: 'test-1',
        hooks: { checkWinCondition: () => true },
      } as unknown as LevelConfig;
      const state = makeState({ activeLevelConfig });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      const types = events.map(e => e.type);
      expect(types).toContain('VICTORY');
      expect(types).toContain('LEADERBOARD_UPDATE');
    });

    it('adds a SUCCESS message to messageLog on campaign win', () => {
      const activeLevelConfig = {
        id: 'test-1',
        hooks: { checkWinCondition: () => true },
      } as unknown as LevelConfig;
      const state = makeState({ activeLevelConfig });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.messageLog.length).toBeGreaterThan(0);
      expect(state.messageLog[0].type).toBe('SUCCESS');
    });

    it('sets DEFEAT when checkLossCondition returns true', () => {
      const activeLevelConfig = {
        id: 'test-1',
        hooks: { checkLossCondition: () => true },
      } as unknown as LevelConfig;
      const state = makeState({ activeLevelConfig });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('DEFEAT');
    });

    it('emits DEFEAT and LEADERBOARD_UPDATE events on campaign loss', () => {
      const activeLevelConfig = {
        id: 'test-1',
        hooks: { checkLossCondition: () => true },
      } as unknown as LevelConfig;
      const state = makeState({ activeLevelConfig });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      const types = events.map(e => e.type);
      expect(types).toContain('DEFEAT');
      expect(types).toContain('LEADERBOARD_UPDATE');
    });

    it('win hook takes priority over loss hook when both return true', () => {
      const activeLevelConfig = {
        id: 'test-1',
        hooks: {
          checkWinCondition: () => true,
          checkLossCondition: () => true,
        },
      } as unknown as LevelConfig;
      const state = makeState({ activeLevelConfig });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('VICTORY');
    });

    it('does nothing when checkWinCondition returns false and no loss condition', () => {
      const activeLevelConfig = {
        id: 'test-1',
        hooks: { checkWinCondition: () => false },
      } as unknown as LevelConfig;
      const state = makeState({ activeLevelConfig });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('PLAYING');
      expect(events).toHaveLength(0);
    });
  });

  describe('skirmish OR win condition', () => {
    it('triggers VICTORY when player playerLevel meets targetLevel (OR)', () => {
      const state = makeState({
        winCondition: makeWinCondition({ targetLevel: 2, targetCoins: 9999, winType: 'OR' }),
        player: makePlayer({ playerLevel: 2, coins: 0 }),
      });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('VICTORY');
    });

    it('triggers VICTORY when player coins meet targetCoins (OR)', () => {
      const state = makeState({
        winCondition: makeWinCondition({ targetLevel: 9999, targetCoins: 50, winType: 'OR' }),
        player: makePlayer({ playerLevel: 1, coins: 50 }),
      });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('VICTORY');
    });

    it('triggers VICTORY when player meets targetCoins (AND) both conditions satisfied', () => {
      const state = makeState({
        winCondition: makeWinCondition({ targetLevel: 2, targetCoins: 50, winType: 'AND' }),
        player: makePlayer({ playerLevel: 2, coins: 50 }),
      });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('VICTORY');
    });

    it('does NOT trigger VICTORY when only one AND condition is satisfied', () => {
      const state = makeState({
        winCondition: makeWinCondition({ targetLevel: 5, targetCoins: 50, winType: 'AND' }),
        player: makePlayer({ playerLevel: 1, coins: 50 }),
      });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('PLAYING');
    });
  });

  describe('SUMMIT win condition', () => {
    it('does not auto-VICTORY player for SUMMIT type (player must use UI)', () => {
      const state = makeState({
        winCondition: makeWinCondition({ winType: 'SUMMIT', targetLevel: 0, targetCoins: 0 }),
        player: makePlayer({ playerLevel: 5, coins: 5000 }),
      });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('PLAYING');
    });

    it('triggers DEFEAT when a bot is on the Monument hex (SUMMIT)', () => {
      const grid = makeSmallGrid();
      grid['1,0'] = makeHex(1, 0, { structureType: 'MONUMENT' } as Partial<Hex>);
      const bot = makePlayer({ id: 'bot-1', type: EntityType.BOT, q: 1, r: 0 });
      const state = makeState({
        winCondition: makeWinCondition({ winType: 'SUMMIT', targetLevel: 0, targetCoins: 0 }),
        grid,
        bots: [bot],
      });
      const events: GameEvent[] = [];
      const index = new WorldIndex(state.grid, [state.player, ...state.bots]);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('DEFEAT');
      expect(events.some(e => e.type === 'DEFEAT')).toBe(true);
    });
  });

  describe('bot-triggered loss in standard modes', () => {
    it('triggers DEFEAT when a bot meets win condition (OR)', () => {
      const bot = makePlayer({ id: 'bot-1', type: EntityType.BOT, playerLevel: 5, coins: 0 });
      const state = makeState({
        winCondition: makeWinCondition({ targetLevel: 3, targetCoins: 9999, winType: 'OR' }),
        bots: [bot],
      });
      const events: GameEvent[] = [];
      const index = makeIndex(state);

      system.update(state, index, events);

      expect(state.gameStatus).toBe('DEFEAT');
    });
  });
});
