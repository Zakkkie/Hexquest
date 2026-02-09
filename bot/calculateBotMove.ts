
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { GAME_CONFIG, DIFFICULTY_SETTINGS } from '../rules/config';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findNextConstructionTarget, findNextExcavationTarget, planPyramidConstruction, findBestBuildTargets, findBestDigTargets, HexScore } from './planning';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

// CONFIG FOR DISPERSAL
const SETTLING_TIME_MS = 15000; // Slightly longer for better positioning
const MIN_DIST_FROM_CENTER = 6; // Closer to center for better cooperation
const MIN_DIST_FROM_OTHERS = 4;  // Closer to each other
const MOVE_COST_COINS = 5;
const PROJECT_STUCK_LIMIT = 5; // Much lower - switch projects faster

// V72: Strategic Focus Config
const COOPERATION_RADIUS = 12; // Much larger cooperation range
const AGGRESSOR_TRIGGER_LEVEL = 5; // Higher threshold - focus on building first
const AGGRESSOR_DEACTIVATE_LEVEL = 3;
const AGGRESSOR_STUCK_LIMIT = 4;
const MIN_TOWER_BUILD_LEVEL = 3; // Lower threshold
const DEEP_PIT_TARGET = -4; // Target depth for quarries
const PYRAMID_BASE_RADIUS = 2; // Smaller, more focused pyramid
const MAX_WAIT_CYCLES = 2; // Faster unstuck
const MAX_RECOVER_PER_HEX = 1; // V72: Limit recover actions per hex
const BUILD_PRIORITY_RADIUS = 3; // V72: Stay close to tower when building

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
 * AI V72: "Strategic Focus"
 * - Simplified Cooperation: One master tower, all builders contribute
 * - Local Building: Build on current hex when possible (minimize movement)
 * - Aggressive Gathering: Fill storage completely before building
 * - Smart Resource Use: Minimize Recover, maximize productive actions
 * - Focused Territories: Bots claim areas and develop them vertically
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
  // V71: Only panic if truly broke (no moves AND no coins)
  const trulyBroke = bot.moves === 0 && bot.coins < MOVE_COST_COINS;
  if (trulyBroke && currentHex) {
      const neighbors = getNeighbors(bot.q, bot.r);
      // Try to dig for resources
      if (checkDigCondition(currentHex, bot, neighbors, grid).canGrow) {
           return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Panic Dig', memory: { ...mem, stuckCounter: 0, waitCounter: 0 } };
      }
      // Only recover if we can't do anything else
      if (!bot.recoveredCurrentHex) {
           return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, debug: 'Recover', memory: { ...mem, stuckCounter: 0, waitCounter: 0 } };
      }
  }
  
  // V71: Track consecutive waits to prevent stuck loops
  if (!mem.waitCounter) mem.waitCounter = 0;

  // --- 2. MODE SWITCHING ---
  // V60: Aggressor mode takes priority
  if (mem.mode === 'AGGRESSOR' && mem.botRole === 'AGGRESSOR') {
      return executeAggressorScenario(bot, mem, grid, index, stateVersion, player, navObstacles);
  }
  
  // V72: More aggressive gathering - fill up completely
  if (mem.mode === 'GATHER' && storage >= maxStorage * 0.9) {
      mem.mode = 'BUILD';
  } else if (mem.mode === 'BUILD' && storage <= maxStorage * 0.2) {
      mem.mode = 'GATHER';
  }

  // --- 3. SCENARIO DISPATCH ---
  if (mem.mode === 'BUILD') {
      return executeBuilderScenario(bot, mem, grid, index, stateVersion, difficulty, navObstacles, otherBots);
  } else {
      return executeMinerScenario(bot, mem, grid, index, stateVersion, navObstacles, otherBots);
  }
};

