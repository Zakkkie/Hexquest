
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findBestBuildTargets, findBestDigTargets } from './planning';
import { GAME_CONFIG } from '../rules/config';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

const HIVE_RADIUS = 30; 
const STUCK_THRESHOLD = 2; // Reduced threshold to react faster to jams

// Helper moved to top to avoid ReferenceError/Hoisting issues
const distToBot = (bot: Entity, hex: Hex) => cubeDistance(bot, hex);

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
  // Filter self from obstacles for pathfinding logic
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
  
  if (!mem.mode) mem.mode = 'GATHER';

  // 0. SURVIVAL CHECK: RECOVER IF EMPTY
  if (bot.moves <= 0 && bot.coins < GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE && !bot.recoveredCurrentHex) {
      if (currentHex && currentHex.structureType !== 'VOID') {
          return { 
              action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'RECOVER', stateVersion }, 
              debug: 'Survival Rec', 
              memory: mem 
          };
      }
  }

  // 2. CHECK FOR VISIBLE MONUMENT
  const monument = Object.values(grid).find(h => h.structureType === 'MONUMENT');
  const isMonumentVisible = !!monument && monument.revealed;

  // 3. GLOBAL CLAIM LIST
  const claimedTargets = new Set<string>();
  if (allBots) {
      for (const other of allBots) {
          if (other.id === bot.id) continue;
          if (other.memory?.targetHexId) {
              claimedTargets.add(other.memory.targetHexId);
          }
      }
  }

  // Helper: Find a random valid neighbor to step aside to
  const getStepAsideMove = (reason: string): AiResult | null => {
      const nbs = getNeighbors(bot.q, bot.r);
      // Filter for valid, empty neighbors
      const validNbs = nbs.filter(n => {
          const k = getHexKey(n.q, n.r);
          const h = grid[k];
          if (!h || h.structureType === 'VOID') return false;
          // Don't step into a wall I can't climb
          if (h.maxLevel > bot.playerLevel) return false;
          // Don't step on someone else
          if (obstacles.some(o => o.q === n.q && o.r === n.r)) return false;
          return true;
      });

      if (validNbs.length > 0) {
          // Prefer stepping AWAY from the monument if possible to de-congest
          if (monument) {
              validNbs.sort((a, b) => {
                  // Higher distance is better
                  return cubeDistance(b, monument) - cubeDistance(a, monument);
              });
          }
          
          // Pick the best (furthest) one
          const target = validNbs[0];
          const cost = calculateMovementCost(bot, [target], grid);
          
          if (cost.canAfford) {
              return { 
                  action: { type: 'MOVE', path: [target], stateVersion }, 
                  debug: `Yield: ${reason}`, 
                  memory: { ...mem, stuckCounter: 0 } // Reset stuck counter as we are moving
              };
          }
      }
      return null;
  };

  // 4. PRIORITY OVERRIDE: MONUMENT STAIRCASE BUILDER (BFS)
  if (isMonumentVisible && monument) {
      const MONUMENT_ZONE_RADIUS = 3;
      
      // A. Material Check
      if (bot.storage < 1) {
          const restricted = new Set<string>();
          for(let q = -MONUMENT_ZONE_RADIUS; q <= MONUMENT_ZONE_RADIUS; q++) {
               for(let r = -MONUMENT_ZONE_RADIUS; r <= MONUMENT_ZONE_RADIUS; r++) {
                   restricted.add(getHexKey(monument.q + q, monument.r + r));
               }
           }
           if (mem.targetHexId) restricted.add(mem.targetHexId);
           return executeMinerLogic(bot, grid, index, navObstacles, stateVersion, mem, allBots || [], claimedTargets, monument, restricted);
      }

      // B. Staircase Target Search (BFS)
      let targetHex: Hex | null = null;
      let targetReason = "Zone Build";

      const openSet: Hex[] = [];
      const visited = new Set<string>();
      
      const ring1 = getNeighbors(monument.q, monument.r);
      for (const c of ring1) {
          const h = grid[getHexKey(c.q, c.r)];
          if (h && h.structureType !== 'VOID') openSet.push(h);
      }

      let steps = 0;
      const MAX_STEPS = 80;
      let pathChecks = 0;
      const MAX_PATH_CHECKS = 3; 

      while (openSet.length > 0 && steps < MAX_STEPS) {
          steps++;
          const current = openSet.shift()!;
          if (visited.has(current.id)) continue;
          visited.add(current.id);

          // Skip if claimed by other
          if (claimedTargets.has(current.id)) continue;
          
          // Skip if physically occupied by another bot (UNLESS it's me standing on it)
          const isOccupiedByOther = navObstacles.some(o => o.q === current.q && o.r === current.r);
          if (isOccupiedByOther) continue;

          const dist = cubeDistance(monument, current);
          const idealLevel = Math.max(0, monument.maxLevel - dist);
          
          if (current.currentLevel < idealLevel) {
              const growthCheck = checkGrowthCondition(current, bot, getNeighbors(current.q, current.r), grid, navObstacles);
              
              if (growthCheck.canGrow) {
                  // Reachability Check
                  let isReachable = false;
                  // RENAMED LOCAL VARIABLE TO AVOID SHADOWING FUNCTION
                  const dToTarget = cubeDistance(bot, current);
                  
                  if (dToTarget <= 1) {
                      isReachable = true;
                  } else if (pathChecks < MAX_PATH_CHECKS) {
                      pathChecks++;
                      const path = findPath({q:bot.q, r:bot.r}, {q:current.q, r:current.r}, grid, bot.playerLevel, navObstacles);
                      if (path && path.length > 0) isReachable = true;
                  }

                  if (isReachable) {
                      targetHex = current;
                      targetReason = "L" + (current.currentLevel + 1);
                      break;
                  }
              } else {
                  // BLOCKED BY SUPPORT?
                  // If I am standing on this hex, and it needs support, I should NOT target this hex.
                  // I should target the SUPPORT instead.
                  if (distToBot(bot, current) === 0 && growthCheck.missingSupports && growthCheck.missingSupports.length > 0) {
                      // Prioritize the missing supports!
                      // Add them to the FRONT of the queue to handle immediately
                      for (const missing of growthCheck.missingSupports) {
                          const mHex = grid[getHexKey(missing.q, missing.r)];
                          if (mHex && !visited.has(mHex.id)) {
                              openSet.unshift(mHex); // High priority push
                          }
                      }
                      continue; // Skip the current blocked hex
                  }

                  // Standard expansion
                  const nbs = getNeighbors(current.q, current.r);
                  for (const n of nbs) {
                      const nHex = grid[getHexKey(n.q, n.r)];
                      if (nHex && nHex.structureType !== 'VOID') {
                          if (cubeDistance(nHex, monument) >= dist) {
                              openSet.push(nHex);
                          }
                      }
                  }
              }
          }
      }

      if (targetHex) {
          const result = moveToAndInteract(bot, targetHex, 'UPGRADE', grid, navObstacles, stateVersion, mem, targetReason);
          
          // ANTI-STASIS: If result is WAIT, it means we are stuck (either No Path or Blocked Condition)
          // In a crowded area, WAIT is death. We must YIELD.
          if (result.action?.type === 'WAIT') {
              const yieldMove = getStepAsideMove(result.debug);
              if (yieldMove) return yieldMove;
          }
          
          return result;
      }
      
      // Summit Check
      if (cubeDistance(bot, monument) <= 1 && currentHex && currentHex.maxLevel >= monument.maxLevel - 1) {
           return moveToAndInteract(bot, monument, 'UPGRADE', grid, navObstacles, stateVersion, mem, 'Summit Push');
      }
      
      // Fallback: Mine/Yield
      const yieldMove = getStepAsideMove("Idle");
      if (yieldMove) return yieldMove;

      // Mine if nothing else
      const restricted = new Set<string>();
      for(let q=-MONUMENT_ZONE_RADIUS; q<=MONUMENT_ZONE_RADIUS; q++) {
           for(let r=-MONUMENT_ZONE_RADIUS; r<=MONUMENT_ZONE_RADIUS; r++) {
               restricted.add(getHexKey(monument.q+q, monument.r+r));
           }
      }
      return executeMinerLogic(bot, grid, index, navObstacles, stateVersion, mem, allBots || [], claimedTargets, monument, restricted);
  }

  // 5. STANDARD LOGIC
  if (!isMonumentVisible) {
      const maxStorage = bot.maxStorage ?? 4;
      if (mem.mode === 'GATHER' && bot.storage >= maxStorage) {
          mem.mode = 'BUILD';
          mem.targetHexId = null;
      } else if (mem.mode !== 'GATHER' && bot.storage <= 0) {
          mem.mode = 'GATHER';
          mem.targetHexId = null;
      }
  }

  if (mem.stuckCounter >= STUCK_THRESHOLD) {
      mem.targetHexId = null; 
      
      // PARACHUTE LOGIC: If we are stuck, check verticality.
      // If we are on a tower (>1) and stuck, DIG DOWN immediately.
      if (currentHex && currentHex.maxLevel >= 2) {
          const check = checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid);
          if (check.canGrow) {
              return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Parachute Down', memory: { ...mem, stuckCounter: 0 } };
          }
      }
      // If we are in a hole (<0) and stuck, BUILD UP immediately (if mats > 0).
      if (currentHex && currentHex.maxLevel < 0 && bot.storage > 0) {
          const check = checkGrowthCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid, obstacles);
          if (check.canGrow) {
              return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Ladder Up', memory: { ...mem, stuckCounter: 0 } };
          }
      }

      // Panic/Unstuck
      if (bot.moves === 0 && bot.coins < 5 && !bot.recoveredCurrentHex && currentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Panic Rec', memory: { ...mem, stuckCounter: 0 } };
      }
      
      const yieldMove = getStepAsideMove("Stuck");
      if (yieldMove) return yieldMove;
      
      // FALLBACK: Signal for Help implicitly by keeping stuckCounter high
      return { action: { type: 'WAIT', stateVersion }, debug: 'Trapped (SOS)', memory: { ...mem, stuckCounter: mem.stuckCounter + 1 } };
  }

  // 8. EXECUTION
  if (mem.mode === 'BUILD') {
      return executeBuilderLogic(bot, grid, index, navObstacles, stateVersion, mem, allBots || [], claimedTargets);
  } else {
      return executeMinerLogic(bot, grid, index, navObstacles, stateVersion, mem, allBots || [], claimedTargets);
  }
};

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

    if (mem.targetHexId) {
        bestTarget = grid[mem.targetHexId] || null;
    }

    if (!bestTarget) {
        // findBestBuildTargets now includes "Rescue Missions" logic inside planning.ts
        const targets = findBestBuildTargets(bot, grid, allBots, 15);
        for (const t of targets) {
            if (claimedTargets.has(t.hex.id)) continue; 
            if (cubeDistance(bot, t.hex) > HIVE_RADIUS) continue;
            bestTarget = t.hex;
            break;
        }
        if (bestTarget) mem.targetHexId = bestTarget.id;
    }

    if (bestTarget) {
        const result = moveToAndInteract(bot, bestTarget, 'UPGRADE', grid, obstacles, stateVersion, mem, 'Build Move');
        // If we failed to move to a build target, clear it to force re-evaluation next tick
        if (result.action?.type === 'WAIT' && result.debug.includes('No Path')) {
            mem.targetHexId = null;
        }
        return result;
    }

    return { action: { type: 'WAIT', stateVersion }, debug: 'Idle Build', memory: mem };
};

