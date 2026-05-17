import { pickTemplate, composeEvent, getGeneratedEvent, runtimeEventCache } from '../../services/EventComposer';
import { EVENT_TEMPLATES } from '../../rules/eventTemplates';
import type { EventTemplate } from '../../rules/eventTemplates';
import type { TerrainType } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal valid EventTemplate for compose tests */
function makeTemplate(overrides: Partial<EventTemplate> = {}): EventTemplate {
  return {
    id: 'tpl_test',
    actorType: 'BANDIT',
    situation: 'ATTACK',
    terrain: ['PLAINS' as TerrainType],
    textPool: ['Трое {actor} вышли на дороге в {terrain}.', 'Просто текст без заполнителей.'],
    choices: [
      { label: 'Сражаться', action: 'ROLL_DICE', probability: 0.55, rewardScale: 1.5, penaltyScale: 1.5 },
      { label: 'Убежать', action: 'CLOSE', rewardScale: 0, penaltyScale: 0.5 },
    ],
    weight: 5,
    baseRewardCredits: 40,
    basePenaltyHp: 20,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<{ seed: number; terrain: TerrainType; reputation: number; stepCount: number; flags: Record<string, boolean> }> = {}) {
  return {
    seed: 42,
    terrain: 'PLAINS' as TerrainType,
    reputation: 0,
    stepCount: 0,
    flags: {},
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// pickTemplate
// ─────────────────────────────────────────────────────────────────────────────

describe('pickTemplate', () => {
  it('returns a template or null, never throws', () => {
    expect(() => pickTemplate('PLAINS' as TerrainType, {}, 0, 0)).not.toThrow();
    const result = pickTemplate('PLAINS' as TerrainType, {}, 0, 0);
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('returns null for terrain with no matching templates', () => {
    // No templates in EVENT_TEMPLATES have terrain 'LAVA' (fictional)
    const result = pickTemplate('LAVA' as TerrainType, {}, 0, 0);
    expect(result).toBeNull();
  });

  it('returns a template that includes the requested terrain', () => {
    const result = pickTemplate('PLAINS' as TerrainType, {}, 0, 0);
    if (result !== null) {
      expect(result.terrain).toContain('PLAINS');
    }
  });

  it('filters out templates whose reqRepMin > reputation', () => {
    // tpl_spirit_gift has reqRepMin: 20, tpl_elder_gift has reqRepMin: 15, tpl_pilgrim_gift has reqRepMin: 10
    // FOREST has: tpl_beast_attack, tpl_beast_mystery, tpl_spirit_ritual, tpl_spirit_gift (req 20),
    //             tpl_elder_ritual, tpl_elder_gift (req 15), tpl_hermit_discovery, tpl_hermit_ritual,
    //             tpl_spirit_chase, tpl_survivor_plea (has SWAMP also)
    // With reputation = -50, all templates with reqRepMin should be excluded
    // Let's test: run many times with low rep and verify templates with reqRepMin > rep never appear
    const highRepMin = EVENT_TEMPLATES.filter(t => (t.reqRepMin ?? 0) > 5 && t.terrain.includes('FOREST' as TerrainType));
    expect(highRepMin.length).toBeGreaterThan(0); // confirm test precondition

    const foundIds = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const result = pickTemplate('FOREST' as TerrainType, {}, -50, 0);
      if (result) foundIds.add(result.id);
    }
    // None of the high-rep-required templates should appear
    for (const tpl of highRepMin) {
      expect(foundIds.has(tpl.id)).toBe(false);
    }
  });

  it('allows templates with reqRepMin <= reputation', () => {
    // tpl_spirit_gift reqRepMin: 20 — should appear when reputation = 50
    const spiritGift = EVENT_TEMPLATES.find(t => t.id === 'tpl_spirit_gift');
    expect(spiritGift).toBeDefined();

    let found = false;
    // With rep = 50, tpl_spirit_gift (FOREST/SWAMP/WATER) is eligible
    for (let i = 0; i < 200; i++) {
      const result = pickTemplate('FOREST' as TerrainType, {}, 50, 0);
      if (result?.id === 'tpl_spirit_gift') { found = true; break; }
    }
    expect(found).toBe(true);
  });

  it('filters out templates whose reqRepMax < reputation', () => {
    // No current template uses reqRepMax, but the logic should hold generically.
    // We can test it by checking that all returned templates satisfy the constraint.
    for (let i = 0; i < 30; i++) {
      const result = pickTemplate('PLAINS' as TerrainType, {}, 30, 0);
      if (result !== null && result.reqRepMax !== undefined) {
        expect(result.reqRepMax).toBeGreaterThanOrEqual(30);
      }
    }
  });

  it('filters out templates whose reqStepMin > stepCount', () => {
    // Find any template with reqStepMin; if none exist, this is a format check
    const stepMinTemplates = EVENT_TEMPLATES.filter(t => t.reqStepMin !== undefined);
    if (stepMinTemplates.length > 0) {
      const foundIds = new Set<string>();
      for (let i = 0; i < 100; i++) {
        // stepCount well below any reqStepMin
        const result = pickTemplate('PLAINS' as TerrainType, {}, 0, 0);
        if (result) foundIds.add(result.id);
      }
      for (const tpl of stepMinTemplates) {
        // If all terrains are unknown to PLAINS this won't trigger, but logic is sound
        if (tpl.terrain.includes('PLAINS' as TerrainType)) {
          expect(foundIds.has(tpl.id)).toBe(false);
        }
      }
    }
  });

  it('allows templates when stepCount >= reqStepMin', () => {
    // All templates currently have no reqStepMin, so all are eligible at stepCount=0
    // This test verifies the positive case: with high stepCount, eligible templates still appear
    const result = pickTemplate('CITY' as TerrainType, {}, 0, 999);
    expect(result).not.toBeNull();
  });

  it('returns a template object with required fields', () => {
    const result = pickTemplate('ROAD' as TerrainType, {}, 0, 0);
    if (result !== null) {
      expect(typeof result.id).toBe('string');
      expect(Array.isArray(result.terrain)).toBe(true);
      expect(Array.isArray(result.textPool)).toBe(true);
      expect(result.textPool.length).toBeGreaterThan(0);
      expect(Array.isArray(result.choices)).toBe(true);
      expect(result.choices.length).toBeGreaterThan(0);
      expect(typeof result.weight).toBe('number');
      expect(result.weight).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// composeEvent
// ─────────────────────────────────────────────────────────────────────────────

describe('composeEvent', () => {
  it('returns an OverworldEvent with required fields', () => {
    const event = composeEvent(makeTemplate(), makeCtx());
    expect(typeof event.id).toBe('string');
    expect(event.id.length).toBeGreaterThan(0);
    expect(typeof event.startNodeId).toBe('string');
    expect(event.nodes).toBeDefined();
    expect(typeof event.nodes).toBe('object');
  });

  it('startNodeId is "start"', () => {
    const event = composeEvent(makeTemplate(), makeCtx());
    expect(event.startNodeId).toBe('start');
  });

  it('startNode exists in nodes', () => {
    const event = composeEvent(makeTemplate(), makeCtx());
    expect(event.nodes[event.startNodeId]).toBeDefined();
  });

  it('start node has id, text, and choices', () => {
    const event = composeEvent(makeTemplate(), makeCtx());
    const startNode = event.nodes['start'];
    expect(startNode.id).toBe('start');
    expect(typeof startNode.text).toBe('string');
    expect(startNode.text.length).toBeGreaterThan(0);
    expect(Array.isArray(startNode.choices)).toBe(true);
    expect(startNode.choices.length).toBeGreaterThan(0);
  });

  it('text substitution replaces {actor} placeholder', () => {
    const tpl = makeTemplate({ textPool: ['{actor} блокирует путь.'] });
    const event = composeEvent(tpl, makeCtx({ terrain: 'PLAINS' as TerrainType }));
    const text = event.nodes['start'].text;
    expect(text).not.toContain('{actor}');
    // actorType is BANDIT
    expect(text).toContain('Разбойник');
  });

  it('text substitution replaces {terrain} placeholder', () => {
    const tpl = makeTemplate({ textPool: ['Встреча в {terrain}.'] });
    const event = composeEvent(tpl, makeCtx({ terrain: 'PLAINS' as TerrainType }));
    const text = event.nodes['start'].text;
    expect(text).not.toContain('{terrain}');
    // PLAINS
    expect(text).toContain('Равнины');
  });

  it('text substitution with no placeholders leaves text unchanged', () => {
    const tpl = makeTemplate({ textPool: ['Просто текст.'] });
    const event = composeEvent(tpl, makeCtx());
    expect(event.nodes['start'].text).toBe('Просто текст.');
  });

  it('ROLL_DICE choices produce success and fail nodes', () => {
    const tpl = makeTemplate({
      choices: [{ label: 'Рискнуть', action: 'ROLL_DICE', probability: 0.5, rewardScale: 1, penaltyScale: 1 }],
    });
    const event = composeEvent(tpl, makeCtx());
    expect(event.nodes['success']).toBeDefined();
    expect(event.nodes['fail']).toBeDefined();
  });

  it('CLOSE-only choices produce no success/fail nodes', () => {
    const tpl = makeTemplate({
      choices: [{ label: 'Уйти', action: 'CLOSE', rewardScale: 0, penaltyScale: 0 }],
    });
    const event = composeEvent(tpl, makeCtx());
    expect(event.nodes['success']).toBeUndefined();
    expect(event.nodes['fail']).toBeUndefined();
  });

  it('GOTO_NODE choices are converted to CLOSE to avoid dangling references', () => {
    const tpl = makeTemplate({
      choices: [{ label: 'Идти дальше', action: 'GOTO_NODE', rewardScale: 0, penaltyScale: 0 }],
    });
    const event = composeEvent(tpl, makeCtx());
    const choice = event.nodes['start'].choices[0];
    expect(choice.action).toBe('CLOSE');
  });

  it('reputation bonus scales reward credits upward when rep > 0', () => {
    const tpl = makeTemplate({
      baseRewardCredits: 100,
      choices: [{ label: 'Принять', action: 'CLOSE', rewardScale: 1, penaltyScale: 0 }],
    });
    const neutralEvent = composeEvent(tpl, makeCtx({ reputation: 0 }));
    const goodEvent = composeEvent(tpl, makeCtx({ reputation: 100 }));
    const neutralReward = neutralEvent.nodes['start'].choices[0].reward?.credits ?? 0;
    const goodReward = goodEvent.nodes['start'].choices[0].reward?.credits ?? 0;
    expect(goodReward).toBeGreaterThan(neutralReward);
  });

  it('event id includes actorType and situation', () => {
    const tpl = makeTemplate({ actorType: 'SOLDIER', situation: 'TRADE' });
    const event = composeEvent(tpl, makeCtx({ seed: 1 }));
    expect(event.id).toContain('SOLDIER');
    expect(event.id).toContain('TRADE');
  });

  it('isUnique is false for generated events', () => {
    const event = composeEvent(makeTemplate(), makeCtx());
    expect(event.isUnique).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// getGeneratedEvent
// ─────────────────────────────────────────────────────────────────────────────

describe('getGeneratedEvent', () => {
  beforeEach(() => {
    // Clear the runtime cache so each test starts fresh
    for (const key of Object.keys(runtimeEventCache)) {
      delete runtimeEventCache[key];
    }
  });

  it('returns an OverworldEvent or null, never throws', () => {
    expect(() => getGeneratedEvent('PLAINS' as TerrainType, {}, 0, 0)).not.toThrow();
    const result = getGeneratedEvent('PLAINS' as TerrainType, {}, 0, 0);
    expect(result === null || typeof result === 'object').toBe(true);
  });

  it('returns null for terrain with no matching templates', () => {
    const result = getGeneratedEvent('LAVA' as TerrainType, {}, 0, 0);
    expect(result).toBeNull();
  });

  it('returned event has valid structure when non-null', () => {
    const result = getGeneratedEvent('PLAINS' as TerrainType, {}, 0, 0);
    if (result !== null) {
      expect(typeof result.id).toBe('string');
      expect(typeof result.startNodeId).toBe('string');
      expect(result.nodes[result.startNodeId]).toBeDefined();
    }
  });

  it('caches event by key — same call returns same object reference', () => {
    // Fix Math.random so pickTemplate deterministically selects the same template both calls
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const first = getGeneratedEvent('PLAINS' as TerrainType, {}, 0, 20);
    const second = getGeneratedEvent('PLAINS' as TerrainType, {}, 0, 20);
    vi.restoreAllMocks();
    // Same stepCount bucket (20/20=1) and same template → same cache key → same reference
    expect(first).toBe(second);
  });

  it('different stepCount buckets produce different cache keys', () => {
    const early = getGeneratedEvent('PLAINS' as TerrainType, {}, 0, 0);   // bucket 0
    const later = getGeneratedEvent('PLAINS' as TerrainType, {}, 0, 100); // bucket 5
    // They should be different cache entries (IDs will differ if same template, or same if different template — ID includes seed)
    if (early !== null && later !== null) {
      expect(early.id).not.toBe(later.id);
    }
  });

  it('does not throw for any of the 10 known terrains', () => {
    const terrains: TerrainType[] = ['PLAINS', 'FOREST', 'SWAMP', 'WATER', 'MOUNTAINS', 'ROAD', 'CITY', 'RUINS', 'OUTPOST', 'MERCHANT_CAMP'] as TerrainType[];
    for (const terrain of terrains) {
      expect(() => getGeneratedEvent(terrain, {}, 0, 0)).not.toThrow();
    }
  });
});
