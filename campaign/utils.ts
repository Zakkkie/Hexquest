import { GAME_CONFIG } from '../rules/config';
import { getStatusModifiers } from '../services/hexUtils';
import { SessionState } from "../types";

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