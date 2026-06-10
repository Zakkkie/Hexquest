
import { Hex, Entity, HexCoord } from '../types';
import { getHexKey, getNeighbors } from '../services/hexUtils';

/**
 * WorldIndex optimizes queries that otherwise require iterating over the entire grid.
 * It is reconstructed or updated when the game state changes significantly.
 */
export class WorldIndex {
  private grid: Record<string, Hex>;
  private entities: Map<string, Entity> = new Map(); // ID -> Entity
  
  // Indices
  private occupiedHexes: Map<string, string> = new Map(); // HexKey -> EntityID
  private structureLocations: Map<string, string[]> = new Map(); // Type -> HexIDs[]
  private hexesByOwner: Map<string, Set<string>> = new Map(); // OwnerID -> Set<HexIDs>
  
  constructor(grid: Record<string, Hex>, entities: Entity[]) {
    this.grid = grid;
    this.initEntities(entities);
    this.build();
  }

  // --- Synchronization ---

  /**
   * CRITICAL: Updates internal references to match the current simulation state.
   * Call this immediately after cloning state in GameEngine to prevent
   * systems from reading stale entity data (coins, moves, state) via the index.
   */
  public syncState(state: { grid: Record<string, Hex>; player: Entity; bots: Entity[] }) {
      if (!state) return;
      
      const gridChanged = this.grid !== state.grid;
      this.grid = state.grid;
      
      // Update Entity Map with NEW object references
      this.entities.clear();
      const allEntities = [state.player, ...state.bots];
      for (const e of allEntities) {
          if (e && e.id) {
              this.entities.set(e.id, e);
          }
      }
      
      // If the grid object is a new reference (mutated inside draft), did we modify structures?
      // Otherwise, only rebuild occupied entities index (very fast!)
      if (gridChanged) {
          this.build();
      } else {
          this.occupiedHexes.clear();
          for (const ent of this.entities.values()) {
              this.occupiedHexes.set(getHexKey(ent.q, ent.r), ent.id);
          }
      }
  }

  public syncGrid(grid: Record<string, Hex>) {
      if (!grid) return;
      if (this.grid === grid) return; // Skip if grid is already indexed and is same reference
      
      this.grid = grid;
      
      // Re-index hex-based caches
      this.structureLocations.clear();
      this.hexesByOwner.clear();
      for (const id in this.grid) {
          this.indexHex(this.grid[id]);
      }
  }

  private initEntities(entities: Entity[]) {
      this.entities.clear();
      entities.forEach(e => this.entities.set(e.id, e));
  }

  // Full Rebuild (Fallback)
  public rebuild(grid: Record<string, Hex>, entities: Entity[]) {
      this.grid = grid;
      this.initEntities(entities);
      this.build();
  }

  private build() {
    this.occupiedHexes.clear();
    this.structureLocations.clear();
    this.hexesByOwner.clear();

    // 1. Index Entities
    for (const ent of this.entities.values()) {
      this.occupiedHexes.set(getHexKey(ent.q, ent.r), ent.id);
    }
    
    // 2. Index Hexes
    for (const id in this.grid) {
      const hex = this.grid[id];
      this.indexHex(hex);
    }
  }

  private indexHex(hex: Hex) {
      // Structures
      if (hex.structureType && hex.structureType !== 'NONE') {
        const list = this.structureLocations.get(hex.structureType) || [];
        list.push(hex.id);
        this.structureLocations.set(hex.structureType, list);
      }

      // Ownership (inferred or explicit)
      if (hex.ownerId) {
          if (!this.hexesByOwner.has(hex.ownerId)) {
              this.hexesByOwner.set(hex.ownerId, new Set());
          }
          this.hexesByOwner.get(hex.ownerId)?.add(hex.id);
      }
  }

  // --- Incremental Updates ---

  /**
   * Registers a single new hex into the index.
   * Used by procedural generation / lazy loading to avoid full rebuilds.
   */
  public registerHex(hex: Hex) {
      this.indexHex(hex);
  }

