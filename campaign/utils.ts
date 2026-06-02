import { GAME_CONFIG } from '../rules/config';
import { getStatusModifiers } from '../services/hexUtils';
import { SessionState, Hex } from "../types";

export const generateBasicLevelGrid = (): Partial<Hex>[] => {
    // A deterministic Level 1.0 grid structured purely for the 4-step tutorial progression.
    return [
        { q: 0, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, ownerId: 'player-1' }, // Start
        { q: 1, r: 0, currentLevel: 0, maxLevel: 0, revealed: true }, // Movement target
        { q: 2, r: 0, currentLevel: 2, maxLevel: 2, revealed: true }, // Requires Upgrading 1,0 to L1
        { q: 3, r: 0, currentLevel: 2, maxLevel: 2, revealed: true }, // Walkway
        { q: 4, r: 0, currentLevel: 0, maxLevel: 0, revealed: true }, // Requires Digging 3,0 down to L1
        { q: 5, r: 0, currentLevel: 0, maxLevel: 0, revealed: true, structureType: 'CAPITAL' } // Goal entity
    ];
};

export const isStranded = (state: SessionState) => {
    const player = state.player;
    const currentHex = state.grid[`${player.q},${player.r}`];
    
    // If player has resources, they are not stranded
    const { exchangeRate } = getStatusModifiers(player, state);
    if (player.moves > 0 || player.coins >= exchangeRate) return false;
    
    // If they are on a hex that can provide recovery (now or later), they are not stranded
    if (currentHex) {
        const isHighLevel = currentHex.maxLevel >= GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD;
        if (isHighLevel) {
            // On L4+, they can eventually recover even if on cooldown
            return false; 
        } else {
            // On L0-L3, if they haven't recovered yet, they can still do it
            if (!player.recoveredCurrentHex) return false;
        }
        
        // Check if player can DIG for moves (Digging costs 0 moves if already on hex)
        // If they are on a diggable hex (not VOID, not MONUMENT), they are not stranded
        if (currentHex.structureType !== 'VOID' && currentHex.structureType !== 'MONUMENT') {
            return false;
        }
    }
    
    return true; 
};