const executeMinerLogic = (
    bot: Entity,
    grid: Record<string, Hex>,
    index: WorldIndex,
    obstacles: HexCoord[],
    stateVersion: number,
    mem: BotMemory,
    allBots: Entity[],
    claimedTargets: Set<string>,
    proximityTarget?: Hex,
    restrictedHexIds?: Set<string>
): AiResult => {

    let bestTarget: Hex | null = null;

    // Rescue Logic Injection for Miners too: If we have materials, prioritize saving a friend
    if (bot.storage > 0) {
        const buildTargets = findBestBuildTargets(bot, grid, allBots, 1);
        if (buildTargets.length > 0 && buildTargets[0].reason.startsWith('RESCUE')) {
             // Switch mode to Build to execute the rescue
             return executeBuilderLogic(bot, grid, index, obstacles, stateVersion, { ...mem, mode: 'BUILD', targetHexId: null }, allBots, claimedTargets);
        }
    }

    if (mem.targetHexId) {
        bestTarget = grid[mem.targetHexId] || null;
    }

    if (!bestTarget) {
        const targets = findBestDigTargets(bot, grid, allBots, 10, restrictedHexIds);
        
        if (proximityTarget) {
            targets.sort((a, b) => cubeDistance(a.hex, proximityTarget) - cubeDistance(b.hex, proximityTarget));
        }

        for (const t of targets) {
            if (claimedTargets.has(t.hex.id)) continue;
            if (!proximityTarget && cubeDistance(bot, t.hex) > HIVE_RADIUS) continue;
            bestTarget = t.hex;
            break;
        }
        if (bestTarget) mem.targetHexId = bestTarget.id;
    }

    if (bestTarget) {
        const result = moveToAndInteract(bot, bestTarget, 'DIG', grid, obstacles, stateVersion, mem, 'Mine Move');
        // If we are blocked, clear the target to force the system to find the Blocker/Dependency next tick
        if (result.action?.type === 'WAIT') {
            mem.targetHexId = null;
        }
        return result;
    }

    const currentHex = grid[getHexKey(bot.q, bot.r)];
    if (!bot.recoveredCurrentHex && currentHex) {
        return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Idle Rec', memory: mem };
    }

    return { action: { type: 'WAIT', stateVersion }, debug: 'Idle Mine', memory: mem };
};

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
            if (check.canGrow) success = true; else failReason = check.reason || "";
        } else {
            const check = checkDigCondition(target, bot, nbs, grid);
            if (check.canGrow) success = true; else failReason = check.reason || "";
        }
        
        if (success) {
            const action: BotAction = actionType === 'UPGRADE'
                ? { type: 'UPGRADE', coord: {q:target.q, r:target.r}, intent: 'UPGRADE', stateVersion }
                : { type: 'DIG', coord: {q:target.q, r:target.r}, stateVersion };

            return { 
                action, 
                debug: 'Interact', 
                memory: { ...mem, stuckCounter: 0 } 
            };
        }
        
        if (!bot.recoveredCurrentHex) {
             return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Wait&Rec', memory: mem };
        }
        
        // Critical: If blocked, return WAIT so the caller can trigger Yield Logic
        return { action: { type: 'WAIT', stateVersion }, debug: `Blocked: ${failReason}`, memory: { ...mem, targetHexId: null, stuckCounter: mem.stuckCounter + 1 } };
    }

    // B. MOVE TO TARGET
    const path = findPath({q:bot.q, r:bot.r}, {q:target.q, r:target.r}, grid, bot.playerLevel, obstacles);
    
    if (path && path.length > 0) {
        const cost = calculateMovementCost(bot, [path[0]], grid);
        if (cost.canAfford) {
             return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: debugPrefix, memory: { ...mem, stuckCounter: 0 } };
        } else {
            if (!bot.recoveredCurrentHex) {
                return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Fund Recover', memory: mem };
            }
            return { action: { type: 'WAIT', stateVersion }, debug: 'Broke', memory: { ...mem, stuckCounter: mem.stuckCounter + 1 } };
        }
    }

    // --- MOUNTAINEER LOGIC START ---
    // If no path is found, check if it's because the target is too high (Distance 1 but unreachable)
    // AND if we have materials to "build a step" (upgrade current hex).
    if (dist === 1 && bot.storage > 0) {
        const currentHexKey = getHexKey(bot.q, bot.r);
        const currentHex = grid[currentHexKey];
        if (currentHex && target.maxLevel > currentHex.maxLevel + 1) {
            // Target is too high. Check if we can build UP our current position.
            const nbs = getNeighbors(bot.q, bot.r);
            const check = checkGrowthCondition(currentHex, bot, nbs, grid, obstacles);
            if (check.canGrow) {
                return { 
                    action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, 
                    debug: 'Mountaineer Step', 
                    memory: { ...mem, stuckCounter: 0 } 
                };
            }
        }
    }
    // --- MOUNTAINEER LOGIC END ---

    // Critical: If No Path, return WAIT so caller can trigger Yield Logic
    return { action: { type: 'WAIT', stateVersion }, debug: 'No Path', memory: { ...mem, targetHexId: null, stuckCounter: mem.stuckCounter + 1 } };
};
