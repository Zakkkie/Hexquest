import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import * as PIXI from 'pixi.js';
import { useGameStore } from '../store';
import { useEphemeralStore } from '../store/ephemeralStore';
import { HEX_SIZE, getLevelConfig } from '../rules/config';
import { textureService } from '../services/textureService';
import { resourceService } from '../services/resourceService';
import { EntityState, Hex, Entity } from '../types';
import { getNeighbors, getStatusModifiers, getHexKey } from '../services/hexUtils';
import { safifyCoord } from '../utils/safeCoordinates';
import {
    BASE_POINTS,
    THEME_PALETTE,
    getTheme,
    getHeightOffset,
    getPixiTexture,
    getPoiIcon,
    translateArrowLabel,
} from '../services/pixiHexRender';
import {
    NEIGHBOR_DIRECTIONS,
    VOID_LEVEL_FLAG,
    cubeDistance,
    isObjectiveHexCompleted,
    runLocalRenderCalculation,
    isFinishTile,
    areAllConditionsMet,
} from '../services/mapRenderModel';
import { useMapInput } from '../hooks/useMapInput';
import { renderMeteorTelegraph } from '../services/meteorRenderer';

export { THEME_PALETTE };

const MAX_WALL_DEPTH = 200;
const VOID_SKIRT_DEPTH = 28;
const getHexVisualHeight = getHeightOffset;

const ICON_MAP: Record<string, string> = { 
    UP: '▲', 
    DOWN: '▼', 
    WARN: '⚠️', 
    COIN: '🪙', 
    PICKAXE: '⛏️', 
    GEM: '💎', 
    FOOTPRINTS: '👣', 
    PLUS: '➕', 
    SKULL: '💀' 
};

const FLOATING_TEXT_STYLE_CACHE = new Map<string, PIXI.TextStyle>();

function getFloatingTextStyle(color: string): PIXI.TextStyle {
    const key = (color || '#ffffff').toLowerCase();
    let style = FLOATING_TEXT_STYLE_CACHE.get(key);
    if (!style) {
        style = new PIXI.TextStyle({
            fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontSize: 16,
            fontWeight: '800',
            fill: key,
            align: 'center',
            stroke: { color: 0x020617, width: 4.5, join: 'round' },
            dropShadow: {
                alpha: 0.85,
                angle: Math.PI / 4,
                blur: 4,
                color: 0x000000,
                distance: 2,
            },
        });
        FLOATING_TEXT_STYLE_CACHE.set(key, style);
    }
    return style;
}

interface MapRendererProps {
    rotation: number;
    onHexClick: (q: number, r: number) => void;
    onHover: (id: string | null) => void;
    camera?: { x: number; y: number; scale: number; rotation: number };
    dimensions?: { width: number; height: number };
}

