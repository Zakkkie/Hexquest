// src/campaign/logger.ts
import { SessionState } from '../types';

export interface CampaignLogEntry {
    id: string;
    timestamp: number;
    level: 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    category: string;
    message: string;
    details?: string;
    stateSnapshot?: {
        levelId?: string;
        turn?: number;
        playerPos?: { q: number; r: number };
        playerMaterials?: number;
        playerMoves?: number;
        entropy?: number;
        totalGridHexes?: number;
    };
}

class CampaignLogger {
    private logs: CampaignLogEntry[] = [];
    private maxLogCount = 200;

    constructor() {
        this.loadFromStorage();
        this.registerGlobalHandlers();
    }

    private registerGlobalHandlers() {
        if (typeof window !== 'undefined') {
            const originalOnError = window.onerror;
            window.onerror = (message, source, lineno, colno, error) => {
                const msgStr = String(message || '');
                const srcStr = String(source || '');
                if (
                    msgStr.toLowerCase().includes('metamask') ||
                    msgStr.toLowerCase().includes('extension') ||
                    srcStr.toLowerCase().includes('metamask') ||
                    srcStr.toLowerCase().includes('extension') ||
                    srcStr.startsWith('chrome-extension:')
                ) {
                    if (originalOnError) {
                        return originalOnError(message, source, lineno, colno, error);
                    }
                    return false;
                }

                this.log({
                    level: 'CRITICAL',
                    category: 'GLOBAL_UNHANDLED_EXCEPTION',
                    message: String(message),
                    details: `Source: ${source} | Line: ${lineno}:${colno} | Stack: ${error?.stack || 'N/A'}`
                });
                if (originalOnError) {
                    return originalOnError(message, source, lineno, colno, error);
                }
                return false;
            };

            const originalOnUnhandledRejection = window.onunhandledrejection;
            window.onunhandledrejection = (event) => {
                const reason = event.reason;
                const reasonStr = reason ? String(reason.message || reason.stack || reason) : '';
                const msgStr = reason?.message || 'Promise rejected without explicit message';
                
                const isMetaMaskOrExtension = 
                    reasonStr.toLowerCase().includes('metamask') || 
                    reasonStr.toLowerCase().includes('chrome-extension') ||
                    reasonStr.toLowerCase().includes('extension') ||
                    msgStr.toLowerCase().includes('metamask') ||
                    msgStr.toLowerCase().includes('extension');

                if (isMetaMaskOrExtension) {
                    if (originalOnUnhandledRejection) {
                        return originalOnUnhandledRejection.call(window, event);
                    }
                    return;
                }

                this.log({
                    level: 'CRITICAL',
                    category: 'UNHANDLED_PROMISE_REJECTION',
                    message: msgStr,
                    details: event.reason?.stack || String(event.reason)
                });
                if (originalOnUnhandledRejection) {
                    originalOnUnhandledRejection.call(window, event);
                }
            };
        }
    }

    private loadFromStorage() {
        if (typeof localStorage !== 'undefined') {
            try {
                const raw = localStorage.getItem('hexquest_campaign_diagnostic_logs');
                if (raw) {
                    this.logs = JSON.parse(raw);
                    // Filter or validate
                    if (!Array.isArray(this.logs)) {
                        this.logs = [];
                    }
                }
            } catch (e) {
                console.warn('Failed to load campaign diagnostic logs from storage', e);
            }
        }
    }

    private saveToStorage() {
        if (typeof localStorage !== 'undefined') {
            try {
                localStorage.setItem('hexquest_campaign_diagnostic_logs', JSON.stringify(this.logs));
            } catch (e) {
                // Ignore storage quota issues gracefully
            }
        }
    }

    public log(entry: Omit<CampaignLogEntry, 'id' | 'timestamp'>) {
        const fullEntry: CampaignLogEntry = {
            id: `diag-log-${Math.random().toString(36).substring(2, 11)}-${Date.now()}`,
            timestamp: Date.now(),
            ...entry
        };

        this.logs.unshift(fullEntry);
        if (this.logs.length > this.maxLogCount) {
            this.logs = this.logs.slice(0, this.maxLogCount);
        }

        this.saveToStorage();

        // Print to development standard outputs
        const colorMap = {
            INFO: '\x1b[32m[INFO]\x1b[0m',
            WARN: '\x1b[33m[WARN]\x1b[0m',
            ERROR: '\x1b[31m[ERROR]\x1b[0m',
            CRITICAL: '\x1b[41m\x1b[37m[CRITICAL]\x1b[0m'
        };
        const consoleMethod = entry.level === 'CRITICAL' || entry.level === 'ERROR' ? 'error' : entry.level === 'WARN' ? 'warn' : 'log';
        if (typeof console !== 'undefined') {
            const prefix = colorMap[entry.level] || `[${entry.level}]`;
            console[consoleMethod](
                `${prefix} [Campaign:${entry.category}] ${entry.message}`,
                entry.details ? `\nDetails: ${entry.details}` : '',
                entry.stateSnapshot ? '\nSnapshot:' : '',
                entry.stateSnapshot || ''
            );
        }
    }

    public captureStateSnapshot(state?: SessionState): CampaignLogEntry['stateSnapshot'] {
        if (!state) return undefined;
        try {
            return {
                levelId: state.activeLevelConfig?.id,
                turn: state.currentTurn,
                playerPos: state.player ? { q: state.player.q, r: state.player.r } : undefined,
                playerMaterials: state.player?.storage,
                playerMoves: state.player?.moves,
                entropy: state.entropy?.current,
                totalGridHexes: state.grid ? Object.keys(state.grid).length : 0
            };
        } catch {
            return undefined;
        }
    }

    public info(category: string, message: string, state?: SessionState, details?: string) {
        this.log({
            level: 'INFO',
            category,
            message,
            details,
            stateSnapshot: this.captureStateSnapshot(state)
        });
    }

    public warn(category: string, message: string, state?: SessionState, details?: string) {
        this.log({
            level: 'WARN',
            category,
            message,
            details,
            stateSnapshot: this.captureStateSnapshot(state)
        });
    }

    public error(category: string, message: string, error?: unknown, state?: SessionState) {
        let details = '';
        if (error instanceof Error) {
            details = `Error: ${error.message}\nStack: ${error.stack}`;
        } else if (error) {
            details = String(error);
        }
        this.log({
            level: 'ERROR',
            category,
            message,
            details,
            stateSnapshot: this.captureStateSnapshot(state)
        });
    }

    /**
     * Wrap any campaign execution hook securely to catch uncaught logic errors and log details.
     */
    public wrapHook<T extends (...args: any[]) => any>(
        hookName: string,
        levelId: string,
        fn?: T
    ): T | undefined {
        if (!fn) return undefined;
        const self = this;
        return function(this: any, ...args: any[]) {
            const state = args[0] as SessionState | undefined;
            try {
                return fn.apply(this, args);
            } catch (err) {
                self.error(
                    'CAMPAIGN_HOOK_EXECUTION_FAILED',
                    `Exception thrown in campaign hook ${hookName} under level ${levelId}`,
                    err,
                    state
                );
                // Return a safe fallback so the gameplay engine does not hard crash
                if (hookName === 'checkWinCondition' || hookName === 'checkLossCondition') {
                    return false;
                }
                if (hookName === 'onBeforeAction') {
                    return { ok: true }; // Allow fallback
                }
                return undefined;
            }
        } as unknown as T;
    }
}

export const campaignLogger = new CampaignLogger();
