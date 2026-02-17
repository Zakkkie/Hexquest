
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findStrategicBuildTarget, findBestDigTargets } from './planning';
import { GAME_CONFIG } from '../rules/config';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

const HIVE_RADIUS = 30; 
const STUCK_THRESHOLD = 3; 

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
  const navObstacles = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r);
  
  if (reservedHexKeys) {
      reservedHexKeys.forEach(k => {
          const [q, r] = k.split(',').map(Number);
          navObstacles.push({ q, r });
      });
  }

  // 1. MEMORY INIT
  const mem: BotMemory = {
      lastPlayerPos: null,
      currentGoal: null,
      stuckCounter: 0,
      mode: 'GATHER',
      projectFailCount: 0,
      botRole: 'BUILDER',
      ...(bot.memory || {})
  };
  
  // 2. SURVIVAL CHECK: RECOVER IF EMPTY
  // Panic recovery if stranded
  if (bot.moves <= 0 && bot.coins < GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE && !bot.recoveredCurrentHex) {
      if (currentHex && currentHex.structureType !== 'VOID') {
          return { 
              action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, 
              debug: 'Survival Rec', 
              memory: mem 
          };
      }
  }

  // 3. MONUMENT OVERRIDE (Specific Scenario Logic)
  // If monument is visible, we default to the specific "Staircase" logic for it.
  const monument = Object.values(grid).find(h => h.structureType === 'MONUMENT');
  if (monument && monument.revealed) {
      // Use the specialized logic if close to monument
      // For now, we route this through the standard "Tower Builder" but prioritizing the Monument hex
      // This unifies the logic.
  }

  // 4. HYSTERESIS MODE SWITCHING
  // Don't switch tasks constantly. 
  // GATHER until FULL. BUILD until EMPTY.
  const maxStorage = bot.maxStorage || 4;
  
  if (mem.mode === 'GATHER') {
      // Keep gathering until at least 80% full
      if (bot.storage >= maxStorage - 1) {
          mem.mode = 'BUILD';
          mem.targetHexId = null; // Clear target on switch
      }
  } else {
      // BUILD mode
      // Keep building until empty
      if (bot.storage <= 0) {
          mem.mode = 'GATHER';
          mem.targetHexId = null; // Clear target on switch
      }
  }

  // 5. UNSTUCK LOGIC
  if (mem.stuckCounter >= STUCK_THRESHOLD) {
      mem.targetHexId = null;
      // Try to move randomly to a valid neighbor
      const neighbors = getNeighbors(bot.q, bot.r);
      const valid = neighbors.filter(n => {
          const h = grid[getHexKey(n.q, n.r)];
          if (!h || h.structureType === 'VOID' || h.maxLevel > bot.playerLevel) return false;
          // Physics check: Height diff <= 1
          if (Math.abs(h.maxLevel - (currentHex?.maxLevel || 0)) > 1) return false;
          // Obstacle check
          if (obstacles.some(o => o.q === n.q && o.r === n.r)) return false;
          return true;
      });

      if (valid.length > 0) {
          const rand = valid[Math.floor(Math.random() * valid.length)];
          const cost = calculateMovementCost(bot, [rand], grid);
          if (cost.canAfford) {
              return { 
                  action: { type: 'MOVE', path: [rand], stateVersion }, 
                  debug: 'Unstuck Move', 
                  memory: { ...mem, stuckCounter: 0 } 
              };
          }
      }
      
      // If truly stuck, wait (and recover)
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Unstuck Rec', memory: mem };
      }
      return { action: { type: 'WAIT', stateVersion }, debug: 'Stuck Wait', memory: { ...mem, stuckCounter: 0 } }; // Reset to try again
  }

  // 6. EXECUTE MODE
  if (mem.mode === 'BUILD') {
      return executeTowerBuilder(bot, grid, index, navObstacles, stateVersion, mem, allBots || []);
  } else {
      return executeMinerLogic(bot, grid, index, navObstacles, stateVersion, mem, allBots || []);
  }
};

/**
 * ARCHITECT STRATEGY:
 * Find the highest "Crown" (owned or neutral).
 * If upgradeable -> Go there and upgrade.
 * If needs support -> Go to the best support spot and upgrade that.
 */
