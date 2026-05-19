import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

/**
 * ============================================================================
 *  SERIES 2: MONUMENT & DEEP MINING (6 levels)
 * ============================================================================
 */

export const series2Levels: LevelConfig[] = [

  // ═══════════════════════════════════════════════════════════════════
  //  2.1  THE MONOLITH — Staircase Navigation + Recovery Bootstrap
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.1',
    title: 'Sim 2.1: Монолит',
    description: 'Цель: Неизвестный Шпиль.\n\nЗадача: Доберитесь до Монолита (Центр, Ур. 3). Для его активации НЕ требуются предметы. Просто встаньте на него и нажмите АКТИВИРОВАТЬ в интерфейсе.\n\nПроблема: Прямой путь заблокирован стеной Ур. 4. Найдите лестницу вдоль левого хребта.\n\nСтарт: Топлива почти нет. Используйте ВОССТАНОВЛЕНИЕ (Синяя кнопка) на стартовом гексе, затем отойдите и вернитесь, чтобы сбросить его.\n\nУСЛОВИЕ ПРОИГРЫША: Вы застряли.',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          // GOLDEN PATH
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          // BLOCKER
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          // CHAOS
          { q: 1, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -2, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-21-1-${Date.now()}`,
            text: isRu 
              ? 'ИИ-Помощник: Энергетическая подпись Монолита стабильна. Однако прямой путь к координатам (0,0) преграждает непреодолимый барьер Уровня 4. Используйте левый обходной хребет (высоты 1 → 2 → 3).'
              : 'AI-Assistant: Monolith energy signature is stable. However, a massive Level 4 barrier blocks the direct path to (0,0). Use the western ridge staircase (levels 1 → 2 → 3) to bypass.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Welcome player to the ridge top
        if (state.player.q === -1 && state.player.r === 0 && !(state as any)._visitedRidge) {
          (state as any)._visitedRidge = true;
          state.messageLog.unshift({
            id: `msg-21-ridge-${Date.now()}`,
            text: isRu
              ? 'Датчик: Вы достигли вершины хребта. Монолит прямо перед вами на Уровне 3. Можете заходить на него и Активировать!'
              : 'Sensor: You reached the ridge top. The Monolith is directly ahead at Level 3. Step on it and press Activate!',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        // Secret cache at crater (1, 0)
        if (state.player.q === 1 && state.player.r === 0 && !(state as any)._visitedCrater) {
          (state as any)._visitedCrater = true;
          state.player.coins += 25;
          state.messageLog.unshift({
            id: `msg-21-cache-${Date.now()}`,
            text: isRu
              ? 'ТАЙНИК: В गहरे кратера (1,0) обнаружен забытый контейнер снабжения! Получено +25 Кредитов.'
              : 'CACHE: Deep inside the crater (1,0), a forgotten supply container was scanned! Received +25 Credits.',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.2  BURIED SECRETS — Dig for Loot + Activate Monument
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.2',
    title: 'Sim 2.2: Погребенные Тайны',
    description: 'Сканирование: Под землей обнаружены ключи активации.\n\nЗадача: Соберите ЛЮБЫЕ 3 ПРЕДМЕТА. Встаньте на Монолит, вставьте их в слоты и нажмите АКТИВИРОВАТЬ.\n\nМетод: КОПАЙТЕ (Красная кнопка) ниже Ур. 0. Каждая новая отрицательная глубина дает шанс на добычу. Чем глубже, тем выше шансы.\n\nУСЛОВИЕ ПРОИГРЫША: Вы застряли.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          // STAIRCASE
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          // DIG SITES (4 × L0, near path)
          { q: 1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          // WALLS
          { q: -1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 3, rank: 2, materials: 0 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-22-1-${Date.now()}`,
            text: isRu
              ? 'ИИ-Помощник: Энергетические слоты Монолита пусты. Под слоем почвы на глубинах (-1, -2 и ниже) зафиксированы сигналы древнего хлама. КОПАЙТЕ (Красная кнопка) на гексах Ур. 0 для добычи.'
              : 'AI-Assistant: Monolith energy slots are empty. Ancient garbage signals mapped beneath the surface at depths -1, -2 and below. DIG (Red button) on Level 0 hexes to loot.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Guaranteed loot spot at (-1, 3) on deep dig
        const targetHex = state.grid[getHexKey(-1, 3)];
        if (targetHex && targetHex.currentLevel < 0 && !(state as any)._geothermalGuaranteedLoot) {
          (state as any)._geothermalGuaranteedLoot = true;
          // Inject an item
          if (!state.player.inventory) state.player.inventory = [];
          if (state.player.inventory.length < 5) {
            state.player.inventory.push({
              id: `item-guaranteed-${Date.now()}`,
              baseId: 'fuel_cell',
              rarity: 'COMMON',
              name: isRu ? 'Топливный Элемент' : 'Spent Fuel Cell',
              description: isRu ? 'Увеличивает запас хода.' : 'Increases move capacity.',
              timestamp: Date.now(),
              visualType: 'CYLINDER',
              effectType: 'ADD_MOVES',
              effectValue: 10,
              effectDescription: isRu ? '+10 Ходов' : '+10 Moves'
            } as any);
            state.messageLog.unshift({
              id: `msg-22-guaranteed-${Date.now()}`,
              text: isRu
                ? 'АНОМАЛИЯ: Из глубины гекса (-1, 3) извлечен неповрежденный Топливный Элемент! Настоящий джекпот!'
                : 'ANOMALY: Extracted an intact Spent Fuel Cell from hex (-1, 3)! What a jackpot!',
              type: 'SUCCESS',
              source: 'LOOT',
              timestamp: Date.now()
            });
          }
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.3  ENTROPY RISING — Action Economy Under Pressure
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.3',
    title: 'Sim 2.3: Растущая Энтропия',
    description: 'ВНИМАНИЕ: Сектор крайне нестабилен.\n\nЗадача: Доберитесь до Монолита (Ур. 4) и АКТИВИРУЙТЕ его.\n\nОграничение: Вы начинаете с Рангом 3. Монолит имеет Ур. 4. Вы ПОКА НЕ МОЖЕТЕ на него наступить. Вы должны использовать стартовые материалы, чтобы ПОСТРОИТЬ поддерживающий гекс Ур. 4 рядом, чтобы получить Ранг 4!\n\nМеханика: Каждое действие стоит Энтропии (Начинается с 15). При 0 → катастрофический сдвиг.\n\nУСЛОВИЕ ПРОИГРЫША: Энтропия достигла 0, вы провалились в ПУСТОТУ или застряли.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 4, currentLevel: 4, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          // SHORT PATH (4 actions)
          { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 1, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 1, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
          // LONG PATH (6 actions)
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: -1, maxLevel: 4, currentLevel: 4, revealed: true },
          // CHAOS
          { q: 0, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 2, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: -2, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 2, rank: 3, materials: 4, initialEntropy: 15 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: () => false, 
      checkLossCondition: (state) => {
        const currentHex = state.grid[getHexKey(state.player.q, state.player.r)];
        if (currentHex?.structureType === 'VOID') return true;
        if (state.entropy.current <= 0) return true;
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-23-1-${Date.now()}`,
            text: isRu
              ? 'ЭНТРОПИЙНЫЙ ДАТЧИК: Стабильность ядра: 15%. Каждое действие деградирует структуру. Встаньте на высокий пик (1,2) Уровня 5, чтобы сбросить энтропийный заряд на +20 пунктов!'
              : 'ENTROPY DETECTOR: Core stability: 15%. Every action degrades the local coordinates. Touch the high peak (1,2) of Level 5 to discharge and restore +20 Entropy points!',
            type: 'WARN',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        // Stepping on height 5 at (1, 2) recharges stability!
        if (state.player.q === 1 && state.player.r === 2 && !(state as any)._entropyDischarged) {
          (state as any)._entropyDischarged = true;
          state.entropy.current = Math.min(state.entropy.max ?? 100, state.entropy.current + 20);
          state.messageLog.unshift({
            id: `msg-23-recharge-${Date.now()}`,
            text: isRu
              ? 'РАЗРЯДКА: Высота 5 поглотила флуктуации! Энтропия восстановлена на +20 пунктов.'
              : 'DISCHARGE: Height level 5 absorbed the fluctuations! Entropy restored by +20 points.',
            type: 'SUCCESS',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.4  THE RIVALRY — Race vs Bot (Dig to Bootstrap)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.4',
    title: 'Sim 2.4: Соперничество',
    description: 'УГРОЗА: Приближается враждебная единица.\n\nЗадача: Найдите 2 ПРЕДМЕТА и активируйте Монолит РАНЬШЕ Соперника.\n\nСтарт: Ресурсов почти нет. КОПАЙТЕ участки на своем пути для получения топлива и артефактов. Соперник приближается с севера.\n\nПОРАЖЕНИЕ: Бот достигает Монолита первым ИЛИ вы застряли.',
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 0, r: -3, maxLevel: 2, currentLevel: 2, revealed: true }, // Bot
          // PLAYER PATH
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 0, maxLevel: 3, currentLevel: 3, revealed: true },
          // DIG SITES
          { q: 1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          // BOT PATH
          { q: 0, r: -2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: 0, r: -1, maxLevel: 3, currentLevel: 3, revealed: true },
          // WALLS
          { q: 1, r: 1, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -1, r: -1, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: 1, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
      ]
    },
    aiMode: 'basic',
    botObjective: 'MONUMENT_RACE',
    botSpawnPoints: [{ q: 0, r: -3 }],
    startState: { credits: 0, moves: 2, rank: 2, materials: 0 },
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.bots?.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-24-1-${Date.now()}`,
            text: isRu
              ? 'ОБНАРУЖЕНИЕ: Разведывательный дрон Scout-X4 движется со стороны (0,-3). Он нацелен захватить Монолит. Копайте траншею на (1,3) или (0,2), чтобы получить ход и редкий лут.'
              : 'DETECTION: Recon drone Scout-X4 is moving from (0,-3). It intends to claim the Monolith. Dig at (1,3) or (0,2) to bootstrap moves and find necessary keys!',
            type: 'WARN',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Taunt from bot near the monolith
        const botObj = state.bots?.[0];
        if (botObj && Math.abs(botObj.q) <= 1 && Math.abs(botObj.r) <= 1 && !(state as any)._botTaunted) {
          (state as any)._botTaunted = true;
          state.messageLog.unshift({
            id: `msg-24-taunt-${Date.now()}`,
            text: isRu
              ? 'Scout-X4: Объект Монолит в зоне захвата. Ликвидация органики не приоритетна. Ускоряю активацию.'
              : 'Scout-X4: Object Monolith in capture range. Organic termination non-priority. Accelerating activation protocols.',
            type: 'ERROR',
            source: 'ENEMY_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.5  THE SINGULARITY — Two Bots, Maximum Pressure
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.5',
    title: 'Sim 2.5: Сингулярность',
    description: 'ФИНАЛЬНЫЙ ТЕСТ: Сближаются две враждебные единицы.\n\nЗадача: Соберите 3 ПРЕДМЕТА и активируйте Ядро (Ур. 5) первым.\n\nСтарт: Ресурсов почти нет. КОПАЙТЕ глубоко вдоль своей спирали для получения топлива и артефактов. Два соперника приближаются с севера и востока.\n\nПОРАЖЕНИЕ: Любой бот достигает Монолита первым ИЛИ вы застряли.',
    mapConfig: {
      size: 7, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 3, r: -3, maxLevel: 3, currentLevel: 3, revealed: true }, // Bot 1
          { q: -3, r: 0, maxLevel: 3, currentLevel: 3, revealed: true }, // Bot 2
          // SPIRAL
          { q: -1, r: 4, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 3, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
          { q: -1, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: -1, r: 0, maxLevel: 5, currentLevel: 5, revealed: true },
          // DIG SITES
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: -2, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
          { q: 0, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
          // BOT PATHS
          { q: 2, r: -2, maxLevel: 4, currentLevel: 4, revealed: true },
          { q: 1, r: -1, maxLevel: 5, currentLevel: 5, revealed: true },
          { q: -2, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
          // CHAOS
          { q: 0, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 1, r: 1, maxLevel: 6, currentLevel: 6, revealed: true },
          { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: -2, r: 1, maxLevel: -3, currentLevel: -3, revealed: true },
          { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
          { q: -2, r: 2, maxLevel: 5, currentLevel: 5, revealed: true },
      ]
    },
    aiMode: 'basic',
    botObjective: 'MONUMENT_RACE',
    botSpawnPoints: [{ q: 3, r: -3 }, { q: -3, r: 0 }],
    startState: { credits: 0, moves: 2, rank: 4, materials: 0 },
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.bots?.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-25-1-${Date.now()}`,
            text: isRu
              ? 'СЕНСОРНЫЙ ШКВАЛ: Обнаружены Scout-Alpha и Scout-Beta. Эвакуационный зазор сокращается. Копайте глубоко на спиральных гексах Ур.0 для быстрого набора Moves.'
              : 'SENSOR OVERLOAD: Scout-Alpha and Scout-Beta detected. The evacuation window is closing rapidly. Dig deep on the internal spiral L0 hexes to multiply your Moves.',
            type: 'WARN',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.6  DEEP ECHO — Descend to -5
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.6',
    title: 'Sim 2.6: Глубинное Эхо',
    description: 'Цель: Опуститесь на глубину -5. Используйте укрепления, чтобы избежать обвала. Глубокие слои нестабильны, но хранят древние артефакты.',
    goalText: 'Достигните глубины -5',
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: false,
      customLayout: [
        { q: 0, r: 0, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 0, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 1, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: { credits: 100, moves: 30, rank: 1, materials: 10, initialEntropy: 100 },
    aiMode: 'none',
    hooks: {
      checkWinCondition: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        return playerHex && playerHex.currentLevel <= -5;
      },
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const playerHex = state.grid[getHexKey(state.player.q, state.player.r)];
        const isRu = state.language === 'RU';
        
        if (playerHex && playerHex.currentLevel === -3 && !(state as any)._deepEchoMsg3) {
          (state as any)._deepEchoMsg3 = true;
          state.messageLog.unshift({
            id: `de-3-${Date.now()}`,
            text: isRu
              ? 'Глубинный Датчик: Глубина -3 достигнута. Тектоническое давление возрастает. Осталось 2 уровня до целевой аномалии.'
              : 'Depth Sensor: Depth -3 reached. Tectonic pressure is rising. 2 more levels to target anomaly.',
            type: 'INFO',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        if (playerHex && playerHex.currentLevel === -4 && !(state as any)._deepEchoMsg4) {
          (state as any)._deepEchoMsg4 = true;
          state.messageLog.unshift({
            id: `de-4-${Date.now()}`,
            text: isRu
              ? 'Сонар: Глубина -4! Сигнатура аномалии прямо под вами! Копайте еще ОДИН раз для победы!'
              : 'Sonar: Depth -4 reached! Anomaly signature directly below you. Dig ONE more time to claim victory!',
            type: 'WARN',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }
      }
    }
  }
];
