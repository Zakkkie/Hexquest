import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '../store.ts';
import { useEphemeralStore } from '../store/ephemeralStore.ts';
import { HEX_SIZE, getLevelConfig } from '../rules/config.ts';
import { textureService } from '../services/textureService.ts';
import { resourceService } from '../services/resourceService.ts';
import { EntityState, Hex, Entity } from '../types.ts';
import { getNeighbors, getStatusModifiers, getHexKey } from '../services/hexUtils.ts';
import { safifyCoord } from '../utils/safeCoordinates.ts';
import {
    BASE_POINTS,
    THEME_PALETTE,
    getTheme,
    getHeightOffset,
    getPixiTexture,
} from '../services/pixiHexRender.ts';

// Re-export so existing consumers (StoryBuilderView, StoryBuilderComponents) keep working.
export { THEME_PALETTE };

const MAX_WALL_DEPTH = 200;
// Skirt depth for elevated hexes that border VOID. Far smaller than MAX_WALL_DEPTH
// so floating tiles read as a solid plateau with a short 3D skirt instead of a
// 200px thread dangling into the dark background.
const VOID_SKIRT_DEPTH = 28;

const NEIGHBOR_DIRECTIONS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 }, 
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
];

const VOID_LEVEL_FLAG = -99;

const cubeDistance = (a: { q: number; r: number }, b: { q: number; r: number }): number => {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
};

const isObjectiveHexCompleted = (
    objHex: any,
    grid: Record<string, Hex> | undefined,
    player: Entity | undefined,
    activeLevelId: string | undefined,
    activatedMiniMonuments: string[] | undefined,
    portalActive: boolean | undefined
): boolean => {
    if (!grid || !player) return false;
    const hexKey = `${objHex.q},${objHex.r}`;
    const gridCell = grid[hexKey];

    // If it's a MINI_MONUMENT (Obelisk), check if it's already activated in state
    if (gridCell?.structureType === 'MINI_MONUMENT' || objHex.label?.toLowerCase().includes('obelisk')) {
        return !!(activatedMiniMonuments && activatedMiniMonuments.includes(hexKey));
    }

    // If it's a MONUMENT, check if the portal is already active
    if (gridCell?.structureType === 'MONUMENT' || objHex.label?.toLowerCase().includes('monument')) {
        return !!portalActive;
    }

    // New 8-Level Series 1 Custom Completion Checks:
    if (activeLevelId === '1.0') {
        const waveCoords = [
            "0,0", "1,0", "2,0", "3,0", "4,0", "5,0",
            "6,0", "6,1", "5,2", "4,3", "3,3", "2,3", "1,3", "0,3", "-1,3", "-2,3"
        ];
        const playerIdx = waveCoords.indexOf(`${player.q},${player.r}`);
        const hexIdx = waveCoords.indexOf(hexKey);
        
        let completedByPath = false;
        if (playerIdx !== -1 && hexIdx !== -1) {
            completedByPath = playerIdx >= hexIdx;
        }
        
        if (playerIdx === hexIdx) {
            if (gridCell) {
                if (objHex.label === 'Build') {
                    if (gridCell.currentLevel < objHex.targetLevel) return false;
                }
                if (objHex.label === 'Dig') {
                    if (gridCell.currentLevel > objHex.targetLevel) return false;
                }
            }
            return true;
        }
        return completedByPath;
    }

    if (activeLevelId === '1.1') {
        if (objHex.label === 'Capital' || objHex.color === 'emerald') {
            return player.q === objHex.q && player.r === objHex.r;
        }
        if (gridCell && objHex.targetLevel) {
            return gridCell.currentLevel >= objHex.targetLevel;
        }
    }

    if (activeLevelId === '1.2') {
        if (objHex.label === 'Goal') {
            return gridCell ? gridCell.currentLevel <= 0 : false;
        }
    }

    if (activeLevelId === '1.3') {
        if (objHex.label === 'Goal L3') {
            return gridCell ? gridCell.currentLevel >= 3 : false;
        }
    }

    if (activeLevelId === '1.5') {
        if (objHex.label === 'Heal') {
            return gridCell ? gridCell.structureType !== 'VOID' : false;
        }
        if (objHex.label === 'Deep Mine') {
            return gridCell ? gridCell.currentLevel <= -2 : false;
        }
    }

    if (activeLevelId === '1.6') {
        if (objHex.label === 'Capital') {
            return player.q === objHex.q && player.r === objHex.r;
        }
    }

    // Default construction or excavation behavior
    if (gridCell) {
        if (objHex.targetLevel > 0) {
            return gridCell.currentLevel >= objHex.targetLevel;
        } else if (objHex.targetLevel < 0) {
            return gridCell.currentLevel <= objHex.targetLevel;
        } else {
            // targetLevel === 0
            if (objHex.label === 'Goal' || objHex.label === 'Capital' || objHex.color === 'emerald') {
                return player.q === objHex.q && player.r === objHex.r;
            }
            return gridCell.currentLevel === 0;
        }
    }

    return false;
};

const isFinishTile = (q: number, r: number, activeLevelConfig: any): boolean => {
    if (!activeLevelConfig) return false;
    if (activeLevelConfig.id === '1.0' && q === -2 && r === 3) return true;
    if (activeLevelConfig.id === '1.1' && q === -8 && r === 0) return true;
    if (activeLevelConfig.id === '1.2' && q === 0 && r === 0) return true;
    if (activeLevelConfig.id === '1.3' && q === 0 && r === 0) return true;
    if (activeLevelConfig.id === '1.5' && q === 0 && r === 0) return true;
    if (activeLevelConfig.id === '1.6' && q === 8 && r === 0) return true;
    return false;
};

const runLocalRenderCalculation = (
    grid: Record<string, Hex> | undefined,
    player: Entity | undefined,
    bots: Entity[] | undefined,
    rotation: number,
    pendingKey: string | null,
    selectedHexId: string | null,
    camera: { x: number; y: number; scale: number; rotation: number } | undefined,
    dimensions: { width: number; height: number } | undefined,
    isCampaign: boolean,
    playerGrowthIntent?: 'RECOVER' | 'UPGRADE' | 'DIG' | 'TURRET' | null,
    isDefenseMode?: boolean
): any[] => {
    if (!grid || !player) return [];

    const items: any[] = [];

    const angleRad = rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const SQRT3 = Math.sqrt(3);
    const SQRT3_2 = SQRT3 / 2;
    const ONE_POINT_FIVE = 1.5;

    const botPositions = new Set<string>();
    if (bots) {
        for (const b of bots) {
            botPositions.add(`${b.q},${b.r}`);
        }
    }

    const playerQ = player.q;
    const playerR = player.r;

    for (const hexId in grid) {
        const hex = grid[hexId];
        const hq = hex.q;
        const hr = hex.r;
        const distToPlayer = cubeDistance({ q: playerQ, r: playerR }, { q: hq, r: hr });
        
        const forceReveal = (isCampaign && useGameStore.getState().session?.activeLevelConfig?.mapConfig?.revealMode !== 'fog');
        
        let isRevealed = !!hex.revealed || forceReveal;
        let finalVisibility = 0;

        if (isDefenseMode) {
            // Find player owned hexes to calculate nearest base distance
            const playerOwnedHexes = Object.values(grid).filter((h: any) => h.ownerId === 'player-1' || h.structureType === 'CORE' || h.isCore);
            let distToPlayerBase = distToPlayer;
            let minDist = 9999;
            for (const ph of playerOwnedHexes) {
                const d = cubeDistance({ q: ph.q, r: ph.r }, { q: hq, r: hr });
                if (d < minDist) {
                    minDist = d;
                }
            }
            if (minDist !== 9999) {
                distToPlayerBase = minDist;
            }

            if (distToPlayerBase <= 4) {
                isRevealed = true;
                if (distToPlayerBase <= 1) {
                    finalVisibility = 1.0;
                } else if (distToPlayerBase === 2) {
                    finalVisibility = 0.70;
                } else if (distToPlayerBase === 3) {
                    finalVisibility = 0.40;
                } else if (distToPlayerBase === 4) {
                    finalVisibility = 0.15;
                }
            } else {
                isRevealed = false;
                finalVisibility = 0.0;
            }
        } else {
            if (distToPlayer > 5 && !forceReveal) continue;
            
            if (forceReveal) {
                finalVisibility = 1.0;
            } else if (distToPlayer <= 2) {
                finalVisibility = 1.0;
            } else if (distToPlayer === 3) {
                finalVisibility = 0.70;
            } else if (distToPlayer === 4) {
                finalVisibility = 0.40;
            } else if (distToPlayer === 5) {
                finalVisibility = 0.15;
            }
        }

        const finalOpacity = finalVisibility;
        const finalLighting = finalVisibility;

        if (finalOpacity <= 0) continue;

        const rawX = HEX_SIZE * (SQRT3 * hq + SQRT3_2 * hr);
        const rawY = HEX_SIZE * (ONE_POINT_FIVE * hr);
        
        if (camera && dimensions) {
            const x = rawX * cos - rawY * sin;
            const y = (rawX * sin + rawY * cos) * 0.8;
            
            const screenX = camera.x + x * camera.scale;
            const screenY = camera.y + y * camera.scale;
            
            const margin = HEX_SIZE * 4.0;
            const scaledMargin = margin * camera.scale;
            
            if (
                screenX < -scaledMargin ||
                screenX > dimensions.width + scaledMargin ||
                screenY < -scaledMargin ||
                screenY > dimensions.height + scaledMargin
            ) {
                continue;
            }
        }

        const baseDepth = (rawX * sin + rawY * cos) * 0.8;
        const depth = baseDepth + (hex.currentLevel || 0) * 0.01;

        const isVoid = hex.structureType === 'VOID';
        const currentLevel = hex.currentLevel ?? 0;
        const offsetY = isVoid ? -10 : getHeightOffset(isVoid ? 0 : currentLevel);

        const isOccupiedByPlayer = hq === playerQ && hr === playerR;
        const neighborLevels = NEIGHBOR_DIRECTIONS.map(d => {
            const nKey = getHexKey(hq + d.q, hr + d.r);
            const nHex = grid[nKey];
            const forceReveal = (isCampaign && useGameStore.getState().session?.activeLevelConfig?.mapConfig?.revealMode !== 'fog') || !!useGameStore.getState().session?.defense?.isDefenseMode;
            if (!nHex || (!nHex.revealed && !forceReveal)) return VOID_LEVEL_FLAG;
            if (nHex.structureType === 'VOID') return VOID_LEVEL_FLAG;
            return nHex.currentLevel ?? 0;
        });

        let calculatedProgress = 0;
        if (isRevealed && hex.progress > 0 && !isVoid) {
            let needed = 30; // fallback
            const actingEntity = (player && player.q === hq && player.r === hr)
                ? player
                : bots?.find((b: any) => b.q === hq && b.r === hr);

            if (actingEntity) {
                let intent: 'UPGRADE' | 'RECOVER' | 'DIG' | 'TURRET' | null = null;
                if (actingEntity.type === 'PLAYER') {
                    intent = playerGrowthIntent || null;
                } else {
                    const nextInQueue = actingEntity.movementQueue?.[0];
                    if (nextInQueue && nextInQueue.intent) {
                        intent = nextInQueue.intent;
                    } else if (actingEntity.memory?.plan?.steps?.[0]?.type) {
                        const stepType = actingEntity.memory.plan.steps[0].type;
                        if (stepType === 'UPGRADE') intent = 'UPGRADE';
                        else if (stepType === 'DIG') intent = 'DIG';
                        else if (stepType === 'RECOVER') intent = 'RECOVER';
                    }
                }

                if (intent) {
                    const activeStatuses = actingEntity.activeStatuses || [];
                    const hasScannerBuff = activeStatuses.some((s: any) => s.type === 'STATUS_SCANNER_BUFF');
                    const hasGodMode = activeStatuses.some((s: any) => s.type === 'GOD_MODE');
                    const growthAccelerator = hasGodMode ? 10 : (hasScannerBuff ? 2 : 0);

                    if (intent === 'RECOVER') {
                        const config = getLevelConfig(hex.maxLevel);
                        needed = config.growthTime;
                    } else if (intent === 'DIG') {
                        needed = Math.max(10, 30 - (growthAccelerator * 5));
                    } else if (intent === 'UPGRADE') {
                        const config = getLevelConfig(hex.currentLevel + 1);
                        needed = Math.max(10, config.growthTime - (growthAccelerator * 5));
                    } else if (intent === 'TURRET') {
                        needed = 40;
                    }
                }
            }
            calculatedProgress = Math.min(1.0, hex.progress / needed);
        }

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
                isSelected: selectedHexId === hexId,
                isPending: hexId === pendingKey,
                isOccupied: isRevealed && (isOccupiedByPlayer || botPositions.has(`${hq},${hr}`)),
                isGrowing: isRevealed && hex.progress > 0 && !isVoid,
                isRankLocked: isRevealed && currentLevel > player.playerLevel,
                progress: calculatedProgress,
                durability: isRevealed ? hex.durability : 0,
                artifactType: isRevealed ? hex.artifact?.type : undefined,
                biome: isRevealed ? hex.biome : undefined,
                poiType: isRevealed ? hex.poiType : undefined,
                hologramTargetLevel: isRevealed ? hex.hologramTargetLevel : undefined,
                isPassable: hex.isPassable,
                isRevealed: isRevealed,
                opacity: finalOpacity,
                lighting: finalLighting
            }
        });
    }

    const allEntities = [{ ...player, isPlayer: true }, ...(bots || []).map((b: any) => ({ ...b, isPlayer: false }))];
    const playerPos = { q: playerQ, r: playerR };

    for (const u of allEntities) {
        let uOpacity = 1.0;
        const uQ = u.q;
        const uR = u.r;

        if (!u.isPlayer) {
            if (isDefenseMode) {
                // Find player owned hexes to calculate nearest base distance
                const playerOwnedHexes = Object.values(grid).filter((h: any) => h.ownerId === 'player-1' || h.structureType === 'CORE' || h.isCore);
                let minDist = 9999;
                for (const ph of playerOwnedHexes) {
                    const d = cubeDistance({ q: ph.q, r: ph.r }, { q: uQ, r: uR });
                    if (d < minDist) {
                        minDist = d;
                    }
                }
                if (minDist > 4) {
                    continue; // Skip rendering/drawing the bot if it's beyond the visibility range!
                }
                // Apply fading opacity matching the tile's visibility
                if (minDist <= 1) {
                    uOpacity = 1.0;
                } else if (minDist === 2) {
                    uOpacity = 0.70;
                } else if (minDist === 3) {
                    uOpacity = 0.40;
                } else if (minDist === 4) {
                    uOpacity = 0.15;
                }
            } else {
                const uHex = grid[getHexKey(uQ, uR)];
                const isRevealed = uHex ? uHex.revealed : false;
                if (!isRevealed) continue;

                const distToPlayer = cubeDistance({ q: uQ, r: uR }, playerPos);
                if (distToPlayer <= 2) {
                    uOpacity = 1.0;
                } else if (distToPlayer === 3) {
                    uOpacity = 0.85;
                } else if (distToPlayer === 4) {
                    uOpacity = 0.65;
                } else if (distToPlayer === 5) {
                    uOpacity = 0.45;
                } else {
                    uOpacity = 0.30;
                }
            }
        }

        const rawX = HEX_SIZE * (SQRT3 * uQ + SQRT3_2 * uR);
        const rawY = HEX_SIZE * (ONE_POINT_FIVE * uR);
        
        if (camera && dimensions) {
            const x = rawX * cos - rawY * sin;
            const y = (rawX * sin + rawY * cos) * 0.8;
            const screenX = camera.x + x * camera.scale;
            const screenY = camera.y + y * camera.scale;
            const margin = HEX_SIZE * 4.0;
            const scaledMargin = margin * camera.scale;
            if (
                screenX < -scaledMargin ||
                screenX > dimensions.width + scaledMargin ||
                screenY < -scaledMargin ||
                screenY > dimensions.height + scaledMargin
            ) {
                continue;
            }
        }

        const baseDepth = (rawX * sin + rawY * cos) * 0.8;
        const uHex = grid[getHexKey(uQ, uR)];
        const hLevel = uHex ? (uHex.currentLevel ?? 0) : 0;
        const depthBias = 1; 

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
                opacity: uOpacity,
                type: u.type
            }
        });
    }

    items.sort((a, b) => {
        const depthDiff = a.depth - b.depth;
        if (depthDiff !== 0) return depthDiff;
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
    });

    return items;
};

// BASE_POINTS, THEME_PALETTE, and getTheme now come from services/pixiHexRender.ts.
// getHexVisualHeight is an alias for the shared getHeightOffset (identical implementation).
const getHexVisualHeight = getHeightOffset;

const getPoiIcon = (type: string): string => {
  switch (type) {
    case "city_hub": return "🏛️";
    case "tavern_travelers": return "🍺";
    case "bulletin_board": return "📋";
    case "guard_post": return "🛡️";
    case "forge": return "⚒️";
    case "alchemist": return "🧪";
    case "watchtower": return "🔭";
    case "market": return "⚖️";
    case "warehouse": return "📦";
    case "healer": return "🩹";
    case "temple": return "⛪";
    case "archive": return "📜";
    case "tavern_spirit": return "🍷";
    case "RIFT_S1_2": return "🌀";
    case "RIFT_S3_4": return "🌋";
    default: return "📍";
  }
};

interface MapRendererProps {
    rotation: number;
    onHexClick: (q: number, r: number) => void;
    onHover: (id: string | null) => void;
    camera?: { x: number; y: number; scale: number; rotation: number };
    dimensions?: { width: number; height: number };
}

// getPixiTexture (DOM -> WebGL texture cache) now comes from services/pixiHexRender.ts.

