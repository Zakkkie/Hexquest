
import { Hex, Entity, HexCoord, Difficulty } from '../types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { DIFFICULTY_SETTINGS } from '../rules/config';
import { WorldIndex } from '../engine/WorldIndex';

/**
 * Finds the immediate actionable hex required to support a long-term goal.
 * Uses Depth-First Search (DFS) to focus on completing local support structures
 * before moving to distant ones, preventing the bot from "jumping" around.
 */

const SEARCH_DEPTH_LIMIT = 200; 

export const findNextConstructionTarget = (
    goalHex: Hex,
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    difficulty: Difficulty
): Hex | null => {
    
    // Stack for DFS (LIFO)
    const stack: Hex[] = [goalHex];
    const visited = new Set<string>();
    visited.add(goalHex.id);
    
    let iterations = 0;
    const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 2;

    while (stack.length > 0 && iterations < SEARCH_DEPTH_LIMIT) {
        iterations++;
        const current = stack.pop()!; 
        
        // 1. Check if we can build this NOW
        const neighbors = getNeighbors(current.q, current.r);
        const occupied = index.getOccupiedHexesList();
        
        const check = checkGrowthCondition(current, bot, neighbors, grid, occupied, queueSize);

        if (check.canGrow) {
            // Valid if empty OR occupied by SELF.
            // (We cannot build if another bot is standing there)
            const occupant = index.getEntityAt(current.q, current.r);
            if (!occupant || occupant.id === bot.id) {
                return current; 
            }
            // If blocked by another bot, we skip this specific node 
            // but continue processing the stack to see if other branches are viable.
            continue; 
        }

        // 2. If blocked by missing supports, add them to the stack
        if (check.missingSupports && check.missingSupports.length > 0) {
            
            // SORTING IS CRITICAL FOR STABILITY:
            // We want to pop the CLOSEST support first.
            // Since Stack is LIFO, we push Furthest -> Closest.
            // So we sort Descending by Distance.
            
            const sortedSupports = [...check.missingSupports].sort((a, b) => {
                const distA = cubeDistance(bot, a);
                const distB = cubeDistance(bot, b);
                return distB - distA; // Descending
            });

            for (const coord of sortedSupports) {
                const key = getHexKey(coord.q, coord.r);
                if (visited.has(key)) continue;
                
                const supportHex = grid[key];
                
                // Only consider valid hexes
                if (supportHex && supportHex.structureType !== 'VOID') {
                    visited.add(key);
                    stack.push(supportHex);
                }
            }
        }
    }

    return null; // Could not find a solvable path
};

export const findNextExcavationTarget = (
    goalHex: Hex,
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex
): Hex | null => {
    
    // DFS for Digging (Reverse Pyramid)
    const stack: Hex[] = [goalHex];
    const visited = new Set<string>();
    visited.add(goalHex.id);
    let iterations = 0;

    while (stack.length > 0 && iterations < SEARCH_DEPTH_LIMIT) {
        iterations++;
        const current = stack.pop()!;

        const neighbors = getNeighbors(current.q, current.r);
        const check = checkDigCondition(current, bot, neighbors, grid);

        if (check.canGrow) {
            const occupant = index.getEntityAt(current.q, current.r);
            if (!occupant || occupant.id === bot.id) {
               return current;
            }
            continue;
        }

        if (check.missingSupports && check.missingSupports.length > 0) {
            // Sort Descending Distance (Process Closest First)
            const sortedSupports = [...check.missingSupports].sort((a, b) => {
                const distA = cubeDistance(bot, a);
                const distB = cubeDistance(bot, b);
                return distB - distA;
            });

            for (const coord of sortedSupports) {
                const key = getHexKey(coord.q, coord.r);
                if (visited.has(key)) continue;
                
                const supportHex = grid[key];
                if (supportHex && supportHex.structureType !== 'VOID') {
                    visited.add(key);
                    stack.push(supportHex);
                }
            }
        }
    }

    return null;
};
