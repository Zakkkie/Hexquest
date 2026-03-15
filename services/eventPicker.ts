import { getGeneratedEvent } from './EventComposer.ts';
import { TerrainType } from '../types.ts';

/** Pick the most story-appropriate event for a given terrain type based on player flags. */
export function pickOverworldEvent(
    terrain: string,
    flags: Record<string, boolean>,
    reputation: number = 0,
    stepCount: number = 0,
): string | null {
    const r = Math.random();
    switch (terrain) {
        case 'FOREST':
            if (flags['forest_elder_quest_done'] && !flags['forest_elder_grateful'])
                return 'forest_elder_reward';
            if (flags['forest_elder_quest'] && !flags['forest_elder_quest_done'])
                return 'forest_bandit_camp';
            if (flags['forest_met_elder'] && !flags['forest_elder_revisit_completed'])
                return 'forest_elder_revisit';
            { const enc = ['forest_elder_encounter', 'forest_ambush', 'forest_spirit_grove', 'forest_trapped_animal', 'forest_witch_hut', 'forest_mushroom_circle', 'forest_smuggler_path'];
              return enc[Math.floor(r * enc.length)]; }
        case 'MOUNTAINS':
            if (flags['mountain_monastery_welcomed'] && !flags['mountain_monastery_looted'])
                return r < 0.5 ? 'mountain_monastery' : 'mountain_hermit';
            if (!flags['mountain_monastery_found'])
                return r < 0.3 ? 'mountain_monastery' : r < 0.6 ? 'mountain_hermit' : 'mountain_avalanche';
            { const enc = ['mountain_hermit', 'mountain_avalanche', 'mountains_rope_bridge', 'mountains_cave_system', 'mountains_rockfall', 'mountains_monster_lair', 'mountains_pilgrim_stranger'];
              return enc[Math.floor(r * enc.length)]; }
        case 'SWAMP':
            // Arc 7 — Void Hunters (SWAMP terrain)
            if (flags['void_hunters_quest'] && !flags['void_sample_collected'] && !flags['void_hunters_met'])
                return 'void_hunter_camp';
            if (flags['void_hunters_quest'] && !flags['void_sample_collected'])
                return 'void_sample_found';
            if (flags['void_sample_collected'] && !flags['void_corruption_handled'])
                return 'void_corruption_spreads';
            if (flags['void_corruption_handled'] && !flags['void_purification_done'])
                return 'void_purification';
            if (!flags['swamp_ambush_completed'])
                return r < 0.3 ? 'swamp_ambush' : r < 0.6 ? 'swamp_ruins' : 'swamp_fisherman';
            { const enc = ['swamp_fisherman', 'swamp_ruins', 'swamp_quicksand', 'swamp_will_o_wisp', 'swamp_drowned_village', 'swamp_old_ferry', 'swamp_witch_doctor'];
              return enc[Math.floor(r * enc.length)]; }
        case 'PLAINS':
            { const enc = ['plains_caravan', 'plains_battlefield', 'plains_patrol', 'plains_refugee_camp', 'plains_crashed_vehicle', 'plains_bounty_hunter', 'plains_signal_fire', 'plains_war_zone'];
              return enc[Math.floor(r * enc.length)]; }
        case 'WATER':
            if (!flags['water_strange_vessel_completed'])
                return 'water_strange_vessel';
            // Arc 7 — Void origin in WATER/RUINS
            if (flags['void_purification_done'] && !flags['void_origin_revealed'])
                return 'void_origin_revealed';
            { const enc = ['water_sea_creature', 'water_message_in_bottle', 'water_survivor_island', 'water_ghost_ship', 'water_fishing_village', 'water_water_spirit', 'water_storm_shelter'];
              return enc[Math.floor(r * enc.length)]; }
        case 'RUINS':
            if (!flags['ruins_inscription_completed']) return 'ruins_inscription';
            if (flags['ruins_curse_active']) return 'ruins_nightmare';
            if (flags['ruins_inscription_copied']) return r < 0.5 ? 'ruins_echo' : 'ancient_ruins';
            // Arc 7 — Void gate in RUINS
            if (flags['void_origin_revealed'] && !flags['void_hunters_ended'])
                return 'void_gate_opened';
            // Arc 8 — Engineer's workshop in RUINS
            if (!flags['engineer_blueprint_found'])
                return r < 0.25 ? 'engineer_workshop' : 'ancient_ruins';
            { const enc = ['ancient_ruins', 'hidden_cache', 'ruins_mechanical_sentinel', 'ruins_time_echo', 'ruins_hidden_library', 'ruins_energy_pillar', 'ruins_inscription_fragment'];
              return enc[Math.floor(r * enc.length)]; }
        case 'ROAD':
            if (!flags['wounded_courier_completed'])
                return r < 0.3 ? 'wounded_courier' : 'road_pilgrims';
            // Arc 9 — Syndicate war events
            if (stepCount >= 40 && !flags['syndicate_war_aware'])
                return 'voss_first_decree';
            { const enc = ['road_pilgrims', 'road_night_traveler', 'road_toll_booth', 'road_carriage_accident', 'road_soldier_patrol', 'road_traveling_monk', 'road_road_ghost', 'road_crossroads_choice'];
              return enc[Math.floor(r * enc.length)]; }
        case 'MERCHANT_CAMP':
            { const enc = ['merchant_camp_visit', 'wandering_merchant', 'merchant_rare_auction', 'merchant_in_trouble', 'merchant_fake_goods', 'merchant_price_war', 'merchant_mysterious_catalog'];
              return enc[Math.floor(r * enc.length)]; }
        case 'CITY':
            // Arc 8 — Engineer's apprentice in CITY
            if (flags['engineer_blueprint_found'] && !flags['engineer_apprentice_found'])
                return 'engineer_apprentice';
            // Arc 9 — Resistance leader in CITY
            if (flags['resistance_contact_known'] && !flags['syndicate_chose_resistance'] && !flags['syndicate_chose_voss'])
                return 'resistance_leader';
            { const enc = ['city_hub', 'city_market_riot', 'city_strange_auction', 'city_bar_fight', 'city_mysterious_client', 'city_festival_day', 'city_rumors_spread'];
              return enc[Math.floor(r * enc.length)]; }
        case 'OUTPOST':
            // Arc 8 — Engineer parts in OUTPOST
            if (flags['engineer_apprentice_found'] && !flags['engineer_parts_gathered'])
                return 'engineer_parts';
            // Spy hunt
            if (flags['syndicate_chose_resistance'] && !flags['syndicate_spy_hunt_completed'])
                return r < 0.4 ? 'syndicate_spy_hunt' : 'outpost_checkpoint';
            { const enc = ['outpost_checkpoint', 'outpost_corrupt_captain', 'outpost_double_agent', 'outpost_prisoner_rescue', 'outpost_deserter_plea', 'outpost_loyalty_test'];
              return enc[Math.floor(r * enc.length)]; }
        default: {
            // Procedural template fallback
            const generated = getGeneratedEvent(terrain as TerrainType, flags, reputation, stepCount);
            if (generated) return generated.id;
            return null;
        }
    }
}
