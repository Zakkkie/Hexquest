
import { resourceService } from './resourceService';

class TextureService {
  private static instance: TextureService;

  // 1. Добавляем статическое свойство класса в самый верх (после private static instance)
  private static readonly noiseTable: number[] = Array.from({ length: 4096 }, () => (Math.random() - 0.5) * 10);

  private constructor() {}

  public static getInstance(): TextureService {
    if (!TextureService.instance) {
      TextureService.instance = new TextureService();
    }
    return TextureService.instance;
  }

  public getTexture(level: number, q: number = 0, r: number = 0, terrainType?: string, poiId?: string): HTMLCanvasElement {
    const clampedLevel = Math.max(-10, Math.min(10, level));
    const variationCount = 4; 
    const variationIndex = Math.abs((q * 73856093 ^ r * 19349663) % variationCount);
    
    // Unique Key for Shared Cache
    const key = `HEX_TOP_${clampedLevel}_${variationIndex}_${terrainType || 'NONE'}_${poiId || 'NONE'}`;

    return resourceService.getOrCreate(key, () => 
        this.generateTexture(clampedLevel, 'TOP', variationIndex, terrainType, poiId)
    );
  }

  public getSideTexture(level: number, terrainType?: string, poiId?: string): HTMLCanvasElement {
    const clampedLevel = Math.max(-10, Math.min(10, level));
    const key = `HEX_SIDE_${clampedLevel}_${terrainType || 'NONE'}_${poiId || 'NONE'}`;
    
    return resourceService.getOrCreate(key, () => 
        this.generateTexture(clampedLevel, 'SIDE', 0, terrainType, poiId)
    );
  }

  /**
   * Pre-generates common textures to avoid stutter during gameplay.
   * Useful for the loading screen.
   */
  public preload(onProgress: (progress: number) => void): Promise<void> {
    return new Promise((resolve) => {
      const levels = [-2, -1, 0, 1, 2, 3, 4];
      const variants = [0, 1, 2, 3];
      const terrainTypes = ['STANDARD'];
      
      const tasks: (() => void)[] = [];

      // Top textures for common levels and variants
      for (const level of levels) {
        for (const variant of variants) {
          tasks.push(() => this.getTexture(level, variant, 0));
        }
      }

      // Side textures for common levels
      for (const level of levels) {
        tasks.push(() => this.getSideTexture(level));
      }

      // Special terrain textures
      for (const t of terrainTypes) {
        tasks.push(() => this.getTexture(0, 0, 0, t));
        tasks.push(() => this.getSideTexture(0, t));
      }

      let completed = 0;
      const total = tasks.length;

      const processBatch = () => {
        const batchSize = 5;
        for (let i = 0; i < batchSize && tasks.length > 0; i++) {
          const task = tasks.shift()!;
          task();
          completed++;
        }

        onProgress(completed / total);

        if (tasks.length > 0) {
          requestAnimationFrame(processBatch);
        } else {
          resolve();
        }
      };

      requestAnimationFrame(processBatch);
    });
  }

  private generateTexture(level: number, type: 'TOP' | 'SIDE', seed: number, terrainType?: string, poiId?: string): HTMLCanvasElement {
    const size = 64; 
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    // Request an alpha channel but we will fill it opaque
    const ctx = canvas.getContext('2d')!;

    if (type === 'TOP') {
        const cx = size / 2;
        const cy = size / 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60 + 30) * Math.PI / 180;
            const px = cx + 32 * Math.cos(angle);
            const py = cy + 32 * Math.sin(angle);
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.clip();
    }

    if (type === 'SIDE') {
        this.drawSide(ctx, size, level, terrainType, poiId);
        return canvas;
    }

    // --- TOP TEXTURE ---
    if (poiId === 'CORE') {
        this.drawCore(ctx, size, level, seed);
    } else if (level > 0) {
        this.drawPositive(ctx, size, level, seed, terrainType, poiId);
    } else if (level < 0) {
        this.drawNegative(ctx, size, level, seed, terrainType, poiId);
    } else {
        this.drawNeutral(ctx, size, seed, terrainType, poiId);
    }
    
    // Add procedural noise to simulate texture file grain
    this.applyNoise(ctx, size);

