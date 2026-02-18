
import { EntityType } from '../types';
import { textureCache } from './textureCache';

/**
 * UnitRenderer acts as a virtual asset factory.
 * It pre-renders the vector definitions of characters into cached bitmapped images (Canvases).
 * This allows the game loop to render a single Image object per unit instead of dozens of vector shapes.
 */
class UnitRenderer {
  private static instance: UnitRenderer;

  // Dimensions
  private readonly WIDTH = 64;
  private readonly HEIGHT = 64;
  private readonly CENTER_X = 32;
  private readonly CENTER_Y = 48; // Pivot point near "feet" (now hover point)

  private constructor() {}

  public static getInstance(): UnitRenderer {
    if (!UnitRenderer.instance) {
      UnitRenderer.instance = new UnitRenderer();
    }
    return UnitRenderer.instance;
  }

  public getUnitImage(headIndex: number, bodyIndex: number, color: string, type: EntityType): HTMLCanvasElement {
    // Unique key for cache based on visual parameters
    const key = `UNIT_${type}_${headIndex}_${bodyIndex}_${color}_v2`; 
    
    return textureCache.getOrCreate(key, () => {
        const canvas = document.createElement('canvas');
        canvas.width = this.WIDTH;
        canvas.height = this.HEIGHT;
        const ctx = canvas.getContext('2d', { alpha: true })!;

        // Scaling to fit the 64x64 box nicely, keeping logic similar to original Unit.tsx
        // Original Unit.tsx drew around (0,0). We translate to center.
        ctx.translate(this.CENTER_X, this.CENTER_Y);

        this.drawBody(ctx, bodyIndex, color);
        this.drawHead(ctx, headIndex, color, type === EntityType.PLAYER);
        return canvas;
    });
  }

  private drawBody(ctx: CanvasRenderingContext2D, index: number, color: string) {
    const idx = Math.abs(index) % 4;

    // Common Shadow for floating effect
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 10, 3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hover Offset (Float above the shadow)
    const floatY = -8; 

    switch(idx) {
        case 0: // The Pod (Rounded Capsule)
            // Thruster Glow
            ctx.fillStyle = '#0ea5e9'; // Cyan glow
            ctx.globalAlpha = 0.6;
            ctx.beginPath(); ctx.arc(0, floatY + 12, 6, 0, Math.PI*2); ctx.fill();
            ctx.globalAlpha = 1.0;

            // Main Hull
            ctx.fillStyle = color;
            this.roundRect(ctx, -10, floatY - 20, 20, 30, 8);
            ctx.fill();
            
            // Detail: Vertical Stripe
            ctx.fillStyle = 'rgba(255,255,255,0.2)';
            ctx.fillRect(-3, floatY - 18, 6, 20);
            
            // Detail: Bottom Rim
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-8, floatY + 8, 16, 4);
            break;

        case 1: // The Shard (Inverted Triangle)
            // Hover Field
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-14, floatY - 22);
            ctx.lineTo(14, floatY - 22);
            ctx.lineTo(0, floatY + 12); // Pointy bottom
            ctx.closePath();
            ctx.fill();

            // Detail: Top Tech Plate
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.moveTo(-10, floatY - 22);
            ctx.lineTo(10, floatY - 22);
            ctx.lineTo(0, floatY - 5);
            ctx.fill();
            break;

        case 2: // The Orb (Sphere with Ring)
            // Back Ring
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, floatY - 5, 16, 5, 0, Math.PI, 0); // Bottom half drawn later? No, draw full but layer
            ctx.stroke();

            // Main Orb
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(0, floatY - 10, 11, 0, Math.PI * 2);
            ctx.fill();
            
            // Orb Highlight
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(-3, floatY - 13, 4, 0, Math.PI * 2);
            ctx.fill();

            // Front Ring segment (to make it look like it goes around)
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.ellipse(0, floatY - 5, 16, 5, 0, 0, Math.PI);
            ctx.stroke();
            break;

        case 3: // The Engine (Industrial Thruster)
            // Flame
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(-4, floatY + 5);
            ctx.lineTo(4, floatY + 5);
            ctx.lineTo(0, floatY + 15);
            ctx.fill();

            // Main Block
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-12, floatY - 22);
            ctx.lineTo(12, floatY - 22);
            ctx.lineTo(8, floatY + 5);
            ctx.lineTo(-8, floatY + 5);
            ctx.closePath();
            ctx.fill();

            // Industrial Bands
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(-10, floatY - 15, 20, 4);
            ctx.fillRect(-9, floatY - 2, 18, 4);
            break;
    }
  }

  private drawHead(ctx: CanvasRenderingContext2D, index: number, color: string, isPlayer: boolean) {
    const idx = Math.abs(index) % 4;
    const eyeColor = isPlayer ? '#ffffff' : '#0f172a'; // White for player, Dark for bot
    
    // Offset head position relative to body pivot
    // Floating bodies are a bit lower/different shape, so we position head appropriately
    const headY = -34; 

    ctx.fillStyle = color;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;

    switch(idx) {
        case 0: // Round Helmet
            ctx.beginPath();
            ctx.arc(0, headY, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            // Visor
            ctx.fillStyle = eyeColor;
            ctx.globalAlpha = 0.9;
            this.roundRect(ctx, -5, headY - 2, 10, 4, 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
            break;
        case 1: // Block Head
            this.roundRect(ctx, -7, headY - 8, 14, 14, 2);
            ctx.fill();
            ctx.stroke();
            // Eyes
            ctx.fillStyle = eyeColor;
            ctx.fillRect(-4, headY - 2, 3, 3);
            ctx.fillRect(1, headY - 2, 3, 3);
            break;
        case 2: // Spiky / Crown
            ctx.beginPath();
            ctx.moveTo(-7, headY);
            ctx.lineTo(-5, headY - 11);
            ctx.lineTo(0, headY - 5);
            ctx.lineTo(5, headY - 11);
            ctx.lineTo(7, headY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            // Eye
            ctx.fillStyle = eyeColor;
            ctx.beginPath();
            ctx.arc(0, headY + 2, 2.5, 0, Math.PI * 2);
            ctx.fill();
            break;
        case 3: // Cyclops / Tech
            this.roundRect(ctx, -6, headY - 9, 12, 12, 3);
            ctx.fill();
            // Single Eye
            ctx.fillStyle = '#22d3ee'; // Cyan
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 5;
            ctx.fillRect(-5, headY - 3, 10, 3);
            ctx.shadowBlur = 0;
            break;
    }
  }

  // Helper for rounded rects in canvas
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

export const unitRenderer = UnitRenderer.getInstance();
