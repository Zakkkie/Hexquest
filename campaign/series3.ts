import { LevelConfig } from '../types';
import { getHexKey } from '../services/hexUtils';
import { isStranded } from './utils';

/**
 * ============================================================================
 *  SERIES 3: OBELISK CHRONICLES  (8 levels)
 * ============================================================================
 */

export const series3Levels: LevelConfig[] = [

  // ═══════════════════════════════════════════════════════════════════
  //  3.1  FIRST INSCRIPTION — 1 slot, 1 obelisk, linear map
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.1',
    title: 'Первая Надпись',
    description: 'Активируйте Монумент по указаниям Обелисков.',
    objectiveHexes: [
      { q: -1, r: 2, targetLevel: 3, label: 'Obelisk', color: 'blue' },
      { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        // MAIN STAIRCASE
        { q: 0, r: 5, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 4, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 3, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: 2, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // OBELISK BRANCH (accessible from (0,2)L3, connects back to (0,1)L4)
        { q: -1, r: 2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },
        // DECORATIVE PITS
        { q: 1, r: 4, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 4, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: 1, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -1, r: 3, maxLevel: -1, currentLevel: -1, revealed: true },
        { q: 1, r: 0, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: {
      credits: 0, moves: 20, rank: 5, materials: 0, initialEntropy: 20,
      startInventory: ['fuel_cell', 'cargo_prism', 'reality_patch']
    },
    goalText: 'Activate the Monument',
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Монолит запущен!" : "VICTORY: Monolith online!";
      
      if (!state.monumentRevealedSlots?.[0]) {
        if (state.player.q === -1 && state.player.r === 2) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ на Обелиске!" : "ACTIVATE: Press ACTIVATE on Obelisk!";
        return isRu ? "ИДИ НА УКАЗАТЕЛЬ: Иди к Обелиску (-1,2) и взломай его!" : "MOVE TO TARGET: Head to Obelisk at (-1,2) and hack it!";
      }

      if (state.player.q === 0 && state.player.r === 0) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ В ЦЕНТР: Ступай на Монолит (0,0) и Активируй его!" 
        : "MOVE TO CENTER: Step on Monolith (0,0) and Activate it!";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        
        // Entropy spikes
        const _a = state.player.actionsTaken ?? 0; const _fire = _a > 0 && _a % 20 === 0 && (state as any)._spk !== _a; if (_fire) (state as any)._spk = _a;
        if (_fire) {
          state.entropy.current = Math.max(0, state.entropy.current - 10);
          state.messageLog.unshift({
            id: `msg-31-spike-${turn}-${Date.now()}`,
            text: isRu 
              ? `ЭНТРОПИЙНЫЙ СДВИГ: Сила удара -10%. Оставшаяся стабильность: ${state.entropy.current}%!` 
              : `ENTROPY SHIFT: Spike power -10%. Remaining stability: ${state.entropy.current}%!`,
            type: 'WARN',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }
        
        // Initial instruction
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-31-init-${Date.now()}`,
            text: isRu
              ? 'Бортовой Компьютер: Обнаружен Обелиск Ур. 3 на (-1, 2) слева. Шагните на него, чтобы расшифровать силуэт слота Монумента. У вас ровно 39 ходов!'
              : 'Onboard Computer: Detected an Obelisk of Level 3 at (-1, 2) on the left. Step on it to decode the Monument slot silhouette. You have exactly 39 turns!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Secret science cache at (1, 4)
        if (state.player.q === 1 && state.player.r === 4 && !(state as any)._visitedSciStation) {
          (state as any)._visitedSciStation = true;
          state.player.moves += 10;
          state.messageLog.unshift({
            id: `msg-31-sci-${Date.now()}`,
            text: isRu
              ? 'НАХОДКА: В кратере (1,4) раскопана заброшенная станция! Заряд батарей пополнен: +10 заходов.'
              : 'DISCOVERY: Abandoned sci-station reached inside crater (1,4)! Battery reloaded: +10 moves.',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        // Obelisk at (-1,2): reveals slot 0
        if (state.player.q === -1 && state.player.r === 2) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true];
            state.messageLog.unshift({
              id: `msg-31-obelisk-${Date.now()}`,
              text: isRu
                ? 'ОБЕЛИСК АКТИВИРОВАН: Силуэт слота Монумента расшифрован! Требуется предмет: Cargo Prism (Грузовая Призма).'
                : 'OBELISK ACTIVATED: Monument slot silhouette decoded! Required item: Cargo Prism.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
      },
      checkWinCondition: () => false, // Victory set by ACTIVATE_MONUMENT
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        if (Math.floor((state.player.actionsTaken ?? 0) / 20) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.2  TWIN BEACONS — 2 slots, 2 obelisks, Y-shape
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.2',
    title: 'Близнецы-Маяки',
    description: 'Активируйте Монумент с двумя слотами, посетив Обелиски.',
    objectiveHexes: [
      { q: -1, r: 1, targetLevel: 3, label: 'Obelisk 1', color: 'blue' },
      { q: 1, r: 1, targetLevel: 3, label: 'Obelisk 2', color: 'blue' },
      { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        // STEM
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        // LEFT BRANCH
        { q: -1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_1: slot 0
        // RIGHT BRANCH
        { q: 1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OBELISK_2: slot 1
        // JUNCTION AND SUMMIT
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // DECORATIVE
        { q: -2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: {
      credits: 10, moves: 22, rank: 5, materials: 0, initialEntropy: 20,
      startInventory: ['data_disc', 'hornet_drill', 'cargo_prism', 'emergency_gen', 'rusted_scanner']
    },
    goalText: 'Activate the 2-slot Monument',
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Монолит запущен!" : "VICTORY: Monolith online!";
      
      const activatedCount = state.monumentRevealedSlots?.filter(Boolean).length || 0;
      if (activatedCount < 2) {
        return isRu 
          ? `АКТИВИРУЙ ОБЕЛИСКИ: Активируй два Обелиска (-1,1) и (1,1)! Готово: ${activatedCount}/2` 
          : `ACTIVATE OBELISKS: Activate the two Obelisks at (-1,1) and (1,1)! Activated: ${activatedCount}/2`;
      }

      if (state.player.q === 0 && state.player.r === 0) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ В ЦЕНТР: Ступай на Монолит (0,0) и Активируй его!" 
        : "MOVE TO CENTER: Step on Monolith (0,0) and Activate it!";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        const _a = state.player.actionsTaken ?? 0; const _fire = _a > 0 && _a % 20 === 0 && (state as any)._spk !== _a; if (_fire) (state as any)._spk = _a;
        if (_fire) {
          state.entropy.current = Math.max(0, state.entropy.current - 10);
          state.messageLog.unshift({
            id: `msg-32-spike-${turn}-${Date.now()}`,
            text: isRu 
              ? `КОЛЛЕКТОР: Давление в ячейках нарастает! Стабильнось снижена до ${state.entropy.current}%.`
              : `COLLECTOR: Pressure cells building! Stability lowered to ${state.entropy.current}%.`,
            type: 'WARN',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-32-init-${Date.now()}`,
            text: isRu
              ? 'ИИ-Помощник: Два Обелиска хранят требования. Посетите ОБА, чтобы получить бонус синхронизации (+100 Кредитов!) или бегите напрямую к Монументу.'
              : 'AI-Assistant: Two Obelisks hold the formula. Visit BOTH for a synchronization credit bonus (+100 Credits!) or head straight for the summit.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // OBELISK_1 at (-1,1): reveals slot 0 (hornet_drill)
        if (state.player.q === -1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true, state.monumentRevealedSlots[1] ?? false];
            state.messageLog.unshift({
              id: `msg-32-ob1-${Date.now()}`,
              text: isRu
                ? 'БЕЗОПАСНОСТЬ: Левый обелиск прочитан! Первый слот требует Hornet Drill Bit (Спиральное Сверло).'
                : 'SECURITY: Left beacon read! Slot 1 requires Hornet Drill Bit.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
        // OBELISK_2 at (1,1): reveals slot 1 (emergency_gen)
        if (state.player.q === 1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[1]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, true];
            state.messageLog.unshift({
              id: `msg-32-ob2-${Date.now()}`,
              text: isRu
                ? 'БЕЗОПАСНОСТЬ: Правый обелиск прочитан! Второй слот требует Emergency Generator (Запасной Генератор).'
                : 'SECURITY: Right beacon read! Slot 2 requires Emergency Generator.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }

        // Both beacons synchronized bonus!
        if (state.monumentRevealedSlots && state.monumentRevealedSlots[0] && state.monumentRevealedSlots[1] && !(state as any)._beaconsSyncBonus) {
          (state as any)._beaconsSyncBonus = true;
          state.player.coins += 100;
          state.messageLog.unshift({
            id: `msg-32-sync-${Date.now()}`,
            text: isRu
              ? 'СИНХРОНИЗАЦИЯ: База данных согласована! Награда: +100 Кредитов.'
              : 'SYNCHRONIZATION: Database fully reconciled! Reward: +100 Credits.',
            type: 'SUCCESS',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        if (Math.floor((state.player.actionsTaken ?? 0) / 20) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.3  ECLIPSE DEPTH — rarity slot, obelisk on mandatory path, VOID walls
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.3',
    title: 'Глубина Затмения',
    description: 'Активируйте Монумент необычным предметом по подсказке.',
    objectiveHexes: [
      { q: 0, r: 1, targetLevel: 3, label: 'Obelisk', color: 'blue' },
      { q: 0, r: -1, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
        // MAIN PATH
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK: slot 0 = UNCOMMON
        { q: 0, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: -1, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // VOID WALLS (block flanks)
        { q: -1, r: 2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: 2, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        { q: 1, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        // DECORATIVE DEPTH
        { q: -1, r: 3, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 1, r: 3, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: {
      credits: 0, moves: 20, rank: 5, materials: 0, initialEntropy: 20,
      startInventory: ['fuel_cell', 'cargo_prism', 'data_disc']
    },
    goalText: 'Activate the Monument (UNCOMMON item)',
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Монолит запущен!" : "VICTORY: Monolith online!";
      
      const activatedCount = state.monumentRevealedSlots?.filter(Boolean).length || 0;
      if (activatedCount < 1) {
        return isRu 
          ? `АКТИВИРУЙ ОБЕЛИСК: Иди на Обелиск (0,1) и расшифруй слот!` 
          : `ACTIVATE OBELISK: Move to Obelisk at (0,1) and decode the slot!`;
      }

      if (state.player.q === 0 && state.player.r === -1) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ В ЦЕНТР: Ступай на Монолит (0,-1) и Активируй его!" 
        : "MOVE TO CENTER: Step on Monolith (0,-1) and Activate it!";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        const _a = state.player.actionsTaken ?? 0; const _fire = _a > 0 && _a % 18 === 0 && (state as any)._spk !== _a; if (_fire) (state as any)._spk = _a;
        if (_fire) {
          state.entropy.current = Math.max(0, state.entropy.current - 10);
        }

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-33-init-${Date.now()}`,
            text: isRu
              ? 'Датчик: Стены Пустоты блокируют боковые проходы. Обелиск Ур. 3 перед вами. В глубокой шахте за Монументом на (0, -1) скрыто древнее снаряжение!'
              : 'Sensor: Void Walls fully enclose both flanks. The Level 3 Obelisk lies directly ahead. A deep excavation block is hidden behind the summit at (0, -1)!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Secret excavation materials behind the summit (0, -1) on deep dig
        const secretHex = state.grid[getHexKey(0, -1)];
        if (secretHex && secretHex.currentLevel < 0 && !(state as any)._excavatedMaterials) {
          (state as any)._excavatedMaterials = true;
          state.player.storage = Math.min(state.player.maxStorage, state.player.storage + 5);
          state.messageLog.unshift({
            id: `msg-33-materials-${Date.now()}`,
            text: isRu
              ? 'ГЕОЛОГИЯ: В глубинах (0,-1) раскопан строительный кластер! Получено +5 материалов.'
              : 'GEOLOGY: Built up construction cluster extracted at (0,-1)! Received +5 Materials.',
            type: 'SUCCESS',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        // OBELISK at (0,1): reveals slot 0 (UNCOMMON)
        if (state.player.q === 0 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true];
            state.messageLog.unshift({
              id: `msg-33-obelisk-${Date.now()}`,
              text: isRu
                ? 'СКАНИРОВАНИЕ ДАННЫХ: Обелиск вещает: Монумент требует НЕОБЫЧНЫЙ (UNCOMMON) предмет для активации. У вас в кармане есть Cargo Prism.'
                : 'DATA SCAN: Obelisk reports: Monument requires an UNCOMMON item for activation. You possess a Cargo Prism which matches.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        if (Math.floor((state.player.actionsTaken ?? 0) / 18) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.4  ENTROPIC DISPATCH — 2 slots, 2 obelisks, TIGHT timer
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.4',
    title: 'Энтропийная Депеша',
    description: 'Активируйте Монумент с двумя слотами за минимальное число ходов.',
    objectiveHexes: [
      { q: -1, r: 1, targetLevel: 3, label: 'Obelisk 1', color: 'blue' },
      { q: 1, r: 1, targetLevel: 3, label: 'Obelisk 2', color: 'blue' },
      { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
        // START
        { q: 0, r: 3, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        // LEFT BRANCH
        { q: -1, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: -1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_1: slot 0
        // RIGHT BRANCH
        { q: 1, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OBELISK_2: slot 1
        // CONVERGENCE
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // WALLS (block shortcuts)
        { q: 0, r: 2, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
      ]
    },
    startState: {
      credits: 5, moves: 16, rank: 5, materials: 0, initialEntropy: 50,
      startInventory: ['reality_patch', 'cortex_overclocker', 'fuel_cell', 'architect_nanites']
    },
    goalText: 'Activate the Monument (fast)',
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Монолит запущен!" : "VICTORY: Monolith online!";
      
      const activatedCount = state.monumentRevealedSlots?.filter(Boolean).length || 0;
      if (activatedCount < 2) {
        return isRu 
          ? `АКТИВИРУЙ ОБЕЛИСКИ: Активируй два Обелиска (-1,1) и (1,1)! Готово: ${activatedCount}/2` 
          : `ACTIVATE OBELISKS: Activate the two Obelisks at (-1,1) and (1,1)! Activated: ${activatedCount}/2`;
      }

      if (state.player.q === 0 && state.player.r === 0) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ В ЦЕНТР: Ступай на Монолит (0,0) и Активируй его!" 
        : "MOVE TO CENTER: Step on Monolith (0,0) and Activate it!";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        const _a = state.player.actionsTaken ?? 0; const _fire = _a > 0 && _a % 10 === 0 && (state as any)._spk !== _a; if (_fire) (state as any)._spk = _a;
        if (_fire) {
          state.entropy.current = Math.max(0, state.entropy.current - 25);
          state.messageLog.unshift({
            id: `msg-34-disruption-${turn}-${Date.now()}`,
            text: isRu
              ? 'КОЛЛАПС: Волна искажения ударила по местности! Энтропия критична.'
              : 'CRITICAL COLLAPSE: Reality distortion has struck! Entropy critical.',
            type: 'ERROR',
            source: 'SYSTEM',
            timestamp: Date.now()
          });
        }

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-34-init-${Date.now()}`,
            text: isRu
              ? 'ИИ-Помощник: Полная стабильность ядра: 50. Каждые 10 действий она падает на 25%. У вас есть ровно 19 ходов! Центральный пик (0,1) Ур. 4 при первом шаге расширит таймер на +5 ходов стабильности!'
              : 'AI-Assistant: Core stability: 50. Every 10 actions it collapses by 25%. You have exactly 19 turns. Stepping on center peak (0,1) Level 4 will delay the next distortion by +5 turns!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Standing on center peak acts as a stabiliser delay!
        if (state.player.q === 0 && state.player.r === 1 && !(state as any)._stabilizerTensionDelayed) {
          (state as any)._stabilizerTensionDelayed = true;
          state.entropy.current = Math.min(state.entropy.max ?? 100, state.entropy.current + 15);
          state.messageLog.unshift({
            id: `msg-34-stabilizer-${Date.now()}`,
            text: isRu
              ? 'ИНВЕРСИЯ: Спектральная петля на куполе (0,1) погасила искажение! Стабильность восстановлена на +15%.'
              : 'INVERSION: Spectral field loop on dome (0,1) cancelled the distortion! Stability recovered by +15%.',
            type: 'SUCCESS',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // OBELISK_1 at (-1,1): reveals slot 0 (reality_patch)
        if (state.player.q === -1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true, state.monumentRevealedSlots[1] ?? false];
            state.messageLog.unshift({
              id: `msg-34-ob1-${Date.now()}`,
              text: isRu
                ? 'БАЗА ДАННЫХ: Левая ветвь прочитана. Слот 1 требует Reality Patch (Энтропийный Пластырь).'
                : 'DATABASE: Left branch read. Slot 1 requires Reality Patch.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
        // OBELISK_2 at (1,1): reveals slot 1 (RARE)
        if (state.player.q === 1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[1]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, true];
            state.messageLog.unshift({
              id: `msg-34-ob2-${Date.now()}`,
              text: isRu
                ? 'БАЗА ДАННЫХ: Правая ветвь прочитана. Слот 2 требует любой РЕДКИЙ (RARE) предмет.'
                : 'DATABASE: Right branch read. Slot 2 requires any RARE item.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        if (Math.floor((state.player.actionsTaken ?? 0) / 10) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.5  GUARDIAN'S KEEP — RARE slot, DESTROY bot guards obelisk
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.5',
    title: "Цитадель Стража",
    description: 'Активируйте Монумент редким предметом, обходя ботов-стражей.',
    objectiveHexes: [
      { q: -1, r: 1, targetLevel: 3, label: 'Obelisk', color: 'blue' },
      { q: 0, r: -1, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
        // MAIN PATH
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: 1, maxLevel: 3, currentLevel: 3, revealed: true },
        { q: 0, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: -1, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // OBELISK BRANCH (off junction at (0,1)L3)
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK: slot 0 = RARE
        // BOT TERRITORY
        { q: 1, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 2, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        // WALLS
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -1, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -1, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 1, r: 1 }],
    startState: {
      credits: 10, moves: 20, rank: 5, materials: 0, initialEntropy: 30,
      startInventory: ['fuel_cell', 'architect_nanites', 'data_disc']
    },
    goalText: 'Activate the Monument (RARE item)',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Монолит запущен!" : "VICTORY: Monolith online!";
      
      const activatedCount = state.monumentRevealedSlots?.filter(Boolean).length || 0;
      if (activatedCount < 1) {
        return isRu 
          ? `АКТИВИРУЙ ОБЕЛИСК: Иди на Обелиск (-1,1), избегая бота!` 
          : `ACTIVATE OBELISK: Move to Obelisk at (-1,1), avoid the bot!`;
      }

      if (state.player.q === 0 && state.player.r === -1) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ В ЦЕНТР: Ступай на Монолит (0,-1) и Активируй его!" 
        : "MOVE TO CENTER: Step on Monolith (0,-1) and Activate it!";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        const _a = state.player.actionsTaken ?? 0; const _fire = _a > 0 && _a % 15 === 0 && (state as any)._spk !== _a; if (_fire) (state as any)._spk = _a;
        if (_fire) {
          state.entropy.current = Math.max(0, state.entropy.current - 15);
        }

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-35-init-${Date.now()}`,
            text: isRu
              ? 'УГРОЗА ОБНАРУЖЕНА: Бот-Страж Scout-Gate активирован у перекрестка. Обманите его или заманите на (1,2) — там его сенсорный контур временно зависнет на 3 хода из-за интерференции!'
              : 'HAZARD DETECTED: Guard bot Scout-Gate is active near the junction. Outmaneuver it or lure it to (1,2) — its sensory network will freeze for 3 turns due to heavy interference!',
            type: 'WARN',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Stepping on (-1, 2) releases a radar flash decoys that slows/stuns bot
        if (state.player.q === -1 && state.player.r === 2 && !(state as any)._guardianDecoyActive) {
          (state as any)._guardianDecoyActive = true;
          // Subtly stun the bot if present
          if (state.bots && state.bots[0]) {
            (state.bots[0] as any).stuckCounter = 3; 
          }
          state.messageLog.unshift({
            id: `msg-35-decoy-${Date.now()}`,
            text: isRu
              ? 'ПОМЕХИ: Ложная радарная вспышка на частоте (-1, 2)! Сети навигации стража временно заблокированы на 3 цикла.'
              : '干扰 / DECOY: Active radar flash released at (-1, 2)! Guard navigation vectors blocked for 3 cycles.',
            type: 'SUCCESS',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // OBELISK at (-1,1): reveals slot 0 (RARE)
        if (state.player.q === -1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true];
            state.messageLog.unshift({
              id: `msg-35-ob-${Date.now()}`,
              text: isRu
                ? 'ПРОТОКОЛ ДОСТУПА: Обелиск расшифрован! Требуется: любой РЕДКИЙ (RARE) предмет. В вашем инвентаре есть Architect Nanites (Наниты Архитектора) — они идеальны!'
                : 'ACCESS CONTROLS: Obelisk decrypted! Required item: any RARE item. You have Architect Nanites in your pack, which fits perfectly.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        if (Math.floor((state.player.actionsTaken ?? 0) / 15) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.6  THREE WHISPERS — 1 slot ONE_OF, 3 obelisks
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.6',
    title: 'Три Шепота',
    description: 'Активируйте Монумент одним из трех подходящих по подсказкам предметов.',
    objectiveHexes: [
      { q: -1, r: 1, targetLevel: 3, label: 'Obelisk 1', color: 'blue' },
      { q: 1, r: 1, targetLevel: 3, label: 'Obelisk 2', color: 'blue' },
      { q: 0, r: 1, targetLevel: 3, label: 'Obelisk 3', color: 'blue' },
      { q: 0, r: -1, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: true, wallStartRadius: 3, wallType: 'pit_ring',
      customLayout: [
        // MAIN PATH
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 0, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_3 (center, mandatory)
        { q: 0, r: 0, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: -1, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // LEFT OBELISK BRANCH
        { q: -1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_1
        // RIGHT OBELISK BRANCH (from (0,3)L1 → (1,2)L2 → (1,1)L3)
        { q: 1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OBELISK_2
        // WALLS
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 2, r: 2, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 0, r: -2, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    startState: {
      credits: 5, moves: 20, rank: 5, materials: 0, initialEntropy: 20,
      startInventory: ['rusted_scanner', 'cargo_prism', 'reality_patch', 'fuel_cell']
    },
    goalText: 'Activate the Monument (1 of 3 items)',
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Монолит запущен!" : "VICTORY: Monolith online!";
      
      const activatedCount = state.monumentRevealedSlots?.filter(Boolean).length || 0;
      if (activatedCount < 3) {
        return isRu 
          ? `АКТИВИРУЙ ОБЕЛИСКИ: Найди 3 Обелиска, чтобы разблокировать награду! Готово: ${activatedCount}/3` 
          : `ACTIVATE OBELISKS: Visit 3 Obelisks for a bonus! Activated: ${activatedCount}/3`;
      }

      if (state.player.q === 0 && state.player.r === -1) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ В ЦЕНТР: Ступай на Монолит (0,-1) и Активируй его!" 
        : "MOVE TO CENTER: Step on Monolith (0,-1) and Activate it!";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        const _a = state.player.actionsTaken ?? 0; const _fire = _a > 0 && _a % 20 === 0 && (state as any)._spk !== _a; if (_fire) (state as any)._spk = _a;
        if (_fire) {
          state.entropy.current = Math.max(0, state.entropy.current - 10);
        }

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-36-init-${Date.now()}`,
            text: isRu
              ? 'ТЕКСТОВАЯ ПЕТЛЯ: Три Обелиска вещают разрозненно. Прочтите все три, чтобы получить абсолютное Знание Архива и воссоединить силовой контур (+150 Кредитов!) или бегите напрямую.'
              : 'TEXTUAL LOOP: Three Beacons transmit structural echoes. Decrypt all three to unlock the Archive Harmony bonus (+150 Credits!) or rush straight up.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Tracking visits to obelisks
        const px = state.player.q, py = state.player.r;
        if (px === -1 && py === 1) (state as any)._ob1Visited = true;
        if (px === 1 && py === 1) (state as any)._ob2Visited = true;
        if (px === 0 && py === 1) (state as any)._ob3Visited = true;

        if ((state as any)._ob1Visited && (state as any)._ob2Visited && (state as any)._ob3Visited && !(state as any)._whispersSyncBonus) {
          (state as any)._whispersSyncBonus = true;
          state.player.coins += 150;
          state.messageLog.unshift({
            id: `msg-36-sync-${Date.now()}`,
            text: isRu
              ? 'ГАРМОНИЯ ШЕПОТА: Сигнальные линии соединились! Все три ретранслятора объединены. Выдано +150 Кредитов.'
              : 'WHISPERS HARMONY: Beacon coordinates locked together! Generative grid matched. Received +150 Credits.',
            type: 'SUCCESS',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // Any obelisk visit reveals slot 0 (ONE_OF — all 3 reveal the same slot)
        const isOnObelisk = (px === 0 && py === 1) || (px === -1 && py === 1) || (px === 1 && py === 1);
        if (isOnObelisk) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true];
            state.messageLog.unshift({
              id: `msg-36-reveal-${Date.now()}`,
              text: isRu
                ? 'ГОРЯЧЕЕ ОТКРОВЕНИЕ: Любой из: Cargo Prism (Грузовая Призма), Hornet Drill (Сверло Hornet) или Emergency Generator (Аварийный Ген) разблокирует ядро!'
                : 'THERMAL DECRYPTION: Any of: Cargo Prism, Hornet Drill, or Emergency Generator unlocks the core!',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        if (Math.floor((state.player.actionsTaken ?? 0) / 20) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.7  ASCENDANCY — 2 slots, COMPETE bot, race to monument
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.7',
    title: 'Господство',
    description: 'Активируйте Монумент быстрее, чем бот-конкурент нарастит энтропию.',
    objectiveHexes: [
      { q: -1, r: 1, targetLevel: 3, label: 'Obelisk 1', color: 'blue' },
      { q: 1, r: 1, targetLevel: 3, label: 'Obelisk 2', color: 'blue' },
      { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        // STEM
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        // LEFT BRANCH
        { q: -1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OBELISK_1: slot 0
        // RIGHT BRANCH
        { q: 1, r: 2, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: 1, r: 1, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OBELISK_2: slot 1
        // JUNCTION AND SUMMIT
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // BOT TERRITORY (far side, buildable area)
        { q: 2, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 3, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 2, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 3, r: 2, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 3, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
        // WALLS
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    aiMode: 'basic',
    botObjective: 'COMPETE_RANK',
    botSpawnPoints: [{ q: 3, r: 3 }],
    startState: { credits: 10, moves: 22, rank: 5, materials: 0, initialEntropy: 30,
      startInventory: ['rusted_scanner', 'hornet_drill', 'matter_prism', 'fuel_cell']
    },
    goalText: 'Activate the 2-slot Monument',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Монолит запущен!" : "VICTORY: Monolith online!";
      
      const activatedCount = state.monumentRevealedSlots?.filter(Boolean).length || 0;
      if (activatedCount < 2) {
        return isRu 
          ? `АКТИВИРУЙ ОБЕЛИСКИ: Активируй два Обелиска (-1,1) и (1,1)! Готово: ${activatedCount}/2` 
          : `ACTIVATE OBELISKS: Activate the two Obelisks at (-1,1) and (1,1)! Activated: ${activatedCount}/2`;
      }

      if (state.player.q === 0 && state.player.r === 0) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ В ЦЕНТР: Ступай на Монолит (0,0) и Активируй его!" 
        : "MOVE TO CENTER: Step on Monolith (0,0) and Activate it!";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        const _a = state.player.actionsTaken ?? 0; const _fire = _a > 0 && _a % 15 === 0 && (state as any)._spk !== _a; if (_fire) (state as any)._spk = _a;
        if (_fire) {
          state.entropy.current = Math.max(0, state.entropy.current - 15);
        }

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-37-init-${Date.now()}`,
            text: isRu
              ? 'ДАТЧИК ПРИБЛИЖЕНИЯ: Сегментный конкурент Scout-H3 начал экспансию с севера. Блокируйте его проходы, улучшая терраформы Ур. 1 у (2, 3) или продвигайтесь форсированным шагом!'
              : 'PROXIMITY RADAR: Rival terraformer Scout-H3 is constructing sectors from (3,3). Upgrade Level 1 terrain near junctions to blockade its path or build ahead!',
            type: 'WARN',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // OBELISK_1 at (-1,1): reveals slot 0 (hornet_drill)
        if (state.player.q === -1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true, state.monumentRevealedSlots[1] ?? false];
            state.messageLog.unshift({
              id: `msg-37-ob1-${Date.now()}`,
              text: isRu
                ? 'АНАЛИЗАТОР: Левая плита прочитана! Слот 1 просит Hornet Drill (Сверло Hornet).'
                : 'ANALYZER: Left tablet decrypted! Slot 1 requires Hornet Drill.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
        // OBELISK_2 at (1,1): reveals slot 1 (matter_prism)
        if (state.player.q === 1 && state.player.r === 1) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false];
          if (!state.monumentRevealedSlots[1]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, true];
            state.messageLog.unshift({
              id: `msg-37-ob2-${Date.now()}`,
              text: isRu
                ? 'АНАЛИЗАТОР: Правая плита прочитана! Слот 2 просит Matter Prism (Призма Материи).'
                : 'ANALYZER: Right tablet decrypted! Slot 2 requires Matter Prism.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        if (Math.floor((state.player.actionsTaken ?? 0) / 15) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.8  THE ARCHIVE — 3 slots, 3 obelisks, VOID maze, DESTROY bot
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.8',
    title: 'Архив',
    description: 'Активируйте сложный Монумент с тремя слотами, обходя патрули.',
    objectiveHexes: [
      { q: 0, r: 2, targetLevel: 3, label: 'Obelisk 1', color: 'blue' },
      { q: -1, r: 2, targetLevel: 3, label: 'Obelisk 2', color: 'blue' },
      { q: 1, r: 2, targetLevel: 3, label: 'Obelisk 3', color: 'blue' },
      { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 6, type: 'fixed', generateWalls: true, wallStartRadius: 4, wallType: 'pit_ring',
      customLayout: [
        // MAIN PATH
        { q: 0, r: 5, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 4, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 0, r: 3, maxLevel: 2, currentLevel: 2, revealed: true },
        // CENTER OBELISK (mandatory L3 stepping stone)
        { q: 0, r: 2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OB1: slot 0
        // SIDE OBELISK 2 (branch from (0,3)L2 via (-1,3)L2)
        { q: -1, r: 3, maxLevel: 2, currentLevel: 2, revealed: true },
        { q: -1, r: 2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },  // OB2: slot 1
        // SIDE OBELISK 3 (branch from (0,3)L2 via (1,3)L2... but (1,3) is neighbor of (0,4)L1 ✓)
        // Actually (1,2) is neighbor of (0,3)L2: neighbors of (0,3) include (1,2)?
        // neighbors of (0,3): (1,3),(-1,3),(0,4),(0,2),(1,2),(-1,4). YES (1,2) ✓ diff|2-3|=1 ✓
        { q: 1, r: 2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },   // OB3: slot 2
        // JUNCTION (accessible from OB1, OB2)
        { q: 0, r: 1, maxLevel: 4, currentLevel: 4, revealed: true },
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        // VOID (blocks shortcut below OB2)
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, structureType: 'VOID', revealed: true },
        // BOT TERRITORY
        { q: 2, r: 2, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 2, r: 1, maxLevel: 1, currentLevel: 1, revealed: true },
        { q: 1, r: 1, maxLevel: 2, currentLevel: 2, revealed: true },
        // WALLS/PITS
        { q: -1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: 1, r: 0, maxLevel: -3, currentLevel: -3, revealed: true },
        { q: -2, r: 3, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 2, r: 3, maxLevel: -2, currentLevel: -2, revealed: true },
        { q: 0, r: -1, maxLevel: -2, currentLevel: -2, revealed: true },
      ]
    },
    aiMode: 'basic',
    botObjective: 'DESTROY_PLAYER',
    botSpawnPoints: [{ q: 2, r: 2 }],
    startState: {
      credits: 15, moves: 22, rank: 5, materials: 0, initialEntropy: 40,
      startInventory: ['cargo_prism', 'stability_scanner', 'matter_prism', 'fuel_cell', 'data_disc']
    },
    goalText: 'Activate the 3-slot Monument',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Монолит запущен!" : "VICTORY: Monolith online!";
      
      const activatedCount = state.monumentRevealedSlots?.filter(Boolean).length || 0;
      if (activatedCount < 3) {
        return isRu 
          ? `АКТИВИРУЙ ОБЕЛИСКИ: Активируй 3 Обелиска (-1,2), (0,2), (1,2)! Готово: ${activatedCount}/3` 
          : `ACTIVATE OBELISKS: Activate the 3 Obelisks at (-1,2), (0,2), (1,2)! Activated: ${activatedCount}/3`;
      }

      if (state.player.q === 0 && state.player.r === 0) return isRu ? "АКТИВИРУЙ: Жми АКТИВИРОВАТЬ Портал!" : "ACTIVATE: Press ACTIVATE Portal!";
      return isRu 
        ? "ИДИ В ЦЕНТР: Ступай на Монолит (0,0) и Активируй его!" 
        : "MOVE TO CENTER: Step on Monolith (0,0) and Activate it!";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';

        const _a = state.player.actionsTaken ?? 0; const _fire = _a > 0 && _a % 12 === 0 && (state as any)._spk !== _a; if (_fire) (state as any)._spk = _a;
        if (_fire) {
          state.entropy.current = Math.max(0, state.entropy.current - 20);
        }

        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-38-init-${Date.now()}`,
            text: isRu
              ? 'АРХИВАТОР: Финальный этап. Вражеский разрушитель Scout-Omega охотится за вашими опорными гексами. Заблокируйте или проскочите его быстро!'
              : 'ARCHIVIST: Final level. Intrusive destroyer bot Scout-Omega is targeting your support structures. Block it or proceed swiftly before collapse!',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        // OB1 at (0,2): slot 0 (cargo_prism)
        if (state.player.q === 0 && state.player.r === 2) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false, false];
          if (!state.monumentRevealedSlots[0]) {
            state.monumentRevealedSlots = [true, state.monumentRevealedSlots[1] ?? false, state.monumentRevealedSlots[2] ?? false];
            state.messageLog.unshift({
              id: `msg-38-ob1-${Date.now()}`,
              text: isRu
                ? 'АРХИВ: Слот 1 просит Cargo Prism (Грузовая Призма).'
                : 'ARCHIVE: Slot 1 requires Cargo Prism.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
        // OB2 at (-1,2): slot 1 (stability_scanner)
        if (state.player.q === -1 && state.player.r === 2) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false, false];
          if (!state.monumentRevealedSlots[1]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, true, state.monumentRevealedSlots[2] ?? false];
            state.messageLog.unshift({
              id: `msg-38-ob2-${Date.now()}`,
              text: isRu
                ? 'АРХИВ: Слот 2 просит Stability Scanner (Сканер Стабильности).'
                : 'ARCHIVE: Slot 2 requires Stability Scanner.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
        // OB3 at (1,2): slot 2 (matter_prism)
        if (state.player.q === 1 && state.player.r === 2) {
          if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false, false];
          if (!state.monumentRevealedSlots[2]) {
            state.monumentRevealedSlots = [state.monumentRevealedSlots[0] ?? false, state.monumentRevealedSlots[1] ?? false, true];
            state.messageLog.unshift({
              id: `msg-38-ob3-${Date.now()}`,
              text: isRu
                ? 'АРХИВ: Слот 3 просит Matter Prism (Призма Материи).'
                : 'ARCHIVE: Slot 3 requires Matter Prism.',
              type: 'SUCCESS',
              source: 'SYSTEM',
              timestamp: Date.now()
            });
          }
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => {
        if (state.entropy.current <= 0) return true;
        if (Math.floor((state.player.actionsTaken ?? 0) / 12) >= 2) return true;
        return isStranded(state);
      }
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.9  STAR OF NEXUS — STAR_7 Shape Blueprint
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.9',
    title: 'Звезда Нексуса',
    description: 'Возведите 6-лучевую звезду из плит Ур. 2 на сложной местности.',
    objectiveHexes: [],
    mapConfig: {
      size: 5, type: 'procedural', generateWalls: true, wallStartRadius: 4, wallType: 'void_shatter'
    },
    startState: {
      credits: 120, moves: 35, rank: 5, materials: 15, initialEntropy: 60,
      startInventory: []
    },
    goalText: 'Build a Level 2+ STAR_7 shape',
    aiMode: 'none',
    requiredShapes: [
      { type: 'STAR_7', level: 2, hint: 'Construct a STAR shape of Level 2+ hexes' }
    ],
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Звезда Нексуса завершена!" : "VICTORY: Nexus Star completed!";
      return isRu 
        ? "ЧЕРТЕЖ: Постройте 6-лучевую Звезду (центр + 6 спутников через один гекс) уровня L2." 
        : "BLUEPRINT: Construct a 6-point Star (center + 6 satellites spaced by 1 hex) at L2.";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-39-init-${Date.now()}`,
            text: isRu
              ? 'ПРОТОКОЛ ЧЕРТЕЖА: Центральный узел Нексуса требует форму Звезды (STAR_7). Постройте центральный хаб и 6 лепестков на расстоянии одного гекса от центра, все на уровне L2+.'
              : 'BLUEPRINT PROTOCOL: Nexus Core node demands a Star shape (STAR_7). Build a central hub and 6 points spaced 1 hex away, all at L2+.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.10  THE THREE WHISPERS — 3 Obelisks, Final of Series 3
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.10',
    title: 'Печать Монолита',
    description: 'Соберите требования всех трех Обелисков для активации Монумента.',
    objectiveHexes: [
      { q: -2, r: 2, targetLevel: 3, label: 'Obelisk', color: 'blue' },
      { q: 2, r: 0, targetLevel: 3, label: 'Obelisk', color: 'blue' },
      { q: 0, r: -2, targetLevel: 3, label: 'Obelisk', color: 'blue' },
      { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: {
      size: 5, type: 'fixed', generateWalls: false,
      customLayout: [
        { q: 0, r: 0, maxLevel: 5, currentLevel: 5, structureType: 'MONUMENT', revealed: true },
        { q: -2, r: 2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },
        { q: 2, r: 0, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },
        { q: 0, r: -2, maxLevel: 3, currentLevel: 3, structureType: 'MINI_MONUMENT', revealed: true },
        { q: 0, r: 4, maxLevel: 0, currentLevel: 0, ownerId: 'player-1', revealed: true },
        { q: 0, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -2, r: 3, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 1, r: 0, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: 0, r: -1, maxLevel: 0, currentLevel: 0, revealed: true },
        { q: -1, r: 1, maxLevel: 0, currentLevel: 0, revealed: true },
      ]
    },
    startState: {
      credits: 150, moves: 30, rank: 5, materials: 12, initialEntropy: 30,
      startInventory: ['fuel_cell', 'data_disc', 'reality_patch']
    },
    goalText: 'Activate Monument with 3 Items',
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА: Серия 3 пройдена!" : "VICTORY: Series 3 complete!";
      return isRu 
        ? "ОБЕЛИСКИ: Посетите три Обелиска, чтобы открыть все слоты Монумента." 
        : "OBELISKS: Visit all three Beacons to reveal the Monument slots.";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        const turn = state.currentTurn ?? 0;
        const isRu = state.language === 'RU';
        if (turn === 1) {
          state.messageLog.unshift({
            id: `msg-310-init-${Date.now()}`,
            text: isRu
              ? 'ФИНАЛ СЕРИИ: Монумент требует 3 предмета. Обелиски хранят информацию о них.'
              : 'SERIES FINALE: The Monument requires 3 items. The Obelisks hold their secrets.',
            type: 'INFO',
            source: 'NEBULA_AI',
            timestamp: Date.now()
          });
        }

        const ob1 = state.player.q === -2 && state.player.r === 2;
        const ob2 = state.player.q === 2 && state.player.r === 0;
        const ob3 = state.player.q === 0 && state.player.r === -2;

        if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [false, false, false];

        if (ob1 && !state.monumentRevealedSlots[0]) {
          state.monumentRevealedSlots[0] = true;
          state.messageLog.unshift({
            id: `msg-310-ob1-${Date.now()}`,
            text: 'SLOT 1 DECRYPTED.', type: 'SUCCESS', source: 'SYSTEM', timestamp: Date.now()
          });
        }
        if (ob2 && !state.monumentRevealedSlots[1]) {
          state.monumentRevealedSlots[1] = true;
          state.messageLog.unshift({
            id: `msg-310-ob2-${Date.now()}`,
            text: 'SLOT 2 DECRYPTED.', type: 'SUCCESS', source: 'SYSTEM', timestamp: Date.now()
          });
        }
        if (ob3 && !state.monumentRevealedSlots[2]) {
          state.monumentRevealedSlots[2] = true;
          state.messageLog.unshift({
            id: `msg-310-ob3-${Date.now()}`,
            text: 'SLOT 3 DECRYPTED.', type: 'SUCCESS', source: 'SYSTEM', timestamp: Date.now()
          });
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.11  MONUMENT SEAL — Requires 2 artifacts simultaneously
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.11',
    title: 'Печать Монолита',
    description: 'Одновременная инкрустация 2 артефактов на алтаре.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: { size: 4, type: 'procedural', generateWalls: true, wallStartRadius: 3 },
    startState: {
      credits: 80, moves: 20, rank: 5, materials: 10, initialEntropy: 30,
      startInventory: ['fuel_cell', 'data_disc']
    },
    goalText: 'Activate Monument (Requires Fuel Cell and Data Disc)',
    aiMode: 'none',
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА!" : "VICTORY!";
      return isRu 
        ? "МОНУМЕНТ: Достигните Монумента и вставьте оба требуемых предмета." 
        : "MONUMENT: Reach the Monument and insert both required items.";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [true, true];
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.12  ISOLATED TRIANGLE — TRIANGLE_3 Shape
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.12',
    title: 'Изолированный Треугольник',
    description: 'Соберите парящий треугольник уровня L3, отделенный пропастями VOID.',
    objectiveHexes: [],
    mapConfig: { size: 4, type: 'procedural', generateWalls: true, wallType: 'pit_ring' },
    startState: { credits: 50, moves: 25, rank: 5, materials: 10, initialEntropy: 40 },
    goalText: 'Build a Level 3 TRIANGLE_3 shape',
    aiMode: 'none',
    requiredShapes: [{ type: 'TRIANGLE_3', level: 3, hint: 'Construct a TRIANGLE shape of Level 3 hexes' }],
    getTutorialHint: (state) => {
      const isRu = state.language === 'RU';
      if (state.portalActive) return isRu ? "ПОБЕДА!" : "VICTORY!";
      return isRu ? "ЧЕРТЕЖ: Постройте Треугольник L3." : "BLUEPRINT: Construct a L3 Triangle.";
    },
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: () => {},
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.13  TECTONIC CRASH — Hold shape during earthquake
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.13',
    title: 'Тектонический Крах',
    description: 'Удержите чертеж Ромба собранным во время землетрясения.',
    objectiveHexes: [],
    mapConfig: { size: 4, type: 'procedural' },
    startState: { credits: 40, moves: 15, rank: 5, materials: 8, initialEntropy: 20 },
    goalText: 'Build a Level 2 DIAMOND_4 shape',
    aiMode: 'none',
    requiredShapes: [{ type: 'DIAMOND_4', level: 2, hint: 'Construct a DIAMOND shape of Level 2 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Соберите Ромб L2." : "BLUEPRINT: Build L2 Diamond.",
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        if (state.currentTurn && state.currentTurn % 5 === 0) {
           state.entropy.current = Math.max(0, state.entropy.current - 15);
        }
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state) || state.entropy.current <= 0
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.14  COSMIC ALIGNMENT — Bring hexes to same level
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.14',
    title: 'Космическое Выравнивание',
    description: 'Приведите 4 хаотично разбросанных гекса к одинаковому уровню L4.',
    objectiveHexes: [],
    mapConfig: { size: 4, type: 'procedural' },
    startState: { credits: 200, moves: 30, rank: 5, materials: 10, initialEntropy: 40 },
    goalText: 'Build a Level 4 SQUARE_4 shape',
    aiMode: 'none',
    requiredShapes: [{ type: 'SQUARE_4', level: 4, hint: 'Construct a SQUARE shape of Level 4 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Соберите Квадрат L4." : "BLUEPRINT: Build L4 Square.",
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: () => {},
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.15  HEXAGONAL NECKLACE — RING_6 Shape
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.15',
    title: 'Гексагональное Ожерелье',
    description: 'Соберите кольцо из плит уровня L3.',
    objectiveHexes: [],
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 100, moves: 35, rank: 5, materials: 16, initialEntropy: 40 },
    goalText: 'Build a Level 3 RING_6 shape',
    aiMode: 'none',
    requiredShapes: [{ type: 'RING_6', level: 3, hint: 'Construct a RING shape of Level 3 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Соберите Кольцо L3." : "BLUEPRINT: Build L3 Ring.",
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: () => {},
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.16  FRACTAL BRIDGE — Level 4 Overpass
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.16',
    title: 'Фрактальный Мост',
    description: 'Постройте высокоуровневую эстакаду L4 через бездну VOID.',
    objectiveHexes: [],
    mapConfig: { size: 5, type: 'procedural', generateWalls: true, wallType: 'void_shatter' },
    startState: { credits: 70, moves: 24, rank: 5, materials: 14, initialEntropy: 40 },
    goalText: 'Build a Level 4 LINE_3 shape',
    aiMode: 'none',
    requiredShapes: [{ type: 'LINE_3', level: 4, hint: 'Construct a LINE of 3 Level 4 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Соберите Линию L4." : "BLUEPRINT: Build L4 Line.",
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: () => {},
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.17  LEGENDARY SHARD — Dig down to -10
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.17',
    title: 'Легендарный Осколок',
    description: 'Отыщите артефакт на слое шахты -10.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 300, moves: 25, rank: 5, materials: 6, initialEntropy: 40, startInventory: [] },
    goalText: 'Dig to -10 and Activate Monument',
    aiMode: 'none',
    getTutorialHint: (state) => state.language === 'RU' ? "Копайте до уровня -10!" : "Dig down to Level -10!",
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [true];
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.18  BASTION OF FATE — HEXAGON_7 Shape
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.18',
    title: 'Бастион Судьбы',
    description: 'Возведите крепость из 7 центральных плит уровня L4.',
    objectiveHexes: [],
    mapConfig: { size: 5, type: 'procedural' },
    startState: { credits: 150, moves: 40, rank: 5, materials: 18, initialEntropy: 40 },
    goalText: 'Build a Level 4 HEXAGON_7 shape',
    aiMode: 'none',
    requiredShapes: [{ type: 'HEXAGON_7', level: 4, hint: 'Construct a HEXAGON of Level 4 hexes' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ЧЕРТЕЖ: Гексагон L4." : "BLUEPRINT: L4 Hexagon.",
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: () => {},
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.19  MIRROR NEXUS — Multi-shape
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.19',
    title: 'Зеркальный Нексус',
    description: 'Постройте Стрелу L3 и Ромб L2 на одной карте.',
    objectiveHexes: [],
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 200, moves: 40, rank: 5, materials: 20, initialEntropy: 40 },
    goalText: 'Build L3 LINE_3 and L2 DIAMOND_4',
    aiMode: 'none',
    requiredShapes: [
      { type: 'LINE_3', level: 3, hint: 'LINE_3 Level 3' },
      { type: 'DIAMOND_4', level: 2, hint: 'DIAMOND_4 Level 2' }
    ],
    getTutorialHint: (state) => state.language === 'RU' ? "ДВА ЧЕРТЕЖА: Линия L3 и Ромб L2." : "TWO BLUEPRINTS: L3 Line & L2 Diamond.",
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: () => {},
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  },

  // ═══════════════════════════════════════════════════════════════════
  //  3.20  RITUAL OF TRIUMPH — RING_6 + Scanner
  // ═══════════════════════════════════════════════════════════════════
  {
    id: '3.20',
    title: 'Ритуал Триумфа',
    description: 'Соберите Кольцо L3 вокруг Монумента и доставьте Stability Scanner.',
    objectiveHexes: [
      { q: 0, r: 0, targetLevel: 5, label: 'Monument', color: 'emerald' }
    ],
    mapConfig: { size: 6, type: 'procedural' },
    startState: { credits: 180, moves: 30, rank: 5, materials: 15, initialEntropy: 40, startInventory: ['stability_scanner'] },
    goalText: 'Build Level 3 RING_6 and Activate Monument',
    aiMode: 'none',
    requiredShapes: [{ type: 'RING_6', level: 3, hint: 'RING_6 Level 3' }],
    getTutorialHint: (state) => state.language === 'RU' ? "ФИНАЛ: Кольцо L3 и активация Монумента!" : "FINALE: L3 Ring & Monument activation!",
    hooks: {
      onBeforeAction: () => null,
      onAfterAction: (state) => {
        if (!state.monumentRevealedSlots) state.monumentRevealedSlots = [true];
      },
      checkWinCondition: () => false,
      checkLossCondition: (state) => isStranded(state)
    }
  }
];
