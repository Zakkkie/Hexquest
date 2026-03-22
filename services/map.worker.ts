
import { generateMap } from './mapGenerator';
import { getHexKey, getNeighbors } from './hexUtils';

const VOID_LEVEL_FLAG = -99;

self.onmessage = (e: MessageEvent) => {
  const { levelConfig, mapType } = e.data;
  const grid = generateMap(levelConfig, mapType);
  
  // Pre-calculate neighborLevels for initial rendering optimization
  for (const key in grid) {
    const hex = grid[key];
    const neighbors = getNeighbors(hex.q, hex.r);
    hex.neighborLevels = neighbors.map(n => {
      const nKey = getHexKey(n.q, n.r);
      const nHex = grid[nKey];
      return nHex ? nHex.maxLevel : VOID_LEVEL_FLAG;
    });
  }
  
  self.postMessage({ grid });
};
