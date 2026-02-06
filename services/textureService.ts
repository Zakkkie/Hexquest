
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

    // --- PALETTE DEFINITIONS ---
    let base = '#000000';
    let detail = '#000000';
    let highlight = '#000000';
    let styleMode: 'CORE' | 'LAVA' | 'ROCK' | 'METAL' | 'GEM' | 'EMERALD' | 'PURE' = 'METAL';

    if (level <= -8) {
        // -10 to -8: THE CORE (Blinding Heat)
        base = '#fff7ed'; // White-orange
        detail = '#ffedd5'; 
        highlight = '#fdba74';
        styleMode = 'CORE';
    } else if (level <= -5) {
        // -7 to -5: MAGMA (Flowing Lava)
        base = '#7f1d1d'; // Dark Red base
        detail = '#ef4444'; // Red Lava
        highlight = '#f97316'; // Orange glow
        styleMode = 'LAVA';
    } else if (level <= -1) {
        // -4 to -1: CRUST (Rock with cracks)
        base = '#1c1917'; // Stone darker
        detail = '#292524'; // Stone lighter
        highlight = '#7f1d1d'; // Deep red cracks
        styleMode = 'ROCK';
    } else if (level === 0) {
        // 0: FOUNDATION (Industrial Floor)
        base = '#1e293b'; 
        detail = '#334155'; 
        highlight = '#475569';
        styleMode = 'METAL';
    } else if (level <= 3) {
        // 1 to 3: REFINED METAL (Steel/Titanium)
        base = '#334155';
        detail = '#475569';
        highlight = '#94a3b8'; // Shiny
        styleMode = 'METAL';
    } else if (level <= 6) {
        // 4 to 6: PRECIOUS GEMS (Sapphire/Amethyst - Angular)
        base = '#312e81'; // Indigo
        detail = '#4338ca'; 
        highlight = '#818cf8'; 
        styleMode = 'GEM';
    } else if (level <= 9) {
        // 7 to 9: EMERALD (High Energy)
        base = '#064e3b'; // Dark Green
        detail = '#059669'; 
        highlight = '#34d399'; // Bright Green
        styleMode = 'EMERALD';
    } else {
        // 10: SINGULARITY (Diamond/Light)
        base = '#f8fafc'; 
        detail = '#e2e8f0'; 
        highlight = '#38bdf8'; // Cyan tint
        styleMode = 'PURE';
    }

    // Background Fill
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, size, size);

    if (type === 'TOP') {
        switch (styleMode) {
            case 'CORE': this.drawCore(ctx, size, base, detail, highlight, seed); break;
            case 'LAVA': this.drawLava(ctx, size, base, detail, highlight, seed); break;
            case 'ROCK': this.drawRock(ctx, size, base, detail, highlight, seed); break;
            case 'METAL': this.drawMetal(ctx, size, base, detail, highlight, seed, level); break;
            case 'GEM': this.drawGem(ctx, size, base, detail, highlight, seed, level); break;
            case 'EMERALD': this.drawEmerald(ctx, size, base, detail, highlight, seed, level); break;
            case 'PURE': this.drawPure(ctx, size, base, detail, highlight, seed); break;
        }
    } else {
        this.drawGenericSide(ctx, size, base, detail, highlight, styleMode);
    }

    return canvas;
  }

  // --- DRAWING STRATEGIES ---

  private drawCore(ctx: CanvasRenderingContext2D, size: number, base: string, detail: string, highlight: string, seed: number) {
      // Chaotic plasma noise
      for (let i = 0; i < 200; i++) {
          const x = Math.random() * size;
          const y = Math.random() * size;
          const s = Math.random() * 4;
          ctx.fillStyle = Math.random() > 0.5 ? highlight : detail;
          ctx.globalAlpha = 0.5;
          ctx.beginPath();
          ctx.arc(x, y, s, 0, Math.PI*2);
          ctx.fill();
      }
      ctx.globalAlpha = 1.0;
  }

  private drawLava(ctx: CanvasRenderingContext2D, size: number, base: string, detail: string, highlight: string, seed: number) {
      // Wavy bands
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      
      for (let i = 0; i < 5; i++) {
          ctx.strokeStyle = i % 2 === 0 ? detail : highlight;
          ctx.beginPath();
          const startY = (i * size / 5) + (seed % 10);
          ctx.moveTo(0, startY);
          ctx.bezierCurveTo(
              size * 0.3, startY - 10 + (seed % 20), 
              size * 0.7, startY + 10 - (seed % 20), 
              size, startY
          );
          ctx.stroke();
      }
  }

  private drawRock(ctx: CanvasRenderingContext2D, size: number, base: string, detail: string, highlight: string, seed: number) {
      // Random angular rocks
      ctx.fillStyle = detail;
      for(let i=0; i<5; i++) {
          const w = 10 + (seed * i * 738) % 20;
          const h = 10 + (seed * i * 991) % 20;
          const x = (seed * i * 31) % (size - w);
          const y = (seed * i * 47) % (size - h);
          ctx.fillRect(x, y, w, h);
      }
      
      // Magma Cracks
      ctx.strokeStyle = highlight; // Red/Glow
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(size/2, size/2);
      for(let i=0; i<3; i++) {
          const angle = ((seed + i) * 123) % 360;
          const r = size * 0.6;
          ctx.lineTo(size/2 + Math.cos(angle)*r, size/2 + Math.sin(angle)*r);
          ctx.moveTo(size/2, size/2);
      }
      ctx.stroke();
  }

  private drawMetal(ctx: CanvasRenderingContext2D, size: number, base: string, detail: string, highlight: string, seed: number, level: number) {
      ctx.strokeStyle = detail;
      ctx.lineWidth = 1;
      
      if (level === 0) {
          // Industrial Grid
          ctx.strokeRect(0, 0, size, size);
          ctx.beginPath();
          ctx.moveTo(0, 0); ctx.lineTo(size, size);
          ctx.stroke();
      } else {
          // Plating
          ctx.fillStyle = detail;
          const inset = 4;
          ctx.fillRect(inset, inset, size - inset*2, size - inset*2);
          
          // Visual Differentiation for Levels 1, 2, 3
          
          // Level 2: Reinforced Cross/Stripe
          if (level === 2) {
              ctx.strokeStyle = highlight;
              ctx.globalAlpha = 0.3;
              ctx.beginPath();
              // Diagonal hatch
              for(let i=-size; i<size; i+=8) {
                  ctx.moveTo(i, 0); ctx.lineTo(i+size, size);
              }
              ctx.stroke();
              ctx.globalAlpha = 1.0;
              
              // Inner plate
              ctx.fillStyle = base; // Darker center
              ctx.fillRect(inset + 8, inset + 8, size - (inset+8)*2, size - (inset+8)*2);
          }

          // Rivets / Lights
          ctx.fillStyle = level > 2 ? '#38bdf8' : highlight; // Blue lights for high metal (L3)
          
          const s = 3;
          ctx.fillRect(inset + 2, inset + 2, s, s);
          ctx.fillRect(size - inset - 2 - s, inset + 2, s, s);
          ctx.fillRect(size - inset - 2 - s, size - inset - 2 - s, s, s);
          ctx.fillRect(inset + 2, size - inset - 2 - s, s, s);
      }
  }

  private drawGem(ctx: CanvasRenderingContext2D, size: number, base: string, detail: string, highlight: string, seed: number, level: number) {
      // Facets
      const cx = size / 2;
      const cy = size / 2;
      
      ctx.fillStyle = detail;
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(size, cy);
      ctx.lineTo(cx, size);
      ctx.lineTo(0, cy);
      ctx.fill();

      ctx.fillStyle = highlight;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      
      // Variation by Level
      if (level === 6) {
          // Star Cut
          for(let i=0; i<8; i+=2) {
              ctx.moveTo(cx, cy);
              const angle = (i * Math.PI / 4);
              ctx.lineTo(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
          }
      } else if (level === 5) {
          // Central Hex Facet
          const r = size * 0.4;
          for(let i=0; i<6; i++) {
              const angle = i * Math.PI / 3;
              if (i===0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
              else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
          }
          ctx.closePath();
      } else {
          // Standard Split (Level 4)
          ctx.moveTo(cx, cy);
          if (seed % 2 === 0) {
              ctx.lineTo(size, cy);
              ctx.lineTo(cx, size);
          } else {
              ctx.lineTo(0, cy);
              ctx.lineTo(cx, 0);
          }
      }
      ctx.fill();
      ctx.globalAlpha = 1.0;
      
      // Edges
      ctx.strokeStyle = highlight;
      ctx.lineWidth = 1;
      ctx.strokeRect(10, 10, size-20, size-20);
  }

  private drawEmerald(ctx: CanvasRenderingContext2D, size: number, base: string, detail: string, highlight: string, seed: number, level: number) {
      const cx = size / 2;
      const cy = size / 2;
      
      // Glowing Core
      ctx.shadowColor = highlight;
      ctx.shadowBlur = level === 9 ? 25 : 15; // L9 Brighter
      ctx.fillStyle = level === 9 ? highlight : detail; // L9 Filled Core
      
      ctx.beginPath();
      const r = size * (level === 9 ? 0.4 : 0.3);
      for (let i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3;
          ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
      }
      ctx.fill();
      ctx.shadowBlur = 0;

      // Circuit lines
      ctx.strokeStyle = highlight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + (seed % 2 === 0 ? size : -size), cy);
      ctx.stroke();

      // Level 8: Double Ring
      if (level >= 8) {
          ctx.beginPath();
          const r2 = size * 0.55;
          for (let i = 0; i < 6; i++) {
              const angle = i * Math.PI / 3;
              ctx.lineTo(cx + r2 * Math.cos(angle), cy + r2 * Math.sin(angle));
          }
          ctx.closePath();
          ctx.strokeStyle = detail;
          ctx.stroke();
      }
  }

  private drawPure(ctx: CanvasRenderingContext2D, size: number, base: string, detail: string, highlight: string, seed: number) {
      const cx = size / 2;
      const cy = size / 2;
      
      // Radiant burst
      ctx.strokeStyle = detail;
      ctx.lineWidth = 1;
      
      for(let i=0; i<8; i++) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          const angle = (i * Math.PI / 4) + (seed * 0.1);
          ctx.lineTo(cx + size * Math.cos(angle), cy + size * Math.sin(angle));
          ctx.stroke();
      }
      
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = highlight;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(cx, cy, size * 0.2, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;
  }

  private drawGenericSide(ctx: CanvasRenderingContext2D, size: number, base: string, detail: string, highlight: string, mode: string) {
      const grad = ctx.createLinearGradient(0, 0, 0, size);
      grad.addColorStop(0, detail); 
      grad.addColorStop(1, base);   
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);

      // Add texture vertical lines
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.moveTo(size * 0.2, 0); ctx.lineTo(size * 0.2, size);
      ctx.moveTo(size * 0.8, 0); ctx.lineTo(size * 0.8, size);
      ctx.stroke();
      
      if (mode === 'LAVA' || mode === 'CORE') {
          // Glow at bottom
          ctx.fillStyle = highlight;
          ctx.globalAlpha = 0.3;
          ctx.fillRect(0, size * 0.8, size, size * 0.2);
          ctx.globalAlpha = 1.0;
      }
  }
}

export const textureService = TextureService.getInstance();
