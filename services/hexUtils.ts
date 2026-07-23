
import { Hex, HexCoord, Entity, PathResult } from '../types';
import { GAME_CONFIG, getLevelConfig, SAFETY_CONFIG } from '../rules/config';
import { getItemDef } from '../rules/items';
import { getMilestoneModifiers } from '../campaign/milestones.ts';

let storeRef: any = null;
export const registerGameStore = (store: any) => {
  storeRef = store;
};

export const getHexKey = (q: number, r: number): string => `${q},${r}`;
export const getCoordinatesFromKey = (key: string): HexCoord => {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
};

// --- OPTIMIZATION: Cache Math Constants ---
const SQRT_3 = Math.sqrt(3);
const SQRT_3_DIV_2 = SQRT_3 / 2;
const ONE_POINT_FIVE = 1.5;
const DEG_TO_RAD = Math.PI / 180;

export const hexToPixel = (q: number, r: number, rotationDegrees: number = 0): { x: number, y: number } => {
  const size = GAME_CONFIG.HEX_SIZE;
  
  // Pre-calculate raw grid position without rotation
  const rawX = size * (SQRT_3 * q + SQRT_3_DIV_2 * r);
  const rawY = size * (ONE_POINT_FIVE * r);

  // Fast path: No rotation (common case)
  if (rotationDegrees === 0) {
    return { 
      x: rawX, 
      y: rawY * 0.8 // Apply perspective squash
    };
  }

  // Rotate
  const angleRad = rotationDegrees * DEG_TO_RAD;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  return { 
    x: rawX * cos - rawY * sin, 
    y: (rawX * sin + rawY * cos) * 0.8 
  };
};

