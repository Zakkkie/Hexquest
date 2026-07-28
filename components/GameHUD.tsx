
import React, { useState, useEffect, memo, useRef } from 'react';
import { useGameStore } from '../store';
import { audioService } from '../services/audioService';
import TopStatsBar from './hud/TopStatsBar';
import BottomActionDock from './hud/BottomActionDock';
import GameDialogs from './hud/GameDialogs';
import InventoryModal from './InventoryModal';
import SkirmishHintBanner from './hud/SkirmishHintBanner';
import CentralTutorialBanner from './hud/CentralTutorialBanner';
import { DefenseSiegeBanner } from './hud/DefenseSiegeBanner';
import { RadarWidget } from './hud/RadarWidget';
import { Item } from '../types';

interface GameHUDProps {
  onCenterPlayer: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ onCenterPlayer }) => {
  const session = useGameStore(state => state.session);
  const uiScale = useGameStore(state => state.uiScale);
  const gameStatus = session?.gameStatus;
  const player = session?.player;
  const toast = useGameStore(state => state.toast);
  const completedShapeCoords = session?.completedShapeCoords;
  
  // UI State orchestration
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [helpTopic, setHelpTopic] = useState<'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY' | null>(null);
  const [inspectedItem, setInspectedItem] = useState<Item | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [victoryStage, setVictoryStage] = useState<'HIDDEN' | 'SALUTE' | 'MODAL'>('HIDDEN');
  const [showSpBadge, setShowSpBadge] = useState(false);
  const hasTriggeredRef = useRef(false);

  // Trigger when a shape is completed successfully
  useEffect(() => {
    if (completedShapeCoords && completedShapeCoords.length > 0) {
      if (!hasTriggeredRef.current) {
        hasTriggeredRef.current = true;
        
        // Play epic audio progression
        audioService.play('TELEPORT');
        setTimeout(() => {
            audioService.play('LEVEL_UP');
        }, 300);

        // Award 1 SP
        const store = useGameStore.getState();
        store.setSkillPoints(store.skillPoints + 1);

        // Slide/fade overlay notification
        setShowSpBadge(true);
        const timer = setTimeout(() => {
            setShowSpBadge(false);
        }, 5000);
        
        return () => clearTimeout(timer);
      }
    } else {
      hasTriggeredRef.current = false;
    }
  }, [completedShapeCoords]);

  // Trigger Victory Animation Flow
  useEffect(() => {
      if ((gameStatus === 'VICTORY' || gameStatus === 'DEFEAT')) {
           if (gameStatus === 'VICTORY' && victoryStage === 'HIDDEN') {
               setVictoryStage('SALUTE');
           }
           setActiveModal(null);
           setHelpTopic(null);
           setInspectedItem(null);
           setShowInventory(false);
      } else {
           setVictoryStage('HIDDEN');
      }
  }, [gameStatus, victoryStage]);

  if (!player) return null;

  const isHudVisible = victoryStage === 'HIDDEN';

  return (
    <div 
        className="absolute inset-0 pointer-events-none z-20 overflow-hidden animate-fade-in"
        style={{
            transform: `scale(${uiScale})`,
            transformOrigin: 'top left',
            width: `${100 / uiScale}%`,
            height: `${100 / uiScale}%`,
        }}
    >
        {showSpBadge && (
            <div className="absolute top-[calc(20px+env(safe-area-inset-top))] left-1/2 -translate-x-1/2 z-[150] pointer-events-none">
                <div className="bg-gradient-to-r from-emerald-500 via-emerald-400 to-teal-500 text-slate-950 font-black font-mono text-sm px-5 py-2.5 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.8)] border border-white/40 flex items-center gap-2 select-none animate-in fade-in slide-in-from-top-4 duration-500">
                    <span className="text-lg">🏆</span>
                    <span className="tracking-widest uppercase">SHAPE COMPLETED! +1 SP</span>
                </div>
            </div>
        )}
        {isHudVisible && (
            <>
                <TopStatsBar 
                    onOpenModal={(modal) => setActiveModal(modal)} 
                    setHelpTopic={setHelpTopic}
                />
                
                {gameStatus === 'PLAYING' && session?.defense?.isDefenseMode && (
                    <DefenseSiegeBanner onOpenBriefing={() => setActiveModal('MISSION')} />
                )}

                {gameStatus === 'PLAYING' && (
                    <div className="absolute left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm md:max-w-md pointer-events-none flex flex-col gap-2 transition-all duration-300 top-[calc(48px+env(safe-area-inset-top))] sm:top-[calc(52px+env(safe-area-inset-top))] md:top-[68px]">
                        {!session?.defense?.isDefenseMode && <CentralTutorialBanner onOpenHelpDetail={() => setActiveModal('MISSION')} />}
                        
                        {toast && (
                            <div className="w-full flex justify-center pointer-events-auto">
                                <div className="w-full bg-slate-950/95 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-800 shadow-2xl flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-200">
                                    <span className="relative flex h-2 w-2 shrink-0">
                                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                            toast.type === 'error' ? 'bg-rose-400' : toast.type === 'success' ? 'bg-emerald-400' : 'bg-amber-400'
                                        }`}></span>
                                        <span className={`relative inline-flex rounded-full h-2 w-2 ${
                                            toast.type === 'error' ? 'bg-rose-500' : toast.type === 'success' ? 'bg-emerald-500' : 'bg-amber-500'
                                        }`}></span>
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-wider font-mono shrink-0 ${
                                        toast.type === 'error' ? 'text-rose-400' : toast.type === 'success' ? 'text-emerald-400' : 'text-amber-400'
                                    }`}>
                                        {toast.type === 'error' ? 'ОШИБКА' : toast.type === 'success' ? 'УСПЕХ' : 'ИНФО'}
                                    </span>
                                    <span className="text-[11px] font-semibold text-slate-200 truncate">
                                        {toast.message}
                                    </span>
                                </div>
                            </div>
                        )}

                        {!session?.defense?.isDefenseMode && <RadarWidget />}
                        {!session?.defense?.isDefenseMode && <SkirmishHintBanner />}
                    </div>
                )}
                
                {gameStatus === 'PLAYING' && (
                    <BottomActionDock 
                        onCenterPlayer={onCenterPlayer}
                        onInspectItem={(item) => setInspectedItem(item)}
                        onOpenInventory={() => setShowInventory(true)}
                    />
                )}


            </>
        )}

        <InventoryModal isOpen={showInventory} onClose={() => setShowInventory(false)} />

        <GameDialogs 
            activeModal={activeModal}
            closeModal={() => setActiveModal(null)}
            helpTopic={helpTopic}
            closeHelp={() => setHelpTopic(null)}
            inspectedItem={inspectedItem}
            closeInspect={() => setInspectedItem(null)}
            victoryStage={victoryStage}
            setVictoryStage={setVictoryStage}
        />
    </div>
  );
};

export default memo(GameHUD);