    return canvas;
  }

  private applyNoise(ctx: CanvasRenderingContext2D, size: number) {
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      const table = TextureService.noiseTable;
      const tableLength = table.length;
      
      // Шаг цикла 4, оптимизируем обращение к индексам шума
      for (let i = 0; i < data.length; i += 4) {
          if (data[i + 3] === 0) continue; // Skip fully transparent pixels
          const noise = table[(i >> 2) % tableLength]; 
          
          data[i]     = Math.max(0, Math.min(255, data[i] + noise));
          data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
          data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
          // leave alpha as is
      }
      ctx.putImageData(imgData, 0, 0);
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number) {
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
          const angle = (i * 60 + 30) * Math.PI / 180;
          const px = x + radius * Math.cos(angle);
          const py = y + radius * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
      }
      ctx.closePath();
  }

  // === POSITIVE STYLE: Tech Panels ===
  private drawPositive(ctx: CanvasRenderingContext2D, size: number, level: number, _seed: number, terrainType?: string, poiId?: string) {
      let baseColor = '#0f172a'; 
      let accentColor = '#38bdf8';
      let secColor = '#0284c7';

      if (terrainType || poiId) {
          const colors = this.getTerrainColors(terrainType || 'STANDARD', poiId);
          baseColor = colors.base;
          accentColor = colors.accent;
          secColor = colors.sec;
      } else {
          // DISTINCT LEVEL COLORS (Gradient Approach)
          switch(level) {
              // TECH (Blue/Cyan Gradient)
              case 1: 
                  baseColor = '#0f172a'; accentColor = '#0ea5e9'; secColor = '#0369a1'; break;
              case 2: 
                  baseColor = '#172554'; accentColor = '#3b82f6'; secColor = '#1d4ed8'; break;
              case 3: 
                  baseColor = '#1e3a8a'; accentColor = '#60a5fa'; secColor = '#2563eb'; break;
              
              // CYBER (Indigo/Purple Gradient)
              case 4: 
                  baseColor = '#312e81'; accentColor = '#818cf8'; secColor = '#4338ca'; break;
              case 5: 
                  baseColor = '#4c1d95'; accentColor = '#a78bfa'; secColor = '#6d28d9'; break;
              case 6: 
                  baseColor = '#581c87'; accentColor = '#c084fc'; secColor = '#7e22ce'; break;
              case 7: 
                  baseColor = '#701a75'; accentColor = '#e879f9'; secColor = '#a21caf'; break;

              // ASCENDED (Gold Gradient)
              case 8: 
                  baseColor = '#451a03'; accentColor = '#f59e0b'; secColor = '#b45309'; break;
              case 9: 
                  baseColor = '#713f12'; accentColor = '#fbbf24'; secColor = '#d97706'; break;
              default: // 10+
                  baseColor = '#854d0e'; accentColor = '#fcd34d'; secColor = '#eab308'; break;
          }
      }

      const cx = size / 2;
      const cy = size / 2;

      // 1. Base Background
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, size, size);

      // 2. Scanlines (Tech Feel)
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      for(let i=0; i<size; i+=4) {
          ctx.fillRect(0, i, size, 1);
      }

      // 3. The "Stroke Along The Edge" (Inner Hex Border)
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 3;
      this.drawHexagon(ctx, cx, cy, 28);
      ctx.stroke();

      // Inner thin highlight for depth
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      this.drawHexagon(ctx, cx, cy, 26);
      ctx.stroke();

      // 4. Central Rank Symbol
      ctx.fillStyle = accentColor;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 2;
      
      if (level === 1) {
          // Circle
          ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill();
      } else if (level === 2) {
          // Square
          ctx.fillRect(cx-6, cy-6, 12, 12);
      } else if (level === 3) {
          // Triangle
          ctx.beginPath();
          ctx.moveTo(cx, cy-8); ctx.lineTo(cx+8, cy+6); ctx.lineTo(cx-8, cy+6);
          ctx.fill();
      } else if (level === 4) {
          // Diamond
          ctx.beginPath();
          ctx.moveTo(cx, cy-9); ctx.lineTo(cx+9, cy); ctx.lineTo(cx, cy+9); ctx.lineTo(cx-9, cy);
          ctx.fill();
      } else if (level === 5) {
          // Pentagon
          ctx.beginPath();
          for(let i=0; i<5; i++) {
              const a = (i * 72 - 90) * Math.PI / 180;
              const px = cx + 9 * Math.cos(a);
              const py = cy + 9 * Math.sin(a);
              if(i===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.fill();
      } else if (level === 6) {
          // Hexagon (Small)
          this.drawHexagon(ctx, cx, cy, 9);
          ctx.fill();
      } else if (level === 7) {
          // Double Ring
          ctx.beginPath(); ctx.arc(cx, cy, 9, 0, Math.PI*2); ctx.stroke();
          ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI*2); ctx.fill();
      } else if (level === 8) {
          // Star (equivalent to '★')
          ctx.beginPath();
          for (let i = 0; i < 10; i++) {
              const r = i % 2 === 0 ? 9 : 4;
              const a = (i * 36 - 90) * Math.PI / 180;
              const px = cx + r * Math.cos(a);
              const py = cy + r * Math.sin(a);
              if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
      } else if (level === 9) {
          // Diamond inside a square outline (equivalent to '◈')
          ctx.beginPath();
          ctx.moveTo(cx, cy-9); ctx.lineTo(cx+9, cy); ctx.lineTo(cx, cy+9); ctx.lineTo(cx-9, cy);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx-5, cy-5, 10, 10);
      } else if (level === 10) {
          // Double Concentric Hexagons (equivalent to 'Ω')
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1.5;
          this.drawHexagon(ctx, cx, cy, 9);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(cx, cy, 4, 0, Math.PI * 2);
          ctx.fill();
      } else {
          // Level 11+: Central core with rays (equivalent to '☼')
          ctx.beginPath();
          ctx.arc(cx, cy, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let i = 0; i < 8; i++) {
              const a = (i * 45) * Math.PI / 180;
              ctx.moveTo(cx + 6 * Math.cos(a), cy + 6 * Math.sin(a));
              ctx.lineTo(cx + 10 * Math.cos(a), cy + 10 * Math.sin(a));
          }
          ctx.stroke();
      }
      
      // 5. Tech Decor (Circuitry)
      ctx.strokeStyle = secColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(cx - 20, cy - 15); ctx.lineTo(cx - 10, cy - 15); ctx.lineTo(cx - 10, cy - 25);
      ctx.moveTo(cx + 20, cy + 15); ctx.lineTo(cx + 10, cy + 15); ctx.lineTo(cx + 10, cy + 25);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      ctx.fillStyle = secColor;
      ctx.fillRect(cx-2, 4, 4, 4);
      ctx.fillRect(cx-2, size-8, 4, 4);
  }

  // === NEGATIVE STYLE: Excavation Pits ===
  private drawNegative(ctx: CanvasRenderingContext2D, size: number, level: number, _seed: number, terrainType?: string, poiId?: string) {
      let base = '#1c1917';
      let stroke = '#44403c';
      
      if (terrainType || poiId) {
          const colors = this.getTerrainColors(terrainType || 'STANDARD', poiId);
          base = colors.base;
          stroke = colors.sec;
      } else {
          // GRADIENT LOGIC FOR NEGATIVES
          switch(level) {
              case -1: base = '#292524'; stroke = '#57534e'; break;
              case -2: base = '#1c1917'; stroke = '#44403c'; break;
              case -3: base = '#0c0a09'; stroke = '#292524'; break;
              
              case -4: base = '#450a0a'; stroke = '#991b1b'; break;
              case -5: base = '#7f1d1d'; stroke = '#dc2626'; break;
              case -6: base = '#991b1b'; stroke = '#ef4444'; break;
              case -7: base = '#c2410c'; stroke = '#f97316'; break;
              
              default: base = '#fff7ed'; stroke = '#fb923c'; break; // -8+
          }
      }

      const cx = size / 2;
      const cy = size / 2;

      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);

      // Rocky Texture
      ctx.fillStyle = stroke;
      ctx.globalAlpha = 0.2;
      for(let i=0; i<15; i++) {
          const rx = Math.random() * size;
          const ry = Math.random() * size;
          const rs = 2 + Math.random() * 4;
          ctx.fillRect(rx, ry, rs, rs);
      }
      ctx.globalAlpha = 1.0;

      const depth = Math.abs(level);
      const steps = Math.min(4, depth + 1);
      
      for(let i=0; i<steps; i++) {
          const r = 28 - (i * 6);
          if (r < 0) break;
          ctx.strokeStyle = stroke;
          ctx.lineWidth = i === 0 ? 3 : 1; 
          ctx.globalAlpha = 1.0 - (i * 0.15);
          this.drawHexagon(ctx, cx, cy, r);
          ctx.stroke();
      }
      ctx.globalAlpha = 1.0;

      const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
      grad.addColorStop(0, 'rgba(0,0,0,0.8)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,size,size);
  }

  // === NEUTRAL STYLE (L0) ===
  private drawNeutral(ctx: CanvasRenderingContext2D, size: number, seed: number, terrainType?: string, poiId?: string) {
      let baseColor = '#1e293b';
      let strokeColor = '#334155';

      if (terrainType || poiId) {
          const colors = this.getTerrainColors(terrainType || 'STANDARD', poiId);
          baseColor = colors.base;
          strokeColor = colors.sec;
      }

      ctx.fillStyle = baseColor; 
      ctx.fillRect(0, 0, size, size);
      
      const cx = size/2;
      const cy = size/2;

      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;
      this.drawHexagon(ctx, cx, cy, 28);
      ctx.stroke();

      // Add variety based on seed (shapes instead of crosses)
      ctx.fillStyle = strokeColor;
      ctx.globalAlpha = 0.4;
      const shapeType = seed % 4;
      if (shapeType === 0) {
          ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
      } else if (shapeType === 1) {
          ctx.fillRect(cx-4, cy-4, 8, 8);
      } else if (shapeType === 2) {
          ctx.beginPath(); 
          ctx.moveTo(cx, cy-6); ctx.lineTo(cx+6, cy+4); ctx.lineTo(cx-6, cy+4); 
          ctx.fill();
      } else {
          this.drawHexagon(ctx, cx, cy, 6); 
          ctx.fill();
      }
      ctx.globalAlpha = 1.0;
  }

  // === SIDE TEXTURES: Strata ===
  private drawSide(ctx: CanvasRenderingContext2D, size: number, level: number, terrainType?: string, poiId?: string) {
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      
      let topColor = '#475569';
      let bottomColor = '#0f172a';

      if (terrainType || poiId) {
          const colors = this.getTerrainColors(terrainType || 'STANDARD', poiId);
          topColor = colors.sec;
          bottomColor = colors.base;
      } else {
          if (level > 0) {
              topColor = '#475569'; 
              bottomColor = '#0f172a'; 
          } else if (level < 0) {
              if (level <= -4) {
                  topColor = '#b91c1c'; 
                  bottomColor = '#450a0a';
              } else {
                  topColor = '#57534e'; 
                  bottomColor = '#1c1917';
              }
          } else {
              topColor = '#475569';
              bottomColor = '#1e293b';
          }
      }

      // Ensure we start with a solid fill
      ctx.fillStyle = bottomColor;
      ctx.fillRect(0,0,size,size);

      grad.addColorStop(0, topColor); 
      grad.addColorStop(1, bottomColor); 

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(0, size * 0.3, size, 2);
      ctx.fillRect(0, size * 0.7, size, 2);
      
      this.applyNoise(ctx, size); // Apply noise to sides too
      
      // Edge Highlight (Post-noise)
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(0, 0, 2, size);
      ctx.fillRect(size-2, 0, 2, size);
  }

  private drawCore(ctx: CanvasRenderingContext2D, size: number, _level: number, seed: number) {
      const cx = size / 2;
      const cy = size / 2;

      // 1. Base dark tech background
      ctx.fillStyle = '#090d1a'; // Deep futuristic navy
      ctx.fillRect(0, 0, size, size);

      // 2. High-tech matrix scanlines
      ctx.fillStyle = 'rgba(16, 185, 129, 0.08)'; // subtle matrix green
      for (let i = 0; i < size; i += 3) {
          ctx.fillRect(0, i, size, 1);
      }

      // 3. Glowing neon pink/red outer hex ring
      ctx.strokeStyle = '#f43f5e'; // neon rose
      ctx.lineWidth = 2.5;
      this.drawHexagon(ctx, cx, cy, 27);
      ctx.stroke();

      // Inner cyan protective barrier ring
      ctx.strokeStyle = '#06b6d4'; // bright cyan
      ctx.lineWidth = 1.2;
      this.drawHexagon(ctx, cx, cy, 24);
      ctx.stroke();

      // 4. Energy conduits (power lines running from corners towards the center)
      ctx.strokeStyle = '#f43f5e';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
          const angle = (i * 60 + 30) * Math.PI / 180;
          const px1 = cx + 24 * Math.cos(angle);
          const py1 = cy + 24 * Math.sin(angle);
          const px2 = cx + 12 * Math.cos(angle);
          const py2 = cy + 12 * Math.sin(angle);
          ctx.moveTo(px1, py1);
          ctx.lineTo(px2, py2);
      }
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      // 5. Central Reactor Core (Glowing circular engine)
      const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, 12);
      gradient.addColorStop(0, '#ffffff'); // bright hot center
      gradient.addColorStop(0.3, '#10b981'); // glowing emerald green
      gradient.addColorStop(0.7, '#047857'); // dark emerald
      gradient.addColorStop(1, 'transparent');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();

      // 6. Micro-electronic details or core glyph overlay
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      // Draw 3 rotor blades/segments for nuclear/energy feel
      for (let i = 0; i < 3; i++) {
          const a = (i * 120 + (seed * 15)) * Math.PI / 180;
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, 6, a - 0.3, a + 0.3);
          ctx.closePath();
      }
      ctx.fill();
      ctx.globalAlpha = 1.0;
  }

  private getTerrainColors(type: string, poiId?: string): { base: string, accent: string, sec: string } {
      if (poiId) {
          switch(poiId) {
              case 'city_checkpoint': return { base: '#3f3f46', accent: '#a1a1aa', sec: '#52525b' }; // Gray
          }
      }

      switch(type) {
          case 'STANDARD':      return { base: '#334155', accent: '#94a3b8', sec: '#475569' }; 
          default:              return { base: '#1e293b', accent: '#94a3b8', sec: '#334155' }; 
      }
  }
}

export const textureService = TextureService.getInstance();
