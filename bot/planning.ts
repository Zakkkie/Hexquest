
import { Hex, Entity, HexCoord } from '../types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../rules/growth';

export interface HexScore {
  hex: Hex;
  score: number;
  reason: string;
  action: 'BUILD' | 'DIG' | 'CLAIM' | 'AVOID';
  requiredSupport?: Hex; // If this hex is the target, but needs support, this is the sub-target
}

/**
 * Checks if a hex is critical for supporting a higher-level neighbor.
 * Used to prevent bots from digging their own foundations.
 */
const isLoadBearing = (hex: Hex, grid: Record<string, Hex>): boolean => {
    if (!hex) return false;
    const neighbors = getNeighbors(hex.q, hex.r);
    
    for (const n of neighbors) {
        const nHex = grid[getHexKey(n.q, n.r)];
        // If neighbor is higher than me, I might be a support
        if (nHex && nHex.structureType !== 'VOID' && nHex.maxLevel > hex.maxLevel) {
            // Check if removing me (lowering level) would break nHex
            // Logic: Does nHex have enough *other* supports?
            const nNeighbors = getNeighbors(nHex.q, nHex.r);
            let otherSupports = 0;
            for (const nn of nNeighbors) {
                // Don't count myself
                if (nn.q === hex.q && nn.r === hex.r) continue;
                
                const nnHex = grid[getHexKey(nn.q, nn.r)];
                if (nnHex && nnHex.structureType !== 'VOID' && nnHex.maxLevel >= nHex.maxLevel - 1) {
                    otherSupports++;
                }
            }
            // If it has < 2 supports without me, I am load bearing.
            if (otherSupports < 2) return true;
        }
    }
    return false;
};

/**
 * Recursively checks if a target can be built.
 * If not, finds the best dependency (support) and recurses on that.
 * Returns the actual ACTIONABLE hex (the bottom of the dependency chain).
 */
const evaluateBuildChain = (
    target: Hex, 
    bot: Entity, 
    grid: Record<string, Hex>, 
    obstacles: HexCoord[], 
    depth: number = 0
): HexScore | null => {
    // Prevent infinite recursion
    if (depth > 2) return null;

    const neighbors = getNeighbors(target.q, target.r);
    const check = checkGrowthCondition(target, bot, neighbors, grid, obstacles);

    // CASE 1: Actionable immediately
    if (check.canGrow) {
        return { 
            hex: target, 
            score: 0, // Score will be assigned by caller context
            reason: depth === 0 ? 'Direct Build' : `Support L${target.maxLevel}`, 
            action: 'BUILD' 
        };
    }

    // CASE 2: Needs Support
    if (check.missingSupports && check.missingSupports.length > 0) {
        // Convert coords to Hex objects
        const supportHexes = check.missingSupports
            .map(c => grid[getHexKey(c.q, c.r)])
            .filter(h => h && h.structureType !== 'VOID');
        
        // Sort: Highest level first (closest to being a useful support)
        supportHexes.sort((a, b) => b.maxLevel - a.maxLevel);

        for (const support of supportHexes) {
            // Recursively check if we can upgrade the support
            const subResult = evaluateBuildChain(support, bot, grid, obstacles, depth + 1);
            if (subResult) {
                // We found a valid step down the chain
                return {
                    hex: subResult.hex,
                    score: 0, 
                    reason: `Chain: Help L${target.maxLevel} via L${support.maxLevel}`,
                    action: 'BUILD'
                };
            }
        }
    }

    return null;
};

/**
 * Finds bots that are stuck on high ground and returns build targets (neighbors) 
 * that would create a staircase for them to descend.
 */
