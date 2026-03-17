
import React, { useEffect } from 'react';
import { useGameStore } from './store.ts';
import GameView from './components/GameView.tsx';
import MainMenu from './components/MainMenu.tsx';
import Leaderboard from './components/Leaderboard.tsx';
import CampaignMap from './components/CampaignMap.tsx';
import OverworldView from './components/OverworldView.tsx';
import IntroSequence from './components/IntroSequence.tsx';
import CampaignLoading from './components/CampaignLoading.tsx';
import Background from './components/Background.tsx';
import { DeviceType } from './types.ts';

const App: React.FC = () => {
  // Use selectors to avoid re-rendering App on every single state change
  const uiState = useGameStore(state => state.uiState);
  const sessionId = useGameStore(state => state.session?.sessionId);
  const setDeviceType = useGameStore(state => state.setDeviceType);

  useEffect(() => {
    // One-time migration: reset overworld progress for v1 users
    try {
      if (!localStorage.getItem('reset-v1')) {
        useGameStore.getState().resetProgress();
        localStorage.setItem('reset-v1', 'true');
      }
    } catch { /* localStorage unavailable (e.g. private browsing) */ }

    const handleResize = () => {
      const w = window.innerWidth;
      let type: DeviceType = 'DESKTOP';
      if (w < 768) type = 'MOBILE';
      else if (w < 1024) type = 'TABLET';
      
      setDeviceType(type);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize); // Handle rotation immediately
    handleResize(); // Init

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [setDeviceType]);

  return (
    <div className="relative w-screen h-screen supports-[height:100dvh]:h-[100dvh] bg-slate-950 overflow-hidden font-sans select-none">
      
      {/* Background Ambience (Visible in Menu/Leaderboard) */}
      {uiState !== 'GAME' && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
           
           {/* Tilted 2.5D Plane Container */}
           <div className="absolute inset-0 perspective-container">
             <div className="absolute inset-0 origin-center transform-3d rotate-x-60 scale-125 -top-[20%] h-[150%]">
                 <Background variant="MENU" />
             </div>
           </div>

           {/* Horizon Fog / Vignette Overlay */}
           <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950/90" />
           <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)]" />

           {/* Floating Light Blobs */}
           <div className="absolute inset-0 overflow-hidden mix-blend-screen opacity-30">
              <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-900/40 blur-[100px] animate-blob" />
              <div className="absolute bottom-[-10%] right-[20%] w-[50%] h-[50%] rounded-full bg-indigo-900/40 blur-[100px] animate-blob animation-delay-2000" />
           </div>
        </div>
      )}

      {/* Main Content Switcher */}
      <div className="relative z-10 w-full h-full">
        {uiState === 'MENU' && <MainMenu />}
        {/* Using sessionId as key forces a complete unmount of GameView when a new game starts, 
            ensuring all local state (camera, animations) is reset. */}
        {uiState === 'GAME' && <GameView key={sessionId} />}
        {uiState === 'LEADERBOARD' && <Leaderboard />}
        {uiState === 'CAMPAIGN_MAP' && <CampaignMap />}
        {uiState === 'OVERWORLD' && <OverworldView />}
        {uiState === 'INTRO' && <IntroSequence />}
        {uiState === 'CAMPAIGN_LOADING' && <CampaignLoading />}
      </div>

    </div>
  );
};

export default App;
