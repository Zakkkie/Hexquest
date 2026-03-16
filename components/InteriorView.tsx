
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Stage, Layer, Group, Rect, Text, Circle, Image as KonvaImage } from 'react-konva';
import { useGameStore } from '../store.ts';
import { hexToPixel } from '../services/hexUtils.ts';
import { GAME_CONFIG } from '../rules/config.ts';
import { ArrowLeft, MessageSquare, LogOut } from 'lucide-react';
import { TEXT } from '../services/i18n.ts';
import { unitRenderer } from '../services/unitRenderer.ts';
import { EntityType } from '../types.ts';

const InteriorView: React.FC = () => {
  const overworld = useGameStore(state => state.overworld);
  const activeInteriorId = overworld.activeInteriorId;
  const interior = activeInteriorId ? overworld.interiors[activeInteriorId] : null;
  const exitBuilding = useGameStore(state => state.exitBuilding);
  const moveInInterior = useGameStore(state => state.moveInInterior);
  const talkToNPC = useGameStore(state => state.talkToNPC);
  const language = useGameStore(state => state.language);
  const playUiSound = useGameStore(state => state.playUiSound);
  const user = useGameStore(state => state.user);

  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [scale, setScale] = useState(2);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [visualPlayerPos, setVisualPlayerPos] = useState({ q: overworld.player.q, r: overworld.player.r });
  const playerNodeRef = useRef<Konva.Group>(null);
  const playerWalkRef = useRef<Konva.Animation | null>(null);

  // Center view on player
  useEffect(() => {
    if (interior && overworld.player) {
      const { x, y } = hexToPixel(overworld.player.q, overworld.player.r, 0);
      setOffset({
        x: windowSize.width / 2 - x * scale,
        y: windowSize.height / 2 - y * scale
      });
    }
  }, [interior?.id, windowSize.width, windowSize.height, scale, overworld.player.q, overworld.player.r]);

  // Jump Animation
  useEffect(() => {
    if (playerNodeRef.current) {
      if (overworld.player.q !== visualPlayerPos.q || overworld.player.r !== visualPlayerPos.r) {
        // Stop previous animation
        if (playerWalkRef.current) {
          playerWalkRef.current.stop();
          playerWalkRef.current = null;
        }

        const startPixel = hexToPixel(visualPlayerPos.q, visualPlayerPos.r, 0);
        const endPixel = hexToPixel(overworld.player.q, overworld.player.r, 0);

        const duration = 300; // ms
        const startTime = Date.now();
        const jumpHeight = 10;

        const layer = playerNodeRef.current.getLayer();
        if (layer) {
          playerWalkRef.current = new Konva.Animation((frame) => {
            if (!frame || !playerNodeRef.current) return;
            
            const elapsed = Date.now() - startTime;
            const progress = Math.min(1, elapsed / duration);
            
            const curX = startPixel.x + (endPixel.x - startPixel.x) * progress;
            const curY = startPixel.y + (endPixel.y - startPixel.y) * progress;
            
            const jump = Math.sin(progress * Math.PI) * jumpHeight;

            playerNodeRef.current.x(curX);
            playerNodeRef.current.y(curY - jump);

            if (progress >= 1) {
              if (playerWalkRef.current) playerWalkRef.current.stop();
              playerWalkRef.current = null;
              setVisualPlayerPos({ q: overworld.player.q, r: overworld.player.r });
            }
          }, layer);
          playerWalkRef.current.start();
        }
      }
    } else {
      setVisualPlayerPos({ q: overworld.player.q, r: overworld.player.r });
    }
  }, [overworld.player.q, overworld.player.r]);

  const finalColor = user?.avatarColor || '#3b82f6';
  const finalHead = user?.headIndex ?? 0;
  const finalBody = user?.bodyIndex ?? 0;

  const playerSprite = useMemo(() => {
    return unitRenderer.getUnitImage(finalHead, finalBody, finalColor, EntityType.PLAYER);
  }, [finalHead, finalBody, finalColor]);

  if (!interior) return null;

  const handleHexClick = (q: number, r: number) => {
    moveInInterior(q, r);
  };

  const getTerrainColor = (type: string) => {
    switch (type) {
      case 'FLOOR': return '#1e293b';
      case 'WALL': return '#475569';
      case 'DOOR': return '#92400e';
      case 'FURNITURE': return '#334155';
      default: return '#0f172a';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950 flex flex-col z-50">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center z-10 bg-slate-900/80 backdrop-blur border-b border-slate-700">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => { exitBuilding(); playUiSound('CLICK'); }}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-xl font-bold text-white uppercase tracking-tight">{interior.name}</h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-3 py-1 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold uppercase">
            Interior Level
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <Stage
          width={windowSize.width}
          height={windowSize.height}
          x={offset.x}
          y={offset.y}
          scaleX={scale}
          scaleY={scale}
        >
          <Layer>
            {/* Grid */}
            {Object.values(interior.grid).map(hex => {
              const { x, y } = hexToPixel(hex.q, hex.r, 0);
              
              return (
                <Group key={`${hex.q},${hex.r}`} x={x} y={y} onClick={() => handleHexClick(hex.q, hex.r)}>
                  {/* Hex Shape (Simplified as Rect for interior) */}
                  <Rect
                    width={GAME_CONFIG.HEX_SIZE * 1.5}
                    height={GAME_CONFIG.HEX_SIZE * 1.5}
                    offsetX={GAME_CONFIG.HEX_SIZE * 0.75}
                    offsetY={GAME_CONFIG.HEX_SIZE * 0.75}
                    fill={getTerrainColor(hex.terrainType)}
                    stroke={hex.terrainType === 'WALL' ? '#64748b' : '#334155'}
                    strokeWidth={1}
                    cornerRadius={4}
                  />
                  
                  {/* Furniture/Obstacle Detail */}
                  {hex.terrainType === 'FURNITURE' && (
                    <Group>
                      <Rect
                        width={GAME_CONFIG.HEX_SIZE}
                        height={GAME_CONFIG.HEX_SIZE}
                        offsetX={GAME_CONFIG.HEX_SIZE / 2}
                        offsetY={GAME_CONFIG.HEX_SIZE / 2}
                        fill={
                          hex.furnitureType === 'BED' ? '#475569' :
                          hex.furnitureType === 'TABLE' ? '#78350f' :
                          hex.furnitureType === 'CHAIR' ? '#92400e' :
                          hex.furnitureType === 'SHELF' ? '#451a03' :
                          '#334155'
                        }
                        stroke="#1e293b"
                        strokeWidth={1}
                        cornerRadius={2}
                      />
                      {/* Visual hint for furniture type */}
                      <Text
                        text={
                          hex.furnitureType === 'BED' ? 'B' :
                          hex.furnitureType === 'TABLE' ? 'T' :
                          hex.furnitureType === 'CHAIR' ? 'C' :
                          hex.furnitureType === 'SHELF' ? 'S' :
                          hex.furnitureType === 'CRATE' ? 'X' :
                          ''
                        }
                        fontSize={10}
                        fill="rgba(255,255,255,0.3)"
                        offsetX={4}
                        offsetY={5}
                      />
                    </Group>
                  )}

                  {/* Door Detail */}
                  {hex.terrainType === 'DOOR' && (
                    <Group>
                      <Rect
                        width={GAME_CONFIG.HEX_SIZE * 0.8}
                        height={GAME_CONFIG.HEX_SIZE * 0.3}
                        offsetX={GAME_CONFIG.HEX_SIZE * 0.4}
                        offsetY={GAME_CONFIG.HEX_SIZE * 0.15}
                        fill="#f59e0b"
                        stroke="#78350f"
                        strokeWidth={2}
                        cornerRadius={2}
                      />
                      {hex.isExit && Math.abs(overworld.player.q - hex.q) <= 1 && Math.abs(overworld.player.r - hex.r) <= 1 && (
                        <Group y={-20}>
                          <Rect width={30} height={12} offsetX={15} fill="rgba(245, 158, 11, 0.8)" cornerRadius={2} />
                          <Text text="EXIT" fontSize={7} fill="white" fontStyle="bold" offsetX={8} offsetY={-3} />
                        </Group>
                      )}
                    </Group>
                  )}
                </Group>
              );
            })}

            {/* NPCs */}
            {interior.npcs.map(npc => {
              const { x, y } = hexToPixel(npc.q, npc.r, 0);
              const isAdjacent = Math.abs(overworld.player.q - npc.q) <= 1 && Math.abs(overworld.player.r - npc.r) <= 1;
              
              // Generate NPC sprite
              const npcColor = '#10b981'; // Emerald for NPCs
              const npcSprite = unitRenderer.getUnitImage(1, 1, npcColor, EntityType.BOT);

              return (
                <Group key={npc.id} x={x} y={y} onClick={() => talkToNPC(npc.id)}>
                  <Circle
                    radius={12}
                    fill="rgba(16, 185, 129, 0.2)"
                    stroke="#10b981"
                    strokeWidth={1}
                  />
                  {npcSprite && (
                    <Group x={-16} y={-24}>
                      <KonvaImage image={npcSprite} width={32} height={32} />
                    </Group>
                  )}
                  {isAdjacent && (
                    <Group y={-35}>
                      <Rect
                        width={40}
                        height={16}
                        offsetX={20}
                        fill="rgba(16, 185, 129, 0.9)"
                        cornerRadius={4}
                        shadowBlur={5}
                        shadowColor="#10b981"
                      />
                      <Text
                        text="TALK"
                        fontSize={8}
                        fill="white"
                        offsetX={10}
                        offsetY={-4}
                        fontStyle="bold"
                      />
                    </Group>
                  )}
                </Group>
              );
            })}

            {/* Player */}
            {(() => {
              const { x, y } = hexToPixel(visualPlayerPos.q, visualPlayerPos.r, 0);
              return (
                <Group x={x} y={y} ref={playerNodeRef}>
                  <Circle
                    radius={14}
                    fill="rgba(59, 130, 246, 0.2)"
                    stroke="#3b82f6"
                    strokeWidth={1}
                  />
                  {playerSprite && (
                    <Group x={-16} y={-24}>
                       <KonvaImage 
                         image={playerSprite} 
                         width={32} 
                         height={32} 
                       />
                    </Group>
                  )}
                </Group>
              );
            })()}
          </Layer>
        </Stage>
      </div>

      {/* Footer / Controls */}
      <div className="absolute bottom-0 inset-x-0 p-6 flex justify-center pointer-events-none">
        <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700 p-4 rounded-2xl shadow-2xl pointer-events-auto flex gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Navigation</span>
            <span className="text-sm text-slate-300">Click on tiles to move</span>
          </div>
          <div className="w-px h-8 bg-slate-800" />
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Interaction</span>
            <span className="text-sm text-slate-300">Click on NPCs to talk</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteriorView;
