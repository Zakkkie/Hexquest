import { ActionProcessor } from '../../engine/ActionProcessor';
import { WorldIndex } from '../../engine/WorldIndex';
import {
  EntityType,
  EntityState,
  type Entity,
  type Hex,
  type SessionState,
  type GameAction,
} from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

const makeEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'player-1',
  type: EntityType.PLAYER,
  state: EntityState.IDLE,
  q: 0,
  r: 0,
  playerLevel: 2,
  coins: 50,
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

/**
 * Build a minimal 5×5 grid (-2..+2 on both axes) of L0 revealed hexes,
 * plus one L1 hex owned by the player at (1,0).
 */
function buildGrid(): Record<string, Hex> {
  const grid: Record<string, Hex> = {};
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      const key = `${q},${r}`;
      grid[key] = makeHex(q, r);
    }
  }
  // One owned L1 hex for RECOVER tests
  grid['1,0'] = makeHex(1, 0, {
    currentLevel: 1,
    maxLevel: 1,
    ownerId: 'player-1',
  });
  return grid;
}

function buildTestState(playerOverrides: Partial<Entity> = {}): {
  state: SessionState;
  index: WorldIndex;
} {
  const player = makeEntity(playerOverrides);
  const grid = buildGrid();

  const state: SessionState = {
    stateVersion: 0,
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
    entropy: { current: 50, max: 100, threshold: 0 },
    activePoi: null,
    outgoingEvents: [],
  };

  const index = new WorldIndex(grid, [player]);
  return { state, index };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActionProcessor', () => {
  let processor: ActionProcessor;

  beforeEach(() => {
    processor = new ActionProcessor();
  });

  // -------------------------------------------------------------------------
  // validateAction — version / lock / entity checks
  // -------------------------------------------------------------------------

  describe('validateAction — stale state version', () => {
    it('rejects action when stateVersion mismatches current state', () => {
      const { state, index } = buildTestState();
      state.stateVersion = 5;
      const action: GameAction = { type: 'WAIT', stateVersion: 3 };
      const result = processor.validateAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/STALE STATE/);
    });

    it('accepts action when stateVersion matches', () => {
      const { state, index } = buildTestState();
      state.stateVersion = 5;
      const action: GameAction = { type: 'WAIT', stateVersion: 5 };
      const result = processor.validateAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
    });

    it('accepts action when stateVersion is omitted (no version check)', () => {
      const { state, index } = buildTestState();
      state.stateVersion = 99;
      const action: GameAction = { type: 'WAIT' };
      const result = processor.validateAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
    });
  });

  describe('validateAction — LOCKED actor', () => {
    it('rejects any action when actor is LOCKED', () => {
      const { state, index } = buildTestState({ state: EntityState.LOCKED });
      const action: GameAction = { type: 'WAIT' };
      const result = processor.validateAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Actor Locked');
    });
  });

  describe('validateAction — unknown actor', () => {
    it('returns Entity not found for an unknown actorId', () => {
      const { state, index } = buildTestState();
      const action: GameAction = { type: 'WAIT' };
      const result = processor.validateAction(state, index, 'no-such-entity', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Entity not found');
    });
  });

  // -------------------------------------------------------------------------
  // MOVE action
  // -------------------------------------------------------------------------

  describe('MOVE action', () => {
    it('valid move to adjacent L0 hex succeeds and queues movement', () => {
      const { state, index } = buildTestState({ moves: 5 });
      const action: GameAction = { type: 'MOVE', path: [{ q: 1, r: 0 }] };
      // Override (1,0) back to plain L0 so height diff is 0
      state.grid['1,0'] = makeHex(1, 0);
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.state).toBe(EntityState.MOVING);
      expect(state.player.movementQueue.length).toBeGreaterThan(0);
      expect(state.player.moves).toBe(4); // 1 move consumed
    });

    it('deducts correct moves for multi-step path', () => {
      const { state, index } = buildTestState({ moves: 5 });
      // Ensure all cells exist and are L0
      state.grid['1,0'] = makeHex(1, 0);
      state.grid['2,0'] = makeHex(2, 0);
      const action: GameAction = { type: 'MOVE', path: [{ q: 1, r: 0 }, { q: 2, r: 0 }] };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.moves).toBe(3); // 2 steps × 1 move each
    });

    it('move into VOID hex is rejected', () => {
      const { state, index } = buildTestState({ moves: 5 });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });
      const action: GameAction = { type: 'MOVE', path: [{ q: 1, r: 0 }] };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/VOID/);
    });

    it('move to non-adjacent hex (height diff > 1) is rejected by staircase rule', () => {
      const { state, index } = buildTestState({ moves: 10 });
      // L0 player → L2 hex in one step: violates staircase rule
      state.grid['1,0'] = makeHex(1, 0, { currentLevel: 2, maxLevel: 2 });
      const action: GameAction = { type: 'MOVE', path: [{ q: 1, r: 0 }] };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/STEEP/);
    });

    it('staircase rule: stepping L0→L1→L2 succeeds (diff=1 each step)', () => {
      const { state, index } = buildTestState({ moves: 10 });
      state.grid['1,0'] = makeHex(1, 0, { currentLevel: 1, maxLevel: 1 });
      state.grid['2,0'] = makeHex(2, 0, { currentLevel: 2, maxLevel: 2 });
      const action: GameAction = {
        type: 'MOVE',
        path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
      };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
    });

    it('cannot move when player has 0 moves and insufficient coins', () => {
      const { state, index } = buildTestState({ moves: 0, coins: 0 });
      state.grid['1,0'] = makeHex(1, 0);
      const action: GameAction = { type: 'MOVE', path: [{ q: 1, r: 0 }] };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
    });

    it('MOVE action deducts moves normally even when freeMovement config is set', () => {
      const { state, index } = buildTestState({ moves: 5 });
      state.grid['1,0'] = makeHex(1, 0);
      (state as any).activeLevelConfig = { freeMovement: true, hooks: {} };
      const action: GameAction = { type: 'MOVE', path: [{ q: 1, r: 0 }] };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.moves).toBe(4);
    });

    it('uses coins when moves are depleted (exchange rate = 5 coins/move)', () => {
      const { state, index } = buildTestState({ moves: 0, coins: 50 });
      state.grid['1,0'] = makeHex(1, 0);
      const action: GameAction = { type: 'MOVE', path: [{ q: 1, r: 0 }] };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.coins).toBe(45); // 50 - 5
    });
  });

  // -------------------------------------------------------------------------
  // DIG action
  // -------------------------------------------------------------------------

  describe('DIG action', () => {
    it('dig on current hex queues DIG intent', () => {
      const { state, index } = buildTestState();
      const action: GameAction = { type: 'DIG', coord: { q: 0, r: 0 } };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.movementQueue[0]).toMatchObject({ intent: 'DIG' });
    });

    it('dig on a different coord than player position is rejected', () => {
      const { state, index } = buildTestState();
      // Player is at (0,0); trying to dig (2,0) remotely
      const action: GameAction = { type: 'DIG', coord: { q: 2, r: 0 } };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Must be on target/);
    });

    it('dig on a MONUMENT hex — action queued (DIG does not itself block MONUMENT)', () => {
      // Based on reading handleDig: it only checks actor position, not structureType.
      // MONUMENT protection is enforced by the GrowthSystem, not ActionProcessor.
      const { state, index } = buildTestState();
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      const action: GameAction = { type: 'DIG', coord: { q: 0, r: 0 } };
      const result = processor.applyAction(state, index, 'player-1', action);
      // ActionProcessor queues it; growth system enforces monument protection
      expect(result.ok).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // UPGRADE action
  // -------------------------------------------------------------------------

  describe('UPGRADE action', () => {
    it('upgrade on current hex queues UPGRADE intent', () => {
      const { state, index } = buildTestState({ storage: 1 });
      const action: GameAction = { type: 'UPGRADE', coord: { q: 0, r: 0 } };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.movementQueue[0]).toMatchObject({ upgrade: true });
    });

    it('upgrade on a different coord is rejected', () => {
      const { state, index } = buildTestState({ storage: 1 });
      const action: GameAction = { type: 'UPGRADE', coord: { q: 2, r: 0 } };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Must be on target/);
    });

    it('upgrade with custom intent is preserved in queue', () => {
      const { state, index } = buildTestState({ storage: 1 });
      const action: GameAction = {
        type: 'UPGRADE',
        coord: { q: 0, r: 0 },
        intent: 'RECOVER',
      };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.movementQueue[0]).toMatchObject({ intent: 'RECOVER' });
    });
  });

  // -------------------------------------------------------------------------
  // RECOVER (via UPGRADE intent='RECOVER')
  // -------------------------------------------------------------------------

  describe('RECOVER action (via UPGRADE with intent=RECOVER)', () => {
    it('recover on current hex queues RECOVER intent successfully', () => {
      const { state, index } = buildTestState();
      // Player is at (0,0); dispatch UPGRADE with intent RECOVER on own hex
      state.grid['0,0'] = makeHex(0, 0, { ownerId: 'player-1', currentLevel: 1, maxLevel: 1 });
      const action: GameAction = {
        type: 'UPGRADE',
        coord: { q: 0, r: 0 },
        intent: 'RECOVER',
      };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.movementQueue[0]).toMatchObject({ intent: 'RECOVER' });
    });

    it('recover action on different coord is rejected', () => {
      const { state, index } = buildTestState();
      state.grid['1,0'] = makeHex(1, 0, { ownerId: 'player-1', currentLevel: 1, maxLevel: 1 });
      const action: GameAction = {
        type: 'UPGRADE',
        coord: { q: 1, r: 0 },
        intent: 'RECOVER',
      };
      // Player is at (0,0), not (1,0)
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Must be on target/);
    });
  });

  // -------------------------------------------------------------------------
  // RECHARGE_MOVE (exchange credits for moves)
  // -------------------------------------------------------------------------

  describe('RECHARGE_MOVE action', () => {
    it('exchanges 5 coins for 1 move when sufficient coins are available', () => {
      const { state, index } = buildTestState({ coins: 50, moves: 0 });
      const action: GameAction = { type: 'RECHARGE_MOVE' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.coins).toBe(45);
      expect(state.player.moves).toBe(1);
    });

    it('recharge fails when fewer than 5 coins', () => {
      const { state, index } = buildTestState({ coins: 4, moves: 0 });
      const action: GameAction = { type: 'RECHARGE_MOVE' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Insufficient funds/i);
    });

    it('recharge succeeds with exactly 5 coins leaving 0', () => {
      const { state, index } = buildTestState({ coins: 5, moves: 2 });
      const action: GameAction = { type: 'RECHARGE_MOVE' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.coins).toBe(0);
      expect(state.player.moves).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // WAIT action
  // -------------------------------------------------------------------------

  describe('WAIT action', () => {
    it('WAIT always succeeds and changes nothing', () => {
      const { state, index } = buildTestState();
      const movesBefore = state.player.moves;
      const coinsBefore = state.player.coins;
      const action: GameAction = { type: 'WAIT' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.moves).toBe(movesBefore);
      expect(state.player.coins).toBe(coinsBefore);
    });

    it('WAIT is allowed even when actor is MOVING', () => {
      const { state, index } = buildTestState({ state: EntityState.MOVING });
      const action: GameAction = { type: 'WAIT' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Level hook: onBeforeAction
  // -------------------------------------------------------------------------

  describe('activeLevelConfig.hooks.onBeforeAction', () => {
    it('rejects action when hook returns ok=false', () => {
      const { state, index } = buildTestState();
      (state as any).activeLevelConfig = {
        hooks: {
          onBeforeAction: (_s: SessionState, _a: GameAction) => ({
            ok: false,
            reason: 'blocked by hook',
          }),
        },
      };
      const action: GameAction = { type: 'WAIT' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('blocked by hook');
    });

    it('allows action when hook returns ok=true', () => {
      const { state, index } = buildTestState();
      (state as any).activeLevelConfig = {
        hooks: {
          onBeforeAction: (_s: SessionState, _a: GameAction) => ({ ok: true }),
        },
      };
      const action: GameAction = { type: 'WAIT' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
    });

    it('allows action when hook returns null (no-op)', () => {
      const { state, index } = buildTestState();
      (state as any).activeLevelConfig = {
        hooks: {
          onBeforeAction: () => null,
        },
      };
      const action: GameAction = { type: 'WAIT' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
    });

    it('hook is checked before stateVersion staleness', () => {
      // Hook fires first in validateAction; stale version is checked after
      const { state, index } = buildTestState();
      state.stateVersion = 10;
      (state as any).activeLevelConfig = {
        hooks: {
          onBeforeAction: () => ({ ok: false, reason: 'hook fired first' }),
        },
      };
      const action: GameAction = { type: 'WAIT', stateVersion: 1 };
      const result = processor.validateAction(state, index, 'player-1', action);
      expect(result.reason).toBe('hook fired first');
    });
  });

  // -------------------------------------------------------------------------
  // DESTROY_ITEM action
  // -------------------------------------------------------------------------

  describe('DESTROY_ITEM action', () => {
    it('destroys item by id without applying its effect', () => {
      const { state, index } = buildTestState({
        inventory: [
          {
            id: 'item-1',
            baseId: 'spent_fuel_cell',
            rarity: 'COMMON',
            name: 'Spent Fuel Cell',
            description: 'Adds moves',
            timestamp: 0,
            visualType: 'fuel',
            effectType: 'ADD_MOVES',
            effectValue: 3,
            effectDescription: '+3 Moves',
          },
        ],
      });
      const movesBefore = state.player.moves;
      const action: GameAction = { type: 'DESTROY_ITEM', itemId: 'item-1' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
      expect(state.player.inventory).toHaveLength(0);
      expect(state.player.moves).toBe(movesBefore);
    });

    it('fails when item id does not exist in inventory', () => {
      const { state, index } = buildTestState();
      const action: GameAction = { type: 'DESTROY_ITEM', itemId: 'nonexistent' };
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Item not found');
    });
  });

  // -------------------------------------------------------------------------
  // Bot actor support
  // -------------------------------------------------------------------------

  describe('bot actor support', () => {
    it('validates and applies action for a registered bot', () => {
      const { state, index } = buildTestState();
      const bot = makeEntity({
        id: 'bot-1',
        type: EntityType.BOT,
        q: -1,
        r: 0,
        moves: 5,
        coins: 50,
      });
      state.bots = [bot];
      state.grid['-1,0'] = makeHex(-1, 0);
      index.rebuild(state.grid, [state.player, bot]);

      const action: GameAction = { type: 'WAIT' };
      const result = processor.applyAction(state, index, 'bot-1', action);
      expect(result.ok).toBe(true);
    });

    it('unknown bot id returns Entity not found', () => {
      const { state, index } = buildTestState();
      const action: GameAction = { type: 'WAIT' };
      const result = processor.validateAction(state, index, 'ghost-bot', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Entity not found');
    });
  });

  // -------------------------------------------------------------------------
  // MOVING state blocks non-WAIT actions
  // -------------------------------------------------------------------------

  describe('MOVING actor state', () => {
    it('rejects non-WAIT action when actor is already MOVING', () => {
      const { state, index } = buildTestState({ state: EntityState.MOVING });
      const action: GameAction = { type: 'DIG', coord: { q: 0, r: 0 } };
      const result = processor.validateAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Actor Moving');
    });

    it('RECHARGE_MOVE is allowed while MOVING', () => {
      const { state, index } = buildTestState({ state: EntityState.MOVING });
      const action: GameAction = { type: 'RECHARGE_MOVE' };
      const result = processor.validateAction(state, index, 'player-1', action);
      expect(result.ok).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Unknown action type
  // -------------------------------------------------------------------------

  describe('unknown action type', () => {
    it('returns Unknown Action for unrecognised action type', () => {
      const { state, index } = buildTestState();
      const action = { type: 'TELEPORT' } as unknown as GameAction;
      const result = processor.applyAction(state, index, 'player-1', action);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe('Unknown Action');
    });
  });

  // -------------------------------------------------------------------------
  // RESTORE_HEX action
  // -------------------------------------------------------------------------

  describe('RESTORE_HEX action', () => {
    // Shared item factories
    const makeItem = (overrides: Partial<import('../../types').Item> = {}): import('../../types').Item => ({
      id: 'item-restore-1',
      baseId: 'spent_fuel_cell',
      rarity: 'COMMON',
      name: 'Spent Fuel Cell',
      description: 'A common item',
      timestamp: 0,
      visualType: 'fuel',
      effectType: 'ADD_MOVES',
      effectValue: 3,
      effectDescription: '+3 Moves',
      negativeEffectType: 'LOSE_MOVES',
      negativeEffectValue: 2,
      negativeEffectLabel: 'Moves Lost',
      ...overrides,
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('adjacent VOID hex + Common item: success when Math.random() < 0.25', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0);
      const { state, index } = buildTestState({
        inventory: [makeItem({ rarity: 'COMMON' })],
      });
      // Place a VOID hex adjacent to player at (1,0)
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });
      const entropyBefore = state.entropy.current;

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(true);
      // Hex restored to L0 with no structureType
      expect(state.grid['1,0'].structureType).toBeUndefined();
      expect(state.grid['1,0'].currentLevel).toBe(0);
      // Item consumed
      expect(state.player.inventory).toHaveLength(0);
      // Entropy increased by GAIN_RESTORE_SUCCESS (3.0)
      expect(state.entropy.current).toBeCloseTo(entropyBefore + 3.0);
    });

    it('adjacent VOID hex + Common item: failure when Math.random() > 0.25', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const movesBefore = 5;
      const { state, index } = buildTestState({
        moves: movesBefore,
        inventory: [makeItem({ rarity: 'COMMON', negativeEffectType: 'LOSE_MOVES', negativeEffectValue: 2 })],
      });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });
      const entropyBefore = state.entropy.current;

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Stabilization Failed/);
      // Hex remains VOID
      expect(state.grid['1,0'].structureType).toBe('VOID');
      // Item still consumed on failure
      expect(state.player.inventory).toHaveLength(0);
      // Entropy decreased by COST_RESTORE_FAIL (1.0)
      expect(state.entropy.current).toBeCloseTo(entropyBefore - 1.0);
      // Negative effect applied: LOSE_MOVES -2
      expect(state.player.moves).toBe(movesBefore - 2);
    });

    it('adjacent VOID hex + Uncommon item: success when Math.random() < 0.40', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.39);
      const { state, index } = buildTestState({
        inventory: [makeItem({ rarity: 'UNCOMMON' })],
      });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(true);
      expect(state.grid['1,0'].structureType).toBeUndefined();
    });

    it('adjacent VOID hex + Rare item: success when Math.random() < 0.65', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.64);
      const { state, index } = buildTestState({
        inventory: [makeItem({ rarity: 'RARE' })],
      });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(true);
      expect(state.grid['1,0'].structureType).toBeUndefined();
    });

    it('adjacent VOID hex + Legendary item: success when Math.random() < 0.90', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.89);
      const { state, index } = buildTestState({
        inventory: [makeItem({ rarity: 'LEGENDARY' })],
      });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(true);
      expect(state.grid['1,0'].structureType).toBeUndefined();
    });

    it('non-VOID hex target fails validation', () => {
      const { state, index } = buildTestState({
        inventory: [makeItem()],
      });
      // (1,0) is a plain L0 hex (structureType 'NONE'), not VOID
      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/not a Void/i);
    });

    it('no item in inventory fails validation', () => {
      const { state, index } = buildTestState({ inventory: [] });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Item missing/i);
    });

    it('distance > 1 from player fails validation', () => {
      const { state, index } = buildTestState({
        inventory: [makeItem()],
      });
      // Player is at (0,0); (2,0) is distance 2
      state.grid['2,0'] = makeHex(2, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 2, r: 0 }, itemId: 'item-restore-1' };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Too far/i);
    });

    it('item is consumed on both success and failure', () => {
      // Test success path — already tested above; test failure path inventory length
      vi.spyOn(Math, 'random').mockReturnValue(0.99); // Will fail for all rarities
      const { state, index } = buildTestState({
        inventory: [makeItem({ rarity: 'COMMON' })],
      });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      processor.applyAction(state, index, 'player-1', action);

      // Even on failure, inventory shrinks by 1
      expect(state.player.inventory).toHaveLength(0);
    });

    it('entropy increases by GAIN_RESTORE_SUCCESS (3.0) on success', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0);
      const { state, index } = buildTestState({
        inventory: [makeItem({ rarity: 'LEGENDARY' })],
      });
      state.entropy.current = 50;
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      processor.applyAction(state, index, 'player-1', action);

      expect(state.entropy.current).toBeCloseTo(53.0);
    });

    it('entropy decreases by COST_RESTORE_FAIL (1.0) on failure', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const { state, index } = buildTestState({
        inventory: [makeItem({ rarity: 'LEGENDARY' })],
      });
      state.entropy.current = 50;
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      processor.applyAction(state, index, 'player-1', action);

      expect(state.entropy.current).toBeCloseTo(49.0);
    });

    it('RECOVERY_USED event emitted on success', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.0);
      const { state, index } = buildTestState({
        inventory: [makeItem({ rarity: 'LEGENDARY' })],
      });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      processor.applyAction(state, index, 'player-1', action);

      const successEvent = state.outgoingEvents.find(e => e.type === 'RECOVERY_USED');
      expect(successEvent).toBeDefined();
    });

    it('ERROR event emitted on failure', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.99);
      const { state, index } = buildTestState({
        inventory: [makeItem({ rarity: 'COMMON' })],
      });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'VOID' });

      const action: GameAction = { type: 'RESTORE_HEX', coord: { q: 1, r: 0 }, itemId: 'item-restore-1' };
      processor.applyAction(state, index, 'player-1', action);

      const errorEvent = state.outgoingEvents.find(e => e.type === 'ERROR');
      expect(errorEvent).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // ACTIVATE_MONUMENT action
  // -------------------------------------------------------------------------

  describe('ACTIVATE_MONUMENT action', () => {
    const makeMonumentItem = (
      id: string,
      baseId: string,
      rarity: import('../../types').ItemRarity = 'RARE',
    ): import('../../types').Item => ({
      id,
      baseId,
      rarity,
      name: 'Monument Key',
      description: 'Required for monument',
      timestamp: 0,
      visualType: 'artifact',
      effectType: 'ADD_MOVES',
      effectValue: 0,
      effectDescription: '',
    });

    it('player on Monument hex, correct items → VICTORY', () => {
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'ancient_key')],
      });
      // Player at (0,0) — place a MONUMENT there
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ancient_key'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(true);
      expect(state.gameStatus).toBe('VICTORY');
    });

    it('player NOT on Monument hex fails validation', () => {
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'ancient_key')],
      });
      // Player at (0,0) which is plain L0 — not a monument
      state.monumentRequirements = ['ancient_key'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Monument/);
    });

    it('Monument hex has wrong structureType fails validation', () => {
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'ancient_key')],
      });
      // Player at (0,0) — CAPITAL, not MONUMENT
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'CAPITAL' });
      state.monumentRequirements = ['ancient_key'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Monument/);
    });

    it('wrong number of items fails validation', () => {
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'ancient_key')],
      });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      // Requirements need 2 items, only providing 1
      state.monumentRequirements = ['ancient_key', 'second_key'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Requires 2 items/);
    });

    it('item not in inventory fails validation', () => {
      const { state, index } = buildTestState({ inventory: [] });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ancient_key'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/not in inventory/i);
    });

    it('items consumed from inventory on successful activation', () => {
      const { state, index } = buildTestState({
        inventory: [
          makeMonumentItem('item-a', 'ancient_key'),
          makeMonumentItem('item-b', 'second_key'),
        ],
      });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ancient_key', 'second_key'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a', 'item-b'] };
      processor.applyAction(state, index, 'player-1', action);

      expect(state.player.inventory).toHaveLength(0);
    });

    it('gameStatus set to VICTORY on activation (no separate event emitted)', () => {
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'ancient_key')],
      });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ancient_key'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      processor.applyAction(state, index, 'player-1', action);

      expect(state.gameStatus).toBe('VICTORY');
      // ACTIVATE_MONUMENT sets gameStatus directly — does not push a VICTORY event
      const victoryEvent = state.outgoingEvents.find(e => e.type === 'VICTORY');
      expect(victoryEvent).toBeUndefined();
    });

    it('duplicate item IDs in itemIds are rejected', () => {
      const { state, index } = buildTestState({
        inventory: [
          makeMonumentItem('item-a', 'ancient_key'),
          makeMonumentItem('item-b', 'second_key'),
        ],
      });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ancient_key', 'second_key'];

      // Same item ID used twice
      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a', 'item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Duplicate/i);
    });

    it('ONE_OF slot: item in monumentAlternatives is accepted', () => {
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'fragment_alpha')],
      });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ONE_OF'];
      state.monumentAlternatives = ['fragment_alpha', 'fragment_beta'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(true);
      expect(state.gameStatus).toBe('VICTORY');
    });

    it('ONE_OF slot: item NOT in monumentAlternatives is rejected', () => {
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'wrong_fragment')],
      });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ONE_OF'];
      state.monumentAlternatives = ['fragment_alpha', 'fragment_beta'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/not in the required set/i);
    });

    it('ACTIVATE_MONUMENT bypasses checkWinCondition hook — sets VICTORY directly', () => {
      // Even if a level hook would normally deny victory, ACTIVATE_MONUMENT goes straight to VICTORY
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'ancient_key')],
      });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ancient_key'];
      (state as any).activeLevelConfig = {
        hooks: {
          checkWinCondition: () => false,
        },
      };

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(true);
      expect(state.gameStatus).toBe('VICTORY');
    });

    it('adjacent to Monument (not on it) fails validation', () => {
      // Player at (0,0); Monument at (1,0) — player is adjacent but not standing on it
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'ancient_key')],
      });
      state.grid['1,0'] = makeHex(1, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ancient_key'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(false);
      expect(result.reason).toMatch(/Monument/);
    });

    it('ANY wildcard requirement accepts any item regardless of baseId', () => {
      const { state, index } = buildTestState({
        inventory: [makeMonumentItem('item-a', 'random_item_base_id')],
      });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = ['ANY'];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: ['item-a'] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(true);
      expect(state.gameStatus).toBe('VICTORY');
    });

    it('zero requirements with zero itemIds succeeds if standing on Monument', () => {
      const { state, index } = buildTestState({ inventory: [] });
      state.grid['0,0'] = makeHex(0, 0, { structureType: 'MONUMENT' });
      state.monumentRequirements = [];

      const action: GameAction = { type: 'ACTIVATE_MONUMENT', itemIds: [] };
      const result = processor.applyAction(state, index, 'player-1', action);

      expect(result.ok).toBe(true);
      expect(state.gameStatus).toBe('VICTORY');
    });
  });
});
