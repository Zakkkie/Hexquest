import React, { useMemo, useEffect, useRef } from "react";
import { Group, Path, Circle, Text, Line, Star } from "react-konva";
import Konva from "konva";
import { useGameStore } from "../store.ts";
import { useEphemeralStore } from "../store/ephemeralStore.ts";
import { HEX_SIZE, GAME_CONFIG } from "../rules/config.ts";
import { textureService } from "../services/textureService.ts";
import { wallUpdaterRegistry } from "../services/wallUpdater.ts";

const DEG_TO_RAD = Math.PI / 180;
const ARROW_UP_PATH = "M12 4l-8 8h6v8h4v-8h6z";

// NEW 3D ARROW GEOMETRY (Centered at 0,0)
const ARROW_FACE_PATH = "M -8 -10 H 8 V 0 H 16 L 0 16 L -16 0 H -8 Z";
const ARROW_SIDE_PATH = "M -8 -6 H 8 V 4 H 16 L 0 20 L -16 4 H -8 Z"; // Shifted Y+4 for depth

const MAX_WALL_DEPTH = 200;

export interface HexNodeTheme {
  main: string;
  light: string;
  dark: string;
  stroke: string;
}

export interface HexNodeProps {
  x: number;
  y: number;
  offsetY: number;
  level: number;
  maxLevel: number;
  structureType: string | undefined;
  neighborLevels: number[];
  theme: HexNodeTheme;
  isSelected: boolean;
  isPending: boolean;
  pendingCost: number | null;
  isTutorialTarget: boolean; // Highlights border
  isTargetArrow: boolean; // New: Bouncing Arrow
  tutorialColor: string;
  isMissingSupport: boolean;
  isOccupied: boolean;
  isGrowing: boolean;
  isRankLocked: boolean;
  progress: number;
  durability?: number;
  artifactType?: string;
  biome?: string;
  poiType?: string;
  isPassable?: boolean;
  isRevealed: boolean;
  drawVoidWalls?: boolean;
  q: number;
  r: number;
  onHexClick: (q: number, r: number) => void;
  onHover: (id: string | null) => void;
  id: string;
  opacity?: number;
  lighting?: number;
  isExcavated?: boolean;
  isPlayerBuilt?: boolean;
  playerQ?: number;
  playerR?: number;
  playerGrowthIntent?: string | null;
  growthAccelerator?: number;
  renderMode?: {
    detailLevel: string;
    showTexture: boolean;
    showGlow: boolean;
    showDetails: boolean;
  };
  portalActive?: boolean;
  figureIndex?: number;
}

// Precompute the base (unsquashed) hexagon path centered at 0,0
const BASE_POINTS: { x: number; y: number }[] = [];
for (let i = 0; i < 6; i++) {
  const angle = (60 * i + 30) * DEG_TO_RAD;
  BASE_POINTS.push({
    x: Math.cos(angle) * HEX_SIZE,
    y: Math.sin(angle) * HEX_SIZE,
  });
}
let BASE_PATH_D = `M ${BASE_POINTS[0].x} ${BASE_POINTS[0].y}`;
for (let i = 1; i < 6; i++)
  BASE_PATH_D += ` L ${BASE_POINTS[i].x} ${BASE_POINTS[i].y}`;
BASE_PATH_D += " Z";

const BASE_POINTS_THREE = BASE_POINTS.slice(0, 3);
const GAUGE_SECTORS = Array.from({ length: 12 }, (_, i) => i);
const FILL_SCALE = { x: HEX_SIZE / 32, y: HEX_SIZE / 32 };
const FILL_OFFSET = { x: 32, y: 32 };

// Damage Cracks Logic
const CRACK_PATHS = [
  "M-10,-5 L0,0 L10,-2",
  "M5,10 L-2,0 L8,-12",
  "M-15,0 L-5,5 L-2,-8",
  "M12,5 L2,2 L5,15",
  "M-8,-12 L2,-5 L-5,0",
  "M0,15 L-5,8 L5,2",
];

const getPoiIcon = (type: string): string => {
  switch (type) {
    case "city_hub":
      return "🏛️";
    case "tavern_travelers":
      return "🍺";
    case "bulletin_board":
      return "📋";
    case "guard_post":
      return "🛡️";
    case "forge":
      return "⚒️";
    case "alchemist":
      return "🧪";
    case "watchtower":
      return "🔭";
    case "market":
      return "⚖️";
    case "warehouse":
      return "📦";
    case "healer":
      return "🩹";
    case "temple":
      return "⛪";
    case "archive":
      return "📜";
    case "tavern_spirit":
      return "🍷";
    case "RIFT_S1_2":
      return "🌀";
    case "RIFT_S3_4":
      return "🌋";
    default:
      return "📍";
  }
};

const getArrowColor = (type: string, part: "main" | "shadow"): string => {
  const isShadow = part === "shadow";
  switch (type) {
    case "amber":
      return isShadow ? "#b45309" : "#fbbf24";
    case "cyan":
      return isShadow ? "#0e7490" : "#22d3ee";
    case "red":
      return isShadow ? "#991b1b" : "#ef4444";
    default:
      return isShadow ? "#0f766e" : "#34d399"; // emerald
  }
};

