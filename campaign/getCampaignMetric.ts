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
      { q: 1, r: 0 },
      { q: 2, r: 0 },
      { q: 3, r: 0 },
      { q: 4, r: 0 },
      { q: 5, r: 0 },
      { q: 6, r: 0 },
      { q: 6, r: 1 },
      { q: 5, r: 2 },
      { q: 4, r: 3 },
      { q: 3, r: 3 },
      { q: 2, r: 3 },
      { q: 1, r: 3 },
      { q: 0, r: 3 },
      { q: -1, r: 3 },
      { q: -2, r: 3 }
    ];
    const idx = wavePath.findIndex(p => p.q === player.q && p.r === player.r);
    return { current: idx !== -1 ? idx : 0, target: 15, label: language === 'RU' ? 'ШАГИ' : 'STEPS' };
  }
  if (levelId === '1.2') {
    return { current: (player.q === -8 && player.r === 0) ? 1 : 0, target: 1, label: language === 'RU' ? 'СТОЛИЦА' : 'CAPITAL' };
  }
  if (levelId === '1.3') {
    return { current: Math.max(0, 2 - (grid['0,0']?.currentLevel ?? 2)), target: 2, label: language === 'RU' ? 'СРЕЗАННЫЕ СЛОИ' : 'DIG LAYERS' };
  }
  if (levelId === '1.4') {
    return { current: grid['0,0']?.currentLevel ?? 0, target: 3, label: language === 'RU' ? 'ВЫСОТА ЦЕНТРА' : 'CENTER HEIGHT' };
  }
  if (levelId === '1.5') {
    return { current: player.coins, target: 100, label: language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS' };
  }
  if (levelId === '1.6') {
    const depthOk = (grid['0,0']?.currentLevel ?? 0) <= -2 ? 1 : 0;
    const healedOk = grid['1,-1']?.structureType !== 'VOID' ? 1 : 0;
    return { current: depthOk + healedOk, target: 2, label: language === 'RU' ? 'ЗАДАЧИ' : 'OBJECTIVES' };
  }
  if (levelId === '1.7') {
    return { current: (player.q === 8 && player.r === 0) ? 1 : 0, target: 1, label: language === 'RU' ? 'СТОЛИЦА' : 'CAPITAL' };
  }
  if (levelId === '1.8') {
    const count = [grid['0,-1'], grid['0,0'], grid['0,1']].filter(h => (h?.currentLevel ?? 0) >= 2).length;
    return { current: count, target: 3, label: language === 'RU' ? 'ОПОРЫ' : 'SUPPORTS' };
  }
  if (levelId === '1.9') {
    return { current: player.playerLevel, target: 2, label: language === 'RU' ? 'РАНГ' : 'RANK' };
  }
  if (levelId === '1.10') {
    const rankOk = player.playerLevel >= 3 ? 1 : 0;
    const coinsOk = player.coins >= 50 ? 1 : 0;
    return { current: rankOk + coinsOk, target: 2, label: language === 'RU' ? 'ЗАДАЧИ' : 'OBJECTIVES' };
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
  if (levelId === '3.9') return { current: Math.min(7, ownedByLevel(3)), target: 7, label: language === 'RU' ? 'ЗВЕЗДА L3' : 'STAR L3' };
  if (levelId === '3.10') return { current: monumentRevealedSlots?.filter(Boolean).length || 0, target: 3, label: language === 'RU' ? 'ОБЕЛИСКИ' : 'OBELISKS' };
  if (levelId === '3.11') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };
  if (levelId === '3.12') return { current: Math.min(3, ownedByLevel(3)), target: 3, label: language === 'RU' ? 'ТРЕУГОЛЬНИК L3' : 'TRIANGLE L3' };
  if (levelId === '3.13') return { current: Math.min(4, ownedByLevel(2)), target: 4, label: language === 'RU' ? 'РОМБ L2' : 'DIAMOND L2' };
  if (levelId === '3.14') return { current: Math.min(4, ownedByLevel(4)), target: 4, label: language === 'RU' ? 'КВАДРАТ L4' : 'SQUARE L4' };
  if (levelId === '3.15') return { current: Math.min(6, ownedByLevel(3)), target: 6, label: language === 'RU' ? 'КОЛЬЦО L3' : 'RING L3' };
  if (levelId === '3.16') return { current: Math.min(3, ownedByLevel(4)), target: 3, label: language === 'RU' ? 'ЛИНИЯ L4' : 'LINE L4' };
  if (levelId === '3.17') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };
  if (levelId === '3.18') return { current: Math.min(7, ownedByLevel(4)), target: 7, label: language === 'RU' ? 'ГЕКСАГОН L4' : 'HEXAGON L4' };
  if (levelId === '3.19') return { current: Math.min(3, ownedByLevel(3)) + Math.min(4, ownedByLevel(2)), target: 7, label: language === 'RU' ? 'ФИГУРЫ' : 'SHAPES' };
  if (levelId === '3.20') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };

  // Series 4
  const botOwnedByLevel = (minLvl: number) =>
    Object.values(grid).filter((h: any) => h.ownerId?.startsWith('bot') && h.maxLevel >= minLvl).length;

  if (levelId === '4.1') return { current: Math.min(30, session?.currentTurn ?? 0), target: 30, label: language === 'RU' ? 'ХОДЫ' : 'TURNS' };
  if (levelId === '4.2') return { current: Math.min(2, ownedByLevel(4)), target: 2, label: language === 'RU' ? 'ГЕКСЫ L4' : 'L4 HEXES' };
  if (levelId === '4.3') return { current: Math.min(1, ownedByLevel(5)), target: 1, label: language === 'RU' ? 'ГЕКСЫ L5' : 'L5 HEXES' };
  if (levelId === '4.4') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };
  if (levelId === '4.5') return { current: Math.min(7, ownedByLevel(2)), target: 7, label: language === 'RU' ? 'ЗВЕЗДА L2' : 'STAR L2' };
  if (levelId === '4.6') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };
  if (levelId === '4.7') return { current: Math.min(300, player.coins ?? 0), target: 300, label: language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS' };
  if (levelId === '4.8') return { current: Math.min(7, ownedByLevel(3)), target: 7, label: language === 'RU' ? 'ГЕКСАГОН L3' : 'HEXAGON L3' };
  if (levelId === '4.9') return { current: botOwnedByLevel(3) === 0 ? 1 : 0, target: 1, label: language === 'RU' ? 'ОЧИЩЕНО' : 'CLEARED' };
  if (levelId === '4.10') return { current: (session as any)?.bots?.length === 0 ? 1 : 0, target: 1, label: language === 'RU' ? 'ОЧИЩЕНО' : 'CLEARED' };
  if (levelId === '4.11') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };
  if (levelId === '4.12') return { current: Math.min(4, ownedByLevel(3)), target: 4, label: language === 'RU' ? 'РОМБ L3' : 'DIAMOND L3' };
  if (levelId === '4.13') return { current: Math.min(6, ownedByLevel(2)), target: 6, label: language === 'RU' ? 'КОЛЬЦО L2' : 'RING L2' };
  if (levelId === '4.14') return { current: Math.min(30, session?.currentTurn ?? 0), target: 30, label: language === 'RU' ? 'ХОДЫ' : 'TURNS' };
  if (levelId === '4.15') return { current: (ownedByLevel(5) >= 1 && botOwnedByLevel(5) === 0) ? 1 : 0, target: 1, label: language === 'RU' ? 'ЗАДАЧА' : 'OBJECTIVE' };
  if (levelId === '4.16') return { current: Math.min(6, ownedByLevel(3)), target: 6, label: language === 'RU' ? 'ЛИНИИ L3' : 'LINES L3' };
  if (levelId === '4.17') return { current: Math.min(3, ownedByLevel(4)), target: 3, label: language === 'RU' ? 'ТРЕУГОЛЬНИК L4' : 'TRIANGLE L4' };
  if (levelId === '4.18') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };
  if (levelId === '4.19') return { current: Math.min(7, ownedByLevel(3)), target: 7, label: language === 'RU' ? 'ГЕКСАГОН L3' : 'HEXAGON L3' };
  if (levelId === '4.20') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };

  // Series 5
  if (levelId === '5.1') return { current: session?.activatedMiniMonuments?.length || 0, target: 3, label: language === 'RU' ? 'МОНУМЕНТЫ' : 'MONUMENTS' };
  if (levelId === '5.2') return { current: (player.q === 0 && player.r === -4) ? 1 : 0, target: 1, label: language === 'RU' ? 'ВЫХОД' : 'EXIT' };
  if (levelId === '5.3') return { current: Math.min(3, ownedByLevel(4)), target: 3, label: language === 'RU' ? 'ЛИНИЯ L4' : 'LINE L4' };
  if (levelId === '5.4') return { current: Math.min(1, ownedByLevel(5)), target: 1, label: language === 'RU' ? 'ГЕКСЫ L5' : 'L5 HEXES' };
  if (levelId === '5.5') return { current: Math.min(2, ownedByLevel(3)), target: 2, label: language === 'RU' ? 'ГЕКСЫ L3' : 'L3 HEXES' };
  if (levelId === '5.6') return { current: Math.min(1500, player.coins ?? 0), target: 1500, label: language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS' };
  if (levelId === '5.7') return { current: Math.min(4, ownedByLevel(3)), target: 4, label: language === 'RU' ? 'РОМБ L3' : 'DIAMOND L3' };
  if (levelId === '5.8') return { current: Math.min(5, player.playerLevel), target: 5, label: language === 'RU' ? 'РАНГ' : 'RANK' };
  if (levelId === '5.9') return { current: entropyCurrent ?? 0, target: 50, label: language === 'RU' ? 'ЭНТРОПИЯ' : 'ENTROPY' };
  if (levelId === '5.10') return { current: (player.q === 0 && player.r === 0) ? 1 : 0, target: 1, label: language === 'RU' ? 'ЦЕНТР' : 'CENTER' };
  if (levelId === '5.11') return { current: Math.min(6, ownedByLevel(3)), target: 6, label: language === 'RU' ? 'ПИРАМИДА L3' : 'PYRAMID L3' };
  if (levelId === '5.12') return { current: Math.min(40, session?.currentTurn ?? 0), target: 40, label: language === 'RU' ? 'ВЫЖИВАНИЕ' : 'SURVIVAL' };
  if (levelId === '5.13') {
    const countNeg2 = Object.values(grid).filter((h: any) => h.ownerId === player.id && h.currentLevel <= -2).length;
    return { current: Math.min(4, countNeg2) + Math.min(4, ownedByLevel(2)), target: 8, label: language === 'RU' ? 'РОМБЫ' : 'DIAMONDS' };
  }
  if (levelId === '5.14') return { current: Math.min(3, (session as any)?.restoredHexesCount ?? 0), target: 3, label: language === 'RU' ? 'РЕАКТОРЫ' : 'REACTORS' };
  if (levelId === '5.15') return { current: Math.min(6, ownedByLevel(3)), target: 6, label: language === 'RU' ? 'КОЛЬЦО L3' : 'RING L3' };
  if (levelId === '5.16') return { current: Math.min(200, player.coins ?? 0), target: 200, label: language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS' };
  if (levelId === '5.17') return { current: Math.min(3, ownedByLevel(3)), target: 3, label: language === 'RU' ? 'ЛИНИЯ L3' : 'LINE L3' };
  if (levelId === '5.18') {
    const currentDepth = Math.max(0, -(grid[`${player.q},${player.r}`]?.currentLevel ?? 0));
    return { current: currentDepth, target: 10, label: language === 'RU' ? 'ГЛУБИНА' : 'DEPTH' };
  }
  if (levelId === '5.19') return { current: Math.min(3, ownedByLevel(4)), target: 3, label: language === 'RU' ? 'ЛИНИЯ L4' : 'LINE L4' };
  if (levelId === '5.20') return { current: Math.min(500, player.coins ?? 0), target: 500, label: language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS' };
  if (levelId === '5.21') return { current: session?.activatedMiniMonuments?.length || 0, target: 1, label: language === 'RU' ? 'ОБЕЛИСК' : 'OBELISK' };
  if (levelId === '5.22') return { current: Math.min(12, ownedByLevel(2)), target: 12, label: language === 'RU' ? 'КОЛЬЦА L2' : 'RINGS L2' };
  if (levelId === '5.23') return { current: Math.min(5, ownedByLevel(4)), target: 5, label: language === 'RU' ? 'ПЛИТЫ L4' : 'L4 PLATES' };
  if (levelId === '5.24') return { current: Math.min(2, ownedByLevel(4)), target: 2, label: language === 'RU' ? 'ПЛИТЫ L4' : 'L4 PLATES' };
  if (levelId === '5.25') return { current: Math.min(7, ownedByLevel(3)), target: 7, label: language === 'RU' ? 'ЗВЕЗДА L3' : 'STAR L3' };
  if (levelId === '5.26') return { current: Math.min(50, player.coins ?? 0), target: 50, label: language === 'RU' ? 'КРЕДИТЫ' : 'CREDITS' };
  if (levelId === '5.27') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };
  if (levelId === '5.28') return { current: (player.q === 3 && player.r === 3) ? 1 : 0, target: 1, label: language === 'RU' ? 'ЦЕЛЬ' : 'TARGET' };
  if (levelId === '5.29') return { current: Math.min(1, ownedByLevel(6)), target: 1, label: language === 'RU' ? 'ПЛИТА L6' : 'L6 PLATE' };
  if (levelId === '5.30') return { current: portalActive ? 1 : 0, target: 1, label: language === 'RU' ? 'МОНУМЕНТ' : 'MONUMENT' };

  return null;
}
