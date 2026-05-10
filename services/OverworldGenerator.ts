import { OverworldHex, TerrainType, HexCoord } from '../types.ts';
import { getHexKey, cubeDistance } from './hexUtils.ts';
import { getCityFeature } from './CityGenerator.ts';

// Simple 2D Perlin/Simplex noise implementation
class SimplexNoise {
  private grad3 = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1]
  ];
  private p = new Uint8Array(256);
  private perm = new Uint8Array(512);

  constructor(seed: number) {
    // Deterministic random based on seed
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 256; i++) {
      this.p[i] = Math.floor(random() * 256);
    }
    for (let i = 0; i < 512; i++) {
      this.perm[i] = this.p[i & 255];
    }
  }

  private dot(g: number[], x: number, y: number) {
    return g[0] * x + g[1] * y;
  }

  noise2D(xin: number, yin: number) {
    let n0, n1, n2;
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const s = (xin + yin) * F2;
    const i = Math.floor(xin + s);
    const j = Math.floor(yin + s);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
    const t = (i + j) * G2;
    const X0 = i - t;
    const Y0 = j - t;
    const x0 = xin - X0;
    const y0 = yin - Y0;

    let i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    const x1 = x0 - i1 + G2;
    const y1 = y0 - j1 + G2;
    const x2 = x0 - 1.0 + 2.0 * G2;
    const y2 = y0 - 1.0 + 2.0 * G2;

    const ii = i & 255;
    const jj = j & 255;
    const gi0 = this.perm[ii + this.perm[jj]] % 12;
    const gi1 = this.perm[ii + i1 + this.perm[jj + j1]] % 12;
    const gi2 = this.perm[ii + 1 + this.perm[jj + 1]] % 12;

    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 < 0) n0 = 0.0;
    else {
      t0 *= t0;
      n0 = t0 * t0 * this.dot(this.grad3[gi0], x0, y0);
    }

    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 < 0) n1 = 0.0;
    else {
      t1 *= t1;
      n1 = t1 * t1 * this.dot(this.grad3[gi1], x1, y1);
    }

    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 < 0) n2 = 0.0;
    else {
      t2 *= t2;
      n2 = t2 * t2 * this.dot(this.grad3[gi2], x2, y2);
    }

    return 70.0 * (n0 + n1 + n2);
  }
}

export const getHexHeight = (type: TerrainType) => {
  switch (type) {
    case 'MOUNTAINS': return 3;
    case 'FOREST': return 1;
    case 'SWAMP': return -1;
    case 'WATER': return -2;
    case 'CITY': return 1;
    case 'RUINS': return 1;
    case 'OUTPOST': return 1;
    case 'PLAINS': return 0;
    case 'ROAD': return 0;
    case 'MERCHANT_CAMP': return 1;
    case 'WALL': return 6;
    case 'BUILDING': return 1;
    case 'SETTLEMENT': return 1;
    case 'MONUMENT_AREA': return 3;
    case 'RIFT_ZONE': return -1;
    case 'WASTELAND': return 0;
    case 'CANYON': return -3;
    default: return 0;
  }
};

export function generateHexData(q: number, r: number, seed: number): OverworldHex {
  const heightNoise = new SimplexNoise(seed);
  const moistureNoise = new SimplexNoise(seed + 123.456);
  const scale = 0.08;

  // Axial to Cartesian for noise
  const x = scale * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const y = scale * (3 / 2 * r);

  // Normalize noise to 0-1
  const height = (heightNoise.noise2D(x, y) + 1) / 2;
  const moisture = (moistureNoise.noise2D(x + 100, y + 100) + 1) / 2;

  let terrainType: TerrainType = 'PLAINS';
  let moveCost = 1;

  const distToCenter = cubeDistance({ q: 0, r: 0 }, { q, r });
  if (height < 0.3 && distToCenter > 3) {
    terrainType = 'WATER';
    moveCost = 999;
  } else if (height > 0.7) {
    terrainType = 'MOUNTAINS';
    moveCost = 5;
  } else if (moisture > 0.6) {
    if (height < 0.45) {
      terrainType = 'SWAMP';
      moveCost = 3;
    } else {
      terrainType = 'FOREST';
      moveCost = 2;
    }
  }

  // Deterministic "random" for roads
  const roadSeed = Math.abs(Math.sin(q * 12.9898 + r * 78.233 + seed) * 43758.5453);
  // Increase road density, especially near the center
  const roadProb = distToCenter < 10 ? 0.4 : 0.25;
  if (terrainType === 'PLAINS' && (roadSeed % 1) < roadProb) {
    terrainType = 'ROAD';
    moveCost = 1;
  }

  return {
    q,
    r,
    terrainType,
    moveCost,
    isPassable: moveCost < 999,
    isRevealed: true,
    isIndestructible: false,
    height: getHexHeight(terrainType)
  };
}

