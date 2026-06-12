import { LevelConfig, Hex } from '../types';
import { isStranded } from './utils';
import { wrapCampaignLevels } from './scaler';
import { ShapeType } from '../services/shapeUtils';

const SHAPE_TEMPLATES: ShapeType[] = [
  'LINE_3',
  'TRIANGLE_3',
  'SQUARE_4',
  'CROSS_5',
  'RING_6',
  'CROWN_5',
  'HEXAGON_7',
  'HEART_6',
  'STAR_7',
  'PYRAMID_6'
];

/**
 * Generates a perfectly symmetrical hexagon grid.
 * Heights on the starting board scale dynamically with the level number.
 */
function generateSymmetricGrid(levelNum: number): Partial<Hex>[] {
  const list: Partial<Hex>[] = [];
  const radius = 4;
  
  // Base heights on the starting map scale with the level progression in steps of 20
  // Level < 20 starts with 0
  // Level 20+ base starts at Math.floor(levelNum/20) - 1
  const baseLvl = levelNum < 20 ? 0 : Math.floor(levelNum / 20) - 1;
  const targetLvl = levelNum < 20 ? 1 : Math.floor(levelNum / 20);
  
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        let curLevel = baseLvl;
        
        // Rotational and radial symmetrical patterns for heights
        const dist = Math.max(Math.abs(q), Math.abs(r), Math.abs(-q-r));
        if (dist === radius) {
          curLevel = -1; // Outer ring of depleted deep mines
        } else if (dist === 3) {
          // Ring of high towers symmetrically placed
          if ((q * r) % 2 === 0) {
            curLevel = Math.max(0, targetLvl - 1);
          } else {
            curLevel = Math.max(0, baseLvl);
          }
        } else if (dist === 1) {
          curLevel = Math.max(0, baseLvl);
        } else {
          curLevel = Math.max(0, baseLvl);
        }
        
        // Start cell (center) possesses base level
        if (q === 0 && r === 0) {
          curLevel = Math.max(0, baseLvl);
        }
        
        list.push({
          q,
          r,
          currentLevel: curLevel,
          maxLevel: 10,
          revealed: true,
          ownerId: (q === 0 && r === 0) ? 'player-1' : undefined
        });
      }
    }
  }
  return list;
}

const ALL_RAW_LEVELS: LevelConfig[] = [];

for (let i = 1; i <= 200; i++) {
  const seriesId = Math.ceil(i / 10);
  const levelOffset = i % 10 === 0 ? 10 : i % 10;
  
  const shapeType = SHAPE_TEMPLATES[(i - 1) % SHAPE_TEMPLATES.length];
  const targetLevel = i < 20 ? 1 : Math.floor(i / 20);
  
  const id = `${seriesId}.${levelOffset}`;
  
  ALL_RAW_LEVELS.push({
    id,
    title: `Simulation ${id}`,
    description: `Form the shape ${shapeType} at height level L${targetLevel}.`,
    goalText: `Build ${shapeType} at level L${targetLevel}`,
    mapConfig: {
      size: 5,
      type: 'fixed',
      generateWalls: false,
      customLayout: generateSymmetricGrid(i)
    },
    startState: {
      credits: 150 + i * 15,
      moves: 50 + Math.floor(i / 1.5),
      rank: i < 20 ? 1 : Math.min(10, Math.floor(i / 20)),
      materials: 6 + Math.floor(i / 15)
    },
    requiredShapes: [
      {
        type: shapeType,
        level: targetLevel,
        hint: `Build a symmetric ${shapeType} at Level ${targetLevel}+`
      }
    ],
    aiMode: i % 3 === 0 ? 'none' : (i % 3 === 1 ? 'dummy' : 'basic'),
    hooks: {
      checkWinCondition: () => false, // Handled automatically by shape completion in VictorySystem
      checkLossCondition: (state) => isStranded(state)
    }
  });
}

export const CAMPAIGN_LEVELS: LevelConfig[] = wrapCampaignLevels(ALL_RAW_LEVELS);
