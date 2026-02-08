
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

const SETTLING_TIME_MS = 2000; 
const MOVE_COST_COINS = 5;
const PROJECT_STUCK_LIMIT = 4; // How many fails before abandoning a project

/**
 * AI V48: "The Grand Architect"
 * Feature: Persistent Projects.
 * 1. Bots pick a Tower Site and Quarry Site ONCE and stick to them.
 * 2. If Tower cannot be built due to support, Bot targets the support hexes.
 * 3. Never resets projects unless critically stuck or voided.
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
  // Ensure memory structure
  const mem: BotMemory = bot.memory ? { ...bot.memory } : { lastPlayerPos: null, currentGoal: null, stuckCounter: 0, mode: 'GATHER', projectFailCount: 0 };
  
  if (!mem.spawnTime) mem.spawnTime = now;
  const timeAlive = now - (mem.spawnTime || now);

  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 4;
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove;

  // --- 0. INITIALIZATION (One-Time) ---
  if (!mem.homeBase) {
      if (!mem.migrationAngle) {
          const seed = bot.id.charCodeAt(bot.id.length-1);
          mem.migrationAngle = ((seed % 8) * (Math.PI / 4));
      }
      
      const dist = cubeDistance(bot, {q:0, r:0});
      const tQ = Math.round(15 * Math.cos(mem.migrationAngle));
      const tR = Math.round(15 * Math.sin(mem.migrationAngle));

      // Settle Logic
      if (dist > 8 || timeAlive > SETTLING_TIME_MS) {
          mem.homeBase = { q: bot.q, r: bot.r };
          // Define Permanent Quarry & Tower Sites relative to base
          // Tower is Base Center
          mem.towerKey = currentHexKey;
          // Quarry is 5 steps away
          const qQ = Math.round(bot.q + 5 * Math.cos(mem.migrationAngle));
          const qR = Math.round(bot.r + 5 * Math.sin(mem.migrationAngle));
          mem.quarryKey = getHexKey(qQ, qR); // Might not exist yet, that's fine
          mem.quarrySite = { q: qQ, r: qR };
          
          mem.mode = 'GATHER';
          return { action: { type: 'WAIT', stateVersion }, debug: 'Projects Set', memory: mem };
      }
      
      // Migrate
      const path = findPath({q:bot.q, r:bot.r}, {q:tQ, r:tR}, grid, bot.playerLevel, navObstacles);
      if (path && path.length > 0 && calculateMovementCost(bot, [path[0]], grid).canAfford) {
          return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Migrate', memory: mem };
      }
      // Random walk if stuck migrating
      const n = getNeighbors(bot.q, bot.r).find(x => !index.isOccupied(x.q, x.r));
      if(n) return { action: { type: 'MOVE', path: [n], stateVersion }, debug: 'Wander', memory: mem };
  }

  // --- 1. MODE SWITCH ---
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      // Do NOT reset towerKey here. We keep working on the same tower.
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      // Do NOT reset quarryKey here.
  }

  const isGathering = mem.mode === 'GATHER';
  const focalPoint = isGathering ? mem.quarrySite! : mem.homeBase!;

  // --- 2. SURVIVAL ---
  if (isBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      // Don't dig own Tower Project
      const isProject = currentHexKey === mem.towerKey;
      if (!isProject && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Fuel Dig', memory: { ...mem, stuckCounter: 0 } };
      }
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: { ...mem, stuckCounter: 0 } };
      }
  }

  // --- 3. PROJECT TARGETING ---
  
  let targetHexId: string | undefined = undefined;

  // BUILD PROJECT
  if (!isGathering && mem.towerKey) {
      const tower = grid[mem.towerKey];
      
      // Project Validation
      if (!tower || tower.structureType === 'VOID') {
          // Project failed (destroyed). Pick new one nearby.
          const newT = index.getHexesInRange(mem.homeBase, 3).find(h => h.structureType !== 'VOID');
          if (newT) mem.towerKey = newT.id;
          else mem.towerKey = currentHexKey; // Restart here
      } else {
          // Recursive Support Analysis
          const check = checkGrowthCondition(tower, bot, getNeighbors(tower.q, tower.r), grid, [], queueSize);
          
          if (check.canGrow) {
              targetHexId = mem.towerKey; // Target the peak
          } else if (check.missingSupports && check.missingSupports.length > 0) {
              // Target the SUPPORTS instead
              // Find the best support to build (closest or lowest)
              let bestSupp = null;
              let minL = 999;
              
              for (const s of check.missingSupports) {
                  const sHex = grid[getHexKey(s.q, s.r)];
                  if (sHex && sHex.structureType !== 'VOID' && !index.isOccupied(s.q, s.r)) {
                      if (sHex.maxLevel < minL) {
                          minL = sHex.maxLevel;
                          bestSupp = sHex;
                      }
                  }
              }
              // If we found a support to build, go there. 
              // If not (e.g. all occupied), we stick to TowerKey and wait/wander.
              if (bestSupp) targetHexId = bestSupp.id;
              else targetHexId = mem.towerKey;
          }
      }
  }

  // GATHER PROJECT
  if (isGathering && mem.quarryKey) {
      // Logic for quarry is simpler: Go to center, dig. If full, dig neighbors (widen).
      // Actually, Digging requires support too (reverse pyramid).
      // So if center cannot be dug, dig neighbors.
      const pit = grid[mem.quarryKey];
      if (!pit || pit.structureType === 'VOID') {
           // Quarry valid? Void is fine for quarry, means we dug deep? No, Void means gone.
           // If quarry center is void, we pick a neighbor as new center to widen.
           // Simplified: Just target current Quarry Center.
      }
      
      // If we don't have a specific target from above logic...
      // Check if Quarry Center is diggable
      if (pit && pit.structureType !== 'VOID') {
          const dCheck = checkDigCondition(pit, bot, getNeighbors(pit.q, pit.r), grid);
          if (dCheck.canGrow) {
              targetHexId = pit.id;
          } else if (dCheck.missingSupports) {
              // Need to dig neighbors first (Widen the pit)
               let bestSupp = null;
               for (const s of dCheck.missingSupports) {
                  const sHex = grid[getHexKey(s.q, s.r)];
                  if (sHex && sHex.structureType !== 'VOID' && !index.isOccupied(s.q, s.r)) {
                       bestSupp = sHex;
                       break; 
                  }
               }
               if (bestSupp) targetHexId = bestSupp.id;
          }
      }
      // If Quarry key invalid (not generated yet), target it anyway to move there
      if (!targetHexId) targetHexId = mem.quarryKey;
  }

  // --- 4. EXECUTION ---
  const target = targetHexId ? grid[targetHexId] : null;
  const dest = target ? { q: target.q, r: target.r } : focalPoint; // Fallback to zone center
  
  // A. WORK (At Target)
  if (currentHexKey === targetHexId) {
      const neighbors = getNeighbors(bot.q, bot.r);
      
      if (isGathering) {
          if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining', memory: { ...mem, stuckCounter: 0, projectFailCount: 0 } };
          }
      } else {
          if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Building', memory: { ...mem, stuckCounter: 0, projectFailCount: 0 } };
          }
      }
      
      // If we are at target but CANNOT work:
      mem.projectFailCount = (mem.projectFailCount || 0) + 1;
      
      // If failed too many times, CHANGE PROJECT SITE
      if (mem.projectFailCount > PROJECT_STUCK_LIMIT) {
          if (isGathering) {
              // Shift quarry slightly
              const neighbors = getNeighbors(bot.q, bot.r);
              const n = neighbors[Math.floor(Math.random()*6)];
              mem.quarryKey = getHexKey(n.q, n.r);
              mem.quarrySite = n;
          } else {
              // Shift tower slightly
              const neighbors = getNeighbors(bot.q, bot.r);
              const n = neighbors[Math.floor(Math.random()*6)];
              mem.towerKey = getHexKey(n.q, n.r);
          }
          mem.projectFailCount = 0;
          return { action: { type: 'WAIT', stateVersion }, debug: 'Shift Project', memory: mem };
      }
  }

  // B. MOVE
  if (canAffordMove) {
      const path = findPath({q:bot.q, r:bot.r}, dest, grid, bot.playerLevel, navObstacles);
      if (path && path.length > 0) {
          if (calculateMovementCost(bot, path, grid).canAfford) {
              return { action: { type: 'MOVE', path, stateVersion }, debug: 'Commute', memory: { ...mem, stuckCounter: 0 } };
          } else {
               // Creep
               if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
                  return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: { ...mem, stuckCounter: 0 } };
               }
          }
      } else {
          // Blind Step
          const n = getNeighbors(bot.q, bot.r).find(x => !index.isOccupied(x.q, x.r));
          if(n && calculateMovementCost(bot, [n], grid).canAfford) {
               return { action: { type: 'MOVE', path: [n], stateVersion }, debug: 'Scout', memory: mem };
          }
      }
  }

  // --- 5. PANIC ---
  mem.stuckCounter++;
  if (mem.stuckCounter > 3) {
      // Force dig under self (unless Tower)
      if (currentHex && currentHex.maxLevel <= 0 && checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: { ...mem, stuckCounter: 0 } };
      }
      // Force switch mode
      if (mem.stuckCounter > 6) {
          mem.mode = isGathering ? 'BUILD' : 'GATHER';
          mem.stuckCounter = 0;
      }
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};
