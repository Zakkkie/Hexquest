
import { FloatingText } from '../types';
import { GAME_CONFIG } from '../rules/config';

class EffectPool {
    private maxEffects: number;

    constructor(maxEffects: number = GAME_CONFIG.MAX_FLOATING_TEXTS) {
        this.maxEffects = maxEffects;
    }

    /**
     * Request to add a new effect.
     * Returns a new array including the added effect, OR the original array if limit reached or duplicate.
     */
    add(currentEffects: FloatingText[], effectData: Omit<FloatingText, 'id' | 'startTime'>): FloatingText[] {
        if (currentEffects.length >= this.maxEffects) {
            return currentEffects;
        }

        const now = Date.now();
        // Prevent adding exact duplicate text on the same hex within 400ms
        const isDuplicate = currentEffects.some(e => 
            e.q === effectData.q && 
            e.r === effectData.r && 
            e.text === effectData.text && 
            Math.abs(now - e.startTime) < 400
        );
        if (isDuplicate) return currentEffects;

        const id = `fx-${now}-${Math.random().toString(36).substr(2,5)}`;
        
        const newEffect: FloatingText = {
            id,
            startTime: now,
            lifetime: effectData.lifetime || 2500,
            ...effectData
        };

        return [...currentEffects, newEffect];
    }
    
    /**
     * Batch add multiple effects, respecting limit and deduplication
     */
    addBatch(currentEffects: FloatingText[], newEffectsData: Omit<FloatingText, 'id' | 'startTime'>[]): FloatingText[] {
        if (newEffectsData.length === 0) return currentEffects;
        
        const now = Date.now();

        // Filter out items that are near-duplicates of existing active effects
        const filteredNew = newEffectsData.filter(d => {
            return !currentEffects.some(existing => 
                existing.q === d.q && 
                existing.r === d.r && 
                existing.text === d.text && 
                Math.abs(now - existing.startTime) < 400
            );
        });

        if (filteredNew.length === 0) return currentEffects;

        const availableSpace = this.maxEffects - currentEffects.length;
        if (availableSpace <= 0) return currentEffects;
        
        const toAdd = filteredNew.slice(0, availableSpace);
        
        const newItems = toAdd.map(data => ({
            id: `fx-${now}-${Math.random().toString(36).substr(2,5)}`,
            startTime: now,
            lifetime: data.lifetime || 2500,
            ...data
        }));
        
        return [...currentEffects, ...newItems];
    }
}

export const effectPool = new EffectPool();