const executeTowerBuilder = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    obstacles: HexCoord[],
    stateVersion: number,
    mem: BotMemory,
    allBots: Entity[]
): AiResult => {
    
    // 1. Find Target
    const targetInfo = findStrategicBuildTarget(bot, grid, allBots, obstacles);
    
    if (!targetInfo) {
        // No valid targets? Panic switch to gather or explore
        return { action: { type: 'WAIT', stateVersion }, debug: 'No Build Tgt', memory: mem };
    }

    const targetHex = targetInfo.hex;
    mem.targetHexId = targetHex.id;

    // 2. Move & Interact
    return moveToAndInteract(bot, targetHex, 'UPGRADE', grid, obstacles, stateVersion, mem, targetInfo.reason);
};

const executeMinerLogic = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    obstacles: HexCoord[],
    stateVersion: number,
    mem: BotMemory,
    allBots: Entity[]
): AiResult => {

    // 1. Find best digging spot (Quarry)
    let bestTarget: Hex | null = null;

    // Check if current target is still valid/good
    if (mem.targetHexId) {
        const t = grid[mem.targetHexId];
        if (t && t.structureType !== 'VOID' && t.currentLevel <= 0) {
            bestTarget = t;
        }
    }

    if (!bestTarget) {
        const targets = findBestDigTargets(bot, grid, allBots, 5);
        if (targets.length > 0) {
            bestTarget = targets[0].hex;
            mem.targetHexId = bestTarget.id;
        }
    }

    if (bestTarget) {
        return moveToAndInteract(bot, bestTarget, 'DIG', grid, obstacles, stateVersion, mem, 'Mine Move');
    }

    // Idle behavior if no mining spots (rare)
    const currentHex = grid[getHexKey(bot.q, bot.r)];
    if (!bot.recoveredCurrentHex && currentHex) {
        return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Idle Rec', memory: mem };
    }

    return { action: { type: 'WAIT', stateVersion }, debug: 'Idle Mine', memory: mem };
};

// Generic Move-To-Interact Helper
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
        let failReason = "";

        if (actionType === 'UPGRADE') {
            const check = checkGrowthCondition(target, bot, nbs, grid, obstacles);
            if (check.canGrow) success = true; 
            else failReason = check.reason || "Blocked";
        } else {
            const check = checkDigCondition(target, bot, nbs, grid);
            if (check.canGrow) success = true; 
            else failReason = check.reason || "Blocked";
        }
        
        if (success) {
            return { 
                action: { type: actionType, coord: {q:target.q, r:target.r}, intent: actionType, stateVersion }, 
                debug: actionType, 
                memory: { ...mem, stuckCounter: 0 } 
            };
        }
        
        // If we are here but cannot act, we are effectively blocked/waiting
        // Try recovery while waiting
        if (!bot.recoveredCurrentHex) {
             return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Wait&Rec', memory: mem };
        }
        
        // Increment stuck counter to force a move-away next tick
        return { action: { type: 'WAIT', stateVersion }, debug: `Blocked: ${failReason}`, memory: { ...mem, stuckCounter: mem.stuckCounter + 1 } };
    }

    // B. MOVE TO TARGET
    const path = findPath({q:bot.q, r:bot.r}, {q:target.q, r:target.r}, grid, bot.playerLevel, obstacles);
    
    if (path && path.length > 0) {
        const cost = calculateMovementCost(bot, [path[0]], grid);
        if (cost.canAfford) {
             return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: debugPrefix, memory: { ...mem, stuckCounter: 0 } };
        } else {
            // Can't afford move
            if (!bot.recoveredCurrentHex) {
                return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Fund Recover', memory: mem };
            }
            return { action: { type: 'WAIT', stateVersion }, debug: 'Broke', memory: { ...mem, stuckCounter: mem.stuckCounter + 1 } };
        }
    }

    // No Path found
    return { action: { type: 'WAIT', stateVersion }, debug: 'No Path', memory: { ...mem, targetHexId: null, stuckCounter: mem.stuckCounter + 1 } };
};
