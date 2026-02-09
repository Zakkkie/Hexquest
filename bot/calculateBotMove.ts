
import { Entity, Hex, HexCoord, WinCondition, BotAction, Difficulty, BotMemory } from '../types';
import { GAME_CONFIG, DIFFICULTY_SETTINGS } from '../rules/config';
import { getHexKey, cubeDistance, findPath, getNeighbors } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';
import { WorldIndex } from '../engine/WorldIndex';
import { calculateMovementCost } from '../rules/movement';
import { findNextConstructionTarget, findNextExcavationTarget } from './planning';

export interface AiResult {
    action: BotAction | null;
    debug: string;
    memory: BotMemory;
}

// CONFIG FOR DISPERSAL
const SETTLING_TIME_MS = 15000; // Reduced to 15 seconds for faster setup
const MIN_DIST_FROM_CENTER = 8; // Reduced for tighter gameplay
const MIN_DIST_FROM_OTHERS = 5;  // Reduced personal space
const MOVE_COST_COINS = 5;
const PROJECT_STUCK_LIMIT = 5;

// V60: Cooperative AI Config
const COOPERATION_RADIUS = 4; // Distance within which bots cooperate
const AGGRESSOR_TRIGGER_LEVEL = 4; // Player level that triggers aggressor
const AGGRESSOR_DEACTIVATE_LEVEL = 3; // Level at which aggressor stops

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

// V60: Determine bot role based on situation
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
    
    if (shouldAggress) {
        // Assign one bot as aggressor (the one closest to player's highest hex)
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
                return;
            }
        }
    } else if (mem.aggressorActive && !shouldAggress) {
        // Deactivate aggressor mode
        mem.aggressorActive = false;
        mem.botRole = 'BUILDER';
        mem.mode = 'GATHER';
        mem.targetPlayerHexId = null;
    }
    
    // Normal role assignment if not aggressor
    if (mem.botRole === 'AGGRESSOR' && !shouldAggress) {
        mem.botRole = 'BUILDER';
    }
    
    // If no role assigned, assign based on bot index
    if (!mem.botRole) {
        const botIndex = parseInt(bot.id.split('-')[1] || '1');
        if (botIndex % 2 === 0) {
            mem.botRole = 'DIGGER';
        } else {
            mem.botRole = 'BUILDER';
        }
    }
    
    // V60: Cooperative target sharing - find nearby bots and share targets
    if (otherBots.length > 0 && mem.homeBase) {
        const nearbyBots = otherBots.filter(b => {
            if (!b.memory?.homeBase) return false;
            return cubeDistance(mem.homeBase!, b.memory.homeBase) <= COOPERATION_RADIUS;
        });
        
        if (nearbyBots.length > 0) {
            // Share tower target with nearby bots (use the highest existing tower)
            let sharedTower = mem.sharedTowerKey ? grid[mem.sharedTowerKey] : null;
            
            if (!sharedTower || sharedTower.structureType === 'VOID') {
                // Find highest tower among cooperating bots
                let highestLevel = -1;
                for (const b of [bot, ...nearbyBots]) {
                    const towerKey = b.memory?.towerKey;
                    if (towerKey) {
                        const tower = grid[towerKey];
                        if (tower && tower.maxLevel > highestLevel && tower.structureType !== 'VOID') {
                            highestLevel = tower.maxLevel;
                            sharedTower = tower;
                        }
                    }
                }
                
                if (sharedTower) {
                    mem.sharedTowerKey = sharedTower.id;
                }
            }
            
            // Share quarry target
            if (!mem.sharedQuarryKey) {
                const diggerBot = nearbyBots.find(b => b.memory?.botRole === 'DIGGER');
                if (diggerBot?.memory?.quarryKey) {
                    mem.sharedQuarryKey = diggerBot.memory.quarryKey;
                }
            }
        }
    }
};

