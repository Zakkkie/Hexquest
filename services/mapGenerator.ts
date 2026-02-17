
import { Hex } from '../types';
import { LevelConfig } from '../campaign/types';
import { getHexKey, getNeighbors } from './hexUtils';
import { GAME_CONFIG } from '../rules/config';

// Pure function to generate a specific hex based on config rules
export const generateSingleHex = (q: number, r: number, levelConfig?: LevelConfig, mapType?: 'FLAT' | 'CHAOTIC'): Hex => {
    const key = getHexKey(q, r);
    const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q-r));
    
    // Default Defaults
    const wallStartRadius = levelConfig?.mapConfig.wallStartRadius ?? 24; 
    const wallStartLevel = levelConfig?.mapConfig.wallStartLevel ?? 9;
    const wallType = levelConfig?.mapConfig.wallType ?? 'classic';
    const shouldGenerateWalls = levelConfig?.mapConfig.generateWalls ?? true; 

    let level = 0;
    let structureType: 'BARRIER' | 'VOID' | 'MONUMENT' | undefined = undefined;
    
    // Arena Mode Check (Pit Rings usually imply full visibility arena)
    let forceReveal = false;

    // Wall Logic
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
            // Level 1.6 & 2.X logic: Surround with Deep Pits (-8)
            // These serve as the map boundary
            level = -8;
            structureType = undefined;
            forceReveal = true; // Arenas are always visible
        } else {
            // Classic Wall
            level = Math.min(99, wallStartLevel + (dist - wallStartRadius));
            structureType = 'BARRIER';
        }
    } else {
        // --- RANDOM TERRAIN GENERATION (SKIRMISH) ---
        if (mapType === 'CHAOTIC' && (q !== 0 || r !== 0)) {
            // Random level between -1 and 2
            const rand = Math.random();
            if (rand < 0.15) level = 2; // High ground
            else if (rand < 0.3) level = 1; // Unstable
            else if (rand < 0.45) level = -1; // Pit
            else level = 0; // Flat
        }
    }

    // Default center always safe
    if (q === 0 && r === 0) {
        level = 0;
    }

    let durability: number | undefined = undefined;
    
    // Level 1 sectors are unstable
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
        revealed: forceReveal, // Apply force reveal for arenas
        structureType,
        durability
    };
};

