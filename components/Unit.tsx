
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
  upgradePointCount: number;
  onMoveComplete?: (x: number, y: number, color: string) => void;
}

const TrailShadow: React.FC<{ x: number; y: number; color: string }> = ({ x, y, color }) => {
    const ref = useRef<Konva.Group>(null);
    useLayoutEffect(() => {
        const node = ref.current;
        if (!node) return;
        const tween = new Konva.Tween({
            node: node,
            opacity: 0,
            scaleX: 0.8, scaleY: 0.8,
            duration: GAME_CONFIG.MOVEMENT_ANIMATION_DURATION,
            easing: Konva.Easings.EaseOut
        });
        tween.play();
        return () => tween.destroy();
    }, []);
    return (
        <Group ref={ref} x={x} y={y} opacity={0.4} listening={false}>
             <Rect x={-6} y={-10} width={12} height={20} fill={color} cornerRadius={4} offsetY={8} shadowEnabled={false} />
        </Group>
    );
};

const Unit: React.FC<UnitProps> = React.memo(({ q, r, type, color, rotation, hexLevel, totalCoinsEarned, upgradePointCount, onMoveComplete }) => {
  const groupRef = useRef<Konva.Group>(null);
  const elevationGroupRef = useRef<Konva.Group>(null);
  const bodyRef = useRef<Konva.Group>(null);
  const breathingGroupRef = useRef<Konva.Group>(null);

  const user = useGameStore(state => state.user);
  const [coinPopups, setCoinPopups] = useState<{ id: number; amount: number }[]>([]);
  const [trails, setTrails] = useState<{ id: number; x: number; y: number }[]>([]);
  
  const { x, y } = hexToPixel(q, r, rotation);
  
  // Height Configuration (Must match Hexagon.tsx)
  const stepHeight = 10;
  const baseHeight = 10;
  
  // Calculate Z (Vertical) Offset
  // L >= 0: -(10 + level*10)
  // L < 0:  (abs(level) - 1)*10
  let zOffset = 0;
  if (hexLevel >= 0) {
      zOffset = -(baseHeight + hexLevel * stepHeight);
  } else {
      zOffset = (Math.abs(hexLevel) - 1) * stepHeight;
  }

  const prevLogic = useRef({ q, r, rotation, zOffset });
  const isPlayer = type === EntityType.PLAYER;
  const finalColor = color || (isPlayer ? (user?.avatarColor || '#3b82f6') : '#ef4444');

  useEffect(() => {
    const node = breathingGroupRef.current;
    if (!node) return;
    const anim = new Konva.Animation((frame) => {
        if (!frame) return;
        const scale = 1 + Math.sin(frame.time / 400) * 0.04;
        node.scale({ x: scale, y: scale });
    }, node.getLayer());
    anim.start();
    return () => { anim.stop(); };
  }, []);

  useLayoutEffect(() => {
    if (groupRef.current) groupRef.current.position({ x, y });
    if (elevationGroupRef.current) elevationGroupRef.current.y(zOffset);
  }, []);

  useLayoutEffect(() => {
    const node = groupRef.current;
    const elevationNode = elevationGroupRef.current;
    if (!node || !elevationNode) return;

    const prev = prevLogic.current;
    const isMove = prev.q !== q || prev.r !== r;
    const isRotation = prev.rotation !== rotation;
    const isElevationChange = prev.zOffset !== zOffset;

    prevLogic.current = { q, r, rotation, zOffset };

    if (isMove) {
        const startX = node.x();
        const startY = node.y();
        const startZ = elevationNode.y();
        if (startX !== 0 || startY !== 0) {
             const tId = Date.now() + Math.random();
             setTrails(prevT => [...prevT, { id: tId, x: startX, y: startY + startZ }]);
             setTimeout(() => setTrails(prevT => prevT.filter(t => t.id !== tId)), 1000);
        }
        node.to({ x, y, duration: GAME_CONFIG.MOVEMENT_ANIMATION_DURATION, easing: Konva.Easings.EaseInOut });
        elevationNode.to({ y: zOffset, duration: GAME_CONFIG.MOVEMENT_ANIMATION_DURATION, easing: Konva.Easings.EaseInOut });
    } else if (isRotation) {
        node.position({ x, y });
    } else if (isElevationChange) {
        elevationNode.to({ y: zOffset, duration: 0.6, easing: Konva.Easings.EaseInOut });
    }
  }, [q, r, rotation, zOffset, x, y]);

  return (
    <Group>
      {trails.map(t => (
          <TrailShadow key={t.id} x={t.x} y={t.y} color={finalColor} />
      ))}
      <Group ref={groupRef} listening={false}>
        <Group ref={elevationGroupRef}>
            <Ellipse x={0} y={0} radiusX={10} radiusY={6} fill="rgba(0,0,0,0.4)" shadowEnabled={false} />
            <Group ref={breathingGroupRef} y={-8}>
                <Group ref={bodyRef}>
                    <Rect x={-6} y={-10} width={12} height={20} fill={finalColor} cornerRadius={4} shadowEnabled={false} />
                    {isPlayer ? (
                        <Circle y={-14} radius={8} fill={finalColor} stroke="rgba(255,255,255,0.4)" strokeWidth={2} shadowEnabled={false} />
                    ) : (
                        <Rect x={-7} y={-21} width={14} height={14} fill={finalColor} stroke="rgba(255,255,255,0.4)" strokeWidth={2} cornerRadius={3} shadowEnabled={false} />
                    )}
                </Group>
            </Group>
            {isPlayer && <Ellipse y={0} radiusX={16} radiusY={10} stroke="white" strokeWidth={1} opacity={0.6} dash={[4, 4]} shadowEnabled={false} />}
        </Group>
      </Group>
    </Group>
  );
});

export default Unit;
