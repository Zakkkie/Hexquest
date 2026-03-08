import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Layer, Group, Line, Circle, Text, Path } from "react-konva";
import Konva from "konva";
import { useGameStore } from "../store.ts";
import { getHexKey, getNeighbors, pixelToHex, cubeDistance } from "../services/hexUtils.ts";
import { HexNode } from "./HexNode.tsx";
import Unit from "./Unit.tsx";
import { EntityType, EntityState } from "../types.ts";
import { EXCHANGE_RATE_COINS_PER_MOVE, HEX_SIZE } from "../rules/config.ts";
import { safifyCoord } from "../utils/safeCoordinates.ts";
const VOID_LEVEL_FLAG = -99;
const FLOATING_EFFECT_VERTICAL_SPACING = 25;
const FLOATING_EFFECT_RISE_DISTANCE = 80;
const FLOATING_EFFECT_BASE_Y_OFFSET = 20;
const FLOATING_EFFECT_TEXT_WIDTH = 100;
const FLOATING_EFFECT_TEXT_X_OFFSET = -50;
const FLOATING_EFFECT_FONT_SIZE = 16;
const FLOATING_EFFECT_ENTRANCE_DURATION = 0.2;
const FLOATING_EFFECT_MIN_EXIT_DURATION = 0.1;
const DUST_FADE_DURATION_MIN = 0.4;
const DUST_FADE_DURATION_VARIANCE = 0.2;
const DUST_LIFETIME_MS = 600;
const DUST_DISPERSION_MIN = 10;
const DUST_DISPERSION_VARIANCE = 10;
const DEG_TO_RAD = Math.PI / 180;
const BASE_POINTS = [];
for (let i = 0; i < 6; i++) {
  const angle = (60 * i + 30) * DEG_TO_RAD;
  BASE_POINTS.push({ x: Math.cos(angle) * HEX_SIZE, y: Math.sin(angle) * HEX_SIZE });
}
let BASE_PATH_D = `M ${BASE_POINTS[0].x} ${BASE_POINTS[0].y}`;
for (let i = 1; i < 6; i++) BASE_PATH_D += ` L ${BASE_POINTS[i].x} ${BASE_POINTS[i].y}`;
BASE_PATH_D += " Z";
const SelectionGlow = React.memo(({ x, y, offsetY, rotation }) => /* @__PURE__ */ jsx(Group, { x, y, scaleY: 0.8, perfectDrawEnabled: false, listening: false, children: /* @__PURE__ */ jsx(Group, { rotation, y: offsetY, perfectDrawEnabled: false, children: /* @__PURE__ */ jsx(Path, { data: BASE_PATH_D, stroke: "#22d3ee", strokeWidth: 2.5, shadowColor: "#06b6d4", shadowBlur: 10, perfectDrawEnabled: false, shadowForStrokeEnabled: false }) }) }));
const LOD_LEVELS = {
  VERY_FAR: { maxDistance: 25, detail: "minimal" },
  FAR: { maxDistance: 15, detail: "reduced" },
  MEDIUM: { maxDistance: 8, detail: "normal" },
  CLOSE: { maxDistance: 3, detail: "full" }
};
const INTERACTION_LOD_RADIUS = 10;
const getHexRenderMode = (dist, isInteracting) => {
  if (isInteracting && dist > INTERACTION_LOD_RADIUS) {
    return { detailLevel: "reduced", showTexture: false, showGlow: false, showDetails: false };
  }
  if (dist > LOD_LEVELS.VERY_FAR.maxDistance) {
    return { detailLevel: "minimal", showTexture: false, showGlow: false, showDetails: false };
  } else if (dist > LOD_LEVELS.FAR.maxDistance) {
    return { detailLevel: "reduced", showTexture: false, showGlow: false, showDetails: false };
  } else if (dist > LOD_LEVELS.MEDIUM.maxDistance) {
    return { detailLevel: "normal", showTexture: true, showGlow: false, showDetails: true };
  } else {
    return { detailLevel: "full", showTexture: true, showGlow: true, showDetails: true };
  }
};
const THEME_PALETTE = {
  "0": { main: "#1e293b", light: "#334155", dark: "#0f172a", stroke: "#475569" },
  "1": { main: "#0f172a", light: "#1e293b", dark: "#020617", stroke: "#0c4a6e" },
  "2": { main: "#172554", light: "#1e3a8a", dark: "#0f172a", stroke: "#0284c7" },
  "3": { main: "#1e3a8a", light: "#2563eb", dark: "#172554", stroke: "#0ea5e9" },
  "4": { main: "#312e81", light: "#4338ca", dark: "#1e1b4b", stroke: "#6366f1" },
  "5": { main: "#4c1d95", light: "#5b21b6", dark: "#2e1065", stroke: "#8b5cf6" },
  "6": { main: "#581c87", light: "#6b21a8", dark: "#3b0764", stroke: "#a855f7" },
  "7": { main: "#701a75", light: "#86198f", dark: "#4a044e", stroke: "#d946ef" },
  "8": { main: "#451a03", light: "#7f1d1d", dark: "#271a0c", stroke: "#d97706" },
  "9": { main: "#713f12", light: "#a16207", dark: "#422006", stroke: "#f59e0b" },
  "10": { main: "#854d0e", light: "#ca8a04", dark: "#713f12", stroke: "#fcd34d" },
  "-1": { main: "#292524", light: "#44403c", dark: "#1c1917", stroke: "#57534e" },
  "-2": { main: "#1c1917", light: "#292524", dark: "#0c0a09", stroke: "#44403c" },
  "-3": { main: "#0c0a09", light: "#1c1917", dark: "#000000", stroke: "#292524" },
  "-4": { main: "#450a0a", light: "#7f1d1d", dark: "#2a0505", stroke: "#991b1b" },
  "-5": { main: "#7f1d1d", light: "#991b1b", dark: "#450a0a", stroke: "#dc2626" },
  "-6": { main: "#991b1b", light: "#b91c1c", dark: "#7f1d1d", stroke: "#ef4444" },
  "-7": { main: "#c2410c", light: "#ea580c", dark: "#7c2d12", stroke: "#f97316" },
  "-8": { main: "#fff7ed", light: "#ffedd5", dark: "#c2410c", stroke: "#ffffff" }
};
const getTheme = (level) => {
  if (level > 8) return THEME_PALETTE["10"];
  if (level < -8) return THEME_PALETTE["-8"];
  const key = String(level);
  if (THEME_PALETTE[key]) return THEME_PALETTE[key];
  if (level > 0) {
    if (level <= 3) return THEME_PALETTE["1"];
    if (level <= 7) return THEME_PALETTE["4"];
    return THEME_PALETTE["8"];
  }
  if (level < 0) {
    if (level >= -3) return THEME_PALETTE["-1"];
    if (level >= -7) return THEME_PALETTE["-4"];
    return THEME_PALETTE["-8"];
  }
  return THEME_PALETTE["0"];
};
const getHeightOffset = (level) => {
  if (level <= VOID_LEVEL_FLAG) return 0;
  if (level >= 0) return -(10 + level * 10);
  return (Math.abs(level) - 1) * 10;
};
const PooledDustCloud = React.memo(({ particle }) => {
  const groupRef = useRef(null);
  const tweensRef = useRef([]);
  useEffect(() => {
    const node = groupRef.current;
    if (!node || !particle) return;
    const puffs = node.find("Circle");
    tweensRef.current.forEach((t) => t.destroy());
    tweensRef.current = [];
    puffs.forEach((puff) => {
      const angle = Math.random() * Math.PI * 2;
      const dist = DUST_DISPERSION_MIN + Math.random() * DUST_DISPERSION_VARIANCE;
      const tween = new Konva.Tween({
        node: puff,
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.6,
        scaleX: 0,
        scaleY: 0,
        opacity: 0,
        duration: DUST_FADE_DURATION_MIN + Math.random() * DUST_FADE_DURATION_VARIANCE,
        easing: Konva.Easings.EaseOut
      });
      puff.setAttrs({ x: 0, y: 0, scaleX: 1, scaleY: 1, opacity: 0.4 });
      tween.play();
      tweensRef.current.push(tween);
    });
    return () => {
      tweensRef.current.forEach((t) => t.destroy());
    };
  }, [particle]);
  if (!particle) return /* @__PURE__ */ jsx(Group, { visible: false });
  return /* @__PURE__ */ jsx(Group, { ref: groupRef, x: particle.x, y: particle.y, listening: false, perfectDrawEnabled: false, children: [0, 1, 2, 3].map((i) => /* @__PURE__ */ jsx(Circle, { radius: 3 + Math.random() * 3, fill: particle.color, opacity: 0.4, perfectDrawEnabled: false }, i)) });
});
const simpleHexToPixel = (q, r, rotation) => {
  const rawX = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3) / 2 * r);
  const rawY = HEX_SIZE * (1.5 * r);
  const angleRad = rotation * (Math.PI / 180);
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const x = rawX * cos - rawY * sin;
  const y = (rawX * sin + rawY * cos) * 0.8;
  return safifyCoord(x, y);
};
const PooledFloatingEffect = React.memo(({ effect, rotation }) => {
  const animRef = useRef(null);
  const tweensRef = useRef([]);
  useEffect(() => {
    const node = animRef.current;
    if (!node || !effect) return;
    node.y(0);
    node.opacity(0);
    node.scale({ x: 0.5, y: 0.5 });
    tweensRef.current.forEach((t) => t.destroy());
    tweensRef.current = [];
    const fadeIn = new Konva.Tween({
      node,
      opacity: 1,
      scaleX: 1,
      scaleY: 1,
      duration: FLOATING_EFFECT_ENTRANCE_DURATION,
      easing: Konva.Easings.EaseOut,
      onFinish: () => {
        const floatOut = new Konva.Tween({
          node,
          y: -FLOATING_EFFECT_RISE_DISTANCE,
          opacity: 0,
          scaleX: 1.2,
          scaleY: 1.2,
          duration: Math.max(FLOATING_EFFECT_MIN_EXIT_DURATION, effect.lifetime / 1e3 - FLOATING_EFFECT_ENTRANCE_DURATION),
          easing: Konva.Easings.EaseOut
        });
        floatOut.play();
        tweensRef.current.push(floatOut);
      }
    });
    fadeIn.play();
    tweensRef.current.push(fadeIn);
    return () => {
      tweensRef.current.forEach((t) => t.destroy());
    };
  }, [effect]);
  if (!effect) return /* @__PURE__ */ jsx(Group, { visible: false });
  const { x, y } = simpleHexToPixel(effect.q, effect.r, rotation);
  const verticalOffset = (effect.stackIndex || 0) * FLOATING_EFFECT_VERTICAL_SPACING;
  return /* @__PURE__ */ jsx(Group, { x, y: y - FLOATING_EFFECT_BASE_Y_OFFSET - verticalOffset, listening: false, perfectDrawEnabled: false, children: /* @__PURE__ */ jsx(Group, { ref: animRef, perfectDrawEnabled: false, children: /* @__PURE__ */ jsx(Text, { text: effect.text || "", fontSize: FLOATING_EFFECT_FONT_SIZE, fontStyle: "bold", fill: effect.color || "#fff", x: FLOATING_EFFECT_TEXT_X_OFFSET, width: FLOATING_EFFECT_TEXT_WIDTH, align: "center", shadowColor: effect.color || "#fff", shadowBlur: 10, perfectDrawEnabled: false }) }) });
});
const MapRenderer = ({ viewState, dimensions, rotation, onHexClick, onHover, hoveredHexId, isInteracting }) => {
  const session = useGameStore((state) => state.session);
  const grid = session?.grid || {};
  const player = session?.player;
  const bots = session?.bots || [];
  const effects = session?.effects || [];
  const activeLevelConfig = session?.activeLevelConfig;
  const isPlayerGrowing = session?.isPlayerGrowing || false;
  const pendingConfirmation = useGameStore((state) => state.pendingConfirmation);
  const selectedHexId = grid && player ? getHexKey(player.q, player.r) : null;
  const DUST_POOL_SIZE = 50;
  const dustPool = useRef(new Array(DUST_POOL_SIZE).fill(null));
  const dustIndex = useRef(0);
  const [, setParticlesVersion] = useState(0);
  const memoizedOnHexClick = useCallback((q, r) => {
    onHexClick(q, r);
  }, [onHexClick]);
  const spawnDust = useCallback((x, y, color) => {
    const id = `dust-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const idx = dustIndex.current;
    dustPool.current[idx] = { id, x, y, color };
    dustIndex.current = (idx + 1) % DUST_POOL_SIZE;
    setParticlesVersion((v) => v + 1);
  }, []);
  const stackedEffects = useMemo(() => {
    if (!Array.isArray(effects)) return [];
    const sorted = [...effects].sort((a, b) => (a?.startTime || 0) - (b?.startTime || 0));
    const counts = {};
    return sorted.map((eff) => {
      if (!eff) return null;
      const key = `${eff.q},${eff.r}`;
      const idx = counts[key] || 0;
      counts[key] = idx + 1;
      return { ...eff, stackIndex: idx };
    }).filter(Boolean);
  }, [effects]);
  const projectionCache = useMemo(() => {
    const angleRad = rotation * (Math.PI / 180);
    return {
      cos: Math.cos(angleRad),
      sin: Math.sin(angleRad)
    };
  }, [rotation]);
  const renderList = useMemo(() => {
    if (!session || !player || Object.keys(grid).length === 0) return [];
    const items = [];
    const inverseScale = 1 / (viewState.scale || 1);
    const x0 = -(viewState.x || 0) * inverseScale;
    const y0 = -(viewState.y || 0) * inverseScale;
    const width = (dimensions.width || window.innerWidth) * inverseScale;
    const height = (dimensions.height || window.innerHeight) * inverseScale;
    const CULL_PADDING = 150;
    const corners = [
      pixelToHex(x0 - CULL_PADDING, y0 - CULL_PADDING, rotation),
      pixelToHex(x0 + width + CULL_PADDING, y0 - CULL_PADDING, rotation),
      pixelToHex(x0 + width + CULL_PADDING, y0 + height + CULL_PADDING, rotation),
      pixelToHex(x0 - CULL_PADDING, y0 + height + CULL_PADDING, rotation)
    ];
    const qMin = Math.min(...corners.map((c) => c.q));
    const qMax = Math.max(...corners.map((c) => c.q));
    const rMin = Math.min(...corners.map((c) => c.r));
    const rMax = Math.max(...corners.map((c) => c.r));
    const playerNeighbors = getNeighbors(player.q, player.r) || [];
    const pendingTarget = pendingConfirmation?.data?.path?.[pendingConfirmation.data.path.length - 1];
    const pendingKey = pendingTarget ? getHexKey(pendingTarget.q, pendingTarget.r) : null;
    const { cos, sin } = projectionCache;
    const SQRT3 = Math.sqrt(3);
    const SQRT3_2 = SQRT3 / 2;
    const ONE_POINT_FIVE = 1.5;
    const fastProject = (q, r) => {
      const rawX = HEX_SIZE * (SQRT3 * q + SQRT3_2 * r);
      const rawY = HEX_SIZE * (ONE_POINT_FIVE * r);
      const px = rawX * cos - rawY * sin;
      const py = (rawX * sin + rawY * cos) * 0.8;
      return safifyCoord(px, py);
    };
    const centerHex = pixelToHex(x0 + width / 2, y0 + height / 2, rotation);
    const levelId = activeLevelConfig?.id;
    for (let q = qMin; q <= qMax; q++) {
      for (let r = rMin; r <= rMax; r++) {
        const hexKey = getHexKey(q, r);
        const hex = grid[hexKey];
        if (!hex) continue;
        const { x, y } = fastProject(q, r);
        if (x < x0 - CULL_PADDING || x > x0 + width + CULL_PADDING || y < y0 - CULL_PADDING || y > y0 + height + CULL_PADDING) {
          continue;
        }
        const distToCamera = cubeDistance(centerHex, { q, r });
        const renderMode = getHexRenderMode(distToCamera, isInteracting);
        const neighborLevels = new Array(6).fill(VOID_LEVEL_FLAG);
        const rawN = getNeighbors(hex.q, hex.r);
        for (let i = 0; i < 6; i++) {
          const neighborIdx = 5 - i;
          if (rawN[neighborIdx]) {
            const nHex = grid[getHexKey(rawN[neighborIdx].q, rawN[neighborIdx].r)];
            if (nHex && nHex.structureType !== "VOID") {
              neighborLevels[i] = nHex.currentLevel ?? 0;
            }
          }
        }
        const isPending = hex.id === pendingKey;
        const isOccupiedByPlayer = hex.q === player.q && hex.r === player.r;
        let isTutorial = false;
        let isArrow = false;
        let tutColor = "emerald";
        if (renderMode.showDetails && !isPlayerGrowing && hex.structureType !== "VOID") {
          try {
            if (levelId === "1.1") {
              if (hex.maxLevel === 0 && !hex.ownerId && !isOccupiedByPlayer) {
                isTutorial = true;
                isArrow = true;
                tutColor = "amber";
              }
            } else if (levelId === "1.2" || levelId === "3.1") {
              if (hex.structureType === "CAPITAL") {
                isTutorial = true;
                isArrow = true;
                tutColor = "emerald";
              }
            } else if (levelId === "1.3") {
              const center = grid[getHexKey(0, 0)];
              if (center && center.maxLevel < 2) {
                const cn = getNeighbors(0, 0);
                const supportCount = cn.filter((n) => {
                  const h = grid[getHexKey(n.q, n.r)];
                  return h && h.maxLevel >= 1 && h.structureType !== "VOID";
                }).length;
                if (supportCount >= 2) {
                  if (hex.q === 0 && hex.r === 0) {
                    isTutorial = true;
                    isArrow = true;
                    tutColor = "amber";
                  }
                } else {
                  const isNeighbor = cn.some((n) => n.q === hex.q && n.r === hex.r);
                  if (isNeighbor && hex.maxLevel < 1 && !isOccupiedByPlayer) {
                    isTutorial = true;
                    isArrow = true;
                    tutColor = "cyan";
                  }
                }
              }
            } else if (levelId === "1.4") {
              const center = grid[getHexKey(0, 0)];
              if (center && center.maxLevel < 3) {
                const isPlayerOnCenter = player.q === 0 && player.r === 0;
                if (!isPlayerOnCenter) {
                  if (hex.q === 0 && hex.r === 0) {
                    isTutorial = true;
                    isArrow = true;
                    tutColor = "amber";
                  }
                } else {
                  if (player.storage >= 1) {
                    if (hex.q === 0 && hex.r === 0) {
                      isTutorial = true;
                      isArrow = true;
                      tutColor = "amber";
                    }
                  } else {
                    if (hex.maxLevel >= 2 && hex.id !== getHexKey(0, 0)) {
                      isTutorial = true;
                      isArrow = true;
                      tutColor = "red";
                    }
                  }
                }
              }
            } else if (levelId === "1.6") {
              if (hex.q === 0 && hex.r === 0 && !isOccupiedByPlayer) {
                isTutorial = true;
                isArrow = true;
                tutColor = "amber";
              }
            }
          } catch (e) {
          }
        }
        items.push({
          type: "HEX",
          depth: y,
          props: {
            x,
            y,
            rotation,
            q: hex.q,
            r: hex.r,
            id: hex.id,
            offsetY: hex.structureType === "VOID" ? -2 : getHeightOffset(hex.structureType === "VOID" ? 0 : hex.maxLevel),
            level: hex.currentLevel ?? 0,
            maxLevel: hex.maxLevel || 0,
            structureType: hex.structureType,
            neighborLevels,
            theme: getTheme(hex.structureType === "VOID" ? 0 : hex.maxLevel),
            isSelected: selectedHexId === hex.id,
            isPending,
            pendingCost: isPending && pendingConfirmation ? pendingConfirmation.data.costCoins : null,
            isTutorialTarget: isTutorial,
            isTargetArrow: isArrow,
            tutorialColor: tutColor,
            isMissingSupport: false,
            isOccupied: isOccupiedByPlayer || bots.some((b) => b.q === hex.q && b.r === hex.r),
            isGrowing: hex.progress > 0 && hex.structureType !== "VOID",
            isRankLocked: (hex.maxLevel || 0) > (player.playerLevel || 0),
            progress: hex.progress || 0,
            durability: hex.durability,
            artifactType: hex.artifact?.type,
            onHexClick: memoizedOnHexClick,
            onHover,
            renderMode
          }
        });
      }
    }
    const allEntities = [
      { ...player, isPlayer: true },
      ...bots.map((b) => ({ ...b, isPlayer: false }))
    ];
    for (const u of allEntities) {
      if (!u) continue;
      const px = fastProject(u.q, u.r);
      if (px.x < x0 - CULL_PADDING || px.x > x0 + width + CULL_PADDING || px.y < y0 - CULL_PADDING || px.y > y0 + height + CULL_PADDING) continue;
      const uHex = grid[getHexKey(u.q, u.r)];
      const hLevel = uHex ? uHex.maxLevel : 0;
      const isMoving = u.state === EntityState.MOVING;
      const depthBias = isMoving ? 50 : 1;
      items.push({
        type: "UNIT",
        depth: px.y + depthBias,
        props: {
          id: u.id,
          q: u.q,
          r: u.r,
          type: u.isPlayer ? EntityType.PLAYER : EntityType.BOT,
          color: u.avatarColor,
          rotation,
          hexLevel: hLevel,
          totalCoinsEarned: u.totalCoinsEarned || 0,
          upgradePointCount: u.recentUpgrades?.length || 0,
          headIndex: u.headIndex || 0,
          bodyIndex: u.bodyIndex || 0,
          onMoveComplete: spawnDust
        }
      });
    }
    if (!isPlayerGrowing && player.state !== EntityState.MOVING) {
      const pStart = fastProject(player.q, player.r);
      const pHex = grid[getHexKey(player.q, player.r)];
      const startH = pHex ? 10 + pHex.maxLevel * 6 : 10;
      for (const n of playerNeighbors) {
        const nKey = getHexKey(n.q, n.r);
        const nHex = grid[nKey];
        const isBot = bots.some((b) => b.q === n.q && b.r === n.r);
        const isVoid = nHex?.structureType === "VOID";
        if (isBot || isVoid) continue;
        const nPos = fastProject(n.q, n.r);
        const endH = nHex ? 10 + (nHex.maxLevel || 0) * 6 : 10;
        if (Math.abs((pHex?.maxLevel || 0) - (nHex?.maxLevel || 0)) > 1) continue;
        const level = nHex ? nHex.maxLevel : 0;
        const cost = level > 1 ? level : 1;
        const canAfford = (player.moves || 0) >= cost || (player.coins || 0) >= cost * EXCHANGE_RATE_COINS_PER_MOVE;
        const connId = `conn-${pStart.x.toFixed(0)}-${pStart.y.toFixed(0)}-${nPos.x.toFixed(0)}-${nPos.y.toFixed(0)}`;
        items.push({
          type: "CONN",
          depth: Math.min(pStart.y, nPos.y),
          props: {
            id: connId,
            points: [pStart.x, pStart.y - startH, nPos.x, nPos.y - endH],
            stroke: canAfford ? "#3b82f6" : "#ef4444",
            dash: [5, 5],
            opacity: nHex && (nHex.maxLevel || 0) > (player.playerLevel || 0) ? 0.2 : 0.6
          }
        });
      }
    }
    items.sort((a, b) => a.depth - b.depth);
    return items;
  }, [session, viewState, rotation, hoveredHexId, pendingConfirmation, isInteracting, memoizedOnHexClick, onHover, spawnDust, projectionCache]);
  const POOL_SIZE = 50;
  const pooledEffects = useMemo(() => {
    const pool = new Array(POOL_SIZE).fill(null);
    for (let i = 0; i < stackedEffects.length && i < POOL_SIZE; i++) {
      pool[i] = stackedEffects[i];
    }
    return pool;
  }, [stackedEffects]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx(Layer, { children: renderList.map((item, i) => {
      const key = item.props.id || `item-${i}`;
      if (item.type === "HEX") return /* @__PURE__ */ jsx(HexNode, { ...item.props }, key);
      if (item.type === "UNIT") return /* @__PURE__ */ jsx(Unit, { ...item.props }, key);
      if (item.type === "CONN") return /* @__PURE__ */ jsx(Line, { ...item.props, strokeWidth: 2, listening: false, perfectDrawEnabled: false }, key);
      return /* @__PURE__ */ jsx(Group, { visible: false }, key);
    }) }),
    /* @__PURE__ */ jsxs(Layer, { listening: false, children: [
      dustPool.current.map((p, i) => /* @__PURE__ */ jsx(PooledDustCloud, { particle: p }, `dust-${i}`)),
      pooledEffects.map((eff, i) => /* @__PURE__ */ jsx(PooledFloatingEffect, { effect: eff, rotation }, `pool-${i}`))
    ] })
  ] });
};
export default MapRenderer;
