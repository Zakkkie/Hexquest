import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import { useGameStore } from '../store';
import { useEphemeralStore } from '../store/ephemeralStore';
import { hexToPixel } from '../services/hexUtils';
import Background from './Background';
import GameHUD from './GameHUD';
import MapRenderer from './MapRenderer';
import { audioService } from '../services/audioService';
import { wallUpdaterRegistry } from '../services/wallUpdater';
import { safifyCoord } from '../utils/safeCoordinates';
import { getHeightOffset } from '../services/pixiHexRender';

const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val));

// HELPER: Linear Interpolation
const lerp = (start: number, end: number, factor: number) => start + (end - start) * factor;

// HELPER: Calculate new View State to pivot rotation around a specific screen point
const calculateRotationAdjustedView = (
    currentView: { x: number, y: number, scale: number },
    pivot: { x: number, y: number },
    oldRotation: number,
    newRotation: number
) => {
    const localX = (pivot.x - currentView.x) / currentView.scale;
    const localY = (pivot.y - currentView.y) / currentView.scale;

    const unsquashedY = localY / 0.8;
    const radOld = -oldRotation * (Math.PI / 180);
    const cosOld = Math.cos(radOld);
    const sinOld = Math.sin(radOld);
    
    const rawX = localX * cosOld - unsquashedY * sinOld;
    const rawY = localX * sinOld + unsquashedY * cosOld;

    const radNew = newRotation * (Math.PI / 180);
    const cosNew = Math.cos(radNew);
    const sinNew = Math.sin(radNew);
    
    const rotatedX = rawX * cosNew - rawY * sinNew;
    const rotatedY = (rawX * sinNew + rawY * cosNew) * 0.8;

    const finalX = pivot.x - rotatedX * currentView.scale;
    const finalY = pivot.y - rotatedY * currentView.scale;
    
    const safePos = { x: clamp(finalX, -5000, 5000), y: clamp(finalY, -5000, 5000) };

    return { x: safePos.x, y: safePos.y, scale: currentView.scale };
};

interface CameraState {
    x: number;
    y: number;
    scale: number;
    rotation: number;
}

// Memoized components to prevent re-rendering 60fps when camera updates
const MemoizedBackground = React.memo(Background);
const MemoizedGameHUD = React.memo(GameHUD);

