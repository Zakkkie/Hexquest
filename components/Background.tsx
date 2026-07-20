import React, { useRef, useEffect, memo } from 'react';
import { useGameStore } from '../store.ts';

interface BackgroundProps {
  variant?: 'MENU' | 'GAME';
}

const HEX_SIZE = 40;
const HEX_WIDTH = Math.sqrt(3) * HEX_SIZE;
const HEX_HEIGHT = 2 * HEX_SIZE;

// Предрассчитанные точки гексагона для оптимизации (избегаем тригонометрии в цикле)
const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (Math.PI / 180) * (60 * i + 30);
  return { x: HEX_SIZE * Math.cos(angle), y: HEX_SIZE * Math.sin(angle) };
});

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  speed: number;
  angleOffset: number;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

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
    
    // FPS Throttling
    const TARGET_FPS = variant === 'MENU' ? 60 : 30; 
    const FRAME_INTERVAL = 1000 / TARGET_FPS;
    let lastFrameTime = 0;

    let stars: Star[] = [];
    const meteors: Meteor[] = [];

    // Безопасная инициализация размеров с учетом Retina (DPR)
    const setupCanvas = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Ограничиваем 2x для производительности
      const w = window.innerWidth;
      const h = window.innerHeight;
      
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      
      ctx.setTransform(1, 0, 0, 1, 0, 0); // Сброс
      ctx.scale(dpr, dpr);
      
      // Инициализация звезд только при ресайзе или старте
      if (variant === 'GAME') {
        stars = Array.from({ length: 150 }, () => ({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() * 1.5 + 0.5,
          alpha: Math.random() * 0.6 + 0.4,
          speed: Math.random() * 0.2,
          angleOffset: Math.random() * Math.PI * 2
        }));
      }
    };

    setupCanvas();
    window.addEventListener('resize', setupCanvas);

    const drawHex = (x: number, y: number, color: string, height: number, strokeColor: string, lineWidth: number) => {
      ctx.beginPath();
      ctx.moveTo(x + HEX_POINTS[0].x, y + HEX_POINTS[0].y);
      for (let i = 1; i < 6; i++) {
        ctx.lineTo(x + HEX_POINTS[i].x, y + HEX_POINTS[i].y);
      }
      ctx.closePath();
      
      ctx.fillStyle = color;
      ctx.fill();

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Внутреннее свечение
      if (height > 0.3) {
        const innerSize = 1 - height * 0.5;
        ctx.beginPath();
        ctx.moveTo(x + HEX_POINTS[0].x * innerSize, y + HEX_POINTS[0].y * innerSize);
        for (let i = 1; i < 6; i++) {
          ctx.lineTo(x + HEX_POINTS[i].x * innerSize, y + HEX_POINTS[i].y * innerSize);
        }
        ctx.closePath();
        // Используем чистый rgba формат, корректный для alpha:false
        ctx.fillStyle = `rgba(255, 255, 255, ${height * 0.15})`;
        ctx.fill();
      }
    };

    const render = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(render);
      
      const elapsed = timestamp - lastFrameTime;
      if (elapsed < FRAME_INTERVAL) return;

      lastFrameTime = timestamp - (elapsed % FRAME_INTERVAL);
      time += 0.0001 * elapsed; 

      const state = useGameStore.getState();
      const isLiteMode = state.isLiteMode;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Очистка фона (fillRect быстрее чем clearRect для alpha:false)
      if (isLiteMode) {
          ctx.fillStyle = '#020617';
          ctx.fillRect(0, 0, w, h);
          return;
      }

      if (variant === 'GAME') {
          const entropy = state.session?.entropy;
          let targetDangerRatio = 0;
          if (entropy && entropy.max > 0) {
              const currentRatio = Math.min(1, Math.max(0, entropy.current / entropy.max));
              targetDangerRatio = 1.0 - currentRatio;
          }

          smoothEntropy += (targetDangerRatio - smoothEntropy) * 0.05;

          const smoothstep = (x: number) => x * x * (3 - 2 * x);
          
          const base = { r: 2, g: 6, b: 23 };
          const mid = { r: 35, g: 15, b: 35 }; 
          const crit = { r: 60, g: 5, b: 5 };  
          
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
          
          ctx.fillStyle = `rgb(${bgR | 0}, ${bgG | 0}, ${bgB | 0})`; // Побитовое ИЛИ для быстрого округления
          ctx.fillRect(0, 0, w, h);

          // Туманности (Nebula Orbs)
          if (smoothEntropy > 0) {
              const n1x = w * 0.5 + Math.sin(time * 5) * w * 0.25;
              const n1y = h * 0.5 + Math.cos(time * 3) * h * 0.25;
              const grad1 = ctx.createRadialGradient(n1x, n1y, 0, n1x, n1y, Math.max(w, h) * 0.6);
              grad1.addColorStop(0, `rgba(220, 38, 38, ${0.1 * smoothEntropy})`);
              grad1.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = grad1;
              ctx.fillRect(0, 0, w, h);

              const n2x = w * 0.5 + Math.sin(time * 4 + Math.PI) * w * 0.3;
              const n2y = h * 0.5 + Math.cos(time * 6) * h * 0.3;
              const grad2 = ctx.createRadialGradient(n2x, n2y, 0, n2x, n2y, Math.max(w, h) * 0.5);
              grad2.addColorStop(0, `rgba(234, 179, 8, ${0.05 * smoothEntropy})`);
              grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
              ctx.fillStyle = grad2;
              ctx.fillRect(0, 0, w, h);
          }

          // Звезды
          const sR = 255 - (smoothEntropy * 35) | 0;
          const sG = 255 - (smoothEntropy * 150) | 0;
          const sB = 255 - (smoothEntropy * 255) | 0;
          ctx.fillStyle = `rgb(${sR}, ${sG}, ${sB})`;

          const speedMultiplier = 1 + (smoothEntropy * 8);
          const driftX = Math.sin(time * 2) * 0.1 * speedMultiplier;

          for (let i = 0; i < stars.length; i++) {
              const star = stars[i];
              ctx.globalAlpha = star.alpha * (0.8 + Math.sin(time * 10 + star.angleOffset) * 0.2);
              ctx.beginPath();
              ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
              ctx.fill();
              
              star.y -= star.speed * speedMultiplier;
              star.x += driftX;

              if (star.y < 0) {
                  star.y = h;
                  star.x = Math.random() * w;
              }
              if (star.x < 0) star.x = w;
              if (star.x > w) star.x = 0;
          }
          ctx.globalAlpha = 1.0;

          // Метеоры при высокой энтропии (Визуальное улучшение)
          if (smoothEntropy > 0.6 && Math.random() < 0.05) {
              meteors.push({
                  x: Math.random() * w,
                  y: -20,
                  vx: -Math.random() * 4 - 2,
                  vy: Math.random() * 6 + 4,
                  life: 0,
                  maxLife: 60 + Math.random() * 30
              });
          }

          for (let i = meteors.length - 1; i >= 0; i--) {
              const m = meteors[i];
              m.life++;
              m.x += m.vx;
              m.y += m.vy;
              
              if (m.life > m.maxLife || m.y > h) {
                  meteors.splice(i, 1);
                  continue;
              }

              const alpha = 1 - (m.life / m.maxLife);
              ctx.beginPath();
              ctx.moveTo(m.x, m.y);
              ctx.lineTo(m.x - m.vx * 4, m.y - m.vy * 4);
              ctx.strokeStyle = `rgba(255, 100, 100, ${alpha})`;
              ctx.lineWidth = 2;
              ctx.stroke();
          }

          // Виньетка для фокуса (Визуальное улучшение)
          const vignette = ctx.createRadialGradient(w/2, h/2, Math.min(w, h) * 0.3, w/2, h/2, Math.max(w, h) * 0.7);
          vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
          vignette.addColorStop(1, `rgba(0, 0, 0, ${0.6 + smoothEntropy * 0.2})`);
          ctx.fillStyle = vignette;
          ctx.fillRect(0, 0, w, h);

      } else {
          // --- MENU MODE: NEON BREATHING HEXES ---
          ctx.fillStyle = '#020617'; 
          ctx.fillRect(0, 0, w, h);

          // Легкое свечение из центра меню (Визуальное улучшение)
          const centerGlow = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w * 0.5);
          centerGlow.addColorStop(0, 'rgba(31, 41, 55, 0.4)');
          centerGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = centerGlow;
          ctx.fillRect(0, 0, w, h);

          const numCols = Math.ceil(w / HEX_WIDTH) + 2;
          const numRows = Math.ceil(h / (HEX_HEIGHT * 0.75)) + 4;
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
               let stroke = `rgba(71, 85, 105, ${0.2 + height * 0.4})`;
               let lw = 1;

               // Неоновые цвета при высокой "высоте"
               if (height > 0.6) {
                   color = '#1e293b'; 
                   stroke = `rgba(99, 102, 241, ${0.5 + height * 0.3})`; // Индиго
                   lw = 1.5;
               }
               if (height > 0.8) {
                   color = '#1e1b4b'; 
                   stroke = `rgba(129, 140, 248, ${0.6 + height * 0.4})`; // Светлый индиго
                   lw = 2;
               }
               if (height > 0.95) {
                   color = '#312e81'; 
                   stroke = `rgba(199, 210, 254, 0.9)`; // Почти белый
                   lw = 2.5;
               }
               
               drawHex(cx, cy, color, height, stroke, lw);
            }
          }
      }
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', setupCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, [variant]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" />;
};

export default memo(Background);