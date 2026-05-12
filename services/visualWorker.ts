
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
let cachedIsCampaign: boolean = false;

const calculateNeighborLevels = (grid: any) => {
    const map: Record<string, number[]> = {};
    for (const key in grid) {
        const hex: any = grid[key];
        const neighbors = NEIGHBOR_DIRECTIONS.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }));
        const levels = neighbors.map(n => {
            const nKey = getHexKey(n.q, n.r);
            const nHex = grid[nKey];
            // If neighbor is missing OR not revealed, treat it as VOID to drop the wall and create actual volume at edges
            if (!nHex || (!nHex.revealed && !cachedIsCampaign)) return VOID_LEVEL_FLAG;
            return nHex.currentLevel ?? 0;
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
        selectedHexId, isCampaign
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
        cachedIsCampaign = !!isCampaign;
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

    // 1. Prepare occupancy map for efficiency
    const botPositions = new Set<string>();
    if (cachedBots) {
        for (const b of cachedBots) {
            botPositions.add(`${b.q},${b.r}`);
        }
    }

    const playerQ = cachedPlayer.q;
    const playerR = cachedPlayer.r;

    // 2. Collect Hexes from visible chunks
    if (cachedVisibleChunks && currentChunks) {
        for (const chunkKey of cachedVisibleChunks) {
            const hexes = currentChunks[chunkKey];
            if (!hexes) continue;

            for (const hex of hexes) {
                const hq = hex.q;
                const hr = hex.r;
                const distToPlayer = cubeDistance({ q: playerQ, r: playerR }, { q: hq, r: hr });
                const isRevealed = !!hex.revealed || cachedIsCampaign;

                // A. Discovery Visibility (Active Radius around player)
                let discoveryVisibility = 0;
                if (distToPlayer <= 1) discoveryVisibility = 1.0;
                else if (distToPlayer === 2) discoveryVisibility = 0.66;
                else if (distToPlayer === 3) discoveryVisibility = 0.33;
                else if (distToPlayer === 4) discoveryVisibility = 0.05;

                // B. Memory/Revealed Visibility (Fades 5 -> 12)
                let memoryVisibility = 0;
                if (isRevealed) {
                    if (distToPlayer <= 5) memoryVisibility = 1.0;
                    else if (distToPlayer <= 12) {
                        memoryVisibility = (12 - distToPlayer) * 0.1428; // (12 - dist) / 7
                    }
                }

                const finalVisibility = discoveryVisibility > memoryVisibility ? discoveryVisibility : memoryVisibility;
                
                // If not revealed, we strictly follow discovery. 
                // If revealed, we follow the combined max (which includes fading memory)
                const finalOpacity = isRevealed ? finalVisibility : discoveryVisibility;
                const finalLighting = finalVisibility;

                if (finalOpacity <= 0 && finalLighting <= 0) continue;

                const rawX = HEX_SIZE * (SQRT3 * hq + SQRT3_2 * hr);
                const rawY = HEX_SIZE * (ONE_POINT_FIVE * hr);
                const depth = (rawX * sin + rawY * cos) * 0.8;

                const hexId = hex.id;
                const isVoid = hex.structureType === 'VOID';
                const currentLevel = hex.currentLevel ?? 0;
                const offsetY = isVoid ? -10 : getHeightOffset(isVoid ? 0 : currentLevel);

                const isOccupiedByPlayer = hq === playerQ && hr === playerR;
                const neighborLevels = cachedNeighborLevelsMap[hexId] || [VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG, VOID_LEVEL_FLAG];

                items.push({
                    type: 'HEX',
                    depth: depth,
                    id: hexId,
                    props: {
                        x: rawX, y: rawY,
                        q: hq, r: hr,
                        id: hexId,
                        offsetY: isRevealed ? offsetY : -10,
                        level: isRevealed ? currentLevel : 0,
                        maxLevel: isRevealed ? hex.maxLevel : 0,
                        structureType: isRevealed ? (hex.structureType as string) : 'NONE',
                        neighborLevels: isRevealed ? neighborLevels : [0,0,0,0,0,0],
                        isSelected: cachedSelectedHexId === hexId,
                        isPending: hexId === cachedPendingKey,
                        isOccupied: isRevealed && (isOccupiedByPlayer || botPositions.has(`${hq},${hr}`)),
                        isGrowing: isRevealed && hex.progress > 0 && !isVoid,
                        isRankLocked: isRevealed && hex.maxLevel > cachedPlayer.playerLevel,
                        progress: isRevealed ? hex.progress : 0,
                        durability: isRevealed ? hex.durability : 0,
                        artifactType: isRevealed ? hex.artifact?.type : undefined,
                        biome: isRevealed ? hex.biome : undefined,
                        poiType: isRevealed ? hex.poiType : undefined,
                        isPassable: hex.isPassable,
                        isRevealed: isRevealed,
                        opacity: finalOpacity,
                        lighting: finalLighting
                    }
                });
            }
        }
    }

    // 3. Collect Units
    const allEntities = [{ ...cachedPlayer, isPlayer: true }, ...(cachedBots || []).map((b: any) => ({ ...b, isPlayer: false }))];
    const playerPos = { q: playerQ, r: playerR };

    for (const u of allEntities) {
        let uOpacity = 1.0;
        const uQ = u.q;
        const uR = u.r;

        if (!u.isPlayer) {
            const uHex = currentGrid[getHexKey(uQ, uR)];
            const distToPlayer = cubeDistance({ q: uQ, r: uR }, playerPos);
            const isRevealed = uHex && (uHex.revealed || cachedIsCampaign);
            
            // ACTIVE DISCOVERY
            let discoveryVis = 0;
            if (distToPlayer <= 1) discoveryVis = 1.0;
            else if (distToPlayer === 2) discoveryVis = 0.66;
            else if (distToPlayer === 3) discoveryVis = 0.33;
            else if (distToPlayer === 4) discoveryVis = 0.05;

            // MEMORY/REVEALED 
            let memoryVis = 0;
            if (isRevealed) {
                if (distToPlayer <= 5) memoryVis = 1.0;
                else if (distToPlayer <= 12) {
                    memoryVis = (12 - distToPlayer) * 0.1428;
                }
            }

            uOpacity = discoveryVis > memoryVis ? discoveryVis : memoryVis;
            if (uOpacity <= 0) continue;
        }

        const rawX = HEX_SIZE * (SQRT3 * uQ + SQRT3_2 * uR);
        const rawY = HEX_SIZE * (ONE_POINT_FIVE * uR);
        const baseDepth = (rawX * sin + rawY * cos) * 0.8;

        const uHex = currentGrid[getHexKey(uQ, uR)];
        const hLevel = uHex ? (uHex.currentLevel ?? 0) : 0;
        const depthBias = u.state === 'MOVING' ? 50 : 1; 

        items.push({
            type: 'UNIT',
            depth: baseDepth + depthBias,
            id: u.id,
            props: {
                id: u.id,
                q: uQ, r: uR,
                x: rawX, y: rawY,
                isPlayer: u.isPlayer,
                color: u.avatarColor,
                hexLevel: hLevel,
                totalCoinsEarned: u.totalCoinsEarned,
                upgradePointCount: u.recentUpgrades?.length || 0,
                headIndex: u.headIndex,
                bodyIndex: u.bodyIndex,
                opacity: uOpacity
            }
        });
    }

    // 4. Sort by depth
    items.sort((a, b) => a.depth - b.depth);

    // 5. Check if sorted order or lighting-relevant state changed
    const playerPosKey = `${cachedPlayer.q},${cachedPlayer.r}`;
    const shouldUpdate = 
        items.length !== (self as any).lastLen ||
        playerPosKey !== (self as any).lastPlayerPosKey ||
        type === 'SET_GRID';

    if (shouldUpdate) {
        (self as any).lastLen = items.length;
        (self as any).lastPlayerPosKey = playerPosKey;
        self.postMessage({ renderItems: items });
    }
}
