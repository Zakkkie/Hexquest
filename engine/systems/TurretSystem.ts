import { System } from './System';
import { GameEvent, SessionState, EntityState } from '../../types';
import { WorldIndex } from '../WorldIndex';
import { cubeDistance } from '../../services/hexUtils';
import { GameEventFactory } from '../events';

export class TurretSystem implements System {
  update(state: SessionState, _index: WorldIndex, events: GameEvent[]): void {
    if (!state.defense?.isDefenseMode) return;
    const now = Date.now();
    const grid = state.grid;

    // 1. Process wave spawning in defense mode
    this.handleWaveSpawning(state, now, events);

    // 2. Clear any recycled bots that might have run out of moves via other mechanics
    this.recycleDeadBots(state, now, events);

    // 3. Process each turret firing
    const turretSpeedUpgrade = state.campaignUpgrades?.turretSpeed ?? 0;

    for (const key in grid) {
      const cell = grid[key];
      if (cell.structureType === 'TURRET' || cell.isTurret) {
        // Enforce cooldown with turretSpeed upgrade reduction (-500ms per upgrade level, min 1000ms)
        const baseCooldown = cell.turretCooldown ?? 5000;
        const cooldown = Math.max(1000, baseCooldown - turretSpeedUpgrade * 500);
        const lastFired = cell.lastRecoveryUseTime ?? 0; // abuse this timestamp slot for firing cooldown
        if (now - lastFired < cooldown) {
          continue;
        }

        // Calculate dynamic range with height bonus
        const L_att = cell.currentLevel ?? 0;
        const baseRange = cell.turretRange ?? 2;
        const baseDamage = 1; // Base damage is 1 Rank per shot

        // Find closest active bot in range
        let targetBot: any = null;
        let bestDistance = Infinity;
        let finalEffectiveRange = baseRange;
        let finalDmg = baseDamage;

        for (const bot of state.bots) {
          if (bot.moves <= 0 || (bot.playerLevel ?? 1) < 1) continue;
          
          const botHex = grid[`${bot.q},${bot.r}`];
          const L_tgt = botHex ? (botHex.currentLevel ?? 0) : 0;

          // Dynamic range modifier based on attacker (L_att) and target (L_tgt)
          // Placing turrets on peaks (L_att >= 2) increases range by +1
          const peakRangeBonus = L_att >= 2 ? 1 : 0;
          // High Ground Advantage: +1 range for every 2 levels of height difference (L_att - L_tgt)
          const heightDiffRangeBonus = Math.max(0, Math.floor((L_att - L_tgt) / 2));
          const effectiveRange = baseRange + peakRangeBonus + heightDiffRangeBonus;

          const dist = cubeDistance({ q: cell.q, r: cell.r }, { q: bot.q, r: bot.r });
          if (dist <= effectiveRange && dist < bestDistance) {
            bestDistance = dist;
            targetBot = bot;
            finalEffectiveRange = effectiveRange;

            // Height bonus damage: if turret is significantly higher (+2 levels), deal 2 rank damage
            const heightDiff = L_att - L_tgt;
            if (heightDiff >= 2) {
              finalDmg = 2;
            } else {
              finalDmg = 1;
            }
          }
        }

        // Fire!
        if (targetBot) {
          // Reduce bot rank by turret damage
          targetBot.playerLevel = (targetBot.playerLevel ?? 1) - finalDmg;
          const isDestroyed = targetBot.playerLevel < 1;

          if (isDestroyed) {
            targetBot.moves = 0; // Trigger recycling
          }
          
          cell.lastRecoveryUseTime = now; // set fired cooldown ts

          const isRu = state.language === 'RU';
          const msg = isDestroyed
            ? (isRu 
                ? `💥 Турель на (${cell.q}, ${cell.r}) уничтожила бота ${targetBot.id}! (Ранг опустился ниже 1)`
                : `💥 Turret at (${cell.q}, ${cell.r}) destroyed bot ${targetBot.id}! (Rank dropped below 1)`)
            : (isRu
                ? `🛡️ Турель на (${cell.q}, ${cell.r}) нанесла удар боту ${targetBot.id}! Осталось ранга: ${targetBot.playerLevel}`
                : `🛡️ Turret at (${cell.q}, ${cell.r}) hit bot ${targetBot.id}! Remaining Rank: ${targetBot.playerLevel}`);

          state.messageLog.unshift({
            id: `turret-fire-${now}-${cell.q}-${cell.r}`,
            text: msg,
            type: isDestroyed ? 'WARN' : 'INFO',
            source: 'SYSTEM',
            timestamp: now
          });

          // Add visual floating text effect on target bot cell
          state.effects = state.effects || [];
          state.effects.push({
            id: `turret-text-${now}-${cell.q}-${cell.r}`,
            q: targetBot.q,
            r: targetBot.r,
            text: isDestroyed ? `💥 DESTROYED!` : `-${finalDmg} RANK`,
            color: isDestroyed ? '#EF4444' : '#F43F5E',
            startTime: now,
            lifetime: 2500,
            icon: isDestroyed ? 'SKULL' : 'WARN',
            sourceQ: cell.q,
            sourceR: cell.r
          });

          // Add a custom visual event so the map renderer can draw laser beam/pings
          events.push({
            id: `turret-fired-evt-${now}-${cell.q}-${cell.r}`,
            type: 'TURRET_FIRED' as any,
            entityId: 'SYSTEM',
            message: `Turret fired`,
            data: {
              turretQ: cell.q,
              turretR: cell.r,
              targetQ: targetBot.q,
              targetR: targetBot.r,
              damage: finalDmg
            },
            timestamp: now
          });

          // Immediately recycle this bot if dead
          this.recycleDeadBots(state, now, events);
        }
      }
    }
  }

