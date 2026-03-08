
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
  x?: number;
  y?: number;
  type: EntityType;
  color?: string; 
  rotation: number;
  hexLevel: number;
  totalCoinsEarned: number;
  upgradePointCount: number;
  headIndex?: number;
  bodyIndex?: number;
  onMoveComplete?: (x: number, y: number, color: string) => void;
  opacity?: number;
}

const getHexVisualHeight = (level: number) => {
    if (level <= -99) return 0;
    if (level >= 0) return -(10 + level * 10);
    return (Math.abs(level) - 1) * 10;
};

// Helper for lerp
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Unit: React.FC<UnitProps> = React.memo(({ q, r, type, color, rotation, hexLevel, headIndex = 0, bodyIndex = 0, onMoveComplete, opacity = 1 }) => {
  const groupRef = useRef<Konva.Group>(null);
  const visualGroupRef = useRef<Konva.Group>(null);
  const shadowRef = useRef<Konva.Ellipse>(null);
  const isFirstRender = useRef(true);
  
  // Ref to track rotation inside the animation loop (for active movement)
  const latestRotation = useRef(rotation);
  useLayoutEffect(() => {
      latestRotation.current = rotation;
  });

  const user = useGameStore(state => state.user);
  
  // Resolve Appearance
  const isPlayer = type === EntityType.PLAYER;
  const finalColor = color || (isPlayer ? (user?.avatarColor || '#3b82f6') : '#ef4444');
  const finalHead = isPlayer ? (user?.headIndex ?? headIndex) : headIndex;
  const finalBody = isPlayer ? (user?.bodyIndex ?? bodyIndex) : bodyIndex;

  // Get Cached Sprite
  const spriteImage = useMemo(() => {
      return unitRenderer.getUnitImage(finalHead, finalBody, finalColor, type);
  }, [finalHead, finalBody, finalColor, type]);

  // Animation State Ref
  const animState = useRef({
      startQ: q,
      startR: r,
      startTime: 0,
      isMoving: false,
      startLevel: hexLevel,
      targetQ: q,
      targetR: r,
      targetLevel: hexLevel
  });

  // --- SYNC POSITIONING (ANTI-JITTER) ---
  // This effect ensures that when the camera rotates (rotation changes) OR coords change,
  // the unit SNAPS to the correct position immediately in the React commit phase.
  // This prevents the "lag" caused by waiting for the next animation frame.
  useLayoutEffect(() => {
      if (!groupRef.current || !visualGroupRef.current) return;
      
      // DETECT PENDING ANIMATION:
      // If the props (q, r, hexLevel) don't match the internal animation target,
      // it means a new command has arrived but the animation loop (Effect 2) hasn't processed it yet.
      // We must NOT snap to the new position in this case, otherwise the sprite will 
      // teleport to the destination for 1 frame before the tween starts.
      const isPendingUpdate = 
          q !== animState.current.targetQ || 
          r !== animState.current.targetR || 
          hexLevel !== animState.current.targetLevel;
      
      // Only force position if NOT moving AND NOT waiting for a move start.
      // If moving, the animation loop handles it.
      if (!animState.current.isMoving && !isPendingUpdate) {
          const { x, y } = hexToPixel(q, r, rotation);
          const z = getHexVisualHeight(hexLevel);
          
          groupRef.current.position({ x, y });
          visualGroupRef.current.y(z);
          
          // Reset shadow if needed (ensure it's visible after a jump)
          if (shadowRef.current) {
              shadowRef.current.y(0);
              shadowRef.current.scale({ x: 1, y: 1 });
              shadowRef.current.opacity(0.4);
          }
      }
  }, [q, r, hexLevel, rotation]);

  // --- MOVEMENT ANIMATION LOOP ---
  useLayoutEffect(() => {
      const groupNode = groupRef.current;
      const visualNode = visualGroupRef.current;
      const shadowNode = shadowRef.current;
      
      if (!groupNode || !visualNode) return;

      // Initialize State on Mount
      if (isFirstRender.current) {
          animState.current = {
              startQ: q,
              startR: r,
              startTime: 0,
              isMoving: false,
              startLevel: hexLevel,
              targetQ: q,
              targetR: r,
              targetLevel: hexLevel
          };
          isFirstRender.current = false;
      }

      // Detect Movement Instruction
      const hasPosChanged = q !== animState.current.targetQ || r !== animState.current.targetR;
      const hasLevelChanged = hexLevel !== animState.current.targetLevel;
      
      let shouldStartAnim = false;

      if (hasPosChanged) {
          // New Move Instruction
          animState.current.startQ = animState.current.targetQ;
          animState.current.startR = animState.current.targetR;
          animState.current.startLevel = animState.current.targetLevel;
          
          animState.current.targetQ = q;
          animState.current.targetR = r;
          animState.current.targetLevel = hexLevel;
          
          animState.current.startTime = Date.now();
          animState.current.isMoving = true;
          shouldStartAnim = true;
      } else if (hasLevelChanged) {
          // Level changed in place (elevator effect)
          if (!animState.current.isMoving) {
               animState.current.startLevel = animState.current.targetLevel;
               animState.current.startTime = Date.now();
               animState.current.isMoving = true;
               animState.current.startQ = q;
               animState.current.startR = r;
               shouldStartAnim = true;
          }
          animState.current.targetLevel = hexLevel;
      }

      const DURATION = GAME_CONFIG.MOVEMENT_ANIMATION_DURATION * 1000;

      const anim = new Konva.Animation((frame) => {
          if (!groupNode || !visualNode) return;

          // Optimization: If logic says we stopped, stop the loop to save CPU and prevent conflict
          if (!animState.current.isMoving) {
              anim.stop();
              return;
          }

          const now = Date.now();
          const state = animState.current;
          const currentRot = latestRotation.current; 

          const targetPix = hexToPixel(state.targetQ, state.targetR, currentRot);
          const targetZ = getHexVisualHeight(state.targetLevel);

          const elapsed = now - state.startTime;
          const progress = Math.min(1, elapsed / DURATION);
          
          // 1. Position Interpolation
          const startPix = hexToPixel(state.startQ, state.startR, currentRot);
          
          const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
          
          const curX = lerp(startPix.x, targetPix.x, ease);
          const curY = lerp(startPix.y, targetPix.y, ease);
          
          groupNode.position({ x: curX, y: curY });

          // 2. Height/Jump Interpolation
          const startZ = getHexVisualHeight(state.startLevel);
          const curGroundZ = lerp(startZ, targetZ, ease);
          
          // Jump Arc
          const isLateralMove = state.startQ !== state.targetQ || state.startR !== state.targetR;
          let jumpY = 0;
          if (isLateralMove) {
              const jumpPeak = 60;
              const arc = 4 * progress * (1 - progress); 
              jumpY = -arc * jumpPeak;
          }
          
          visualNode.y(curGroundZ + jumpY);

          // 3. Shadow Logic
          if (shadowNode && isLateralMove) {
              shadowNode.y(-jumpY); 
              const shadowScale = 1 - (4 * progress * (1 - progress) * 0.4);
              shadowNode.scaleX(shadowScale);
              shadowNode.scaleY(shadowScale);
              shadowNode.opacity(0.4 - (4 * progress * (1 - progress) * 0.2));
          }

          // End Check
          if (progress >= 1) {
              state.isMoving = false;
              anim.stop(); // Stop loop immediately
              
              // Snap to final exact position
              groupNode.position({ x: targetPix.x, y: targetPix.y });
              visualNode.y(targetZ);
              if (shadowNode) {
                  shadowNode.y(0);
                  shadowNode.scale({x:1, y:1});
                  shadowNode.opacity(0.4);
              }
              
              if (isLateralMove && onMoveComplete) {
                  onMoveComplete(targetPix.x, targetPix.y, finalColor);
              }
              
              // Update 'Start' to be 'Current' for next time
              state.startQ = state.targetQ;
              state.startR = state.targetR;
              state.startLevel = state.targetLevel;
          }

      }, groupNode.getLayer());

      if (shouldStartAnim) {
          anim.start();
      }

      return () => { anim.stop(); };

  }, [q, r, hexLevel, finalColor, onMoveComplete]); 

  return (
    <Group opacity={opacity}>
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
