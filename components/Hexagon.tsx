
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Group, Path, Shape, Circle, Text, Line, Arc } from 'react-konva';
import Konva from 'konva';
import { Hex } from '../types.ts';
import { HEX_SIZE, GAME_CONFIG } from '../rules/config.ts';
import { getSecondsToGrow, hexToPixel } from '../services/hexUtils.ts';
import { useGameStore } from '../store.ts';

interface HexagonVisualProps {
  hex: Hex;
  rotation: number;
  playerRank: number;
  isOccupied: boolean;
  isSelected: boolean;
  isPendingConfirm: boolean; 
  pendingCost: number | null; 
  onHexClick: (q: number, r: number) => void;
  onHover: (id: string | null) => void;
  isTutorialTarget?: boolean;
  tutorialHighlightColor?: 'blue' | 'amber' | 'cyan' | 'emerald';
  isMissingSupport?: boolean; 
  isObjective?: boolean; 
  isNeighbor?: boolean; // Kept for prop compatibility/memo
}

// --- COLOR THEMES (GRADIENTS) ---
const getTheme = (level: number) => {
    // Level 0: Inert / Dark
    if (level === 0) return { main: '#1e293b', light: '#334155', dark: '#0f172a', stroke: '#334155' }; 
    // Level 1: Base Metallic
    if (level === 1) return { main: '#475569', light: '#64748b', dark: '#334155', stroke: '#64748b' };

    const variants = [
        { main: '#0891b2', light: '#22d3ee', dark: '#155e75', stroke: '#22d3ee' }, // L2 Cyan
        { main: '#0284c7', light: '#38bdf8', dark: '#0c4a6e', stroke: '#38bdf8' }, // L3 Sky
        { main: '#2563eb', light: '#60a5fa', dark: '#1e3a8a', stroke: '#60a5fa' }, // L4 Blue
        { main: '#4f46e5', light: '#818cf8', dark: '#312e81', stroke: '#818cf8' }, // L5 Indigo
        { main: '#7c3aed', light: '#a78bfa', dark: '#4c1d95', stroke: '#a78bfa' }, // L6 Violet
        { main: '#9333ea', light: '#c084fc', dark: '#581c87', stroke: '#d946ef' }, // L7 Purple
        { main: '#c026d3', light: '#e879f9', dark: '#701a75', stroke: '#f472b6' }, // L8 Fuchsia
        { main: '#db2777', light: '#f472b6', dark: '#831843', stroke: '#fb7185' }, // L9 Pink
        { main: '#e11d48', light: '#fb7185', dark: '#881337', stroke: '#fb7185' }, // L10 Rose
        { main: '#f8fafc', light: '#ffffff', dark: '#94a3b8', stroke: '#ffffff' }, // L11 White
    ];
    return variants[Math.min(level - 2, variants.length - 1)] || variants[0];
};

const ARROW_UP_PATH = "M12 4l-8 8h6v8h4v-8h6z";

// --- PROCEDURAL HELPERS ---

const seededRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

// --- VOID SPIKES GENERATION ---
interface VoidSpike3D {
    leftFace: string;  // Path data
    rightFace: string; // Path data
    leftColor: string;
    rightColor: string;
    highlightPath?: string;
}

