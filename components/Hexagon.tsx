
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Group, Path, Shape, Line, Circle, Text } from 'react-konva';
import Konva from 'konva';
import { Hex } from '../types.ts';
import { HEX_SIZE, GAME_CONFIG } from '../rules/config.ts';
import { getSecondsToGrow, hexToPixel, getNeighbors, getHexKey } from '../services/hexUtils.ts';
import { useGameStore } from '../store.ts';

// --- CONSTANTS ---
const BASE_HEIGHT = 10;
const STEP_HEIGHT = 10;
const SLAB_THICKNESS = 12; 
const VOID_LEVEL_FLAG = -99;

// --- INDUSTRIAL REALISM PALETTE ---
const THEME_PALETTE: Record<string, { main: string, light: string, dark: string, stroke: string, texture: 'concrete' | 'metal' | 'circuit' | 'rock' | 'magma' }> = {
    // === SURFACE & STRUCTURE (0 to +4) ===
    '0': { main: '#1c1c1e', light: '#3f3f46', dark: '#09090b', stroke: '#52525b', texture: 'concrete' }, // Asphalt
    '1': { main: '#57534e', light: '#a8a29e', dark: '#292524', stroke: '#d6d3d1', texture: 'concrete' }, // Concrete
    '2': { main: '#334155', light: '#64748b', dark: '#0f172a', stroke: '#94a3b8', texture: 'metal' },    // Steel
    '3': { main: '#0e7490', light: '#22d3ee', dark: '#164e63', stroke: '#67e8f9', texture: 'metal' },    // Cyan Plate
    '4': { main: '#1d4ed8', light: '#60a5fa', dark: '#1e3a8a', stroke: '#93c5fd', texture: 'metal' },    // Cobalt Plate

    // === HIGH TECH / ENERGY (+5 to +8) ===
    '5': { main: '#4338ca', light: '#818cf8', dark: '#312e81', stroke: '#c7d2fe', texture: 'circuit' },  // Violet Composite
    '6': { main: '#7c3aed', light: '#a78bfa', dark: '#4c1d95', stroke: '#ddd6fe', texture: 'circuit' },  // Purple Composite
    '7': { main: '#9333ea', light: '#c084fc', dark: '#581c87', stroke: '#f3e8ff', texture: 'circuit' },  // Deep Purple
    '8': { main: '#be185d', light: '#f472b6', dark: '#831843', stroke: '#fce7f3', texture: 'circuit' },  // Pink Crystal

    // === CRITICAL MASS / ORBITAL (+9 to +10) ===
    '9': { main: '#be123c', light: '#fb7185', dark: '#881337', stroke: '#ffe4e6', texture: 'magma' },    // Unstable Red
    '10': { main: '#b91c1c', light: '#f87171', dark: '#7f1d1d', stroke: '#fee2e2', texture: 'magma' },   // Critical Core

    // === UNDERGROUND: CRUST (-1 to -2) ===
    '-1': { main: '#262626', light: '#404040', dark: '#000000', stroke: '#52525b', texture: 'rock' },    // Bedrock
    '-2': { main: '#171717', light: '#262626', dark: '#000000', stroke: '#404040', texture: 'rock' },    // Deep Stone

    // === UNDERGROUND: MANTLE (-3 to -6) ===
    '-3': { main: '#2a0a0a', light: '#450a0a', dark: '#000000', stroke: '#7f1d1d', texture: 'magma' },   // Fissure (Dark Red)
    '-4': { main: '#450a0a', light: '#7f1d1d', dark: '#000000', stroke: '#b91c1c', texture: 'magma' },   // Magma Flow (Red)
    '-5': { main: '#7f1d1d', light: '#ef4444', dark: '#2a0a0a', stroke: '#f87171', texture: 'magma' },   // Active Lava (Bright Red)
    '-6': { main: '#9a3412', light: '#f97316', dark: '#431407', stroke: '#fdba74', texture: 'magma' },   // Deep Mantle (Orange)

    // === UNDERGROUND: CORE (-7 to -10) ===
    '-7': { main: '#ea580c', light: '#fbbf24', dark: '#7c2d12', stroke: '#fde047', texture: 'magma' },   // Outer Core (Bright Orange)
    '-8': { main: '#ca8a04', light: '#facc15', dark: '#713f12', stroke: '#fef08a', texture: 'circuit' }, // Molten Gold (Yellow)
    '-9': { main: '#65a30d', light: '#a3e635', dark: '#365314', stroke: '#bef264', texture: 'circuit' }, // Radioactive (Lime)
    '-10': { main: '#0891b2', light: '#22d3ee', dark: '#164e63', stroke: '#a5f3fc', texture: 'circuit' }, // Singularity (Cyan/White)
};

