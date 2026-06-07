import { LevelConfig, SessionState } from '../types.ts';

export interface CampaignMetricResult {
  current: number;
  target: number;
  label: string;
}

export function getCampaignMetric(
  levelConfig: LevelConfig | null | undefined,
  grid: Record<string, any> | null | undefined,
  player: any | null | undefined,
  session: SessionState | null | undefined,
  language: 'RU' | 'EN',
  entropyCurrent?: number
): CampaignMetricResult | null {
  if (!grid || !player || !levelConfig) return null;
  const levelId = levelConfig.id;
  const ownedByLevel = (minLvl: number) =>
    Object.values(grid).filter((h: any) => h.ownerId === player.id && h.maxLevel >= minLvl).length;

  const portalActive = session?.portalActive || false;
  const evacuationActive = session?.evacuationActive || false;
  const monumentRevealedSlots = session?.monumentRevealedSlots || [];

  if (levelId === '1.1') {
    const wavePath = [
      { q: 0, r: 0 },
      { q: 1, r: -1 },
      { q: 2, r: -1 },
      { q: 2, r: 0 },
      { q: 1, r: 1 },
      { q: 0, r: 2 },
      { q: -1, r: 2 },
      { q: -2, r: 2 },
      { q: -3, r: 2 },
      { q: -3, r: 1 },
      { q: -2, r: 0 }
    ];
    const idx = wavePath.findIndex(p => p.q === player.q && p.r === player.r);
    return { current: idx !== -1 ? idx : 0, target: 10, label: language === 'RU' ? 'ШАГИ' : 'STEPS' };
  }
  if (levelId === '1.3') return { current: Math.max(0, 2 - (grid[`0,0`]?.currentLevel ?? 2)), target: 2, label: language === 'RU' ? 'СРЕЗАННЫЕ СЛОИ' : 'DIG LAYERS' };
  if (levelId === '1.4') return { current: grid[`0,0`]?.currentLevel ?? 0, target: 2, label: language === 'RU' ? 'ВЫСОТА ЦЕНТРА' : 'CENTER HEIGHT' };
  if (levelId === '1.5') return { current: grid[`0,0`]?.currentLevel ?? 0, target: 1, label: language === 'RU' ? 'ВЫСОТА ЦЕНТРА' : 'CENTER HEIGHT' };
  if (levelId === '1.6') return { current: player.coins, target: 100, label: language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS' };
  if (levelId === '1.7') {
    return { current: (player.q === 3 && player.r === -1) ? 1 : 0, target: 1, label: language === 'RU' ? 'ПОРТАЛ' : 'PORTAL' };
  }
  if (levelId === '1.8') return { current: Math.max(0, -(grid[`0,0`]?.currentLevel ?? 0)), target: 2, label: language === 'RU' ? 'ГЛУБИНА' : 'DEPTH' };
  if (levelId === '1.9') return { current: grid[`1,-1`]?.structureType !== 'VOID' ? 1 : 0, target: 1, label: language === 'RU' ? 'ЗАПЕЧАТАНО' : 'SEALED' };
  if (levelId === '1.10') {
    const count = [grid['0,-1'], grid['0,0'], grid['0,1']].filter(h => (h?.currentLevel ?? 0) >= 2).length;
    return { current: count, target: 3, label: language === 'RU' ? 'ОПОРЫ' : 'SUPPORTS' };
  }
  
  if (levelId === '2.1') {
    return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'ПОРТАЛ' : 'PORTAL' };
  }
  if (levelId === '2.2') {
    return { current: portalActive ? 3 : Math.min(3, player.inventory?.length ?? 0), target: 3, label: language === 'RU' ? 'ПРЕДМЕТЫ' : 'ITEMS' };
  }
  if (levelId === '2.3') {
    return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'ПОРТАЛ' : 'PORTAL' };
  }
  if (levelId === '2.4') {
    return { current: portalActive ? 1 : Math.min(1, player.inventory?.length ?? 0), target: 1, label: language === 'RU' ? 'КЛЮЧИ' : 'KEYS' };
  }
  if (levelId === '2.5') {
    const countL2 = Object.values(grid).filter((h: any) => (h?.currentLevel ?? 0) >= 2 && h.ownerId === player.id).length;
    return { current: evacuationActive ? 3 : Math.min(3, countL2), target: 3, label: language === 'RU' ? 'ЛИНИЯ L2' : 'LINE L2' };
  }
  if (levelId === '2.6') {
    const countL2 = Object.values(grid).filter((h: any) => (h?.currentLevel ?? 0) >= 2 && h.ownerId === player.id).length;
    return { current: evacuationActive ? 3 : Math.min(3, countL2), target: 3, label: language === 'RU' ? 'ТРЕУГОЛЬНИК L2' : 'TRIANGLE L2' };
  }
  if (levelId === '2.7') {
    const countL3 = Object.values(grid).filter((h: any) => (h?.currentLevel ?? 0) >= 3 && h.ownerId === player.id).length;
    return { current: evacuationActive ? 4 : Math.min(4, countL3), target: 4, label: language === 'RU' ? 'РОМБ L3' : 'DIAMOND L3' };
  }
  if (levelId === '2.8') {
    const countL3 = Object.values(grid).filter((h: any) => (h?.currentLevel ?? 0) >= 3 && h.ownerId === player.id).length;
    return { current: evacuationActive ? 6 : Math.min(6, countL3), target: 6, label: language === 'RU' ? 'КОЛЬЦО L3' : 'RING L3' };
  }
  if (levelId === '2.9') {
    const countL3 = Object.values(grid).filter((h: any) => (h?.currentLevel ?? 0) >= 3 && h.ownerId === player.id).length;
    return { current: evacuationActive ? 6 : Math.min(6, countL3), target: 6, label: language === 'RU' ? 'ФИГУРЫ L3' : 'SHAPES L3' };
  }
  if (levelId === '2.10') {
    return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'ПОРТАЛ' : 'PORTAL' };
  }

  if (levelId === '3.1') return { current: monumentRevealedSlots?.[0] ? 1 : 0, target: 1, label: language === 'RU' ? 'ОБЕЛИСК' : 'OBELISK' };
  if (levelId === '3.2') return { current: monumentRevealedSlots?.filter(Boolean).length || 0, target: 2, label: language === 'RU' ? 'МАЯКИ' : 'BEACONS' };
  if (levelId === '3.3') return { current: monumentRevealedSlots?.[0] ? 1 : 0, target: 1, label: language === 'RU' ? 'ОБЕЛИСК' : 'OBELISK' };
  if (levelId === '3.4') return { current: monumentRevealedSlots?.filter(Boolean).length || 0, target: 2, label: language === 'RU' ? 'ОБЕЛИСКИ' : 'OBELISKS' };
  if (levelId === '3.5') return { current: monumentRevealedSlots?.[0] ? 1 : 0, target: 1, label: language === 'RU' ? 'ОБЕЛИСК' : 'OBELISK' };
  if (levelId === '3.6') {
    const whisperCount = [
      (session as any)?._ob1Visited,
      (session as any)?._ob2Visited,
      (session as any)?._ob3Visited
    ].filter(Boolean).length;
    return { current: whisperCount, target: 3, label: language === 'RU' ? 'ШЕПОТЫ' : 'WHISPERS' };
  }
  if (levelId === '3.7') return { current: monumentRevealedSlots?.filter(Boolean).length || 0, target: 2, label: language === 'RU' ? 'ТАБЛИЦЫ' : 'TABLETS' };
  if (levelId === '3.8') return { current: monumentRevealedSlots?.filter(Boolean).length || 0, target: 3, label: language === 'RU' ? 'ЗАПИСИ' : 'RECORDS' };

  if (levelId === '4.1') return { current: ownedByLevel(2), target: 3, label: language === 'RU' ? 'ГЕКСЫ L2' : 'L2 HEXES' };
  if (levelId === '4.2') {
    const hexA = grid[`-2,0`];
    const hexB = grid[`2,0`];
    let currentValue = 0;
    if (hexA && hexA.ownerId === player.id && hexA.maxLevel >= 1) currentValue++;
    if (hexB && hexB.ownerId === player.id && hexB.maxLevel >= 1) currentValue++;
    return { current: currentValue, target: 2, label: language === 'RU' ? 'СИММЕТРИЯ' : 'SYMMETRY' };
  }
  if (levelId === '4.3') return { current: ownedByLevel(3), target: 2, label: language === 'RU' ? 'ГЕКСЫ L3' : 'L3 HEXES' };
  if (levelId === '4.4') return { current: grid[`0,0`]?.maxLevel ?? 0, target: 4, label: language === 'RU' ? 'УРОВЕНЬ' : 'LEVEL' };
  if (levelId === '4.5') {
    let goals = 0;
    if (ownedByLevel(2) >= 6) goals++;
    if ((player?.coins ?? 0) >= 200) goals++;
    const onMon = grid[`${player.q},${player.r}`]?.structureType === 'MONUMENT';
    if (onMon) goals++;
    return { current: goals, target: 2, label: language === 'RU' ? 'ЦЕЛИ' : 'GOALS' };
  }
  if (levelId === '4.6') return { current: ownedByLevel(3), target: 8, label: language === 'RU' ? 'ГЕКСЫ L3' : 'L3 HEXES' };
  if (levelId === '4.7') {
    const current = Math.min(4, ownedByLevel(3)) + Math.min(2, ownedByLevel(4));
    return { current, target: 6, label: language === 'RU' ? 'РЕЗОНАНСЫ L3+L4' : 'RESONANCE L3+L4' };
  }

  if (levelId === '4.8') {
    let goals = 0;
    const onMon = grid[`${player.q},${player.r}`]?.structureType === 'MONUMENT';
    if (onMon) goals++;
    if (ownedByLevel(3) >= 3) goals++;
    if ((player?.coins ?? 0) >= 300) goals++;
    if ((player?.inventory?.length ?? 0) >= 2) goals++;
    if ((entropyCurrent ?? 0) < 60) goals++;
    return { current: goals, target: 5, label: language === 'RU' ? 'СИНТЕЗ (5)' : 'SYNTHESIS (5)' };
  }

  return null;
}
