import { TerrainType } from '../types.ts';

export const CITY_NAME = 'HexHaven';

export interface CityHexData {
    terrainType: TerrainType;
    poiId?: string;
    isPoiCenter?: boolean;
    moveCost: number;
    isPassable: boolean;
    height: number;
    isIndestructible: boolean;
}

export const CITY_LAYOUT: Record<string, { poiId: string, height: number }> = {
    '1,1': { poiId: 'city_capitol', height: 3 },
    '1,-2': { poiId: 'city_bank', height: 2 },
    '-1,2': { poiId: 'city_shop', height: 2 },
    '-1,-1': { poiId: 'city_workshop', height: 2 },
    '2,-1': { poiId: 'city_bar', height: 2 },
    '-2,1': { poiId: 'city_hub', height: 2 },
};

export function getCityFeature(q: number, r: number): Partial<CityHexData> | null {
    const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
    
    if (dist > 3) return { moveCost: 999, isPassable: false };

    // Walls at Radius 3
    if (dist === 3) {
        // Exits at specific points (only 2 checkpoints now)
        if ((q === 3 && r === 0) || (q === -3 && r === 0)) {
            return { 
                terrainType: 'ROAD', 
                poiId: 'city_checkpoint', 
                moveCost: 1, 
                height: 1, 
                isIndestructible: true 
            };
        }
        return { 
            terrainType: 'WALL', 
            moveCost: 999, 
            isPassable: false, 
            height: 6, 
            isIndestructible: true 
        };
    }

    // City Interior (Radius 0-2)
    const key = `${q},${r}`;
    const layoutHex = CITY_LAYOUT[key];
    if (layoutHex) {
        return { 
            terrainType: 'BUILDING', 
            poiId: layoutHex.poiId, 
            isPoiCenter: true, 
            moveCost: 999, 
            isPassable: false, 
            height: layoutHex.height, 
            isIndestructible: true 
        };
    }

    // Default ground inside city
    return {
        terrainType: 'PLAINS',
        moveCost: 1,
        isPassable: true,
        height: 0,
        isIndestructible: true
    };
}

// ─── Campaign Layout Generation ───────────────────────────────────────────────

function hexRange(radius: number): { q: number; r: number }[] {
    const results: { q: number; r: number }[] = [];
    for (let q = -radius; q <= radius; q++) {
        for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
            results.push({ q, r });
        }
    }
    return results;
}

export function generateCityLevelLayout(): Partial<import('../types').Hex>[] {
    return hexRange(3).map(({ q, r }) => {
        const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r));
        // Exits at east/west gates
        if (dist === 3 && ((q === 3 && r === 0) || (q === -3 && r === 0))) {
            return { q, r, structureType: 'NONE', currentLevel: 0, maxLevel: 0, revealed: true };
        }
        // Outer walls
        if (dist === 3) {
            return { q, r, structureType: 'BARRIER', currentLevel: 3, maxLevel: 3, revealed: true };
        }
        // Building POIs (impassable structures)
        const layoutHex = CITY_LAYOUT[`${q},${r}`];
        if (layoutHex) {
            return { q, r, structureType: 'BARRIER', currentLevel: layoutHex.height, maxLevel: layoutHex.height, revealed: true };
        }
        // Ground
        return { q, r, structureType: 'NONE', currentLevel: 0, maxLevel: 0, revealed: true };
    });
}

/** Patrol routes for NPC bots in city streets */
export const CITY_NPC_ROUTES: import('../types').HexCoord[][] = [
    // Inner ring patrol
    [{ q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }],
    // Outer ring patrol
    [{ q: 2, r: 0 }, { q: 2, r: -1 }, { q: 1, r: -2 }, { q: 0, r: -2 }, { q: -1, r: -1 }, { q: -2, r: 0 }, { q: -2, r: 1 }, { q: -1, r: 2 }, { q: 0, r: 2 }, { q: 1, r: 1 }],
];
