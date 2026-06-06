// src/campaign/balancer.ts

class CampaignLoadBalancer {
    private cacheMap = new Map<string, { timestamp: number; result: any }>();
    private cacheTTL = 500; // 500ms caching of repeating heavy calculations (e.g., pathfinder/BFS)

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
}

export const campaignLoadBalancer = new CampaignLoadBalancer();
