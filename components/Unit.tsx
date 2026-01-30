
import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { Group, Circle, Ellipse, Rect, Text, Shape } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { hexToPixel } from '../services/hexUtils.ts';
import { EntityType } from '../types.ts';
import { GAME_CONFIG } from '../rules/config.ts';

interface UnitProps {
  id?: string;
  q: number;
  r: number;
  type: EntityType;
  color?: string; 
  rotation: number;
  hexLevel: number;
  totalCoinsEarned: number;
  upgradePointCount: number; // New Prop for Cycle Points
  onMoveComplete?: (x: number, y: number, color: string) => void;
}

// --- TRAIL (GHOST) COMPONENT ---
const TrailShadow: React.FC<{ x: number; y: number; color: string }> = ({ x, y, color }) => {
    const ref = useRef<Konva.Group>(null);

    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;

        const tween = new Konva.Tween({
            node: node,
            opacity: 0,
            scaleX: 0.8, 
            scaleY: 0.8,
            duration: GAME_CONFIG.MOVEMENT_ANIMATION_DURATION,
            easing: Konva.Easings.EaseOut
        });
        tween.play();

        return () => tween.destroy();
    }, []);

    return (
        <Group ref={ref} x={x} y={y} opacity={0.4} listening={false}>
             <Rect
                x={-6} y={-10} 
                width={12} height={20}
                fill={color}
                cornerRadius={4}
                offsetY={8} 
            />
        </Group>
    );
};

const CoinPopup: React.FC<{ amount: number; y: number }> = ({ amount, y }) => {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;

    node.opacity(0);
    node.scale({ x: 0.5, y: 0.5 });
    node.y(y);

    const tween = new Konva.Tween({
      node: node,
      y: y - 50,
      opacity: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1.2,
      easing: Konva.Easings.EaseOut,
    });

    node.to({ opacity: 1, scaleX: 1, scaleY: 1, duration: 0.2 });
    tween.play();

    return () => tween.destroy();
  }, [y]);

  return (
    <Group ref={groupRef} listening={false}>
      {/* Outer Coin */}
      <Circle radius={9} fill="#fbbf24" stroke="#b45309" strokeWidth={1.5} shadowColor="black" shadowBlur={2} shadowOpacity={0.3} />
      {/* Inner Rim */}
      <Circle radius={6} stroke="#fcd34d" strokeWidth={1} /> 
      {/* Symbol */}
      <Text text="$" fontSize={10} fontStyle="bold" fill="#78350f" x={-3.5} y={-5} />
      
      {/* Amount Label */}
      <Text
        text={`+${amount}`}
        x={12} y={-6}
        fontSize={14} fontFamily="monospace" fontStyle="bold" fill="#fbbf24"
        shadowColor="black" shadowBlur={2} shadowOpacity={0.8} shadowOffset={{x: 1, y: 1}}
      />
    </Group>
  );
};

const PointPopup: React.FC<{ y: number }> = ({ y }) => {
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;

    node.opacity(0);
    node.scale({ x: 0.5, y: 0.5 });
    node.y(y);
    node.x(35); // Offset further to right to avoid overlap with coin

    const tween = new Konva.Tween({
      node: node,
      y: y - 50,
      opacity: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1.2,
      easing: Konva.Easings.EaseOut,
    });

    node.to({ opacity: 1, scaleX: 1, scaleY: 1, duration: 0.2 });
    tween.play();

    return () => tween.destroy();
  }, [y]);

  return (
    <Group ref={groupRef} listening={false}>
      {/* Greenish Parallelogram */}
      <Shape
        sceneFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.moveTo(3, -6);  // Top Left
          ctx.lineTo(13, -6); // Top Right
          ctx.lineTo(10, 6);  // Bottom Right
          ctx.lineTo(0, 6);   // Bottom Left
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        fill="#4ade80" // emerald-400
        stroke="#15803d" // emerald-700
        strokeWidth={1.5}
        shadowColor="black"
        shadowBlur={2}
        shadowOpacity={0.3}
      />
      
      {/* Label */}
      <Text
        text="+1"
        x={16} y={-6}
        fontSize={14} fontFamily="monospace" fontStyle="bold" fill="#4ade80"
        shadowColor="black" shadowBlur={2} shadowOpacity={0.8} shadowOffset={{x: 1, y: 1}}
      />
    </Group>
  );
};

