import * as PIXI from 'pixi.js';

export interface MeteorTargetInfo {
  id: string;
  q: number;
  r: number;
  warnTicksRemaining: number;
  maxWarnTicks?: number;
}

export interface RenderMeteorParams {
  curContainer: PIXI.Container;
  targetedMeteor?: MeteorTargetInfo;
  offsetY: number;
  rotatedBasePoints: { x: number; y: number }[];
  isRevealed: boolean;
  onImpactClose?: (intensity: number) => void;
}

/**
 * Optimized, volumetric 3D meteor renderer with fire/smoke trails and dynamic hex shadow.
 * Encapsulates all graphics creation, updating, and cleanup for meteor strikes.
 */
export function renderMeteorTelegraph(params: RenderMeteorParams): void {
  const {
    curContainer,
    targetedMeteor,
    offsetY,
    rotatedBasePoints,
    isRevealed,
    onImpactClose,
  } = params;

  let meteorGraphic = curContainer.getChildByName('meteor_telegraph') as PIXI.Graphics;

  // If no meteor targets this hex or hex is hidden, hide graphics and return
  if (!targetedMeteor || !isRevealed) {
    if (meteorGraphic) {
      meteorGraphic.visible = false;
    }
    return;
  }

  // Ensure graphic container exists with proper zIndex
  if (!meteorGraphic) {
    meteorGraphic = new PIXI.Graphics();
    meteorGraphic.name = 'meteor_telegraph';
    meteorGraphic.zIndex = 42;
    curContainer.addChild(meteorGraphic);
  }

  meteorGraphic.visible = true;
  meteorGraphic.clear();

  const now = Date.now();
  const maxTicks = Math.max(1, targetedMeteor.maxWarnTicks || 30);
  const ticksLeft = Math.max(0, targetedMeteor.warnTicksRemaining);
  const collapseRatio = ticksLeft / maxTicks; // 1.0 (start in sky) -> 0.0 (impact)
  const progress = Math.min(1.0, Math.max(0.0, 1.0 - collapseRatio)); // 0.0 -> 1.0

  // Dynamic pulse speed increases as meteor gets closer to impact
  const pulseSpeed = 0.015 + progress * 0.035;
  const pulse = 0.5 + 0.5 * Math.sin(now * pulseSpeed);

  // ==========================================
  // 1. TARGET HEX TELEGRAPH (Hex Base Warning)
  // ==========================================
  meteorGraphic.beginPath();
  rotatedBasePoints.forEach((pt, j) => {
    const px = pt.x;
    const py = pt.y * 0.8 + offsetY;
    if (j === 0) meteorGraphic.moveTo(px, py);
    else meteorGraphic.lineTo(px, py);
  });
  meteorGraphic.closePath();
  // Red warning stroke & danger fill
  const strokeAlpha = 0.6 + pulse * 0.4;
  const fillAlpha = 0.15 + progress * 0.2 + pulse * 0.15;
  meteorGraphic.stroke({ width: 3 + progress * 2, color: 0xef4444, alpha: strokeAlpha });
  meteorGraphic.fill({ color: 0xef4444, alpha: fillAlpha });

  // Concentric radar reticle on target hex surface
  const reticleRadius = (1.0 - progress) * 35 + 8;
  meteorGraphic.beginPath();
  meteorGraphic.ellipse(0, offsetY, reticleRadius, reticleRadius * 0.6);
  meteorGraphic.stroke({ width: 1.5, color: 0xff3300, alpha: 0.7 });

  // ==========================================
  // 2. DYNAMIC EXPANDING SHADOW ON THE HEX
  // ==========================================
  // Shadow expands from tiny (8x5) up to full hex size (38x24) as meteor falls
  const shadowRx = 8 + progress * 32;
  const shadowRy = 5 + progress * 19;

  // Outer soft translucent shadow penumbra
  meteorGraphic.beginPath();
  meteorGraphic.ellipse(0, offsetY, shadowRx * 1.3, shadowRy * 1.3);
  meteorGraphic.fill({ color: 0x0a0302, alpha: 0.35 * progress });

  // Core dense shadow umbra
  meteorGraphic.beginPath();
  meteorGraphic.ellipse(0, offsetY, shadowRx, shadowRy);
  meteorGraphic.fill({ color: 0x030105, alpha: 0.25 + progress * 0.65 });
  meteorGraphic.stroke({ width: 1.5, color: 0x000000, alpha: 0.4 * progress });

  // Heat glow on target hex ground right before impact
  if (progress > 0.6) {
    const heatAlpha = (progress - 0.6) * 2.2; // 0.0 -> 0.88
    meteorGraphic.beginPath();
    meteorGraphic.ellipse(0, offsetY, shadowRx * 0.8, shadowRy * 0.8);
    meteorGraphic.fill({ color: 0xff3300, alpha: heatAlpha * 0.4 });
  }

  // ==========================================
  // 3. METEOR TRAJECTORY & ALTITUDE
  // ==========================================
  // Quadratic ease-in plunge from sky (-800px) down to target hex (offsetY)
  const startY = offsetY - 800;
  const currentY = startY + (offsetY - startY) * Math.pow(progress, 1.85);

  // ==========================================
  // 4. FIRE & SMOKE TRAIL (VOLUMETRIC TAIL)
  // ==========================================
  // Tail extends upwards from meteor center along entry angle (slightly tilted)
  const tailLength = 100 + progress * 150;
  const topTailY = currentY - tailLength;

  // Layer 4A: Volumetric Smoke Clouds (Dark Charcoal / Ash Puffs)
  const numSmokePuffs = 6;
  for (let i = 0; i < numSmokePuffs; i++) {
    const t = (i + 1) / numSmokePuffs; // 0 (near meteor) -> 1 (high in sky)
    const puffY = currentY - t * tailLength;
    // Lateral drift / atmospheric turbulence
    const wobble = Math.sin(now * 0.008 + i * 1.7) * (4 + t * 8);
    const puffRadius = 10 + t * 24; // Smoke expands as it goes up
    const smokeAlpha = (1.0 - t) * (0.35 + progress * 0.35);

    meteorGraphic.beginPath();
    meteorGraphic.circle(wobble, puffY, puffRadius);
    meteorGraphic.fill({ color: i % 2 === 0 ? 0x1f1917 : 0x332824, alpha: smokeAlpha });
  }

  // Layer 4B: Outer Fiery Flame Plume Cone
  meteorGraphic.beginPath();
  meteorGraphic.moveTo(-16, currentY - 5);
  meteorGraphic.lineTo(16, currentY - 5);
  meteorGraphic.lineTo(Math.sin(now * 0.03) * 6, topTailY);
  meteorGraphic.closePath();
  meteorGraphic.fill({ color: 0xff3300, alpha: 0.65 });

  // Layer 4C: Inner Intense Plasma Flame Core
  const innerTailY = currentY - tailLength * 0.6;
  meteorGraphic.beginPath();
  meteorGraphic.moveTo(-10, currentY - 8);
  meteorGraphic.lineTo(10, currentY - 8);
  meteorGraphic.lineTo(Math.sin(now * 0.04) * 3, innerTailY);
  meteorGraphic.closePath();
  meteorGraphic.fill({ color: 0xffaa00, alpha: 0.85 });

  // Layer 4D: Bright White Hot Flame Root
  meteorGraphic.beginPath();
  meteorGraphic.moveTo(-6, currentY - 10);
  meteorGraphic.lineTo(6, currentY - 10);
  meteorGraphic.lineTo(0, currentY - tailLength * 0.3);
  meteorGraphic.closePath();
  meteorGraphic.fill({ color: 0xffffff, alpha: 0.95 });

  // Layer 4E: Flying Ember Sparks along Trajectory
  const numSparks = 8;
  for (let s = 0; s < numSparks; s++) {
    const sparkPhase = ((now * 0.004 + s * 0.35) % 1.0);
    const sparkY = currentY - sparkPhase * tailLength * 0.9;
    const sparkX = Math.sin(sparkPhase * 12 + s) * (8 + sparkPhase * 12);
    const sparkSize = 1.5 + (1.0 - sparkPhase) * 2.5;
    const sparkAlpha = (1.0 - sparkPhase) * 0.9;

    meteorGraphic.beginPath();
    meteorGraphic.circle(sparkX, sparkY, sparkSize);
    meteorGraphic.fill({ color: s % 2 === 0 ? 0xffea00 : 0xff5500, alpha: sparkAlpha });
  }

  // ==========================================
  // 5. VOLUMETRIC 3D METEOR ROCK OBJECT
  // ==========================================
  const spinAngle = (now * 0.003) % (Math.PI * 2);

  // 5A. Outer Plasma Entry Aura / Atmosphere
  meteorGraphic.beginPath();
  meteorGraphic.circle(0, currentY, 24);
  meteorGraphic.fill({ color: 0xff3300, alpha: 0.45 });

  meteorGraphic.beginPath();
  meteorGraphic.circle(0, currentY, 19);
  meteorGraphic.fill({ color: 0xff8800, alpha: 0.7 });

  // 5B. Base 3D Sphere Body (Dark Magma Basalt)
  const baseRadius = 16;
  meteorGraphic.beginPath();
  meteorGraphic.circle(0, currentY, baseRadius);
  meteorGraphic.fill({ color: 0x3d170c, alpha: 1.0 });

  // 5C. 3D Volume Light Crest (Top-Left Highlight)
  meteorGraphic.beginPath();
  meteorGraphic.circle(-4, currentY - 4, baseRadius * 0.72);
  meteorGraphic.fill({ color: 0x7a3619, alpha: 0.85 });

  // 5D. 3D Volume Shadow Crescent (Bottom-Right Shading)
  meteorGraphic.beginPath();
  meteorGraphic.circle(4, currentY + 4, baseRadius * 0.72);
  meteorGraphic.fill({ color: 0x140603, alpha: 0.65 });

  // 5E. 3D Craters & Magma Fissures
  // Crater 1
  const c1x = Math.cos(spinAngle) * 5 - 2;
  const c1y = currentY + Math.sin(spinAngle) * 5 - 2;
  meteorGraphic.beginPath();
  meteorGraphic.circle(c1x, c1y, 4.5);
  meteorGraphic.fill({ color: 0x180905, alpha: 0.9 });
  meteorGraphic.stroke({ width: 1.0, color: 0xaa4411, alpha: 0.8 });

  // Crater 2
  const c2x = Math.cos(spinAngle + 2.1) * 7 + 3;
  const c2y = currentY + Math.sin(spinAngle + 2.1) * 7 + 1;
  meteorGraphic.beginPath();
  meteorGraphic.circle(c2x, c2y, 3.5);
  meteorGraphic.fill({ color: 0x180905, alpha: 0.9 });
  meteorGraphic.stroke({ width: 1.0, color: 0xff6600, alpha: 0.9 });

  // Glowing Magma Fissure Lines across the Rock Body
  const fx1 = Math.cos(spinAngle + 0.8) * 8;
  const fy1 = currentY + Math.sin(spinAngle + 0.8) * 8;
  const fx2 = Math.cos(spinAngle + 3.8) * 9;
  const fy2 = currentY + Math.sin(spinAngle + 3.8) * 9;

  meteorGraphic.beginPath();
  meteorGraphic.moveTo(fx1, fy1);
  meteorGraphic.lineTo(0, currentY);
  meteorGraphic.lineTo(fx2, fy2);
  meteorGraphic.stroke({ width: 2.0, color: 0xff5500, alpha: 0.95 });

  meteorGraphic.beginPath();
  meteorGraphic.moveTo(fx1 * 0.5, fy1 * 0.5 + currentY * 0.5);
  meteorGraphic.lineTo(fx2 * 0.5, fy2 * 0.5 + currentY * 0.5);
  meteorGraphic.stroke({ width: 1.0, color: 0xffe500, alpha: 1.0 });

  // 5F. Friction Cap / White Hot Nose at bottom edge facing impact point
  meteorGraphic.beginPath();
  meteorGraphic.ellipse(0, currentY + baseRadius * 0.65, 9, 5);
  meteorGraphic.fill({ color: 0xffffff, alpha: 0.9 });

  meteorGraphic.beginPath();
  meteorGraphic.ellipse(0, currentY + baseRadius * 0.65, 13, 7);
  meteorGraphic.fill({ color: 0xffcc00, alpha: 0.6 });

  // ==========================================
  // 6. PROXIMITY IMPACT SHOCKWAVE & CAMERA SHAKE
  // ==========================================
  if (progress > 0.82) {
    const shockProgress = (progress - 0.82) / 0.18; // 0.0 -> 1.0
    const shockRadius = shockProgress * 42;

    meteorGraphic.beginPath();
    meteorGraphic.ellipse(0, offsetY, shockRadius, shockRadius * 0.6);
    meteorGraphic.stroke({ width: 2.5, color: 0xffaa00, alpha: (1.0 - shockProgress) * 0.9 });

    // Trigger screen shake callback if provided
    if (onImpactClose) {
      onImpactClose(10 * shockProgress);
    }
  }
}
