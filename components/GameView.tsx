
import React, { useEffect, useCallback, useState, useRef } from 'react';
import { Stage } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { getHexKey, hexToPixel } from '../services/hexUtils.ts';
import Background from './Background.tsx';
import GameHUD from './GameHUD.tsx';
import MapRenderer from './MapRenderer.tsx';
import { audioService } from '../services/audioService.ts';

const GameView: React.FC = () => {
  const grid = useGameStore(state => state.session?.grid);
  const player = useGameStore(state => state.session?.player);
  const winCondition = useGameStore(state => state.session?.winCondition);
  const deviceType = useGameStore(state => state.deviceType);
  const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);

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
          case 'MOBILE': return 0.60; // Slightly more zoomed out for mobile context
          case 'TABLET': return 0.8;
          default: return 1.0;
      }
  };
  
  const [viewState, setViewState] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: getInitialScale() });
  const [cameraRotation, setCameraRotation] = useState(0);
  const [shakeOffset, setShakeOffset] = useState({ x: 0, y: 0 }); 
  
  const targetRotationRef = useRef(0); 
  const isRotating = useRef(false);
  const lastMouseX = useRef(0);
  
  // Update scale when device type changes (e.g. rotation)
  useEffect(() => {
     setViewState(prev => ({
         ...prev,
         scale: getInitialScale()
     }));
  }, [deviceType]);

  useEffect(() => {
      audioService.startMusic();
      const playerStats = { coins: player.coins }; 
      if (playerStats && winCondition) {
          audioService.updateMusic(playerStats.coins, winCondition.targetCoins || 500);
      }
      return () => {
          audioService.stopMusic();
      };
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

  const rotateCamera = useCallback((direction: 'left' | 'right') => {
      const step = 60;
      const currentSnapped = Math.round(targetRotationRef.current / step) * step;
      const nextTarget = direction === 'left' ? currentSnapped - step : currentSnapped + step;
      targetRotationRef.current = nextTarget;
      
      const startTime = performance.now();
      const startRot = cameraRotation;
      const duration = 300;

      // PIVOT: Rotate around the player
      const pivotQ = player.q || 0;
      const pivotR = player.r || 0;
      const startPixel = hexToPixel(pivotQ, pivotR, startRot);
      const startViewX = viewState.x;
      const startViewY = viewState.y;
      const scale = viewState.scale;

      const animate = (time: number) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const ease = 1 - (1 - progress) * (1 - progress);
          const newRot = startRot + (nextTarget - startRot) * ease;
          
          // Calculate compensation to keep player centered in relative terms
          const currentPixel = hexToPixel(pivotQ, pivotR, newRot);
          const dx = (startPixel.x - currentPixel.x) * scale;
          const dy = (startPixel.y - currentPixel.y) * scale;

          setViewState(prev => ({
              ...prev,
              x: startViewX + dx,
              y: startViewY + dy
          }));

          setCameraRotation(newRot);
          if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
  }, [cameraRotation, player.q, player.r, viewState]);

  const centerOnPlayer = useCallback(() => {
    const { x: px, y: py } = hexToPixel(player.q, player.r, cameraRotation);
    setViewState(prev => ({
      ...prev,
      x: (dimensions.width / 2) - (px * prev.scale),
      y: (dimensions.height / 2) - (py * prev.scale)
    }));
  }, [player.q, player.r, dimensions, cameraRotation]);

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
  }, [viewState]);

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
     if (e.target === e.target.getStage()) {
         cancelPendingAction();
     }
  };

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 2) { 
        isRotating.current = true;
        lastMouseX.current = e.evt.clientX;
        const stage = e.target.getStage();
        if (stage) stage.draggable(false);
    }
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isRotating.current) {
        const deltaX = e.evt.clientX - lastMouseX.current;
        lastMouseX.current = e.evt.clientX;
        const sensitivity = 0.5;
        
        const oldRot = cameraRotation;
        const newRot = oldRot + deltaX * sensitivity;
        
        // PIVOT: Rotate around player
        const pivotQ = player.q || 0;
        const pivotR = player.r || 0;
        
        const oldPixel = hexToPixel(pivotQ, pivotR, oldRot);
        const newPixel = hexToPixel(pivotQ, pivotR, newRot);
        
        const dx = (oldPixel.x - newPixel.x) * viewState.scale;
        const dy = (oldPixel.y - newPixel.y) * viewState.scale;
        
        setViewState(prev => ({
            ...prev,
            x: prev.x + dx,
            y: prev.y + dy
        }));

        setCameraRotation(newRot);
        targetRotationRef.current = newRot; 
    }
  };

  const handleMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isRotating.current) {
        isRotating.current = false;
        const stage = e.target.getStage();
        if (stage) stage.draggable(true);
    }
  };

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
     if (!isRotating.current && (e.evt as any).touches?.length !== 2) {
        setViewState(prev => ({ ...prev, x: e.target.x(), y: e.target.y() }));
     }
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#020617]" onContextMenu={(e) => e.preventDefault()}>
      
      {/* BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none z-0">
         <Background variant="GAME" />
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] opacity-70" />
      </div>

      {/* CANVAS */}
      <div className="absolute inset-0 z-10">
        <Stage width={dimensions.width} height={dimensions.height} draggable
          onWheel={handleWheel} 
          onMouseDown={handleMouseDown} 
          onMouseMove={handleMouseMove} 
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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

      <GameHUD 
        hoveredHexId={hoveredHexId} 
        onRotateCamera={rotateCamera} 
        onCenterPlayer={centerOnPlayer} 
      />

    </div>
  );
};

export default GameView;
