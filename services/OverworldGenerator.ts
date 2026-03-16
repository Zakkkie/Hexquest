import { OverworldHex, TerrainType } from '../types.ts';
import { getHexKey, getNeighbors, findOverworldPath, cubeDistance } from './hexUtils.ts';

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

const REGION_SIZE = 25;

interface RegionInfo {
  q: number;
  r: number;
  type: TerrainType;
  seed: number;
  width: number;
  height: number;
}

function getRegionInfo(rq: number, rr: number, seed: number): RegionInfo {
  const rSeed = Math.abs(Math.sin(rq * 12.9898 + rr * 78.233 + seed) * 43758.5453);
  // Special regions only
  const types: TerrainType[] = ['CITY', 'SETTLEMENT', 'RUINS', 'MONUMENT_AREA', 'RIFT_ZONE'];
  const type = types[Math.floor((rSeed % 1) * types.length)];
  
  const offsetQ = Math.floor(((rSeed * 10) % 1) * (REGION_SIZE - 10)) - (REGION_SIZE / 2 - 5);
  const offsetR = Math.floor(((rSeed * 100) % 1) * (REGION_SIZE - 10)) - (REGION_SIZE / 2 - 5);

  return {
    q: rq * REGION_SIZE + offsetQ,
    r: rr * REGION_SIZE + offsetR,
    type,
    seed: rSeed,
    width: 6 + Math.floor(((rSeed * 1000) % 1) * 6), // 6 to 12
    height: 8 + Math.floor(((rSeed * 10000) % 1) * 6), // 8 to 14
  };
}

const getBiomeType = (q: number, r: number, seed: number): TerrainType => {
  const hNoise = new SimplexNoise(seed + 5);
  const mNoise = new SimplexNoise(seed + 10);
  const scale = 0.04; 
  const nx = scale * q;
  const ny = scale * r;
  
  const noiseVal = (hNoise.noise2D(nx, ny) + 1) / 2;
  const moistureVal = (mNoise.noise2D(nx + 50, ny + 50) + 1) / 2;

  if (noiseVal > 0.8) return 'MOUNTAINS';
  if (noiseVal < 0.15) return 'WATER';
  if (moistureVal > 0.75) return 'FOREST';
  if (moistureVal < 0.25) return 'WASTELAND';
  if (noiseVal < 0.3 && moistureVal > 0.65) return 'SWAMP';
  if (noiseVal > 0.65 && moistureVal < 0.35) return 'CANYON';
  if (noiseVal > 0.5 && noiseVal < 0.6 && moistureVal > 0.5 && moistureVal < 0.6) return 'RIFT_ZONE';
  return 'PLAINS';
};

export const getHexHeight = (type: TerrainType, q: number = 0, r: number = 0, seed: number = 0) => {
  switch (type) {
    case 'MOUNTAINS': return 3;
    case 'FOREST': return 1;
    case 'SWAMP': return -1;
    case 'WATER': return -2;
    case 'CITY': return 2;
    case 'SETTLEMENT': return 1;
    case 'RUINS': return 1;
    case 'OUTPOST': return 1;
    case 'PLAINS': return 0;
    case 'ROAD': return 0;
    case 'MERCHANT_CAMP': return 1;
    case 'WASTELAND': return 0;
    case 'CANYON': return -3;
    case 'RIFT_ZONE': return -2;
    case 'WALL': return 4;
    case 'BUILDING': return 3;
    default: return 0;
  }
};