export const findRescueTargets = (
    bot: Entity,
    grid: Record<string, Hex>,
    allBots: Entity[]
): HexScore[] => {
    const rescueMissions: HexScore[] = [];
    const obstacles: HexCoord[] = allBots.map(b => ({q: b.q, r: b.r}));

    for (const otherBot of allBots) {
        if (otherBot.id === bot.id) continue;

        // Condition for "Stranded":
        // 1. Stuck counter is high (waiting repeatedly)
        // 2. On high ground (> L1)
        // 3. (Optional) No path found recently
        const otherHexKey = getHexKey(otherBot.q, otherBot.r);
        const otherHex = grid[otherHexKey];
        
        const isStranded = otherBot.memory && otherBot.memory.stuckCounter > 3;
        const isHighUp = otherHex && otherHex.maxLevel > 1;

        if (isStranded && isHighUp) {
            // Analyze neighbors of the stranded bot
            const nbs = getNeighbors(otherBot.q, otherBot.r);
            const candidates: Hex[] = [];

            for (const n of nbs) {
                const nHex = grid[getHexKey(n.q, n.r)];
                if (!nHex || nHex.structureType === 'VOID') continue;
                
                // Ideal rescue step is exactly 1 level below the stranded bot
                // OR 1 level below that (to build up to it)
                const heightDiff = otherHex.maxLevel - nHex.maxLevel;
                
                // We want to target hexes that are too low (diff > 1) and raise them.
                if (heightDiff > 1) {
                    candidates.push(nHex);
                }
            }

            // Find the easiest candidate to build up
            // Sort by highest current level (closest to becoming a step)
            candidates.sort((a, b) => b.maxLevel - a.maxLevel);

            for (const candidate of candidates.slice(0, 2)) {
                const chain = evaluateBuildChain(candidate, bot, grid, obstacles);
                if (chain) {
                    chain.score = 200; // Extremely high priority override
                    chain.reason = `RESCUE ${otherBot.id} (Stuck L${otherHex.maxLevel})`;
                    rescueMissions.push(chain);
                }
            }
        }
    }

    return rescueMissions;
};

// New function required by the improved calculateBotMove logic
export const findBestBuildTargets = (
    bot: Entity,
    grid: Record<string, Hex>,
    allBots: Entity[],
    maxResults: number = 5
): HexScore[] => {
    // 0. PRIORITY: Check for Rescue Missions first
    const rescueTargets = findRescueTargets(bot, grid, allBots);
    if (rescueTargets.length > 0) {
        return rescueTargets;
    }

    // 1. Identify potential crowns (owned hexes or nearby claimable ones)
    const candidates = Object.values(grid).filter(h => 
        h.structureType !== 'VOID' && 
        h.structureType !== 'MONUMENT' &&
        cubeDistance(bot, h) < 15
    );

    // Heuristic Sort
    candidates.sort((a, b) => {
        // Highest Level -> Owned -> Closest
        if (b.maxLevel !== a.maxLevel) return b.maxLevel - a.maxLevel;
        const aOwned = a.ownerId === bot.id ? 1 : 0;
        const bOwned = b.ownerId === bot.id ? 1 : 0;
        if (bOwned !== aOwned) return bOwned - aOwned;
        return cubeDistance(bot, a) - cubeDistance(bot, b);
    });

    const results: HexScore[] = [];
    const obstacles: HexCoord[] = allBots.map(b => ({q: b.q, r: b.r}));

    // Check top 10 candidates
    for (const crown of candidates.slice(0, 10)) {
        const chain = evaluateBuildChain(crown, bot, grid, obstacles);
        if (chain) {
            // Scoring logic
            const isCrown = chain.hex.id === crown.id;
            const baseScore = isCrown ? 100 : 80;
            const dist = cubeDistance(bot, chain.hex);
            
            chain.score = baseScore + (crown.maxLevel * 10) - dist;
            
            // Dedupe
            if (!results.some(r => r.hex.id === chain.hex.id)) {
                results.push(chain);
            }
        }
    }
    
    return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
};

// Legacy support if needed, though mostly replaced by findBestBuildTargets
export const findStrategicBuildTarget = (
    bot: Entity,
    grid: Record<string, Hex>,
    allBots: Entity[],
    obstacles: HexCoord[],
    monument?: Hex
): HexScore | null => {
    // Redirect to new logic
    const targets = findBestBuildTargets(bot, grid, allBots, 1);
    return targets.length > 0 ? targets[0] : null;
};

