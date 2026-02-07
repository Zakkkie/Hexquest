
import React, { useMemo } from 'react';
import { Group, Path, Circle, Text, Rect, Line } from 'react-konva';
import { HEX_SIZE, GAME_CONFIG } from '../rules/config.ts';
import { textureService } from '../services/textureService.ts';

const DEG_TO_RAD = Math.PI / 180;
const ARROW_UP_PATH = "M12 4l-8 8h6v8h4v-8h6z";
const MAX_WALL_DEPTH = HEX_SIZE * 4; 

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
  rotation: number;
  level: number;
  maxLevel: number;
  structureType: string | undefined;
  neighborLevels: number[];
  theme: HexNodeTheme;
  isSelected: boolean;
  isPending: boolean;
  pendingCost: number | null;
  isTutorialTarget: boolean;
  tutorialColor: string;
  isMissingSupport: boolean;
  isOccupied: boolean;
  isGrowing: boolean;
  isRankLocked: boolean;
  progress: number;
  durability?: number;
  artifactType?: string;
  q: number;
  r: number;
  onHexClick: (q: number, r: number) => void; 
  onHover: (id: string | null) => void;
  id: string; 
}

// Precompute the base (unsquashed) hexagon path centered at 0,0
const BASE_POINTS = [];
for (let i = 0; i < 6; i++) {
    const angle = (60 * i + 30) * DEG_TO_RAD;
    BASE_POINTS.push({ x: Math.cos(angle) * HEX_SIZE, y: Math.sin(angle) * HEX_SIZE });
}
let BASE_PATH_D = `M ${BASE_POINTS[0].x} ${BASE_POINTS[0].y}`;
for (let i = 1; i < 6; i++) BASE_PATH_D += ` L ${BASE_POINTS[i].x} ${BASE_POINTS[i].y}`;
BASE_PATH_D += " Z";

// Damage Cracks Logic
const CRACK_PATHS = [
    "M-10,-5 L0,0 L10,-2",
    "M5,10 L-2,0 L8,-12",
    "M-15,0 L-5,5 L-2,-8",
    "M12,5 L2,2 L5,15",
    "M-8,-12 L2,-5 L-5,0",
    "M0,15 L-5,8 L5,2"
];