  public updateEntityPosition(entityId: string, oldQ: number, oldR: number, newQ: number, newR: number) {
      try {
          const oldKey = getHexKey(oldQ, oldR);
          const newKey = getHexKey(newQ, newR);

          // Validate sync
          if (this.occupiedHexes.get(oldKey) === entityId) {
              this.occupiedHexes.delete(oldKey);
          }
          this.occupiedHexes.set(newKey, entityId);
          
          // Update the reference object itself to be safe
          const ent = this.entities.get(entityId);
          if (ent) {
              ent.q = newQ;
              ent.r = newR;
          }
      } catch (error) {
          console.warn('WorldIndex: updateEntityPosition failed', error);
      }
  }

  // --- Queries ---

  public isOccupied(q: number, r: number): boolean {
    try {
        return this.occupiedHexes.has(getHexKey(q, r));
    } catch {
        return false;
    }
  }
  
  public getEntityAt(q: number, r: number): Entity | undefined {
      try {
          const id = this.occupiedHexes.get(getHexKey(q, r));
          const ent = id ? this.entities.get(id) : undefined;
          
          // Verify proxy is still valid
          if (ent) {
              // Accessing id will throw if revoked
              void ent.id;
          }
          return ent;
      } catch (error) {
          console.warn('WorldIndex: getEntityAt detected revoked proxy', error);
          return undefined;
      }
  }

  public getOccupiedHexesList(): HexCoord[] {
    const coords: HexCoord[] = [];
    for (const ent of this.entities.values()) {
        coords.push({ q: ent.q, r: ent.r });
    }
    return coords;
  }

  public getValidNeighbors(q: number, r: number): Hex[] {
    const neighbors = getNeighbors(q, r);
    const valid: Hex[] = [];
    try {
      for (const n of neighbors) {
        const hex = this.grid[getHexKey(n.q, n.r)];
        if (hex) valid.push(hex);
      }
    } catch {
      // If this.grid is revoked, just return what we have (or empty)
    }
    return valid;
  }

  public getHexesByOwner(ownerId: string): Hex[] {
      const hexIds = this.hexesByOwner.get(ownerId);
      if (!hexIds) return [];
      
      const results: Hex[] = [];
      try {
        for (const id of hexIds) {
            const hex = this.grid[id];
            if (hex) results.push(hex);
        }
      } catch {}
      return results;
  }

  public getHexesByStructureType(type: string): Hex[] {
      const hexIds = this.structureLocations.get(type);
      if (!hexIds) return [];
      
      const results: Hex[] = [];
      try {
        for (const id of hexIds) {
            const hex = this.grid[id];
            if (hex) results.push(hex);
        }
      } catch {}
      return results;
  }

  /**
   * Optimized Range Query using BFS
   * Replaces iterating over the entire grid for AI operations.
   */
  public getHexesInRange(center: HexCoord, range: number): Hex[] {
      const results: Hex[] = [];
      const visited = new Set<string>();
      const queue: { q: number, r: number, dist: number }[] = [{ q: center.q, r: center.r, dist: 0 }];
      const startKey = getHexKey(center.q, center.r);
      visited.add(startKey);

      try {
        // Include center if it exists
        if (this.grid[startKey]) results.push(this.grid[startKey]);

        let head = 0;
        while(head < queue.length) {
            const { q, r, dist } = queue[head++];
            if (dist >= range) continue;

            const neighbors = getNeighbors(q, r);
            for (const n of neighbors) {
                const key = getHexKey(n.q, n.r);
                if (!visited.has(key)) {
                    visited.add(key);
                    const hex = this.grid[key];
                    if (hex) {
                        results.push(hex);
                        queue.push({ q: n.q, r: n.r, dist: dist + 1 });
                    }
                }
            }
        }
      } catch {}
      return results;
  }

  /**
   * Clears all indices and releases memory.
   */
  public dispose(): void {
    this.occupiedHexes.clear();
    this.structureLocations.clear();
    this.hexesByOwner.clear();
    this.entities.clear();
    
    // Explicitly nullify references
    (this.grid as any) = null;
    (this.occupiedHexes as any) = null;
    (this.structureLocations as any) = null;
    (this.hexesByOwner as any) = null;
    (this.entities as any) = null;
  }

  /**
   * Development helper for checking memory usage
   */
  public getMemoryFootprint(): { hexes: number; entities: number; indices: number } {
    return {
      hexes: this.grid ? Object.keys(this.grid).length : 0,
      entities: this.entities ? this.entities.size : 0,
      indices: (this.occupiedHexes?.size || 0) + (this.structureLocations?.size || 0) + (this.hexesByOwner?.size || 0)
    };
  }
}
