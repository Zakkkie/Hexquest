
export class TextureCache {
    private cache = new Map<string, HTMLCanvasElement>();
    private maxCacheSize = 300; // Increased to 300 to accommodate hexes, units, and items

    getOrCreate(key: string, generator: () => HTMLCanvasElement): HTMLCanvasElement {
        // If already in cache, return it
        if (this.cache.has(key)) {
            const item = this.cache.get(key)!;
            // LRU: Refresh key position by deleting and re-setting
            // This ensures frequently used textures stay in cache
            this.cache.delete(key);
            this.cache.set(key, item);
            return item;
        }

        // If cache full, evict oldest (first inserted)
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            // Optional: Could manually free canvas memory if needed, but GC usually handles it once ref is lost
            this.cache.delete(firstKey);
        }

        // Generate and cache
        const texture = generator();
        this.cache.set(key, texture);

        return texture;
    }

    clear(): void {
        this.cache.clear();
    }

    getStats(): { size: number; maxSize: number } {
        return { size: this.cache.size, maxSize: this.maxCacheSize };
    }
}

export const textureCache = new TextureCache();
