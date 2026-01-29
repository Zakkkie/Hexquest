
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
 * 2. If hex.maxLevel >= 2, cost equals maxLevel.
 * 3. Use entity.moves first.
 * 4. If insufficient moves, cover deficit with coins (Exchange Rate).
 */
export const calculateMovementCost = (
    entity: { moves: number; coins: number },
    path: HexCoord[],
    grid: Record<string, Hex>
): MovementCostResult => {
    let totalPoints = 0;

    for (const step of path) {
        const hex = grid[getHexKey(step.q, step.r)];
        // Terrain Cost Logic
        const stepCost = (hex && hex.maxLevel >= 2) ? hex.maxLevel : 1;
        totalPoints += stepCost;
    }

    const movesAvailable = entity.moves;
    const coinsAvailable = entity.coins;

    // Deficit Calculation
    const movesDeficit = Math.max(0, totalPoints - movesAvailable);
    
    // Cost Breakdown
    const deductMoves = totalPoints - movesDeficit;
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
