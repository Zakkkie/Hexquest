
import { LevelConfig } from './types';
import { GameEventFactory } from '../engine/events';
import { getHexKey, getNeighbors } from '../services/hexUtils';
import { TEXT } from '../services/i18n';
import { GAME_CONFIG } from '../rules/config';

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  {
    id: '1.1',
    title: 'Sim 1.1: Expansion Protocol',
    description: 'Mission: Secure the sector.\n\nYour unit needs a foothold. Acquire 3 adjacent Neutral Sectors (L0) to establish a perimeter.\n\nMethod: Move to a Neutral hex, then use the UPGRADE action (Amber Button) to build a Level 1 structure (Cost: 1 Material).',
    
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
      materials: 5 // Needed to build 3 L1 sectors
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        // Win Condition: Own 4 hexes (Start + 3 captured)
        const ownedCount = Object.values(state.grid).filter(h => h.ownerId === state.player.id).length;
        return ownedCount >= 4;
      }
    }
  },
  {
    id: '1.2',
    title: 'Sim 1.2: Crumbling Path',
    description: 'Objective: Reach the Extraction Point (Capital).\n\nWARNING: Terrain Integrity Critical.\nThe path is comprised of damaged Level 1 sectors (1 HP). Every time you step OFF a sector, it takes damage and collapses.\n\nNOTE: Your High Rank acts as Armor against Shockwaves. Don\'t run out.',
    
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
        { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true, durability: 1 }, // Trap loop possible
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
      rank: 15, // High rank acts as Health against shockwaves (approx 10 steps)
      materials: 0
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        return !!(playerHex && playerHex.structureType === 'CAPITAL');
      },
      checkLossCondition: (state) => {
        // If player falls into void (rank drops to 0)
        return state.player.playerLevel <= 0;
      }
    }
  },
  {
    id: '1.3',
    title: 'Sim 1.3: Structural Support',
    description: 'Protocol: Vertical Construction.\n\nObjective: Upgrade the Center Sector to Level 2.\n\nRule: You cannot build higher without a foundation. A hex needs at least 2 neighbors at its current level to upgrade.\n\nTask: Build 2 Level 1 neighbors using provided materials, then upgrade the center.',
    
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
      materials: 5 // Needed to build 2x L1 + 1x L2 = 3 materials total.
    },

    aiMode: 'none',

    hooks: {
      checkWinCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          return center && center.maxLevel >= 2;
      },
      onBeforeAction: (state, action) => {
          if (action.type === 'UPGRADE') {
              const hex = state.grid[getHexKey(action.coord.q, action.coord.r)];
              if (hex && hex.maxLevel === 1 && action.intent !== 'RECOVER') {
                  const neighbors = getNeighbors(hex.q, hex.r);
                  const validSupports = neighbors.filter(n => {
                      const h = state.grid[getHexKey(n.q, n.r)];
                      return h && h.maxLevel >= 1 && h.structureType !== 'VOID';
                  });

                  if (validSupports.length < 2) {
                      return {
                          ok: false,
                          reason: "UNSTABLE! Upgrade 2 neighbors to Level 1 first."
                      };
                  }
              }
          }
          return { ok: true };
      }
    }
  },
  {
    id: '1.4',
    title: 'Sim 1.4: Material Excavation',
    description: 'Protocol: Resource Cycle.\n\nObjective: Upgrade Center to Level 3.\n\nProblem: You have 0 Material. You cannot build.\n\nSolution: EXCAVATE (Dig) the surrounding Level 2 mounds. Digging grants +1 Material. Use it to build up the center.',
    
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
      credits: 1000, // Plenty of cash, focusing on Material constraint
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
      onBeforeAction: (state, action) => {
          // Force player to learn Digging if they try to upgrade without material
          if (action.type === 'UPGRADE' && state.player.storage === 0 && action.intent !== 'RECOVER') {
             return { ok: false, reason: "NO MATERIAL! Dig a L2 mound to harvest." };
          }
          return { ok: true };
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
          
          // Bot Side (Will be populated by engine spawn logic or we place here)
          // We let the engine place the bot, but ensure land exists
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

    aiMode: 'basic', // Enables the bot

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
