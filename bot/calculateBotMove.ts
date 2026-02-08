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

const SETTLING_TIME_MS = 15000;
const MOVE_COST_COINS = 5;
const ZONE_RADIUS = 5;

/**
 * AI V44: "The Stable Architect"
 * Critical Fixes applied:
 * 1. Stopped "On-Target Dance" by handling action failures explicitly.
 * 2. Prevented "Panic Loop" by protecting key assets from panic digging.
 * 3. Added collision check for support hexes.
 * 4. Cleared target memory on mode switch.
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
  const mem: BotMemory = bot.memory ? { ...bot.memory } : { lastPlayerPos: null, currentGoal: null, stuckCounter: 0, mode: 'GATHER' };
  
  if (!mem.spawnTime) mem.spawnTime = now;
  const timeAlive = now - (mem.spawnTime || now);

  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 4;
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove;

  // --- 0. SETTLING ---
  if (!mem.homeBase) {
      if (!mem.migrationAngle) {
          const seed = bot.id.charCodeAt(bot.id.length-1);
          mem.migrationAngle = ((seed % 8) * (Math.PI / 4));
      }
      const dist = cubeDistance(bot, {q:0, r:0});
      if (dist > 8 || timeAlive > SETTLING_TIME_MS) {
          mem.homeBase = { q: bot.q, r: bot.r };
          const qQ = Math.round(bot.q + 4 * Math.cos(mem.migrationAngle + Math.PI));
          const qR = Math.round(bot.r + 4 * Math.sin(mem.migrationAngle + Math.PI));
          mem.quarrySite = { q: qQ, r: qR };
          mem.mode = 'GATHER';
          return { action: { type: 'WAIT', stateVersion }, debug: 'Settled', memory: mem };
      }
      
      // Migration move logic (Simplified)
      const tQ = Math.round(15 * Math.cos(mem.migrationAngle));
      const tR = Math.round(15 * Math.sin(mem.migrationAngle));
      const path = findPath({q:bot.q, r:bot.r}, {q:tQ, r:tR}, grid, bot.playerLevel, navObstacles);
      if(path && path.length > 0 && calculateMovementCost(bot, [path[0]], grid).canAfford) {
           return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Migrate', memory: mem };
      }
      // If stuck migrating, just wait or random
      return { action: { type: 'WAIT', stateVersion }, debug: 'Wait Settling', memory: mem };
  }

  // --- 1. MODE SWITCH ---
  // FIX #4: Clear target on mode switch to prevent "Sticky Target"
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      if (!mem.towerKey) {
          // Initialize Tower site if needed
          const candidates = index.getHexesInRange(mem.homeBase, ZONE_RADIUS);
          let bestH = null; let maxL = -99;
          for (const h of candidates) {
              if(h.maxLevel > maxL && h.structureType !== 'VOID') { maxL = h.maxLevel; bestH = h; }
          }
          if (bestH) mem.towerKey = bestH.id;
      }
      mem.targetHexId = undefined; // Reset target
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined; // Reset target
  }

  const isGathering = mem.mode === 'GATHER';
  const focalPoint = isGathering ? mem.quarrySite! : mem.homeBase!;

  // --- 2. SURVIVAL ---
  if (isBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      // Safety: Don't dig own Tower (L>0)
      if (currentHex.maxLevel <= 0 && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Fuel Dig', memory: mem };
      }
      if (storage > 0 && checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Fuel Build', memory: mem };
      }
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: mem };
      }
  }

  // --- 3. TARGETING LOGIC ---
  let targetHexId = mem.targetHexId;
  
  // Re-evaluate target every turn (Dynamic Support Logic)
  if (mem.mode === 'BUILD' && mem.towerKey) {
      const tower = grid[mem.towerKey];
      if (!tower || tower.structureType === 'VOID') {
          mem.towerKey = null; // Tower lost
          targetHexId = undefined;
      } else {
          // Logic: Can we upgrade the tower?
          const tNeighbors = getNeighbors(tower.q, tower.r);
          const tCheck = checkGrowthCondition(tower, bot, tNeighbors, grid, [], queueSize);
          
          if (tCheck.canGrow) {
              targetHexId = tower.id;
          } else if (tCheck.missingSupports && tCheck.missingSupports.length > 0) {
              // FIX #3: Collision check for supports
              let bestSupport = null;
              for (const coord of tCheck.missingSupports) {
                  // Don't pick if occupied by another unit (unless it's us)
                  if (index.isOccupied(coord.q, coord.r) && getHexKey(coord.q, coord.r) !== currentHexKey) continue;
                  
                  const sHex = grid[getHexKey(coord.q, coord.r)];
                  if (sHex && sHex.structureType !== 'VOID') {
                      bestSupport = sHex;
                      break; 
                  }
              }
              if (bestSupport) targetHexId = bestSupport.id;
              // If no valid support found (all occupied), keep target undefined to trigger fallback
          }
      }
  }
  
  // Fallback Targeting
  if (!targetHexId) {
      const candidates = index.getHexesInRange(focalPoint, 6);
      let bestTarget = null;
      let maxScore = -9999;
      
      for (const hex of candidates) {
          if (hex.structureType === 'VOID') continue;
          if (index.isOccupied(hex.q, hex.r) && hex.id !== currentHexKey) continue;
          if (bot.recentUpgrades.includes(hex.id)) continue;

          let score = 0;
          let valid = false;
          const dist = cubeDistance(bot, hex);

          if (isGathering) {
              if (checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid).canGrow) {
                   valid = true;
                   if (hex.currentLevel <= 0) score = 100 - dist * 5; 
                   if (hex.currentLevel < 0) score += 50; 
              }
          } else {
              // Build (Generic)
              if (checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, [], queueSize).canGrow) {
                   valid = true;
                   score = 100 - dist * 2;
                   if (hex.maxLevel > 0) score += 50; 
              }
          }

          if (valid && score > maxScore) {
              maxScore = score;
              bestTarget = hex;
          }
      }
      if (bestTarget) targetHexId = bestTarget.id;
  }
  
  mem.targetHexId = targetHexId;

  // --- 4. EXECUTION ---
  const targetHex = targetHexId ? grid[targetHexId] : null;
  
  // A. WORK (If at target)
  if (targetHex && targetHex.id === currentHexKey) {
      const neighbors = getNeighbors(bot.q, bot.r);
      
      // FIX #1: Handle failure to act. Don't fall through to MOVE.
      let actionTaken = false;
      
      if (isGathering) {
          if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining', memory: { ...mem, stuckCounter: 0 } };
          }
      } else {
          if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Building', memory: { ...mem, stuckCounter: 0 } };
          }
      }
      
      // If we are here, action FAILED (e.g. not enough coins/mats despite checks, or condition changed).
      mem.targetHexId = undefined; // Force rethink
      return { action: { type: 'WAIT', stateVersion }, debug: 'Constraint Wait', memory: mem };
  }

  // B. MOVE (If not at target)
  const dest = targetHex ? { q: targetHex.q, r: targetHex.r } : focalPoint;

  // FIX #1 (Part 2): Stop "On-Target Dance". If dest is self, don't pathfind.
  if (dest.q === bot.q && dest.r === bot.r) {
      // We are at destination but Logic A didn't trigger. 
      // This means targetHex was null (fallback to focalPoint).
      // If at focal point and nothing to do, wander.
      mem.stuckCounter++; 
  } else if (canAffordMove) {
      const path = findPath({q:bot.q, r:bot.r}, dest, grid, bot.playerLevel, navObstacles);
      if (path && path.length > 0) {
          if (calculateMovementCost(bot, path, grid).canAfford) {
              return { action: { type: 'MOVE', path, stateVersion }, debug: `Go > ${mem.mode}`, memory: mem };
          } else {
              // Creep
              if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
                  return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: mem };
              }
          }
      } else {
          // Blind Step
           const neighbors = getNeighbors(bot.q, bot.r);
           let bestN = null; let minD = 999;
           for(const n of neighbors) {
               if(!index.isOccupied(n.q, n.r)) {
                   const d = cubeDistance(n, dest);
                   if(d < minD) { minD=d; bestN=n; }
               }
           }
           if (bestN && calculateMovementCost(bot, [bestN], grid).canAfford) {
               return { action: { type: 'MOVE', path: [bestN], stateVersion }, debug: 'Scout', memory: mem };
           }
           mem.stuckCounter++;
      }
  } else {
      mem.stuckCounter++;
  }

  // --- 5. PANIC ---
  if (mem.stuckCounter > 2) {
      // FIX #2: Don't panic dig the Tower Site or Base!
      const isImportant = (mem.homeBase?.q === bot.q && mem.homeBase?.r === bot.r) || mem.towerKey === currentHexKey;
      
      if (!isImportant && currentHex && checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: { ...mem, stuckCounter: 0 } };
      }
      
      mem.targetHexId = undefined;
      // Force switch
      if (mem.stuckCounter > 5) {
          mem.mode = isGathering ? 'BUILD' : 'GATHER';
          mem.stuckCounter = 0;
      }
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};