
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
    const variationCount = 4; 
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
    
    // Add procedural noise to simulate texture file grain
    this.applyNoise(ctx, size);

    return canvas;
  }

  private applyNoise(ctx: CanvasRenderingContext2D, size: number) {
      const imgData = ctx.getImageData(0, 0, size, size);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
          const noise = (Math.random() - 0.5) * 10; // +/- 5 value shift
          data[i] = Math.max(0, Math.min(255, data[i] + noise));
          data[i+1] = Math.max(0, Math.min(255, data[i+1] + noise));
          data[i+2] = Math.max(0, Math.min(255, data[i+2] + noise));
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
  private drawPositive(ctx: CanvasRenderingContext2D, size: number, level: number, seed: number) {
      let baseColor = '#0f172a'; 
      let accentColor = '#38bdf8';
      let secColor = '#0284c7';

      if (level <= 3) {
          // TECH (1-3): Cyan / Industrial
          baseColor = '#0f172a'; // Slate 900
          accentColor = '#0ea5e9'; // Sky 500
          secColor = '#0369a1'; // Sky 700
      } else if (level <= 7) {
          // CYBER (4-7): Purple / Neon
          baseColor = '#1e1b4b'; // Indigo 950
          accentColor = '#a855f7'; // Purple 500
          secColor = '#7e22ce'; // Purple 700
      } else {
          // ASCENDED (8-10): Gold / Elite
          baseColor = '#271a0c'; // Bronze
          accentColor = '#fbbf24'; // Amber 400
          secColor = '#d97706'; // Amber 600
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
      // We render crisp symbols, noise will be applied after to settle them in
      if (level === 1) {
          ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI*2); ctx.fill();
      } else if (level === 2) {
          ctx.fillRect(cx-5, cy-5, 10, 10);
      } else if (level === 3) {
          ctx.beginPath();
          ctx.moveTo(cx, cy-6); ctx.lineTo(cx+6, cy+5); ctx.lineTo(cx-6, cy+5);
          ctx.fill();
      } else if (level <= 6) {
          ctx.strokeStyle = accentColor;
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI*2); ctx.stroke();
          if (level >= 5) { ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI*2); ctx.fill(); } 
          if (level === 6) { ctx.beginPath(); ctx.moveTo(cx-10, cy); ctx.lineTo(cx+10, cy); ctx.moveTo(cx, cy-10); ctx.lineTo(cx, cy+10); ctx.stroke(); } 
      } else {
          ctx.font = 'bold 24px monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(level >= 9 ? '★' : '◆', cx, cy + 2);
      }
      
      // 5. Tech Decor
      ctx.fillStyle = secColor;
      ctx.fillRect(cx-2, 4, 4, 4);
      ctx.fillRect(cx-2, size-8, 4, 4);
  }

  // === NEGATIVE STYLE: Excavation Pits ===
  private drawNegative(ctx: CanvasRenderingContext2D, size: number, level: number, seed: number) {
      let base = '#1c1917';
      let stroke = '#44403c';
      
      if (level <= -4) { base = '#450a0a'; stroke = '#991b1b'; } 
      if (level <= -8) { base = '#fff7ed'; stroke = '#fb923c'; } 

      const cx = size / 2;
      const cy = size / 2;

      ctx.fillStyle = base;
      ctx.fillRect(0, 0, size, size);

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
  private drawNeutral(ctx: CanvasRenderingContext2D, size: number) {
      ctx.fillStyle = '#1e293b'; 
      ctx.fillRect(0, 0, size, size);
      
      const cx = size/2;
      const cy = size/2;

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      this.drawHexagon(ctx, cx, cy, 28);
      ctx.stroke();

      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx-4, cy); ctx.lineTo(cx+4, cy);
      ctx.moveTo(cx, cy-4); ctx.lineTo(cx, cy+4);
      ctx.stroke();
  }

  // === SIDE TEXTURES: Strata ===
  private drawSide(ctx: CanvasRenderingContext2D, size: number, level: number) {
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      
      if (level > 0) {
          grad.addColorStop(0, '#475569'); 
          grad.addColorStop(1, '#0f172a'); 
      } else if (level < 0) {
          if (level <= -4) {
              grad.addColorStop(0, '#b91c1c'); 
              grad.addColorStop(1, '#450a0a');
          } else {
              grad.addColorStop(0, '#57534e'); 
              grad.addColorStop(1, '#1c1917');
          }
      } else {
          grad.addColorStop(0, '#475569');
          grad.addColorStop(1, '#1e293b');
      }

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
}

export const textureService = TextureService.getInstance();
