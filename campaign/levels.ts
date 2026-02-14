
import { LevelConfig } from './types';
import { getHexKey, getNeighbors, cubeDistance } from '../services/hexUtils';
import { GAME_CONFIG } from '../rules/config';

// Helper to check if player is stranded (No moves, No money, No recovery option)
const isStranded = (state: any) => {
    return state.player.moves <= 0 && state.player.coins < GAME_CONFIG.EXCHANGE_RATE_COINS_PER_MOVE && !state.player.recoveredCurrentHex;
};

export const CAMPAIGN_LEVELS: LevelConfig[] = [
  {
    id: '1.1',
    title: 'Сим 1.1: Протокол Экспансии',
    description: 'Миссия: Захватить 3 НОВЫХ сектора.\n\nЮниту нужен плацдарм. Захватите 3 соседних Нейтральных Сектора (Ур.0), чтобы создать периметр.\n\nМетод: Перейдите на нейтральный гекс и используйте УЛУЧШЕНИЕ (Желтая кнопка), чтобы построить Уровень 1 (Цена: 1 Мат.).\n\nВНИМАНИЕ: Материалы ограничены. Используйте их для расширения.',
    
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
      materials: 5 // Increased from 4 to 5 to allow 2 mistakes/upgrades
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
        // Loss if: Out of materials AND goal not met OR Stranded
        if (state.player.storage <= 0 && ownedCount < 4) return true;
        if (isStranded(state)) return true;
        return false;
      }
    }
  },
  {
    id: '1.2',
    title: 'Сим 1.2: Твердая Почва',
    description: 'Цель: Достичь Столицы.\n\nСКАНЕР: Обнаружен безопасный путь (Прочность 3). Следуйте ему через пустоту.\n\nОПАСНОСТЬ: Окружение НЕСТАБИЛЬНО (Прочность 1). Сход с пути вызывает мгновенный обвал и потерю Ранга.\n\nПРОВАЛ: Падение Ранга до 1.',
    
    // Logic handled by mapGenerator.ts
    mapConfig: {
      size: 8, 
      type: 'fixed', 
      generateWalls: false
    },

    startState: {
      credits: 0, 
      moves: 20,  
      rank: 5, // Start Rank 5
      materials: 0
    },

    aiMode: 'none', 

    hooks: {
      checkWinCondition: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        return !!(playerHex && playerHex.structureType === 'CAPITAL');
      },
      checkLossCondition: (state) => {
        // Loss if Rank drops to 1 (Player cannot sustain another hit)
        if (state.player.playerLevel <= 1) return true;
        if (isStranded(state)) return true;
        return false;
      }
    }
  },
  {
    id: '1.3',
    title: 'Сим 1.3: Опорные Конструкции',
    description: 'Протокол: Вертикальная Стройка.\n\nЦель: Улучшить Центр до Ур. 2.\n\nПравило: Нельзя строить выше без фундамента. Гексу нужно минимум 2 соседа того же уровня для улучшения.\n\nЗадача: Постройте 2 соседа Ур. 1 используя выданные материалы, затем улучшите центр.',
    
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
          
          // Voids ring (Radius 2)
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
      credits: 300,  
      moves: 10,     
      rank: 2,
      materials: 3 // EXACTLY 3 materials needed: 2 for supports (L0->L1), 1 for center (L1->L2).
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
          if (state.player.storage <= 0 && center.maxLevel < 2) return true;
          if (isStranded(state)) return true;
          return false;
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
                          reason: "НЕУСТОЙЧИВО! Улучшите 2 соседей до Ур. 1."
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
    title: 'Сим 1.4: Раскопки',
    description: 'Протокол: Ресурсный Цикл.\n\nЦель: Улучшить Центр до Ур. 3.\n\nПроблема: У вас 0 Материалов. Стройка невозможна.\n\nРешение: РАСКОПКИ (Красная кнопка). Копайте окружающие холмы (Ур. 2), чтобы добыть +1 Мат. Используйте их для улучшения центра.',
    
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
      checkLossCondition: (state) => {
          const center = state.grid[getHexKey(0,0)];
          // If stuck and goal not met
          if (isStranded(state) && center.maxLevel < 3) return true;
          return false;
      },
      onBeforeAction: (state, action) => {
          // Force player to learn Digging if they try to upgrade without material
          if (action.type === 'UPGRADE' && state.player.storage === 0 && action.intent !== 'RECOVER') {
             return { ok: false, reason: "НЕТ МАТЕРИАЛОВ! Копайте холмы (Ур.2)." };
          }
          return { ok: true };
      }
    }
  },
  {
    id: '1.5',
    title: 'Сим 1.5: Кислородный Марш',
    description: 'Протокол: Экстренное Восстановление.\n\nЦель: Собрать 150 Кред. за 60с.\n\nПравило: Восстановление доступно 1 раз за визит. Вы должны СДВИНУТЬСЯ, чтобы сбросить инструмент.\n\nМетод: Используйте ВОССТАНОВЛЕНИЕ (Синяя кнопка) на высоких секторах. Высота дает больше Денег.\n\nВНИМАНИЕ: Высокие (Ур. 4+) сектора перегреваются (КД 15с). Перемещайтесь между пиками.',
    
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
      moves: 6, // Increased to 6 to allow direct travel to L5 (Cost 1+5) OR Recovery strategy
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
          if (isStranded(state)) return true;
          return false;
      }
    }
  },
  {
    id: '1.6',
    title: 'Сим 1.6: Архитектор',
    description: 'Протокол: Бой.\n\nЦель: Достичь Уровня 4 раньше соперника.\n\nБот "Архитектор V18" активен. Он умеет Копать материалы и Строить опоры. Сражайтесь за ограниченное пространство.',
    
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
           if (state.bots.some(b => b.playerLevel >= 4)) return true;
           if (isStranded(state)) return true;
           return false;
      }
    }
  }
];
