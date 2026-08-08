import { checkGrowthCondition } from '../../rules/growth';
import { describe, it, expect, beforeEach } from 'vitest';
import { CAMPAIGN_LEVELS } from '../../campaign/levels';
import { useGameStore } from '../../store';
import { GameEngine } from '../../engine/GameEngine';
import { createInitialSessionData } from '../../services/sessionFactory';
import { DEFAULT_CAMPAIGN_UPGRADES, EntityState } from '../../types';

// Mock window and AudioContext for headless node test environment
if (typeof window === 'undefined') {
  const mockAudioContext = function() {
    const makeParam = () => ({ value: 0, setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} });
    return {
      createGain: () => ({ connect() {}, gain: makeParam() }),
      createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: makeParam(), type: 'sine' }),
      createBufferSource: () => ({ connect() {}, start() {}, stop() {}, buffer: null }),
      createBuffer: () => ({ getChannelData: () => new Float32Array(100) }),
      createDynamicsCompressor: () => ({ connect() {}, threshold: makeParam(), knee: makeParam(), ratio: makeParam(), attack: makeParam(), release: makeParam() }),
      createBiquadFilter: () => ({ connect() {}, frequency: makeParam(), Q: makeParam(), type: 'lowpass' }),
      createConvolver: () => ({ connect() {}, buffer: null }),
      createDelay: () => ({ connect() {}, delayTime: makeParam() }),
      destination: {},
      sampleRate: 44100,
      currentTime: 0
    };
  };
  (global as any).window = {
    AudioContext: mockAudioContext,
    webkitAudioContext: mockAudioContext,
    addEventListener: () => {},
    removeEventListener: () => {}
  };
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (k: string) => store[k] || null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
  (global as any).sessionStorage = (global as any).localStorage;
}

async function executeAction(engine: GameEngine, action: any) {
  if (engine.state?.player) {
    engine.state.player.lastMoveTime = Date.now() - 1000;
    engine.state.player.state = EntityState.IDLE;
    if (engine.state.player.storage < 10) {
      engine.state.player.storage = 10;
    }
  }
  const res = engine.applyAction('player-1', action);
  expect(res.ok).toBe(true);

  for (let i = 0; i < 60; i++) {
    if (engine.state?.player) {
      engine.state.player.lastMoveTime = Date.now() - 1000;
    }
    await engine.processTick();
    if (engine.state?.player?.movementQueue.length === 0 && engine.state?.player?.state === EntityState.IDLE) {
      break;
    }
  }
}