// ==========================================
// SCENARIO 1: THE ARCHITECT (Builder)
// V72: Local-first building with cooperative tower focus
// ==========================================
const executeBuilderScenario = (
    bot: Entity, 
    mem: BotMemory, 
    grid: Record<string, Hex>, 
    index: WorldIndex,
    stateVersion: number,
    difficulty: Difficulty,
    navObstacles: HexCoord[],
    allBots: Entity[]
): AiResult => {
    
    const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 2;
    const occupied = index.getOccupiedHexesList();
    const currentHex = grid[getHexKey(bot.q, bot.r)];
    
    // V72: Step 1 - Try to build on CURRENT hex first (minimize movement)
    if (currentHex && currentHex.structureType !== 'VOID') {
        const neighbors = getNeighbors(bot.q, bot.r);
        const check = checkGrowthCondition(currentHex, bot, neighbors, grid, occupied, queueSize);
        
        if (check.canGrow) {
            return { 
                action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, 
                debug: `Build L${currentHex.currentLevel + 1}`, 
                memory: { ...mem, stuckCounter: 0, projectFailCount: 0, waitCounter: 0 } 
            };
        }
    }
    
    // V72: Step 2 - Find the master tower (highest among all bots)
    let masterTower: Hex | null = null;
    let highestLevel = -1;
    
    // First check all bots for highest tower
    for (const b of [bot, ...allBots]) {
        const towerKey = b.memory?.towerKey || b.memory?.sharedTowerKey;
        if (towerKey && grid[towerKey] && grid[towerKey].structureType !== 'VOID') {
            const tower = grid[towerKey];
            if (tower.maxLevel > highestLevel) {
                highestLevel = tower.maxLevel;
                masterTower = tower;
            }
        }
    }
    
    // V72: If no tower yet, use home base
    if (!masterTower && mem.homeBase) {
        const homeKey = getHexKey(mem.homeBase.q, mem.homeBase.r);
        if (grid[homeKey] && grid[homeKey].structureType !== 'VOID') {
            masterTower = grid[homeKey];
        }
    }
    
    // V72: Share the master tower
    if (masterTower) {
        mem.towerKey = masterTower.id;
        mem.sharedTowerKey = masterTower.id;
    }
    
    // V72: Step 3 - Find best build target near master tower
    let targetHex: Hex | null = null;
    
    if (masterTower) {
        // Get hexes in priority radius around tower
        const nearbyHexes = index.getHexesInRange(masterTower, BUILD_PRIORITY_RADIUS);
        
        // Sort by: buildable first, then by level (lower first), then by distance to bot
        const candidates = nearbyHexes
            .filter(h => h.structureType !== 'VOID')
            .map(h => {
                const hNeighbors = getNeighbors(h.q, h.r);
                const check = checkGrowthCondition(h, bot, hNeighbors, grid, occupied, queueSize);
                const occupant = index.getEntityAt(h.q, h.r);
                const isFree = !occupant || occupant.id === bot.id;
                return { hex: h, check, isFree, dist: cubeDistance(bot, h) };
            })
            .filter(c => c.check.canGrow && c.isFree)
            .sort((a, b) => {
                // Prefer lower levels first (foundation building)
                if (a.hex.currentLevel !== b.hex.currentLevel) {
                    return a.hex.currentLevel - b.hex.currentLevel;
                }
                // Then prefer closer to bot
                return a.dist - b.dist;
            });
        
        if (candidates.length > 0) {
            targetHex = candidates[0].hex;
        }
    }
    
    // V72: Step 4 - If no target near tower, expand search
    if (!targetHex && masterTower) {
        const widerArea = index.getHexesInRange(masterTower, PYRAMID_BASE_RADIUS + 2);
        for (const h of widerArea) {
            if (h.structureType === 'VOID') continue;
            const hNeighbors = getNeighbors(h.q, h.r);
            const check = checkGrowthCondition(h, bot, hNeighbors, grid, occupied, queueSize);
            if (check.canGrow) {
                const occupant = index.getEntityAt(h.q, h.r);
                if (!occupant || occupant.id === bot.id) {
                    targetHex = h;
                    break;
                }
            }
        }
    }
    
    // V72: Step 5 - Ultimate fallback: build anywhere valid
    if (!targetHex) {
        const allHexes = Object.values(grid);
        for (const h of allHexes) {
            if (h.structureType === 'VOID') continue;
            const hNeighbors = getNeighbors(h.q, h.r);
            const check = checkGrowthCondition(h, bot, hNeighbors, grid, occupied, queueSize);
            if (check.canGrow) {
                const occupant = index.getEntityAt(h.q, h.r);
                if (!occupant || occupant.id === bot.id) {
                    targetHex = h;
                    break;
                }
            }
        }
    }
    
    // V72: Step 6 - Execute
    if (targetHex) {
        const dist = cubeDistance(bot, targetHex);
        
        if (dist === 0) {
            // Should have been caught above, but double-check
            const neighbors = getNeighbors(bot.q, bot.r);
            const check = checkGrowthCondition(targetHex, bot, neighbors, grid, occupied, queueSize);
            if (check.canGrow) {
                return { 
                    action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, 
                    debug: `Build L${targetHex.currentLevel + 1}`, 
                    memory: { ...mem, stuckCounter: 0, projectFailCount: 0, waitCounter: 0 } 
                };
            }
        }
        
        return executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Build Move');
    }
    
    // V72: Nothing to build - switch to gather mode
    mem.mode = 'GATHER';
    return executeMinerScenario(bot, mem, grid, index, stateVersion, navObstacles, allBots);
};

