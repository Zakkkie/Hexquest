
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
 * Centralized logic for calculating movement costs.
 * Rules:
 * 1. Base cost per hex is 1.
 * 2. If hex.maxLevel > 1 (High Ground), cost equals maxLevel.
 * 3. If hex.maxLevel < 0 (Pits), cost remains 1 (Cheap traversal but high Entropy risk).
 * 4. Use entity.moves first.
 * 5. If insufficient moves, cover deficit with coins (Exchange Rate).
 * 6. STATUS_FATIGUE doubles the movement cost.
 */
export const calculateMovementCost = (
    entity: Entity, // Changed from partial type to Entity to access activeStatuses
    path: HexCoord[],
    grid: Record<string, Hex>
): MovementCostResult => {
    let totalPoints = 0;

    // Check for Fatigue (Status Effect)
    // We check if the status exists and hasn't expired
    const now = Date.now();
    const hasFatigue = entity.activeStatuses?.some(s => s.type === 'STATUS_FATIGUE' && (!s.expiresAt || s.expiresAt > now));
    const costMultiplier = hasFatigue ? 2 : 1;

    for (const step of path) {
        const hex = grid[getHexKey(step.q, step.r)];
        
        // Terrain Cost Logic
        // Positive High Ground (>1): Costs height.
        // Flat (0, 1) or Negative (<0): Costs 1.
        const level = hex ? hex.maxLevel : 0;
        const stepCost = level > 1 ? level : 1;
        
        totalPoints += stepCost;
    }

    // Apply Multiplier
    totalPoints *= costMultiplier;

    const movesAvailable = Math.max(0, entity.moves);
    const coinsAvailable = Math.max(0, entity.coins);

    // Deficit Calculation
    const movesDeficit = Math.max(0, totalPoints - movesAvailable);
    
    // Cost Breakdown
    const deductMoves = totalPoints - movesDeficit;
    
    // Safety check for NaN
    if (isNaN(movesDeficit)) {
        return { totalPoints: 0, deductMoves: 0, deductCoins: 0, canAfford: false, reason: "Calculation Error" };
    }

    // Exchange Rate: 5 coins per 1 move
    // Math.ceil ensures we charge integer amounts even if floating point creep occurs
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
