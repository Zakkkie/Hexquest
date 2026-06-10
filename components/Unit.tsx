
import React, { useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { Group, Ellipse, Image as KonvaImage, Path } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { hexToPixel } from '../services/hexUtils.ts';
import { EntityType } from '../types.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { resourceService } from '../services/resourceService.ts';
import { wallUpdaterRegistry } from '../services/wallUpdater.ts';

interface UnitProps {
  id?: string;
  q: number;
  r: number;
  x?: number;
  y?: number;
  type: EntityType;
  color?: string; 
  hexLevel: number;
  totalCoinsEarned: number;
  upgradePointCount: number;
  headIndex?: number;
  bodyIndex?: number;
  onMoveComplete?: (x: number, y: number, color: string) => void;
  opacity?: number;
  evacuationActive?: boolean;
}

const getHexVisualHeight = (level: number) => {
    if (level <= -99) return 0;
    if (level >= 0) return -(10 + level * 10);
    return (Math.abs(level) - 1) * 10;
};

// Helper for lerp
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

const Unit: React.FC<UnitProps> = React.memo(({ q, r, type, color, hexLevel, headIndex = 0, bodyIndex = 0, onMoveComplete, opacity = 1, evacuationActive }) => {
  const groupRef = useRef<Konva.Group>(null);
  const visualGroupRef = useRef<Konva.Group>(null);
  const shadowRef = useRef<Konva.Ellipse>(null);
  const isFirstRender = useRef(true);
  const entropyArrowRef = useRef<Konva.Path>(null);
  
  // Ref to track rotation inside the animation loop (for active movement)
  const latestRotation = useRef(wallUpdaterRegistry.latestRot);

  const user = useGameStore(state => state.user);
  const session = useGameStore(state => state.session);
  
  // Resolve Appearance
  const isPlayer = type === EntityType.PLAYER;

  // Decide if we should show the entropy-low arrow over the player unit
  const shouldShowEntropyArrow = useMemo(() => {
      if (!isPlayer || !session) return false;
      const currentEntropy = session.entropy?.current ?? 100;
      if (currentEntropy >= 50) return false;

      // Check if there are any MONUMENT or MINI_MONUMENT hexes in the grid
      const gridValues = Object.values(session.grid);
      const hasMonuments = gridValues.some(hex => hex.structureType === 'MONUMENT' || hex.structureType === 'MINI_MONUMENT');
      if (!hasMonuments) return false;

      // "hasn't found yet" means not a single monument/mini-monument hex is revealed
      const isAnyRevealed = gridValues.some(hex => 
          (hex.structureType === 'MONUMENT' || hex.structureType === 'MINI_MONUMENT') && hex.revealed
      );

      return !isAnyRevealed;
  }, [isPlayer, session]);

  // Rotate and hover the entropy circular arrow
  useEffect(() => {
      if (!shouldShowEntropyArrow) return;

      const node = entropyArrowRef.current;
      if (!node) return;

      const anim = new Konva.Animation((frame) => {
          if (!node) return;
          const time = frame?.time ?? 0;
          // Rotate slowly: 45 degrees per second
          const angle = (time / 1000) * 45;
          node.rotation(angle);
          
          // Hover gently: float up and down by 2.5px with sine wave
          const hover = Math.sin(time / 200) * 2.5;
          node.y(hover);
      }, node.getLayer());

      anim.start();
      return () => {
          anim.stop();
      };
  }, [shouldShowEntropyArrow]);

  const finalColor = color || (isPlayer ? (user?.avatarColor || '#3b82f6') : '#ef4444');
  const finalHead = isPlayer ? (user?.headIndex ?? headIndex) : headIndex;
  const finalBody = isPlayer ? (user?.bodyIndex ?? bodyIndex) : bodyIndex;

  // Get Cached Sprite
  const spriteImage = useMemo(() => {
      return resourceService.getUnitImage(finalHead, finalBody, finalColor, type);
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
      targetLevel: hexLevel,
      facingLeft: false
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
          const { x, y } = hexToPixel(q, r, latestRotation.current);
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
  }, [q, r, hexLevel]);

  // --- GLOBAL WALL UPDATER ---
  useEffect(() => {
      const HEX_SIZE = GAME_CONFIG.HEX_SIZE || 35;
      const rawX = HEX_SIZE * (Math.sqrt(3) * q + Math.sqrt(3)/2 * r);
      const rawY = HEX_SIZE * 1.5 * r;

      const updater = (cos: number, sin: number, rot: number) => {
          latestRotation.current = rot;
          const gr = groupRef.current;
          if (!gr || animState.current.isMoving) return;
          
          const isPendingUpdate = 
              q !== animState.current.targetQ || 
              r !== animState.current.targetR || 
              hexLevel !== animState.current.targetLevel;
              
          if (!isPendingUpdate) {
              gr.x(rawX * cos - rawY * sin);
              gr.y((rawX * sin + rawY * cos) * 0.8);
          }
      };
      wallUpdaterRegistry.add(updater);
      return () => wallUpdaterRegistry.remove(updater);
  }, [q, r, hexLevel]);

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
              targetLevel: hexLevel,
              facingLeft: false
          };
          isFirstRender.current = false;
      }

      // Detect Movement Instruction
      const hasPosChanged = q !== animState.current.targetQ || r !== animState.current.targetR;
      const hasLevelChanged = hexLevel !== animState.current.targetLevel;
      
      let shouldStartAnim = false;
      const DURATION = GAME_CONFIG.MOVEMENT_ANIMATION_DURATION * 1000;

      if (hasPosChanged) {
          // If we were already moving, start the new animation from where we are NOW
          // to prevent "teleporting" to the previous target.
          if (animState.current.isMoving) {
              const now = Date.now();
              const elapsed = now - animState.current.startTime;
              const progress = Math.min(1, elapsed / DURATION);
              // Use the same easing as in the animation loop
              const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
              
              animState.current.startQ = lerp(animState.current.startQ, animState.current.targetQ, ease);
              animState.current.startR = lerp(animState.current.startR, animState.current.targetR, ease);
              animState.current.startLevel = lerp(animState.current.startLevel, animState.current.targetLevel, ease);
          } else {
              animState.current.startQ = animState.current.targetQ;
              animState.current.startR = animState.current.targetR;
              animState.current.startLevel = animState.current.targetLevel;
          }
          
          animState.current.targetQ = q;
          animState.current.targetR = r;
          animState.current.targetLevel = hexLevel;
          
          // Determine facing direction based on screen X
          const startPix = hexToPixel(animState.current.startQ, animState.current.startR, latestRotation.current);
          const targetPix = hexToPixel(q, r, latestRotation.current);
          if (Math.abs(targetPix.x - startPix.x) > 1) {
              animState.current.facingLeft = targetPix.x < startPix.x;
          }

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

      const anim = new Konva.Animation((_frame) => {
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
          
          // Easing for horizontal movement: Quadratic ease-in-out
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
          let scaleX = state.facingLeft ? -1 : 1;
          let scaleY = 1;

          if (isLateralMove) {
              const jumpPeak = 80; // Increased for "clearer" jump
              // Use a slightly different curve for the arc to make it feel more "snappy"
              // Standard parabola is 4 * p * (1-p). 
              // We can use a power function to make it stay in air longer or pop faster.
              const arc = Math.sin(progress * Math.PI); 
              jumpY = -arc * jumpPeak;

              // Squash and Stretch
              if (progress < 0.15) {
                  // Takeoff squash
                  const p = progress / 0.15;
                  const squash = 0.2 * Math.sin(p * Math.PI);
                  scaleY = 1 - squash;
                  scaleX = (state.facingLeft ? -1 : 1) * (1 + squash * 0.5);
              } else if (progress < 0.85) {
                  // Mid-air stretch
                  const p = (progress - 0.15) / 0.7;
                  const stretch = 0.15 * Math.sin(p * Math.PI);
                  scaleY = 1 + stretch;
                  scaleX = (state.facingLeft ? -1 : 1) * (1 - stretch * 0.4);
              } else {
                  // Landing squash
                  const p = (progress - 0.85) / 0.15;
                  const squash = 0.25 * Math.sin(p * Math.PI);
                  scaleY = 1 - squash;
                  scaleX = (state.facingLeft ? -1 : 1) * (1 + squash * 0.6);
              }
          } else {
              // Elevator movement - no flip logic needed but keep current facing
              scaleX = state.facingLeft ? -1 : 1;
          }
          
          visualNode.y(curGroundZ + jumpY);
          visualNode.scale({ x: scaleX, y: scaleY });

          // 3. Shadow Logic
          if (shadowNode && isLateralMove) {
              shadowNode.y(-jumpY); 
              const arc = Math.sin(progress * Math.PI);
              const shadowScale = (1 - (arc * 0.5)) / Math.abs(scaleX);
              shadowNode.scaleX(shadowScale);
              shadowNode.scaleY(shadowScale);
              shadowNode.opacity(0.4 - (arc * 0.25));
          }

          // End Check
          if (progress >= 1) {
              state.isMoving = false;
              anim.stop(); // Stop loop immediately
              
              // Snap to final exact position
              groupNode.position({ x: targetPix.x, y: targetPix.y });
              visualNode.y(targetZ);
              visualNode.scale({ x: state.facingLeft ? -1 : 1, y: 1 });
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

  useEffect(() => {
    if (evacuationActive) {
        if (!visualGroupRef.current) return;
        
        // 1. Create Beam
        const beam = new Konva.Rect({
            width: 20,
            height: 1000,
            x: -10,
            y: -1000,
            fillLinearGradientStartPoint: { x: 0, y: 0 },
            fillLinearGradientEndPoint: { x: 0, y: 1000 },
            fillLinearGradientColorStops: [0, 'rgba(255,255,255,0.8)', 1, 'rgba(255,255,255,0)'],
            opacity: 0,
        });
        visualGroupRef.current.add(beam);
        
        // 2. Twin Beam In
        const bTween = new Konva.Tween({
            node: beam,
            opacity: 1,
            duration: 0.5,
        });
        bTween.play();

        // 3. Move Unit
        const t = new Konva.Tween({
            node: visualGroupRef.current,
            y: -1000,
            opacity: 0,
            duration: 3,
            easing: Konva.Easings.EaseIn,
        });
        t.play();
        
        return () => {
            t.destroy();
            bTween.destroy();
            beam.destroy();
        };
    }
  }, [evacuationActive]);

  return (
    <Group opacity={opacity} perfectDrawEnabled={false} listening={false}>
      <Group ref={groupRef} listening={false} perfectDrawEnabled={false}>
        <Group ref={visualGroupRef} perfectDrawEnabled={false}>
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

            {shouldShowEntropyArrow && (
                <Group y={-60}>
                    {/* Glowing outer drop shadow/glowing outline */}
                    <Path 
                        data="M10 0 A 10 10 0 1 1 -5 -8.66 L -5 -12 L -11 -7 L -5 -2 L -5 -5.34 A 7 7 0 1 0 7 0 A 7 7 0 0 0 -5.3 4.5 L -7.3 6 A 10 10 0 0 1 10 0 Z"
                        fill="#fca5a5"
                        opacity={0.3}
                        scaleX={1.25}
                        scaleY={1.25}
                        offsetX={0.5}
                        offsetY={0.5}
                        perfectDrawEnabled={false}
                    />
                    {/* Glowing main arrow */}
                    <Path 
                        ref={entropyArrowRef}
                        data="M10 0 A 10 10 0 1 1 -5 -8.66 L -5 -12 L -11 -7 L -5 -2 L -5 -5.34 A 7 7 0 1 0 7 0 A 7 7 0 0 0 -5.3 4.5 L -7.3 6 A 10 10 0 0 1 10 0 Z"
                        fill="#ef4444"
                        stroke="#fca5a5"
                        strokeWidth={0.5}
                        shadowColor="#ef4444"
                        shadowBlur={6}
                        shadowOpacity={0.8}
                        perfectDrawEnabled={false}
                    />
                </Group>
            )}
        </Group>
      </Group>
    </Group>
  );
});

export default Unit;
