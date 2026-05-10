
import React, { useMemo, useEffect, useRef } from 'react';
import { Group, Path, Circle, Text, Rect, Line, Star } from 'react-konva';
import Konva from 'konva';
import { HEX_SIZE, GAME_CONFIG } from '../rules/config.ts';
import { textureService } from '../services/textureService.ts';
import { wallUpdaterRegistry } from '../services/wallUpdater.ts';

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
  isTargetArrow: boolean;    // New: Bouncing Arrow
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
  q: number;
  r: number;
  onHexClick: (q: number, r: number) => void; 
  onHover: (id: string | null) => void;
  id: string;
  opacity?: number;
}

// Precompute the base (unsquashed) hexagon path centered at 0,0
const BASE_POINTS: { x: number; y: number }[] = [];
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
      x, y, offsetY, level, maxLevel, neighborLevels, structureType,
      theme, isSelected, isPending, pendingCost, 
      isTutorialTarget, isTargetArrow, tutorialColor, isMissingSupport, 
      isGrowing, isRankLocked, progress, durability, artifactType,
      biome, poiType, isPassable,
      q, r, id,
      onHexClick, onHover,
      opacity = 1
  } = props;

  // Textures are now always loaded since LOD is removed
  const topTexture = useMemo(() => {
      return textureService.getTexture(level, q, r, undefined);
  }, [level, q, r]);

  const sideTexture = useMemo(() => {
      return textureService.getSideTexture(level, undefined);
  }, [level]);

  const isRealVoid = structureType === 'VOID';
  const isMonument = structureType === 'MONUMENT';
  const isNegative = level < 0;

  const getPoiIcon = (type: string) => {
      switch(type) {
          case 'city_hub': return '🏛️';
          case 'tavern_travelers': return '🍺';
          case 'bulletin_board': return '📋';
          case 'guard_post': return '🛡️';
          case 'forge': return '⚒️';
          case 'alchemist': return '🧪';
          case 'watchtower': return '🔭';
          case 'market': return '⚖️';
          case 'warehouse': return '📦';
          case 'healer': return '🩹';
          case 'temple': return '⛪';
          case 'archive': return '📜';
          case 'tavern_spirit': return '🍷';
          case 'RIFT_S1_2': return '🌀';
          case 'RIFT_S3_4': return '🌋';
          default: return '📍';
      }
  };

  const handleClick = (e: any) => {
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

  // Void Animation Ref
  const voidOutlineRef = useRef<Konva.Path>(null);
  const monumentGlowRef = useRef<Konva.Path>(null);
  const arrowRef = useRef<Konva.Group>(null);
  
  const groupRef = useRef<Konva.Group>(null);
  const topFaceGroupRef = useRef<Konva.Group>(null);
  const wallGroupRefs = useRef<(Konva.Group | null)[]>([]);
  const wallPathRefs = useRef<(Konva.Path | null)[]>([]);
  const wallShadeRefs = useRef<(Konva.Path | null)[]>([]);
  const voidWallGroupRefs = useRef<(Konva.Group | null)[]>([]);
  const voidWallPathRefs = useRef<(Konva.Path | null)[]>([]);

  useEffect(() => {
      const updater = (cos: number, sin: number, rot: number) => {
          if (groupRef.current) {
              const px = x * cos - y * sin;
              const py = (x * sin + y * cos) * 0.8;
              groupRef.current.position({ x: px, y: py });
          }
          if (topFaceGroupRef.current) {
              topFaceGroupRef.current.rotation(rot);
          }
          
          const angleOffset = rot * DEG_TO_RAD;
          const pts = [];
          for (let i = 0; i < 6; i++) {
              const angle = (60 * i + 30) * DEG_TO_RAD + angleOffset;
              pts.push({ 
                  x: Math.cos(angle) * HEX_SIZE, 
                  y: Math.sin(angle) * HEX_SIZE * 0.8 + offsetY
              });
          }

          for(let i=0; i<6; i++) {
              const next = (i + 1) % 6;
              const midAngle = (60 * i + 60) * DEG_TO_RAD + angleOffset; 
              const isFrontFacing = Math.sin(midAngle) > 0;
              
              const t1 = pts[i];
              const t2 = pts[next];

              // Normal Walls
              const groupNode = wallGroupRefs.current[i];
              if (groupNode) {
                  if (isFrontFacing) {
                      const nLevel = neighborLevels[5 - i];
                      let nY = 0;
                      if (nLevel === -99) nY = offsetY + MAX_WALL_DEPTH; 
                      else if (nLevel >= 0) nY = -(10 + nLevel * 10);
                      else nY = (Math.abs(nLevel) - 1) * 10;

                      if (offsetY < nY) {
                          const safeNY = Math.min(nY, offsetY + MAX_WALL_DEPTH);
                          const heightDiff = safeNY - offsetY;
                          const b1x = t2.x;
                          const b1y = t2.y + heightDiff;
                          const b2x = t1.x;
                          const b2y = t1.y + heightDiff;
                          
                          const data = `M ${t1.x} ${t1.y} L ${t2.x} ${t2.y} L ${b1x} ${b1y} L ${b2x} ${b2y} Z`;
                          
                          groupNode.show();
                          const pathNode = wallPathRefs.current[i];
                          if (pathNode) {
                              pathNode.data(data);
                              pathNode.fillPatternScale({ x: 1, y: heightDiff / 64 });
                          }
                          const shadeNode = wallShadeRefs.current[i];
                          if (shadeNode) shadeNode.data(data);
                      } else {
                          groupNode.hide();
                      }
                  } else {
                      groupNode.hide();
                  }
              }

              // Void Walls
              if (isRealVoid) {
                  const voidGroupNode = voidWallGroupRefs.current[i];
                  if (voidGroupNode) {
                      if (isFrontFacing) {
                          const VOID_DEPTH = 12;
                          const b1x = t2.x;
                          const b1y = t2.y + VOID_DEPTH;
                          const b2x = t1.x;
                          const b2y = t1.y + VOID_DEPTH;
                          const data = `M ${t1.x} ${t1.y} L ${t2.x} ${t2.y} L ${b1x} ${b1y} L ${b2x} ${b2y} Z`;
                          
                          voidGroupNode.show();
                          const voidPathNode = voidWallPathRefs.current[i];
                          if (voidPathNode) voidPathNode.data(data);
                      } else {
                          voidGroupNode.hide();
                      }
                  }
              }
          }
      };
      
      // Initialize immediately
      updater(wallUpdaterRegistry.latestCos, wallUpdaterRegistry.latestSin, wallUpdaterRegistry.latestRot); 
      wallUpdaterRegistry.add(updater);
      return () => wallUpdaterRegistry.remove(updater);
  }, [x, y, offsetY, neighborLevels, isRealVoid]);

  useEffect(() => {
      if (isRealVoid && voidOutlineRef.current) {
          const tween = new Konva.Tween({
              node: voidOutlineRef.current,
              duration: 0.8,
              opacity: 0.4,
              strokeWidth: 1.5,
              yoyo: true,
              easing: Konva.Easings.EaseInOut
          });
          tween.play();
          return () => tween.destroy();
      }
  }, [isRealVoid]);

  useEffect(() => {
      if (isMonument && monumentGlowRef.current) {
          const tween = new Konva.Tween({
              node: monumentGlowRef.current,
              duration: 1.5,
              strokeWidth: 4,
              yoyo: true,
              easing: Konva.Easings.EaseInOut
          });
          tween.play();
          return () => tween.destroy();
      }
  }, [isMonument]);

  // Bouncing Arrow Animation
  useEffect(() => {
      if (isTargetArrow && arrowRef.current) {
          const tween = new Konva.Tween({
              node: arrowRef.current,
              y: offsetY - 60, // Target Y (Up)
              duration: 0.6,
              yoyo: true,
              easing: Konva.Easings.EaseInOut
          });
          // Set initial Y
          arrowRef.current.y(offsetY - 40);
          tween.play();
          return () => tween.destroy();
      }
  }, [isTargetArrow, offsetY]);

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
             {neighborLevels.map((_nLevel, i) => {
                 return (
                    <Group key={`vw-group-${i}`} ref={el => { voidWallGroupRefs.current[i] = el; }} listening={false} perfectDrawEnabled={false}>
                        <Path 
                            ref={el => { voidWallPathRefs.current[i] = el; }}
                            fill="#020617" 
                            stroke="#1e293b" 
                            strokeWidth={1}
                            perfectDrawEnabled={false} 
                            listening={false} 
                            closed={true} 
                            shadowForStrokeEnabled={false}
                        />
                    </Group>
                 );
             })}

             {/* 2. VOID TOP FACE */}
             <Group scaleY={0.8} perfectDrawEnabled={false}>
                 <Group ref={topFaceGroupRef} perfectDrawEnabled={false}>
                     {/* Depth Rim */}
                     <Path data={BASE_PATH_D} fill="#020617" stroke="#1e293b" strokeWidth={1} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
                     <Circle radius={HEX_SIZE * 0.6} fillRadialGradientStartPoint={{x:0, y:0}} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{x:0, y:0}} fillRadialGradientEndRadius={HEX_SIZE} fillRadialGradientColorStops={[0, '#000000', 1, 'transparent']} opacity={0.8} perfectDrawEnabled={false} />
                     
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
                     <Path data={BASE_PATH_D} scaleX={0.8} scaleY={0.8} stroke="rgba(56, 189, 248, 0.1)" strokeWidth={1} dash={[2, 4]} listening={false} perfectDrawEnabled={false} />
                 </Group>
             </Group>
        </Group>
      );
  }

  const strokeColor = isMonument ? '#fcd34d' : theme.stroke;
  const strokeWidth = isMonument ? 3.0 : 2.0; 
  
  const fillScale = { x: HEX_SIZE / 32, y: HEX_SIZE / 32 }; 
  const fillOffset = { x: 32, y: 32 }; 

  const getArrowColor = (type: string, part: 'main' | 'shadow') => {
      const isShadow = part === 'shadow';
      switch(type) {
          case 'amber': return isShadow ? '#b45309' : '#fbbf24';
          case 'cyan': return isShadow ? '#0e7490' : '#22d3ee';
          case 'red': return isShadow ? '#991b1b' : '#ef4444';
          default: return isShadow ? '#0f766e' : '#34d399'; // emerald
      }
  };

  return (
    <Group 
        ref={groupRef}
        onClick={handleClick} onTap={handleClick}
        onMouseEnter={handleHover} onMouseLeave={handleHoverEnd}
        perfectDrawEnabled={false}
        listening={true}
        transformsEnabled="position"
        opacity={opacity}
    >
        {/* 1. WALLS */}
        {neighborLevels.map((_, i) => {
            const shading = i === 1 ? 0 : (i === 0 ? -0.2 : -0.1);
            const wallColor = isMonument ? '#78350f' : theme.dark;

            return (
                <Group key={`w-group-${i}`} ref={el => { wallGroupRefs.current[i] = el; }} listening={false} perfectDrawEnabled={false}>
                    <Path 
                        ref={el => { wallPathRefs.current[i] = el; }}
                        fillPatternImage={sideTexture as any}
                        fill={wallColor} 
                        stroke={isMonument ? '#b45309' : theme.stroke} 
                        strokeWidth={1.5} 
                        perfectDrawEnabled={false} 
                        listening={false} 
                        closed={true} 
                        opacity={1} 
                        shadowForStrokeEnabled={false}
                    />
                    {/* Shading Overlay */}
                    <Path 
                        ref={el => { wallShadeRefs.current[i] = el; }}
                        fill={shading > 0 ? `rgba(255,255,255,${shading})` : `rgba(0,0,0,${Math.abs(shading)})`}
                        listening={false}
                        perfectDrawEnabled={false}
                    />
                </Group>
            );
        })}<Group y={offsetY} scaleY={0.8} perfectDrawEnabled={false}>
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
                    fillPatternScale={fillScale}
                    fillPatternOffset={fillOffset}
                    fillPatternRepeat="repeat"
                    stroke={strokeColor} 
                    strokeWidth={strokeWidth} 
                    shadowEnabled={false} 
                    perfectDrawEnabled={false}
                    shadowForStrokeEnabled={false}
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

                {damageLevel > 0 && (
                    <Group listening={false} perfectDrawEnabled={false}>
                        {CRACK_PATHS.slice(0, damageLevel).map((path, idx) => (
                            <Path key={idx} data={path} stroke="#000000" strokeWidth={2} opacity={0.6} lineJoin="round" lineCap="round" perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
                        ))}
                    </Group>
                )}

                {!isNegative && neighborLevels.map((_, i) => {
                    const next = (i + 1) % 6;
                    return (
                        <Line key={`e-${i}`} points={[BASE_POINTS[i].x, BASE_POINTS[i].y, BASE_POINTS[next].x, BASE_POINTS[next].y]} stroke={theme.stroke} strokeWidth={1} opacity={0.3} listening={false} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
                    );
                })}

                {isSelected && (
                    <Path data={BASE_PATH_D} stroke="#22d3ee" strokeWidth={2.5} listening={false} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
                )}

                {!isPassable && !isRealVoid && (
                    <Group listening={false} perfectDrawEnabled={false}>
                        <Path 
                            data={BASE_PATH_D} 
                            fill="rgba(239, 68, 68, 0.1)" 
                            stroke="#ef4444" 
                            strokeWidth={1} 
                            dash={[4, 4]}
                            perfectDrawEnabled={false} 
                        />
                        {biome === 'WATER' ? (
                            <Path 
                                data="M-8,0 Q-4,-4 0,0 T8,0" 
                                stroke="#38bdf8" 
                                strokeWidth={2} 
                                opacity={0.8}
                                perfectDrawEnabled={false}
                                listening={false}
                            />
                        ) : (
                            <Circle 
                                radius={6}
                                stroke="#ef4444"
                                strokeWidth={2}
                                opacity={0.6}
                                perfectDrawEnabled={false}
                                listening={false}
                            />
                        )}
                    </Group>
                )}{poiType && (
                    <Group listening={false} perfectDrawEnabled={false}>
                        <Circle radius={10} fill="rgba(0,0,0,0.4)" stroke="rgba(255,255,255,0.2)" strokeWidth={1} perfectDrawEnabled={false} />
                        <Text 
                            text={getPoiIcon(poiType)} 
                            fontSize={12} 
                            offsetX={6} 
                            offsetY={6} 
                            perfectDrawEnabled={false} 
                        />
                    </Group>
                )}{isTutorialTarget && (
                    <Path 
                        data={BASE_PATH_D} 
                        stroke={tutorialColor === 'amber' ? '#fbbf24' : (tutorialColor === 'cyan' ? '#06b6d4' : (tutorialColor === 'red' ? '#ef4444' : '#22d3ee'))} 
                        strokeWidth={3} 
                        listening={false} 
                        perfectDrawEnabled={false}
                        shadowForStrokeEnabled={false}
                    />
                )}{isMissingSupport && (
                    <Group listening={false} perfectDrawEnabled={false}>
                        <Path data={BASE_PATH_D} stroke="#ef4444" strokeWidth={2} dash={[5, 5]} fill="rgba(239, 68, 68, 0.15)" perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
                        <Path data={ARROW_UP_PATH} x={-12} y={-12} fill="#ef4444" opacity={0.8} perfectDrawEnabled={false} shadowForStrokeEnabled={false} />
                    </Group>
                )}
            </Group>
        </Group>{/* 3. FLOATING OVERLAYS (No Perspective Squash/Rotation applied to container, logic handled by billboard) */}{isTargetArrow && (
            <Group ref={arrowRef} y={offsetY - 40} listening={false} perfectDrawEnabled={false}>
                {/* Shadow/Depth Layer */}
                <Path 
                    data={ARROW_SIDE_PATH} 
                    fill={getArrowColor(tutorialColor, 'shadow')}
                    perfectDrawEnabled={false}
                />
                {/* Main Face */}
                <Path 
                    data={ARROW_FACE_PATH} 
                    fill={getArrowColor(tutorialColor, 'main')}
                    stroke="rgba(0,0,0,0.5)"
                    strokeWidth={1}
                    perfectDrawEnabled={false}
                />
            </Group>
        )}{/* ARTIFACTS / COST / PROGRESS */}
        <>
            {artifactType && !isRealVoid && (
                <Group y={offsetY - 12} listening={false} perfectDrawEnabled={false}>
                    <Circle radius={9} fill={artifactType.includes('RELIC') ? '#f59e0b' : '#3b82f6'} perfectDrawEnabled={false} />
                    <Text text={artifactType.includes('RELIC') ? '★' : '?'} fontSize={13} fontStyle="bold" fill="white" offsetX={4.5} offsetY={6.5} perfectDrawEnabled={false} />
                </Group>
            )}

            {isPending && (
                <Group y={offsetY - 38} listening={false} perfectDrawEnabled={false}>
                    <Circle radius={15} fill="#fbbf24" stroke="#92400e" strokeWidth={2} perfectDrawEnabled={false} />
                    <Text text={`${pendingCost}`} y={-6} fontSize={13} fontStyle="bold" fill="#78350f" align="center" width={30} offsetX={15} perfectDrawEnabled={false} />
                </Group>
            )}
            
            {isGrowing && (
                <Group y={offsetY - 18} listening={false} perfectDrawEnabled={false}>
                    <Rect x={-18} y={0} width={36} height={5} fill="rgba(0,0,0,0.7)" cornerRadius={2} perfectDrawEnabled={false} />
                    <Rect x={-18} y={0} width={36 * Math.min(1, progress / (30))} height={5} fill={isRankLocked ? "#f59e0b" : "#10b981"} cornerRadius={2} perfectDrawEnabled={false} />
                </Group>
            )}
        </>
    </Group>
  );
};

// Custom comparison function
function arePropsEqual(prev: HexNodeProps, next: HexNodeProps) {
    if (prev.id !== next.id) return false;
    if (prev.x !== next.x || prev.y !== next.y) return false;
    if (prev.level !== next.level) return false;
    if (prev.maxLevel !== next.maxLevel) return false;
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isPending !== next.isPending) return false;
    if (prev.isTutorialTarget !== next.isTutorialTarget) return false;
    if (prev.isTargetArrow !== next.isTargetArrow) return false; 
    if (prev.isMissingSupport !== next.isMissingSupport) return false;
    if (prev.isOccupied !== next.isOccupied) return false;
    if (prev.isGrowing !== next.isGrowing) return false;
    if (prev.progress !== next.progress) return false;
    if (prev.durability !== next.durability) return false;
    if (prev.opacity !== next.opacity) return false;
    if (prev.biome !== next.biome) return false;
    if (prev.poiType !== next.poiType) return false;
    if (prev.isPassable !== next.isPassable) return false;
    
    for (let i = 0; i < 6; i++) {
        if (prev.neighborLevels[i] !== next.neighborLevels[i]) return false;
    }
    return true;
}

export const HexNode = React.memo(HexNodeComponent, arePropsEqual);
