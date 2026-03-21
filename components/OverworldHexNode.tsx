import React, { useRef, useEffect, useMemo } from 'react';
import { Group, Line, Circle, Path, RegularPolygon, Rect, Text } from 'react-konva';
import Konva from 'konva';
import { GAME_CONFIG } from '../rules/config.ts';
import { OverworldHex, TerrainType } from '../types.ts';
import { textureService } from '../services/textureService.ts';
import { getHexHeight } from '../services/OverworldGenerator.ts';
import { getTheme } from './MapRenderer.tsx';
import { useGameStore } from '../store.ts';
import { TEXT } from '../services/i18n.ts';

interface OverworldHexNodeProps {
  hex: OverworldHex;
  x: number;
  y: number;
  isLocked?: boolean;
  isPassable?: boolean;
  neighborLevels: number[];
  neighborPoiIds?: (string | null)[];
  onClick: (q: number, r: number) => void;
  highlight?: 'REACHABLE' | 'UNREACHABLE' | 'NONE';
}

export const TERRAIN_LEVELS: Record<string, number> = {}; // Keep for compatibility if needed elsewhere, but it's empty

const OverworldHexNode: React.FC<OverworldHexNodeProps> = ({ hex, x, y, isLocked, isPassable = true, neighborLevels, neighborPoiIds = [], onClick, highlight = 'NONE' }) => {
  const groupRef = useRef<Konva.Group>(null);
  const baseRef = useRef<Konva.Group>(null);
  const animRef = useRef<Konva.Animation | null>(null);
  const waterLayerRef = useRef<Konva.Group>(null);
  const riftRef = useRef<Konva.Group>(null);
  const poiRef = useRef<Konva.Group>(null);

  const [isHovered, setIsHovered] = React.useState(false);
  const language = useGameStore(state => state.language);

  const size = GAME_CONFIG.HEX_SIZE;
  
  const getHeightOffset = (lvl: number) => {
    if (lvl >= 0) return -(2 + lvl * 2);
    return (Math.abs(lvl) - 1) * 2;
  };

  const level = hex.height ?? getHexHeight(hex.terrainType);
  const offsetY = getHeightOffset(level);
  const MAX_WALL_DEPTH = 32;
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      pts.push({ x: size * Math.cos(angle), y: size * Math.sin(angle) });
    }
    return pts;
  }, [size]);

  const topPathData = useMemo(() => {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y} L ${points[2].x} ${points[2].y} L ${points[3].x} ${points[3].y} L ${points[4].x} ${points[4].y} L ${points[5].x} ${points[5].y} Z`;
  }, [points]);

  useEffect(() => {
    // Clear existing cache before re-caching if dependencies changed
    if (baseRef.current) {
      baseRef.current.clearCache();
      
      // Cache the base static hex for performance
      baseRef.current.cache({
        x: -size - 20,
        y: -size - 40,
        width: size * 2 + 40,
        height: size * 2 + 80,
        pixelRatio: 1
      });
    }

    // Cache the animated parts so we only animate bitmaps, not vectors
    if (waterLayerRef.current) {
      waterLayerRef.current.cache({
        x: -15, y: -5, width: 30, height: 20, pixelRatio: 1
      });
    }
    if (riftRef.current) {
      riftRef.current.cache({
        x: -20, y: -20, width: 40, height: 40, pixelRatio: 1
      });
    }

    if (hex.terrainType === 'WATER' && waterLayerRef.current) {
      animRef.current = new Konva.Animation((frame) => {
        if (!frame || !waterLayerRef.current) return;
        const time = frame.time / 1000;
        waterLayerRef.current.y(Math.sin(time * 2) * 2);
        waterLayerRef.current.opacity(0.6 + Math.sin(time * 3) * 0.2);
      }, waterLayerRef.current.getLayer());
      animRef.current.start();
    } else if (hex.riftId && riftRef.current) {
      animRef.current = new Konva.Animation((frame) => {
        if (!frame || !riftRef.current) return;
        const time = frame.time / 1000;
        riftRef.current.rotation(time * 45);
        const scale = 1 + Math.sin(time * 4) * 0.1;
        riftRef.current.scale({ x: scale, y: scale });
      }, riftRef.current.getLayer());
      animRef.current.start();
    } else if (hex.poiId && poiRef.current) {
      animRef.current = new Konva.Animation((frame) => {
        if (!frame || !poiRef.current) return;
        const time = frame.time / 1000;
        poiRef.current.y(-20 + Math.sin(time * 3) * 4);
      }, poiRef.current.getLayer());
      animRef.current.start();
    }

    return () => {
      if (animRef.current) {
        animRef.current.stop();
      }
    };
  }, [hex.terrainType, hex.riftId, size, level, neighborLevels]);

  const topTexture = useMemo(() => textureService.getTexture(level, hex.q, hex.r, hex.terrainType), [level, hex.q, hex.r, hex.terrainType]);
  const sideTexture = useMemo(() => textureService.getSideTexture(level, hex.terrainType), [level, hex.terrainType]);
  const theme = useMemo(() => getTheme(level), [level]);

  const getBiomeColor = (type: TerrainType, lvl: number, poiId?: string) => {
    if (type === 'BUILDING' && poiId) {
      switch(poiId) {
        case 'city_capitol': return '#fbbf24'; // Amber-400
        case 'city_bar': return '#f87171'; // Red-400
        case 'city_bank': return '#34d399'; // Emerald-400
        case 'city_shop': return '#60a5fa'; // Blue-400
        case 'city_workshop': return '#a78bfa'; // Violet-400
        case 'city_checkpoint': return '#a1a1aa'; // Zinc-400
        case 'city_hub': return '#818cf8'; // Indigo-400
      }
    }
    const defaultHeight = getHexHeight(type);
    if (lvl !== defaultHeight) {
      const theme = getTheme(lvl);
      return theme.main;
    }
    switch(type) {
      case 'PLAINS':        return '#94a3b8'; 
      case 'FOREST':        return '#64748b'; 
      case 'SWAMP':         return '#a855f7'; 
      case 'WATER':         return '#38bdf8'; 
      case 'MOUNTAINS':     return '#cbd5e1'; 
      case 'ROAD':          return '#e7e5e4'; 
      case 'CITY':          return '#fcd34d'; 
      case 'RUINS':         return '#818cf8'; 
      case 'OUTPOST':       return '#fca5a5'; 
      case 'MERCHANT_CAMP': return '#fde047'; 
      case 'WALL':          return '#475569';
      case 'BUILDING':      return '#64748b';
      case 'SETTLEMENT':    return '#fbbf24';
      case 'MONUMENT_AREA': return '#8b5cf6';
      case 'RIFT_ZONE':     return '#ef4444';
      case 'WASTELAND':     return '#78350f';
      case 'CANYON':        return '#0c4a6e';
      default:              return '#e2e8f0'; 
    }
  };

  const getBiomeSideColor = (type: TerrainType, lvl: number, poiId?: string) => {
    if (type === 'BUILDING' && poiId) {
      switch(poiId) {
        case 'city_capitol': return '#d97706'; // Amber-600
        case 'city_bar': return '#dc2626'; // Red-600
        case 'city_bank': return '#059669'; // Emerald-600
        case 'city_shop': return '#2563eb'; // Blue-600
        case 'city_workshop': return '#7c3aed'; // Violet-600
        case 'city_checkpoint': return '#52525b'; // Zinc-600
      }
    }
    const defaultHeight = getHexHeight(type);
    if (lvl !== defaultHeight) {
      const theme = getTheme(lvl);
      return theme.dark;
    }
    switch(type) {
      case 'PLAINS':        return '#475569'; 
      case 'FOREST':        return '#334155'; 
      case 'SWAMP':         return '#7e22ce'; 
      case 'WATER':         return '#0284c7'; 
      case 'MOUNTAINS':     return '#64748b'; 
      case 'ROAD':          return '#a8a29e'; 
      case 'CITY':          return '#d97706'; 
      case 'RUINS':         return '#4f46e5'; 
      case 'OUTPOST':       return '#dc2626'; 
      case 'MERCHANT_CAMP': return '#ca8a04'; 
      case 'WALL':          return '#1e293b';
      case 'BUILDING':      return '#334155';
      case 'SETTLEMENT':    return '#b45309';
      case 'MONUMENT_AREA': return '#5b21b6';
      case 'RIFT_ZONE':     return '#991b1b';
      case 'WASTELAND':     return '#451a03';
      case 'CANYON':        return '#082f49';
      default:              return '#94a3b8'; 
    }
  };

  const walls = useMemo(() => {
    const sideColor = getBiomeSideColor(hex.terrainType, level, hex.poiId);
    const indices = [0, 1, 2]; 
    const wallSegments = [];
    
    for (const i of indices) {
      const nLevel = neighborLevels[i];
      let nY = 0;
      if (nLevel === -99) nY = offsetY + MAX_WALL_DEPTH;
      else nY = getHeightOffset(nLevel);

      // Special case for WALL: ensure side walls go down to at least level 0
      if (hex.terrainType === 'WALL') {
        const level0Y = getHeightOffset(0);
        nY = Math.max(nY, level0Y);
      }

      if (offsetY < nY) {
        const safeNY = Math.min(nY, offsetY + MAX_WALL_DEPTH);
        const next = (i + 1) % 6;
        const p1 = points[i];
        const p2 = points[next];
        
        const heightDiff = safeNY - offsetY;
        const b1x = p2.x;
        const b2x = p1.x;

        const segmentData = `M ${p1.x} ${p1.y * 0.8 + offsetY} L ${p2.x} ${p2.y * 0.8 + offsetY} L ${b1x} ${p2.y * 0.8 + offsetY + heightDiff} L ${b2x} ${p1.y * 0.8 + offsetY + heightDiff} Z`;
        
        const shading = i === 1 ? 0 : (i === 0 ? -0.2 : -0.1);
        
        wallSegments.push({ data: segmentData, shading, heightDiff });
      }
    }

    if (wallSegments.length === 0) return null;

    return (
      <Group listening={false}>
        {wallSegments.map((seg, idx) => (
          <Group key={`wall-seg-${idx}`}>
            <Path 
              data={seg.data}
              fillPatternImage={sideTexture as any}
              fillPatternScale={{ x: 1, y: seg.heightDiff / 64 }}
              fill={sideTexture ? undefined : sideColor}
              stroke={theme.stroke}
              strokeWidth={1.5}
              perfectDrawEnabled={false}
            />
            <Path 
              data={seg.data}
              fill={seg.shading > 0 ? `rgba(255,255,255,${seg.shading})` : `rgba(0,0,0,${Math.abs(seg.shading)})`}
              listening={false}
              perfectDrawEnabled={false}
            />
          </Group>
        ))}
      </Group>
    );
  }, [points, offsetY, hex.terrainType, sideTexture, neighborLevels, level]);

  const terrainDetails = useMemo(() => {
    return [];
  }, [hex.terrainType, hex.q, hex.r, size]);

  return (
    <Group 
      x={x} 
      y={y} 
      onClick={() => onClick(hex.q, hex.r)} 
      onTap={() => onClick(hex.q, hex.r)}
      onMouseEnter={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = 'pointer';
        setIsHovered(true);
        if (groupRef.current) {
          groupRef.current.to({ scaleX: 1.05, scaleY: 1.05, duration: 0.1 });
        }
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage()?.container();
        if (container) container.style.cursor = 'grab';
        setIsHovered(false);
        if (groupRef.current) {
          groupRef.current.to({ scaleX: 1, scaleY: 1, duration: 0.1 });
        }
      }}
      ref={groupRef}
    >
      <Group ref={baseRef}>
        {/* Walls */}
        {walls}{/* Top Face Group */}<Group y={offsetY} scaleY={0.8}>
          {/* Base Hex */}
          <Path 
            data={topPathData}
            fillPatternImage={topTexture as any}
            fillPatternScale={{ x: size / 32, y: size / 32 }}
            fillPatternOffset={{ x: 32, y: 32 }}
            fillPatternRepeat="repeat"
            fill={topTexture ? undefined : getBiomeColor(hex.terrainType, level, hex.poiId)}
            stroke={isHovered ? '#94a3b8' : theme.stroke} 
            strokeWidth={isHovered ? 2 : 2} 
            perfectDrawEnabled={true}
          />

          {/* Remove internal borders for building clusters */}
          {hex.poiId && hex.terrainType === 'CITY' && neighborPoiIds && (
            <Group>
              {[0, 1, 2, 3, 4, 5].map(i => {
                if (neighborPoiIds[i] === hex.poiId) {
                  const p1 = points[i];
                  const p2 = points[(i + 1) % 6];
                  return (
                    <Line
                      key={`border-remove-${i}`}
                      points={[p1.x, p1.y, p2.x, p2.y]}
                      stroke={getBiomeColor(hex.terrainType, level, hex.poiId)}
                      strokeWidth={3} // Slightly thicker to fully cover the border
                      lineCap="square"
                    />
                  );
                }
                return null;
              })}
            </Group>
          )}

          {/* Roof for Buildings */}
          {hex.terrainType === 'BUILDING' && (
            <Group>
              {/* Left Roof */}
              <Line
                points={[
                  points[5].x, points[5].y, // Top
                  points[2].x, points[2].y, // Bottom
                  points[3].x, points[3].y, // Bottom Left
                  points[4].x, points[4].y  // Top Left
                ]}
                fill="rgba(255, 255, 255, 0.15)"
                closed
                listening={false}
              />
              {/* Right Roof */}
              <Line
                points={[
                  points[5].x, points[5].y, // Top
                  points[0].x, points[0].y, // Top Right
                  points[1].x, points[1].y, // Bottom Right
                  points[2].x, points[2].y  // Bottom
                ]}
                fill="rgba(0, 0, 0, 0.2)"
                closed
                listening={false}
              />
              {/* Roof Ridge (Center Line) */}
              <Line
                points={[points[5].x, points[5].y, points[2].x, points[2].y]}
                stroke="rgba(0,0,0,0.4)"
                strokeWidth={2}
                listening={false}
              />
            </Group>
          )}

          {/* Impassable Indicator */}
          {!isPassable && hex.terrainType !== 'CITY' && hex.terrainType !== 'BUILDING' && hex.terrainType !== 'WALL' && (
            <Group opacity={0.8}>
              {hex.terrainType === 'WATER' ? (
                <Group y={-2}>
                  <Path 
                    data="M -12 0 Q -6 -6 0 0 Q 6 6 12 0" 
                    stroke="#38bdf8" 
                    strokeWidth={2.5} 
                    lineCap="round"
                    shadowBlur={5}
                    shadowColor="#38bdf8"
                  />
                  <Path 
                    data="M -12 6 Q -6 0 0 6 Q 6 12 12 6" 
                    stroke="#0ea5e9" 
                    strokeWidth={2} 
                    lineCap="round"
                    opacity={0.6}
                  />
                </Group>
              ) : (
                <Group>
                  <Line 
                    points={[-10, -10, 10, 10]} 
                    stroke="#ef4444" 
                    strokeWidth={3} 
                    lineCap="round"
                  />
                  <Line 
                    points={[10, -10, -10, 10]} 
                    stroke="#ef4444" 
                    strokeWidth={3} 
                    lineCap="round"
                  />
                  <Path 
                    data={topPathData}
                    stroke="#ef4444"
                    strokeWidth={2}
                    opacity={0.4}
                  />
                </Group>
              )}
            </Group>
          )}

          {/* Rim Highlight */}
          <Path 
            data={topPathData}
            stroke="rgba(255,255,255,0.25)"
            strokeWidth={1.2}
            listening={false}
            perfectDrawEnabled={false}
            scaleX={0.94}
            scaleY={0.94}
          />

          {/* Path Highlight Overlay */}
          {highlight === 'REACHABLE' && (
            <Path 
              data={topPathData}
              fill="rgba(34, 197, 94, 0.4)" 
              stroke="#22c55e"
              strokeWidth={3}
              listening={false}
              perfectDrawEnabled={false}
              shadowBlur={10}
              shadowColor="#22c55e"
            />
          )}
          {highlight === 'UNREACHABLE' && (
            <Path 
              data={topPathData}
              fill="rgba(239, 68, 68, 0.3)" 
              stroke="#ef4444"
              strokeWidth={2}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}

          {/* Tint Overlay - Only for level 0 to give biomes a bit more character if needed, or remove if textures are enough */}
          {level === 0 && hex.terrainType === 'WATER' && (
            <Path 
              data={topPathData}
              fill="rgba(56, 189, 248, 0.1)" 
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
          
          {/* Terrain Details */}
          {terrainDetails}

          {/* Rift Portal */}
          {hex.riftId && (
            <Group ref={riftRef}>
              {/* Arcane corruption on the ground */}
              <Circle radius={18} fill={isLocked ? "#334155" : "#7e22ce"} opacity={0.2} />
              <Circle radius={14} fill={isLocked ? "#475569" : "#9333ea"} opacity={0.3} />
              
              {/* Floating rocks around the rift */}
              {[0, 1, 2, 3].map(i => {
                const angle = (i * Math.PI / 2) + (isLocked ? 0 : Math.PI / 4);
                const dist = 14;
                const rx = Math.cos(angle) * dist;
                const ry = Math.sin(angle) * dist;
                return (
                  <Group key={`rock-${i}`} x={rx} y={ry} rotation={i * 45}>
                    <Path data="M -2 -2 L 2 -3 L 3 2 L -1 3 Z" fill="#475569" stroke="#334155" strokeWidth={0.5} />
                    <Circle radius={1} fill={isLocked ? "#64748b" : "#d8b4fe"} shadowBlur={3} shadowColor={isLocked ? "transparent" : "#c084fc"} />
                  </Group>
                );
              })}

              <Circle radius={12} fill={isLocked ? "#475569" : "#a855f7"} opacity={0.4} shadowBlur={15} shadowColor={isLocked ? "#64748b" : "#c084fc"} />
              <RegularPolygon sides={6} radius={8} stroke={isLocked ? "#94a3b8" : "#e879f9"} strokeWidth={2} />
              {isLocked ? (
                <Rect x={-3} y={-4} width={6} height={8} fill="#94a3b8" cornerRadius={1} />
              ) : (
                <Circle radius={4} fill="#fdf4ff" shadowBlur={5} shadowColor="#ffffff" />
              )}
            </Group>
          )}

          {/* POI Marker Sprite */}
          {hex.poiId && (hex.isPoiCenter || hex.terrainType !== 'CITY') && (
            <Group ref={poiRef}>
              {/* Base shadow for POI */}
              <Circle radius={6} fill="rgba(0,0,0,0.3)" scaleY={0.5} y={15} />
              
              {/* Stylized POI Marker / Building Icon */}
              {hex.terrainType === 'BUILDING' || hex.poiId === 'city_checkpoint' ? (
                <Group scale={{ x: 0.8, y: 0.8 }} y={-10}>
                  {hex.poiId === 'city_capitol' && (
                    <Group>
                      {/* Base steps */}
                      <Rect x={-16} y={6} width={32} height={2} fill="#78350f" />
                      <Rect x={-14} y={4} width={28} height={2} fill="#92400e" />
                      <Rect x={-12} y={2} width={24} height={2} fill="#b45309" />
                      {/* Columns with shadow */}
                      {[-10, -4, 2, 8].map(x => (
                        <Group key={x} x={x} y={-6}>
                          <Rect width={4} height={8} fill="#fde68a" />
                          <Rect x={3} width={1} height={8} fill="#d97706" />{/* shadow */}
                        </Group>
                      ))}
                      {/* Roof Base */}
                      <Rect x={-14} y={-8} width={28} height={2} fill="#b45309" />
                      <Path data="M -12 -8 L 12 -8 L 8 -12 L -8 -12 Z" fill="#92400e" />
                      {/* Dome */}
                      <Path data="M -8 -12 C -8 -22, 8 -22, 8 -12 Z" fill="#fbbf24" stroke="#d97706" strokeWidth={1} />
                      {/* Dome highlight */}
                      <Path data="M -4 -12 C -4 -18, 0 -18, 0 -12 Z" fill="#fef3c7" opacity={0.5} />
                      {/* Spire */}
                      <Rect x={-0.5} y={-26} width={1} height={6} fill="#f59e0b" />
                      <Circle x={0} y={-26} radius={1.5} fill="#fcd34d" />
                      {isHovered && <Text text={TEXT[language].POI.CAPITOL} x={-40} y={-40} width={80} align="center" fontSize={11} fontStyle="bold" fill="#ffffff" shadowColor="black" shadowBlur={4} shadowOffsetX={1} shadowOffsetY={1} />}
                    </Group>
                  )}
                  {hex.poiId === 'city_bar' && (
                    <Group>
                      {/* Main body */}
                      <Rect x={-12} y={-4} width={24} height={12} fill="#7f1d1d" />
                      {/* Wood planks texture */}
                      <Line points={[-12, 0, 12, 0]} stroke="#450a0a" strokeWidth={0.5} />
                      <Line points={[-12, 4, 12, 4]} stroke="#450a0a" strokeWidth={0.5} />
                      {/* Roof */}
                      <Path data="M -14 -4 L 0 -12 L 14 -4 Z" fill="#b91c1c" stroke="#7f1d1d" strokeWidth={1} />
                      <Path data="M -14 -4 L 0 -12 L 0 -4 Z" fill="#ef4444" opacity={0.2} />{/* highlight */}
                      {/* Door */}
                      <Path data="M -3 8 L -3 2 A 3 3 0 0 1 3 2 L 3 8 Z" fill="#450a0a" />
                      <Circle x={1} y={5} radius={0.5} fill="#fbbf24" />{/* knob */}
                      {/* Windows */}
                      <Rect x={-9} y={0} width={4} height={4} fill="#fef08a" stroke="#450a0a" strokeWidth={1} />
                      <Line points={[-7, 0, -7, 4]} stroke="#450a0a" strokeWidth={0.5} />
                      <Line points={[-9, 2, -5, 2]} stroke="#450a0a" strokeWidth={0.5} />
                      <Rect x={5} y={0} width={4} height={4} fill="#fef08a" stroke="#450a0a" strokeWidth={1} />
                      <Line points={[7, 0, 7, 4]} stroke="#450a0a" strokeWidth={0.5} />
                      <Line points={[5, 2, 9, 2]} stroke="#450a0a" strokeWidth={0.5} />
                      {/* Signboard */}
                      <Rect x={8} y={-8} width={6} height={8} fill="#d97706" stroke="#78350f" strokeWidth={1} />
                      <Circle x={11} y={-4} radius={1.5} fill="#fef3c7" />{/* mug icon */}
                      {/* Chimney */}
                      <Rect x={-8} y={-16} width={3} height={8} fill="#7f1d1d" />
                      <Circle x={-6.5} y={-18} radius={2} fill="#a8a29e" opacity={0.6} />
                      <Circle x={-5} y={-21} radius={3} fill="#a8a29e" opacity={0.4} />
                      {isHovered && <Text text={TEXT[language].POI.BAR} x={-40} y={-35} width={80} align="center" fontSize={11} fontStyle="bold" fill="#ffffff" shadowColor="black" shadowBlur={4} shadowOffsetX={1} shadowOffsetY={1} />}
                    </Group>
                  )}
                  {hex.poiId === 'city_bank' && (
                    <Group>
                      {/* Base steps */}
                      <Rect x={-14} y={6} width={28} height={2} fill="#064e3b" />
                      <Rect x={-12} y={4} width={24} height={2} fill="#065f46" />
                      {/* Body */}
                      <Rect x={-10} y={-6} width={20} height={10} fill="#10b981" />
                      {/* Pillars */}
                      <Rect x={-10} y={-6} width={3} height={10} fill="#6ee7b7" />
                      <Rect x={-4} y={-6} width={3} height={10} fill="#6ee7b7" />
                      <Rect x={1} y={-6} width={3} height={10} fill="#6ee7b7" />
                      <Rect x={7} y={-6} width={3} height={10} fill="#6ee7b7" />
                      {/* Vault Door (visible in the middle) */}
                      <Circle x={0} y={-1} radius={3} fill="#047857" stroke="#064e3b" strokeWidth={0.5} />
                      <Circle x={0} y={-1} radius={1.5} fill="#34d399" />
                      {/* Roof Base */}
                      <Rect x={-12} y={-8} width={24} height={2} fill="#065f46" />
                      {/* Roof */}
                      <Path data="M -12 -8 L 0 -14 L 12 -8 Z" fill="#34d399" stroke="#064e3b" strokeWidth={1} />
                      {/* Coin Sign */}
                      <Circle x={0} y={-14} radius={2.5} fill="#fbbf24" stroke="#d97706" strokeWidth={0.5} />
                      <Text text="$" x={-1.5} y={-16.5} fontSize={5} fill="#78350f" fontStyle="bold" />
                      {isHovered && <Text text={TEXT[language].POI.BANK} x={-40} y={-30} width={80} align="center" fontSize={11} fontStyle="bold" fill="#ffffff" shadowColor="black" shadowBlur={4} shadowOffsetX={1} shadowOffsetY={1} />}
                    </Group>
                  )}
                  {hex.poiId === 'city_shop' && (
                    <Group>
                      {/* Body */}
                      <Rect x={-12} y={-2} width={24} height={10} fill="#2563eb" />
                      {/* Roof */}
                      <Path data="M -14 -2 L -10 -10 L 10 -10 L 14 -2 Z" fill="#60a5fa" stroke="#1e3a8a" strokeWidth={1} />
                      {/* Awning (Stripes) */}
                      <Path data="M -14 -2 L 14 -2 L 12 2 L -12 2 Z" fill="#bfdbfe" />
                      <Path data="M -10 -2 L -8 2 M -4 -2 L -2 2 M 2 -2 L 4 2 M 8 -2 L 10 2" stroke="#1e3a8a" strokeWidth={2} />
                      {/* Door */}
                      <Rect x={-3} y={4} width={6} height={4} fill="#1e3a8a" />
                      {/* Windows */}
                      <Rect x={-10} y={3} width={5} height={4} fill="#dbeafe" stroke="#1e3a8a" strokeWidth={0.5} />
                      <Rect x={5} y={3} width={5} height={4} fill="#dbeafe" stroke="#1e3a8a" strokeWidth={0.5} />
                      {/* Sign */}
                      <Rect x={-6} y={-8} width={12} height={4} fill="#fef08a" stroke="#ca8a04" strokeWidth={0.5} />
                      <Text text="SHOP" x={-5} y={-7} fontSize={3} fill="#854d0e" fontStyle="bold" />
                      {isHovered && <Text text={TEXT[language].POI.SHOP} x={-40} y={-25} width={80} align="center" fontSize={11} fontStyle="bold" fill="#ffffff" shadowColor="black" shadowBlur={4} shadowOffsetX={1} shadowOffsetY={1} />}
                    </Group>
                  )}
                  {hex.poiId === 'city_workshop' && (
                    <Group>
                      {/* Main Body */}
                      <Rect x={-12} y={-2} width={16} height={10} fill="#6d28d9" />
                      {/* Side Shed */}
                      <Rect x={4} y={2} width={8} height={6} fill="#8b5cf6" />
                      {/* Roofs */}
                      <Path data="M -14 -2 L -4 -10 L 6 -2 Z" fill="#a78bfa" stroke="#4c1d95" strokeWidth={1} />
                      <Path data="M 4 2 L 8 -2 L 14 2 Z" fill="#c4b5fd" stroke="#4c1d95" strokeWidth={1} />
                      {/* Chimney */}
                      <Rect x={-8} y={-14} width={3} height={8} fill="#4c1d95" />
                      {/* Smoke */}
                      <Circle x={-6.5} y={-16} radius={1.5} fill="#ede9fe" opacity={0.8} />
                      <Circle x={-5} y={-19} radius={2.5} fill="#ede9fe" opacity={0.6} />
                      <Circle x={-3} y={-23} radius={3.5} fill="#ede9fe" opacity={0.4} />
                      {/* Door */}
                      <Rect x={-4} y={4} width={5} height={4} fill="#4c1d95" />
                      {/* Gear/Window */}
                      <Circle x={-4} y={0} radius={2.5} fill="#fcd34d" stroke="#b45309" strokeWidth={0.5} />
                      <Path data="M -4 -3 L -4 3 M -7 0 L -1 0 M -6 -2 L -2 2 M -6 2 L -2 -2" stroke="#b45309" strokeWidth={0.5} />
                      {isHovered && <Text text={TEXT[language].POI.WORKSHOP} x={-40} y={-35} width={80} align="center" fontSize={11} fontStyle="bold" fill="#ffffff" shadowColor="black" shadowBlur={4} shadowOffsetX={1} shadowOffsetY={1} />}
                    </Group>
                  )}
                  {hex.poiId === 'city_hub' && (
                    <Group>
                      {/* Base */}
                      <Path data="M -14 8 L 14 8 L 10 2 L -10 2 Z" fill="#4338ca" />
                      {/* Dome */}
                      <Path data="M -10 2 C -10 -12, 10 -12, 10 2 Z" fill="#818cf8" stroke="#312e81" strokeWidth={1} />
                      <Path data="M -6 2 C -6 -8, 6 -8, 6 2 Z" fill="#a5b4fc" opacity={0.5} />
                      {/* Core */}
                      <Circle x={0} y={-2} radius={3} fill="#e0e7ff" shadowColor="#e0e7ff" shadowBlur={4} />
                      {/* Antenna */}
                      <Path data="M 0 -10 L 0 -20" stroke="#312e81" strokeWidth={1.5} />
                      <Path data="M -3 -16 L 3 -16 M -2 -18 L 2 -18" stroke="#312e81" strokeWidth={1} />
                      {/* Beacon */}
                      <Circle x={0} y={-21} radius={1.5} fill="#ef4444" shadowColor="#ef4444" shadowBlur={4} />
                      {/* Side nodes */}
                      <Circle x={-8} y={2} radius={1.5} fill="#34d399" />
                      <Circle x={8} y={2} radius={1.5} fill="#34d399" />{isHovered && <Text text={TEXT[language].POI.HUB} x={-40} y={-35} width={80} align="center" fontSize={11} fontStyle="bold" fill="#ffffff" shadowColor="black" shadowBlur={4} shadowOffsetX={1} shadowOffsetY={1} />}
                    </Group>
                  )}
                  {hex.poiId === 'city_checkpoint' && (
                    <Group>
                      {/* Road Base */}
                      <Rect x={-16} y={6} width={32} height={4} fill="#27272a" />
                      <Line points={[-12, 8, -6, 8]} stroke="#fde047" strokeWidth={0.5} />
                      <Line points={[6, 8, 12, 8]} stroke="#fde047" strokeWidth={0.5} />
                      {/* Booth */}
                      <Rect x={-12} y={-6} width={8} height={12} fill="#71717a" stroke="#27272a" strokeWidth={1} />
                      {/* Booth Window */}
                      <Rect x={-10} y={-3} width={4} height={4} fill="#bae6fd" />
                      {/* Booth Roof */}
                      <Path data="M -14 -6 L -4 -6 L -6 -10 L -12 -10 Z" fill="#52525b" stroke="#27272a" strokeWidth={1} />
                      {/* Barrier Gate */}
                      <Rect x={-4} y={0} width={16} height={2} fill="#ef4444" />
                      <Line points={[-2, 0, 0, 2]} stroke="#ffffff" strokeWidth={1} />
                      <Line points={[2, 0, 4, 2]} stroke="#ffffff" strokeWidth={1} />
                      <Line points={[6, 0, 8, 2]} stroke="#ffffff" strokeWidth={1} />
                      <Line points={[10, 0, 12, 2]} stroke="#ffffff" strokeWidth={1} />
                      {/* Stop Sign */}
                      <Circle x={-1} y={-4} radius={2.5} fill="#ef4444" stroke="#7f1d1d" strokeWidth={0.5} />
                      <Text text="!" x={-2} y={-6.5} fontSize={5} fill="#ffffff" fontStyle="bold" />{isHovered && <Text text={TEXT[language].POI.CHECKPOINT} x={-40} y={-25} width={80} align="center" fontSize={11} fontStyle="bold" fill="#ffffff" shadowColor="black" shadowBlur={4} shadowOffsetX={1} shadowOffsetY={1} />}
                    </Group>
                  )}
                </Group>
              ) : hex.isPoiCenter ? (
                <Group scale={{ x: 0.8, y: 0.8 }}>
                  <Path 
                    data="M 0 0 L -10 -20 L 0 -30 L 10 -20 Z" 
                    fill="#3b82f6" 
                    stroke="#1e3a8a" 
                    strokeWidth={2} 
                    shadowBlur={10}
                    shadowColor="#3b82f6"
                  />
                  <Circle y={-20} radius={4} fill="#1e3a8a" />
                  <Path 
                    data="M -5 -15 L 5 -15" 
                    stroke="#1e3a8a" 
                    strokeWidth={1.5} 
                  />
                  {/* Inner glow */}
                  <Path 
                    data="M 0 -5 L -4 -15 L 0 -22 L 4 -15 Z" 
                    fill="#93c5fd" 
                    opacity={0.6}
                  />
                </Group>
              ) : (
                <Group scale={{ x: 0.8, y: 0.8 }}>
                  <Path 
                    data="M 0 0 L -10 -20 L 0 -30 L 10 -20 Z" 
                    fill="#facc15" 
                    stroke="#854d0e" 
                    strokeWidth={2} 
                    shadowBlur={10}
                    shadowColor="#facc15"
                  />
                  <Circle y={-20} radius={4} fill="#854d0e" />
                  <Path 
                    data="M -5 -15 L 5 -15" 
                    stroke="#854d0e" 
                    strokeWidth={1.5} 
                  />
                  {/* Inner glow */}
                  <Path 
                    data="M 0 -5 L -4 -15 L 0 -22 L 4 -15 Z" 
                    fill="#fef08a" 
                    opacity={0.6}
                  />
                </Group>
              )}<Circle y={-35} radius={2} fill="#ffffff" shadowBlur={8} shadowColor={hex.isPoiCenter ? "#3b82f6" : "#facc15"} />
            </Group>
          )}
        </Group>
      </Group>
    </Group>
  );
};


// Custom comparison function
function arePropsEqual(prev: any, next: any) {
    if (prev.hex.id !== next.hex.id) return false;
    if (prev.hex.height !== next.hex.height) return false;
    if (prev.x !== next.x || prev.y !== next.y) return false;
    if (prev.isLocked !== next.isLocked) return false;
    if (prev.highlight !== next.highlight) return false;
    
    for (let i = 0; i < 6; i++) {
        if (prev.neighborLevels[i] !== next.neighborLevels[i]) return false;
    }
    return true;
}

export default React.memo(OverworldHexNode, arePropsEqual);