const getTheme = (level: number) => {
    const key = level.toString();
    if (THEME_PALETTE[key]) return THEME_PALETTE[key];
    if (level > 10) return THEME_PALETTE['10'];
    if (level < -10) return THEME_PALETTE['-10'];
    return THEME_PALETTE['0'];
};

const getHeightOffset = (level: number) => {
    if (level <= VOID_LEVEL_FLAG) return 999; 
    if (level >= 0) {
        return -(BASE_HEIGHT + level * STEP_HEIGHT);
    } else {
        return (Math.abs(level) - 1) * STEP_HEIGHT;
    }
};

const seededRandom = (seed: number) => {
    const x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};

export interface HexagonVisualProps {
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
  isPotentialUpgrade?: boolean; 
  isObjective?: boolean; 
  isNeighbor?: boolean; 
  neighborLevels: number[]; 
}

interface DebrisParticle { x: number; y: number; vx: number; vy: number; rot: number; vRot: number; color: string; path: string; scale: number; }

const generateShatterDebris = (count: number, yOffset: number): DebrisParticle[] => {
    const p: DebrisParticle[] = [];
    for(let i=0; i<count; i++) {
        const size = 4 + Math.random() * 6;
        const path = `M 0 ${-size} L ${size} ${size} L ${-size} ${size} Z`;
        p.push({ x: (Math.random() - 0.5) * 20, y: yOffset + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 8, vy: -2 - Math.random() * 5, rot: Math.random() * 360, vRot: (Math.random() - 0.5) * 20, color: Math.random() > 0.5 ? '#475569' : '#1e293b', path, scale: 1 });
    }
    return p;
};

// Generates jagged crack lines for damaged hexes
const generateCrackPatterns = (durability: number, max: number, size: number, rotation: number, offsetY: number) => {
    if (durability > 2) return null;
    const cracks = [];
    const seedBase = 12345;
    
    // Number of cracks inversely proportional to durability
    const crackCount = (max - durability) * 2; 

    for (let i = 0; i < crackCount; i++) {
        const rng = (offset: number) => seededRandom(seedBase + i * 100 + offset);
        
        // Random start point near center
        const startX = (rng(1) - 0.5) * size * 0.5;
        const startY = offsetY + (rng(2) - 0.5) * size * 0.3;
        
        // Random direction towards edge
        const angle = rng(3) * Math.PI * 2;
        const length = size * (0.4 + rng(4) * 0.5);
        
        // Jagged line construction
        let currX = startX;
        let currY = startY;
        const points = [currX, currY];
        const segments = 3 + Math.floor(rng(5) * 3);
        
        for(let j=0; j<segments; j++) {
            const segLen = length / segments;
            const jitterAngle = angle + (rng(j + 10) - 0.5) * 1.5; // High jitter for jaggedness
            currX += Math.cos(jitterAngle) * segLen;
            currY += Math.sin(jitterAngle) * segLen * 0.8; // Squash Y
            points.push(currX, currY);
        }
        
        cracks.push({ points, width: 2 - (durability * 0.5), alpha: 0.8 });
    }
    
    return { cracks, isCritical: true };
};

