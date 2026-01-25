import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { getLevelConfig, GAME_CONFIG, DIFFICULTY_SETTINGS } from '../rules/config';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

// PERFORMANCE CONFIGURATION
// Radius 25 = ~2000 hexes. Radius 12 = ~470 hexes.
// Reducing this drastically lowers CPU usage per bot tick.
const SCAN_RADIUS = 12; 
const CONTEXT_RADIUS = 15;

/**
 * AI V13: "The Architect" (Vertical Rush Focus)
 * 
 * Strategy:
 * 1. Find the "Apex Hex" (Highest level owned hex).
 * 2. If no Apex, Expand.
 * 3. If Apex exists:
 *    - Can upgrade? -> UPGRADE.
 *    - Blocked by Support? -> Target Neighbor to upgrade.
 *    - Blocked by Cycle? -> Expand to cheapest L0.
 *    - Blocked by Rank? -> Upgrade second best hex.
 *    - Blocked by Money? -> RECOVER (Farm).
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
  
  const currentHexKey = getHexKey(bot.q, bot.r);
  const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 3;
  const otherUnitObstacles = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r);
  
  // Clone memory
  const nextMemory: BotMemory = bot.memory ? { ...bot.memory } : {
      lastPlayerPos: null,
      currentGoal: null,
      masterGoalId: null,
      stuckCounter: 0
  };

  // === 0. PANIC MODE (Anti-Stuck) ===
  // If we have failed or waited 3 times in a row, force a move to break the loop.
  if (nextMemory.stuckCounter >= 3) {
      const neighbors = getNeighbors(bot.q, bot.r);
      
      // Find valid escape routes (exists, rank ok, not blocked)
      const escapeRoutes = neighbors.filter(n => {
          const k = getHexKey(n.q, n.r);
          const h = grid[k];
          if (!h) return false;
          if (h.maxLevel > bot.playerLevel) return false;
          if (otherUnitObstacles.some(o => o.q === n.q && o.r === n.r)) return false;
          return true;
      });

      if (escapeRoutes.length > 0) {
          // Priority: Attack Player if adjacent (Suicide Run)
          const attackMove = escapeRoutes.find(n => n.q === player.q && n.r === player.r);
          const target = attackMove || escapeRoutes[Math.floor(Math.random() * escapeRoutes.length)];
          
          // CRITICAL FIX: Affordability Check
          // Calculate cost before attempting move to avoid infinite error loops in Engine
          const targetHex = grid[getHexKey(target.q, target.r)];
          const moveCost = (targetHex && targetHex.maxLevel >= 2) ? targetHex.maxLevel : 1;
          const maxPossibleMoves = bot.moves + Math.floor(bot.coins / GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE);

          if (maxPossibleMoves < moveCost) {
             // We are trapped and broke. Just wait and reset counter to stop spamming.
             // Try to recover here as a last resort if owned
             return { 
                 action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, 
                 debug: 'PANIC: RECOVER', 
                 memory: { ...nextMemory, stuckCounter: 0 } 
             };
          }

          return {
              action: { type: 'MOVE', path: [target], stateVersion },
              debug: attackMove ? 'PANIC: ATTACK!' : 'PANIC: WANDER',
              memory: { ...nextMemory, stuckCounter: 0, masterGoalId: null }
          };
      }
      // If we are completely trapped and stuck, we just have to wait, but reset counter to avoid infinite processing overhead
      return { 
          action: { type: 'WAIT', stateVersion }, 
          debug: 'PANIC: TRAPPED', 
          memory: { ...nextMemory, stuckCounter: 0 } 
      };
  }

  // --- Helpers ---

  const calculatePathCost = (path: HexCoord[]) => {
      let moves = 0;
      for (const p of path) {
           const h = grid[getHexKey(p.q, p.r)];
           const cost = (h && h.maxLevel >= 2) ? h.maxLevel : 1;
           moves += cost;
      }
      const deficit = Math.max(0, moves - bot.moves);
      const coins = deficit * GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE;
      return { moves, coins };
  };

  const getFarmingAction = (targetCost: number, reason: string): AiResult => {
       // 1. If we are on an owned hex that needs recovery, do it.
       const curHex = grid[currentHexKey];
       if (curHex && curHex.ownerId === bot.id && !bot.recoveredCurrentHex) {
            return {
                action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion },
                debug: `Farming: ${reason}`,
                memory: { ...nextMemory, stuckCounter: 0 }
            };
       }

       // 2. Find nearest farmable hex
       const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
          .filter(h => h.ownerId === bot.id && (h.id !== currentHexKey || !bot.recoveredCurrentHex))
          .filter(h => !reservedHexKeys?.has(h.id));
       
       candidates.sort((a,b) => {
           // Prioritize closer, then higher level
           if (b.maxLevel - a.maxLevel > 1) return b.maxLevel - a.maxLevel;
           return cubeDistance(bot, a) - cubeDistance(bot, b);
       });
       
       // FAILURE CASE 1: No farms available
       if (candidates.length === 0) {
           // Desperation: Find nearest L0 to acquire and then recover? 
           const desperates = index.getHexesInRange({q:bot.q, r:bot.r}, 5).filter(h => !h.ownerId);
           if (desperates.length > 0) {
               const path = findPath({q:bot.q, r:bot.r}, {q:desperates[0].q, r:desperates[0].r}, grid, bot.playerLevel, otherUnitObstacles);
               if (path) return { action: { type: 'MOVE', path, stateVersion }, debug: 'Desperate Expand', memory: nextMemory };
           }

           return { 
               action: { type: 'WAIT', stateVersion }, 
               debug: 'Bankrupt (No Farms)', 
               memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 } 
           };
       }

       // 3. Try top candidates (Anti-block logic)
       // Iterate through top 3 candidates to find a reachable one.
       // This fixes "Tunnel Vision" where a bot would stare at a blocked best-candidate forever.
       for (const candidate of candidates.slice(0, 3)) {
           const path = findPath(
               {q:bot.q, r:bot.r}, 
               {q:candidate.q, r:candidate.r}, 
               grid, 
               bot.playerLevel, 
               otherUnitObstacles
           );
           
           if (path) {
               const tripCost = calculatePathCost(path);
               // We only move if we can afford it (roughly)
               // Even if we have to burn last coins to get there, it's worth it to recover
               if (bot.coins >= tripCost.coins) {
                   return { 
                       action: { type: 'MOVE', path, stateVersion }, 
                       debug: `Go Farm (Need ${targetCost}c)`, 
                       memory: { ...nextMemory, stuckCounter: 0 } 
                   };
               }
           }
       }
       
       // FAILURE CASE 2: No reachable farms or too poor
       return { 
           action: { type: 'WAIT', stateVersion }, 
           debug: 'Trapped & Broke', 
           memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 } 
       };
  };

  // --- RECURSIVE GOAL SOLVER ---
  // Returns: { target: Hex, actionType: 'UPGRADE' | 'CYCLE' | 'SUPPORT' }
  const resolveBottleneck = (targetHex: Hex, depth: number = 0): { hex: Hex, strategy: string } | null => {
      if (depth > 3) return null; 

      const targetLevel = targetHex.currentLevel + 1;

      // 1. CYCLE BLOCK? (Need momentum)
      if (targetLevel > 1 && bot.recentUpgrades.length < queueSize && !bot.recentUpgrades.includes(targetHex.id)) {
          // Find cheap L0 to grab
          const expanses = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
              .filter(h => h.maxLevel === 0 && !h.ownerId && !reservedHexKeys?.has(h.id))
              .sort((a,b) => cubeDistance(bot, a) - cubeDistance(bot, b));
          
          if (expanses.length > 0) return { hex: expanses[0], strategy: 'CYCLE_DUMP' };
          return null;
      }

      // 2. RANK BLOCK?
      if (bot.playerLevel < targetLevel - 1) {
          const trainees = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
             .filter(h => h.ownerId === bot.id && h.id !== targetHex.id && h.maxLevel <= bot.playerLevel && h.maxLevel < 99)
             .sort((a, b) => b.maxLevel - a.maxLevel);
          
          if (trainees.length > 0) return resolveBottleneck(trainees[0], depth + 1);
          return null; 
      }

      // 3. SUPPORT BLOCK? (Staircase Rule)
      // Check Valley Rule first
      const nbs = getNeighbors(targetHex.q, targetHex.r);
      const highNeighbors = nbs.filter(n => (grid[getHexKey(n.q, n.r)]?.maxLevel || 0) > targetHex.maxLevel).length;
      
      if (targetLevel > 1 && highNeighbors < 5) {
          const validSupports = nbs
             .map(n => grid[getHexKey(n.q, n.r)])
             .filter(h => h && h.maxLevel === targetHex.maxLevel);

          if (validSupports.length < 2) {
              const potentialSupports = nbs
                 .map(n => grid[getHexKey(n.q, n.r)])
                 .filter(h => h !== undefined)
                 .filter(h => h.maxLevel < targetHex.maxLevel)
                 .sort((a, b) => b.maxLevel - a.maxLevel); // Closest to target level first
              
              if (potentialSupports.length > 0) return resolveBottleneck(potentialSupports[0], depth + 1);
          }
      }

      return { hex: targetHex, strategy: 'UPGRADE' };
  };


  // --- MAIN DECISION LOGIC ---

  // 1. Try Existing Master Goal (Goal Stickiness)
  // If we have a valid goal, stick to it to prevent oscillation
  let apexHex: Hex | null = null;
  
  if (nextMemory.masterGoalId) {
      const saved = grid[nextMemory.masterGoalId];
      if (saved && saved.ownerId === bot.id && saved.maxLevel < 99) {
          apexHex = saved;
      }
  }

  // Find new Apex if needed
  if (!apexHex) {
      const myHexes = index.getHexesInRange({q:bot.q, r:bot.r}, 50)
          .filter(h => h.ownerId === bot.id && h.maxLevel < 99);
      
      myHexes.sort((a,b) => {
          if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
          return cubeDistance(bot, a) - cubeDistance(bot, b);
      });

      if (myHexes.length > 0) apexHex = myHexes[0];
  }

  // 2. No Land -> Expand
  if (!apexHex) {
       const expanses = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
          .filter(h => !h.ownerId && h.maxLevel === 0 && !reservedHexKeys?.has(h.id))
          .sort((a,b) => cubeDistance(bot, a) - cubeDistance(bot, b));

       if (expanses.length > 0) {
           const target = expanses[0];
           const path = findPath({q:bot.q, r:bot.r}, {q:target.q, r:target.r}, grid, bot.playerLevel, otherUnitObstacles);
           if (path) {
               const cost = calculatePathCost(path);
               if (bot.coins >= cost.coins) {
                   return { action: { type: 'MOVE', path, stateVersion }, debug: 'Init Expansion', memory: nextMemory };
               }
           }
       }
       // Fallback to random scan if stuck
  }

  // 3. Solve for Apex
  if (apexHex) {
      const plan = resolveBottleneck(apexHex);
      
      if (plan) {
          const { hex: target, strategy } = plan;
          
          // A. Are we there?
          if (target.id === currentHexKey) {
              const nextLvl = target.currentLevel + 1;
              const config = getLevelConfig(nextLvl);
              
              if (bot.coins >= config.cost) {
                   // Check rules final time
                   const occupied = index.getOccupiedHexesList();
                   const growCheck = checkGrowthCondition(target, bot, getNeighbors(bot.q, bot.r), grid, occupied, queueSize);
                   if (growCheck.canGrow) {
                       return { 
                           action: { type: 'UPGRADE', coord: { q: bot.q, r: bot.r }, intent: 'UPGRADE', stateVersion },
                           debug: `BUILD L${nextLvl}`,
                           memory: { ...nextMemory, masterGoalId: apexHex.id, stuckCounter: 0 }
                       };
                   } else {
                       return { action: { type: 'WAIT', stateVersion }, debug: `Wait: ${growCheck.reason}`, memory: nextMemory };
                   }
              } else {
                  return getFarmingAction(config.cost - bot.coins, `Need for L${nextLvl}`);
              }
          } 
          // B. Travel
          else {
              const path = findPath({q: bot.q, r: bot.r}, {q: target.q, r: target.r}, grid, bot.playerLevel, otherUnitObstacles);
              
              if (path) {
                  const trip = calculatePathCost(path);
                  if (bot.coins >= trip.coins) {
                      return { 
                          action: { type: 'MOVE', path, stateVersion },
                          debug: `Move > ${strategy}`,
                          memory: { ...nextMemory, masterGoalId: apexHex.id, stuckCounter: 0 }
                      };
                  } else {
                      // Inchworm strategy or farm
                      // If we can't afford trip, farm cost
                      return getFarmingAction(trip.coins - bot.coins, 'Travel Money');
                  }
              } else {
                  return { 
                      action: { type: 'WAIT', stateVersion }, 
                      debug: 'Path Blocked', 
                      memory: { ...nextMemory, masterGoalId: null, stuckCounter: nextMemory.stuckCounter + 1 } 
                  };
              }
          }
      }
  }

  // 4. Fallback: Generic Scoring (Expansion/Survival)
  // This runs if we have no Apex logic or logic failed completely.
  
  const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, SCAN_RADIUS);
  const potentialGoals: { hex: Hex, score: number }[] = [];
  
  const ownedHexes = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS).filter(h => h.ownerId === bot.id);
  const isEarlyGame = ownedHexes.length < 5;

  for (const h of candidates) {
      if (h.maxLevel >= 99) continue;
      
      const isBlocked = otherUnitObstacles.some(o => o.q === h.q && o.r === h.r);
      if (isBlocked && h.id !== currentHexKey) continue;

      let score = 100;

      // RNG for early game spread
      if (isEarlyGame) score += (Math.random() - 0.5) * 30;
      
      const dist = cubeDistance(bot, h);
      score -= dist * 4;

      // Simple heuristics
      if (!h.ownerId) score += 50; // Grab land
      
      potentialGoals.push({ hex: h, score });
  }

  potentialGoals.sort((a,b) => b.score - a.score);

  for (let i = 0; i < Math.min(potentialGoals.length, 5); i++) {
      const target = potentialGoals[i].hex;
      if (target.id === currentHexKey) continue; // Should be handled above

      const path = findPath({q:bot.q, r:bot.r}, {q:target.q, r:target.r}, grid, bot.playerLevel, otherUnitObstacles);
      if (path) {
          const cost = calculatePathCost(path);
          if (bot.coins >= cost.coins) {
               return { action: { type: 'MOVE', path, stateVersion }, debug: 'Wander', memory: nextMemory };
          }
      }
  }

  // 5. Absolute Failure
  return { 
      action: { type: 'WAIT', stateVersion }, 
      debug: 'Idle', 
      memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 } 
  };
};