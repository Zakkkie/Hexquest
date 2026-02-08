
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
 * AI V45: "The Resilient"
 * Fixes infinite WAIT loops by prioritizing local survival actions
 * and aggressive unstuck logic.
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
  
  // V45 Logic Start
  const isBroke = bot.moves < 1 && bot.coins < 5; // Truly broke

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
      
      const tQ = Math.round(15 * Math.cos(mem.migrationAngle));
      const tR = Math.round(15 * Math.sin(mem.migrationAngle));
      const path = findPath({q:bot.q, r:bot.r}, {q:tQ, r:tR}, grid, bot.playerLevel, navObstacles);
      if(path && path.length > 0 && calculateMovementCost(bot, [path[0]], grid).canAfford) {
           return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Migrate', memory: mem };
      }
      return { action: { type: 'WAIT', stateVersion }, debug: 'Wait Settling', memory: mem };
  }

  // --- 1. MODE SWITCH ---
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      if (!mem.towerKey) {
          const candidates = index.getHexesInRange(mem.homeBase, ZONE_RADIUS);
          let bestH = null; let maxL = -99;
          for (const h of candidates) {
              if(h.maxLevel > maxL && h.structureType !== 'VOID') { maxL = h.maxLevel; bestH = h; }
          }
          if (bestH) mem.towerKey = bestH.id;
      }
      mem.targetHexId = undefined;
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined;
  }

  const isGathering = mem.mode === 'GATHER';
  const focalPoint = isGathering ? mem.quarrySite! : mem.homeBase!;

  // === 2. LOCAL WORK (Priority V45) ===
  // Always do work if standing on it.
  if (currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      
      // If broke, DIG anything safe to get moving
      if (isBroke) {
           if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Survival Dig', memory: { ...mem, stuckCounter: 0 } };
           }
           // Recover if digging impossible
           if (!bot.recoveredCurrentHex) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: { ...mem, stuckCounter: 0 } };
           }
      }

      // Normal work
      if (mem.mode === 'GATHER' && storage < maxStorage) {
          if (currentHex.maxLevel <= 0 && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining', memory: { ...mem, stuckCounter: 0 } };
          }
      }
      if (mem.mode === 'BUILD' && storage > 0) {
          if (currentHex.currentLevel >= 0 && checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Building', memory: { ...mem, stuckCounter: 0 } };
          }
      }
  }

  // --- 3. TARGETING ---
  let targetHexId = mem.targetHexId;
  
  if (mem.mode === 'BUILD' && mem.towerKey) {
      const tower = grid[mem.towerKey];
      if (!tower || tower.structureType === 'VOID') {
          mem.towerKey = null;
          targetHexId = undefined;
      } else {
          const tNeighbors = getNeighbors(tower.q, tower.r);
          const tCheck = checkGrowthCondition(tower, bot, tNeighbors, grid, [], queueSize);
          
          if (tCheck.canGrow) {
              targetHexId = tower.id;
          } else if (tCheck.missingSupports && tCheck.missingSupports.length > 0) {
              let bestSupport = null;
              for (const coord of tCheck.missingSupports) {
                  if (index.isOccupied(coord.q, coord.r) && getHexKey(coord.q, coord.r) !== currentHexKey) continue;
                  const sHex = grid[getHexKey(coord.q, coord.r)];
                  if (sHex && sHex.structureType !== 'VOID') {
                      bestSupport = sHex;
                      break; 
                  }
              }
              if (bestSupport) targetHexId = bestSupport.id;
          }
      }
  }
  
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

  // --- 4. MOVEMENT ---
  const targetHex = targetHexId ? grid[targetHexId] : null;
  const dest = targetHex ? { q: targetHex.q, r: targetHex.r } : focalPoint;

  if (dest.q === bot.q && dest.r === bot.r) {
      // At destination but didn't work (Section 2 would have caught it)
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
           // Fallback / Blind
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

  // === 5. UNSTUCK LOGIC (V45) ===
  if (mem.stuckCounter > 1) {
      // 1. Reset Target immediately
      mem.targetHexId = undefined;
      
      // 2. Try Random Move (Wander) to break loops
      if (!isBroke) {
          const neighbors = getNeighbors(bot.q, bot.r);
          const valid = neighbors.filter(n => !index.isOccupied(n.q, n.r) && grid[getHexKey(n.q, n.r)]?.structureType !== 'VOID');
          if (valid.length > 0) {
              const rnd = valid[Math.floor(Math.random() * valid.length)];
              // Only move if affordable
              if (calculateMovementCost(bot, [rnd], grid).canAfford) {
                  return { action: { type: 'MOVE', path: [rnd], stateVersion }, debug: 'Unstuck Move', memory: { ...mem, stuckCounter: 0 } };
              }
          }
      }

      // 3. Switch Mode if really stuck
      if (mem.stuckCounter > 4) {
          mem.mode = mem.mode === 'GATHER' ? 'BUILD' : 'GATHER';
          mem.stuckCounter = 0;
      }
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};
