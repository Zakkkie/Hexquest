
import { Hex, HexCoord, TerrainType } from '../types';
import { LevelConfig } from '../campaign/types';
import { getHexKey, getNeighbors } from './hexUtils';
import { GAME_CONFIG } from '../rules/config';

const CITY_Q = 10;
const CITY_R = -5;
const CITY_W = 10;
const CITY_H = 14;

const isInsideCity = (q: number, r: number) => {
    const dq = q - CITY_Q;
    const dr = r - CITY_R;
    return Math.abs(dq) <= CITY_W / 2 && Math.abs(dr) <= CITY_H / 2;
};

const isCityWall = (q: number, r: number) => {
    const dq = q - CITY_Q;
    const dr = r - CITY_R;
    const halfW = Math.floor(CITY_W / 2);
    const halfH = Math.floor(CITY_H / 2);
    
    const onEdge = Math.abs(dq) === halfW || Math.abs(dr) === halfH;
    const isGate = (dq === 0 && Math.abs(dr) === halfH) || (dr === 0 && Math.abs(dq) === halfW);
    
    return onEdge && !isGate;
};

const getCityPoi = (q: number, r: number) => {
    const dq = q - CITY_Q;
    const dr = r - CITY_R;
    
    if (dq === 0 && dr === 0) return 'city_hub';
    
    // NW: Travelers
    if (dq === -3 && dr === -4) return 'tavern_travelers';
    if (dq === -3 && dr === -2) return 'bulletin_board';
    if (dq === -1 && dr === -4) return 'guard_post';
    
    // NE: Craftsmen
    if (dq === 3 && dr === -4) return 'forge';
    if (dq === 3 && dr === -2) return 'alchemist';
    if (dq === 1 && dr === -4) return 'watchtower';
    
    // SW: Market
    if (dq === -3 && dr === 4) return 'market';
    if (dq === -3 && dr === 2) return 'warehouse';
    if (dq === -1 && dr === 4) return 'healer';
    
    // SE: Spirit
    if (dq === 3 && dr === 4) return 'temple';
    if (dq === 3 && dr === 2) return 'archive';
    if (dq === 1 && dr === 4) return 'tavern_spirit';
    
    return null;
};

const isCityStreet = (q: number, r: number) => {
    const dq = q - CITY_Q;
    const dr = r - CITY_R;
    return dq % 3 === 0 || dr % 3 === 0;
};

const getPseudoNoise = (q: number, r: number) => {
    const val = Math.sin(q * 12.9898 + r * 78.233) * 43758.5453;
    return Math.abs(val - Math.floor(val));
};

// Pure function to generate a specific hex based on config rules
export const generateSingleHex = (q: number, r: number, levelConfig?: LevelConfig, mapType?: 'FLAT' | 'CHAOTIC'): Hex => {
    const key = getHexKey(q, r);
    const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q-r));
    const noise = getPseudoNoise(q, r);

    let level = 0;
    let structureType: 'BARRIER' | 'VOID' | 'MONUMENT' | 'MINE' | undefined = undefined;
    let biome: TerrainType = 'PLAINS';
    let poiType: string | undefined = undefined;
    let isPassable = true;
    let forceReveal = false;

    // --- CITY LOGIC ---
    if (isInsideCity(q, r)) {
        biome = 'CITY';
        if (isCityWall(q, r)) {
            level = 4;
            structureType = 'BARRIER';
            isPassable = false;
        } else {
            const poi = getCityPoi(q, r);
            if (poi) {
                poiType = poi;
                level = 1;
            } else if (isCityStreet(q, r)) {
                biome = 'ROAD';
                level = 0;
            } else {
                // Building
                level = 2;
                isPassable = false;
            }
        }
    } else {
        // --- ZONE LOGIC ---
        if (dist <= 5) {
            biome = 'PLAINS';
            level = 0;
        } else if (dist <= 15) {
            // Zone 1: Rural Periphery
            biome = noise > 0.5 ? 'FOREST' : 'SWAMP';
            level = biome === 'FOREST' ? 1 : -1;
        } else if (dist <= 30) {
            // Zone 2: Wilderness
            if (noise > 0.7) {
                biome = 'MOUNTAINS';
                level = 3;
            } else if (noise > 0.4) {
                biome = 'FOREST'; // Deep Forest
                level = 2;
            } else if (noise > 0.2) {
                biome = 'PLAINS'; // Wasteland
                level = 0;
            } else {
                biome = 'WATER'; // Canyon
                level = -2;
            }
        } else {
            // Zone 3: Desolation
            if (noise > 0.8) {
                biome = 'RUINS';
                level = 1;
            } else if (noise > 0.4) {
                biome = 'PLAINS'; // Wasteland
                level = 0;
            } else {
                biome = 'WATER'; // Canyon
                level = -3;
            }
        }

        // Rifts
        if (dist >= 2 && dist <= 11 && noise < 0.03) {
            poiType = 'RIFT_S1_2';
            structureType = 'MINE';
        } else if (dist >= 12 && dist <= 25 && noise < 0.03) {
            poiType = 'RIFT_S3_4';
            structureType = 'MINE';
        }
    }

    // Default Defaults for Walls (Map Boundary)
    const wallStartRadius = levelConfig?.mapConfig.wallStartRadius ?? 40; 
    const wallStartLevel = levelConfig?.mapConfig.wallStartLevel ?? 9;
    const wallType = levelConfig?.mapConfig.wallType ?? 'classic';
    const shouldGenerateWalls = levelConfig?.mapConfig.generateWalls ?? true; 

    if (shouldGenerateWalls && dist >= wallStartRadius) {
        if (wallType === 'void_shatter') {
            if (dist === wallStartRadius) {
                structureType = 'VOID';
                level = 0;
            } else {
                level = 0;
                structureType = undefined;
            }
        } else if (wallType === 'pit_ring') {
            level = -8;
            structureType = undefined;
            forceReveal = true;
        } else {
            level = Math.min(99, wallStartLevel + (dist - wallStartRadius));
            structureType = 'BARRIER';
            isPassable = false;
        }
    }

    // Default center always safe
    if (q === 0 && r === 0) {
        level = 0;
        biome = 'PLAINS';
        isPassable = true;
    }

    let durability: number | undefined = undefined;
    if (level === 1) {
        durability = GAME_CONFIG.L1_HEX_MAX_DURABILITY;
    }

    return {
        id: key,
        q,
        r,
        currentLevel: level,
        maxLevel: level,
        progress: 0,
        revealed: forceReveal,
        structureType,
        durability,
        biome,
        poiType,
        isPassable
    };
};

