import React, { useEffect, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { hexToPixel } from '../services/hexUtils.ts';

const OverworldMinimap: React.FC = () => {
  const { overworld } = useGameStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !overworld.isGenerated) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const width = canvasRef.current.width;
    const height = canvasRef.current.height;
    
    ctx.clearRect(0, 0, width, height);
    
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = 0.1; // Scale down hexToPixel coordinates
    
    // Get player pixel position to center the map
    const { x: playerPx, y: playerPy } = hexToPixel(overworld.player.q, overworld.player.r, 0);

    // Draw all hexes
    for (const key in overworld.grid) {
      const hex = overworld.grid[key];
      if (!hex.isRevealed) continue;

      const { x, y } = hexToPixel(hex.q, hex.r, 0);
      
      // Calculate position relative to player
      const px = centerX + (x - playerPx) * scale;
      const py = centerY + (y - playerPy) * scale;

      // Skip drawing if outside canvas
      if (px < -10 || px > width + 10 || py < -10 || py > height + 10) continue;

      ctx.fillStyle = getTerrainColor(hex.terrainType);
      ctx.beginPath();
      ctx.arc(px, py, 2.5, 0, Math.PI * 2);
      ctx.fill();
      
      if (hex.poiId) {
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, Math.PI * 2);
        ctx.fill();
      }
      
      if (hex.riftId) {
        ctx.fillStyle = '#a855f7';
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw player in center
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

  }, [overworld.grid, overworld.player.q, overworld.player.r, overworld.isGenerated]);

  const getTerrainColor = (type: string) => {
    switch (type) {
      case 'WATER': return '#0284c7';
      case 'PLAINS': return '#4ade80';
      case 'FOREST': return '#166534';
      case 'MOUNTAIN': return '#64748b';
      case 'DESERT': return '#fcd34d';
      case 'SWAMP': return '#3f6212';
      case 'CITY': return '#f8fafc';
      case 'RUINS': return '#9ca3af';
      case 'OUTPOST': return '#ef4444';
      case 'MERCHANT_CAMP': return '#eab308';
      case 'ROAD': return '#78716c';
      default: return '#333';
    }
  };

  return (
    <div className="absolute bottom-28 left-4 md:bottom-32 md:left-6 pointer-events-auto bg-slate-900/80 border border-slate-700 rounded-xl p-1.5 md:p-2 shadow-2xl backdrop-blur-md">
      <canvas 
        ref={canvasRef} 
        width={120} 
        height={120} 
        className="rounded-lg opacity-90 w-[100px] h-[100px] md:w-[150px] md:h-[150px]"
      />
    </div>
  );
};

export default OverworldMinimap;
