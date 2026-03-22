
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

const calculateNeighborLevels = (grid: any) => {
    const map: Record<string, number[]> = {};
    for (const key in grid) {
        const hex: any = grid[key];
        const neighbors = NEIGHBOR_DIRECTIONS.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
        const levels = neighbors.map(n => {
            const nKey = getHexKey(n.q, n.r);
            const nHex = grid[nKey];
            return nHex ? nHex.maxLevel : VOID_LEVEL_FLAG;
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
        // Don't post back yet, wait for view update or just send neighbor map
        self.postMessage({ neighborLevelsMap: cachedNeighborLevelsMap });
        return;
    }

    // Default or 'UPDATE_VIEW'
    const currentGrid = grid || cachedGrid;
    const currentChunks = chunks || cachedChunks;
    
    if (!currentGrid || !player) return;

    const items: any[] = [];

    const angleRad = rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const SQRT3 = Math.sqrt(3);
    const SQRT3_2 = SQRT3 / 2;
    const ONE_POINT_FIVE = 1.5;

    // 2. Collect Hexes from visible chunks
    if (visibleChunks && currentChunks) {
        for (const chunkKey of visibleChunks) {
            const hexes = currentChunks[chunkKey];
            if (!hexes) continue;

            for (const hex of hexes) {
                const distToPlayer = cubeDistance({ q: player.q, r: player.r }, { q: hex.q, r: hex.r });
                if (distToPlayer > 20) continue;

                const rawX = HEX_SIZE * (SQRT3 * hex.q + SQRT3_2 * hex.r);
                const rawY = HEX_SIZE * (ONE_POINT_FIVE * hex.r);
                const px = rawX * cos - rawY * sin;
                const py = (rawX * sin + rawY * cos) * 0.8;

                let opacity = 1.0;
                if (distToPlayer > 16) {
                    opacity = Math.max(0, 1.0 - (distToPlayer - 16) / 4);
                }
                if (opacity <= 0) continue;

                const isVoid = (hex.structureType as string) === 'VOID';
                const offsetY = isVoid ? -10 : getHeightOffset(isVoid ? 0 : hex.maxLevel);

                const isPending = hex.id === pendingKey;
                const isOccupiedByPlayer = hex.q === player.q && hex.r === player.r;
                
                const neighborLevels = cachedNeighborLevelsMap[hex.id] || [VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG];

                items.push({
                    type: 'HEX',
                    depth: py,
                    id: hex.id,
                    props: {
                        x: px, y: py,
                        q: hex.q, r: hex.r,
                        id: hex.id,
                        offsetY,
                        level: hex.currentLevel ?? 0,
                        maxLevel: hex.maxLevel,
                        structureType: hex.structureType as string,
                        neighborLevels,
                        isSelected: selectedHexId === hex.id,
                        isPending,
                        isOccupied: isOccupiedByPlayer || (bots && bots.some((b: any) => b.q===hex.q && b.r===hex.r)),
                        isGrowing: hex.progress > 0 && !isVoid,
                        isRankLocked: hex.maxLevel > player.playerLevel,
                        progress: hex.progress,
                        durability: hex.durability,
                        artifactType: hex.artifact?.type,
                        biome: hex.biome,
                        poiType: hex.poiType,
                        isPassable: hex.isPassable,
                        opacity
                    }
                });
            }
        }
    }

    // 3. Collect Units
    const allEntities = [{ ...player, isPlayer: true }, ...(bots || []).map((b: any) => ({ ...b, isPlayer: false }))];
    for (const u of allEntities) {
        const rawX = HEX_SIZE * (SQRT3 * u.q + SQRT3_2 * u.r);
        const rawY = HEX_SIZE * (ONE_POINT_FIVE * u.r);
        const upx = rawX * cos - rawY * sin;
        const upy = (rawX * sin + rawY * cos) * 0.8;

        const uHex = currentGrid[getHexKey(u.q, u.r)];
        const hLevel = uHex ? uHex.maxLevel : 0;
        const isMoving = u.state === 'MOVING';
        const depthBias = isMoving ? 50 : 1; 

        items.push({
            type: 'UNIT',
            depth: upy + depthBias,
            id: u.id,
            props: {
                id: u.id,
                q: u.q, r: u.r,
                x: upx, y: upy,
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

    self.postMessage({ neighborLevelsMap: cachedNeighborLevelsMap, renderItems: items });
};