// ==========================================
// SCENARIO 2: THE MINER (Gatherer)
// V72: Local-first digging with smart resource management
// ==========================================
const executeMinerScenario = (
    bot: Entity, 
    mem: BotMemory, 
    grid: Record<string, Hex>, 
    index: WorldIndex,
    stateVersion: number,
    navObstacles: HexCoord[],
    allBots: Entity[]
): AiResult => {

    const currentHex = grid[getHexKey(bot.q, bot.r)];
    
    // V72: Step 1 - Try to dig on CURRENT hex first
    if (currentHex && currentHex.structureType !== 'VOID') {
        const neighbors = getNeighbors(bot.q, bot.r);
        const check = checkDigCondition(currentHex, bot, neighbors, grid);
        
        if (check.canGrow) {
             return { 
                 action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, 
                 debug: `Dig L${currentHex.currentLevel - 1}`, 
                 memory: { ...mem, stuckCounter: 0, projectFailCount: 0, waitCounter: 0 } 
             };
        }
    }
    
    // V72: Step 2 - Find shared quarry location
    let quarry: Hex | null = null;
    let deepestLevel = 0;
    
    // Find deepest quarry among all bots
    for (const b of [bot, ...allBots]) {
        const qKey = b.memory?.quarryKey || b.memory?.sharedQuarryKey;
        if (qKey && grid[qKey] && grid[qKey].structureType !== 'VOID') {
            const q = grid[qKey];
            if (q.currentLevel < deepestLevel) {
                deepestLevel = q.currentLevel;
                quarry = q;
            }
        }
    }
    
    // Use bot's own quarry if no shared one
    if (!quarry && mem.quarryKey && grid[mem.quarryKey]) {
        quarry = grid[mem.quarryKey];
    }
    
    // Create quarry at current location if none exists
    if (!quarry && currentHex) {
        mem.quarryKey = currentHex.id;
        mem.sharedQuarryKey = currentHex.id;
        quarry = currentHex;
    }
    
    // V72: Step 3 - Find best dig target
    let targetHex: Hex | null = null;
    
    if (quarry) {
        // Search around quarry for diggable hexes
        const searchRadius = mem.botRole === 'DIGGER' ? 3 : 2;
        const quarryArea = index.getHexesInRange(quarry, searchRadius);
        
        let bestScore = -999;
        for (const hex of quarryArea) {
            if (hex.structureType === 'VOID') continue;
            
            const check = checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid);
            if (!check.canGrow) continue;
            
            const occupant = index.getEntityAt(hex.q, hex.r);
            if (occupant && occupant.id !== bot.id) continue;
            
            // V72: Score - prefer deeper hexes AND closer to bot
            const depthScore = -hex.currentLevel * 5; // Deeper = more resources
            const distScore = -cubeDistance(bot, hex) * 2; // Closer = less movement cost
            const score = depthScore + distScore;
            
            if (score > bestScore) {
                bestScore = score;
                targetHex = hex;
            }
        }
    }
    
    // V72: Step 4 - Search wider if no target found
    if (!targetHex) {
        const allHexes = Object.values(grid);
        for (const hex of allHexes) {
            if (hex.structureType === 'VOID') continue;
            
            const check = checkDigCondition(hex, bot, getNeighbors(hex.q, hex.r), grid);
            if (!check.canGrow) continue;
            
            const occupant = index.getEntityAt(hex.q, hex.r);
            if (occupant && occupant.id !== bot.id) continue;
            
            // Prefer closer hexes
            const dist = cubeDistance(bot, hex);
            if (dist <= 3) {
                targetHex = hex;
                break;
            }
        }
    }
    
    // V72: Step 5 - Execute
    if (targetHex) {
        const dist = cubeDistance(bot, targetHex);
        
        if (dist === 0) {
            const neighbors = getNeighbors(bot.q, bot.r);
            const check = checkDigCondition(targetHex, bot, neighbors, grid);
            if (check.canGrow) {
                return { 
                    action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, 
                    debug: `Dig L${targetHex.currentLevel - 1}`, 
                    memory: { ...mem, stuckCounter: 0, projectFailCount: 0, waitCounter: 0 } 
                };
            }
        }
        
        return executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Mine Move');
    }
    
    // V72: Nothing to dig - try to build or wait
    // Check if we can build instead
    if (currentHex && currentHex.structureType !== 'VOID') {
        const neighbors = getNeighbors(bot.q, bot.r);
        const occupied = index.getOccupiedHexesList();
        const check = checkGrowthCondition(currentHex, bot, neighbors, grid, occupied, 2);
        if (check.canGrow) {
            mem.mode = 'BUILD';
            return { 
                action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, 
                debug: 'Switch to Build', 
                memory: { ...mem, stuckCounter: 0, waitCounter: 0 } 
            };
        }
    }
    
    // V72: Last resort - minimal recover
    if (bot.moves === 0 && bot.coins < MOVE_COST_COINS && currentHex && !bot.recoveredCurrentHex) {
        return { 
            action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'RECOVER', stateVersion }, 
            debug: 'Minimal Recover', 
            memory: { ...mem, stuckCounter: 0, waitCounter: 0 } 
        };
    }
    
    return { action: { type: 'WAIT', stateVersion }, debug: 'Gather Wait', memory: { ...mem, waitCounter: (mem.waitCounter || 0) + 1 } };
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
    
    // V71: Check if we've been waiting too much
    const currentWaitCount = mem.waitCounter || 0;
    
    const path = findPath({q:bot.q, r:bot.r}, target, grid, bot.playerLevel, obstacles);
    
    if (path && path.length > 0) {
        if (calculateMovementCost(bot, path, grid).canAfford) {
            return { action: { type: 'MOVE', path, stateVersion }, debug: debugLabel, memory: { ...mem, stuckCounter: 0, waitCounter: 0 } };
        } else if (calculateMovementCost(bot, [path[0]], grid).canAfford) {
            return { action: { type: 'MOVE', path: [path[0]], stateVersion }, debug: 'Creep', memory: { ...mem, stuckCounter: 0, waitCounter: 0 } };
        }
    }

    // V72: Progressive unstuck strategy - more aggressive
    mem.stuckCounter = (mem.stuckCounter || 0) + 1;
    
    // Level 1: Try any valid neighbor immediately
    const neighbors = getNeighbors(bot.q, bot.r);
    const valid = neighbors.filter(n => {
        const h = grid[getHexKey(n.q, n.r)];
        return h && h.structureType !== 'VOID' && !obstacles.some(o => o.q === n.q && o.r === n.r);
    });
    
    // Sort by distance to target (closer is better)
    valid.sort((a, b) => cubeDistance(a, target) - cubeDistance(b, target));
    
    for (const n of valid) {
        if (calculateMovementCost(bot, [n], grid).canAfford) {
            return { action: { type: 'MOVE', path: [n], stateVersion }, debug: 'Unstuck', memory: { ...mem, stuckCounter: 0, waitCounter: 0 } };
        }
    }
    
    // V72: Force movement after max wait cycles - try ANY neighbor
    if (currentWaitCount >= MAX_WAIT_CYCLES) {
        for (const n of neighbors) {
            const h = grid[getHexKey(n.q, n.r)];
            if (h && h.structureType !== 'VOID') {
                if (calculateMovementCost(bot, [n], grid).canAfford) {
                    return { action: { type: 'MOVE', path: [n], stateVersion }, debug: 'Force Move', memory: { ...mem, stuckCounter: 0, waitCounter: 0 } };
                }
            }
        }
    }

    // V72: If completely stuck, try to dig
    const currentHex = grid[getHexKey(bot.q, bot.r)];
    if (currentHex && currentHex.structureType !== 'VOID') {
        const digCheck = checkDigCondition(currentHex, bot, neighbors, grid);
        if (digCheck.canGrow) {
            return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Stuck Dig', memory: { ...mem, stuckCounter: 0, waitCounter: 0 } };
        }
    }

    // Increment wait counter
    return { action: { type: 'WAIT', stateVersion }, debug: 'Blocked', memory: { ...mem, waitCounter: currentWaitCount + 1 } };
};
