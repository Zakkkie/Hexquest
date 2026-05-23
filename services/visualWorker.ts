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

let cachedPlayer: any = null;
let cachedRotation: number = 0;
let cachedBots: any = null;
let cachedPendingKey: string | null = null;
let cachedSelectedHexId: string | null = null;
let cachedIsCampaign: boolean = false;
let cachedCamera: any = null;
let cachedDimensions: any = null;

self.onmessage = (e) => {
    const { 
        grid, rotation, player, bots, 
        pendingKey, selectedHexId, isCampaign,
        camera, dimensions
    } = e.data;

    const gridChanged = (grid && grid !== cachedGrid) || (isCampaign !== undefined && !!isCampaign !== cachedIsCampaign);
    
    if (rotation !== undefined) cachedRotation = rotation;
    if (player !== undefined) cachedPlayer = player;
    if (bots !== undefined) cachedBots = bots;
    if (pendingKey !== undefined) cachedPendingKey = pendingKey;
    if (selectedHexId !== undefined) cachedSelectedHexId = selectedHexId;
    if (isCampaign !== undefined) cachedIsCampaign = !!isCampaign;
    if (camera !== undefined) cachedCamera = camera;
    if (dimensions !== undefined) cachedDimensions = dimensions;

    if (grid) {
        cachedGrid = grid;
    }

    if (!cachedGrid || !cachedPlayer) return;

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

    // 2. Iterate flat over the grid and perform rapid distance checking (O(1) metric with distance culling)
    for (const hexId in cachedGrid) {
        const hex = cachedGrid[hexId];
        const hq = hex.q;
        const hr = hex.r;
        const distToPlayer = cubeDistance({ q: playerQ, r: playerR }, { q: hq, r: hr });
        
        // Culling: Any hex further than 12 tiles from the player cannot have active opacity or lighting, skip it immediately.
        if (distToPlayer > 12) continue;

        const isRevealed = !!hex.revealed || cachedIsCampaign;

        // A. Active Discovery
        let discoveryVisibility = 0;
        if (distToPlayer <= 1) discoveryVisibility = 1.0;
        else if (distToPlayer === 2) discoveryVisibility = 0.66;
        else if (distToPlayer === 3) discoveryVisibility = 0.33;

        // B. Memory/Revealed Visibility
        let memoryVisibility = 0;
        if (isRevealed) {
            if (distToPlayer <= 7) {
                memoryVisibility = 1.0;
            } else if (distToPlayer <= 12) {
                memoryVisibility = (12 - distToPlayer) * 0.2;
            }
        }

        const finalVisibility = discoveryVisibility > memoryVisibility ? discoveryVisibility : memoryVisibility;
        
        const finalOpacity = finalVisibility;
        const finalLighting = finalVisibility;

        if (finalOpacity <= 0 && finalLighting <= 0) continue;

        const rawX = HEX_SIZE * (SQRT3 * hq + SQRT3_2 * hr);
        const rawY = HEX_SIZE * (ONE_POINT_FIVE * hr);
        
        // --- View Frustum Culling ---
        if (cachedCamera && cachedDimensions) {
            // Calculate screen position according to MapRenderer simpleHexToPixel logic
            const x = rawX * cos - rawY * sin;
            const y = (rawX * sin + rawY * cos) * 0.8;
            
            const screenX = cachedCamera.x + x * cachedCamera.scale;
            const screenY = cachedCamera.y + y * cachedCamera.scale;
            
            // Adjust margin based on whether it is a very tall structure, we use 4.0 as a safe upper bound
            const margin = HEX_SIZE * 4.0;
            const scaledMargin = margin * cachedCamera.scale;
            
            if (
                screenX < -scaledMargin ||
                screenX > cachedDimensions.width + scaledMargin ||
                screenY < -scaledMargin ||
                screenY > cachedDimensions.height + scaledMargin
            ) {
                // Skip rendering hexes entirely outside the viewport frustum
                continue;
            }
        }
        // ----------------------------

        // Deterministic distance from camera, including height for subtle sorting stability
        // Using 0.8 vertical squash factor to match pixel-space depth
        const baseDepth = (rawX * sin + rawY * cos) * 0.8;
        const depth = baseDepth + (hex.currentLevel || 0) * 0.01;

        const isVoid = hex.structureType === 'VOID';
        const currentLevel = hex.currentLevel ?? 0;
        const offsetY = isVoid ? -10 : getHeightOffset(isVoid ? 0 : currentLevel);

        const isOccupiedByPlayer = hq === playerQ && hr === playerR;
        const neighborLevels = NEIGHBOR_DIRECTIONS.map(d => {
            const nKey = getHexKey(hq + d.q, hr + d.r);
            const nHex = cachedGrid[nKey];
            if (!nHex || (!nHex.revealed && !cachedIsCampaign)) return VOID_LEVEL_FLAG;
            return nHex.currentLevel ?? 0;
        });

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
                isRankLocked: isRevealed && currentLevel > cachedPlayer.playerLevel,
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

    // 3. Collect Units
    const allEntities = [{ ...cachedPlayer, isPlayer: true }, ...(cachedBots || []).map((b: any) => ({ ...b, isPlayer: false }))];
    const playerPos = { q: playerQ, r: playerR };

    for (const u of allEntities) {
        let uOpacity = 1.0;
        const uQ = u.q;
        const uR = u.r;

        if (!u.isPlayer) {
            const uHex = cachedGrid[getHexKey(uQ, uR)];
            const distToPlayer = cubeDistance({ q: uQ, r: uR }, playerPos);
            const isRevealed = uHex && (uHex.revealed || cachedIsCampaign);
            
            // ACTIVE DISCOVERY
            let discoveryVis = 0;
            if (distToPlayer <= 1) discoveryVis = 1.0;
            else if (distToPlayer === 2) discoveryVis = 0.66;
            else if (distToPlayer === 3) discoveryVis = 0.33;

            // MEMORY/REVEALED 
            let memoryVis = 0;
            if (isRevealed) {
                if (distToPlayer <= 7) {
                    memoryVis = 1.0;
                } else if (distToPlayer <= 12) {
                    memoryVis = (12 - distToPlayer) * 0.2;
                }
            }

            uOpacity = discoveryVis > memoryVis ? discoveryVis : memoryVis;
            if (uOpacity <= 0) continue;
        }

        const rawX = HEX_SIZE * (SQRT3 * uQ + SQRT3_2 * uR);
        const rawY = HEX_SIZE * (ONE_POINT_FIVE * uR);
        
        // --- View Frustum Culling ---
        if (cachedCamera && cachedDimensions) {
            const x = rawX * cos - rawY * sin;
            const y = (rawX * sin + rawY * cos) * 0.8;
            const screenX = cachedCamera.x + x * cachedCamera.scale;
            const screenY = cachedCamera.y + y * cachedCamera.scale;
            const margin = HEX_SIZE * 4.0;
            const scaledMargin = margin * cachedCamera.scale;
            if (
                screenX < -scaledMargin ||
                screenX > cachedDimensions.width + scaledMargin ||
                screenY < -scaledMargin ||
                screenY > cachedDimensions.height + scaledMargin
            ) {
                continue;
            }
        }
        // ----------------------------

        const baseDepth = (rawX * sin + rawY * cos) * 0.8;

        const uHex = cachedGrid[getHexKey(uQ, uR)];
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

    // 4. Sort by depth with ID tie-breaker for perfect stability
    items.sort((a, b) => (a.depth - b.depth) || (a.id.localeCompare(b.id)));

    // 5. Build a signature of sorted IDs and rendering-critical properties to prevent stale visual updates on selection/pending states
    let sigParts = [];
    for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.type === 'HEX') {
            sigParts.push(
                `${it.id}:${it.depth.toFixed(1)}:${it.props.level}:${it.props.isSelected ? 1 : 0}:${it.props.isPending ? 1 : 0}:` +
                `${it.props.isOccupied ? 1 : 0}:${it.props.durability}:${it.props.isRevealed ? 1 : 0}:${it.props.opacity.toFixed(2)}`
            );
        } else {
            sigParts.push(`${it.id}:${it.depth.toFixed(1)}:${it.props.opacity.toFixed(2)}:UNIT`);
        }
    }
    const signature = sigParts.join('|');
    const shouldUpdate = 
        signature !== (self as any).lastSignature ||
        gridChanged;

    if (shouldUpdate) {
        (self as any).lastSignature = signature;
        self.postMessage({ renderItems: items });
    }
};
