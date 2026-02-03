
import React, { useRef, useEffect, useMemo } from 'react';
import { Group, Path, Circle, Text, Rect, Line } from 'react-konva';
import Konva from 'konva';
import { HEX_SIZE } from '../rules/config.ts';

const DEG_TO_RAD = Math.PI / 180;
const ARROW_UP_PATH = "M12 4l-8 8h6v8h4v-8h6z";

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
  rotation: number; // Camera rotation in degrees
  
  level: number;
  maxLevel: number;
  structureType: string | undefined;
  neighborLevels: number[];
  
  // Visual Flags
  theme: HexNodeTheme;
  isSelected: boolean;
  isPending: boolean;
  pendingCost: number | null;
  isTutorialTarget: boolean;
  tutorialColor: 'blue' | 'amber' | 'cyan' | 'emerald';
  isMissingSupport: boolean;
  isOccupied: boolean;
  isGrowing: boolean;
  isRankLocked: boolean;
  progress: number;
  
  artifactType?: string;
  
  // Events
  onClick: () => void;
  onHover: () => void;
  onHoverEnd: () => void;
}

export const HexNode = React.memo((props: HexNodeProps) => {
  const { 
      x, y, offsetY, rotation, level, neighborLevels, structureType,
      theme, isSelected, isPending, pendingCost, 
      isTutorialTarget, tutorialColor, isMissingSupport, 
      isGrowing, isRankLocked, progress, artifactType,
      onClick, onHover, onHoverEnd 
  } = props;

  const isRealVoid = structureType === 'VOID';
  const isNegative = level < 0;
  
  // --- GEOMETRY GENERATION ---
  // Dynamically calculate vertices based on rotation to keep the hex "floor" rotating with the world
  // while keeping the extrusion "walls" vertical in 2.5D space.
  const tops = useMemo(() => {
      const pts = [];
      const angleOffset = rotation * DEG_TO_RAD;
      for (let i = 0; i < 6; i++) {
          const angle = (60 * i + 30) * DEG_TO_RAD + angleOffset;
          pts.push({ 
              x: Math.cos(angle) * HEX_SIZE, 
              y: Math.sin(angle) * HEX_SIZE * 0.8 + offsetY // Apply perspective squash BEFORE height offset
          });
      }
      return pts;
  }, [rotation, offsetY]);
  
  // Bottom vertices (projected for walls)
  // We compute these on demand for walls, but the logic is simple: y - offsetY + depth
  const MAX_WALL_DEPTH = HEX_SIZE * 1.4;

  // Top Face Path
  const topPath = useMemo(() => {
      let d = `M ${tops[0].x} ${tops[0].y}`;
      for (let i = 1; i < 6; i++) d += ` L ${tops[i].x} ${tops[i].y}`;
      d += " Z";
      return d;
  }, [tops]);

  const sideColor = isRealVoid ? '#000000' : theme.dark;
  const strokeColor = isRealVoid ? '#334155' : (isNegative ? theme.main : theme.stroke);
  const strokeWidth = isNegative ? 1.5 : 1;

  const handleClick = (e: any) => {
      if (isRealVoid) return;
      if (e.evt && e.evt.button !== undefined && e.evt.button !== 0) return;
      e.cancelBubble = true;
      onClick();
  };

  const voidRef = useRef<Konva.Group>(null);
  
  useEffect(() => {
    if (isRealVoid && voidRef.current) {
        const anim = new Konva.Animation((frame) => {
            const rot = (frame?.time || 0) * 0.03; 
            voidRef.current?.rotation(rot % 360);
        }, voidRef.current.getLayer());
        anim.start();
        return () => { anim.stop(); };
    }
  }, [isRealVoid]);

  return (
    <Group 
        x={x} y={y} 
        onClick={handleClick} onTap={handleClick}
        onMouseEnter={onHover} 
        onMouseLeave={onHoverEnd}
    >
        {isRealVoid ? (
            <Group>
                <Path data={topPath} fill="#020617" />
                <Group ref={voidRef}>
                     <Path 
                        data={topPath} 
                        fill="#000000" 
                        stroke="#1e293b" 
                        strokeWidth={1} 
                        scaleX={0.85} 
                        scaleY={0.85}
                        shadowColor="#000"
                        shadowBlur={15}
                     />
                     <Path 
                        data={topPath} 
                        stroke="#334155" 
                        strokeWidth={1} 
                        dash={[2, 5]} 
                        scaleX={0.6} 
                        scaleY={0.6}
                        opacity={0.4}
                     />
                </Group>
            </Group>
        ) : (
            <>
                {/* WALLS */}
                {neighborLevels.map((nLevel, i) => {
                    let nY = 0;
                    if (nLevel === -99) nY = offsetY + MAX_WALL_DEPTH; 
                    else if (nLevel >= 0) nY = -(10 + nLevel * 10);
                    else nY = (Math.abs(nLevel) - 1) * 10;

                    if (offsetY < nY) {
                        const next = (i + 1) % 6;
                        // Calculate base Y for the "bottom" of the wall. 
                        // We must subtract the current offsetY from tops[x].y to get the raw squashed circle Y, then add nY.
                        // Actually, tops[i].y is (rawSquashedY + offsetY).
                        // So rawSquashedY = tops[i].y - offsetY.
                        // BottomY = rawSquashedY + safeNY.
                        const safeNY = Math.min(nY, offsetY + MAX_WALL_DEPTH);
                        
                        const t1 = tops[i];
                        const t2 = tops[next];
                        
                        const b1x = t2.x;
                        const b1y = (t2.y - offsetY) + safeNY;
                        const b2x = t1.x;
                        const b2y = (t1.y - offsetY) + safeNY;

                        return (
                             <Path 
                                key={`w-${i}`}
                                data={`M ${t1.x} ${t1.y} L ${t2.x} ${t2.y} L ${b1x} ${b1y} L ${b2x} ${b2y} Z`}
                                fill={sideColor} stroke={sideColor} strokeWidth={1} closed={true} shadowEnabled={false} 
                            />
                        );
                    }
                    return null;
                })}

                {/* FLOOR */}
                <Path data={topPath} fill={theme.main} stroke={strokeColor} strokeWidth={strokeWidth} shadowEnabled={false} />
                
                {/* DECORATION */}
                {!isNegative && (
                     <Circle x={0} y={offsetY} radius={HEX_SIZE * 0.3} fill={theme.light} opacity={0.1} shadowEnabled={false} listening={false} />
                )}

                {/* EDGES */}
                {!isNegative && neighborLevels.map((_, i) => {
                    const next = (i + 1) % 6;
                    return <Line key={`e-${i}`} points={[tops[i].x, tops[i].y, tops[next].x, tops[next].y]} stroke={theme.stroke} strokeWidth={1} lineCap="round" opacity={0.6} shadowEnabled={false} />
                })}
            </>
        )}

        {/* --- OVERLAYS --- */}
        
        {isSelected && (<Path data={topPath} stroke="#22d3ee" strokeWidth={2} shadowEnabled={false} listening={false} />)}
        
        {isTutorialTarget && (
            <Path 
                data={topPath} 
                stroke={tutorialColor === 'amber' ? '#fbbf24' : (tutorialColor === 'cyan' ? '#06b6d4' : '#22d3ee')} 
                strokeWidth={3} 
                shadowEnabled={false} 
                listening={false} 
            />
        )}

        {/* UI ELEMENTS (Vertical Offset Only, No Rotation needed as Group isn't rotated) */}
        {isMissingSupport && (
            <Group y={offsetY} listening={false}>
                <Path data={topPath} stroke="#ef4444" strokeWidth={2} dash={[5, 5]} fill="rgba(239, 68, 68, 0.1)" shadowEnabled={false} />
                <Path data={ARROW_UP_PATH} x={-12} y={-12} fill="#ef4444" opacity={0.6} shadowEnabled={false} />
            </Group>
        )}

        {artifactType && !isRealVoid && (
            <Group y={offsetY - 10} listening={false}>
                <Circle radius={8} fill={artifactType.includes('RELIC') ? '#f59e0b' : '#3b82f6'} shadowEnabled={false} />
                <Text text={artifactType.includes('RELIC') ? '★' : '?'} fontSize={12} fontStyle="bold" fill="white" offsetX={4} offsetY={6} shadowEnabled={false} />
            </Group>
        )}

        {isPending && (
            <Group y={offsetY - 35} listening={false}>
                <Circle radius={14} fill="#fbbf24" stroke="#92400e" strokeWidth={2} shadowEnabled={false} />
                <Text text={`${pendingCost}`} y={-5} fontSize={12} fontStyle="bold" fill="#78350f" align="center" width={30} offsetX={15} shadowEnabled={false} />
            </Group>
        )}
        
        {isGrowing && (
            <Group y={offsetY - 15} listening={false}>
                <Rect x={-15} y={0} width={30} height={4} fill="rgba(0,0,0,0.6)" cornerRadius={2} shadowEnabled={false} />
                <Rect x={-15} y={0} width={30 * Math.min(1, progress / (30))} height={4} fill={isRankLocked ? "#f59e0b" : "#10b981"} cornerRadius={2} shadowEnabled={false} />
            </Group>
        )}
    </Group>
  );
});
