
import { ItemRarity } from '../types';

class ItemRenderer {
  private static instance: ItemRenderer;
  private cache: Map<string, HTMLCanvasElement> = new Map();

  private readonly SIZE = 64;
  private readonly CENTER = 32;

  private constructor() {}

  public static getInstance(): ItemRenderer {
    if (!ItemRenderer.instance) {
      ItemRenderer.instance = new ItemRenderer();
    }
    return ItemRenderer.instance;
  }

  public getItemImage(visualType: string, color: string, rarity: ItemRarity): HTMLCanvasElement {
    const key = `${visualType}_${color}_${rarity}`;
    
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = this.SIZE;
    canvas.height = this.SIZE;
    const ctx = canvas.getContext('2d')!;

    // Background Glow
    const gradient = ctx.createRadialGradient(this.CENTER, this.CENTER, 5, this.CENTER, this.CENTER, 30);
    gradient.addColorStop(0, `${color}66`); // Transparent center
    gradient.addColorStop(1, 'transparent');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.SIZE, this.SIZE);

    ctx.translate(this.CENTER, this.CENTER);
    this.drawItem(ctx, visualType, color);

    this.cache.set(key, canvas);
    return canvas;
  }

  private drawItem(ctx: CanvasRenderingContext2D, type: string, color: string) {
      ctx.fillStyle = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      switch(type) {
          case 'CYLINDER':
              ctx.beginPath();
              ctx.ellipse(0, 10, 8, 4, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.strokeRect(-8, -10, 16, 20);
              ctx.fillStyle = 'rgba(255,255,255,0.2)';
              ctx.fillRect(-6, -5, 12, 10); // Liquid
              break;
          case 'CHIP':
              ctx.beginPath();
              ctx.moveTo(0, -12); ctx.lineTo(12, 12); ctx.lineTo(-12, 12);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#000';
              ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(5, 5); ctx.stroke(); // Crack
              break;
          case 'BOX':
              ctx.fillRect(-10, -8, 20, 16);
              ctx.fillStyle = '#000';
              ctx.fillRect(-8, -6, 16, 12); // Dark inside
              break;
          case 'PATCH':
              ctx.globalAlpha = 0.8;
              ctx.beginPath();
              ctx.moveTo(-10, -5); ctx.lineTo(10, -10); ctx.lineTo(5, 10); ctx.lineTo(-5, 5);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              break;
          case 'SCANNER':
              ctx.strokeRect(-10, -10, 20, 16);
              ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(0, 14); ctx.stroke(); // Handle
              ctx.fillStyle = '#000'; ctx.fillRect(-8, -8, 16, 12); // Screen
              ctx.fillStyle = color; ctx.beginPath(); ctx.arc(-2, -2, 2, 0, Math.PI*2); ctx.fill(); // Blip
              break;
          case 'PRISM':
              ctx.globalAlpha = 0.6;
              ctx.beginPath();
              ctx.moveTo(0, -14); ctx.lineTo(12, 6); ctx.lineTo(0, 14); ctx.lineTo(-12, 6);
              ctx.closePath();
              ctx.fill();
              ctx.stroke();
              break;
          case 'DRILL':
              ctx.beginPath();
              ctx.moveTo(-6, -12); ctx.lineTo(6, -12); ctx.lineTo(0, 14);
              ctx.closePath();
              ctx.fill();
              ctx.strokeStyle = '#000';
              ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(4, -4); ctx.moveTo(-2, 0); ctx.lineTo(2, 4); ctx.stroke();
              break;
          case 'GENERATOR':
              ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.stroke();
              ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(0, 10); ctx.moveTo(-10, 0); ctx.lineTo(10, 0); ctx.stroke();
              break;
          case 'PARTICLES':
              for(let i=0; i<5; i++) {
                  ctx.beginPath(); 
                  ctx.arc(Math.random()*20-10, Math.random()*20-10, 2, 0, Math.PI*2); 
                  ctx.fill();
              }
              break;
          case 'SPINE':
              for(let i=-2; i<=2; i++) {
                  ctx.fillRect(-6, i*5, 12, 3);
              }
              ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(0, 10); ctx.stroke();
              break;
          case 'CORE':
              ctx.shadowBlur = 20;
              ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
              ctx.strokeStyle = '#fff'; ctx.beginPath(); ctx.arc(0,0, 12, 0, Math.PI*2); ctx.stroke();
              break;
          case 'SKULL':
              ctx.beginPath();
              ctx.arc(0, -2, 10, Math.PI, 0); // Top
              ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.lineTo(-10, -2);
              ctx.fill();
              ctx.fillStyle = '#000';
              ctx.fillRect(-4, -2, 3, 3); ctx.fillRect(1, -2, 3, 3); // Eyes
              break;
      }
  }
}

export const itemRenderer = ItemRenderer.getInstance();