const generateVoidSpikes3D = (q: number, r: number, size: number, rotation: number, offsetY: number): VoidSpike3D[] => {
    const seedBase = Math.abs((q * 99991) ^ (r * 11119));
    const numSpikes = 3 + Math.floor(seededRandom(seedBase) * 3); // 3 to 5 distinct spikes
    const spikes: VoidSpike3D[] = [];

    const rad = (rotation * Math.PI) / 180;
    // Spikes originate deep in the void hole
    const baseDepth = offsetY + 30; 

    // Helper to rotate points
    const rot = (x: number, y: number) => {
        const rx = x * Math.cos(rad) - y * Math.sin(rad);
        const ry = (x * Math.sin(rad) + y * Math.cos(rad)) * 0.8; // Squash Y
        return { x: rx, y: ry };
    };

    for (let i = 0; i < numSpikes; i++) {
        const rng = (o: number) => seededRandom(seedBase + i * 20 + o);
        
        // Random Position within the hex (clustering towards center slightly)
        const angle = rng(1) * Math.PI * 2;
        const dist = size * (0.1 + rng(2) * 0.5); // Spread out but keep inside bounds
        
        const cx = Math.cos(angle) * dist;
        const cy = Math.sin(angle) * dist;

        // Spike geometry
        const height = 25 + rng(3) * 25; // Tall spikes
        const width = 6 + rng(4) * 8;    // Thickness at base
        const leanX = (rng(5) - 0.5) * 15; // Lean direction
        const leanY = (rng(6) - 0.5) * 15;

        // Base points (Triangular base footprint)
        // We simulate a cone/pyramid by drawing two triangles sharing a spine
        
        // The Base Center (Deep)
        const baseCenter = rot(cx, cy);
        const bX = baseCenter.x;
        const bY = baseDepth + baseCenter.y;

        // The Tip (High up)
        const tipRawX = cx + leanX;
        const tipRawY = cy + leanY;
        const tipPos = rot(tipRawX, tipRawY);
        // Tip Y is relative to surface, so negative relative to baseDepth
        const tX = tipPos.x;
        const tY = offsetY - 5 + tipPos.y; // Poke out slightly above ground level

        // Base Left and Right corners (Relative to center, rotated)
        // We create a perpendicular vector to the lean direction for width
        const dx = tX - bX;
        const dy = tY - bY;
        const len = Math.sqrt(dx*dx + dy*dy);
        const perpX = -dy / len || 1;
        const perpY = dx / len || 0;

        const leftBaseX = bX - perpX * width;
        const leftBaseY = bY - perpY * width * 0.5; // Squash Y for perspective
        
        const rightBaseX = bX + perpX * width;
        const rightBaseY = bY + perpY * width * 0.5;

        // Colors
        // Obsidian / Dark Crystal look
        const baseHue = 220 + rng(7) * 20; // Dark Blue/Slate range
        const isReddish = rng(8) > 0.7; // Occasional red magma spike
        
        const colorDark = isReddish ? '#450a0a' : '#020617'; // Almost black
        const colorLight = isReddish ? '#7f1d1d' : '#1e293b'; // Slate highlight

        spikes.push({
            leftFace: `M ${tX} ${tY} L ${leftBaseX} ${leftBaseY} L ${bX} ${bY} Z`,
            rightFace: `M ${tX} ${tY} L ${rightBaseX} ${rightBaseY} L ${bX} ${bY} Z`,
            leftColor: colorDark,
            rightColor: colorLight,
            highlightPath: `M ${tX} ${tY} L ${bX} ${bY}` // The spine
        });
    }
    
    // Sort spikes by Y (depth) to render correctly (painter's algorithm)
    return spikes.sort((a,b) => 0); 
};

// --- SHATTER ANIMATION PARTICLES ---
interface DebrisParticle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vRot: number;
    color: string;
    path: string;
    scale: number;
}

const generateShatterDebris = (count: number, yOffset: number): DebrisParticle[] => {
    const p: DebrisParticle[] = [];
    for(let i=0; i<count; i++) {
        const size = 4 + Math.random() * 6;
        const path = `M 0 ${-size} L ${size} ${size} L ${-size} ${size} Z`;
        
        p.push({
            x: (Math.random() - 0.5) * 20,
            y: yOffset + (Math.random() - 0.5) * 10,
            vx: (Math.random() - 0.5) * 8,
            vy: -2 - Math.random() * 5, 
            rot: Math.random() * 360,
            vRot: (Math.random() - 0.5) * 20,
            color: Math.random() > 0.5 ? '#475569' : '#1e293b',
            path,
            scale: 1
        });
    }
    return p;
};

