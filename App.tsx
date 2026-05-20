
import React, { useEffect } from 'react';
import { useGameStore } from './store.ts';
import { motion, AnimatePresence } from 'motion/react';
import GameView from './components/GameView.tsx';
import MainMenu from './components/MainMenu.tsx';
import Leaderboard from './components/Leaderboard.tsx';
import CampaignMap from './components/CampaignMap.tsx';
import StoryBuilderView from './components/StoryBuilderView.tsx';
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
           <div className="absolute inset-0 overflow-hidden mix-blend-screen opacity-50 pointer-events-none">
              <div className="absolute top-[-20%] left-[10%] w-[70%] h-[70%] rounded-full bg-cyan-600/30 blur-[120px] animate-blob" />
              <div className="absolute bottom-[-20%] right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-600/30 blur-[120px] animate-blob animation-delay-2000" />
              <div className="absolute top-[20%] left-[40%] w-[40%] h-[40%] rounded-full bg-fuchsia-700/20 blur-[100px] animate-blob animation-delay-4000" />
           </div>
        </div>
      )}

      {/* Main Content Switcher */}
      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="wait">
          {uiState === 'MENU' && (
            <motion.div
              key="MENU"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="w-full h-full"
            >
              <MainMenu />
            </motion.div>
          )}
          {uiState === 'GAME' && (
            <motion.div
              key={`GAME-${sessionId}`}
              initial={{ opacity: 0, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.01 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="w-full h-full"
            >
              <GameView key={sessionId} />
            </motion.div>
          )}
          {uiState === 'LEADERBOARD' && (
            <motion.div
              key="LEADERBOARD"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="w-full h-full"
            >
              <Leaderboard />
            </motion.div>
          )}
          {uiState === 'CAMPAIGN_MAP' && (
            <motion.div
              key="CAMPAIGN_MAP"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="w-full h-full"
            >
              <CampaignMap />
            </motion.div>
          )}
          {uiState === 'STORY_BUILDER' && (
            <motion.div
              key="STORY_BUILDER"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="w-full h-full"
            >
              <StoryBuilderView />
            </motion.div>
          )}
          {uiState === 'INTRO' && (
            <motion.div
              key="INTRO"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-full h-full"
            >
              <IntroSequence />
            </motion.div>
          )}
          {uiState === 'CAMPAIGN_LOADING' && (
            <motion.div
              key="CAMPAIGN_LOADING"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="w-full h-full"
            >
              <CampaignLoading />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default App;
