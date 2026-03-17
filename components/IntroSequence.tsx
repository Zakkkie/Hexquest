import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Hexagon, Target, ArrowRight } from 'lucide-react';

const IntroSequence: React.FC = () => {
  const { setUIState, introNextState } = useGameStore();
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)]" />
      <div className="absolute inset-0 overflow-hidden mix-blend-screen opacity-20">
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
            <h1 className="text-4xl md:text-6xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
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
            <h2 className="text-2xl md:text-3xl font-bold text-indigo-300 mb-4 tracking-widest uppercase">
              The Entropy Cascade
            </h2>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-light">
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
            <h2 className="text-2xl md:text-3xl font-bold text-emerald-400 mb-4 tracking-widest uppercase">
              Your Mission
            </h2>
            <p className="text-lg md:text-xl text-slate-300 leading-relaxed font-light">
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
            <h2 className="text-3xl md:text-5xl font-black text-white mb-8 tracking-widest uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
              Initialization Complete
            </h2>
            <button
              onClick={skipIntro}
              className="group flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_30px_rgba(99,102,241,0.6)] hover:scale-105"
            >
              Deploy <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
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
