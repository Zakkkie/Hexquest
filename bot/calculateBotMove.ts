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

const SETTLING_TIME_MS = 3000;
const MOVE_COST_COINS = 5;
const ZONE_RADIUS = 4; 

/**
 * AI V47: "The Pyramid Master"
 * Goal: Build ONE massive tower.
 * 1. Never dig own tower.
 * 2. If tower needs support -> Build support.
 * 3. If out of mats -> Go dig (far away).
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
  
  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 4;
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove;

  // --- 0. INIT ---
  if (!mem.homeBase) {
      // Just settle where we spawned to start building immediately
      mem.homeBase = { q: bot.q, r: bot.r };
      // Quarry 5 steps East
      mem.quarrySite = { q: bot.q + 5, r: bot.r };
      mem.mode = 'GATHER';
  }

  // --- 1. MODE LOGIC ---
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      mem.targetHexId = undefined;
      
      // Select Tower Site (Highest Hex in Zone)
      const candidates = index.getHexesInRange(mem.homeBase, ZONE_RADIUS);
      let bestH = null; let maxL = -99;
      for (const h of candidates) {
          if (h.structureType !== 'VOID') {
              // Prefer existing towers, then center
              const score = h.maxLevel * 10 - cubeDistance(h, mem.homeBase);
              if (score > maxL) { maxL = score; bestH = h; }
          }
      }
      if (bestH) mem.towerKey = bestH.id;

  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined;
  }

  const isGathering = mem.mode === 'GATHER';
  const focalPoint = isGathering ? mem.quarrySite! : mem.homeBase!;

  // === 2. LOCAL WORK (Zero Travel) ===
  if (currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const isMyTower = currentHex.maxLevel > 0;

      // SURVIVAL: Only dig if NOT on a tower. If on tower, must Recover.
      if (isBroke) {
           if (!isMyTower && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Fuel Dig', memory: { ...mem, stuckCounter: 0 } };
           }
           if (!bot.recoveredCurrentHex) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: { ...mem, stuckCounter: 0 } };
           }
      }

      // GATHER: Only dig pits (Level <= 0)
      if (isGathering && storage < maxStorage) {
          if (!isMyTower && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining', memory: { ...mem, stuckCounter: 0 } };
          }
      }

      // BUILD: Upgrade anything we stand on if we have mats
      if (!isGathering && storage > 0) {
          // If we are on a valid build spot, build it.
          // Don't fill Quarry (-level) unless it helps movement.
          if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
               // Prioritize Tower: If this is our tower key, definitely build.
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Building', memory: { ...mem, stuckCounter: 0 } };
          }
      }
  }

  // === 3. TARGETING (The Pyramid Logic) ===
  let targetHexId = mem.targetHexId;

  if (mem.mode === 'BUILD' && mem.towerKey) {
      const tower = grid[mem.towerKey];
      if (!tower || tower.structureType === 'VOID') {
          mem.towerKey = null; targetHexId = undefined;
      } else {
          // Recursive Support Check
          const tNeighbors = getNeighbors(tower.q, tower.r);
          const tCheck = checkGrowthCondition(tower, bot, tNeighbors, grid, [], queueSize);
          
          if (tCheck.canGrow) {
              targetHexId = tower.id; // Go to Peak
          } else if (tCheck.missingSupports && tCheck.missingSupports.length > 0) {
              // Target the lowest support
              let bestSupport = null;
              let minL = 999;
              for (const coord of tCheck.missingSupports) {
                  // Collision Check
                  if (index.isOccupied(coord.q, coord.r) && getHexKey(coord.q, coord.r) !== currentHexKey) continue;
                  
                  const sHex = grid[getHexKey(coord.q, coord.r)];
                  if (sHex && sHex.structureType !== 'VOID') {
                      if (sHex.maxLevel < minL) { minL = sHex.maxLevel; bestSupport = sHex; }
                  }
              }
              if (bestSupport) targetHexId = bestSupport.id;
          }
      }
  }
  
  // Fallback / Gather Target
  if (!targetHexId) {
      const candidates = index.getHexesInRange(focalPoint, 6);
      let bestT = null; let maxS = -999;
      
      for (const h of candidates) {
          if (h.structureType === 'VOID') continue;
          if (index.isOccupied(h.q, h.r) && h.id !== currentHexKey) continue;
          if (bot.recentUpgrades.includes(h.id)) continue;

          let s = 0;
          let valid = false;
          const d = cubeDistance(bot, h);
          
          if (isGathering) {
              if (h.maxLevel <= 0 && checkDigCondition(h, bot, getNeighbors(h.q, h.r), grid).canGrow) {
                  valid = true;
                  s = -h.currentLevel * 10 - d; // Deepest & Closest
              }
          } else {
              // Build (Generic)
              if (checkGrowthCondition(h, bot, getNeighbors(h.q, h.r), grid, [], queueSize).canGrow) {
                  valid = true;
                  s = h.maxLevel * 10 - d;
              }
          }
          if (valid && s > maxS) { maxS = s; bestT = h; }
      }
      if (bestT) targetHexId = bestT.id;
  }
  
  mem.targetHexId = targetHexId;

  // === 4. MOVEMENT ===
  const tHex = targetHexId ? grid[targetHexId] : null;
  const dest = tHex ? {q: tHex.q, r: tHex.r} : focalPoint;
  
  if (dest.q === bot.q && dest.r === bot.r) {
      mem.targetHexId = undefined; // At target but couldn't work -> Reset
      mem.stuckCounter++;
  } else if (canAffordMove) {
      const path = findPath({q:bot.q, r:bot.r}, dest, grid, bot.playerLevel, navObstacles);
      if (path && path.length > 0) {
          if (calculateMovementCost(bot, path, grid).canAfford) {
              return { action: { type: 'MOVE', path, stateVersion }, debug: `Go > ${mem.mode}`, memory: mem };
          } else if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
              return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: mem };
          }
      } else {
          // Scout
          const n = getNeighbors(bot.q, bot.r).find(x => !index.isOccupied(x.q, x.r));
          if(n && calculateMovementCost(bot, [n], grid).canAfford) {
              return { action: { type: 'MOVE', path: [n], stateVersion }, debug: 'Scout', memory: mem };
          }
      }
  }

  // === 5. UNSTUCK ===
  mem.stuckCounter++;
  if (mem.stuckCounter > 3) {
      mem.mode = isGathering ? 'BUILD' : 'GATHER';
      mem.stuckCounter = 0;
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};