export const MapRenderer: React.FC<MapRendererProps> = ({ rotation, onHexClick, onHover, camera, dimensions }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pixiAppRef = useRef<PIXI.Application | null>(null);
    const worldContainerRef = useRef<PIXI.Container | null>(null);
    const renderItemsContainerRef = useRef<PIXI.Container | null>(null);
    const connectionsGraphicsRef = useRef<PIXI.Graphics | null>(null);
    const effectsContainerRef = useRef<PIXI.Container | null>(null);
    const particlesContainerRef = useRef<PIXI.Container | null>(null);

    const grid = useGameStore(state => state.session?.grid);
    const sessionGrid = useGameStore(state => state.session?.grid);
    const sessionDefenseMode = useGameStore(state => !!state.session?.defense?.isDefenseMode);
    const sessionLanguage = useGameStore(state => state.session?.language);
    const player = useGameStore(state => state.session?.player);
    const bots = useGameStore(state => state.session?.bots);
    const effects = useGameStore(state => state.session?.effects);
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const pendingConfirmation = useGameStore(state => state.pendingConfirmation);
    const isPlayerGrowing = useGameStore(state => state.session?.isPlayerGrowing);
    const playerGrowthIntent = useGameStore(state => state.session?.playerGrowthIntent);
    const campaignUpgrades = useGameStore(state => state.campaignUpgrades);
    const activatedMiniMonuments = useGameStore(state => state.session?.activatedMiniMonuments);
    const portalActive = useGameStore(state => state.session?.portalActive);
    const gameStatus = useGameStore(state => state.session?.gameStatus);
    const evacuationActive = useGameStore(state => state.session?.evacuationActive);
    const messageLog = useGameStore(state => state.session?.messageLog);
    const sessionId = useGameStore(state => state.session?.sessionId);
    const activeMeteors = useGameStore(state => state.session?.activeMeteors);
    const isDefenseMode = useGameStore(state => !!state.session?.defense?.isDefenseMode);

    const recentGradientLock = useMemo(() => {
        if (!messageLog || messageLog.length === 0 || !player) return null;
        const latest = messageLog[0];
        const isRecent = Date.now() - latest.timestamp < 1500;
        const isGradientLock = latest.text.includes("Нельзя копать") || latest.text.includes("below neighbors") || latest.text.includes("GRADIENT") || latest.text.includes("KOПАТЬ");
        return (isRecent && isGradientLock) ? player : null;
    }, [messageLog, player]);

    const playerQ = player?.q ?? 0;
    const playerR = player?.r ?? 0;
    const selectedHexId = useMemo(() => 
        (playerQ !== undefined && playerR !== undefined) ? getHexKey(playerQ, playerR) : null
    , [playerQ, playerR]);

    // Tracking variables for DisplayObject Pools
    const hexPropsCache = useRef<WeakMap<PIXI.Container, any>>(new WeakMap());
    const hexCache = useRef<Map<string, PIXI.Container>>(new Map());
    const hoverRef = useRef<string | null>(null);
    const unitCache = useRef<Map<string, PIXI.Container>>(new Map());
    const unitAnimStates = useRef<Map<string, {
        startQ: number;
        startR: number;
        startTime: number;
        isMoving: boolean;
        startLevel: number;
        targetQ: number;
        targetR: number;
        targetLevel: number;
        facingLeft: boolean;
        currentQ: number;
        currentR: number;
        currentLevel: number;
        stepDuration: number;
        moveMode: 'SINGLE' | 'FIRST' | 'MIDDLE' | 'LAST';
    }>>(new Map());

    const effectCache = useRef<Map<string, {
        container: PIXI.Container;
        text: PIXI.Text;
        startTime: number;
        lifetime: number;
        q: number;
        r: number;
        stackIndex: number;
        laserGraphics?: PIXI.Graphics;
    }>>(new Map());

    const particlesList = useRef<{
        graphics: PIXI.Graphics;
        startTime: number;
        duration: number;
        puffs: { x: number; y: number; vx: number; vy: number; radius: number; opacity: number }[];
    }[]>([]);

    const activeActionParticles = useRef<{
        graphics: PIXI.Graphics;
        vx: number;
        vy: number;
        life: number;
        decay: number;
    }[]>([]);

    const lastSessionIdRef = useRef<string | null>(null);
    const sessionStartTimeRef = useRef<number>(0);
    const victoryStartTimeRef = useRef<number | null>(null);

    const [isPixiReady, setIsPixiReady] = useState(false);

    // Coordinate conversion mathematics
    const simpleHexToPixel = useCallback((q: number, r: number) => {
        const rawX = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
        const rawY = HEX_SIZE * (1.5 * r);
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        
        const x = rawX * cos - rawY * sin;
        const y = (rawX * sin + rawY * cos) * 0.8;
        return safifyCoord(x, y);
    }, [rotation]);

    const pendingTarget = pendingConfirmation?.data.path[pendingConfirmation.data.path.length - 1];
    const pendingKey = pendingTarget ? getHexKey(pendingTarget.q, pendingTarget.r) : null;
    const isCampaign = !!activeLevelConfig;

    const activeRenderItems = useMemo(() => {
        return runLocalRenderCalculation(
            grid,
            player,
            bots,
            rotation,
            pendingKey,
            selectedHexId,
            camera,
            dimensions,
            isCampaign,
            playerGrowthIntent,
            isDefenseMode
        );
    }, [grid, player, bots, rotation, pendingKey, selectedHexId, camera, dimensions, isCampaign, playerGrowthIntent, isDefenseMode]);

    // Initialize Pixi Application
    useEffect(() => {
        if (!containerRef.current) return;

        const app = new PIXI.Application();
        pixiAppRef.current = app;

        const initPixi = async () => {
            try {
                await app.init({
                    width: dimensions?.width || window.innerWidth,
                    height: dimensions?.height || window.innerHeight,
                    backgroundAlpha: 0,
                    antialias: true,
                    resolution: window.devicePixelRatio || 1,
                    autoDensity: true,
                });
            } catch (err) {
                console.error("Failed to initialize Pixi:", err);
                return;
            }

            // Guard against unmount/destruction happening while 'app.init' was awaiting
            if (!containerRef.current || pixiAppRef.current !== app) {
                try {
                    app.destroy(true, { children: true });
                } catch (e) {
                    if (typeof (app as any)._cancelResize !== 'function') {
                        (app as any)._cancelResize = () => { /* empty */ };
                    }
                    try {
                        app.destroy(true, { children: true });
                    } catch (e2) { /* empty */ }
                }
                return;
            }

            containerRef.current.appendChild(app.canvas);

            // Container Hierarchy
            const world = new PIXI.Container();
            worldContainerRef.current = world;
            app.stage.addChild(world);

            const renderItems = new PIXI.Container();
            renderItems.sortableChildren = true;
            renderItemsContainerRef.current = renderItems;
            world.addChild(renderItems);

            const connectionsGraphics = new PIXI.Graphics();
            connectionsGraphicsRef.current = connectionsGraphics;
            world.addChild(connectionsGraphics);

            const effectsContainer = new PIXI.Container();
            effectsContainerRef.current = effectsContainer;
            world.addChild(effectsContainer);

            const particlesContainer = new PIXI.Container();
            particlesContainerRef.current = particlesContainer;
            world.addChild(particlesContainer);

            // Starts high-frequency visual update tickers
            if (app.ticker) {
                app.ticker.add(tickerCallbackRef.current);
            }

            // Sync with any dimensions change that happened during init
            if (dimensions && app.renderer) {
                app.renderer.resize(dimensions.width, dimensions.height);
            }

            setIsPixiReady(true);
        };

        initPixi();

        return () => {
            setIsPixiReady(false);
            if (activeActionParticles.current.length > 0) {
                activeActionParticles.current.forEach(p => {
                    try { p.graphics.destroy(); } catch (err) { /* empty */ }
                });
                activeActionParticles.current = [];
            }
            if (pixiAppRef.current === app) {
                pixiAppRef.current = null;
                if (app.ticker) {
                    try {
                        app.ticker.remove(tickerCallbackRef.current);
                    } catch (e) { /* empty */ }
                }
                try {
                    app.destroy(true, { children: true });
                } catch (e) {
                    if (typeof (app as any)._cancelResize !== 'function') {
                        (app as any)._cancelResize = () => { /* empty */ };
                    }
                    try {
                        app.destroy(true, { children: true });
                    } catch (e2) { /* empty */ }
                }
                worldContainerRef.current = null;
                renderItemsContainerRef.current = null;
                connectionsGraphicsRef.current = null;
                effectsContainerRef.current = null;
                particlesContainerRef.current = null;
            }
        };
    }, []);

    // Window Resize Handler
    useEffect(() => {
        if (pixiAppRef.current && pixiAppRef.current.renderer && dimensions) {
            pixiAppRef.current.renderer.resize(dimensions.width, dimensions.height);
        }
    }, [dimensions]);

    // Live sync camera state
    useEffect(() => {
        if (worldContainerRef.current && camera) {
            worldContainerRef.current.x = camera.x;
            worldContainerRef.current.y = camera.y;
            worldContainerRef.current.scale.set(camera.scale, camera.scale);
        }
    }, [camera, isPixiReady]);

    // Renders physical move connection outlines
    const drawConnections = useCallback(() => {
        const graphics = connectionsGraphicsRef.current;
        if (!graphics || !grid || !player || isPlayerGrowing || player.state === EntityState.MOVING) {
            graphics?.clear();
            return;
        }

        graphics.clear();
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const SQRT3 = Math.sqrt(3);
        const SQRT3_2 = SQRT3 / 2;
        const ONE_POINT_FIVE = 1.5;

        const rawPX = HEX_SIZE * (SQRT3 * player.q + SQRT3_2 * player.r);
        const rawPY = HEX_SIZE * (ONE_POINT_FIVE * player.r);
        const ppx = rawPX * cos - rawPY * sin;
        const ppy = (rawPX * sin + rawPY * cos) * 0.8;

        const pHex = grid[getHexKey(player.q, player.r)];
        const startH = pHex ? (10 + pHex.currentLevel * 10) : 10;
        const neighbors = getNeighbors(player.q, player.r);

        for (const n of neighbors) {
            const nHex = grid[getHexKey(n.q, n.r)];
            const isReallyVoid = nHex?.structureType === 'VOID';
            const isBlocked = nHex?.isPassable === false;
            
            if (isReallyVoid || isBlocked) continue;

            const rawNX = HEX_SIZE * (SQRT3 * n.q + SQRT3_2 * n.r);
            const rawNY = HEX_SIZE * (ONE_POINT_FIVE * n.r);
            const npx = rawNX * cos - rawNY * sin;
            const npy = (rawNX * sin + rawNY * cos) * 0.8;

            const endH = nHex ? (10 + nHex.currentLevel * 10) : 10;
            
            const currentLevel = pHex ? pHex.currentLevel : 0;
            const nextLevel = nHex ? nHex.currentLevel : 0;
            if (Math.abs(currentLevel - nextLevel) > 1) continue;

            const cost = nextLevel > 1 ? nextLevel : 1;
            const { exchangeRate } = getStatusModifiers(player, { campaignUpgrades });
            const canAfford = player.moves >= cost || player.coins >= (cost * exchangeRate);

            graphics.strokeStyle = {
                width: 2.0,
                color: canAfford ? 0x34d399 : 0xef4444,
                alpha: (nHex && nHex.currentLevel > player.playerLevel) ? 0.2 : 0.6,
            };

            // Dotted look
            const startX = ppx;
            const startY = ppy - startH;
            const endX = npx;
            const endY = npy - endH;

            const segmentCount = 6;
            for (let s = 0; s < segmentCount; s++) {
                if (s % 2 === 0) {
                    const t1 = s / segmentCount;
                    const t2 = (s + 1) / segmentCount;
                    graphics.moveTo(startX + (endX - startX) * t1, startY + (endY - startY) * t1);
                    graphics.lineTo(startX + (endX - startX) * t2, startY + (endY - startY) * t2);
                }
            }
            graphics.stroke();
        }
    }, [grid, player, isPlayerGrowing, rotation, campaignUpgrades, isPixiReady]);

    useEffect(() => {
        drawConnections();
    }, [grid, player, rotation, campaignUpgrades, isPixiReady]);

    // Renders active floating text effects
    const updateFloatingEffects = useCallback(() => {
        const parent = effectsContainerRef.current;
        if (!parent || !effects) return;

        // Group concurrent effects to stack vertically
        const sorted = [...effects].sort((a, b) => a.startTime - b.startTime);
        const counts: Record<string, number> = { /* empty */ };
        const activeEffectIds = new Set<string>();

        sorted.forEach(eff => {
            const key = `${eff.q},${eff.r}`;
            const idx = counts[key] || 0;
            counts[key] = idx + 1;
            activeEffectIds.add(eff.id);

            let cached = effectCache.current.get(eff.id);
            if (!cached) {
                const container = new PIXI.Container();
                const text = new PIXI.Text({
                    text: eff.text,
                    style: {
                        fontFamily: 'Inter, sans-serif',
                        fontSize: 16,
                        fontWeight: 'bold',
                        fill: eff.color,
                        align: 'center'
                    }
                });
                text.anchor.set(0.5, 0.5);
                container.addChild(text);
                parent.addChild(container);

                let laserGraphics: PIXI.Graphics | undefined = undefined;
                if (eff.sourceQ !== undefined && eff.sourceR !== undefined) {
                    laserGraphics = new PIXI.Graphics();
                    parent.addChild(laserGraphics);
                }

                cached = {
                    container,
                    text,
                    startTime: Date.now(),
                    lifetime: eff.lifetime,
                    q: eff.q,
                    r: eff.r,
                    stackIndex: idx,
                    laserGraphics
                };
                effectCache.current.set(eff.id, cached);
            }

            const elapsed = Date.now() - cached.startTime;
            const progress = Math.min(1.0, elapsed / cached.lifetime);

            const { x: basePx, y: basePy } = simpleHexToPixel(cached.q, cached.r);
            const verticalSpacing = 24;
            const currentY = basePy - 20 - idx * verticalSpacing;

            // Ease up and fade out
            const riseDistance = 80;
            const currentRise = progress * riseDistance;
            
            cached.container.x = basePx;
            cached.container.y = currentY - currentRise;

            // Pops in quickly, then fades away smoothly
            if (progress < 0.2) {
                const scale = 0.5 + (progress / 0.2) * 0.5;
                cached.container.scale.set(scale, scale);
                cached.container.alpha = 1.0;
            } else {
                const fadeProgress = (progress - 0.2) / 0.8;
                cached.container.alpha = 1.0 - fadeProgress;
                cached.container.scale.set(1.0 + fadeProgress * 0.2, 1.0 + fadeProgress * 0.2);
            }

            // Draw laser beam if this effect has a source coordinate
            if (cached.laserGraphics && eff.sourceQ !== undefined && eff.sourceR !== undefined) {
                cached.laserGraphics.clear();
                
                const beamLifetime = 800; // Fades faster than floating text
                if (elapsed < beamLifetime) {
                    const beamProgress = elapsed / beamLifetime;
                    const beamAlpha = 1.0 - beamProgress;
                    
                    const gridObj = sessionGrid || { /* empty */ };
                    
                    const sourceKey = getHexKey(eff.sourceQ, eff.sourceR);
                    const sourceHex = gridObj[sourceKey];
                    const sourceLevel = sourceHex ? (sourceHex.currentLevel ?? 0) : 0;
                    const sourceZ = getHexVisualHeight(sourceLevel);
                    
                    const { x: sBasePx, y: sBasePy } = simpleHexToPixel(eff.sourceQ, eff.sourceR);
                    const sX = sBasePx;
                    const sY = sBasePy - sourceZ;
                    
                    const targetKey = getHexKey(eff.q, eff.r);
                    const targetHex = gridObj[targetKey];
                    const targetLevel = targetHex ? (targetHex.currentLevel ?? 0) : 0;
                    const targetZ = getHexVisualHeight(targetLevel);
                    
                    const { x: tBasePx, y: tBasePy } = simpleHexToPixel(eff.q, eff.r);
                    const tX = tBasePx;
                    const tY = tBasePy - targetZ;
                    
                    // Main rose glow
                    cached.laserGraphics.strokeStyle = { width: 4.5 * (1.0 - beamProgress), color: 0xF43F5E, alpha: beamAlpha * 0.75 };
                    cached.laserGraphics.beginPath();
                    cached.laserGraphics.moveTo(sX, sY);
                    cached.laserGraphics.lineTo(tX, tY);
                    cached.laserGraphics.stroke();
                    
                    // Core white beam
                    cached.laserGraphics.strokeStyle = { width: 1.5 * (1.0 - beamProgress), color: 0xFFFFFF, alpha: beamAlpha * 0.95 };
                    cached.laserGraphics.beginPath();
                    cached.laserGraphics.moveTo(sX, sY);
                    cached.laserGraphics.lineTo(tX, tY);
                    cached.laserGraphics.stroke();
                    
                    // Muzzle flash circle at source turret
                    cached.laserGraphics.fillStyle = { color: 0xF43F5E, alpha: beamAlpha * 0.9 };
                    cached.laserGraphics.beginPath();
                    cached.laserGraphics.circle(sX, sY, 8 * (1.0 - beamProgress));
                    cached.laserGraphics.fill();
                    
                    // Impact burst circle at target bot
                    cached.laserGraphics.fillStyle = { color: 0xF59E0B, alpha: beamAlpha * 0.9 };
                    cached.laserGraphics.beginPath();
                    cached.laserGraphics.circle(tX, tY, 10 * (1.0 - beamProgress));
                    cached.laserGraphics.fill();
                }
            }
        });

        // Cull expired effects
        for (const [id, value] of effectCache.current.entries()) {
            if (!activeEffectIds.has(id)) {
                parent.removeChild(value.container);
                value.container.destroy({ children: true });
                if (value.laserGraphics) {
                    parent.removeChild(value.laserGraphics);
                    value.laserGraphics.destroy();
                }
                effectCache.current.delete(id);
            }
        }
    }, [effects, simpleHexToPixel]);

    // Renders active dust particles
    const updateDustParticles = useCallback(() => {
        const now = Date.now();
        particlesList.current = particlesList.current.filter(item => {
            const elapsed = now - item.startTime;
            if (elapsed >= item.duration) {
                item.graphics.destroy();
                return false;
            }

            const progress = elapsed / item.duration;
            item.graphics.clear();

            item.puffs.forEach(puff => {
                const cx = puff.vx * elapsed;
                const cy = puff.vy * elapsed;
                const radius = puff.radius * (1.0 - progress);
                const alpha = puff.opacity * (1.0 - progress);

                item.graphics.beginPath();
                item.graphics.circle(cx, cy, radius);
                item.graphics.fill({ color: 0x94a3b8, alpha });
            });

            return true;
        });
    }, []);

    // Main Pixi update ticker loop executed every frame
    const updateSceneLoop = () => {
        const nowTime = Date.now();
        if (sessionId && sessionId !== lastSessionIdRef.current) {
            lastSessionIdRef.current = sessionId;
            sessionStartTimeRef.current = nowTime;
        }

        if (gameStatus === 'VICTORY') {
            if (victoryStartTimeRef.current === null) {
                victoryStartTimeRef.current = nowTime;
            }
        } else {
            victoryStartTimeRef.current = null;
        }

        updateFloatingEffects();
        updateDustParticles();

        // Tick and update action particles
        activeActionParticles.current = activeActionParticles.current.filter(p => {
            p.life -= p.decay;
            if (p.life <= 0) {
                try { p.graphics.destroy(); } catch (err) { /* empty */ }
                return false;
            }
            p.graphics.x += p.vx;
            p.graphics.y += p.vy;
            p.graphics.alpha = p.life;
            return true;
        });

        // Instant hover outline — toggled every frame so it tracks the cursor live,
        // decoupled from the ~100ms render tick that previously delayed the highlight.
        {
            const hid = useEphemeralStore.getState().hoveredHexId;
            if (hid !== hoverRef.current) {
                const prev = hoverRef.current ? hexCache.current.get(hoverRef.current) : null;
                if (prev) { const o = prev.getChildByName('hoverOutline'); if (o) o.visible = false; }
                const cur = hid ? hexCache.current.get(hid) : null;
                if (cur) { const o = cur.getChildByName('hoverOutline'); if (o) o.visible = true; }
                hoverRef.current = hid;
            }
        }

        // 0. Animate bouncing objective arrows and swing crowns
        hexCache.current.forEach((container, hexId) => {
            const objArrow = container.getChildByName('objective_arrow') as PIXI.Container;
            if (objArrow && objArrow.visible) {
                const hexItem = activeRenderItems.find(item => item.id === hexId);
                const faceY = hexItem?.props?.offsetY ?? 0;
                
                const nowTime = Date.now();
                const bounceAmt = Math.sin(nowTime * 0.006) * 6;
                objArrow.y = faceY - 35 + Math.min(0, bounceAmt);

                const arrowArt = objArrow.getChildByName('arrow_art');
                if (arrowArt) {
                    const isCrown = arrowArt instanceof PIXI.Text;
                    if (isCrown) {
                        arrowArt.rotation = Math.sin(nowTime * 0.003) * 0.15;
                    }
                }
            }
        });

        // 1. ANIMATE UNITS walking JUMPS and squashing physics
        const now = Date.now();
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        unitAnimStates.current.forEach((state, unitId) => {
            const container = unitCache.current.get(unitId);
            if (!container) return;

            const shadow = container.getChildByName('shadow') as PIXI.Graphics;
            const ring = container.getChildByName('ring') as PIXI.Graphics;
            const sprite = container.getChildByName('sprite') as PIXI.Sprite;

            // Calculate staggered offsets relative to player position
            const uQ = state.isMoving ? state.currentQ : state.targetQ;
            const uR = state.isMoving ? state.currentR : state.targetR;
            const distToPlayer = cubeDistance({ q: playerQ, r: playerR }, { q: uQ, r: uR });

            const sessionElapsed = now - sessionStartTimeRef.current;
            const entranceDuration = 1200;

            let entranceYOffset = 0;
            if (sessionElapsed < entranceDuration + 600) {
                const staggerDelay = distToPlayer * 100;
                const elapsedForUnit = Math.max(0, sessionElapsed - staggerDelay);
                const dropDuration = 800;
                if (elapsedForUnit < dropDuration) {
                    const p = elapsedForUnit / dropDuration;
                    entranceYOffset = -500 * Math.pow(1 - p, 3);
                }
            }

            let victoryYOffset = 0;
            if (victoryStartTimeRef.current !== null) {
                const victoryElapsed = now - victoryStartTimeRef.current;
                const staggerDelay = distToPlayer * 100;
                const elapsedForUnit = Math.max(0, victoryElapsed - staggerDelay);
                if (elapsedForUnit > 0) {
                    victoryYOffset = elapsedForUnit * 0.18;
                }
            }

            if (state.isMoving) {
                const elapsed = now - state.startTime;
                const duration = state.stepDuration;
                const progress = Math.min(1.0, elapsed / duration);

                // Select correct easing based on current move mode
                let ease = progress;
                const m = state.moveMode;
                if (m === 'MIDDLE') {
                    ease = progress;
                } else if (m === 'FIRST') {
                    ease = progress * progress * (1.5 - 0.5 * progress);
                } else if (m === 'LAST') {
                    ease = 1.5 * progress - 0.5 * (progress * progress * progress);
                } else {
                    ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
                }

                const easeClamped = Math.max(0, Math.min(1, ease));

                // Position Interpolation in flat projected space
                const startRawX = HEX_SIZE * (Math.sqrt(3) * state.startQ + Math.sqrt(3)/2 * state.startR);
                const startRawY = HEX_SIZE * 1.5 * state.startR;
                const startPx = startRawX * cos - startRawY * sin;
                const startPy = (startRawX * sin + startRawY * cos) * 0.8;

                const targetRawX = HEX_SIZE * (Math.sqrt(3) * state.targetQ + Math.sqrt(3)/2 * state.targetR);
                const targetRawY = HEX_SIZE * 1.5 * state.targetR;
                const targetPx = targetRawX * cos - targetRawY * sin;
                const targetPy = (targetRawX * sin + targetRawY * cos) * 0.8;

                const curX = startPx + (targetPx - startPx) * easeClamped;
                const curY = startPy + (targetPy - startPy) * easeClamped;

                state.currentQ = state.startQ + (state.targetQ - state.startQ) * easeClamped;
                state.currentR = state.startR + (state.targetR - state.startR) * easeClamped;
                state.currentLevel = state.startLevel + (state.targetLevel - state.startLevel) * easeClamped;

                container.x = curX;
                container.y = curY + entranceYOffset + victoryYOffset;
                const tieBreaker = (state.currentQ * 0.0001) + (state.currentR * 0.00001);
                container.zIndex = curY + 1 + tieBreaker;
                
                // Height/Jump arcs
                const startZ = getHexVisualHeight(state.startLevel);
                const targetZ = getHexVisualHeight(state.targetLevel);
                const curGroundZ = startZ + (targetZ - startZ) * easeClamped;

                let jumpY = 0;
                let scaleX = state.facingLeft ? -1 : 1;
                let scaleY = 1.0;

                const isLateral = state.startQ !== state.targetQ || state.startR !== state.targetR;
                if (isLateral) {
                    const jumpPeak = 80;
                    const arc = Math.sin(progress * Math.PI);
                    jumpY = -arc * jumpPeak;

                    // Squash & Stretch
                    if (progress < 0.15) {
                        const squash = 0.2 * Math.sin((progress / 0.15) * Math.PI);
                        scaleY = 1.0 - squash;
                        scaleX = (state.facingLeft ? -1.0 : 1.0) * (1.0 + squash * 0.5);
                    } else if (progress < 0.85) {
                        const stretch = 0.15 * Math.sin(((progress - 0.15) / 0.7) * Math.PI);
                        scaleY = 1.0 + stretch;
                        scaleX = (state.facingLeft ? -1.0 : 1.0) * (1.0 - stretch * 0.4);
                    } else {
                        const squash = 0.25 * Math.sin(((progress - 0.85) / 0.15) * Math.PI);
                        scaleY = 1.0 - squash;
                        scaleX = (state.facingLeft ? -1.0 : 1.0) * (1.0 + squash * 0.6);
                    }
                }

                // Apply animations directly to children Pivot points
                if (sprite) {
                    sprite.y = curGroundZ + jumpY;
                    sprite.scale.set(scaleX, scaleY);
                }

                if (ring) {
                    ring.y = curGroundZ + jumpY;
                    ring.scale.set(scaleX, scaleY);
                }

                if (shadow && isLateral) {
                    shadow.y = curGroundZ;
                    const arc = Math.sin(progress * Math.PI);
                    const shadowScale = (1.0 - arc * 0.5) / Math.abs(scaleX);
                    shadow.scale.set(shadowScale, shadowScale);
                    shadow.alpha = 0.4 - arc * 0.25;
                }

                if (progress >= 1.0) {
                    state.isMoving = false;
                    state.startQ = state.targetQ;
                    state.startR = state.targetR;
                    state.startLevel = state.targetLevel;
                    state.currentQ = state.targetQ;
                    state.currentR = state.targetR;
                    state.currentLevel = state.targetLevel;

                    // Perfect snapping to target positions
                    container.x = targetPx;
                    container.y = targetPy + entranceYOffset + victoryYOffset;

                    // Snaps to perfect rest frame
                    const finalTieBreaker = (state.targetQ * 0.0001) + (state.targetR * 0.00001);
                    container.zIndex = targetPy + 1 + finalTieBreaker;
                    if (sprite) {
                        sprite.y = targetZ;
                        sprite.scale.set(state.facingLeft ? -1.0 : 1.0, 1.0);
                    }
                    if (shadow) {
                        shadow.y = targetZ;
                        shadow.scale.set(1.0, 1.0);
                        shadow.alpha = 0.4;
                    }
                }
            } else {
                // Ensure perfect alignment is maintained continuously (e.g. during zoom, rotation, or shake)
                const targetRawX = HEX_SIZE * (Math.sqrt(3) * state.targetQ + Math.sqrt(3)/2 * state.targetR);
                const targetRawY = HEX_SIZE * 1.5 * state.targetR;
                const targetPx = targetRawX * cos - targetRawY * sin;
                const targetPy = (targetRawX * sin + targetRawY * cos) * 0.8;
                container.x = targetPx;
                container.y = targetPy + entranceYOffset + victoryYOffset;

                const finalTieBreaker = (state.targetQ * 0.0001) + (state.targetR * 0.00001);
                container.zIndex = targetPy + 1 + finalTieBreaker;

                // If not moving physically, still process idle float / hover loops
                const targetZ = getHexVisualHeight(state.targetLevel);
                if (sprite) {
                    sprite.y = targetZ;
                }
                if (shadow) {
                    shadow.y = targetZ;
                    shadow.scale.set(1.0, 1.0);
                    shadow.alpha = 0.4;
                }
            }

            // --- PRODUCTION GRADE QUALITY PROGRESSION HUD & PARTICLES SYSTEM ---
            if (unitId === player?.id) {
                let actionOverlay = container.getChildByName('actionOverlay') as PIXI.Container;
                
                // Hide action overlay if game ended, player is moving, or growth is not active
                if (!isPlayerGrowing || state.isMoving || gameStatus === 'VICTORY' || gameStatus === 'DEFEAT' || evacuationActive) {
                    if (actionOverlay) {
                        actionOverlay.visible = false;
                    }
                    if (activeActionParticles.current.length > 0) {
                        activeActionParticles.current.forEach(p => {
                            try { p.graphics.destroy(); } catch (err) { /* empty */ }
                        });
                        activeActionParticles.current = [];
                    }
                } else {
                    // Update/Create Action Overlay
                    if (!actionOverlay) {
                        actionOverlay = new PIXI.Container();
                        actionOverlay.name = 'actionOverlay';
                        container.addChild(actionOverlay);
                    }
                    actionOverlay.visible = true;
                    
                    const pZ = getHexVisualHeight(state.targetLevel);
                    actionOverlay.y = pZ;
                    
                    // Fetch progress data from selected hex
                    const isRu = useGameStore.getState().session?.language === 'RU';
                    const currentHex = grid && selectedHexId ? grid[selectedHexId] : null;
                    const growthType = playerGrowthIntent || 'UPGRADE';
                    
                    let currentStepNeeded = 30;
                    if (growthType === 'RECOVER' && currentHex) {
                        currentStepNeeded = getLevelConfig(currentHex.maxLevel)?.growthTime ?? 30;
                    } else if (growthType === 'DIG') {
                        currentStepNeeded = 30;
                    } else if (currentHex) {
                        currentStepNeeded = getLevelConfig(currentHex.currentLevel + 1)?.growthTime ?? 30;
                    }
                    
                    const targetPercent = currentHex && currentStepNeeded > 0 ? Math.min(1.0, currentHex.progress / currentStepNeeded) : 0;
                    
                    let color = 0xf59e0b; // Gold (UPGRADE / BUILD)
                    let prgColorHexStr = '#10b981'; // Green for Upgrade bar
                    if (growthType === 'DIG') {
                        color = 0xef4444; // Red
                        prgColorHexStr = '#ef4444';
                    } else if (growthType === 'RECOVER') {
                        color = 0x3b82f6; // Blue
                        prgColorHexStr = '#3b82f6';
                    }
                    
                    // 1. Rotating Perspective Ground Ring
                    let gRing = actionOverlay.getChildByName('gRing') as PIXI.Graphics;
                    if (!gRing) {
                        gRing = new PIXI.Graphics();
                        gRing.name = 'gRing';
                        actionOverlay.addChild(gRing);
                    }
                    gRing.clear();
                    gRing.rotation += 0.04;
                    gRing.scale.y = 0.6; // perfect 3D perspective squashing
                    
                    for (let i = 0; i < 12; i++) {
                        const theta = (2 * Math.PI * i) / 12;
                        const rx = 24;
                        const ry = 24;
                        const dx = Math.cos(theta) * rx;
                        const dy = Math.sin(theta) * ry;
                        const dotProgress = (i + 1) / 12;
                        const isActive = targetPercent >= dotProgress;
                        if (isActive) {
                            gRing.circle(dx, dy, 2.5);
                            gRing.fill({ color, alpha: 0.95 });
                            gRing.stroke({ width: 0.8, color: 0xffffff });
                        } else {
                            gRing.circle(dx, dy, 1.2);
                            gRing.fill({ color: 0xffffff, alpha: 0.3 });
                        }
                    }
                    
                    // 2. Action Particles Spawner
                    if (Math.random() < 0.3 && activeActionParticles.current.length < 25) {
                        const pG = new PIXI.Graphics();
                        pG.circle(0, 0, 1.2 + Math.random() * 2.2);
                        pG.fill({ color });
                        
                        // Spawn relative to player's feet / isometric surface
                        pG.x = (Math.random() - 0.5) * 20;
                        const surfaceOffset = -3;
                        pG.y = surfaceOffset + (Math.random() - 0.5) * 5;
                        pG.zIndex = 30; // Float on top of player's legs
                        
                        actionOverlay.addChild(pG);
                        
                        activeActionParticles.current.push({
                            graphics: pG,
                            vx: (Math.random() - 0.5) * 1.5,
                            vy: -1.2 - Math.random() * 1.8,
                            life: 1.0,
                            decay: 0.02 + Math.random() * 0.03
                        });
                    }
                    
                    // 3. Floating Capsule HUD Pill above player head
                    let hudPill = actionOverlay.getChildByName('hudPill') as PIXI.Container;
                    if (!hudPill) {
                        hudPill = new PIXI.Container();
                        hudPill.name = 'hudPill';
                        actionOverlay.addChild(hudPill);
                    }
                    
                    const blockHover = Math.sin(Date.now() / 200) * 3.2;
                    hudPill.y = -64 + blockHover;
                    
                    // Capsule background
                    let pillBg = hudPill.getChildByName('pillBg') as PIXI.Graphics;
                    if (!pillBg) {
                        pillBg = new PIXI.Graphics();
                        pillBg.name = 'pillBg';
                        hudPill.addChild(pillBg);
                    }
                    pillBg.clear();
                    pillBg.roundRect(-28, -11, 56, 22, 5);
                    pillBg.fill({ color: 0x0b132b, alpha: 0.92 });
                    pillBg.stroke({ width: 1.2, color });
                    
                    // Left icon container & animation
                    pillBg.circle(-18, 0, 8);
                    pillBg.fill({ color: 0x0b132b, alpha: 0.96 });
                    pillBg.stroke({ width: 1.0, color });
                    
                    let pillIcon = hudPill.getChildByName('pillIcon') as PIXI.Graphics;
                    if (!pillIcon) {
                        pillIcon = new PIXI.Graphics();
                        pillIcon.name = 'pillIcon';
                        hudPill.addChild(pillIcon);
                    }
                    pillIcon.clear();
                    pillIcon.x = -18;
                    pillIcon.y = 0;
                    
                    if (growthType === 'DIG') {
                        const swinging = Math.sin(Date.now() / 100) * 0.4;
                        pillIcon.rotation = swinging - 0.3;
                        pillIcon.strokeStyle = { width: 1.5, color: 0xcbd5e1 };
                        pillIcon.moveTo(0, 3);
                        pillIcon.lineTo(0, -4);
                        pillIcon.stroke();
                        
                        pillIcon.beginPath();
                        pillIcon.moveTo(-5, -4);
                        pillIcon.quadraticCurveTo(0, -6, 5, -4);
                        pillIcon.strokeStyle = { width: 1.5, color: 0xf8fafc };
                        pillIcon.stroke();
                    } else if (growthType === 'UPGRADE') {
                        const swinging = Math.sin(Date.now() / 80) * 0.25;
                        pillIcon.rotation = swinging - 0.15;
                        pillIcon.strokeStyle = { width: 1.5, color: 0xcbd5e1 };
                        pillIcon.moveTo(-1, 3);
                        pillIcon.lineTo(1, -1);
                        pillIcon.stroke();
                        
                        pillIcon.rect(-3, -4, 6, 4);
                        pillIcon.fill({ color: 0xf59e0b });
                    } else {
                        pillIcon.rotation += 0.08;
                        pillIcon.circle(0, 0, 4);
                        pillIcon.stroke({ width: 1.5, color: 0x3b82f6 });
                        pillIcon.circle(0, 0, 1.5);
                        pillIcon.fill({ color: 0x93c5fd });
                    }
                    
                    // Labels
                    let labelText = hudPill.getChildByName('labelText') as PIXI.Text;
                    if (!labelText) {
                        labelText = new PIXI.Text({
                            text: '',
                            style: {
                                fontSize: 7.5,
                                align: 'left',
                                fill: prgColorHexStr,
                                fontFamily: 'JetBrains Mono, monospace',
                                fontWeight: 'bold'
                            }
                        });
                        labelText.name = 'labelText';
                        hudPill.addChild(labelText);
                    }
                    labelText.text = growthType === 'DIG' ? (isRu ? 'БУР' : 'DIG') : growthType === 'UPGRADE' ? (isRu ? 'СТРОЙ' : 'BUILD') : (isRu ? 'СЪЕМ' : 'SIPHON');
                    labelText.style.fill = prgColorHexStr;
                    labelText.x = -6;
                    labelText.y = -8;
                    
                    let prgText = hudPill.getChildByName('prgText') as PIXI.Text;
                    if (!prgText) {
                        prgText = new PIXI.Text({
                            text: '',
                            style: {
                                fontSize: 7.5,
                                align: 'right',
                                fill: '#ffffff',
                                fontFamily: 'JetBrains Mono, monospace',
                                fontWeight: 'bold'
                            }
                        });
                        prgText.name = 'prgText';
                        hudPill.addChild(prgText);
                    }
                    prgText.text = `${Math.round(targetPercent * 100)}%`;
                    prgText.x = 10;
                    prgText.y = -8;
                    
                    // Bottom Progress bar lines
                    let pBarUnder = hudPill.getChildByName('pBarUnder') as PIXI.Graphics;
                    if (!pBarUnder) {
                        pBarUnder = new PIXI.Graphics();
                        pBarUnder.name = 'pBarUnder';
                        hudPill.addChild(pBarUnder);
                    }
                    pBarUnder.clear();
                    pBarUnder.roundRect(-6, 3, 30, 3, 1);
                    pBarUnder.fill({ color: 0x1e293b, alpha: 0.95 });
                    if (targetPercent > 0.01) {
                        pBarUnder.roundRect(-6, 3, 30 * targetPercent, 3, 1);
                        pBarUnder.fill({ color });
                    }
                }
            }

            // Collapse or Triumphant Ascension Animation Check for Victory/Defeat/Evac
            const dynContainer = container as any;
            if (unitId === player?.id && gameStatus === 'VICTORY') {
                if (sprite) {
                    if (dynContainer.victoryStart === undefined) {
                        dynContainer.victoryStart = Date.now();
                    }
                    const elapsed = Date.now() - dynContainer.victoryStart;
                    
                    // 1. Keep player sprite resting on the sinking hex tile
                    const ascendY = 0;
                    const targetZ = getHexVisualHeight(state.targetLevel);
                    sprite.y = targetZ;
                    
                    // Gentle spin and fade
                    sprite.rotation += 0.05;
                    sprite.alpha = Math.max(0, 1.0 - elapsed / 2500); // fade out over 2.5 seconds
                    
                    // 2. Draw glorious Victory Beam on ground
                    let victoryBeam = container.getChildByName('victoryBeam') as PIXI.Graphics;
                    if (!victoryBeam) {
                        victoryBeam = new PIXI.Graphics();
                        victoryBeam.name = 'victoryBeam';
                        victoryBeam.zIndex = -1; // behind player
                        container.addChild(victoryBeam);
                    }
                    victoryBeam.visible = true;
                    victoryBeam.clear();
                    
                    // Main beam: translucent green/cyan/gold
                    const beamAlpha = Math.min(0.6, elapsed / 500) * Math.max(0, 1.0 - elapsed / 3000);
                    const beamWidth = 30 + Math.sin(elapsed / 100) * 5;
                    
                    // Draw isometric base ellipse for beam
                    victoryBeam.beginPath();
                    victoryBeam.ellipse(0, targetZ, beamWidth, beamWidth * 0.5);
                    victoryBeam.fill({ color: 0x10b981, alpha: beamAlpha * 0.3 });
                    victoryBeam.stroke({ width: 2, color: 0x34d399, alpha: beamAlpha });

                    // Vertical volumetric light cylinder
                    victoryBeam.beginPath();
                    victoryBeam.moveTo(-beamWidth, targetZ);
                    victoryBeam.lineTo(-beamWidth * 0.6, targetZ - 300);
                    victoryBeam.lineTo(beamWidth * 0.6, targetZ - 300);
                    victoryBeam.lineTo(beamWidth, targetZ);
                    victoryBeam.closePath();
                    victoryBeam.fill({ color: 0x059669, alpha: beamAlpha * 0.15 });

                    // Intense core line
                    victoryBeam.beginPath();
                    victoryBeam.moveTo(0, targetZ);
                    victoryBeam.lineTo(0, targetZ - 300);
                    victoryBeam.stroke({ width: 4 + Math.sin(elapsed / 50) * 2, color: 0xa7f3d0, alpha: beamAlpha * 0.8 });

                    // Secondary cyan outer beam
                    victoryBeam.beginPath();
                    victoryBeam.moveTo(-beamWidth * 1.5, targetZ);
                    victoryBeam.lineTo(-beamWidth * 1.0, targetZ - 300);
                    victoryBeam.lineTo(beamWidth * 1.0, targetZ - 300);
                    victoryBeam.lineTo(beamWidth * 1.5, targetZ);
                    victoryBeam.closePath();
                    victoryBeam.fill({ color: 0x06b6d4, alpha: beamAlpha * 0.06 });

                    // 3. Floating celebratory particle rings and stars
                    let victoryParticles = container.getChildByName('victoryParticles') as PIXI.Graphics;
                    if (!victoryParticles) {
                        victoryParticles = new PIXI.Graphics();
                        victoryParticles.name = 'victoryParticles';
                        victoryParticles.zIndex = 5;
                        container.addChild(victoryParticles);
                        // Store array of particle configurations
                        dynContainer.vParts = Array.from({ length: 40 }, () => ({
                            angle: Math.random() * Math.PI * 2,
                            radius: 5 + Math.random() * 35,
                            speedY: 1.5 + Math.random() * 3.0,
                            size: 1.5 + Math.random() * 3.5,
                            color: [0x10b981, 0x059669, 0x34d399, 0xf59e0b, 0x60a5fa, 0xffffff][Math.floor(Math.random() * 6)],
                            yOffset: Math.random() * 100,
                            driftSpeed: (Math.random() - 0.5) * 0.02
                        }));
                    }
                    victoryParticles.visible = true;
                    victoryParticles.clear();

                    if (dynContainer.vParts) {
                        dynContainer.vParts.forEach((p: any) => {
                            // Update particle position (rising up)
                            p.yOffset += p.speedY;
                            p.angle += p.driftSpeed;
                            if (p.yOffset > 300) {
                                p.yOffset = 0;
                                p.radius = 5 + Math.random() * 35;
                            }

                            // Map flat circle to 3D isometric perspective ellipse
                            const px = Math.cos(p.angle) * p.radius;
                            const py = targetZ - p.yOffset + Math.sin(p.angle) * p.radius * 0.5;

                            const pAlpha = beamAlpha * Math.min(1.0, (300 - p.yOffset) / 80);
                            victoryParticles.beginPath();
                            victoryParticles.circle(px, py, p.size);
                            victoryParticles.fill({ color: p.color, alpha: pAlpha });
                        });
                    }

                    // 4. Floating glowing Holographic "STABILITY RESTORED" Text Banner above player
                    let victoryHolo = container.getChildByName('victoryHolo') as PIXI.Container;
                    if (!victoryHolo) {
                        victoryHolo = new PIXI.Container();
                        victoryHolo.name = 'victoryHolo';
                        victoryHolo.zIndex = 20;
                        container.addChild(victoryHolo);

                        const holoBg = new PIXI.Graphics();
                        holoBg.name = 'holoBg';
                        victoryHolo.addChild(holoBg);

                        const isRu = useGameStore.getState().session?.language === 'RU';
                        const labelTextStr = isRu ? 'СТАБИЛЬНОСТЬ ВОССТАНОВЛЕНА' : 'NEXUS STABILITY RESTORED';
                        const holoText = new PIXI.Text({
                            text: labelTextStr,
                            style: {
                                fontFamily: 'Space Grotesk, Inter, sans-serif',
                                fontSize: 12,
                                fontWeight: '900',
                                fill: 0x34d399,
                                stroke: { color: 0x064e3b, width: 3 },
                                align: 'center',
                                letterSpacing: 2
                            }
                        });
                        holoText.name = 'holoText';
                        holoText.anchor.set(0.5, 0.5);
                        victoryHolo.addChild(holoText);
                    }
                    victoryHolo.visible = true;
                    
                    // Animate holographic overlay floating/pulsing
                    const holoY = targetZ - 130 - ascendY * 0.3 + Math.sin(elapsed / 150) * 5;
                    victoryHolo.y = holoY;
                    victoryHolo.alpha = Math.min(1.0, elapsed / 800) * Math.max(0, 1.0 - elapsed / 3000);
                    victoryHolo.scale.set(1.0 + 0.05 * Math.sin(elapsed / 120));

                    const hBg = victoryHolo.getChildByName('holoBg') as PIXI.Graphics;
                    if (hBg) {
                        hBg.clear();
                        // Subtly animating tech scanline behind the text
                        const w = 180 + Math.sin(elapsed / 100) * 15;
                        hBg.roundRect(-w / 2, -12, w, 24, 4);
                        hBg.fill({ color: 0x064e3b, alpha: 0.4 * victoryHolo.alpha });
                        hBg.stroke({ width: 1.5, color: 0x34d399, alpha: 0.8 * victoryHolo.alpha });
                        
                        // scanning line
                        const scanY = -12 + ((elapsed / 2) % 24);
                        hBg.beginPath();
                        hBg.moveTo(-w / 2 + 2, scanY);
                        hBg.lineTo(w / 2 - 2, scanY);
                        hBg.stroke({ width: 1.0, color: 0xa7f3d0, alpha: 0.6 * victoryHolo.alpha });
                    }

                    if (shadow) {
                        shadow.alpha = 0.4 * Math.max(0, 1.0 - elapsed / 1500);
                        shadow.scale.set(Math.max(0, 1.0 - elapsed / 1500));
                    }
                }
                if (ring && ring.alpha > 0.01) {
                    ring.scale.set(ring.scale.x * 0.9, ring.scale.y * 0.9);
                    ring.alpha *= 0.9;
                } else if (ring) {
                    ring.alpha = 0;
                }
            } else if (unitId === player?.id && (gameStatus === 'DEFEAT' || evacuationActive)) {
                if (sprite) {
                    const curSx = Math.abs(sprite.scale.x);
                    const curSy = sprite.scale.y;
                    if (curSx > 0.01 || curSy > 0.01) {
                        const newSx = curSx * 0.8;
                        const newSy = curSy * 0.8;
                        sprite.scale.set(state.facingLeft ? -newSx : newSx, newSy);
                        // Pivot is at the ankles, rotating makes it look like it's tumbling into the hex
                        sprite.rotation += 0.3; 
                    } else {
                        sprite.scale.set(0, 0);
                        sprite.rotation = 0;
                    }
                    
                    if (shadow) {
                       shadow.alpha = 0.4 * curSx;
                       shadow.scale.set(curSx, curSy);
                    }
                }
                if (ring && ring.alpha > 0.01) {
                    ring.scale.set(ring.scale.x * 0.8, ring.scale.y * 0.8);
                    ring.alpha *= 0.8;
                } else if (ring) {
                    ring.alpha = 0;
                }
            } else {
                if (sprite && !state.isMoving) {
                    sprite.rotation = 0;
                    // Restore natural sprite scale
                    sprite.scale.set(state.facingLeft ? -1.0 : 1.0, 1.0);
                    sprite.alpha = 1.0;
                }
                if (ring && !state.isMoving) {
                    ring.scale.set(1.0, 1.0);
                    ring.alpha = 0.6;
                }
                if (dynContainer.victoryStart !== undefined) {
                    dynContainer.victoryStart = undefined;
                    const victoryBeam = container.getChildByName('victoryBeam');
                    if (victoryBeam) victoryBeam.visible = false;
                    const victoryParticles = container.getChildByName('victoryParticles');
                    if (victoryParticles) victoryParticles.visible = false;
                    const victoryHolo = container.getChildByName('victoryHolo');
                    if (victoryHolo) victoryHolo.visible = false;
                }
            }
        });

        // 2. Portal particle vortex spiral animations
        hexCache.current.forEach(hContainer => {
            const portalNode = hContainer.getChildByName('portal') as PIXI.Graphics;
            if (portalNode) {
                portalNode.rotation += 0.05;
            }
        });

        // 3. Void Flicker animation
        const now2 = Date.now();
        hexCache.current.forEach(hContainer => {
            const voidFlickerNode = hContainer.getChildByName('voidFlicker') as PIXI.Graphics;
            if (voidFlickerNode) {
                voidFlickerNode.alpha = 0.5 + 0.5 * Math.sin(now2 / 150);
            }
            const voidCircleGlow = hContainer.getChildByName('voidCircleGlow') as PIXI.Graphics;
            if (voidCircleGlow) {
                // Pulse size and alpha
                const scaleVal = 1.0 + 0.12 * Math.sin(now2 / 180);
                voidCircleGlow.scale.set(scaleVal, scaleVal);
                voidCircleGlow.alpha = 0.6 + 0.4 * Math.sin(now2 / 240);
            }
        });

        // 4. Draw Bot Laser Beam Action Animations
        const parent = renderItemsContainerRef.current;
        if (parent) {
            let laserGraphics = parent.getChildByName('botLasers') as PIXI.Graphics;
            if (!laserGraphics) {
                laserGraphics = new PIXI.Graphics();
                laserGraphics.name = 'botLasers';
                laserGraphics.zIndex = 999999;
                parent.addChild(laserGraphics);
            }
            laserGraphics.clear();

            if (bots && bots.length > 0 && grid) {
                bots.forEach(bot => {
                    const queue = bot.movementQueue;
                    const isGrowing = bot.state === 'GROWING' || (queue && queue.length > 0 && queue[0].upgrade);
                    if (!isGrowing) return;

                    const botContainer = unitCache.current.get(bot.id);
                    if (!botContainer) return;

                    if (!queue || queue.length === 0) return;
                    const targetCoord = queue[0];

                    const isDefenseMode = sessionDefenseMode;
                    if (isDefenseMode) {
                        const dist = cubeDistance({ q: bot.q, r: bot.r }, { q: targetCoord.q, r: targetCoord.r });
                        if (dist > 1) return;
                    }

                    const targetKey = getHexKey(targetCoord.q, targetCoord.r);
                    const targetHexContainer = hexCache.current.get(targetKey);
                    if (!targetHexContainer) return;

                    const botSprite = botContainer.getChildByName('sprite') as PIXI.Sprite;
                    const botZ = botSprite ? botSprite.y : 0;
                    const startX = botContainer.x;
                    const startY = botContainer.y + botZ - 12;

                    const targetLevel = grid[targetKey]?.currentLevel ?? 0;
                    const targetZ = getHexVisualHeight(targetLevel);
                    const endX = targetHexContainer.x;
                    const endY = targetHexContainer.y + targetZ;

                    const intent = (targetCoord.intent || 'UPGRADE') as string;
                    let color = 0x00f0ff; // Cyan for UPGRADE
                    if (intent === 'DIG') {
                        color = 0xff3366; // Red/pink for DIG
                    } else if (intent === 'TURRET') {
                        color = 0xffaa00; // Orange for TURRET
                    }

                    // Draw main glow beam
                    laserGraphics.strokeStyle = { width: 3.5, color: color, alpha: 0.85 };
                    laserGraphics.beginPath();
                    laserGraphics.moveTo(startX, startY);
                    laserGraphics.lineTo(endX, endY);
                    laserGraphics.stroke();

                    // Draw bright core
                    laserGraphics.strokeStyle = { width: 1.2, color: 0xffffff, alpha: 1.0 };
                    laserGraphics.beginPath();
                    laserGraphics.moveTo(startX, startY);
                    laserGraphics.lineTo(endX, endY);
                    laserGraphics.stroke();

                    // Impact ring glow
                    const pulse = Math.sin(now2 * 0.02) * 2;
                    laserGraphics.fillStyle = { color: color, alpha: 0.45 };
                    laserGraphics.beginPath();
                    laserGraphics.ellipse(endX, endY, 8 + pulse, 5 + pulse * 0.6);
                    laserGraphics.fill();

                    laserGraphics.fillStyle = { color: 0xffffff, alpha: 0.75 };
                    laserGraphics.beginPath();
                    laserGraphics.ellipse(endX, endY, 3, 1.8);
                    laserGraphics.fill();
                });
            }
        }
    };

    const latestUpdateSceneLoop = useRef<() => void>(updateSceneLoop);
    latestUpdateSceneLoop.current = updateSceneLoop;

    const tickerCallbackRef = useRef<() => void>(() => {
        latestUpdateSceneLoop.current();
    });

    // Trigger state changes when Render List items from Visual Worker update
    useEffect(() => {
        const parent = renderItemsContainerRef.current;
        if (!parent || !activeRenderItems.length || !grid) return;

        const activeHexIds = new Set<string>();
        const activeUnitIds = new Set<string>();
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const rotatedBasePoints = BASE_POINTS.map(pt => ({
            x: pt.x * cos - pt.y * sin,
            y: pt.x * sin + pt.y * cos
        }));
        // Fetch the absolute active hover ID synchronously from the Ephemeral store
        const hoveredHexId = useEphemeralStore.getState().hoveredHexId;

        // Track completed shape coordinates for campaign highlights
        const completedShapeCoords = useGameStore.getState().session?.completedShapeCoords || [];

        // 1. HEX CONSTRUCTS LAYER
        activeRenderItems.forEach(item => {
            if (item.type === 'HEX') {
                activeHexIds.add(item.id);
                const props = item.props;
                const hex = grid[item.id];
                if (!hex) return;

                const isRevealed = !!props.isRevealed;
                let curContainer = hexCache.current.get(item.id);

                if (!curContainer) {
                    curContainer = new PIXI.Container();
                    curContainer.name = item.id;
                    curContainer.sortableChildren = true;
                    parent.addChild(curContainer);
                    hexCache.current.set(item.id, curContainer);
                }

                // Calculate projected flat visual coordinates
                const cx = props.x * cos - props.y * sin;
                const cy = (props.x * sin + props.y * cos) * 0.8;
                curContainer.x = cx;
                curContainer.y = cy;
                curContainer.zIndex = item.depth;
                curContainer.alpha = props.opacity;

                const theme = getTheme(item.props.isRevealed ? hex.maxLevel : 0);
                const isRealVoid = props.structureType === 'VOID';
                
                const costMoves = pendingConfirmation?.data?.costMoves;
                const costCoins = pendingConfirmation?.data?.costCoins;
                const gradientLockStatus = !!recentGradientLock;

                const cProps = hexPropsCache.current.get(curContainer);
                let isDirty = !cProps || 
                    cProps.rotation !== rotation ||
                    cProps.offsetY !== props.offsetY ||
                    cProps.level !== props.level ||
                    cProps.maxLevel !== props.maxLevel ||
                    cProps.structureType !== props.structureType ||
                    cProps.isSelected !== props.isSelected ||
                    cProps.isPending !== props.isPending ||
                    cProps.isOccupied !== props.isOccupied ||
                    cProps.isGrowing !== props.isGrowing ||
                    cProps.isRankLocked !== props.isRankLocked ||
                    cProps.progress !== props.progress ||
                    cProps.durability !== props.durability ||
                    cProps.artifactType !== props.artifactType ||
                    cProps.poiType !== props.poiType ||
                    cProps.hologramTargetLevel !== props.hologramTargetLevel ||
                    cProps.isPassable !== props.isPassable ||
                    cProps.isRevealed !== props.isRevealed ||
                    cProps.lighting !== props.lighting ||
                    cProps.drawVoidWalls !== props.drawVoidWalls ||
                    cProps.costMoves !== costMoves ||
                    cProps.costCoins !== costCoins ||
                    cProps.gradientLockStatus !== gradientLockStatus;

                if (!isDirty) {
                    // Check array manually
                    for (let i = 0; i < 6; i++) {
                        if (cProps.neighborLevels[i] !== props.neighborLevels[i]) {
                            isDirty = true;
                            break;
                        }
                    }
                }

                if (!isDirty) {
                    return;
                }

                const rotatedBasePoints = BASE_POINTS.map(pt => ({
                    x: pt.x * cos - pt.y * sin,
                    y: pt.x * sin + pt.y * cos
                }));

                hexPropsCache.current.set(curContainer, {
                    rotation,
                    offsetY: props.offsetY,
                    level: props.level,
                    maxLevel: props.maxLevel,
                    structureType: props.structureType,
                    neighborLevels: [...props.neighborLevels],
                    isSelected: props.isSelected,
                    isPending: props.isPending,
                    isOccupied: props.isOccupied,
                    isGrowing: props.isGrowing,
                    isRankLocked: props.isRankLocked,
                    progress: props.progress,
                    durability: props.durability,
                    artifactType: props.artifactType,
                    poiType: props.poiType,
                    hologramTargetLevel: props.hologramTargetLevel,
                    isPassable: props.isPassable,
                    isRevealed: props.isRevealed,
                    lighting: props.lighting,
                    drawVoidWalls: props.drawVoidWalls,
                    costMoves,
                    costCoins,
                    gradientLockStatus,
                });

                // Graphics references
                let baseLayer = curContainer.getChildByName('base') as PIXI.Graphics;
                if (!baseLayer) {
                    baseLayer = new PIXI.Graphics();
                    baseLayer.name = 'base';
                    baseLayer.zIndex = 0;
                    curContainer.addChild(baseLayer);
                }

                baseLayer.clear();

                // Draw Scaffolding Guideline anchors below dry land
                if (!isRealVoid) {
                    rotatedBasePoints.forEach((pt) => {
                        const startY = pt.y * 0.8;
                        const endY = props.offsetY + pt.y * 0.8;
                        if (props.offsetY < -1) {
                            baseLayer.strokeStyle = { width: 0.8, color: 0x6366f1, alpha: 0.15 };
                            baseLayer.moveTo(pt.x, startY);
                            baseLayer.lineTo(pt.x, endY);
                            baseLayer.stroke();
                        }
                    });
                }

                let borderLayer = curContainer.getChildByName('border') as PIXI.Graphics;
                if (!borderLayer) {
                    borderLayer = new PIXI.Graphics();
                    borderLayer.name = 'border';
                    borderLayer.zIndex = 20;
                    curContainer.addChild(borderLayer);
                }
                borderLayer.clear();
                
                const faceY = props.offsetY;

                // borderLayer is already initialized and cleared above.

                // Drawing Side Strata layers
                if (isRealVoid && (props.drawVoidWalls !== false)) {
                    // Top black void face and solid red border
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => {
                        const px = pt.x;
                        const py = pt.y * 0.8 + faceY;
                        if (j === 0) borderLayer.moveTo(px, py);
                        else borderLayer.lineTo(px, py);
                    });
                    borderLayer.closePath();
                    borderLayer.fill({ color: 0x0a0a0a });

                    let voidFlickerNode = curContainer.getChildByName('voidFlicker') as PIXI.Graphics;
                    if (!voidFlickerNode) {
                        voidFlickerNode = new PIXI.Graphics();
                        voidFlickerNode.name = 'voidFlicker';
                        voidFlickerNode.zIndex = 15;
                        curContainer.addChild(voidFlickerNode);
                    }
                    voidFlickerNode.clear();
                    voidFlickerNode.beginPath();
                    rotatedBasePoints.forEach((pt, j) => {
                        const px = pt.x;
                        const py = pt.y * 0.8 + faceY;
                        if (j === 0) voidFlickerNode.moveTo(px, py);
                        else voidFlickerNode.lineTo(px, py);
                    });
                    voidFlickerNode.closePath();
                    voidFlickerNode.fill({ color: 0xef4444 });
                    voidFlickerNode.stroke({ width: 3.0, color: 0xef4444, alignment: 1.0 });

                    // Pulsing Round Red Glimmer on top
                    let voidCircleGlow = curContainer.getChildByName('voidCircleGlow') as PIXI.Graphics;
                    if (!voidCircleGlow) {
                        voidCircleGlow = new PIXI.Graphics();
                        voidCircleGlow.name = 'voidCircleGlow';
                        voidCircleGlow.zIndex = 16;
                        curContainer.addChild(voidCircleGlow);
                    }
                    voidCircleGlow.x = 0;
                    voidCircleGlow.y = faceY; // Positioned so scaling is around center
                    voidCircleGlow.clear();
                    
                    // Inner glowing circle (scaled ellipse for isometric projection)
                    voidCircleGlow.beginPath();
                    voidCircleGlow.ellipse(0, 0, 15, 12);
                    voidCircleGlow.fill({ color: 0xef4444, alpha: 0.85 });
                    
                    // Middle glowing circle
                    voidCircleGlow.beginPath();
                    voidCircleGlow.ellipse(0, 0, 28, 22.4);
                    voidCircleGlow.fill({ color: 0xef4444, alpha: 0.45 });
                    
                    // Outer glowing circle
                    voidCircleGlow.beginPath();
                    voidCircleGlow.ellipse(0, 0, 42, 33.6);
                    voidCircleGlow.fill({ color: 0xef4444, alpha: 0.20 });

                    // Circular outline
                    voidCircleGlow.beginPath();
                    voidCircleGlow.ellipse(0, 0, 32, 25.6);
                    voidCircleGlow.stroke({ width: 2.5, color: 0xff3b30, alpha: 0.95 });

                    // Draw Void boundaries (side walls)
                    for (let i = 0; i < 6; i++) {
                        const next = (i + 1) % 6;
                        const pt0 = rotatedBasePoints[i];
                        const pt1 = rotatedBasePoints[next];
                        
                        const isFrontFacing = (pt0.y + pt1.y) >= -0.01;

                        if (isFrontFacing) {
                            const VOID_DEPTH = MAX_WALL_DEPTH;
                            const x1 = pt0.x;
                            const y1 = pt0.y * 0.8 + faceY;
                            const x2 = pt1.x;
                            const y2 = pt1.y * 0.8 + faceY;

                            baseLayer.beginPath();
                            baseLayer.moveTo(x1, y1);
                            baseLayer.lineTo(x2, y2);
                            baseLayer.lineTo(x2, y2 + VOID_DEPTH);
                            baseLayer.lineTo(x1, y1 + VOID_DEPTH);
                            baseLayer.closePath();
                            baseLayer.fill({ color: 0x020617 });
                            baseLayer.strokeStyle = { width: 1.0, color: 0x1e293b };
                            baseLayer.stroke();
                        }
                    }
                } else if (!isRealVoid) {
                    // Standard height plate walls
                    for (let i = 0; i < 6; i++) {
                        const next = (i + 1) % 6;
                        const pt0 = rotatedBasePoints[i];
                        const pt1 = rotatedBasePoints[next];
                        
                        const isFrontFacing = (pt0.y + pt1.y) >= -0.01;

                        if (isFrontFacing) {
                            const nIndex = 5 - i;
                            const nLevel = props.neighborLevels[nIndex];

                            let nY = 0;
                            // VOID neighbor: cap the skirt to a short depth so an elevated
                            // hex over the abyss looks like a solid plateau, not a 200px thread.
                            if (nLevel === -99) nY = props.offsetY + VOID_SKIRT_DEPTH;
                            else nY = nLevel >= 0 ? -(10 + nLevel * 10) : Math.abs(nLevel + 1) * 10;

                            if (props.offsetY < nY) {
                                const heightDiff = nY - props.offsetY;
                                const x1 = pt0.x;
                                const y1 = pt0.y * 0.8 + props.offsetY;
                                const x2 = pt1.x;
                                const y2 = pt1.y * 0.8 + props.offsetY;

                                // Base wall face: dark fill for the full skirt.
                                baseLayer.beginPath();
                                baseLayer.moveTo(x1, y1);
                                baseLayer.lineTo(x2, y2);
                                baseLayer.lineTo(x2, y2 + heightDiff);
                                baseLayer.lineTo(x1, y1 + heightDiff);
                                baseLayer.closePath();
                                baseLayer.fill({ color: PIXI.Color.shared.setValue(theme.dark).toNumber() });

                                // Top highlight band: a slightly-lighter quad over the top ~40%
                                // of the skirt gives a subtle top-lit 3D shade (lighter near the
                                // top edge, darker toward the bottom) so the face reads against the
                                // dark background. Alpha-only here so it does not fight the
                                // container-level fade applied elsewhere via curContainer.alpha.
                                const bandDepth = heightDiff * 0.4;
                                baseLayer.beginPath();
                                baseLayer.moveTo(x1, y1);
                                baseLayer.lineTo(x2, y2);
                                baseLayer.lineTo(x2, y2 + bandDepth);
                                baseLayer.lineTo(x1, y1 + bandDepth);
                                baseLayer.closePath();
                                baseLayer.fill({ color: PIXI.Color.shared.setValue(theme.main).toNumber(), alpha: 0.25 });

                                baseLayer.strokeStyle = { width: 1.5, color: PIXI.Color.shared.setValue(theme.stroke).toNumber() };
                                baseLayer.beginPath();
                                baseLayer.moveTo(x1, y1);
                                baseLayer.lineTo(x2, y2);
                                baseLayer.lineTo(x2, y2 + heightDiff);
                                baseLayer.lineTo(x1, y1 + heightDiff);
                                baseLayer.closePath();
                                baseLayer.stroke();
                            }
                        }
                    }
                }

                // Draw Top Face Polygon
                let faceContainer = curContainer.getChildByName('faceContainer') as PIXI.Container;
                if (!isRealVoid) {
                    const topCanvas = textureService.getTexture(props.level, props.q, props.r, undefined);
                    const tex = getPixiTexture(topCanvas);

                    if (!faceContainer) {
                        faceContainer = new PIXI.Container();
                        faceContainer.name = 'faceContainer';
                        faceContainer.zIndex = 10;
                        curContainer.addChild(faceContainer); 
                        
                        const sprite = new PIXI.Sprite(tex);
                        sprite.name = 'faceSprite';
                        sprite.anchor.set(0.5, 0.5);
                        faceContainer.addChild(sprite);
                    }
                    
                    const faceSprite = faceContainer.getChildByName('faceSprite') as PIXI.Sprite;
                    faceSprite.texture = tex;
                    
                    const angleRad = rotation * (Math.PI / 180);
                    faceSprite.rotation = angleRad;
                    
                    const scaleX = HEX_SIZE / 32;
                    const scaleY = (HEX_SIZE * 0.8) / 32;
                    faceContainer.scale.set(scaleX, scaleY);
                    faceContainer.y = props.offsetY;
                    faceContainer.visible = true;
                    
                    // Cleanup old facePoly if it exists from previous version
                    const oldFacePoly = curContainer.getChildByName('facePoly');
                    if (oldFacePoly) {
                        curContainer.removeChild(oldFacePoly);
                        oldFacePoly.destroy();
                    }

                    // L1 Hex Durability Damage Render
                    if (props.level === 1 && props.durability !== undefined && props.durability < 6 && isRevealed) {
                        let damageLayer = curContainer.getChildByName('damageLayer') as PIXI.Graphics;
                        if (!damageLayer) {
                            damageLayer = new PIXI.Graphics();
                            damageLayer.name = 'damageLayer';
                            damageLayer.zIndex = 11;
                            curContainer.addChild(damageLayer);
                        }
                        damageLayer.clear();
                        
                        const isCritical = props.durability <= 2;
                        
                        // Inner warning glow / shading
                        damageLayer.beginPath();
                        rotatedBasePoints.forEach((pt, j) => {
                            const px = pt.x;
                            const py = pt.y * 0.8 + props.offsetY;
                            if (j === 0) damageLayer.moveTo(px, py);
                            else damageLayer.lineTo(px, py);
                        });
                        damageLayer.closePath();
                        
                        damageLayer.stroke({ 
                            width: isCritical ? 3 : 2, 
                            color: isCritical ? 0xef4444 : 0xf59e0b, 
                            alpha: 0.8 
                        });
                        
                        if (isCritical) {
                            damageLayer.fill({ color: 0xef4444, alpha: 0.25 });
                            
                            // High frequency blink/pulse for critical warning
                            damageLayer.alpha = 0.6 + 0.4 * Math.sin(Date.now() / 150);
                            
                            // Draw a small yellow/orange warning triangle at the center of the face
                            const ty = props.offsetY - 5;
                            damageLayer.beginPath();
                            damageLayer.moveTo(0, ty - 8);
                            damageLayer.lineTo(8, ty + 6);
                            damageLayer.lineTo(-8, ty + 6);
                            damageLayer.closePath();
                            damageLayer.fill({ color: 0xeab308 }); // yellow triangle
                            damageLayer.stroke({ width: 1.5, color: 0x000000 });
                            
                            // Draw the exclamation mark inside the triangle
                            damageLayer.beginPath();
                            damageLayer.moveTo(0, ty - 4);
                            damageLayer.lineTo(0, ty + 1);
                            damageLayer.stroke({ width: 2, color: 0x000000 });
                            
                            damageLayer.beginPath();
                            damageLayer.ellipse(0, ty + 4, 1, 1);
                            damageLayer.fill({ color: 0x000000 });
                        }
                        
                        // Pseudo-random static procedural cracks
                        const prng = (s: number) => {
                            const x = Math.sin((props.q + 1) * 12.9898 + (props.r + 1) * 78.233 + s) * 43758.5453;
                            return x - Math.floor(x);
                        };

                        damageLayer.beginPath();
                        const numCracks = Math.min(5, 7 - props.durability); // e.g. 5 durability shows 2 cracks
                        for (let i = 0; i < numCracks; i++) {
                            const cx = (prng(i) - 0.5) * 12;
                            const cy = (prng(i + 10) - 0.5) * 12 + props.offsetY;
                            damageLayer.moveTo(cx, cy);
                            
                            const angle = prng(i + 20) * Math.PI * 2;
                            const dist = 10 + prng(i + 30) * 15;
                            const endX = cx + Math.cos(angle) * dist;
                            const endY = cy + Math.sin(angle) * dist * 0.8;
                            damageLayer.lineTo(endX, endY);
                            
                            if (prng(i + 40) > 0.4) {
                                const angle2 = angle + (prng(i + 50) > 0.5 ? 0.7 : -0.7);
                                const dist2 = 8 + prng(i + 60) * 8;
                                damageLayer.lineTo(endX + Math.cos(angle2) * dist2, 
                                                   endY + Math.sin(angle2) * dist2 * 0.8);
                            }
                        }
                        damageLayer.stroke({ width: 1.5, color: 0x450a0a, alpha: 0.9, join: 'round', cap: 'round' });
                        
                    } else {
                        const damageLayer = curContainer.getChildByName('damageLayer') as PIXI.Graphics;
                        if (damageLayer) damageLayer.clear();
                    }

                    // L4+ High-level Hex Cooldown and Recovery Charge indicators
                    if (props.level >= 4 && isRevealed) {
                        let recoveryOverlay = curContainer.getChildByName('recoveryOverlay') as PIXI.Graphics;
                        if (!recoveryOverlay) {
                            recoveryOverlay = new PIXI.Graphics();
                            recoveryOverlay.name = 'recoveryOverlay';
                            recoveryOverlay.zIndex = 14;
                            curContainer.addChild(recoveryOverlay);
                        }
                        recoveryOverlay.clear();

                        const now = Date.now();
                        const isOnCooldown = hex.cooldownEndTime && now < hex.cooldownEndTime;

                        const cy = props.offsetY - 2; // Slightly above face level
                        if (isOnCooldown) {
                            // Cooldown state: draw a dull crimson overlay ring
                            recoveryOverlay.beginPath();
                            recoveryOverlay.ellipse(0, cy, 18, 14.4);
                            recoveryOverlay.fill({ color: 0xef4444, alpha: 0.15 });
                            recoveryOverlay.stroke({ width: 2, color: 0xef4444, alpha: 0.7 });

                            // Draw a small warning/overheat cooling core
                            recoveryOverlay.beginPath();
                            recoveryOverlay.ellipse(0, cy, 6, 4.8);
                            recoveryOverlay.fill({ color: 0xf43f5e, alpha: 0.6 });
                        } else {
                            // Healthy state: keep empty as requested to remove the 3 dots and ambient ring
                        }
                    } else {
                        const rOverlay = curContainer.getChildByName('recoveryOverlay');
                        if (rOverlay) {
                            curContainer.removeChild(rOverlay).destroy();
                        }
                    }
                } else {
                    if (faceContainer) faceContainer.visible = false;
                    const voidFlickerNode = curContainer.getChildByName('voidFlicker');
                    if (voidFlickerNode && !isRealVoid) curContainer.removeChild(voidFlickerNode).destroy();
                    const voidCircleGlow = curContainer.getChildByName('voidCircleGlow');
                    if (voidCircleGlow && !isRealVoid) curContainer.removeChild(voidCircleGlow).destroy();
                    const rOverlay = curContainer.getChildByName('recoveryOverlay');
                    if (rOverlay) curContainer.removeChild(rOverlay).destroy();
                }

                // borderLayer already grabbed

                // Draws outer hexagonal outline of unrevealed cells
                if (!isRevealed) {
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => {
                        const px = pt.x;
                        const py = pt.y * 0.8 + faceY;
                        if (j === 0) borderLayer.moveTo(px, py);
                        else borderLayer.lineTo(px, py);
                    });
                    borderLayer.closePath();
                    borderLayer.fill({ color: 0x111827 });
                    borderLayer.strokeStyle = { width: 4.0, color: 0x374151, alpha: 0.1 };
                    borderLayer.stroke();
                }

                // Portal spinning neon particle ring
                if (props.structureType === 'PORTAL' || (hex.biome as string) === 'BIOME_PORTAL') {
                    let portalNode = curContainer.getChildByName('portal') as PIXI.Graphics;
                    if (!portalNode) {
                        portalNode = new PIXI.Graphics();
                        portalNode.name = 'portal';
                        curContainer.addChild(portalNode);
                    }
                    portalNode.clear();
                    portalNode.y = faceY;
                    portalNode.scale.set(1.0, 0.8);
                    portalNode.strokeStyle = { width: 2.0, color: 0xd946ef };
                    portalNode.beginPath();
                    portalNode.ellipse(0, 0, HEX_SIZE * 0.7, HEX_SIZE * 0.4);
                    portalNode.stroke();
                } else {
                     const pNode = curContainer.getChildByName('portal');
                     if (pNode) curContainer.removeChild(pNode).destroy();
                }

                // Hover highlight: a dedicated child whose visibility the ticker flips every
                // frame (instant feedback). Geometry is rebuilt here so it stays rotation-correct.
                let hoverOutline = curContainer.getChildByName('hoverOutline') as PIXI.Graphics;
                if (!hoverOutline) {
                    hoverOutline = new PIXI.Graphics();
                    hoverOutline.name = 'hoverOutline';
                    hoverOutline.zIndex = 12;
                    curContainer.addChild(hoverOutline);
                }
                hoverOutline.clear();
                hoverOutline.beginPath();
                rotatedBasePoints.forEach((pt, j) => {
                    const px = pt.x;
                    const py = pt.y * 0.8 + faceY;
                    if (j === 0) hoverOutline.moveTo(px, py);
                    else hoverOutline.lineTo(px, py);
                });
                hoverOutline.closePath();
                hoverOutline.fill({ color: 0xffffff, alpha: 0.16 });
                hoverOutline.strokeStyle = { width: 3.0, color: 0xffffff, alpha: 1.0 };
                hoverOutline.stroke();
                hoverOutline.visible = (hoveredHexId === item.id);

                // Highlight Selected targets
                if (props.isSelected) {
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => {
                        const px = pt.x;
                        const py = pt.y * 0.8 + faceY;
                        if (j === 0) borderLayer.moveTo(px, py);
                        else borderLayer.lineTo(px, py);
                    });
                    borderLayer.closePath();
                    borderLayer.strokeStyle = { width: 3.0, color: 0x22d3ee };
                    borderLayer.stroke();
                }

                // Progress loader ring for constructions
                if (props.isGrowing) {
                    let needed = 30; // default/fallback
                    const hq = props.q;
                    const hr = props.r;

                    const actingEntity = (player && player.q === hq && player.r === hr)
                        ? player
                        : bots?.find((b: any) => b.q === hq && b.r === hr);

                    if (actingEntity) {
                        let intent: 'UPGRADE' | 'RECOVER' | 'DIG' | 'TURRET' | null = null;
                        if (actingEntity.type === 'PLAYER') {
                            intent = playerGrowthIntent || null;
                        } else {
                            const nextInQueue = actingEntity.movementQueue?.[0];
                            if (nextInQueue && nextInQueue.intent) {
                                intent = nextInQueue.intent;
                            } else if (actingEntity.memory?.plan?.steps?.[0]?.type) {
                                const stepType = actingEntity.memory.plan.steps[0].type;
                                if (stepType === 'UPGRADE') intent = 'UPGRADE';
                                else if (stepType === 'DIG') intent = 'DIG';
                                else if (stepType === 'RECOVER') intent = 'RECOVER';
                            }
                        }

                        if (intent) {
                            const activeStatuses = actingEntity.activeStatuses || [];
                            const hasScannerBuff = activeStatuses.some((s: any) => s.type === 'STATUS_SCANNER_BUFF');
                            const hasGodMode = activeStatuses.some((s: any) => s.type === 'GOD_MODE');
                            const growthAccelerator = hasGodMode ? 10 : (hasScannerBuff ? 2 : 0);

                            if (intent === 'RECOVER') {
                                const config = getLevelConfig(props.maxLevel);
                                needed = config.growthTime;
                            } else if (intent === 'DIG') {
                                needed = Math.max(10, 30 - (growthAccelerator * 5));
                            } else if (intent === 'UPGRADE') {
                                const config = getLevelConfig(props.level + 1);
                                needed = Math.max(10, config.growthTime - (growthAccelerator * 5));
                            } else if (intent === 'TURRET') {
                                needed = 40;
                            }
                        }
                    }

                    const normalizedProgress = Math.min(1.0, props.progress / needed);

                    // Gray/dark background ring
                    borderLayer.strokeStyle = { width: 3.0, color: 0x374151, alpha: 0.5 };
                    borderLayer.beginPath();
                    borderLayer.arc(0, faceY, HEX_SIZE * 0.4, 0, Math.PI * 2);
                    borderLayer.stroke();

                    // Amber growing ring starting from top (-Math.PI/2) and wrapping clockwise
                    borderLayer.strokeStyle = { width: 3.5, color: 0xf59e0b, alpha: 0.9 };
                    borderLayer.beginPath();
                    borderLayer.arc(0, faceY, HEX_SIZE * 0.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * normalizedProgress);
                    borderLayer.stroke();
                }

                // Campaign completed shape highlights
                const isCompletedShapeHex = completedShapeCoords.some(c => c.q === props.q && c.r === props.r);
                if (isCompletedShapeHex) {
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => {
                        const px = pt.x;
                        const py = pt.y * 0.8 + faceY;
                        if (j === 0) borderLayer.moveTo(px, py);
                        else borderLayer.lineTo(px, py);
                    });
                    borderLayer.closePath();
                    borderLayer.strokeStyle = { width: 4.0, color: 0x10b981, alpha: 0.7 };
                    borderLayer.stroke();
                }

                // Holographic Blueprint projection overlay (Step 3)
                if (props.hologramTargetLevel !== undefined && activatedMiniMonuments?.length === 3) {
                    // Flash cyan or blue depending on if it is fully assembled or just blueprint
                    const isConstructed = props.level >= props.hologramTargetLevel;
                    const holoColor = isConstructed ? 0x22d3ee : 0x4f46e5; // Cyan full, Indigo outline
                    // Draw outer hologram wireframe
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => {
                        const px = pt.x * 0.9;
                        const py = (pt.y * 0.8 + faceY) * 0.9;
                        if (j === 0) borderLayer.moveTo(px, py);
                        else borderLayer.lineTo(px, py);
                    });
                    borderLayer.closePath();
                    borderLayer.strokeStyle = { width: 2.0, color: holoColor, alpha: 0.8 };
                    borderLayer.stroke();

                    // Optional Text Label indicating the TargetLvl
                    if (!isConstructed) {
                         let holoTextLayer = curContainer.getChildByName('holoText') as PIXI.Text;
                         if (!holoTextLayer) {
                             holoTextLayer = new PIXI.Text({
                                text: `[L${props.hologramTargetLevel}]`,
                                style: { fontFamily: 'monospace', fontSize: 14, fill: 0x4f46e5, fontWeight: 'bold' }
                             });
                             holoTextLayer.name = 'holoText';
                             holoTextLayer.anchor.set(0.5, 0.5);
                             holoTextLayer.y = faceY - 15;
                             holoTextLayer.zIndex = 15;
                             curContainer.addChild(holoTextLayer);
                         } else {
                             holoTextLayer.text = `[L${props.hologramTargetLevel}]`;
                             holoTextLayer.y = faceY - 15;
                             holoTextLayer.visible = true;
                         }
                    } else {
                         const hText = curContainer.getChildByName('holoText');
                         if (hText) hText.visible = false;
                    }
                } else {
                     const hText = curContainer.getChildByName('holoText');
                     if (hText) hText.visible = false;
                }

                // Draw POI or Special structure Emojis
                let emojiLayer = curContainer.getChildByName('emoji') as PIXI.Text;
                const isFinish = isFinishTile(props.q, props.r, activeLevelConfig);
                const isSpecialStructure = !isFinish && (props.structureType === 'MONUMENT' || props.structureType === 'MINI_MONUMENT' || props.structureType === 'CORE' || props.structureType === 'TURRET' || props.structureType === 'CAPITAL' || props.isCore || props.isMiniMonument || props.isTurret);
                if (isRevealed && !isFinish && (props.poiType || isSpecialStructure)) {
                    let icon = '';
                    let colorVal = '#ffffff';
                    if (props.structureType === 'MONUMENT') {
                        icon = '★';
                        colorVal = '#f59e0b'; // Amber star
                    } else if (props.structureType === 'CAPITAL') {
                        icon = '🌌';
                        colorVal = '#10b981'; // Emerald
                    } else if (props.structureType === 'MINI_MONUMENT' || props.isMiniMonument) {
                        const isA = props.isActivated || (activatedMiniMonuments && activatedMiniMonuments.includes(`${props.q},${props.r}`));
                        icon = isA ? '▲' : '△'; // filled vs empty triangle
                        colorVal = isA ? '#22d3ee' : '#64748b'; // cyan vs slate
                    } else if (props.structureType === 'CORE' || props.isCore) {
                        icon = '⎔'; // Hex Nucleus Core
                        colorVal = '#ec4899'; // Pink
                    } else if (props.structureType === 'TURRET' || props.isTurret) {
                        icon = '⌖'; // Target Reticle / Turret
                        colorVal = '#a855f7'; // Purple
                    } else {
                        icon = getPoiIcon(props.poiType || '');
                        colorVal = '#ffffff';
                    }
                    if (!emojiLayer) {
                        emojiLayer = new PIXI.Text({
                            text: icon,
                            style: {
                                fontSize: 18,
                                align: 'center',
                                fill: colorVal,
                                fontWeight: 'bold'
                            }
                        });
                        emojiLayer.name = 'emoji';
                        emojiLayer.zIndex = 30;
                        emojiLayer.anchor.set(0.5, 0.5);
                        curContainer.addChild(emojiLayer);
                    }
                    emojiLayer.text = icon;
                    if (emojiLayer.style) {
                        emojiLayer.style.fill = colorVal;
                    }
                    emojiLayer.y = faceY - 5;
                    emojiLayer.visible = true;
                } else {
                    if (emojiLayer) emojiLayer.visible = false;
                }

                // Render dynamic campaign objective arrows/indicators
                const firstIncompleteObjHex = activeLevelConfig?.objectiveHexes?.find((o: any) => !isObjectiveHexCompleted(
                    o,
                    grid,
                    player,
                    activeLevelConfig?.id,
                    activatedMiniMonuments,
                    portalActive
                ));
                
                const objHex = activeLevelConfig?.objectiveHexes?.find((o: any) => o.q === props.q && o.r === props.r);
                const showArrow = objHex && objHex === firstIncompleteObjHex;
                
                if (showArrow && isRevealed) {
                    let objArrow = curContainer.getChildByName('objective_arrow') as PIXI.Container;
                    if (!objArrow) {
                        objArrow = new PIXI.Container();
                        objArrow.name = 'objective_arrow';
                        objArrow.zIndex = 40;
                        curContainer.addChild(objArrow);

                        if (objHex.color === 'emerald') {
                            const txt = new PIXI.Text({
                                text: '👑',
                                style: {
                                    fontSize: 24,
                                    align: 'center',
                                }
                            });
                            txt.name = 'arrow_art';
                            txt.anchor.set(0.5, 0.5);
                            objArrow.addChild(txt);
                        } else {
                            const arrowGraphic = new PIXI.Graphics();
                            arrowGraphic.name = 'arrow_art';
                            
                            const arrowColor = objHex.color === 'amber' ? 0xf59e0b :
                                               objHex.color === 'cyan' ? 0x06b6d4 :
                                               objHex.color === 'red' ? 0xef4444 : 0x10b981;
                            const arrowDarkColor = objHex.color === 'amber' ? 0xb45309 :
                                                   objHex.color === 'cyan' ? 0x0891b2 :
                                                   objHex.color === 'red' ? 0xb91c1c : 0x059669;

                            // Soft glow halo behind the arrow so the "act here" target reads at a glance.
                            const glow = new PIXI.Graphics();
                            glow.name = 'arrow_glow';
                            glow.circle(0, -8, 22);
                            glow.fill({ color: arrowColor, alpha: 0.18 });
                            objArrow.addChild(glow);

                            const drawArrowPath = (g: PIXI.Graphics, dy: number) => {
                                g.beginPath();
                                g.moveTo(-10, -25 + dy);
                                g.lineTo(10, -25 + dy);
                                g.lineTo(10, -10 + dy);
                                g.lineTo(18, -10 + dy);
                                g.lineTo(0, 8 + dy);
                                g.lineTo(-18, -10 + dy);
                                g.lineTo(-10, -10 + dy);
                                g.closePath();
                            };

                            // Draw bottom/shadow layer for 3D effect
                            drawArrowPath(arrowGraphic, 4);
                            arrowGraphic.fill({ color: arrowDarkColor });
                            arrowGraphic.stroke({ width: 1.5, color: 0x000000, alpha: 0.8, alignment: 1 });

                            // Draw top layer
                            drawArrowPath(arrowGraphic, 0);
                            arrowGraphic.fill({ color: arrowColor });
                            arrowGraphic.stroke({ width: 1.5, color: 0x000000, alpha: 0.6, alignment: 1 });

                            objArrow.addChild(arrowGraphic);
                        }

                        if (objHex.label) {
                            const lbl = new PIXI.Text({
                                text: objHex.label,
                                style: {
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: 11,
                                    fontWeight: 'bold',
                                    fill: 0xffffff,
                                    stroke: { color: 0x000000, width: 3 },
                                    align: 'center'
                                }
                            });
                            lbl.name = 'arrow_label';
                            lbl.anchor.set(0.5, 1.0);
                            lbl.y = -28;
                            objArrow.addChild(lbl);
                        }
                    }

                    objArrow.visible = true;
                    const bounceAmt = Math.sin(Date.now() * 0.007) * 8;
                    objArrow.y = faceY - 35 + Math.min(0, bounceAmt);
                    // Gentle glow pulse so the marker shimmers (the requested "мерцание").
                    const glowChild = objArrow.getChildByName('arrow_glow');
                    if (glowChild) glowChild.alpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.35;
                } else {
                    const existingArrow = curContainer.getChildByName('objective_arrow');
                    if (existingArrow) {
                        existingArrow.visible = false;
                    }
                }

                // --- PERSISTENT FINISH BEACON ---
                if (isFinish && isRevealed) {
                    let finishBeacon = curContainer.getChildByName('finish_beacon') as PIXI.Container;
                    if (!finishBeacon) {
                        finishBeacon = new PIXI.Container();
                        finishBeacon.name = 'finish_beacon';
                        finishBeacon.zIndex = 38;
                        curContainer.addChild(finishBeacon);

                        // Draw a vertical beacon beam (a cone/cylinder of light)
                        const beam = new PIXI.Graphics();
                        beam.name = 'beam';
                        finishBeacon.addChild(beam);

                        // Draw a base glow ellipse
                        const baseGlow = new PIXI.Graphics();
                        baseGlow.name = 'baseGlow';
                        finishBeacon.addChild(baseGlow);
                    }

                    finishBeacon.visible = true;

                    // Update positions
                    const beam = finishBeacon.getChildByName('beam') as PIXI.Graphics;
                    const baseGlow = finishBeacon.getChildByName('baseGlow') as PIXI.Graphics;

                    if (beam) {
                        beam.clear();
                        // Cone pointing down to faceY from the very top of the sky (1200px up)
                        // It narrows at the top and expands at the bottom (hex), staying within its bounds
                        const beamHeight = 1200;
                        const pulse = Math.sin(Date.now() * 0.005) * 0.12 + 0.88; // shimmering scale
                        const beamWidthTop = 4 * pulse;
                        const beamWidthBottom = 26 * pulse;

                        // Outer soft glowing white/cyan cone
                        beam.beginPath();
                        beam.moveTo(-beamWidthTop, faceY - beamHeight);
                        beam.lineTo(beamWidthTop, faceY - beamHeight);
                        beam.lineTo(beamWidthBottom, faceY);
                        beam.lineTo(-beamWidthBottom, faceY);
                        beam.closePath();
                        beam.fill({ color: 0xffffff, alpha: 0.22 * pulse });
                        beam.stroke({ width: 1.5, color: 0xffffff, alpha: 0.4 * pulse });

                        // Inner super bright core cone
                        const coreWidthTop = beamWidthTop * 0.4;
                        const coreWidthBottom = beamWidthBottom * 0.4;
                        beam.beginPath();
                        beam.moveTo(-coreWidthTop, faceY - beamHeight);
                        beam.lineTo(coreWidthTop, faceY - beamHeight);
                        beam.lineTo(coreWidthBottom, faceY);
                        beam.lineTo(-coreWidthBottom, faceY);
                        beam.closePath();
                        beam.fill({ color: 0xf0fdf4, alpha: 0.45 * pulse }); // warm white/emerald shine
                    }

                    if (baseGlow) {
                        baseGlow.clear();
                        const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 1.0;
                        baseGlow.ellipse(0, faceY, 26 * pulse, 15 * pulse);
                        baseGlow.fill({ color: 0xffffff, alpha: 0.4 });
                        baseGlow.ellipse(0, faceY, 13 * pulse, 7.5 * pulse);
                        baseGlow.fill({ color: 0xa7f3d0, alpha: 0.6 }); // Emerald light core
                    }
                } else {
                    const existingBeacon = curContainer.getChildByName('finish_beacon');
                    if (existingBeacon) {
                        existingBeacon.visible = false;
                    }
                }

                // Custom DIG arrows/indicators for 1.5 and 1.6
                const activeLevelId = activeLevelConfig?.id;
                let showDigArrow = false;
                let digLabel = '';

                if (activeLevelId === '1.5' && isRevealed) {
                    const voidHex = grid['1,-1'];
                    const centerHex = grid['0,0'];
                    const isVoidHealed = voidHex && voidHex.structureType !== 'VOID';
                    
                    if (isVoidHealed) {
                        const minedNeighbors = [grid['1,-1'], grid['0,1'], grid['-1,0'], grid['0,-1'], grid['1,0'], grid['-1,1']].filter(h => h && h.currentLevel <= -1);
                        if (minedNeighbors.length < 2) {
                            const isNeighbor = ['1,-1', '0,1', '-1,0', '0,-1', '1,0', '-1,1'].includes(`${props.q},${props.r}`);
                            const currentHex = grid[`${props.q},${props.r}`];
                            if (isNeighbor && currentHex && currentHex.currentLevel > -1) {
                                showDigArrow = true;
                                digLabel = 'DIG';
                            }
                        } else {
                            if (props.q === 0 && props.r === 0 && centerHex && centerHex.currentLevel > -2) {
                                showDigArrow = true;
                                digLabel = 'DIG x2';
                            }
                        }
                    }
                } else if (activeLevelId === '1.6' && isRevealed) {
                    const void1Healed = grid['2,0']?.structureType !== 'VOID';
                    const void2Healed = grid['6,0']?.structureType !== 'VOID';
                    const hasPatch = player?.inventory?.some((i: any) => i.baseId === 'reality_patch');
                    
                    if (!void1Healed) {
                        if (!hasPatch && props.q === 0 && props.r === 0) {
                            const hexNode = grid['0,0'];
                            if (hexNode && hexNode.currentLevel > -2) {
                                showDigArrow = true;
                                digLabel = 'DIG x2';
                            }
                        }
                    } else if (!void2Healed) {
                        if (!hasPatch && props.q === 4 && props.r === 0) {
                            const hexNode = grid['4,0'];
                            if (hexNode && hexNode.currentLevel > -2) {
                                showDigArrow = true;
                                digLabel = 'DIG x2';
                            }
                        }
                    }
                }

                if (showDigArrow && isRevealed) {
                    let digArrow = curContainer.getChildByName('dig_arrow') as PIXI.Container;
                    if (!digArrow) {
                        digArrow = new PIXI.Container();
                        digArrow.name = 'dig_arrow';
                        digArrow.zIndex = 39; // Just below main objective arrow
                        curContainer.addChild(digArrow);

                        const arrowGraphic = new PIXI.Graphics();
                        arrowGraphic.name = 'dig_arrow_art';
                        
                        const arrowColor = 0xef4444; // Red for DIG/EXCAVATION
                        const arrowDarkColor = 0x991b1b;

                        // Soft glow halo
                        const glow = new PIXI.Graphics();
                        glow.name = 'dig_arrow_glow';
                        glow.circle(0, -8, 20);
                        glow.fill({ color: arrowColor, alpha: 0.22 });
                        digArrow.addChild(glow);

                        const drawArrowPath = (g: PIXI.Graphics, dy: number) => {
                            g.beginPath();
                            g.moveTo(-8, -22 + dy);
                            g.lineTo(8, -22 + dy);
                            g.lineTo(8, -9 + dy);
                            g.lineTo(14, -9 + dy);
                            g.lineTo(0, 6 + dy);
                            g.lineTo(-14, -9 + dy);
                            g.lineTo(-8, -9 + dy);
                            g.lineTo(-8, -22 + dy);
                            g.closePath();
                        };

                        // Draw bottom/shadow layer for 3D effect
                        drawArrowPath(arrowGraphic, 3);
                        arrowGraphic.fill({ color: arrowDarkColor });
                        arrowGraphic.stroke({ width: 1.2, color: 0x000000, alpha: 0.8, alignment: 1 });

                        // Draw top layer
                        drawArrowPath(arrowGraphic, 0);
                        arrowGraphic.fill({ color: arrowColor });
                        arrowGraphic.stroke({ width: 1.2, color: 0x000000, alpha: 0.6, alignment: 1 });

                        digArrow.addChild(arrowGraphic);

                        if (digLabel) {
                            const lbl = new PIXI.Text({
                                text: digLabel,
                                style: {
                                    fontFamily: 'Inter, sans-serif',
                                    fontSize: 10,
                                    fontWeight: 'bold',
                                    fill: 0xffffff,
                                    stroke: { color: 0x000000, width: 2.5 },
                                    align: 'center'
                                }
                            });
                            lbl.name = 'dig_arrow_label';
                            lbl.anchor.set(0.5, 1.0);
                            lbl.y = -24;
                            digArrow.addChild(lbl);
                        }
                    }

                    digArrow.visible = true;
                    // Offset phase slightly from objective arrow so they bounce independently/beautifully!
                    const bounceAmt = Math.sin(Date.now() * 0.008 + props.q) * 6;
                    digArrow.y = faceY - 32 + Math.min(0, bounceAmt);
                    
                    const glowChild = digArrow.getChildByName('dig_arrow_glow');
                    if (glowChild) glowChild.alpha = 0.4 + Math.sin(Date.now() * 0.006 + props.r) * 0.25;
                } else {
                    const existingDigArrow = curContainer.getChildByName('dig_arrow');
                    if (existingDigArrow) {
                        existingDigArrow.visible = false;
                    }
                }

                // --- GRADIENT LOCK VISUAL AIDS ---
                const playerHex = player && grid ? grid[getHexKey(player.q, player.r)] : null;
                const playerHeightLevel = playerHex ? (playerHex.currentLevel ?? 0) : 0;

                const isNeighborOfPlayer = player && cubeDistance(player, props) === 1;
                const isBlockingNeighbor = isNeighborOfPlayer && recentGradientLock && grid && (props.level >= playerHeightLevel);
                
                let gradientWarningOverlay = curContainer.getChildByName('gradient_warning') as PIXI.Graphics;
                if (isBlockingNeighbor && isRevealed) {
                    if (!gradientWarningOverlay) {
                        gradientWarningOverlay = new PIXI.Graphics();
                        gradientWarningOverlay.name = 'gradient_warning';
                        gradientWarningOverlay.zIndex = 35;
                        curContainer.addChild(gradientWarningOverlay);
                    }
                    gradientWarningOverlay.clear();
                    const alphaPulse = 0.4 + 0.3 * Math.sin(Date.now() / 100);
                    gradientWarningOverlay.beginPath();
                    rotatedBasePoints.forEach((pt, j) => {
                        const px = pt.x;
                        const py = pt.y * 0.8 + props.offsetY;
                        if (j === 0) gradientWarningOverlay.moveTo(px, py);
                        else gradientWarningOverlay.lineTo(px, py);
                    });
                    gradientWarningOverlay.closePath();
                    gradientWarningOverlay.stroke({ width: 3, color: 0xef4444, alpha: alphaPulse });
                    gradientWarningOverlay.fill({ color: 0xef4444, alpha: alphaPulse * 0.4 });
                } else {
                    if (gradientWarningOverlay) {
                        curContainer.removeChild(gradientWarningOverlay).destroy();
                    }
                }

                const isPlayerHex = player && player.q === props.q && player.r === props.r;
                let gradientArrows = curContainer.getChildByName('gradient_arrows') as PIXI.Graphics;
                
                if (isPlayerHex && recentGradientLock && isRevealed && grid) {
                    if (!gradientArrows) {
                        gradientArrows = new PIXI.Graphics();
                        gradientArrows.name = 'gradient_arrows';
                        gradientArrows.zIndex = 38;
                        curContainer.addChild(gradientArrows);
                    }
                    gradientArrows.clear();
                    
                    NEIGHBOR_DIRECTIONS.forEach(dir => {
                        const nQ = props.q + dir.q;
                        const nR = props.r + dir.r;
                        const nHex = grid[getHexKey(nQ, nR)];
                        if (nHex && nHex.structureType !== 'VOID' && (nHex.currentLevel ?? 0) >= playerHeightLevel) {
                            const nPx = simpleHexToPixel(nQ, nR);
                            const curPx = simpleHexToPixel(props.q, props.r);
                            const dx = nPx.x - curPx.x;
                            const nOffsetY = -((nHex.currentLevel ?? 0) * 8);
                            const dy = (nPx.y - curPx.y) + (nOffsetY - props.offsetY);
                            
                            gradientArrows.beginPath();
                            gradientArrows.moveTo(0, props.offsetY);
                            const arrowLengthFactor = 0.65;
                            const targetX = dx * arrowLengthFactor;
                            const targetY = props.offsetY + dy * arrowLengthFactor;
                            
                            gradientArrows.lineTo(targetX, targetY);
                            gradientArrows.stroke({ width: 3.5, color: 0xef4444, alpha: 0.8 });
                            
                            const angle = Math.atan2(dy, dx);
                            const headSize = 7;
                            gradientArrows.beginPath();
                            gradientArrows.moveTo(targetX, targetY);
                            gradientArrows.lineTo(
                                targetX - headSize * Math.cos(angle - Math.PI / 6),
                                targetY - headSize * Math.sin(angle - Math.PI / 6)
                            );
                            gradientArrows.lineTo(
                                targetX - headSize * Math.cos(angle + Math.PI / 6),
                                targetY - headSize * Math.sin(angle + Math.PI / 6)
                            );
                            gradientArrows.closePath();
                            gradientArrows.fill({ color: 0xef4444, alpha: 0.9 });
                        }
                    });
                } else {
                    if (gradientArrows) {
                        curContainer.removeChild(gradientArrows).destroy();
                    }
                }

                // --- RADAR PULSE FOR MINI-MONUMENTS (OBELISKS) ---
                const isMiniMonument = props.structureType === 'MINI_MONUMENT' || props.isMiniMonument;
                let miniMonumentPulse = curContainer.getChildByName('mini_monument_pulse') as PIXI.Graphics;
                
                if (isMiniMonument && isRevealed) {
                    if (!miniMonumentPulse) {
                        miniMonumentPulse = new PIXI.Graphics();
                        miniMonumentPulse.name = 'mini_monument_pulse';
                        miniMonumentPulse.zIndex = 5;
                        curContainer.addChild(miniMonumentPulse);
                    }
                    miniMonumentPulse.clear();
                    
                    const t = (Date.now() / 2000) % 1.0;
                    const maxRadius = HEX_SIZE * 3.0;
                    const curRadius = HEX_SIZE * 0.8 + (maxRadius - HEX_SIZE * 0.8) * t;
                    const curAlpha = 0.5 * (1.0 - t);
                    
                    const isActivated = props.isActivated || (activatedMiniMonuments && activatedMiniMonuments.includes(`${props.q},${props.r}`));
                    const pulseColor = isActivated ? 0x22d3ee : 0xf1f5f9;
                    
                    miniMonumentPulse.beginPath();
                    miniMonumentPulse.ellipse(0, props.offsetY, curRadius, curRadius * 0.8);
                    miniMonumentPulse.stroke({ width: 2, color: pulseColor, alpha: curAlpha });
                    miniMonumentPulse.fill({ color: pulseColor, alpha: curAlpha * 0.15 });
                } else {
                    if (miniMonumentPulse) {
                        curContainer.removeChild(miniMonumentPulse).destroy();
                    }
                }

                // --- METEOR WARNING SHADOW/TELEGRAPH ---
                const targetedMeteor = activeMeteors?.find(m => m.q === props.q && m.r === props.r);
                let meteorTelegraph = curContainer.getChildByName('meteor_telegraph') as PIXI.Graphics;
                if (targetedMeteor && isRevealed) {
                    if (!meteorTelegraph) {
                        meteorTelegraph = new PIXI.Graphics();
                        meteorTelegraph.name = 'meteor_telegraph';
                        meteorTelegraph.zIndex = 42;
                        curContainer.addChild(meteorTelegraph);
                    }
                    meteorTelegraph.clear();
                    
                    const pulse = 0.5 + 0.5 * Math.sin(Date.now() * 0.02);
                    
                    meteorTelegraph.beginPath();
                    rotatedBasePoints.forEach((pt, j) => {
                        const px = pt.x;
                        const py = pt.y * 0.8 + props.offsetY;
                        if (j === 0) meteorTelegraph.moveTo(px, py);
                        else meteorTelegraph.lineTo(px, py);
                    });
                    meteorTelegraph.closePath();
                    meteorTelegraph.stroke({ width: 3, color: 0xef4444, alpha: 0.8 + pulse * 0.2 });
                    meteorTelegraph.fill({ color: 0xef4444, alpha: 0.25 + pulse * 0.15 });

                    const maxTicks = targetedMeteor.maxWarnTicks || 4;
                    const ticksLeft = targetedMeteor.warnTicksRemaining;
                    // Ratio from 1 (just spawned) to 0 (impact)
                    const collapseRatio = ticksLeft / maxTicks;
                    const progress = 1 - collapseRatio;
                    
                    // Expanding shadow
                    const maxShadowRadiusX = 40;
                    const maxShadowRadiusY = 25;
                    
                    meteorTelegraph.beginPath();
                    meteorTelegraph.ellipse(0, props.offsetY, maxShadowRadiusX * progress, maxShadowRadiusY * progress);
                    meteorTelegraph.stroke({ width: 2, color: 0x000000, alpha: 0.5 });
                    meteorTelegraph.fill({ color: 0x000000, alpha: 0.7 * progress });

                    // Falling fiery rock
                    const startY = props.offsetY - 800; // Start high up
                    const currentY = startY + (props.offsetY - startY) * Math.pow(progress, 2); // Accelerate downwards
                    
                    // Meteor rock
                    meteorTelegraph.beginPath();
                    meteorTelegraph.circle(0, currentY, 15);
                    meteorTelegraph.fill({ color: 0xff5500, alpha: 1 });
                    
                    // Meteor core
                    meteorTelegraph.beginPath();
                    meteorTelegraph.circle(0, currentY, 8);
                    meteorTelegraph.fill({ color: 0xffaa00, alpha: 1 });
                    
                    // Meteor trail
                    meteorTelegraph.beginPath();
                    meteorTelegraph.moveTo(-10, currentY);
                    meteorTelegraph.lineTo(10, currentY);
                    meteorTelegraph.lineTo(0, currentY - 80 - 100 * collapseRatio); // Trail stretches up
                    meteorTelegraph.closePath();
                    meteorTelegraph.fill({ color: 0xff4400, alpha: 0.6 });
                } else {
                    if (meteorTelegraph) {
                        curContainer.removeChild(meteorTelegraph).destroy();
                    }
                }

                // --- GHOST PREVIEW FOR UPGRADE ---
                const isHovered = hoveredHexId === `${props.q},${props.r}`;
                const isUpgradeIntent = playerGrowthIntent === 'UPGRADE';
                let ghostPreview = curContainer.getChildByName('ghost_preview') as PIXI.Graphics;
                
                if (isHovered && isUpgradeIntent && isRevealed) {
                    if (!ghostPreview) {
                        ghostPreview = new PIXI.Graphics();
                        ghostPreview.name = 'ghost_preview';
                        ghostPreview.zIndex = 30;
                        curContainer.addChild(ghostPreview);
                    }
                    ghostPreview.clear();
                    
                    const nextOffsetY = props.offsetY - 8;
                    
                    ghostPreview.beginPath();
                    rotatedBasePoints.forEach((pt, j) => {
                        const px = pt.x;
                        const py = pt.y * 0.8 + nextOffsetY;
                        if (j === 0) ghostPreview.moveTo(px, py);
                        else ghostPreview.lineTo(px, py);
                    });
                    ghostPreview.closePath();
                    
                    ghostPreview.stroke({ width: 2.0, color: 0x10b981, alpha: 0.95 });
                    ghostPreview.fill({ color: 0x10b981, alpha: 0.28 });
                    
                    rotatedBasePoints.forEach(pt => {
                        ghostPreview.beginPath();
                        ghostPreview.moveTo(pt.x, pt.y * 0.8 + props.offsetY);
                        ghostPreview.lineTo(pt.x, pt.y * 0.8 + nextOffsetY);
                        ghostPreview.stroke({ width: 1.0, color: 0x10b981, alpha: 0.5 });
                    });
                    
                    let ghostText = curContainer.getChildByName('ghost_text') as PIXI.Text;
                    if (!ghostText) {
                        ghostText = new PIXI.Text({
                            text: `+L${props.level + 1}`,
                            style: {
                                fontFamily: 'monospace',
                                fontSize: 11,
                                fontWeight: 'bold',
                                fill: 0x10b981,
                                stroke: { color: 0x000000, width: 2.5 }
                            }
                        });
                        ghostText.name = 'ghost_text';
                        ghostText.anchor.set(0.5, 0.5);
                        ghostText.zIndex = 31;
                        curContainer.addChild(ghostText);
                    }
                    ghostText.y = nextOffsetY - 12;
                    ghostText.visible = true;
                } else {
                    if (ghostPreview) {
                        curContainer.removeChild(ghostPreview).destroy();
                    }
                    const ghostText = curContainer.getChildByName('ghost_text');
                    if (ghostText) {
                        curContainer.removeChild(ghostText).destroy();
                    }
                }

                // Render path confirmation cost target badge (isPending)
                if (props.isPending) {
                    let pendingBadge = curContainer.getChildByName('pending_badge') as PIXI.Container;
                    if (!pendingBadge) {
                        pendingBadge = new PIXI.Container();
                        pendingBadge.name = 'pending_badge';
                        pendingBadge.zIndex = 45;
                        curContainer.addChild(pendingBadge);

                        const g = new PIXI.Graphics();
                        g.name = 'badge_graphics';
                        // Soft glow ring so the cost reads clearly against any terrain.
                        g.beginPath();
                        g.circle(0, 0, 19);
                        g.fill({ color: 0xfbbf24, alpha: 0.22 });
                        // Coin disc with the cost number inside (per "число монет в кружочке над гексом").
                        g.beginPath();
                        g.circle(0, 0, 15);
                        g.fill({ color: 0xfbbf24 });
                        g.strokeStyle = { width: 2, color: 0x92400e };
                        g.stroke();
                        pendingBadge.addChild(g);

                        const txt = new PIXI.Text({
                            text: '',
                            style: {
                                fontFamily: 'Inter, sans-serif',
                                fontSize: 15,
                                fontWeight: 'bold',
                                fill: 0x78350f,
                                align: 'center'
                            }
                        });
                        txt.name = 'badge_text';
                        txt.anchor.set(0.5, 0.5);
                        pendingBadge.addChild(txt);
                    }

                    pendingBadge.visible = true;
                    pendingBadge.y = faceY - 33;

                    const costMoves = pendingConfirmation?.data?.costMoves ?? 0;
                    const costCoins = pendingConfirmation?.data?.costCoins ?? 0;
                    // Show the coin price inside the disc; fall back to move points if no coins needed.
                    const textLabel = costCoins > 0 ? `${costCoins}` : `${costMoves}`;

                    const txt = pendingBadge.getChildByName('badge_text') as PIXI.Text;
                    if (txt) {
                        txt.text = textLabel;
                    }
                } else {
                    const existingBadge = curContainer.getChildByName('pending_badge');
                    if (existingBadge) {
                        existingBadge.visible = false;
                    }
                }
                curContainer.sortChildren();
            } else if (item.type === 'UNIT') {
                // 2. UNITS LAYER (Sprites walking and jumping)
                activeUnitIds.add(item.id);
                const props = item.props;

                let curContainer = unitCache.current.get(item.id);
                let stateObj = unitAnimStates.current.get(item.id);

                if (!stateObj) {
                    stateObj = {
                        startQ: props.q,
                        startR: props.r,
                        startTime: Date.now(),
                        isMoving: false,
                        startLevel: props.hexLevel,
                        targetQ: props.q,
                        targetR: props.r,
                        targetLevel: props.hexLevel,
                        facingLeft: false,
                        currentQ: props.q,
                        currentR: props.r,
                        currentLevel: props.hexLevel,
                        stepDuration: 400,
                        moveMode: 'SINGLE'
                    };
                    unitAnimStates.current.set(item.id, stateObj);
                }
                const state = stateObj!;

                const uImage = resourceService.getUnitImage(props.headIndex, props.bodyIndex, props.color, props.type);
                const tex = getPixiTexture(uImage);

                if (!curContainer) {
                    curContainer = new PIXI.Container();
                    curContainer.name = item.id;
                    parent.addChild(curContainer);
                    unitCache.current.set(item.id, curContainer);

                    // Add Contact Shadows underneath feet
                    const shadow = new PIXI.Graphics();
                    shadow.name = 'shadow';
                    shadow.beginPath();
                    shadow.ellipse(0, 0, 10, 6);
                    shadow.fill({ color: 0x000000, alpha: 0.4 });
                    curContainer.addChild(shadow);

                    // Glowing neon indicator ring for Player
                    if (props.isPlayer) {
                        const ring = new PIXI.Graphics();
                        ring.name = 'ring';
                        ring.strokeStyle = { width: 1.0, color: 0xffffff, alpha: 0.6 };
                        ring.beginPath();
                        ring.ellipse(0, 0, 16, 10);
                        ring.stroke();
                        curContainer.addChild(ring);
                    }

                    // Scaled character avatar Sprite
                    const sprite = new PIXI.Sprite(tex);
                    sprite.name = 'sprite';
                    sprite.anchor.set(0.5, 0.75); // Center X, Pivot at ankles
                    sprite.scale.set(1.0, 1.0);
                    curContainer.addChild(sprite);
                } else {
                    // Update texture if player customized avatar
                    const sprite = curContainer.getChildByName('sprite') as PIXI.Sprite;
                    if (sprite) {
                        sprite.texture = tex;
                    }
                }
                curContainer.zIndex = item.depth;

                // Detect movement commands from game engine
                const hasPosChanged = props.q !== state.targetQ || props.r !== state.targetR;
                const hasLevelChanged = props.hexLevel !== state.targetLevel;

                if (hasPosChanged) {
                    const distance = cubeDistance(
                        { q: state.targetQ, r: state.targetR },
                        { q: props.q, r: props.r }
                    );

                    if (distance > 1.5) {
                        state.isMoving = false;
                        state.startQ = props.q;
                        state.startR = props.r;
                        state.startLevel = props.hexLevel;
                        state.targetQ = props.q;
                        state.targetR = props.r;
                        state.targetLevel = props.hexLevel;
                        state.currentQ = props.q;
                        state.currentR = props.r;
                        state.currentLevel = props.hexLevel;
                    } else {
                        const wasMoving = state.isMoving;
                        const queueLength = (props.isPlayer ? player?.movementQueue?.length : bots?.find(b => b.id === item.id)?.movementQueue?.length) || 0;
                        
                        let mode: any = 'SINGLE';
                        if (!wasMoving && queueLength > 0) mode = 'FIRST';
                        else if (wasMoving && queueLength > 0) mode = 'MIDDLE';
                        else if (wasMoving && queueLength === 0) mode = 'LAST';

                        state.moveMode = mode;
                        state.stepDuration = 380; // Perfectly matched step pace loop
                        state.startQ = wasMoving ? state.currentQ : state.targetQ;
                        state.startR = wasMoving ? state.currentR : state.targetR;
                        state.startLevel = wasMoving ? state.currentLevel : state.targetLevel;
                        state.targetQ = props.q;
                        state.targetR = props.r;
                        state.targetLevel = props.hexLevel;

                        // Compute facing direction vector flipping X scale
                        const startRawX = HEX_SIZE * (Math.sqrt(3) * state.startQ + Math.sqrt(3)/2 * state.startR);
                        const targetRawX = HEX_SIZE * (Math.sqrt(3) * state.targetQ + Math.sqrt(3)/2 * state.targetR);
                        if (Math.abs(targetRawX - startRawX) > 1) {
                            state.facingLeft = targetRawX < startRawX;
                        }

                        state.startTime = Date.now();
                        state.isMoving = true;
                    }
                } else if (hasLevelChanged) {
                    if (!state.isMoving) {
                        state.startLevel = state.targetLevel;
                        state.startTime = Date.now();
                        state.isMoving = true;
                        state.startQ = props.q;
                        state.startR = props.r;
                        state.moveMode = 'SINGLE';
                        state.stepDuration = 400;
                    }
                    state.targetLevel = props.hexLevel;
                }

                if (!state.isMoving) {
                    // Synchronously snapping character flat coordinate offsets to eliminate movement latency
                    const rawX = HEX_SIZE * (Math.sqrt(3) * props.q + Math.sqrt(3)/2 * props.r);
                    const rawY = HEX_SIZE * 1.5 * props.r;
                    const px = rawX * cos - rawY * sin;
                    const py = (rawX * sin + rawY * cos) * 0.8;
                    curContainer.x = px;
                    curContainer.y = py;
                    
                    const sprite = curContainer.getChildByName('sprite') as PIXI.Sprite;
                    const shadow = curContainer.getChildByName('shadow') as PIXI.Graphics;
                    const targetZ = getHexVisualHeight(props.hexLevel);
                    if (sprite) {
                        sprite.y = targetZ;
                    }
                    if (shadow) {
                        shadow.y = targetZ;
                    }
                }


                curContainer.alpha = props.opacity;
            }
        });

        // 3. POOL EVICTION (Cull cells and characters that left the Viewport to prevent memory leaks)
        for (const [id, container] of hexCache.current.entries()) {
            if (!activeHexIds.has(id)) {
                parent.removeChild(container);
                container.destroy({ children: true });
                hexCache.current.delete(id);
            }
        }

        for (const [id, container] of unitCache.current.entries()) {
            if (!activeUnitIds.has(id)) {
                parent.removeChild(container);
                container.destroy({ children: true });
                unitCache.current.delete(id);
                unitAnimStates.current.delete(id);
            }
        }

        // 4. SORT Z-INDEX DEPTH OF VISIBLE GRAPHICS (Ensure perfect 3D occlusion layering overlays)
        parent.sortChildren();

    }, [activeRenderItems, rotation, grid, isPixiReady, player, bots, isDefenseMode, activeLevelConfig, activatedMiniMonuments, portalActive, activeMeteors, pendingConfirmation, recentGradientLock]);

    // Handle Pointer clicks and map page client pixels directly to local grid axial tiles
    const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
        const app = pixiAppRef.current;
        if (!app || !app.renderer || !app.canvas || !grid) return;

        const rect = app.canvas.getBoundingClientRect();
        const clientX = 'clientX' in e ? e.clientX : e.touches?.[0]?.clientX;
        const clientY = 'clientY' in e ? e.clientY : e.touches?.[0]?.clientY;

        if (clientX === undefined || clientY === undefined) return;

        const canvasX = clientX - rect.left;
        const canvasY = clientY - rect.top;

        const cam = camera || { x: 0, y: 0, scale: 1 };
        const rx = (canvasX - cam.x) / cam.scale;
        const ry = (canvasY - cam.y) / cam.scale;

        // Un-project unrotated grid bounds
        const angleRad = -rotation * (Math.PI / 180);
        const uCos = Math.cos(angleRad);
        const uSin = Math.sin(angleRad);
        const unscaledY = ry / 0.8;
        const rawX = rx * uCos - unscaledY * uSin;
        const rawY = rx * uSin + unscaledY * uCos;

        const fracR = rawY / (1.5 * HEX_SIZE);
        const fracQ = rawX / (Math.sqrt(3) * HEX_SIZE) - fracR / 2;

        // Axial rounding
        const fracS = -fracQ - fracR;
        let q = Math.round(fracQ);
        let r = Math.round(fracR);
        const s = Math.round(fracS);
        const qDiff = Math.abs(q - fracQ);
        const rDiff = Math.abs(r - fracR);
        const sDiff = Math.abs(s - fracS);

        if (qDiff > rDiff && qDiff > sDiff) {
            q = -r - s;
        } else if (rDiff > sDiff) {
            r = -q - s;
        }

        // Scan Neighbors circle search for correct elevation heights
        let bestHexKey: string | null = null;
        let bestDist = Infinity;

        for (let dq = -4; dq <= 4; dq++) {
            for (let dr = Math.max(-4, -4 - dq); dr <= Math.min(4, 4 - dq); dr++) {
                const hKey = getHexKey(q + dq, r + dr);
                const cand = grid[hKey];
                if (!cand) continue;

                const forceReveal = (!!activeLevelConfig && activeLevelConfig.mapConfig?.revealMode !== 'fog') || !!useGameStore.getState().session?.defense?.isDefenseMode;
                const isRevealed = !!cand.revealed || forceReveal;
                if (!isRevealed) continue;

                const rawXCenter = HEX_SIZE * (Math.sqrt(3) * cand.q + (Math.sqrt(3) / 2) * cand.r);
                const rawYCenter = HEX_SIZE * (1.5 * cand.r);
                const rAngleRad = rotation * (Math.PI / 180);
                const cosC = Math.cos(rAngleRad);
                const sinC = Math.sin(rAngleRad);

                const px = rawXCenter * cosC - rawYCenter * sinC;
                const isVoid = cand.structureType === 'VOID';
                const offsetY = isVoid ? -10 : getHexVisualHeight(cand.currentLevel);
                const py = (rawXCenter * sinC + rawYCenter * cosC) * 0.8 + offsetY;

                const dist = Math.hypot(px - rx, py - ry);
                if (dist < bestDist && dist < HEX_SIZE * 2.2) {
                    bestDist = dist;
                    bestHexKey = hKey;
                }
            }
        }

        if (bestHexKey && grid[bestHexKey]) {
            const finalHex = grid[bestHexKey];
            // A real hex was hit: stop the click bubbling to the stage container's
            // onClick (handleStageClick -> cancelPendingAction). Otherwise the same
            // click that creates the coin-move confirmation immediately cancels it,
            // so a second tap can never confirm (coins never spent). Clicks on empty
            // space still bubble up and cancel the pending action, as intended.
            e.stopPropagation();
            onHexClick(finalHex.q, finalHex.r);
        }
    };

    // Tracks Pointer-moves to highlight hover states
    const handleCanvasMouseMove = (e: React.MouseEvent) => {
        const app = pixiAppRef.current;
        if (!app || !app.renderer || !app.canvas || !grid) return;

        const rect = app.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;

        const cam = camera || { x: 0, y: 0, scale: 1 };
        const rx = (canvasX - cam.x) / cam.scale;
        const ry = (canvasY - cam.y) / cam.scale;

        const angleRad = -rotation * (Math.PI / 180);
        const uCos = Math.cos(angleRad);
        const uSin = Math.sin(angleRad);
        const unscaledY = ry / 0.8;
        const rawX = rx * uCos - unscaledY * uSin;
        const rawY = rx * uSin + unscaledY * uCos;

        const fracR = rawY / (1.5 * HEX_SIZE);
        const fracQ = rawX / (Math.sqrt(3) * HEX_SIZE) - fracR / 2;

        const fracS = -fracQ - fracR;
        let q = Math.round(fracQ);
        let r = Math.round(fracR);
        const s = Math.round(fracS);
        const qDiff = Math.abs(q - fracQ);
        const rDiff = Math.abs(r - fracR);
        const sDiff = Math.abs(s - fracS);

        if (qDiff > rDiff && qDiff > sDiff) {
            q = -r - s;
        } else if (rDiff > sDiff) {
            r = -q - s;
        }

        let bestHexKey: string | null = null;
        let bestDist = Infinity;

        for (let dq = -4; dq <= 4; dq++) {
            for (let dr = Math.max(-4, -4 - dq); dr <= Math.min(4, 4 - dq); dr++) {
                const hKey = getHexKey(q + dq, r + dr);
                const cand = grid[hKey];
                if (!cand) continue;

                const forceReveal = (!!activeLevelConfig && activeLevelConfig.mapConfig?.revealMode !== 'fog') || !!useGameStore.getState().session?.defense?.isDefenseMode;
                const isRevealed = !!cand.revealed || forceReveal;
                if (!isRevealed) continue;

                const rawXCenter = HEX_SIZE * (Math.sqrt(3) * cand.q + (Math.sqrt(3) / 2) * cand.r);
                const rawYCenter = HEX_SIZE * (1.5 * cand.r);
                const rAngleRad = rotation * (Math.PI / 180);
                const cosC = Math.cos(rAngleRad);
                const sinC = Math.sin(rAngleRad);

                const px = rawXCenter * cosC - rawYCenter * sinC;
                const isVoid = cand.structureType === 'VOID';
                const offsetY = isVoid ? -10 : getHexVisualHeight(cand.currentLevel);
                const py = (rawXCenter * sinC + rawYCenter * cosC) * 0.8 + offsetY;

                const dist = Math.hypot(px - rx, py - ry);
                if (dist < bestDist && dist < HEX_SIZE * 2.2) {
                    bestDist = dist;
                    bestHexKey = hKey;
                }
            }
        }

        if (bestHexKey) {
            if (useEphemeralStore.getState().hoveredHexId !== bestHexKey) {
                onHover(bestHexKey);
            }
        } else {
            if (useEphemeralStore.getState().hoveredHexId !== null) {
                onHover(null);
            }
        }
    };

    const handleCanvasMouseLeave = () => {
        if (useEphemeralStore.getState().hoveredHexId !== null) {
            onHover(null);
        }
    };

    // Dispatch real-time screen coordinates of player to onboarding tutorials
    useEffect(() => {
        if (!player || !grid) return;

        const getScreenCoordsOfHex = (q: number, r: number, level: number) => {
            const SQRT3 = Math.sqrt(3);
            const SQRT3_2 = SQRT3 / 2;
            const ONE_POINT_FIVE = 1.5;
            
            const rawNX = HEX_SIZE * (SQRT3 * q + SQRT3_2 * r);
            const rawNY = HEX_SIZE * (ONE_POINT_FIVE * r);
            
            const angleOffset = rotation * (Math.PI / 180);
            const cos = Math.cos(angleOffset);
            const sin = Math.sin(angleOffset);
            
            const cx = rawNX * cos - rawNY * sin;
            const cy = (rawNX * sin + rawNY * cos) * 0.8 + getHexVisualHeight(level);
            
            const cam = camera || { x: 0, y: 0, scale: 1 };
            const screenX = cam.x + cx * cam.scale;
            const screenY = cam.y + cy * cam.scale;
            
            return {
                x: screenX - (HEX_SIZE * cam.scale),
                y: screenY - (HEX_SIZE * cam.scale * 0.8),
                w: HEX_SIZE * cam.scale * 2,
                h: HEX_SIZE * cam.scale * 1.6
            };
        };

        const pHex = grid[`${playerQ},${playerR}`];
        if (!pHex) return;

        const playerScreen = getScreenCoordsOfHex(playerQ, playerR, pHex.currentLevel);

        let mineScreen = null;
        let voidScreen = null;

        const neighbors = getNeighbors(playerQ, playerR);
        for (const n of neighbors) {
            const nHex = grid[`${n.q},${n.r}`];
            if (nHex) {
                if (nHex.currentLevel < 0 && !mineScreen) {
                    mineScreen = getScreenCoordsOfHex(n.q, n.r, nHex.currentLevel);
                }
                if (nHex.structureType === 'VOID' && !voidScreen) {
                    voidScreen = getScreenCoordsOfHex(n.q, n.r, nHex.currentLevel);
                }
            }
        }

        const updateEvent = new CustomEvent('hexquest-coordinates-update', {
            detail: {
                player: playerScreen,
                mine: mineScreen,
                void: voidScreen
            }
        });
        window.dispatchEvent(updateEvent);
    }, [player, playerQ, playerR, camera, rotation, grid]);

    // Render offscreen bot indicators if any bot is offscreen
    const offscreenBotIndicators = useMemo(() => {
        if (!bots || bots.length === 0 || !grid || !containerRef.current) return [];
        
        const isDefenseMode = !!useGameStore.getState().session?.defense?.isDefenseMode;
        const playerOwnedHexes = isDefenseMode 
            ? Object.values(grid).filter((h: any) => h.ownerId === 'player-1' || h.structureType === 'CORE' || h.isCore)
            : [];

        const w = containerRef.current.clientWidth || dimensions?.width || 800;
        const h = containerRef.current.clientHeight || dimensions?.height || 600;
        const cam = camera || { x: 0, y: 0, scale: 1 };
        
        const indicators: { id: string; x: number; y: number; angle: number; isDestroyer: boolean; distance: number | null }[] = [];
        
        bots.forEach(bot => {
            if (isDefenseMode) {
                let minDist = 9999;
                for (const ph of playerOwnedHexes) {
                    const d = cubeDistance({ q: ph.q, r: ph.r }, { q: bot.q, r: bot.r });
                    if (d < minDist) {
                        minDist = d;
                    }
                }
                if (minDist > 4) {
                    return; // Bot is beyond visibility, skip offscreen indicator!
                }
            }
            
            const bHex = grid[`${bot.q},${bot.r}`];
            if (!bHex) return;
            
            const SQRT3 = Math.sqrt(3);
            const SQRT3_2 = SQRT3 / 2;
            const ONE_POINT_FIVE = 1.5;
            
            const rawNX = HEX_SIZE * (SQRT3 * bot.q + SQRT3_2 * bot.r);
            const rawNY = HEX_SIZE * (ONE_POINT_FIVE * bot.r);
            
            const angleOffset = rotation * (Math.PI / 180);
            const cos = Math.cos(angleOffset);
            const sin = Math.sin(angleOffset);
            
            const cx = rawNX * cos - rawNY * sin;
            const cy = (rawNX * sin + rawNY * cos) * 0.8 + getHexVisualHeight(bHex.currentLevel);
            
            const botX = cam.x + cx * cam.scale;
            const botY = cam.y + cy * cam.scale;
            
            const padding = 12;
            const isOffscreen = botX < 0 || botX > w || botY < 0 || botY > h;
            
            if (isOffscreen) {
                const centerX = w / 2;
                const centerY = h / 2;
                const dx = botX - centerX;
                const dy = botY - centerY;
                const angle = Math.atan2(dy, dx);
                
                let edgeX = centerX;
                let edgeY = centerY;
                
                const slope = dx !== 0 ? dy / dx : 10000;
                const halfW = w / 2 - padding;
                const halfH = h / 2 - padding;
                
                if (Math.abs(dx) * halfH > Math.abs(dy) * halfW) {
                    if (dx > 0) {
                        edgeX = centerX + halfW;
                        edgeY = centerY + halfW * slope;
                    } else {
                        edgeX = centerX - halfW;
                        edgeY = centerY - halfW * slope;
                    }
                } else {
                    if (dy > 0) {
                        edgeY = centerY + halfH;
                        edgeX = centerX + halfH / slope;
                    } else {
                        edgeY = centerY - halfH;
                        edgeX = centerX - halfH / slope;
                    }
                }
                
                const isDestroyer = bot.memory?.botRole === 'DESTROYER' || bot.id.toLowerCase().includes('destroyer');
                const distHexes = player ? cubeDistance(player, bot) : null;
                
                indicators.push({
                    id: bot.id,
                    x: edgeX,
                    y: edgeY,
                    angle: angle,
                    isDestroyer,
                    distance: distHexes
                });
            }
        });
        
        return indicators;
    }, [bots, grid, camera, rotation, dimensions, player]);

    return (
        <div 
            ref={containerRef} 
            className="absolute inset-0 cursor-crosshair overflow-hidden"
            onClick={handleCanvasClick}
            onMouseMove={handleCanvasMouseMove}
            onMouseLeave={handleCanvasMouseLeave}
            onTouchStart={handleCanvasClick}
            style={{ width: '100%', height: '100%' }}
        >
            {/* Offscreen Bot Indicators */}
            {offscreenBotIndicators.map(ind => (
                <div 
                    key={ind.id}
                    className="absolute pointer-events-none flex items-center justify-center animate-pulse z-50"
                    style={{
                        left: `${ind.x}px`,
                        top: `${ind.y}px`,
                        transform: 'translate(-50%, -50%)',
                    }}
                >
                    <div 
                        className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-red-500 shadow-md filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]"
                        style={{
                            transform: `rotate(${ind.angle * (180 / Math.PI) - 90}deg)`,
                        }}
                    />
                </div>
            ))}
        </div>
    );
};

export default MapRenderer;