export const cubeDistance = (a: HexCoord, b: HexCoord): number => {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

const NEIGHBOR_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, 
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

export const getNeighbors = (q: number, r: number): HexCoord[] => {
  const neighbors: HexCoord[] = [];
  for (let i = 0; i < 6; i++) {
    const d = NEIGHBOR_DIRECTIONS[i];
    neighbors.push({ q: q + d.q, r: r + d.r });
  }
  return neighbors;
};

export const getSecondsToGrow = (level: number) => getLevelConfig(level).growthTime;

/**
 * Calculates active multipliers and values based on entity status effects.
 * Iterates through all active statuses to apply stacking effects correctly.
 */
export const getStatusModifiers = (actor: Entity, session?: any): {
  moveCostMultiplier: number;
  fogRadius: number;
  digRewardMultiplier: number;
  exchangeRate: number;
  growthAccelerator: number;
  foundationStrength: number;
  economicMultiplier: number;
  diggerLuck: number;
  doubleDigChance: number;
  reserveCapacitor: number;
  turboRecharge: number;
  entropyResistance: number;
  restorationMaster: number;
} => {
  let moveCostMultiplier = 1.0;
  let fogRadius = 2; // Default: Center + 2 Rings
  let digRewardMultiplier = 1.0;
  
  let exchangeRate = GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE;
  let growthAccelerator = 0;
  let foundationStrength = 0;
  let economicMultiplier = 1.0;
  let diggerLuck = 0;
  let doubleDigChance = 0;
  let reserveCapacitor = 0;
  let turboRecharge = 0;
  let entropyResistance = 1.0;
  let restorationMaster = 0;

  const isPlayer = actor && (actor.id === 'player' || actor.id === 'player-1' || actor.id.startsWith('player'));
  const upgrades = session?.campaignUpgrades;
  
  // --- FETCH MILSTONES EXTERNALLY FOR PASSIVES ---
  if (isPlayer) {
      let totalGoldEarned = 0;
      try {
          totalGoldEarned = (storeRef?.getState()?.totalGoldEarned) || session?.totalGoldEarned || 0;
      } catch (e) {
          // Fallback if accessed via tests/headless engine without Zustand
          totalGoldEarned = session?.totalGoldEarned || 0;
      }

      // 0. Economic Milestones Passives (GLOBAL PROGREES)
      if (totalGoldEarned > 0) {
          const milestones = getMilestoneModifiers(totalGoldEarned);
          exchangeRate = Math.max(1, exchangeRate - milestones.extraFuel);
          economicMultiplier += milestones.extraIncomeMult;
          fogRadius += milestones.extraVision;
          reserveCapacitor += milestones.extraRecoveryCharges;
      }
      
      // 1. Upgrades Tree passives
      if (upgrades) {
          fogRadius += upgrades.scanRadius || 0;
          exchangeRate = Math.max(1, exchangeRate - (upgrades.fuelEfficiency || 0));
          growthAccelerator = upgrades.growthAccelerator || 0;
          foundationStrength = upgrades.foundationStrength || 0;
          economicMultiplier += ((upgrades.economicMultiplier || 0) / 100);
          diggerLuck = upgrades.diggerLuck || 0;
          doubleDigChance += (upgrades.doubleDigChance || 0) / 100;
          reserveCapacitor += upgrades.reserveCapacitor || 0;
          turboRecharge = upgrades.turboRecharge || 0;
          entropyResistance -= ((upgrades.entropyResistance || 0) / 100);
          restorationMaster = upgrades.restorationMaster || 0;
      }
  }

  // --- PASSIVE EQUIPMENT BONUSES ---
  if (actor && actor.equipment) {
      for (const [slot, item] of Object.entries(actor.equipment)) {
          if (!item) continue;
          const itemDef = getItemDef(item.baseId);
          if (!itemDef) continue;

          // 1. Armor item maxHpBonus -> passive reality/entropy decay resistance
          if (itemDef.maxHpBonus) {
              const resScale = itemDef.maxHpBonus * 0.0075; // e.g. 50 maxHP = 37.5% resistance
              entropyResistance = Math.max(0.1, entropyResistance - resScale);
              foundationStrength += Math.floor(itemDef.maxHpBonus / 10);
          }

          // 2. Boots item maxEnergyBonus -> moveCostMultiplier reduction & turbo recharge
          if (itemDef.maxEnergyBonus) {
              const energyScale = itemDef.maxEnergyBonus * 0.01; // e.g. 15 energy = 15% cheaper moves
              moveCostMultiplier = Math.max(0.5, moveCostMultiplier - energyScale);
              turboRecharge += Math.floor(itemDef.maxEnergyBonus / 3);
          }

          // 3. Drill/tools reward multiplier
          if (itemDef.idPrefix.includes('drill') || itemDef.idPrefix.includes('pickaxe') || slot === 'tool') {
              if (itemDef.idPrefix.includes('plasma_drill')) {
                  digRewardMultiplier *= 1.5;
                  doubleDigChance += 0.25;
              } else if (itemDef.idPrefix.includes('hornet_drill')) {
                  digRewardMultiplier *= 1.8;
                  doubleDigChance += 0.35;
              } else if (itemDef.idPrefix.includes('pickaxe')) {
                  digRewardMultiplier *= 1.25;
                  doubleDigChance += 0.50;
              } else {
                  digRewardMultiplier *= 1.15;
                  diggerLuck += 1;
              }
          }

          // 4. Rings & Necklaces (economy multiplier)
          if (slot === 'ring' || slot === 'necklace' || itemDef.idPrefix.includes('ring') || itemDef.idPrefix.includes('necklace')) {
              economicMultiplier += 0.20; // +20% coins
              exchangeRate = Math.max(1, exchangeRate - 1); // 1 credit cheaper move recharge
          }

          // 5. Helmets & scannable visors (sensor range boost)
          if (slot === 'head' || itemDef.idPrefix.includes('visor') || itemDef.idPrefix.includes('scanner') || itemDef.idPrefix.includes('helm')) {
              if (itemDef.idPrefix.includes('scanner') || itemDef.idPrefix.includes('visor')) {
                  fogRadius += 2;
              } else {
                  fogRadius += 1;
              }
          }

          // 6. Artifact slots (uncommon/rare/legendary components)
          if (slot === 'artifact' || itemDef.equipSlot === 'artifact') {
              if (itemDef.idPrefix === 'cargo_prism') {
                  growthAccelerator += 2;
              } else if (itemDef.idPrefix === 'chronos_core') {
                  growthAccelerator += 4;
                  turboRecharge += 5;
              } else if (itemDef.idPrefix === 'apex_core') {
                  growthAccelerator += 5;
                  entropyResistance = Math.max(0.05, entropyResistance - 0.5);
                  economicMultiplier += 0.5;
              } else if (itemDef.idPrefix === 'midas_chip') {
                  economicMultiplier += 0.75;
              } else if (itemDef.idPrefix === 'matter_prism') {
                  growthAccelerator += 3;
              } else if (itemDef.idPrefix === 'architect_nanites') {
                  foundationStrength += 3;
                  growthAccelerator += 3;
              } else if (itemDef.idPrefix === 'stability_scanner') {
                  entropyResistance = Math.max(0.1, entropyResistance - 0.3);
              }
          }
      }
  }

  if (!actor || !actor.activeStatuses) return { moveCostMultiplier, fogRadius, digRewardMultiplier, exchangeRate, growthAccelerator, foundationStrength, economicMultiplier, diggerLuck, doubleDigChance, reserveCapacitor, turboRecharge, entropyResistance, restorationMaster };

  const now = Date.now();
  let hasTunnelVision = false;

  for (const status of actor.activeStatuses) {
      if (status.expiresAt && status.expiresAt <= now) continue;

      switch (status.type) {
          case 'STATUS_FATIGUE': {
              // Upgrade: Fatigue Resistance reduces the penalty
              let fatigueMult = 2.0;
              if (isPlayer && upgrades && upgrades.fatigueResistance) {
                  fatigueMult -= (upgrades.fatigueResistance * 0.25); // e.g. 2.0 -> 1.75 -> 1.5
              }
              moveCostMultiplier *= fatigueMult;
              break; }
          case 'STATUS_GOLD_RUSH':
              digRewardMultiplier *= 2.0;
              break;
          case 'STATUS_SCANNER_BUFF':
              fogRadius += 2; // Stacks with multiple scanners
              break;
          case 'STATUS_TUNNEL_VISION':
              hasTunnelVision = true;
              break;
          // Add other status effects here as needed
      }
  }

  // Tunnel Vision overrides all scanner buffs
  if (hasTunnelVision) {
      fogRadius = 0; // Only current hex visible (Center only)
  }

  return { moveCostMultiplier, fogRadius, digRewardMultiplier, exchangeRate, growthAccelerator, foundationStrength, economicMultiplier, diggerLuck, doubleDigChance, reserveCapacitor, turboRecharge, entropyResistance, restorationMaster };
};

/**
 * Min-Heap Priority Queue implementation for O(log n) retrievals
 */
class PriorityQueue<T> {
  private _heap: { node: T; weight: number }[] = [];

  get length(): number {
    return this._heap.length;
  }

  push(node: T, weight: number): void {
    this._heap.push({ node, weight });
    this._bubbleUp();
  }

  pop(): T | undefined {
    if (this.length === 0) return undefined;
    const top = this._heap[0];
    const bottom = this._heap.pop();
    if (this._heap.length > 0 && bottom) {
      this._heap[0] = bottom;
      this._sinkDown();
    }
    return top.node;
  }

  private _bubbleUp(): void {
    let index = this._heap.length - 1;
    const element = this._heap[index];
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      const parent = this._heap[parentIndex];
      if (element.weight >= parent.weight) break;
      this._heap[parentIndex] = element;
      this._heap[index] = parent;
      index = parentIndex;
    }
  }

  private _sinkDown(): void {
    let index = 0;
    const length = this._heap.length;
    const element = this._heap[0];
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const leftChildIdx = 2 * index + 1;
      const rightChildIdx = 2 * index + 2;
      let leftChild, rightChild;
      let swap = null;

      if (leftChildIdx < length) {
        leftChild = this._heap[leftChildIdx];
        if (leftChild.weight < element.weight) {
          swap = leftChildIdx;
        }
      }

      if (rightChildIdx < length) {
        rightChild = this._heap[rightChildIdx];
        if (
          (swap === null && rightChild.weight < element.weight) ||
          (swap !== null && leftChild && rightChild.weight < leftChild.weight)
        ) {
          swap = rightChildIdx;
        }
      }

      if (swap === null) break;
      this._heap[index] = this._heap[swap];
      this._heap[swap] = element;
      index = swap;
    }
  }
}

