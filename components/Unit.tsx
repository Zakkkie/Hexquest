
import React, { useRef, useLayoutEffect, useState, useEffect, useMemo } from 'react';
import { Group, Circle, Ellipse, Rect, Text } from 'react-konva';
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

const getHexVisualHeight = (level: number) => {
    if (level <= -99) return 0;
    if (level >= 0) return -(10 + level * 10);
    return (Math.abs(level) - 1) * 10;
};

const Unit: React.FC<UnitProps> = React.memo(({ q, r, type, color, rotation, hexLevel, totalCoinsEarned, upgradePointCount, onMoveComplete }) => {
  const groupRef = useRef<Konva.Group>(null);
  const visualGroupRef = useRef<Konva.Group>(null);
  const bodyRef = useRef<Konva.Group>(null);
  const shadowRef = useRef<Konva.Ellipse>(null);
  
  const user = useGameStore(state => state.user);
  
  // 1. INITIAL POSITION ONLY
  // We use useMemo to calculate the START position. We do NOT update this memo 
  // when q/r changes to prevent React from snapping the group to the new position 
  // before the tween can run.
  const initialPos = useMemo(() => hexToPixel(q, r, rotation), []); 

  // Calculate destination (target)
  const targetPos = hexToPixel(q, r, rotation);
  const targetZ = getHexVisualHeight(hexLevel);

  const prevLogic = useRef({ q, r, rotation, zOffset: targetZ });
  const isPlayer = type === EntityType.PLAYER;
  const finalColor = color || (isPlayer ? (user?.avatarColor || '#3b82f6') : '#ef4444');

  // Idle Animation
  useEffect(() => {
    const node = bodyRef.current;
    if (!node) return;
    const anim = new Konva.Animation((frame) => {
        if (!frame) return;
        const scale = 1 + Math.sin(frame.time / 400) * 0.03;
        node.scale({ x: scale, y: scale });
    }, node.getLayer());
    anim.start();
    return () => { anim.stop(); };
  }, []);

  // Movement & Jump Logic
  useLayoutEffect(() => {
    const groupNode = groupRef.current;
    const visualNode = visualGroupRef.current;
    const bodyNode = bodyRef.current;
    const shadowNode = shadowRef.current;

    if (!groupNode || !visualNode || !bodyNode) return;

    const prev = prevLogic.current;
    const isMove = prev.q !== q || prev.r !== r;
    const isRotation = prev.rotation !== rotation;
    const isElevationChange = prev.zOffset !== targetZ;

    prevLogic.current = { q, r, rotation, zOffset: targetZ };

    if (isMove) {
        // --- JUMP ANIMATION ---
        
        // 1. Move X/Y (Tween)
        // CRITICAL FIX: We tween the NODE directly. We do not rely on React props for X/Y updates after mount.
        groupNode.to({ 
            x: targetPos.x, 
            y: targetPos.y, 
            duration: GAME_CONFIG.MOVEMENT_ANIMATION_DURATION, 
            // Fix: Changed InOutSine (not a property on Konva.Easings) to EaseInOut
            easing: Konva.Easings.EaseInOut, // Smooth sine wave for movement
            onFinish: () => {
                if (onMoveComplete) onMoveComplete(targetPos.x, targetPos.y, finalColor);
            }
        });

        // 2. Elevation (Jump Arc)
        const startGroundZ = visualNode.y();
        const duration = GAME_CONFIG.MOVEMENT_ANIMATION_DURATION * 1000;
        const startTime = Date.now();
        const jumpPeak = 50; 

        const jumpAnim = new Konva.Animation((frame) => {
            if (!frame) return;
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            // Ground Height Interpolation
            const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            const currentGroundZ = startGroundZ + (targetZ - startGroundZ) * ease;

            // Jump Arc
            const arc = 4 * progress * (1 - progress);
            const jumpY = -arc * jumpPeak;

            visualNode.y(currentGroundZ);
            bodyNode.y(jumpY - 8);

            if (shadowNode) {
                const shadowScale = 1 - (arc * 0.5);
                const shadowOpacity = 0.4 - (arc * 0.3);
                shadowNode.scaleX(shadowScale);
                shadowNode.scaleY(shadowScale);
                shadowNode.opacity(shadowOpacity);
            }

            if (progress >= 1) {
                jumpAnim.stop();
                visualNode.y(targetZ);
                bodyNode.y(-8);
                if(shadowNode) {
                    shadowNode.scale({x:1, y:1});
                    shadowNode.opacity(0.4);
                }
            }
        }, visualNode.getLayer());

        jumpAnim.start();

    } else if (isRotation) {
        // Rotation: Instant Snap (Camera rotation changes coordinates instantly)
        groupNode.position({ x: targetPos.x, y: targetPos.y });
    } else if (isElevationChange) {
        // Smooth height adjust (Digging/Building under feet)
        visualNode.to({ y: targetZ, duration: 0.5, easing: Konva.Easings.EaseInOut });
    } else {
        // Initialization correction (Snap to correct pos if logic drifted)
        // Only run if we are significantly off to avoid fighting animation
        if (Math.abs(groupNode.x() - targetPos.x) > 1 || Math.abs(groupNode.y() - targetPos.y) > 1) {
             groupNode.position({ x: targetPos.x, y: targetPos.y });
        }
        visualNode.y(targetZ);
        bodyNode.y(-8);
    }
  }, [q, r, rotation, targetZ, targetPos.x, targetPos.y]);

  return (
    <Group>
      {/* 
         CRITICAL: We initialize x/y with initialPos. 
         We DO NOT pass dynamic x/y here from props. 
         This prevents React from "snapping" the unit to the destination before the Tween runs.
      */}
      <Group ref={groupRef} x={initialPos.x} y={initialPos.y} listening={false}>
        
        <Group ref={visualGroupRef} y={targetZ}>
            
            <Ellipse 
                ref={shadowRef}
                x={0} y={0} 
                radiusX={10} radiusY={6} 
                fill="rgba(0,0,0,0.4)" 
                shadowEnabled={false} 
            />
            
            <Group ref={bodyRef} y={-8}>
                <Rect x={-6} y={-10} width={12} height={20} fill={finalColor} cornerRadius={4} shadowEnabled={false} />
                {isPlayer ? (
                    <Circle y={-14} radius={8} fill={finalColor} stroke="rgba(255,255,255,0.4)" strokeWidth={2} shadowEnabled={false} />
                ) : (
                    <Rect x={-7} y={-21} width={14} height={14} fill={finalColor} stroke="rgba(255,255,255,0.4)" strokeWidth={2} cornerRadius={3} shadowEnabled={false} />
                )}
            </Group>

            {isPlayer && <Ellipse y={0} radiusX={16} radiusY={10} stroke="white" strokeWidth={1} opacity={0.6} dash={[4, 4]} shadowEnabled={false} />}
        </Group>
      </Group>
    </Group>
  );
});

export default Unit;
