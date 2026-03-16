import { InteriorLevel, InteriorHex, NPC, OverworldEvent } from '../types';
import { getHexKey } from './hexUtils';

export function generateInterior(id: string, parentHexKey: string, seed: number): { level: InteriorLevel, events: OverworldEvent[] } {
  const grid: Record<string, InteriorHex> = {};
  const npcs: NPC[] = [];
  const events: OverworldEvent[] = [];
  
  const radius = 4; // Slightly larger
  
  // 1. Generate grid
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      const key = getHexKey(q, r);
      const isWall = Math.abs(q) === radius || Math.abs(r) === radius || Math.abs(-q-r) === radius;
      
      grid[key] = {
        q,
        r,
        terrainType: isWall ? 'WALL' : 'FLOOR',
        moveCost: isWall ? 999 : 1,
      };
    }
  }
  
  // Add a door at the bottom
  const doorKey = getHexKey(0, radius);
  if (grid[doorKey]) {
    grid[doorKey].terrainType = 'DOOR';
    grid[doorKey].moveCost = 1;
    grid[doorKey].isExit = true;
  }

  // 2. Add some furniture variety
  const furnitureSeeds = [
    { q: -2, r: -1, type: 'BED' },
    { q: 2, r: -2, type: 'SHELF' },
    { q: -1, r: -2, type: 'TABLE' },
    { q: 0, r: -2, type: 'CHAIR' },
    { q: 2, r: 1, type: 'CRATE' },
  ];

  furnitureSeeds.forEach(f => {
    const key = getHexKey(f.q, f.r);
    if (grid[key] && grid[key].terrainType === 'FLOOR') {
      grid[key].terrainType = 'FURNITURE';
      grid[key].furnitureType = f.type as any;
      grid[key].moveCost = 999;
    }
  });
  
  // 3. Add NPCs
  const npcCount = 1 + (Math.abs(Math.floor(Math.sin(seed * 1.5) * 10)) % 2);
  const names = ["Elias", "Sarah", "Kael", "Mara", "Joren", "Lyra", "Finn", "Oria"];
  
  for (let i = 0; i < npcCount; i++) {
    const npcId = `npc_${id}_${i}`;
    const eventId = `event_${npcId}`;
    const name = names[(Math.floor(Math.abs(Math.sin(seed + i) * 1000))) % names.length];
    
    // Find a free spot
    let nq = 0, nr = 0;
    if (i === 0) {
      nq = 0; nr = 0;
    } else {
      nq = i % 2 === 0 ? -2 : 2;
      nr = i % 2 === 0 ? 2 : 0;
    }

    const key = getHexKey(nq, nr);
    if (grid[key] && grid[key].terrainType === 'FLOOR') {
      npcs.push({
        id: npcId,
        name: name,
        q: nq,
        r: nr,
        eventId: eventId
      });
      grid[key].npcId = npcId;

      events.push({
        id: eventId,
        startNodeId: 'start',
        nodes: {
          'start': {
            id: 'start',
            text: i === 0 
              ? `Greetings, traveler. My name is ${name}. Welcome to our home.`
              : `Hello there. I'm ${name}. It's good to see a new face.`,
            choices: [
              { label: "Tell me about this place.", action: 'GOTO_NODE', nextNode: 'info' },
              { label: "Goodbye.", action: 'CLOSE' }
            ]
          },
          'info': {
            id: 'info',
            text: "This settlement has stood for generations. We try to keep the walls strong against the entropy shifts.",
            choices: [
              { label: "I see. Thanks.", action: 'CLOSE' }
            ]
          }
        }
      });
    }
  }
  
  return {
    level: {
      id,
      name: "Building Interior",
      parentHexKey,
      grid,
      npcs
    },
    events
  };
}
