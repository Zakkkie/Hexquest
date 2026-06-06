
export function isSafeCoord(value: any): boolean {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}

export function safifyCoord(x: number | null | undefined, y: number | null | undefined): { x: number; y: number } {
  const safeX = isSafeCoord(x) ? (x as number) : 0;
  const safeY = isSafeCoord(y) ? (y as number) : 0;
  return { x: safeX, y: safeY };
}

