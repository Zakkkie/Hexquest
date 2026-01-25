
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
// Radius 15 is enough for tactics (~700 hexes). 
// Radius 50 allows bots to see across the map, causing them to run away.
const SCAN_RADIUS = 15; 
const CONTEXT_RADIUS = 15;

/**
 * AI V13: "The Architect" (Vertical Rush Focus) with Crash Fixes
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
  if (nextMemory.stuckCounter >= 3) {
      const neighbors = getNeighbors(bot.q, bot.r);
      
      const escapeRoutes = neighbors.filter(n => {
          const k = getHexKey(n.q, n.r);
          const h = grid[k];
          if (!h) return false;
          if (h.maxLevel > bot.playerLevel) return false;
          if (otherUnitObstacles.some(o => o.q === n.q && o.r === n.r)) return false;
          return true;
      });

      if (escapeRoutes.length > 0) {
          const attackMove = escapeRoutes.find(n => n.q === player.q && n.r === player.r);
          // Safety check for random selection
          const target = attackMove || escapeRoutes[Math.floor(Math.random() * escapeRoutes.length)];
          
          if (target) {
              const targetHex = grid[getHexKey(target.q, target.r)];
              const moveCost = (targetHex && targetHex.maxLevel >= 2) ? targetHex.maxLevel : 1;
              const maxPossibleMoves = bot.moves + Math.floor(bot.coins / GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE);

              if (maxPossibleMoves < moveCost) {
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
      }
      
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
       const curHex = grid[currentHexKey];
       if (curHex && curHex.ownerId === bot.id && !bot.recoveredCurrentHex) {
            return {
                action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion },
                debug: `Farming: ${reason}`,
                memory: { ...nextMemory, stuckCounter: 0 }
            };
       }

       const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
          .filter(h => h.ownerId === bot.id && (h.id !== currentHexKey || !bot.recoveredCurrentHex))
          .filter(h => !reservedHexKeys?.has(h.id));
       
       candidates.sort((a,b) => {
           if (b.maxLevel - a.maxLevel > 1) return b.maxLevel - a.maxLevel;
           return cubeDistance(bot, a) - cubeDistance(bot, b);
       });
       
       if (candidates.length === 0) {
           const desperates = index.getHexesInRange({q:bot.q, r:bot.r}, 5).filter(h => !h.ownerId);
           if (desperates.length > 0) {
               // Fallback Logic: Try to claim/move to neutral hex even if broke
               const target = desperates[0];
               if (target.id === currentHexKey) {
                   // We are standing on neutral ground, try to claim if we have funds
                   const config = getLevelConfig(1);
                   if (bot.coins >= config.cost) {
                        return { 
                            action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, 
                            debug: 'Desperate Claim', 
                            memory: { ...nextMemory, stuckCounter: 0 } 
                        };
                   }
               }
               
               const path = findPath({q:bot.q, r:bot.r}, {q:target.q, r:target.r}, grid, bot.playerLevel, otherUnitObstacles);
               if (path) return { action: { type: 'MOVE', path, stateVersion }, debug: 'Desperate Expand', memory: nextMemory };
           }

           return { 
               action: { type: 'WAIT', stateVersion }, 
               debug: 'Bankrupt (No Farms)', 
               memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 } 
           };
       }

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
               if (bot.coins >= tripCost.coins) {
                   return { 
                       action: { type: 'MOVE', path, stateVersion }, 
                       debug: `Go Farm (Need ${targetCost}c)`, 
                       memory: { ...nextMemory, stuckCounter: 0 } 
                   };
               }
           }
       }
       
       return { 
           action: { type: 'WAIT', stateVersion }, 
           debug: 'Trapped & Broke', 
           memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 } 
       };
  };

  // --- RECURSIVE GOAL SOLVER ---
  const resolveBottleneck = (targetHex: Hex, depth: number = 0): { hex: Hex, strategy: string } | null => {
      if (depth > 3) return null; 
      if (!targetHex) return null; // Safety check

      const targetLevel = targetHex.currentLevel + 1;

      // 1. CYCLE BLOCK?
      if (targetLevel > 1 && bot.recentUpgrades.length < queueSize && !bot.recentUpgrades.includes(targetHex.id)) {
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

      // 3. SUPPORT BLOCK?
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
                 .sort((a, b) => b.maxLevel - a.maxLevel);
              
              if (potentialSupports.length > 0 && potentialSupports[0]) {
                  return resolveBottleneck(potentialSupports[0], depth + 1);
              }
          }
      }

      return { hex: targetHex, strategy: 'UPGRADE' };
  };


  // --- MAIN DECISION LOGIC ---

  let apexHex: Hex | null = null;
  
  if (nextMemory.masterGoalId) {
      const saved = grid[nextMemory.masterGoalId];
      if (saved && saved.ownerId === bot.id && saved.maxLevel < 99) {
          apexHex = saved;
      }
  }

  if (!apexHex) {
      const myHexes = index.getHexesInRange({q:bot.q, r:bot.r}, 50)
          .filter(h => h.ownerId === bot.id && h.maxLevel < 99);
      
      myHexes.sort((a,b) => {
          if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
          return cubeDistance(bot, a) - cubeDistance(bot, b);
      });

      if (myHexes.length > 0) apexHex = myHexes[0];
  }

  if (!apexHex) {
       const expanses = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
          .filter(h => !h.ownerId && h.maxLevel === 0 && !reservedHexKeys?.has(h.id))
          .sort((a,b) => cubeDistance(bot, a) - cubeDistance(bot, b));

       if (expanses.length > 0) {
           const target = expanses[0];
           
           // Fix for Startup: If we are standing on the target (neutral hex), acquire it!
           if (target.id === currentHexKey) {
               const config = getLevelConfig(1);
               if (bot.coins >= config.cost) {
                   return { 
                        action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, 
                        debug: 'Init Claim', 
                        memory: { ...nextMemory, stuckCounter: 0 } 
                    };
               } else {
                   return { 
                       action: { type: 'WAIT', stateVersion }, 
                       debug: 'Broke at Start', 
                       memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 }
                   };
               }
           }

           const path = findPath({q:bot.q, r:bot.r}, {q:target.q, r:target.r}, grid, bot.playerLevel, otherUnitObstacles);
           if (path) {
               const cost = calculatePathCost(path);
               if (bot.coins >= cost.coins) {
                   return { action: { type: 'MOVE', path, stateVersion }, debug: 'Init Expansion', memory: nextMemory };
               }
           }
       }
  }

  if (apexHex) {
      const plan = resolveBottleneck(apexHex);
      
      if (plan) {
          const { hex: target, strategy } = plan;
          
          if (target.id === currentHexKey) {
              const nextLvl = target.currentLevel + 1;
              const config = getLevelConfig(nextLvl);
              
              if (bot.coins >= config.cost) {
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

  // 4. Fallback: Generic Scoring
  // This runs if "Master Plan" failed (e.g. recursion limit reached or too complex).
  const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, SCAN_RADIUS);
  const potentialGoals: { hex: Hex, score: number }[] = [];
  
  const ownedHexes = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS).filter(h => h.ownerId === bot.id);
  const isEarlyGame = ownedHexes.length < 5;

  for (const h of candidates) {
      if (h.maxLevel >= 99) continue;
      
      const isBlocked = otherUnitObstacles.some(o => o.q === h.q && o.r === h.r);
      if (isBlocked && h.id !== currentHexKey) continue;

      let score = 100;

      // RNG only for very early game to spread out
      if (isEarlyGame) {
          score += (Math.random() - 0.5) * 30;
      }
      
      const dist = cubeDistance(bot, h);
      
      // FIX: INCREASE DISTANCE PENALTY
      // Was 4. Now 10. This forces bots to act locally.
      // Dist 1 = -10. Dist 10 = -100.
      score -= dist * 10; 

      // FIX: REDUCE EXPANSION BONUS
      // Was 50. Now 25.
      // Expanding is good, but not if we have to walk 10 tiles for it.
      if (!h.ownerId) {
          score += 25;
          // Small bonus for expanding NEXT to our territory (Clustering)
          const nbs = getNeighbors(h.q, h.r);
          const hasFriend = nbs.some(n => grid[getHexKey(n.q, n.r)]?.ownerId === bot.id);
          if (hasFriend) score += 15;
      }
      
      // Bonus for upgrading existing terrain (Consolidation)
      if (h.ownerId === bot.id) {
          score += 10;
          // Prefer higher levels to keep momentum
          score += h.maxLevel * 5;
      }
      
      potentialGoals.push({ hex: h, score });
  }

  potentialGoals.sort((a,b) => b.score - a.score);

  for (let i = 0; i < Math.min(potentialGoals.length, 5); i++) {
      const target = potentialGoals[i].hex;
      if (target.id === currentHexKey) continue;

      const path = findPath({q:bot.q, r:bot.r}, {q:target.q, r:target.r}, grid, bot.playerLevel, otherUnitObstacles);
      if (path) {
          const cost = calculatePathCost(path);
          if (bot.coins >= cost.coins) {
               return { action: { type: 'MOVE', path, stateVersion }, debug: 'Wander', memory: nextMemory };
          }
      }
  }

  return { 
      action: { type: 'WAIT', stateVersion }, 
      debug: 'Idle', 
      memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 } 
  };
};
