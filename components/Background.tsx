
import React, { useRef, useEffect, memo } from 'react';

interface BackgroundProps {
  variant?: 'MENU' | 'GAME';
}

const HEX_SIZE = 40;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

const Background: React.FC<BackgroundProps> = ({ variant = 'MENU' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;

    const TARGET_FPS = variant === 'MENU' ? 60 : 30; 
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastFrameTime = 0;

    // Starfield for Game Mode
    const stars: { x: number; y: number; size: number; alpha: number; speed: number }[] = [];
    if (variant === 'GAME') {
        const starCount = 150;
        for(let i=0; i<starCount; i++) {
            stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2,
                alpha: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.2
            });
        }
    }

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight * (variant === 'MENU' ? 1.5 : 1.0);
      }
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    const drawHex = (x: number, y: number, size: number, color: string, height: number, strokeColor: string) => {
      // Static rotation 30 degrees for standard pointy top look
      const rotationDeg = 0; 
      
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle_deg = 60 * i + 30 + rotationDeg;
        const angle_rad = Math.PI / 180 * angle_deg;
        ctx.lineTo(x + size * Math.cos(angle_rad), y + size * Math.sin(angle_rad));
      }
      ctx.closePath();
      
      ctx.fillStyle = color;
      ctx.fill();

      // Inner highlight based on height/breathing
      if (height > 0.2) {
        ctx.beginPath();
        const innerSize = size * (1 - height * 0.5); 
        for (let i = 0; i < 6; i++) {
          const angle_deg = 60 * i + 30 + rotationDeg;
          const angle_rad = Math.PI / 180 * angle_deg;
          ctx.lineTo(x + innerSize * Math.cos(angle_rad), y + innerSize * Math.sin(angle_rad));
        }
        ctx.closePath();
        ctx.fillStyle = `rgba(255, 255, 255, ${height * 0.2})`;
        ctx.fill();
      }

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 1 + height * 2;
      ctx.stroke();
    };

    const render = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(render);
      
      const elapsed = timestamp - lastFrameTime;
      if (elapsed < FRAME_INTERVAL) return;

      lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);
      time += 0.0001 * elapsed; 
      
      // Neutral Dark Background
      ctx.fillStyle = '#020617'; 
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (variant === 'GAME') {
          // --- GAME MODE: STATIC NEUTRAL STARFIELD ---
          ctx.fillStyle = '#ffffff';
          stars.forEach(star => {
              ctx.globalAlpha = star.alpha;
              ctx.beginPath();
              ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
              ctx.fill();
              
              // Very slow parallax drift
              star.y -= star.speed;
              if (star.y < 0) star.y = canvas.height;
          });
          ctx.globalAlpha = 1.0;
      } else {
          // --- MENU MODE: BREATHING HEXES (No Rotation) ---
          const numCols = Math.ceil(canvas.width / HEX_WIDTH) + 2;
          const numRows = Math.ceil(canvas.height / (HEX_HEIGHT * 0.75)) + 4;
          const flyOffset = (time * 20) % (HEX_HEIGHT * 1.5);

          for (let r = -2; r < numRows; r++) {
            for (let q = -2; q < numCols; q++) {
               const xOffset = (r % 2) * (HEX_WIDTH / 2);
               const cx = q * HEX_WIDTH + xOffset;
               const cy = r * (HEX_HEIGHT * 0.75) + flyOffset;

               const h1 = Math.sin(q * 0.3 + time) * Math.cos(r * 0.2 - time);
               const h2 = Math.sin(q * 0.7 - time * 2) * Math.cos(r * 0.5 + time);
               const rawH = (h1 + h2) / 2; 
               const height = Math.max(0, rawH);

               let color = '#0f172a'; 
               let stroke = `rgba(71, 85, 105, ${0.2 + height * 0.3})`;

               if (height > 0.6) color = '#1e3a8a';
               if (height > 0.8) color = '#b45309';
               
               // Passed 0 rotation to keep them static
               drawHex(cx, cy, HEX_SIZE, color, height, stroke);
            }
          }
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [variant]);

  return <canvas ref={canvasRef} className="w-full h-full block" />;
};

export default memo(Background);
