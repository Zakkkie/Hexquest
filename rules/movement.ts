
import { Hex, Entity, HexCoord } from '../types';
import { getHexKey } from '../services/hexUtils';
import { GAME_CONFIG } from './config';

export interface MovementCostResult {
    totalPoints: number; // Total "Move Points" required by terrain
    deductMoves: number; // Amount to be deducted from entity.moves
    deductCoins: number; // Amount to be deducted from entity.coins
    canAfford: boolean;
    reason?: string;
}

/**
 * Centralized logic for calculating movement costs AND validating physics.
 * Rules:
 * 1. Base cost per hex is 1.
 * 2. If hex.maxLevel > 1 (High Ground), cost equals maxLevel.
 * 3. If hex.maxLevel < 0 (Pits), cost remains 1.
 * 4. STRICT: Cannot move if height difference > 1 (Staircase Rule).
 * 5. STRICT: Cannot move into Void.
 * 6. Use entity.moves first, then coins.
 */
export const calculateMovementCost = (
    entity: Entity, 
    path: HexCoord[],
    grid: Record<string, Hex>
): MovementCostResult => {
    let totalPoints = 0;

    // Check for Fatigue (Status Effect)
    const now = Date.now();
    const hasFatigue = entity.activeStatuses?.some(s => s.type === 'STATUS_FATIGUE' && (!s.expiresAt || s.expiresAt > now));
    const costMultiplier = hasFatigue ? 2 : 1;

    // Track position to validate step-by-step physics
    let currentQ = entity.q;
    let currentR = entity.r;

    for (const step of path) {
        const currentKey = getHexKey(currentQ, currentR);
        const nextKey = getHexKey(step.q, step.r);
        
        const currentHex = grid[currentKey];
        const nextHex = grid[nextKey];
        
        // --- PHYSICS VALIDATION ---
        
        // 1. Void Check
        if (nextHex && nextHex.structureType === 'VOID') {
             return { totalPoints: 0, deductMoves: 0, deductCoins: 0, canAfford: false, reason: "Path Blocked: Void" };
        }

        const currentLevel = currentHex ? currentHex.maxLevel : 0;
        const nextLevel = nextHex ? nextHex.maxLevel : 0;

        // 2. Staircase Rule (Global Enforcement)
        // Cannot step up OR down more than 1 level at a time.
        if (Math.abs(currentLevel - nextLevel) > 1) {
             return { 
                 totalPoints: 0, 
                 deductMoves: 0, 
                 deductCoins: 0, 
                 canAfford: false, 
                 reason: `Too Steep! (L${currentLevel} -> L${nextLevel})` 
             };
        }

        // --- COST CALCULATION ---
        
        // Terrain Cost Logic
        // Positive High Ground (>1): Costs height.
        // Flat (0, 1) or Negative (<0): Costs 1.
        const stepCost = nextLevel > 1 ? nextLevel : 1;
        
        totalPoints += stepCost;
        
        // Update iterator position
        currentQ = step.q;
        currentR = step.r;
    }

    // Apply Multiplier
    totalPoints *= costMultiplier;

    const movesAvailable = Math.max(0, entity.moves);
    const coinsAvailable = Math.max(0, entity.coins);

    // Deficit Calculation
    const movesDeficit = Math.max(0, totalPoints - movesAvailable);
    
    // Cost Breakdown
    const deductMoves = totalPoints - movesDeficit;
    
    if (isNaN(movesDeficit)) {
        return { totalPoints: 0, deductMoves: 0, deductCoins: 0, canAfford: false, reason: "Calculation Error" };
    }

    // Exchange Rate: 5 coins per 1 move
    const deductCoins = Math.ceil(movesDeficit * GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE);

    const canAfford = coinsAvailable >= deductCoins;

    return {
        totalPoints,
        deductMoves,
        deductCoins,
        canAfford,
        reason: canAfford ? undefined : `Insufficient credits. Need ${deductCoins}, have ${coinsAvailable}.`
    };
};
