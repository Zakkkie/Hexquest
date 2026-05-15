
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
    const key = `UNIT_${type}_${headIndex}_${bodyIndex}_${color}_v3`; 
    
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

    // Core drop shadow to ground it
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    const hoverY = -12; // Base hovers above ground

    switch(idx) {
        case 0: // The Crawler (Angular Industrial)
            // Left & Right Track pods
            ctx.fillStyle = '#1e293b';
            this.roundRect(ctx, -18, hoverY - 6, 10, 20, 3);
            this.roundRect(ctx, 8, hoverY - 6, 10, 20, 3);
            ctx.fill();
            // Accents
            ctx.fillStyle = color;
            ctx.fillRect(-16, hoverY - 4, 6, 16);
            ctx.fillRect(10, hoverY - 4, 6, 16);
            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.fillRect(-16, hoverY - 4, 2, 16);
            ctx.fillRect(10, hoverY - 4, 2, 16);

            // Center engine block
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(-10, hoverY - 10);
            ctx.lineTo(10, hoverY - 10);
            ctx.lineTo(12, hoverY + 8);
            ctx.lineTo(-12, hoverY + 8);
            ctx.closePath();
            ctx.fill();
            
            // Neon core
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(0, hoverY, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.shadowBlur = 0;
            break;

        case 1: // The Glider (Sleek Hovercraft)
            // Repulsor glow
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = '#10b981';
            ctx.shadowBlur = 10;
            ctx.beginPath(); ctx.ellipse(0, hoverY+8, 12, 4, 0, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;

            // Main chassis (sleek wings)
            const gliderGrad = ctx.createLinearGradient(0, hoverY - 15, 0, hoverY + 5);
            gliderGrad.addColorStop(0, '#ffffff');
            gliderGrad.addColorStop(0.3, color);
            gliderGrad.addColorStop(1, '#020617');
            ctx.fillStyle = gliderGrad;

            ctx.beginPath();
            ctx.moveTo(0, hoverY - 16);
            ctx.lineTo(20, hoverY);
            ctx.lineTo(10, hoverY + 8);
            ctx.lineTo(0, hoverY + 2);
            ctx.lineTo(-10, hoverY + 8);
            ctx.lineTo(-20, hoverY);
            ctx.closePath();
            ctx.fill();

            // Cockpit glass / inner shell
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.moveTo(0, hoverY - 10);
            ctx.lineTo(10, hoverY);
            ctx.lineTo(-10, hoverY);
            ctx.fill();
            
            // Wing accents
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath(); ctx.arc(-16, hoverY, 1.5, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(16, hoverY, 1.5, 0, Math.PI*2); ctx.fill();
            break;

        case 2: // The Monolith (Heavy Box / Shielded)
            // Thruster fire
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath(); ctx.moveTo(-6, hoverY); ctx.lineTo(6, hoverY); ctx.lineTo(0, hoverY + 14); ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.beginPath(); ctx.moveTo(-3, hoverY); ctx.lineTo(3, hoverY); ctx.lineTo(0, hoverY + 8); ctx.fill();

            // Main armor block
            const monoGrad = ctx.createLinearGradient(-15, hoverY - 20, 15, hoverY + 10);
            monoGrad.addColorStop(0, color);
            monoGrad.addColorStop(1, '#020617');
            ctx.fillStyle = monoGrad;
            ctx.fillRect(-14, hoverY - 18, 28, 22);
            
            // Highlights
            ctx.fillStyle = 'rgba(255,255,255,0.15)';
            ctx.fillRect(-14, hoverY - 18, 28, 2);
            ctx.fillRect(-14, hoverY - 18, 2, 22);

            // Tech panels
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-10, hoverY - 14, 20, 6);
            ctx.fillRect(-10, hoverY - 4, 20, 4);
            
            // Core
            ctx.fillStyle = '#e2e8f0';
            ctx.fillRect(-2, hoverY - 12, 4, 10);
            break;

        case 3: // The Prism (Ethereal Crystal)
            // Floating pieces
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(-16, hoverY - 10); ctx.lineTo(-11, hoverY - 4); ctx.lineTo(-20, hoverY + 2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(16, hoverY - 10); ctx.lineTo(11, hoverY - 4); ctx.lineTo(20, hoverY + 2); ctx.fill();

            // Main crystal
            const prismGrad = ctx.createLinearGradient(0, hoverY - 20, 0, hoverY + 15);
            prismGrad.addColorStop(0, '#ffffff');
            prismGrad.addColorStop(0.2, color);
            prismGrad.addColorStop(0.8, '#1e293b');
            prismGrad.addColorStop(1, '#000000');
            ctx.fillStyle = prismGrad;

            ctx.beginPath();
            ctx.moveTo(0, hoverY - 22);
            ctx.lineTo(12, hoverY - 2);
            ctx.lineTo(0, hoverY + 14);
            ctx.lineTo(-12, hoverY - 2);
            ctx.closePath();
            ctx.fill();

            // Crystal highlight
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.moveTo(0, hoverY - 22);
            ctx.lineTo(-12, hoverY - 2);
            ctx.lineTo(0, hoverY + 14);
            ctx.closePath();
            ctx.fill();
            break;
    }
  }

  private drawHead(ctx: CanvasRenderingContext2D, index: number, color: string, isPlayer: boolean) {
    const idx = Math.abs(index) % 4;
    const eyeColor = isPlayer ? '#22d3ee' : '#f43f5e'; // Cyan for player, Rose/Red for bot
    
    // Position head on top of the hover body
    const headY = -24; 

    switch(idx) {
        case 0: // Radar Dome
            ctx.fillStyle = '#1e293b';
            ctx.beginPath(); ctx.arc(0, headY, 10, Math.PI, 0); ctx.fill();
            ctx.fillRect(-10, headY, 20, 5);

            // Antenna
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-6, headY - 8); ctx.lineTo(-10, headY - 18); ctx.stroke();
            ctx.fillStyle = eyeColor;
            ctx.beginPath(); ctx.arc(-10, headY - 18, 1.5, 0, Math.PI*2); ctx.fill();
            
            // Sensor Eye
            ctx.fillStyle = eyeColor;
            ctx.shadowColor = eyeColor;
            ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(0, headY - 4, 3, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            break;
            
        case 1: // Tactical Visor
            // Armored collar
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.moveTo(-8, headY + 6); ctx.lineTo(8, headY + 6); ctx.lineTo(12, headY); ctx.lineTo(-12, headY); ctx.fill();
            
            // Main head
            const tacGrad = ctx.createLinearGradient(0, headY - 12, 0, headY);
            tacGrad.addColorStop(0, '#334155');
            tacGrad.addColorStop(1, '#0f172a');
            ctx.fillStyle = tacGrad;
            ctx.beginPath(); ctx.moveTo(-10, headY); ctx.lineTo(10, headY); ctx.lineTo(6, headY - 12); ctx.lineTo(-6, headY - 12); ctx.fill();
            
            // Visor
            ctx.fillStyle = eyeColor;
            ctx.shadowColor = eyeColor;
            ctx.shadowBlur = 8;
            ctx.fillRect(-8, headY - 5, 16, 3);
            ctx.shadowBlur = 0;
            break;

        case 2: // The Core Tower
            // Cylinder
            const cylGrad = ctx.createLinearGradient(-8, 0, 8, 0);
            cylGrad.addColorStop(0, '#1e293b');
            cylGrad.addColorStop(0.5, color);
            cylGrad.addColorStop(1, '#1e293b');
            ctx.fillStyle = cylGrad;
            this.roundRect(ctx, -8, headY - 14, 16, 20, 2);
            ctx.fill();

            // Horizontal scan lines
            ctx.fillStyle = '#0f172a';
            ctx.fillRect(-8, headY - 10, 16, 2);
            ctx.fillRect(-8, headY - 5, 16, 2);
            ctx.fillRect(-8, headY, 16, 2);

            // Vertical eye slit
            ctx.fillStyle = eyeColor;
            ctx.shadowColor = eyeColor;
            ctx.shadowBlur = 5;
            ctx.fillRect(-2, headY - 12, 4, 14);
            ctx.shadowBlur = 0;
            break;

        case 3: // Omni-Drone
            // Flattened disc
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.ellipse(0, headY - 4, 14, 8, 0, 0, Math.PI*2); ctx.fill();
            
            ctx.fillStyle = '#0f172a';
            ctx.beginPath(); ctx.ellipse(0, headY - 4, 10, 5, 0, 0, Math.PI*2); ctx.fill();

            // Central eye array
            ctx.fillStyle = eyeColor;
            ctx.shadowColor = eyeColor;
            ctx.shadowBlur = 6;
            ctx.beginPath(); ctx.arc(0, headY - 4, 3, 0, Math.PI*2); ctx.fill();
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath(); ctx.arc(0, headY - 4, 1, 0, Math.PI*2); ctx.fill();

            // Orbiting nodes
            ctx.fillStyle = '#38bdf8';
            ctx.beginPath(); ctx.arc(-16, headY - 4, 2, 0, Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.arc(16, headY - 4, 2, 0, Math.PI*2); ctx.fill();
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