const Unit: React.FC<UnitProps> = React.memo(({ q, r, type, color, rotation, hexLevel, totalCoinsEarned, upgradePointCount, onMoveComplete }) => {
  const groupRef = useRef<Konva.Group>(null);
  const elevationGroupRef = useRef<Konva.Group>(null);
  const bodyRef = useRef<Konva.Group>(null);
  const breathingGroupRef = useRef<Konva.Group>(null); // New ref for animation to avoid re-caching body

  const user = useGameStore(state => state.user);
  
  // Visual State
  const [coinPopups, setCoinPopups] = useState<{ id: number; amount: number }[]>([]);
  const [pointPopups, setPointPopups] = useState<{ id: number }[]>([]);
  const [trails, setTrails] = useState<{ id: number; x: number; y: number }[]>([]);
  
  const prevCoinsRef = useRef(totalCoinsEarned);
  const prevPointsRef = useRef(upgradePointCount);

  // Target Calc
  const { x, y } = hexToPixel(q, r, rotation);
  const hexHeight = 10 + (hexLevel * 6);
  const zOffset = -hexHeight;

  // Logic Tracking: Store previous logical state to detect changes
  const prevLogic = useRef({ q, r, rotation, zOffset });
  
  const isPlayer = type === EntityType.PLAYER;
  const finalColor = color || (isPlayer ? (user?.avatarColor || '#3b82f6') : '#ef4444');

  // Coins Logic
  useEffect(() => {
    const diff = totalCoinsEarned - prevCoinsRef.current;
    if (diff > 0) {
      const id = Date.now() + Math.random();
      setCoinPopups(prev => [...prev, { id, amount: diff }]);
      setTimeout(() => setCoinPopups(prev => prev.filter(p => p.id !== id)), 1200);
    }
    prevCoinsRef.current = totalCoinsEarned;
  }, [totalCoinsEarned]);

  // Upgrade Points Logic
  useEffect(() => {
    if (upgradePointCount > prevPointsRef.current) {
        const id = Date.now() + Math.random();
        setPointPopups(prev => [...prev, { id }]);
        setTimeout(() => setPointPopups(prev => prev.filter(p => p.id !== id)), 1200);
    }
    prevPointsRef.current = upgradePointCount;
  }, [upgradePointCount]);

  // IDLE ANIMATION
  useEffect(() => {
    // Animate the wrapper group, NOT the cached body
    const node = breathingGroupRef.current;
    if (!node) return;

    const anim = new Konva.Animation((frame) => {
        if (!frame) return;
        const scale = 1 + Math.sin(frame.time / 400) * 0.04;
        node.scale({ x: scale, y: scale });
    }, node.getLayer());

    anim.start();
    return () => {
        anim.stop();
    };
  }, []);

  // CACHING THE BODY
  useEffect(() => {
      const node = bodyRef.current;
      if (node) {
          node.cache({
              pixelRatio: 2,
              offset: 10
          });
      }
      return () => {
          if (node) node.clearCache();
      }
  }, [type, finalColor]);

  // INITIAL POSITION SETTER (Prevent animation on mount)
  useLayoutEffect(() => {
    if (groupRef.current) groupRef.current.position({ x, y });
    if (elevationGroupRef.current) elevationGroupRef.current.y(zOffset);
  }, []); // Run once on mount

  // MOVEMENT & INTERPOLATION LOGIC
  useLayoutEffect(() => {
    const node = groupRef.current;
    const elevationNode = elevationGroupRef.current;
    if (!node || !elevationNode) return;

    const prev = prevLogic.current;
    
    // Detect what type of change occurred
    const isMove = prev.q !== q || prev.r !== r;
    const isRotation = prev.rotation !== rotation;
    const isElevationChange = prev.zOffset !== zOffset;

    // Update Ref
    prevLogic.current = { q, r, rotation, zOffset };

    if (isMove) {
        // --- CASE 1: LOGICAL MOVE (Interpolate) ---
        const startX = node.x();
        const startY = node.y();
        const startZ = elevationNode.y();

        // Spawn Trail (Ghost)
        if (startX !== 0 || startY !== 0) {
             const tId = Date.now() + Math.random();
             setTrails(prevT => [...prevT, { id: tId, x: startX, y: startY + startZ }]);
             setTimeout(() => setTrails(prevT => prevT.filter(t => t.id !== tId)), 1000);
        }

        // Animate XY Position
        node.to({
            x,
            y,
            duration: GAME_CONFIG.MOVEMENT_ANIMATION_DURATION,
            easing: Konva.Easings.EaseInOut,
            onFinish: () => {
                 if (onMoveComplete) onMoveComplete(x, y + zOffset, finalColor);
            }
        });

        // Animate Elevation (Jump)
        elevationNode.to({
             y: zOffset,
             duration: GAME_CONFIG.MOVEMENT_ANIMATION_DURATION,
             easing: Konva.Easings.EaseInOut
        });

    } else if (isRotation) {
        // --- CASE 2: CAMERA ROTATION (Snap) ---
        // When rotating, the projected x/y changes instantly. We snap to avoid units "drifting" visually.
        node.position({ x, y });
    } else if (isElevationChange) {
        // --- CASE 3: GROWTH UNDER UNIT (Elevate) ---
        // Unit stays on same hex (q,r) but hex grows (zOffset changes).
        elevationNode.to({
            y: zOffset,
            duration: 0.6,
            easing: Konva.Easings.EaseInOut
        });
    }

  }, [q, r, rotation, zOffset, x, y, finalColor, onMoveComplete]);

  return (
    <Group>
      {trails.map(t => (
          <TrailShadow key={t.id} x={t.x} y={t.y} color={finalColor} />
      ))}

      <Group ref={groupRef} listening={false}>
        <Group ref={elevationGroupRef}>
            {/* Shadow under unit (NOT Cached) */}
            <Ellipse x={0} y={0} radiusX={10} radiusY={6} fill="rgba(0,0,0,0.4)" blurRadius={2} />

            <Group ref={breathingGroupRef} y={-8}>
                {/* 
                    CACHED BODY 
                    We render the shapes once, then cache them as a bitmap.
                    Animation happens on the 'breathingGroupRef' wrapper above.
                */}
                <Group ref={bodyRef}>
                    {isPlayer ? (
                    <Group>
                        {/* Player: Humanoid/Pawn Shape - Round Head */}
                        <Rect x={-6} y={-10} width={12} height={20} fill={finalColor} cornerRadius={4} shadowColor="black" shadowBlur={5} shadowOpacity={0.3} />
                        <Circle y={-14} radius={8} fill={finalColor} stroke="rgba(255,255,255,0.4)" strokeWidth={2} />
                        <Circle y={-14} x={-2} radius={2} fill="white" opacity={0.5} />
                    </Group>
                    ) : (
                    <Group>
                        {/* Bot: Humanoid/Pawn Shape - Square Head (Robotic) */}
                        {/* Body (Same as Player) */}
                        <Rect x={-6} y={-10} width={12} height={20} fill={finalColor} cornerRadius={4} shadowColor="black" shadowBlur={5} shadowOpacity={0.3} />
                        
                        {/* Head (Square) */}
                        <Rect x={-7} y={-21} width={14} height={14} fill={finalColor} stroke="rgba(255,255,255,0.4)" strokeWidth={2} cornerRadius={3} />
                        
                        {/* Visor/Eye */}
                        <Rect x={-4} y={-16} width={8} height={4} fill="#0f172a" opacity={0.8} cornerRadius={1} />
                        <Rect x={-2} y={-15} width={4} height={2} fill="#ef4444" shadowColor="#ef4444" shadowBlur={4} />
                    </Group>
                    )}
                </Group>
            </Group>

            {isPlayer && (
              <Ellipse y={0} radiusX={16} radiusY={10} stroke="white" strokeWidth={1} opacity={0.6} dash={[4, 4]} />
            )}
            
            {/* Popups (Dynamic, NOT Cached) */}
            {coinPopups.map(p => (
              <CoinPopup key={p.id} amount={p.amount} y={-35} />
            ))}
            {pointPopups.map(p => (
              <PointPopup key={p.id} y={-35} />
            ))}
        </Group>
      </Group>
    </Group>
  );
});

export default Unit;
