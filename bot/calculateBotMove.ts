
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

const SCAN_RADIUS = 15; 
const CONTEXT_RADIUS = 15;

/**
 * AI V17: "The Nomad Architect" (Shared World Edition)
 * No ownership logic. Bots treat all hexes as public resources.
 * They seek the highest level hexes to upgrade or farm, respecting only physical collision.
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
  
  // CRITICAL SAFETY CHECK
  if (!bot) {
      return {
          action: null,
          debug: 'ERR_UNDEFINED_BOT',
          memory: { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 }
      };
  }

  const currentHexKey = getHexKey(bot.q, bot.r);
  const currentHex = grid[currentHexKey];
  const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 3;
  const otherUnitObstacles = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r);
  
  const nextMemory: BotMemory = bot.memory ? { ...bot.memory } : {
      lastPlayerPos: null,
      currentGoal: null,
      masterGoalId: null,
      stuckCounter: 0
  };

  // === 0. INSTANT UPGRADE OPPORTUNITY ===
  // Если мы стоим на гексе и можем его апнуть - делаем это.
  // В общем мире мы не проверяем ownerId.
  if (currentHex) {
      const nextLvl = currentHex.currentLevel + 1;
      const occupied = index.getOccupiedHexesList();
      const growCheck = checkGrowthCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid, occupied, queueSize);
      
      if (growCheck.canGrow) {
           return { 
               action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, 
               debug: `INSTANT L${nextLvl}`, 
               memory: { ...nextMemory, stuckCounter: 0 } 
           };
      }
  }

  // === 1. PANIC MODE ===
  if (nextMemory.stuckCounter >= 3) {
      const neighbors = getNeighbors(bot.q, bot.r);
      const escapeRoutes = neighbors.filter(n => {
          const k = getHexKey(n.q, n.r);
          const h = grid[k];
          // Бежим на любой проходимый гекс, не занятый врагом
          return h && h.maxLevel <= bot.playerLevel && !otherUnitObstacles.some(o => o.q === n.q && o.r === n.r);
      });

      if (escapeRoutes.length > 0) {
          const target = escapeRoutes[Math.floor(Math.random() * escapeRoutes.length)];
          const targetHex = grid[getHexKey(target.q, target.r)];
          const moveCost = (targetHex && targetHex.maxLevel >= 2) ? targetHex.maxLevel : 1;
          const totalFunds = bot.moves + Math.floor(bot.coins / GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE);

          if (totalFunds < moveCost) {
             // Если не можем бежать - восстанавливаемся там где стоим
             return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'PANIC: RECOVER', memory: { ...nextMemory, stuckCounter: 0 } };
          }
          return { action: { type: 'MOVE', path: [target], stateVersion }, debug: 'PANIC: SCRAMBLE', memory: { ...nextMemory, stuckCounter: 0, masterGoalId: null } };
      }
      return { action: { type: 'WAIT', stateVersion }, debug: 'PANIC: TRAPPED', memory: { ...nextMemory, stuckCounter: 0 } };
  }

  // --- Helpers ---

  const calculatePathCost = (path: HexCoord[]) => {
      let moves = 0;
      for (const p of path) {
           const h = grid[getHexKey(p.q, p.r)];
           moves += (h && h.maxLevel >= 2) ? h.maxLevel : 1;
      }
      const deficit = Math.max(0, moves - bot.moves);
      const coins = deficit * GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE;
      return { moves, coins };
  };

  const getFarmingAction = (targetAmount: number, reason: string, isUrgent: boolean): AiResult => {
       // 1. Recover HERE if needed (and if valid)
       if (currentHex && !bot.recoveredCurrentHex) {
            return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: `Farming: ${reason}`, memory: { ...nextMemory, stuckCounter: 0 } };
       }

       // 2. Find nearest farm (Any high level hex not occupied)
       const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
          .filter(h => h.id !== currentHexKey || !bot.recoveredCurrentHex)
          .filter(h => !reservedHexKeys?.has(h.id));
       
       candidates.sort((a,b) => {
           // Value = Level / Distance. We want high level close by.
           const valA = a.maxLevel / (cubeDistance(bot, a) + 1);
           const valB = b.maxLevel / (cubeDistance(bot, b) + 1);
           return valB - valA;
       });
       
       // Fallback: Expand to L0 if no farms
       if (candidates.length === 0) {
           const desperates = index.getHexesInRange({q:bot.q, r:bot.r}, 5);
           if (desperates.length > 0) {
               const target = desperates[0];
               if (target.id === currentHexKey) { 
                   return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Desperate Claim', memory: { ...nextMemory, stuckCounter: 0 } };
               }
               const path = findPath({q:bot.q, r:bot.r}, {q:target.q, r:target.r}, grid, bot.playerLevel, otherUnitObstacles);
               if (path) {
                   const trip = calculatePathCost(path);
                   if (bot.coins >= trip.coins) return { action: { type: 'MOVE', path, stateVersion }, debug: 'Desperate Expand', memory: nextMemory };
               }
           }
           return { action: { type: 'WAIT', stateVersion }, debug: 'Bankrupt', memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 } };
       }

       // Try to reach a farm
       for (const candidate of candidates.slice(0, 3)) {
           const path = findPath({q:bot.q, r:bot.r}, {q:candidate.q, r:candidate.r}, grid, bot.playerLevel, otherUnitObstacles);
           if (path) {
               const tripCost = calculatePathCost(path);
               
               const currentHexCost = (currentHex && currentHex.maxLevel >= 2) ? currentHex.maxLevel : 1;
               const buffer = isUrgent ? 0 : (currentHexCost >= 5 ? 50 : 0); 

               if (bot.coins >= tripCost.coins + buffer) {
                   return { action: { type: 'MOVE', path, stateVersion }, debug: `Go Farm (${reason})`, memory: { ...nextMemory, stuckCounter: 0 } };
               }
           }
       }
       
       return { action: { type: 'WAIT', stateVersion }, debug: 'Trapped/Poor', memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 } };
  };

  // --- RESOLVER ---
  const resolveBottleneck = (targetHex: Hex, depth: number = 0): { hex: Hex, strategy: string } | null => {
      if (depth > 3) return null; 
      if (!targetHex) return null;

      const targetLevel = targetHex.currentLevel + 1;

      // 1. CYCLE BLOCK -> Touch ANY fresh hex
      // We need to upgrade hexes not in our queue.
      if (targetLevel > 1 && bot.recentUpgrades.length < queueSize && !bot.recentUpgrades.includes(targetHex.id)) {
          // Find any hex NOT in our queue to "dump" the cycle requirement
          // Prefer nearby L0s for cheap cycle cycling
          const expanses = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
              .filter(h => !bot.recentUpgrades.includes(h.id) && !reservedHexKeys?.has(h.id))
              .sort((a,b) => {
                  // Prefer L0 first, then distance
                  if (a.maxLevel !== b.maxLevel) return a.maxLevel - b.maxLevel;
                  return cubeDistance(bot, a) - cubeDistance(bot, b)
              });
          
          if (expanses.length > 0) return { hex: expanses[0], strategy: 'CYCLE_DUMP' };
          return null;
      }

      // 2. RANK BLOCK -> Upgrade Lower Level Hex
      // If we are L3 trying to build L5, we need to build L4 first.
      if (bot.playerLevel < targetLevel - 1) {
          const trainees = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
             .filter(h => h.id !== targetHex.id && h.maxLevel <= bot.playerLevel && h.maxLevel < 99)
             .sort((a, b) => b.maxLevel - a.maxLevel); // Highest available
          
          if (trainees.length > 0) return resolveBottleneck(trainees[0], depth + 1);
          return null; 
      }

      // 3. SUPPORT BLOCK -> Upgrade Neighbor
      const nbs = getNeighbors(targetHex.q, targetHex.r);
      const highNeighbors = nbs.filter(n => (grid[getHexKey(n.q, n.r)]?.maxLevel || 0) > targetHex.maxLevel).length;
      
      if (targetLevel > 1 && highNeighbors < 5) {
          const validSupports = nbs.map(n => grid[getHexKey(n.q, n.r)]).filter(h => h && h.maxLevel === targetHex.maxLevel);
          if (validSupports.length < 2) {
              const potentialSupports = nbs
                 .map(n => grid[getHexKey(n.q, n.r)])
                 .filter(h => h !== undefined)
                 .filter(h => h.maxLevel < targetHex.maxLevel) // Need to raise this neighbor
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
  
  // 1. Check existing goal stability
  if (nextMemory.masterGoalId) {
      const saved = grid[nextMemory.masterGoalId];
      // Keep goal if valid and not maxed. No owner check.
      if (saved && saved.maxLevel < 99) {
          apexHex = saved;
      }
  }

  // 2. Find new Apex (Highest reachable/upgradeable hex nearby)
  if (!apexHex) {
      const nearbyHexes = index.getHexesInRange({q:bot.q, r:bot.r}, 50)
          .filter(h => h.maxLevel < 99);
      
      // Heuristic: Highest level closest to us
      nearbyHexes.sort((a,b) => {
          if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
          return cubeDistance(bot, a) - cubeDistance(bot, b);
      });

      if (nearbyHexes.length > 0) apexHex = nearbyHexes[0];
  }

  // 3. Init Phase (If absolutely nothing found, rare)
  if (!apexHex) {
       const expanses = index.getHexesInRange({q:bot.q, r:bot.r}, CONTEXT_RADIUS)
          .filter(h => !reservedHexKeys?.has(h.id))
          .sort((a,b) => cubeDistance(bot, a) - cubeDistance(bot, b));
       
       if (expanses.length > 0) {
           apexHex = expanses[0];
       } else {
           return { action: { type: 'WAIT', stateVersion }, debug: 'No Goals', memory: nextMemory };
       }
  }

  nextMemory.masterGoalId = apexHex.id;

  // 4. Resolve Strategy
  // We want to upgrade Apex, but might be blocked.
  const bottleneck = resolveBottleneck(apexHex);
  
  if (!bottleneck) {
      // Cannot solve bottleneck?
      return getFarmingAction(100, "Stuck", false);
  }

  const { hex: targetHex, strategy } = bottleneck;
  nextMemory.currentGoal = { type: 'GROWTH', targetHexId: targetHex.id, priority: 1, expiresAt: 0 };

  // 5. Execution
  const targetKey = getHexKey(targetHex.q, targetHex.r);

  // A. If we are AT the target, upgrade it
  if (currentHexKey === targetKey) {
      const occupied = index.getOccupiedHexesList();
      const check = checkGrowthCondition(targetHex, bot, getNeighbors(targetHex.q, targetHex.r), grid, occupied, queueSize);
      
      if (check.canGrow) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: `Build L${targetHex.currentLevel+1}`, memory: { ...nextMemory, stuckCounter: 0 } };
      } else {
           // We are here but can't grow? Maybe recovered? 
           // If we can't grow due to funds or move points, ActionProcessor validation will fail and we handle it via stuckCounter or farming.
           
           // If funding issue:
           const config = getLevelConfig(targetHex.maxLevel + 1);
           // We need to have moved here, so we might be low on funds.
           return getFarmingAction(config.cost || 50, "Need funds for upgrade", true);
      }
  }

  // B. Move to target
  // Check funds for trip
  const path = findPath({q:bot.q, r:bot.r}, {q:targetHex.q, r:targetHex.r}, grid, bot.playerLevel, otherUnitObstacles);
  
  if (!path) {
       // Path blocked.
       return { action: { type: 'WAIT', stateVersion }, debug: 'Path Blocked', memory: { ...nextMemory, stuckCounter: nextMemory.stuckCounter + 1 } };
  }

  const trip = calculatePathCost(path);
  if (bot.coins >= trip.coins) {
      return { action: { type: 'MOVE', path, stateVersion }, debug: `Moving to ${strategy}`, memory: { ...nextMemory, stuckCounter: 0 } };
  } else {
      return getFarmingAction(trip.coins, "Need travel funds", true);
  }
};
