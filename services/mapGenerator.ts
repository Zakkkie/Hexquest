
import { Hex, HexCoord, TerrainType } from '../types';
import { LevelConfig } from '../types';
import { getHexKey, getNeighbors } from './hexUtils';
import { GAME_CONFIG } from '../rules/config';

const CITY_Q = 0;
const CITY_R = 0;
const CITY_RADIUS = 6;

const isInsideCity = (q: number, r: number) => {
    const dq = q - CITY_Q;
    const dr = r - CITY_R;
    return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq-dr)) <= CITY_RADIUS;
};

const isCityWall = (q: number, r: number) => {
    const dq = q - CITY_Q;
    const dr = r - CITY_R;
    const dist = Math.max(Math.abs(dq), Math.abs(dr), Math.abs(-dq-dr));
    
    if (dist !== CITY_RADIUS) return false;
    
    // 2 exits: at (CITY_RADIUS, 0) and (-CITY_RADIUS, 0)
    const isExit = (dq === CITY_RADIUS && dr === 0) || (dq === -CITY_RADIUS && dr === 0);
    
    return !isExit;
};

const getCityPoi = (_q: number, _r: number) => {
    return null;
};

const isCityStreet = (q: number, r: number) => {
    const dq = q - CITY_Q;
    const dr = r - CITY_R;
    // Radial streets or something simple for hex city
    return dq === 0 || dr === 0 || (dq + dr) === 0;
};

const getPseudoNoise = (q: number, r: number) => {
    const val = Math.sin(q * 12.9898 + r * 78.233) * 43758.5453;
    return Math.abs(val - Math.floor(val));
};

// Pure function to generate a specific hex based on config rules
export const generateSingleHex = (q: number, r: number, levelConfig?: LevelConfig, mapType: 'FLAT' | 'CHAOTIC' = 'FLAT'): Hex => {
    const key = getHexKey(q, r);
    const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q-r));
    const noise = getPseudoNoise(q, r);

    let level = 0;
    let structureType: 'BARRIER' | 'VOID' | 'MONUMENT' | 'MINE' | undefined = undefined;
    let biome: TerrainType = 'PLAINS';
    let poiType: string | undefined = undefined;
    let isPassable = true;
    let forceReveal = !!levelConfig;

    // --- CITY LOGIC ---
    if (levelConfig && isInsideCity(q, r)) {
        biome = 'CITY';
        forceReveal = true;
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
    } else if (mapType === 'FLAT' && !levelConfig) {
        // SKIRMISH FLAT MODE: Level 0 everywhere
        level = 0;
        biome = 'PLAINS';
    } else if (mapType === 'CHAOTIC' && !levelConfig) {
        // SKIRMISH CHAOTIC MODE: Use noise but clamp initially (will be refined during movement discovery)
        biome = noise > 0.6 ? 'MOUNTAINS' : (noise > 0.3 ? 'FOREST' : 'PLAINS');
        level = Math.floor(noise * 7) - 3; // -3 to +3
    } else {
        // --- ZONE LOGIC (CAMPAIGN OR DEFAULT) ---
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

        // Rifts - Only in Campaign
        if (levelConfig) {
            if (dist >= 2 && dist <= 11 && noise < 0.03) {
                poiType = 'RIFT_S1_2';
                structureType = 'MINE';
            } else if (dist >= 12 && dist <= 25 && noise < 0.03) {
                poiType = 'RIFT_S3_4';
                structureType = 'MINE';
            }
        }
    }

    // Default Defaults for Walls (Map Boundary)
 

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
): void => {
  if (validateMonumentAccessibility(monument, grid)) {
    return;
  }
  
  const neighbors = getNeighbors(monument.q, monument.r);
  const neighborsToFix = neighbors.slice(0, 4);
  const monumentHex = grid[getHexKey(monument.q, monument.r)];
  const targetMaxLevel = monumentHex ? Math.max(0, monumentHex.maxLevel - 1) : 0;

  for (const neighbor of neighborsToFix) {
    const key = getHexKey(neighbor.q, neighbor.r);
    const hex = grid[key];
    
    if (hex && hex.structureType !== 'VOID') {
       if (hex.maxLevel > targetMaxLevel || hex.isPassable === false) {
           grid[key] = {
             ...hex,
             currentLevel: targetMaxLevel,
             maxLevel: targetMaxLevel,
             isPassable: true,
             durability: targetMaxLevel === 1 ? GAME_CONFIG.L1_HEX_MAX_DURABILITY : undefined
           };
       }
    }
  }
};

