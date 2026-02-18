
export const SAFE_COORD_ZERO = { x: 0, y: 0 };

export function isSafeCoord(value: any): boolean {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

export function safifyCoord(x: number | null | undefined, y: number | null | undefined): { x: number; y: number } {
  const safeX = isSafeCoord(x) ? (x as number) : 0;
  const safeY = isSafeCoord(y) ? (y as number) : 0;
  return { x: safeX, y: safeY };
}

export function roundCoord(x: number, y: number, precision: number = 2): { x: number; y: number } {
  const factor = Math.pow(10, precision);
  return {
    x: Math.round(x * factor) / factor,
    y: Math.round(y * factor) / factor
  };
}
