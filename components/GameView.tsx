
import React, { useEffect, useCallback, useState, useRef } from 'react';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { useEphemeralStore } from '../store/ephemeralStore.ts';
import { hexToPixel } from '../services/hexUtils.ts';
import Background from './Background.tsx';
import GameHUD from './GameHUD.tsx';
import MapRenderer from './MapRenderer.tsx';
import { audioService } from '../services/audioService.ts';
import { wallUpdaterRegistry } from '../services/wallUpdater.ts';
import { safifyCoord } from '../utils/safeCoordinates.ts';
import { getHeightOffset } from '../services/pixiHexRender.ts';

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// HELPER: Linear Interpolation
const lerp = (start: number, end: number, factor: number) => {
    return start + (end - start) * factor;
};

// HELPER: Calculate new View State to pivot rotation around a specific screen point
const calculateRotationAdjustedView = (
    currentView: { x: number, y: number, scale: number },
    pivot: { x: number, y: number },
    oldRotation: number,
    newRotation: number
) => {
    // 1. Convert Pivot Screen -> Stage Local (Relative to View offset)
    const localX = (pivot.x - currentView.x) / currentView.scale;
    const localY = (pivot.y - currentView.y) / currentView.scale;

    // 2. Un-project (Reverse Squash & Reverse Old Rotation) to get Raw Grid Space
    const unsquashedY = localY / 0.8;
    const radOld = -oldRotation * (Math.PI / 180);
    const cosOld = Math.cos(radOld);
    const sinOld = Math.sin(radOld);
    
    // Rotate by -oldRotation
    const rawX = localX * cosOld - unsquashedY * sinOld;
    const rawY = localX * sinOld + unsquashedY * cosOld;

    // 3. Re-project (New Rotation & Squash)
    const radNew = newRotation * (Math.PI / 180);
    const cosNew = Math.cos(radNew);
    const sinNew = Math.sin(radNew);
    
    const rotatedX = rawX * cosNew - rawY * sinNew;
    const rotatedY = (rawX * sinNew + rawY * cosNew) * 0.8;

    // 4. New View Position = Pivot - RotatedLocal * Scale
    const finalX = pivot.x - rotatedX * currentView.scale;
    const finalY = pivot.y - rotatedY * currentView.scale;
    
    const safePos = { x: clamp(finalX, -5000, 5000), y: clamp(finalY, -5000, 5000) };

    return {
        x: safePos.x,
        y: safePos.y,
        scale: currentView.scale
    };
};

interface CameraState {
    x: number;
    y: number;
    scale: number;
    rotation: number;
}