/**
 * AI V60: "Cooperative Conquerors"
 * - Focused Tower Building: Each bot focuses on maximizing one tower height
 * - Deep Pit Excavation: Dedicated quarry points for efficient material gathering
 * - Cooperative Building: Bots share targets and help each other
 * - Aggressor Role: Attacks player hexes when player reaches high levels
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
          
          // V60: Use shared tower if available from cooperative bots
          if (mem.sharedTowerKey && grid[mem.sharedTowerKey] && grid[mem.sharedTowerKey].structureType !== 'VOID') {
              mem.towerKey = mem.sharedTowerKey;
          } else {
              mem.towerKey = getHexKey(bot.q, bot.r);
              mem.sharedTowerKey = mem.towerKey;
          }
          
          // V60: Deep pit quarry - further out for deeper digging potential
          const quarryDist = 8; // Increased distance for deeper pit potential
          const qQ = Math.round(bot.q + quarryDist * Math.cos(mem.migrationAngle));
          const qR = Math.round(bot.r + quarryDist * Math.sin(mem.migrationAngle));
          
          // Use shared quarry if available
          if (mem.sharedQuarryKey && grid[mem.sharedQuarryKey]) {
              mem.quarryKey = mem.sharedQuarryKey;
              const [qq, qr] = mem.quarryKey.split(',').map(Number);
              mem.quarrySite = { q: qq, r: qr };
          } else {
              mem.quarryKey = getHexKey(qQ, qR); 
              mem.quarrySite = { q: qQ, r: qR };
              mem.sharedQuarryKey = mem.quarryKey;
          }
          
          // V60: Set initial mode based on role
          mem.mode = mem.botRole === 'DIGGER' ? 'GATHER' : 'BUILD';
          return { action: { type: 'WAIT', stateVersion }, debug: `Base Established (${mem.botRole})`, memory: mem };
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
    // V60: Prioritize shared tower for cooperative building
    let masterTower: Hex | null = null;
    
    if (mem.sharedTowerKey && grid[mem.sharedTowerKey] && grid[mem.sharedTowerKey].structureType !== 'VOID') {
        masterTower = grid[mem.sharedTowerKey];
    } else if (mem.towerKey) {
        masterTower = grid[mem.towerKey];
    }
    
    // If master tower is destroyed/void, pick a new spot nearby
    if (!masterTower || masterTower.structureType === 'VOID') {
        const candidates = index.getHexesInRange(mem.homeBase!, 3);
        masterTower = candidates.find(h => h.structureType !== 'VOID') || grid[getHexKey(bot.q, bot.r)];
        mem.towerKey = masterTower.id;
        mem.sharedTowerKey = masterTower.id;
    }

    // 2. Use Recursive Planner to find the specific brick we need to lay right now
    const nextBrick = findNextConstructionTarget(masterTower, bot, grid, index, difficulty);
    const targetHex = nextBrick || masterTower; // Fallback to master if calculation fails

    // 3. Execution Logic
    const dist = cubeDistance(bot, targetHex);
    
    // A. At Target
    if (dist === 0) {
        const neighbors = getNeighbors(bot.q, bot.r);
        const occupied = index.getOccupiedHexesList();
        const queueSize = DIFFICULTY_SETTINGS[difficulty]?.queueSize || 2;
        
        // Try Build
        if (checkGrowthCondition(targetHex, bot, neighbors, grid, occupied, queueSize).canGrow) {
            return { action: { type: 'UPGRADE', coord: {q:bot.q, r:bot.r}, intent: 'UPGRADE', stateVersion }, debug: 'Build', memory: { ...mem, stuckCounter: 0, projectFailCount: 0 } };
        } 
        
        // Stuck at target?
        mem.projectFailCount = (mem.projectFailCount || 0) + 1;
        if (mem.projectFailCount > PROJECT_STUCK_LIMIT) {
            // Shift project center randomly to unblock
            const neighbors = getNeighbors(bot.q, bot.r);
            const n = neighbors[Math.floor(Math.random()*neighbors.length)];
            if(n) mem.towerKey = getHexKey(n.q, n.r);
            return { action: { type: 'WAIT', stateVersion }, debug: 'Shift Plan', memory: { ...mem, projectFailCount: 0 } };
        }
    }

    // B. Move to Target
    return executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Commute');
};

// ==========================================
// SCENARIO 2: THE MINER (Gatherer)
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
    // V60: Use shared quarry for cooperative digging
    let quarry: Hex | null = null;
    
    if (mem.sharedQuarryKey && grid[mem.sharedQuarryKey]) {
        quarry = grid[mem.sharedQuarryKey];
    } else if (mem.quarryKey) {
        quarry = grid[mem.quarryKey];
    }
    
    // If quarry voided or missing, stick to current site or find new
    if (!quarry) {
        if (mem.quarrySite) {
             const key = getHexKey(mem.quarrySite.q, mem.quarrySite.r);
             if (grid[key]) {
                 mem.quarryKey = key;
                 mem.sharedQuarryKey = key;
             }
        }
        if (!mem.quarryKey) {
            mem.quarryKey = getHexKey(bot.q, bot.r);
            mem.sharedQuarryKey = mem.quarryKey;
        }
        quarry = grid[mem.quarryKey!];
    }

    // 2. Recursive Planner for Digging (Deep pit strategy)
    // V60: Focus on digging deep at the quarry center
    let targetHex = quarry;
    
    // Try to find the deepest possible dig spot at quarry
    if (quarry) {
        const nextDigSpot = findNextExcavationTarget(quarry, bot, grid, index);
        if (nextDigSpot) {
            targetHex = nextDigSpot;
        } else if (quarry.currentLevel > -4) {
            // If quarry not deep enough, dig it deeper
            targetHex = quarry;
        }
    }
    
    targetHex = targetHex || grid[getHexKey(bot.q, bot.r)];

    // 3. Execution
    const dist = cubeDistance(bot, targetHex);

    // A. At Target
    if (dist === 0) {
        const neighbors = getNeighbors(bot.q, bot.r);
        if (checkDigCondition(targetHex, bot, neighbors, grid).canGrow) {
             return { action: { type: 'DIG', coord: {q:bot.q, r:bot.r}, stateVersion }, debug: 'Mine', memory: { ...mem, stuckCounter: 0, projectFailCount: 0 } };
        }
        // Stuck?
        mem.projectFailCount = (mem.projectFailCount || 0) + 1;
        if (mem.projectFailCount > 3) {
             // Move quarry slightly
             const neighbors = getNeighbors(bot.q, bot.r);
             const n = neighbors[Math.floor(Math.random()*neighbors.length)];
             if(n) mem.quarryKey = getHexKey(n.q, n.r);
             return { action: { type: 'WAIT', stateVersion }, debug: 'Shift Mine', memory: { ...mem, projectFailCount: 0 } };
        }
    }

    // B. Move to Target
    return executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Go Mine');
};

// ==========================================
// SCENARIO 3: THE AGGRESSOR (Attacker)
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
        }
    }
    
    // No valid target - deactivate aggressor mode
    if (!targetHex || targetHex.maxLevel < AGGRESSOR_DEACTIVATE_LEVEL) {
        mem.aggressorActive = false;
        mem.botRole = 'BUILDER';
        mem.mode = 'GATHER';
        mem.targetPlayerHexId = null;
        return { action: { type: 'WAIT', stateVersion }, debug: 'Aggressor: No Target', memory: mem };
    }
    
    // 2. Check if we're at the target
    const dist = cubeDistance(bot, targetHex);
    
    if (dist === 0) {
        // At target - dig it down!
        const neighbors = getNeighbors(bot.q, bot.r);
        
        // Try to dig the hex
        if (checkDigCondition(targetHex, bot, neighbors, grid).canGrow) {
            return { 
                action: { type: 'DIG', coord: {q: bot.q, r: bot.r}, stateVersion }, 
                debug: 'Aggressor: Digging!', 
                memory: { ...mem, stuckCounter: 0 } 
            };
        }
        
        // Can't dig - need supports, try to dig neighbors first
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
        
        // Stuck - wait
        return { action: { type: 'WAIT', stateVersion }, debug: 'Aggressor: Stuck', memory: mem };
    }
    
    // 3. Move to target
    return executeMove(bot, targetHex, grid, navObstacles, stateVersion, mem, 'Aggressor: Approach');
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
