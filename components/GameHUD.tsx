
import React, { useState, useEffect, memo, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { audioService } from '../services/audioService.ts';
import TopStatsBar from './hud/TopStatsBar.tsx';
import BottomActionDock from './hud/BottomActionDock.tsx';
import GameDialogs from './hud/GameDialogs.tsx';
import InventoryModal from './InventoryModal.tsx';
import SkirmishHintBanner from './hud/SkirmishHintBanner.tsx';
import CentralTutorialBanner from './hud/CentralTutorialBanner.tsx';
import { OnboardingTutorial } from './hud/OnboardingTutorial.tsx';
import { DefenseSiegeBanner } from './hud/DefenseSiegeBanner.tsx';
import { RadarWidget } from './hud/RadarWidget.tsx';
import { Item } from '../types.ts';

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

  const isHudVisible = victoryStage === 'HIDDEN' && gameStatus !== 'BRIEFING';

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
                    <div className="absolute left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm md:max-w-md pointer-events-none flex flex-col gap-2.5 transition-all duration-300 top-[calc(84px+env(safe-area-inset-top))] md:top-[104px]">
                        {!session?.defense?.isDefenseMode && <CentralTutorialBanner onOpenHelpDetail={() => setActiveModal('MISSION')} />}
                        {!session?.defense?.isDefenseMode && <RadarWidget />}
                        
                        {toast && !session?.activeLevelConfig && (
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

        <OnboardingTutorial />

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