export const MapRenderer: React.FC<MapRendererProps> = ({ rotation, onHexClick, onHover, camera, dimensions }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const pixiAppRef = useRef<PIXI.Application | null>(null);
    const worldContainerRef = useRef<PIXI.Container | null>(null);
    const renderItemsContainerRef = useRef<PIXI.Container | null>(null);
    const connectionsGraphicsRef = useRef<PIXI.Graphics | null>(null);
    const effectsContainerRef = useRef<PIXI.Container | null>(null);
    const particlesContainerRef = useRef<PIXI.Container | null>(null);

    const grid = useGameStore(state => state.session?.grid);
    const isDefenseMode = useGameStore(state => !!state.session?.defense?.isDefenseMode);
    const sessionLanguage = useGameStore(state => state.session?.language);
    const player = useGameStore(state => state.session?.player);
    const bots = useGameStore(state => state.session?.bots);
    const effects = useGameStore(state => state.session?.effects);
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const session = useGameStore(state => state.session);
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

    const recentGradientLock = useMemo(() => {
        if (!messageLog || messageLog.length === 0 || !player) return null;
        const latest = messageLog[0];
        const isRecent = Date.now() - latest.timestamp < 1500;
        const isGradientLock = latest.text.includes("Нельзя копать") || latest.text.includes("below neighbors") || latest.text.includes("GRADIENT") || latest.text.includes("KOПАТЬ");
        return (isRecent && isGradientLock) ? player : null;
    }, [messageLog, player]);

    const playerQ = player?.q ?? 0;
    const playerR = player?.r ?? 0;
    const selectedHexId = useMemo(() => (playerQ !== undefined && playerR !== undefined) ? getHexKey(playerQ, playerR) : null, [playerQ, playerR]);

    const hexPropsCache = useRef<WeakMap<PIXI.Container, any>>(new WeakMap());
    const hexCache = useRef<Map<string, PIXI.Container>>(new Map());
    const hoverRef = useRef<string | null>(null);
    const unitCache = useRef<Map<string, PIXI.Container>>(new Map());
    const unitAnimStates = useRef<Map<string, any>>(new Map());
    const effectCache = useRef<Map<string, any>>(new Map());
    const particlesList = useRef<any[]>([]);
    const activeActionParticles = useRef<any[]>([]);
    const economicParticlesRef = useRef<any[]>([]);

    const lastPlayerCoinsRef = useRef<number>(0);
    const lastPlayerStorageRef = useRef<number>(0);
    const lastPeriodicPulseRef = useRef<number>(0);
    const lastSessionIdRef = useRef<string | null>(null);
    const sessionStartTimeRef = useRef<number>(0);
    const victoryStartTimeRef = useRef<number | null>(null);

    // Screen Shake State
    const shakeIntensityRef = useRef<number>(0);

    const [isPixiReady, setIsPixiReady] = useState(false);

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

    const forceReveal = useMemo(() => (isCampaign && activeLevelConfig?.mapConfig?.revealMode !== 'fog') || !!isDefenseMode, [isCampaign, activeLevelConfig, isDefenseMode]);

    const activeRenderItems = useMemo(() => {
        return runLocalRenderCalculation(grid, player, bots, rotation, pendingKey, selectedHexId, camera, dimensions, isCampaign, playerGrowthIntent, isDefenseMode, forceReveal);
    }, [grid, player, bots, rotation, pendingKey, selectedHexId, camera, dimensions, isCampaign, playerGrowthIntent, isDefenseMode, forceReveal]);

    // Initialize Pixi Application
    useEffect(() => {
        if (!containerRef.current) return;
        let app: PIXI.Application | null = null;
        let isDestroyed = false;
        pixiAppRef.current = new PIXI.Application();
        app = pixiAppRef.current;
        const currentTickerCallback = tickerCallbackRef.current;

        const initPixi = async () => {
            try {
                await app!.init({ width: dimensions?.width || window.innerWidth, height: dimensions?.height || window.innerHeight, backgroundAlpha: 0, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
            } catch (err) { console.error("Failed to initialize Pixi:", err); return; }

            if (isDestroyed || !containerRef.current) { try { app!.destroy(true, { children: true }); } catch (e) {} return; }
            containerRef.current.appendChild(app!.canvas);

            const world = new PIXI.Container();
            worldContainerRef.current = world;
            app!.stage.addChild(world);

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

            if (app!.ticker) app!.ticker.add(currentTickerCallback);
            if (dimensions && app!.renderer) app!.renderer.resize(dimensions.width, dimensions.height);
            setIsPixiReady(true);
        };

        initPixi();

        return () => {
            isDestroyed = true;
            setIsPixiReady(false);
            if (activeActionParticles.current.length > 0) { activeActionParticles.current.forEach(p => { try { p.graphics.destroy(); } catch (err) {} }); activeActionParticles.current = []; }
            if (pixiAppRef.current === app) {
                pixiAppRef.current = null;
                if (app?.ticker) { try { app.ticker.remove(currentTickerCallback); } catch (e) {} }
                try { app?.destroy(true, { children: true }); } catch (e) {}
                worldContainerRef.current = null; renderItemsContainerRef.current = null; connectionsGraphicsRef.current = null; effectsContainerRef.current = null; particlesContainerRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { if (pixiAppRef.current && pixiAppRef.current.renderer && dimensions) pixiAppRef.current.renderer.resize(dimensions.width, dimensions.height); }, [dimensions]);

    useEffect(() => {
        if (worldContainerRef.current && camera) {
            worldContainerRef.current.x = camera.x;
            worldContainerRef.current.y = camera.y;
            worldContainerRef.current.scale.set(camera.scale, camera.scale);
        }
    }, [camera, isPixiReady]);

    const drawConnections = useCallback(() => {
        const graphics = connectionsGraphicsRef.current;
        if (!graphics || !grid || !player) return;
        graphics.clear();
        
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
        const SQRT3 = Math.sqrt(3), SQRT3_2 = SQRT3 / 2, ONE_POINT_FIVE = 1.5;

        // Draw player lines only if player is not growing and not moving
        if (!isPlayerGrowing && player.state !== EntityState.MOVING) {
            const ppxRaw = HEX_SIZE * (SQRT3 * player.q + SQRT3_2 * player.r);
            const ppyRaw = HEX_SIZE * (ONE_POINT_FIVE * player.r);
            const ppx = ppxRaw * cos - ppyRaw * sin;
            const ppy = (ppxRaw * sin + ppyRaw * cos) * 0.8;

            const pHex = grid[getHexKey(player.q, player.r)];
            const startH = pHex ? (10 + pHex.currentLevel * 10) : 10;
            const neighbors = getNeighbors(player.q, player.r);

            for (const n of neighbors) {
                const nHex = grid[getHexKey(n.q, n.r)];
                if (nHex?.structureType === 'VOID' || nHex?.isPassable === false) continue;
                const rawNX = HEX_SIZE * (SQRT3 * n.q + SQRT3_2 * n.r);
                const rawNY = HEX_SIZE * (ONE_POINT_FIVE * n.r);
                const npx = rawNX * cos - rawNY * sin;
                const npy = (rawNX * sin + rawNY * cos) * 0.8;
                const endH = nHex ? (10 + nHex.currentLevel * 10) : 10;
                if (Math.abs((pHex?.currentLevel ?? 0) - (nHex?.currentLevel ?? 0)) > 1) continue;

                const cost = (nHex?.currentLevel ?? 0) > 1 ? (nHex?.currentLevel ?? 0) : 1;
                const { exchangeRate } = getStatusModifiers(player, { campaignUpgrades });
                const canAfford = player.moves >= cost || player.coins >= (cost * exchangeRate);

                graphics.strokeStyle = { width: 2.0, color: canAfford ? 0x34d399 : 0xef4444, alpha: (nHex && nHex.currentLevel > player.playerLevel) ? 0.2 : 0.6 };
                const startX = ppx, startY = ppy - startH, endX = npx, endY = npy - endH;
                for (let s = 0; s < 6; s++) {
                    if (s % 2 === 0) {
                        const t1 = s / 6, t2 = (s + 1) / 6;
                        graphics.moveTo(startX + (endX - startX) * t1, startY + (endY - startY) * t1);
                        graphics.lineTo(startX + (endX - startX) * t2, startY + (endY - startY) * t2);
                    }
                }
                graphics.stroke();
            }
        }

        // Draw diagnostic lines for inactive/idle bots in Core Siege mode
        if (isDefenseMode && bots && bots.length > 0) {
            bots.forEach((bot: any) => {
                let targetId = bot.memory?.targetHexId || bot.memory?.plan?.steps?.[0]?.targetId;
                const isIdle = !targetId || bot.state === EntityState.IDLE;
                
                // If idle or no target, default to Core (0,0)
                if (!targetId) {
                    targetId = '0,0';
                }

                const parts = targetId.split(',');
                if (parts.length !== 2) return;
                const tq = parseInt(parts[0], 10);
                const tr = parseInt(parts[1], 10);
                if (isNaN(tq) || isNaN(tr)) return;

                const botHex = grid[getHexKey(bot.q, bot.r)];
                const targetHex = grid[getHexKey(tq, tr)];

                const botH = botHex ? (10 + botHex.currentLevel * 10) : 10;
                const targetH = targetHex ? (10 + targetHex.currentLevel * 10) : 10;

                const rawBotX = HEX_SIZE * (SQRT3 * bot.q + SQRT3_2 * bot.r);
                const rawBotY = HEX_SIZE * (ONE_POINT_FIVE * bot.r);
                const bpx = rawBotX * cos - rawBotY * sin;
                const bpy = (rawBotX * sin + rawBotY * cos) * 0.8;

                const rawTarX = HEX_SIZE * (SQRT3 * tq + SQRT3_2 * tr);
                const rawTarY = HEX_SIZE * (ONE_POINT_FIVE * tr);
                const tpx = rawTarX * cos - rawTarY * sin;
                const tpy = (rawTarX * sin + rawTarY * cos) * 0.8;

                if (isIdle) {
                    // Draw dashed/solid orange indicator line for idle/inactive bots pointing to Core
                    graphics.strokeStyle = { width: 2.0, color: 0xf97316, alpha: 0.8 }; // Bright Orange warning line
                    
                    // Draw simple dashed/dotted line effect manually
                    const startX = bpx, startY = bpy - botH, endX = tpx, endY = tpy - targetH;
                    const stepsCount = 10;
                    for (let s = 0; s < stepsCount; s++) {
                        if (s % 2 === 0) {
                            const t1 = s / stepsCount;
                            const t2 = (s + 1) / stepsCount;
                            graphics.moveTo(startX + (endX - startX) * t1, startY + (endY - startY) * t1);
                            graphics.lineTo(startX + (endX - startX) * t2, startY + (endY - startY) * t2);
                        }
                    }
                    graphics.stroke();

                    // Draw alert ring around the idle bot
                    graphics.strokeStyle = { width: 1.5, color: 0xf97316, alpha: 0.6 };
                    graphics.drawCircle(bpx, bpy - botH, 15);
                    graphics.stroke();
                } else {
                    // Draw solid purple indicator line for active bots pursuing a specific target
                    graphics.strokeStyle = { width: 3.0, color: 0xc084fc, alpha: 0.9 }; // Elegant purple line
                    graphics.moveTo(bpx, bpy - botH);
                    graphics.lineTo(tpx, tpy - targetH);
                    graphics.stroke();

                    // Draw target node dot
                    graphics.fillStyle = { color: 0xa855f7, alpha: 1.0 };
                    graphics.drawCircle(tpx, tpy - targetH, 5);
                    graphics.fill();
                }
            });
        }
    }, [grid, player, isPlayerGrowing, rotation, campaignUpgrades, bots, isDefenseMode]);

    useEffect(() => { drawConnections(); }, [drawConnections, isPixiReady]);

    const updateFloatingEffects = useCallback(() => {
        const parent = effectsContainerRef.current;
        if (!parent || !effects) return;
        const sorted = [...effects].sort((a, b) => a.startTime - b.startTime);
        const counts: Record<string, number> = {};
        const activeEffectIds = new Set<string>();

        sorted.forEach(eff => {
            const key = `${eff.q},${eff.r}`;
            const idx = counts[key] || 0; counts[key] = idx + 1;
            activeEffectIds.add(eff.id);
            const iconPrefix = eff.icon && ICON_MAP[eff.icon] && !eff.text.startsWith(ICON_MAP[eff.icon]) ? `${ICON_MAP[eff.icon]} ` : '';
            const displayText = iconPrefix + eff.text;

            let cached = effectCache.current.get(eff.id);
            if (!cached) {
                const container = new PIXI.Container();
                const textStyle = getFloatingTextStyle(eff.color);
                const text = new PIXI.Text({ 
                    text: displayText, 
                    style: textStyle 
                });
                text.anchor.set(0.5, 0.5); container.addChild(text); parent.addChild(container);
                let laserGraphics: PIXI.Graphics | undefined = undefined;
                if (eff.sourceQ !== undefined && eff.sourceR !== undefined) { laserGraphics = new PIXI.Graphics(); parent.addChild(laserGraphics); }
                cached = { container, text, startTime: Date.now(), lifetime: eff.lifetime || 2500, q: eff.q, r: eff.r, stackIndex: idx, laserGraphics };
                effectCache.current.set(eff.id, cached);
            } else if (cached.text && cached.text.text !== displayText) {
                cached.text.text = displayText;
            }

            const totalLifetime = cached.lifetime || 2500;
            const elapsed = Date.now() - cached.startTime;
            const progress = Math.min(1.0, elapsed / totalLifetime);

            const { x: basePx, y: basePy } = simpleHexToPixel(cached.q, cached.r);
            const hexCell = grid ? grid[getHexKey(cached.q, cached.r)] : undefined;
            const yOffset = getHeightOffset(hexCell ? (hexCell.currentLevel || 0) : 0);
            const stackYOffset = idx * 26;
            // getHeightOffset returns negative values for height elevation.
            // Adding yOffset adjusts for hex surface height, and subtracting 65 places the text above the player head.
            const currentY = basePy + yOffset - 65 - stackYOffset;
            
            // Smooth ease-out cubic vertical floating curve
            const floatEase = 1 - Math.pow(1 - progress, 2.2);
            const floatRise = floatEase * 42;

            if (cached.container && !cached.container.destroyed) {
                cached.container.x = basePx; 
                cached.container.y = currentY - floatRise;

                if (progress < 0.16) {
                    // Elastic pop-in with smooth overshoot
                    const popP = progress / 0.16;
                    const scale = 0.4 + Math.sin(popP * Math.PI * 0.65) * 0.72;
                    cached.container.scale.set(scale, scale);
                    cached.container.alpha = Math.min(1.0, popP * 1.5);
                } else if (progress < 0.75) {
                    cached.container.scale.set(1.0, 1.0);
                    cached.container.alpha = 1.0;
                } else {
                    // Smooth ease-out fade out
                    const fadeP = (progress - 0.75) / 0.25;
                    const alpha = Math.max(0, 1.0 - Math.pow(fadeP, 1.8));
                    const scale = 1.0 - fadeP * 0.08;
                    cached.container.alpha = alpha;
                    cached.container.scale.set(scale, scale);
                }
            }
            if (cached.laserGraphics && !cached.laserGraphics.destroyed && eff.sourceQ !== undefined && eff.sourceR !== undefined) {
                cached.laserGraphics.clear();
                const beamLifetime = 800;
                if (elapsed < beamLifetime) {
                    const bp = elapsed / beamLifetime, ba = 1.0 - bp;
                    const gridObj = grid || {};
                    const sourceHex = gridObj[getHexKey(eff.sourceQ, eff.sourceR)];
                    const sZ = getHexVisualHeight(sourceHex ? (sourceHex.currentLevel ?? 0) : 0);
                    const { x: sBasePx, y: sBasePy } = simpleHexToPixel(eff.sourceQ, eff.sourceR);
                    const sX = sBasePx, sY = sBasePy - sZ;
                    const targetHex = gridObj[getHexKey(eff.q, eff.r)];
                    const tZ = getHexVisualHeight(targetHex ? (targetHex.currentLevel ?? 0) : 0);
                    const { x: tBasePx, y: tBasePy } = simpleHexToPixel(eff.q, eff.r);
                    const tX = tBasePx, tY = tBasePy - tZ;
                    cached.laserGraphics.strokeStyle = { width: 4.5 * (1.0 - bp), color: 0xF43F5E, alpha: ba * 0.75 };
                    cached.laserGraphics.beginPath(); cached.laserGraphics.moveTo(sX, sY); cached.laserGraphics.lineTo(tX, tY); cached.laserGraphics.stroke();
                    cached.laserGraphics.strokeStyle = { width: 1.5 * (1.0 - bp), color: 0xFFFFFF, alpha: ba * 0.95 };
                    cached.laserGraphics.beginPath(); cached.laserGraphics.moveTo(sX, sY); cached.laserGraphics.lineTo(tX, tY); cached.laserGraphics.stroke();
                    cached.laserGraphics.fillStyle = { color: 0xF43F5E, alpha: ba * 0.9 };
                    cached.laserGraphics.beginPath(); cached.laserGraphics.circle(sX, sY, 8 * (1.0 - bp)); cached.laserGraphics.fill();
                    cached.laserGraphics.fillStyle = { color: 0xF59E0B, alpha: ba * 0.9 };
                    cached.laserGraphics.beginPath(); cached.laserGraphics.circle(tX, tY, 10 * (1.0 - bp)); cached.laserGraphics.fill();
                }
            }
        });
        for (const [id, value] of effectCache.current.entries()) {
            if (!activeEffectIds.has(id)) { parent.removeChild(value.container); value.container.destroy({ children: true }); if (value.laserGraphics) { parent.removeChild(value.laserGraphics); value.laserGraphics.destroy(); } effectCache.current.delete(id); }
        }
    }, [effects, simpleHexToPixel, grid]);

    const updateDustParticles = useCallback(() => {
        const now = Date.now();
        particlesList.current = particlesList.current.filter(item => {
            if (!item.graphics || item.graphics.destroyed) return false;
            const elapsed = now - item.startTime;
            if (elapsed >= item.duration) { try { item.graphics.destroy(); } catch (e) {} return false; }
            const progress = elapsed / item.duration;
            try {
                item.graphics.clear();
                item.puffs.forEach((puff: any) => {
                    const cx = puff.vx * elapsed, cy = puff.vy * elapsed, radius = puff.radius * (1.0 - progress), alpha = puff.opacity * (1.0 - progress);
                    item.graphics.beginPath(); item.graphics.circle(cx, cy, radius); item.graphics.fill({ color: 0x94a3b8, alpha });
                });
                return true;
            } catch (err) { return false; }
        });
    }, []);

    const updateEconomicParticles = useCallback(() => {
        const parent = particlesContainerRef.current;
        if (!parent || !grid) return;
        const now = Date.now();
        let shouldSpawnAmbient = false;
        if (now - lastPeriodicPulseRef.current > 1200) { shouldSpawnAmbient = true; lastPeriodicPulseRef.current = now; }

        const spawnResourceParticle = (hq: number, hr: number, type: 'AMBIENT') => {
            const { x: basePx, y: basePy } = simpleHexToPixel(hq, hr);
            const hexCell = grid[getHexKey(hq, hr)];
            const yOffset = getHeightOffset(hexCell ? (hexCell.currentLevel || 0) : 0);
            const px = basePx, py = basePy - yOffset - 15;
            const container = new PIXI.Container();
            const dot = new PIXI.Graphics(); dot.circle(0, 0, 2.5 + Math.random() * 2); dot.fill({ color: Math.random() > 0.5 ? 0xf59e0b : 0x10b981 }); container.addChild(dot);
            container.x = px; container.y = py; container.alpha = 0.95; container.scale.set(0.75);
            parent.addChild(container);
            economicParticlesRef.current.push({ id: Math.random(), x: px, y: py, vx: (Math.random() - 0.5) * 0.45, vy: -1.0 - Math.random() * 0.8, scale: 0.75, alpha: 0.95, age: 0, maxAge: 45 + Math.random() * 25, container });
        };

        for (const key in grid) {
            const hex = grid[key];
            const isCore = hex.structureType === 'CORE' || hex.isCore;
            const isTurret = hex.structureType === 'TURRET' || hex.isTurret;
            if (isCore || isTurret) {
                if (shouldSpawnAmbient && Math.random() < (isCore ? 0.8 : 0.45)) {
                    spawnResourceParticle(hex.q, hex.r, 'AMBIENT');
                }
            }
        }
        economicParticlesRef.current = economicParticlesRef.current.filter(p => {
            if (!p.container || p.container.destroyed) return false;
            p.age += 1;
            if (p.age >= p.maxAge) { try { p.container.destroy({ children: true }); } catch (e) {} return false; }
            p.x += p.vx; p.y += p.vy; p.container.x = p.x; p.container.y = p.y;
            const lr = p.age / p.maxAge; p.container.alpha = 1.0 - lr; p.container.scale.set(0.75 + lr * 0.45);
            return true;
        });
    }, [grid, simpleHexToPixel]);

    const updateSceneLoop = () => {
        const nowTime = Date.now();
        if (sessionId && sessionId !== lastSessionIdRef.current) { lastSessionIdRef.current = sessionId; sessionStartTimeRef.current = nowTime; }
        
        // Screen Shake Logic
        if (worldContainerRef.current && camera) {
            let shakeX = 0, shakeY = 0;
            if (shakeIntensityRef.current > 0.1) {
                shakeX = (Math.random() - 0.5) * shakeIntensityRef.current;
                shakeY = (Math.random() - 0.5) * shakeIntensityRef.current;
                shakeIntensityRef.current *= 0.9; // Decay
            } else {
                shakeIntensityRef.current = 0;
            }
            worldContainerRef.current.x = camera.x + shakeX;
            worldContainerRef.current.y = camera.y + shakeY;
            worldContainerRef.current.scale.set(camera.scale, camera.scale);
        }

        if (gameStatus === 'VICTORY') { if (victoryStartTimeRef.current === null) victoryStartTimeRef.current = nowTime; } else { victoryStartTimeRef.current = null; }

        updateFloatingEffects();
        updateDustParticles();
        updateEconomicParticles();

        activeActionParticles.current = activeActionParticles.current.filter(p => {
            if (!p.graphics || p.graphics.destroyed) return false;
            p.life -= p.decay;
            if (p.life <= 0) { try { p.graphics.destroy(); } catch (err) {} return false; }
            try { p.graphics.x += p.vx; p.graphics.y += p.vy; p.graphics.alpha = p.life; return true; } catch (err) { return false; }
        });

        const hid = useEphemeralStore.getState().hoveredHexId;
        if (hid !== hoverRef.current) {
            const prev = hoverRef.current ? hexCache.current.get(hoverRef.current) : null;
            if (prev) {
                const o = prev.getChildByName('hoverOutline'); if (o) o.visible = false;
                const gp = prev.getChildByName('ghost_preview'); if (gp) { try { gp.visible = false; } catch (e) {} }
                const gt = prev.getChildByName('ghost_text'); if (gt) { try { gt.visible = false; } catch (e) {} }
            }
            const cur = hid ? hexCache.current.get(hid) : null;
            if (cur) {
                const o = cur.getChildByName('hoverOutline');
                if (o) o.visible = !!(cur as any).isRevealed;
                if (playerGrowthIntent === 'UPGRADE' && !!(cur as any).isRevealed) {
                    const cachedProps = hexPropsCache.current.get(cur);
                    if (cachedProps) {
                        let ghostPreview = cur.getChildByName('ghost_preview') as PIXI.Graphics;
                        if (!ghostPreview) { ghostPreview = new PIXI.Graphics(); ghostPreview.name = 'ghost_preview'; ghostPreview.zIndex = 30; cur.addChild(ghostPreview); }
                        ghostPreview.visible = true; ghostPreview.clear();
                        const nextOffsetY = cachedProps.offsetY - 8;
                        const angleRad = rotation * (Math.PI / 180);
                        const cos = Math.cos(angleRad), sin = Math.sin(angleRad);
                        const rbp = BASE_POINTS.map(pt => ({ x: pt.x * cos - pt.y * sin, y: pt.x * sin + pt.y * cos }));
                        ghostPreview.beginPath();
                        rbp.forEach((pt, j) => { const px = pt.x, py = pt.y * 0.8 + nextOffsetY; if (j === 0) ghostPreview.moveTo(px, py); else ghostPreview.lineTo(px, py); });
                        ghostPreview.closePath();
                        ghostPreview.stroke({ width: 2.0, color: 0x10b981, alpha: 0.95 });
                        ghostPreview.fill({ color: 0x10b981, alpha: 0.28 });
                        rbp.forEach(pt => { ghostPreview.beginPath(); ghostPreview.moveTo(pt.x, pt.y * 0.8 + cachedProps.offsetY); ghostPreview.lineTo(pt.x, pt.y * 0.8 + nextOffsetY); ghostPreview.stroke({ width: 1.0, color: 0x10b981, alpha: 0.5 }); });
                        let ghostText = cur.getChildByName('ghost_text') as PIXI.Text;
                        if (!ghostText) { ghostText = new PIXI.Text({ text: `+L${cachedProps.level + 1}`, style: { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', fill: 0x10b981, stroke: { color: 0x000000, width: 2.5 } } }); ghostText.name = 'ghost_text'; ghostText.anchor.set(0.5, 0.5); ghostText.zIndex = 31; cur.addChild(ghostText); }
                        ghostText.visible = true; ghostText.y = nextOffsetY - 12;
                    }
                }
            }
            hoverRef.current = hid;
        }

        const renderItemMap = new Map<string, any>();
        activeRenderItems.forEach(item => renderItemMap.set(item.id, item));

        hexCache.current.forEach((container, hexId) => {
            const objArrow = (container as any).objectiveArrowNode || container.getChildByName('objective_arrow');
            if (objArrow) {
                (container as any).objectiveArrowNode = objArrow;
                if (objArrow.visible) {
                    const hexItem = renderItemMap.get(hexId);
                    const faceY = hexItem?.props?.offsetY ?? 0;
                    objArrow.y = faceY - 35 + Math.min(0, Math.sin(nowTime * 0.006) * 6);
                    const arrowArt = (objArrow as any).arrowArtNode || objArrow.getChildByName('arrow_art');
                    if (arrowArt) { (objArrow as any).arrowArtNode = arrowArt; if (arrowArt instanceof PIXI.Text) arrowArt.rotation = Math.sin(nowTime * 0.003) * 0.15; }
                }
            }
            const portalNode = (container as any).portalNode || container.getChildByName('portal');
            if (portalNode) { (container as any).portalNode = portalNode; if (portalNode.visible) portalNode.rotation += 0.05; }
            
            // Void Flicker Animation (Deep Abyss Pulse)
            const voidFlickerNode = (container as any).voidFlickerNode || container.getChildByName('voidFlicker');
            if (voidFlickerNode) {
                (container as any).voidFlickerNode = voidFlickerNode;
                if (voidFlickerNode.visible) {
                    voidFlickerNode.alpha = 0.6 + 0.4 * Math.sin(nowTime / 200);
                    voidFlickerNode.scale.set(1.0 + 0.05 * Math.sin(nowTime / 150), 1.0 + 0.05 * Math.sin(nowTime / 150));
                }
            }
            
            // Damage Layer Pulse (Warning Effect)
            const damageLayer = (container as any).damageLayerNode || container.getChildByName('damageLayer');
            if (damageLayer && damageLayer.visible) {
                const isC = (container as any).isCriticalDamage;
                damageLayer.alpha = isC ? (0.5 + 0.5 * Math.sin(nowTime / 80)) : (0.8 + 0.2 * Math.sin(nowTime / 300));
            }

            // L4+ Face Pulse (Reactor Overdrive)
            const faceContainer = container.getChildByName('faceContainer');
            if (faceContainer && faceContainer.visible) {
                const cachedProps = hexPropsCache.current.get(container);
                if (cachedProps && cachedProps.level >= 4) {
                    faceContainer.alpha = 0.9 + 0.1 * Math.sin(nowTime / 400);
                }
            }
        });

        const now = Date.now();
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad), sin = Math.sin(angleRad);

        unitAnimStates.current.forEach((state: any, unitId: string) => {
            const container = unitCache.current.get(unitId);
            if (!container) return;
            const shadow = container.getChildByName('shadow') as PIXI.Graphics;
            const ring = container.getChildByName('ring') as PIXI.Graphics;
            const sprite = container.getChildByName('sprite') as PIXI.Sprite;

            const uQ = state.isMoving ? state.currentQ : state.targetQ;
            const uR = state.isMoving ? state.currentR : state.targetR;
            const distToPlayer = cubeDistance({ q: playerQ, r: playerR }, { q: uQ, r: uR });
            const sessionElapsed = now - sessionStartTimeRef.current;
            let entranceYOffset = 0;
            if (sessionElapsed < 1800) { const e = Math.max(0, sessionElapsed - distToPlayer * 100); if (e < 800) entranceYOffset = -500 * Math.pow(1 - e / 800, 3); }
            let victoryYOffset = 0;
            if (victoryStartTimeRef.current !== null) { const e = Math.max(0, now - victoryStartTimeRef.current - distToPlayer * 100); if (e > 0) victoryYOffset = e * 0.18; }

            if (state.isMoving) {
                const elapsed = now - state.startTime;
                const progress = Math.min(1.0, elapsed / state.stepDuration);
                let ease = progress;
                if (state.moveMode === 'FIRST') ease = progress * progress * (1.5 - 0.5 * progress);
                else if (state.moveMode === 'LAST') ease = 1.5 * progress - 0.5 * (progress * progress * progress);
                else if (state.moveMode === 'SINGLE') ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
                const ec = Math.max(0, Math.min(1, ease));

                const startRawX = HEX_SIZE * (Math.sqrt(3) * state.startQ + Math.sqrt(3)/2 * state.startR);
                const startRawY = HEX_SIZE * 1.5 * state.startR;
                const startPx = startRawX * cos - startRawY * sin;
                const startPy = (startRawX * sin + startRawY * cos) * 0.8;
                const targetRawX = HEX_SIZE * (Math.sqrt(3) * state.targetQ + Math.sqrt(3)/2 * state.targetR);
                const targetRawY = HEX_SIZE * 1.5 * state.targetR;
                const targetPx = targetRawX * cos - targetRawY * sin;
                const targetPy = (targetRawX * sin + targetRawY * cos) * 0.8;

                state.currentQ = state.startQ + (state.targetQ - state.startQ) * ec;
                state.currentR = state.startR + (state.targetR - state.startR) * ec;
                state.currentLevel = state.startLevel + (state.targetLevel - state.startLevel) * ec;

                container.x = startPx + (targetPx - startPx) * ec;
                container.y = startPy + (targetPy - startPy) * ec + entranceYOffset + victoryYOffset;
                container.zIndex = container.y + 1 + (state.currentQ * 0.0001) + (state.currentR * 0.00001);
                
                const startZ = getHexVisualHeight(state.startLevel);
                const targetZ = getHexVisualHeight(state.targetLevel);
                const curGroundZ = startZ + (targetZ - startZ) * ec;
                let jumpY = 0, scaleX = state.facingLeft ? -1 : 1, scaleY = 1.0;

                if (state.startQ !== state.targetQ || state.startR !== state.targetR) {
                    jumpY = -Math.sin(progress * Math.PI) * 80;
                    if (progress < 0.15) { const s = 0.2 * Math.sin((progress / 0.15) * Math.PI); scaleY = 1.0 - s; scaleX = (state.facingLeft ? -1.0 : 1.0) * (1.0 + s * 0.5); }
                    else if (progress < 0.85) { const s = 0.15 * Math.sin(((progress - 0.15) / 0.7) * Math.PI); scaleY = 1.0 + s; scaleX = (state.facingLeft ? -1.0 : 1.0) * (1.0 - s * 0.4); }
                    else { const s = 0.25 * Math.sin(((progress - 0.85) / 0.15) * Math.PI); scaleY = 1.0 - s; scaleX = (state.facingLeft ? -1.0 : 1.0) * (1.0 + s * 0.6); }
                }

                if (sprite) { sprite.y = curGroundZ + jumpY; sprite.scale.set(scaleX, scaleY); }
                if (ring) { ring.y = curGroundZ + jumpY; ring.scale.set(scaleX, scaleY); }
                if (shadow) { shadow.y = curGroundZ; const arc = Math.sin(progress * Math.PI); shadow.scale.set((1.0 - arc * 0.5) / Math.abs(scaleX), (1.0 - arc * 0.5) / Math.abs(scaleX)); shadow.alpha = 0.4 - arc * 0.25; }

                if (progress >= 1.0) {
                    state.isMoving = false;
                    state.startQ = state.targetQ; state.startR = state.targetR; state.startLevel = state.targetLevel;
                    state.currentQ = state.targetQ; state.currentR = state.targetR; state.currentLevel = state.targetLevel;
                    container.x = targetPx; container.y = targetPy + entranceYOffset + victoryYOffset;
                    container.zIndex = targetPy + 1 + (state.targetQ * 0.0001) + (state.targetR * 0.00001);
                    if (sprite) { sprite.y = targetZ; sprite.scale.set(state.facingLeft ? -1.0 : 1.0, 1.0); }
                    if (shadow) { shadow.y = targetZ; shadow.scale.set(1, 1); shadow.alpha = 0.4; }
                }
            } else {
                const targetRawX = HEX_SIZE * (Math.sqrt(3) * state.targetQ + Math.sqrt(3)/2 * state.targetR);
                const targetRawY = HEX_SIZE * 1.5 * state.targetR;
                const targetPx = targetRawX * cos - targetRawY * sin;
                const targetPy = (targetRawX * sin + targetRawY * cos) * 0.8;
                container.x = targetPx; container.y = targetPy + entranceYOffset + victoryYOffset;
                container.zIndex = targetPy + 1 + (state.targetQ * 0.0001) + (state.targetR * 0.00001);
                const targetZ = getHexVisualHeight(state.targetLevel);
                if (sprite) sprite.y = targetZ;
                if (shadow) { shadow.y = targetZ; shadow.scale.set(1, 1); shadow.alpha = 0.4; }
            }

            if (unitId === player?.id) {
                let actionOverlay = container.getChildByName('actionOverlay') as PIXI.Container;
                if (!isPlayerGrowing || state.isMoving || gameStatus === 'VICTORY' || gameStatus === 'DEFEAT' || evacuationActive) {
                    if (actionOverlay) actionOverlay.visible = false;
                    if (activeActionParticles.current.length > 0) { activeActionParticles.current.forEach(p => { try { p.graphics.destroy(); } catch (err) {} }); activeActionParticles.current = []; }
                } else {
                    if (!actionOverlay) { actionOverlay = new PIXI.Container(); actionOverlay.name = 'actionOverlay'; container.addChild(actionOverlay); }
                    actionOverlay.visible = true;
                    const currentHex = grid && selectedHexId ? grid[selectedHexId] : null;
                    const pZ = getHexVisualHeight(currentHex ? currentHex.currentLevel : state.targetLevel);
                    actionOverlay.y = pZ;
                    const isRu = sessionLanguage === 'RU';
                    const growthType = playerGrowthIntent || 'UPGRADE';
                    let needed = 30;
                    if (growthType === 'RECOVER' && currentHex) needed = getLevelConfig(currentHex.maxLevel)?.growthTime ?? 30;
                    else if (growthType === 'DIG') needed = 30;
                    else if (currentHex) needed = getLevelConfig(currentHex.currentLevel + 1)?.growthTime ?? 30;
                    const targetPercent = currentHex && needed > 0 ? Math.min(1.0, currentHex.progress / needed) : 0;
                    let color = 0xf59e0b, prgColorHexStr = '#10b981';
                    if (growthType === 'DIG') { color = 0xef4444; prgColorHexStr = '#ef4444'; }
                    else if (growthType === 'RECOVER') { color = 0x3b82f6; prgColorHexStr = '#3b82f6'; }

                    let gRing = actionOverlay.getChildByName('gRing') as PIXI.Graphics;
                    if (!gRing) { gRing = new PIXI.Graphics(); gRing.name = 'gRing'; actionOverlay.addChild(gRing); }
                    gRing.clear(); gRing.rotation += 0.04; gRing.scale.y = 0.6;
                    for (let i = 0; i < 12; i++) {
                        const dx = Math.cos((2 * Math.PI * i) / 12) * 24, dy = Math.sin((2 * Math.PI * i) / 12) * 24;
                        if (targetPercent >= (i + 1) / 12) { gRing.circle(dx, dy, 2.5); gRing.fill({ color, alpha: 0.95 }); gRing.stroke({ width: 0.8, color: 0xffffff }); }
                        else { gRing.circle(dx, dy, 1.2); gRing.fill({ color: 0xffffff, alpha: 0.3 }); }
                    }
                    if (Math.random() < 0.3 && activeActionParticles.current.length < 25) {
                        const pG = new PIXI.Graphics(); pG.circle(0, 0, 1.2 + Math.random() * 2.2); pG.fill({ color });
                        pG.x = (Math.random() - 0.5) * 20; pG.y = -3 + (Math.random() - 0.5) * 5; pG.zIndex = 30;
                        actionOverlay.addChild(pG);
                        activeActionParticles.current.push({ graphics: pG, vx: (Math.random() - 0.5) * 1.5, vy: -1.2 - Math.random() * 1.8, life: 1.0, decay: 0.02 + Math.random() * 0.03 });
                    }
                    let hudPill = actionOverlay.getChildByName('hudPill') as PIXI.Container;
                    if (!hudPill) { hudPill = new PIXI.Container(); hudPill.name = 'hudPill'; actionOverlay.addChild(hudPill); }
                    hudPill.y = -64 + Math.sin(Date.now() / 200) * 3.2;
                    let pillBg = hudPill.getChildByName('pillBg') as PIXI.Graphics;
                    if (!pillBg) { pillBg = new PIXI.Graphics(); pillBg.name = 'pillBg'; hudPill.addChild(pillBg); }
                    pillBg.clear(); pillBg.roundRect(-28, -11, 56, 22, 5); pillBg.fill({ color: 0x0b132b, alpha: 0.92 }); pillBg.stroke({ width: 1.2, color });
                    pillBg.circle(-18, 0, 8); pillBg.fill({ color: 0x0b132b, alpha: 0.96 }); pillBg.stroke({ width: 1.0, color });
                    let pillIcon = hudPill.getChildByName('pillIcon') as PIXI.Graphics;
                    if (!pillIcon) { pillIcon = new PIXI.Graphics(); pillIcon.name = 'pillIcon'; hudPill.addChild(pillIcon); }
                    pillIcon.clear(); pillIcon.x = -18; pillIcon.y = 0;
                    if (growthType === 'DIG') { pillIcon.rotation = Math.sin(Date.now() / 100) * 0.4 - 0.3; pillIcon.strokeStyle = { width: 1.5, color: 0xcbd5e1 }; pillIcon.moveTo(0, 3); pillIcon.lineTo(0, -4); pillIcon.stroke(); }
                    else if (growthType === 'UPGRADE') { pillIcon.rotation = Math.sin(Date.now() / 80) * 0.25 - 0.15; pillIcon.strokeStyle = { width: 1.5, color: 0xcbd5e1 }; pillIcon.moveTo(-1, 3); pillIcon.lineTo(1, -1); pillIcon.stroke(); pillIcon.rect(-3, -4, 6, 4); pillIcon.fill({ color: 0xf59e0b }); }
                    else { pillIcon.rotation += 0.08; pillIcon.circle(0, 0, 4); pillIcon.stroke({ width: 1.5, color: 0x3b82f6 }); pillIcon.circle(0, 0, 1.5); pillIcon.fill({ color: 0x93c5fd }); }
                    let labelText = hudPill.getChildByName('labelText') as PIXI.Text;
                    if (!labelText) { labelText = new PIXI.Text({ text: '', style: { fontSize: 7.5, align: 'left', fill: prgColorHexStr, fontFamily: 'JetBrains Mono, monospace', fontWeight: 'bold' } }); labelText.name = 'labelText'; hudPill.addChild(labelText); }
                    labelText.text = growthType === 'DIG' ? (isRu ? 'БУР' : 'DIG') : growthType === 'UPGRADE' ? (isRu ? 'СТРОЙ' : 'BUILD') : (isRu ? 'СЪЕМ' : 'SIPHON');
                    labelText.style.fill = prgColorHexStr; labelText.x = -6; labelText.y = -8;
                    let prgText = hudPill.getChildByName('prgText') as PIXI.Text;
                    if (!prgText) { prgText = new PIXI.Text({ text: '', style: { fontSize: 7.5, align: 'right', fill: '#ffffff', fontFamily: 'JetBrains Mono, monospace', fontWeight: 'bold' } }); prgText.name = 'prgText'; hudPill.addChild(prgText); }
                    prgText.text = `${Math.round(targetPercent * 100)}%`; prgText.x = 10; prgText.y = -8;
                    let pBarUnder = hudPill.getChildByName('pBarUnder') as PIXI.Graphics;
                    if (!pBarUnder) { pBarUnder = new PIXI.Graphics(); pBarUnder.name = 'pBarUnder'; hudPill.addChild(pBarUnder); }
                    pBarUnder.clear(); pBarUnder.roundRect(-6, 3, 30, 3, 1); pBarUnder.fill({ color: 0x1e293b, alpha: 0.95 });
                    if (targetPercent > 0.01) { pBarUnder.roundRect(-6, 3, 30 * targetPercent, 3, 1); pBarUnder.fill({ color }); }
                }
            }

            const dynContainer = container as any;
            if (unitId === player?.id && gameStatus === 'VICTORY') {
                if (sprite) {
                    if (dynContainer.victoryStart === undefined) dynContainer.victoryStart = Date.now();
                    const elapsed = Date.now() - dynContainer.victoryStart;
                    const targetZ = getHexVisualHeight(state.targetLevel);
                    sprite.y = targetZ; sprite.rotation += 0.05; sprite.alpha = Math.max(0, 1.0 - elapsed / 2500);
                    let victoryBeam = container.getChildByName('victoryBeam') as PIXI.Graphics;
                    if (!victoryBeam) { victoryBeam = new PIXI.Graphics(); victoryBeam.name = 'victoryBeam'; victoryBeam.zIndex = -1; container.addChild(victoryBeam); }
                    victoryBeam.visible = true; victoryBeam.clear();
                    const beamAlpha = Math.min(0.6, elapsed / 500) * Math.max(0, 1.0 - elapsed / 3000);
                    const beamWidth = 30 + Math.sin(elapsed / 100) * 5;
                    victoryBeam.beginPath(); victoryBeam.ellipse(0, targetZ, beamWidth, beamWidth * 0.5); victoryBeam.fill({ color: 0x10b981, alpha: beamAlpha * 0.3 }); victoryBeam.stroke({ width: 2, color: 0x34d399, alpha: beamAlpha });
                    victoryBeam.beginPath(); victoryBeam.moveTo(-beamWidth, targetZ); victoryBeam.lineTo(-beamWidth * 0.6, targetZ - 300); victoryBeam.lineTo(beamWidth * 0.6, targetZ - 300); victoryBeam.lineTo(beamWidth, targetZ); victoryBeam.closePath(); victoryBeam.fill({ color: 0x059669, alpha: beamAlpha * 0.15 });
                    victoryBeam.beginPath(); victoryBeam.moveTo(0, targetZ); victoryBeam.lineTo(0, targetZ - 300); victoryBeam.stroke({ width: 4 + Math.sin(elapsed / 50) * 2, color: 0xa7f3d0, alpha: beamAlpha * 0.8 });
                    let victoryParticles = container.getChildByName('victoryParticles') as PIXI.Graphics;
                    if (!victoryParticles) {
                        victoryParticles = new PIXI.Graphics(); victoryParticles.name = 'victoryParticles'; victoryParticles.zIndex = 5; container.addChild(victoryParticles);
                        dynContainer.vParts = Array.from({ length: 40 }, () => ({ angle: Math.random() * Math.PI * 2, radius: 5 + Math.random() * 35, speedY: 1.5 + Math.random() * 3.0, size: 1.5 + Math.random() * 3.5, color: [0x10b981, 0x059669, 0x34d399, 0xf59e0b, 0x60a5fa, 0xffffff][Math.floor(Math.random() * 6)], yOffset: Math.random() * 100, driftSpeed: (Math.random() - 0.5) * 0.02 }));
                    }
                    victoryParticles.visible = true; victoryParticles.clear();
                    if (dynContainer.vParts) {
                        dynContainer.vParts.forEach((p: any) => {
                            p.yOffset += p.speedY; p.angle += p.driftSpeed;
                            if (p.yOffset > 300) { p.yOffset = 0; p.radius = 5 + Math.random() * 35; }
                            const px = Math.cos(p.angle) * p.radius, py = targetZ - p.yOffset + Math.sin(p.angle) * p.radius * 0.5;
                            const pAlpha = beamAlpha * Math.min(1.0, (300 - p.yOffset) / 80);
                            victoryParticles.beginPath(); victoryParticles.circle(px, py, p.size); victoryParticles.fill({ color: p.color, alpha: pAlpha });
                        });
                    }
                    let victoryHolo = container.getChildByName('victoryHolo') as PIXI.Container;
                    if (!victoryHolo) {
                        victoryHolo = new PIXI.Container(); victoryHolo.name = 'victoryHolo'; victoryHolo.zIndex = 20; container.addChild(victoryHolo);
                        const holoBg = new PIXI.Graphics(); holoBg.name = 'holoBg'; victoryHolo.addChild(holoBg);
                        const isRu = sessionLanguage === 'RU';
                        const holoText = new PIXI.Text({ text: isRu ? 'СТАБИЛЬНОСТЬ ВОССТАНОВЛЕНА' : 'NEXUS STABILITY RESTORED', style: { fontFamily: 'Space Grotesk, Inter, sans-serif', fontSize: 12, fontWeight: '900', fill: 0x34d399, stroke: { color: 0x064e3b, width: 3 }, align: 'center', letterSpacing: 2 } });
                        holoText.name = 'holoText'; holoText.anchor.set(0.5, 0.5); victoryHolo.addChild(holoText);
                    }
                    victoryHolo.visible = true;
                    victoryHolo.y = targetZ - 130 + Math.sin(elapsed / 150) * 5;
                    victoryHolo.alpha = Math.min(1.0, elapsed / 800) * Math.max(0, 1.0 - elapsed / 3000);
                    victoryHolo.scale.set(1.0 + 0.05 * Math.sin(elapsed / 120));
                    const hBg = victoryHolo.getChildByName('holoBg') as PIXI.Graphics;
                    if (hBg) {
                        hBg.clear(); const w = 180 + Math.sin(elapsed / 100) * 15;
                        hBg.roundRect(-w / 2, -12, w, 24, 4); hBg.fill({ color: 0x064e3b, alpha: 0.4 * victoryHolo.alpha }); hBg.stroke({ width: 1.5, color: 0x34d399, alpha: 0.8 * victoryHolo.alpha });
                        const scanY = -12 + ((elapsed / 2) % 24); hBg.beginPath(); hBg.moveTo(-w / 2 + 2, scanY); hBg.lineTo(w / 2 - 2, scanY); hBg.stroke({ width: 1.0, color: 0xa7f3d0, alpha: 0.6 * victoryHolo.alpha });
                    }
                    if (shadow) { shadow.alpha = 0.4 * Math.max(0, 1.0 - elapsed / 1500); shadow.scale.set(Math.max(0, 1.0 - elapsed / 1500)); }
                }
                if (ring && ring.alpha > 0.01) { ring.scale.set(ring.scale.x * 0.9, ring.scale.y * 0.9); ring.alpha *= 0.9; } else if (ring) ring.alpha = 0;
            } else if (unitId === player?.id && (gameStatus === 'DEFEAT' || evacuationActive)) {
                if (sprite) {
                    const curSx = Math.abs(sprite.scale.x), curSy = sprite.scale.y;
                    if (curSx > 0.01 || curSy > 0.01) { sprite.scale.set(state.facingLeft ? -curSx * 0.8 : curSx * 0.8, curSy * 0.8); sprite.rotation += 0.3; }
                    else { sprite.scale.set(0, 0); sprite.rotation = 0; }
                    if (shadow) { shadow.alpha = 0.4 * curSx; shadow.scale.set(curSx, curSy); }
                }
                if (ring && ring.alpha > 0.01) { ring.scale.set(ring.scale.x * 0.8, ring.scale.y * 0.8); ring.alpha *= 0.8; } else if (ring) ring.alpha = 0;
            } else {
                if (sprite && !state.isMoving) { sprite.rotation = 0; sprite.scale.set(state.facingLeft ? -1.0 : 1.0, 1.0); sprite.alpha = 1.0; }
                if (ring && !state.isMoving) { ring.scale.set(1, 1); ring.alpha = 0.6; }
                if (dynContainer.victoryStart !== undefined) {
                    dynContainer.victoryStart = undefined;
                    const vb = container.getChildByName('victoryBeam'); if (vb) vb.visible = false;
                    const vp = container.getChildByName('victoryParticles'); if (vp) vp.visible = false;
                    const vh = container.getChildByName('victoryHolo'); if (vh) vh.visible = false;
                }
            }
        });

        const parent = renderItemsContainerRef.current;
        if (parent) {
            let laserGraphics = parent.getChildByName('botLasers') as PIXI.Graphics;
            if (!laserGraphics) { laserGraphics = new PIXI.Graphics(); laserGraphics.name = 'botLasers'; laserGraphics.zIndex = 999999; parent.addChild(laserGraphics); }
            laserGraphics.clear();
            if (bots && bots.length > 0 && grid) {
                bots.forEach(bot => {
                    const queue = bot.movementQueue;
                    const isGrowing = bot.state === 'GROWING' || (queue && queue.length > 0 && queue[0].upgrade);
                    if (!isGrowing) return;
                    const botContainer = unitCache.current.get(bot.id);
                    if (!botContainer || !queue || queue.length === 0) return;
                    const targetCoord = queue[0];
                    if (isDefenseMode && cubeDistance({ q: bot.q, r: bot.r }, { q: targetCoord.q, r: targetCoord.r }) > 1) return;
                    const targetKey = getHexKey(targetCoord.q, targetCoord.r);
                    const targetHexContainer = hexCache.current.get(targetKey);
                    if (!targetHexContainer) return;
                    const botSprite = botContainer.getChildByName('sprite') as PIXI.Sprite;
                    const botZ = botSprite ? botSprite.y : 0;
                    const startX = botContainer.x, startY = botContainer.y + botZ - 12;
                    const targetLevel = grid[targetKey]?.currentLevel ?? 0;
                    const targetZ = getHexVisualHeight(targetLevel);
                    const endX = targetHexContainer.x, endY = targetHexContainer.y + targetZ;
                    const intent = (targetCoord.intent || 'UPGRADE') as string;
                    let color = 0x00f0ff;
                    if (intent === 'DIG') color = 0xff3366;
                    else if (intent === 'TURRET') color = 0xffaa00;
                    laserGraphics.strokeStyle = { width: 3.5, color: color, alpha: 0.85 };
                    laserGraphics.beginPath(); laserGraphics.moveTo(startX, startY); laserGraphics.lineTo(endX, endY); laserGraphics.stroke();
                    laserGraphics.strokeStyle = { width: 1.2, color: 0xffffff, alpha: 1.0 };
                    laserGraphics.beginPath(); laserGraphics.moveTo(startX, startY); laserGraphics.lineTo(endX, endY); laserGraphics.stroke();
                    const pulse = Math.sin(nowTime * 0.02) * 2;
                    laserGraphics.fillStyle = { color: color, alpha: 0.45 };
                    laserGraphics.beginPath(); laserGraphics.ellipse(endX, endY, 8 + pulse, 5 + pulse * 0.6); laserGraphics.fill();
                    laserGraphics.fillStyle = { color: 0xffffff, alpha: 0.75 };
                    laserGraphics.beginPath(); laserGraphics.ellipse(endX, endY, 3, 1.8); laserGraphics.fill();
                });
            }
        }
    };

    const latestUpdateSceneLoop = useRef<() => void>(updateSceneLoop);
    latestUpdateSceneLoop.current = updateSceneLoop;
    const tickerCallbackRef = useRef<() => void>(() => { latestUpdateSceneLoop.current(); });

    // Main Render Effect with VFX Enhancements (Depth Fog, Drop Shadows)
    useEffect(() => {
        const parent = renderItemsContainerRef.current;
        if (!parent || !activeRenderItems.length || !grid) return;

        const activeHexIds = new Set<string>();
        const activeUnitIds = new Set<string>();
        const isRu = sessionLanguage === 'RU';
        const angleRad = rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const rotatedBasePoints = BASE_POINTS.map(pt => ({ x: pt.x * cos - pt.y * sin, y: pt.x * sin + pt.y * cos }));
        const hoveredHexId = useEphemeralStore.getState().hoveredHexId;
        const completedShapeCoords = useGameStore.getState().session?.completedShapeCoords || [];
        const isLevelComplete = areAllConditionsMet(session, activeLevelConfig);

        activeRenderItems.forEach(item => {
            if (item.type === 'HEX') {
                activeHexIds.add(item.id);
                const props = item.props;
                const hex = grid[item.id];
                if (!hex) return;

                const isRevealed = !!props.isRevealed;
                const isFinish = isFinishTile(props.q, props.r, activeLevelConfig) || props.structureType === 'MONUMENT' || props.structureType === 'PORTAL' || (session?.portalHex && session.portalHex.q === props.q && session.portalHex.r === props.r);
                let curContainer = hexCache.current.get(item.id);

                if (!curContainer) {
                    curContainer = new PIXI.Container();
                    curContainer.name = item.id;
                    curContainer.sortableChildren = true;
                    parent.addChild(curContainer);
                    hexCache.current.set(item.id, curContainer);
                }
                (curContainer as any).isRevealed = isRevealed;

                const cx = props.x * cos - props.y * sin;
                const cy = (props.x * sin + props.y * cos) * 0.8;
                curContainer.x = cx; curContainer.y = cy; curContainer.zIndex = item.depth;
                curContainer.alpha = props.opacity;

                const theme = getTheme(item.props.isRevealed ? hex.maxLevel : 0);
                const isRealVoid = props.structureType === 'VOID';
                const costMoves = pendingConfirmation?.data?.costMoves;
                const costCoins = pendingConfirmation?.data?.costCoins;
                const gradientLockStatus = !!recentGradientLock;

                const cProps = hexPropsCache.current.get(curContainer);
                let isDirty = !cProps || cProps.rotation !== rotation ||
                    cProps.offsetY !== props.offsetY || cProps.level !== props.level || cProps.maxLevel !== props.maxLevel ||
                    cProps.structureType !== props.structureType || cProps.isSelected !== props.isSelected ||
                    cProps.isPending !== props.isPending || cProps.isOccupied !== props.isOccupied ||
                    cProps.isGrowing !== props.isGrowing || cProps.isRankLocked !== props.isRankLocked ||
                    cProps.progress !== props.progress || cProps.durability !== props.durability ||
                    cProps.artifactType !== props.artifactType || cProps.poiType !== props.poiType ||
                    cProps.hologramTargetLevel !== props.hologramTargetLevel || cProps.isPassable !== props.isPassable ||
                    cProps.isRevealed !== props.isRevealed || cProps.lighting !== props.lighting ||
                    cProps.drawVoidWalls !== props.drawVoidWalls || cProps.costMoves !== costMoves ||
                    cProps.costCoins !== costCoins || cProps.gradientLockStatus !== gradientLockStatus;

                if (!isDirty) {
                    for (let i = 0; i < 6; i++) { if (cProps.neighborLevels[i] !== props.neighborLevels[i]) { isDirty = true; break; } }
                }

                if (!isDirty) {
                    const hoverOutline = curContainer.getChildByName('hoverOutline') as PIXI.Graphics;
                    if (hoverOutline) hoverOutline.visible = (hoveredHexId === item.id) && isRevealed;
                    return;
                }

                hexPropsCache.current.set(curContainer, {
                    rotation, offsetY: props.offsetY, level: props.level, maxLevel: props.maxLevel, structureType: props.structureType,
                    neighborLevels: [...props.neighborLevels], isSelected: props.isSelected, isPending: props.isPending, isOccupied: props.isOccupied,
                    isGrowing: props.isGrowing, isRankLocked: props.isRankLocked, progress: props.progress, durability: props.durability,
                    artifactType: props.artifactType, poiType: props.poiType, hologramTargetLevel: props.hologramTargetLevel,
                    isPassable: props.isPassable, isRevealed: props.isRevealed, lighting: props.lighting, drawVoidWalls: props.drawVoidWalls,
                    costMoves, costCoins, gradientLockStatus,
                });

                let baseLayer = curContainer.getChildByName('base') as PIXI.Graphics;
                if (!baseLayer) { baseLayer = new PIXI.Graphics(); baseLayer.name = 'base'; baseLayer.zIndex = 0; curContainer.addChild(baseLayer); }
                baseLayer.clear();

                if (!isRealVoid) {
                    rotatedBasePoints.forEach((pt) => {
                        if (props.offsetY < -1) {
                            baseLayer.strokeStyle = { width: 0.8, color: 0x6366f1, alpha: 0.15 };
                            baseLayer.moveTo(pt.x, pt.y * 0.8); baseLayer.lineTo(pt.x, props.offsetY + pt.y * 0.8); baseLayer.stroke();
                        }
                    });
                }

                let borderLayer = curContainer.getChildByName('border') as PIXI.Graphics;
                if (!borderLayer) { borderLayer = new PIXI.Graphics(); borderLayer.name = 'border'; borderLayer.zIndex = 20; curContainer.addChild(borderLayer); }
                borderLayer.clear();
                
                const faceY = props.offsetY;

                if (isRealVoid && (props.drawVoidWalls !== false)) {
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => { const px = pt.x, py = pt.y * 0.8 + faceY; if (j === 0) borderLayer.moveTo(px, py); else borderLayer.lineTo(px, py); });
                    borderLayer.closePath(); borderLayer.fill({ color: 0x0a0a0a });

                    let voidFlickerNode = curContainer.getChildByName('voidFlicker') as PIXI.Graphics;
                    if (!voidFlickerNode) { voidFlickerNode = new PIXI.Graphics(); voidFlickerNode.name = 'voidFlicker'; curContainer.addChild(voidFlickerNode); }
                    voidFlickerNode.zIndex = 22; voidFlickerNode.visible = true; (curContainer as any).voidFlickerNode = voidFlickerNode;
                    voidFlickerNode.clear(); voidFlickerNode.y = 0; voidFlickerNode.scale.set(1, 1); voidFlickerNode.rotation = 0;

                    const numHexLayers = 3;
                    for (let step = 0; step < numHexLayers; step++) {
                        const s = 1.0 - (step / numHexLayers) * 0.95;
                        const alphaVal = 0.05 + 0.6 * Math.pow(1.0 - s, 2.0);
                        voidFlickerNode.beginPath();
                        rotatedBasePoints.forEach((pt, j) => { const px = pt.x * s, py = pt.y * 0.8 * s + faceY; if (j === 0) voidFlickerNode.moveTo(px, py); else voidFlickerNode.lineTo(px, py); });
                        voidFlickerNode.closePath(); voidFlickerNode.fill({ color: 0xef4444, alpha: alphaVal });
                    }
                    // Draw red outline only on boundaries where neighbor is not a visible VOID hex
                    for (let i = 0; i < 6; i++) {
                        const next = (i + 1) % 6;
                        const nIndex = 5 - i;
                        const d = NEIGHBOR_DIRECTIONS[nIndex];
                        const nKey = getHexKey(props.q + d.q, props.r + d.r);
                        const nHex = grid[nKey];
                        const isNeighborVisible = nHex && (nHex.revealed || forceReveal);
                        const isNeighborVoid = nHex && nHex.structureType === 'VOID';

                        if (!(isNeighborVisible && isNeighborVoid)) {
                            const pt0 = rotatedBasePoints[i], pt1 = rotatedBasePoints[next];
                            const x1 = pt0.x, y1 = pt0.y * 0.8 + faceY, x2 = pt1.x, y2 = pt1.y * 0.8 + faceY;
                            voidFlickerNode.beginPath();
                            voidFlickerNode.moveTo(x1, y1);
                            voidFlickerNode.lineTo(x2, y2);
                            voidFlickerNode.stroke({ width: 3.0, color: 0xef4444, alignment: 1.0 });
                        }
                    }
                    voidFlickerNode.rotation = 0;

                    const existingCircleGlow = curContainer.getChildByName('voidCircleGlow');
                    if (existingCircleGlow) existingCircleGlow.visible = false;

                    for (let i = 0; i < 6; i++) {
                        const next = (i + 1) % 6;
                        const pt0 = rotatedBasePoints[i], pt1 = rotatedBasePoints[next];
                        if ((pt0.y + pt1.y) >= -0.01) {
                            const nIndex = 5 - i;
                            const d = NEIGHBOR_DIRECTIONS[nIndex];
                            const nKey = getHexKey(props.q + d.q, props.r + d.r);
                            const nHex = grid[nKey];
                            const isNeighborVisible = nHex && (nHex.revealed || forceReveal);

                            // Only draw a downwards wall if the neighbor is not visible (unrevealed or outside the map)
                            if (!isNeighborVisible) {
                                const VOID_DEPTH = MAX_WALL_DEPTH;
                                const x1 = pt0.x, y1 = pt0.y * 0.8 + faceY, x2 = pt1.x, y2 = pt1.y * 0.8 + faceY;
                                baseLayer.beginPath(); baseLayer.moveTo(x1, y1); baseLayer.lineTo(x2, y2); baseLayer.lineTo(x2, y2 + VOID_DEPTH); baseLayer.lineTo(x1, y1 + VOID_DEPTH); baseLayer.closePath();
                                baseLayer.fill({ color: 0x020617 }); baseLayer.strokeStyle = { width: 1.0, color: 0x1e293b }; baseLayer.stroke();
                            }
                        }
                    }
                } else if (!isRealVoid) {
                    const voidFlickerNode = curContainer.getChildByName('voidFlicker');
                    if (voidFlickerNode) voidFlickerNode.visible = false;
                    const voidCircleGlow = curContainer.getChildByName('voidCircleGlow');
                    if (voidCircleGlow) voidCircleGlow.visible = false;

                    for (let i = 0; i < 6; i++) {
                        const next = (i + 1) % 6;
                        const pt0 = rotatedBasePoints[i], pt1 = rotatedBasePoints[next];
                        if ((pt0.y + pt1.y) >= -0.01) {
                            const nIndex = 5 - i;
                            const nLevel = props.neighborLevels[nIndex];
                            let nY = 0;
                            if (nLevel === -99) nY = props.offsetY + VOID_SKIRT_DEPTH;
                            else nY = nLevel >= 0 ? -(10 + nLevel * 10) : Math.abs(nLevel + 1) * 10;

                            if (props.offsetY < nY) {
                                const heightDiff = nY - props.offsetY;
                                const x1 = pt0.x, y1 = pt0.y * 0.8 + props.offsetY, x2 = pt1.x, y2 = pt1.y * 0.8 + props.offsetY;
                                baseLayer.beginPath(); baseLayer.moveTo(x1, y1); baseLayer.lineTo(x2, y2); baseLayer.lineTo(x2, y2 + heightDiff); baseLayer.lineTo(x1, y1 + heightDiff); baseLayer.closePath();
                                baseLayer.fill({ color: theme.dark });
                                const bandDepth = heightDiff * 0.4;
                                baseLayer.beginPath(); baseLayer.moveTo(x1, y1); baseLayer.lineTo(x2, y2); baseLayer.lineTo(x2, y2 + bandDepth); baseLayer.lineTo(x1, y1 + bandDepth); baseLayer.closePath();
                                baseLayer.fill({ color: theme.main, alpha: 0.25 });
                                baseLayer.strokeStyle = { width: 1.5, color: theme.stroke };
                                baseLayer.beginPath(); baseLayer.moveTo(x1, y1); baseLayer.lineTo(x2, y2); baseLayer.lineTo(x2, y2 + heightDiff); baseLayer.lineTo(x1, y1 + heightDiff); baseLayer.closePath(); baseLayer.stroke();
                            }
                        }
                    }
                    
                    // Drop Shadows from Higher Neighbors
                    if (props.level >= 0) {
                        for (let i = 0; i < 6; i++) {
                            const nLevel = props.neighborLevels[5 - i];
                            if (nLevel > props.level + 1 && nLevel !== -99) {
                                const pt0 = rotatedBasePoints[i];
                                const pt1 = rotatedBasePoints[(i + 1) % 6];
                                const shadowDist = Math.min(20, (nLevel - props.level) * 5);
                                baseLayer.beginPath();
                                baseLayer.moveTo(pt0.x, pt0.y * 0.8 + props.offsetY);
                                baseLayer.lineTo(pt1.x, pt1.y * 0.8 + props.offsetY);
                                baseLayer.lineTo(pt1.x + (pt1.x > 0 ? shadowDist : -shadowDist), pt1.y * 0.8 + props.offsetY + shadowDist * 0.5);
                                baseLayer.lineTo(pt0.x + (pt0.x > 0 ? shadowDist : -shadowDist), pt0.y * 0.8 + props.offsetY + shadowDist * 0.5);
                                baseLayer.closePath();
                                baseLayer.fill({ color: 0x000000, alpha: 0.25 });
                            }
                        }
                    }
                }

                let faceContainer = curContainer.getChildByName('faceContainer') as PIXI.Container;
                if (!isRealVoid) {
                    const topCanvas = isFinish ? textureService.getTexture(0, props.q, props.r, undefined, 'PORTAL') : textureService.getTexture(props.level, props.q, props.r, undefined);
                    const tex = getPixiTexture(topCanvas);
                    if (!faceContainer) {
                        faceContainer = new PIXI.Container(); faceContainer.name = 'faceContainer'; faceContainer.zIndex = 10; curContainer.addChild(faceContainer);
                        const sprite = new PIXI.Sprite(tex); sprite.name = 'faceSprite'; sprite.anchor.set(0.5, 0.5); faceContainer.addChild(sprite);
                    }
                    const faceSprite = faceContainer.getChildByName('faceSprite') as PIXI.Sprite;
                    faceSprite.texture = tex; faceSprite.rotation = angleRad;
                    faceContainer.scale.set(HEX_SIZE / 32, (HEX_SIZE * 0.8) / 32);
                    faceContainer.y = props.offsetY; faceContainer.visible = true;

                    if (props.level === 1 && props.structureType !== 'VOID' && props.durability !== undefined && props.durability < 6 && isRevealed) {
                        let damageLayer = curContainer.getChildByName('damageLayer') as PIXI.Graphics;
                        if (!damageLayer) { damageLayer = new PIXI.Graphics(); damageLayer.name = 'damageLayer'; damageLayer.zIndex = 11; curContainer.addChild(damageLayer); }
                        const isCritical = props.durability <= 2;
                        (curContainer as any).damageLayerNode = damageLayer; (curContainer as any).isCriticalDamage = isCritical;
                        damageLayer.visible = true;
                        if (isDirty) {
                            damageLayer.clear();
                            let glowColor = 0xeab308, strokeColor = 0xfef08a;
                            switch (props.durability) { case 4: glowColor = 0xf59e0b; strokeColor = 0xfde047; break; case 3: glowColor = 0xf97316; strokeColor = 0xfdba74; break; case 2: glowColor = 0xea580c; strokeColor = 0xfca5a5; break; case 1: glowColor = 0xef4444; strokeColor = 0xfecaca; break; }
                            const numDamagedEdges = 6 - props.durability;
                            for (let i = 0; i < numDamagedEdges; i++) {
                                const p1 = rotatedBasePoints[i], p2 = rotatedBasePoints[(i + 1) % 6];
                                damageLayer.beginPath(); damageLayer.moveTo(p1.x, p1.y * 0.8 + faceY); damageLayer.lineTo(p2.x, p2.y * 0.8 + faceY);
                                damageLayer.stroke({ width: 7.0, color: glowColor, alpha: 0.45 });
                                damageLayer.beginPath(); damageLayer.moveTo(p1.x, p1.y * 0.8 + faceY); damageLayer.lineTo(p2.x, p2.y * 0.8 + faceY);
                                damageLayer.stroke({ width: 3.5, color: strokeColor, alpha: 1.0 });
                            }
                            const innerScale = (6 - props.durability) / 6;
                            if (innerScale > 0) {
                                damageLayer.beginPath();
                                rotatedBasePoints.forEach((pt, j) => { const px = pt.x * innerScale, py = pt.y * 0.8 * innerScale + faceY; if (j === 0) damageLayer.moveTo(px, py); else damageLayer.lineTo(px, py); });
                                damageLayer.closePath(); damageLayer.fill({ color: 0x180202, alpha: 0.88 }); damageLayer.stroke({ width: 2.2, color: strokeColor, alpha: 0.9 });
                            }
                        }
                    } else {
                        const damageLayer = curContainer.getChildByName('damageLayer') as PIXI.Graphics;
                        if (damageLayer) damageLayer.visible = false;
                    }

                    if (props.level >= 4 && isRevealed) {
                        let recoveryOverlay = curContainer.getChildByName('recoveryOverlay') as PIXI.Graphics;
                        if (!recoveryOverlay) { recoveryOverlay = new PIXI.Graphics(); recoveryOverlay.name = 'recoveryOverlay'; recoveryOverlay.zIndex = 14; curContainer.addChild(recoveryOverlay); }
                        recoveryOverlay.visible = true; recoveryOverlay.clear();
                        const now = Date.now();
                        if (hex.cooldownEndTime && now < hex.cooldownEndTime) {
                            const cy = props.offsetY - 2;
                            recoveryOverlay.beginPath(); recoveryOverlay.ellipse(0, cy, 18, 14.4); recoveryOverlay.fill({ color: 0xef4444, alpha: 0.15 }); recoveryOverlay.stroke({ width: 2, color: 0xef4444, alpha: 0.7 });
                            recoveryOverlay.beginPath(); recoveryOverlay.ellipse(0, cy, 6, 4.8); recoveryOverlay.fill({ color: 0xf43f5e, alpha: 0.6 });
                        }
                    } else {
                        const rOverlay = curContainer.getChildByName('recoveryOverlay');
                        if (rOverlay) rOverlay.visible = false;
                    }
                } else {
                    if (faceContainer) faceContainer.visible = false;
                }

                if (!isRevealed) {
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => { const px = pt.x, py = pt.y * 0.8 + faceY; if (j === 0) borderLayer.moveTo(px, py); else borderLayer.lineTo(px, py); });
                    borderLayer.closePath(); borderLayer.fill({ color: 0x111827 }); borderLayer.strokeStyle = { width: 4.0, color: 0x374151, alpha: 0.1 }; borderLayer.stroke();
                }

                if (props.structureType === 'PORTAL' || (hex.biome as string) === 'BIOME_PORTAL' || isFinish) {
                    let portalNode = curContainer.getChildByName('portal') as PIXI.Graphics;
                    if (!portalNode) { portalNode = new PIXI.Graphics(); portalNode.name = 'portal'; curContainer.addChild(portalNode); }
                    portalNode.clear(); portalNode.y = faceY; portalNode.scale.set(1.0, 0.8);
                    portalNode.strokeStyle = isLevelComplete ? { width: 3.0, color: 0xd946ef, alpha: 1.0 } : { width: 2.0, color: 0x475569, alpha: 0.5 };
                    portalNode.beginPath(); portalNode.ellipse(0, 0, HEX_SIZE * 0.7, HEX_SIZE * 0.4); portalNode.stroke();
                } else {
                    const pNode = curContainer.getChildByName('portal'); if (pNode) pNode.visible = false;
                }

                let hoverOutline = curContainer.getChildByName('hoverOutline') as PIXI.Graphics;
                if (!hoverOutline) { hoverOutline = new PIXI.Graphics(); hoverOutline.name = 'hoverOutline'; hoverOutline.zIndex = 12; curContainer.addChild(hoverOutline); }
                hoverOutline.clear();
                hoverOutline.beginPath();
                rotatedBasePoints.forEach((pt, j) => { const px = pt.x, py = pt.y * 0.8 + faceY; if (j === 0) hoverOutline.moveTo(px, py); else hoverOutline.lineTo(px, py); });
                hoverOutline.closePath(); hoverOutline.fill({ color: 0xffffff, alpha: 0.16 }); hoverOutline.strokeStyle = { width: 3.0, color: 0xffffff, alpha: 1.0 }; hoverOutline.stroke();
                hoverOutline.visible = (hoveredHexId === item.id) && isRevealed;

                if (props.isSelected && isRevealed) {
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => { const px = pt.x, py = pt.y * 0.8 + faceY; if (j === 0) borderLayer.moveTo(px, py); else borderLayer.lineTo(px, py); });
                    borderLayer.closePath(); borderLayer.strokeStyle = { width: 3.0, color: 0x22d3ee }; borderLayer.stroke();
                }

                if (props.isGrowing && isRevealed) {
                    let needed = 30;
                    const actingEntity = (player && player.q === props.q && player.r === props.r) ? player : bots?.find((b: any) => b.q === props.q && b.r === props.r);
                    if (actingEntity) {
                        let intent: any = null;
                        if (actingEntity.type === 'PLAYER') intent = playerGrowthIntent || null;
                        else { const n = actingEntity.movementQueue?.[0]; if (n?.intent) intent = n.intent; else if (actingEntity.memory?.plan?.steps?.[0]?.type) { const t = actingEntity.memory.plan.steps[0].type; if (t === 'UPGRADE') intent = 'UPGRADE'; else if (t === 'DIG') intent = 'DIG'; else if (t === 'RECOVER') intent = 'RECOVER'; } }
                        if (intent) {
                            if (intent === 'RECOVER') needed = getLevelConfig(props.maxLevel)?.growthTime ?? 30;
                            else if (intent === 'DIG') {
                                const curLvl = props.level ?? 0;
                                const baseSecs = curLvl >= 1 ? (curLvl + 2) : 3;
                                const baseTicks = baseSecs * 10;
                                const activeStatuses = actingEntity.activeStatuses || [];
                                const hasScannerBuff = activeStatuses.some((s: any) => s.type === 'STATUS_SCANNER_BUFF');
                                const hasGodMode = activeStatuses.some((s: any) => s.type === 'GOD_MODE');
                                const growthAccelerator = hasGodMode ? 10 : (hasScannerBuff ? 2 : 0);
                                needed = actingEntity.type !== 'PLAYER' ? baseTicks : Math.max(10, baseTicks - (growthAccelerator * 5));
                            }
                            else if (intent === 'UPGRADE') needed = Math.max(10, getLevelConfig(props.level + 1)?.growthTime ?? 30);
                        }
                    }
                    const normalizedProgress = Math.min(1.0, props.progress / needed);
                    borderLayer.strokeStyle = { width: 3.0, color: 0x374151, alpha: 0.5 }; borderLayer.beginPath(); borderLayer.arc(0, faceY, HEX_SIZE * 0.4, 0, Math.PI * 2); borderLayer.stroke();
                    borderLayer.strokeStyle = { width: 3.5, color: 0xf59e0b, alpha: 0.9 }; borderLayer.beginPath(); borderLayer.arc(0, faceY, HEX_SIZE * 0.4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * normalizedProgress); borderLayer.stroke();
                }

                if (completedShapeCoords.some(c => c.q === props.q && c.r === props.r) && isRevealed) {
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => { const px = pt.x, py = pt.y * 0.8 + faceY; if (j === 0) borderLayer.moveTo(px, py); else borderLayer.lineTo(px, py); });
                    borderLayer.closePath(); borderLayer.strokeStyle = { width: 4.0, color: 0x10b981, alpha: 0.7 }; borderLayer.stroke();
                }

                if (props.hologramTargetLevel !== undefined && activatedMiniMonuments?.length === 3 && isRevealed) {
                    const isConstructed = props.level >= props.hologramTargetLevel;
                    const holoColor = isConstructed ? 0x22d3ee : 0x4f46e5;
                    borderLayer.beginPath();
                    rotatedBasePoints.forEach((pt, j) => { const px = pt.x * 0.9, py = pt.y * 0.8 * 0.9 + faceY; if (j === 0) borderLayer.moveTo(px, py); else borderLayer.lineTo(px, py); });
                    borderLayer.closePath(); borderLayer.strokeStyle = { width: 2.0, color: holoColor, alpha: 0.8 }; borderLayer.stroke();
                    let holoTextLayer = curContainer.getChildByName('holoText') as PIXI.Text;
                    if (!isConstructed) {
                        if (!holoTextLayer) { holoTextLayer = new PIXI.Text({ text: `[L${props.hologramTargetLevel}]`, style: { fontFamily: 'monospace', fontSize: 14, fill: 0x4f46e5, fontWeight: 'bold' } }); holoTextLayer.name = 'holoText'; holoTextLayer.anchor.set(0.5, 0.5); holoTextLayer.zIndex = 15; curContainer.addChild(holoTextLayer); }
                        holoTextLayer.y = faceY - 15; holoTextLayer.visible = true;
                    } else { if (holoTextLayer) holoTextLayer.visible = false; }
                } else {
                    const hText = curContainer.getChildByName('holoText'); if (hText) hText.visible = false;
                }

                let emojiLayer = curContainer.getChildByName('emoji') as PIXI.Text;
                const isSpecialStructure = !isFinish && (props.structureType === 'MINI_MONUMENT' || props.structureType === 'CORE' || props.structureType === 'TURRET' || props.structureType === 'CAPITAL' || props.isCore || props.isMiniMonument || props.isTurret);
                if (isRevealed && (isFinish || props.poiType || isSpecialStructure)) {
                    let icon = '', colorVal = '#ffffff';
                    if (isFinish) { icon = '🌀'; colorVal = isLevelComplete ? '#22d3ee' : '#475569'; }
                    else if (props.structureType === 'CAPITAL') { icon = '🌌'; colorVal = '#10b981'; }
                    else if (props.structureType === 'MINI_MONUMENT' || props.isMiniMonument) { icon = ''; }
                    else if (props.structureType === 'CORE' || props.isCore) { icon = ''; colorVal = '#ec4899'; }
                    else if (props.structureType === 'TURRET' || props.isTurret) { icon = ''; colorVal = '#a855f7'; }
                    else { icon = getPoiIcon(props.poiType || ''); colorVal = '#ffffff'; }
                    if (!emojiLayer) { emojiLayer = new PIXI.Text({ text: icon, style: { fontSize: 18, align: 'center', fill: colorVal, fontWeight: 'bold' } }); emojiLayer.name = 'emoji'; emojiLayer.zIndex = 30; emojiLayer.anchor.set(0.5, 0.5); curContainer.addChild(emojiLayer); }
                    emojiLayer.text = icon; if (emojiLayer.style) emojiLayer.style.fill = colorVal;
                    emojiLayer.y = faceY - 5; emojiLayer.visible = icon !== '';
                } else { if (emojiLayer) emojiLayer.visible = false; }

                let turretLayer = curContainer.getChildByName('turret3d') as PIXI.Graphics;
                if (isRevealed && (props.structureType === 'TURRET' || props.isTurret)) {
                    if (!turretLayer) { turretLayer = new PIXI.Graphics(); turretLayer.name = 'turret3d'; turretLayer.zIndex = 32; curContainer.addChild(turretLayer); }
                    turretLayer.clear();
                    const cx = 0, cy = faceY - 6, nowTime = Date.now();
                    turretLayer.ellipse(cx, cy, 13, 7.5); turretLayer.fill({ color: 0x1e293b }); turretLayer.stroke({ color: 0xa855f7, width: 2 });
                    turretLayer.rect(cx - 3, cy - 11, 6, 11); turretLayer.fill({ color: 0x334155 }); turretLayer.stroke({ color: 0x475569, width: 1 });
                    const angle = (nowTime / 1600) % (Math.PI * 2), hcx = cx, hcy = cy - 11;
                    const transform = (u: number, v: number, z: number = 0) => { const rx = u * Math.cos(angle) - v * Math.sin(angle); const ry = (u * Math.sin(angle) + v * Math.cos(angle)) * 0.5 - z; return { x: hcx + rx, y: hcy + ry }; };
                    const c000 = transform(-5, -5, 0), c100 = transform(5, -5, 0), c110 = transform(5, 5, 0), c010 = transform(-5, 5, 0), c001 = transform(-5, -5, 7), c101 = transform(5, -5, 7), c111 = transform(5, 5, 7), c011 = transform(-5, 5, 7);
                    const drawFace = (p1: any, p2: any, p3: any, p4: any, color: number) => { turretLayer.beginPath(); turretLayer.moveTo(p1.x, p1.y); turretLayer.lineTo(p2.x, p2.y); turretLayer.lineTo(p3.x, p3.y); turretLayer.lineTo(p4.x, p4.y); turretLayer.closePath(); turretLayer.fill({ color }); turretLayer.stroke({ color: 0xd8b4fe, width: 0.5, alpha: 0.5 }); };
                    drawFace(c100, c110, c111, c101, 0x6b21a8); drawFace(c110, c010, c011, c111, 0x581c87); drawFace(c010, c000, c001, c011, 0x4c1d95); drawFace(c000, c100, c101, c001, 0x3b0764); drawFace(c001, c101, c111, c011, 0x7e22ce);
                    const bL1 = transform(4, -3, 3.5), bL2 = transform(13, -3, 3.5), bR1 = transform(4, 3, 3.5), bR2 = transform(13, 3, 3.5);
                    turretLayer.beginPath(); turretLayer.moveTo(bL1.x, bL1.y); turretLayer.lineTo(bL2.x, bL2.y); turretLayer.stroke({ color: 0x0f172a, width: 3.5 });
                    turretLayer.beginPath(); turretLayer.moveTo(bL1.x, bL1.y); turretLayer.lineTo(bL2.x, bL2.y); turretLayer.stroke({ color: 0xa855f7, width: 1.5 });
                    turretLayer.beginPath(); turretLayer.moveTo(bR1.x, bR1.y); turretLayer.lineTo(bR2.x, bR2.y); turretLayer.stroke({ color: 0x0f172a, width: 3.5 });
                    turretLayer.beginPath(); turretLayer.moveTo(bR1.x, bR1.y); turretLayer.lineTo(bR2.x, bR2.y); turretLayer.stroke({ color: 0xa855f7, width: 1.5 });
                    const tipPulse = 1.8 + 0.6 * Math.sin(nowTime / 140);
                    turretLayer.beginPath(); turretLayer.circle(bL2.x, bL2.y, tipPulse); turretLayer.fill({ color: 0xf3e8ff }); turretLayer.stroke({ color: 0xc084fc, width: 1 });
                    turretLayer.beginPath(); turretLayer.circle(bR2.x, bR2.y, tipPulse); turretLayer.fill({ color: 0xf3e8ff }); turretLayer.stroke({ color: 0xc084fc, width: 1 });
                    const lensCenter = transform(0, 0, 7.5);
                    turretLayer.beginPath(); turretLayer.circle(lensCenter.x, lensCenter.y, 2.5 + 0.5 * Math.sin(nowTime / 300)); turretLayer.fill({ color: 0xd8b4fe }); turretLayer.stroke({ color: 0xffffff, width: 1 });
                    const laserL = transform(35, -3, -4), laserR = transform(35, 3, -4);
                    const beamAlpha = 0.25 * (0.6 + 0.4 * Math.sin(nowTime / 180));
                    turretLayer.beginPath(); turretLayer.moveTo(bL2.x, bL2.y); turretLayer.lineTo(laserL.x, laserL.y); turretLayer.stroke({ color: 0xd8b4fe, width: 1.0, alpha: beamAlpha });
                    turretLayer.beginPath(); turretLayer.moveTo(bR2.x, bR2.y); turretLayer.lineTo(laserR.x, laserR.y); turretLayer.stroke({ color: 0xd8b4fe, width: 1.0, alpha: beamAlpha });
                    turretLayer.visible = true;
                } else { if (turretLayer) turretLayer.visible = false; }

                let coreLayer = curContainer.getChildByName('core3d') as PIXI.Graphics;
                if (isRevealed && (props.structureType === 'CORE' || props.isCore)) {
                    if (!coreLayer) { coreLayer = new PIXI.Graphics(); coreLayer.name = 'core3d'; coreLayer.zIndex = 32; curContainer.addChild(coreLayer); }
                    coreLayer.clear();
                    const cx = 0, nowTime = Date.now(), bob = 5 * Math.sin(nowTime / 400), cy = faceY - 15 + bob;
                    const shadowScale = 1.0 - 0.25 * (bob + 5) / 10;
                    coreLayer.ellipse(cx, faceY - 5, 8.5 * shadowScale, 5.0 * shadowScale); coreLayer.fill({ color: 0xdb2777, alpha: 0.22 });
                    const angle = (nowTime / 1000) % (Math.PI * 2), r = 9, h = 13;
                    const v: { x: number, y: number }[] = [];
                    for (let i = 0; i < 4; i++) { const a = angle + (i * Math.PI / 2); const vx = r * Math.cos(a); const vy = r * Math.sin(a) * 0.45; v.push({ x: vx, y: vy }); }
                    const topY = -h, botY = h;
                    const colors = [0xfbcfe8, 0xf472b6, 0xec4899, 0xdb2777];
                    for (let i = 0; i < 4; i++) { const next = (i + 1) % 4; const faceColor = colors[(i + Math.floor(angle / (Math.PI / 2))) % 4]; coreLayer.beginPath(); coreLayer.moveTo(cx, cy + topY); coreLayer.lineTo(cx + v[i].x, cy + v[i].y); coreLayer.lineTo(cx + v[next].x, cy + v[next].y); coreLayer.closePath(); coreLayer.fill({ color: faceColor, alpha: 0.85 }); coreLayer.stroke({ color: 0xffffff, width: 1.2, alpha: 0.9 }); }
                    for (let i = 0; i < 4; i++) { const next = (i + 1) % 4; const faceColor = colors[(i + 2 + Math.floor(angle / (Math.PI / 2))) % 4]; coreLayer.beginPath(); coreLayer.moveTo(cx, cy + botY); coreLayer.lineTo(cx + v[i].x, cy + v[i].y); coreLayer.lineTo(cx + v[next].x, cy + v[next].y); coreLayer.closePath(); coreLayer.fill({ color: faceColor, alpha: 0.75 }); coreLayer.stroke({ color: 0xffffff, width: 1.0, alpha: 0.85 }); }
                    const ringAngle1 = nowTime / 800; coreLayer.beginPath(); coreLayer.ellipse(cx, cy, 14 * Math.abs(Math.sin(ringAngle1)), 6.0); coreLayer.stroke({ color: 0x38bdf8, width: 1.5, alpha: 0.6 });
                    const ringAngle2 = -nowTime / 1200; coreLayer.beginPath(); coreLayer.ellipse(cx, cy, 16.0, 7.5 * Math.abs(Math.cos(ringAngle2))); coreLayer.stroke({ color: 0xa855f7, width: 1.5, alpha: 0.5 });
                    coreLayer.beginPath(); coreLayer.circle(cx, cy, 2.5); coreLayer.fill({ color: 0xffffff });
                    coreLayer.visible = true;
                } else { if (coreLayer) coreLayer.visible = false; }

                let monumentStarLayer = curContainer.getChildByName('monumentStar3d') as PIXI.Graphics;
                const isMonument = props.structureType === 'MONUMENT';
                const isMiniMonumentAttr = props.structureType === 'MINI_MONUMENT' || props.isMiniMonument;
                if (isRevealed && (isMonument || isMiniMonumentAttr)) {
                    if (!monumentStarLayer) { monumentStarLayer = new PIXI.Graphics(); monumentStarLayer.name = 'monumentStar3d'; monumentStarLayer.zIndex = 32; curContainer.addChild(monumentStarLayer); }
                    monumentStarLayer.clear();
                    const cx = 0, cy = faceY - 8, nowTime = Date.now();
                    if (isMonument) {
                        const angleOffset = (nowTime / 1500) % (Math.PI * 2), pulse = 1.0 + 0.1 * Math.sin(nowTime / 200), outer = 13 * pulse, inner = 5.5 * pulse;
                        const glowOuter = (13 + 5) * pulse, glowInner = (5.5 + 2) * pulse;
                        monumentStarLayer.beginPath();
                        for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? glowOuter : glowInner; const a = -angleOffset * 0.6 + (i * Math.PI / 5) - Math.PI / 2; const px = cx + r * Math.cos(a); const py = cy + r * Math.sin(a); if (i === 0) monumentStarLayer.moveTo(px, py); else monumentStarLayer.lineTo(px, py); }
                        monumentStarLayer.closePath(); monumentStarLayer.fill({ color: 0xf59e0b, alpha: 0.25 }); monumentStarLayer.stroke({ color: 0xf97316, width: 1, alpha: 0.4 });
                        monumentStarLayer.beginPath();
                        for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? outer : inner; const a = angleOffset + (i * Math.PI / 5) - Math.PI / 2; const px = cx + r * Math.cos(a); const py = cy + r * Math.sin(a); if (i === 0) monumentStarLayer.moveTo(px, py); else monumentStarLayer.lineTo(px, py); }
                        monumentStarLayer.closePath(); monumentStarLayer.fill({ color: 0xfbbf24 }); monumentStarLayer.stroke({ color: 0xffffff, width: 1.5 });
                        monumentStarLayer.beginPath(); monumentStarLayer.circle(cx, cy, 2 * pulse); monumentStarLayer.fill({ color: 0xffffff });
                    } else {
                        const isActivated = props.isActivated || (activatedMiniMonuments && activatedMiniMonuments.includes(`${props.q},${props.r}`));
                        const speed = isActivated ? 1800 : 3500, angleOffset = (nowTime / speed) % (Math.PI * 2), pulse = isActivated ? (1.0 + 0.08 * Math.sin(nowTime / 150)) : 1.0, outer = 8 * pulse, inner = 3.5 * pulse;
                        const starColor = isActivated ? 0x22d3ee : 0x475569, strokeColor = isActivated ? 0xffffff : 0x94a3b8, strokeWidth = isActivated ? 1.2 : 0.8;
                        if (isActivated) { monumentStarLayer.beginPath(); monumentStarLayer.ellipse(cx, cy + 2, 11 * pulse, 6 * pulse); monumentStarLayer.stroke({ color: 0x06b6d4, width: 1.0, alpha: 0.6 }); }
                        monumentStarLayer.beginPath();
                        for (let i = 0; i < 10; i++) { const r = i % 2 === 0 ? outer : inner; const a = angleOffset + (i * Math.PI / 5) - Math.PI / 2; const px = cx + r * Math.cos(a); const py = cy + r * Math.sin(a); if (i === 0) monumentStarLayer.moveTo(px, py); else monumentStarLayer.lineTo(px, py); }
                        monumentStarLayer.closePath(); monumentStarLayer.fill({ color: starColor }); monumentStarLayer.stroke({ color: strokeColor, width: strokeWidth });
                        if (isActivated) { monumentStarLayer.beginPath(); monumentStarLayer.circle(cx, cy, 1.2 * pulse); monumentStarLayer.fill({ color: 0xffffff }); }
                    }
                    monumentStarLayer.visible = true;
                } else { if (monumentStarLayer) monumentStarLayer.visible = false; }

                const firstIncompleteObjHex = activeLevelConfig?.objectiveHexes?.find((o: any) => !isObjectiveHexCompleted(o, grid, player, activeLevelConfig?.id, activatedMiniMonuments, portalActive));
                const objHex = activeLevelConfig?.objectiveHexes?.find((o: any) => o.q === props.q && o.r === props.r);
                if (objHex && objHex === firstIncompleteObjHex && isRevealed) {
                    let objArrow = curContainer.getChildByName('objective_arrow') as PIXI.Container;
                    if (!objArrow) {
                        objArrow = new PIXI.Container(); objArrow.name = 'objective_arrow'; objArrow.zIndex = 40; curContainer.addChild(objArrow);
                        if (objHex.color === 'emerald') { const txt = new PIXI.Text({ text: '👑', style: { fontSize: 24, align: 'center' } }); txt.name = 'arrow_art'; txt.anchor.set(0.5, 0.5); objArrow.addChild(txt); }
                        else {
                            const arrowGraphic = new PIXI.Graphics(); arrowGraphic.name = 'arrow_art';
                            const arrowColor = objHex.color === 'amber' ? 0xf59e0b : objHex.color === 'cyan' ? 0x06b6d4 : objHex.color === 'red' ? 0xef4444 : 0x10b981;
                            const arrowDarkColor = objHex.color === 'amber' ? 0xb45309 : objHex.color === 'cyan' ? 0x0891b2 : objHex.color === 'red' ? 0xb91c1c : 0x059669;
                            const glow = new PIXI.Graphics(); glow.name = 'arrow_glow'; glow.circle(0, -8, 22); glow.fill({ color: arrowColor, alpha: 0.18 }); objArrow.addChild(glow);
                            const drawArrowPath = (g: PIXI.Graphics, dy: number) => { g.beginPath(); g.moveTo(-10, -25 + dy); g.lineTo(10, -25 + dy); g.lineTo(10, -10 + dy); g.lineTo(18, -10 + dy); g.lineTo(0, 8 + dy); g.lineTo(-18, -10 + dy); g.lineTo(-10, -10 + dy); g.closePath(); };
                            drawArrowPath(arrowGraphic, 4); arrowGraphic.fill({ color: arrowDarkColor }); arrowGraphic.stroke({ width: 1.5, color: 0x000000, alpha: 0.8, alignment: 1 });
                            drawArrowPath(arrowGraphic, 0); arrowGraphic.fill({ color: arrowColor }); arrowGraphic.stroke({ width: 1.5, color: 0x000000, alpha: 0.6, alignment: 1 });
                            objArrow.addChild(arrowGraphic);
                        }
                        if (objHex.label) { const lbl = new PIXI.Text({ text: translateArrowLabel(objHex.label, isRu), style: { fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 3 }, align: 'center' } }); lbl.name = 'arrow_label'; lbl.anchor.set(0.5, 1.0); lbl.y = -28; objArrow.addChild(lbl); }
                    }
                    const labelChild = objArrow.getChildByName('arrow_label') as PIXI.Text;
                    if (labelChild && objHex.label) { labelChild.text = translateArrowLabel(objHex.label, isRu); }
                    objArrow.visible = true; objArrow.y = faceY - 35 + Math.min(0, Math.sin(Date.now() * 0.007) * 8);
                    const glowChild = objArrow.getChildByName('arrow_glow'); if (glowChild) glowChild.alpha = 0.5 + Math.sin(Date.now() * 0.005) * 0.35;
                } else {
                    const existingArrow = curContainer.getChildByName('objective_arrow'); if (existingArrow) existingArrow.visible = false;
                }

                if (isFinish && isRevealed && isLevelComplete) {
                    let finishBeacon = curContainer.getChildByName('finish_beacon') as PIXI.Container;
                    if (!finishBeacon) {
                        finishBeacon = new PIXI.Container(); finishBeacon.name = 'finish_beacon'; finishBeacon.zIndex = 38; curContainer.addChild(finishBeacon);
                        const beam = new PIXI.Graphics(); beam.name = 'beam'; finishBeacon.addChild(beam);
                        const baseGlow = new PIXI.Graphics(); baseGlow.name = 'baseGlow'; finishBeacon.addChild(baseGlow);
                    }
                    finishBeacon.visible = true;
                    const beam = finishBeacon.getChildByName('beam') as PIXI.Graphics;
                    const baseGlow = finishBeacon.getChildByName('baseGlow') as PIXI.Graphics;
                    if (beam) {
                        beam.clear();
                        const beamHeight = 1200, pulse = Math.sin(Date.now() * 0.005) * 0.12 + 0.88, beamWidthBottom = 26 * pulse, rx = beamWidthBottom, ry = rx * 0.577;
                        const beamColor = isLevelComplete ? 0x22d3ee : 0x06b6d4, outerAlpha = isLevelComplete ? (0.35 * pulse) : (0.18 * pulse), innerAlpha = isLevelComplete ? (0.6 * pulse) : (0.3 * pulse), strokeAlpha = isLevelComplete ? (0.5 * pulse) : (0.25 * pulse);
                        beam.beginPath(); beam.moveTo(0, faceY - beamHeight); beam.lineTo(rx, faceY); beam.quadraticCurveTo(0, faceY + ry * 2, -rx, faceY); beam.closePath(); beam.fill({ color: beamColor, alpha: outerAlpha }); beam.stroke({ width: 1.5, color: 0xffffff, alpha: strokeAlpha });
                        const coreRx = rx * 0.4, coreRy = coreRx * 0.577;
                        beam.beginPath(); beam.moveTo(0, faceY - beamHeight); beam.lineTo(coreRx, faceY); beam.quadraticCurveTo(0, faceY + coreRy * 2, -coreRx, faceY); beam.closePath(); beam.fill({ color: 0xf0fdf4, alpha: innerAlpha });
                    }
                    if (baseGlow) {
                        baseGlow.clear();
                        const pulse = Math.sin(Date.now() * 0.005) * 0.15 + 1.0;
                        const glowColor = isLevelComplete ? 0x22d3ee : 0x0891b2, coreColor = isLevelComplete ? 0xa7f3d0 : 0x34d399;
                        baseGlow.ellipse(0, faceY, 26 * pulse, 15 * pulse); baseGlow.fill({ color: glowColor, alpha: isLevelComplete ? 0.5 : 0.25 });
                        baseGlow.ellipse(0, faceY, 13 * pulse, 7.5 * pulse); baseGlow.fill({ color: coreColor, alpha: isLevelComplete ? 0.7 : 0.4 });
                    }
                } else {
                    const existingBeacon = curContainer.getChildByName('finish_beacon'); if (existingBeacon) existingBeacon.visible = false;
                }

                const activeLevelId = activeLevelConfig?.id;
                let showDigArrow = false, digLabel = '';
                if (activeLevelId === '1.5' && isRevealed) {
                    const voidHex = grid['1,-1'], centerHex = grid['0,0'], isVoidHealed = voidHex && voidHex.structureType !== 'VOID';
                    if (isVoidHealed) {
                        const minedNeighbors = [grid['1,-1'], grid['0,1'], grid['-1,0'], grid['0,-1'], grid['1,0'], grid['-1,1']].filter(h => h && h.currentLevel <= -1);
                        if (minedNeighbors.length < 2) { const isNeighbor = ['1,-1', '0,1', '-1,0', '0,-1', '1,0', '-1,1'].includes(`${props.q},${props.r}`); const currentHex = grid[`${props.q},${props.r}`]; if (isNeighbor && currentHex && currentHex.currentLevel > -1) { showDigArrow = true; digLabel = 'DIG'; } }
                        else { if (props.q === 0 && props.r === 0 && centerHex && centerHex.currentLevel > -2) { showDigArrow = true; digLabel = 'DIG x2'; } }
                    }
                } else if (activeLevelId === '1.6' && isRevealed) {
                    const void1Healed = grid['2,0']?.structureType !== 'VOID', void2Healed = grid['6,0']?.structureType !== 'VOID', hasPatch = player?.inventory?.some((i: any) => i.baseId === 'reality_patch');
                    if (!void1Healed) { if (!hasPatch && props.q === 0 && props.r === 0) { const hexNode = grid['0,0']; if (hexNode && hexNode.currentLevel > -2) { showDigArrow = true; digLabel = 'DIG x2'; } } }
                    else if (!void2Healed) { if (!hasPatch && props.q === 4 && props.r === 0) { const hexNode = grid['4,0']; if (hexNode && hexNode.currentLevel > -2) { showDigArrow = true; digLabel = 'DIG x2'; } } }
                }
                if (showDigArrow && isRevealed) {
                    let digArrow = curContainer.getChildByName('dig_arrow') as PIXI.Container;
                    if (!digArrow) {
                        digArrow = new PIXI.Container(); digArrow.name = 'dig_arrow'; digArrow.zIndex = 39; curContainer.addChild(digArrow);
                        const arrowGraphic = new PIXI.Graphics(); arrowGraphic.name = 'dig_arrow_art';
                        const arrowColor = 0xef4444, arrowDarkColor = 0x991b1b;
                        const glow = new PIXI.Graphics(); glow.name = 'dig_arrow_glow'; glow.circle(0, -8, 20); glow.fill({ color: arrowColor, alpha: 0.22 }); digArrow.addChild(glow);
                        const drawArrowPath = (g: PIXI.Graphics, dy: number) => { g.beginPath(); g.moveTo(-8, -22 + dy); g.lineTo(8, -22 + dy); g.lineTo(8, -9 + dy); g.lineTo(14, -9 + dy); g.lineTo(0, 6 + dy); g.lineTo(-14, -9 + dy); g.lineTo(-8, -9 + dy); g.lineTo(-8, -22 + dy); g.closePath(); };
                        drawArrowPath(arrowGraphic, 3); arrowGraphic.fill({ color: arrowDarkColor }); arrowGraphic.stroke({ width: 1.2, color: 0x000000, alpha: 0.8, alignment: 1 });
                        drawArrowPath(arrowGraphic, 0); arrowGraphic.fill({ color: arrowColor }); arrowGraphic.stroke({ width: 1.2, color: 0x000000, alpha: 0.6, alignment: 1 });
                        digArrow.addChild(arrowGraphic);
                        if (digLabel) { const lbl = new PIXI.Text({ text: translateArrowLabel(digLabel, isRu), style: { fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 'bold', fill: 0xffffff, stroke: { color: 0x000000, width: 2.5 }, align: 'center' } }); lbl.name = 'dig_arrow_label'; lbl.anchor.set(0.5, 1.0); lbl.y = -24; digArrow.addChild(lbl); }
                    }
                    const digLabelChild = digArrow.getChildByName('dig_arrow_label') as PIXI.Text;
                    if (digLabelChild && digLabel) { digLabelChild.text = translateArrowLabel(digLabel, isRu); }
                    digArrow.visible = true; digArrow.y = faceY - 32 + Math.min(0, Math.sin(Date.now() * 0.008 + props.q) * 6);
                    const glowChild = digArrow.getChildByName('dig_arrow_glow'); if (glowChild) glowChild.alpha = 0.4 + Math.sin(Date.now() * 0.006 + props.r) * 0.25;
                } else {
                    const existingDigArrow = curContainer.getChildByName('dig_arrow'); if (existingDigArrow) existingDigArrow.visible = false;
                }

                const playerHex = player && grid ? grid[getHexKey(player.q, player.r)] : null;
                const playerHeightLevel = playerHex ? (playerHex.currentLevel ?? 0) : 0;
                const isNeighborOfPlayer = player && cubeDistance(player, props) === 1;
                const isBlockingNeighbor = isNeighborOfPlayer && recentGradientLock && grid && (props.level >= playerHeightLevel);
                let gradientWarningOverlay = curContainer.getChildByName('gradient_warning') as PIXI.Graphics;
                if (isBlockingNeighbor && isRevealed) {
                    if (!gradientWarningOverlay) { gradientWarningOverlay = new PIXI.Graphics(); gradientWarningOverlay.name = 'gradient_warning'; gradientWarningOverlay.zIndex = 35; curContainer.addChild(gradientWarningOverlay); }
                    gradientWarningOverlay.clear();
                    const alphaPulse = 0.4 + 0.3 * Math.sin(Date.now() / 100);
                    gradientWarningOverlay.beginPath();
                    rotatedBasePoints.forEach((pt, j) => { const px = pt.x, py = pt.y * 0.8 + props.offsetY; if (j === 0) gradientWarningOverlay.moveTo(px, py); else gradientWarningOverlay.lineTo(px, py); });
                    gradientWarningOverlay.closePath(); gradientWarningOverlay.stroke({ width: 3, color: 0xef4444, alpha: alphaPulse }); gradientWarningOverlay.fill({ color: 0xef4444, alpha: alphaPulse * 0.4 });
                } else {
                    if (gradientWarningOverlay) gradientWarningOverlay.visible = false;
                }

                const isPlayerHex = player && player.q === props.q && player.r === props.r;
                let gradientArrows = curContainer.getChildByName('gradient_arrows') as PIXI.Graphics;
                if (isPlayerHex && recentGradientLock && isRevealed && grid) {
                    if (!gradientArrows) { gradientArrows = new PIXI.Graphics(); gradientArrows.name = 'gradient_arrows'; gradientArrows.zIndex = 38; curContainer.addChild(gradientArrows); }
                    gradientArrows.clear();
                    NEIGHBOR_DIRECTIONS.forEach(dir => {
                        const nQ = props.q + dir.q, nR = props.r + dir.r;
                        const nHex = grid[getHexKey(nQ, nR)];
                        if (nHex && nHex.structureType !== 'VOID' && (nHex.currentLevel ?? 0) >= playerHeightLevel) {
                            const nPx = simpleHexToPixel(nQ, nR), curPx = simpleHexToPixel(props.q, props.r);
                            const dx = nPx.x - curPx.x, nOffsetY = -((nHex.currentLevel ?? 0) * 8), dy = (nPx.y - curPx.y) + (nOffsetY - props.offsetY);
                            gradientArrows.beginPath(); gradientArrows.moveTo(0, props.offsetY);
                            const targetX = dx * 0.65, targetY = props.offsetY + dy * 0.65;
                            gradientArrows.lineTo(targetX, targetY); gradientArrows.stroke({ width: 3.5, color: 0xef4444, alpha: 0.8 });
                            const angle = Math.atan2(dy, dx), headSize = 7;
                            gradientArrows.beginPath(); gradientArrows.moveTo(targetX, targetY);
                            gradientArrows.lineTo(targetX - headSize * Math.cos(angle - Math.PI / 6), targetY - headSize * Math.sin(angle - Math.PI / 6));
                            gradientArrows.lineTo(targetX - headSize * Math.cos(angle + Math.PI / 6), targetY - headSize * Math.sin(angle + Math.PI / 6));
                            gradientArrows.closePath(); gradientArrows.fill({ color: 0xef4444, alpha: 0.9 });
                        }
                    });
                } else {
                    if (gradientArrows) gradientArrows.visible = false;
                }

                const isMiniMonument = props.structureType === 'MINI_MONUMENT' || props.isMiniMonument;
                let miniMonumentPulse = curContainer.getChildByName('mini_monument_pulse') as PIXI.Graphics;
                if (isMiniMonument && isRevealed) {
                    if (!miniMonumentPulse) { miniMonumentPulse = new PIXI.Graphics(); miniMonumentPulse.name = 'mini_monument_pulse'; miniMonumentPulse.zIndex = 5; curContainer.addChild(miniMonumentPulse); }
                    miniMonumentPulse.clear();
                    const t = (Date.now() / 2000) % 1.0, maxRadius = HEX_SIZE * 3.0, curRadius = HEX_SIZE * 0.8 + (maxRadius - HEX_SIZE * 0.8) * t, curAlpha = 0.5 * (1.0 - t);
                    const isActivated = props.isActivated || (activatedMiniMonuments && activatedMiniMonuments.includes(`${props.q},${props.r}`));
                    const pulseColor = isActivated ? 0x22d3ee : 0xf1f5f9;
                    miniMonumentPulse.beginPath(); miniMonumentPulse.ellipse(0, props.offsetY, curRadius, curRadius * 0.8); miniMonumentPulse.stroke({ width: 2, color: pulseColor, alpha: curAlpha }); miniMonumentPulse.fill({ color: pulseColor, alpha: curAlpha * 0.15 });
                } else {
                    if (miniMonumentPulse) miniMonumentPulse.visible = false;
                }

                const targetedMeteor = activeMeteors?.find(m => m.q === props.q && m.r === props.r);
                renderMeteorTelegraph({
                    curContainer,
                    targetedMeteor,
                    offsetY: props.offsetY,
                    rotatedBasePoints,
                    isRevealed,
                    onImpactClose: (intensity) => {
                        shakeIntensityRef.current = intensity;
                    },
                });

                const isHovered = hoveredHexId === `${props.q},${props.r}`;
                const isUpgradeIntent = playerGrowthIntent === 'UPGRADE';
                let ghostPreview = curContainer.getChildByName('ghost_preview') as PIXI.Graphics;
                if (isHovered && isUpgradeIntent && isRevealed) {
                    if (!ghostPreview) { ghostPreview = new PIXI.Graphics(); ghostPreview.name = 'ghost_preview'; ghostPreview.zIndex = 30; curContainer.addChild(ghostPreview); }
                    ghostPreview.clear();
                    const nextOffsetY = props.offsetY - 8;
                    ghostPreview.beginPath();
                    rotatedBasePoints.forEach((pt, j) => { const px = pt.x, py = pt.y * 0.8 + nextOffsetY; if (j === 0) ghostPreview.moveTo(px, py); else ghostPreview.lineTo(px, py); });
                    ghostPreview.closePath(); ghostPreview.stroke({ width: 2.0, color: 0x10b981, alpha: 0.95 }); ghostPreview.fill({ color: 0x10b981, alpha: 0.28 });
                    rotatedBasePoints.forEach(pt => { ghostPreview.beginPath(); ghostPreview.moveTo(pt.x, pt.y * 0.8 + props.offsetY); ghostPreview.lineTo(pt.x, pt.y * 0.8 + nextOffsetY); ghostPreview.stroke({ width: 1.0, color: 0x10b981, alpha: 0.5 }); });
                    let ghostText = curContainer.getChildByName('ghost_text') as PIXI.Text;
                    if (!ghostText) { ghostText = new PIXI.Text({ text: `+L${props.level + 1}`, style: { fontFamily: 'monospace', fontSize: 11, fontWeight: 'bold', fill: 0x10b981, stroke: { color: 0x000000, width: 2.5 } } }); ghostText.name = 'ghost_text'; ghostText.anchor.set(0.5, 0.5); ghostText.zIndex = 31; curContainer.addChild(ghostText); }
                    ghostText.visible = true; ghostText.y = nextOffsetY - 12;
                } else {
                    if (ghostPreview) ghostPreview.visible = false;
                    const ghostText = curContainer.getChildByName('ghost_text'); if (ghostText) ghostText.visible = false;
                }

                if (props.isPending) {
                    let pendingBadge = curContainer.getChildByName('pending_badge') as PIXI.Container;
                    if (!pendingBadge) {
                        pendingBadge = new PIXI.Container(); pendingBadge.name = 'pending_badge'; pendingBadge.zIndex = 45; curContainer.addChild(pendingBadge);
                        const g = new PIXI.Graphics(); g.name = 'badge_graphics';
                        g.beginPath(); g.circle(0, 0, 19); g.fill({ color: 0xfbbf24, alpha: 0.22 });
                        g.beginPath(); g.circle(0, 0, 15); g.fill({ color: 0xfbbf24 }); g.strokeStyle = { width: 2, color: 0x92400e }; g.stroke();
                        pendingBadge.addChild(g);
                        const txt = new PIXI.Text({ text: '', style: { fontFamily: 'Inter, sans-serif', fontSize: 15, fontWeight: 'bold', fill: 0x78350f, align: 'center' } });
                        txt.name = 'badge_text'; txt.anchor.set(0.5, 0.5); pendingBadge.addChild(txt);
                    }
                    pendingBadge.visible = true; pendingBadge.y = faceY - 33;
                    const txt = pendingBadge.getChildByName('badge_text') as PIXI.Text;
                    if (txt) txt.text = pendingConfirmation?.data?.costCoins ? `${pendingConfirmation.data.costCoins}` : `${pendingConfirmation?.data?.costMoves ?? 0}`;
                } else {
                    const existingBadge = curContainer.getChildByName('pending_badge'); if (existingBadge) existingBadge.visible = false;
                }
            } else if (item.type === 'UNIT') {
                activeUnitIds.add(item.id);
                const props = item.props;
                let curContainer = unitCache.current.get(item.id);
                let stateObj = unitAnimStates.current.get(item.id);

                if (!stateObj) {
                    stateObj = { startQ: props.q, startR: props.r, startTime: Date.now(), isMoving: false, startLevel: props.hexLevel, targetQ: props.q, targetR: props.r, targetLevel: props.hexLevel, facingLeft: false, currentQ: props.q, currentR: props.r, currentLevel: props.hexLevel, stepDuration: 400, moveMode: 'SINGLE' };
                    unitAnimStates.current.set(item.id, stateObj);
                }

                const uImage = resourceService.getUnitImage(props.headIndex, props.bodyIndex, props.color, props.type);
                const tex = getPixiTexture(uImage);

                if (!curContainer) {
                    curContainer = new PIXI.Container(); curContainer.name = item.id; parent.addChild(curContainer); unitCache.current.set(item.id, curContainer);
                    const shadow = new PIXI.Graphics(); shadow.name = 'shadow'; shadow.beginPath(); shadow.ellipse(0, 0, 10, 6); shadow.fill({ color: 0x000000, alpha: 0.4 }); curContainer.addChild(shadow);
                    if (props.isPlayer) { const ring = new PIXI.Graphics(); ring.name = 'ring'; ring.strokeStyle = { width: 1.0, color: 0xffffff, alpha: 0.6 }; ring.beginPath(); ring.ellipse(0, 0, 16, 10); ring.stroke(); curContainer.addChild(ring); }
                    const sprite = new PIXI.Sprite(tex); sprite.name = 'sprite'; sprite.anchor.set(0.5, 0.75); sprite.scale.set(1.0, 1.0); curContainer.addChild(sprite);
                } else {
                    const sprite = curContainer.getChildByName('sprite') as PIXI.Sprite;
                    if (sprite) sprite.texture = tex;
                }
                curContainer.zIndex = item.depth;

                const hasPosChanged = props.q !== stateObj.targetQ || props.r !== stateObj.targetR;
                const hasLevelChanged = props.hexLevel !== stateObj.targetLevel;

                if (hasPosChanged) {
                    const distance = cubeDistance({ q: stateObj.targetQ, r: stateObj.targetR }, { q: props.q, r: props.r });
                    if (distance > 1.5) {
                        stateObj.isMoving = false; stateObj.startQ = props.q; stateObj.startR = props.r; stateObj.startLevel = props.hexLevel;
                        stateObj.targetQ = props.q; stateObj.targetR = props.r; stateObj.targetLevel = props.hexLevel;
                        stateObj.currentQ = props.q; stateObj.currentR = props.r; stateObj.currentLevel = props.hexLevel;
                    } else {
                        const wasMoving = stateObj.isMoving;
                        const queueLength = (props.isPlayer ? player?.movementQueue?.length : bots?.find(b => b.id === item.id)?.movementQueue?.length) || 0;
                        let mode: any = 'SINGLE';
                        if (!wasMoving && queueLength > 0) mode = 'FIRST';
                        else if (wasMoving && queueLength > 0) mode = 'MIDDLE';
                        else if (wasMoving && queueLength === 0) mode = 'LAST';
                        stateObj.moveMode = mode; stateObj.stepDuration = 380;
                        stateObj.startQ = wasMoving ? stateObj.currentQ : stateObj.targetQ; stateObj.startR = wasMoving ? stateObj.currentR : stateObj.targetR; stateObj.startLevel = wasMoving ? stateObj.currentLevel : stateObj.targetLevel;
                        stateObj.targetQ = props.q; stateObj.targetR = props.r; stateObj.targetLevel = props.hexLevel;
                        const startRawX = HEX_SIZE * (Math.sqrt(3) * stateObj.startQ + Math.sqrt(3)/2 * stateObj.startR);
                        const targetRawX = HEX_SIZE * (Math.sqrt(3) * stateObj.targetQ + Math.sqrt(3)/2 * stateObj.targetR);
                        if (Math.abs(targetRawX - startRawX) > 1) stateObj.facingLeft = targetRawX < startRawX;
                        stateObj.startTime = Date.now(); stateObj.isMoving = true;
                    }
                } else if (hasLevelChanged) {
                    if (!stateObj.isMoving) { stateObj.startLevel = stateObj.targetLevel; stateObj.startTime = Date.now(); stateObj.isMoving = true; stateObj.startQ = props.q; stateObj.startR = props.r; stateObj.moveMode = 'SINGLE'; stateObj.stepDuration = 400; }
                    stateObj.targetLevel = props.hexLevel;
                }

                if (!stateObj.isMoving) {
                    const rawX = HEX_SIZE * (Math.sqrt(3) * props.q + Math.sqrt(3)/2 * props.r);
                    const rawY = HEX_SIZE * 1.5 * props.r;
                    const px = rawX * cos - rawY * sin;
                    const py = (rawX * sin + rawY * cos) * 0.8;
                    curContainer.x = px; curContainer.y = py;
                    const sprite = curContainer.getChildByName('sprite') as PIXI.Sprite;
                    const shadow = curContainer.getChildByName('shadow') as PIXI.Graphics;
                    const targetZ = getHexVisualHeight(props.hexLevel);
                    if (sprite) sprite.y = targetZ;
                    if (shadow) shadow.y = targetZ;
                }
                curContainer.alpha = props.opacity;
            }
        });

        for (const [id, container] of hexCache.current.entries()) {
            if (!activeHexIds.has(id)) { parent.removeChild(container); container.destroy({ children: true }); hexCache.current.delete(id); }
        }
        for (const [id, container] of unitCache.current.entries()) {
            if (!activeUnitIds.has(id)) { parent.removeChild(container); container.destroy({ children: true }); unitCache.current.delete(id); unitAnimStates.current.delete(id); }
        }
    }, [activeRenderItems, rotation, grid, isPixiReady, player, bots, isDefenseMode, activeLevelConfig, activatedMiniMonuments, portalActive, activeMeteors, pendingConfirmation, recentGradientLock, playerGrowthIntent, session, simpleHexToPixel, sessionLanguage, forceReveal]);

    const { handleCanvasClick, handleCanvasMouseMove, handleCanvasMouseLeave } = useMapInput({ grid, rotation, activeLevelConfig, camera, onHexClick, onHover, pixiAppRef });

    useEffect(() => {
        if (!player || !grid) return;
        const getScreenCoordsOfHex = (q: number, r: number, level: number) => {
            const rawNX = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
            const rawNY = HEX_SIZE * (1.5 * r);
            const angleOffset = rotation * (Math.PI / 180);
            const cos = Math.cos(angleOffset), sin = Math.sin(angleOffset);
            const cx = rawNX * cos - rawNY * sin;
            const cy = (rawNX * sin + rawNY * cos) * 0.8 + getHexVisualHeight(level);
            const cam = camera || { x: 0, y: 0, scale: 1 };
            return { x: cam.x + cx * cam.scale - (HEX_SIZE * cam.scale), y: cam.y + cy * cam.scale - (HEX_SIZE * cam.scale * 0.8), w: HEX_SIZE * cam.scale * 2, h: HEX_SIZE * cam.scale * 1.6 };
        };
        const pHex = grid[`${playerQ},${playerR}`];
        if (!pHex) return;
        const playerScreen = getScreenCoordsOfHex(playerQ, playerR, pHex.currentLevel);
        let mineScreen = null, voidScreen = null;
        const neighbors = getNeighbors(playerQ, playerR);
        for (const n of neighbors) {
            const nHex = grid[`${n.q},${n.r}`];
            if (nHex) {
                if (nHex.currentLevel < 0 && !mineScreen) mineScreen = getScreenCoordsOfHex(n.q, n.r, nHex.currentLevel);
                if (nHex.structureType === 'VOID' && !voidScreen) voidScreen = getScreenCoordsOfHex(n.q, n.r, nHex.currentLevel);
            }
        }
        window.dispatchEvent(new CustomEvent('hexquest-coordinates-update', { detail: { player: playerScreen, mine: mineScreen, void: voidScreen } }));
    }, [player, playerQ, playerR, camera, rotation, grid]);

    const offscreenBotIndicators = useMemo(() => {
        if (!bots || bots.length === 0 || !grid || !containerRef.current) return [];
        const playerOwnedHexes = isDefenseMode ? Object.values(grid).filter((h: any) => h.ownerId === 'player-1' || h.structureType === 'CORE' || h.isCore) : [];
        const w = containerRef.current.clientWidth || dimensions?.width || 800;
        const h = containerRef.current.clientHeight || dimensions?.height || 600;
        const cam = camera || { x: 0, y: 0, scale: 1 };
        const indicators: any[] = [];
        bots.forEach(bot => {
            const bHex = grid[`${bot.q},${bot.r}`];
            if (!bHex) return;
            const rawNX = HEX_SIZE * (Math.sqrt(3) * bot.q + Math.sqrt(3) / 2 * bot.r);
            const rawNY = HEX_SIZE * (1.5 * bot.r);
            const angleOffset = rotation * (Math.PI / 180);
            const cos = Math.cos(angleOffset), sin = Math.sin(angleOffset);
            const cx = rawNX * cos - rawNY * sin;
            const cy = (rawNX * sin + rawNY * cos) * 0.8 + getHexVisualHeight(bHex.currentLevel);
            const botX = cam.x + cx * cam.scale, botY = cam.y + cy * cam.scale;
            const isOffscreen = botX < 0 || botX > w || botY < 0 || botY > h;
            if (isOffscreen) {
                const centerX = w / 2, centerY = h / 2;
                const dx = botX - centerX, dy = botY - centerY;
                const angle = Math.atan2(dy, dx);
                let edgeX = centerX, edgeY = centerY;
                const slope = dx !== 0 ? dy / dx : 10000;
                const halfW = w / 2 - 12, halfH = h / 2 - 12;
                if (Math.abs(dx) * halfH > Math.abs(dy) * halfW) { if (dx > 0) { edgeX = centerX + halfW; edgeY = centerY + halfW * slope; } else { edgeX = centerX - halfW; edgeY = centerY - halfW * slope; } }
                else { if (dy > 0) { edgeY = centerY + halfH; edgeX = centerX + halfH / slope; } else { edgeY = centerY - halfH; edgeX = centerX - halfH / slope; } }
                indicators.push({ id: bot.id, x: edgeX, y: edgeY, angle: angle, isDestroyer: bot.memory?.botRole === 'DESTROYER' || bot.id.toLowerCase().includes('destroyer'), distance: player ? cubeDistance(player, bot) : null });
            }
        });
        return indicators;
    }, [bots, grid, camera, rotation, dimensions, player, isDefenseMode]);

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
            {offscreenBotIndicators.map(ind => (
                <div 
                    key={ind.id}
                    className="absolute pointer-events-none flex items-center justify-center animate-pulse z-50"
                    style={{ left: `${ind.x}px`, top: `${ind.y}px`, transform: 'translate(-50%, -50%)' }}
                >
                    <div 
                        className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-b-[16px] border-b-red-500 shadow-md filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]"
                        style={{ transform: `rotate(${ind.angle * (180 / Math.PI) - 90}deg)` }}
                    />
                </div>
            ))}
        </div>
    );
};

export default MapRenderer;