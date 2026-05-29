
export class TextureCache {
    private cache = new Map<string, HTMLCanvasElement | HTMLImageElement>();
    private maxCacheSize: number;

    constructor() {
        // Adaptive Cache Size: 100 for Mobile, 300 for Desktop
        const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
        this.maxCacheSize = isMobile ? 100 : 300;
    }

    getOrCreate<T extends HTMLCanvasElement | HTMLImageElement>(key: string, generator: () => T): T {
        // If already in cache, return it
        if (this.cache.has(key)) {
            const item = this.cache.get(key)!;
            // LRU: Refresh key position by deleting and re-setting
            // This ensures frequently used textures stay in cache
            this.cache.delete(key);
            this.cache.set(key, item);
            return item as T;
        }

        // If cache full, evict oldest (first inserted)
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey !== undefined) {
                const canvasToEvict = this.cache.get(firstKey);
                // Принудительно сбрасываем размеры Canvas перед удалением.
                // Это заставляет браузер мгновенно высвободить память GPU (VRAM).
                if (canvasToEvict && canvasToEvict instanceof HTMLCanvasElement) {
                    canvasToEvict.width = 0;
                    canvasToEvict.height = 0;
                }
                this.cache.delete(firstKey);
            }
        }

        // Generate and cache
        const texture = generator();
        this.cache.set(key, texture);

        return texture;
    }

    clear(): void {
        this.cache.forEach((item) => {
            if (item instanceof HTMLCanvasElement) {
                item.width = 0;
                item.height = 0;
            }
        });
        this.cache.clear();
    }

    getStats(): { size: number; maxSize: number } {
        return { size: this.cache.size, maxSize: this.maxCacheSize };
    }
}

export const textureCache = new TextureCache();