const HexNodeComponent = (props: HexNodeProps) => {
  const { 
      x, y, offsetY, rotation, level, maxLevel, neighborLevels, structureType,
      theme, isSelected, isPending, pendingCost, 
      isTutorialTarget, tutorialColor, isMissingSupport, 
      isGrowing, isRankLocked, progress, durability, artifactType,
      q, r, id,
      onHexClick, onHover
  } = props;

  const topTexture = useMemo(() => textureService.getTexture(maxLevel, q, r), [maxLevel, q, r]);
  const sideTexture = useMemo(() => textureService.getSideTexture(maxLevel), [maxLevel]);

  const isRealVoid = structureType === 'VOID';
  const isNegative = level < 0;

  // Wall Geometry & Visibility
  const wallData = useMemo(() => {
      const angleOffset = rotation * DEG_TO_RAD;
      const walls = [];
      const pts = [];

      // Calculate points first
      for (let i = 0; i < 6; i++) {
          const angle = (60 * i + 30) * DEG_TO_RAD + angleOffset;
          pts.push({ 
              x: Math.cos(angle) * HEX_SIZE, 
              y: Math.sin(angle) * HEX_SIZE * 0.8 + offsetY,
              // Precompute sine for visibility check (Back-face culling)
              // Positive sine means "facing down/front" in screen space (Y+ is down)
              // We use a small negative epsilon to handle rounding errors at exactly 0/180
              visible: Math.sin(angle) > -0.01 
          });
      }

      // Generate wall quads
      for(let i=0; i<6; i++) {
          const next = (i + 1) % 6;
          // Determine if this face is front-facing (average of two vertices or face normal)
          // Simplified: The edge is "front" if its midpoint angle sin > 0
          // Or strictly: if the normal points roughly +Y. 
          // The vertices visibility check above is approximate. 
          // Better Check: Midpoint angle.
          const midAngle = (60 * i + 60) * DEG_TO_RAD + angleOffset; // Angle bisector between i(30) and next(90) -> 60
          // Wait, i=0 is 30deg. i+1 is 90deg. Edge is between them (60deg).
          const isFrontFacing = Math.sin(midAngle) > 0;

          walls.push({
              t1: pts[i],
              t2: pts[next],
              visible: isFrontFacing
          });
      }
      return walls;
  }, [offsetY, rotation]);

  const handleClick = (e: any) => {
      if (isRealVoid) return;
      if (e.evt && e.evt.button !== undefined && e.evt.button !== 0) return;
      e.cancelBubble = true;
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

  if (isRealVoid) {
      return (
        <Group x={x} y={y}>
             {/* Match perspective and rotation of standard hexes */}
             <Group scaleY={0.8}>
                 <Group rotation={rotation}>
                     {/* Depth Rim */}
                     <Path data={BASE_PATH_D} fill="#020617" stroke="#1e293b" strokeWidth={1} />
                     
                     {/* Static Abyss - Darker center */}
                     <Circle radius={HEX_SIZE * 0.6} fillRadialGradientStartPoint={{x:0, y:0}} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{x:0, y:0}} fillRadialGradientEndRadius={HEX_SIZE} fillRadialGradientColorStops={[0, '#000000', 1, 'transparent']} opacity={0.8} />

                     {/* Grid overlay for sense of scale */}
                     <Path data={BASE_PATH_D} scaleX={0.8} scaleY={0.8} stroke="rgba(56, 189, 248, 0.1)" strokeWidth={1} dash={[2, 4]} listening={false} perfectDrawEnabled={false} />
                 </Group>
             </Group>
        </Group>
      );
  }

  // Use the specific stroke from theme for outlines
  const strokeColor = theme.stroke;
  // Increased width to make the "contour" visible as requested
  const strokeWidth = 2.0; 
  
  const fillScale = { x: HEX_SIZE / 32, y: HEX_SIZE / 32 }; 
  const fillOffset = { x: 32, y: 32 }; 

  return (
    <Group 
        x={x} y={y} 
        onClick={handleClick} onTap={handleClick}
        onMouseEnter={handleHover} onMouseLeave={handleHoverEnd}
    >
        {/* 1. WALLS */}
        {neighborLevels.map((nLevel, i) => {
            // Check visibility first (Optimization + Logic Fix)
            if (!wallData[i].visible) return null;

            let nY = 0;
            if (nLevel === -99) nY = offsetY + MAX_WALL_DEPTH; 
            else if (nLevel >= 0) nY = -(10 + nLevel * 10);
            else nY = (Math.abs(nLevel) - 1) * 10;

            if (offsetY < nY) {
                const safeNY = Math.min(nY, offsetY + MAX_WALL_DEPTH);
                const { t1, t2 } = wallData[i];
                
                const heightDiff = safeNY - offsetY;
                const b1x = t2.x;
                const b1y = t2.y + heightDiff;
                const b2x = t1.x;
                const b2y = t1.y + heightDiff;

                return (
                    <Path 
                        key={`w-${i}`}
                        data={`M ${t1.x} ${t1.y} L ${t2.x} ${t2.y} L ${b1x} ${b1y} L ${b2x} ${b2y} Z`}
                        fillPatternImage={sideTexture as any}
                        fillPatternScale={{ x: 1, y: heightDiff / 64 }}
                        fill={theme.dark} // Solid fallback color
                        stroke={theme.stroke} 
                        strokeWidth={1.5} // Slightly thicker to seal seams
                        perfectDrawEnabled={false} // Performance opt
                        listening={false} // Wall sides are not clickable
                        closed={true} 
                        opacity={1} 
                    />
                );
            }
            return null;
        })}

        {/* 2. TOP FACE */}
        <Group y={offsetY} scaleY={0.8}>
            <Group rotation={rotation}>
                <Path 
                    data={BASE_PATH_D} 
                    fillPatternImage={topTexture as any}
                    fillPatternScale={fillScale}
                    fillPatternOffset={fillOffset}
                    fillPatternRepeat="repeat"
                    stroke={strokeColor} 
                    strokeWidth={strokeWidth} 
                    shadowEnabled={false} 
                />

                {/* Damage Cracks Overlay */}
                {damageLevel > 0 && (
                    <Group listening={false}>
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
                            />
                        ))}
                    </Group>
                )}

                {/* Structural Grid Decor (Only for positive) */}
                {!isNegative && neighborLevels.map((_, i) => {
                    const next = (i + 1) % 6;
                    return (
                        <Line 
                            key={`e-${i}`} 
                            points={[BASE_POINTS[i].x, BASE_POINTS[i].y, BASE_POINTS[next].x, BASE_POINTS[next].y]} 
                            stroke={theme.stroke} 
                            strokeWidth={1} 
                            opacity={0.3} 
                            listening={false} 
                            perfectDrawEnabled={false}
                        />
                    );
                })}

                {/* Interaction Overlays */}
                {isSelected && (
                    <Path data={BASE_PATH_D} stroke="#22d3ee" strokeWidth={2.5} shadowColor="#06b6d4" shadowBlur={10} listening={false} perfectDrawEnabled={false} />
                )}
                
                {isTutorialTarget && (
                    <Path 
                        data={BASE_PATH_D} 
                        stroke={tutorialColor === 'amber' ? '#fbbf24' : (tutorialColor === 'cyan' ? '#06b6d4' : '#22d3ee')} 
                        strokeWidth={3} 
                        listening={false} 
                        perfectDrawEnabled={false}
                    />
                )}

                {isMissingSupport && (
                    <Group listening={false}>
                        <Path data={BASE_PATH_D} stroke="#ef4444" strokeWidth={2} dash={[5, 5]} fill="rgba(239, 68, 68, 0.15)" perfectDrawEnabled={false} />
                        <Path data={ARROW_UP_PATH} x={-12} y={-12} fill="#ef4444" opacity={0.8} perfectDrawEnabled={false} />
                    </Group>
                )}
            </Group>
        </Group>

        {/* 3. BILLBOARD ICONS */}
        {artifactType && !isRealVoid && (
            <Group y={offsetY - 12} listening={false}>
                <Circle radius={9} fill={artifactType.includes('RELIC') ? '#f59e0b' : '#3b82f6'} shadowColor="rgba(0,0,0,0.5)" shadowBlur={4} />
                <Text text={artifactType.includes('RELIC') ? '★' : '?'} fontSize={13} fontStyle="bold" fill="white" offsetX={4.5} offsetY={6.5} />
            </Group>
        )}

        {isPending && (
            <Group y={offsetY - 38} listening={false}>
                <Circle radius={15} fill="#fbbf24" stroke="#92400e" strokeWidth={2} shadowBlur={10} shadowColor="rgba(251, 191, 36, 0.4)" />
                <Text text={`${pendingCost}`} y={-6} fontSize={13} fontStyle="bold" fill="#78350f" align="center" width={30} offsetX={15} />
            </Group>
        )}
        
        {isGrowing && (
            <Group y={offsetY - 18} listening={false}>
                <Rect x={-18} y={0} width={36} height={5} fill="rgba(0,0,0,0.7)" cornerRadius={2} perfectDrawEnabled={false} />
                <Rect x={-18} y={0} width={36 * Math.min(1, progress / (30))} height={5} fill={isRankLocked ? "#f59e0b" : "#10b981"} cornerRadius={2} perfectDrawEnabled={false} />
            </Group>
        )}
    </Group>
  );
};

// Custom comparison function for React.memo to prevent unnecessary re-renders
function arePropsEqual(prev: HexNodeProps, next: HexNodeProps) {
    if (prev.id !== next.id) return false;
    if (prev.x !== next.x || prev.y !== next.y) return false;
    if (prev.rotation !== next.rotation) return false;
    if (prev.level !== next.level) return false;
    if (prev.maxLevel !== next.maxLevel) return false;
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isPending !== next.isPending) return false;
    if (prev.isTutorialTarget !== next.isTutorialTarget) return false;
    if (prev.isMissingSupport !== next.isMissingSupport) return false;
    if (prev.isOccupied !== next.isOccupied) return false;
    if (prev.isGrowing !== next.isGrowing) return false;
    if (prev.progress !== next.progress) return false;
    if (prev.durability !== next.durability) return false;
    
    // Deep compare neighborLevels (Array of numbers)
    for (let i = 0; i < 6; i++) {
        if (prev.neighborLevels[i] !== next.neighborLevels[i]) return false;
    }
    
    return true;
}

export const HexNode = React.memo(HexNodeComponent, arePropsEqual);
