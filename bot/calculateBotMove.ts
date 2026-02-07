
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { DIFFICULTY_SETTINGS } from '../rules/config';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

// --- CONFIGURATION ---
const MEMORY_LIMIT = 20;         // Максимум записей в истории перед очисткой
const PYRAMID_HEIGHT = 5;        // Целевая высота центра
const MIN_COINS = 5;             // НЗ на черный день
const DIG_RADIUS_START = 2;      // Копать только на расстоянии 2+ от центра базы

interface PharaohMemory extends BotMemory {
    state: 'INIT' | 'MINING' | 'CONSTRUCTING' | 'EMERGENCY';
    homeBase: HexCoord | null;   // Центр пирамиды
    targetHexId: string | null;  // Текущая цель
    history: string[];           // Лог для очистки
    stuckCounter: number;
}

/**
 * AI V5.0: "The Pharaoh"
 * Strategy: Recursive Dependency Building.
 * 1. Defines a target geometry (Pyramid).
 * 2. Scans from Center outwards. Finds the first hex that needs an upgrade AND has support.
 * 3. Mines resources strictly outside the Pyramid perimeter.
 * 4. Self-cleans memory to prevent overflow.
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
  reservedHexes?: Set<string>
): AiResult => {
  
  if (!bot) return { action: null, debug: 'ERR', memory: { lastPlayerPos: null, currentGoal: null, stuckCounter: 0 } };

  // --- 1. MEMORY MANAGEMENT ---
  const mem: PharaohMemory = (bot.memory as PharaohMemory) || {
      state: 'INIT',
      homeBase: null,
      targetHexId: null,
      history: [],
      stuckCounter: 0,
      lastPlayerPos: null,
      currentGoal: null
  };

  // Garbage Collection: Очистка памяти при переполнении
  if (mem.history && mem.history.length > MEMORY_LIMIT) {
      mem.history = ['Memory Purged'];
  } else if (!mem.history) {
      mem.history = [];
  }

  const log = (msg: string) => {
      mem.history.push(msg);
      return msg;
  };

  // --- 2. CONTEXT SETUP ---
  const currentHexKey = getHexKey(bot.q, bot.r);
  const currentHex = grid[currentHexKey];
  const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 2;
  const navObstacles = obstacles.filter(o => o.q !== bot.q || o.r !== bot.r);
  
  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 5; 
  const hasMaterial = storage > 0;
  const isFull = storage >= maxStorage;
  
  // Is Stranded? (No moves, low coins)
  if (bot.moves <= 0 && bot.coins < MIN_COINS) {
      mem.state = 'EMERGENCY';
  }

  // --- 3. SETTLING (Find the Pyramid Site) ---
  if (!mem.homeBase) {
      mem.homeBase = { q: bot.q, r: bot.r };
      mem.state = 'MINING';
      return { action: { type: 'WAIT', stateVersion }, debug: log('Pyramid Started'), memory: mem };
  }

  const homeHex = grid[getHexKey(mem.homeBase.q, mem.homeBase.r)];
  // Если базу уничтожили (Void), объявляем новую здесь
  if (!homeHex || homeHex.structureType === 'VOID') {
      mem.homeBase = { q: bot.q, r: bot.r };
      mem.targetHexId = null; // Сброс цели
  }

  // --- 4. DECISION TREE (The Brain) ---

  // A. EMERGENCY HANDLING (Priority #1)
  if (mem.state === 'EMERGENCY') {
      // Если мы на своей земле -> Recover
      if (currentHex.ownerId === 'BOT' || currentHex.maxLevel > 0) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: log('Panic Recover'), memory: { ...mem, state: 'MINING' } as unknown as BotMemory };
      }
      
      // Иначе копаем яму (DIG дает Moves согласно README)
      // В панике можно копать где угодно, лишь бы выжить
      const digCheck = checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid);
      if (digCheck.canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: log('Panic Dig'), memory: { ...mem, state: 'MINING' } as unknown as BotMemory };
      }
      
      return { action: { type: 'WAIT', stateVersion }, debug: log('Stranded'), memory: mem };
  }

  // B. STATE SWITCHING
  if (mem.state === 'MINING' && isFull) {
      mem.state = 'CONSTRUCTING';
      mem.targetHexId = null; // Пересчитать цель стройки
  } 
  else if (mem.state === 'CONSTRUCTING' && !hasMaterial) {
      mem.state = 'MINING';
      mem.targetHexId = null; // Пересчитать цель копки
  }

  // --- 5. TARGETING (The Blueprint) ---

  if (!mem.targetHexId) {
      
      // STRATEGY: CONSTRUCT PYRAMID
      if (mem.state === 'CONSTRUCTING') {
          // Ищем, какой кирпичик положить следующим.
          // Сканируем от центра наружу (Radius 3 достаточно для базы)
          const candidates = index.getHexesInRange(mem.homeBase, 3);
          
          // Сортируем: сначала те, что ближе к центру, затем по уровню (сначала низкие)
          candidates.sort((a,b) => {
              const distA = cubeDistance(mem.homeBase!, a);
              const distB = cubeDistance(mem.homeBase!, b);
              if (distA !== distB) return distA - distB;
              return a.currentLevel - b.currentLevel;
          });

          let bestBuild = null;

          for (const hex of candidates) {
              if (hex.structureType === 'VOID') continue;
              if (index.isOccupied(hex.q, hex.r) && hex.id !== currentHexKey) continue; // Не идем на занятые (кроме нас самих)
              
              const dist = cubeDistance(mem.homeBase!, hex);
              // Логика Пирамиды:
              // Dist 0 (Center) -> Target L5
              // Dist 1 (Ring)   -> Target L4
              // Dist 2 (Base)   -> Target L2/3
              let desiredLevel = 0;
              if (dist === 0) desiredLevel = PYRAMID_HEIGHT;
              else if (dist === 1) desiredLevel = PYRAMID_HEIGHT - 1;
              else if (dist === 2) desiredLevel = Math.max(1, PYRAMID_HEIGHT - 3);

              if (hex.maxLevel < desiredLevel) {
                  // Проверяем, можем ли мы поднять этот гекс ПРЯМО СЕЙЧАС
                  const check = checkGrowthCondition(hex, bot, getNeighbors(hex.q, hex.r), grid, [], queueSize);
                  
                  if (check.canGrow) {
                      // Отлично, это наш следующий шаг (фундамент готов)
                      bestBuild = hex;
                      break; 
                  } 
                  // Если check.missingSupports > 0, мы пропускаем этот гекс.
                  // Цикл for пойдет дальше и найдет эти самые суппорты (они будут дальше по дистанции),
                  // и выберет их целью. Рекурсия через итерацию.
              }
          }
          if (bestBuild) mem.targetHexId = bestBuild.id;
      }

      // STRATEGY: MINING (Get Materials + Fuel)
      else if (mem.state === 'MINING') {
          // Ищем ближайшую клетку ВНЕ Пирамиды (Distance >= DIG_RADIUS_START)
          const candidates = index.getHexesInRange(bot, 3);
          let bestDig = null;
          let bestScore = -999;

          for (const hex of candidates) {
              if (hex.structureType === 'VOID') continue;
              if (index.isOccupied(hex.q, hex.r) && hex.id !== currentHexKey) continue;
              
              const distFromBase = cubeDistance(mem.homeBase!, hex);
              
              // NEVER DIG THE PYRAMID FOUNDATION
              if (distFromBase < DIG_RADIUS_START) continue;

              const check = checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid);
              if (check.canGrow) {
                  // Оценка:
                  // 1. Ближе к боту = лучше.
                  // 2. Глубокие ямы (<=0) = лучше (дают больше шагов при DIG).
                  const distFromBot = cubeDistance(bot, hex);
                  let score = 100 - (distFromBot * 10);
                  if (hex.currentLevel <= 0) score += 50; 
                  
                  if (score > bestScore) {
                      bestScore = score;
                      bestDig = hex;
                  }
              }
          }
          if (bestDig) mem.targetHexId = bestDig.id;
          else {
              // Если копать негде (все в фундаменте?), идем подальше от базы
               const neighbors = getNeighbors(bot.q, bot.r);
               const away = neighbors.find(n => cubeDistance(mem.homeBase!, n) > cubeDistance(mem.homeBase!, bot) && !index.isOccupied(n.q, n.r));
               if(away) {
                   // Просто шаг в сторону, чтобы обновить сканирование
                   return { action: { type: 'MOVE', path: [away], stateVersion }, debug: 'Expand Search', memory: mem };
               }
          }
      }
  }

  // --- 6. EXECUTION ---

  const targetHex = mem.targetHexId ? grid[mem.targetHexId] : null;
  const isAtTarget = targetHex && targetHex.id === currentHexKey;

  // A. WORK AT TARGET
  if (isAtTarget) {
      const neighbors = getNeighbors(bot.q, bot.r);
      
      if (mem.state === 'CONSTRUCTING') {
          const check = checkGrowthCondition(currentHex, bot, neighbors, grid, [], queueSize);
          if (check.canGrow) {
              return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: log('Build L' + (currentHex.maxLevel+1)), memory: mem };
          } else {
              // Если пришли, а строить нельзя (например, кто-то сломал соседний суппорт):
              // НЕ УХОДИМ. Просто сбрасываем цель, на след. ходу алгоритм выберет суппорт.
              mem.targetHexId = null;
              return { action: { type: 'WAIT', stateVersion }, debug: log('Re-eval Build'), memory: mem };
          }
      } 
      else if (mem.state === 'MINING') {
          const check = checkDigCondition(currentHex, bot, neighbors, grid);
          if (check.canGrow) {
              return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: log('Digging'), memory: mem };
          } else {
              // Докопали до дна? Ищем новую шахту
              mem.targetHexId = null;
              return { action: { type: 'WAIT', stateVersion }, debug: log('Mine Depleted'), memory: mem };
          }
      }
  }

  // B. MOVE TO TARGET
  const dest = targetHex ? { q: targetHex.q, r: targetHex.r } : mem.homeBase!;
  const path = findPath({q:bot.q, r:bot.r}, dest, grid, bot.playerLevel, navObstacles);

  if (path && path.length > 0) {
      const cost = calculateMovementCost(bot, path, grid);
      
      if (cost.canAfford) {
          return { action: { type: 'MOVE', path, stateVersion }, debug: `Move > ${mem.state}`, memory: mem };
      } else {
          // Не хватает топлива на переход.
          
          // 1. Recover (если владеем текущей клеткой)
          if (currentHex.ownerId === 'BOT' || currentHex.maxLevel > 0) {
              return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: log('Refuel (Rec)'), memory: mem };
          }
          
          // 2. Dig (Deep Excavation Logic)
          // Если мы застряли по пути, мы можем копнуть, чтобы получить шаги.
          // Но только если мы НЕ стоим на фундаменте пирамиды.
          const distBase = cubeDistance(mem.homeBase!, bot);
          if (distBase >= DIG_RADIUS_START) {
              const digCheck = checkDigCondition(currentHex, bot, getNeighbors(bot.q, bot.r), grid);
              if (digCheck.canGrow) {
                   return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: log('Refuel (Dig)'), memory: mem };
              }
          }
          
          // Если ничего не помогает -> Wait (возможно, пассивный доход или другие боты помогут)
          return { action: { type: 'WAIT', stateVersion }, debug: log('Stuck Wait'), memory: mem };
      }
  } else {
      // Путь заблокирован или не найден
      mem.targetHexId = null;
      // Random Scout if blocked
      const neighbors = getNeighbors(bot.q, bot.r).filter(n => !index.isOccupied(n.q, n.r));
      if (neighbors.length > 0) {
           return { action: { type: 'MOVE', path: [neighbors[0]], stateVersion }, debug: 'Scout', memory: mem };
      }
  }

  return { action: { type: 'WAIT', stateVersion }, debug: 'Idle', memory: mem };
};