// Pre-calculate POI and Rift positions based on seed
export function getSpecialFeature(q: number, r: number, seed: number, _radius: number, isWorldMap: boolean = true): { poiId?: string, isPoiCenter?: boolean, riftId?: string, terrainType?: TerrainType, moveCost?: number, isPassable?: boolean, height?: number, isIndestructible?: boolean } {
  const dist = cubeDistance({ q: 0, r: 0 }, { q, r });
  
  if (!isWorldMap) {
      // --- CITY VIEW MODE (Radius 3) ---
      const cityFeature = getCityFeature(q, r);
      if (cityFeature) return cityFeature;
      
      // Default ground inside city (fallback)
      return { terrainType: 'PLAINS', moveCost: 1, isPassable: true, height: 0, isIndestructible: true };
  }

  // --- WORLD MAP MODE ---
  if (dist === 0) {
      return { terrainType: 'CITY', poiId: 'city_hub', isPoiCenter: true, moveCost: 1, height: 1, isIndestructible: true };
  }

  // Deterministic random for this hex
  const hSeed = Math.abs(Math.sin(q * 12.9898 + r * 78.233 + seed) * 43758.5453) % 1;

  // Rifts placement logic (simplified for lazy generation)
  // In a real scenario, we'd want to ensure exactly one of each rift exists.
  // For lazy generation, we can use a grid-based approach or a hash-to-range approach.
  // Let's use a simple probability that scales with distance.
  
  const series2 = ['7', '8', '9', '10', '11'];
  const series3 = ['12', '13', '14', '15', '16', '17', '18', '19'];
  const series4 = ['20', '21', '22', '23', '24', '25', '26'];

  const checkRift = (ids: string[], minDist: number, maxDist: number, prob: number) => {
    if (dist >= minDist && dist <= maxDist) {
      if (hSeed < prob) {
        // Use coordinates to pick a stable ID from the list
        const idIdx = Math.floor(Math.abs(Math.sin(q * 432.1 + r * 123.4 + seed) * 1000) % ids.length);
        return ids[idIdx];
      }
    }
    return null;
  };

  let riftId = null;
  let terrainType: TerrainType | undefined = undefined;

  // Increased probability for rifts
  riftId = checkRift(series2, 7, 11, 0.025) || 
           checkRift(series3, 12, 16, 0.02) || 
           checkRift(series4, 17, Infinity, 0.015);

  if (riftId) {
    // Rifts often corrupt the land into ruins or outposts
    const riftSeed = Math.abs(Math.sin(q * 11.11 + r * 22.22 + seed) * 1000) % 1;
    if (riftSeed > 0.6) {
      terrainType = 'RUINS';
    } else if (riftSeed > 0.3) {
      terrainType = 'OUTPOST';
    }
    return { riftId, terrainType };
  }

  // POIs - increased density and added more cities
  if (hSeed > 0.95) {
      if (hSeed > 0.99) return { poiId: 'ancient_ruins', terrainType: 'RUINS' };
      if (hSeed > 0.98) return { poiId: 'outpost_checkpoint', terrainType: 'OUTPOST' };
      if (hSeed > 0.97) return { poiId: 'wandering_merchant', terrainType: 'MERCHANT_CAMP' };
      if (hSeed > 0.96) return { poiId: 'city_hub', terrainType: 'CITY', isPoiCenter: true };
      return { poiId: 'hidden_cache', terrainType: 'MOUNTAINS' };
  }

  return {};
}

export function generateOverworld(radius: number = 30, seed: number = Math.random(), isWorldMap: boolean = true, genRadius?: number, center: HexCoord = { q: 0, r: 0 }): Record<string, OverworldHex> {
  const grid: Record<string, OverworldHex> = {};
  
  const actualGenRadius = genRadius !== undefined ? genRadius : (isWorldMap ? 6 : radius);

  for (let q = -actualGenRadius; q <= actualGenRadius; q++) {
    for (let r = Math.max(-actualGenRadius, -q - actualGenRadius); r <= Math.min(actualGenRadius, -q + actualGenRadius); r++) {
      const hq = q + center.q;
      const hr = r + center.r;
      const key = getHexKey(hq, hr);
      const distToOrigin = cubeDistance({ q: 0, r: 0 }, { q: hq, r: hr });
      
      if (!isWorldMap && distToOrigin > 3) {
          continue;
      }
      
      const hex = generateHexData(hq, hr, seed);
      const special = getSpecialFeature(hq, hr, seed, radius, isWorldMap);
      
      grid[key] = {
        ...hex,
        ...special,
        isPoiCenter: special.isPoiCenter,
        isRevealed: true, 
        isPassable: special.isPassable !== undefined ? special.isPassable : (special.terrainType ? (getHexHeight(special.terrainType) < 999) : hex.isPassable),
        height: special.height !== undefined ? special.height : (special.terrainType ? getHexHeight(special.terrainType) : hex.height),
        moveCost: special.moveCost !== undefined ? special.moveCost : hex.moveCost
      };
    }
  }

  // Dedup: ensure each riftId appears at most once in the initial grid
  const seenRiftIds = new Set<string>();
  for (const key of Object.keys(grid).sort()) {
    const hex = grid[key];
    if (hex.riftId) {
      if (seenRiftIds.has(hex.riftId)) {
        grid[key] = { ...hex, riftId: undefined };
      } else {
        seenRiftIds.add(hex.riftId);
      }
    }
  }

  return grid;
}

