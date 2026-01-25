
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { Group, Path, Shape, Circle, Text, RegularPolygon, Line } from 'react-konva';
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
}

const LEVEL_COLORS: Record<number, { fill: string; stroke: string; side: string }> = {
  0: { fill: '#1e293b', stroke: '#334155', side: '#0f172a' }, 
  1: { fill: '#1e3a8a', stroke: '#3b82f6', side: '#172554' }, 
  2: { fill: '#065f46', stroke: '#10b981', side: '#064e3b' }, 
  3: { fill: '#155e75', stroke: '#06b6d4', side: '#0e7490' }, 
  4: { fill: '#3f6212', stroke: '#84cc16', side: '#1a2e05' }, 
  5: { fill: '#92400e', stroke: '#f59e0b', side: '#451a03' }, 
  6: { fill: '#9a3412', stroke: '#ea580c', side: '#431407' }, 
  7: { fill: '#991b1b', stroke: '#dc2626', side: '#450a0a' }, 
  8: { fill: '#831843', stroke: '#db2777', side: '#500724' }, 
  9: { fill: '#581c87', stroke: '#9333ea', side: '#3b0764' }, 
  10: { fill: '#4c1d95', stroke: '#a855f7', side: '#2e1065' }, 
  11: { fill: '#0f172a', stroke: '#f8fafc', side: '#020617' },
};

const LOCK_PATH = "M12 1a5 5 0 0 0-5 5v2H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v2H9V6a3 3 0 0 1 3-3z";

// Determine crater positions based on damage (0 to 6) for Level 1 hexes
const getCraters = (q: number, r: number, damage: number, offsetY: number) => {
    if (damage <= 0) return [];
    
    const seed = Math.abs((q * 73856093) ^ (r * 19349663));
    const rand = (index: number, mod: number) => ((seed + index * 12345) % mod) / mod;
    
    const craters: { x: number, y: number, r: number, opacity: number }[] = [];
    const maxRadius = HEX_SIZE * 0.7; 

    const count = Math.ceil(damage * 1.5); 

    for (let i = 0; i < count; i++) {
        const angle = rand(i, 360) * Math.PI * 2;
        const dist = rand(i + 10, 100) * maxRadius * 0.8;
        
        const x = Math.cos(angle) * dist;
        const y = offsetY + (Math.sin(angle) * dist * 0.7); 

        const sizeBase = 2 + rand(i + 50, 3); 
        const sizeBonus = (damage > 3) ? (damage - 3) : 0;
        
        craters.push({
            x,
            y,
            r: sizeBase + sizeBonus,
            opacity: 0.3 + (rand(i + 20, 4) * 0.3)
        });
    }
    
    return craters;
};

