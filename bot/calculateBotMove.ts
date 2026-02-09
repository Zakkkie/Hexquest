
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { GAME_CONFIG, DIFFICULTY_SETTINGS } from '../rules/config';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findNextConstructionTarget, findNextExcavationTarget, planPyramidConstruction } from './planning';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

// CONFIG FOR DISPERSAL
const SETTLING_TIME_MS = 12000; // Fast initial setup
const MIN_DIST_FROM_CENTER = 10; // Good spacing from center
const MIN_DIST_FROM_OTHERS = 6;  // Personal space between bots
const MOVE_COST_COINS = 5;
const PROJECT_STUCK_LIMIT = 15; // Increased - commit to projects longer!

// V61: Enhanced Cooperative AI Config
const COOPERATION_RADIUS = 6; // Larger cooperation range
const AGGRESSOR_TRIGGER_LEVEL = 4; // Player level that triggers aggressor
const AGGRESSOR_DEACTIVATE_LEVEL = 3; // Level at which aggressor stops
const AGGRESSOR_STUCK_LIMIT = 8; // If stuck 8 times, change tactics
const MIN_TOWER_BUILD_LEVEL = 3; // Minimum level before switching tower targets
const DEEP_PIT_TARGET = -6; // Target depth for quarries

// V60: Helper to find player's highest hex
const findPlayerHighestHex = (player: Entity, grid: Record<string, Hex>): Hex | null => {
    let highest: Hex | null = null;
    let maxLevel = -999;
    
    for (const hex of Object.values(grid)) {
        if (hex.ownerId === player.id && hex.maxLevel > maxLevel) {
            maxLevel = hex.maxLevel;
            highest = hex;
        }
    }
    return highest;
};

// V60: Check if player has hexes above threshold level
const playerHasHighHexes = (player: Entity, grid: Record<string, Hex>, threshold: number): boolean => {
    return Object.values(grid).some(h => h.ownerId === player.id && h.maxLevel >= threshold);
};

