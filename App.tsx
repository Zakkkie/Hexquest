import React, { useEffect, useCallback } from 'react';
import { useGameStore } from './store';
import { audioService } from './services/audioService';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react';
import GameView from './components/GameView';
import MainMenu from './components/MainMenu';
import Leaderboard from './components/Leaderboard';
import CampaignMap from './components/CampaignMap';
import StoryBuilderView from './components/StoryBuilderView';
import LevelEditorView from './components/LevelEditorView';
import IntroSequence from './components/IntroSequence';
import CampaignLoading from './components/CampaignLoading';
import Background from './components/Background';
import { DeviceType } from './types';

const App: React.FC = () => {
  const uiState = useGameStore(state => state.uiState);
  const sessionId = useGameStore(state => state.session?.sessionId);
  const setDeviceType = useGameStore(state => state.setDeviceType);

  const cursorX = useMotionValue(-250);
  const cursorY = useMotionValue(-250);
  const smoothX = useSpring(cursorX, { stiffness: 150, damping: 25, mass: 0.5 });
  const smoothY = useSpring(cursorY, { stiffness: 150, damping: 25, mass: 0.5 });

  const handleResize = useCallback(() => {
    const w = window.innerWidth;
    let type: DeviceType = 'DESKTOP';
    if (w < 768) type = 'MOBILE';
    else if (w < 1024) type = 'TABLET';
    setDeviceType(type);
  }, [setDeviceType]);

  useEffect(() => {
    // One-time migration: reset overworld progress for v1 users
    try {
      if (!localStorage.getItem('reset-v1')) {
        useGameStore.getState().resetProgress();
        localStorage.setItem('reset-v1', 'true');
      }
    } catch (error) {
      console.warn('localStorage unavailable or reset failed:', error);
    }

    const handleMouseMove = (e: MouseEvent) => {
      cursorX.set(e.clientX - 250);
      cursorY.set(e.clientY - 250);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    handleResize(); // Init
    audioService.startMusic();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [handleResize, cursorX, cursorY]);

  return (
    <div className="relative w-screen h-screen supports-[height:100dvh]:h-[100dvh] bg-slate-950 overflow-hidden font-sans select-none">
      {/* Background Ambience (Visible in Menu/Leaderboard) */}
      {uiState !== 'GAME' && (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <div className="absolute inset-0 perspective-container">
            <div className="absolute inset-0 origin-center transform-3d rotate-x-60 scale-125 -top-[20%] h-[150%]">
              <Background variant="MENU" />
            </div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-transparent to-slate-950/90" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)]" />
        </div>
      )}

      {/* Global Glowing Atmospheric Gradient */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-45 mix-blend-screen"
        style={{
          background: 'radial-gradient(circle at 10% 10%, rgba(8, 145, 178, 0.25) 0%, transparent 60%), radial-gradient(circle at 90% 90%, rgba(79, 70, 229, 0.25) 0%, transparent 60%), radial-gradient(circle at 50% 30%, rgba(168, 85, 247, 0.15) 0%, transparent 50%)'
        }}
      />

      {/* Global Dynamic Cursor Light Glow */}
      <motion.div
        className="hidden md:block absolute rounded-full bg-indigo-500/12 blur-[130px] pointer-events-none z-0 mix-blend-screen"
        style={{ x: smoothX, y: smoothY, width: 500, height: 500, left: 0, top: 0 }}
      />

      {/* Main Content Switcher */}
      <div className="relative z-10 w-full h-full">
        <AnimatePresence mode="wait">
          {uiState === 'MENU' && (
            <motion.div key="MENU" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="w-full h-full">
              <MainMenu />
            </motion.div>
          )}
          {uiState === 'GAME' && (
            <motion.div key={`GAME-${sessionId}`} initial={{ opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.01 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="w-full h-full">
              <GameView key={sessionId} />
            </motion.div>
          )}
          {uiState === 'LEADERBOARD' && (
            <motion.div key="LEADERBOARD" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="w-full h-full">
              <Leaderboard />
            </motion.div>
          )}
          {uiState === 'CAMPAIGN_MAP' && (
            <motion.div key="CAMPAIGN_MAP" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="w-full h-full">
              <CampaignMap />
            </motion.div>
          )}
          {uiState === 'STORY_BUILDER' && (
            <motion.div key="STORY_BUILDER" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="w-full h-full">
              <StoryBuilderView />
            </motion.div>
          )}
          {uiState === 'LEVEL_EDITOR' && (
            <motion.div key="LEVEL_EDITOR" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }} transition={{ duration: 0.22, ease: "easeInOut" }} className="w-full h-full">
              <LevelEditorView />
            </motion.div>
          )}
          {uiState === 'INTRO' && (
            <motion.div key="INTRO" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="w-full h-full">
              <IntroSequence />
            </motion.div>
          )}
          {uiState === 'CAMPAIGN_LOADING' && (
            <motion.div key="CAMPAIGN_LOADING" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }} className="w-full h-full">
              <CampaignLoading />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;