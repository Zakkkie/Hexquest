import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

/**
 * ============================================================================
 *  SERIES 2: MONUMENT & DEEP MINING  (5 levels)
 * ============================================================================
 *
 *  ┌─────────────────── VERIFIED ECONOMIC MODEL ───────────────────┐
 *  │ RECOVERY: +1 move, +5×level credits. L0-3 single use/visit.  │
 *  │           L4+ has 3 charges, then 15s cooldown.               │
 *  │ DIG:      +1 mat (if storage<max), +|newLevel| moves.        │
 *  │           Loot at depth<0: (10+10×|d|)% chance per NEW depth. │
 *  │           Each depth looted ONCE per hex (lootedLevels[]).    │
 *  │ UPGRADE:  −1 mat, income from config table.                  │
 *  │           L0→+5cr L1→+10cr L2→+20cr L3→+40cr L4→+80cr       │
 *  │           Needs 2 neighbors at same maxLevel for L2+.        │
 *  │ MOVE:     −max(1, hexLevel) moves per step.                  │
 *  │ EXCHANGE: −5cr → +1 move.                                    │
 *  │ VOID:     Sacrifice item → C:25% U:40% R:65% L:90% success.  │
 *  │ Neighbors: (q±1,r), (q,r±1), (q+1,r-1), (q-1,r+1)          │
 *  │ Staircase: |adjacent diff| ≤ 1 or path BLOCKED.             │
 *  │ Rank: L2→rank1, L3→rank2, L4→rank3, L5→rank4                │
 *  └──────────────────────────────────────────────────────────────┘
 */

export const series2Levels: LevelConfig[] = [

  // ═══════════════════════════════════════════════════════════════════
  //  2.1  THE MONOLITH — Staircase Navigation + Recovery Bootstrap
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.1',
    title: 'Sim 2.1: Монолит',
    description: 'Цель: Неизвестный Шпиль.\n\nЗадача: Доберитесь до Монолита (Центр, Ур. 3). Для его активации НЕ требуются предметы. Просто встаньте на него и нажмите АКТИВИРОВАТЬ в интерфейсе.\n\nПроблема: Прямой путь заблокирован стеной Ур. 4. Найдите лестницу вдоль левого хребта.\n\nСтарт: Топлива почти нет. Используйте ВОССТАНОВЛЕНИЕ (Синяя кнопка) на стартовом гексе, затем отойдите и вернитесь, чтобы сбросить его. Повторяйте, чтобы накопить топливо.\n\nУСЛОВИЕ ПРОИГРЫША: Вы застряли (Нет ходов, нет кредитов, нет вариантов восстановления).',
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
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.2  BURIED SECRETS — Dig for Loot + Activate Monument
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.2',
    title: 'Sim 2.2: Погребенные Тайны',
    description: 'Сканирование: Под землей обнаружены ключи активации.\n\nЗадача: Соберите ЛЮБЫЕ 3 ПРЕДМЕТА. Встаньте на Монолит, вставьте их в слоты и нажмите АКТИВИРОВАТЬ.\n\nМетод: КОПАЙТЕ (Красная кнопка) ниже Ур. 0. Каждая новая отрицательная глубина дает шанс на добычу. Чем глубже, тем выше шансы (20% на -1, 30% на -2, 40% на -3...).\n\nСовет: Копание дает +Ходы и +Материал. Вы зарабатываете топливо, исследуя глубины.\n\nУСЛОВИЕ ПРОИГРЫША: Вы застряли.',
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
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
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
    // Игроку выдано 4 материала, чтобы он мог достроить опоры и получить Ранг 4 для захода на Монумент
    startState: { credits: 0, moves: 2, rank: 3, materials: 4, initialEntropy: 15 },
    aiMode: 'none',
    hooks: {
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false, 
      checkLossCondition: (state) => {
        // Поражение, если игрок провалился в пустоту
        const currentHex = state.grid[getHexKey(state.player.q, state.player.r)];
        if (currentHex?.structureType === 'VOID') return true;
        
        // Поражение по нулевой Энтропии
        if (state.entropy.current <= 0) return true;
        
        return isStranded(state);
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
    botSpawnPoints: [{ q: 0, r: -3 }],
    startState: { credits: 0, moves: 2, rank: 2, materials: 0 },
    hooks: {
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.bots?.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  2.5  THE SINGULARITY — Two Bots, Maximum Pressure
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '2.5',
    title: 'Sim 2.5: Сингулярность',
    description: 'ФИНАЛЬНЫЙ ТЕСТ: Сближаются две враждебные единицы.\n\nЗадача: Соберите 3 ПРЕДМЕТА и активируйте Ядро (Ур. 5) первым.\n\nСтарт: Ресурсов почти нет. КОПАЙТЕ глубоко вдоль своей спирали для получения топлива и артефактов. Два соперника приближаются с севера и востока.\n\nСовет: Глубокие раскопки дают больше Ходов И лучшие шансы на добычу.\n\nПОРАЖЕНИЕ: Любой бот достигает Монолита первым ИЛИ вы застряли.',
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
    botSpawnPoints: [{ q: 3, r: -3 }, { q: -3, r: 0 }],
    startState: { credits: 0, moves: 2, rank: 4, materials: 0 },
    hooks: {
      // Victory is handled strictly via the Monument UI (ACTIVATE_MONUMENT action)
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.bots?.some(b => state.grid[getHexKey(b.q, b.r)]?.structureType === 'MONUMENT')) return true;
        return isStranded(state);
      }
    }
  },
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
      checkLossCondition: (state) => isStranded(state)
    }
  }
];