// Base scoring for a hex to see if it's generally desirable to dig
const baseDigScore = (
  hex: Hex,
  bot: Entity,
  grid: Record<string, Hex>
): number => {
  if (isLoadBearing(hex, grid)) return -9999;
  if (hex.ownerId === bot.id && hex.maxLevel > 0) return -500; // Prefer not destroying own high ground
  if (hex.structureType === 'MONUMENT') return -9999;
  
  // AVOID MAP BOUNDARIES (Walls)
  // Usually boundaries are generated at -8. Digging them deeper (-9) is useless and traps bots.
  if (hex.currentLevel <= -7) return -1000;

  let score = 0;
  const dist = cubeDistance(bot, hex);
  score += Math.max(0, 20 - dist); 

  if (hex.currentLevel < 0) {
      // Adjusted Logic:
      // In Skirmish, deep pits (<-5) might contain rare loot, so we incentivize digging.
      // Clamp the depth bonus to prevent bots from obsession with boundaries.
      
      const depth = Math.abs(hex.currentLevel);
      if (depth > 5) {
          // Diminishing returns for extreme depth to prevent boundary obsession
          score += 20; 
      } else {
          score += 30 + depth * 5;
      }
  } else if (hex.currentLevel === 0) {
      score += 10; 
  } else {
      score -= 20; 
  }
  
  return score;
};

export const findBestDigTargets = (
  bot: Entity,
  grid: Record<string, Hex>,
  allBots: Entity[],
  maxResults: number = 3,
  restrictedHexIds?: Set<string>
): HexScore[] => {
  const allHexes = Object.values(grid);
  const candidates: HexScore[] = [];

  for (const hex of allHexes) {
      if (restrictedHexIds && restrictedHexIds.has(hex.id)) continue;
      
      const rawScore = baseDigScore(hex, bot, grid);
      // Skip obviously bad targets
      if (rawScore <= -100) continue;

      // Check Physics/Rules
      const neighbors = getNeighbors(hex.q, hex.r);
      const digCheck = checkDigCondition(hex, bot, neighbors, grid);

      if (digCheck.canGrow) {
          candidates.push({
              hex,
              score: rawScore + 20,
              reason: 'Direct Quarry',
              action: 'DIG'
          });
      } else if (digCheck.missingSupports && digCheck.missingSupports.length > 0) {
          // BLOCKED TARGET LOGIC
          // Do NOT add the blocked hex ('hex') to candidates. It's causing infinite loops where bot waits on it.
          // Instead, STRICTLY target the blockers.
          
          for (const blockerCoord of digCheck.missingSupports) {
              const blockerHex = grid[getHexKey(blockerCoord.q, blockerCoord.r)];
              if (blockerHex && blockerHex.structureType !== 'VOID') {
                  
                  // Check if the blocker itself is actionable
                  const blockerCheck = checkDigCondition(blockerHex, bot, getNeighbors(blockerHex.q, blockerHex.r), grid);
                  
                  if (blockerCheck.canGrow) {
                      // Safety Check: Do not dig load-bearing structures even if they block us
                      if (isLoadBearing(blockerHex, grid) || blockerHex.structureType === 'MONUMENT') continue;

                      // ✅ Recalculate blocker score separately
                      // Do not apply ownership penalty (-500) because we are digging FOR a target
                      let blockerScore = 0;
                      const blockerDist = cubeDistance(bot, blockerHex);
                      blockerScore += Math.max(0, 20 - blockerDist);  // Proximity
                      
                      // Very high priority for blockers
                      blockerScore += 150;  // ← Very High
                      
                      // Ensure positive
                      if (blockerScore < 0) blockerScore = 100;  
                      
                      candidates.push({
                          hex: blockerHex,
                          score: blockerScore,
                          reason: `🚨 CRITICAL BLOCKER: Clear for L${hex.currentLevel}`,
                          action: 'DIG'
                      });
                  }
              }
          }
      }
  }

  // Sort and deduplicate (by hex id)
  const uniqueMap = new Map<string, HexScore>();
  candidates.forEach(c => {
      if (!uniqueMap.has(c.hex.id) || uniqueMap.get(c.hex.id)!.score < c.score) {
          uniqueMap.set(c.hex.id, c);
      }
  });

  return Array.from(uniqueMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
};