export function generateHexData(q: number, r: number, seed: number): OverworldHex {
  // 1. Base Biome
  let terrainType = getBiomeType(q, r, seed);
  let moveCost = 1;
  let isIndestructible = false;
  let interiorId: string | undefined = undefined;

  // 2. Check for special regions (City, Settlement, etc.)
  const rq = Math.round(q / REGION_SIZE);
  const rr = Math.round(r / REGION_SIZE);
  
  let closestRegion: RegionInfo | null = null;
  let minDist = Infinity;

  for (let dq = -1; dq <= 1; dq++) {
    for (let dr = -1; dr <= 1; dr++) {
      const region = getRegionInfo(rq + dq, rr + dr, seed);
      const dist = cubeDistance({ q, r }, { q: region.q, r: region.r });
      if (dist < minDist) {
        minDist = dist;
        closestRegion = region;
      }
    }
  }

  const region = closestRegion!;
  const isCityArea = region.type === 'CITY' || region.type === 'SETTLEMENT';
  
  if (isCityArea) {
    const dq = q - region.q;
    const dr = r - region.r;
    
    // Use an elliptical boundary for a more organic feel
    const distSq = (dq * dq) / (region.width * region.width) + (dr * dr) / (region.height * region.height);
    
    const wallThickness = 0.05;
    const isInside = distSq < 0.25;
    const isOnBoundary = distSq >= 0.25 && distSq < 0.25 + wallThickness;

    if (isOnBoundary) {
      terrainType = 'WALL';
      moveCost = 999;
      isIndestructible = true;
    } else if (isInside) {
      const buildingSeed = Math.abs(Math.sin(q * 1.1 + r * 2.2 + region.seed) * 100) % 1;
      if (buildingSeed > 0.85) {
        terrainType = 'BUILDING';
        interiorId = `interior_${region.type.toLowerCase()}_${region.q}_${region.r}_${q}_${r}`;
      } else {
        terrainType = region.type;
      }
    }
  } else if (region.type === 'RUINS' || region.type === 'MONUMENT_AREA') {
    const dist = cubeDistance({ q, r }, { q: region.q, r: region.r });
    if (dist < 4) {
      terrainType = region.type === 'RUINS' ? 'RUINS' : 'MOUNTAINS';
      if (dist === 0 && region.type === 'MONUMENT_AREA') {
        // Center of monument area
      }
    }
  }

  // 3. Height logic
  let height = getHexHeight(terrainType, q, r, seed);
  
  const isInsideCity = isCityArea && ( (q - region.q)**2 / (region.width**2) + (r - region.r)**2 / (region.height**2) < 0.25 );

  if (!isInsideCity && terrainType !== 'WALL' && terrainType !== 'WATER') {
    // Exterior has varied heights
    const hNoise = new SimplexNoise(seed + 20);
    const varNoise = hNoise.noise2D(q * 0.2, r * 0.2);
    if (varNoise > 0.5) height += 1;
    else if (varNoise < -0.5) height -= 1;
    
    // Add micro-variation
    const microNoise = Math.abs(Math.sin(q * 12.3 + r * 45.6 + seed) * 10) % 1;
    if (microNoise > 0.8) height += 1;
    else if (microNoise < 0.2) height -= 1;
  }

  // 4. Move cost adjustments
  if (terrainType === 'MOUNTAINS') moveCost = 5;
  if (terrainType === 'WATER') moveCost = 999;
  if (terrainType === 'SWAMP') moveCost = 3;
  if (terrainType === 'FOREST') moveCost = 2;
  if (terrainType === 'CANYON') moveCost = 2;
  if (terrainType === 'RIFT_ZONE') moveCost = 4;
  if (terrainType === 'WALL') moveCost = 999;

  return {
    q,
    r,
    terrainType,
    moveCost,
    isRevealed: false,
    height,
    isIndestructible,
    interiorId
  };
}

export function getSpecialFeature(q: number, r: number, seed: number, radius: number): { poiId?: string, riftId?: string, terrainType?: TerrainType } {
  const dist = cubeDistance({ q: 0, r: 0 }, { q, r });
  if (dist === 0) return { terrainType: 'CITY' };
  if (dist > radius) return {};

  const hSeed = Math.abs(Math.sin(q * 12.9898 + r * 78.233 + seed) * 43758.5453) % 1;
  
  const series1 = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6'];
  const series2 = ['2.1', '2.2', '2.3', '2.4', '2.5'];
  const series3 = ['3.1', '3.2', '3.3', '3.4', '3.5', '3.6', '3.7', '3.8'];
  const series4 = ['4.1', '4.2', '4.3', '4.4', '4.5', '4.6', '4.7', '4.8'];

  const checkRift = (ids: string[], minDist: number, maxDist: number, prob: number) => {
    if (dist >= minDist && dist <= maxDist) {
      if (hSeed < prob) {
        const idIdx = Math.floor(Math.abs(Math.sin(q * 432.1 + r * 123.4 + seed) * 1000) % ids.length);
        return ids[idIdx];
      }
    }
    return null;
  };

  let riftId = checkRift(series1, 2, 6, 0.03) || 
               checkRift(series2, 7, 11, 0.025) || 
               checkRift(series3, 12, 16, 0.02) || 
               checkRift(series4, 17, radius, 0.015);

  if (riftId) {
    return { riftId, terrainType: 'RIFT_ZONE' };
  }

  if (hSeed > 0.98) {
      if (hSeed > 0.995) return { poiId: 'ancient_ruins', terrainType: 'RUINS' };
      if (hSeed > 0.99) return { poiId: 'outpost_checkpoint', terrainType: 'OUTPOST' };
      if (hSeed > 0.985) return { poiId: 'wandering_merchant', terrainType: 'MERCHANT_CAMP' };
  }

  return {};
}

export function generateOverworld(radius: number = 20, seed: number = Math.random()): Record<string, OverworldHex> {
  const grid: Record<string, OverworldHex> = {};
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const key = getHexKey(q, r);
      const hex = generateHexData(q, r, seed);
      const special = getSpecialFeature(q, r, seed, radius);
      
      grid[key] = {
        ...hex,
        ...special,
        isRevealed: cubeDistance({ q: 0, r: 0 }, { q, r }) <= 3,
        height: special.terrainType ? getHexHeight(special.terrainType, q, r, seed) : hex.height
      };
    }
  }

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

