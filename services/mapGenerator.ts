
import { Hex } from '../types';
import { LevelConfig } from '../campaign/types';
import { getHexKey, getNeighbors } from './hexUtils';
import { GAME_CONFIG } from '../rules/config';

export const generateMap = (levelConfig?: LevelConfig): Record<string, Hex> => {
  const initialGrid: Record<string, Hex> = {};
  
  if (levelConfig && levelConfig.mapConfig.customLayout) {
      // --- CUSTOM FIXED LAYOUT ---
      levelConfig.mapConfig.customLayout.forEach(hexDef => {
          if (hexDef.q === undefined || hexDef.r === undefined) return;
          const key = getHexKey(hexDef.q, hexDef.r);
          initialGrid[key] = {
              id: key,
              q: hexDef.q,
              r: hexDef.r,
              currentLevel: hexDef.currentLevel ?? 0,
              maxLevel: hexDef.maxLevel ?? 0,
              progress: 0,
              revealed: true,
              ownerId: hexDef.ownerId,
              structureType: hexDef.structureType,
              durability: hexDef.durability
          };
      });
  } else if (levelConfig && levelConfig.id === '1.2') {
      // --- LEVEL 1.2: PYRAMID RUN (DYNAMIC RANDOM PATH) ---
      
      const walkableCoords = new Map<string, { q: number, r: number, isSafe: boolean, type?: string }>();
      
      // Start Platform (Safe)
      walkableCoords.set(getHexKey(0,0), { q:0, r:0, isSafe: true });

      // Generate Random Path (Drifting Upwards)
      // We assume axial coordinates where decreasing R moves "Up".
      // From (q, r), valid Up-neighbors are (q, r-1) [Top-Left] and (q+1, r-1) [Top-Right].
      // So at each step we can either keep Q or increment Q.
      
      let currentQ = 0;
      const pathSteps: {q: number, r: number}[] = [{q:0, r:0}];
      const pathLength = 7; // Reach row -7

      for (let i = 1; i <= pathLength; i++) {
          const r = -i;
          // Randomly choose direction (0 = Keep Q/Left, 1 = Inc Q/Right)
          const drift = Math.random() > 0.5 ? 1 : 0;
          currentQ += drift;
          pathSteps.push({ q: currentQ, r });
      }

      // Mark Path as SAFE
      pathSteps.forEach(p => {
          walkableCoords.set(getHexKey(p.q, p.r), { q: p.q, r: p.r, isSafe: true });
      });

      // Add Flanking Debris (Unsafe corridor width)
      // Add hexes directly adjacent to the path to make it wider but dangerous
      pathSteps.forEach(p => {
          // Neighbors: (q-1, r) and (q+1, r) are strictly side neighbors
          // We can also fill gaps if the path turned.
          
          const neighbors = [
              { q: p.q - 1, r: p.r }, // Left
              { q: p.q + 1, r: p.r }  // Right
          ];

          neighbors.forEach(n => {
              const k = getHexKey(n.q, n.r);
              if (!walkableCoords.has(k)) {
                  walkableCoords.set(k, { q: n.q, r: n.r, isSafe: false });
              }
          });
      });

      // Construct Pyramid Apex (Goal) at the end of the path
      const endPos = pathSteps[pathSteps.length - 1];
      
      // Mark the end as APEX
      walkableCoords.set(getHexKey(endPos.q, endPos.r), { 
          q: endPos.q, 
          r: endPos.r, 
          isSafe: true, 
          type: 'APEX' 
      });

      // Expand the base around the Apex (at row -7 or wherever end is)
      const baseNeighbors = getNeighbors(endPos.q, endPos.r);
      baseNeighbors.forEach(n => {
          // Add some platform around the goal if not existing
          const k = getHexKey(n.q, n.r);
          if (!walkableCoords.has(k) && n.r === endPos.r) { // Only same row extension
               walkableCoords.set(k, { q: n.q, r: n.r, isSafe: true, type: 'BASE' });
          }
      });

      // 2. Build the Grid
      walkableCoords.forEach((data, key) => {
          let level = 1;
          // Safe path = 3 hits, Unsafe = 1 hit
          let durability = data.isSafe ? 3 : 1;
          let structureType: 'CAPITAL' | undefined = undefined;

          if (data.type === 'BASE') { level = 2; durability = 3; }
          // APEX IS NOW LEVEL 2
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

      // 3. Generate Bordering VOID
      const voidCoords = new Set<string>();
      
      walkableCoords.forEach((data) => {
          getNeighbors(data.q, data.r).forEach(n => {
              const nKey = getHexKey(n.q, n.r);
              if (!walkableCoords.has(nKey)) {
                  voidCoords.add(nKey);
              }
          });
      });

      voidCoords.forEach(key => {
          const [q, r] = key.split(',').map(Number);
          initialGrid[key] = {
              id: key, q, r,
              currentLevel: 0, maxLevel: 0, progress: 0, revealed: true,
              structureType: 'VOID'
          };
      });

  } else {
      // --- STANDARD RADIAL GENERATION (Skirmish / Default) ---
      // For Skirmish (no levelConfig), we use a small radius (2) and NO walls
      // to simulate an infinite procedural world that expands as you move.
      const mapRadius = levelConfig ? levelConfig.mapConfig.size : 2; 
      const shouldGenerateWalls = levelConfig ? levelConfig.mapConfig.generateWalls : false; 
      const wallStartRadius = levelConfig?.mapConfig.wallStartRadius ?? mapRadius;
      const wallStartLevel = levelConfig?.mapConfig.wallStartLevel ?? 9;
      const wallType = levelConfig?.mapConfig.wallType ?? 'classic';

      for (let q = -mapRadius; q <= mapRadius; q++) {
          const r1 = Math.max(-mapRadius, -q - mapRadius);
          const r2 = Math.min(mapRadius, -q + mapRadius);
          for (let r = r1; r <= r2; r++) {
              const key = getHexKey(q, r);
              
              const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q-r));
              const isWall = shouldGenerateWalls && dist >= wallStartRadius;
              
              let level = 0;
              let structureType: 'BARRIER' | 'VOID' | undefined = undefined;

              if (isWall) {
                  if (wallType === 'void_shatter') {
                      if (dist === wallStartRadius) {
                          structureType = 'VOID';
                          level = 0;
                      } else {
                          const noise = Math.abs(Math.sin(q * 12.9898 + r * 78.233) * 43758.5453) % 1;
                          if (noise > 0.4) {
                              level = 1 + Math.floor((noise - 0.4) * 10); 
                              if (level > 5) level = 5;
                          } else {
                              level = 0;
                          }
                          structureType = undefined;
                      }
                  } else {
                      level = Math.min(99, wallStartLevel + (dist - wallStartRadius));
                      structureType = 'BARRIER';
                  }
              }

              // Determine Owner for Skirmish Start
              let ownerId: string | undefined = undefined;
              let maxLevel = level;
              let currentLevel = level;
              let durability: number | undefined = undefined;

              // If Skirmish (no levelConfig) and Center Hex
              // UPDATED: Start at 0/0 resources, so map must be L0 and Unowned
              if (!levelConfig && q === 0 && r === 0) {
                  ownerId = undefined; // No owner initially
                  maxLevel = 0;        // Level 0
                  currentLevel = 0;    // Level 0
                  durability = undefined;
              }

              // Apply correct durability if hex is Level 1 (e.g. from walls or noise)
              if (!durability && maxLevel === 1) {
                  durability = GAME_CONFIG.L1_HEX_MAX_DURABILITY;
              }

              initialGrid[key] = { 
                  id: key, 
                  q, 
                  r, 
                  currentLevel, 
                  maxLevel, 
                  progress: 0, 
                  revealed: true,
                  structureType,
                  ownerId,
                  durability
              };
          }
      }
  }

  // Ensure center exists if not created (Fallback)
  if (!initialGrid[getHexKey(0,0)]) {
      initialGrid[getHexKey(0,0)] = { 
          id: getHexKey(0,0), q:0, r:0, 
          currentLevel: 0, maxLevel: 0, progress: 0, revealed: true 
      };
  }

  return initialGrid;
};
