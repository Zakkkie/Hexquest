
import React, { useState, useEffect, memo } from 'react';
import { useGameStore } from '../store.ts';
import TopStatsBar from './hud/TopStatsBar.tsx';
import BottomActionDock from './hud/BottomActionDock.tsx';
import GameDialogs from './hud/GameDialogs.tsx';
import { Item } from '../types.ts';

interface GameHUDProps {
  onCenterPlayer: () => void;
}

const GameHUD: React.FC<GameHUDProps> = ({ onCenterPlayer }) => {
  const gameStatus = useGameStore(state => state.session?.gameStatus);
  const player = useGameStore(state => state.session?.player);
  
  // UI State orchestration
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [helpTopic, setHelpTopic] = useState<'RANK' | 'MATERIAL' | 'COINS' | 'MOVES' | 'ENTROPY' | null>(null);
  const [inspectedItem, setInspectedItem] = useState<Item | null>(null);
  const [victoryStage, setVictoryStage] = useState<'HIDDEN' | 'SALUTE' | 'MODAL'>('HIDDEN');

  // Trigger Victory Animation Flow
  useEffect(() => {
      if (gameStatus === 'VICTORY' && victoryStage === 'HIDDEN') {
          setVictoryStage('SALUTE');
          const timer = setTimeout(() => {
              setVictoryStage(current => current === 'SALUTE' ? 'MODAL' : current);
          }, 5000);
          return () => clearTimeout(timer);
      } else if (gameStatus !== 'VICTORY' && gameStatus !== 'DEFEAT') {
          setVictoryStage('HIDDEN');
      }
  }, [gameStatus]);

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
                
                {gameStatus === 'PLAYING' && (
                    <BottomActionDock 
                        onCenterPlayer={onCenterPlayer}
                        onOpenMission={() => setActiveModal('MISSION')}
                        onInspectItem={(item) => setInspectedItem(item)}
                    />
                )}
            </>
        )}

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
