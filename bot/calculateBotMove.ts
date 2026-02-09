
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { GAME_CONFIG, DIFFICULTY_SETTINGS } from '../rules/config';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findNextConstructionTarget, findNextExcavationTarget } from './planning';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

// CONFIG FOR DISPERSAL
const SETTLING_TIME_MS = 25000; // 25 seconds to run away
const MIN_DIST_FROM_CENTER = 12; // Must be far
const MIN_DIST_FROM_OTHERS = 8;  // Personal space radius
const MOVE_COST_COINS = 5;
const PROJECT_STUCK_LIMIT = 5;

/**
 * AI V51: "The Frontier"
 * - Forced Dispersal: Bots migrate 12+ hexes away before settling.
 * - Hive Mind Logic: Uses Recursive Planner for construction once settled.
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
  
  // Base obstacles (existing entities), excluding self
  const navObstacles = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r);

  // Add reserved hexes (destinations of other bots in this tick) to obstacles to prevent collisions
  if (reservedHexKeys) {
      reservedHexKeys.forEach(k => {
          const [q, r] = k.split(',').map(Number);
          navObstacles.push({ q, r });
      });
  }
  
  const now = Date.now();
  const mem: BotMemory = bot.memory ? { ...bot.memory } : { lastPlayerPos: null, currentGoal: null, stuckCounter: 0, mode: 'GATHER', projectFailCount: 0 };
  
  if (!mem.spawnTime) mem.spawnTime = now;
  const timeAlive = now - (mem.spawnTime || now);

  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 4;
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove;

  // --- 0. INITIALIZATION & DISPERSAL (The Frontier Logic) ---
  if (!mem.homeBase) {
      if (!mem.migrationAngle) {
          // Unique angle based on ID hash to spread 360 degrees
          const seed = bot.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
          mem.migrationAngle = ((seed % 8) * (Math.PI / 4)) + (Math.random() * 0.5);
      }
      
      const currentDist = cubeDistance(bot, {q:0, r:0});
      const occupied = index.getOccupiedHexesList();
      let nearestNeighborDist = 999;
      for (const o of occupied) {
          // Ensure we are checking against OTHER entities
          if (o.q !== bot.q || o.r !== bot.r) {
              const d = cubeDistance(bot, o);
              if (d < nearestNeighborDist) nearestNeighborDist = d;
          }
      }

      // SETTLE CONDITION:
      // 1. Far enough from center AND Far enough from others
      // 2. OR Timeout (panic settle)
      const isFarEnough = currentDist >= MIN_DIST_FROM_CENTER;
      const isAlone = nearestNeighborDist >= MIN_DIST_FROM_OTHERS;
      const isTimeout = timeAlive > SETTLING_TIME_MS;

      if ((isFarEnough && isAlone) || isTimeout) {
          // ESTABLISH BASE
          mem.homeBase = { q: bot.q, r: bot.r };
          mem.towerKey = getHexKey(bot.q, bot.r);
          // Quarry further out relative to migration direction
          const qQ = Math.round(bot.q + 6 * Math.cos(mem.migrationAngle));
          const qR = Math.round(bot.r + 6 * Math.sin(mem.migrationAngle));
          mem.quarryKey = getHexKey(qQ, qR); 
          mem.quarrySite = { q: qQ, r: qR };
          
          mem.mode = 'GATHER';
          return { action: { type: 'WAIT', stateVersion }, debug: 'Base Established', memory: mem };
      }
      
      // MOVEMENT LOGIC (MIGRATION)
      // Target point on horizon
      const tQ = Math.round(30 * Math.cos(mem.migrationAngle));
      const tR = Math.round(30 * Math.sin(mem.migrationAngle));
      
      // If Broke -> Dig/Recover locally to fund travel
      const canMove = bot.moves > 0 || bot.coins >= 5;
      if (!canMove && grid[getHexKey(bot.q, bot.r)]) {
           const neighbors = getNeighbors(bot.q, bot.r);
           // Dig for moves
           if (checkDigCondition(grid[getHexKey(bot.q, bot.r)], bot, neighbors, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Travel Dig', memory: mem };
           }
           // Recover
           if (!bot.recoveredCurrentHex) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Travel Rec', memory: mem };
           }
      }

      // Walk towards horizon
      const path = findPath({q:bot.q, r:bot.r}, {q:tQ, r:tR}, grid, bot.playerLevel, navObstacles);
      if (path && path.length > 0) {
          if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
              return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Migrating', memory: mem };
          }
      }
      
      // If path blocked/too expensive -> Blind Step (Scout into void)
      const neighbors = getNeighbors(bot.q, bot.r);
      let bestN = null; let minD = 999;
      for(const n of neighbors) {
          if (!index.isOccupied(n.q, n.r)) {
              const d = cubeDistance(n, {q:tQ, r:tR});
              if(d < minD) { minD = d; bestN = n; }
          }
      }
      if (bestN && calculateMovementCost(bot, [bestN], grid).canAfford) {
          return { action: { type: 'MOVE', path: [bestN], stateVersion }, debug: 'Scout', memory: mem };
      }

      return { action: { type: 'WAIT', stateVersion }, debug: 'Stuck Migrating', memory: mem };
  }

  // --- 1. SURVIVAL CHECK (Shared) ---
  if (isBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const isProject = currentHexKey === mem.towerKey;
      if (!isProject && checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: { ...mem, stuckCounter: 0 } };
      }
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: { ...mem, stuckCounter: 0 } };
      }
  }

  // --- 2. MODE SWITCHING ---
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
  }

  // --- 3. SCENARIO DISPATCH ---
  if (mem.mode === 'BUILD') {
      return executeBuilderScenario(bot, mem, grid, index, stateVersion, difficulty, navObstacles);
  } else {
      return executeMinerScenario(bot, mem, grid, index, stateVersion, navObstacles);
  }
};

// ==========================================
// SCENARIO 1: THE ARCHITECT (Builder)
// ==========================================
const executeBuilderScenario = (
    bot: Entity, 
    mem: BotMemory, 
    grid: Record<string, Hex>, 
    index: WorldIndex,
    stateVersion: number,
    difficulty: Difficulty,
    navObstacles: HexCoord[]
): AiResult => {
    
    // 1. Identify Ultimate Goal (The Peak)
    let masterTower = grid[mem.towerKey || ''];
    
    // If master tower is destroyed/void, pick a new spot nearby
    if (!masterTower || masterTower.structureType === 'VOID') {
        const candidates = index.getHexesInRange(mem.homeBase!, 3);
        masterTower = candidates.find(h => h.structureType !== 'VOID') || grid[getHexKey(bot.q, bot.r)];
        mem.towerKey = masterTower.id;
    }

    // 2. Use Recursive Planner to find the specific brick we need to lay right now
    const nextBrick = findNextConstructionTarget(masterTower, bot, grid, index, difficulty);
    const targetHex = nextBrick || masterTower; // Fallback to master if calculation fails

    // 3. Execution Logic
    const dist = cubeDistance(bot, targetHex);
    
    // A. At Target
    if (dist === 0) {
        const neighbors = getNeighbors(bot.q, bot.r);
        const occupied = index.getOccupiedHexesList();
        const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 2;
        
        // Try Build
        if (checkGrowthCondition(targetHex, bot, neighbors, grid, occupied, queueSize).canGrow) {
            return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Build', memory: { ...mem, stuckCounter: 0, projectFailCount: 0 } };
        } 
        
        // Stuck at target?
        mem.projectFailCount = (mem.projectFailCount || 0) + 1;
        if (mem.projectFailCount > PROJECT_STUCK_LIMIT) {
            // Shift project center randomly to unblock
            const neighbors = getNeighbors(bot.q, bot.r);
            const n = neighbors[Math.floor(Math.random()*neighbors.length)];
            if(n) mem.towerKey = getHexKey(n.q, n.r);
            return { action: { type: 'WAIT', stateVersion }, debug: 'Shift Plan', memory: { ...mem, projectFailCount: 0 } };
        }
    }

    // B. Move to Target
    return executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Commute');
};

// ==========================================
// SCENARIO 2: THE MINER (Gatherer)
// ==========================================
const executeMinerScenario = (
    bot: Entity, 
    mem: BotMemory, 
    grid: Record<string, Hex>, 
    index: WorldIndex,
    stateVersion: number,
    navObstacles: HexCoord[]
): AiResult => {

    // 1. Identify Quarry Center
    let quarry = grid[mem.quarryKey || ''];
    
    // If quarry voided or missing, stick to current site or find new
    if (!quarry) {
        if (mem.quarrySite) {
             const key = getHexKey(mem.quarrySite.q, mem.quarrySite.r);
             if (grid[key]) mem.quarryKey = key;
        }
        if (!mem.quarryKey) mem.quarryKey = getHexKey(bot.q, bot.r);
        quarry = grid[mem.quarryKey!];
    }

    // 2. Recursive Planner for Digging (Widen the pit if needed)
    const nextDigSpot = quarry ? findNextExcavationTarget(quarry, bot, grid, index) : null;
    const targetHex = nextDigSpot || quarry || grid[getHexKey(bot.q, bot.r)];

    // 3. Execution
    const dist = cubeDistance(bot, targetHex);

    // A. At Target
    if (dist === 0) {
        const neighbors = getNeighbors(bot.q, bot.r);
        if (checkDigCondition(targetHex, bot, neighbors, grid).canGrow) {
             return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mine', memory: { ...mem, stuckCounter: 0, projectFailCount: 0 } };
        }
        // Stuck?
        mem.projectFailCount = (mem.projectFailCount || 0) + 1;
        if (mem.projectFailCount > 3) {
             // Move quarry slightly
             const neighbors = getNeighbors(bot.q, bot.r);
             const n = neighbors[Math.floor(Math.random()*neighbors.length)];
             if(n) mem.quarryKey = getHexKey(n.q, n.r);
             return { action: { type: 'WAIT', stateVersion }, debug: 'Shift Mine', memory: { ...mem, projectFailCount: 0 } };
        }
    }

    // B. Move to Target
    return executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Go Mine');
};

// --- HELPER: Movement Logic ---
const executeMove = (
    bot: Entity, 
    target: HexCoord, 
    grid: Record<string, Hex>, 
    obstacles: HexCoord[], 
    stateVersion: number,
    mem: BotMemory,
    debugLabel: string
): AiResult => {
    
    const path = findPath({q:bot.q, r:bot.r}, target, grid, bot.playerLevel, obstacles);
    
    if (path && path.length > 0) {
        if (calculateMovementCost(bot, path, grid).canAfford) {
            return { action: { type: 'MOVE', path, stateVersion }, debug: debugLabel, memory: { ...mem, stuckCounter: 0 } };
        } else if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
            return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: { ...mem, stuckCounter: 0 } };
        }
    }

    // Fallback: Random Step if path blocked
    mem.stuckCounter++;
    if (mem.stuckCounter > 2) {
        const neighbors = getNeighbors(bot.q, bot.r);
        const valid = neighbors.filter(n => {
            const h = grid[getHexKey(n.q, n.r)];
            return h && h.structureType !== 'VOID' && !obstacles.some(o => o.q === n.q && o.r === n.r);
        });
        if (valid.length > 0) {
            const rnd = valid[Math.floor(Math.random() * valid.length)];
            if (calculateMovementCost(bot, [rnd], grid).canAfford) {
                return { action: { type: 'MOVE', path: [rnd], stateVersion }, debug: 'Unstuck', memory: { ...mem, stuckCounter: 0 } };
            }
        }
    }

    return { action: { type: 'WAIT', stateVersion }, debug: 'Blocked', memory: mem };
};
