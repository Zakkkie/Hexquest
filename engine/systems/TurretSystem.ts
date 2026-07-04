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
    for (const key of Object.keys(grid)) {
      const cell = grid[key];
      if (cell.structureType === 'TURRET' || cell.isTurret) {
        // Enforce cooldown
        const cooldown = cell.turretCooldown ?? 3000; // default 3 seconds
        const lastFired = cell.lastRecoveryUseTime ?? 0; // abuse this unused timestamp slot to avoid custom JSON-unfriendly extensions
        if (now - lastFired < cooldown) {
          continue;
        }

        // Calculate dynamic range with height bonus
        const L_att = cell.currentLevel ?? 0;
        const baseRange = cell.turretRange ?? 2;
        const baseDamage = cell.turretDamage ?? 3;

        // Find closest active bot in range
        let targetBot: any = null;
        let bestDistance = Infinity;
        let finalEffectiveRange = baseRange;
        let finalDmg = baseDamage;

        for (const bot of state.bots) {
          if (bot.moves <= 0) continue;
          
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

            // Dynamic damage modifier based on attacker (L_att) and target (L_tgt)
            // Placing turrets on peaks (L_att >= 2) increases damage by +25%
            let damageMultiplier = 1.0;
            if (L_att >= 2) {
              damageMultiplier += 0.25;
            }
            // Height difference modifier: +10% damage per level of height difference (L_att - L_tgt)
            // conversely, shooting upwards (L_att < L_tgt) carries -10% per level penalty
            const heightDiff = L_att - L_tgt;
            damageMultiplier += heightDiff * 0.10;

            // Enforce minimum multiplier of 0.5
            damageMultiplier = Math.max(0.5, damageMultiplier);

            finalDmg = Math.round(baseDamage * damageMultiplier);
          }
        }

        // Fire!
        if (targetBot) {
          targetBot.moves = Math.max(0, targetBot.moves - finalDmg);
          
          cell.lastRecoveryUseTime = now; // set fired cooldown ts

          const msg = `🛡️ Turret at (${cell.q}, ${cell.r}) (L${L_att}) fired at ${targetBot.id}! Range: ${finalEffectiveRange}, Damage: ${finalDmg}`;
          state.messageLog.unshift({
            id: `turret-fire-${now}-${cell.q}-${cell.r}`,
            text: msg,
            type: 'INFO',
            source: 'SYSTEM',
            timestamp: now
          });

          // Add visual floating text effect on target bot cell
          state.effects = state.effects || [];
          state.effects.push({
            id: `turret-text-${now}-${cell.q}-${cell.r}`,
            q: targetBot.q,
            r: targetBot.r,
            text: `-${finalDmg} HP`,
            color: '#F43F5E', // Rose-500 red glow
            startTime: now,
            lifetime: 1500,
            icon: 'WARN',
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
    // Spawn wave every 60 seconds (60000 ms)
    if (elapsedMs >= 60000) {
      state.defense.waveSpawnTimer = now;
      state.defense.currentWave = (state.defense.currentWave ?? 1) + 1;
      triggerSpawn = true;
    }

    if (triggerSpawn) {
      const waveIndex = state.defense.currentWave;
      
      let spawnCount = 2;
      if (state.difficulty === 'MEDIUM') spawnCount = 3;
      if (state.difficulty === 'HARD') spawnCount = 4;

      let botRole: 'SIEGE_GRINDER' | 'SIEGE_RUNNER' | 'SIEGE_TANK' = 'SIEGE_GRINDER';
      let botColor = '#EF4444'; // Red
      let botMoves = 15;
      let botHead = 4;
      let botBody = 4;
      
      if (waveIndex % 3 === 2) {
          botRole = 'SIEGE_RUNNER';
          botColor = '#EAB308'; // Yellow
          botMoves = 6;
          botHead = 2;
          botBody = 1;
          spawnCount += 2; // Runners spawn in swarm
      } else if (waveIndex % 3 === 0) {
          botRole = 'SIEGE_TANK';
          botColor = '#8B5CF6'; // Purple
          botMoves = 40;
          botHead = 3;
          botBody = 3;
          spawnCount -= 1; // Tanks are rare
      }

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
          const angle = Math.random() * Math.PI * 2;
          return {
              q: Math.round(Math.cos(angle) * mapRadius),
              r: Math.round(Math.sin(angle) * mapRadius)
          };
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

        // Spawn specialized bot
        const botId = `saboteur-w${state.defense.currentWave}-${i+1}`;
        state.bots.push({
          id: botId,
          type: 'BOT' as any,
          state: EntityState.IDLE,
          q: pt.q,
          r: pt.r,
          playerLevel: 1,
          coins: 200,
          moves: botMoves,
          totalCoinsEarned: 0,
          actionsTaken: 0,
          movementQueue: [],
          storage: 2,
          maxStorage: 4,
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

      const roleName = botRole === 'SIEGE_RUNNER' ? 'Runner' : botRole === 'SIEGE_TANK' ? 'Tank' : 'Grinder';
      state.messageLog.unshift({
        id: `wave-${now}`,
        text: `⚠️ WAVE ${state.defense.currentWave} DETECTED! ${spawnedCount} ${roleName} bots unleashed to attack the core!`,
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
          lifetime: 1500,
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
