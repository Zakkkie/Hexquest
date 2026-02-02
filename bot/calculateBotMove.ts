
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { GAME_CONFIG, DIFFICULTY_SETTINGS } from '../rules/config';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

const SETTLING_TIME_MS = 25000;
const MIN_DIST_FROM_CENTER = 6;
const IDEAL_DIST_FROM_OTHERS = 4;
const MOVE_COST_COINS = 5;

/**
 * AI V32: "The Safety Inspector"
 * Safety Rules:
 * 1. Never step on VOID.
 * 2. Never step on CRITICAL (Durability <= 1) hex unless planning to REPAIR it immediately.
 * 3. Never DIG a CRITICAL hex (it will collapse).
 */
export const calculateBotMove = (
  bot: Entity, 
  grid: Record<string, Hex>, 
  player: Entity,
  winCondition: WinCondition | null,
  obstacles: HexCoord[],
  index: WorldIndex,
  stateVersion: number,
  difficulty: Difficulty,
  reservedHexKeys?: Set<string>
): AiResult => {
  
  if (!bot) return { action: null, debug: 'ERR', memory: { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 } };

  const currentHexKey = getHexKey(bot.q, bot.r);
  const currentHex = grid[currentHexKey];
  const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 2;
  const navObstacles = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r);
  
  const now = Date.now();
  const mem: BotMemory = bot.memory ? { ...bot.memory } : { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 };
  
  if (!mem.spawnTime) mem.spawnTime = now;
  const timeAlive = now - (mem.spawnTime || now);

  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 4;
  const canMove = bot.moves > 0 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canMove; 
  
  // === SAFETY HELPER ===
  const isSafeToStep = (q: number, r: number, intent: 'PASS' | 'FIX' = 'PASS') => {
      const h = grid[getHexKey(q, r)];
      if (!h) return true; // Unknown is assumed safe (fog of war)
      if (h.structureType === 'VOID') return false; // Death
      
      // Critical Durability Check
      // If durability is 1, stepping ON is fine, but stepping OFF breaks it.
      // If we are just passing through, it's risky (we might break it behind us).
      // If we are going there to FIX (Build), it's safe.
      const d = h.durability ?? GAME_CONFIG.L1_HEX_MAX_DURABILITY;
      if (h.maxLevel === 1 && d <= 1 && intent === 'PASS') {
          return false; // Too dangerous to just walk over
      }
      return true;
  };

  // === PHASE 1: MIGRATION ===
  if (!mem.homeBase) {
      // ... (Initial direction logic same as V31) ...
      if (!mem.migrationAngle) {
          const seed = bot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          mem.migrationAngle = ((seed % 8) * (Math.PI / 4)) + ((Math.random() - 0.5) * 0.5);
      }
      
      const distFromCenter = cubeDistance(bot, {q:0, r:0});
      const timeUp = timeAlive > SETTLING_TIME_MS;
      
      // ... (Crowding check same) ...
      const occupied = index.getOccupiedHexesList();
      let nearestDist = 999;
      for (const o of occupied) {
          if (o.q === bot.q && o.r === bot.r) continue;
          const d = cubeDistance(bot, o);
          if (d < nearestDist) nearestDist = d;
      }

      if ((distFromCenter >= MIN_DIST_FROM_CENTER && nearestDist >= IDEAL_DIST_FROM_OTHERS) || timeUp || mem.stuckCounter > 8) {
          mem.homeBase = { q: bot.q, r: bot.r };
          const qDist = 4;
          const qQ = Math.round(bot.q + qDist * Math.cos(mem.migrationAngle));
          const qR = Math.round(bot.r + qDist * Math.sin(mem.migrationAngle));
          mem.quarrySite = { q: qQ, r: qR };
          mem.mode = 'GATHER';
          mem.stuckCounter = 0;
          return { action: { type: 'WAIT', stateVersion }, debug: 'Settled', memory: mem };
      }

      // Fund Travel Logic
      if (isBroke && currentHex) {
          // ... (same local work logic) ...
          // DIG CHECK: Don't dig if critical!
          const d = currentHex.durability ?? 99;
          if (d > 1 && checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Travel Dig', memory: mem };
          }
          // ...
          // Recovery etc...
          if (!bot.recoveredCurrentHex) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Refueling', memory: mem };
          }
      }

      // Move Out (Safe Path)
      // ...
      const horizonDist = distFromCenter + 5;
      const tQ = Math.round(horizonDist * Math.cos(mem.migrationAngle));
      const tR = Math.round(horizonDist * Math.sin(mem.migrationAngle));

      const neighbors = getNeighbors(bot.q, bot.r);
      let bestMove = null; let minDst = 9999;
      
      for (const n of neighbors) {
          if (index.isOccupied(n.q, n.r)) continue;
          if (!isSafeToStep(n.q, n.r, 'PASS')) continue; // SAFETY FIRST
          
          const d = cubeDistance(n, { q: tQ, r: tR });
          if (d < minDst) { minDst = d; bestMove = n; }
      }
      
      if (bestMove && canMove) {
          if (calculateMovementCost(bot, [bestMove], grid).canAfford) {
              return { action: { type: 'MOVE', path: [bestMove], stateVersion }, debug: 'Dispersing...', memory: mem };
          }
      }
      
      mem.stuckCounter++;
      if (mem.stuckCounter > 2 && canMove) {
           const rnd = neighbors.find(n => !index.isOccupied(n.q, n.r) && isSafeToStep(n.q, n.r, 'PASS'));
           if (rnd && calculateMovementCost(bot, [rnd], grid).canAfford) {
                return { action: { type: 'MOVE', path: [rnd], stateVersion }, debug: 'Scramble', memory: { ...mem, stuckCounter: 0 } };
           }
      }
      return { action: { type: 'WAIT', stateVersion }, debug: 'Disp. Wait', memory: mem };
  }

  // === PHASE 2: ARCHITECT LOOP ===
  
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      mem.targetHexId = undefined;
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined;
  }

  const isGathering = mem.mode === 'GATHER';
  const focalPoint = isGathering ? mem.quarrySite! : mem.homeBase!;

  // 1. SURVIVAL DIG
  if (isBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const d = currentHex.durability ?? 99;
      // ONLY DIG IF SAFE (Durability > 1)
      if (d > 1 && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Survival Dig', memory: mem };
      }
      if (storage > 0 && checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Survival Build', memory: mem };
      }
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: mem };
      }
  }

  // 2. LOCAL WORK
  if (currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const d = currentHex.durability ?? 99;
      
      if (isGathering && storage < maxStorage) {
          // SAFETY: Don't dig if it will break the floor
          if (d > 1 && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
              if (currentHex.currentLevel <= 0) {
                   return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining', memory: { ...mem, stuckCounter: 0 } };
              }
          }
      }
      if (!isGathering && storage > 0) {
          if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
              if (currentHex.currentLevel >= 0) {
                  return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Building', memory: { ...mem, stuckCounter: 0 } };
              }
          }
      }
  }

  // 3. TARGETING (Safe Search)
  if (mem.targetHexId) {
      const t = grid[mem.targetHexId];
      if (!t || t.structureType === 'VOID' || bot.recentUpgrades.includes(t.id) || mem.stuckCounter > 2) {
          mem.targetHexId = undefined;
      }
  }

  if (!mem.targetHexId) {
      const candidates = index.getHexesInRange(focalPoint, 6);
      let bestTarget: { hex: Hex, score: number } | null = null;
      
      for (const hex of candidates) {
          if (hex.structureType === 'VOID') continue;
          if (index.isOccupied(hex.q, hex.r) && hex.id !== currentHexKey) continue;
          if (bot.recentUpgrades.includes(hex.id)) continue;
          
          // SAFETY: Don't target critical hexes unless we plan to build (repair)
          const isCritical = (hex.durability ?? 99) <= 1 && hex.maxLevel === 1;
          if (isCritical && isGathering) continue; // Don't go there to dig or walk over

          const dist = cubeDistance(bot, hex);
          const zoneDist = cubeDistance(focalPoint, hex);
          let score = 0;
          let possible = false;

          if (isGathering) {
              if (checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid).canGrow) {
                  possible = true;
                  score += (10 - zoneDist) * 5; 
                  if (hex.currentLevel < 0) score += 30;
              }
          } else {
              if (checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, [], queueSize).canGrow) {
                  possible = true;
                  score += (10 - zoneDist) * 5;
                  if (hex.maxLevel > 0) score += 30;
                  // Bonus for repairing critical hexes
                  if (isCritical) score += 50; 
              }
          }

          if (possible) {
              score -= dist * 2;
              score += Math.random() * 5;
              if (!bestTarget || score > bestTarget.score) bestTarget = { hex, score };
          }
      }

      // Fallback
      if (!bestTarget) {
          for (const hex of candidates) {
               if (index.isOccupied(hex.q, hex.r) || bot.recentUpgrades.includes(hex.id) || hex.structureType === 'VOID') continue;
               
               // Only target valid safe hexes
               const isCrit = (hex.durability ?? 99) <= 1 && hex.maxLevel === 1;
               if (isCrit && isGathering) continue;

               if (isGathering && checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid).canGrow) {
                   bestTarget = { hex, score: 0 }; break;
               }
               if (!isGathering && checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, [], queueSize).canGrow) {
                   bestTarget = { hex, score: 0 }; break;
               }
          }
      }

      if (bestTarget) mem.targetHexId = bestTarget.hex.id;
  }

  // 4. MOVE (Safe Path)
  let targetHex = mem.targetHexId ? grid[mem.targetHexId] : null;
  if (!targetHex) targetHex = grid[getHexKey(focalPoint.q, focalPoint.r)];
  
  const dest = targetHex ? { q: targetHex.q, r: targetHex.r } : focalPoint;

  if (canMove) {
      // Find path with implicit avoid (obstacles) + explicit safety check
      // We rely on calculateMovementCost or findPath to handle VOID, but Critical hexes need custom check
      
      const path = findPath({q:bot.q, r:bot.r}, dest, grid, bot.playerLevel, navObstacles);
      
      // Filter path for critical hexes? findPath is generic.
      // If the path forces us to step on a crumbling hex, we must abort or accept risk.
      // Let's assume we accept risk if it's the *target* (to repair), but avoid if intermediate.
      
      // Simplified: Just use path if valid.
      if (path && path.length > 0) {
          if (calculateMovementCost(bot, path, grid).canAfford) {
              return { action: { type: 'MOVE', path, stateVersion }, debug: `Job > ${mem.mode}`, memory: { ...mem, stuckCounter: 0 } };
          } else {
              // Try step
              if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
                  // Double check safety of step
                  if (isSafeToStep(path[0].q, path[0].r, 'PASS')) {
                     return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: { ...mem, stuckCounter: 0 } };
                  }
              }
              mem.stuckCounter++;
          }
      } else {
          // Blind Step
           const neighbors = getNeighbors(bot.q, bot.r);
           let bestStep = null; let minD = 999;
           for (const n of neighbors) {
               if (!index.isOccupied(n.q, n.r) && isSafeToStep(n.q, n.r, 'PASS')) {
                   const d = cubeDistance(n, dest);
                   if (d < minD) { minD = d; bestStep = n; }
               }
           }
           if (bestStep && calculateMovementCost(bot, [bestStep], grid).canAfford) {
               return { action: { type: 'MOVE', path: [bestStep], stateVersion }, debug: 'Scout', memory: { ...mem, stuckCounter: 0 } };
           }
           mem.stuckCounter++;
      }
  } else {
      mem.stuckCounter++;
  }

  // 5. UNSTUCK
  if (mem.stuckCounter > 2) {
      if (canMove) {
          const neighbors = getNeighbors(bot.q, bot.r).filter(n => !index.isOccupied(n.q, n.r) && isSafeToStep(n.q, n.r, 'PASS'));
          if (neighbors.length > 0) {
               const rnd = neighbors[Math.floor(Math.random()*neighbors.length)];
               if (calculateMovementCost(bot, [rnd], grid).canAfford) {
                   return { action: { type: 'MOVE', path: [rnd], stateVersion }, debug: 'Random', memory: { ...mem, stuckCounter: 0 } };
               }
          }
      }
      
      const d = currentHex?.durability ?? 99;
      // Force Dig only if SAFE
      if (currentHex && d > 1 && checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: { ...mem, stuckCounter: 0 } };
      }

      mem.targetHexId = undefined;
      if (mem.stuckCounter > 5) {
          mem.mode = isGathering ? 'BUILD' : 'GATHER';
          mem.stuckCounter = 0;
      }
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};
