// src/campaign/scaler.ts
import type { LevelConfig } from '../types';
import { campaignLogger } from './logger';
import { campaignLoadBalancer } from './balancer';

interface PerformanceHistory {
    levelId: string;
    attempts: number;
    failures: number;
    wins: number;
    consecutiveFailures: number;
    lastResult?: 'WIN' | 'LOSS';
}

class CampaignScaler {
    private history: Record<string, PerformanceHistory> = {};

    constructor() {
        this.loadHistory();
    }

    private loadHistory() {
        if (typeof localStorage !== 'undefined') {
            try {
                const raw = localStorage.getItem('hexquest_campaign_performance_history');
                if (raw) {
                    this.history = JSON.parse(raw);
                }
            } catch (e) {
                campaignLogger.error('SCALER_HISTORY_LOAD_FAILED', 'Failed to read history from localStorage', e);
            }
        }
    }

    private saveHistory() {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('hexquest_campaign_performance_history', JSON.stringify(this.history));
            } catch (e) {
                // Ignore storage limits quietly
            }
        }
    }

    /**
     * Records the outcome of a campaign level to calculate future game scaling difficulty.
     */
    public recordLevelOutcome(levelId: string, result: 'WIN' | 'LOSS') {
        if (!this.history[levelId]) {
            this.history[levelId] = {
                levelId,
                attempts: 0,
                failures: 0,
                wins: 0,
                consecutiveFailures: 0
            };
        }

        const hist = this.history[levelId];
        hist.attempts++;
        hist.lastResult = result;

        if (result === 'WIN') {
            hist.wins++;
            hist.consecutiveFailures = 0;
            campaignLogger.info(
                'SCALER_HISTORY_RECORD',
                `Player successfully cleared level ${levelId}. Total wins: ${hist.wins}. Resetting consecutive failures.`
            );
        } else {
            hist.failures++;
            hist.consecutiveFailures++;
            campaignLogger.warn(
                'SCALER_HISTORY_RECORD',
                `Player failed level ${levelId}. Consecutive failures: ${hist.consecutiveFailures}. Adapting dynamic scaling.`
            );
        }

        this.saveHistory();
    }

    /**
     * Dynamically scales level configuration starting states & limits.
     * If the player is on a consecutive failure streak on a level, we dynamically scale down the requirement density:
     * - Boosting starting materials (up to +2)
     * - Adding extra initial moves (up to +5)
     * - Elevating starting credits
     *
     * If they are winning very easily, we can scale parameters to maintain engagement (unless it's a tutorial).
     */
    public scaleLevelConfig(rawConfig: LevelConfig): LevelConfig {
        const h = this.history[rawConfig.id];
        if (!h || h.consecutiveFailures === 0) {
            // No scaling adjustment needed yet
            return { ...rawConfig };
        }

        const scaleDownFactor = Math.min(3, h.consecutiveFailures);
        const tunedConfig = { ...rawConfig };

        // Duplicate start state safely
        if (tunedConfig.startState) {
            tunedConfig.startState = { ...tunedConfig.startState };

            // Dynamically scale parameters based on consecutive failures
            const initialMovesBonus = scaleDownFactor * 2; // +2 moves per failure
            const initialMaterialsBonus = Math.floor(scaleDownFactor / 2); // +1 material per 2 failures
            const initialCreditsBonus = scaleDownFactor * 5; // +5 credits per failure

            tunedConfig.startState.moves += initialMovesBonus;
            tunedConfig.startState.materials = (tunedConfig.startState.materials ?? 0) + initialMaterialsBonus;
            tunedConfig.startState.credits = (tunedConfig.startState.credits ?? 0) + initialCreditsBonus;

            campaignLogger.info(
                'DYNAMIC_SCALING_APPLIED',
                `Scaled level ${tunedConfig.id} configuration due to ${h.consecutiveFailures} failures. ` +
                `Added +${initialMovesBonus} moves, +${initialMaterialsBonus} materials, +${initialCreditsBonus} credits.`,
                undefined,
                `Original materials: ${rawConfig.startState?.materials}. New materials: ${tunedConfig.startState.materials}`
            );
        }

        return tunedConfig;
    }

    /**
     * Safely wraps level hooks inside error loggers & performance load balancers.
     */
    public wrapLevelWithSystems(level: LevelConfig): LevelConfig {
        const scaledLevel = this.scaleLevelConfig(level);
        const originalHooks = scaledLevel.hooks || {};

        // Memoize heavy hook computations to prevent double checks blocking the event loop
        const memoizedCheckWin = originalHooks.checkWinCondition 
            ? campaignLoadBalancer.memoize(`win:${scaledLevel.id}`, originalHooks.checkWinCondition)
            : undefined;

        const memoizedCheckLoss = originalHooks.checkLossCondition
            ? campaignLoadBalancer.memoize(`loss:${scaledLevel.id}`, originalHooks.checkLossCondition)
            : undefined;

        scaledLevel.hooks = {
            ...originalHooks,
            checkWinCondition: campaignLogger.wrapHook(
                'checkWinCondition',
                scaledLevel.id,
                memoizedCheckWin
            ),
            checkLossCondition: campaignLogger.wrapHook(
                'checkLossCondition',
                scaledLevel.id,
                memoizedCheckLoss
            ),
            onBeforeAction: campaignLogger.wrapHook(
                'onBeforeAction',
                scaledLevel.id,
                originalHooks.onBeforeAction
            ),
            onAfterAction: (state, action) => {
                // Intercept game outcomes on ticks
                const outcomeKey = `_outcome_${scaledLevel.id}`;
                if ((state as any)[outcomeKey]) return;

                if (state.gameStatus === 'VICTORY') {
                    (state as any)[outcomeKey] = true;
                    this.recordLevelOutcome(scaledLevel.id, 'WIN');
                } else if (state.gameStatus === 'DEFEAT') {
                    (state as any)[outcomeKey] = true;
                    this.recordLevelOutcome(scaledLevel.id, 'LOSS');
                }

                if (originalHooks.onAfterAction) {
                    try {
                        originalHooks.onAfterAction(state, action);
                    } catch (err) {
                        campaignLogger.error(
                            'CAMPAIGN_ON_AFTER_ACTION_FAILED',
                            `Exception thrown in level ${scaledLevel.id} onAfterAction hook`,
                            err,
                            state
                        );
                    }
                }
            }
        };

        return scaledLevel;
    }
}

export const campaignScaler = new CampaignScaler();

/**
 * Global wrapper utility called in levels.ts to build resilient and optimal layouts.
 */
export function wrapCampaignLevels(levels: LevelConfig[]): LevelConfig[] {
    campaignLogger.info('CAMPAIGN_LEVELS_INIT', `Wrapping ${levels.length} campaign levels with Scalers, Balancers, and Loggers.`);
    return levels.map(l => campaignScaler.wrapLevelWithSystems(l));
}