export const validateMonumentAccessibility = (
  monument: HexCoord,
  grid: Record<string, Hex>
): boolean => {
  const hexKey = getHexKey(monument.q, monument.r);
  const monumentHex = grid[hexKey];
  
  if (!monumentHex) return false;
  
  const monumentHeight = monumentHex.maxLevel;
  const neighbors = getNeighbors(monument.q, monument.r);
  
  let accessibleNeighbors = 0;
  for (const neighbor of neighbors) {
    const key = getHexKey(neighbor.q, neighbor.r);
    const hex = grid[key];
    
    if (hex && hex.structureType !== 'VOID' && hex.isPassable !== false && hex.maxLevel <= monumentHeight) {
      accessibleNeighbors++;
    }
  }
  
  return accessibleNeighbors >= 3; 
};

export const ensureMonumentAccessibility = (
  monument: HexCoord,
  grid: Record<string, Hex>
): Record<string, Hex> => {
  if (validateMonumentAccessibility(monument, grid)) {
    return grid;
  }
  
  const neighbors = getNeighbors(monument.q, monument.r);
  const updatedGrid = { ...grid };
  
  const neighborsToFix = neighbors.slice(0, 4);
  const monumentHex = grid[getHexKey(monument.q, monument.r)];
  const targetMaxLevel = monumentHex ? Math.max(0, monumentHex.maxLevel - 1) : 0;

  for (const neighbor of neighborsToFix) {
    const key = getHexKey(neighbor.q, neighbor.r);
    const hex = updatedGrid[key];
    
    if (hex && hex.structureType !== 'VOID') {
       if (hex.maxLevel > targetMaxLevel || hex.isPassable === false) {
           updatedGrid[key] = {
             ...hex,
             currentLevel: targetMaxLevel,
             maxLevel: targetMaxLevel,
             isPassable: true,
             durability: targetMaxLevel === 1 ? GAME_CONFIG.L1_HEX_MAX_DURABILITY : undefined
           };
       }
    }
  }
  
  return updatedGrid;
};

export const generateMap = (levelConfig?: LevelConfig, mapType: 'FLAT' | 'CHAOTIC' = 'FLAT'): Record<string, Hex> => {
  let initialGrid: Record<string, Hex> = {};
  
  const radius = levelConfig?.mapConfig.size ?? 45;

  for (let q = -radius; q <= radius; q++) {
      const r1 = Math.max(-radius, -q - radius);
      const r2 = Math.min(radius, -q + radius);
      for (let r = r1; r <= r2; r++) {
          const hex = generateSingleHex(q, r, levelConfig, mapType);
          initialGrid[hex.id] = hex;
      }
  }

  if (levelConfig && levelConfig.mapConfig.customLayout) {
      levelConfig.mapConfig.customLayout.forEach(hexDef => {
          if (hexDef.q === undefined || hexDef.r === undefined) return;
          const key = getHexKey(hexDef.q, hexDef.r);
          const existing = initialGrid[key] || { 
              id: key, q: hexDef.q, r: hexDef.r, 
              currentLevel: 0, maxLevel: 0, progress: 0, revealed: true 
          };

          initialGrid[key] = {
              ...existing,
              ...hexDef,
              currentLevel: hexDef.currentLevel ?? existing.currentLevel,
              maxLevel: hexDef.maxLevel ?? existing.maxLevel,
              revealed: true
          };
      });
  }

  const monuments = Object.values(initialGrid).filter(h => h.structureType === 'MONUMENT');
  for (const m of monuments) {
      initialGrid = ensureMonumentAccessibility({ q: m.q, r: m.r }, initialGrid);
  }

  return initialGrid;
};
