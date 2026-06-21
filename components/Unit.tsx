
import React, { useRef, useLayoutEffect, useMemo, useEffect } from 'react';
import { Group, Ellipse, Image as KonvaImage, Path, Ring, Circle, Rect, Text, Line } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { hexToPixel, getSecondsToGrow } from '../services/hexUtils.ts';
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

const Unit: React.FC<UnitProps> = React.memo(({ id, q, r, type, color, hexLevel, headIndex = 0, bodyIndex = 0, onMoveComplete, opacity = 1, evacuationActive }) => {
  const groupRef = useRef<Konva.Group>(null);
  const visualGroupRef = useRef<Konva.Group>(null);
  const shadowRef = useRef<Konva.Ellipse>(null);
  const isFirstRender = useRef(true);
  const entropyArrowRef = useRef<Konva.Path>(null);
  
  // Refs for custom action animations
  const actionSymbolRef = useRef<Konva.Group>(null);
  const progressBadgeRef = useRef<Konva.Group>(null);
  const progressBarFillRef = useRef<Konva.Rect>(null);
  const groundRingGroupRef = useRef<Konva.Group>(null);
  const particlesGroupRef = useRef<Konva.Group>(null);

  const smoothProgress = useRef(0);

  interface VisualParticle {
    node: Konva.Circle;
    vx: number;
    vy: number;
    life: number;
    decay: number;
  }
  const activeParticles = useRef<VisualParticle[]>([]);
  
  // Ref to track rotation inside the animation loop (for active movement)
  const latestRotation = useRef(wallUpdaterRegistry.latestRot);

  const user = useGameStore(state => state.user);
  const session = useGameStore(state => state.session);
  const language = useGameStore(state => state.language);
  const isRu = language === 'RU';
  
  // Resolve Appearance
  const isPlayer = type === EntityType.PLAYER;

  // Session active action selectors for the player
  const currentHex = useMemo(() => {
    if (!isPlayer || !session || !session.grid) return null;
    return session.grid[`${q},${r}`];
  }, [isPlayer, session, q, r]);

  const isGrowing = useMemo(() => {
    return isPlayer && !!(session?.isPlayerGrowing);
  }, [isPlayer, session]);

  const growthIntent = session?.playerGrowthIntent; // 'DIG' | 'UPGRADE' | 'RECOVER'

  const targetPercent = useMemo(() => {
    if (!currentHex || !isGrowing) return 0;
    let currentStepNeeded = 30; // standard ticks, 1 tick = 1 step
    if (growthIntent === 'RECOVER') {
        currentStepNeeded = getSecondsToGrow(currentHex.maxLevel);
    } else if (growthIntent === 'DIG') {
        currentStepNeeded = 30;
    } else {
        currentStepNeeded = getSecondsToGrow(currentHex.currentLevel + 1);
    }
    return currentStepNeeded > 0 ? Math.min(1, currentHex.progress / currentStepNeeded) : 0;
  }, [currentHex, isGrowing, growthIntent]);

  const entity = useMemo(() => {
    if (!session) return null;
    if (isPlayer) return session.player;
    return id ? session.bots.find(b => b.id === id) : null;
  }, [session, isPlayer, id]);

  const queueLength = entity?.movementQueue?.length ?? 0;

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
  const animState = useRef<{
      startQ: number;
      startR: number;
      startTime: number;
      isMoving: boolean;
      startLevel: number;
      targetQ: number;
      targetR: number;
      targetLevel: number;
      facingLeft: boolean;
      currentQ?: number;
      currentR?: number;
      currentLevel?: number;
      moveMode?: 'SINGLE' | 'FIRST' | 'MIDDLE' | 'LAST';
      stepDuration?: number;
      wasAlreadyMovingWhenStarted?: boolean;
  }>({
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

      const queueLength = entity?.movementQueue?.length ?? 0;

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
              facingLeft: false,
              currentQ: q,
              currentR: r,
              currentLevel: hexLevel,
              moveMode: 'SINGLE',
              stepDuration: GAME_CONFIG.MOVEMENT_ANIMATION_DURATION * 1000,
              wasAlreadyMovingWhenStarted: false
          };
          isFirstRender.current = false;
      }

      // Detect Movement Instruction
      const hasPosChanged = q !== animState.current.targetQ || r !== animState.current.targetR;
      const hasLevelChanged = hexLevel !== animState.current.targetLevel;
      
      let shouldStartAnim = false;

      if (hasPosChanged) {
          const wasMoving = animState.current.isMoving;
          const hasNextStep = queueLength > 0;
          
          let mode: 'SINGLE' | 'FIRST' | 'MIDDLE' | 'LAST' = 'SINGLE';
          if (!wasMoving && hasNextStep) mode = 'FIRST';
          else if (wasMoving && hasNextStep) mode = 'MIDDLE';
          else if (wasMoving && !hasNextStep) mode = 'LAST';

          let stepDuration = GAME_CONFIG.MOVEMENT_ANIMATION_DURATION * 1000;
          if (mode === 'FIRST' || mode === 'MIDDLE') {
              stepDuration = Math.max(stepDuration, (GAME_CONFIG.MOVEMENT_LOGIC_INTERVAL_MS || 380));
              if (stepDuration === 380) {
                  stepDuration = 400; // Match physical batch tick interval exactly for flawless pacing
              }
          }
          
          animState.current.moveMode = mode;
          animState.current.stepDuration = stepDuration;
          animState.current.wasAlreadyMovingWhenStarted = wasMoving;

          if (wasMoving) {
              animState.current.startQ = animState.current.currentQ ?? animState.current.targetQ;
              animState.current.startR = animState.current.currentR ?? animState.current.targetR;
              animState.current.startLevel = animState.current.currentLevel ?? animState.current.targetLevel;
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
               animState.current.moveMode = 'SINGLE';
               animState.current.stepDuration = GAME_CONFIG.MOVEMENT_ANIMATION_DURATION * 1000;
               animState.current.wasAlreadyMovingWhenStarted = false;
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
          const duration = state.stepDuration ?? (GAME_CONFIG.MOVEMENT_ANIMATION_DURATION * 1000);
          const progress = Math.min(1, elapsed / duration);
          
          // 1. Position Interpolation
          const startPix = hexToPixel(state.startQ, state.startR, currentRot);
          
          // Select correct easing based on current move mode
          const m = state.moveMode || 'SINGLE';
          let ease = progress;
          if (m === 'MIDDLE') {
              ease = progress; // Pure linear constant velocity
          } else if (m === 'FIRST') {
              ease = progress * progress * (1.5 - 0.5 * progress); // Smooth acceleration, linear end
          } else if (m === 'LAST') {
              ease = 1.5 * progress - 0.5 * (progress * progress * progress); // Linear entry, smooth deceleration
          } else {
              // SINGLE: Standard Quadratic Ease-In-Ease-Out
              ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
          }
          
          const easeClamped = Math.max(0, Math.min(1, ease));
          
          const curX = lerp(startPix.x, targetPix.x, easeClamped);
          const curY = lerp(startPix.y, targetPix.y, easeClamped);
          
          // Capture current fractional coordinates for interpolation continuity
          state.currentQ = lerp(state.startQ, state.targetQ, easeClamped);
          state.currentR = lerp(state.startR, state.targetR, easeClamped);
          state.currentLevel = lerp(state.startLevel, state.targetLevel, easeClamped);

          groupNode.position({ x: curX, y: curY });

          // 2. Height/Jump Interpolation
          const startZ = getHexVisualHeight(state.startLevel);
          const curGroundZ = lerp(startZ, targetZ, easeClamped);
          
          // Jump Arc
          const isLateralMove = state.startQ !== state.targetQ || state.startR !== state.targetR;
          let jumpY = 0;
          let scaleX = state.facingLeft ? -1 : 1;
          let scaleY = 1;

          if (isLateralMove) {
              const jumpPeak = 80; // Increased for "clearer" jump
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
              state.currentQ = state.targetQ;
              state.currentR = state.targetR;
              state.currentLevel = state.targetLevel;
          }

      }, groupNode.getLayer());

      if (shouldStartAnim) {
          anim.start();
      }

      return () => { anim.stop(); };

  }, [q, r, hexLevel, finalColor, onMoveComplete, queueLength]); 

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

  // --- PRODUCTION GRADE QUALITY PROGRESSION HUD & PARTICLES SYSTEM ---
  useEffect(() => {
    const ptsGroup = particlesGroupRef.current;
    if (!isGrowing) {
        if (ptsGroup) {
            ptsGroup.destroyChildren();
        }
        activeParticles.current = [];
        return;
    }

    const nodeSymbol = actionSymbolRef.current;
    const grRing = groundRingGroupRef.current;
    
    const activeAnim = new Konva.Animation((frame) => {
        const time = frame?.time ?? 0;
        
        // 1. Particle Simulation Update
        const ptsNode = particlesGroupRef.current;
        if (ptsNode) {
            activeParticles.current = activeParticles.current.filter(p => {
                p.life -= p.decay;
                if (p.life <= 0) {
                    p.node.destroy();
                    return false;
                }
                
                // physics movement vectors
                p.node.x(p.node.x() + p.vx);
                p.node.y(p.node.y() + p.vy);
                
                if (growthIntent === 'DIG') {
                    p.vy += 0.22; // rapid gravity drop
                } else if (growthIntent === 'UPGRADE') {
                    p.vy *= 0.97; // rising friction
                } else {
                    p.vx += Math.sin(time / 140) * 0.18; // energy vortex swirl
                }
                
                p.node.opacity(Math.max(0, p.life));
                return true;
            });

            // Spark Spawning Routine
            const maxSparksCap = 25;
            const checkRate = growthIntent === 'DIG' ? 0.42 : 0.28;
            if (Math.random() < checkRate && activeParticles.current.length < maxSparksCap) {
                let pFill = '#f59e0b';
                let sDeltaX = 0;
                let sDeltaY = 0;
                let vx = (Math.random() - 0.5) * 2.2;
                let vy = (Math.random() - 0.5) * 2.2;
                let decayAngle = 0.02 + Math.random() * 0.035;
                let rDot = 1.3 + Math.random() * 2.2;

                if (growthIntent === 'DIG') {
                    pFill = '#ef4444'; // igneous core spark color
                    sDeltaX = (Math.random() - 0.5) * 12;
                    sDeltaY = 6;
                    vx = (Math.random() < 0.5 ? -1 : 1) * (1.2 + Math.random() * 3);
                    vy = -2 - Math.random() * 4.2;
                } else if (growthIntent === 'UPGRADE') {
                    pFill = '#10b981'; // building neon emerald spark
                    sDeltaX = (Math.random() - 0.5) * 24;
                    sDeltaY = 4;
                    vx = (Math.random() - 0.5) * 1.5;
                    vy = -1.2 - Math.random() * 2.4;
                } else {
                    pFill = '#3b82f6'; // fusion plasma core blue spark
                    sDeltaX = (Math.random() - 0.5) * 20;
                    sDeltaY = 2;
                    vx = (Math.random() - 0.5) * 1.8;
                    vy = -0.6 - Math.random() * 1.8;
                }

                const cSpark = new Konva.Circle({
                    x: sDeltaX,
                    y: sDeltaY,
                    radius: rDot,
                    fill: pFill,
                    opacity: 1,
                    perfectDrawEnabled: false,
                    listening: false,
                    shadowColor: pFill,
                    shadowBlur: 5,
                    shadowOpacity: 0.95
                });
                ptsNode.add(cSpark);
                activeParticles.current.push({
                    node: cSpark,
                    vx,
                    vy,
                    life: 1,
                    decay: decayAngle
                });
            }
        }

        // 2. Ground Circle Vector Ring rotation
        if (grRing) {
            const rotSpeed = growthIntent === 'RECOVER' ? 85 : growthIntent === 'DIG' ? 45 : 30;
            grRing.rotation((time / 1000) * rotSpeed);
        }

        // 3. Mini-tool mechanical oscillations
        if (nodeSymbol) {
            if (growthIntent === 'DIG') {
                const swing = Math.sin(time / 100) * 35;
                nodeSymbol.rotation(swing - 25);
            } else if (growthIntent === 'UPGRADE') {
                const swing = Math.sin(time / 80) * 18;
                nodeSymbol.rotation(swing - 12);
                const hammerScale = 1 + Math.sin(time / 80) * 0.15;
                nodeSymbol.scale({ x: hammerScale, y: hammerScale });
            } else if (growthIntent === 'RECOVER') {
                const rot = (time / 1000) * 240;
                nodeSymbol.rotation(rot);
            }
        }

        // 4. Smooth hovering for progress pill HUD
        const badgeNode = progressBadgeRef.current;
        if (badgeNode) {
            const blockHover = Math.sin(time / 200) * 3.2; // delicate float hover
            badgeNode.y(-48 + blockHover);
        }

        // 5. smooth linear progression interpolation
        smoothProgress.current = lerp(smoothProgress.current, targetPercent, 0.18);
        if (Math.abs(smoothProgress.current - targetPercent) < 0.003) {
            smoothProgress.current = targetPercent;
        }

        if (progressBarFillRef.current) {
            progressBarFillRef.current.width(36 * smoothProgress.current);
        }

    }, ptsGroup ? ptsGroup.getLayer() : undefined);

    activeAnim.start();
    return () => {
        activeAnim.stop();
        if (ptsGroup) {
            ptsGroup.destroyChildren();
        }
        activeParticles.current = [];
    };
  }, [isGrowing, growthIntent, targetPercent]);

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

            {/* Ground ring of rotating progress dots */}
            {isGrowing && (
                <Group ref={groundRingGroupRef} y={0} listening={false}>
                    {Array.from({ length: 12 }).map((_, i) => {
                        const theta = (2 * Math.PI * i) / 12;
                        const rX = 22;
                        const rY = 12;
                        const dX = Math.cos(theta) * rX;
                        const dY = Math.sin(theta) * rY;
                        const dotProgress = (i + 1) / 12;
                        const isActive = targetPercent >= dotProgress;
                        
                        let activeColor = '#f59e0b'; // Gold
                        if (growthIntent === 'DIG') activeColor = '#ef4444'; // Light red
                        else if (growthIntent === 'RECOVER') activeColor = '#60a5fa'; // Light blue
                        else if (growthIntent === 'UPGRADE') activeColor = '#34d399'; // Light green
                        
                        return (
                            <Circle
                                key={i}
                                x={dX}
                                y={dY}
                                radius={isActive ? 2.5 : 1}
                                fill={isActive ? activeColor : 'rgba(255,255,255,0.2)'}
                                shadowColor={isActive ? activeColor : undefined}
                                shadowBlur={isActive ? 5 : 0}
                                shadowOpacity={isActive ? 0.95 : 0}
                                listening={false}
                                perfectDrawEnabled={false}
                            />
                        );
                    })}
                </Group>
            )}

            {/* Custom Particles Emitter Group */}
            {isGrowing && (
                <Group ref={particlesGroupRef} y={0} listening={false} />
            )}

            {/* Floating Action Progression Badge & HUD Panel */}
            {isGrowing && (
                <Group ref={progressBadgeRef} x={0} y={-48} listening={false}>
                    {/* Dark capsule parent plate */}
                    <Rect
                        x={16}
                        y={-11}
                        width={52}
                        height={22}
                        cornerRadius={5}
                        fill="rgba(11, 19, 43, 0.92)"
                        stroke={growthIntent === 'DIG' ? '#ef4444' : growthIntent === 'UPGRADE' ? '#10b981' : '#3b82f6'}
                        strokeWidth={1}
                        shadowColor="rgba(0,0,0,0.5)"
                        shadowBlur={6}
                        shadowOpacity={0.8}
                        shadowOffset={{ x: 0, y: 3 }}
                    />

                    {/* Left Action icon badge */}
                    <Circle
                        x={16}
                        y={0}
                        radius={10}
                        fill="rgba(11, 19, 43, 0.96)"
                        stroke={growthIntent === 'DIG' ? '#ef4444' : growthIntent === 'UPGRADE' ? '#10b981' : '#3b82f6'}
                        strokeWidth={1}
                        shadowColor="rgba(0,0,0,0.4)"
                        shadowBlur={4}
                        shadowOpacity={0.7}
                    />

                    {/* Custom Animated Symbol inside Badge */}
                    <Group ref={actionSymbolRef} x={16} y={0}>
                        {growthIntent === 'DIG' && (
                            <Group>
                                {/* Shaft */}
                                <Line
                                    points={[0, 3, 0, -5]}
                                    stroke="#cbd5e1"
                                    strokeWidth={1.5}
                                />
                                {/* Pickaxe core head */}
                                <Path
                                    data="M -6 -4.5 Q 0 -6.5 6 -4.5 Q 0 -3.5 -6 -4.5"
                                    fill="#f8fafc"
                                    stroke="#475569"
                                    strokeWidth={0.5}
                                />
                            </Group>
                        )}
                        {growthIntent === 'UPGRADE' && (
                            <Group>
                                {/* Shaft */}
                                <Line
                                    points={[-2.5, 4, 1.5, -1]}
                                    stroke="#cbd5e1"
                                    strokeWidth={1.5}
                                />
                                {/* Hammer core head */}
                                <Rect
                                    x={-0.5}
                                    y={-5}
                                    width={7}
                                    height={4.5}
                                    cornerRadius={0.5}
                                    fill="#f59e0b"
                                    stroke="#78350f"
                                    strokeWidth={0.5}
                                    offsetX={3.5}
                                    offsetY={2.2}
                                />
                            </Group>
                        )}
                        {growthIntent === 'RECOVER' && (
                            <Group>
                                {/* Siphon cyclic dash ring */}
                                <Ring
                                    innerRadius={3.5}
                                    outerRadius={5.5}
                                    fill="#3b82f6"
                                />
                                {/* Little core pulse indicator */}
                                <Circle
                                    x={0}
                                    y={0}
                                    radius={1.5}
                                    fill="#93c5fd"
                                />
                            </Group>
                        )}
                    </Group>

                    {/* Mini HUD progress bar and title labels inside capsule */}
                    <Text
                        x={28}
                        y={-8}
                        text={growthIntent === 'DIG' ? (isRu ? 'Копаю' : 'DIG') : growthIntent === 'UPGRADE' ? (isRu ? 'Строю' : 'BUILD') : (isRu ? 'Заряд' : 'SIPHON')}
                        fontSize={7.5}
                        fontFamily="JetBrains Mono, Courier New, monospace"
                        fontStyle="bold"
                        fill={growthIntent === 'DIG' ? '#fca5a5' : growthIntent === 'UPGRADE' ? '#a7f3d0' : '#bfdbfe'}
                        align="center"
                        width={36}
                    />

                    {/* Progress tracking line */}
                    <Rect
                        x={28}
                        y={3}
                        width={36}
                        height={3}
                        cornerRadius={1}
                        fill="rgba(30, 41, 59, 0.95)"
                    />
                    
                    <Rect
                        ref={progressBarFillRef}
                        x={28}
                        y={3}
                        width={0}
                        height={3}
                        cornerRadius={1}
                        fill={growthIntent === 'DIG' ? '#ef4444' : growthIntent === 'UPGRADE' ? '#10b981' : '#3b82f6'}
                    />
                </Group>
            )}
        </Group>
      </Group>
    </Group>
  );
});

export default Unit;