const GameView: React.FC = () => {
  const hasGrid = useGameStore(state => !!state.session?.grid);
  const grid = useGameStore(state => state.session?.grid);
  const player = useGameStore(state => state.session?.player);
  
  // Memoize player level to prevent recalculations on every render
  const playerLevel = useMemo(() => {
      return player && grid ? (grid[`${player.q},${player.r}`]?.currentLevel || 0) : 0;
  }, [player, grid]);
  
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
  const dimensionsRef = useRef(dimensions);
  dimensionsRef.current = dimensions;
  
  const getInitialScale = useCallback(() => {
      switch(deviceType) {
          case 'MOBILE': return 0.65;
          case 'TABLET': return 0.8;
          default: return 1.0;
      }
  }, [deviceType]);

  const getCenterOffset = useCallback(() => 0, []);
  
  const initialCamera = useMemo(() => ({ 
      x: window.innerWidth / 2, 
      y: (window.innerHeight / 2) - getCenterOffset(), 
      scale: getInitialScale(), 
      rotation: 0 
  }), [getCenterOffset, getInitialScale]);

  const currentCameraRef = useRef<CameraState>(initialCamera);
  const targetCameraRef = useRef<CameraState>(initialCamera);
  
  const [renderCamera, setRenderCamera] = useState<CameraState>(initialCamera);
  
  // Interaction State
  const isRotating = useRef(false);
  const isDragging = useRef(false);
  const isTouchActive = useRef(false);
  const lastClickTimeRef = useRef<number>(0);
  const mouseDownPosRef = useRef({ x: 0, y: 0 });
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const hexClickedRef = useRef(false);
  const [isDamageFlashed, setIsDamageFlashed] = useState(false);
  
  // Shake State managed via refs to avoid multiple re-renders
  const shakeIntensityRef = useRef(0);
  
  // Multi-touch refs
  const lastDist = useRef<number>(0);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastAngle = useRef<number>(0);
  const isMultitouch = useRef(false);
  
  // Update scale when device type changes
  useEffect(() => {
     targetCameraRef.current = { ...targetCameraRef.current, scale: getInitialScale() };
  }, [deviceType, getInitialScale]);

  // --- FOCUS ON ORIGIN INITIALLY ---
  useEffect(() => {
      const timer = setTimeout(() => {
          const offset = getCenterOffset();
          targetCameraRef.current = { 
            ...targetCameraRef.current, 
            x: window.innerWidth / 2, 
            y: (window.innerHeight / 2) - offset 
          };
      }, 100);
      return () => clearTimeout(timer);
  }, [getCenterOffset]);

  useEffect(() => {
      audioService.startMusic();
      return () => { audioService.stopMusic(); };
  }, []);

  // --- PORTAL HUMMING LOOP ---
  useEffect(() => {
      if (portalActive) audioService.startPortalHum();
      else audioService.stopPortalHum();
      return () => audioService.stopPortalHum();
  }, [portalActive]);

  // --- AUDIO DYNAMICS ---
  useEffect(() => {
      if (player && winCondition) {
          audioService.updateMusic(player.coins, winCondition.targetCoins || 500);
      }
  }, [player, winCondition]);

  // --- SCREEN SHAKE TRIGGER (Sets Intensity, RAF loop handles the animation) ---
  useEffect(() => {
      const type = lastVisualEvent?.type;
      if (!type) return;
      
      if (['ENTROPY_SHIFT', 'HEX_COLLAPSE', 'METEOR_STRIKE', 'CORE_DAMAGED', 'TURRET_FIRED'].includes(type)) {
          if (type === 'HEX_COLLAPSE') shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 12);
          else if (type === 'METEOR_STRIKE') shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 16);
          else if (type === 'CORE_DAMAGED') {
              shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 22);
              setIsDamageFlashed(true);
              audioService.play('WARNING');
              setTimeout(() => setIsDamageFlashed(false), 450);
          } else if (type === 'TURRET_FIRED') shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 6);
          else shakeIntensityRef.current = Math.max(shakeIntensityRef.current, 10);
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
    if (!container) return;

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
      
      const offset = isMobile ? dimensionsRef.current.height * 0.05 : getCenterOffset();
      const current = currentCameraRef.current;
      
      const heightOffset = getHeightOffset(playerLevel);
      const pyWithHeight = py + heightOffset;
      
      const targetScale = targetCameraRef.current.scale;
      
      const visualX = px * current.scale + current.x;
      const visualY = pyWithHeight * current.scale + current.y + offset;
      
      const centerX = dimensionsRef.current.width / 2;
      const centerY = dimensionsRef.current.height / 2;
      
      const bufferX = isMobile ? 0 : dimensionsRef.current.width * 0.40;
      const bufferY = isMobile ? 0 : dimensionsRef.current.height * 0.40;
      
      if (Math.abs(visualX - centerX) < bufferX && Math.abs(visualY - centerY) < bufferY) return;
      
      const tx = (dimensionsRef.current.width / 2) - (px * targetScale);
      const ty = ((dimensionsRef.current.height / 2) + offset) - (pyWithHeight * targetScale);
      
      const safeT = { x: clamp(tx, -5000, 5000), y: clamp(ty, -5000, 5000) };
      targetCameraRef.current = { ...targetCameraRef.current, x: safeT.x, y: safeT.y };
  }, [player, playerLevel, deviceType, getCenterOffset]);

  // Auto-center on mobile
  useEffect(() => {
      if (!player || deviceType !== 'MOBILE') return;
      
      const targetScale = targetCameraRef.current.scale;
      const rot = targetCameraRef.current.rotation;
      const { x: px, y: py } = hexToPixel(player.q, player.r, rot);

      const heightOffset = getHeightOffset(playerLevel);
      const pyWithHeight = py + heightOffset;

      const offset = dimensionsRef.current.height * 0.05; 
      const tx = (dimensionsRef.current.width / 2) - (px * targetScale);
      const ty = ((dimensionsRef.current.height / 2) + offset) - (pyWithHeight * targetScale);

      const safeT = { x: clamp(tx, -5000, 5000), y: clamp(ty, -5000, 5000) };
      targetCameraRef.current = { ...targetCameraRef.current, x: safeT.x, y: safeT.y };
  }, [player, playerLevel, deviceType]);

  // --- UNIFIED CAMERA & SHAKE ANIMATION LOOP ---
  // Replaces Konva.Animation. Runs on standard requestAnimationFrame to avoid React batching lags.
  useEffect(() => {
      let raf: number;
      
      const loop = () => {
          const current = currentCameraRef.current;
          const target = targetCameraRef.current;
          
          const isUserInteracting = isDragging.current || isRotating.current || isMultitouch.current;
          
          const dampingPos = isUserInteracting ? 0.4 : 0.12; 
          const dampingRot = isUserInteracting ? 0.4 : 0.08;

          const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
          const scaleDiff = Math.abs(target.scale - current.scale);
          const scaleProgress = Math.min(scaleDiff / 1.5, 1.0);
          const dynamicScaleDamping = 0.05 + easeOutCubic(scaleProgress) * 0.15;

          const nextX = lerp(current.x, target.x, dampingPos);
          const nextY = lerp(current.y, target.y, dampingPos);
          const nextScale = lerp(current.scale, target.scale, dynamicScaleDamping);
          const nextRot = lerp(current.rotation, target.rotation, dampingRot);

          // Process screen shake
          let shakeX = 0, shakeY = 0;
          if (shakeIntensityRef.current > 0.1) {
              shakeX = (Math.random() - 0.5) * shakeIntensityRef.current * 2;
              shakeY = (Math.random() - 0.5) * shakeIntensityRef.current * 2;
              shakeIntensityRef.current *= 0.9; // Decay
          } else {
              shakeIntensityRef.current = 0;
          }

          // Convergence Check
          const hasShake = shakeIntensityRef.current > 0;
          const isConverged = 
              Math.abs(nextX - current.x) < 0.05 && 
              Math.abs(nextY - current.y) < 0.05 && 
              Math.abs(nextScale - current.scale) < 0.0001 &&
              Math.abs(nextRot - current.rotation) < 0.01 &&
              !isUserInteracting;

          if (!isConverged || hasShake) {
              const nextState = { x: nextX, y: nextY, scale: nextScale, rotation: nextRot };
              currentCameraRef.current = nextState;
              
              wallUpdaterRegistry.updateAll(nextRot);
              
              // Single state update for React per frame
              setRenderCamera({ 
                  ...nextState, 
                  x: nextState.x + shakeX, 
                  y: nextState.y + shakeY 
              });
          }
          
          raf = requestAnimationFrame(loop);
      };

      raf = requestAnimationFrame(loop);
      return () => cancelAnimationFrame(raf);
  }, []); 


  // --- EVENT HANDLERS (Stable Callbacks using Refs) ---

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      isTouchActive.current = false;
      const rect = canvasContainerRef.current?.getBoundingClientRect();
      const pointer = rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top } : { x: e.clientX, y: e.clientY };

      if (e.button === 0) {
          isDragging.current = true;
          mouseDownPosRef.current = pointer;
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
      } else if (e.button === 2) { 
          isRotating.current = true;
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
      }
  }, []);
  
  const handleHexClick = useCallback((q: number, r: number) => {
      hexClickedRef.current = true;
      const now = Date.now();
      if (now - lastClickTimeRef.current < 200) return;
      lastClickTimeRef.current = now;

      const rect = canvasContainerRef.current?.getBoundingClientRect();
      const currentPointer = lastPointerPos.current;
      
      if (currentPointer && rect) {
          const pointerX = currentPointer.x - rect.left;
          const pointerY = currentPointer.y - rect.top;
          const dist = Math.hypot(pointerX - mouseDownPosRef.current.x, pointerY - mouseDownPosRef.current.y);
          if (dist > 20) return; 
      }
      
      movePlayer(q, r);
  }, [movePlayer]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const oldScale = targetCameraRef.current.scale;
    const pointer = { x: e.clientX - rect.left, y: e.clientY - rect.top };

    const mousePointTo = {
      x: (pointer.x - targetCameraRef.current.x) / oldScale,
      y: (pointer.y - targetCameraRef.current.y) / oldScale,
    };

    const scaleBy = 1.0 + Math.min(Math.abs(e.deltaY) * 0.002, 0.2); 
    let newScale = e.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.8, Math.min(newScale, 2.5));
    if (isNaN(newScale)) newScale = 1.0;

    const newX = pointer.x - mousePointTo.x * newScale;
    const newY = pointer.y - mousePointTo.y * newScale;
    
    const safePos = { x: clamp(newX, -5000, 5000), y: clamp(newY, -5000, 5000) };
    targetCameraRef.current = { ...targetCameraRef.current, x: safePos.x, y: safePos.y, scale: newScale };
  }, []);

  const handleStageClick = useCallback((e: React.MouseEvent) => {
     // If a hex was clicked, the hex handler takes care of it. 
     // We only cancel pending action if user clicks empty space (background).
     if (!hexClickedRef.current && !isDragging.current) {
         cancelPendingAction();
     }
     hexClickedRef.current = false; // Reset flag
  }, [cancelPendingAction]);
  
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
      if (isTouchActive.current) return;
      if (isDragging.current) {
          const dx = e.clientX - lastPointerPos.current.x;
          const dy = e.clientY - lastPointerPos.current.y;
          lastPointerPos.current = { x: e.clientX, y: e.clientY };

          const nx = targetCameraRef.current.x + dx;
          const ny = targetCameraRef.current.y + dy;
          const safe = safifyCoord(nx, ny);
          
          targetCameraRef.current = { ...targetCameraRef.current, x: safe.x, y: safe.y };
      }
      
      if (isRotating.current) {
          const deltaX = e.clientX - lastPointerPos.current.x;
          lastPointerPos.current = { x: e.clientX, y: e.clientY };
          
          const target = targetCameraRef.current;
          const newRot = target.rotation + deltaX * 0.5;
          
          const pivot = { x: dimensionsRef.current.width / 2, y: dimensionsRef.current.height / 2 };
          const adjustedView = calculateRotationAdjustedView(
              { x: target.x, y: target.y, scale: target.scale }, 
              pivot, 
              target.rotation, 
              newRot
          );
          
          targetCameraRef.current = { 
              ...target, 
              x: adjustedView.x, 
              y: adjustedView.y,
              rotation: newRot 
          };
      }
  }, []);
  
  const handleMouseUp = useCallback(() => {
      if (isTouchActive.current) return;
      isDragging.current = false;
      isRotating.current = false;
  }, []);

  // -- Native Touch Handling --
  const handleNativeTouchStart = useCallback((e: TouchEvent) => {
    isTouchActive.current = true;
    const touches = e.touches;
    if (touches.length === 1) {
        isDragging.current = true;
        isMultitouch.current = false;
        const container = canvasContainerRef.current;
        if (container) {
            const rect = container.getBoundingClientRect();
            mouseDownPosRef.current = { x: touches[0].clientX - rect.left, y: touches[0].clientY - rect.top };
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
  }, []);
  
  const handleNativeTouchMove = useCallback((e: TouchEvent) => {
      const touches = e.touches;
      if (touches.length === 1 && isDragging.current) {
          if (e.cancelable) e.preventDefault();
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
          if (e.cancelable) e.preventDefault();
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
             const pivotRes = calculateRotationAdjustedView({x: target.x, y: target.y, scale: target.scale}, center, target.rotation, newRot);
             target = { ...target, x: pivotRes.x, y: pivotRes.y };
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

          targetCameraRef.current = { x: safePos.x, y: safePos.y, scale: newScale, rotation: newRot };
          lastDist.current = dist;
          lastCenter.current = center;
      }
  }, []);

  const handleNativeTouchEnd = useCallback((e: TouchEvent) => {
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
  }, []);

  // Attach touch events directly to container. 
  // Empty dependency array means we attach once, callbacks handle the rest via refs.
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
  }, [handleNativeTouchStart, handleNativeTouchMove, handleNativeTouchEnd]);

  if (!hasGrid || !player) return null;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020617] touch-none" onContextMenu={(e) => e.preventDefault()}>
      <div className="absolute inset-0 pointer-events-none z-0">
         <MemoizedBackground variant="GAME" />
         <div className="absolute inset-0 bg-slate-950/20" />
      </div>

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
            camera={renderCamera}
            dimensions={dimensions}
          />
      </div>

      {isDamageFlashed && (
        <div className="absolute inset-0 z-[15] pointer-events-none bg-rose-500/20 border-[12px] border-rose-600/40 shadow-[inset_0_0_100px_rgba(244,63,94,0.4)] animate-pulse" />
      )}

      <MemoizedGameHUD onCenterPlayer={centerOnPlayer} />
    </div>
  );
};

export default GameView;