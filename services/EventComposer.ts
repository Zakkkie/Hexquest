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
  _flags: Record<string, boolean>,
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
    BANDIT: 'SND_RAIDER (Разбойник)', 
    SOLDIER: 'VSS_SENTRY (Солдат)', 
    MERCHANT: 'TRADE_UNIT (Торговец)',
    SCHOLAR: 'LOGOS_DEAN (Учёный)', 
    SURVIVOR: 'ERROR_ENTITY (Выживший)', 
    BEAST: 'BIO_ANOMALY (Существо)',
    SPIRIT: 'NEBULA_ECHO (Дух)', 
    MACHINE: 'CASC_DRONE (Механизм)', 
    PILGRIM: 'VOID_SEEKER (Паломник)',
    CHILD: 'LOST_NODE (Ребёнок)', 
    ELDER: 'ARCHIVE_HOLDER (Старик)', 
    KNIGHT: 'ORDER_PALADIN (Рыцарь)',
    SPY: 'SND_OPERATIVE (Лазутчик)', 
    HERMIT: 'ROOT_ADMIN (Отшельник)', 
    GHOST: 'DATA_GHOST (Призрак)',
  };
  const terrainNames: Record<string, string> = {
    PLAINS: 'PLATEAU_01 (Равнины)', 
    FOREST: 'BIO_DOME_B (Лесу)', 
    SWAMP: 'WASTE_CANAL (Болоте)',
    WATER: 'COOLANT_BASIN (У воды)', 
    MOUNTAINS: 'CRUST_RIFT (Горах)', 
    ROAD: 'TRANSIT_LINE (Дороге)',
    CITY: 'METROPLEX (Городе)', 
    RUINS: 'VOID_ZONE (Руинах)', 
    OUTPOST: 'CONTROL_HUB (Аванпосту)',
    MERCHANT_CAMP: 'FLEA_MARKET (Лагере торговцев)',
  };
  text = text.replace('{actor}', actorNames[template.actorType] ?? 'ID_UNKNOWN');
  text = text.replace('{terrain}', terrainNames[ctx.terrain] ?? ctx.terrain.toUpperCase());

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
    image: `https://picsum.photos/seed/${template.actorType}_${template.situation}_${ctx.seed % 100}/800/400?grayscale&blur=1`,
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
