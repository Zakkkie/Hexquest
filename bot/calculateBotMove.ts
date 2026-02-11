
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findBestBuildTargets, findBestDigTargets, scoreHexForDigging, scoreHexForBuilding } from './planning';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

const HIVE_RADIUS = 15; 
const STUCK_THRESHOLD = 3;

/**
 * AI V90: "Hive Architect V3 - Locked & Loaded"
 * Adds Target Locking (Persistence) and Collision Avoidance for targets.
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
  reservedHexKeys?: Set<string>,
  allBots?: Entity[]
): AiResult => {
  
  if (!bot) return { action: null, debug: 'ERR', memory: { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 } };

  const currentHexKey = getHexKey(bot.q, bot.r);
  const currentHex = grid[currentHexKey];
  const navObstacles = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r); // Exclude self from obstacles
  
  if (reservedHexKeys) {
      reservedHexKeys.forEach(k => {
          const [q, r] = k.split(',').map(Number);
          navObstacles.push({ q, r });
      });
  }

  // 1. MEMORY INIT
  const mem: BotMemory = bot.memory ? { ...bot.memory } : { 
    lastPlayerPos: null, currentGoal: null, stuckCounter: 0, mode: 'GATHER', 
    projectFailCount: 0, botRole: 'BUILDER'
  };

  // 2. BUILD GLOBAL CLAIM LIST (Coordination)
  // Identify targets claimed by OTHER bots to avoid swarming
  const claimedTargets = new Set<string>();
  if (allBots) {
      for (const other of allBots) {
          if (other.id === bot.id) continue;
          if (other.memory?.targetHexId) {
              claimedTargets.add(other.memory.targetHexId);
          }
      }
  }

  // 3. FLUID ROLE ASSIGNMENT WITH HYSTERESIS
  const maxStorage = bot.maxStorage ?? 4;
  
  // Switch logic
  if (mem.mode === 'GATHER') {
      if (bot.storage >= maxStorage) {
          mem.mode = 'BUILD';
          mem.targetHexId = null; // Reset target on mode switch
      }
  } else {
      if (bot.storage <= 0) {
          mem.mode = 'GATHER';
          mem.targetHexId = null; // Reset target on mode switch
      }
  }
  // Safety override
  if (bot.storage >= maxStorage) mem.mode = 'BUILD';
  if (bot.storage === 0) mem.mode = 'GATHER';

  // 4. TARGET VALIDATION (Sticky Logic)
  // If we have a locked target, check if it's still valid.
  if (mem.targetHexId) {
      const targetHex = grid[mem.targetHexId];
      let isValid = true;

      // Does it exist? Is it void?
      if (!targetHex || targetHex.structureType === 'VOID') isValid = false;
      
      // Is it still useful for current mode?
      if (isValid) {
          if (mem.mode === 'BUILD') {
              // If trying to build, but it's already maxed or unsafe?
              // Actually, we trust the pathing to handle minor changes, but if it became VOID or blocked by someone else permanently...
              // Check if another bot claimed it (race condition)? No, we claimed it first presumably.
          } else {
              // If GATHER, check if it's still diggable?
              if (targetHex.currentLevel <= -9) isValid = false; // Too deep
          }
      }

      // If invalid, clear it
      if (!isValid) {
          mem.targetHexId = null;
      }
  }

  // 5. PANIC / STUCK HANDLING
  if (mem.stuckCounter >= STUCK_THRESHOLD) {
      // Clear target on panic
      mem.targetHexId = null;

      // A. Broke? Recover.
      if (bot.moves === 0 && bot.coins < 5 && !bot.recoveredCurrentHex && currentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Panic Rec', memory: { ...mem, stuckCounter: 0 } };
      }
      
      // B. Try random move
      const nbs = getNeighbors(bot.q, bot.r);
      const validNbs = nbs.filter(n => {
          const h = grid[getHexKey(n.q, n.r)];
          if (!h || h.structureType === 'VOID') return false;
          if (Math.abs(h.currentLevel - (currentHex?.currentLevel || 0)) > 1) return false; 
          if (h.maxLevel > bot.playerLevel) return false; 
          if (navObstacles.some(o => o.q === n.q && o.r === n.r)) return false; 
          return true;
      });
      
      if (validNbs.length > 0) {
          const rand = validNbs[Math.floor(Math.random() * validNbs.length)];
          if (calculateMovementCost(bot, [rand], grid).canAfford) {
              return { action: { type: 'MOVE', path: [rand], stateVersion }, debug: 'Panic Move', memory: { ...mem, stuckCounter: 0 } };
          }
      }
      
      // C. Last Resort
      if (currentHex) {
          if (mem.mode === 'GATHER' && bot.storage < maxStorage && checkDigCondition(currentHex, bot, nbs, grid).canGrow) {
               return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: { ...mem, stuckCounter: 0 } };
          }
          if (mem.mode === 'BUILD' && bot.storage > 0 && checkGrowthCondition(currentHex, bot, nbs, grid).canGrow) {
               return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Panic Build', memory: { ...mem, stuckCounter: 0 } };
          }
      }
      
      return { action: { type: 'WAIT', stateVersion }, debug: 'Trapped', memory: { ...mem, stuckCounter: mem.stuckCounter + 1 } };
  }

  // 6. EXECUTION
  if (mem.mode === 'BUILD') {
      return executeBuilderLogic(bot, grid, index, navObstacles, stateVersion, mem, allBots || [], claimedTargets);
  } else {
      return executeMinerLogic(bot, grid, index, navObstacles, stateVersion, mem, allBots || [], claimedTargets);
  }
};

// ========================================================
// LOGIC: BUILDER
// ========================================================
const executeBuilderLogic = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    obstacles: HexCoord[],
    stateVersion: number,
    mem: BotMemory,
    allBots: Entity[],
    claimedTargets: Set<string>
): AiResult => {
    
    let bestTarget: Hex | null = null;

    // 1. Check Locked Target
    if (mem.targetHexId) {
        bestTarget = grid[mem.targetHexId] || null;
    }

    // 2. If no target, Scan
    if (!bestTarget) {
        const targets = findBestBuildTargets(bot, grid, allBots, 15);
        // Filter out claimed targets
        for (const t of targets) {
            if (claimedTargets.has(t.hex.id)) continue; 
            if (cubeDistance(bot, t.hex) > HIVE_RADIUS) continue;
            bestTarget = t.hex;
            break;
        }
        
        // Save to memory
        if (bestTarget) {
            mem.targetHexId = bestTarget.id;
        }
    }

    if (bestTarget) {
        return moveToAndInteract(bot, bestTarget, 'UPGRADE', grid, obstacles, stateVersion, mem, 'Build Move');
    }

    // No valid targets?
    return { action: { type: 'WAIT', stateVersion }, debug: 'Idle Build', memory: mem };
};

// ========================================================
// LOGIC: MINER
// ========================================================
const executeMinerLogic = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    obstacles: HexCoord[],
    stateVersion: number,
    mem: BotMemory,
    allBots: Entity[],
    claimedTargets: Set<string>
): AiResult => {

    let bestTarget: Hex | null = null;

    // 1. Check Locked Target
    if (mem.targetHexId) {
        bestTarget = grid[mem.targetHexId] || null;
    }

    // 2. If no target, Scan
    if (!bestTarget) {
        const targets = findBestDigTargets(bot, grid, allBots, 10);
        for (const t of targets) {
            if (claimedTargets.has(t.hex.id)) continue;
            if (cubeDistance(bot, t.hex) > HIVE_RADIUS) continue;
            bestTarget = t.hex;
            break;
        }

        // Save
        if (bestTarget) {
            mem.targetHexId = bestTarget.id;
        }
    }

    if (bestTarget) {
        return moveToAndInteract(bot, bestTarget, 'DIG', grid, obstacles, stateVersion, mem, 'Mine Move');
    }

    // No good dig spots? Recover funds locally if possible
    const currentHex = grid[getHexKey(bot.q, bot.r)];
    if (!bot.recoveredCurrentHex && currentHex) {
        return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Idle Rec', memory: mem };
    }

    return { action: { type: 'WAIT', stateVersion }, debug: 'Idle Mine', memory: mem };
};

// ========================================================
// HELPER: Move & Interact
// ========================================================
const moveToAndInteract = (
    bot: Entity,
    target: Hex,
    actionType: 'UPGRADE' | 'DIG',
    grid: Record<string, Hex>,
    obstacles: HexCoord[],
    stateVersion: number,
    mem: BotMemory,
    debugPrefix: string
): AiResult => {
    
    const dist = cubeDistance(bot, target);
    
    // A. ON TARGET
    if (dist === 0) {
        const nbs = getNeighbors(bot.q, bot.r);
        
        let success = false;
        if (actionType === 'UPGRADE') {
            const check = checkGrowthCondition(target, bot, nbs, grid, obstacles);
            if (check.canGrow) success = true;
        } else {
            const check = checkDigCondition(target, bot, nbs, grid);
            if (check.canGrow) success = true;
        }
        
        if (success) {
            // Keep target ID in memory until action completes (engine handles logic, but AI stays focused)
            // NOTE: If we run out of storage (Dig) or material (Build), the MODE switch at top of next tick clears target.
            
            return { 
                action: { type: actionType, coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, // intent is generic
                debug: 'Arrived Act', 
                memory: { ...mem, stuckCounter: 0 } 
            };
        }
        
        // Stuck on target?
        if (!bot.recoveredCurrentHex) {
             return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Wait&Rec', memory: mem };
        }
        
        // If we are on target but can't act, the target is invalid. Drop it.
        return { action: { type: 'WAIT', stateVersion }, debug: 'Blocked On Target', memory: { ...mem, targetHexId: null, stuckCounter: mem.stuckCounter + 1 } };
    }

    // B. MOVE TO TARGET
    const path = findPath({q:bot.q, r:bot.r}, {q:target.q, r:target.r}, grid, bot.playerLevel, obstacles);
    
    if (path && path.length > 0) {
        // Cost Check
        const cost = calculateMovementCost(bot, [path[0]], grid);
        if (cost.canAfford) {
             return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: debugPrefix, memory: { ...mem, stuckCounter: 0 } };
        } else {
            // Need funds
            if (!bot.recoveredCurrentHex) {
                return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Fund Recover', memory: mem };
            }
            return { action: { type: 'WAIT', stateVersion }, debug: 'Broke', memory: { ...mem, stuckCounter: mem.stuckCounter + 1 } };
        }
    }

    // Path blocked or invalid -> Clear target so we pick a new one next time
    return { action: { type: 'WAIT', stateVersion }, debug: 'No Path', memory: { ...mem, targetHexId: null, stuckCounter: mem.stuckCounter + 1 } };
};