export const generateLevel12Map = (_levelConfig: LevelConfig): Record<string, Hex> => {
    const grid: Record<string, Hex> = {};
    const path: HexCoord[] = [
        { q: 0, r: 0 }, { q: 1, r: -1 }, { q: 2, r: -2 }, { q: 3, r: -3 },
        { q: 3, r: -2 }, { q: 3, r: -1 }, { q: 4, r: -1 }, { q: 5, r: -1 },
        { q: 5, r: 0 }, { q: 5, r: 1 }, { q: 4, r: 2 }, { q: 3, r: 3 },
        { q: 2, r: 3 }, { q: 1, r: 3 }, { q: 0, r: 3 }, { q: -1, r: 3 },
        { q: -2, r: 3 }, { q: -3, r: 3 }, { q: -3, r: 2 }, { q: -3, r: 1 },
        { q: -4, r: 1 }, { q: -5, r: 1 }, { q: -5, r: 0 }
    ];
    const pathKeys = new Set(path.map(p => getHexKey(p.q, p.r)));

    // Core hexes: path + 1-ring neighbors (unstable environment)
    const coreKeys = new Set<string>();
    for (const p of path) {
        coreKeys.add(getHexKey(p.q, p.r));
        for (const n of getNeighbors(p.q, p.r)) {
            coreKeys.add(getHexKey(n.q, n.r));
        }
    }

    for (const key of coreKeys) {
        const [q, r] = key.split(',').map(Number);
        const isPath = pathKeys.has(key);
        const isFinish = q === -5 && r === 0;
        grid[key] = {
            id: key, q, r,
            currentLevel: 1, maxLevel: 1, progress: 0, revealed: true,
            durability: isPath ? 3 : 1,
            biome: isFinish ? 'CITY' : (isPath ? 'ROAD' : 'PLAINS'),
            structureType: isFinish ? 'CAPITAL' : undefined,
            isPassable: true,
            ownerId: (q === 0 && r === 0) ? 'player-1' : undefined
        };
    }

    return grid;
};

export const generateMap = (levelConfig?: LevelConfig, mapType: 'FLAT' | 'CHAOTIC' = 'FLAT'): Record<string, Hex> => {
  let initialGrid: Record<string, Hex> = {};
  const baseRadius = levelConfig?.mapConfig.size ?? 50;
  const wallStartRadius = levelConfig?.mapConfig.wallStartRadius ?? baseRadius;

  // 1. Generate core area
  if (levelConfig?.id === '1.2') {
    initialGrid = generateLevel12Map(levelConfig);
  } else if (levelConfig?.mapConfig.type !== 'fixed') {
      for (let q = -wallStartRadius; q <= wallStartRadius; q++) {
          const r1 = Math.max(-wallStartRadius, -q - wallStartRadius);
          const r2 = Math.min(wallStartRadius, -q + wallStartRadius);
          for (let r = r1; r <= r2; r++) {
              const hex = generateSingleHex(q, r, levelConfig, mapType);
              initialGrid[hex.id] = hex;
          }
      }
  }

  // 2. Overlay custom layout
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

  // 3. Add the 3-ring border around EVERYTHING currently in the grid
  const initialKeys = Object.keys(initialGrid);
  const queue: { q: number, r: number, d: number }[] = [];
  const monuments: HexCoord[] = [];
  const visited = new Set<string>(initialKeys);

  // Only push perimeter hexes to the queue to speed up BFS
  for (const key of initialKeys) {
      const h = initialGrid[key];
      if (h.structureType === 'MONUMENT') {
          monuments.push({ q: h.q, r: h.r });
      }
      
      const neighbors = getNeighbors(h.q, h.r);
      let isPerimeter = false;
      for (const n of neighbors) {
          if (!visited.has(getHexKey(n.q, n.r))) {
              isPerimeter = true;
              break;
          }
      }
      if (isPerimeter) {
          queue.push({ q: h.q, r: h.r, d: 0 });
      }
  }

  // Use a more efficient BFS for border
  let head = 0;
  while (head < queue.length) {
      const { q, r, d } = queue[head++];
      if (d >= 3) continue;

      const neighbors = getNeighbors(q, r);
      for (const n of neighbors) {
          const nKey = getHexKey(n.q, n.r);
          if (!visited.has(nKey)) {
              visited.add(nKey);
              let level = -8;
              if (d + 1 === 1) level = -10;
              else if (d + 1 === 2) level = -9;

              initialGrid[nKey] = {
                  id: nKey, q: n.q, r: n.r,
                  currentLevel: level, maxLevel: level, progress: 0, revealed: !!levelConfig,
                  biome: 'WATER',
                  isPassable: true
              };
              queue.push({ ...n, d: d + 1 });
          }
      }
  }

  // Optimize monument accessibility check
  for (const m of monuments) {
      ensureMonumentAccessibility(m, initialGrid);
  }

  return initialGrid;
};
