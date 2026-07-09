import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

/**
 * ============================================================================
 *  SERIES 2: MONUMENT & ANCIENT ALIGNMENT (10 levels)
 * ============================================================================
 */

export const series2Levels: LevelConfig[] = [

  // ═══════════════════════════════════════════════════════════════════
  //  2.1  THE MONOLITH — Staircase Navigation + Recovery Bootstrap
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.1',
    title: 'Sim 2.1: Монолит',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. АРХЕОЛОГИЧЕСКИЙ ЦИКЛ. Центральный Монолит заблокирован непреодолимой стеной. Исследуйте внешние хребты и найдите обходной путь для его активации. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: -1, r: 4, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 1, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
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
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Портал активирован!" : "VICTORY: Portal activated!";
      if (state.player.q === 0 && state.player.r === 0) return isRu ? "АКТИВИРУЙ: Ты на Монолите! Жми АКТИВИРОВАТЬ!" : "ACTIVATE: Press ACTIVATE on Monolith!";
      return isRu 
        ? "ИДИ НА УКАЗАТЕЛЬ: Обойди барьер по хребту и дойди до Монолита!" 
        : "MOVE TO TARGET: Bypass barrier on ridge to reach Monolith!";
    },
    hooks: {
      checkWinCondition: (state) => !!state.portalActive,
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
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. ГЛУБИННОЕ СКАНИРОВАНИЕ. Ключи активации скрыты в недрах кластера. Проведите глубокое бурение, соберите артефакты и запустите Монолит. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Monument', color: 'emerald' },
      { q: 1, r: 3, targetLevel: -1, label: 'Dig Site 1', color: 'red' },
      { q: -1, r: 3, targetLevel: -1, label: 'Dig Site 2', color: 'red' },
      { q: 1, r: 2, targetLevel: -1, label: 'Dig Site 3', color: 'red' },
      { q: -1, r: 2, targetLevel: -1, label: 'Dig Site 4', color: 'red' }
    ],
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
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Портал активирован!" : "VICTORY: Portal activated!";
      if (state.player.inventory.length < 3) {
        return isRu 
          ? `КОПАЙ: Найди 3 предметы под землей (L-1, L-2)! Найдено: ${state.player.inventory.length}/3` 
          : `DIG: Find 3 items underground (L-1, L-2)! Found: ${state.player.inventory.length}/3`;
      }
      if (state.player.q === 0 && state.player.r === 0) {
        return isRu ? "АКТИВИРУЙ: Активируй Монолит!" : "ACTIVATE: Activate the Monolith!";
      }
      return isRu 
        ? "ИДИ В ЦЕНТР: Предметы собраны! Иди на (0,0) и активируй Монолит." 
        : "MOVE TO CENTER: Items gathered! Walk to (0,0) and activate Monolith.";
    },
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
    description: 'ВЕРТИКАЛЬНАЯ АДАПТАЦИЯ. Нестабильный сектор с резкими перепадами высот. Возводите ступенчатые опоры для безопасного восхождения к Монолиту.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 4, label: 'Monument', color: 'emerald' }
    ],
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
    startState: { credits: 0, moves: 2, rank: 3, materials: 2, initialEntropy: 15 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Портал активирован!" : "VICTORY: Portal activated!";
      if (!(state as any)._entropyDischarged) {
        return isRu 
          ? "ИДИ НА УКАЗАТЕЛЬ: Доберись до пика L5 (1,2), чтобы восстановить запас Стабильности!"
          : "MOVE TO TARGET: Reach L5 peak at (1,2) to restore Stability!";
      }
      if (state.player.q === 0 && state.player.r === 0) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ НА УКАЗАТЕЛЬ: Иди в Центр (0,0) и активируй Монолит!" 
        : "MOVE TO CENTER: Go to Center (0,0) and activate Monolith!";
    },
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
  //  2.4  THE HYPER_SIGNAL — Mini-Monuments (Obelisks) Introduced
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.4',
    title: 'Sim 2.4: Первый Сигнал',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. ПОДАВЛЕНИЕ ПОЛЯ. Энергетический барьер блокирует Монолит. Сначала найдите и активируйте периферийный Обелиск для снятия защиты. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    objectiveHexes: [
      { q: 1, r: 2, targetLevel: 2, label: 'Obelisk', color: 'blue' },
      { q: 0, r: 0, targetLevel: 3, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true },
          { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
          { q: 1, r: 2, maxLevel: 2, currentLevel: 2, structureType: 'MINI_MONUMENT', revealed: true },
          // STAIRS
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true }, // The secret cache
          { q: 1, r: 3, maxLevel: -1, currentLevel: -1, revealed: true },
          { q: -1, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: { credits: 0, moves: 8, rank: 3, materials: 1 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Портал активирован!" : "VICTORY: Portal activated!";
      if (!state.monumentRevealedSlots?.[0]) {
        if (state.player.q === 1 && state.player.r === 2) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ на Обелиске!" : "ACTIVATE: Press ACTIVATE on Obelisk!";
        return isRu ? "ИДИ НА УКАЗАТЕЛЬ: Иди к Обелиску (1,2) и взломай его!" : "MOVE TO TARGET: Head to Obelisk at (1,2) and hack it!";
      }
      if (state.player.q === 0 && state.player.r === 0) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ НА УКАЗАТЕЛЬ: Возвращайся к Монолиту (0,0)!" 
        : "MOVE TO CENTER: Return to the Monolith (0,0)!";
    },
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-24-tut-${Date.now()}`,
            text: isRu
              ? 'ИНСТРУКТАЖ: Центральный Монолит заблокирован файрволом. Направляйтесь на восток к Обелиску (1, 2) на высоте 2. Активируйте его, чтобы взломать систему и подсветить координаты секретного контейнера!'
              : 'BRIEFING: The central Monolith is locked. Head east to the Obelisk (1, 2) at level 2. Activate it to breach the grid and ping the secret container location!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.5  LINEAR MATRIX — Construction of Geometry (LINE_3)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.5',
    title: 'Sim 2.5: Линейная Матрица',
    description: 'ГЕОМЕТРИЯ: ЛИНИЯ. Протокол требует создания линейного резонанса. Возведите цельную линию из трех смежных возвышенных платформ.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 2, label: 'Shape Node A', color: 'amber' },
      { q: 1, r: 0, targetLevel: 2, label: 'Shape Node B', color: 'amber' },
      { q: -1, r: 0, targetLevel: 2, label: 'Shape Node C', color: 'amber' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: false,
      customLayout: [
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 2, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -2, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    requiredShapes: [
      { type: 'LINE_3', level: 2, hint: 'Build a solid row of 3 tiles of L2+' }
    ],
    startState: { credits: 20, moves: 12, rank: 2, materials: 1 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.evacuationActive) return isRu ? "ПОБЕДА: Линия сформирована!" : "VICTORY: Line complete!";
      const countL2 = Object.values(state.grid).filter((h: any) => h.currentLevel >= 2 && h.ownerId === state.player.id).length;
      return isRu 
        ? `СТРОЙ: Подними 3 гекса в одну линию до L2! Готово гексов L2: ${Math.min(3, countL2)}/3` 
        : `BUILD: Upgrade 3 hexes in a straight line to L2! Built L2: ${Math.min(3, countL2)}/3`;
    },
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-25-tut-${Date.now()}`,
            text: isRu
              ? 'ФИГУРА КАНАЛИЗАЦИИ: Инженерный ранг установлен на Ранг 2. Повысьте три гекса, образующие прямую линию, до Уровня 2 (например Q=0 R=0, Q=1 R=0, Q=2 R=0).'
              : 'SHAPE CODING: Engineering Rank is set to 2. Elevate three hexes in a straight row (such as Q=0 R=0, Q=1 R=0, Q=2 R=0) to Level 2 to align the vectors.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.6  RESONANCE TRIANGLE — Shapes under Bot Pressure
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.6',
    title: 'Sim 2.6: Резонансный Треугольник',
    description: 'ГЕОМЕТРИЯ: ТРЕУГОЛЬНИК. Постройте треугольный контур. Внимание: зафиксирована активность враждебного ИИ. Защищайте свои платформы от разрушения.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 2, label: 'Triangle Node A', color: 'amber' },
      { q: 1, r: -1, targetLevel: 2, label: 'Triangle Node B', color: 'amber' },
      { q: 1, r: 0, targetLevel: 2, label: 'Triangle Node C', color: 'amber' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          { q: -2, r: 2, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },
          { q: 2, r: -2, maxLevel: 1, currentLevel: 1, revealed: true }, // Bot spawn point
          // The potential construction area (0,0 center)
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    requiredShapes: [
      { type: 'TRIANGLE_3', level: 2, hint: 'Compile a triangle of 3 adjacent tiles of Level 2+' }
    ],
    botSpawnPoints: [{ q: 2, r: -2 }],
    aiMode: 'basic',
    botObjective: 'MONUMENT_RACE',
    startState: { credits: 30, moves: 12, rank: 2, materials: 1, initialEntropy: 60 },
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.evacuationActive) return isRu ? "ПОБЕДА: Треугольник сформирован!" : "VICTORY: Triangle complete!";
      const countL2 = Object.values(state.grid).filter((h: any) => h.currentLevel >= 2 && h.ownerId === state.player.id).length;
      return isRu 
        ? `СТРОЙ: Выстрой Треугольник (3 гекса) до L2! Остерегайся бота. Готово: ${Math.min(3, countL2)}/3` 
        : `BUILD: Upgrade a Triangle (3 hexes) to L2! Beware of the bot. Built L2: ${Math.min(3, countL2)}/3`;
    },
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-26-start-${Date.now()}`,
            text: isRu
              ? 'ТЕКТНИКА И СКАНИР: Проклятый Бот-Строитель проснулся на северо-востоке (2,-2). Он попытается саботировать ваши линии. Выстройте треугольник TRIANGLE_3 на уровне L2+ для запуска портала!'
              : 'TECTONICS ON: Hostile Architect drone is active at (2,-2). It will try to sabotage your structures. Build a TRIANGLE_3 shape at Level 2+ to activate escape.',
            type: 'WARN',
            source: 'ENEMY_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.7  AETHER DIAMOND — Four-Hex Construction Link
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.7',
    title: 'Sim 2.7: Ромб Эфира',
    description: 'ГЕОМЕТРИЯ: РОМБ. Сформируйте ромбовидную структуру из четырех смежных возвышенных плит для калибровки энергетической сети.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Apex Node', color: 'amber' },
      { q: 1, r: -1, targetLevel: 3, label: 'Apex Left', color: 'amber' },
      { q: 0, r: 1, targetLevel: 3, label: 'Apex Right', color: 'amber' },
      { q: 1, r: 0, targetLevel: 3, label: 'Apex Base', color: 'amber' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: false,
      customLayout: [
          { q: 0, r: 0, maxLevel: 2, currentLevel: 2, ownerId: 'player-1', revealed: true },
          { q: 1, r: -1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 0, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
          { q: 1, r: 0, maxLevel: 2, currentLevel: 2, revealed: true },
          // Rest of paths
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    requiredShapes: [
      { type: 'DIAMOND_4', level: 3, hint: 'Build a diamond shape of 4 level 3+ tiles' }
    ],
    startState: { credits: 40, moves: 15, rank: 3, materials: 1 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.evacuationActive) return isRu ? "ПОБЕДА: Ромб сформирован!" : "VICTORY: Diamond complete!";
      const countL3 = Object.values(state.grid).filter((h: any) => h.currentLevel >= 3 && h.ownerId === state.player.id).length;
      return isRu 
        ? `СТРОЙ РОМБ: Подними 4 гекса в форме Ромба до L3! Готово L3: ${Math.min(4, countL3)}/4` 
        : `BUILD DIAMOND: Upgrade 4 hexes in a Diamond shape to L3! Built L3: ${Math.min(4, countL3)}/4`;
    },
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state),
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-27-start-${Date.now()}`,
            text: isRu
              ? 'ЭФИРНЫЙ МОДУЛЬ: Вы начинаете прямо по центру частично подготовленной площадки Уровня 2. Улучшите эти 4 опорных гекса до Уровня 3, чтобы сплести ромб!'
              : 'AETHER ARRAY: You start in the middle of a partially prepared Level 2 zone. Push these 4 adjoining tiles to Level 3 to trigger the Diamond grid!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.8  VOID RING — Circle containment under unstable decay
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.8',
    title: 'Sim 2.8: Кольцо Пустоты',
    description: 'ГЕОМЕТРИЯ: КОЛЬЦО. Изолируйте центральную пространственную аномалию, выстроив вокруг нее сплошное замкнутое кольцо платформ.',
    objectiveHexes: [
      { q: 1, r: -1, targetLevel: 3, label: 'Ring Node 1', color: 'amber' },
      { q: 1, r: 0, targetLevel: 3, label: 'Ring Node 2', color: 'amber' },
      { q: 0, r: 1, targetLevel: 3, label: 'Ring Node 3', color: 'amber' },
      { q: -1, r: 1, targetLevel: 3, label: 'Ring Node 4', color: 'amber' },
      { q: -1, r: 0, targetLevel: 3, label: 'Ring Node 5', color: 'amber' },
      { q: 0, r: -1, targetLevel: 3, label: 'Ring Node 6', color: 'amber' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: -5, currentLevel: -5, structureType: 'VOID', revealed: true }, // CENTRAL BLACK HOLE
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },   // PLAYER START
          
          // RING POSITIONS (must be built to level 3)
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },

          // ACCESS PATHS
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -2, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    requiredShapes: [
      { type: 'RING_6', level: 3, hint: 'Construct a ring of 6 level 3 tiles around the central Void' }
    ],
    startState: { credits: 50, moves: 20, rank: 3, materials: 2, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.evacuationActive) return isRu ? "ПОБЕДА: Кольцо герметизации создано!" : "VICTORY: Containment Ring complete!";
      const countL3 = Object.values(state.grid).filter((h: any) => h.currentLevel >= 3 && h.ownerId === state.player.id).length;
      return isRu 
        ? `СТРОЙ КОЛЬЦО: Выстрой 6 гексов кольцом вокруг Бездны до уровня L3! Готово: ${Math.min(6, countL3)}/6` 
        : `BUILD RING: Construct 6 hexes in a ring around the Void to L3! Built: ${Math.min(6, countL3)}/6`;
    },
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        // Drain 1 additional entropy per action to simulate rapid collapse
        if (turn > 0) {
          state.entropy.current = Math.max(0, state.entropy.current - 1);
        }

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-28-tut-${Date.now()}`,
            text: isRu
              ? 'ВНИМАНИЕ: Центральная Чёрная Дыра (0,0) уничтожает мерность. Быстро выстройте 6 её соседей до Уровня 3 (Кольцо), чтобы загерметизировать пробитие, пока стабильность не иссякла!'
              : 'ALERT: The Central Singularity (0,0) is melting space. Construct the 6 surrounding tiles to Level 3 (Ring of Containment) to seal the breach before stability drains!',
            type: 'WARN',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.9  DOUBLE CONFLUENCE — Multishape Matrix vs Saboteur Bot
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.9',
    title: 'Sim 2.9: Двойная Динамика',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. АРХИТЕКТУРНОЕ ПРОТИВОСТОЯНИЕ. Возведите сложные геометрические формации в условиях непрерывного саботажа со стороны вражеских дронов. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 3, label: 'Central Hub', color: 'amber' },
      { q: 1, r: -1, targetLevel: 3, label: 'North Node', color: 'amber' },
      { q: 1, r: 0, targetLevel: 3, label: 'East Node', color: 'amber' },
      { q: -1, r: 0, targetLevel: 3, label: 'West Node', color: 'amber' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 5, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true }, // PLAYER START
          { q: 0, r: -3, maxLevel: 2, currentLevel: 2, revealed: true }, // BOT SPAWN
          
          // CONSTR FIELD
          { q: 0, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    requiredShapes: [
      { type: 'LINE_3', level: 3, hint: 'Build a Line of 3 hexes L3+' },
      { type: 'TRIANGLE_3', level: 3, hint: 'Build a Triangle of 3 hexes L3+' }
    ],
    botSpawnPoints: [{ q: 0, r: -3 }],
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    startState: { credits: 50, moves: 22, rank: 3, materials: 2, initialEntropy: 80 },
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.evacuationActive) return isRu ? "ПОБЕДА: Фигуры построены!" : "VICTORY: Shapes built!";
      return isRu 
        ? "СТРОЙ ФИГУРЫ: Сформируй одновременно Треугольник (L3) и Линию (L3)!" 
        : "BUILD SHAPES: Complete a Triangle (L3) and a Line (L3) simultaneously!";
    },
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        return isStranded(state);
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-29-warn-${Date.now()}`,
            text: isRu
              ? 'СЕНСОР: Проклятый Саботажник Scout-Destroyer десантировался на юге. Он будет выслеживать и срывать ваши постройки! Быстро создайте одновременно Линию LINE_3 и Треугольник TRIANGLE_3 Уровня 3.'
              : 'SENSOR: Enemy Scout-Destroyer drone has landed. It will actively seek and dig down your structures! Rush construction of both a LINE_3 and a TRIANGLE_3 at level 3+.',
            type: 'ERROR',
            source: 'ENEMY_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.10 COSMIC ALIGNMENT — The Ultimate Convergence (Apeks)
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.10',
    title: 'Sim 2.10: Космическое Выравнивание',
    description: 'СИСТЕМНАЯ ДИРЕКТИВА. СИНТЕЗ. Критическая фаза. Активируйте защитные обелиски по периметру и запустите Монолит до того, как кластер схлопнется. Следуйте указаниям навигационного модуля и берегите ресурсы.',
    objectiveHexes: [
      { q: 3, r: -3, targetLevel: 3, label: 'Obelisk 1', color: 'blue' },
      { q: -3, r: 3, targetLevel: 3, label: 'Obelisk 2', color: 'blue' },
      { q: 0, r: -3, targetLevel: 3, label: 'Obelisk 3', color: 'blue' },
      { q: 0, r: 0, targetLevel: 3, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 7, type: 'fixed', generateWalls: true, wallStartRadius: 6, wallType: 'pit_ring',
      customLayout: [
          { q: 0, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MONUMENT', revealed: true }, // CENTRAL CORE
          { q: 0, r: 4, maxLevel: 1, currentLevel: 1, ownerId: 'player-1', revealed: true },   // PLAYER START
          
          // 3 MINI MONUMENTS
          { q: 3, r: -3, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },
          { q: -3, r: 3, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },
          { q: 0, r: -3, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },

          // INNER RING GRID
          { q: 1, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 0, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: -1, maxLevel: 1, currentLevel: 1, revealed: true },

          // SPURS AND BRIDGES
          { q: 0, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: 1, r: -3, maxLevel: 1, currentLevel: 1, revealed: true },
          { q: -1, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
      ]
    },
    startState: { credits: 60, moves: 25, rank: 4, materials: 3, initialEntropy: 100 },
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Монолит запущен!" : "VICTORY: Monolith online!";
      
      const activatedCount = state.monumentRevealedSlots?.filter(Boolean).length || 0;
      if (activatedCount < 3) {
        return isRu 
          ? `АКТИВИРУЙ ОБЕЛИСКИ: Найди и взломай 3 периферийных Обелиска! Готово: ${activatedCount}/3` 
          : `ACTIVATE OBELISKS: Find and hack 3 peripheral Obelisks! Activated: ${activatedCount}/3`;
      }
      
      const ringKeys = ['1,-1', '1,0', '0,1', '-1,1', '-1,0', '0,-1'];
      const ringCount = ringKeys.filter(k => {
        const h = state.grid[k];
        return h && h.currentLevel >= 3 && h.ownerId === state.player.id;
      }).length;
      
      if (ringCount < 6) {
        return isRu 
          ? `СТРОЙ КОЛЬЦО: Возведи кольцо L3 вокруг Монолита (0,0)! Готово: ${ringCount}/6` 
          : `BUILD RING: Construct an L3 ring around the Monolith (0,0)! Built: ${ringCount}/6`;
      }

      if (state.player.q === 0 && state.player.r === 0) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ В ЦЕНТР: Ступай на Монолит (0,0) и Активируй его!" 
        : "MOVE TO CENTER: Step on Monolith (0,0) and Activate it!";
    },
    hooks: {
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        return isStranded(state);
      },
      onBeforeAction: (state, action) => {
        const isRu = state.language === 'RU';
        
        if (action.type === 'ACTIVATE_MONUMENT') {
          // Verify that RING_6 of Level 3 is fully constructed around (0,0)
          const ringKeys = ['1,-1', '1,0', '0,1', '-1,1', '-1,0', '0,-1'];
          const ringCorrect = ringKeys.every(k => {
            const h = state.grid[k];
            return h && h.currentLevel >= 3 && h.ownerId === state.player.id;
          });
          
          if (!ringCorrect) {
            return {
              ok: false,
              reason: isRu
                ? 'ФАЙРВОЛ: Вы не сотворили фокусирующее Кольцо (6 гексов Ур.3) вокруг Монолита!'
                : 'FIREWALL: You have not built the Focusing Containment Ring (RING_6 of L3+) around the central Monolith!'
            };
          }
        }
        return null;
      },
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-210-start-${Date.now()}`,
            text: isRu
              ? 'ГЛОБАЛЬНЫЙ ИНСТРУКТАЖ: Стены защиты Монолита неприступны. Активируйте 3 Обелиска по краям (3,-3), (-3,3), (0,-3) и выстройте кольцо (6 гексов Ур 3) вокруг (0,0) для победы!'
              : 'GLOBAL DIRECTIVE: Central core defenses are impenetrable. Run to activate the 3 peripheral Obelisks at (3,-3), (-3,3), (0,-3) and align the ring shape of Level 3 around (0,0).',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      }
    }
  }
];
