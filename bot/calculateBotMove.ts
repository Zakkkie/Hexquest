
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

const MOVE_COST_COINS = 5;
const SCAN_RADIUS = 6; // Moderate radius, covers local area well

/**
 * AI V42: "The Initiative Taker"
 * Fixes "Idle" loops by forcing action:
 * 1. If "Good" targets (Deep Pits/High Towers) are missing -> Create New Ones (Start Pit/Start Tower).
 * 2. If Broke -> Prioritize Digging (Moves) over Recover.
 * 3. Never Wait: If blocked, Wander randomly.
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
  // Ignore self in obstacles
  const navObstacles = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r);
  
  const now = Date.now();
  const mem: BotMemory = bot.memory ? { ...bot.memory } : { lastPlayerPos: null, currentGoal: null, stuckCounter: 0, mode: 'GATHER' };
  
  if (!mem.spawnTime) mem.spawnTime = now;

  // Economy
  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 4;
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove;

  // --- 1. MODE SWITCH ---
  if (mem.mode === 'GATHER' && storage >= maxStorage) {
      mem.mode = 'BUILD';
      mem.targetHexId = undefined;
  } else if (mem.mode === 'BUILD' && storage <= 0) {
      mem.mode = 'GATHER';
      mem.targetHexId = undefined;
  }

  // --- 2. SURVIVAL (POVERTY BREAK) ---
  // If we have no moves, we MUST get some.
  if (isBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      
      // Attempt 1: Dig (Gives Move + Material). Best option.
      // Allow digging L0->-1 (First Cut) even if we destroy flat land.
      if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Need Fuel (Dig)', memory: mem };
      }
      
      // Attempt 2: Recover (Gives Move + Coins).
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Need Fuel (Rec)', memory: mem };
      }
      
      // Attempt 3: Build (Gives Move, Costs Material). Only if we have material.
      if (storage > 0 && checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Need Fuel (Build)', memory: mem };
      }
  }

  // --- 3. TARGETING ---
  
  // Cleanup invalid target
  if (mem.targetHexId) {
      const t = grid[mem.targetHexId];
      if (!t || t.structureType === 'VOID' || bot.recentUpgrades.includes(t.id)) {
          mem.targetHexId = undefined;
      }
  }

  if (!mem.targetHexId) {
      const candidates = index.getHexesInRange({q:bot.q, r:bot.r}, SCAN_RADIUS);
      let bestTarget: { hex: Hex, score: number } | null = null;

      for (const hex of candidates) {
          if (hex.structureType === 'VOID') continue;
          if (index.isOccupied(hex.q, hex.r) && hex.id !== currentHexKey) continue;
          if (bot.recentUpgrades.includes(hex.id)) continue;

          let score = 0;
          let possible = false;
          const dist = cubeDistance(bot, hex);

          if (mem.mode === 'GATHER') {
              // GATHER MODE
              if (checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid).canGrow) {
                  possible = true;
                  // Priority 1: Deepen existing pits (The Quarry)
                  if (hex.currentLevel < 0) score += 50; 
                  // Priority 2: Start new pit (L0 -> -1)
                  else if (hex.currentLevel === 0) score += 10;
                  // Avoid digging towers
                  else score -= 100;
              }
          } else {
              // BUILD MODE
              if (checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, [], queueSize).canGrow) {
                  possible = true;
                  // Priority 1: Heighten existing towers (The Spire)
                  if (hex.maxLevel > 0) score += 50;
                  // Priority 2: Start new tower (L0 -> 1)
                  else if (hex.maxLevel === 0) score += 10;
                  // Avoid filling pits
                  else score -= 100;
              }
          }

          // SABOTAGE BONUS (If nearby enemy)
          // ... (simplified for brevity: just add raw score if adjacent to player) ...

          if (possible) {
              score -= dist * 2; // Travel cost
              score += Math.random() * 5; // Noise
              
              if (!bestTarget || score > bestTarget.score) {
                  bestTarget = { hex, score };
              }
          }
      }
      
      if (bestTarget) mem.targetHexId = bestTarget.hex.id;
  }

  // --- 4. EXECUTION ---
  const targetHex = mem.targetHexId ? grid[mem.targetHexId] : null;

  // A. IF AT TARGET -> WORK
  if (targetHex && targetHex.id === currentHexKey) {
      const neighbors = getNeighbors(bot.q, bot.r);
      if (mem.mode === 'GATHER') {
          // Double check if we can still dig
          if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
              return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mining', memory: { ...mem, stuckCounter: 0 } };
          }
      } else {
          // Double check if we can still build
          if (checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize).canGrow) {
              return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Building', memory: { ...mem, stuckCounter: 0 } };
          }
      }
      // If we are at target but can't work (e.g. condition changed), clear target
      mem.targetHexId = undefined;
  }

  // B. IF NOT AT TARGET -> MOVE
  if (targetHex && canAffordMove) {
      const path = findPath({q:bot.q, r:bot.r}, {q:targetHex.q, r:targetHex.r}, grid, bot.playerLevel, navObstacles);
      if (path && path.length > 0) {
          if (calculateMovementCost(bot, path, grid).canAfford) {
              return { action: { type: 'MOVE', path, stateVersion }, debug: `Go > ${mem.mode}`, memory: mem };
          } else {
             // Too expensive. Try 1 step.
             if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
                  return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: mem };
             }
          }
      }
  }

  // --- 5. FALLBACK: RANDOM ACTION (Never Idle) ---
  // If we have no target, or can't move to it... do something!
  
  if (canAffordMove) {
      // Wander to random neighbor to find new opportunities
      const neighbors = getNeighbors(bot.q, bot.r);
      const validN = neighbors.filter(n => !index.isOccupied(n.q, n.r) && grid[getHexKey(n.q, n.r)]?.structureType !== 'VOID');
      if (validN.length > 0) {
          const rnd = validN[Math.floor(Math.random() * validN.length)];
          // Only move if we can afford it
          if (calculateMovementCost(bot, [rnd], grid).canAfford) {
               // Clear target so we scan again from new spot
               return { action: { type: 'MOVE', path: [rnd], stateVersion }, debug: 'Wander', memory: { ...mem, targetHexId: undefined } };
          }
      }
  }

  // If we can't even wander... Dig locally if possible (Panic)
  if (currentHex && checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid).canGrow) {
       return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: mem };
  }

  // Truly stuck (No moves, no money, cant dig) -> Wait is the only option (Game Over for bot until passive income?)
  return { action: { type: 'WAIT', stateVersion }, debug: 'Stuck', memory: mem };
};
