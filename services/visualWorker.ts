
const VOID_LEVEL_FLAG = -99;
const HEX_SIZE = 35;

const getHexKey = (q: number, r: number) => `${q},${r}`;
const NEIGHBOR_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, 
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

const cubeDistance = (a: {q:number, r:number}, b: {q:number, r:number}): number => {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

const getHeightOffset = (level: number) => {
    if (level <= VOID_LEVEL_FLAG) return 0;
    if (level >= 0) return -(10 + level * 10);
    return (Math.abs(level) - 1) * 10;
};

// Worker State
let cachedGrid: any = null;
let cachedChunks: any = null;
let cachedNeighborLevelsMap: Record<string, number[]> = {};

let cachedPlayer: any = null;
let cachedRotation: number = 0;
let cachedBots: any = null;
let cachedVisibleChunks: any = null;
let cachedPendingKey: string | null = null;
let cachedSelectedHexId: string | null = null;

const calculateNeighborLevels = (grid: any) => {
    const map: Record<string, number[]> = {};
    for (const key in grid) {
        const hex: any = grid[key];
        const neighbors = NEIGHBOR_DIRECTIONS.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
        const levels = neighbors.map(n => {
            const nKey = getHexKey(n.q, n.r);
            const nHex = grid[nKey];
            return nHex ? (nHex.currentLevel ?? 0) : VOID_LEVEL_FLAG;
        });
        map[key] = levels;
    }
    return map;
};

self.onmessage = (e) => {
    const { 
        type,
        grid, rotation, player, bots, 
        visibleChunks, chunks, pendingKey, 
        selectedHexId
    } = e.data;

    if (type === 'SET_GRID') {
        cachedGrid = grid;
        cachedChunks = chunks;
        cachedNeighborLevelsMap = calculateNeighborLevels(grid);
        self.postMessage({ neighborLevelsMap: cachedNeighborLevelsMap });
        // Don't return, fall through to re-render if we have the view cached
        if (!cachedPlayer) return; 
    } else {
        cachedRotation = rotation;
        cachedPlayer = player;
        cachedBots = bots;
        cachedVisibleChunks = visibleChunks;
        cachedPendingKey = pendingKey;
        cachedSelectedHexId = selectedHexId;
    }

    // Default or 'UPDATE_VIEW'
    const currentGrid = cachedGrid;
    const currentChunks = cachedChunks;
    
    if (!currentGrid || !cachedPlayer) return;

    const items: any[] = [];

    const angleRad = cachedRotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const SQRT3 = Math.sqrt(3);
    const SQRT3_2 = SQRT3 / 2;
    const ONE_POINT_FIVE = 1.5;

    // 2. Collect Hexes from visible chunks
    if (cachedVisibleChunks && currentChunks) {
        for (const chunkKey of cachedVisibleChunks) {
            const hexes = currentChunks[chunkKey];
            if (!hexes) continue;

            for (const hex of hexes) {
                const distToPlayer = cubeDistance({ q: cachedPlayer.q, r: cachedPlayer.r }, { q: hex.q, r: hex.r });
                if (distToPlayer > 20) continue;

                const rawX = HEX_SIZE * (SQRT3 * hex.q + SQRT3_2 * hex.r);
                const rawY = HEX_SIZE * (ONE_POINT_FIVE * hex.r);
                
                // Depth for sorting ONLY
                const depth = (rawX * sin + rawY * cos) * 0.8;

                let opacity = 1.0;
                if (distToPlayer > 16) {
                    opacity = Math.max(0, 1.0 - (distToPlayer - 16) / 4);
                }
                if (opacity <= 0) continue;

                const isVoid = (hex.structureType as string) === 'VOID';
                const offsetY = isVoid ? -10 : getHeightOffset(isVoid ? 0 : hex.currentLevel ?? 0);

                const isPending = hex.id === cachedPendingKey;
                const isOccupiedByPlayer = hex.q === cachedPlayer.q && hex.r === cachedPlayer.r;
                
                const neighborLevels = cachedNeighborLevelsMap[hex.id] || [VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG];

                // Fog of War opacity 
                const finalOpacity = hex.revealed ? opacity : opacity * 0.25;

                items.push({
                    type: 'HEX',
                    depth: depth, // Sort STRICTLY by base depth (grid position) without offsetY!
                    id: hex.id,
                    props: {
                        x: rawX, y: rawY, // Pass raw coordinates!
                        q: hex.q, r: hex.r,
                        id: hex.id,
                        offsetY,
                        level: hex.currentLevel ?? 0,
                        maxLevel: hex.maxLevel,
                        structureType: hex.structureType as string,
                        neighborLevels,
                        isSelected: cachedSelectedHexId === hex.id,
                        isPending,
                        // hide specific state if not revealed
                        isOccupied: hex.revealed && (isOccupiedByPlayer || (cachedBots && cachedBots.some((b: any) => b.q===hex.q && b.r===hex.r))),
                        isGrowing: hex.revealed && hex.progress > 0 && !isVoid,
                        isRankLocked: hex.maxLevel > cachedPlayer.playerLevel,
                        progress: hex.revealed ? hex.progress : 0,
                        durability: hex.revealed ? hex.durability : undefined,
                        artifactType: hex.revealed ? hex.artifact?.type : undefined,
                        biome: hex.biome,
                        poiType: hex.poiType,
                        isPassable: hex.isPassable,
                        isRevealed: hex.revealed,
                        opacity: finalOpacity
                    }
                });
            }
        }
    }

    // 3. Collect Units
    const allEntities = [{ ...cachedPlayer, isPlayer: true }, ...(cachedBots || []).map((b: any) => ({ ...b, isPlayer: false }))];
    for (const u of allEntities) {
        if (!u.isPlayer) {
            const uHex = currentGrid[getHexKey(u.q, u.r)];
            if (!uHex || !uHex.revealed) continue;
        }

        const rawX = HEX_SIZE * (SQRT3 * u.q + SQRT3_2 * u.r);
        const rawY = HEX_SIZE * (ONE_POINT_FIVE * u.r);
        
        // Depth for sorting ONLY
        const baseDepth = (rawX * sin + rawY * cos) * 0.8;

        const uHex = currentGrid[getHexKey(u.q, u.r)];
        const hLevel = uHex ? (uHex.currentLevel ?? 0) : 0;
        
        const isMoving = u.state === 'MOVING';
        const depthBias = isMoving ? 50 : 1; 

        items.push({
            type: 'UNIT',
            depth: baseDepth + depthBias,
            id: u.id,
            props: {
                id: u.id,
                q: u.q, r: u.r,
                x: rawX, y: rawY, // Pass raw coordinates!
                isPlayer: u.isPlayer,
                color: u.avatarColor,
                hexLevel: hLevel,
                totalCoinsEarned: u.totalCoinsEarned,
                upgradePointCount: u.recentUpgrades?.length || 0,
                headIndex: u.headIndex,
                bodyIndex: u.bodyIndex
            }
        });
    }

    // 4. Sort by depth
    items.sort((a, b) => a.depth - b.depth);

    // 5. Check if sorted order changed
    const newOrderHash = items.map(i => i.id).join(',');
    if (newOrderHash !== (self as any).lastOrderHash || type !== 'UPDATE_VIEW') {
        (self as any).lastOrderHash = newOrderHash;
        self.postMessage({ neighborLevelsMap: cachedNeighborLevelsMap, renderItems: items });
    }
};