describe('Player Actions, Navigation & First 10 Levels Simulation', () => {

  beforeEach(() => {
    // Reset store state before each test
    const store = useGameStore.getState();
    store.resetProgress?.();
    store.setUIState('MENU');
    store.setCampaignMode('STORY');
  });

  describe('1. UI Window State Transitions and Navigation Simulation', () => {
    it('simulates player navigating between main menu, campaign map, upgrades tree, and modals', () => {
      const store = useGameStore.getState();

      // Start at MENU
      store.setUIState('MENU');
      expect(useGameStore.getState().uiState).toBe('MENU');

      // Player clicks "Campaign"
      store.setUIState('CAMPAIGN_MAP');
      expect(useGameStore.getState().uiState).toBe('CAMPAIGN_MAP');

      // Player toggles Campaign Mode between STORY and LEVELS
      store.setCampaignMode('LEVELS');
      expect(useGameStore.getState().campaignMode).toBe('LEVELS');
      store.setCampaignMode('STORY');
      expect(useGameStore.getState().campaignMode).toBe('STORY');

      // Player opens Upgrades Tree
      store.setUIState('UPGRADES_TREE');
      expect(useGameStore.getState().uiState).toBe('UPGRADES_TREE');

      // Player returns to Campaign Map
      store.setUIState('CAMPAIGN_MAP');
      expect(useGameStore.getState().uiState).toBe('CAMPAIGN_MAP');

      // Player opens Story Builder / Defense Mode
      store.setUIState('STORY_BUILDER');
      expect(useGameStore.getState().uiState).toBe('STORY_BUILDER');

      // Player returns to Menu
      store.setUIState('MENU');
      expect(useGameStore.getState().uiState).toBe('MENU');
    });

    it('simulates opening and closing ephemeral dialogs and modals', () => {
      const store = useGameStore.getState();
      useGameStore.setState({ session: { monumentRequirements: [] } as any });

      // Monument Dialog
      store.openMonumentDialog();
      expect(useGameStore.getState().monumentDialogState.isOpen).toBe(true);
      store.closeMonumentDialog();
      expect(useGameStore.getState().monumentDialogState.isOpen).toBe(false);

      // Void Dialog
      store.openVoidDialog(1, -1);
      expect(useGameStore.getState().voidDialogTarget).toEqual({ q: 1, r: -1 });
    });
  });

  describe('2. First 10 Campaign Levels Availability', () => {
    it('has at least 10 levels configured', () => {
      expect(CAMPAIGN_LEVELS.length).toBeGreaterThanOrEqual(10);
    });

    it('verifies the exact IDs of the first 10 campaign levels', () => {
      const first10Ids = CAMPAIGN_LEVELS.slice(0, 10).map(l => l.id);
      expect(first10Ids).toEqual([
        '1.0',
        '1.1',
        '1.2',
        '1.3',
        '1.4',
        '1.5',
        '1.6',
        '1.7',
        '2.1',
        '2.2'
      ]);
    });
  });

  describe('3. Logic Simulation for Level 1.0 (Sim 1.0: Инициация и Вертикаль)', () => {
    it('simulates player completing Level 1.0 along the designated path', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '1.0')!;
      expect(level).toBeDefined();

      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      expect(engine.state?.player.q).toBe(0);
      expect(engine.state?.player.r).toBe(0);

      // 1. Move to (1,0)
      await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
      expect(engine.state?.player.q).toBe(1);

      // 2. Upgrade (1,0) to L1
      await executeAction(engine, { type: 'UPGRADE' });
      expect(engine.state?.grid['1,0'].currentLevel).toBe(1);

      // 3. Move to (2,0)
      await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
      expect(engine.state?.player.q).toBe(2);

      // 4. Move to (3,0)
      await executeAction(engine, { type: 'MOVE', targetQ: 3, targetR: 0 });
      expect(engine.state?.player.q).toBe(3);

      // 5. Dig (3,0) down to L1
      await executeAction(engine, { type: 'DIG' });
      expect(engine.state?.grid['3,0'].currentLevel).toBe(1);

      // 6. Move to (4,0)
      await executeAction(engine, { type: 'MOVE', targetQ: 4, targetR: 0 });
      expect(engine.state?.player.q).toBe(4);

      // 7. Move to (5,0)
      await executeAction(engine, { type: 'MOVE', targetQ: 5, targetR: 0 });
      expect(engine.state?.player.q).toBe(5);

      // 8. Climb Snail Spiral path
      const spiralPath = [
        { q: 6, r: 0 },
        { q: 6, r: 1 },
        { q: 5, r: 2 },
        { q: 4, r: 3 },
        { q: 3, r: 3 },
        { q: 2, r: 3 },
        { q: 1, r: 3 },
        { q: 0, r: 3 },
        { q: -1, r: 3 },
        { q: -2, r: 3 } // Portal
      ];

      for (const step of spiralPath) {
        await executeAction(engine, { type: 'MOVE', targetQ: step.q, targetR: step.r });
      }

      expect(engine.state?.player.q).toBe(-2);
      expect(engine.state?.player.r).toBe(3);

      // Verify Win Condition
      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

  describe('4. Logic Simulation for Level 1.1 (Sim 1.1: Сбор Материалов)', () => {
    it('simulates player safely traversing the South Road to reach the Capital', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '1.1')!;
      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      const safeSouthPath = [
        { q: 0, r: 1 },
        { q: -1, r: 2 },
        { q: -2, r: 3 },
        { q: -3, r: 3 },
        { q: -4, r: 3 },
        { q: -5, r: 3 },
        { q: -6, r: 3 },
        { q: -7, r: 3 },
        { q: -8, r: 3 },
        { q: -9, r: 2 },
        { q: -10, r: 1 },
        { q: -10, r: 0 } // Capital
      ];

      for (const step of safeSouthPath) {
        await executeAction(engine, { type: 'MOVE', targetQ: step.q, targetR: step.r });
      }

      expect(engine.state?.player.q).toBe(-10);
      expect(engine.state?.player.r).toBe(0);

      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

  describe('5. Logic Simulation for Level 1.2 (Sim 1.2: Замок Градиента)', () => {
    it('simulates unlocking the Gradient Lock and lowering Center to L0', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '1.2')!;
      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      // Player starts at (1,-1) L1. Move to Center (0,0) L2
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });

      // Dig Center from L2 to L1
      await executeAction(engine, { type: 'DIG' });
      expect(engine.state?.grid['0,0'].currentLevel).toBe(1);

      // Move to neighbor (0,1) L1 and dig to L0
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
      await executeAction(engine, { type: 'DIG' });
      expect(engine.state?.grid['0,1'].currentLevel).toBe(0);

      // Move to neighbor (1,0) L1 and dig to L0
      await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
      await executeAction(engine, { type: 'DIG' });
      expect(engine.state?.grid['1,0'].currentLevel).toBe(0);

      // Move back to Center (0,0) L1 and dig to L0
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
      await executeAction(engine, { type: 'DIG' });
      expect(engine.state?.grid['0,0'].currentLevel).toBe(0);

      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

  describe('6. Logic Simulation for Level 1.3 (Sim 1.3: Потоки Энергии)', () => {
    it('simulates recovering energy from reactor and buffer plates to accumulate 15 credits', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '1.3')!;
      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      // Player starts at (0,0) Reactor L2
      // Recover 3 times on reactor
      for (let i = 0; i < 3; i++) {
        await executeAction(engine, { type: 'UPGRADE', intent: 'RECOVER' });
      }

      // Move to neighbor plates and recover
      const plates = [
        { q: 0, r: -1 },
        { q: 1, r: 0 },
        { q: 0, r: 1 },
        { q: -1, r: 1 },
        { q: -1, r: 0 }
      ];

      for (const plate of plates) {
        if ((engine.state?.player.coins ?? 0) >= 15) break;
        await executeAction(engine, { type: 'MOVE', targetQ: plate.q, targetR: plate.r });
        await executeAction(engine, { type: 'UPGRADE', intent: 'RECOVER' });
      }

      expect(engine.state?.player.coins).toBeGreaterThanOrEqual(15);
      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

  describe('7. Logic Simulation for Level 1.4 (Sim 1.4: Архитектура Опор)', () => {
    it('simulates constructing support cascade and building center L3 tower', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '1.4')!;
      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      // 1. Upgrade Center (0,0) to L1
      await executeAction(engine, { type: 'UPGRADE' });

      // 2. Build L1 ring around Center
      const ring = [
        { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
        { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
      ];
      for (const pos of ring) {
        await executeAction(engine, { type: 'MOVE', targetQ: pos.q, targetR: pos.r });
        await executeAction(engine, { type: 'UPGRADE' });
      }

      // 3. Upgrade ring hexes to L2 while Center is L1
      for (const pos of ring) {
        await executeAction(engine, { type: 'MOVE', targetQ: pos.q, targetR: pos.r });
        await executeAction(engine, { type: 'UPGRADE' });
      }

      // 4. Move to Center (0,0) and upgrade to L2 (supported by depression rule / ring)
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
      await executeAction(engine, { type: 'UPGRADE' });

      // 5. Upgrade Center (0,0) from L2 to L3 (supported by 6 L2 neighbors)
      await executeAction(engine, { type: 'UPGRADE' });

      expect(engine.state?.grid['0,0'].currentLevel).toBe(3);
      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

  describe('8. Logic Simulation for Level 1.5 (Sim 1.5: Крах и Регенерация)', () => {
    it('simulates patching reality rift and digging center mine to depth -2', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '1.5')!;
      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      // 1. Apply Reality Patch to VOID rift at (1,-1)
      const patchItem = engine.state?.player.inventory.find(i => i.baseId === 'reality_patch');
      expect(patchItem).toBeDefined();

      await executeAction(engine, {
        type: 'RESTORE_HEX',
        coord: { q: 1, r: -1 },
        itemId: patchItem!.id
      });
      expect(engine.state?.grid['1,-1'].structureType).not.toBe('VOID');

      // 2. Dig Center (0,0) to -1
      await executeAction(engine, { type: 'DIG' });

      // 3. Dig support neighbors (1,-1) and (0,1) to -1
      await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: -1 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
      await executeAction(engine, { type: 'DIG' });

      // 4. Return to Center (0,0) and dig to -2
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
      await executeAction(engine, { type: 'DIG' });

      expect(engine.state?.grid['0,0'].currentLevel).toBe(-2);
      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

  describe('9. Logic Simulation for Level 1.6 (Sim 1.6: Три Столпа Реальности)', () => {
    it('simulates digging for patches and bridging 3 pillars to reach Capital at (8,0)', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '1.6')!;
      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      // --- Pillar 1 ---
      // Dig support hexes first, then dig Center (0,0) to -2 to uncover reality_patch
      await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'DIG' }); // reaches -2, finds patch

      let patchItem = engine.state?.player.inventory.find(i => i.baseId === 'reality_patch');
      expect(patchItem).toBeDefined();

      // Move to edge (1,0) and heal VOID at (2,0)
      await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
      await executeAction(engine, {
        type: 'RESTORE_HEX',
        coord: { q: 2, r: 0 },
        itemId: patchItem!.id
      });
      expect(engine.state?.grid['2,0'].structureType).not.toBe('VOID');

      // --- Cross to Pillar 2 ---
      await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
      await executeAction(engine, { type: 'MOVE', targetQ: 3, targetR: 0 });
      await executeAction(engine, { type: 'MOVE', targetQ: 4, targetR: 0 });

      // On Pillar 2, dig support hexes and center (4,0) to -2 for second patch
      await executeAction(engine, { type: 'MOVE', targetQ: 5, targetR: 0 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'MOVE', targetQ: 4, targetR: 1 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'MOVE', targetQ: 4, targetR: 0 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'DIG' }); // reaches -2, finds second patch

      patchItem = engine.state?.player.inventory.find(i => i.baseId === 'reality_patch');
      expect(patchItem).toBeDefined();

      // Move to edge (5,0) and heal VOID at (6,0)
      await executeAction(engine, { type: 'MOVE', targetQ: 5, targetR: 0 });
      await executeAction(engine, {
        type: 'RESTORE_HEX',
        coord: { q: 6, r: 0 },
        itemId: patchItem!.id
      });
      expect(engine.state?.grid['6,0'].structureType).not.toBe('VOID');

      // --- Cross to Pillar 3 and Capital at (8,0) ---
      await executeAction(engine, { type: 'MOVE', targetQ: 6, targetR: 0 });
      await executeAction(engine, { type: 'MOVE', targetQ: 7, targetR: 0 });
      await executeAction(engine, { type: 'MOVE', targetQ: 8, targetR: 0 });

      expect(engine.state?.player.q).toBe(8);
      expect(engine.state?.player.r).toBe(0);

      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

  describe('10. Logic Simulation for Level 1.7 (Sim 1.7: Финал: Квантовый Пик L4)', () => {
    it('simulates building quantum peak L4 with proper pyramid support', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '1.7')!;
      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      // 1. Upgrade Center (0,0) to L1
      await executeAction(engine, { type: 'UPGRADE' });

      // 2. Build L1 ring around Center (6 ring neighbors)
      const ring = [
        { q: 1, r: 0 }, { q: 0, r: 1 }, { q: -1, r: 1 },
        { q: -1, r: 0 }, { q: 0, r: -1 }, { q: 1, r: -1 }
      ];
      for (const pos of ring) {
        await executeAction(engine, { type: 'MOVE', targetQ: pos.q, targetR: pos.r });
        await executeAction(engine, { type: 'UPGRADE' });
      }

      // 3. Move to Center (0,0) and upgrade to L2 (supported by 6 L1 ring neighbors)
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
      await executeAction(engine, { type: 'UPGRADE' });

      // 4. Upgrade all 6 ring hexes to L2 (supported by adjacent L1 ring neighbors)
      engine.state!.player.playerLevel = 2;
      for (const pos of ring) {
        if (engine.state!.player.storage < 1) {
          engine.state!.player.storage += 10;
        }
        await executeAction(engine, { type: 'MOVE', targetQ: pos.q, targetR: pos.r });
        await executeAction(engine, { type: 'UPGRADE' });
      }

      // 5. Upgrade all 6 ring hexes to L3 (supported by Center [L2] and adjacent ring neighbors [L2])
      engine.state!.player.playerLevel = 3;
      for (const pos of ring) {
        if (engine.state!.player.storage < 1) {
          engine.state!.player.storage += 10;
        }
        await executeAction(engine, { type: 'MOVE', targetQ: pos.q, targetR: pos.r });
        await executeAction(engine, { type: 'UPGRADE' });
      }

      // 6. Move to Center (0,0) [L2] and upgrade to L3 (supported by 6 L3 ring neighbors)
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
      if (engine.state!.player.storage < 1) {
        engine.state!.player.storage += 5;
      }
      engine.state!.player.playerLevel = 3;
      await executeAction(engine, { type: 'UPGRADE' });

      // 7. Upgrade Center (0,0) [L3] to L4 Peak (supported by 6 L3 ring neighbors)
      engine.state!.player.playerLevel = 4;
      await executeAction(engine, { type: 'UPGRADE' });

      expect(engine.state?.grid['0,0'].currentLevel).toBe(4);
      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

  describe('11. Logic Simulation for Level 2.1 (Sim 2.1: Монолит)', () => {
    it('simulates ascending the staircase and activating the Monolith', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '2.1')!;
      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      // Climb staircase: (0,0) L0 -> (1,0) L1 -> (2,0) L2 -> (3,0) L3 [Monolith]
      await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
      await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
      await executeAction(engine, { type: 'MOVE', targetQ: 3, targetR: 0 });

      expect(engine.state?.player.q).toBe(3);
      expect(engine.state?.player.r).toBe(0);

      // Activate Monolith
      await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 3, r: 0 } });

      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

  describe('12. Logic Simulation for Level 2.2 (Sim 2.2: Погребённые секреты)', () => {
    it('simulates digging shaft for moves, climbing ramp, and activating Monolith', async () => {
      const level = CAMPAIGN_LEVELS.find(l => l.id === '2.2')!;
      const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
      const engine = new GameEngine(session);

      // Give player sufficient initial moves to cover digging & climbing
      if (engine.state?.player) {
        engine.state.player.moves = 30;
      }

      // Dig shaft at (0,0) and neighbors to gain moves from excavation bank
      await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
      await executeAction(engine, { type: 'DIG' });
      await executeAction(engine, { type: 'DIG' }); // Shaft at depth -2

      // Climb ascending ramp to Monolith at (5,0): (0,0) -> (1,0) -> (2,0) -> (3,0) L1 -> (4,0) L2 -> (5,0) L3 Monument
      const ramp = [
        { q: 1, r: 0 },
        { q: 2, r: 0 },
        { q: 3, r: 0 },
        { q: 4, r: 0 },
        { q: 5, r: 0 }
      ];

      for (const step of ramp) {
        await executeAction(engine, { type: 'MOVE', targetQ: step.q, targetR: step.r });
      }

      expect(engine.state?.player.q).toBe(5);
      expect(engine.state?.player.r).toBe(0);

      // Ensure player has 3 items for monument requirements ['ANY', 'ANY', 'ANY']
      while ((engine.state?.player.inventory.length ?? 0) < 3) {
        engine.state?.player.inventory.push({
          id: 'mock-item-' + Math.random(),
          name: 'Mock Key',
          baseId: 'raw_container',
          type: 'CONSUMABLE',
          rarity: 'COMMON',
          description: '',
          icon: ''
        });
      }

      const itemIds = engine.state!.player.inventory.slice(0, 3).map(i => i.id);
      await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 5, r: 0 }, itemIds });

      const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
      expect(won).toBe(true);
    });
  });

});
