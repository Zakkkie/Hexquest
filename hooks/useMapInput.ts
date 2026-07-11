import { ReactMouseEvent, TouchEvent, useRef, useEffect } from 'react';
import { useGameStore } from '../store.ts';
import { useEphemeralStore } from '../store/ephemeralStore.ts';
import { getHexKey } from '../services/hexUtils.ts';
import { HEX_SIZE } from '../rules/config.ts';
import { getHeightOffset } from '../services/pixiHexRender.ts';
import { Hex } from '../types.ts';

interface UseMapInputProps {
  grid: Record<string, Hex> | undefined;
  rotation: number;
  activeLevelConfig: any;
  camera: { x: number; y: number; scale: number; rotation: number } | undefined;
  onHexClick: (q: number, r: number) => void;
  onHover: (hexId: string | null) => void;
  pixiAppRef: React.RefObject<any>;
}

export const useMapInput = ({
  grid,
  rotation,
  activeLevelConfig,
  camera,
  onHexClick,
  onHover,
  pixiAppRef,
}: UseMapInputProps) => {

  const getHexVisualHeight = getHeightOffset;
  const rectRef = useRef<DOMRect | null>(null);

  // Clear cached rect on window resize or scroll to ensure layout bounds stay correct
  useEffect(() => {
    const handleResizeOrScroll = () => {
      rectRef.current = null;
    };
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);
    return () => {
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent | React.TouchEvent) => {
    const app = pixiAppRef.current;
    if (!app || !app.renderer || !app.canvas || !grid) return;

    if (!rectRef.current) {
      rectRef.current = app.canvas.getBoundingClientRect();
    }
    const rect = rectRef.current!;
    const clientX = 'clientX' in e ? e.clientX : (e as any).touches?.[0]?.clientX;
    const clientY = 'clientY' in e ? e.clientY : (e as any).touches?.[0]?.clientY;

    if (clientX === undefined || clientY === undefined) return;

    const canvasX = clientX - rect.left;
    const canvasY = clientY - rect.top;

    const cam = camera || { x: 0, y: 0, scale: 1 };
    const rx = (canvasX - cam.x) / cam.scale;
    const ry = (canvasY - cam.y) / cam.scale;

    // Un-project unrotated grid bounds
    const angleRad = -rotation * (Math.PI / 180);
    const uCos = Math.cos(angleRad);
    const uSin = Math.sin(angleRad);
    const unscaledY = ry / 0.8;
    const rawX = rx * uCos - unscaledY * uSin;
    const rawY = rx * uSin + unscaledY * uCos;

    const fracR = rawY / (1.5 * HEX_SIZE);
    const fracQ = rawX / (Math.sqrt(3) * HEX_SIZE) - fracR / 2;

    // Axial rounding
    const fracS = -fracQ - fracR;
    let q = Math.round(fracQ);
    let r = Math.round(fracR);
    const s = Math.round(fracS);
    const qDiff = Math.abs(q - fracQ);
    const rDiff = Math.abs(r - fracR);
    const sDiff = Math.abs(s - fracS);

    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - s;
    } else if (rDiff > sDiff) {
      r = -q - s;
    }

    // Scan Neighbors circle search for correct elevation heights
    let bestHexKey: string | null = null;
    let bestDist = Infinity;

    const rAngleRad = rotation * (Math.PI / 180);
    const cosC = Math.cos(rAngleRad);
    const sinC = Math.sin(rAngleRad);

    for (let dq = -4; dq <= 4; dq++) {
      for (let dr = Math.max(-4, -4 - dq); dr <= Math.min(4, 4 - dq); dr++) {
        const hKey = getHexKey(q + dq, r + dr);
        const cand = grid[hKey];
        if (!cand) continue;

        const forceReveal = (!!activeLevelConfig && activeLevelConfig.mapConfig?.revealMode !== 'fog') || !!useGameStore.getState().session?.defense?.isDefenseMode;
        const isRevealed = !!cand.revealed || forceReveal;
        if (!isRevealed) continue;

        const rawXCenter = HEX_SIZE * (Math.sqrt(3) * cand.q + (Math.sqrt(3) / 2) * cand.r);
        const rawYCenter = HEX_SIZE * (1.5 * cand.r);

        const px = rawXCenter * cosC - rawYCenter * sinC;
        const isVoid = cand.structureType === 'VOID';
        const offsetY = isVoid ? -10 : getHexVisualHeight(cand.currentLevel);
        const py = (rawXCenter * sinC + rawYCenter * cosC) * 0.8 + offsetY;

        const dx = px - rx;
        const dy = (py - ry) / 0.8;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist && dist < HEX_SIZE * 1.25) {
          bestDist = dist;
          bestHexKey = hKey;
        }
      }
    }

    if (bestHexKey && grid[bestHexKey]) {
      const finalHex = grid[bestHexKey];
      e.stopPropagation();
      onHexClick(finalHex.q, finalHex.r);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    const app = pixiAppRef.current;
    if (!app || !app.renderer || !app.canvas || !grid) return;

    if (!rectRef.current) {
      rectRef.current = app.canvas.getBoundingClientRect();
    }
    const rect = rectRef.current!;
    const canvasX = e.clientX - rect.left;
    const canvasY = e.clientY - rect.top;

    const cam = camera || { x: 0, y: 0, scale: 1 };
    const rx = (canvasX - cam.x) / cam.scale;
    const ry = (canvasY - cam.y) / cam.scale;

    const angleRad = -rotation * (Math.PI / 180);
    const uCos = Math.cos(angleRad);
    const uSin = Math.sin(angleRad);
    const unscaledY = ry / 0.8;
    const rawX = rx * uCos - unscaledY * uSin;
    const rawY = rx * uSin + unscaledY * uCos;

    const fracR = rawY / (1.5 * HEX_SIZE);
    const fracQ = rawX / (Math.sqrt(3) * HEX_SIZE) - fracR / 2;

    const fracS = -fracQ - fracR;
    let q = Math.round(fracQ);
    let r = Math.round(fracR);
    const s = Math.round(fracS);
    const qDiff = Math.abs(q - fracQ);
    const rDiff = Math.abs(r - fracR);
    const sDiff = Math.abs(s - fracS);

    if (qDiff > rDiff && qDiff > sDiff) {
      q = -r - s;
    } else if (rDiff > sDiff) {
      r = -q - s;
    }

    let bestHexKey: string | null = null;
    let bestDist = Infinity;

    const rAngleRad = rotation * (Math.PI / 180);
    const cosC = Math.cos(rAngleRad);
    const sinC = Math.sin(rAngleRad);

    for (let dq = -4; dq <= 4; dq++) {
      for (let dr = Math.max(-4, -4 - dq); dr <= Math.min(4, 4 - dq); dr++) {
        const hKey = getHexKey(q + dq, r + dr);
        const cand = grid[hKey];
        if (!cand) continue;

        const forceReveal = (!!activeLevelConfig && activeLevelConfig.mapConfig?.revealMode !== 'fog') || !!useGameStore.getState().session?.defense?.isDefenseMode;
        const isRevealed = !!cand.revealed || forceReveal;
        if (!isRevealed) continue;

        const rawXCenter = HEX_SIZE * (Math.sqrt(3) * cand.q + (Math.sqrt(3) / 2) * cand.r);
        const rawYCenter = HEX_SIZE * (1.5 * cand.r);

        const px = rawXCenter * cosC - rawYCenter * sinC;
        const isVoid = cand.structureType === 'VOID';
        const offsetY = isVoid ? -10 : getHexVisualHeight(cand.currentLevel);
        const py = (rawXCenter * sinC + rawYCenter * cosC) * 0.8 + offsetY;

        const dx = px - rx;
        const dy = (py - ry) / 0.8;
        const dist = Math.hypot(dx, dy);
        if (dist < bestDist && dist < HEX_SIZE * 1.25) {
          bestDist = dist;
          bestHexKey = hKey;
        }
      }
    }

    if (bestHexKey) {
      if (useEphemeralStore.getState().hoveredHexId !== bestHexKey) {
        onHover(bestHexKey);
      }
    } else {
      if (useEphemeralStore.getState().hoveredHexId !== null) {
        onHover(null);
      }
    }
  };

  const handleCanvasMouseLeave = () => {
    if (useEphemeralStore.getState().hoveredHexId !== null) {
      onHover(null);
    }
  };

  return {
    handleCanvasClick,
    handleCanvasMouseMove,
    handleCanvasMouseLeave,
  };
};
