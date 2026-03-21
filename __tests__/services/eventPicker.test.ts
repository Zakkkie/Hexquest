import { pickOverworldEvent } from '../../services/eventPicker';

// ─────────────────────────────────────────────────────────────────────────────
// pickOverworldEvent — unit tests
// ─────────────────────────────────────────────────────────────────────────────

describe('pickOverworldEvent — basic contract', () => {
  it('returns a string or null, never throws', () => {
    const terrains = ['FOREST', 'MOUNTAINS', 'SWAMP', 'PLAINS', 'WATER', 'RUINS', 'ROAD', 'MERCHANT_CAMP', 'CITY', 'OUTPOST', 'UNKNOWN_TERRAIN'];
    for (const terrain of terrains) {
      expect(() => pickOverworldEvent(terrain, {}, 0, 0)).not.toThrow();
      const result = pickOverworldEvent(terrain, {}, 0, 0);
      expect(result === null || typeof result === 'string').toBe(true);
    }
  });

  it('never returns an empty string', () => {
    const terrains = ['FOREST', 'MOUNTAINS', 'SWAMP', 'PLAINS', 'WATER', 'RUINS', 'ROAD', 'MERCHANT_CAMP', 'CITY', 'OUTPOST'];
    for (const terrain of terrains) {
      for (let i = 0; i < 5; i++) {
        const result = pickOverworldEvent(terrain, {}, 0, 0);
        if (result !== null) {
          expect(result.length).toBeGreaterThan(0);
        }
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// FOREST terrain
// ─────────────────────────────────────────────────────────────────────────────

describe('FOREST terrain', () => {
  const FOREST_POOL = ['forest_elder_encounter', 'forest_ambush', 'forest_spirit_grove', 'forest_trapped_animal', 'forest_witch_hut', 'forest_mushroom_circle', 'forest_smuggler_path', 'forest_lost_expedition', 'forest_corrupted_beast', 'forest_poison_bloom'];

  it('with no flags returns one of the random pool events', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const result = pickOverworldEvent('FOREST', {}, 0, 0);
    expect(FOREST_POOL).toContain(result);
    vi.restoreAllMocks();
  });

  it('with no flags and high random value still returns pool event', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.9999);
    const result = pickOverworldEvent('FOREST', {}, 0, 0);
    expect(FOREST_POOL).toContain(result);
    vi.restoreAllMocks();
  });

  it('forest_elder_quest_done without forest_elder_grateful → forest_elder_reward', () => {
    const result = pickOverworldEvent('FOREST', { forest_elder_quest_done: true }, 0, 0);
    expect(result).toBe('forest_elder_reward');
  });

  it('forest_elder_quest_done AND forest_elder_grateful → falls through to next branch, not forest_elder_reward', () => {
    const result = pickOverworldEvent('FOREST', { forest_elder_quest_done: true, forest_elder_grateful: true }, 0, 0);
    expect(result).not.toBe('forest_elder_reward');
  });

  it('forest_elder_quest without forest_elder_quest_done → forest_bandit_camp', () => {
    const result = pickOverworldEvent('FOREST', { forest_elder_quest: true }, 0, 0);
    expect(result).toBe('forest_bandit_camp');
  });

  it('forest_elder_quest AND forest_elder_quest_done → does NOT return forest_bandit_camp (quest done)', () => {
    // quest_done takes priority (first branch)
    const result = pickOverworldEvent('FOREST', { forest_elder_quest: true, forest_elder_quest_done: true }, 0, 0);
    expect(result).toBe('forest_elder_reward');
  });

  it('forest_met_elder without forest_elder_revisit_completed → forest_elder_revisit', () => {
    const result = pickOverworldEvent('FOREST', { forest_met_elder: true }, 0, 0);
    expect(result).toBe('forest_elder_revisit');
  });

  it('forest_met_elder AND forest_elder_revisit_completed → random pool event', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const result = pickOverworldEvent('FOREST', { forest_met_elder: true, forest_elder_revisit_completed: true }, 0, 0);
    expect(FOREST_POOL).toContain(result);
    vi.restoreAllMocks();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MOUNTAINS terrain
// ─────────────────────────────────────────────────────────────────────────────

describe('MOUNTAINS terrain', () => {
  it('mountain_monastery_welcomed without mountain_monastery_looted → monastery or hermit (r<0.5)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    const result = pickOverworldEvent('MOUNTAINS', { mountain_monastery_welcomed: true }, 0, 0);
    expect(result).toBe('mountain_monastery');
    vi.restoreAllMocks();
  });

  it('mountain_monastery_welcomed without mountain_monastery_looted → hermit (r>=0.5)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const result = pickOverworldEvent('MOUNTAINS', { mountain_monastery_welcomed: true }, 0, 0);
    expect(result).toBe('mountain_hermit');
    vi.restoreAllMocks();
  });

  it('mountain_monastery_welcomed AND mountain_monastery_looted → falls through (random pool)', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const result = pickOverworldEvent('MOUNTAINS', { mountain_monastery_welcomed: true, mountain_monastery_looted: true }, 0, 0);
    // Next branch: no mountain_monastery_found → uses r<0.3 path
    expect(result).toBe('mountain_monastery');
    vi.restoreAllMocks();
  });

  it('no flags, r<0.3 → mountain_monastery', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = pickOverworldEvent('MOUNTAINS', {}, 0, 0);
    expect(result).toBe('mountain_monastery');
    vi.restoreAllMocks();
  });

  it('no flags, 0.3<=r<0.6 → mountain_hermit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.45);
    const result = pickOverworldEvent('MOUNTAINS', {}, 0, 0);
    expect(result).toBe('mountain_hermit');
    vi.restoreAllMocks();
  });

  it('no flags, r>=0.6 → mountain_avalanche', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    const result = pickOverworldEvent('MOUNTAINS', {}, 0, 0);
    expect(result).toBe('mountain_avalanche');
    vi.restoreAllMocks();
  });

  it('mountain_monastery_found set → random pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const result = pickOverworldEvent('MOUNTAINS', { mountain_monastery_found: true }, 0, 0);
    const pool = ['mountain_hermit', 'mountain_avalanche', 'mountains_rope_bridge', 'mountains_cave_system', 'mountains_rockfall', 'mountains_monster_lair', 'mountains_pilgrim_stranger', 'mountains_altitude_sickness', 'mountains_eagle_nest', 'mountains_stone_carving'];
    expect(pool).toContain(result);
    vi.restoreAllMocks();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SWAMP terrain — Void arc
// ─────────────────────────────────────────────────────────────────────────────

describe('SWAMP terrain — Void arc', () => {
  it('void_hunters_quest + no void_sample_collected + no void_hunters_met → void_hunter_camp', () => {
    const result = pickOverworldEvent('SWAMP', { void_hunters_quest: true }, 0, 0);
    expect(result).toBe('void_hunter_camp');
  });

  it('void_hunters_quest + void_hunters_met + no void_sample_collected → void_sample_found', () => {
    const result = pickOverworldEvent('SWAMP', { void_hunters_quest: true, void_hunters_met: true }, 0, 0);
    expect(result).toBe('void_sample_found');
  });

  it('void_sample_collected without void_corruption_handled → void_corruption_spreads', () => {
    const result = pickOverworldEvent('SWAMP', { void_hunters_quest: true, void_sample_collected: true }, 0, 0);
    expect(result).toBe('void_corruption_spreads');
  });

  it('void_corruption_handled without void_purification_done → void_purification', () => {
    const result = pickOverworldEvent('SWAMP', { void_sample_collected: true, void_corruption_handled: true }, 0, 0);
    expect(result).toBe('void_purification');
  });

  it('no arc flags, r<0.3 → swamp_ambush', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = pickOverworldEvent('SWAMP', {}, 0, 0);
    expect(result).toBe('swamp_ambush');
    vi.restoreAllMocks();
  });

  it('no arc flags, 0.3<=r<0.6 → swamp_ruins', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.45);
    const result = pickOverworldEvent('SWAMP', {}, 0, 0);
    expect(result).toBe('swamp_ruins');
    vi.restoreAllMocks();
  });

  it('no arc flags, r>=0.6 → swamp_fisherman', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.8);
    const result = pickOverworldEvent('SWAMP', {}, 0, 0);
    expect(result).toBe('swamp_fisherman');
    vi.restoreAllMocks();
  });

  it('swamp_ambush_completed → random pool event', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const pool = ['swamp_fisherman', 'swamp_ruins', 'swamp_quicksand', 'swamp_will_o_wisp', 'swamp_drowned_village', 'swamp_old_ferry', 'swamp_witch_doctor', 'swamp_toxic_gas', 'swamp_giant_predator', 'swamp_cursed_gold'];
    const result = pickOverworldEvent('SWAMP', { swamp_ambush_completed: true }, 0, 0);
    expect(pool).toContain(result);
    vi.restoreAllMocks();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ROAD terrain — Syndicate arc
// ─────────────────────────────────────────────────────────────────────────────

describe('ROAD terrain — Syndicate arc', () => {
  it('stepCount>=40 without syndicate_war_aware → voss_first_decree', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5); // r>=0.3, so wounded_courier branch cleared
    // First complete wounded_courier_completed so we skip to arc check
    const result = pickOverworldEvent('ROAD', { wounded_courier_completed: true }, 0, 40);
    expect(result).toBe('voss_first_decree');
    vi.restoreAllMocks();
  });

  it('stepCount<40 → does NOT return voss_first_decree', () => {
    const result = pickOverworldEvent('ROAD', { wounded_courier_completed: true }, 0, 39);
    expect(result).not.toBe('voss_first_decree');
  });

  it('stepCount>=40 WITH syndicate_war_aware → random pool, not voss_first_decree', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const result = pickOverworldEvent('ROAD', { wounded_courier_completed: true, syndicate_war_aware: true }, 0, 40);
    expect(result).not.toBe('voss_first_decree');
    vi.restoreAllMocks();
  });

  it('no wounded_courier_completed, r<0.3 → wounded_courier', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    const result = pickOverworldEvent('ROAD', {}, 0, 0);
    expect(result).toBe('wounded_courier');
    vi.restoreAllMocks();
  });

  it('no wounded_courier_completed, r>=0.3 → road_pilgrims', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = pickOverworldEvent('ROAD', {}, 0, 0);
    expect(result).toBe('road_pilgrims');
    vi.restoreAllMocks();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CITY terrain — Arc 8 and 9
// ─────────────────────────────────────────────────────────────────────────────

describe('CITY terrain', () => {
  it('resistance_contact_known without choice flags → resistance_leader', () => {
    const result = pickOverworldEvent('CITY', { resistance_contact_known: true }, 0, 0);
    expect(result).toBe('resistance_leader');
  });

  it('resistance_contact_known AND syndicate_chose_resistance → random pool, not resistance_leader', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const result = pickOverworldEvent('CITY', { resistance_contact_known: true, syndicate_chose_resistance: true }, 0, 0);
    expect(result).not.toBe('resistance_leader');
    vi.restoreAllMocks();
  });

  it('resistance_contact_known AND syndicate_chose_voss → random pool, not resistance_leader', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const result = pickOverworldEvent('CITY', { resistance_contact_known: true, syndicate_chose_voss: true }, 0, 0);
    expect(result).not.toBe('resistance_leader');
    vi.restoreAllMocks();
  });

  it('engineer_blueprint_found without engineer_apprentice_found → engineer_apprentice (takes priority)', () => {
    const result = pickOverworldEvent('CITY', { engineer_blueprint_found: true }, 0, 0);
    expect(result).toBe('engineer_apprentice');
  });

  it('no arc flags → returns a city pool event', () => {
    const pool = ['city_hub', 'city_market_riot', 'city_strange_auction', 'city_bar_fight', 'city_mysterious_client', 'city_festival_day', 'city_rumors_spread', 'city_black_market', 'city_assassination_attempt'];
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const result = pickOverworldEvent('CITY', {}, 0, 0);
    expect(pool).toContain(result);
    vi.restoreAllMocks();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OUTPOST terrain
// ─────────────────────────────────────────────────────────────────────────────

describe('OUTPOST terrain', () => {
  it('syndicate_chose_resistance without spy_hunt_completed, r<0.4 → syndicate_spy_hunt', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    const result = pickOverworldEvent('OUTPOST', { syndicate_chose_resistance: true }, 0, 0);
    expect(result).toBe('syndicate_spy_hunt');
    vi.restoreAllMocks();
  });

  it('syndicate_chose_resistance without spy_hunt_completed, r>=0.4 → outpost_checkpoint', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const result = pickOverworldEvent('OUTPOST', { syndicate_chose_resistance: true }, 0, 0);
    expect(result).toBe('outpost_checkpoint');
    vi.restoreAllMocks();
  });

  it('syndicate_chose_resistance AND syndicate_spy_hunt_completed → random pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const pool = ['outpost_checkpoint', 'outpost_corrupt_captain', 'outpost_double_agent', 'outpost_prisoner_rescue', 'outpost_deserter_plea', 'outpost_loyalty_test', 'outpost_supply_theft', 'outpost_underground_meeting', 'outpost_siege_warning'];
    const result = pickOverworldEvent('OUTPOST', { syndicate_chose_resistance: true, syndicate_spy_hunt_completed: true }, 0, 0);
    expect(pool).toContain(result);
    vi.restoreAllMocks();
  });

  it('engineer_apprentice_found without engineer_parts_gathered → engineer_parts (takes priority)', () => {
    const result = pickOverworldEvent('OUTPOST', { engineer_apprentice_found: true }, 0, 0);
    expect(result).toBe('engineer_parts');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unknown / fallback terrain
// ─────────────────────────────────────────────────────────────────────────────

describe('unknown terrain', () => {
  it('does not throw for unknown terrain', () => {
    expect(() => pickOverworldEvent('VOLCANO', {}, 0, 0)).not.toThrow();
  });

  it('returns null or a string (generated event id) for unknown terrain', () => {
    const result = pickOverworldEvent('VOLCANO', {}, 0, 0);
    expect(result === null || typeof result === 'string').toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Sanity check: all 10 known terrains return non-null with empty flags
// ─────────────────────────────────────────────────────────────────────────────

describe('sanity: all known terrains return non-null with empty flags', () => {
  const KNOWN_TERRAINS = ['FOREST', 'MOUNTAINS', 'SWAMP', 'PLAINS', 'WATER', 'RUINS', 'ROAD', 'MERCHANT_CAMP', 'CITY', 'OUTPOST'];

  for (const terrain of KNOWN_TERRAINS) {
    it(`${terrain} always returns non-null over 10 calls`, () => {
      for (let i = 0; i < 10; i++) {
        const result = pickOverworldEvent(terrain, {}, 0, 0);
        expect(result).not.toBeNull();
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// WATER and RUINS arc flags
// ─────────────────────────────────────────────────────────────────────────────

describe('WATER terrain', () => {
  it('no water_strange_vessel_completed → water_strange_vessel', () => {
    const result = pickOverworldEvent('WATER', {}, 0, 0);
    expect(result).toBe('water_strange_vessel');
  });

  it('water_strange_vessel_completed + void_purification_done without void_origin_revealed → void_origin_revealed', () => {
    const result = pickOverworldEvent('WATER', { water_strange_vessel_completed: true, void_purification_done: true }, 0, 0);
    expect(result).toBe('void_origin_revealed');
  });

  it('water_strange_vessel_completed + no void arc → random pool', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.0);
    const pool = ['water_sea_creature', 'water_message_in_bottle', 'water_survivor_island', 'water_ghost_ship', 'water_fishing_village', 'water_water_spirit', 'water_storm_shelter', 'water_sunken_cache'];
    const result = pickOverworldEvent('WATER', { water_strange_vessel_completed: true }, 0, 0);
    expect(pool).toContain(result);
    vi.restoreAllMocks();
  });
});

describe('RUINS terrain', () => {
  it('no ruins_inscription_completed → ruins_inscription', () => {
    const result = pickOverworldEvent('RUINS', {}, 0, 0);
    expect(result).toBe('ruins_inscription');
  });

  it('ruins_inscription_completed + ruins_curse_active → ruins_nightmare', () => {
    const result = pickOverworldEvent('RUINS', { ruins_inscription_completed: true, ruins_curse_active: true }, 0, 0);
    expect(result).toBe('ruins_nightmare');
  });

  it('ruins_inscription_completed + ruins_inscription_copied, r<0.5 → ruins_echo', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    const result = pickOverworldEvent('RUINS', { ruins_inscription_completed: true, ruins_inscription_copied: true }, 0, 0);
    expect(result).toBe('ruins_echo');
    vi.restoreAllMocks();
  });

  it('ruins_inscription_completed + ruins_inscription_copied, r>=0.5 → ancient_ruins', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.7);
    const result = pickOverworldEvent('RUINS', { ruins_inscription_completed: true, ruins_inscription_copied: true }, 0, 0);
    expect(result).toBe('ancient_ruins');
    vi.restoreAllMocks();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PLAINS and MERCHANT_CAMP (pure random pool)
// ─────────────────────────────────────────────────────────────────────────────

describe('PLAINS terrain', () => {
  it('always returns a plains pool event', () => {
    const pool = ['plains_caravan', 'plains_battlefield', 'plains_patrol', 'plains_refugee_camp', 'plains_crashed_vehicle', 'plains_bounty_hunter', 'plains_signal_fire', 'plains_war_zone', 'plains_lost_child', 'plains_plague_rumor', 'plains_ghost_soldier', 'plains_merchant_dispute'];
    for (let i = 0; i < 10; i++) {
      const result = pickOverworldEvent('PLAINS', {}, 0, 0);
      expect(pool).toContain(result);
    }
  });
});

describe('MERCHANT_CAMP terrain', () => {
  it('always returns a merchant_camp pool event', () => {
    const pool = ['merchant_camp_visit', 'wandering_merchant', 'merchant_rare_auction', 'merchant_in_trouble', 'merchant_fake_goods', 'merchant_price_war', 'merchant_mysterious_catalog', 'merchant_stolen_fence'];
    for (let i = 0; i < 10; i++) {
      const result = pickOverworldEvent('MERCHANT_CAMP', {}, 0, 0);
      expect(pool).toContain(result);
    }
  });
});