// --- INTEGRITY METER GENERATOR ---
const generateIntegritySegments = (durability: number, max: number, size: number, rotation: number, offsetY: number) => {
    // NEW RULE: Only show visual damage indicators if 2 or fewer steps remain.
    // This reduces clutter and emphasizes critical danger.
    if (durability > 2) return null;

    const segments = [];
    const radius = size * 0.75; // Bring it in from the edge
    
    // Always critical red color when <= 2
    const color = '#ef4444';
    const shadowColor = '#f87171';

    for (let i = 0; i < max; i++) {
        const isActive = i < durability;
        
        // Calculate corner points for this segment of the hex
        const angleStart = (60 * i) + 30 + rotation;
        const angleEnd = (60 * (i+1)) + 30 + rotation;
        
        const radStart = (angleStart * Math.PI) / 180;
        const radEnd = (angleEnd * Math.PI) / 180;

        // Interpolate a line slightly inset from the edge
        const p1 = {
            x: radius * Math.cos(radStart),
            y: offsetY + radius * Math.sin(radStart) * 0.8
        };
        const p2 = {
            x: radius * Math.cos(radEnd),
            y: offsetY + radius * Math.sin(radEnd) * 0.8
        };

        // If active, draw bright line. If inactive, draw dark slot.
        segments.push({
            points: [p1.x, p1.y, p2.x, p2.y],
            color: isActive ? color : 'rgba(0,0,0,0.3)',
            width: isActive ? 3 : 1,
            shadowColor: isActive ? shadowColor : null,
            shadowBlur: isActive ? 5 : 0,
            isActive
        });
    }
    return { segments, isCritical: true };
};

