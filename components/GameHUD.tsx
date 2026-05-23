
import React, { useState, useEffect, memo } from 'react';
import { useGameStore } from '../store.ts';
import TopStatsBar from './hud/TopStatsBar.tsx';
import BottomActionDock from './hud/BottomActionDock.tsx';
import GameDialogs from './hud/GameDialogs.tsx';
import InventoryModal from './InventoryModal.tsx';
import MonumentHintBanner from './hud/MonumentHintBanner.tsx';
import SkirmishHintBanner from './hud/SkirmishHintBanner.tsx';
import CampaignHintBanner from './hud/CampaignHintBanner.tsx';
import { Item } from '../types.ts';
import { XCircle, CheckCircle, Info } from 'lucide-react';

interface GameHUDProps {
  onCenterPlayer: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ onCenterPlayer }) => {
  const gameStatus = useGameStore(state => state.session?.gameStatus);
  const player = useGameStore(state => state.session?.player);
  const toast = useGameStore(state => state.toast);
  const deviceType = useGameStore(state => state.deviceType);
  const isMobile = deviceType === 'MOBILE';
  
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
                                <div className={`
                                    relative flex items-center gap-3 px-4 py-3 rounded-xl backdrop-blur-xl shadow-2xl border-2
                                    animate-in slide-in-from-top-4 duration-350 w-full group overflow-hidden
                                    ${toast.type === 'error' ? 'bg-red-950/90 border-red-500/60 shadow-red-900/40 text-red-100' : ''}
                                    ${toast.type === 'success' ? 'bg-emerald-950/90 border-emerald-500/60 shadow-emerald-900/40 text-emerald-100' : ''}
                                    ${toast.type === 'info' ? 'bg-indigo-950/90 border-indigo-500/60 shadow-indigo-900/40 text-indigo-100' : ''}
                                `}>
                                    {/* Scanline effect */}
                                    <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none" />
                                    <div className="absolute top-0 left-0 w-full h-0.5 bg-white/10 animate-scan-fast" />

                                    {/* Corner brackets */}
                                    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-current opacity-50" />
                                    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-current opacity-50" />
                                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-current opacity-50" />
                                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-current opacity-50" />

                                    <div className="relative flex items-center gap-3">
                                        <div className={`p-1.5 rounded-lg shrink-0 ${toast.type === 'error' ? 'bg-red-500/20' : toast.type === 'success' ? 'bg-emerald-500/20' : 'bg-indigo-500/20'}`}>
                                            {toast.type === 'error' && <XCircle className="w-4 h-4 text-red-400" />}
                                            {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                                            {toast.type === 'info' && <Info className="w-4 h-4 text-indigo-400" />}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <div className="text-[8px] font-black uppercase tracking-[0.2em] opacity-60 mb-0.5 font-mono">
                                                {toast.type === 'error' ? 'SYSTEM_ALERT' : toast.type === 'success' ? 'PROCESS_COMPLETE' : 'DATA_FEED'}
                                            </div>
                                            <span className="text-[11px] md:text-xs font-bold uppercase tracking-tight leading-tight font-mono break-words">
                                                {toast.message}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {gameStatus === 'PLAYING' && (
                            <>
                                <MonumentHintBanner />
                                <SkirmishHintBanner />
                                {!isMobile && <CampaignHintBanner />}
                            </>
                        )}
                    </div>
                )}
                
                {gameStatus === 'PLAYING' && (
                    <BottomActionDock 
                        onCenterPlayer={onCenterPlayer}
                        onOpenMission={() => setActiveModal('MISSION')}
                        onInspectItem={(item) => setInspectedItem(item)}
                        onOpenInventory={() => setShowInventory(true)}
                    />
                )}

                {gameStatus === 'PLAYING' && isMobile && (
                    <div className="absolute bottom-[calc(90px+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm pointer-events-none flex flex-col gap-2.5">
                        <CampaignHintBanner />
                    </div>
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
