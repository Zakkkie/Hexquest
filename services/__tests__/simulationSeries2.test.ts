import { describe, it, expect } from 'vitest';
import { GameEngine } from '../../engine/GameEngine';
import { CAMPAIGN_LEVELS } from '../../campaign/levels';
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
      currentTime: 0,
      state: 'running',
      resume: async () => {}
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
  if (!res.ok) {
    console.error('Action failed:', action, res.reason);
  }

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

describe('Series 2 Campaign Level Simulations (2.1 - 2.10)', () => {
  it('Sim 2.1: Монолит - Ascends staircase and activates Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.1')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 3, targetR: 0 });

    expect(engine.state?.player.q).toBe(3);
    expect(engine.state?.player.r).toBe(0);

    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 3, r: 0 } });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });

  it('Sim 2.2: Погребённые секреты - Digs shaft, climbs ramp, activates Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.2')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    if (engine.state?.player) {
      engine.state.player.moves = 30;
    }

    await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
    await executeAction(engine, { type: 'DIG' });
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
    await executeAction(engine, { type: 'DIG' });
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
    await executeAction(engine, { type: 'DIG' });
    await executeAction(engine, { type: 'DIG' });

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

    const itemIds = engine.state?.player.inventory.map(i => i.id) || [];
    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 5, r: 0 }, itemIds });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });

  it('Sim 2.3: Брешь Обелиска - Hacks Obelisk, drops wall, activates Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.3')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    // Climb north to Obelisk at (0,2)
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 2 });

    // Hack Obelisk
    await executeAction(engine, { type: 'ACTIVATE_MINI_MONUMENT', miniMonumentHexKey: '0,2' });

    // Wall at (1,0) should drop from 4 to 1
    expect(engine.state?.grid['1,0']?.currentLevel).toBe(1);

    // Return and proceed to Monolith at (2,0)
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });

    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 2, r: 0 } });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });

  it('Sim 2.4: Реактор - Crosses reactor peak L4, recovers energy, activates Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.4')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    // Ascent to reactor peak at (4,0)
    await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 3, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 4, targetR: 0 });

    // Recover energy 3 times on reactor hex (4,0)
    for (let i = 0; i < 3; i++) {
      if (engine.state?.grid['4,0']) {
        engine.state.grid['4,0'].lastRecoveryTime = 0;
      }
      engine.state!.isPlayerGrowing = true;
      engine.state!.userIntentType = 'RECOVER';
      engine.state!.player.lastMoveTime = Date.now() - 1000;
      engine.state!.player.state = EntityState.IDLE;
      for (let t = 0; t < 10; t++) {
        await engine.processTick();
      }
    }
    engine.state!.isPlayerGrowing = false;

    // Descent to Monolith at (8,0)
    for (const [tq, tr] of [[5,0], [6,0], [7,0], [8,0]]) {
      const moveRes = engine.applyAction('player-1', { type: 'MOVE', targetQ: tq, targetR: tr });
      if (!moveRes.ok) console.log(`MOVE to (${tq},${tr}) failed:`, moveRes.reason);
      for (let i = 0; i < 60; i++) {
        if (engine.state?.player) engine.state.player.lastMoveTime = Date.now() - 1000;
        await engine.processTick();
        if (engine.state?.player?.movementQueue.length === 0 && engine.state?.player?.state === EntityState.IDLE) break;
      }
    }

    // Add item for Monument requirement ['ANY']
    if (engine.state?.player) {
      engine.state.player.inventory = [
        { id: 'item-1', name: 'Item 1', baseId: 'cargo_prism', rarity: 'COMMON', effectType: 'NONE', effectValue: 0, effectDescription: '' }
      ];
    }

    const itemIds = engine.state?.player.inventory.map(i => i.id) || [];
    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 8, r: 0 }, itemIds });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });

  it('Sim 2.5: Обменный курс - Traverses cheap shelf and activates Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.5')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    // Walk along shelf: (0,1) -> (1,1) -> (2,1) -> (3,1) -> (3,0) -> (3,-1)
    const steps = [
      { q: 0, r: 1 },
      { q: 1, r: 1 },
      { q: 2, r: 1 },
      { q: 3, r: 1 },
      { q: 3, r: 0 },
      { q: 3, r: -1 }
    ];

    for (const step of steps) {
      await executeAction(engine, { type: 'MOVE', targetQ: step.q, targetR: step.r });
    }

    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 3, r: -1 } });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });

  it('Sim 2.6: Замок глубины - Digs supports in order and reaches sunken Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.6')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    // Dig support A (0,1) to -1
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
    await executeAction(engine, { type: 'DIG' });

    // Dig support B (1,-1) to -1
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: -1 });
    await executeAction(engine, { type: 'DIG' });

    // Dig landing (1,0) to -1, then -2
    await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
    await executeAction(engine, { type: 'DIG' });
    await executeAction(engine, { type: 'DIG' });

    expect(engine.state?.grid['1,0']?.currentLevel).toBe(-2);

    // Step down to Monolith at (2,0) L-3
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });

    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 2, r: 0 } });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });

  it('Sim 2.7: Хрупкая переправа - Crosses brittle bridge along north fork to Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.7')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    // Correct path: (1,0) -> (2,0) -> (3,0) -> (3,-1) -> (4,-2)
    const path = [
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 3, r: 0 },
      { q: 3, r: -1 },
      { q: 4, r: -2 }
    ];

    for (const step of path) {
      await executeAction(engine, { type: 'MOVE', targetQ: step.q, targetR: step.r });
    }

    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 4, r: -2 } });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });

  it('Sim 2.8: Три обелиска - Hacks A, B, C in sequence and activates Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.8')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    // 1. Obelisk A at (0,2)
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 2 });
    await executeAction(engine, { type: 'ACTIVATE_MINI_MONUMENT', miniMonumentHexKey: '0,2' });
    expect(engine.state?.grid['1,0']?.currentLevel).toBe(1);

    // 2. Obelisk B at (2,-1)
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: -1 });
    await executeAction(engine, { type: 'ACTIVATE_MINI_MONUMENT', miniMonumentHexKey: '2,-1' });
    expect(engine.state?.grid['3,0']?.currentLevel).toBe(1);

    // 3. Obelisk C at (4,-1)
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 3, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 4, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 4, targetR: -1 });
    await executeAction(engine, { type: 'ACTIVATE_MINI_MONUMENT', miniMonumentHexKey: '4,-1' });
    expect(engine.state?.grid['5,0']?.currentLevel).toBe(1);

    // 4. Final Monolith at (6,0)
    await executeAction(engine, { type: 'MOVE', targetQ: 4, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 5, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 6, targetR: 0 });

    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 6, r: 0 } });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });

  it('Sim 2.9: Энтропийный обход - Visits Stabilizer first and activates Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.9')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    // Step north to Stabilizer at (0,-1)
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: -1 });

    // Return to start and climb ramp to Monolith at (3,0)
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 3, targetR: 0 });

    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 3, r: 0 } });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });

  it('Sim 2.10: Космическое выравнивание - Capstone: Hacks Obelisks A & B, ascends to Monolith', async () => {
    const level = CAMPAIGN_LEVELS.find(l => l.id === '2.10')!;
    const session = await createInitialSessionData(null, level, 'RU', null, DEFAULT_CAMPAIGN_UPGRADES);
    const engine = new GameEngine(session);

    // 1. Obelisk A at (0,2)
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 2 });
    await executeAction(engine, { type: 'ACTIVATE_MINI_MONUMENT', miniMonumentHexKey: '0,2' });
    expect(engine.state?.grid['1,0']?.currentLevel).toBe(1);

    // 2. Obelisk B at (2,-1)
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 1 });
    await executeAction(engine, { type: 'MOVE', targetQ: 0, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 1, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: -1 });
    await executeAction(engine, { type: 'ACTIVATE_MINI_MONUMENT', miniMonumentHexKey: '2,-1' });
    expect(engine.state?.grid['3,0']?.currentLevel).toBe(1);

    // 3. Ascend to Monolith at (5,0)
    await executeAction(engine, { type: 'MOVE', targetQ: 2, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 3, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 4, targetR: 0 });
    await executeAction(engine, { type: 'MOVE', targetQ: 5, targetR: 0 });

    // Add items for Monument requirements ['fuel_cell', 'reality_patch']
    if (engine.state?.player) {
      engine.state.player.inventory = [
        { id: 'item-1', name: 'Fuel Cell', baseId: 'fuel_cell', rarity: 'COMMON', effectType: 'NONE', effectValue: 0, effectDescription: '' },
        { id: 'item-2', name: 'Reality Patch', baseId: 'reality_patch', rarity: 'RARE', effectType: 'NONE', effectValue: 0, effectDescription: '' }
      ];
    }

    const itemIds = engine.state?.player.inventory.map(i => i.id) || [];
    await executeAction(engine, { type: 'ACTIVATE_MONUMENT', coord: { q: 5, r: 0 }, itemIds });
    const won = level.hooks?.checkWinCondition?.(engine.state!) ?? false;
    expect(won).toBe(true);
  });
});
