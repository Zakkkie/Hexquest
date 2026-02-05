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
const AGGRESSION_RADIUS = 6;
const MOVE_COST_COINS = 5;

/**
 * AI V36: "The Strategic Rival" (Fixed)
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
  
  // Initialize Memory with ALL required fields
  const mem: BotMemory = bot.memory ? { ...bot.memory } : { 
      lastPlayerPos: null, 
      currentGoal: null, 
      stuckCounter: 0,
      mode: 'GATHER'
  };
  
  if (!mem.spawnTime) mem.spawnTime = now;
  const timeAlive = now - (mem.spawnTime || now);

  // Economy & State
  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 4;
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove;
  
  // Detect Threats
  const distToPlayer = cubeDistance(bot, player);
  const isThreatened = distToPlayer <= AGGRESSION_RADIUS;

  // --- 0. INITIALIZATION & ZONING ---
  if (!mem.homeBase) {
      if (!mem.migrationAngle) {
          const seed = bot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          mem.migrationAngle = ((seed % 8) * (Math.PI / 4)) + ((Math.random() - 0.5) * 0.5);
      }
      const distFromCenter = cubeDistance(bot, {q:0, r:0});
      
      if (distFromCenter >= 7 || timeAlive > SETTLING_TIME_MS) {
          mem.homeBase = { q: bot.q, r: bot.r };
          const qQ = Math.round(bot.q + 5 * Math.cos(mem.migrationAngle));
          const qR = Math.round(bot.r + 5 * Math.sin(mem.migrationAngle));
          mem.quarrySite = { q: qQ, r: qR };
          mem.mode = 'GATHER';
          return { action: { type: 'WAIT', stateVersion }, debug: 'Base Set', memory: mem };
      }
      // Migration movement fallback (if not handled below)
      // We rely on main movement logic to disperse if target is set, but here we force wait if stuck
  }

  // MODE SWITCHING (Hysteresis)
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      mem.targetHexId = undefined;
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined;
  }

  const isGathering = mem.mode === 'GATHER';
  // If no base yet, use current pos as temp focal point
  const focalPoint = mem.homeBase ? (isGathering ? mem.quarrySite! : mem.homeBase) : { q: bot.q, r: bot.r };

  // === PRIORITY 1: SURVIVAL (If Broke) ===
  if (isBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      // 1. Try Dig (Gain Move + Material). 
      // Safe only if durability > 1 OR we are desperate.
      // Don't dig if we are on our own Tower (Level > 0) unless strictly necessary.
      const isMyTower = currentHex.maxLevel > 0;
      
      if (!isMyTower && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Survival Dig', memory: mem };
      }
      // 2. Build (Gain Move + Coins, Cost Material)
      if (storage > 0 && checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Survival Build', memory: mem };
      }
      // 3. Recover (Gain Move + Coins, No Cost)
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: mem };
      }
  }

  // === PRIORITY 2: COMBAT / SABOTAGE ===
  // Condition: Move available, Enemy Neighbor exists, Enemy is Vulnerable (High Ground)
  if (canAffordMove) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const enemyNeighbor = neighbors.find(n => {
          const ent = index.getEntityAt(n.q, n.r);
          return ent && ent.id !== bot.id; 
      });

      if (enemyNeighbor) {
          const eHex = grid[getHexKey(enemyNeighbor.q, enemyNeighbor.r)];
          // Only sabotage if they are on Level > 0 (Knock them down)
          // Or if they are on Level 0 and we want to trap them.
          if (eHex && eHex.currentLevel >= 0 && !bot.recentUpgrades.includes(eHex.id)) {
              // We DIG the ENEMY hex from our position
              const eNeighbors = getNeighbors(eHex.q, eHex.r);
              if (checkDigCondition(eHex, bot, eNeighbors, grid).canGrow) {
                   return { 
                      action: { type: 'DIG', coord: {q:enemyNeighbor.q, r:enemyNeighbor.r}, stateVersion }, 
                      debug: `SABOTAGE!`, 
                      memory: { ...mem, stuckCounter: 0 } 
                  };
              }
          }
      }
  }

  // === PRIORITY 3: LOCAL WORK (Efficiency) ===
  // Avoid moving if we can work right here.
  if (currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);

      // GATHERING
      if (isGathering && storage < maxStorage) {
          // PROTECT: Don't dig my own Towers (Level > 0)!
          if (currentHex.maxLevel <= 0) {
              if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
                   return { 
                      action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, 
                      debug: `Mining L${currentHex.currentLevel}`, 
                      memory: { ...mem, stuckCounter: 0 } 
                  };
              }
          }
      }

      // BUILDING
      if (!isGathering && storage > 0) {
          // PROTECT: Don't fill my own Quarry (Level < 0)!
          if (currentHex.currentLevel >= 0) {
              if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
                  return { 
                      action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, 
                      debug: `Towering L${currentHex.maxLevel}`, 
                      memory: { ...mem, stuckCounter: 0 } 
                  };
              }
          }
      }
  }

  // === PRIORITY 4: FIND TARGET (Smart Targeting) ===
  // If we can't work locally, find the best spot in our zone.
  
  if (mem.targetHexId) {
      const t = grid[mem.targetHexId];
      if (!t || t.structureType === 'VOID' || bot.recentUpgrades.includes(t.id) || mem.stuckCounter > 1) {
          mem.targetHexId = undefined;
      }
  }

  if (!mem.targetHexId) {
      // Dispersal target logic (Horizon)
      if (!mem.homeBase && mem.migrationAngle) {
          const tQ = Math.round(15 * Math.cos(mem.migrationAngle));
          const tR = Math.round(15 * Math.sin(mem.migrationAngle));
          // Just move towards horizon
          // We don't set targetHexId to a specific hex because it might not exist yet
          // Instead we rely on blind movement below.
      } else {
          // Normal Zone Targeting
          const candidates = index.getHexesInRange(focalPoint, 6);
          let bestTarget: { hex: Hex, score: number } | null = null;
          
          for (const hex of candidates) {
              if (hex.structureType === 'VOID') continue;
              if (index.isOccupied(hex.q, hex.r) && hex.id !== currentHexKey) continue;
              if (bot.recentUpgrades.includes(hex.id)) continue;

              const dist = cubeDistance(bot, hex);
              const zoneDist = cubeDistance(focalPoint, hex); 
              let score = 0;
              let possible = false;

              // --- GATHER MODE SCORING ---
              if (isGathering) {
                  // Valid if we can dig AND it's not a tower
                  if (hex.maxLevel <= 0 && checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid).canGrow) {
                      possible = true;
                      score += (10 - zoneDist) * 3; 
                      if (hex.currentLevel < 0) score += 20 * Math.abs(hex.currentLevel); 
                  }
              } 
              
              // --- BUILD MODE SCORING ---
              else {
                  // Valid if we can build AND it's not a pit
                  if (hex.currentLevel >= 0 && checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, [], queueSize).canGrow) {
                      possible = true;
                      score += (10 - zoneDist) * 3;
                      if (hex.maxLevel > 0) score += 20 * hex.maxLevel;
                      
                      // Cluster bonus: Check neighbors for height
                      const nList = getNeighbors(hex.q, hex.r);
                      const supportCount = nList.filter(n => (grid[getHexKey(n.q, n.r)]?.maxLevel || 0) >= hex.maxLevel).length;
                      score += supportCount * 5; 
                  }
              }

              if (possible) {
                  score -= dist * 2; 
                  score += Math.random() * 5; 
                  
                  if (!bestTarget || score > bestTarget.score) {
                      bestTarget = { hex, score };
                  }
              }
          }
          
          if (bestTarget) mem.targetHexId = bestTarget.hex.id;
      }
  }

  // === PRIORITY 5: MOVEMENT ===
  let targetHex = mem.targetHexId ? grid[mem.targetHexId] : null;
  
  // Fallback: Go to zone center OR dispersal point
  let dest = focalPoint;
  if (!mem.homeBase && mem.migrationAngle) {
       const tQ = Math.round(15 * Math.cos(mem.migrationAngle));
       const tR = Math.round(15 * Math.sin(mem.migrationAngle));
       dest = { q: tQ, r: tR };
  } else if (targetHex) {
      dest = { q: targetHex.q, r: targetHex.r };
  }

  if (canAffordMove) {
      const path = findPath({q:bot.q, r:bot.r}, dest, grid, bot.playerLevel, navObstacles);
      
      if (path && path.length > 0) {
          const cost = calculateMovementCost(bot, path, grid);
          if (cost.canAfford) {
              return { action: { type: 'MOVE', path, stateVersion }, debug: `Moving`, memory: { ...mem, stuckCounter: 0 } };
          } else {
              // Try step
              if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
                   return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: { ...mem, stuckCounter: 0 } };
              }
              mem.stuckCounter++;
          }
      } else {
           // Blind Step (if outside generated map)
           const neighbors = getNeighbors(bot.q, bot.r);
           let bestStep = null; let minD = 999;
           for (const n of neighbors) {
               if (!index.isOccupied(n.q, n.r)) {
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

  // === PRIORITY 6: UNSTUCK / PANIC ===
  if (mem.stuckCounter > 2) {
      const d = currentHex?.durability ?? 99;
      // Force Dig if safe (create movement opportunity)
      // Allow digging own tower ONLY if absolutely stuck (>5)
      const canDigTower = mem.stuckCounter > 5;
      const isMyTower = currentHex && currentHex.maxLevel > 0;
      
      if (currentHex && d > 1 && (!isMyTower || canDigTower) && checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
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