// V62: Fixed role determination - only 1 aggressor, rest keep building
const determineBotRole = (
    bot: Entity,
    mem: BotMemory,
    player: Entity,
    otherBots: Entity[],
    grid: Record<string, Hex>
): void => {
    // Check if aggressor mode should be active
    const playerHasLevel4Plus = playerHasHighHexes(player, grid, AGGRESSOR_TRIGGER_LEVEL);
    const shouldAggress = playerHasLevel4Plus && player.playerLevel >= AGGRESSOR_TRIGGER_LEVEL;
    
    // Only assign ONE bot as aggressor - the rest continue building!
    if (shouldAggress) {
        // Check if any bot is already aggressor
        const existingAggressor = otherBots.find(b => b.memory?.botRole === 'AGGRESSOR' && b.memory?.aggressorActive);
        
        if (!existingAggressor && !mem.aggressorActive) {
            // No aggressor yet - assign the closest bot to player's highest hex
            const playerHighest = findPlayerHighestHex(player, grid);
            if (playerHighest) {
                const botDist = cubeDistance(bot, playerHighest);
                const otherDists = otherBots.map(b => cubeDistance(b, playerHighest));
                const minOtherDist = otherDists.length > 0 ? Math.min(...otherDists) : 999;
                
                if (botDist <= minOtherDist) {
                    mem.botRole = 'AGGRESSOR';
                    mem.mode = 'AGGRESSOR';
                    mem.targetPlayerHexId = playerHighest.id;
                    mem.aggressorActive = true;
                    if (!mem.aggressorStuckCount) mem.aggressorStuckCount = 0;
                    return;
                }
            }
        } else if (mem.aggressorActive) {
            // Keep current aggressor active
            return;
        }
        // If this bot is not the aggressor, continue with normal role assignment below
    } else if (mem.aggressorActive && !shouldAggress) {
        // Deactivate aggressor mode
        mem.aggressorActive = false;
        mem.botRole = 'BUILDER';
        mem.mode = 'GATHER';
        mem.targetPlayerHexId = null;
        mem.aggressorStuckCount = 0;
    }
    
    // Normal role assignment if not aggressor
    if (mem.botRole === 'AGGRESSOR' && !shouldAggress) {
        mem.botRole = 'BUILDER';
    }
    
    // If no role assigned, assign based on bot index
    if (!mem.botRole || mem.botRole === 'SUPPORTER') {
        const botIndex = parseInt(bot.id.split('-')[1] || '1');
        // More builders than diggers (3:1 ratio)
        if (botIndex === 2) {
            mem.botRole = 'DIGGER'; // Only bot-2 is primary digger
        } else {
            mem.botRole = 'BUILDER'; // Bots 1,3,4 are builders
        }
    }
    
    // V61: Enhanced Cooperative target sharing
    if (otherBots.length > 0 && mem.homeBase) {
        const nearbyBots = otherBots.filter(b => {
            if (!b.memory?.homeBase) return false;
            return cubeDistance(mem.homeBase!, b.memory.homeBase) <= COOPERATION_RADIUS;
        });
        
        if (nearbyBots.length > 0) {
            // Find the tallest tower among all nearby bots
            let bestTower: Hex | null = null;
            let highestLevel = -1;
            
            for (const b of [bot, ...nearbyBots]) {
                const towerKey = b.memory?.towerKey;
                if (towerKey) {
                    const tower = grid[towerKey];
                    if (tower && tower.maxLevel > highestLevel && tower.structureType !== 'VOID') {
                        highestLevel = tower.maxLevel;
                        bestTower = tower;
                    }
                }
            }
            
            // Share the best tower with everyone
            if (bestTower && bestTower.maxLevel >= 2) {
                mem.sharedTowerKey = bestTower.id;
                // All builders focus on shared tower
                if (mem.botRole === 'BUILDER') {
                    mem.towerKey = bestTower.id;
                }
            }
            
            // Find deepest quarry among diggers
            let bestQuarry: Hex | null = null;
            let deepestLevel = 0;
            
            for (const b of nearbyBots.filter(b => b.memory?.botRole === 'DIGGER')) {
                const quarryKey = b.memory?.quarryKey;
                if (quarryKey) {
                    const quarry = grid[quarryKey];
                    if (quarry && quarry.currentLevel < deepestLevel) {
                        deepestLevel = quarry.currentLevel;
                        bestQuarry = quarry;
                    }
                }
            }
            
            // Share the deepest quarry
            if (bestQuarry && mem.botRole === 'DIGGER') {
                mem.sharedQuarryKey = bestQuarry.id;
                mem.quarryKey = bestQuarry.id;
            }
        }
    }
};

