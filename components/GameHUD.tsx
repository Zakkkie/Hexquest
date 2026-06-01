
import React, { useState, useEffect, memo } from 'react';
import { useGameStore } from '../store.ts';
import TopStatsBar from './hud/TopStatsBar.tsx';
import BottomActionDock from './hud/BottomActionDock.tsx';
import GameDialogs from './hud/GameDialogs.tsx';
import InventoryModal from './InventoryModal.tsx';
import MonumentHintBanner from './hud/MonumentHintBanner.tsx';
import SkirmishHintBanner from './hud/SkirmishHintBanner.tsx';
import CentralTutorialBanner from './hud/CentralTutorialBanner.tsx';
import { Item } from '../types.ts';

interface GameHUDProps {
  onCenterPlayer: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ onCenterPlayer }) => {
  const gameStatus = useGameStore(state => state.session?.gameStatus);
  const player = useGameStore(state => state.session?.player);
  const toast = useGameStore(state => state.toast);
  
  // UI State orchestration
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [helpTopic, setHelpTopic] = useState<'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY' | null>(null);
  const [inspectedItem, setInspectedItem] = useState<Item | null>(null);
  const [showInventory, setShowInventory] = useState(false);
  const [victoryStage, setVictoryStage] = useState<'HIDDEN' | 'SALUTE' | 'MODAL'>('HIDDEN');

  // Trigger Victory Animation Flow
  useEffect(() => {
      if (gameStatus === 'VICTORY' && victoryStage === 'HIDDEN') {
          setVictoryStage('SALUTE');
      } else if (gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT') {
          setVictoryStage('HIDDEN');
      }
  }, [gameStatus, victoryStage]);

  if (!player) return null;

  const isHudVisible = victoryStage === 'HIDDEN' && gameStatus !== 'BRIEFING';

  return (
    <>
        {isHudVisible && (
            <>
                <TopStatsBar 
                    onOpenModal={(modal) => setActiveModal(modal)} 
                    setHelpTopic={setHelpTopic}
                />
                
                {(gameStatus === 'PLAYING' || toast) && (
                    <div className="absolute top-[calc(74px+env(safe-area-inset-top))] md:top-[96px] left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm md:max-w-md pointer-events-none flex flex-col gap-2.5">
                        {toast && (
                            <div className="w-full flex justify-center pointer-events-auto">
                                <div className="w-full bg-slate-950 px-4 py-3 rounded-lg border border-slate-800 shadow-xl flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                                    <span className={`
                                        text-xs font-black uppercase tracking-wider font-mono select-none text-center leading-tight
                                        ${toast.type === 'error' ? 'text-rose-400' : toast.type === 'success' ? 'text-emerald-400' : 'text-amber-400'}
                                    `}>
                                        {toast.message}
                                    </span>
                                </div>
                            </div>
                        )}
                        
                        <CentralTutorialBanner onOpenHelpDetail={() => setActiveModal('MISSION')} />
                        
                        {gameStatus === 'PLAYING' && (
                            <>
                                <MonumentHintBanner />
                                <SkirmishHintBanner />
                            </>
                        )}
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
    </>
  );
};

export default memo(GameHUD);
