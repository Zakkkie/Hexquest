import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Group, Circle, Line } from 'react-konva';
import Konva from 'konva';
import { useGameStore } from '../store.ts';
import { X, Shield, Zap, Coins, Info } from 'lucide-react';
import { TEXT } from '../services/i18n.ts';

const InteriorView: React.FC = () => {
  const overworld = useGameStore(state => state.overworld);
  const setUIState = useGameStore(state => state.setUIState);
  const language = useGameStore(state => state.language);
  const player = overworld.player;
  
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

  // Example usage of Konva namespace (fixing error TS2503)
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Example usage of Konva name (fixing error TS2304)
    if (layerRef.current) {
      // We could add dynamic elements here if needed
      const bg = new Konva.Rect({
        x: 0,
        y: 0,
        width: windowSize.width,
        height: windowSize.height,
        fill: '#020617',
        listening: false
      });
      // layerRef.current.add(bg);
    }
  }, [windowSize]);

  const currentHex = overworld.grid[`${player.q},${player.r}`];
  const poiName = currentHex?.poiId || currentHex?.terrainType || 'Unknown Location';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="p-4 md:p-6 flex justify-between items-center bg-slate-900/80 backdrop-blur-md border-b border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <Shield className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter">
              {poiName.replace(/_/g, ' ')}
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest opacity-60">
              {language === 'RU' ? 'ВНУТРЕННИЙ ВИД' : 'INTERIOR VIEW'}
            </p>
          </div>
        </div>
        
        <button 
          onClick={() => {
            useGameStore.getState().playUiSound('CLICK');
            setUIState('OVERWORLD');
          }}
          className="p-3 bg-slate-800 hover:bg-red-900/40 border border-slate-700 hover:border-red-500/50 rounded-xl text-slate-400 hover:text-white transition-all group"
        >
          <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>
      
      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <Stage 
          width={windowSize.width} 
          height={windowSize.height - 100}
          ref={stageRef}
        >
          <Layer ref={layerRef}>
            {/* Background Atmosphere */}
            <Rect 
              x={0}
              y={0}
              width={windowSize.width}
              height={windowSize.height}
              fillLinearGradientStartPoint={{ x: 0, y: 0 }}
              fillLinearGradientEndPoint={{ x: 0, y: windowSize.height }}
              fillLinearGradientColorStops={[0, '#0f172a', 1, '#020617']}
            />
            
            {/* Central Decorative Elements */}
            <Group x={windowSize.width / 2} y={(windowSize.height - 100) / 2}>
              <Circle 
                radius={200}
                fillRadialGradientStartPoint={{ x: 0, y: 0 }}
                fillRadialGradientStartRadius={0}
                fillRadialGradientEndPoint={{ x: 0, y: 0 }}
                fillRadialGradientEndRadius={200}
                fillRadialGradientColorStops={[0, 'rgba(99, 102, 241, 0.05)', 1, 'transparent']}
              />
              
              <Rect 
                x={-250}
                y={-150}
                width={500}
                height={300}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth={1}
                cornerRadius={12}
                shadowBlur={20}
                shadowColor="rgba(0,0,0,0.5)"
              />
              
              <Text 
                text={poiName.toUpperCase()}
                x={-250}
                y={-100}
                width={500}
                align="center"
                fontSize={32}
                fill="white"
                fontStyle="900"
                letterSpacing={2}
              />
              
              <Line 
                points={[-100, -40, 100, -40]}
                stroke="#475569"
                strokeWidth={2}
              />
              
              <Text 
                text={language === 'RU' ? 'Исследование локации...' : 'Exploring location...'}
                x={-250}
                y={0}
                width={500}
                align="center"
                fontSize={16}
                fill="#94a3b8"
                fontStyle="italic"
              />
            </Group>
          </Layer>
        </Stage>

        {/* HUD Overlay */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-4">
          <div className="px-6 py-3 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl flex items-center gap-3 shadow-2xl">
            <Zap className="w-5 h-5 text-blue-400" />
            <span className="text-xl font-black text-white">{player.energy}</span>
          </div>
          <div className="px-6 py-3 bg-slate-900/90 backdrop-blur border border-slate-700 rounded-2xl flex items-center gap-3 shadow-2xl">
            <Coins className="w-5 h-5 text-amber-400" />
            <span className="text-xl font-black text-white">{player.credits}</span>
          </div>
        </div>
      </div>
      
      {/* Footer / Info */}
      <div className="p-4 bg-slate-900/50 border-t border-slate-800 text-center">
        <div className="flex items-center justify-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-widest">
          <Info className="w-4 h-4" />
          <span>{language === 'RU' ? 'Нажмите ESC для выхода' : 'Press ESC to exit'}</span>
        </div>
      </div>
    </div>
  );
};

export default InteriorView;
