
import React, { useRef, useEffect, memo } from 'react';
import { useGameStore } from '../store';

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
    let smoothEntropy = 0;

    const TARGET_FPS = variant === 'MENU' ? 60 : 30; 
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastFrameTime = 0;

    // Starfield for Game Mode
    const stars: { x: number; y: number; size: number; alpha: number; speed: number; angleOffset: number }[] = [];
    if (variant === 'GAME') {
        const starCount = 150;
        for(let i=0; i<starCount; i++) {
            stars.push({
                x: Math.random() * window.innerWidth,
                y: Math.random() * window.innerHeight,
                size: Math.random() * 2,
                alpha: Math.random() * 0.8 + 0.2,
                speed: Math.random() * 0.2,
                angleOffset: Math.random() * Math.PI * 2
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

      if (variant === 'GAME') {
          // Fetch entropy without triggering React re-renders for maximum performance
          const state = useGameStore.getState();
          const entropy = state.session?.entropy;
          let targetDangerRatio = 0;
          if (entropy && entropy.max > 0) {
              const currentRatio = Math.min(1, Math.max(0, entropy.current / entropy.max));
              targetDangerRatio = 1.0 - currentRatio;
          }

          // Smooth interpolation for visual transitions
          smoothEntropy += (targetDangerRatio - smoothEntropy) * 0.05;

          // Background Color Interpolation using a cubic Hermite spline for smoother transitions
          const smoothstep = (x: number) => x * x * (3 - 2 * x);
          
          // Interpolation points: 0.0 (Base), 0.5 (Mid), 1.0 (Crit)
          const base = { r: 2, g: 6, b: 23 };
          const mid = { r: 35, g: 15, b: 35 }; // Adjusted mid-point
          const crit = { r: 60, g: 5, b: 5 };  // Adjusted crit-point
          
          let bgR, bgG, bgB;
          if (smoothEntropy <= 0.5) {
              const f = smoothstep(smoothEntropy * 2);
              bgR = base.r + (mid.r - base.r) * f;
              bgG = base.g + (mid.g - base.g) * f;
              bgB = base.b + (mid.b - base.b) * f;
          } else {
              const f = smoothstep((smoothEntropy - 0.5) * 2);
              bgR = mid.r + (crit.r - mid.r) * f;
              bgG = mid.g + (crit.g - mid.g) * f;
              bgB = mid.b + (crit.b - mid.b) * f;
          }
          
          ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          // Nebula Effects (2 glowing orbs)
          if (smoothEntropy > 0) {
              const w = canvas.width, h = canvas.height;
              // Nebula 1: Slow orbit
              const n1x = w * 0.5 + Math.sin(time * 5) * w * 0.25;
              const n1y = h * 0.5 + Math.cos(time * 3) * h * 0.25;
              const grad1 = ctx.createRadialGradient(n1x, n1y, 0, n1x, n1y, Math.max(w, h) * 0.6);
              grad1.addColorStop(0, `rgba(220, 38, 38, ${0.1 * smoothEntropy})`);
              grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = grad1;
              ctx.fill();
              ctx.fillRect(0, 0, w, h);

              // Nebula 2: Opposite orbit
              const n2x = w * 0.5 + Math.sin(time * 4 + Math.PI) * w * 0.3;
              const n2y = h * 0.5 + Math.cos(time * 6) * h * 0.3;
              const grad2 = ctx.createRadialGradient(n2x, n2y, 0, n2x, n2y, Math.max(w, h) * 0.5);
              grad2.addColorStop(0, `rgba(234, 179, 8, ${0.05 * smoothEntropy})`);
              grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = grad2;
              ctx.fillRect(0, 0, w, h);
          }

          // Starfield
          // Stars shift color from white -> yellow -> red based on entropy
          const sR = Math.floor(255 - smoothEntropy * 35);
          const sG = Math.floor(255 - smoothEntropy * 150);
          const sB = Math.floor(255 - smoothEntropy * 255);
          ctx.fillStyle = `rgb(${sR}, ${sG}, ${sB})`;

          const speedMultiplier = 1 + (smoothEntropy * 8); // Speed up as entropy rises
          const driftX = Math.sin(time * 2) * 0.1 * speedMultiplier; // Slight horizontal sway

          stars.forEach(star => {
              ctx.globalAlpha = star.alpha * (0.8 + Math.sin(time * 10 + star.angleOffset) * 0.2); // Twinkle
              ctx.beginPath();
              ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
              ctx.fill();
              
              star.y -= star.speed * speedMultiplier;
              star.x += driftX;

              if (star.y < 0) {
                  star.y = canvas.height;
                  star.x = Math.random() * canvas.width;
              }
              if (star.x < 0) star.x = canvas.width;
              if (star.x > canvas.width) star.x = 0;
          });
          ctx.globalAlpha = 1.0;

      } else {
          // --- MENU MODE: BREATHING HEXES ---
          ctx.fillStyle = '#020617'; 
          ctx.fillRect(0, 0, canvas.width, canvas.height);

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
