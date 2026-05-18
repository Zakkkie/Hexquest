import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Hexagon, Target, ArrowRight } from 'lucide-react';

const IntroSequence: React.FC = () => {
  const setUIState = useGameStore(state => state.setUIState);
  const introNextState = useGameStore(state => state.introNextState);
  const [step, setStep] = useState(0);
  const [showSafetySkip, setShowSafetySkip] = useState(false);

  useEffect(() => {
    // Safety timer to show skip button if something hangs
    const safetyTimer = setTimeout(() => setShowSafetySkip(true), 2000);

    const timers = [
      setTimeout(() => setStep(1), 3500),
      setTimeout(() => setStep(2), 7500),
      setTimeout(() => setStep(3), 11500),
    ];
    return () => {
      clearTimeout(safetyTimer);
      timers.forEach(clearTimeout);
    };
  }, []);

  const skipIntro = () => {
    setUIState(introNextState);
  };

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden mix-blend-screen opacity-20 pointer-events-none">
        <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-900/40 blur-[100px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[20%] w-[50%] h-[50%] rounded-full bg-indigo-900/40 blur-[100px] animate-blob animation-delay-2000" />
      </div>

      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div
            key="step0"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 1.5 }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-6">
              <Hexagon className="w-32 h-32 text-indigo-500 drop-shadow-[0_0_20px_rgba(99,102,241,0.5)] fill-indigo-900/20" strokeWidth={1} />
              <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                <Target className="w-12 h-12 text-white drop-shadow-[0_0_15px_#fff]" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 break-words whitespace-pre-wrap">
              HEXQUEST
            </h1>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1 }}
            className="text-center max-w-2xl px-6"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-indigo-300 mb-4 tracking-widest uppercase break-words whitespace-pre-wrap">
              The Entropy Cascade
            </h2>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-light break-words whitespace-pre-wrap">
              The world was shattered by the Entropy Cascade. Reality itself is unstable, shifting and collapsing.
              Only the ancient Monuments hold the power to stabilize the grid.
            </p>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 1 }}
            className="text-center max-w-2xl px-6"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-emerald-400 mb-4 tracking-widest uppercase break-words whitespace-pre-wrap">
              Your Mission
            </h2>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-light break-words whitespace-pre-wrap">
              Command your unit. Gather resources, build structures, and reach the Summit before the rival AI or the collapsing reality consumes you.
            </p>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center"
          >
            <h2 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] break-words whitespace-pre-wrap">
              Initialization Complete
            </h2>
            <button
              onClick={skipIntro}
              style={{ paddingLeft: '14px' }}
              className="group flex flex-col items-center justify-center gap-2 px-12 py-6 bg-slate-900/80 border border-indigo-500/50 hover:bg-slate-800 text-indigo-400 hover:text-indigo-300 font-black uppercase tracking-[0.3em] transition-all shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] hover:scale-105 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-indigo-500/10 transition-opacity opacity-0 group-hover:opacity-100 pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10 text-white">
                 <span style={{ marginLeft: 0, paddingLeft: '4px', marginBottom: 0, marginRight: '10px' }}>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                 </span>
                 <span style={{ paddingLeft: 0, paddingTop: 0, marginLeft: 0, marginRight: '14px', marginBottom: '45px', marginTop: '15px' }}>
                    Deploy Unit
                 </span>
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {(step < 3 || showSafetySkip) && (
        <button
          onClick={skipIntro}
          className="absolute bottom-8 right-8 text-slate-500 hover:text-white font-mono text-sm tracking-widest uppercase transition-colors z-[110]"
        >
          Skip Intro
        </button>
      )}
    </div>
  );
};

export default IntroSequence;
