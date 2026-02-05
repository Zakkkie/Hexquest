
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

const SETTLING_TIME_MS = 15000; // Less time thinking, faster to fight
const AGGRESSION_RADIUS = 8;     // Radius at which bot feels threatened
const MOVE_COST_COINS = 5;

/**
 * AI V34: "The Rival"
 * 1. Base Building: Establishes economy like before.
 * 2. Territory Control: Builds walls/towers to block others.
 * 3. Aggression: If an enemy is nearby, actively tries to dig them into a pit.
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
  
  // Can move via Moves OR Coins
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove; 

  // Detect nearby threats (Player is the main threat)
  const distToPlayer = cubeDistance(bot, player);
  const isThreatened = distToPlayer <= AGGRESSION_RADIUS;

  // === 1. IMMEDIATE SABOTAGE (Highest Priority) ===
  // If we are right next to an enemy, and we can mess them up -> DO IT.
  if (canAffordMove || currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const enemyNeighbor = neighbors.find(n => {
          const ent = index.getEntityAt(n.q, n.r);
          return ent && ent.id !== bot.id; // Attack anyone, including bots
      });

      if (enemyNeighbor) {
          const eHex = grid[getHexKey(enemyNeighbor.q, enemyNeighbor.r)];
          // Rule: Dig enemy if they are NOT in a deep pit yet.
          // Don't waste time digging -5, but digging 0 or +2 is great.
          if (eHex && eHex.currentLevel > -2 && !bot.recentUpgrades.includes(eHex.id)) {
              const eNeighbors = getNeighbors(eHex.q, eHex.r);
              // Check if we can PHYSICALLY dig them
              if (checkDigCondition(eHex, bot, eNeighbors, grid).canGrow) {
                  // If we are full on storage, digging wastes material, BUT it hurts the enemy.
                  // We do it anyway if threatened.
                  return { 
                      action: { type: 'DIG', coord: {q:enemyNeighbor.q, r:enemyNeighbor.r}, stateVersion }, 
                      debug: `ATTACK!`, 
                      memory: { ...mem, stuckCounter: 0 } 
                  };
              }
          }
      }
  }
  
  // === 2. MIGRATION (Early Game) ===
  if (!mem.homeBase) {
      if (!mem.migrationAngle) {
          const seed = bot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          mem.migrationAngle = ((seed % 8) * (Math.PI / 4)) + ((Math.random() - 0.5) * 0.5);
      }
      
      const distFromCenter = cubeDistance(bot, {q:0, r:0});
      const timeUp = timeAlive > SETTLING_TIME_MS;
      
      // Check occupied hexes to keep distance
      const occupied = index.getOccupiedHexesList();
      let nearestDist = 999;
      for (const o of occupied) {
          if (o.q === bot.q && o.r === bot.r) continue;
          const d = cubeDistance(bot, o);
          if (d < nearestDist) nearestDist = d;
      }

      // Settling condition logic
      if ((distFromCenter >= 6 && nearestDist >= 4) || timeUp || mem.stuckCounter > 5) {
          mem.homeBase = { q: bot.q, r: bot.r };
          // Quarry logic...
          const qQ = Math.round(bot.q + 4 * Math.cos(mem.migrationAngle));
          const qR = Math.round(bot.r + 4 * Math.sin(mem.migrationAngle));
          mem.quarrySite = { q: qQ, r: qR };
          mem.mode = 'GATHER';
          mem.stuckCounter = 0;
          return { action: { type: 'WAIT', stateVersion }, debug: 'Base Founded', memory: mem };
      }
      
      // Migration movement logic
      const horizonDist = distFromCenter + 5;
      const tQ = Math.round(horizonDist * Math.cos(mem.migrationAngle));
      const tR = Math.round(horizonDist * Math.sin(mem.migrationAngle));
      const neighbors = getNeighbors(bot.q, bot.r);
      let bestMove = null; let minDst = 9999;
      for (const n of neighbors) {
          if (index.isOccupied(n.q, n.r)) continue;
          const h = grid[getHexKey(n.q, n.r)];
          if (h && h.structureType === 'VOID') continue;
          const d = cubeDistance(n, { q: tQ, r: tR });
          if (d < minDst) { minDst = d; bestMove = n; }
      }
      if (bestMove && canAffordMove) {
          if (calculateMovementCost(bot, [bestMove], grid).canAfford) {
              return { action: { type: 'MOVE', path: [bestMove], stateVersion }, debug: 'Migrating', memory: mem };
          }
      }
      
      // If broke during migration, dig locally
      if (isBroke && currentHex) {
           if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Gas Money', memory: mem };
           }
      }
      mem.stuckCounter++;
      return { action: { type: 'WAIT', stateVersion }, debug: 'Wait Disp', memory: mem };
  }

  // === 3. COMPETITIVE LOOP ===
  
  // Mode Switch logic
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      mem.targetHexId = undefined;
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined;
  }

  // Aggressive Mode Override:
  // If we have SOME storage and are near player, switch to BUILD (to block) or GATHER (to dig under)
  // Let's bias towards GATHER near enemies because Digging is an attack.
  if (isThreatened && storage < maxStorage && Math.random() > 0.5) {
      mem.mode = 'GATHER'; // "Combat Engineering" - dig traps
  }

  const isGathering = mem.mode === 'GATHER';
  const focalPoint = isGathering ? mem.quarrySite! : mem.homeBase!;

  // === 4. POVERTY CHECK ===
  if (isBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      // Try to dig, but NOT if it destroys our own high ground (unless desperate)
      const safeToDig = currentHex.maxLevel <= 0 || mem.stuckCounter > 5;
      if (safeToDig && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Survival Dig', memory: mem };
      }
      // If we have mats, build to gain moves
      if (storage > 0 && checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Survival Build', memory: mem };
      }
      // Recover
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: mem };
      }
  }

  // === 5. LOCAL WORK (Optimization) ===
  if (currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      
      // GATHER: Digging
      if (isGathering && storage < maxStorage) {
          // Rule: Don't dig own towers (L>0). Dig Pits (L<=0).
          // Exception: If threatened, dig anything to get mats for combat.
          if (currentHex.maxLevel <= 0 || isThreatened) {
              if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
                   return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining', memory: { ...mem, stuckCounter: 0 } };
              }
          }
      }
      
      // BUILD: Towering
      if (!isGathering && storage > 0) {
          if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
              // Rule: Don't fill own quarry (L<0). Build Towers (L>=0).
              if (currentHex.currentLevel >= 0) {
                  return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Towering', memory: { ...mem, stuckCounter: 0 } };
              }
          }
      }
  }

  // === 6. TARGETING (The Competitive Part) ===
  
  // Reset stuck target
  if (mem.targetHexId) {
      const t = grid[mem.targetHexId];
      if (!t || t.structureType === 'VOID' || bot.recentUpgrades.includes(t.id) || mem.stuckCounter > 2) {
          mem.targetHexId = undefined;
      }
  }

  if (!mem.targetHexId) {
      const searchRadius = isThreatened ? 4 : 6; // Focus when threatened
      const searchCenter = isThreatened ? player : focalPoint; // Look at PLAYER if threatened, else look at BASE

      const candidates = index.getHexesInRange({q:searchCenter.q, r:searchCenter.r}, searchRadius);
      let bestTarget: { hex: Hex, score: number } | null = null;
      
      for (const hex of candidates) {
          if (hex.structureType === 'VOID') continue;
          if (index.isOccupied(hex.q, hex.r) && hex.id !== currentHexKey) continue;
          if (bot.recentUpgrades.includes(hex.id)) continue;

          const dist = cubeDistance(bot, hex);
          const distToEnemy = cubeDistance(hex, player); // How close is this tile to the player?
          
          let score = 0;
          let possible = false;

          // COMBAT LOGIC
          if (isGathering) {
              // Looking for a spot to DIG
              if (checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid).canGrow) {
                  possible = true;
                  // If digging, we want materials.
                  // BUT: If near player, digging creates a TRAP.
                  if (distToEnemy <= 2) {
                      score += 50; // High priority to dig near player
                      if (hex.currentLevel === 0) score += 20; // Digging surface creates a hole
                  } else {
                      // Normal logic: Dig own quarry
                      if (hex.currentLevel < 0) score += 20; 
                      if (hex.currentLevel > 0) score -= 100; // Don't dig towers
                  }
              }
          } else {
              // Looking for a spot to BUILD
              if (checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, [], queueSize).canGrow) {
                  possible = true;
                  // If building near player, we create WALLS/OBSTACLES.
                  if (distToEnemy <= 2) {
                       score += 40; // Block player
                       // Building on top of player's path?
                  } else {
                      // Normal logic: Build own tower
                      if (hex.maxLevel > 0) score += 20;
                      if (hex.currentLevel < 0) score -= 100;
                  }
              }
          }

          if (possible) {
              score -= dist * 1.5; // Travel cost
              score += Math.random() * 10; // Noise
              if (!bestTarget || score > bestTarget.score) bestTarget = { hex, score };
          }
      }
      if (bestTarget) mem.targetHexId = bestTarget.hex.id;
  }

  // === 7. MOVE ===
  let targetHex = mem.targetHexId ? grid[mem.targetHexId] : null;
  
  // Fallback destination
  const destHex = targetHex || grid[getHexKey(focalPoint.q, focalPoint.r)];
  const dest = destHex ? { q: destHex.q, r: destHex.r } : focalPoint;

  if (canAffordMove) {
      const path = findPath({q:bot.q, r:bot.r}, dest, grid, bot.playerLevel, navObstacles);
      if (path && path.length > 0) {
          if (calculateMovementCost(bot, path, grid).canAfford) {
              // Aggressive Move: If moving towards player, log it differently?
              return { action: { type: 'MOVE', path, stateVersion }, debug: `Moving`, memory: { ...mem, stuckCounter: 0 } };
          } else {
              // Try step
              if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
                  return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: { ...mem, stuckCounter: 0 } };
              }
              mem.stuckCounter++;
          }
      } else {
           // Blind step logic
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

  // === 8. UNSTUCK ===
  if (mem.stuckCounter > 2) {
      // Logic from V33
      if (currentHex && checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: { ...mem, stuckCounter: 0 } };
      }
      mem.targetHexId = undefined;
      // Force switch if really stuck
      if (mem.stuckCounter > 6) {
          mem.mode = isGathering ? 'BUILD' : 'GATHER';
          mem.stuckCounter = 0;
      }
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};
