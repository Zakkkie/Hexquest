// src/campaign/balancer.ts
import { campaignLogger } from './logger';

export interface BalancedTask<T> {
    id: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    fn: () => T;
    resolve: (val: T) => void;
    reject: (err: unknown) => void;
}

class CampaignLoadBalancer {
    private queue: BalancedTask<any>[] = [];
    private isProcessing = false;
    private maxExecutionMsPerFrame = 8; // Max time to spend executing tasks before yielding
    private cacheMap = new Map<string, { timestamp: number; result: any }>();
    private cacheTTL = 500; // 500ms caching of repeating heavy calculations (e.g., pathfinder/BFS)

    /**
     * Queue a heavy CPU/logic computation to be executed in timed slices,
     * maintaining a fluid 60 FPS in standard browser runs.
     */
    public scheduleTask<T>(fn: () => T, priority: BalancedTask<T>['priority'] = 'MEDIUM'): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            const task: BalancedTask<T> = {
                id: `balanced-task-${Math.random().toString(36).substring(2, 9)}`,
                priority,
                fn,
                resolve,
                reject
            };

            // High priority goes directly to front, others append
            if (priority === 'HIGH') {
                this.queue.unshift(task);
            } else {
                this.queue.push(task);
            }

            campaignLogger.info(
                'LOAD_BALANCER_TASK_QUEUED',
                `Scheduled task ${task.id} with priority ${priority}. Remaining queue: ${this.queue.length}`
            );

            this.triggerProcess();
        });
    }

    private triggerProcess() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        if (typeof requestAnimationFrame !== 'undefined') {
            requestAnimationFrame(() => this.processQueue());
        } else {
            setTimeout(() => this.processQueue(), 0);
        }
    }

    private processQueue() {
        const startTime = Date.now();
        let executedCount = 0;

        while (this.queue.length > 0) {
            const elapsedTime = Date.now() - startTime;
            if (elapsedTime >= this.maxExecutionMsPerFrame) {
                // Yield until the next frame to prevent thread blocking
                campaignLogger.info(
                    'LOAD_BALANCER_YIELD',
                    `Yielding frame. Completed ${executedCount} tasks. Tasks left: ${this.queue.length}. Spent ${elapsedTime}ms.`
                );
                this.isProcessing = false;
                this.triggerProcess();
                return;
            }

            const task = this.queue.shift();
            if (task) {
                try {
                    const result = task.fn();
                    task.resolve(result);
                    executedCount++;
                } catch (err) {
                    campaignLogger.error(
                        'LOAD_BALANCER_TASK_FAILED',
                        `Task ${task.id} crashed inside compiler executor`,
                        err
                    );
                    task.reject(err);
                }
            }
        }

        this.isProcessing = false;
    }

    /**
     * Helper to cache the output of demanding deterministic calculations
     * e.g., BFS exploration arrays or distance matrix generation.
     */
    public memoize<Args extends any[], Result>(
        cacheKeyPrefix: string,
        heavyFn: (...args: Args) => Result
    ): (...args: Args) => Result {
        const self = this;
        return function(this: any, ...args: Args): Result {
            const keyStr = `${cacheKeyPrefix}:${JSON.stringify(args)}`;
            const cached = self.cacheMap.get(keyStr);
            const now = Date.now();

            if (cached && now - cached.timestamp < self.cacheTTL) {
                return cached.result;
            }

            const res = heavyFn.apply(this, args);
            self.cacheMap.set(keyStr, { timestamp: now, result: res });

            // Garbage collection for cache when it gets too large
            if (self.cacheMap.size > 500) {
                const limit = now - self.cacheTTL;
                for (const [k, v] of self.cacheMap.entries()) {
                    if (v.timestamp < limit) {
                        self.cacheMap.delete(k);
                    }
                }
            }

            return res;
        };
    }

    /**
     * Throttle or debounce actions to balance execution frequency.
     */
    public throttle<T extends (...args: any[]) => void>(fn: T, delay: number): T {
        let lastTime = 0;
        return function(this: any, ...args: any[]) {
            const now = Date.now();
            if (now - lastTime >= delay) {
                lastTime = now;
                fn.apply(this, args);
            }
        } as unknown as T;
    }
}

export const campaignLoadBalancer = new CampaignLoadBalancer();
