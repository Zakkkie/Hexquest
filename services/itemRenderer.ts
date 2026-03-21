
import { ItemRarity } from '../types';
import { textureCache } from './textureCache';

class ItemRenderer {
  private static instance: ItemRenderer;

  private readonly SIZE = 64;
  private readonly CENTER = 32;

  private constructor() {}

  public static getInstance(): ItemRenderer {
    if (!ItemRenderer.instance) {
      ItemRenderer.instance = new ItemRenderer();
    }
    return ItemRenderer.instance;
  }

  public getItemImage(visualType: string, color: string, rarity: ItemRarity, _iconUrl?: string, itemId?: string): HTMLCanvasElement | HTMLImageElement {
    const key = `ITEM_${visualType}_${color}_${rarity}_${itemId || 'none'}_v4`; 
    
    return textureCache.getOrCreate(key, () => {
        const canvas = document.createElement('canvas');
        canvas.width = this.SIZE;
        canvas.height = this.SIZE;
        const ctx = canvas.getContext('2d')!;

        // Background Glow / Aura based on rarity color
        const gradient = ctx.createRadialGradient(this.CENTER, this.CENTER, 8, this.CENTER, this.CENTER, 30);
        gradient.addColorStop(0, `${color}44`); // Transparent center
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.SIZE, this.SIZE);

        ctx.translate(this.CENTER, this.CENTER);
        
        // Crisp lines
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        
        this.drawItem(ctx, visualType, color, itemId);
        return canvas;
    });
  }

  private drawItem(ctx: CanvasRenderingContext2D, type: string, color: string, itemId?: string) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;

      switch(type) {
          case 'CYLINDER':
              // Glass Tube Body
              ctx.lineWidth = 2;
              ctx.strokeStyle = '#94a3b8'; // Slate-400 frame
              
              // Liquid Content (Gradient)
              const liquidGrad = ctx.createLinearGradient(0, 5, 0, 18);
              liquidGrad.addColorStop(0, color);
              liquidGrad.addColorStop(1, '#000');
              
              ctx.fillStyle = liquidGrad;
              ctx.beginPath();
              // Bottom curve
              ctx.ellipse(0, 14, 7, 3, 0, 0, Math.PI * 2); 
              ctx.fill();
              // Main body rect
              ctx.fillRect(-7, 0, 14, 14);
              // Top liquid surface
              ctx.beginPath();
              ctx.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); 
              ctx.fill();

              // Glass casing outline
              ctx.beginPath();
              ctx.moveTo(-9, -12); ctx.lineTo(-9, 14);
              ctx.ellipse(0, 14, 9, 4, 0, 0, Math.PI); // Bottom cap curve
              ctx.lineTo(9, -12);
              ctx.ellipse(0, -12, 9, 4, 0, Math.PI, 0); // Top cap curve
              ctx.stroke();

              // Reflections (Glass effect)
              ctx.fillStyle = 'rgba(255,255,255,0.4)';
              ctx.fillRect(-6, -8, 2, 18);
              ctx.fillRect(3, -8, 1, 18);

              // Metal Caps
              ctx.fillStyle = '#475569';
              ctx.beginPath();
              ctx.ellipse(0, -12, 10, 5, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.beginPath();
              ctx.ellipse(0, 14, 10, 5, 0, 0, Math.PI * 2);
              ctx.fill();
              break;

          case 'CHIP':
              // PCB Base
              ctx.fillStyle = '#1e293b';
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              this.roundRect(ctx, -14, -14, 28, 28, 4);
              ctx.fill();
              ctx.stroke();

              // Internal Circuitry
              ctx.fillStyle = color;
              ctx.globalAlpha = 0.8;
              // Central Processor
              ctx.fillRect(-6, -6, 12, 12);
              
              // Traces
              ctx.beginPath();
              // Horizontal
              ctx.moveTo(-6, 0); ctx.lineTo(-14, 0);
              ctx.moveTo(6, 0); ctx.lineTo(14, 0);
              ctx.moveTo(-6, -3); ctx.lineTo(-14, -3);
              ctx.moveTo(6, 3); ctx.lineTo(14, 3);
              // Vertical
              ctx.moveTo(0, -6); ctx.lineTo(0, -14);
              ctx.moveTo(0, 6); ctx.lineTo(0, 14);
              ctx.moveTo(3, -6); ctx.lineTo(3, -14);
              ctx.moveTo(-3, 6); ctx.lineTo(-3, 14);
              ctx.stroke();
              ctx.globalAlpha = 1.0;

              // Gold Pins
              ctx.fillStyle = '#f59e0b'; // Amber
              const pinSize = 2;
              for(let i=0; i<3; i++) {
                  const offset = -8 + i * 8;
                  ctx.fillRect(-16, offset, pinSize, pinSize); // L
                  ctx.fillRect(14, offset, pinSize, pinSize);  // R
                  ctx.fillRect(offset, -16, pinSize, pinSize); // T
                  ctx.fillRect(offset, 14, pinSize, pinSize);  // B
              }
              break;

          case 'BOX':
              // Isometric Box
              // Back Face (Inside)
              ctx.fillStyle = '#0f172a';
              ctx.beginPath();
              ctx.moveTo(-10, -8); ctx.lineTo(10, -8); ctx.lineTo(10, 8); ctx.lineTo(-10, 8);
              ctx.fill();

              // Front Face (Body)
              ctx.fillStyle = color; // Main rarity color
              ctx.fillRect(-12, -5, 24, 18);
              
              // Reinforced Corners (Metal)
              ctx.fillStyle = '#94a3b8'; 
              ctx.fillRect(-13, -6, 5, 5);
              ctx.fillRect(8, -6, 5, 5);
              ctx.fillRect(-13, 9, 5, 5);
              ctx.fillRect(8, 9, 5, 5);

              // Texture (Caution Stripes)
              ctx.strokeStyle = 'rgba(0,0,0,0.2)';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.moveTo(-12, 12); ctx.lineTo(0, 0);
              ctx.moveTo(0, 12); ctx.lineTo(12, 0);
              ctx.stroke();

              // Lock / Latch
              ctx.fillStyle = '#fbbf24'; // Gold
              ctx.beginPath();
              ctx.arc(0, 4, 3, 0, Math.PI*2);
              ctx.fill();
              ctx.fillStyle = '#000';
              ctx.fillRect(-1, 3, 2, 3);
              break;

          case 'PATCH':
              // Nano-Weave Patch
              ctx.fillStyle = color;
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 1;
              
              // Irregular Shape
              ctx.beginPath();
              ctx.moveTo(-12, -8); 
              ctx.lineTo(12, -12); 
              ctx.lineTo(8, 12); 
              ctx.lineTo(-10, 8);
              ctx.closePath();
              
              const patchGrad = ctx.createLinearGradient(-10, -10, 10, 10);
              patchGrad.addColorStop(0, color);
              patchGrad.addColorStop(1, '#1e293b');
              ctx.fillStyle = patchGrad;
              ctx.fill();
              
              // Holographic Stitching
              ctx.shadowColor = '#fff';
              ctx.shadowBlur = 5;
              ctx.setLineDash([2, 2]);
              ctx.stroke();
              ctx.setLineDash([]);
              ctx.shadowBlur = 10;
              ctx.shadowColor = color;

              // Cross Hatching Pattern
              ctx.globalAlpha = 0.3;
              ctx.beginPath();
              for(let i=-10; i<10; i+=4) {
                  ctx.moveTo(i, -10); ctx.lineTo(i+4, 10);
              }
              ctx.stroke();
              ctx.globalAlpha = 1.0;
              break;

          case 'SCANNER':
              // Grip Handle
              ctx.fillStyle = '#334155';
              ctx.fillRect(-4, 6, 8, 12);
              
              // Main Housing
              ctx.fillStyle = '#1e293b'; 
              this.roundRect(ctx, -14, -14, 28, 22, 4);
              ctx.fill();
              
              // Screen
              ctx.fillStyle = '#020617'; // Black screen
              ctx.fillRect(-10, -10, 20, 14);
              
              // Radar Blip
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(0, -3, 2, 0, Math.PI, true);
              ctx.stroke();
              ctx.beginPath();
              ctx.arc(0, -3, 6, 0, Math.PI, true);
              ctx.stroke();
              
              // Grid Overlay
              ctx.strokeStyle = 'rgba(255,255,255,0.1)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(0, -10); ctx.lineTo(0, 4);
              ctx.moveTo(-10, -3); ctx.lineTo(10, -3);
              ctx.stroke();

              // Antenna
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(10, -14); ctx.lineTo(16, -22);
              ctx.stroke();
              // LED Tip
              ctx.fillStyle = '#ef4444';
              ctx.beginPath(); ctx.arc(16, -22, 2, 0, Math.PI*2); ctx.fill();
              break;

          case 'PRISM':
              // Crystalline Structure
              ctx.lineJoin = 'miter';
              
              const prismGrad = ctx.createLinearGradient(0, -15, 0, 15);
              prismGrad.addColorStop(0, `${color}99`);
              prismGrad.addColorStop(1, `${color}22`);
              ctx.fillStyle = prismGrad;
              
              // Floating Pyramid Shape
              ctx.beginPath();
              ctx.moveTo(0, -18); // Top
              ctx.lineTo(14, 8);  // Right Base
              ctx.lineTo(0, 16);  // Bottom
              ctx.lineTo(-14, 8); // Left Base
              ctx.closePath();
              ctx.fill();

              // Edges Highlight
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1;
              ctx.stroke();
              
              // Inner Refraction Lines
              ctx.beginPath();
              ctx.moveTo(0, -18); ctx.lineTo(0, 16);
              ctx.moveTo(0, -18); ctx.lineTo(8, 8); // Facet
              ctx.stroke();
              
              // Core Singularity
              ctx.fillStyle = '#fff';
              ctx.globalAlpha = 0.8;
              ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI*2); ctx.fill();
              ctx.globalAlpha = 1.0;
              break;

          case 'DRILL':
              // Industrial Drill Bit
              // Shaft
              ctx.fillStyle = '#cbd5e1'; // Silver
              ctx.fillRect(-3, -16, 6, 10);

              // Spiral Bit body
              ctx.strokeStyle = '#94a3b8'; // Darker metal
              ctx.lineWidth = 10;
              ctx.lineCap = 'butt';
              
              ctx.beginPath();
              ctx.moveTo(0, -6);
              ctx.lineTo(0, 16);
              ctx.stroke();

              // Cutting Threads (Energy color)
              ctx.strokeStyle = color;
              ctx.lineWidth = 2;
              for(let i=0; i<4; i++) {
                  ctx.beginPath();
                  const y = -4 + i * 5;
                  ctx.moveTo(-5, y);
                  ctx.lineTo(5, y + 3);
                  ctx.stroke();
              }
              
              // Diamond Tip
              ctx.fillStyle = '#fff';
              ctx.beginPath();
              ctx.moveTo(-5, 16); ctx.lineTo(5, 16); ctx.lineTo(0, 24);
              ctx.fill();
              break;

          case 'GENERATOR':
              // Main Core Housing
              ctx.fillStyle = '#334155';
              ctx.beginPath();
              ctx.arc(0, 0, 14, 0, Math.PI*2);
              ctx.fill();
              
              // Copper Coils
              ctx.strokeStyle = '#b45309'; // Copper
              ctx.lineWidth = 2;
              for(let i=0; i<3; i++) {
                  ctx.beginPath();
                  ctx.arc(0, 0, 11 - i*3, 0, Math.PI*2);
                  ctx.stroke();
              }
              
              // Rotating Energy Field
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              ctx.setLineDash([3, 4]);
              ctx.beginPath();
              ctx.arc(0, 0, 18, 0, Math.PI*2);
              ctx.stroke();
              ctx.setLineDash([]);
              
              // Mounting Bolts
              ctx.fillStyle = '#94a3b8';
              ctx.fillRect(-3, -18, 6, 4); // Top
              ctx.fillRect(-3, 14, 6, 4);  // Bottom
              ctx.fillRect(-18, -3, 4, 6); // Left
              ctx.fillRect(14, -3, 4, 6);  // Right
              break;

          case 'PARTICLES':
              // Swarm of nanites
              for(let i=0; i<7; i++) {
                  const size = Math.random() * 2 + 1.5;
                  // Random spread around center
                  const angle = Math.random() * Math.PI * 2;
                  const dist = Math.random() * 14;
                  const px = Math.cos(angle) * dist;
                  const py = Math.sin(angle) * dist;
                  
                  ctx.fillStyle = color;
                  ctx.shadowColor = color;
                  ctx.shadowBlur = 5;
                  
                  ctx.beginPath();
                  ctx.arc(px, py, size, 0, Math.PI*2);
                  ctx.fill();
                  
                  // Trail
                  ctx.strokeStyle = color;
                  ctx.lineWidth = 0.5;
                  ctx.beginPath();
                  ctx.moveTo(px, py);
                  // Trail points towards center (implosion) or away (explosion)
                  ctx.lineTo(px * 0.5, py * 0.5); 
                  ctx.stroke();
              }
              break;

          case 'SPINE':
              // Cybernetic Spine
              ctx.fillStyle = '#e2e8f0'; // Bone/Chrome
              
              for(let i=-2; i<=2; i++) {
                  const y = i * 7;
                  const w = 14 - Math.abs(i)*2; // Tapered
                  
                  // Vertebra unit
                  ctx.beginPath();
                  this.roundRect(ctx, -w/2, y - 2, w, 5, 2);
                  ctx.fill();
                  
                  // Neural Link (Wire)
                  if (i < 2) {
                      ctx.strokeStyle = color; // Energy color
                      ctx.lineWidth = 2;
                      ctx.beginPath();
                      ctx.moveTo(0, y + 3);
                      ctx.lineTo(0, y + 5); // Connect to next
                      ctx.stroke();
                  }
              }
              // Port at top
              ctx.fillStyle = color;
              ctx.beginPath(); ctx.arc(0, -16, 3, 0, Math.PI*2); ctx.fill();
              break;

          case 'CORE':
              // Containment Ring
              ctx.strokeStyle = '#475569';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, 16, 0, Math.PI*2);
              ctx.stroke();
              
              // Unstable Nucleus
              const coreGrad = ctx.createRadialGradient(0, 0, 2, 0, 0, 12);
              coreGrad.addColorStop(0, '#fff');
              coreGrad.addColorStop(0.4, color);
              coreGrad.addColorStop(1, 'transparent');
              ctx.fillStyle = coreGrad;
              ctx.beginPath();
              ctx.arc(0, 0, 12, 0, Math.PI*2);
              ctx.fill();
              
              // Floating Magnets
              ctx.fillStyle = '#fff';
              const magnetDist = 16;
              const size = 4;
              ctx.fillRect(-size/2, -magnetDist, size, size); // Top
              ctx.fillRect(-size/2, magnetDist-size, size, size); // Bottom
              ctx.fillRect(-magnetDist, -size/2, size, size); // Left
              ctx.fillRect(magnetDist-size, -size/2, size, size); // Right
              break;

          case 'SKULL':
              // Stylized Cyber-Skull
              ctx.fillStyle = '#e2e8f0'; // Bone
              if (color === '#fbbf24') ctx.fillStyle = '#fcd34d'; // Gold override for Midas
              
              // Cranium
              ctx.beginPath();
              ctx.arc(0, -5, 11, Math.PI, 0); // Top dome
              ctx.lineTo(9, 6); // Cheek Right
              ctx.lineTo(-9, 6); // Cheek Left
              ctx.lineTo(-11, -5); 
              ctx.fill();
              
              // Jaw / Teeth
              ctx.fillRect(-5, 6, 10, 5);
              // Teeth details
              ctx.strokeStyle = '#94a3b8';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(0, 6); ctx.lineTo(0, 11);
              ctx.moveTo(-3, 6); ctx.lineTo(-3, 11);
              ctx.moveTo(3, 6); ctx.lineTo(3, 11);
              ctx.stroke();

              // Eye Sockets
              ctx.fillStyle = '#0f172a';
              ctx.beginPath();
              // Aggressive slanted eyes
              ctx.ellipse(-4, -2, 3, 4, 0.2, 0, Math.PI*2);
              ctx.ellipse(4, -2, 3, 4, -0.2, 0, Math.PI*2);
              ctx.fill();
              
              // Triangular Nose
              ctx.beginPath();
              ctx.moveTo(0, 1); ctx.lineTo(2, 4); ctx.lineTo(-2, 4);
              ctx.fill();
              
              // Glowing Pupils (if rare)
              if (color !== '#94a3b8' && color !== '#cbd5e1') { 
                  ctx.fillStyle = color;
                  ctx.shadowColor = color;
                  ctx.shadowBlur = 8;
                  ctx.beginPath();
                  ctx.arc(-4, -2, 1.5, 0, Math.PI*2);
                  ctx.arc(4, -2, 1.5, 0, Math.PI*2);
                  ctx.fill();
                  ctx.shadowBlur = 0;
              }
              break;
          case 'ARMOR':
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(-14, -10);
              ctx.lineTo(14, -10);
              ctx.lineTo(16, -4);
              ctx.lineTo(10, -2);
              ctx.lineTo(10, 10);
              ctx.lineTo(4, 14);
              ctx.lineTo(-4, 14);
              ctx.lineTo(-10, 10);
              ctx.lineTo(-10, -2);
              ctx.lineTo(-16, -4);
              ctx.closePath();
              ctx.fill();
              
              ctx.strokeStyle = 'rgba(0,0,0,0.3)';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(-6, -10); ctx.lineTo(-6, 12);
              ctx.moveTo(6, -10); ctx.lineTo(6, 12);
              ctx.moveTo(-10, 2); ctx.lineTo(10, 2);
              ctx.stroke();
              
              ctx.fillStyle = '#0f172a';
              ctx.beginPath();
              ctx.arc(0, -12, 5, 0, Math.PI);
              ctx.fill();
              break;
          case 'BOOTS':
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(-12, -6);
              ctx.lineTo(-4, -6);
              ctx.lineTo(-4, 8);
              ctx.lineTo(-2, 12);
              ctx.lineTo(-14, 12);
              ctx.lineTo(-12, 8);
              ctx.closePath();
              ctx.fill();
              
              ctx.beginPath();
              ctx.moveTo(4, -6);
              ctx.lineTo(12, -6);
              ctx.lineTo(12, 8);
              ctx.lineTo(14, 12);
              ctx.lineTo(2, 12);
              ctx.lineTo(4, 8);
              ctx.closePath();
              ctx.fill();
              
              ctx.strokeStyle = 'rgba(0,0,0,0.4)';
              ctx.lineWidth = 1;
              ctx.strokeRect(-10, -4, 4, 8);
              ctx.strokeRect(6, -4, 4, 8);
              break;
          case 'RING':
              ctx.strokeStyle = '#fbbf24'; 
              if (itemId?.includes('silver')) ctx.strokeStyle = '#cbd5e1';
              ctx.lineWidth = 4;
              ctx.beginPath();
              ctx.ellipse(0, 2, 10, 6, 0, 0, Math.PI * 2);
              ctx.stroke();
              
              ctx.fillStyle = '#fbbf24';
              if (itemId?.includes('silver')) ctx.fillStyle = '#cbd5e1';
              ctx.fillRect(-4, -6, 8, 6);
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(0, -8);
              ctx.lineTo(4, -4);
              ctx.lineTo(0, 0);
              ctx.lineTo(-4, -4);
              ctx.closePath();
              ctx.fill();
              break;
          case 'NECKLACE':
              ctx.strokeStyle = '#fbbf24'; 
              if (itemId?.includes('silver') || itemId?.includes('diamond')) ctx.strokeStyle = '#cbd5e1';
              ctx.lineWidth = 2;
              ctx.setLineDash([2, 2]);
              ctx.beginPath();
              ctx.arc(0, -2, 12, 0, Math.PI);
              ctx.stroke();
              ctx.setLineDash([]);
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(0, 14);
              ctx.lineTo(6, 6);
              ctx.lineTo(-6, 6);
              ctx.closePath();
              ctx.fill();
              
              ctx.fillStyle = 'rgba(255,255,255,0.5)';
              ctx.beginPath();
              ctx.moveTo(0, 12);
              ctx.lineTo(2, 8);
              ctx.lineTo(-2, 8);
              ctx.closePath();
              ctx.fill();
              break;
          case 'HELMET':
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(0, 2, 12, Math.PI, 0);
              ctx.lineTo(12, 10);
              ctx.lineTo(6, 14);
              ctx.lineTo(-6, 14);
              ctx.lineTo(-12, 10);
              ctx.closePath();
              ctx.fill();
              
              ctx.fillStyle = '#0f172a';
              if (itemId === 'scrap_visor') {
                  ctx.fillRect(-8, 0, 16, 4);
                  ctx.fillStyle = '#ef4444'; 
                  ctx.beginPath();
                  ctx.arc(-4, 2, 2, 0, Math.PI*2);
                  ctx.fill();
              } else {
                  ctx.fillRect(-2, -4, 4, 14);
                  ctx.fillRect(-8, -2, 16, 4);
              }
              break;
          case 'FOOD':
              if (itemId === 'food_banana') {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(0, 0, 12, 0, Math.PI);
                  ctx.lineTo(12, -10);
                  ctx.arc(0, -5, 15, 0, Math.PI, true);
                  ctx.closePath();
                  ctx.fill();
              } else if (itemId === 'food_bread' || itemId === 'food_bread_02') {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = '#78350f';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(-6, -4); ctx.lineTo(-2, 2);
                  ctx.moveTo(0, -4); ctx.lineTo(4, 2);
                  ctx.moveTo(6, -4); ctx.lineTo(10, 2);
                  ctx.stroke();
              } else if (itemId === 'food_cherry') {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(-5, 5, 6, 0, Math.PI * 2);
                  ctx.arc(5, 5, 6, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.strokeStyle = '#22c55e';
                  ctx.lineWidth = 2;
                  ctx.beginPath();
                  ctx.moveTo(-5, -1); ctx.lineTo(0, -10);
                  ctx.moveTo(5, -1); ctx.lineTo(0, -10);
                  ctx.stroke();
                  ctx.fillStyle = '#22c55e';
                  ctx.beginPath();
                  ctx.ellipse(2, -12, 4, 2, Math.PI/4, 0, Math.PI * 2);
                  ctx.fill();
              } else {
                  ctx.fillStyle = color;
                  ctx.beginPath();
                  ctx.arc(0, 0, 10, 0, Math.PI * 2);
                  ctx.fill();
                  ctx.fillStyle = '#22c55e';
                  ctx.fillRect(-2, -14, 4, 6);
              }
              break;
          case 'POTION':
              ctx.strokeStyle = '#fff';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(-4, -10);
              ctx.lineTo(-4, -4);
              ctx.lineTo(-12, 8);
              ctx.arc(0, 8, 12, Math.PI, 0, true);
              ctx.lineTo(4, -4);
              ctx.lineTo(4, -10);
              ctx.closePath();
              ctx.stroke();
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(-10, 6);
              ctx.arc(0, 8, 10, Math.PI, 0, true);
              ctx.lineTo(10, 6);
              ctx.closePath();
              ctx.fill();
              
              ctx.fillStyle = '#78350f';
              ctx.fillRect(-5, -14, 10, 4);
              
              ctx.fillStyle = 'rgba(255,255,255,0.5)';
              ctx.beginPath();
              ctx.arc(-4, 6, 3, 0, Math.PI * 2);
              ctx.fill();
              break;
          case 'GEM':
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(0, -14);
              ctx.lineTo(12, -4);
              ctx.lineTo(8, 12);
              ctx.lineTo(-8, 12);
              ctx.lineTo(-12, -4);
              ctx.closePath();
              ctx.fill();
              
              ctx.strokeStyle = 'rgba(255,255,255,0.6)';
              ctx.lineWidth = 1.5;
              ctx.stroke();
              
              ctx.beginPath();
              ctx.moveTo(-8, -4); ctx.lineTo(8, -4);
              ctx.moveTo(-8, -4); ctx.lineTo(0, 4);
              ctx.moveTo(8, -4); ctx.lineTo(0, 4);
              ctx.moveTo(0, 4); ctx.lineTo(0, 12);
              ctx.moveTo(-8, -4); ctx.lineTo(-12, -4);
              ctx.moveTo(8, -4); ctx.lineTo(12, -4);
              ctx.moveTo(0, -14); ctx.lineTo(-8, -4);
              ctx.moveTo(0, -14); ctx.lineTo(8, -4);
              ctx.stroke();
              break;
          case 'BAR':
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(-8, -6);
              ctx.lineTo(8, -6);
              ctx.lineTo(12, 0);
              ctx.lineTo(-4, 0);
              ctx.closePath();
              ctx.fill();
              
              ctx.fillStyle = '#d97706'; 
              if (color !== '#fbbf24') ctx.fillStyle = 'rgba(0,0,0,0.3)'; 
              ctx.beginPath();
              ctx.moveTo(-4, 0);
              ctx.lineTo(12, 0);
              ctx.lineTo(8, 6);
              ctx.lineTo(-8, 6);
              ctx.closePath();
              ctx.fill();
              
              ctx.fillStyle = '#fef08a'; 
              if (color !== '#fbbf24') ctx.fillStyle = 'rgba(255,255,255,0.3)'; 
              ctx.beginPath();
              ctx.moveTo(8, -6);
              ctx.lineTo(12, 0);
              ctx.lineTo(8, 6);
              ctx.closePath();
              ctx.fill();
              
              ctx.strokeStyle = 'rgba(255,255,255,0.5)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(-8, -6); ctx.lineTo(8, -6); ctx.lineTo(12, 0);
              ctx.moveTo(-4, 0); ctx.lineTo(12, 0);
              ctx.stroke();
              break;
          case 'SWORD':
              ctx.translate(0, 0);
              ctx.rotate(Math.PI / 4);
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(-4, -4);
              ctx.lineTo(0, -20);
              ctx.lineTo(4, -4);
              ctx.closePath();
              ctx.fill();
              
              ctx.strokeStyle = 'rgba(255,255,255,0.8)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(0, -4);
              ctx.lineTo(0, -18);
              ctx.stroke();

              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(-8, -4, 16, 4);
              
              ctx.fillStyle = '#78350f';
              ctx.fillRect(-2, 0, 4, 10);
              
              ctx.fillStyle = '#fbbf24';
              ctx.beginPath();
              ctx.arc(0, 10, 3, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.rotate(-Math.PI / 4);
              break;
          case 'DAGGER':
              ctx.rotate(Math.PI / 4);
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(-2, -2);
              ctx.lineTo(0, -14);
              ctx.lineTo(2, -2);
              ctx.closePath();
              ctx.fill();
              
              ctx.fillStyle = '#94a3b8';
              ctx.fillRect(-5, -2, 10, 2);
              
              ctx.fillStyle = '#78350f';
              ctx.fillRect(-1, 0, 2, 6);
              
              ctx.fillStyle = '#94a3b8';
              ctx.beginPath();
              ctx.arc(0, 7, 2, 0, Math.PI * 2);
              ctx.fill();
              
              if (itemId === 'dagger_poison') {
                  ctx.fillStyle = '#22c55e';
                  ctx.beginPath();
                  ctx.arc(0, -16, 1.5, 0, Math.PI*2);
                  ctx.fill();
              }
              
              ctx.rotate(-Math.PI / 4);
              break;
          case 'AXE':
              ctx.rotate(Math.PI / 4);
              
              ctx.fillStyle = '#78350f';
              ctx.fillRect(-2, -12, 4, 24);
              
              ctx.fillStyle = color;
              if (itemId === 'tool_pickaxe') {
                  ctx.beginPath();
                  ctx.moveTo(-12, -8);
                  ctx.quadraticCurveTo(0, -12, 12, -8);
                  ctx.lineTo(10, -4);
                  ctx.quadraticCurveTo(0, -8, -10, -4);
                  ctx.closePath();
                  ctx.fill();
              } else if (itemId === 'axe_battle') {
                  ctx.beginPath();
                  ctx.moveTo(-2, -8);
                  ctx.lineTo(-12, -14);
                  ctx.lineTo(-14, -2);
                  ctx.lineTo(-2, -4);
                  ctx.closePath();
                  ctx.fill();
                  
                  ctx.beginPath();
                  ctx.moveTo(2, -8);
                  ctx.lineTo(12, -14);
                  ctx.lineTo(14, -2);
                  ctx.lineTo(2, -4);
                  ctx.closePath();
                  ctx.fill();
              } else {
                  ctx.beginPath();
                  ctx.moveTo(2, -8);
                  ctx.lineTo(12, -12);
                  ctx.lineTo(12, 0);
                  ctx.lineTo(2, -4);
                  ctx.closePath();
                  ctx.fill();
              }
              
              ctx.rotate(-Math.PI / 4);
              break;
          case 'MACE':
              ctx.rotate(Math.PI / 4);
              
              ctx.fillStyle = '#78350f';
              ctx.fillRect(-2, -10, 4, 22);
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(0, -12, 6, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.fillStyle = '#f8fafc';
              for (let i = 0; i < 8; i++) {
                  const angle = (i / 8) * Math.PI * 2;
                  ctx.beginPath();
                  ctx.arc(Math.cos(angle) * 6, -12 + Math.sin(angle) * 6, 1.5, 0, Math.PI * 2);
                  ctx.fill();
              }
              
              ctx.rotate(-Math.PI / 4);
              break;
          case 'SPEAR':
              ctx.rotate(Math.PI / 4);
              
              ctx.fillStyle = '#78350f';
              ctx.fillRect(-1.5, -12, 3, 28);
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(-3, -12);
              ctx.lineTo(0, -22);
              ctx.lineTo(3, -12);
              ctx.closePath();
              ctx.fill();
              
              ctx.rotate(-Math.PI / 4);
              break;
          case 'STAFF':
              ctx.rotate(Math.PI / 4);
              
              ctx.fillStyle = '#78350f';
              ctx.fillRect(-2, -14, 4, 28);
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(0, -16, 5, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.beginPath();
              ctx.arc(-2, -18, 2, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.rotate(-Math.PI / 4);
              break;
          case 'BOW':
              ctx.rotate(Math.PI / 4);
              
              ctx.strokeStyle = '#78350f';
              ctx.lineWidth = 3;
              ctx.beginPath();
              ctx.arc(0, 0, 14, -Math.PI/2, Math.PI/2);
              ctx.stroke();
              
              ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(0, -14);
              ctx.lineTo(0, 14);
              ctx.stroke();
              
              ctx.fillStyle = color;
              ctx.fillRect(-4, -2, 4, 4);
              
              ctx.rotate(-Math.PI / 4);
              break;
          case 'GUN':
              ctx.fillStyle = '#475569';
              ctx.fillRect(-8, 0, 6, 12);
              ctx.fillStyle = color;
              ctx.fillRect(-10, -6, 20, 8);
              ctx.fillStyle = '#0ea5e9';
              ctx.fillRect(6, -4, 4, 4);
              
              ctx.fillStyle = '#334155';
              ctx.fillRect(-10, -6, 2, 8);
              ctx.fillRect(-2, 2, 6, 2);
              break;
          case 'FIST':
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(0, 2, 10, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
              ctx.beginPath();
              ctx.arc(0, 2, 8, 0, Math.PI * 2);
              ctx.fill();
              
              ctx.fillStyle = '#fff';
              ctx.fillRect(-8, -10, 4, 6);
              ctx.fillRect(-2, -12, 4, 6);
              ctx.fillRect(4, -10, 4, 6);
              break;
          case 'THROWING':
              ctx.rotate(Math.PI / 4);
              
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.moveTo(0, -14);
              ctx.lineTo(4, 0);
              ctx.lineTo(0, 14);
              ctx.lineTo(-4, 0);
              ctx.closePath();
              ctx.fill();
              
              ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
              ctx.beginPath();
              ctx.moveTo(0, -10);
              ctx.lineTo(2, 0);
              ctx.lineTo(0, 10);
              ctx.lineTo(-2, 0);
              ctx.closePath();
              ctx.fill();
              
              ctx.rotate(-Math.PI / 4);
              break;
          case 'BOOK':
              ctx.fillStyle = '#78350f';
              ctx.fillRect(-12, -14, 24, 28);
              
              ctx.fillStyle = color;
              ctx.fillRect(-10, -12, 20, 24);
              
              ctx.fillStyle = '#f8fafc';
              ctx.fillRect(-8, -10, 16, 20);
              
              ctx.fillStyle = color;
              ctx.fillRect(-6, -6, 12, 2);
              ctx.fillRect(-6, -2, 12, 2);
              ctx.fillRect(-6, 2, 8, 2);
              
              if (itemId === 'skill_fire_01') {
                  ctx.fillStyle = '#ef4444';
                  ctx.beginPath();
                  ctx.arc(0, 0, 4, 0, Math.PI*2);
                  ctx.fill();
              } else if (itemId === 'book_ancient') {
                  ctx.fillStyle = '#fbbf24';
                  ctx.beginPath();
                  ctx.moveTo(0, -5); ctx.lineTo(3, 0); ctx.lineTo(0, 5); ctx.lineTo(-3, 0);
                  ctx.fill();
              }
              break;

      }
  }

  // Helper for rounded rects
  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    if (w < 2 * r) r = w / 2;
    if (h < 2 * r) r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
  }
}

export const itemRenderer = ItemRenderer.getInstance();
