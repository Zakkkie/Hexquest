
import { WinCondition } from '../types';

export const CAMPAIGN_LEVELS: WinCondition[] = [
  // LEVEL 0: TUTORIAL
  { 
    levelId: 0,  
    botCount: 0, 
    queueSize: 1, 
    targetLevel: 3, 
    targetCoins: 25, 
    winType: 'AND', 
    difficulty: 'EASY',
    label: 'Training Simulation',
    isTutorial: true
  },
  // LEVEL 1
  { 
    levelId: 1,  
    botCount: 1, 
    queueSize: 1, 
    targetLevel: 3, 
    targetCoins: 60, // Снижено со 125 до 60 (легче достичь за счет апгрейдов и пары циклов сбора)
    winType: 'AND',
    difficulty: 'EASY',
    label: 'Sector Patrol'
  },
  // LEVEL 2
  { 
    levelId: 2,  
    botCount: 1, 
    queueSize: 1, 
    targetLevel: 4, 
    targetCoins: 125,  
    winType: 'AND',
    difficulty: 'EASY',
    label: 'Expansion'
  },
  // LEVEL 3
  { 
    levelId: 3,  
    botCount: 2, 
    queueSize: 1, 
    targetLevel: 5, 
    targetCoins: 200,  
    winType: 'AND',
    difficulty: 'MEDIUM',
    label: 'Escalation'
  },
   // LEVEL 4
  { 
    levelId: 4,  
    botCount: 2, 
    queueSize: 2, 
    targetLevel: 5, 
    targetCoins: 250,  
    winType: 'AND',
    difficulty: 'MEDIUM',
    label: 'Conflict'
  },
  // LEVEL 10
  { 
    levelId: 10, 
    botCount: 3, 
    queueSize: 2, 
    targetLevel: 7, 
    targetCoins: 500,  
    winType: 'AND',
    difficulty: 'HARD',
    label: 'Total Domination'
  },
];
