import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, RefreshCw, X, Zap, AlertTriangle, Hexagon, Unlock, HelpCircle, Layers, Sparkles } from 'lucide-react';
import { audioService } from '../services/audioService.ts';

export type RouletteRewardItem = 
  | { type: 'TILE'; level: number; count: number }
  | { type: 'SP'; spCount: number };

export interface QuantumRouletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  skillPoints: number;
  setSkillPoints: React.Dispatch<React.SetStateAction<number>>;
  addCollectedHexes: (hexes: Record<number, number>) => void;
  addMinedHexes: (hexes: Record<number, number>) => void;
  addSystemLog: (ru: string, en: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  language: 'RU' | 'EN';
  getHexLevelStyle: (level: number) => { bg: string; border: string; text: string };
  playUiSound?: (sound: any) => void;
}

interface MatrixParticle {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
}

export const QuantumRouletteModal: React.FC<QuantumRouletteModalProps> = (props) => {
  return <NexusRouletteTerminal {...props} />;
};

export const NexusRouletteTerminal: React.FC<QuantumRouletteModalProps> = ({
  isOpen,
  onClose,
  skillPoints,
  setSkillPoints,
  addCollectedHexes,
  addMinedHexes,
  addSystemLog,
  language,
  getHexLevelStyle,
  playUiSound,
}) => {
  const getRandomRouletteReward = useCallback((): RouletteRewardItem => {
    const r = Math.random();
    if (r < 0.003) return { type: 'SP', spCount: 3 };
    if (r < 0.009) return { type: 'SP', spCount: 2 };
    if (r < 0.018) return { type: 'SP', spCount: 1 };

    if (r < 0.250) return { type: 'TILE', level: 1, count: 25 };
    if (r < 0.430) return { type: 'TILE', level: 2, count: 20 };
    if (r < 0.580) return { type: 'TILE', level: 3, count: 15 };
    if (r < 0.730) return { type: 'TILE', level: 4, count: 12 };
    if (r < 0.820) return { type: 'TILE', level: 5, count: 9 };
    if (r < 0.890) return { type: 'TILE', level: 6, count: 7 };
    if (r < 0.940) return { type: 'TILE', level: 7, count: 5 };
    if (r < 0.970) return { type: 'TILE', level: 8, count: 3 };
    if (r < 0.990) return { type: 'TILE', level: 9, count: 2 };
    return { type: 'TILE', level: 10, count: 1 };
  }, []);

  const [isSpinning, setIsSpinning] = useState(false);
  const isSpinningRef = useRef(false);
  const [lastReward, setLastReward] = useState<RouletteRewardItem | null>(null);
  const [isJackpot, setIsJackpot] = useState(false);
  const [isOverloading, setIsOverloading] = useState(false);
  const [showRates, setShowRates] = useState(false);
  const [particles, setParticles] = useState<MatrixParticle[]>([]);
  const ratesContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-collapse drop rates drawer when clicking anywhere outside
  useEffect(() => {
    if (!showRates) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (
        ratesContainerRef.current &&
        !ratesContainerRef.current.contains(e.target as Node)
      ) {
        setShowRates(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [showRates]);

  const [reelTape, setReelTape] = useState<RouletteRewardItem[]>(() => Array.from({ length: 40 }, () => getRandomRouletteReward()));
  const [reelIndex, setReelIndex] = useState(0);
  const [spinDuration, setSpinDuration] = useState(0.05);
  const spinTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up active timers when modal closes or unmounts
  useEffect(() => {
    if (!isOpen) {
      if (spinTimerRef.current) {
        clearTimeout(spinTimerRef.current);
        spinTimerRef.current = null;
      }
      isSpinningRef.current = false;
      setIsSpinning(false);
      setIsOverloading(false);
    }
    return () => {
      if (spinTimerRef.current) {
        clearTimeout(spinTimerRef.current);
        spinTimerRef.current = null;
      }
      isSpinningRef.current = false;
    };
  }, [isOpen]);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSpinning && !isSpinningRef.current) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSpinning, onClose]);

  const initiateHack = useCallback(() => {
    if (isSpinning || isSpinningRef.current) return;

    const currentSP = typeof skillPoints === 'number' && !isNaN(skillPoints) ? skillPoints : 0;

    if (currentSP < 1) {
      if (playUiSound) playUiSound('ERROR');
      addSystemLog('ОТКАЗ ДОСТУПА: НЕДОСТАТОЧНО ОЧКОВ (1 SP)', 'ACCESS DENIED: NOT ENOUGH SP (1 SP)', 'warning');
      return;
    }

    isSpinningRef.current = true;
    if (playUiSound) playUiSound('CLICK');
    setSkillPoints(prev => {
      const p = typeof prev === 'number' && !isNaN(prev) ? prev : 0;
      return Math.max(0, p - 1);
    });
    setIsSpinning(true);
    setLastReward(null);
    setIsJackpot(false);
    setIsOverloading(false);
    setParticles([]);

    const winningReward = getRandomRouletteReward();
    const totalSteps = 30; // 30 steps = ~3.2s total
    
    const newTape: RouletteRewardItem[] = [];
    for (let i = 0; i < totalSteps; i++) newTape.push(getRandomRouletteReward());
    newTape[totalSteps] = winningReward;
    for (let i = 0; i < 5; i++) newTape.push(getRandomRouletteReward());

    setReelTape(newTape);
    setReelIndex(0);
    let currentStep = 0;

    const runStep = () => {
      currentStep++;
      const progress = currentStep / totalSteps;
      
      // Cyber deceleration curve
      const delay = 10 + Math.pow(progress, 4) * 380;
      setSpinDuration(delay / 1000);
      setReelIndex(currentStep);
      audioService.play('UI_HOVER');

      // Trigger Overload mode at 70%
      if (progress > 0.7) {
        setIsOverloading(true);
      }

      if (currentStep < totalSteps) {
        spinTimerRef.current = setTimeout(runStep, delay);
      } else {
        // Freeze and process
        setIsOverloading(false);
        spinTimerRef.current = setTimeout(() => {
          isSpinningRef.current = false;
          setIsSpinning(false);
          setLastReward(winningReward);

          if (winningReward.type === 'TILE') {
            addCollectedHexes({ [winningReward.level]: winningReward.count });
            addMinedHexes({ [winningReward.level]: winningReward.count });
            audioService.play('LEVEL_UP');
            addSystemLog(`СИНТЕЗ ЗАВЕРШЕН: +${winningReward.count} L${winningReward.level}`, `SYNTHESIS COMPLETE: +${winningReward.count} L${winningReward.level}`, 'success');
          } else {
            setSkillPoints(prev => {
              const p = typeof prev === 'number' && !isNaN(prev) ? prev : 0;
              return p + winningReward.spCount;
            });
            setIsJackpot(true);
            audioService.play('JACKPOT');

            // Matrix explosion
            const newParticles = Array.from({ length: 60 }, (_, i) => ({
              id: i,
              x: (Math.random() - 0.5) * 400,
              y: (Math.random() - 0.5) * 400,
              delay: Math.random() * 0.2,
              size: 4 + Math.random() * 14,
            }));
            setParticles(newParticles);
            addSystemLog(`💎 ПЕРЕГРУЗКА СИСТЕМЫ! +${winningReward.spCount} SP`, `💎 SYSTEM OVERLOAD! +${winningReward.spCount} SP`, 'success');
          }
        }, 400); // Suspense pause
      }
    };

    spinTimerRef.current = setTimeout(runStep, 25);
  }, [isSpinning, skillPoints, setSkillPoints, addCollectedHexes, addMinedHexes, playUiSound, addSystemLog, getRandomRouletteReward]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-950/95 backdrop-blur-2xl z-[99999] flex items-center justify-center p-4 pointer-events-auto overflow-hidden"
        onClick={() => !isSpinning && onClose()}
      >
        {/* Glitch Overlay on Jackpot */}
        <AnimatePresence>
          {isJackpot && (
            <motion.div 
              className="absolute inset-0 z-40 pointer-events-none mix-blend-screen"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.8, 0.2, 0.6, 0] }}
              transition={{ duration: 0.5, repeat: 3 }}
              style={{
                backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,0.1) 0px, transparent 1px, transparent 2px, rgba(236,72,153,0.2) 3px, transparent 4px)'
              }}
            />
          )}
        </AnimatePresence>

        <motion.div
          animate={isJackpot ? { x: [0, -8, 10, -6, 0], y: [0, 4, -6, 3, 0] } : { x: 0, y: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          onClick={(e) => e.stopPropagation()}
          className={`relative w-full max-w-md bg-slate-950/90 border rounded-2xl p-6 flex flex-col items-center overflow-hidden transition-all duration-300 z-50 ${
            isJackpot 
              ? 'border-pink-500 shadow-[0_0_80px_rgba(236,72,153,0.6)]' 
              : isOverloading
              ? 'border-red-500 shadow-[0_0_60px_rgba(239,68,68,0.5)]'
              : 'border-cyan-500/50 shadow-[0_0_50px_rgba(34,211,238,0.25)]'
          }`}
          style={{
            backdropFilter: 'blur(16px)',
          }}
        >
          {/* Holographic Grid */}
          <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(34,211,238,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.2) 1px, transparent 1px)',
            backgroundSize: '25px 25px'
          }} />

          {/* Close Button */}
          <button
            onClick={onClose}
            disabled={isSpinning}
            className="absolute top-4 right-4 p-2 text-cyan-400 hover:text-white bg-slate-900/80 hover:bg-cyan-950 border border-cyan-500/30 rounded-lg transition-all disabled:opacity-30 z-30 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-center gap-2.5 mb-1 z-10 text-center">
            <Cpu className={`w-6 h-6 shrink-0 ${isOverloading ? 'text-red-400 animate-pulse' : isJackpot ? 'text-pink-400' : 'text-cyan-400'}`} />
            <h2 className="text-xl font-black font-mono tracking-widest text-cyan-300 drop-shadow-[0_0_12px_rgba(34,211,238,0.6)]">
              {language === 'RU' ? 'НЕКСУС СИНТЕЗА' : 'NEXUS SYNTHESIS'}
            </h2>
          </div>
          <p className="text-[10px] text-cyan-500/80 uppercase tracking-[0.2em] mb-4 z-10 font-mono text-center">
            {language === 'RU' ? '// ИНИЦИИРОВАТЬ ВЗЛОМ ЗА 1 SP' : '// INITIATE HACK FOR 1 SP'}
          </p>

          {/* SP Balance & Odds Toggle + Collapsible Rates Drawer */}
          <div ref={ratesContainerRef} className="w-full z-20">
            <div className="flex items-center justify-between w-full mb-4 font-mono text-xs gap-3">
              <div className="flex items-center gap-2 bg-slate-900/90 border border-cyan-500/40 px-3.5 py-1.5 rounded-lg shadow-[0_0_15px_rgba(34,211,238,0.1)]">
                <Zap className="w-4 h-4 text-yellow-400" />
                <span className="text-slate-400">{language === 'RU' ? 'ЭНЕРГИЯ:' : 'ENERGY:'}</span>
                <span className="text-cyan-300 font-bold">{typeof skillPoints === 'number' && !isNaN(skillPoints) ? skillPoints : 0} SP</span>
              </div>

              <button
                onClick={() => setShowRates(!showRates)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold text-cyan-400/90 hover:text-cyan-200 bg-slate-900/90 border border-cyan-500/30 hover:border-cyan-400 rounded-lg transition-all cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{language === 'RU' ? 'ШАНСЫ' : 'ODDS'}</span>
              </button>
            </div>

            {/* Collapsible Drop Rates Drawer */}
            <AnimatePresence>
              {showRates && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="w-full bg-slate-900/95 border border-cyan-500/40 rounded-xl p-3 mb-4 text-xs text-slate-300 font-mono z-10 overflow-hidden shadow-xl"
                >
                  <div className="font-bold text-cyan-300 mb-2 flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                      {language === 'RU' ? 'ВЕРОЯТНОСТИ ДРОПА:' : 'DROP PROBABILITIES:'}
                    </span>
                    <span className="text-[10px] text-cyan-400/70 font-normal">
                      {language === 'RU' ? '1 SP = 1 СИНТЕЗ' : '1 SP = 1 SPIN'}
                    </span>
                  </div>

                  {/* SP Odds */}
                  <div className="grid grid-cols-3 gap-1.5 mb-2 pb-2 border-b border-cyan-500/20 text-[11px]">
                    <div className="bg-pink-950/40 border border-pink-500/30 rounded px-2 py-1 flex items-center justify-between">
                      <span className="text-pink-300 font-bold">+3 SP</span>
                      <span className="text-pink-200 font-bold">0.3%</span>
                    </div>
                    <div className="bg-pink-950/40 border border-pink-500/30 rounded px-2 py-1 flex items-center justify-between">
                      <span className="text-pink-300 font-bold">+2 SP</span>
                      <span className="text-pink-200 font-bold">0.6%</span>
                    </div>
                    <div className="bg-pink-950/40 border border-pink-500/30 rounded px-2 py-1 flex items-center justify-between">
                      <span className="text-pink-300 font-bold">+1 SP</span>
                      <span className="text-pink-200 font-bold">0.9%</span>
                    </div>
                  </div>

                  {/* Tile Odds Breakdown L1 - L10 */}
                  <div className="max-h-48 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
                    {[
                      { level: 10, percent: '1.0%', count: 1 },
                      { level: 9, percent: '2.0%', count: 2 },
                      { level: 8, percent: '3.0%', count: 3 },
                      { level: 7, percent: '5.0%', count: 5 },
                      { level: 6, percent: '7.0%', count: 7 },
                      { level: 5, percent: '9.0%', count: 9 },
                      { level: 4, percent: '15.0%', count: 12 },
                      { level: 3, percent: '15.0%', count: 15 },
                      { level: 2, percent: '18.0%', count: 20 },
                      { level: 1, percent: '23.2%', count: 25 },
                    ].map((item) => {
                      const style = getHexLevelStyle(item.level);
                      return (
                        <div 
                          key={item.level} 
                          className={`flex items-center justify-between px-2.5 py-1 rounded border text-[11px] ${style.bg} ${style.border}`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`font-black ${style.text}`}>L{item.level}</span>
                            <span className="text-slate-400 text-[10px]">(+{item.count} {language === 'RU' ? 'плит' : 'tiles'})</span>
                          </div>
                          <span className={`font-bold ${style.text}`}>{item.percent}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-2 text-[9px] text-cyan-400/60 text-center font-mono uppercase tracking-wider">
                    {language === 'RU'
                      ? '// ТИПЫ И КОЛИЧЕСТВО НАГРАД ЗА СИНТЕЗ'
                      : '// SYNTHESIS REWARD TYPES & QUANTITIES'}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 3D Holographic Reel Container */}
          <div className={`w-full bg-slate-950/80 border-2 rounded-xl p-2 mb-4 relative overflow-hidden transition-all duration-300 z-10 ${
            isOverloading ? 'border-red-500/80 shadow-[inset_0_0_40px_rgba(239,68,68,0.3)]' : 'border-cyan-500/40 shadow-[inset_0_0_40px_rgba(34,211,238,0.15)]'
          }`}>
            
            {/* Target Reticle */}
            <div className={`absolute top-1/2 left-2 right-2 -translate-y-1/2 h-[56px] border-x-2 pointer-events-none z-20 flex items-center justify-between px-2 transition-all duration-200 rounded-lg ${
              isJackpot 
                ? 'border-pink-400 bg-pink-500/10 shadow-[0_0_20px_rgba(236,72,153,0.3)]' 
                : isOverloading 
                ? 'border-red-400 bg-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
                : 'border-cyan-400 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
            }`}>
              {/* HUD Brackets */}
              <div className={`absolute top-0 left-0 w-2.5 h-2.5 border-l-2 border-t-2 ${isJackpot ? 'border-pink-400' : isOverloading ? 'border-red-400' : 'border-cyan-300'}`} />
              <div className={`absolute top-0 right-0 w-2.5 h-2.5 border-r-2 border-t-2 ${isJackpot ? 'border-pink-400' : isOverloading ? 'border-red-400' : 'border-cyan-300'}`} />
              <div className={`absolute bottom-0 left-0 w-2.5 h-2.5 border-l-2 border-b-2 ${isJackpot ? 'border-pink-400' : isOverloading ? 'border-red-400' : 'border-cyan-300'}`} />
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-r-2 border-b-2 ${isJackpot ? 'border-pink-400' : isOverloading ? 'border-red-400' : 'border-cyan-300'}`} />

              <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 text-[8px] font-mono font-bold tracking-widest uppercase px-2 py-0.5 rounded bg-slate-950 border whitespace-nowrap ${
                isJackpot ? 'text-pink-400 border-pink-500/50' : isOverloading ? 'text-red-400 border-red-500/50 animate-pulse' : 'text-cyan-400 border-cyan-500/40'
              }`}>
                {isOverloading ? 'OVERLOAD WARNING' : 'TARGET LOCKED'}
              </div>
            </div>

            {/* Glitch Flash on Jackpot */}
            <AnimatePresence>
              {isJackpot && (
                <motion.div 
                  className="absolute inset-0 z-30 bg-pink-500/30 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 1, 0, 0.5, 0] }}
                  transition={{ duration: 0.6, repeat: 2 }}
                />
              )}
            </AnimatePresence>

            {/* Reel Cylinder */}
            <div className="h-[180px] w-full flex flex-col justify-center items-center relative" style={{ perspective: '1000px' }}>
              {[-2, -1, 0, 1, 2].map((offset) => {
                const idx = reelIndex + offset;
                const item = reelTape[idx] || reelTape[0];
                const isCenter = offset === 0;
                const isFinalStop = !isSpinning || reelIndex >= 30;
                const levelStyle = item.type === 'TILE' ? getHexLevelStyle(item.level) : { bg: '', border: '', text: '' };

                return (
                  <motion.div
                    key={idx} // <--- ИСПРАВЛЕНО ЗДЕСЬ (обратно на idx)
                    animate={{
                      y: offset * 54,
                      scale: isCenter ? (isFinalStop ? 1.05 : 1.0) : 0.8,
                      opacity: isCenter ? 1 : Math.abs(offset) === 1 ? 0.35 : 0,
                      rotateX: offset * 32,
                      z: isCenter ? 40 : 0,
                    }}
                    transition={
                      isFinalStop 
                        ? { type: "spring", stiffness: 220, damping: 16 } 
                        : { duration: spinDuration, ease: "linear" }
                    }
                    className={`absolute w-full px-2 h-[50px] flex items-center justify-center ${
                      isSpinning && !isCenter && spinDuration < 0.1 ? 'blur-md opacity-20' : spinDuration < 0.2 && !isCenter ? 'blur-sm' : ''
                    }`}
                    style={{ transformStyle: 'preserve-3d' }}
                  >
                    {/* Data Cell Item */}
                    <div className={`w-full h-full flex items-center justify-between px-3.5 rounded-lg border transition-all font-mono ${
                      isCenter 
                        ? item.type === 'SP' 
                          ? 'bg-gradient-to-r from-pink-950 via-purple-900 to-pink-950 border-pink-400 shadow-[0_0_25px_rgba(236,72,153,0.8)]' 
                          : `${levelStyle.bg} ${levelStyle.border} shadow-[0_0_20px_rgba(34,211,238,0.4)]`
                        : 'bg-slate-900/60 border-slate-700/60'
                    }`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-md flex items-center justify-center font-black text-xs border shrink-0 ${
                          isCenter 
                            ? item.type === 'SP' ? 'bg-pink-500 border-pink-300 text-white' : `${levelStyle.bg} ${levelStyle.border} ${levelStyle.text}` 
                            : 'bg-slate-800 border-slate-600 text-slate-400'
                        }`}>
                          {item.type === 'SP' ? <Unlock className="w-4 h-4" /> : `L${item.level}`}
                        </div>
                        <div className="flex flex-col text-left min-w-0">
                          <span className={`text-xs font-black uppercase tracking-wider truncate ${
                            isCenter ? (item.type === 'SP' ? 'text-pink-200' : levelStyle.text) : 'text-slate-400'
                          }`}>
                            {item.type === 'SP' ? `+${item.spCount} SP` : `+${item.count} ${language === 'RU' ? 'ПЛИТ' : 'TILES'}`}
                          </span>
                          <span className="text-[9px] text-slate-400 uppercase flex items-center gap-1 font-mono">
                            <Layers className="w-2.5 h-2.5 shrink-0" />
                            {item.type === 'SP' ? 'CRITICAL BREACH' : `NODE L${item.level}`}
                          </span>
                        </div>
                      </div>
                      {isCenter && (
                        <Hexagon className={`w-4 h-4 shrink-0 ${item.type === 'SP' ? 'text-pink-400' : 'text-cyan-400'} animate-pulse`} />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Result Console */}
          <AnimatePresence>
            {!isSpinning && lastReward && (
              <motion.div
                initial={{ opacity: 0, y: 10, filter: 'blur(8px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, filter: 'blur(8px)' }}
                transition={{ duration: 0.3 }}
                className={`w-full p-3 rounded-xl border mb-4 text-center font-mono relative overflow-hidden ${
                  lastReward.type === 'SP'
                    ? 'bg-pink-950/40 border-pink-500 text-pink-300 shadow-[0_0_20px_rgba(236,72,153,0.3)]'
                    : `${getHexLevelStyle(lastReward.level).bg} ${getHexLevelStyle(lastReward.level).border}`
                }`}
              >
                <div className="text-[10px] uppercase tracking-[0.3em] text-slate-400 mb-1">
                  {language === 'RU' ? '// СИСТЕМНЫЙ ОТВЕТ' : '// SYSTEM RESPONSE'}
                </div>
                <div className={`text-base font-black flex items-center justify-center gap-2 ${lastReward.type === 'SP' ? 'text-pink-200' : getHexLevelStyle(lastReward.level).text}`}>
                  {lastReward.type === 'SP' ? <AlertTriangle className="w-5 h-5 text-pink-400" /> : <Hexagon className="w-5 h-5" />}
                  {lastReward.type === 'SP' 
                    ? `+${lastReward.spCount} SP ACQUIRED` 
                    : `+${lastReward.count} TILES (L${lastReward.level})`}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hack Button */}
          <motion.button
            onClick={initiateHack}
            disabled={isSpinning || skillPoints < 1}
            whileTap={{ scale: 0.96 }}
            className={`relative w-full py-3.5 px-6 rounded-xl font-black font-mono text-sm tracking-[0.2em] uppercase flex items-center justify-center gap-2.5 transition-all z-10 overflow-hidden group border cursor-pointer ${
              isSpinning
                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                : skillPoints < 1
                ? 'bg-slate-900 text-red-500/50 border-red-900 cursor-not-allowed'
                : 'bg-cyan-950/50 text-cyan-300 border-cyan-500/50 hover:bg-cyan-900/50 hover:border-cyan-400 hover:text-white hover:shadow-[0_0_30px_rgba(34,211,238,0.4)]'
            }`}
          >
            {/* Scanline sweep */}
            {!isSpinning && skillPoints >= 1 && (
              <span className="absolute inset-0 h-full w-1/3 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent -translate-x-[200%] group-hover:translate-x-[300%] transition-transform duration-1000 ease-out"></span>
            )}
            {isOverloading ? <AlertTriangle className="w-5 h-5 text-red-400 animate-pulse" /> : <RefreshCw className={`w-5 h-5 ${isSpinning ? 'animate-spin' : ''}`} />}
            <span className="relative z-10">
              {isSpinning 
                ? (language === 'RU' ? 'ВЗЛОМ...' : 'HACKING...') 
                : (language === 'RU' ? 'ВЗЛОМАТЬ (1 SP)' : 'HACK (1 SP)')}
            </span>
          </motion.button>
        </motion.div>

        {/* Matrix Explosion Particles */}
        <AnimatePresence>
          {isJackpot && (
            <div className="absolute inset-0 z-[45] pointer-events-none flex items-center justify-center"> {/* <--- ИСПРАВЛЕНО ЗДЕСЬ (z-[45]) */}
              {particles.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{ x: p.x, y: p.y, scale: [0, 1.5, 0], opacity: [1, 1, 0], rotate: 180 }}
                  transition={{ duration: 1.2, delay: p.delay, ease: "easeOut" }}
                  className="absolute bg-pink-400"
                  style={{ width: p.size, height: p.size, boxShadow: '0 0 10px #ec4899' }}
                />
              ))}
            </div>
          )}
        </AnimatePresence>

      </motion.div>
    </AnimatePresence>
  );
};