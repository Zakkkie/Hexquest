// Star foundation coordinate: Level 0 hex must be installed only at core location (0,0) and its surrounding star points to form the foundation
export const STAR_FOUNDATION_COORDS: [number, number][] = [
  [0, 0],   // Core Matrix location
  [1, 0],   // Ring 1 neighbors
  [1, -1],
  [0, -1],
  [-1, 0],
  [-1, 1],
  [0, 1],
  [0, 2],   // Ring 2 star tips
  [2, 0],
  [2, -2],
  [0, -2],
  [-2, 0],
  [-2, 2]
];

export const STAR_FOUNDATION_KEYS: string[] = STAR_FOUNDATION_COORDS.map(([q, r]) => `${q},${r}`);