  private handleWaveSpawning(state: SessionState, now: number, events: GameEvent[]): void {
    if (!state.defense?.isDefenseMode) return;

    // Check if wave timer is working. Initialize if missing and spawn Wave 1 immediately!
    let triggerSpawn = false;
    if (!state.defense.waveSpawnTimer) {
      state.defense.waveSpawnTimer = now;
      state.defense.currentWave = 1;
      triggerSpawn = true;
    }

    const elapsedMs = now - state.defense.waveSpawnTimer;
    const hasMoreWaves = state.defense.currentWave < state.defense.maxWaves;

    if (elapsedMs >= 60000) {
      if (hasMoreWaves) {
        state.defense.waveSpawnTimer = now;
        state.defense.currentWave = (state.defense.currentWave ?? 1) + 1;
        triggerSpawn = true;
      }
    } else if (state.bots.length === 0 && hasMoreWaves) {
      // Player cleared all bots early! Trigger next wave immediately!
      state.defense.waveSpawnTimer = now;
      state.defense.currentWave = (state.defense.currentWave ?? 1) + 1;
      triggerSpawn = true;

      const isRu = state.language === 'RU';
      state.messageLog.unshift({
        id: `wave-early-${now}`,
        text: isRu 
          ? `⚡ ВОЛНА ЗАЧИЩЕНА БЫСТРЕЕ ЧЕМ ЗА МИНУТУ! Запуск следующей волны!` 
          : `⚡ WAVE CLEARED EARLY! Spawning next wave immediately!`,
        type: 'SUCCESS',
        source: 'SYSTEM',
        timestamp: now
      });
    }

    if (triggerSpawn) {
      const waveIndex = state.defense.currentWave;
      const waveSubIndex = (waveIndex - 1) % 3;
      const waveGroup = Math.floor((waveIndex - 1) / 3) + 1;
      const spawnCount = waveGroup * 3;

      // Determine dynamic radius based on player owned hexes or map size
      const playerOwned = Object.values(state.grid).filter((h: any) => h.ownerId === 'player-1' || h.structureType === 'CORE' || h.isCore);
      let maxBuiltDist = 0;
      for (const ph of playerOwned) {
          const d = cubeDistance({ q: 0, r: 0 }, { q: ph.q, r: ph.r });
          if (d > maxBuiltDist) maxBuiltDist = d;
      }
      const mapRadius = Math.max(7, Math.min(10, maxBuiltDist + 6));

      const getSiegeSpawnPoint = (): { q: number; r: number } => {
          const candidates: { q: number; r: number }[] = [];
          for (let q = -mapRadius; q <= mapRadius; q++) {
              for (let r = -mapRadius; r <= mapRadius; r++) {
                  if (Math.abs(q + r) <= mapRadius) {
                      let isEligible = true;
                      for (const ph of playerOwned) {
                          if (cubeDistance({ q: ph.q, r: ph.r }, { q, r }) <= 4) {
                              isEligible = false;
                              break;
                          }
                      }
                      if (isEligible) {
                          candidates.push({ q, r });
                      }
                  }
              }
          }
          if (candidates.length > 0) {
              return candidates[Math.floor(Math.random() * candidates.length)];
          }
          // Fallback: spawn on outer rim (exact hexagonal boundary coordinates)
          const side = Math.floor(Math.random() * 6);
          const i = Math.floor(Math.random() * mapRadius);
          let q = 0, r = 0;
          switch (side) {
              case 0:
                  q = mapRadius - i;
                  r = i;
                  break;
              case 1:
                  q = -i;
                  r = mapRadius;
                  break;
              case 2:
                  q = -mapRadius;
                  r = mapRadius - i;
                  break;
              case 3:
                  q = -mapRadius + i;
                  r = -i;
                  break;
              case 4:
                  q = i;
                  r = -mapRadius;
                  break;
              case 5:
                  q = mapRadius;
                  r = -mapRadius + i;
                  break;
          }
          return { q, r };
      };

      let spawnedCount = 0;
      for (let i = 0; i < spawnCount; i++) {
        const pt = getSiegeSpawnPoint();
        
        // Ensure hex exists in grid
        const key = `${pt.q},${pt.r}`;
        if (!state.grid[key] || state.grid[key].structureType === 'VOID') {
          const randomDepth = -1 - Math.floor(Math.random() * 3);
          state.grid[key] = {
            id: key,
            q: pt.q,
            r: pt.r,
            currentLevel: randomDepth,
            maxLevel: randomDepth,
            structureType: 'NONE',
            isPassable: true,
            isExcavated: true,
            revealed: false,
            progress: 0
          };
        }

        let botRole: 'SIEGE_GRINDER' | 'SIEGE_RUNNER' | 'SIEGE_TANK' = 'SIEGE_GRINDER';
        let botColor = '#EF4444'; // Red
        let botMoves = 15;
        let botHead = 4;
        let botBody = 4;
        let baseRank = 2;

        const waveRankBonus = Math.floor((state.defense.currentWave - 1) / 3);

        if (waveSubIndex === 0) {
          // Simple wave: only Grinders
          botRole = 'SIEGE_GRINDER';
          botColor = '#EF4444';
          botMoves = 15;
          botHead = 4;
          botBody = 4;
          baseRank = 2;
        } else if (waveSubIndex === 1) {
          // Mixed wave: cycle Grinder, Runner, Tank
          const r = i % 3;
          if (r === 0) {
            botRole = 'SIEGE_GRINDER';
            botColor = '#EF4444';
            botMoves = 15;
            botHead = 4;
            botBody = 4;
            baseRank = 2;
          } else if (r === 1) {
            botRole = 'SIEGE_RUNNER';
            botColor = '#EAB308'; // Yellow
            botMoves = 6;
            botHead = 2;
            botBody = 1;
            baseRank = 1;
          } else {
            botRole = 'SIEGE_TANK';
            botColor = '#8B5CF6'; // Purple
            botMoves = 40;
            botHead = 3;
            botBody = 3;
            baseRank = 3;
          }
        } else {
          // Hard wave: cycle Tank, Tank, Grinder
          const r = i % 3;
          if (r === 0 || r === 1) {
            botRole = 'SIEGE_TANK';
            botColor = '#8B5CF6';
            botMoves = 40;
            botHead = 3;
            botBody = 3;
            baseRank = 3;
          } else {
            botRole = 'SIEGE_GRINDER';
            botColor = '#EF4444';
            botMoves = 15;
            botHead = 4;
            botBody = 4;
            baseRank = 2;
          }
        }

        // Base wave rank starts at Rank 4 on Wave 1 (3 + wave)
        const waveBaseRank = 3 + state.defense.currentWave;
        let roleOffset = 0;
        if (botRole === 'SIEGE_RUNNER') roleOffset = -1;
        if (botRole === 'SIEGE_TANK') roleOffset = 1;

        const initialBotRank = Math.min(10, Math.max(1, waveBaseRank + roleOffset));

        // Spawn specialized bot
        const botId = `saboteur-w${state.defense.currentWave}-${i+1}`;
        state.bots.push({
          id: botId,
          type: 'BOT' as any,
          state: EntityState.IDLE,
          q: pt.q,
          r: pt.r,
          playerLevel: initialBotRank,
          coins: 200,
          moves: botMoves,
          totalCoinsEarned: 0,
          actionsTaken: 0,
          movementQueue: [],
          storage: Math.min(2, state.player.maxStorage || 4),
          maxStorage: state.player.maxStorage || 4,
          inventory: [],
          avatarColor: botColor,
          headIndex: botHead,
          bodyIndex: botBody,
          recentUpgrades: [],
          activeStatuses: [],
          memory: {
            stuckCounter: 0,
            isCampaign: true,
            lastPlayerPos: null,
            botRole: botRole
          }
        });
        spawnedCount++;
      }

      const isRu = state.language === 'RU';
      const waveMsg = isRu
        ? `⚠️ ОБНАРУЖЕНА ВОЛНА ${waveIndex}! На ядро напали ${spawnedCount} ботов!`
        : `⚠️ WAVE ${waveIndex} DETECTED! ${spawnedCount} bots unleashed to attack the core!`;

      state.messageLog.unshift({
        id: `wave-${now}`,
        text: waveMsg,
        type: 'WARN',
        source: 'SYSTEM',
        timestamp: now
      });

      events.push(GameEventFactory.create('BOT_LOG', `Wave ${state.defense.currentWave} Spawned`, 'SYSTEM'));
    }
  }