/**
 * AI V62: "Pyramid Builders"
 * - Fixed Aggressor Assignment: Only 1 bot becomes aggressor, others keep building
 * - Pyramid Foundation Planning: Bots calculate proper base size for target height
 * - Triangle Construction: Builds level 1 platform first, then level 2 on top, etc.
 * - 3:1 Builder Ratio: 3 builders + 1 digger for efficient construction
 * - Smart Target Height: Aims for level 6 towers with proper foundation
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
  allBots?: Entity[] // V60: Access to all bots for cooperation
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
  const mem: BotMemory = bot.memory ? { ...bot.memory } : { 
    lastPlayerPos: null, 
    currentGoal: null, 
    stuckCounter: 0, 
    mode: 'GATHER', 
    projectFailCount: 0,
    botRole: 'BUILDER'
  };
  
  if (!mem.spawnTime) mem.spawnTime = now;
  const timeAlive = now - (mem.spawnTime || now);

  const storage = bot.storage || 0;
  const maxStorage = bot.maxStorage || 4;
  const canAffordMove = bot.moves >= 1 || bot.coins >= MOVE_COST_COINS;
  const isBroke = !canAffordMove;
  
  // V60: Determine bot role and cooperative targets
  const otherBots = allBots?.filter(b => b.id !== bot.id) || [];
  determineBotRole(bot, mem, player, otherBots, grid);

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
                  
          // V61: Set tower at base location (will be shared later if cooperating)
          mem.towerKey = getHexKey(bot.q, bot.r);
          mem.sharedTowerKey = mem.towerKey;
                  
          // V61: Quarry placement - offset from tower for efficiency
          const quarryDist = 5; // Moderate distance for accessibility
          const qQ = Math.round(bot.q + quarryDist * Math.cos(mem.migrationAngle + Math.PI)); // Opposite side
          const qR = Math.round(bot.r + quarryDist * Math.sin(mem.migrationAngle + Math.PI));
                  
          mem.quarryKey = getHexKey(qQ, qR); 
          mem.quarrySite = { q: qQ, r: qR };
          mem.sharedQuarryKey = mem.quarryKey;
                  
          // V61: Set initial mode based on role - start gathering resources
          mem.mode = 'GATHER';
          return { action: { type: 'WAIT', stateVersion }, debug: `Base (${mem.botRole})`, memory: mem };
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
  // V60: Aggressor mode takes priority
  if (mem.mode === 'AGGRESSOR' && mem.botRole === 'AGGRESSOR') {
      return executeAggressorScenario(bot, mem, grid, index, stateVersion, player, navObstacles);
  }
  
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
// V62: Pyramid construction with proper foundation planning
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
    // V62: Prioritize shared tower for cooperative building
    let masterTower: Hex | null = null;
    
    // Use shared tower if available and tall enough
    if (mem.sharedTowerKey && grid[mem.sharedTowerKey] && grid[mem.sharedTowerKey].structureType !== 'VOID') {
        masterTower = grid[mem.sharedTowerKey];
    } else if (mem.towerKey && grid[mem.towerKey]) {
        masterTower = grid[mem.towerKey];
    }
    
    // V62: Only switch tower if current is destroyed OR hasn't made progress in long time
    if (!masterTower || masterTower.structureType === 'VOID') {
        // Find best candidate near homebase
        const candidates = index.getHexesInRange(mem.homeBase!, 4);
        const validCandidates = candidates.filter(h => h.structureType !== 'VOID');
        
        // Prefer hexes that already have some height
        validCandidates.sort((a, b) => b.maxLevel - a.maxLevel);
        
        masterTower = validCandidates[0] || grid[getHexKey(bot.q, bot.r)];
        mem.towerKey = masterTower.id;
        mem.sharedTowerKey = masterTower.id;
        mem.projectFailCount = 0; // Reset failure counter on new tower
    }

    // 2. V62: Use Pyramid Planner to calculate proper foundation
    // Determine target height based on win condition or default to 5
    const targetHeight = 6; // Aim for level 6 towers
    
    // Get pyramid build order (foundation first)
    const pyramidPlan = planPyramidConstruction(masterTower, targetHeight, bot, grid, index);
    
    // Find next buildable hex from pyramid plan
    let targetHex: Hex | null = null;
    
    if (pyramidPlan.length > 0) {
        // Try each hex in pyramid order until we find one we can build
        for (const plannedHex of pyramidPlan) {
            const neighbors = getNeighbors(plannedHex.q, plannedHex.r);
            const occupied = index.getOccupiedHexesList();
            const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 2;
            
            const check = checkGrowthCondition(plannedHex, bot, neighbors, grid, occupied, queueSize);
            if (check.canGrow) {
                const occupant = index.getEntityAt(plannedHex.q, plannedHex.r);
                if (!occupant || occupant.id === bot.id) {
                    targetHex = plannedHex;
                    break;
                }
            }
        }
    }
    
    // Fallback to DFS planner if pyramid planner didn't find anything
    if (!targetHex) {
        targetHex = findNextConstructionTarget(masterTower, bot, grid, index, difficulty);
    }
    
    // Final fallback to master tower itself
    if (!targetHex) {
        targetHex = masterTower;
    }

    // 3. Execution Logic
    const dist = cubeDistance(bot, targetHex);
    
    // A. At Target
    if (dist === 0) {
        const neighbors = getNeighbors(bot.q, bot.r);
        const occupied = index.getOccupiedHexesList();
        const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 2;
        
        // Try Build
        if (checkGrowthCondition(targetHex, bot, neighbors, grid, occupied, queueSize).canGrow) {
            return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: `Build L${targetHex.currentLevel + 1}`, memory: { ...mem, stuckCounter: 0, projectFailCount: 0 } };
        } 
        
        // V62: Stuck at target - be more patient before switching
        mem.projectFailCount = (mem.projectFailCount || 0) + 1;
        if (mem.projectFailCount > PROJECT_STUCK_LIMIT) {
            // Only shift if tower is still low level, otherwise wait
            if (masterTower.maxLevel < MIN_TOWER_BUILD_LEVEL) {
                // Shift project center to neighbor
                const neighbors = getNeighbors(bot.q, bot.r);
                const validNeighbors = neighbors.filter(n => {
                    const h = grid[getHexKey(n.q, n.r)];
                    return h && h.structureType !== 'VOID';
                });
                if (validNeighbors.length > 0) {
                    const newTower = validNeighbors[0];
                    mem.towerKey = getHexKey(newTower.q, newTower.r);
                    mem.sharedTowerKey = mem.towerKey;
                }
            }
            return { action: { type: 'WAIT', stateVersion }, debug: 'Plan Shift', memory: { ...mem, projectFailCount: 0 } };
        }
    }

    // B. Move to Target
    return executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Build Move');
};

// ==========================================
// SCENARIO 2: THE MINER (Gatherer)
// V61: Deep pit commitment with better targeting
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
    // V61: Commit to deep pit digging with shared quarry
    let quarry: Hex | null = null;
    
    if (mem.sharedQuarryKey && grid[mem.sharedQuarryKey]) {
        quarry = grid[mem.sharedQuarryKey];
    } else if (mem.quarryKey) {
        quarry = grid[mem.quarryKey];
    }
    
    // If quarry missing, re-establish at quarry site or current location
    if (!quarry) {
        if (mem.quarrySite) {
             const key = getHexKey(mem.quarrySite.q, mem.quarrySite.r);
             if (grid[key]) {
                 mem.quarryKey = key;
                 mem.sharedQuarryKey = key;
                 quarry = grid[key];
             }
        }
        if (!quarry) {
            mem.quarryKey = getHexKey(bot.q, bot.r);
            mem.sharedQuarryKey = mem.quarryKey;
            quarry = grid[mem.quarryKey!];
        }
    }

    // 2. V61: Deep Pit Strategy - focus on digging quarry deep first
    let targetHex = quarry;
    
    if (quarry) {
        // If quarry not deep enough, prioritize digging it deeper
        if (quarry.currentLevel > DEEP_PIT_TARGET) {
            targetHex = quarry; // Keep digging the center
        } else {
            // Once deep enough, use recursive planner for surrounding area
            const nextDigSpot = findNextExcavationTarget(quarry, bot, grid, index);
            if (nextDigSpot) {
                targetHex = nextDigSpot;
            } else {
                targetHex = quarry; // Fallback to center
            }
        }
    }
    
    targetHex = targetHex || grid[getHexKey(bot.q, bot.r)];

    // 3. Execution
    const dist = cubeDistance(bot, targetHex);

    // A. At Target
    if (dist === 0) {
        const neighbors = getNeighbors(bot.q, bot.r);
        if (checkDigCondition(targetHex, bot, neighbors, grid).canGrow) {
             return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: `Dig L${targetHex.currentLevel - 1}`, memory: { ...mem, stuckCounter: 0, projectFailCount: 0 } };
        }
        // V61: More patient with quarry
        mem.projectFailCount = (mem.projectFailCount || 0) + 1;
        if (mem.projectFailCount > 8) {
             // Only move quarry if really stuck
             const neighbors = getNeighbors(bot.q, bot.r);
             const validNeighbors = neighbors.filter(n => {
                 const h = grid[getHexKey(n.q, n.r)];
                 return h && h.structureType !== 'VOID';
             });
             if (validNeighbors.length > 0) {
                 mem.quarryKey = getHexKey(validNeighbors[0].q, validNeighbors[0].r);
                 mem.sharedQuarryKey = mem.quarryKey;
             }
             return { action: { type: 'WAIT', stateVersion }, debug: 'Quarry Shift', memory: { ...mem, projectFailCount: 0 } };
        }
    }

    // B. Move to Target
    return executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Mine Move');
};

// ==========================================
// SCENARIO 3: THE AGGRESSOR (Attacker)
// V61: Smart tactics with fallback strategies
// ==========================================
const executeAggressorScenario = (
    bot: Entity, 
    mem: BotMemory, 
    grid: Record<string, Hex>, 
    index: WorldIndex,
    stateVersion: number,
    player: Entity,
    navObstacles: HexCoord[]
): AiResult => {
    
    // 1. Find target hex to attack
    let targetHex: Hex | null = null;
    
    // Use stored target if valid
    if (mem.targetPlayerHexId) {
        const stored = grid[mem.targetPlayerHexId];
        if (stored && stored.ownerId === player.id && stored.maxLevel >= AGGRESSOR_TRIGGER_LEVEL) {
            targetHex = stored;
        }
    }
    
    // Find new target if needed
    if (!targetHex) {
        targetHex = findPlayerHighestHex(player, grid);
        if (targetHex) {
            mem.targetPlayerHexId = targetHex.id;
            mem.aggressorStuckCount = 0; // Reset stuck counter for new target
        }
    }
    
    // No valid target - deactivate aggressor mode
    if (!targetHex || targetHex.maxLevel < AGGRESSOR_DEACTIVATE_LEVEL) {
        mem.aggressorActive = false;
        mem.botRole = 'BUILDER';
        mem.mode = 'GATHER';
        mem.targetPlayerHexId = null;
        mem.aggressorStuckCount = 0;
        return { action: { type: 'WAIT', stateVersion }, debug: 'Aggressor: Done', memory: mem };
    }
    
    // 2. Check if we're at the target
    const dist = cubeDistance(bot, targetHex);
    
    if (dist === 0) {
        // At target - dig it down!
        const neighbors = getNeighbors(bot.q, bot.r);
        
        // Try to dig the hex
        if (checkDigCondition(targetHex, bot, neighbors, grid).canGrow) {
            mem.aggressorStuckCount = 0; // Reset on successful action
            return { 
                action: { type: 'DIG', coord: {q: bot.q, r: bot.r}, stateVersion }, 
                debug: 'Aggressor: Attack!', 
                memory: mem
            };
        }
        
        // V61: Can't dig primary target - increment stuck counter
        mem.aggressorStuckCount = (mem.aggressorStuckCount || 0) + 1;
        
        // V61: If stuck too long, switch to alternative target
        if (mem.aggressorStuckCount > AGGRESSOR_STUCK_LIMIT) {
            // Find all player hexes level 3+
            const playerHexes = Object.values(grid).filter(h => 
                h.ownerId === player.id && h.maxLevel >= 3
            );
            
            if (playerHexes.length > 0) {
                // Sort by accessibility (distance and level)
                playerHexes.sort((a, b) => {
                    const distA = cubeDistance(bot, a);
                    const distB = cubeDistance(bot, b);
                    // Prefer closer hexes, break ties by level
                    if (Math.abs(distA - distB) < 3) {
                        return b.maxLevel - a.maxLevel; // Higher level first
                    }
                    return distA - distB; // Closer first
                });
                
                // Switch to different target
                for (const hex of playerHexes) {
                    if (hex.id !== mem.targetPlayerHexId) {
                        mem.targetPlayerHexId = hex.id;
                        mem.aggressorStuckCount = 0;
                        return { 
                            action: { type: 'WAIT', stateVersion }, 
                            debug: 'Aggressor: Retarget', 
                            memory: mem 
                        };
                    }
                }
            }
            
            // No alternative targets - temporarily retreat to gather resources
            mem.mode = 'GATHER';
            mem.aggressorStuckCount = 0;
            return { 
                action: { type: 'WAIT', stateVersion }, 
                debug: 'Aggressor: Regroup', 
                memory: mem 
            };
        }
        
        // Try to dig neighbors that support the target
        for (const n of neighbors) {
            const nKey = getHexKey(n.q, n.r);
            const nHex = grid[nKey];
            if (nHex && nHex.ownerId === player.id) {
                const nCheck = checkDigCondition(nHex, bot, getNeighbors(n.q, n.r), grid);
                if (nCheck.canGrow) {
                    return executeMove(bot, nHex, grid, navObstacles, stateVersion, mem, 'Aggressor: Flank');
                }
            }
        }
        
        // Still stuck - wait
        return { action: { type: 'WAIT', stateVersion }, debug: 'Aggressor: Wait', memory: mem };
    }
    
    // 3. Move to target
    // V61: Check if path is blocked repeatedly
    const moveResult = executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Aggressor: Approach');
    
    // If blocked, increment stuck counter
    if (moveResult.debug === 'Blocked') {
        mem.aggressorStuckCount = (mem.aggressorStuckCount || 0) + 1;
    } else {
        mem.aggressorStuckCount = 0; // Reset on successful movement
    }
    
    return moveResult;
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