/**
 * Optimized A* Pathfinding using Min-Heap
 */
export const findPath = (
  start: HexCoord, 
  end: HexCoord, 
  grid: Record<string, Hex>, 
  rank: number, 
  obstacles: HexCoord[],
  hasVoidCore?: boolean,
  ignoreAllRules?: boolean,
  isBot?: boolean,
  isDefenseMode?: boolean
): PathResult => {
  const startKey = getHexKey(start.q, start.r);
  const endKey = getHexKey(end.q, end.r);
  
  // 1. Immediate checks - Return empty array if already at destination (Success, no movement needed)
  if (startKey === endKey) {
    return { path: [] };
  }
  
  // DESTINATION VALIDITY CHECK
  const endHex = grid[endKey];
  if (endHex && endHex.structureType === 'VOID') {
    return { path: null, reason: 'VOID' }; // Cannot move into a hole
  }

  // Quick pre-check distance to avoid searching impossible paths
  if (cubeDistance(start, end) > SAFETY_CONFIG.MAX_PATH_LENGTH) {
    return { path: null, reason: 'TOO_FAR' };
  }

  // O(1) Obstacle Lookup
  const obsKeys = new Set(obstacles.map(o => getHexKey(o.q, o.r)));
  if (obsKeys.has(endKey)) {
    return { path: null, reason: 'OBSTACLE' };
  }

  // 2. Setup Data Structures
  const openSet = new PriorityQueue<string>();
  const cameFrom = new Map<string, HexCoord>();
  const gScore = new Map<string, number>();

  // Initialize
  gScore.set(startKey, 0);
  openSet.push(startKey, cubeDistance(start, end));

  let iterations = 0;
  let blockedByRank = false;
  let blockedByHeight = false;

  // 3. Main Loop
  while (openSet.length > 0) {
    // Safety Break
    if (iterations++ > SAFETY_CONFIG.MAX_SEARCH_ITERATIONS) {
      return { path: null, reason: 'TIMEOUT' };
    }

    const currentKey = openSet.pop()!;
    
    // Safety: Path length check during exploration
    if ((gScore.get(currentKey) || 0) > SAFETY_CONFIG.MAX_PATH_LENGTH) continue;

    if (currentKey === endKey) {
      // Reconstruct Path
      const path: HexCoord[] = [];
      let currKey = endKey;
      while (currKey !== startKey) {
        const coords = getCoordinatesFromKey(currKey);
        path.unshift(coords);
        const parent = cameFrom.get(currKey);
        if (!parent) break; // Should not happen if path exists
        currKey = getHexKey(parent.q, parent.r);
      }
      return { path };
    }

    const currentCoord = getCoordinatesFromKey(currentKey);
    const currentHex = grid[currentKey];
    const currentLevel = currentHex ? currentHex.currentLevel : 0;
    
    // Evaluate Neighbors
    const neighbors = getNeighbors(currentCoord.q, currentCoord.r);
    
    for (const neighbor of neighbors) {
      const nKey = getHexKey(neighbor.q, neighbor.r);
      
      if (obsKeys.has(nKey)) continue;

      const neighborHex = grid[nKey];
      
      // -- Game Rules --
      if (!ignoreAllRules) {
        // 0. Void Check: Cannot enter a destroyed hex
        if (neighborHex && neighborHex.structureType === 'VOID') continue;

        // 1. Rank Check: Cannot enter hex higher than player rank
        if (neighborHex && neighborHex.currentLevel > rank) {
          blockedByRank = true;
          continue; 
        }
        
        // 2. Height/Jump Check: Cannot jump more than 1 level difference
        const nextLevel = neighborHex ? neighborHex.currentLevel : 0;
        if (!hasVoidCore && Math.abs(currentLevel - nextLevel) > 1) {
          blockedByHeight = true;
          continue;
        }

        // Siege mode check: Bots can only move on hexes that are lowered to level 1 and below
        if (isBot) {
          const activeDefenseMode = isDefenseMode !== undefined ? isDefenseMode : !!storeRef?.getState()?.session?.defense?.isDefenseMode;
          if (activeDefenseMode && neighborHex && neighborHex.currentLevel > 1) {
            // Allow the destination/target node of the path itself to be level > 1 
            // so the bot can pathfind adjacent to it
            const isDestination = nKey === endKey;
            if (!isDestination) {
              continue;
            }
          }
        }
      }

      // -- Cost Calculation --
      // Update logic: Positive (>1) costs level. Negative/Flat (<2) costs 1.
      const level = neighborHex ? neighborHex.currentLevel : 0;
      const moveCost = hasVoidCore ? 1 : (level > 1 ? level : 1);
      
      const tentativeG = (gScore.get(currentKey) ?? Infinity) + moveCost;

      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentCoord);
        gScore.set(nKey, tentativeG);
        
        const fScore = tentativeG + cubeDistance(neighbor, end);
        openSet.push(nKey, fScore);
      }
    }
  }

  // No path found
  let finalReason = 'BLOCKED';
  if (blockedByRank) finalReason = 'RANK';
  if (blockedByHeight) finalReason = 'STEEP';
  
  return { path: null, reason: finalReason };
};