export const HexagonVisual: React.FC<HexagonVisualProps> = React.memo(({ hex, rotation, playerRank, isOccupied, isSelected, isPendingConfirm, pendingCost, onHexClick, onHover, isTutorialTarget, tutorialHighlightColor = 'blue', isPotentialUpgrade, isObjective, isNeighbor, neighborLevels }) => {
  const groupRef = useRef<Konva.Group>(null);
  const cachedGeometryRef = useRef<Konva.Group>(null);
  const prevStructureRef = useRef(hex.structureType);
  const [isExploding, setIsExploding] = useState(false);
  const [debris, setDebris] = useState<DebrisParticle[]>([]);
  
  // Define references for dynamic elements
  const objectiveRef = useRef<Konva.Group>(null);
  const selectionRef = useRef<Konva.Path>(null);
  const confirmRef = useRef<Konva.Group>(null);
  const progressShapeRef = useRef<Konva.Shape>(null);

  const { x, y } = hexToPixel(hex.q, hex.r, rotation);
  
  const isRealVoid = hex.structureType === 'VOID';
  const showVoid = isRealVoid && !isExploding;
  
  const isNegative = hex.currentLevel < 0;
  const visualLevel = (isRealVoid && !isExploding) ? 0 : hex.maxLevel;
  const theme = getTheme(visualLevel);

  let offsetY = 0;
  if (showVoid) {
      offsetY = -2;
  } else {
      offsetY = getHeightOffset(visualLevel);
  }

  const sideColor = showVoid ? '#000000' : theme.dark;
  
  const isGrowing = hex.progress > 0 && !showVoid && !isExploding;
  const neededTicks = getSecondsToGrow(hex.currentLevel + 1) || 30;
  const progressPercent = Math.min(1, hex.progress / neededTicks);
  const isRankLocked = hex.maxLevel > playerRank;
  const isFragile = hex.maxLevel === 1 && !isRealVoid;
  const maxLives = GAME_CONFIG.L1_HEX_MAX_DURABILITY;
  const currentLives = hex.durability !== undefined ? hex.durability : maxLives;
  
  const { sortedFaces, selectionPathData, crackVisuals, voidPaths, topFacePath, visibleEdges, groundEdges } = useMemo(() => {
    const getPoint = (i: number, cy: number, radius: number = HEX_SIZE) => {
        const angle_deg = 60 * i + 30;
        const angle_rad = (angle_deg * Math.PI) / 180 + (rotation * Math.PI) / 180;
        return {
            x: radius * Math.cos(angle_rad),
            y: cy + radius * Math.sin(angle_rad) * 0.8 // Squash factor for perspective
        };
    };

    const tops = [];
    const faces = [];
    const visibleEdges = [];
    const groundEdges = [];
    
    // Top Face Vertices
    for (let i = 0; i < 6; i++) {
        tops.push(getPoint(i, offsetY, HEX_SIZE));
    }

    if (!showVoid) {
        for (let i = 0; i < 6; i++) {
            const next = (i + 1) % 6;
            const neighborLevel = neighborLevels[5 - i]; 
            
            let neighborY = 0;
            let isAbyss = false;

            if (neighborLevel <= VOID_LEVEL_FLAG) {
                neighborY = offsetY + SLAB_THICKNESS;
                isAbyss = true;
            } else {
                neighborY = getHeightOffset(neighborLevel);
            }
            
            if (offsetY < neighborY) {
                const myP1 = tops[i];
                const myP2 = tops[next];
                const nP1 = getPoint(next, neighborY);
                const nP2 = getPoint(i, neighborY);

                const facePoints = [
                    myP1.x, myP1.y,
                    myP2.x, myP2.y,
                    nP1.x, nP1.y,
                    nP2.x, nP2.y
                ];
                
                const avgY = (myP1.y + myP2.y + nP1.y + nP2.y) / 4;
                faces.push({ points: facePoints, depth: avgY, isAbyss });
            }

            // Only draw edges if they visually delineate separation
            if (neighborLevel < visualLevel) {
                visibleEdges.push([tops[i].x, tops[i].y, tops[next].x, tops[next].y]);
            }

            if (isNegative && neighborLevel >= 0) {
                const gP1 = getPoint(i, 0); 
                const gP2 = getPoint(next, 0);
                groundEdges.push([gP1.x, gP1.y, gP2.x, gP2.y]);
            }
        }
        faces.sort((a, b) => a.depth - b.depth);
    }

    const topFacePath = `M ${tops[0].x} ${tops[0].y} L ${tops[1].x} ${tops[1].y} L ${tops[2].x} ${tops[2].y} L ${tops[3].x} ${tops[3].y} L ${tops[4].x} ${tops[4].y} L ${tops[5].x} ${tops[5].y} Z`;
    
    const sp = [];
    const selRadius = Math.max(0, HEX_SIZE - 4);
    for(let i=0; i<6; i++) sp.push(getPoint(i, offsetY, selRadius));
    const selectionPathData = `M ${sp[0].x} ${sp[0].y} L ${sp[1].x} ${sp[1].y} L ${sp[2].x} ${sp[2].y} L ${sp[3].x} ${sp[3].y} L ${sp[4].x} ${sp[4].y} L ${sp[5].x} ${sp[5].y} Z`;

    const crackVisuals = isFragile 
        ? generateCrackPatterns(currentLives, maxLives, HEX_SIZE, rotation, offsetY)
        : null;

    let voidPaths = { outer: "M" };
    if (showVoid) {
        let vp = `M ${tops[0].x} ${tops[0].y}`;
        for(let i=1; i<6; i++) vp += ` L ${tops[i].x} ${tops[i].y}`;
        vp += " Z";
        voidPaths.outer = vp;
    }

    return { sortedFaces: faces, selectionPathData, crackVisuals, voidPaths, topFacePath, visibleEdges, groundEdges };
  }, [rotation, offsetY, showVoid, isFragile, currentLives, maxLives, hex.q, hex.r, neighborLevels, visualLevel, isNegative]);


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

  // --- ANIMATION LOOP ---
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
      return () => { anim.stop(); };
  }, [isExploding]);

  // --- OPTIMIZED CACHING ---
  useEffect(() => {
    const node = cachedGeometryRef.current;
    if (!node || isExploding) return;

    node.clearCache();

    const cacheTimeout = setTimeout(() => {
        if (node) {
            node.cache({
                pixelRatio: Math.min(window.devicePixelRatio || 2, 2), 
                offset: 20 
            });
        }
    }, 200);

    return () => clearTimeout(cacheTimeout);
  }, [
      hex.maxLevel, 
      hex.structureType, 
      hex.durability, 
      rotation,
      isExploding, 
      isRankLocked,
      isPendingConfirm, 
      theme,
      offsetY,
      neighborLevels
  ]);

  const handleClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (showVoid || isExploding) return;
    if ('button' in e.evt && e.evt.button !== 0) return; 
    e.cancelBubble = true;
    onHexClick(hex.q, hex.r);
  };

  if (isExploding) {
      return (
          <Group x={x} y={y}>
              {debris.map((p, i) => (
                  <Path key={i} data={p.path} x={p.x} y={p.y} fill={p.color} rotation={p.rot} scaleX={p.scale} scaleY={p.scale} perfectDrawEnabled={false} listening={false} />
              ))}
          </Group>
      );
  }

  return (
    <Group ref={groupRef} x={x} y={y} onClick={handleClick} onTap={handleClick} onMouseEnter={() => onHover(hex.id)} onMouseLeave={() => onHover(null)} onTouchStart={() => onHover(hex.id)} onTouchEnd={() => onHover(null)}>
      
      <Group ref={cachedGeometryRef}>
          {showVoid ? (
            <Group>
                <Path data={voidPaths.outer} fill="#050505" stroke="#1c1917" strokeWidth={1} shadowColor="#000" shadowBlur={15} shadowOpacity={1} perfectDrawEnabled={false} listening={false} />
            </Group>
          ) : (
            <Group>
                {/* WALLS / SIDES */}
                {sortedFaces.map((face, i) => (
                    <Path 
                        key={`face-${i}`} 
                        data={`M ${face.points[0]} ${face.points[1]} L ${face.points[2]} ${face.points[3]} L ${face.points[4]} ${face.points[5]} L ${face.points[6]} ${face.points[7]} Z`} 
                        fill={sideColor}
                        // Subtle lighting on faces based on angle (optional optimization)
                        stroke={sideColor} 
                        strokeWidth={0.5} 
                        closed={true} 
                        perfectDrawEnabled={false} 
                        listening={false} 
                    />
                ))}
                
                {/* FLOOR / ROOF */}
                <Path 
                    data={topFacePath} 
                    fillRadialGradientStartPoint={{ x: -HEX_SIZE*0.5, y: offsetY - HEX_SIZE*0.5 }}
                    fillRadialGradientStartRadius={0}
                    fillRadialGradientEndPoint={{ x: 0, y: offsetY }}
                    fillRadialGradientEndRadius={HEX_SIZE * 2.5}
                    fillRadialGradientColorStops={[0, theme.light, 1, theme.main]}
                    perfectDrawEnabled={false} 
                    shadowColor="black" 
                    shadowBlur={isNegative ? 0 : 5} 
                    shadowOpacity={isNegative ? 0 : 0.5} 
                    shadowOffset={{x: 2, y: isNegative ? 0 : 5}} 
                />

                {/* FLOOR GLOW FOR DEEP PITS (-3 and below) */}
                {isNegative && visualLevel <= -3 && (
                    <Path 
                        data={topFacePath}
                        fillRadialGradientStartPoint={{ x: 0, y: offsetY }}
                        fillRadialGradientStartRadius={0}
                        fillRadialGradientEndPoint={{ x: 0, y: offsetY }}
                        fillRadialGradientEndRadius={HEX_SIZE * 0.9}
                        fillRadialGradientColorStops={[0, theme.light, 0.6, 'rgba(0,0,0,0)', 1, 'transparent']}
                        opacity={visualLevel <= -6 ? 0.7 : 0.4}
                        perfectDrawEnabled={false}
                        listening={false}
                    />
                )}
                
                {/* DETAILED TEXTURE OVERLAY */}
                <Shape 
                    sceneFunc={(ctx, shape) => {
                        const seed = Math.abs((hex.q * 99991) ^ (hex.r * 11119));
                        const rng = (offset: number) => seededRandom(seed + offset);
                        
                        // 1. Concrete / Asphalt (Noise)
                        if (theme.texture === 'concrete' || theme.texture === 'rock') {
                            const count = theme.texture === 'rock' ? 12 : 6;
                            const opacity = theme.texture === 'rock' ? 0.15 : 0.08;
                            
                            // Speckles
                            for(let i=0; i<count; i++) {
                                const angle = rng(i) * Math.PI * 2;
                                const dist = rng(i + 50) * HEX_SIZE * 0.7;
                                ctx.beginPath();
                                ctx.arc(Math.cos(angle)*dist, offsetY + Math.sin(angle)*dist * 0.8, 0.8, 0, Math.PI*2);
                                ctx.fillStyle = `rgba(0,0,0,${opacity})`;
                                ctx.fill();
                            }
                        }
                        
                        // 2. Metal (Bolts & Panels)
                        else if (theme.texture === 'metal') {
                            // Bolts at corners
                            ctx.fillStyle = 'rgba(0,0,0,0.3)';
                            for(let i=0; i<6; i++) {
                                const angle = (60 * i + 30) * (Math.PI/180); 
                                const bx = (HEX_SIZE - 7) * Math.cos(angle);
                                const by = offsetY + (HEX_SIZE - 7) * Math.sin(angle) * 0.8;
                                ctx.beginPath();
                                ctx.arc(bx, by, 1.2, 0, Math.PI*2);
                                ctx.fill();
                            }
                            // Inner Bevel Line (Panel separation)
                            ctx.beginPath();
                            for(let i=0; i<6; i++) {
                                const angle = (60 * i + 30) * (Math.PI/180);
                                const px = (HEX_SIZE - 4) * Math.cos(angle);
                                const py = offsetY + (HEX_SIZE - 4) * Math.sin(angle) * 0.8;
                                if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                            }
                            ctx.closePath();
                            ctx.strokeStyle = 'rgba(255,255,255,0.1)';
                            ctx.lineWidth = 1;
                            ctx.stroke();
                        }
                        
                        // 3. Circuit / Magma (High Energy)
                        else if (theme.texture === 'circuit' || theme.texture === 'magma') {
                            const isMagma = theme.texture === 'magma';
                            ctx.beginPath();
                            // Central Node
                            ctx.arc(0, offsetY, isMagma ? 4 : 2, 0, Math.PI*2);
                            
                            // Lines radiating to alternate corners
                            for(let i=0; i<6; i+=2) {
                                const angle = (60 * i + 30) * (Math.PI/180);
                                const px = (HEX_SIZE - 5) * Math.cos(angle);
                                const py = offsetY + (HEX_SIZE - 5) * Math.sin(angle) * 0.8;
                                ctx.moveTo(0, offsetY);
                                ctx.lineTo(px, py);
                                // End terminal
                                if (!isMagma) ctx.rect(px-1, py-1, 2, 2);
                            }
                            // Magma Glow Lines vs Circuit Cool Lines
                            if (isMagma) {
                                ctx.strokeStyle = theme.stroke || 'rgba(255,100,50,0.4)';
                                ctx.lineWidth = 1.5;
                            } else {
                                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                                ctx.lineWidth = 1;
                            }
                            
                            ctx.stroke();
                        }
                    }}
                />
            </Group>
          )}

          {/* CRACKS OVERLAY (Damaged L1) */}
          {crackVisuals && (
              <Group>
                  {crackVisuals.cracks.map((c, i) => {
                      const points = [];
                      for(let j=0; j<c.points.length; j+=2) points.push(c.points[j], c.points[j+1]);
                      return (
                          <Line 
                            key={`crack-${i}`} 
                            points={points} 
                            stroke="#000" 
                            strokeWidth={c.width} 
                            opacity={c.alpha} 
                            lineCap="round" 
                            lineJoin="round" 
                            listening={false}
                          />
                      );
                  })}
              </Group>
          )}

          {/* Tutorial Highlight Ring */}
          {isTutorialTarget && (
             <Path 
               data={selectionPathData} 
               stroke={
                   tutorialHighlightColor === 'blue' ? '#3b82f6' : 
                   tutorialHighlightColor === 'amber' ? '#f59e0b' : 
                   tutorialHighlightColor === 'cyan' ? '#06b6d4' : '#10b981'
               } 
               strokeWidth={3} 
               shadowColor={
                   tutorialHighlightColor === 'blue' ? '#3b82f6' : 
                   tutorialHighlightColor === 'amber' ? '#f59e0b' : 
                   tutorialHighlightColor === 'cyan' ? '#06b6d4' : '#10b981'
               }
               shadowBlur={10}
               shadowOpacity={1}
               dash={[10, 5]}
               listening={false}
             />
          )}

          {/* Objective Marker */}
          {isObjective && (
              <Group ref={objectiveRef} y={offsetY - 25}>
                   <Circle radius={18} stroke="#f59e0b" strokeWidth={2} dash={[4, 4]} />
                   <Circle radius={14} fill="#f59e0b" opacity={0.2} />
                   <Path 
                     data="M -6 -8 L 8 0 L -6 8 L -6 -8 Z" 
                     fill="#f59e0b" 
                     x={-2} 
                     rotation={90} 
                     scaleX={0.8} 
                     scaleY={0.8}
                   />
              </Group>
          )}
      </Group>

      {/* DYNAMIC UI ELEMENTS (Not Cached) */}
      {!showVoid && (
        <Group>
            {/* Selection Highlight */}
            {isSelected && (
                <Path ref={selectionRef} data={selectionPathData} stroke="white" strokeWidth={3} shadowColor="white" shadowBlur={10} opacity={0.8} listening={false} />
            )}

            {/* Pending Move Highlight */}
            {isPendingConfirm && (
                <Group ref={confirmRef} y={offsetY}>
                    <Circle radius={14} fill="rgba(0,0,0,0.6)" stroke="#facc15" strokeWidth={2} />
                    <Text text={pendingCost ? `-${pendingCost}` : "?"} fontSize={10} fontStyle="bold" fill="#facc15" align="center" verticalAlign="middle" width={30} x={-15} y={-5} />
                </Group>
            )}

            {/* Growth Progress Ring */}
            {isGrowing && (
                <Group y={offsetY}>
                    <Shape 
                        ref={progressShapeRef}
                        sceneFunc={(context, shape) => {
                            context.beginPath();
                            context.arc(0, 0, 16, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * progressPercent), false);
                            context.strokeStyle = isNegative ? '#facc15' : '#10b981';
                            context.lineWidth = 4;
                            context.lineCap = "round";
                            context.stroke();
                        }}
                        listening={false}
                    />
                </Group>
            )}
            
            {/* Potential Upgrade Hint */}
            {isPotentialUpgrade && !isOccupied && !isGrowing && !isRankLocked && !showVoid && (
                <Circle x={0} y={offsetY} radius={3} fill="#10b981" shadowColor="#10b981" shadowBlur={5} opacity={0.8} listening={false} />
            )}
        </Group>
      )}
    </Group>
  );
});

interface HexagonProps {
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

const Hexagon: React.FC<HexagonProps> = React.memo(({ id, isMissingSupport, ...props }) => {
    // Access store directly to get latest hex state without re-rendering parent list unnecessarily
    const session = useGameStore(state => state.session);
    
    // If no session or grid, render nothing
    if (!session || !session.grid) return null;
    
    const hex = session.grid[id];
    if (!hex) return null;

    // Calculate neighbors for visual edges
    const neighbors = getNeighbors(hex.q, hex.r);
    const neighborLevels = neighbors.map(n => {
        const h = session.grid[getHexKey(n.q, n.r)];
        if (!h) return 0;
        if (h.structureType === 'VOID') return -99;
        return h.maxLevel;
    });

    return (
        <HexagonVisual 
            {...props}
            hex={hex}
            neighborLevels={neighborLevels}
            isPotentialUpgrade={isMissingSupport}
        />
    );
});

export default Hexagon;
