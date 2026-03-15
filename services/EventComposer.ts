import { OverworldEvent, TerrainType } from '../types.ts';
import { EVENT_TEMPLATES, EventTemplate } from '../rules/eventTemplates.ts';

// ─────────────────────────────────────────────────────────────────────────────
// EventComposer — procedural event expansion engine
// Converts EventTemplate → OverworldEvent at runtime
// Results are cached in runtimeEventCache so re-triggers show the same event
// ─────────────────────────────────────────────────────────────────────────────

export const runtimeEventCache: Record<string, OverworldEvent> = {};

interface ComposeContext {
  seed: number;
  terrain: TerrainType;
  reputation: number;
  stepCount: number;
  flags: Record<string, boolean>;
}

/** Seeded pseudo-random (deterministic for given seed) */
function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/** Pick a template appropriate for current context */
export function pickTemplate(
  terrain: TerrainType,
  flags: Record<string, boolean>,
  reputation: number,
  stepCount: number,
): EventTemplate | null {
  const candidates = EVENT_TEMPLATES.filter(t => {
    if (!t.terrain.includes(terrain)) return false;
    if (t.reqRepMin !== undefined && reputation < t.reqRepMin) return false;
    if (t.reqRepMax !== undefined && reputation > t.reqRepMax) return false;
    if (t.reqStepMin !== undefined && stepCount < t.reqStepMin) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  // Weighted random selection
  const totalWeight = candidates.reduce((sum, t) => sum + t.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const t of candidates) {
    roll -= t.weight;
    if (roll <= 0) return t;
  }
  return candidates[candidates.length - 1];
}

/** Expand a template into a full OverworldEvent */
export function composeEvent(template: EventTemplate, ctx: ComposeContext): OverworldEvent {
  const rng = (offset: number) => seededRandom(ctx.seed + offset);

  // Pick text from pool
  const textIdx = Math.floor(rng(1) * template.textPool.length);
  let text = template.textPool[textIdx];

  // Substitute placeholders
  const actorNames: Record<string, string> = {
    BANDIT: 'разбойник', SOLDIER: 'солдат', MERCHANT: 'торговец',
    SCHOLAR: 'учёный', SURVIVOR: 'выживший', BEAST: 'существо',
    SPIRIT: 'дух', MACHINE: 'механизм', PILGRIM: 'паломник',
    CHILD: 'ребёнок', ELDER: 'старик', KNIGHT: 'рыцарь',
    SPY: 'лазутчик', HERMIT: 'отшельник', GHOST: 'призрак',
  };
  const terrainNames: Record<string, string> = {
    PLAINS: 'равнины', FOREST: 'лесу', SWAMP: 'болоте',
    WATER: 'у воды', MOUNTAINS: 'горах', ROAD: 'дороге',
    CITY: 'городе', RUINS: 'руинах', OUTPOST: 'аванпосту',
    MERCHANT_CAMP: 'лагере торговцев',
  };
  text = text.replace('{actor}', actorNames[template.actorType] ?? 'незнакомец');
  text = text.replace('{terrain}', terrainNames[ctx.terrain] ?? ctx.terrain.toLowerCase());

  // Scale rewards based on reputation (friendly NPCs give more)
  const repBonus = 1 + Math.max(0, ctx.reputation) / 200;
  const rewardCredits = Math.round(template.baseRewardCredits * repBonus);
  const penaltyHp = template.basePenaltyHp;

  const eventId = `generated_${template.actorType}_${template.situation}_${ctx.seed % 997}`;

  const nodes: OverworldEvent['nodes'] = {};

  // Build main node with expanded choices
  const expandedChoices = template.choices.map(c => ({
    label: c.label,
    action: c.action as OverworldEvent['nodes'][string]['choices'][number]['action'],
    probability: c.probability,
    successNode: c.action === 'ROLL_DICE' ? 'success' : undefined,
    failNode: c.action === 'ROLL_DICE' ? 'fail' : undefined,
    addReputation: c.addReputation,
    reward: c.rewardScale > 0 ? { credits: Math.round(rewardCredits * c.rewardScale) } : undefined,
    penalty: c.penaltyScale > 0 ? { hp: Math.round(penaltyHp * c.penaltyScale) } : undefined,
  }));

  // Filter out GOTO_NODE choices that reference nodes not yet built (convert to CLOSE)
  const finalChoices = expandedChoices.map(c =>
    c.action === 'GOTO_NODE' ? { ...c, action: 'CLOSE' as const, successNode: undefined, failNode: undefined } : c
  );

  // For ROLL_DICE choices, create success/fail nodes
  const hasRollDice = finalChoices.some(c => c.action === 'ROLL_DICE');

  nodes['start'] = {
    id: 'start',
    image: `https://picsum.photos/seed/${template.actorType}_${template.situation}/800/350`,
    text,
    choices: finalChoices as OverworldEvent['nodes'][string]['choices'],
  };

  if (hasRollDice) {
    nodes['success'] = {
      id: 'success',
      text: 'Удача улыбнулась вам.',
      choices: [{ label: 'Продолжить путь', action: 'CLOSE', reward: { credits: rewardCredits } }],
    };
    nodes['fail'] = {
      id: 'fail',
      text: 'Не повезло. Вы выбираетесь с трудом.',
      choices: [{ label: 'Продолжить путь', action: 'CLOSE', penalty: { hp: penaltyHp } }],
    };
  }

  return {
    id: eventId,
    isUnique: false,
    startNodeId: 'start',
    nodes,
  };
}

/** Get or compose a generated event for terrain/context */
export function getGeneratedEvent(
  terrain: TerrainType,
  flags: Record<string, boolean>,
  reputation: number,
  stepCount: number,
): OverworldEvent | null {
  const template = pickTemplate(terrain, flags, reputation, stepCount);
  if (!template) return null;

  // Use a seed based on step count so events change each day but are reproducible
  const seed = Math.floor(stepCount / 20) * 997 + terrain.charCodeAt(0);
  const cacheKey = `generated_${template.id}_${seed}`;

  if (runtimeEventCache[cacheKey]) {
    return runtimeEventCache[cacheKey];
  }

  const event = composeEvent(template, { seed, terrain, reputation, stepCount, flags });
  // Give it a stable cache-friendly ID
  const cachedEvent = { ...event, id: cacheKey };
  runtimeEventCache[cacheKey] = cachedEvent;
  return cachedEvent;
}