const HexagonVisual: React.FC<HexagonVisualProps> = React.memo(({ hex, rotation, playerRank, isOccupied, isSelected, isPendingConfirm, pendingCost, onHexClick, onHover, isTutorialTarget, tutorialHighlightColor = 'blue' }) => {
  const groupRef = useRef<Konva.Group>(null);
  const staticGroupRef = useRef<Konva.Group>(null); // NEW: For caching static parts
  const progressShapeRef = useRef<Konva.Shape>(null);
  const selectionRef = useRef<Konva.Path>(null);
  const voidGroupRef = useRef<Konva.Group>(null);
  const confirmRef = useRef<Konva.Group>(null);
  const tutorialHighlightRef = useRef<Konva.Path>(null);
  
  const prevStructureRef = useRef(hex.structureType);
  // State to handle the visual delay of destruction (The "Wile E. Coyote" effect)
  const [isDelayedCollapse, setIsDelayedCollapse] = useState(false);
  
  const { x, y } = hexToPixel(hex.q, hex.r, rotation);
  
  // LOGIC VS VISUAL STATE
  // If we are in "Delayed Collapse" mode, we force the visuals to look like a Level 1 hex
  // even though the logical state is already VOID.
  const isRealVoid = hex.structureType === 'VOID';
  const showVoid = isRealVoid && !isDelayedCollapse;
  
  // Visual Level: If collapsing, fake it as L1 (index 1), otherwise real level
  const levelIndex = showVoid ? 0 : (isDelayedCollapse ? 1 : Math.min(hex.maxLevel, 11));
  const colorSet = LEVEL_COLORS[levelIndex] || LEVEL_COLORS[0];

  let fillColor = showVoid ? '#020617' : colorSet.fill;
  let strokeColor = showVoid ? '#0f172a' : colorSet.stroke;
  let sideColor = showVoid ? '#000000' : colorSet.side;
  let strokeWidth = showVoid ? 0 : 1;

  // HEX HEIGHT CONFIG
  // Level 0 is ~10px high. 
  // User wants Crater (VOID) to be "slightly below Level 0". 
  // So we set Void height to 8 (y = -8), which is visibly lower than L0 (y = -10).
  const heightMult = isDelayedCollapse ? 1 : hex.maxLevel; // Force L1 height if collapsing
  const hexHeight = showVoid ? 8 : (10 + (heightMult * 6));
  const offsetY = -hexHeight;

  const isGrowing = hex.progress > 0 && !showVoid;
  const targetLevel = hex.currentLevel + 1;
  const neededTicks = getSecondsToGrow(targetLevel) || 30;
  const progressPercent = Math.min(1, hex.progress / neededTicks);
  const isLocked = hex.maxLevel > playerRank;
  
  const isFragile = hex.maxLevel === 1 && !showVoid;
  const maxLives = GAME_CONFIG.L1_HEX_MAX_DURABILITY;
  const currentLives = hex.durability !== undefined ? hex.durability : maxLives;
  // If collapsing, force max damage visual
  const damage = isDelayedCollapse ? 6 : Math.max(0, maxLives - currentLives);

  // Geometry Calculation
  const { topPoints, sortedFaces, selectionPathData, craters, rubble, spikes, voidPaths } = useMemo(() => {
    const getPoint = (i: number, cy: number, radius: number = HEX_SIZE) => {
        const angle_deg = 60 * i + 30;
        const angle_rad = (angle_deg * Math.PI) / 180 + (rotation * Math.PI) / 180;
        return {
            x: radius * Math.cos(angle_rad),
            y: cy + radius * Math.sin(angle_rad) * 0.8 // Squash Y
        };
    };

    const tops = [];
    const bottoms = [];
    const faces = [];
    const selectionTops = [];
    const selRadius = Math.max(0, HEX_SIZE - 6); 

    for (let i = 0; i < 6; i++) {
        tops.push(getPoint(i, offsetY, HEX_SIZE));
        bottoms.push(getPoint(i, 0, HEX_SIZE));
        selectionTops.push(getPoint(i, offsetY, selRadius));
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
    const sp = selectionTops;
    const selectionPathData = `M ${sp[0].x} ${sp[0].y} L ${sp[1].x} ${sp[1].y} L ${sp[2].x} ${sp[2].y} L ${sp[3].x} ${sp[3].y} L ${sp[4].x} ${sp[4].y} L ${sp[5].x} ${sp[5].y} Z`;

    const craters = isFragile ? getCraters(hex.q, hex.r, damage, offsetY) : [];

    // --- GENERATE RUBBLE & SPIKES FOR VOID ---
    const rubbleData: { x: number, y: number, size: number, color: string, opacity: number, rotation: number }[] = [];
    const spikesData: { points: number[], fill: string, stroke: string, shade: string }[] = [];
    let voidPaths = { outer: '', inner: '' };

    if (showVoid) {
        const seed = Math.abs((hex.q * 9999) ^ (hex.r * 8888));
        const rng = (i: number) => ((seed + i * 12345) % 100) / 100;
        
        // 1. Jagged Path Generation
        const getP = (angleDeg: number, rad: number) => {
             const angleRad = (angleDeg * Math.PI) / 180 + (rotation * Math.PI) / 180;
             return {
                 x: rad * Math.cos(angleRad),
                 y: offsetY + rad * Math.sin(angleRad) * 0.8 
             };
        };

        let outerD = "M";
        let innerD = "M";

        for (let i = 0; i < 6; i++) {
            const angle = 60 * i + 30;
            // Vertex Jitter
            const r1 = HEX_SIZE * (0.85 + rng(i) * 0.2); 
            const p1 = getP(angle, r1);
            
            // Midpoint Jitter (inward "bite" for jagged look)
            const rMid = HEX_SIZE * (0.6 + rng(i+10) * 0.2);
            const pMid = getP(angle + 30, rMid);

            if (i===0) outerD += ` ${p1.x} ${p1.y}`;
            else outerD += ` L ${p1.x} ${p1.y}`;
            
            outerD += ` L ${pMid.x} ${pMid.y}`;

            // Inner Path (Deep Void hole)
            const rInner = r1 * 0.55;
            const pInner = getP(angle + (rng(i+50)*10), rInner);
            if (i===0) innerD += ` ${pInner.x} ${pInner.y}`;
            else innerD += ` L ${pInner.x} ${pInner.y}`;
        }
        outerD += " Z";
        innerD += " Z";
        voidPaths = { outer: outerD, inner: innerD };

        // 2. Spikes Generation (Impassable Terrain Indicators)
        const spikeCount = 3 + Math.floor(rng(77) * 4); // 3 to 6 spikes
        for (let k = 0; k < spikeCount; k++) {
             const angle = rng(k*99) * Math.PI * 2;
             // Distribute within the void area
             const r = rng(k*55) * (HEX_SIZE * 0.5); 
             const cx = Math.cos(angle) * r;
             const cy = (Math.sin(angle) * r) * 0.8;

             // Spike dimensions
             const h = 12 + rng(k*33) * 18; // Height 12-30px
             const w = 5 + rng(k*11) * 6;   // Width 5-11px

             // Random tilt
             const tilt = (rng(k*22) - 0.5) * 10;
             
             // Base points relative to cx,cy
             const bl = { x: cx - w/2, y: cy + (rng(k)*3) };
             const br = { x: cx + w/2, y: cy + (rng(k)*3) };
             const tip = { x: cx + tilt, y: cy - h };

             spikesData.push({
                 points: [bl.x, bl.y, br.x, br.y, tip.x, tip.y],
                 fill: '#57534e', // stone-600 (Lighter side)
                 stroke: '#1c1917', // stone-900
                 shade: '#292524' // stone-800 (Darker side for depth)
             });
        }

        // 3. Debris/Rubble Generation
        for(let i=0; i < 6; i++) {
             rubbleData.push({
                 x: (rng(i) - 0.5) * HEX_SIZE * 1.3,
                 y: (rng(i+20) - 0.5) * HEX_SIZE * 0.7,
                 size: 2 + rng(i+5) * 3,
                 color: rng(i+10) > 0.85 ? '#78350f' : '#44403c', // Rare brown, mostly dark stone
                 opacity: 0.5 + rng(i+30) * 0.5,
                 rotation: rng(i+40) * 360
             });
        }
    }

    return { topPoints: topPathPoints, sortedFaces: faces, selectionPathData, craters, rubble: rubbleData, spikes: spikesData, voidPaths };
  }, [rotation, offsetY, showVoid, isFragile, damage, hex.q, hex.r]);


  // CLICK HANDLER
  const handleClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (showVoid) return;
    if ('button' in e.evt) {
        if (e.evt.button !== 0) return; 
    }
    e.cancelBubble = true;
    onHexClick(hex.q, hex.r);
  };

  // --- BITMAP CACHING LOGIC ---
  useEffect(() => {
    const node = staticGroupRef.current;
    if (node) {
        node.clearCache();
        node.cache({ pixelRatio: 1 }); 
    }
  }, [
      hex.maxLevel, 
      showVoid, // Depend on visual void state, not logical
      hex.durability, 
      rotation, 
      isLocked,
      isPendingConfirm,
      isFragile,
      damage,
      isDelayedCollapse // Cache needs to update if we switch visual modes
  ]);

  // 2. Void Group Cache
  useEffect(() => {
      const node = voidGroupRef.current;
      if (showVoid && node) {
          node.clearCache();
          node.cache({ pixelRatio: 1 });
      }
  }, [showVoid, hex.q, hex.r, rotation, hex.structureType]);


  // --- ANIMATIONS ---

  // 1. COLLAPSE SEQUENCE (Shake -> Crumble -> Void)
  useEffect(() => {
      const wasVoid = prevStructureRef.current === 'VOID';
      const nowVoid = hex.structureType === 'VOID';
      
      // TRIGGER COLLAPSE ANIMATION
      if (!wasVoid && nowVoid) {
          setIsDelayedCollapse(true);
          
          const node = groupRef.current;
          if (node) {
               // A. SHAKE (0-400ms)
               const shakeAnim = new Konva.Animation((frame) => {
                   const t = frame!.time;
                   if (t > 400) {
                       shakeAnim.stop();
                       return;
                   }
                   // Violet shake
                   const dx = Math.sin(t * 0.5) * 3; 
                   const dy = Math.cos(t * 0.3) * 3;
                   node.offset({ x: dx, y: dy });
               }, node.getLayer());
               
               shakeAnim.start();

               // B. FALL (400-500ms)
               const fallTween = new Konva.Tween({
                   node: node,
                   duration: 0.1,
                   y: y + 50,
                   opacity: 0,
                   easing: Konva.Easings.EaseIn,
                   delay: 0.4,
                   onFinish: () => {
                       // End visual fake, switch to real VOID render
                       setIsDelayedCollapse(false);
                       node.opacity(1);
                       node.offset({x:0, y:0});
                       node.y(y); // Reset pos
                   }
               });
               fallTween.play();
          }
      } else if (!nowVoid) {
          // Reset if healed/spawned
          setIsDelayedCollapse(false);
      }
      
      prevStructureRef.current = hex.structureType;
  }, [hex.structureType, y]);

  
  // GROWING ANIMATION
  useEffect(() => {
    if (!groupRef.current) return;
    const node = groupRef.current;
    
    if (isGrowing) {
       const anim = new Konva.Animation((frame) => {
          const scale = 1 + (Math.sin(frame!.time / 200) * 0.05);
          node.scaleY(scale);
       }, node.getLayer());
       anim.start();
       return () => { anim.stop(); node.scale({x: 1, y: 1}); };
    } else {
        node.scale({x: 1, y: 1});
    }
  }, [isGrowing]);

  // PENDING CONFIRM
  useEffect(() => {
    if (isPendingConfirm && confirmRef.current) {
         const node = confirmRef.current;
         const anim = new Konva.Animation((frame) => {
            const scale = 1 + (Math.sin(frame!.time / 150) * 0.1); // Fast pulse
            node.scale({ x: scale, y: scale });
         }, node.getLayer());
         anim.start();
         return () => { anim.stop(); };
    }
  }, [isPendingConfirm]);

  // TUTORIAL TARGET
  useEffect(() => {
      if (isTutorialTarget && tutorialHighlightRef.current) {
          const node = tutorialHighlightRef.current;
          const anim = new Konva.Animation((frame) => {
              const scale = 1 + (Math.sin(frame!.time / 150) * 0.15);
              node.scale({ x: scale, y: scale });
              node.opacity(0.5 + (Math.sin(frame!.time / 150) * 0.3));
          }, node.getLayer());
          anim.start();
          return () => { anim.stop(); };
      }
  }, [isTutorialTarget]);

  // PROGRESS BAR
  useEffect(() => {
      const shape = progressShapeRef.current;
      if (shape && isGrowing) {
          const tween = new Konva.Tween({
              node: shape, duration: 0.2, visualProgress: progressPercent, easing: Konva.Easings.Linear
          });
          tween.play();
          return () => tween.destroy();
      }
  }, [progressPercent, isGrowing]);

  // SELECTION PULSE
  useEffect(() => {
      const selectionNode = selectionRef.current;
      if (selectionNode && isSelected) {
          selectionNode.strokeWidth(1.5);
          selectionNode.opacity(0.6);
          const tween = new Konva.Tween({
              node: selectionNode, duration: 1.0, shadowBlur: 15, opacity: 1, strokeWidth: 2, yoyo: true, repeat: -1, easing: Konva.Easings.EaseInOut,
          });
          tween.play();
          return () => { tween.destroy(); }
      }
  }, [isSelected]);

  // Map tutorial prop to colors
  const tutorialColorHex = useMemo(() => {
      if (tutorialHighlightColor === 'amber') return '#fbbf24';
      if (tutorialHighlightColor === 'cyan') return '#22d3ee';
      if (tutorialHighlightColor === 'emerald') return '#34d399';
      return '#60a5fa'; 
  }, [tutorialHighlightColor]);

  // --- RENDER VOID (CRATER WITH SPIKES) ---
  if (showVoid) {
      return (
        <Group ref={voidGroupRef} x={x} y={y}>
            {/* 1. Dark Base Ground (The Crater) */}
            <Path
                 data={voidPaths.outer}
                 fill="#1c1917" // stone-900
                 stroke="#0c0a09" // stone-950
                 strokeWidth={1}
                 perfectDrawEnabled={false}
                 opacity={1}
                 shadowColor="black"
                 shadowBlur={5}
            />
            
            {/* 2. Deep Inner Void (The Hole) */}
            <Path
                 data={voidPaths.inner}
                 fill="#000000"
                 opacity={0.8}
                 perfectDrawEnabled={false}
            />

            {/* 3. Spikes (Impassable indicators) */}
            {spikes.map((s, i) => (
                <Line
                    key={`spike-${i}`}
                    points={s.points}
                    closed={true}
                    fill={s.fill}
                    stroke={s.stroke}
                    strokeWidth={1}
                    shadowColor="black"
                    shadowBlur={2}
                    shadowOpacity={0.6}
                    shadowOffset={{x: 2, y: 2}}
                    perfectDrawEnabled={false}
                />
            ))}

            {/* 4. Scattered Debris */}
            {rubble.map((r, i) => (
                <RegularPolygon
                    key={`rubble-${i}`}
                    x={r.x}
                    y={r.y}
                    sides={3 + (i % 3)} 
                    radius={r.size}
                    fill={r.color}
                    opacity={r.opacity}
                    rotation={r.rotation}
                    scaleY={0.6}
                    perfectDrawEnabled={false}
                />
            ))}
        </Group>
      );
  }

  // --- RENDER STANDARD HEX (OR COLLAPSING FAKE) ---
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
      {/* STATIC GEOMETRY (CACHED AS BITMAP) */}
      <Group ref={staticGroupRef}>
          {/* 1. WALLS */}
          {sortedFaces.map((face, i) => (
              <Path
                key={i}
                data={`M ${face.points[0]} ${face.points[1]} L ${face.points[2]} ${face.points[3]} L ${face.points[4]} ${face.points[5]} L ${face.points[6]} ${face.points[7]} Z`}
                fill={sideColor}
                stroke={sideColor}
                strokeWidth={1}
                closed={true}
                perfectDrawEnabled={false}
              />
          ))}

          {/* 2. TOP CAP */}
          <Path
             data={`M ${topPoints[0]} ${topPoints[1]} L ${topPoints[2]} ${topPoints[3]} L ${topPoints[4]} ${topPoints[5]} L ${topPoints[6]} ${topPoints[7]} L ${topPoints[8]} ${topPoints[9]} L ${topPoints[10]} ${topPoints[11]} Z`}
             fill={fillColor}
             stroke={strokeColor}
             strokeWidth={strokeWidth}
             perfectDrawEnabled={false}
             shadowColor={isPendingConfirm ? "#f59e0b" : "black"}
             shadowBlur={isPendingConfirm ? 20 : 10}
             shadowOpacity={0.5}
             shadowOffset={{x: 0, y: 10}}
          />

          {/* 2.5 CRATERS (Level 1 Damage) */}
          {isFragile && craters.map((c, i) => (
              <Circle
                key={`crater-${i}`}
                x={c.x}
                y={c.y}
                radius={c.r}
                fill="rgba(0,0,0,0.4)" // Dark pockmark
                shadowColor="white"
                shadowBlur={0}
                shadowOffset={{x: 0, y: 1}} 
                shadowOpacity={0.1}
                opacity={c.opacity}
                scaleY={0.6}
                perfectDrawEnabled={false}
              />
          ))}
          
           {/* LOCK ICON */}
           {isLocked && (
            <Group x={0} y={offsetY - 5} opacity={0.9} listening={false}>
              <Path
                data={LOCK_PATH}
                x={-12}
                y={-12}
                scaleX={1.2}
                scaleY={1.2}
                fill="white"
                shadowColor="black"
                shadowBlur={5}
                perfectDrawEnabled={false}
              />
            </Group>
          )}
      </Group>

      {/* DYNAMIC ELEMENTS (UNCACHED, FLOATING) */}

      {/* 3. SELECTION */}
      {isSelected && (
          <Path
            ref={selectionRef}
            data={selectionPathData}
            stroke="#22d3ee"
            strokeWidth={1.5}
            fillEnabled={false}
            perfectDrawEnabled={false}
            shadowColor="#22d3ee"
            shadowBlur={5}
            shadowOpacity={1}
            listening={false}
          />
      )}

      {/* 3.5 TUTORIAL HIGHLIGHT */}
      {isTutorialTarget && (
          <Path
            ref={tutorialHighlightRef}
            data={selectionPathData}
            stroke={tutorialColorHex}
            strokeWidth={3}
            fillEnabled={false}
            perfectDrawEnabled={false}
            shadowColor={tutorialColorHex}
            shadowBlur={10}
            shadowOpacity={0.8}
            listening={false}
          />
      )}

      {/* 4. CONFIRMATION OVERLAY */}
      {isPendingConfirm && (
        <Group ref={confirmRef} y={offsetY - 35} listening={false}>
            {/* Coin Body */}
            <Circle 
                radius={16}
                fill="#fbbf24"
                stroke="#92400e"
                strokeWidth={3}
                shadowColor="black"
                shadowBlur={8}
                shadowOpacity={0.6}
                shadowOffset={{ x: 0, y: 3 }}
                perfectDrawEnabled={false}
            />
            
            {/* Simple Reflection Highlight (White Arc) */}
             <Path 
                data="M -8 -9 Q 0 -13 8 -9"
                stroke="white"
                strokeWidth={2}
                opacity={0.6}
                lineCap="round"
                perfectDrawEnabled={false}
            />

            {/* Cost Number */}
            <Text 
                text={`${pendingCost}`}
                y={-6}
                fontSize={13}
                fontStyle="bold"
                fontFamily="monospace"
                fill="#78350f" 
                align="center"
                width={32}
                offsetX={16}
                shadowColor="white"
                shadowBlur={0}
                shadowOffset={{ x: 0, y: 1 }}
                shadowOpacity={0.5}
            />

            {/* Confirmation Label */}
             <Text 
                text="CONFIRM"
                y={22}
                fontSize={9}
                fontStyle="bold"
                fill="#f59e0b"
                align="center"
                width={80}
                offsetX={40}
                shadowColor="black"
                shadowBlur={4}
                shadowOpacity={1}
            />
        </Group>
      )}

      {/* 5. PROGRESS BAR */}
      {isGrowing && (
        <Group x={0} y={offsetY - 15} listening={false}>
          <Shape
            ref={progressShapeRef}
            visualProgress={progressPercent}
            sceneFunc={(ctx, shape) => {
                const p = shape.getAttr('visualProgress') || 0;
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.lineTo(15, 0);
                ctx.strokeStyle = "rgba(0,0,0,0.8)";
                ctx.lineWidth = 6;
                ctx.lineCap = "round";
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(-15, 0);
                ctx.lineTo(-15 + (30 * p), 0);
                ctx.strokeStyle = isLocked ? "#f59e0b" : "#10b981";
                ctx.lineWidth = 4;
                ctx.lineCap = "round";
                ctx.stroke();
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
    if (prev.tutorialHighlightColor !== next.tutorialHighlightColor) return false;
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
}

const SmartHexagon: React.FC<SmartHexagonProps> = React.memo((props) => {
  const hex = useGameStore(state => state.session?.grid[props.id]);
  if (!hex) return null;
  return <HexagonVisual hex={hex} {...props} />;
});

export default SmartHexagon;
