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

const SETTLING_TIME_MS = 20000;
const LOCAL_SCAN_RADIUS = 4;   // Быстрый поиск
const DEEP_SCAN_RADIUS = 15;   // Глубокий анализ
const DEEP_SCAN_INTERVAL = 10; // Как часто делать глубокий анализ (тиков)
const ZONE_RADIUS = 6;         // Радиус рабочей зоны
const MOVE_COST_COINS = 5;

/**
 * AI V41: "The Optimized Strategist"
 * Merges V40 Performance (Variable Awareness) with V37 Logic (Sabotage/Safety).
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
  const mem: BotMemory = bot.memory ? { ...bot.memory } : { lastPlayerPos: null, currentGoal: null, stuckCounter: 0, mode: 'GATHER', scanTimer: 0 };
  
  // --- VARIABLE AWARENESS TIMER ---
  mem.scanTimer = (mem.scanTimer || 0) + 1;
  const isDeepScan = mem.scanTimer >= DEEP_SCAN_INTERVAL || !mem.targetHexId;

  if (!mem.spawnTime) mem.spawnTime = now;
  const timeAlive = now - (mem.spawnTime || now);

  // Economy
  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 4;
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove;

  // --- 0. SETTLING (One-time calculation) ---
  if (!mem.homeBase) {
      if (!mem.migrationAngle) {
          const seed = bot.id.charCodeAt(bot.id.length-1);
          mem.migrationAngle = ((seed % 8) * (Math.PI / 4));
      }
      
      const dist = cubeDistance(bot, {q:0, r:0});
      const occupied = index.getOccupiedHexesList();
      let nearest = 999;
      for(const o of occupied) {
          if (o.q !== bot.q) nearest = Math.min(nearest, cubeDistance(bot, o));
      }

      // Settle condition
      if ((dist > 8 && nearest > 5) || timeAlive > SETTLING_TIME_MS) {
          mem.homeBase = { q: bot.q, r: bot.r };
          const qQ = Math.round(bot.q + 5 * Math.cos(mem.migrationAngle + Math.PI));
          const qR = Math.round(bot.r + 5 * Math.sin(mem.migrationAngle + Math.PI));
          mem.quarrySite = { q: qQ, r: qR };
          mem.mode = 'GATHER';
          return { action: { type: 'WAIT', stateVersion }, debug: 'Settled', memory: mem };
      }
      
      // If broke during migration -> Work locally
      if (isBroke && currentHex) {
           const neighbors = getNeighbors(bot.q, bot.r);
           if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Travel Dig', memory: mem };
           }
      }

      // Move Out Blindly
      const tQ = Math.round(15 * Math.cos(mem.migrationAngle));
      const tR = Math.round(15 * Math.sin(mem.migrationAngle));
      const path = findPath({q:bot.q, r:bot.r}, {q:tQ, r:tR}, grid, bot.playerLevel, navObstacles);
      
      if (path && path.length > 0 && calculateMovementCost(bot, [path[0]], grid).canAfford) {
          return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Migrating', memory: mem };
      }
      
      return { action: { type: 'WAIT', stateVersion }, debug: 'Stuck', memory: mem };
  }

  // --- 1. MODE SWITCH ---
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      mem.targetHexId = undefined;
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined;
  }

  const isGathering = mem.mode === 'GATHER';
  const focalPoint = isGathering ? mem.quarrySite! : mem.homeBase!;

  // --- 2. SURVIVAL (Local only) ---
  if (isBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      // Dig only if safe (don't dig own tower if it breaks connection)
      const isMyTower = currentHex.maxLevel > 0;
      if (!isMyTower && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Survival Dig', memory: mem };
      }
      if (storage > 0 && checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Survival Build', memory: mem };
      }
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: mem };
      }
  }

  // --- 3. SABOTAGE (The Rival) ---
  if (canAffordMove) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const enemyNeighbor = neighbors.find(n => {
          const ent = index.getEntityAt(n.q, n.r);
          return ent && ent.id !== bot.id; 
      });

      if (enemyNeighbor) {
          const eHex = grid[getHexKey(enemyNeighbor.q, enemyNeighbor.r)];
          // Aggression Trigger: Enemy on High Ground (>0) OR we are just mean
          if (eHex && eHex.currentLevel >= 0 && !bot.recentUpgrades.includes(eHex.id)) {
              if (checkDigCondition(eHex, bot, getNeighbors(eHex.q, eHex.r), grid).canGrow) {
                   // If storage full, we might skip unless it's a high threat
                   if (storage < maxStorage || eHex.maxLevel > 2) {
                       return { 
                          action: { type: 'DIG', coord: {q:enemyNeighbor.q, r:enemyNeighbor.r}, stateVersion }, 
                          debug: `SABOTAGE!`, 
                          memory: { ...mem, stuckCounter: 0 } 
                      };
                   }
              }
          }
      }
  }

  // --- 4. LOCAL WORK CHECK ---
  if (currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      
      if (isGathering && storage < maxStorage) {
          // PROTECT: Don't dig towers
          if (currentHex.maxLevel <= 0 && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining', memory: { ...mem, stuckCounter: 0 } };
          }
      }
      
      if (!isGathering && storage > 0) {
          // PROTECT: Don't fill pits
          if (currentHex.currentLevel >= 0 && checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Building', memory: { ...mem, stuckCounter: 0 } };
          }
      }
  }

  // --- 5. TARGETING (Variable Radius) ---
  const currentSearchRadius = isDeepScan ? DEEP_SCAN_RADIUS : LOCAL_SCAN_RADIUS;
  
  let bestTarget: { hex: Hex, score: number } | null = null;
  const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, currentSearchRadius); 

  for (const hex of candidates) {
      if (hex.structureType === 'VOID') continue;
      if (index.isOccupied(hex.q, hex.r) && hex.id !== currentHexKey) continue;
      if (bot.recentUpgrades.includes(hex.id)) continue;

      let score = 0;
      let valid = false;
      
      const zoneDist = cubeDistance(focalPoint, hex);

      // Stick to zone unless Deep Scanning
      if (!isDeepScan && zoneDist > ZONE_RADIUS) continue; 

      if (isGathering) {
          // Look for Pits
          if (hex.maxLevel <= 0 && checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid).canGrow) {
              score = -hex.currentLevel * 10; 
              score += (ZONE_RADIUS - zoneDist) * 2; 
              valid = true;
          }
      } else {
          // Look for Towers
          if (hex.currentLevel >= 0 && checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, [], queueSize).canGrow) {
              score = hex.maxLevel * 10;
              score += (ZONE_RADIUS - zoneDist) * 2;
              
              // Support Logic: Bonus if next to other high tiles
              const nList = getNeighbors(hex.q, hex.r);
              const support = nList.filter(n => (grid[getHexKey(n.q, n.r)]?.maxLevel || 0) >= hex.maxLevel).length;
              score += support * 5;

              valid = true;
          }
      }

      if (valid) {
          score -= cubeDistance(bot, hex); 
          if (!bestTarget || score > bestTarget.score) {
              bestTarget = { hex, score };
          }
      }
  }
  
  if (bestTarget) {
      mem.targetHexId = bestTarget.hex.id;
      if (isDeepScan) mem.scanTimer = 0; 
  } else {
      mem.targetHexId = undefined; 
  }

  // --- 6. MOVEMENT ---
  let dest = focalPoint; 
  
  if (mem.targetHexId) {
      const t = grid[mem.targetHexId];
      if (t) dest = { q: t.q, r: t.r };
  }

  // If already at dest but couldn't work (checked above), move random to unstick
  if (bot.q === dest.q && bot.r === dest.r) {
      mem.stuckCounter++;
  } else if (canAffordMove) {
      const path = findPath({q:bot.q, r:bot.r}, dest, grid, bot.playerLevel, navObstacles);
      if (path && path.length > 0) {
          if (calculateMovementCost(bot, path, grid).canAfford) {
              const debugMsg = mem.targetHexId ? 'Work' : (isDeepScan ? 'Deep Search' : 'Commute');
              return { action: { type: 'MOVE', path, stateVersion }, debug: debugMsg, memory: { ...mem, stuckCounter: 0 } };
          } else {
              // Try step
              if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
                  return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: { ...mem, stuckCounter: 0 } };
              }
          }
      } else {
           // Blind Step
           const neighbors = getNeighbors(bot.q, bot.r);
           let bestN = null; let minD = 999;
           for(const n of neighbors) {
               if(!index.isOccupied(n.q, n.r)) {
                   const d = cubeDistance(n, dest);
                   if(d<minD) { minD=d; bestN=n; }
               }
           }
           if (bestN && calculateMovementCost(bot, [bestN], grid).canAfford) {
               return { action: { type: 'MOVE', path: [bestN], stateVersion }, debug: 'Scout', memory: { ...mem, stuckCounter: 0 } };
           }
           mem.stuckCounter++;
      }
  } else {
      mem.stuckCounter++;
  }

  // --- 7. PANIC ---
  if (mem.stuckCounter > 2) {
      if (currentHex && checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
           // Allow digging own tower in panic
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: { ...mem, stuckCounter: 0 } };
      }
      mem.targetHexId = undefined;
      mem.mode = isGathering ? 'BUILD' : 'GATHER';
      mem.stuckCounter = 0;
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};