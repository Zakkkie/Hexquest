
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Stage } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { getHexKey, hexToPixel } from '../services/hexUtils.ts';
import Background from './Background.tsx';
import GameHUD from './GameHUD.tsx';
import MapRenderer from './MapRenderer.tsx';
import Fireworks from './Fireworks.tsx';
import { audioService } from '../services/audioService.ts';
import { XCircle, CheckCircle, Info } from 'lucide-react';
import { safifyCoord } from '../utils/safeCoordinates.ts';

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
    
    const safePos = safifyCoord(finalX, finalY);

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
  const grid = useGameStore(state => state.session?.grid);
  const player = useGameStore(state => state.session?.player);
  const winCondition = useGameStore(state => state.session?.winCondition);
  const deviceType = useGameStore(state => state.deviceType);
  const lastVisualEvent = useGameStore(state => state.lastVisualEvent);
  const gameStatus = useGameStore(state => state.session?.gameStatus);
  
  const movePlayer = useGameStore(state => state.movePlayer);
  const hideToast = useGameStore(state => state.hideToast);
  const toast = useGameStore(state => state.toast);
  const cancelPendingAction = useGameStore(state => state.cancelPendingAction);
  const tick = useGameStore(state => state.tick);
  
  // HUD State
  const [hoveredHexId, setHoveredHexId] = useState<string | null>(null);

  if (!grid || !player) return null;
  
  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  // RESPONSIVE: Scale Logic based on Device Type
  const getInitialScale = () => {
      switch(deviceType) {
          case 'MOBILE': return 0.65;
          case 'TABLET': return 0.8;
          default: return 1.0;
      }
  };

  // UI OFFSET: Shift center up to avoid Bottom Dock overlap
  // Increased to account for larger bottom dock with status icons
  const getCenterOffset = () => {
      return deviceType === 'MOBILE' ? 120 : 100;
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
  const cullingCameraRef = useRef<CameraState>(initialCamera);
  
  // Render State (Synced from Ref via Animation Loop)
  const [renderCamera, setRenderCamera] = useState<CameraState>(initialCamera);
  const [cullingViewState, setCullingViewState] = useState<CameraState>(initialCamera);
  
  // Interaction State
  const isRotating = useRef(false);
  const isDragging = useRef(false);
  const lastPointerPos = useRef({ x: 0, y: 0 });
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 }); 
  
  const stageRef = useRef<Konva.Stage>(null);
  
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

  // --- AUDIO LIFECYCLE (Start/Stop) ---
  useEffect(() => {
      audioService.startMusic();
      return () => { audioService.stopMusic(); };
  }, []);

  // --- AUDIO DYNAMICS ---
  useEffect(() => {
      if (player && winCondition) {
          audioService.updateMusic(player.coins, winCondition.targetCoins || 500);
      }
  }, [player.coins, winCondition]);

  // --- SCREEN SHAKE TRIGGER ---
  useEffect(() => {
      if (lastVisualEvent?.type === 'ENTROPY_SHIFT') {
          let duration = 600;
          let start = Date.now();
          const shakeAnim = new Konva.Animation((frame) => {
              const now = Date.now();
              const elapsed = now - start;
              if (elapsed > duration) {
                  setShakeOffset({ x: 0, y: 0 });
                  shakeAnim.stop();
                  return;
              }
              const progress = elapsed / duration;
              const intensity = 10 * (1 - progress); 
              const dx = (Math.random() - 0.5) * intensity * 2;
              const dy = (Math.random() - 0.5) * intensity * 2;
              setShakeOffset({ x: dx, y: dy });
          }, stageRef.current?.getLayer()); 
          
          shakeAnim.start();
          return () => { shakeAnim.stop(); };
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

  // --- OPTIMIZED RESIZE HANDLER ---
  useEffect(() => {
    let resizeFrame: number;
    const handleResize = () => {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = requestAnimationFrame(() => {
            setDimensions({ width: window.innerWidth, height: window.innerHeight });
        });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- PHYSICS CAMERA LOOP ---
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
          const dampingScale = 0.1;
          const dampingRot = isUserInteracting ? 0.4 : 0.08;

          // Interpolate
          const nextX = lerp(current.x, target.x, dampingPos);
          const nextY = lerp(current.y, target.y, dampingPos);
          const nextScale = lerp(current.scale, target.scale, dampingScale);
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
          
          // Sync React State (Triggers Render)
          // This ensures render is synced with AnimationFrame
          setRenderCamera(nextState);

          // Update culling state if moved significantly
          const dx = nextState.x - cullingCameraRef.current.x;
          const dy = nextState.y - cullingCameraRef.current.y;
          const ds = nextState.scale - cullingCameraRef.current.scale;
          const dr = nextState.rotation - cullingCameraRef.current.rotation;
          if (Math.abs(dx) > 100 || Math.abs(dy) > 100 || Math.abs(ds) > 0.1 || Math.abs(dr) > 2) {
              cullingCameraRef.current = nextState;
              setCullingViewState(nextState);
          }

      }, stageRef.current?.getLayer());

      anim.start();
      return () => { anim.stop(); };
  }, []); 

  const rotateCamera = useCallback((direction: 'left' | 'right') => {
      const current = targetCameraRef.current;
      const step = 60;
      const currentSnapped = Math.round(current.rotation / step) * step;
      const nextTarget = direction === 'left' ? currentSnapped - step : currentSnapped + step;
      
      const pivot = { x: dimensions.width / 2, y: dimensions.height / 2 };
      const adjustedView = calculateRotationAdjustedView(
          { x: current.x, y: current.y, scale: current.scale },
          pivot,
          current.rotation,
          nextTarget
      );

      targetCameraRef.current = {
          ...current,
          x: adjustedView.x,
          y: adjustedView.y,
          rotation: nextTarget
      };
  }, [dimensions]); 

  const centerOnPlayer = useCallback(() => {
      const rot = currentCameraRef.current.rotation;
      const { x: px, y: py } = hexToPixel(player.q, player.r, rot);
      
      const offset = getCenterOffset();
      
      const tx = (dimensions.width / 2) - (px * targetCameraRef.current.scale);
      const ty = ((dimensions.height / 2) - offset) - (py * targetCameraRef.current.scale);
      
      const safeT = safifyCoord(tx, ty);
      targetCameraRef.current = { ...targetCameraRef.current, x: safeT.x, y: safeT.y };
  }, [player.q, player.r, dimensions, deviceType]);

  const handleHexClick = useCallback((q: number, r: number) => {
      // Prevent click if we were just dragging
      if (isDragging.current) return;
      movePlayer(q, r);
  }, [movePlayer]);

  // --- INPUT HANDLERS (Update Targets Only) ---

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;

    const oldScale = targetCameraRef.current.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Calculate zoom relative to current target, not current visual state (avoids oscillation)
    const mousePointTo = {
      x: (pointer.x - targetCameraRef.current.x) / oldScale,
      y: (pointer.y - targetCameraRef.current.y) / oldScale,
    };

    const scaleBy = 1.1; 
    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.6, Math.min(newScale, 2.5));
    
    if (isNaN(newScale)) newScale = 1.0;

    const newX = pointer.x - mousePointTo.x * newScale;
    const newY = pointer.y - mousePointTo.y * newScale;
    
    const safePos = safifyCoord(newX, newY);
    targetCameraRef.current = { ...targetCameraRef.current, x: safePos.x, y: safePos.y, scale: newScale };
  }, []);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
     if (e.target === e.target.getStage() && !isDragging.current) {
         cancelPendingAction();
     }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      // Left Click (0) = Drag, Right Click (2) = Rotate
      if (e.evt.button === 0) {
          isDragging.current = true;
          lastPointerPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      } else if (e.evt.button === 2) { 
          isRotating.current = true;
          lastPointerPos.current = { x: e.evt.clientX, y: e.evt.clientY };
      }
  };
  
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isDragging.current) {
          const dx = e.evt.clientX - lastPointerPos.current.x;
          const dy = e.evt.clientY - lastPointerPos.current.y;
          lastPointerPos.current = { x: e.evt.clientX, y: e.evt.clientY };

          // Direct update to target
          const nx = targetCameraRef.current.x + dx;
          const ny = targetCameraRef.current.y + dy;
          const safe = safifyCoord(nx, ny);
          
          targetCameraRef.current = { ...targetCameraRef.current, x: safe.x, y: safe.y };
      }
      
      if (isRotating.current) {
          const deltaX = e.evt.clientX - lastPointerPos.current.x;
          lastPointerPos.current = { x: e.evt.clientX, y: e.evt.clientY };
          
          // Use current visual state for pivot math to prevent disorientation
          const current = currentCameraRef.current;
          
          const deltaRot = deltaX * 0.5;
          const newRot = current.rotation + deltaRot;
          
          // Pivot Calculation: Center of the screen
          const pivot = { x: dimensions.width / 2, y: dimensions.height / 2 };
          const adjustedView = calculateRotationAdjustedView(
              { x: current.x, y: current.y, scale: current.scale }, 
              pivot, 
              current.rotation, 
              newRot
          );
          
          // Update Target
          targetCameraRef.current = { 
              ...targetCameraRef.current, 
              x: adjustedView.x, 
              y: adjustedView.y,
              rotation: newRot 
          };
      }
  };
  
  const handleMouseUp = () => {
      isDragging.current = false;
      isRotating.current = false;
      // Do not set setIsInteracting(false) here, let the animation loop detect when velocity settles.
      // This prevents "popping" visual changes.
  };

  // -- Touch Handling --
  const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length === 1) {
        isDragging.current = true;
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
  
  const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      
      if (touches.length === 1 && isDragging.current) {
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
          e.evt.preventDefault();
          
          const p1 = { x: touches[0].clientX, y: touches[0].clientY };
          const p2 = { x: touches[1].clientX, y: touches[1].clientY };
          
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const center = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

          // Using current visual state for smooth pivot
          let current = currentCameraRef.current;
          let newRot = current.rotation;
          
          const dAngle = angle - lastAngle.current;
          if (Math.abs(dAngle) > 1) { 
             newRot = current.rotation + dAngle;
             // Calculate temporary view for pivot
             const pivotRes = calculateRotationAdjustedView({x: current.x, y: current.y, scale: current.scale}, center, current.rotation, newRot);
             current = { ...current, x: pivotRes.x, y: pivotRes.y }; // Local override for scale math below
             lastAngle.current = angle;
          }
          
          const scaleMult = dist / lastDist.current;
          let newScale = current.scale * scaleMult;
          newScale = Math.max(0.6, Math.min(newScale, 2.5));
          if (isNaN(newScale)) newScale = 1.0;

          const worldFocusX = (lastCenter.current.x - current.x) / current.scale;
          const worldFocusY = (lastCenter.current.y - current.y) / current.scale;
          const rawX = center.x - (worldFocusX * newScale);
          const rawY = center.y - (worldFocusY * newScale);
          const safePos = safifyCoord(rawX, rawY);

          // Update Target
          targetCameraRef.current = { x: safePos.x, y: safePos.y, scale: newScale, rotation: newRot };

          lastDist.current = dist;
          lastCenter.current = center;
      }
  };

  const handleTouchEnd = () => {
      isMultitouch.current = false;
      isDragging.current = false;
      lastDist.current = 0;
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020617] touch-none" onContextMenu={(e) => e.preventDefault()}>
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <Background variant="GAME" />
         <div className="absolute inset-0 bg-slate-950/20" />
      </div>

      {/* FIREWORKS */}
      {gameStatus === 'VICTORY' && <Fireworks />}

      {/* CANVAS */}
      <div className="absolute inset-0 z-10">
        <Stage 
          ref={stageRef}
          width={dimensions.width} 
          height={dimensions.height} 
          // Disable native drag to use our physics target system
          draggable={false}
          onWheel={handleWheel} 
          onMouseDown={handleMouseDown} 
          onMouseMove={handleMouseMove} 
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={handleStageClick} 
          onTap={handleStageClick}
          onDragStart={() => setHoveredHexId(null)}
          onContextMenu={(e) => e.evt.preventDefault()} 
          x={renderCamera.x + shakeOffset.x} 
          y={renderCamera.y + shakeOffset.y} 
          scaleX={renderCamera.scale} 
          scaleY={renderCamera.scale}
        >
          <MapRenderer 
            viewState={cullingViewState}
            dimensions={dimensions}
            rotation={renderCamera.rotation}
            onHexClick={handleHexClick}
            onHover={setHoveredHexId}
            hoveredHexId={hoveredHexId}
          />
        </Stage>
      </div>

      {/* TOAST OVERLAY */}
      {toast && (
          <div className="absolute top-[15%] left-0 w-full flex justify-center z-[60] pointer-events-none px-4">
              <div className={`
                  flex items-center gap-2 md:gap-3 px-4 py-3 md:px-6 md:py-4 rounded-2xl md:rounded-full backdrop-blur-md shadow-2xl border
                  animate-in slide-in-from-top-4 duration-300 max-w-[90vw] md:max-w-max
                  ${toast.type === 'error' ? 'bg-red-950/60 border-red-500/50 text-red-100 animate-pulse' : ''}
                  ${toast.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-100' : ''}
                  ${toast.type === 'info' ? 'bg-slate-900/80 border-slate-700 text-white' : ''}
              `}>
                  {toast.type === 'error' && <XCircle className="w-5 h-5 md:w-8 md:h-8 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] shrink-0" />}
                  {toast.type === 'success' && <CheckCircle className="w-5 h-5 md:w-6 md:h-6 text-emerald-500 shrink-0" />}
                  {toast.type === 'info' && <Info className="w-5 h-5 md:w-6 md:h-6 text-blue-400 shrink-0" />}
                  <span className="text-xs md:text-lg font-black uppercase tracking-wider md:tracking-widest leading-tight drop-shadow-md text-center md:text-left break-words">{toast.message}</span>
              </div>
          </div>
      )}

      <GameHUD 
        hoveredHexId={hoveredHexId} 
        onRotateCamera={rotateCamera} 
        onCenterPlayer={centerOnPlayer} 
      />

    </div>
  );
};

export default GameView;
