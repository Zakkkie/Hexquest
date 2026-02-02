
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
      let current = { q: 0, r: 0 };
      walkableCoords.set(getHexKey(0,0), { q:0, r:0, isSafe: true });

      const pathSteps: {q: number, r: number}[] = [current];
      const targetLength = 18; // Increased length for a longer run

      // Available moves: Up-Left, Up-Right, Left, Right
      // We exclude "Down" moves (increasing R) to ensure we eventually reach the top
      const moves = [
          { dq: 0, dr: -1 },  // Up-Left
          { dq: 1, dr: -1 },  // Up-Right
          { dq: -1, dr: 0 },  // Left
          { dq: 1, dr: 0 }    // Right
      ];

      for (let i = 0; i < targetLength; i++) {
          // Find valid neighbors that haven't been visited yet (prevent loops)
          const validCandidates = moves
              .map(m => ({ q: current.q + m.dq, r: current.r + m.dr }))
              .filter(pos => !walkableCoords.has(getHexKey(pos.q, pos.r)));

          if (validCandidates.length === 0) break; // Should not happen in open void

          // Randomly pick a direction to create a winding path
          // Since 2/4 moves are "Up" and 2/4 are "Side", it will naturally zig-zag upwards
          const next = validCandidates[Math.floor(Math.random() * validCandidates.length)];
          
          walkableCoords.set(getHexKey(next.q, next.r), { q: next.q, r: next.r, isSafe: true });
          pathSteps.push(next);
          current = next;
      }

      // Add Flanking Debris (Unsafe corridor width)
      // Add hexes directly adjacent to the path to make it wider but dangerous
      pathSteps.forEach(p => {
          getNeighbors(p.q, p.r).forEach(n => {
              const k = getHexKey(n.q, n.r);
              // 60% chance to spawn debris on the side to make the path look organic but hazardous
              if (!walkableCoords.has(k) && Math.random() > 0.4) {
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

      // Expand the base around the Apex to give a landing zone
      getNeighbors(endPos.q, endPos.r).forEach(n => {
          const k = getHexKey(n.q, n.r);
          // Add a safe platform around the goal
          if (!walkableCoords.has(k)) { 
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