  private recycleDeadBots(state: SessionState, now: number, events: GameEvent[]): void {
    const originalCount = state.bots.length;
    const survivingBots = state.bots.filter(bot => bot.moves > 0);

    if (survivingBots.length < originalCount) {
      const deadBots = state.bots.filter(bot => bot.moves <= 0);
      state.bots = survivingBots;

      for (const bot of deadBots) {
        // Award Player: +15 Credits and +1 Material
        state.player.coins += 15;
        state.player.totalCoinsEarned += 15;

        let matGained = 0;
        if (state.player.storage < state.player.maxStorage) {
          state.player.storage += 1;
          matGained = 1;
        }

        // Add visual floating text effect for recycled bot
        state.effects = state.effects || [];
        state.effects.push({
          id: `recycle-text-${now}-${bot.id}`,
          q: bot.q,
          r: bot.r,
          text: `RECYCLED! +15¢`,
          color: '#10B981', // brilliant emerald green
          startTime: now,
          lifetime: 2500,
          icon: 'SKULL'
        });

        // Update defense stats for threat neutralized tracking
        if (state.defense) {
          state.defense.totalEliminated = (state.defense.totalEliminated ?? 0) + 1;
        }

        const msg = `⚡ Bot ${bot.id} battery depleted and recycled! +15 Credits, +${matGained} Material.`;
        state.messageLog.unshift({
          id: `recycle-${now}-${bot.id}`,
          text: msg,
          type: 'SUCCESS',
          source: 'SYSTEM',
          timestamp: now
        });

        events.push({
          id: `bot-recycled-${now}-${bot.id}`,
          type: 'BOT_RECYCLED' as any,
          entityId: bot.id,
          message: `Bot recycled`,
          data: {
            gridKey: `${bot.q},${bot.r}`,
            credits: 15,
            material: matGained
          },
          timestamp: now
        });
      }
    }
  }
}
