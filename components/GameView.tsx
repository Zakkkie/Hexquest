
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Stage } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { getHexKey, hexToPixel } from '../services/hexUtils.ts';
import Background from './Background.tsx';
import GameHUD from './GameHUD.tsx';
import MapRenderer from './MapRenderer.tsx';
import { audioService } from '../services/audioService.ts';
import { XCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const GameView: React.FC = () => {
  const grid = useGameStore(state => state.session?.grid);
  const player = useGameStore(state => state.session?.player);
  const winCondition = useGameStore(state => state.session?.winCondition);
  const deviceType = useGameStore(state => state.deviceType);
  
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
          case 'MOBILE': return 0.65; // Increased from 0.55 for better touch targets
          case 'TABLET': return 0.8;
          default: return 1.0;
      }
  };
  
  // Actual Camera Position (for Render)
  const [viewState, setViewState] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: getInitialScale() });
  
  // Target Camera Position (for Smooth Follow Logic)
  const targetViewRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  
  const [cameraRotation, setCameraRotation] = useState(0);
  const cameraRotationRef = useRef(0); // Stable ref for callbacks to avoid re-creating functions
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 }); 
  
  const targetRotationRef = useRef(0); 
  const isRotating = useRef(false);
  const lastMouseX = useRef(0);
  const stageRef = useRef<Konva.Stage>(null);
  const animationRef = useRef<Konva.Animation>(null);

  // Multi-touch refs
  const lastDist = useRef<number>(0);
  const lastCenter = useRef<{ x: number; y: number } | null>(null);
  const lastAngle = useRef<number>(0);
  const isMultitouch = useRef(false);
  
  // Sync Ref with State
  useEffect(() => {
      cameraRotationRef.current = cameraRotation;
  }, [cameraRotation]);

  // Update scale when device type changes
  useEffect(() => {
     setViewState(prev => ({ ...prev, scale: getInitialScale() }));
  }, [deviceType]);

  // --- AUDIO LIFECYCLE (Start/Stop) ---
  useEffect(() => {
      // Start music only once when the GameView mounts
      audioService.startMusic();
      
      return () => {
          // Stop music only when GameView unmounts (returning to menu)
          audioService.stopMusic();
      };
  }, []); // Empty dependency array ensures this runs once

  // --- AUDIO DYNAMICS (Update Intensity) ---
  useEffect(() => {
      if (player && winCondition) {
          // Update intensity without restarting the engine
          audioService.updateMusic(player.coins, winCondition.targetCoins || 500);
      }
  }, [player.coins, winCondition]);

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

  useEffect(() => {
    const handleResize = () => setDimensions({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- SMOOTH CAMERA LOOP ---
  useEffect(() => {
      const anim = new Konva.Animation((frame) => {
          if (!frame) return;
          
          setViewState(prev => {
              // If user is actively multi-touching, skip spring physics to allow direct control
              if (isMultitouch.current) return prev;

              const targetX = targetViewRef.current.x;
              const targetY = targetViewRef.current.y;
              
              const damping = 0.08; 
              
              if (Math.abs(targetX - prev.x) < 0.5 && Math.abs(targetY - prev.y) < 0.5) {
                  return prev;
              }

              return {
                  ...prev,
                  x: prev.x + (targetX - prev.x) * damping,
                  y: prev.y + (targetY - prev.y) * damping
              };
          });
      }, stageRef.current?.getLayer());

      anim.start();
      animationRef.current = anim;

      return () => { anim.stop(); };
  }, []);

  // --- SYNC TARGET TO PLAYER ---
  useEffect(() => {
      // Do not auto-center if user is interacting via touch
      if (isMultitouch.current) return;

      const { x: px, y: py } = hexToPixel(player.q, player.r, cameraRotation);
      
      const targetX = (dimensions.width / 2) - (px * viewState.scale);
      const targetY = (dimensions.height / 2) - (py * viewState.scale);
      
      targetViewRef.current = { x: targetX, y: targetY };
      
      if (Math.abs(viewState.x - targetX) > 2000) {
          setViewState(prev => ({ ...prev, x: targetX, y: targetY }));
      }

  }, [player.q, player.r, cameraRotation, dimensions, viewState.scale]);

  const rotateCamera = useCallback((direction: 'left' | 'right') => {
      // Use Ref to get start position without adding dependency
      const startRot = cameraRotationRef.current;
      const currentTarget = targetRotationRef.current;
      
      const step = 60;
      // Snap to nearest step relative to target, not current visual rotation
      const currentSnapped = Math.round(currentTarget / step) * step;
      const nextTarget = direction === 'left' ? currentSnapped - step : currentSnapped + step;
      
      const startTime = performance.now();
      const duration = 400; 

      const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
          
          const newRot = startRot + (nextTarget - startRot) * ease;
          
          setCameraRotation(newRot);
          targetRotationRef.current = nextTarget; 

          if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
  }, []); // Empty dependency array = Stable Function Reference

  const centerOnPlayer = useCallback(() => {
      // Use Ref for calculation to avoid dependency
      const rot = cameraRotationRef.current;
      const { x: px, y: py } = hexToPixel(player.q, player.r, rot);
      // Note: We use current dimensions/scale from closure or ref? 
      // Ideally these should be refs too if strict stability is needed, 
      // but re-creating this function on resize/zoom is acceptable compared to rotation loop.
      // For now, letting it depend on dimensions/scale is fine as they don't change during rotation animation.
      const tx = (dimensions.width / 2) - (px * viewState.scale);
      const ty = (dimensions.height / 2) - (py * viewState.scale);
      targetViewRef.current = { x: tx, y: ty };
  }, [player.q, player.r, dimensions, viewState.scale]);

  const handleHexClick = useCallback((q: number, r: number) => {
      movePlayer(q, r);
  }, [movePlayer]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const scaleBy = 1.1;
    const oldScale = viewState.scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - viewState.x) / oldScale,
      y: (pointer.y - viewState.y) / oldScale,
    };
    let newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    newScale = Math.max(0.4, Math.min(newScale, 2.5));
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    
    setViewState({ x: newPos.x, y: newPos.y, scale: newScale });
    targetViewRef.current = { x: newPos.x, y: newPos.y }; 
  }, [viewState]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
     if (e.target === e.target.getStage()) {
         cancelPendingAction();
     }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
     if (!isRotating.current && !isMultitouch.current) {
        const x = e.target.x();
        const y = e.target.y();
        setViewState(prev => ({ ...prev, x, y }));
        targetViewRef.current = { x, y };
     }
  };
  
  // -- Mouse Rotation Handlers --
  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (e.evt.button === 2) { 
          isRotating.current = true;
          lastMouseX.current = e.evt.clientX;
          if(stageRef.current) stageRef.current.draggable(false);
      }
  };
  
  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isRotating.current) {
          const deltaX = e.evt.clientX - lastMouseX.current;
          lastMouseX.current = e.evt.clientX;
          setCameraRotation(prev => prev + deltaX * 0.5);
      }
  };
  
  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (isRotating.current) {
          isRotating.current = false;
          if(stageRef.current) stageRef.current.draggable(true);
      }
  };

  // -- Advanced Touch Handlers (Pinch & Rotate) --
  const handleTouchStart = (e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;
    if (touches.length === 2) {
      isMultitouch.current = true;
      if(stageRef.current) stageRef.current.draggable(false);
      
      const p1 = { x: touches[0].clientX, y: touches[0].clientY };
      const p2 = { x: touches[1].clientX, y: touches[1].clientY };
      
      lastDist.current = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      lastCenter.current = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
      lastAngle.current = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;
    }
  };
  
  const handleTouchMove = (e: Konva.KonvaEventObject<TouchEvent>) => {
      const touches = e.evt.touches;
      if (touches.length === 2 && lastCenter.current) {
          e.evt.preventDefault(); // Stop browser zoom
          
          const p1 = { x: touches[0].clientX, y: touches[0].clientY };
          const p2 = { x: touches[1].clientX, y: touches[1].clientY };
          
          const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
          const center = { x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2 };
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) * 180 / Math.PI;

          // Rotation with Threshold (prevent accidental rotation while zooming)
          const dAngle = angle - lastAngle.current;
          // Only rotate if the gesture is significant (> 2 degrees) to avoid jitter
          if (Math.abs(dAngle) > 2) {
             setCameraRotation(prev => prev + dAngle);
             lastAngle.current = angle;
          }
          
          // Scale Logic
          const scaleMult = dist / lastDist.current;
          let newScale = viewState.scale * scaleMult;
          newScale = Math.max(0.4, Math.min(newScale, 2.5));

          // Pan (Zoom relative to center point of fingers)
          // 1. Calculate where the center point is in "world space" using OLD scale/pos
          const worldFocusX = (lastCenter.current.x - viewState.x) / viewState.scale;
          const worldFocusY = (lastCenter.current.y - viewState.y) / viewState.scale;
          
          // 2. Calculate NEW view position so that worldFocus is still under the NEW center
          // Panning delta from finger movement
          const dx = center.x - lastCenter.current.x;
          const dy = center.y - lastCenter.current.y;

          // New position calculation:
          // We want: (center.x - newViewX) / newScale = worldFocusX
          // So: newViewX = center.x - (worldFocusX * newScale)
          
          const newX = center.x - (worldFocusX * newScale);
          const newY = center.y - (worldFocusY * newScale);

          setViewState({ x: newX, y: newY, scale: newScale });
          targetViewRef.current = { x: newX, y: newY }; // Sync target to stop drift

          lastDist.current = dist;
          lastCenter.current = center;
      }
  };

  const handleTouchEnd = () => {
      isMultitouch.current = false;
      if(stageRef.current) stageRef.current.draggable(true);
      lastDist.current = 0;
  };

  return (
    // Added touch-none to prevent browser gestures on mobile
    <div className="relative h-full w-full overflow-hidden bg-[#020617] touch-none" onContextMenu={(e) => e.preventDefault()}>
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <Background variant="GAME" />
         <div className="absolute inset-0 bg-slate-950/20" />
      </div>

      {/* CANVAS */}
      <div className="absolute inset-0 z-10">
        <Stage 
          ref={stageRef}
          width={dimensions.width} 
          height={dimensions.height} 
          draggable
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
          onDragEnd={handleDragEnd}
          onContextMenu={(e) => e.evt.preventDefault()} 
          x={viewState.x + shakeOffset.x} 
          y={viewState.y + shakeOffset.y} 
          scaleX={viewState.scale} 
          scaleY={viewState.scale}
        >
          <MapRenderer 
            viewState={viewState}
            dimensions={dimensions}
            rotation={cameraRotation}
            onHexClick={handleHexClick}
            onHover={setHoveredHexId}
            hoveredHexId={hoveredHexId}
          />
        </Stage>
      </div>

      {/* TOAST OVERLAY */}
      {toast && (
          <div className="absolute top-[15%] left-0 w-full flex justify-center z-[60] pointer-events-none">
              <div className={`
                  flex items-center gap-3 px-6 py-4 rounded-full backdrop-blur-md shadow-[0_0_30px_rgba(0,0,0,0.5)] border
                  animate-in slide-in-from-top-4 duration-300
                  ${toast.type === 'error' ? 'bg-red-950/60 border-red-500/50 text-red-100 animate-pulse' : ''}
                  ${toast.type === 'success' ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-100' : ''}
                  ${toast.type === 'info' ? 'bg-slate-900/80 border-slate-700 text-white' : ''}
              `}>
                  {toast.type === 'error' && <XCircle className="w-8 h-8 text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]" />}
                  {toast.type === 'success' && <CheckCircle className="w-6 h-6 text-emerald-500" />}
                  {toast.type === 'info' && <Info className="w-6 h-6 text-blue-400" />}
                  <span className="text-lg font-black uppercase tracking-widest leading-none drop-shadow-md">{toast.message}</span>
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
