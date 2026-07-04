import { System } from './System';
import { GameEvent, SessionState, EntityState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { GameEventFactory } from '../events';
import { getHexKey, getNeighbors } from '../../services/hexUtils';

const makeRng = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  s = (s * 16807) % 2147483647;
  s = (s * 16807) % 2147483647;
  s = (s * 16807) % 2147483647;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};

export class MeteorSystem implements System {
  update(state: SessionState, index: WorldIndex, events: GameEvent[]): void {
    if (state.gameStatus !== 'PLAYING') return;

    if (state.activeLevelConfig?.id?.startsWith('1.')) {
      state.activeMeteors = [];
      return;
    }

    if (!state.activeMeteors) {
      state.activeMeteors = [];
    }

    // (a0ea8cd) Контракт: все броски тика — из одного инстанса (не пересоздавать RNG каждый раз с тем же сидом)
    const rng = makeRng(state.currentTurn);
    
    const now = Date.now();
    const activeMeteors = [...state.activeMeteors];
    const remainingMeteors: any[] = [];

    // 1. Process existing active meteors
    for (const meteor of activeMeteors) {
      const updatedTicks = meteor.warnTicksRemaining - 1;
      if (updatedTicks <= 0) {
        // --- STRIKE ---
        const targetKey = getHexKey(meteor.q, meteor.r);
        const hex = state.grid[targetKey];
        if (hex) {
          // If it is a monument or indestructible, it is immune
          if (hex.structureType === 'MONUMENT' || hex.isIndestructible) {
            state.messageLog.unshift({
              id: `meteor-shielded-${now}-${meteor.id}`,
              text: state.language === 'RU' 
                ? '🛡️ Метеор поглощен щитом Монумента!' 
                : '🛡️ Meteor absorbed by the Monument shield!',
              type: 'INFO',
              source: 'SYSTEM',
              timestamp: now
            });
          } else {
            const entropyPercent = state.entropy.current / state.entropy.max;
            
            let isVoidImpact = entropyPercent < 0.3; // при очень низкой энтропии -> VOID
            let prevLevel = hex.currentLevel;
            let newLevel = prevLevel - 1;
            let structureType = hex.structureType;

            if (isVoidImpact) {
              structureType = 'VOID';
              newLevel = 0;
            }

            state.grid[targetKey] = {
              ...hex,
              currentLevel: newLevel,
              maxLevel: Math.min(hex.maxLevel, newLevel),
              structureType,
              progress: 0
            };

            const impactMsg = isVoidImpact
              ? (state.language === 'RU' ? `💥 КАТАСТРОФА: Метеор уничтожил гекс в ПУСТОТУ на Q:${meteor.q}, R:${meteor.r}!` : `💥 DISASTER: Meteor vaporized hex to VOID at Q:${meteor.q}, R:${meteor.r}!`)
              : (state.language === 'RU' ? `☄️ УДАР: Метеор понизил уровень гекса на Q:${meteor.q}, R:${meteor.r}!` : `☄️ IMPACT: Meteor damaged hex level at Q:${meteor.q}, R:${meteor.r}!`);

            state.messageLog.unshift({
              id: `meteor-strike-log-${now}-${meteor.id}`,
              text: impactMsg,
              type: 'WARN',
              source: 'SYSTEM',
              timestamp: now
            });

            events.push(GameEventFactory.create('METEOR_STRIKE', impactMsg, undefined, { q: meteor.q, r: meteor.r }));

            // Check if player is standing on this hex
            if (state.player.q === meteor.q && state.player.r === meteor.r) {
              if (state.player.playerLevel <= 1) {
                state.gameStatus = "DEFEAT";
                const deathMsg = state.language === "RU" ? "💥 ПРЯМОЕ ПОПАДАНИЕ! Метеор уничтожил вас!" : "💥 DIRECT HIT! Meteor crushed you!";
                state.messageLog.unshift({ id: `player-death-meteor-${now}`, text: deathMsg, type: "ERROR", source: "SYSTEM", timestamp: now });
                events.push(GameEventFactory.create("DEFEAT", deathMsg, state.player.id, { q: meteor.q, r: meteor.r }));
              } else {
                // Direct hit on player -> -1 playerLevel (rank) + short knockback
              state.player.playerLevel = Math.max(1, state.player.playerLevel - 1);
              
              // Knockback: move player to a valid adjacent neighbor
              const neighbors = getNeighbors(state.player.q, state.player.r);
              const validNeighbors = neighbors.filter(n => {
                const k = getHexKey(n.q, n.r);
                const h = state.grid[k];
                return h && h.structureType !== 'VOID' && !index.isOccupied(n.q, n.r);
              });

              let kbMsg = '';
              if (validNeighbors.length > 0) {
                const chosen = validNeighbors[Math.floor(rng() * validNeighbors.length)];
                state.player.q = chosen.q;
                state.player.r = chosen.r;
                state.player.state = EntityState.IDLE;
                state.player.movementQueue = [];
                kbMsg = state.language === 'RU'
                  ? `💥 ПРЯМОЕ ПОПАДАНИЕ! Ранг -1. Вас отбросило ударной волной!`
                  : `💥 DIRECT HIT! Rank -1. Knocked back by shockwave!`;
              } else {
                state.player.state = EntityState.IDLE;
                state.player.movementQueue = [];
                kbMsg = state.language === 'RU'
                  ? `💥 ПРЯМОЕ ПОПАДАНИЕ! Ранг -1.`
                  : `💥 DIRECT HIT! Rank -1.`;
              }

              state.messageLog.unshift({
                id: `player-hit-meteor-${now}`,
                text: kbMsg,
                type: 'ERROR',
                source: 'SYSTEM',
                timestamp: now
              });

              events.push(GameEventFactory.create('PLAYER_HIT_BY_METEOR', kbMsg, state.player.id, { q: meteor.q, r: meteor.r }));
              }
            }

            // Check bots standing on this hex
            for (const bot of state.bots) {
              if (bot.q === meteor.q && bot.r === meteor.r) {
                // Knockback bots too!
                const neighbors = getNeighbors(bot.q, bot.r);
                const validNeighbors = neighbors.filter(n => {
                  const k = getHexKey(n.q, n.r);
                  const h = state.grid[k];
                  return h && h.structureType !== 'VOID' && !index.isOccupied(n.q, n.r);
                });

                if (validNeighbors.length > 0) {
                  const chosen = validNeighbors[Math.floor(rng() * validNeighbors.length)];
                  bot.q = chosen.q;
                  bot.r = chosen.r;
                  bot.state = EntityState.IDLE;
                  bot.movementQueue = [];
                }
              }
            }
          }
        }
      } else {
        remainingMeteors.push({
          ...meteor,
          warnTicksRemaining: updatedTicks
        });
      }
    }

    state.activeMeteors = remainingMeteors;

    // 2. Spawn new meteors
    // Frequency = inverse to entropy%
    // High entropy -> rare; low entropy -> shower ("ливень")
    const entropyPercent = state.entropy.current / state.entropy.max;
    
    // Spawn chance formula:
    // e.g. 100% entropy -> 0.002 (0.2% per tick)
    // 0% entropy -> 0.15 (15% per tick, i.e., average 1.5 per second)
    const spawnChance = 0.002 + 0.148 * Math.pow(1 - entropyPercent, 2);

    if (rng() < spawnChance && state.activeMeteors.length < 12) {
      // Find a target hex (not void, not monument, not currently targeted)
      const targetedHexes = new Set(state.activeMeteors.map(m => getHexKey(m.q, m.r)));
      const candidates = Object.values(state.grid).filter(hex => {
        if (hex.structureType === 'VOID' || hex.structureType === 'MONUMENT') return false;
        const key = getHexKey(hex.q, hex.r);
        return !targetedHexes.has(key);
      });

      if (candidates.length > 0) {
        const target = candidates[Math.floor(rng() * candidates.length)];
        const meteorId = 'meteor-' + rng().toString(36).substring(7);
        
        // 1.5s to 5s (15 to 50 ticks) depending on entropy
        const warnTicks = Math.floor(15 + 35 * entropyPercent);

        state.activeMeteors.push({
          id: meteorId,
          q: target.q,
          r: target.r,
          warnTicksRemaining: warnTicks,
          maxWarnTicks: warnTicks
        });

        events.push(GameEventFactory.create('METEOR_WARN', undefined, undefined, {
          id: meteorId,
          q: target.q,
          r: target.r,
          durationTicks: warnTicks
        }));
      }
    }
  }
}