/**
 * Finds the optimal route for siege bots to reach the player core (0,0).
 * Chooses the fastest route taking into account standard movement,
 * lowering high hexes (player walls) using DIG, and raising low hexes using UPGRADE.
 */
export const findSiegePath = (
  start: HexCoord, 
  end: HexCoord, 
  grid: Record<string, Hex>,
  botId?: string
): PathResult => {
  const startKey = getHexKey(start.q, start.r);
  const endKey = getHexKey(end.q, end.r);
  
  if (startKey === endKey) {
    return { path: [] };
  }

  const checks = {
    startPos: `(${start.q},${start.r})`,
    endPos: `(${end.q},${end.r})`,
    isSameCell: startKey === endKey,
    endHexIsVoid: false,
    tooFar: false,
    timeout: false,
    maxCostExceeded: false,
    iterations: 0,
    reachableChecked: 0,
    blockedByVoidCount: 0,
    obstaclesEncountered: [] as string[]
  };
  
  const endHex = grid[endKey];
  if (endHex && endHex.structureType === 'VOID') {
    checks.endHexIsVoid = true;
    if (typeof window !== 'undefined') {
      const g = (window as any).__siegeDebugLogs = (window as any).__siegeDebugLogs || {};
      g[botId || 'unknown'] = {
        timestamp: Date.now(),
        botId,
        pathFound: false,
        reason: 'VOID',
        checks
      };
    }
    return { path: null, reason: 'VOID' };
  }

  const startToEndDist = cubeDistance(start, end);
  if (startToEndDist > SAFETY_CONFIG.MAX_PATH_LENGTH) {
    checks.tooFar = true;
    if (typeof window !== 'undefined') {
      const g = (window as any).__siegeDebugLogs = (window as any).__siegeDebugLogs || {};
      g[botId || 'unknown'] = {
        timestamp: Date.now(),
        botId,
        pathFound: false,
        reason: 'TOO_FAR',
        checks
      };
    }
    return { path: null, reason: 'TOO_FAR' };
  }

  const openSet = new PriorityQueue<string>();
  const cameFrom = new Map<string, HexCoord>();
  const gScore = new Map<string, number>();

  gScore.set(startKey, 0);
  openSet.push(startKey, startToEndDist);

  let iterations = 0;
  let reachableChecked = 0;

  while (openSet.length > 0) {
    if (iterations++ > SAFETY_CONFIG.MAX_SEARCH_ITERATIONS) {
      checks.timeout = true;
      checks.iterations = iterations;
      checks.reachableChecked = reachableChecked;
      console.log(`[SIEGE-PATHFINDING] Timeout from (${start.q},${start.r}) to (${end.q},${end.r}). Iterations: ${iterations}`);
      if (typeof window !== 'undefined') {
        const g = (window as any).__siegeDebugLogs = (window as any).__siegeDebugLogs || {};
        g[botId || 'unknown'] = {
          timestamp: Date.now(),
          botId,
          pathFound: false,
          reason: 'TIMEOUT',
          checks
        };
      }
      return { path: null, reason: 'TIMEOUT' };
    }

    const currentKey = openSet.pop()!;
    reachableChecked++;
    
    // Allow slightly higher path costs because of digging/upgrading
    if ((gScore.get(currentKey) || 0) > SAFETY_CONFIG.MAX_PATH_LENGTH * 8) {
      checks.maxCostExceeded = true;
      continue;
    }

    if (currentKey === endKey) {
      const path: HexCoord[] = [];
      let currKey = endKey;
      while (currKey !== startKey) {
        const coords = getCoordinatesFromKey(currKey);
        path.unshift(coords);
        const parent = cameFrom.get(currKey);
        if (!parent) break;
        currKey = getHexKey(parent.q, parent.r);
      }
      checks.iterations = iterations;
      checks.reachableChecked = reachableChecked;
      console.log(`[SIEGE-PATHFINDING] Success from (${start.q},${start.r}) to (${end.q},${end.r}). Path length: ${path.length}. Reachable checked: ${reachableChecked}`);
      if (typeof window !== 'undefined') {
        const g = (window as any).__siegeDebugLogs = (window as any).__siegeDebugLogs || {};
        g[botId || 'unknown'] = {
          timestamp: Date.now(),
          botId,
          pathFound: true,
          reason: 'SUCCESS',
          pathLength: path.length,
          checks,
          reachableChecked
        };
      }
      return { path };
    }

    const currentCoord = getCoordinatesFromKey(currentKey);
    const currentHex = grid[currentKey];
    const currentLevel = currentHex ? currentHex.currentLevel : 0;
    
    const neighbors = getNeighbors(currentCoord.q, currentCoord.r);
    
    for (const neighbor of neighbors) {
      const nKey = getHexKey(neighbor.q, neighbor.r);
      const neighborHex = grid[nKey];
      
      if (neighborHex && neighborHex.structureType === 'VOID') {
        checks.blockedByVoidCount++;
        continue;
      }

      const neighborLevel = neighborHex ? neighborHex.currentLevel : 0;

      // Base weight: 1 point for moving
      let stepCost = 1;
      let obstacleEvent = '';

      // 1. Is it a player wall or elevated tile (level > 1)?
      if (neighborLevel > 1) {
        const digsNeeded = neighborLevel - 1;
        stepCost += digsNeeded * 5;
        obstacleEvent += `WALL(L${neighborLevel}, +${digsNeeded * 5} cost) `;
      }

      // 2. Is there a steep height jump?
      const diff = neighborLevel - currentLevel;
      if (Math.abs(diff) > 1) {
        if (diff > 1) {
          const digsNeeded = neighborLevel - (currentLevel + 1);
          stepCost += digsNeeded * 5;
          obstacleEvent += `UPHILL(L${currentLevel}->L${neighborLevel}, +${digsNeeded * 5} cost) `;
        } else {
          const upgradesNeeded = (currentLevel - 1) - neighborLevel;
          stepCost += upgradesNeeded * 5;
          obstacleEvent += `DOWNHILL(L${currentLevel}->L${neighborLevel}, +${upgradesNeeded * 5} cost) `;
        }
      }

      if (obstacleEvent) {
        checks.obstaclesEncountered.push(`(${neighbor.q},${neighbor.r}): ${obstacleEvent.trim()}`);
        if (checks.obstaclesEncountered.length > 20) {
          checks.obstaclesEncountered.shift(); // keep it small and memory-friendly
        }
      }

      const tentativeG = (gScore.get(currentKey) ?? Infinity) + stepCost;

      if (tentativeG < (gScore.get(nKey) ?? Infinity)) {
        cameFrom.set(nKey, currentCoord);
        gScore.set(nKey, tentativeG);
        
        const distToCore = cubeDistance(neighbor, end);
        const fScore = tentativeG + distToCore;
        openSet.push(nKey, fScore);

        if (obstacleEvent) {
          // obstacle logged in checks.obstaclesEncountered
        }
      }
    }
  }

  checks.iterations = iterations;
  checks.reachableChecked = reachableChecked;
  console.log(`[SIEGE-PATHFINDING] Failed to find path from (${start.q},${start.r}) to (${end.q},${end.r}). Reason: BLOCKED. Reachable checked: ${reachableChecked}`);
  
  if (typeof window !== 'undefined') {
    const g = (window as any).__siegeDebugLogs = (window as any).__siegeDebugLogs || {};
    g[botId || 'unknown'] = {
      timestamp: Date.now(),
      botId,
      pathFound: false,
      reason: 'BLOCKED',
      checks
    };
  }
  return { path: null, reason: 'BLOCKED' };
};

/**
 * Finds all reachable hexes from a starting position given an energy budget.
 * Uses Dijkstra-like BFS with a priority queue.
 */
