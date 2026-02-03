
import { LevelConfig } from './types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { GAME_CONFIG } from '../rules/config';

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  {
    id: '1.1',
    title: 'Sim 1.1: Expansion Protocol',
    description: 'Mission: Secure 3 NEW sectors.\n\nYour unit needs a foothold. Acquire 3 adjacent Neutral Sectors (L0) to establish a perimeter.\n\nMethod: Move to a Neutral hex, then use the UPGRADE action (Amber Button) to build a Level 1 structure (Cost: 1 Material).\n\nWARNING: You have limited materials. Do not waste them.',
    
    mapConfig: {
      size: 5, 
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          // Player Start (L1)
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Neighbors (L0) - Playable Area
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },

          // --- VOID PERIMETER ---
          { q: 0, r: -2, structureType: 'VOID', revealed: true },
          { q: 1, r: -2, structureType: 'VOID', revealed: true },
          { q: 2, r: -2, structureType: 'VOID', revealed: true },
          { q: 2, r: -1, structureType: 'VOID', revealed: true },
          { q: 2, r: 0, structureType: 'VOID', revealed: true },
          { q: 1, r: 1, structureType: 'VOID', revealed: true },
          { q: 0, r: 2, structureType: 'VOID', revealed: true },
          { q: -1, r: 2, structureType: 'VOID', revealed: true },
          { q: -2, r: 2, structureType: 'VOID', revealed: true },
          { q: -2, r: 1, structureType: 'VOID', revealed: true },
          { q: -2, r: 0, structureType: 'VOID', revealed: true },
          { q: -1, r: -1, structureType: 'VOID', revealed: true },
      ]
    },

    startState: {
      credits: 500, 
      moves: 5,     
      rank: 1,
      materials: 4 // Exact match for default Medium Difficulty storage limit
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        // Win Condition: Own 4 hexes (Start + 3 captured)
        const ownedCount = Object.values(state.grid).filter(h => h.ownerId === state.player.id && h.maxLevel >= 1).length;
        return ownedCount >= 4;
      },
      checkLossCondition: (state) => {
        const ownedCount = Object.values(state.grid).filter(h => h.ownerId === state.player.id && h.maxLevel >= 1).length;
        // If out of materials AND haven't reached the goal, it's impossible to win.
        return state.player.storage <= 0 && ownedCount < 4;
      }
    }
  },
  {
    id: '1.2',
    title: 'Sim 1.2: Crumbling Path',
    description: 'Objective: Reach the Capital Sector (Flag).\n\nHAZARD: "The Snake". The path is comprised of unstable Level 1 sectors. Every time you step OFF a sector, it collapses.\n\nSURVIVAL: Your high Rank acts as armor against the shockwaves. If your Rank hits 0, you die.',
    
    mapConfig: {
      size: 7, 
      type: 'fixed', 
      generateWalls: false,
      customLayout: [
        // Start
        { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true, durability: 6 },
        
        // The Fragile Path (Snake)
        { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true, durability: 1 },
        { q: 2, r: 0, maxLevel: 1, currentLevel: 1, revealed: true, durability: 1 },
        { q: 2, r: -1, maxLevel: 1, currentLevel: 1, revealed: true, durability: 1 },
        { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true, durability: 1 }, 
        { q: 2, r: -2, maxLevel: 1, currentLevel: 1, revealed: true, durability: 1 },
        { q: 3, r: -2, maxLevel: 1, currentLevel: 1, revealed: true, durability: 1 },
        { q: 3, r: -1, maxLevel: 1, currentLevel: 1, revealed: true, durability: 1 },
        { q: 4, r: -1, maxLevel: 1, currentLevel: 1, revealed: true, durability: 1 },
        
        // Goal
        { q: 5, r: -1, maxLevel: 2, currentLevel: 2, revealed: true, structureType: 'CAPITAL' },

        // Voids to constrain movement
        { q: 1, r: 1, structureType: 'VOID', revealed: true },
        { q: 2, r: 1, structureType: 'VOID', revealed: true },
        { q: 3, r: 0, structureType: 'VOID', revealed: true },
        { q: 0, r: -1, structureType: 'VOID', revealed: true },
        { q: 1, r: -2, structureType: 'VOID', revealed: true },
        { q: 3, r: -3, structureType: 'VOID', revealed: true },
        { q: 4, r: -2, structureType: 'VOID', revealed: true },
        { q: 4, r: 0, structureType: 'VOID', revealed: true },
      ]
    },

    startState: {
      credits: 0, 
      moves: 15,  
      rank: 15, 
      materials: 0
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        return !!(playerHex && playerHex.structureType === 'CAPITAL');
      },
      checkLossCondition: (state) => {
        // If player falls into void (rank drops to 0) or stuck
        return state.player.playerLevel <= 0 || (state.player.moves <= 0 && state.player.coins < 5);
      }
    }
  },
  {
    id: '1.3',
    title: 'Sim 1.3: Structural Support',
    description: 'Protocol: Vertical Construction.\n\nObjective: Upgrade the Center Sector to Level 2.\n\nRULE: "Staircase Support". To build L2, you need at least 2 neighbors at L1.\n\nTASK: Use your limited materials to build 2 supports, then upgrade the center.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          // Center (Goal) - Starts L1
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true, durability: 6 },
          
          // Neighbors (L0) - Need to be built
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          
          // Voids ring
          { q: 2, r: -1, structureType: 'VOID', revealed: true },
      ]
    },

    startState: {
      credits: 300,  
      moves: 10,     
      rank: 2,
      // EXACTLY 3 materials needed: 2 for supports (L0->L1), 1 for center (L1->L2).
      materials: 3 
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          return center && center.maxLevel >= 2;
      },
      checkLossCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          // If we ran out of materials and center isn't L2, impossible to win.
          return state.player.storage <= 0 && center.maxLevel < 2;
      }
    }
  },
  {
    id: '1.4',
    title: 'Sim 1.4: Material Excavation',
    description: 'Protocol: Resource Cycle.\n\nObjective: Upgrade Center to Level 3.\n\nPROBLEM: 0 Materials.\n\nSOLUTION: Use the DIG action (Red Button) on the surrounding Level 2 mounds. Digging grants +1 Material. Use it to build up the center.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          // Center (Goal) - Starts L1
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Surrounding Mounds (L2) - Sources of Material
          { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },

          // Voids to lock arena
          { q: 0, r: -2, structureType: 'VOID', revealed: true },
          { q: 1, r: -2, structureType: 'VOID', revealed: true },
          { q: 2, r: -2, structureType: 'VOID', revealed: true },
          { q: 2, r: -1, structureType: 'VOID', revealed: true },
          { q: 2, r: 0, structureType: 'VOID', revealed: true },
          { q: 1, r: 1, structureType: 'VOID', revealed: true },
          { q: 0, r: 2, structureType: 'VOID', revealed: true },
          { q: -1, r: 2, structureType: 'VOID', revealed: true },
          { q: -2, r: 2, structureType: 'VOID', revealed: true },
          { q: -2, r: 1, structureType: 'VOID', revealed: true },
          { q: -2, r: 0, structureType: 'VOID', revealed: true },
          { q: -1, r: -1, structureType: 'VOID', revealed: true },
      ]
    },

    startState: {
      credits: 1000, 
      moves: 20,
      rank: 3,
      materials: 0 // Enforce digging
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          return center && center.maxLevel >= 3;
      },
      checkLossCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          // Needs 2 upgrades (L1->L2, L2->L3). 
          // If stuck (no moves, no credits) and not done
          if (state.player.moves <= 0 && state.player.coins < 5 && center.maxLevel < 3) return true;
          return false;
      }
    }
  },
  {
    id: '1.5',
    title: 'Sim 1.5: Oxygen Run',
    description: 'Protocol: Emergency Recovery.\n\nObjective: Accrue 150 Coins in 60s.\n\nStatus: Fuel Low. Funds Low.\n\nMethod: Use the RECOVER action (Blue Button) on High-Level sectors. Higher levels yield more Credits and Moves.',
    
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: false,
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // High Value targets nearby
          { q: 2, r: 0, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: -2, r: 0, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 0, r: 2, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          { q: 0, r: -2, maxLevel: 5, currentLevel: 5, ownerId: 'player-1', revealed: true },
          
          // Connectors
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          
          // Fillers
          { q: 1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },

    startState: {
      credits: 0,
      moves: 5, // Just enough to reach a node
      rank: 5,
      materials: 0
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          return state.player.coins >= 150;
      },
      checkLossCondition: (state) => {
          const limit = 60 * 1000; 
          const elapsed = Date.now() - state.sessionStartTime;
          if (elapsed > limit) return true;
          // Stuck?
          if (state.player.moves <= 0 && !state.player.recoveredCurrentHex && state.player.coins < 5) return true;
          return false;
      }
    }
  },
  {
    id: '1.6',
    title: 'Sim 1.6: The Architect',
    description: 'Protocol: Combat.\n\nObjective: Reach Level 4 before the Rival.\n\nThe Rival Bot "Architect V18" is active. It knows how to Dig for material and build Supports. Compete for limited space.',
    
    mapConfig: {
      size: 4, 
      type: 'fixed',
      generateWalls: true, 
      wallStartRadius: 4,
      customLayout: [
          // Player Side
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          
          // Bot Side
          { q: 0, r: -3, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -2, maxLevel: 1, currentLevel: 1, revealed: true },

          // Central Conflict Zone
          { q: 0, r: 0, maxLevel: 2, currentLevel: 2, revealed: true }, 
          { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
      ]
    },

    startState: {
      credits: 200, 
      moves: 10,
      rank: 1,
      materials: 5
    },

    aiMode: 'basic', 

    hooks: {
      checkWinCondition: (state) => {
          return Object.values(state.grid).some(h => h.ownerId === state.player.id && h.maxLevel >= 4);
      },
      checkLossCondition: (state) => {
           // Loss if Bot reaches L4 first
           return state.bots.some(b => b.playerLevel >= 4);
      }
    }
  }
];
