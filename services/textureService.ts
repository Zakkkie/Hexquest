

export class TextureService {
  private static instance: TextureService;
  // Cache key: level_variationIndex (e.g. "5_0", "5_1", etc.)
  private cacheTop: Map<string, HTMLCanvasElement> = new Map();
  private cacheSide: Map<number, HTMLCanvasElement> = new Map();

  private constructor() {}

  public static getInstance(): TextureService {
    if (!TextureService.instance) {
      TextureService.instance = new TextureService();
    }
    return TextureService.instance;
  }

  public getTexture(level: number, q: number = 0, r: number = 0): HTMLCanvasElement {
    const clampedLevel = Math.max(-10, Math.min(10, level));
    // Increase variations to ensure map looks organic
    const variationCount = 6; 
    const variationIndex = Math.abs((q * 73856093 ^ r * 19349663) % variationCount);
    const key = `${clampedLevel}_${variationIndex}`;

    if (this.cacheTop.has(key)) {
      return this.cacheTop.get(key)!;
    }
    
    const canvas = this.generateTexture(clampedLevel, 'TOP', variationIndex);
    this.cacheTop.set(key, canvas);
    return canvas;
  }

  public getSideTexture(level: number): HTMLCanvasElement {
    const clampedLevel = Math.max(-10, Math.min(10, level));
    if (this.cacheSide.has(clampedLevel)) {
      return this.cacheSide.get(clampedLevel)!;
    }
    const canvas = this.generateTexture(clampedLevel, 'SIDE', 0);
    this.cacheSide.set(clampedLevel, canvas);
    return canvas;
  }

  private generateTexture(level: number, type: 'TOP' | 'SIDE', seed: number): HTMLCanvasElement {
    const size = 64; 
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d', { alpha: false })!;

    if (type === 'SIDE') {
        this.drawSide(ctx, size, level);
        return canvas;
    }

    // --- TOP TEXTURE ---
    if (level > 0) {
        this.drawPositive(ctx, size, level, seed);
    } else if (level < 0) {
        this.drawNegative(ctx, size, level, seed);
    } else {
        this.drawNeutral(ctx, size);
    }

    return canvas;
  }

  // === POSITIVE STYLE: Strictly Bound Level Indicators ===
  private drawPositive(ctx: CanvasRenderingContext2D, size: number, level: number, seed: number) {
      let baseColor = '#0f172a'; // Default Dark Slate
      let accentColor = '#38bdf8'; // Default Cyan

      if (level <= 3) {
          // TECH (1-3): Industrial/Clean
          baseColor = '#1e293b'; // Slate 800
          accentColor = '#0ea5e9'; // Sky Blue
      } else if (level <= 7) {
          // CYBER (4-7): High Tech
          baseColor = '#1e1b4b'; // Indigo 950
          accentColor = '#a855f7'; // Purple
      } else {
          // ASCENDED (8-10): Elite
          baseColor = '#271a0c'; // Deep Bronze
          accentColor = '#fbbf24'; // Amber
      }

      // 1. Background
      ctx.fillStyle = baseColor;
      ctx.fillRect(0, 0, size, size);

      const grad = ctx.createLinearGradient(0, 0, size, size);
      grad.addColorStop(0, 'rgba(255,255,255,0.03)');
      grad.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // 2. Strict Level Identification (Symbols)
      ctx.fillStyle = accentColor;
      
      const cx = size / 2;
      const cy = size / 2;
      
      // Visual Logic: 
      // Levels 1-3: Circles
      // Levels 4-6: Squares
      // Levels 7-9: Diamonds
      // Level 10: Star
      
      const count = level > 9 ? 1 : ((level - 1) % 3) + 1;
      const gap = 10;
      const startX = cx - ((count - 1) * gap) / 2;

      for (let i = 0; i < count; i++) {
          const x = startX + i * gap;
          
          ctx.beginPath();
          if (level <= 3) {
              ctx.arc(x, cy, 3.5, 0, Math.PI*2);
              ctx.fill();
          } else if (level <= 6) {
              ctx.fillRect(x - 3.5, cy - 3.5, 7, 7);
          } else if (level <= 9) {
              ctx.moveTo(x, cy - 5);
              ctx.lineTo(x + 5, cy);
              ctx.lineTo(x, cy + 5);
              ctx.lineTo(x - 5, cy);
              ctx.fill();
          } else {
              // Level 10
              ctx.font = '24px monospace';
              ctx.fillStyle = accentColor;
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillText('★', cx, cy + 2);
          }
      }

      // 3. Border Highlight
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1;
      ctx.strokeRect(1, 1, size-2, size-2);
      
      // 4. Subtle Texture Variation (Seed-based but non-intrusive)
      if (seed % 2 === 0) {
          ctx.beginPath();
          ctx.moveTo(size, 0); ctx.lineTo(size-8, 0); ctx.lineTo(size, 8);
          ctx.fill();
      }
  }

  // === NEGATIVE STYLE: Depth Indicators ===
  private drawNegative(ctx: CanvasRenderingContext2D, size: number, level: number, seed: number) {
      let base = '#1c1917';
      let highlight = '#44403c';

      if (level <= -8) {
          base = '#fff7ed'; highlight = '#ffffff';
      } else if (level <= -4) {
          base = '#450a0a'; highlight = '#ef4444';
      } else {
          base = '#292524'; highlight = '#57534e';
      }

      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);

      // Depth Rings indicating Level Magnitude
      const depth = Math.abs(level);
      ctx.strokeStyle = highlight;
      ctx.lineWidth = 2;
      const cx = size / 2;
      const cy = size / 2;
      
      // Cap at 5 rings
      const rings = Math.min(5, depth);
      for(let i=0; i<rings; i++) {
          const r = 24 - (i * 4);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI*2);
          ctx.stroke();
      }

      // Vignette
      const grad = ctx.createRadialGradient(cx, cy, size*0.3, cx, cy, size);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grad;
      ctx.fillRect(0,0,size,size);
  }

  // === NEUTRAL STYLE (L0) ===
  private drawNeutral(ctx: CanvasRenderingContext2D, size: number) {
      ctx.fillStyle = '#1e293b'; // Slate 800
      ctx.fillRect(0, 0, size, size);
      
      // Crosshair
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const cx = size/2, cy = size/2;
      const len = 4;
      ctx.moveTo(cx-len, cy); ctx.lineTo(cx+len, cy);
      ctx.moveTo(cx, cy-len); ctx.lineTo(cx, cy+len);
      ctx.stroke();
  }

  // === SIDE TEXTURES ===
  private drawSide(ctx: CanvasRenderingContext2D, size: number, level: number) {
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      
      if (level > 0) {
          grad.addColorStop(0, '#334155'); 
          grad.addColorStop(1, '#020617'); 
      } else if (level < 0) {
          if (level <= -8) {
              grad.addColorStop(0, '#fb923c'); 
              grad.addColorStop(1, '#450a0a');
          } else {
              grad.addColorStop(0, '#44403c'); 
              grad.addColorStop(1, '#0c0a09');
          }
      } else {
          grad.addColorStop(0, '#475569');
          grad.addColorStop(1, '#1e293b');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Striations
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(16, 0, 2, size);
      ctx.fillRect(48, 0, 2, size);
  }
}

export const textureService = TextureService.getInstance();