const HexNodeComponent = (props: HexNodeProps) => {
  const campaignMode = useGameStore(state => state.campaignMode);
  const {
    x,
    y,
    offsetY,
    level,
    maxLevel,
    neighborLevels,
    structureType,
    theme,
    isSelected,
    isPending,
    pendingCost,
    isTutorialTarget,
    isTargetArrow,
    tutorialColor,
    isMissingSupport,
    isGrowing,
    progress,
    durability,
    artifactType,
    poiType,
    isRevealed,
    drawVoidWalls = true,
    q,
    r,
    id,
    onHexClick,
    onHover,
    opacity = 1,
    lighting = 1,
    isExcavated,
    isPlayerBuilt,
    playerQ,
    playerR,
    playerGrowthIntent,
    growthAccelerator = 0,
    renderMode,
    portalActive,
  } = props;

  const isPlayerAction = !!(isGrowing && playerQ === q && playerR === r);
  const currentIntent = isPlayerAction
    ? playerGrowthIntent || "UPGRADE"
    : "UPGRADE";
  const neededTicks = isPlayerAction
    ? Math.max(10, 30 - growthAccelerator * 5)
    : 30;
  const progressRatio = isGrowing ? Math.min(1.0, progress / neededTicks) : 0;

  // Textures are now always loaded since LOD is removed
  const showTexture = renderMode?.showTexture;
  const topTexture = useMemo(() => {
    if (showTexture === false) return null;
    return textureService.getTexture(level, q, r, undefined);
  }, [level, q, r, showTexture]);

  const sideTexture = useMemo(() => {
    if (showTexture === false) return null;
    return textureService.getSideTexture(level, undefined);
  }, [level, showTexture]);

  const isRealVoid = structureType === "VOID";
  const isMonument = structureType === "MONUMENT";
  const isMiniMonument = structureType === "MINI_MONUMENT";
  const isNegative = level < 0;

  // Boost speed & hover refs for Portal responsiveness
  const boostSpeedRef = useRef<number>(0);
  const hoverOutlineRef = useRef<Konva.Path>(null);
  const isPlayerInsideRef = useRef<boolean>(false);

  const isPlayerInside = !!(portalActive && playerQ === q && playerR === r);
  useEffect(() => {
    isPlayerInsideRef.current = isPlayerInside;
  }, [isPlayerInside]);

  useEffect(() => {
    return useEphemeralStore.subscribe((state) => {
      const isHovered = state.hoveredHexId === id;
      if (hoverOutlineRef.current) {
         hoverOutlineRef.current.opacity(isHovered ? 1 : 0);
      }
    });
  }, [id]);

  const handleClick = (e: any) => {
    if (e.evt && e.evt.button !== undefined && e.evt.button !== 0) return;
    e.cancelBubble = true;
    if (portalActive) {
      // Instantly kickstart/accelerate portal on click with high kinetic energy
      boostSpeedRef.current = 45.0;
    }
    onHexClick(q, r);
  };

  const handleHover = () => onHover(id);
  const handleHoverEnd = () => onHover(null);

  // Damage indicators (Cracks)
  const damageLevel = useMemo(() => {
    if (maxLevel !== 1 || durability === undefined) return 0;
    const maxD = GAME_CONFIG.L1_HEX_MAX_DURABILITY;
    return Math.max(0, maxD - durability);
  }, [maxLevel, durability]);

  const { gradStart, gradEnd, opacityMod } = useMemo(() => {
    const hashStr = `${id}`;
    let hash = 0;
    for (let i = 0; i < hashStr.length; i++) {
      hash = hashStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const rand = (Math.abs(hash) % 100) / 100;
    const angle = rand * Math.PI * 2;
    return {
      gradStart: {
        x: Math.cos(angle) * HEX_SIZE,
        y: Math.sin(angle) * HEX_SIZE,
      },
      gradEnd: {
        x: Math.cos(angle + Math.PI) * HEX_SIZE,
        y: Math.sin(angle + Math.PI) * HEX_SIZE,
      },
      opacityMod: rand * 0.12,
    };
  }, [id]);

  // Void Animation Ref
  const voidOutlineRef = useRef<Konva.Path>(null);
  const monumentGlowRef = useRef<Konva.Path>(null);
  const arrowRef = useRef<Konva.Group>(null);
  const shapeGlowRef = useRef<Konva.Path>(null);

  const groupRef = useRef<Konva.Group>(null);
  const topFaceGroupRef = useRef<Konva.Group>(null);
  const faceContainerRef = useRef<Konva.Group>(null);
  const overlaysContainerRef = useRef<Konva.Group>(null);

  // Distance and Blur calculation for player vision reducing to 5 hexes:
  const distToPlayer = useMemo(() => {
    if (playerQ !== undefined && playerR !== undefined) {
      return (
        (Math.abs(q - playerQ) +
          Math.abs(q + r - playerQ - playerR) +
          Math.abs(r - playerR)) /
        2
      );
    }
    return 0;
  }, [q, r, playerQ, playerR]);

  const isBlurred = distToPlayer >= 3;

  const blurProps = useMemo(() => {
    if (distToPlayer <= 2) {
      return { shadowEnabled: false };
    }
    // Progressive physical edge blurring utilizing hardware-accelerated drop shadow properties
    const blurRadius = (distToPlayer - 2) * 8; // e.g., 8px blur at d=3, 16px blur at d=4, 24px blur at d=5
    return {
      shadowEnabled: true,
      shadowColor: "#020617", // Match the deep space background color
      shadowBlur: blurRadius,
      shadowOpacity: 0.15 * distToPlayer,
      shadowOffset: { x: 0, y: 0 },
    };
  }, [distToPlayer]);

  // Smoothly transition node opacity via native highly-optimized Konva Tween engine
  useEffect(() => {
    const g = groupRef.current;
    if (g) {
      const isLite = useGameStore.getState().isLiteMode;
      if (isLite) {
        g.opacity(opacity);
      } else {
        const tween = new Konva.Tween({
          node: g,
          duration: 0.35, // 350ms gradual smooth fade-in/fade-out
          opacity: opacity,
          easing: Konva.Easings.EaseInOut,
        });
        tween.play();
        return () => tween.destroy();
      }
    }
  }, [opacity]);

  // Holographic scan matrix animation refs
  const growingGlowGroupRef = useRef<Konva.Group>(null);
  const growingGlowOppositeRef = useRef<Konva.Group>(null);

  const growthRequestRef = useRef<number | null>(null);
  const growthRotValRef = useRef<number>(0);
  const growthPulseScaleRef = useRef<number>(1);
  const growthPulseDirRef = useRef<number>(1);

  useEffect(() => {
    let active = true;
    if (!isGrowing) {
      if (growthRequestRef.current)
        cancelAnimationFrame(growthRequestRef.current);
      growthRequestRef.current = null;
      return;
    }

    const animateGrowth = () => {
      if (!active) return;

      // Rotate matrix rings
      growthRotValRef.current = (growthRotValRef.current + 2.0) % 360;
      const antiRot = (360 - growthRotValRef.current) % 360;

      // Pulsate scale dynamically
      growthPulseScaleRef.current += growthPulseDirRef.current * 0.012;
      if (growthPulseScaleRef.current >= 1.12) {
        growthPulseScaleRef.current = 1.12;
        growthPulseDirRef.current = -1;
      } else if (growthPulseScaleRef.current <= 0.88) {
        growthPulseScaleRef.current = 0.88;
        growthPulseDirRef.current = 1;
      }

      if (growingGlowGroupRef.current) {
        growingGlowGroupRef.current.rotation(growthRotValRef.current);
        growingGlowGroupRef.current.scale({
          x: growthPulseScaleRef.current,
          y: growthPulseScaleRef.current,
        });
      }

      if (growingGlowOppositeRef.current) {
        growingGlowOppositeRef.current.rotation(antiRot);
        growingGlowOppositeRef.current.scale({
          x: growthPulseScaleRef.current * 0.9,
          y: growthPulseScaleRef.current * 0.9,
        });
      }

      growthRequestRef.current = requestAnimationFrame(animateGrowth);
    };

    growthRequestRef.current = requestAnimationFrame(animateGrowth);

    return () => {
      active = false;
      if (growthRequestRef.current)
        cancelAnimationFrame(growthRequestRef.current);
    };
  }, [isGrowing]);

  const wallGroupRefs = useRef<(Konva.Group | null)[]>([]);
  const wallPathRefs = useRef<(Konva.Path | null)[]>([]);
  const wallShadeRefs = useRef<(Konva.Path | null)[]>([]);
  const wallLightingRefs = useRef<(Konva.Path | null)[]>([]);
  const voidWallGroupRefs = useRef<(Konva.Group | null)[]>([]);
  const voidWallPathRefs = useRef<(Konva.Path | null)[]>([]);


  // SPRING VERTICAL MOVEMENT PHYSICS (Dynamic height animation and elegant staggered page-load waterfalls)
  const currentOffsetYRef = useRef<number>(offsetY + 80); // Start deep for rise ripple effect
  const velocityRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const isFirstRender = useRef<boolean>(true);
  const updaterRef = useRef<any>(null);

  useEffect(() => {
    let active = true;
    const stiffness = 0.08;
    const damping = 0.75;

    const bounceLoop = () => {
      if (!active) return;

      const target = offsetY;
      const current = currentOffsetYRef.current;

      const delta = target - current;
      const force = delta * stiffness;
      velocityRef.current = (velocityRef.current + force) * damping;
      currentOffsetYRef.current += velocityRef.current;

      const isSettled =
        Math.abs(currentOffsetYRef.current - target) < 0.04 &&
        Math.abs(velocityRef.current) < 0.04;
      if (isSettled) {
        currentOffsetYRef.current = target;
        velocityRef.current = 0;
      }

      if (faceContainerRef.current) {
        faceContainerRef.current.y(currentOffsetYRef.current);
      }
      if (overlaysContainerRef.current) {
        overlaysContainerRef.current.y(currentOffsetYRef.current);
      }

      if (updaterRef.current) {
        updaterRef.current(
          wallUpdaterRegistry.latestCos,
          wallUpdaterRegistry.latestSin,
          wallUpdaterRegistry.latestRot,
        );
      }

      if (!isSettled) {
        animationFrameRef.current = requestAnimationFrame(bounceLoop);
      } else {
        animationFrameRef.current = null;
      }
    };

    if (isFirstRender.current) {
      isFirstRender.current = false;
      // Ripple stagger offset based on radial coordinate distance from grid center
      const delay = (Math.abs(q) + Math.abs(r)) * 18;
      const timer = setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(bounceLoop);
      }, delay);
      return () => {
        active = false;
        clearTimeout(timer);
        if (animationFrameRef.current)
          cancelAnimationFrame(animationFrameRef.current);
      };
    } else {
      // Play immediately on dynamic state-driven level changes
      animationFrameRef.current = requestAnimationFrame(bounceLoop);
      return () => {
        active = false;
        if (animationFrameRef.current)
          cancelAnimationFrame(animationFrameRef.current);
      };
    }
  }, [offsetY, q, r]);

  const neighborLevelsRef = useRef(neighborLevels);
  useEffect(() => {
    neighborLevelsRef.current = neighborLevels;
    if (updaterRef.current) {
      updaterRef.current(
        wallUpdaterRegistry.latestCos,
        wallUpdaterRegistry.latestSin,
        wallUpdaterRegistry.latestRot,
      );
    }
  }, [neighborLevels]);

  useEffect(() => {
    let lastRot: number | null = null;
    let lastCurY: number | null = null;
    let lastNeighLevels: number[] | null = null;

    const updater = (cos: number, sin: number, rot: number) => {
      const curY = currentOffsetYRef.current;
      const nLvl = neighborLevelsRef.current;

      let neighborChanged = false;
      if (!lastNeighLevels) {
        neighborChanged = true;
      } else {
        for (let i = 0; i < 6; i++) {
          if (nLvl[i] !== lastNeighLevels[i]) {
            neighborChanged = true;
            break;
          }
        }
      }

      if (rot === lastRot && curY === lastCurY && !neighborChanged) {
        return; // Absolutely nothing changed! Avoid heavy computations or Konva updates completely!
      }
      lastRot = rot;
      lastCurY = curY;
      lastNeighLevels = [...nLvl];

      const gn = groupRef.current;
      if (gn) {
        gn.x(x * cos - y * sin);
        gn.y((x * sin + y * cos) * 0.8);
      }
      const tfg = topFaceGroupRef.current;
      if (tfg) {
        tfg.rotation(rot);
      }

      const angleOffset = rot * DEG_TO_RAD;
      const px = new Float32Array(6);
      const py = new Float32Array(6);
      for (let i = 0; i < 6; i++) {
        const angle = (60 * i + 30) * DEG_TO_RAD + angleOffset;
        px[i] = Math.cos(angle) * HEX_SIZE;
        py[i] = Math.sin(angle) * HEX_SIZE * 0.8 + curY;
      }

      for (let i = 0; i < 6; i++) {
        const next = (i + 1) % 6;
        const midAngle = (60 * i + 60) * DEG_TO_RAD + angleOffset;
        const isFrontFacing = Math.sin(midAngle) > 0;

        const groupNode = wallGroupRefs.current[i];
        if (groupNode) {
          if (isFrontFacing) {
            const nLevel = nLvl[5 - i];
            let nY = 0;
            if (nLevel === -99) nY = curY + MAX_WALL_DEPTH;
            else if (nLevel >= 0) nY = -(10 + nLevel * 10);
            else nY = (Math.abs(nLevel) - 1) * 10;

            if (curY < nY) {
              const safeNY =
                nY < curY + MAX_WALL_DEPTH ? nY : curY + MAX_WALL_DEPTH;
              const heightDiff = safeNY - curY;
              const b1x = px[next];
              const b1y = py[next] + heightDiff;
              const b2x = px[i];
              const b2y = py[i] + heightDiff;

              const data = `M ${px[i]} ${py[i]} L ${b2x} ${b2y} L ${b1x} ${b1y} L ${px[next]} ${py[next]} Z`;

              groupNode.show();
              const pathNode = wallPathRefs.current[i];
              if (pathNode) {
                pathNode.data(data);
                pathNode.fillPatternScale({ x: 1, y: heightDiff * 0.015625 });
              }
              const shadeNode = wallShadeRefs.current[i];
              if (shadeNode) {
                shadeNode.data(data);
                shadeNode.fill(null as any); // Clear solid color from JSX to let native gradient render perfectly
                shadeNode.fillLinearGradientStartPoint({
                  x: (px[i] + px[next]) / 2,
                  y: Math.min(py[i], py[next]),
                });
                shadeNode.fillLinearGradientEndPoint({
                  x: (px[i] + px[next]) / 2,
                  y: Math.max(py[i], py[next]) + heightDiff,
                });

                const isLit = i === 1;
                const isMild = i !== 0 && i !== 1;

                if (isLit) {
                  shadeNode.fillLinearGradientColorStops([
                    0,
                    "rgba(255, 255, 255, 0.22)",
                    0.15,
                    "rgba(255, 255, 255, 0.0)",
                    0.45,
                    "rgba(0, 0, 0, 0.35)",
                    0.75,
                    "rgba(1, 4, 15, 0.75)",
                    1,
                    "rgba(1, 4, 15, 0.98)",
                  ]);
                } else if (isMild) {
                  shadeNode.fillLinearGradientColorStops([
                    0,
                    "rgba(0, 0, 0, 0.05)",
                    0.2,
                    "rgba(0, 0, 0, 0.35)",
                    0.5,
                    "rgba(0, 0, 0, 0.7)",
                    1,
                    "rgba(1, 3, 11, 0.99)",
                  ]);
                } else {
                  shadeNode.fillLinearGradientColorStops([
                    0,
                    "rgba(0, 0, 0, 0.35)",
                    0.15,
                    "rgba(0, 0, 0, 0.65)",
                    0.5,
                    "rgba(0, 0, 0, 0.88)",
                    1,
                    "rgba(1, 2, 8, 1.0)",
                  ]);
                }
              }
              const lightingNode = wallLightingRefs.current[i];
              if (lightingNode) lightingNode.data(data);
            } else {
              groupNode.hide();
            }
          } else {
            groupNode.hide();
          }
        }

        if (isRealVoid) {
          const voidGroupNode = voidWallGroupRefs.current[i];
          if (voidGroupNode) {
            if (isFrontFacing) {
              const VOID_DEPTH = MAX_WALL_DEPTH;
              const b1x = px[next];
              const b1y = py[next] + VOID_DEPTH;
              const b2x = px[i];
              const b2y = py[i] + VOID_DEPTH;
              const data = `M ${px[i]} ${py[i]} L ${b2x} ${b2y} L ${b1x} ${b1y} L ${px[next]} ${py[next]} Z`;

              voidGroupNode.show();
              const voidPathNode = voidWallPathRefs.current[i];
              if (voidPathNode) voidPathNode.data(data);
              const shadeNode = wallShadeRefs.current[i];
              if (shadeNode) {
                shadeNode.data(data);
                shadeNode.fill(null as any); // Clear solid color from JSX so dynamic linear gradient renders cleanly
                shadeNode.fillLinearGradientStartPoint({
                  x: (px[i] + px[next]) / 2,
                  y: Math.min(py[i], py[next]),
                });
                shadeNode.fillLinearGradientEndPoint({
                  x: (px[i] + px[next]) / 2,
                  y: Math.max(py[i], py[next]) + VOID_DEPTH,
                });
                shadeNode.fillLinearGradientColorStops([
                  0,
                  "rgba(17, 24, 39, 0.45)",
                  0.1,
                  "rgba(17, 24, 39, 0.2)",
                  0.35,
                  "rgba(7, 10, 24, 0.75)",
                  0.7,
                  "rgba(2, 4, 12, 0.95)",
                  1,
                  "rgba(0, 0, 0, 1.0)",
                ]);
              }
              const lightingNode = wallLightingRefs.current[i];
              if (lightingNode) lightingNode.data(data);
            } else {
              voidGroupNode.hide();
            }
          }
        }
      }
    };

    updaterRef.current = updater;

    // Initialize immediately
    updater(
      wallUpdaterRegistry.latestCos,
      wallUpdaterRegistry.latestSin,
      wallUpdaterRegistry.latestRot,
    );
    wallUpdaterRegistry.add(updater);
    return () => {
      wallUpdaterRegistry.remove(updater);
      updaterRef.current = null;
    };
  }, [x, y, isRealVoid]);

  useEffect(() => {
    if (useGameStore.getState().isLiteMode) return;
    if (isRealVoid && voidOutlineRef.current) {
      const tween = new Konva.Tween({
        node: voidOutlineRef.current,
        duration: 0.8,
        opacity: 0.4,
        strokeWidth: 1.5,
        yoyo: true,
        easing: Konva.Easings.EaseInOut,
      });
      tween.play();
      return () => tween.destroy();
    }
  }, [isRealVoid]);

  useEffect(() => {
    if (useGameStore.getState().isLiteMode) return;
    if (isMonument && monumentGlowRef.current) {
      const tween = new Konva.Tween({
        node: monumentGlowRef.current,
        duration: 1.5,
        strokeWidth: 4,
        yoyo: true,
        easing: Konva.Easings.EaseInOut,
      });
      tween.play();
      return () => tween.destroy();
    }
  }, [isMonument]);

  // Bouncing Arrow Animation - Decoupled from absolute coordinate recalculation
  useEffect(() => {
    if (useGameStore.getState().isLiteMode) return;
    if (isTargetArrow && arrowRef.current) {
      const tween = new Konva.Tween({
        node: arrowRef.current,
        y: -50,
        duration: 0.6,
        yoyo: true,
        easing: Konva.Easings.EaseInOut,
      });
      arrowRef.current.y(-30);
      tween.play();
      return () => tween.destroy();
    }
  }, [isTargetArrow]);

  const completedShapeCoords = useGameStore(
    (state) => state.session?.completedShapeCoords,
  );
  const isCompletedShapeHex = useMemo(() => {
    if (!completedShapeCoords) return false;
    return completedShapeCoords.some((coord) => coord.q === q && coord.r === r);
  }, [completedShapeCoords, q, r]);

  useEffect(() => {
    if (useGameStore.getState().isLiteMode) return;
    if (isCompletedShapeHex && shapeGlowRef.current) {
      const node = shapeGlowRef.current;
      node.opacity(0);

      const tweenFocus = new Konva.Tween({
        node: node,
        duration: 0.8,
        opacity: 1,
        easing: Konva.Easings.EaseInOut,
        onFinish: () => {
          const tweenFade = new Konva.Tween({
            node: node,
            duration: 2.2,
            opacity: 0,
            easing: Konva.Easings.EaseInOut,
          });
          tweenFade.play();
        },
      });
      tweenFocus.play();
      return () => {
        tweenFocus.destroy();
      };
    }
  }, [isCompletedShapeHex]);

  if (isRealVoid) {
    return (
      <Group
        ref={groupRef}
        perfectDrawEnabled={false}
        onClick={handleClick}
        onTap={handleClick}
        onMouseEnter={handleHover}
        onMouseLeave={handleHoverEnd}
        opacity={opacity}
      >
        {/* 1. VOID WALLS (Real 3D Geometry) */}
        {drawVoidWalls &&
          neighborLevels.map((_nLevel, i) => {
            return (
              <Group
                key={`vw-group-${i}`}
                ref={(el) => {
                  voidWallGroupRefs.current[i] = el;
                }}
                listening={false}
                perfectDrawEnabled={false}
              >
                <Path
                  ref={(el) => {
                    voidWallPathRefs.current[i] = el;
                  }}
                  fill="#020617"
                  stroke="#1e293b"
                  strokeWidth={1}
                  perfectDrawEnabled={false}
                  listening={false}
                  closed={true}
                  shadowForStrokeEnabled={false}
                />
                {/* Shading Overlay for Void Walls */}
                <Path
                  ref={(el) => {
                    wallShadeRefs.current[i] = el;
                  }}
                  fill="rgba(0,0,0,0.4)"
                  listening={false}
                  perfectDrawEnabled={false}
                />
                {/* Lighting Overlay for Void Walls */}
                {lighting < 1 && (
                  <Path
                    ref={(el) => {
                      wallLightingRefs.current[i] = el;
                    }}
                    fill="black"
                    opacity={1 - lighting}
                    listening={false}
                    perfectDrawEnabled={false}
                  />
                )}
              </Group>
            );
          })}

        {/* 2. VOID TOP FACE */}
        <Group scaleY={0.8} perfectDrawEnabled={false}>
          <Group ref={topFaceGroupRef} perfectDrawEnabled={false}>
            {/* Depth Rim */}
            <Path
              data={BASE_PATH_D}
              fill="#020617"
              stroke="#1e293b"
              strokeWidth={1}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
            />
            <Circle
              radius={HEX_SIZE * 0.6}
              fillRadialGradientStartPoint={{ x: 0, y: 0 }}
              fillRadialGradientStartRadius={0}
              fillRadialGradientEndPoint={{ x: 0, y: 0 }}
              fillRadialGradientEndRadius={HEX_SIZE}
              fillRadialGradientColorStops={[0, "#000000", 1, "transparent"]}
              opacity={0.8}
              perfectDrawEnabled={false}
            />

            <Path
              ref={voidOutlineRef}
              data={BASE_PATH_D}
              stroke="#ef4444"
              strokeWidth={3}
              opacity={1}
              listening={false}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
            />
            <Path
              data={BASE_PATH_D}
              scaleX={0.8}
              scaleY={0.8}
              stroke="rgba(56, 189, 248, 0.1)"
              strokeWidth={1}
              dash={[2, 4]}
              listening={false}
              perfectDrawEnabled={false}
            />

            {/* LIGHTING OVERLAY for Void */}
            {lighting < 1 && (
              <Path
                data={BASE_PATH_D}
                fill="black"
                opacity={1 - lighting}
                listening={false}
                perfectDrawEnabled={false}
              />
            )}
          </Group>
        </Group>
      </Group>
    );
  }

  const templateTargetInfo = useMemo(() => {
    if (campaignMode !== 'STORY') return { isTarget: false, targetLevel: 0 };
    const requiredShapes = useGameStore.getState().session?.activeLevelConfig?.requiredShapes;
    if (!requiredShapes || requiredShapes.length === 0) return { isTarget: false, targetLevel: 0 };
    for (const req of requiredShapes) {
      let isMatch = false;
      if (req.type === 'LINE_3') {
        const coords = [{q:0, r:0}, {q:1, r:0}, {q:2, r:0}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      } else if (req.type === 'TRIANGLE_3') {
        const coords = [{q:0, r:0}, {q:1, r:0}, {q:0, r:1}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      } else if (req.type === 'SQUARE_4' || req.type === 'DIAMOND_4') {
        const coords = [{q:0, r:0}, {q:1, r:0}, {q:0, r:1}, {q:1, r:-1}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      } else if (req.type === 'CROSS_5') {
        const coords = [{q:0, r:0}, {q:1, r:0}, {q:-1, r:0}, {q:0, r:1}, {q:0, r:-1}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      } else if (req.type === 'RING_6') {
        const coords = [{q:1, r:-1}, {q:1, r:0}, {q:0, r:1}, {q:-1, r:1}, {q:-1, r:0}, {q:0, r:-1}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      } else if (req.type === 'CROWN_5') {
        const coords = [{q:0, r:0}, {q:1, r:0}, {q:-1, r:0}, {q:-1, r:1}, {q:1, r:-1}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      } else if (req.type === 'HEXAGON_7') {
        const coords = [{q:0, r:0}, {q:1, r:0}, {q:0, r:1}, {q:-1, r:1}, {q:-1, r:0}, {q:0, r:-1}, {q:1, r:-1}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      } else if (req.type === 'HEART_6') {
        const coords = [{q:0, r:0}, {q:1, r:-1}, {q:1, r:0}, {q:0, r:1}, {q:-1, r:1}, {q:-1, r:0}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      } else if (req.type === 'STAR_7') {
        const coords = [{q:0, r:0}, {q:2, r:0}, {q:0, r:2}, {q:-2, r:2}, {q:-2, r:0}, {q:0, r:-2}, {q:2, r:-2}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      } else if (req.type === 'PYRAMID_6') {
        const coords = [{q:0, r:0}, {q:1, r:0}, {q:2, r:0}, {q:0, r:1}, {q:1, r:1}, {q:0, r:2}];
        if (coords.some(c => c.q === q && c.r === r)) isMatch = true;
      }
      if (isMatch) {
        return { isTarget: true, targetLevel: req.level };
      }
    }
    return { isTarget: false, targetLevel: 0 };
  }, [q, r, campaignMode]);



  const strokeColor = isMonument ? "#fcd34d" : theme.stroke;
  const strokeWidth = isMonument ? 3.0 : 2.0;

  return (
    <Group
      ref={groupRef}
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={handleHover}
      onMouseLeave={handleHoverEnd}
      perfectDrawEnabled={false}
      listening={true}
      transformsEnabled="position"
      opacity={opacity}
      {...blurProps}
    >
      {/* VERTICAL AND HORIZONTAL DOTTED SCUFFOLD AND GRID SCAFFOLD (Anti-floating guidelines) */}
      {!isRealVoid && (
        <Group listening={false}>
          {/* A. Six vertical corner dotted lines running from ground to visual face height */}
          {BASE_POINTS.map((pt, index) => {
            const startY = pt.y * 0.8;
            const endY = offsetY + pt.y * 0.8;
            if (offsetY < -1) {
              return (
                <Line
                  key={`v-dotted-guideline-${index}`}
                  points={[pt.x, startY, pt.x, endY]}
                  stroke="rgba(99, 102, 241, 0.40)"
                  strokeWidth={0.8}
                  dash={[2, 3]}
                  perfectDrawEnabled={false}
                />
              );
            }
            return null;
          })}

          {/* B. Symmetrical horizontal dotted slices detailing each intermediate stage height */}
          {(() => {
            if (offsetY < -2) {
              const elements: React.ReactNode[] = [];
              const tileLevel = level;
              for (let lvl = 0; lvl <= tileLevel; lvl++) {
                const stepY = -(10 + lvl * 10);
                if (stepY >= offsetY) {
                  const pts: number[] = [];
                  for (let pIdx = 0; pIdx < 6; pIdx++) {
                    pts.push(BASE_POINTS[pIdx].x, stepY + BASE_POINTS[pIdx].y * 0.8);
                  }
                  elements.push(
                    <Line
                      key={`h-dotted-slice-guideline-${lvl}`}
                      points={pts}
                      closed={true}
                      stroke="rgba(99, 102, 241, 0.20)"
                      strokeWidth={0.8}
                      dash={[1, 4]}
                      perfectDrawEnabled={false}
                    />
                  );
                }
              }
              return elements;
            }
            return null;
          })()}
        </Group>
      )}

      {/* TEMPLATE TARGET COLUMN GUIDELINES (Only on level 0 layer as a flat hint) */}
      {!isRealVoid && templateTargetInfo.isTarget && (
        <Group listening={false}>
          {(() => {
            const reqLvl = templateTargetInfo.targetLevel;
            const stepY = -10; // level 0 vertical offset of top face is always -10
            const pts: number[] = [];
            for (let pIdx = 0; pIdx < 6; pIdx++) {
              pts.push(BASE_POINTS[pIdx].x, stepY + BASE_POINTS[pIdx].y * 0.8);
            }
            const isBuilt = level >= reqLvl;
            return (
              <Line
                key={`target-h-slice-guideline-0`}
                points={pts}
                closed={true}
                stroke={isBuilt ? "#10b981" : "#fbbf24"}
                strokeWidth={2.5}
                dash={[5, 4]}
                opacity={0.85}
                perfectDrawEnabled={false}
              />
            );
          })()}
        </Group>
      )}

      {/* 1. WALLS */}
      {neighborLevels.map((_, i) => {
        const shading = i === 1 ? 0 : i === 0 ? -0.2 : -0.1;
        const wallColor = isMonument ? "#78350f" : theme.dark;

        return (
          <Group
            key={`w-group-${i}`}
            ref={(el) => {
              wallGroupRefs.current[i] = el;
            }}
            listening={false}
            perfectDrawEnabled={false}
          >
            <Path
              ref={(el) => {
                wallPathRefs.current[i] = el;
              }}
              fillPatternImage={sideTexture as any}
              fill={wallColor}
              stroke={isMonument ? "#b45309" : theme.stroke}
              strokeWidth={1.5}
              perfectDrawEnabled={false}
              listening={false}
              closed={true}
              shadowForStrokeEnabled={false}
            />
            {/* Shading Overlay */}
            <Path
              ref={(el) => {
                wallShadeRefs.current[i] = el;
              }}
              fill={
                shading > 0
                  ? `rgba(255,255,255,${shading})`
                  : `rgba(0,0,0,${Math.abs(shading)})`
              }
              listening={false}
              perfectDrawEnabled={false}
            />
            {/* Lighting Overlay for Walls */}
            {lighting < 1 && (
              <Path
                ref={(el) => {
                  wallLightingRefs.current[i] = el;
                }}
                fill="black"
                opacity={1 - lighting}
                listening={false}
                perfectDrawEnabled={false}
              />
            )}
          </Group>
        );
      })}

      <Group
        ref={faceContainerRef}
        y={offsetY}
        scaleY={0.8}
        perfectDrawEnabled={false}
      >
        <Group ref={topFaceGroupRef} perfectDrawEnabled={false}>
          {isMonument && (
            <Path
              ref={monumentGlowRef}
              data={BASE_PATH_D}
              stroke="#f59e0b"
              strokeWidth={2}
              listening={false}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
            />
          )}

          <Path
            data={BASE_PATH_D}
            fillPatternImage={topTexture as any}
            fill={topTexture ? undefined : theme.main} // Fallback fill
            fillPatternScale={FILL_SCALE}
            fillPatternOffset={FILL_OFFSET}
            fillPatternRepeat="repeat"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            shadowEnabled={false}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={false}
          />



          {/* Surface variation gradient */}
          {isRevealed && !isMonument && (
            <Path
              data={BASE_PATH_D}
              fillLinearGradientStartPoint={gradStart}
              fillLinearGradientEndPoint={gradEnd}
              fillLinearGradientColorStops={[
                0,
                `rgba(255,255,255,${0.02 + opacityMod})`,
                1,
                `rgba(0,0,0,${0.02 + opacityMod})`,
              ]}
              listening={false}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
            />
          )}

          {/* LIGHTING OVERLAY: Darken Based on Distance */}
          {lighting < 1 && (
            <Path
              data={BASE_PATH_D}
              fill="black"
              opacity={1 - lighting}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}

          {/* Top/Light Bevel */}
          <Path
            data={`M ${BASE_POINTS[2].x} ${BASE_POINTS[2].y} L ${BASE_POINTS[3].x} ${BASE_POINTS[3].y} L ${BASE_POINTS[4].x} ${BASE_POINTS[4].y} L ${BASE_POINTS[5].x} ${BASE_POINTS[5].y}`}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth={2}
            listening={false}
            perfectDrawEnabled={false}
          />

          {/* Bottom/Dark Bevel */}
          <Path
            data={`M ${BASE_POINTS[5].x} ${BASE_POINTS[5].y} L ${BASE_POINTS[0].x} ${BASE_POINTS[0].y} L ${BASE_POINTS[1].x} ${BASE_POINTS[1].y} L ${BASE_POINTS[2].x} ${BASE_POINTS[2].y}`}
            stroke="rgba(0,0,0,0.6)"
            strokeWidth={2}
            listening={false}
            perfectDrawEnabled={false}
          />

          {/* Rim Highlight */}
          <Path
            data={BASE_PATH_D}
            scaleX={0.94}
            scaleY={0.94}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.2}
            listening={false}
            perfectDrawEnabled={false}
          />

          {!isRevealed && (
            <Group listening={false} perfectDrawEnabled={false}>
              <Path
                data={BASE_PATH_D}
                stroke="rgba(255,255,255,0.05)"
                strokeWidth={6}
                listening={false}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
              {/* 3D-like Bevel for unrevealed hexes */}
              <Path
                data={BASE_PATH_D}
                scaleX={0.9}
                scaleY={0.9}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={4}
                listening={false}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
            </Group>
          )}

          {isMonument && (
            <Star
              numPoints={5}
              innerRadius={8}
              outerRadius={16}
              fill="#fbbf24"
              stroke="#78350f"
              strokeWidth={2}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}

          {isMiniMonument && (
            <Star
              numPoints={5}
              innerRadius={4}
              outerRadius={8}
              fill="#f59e0b"
              stroke="#92400e"
              strokeWidth={1}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}

          {damageLevel > 0 && !isBlurred && (
            <Group listening={false} perfectDrawEnabled={false}>
              {CRACK_PATHS.slice(0, damageLevel).map((path, idx) => (
                <Path
                  key={idx}
                  data={path}
                  stroke="#000000"
                  strokeWidth={2}
                  opacity={0.6}
                  lineJoin="round"
                  lineCap="round"
                  perfectDrawEnabled={false}
                  shadowForStrokeEnabled={false}
                />
              ))}
            </Group>
          )}

          {!isNegative &&
            neighborLevels.map((_, i) => {
              const next = (i + 1) % 6;
              return (
                <Line
                  key={`e-${i}`}
                  points={[
                    BASE_POINTS[i].x,
                    BASE_POINTS[i].y,
                    BASE_POINTS[next].x,
                    BASE_POINTS[next].y,
                  ]}
                  stroke={theme.stroke}
                  strokeWidth={1}
                  opacity={0.3}
                  listening={false}
                  perfectDrawEnabled={false}
                  shadowForStrokeEnabled={false}
                />
              );
            })}

          {isSelected && (
            <Path
              data={BASE_PATH_D}
              stroke="#22d3ee"
              strokeWidth={2.5}
              shadowColor={
                renderMode?.showGlow === false ? undefined : "#22d3ee"
              }
              shadowBlur={renderMode?.showGlow === false ? undefined : 12}
              shadowOpacity={renderMode?.showGlow === false ? undefined : 0.8}
              shadowOffset={
                renderMode?.showGlow === false ? undefined : { x: 0, y: 0 }
              }
              listening={false}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={
                renderMode?.showGlow === false ? false : true
              }
            />
          )}

          {/* Pink dashed line for contrast highlighting */}

          {poiType && (
            <Group listening={false} perfectDrawEnabled={false}>
              <Circle
                radius={10}
                fill="rgba(0,0,0,0.4)"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth={1}
                perfectDrawEnabled={false}
              />
              <Text
                text={getPoiIcon(poiType)}
                fontSize={12}
                offsetX={6}
                offsetY={6}
                perfectDrawEnabled={false}
              />
            </Group>
          )}
          {isTutorialTarget && (
            <Path
              data={BASE_PATH_D}
              stroke={
                tutorialColor === "amber"
                  ? "#fbbf24"
                  : tutorialColor === "cyan"
                    ? "#06b6d4"
                    : tutorialColor === "red"
                      ? "#ef4444"
                      : "#22d3ee"
              }
              strokeWidth={3}
              listening={false}
              perfectDrawEnabled={false}
              shadowForStrokeEnabled={false}
            />
          )}
          {isMissingSupport && (
            <Group listening={false} perfectDrawEnabled={false}>
              <Path
                data={BASE_PATH_D}
                scaleX={0.94}
                scaleY={0.94}
                stroke="#ef4444"
                strokeWidth={2}
                dash={[5, 5]}
                fill="rgba(239, 68, 68, 0.15)"
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
              <Path
                data={ARROW_UP_PATH}
                x={-12}
                y={-12}
                fill="#ef4444"
                opacity={0.8}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
            </Group>
          )}

          {/* VISUAL EFFECTS FOR EXCAVATED (MINED) HEXES */}
          {isExcavated && !isRealVoid && (
            <Group listening={false} perfectDrawEnabled={false}>
              {/* Central crater / drilling pit shadow */}
              <Circle
                radius={14}
                fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                fillRadialGradientEndRadius={14}
                fillRadialGradientColorStops={[
                  0,
                  "rgba(12, 10, 9, 0.95)", // Solid dark center for deep pit
                  0.6,
                  "rgba(28, 25, 23, 0.8)",
                  1,
                  "rgba(41, 37, 36, 0.0)", // Gradual fade-out
                ]}
                stroke="#1c1917"
                strokeWidth={1.5}
                perfectDrawEnabled={false}
              />
              {/* Scattered loose debris (rubble pieces) for player satisfaction */}
              {/* Rubble Piece 1: Large clay rock */}
              <Circle
                x={-13}
                y={-7}
                radius={3.2}
                fill="#78350f"
                stroke="#451a03"
                strokeWidth={1}
                perfectDrawEnabled={false}
              />
              {/* Rubble Piece 2: Angular gravel shard */}
              <Line
                points={[-2, 11, 3, 13, 1, 8]}
                closed={true}
                fill="#44403c"
                stroke="#292524"
                strokeWidth={1}
                perfectDrawEnabled={false}
              />
              {/* Rubble Piece 3: Small iron ore nugget */}
              <Circle
                x={11}
                y={-9}
                radius={2.5}
                fill="#b45309"
                stroke="#78350f"
                strokeWidth={0.8}
                perfectDrawEnabled={false}
              />
              {/* Rubble Piece 4: Loose dust ring */}
              <Circle
                radius={18}
                stroke="#57534e"
                strokeWidth={1}
                opacity={0.4}
                dash={[2, 6]}
                perfectDrawEnabled={false}
              />
            </Group>
          )}

          {/* VISUAL EFFECTS FOR COSTRUCTED / PLAYER-BUILT SECTORS */}
          {isPlayerBuilt && !isRealVoid && (
            <Group listening={false} perfectDrawEnabled={false}>
              {/* Glowing secondary blueprint outline inside */}
              <Path
                data={BASE_PATH_D}
                scaleX={0.84}
                scaleY={0.84}
                stroke="#10b981"
                strokeWidth={1.2}
                dash={[4, 5]}
                opacity={0.7}
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false}
              />
              {/* Reinforced diagonal corner supports (connecting inner to outer edge) */}
              {BASE_POINTS_THREE.map((pt, idx) => (
                <Line
                  key={`bracket-${idx}`}
                  points={[pt.x * 0.84, pt.y * 0.84, pt.x * 0.96, pt.y * 0.96]}
                  stroke="#10b981"
                  strokeWidth={1}
                  opacity={0.5}
                  perfectDrawEnabled={false}
                />
              ))}
              {/* Precision metallic rivet joints in vertices */}
              {BASE_POINTS.map((pt, idx) => (
                <Circle
                  key={`rivet-${idx}`}
                  x={pt.x * 0.84}
                  y={pt.y * 0.84}
                  radius={2.2}
                  fill="#34d399"
                  stroke="#134e4a"
                  strokeWidth={1}
                  shadowColor={
                    renderMode?.showGlow === false ? undefined : "#10b981"
                  }
                  shadowBlur={renderMode?.showGlow === false ? undefined : 4}
                  shadowOpacity={
                    renderMode?.showGlow === false ? undefined : 0.8
                  }
                  perfectDrawEnabled={false}
                />
              ))}
            </Group>
          )}

          {isGrowing && !isBlurred && (
            <Group listening={false} perfectDrawEnabled={false}>
              {/* Clockwise rotating holographic scanner ring */}
              <Group ref={growingGlowGroupRef}>
                {/* Outer dashed scanner boundary */}
                <Path
                  data={BASE_PATH_D}
                  scaleX={0.94}
                  scaleY={0.94}
                  stroke={
                    currentIntent === "DIG"
                      ? "#ef4444"
                      : currentIntent === "RECOVER"
                        ? "#0ea5e9"
                        : "#10b981"
                  }
                  strokeWidth={1.5}
                  dash={[6, 8]}
                  opacity={0.65}
                  perfectDrawEnabled={false}
                />
                {/* Rotating laser target spokes */}
                <Line
                  points={[-HEX_SIZE * 0.75, 0, HEX_SIZE * 0.75, 0]}
                  stroke={
                    currentIntent === "DIG"
                      ? "#ef4444"
                      : currentIntent === "RECOVER"
                        ? "#38bdf8"
                        : "#34d399"
                  }
                  strokeWidth={0.5}
                  opacity={0.25}
                  perfectDrawEnabled={false}
                />
                <Line
                  points={[0, -HEX_SIZE * 0.75, 0, HEX_SIZE * 0.75]}
                  stroke={
                    currentIntent === "DIG"
                      ? "#ef4444"
                      : currentIntent === "RECOVER"
                        ? "#38bdf8"
                        : "#34d399"
                  }
                  strokeWidth={0.5}
                  opacity={0.25}
                  perfectDrawEnabled={false}
                />
              </Group>

              {/* Counter-clockwise rotating inner stabilization ring */}
              <Group ref={growingGlowOppositeRef}>
                <Circle
                  radius={HEX_SIZE * 0.45}
                  stroke={
                    currentIntent === "DIG"
                      ? "#f87171"
                      : currentIntent === "RECOVER"
                        ? "#06b6d4"
                        : "#6ee7b7"
                  }
                  strokeWidth={1.2}
                  dash={[15, 6]}
                  opacity={0.7}
                  perfectDrawEnabled={false}
                />
                {/* Scanning core diamond */}
                <Star
                  numPoints={4}
                  innerRadius={3}
                  outerRadius={6}
                  fill={
                    currentIntent === "DIG"
                      ? "#fca5a5"
                      : currentIntent === "RECOVER"
                        ? "#67e8f9"
                        : "#a7f3d0"
                  }
                  opacity={0.8}
                  perfectDrawEnabled={false}
                />
              </Group>

              {/* HIGH-TECH SEGMENTED CIRCULAR PROGRESS GAUGE HALO */}
              {GAUGE_SECTORS.map((idx) => {
                const angle = (360 / 12) * idx * DEG_TO_RAD;
                const dx = Math.cos(angle) * (HEX_SIZE * 0.82);
                const dy = Math.sin(angle) * (HEX_SIZE * 0.82);
                const isActive = progressRatio > idx / 12;

                return (
                  <Circle
                    key={`gauge-${idx}`}
                    x={dx}
                    y={dy}
                    radius={isActive ? 3.0 : 1.8}
                    fill={
                      isActive
                        ? currentIntent === "DIG"
                          ? "#ef4444"
                          : currentIntent === "RECOVER"
                            ? "#06b6d4"
                            : "#10b981"
                        : "rgba(255, 255, 255, 0.15)"
                    }
                    stroke={
                      isActive
                        ? currentIntent === "DIG"
                          ? "#fca5a5"
                          : currentIntent === "RECOVER"
                            ? "#22d3ee"
                            : "#34d399"
                        : "rgba(0,0,0,0.4)"
                    }
                    strokeWidth={isActive ? 1.0 : 0.5}
                    shadowColor={
                      renderMode?.showGlow === false
                        ? undefined
                        : isActive
                          ? currentIntent === "DIG"
                            ? "#ef4444"
                            : currentIntent === "RECOVER"
                              ? "#06b6d4"
                              : "#10b981"
                          : undefined
                    }
                    shadowBlur={
                      renderMode?.showGlow === false ? 0 : isActive ? 6 : 0
                    }
                    perfectDrawEnabled={false}
                  />
                );
              })}
            </Group>
          )}

          {/* SHAPE COMPLETION GLOW OVERLAY */}
          <Path
            ref={shapeGlowRef}
            data={BASE_PATH_D}
            fill="rgba(34, 211, 238, 0.25)"
            stroke="#ffffff"
            strokeWidth={1.5}
            opacity={0}
            listening={false}
            perfectDrawEnabled={false}
            shadowForStrokeEnabled={true}
            shadowColor="#22d3ee"
            shadowBlur={25}
            shadowOpacity={0.95}
          />
          
          {/* HOVER OUTLINE */}
          <Path
            ref={hoverOutlineRef}
            data={BASE_PATH_D}
            stroke="#ffffff"
            strokeWidth={2}
            opacity={0}
            listening={false}
            perfectDrawEnabled={false}
          />
        </Group>
      </Group>
      {/* 3. FLOATING OVERLAYS (Wrapped inside an animated overlays group container) */}
      <Group
        ref={overlaysContainerRef}
        y={offsetY}
        listening={true}
        perfectDrawEnabled={false}
      >
        {isTargetArrow && tutorialColor === "emerald" ? (
          <Group
            ref={arrowRef}
            y={-40}
            listening={true}
            perfectDrawEnabled={false}
          >
            <Text
              text="👑"
              fontSize={30}
              offsetX={15}
              offsetY={15}
              perfectDrawEnabled={false}
              shadowColor="rgba(0,0,0,0.5)"
              shadowBlur={4}
              shadowOffsetY={2}
            />
          </Group>
        ) : (
          isTargetArrow && (
            <Group
              ref={arrowRef}
              y={-40}
              listening={true}
              perfectDrawEnabled={false}
            >
              {/* Shadow/Depth Layer */}
              <Path
                data={ARROW_SIDE_PATH}
                fill={getArrowColor(tutorialColor, "shadow")}
                perfectDrawEnabled={false}
              />
              {/* Main Face */}
              <Path
                data={ARROW_FACE_PATH}
                fill={getArrowColor(tutorialColor, "main")}
                stroke="rgba(0,0,0,0.5)"
                strokeWidth={1}
                perfectDrawEnabled={false}
              />
            </Group>
          )
        )}

        {artifactType && !isRealVoid && (
          <Group y={-12} listening={true} perfectDrawEnabled={false}>
            <Circle
              radius={9}
              fill={artifactType.includes("RELIC") ? "#f59e0b" : "#3b82f6"}
              perfectDrawEnabled={false}
            />
            <Text
              text={artifactType.includes("RELIC") ? "★" : "?"}
              fontSize={13}
              fontStyle="bold"
              fill="white"
              offsetX={4.5}
              offsetY={6.5}
              perfectDrawEnabled={false}
            />
          </Group>
        )}

        {isPending && (
          <Group y={-38} listening={true} perfectDrawEnabled={false}>
            <Circle
              radius={15}
              fill="#fbbf24"
              stroke="#92400e"
              strokeWidth={2}
              perfectDrawEnabled={false}
            />
            <Text
              text={`${pendingCost}`}
              y={-6}
              fontSize={13}
              fontStyle="bold"
              fill="#78350f"
              align="center"
              width={30}
              offsetX={15}
              perfectDrawEnabled={false}
            />
          </Group>
        )}
      </Group>
    </Group>
  );
};

// Custom comparison function
function arePropsEqual(prev: HexNodeProps, next: HexNodeProps) {
  if (prev.id !== next.id) return false;
  if (prev.x !== next.x || prev.y !== next.y) return false;
  if (prev.offsetY !== next.offsetY) return false;
  if (prev.level !== next.level) return false;
  if (prev.maxLevel !== next.maxLevel) return false;
  if (prev.structureType !== next.structureType) return false;
  if (prev.isSelected !== next.isSelected) return false;
  if (prev.isPending !== next.isPending) return false;
  if (prev.pendingCost !== next.pendingCost) return false;
  if (prev.isTutorialTarget !== next.isTutorialTarget) return false;
  if (prev.isTargetArrow !== next.isTargetArrow) return false;
  if (prev.tutorialColor !== next.tutorialColor) return false;
  if (prev.isMissingSupport !== next.isMissingSupport) return false;
  if (prev.isOccupied !== next.isOccupied) return false;
  if (prev.isGrowing !== next.isGrowing) return false;
  if (prev.isRankLocked !== next.isRankLocked) return false;
  if (prev.progress !== next.progress) return false;
  if (prev.durability !== next.durability) return false;
  if (prev.artifactType !== next.artifactType) return false;
  if (prev.opacity !== next.opacity) return false;
  if (prev.lighting !== next.lighting) return false;
  if (prev.biome !== next.biome) return false;
  if (prev.poiType !== next.poiType) return false;
  if (prev.isPassable !== next.isPassable) return false;
  if (prev.isRevealed !== next.isRevealed) return false;
  if (prev.isExcavated !== next.isExcavated) return false;
  if (prev.isPlayerBuilt !== next.isPlayerBuilt) return false;
  if (prev.playerQ !== next.playerQ) return false;
  if (prev.playerR !== next.playerR) return false;
  if (prev.playerGrowthIntent !== next.playerGrowthIntent) return false;
  if (prev.growthAccelerator !== next.growthAccelerator) return false;
  if (prev.portalActive !== next.portalActive) return false;
  if (prev.drawVoidWalls !== next.drawVoidWalls) return false;
  if (prev.q !== next.q || prev.r !== next.r) return false;
  if (prev.figureIndex !== next.figureIndex) return false;

  // Theme comparison
  if (
    prev.theme.main !== next.theme.main ||
    prev.theme.light !== next.theme.light ||
    prev.theme.dark !== next.theme.dark ||
    prev.theme.stroke !== next.theme.stroke
  )
    return false;

  // RenderMode comparison
  if (
    prev.renderMode?.detailLevel !== next.renderMode?.detailLevel ||
    prev.renderMode?.showTexture !== next.renderMode?.showTexture ||
    prev.renderMode?.showGlow !== next.renderMode?.showGlow ||
    prev.renderMode?.showDetails !== next.renderMode?.showDetails
  )
    return false;

  for (let i = 0; i < 6; i++) {
    if (prev.neighborLevels[i] !== next.neighborLevels[i]) return false;
  }
  return true;
}

export const HexNode = React.memo(HexNodeComponent, arePropsEqual);
