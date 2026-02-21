import { Hex, HexCoord } from '../types';

export const createVoidWals = (grid: Record<string, Hex>): Hex[] => {
    const walls: Hex[] = [];
    for (const hex of Object.values(grid)) {
        if (hex.structureType === 'VOID') {
            // walls.push(hex);
        }
    }
    return walls;
};