export const generateMap = (levelConfig?: LevelConfig, mapType: 'FLAT' | 'CHAOTIC' = 'FLAT'): Record<string, Hex> => {
  const initialGrid: Record<string, Hex> = {};
  
  if (levelConfig && levelConfig.mapConfig.customLayout) {
      // --- CUSTOM FIXED LAYOUT (Campaign Puzzles) ---
      
      // 1. First, generate the base grid (background/walls)
      // If generateWalls is true, we fill the area up to wallStartRadius + padding
      if (levelConfig.mapConfig.generateWalls) {
          const radius = (levelConfig.mapConfig.wallStartRadius || levelConfig.mapConfig.size) + 1;
          for (let q = -radius; q <= radius; q++) {
              const r1 = Math.max(-radius, -q - radius);
              const r2 = Math.min(radius, -q + radius);
              for (let r = r1; r <= r2; r++) {
                  const hex = generateSingleHex(q, r, levelConfig, mapType);
                  // For 'pit_ring' maps (Arenas), start fully revealed
                  if (levelConfig.mapConfig.wallType === 'pit_ring') {
                      hex.revealed = true;
                  } else {
                      hex.revealed = true; // Default to revealed for skirmish/campaign base
                  }
                  initialGrid[hex.id] = hex;
              }
          }
      }

      // 2. Overlay Custom Hexes
      levelConfig.mapConfig.customLayout.forEach(hexDef => {
          if (hexDef.q === undefined || hexDef.r === undefined) return;
          const key = getHexKey(hexDef.q, hexDef.r);
          
          // Merge with existing or create new
          const existing = initialGrid[key] || { 
              id: key, q: hexDef.q, r: hexDef.r, 
              currentLevel: 0, maxLevel: 0, progress: 0, revealed: true 
          };

          initialGrid[key] = {
              ...existing,
              ...hexDef,
              // Ensure critical props exist
              currentLevel: hexDef.currentLevel ?? existing.currentLevel,
              maxLevel: hexDef.maxLevel ?? existing.maxLevel,
              revealed: true // Custom layout always revealed
          };
      });

  } else if (levelConfig && levelConfig.id === '1.2') {
      // --- LEVEL 1.2: FIXED ALGORITHM ---
      // (Kept as is for compatibility)
      const walkableCoords = new Map<string, { q: number, r: number, isSafe: boolean, type?: string }>();
      let current = { q: 0, r: 0 };
      walkableCoords.set(getHexKey(0,0), { q:0, r:0, isSafe: true });
      const pathSteps: {q: number, r: number}[] = [current];
      const targetLength = 14; 
      const moves = [{ dq: 0, dr: -1 }, { dq: 1, dr: -1 }, { dq: -1, dr: 0 }, { dq: 1, dr: 0 }];

      for (let i = 0; i < targetLength; i++) {
          const validCandidates = moves
              .map(m => ({ q: current.q + m.dq, r: current.r + m.dr }))
              .filter(pos => !walkableCoords.has(getHexKey(pos.q, pos.r)));
          if (validCandidates.length === 0) break; 
          const next = validCandidates[Math.floor(Math.random() * validCandidates.length)];
          walkableCoords.set(getHexKey(next.q, next.r), { q: next.q, r: next.r, isSafe: true });
          pathSteps.push(next);
          current = next;
      }
      pathSteps.forEach(p => {
          getNeighbors(p.q, p.r).forEach(n => {
              const k = getHexKey(n.q, n.r);
              if (!walkableCoords.has(k) && Math.random() > 0.3) {
                  walkableCoords.set(k, { q: n.q, r: n.r, isSafe: false });
              }
          });
      });
      const endPos = pathSteps[pathSteps.length - 1];
      walkableCoords.set(getHexKey(endPos.q, endPos.r), { q: endPos.q, r: endPos.r, isSafe: true, type: 'APEX' });
      getNeighbors(endPos.q, endPos.r).forEach(n => {
          const k = getHexKey(n.q, n.r);
          if (!walkableCoords.has(k)) { 
               walkableCoords.set(k, { q: n.q, r: n.r, isSafe: true, type: 'BASE' });
          }
      });

      walkableCoords.forEach((data, key) => {
          let level = 1;
          let durability = data.isSafe ? 3 : 1;
          let structureType: 'CAPITAL' | undefined = undefined;
          if (data.type === 'BASE') { level = 2; durability = 3; }
          if (data.type === 'APEX') { level = 2; durability = 5; structureType = 'CAPITAL'; } 
          initialGrid[key] = {
              id: key, q: data.q, r: data.r,
              currentLevel: level, maxLevel: level,
              progress: 0, revealed: true,
              ownerId: (data.q === 0 && data.r === 0) ? 'player-1' : undefined,
              durability,
              structureType
          };
      });
      // Void border (Now Pits)
      walkableCoords.forEach((data) => {
          getNeighbors(data.q, data.r).forEach(n => {
              const nKey = getHexKey(n.q, n.r);
              // Use -8 for boundary pits instead of VOID
              if (!walkableCoords.has(nKey)) initialGrid[nKey] = { 
                  id: nKey, q: n.q, r: n.r, 
                  currentLevel: -8, maxLevel: -8, 
                  progress: 0, revealed: true, structureType: undefined 
              };
          });
      });

  } else {
      // --- STANDARD DYNAMIC GENERATION (Skirmish / Default) ---
      // Apply the 'CHAOTIC' logic here if requested via mapType
      const startRadius = 2;

      for (let q = -startRadius; q <= startRadius; q++) {
          const r1 = Math.max(-startRadius, -q - startRadius);
          const r2 = Math.min(startRadius, -q + startRadius);
          for (let r = r1; r <= r2; r++) {
              const hex = generateSingleHex(q, r, levelConfig, mapType);
              hex.revealed = true; // Start revealed
              initialGrid[hex.id] = hex;
          }
      }
  }

  // Ensure center exists
  if (!initialGrid[getHexKey(0,0)]) {
      initialGrid[getHexKey(0,0)] = { 
          id: getHexKey(0,0), q:0, r:0, 
          currentLevel: 0, maxLevel: 0, progress: 0, revealed: true 
      };
  }

  return initialGrid;
};
