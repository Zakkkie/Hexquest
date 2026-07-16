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
    return false; 
};