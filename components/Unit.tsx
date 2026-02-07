
import React, { useRef, useLayoutEffect, useMemo } from 'react';
import { Group, Ellipse, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { hexToPixel } from '../services/hexUtils.ts';
import { EntityType } from '../types.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { unitRenderer } from '../services/unitRenderer.ts';

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
  headIndex?: number;
  bodyIndex?: number;
  onMoveComplete?: (x: number, y: number, color: string) => void;
}

const getHexVisualHeight = (level: number) => {
    if (level <= -99) return 0;
    if (level >= 0) return -(10 + level * 10);
    return (Math.abs(level) - 1) * 10;
};

const Unit: React.FC<UnitProps> = React.memo(({ q, r, type, color, rotation, hexLevel, headIndex = 0, bodyIndex = 0, onMoveComplete }) => {
  const groupRef = useRef<Konva.Group>(null);
  const visualGroupRef = useRef<Konva.Group>(null);
  const shadowRef = useRef<Konva.Ellipse>(null);
  const isFirstRender = useRef(true);
  
  const user = useGameStore(state => state.user);
  
  // Calculate destination (target) logic coordinates
  const targetPos = useMemo(() => hexToPixel(q, r, rotation), [q, r, rotation]);
  const targetZ = getHexVisualHeight(hexLevel);

  // Store previous logical state to calculate deltas accurately
  const prevLogic = useRef({ q, r, rotation, zOffset: targetZ });
  const isPlayer = type === EntityType.PLAYER;
  
  // Resolve Appearance
  const finalColor = color || (isPlayer ? (user?.avatarColor || '#3b82f6') : '#ef4444');
  const finalHead = isPlayer ? (user?.headIndex ?? headIndex) : headIndex;
  const finalBody = isPlayer ? (user?.bodyIndex ?? bodyIndex) : bodyIndex;

  // Get Cached Sprite
  const spriteImage = useMemo(() => {
      return unitRenderer.getUnitImage(finalHead, finalBody, finalColor, type);
  }, [finalHead, finalBody, finalColor, type]);

  // Movement & Jump Logic
  useLayoutEffect(() => {
    const groupNode = groupRef.current;
    const visualNode = visualGroupRef.current;
    const shadowNode = shadowRef.current;

    if (!groupNode || !visualNode) return;

    // --- INITIALIZATION ---
    if (isFirstRender.current) {
        groupNode.position({ x: targetPos.x, y: targetPos.y });
        visualNode.y(targetZ);
        isFirstRender.current = false;
        prevLogic.current = { q, r, rotation, zOffset: targetZ };
        return;
    }

    const prev = prevLogic.current;
    const isMove = prev.q !== q || prev.r !== r;
    const isLevelChange = prev.zOffset !== targetZ;
    
    // Update ref for next render *before* starting async animations
    prevLogic.current = { q, r, rotation, zOffset: targetZ };

    let activeTween: Konva.Tween | null = null;
    let activeJumpAnim: Konva.Animation | null = null;
    let activeLevelTween: Konva.Tween | null = null;

    if (isMove) {
        // --- MOVEMENT (JUMP) ANIMATION ---
        
        // 1. Move X/Y (Tween from CURRENT node position to TARGET)
        activeTween = new Konva.Tween({
            node: groupNode,
            x: targetPos.x, 
            y: targetPos.y, 
            duration: GAME_CONFIG.MOVEMENT_ANIMATION_DURATION, 
            easing: Konva.Easings.EaseInOut,
            onFinish: () => {
                if (onMoveComplete) onMoveComplete(targetPos.x, targetPos.y, finalColor);
            }
        });
        activeTween.play();

        // 2. Elevation (Jump Arc)
        const startGroundZ = prev.zOffset; 
        const endGroundZ = targetZ;
        
        const duration = GAME_CONFIG.MOVEMENT_ANIMATION_DURATION * 1000;
        const startTime = Date.now();
        const jumpPeak = 60; // Jump height

        activeJumpAnim = new Konva.Animation((frame) => {
            if (!frame) return;
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            if (!visualNode.getLayer()) {
                activeJumpAnim?.stop();
                return;
            }

            // Interpolate Ground Height (Where the feet would be if walking)
            const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
            const currentGroundZ = startGroundZ + (endGroundZ - startGroundZ) * ease;

            // Calculate Jump Arc (Parabola)
            const arc = 4 * progress * (1 - progress); 
            const jumpY = -arc * jumpPeak;

            // Apply absolute position
            visualNode.y(currentGroundZ + jumpY);

            // Shadow logic (Stay on ground)
            if (shadowNode) {
                shadowNode.y(-jumpY); 
                const shadowScale = 1 - (arc * 0.4);
                shadowNode.scaleX(shadowScale);
                shadowNode.scaleY(shadowScale);
                shadowNode.opacity(0.4 - (arc * 0.2));
            }

            if (progress >= 1) {
                activeJumpAnim?.stop();
                visualNode.y(endGroundZ);
                if(shadowNode) {
                    shadowNode.y(0);
                    shadowNode.scale({x:1, y:1});
                    shadowNode.opacity(0.4);
                }
            }
        }, visualNode.getLayer());

        activeJumpAnim.start();

    } else {
        // --- STATIC STATE / ROTATION / ELEVATION CHANGE ---
        
        // Immediate Update for X/Y (e.g. Camera Rotation or Correction)
        // Since rotation animates smoothly frame-by-frame in parent, instant update here appears smooth.
        groupNode.position({ x: targetPos.x, y: targetPos.y });
        
        // Handle Level Change (Growing/Shrinking Hex under unit)
        if (isLevelChange) {
             activeLevelTween = new Konva.Tween({
                 node: visualNode,
                 y: targetZ,
                 duration: 0.3,
                 easing: Konva.Easings.EaseInOut
             });
             activeLevelTween.play();
        } else {
             // Snap to ensure exact position if no animation needed
             // Only if not currently animating (could check tween existence, but safe to snap if static)
             if (!activeLevelTween) visualNode.y(targetZ);
        }
        
        // Reset Shadow if needed
        if (shadowNode) {
            shadowNode.y(0);
            shadowNode.scale({x:1, y:1});
            shadowNode.opacity(0.4);
        }
    }

    return () => {
        if (activeTween) activeTween.destroy();
        if (activeLevelTween) activeLevelTween.destroy();
        if (activeJumpAnim) activeJumpAnim.stop();
    };

  }, [q, r, rotation, targetZ, targetPos.x, targetPos.y, finalColor, onMoveComplete]);

  return (
    <Group>
      {/* 
         CRITICAL: Do NOT pass x={targetPos.x} y={targetPos.y} here.
         Let the ref and imperative Konva calls handle positioning to avoid 
         React reconciling styles before animations start (causing teleportation).
      */}
      <Group ref={groupRef} listening={false}>
        <Group ref={visualGroupRef}>
            {/* Shadow */}
            <Ellipse 
                ref={shadowRef} 
                x={0} 
                y={0} 
                radiusX={10} 
                radiusY={6} 
                fill="rgba(0,0,0,0.4)" 
                shadowEnabled={false} 
            />
            
            {/* Player Indicator Ring */}
            {isPlayer && (
                <Ellipse 
                    y={0} 
                    radiusX={16} 
                    radiusY={10} 
                    stroke="white" 
                    strokeWidth={1} 
                    opacity={0.6} 
                    dash={[4, 4]} 
                    shadowEnabled={false} 
                />
            )}

            {/* The Cached Sprite */}
            <KonvaImage 
                image={spriteImage} 
                width={64} 
                height={64} 
                offsetX={32} // Center X
                offsetY={48} // Pivot near feet (match UnitRenderer logic)
            />
        </Group>
      </Group>
    </Group>
  );
});

export default Unit;
