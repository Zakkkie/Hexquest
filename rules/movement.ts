
import { Hex, Entity, HexCoord } from '../types';
import { getHexKey, getStatusModifiers } from '../services/hexUtils';

interface MovementCostResult {
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
 * 2. If hex.currentLevel > 1 (High Ground), cost equals currentLevel.
 * 3. If hex.maxLevel < 0 (Pits), cost remains 1.
 * 4. STRICT: Cannot move if height difference > 1 (Staircase Rule).
 * 5. STRICT: Cannot move into Void.
 * 6. Use entity.moves first, then coins.
 * 7. Applies modifiers from STATUS_FATIGUE etc.
 */
export const calculateMovementCost = (
    entity: Entity, 
    path: HexCoord[],
    grid: Record<string, Hex>,
    session?: any
): MovementCostResult => {
    let totalPoints = 0;

    // Apply Status Effects via centralized helper (Handles FATIGUE multiplier)
    const { moveCostMultiplier, exchangeRate } = getStatusModifiers(entity, session);

    // Track position to validate step-by-step physics
    let currentQ = entity.q;
    let currentR = entity.r;

    const hasVoidCore = (entity.equipment && Object.values(entity.equipment).some(item => item && item.baseId === 'void_core')) ||
                        (entity.activeStatuses && entity.activeStatuses.some(s => (s.type as string) === 'VOID_CORE' || s.label === 'Void Core'));

    for (const step of path) {
        const currentKey = getHexKey(currentQ, currentR);
        const nextKey = getHexKey(step.q, step.r);
        
        const currentHex = grid[currentKey];
        const nextHex = grid[nextKey];
        
        // --- PHYSICS VALIDATION ---
        
        // 1. Void Check
        if (nextHex && nextHex.structureType === 'VOID') {
             return { totalPoints: 0, deductMoves: 0, deductCoins: 0, canAfford: false, reason: "VOID" };
        }

        // 1.5 Passable Check
        if (nextHex && nextHex.isPassable === false) {
             return { totalPoints: 0, deductMoves: 0, deductCoins: 0, canAfford: false, reason: "BLOCKED" };
        }

        const currentLevel = currentHex ? currentHex.currentLevel : 0;
        const nextLevel = nextHex ? nextHex.currentLevel : 0;

        // 2. Staircase Rule (Global Enforcement)
        // Cannot step up OR down more than 1 level at a time.
        if (!hasVoidCore && Math.abs(currentLevel - nextLevel) > 1) {
             return { 
                 totalPoints: 0, 
                 deductMoves: 0, 
                 deductCoins: 0, 
                 canAfford: false, 
                 reason: "STEEP" 
             };
        }

        // --- COST CALCULATION ---
        
        // Terrain Cost Logic
        // Positive High Ground (>1): Costs height.
        // Flat (0, 1) or Negative (<0): Costs 1.
        const stepCost = hasVoidCore ? 1 : ((nextHex?.currentLevel ?? 0) > 1 ? (nextHex?.currentLevel ?? 0) : 1);
        
        totalPoints += stepCost;
        
        // Update iterator position
        currentQ = step.q;
        currentR = step.r;
    }

    // Apply Multiplier (e.g. Fatigue x2)
    // The total points might be fractional due to multipliers,
    // and the rule implies we buy "Turns", which are discrete integers.
    // "5 Credits per 1 Turn (rounded up to the nearest integer)".
    totalPoints = Math.ceil(totalPoints * moveCostMultiplier);
    
    const movesAvailable = Math.max(0, entity.moves);
    const coinsAvailable = Math.max(0, entity.coins);

    // Deficit Calculation
    const movesDeficit = Math.max(0, totalPoints - movesAvailable);
    
    // Cost Breakdown
    const deductMoves = totalPoints - movesDeficit;
    
    // Exchange Rate
    const deductCoins = Math.ceil(movesDeficit * exchangeRate);
    console.log(`MOVEMENT DEBUG: totalPoints=${totalPoints}, movesAvailable=${movesAvailable}, movesDeficit=${movesDeficit}, deductCoins=${deductCoins}, coinsAvailable=${coinsAvailable}, exchangeRate=${exchangeRate}`);

    const canAfford = coinsAvailable >= deductCoins;

    return {
        totalPoints,
        deductMoves,
        deductCoins,
        canAfford,
        reason: !canAfford ? "INSUFFICIENT_FUNDS" : undefined 
    };
};
