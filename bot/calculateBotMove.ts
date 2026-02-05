
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

const SETTLING_TIME_MS = 10000; 
const AGGRESSION_RADIUS = 6;
const MOVE_COST_COINS = 5;

/**
 * AI V35: "The Architect"
 * Fixes jitter by prioritizing LOCAL actions before movement.
 * Prioritizes Vertical Growth (Building Supports) over random expansion.
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
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove; 

  // --- THREAT ASSESSMENT ---
  const distToPlayer = cubeDistance(bot, player);
  const isHighLevelThreat = player.playerLevel > 3;
  const isSelfDefense = distToPlayer <= 2;
  const isThreatened = (distToPlayer <= AGGRESSION_RADIUS && isHighLevelThreat) || isSelfDefense;

  // === 1. IMMEDIATE SABOTAGE (Self Defense) ===
  // If threatened, prioritize messing up the player over building.
  if (canAffordMove || currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const enemyNeighbor = neighbors.find(n => {
          const ent = index.getEntityAt(n.q, n.r);
          return ent && ent.id !== bot.id; 
      });

      if (enemyNeighbor && isThreatened) {
          const eHex = grid[getHexKey(enemyNeighbor.q, enemyNeighbor.r)];
          // Only dig if it hurts them (Level > -1)
          if (eHex && eHex.currentLevel > -2 && !bot.recentUpgrades.includes(eHex.id)) {
              if (checkDigCondition(eHex, bot, getNeighbors(eHex.q, eHex.r), grid).canGrow) {
                  return { 
                      action: { type: 'DIG', coord: {q:enemyNeighbor.q, r:enemyNeighbor.r}, stateVersion }, 
                      debug: `ATTACK!`, 
                      memory: { ...mem, stuckCounter: 0 } 
                  };
              }
          }
      }
  }
  
  // === 2. MIGRATION (Start of Game) ===
  // Find a spot away from the center/player to start the base.
  if (!mem.homeBase) {
      if (!mem.migrationAngle) {
          const seed = bot.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          mem.migrationAngle = ((seed % 8) * (Math.PI / 4));
      }
      
      const distFromCenter = cubeDistance(bot, {q:0, r:0});
      const timeUp = timeAlive > SETTLING_TIME_MS;
      const occupied = index.getOccupiedHexesList();
      
      // Determine if settled
      let isCrowded = false;
      for (const o of occupied) {
          if (o.q === bot.q && o.r === bot.r) continue;
          if (cubeDistance(bot, o) < 3) isCrowded = true;
      }

      if ((distFromCenter >= 5 && !isCrowded) || timeUp) {
          mem.homeBase = { q: bot.q, r: bot.r };
          mem.mode = 'GATHER';
          return { action: { type: 'WAIT', stateVersion }, debug: 'Base Founded', memory: mem };
      }
      
      // Migration Move
      const horizonDist = 7;
      const tQ = Math.round(horizonDist * Math.cos(mem.migrationAngle));
      const tR = Math.round(horizonDist * Math.sin(mem.migrationAngle));
      
      // If we can't move, dig for fuel
      if (isBroke && currentHex) {
           if (checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Gas Money', memory: mem };
           }
           // Panic wait
           return { action: { type: 'WAIT', stateVersion }, debug: 'Stranded', memory: mem };
      }

      if (canAffordMove) {
          const path = findPath({q:bot.q, r:bot.r}, {q:tQ, r:tR}, grid, bot.playerLevel, navObstacles);
          if (path && path.length > 0) {
               return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Migrating', memory: mem };
          }
      }
  }

  // === 3. STRATEGIC GOAL SELECTION ===
  // Determine what we WANT to do, then see if we can do it locally or need to move.

  // A. Mode Switching
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      mem.targetHexId = undefined; // Reset target to re-evaluate build priority
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined;
  }

  // B. Find "The Spire" (Highest owned hex that we should focus on)
  let bestBuildTarget: Hex | null = null;
  let highestLevel = -99;
  
  // Get all owned hexes
  const myHexes = Object.values(grid).filter(h => h.ownerId === bot.id && h.structureType !== 'VOID');
  
  // Sort by level descending
  myHexes.sort((a, b) => b.maxLevel - a.maxLevel);

  if (myHexes.length > 0) {
      // The Spire is our highest hex
      const spire = myHexes[0];
      highestLevel = spire.maxLevel;

      // Can we upgrade the Spire?
      const spireNeighbors = getNeighbors(spire.q, spire.r);
      const condition = checkGrowthCondition(spire, bot, spireNeighbors, grid, [], queueSize);

      if (condition.canGrow) {
          // Yes! Focus on the Spire
          bestBuildTarget = spire;
      } else if (condition.missingSupports && condition.missingSupports.length > 0) {
          // No! We need supports. Focus on the LOWEST support to bring it up.
          // Convert coords back to Hex
          const supportHexes = condition.missingSupports
              .map(c => grid[getHexKey(c.q, c.r)])
              .filter(h => h && h.structureType !== 'VOID'); // Ensure valid
          
          // Sort supports by level ascending (build from bottom up)
          supportHexes.sort((a, b) => a.maxLevel - b.maxLevel);
          
          if (supportHexes.length > 0) {
              bestBuildTarget = supportHexes[0]; // Target the weakest support
          }
      } else {
          // Fallback: Just expand
          bestBuildTarget = spire;
      }
  }

  // C. Fallback Build Target (Expansion)
  if (!bestBuildTarget) {
      const neighbors = getNeighbors(bot.q, bot.r);
      // Find a neutral or low level neighbor
      const candidates = neighbors
          .map(n => grid[getHexKey(n.q, n.r)])
          .filter(h => h && h.structureType !== 'VOID' && (!h.ownerId || h.ownerId === bot.id));
      
      if (candidates.length > 0) {
          bestBuildTarget = candidates[0];
      } else {
          bestBuildTarget = currentHex; // Just build where we stand
      }
  }

  // === 4. EXECUTION ===

  // --- CASE: LOCAL ACTION (NO MOVING) ---
  // If we are standing ON the target, or ON a good spot for the current mode, DO IT.
  
  if (currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);

      // GATHER LOCAL
      if (mem.mode === 'GATHER') {
          // We can dig here if it's safe (not destroying our own tower > 0)
          // Digging creates pits (level < 0) which is fine for quarry.
          if (currentHex.maxLevel <= 0) {
              if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
                  return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining Local', memory: mem };
              }
          }
      } 
      // BUILD LOCAL
      else if (mem.mode === 'BUILD' && storage > 0) {
          // If we are standing on the calculated best target, upgrade it!
          if (bestBuildTarget && bestBuildTarget.id === currentHex.id) {
              if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
                  return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Building Up', memory: mem };
              }
          }
          // If we are not on target, but this hex needs recovery?
          if (!bot.recoveredCurrentHex && currentHex.maxLevel > 0) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recovering', memory: mem };
          }
      }
  }

  // --- CASE: MOVEMENT REQUIRED ---
  
  // Determine Destination
  let dest: HexCoord | null = null;
  let debugReason = '';

  if (mem.mode === 'BUILD' && bestBuildTarget) {
      dest = { q: bestBuildTarget.q, r: bestBuildTarget.r };
      debugReason = `To Build L${bestBuildTarget.maxLevel}`;
  } else if (mem.mode === 'GATHER') {
      // Find nearest diggable spot (Level <= 0)
      const search = index.getHexesInRange({q:bot.q, r:bot.r}, 4);
      const quarry = search.find(h => h.structureType !== 'VOID' && h.maxLevel <= 0 && !index.isOccupied(h.q, h.r));
      if (quarry) {
          dest = { q: quarry.q, r: quarry.r };
          debugReason = 'To Quarry';
      } else {
          // Panic: Dig where we stand if possible, or move random
          dest = mem.homeBase || { q:0, r:0 };
      }
  }

  if (dest && canAffordMove) {
      // Don't move if we are already there (Logic should have caught this in Local Action, but safety check)
      if (dest.q === bot.q && dest.r === bot.r) {
           return { action: { type: 'WAIT', stateVersion }, debug: 'Aligning', memory: mem };
      }

      const path = findPath({q:bot.q, r:bot.r}, dest, grid, bot.playerLevel, navObstacles);
      if (path && path.length > 0) {
          // Only take ONE step to avoid locking into a long outdated path
          // But ensure we don't jitter back and forth.
          const nextStep = path[0];
          
          // Check previous pos to avoid ping-pong (unless path length is 1, then we must go)
          if (path.length > 1 && mem.lastPlayerPos && nextStep.q === mem.lastPlayerPos.q && nextStep.r === mem.lastPlayerPos.r) {
              // We are trying to go back to where we just were. Is it necessary?
              // Only allow if stuck counter is high
              if (mem.stuckCounter < 2) {
                  return { action: { type: 'WAIT', stateVersion }, debug: 'Thinking', memory: { ...mem, stuckCounter: mem.stuckCounter + 1 } };
              }
          }

          if (calculateMovementCost(bot, [nextStep], grid).canAfford) {
              return { 
                  action: { type: 'MOVE', path: [nextStep], stateVersion }, 
                  debug: debugReason, 
                  memory: { ...mem, lastPlayerPos: {q:bot.q, r:bot.r}, stuckCounter: 0 } 
              };
          }
      }
  }

  // --- FAILSADES ---
  
  // If broke and on valid hex -> Recover or Dig
  if (isBroke && currentHex) {
      if (checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
          return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Emergency Dig', memory: mem };
      }
      if (!bot.recoveredCurrentHex) {
          return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Emergency Rec', memory: mem };
      }
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};