const GameView: React.FC = () => {
  const hasGrid = useGameStore(state => !!state.session?.grid);
  const grid = useGameStore(state => state.session?.grid);
  const player = useGameStore(state => state.session?.player);
  const playerLevel = player && grid ? (grid[`${player.q},${player.r}`]?.currentLevel || 0) : 0;
  const winCondition = useGameStore(state => state.session?.winCondition);
  const deviceType = useGameStore(state => state.deviceType);
  const lastVisualEvent = useGameStore(state => state.lastVisualEvent);
  const portalActive = useGameStore(state => state.session?.portalActive);
  
  const movePlayer = useGameStore(state => state.movePlayer);
  const hideToast = useGameStore(state => state.hideToast);
  const toast = useGameStore(state => state.toast);
  const cancelPendingAction = useGameStore(state => state.cancelPendingAction);
  const tick = useGameStore(state => state.tick);
  
  const setHoveredHexId = useEphemeralStore(state => state.setHoveredHexId);

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // RESPONSIVE: Scale Logic based on Device Type
  const getInitialScale = () => {
      switch(deviceType) {
          case 'MOBILE': return 0.65;
          case 'TABLET': return 0.8;
          default: return 1.0;
      }
  };

  // UI OFFSET: None, center on player
  const getCenterOffset = () => {
      return 0;
  };
  
  // --- UNIFIED CAMERA STATE ---
  // We use Refs for the physics engine source-of-truth to avoid React batching lag during high-frequency events.
  const initialCamera = { 
      x: window.innerWidth / 2, 
      y: (window.innerHeight / 2) - getCenterOffset(), 
      scale: getInitialScale(), 
      rotation: 0 
  };

  const currentCameraRef = useRef<CameraState>(initialCamera);
  const targetCameraRef = useRef<CameraState>(initialCamera);
  
  // Render State (Synced from Ref via Animation Loop)
  const [renderCamera, setRenderCamera] = useState<CameraState>(initialCamera);
  
  // Interaction State
  const isRotating = useRef(false);
  const isDragging = useRef(false);
  const isTouchActive = useRef(false);
  const lastClickTimeRef = useRef<number>(0);
  const mouseDownPosRef = useRef({ x: 0, y: 0 }); // Track start position
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 }); 
  const [isDamageFlashed, setIsDamageFlashed] = useState(false);
  
  // Multi-touch refs
  const lastDist = useRef<number>(0);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastAngle = useRef<number>(0);
  const isMultitouch = useRef(false);
  
  // Update scale when device type changes
  useEffect(() => {
     const newScale = getInitialScale();
     targetCameraRef.current = { ...targetCameraRef.current, scale: newScale };
  }, [deviceType]);

  // --- FOCUS ON ORIGIN INITIALLY ---
  useEffect(() => {
      // Intentionally intentionally blank: We want the camera to start centered on (0,0) across all levels to maintain consistency with level 1.0. 
      // The user can press the Recenter button in the HUD to find their character.
      const timer = setTimeout(() => {
          // ensure initial position is exactly the origin for layout consistency
          const offset = getCenterOffset();
          targetCameraRef.current = { 
            ...targetCameraRef.current, 
            x: window.innerWidth / 2, 
            y: (window.innerHeight / 2) - offset 
          };
      }, 100);
      return () => clearTimeout(timer);
  }, []);
  useEffect(() => {
      audioService.startMusic();
      return () => { audioService.stopMusic(); };
  }, []);

  // --- PORTAL HUMMING LOOP ---
  useEffect(() => {
      if (portalActive) {
          audioService.startPortalHum();
      } else {
          audioService.stopPortalHum();
      }
      return () => {
          audioService.stopPortalHum();
      };
  }, [portalActive]);

  // --- AUDIO DYNAMICS ---
  useEffect(() => {
      if (player && winCondition) {
          audioService.updateMusic(player.coins, winCondition.targetCoins || 500);
      }
  }, [player?.coins, winCondition]);

  // --- SCREEN SHAKE TRIGGER ---
  useEffect(() => {
      const type = lastVisualEvent?.type;
      if (type === 'ENTROPY_SHIFT' || type === 'HEX_COLLAPSE' || type === 'METEOR_STRIKE' || type === 'CORE_DAMAGED' || type === 'TURRET_FIRED') {
          let duration = 600;
          let intensityBase = 10;
          
          let flashTimer: any = null;
          if (type === 'HEX_COLLAPSE') {
              duration = 400;
              intensityBase = 12;
          } else if (type === 'METEOR_STRIKE') {
              duration = 800;
              intensityBase = 16;
          } else if (type === 'CORE_DAMAGED') {
              duration = 500;
              intensityBase = 22;
              setIsDamageFlashed(true);
              audioService.play('WARNING');
              flashTimer = setTimeout(() => setIsDamageFlashed(false), 450);
          } else if (type === 'TURRET_FIRED') {
              duration = 250;
              intensityBase = 6;
          }

          const start = Date.now();
          const shakeAnim = new Konva.Animation((_frame) => {
              const now = Date.now();
              const elapsed = now - start;
              if (elapsed > duration) {
                  setShakeOffset({ x: 0, y: 0 });
                  shakeAnim.stop();
                  return;
              }
              const progress = elapsed / duration;
              const intensity = intensityBase * (1 - progress); 
              const dx = (Math.random() - 0.5) * intensity * 2;
              const dy = (Math.random() - 0.5) * intensity * 2;
              setShakeOffset({ x: dx, y: dy });
          }); 
          
          shakeAnim.start();
          return () => { 
              shakeAnim.stop();
              if (flashTimer) clearTimeout(flashTimer);
          };
      }
  }, [lastVisualEvent]);

  useEffect(() => {
    const interval = setInterval(tick, 100); 
    return () => clearInterval(interval);
  }, [tick]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(hideToast, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, hideToast]);

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  // --- OPTIMIZED RESIZE HANDLER ---
  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) {
      // Fallback to window resize if ref not populated
      let resizeFrame: number;
      const handleResizeObj = () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
          setDimensions({ width: window.innerWidth, height: window.innerHeight });
        });
      };
      window.addEventListener('resize', handleResizeObj);
      return () => {
        window.removeEventListener('resize', handleResizeObj);
        cancelAnimationFrame(resizeFrame);
      };
    }

    let resizeFrame: number;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width, height } = entries[0].contentRect;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        setDimensions({
          width: Math.max(100, Math.floor(width)),
          height: Math.max(100, Math.floor(height))
        });
      });
    });

    observer.observe(container);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
    };
  }, []);

  const centerOnPlayer = useCallback(() => {
      if (!player) return;
      const isMobile = deviceType === 'MOBILE';
      const rot = currentCameraRef.current.rotation;
      const { x: px, y: py } = hexToPixel(player.q, player.r, rot);
      
      const offset = isMobile ? dimensions.height * 0.05 : getCenterOffset();
      const current = currentCameraRef.current;
      
      const heightOffset = getHeightOffset(playerLevel);
      const pyWithHeight = py + heightOffset;
      
      // Compute target scale
      const targetScale = targetCameraRef.current.scale;
      
      const visualX = px * current.scale + current.x;
      const visualY = pyWithHeight * current.scale + current.y + offset;
      
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;
      
      const bufferX = isMobile ? 0 : dimensions.width * 0.40;
      const bufferY = isMobile ? 0 : dimensions.height * 0.40;
      
      if (Math.abs(visualX - centerX) < bufferX && Math.abs(visualY - centerY) < bufferY) {
          return;
      }
      
      const tx = (dimensions.width / 2) - (px * targetScale);
      const ty = ((dimensions.height / 2) + offset) - (pyWithHeight * targetScale);
      
      const safeT = { x: clamp(tx, -5000, 5000), y: clamp(ty, -5000, 5000) };
      targetCameraRef.current = { ...targetCameraRef.current, x: safeT.x, y: safeT.y, scale: targetScale };
  }, [player, playerLevel, dimensions, deviceType]);

  // Auto-center / track player on mobile whenever position or tower level changes
  useEffect(() => {
      if (!player) return;
      if (deviceType !== 'MOBILE') return;
      
      const targetScale = targetCameraRef.current.scale;

      const rot = targetCameraRef.current.rotation;
      const { x: px, y: py } = hexToPixel(player.q, player.r, rot);

      // Height offset of the high tower
      const heightOffset = getHeightOffset(playerLevel);
      const pyWithHeight = py + heightOffset;

      // Center with an offset on mobile so the player/top has a bit of space
      const offset = dimensions.height * 0.05; 

      const tx = (dimensions.width / 2) - (px * targetScale);
      const ty = ((dimensions.height / 2) + offset) - (pyWithHeight * targetScale);

      const safeT = { x: clamp(tx, -5000, 5000), y: clamp(ty, -5000, 5000) };
      targetCameraRef.current = { 
          ...targetCameraRef.current, 
          x: safeT.x, 
          y: safeT.y, 
          scale: targetScale 
      };
  }, [player?.q, player?.r, playerLevel, deviceType, dimensions.width, dimensions.height]);
  useEffect(() => {
      const anim = new Konva.Animation((frame) => {
          if (!frame) return;
          
          const current = currentCameraRef.current;
          const target = targetCameraRef.current;
          
          // Input State
          const isUserInteracting = isDragging.current || isRotating.current || isMultitouch.current;
          
          // Damping Factors
          // Snappy response when interacting (0.4), smooth drift when released/animating (0.08)
          const dampingPos = isUserInteracting ? 0.4 : 0.12; 
          const dampingRot = isUserInteracting ? 0.4 : 0.08;

          // Easing function for smoother scale updates
          const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
          const scaleDiff = Math.abs(target.scale - current.scale);
          // Map the difference against a max reasonable zoom step (~1.5 scale delta)
          const scaleProgress = Math.min(scaleDiff / 1.5, 1.0);
          const dynamicScaleDamping = 0.05 + easeOutCubic(scaleProgress) * 0.15;

          // Interpolate
          const nextX = lerp(current.x, target.x, dampingPos);
          const nextY = lerp(current.y, target.y, dampingPos);
          const nextScale = lerp(current.scale, target.scale, dynamicScaleDamping);
          const nextRot = lerp(current.rotation, target.rotation, dampingRot);

          // Convergence Check (Optimization)
          // If very close to target and not interacting, skip update
          if (
              Math.abs(nextX - current.x) < 0.05 && 
              Math.abs(nextY - current.y) < 0.05 && 
              Math.abs(nextScale - current.scale) < 0.0001 &&
              Math.abs(nextRot - current.rotation) < 0.01 &&
              !isUserInteracting
          ) {
              return;
          }

          const nextState = {
              x: nextX,
              y: nextY,
              scale: nextScale,
              rotation: nextRot
          };
          
          // Update Authority
          currentCameraRef.current = nextState;
          
          wallUpdaterRegistry.updateAll(nextRot);
          
          // Sync React State (Triggers Render)
          // This ensures render is synced with AnimationFrame
          setRenderCamera(nextState);

      });

      anim.start();
      return () => { anim.stop(); };
  }, []); 


  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      isTouchActive.current = false;
      // Left Click (0) = Drag, Right Click (2) = Rotate
      const rect = canvasContainerRef.current?.getBoundingClientRect();
      const pointer = rect ? {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
      } : { x: e.clientX, y: e.clientY };

      if (e.button === 0) {
          isDragging.current = true;
          mouseDownPosRef.current = pointer; // Record start
          
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
      } else if (e.button === 2) { 
          isRotating.current = true;
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
      }
  };
  
  const handleHexClick = useCallback((q: number, r: number) => {
      const now = Date.now();
      if (now - lastClickTimeRef.current < 200) return;
      lastClickTimeRef.current = now;

      const rect = canvasContainerRef.current?.getBoundingClientRect();
      const currentPointer = lastPointerPos.current;
      
      if (currentPointer && rect) {
          const pointerX = currentPointer.x - rect.left;
          const pointerY = currentPointer.y - rect.top;
          const dist = Math.hypot(pointerX - mouseDownPosRef.current.x, pointerY - mouseDownPosRef.current.y);
          if (dist > 20) return; // Threshold check: increased for mobile reliability
      }
      
      movePlayer(q, r);
  }, [movePlayer]);

  // --- INPUT HANDLERS (Update Targets Only) ---

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const oldScale = targetCameraRef.current.scale;
    const pointer = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    // Calculate zoom relative to current target, not current visual state (avoids oscillation)
    const mousePointTo = {
      x: (pointer.x - targetCameraRef.current.x) / oldScale,
      y: (pointer.y - targetCameraRef.current.y) / oldScale,
    };

    // Use a dynamic scale based on wheel delta for smoother trackpad zooming
    const scaleBy = 1.0 + Math.min(Math.abs(e.deltaY) * 0.002, 0.2); 
    let newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.8, Math.min(newScale, 2.5));
    
    if (isNaN(newScale)) newScale = 1.0;

    const newX = pointer.x - mousePointTo.x * newScale;
    const newY = pointer.y - mousePointTo.y * newScale;
    
    const safePos = { x: clamp(newX, -5000, 5000), y: clamp(newY, -5000, 5000) };
    targetCameraRef.current = { ...targetCameraRef.current, x: safePos.x, y: safePos.y, scale: newScale };
  }, []);

  const handleStageClick = (e: React.MouseEvent) => {
     if (!isDragging.current) {
         const target = e.target as HTMLElement;
         if (target && target.closest('.cursor-crosshair')) {
             return;
         }
         cancelPendingAction();
     }
  };
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchActive.current) return;
      if (isDragging.current) {
          const dx = e.clientX - lastPointerPos.current.x;
          const dy = e.clientY - lastPointerPos.current.y;
          lastPointerPos.current = { x: e.clientX, y: e.clientY };

          // Direct update to target
          const nx = targetCameraRef.current.x + dx;
          const ny = targetCameraRef.current.y + dy;
          const safe = safifyCoord(nx, ny);
          
          targetCameraRef.current = { ...targetCameraRef.current, x: safe.x, y: safe.y };
      }
      
      if (isRotating.current) {
          const deltaX = e.clientX - lastPointerPos.current.x;
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
          
          const target = targetCameraRef.current;
          
          const deltaRot = deltaX * 0.5;
          const newRot = target.rotation + deltaRot;
          
          // Pivot Calculation: Center of the screen
          const pivot = { x: dimensions.width / 2, y: dimensions.height / 2 };
          const adjustedView = calculateRotationAdjustedView(
              { x: target.x, y: target.y, scale: target.scale }, 
              pivot, 
              target.rotation, 
              newRot
          );
          
          // Update Target
          targetCameraRef.current = { 
              ...target, 
              x: adjustedView.x, 
              y: adjustedView.y,
              rotation: newRot 
          };
      }
  };
  
  const handleMouseUp = () => {
      if (isTouchActive.current) return;
      isDragging.current = false;
      isRotating.current = false;
      // Do not set setIsInteracting(false) here, let the animation loop detect when velocity settles.
      // This prevents "popping" visual changes.
  };

  // -- Native Touch Handling for responsive Pinch-to-Zoom & Pan on Hex Grid --
  const handleNativeTouchStart = (e: TouchEvent) => {
    isTouchActive.current = true;
    const touches = e.touches;
    if (touches.length === 1) {
        isDragging.current = true;
        isMultitouch.current = false;
        
        // Calibrate container-relative coordinates accurately
        const container = canvasContainerRef.current;
        if (container) {
            try {
                const rect = container.getBoundingClientRect();
                mouseDownPosRef.current = {
                    x: touches[0].clientX - rect.left,
                    y: touches[0].clientY - rect.top
                };
            } catch (err) {
                mouseDownPosRef.current = { x: touches[0].clientX, y: touches[0].clientY };
            }
        } else {
            mouseDownPosRef.current = { x: touches[0].clientX, y: touches[0].clientY };
        }
        lastPointerPos.current = { x: touches[0].clientX, y: touches[0].clientY };
    } else if (touches.length === 2) {
      isMultitouch.current = true;
      isDragging.current = false;
      
      const p1 = { x: touches[0].clientX, y: touches[0].clientY };
      const p2 = { x: touches[1].clientX, y: touches[1].clientY };
      
      lastDist.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      lastCenter.current = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
      lastAngle.current = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    }
  };
  
  const handleNativeTouchMove = (e: TouchEvent) => {
      const touches = e.touches;
      
      if (touches.length === 1 && isDragging.current) {
          if (e.cancelable) {
              e.preventDefault();
          }
          const dx = touches[0].clientX - lastPointerPos.current.x;
          const dy = touches[0].clientY - lastPointerPos.current.y;
          lastPointerPos.current = { x: touches[0].clientX, y: touches[0].clientY };
          
          const nx = targetCameraRef.current.x + dx;
          const ny = targetCameraRef.current.y + dy;
          const safe = safifyCoord(nx, ny);
          targetCameraRef.current = { ...targetCameraRef.current, x: safe.x, y: safe.y };
          return;
      }

      if (touches.length === 2 && lastCenter.current) {
          if (e.cancelable) {
              e.preventDefault();
          }
          
          const p1 = { x: touches[0].clientX, y: touches[0].clientY };
          const p2 = { x: touches[1].clientX, y: touches[1].clientY };
          
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const center = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

          let target = targetCameraRef.current;
          let newRot = target.rotation;
          
          const dAngle = angle - lastAngle.current;
          if (Math.abs(dAngle) > 0.5) { 
             newRot = target.rotation + dAngle;
             // Calculate temporary view for pivot
             const pivotRes = calculateRotationAdjustedView({x: target.x, y: target.y, scale: target.scale}, center, target.rotation, newRot);
             target = { ...target, x: pivotRes.x, y: pivotRes.y }; // Local override for scale math below
             lastAngle.current = angle;
          }
          
          const scaleMult = dist / lastDist.current;
          let newScale = target.scale * scaleMult;
          newScale = Math.max(0.8, Math.min(newScale, 2.5));
          if (isNaN(newScale)) newScale = 1.0;

          const worldFocusX = (lastCenter.current.x - target.x) / target.scale;
          const worldFocusY = (lastCenter.current.y - target.y) / target.scale;
          const rawX = center.x - (worldFocusX * newScale);
          const rawY = center.y - (worldFocusY * newScale);
          const safePos = safifyCoord(rawX, rawY);

          // Update Target
          targetCameraRef.current = { x: safePos.x, y: safePos.y, scale: newScale, rotation: newRot };

          lastDist.current = dist;
          lastCenter.current = center;
      }
  };

  const handleNativeTouchEnd = (e: TouchEvent) => {
      const touches = e.touches;
      if (touches.length === 0) {
          isMultitouch.current = false;
          isDragging.current = false;
          lastDist.current = 0;
          lastCenter.current = null;
      } else if (touches.length === 1) {
          isMultitouch.current = false;
          isDragging.current = true;
          lastPointerPos.current = { x: touches[0].clientX, y: touches[0].clientY };
      }
  };

  // Attach touch events directly to Pixi-wrapped DOM node for reliable pinch-to-zoom on interactive subcomponents
  useEffect(() => {
      const container = canvasContainerRef.current;
      if (!container) return;

      container.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
      container.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
      container.addEventListener('touchend', handleNativeTouchEnd, { passive: false });

      return () => {
          container.removeEventListener('touchstart', handleNativeTouchStart);
          container.removeEventListener('touchmove', handleNativeTouchMove);
          container.removeEventListener('touchend', handleNativeTouchEnd);
      };
  }, [hasGrid, player]);

  if (!hasGrid || !player) return null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020617] touch-none" onContextMenu={(e) => e.preventDefault()}>
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <Background variant="GAME" />
         <div className="absolute inset-0 bg-slate-950/20" />
      </div>

      {/* CANVAS */}
      <div 
        ref={canvasContainerRef} 
        className="absolute inset-0 z-10"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleStageClick}
      >
          <MapRenderer 
            rotation={renderCamera.rotation}
            onHexClick={handleHexClick}
            onHover={setHoveredHexId}
            camera={{
              ...renderCamera,
              x: renderCamera.x + shakeOffset.x,
              y: renderCamera.y + shakeOffset.y
            }}
            dimensions={dimensions}
          />
      </div>

      {/* SCREEN DAMAGE FLASH */}
      {isDamageFlashed && (
        <div className="absolute inset-0 z-[15] pointer-events-none bg-rose-500/20 border-[12px] border-rose-600/40 shadow-[inset_0_0_100px_rgba(244,63,94,0.4)] animate-pulse" />
      )}

      <GameHUD 
        onCenterPlayer={centerOnPlayer}
      />

    </div>
  );
};

export default GameView;
