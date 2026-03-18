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
    
    if (dist > 4) return { moveCost: 999, isPassable: false };

    // Walls at Radius 3 and 4
    if (dist === 3 || dist === 4) {
        // Exits at specific points (only 2 checkpoints now)
        if ((q === 3 && r === 0) || (q === -3 && r === 0) || (q === 4 && r === 0) || (q === -4 && r === 0)) {
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
