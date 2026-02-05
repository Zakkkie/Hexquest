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
const THREAT_LEVEL_THRESHOLD = 3; // Trigger aggression if level > 3
const MOVE_COST_COINS = 5;

/**
 * AI V37: "The King Slayer"
 * 1. Economy: Cycle between Base and Quarry.
 * 2. Sabotage: PRIORITIZE destroying any hex > Level 3 that isn't mine.
 * 3. No Chasing: Targets terrain, not players.
 * 4. Smart Storage: Dumps materials if full to allow sabotage digging.
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

  // Dynamic Economy Stats
  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage; // Use dynamic max (3 or 4)
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove;
  
  // --- 0. MIGRATION (Start of Game) ---
  if (!mem.homeBase) {
      if (!mem.migrationAngle) {
          const seed = bot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          mem.migrationAngle = ((seed % 8) * (Math.PI / 4)) + ((Math.random() - 0.5) * 0.5);
      }
      
      const distFromCenter = cubeDistance(bot, {q:0, r:0});
      const occupied = index.getOccupiedHexesList();
      let nearestDist = 999;
      for (const o of occupied) {
          if (o.q === bot.q && o.r === bot.r) continue;
          const d = cubeDistance(bot, o);
          if (d < nearestDist) nearestDist = d;
      }

      if ((distFromCenter >= 7 && nearestDist >= 4) || timeAlive > SETTLING_TIME_MS) {
          mem.homeBase = { q: bot.q, r: bot.r };
          const qQ = Math.round(bot.q + 5 * Math.cos(mem.migrationAngle));
          const qR = Math.round(bot.r + 5 * Math.sin(mem.migrationAngle));
          mem.quarrySite = { q: qQ, r: qR };
          mem.mode = 'GATHER';
          return { action: { type: 'WAIT', stateVersion }, debug: 'Base Set', memory: mem };
      }
      // Migration movement (Simple)
      // ... (Using standard fallback movement below)
  }

  // STANDARD MODE SWITCHING
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      mem.targetHexId = undefined;
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined;
  }

  // --- 1. SURVIVAL (Priority #1) ---
  if (isBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const isMyTower = currentHex.ownerId === bot.id && currentHex.maxLevel > 0;
      
      // Dig (Moves) - Avoid digging own tower unless desperate
      if (!isMyTower && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Survival Dig', memory: mem };
      }
      // Build (Moves + Coins)
      if (storage > 0 && checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Survival Build', memory: mem };
      }
      // Recover
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: mem };
      }
  }

  // --- 2. TARGET SELECTION (Scoring System) ---
  
  // Clean up invalid target
  if (mem.targetHexId) {
      const t = grid[mem.targetHexId];
      // If target destroyed (level dropped <= 3 for sabotage target) or invalid
      if (!t || t.structureType === 'VOID' || bot.recentUpgrades.includes(t.id) || mem.stuckCounter > 2) {
          mem.targetHexId = undefined;
      } else {
          // Special Check: If we were sabotaging, stop if level drops
          // We don't explicitly store "Sabotage Mode", but we can check the hex
          // If we targeted a hex because it was >3, and now it is <=3, stop.
          // BUT: If it was our own build target, keep going.
          // Heuristic: If it's NOT mine and <= 3, drop it.
          if (t.ownerId !== bot.id && t.maxLevel <= THREAT_LEVEL_THRESHOLD && mem.mode === 'GATHER') {
             // We were probably attacking it, now it's small enough.
             mem.targetHexId = undefined;
          }
      }
  }

  const isGathering = mem.mode === 'GATHER';
  // If we have a base, look around it. If migrating, look around self.
  const focalPoint = mem.homeBase ? (isGathering ? mem.quarrySite! : mem.homeBase) : { q: bot.q, r: bot.r };
  
  if (!mem.targetHexId) {
      // Scan Range: Broad enough to spot threats
      const candidates = index.getHexesInRange(focalPoint, 8); 
      let bestTarget: { hex: Hex, score: number, type: 'WORK' | 'SABOTAGE' } | null = null;
      
      for (const hex of candidates) {
          if (hex.structureType === 'VOID') continue;
          if (index.isOccupied(hex.q, hex.r) && hex.id !== currentHexKey) continue;
          if (bot.recentUpgrades.includes(hex.id)) continue;

          const dist = cubeDistance(bot, hex);
          const zoneDist = cubeDistance(focalPoint, hex);
          let score = 0;
          let type: 'WORK' | 'SABOTAGE' = 'WORK';
          let possible = false;

          // === SABOTAGE CHECK (Global Priority) ===
          // If hex is High Level (>3) AND Not Mine -> KILL IT
          if (hex.maxLevel > THREAT_LEVEL_THRESHOLD && hex.ownerId !== bot.id) {
               // Check if we CAN dig it (requires support)
               // Even if we can't dig yet, we might want to go there
               possible = true;
               type = 'SABOTAGE';
               score = 200; // Massive priority
               // Closer threats are more urgent
               score -= dist * 2; 
               // Bonus if we are already next to it
               if (dist <= 1) score += 50;
          } 
          
          // === STANDARD ECONOMY ===
          else if (type === 'WORK') {
              if (isGathering) {
                  // GATHER: Look for pits
                  if (hex.maxLevel <= 0 && checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid).canGrow) {
                      possible = true;
                      score += (10 - zoneDist) * 3; // Center bias
                      if (hex.currentLevel < 0) score += 20 * Math.abs(hex.currentLevel);
                  }
              } else {
                  // BUILD: Look for towers
                  if (hex.currentLevel >= 0 && checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, [], queueSize).canGrow) {
                      possible = true;
                      score += (10 - zoneDist) * 3;
                      if (hex.maxLevel > 0) score += 20 * hex.maxLevel;
                      // Don't build on other's turf unless claiming
                      if (hex.ownerId && hex.ownerId !== bot.id) score -= 10;
                  }
              }
              // Distance penalty for work
              if (possible) score -= dist * 1.5;
          }

          if (possible) {
              score += Math.random() * 5; // Jitter
              if (!bestTarget || score > bestTarget.score) {
                  bestTarget = { hex, score, type };
              }
          }
      }
      
      if (bestTarget) mem.targetHexId = bestTarget.hex.id;
  }

  // === 3. EXECUTION ===
  let targetHex = mem.targetHexId ? grid[mem.targetHexId] : null;
  // Fallback to zone center if no target
  if (!targetHex && mem.homeBase) targetHex = grid[getHexKey(focalPoint.q, focalPoint.r)];
  
  if (targetHex) {
      const dist = cubeDistance(bot, targetHex);
      const isTargetHostile = targetHex.maxLevel > THREAT_LEVEL_THRESHOLD && targetHex.ownerId !== bot.id;

      // A. WE ARE AT TARGET (OR NEIGHBOR FOR SABOTAGE)
      if (dist === 0 || (isTargetHostile && dist === 1)) {
          const neighbors = getNeighbors(bot.q, bot.r);
          
          // CASE: SABOTAGE (Target is Neighbor)
          if (isTargetHostile) {
              // Try Dig
              const digCheck = checkDigCondition(targetHex, bot, getNeighbors(targetHex.q, targetHex.r), grid);
              
              if (digCheck.canGrow) {
                  // IF STORAGE FULL: Dump material locally to allow digging
                  if (storage >= maxStorage) {
                      // Try to build on CURRENT hex to free space
                      if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
                          return { 
                              action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, 
                              debug: 'Dump Mats (Sabotage)', 
                              memory: { ...mem, stuckCounter: 0 } 
                          };
                      }
                  }
                  
                  // DIG THE ENEMY
                  return { 
                      action: { type: 'DIG', coord: {q:targetHex.q, r:targetHex.r}, stateVersion }, 
                      debug: 'SABOTAGE', 
                      memory: { ...mem, stuckCounter: 0 } 
                  };
              } else {
                  // Can't dig (Support needed?). Maybe move to another side?
                  // Or just wait/build support?
                  mem.stuckCounter++;
              }
          }
          
          // CASE: WORK (Target is Self)
          else if (dist === 0) {
              if (isGathering && storage < maxStorage) {
                  if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
                      return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining', memory: { ...mem, stuckCounter: 0 } };
                  }
              }
              if (!isGathering && storage > 0) {
                  if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
                      return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Building', memory: { ...mem, stuckCounter: 0 } };
                  }
              }
          }
      }

      // B. MOVE TOWARDS TARGET
      if (canAffordMove) {
          // If Sabotage, we want to be Adjacent (Dist 1), not ON it (Dist 0)
          // But findPath goes to target. We can just stop 1 step short?
          // Actually, standard pathfinding to target is fine, calculateBotMove loop will catch "Dist 1" next tick.
          
          const path = findPath({q:bot.q, r:bot.r}, {q:targetHex.q, r:targetHex.r}, grid, bot.playerLevel, navObstacles);
          
          if (path && path.length > 0) {
              // SABOTAGE STOP: If targeting enemy, stop at distance 1
              if (isTargetHostile && path.length === 1) {
                  // We are already adjacent! Why didn't we dig? logic handled above.
                  // Maybe we need to circle around?
                  // Just wait for next tick to trigger "At Target" logic.
                  return { action: { type: 'WAIT', stateVersion }, debug: 'Positioning...', memory: mem };
              }

              if (calculateMovementCost(bot, path, grid).canAfford) {
                  return { action: { type: 'MOVE', path, stateVersion }, debug: 'Moving', memory: { ...mem, stuckCounter: 0 } };
              } else {
                  // Creep
                  if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
                      return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: { ...mem, stuckCounter: 0 } };
                  }
                  mem.stuckCounter++;
              }
          } else {
              mem.stuckCounter++;
          }
      } else {
          mem.stuckCounter++;
      }
  }

  // === 4. UNSTUCK ===
  if (mem.stuckCounter > 2) {
      if (currentHex && currentHex.durability! > 1 && checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: { ...mem, stuckCounter: 0 } };
      }
      mem.targetHexId = undefined;
      // Force switch if desperate
      if (mem.stuckCounter > 5) {
          mem.mode = mem.mode === 'GATHER' ? 'BUILD' : 'GATHER';
          mem.stuckCounter = 0;
      }
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};