const HexagonVisual: React.FC<HexagonVisualProps> = React.memo(({ hex, rotation, playerRank, isOccupied, isSelected, isPendingConfirm, pendingCost, onHexClick, onHover, isTutorialTarget, tutorialHighlightColor = 'blue', isMissingSupport, isObjective, isNeighbor }) => {
  const groupRef = useRef<Konva.Group>(null);
  const staticGroupRef = useRef<Konva.Group>(null);
  const integrityRef = useRef<Konva.Group>(null);
  const progressShapeRef = useRef<Konva.Shape>(null);
  const selectionRef = useRef<Konva.Path>(null);
  const confirmRef = useRef<Konva.Group>(null);
  const tutorialHighlightRef = useRef<Konva.Path>(null);
  const objectiveRef = useRef<Konva.Group>(null);
  
  // Animation States
  const prevStructureRef = useRef(hex.structureType);
  const [isExploding, setIsExploding] = useState(false);
  const [debris, setDebris] = useState<DebrisParticle[]>([]);
  
  const { x, y } = hexToPixel(hex.q, hex.r, rotation);
  
  const isRealVoid = hex.structureType === 'VOID';
  const showVoid = isRealVoid && !isExploding;
  
  // Visual Levels
  const visualLevel = (isRealVoid && !isExploding) ? 0 : Math.min(hex.maxLevel, 11);
  const theme = getTheme(visualLevel);

  // Colors
  const sideColor = showVoid ? '#000000' : theme.dark;
  const strokeColor = showVoid ? '#334155' : theme.stroke;
  
  const heightMult = isExploding ? 1 : hex.maxLevel;
  // Void sinks into the ground slightly
  const hexHeight = showVoid ? 2 : (10 + (heightMult * 6));
  const offsetY = -hexHeight;

  const isGrowing = hex.progress > 0 && !showVoid && !isExploding;
  const neededTicks = getSecondsToGrow(hex.currentLevel + 1) || 30;
  const progressPercent = Math.min(1, hex.progress / neededTicks);
  
  // RANK LOCK
  const isRankLocked = hex.maxLevel > playerRank;
  
  // Damage Calculation
  const isFragile = hex.maxLevel === 1 && !isRealVoid;
  const maxLives = GAME_CONFIG.L1_HEX_MAX_DURABILITY;
  const currentLives = hex.durability !== undefined ? hex.durability : maxLives;
  
  // Geometry
  const { topPoints, sortedFaces, selectionPathData, integrityVisuals, voidPaths, voidSpikes, topFacePath } = useMemo(() => {
    const getPoint = (i: number, cy: number, radius: number = HEX_SIZE) => {
        const angle_deg = 60 * i + 30;
        const angle_rad = (angle_deg * Math.PI) / 180 + (rotation * Math.PI) / 180;
        return {
            x: radius * Math.cos(angle_rad),
            y: cy + radius * Math.sin(angle_rad) * 0.8 
        };
    };

    const tops = [];
    const bottoms = [];
    const faces = [];
    
    // For Void: Irregular "Burnt" edges. We use a jagged path instead of smooth hex.
    const voidSeed = (hex.q * 999) ^ (hex.r * 777);
    const getVoidRadius = (i: number) => HEX_SIZE * (0.85 + seededRandom(voidSeed + i) * 0.15); // Slight randomness

    for (let i = 0; i < 6; i++) {
        const r = showVoid ? getVoidRadius(i) : HEX_SIZE;
        tops.push(getPoint(i, offsetY, r));
        bottoms.push(getPoint(i, 0, r));
    }

    if (!showVoid) {
        for (let i = 0; i < 6; i++) {
            const next = (i + 1) % 6;
            const facePoints = [
                tops[i].x, tops[i].y,
                tops[next].x, tops[next].y,
                bottoms[next].x, bottoms[next].y,
                bottoms[i].x, bottoms[i].y
            ];
            const avgY = (tops[i].y + tops[next].y + bottoms[next].y + bottoms[i].y) / 4;
            faces.push({ points: facePoints, depth: avgY });
        }
        faces.sort((a, b) => a.depth - b.depth);
    }

    const topPathPoints = tops.flatMap(p => [p.x, p.y]);
    // Construct Path String for reuse
    const topFacePath = `M ${tops[0].x} ${tops[0].y} L ${tops[1].x} ${tops[1].y} L ${tops[2].x} ${tops[2].y} L ${tops[3].x} ${tops[3].y} L ${tops[4].x} ${tops[4].y} L ${tops[5].x} ${tops[5].y} Z`;
    
    // Selection Path
    const sp = [];
    const selRadius = Math.max(0, HEX_SIZE - 6);
    for(let i=0; i<6; i++) sp.push(getPoint(i, offsetY, selRadius));
    const selectionPathData = `M ${sp[0].x} ${sp[0].y} L ${sp[1].x} ${sp[1].y} L ${sp[2].x} ${sp[2].y} L ${sp[3].x} ${sp[3].y} L ${sp[4].x} ${sp[4].y} L ${sp[5].x} ${sp[5].y} Z`;

    // Integrity Meter (Replaces Cracks)
    const integrityVisuals = isFragile 
        ? generateIntegritySegments(currentLives, maxLives, HEX_SIZE, rotation, offsetY)
        : null;

    // Void Visuals
    let vpOuter = "M";
    let spikes: VoidSpike3D[] = [];
    
    if (showVoid) {
        for(let i=0; i<6; i++) {
            vpOuter += ` ${tops[i].x} ${tops[i].y}`;
            const next = (i + 1) % 6;
            const mx = (tops[i].x + tops[next].x) / 2;
            const my = (tops[i].y + tops[next].y) / 2;
            const jagX = mx * 0.9; 
            const jagY = my * 0.9;
            vpOuter += ` L ${jagX} ${jagY}`;
            if (i < 5) vpOuter += " L";
        }
        vpOuter += " Z";
        spikes = generateVoidSpikes3D(hex.q, hex.r, HEX_SIZE, rotation, offsetY);
    }

    return { topPoints: topPathPoints, sortedFaces: faces, selectionPathData, integrityVisuals, voidPaths: { outer: vpOuter }, voidSpikes: spikes, topFacePath };
  }, [rotation, offsetY, showVoid, isFragile, currentLives, maxLives, hex.q, hex.r]);


  // --- DESTRUCTION ANIMATION ---
  useEffect(() => {
      const wasVoid = prevStructureRef.current === 'VOID';
      const nowVoid = hex.structureType === 'VOID';
      
      if (!wasVoid && nowVoid) {
          setIsExploding(true);
          setDebris(generateShatterDebris(12, offsetY));
      } else if (!nowVoid) {
          setIsExploding(false);
          setDebris([]);
      }
      prevStructureRef.current = hex.structureType;
  }, [hex.structureType, offsetY]);

  useEffect(() => {
      if (!isExploding) return;
      const layer = groupRef.current?.getLayer();
      const anim = new Konva.Animation((frame) => {
          if (!frame) return;
          const dt = frame.timeDiff / 16; 
          setDebris(prev => {
              const next = prev.map(p => ({
                  ...p,
                  x: p.x + p.vx * dt,
                  y: p.y + p.vy * dt,
                  vy: p.vy + 0.8 * dt,
                  rot: p.rot + p.vRot * dt,
                  scale: p.scale * (1 - 0.02 * dt)
              })).filter(p => p.scale > 0.1);
              if (next.length === 0) setIsExploding(false);
              return next;
          });
      }, layer);
      anim.start();
      return () => anim.stop();
  }, [isExploding]);

  // --- CRITICAL ALERT ANIMATION (Integrity Meter) ---
  useEffect(() => {
      const node = integrityRef.current;
      if (!node || !integrityVisuals?.isCritical) return;

      const anim = new Konva.Animation((frame) => {
          if (!frame) return;
          const opacity = 0.5 + Math.sin(frame.time / 100) * 0.5; // Fast blink
          node.opacity(opacity);
      }, node.getLayer());

      anim.start();
      return () => anim.stop();
  }, [integrityVisuals?.isCritical]);

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (showVoid || isExploding) return;
    if ('button' in e.evt && e.evt.button !== 0) return; 
    e.cancelBubble = true;
    onHexClick(hex.q, hex.r);
  };

  // CACHING
  useEffect(() => {
    const node = staticGroupRef.current;
    if (node && !isExploding && !integrityVisuals?.isCritical) {
        node.clearCache();
        node.cache({ pixelRatio: 1 }); 
    } else if (node) {
        node.clearCache(); 
    }
  }, [hex.maxLevel, showVoid, hex.durability, rotation, isExploding, integrityVisuals?.isCritical, isRankLocked]);

  // --- RENDER ---

  if (isExploding) {
      return (
          <Group x={x} y={y}>
              {debris.map((p, i) => (
                  <Path 
                    key={i}
                    data={p.path}
                    x={p.x}
                    y={p.y}
                    fill={p.color}
                    rotation={p.rot}
                    scaleX={p.scale}
                    scaleY={p.scale}
                    perfectDrawEnabled={false}
                  />
              ))}
          </Group>
      );
  }

  if (showVoid) {
      return (
        <Group x={x} y={y}>
            <Path 
                data={voidPaths.outer} 
                fillLinearGradientStartPoint={{x: -HEX_SIZE, y: -HEX_SIZE}}
                fillLinearGradientEndPoint={{x: HEX_SIZE, y: HEX_SIZE}}
                fillLinearGradientColorStops={[0, '#000000', 0.5, '#0f172a', 1, '#1e1b4b']} 
                stroke="#1e293b" 
                strokeWidth={1}
                shadowColor="#000"
                shadowBlur={10}
                shadowOpacity={0.8}
                perfectDrawEnabled={false}
            />
            <Group>
                {voidSpikes.map((spike, i) => (
                    <React.Fragment key={i}>
                        <Path data={spike.leftFace} fill={spike.leftColor} stroke={spike.leftColor} strokeWidth={0.5} />
                        <Path data={spike.rightFace} fill={spike.rightColor} stroke={spike.rightColor} strokeWidth={0.5} />
                        <Path data={spike.highlightPath} stroke="#334155" strokeWidth={0.5} opacity={0.5} />
                    </React.Fragment>
                ))}
            </Group>
            <Path data={voidPaths.outer} stroke="#000" strokeWidth={3} opacity={0.5} perfectDrawEnabled={false} />
        </Group>
      );
  }

  return (
    <Group 
      ref={groupRef}
      x={x} 
      y={y} 
      onClick={handleClick}
      onTap={handleClick}
      onMouseEnter={() => onHover(hex.id)}
      onMouseLeave={() => onHover(null)}
      onTouchStart={() => onHover(hex.id)}
      onTouchEnd={() => onHover(null)}
      listening={true}
    >
      {/* STATIC GEOMETRY */}
      <Group ref={staticGroupRef}>
          {/* SIDES (Flat Color) */}
          {sortedFaces.map((face, i) => (
              <Path key={i} data={`M ${face.points[0]} ${face.points[1]} L ${face.points[2]} ${face.points[3]} L ${face.points[4]} ${face.points[5]} L ${face.points[6]} ${face.points[7]} Z`} fill={sideColor} stroke={sideColor} strokeWidth={1} closed={true} perfectDrawEnabled={false} />
          ))}

          {/* TOP SURFACE (Gradient) */}
          <Path
             data={topFacePath}
             fillLinearGradientStartPoint={{x: -HEX_SIZE, y: -HEX_SIZE}}
             fillLinearGradientEndPoint={{x: HEX_SIZE, y: HEX_SIZE}}
             fillLinearGradientColorStops={[0, theme.light, 0.5, theme.main, 1, theme.dark]}
             stroke={strokeColor}
             strokeWidth={1}
             perfectDrawEnabled={false}
             shadowColor={isPendingConfirm ? "#f59e0b" : "black"}
             shadowBlur={isPendingConfirm ? 20 : 10}
             shadowOpacity={0.5}
             shadowOffset={{x: 0, y: 10}}
          />

           {/* RANK LOCK BARRIER - NO ICON */}
           {isRankLocked && (
            <Group listening={false}>
              {/* Dark Overlay to indicate inactivity */}
              <Path 
                data={topFacePath} 
                fill="#000000" 
                opacity={0.6} 
              />
              {/* "Forcefield" Crosshatch */}
              <Line
                 points={[topPoints[0], topPoints[1], topPoints[6], topPoints[7]]}
                 stroke="#f59e0b"
                 strokeWidth={2}
                 opacity={0.3}
                 listening={false}
              />
              <Line
                 points={[topPoints[2], topPoints[3], topPoints[8], topPoints[9]]}
                 stroke="#f59e0b"
                 strokeWidth={2}
                 opacity={0.3}
                 listening={false}
              />
              <Line
                 points={[topPoints[4], topPoints[5], topPoints[10], topPoints[11]]}
                 stroke="#f59e0b"
                 strokeWidth={2}
                 opacity={0.3}
                 listening={false}
              />
              {/* Warning Border */}
              <Path 
                data={topFacePath} 
                stroke="#f59e0b" 
                strokeWidth={2} 
                dash={[4, 4]} 
                opacity={0.8}
                shadowColor="#f59e0b"
                shadowBlur={5}
              />
            </Group>
          )}
      </Group>

      {/* INTEGRITY METER (HEALTH BARS - Only show when <= 2) */}
      {integrityVisuals && (
          <Group ref={integrityRef}>
              {integrityVisuals.segments.map((seg, i) => (
                  <Line 
                      key={`seg-${i}`}
                      points={seg.points}
                      stroke={seg.color}
                      strokeWidth={seg.width}
                      lineCap="round"
                      shadowColor={seg.shadowColor || 'black'}
                      shadowBlur={seg.shadowBlur}
                      perfectDrawEnabled={false}
                  />
              ))}
          </Group>
      )}

      {/* DYNAMIC OVERLAYS */}
      {isObjective && (
          <Group ref={objectiveRef} x={0} y={offsetY} listening={false}>
              <Circle radius={25} stroke="#ef4444" strokeWidth={2} opacity={0.6} scaleY={0.6} shadowColor="#ef4444" shadowBlur={15} />
              <Group y={-20}>
                  <Circle radius={12} fill="#ef4444" shadowColor="red" shadowBlur={10} />
                  <Path data={ARROW_UP_PATH} x={-12} y={-12} fill="white" scaleX={1} scaleY={1} />
              </Group>
          </Group>
      )}

      {isMissingSupport && (
         <Group x={0} y={offsetY} listening={false}>
             <Path 
                data={selectionPathData} 
                stroke="#ef4444" 
                strokeWidth={2} 
                dash={[5, 5]} 
                fill="rgba(239, 68, 68, 0.1)"
                perfectDrawEnabled={false}
             />
             <Path data={ARROW_UP_PATH} x={-12} y={-12} fill="#ef4444" opacity={0.6} />
         </Group>
      )}

      {isSelected && (
          <Path ref={selectionRef} data={selectionPathData} stroke="#22d3ee" strokeWidth={1.5} fillEnabled={false} perfectDrawEnabled={false} shadowColor="#22d3ee" shadowBlur={5} shadowOpacity={1} listening={false} />
      )}

      {isTutorialTarget && (
          <Path ref={tutorialHighlightRef} data={selectionPathData} stroke={tutorialHighlightColor === 'amber' ? '#fbbf24' : '#22d3ee'} strokeWidth={3} fillEnabled={false} perfectDrawEnabled={false} shadowColor={tutorialHighlightColor === 'amber' ? '#fbbf24' : '#22d3ee'} shadowBlur={10} shadowOpacity={0.8} listening={false} />
      )}

      {isPendingConfirm && (
        <Group ref={confirmRef} y={offsetY - 35} listening={false}>
            <Circle radius={16} fill="#fbbf24" stroke="#92400e" strokeWidth={3} shadowColor="black" shadowBlur={8} shadowOpacity={0.6} shadowOffset={{ x: 0, y: 3 }} perfectDrawEnabled={false} />
             <Path data="M -8 -9 Q 0 -13 8 -9" stroke="white" strokeWidth={2} opacity={0.6} lineCap="round" perfectDrawEnabled={false} />
            <Text text={`${pendingCost}`} y={-6} fontSize={13} fontStyle="bold" fontFamily="monospace" fill="#78350f" align="center" width={32} offsetX={16} shadowColor="white" shadowBlur={0} />
             <Text text="CONFIRM" y={22} fontSize={9} fontStyle="bold" fill="#f59e0b" align="center" width={80} offsetX={40} shadowColor="black" shadowBlur={4} />
        </Group>
      )}

      {isGrowing && (
        <Group x={0} y={offsetY - 15} listening={false}>
          <Shape ref={progressShapeRef} visualProgress={progressPercent} sceneFunc={(ctx, shape) => {
                const p = shape.getAttr('visualProgress') || 0;
                ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(15, 0); ctx.strokeStyle = "rgba(0,0,0,0.8)"; ctx.lineWidth = 6; ctx.lineCap = "round"; ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-15, 0); ctx.lineTo(-15 + (30 * p), 0); ctx.strokeStyle = isRankLocked ? "#f59e0b" : "#10b981"; ctx.lineWidth = 4; ctx.lineCap = "round"; ctx.stroke();
            }}
          />
        </Group>
      )}
    </Group>
  );
}, (prev, next) => {
    if (prev.hex.currentLevel !== next.hex.currentLevel) return false;
    if (prev.hex.maxLevel !== next.hex.maxLevel) return false;
    if (prev.hex.structureType !== next.hex.structureType) return false;
    if (prev.hex.durability !== next.hex.durability) return false;
    if (prev.hex.progress !== next.hex.progress) return false;
    if (prev.rotation !== next.rotation) return false;
    if (prev.isOccupied !== next.isOccupied) return false;
    if (prev.isSelected !== next.isSelected) return false;
    if (prev.isPendingConfirm !== next.isPendingConfirm) return false;
    if (prev.playerRank !== next.playerRank) return false; 
    if (prev.isTutorialTarget !== next.isTutorialTarget) return false;
    if (prev.isMissingSupport !== next.isMissingSupport) return false; 
    if (prev.isObjective !== next.isObjective) return false; 
    if (prev.isNeighbor !== next.isNeighbor) return false; 
    return true;
});

interface SmartHexagonProps {
  id: string;
  rotation: number;
  playerRank: number; 
  isOccupied: boolean;
  isSelected: boolean; 
  isPendingConfirm: boolean;
  pendingCost: number | null;
  onHexClick: (q: number, r: number) => void;
  onHover: (id: string | null) => void;
  isTutorialTarget?: boolean;
  tutorialHighlightColor?: 'blue' | 'amber' | 'cyan' | 'emerald';
  isMissingSupport?: boolean; 
  isObjective?: boolean;
  isNeighbor?: boolean;
}

const SmartHexagon: React.FC<SmartHexagonProps> = React.memo((props) => {
  const hex = useGameStore(state => state.session?.grid[props.id]);
  if (!hex) return null;
  return <HexagonVisual hex={hex} {...props} />;
});

export default SmartHexagon;
