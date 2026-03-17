import React, { useRef, useEffect, useMemo } from 'react';
import { Group, Line, Circle, Path, RegularPolygon, Rect } from 'react-konva';
import Konva from 'konva';
import { GAME_CONFIG } from '../rules/config.ts';
import { OverworldHex, TerrainType } from '../types.ts';
import { textureService } from '../services/textureService.ts';
import { getHexHeight } from '../services/OverworldGenerator.ts';
import { getTheme } from './MapRenderer.tsx';

interface OverworldHexNodeProps {
  hex: OverworldHex;
  x: number;
  y: number;
  isLocked?: boolean;
  isPassable?: boolean;
  neighborLevels: number[];
  onClick: (q: number, r: number) => void;
  highlight?: 'REACHABLE' | 'UNREACHABLE' | 'NONE';
}

export const TERRAIN_LEVELS: Record<string, number> = {}; // Keep for compatibility if needed elsewhere, but it's empty

const seededRandom = (q: number, r: number, seed: number) => {
  const x = Math.sin(q * 12.9898 + r * 78.233 + seed) * 43758.5453;
  return x - Math.floor(x);
};

const OverworldHexNode: React.FC<OverworldHexNodeProps> = ({ hex, x, y, isLocked, isPassable = true, neighborLevels, onClick, highlight = 'NONE' }) => {
  const groupRef = useRef<Konva.Group>(null);
  const baseRef = useRef<Konva.Group>(null);
  const animRef = useRef<Konva.Animation | null>(null);
  const waterLayerRef = useRef<Konva.Group>(null);
  const riftRef = useRef<Konva.Group>(null);
  const poiRef = useRef<Konva.Group>(null);

  const [isHovered, setIsHovered] = React.useState(false);

  const size = GAME_CONFIG.HEX_SIZE;
  
  const getHeightOffset = (lvl: number) => {
    if (lvl >= 0) return -(2 + lvl * 2);
    return (Math.abs(lvl) - 1) * 2;
  };

  const level = hex.height ?? getHexHeight(hex.terrainType);
  const offsetY = getHeightOffset(level);
  const MAX_WALL_DEPTH = 8;
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      pts.push({ x: size * Math.cos(angle), y: size * Math.sin(angle) });
    }
    return pts;
  }, [size]);

  const pointsArray = useMemo(() => {
    return points.flatMap(p => [p.x, p.y]);
  }, [points]);

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
        pixelRatio: 2
      });
    }

    // Cache the animated parts so we only animate bitmaps, not vectors
    if (waterLayerRef.current) {
      waterLayerRef.current.cache({
        x: -15, y: -5, width: 30, height: 20, pixelRatio: 2
      });
    }
    if (riftRef.current) {
      riftRef.current.cache({
        x: -20, y: -20, width: 40, height: 40, pixelRatio: 2
      });
    }

    if (hex.isRevealed) {
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
    }

    return () => {
      if (animRef.current) {
        animRef.current.stop();
      }
    };
  }, [hex.terrainType, hex.isRevealed, hex.riftId, size, level, neighborLevels]);

  const topTexture = useMemo(() => textureService.getTexture(level, hex.q, hex.r, hex.terrainType), [level, hex.q, hex.r, hex.terrainType]);
  const sideTexture = useMemo(() => textureService.getSideTexture(level, hex.terrainType), [level, hex.terrainType]);
  const theme = useMemo(() => getTheme(level), [level]);

  const getBiomeColor = (type: TerrainType, lvl: number) => {
    const defaultHeight = getHexHeight(type);
    if (lvl !== defaultHeight) {
      const theme = getTheme(lvl);
      return theme.main;
    }
    switch(type) {
      case 'PLAINS':        return '#a3e635'; 
      case 'FOREST':        return '#4ade80'; 
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

  const getBiomeSideColor = (type: TerrainType, lvl: number) => {
    const defaultHeight = getHexHeight(type);
    if (lvl !== defaultHeight) {
      const theme = getTheme(lvl);
      return theme.dark;
    }
    switch(type) {
      case 'PLAINS':        return '#65a30d'; 
      case 'FOREST':        return '#16a34a'; 
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
    const sideColor = getBiomeSideColor(hex.terrainType, level);
    const indices = [0, 1, 2]; 
    const wallSegments = [];
    
    for (const i of indices) {
      const nLevel = neighborLevels[i];
      let nY = 0;
      if (nLevel === -99) nY = offsetY + MAX_WALL_DEPTH;
      else nY = getHeightOffset(nLevel);

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

  const getTerrainTint = (type: string, hasRift?: boolean) => {
    if (hasRift) {
      return 'rgba(147, 51, 234, 0.4)'; 
    }
    switch (type) {
      case 'WATER': return 'rgba(56, 189, 248, 0.3)'; 
      case 'FOREST': return 'rgba(74, 222, 128, 0.2)'; 
      case 'MOUNTAINS': return 'rgba(156, 163, 175, 0.3)'; 
      case 'SWAMP': return 'rgba(163, 230, 53, 0.2)'; 
      case 'ROAD': return 'rgba(250, 204, 21, 0.15)'; 
      case 'CITY': return 'rgba(248, 113, 113, 0.2)'; 
      case 'OUTPOST': return 'rgba(251, 146, 60, 0.2)'; 
      case 'RUINS': return 'rgba(192, 132, 252, 0.2)'; 
      case 'MERCHANT_CAMP': return 'rgba(250, 204, 21, 0.2)'; 
      default: return 'transparent';
    }
  };

  const terrainDetails = useMemo(() => {
    return [];
  }, [hex.terrainType, hex.isRevealed, hex.q, hex.r, size]);

  if (!hex.isRevealed) {
    return (
      <Group 
        x={x} 
        y={y} 
        ref={baseRef}
        onClick={() => onClick(hex.q, hex.r)}
        onTap={() => onClick(hex.q, hex.r)}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'pointer';
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = 'grab';
        }}
      >
        <Group scaleY={0.8}>
          {/* Base Shadow */}
          <Path 
            data={topPathData} 
            fill="#020617" 
            stroke="#0f172a" 
            strokeWidth={1} 
            perfectDrawEnabled={false}
          />
          
          {/* Cloud Cluster */}
          <Group opacity={0.6} scaleY={0.5}>
            <Circle x={-12} y={-8} radius={18} fillRadialGradientStartPoint={{x:0, y:0}} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{x:0, y:0}} fillRadialGradientEndRadius={18} fillRadialGradientColorStops={[0, '#1e293b', 1, 'transparent']} />
            <Circle x={12} y={-4} radius={20} fillRadialGradientStartPoint={{x:0, y:0}} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{x:0, y:0}} fillRadialGradientEndRadius={20} fillRadialGradientColorStops={[0, '#334155', 1, 'transparent']} />
            <Group y={10}>
              <Circle x={0} y={0} radius={22} fillRadialGradientStartPoint={{x:0, y:0}} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{x:0, y:0}} fillRadialGradientEndRadius={22} fillRadialGradientColorStops={[0, '#1e293b', 1, 'transparent']} />
            </Group>
            <Circle x={-8} y={6} radius={16} fillRadialGradientStartPoint={{x:0, y:0}} fillRadialGradientStartRadius={0} fillRadialGradientEndPoint={{x:0, y:0}} fillRadialGradientEndRadius={16} fillRadialGradientColorStops={[0, '#334155', 1, 'transparent']} />
          </Group>

          {/* Subtle Border */}
          <Path 
            data={topPathData} 
            stroke="rgba(255,255,255,0.05)" 
            strokeWidth={2} 
            perfectDrawEnabled={false}
          />

          {/* Path Highlight Overlay for Fog */}
          {highlight === 'UNREACHABLE' && (
            <Path 
              data={topPathData}
              fill="rgba(239, 68, 68, 0.15)" 
              stroke="rgba(239, 68, 68, 0.4)"
              strokeWidth={2}
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
        </Group>
      </Group>
    );
  }

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
        {walls}

        {/* Top Face Group */}
        <Group y={offsetY} scaleY={0.8}>
          {/* Base Hex */}
          <Path 
            data={topPathData}
            fillPatternImage={topTexture as any}
            fillPatternScale={{ x: size / 32, y: size / 32 }}
            fillPatternOffset={{ x: 32, y: 32 }}
            fillPatternRepeat="repeat"
            fill={topTexture ? undefined : getBiomeColor(hex.terrainType, level)}
            stroke={isHovered ? '#94a3b8' : theme.stroke} 
            strokeWidth={isHovered ? 2 : 2} 
            perfectDrawEnabled={true}
          />

          {/* Impassable Indicator */}
          {!isPassable && hex.isRevealed && (
            <Group opacity={0.6}>
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
          {hex.poiId && (
            <Group ref={poiRef}>
              {/* Base shadow for POI */}
              <Circle radius={6} fill="rgba(0,0,0,0.3)" scaleY={0.5} y={15} />
              
              {/* Stylized POI Marker */}
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
              
              {/* Sparkles */}
              <Circle y={-35} radius={2} fill="#ffffff" shadowBlur={8} shadowColor="#facc15" />
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
    if (prev.hex.isRevealed !== next.hex.isRevealed) return false;
    if (prev.x !== next.x || prev.y !== next.y) return false;
    if (prev.isLocked !== next.isLocked) return false;
    if (prev.highlight !== next.highlight) return false;
    
    for (let i = 0; i < 6; i++) {
        if (prev.neighborLevels[i] !== next.neighborLevels[i]) return false;
    }
    return true;
}

export default React.memo(OverworldHexNode, arePropsEqual);
