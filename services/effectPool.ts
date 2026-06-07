
import { FloatingText } from '../types';
import { GAME_CONFIG } from '../rules/config';

class EffectPool {
    private maxEffects: number;

    constructor(maxEffects: number = GAME_CONFIG.MAX_FLOATING_TEXTS) {
        this.maxEffects = maxEffects;
    }

    /**
     * Request to add a new effect.
     * Returns a new array including the added effect, OR the original array if limit reached.
     */
    add(currentEffects: FloatingText[], effectData: Omit<FloatingText, 'id' | 'startTime'>): FloatingText[] {
        if (currentEffects.length >= this.maxEffects) {
            // Option: Drop new effects if full to prevent overload
            // Alternatively: Drop oldest (shift). Dropping new is faster (O(1)).
            return currentEffects;
        }

        const id = `fx-${Date.now()}-${Math.random().toString(36).substr(2,5)}`;
        
        const newEffect: FloatingText = {
            id,
            startTime: Date.now(),
            ...effectData
        };

        return [...currentEffects, newEffect];
    }
    
    /**
     * Batch add multiple effects, respecting limit
     */
    addBatch(currentEffects: FloatingText[], newEffectsData: Omit<FloatingText, 'id' | 'startTime'>[]): FloatingText[] {
        if (newEffectsData.length === 0) return currentEffects;
        
        const availableSpace = this.maxEffects - currentEffects.length;
        if (availableSpace <= 0) return currentEffects;
        
        const toAdd = newEffectsData.slice(0, availableSpace);
        const now = Date.now();
        
        const newItems = toAdd.map(data => ({
            id: `fx-${now}-${Math.random().toString(36).substr(2,5)}`,
            startTime: now,
            ...data
        }));
        
        return [...currentEffects, ...newItems];
    }
}

export const effectPool = new EffectPool();
