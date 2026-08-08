import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trophy, ArrowRight, Star, ShieldCheck } from 'lucide-react';
import { audioService } from '../../services/audioService';

export interface StageRewardData {
  stage: number;
  totalStages: number;
  badge: string;
  titleRU: string;
  titleEN: string;
  subtitleRU: string;
  subtitleEN: string;
  rewardRU: string;
  rewardEN: string;
}

interface TutorialStageRewardModalProps {
  reward: StageRewardData | null;
  language: 'RU' | 'EN';
  onClose: () => void;
}

const FALLING_STARS = Array.from({ length: 28 }).map((_, i) => ({
  id: i,
  left: ((i * 13 + (i % 7) * 11) % 94) + 3,
  size: i % 4 === 0 ? 18 : i % 3 === 0 ? 14 : i % 2 === 0 ? 11 : 8,
  duration: 1.6 + (i % 5) * 0.5,
  delay: (i % 7) * 0.3,
  symbol: i % 4 === 0 ? '✦' : i % 3 === 0 ? '★' : i % 2 === 0 ? '✨' : '⭐',
  opacity: 0.45 + (i % 3) * 0.25,
}));

export const TutorialStageRewardModal: React.FC<TutorialStageRewardModalProps> = ({
  reward,
  language,
  onClose,
}) => {
  useEffect(() => {
    if (reward) {
      if (reward.stage === 3) {
        audioService.play('VICTORY');
        audioService.play('FIREWORK');
      } else {
        audioService.play('LEVEL_UP');
      }
    }
  }, [reward]);

  if (!reward) return null;

  const isFinal = reward.stage === reward.totalStages;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md select-none pointer-events-auto">
        {/* Golden Celebration Shockwave Wave */}
        <motion.div
          initial={{ scale: 0.2, opacity: 1 }}
          animate={{ scale: 3.5, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          className="absolute w-64 h-64 rounded-full border-4 border-amber-400/80 bg-gradient-to-r from-amber-500/30 to-yellow-400/10 blur-md pointer-events-none"
        />
        <motion.div
          initial={{ scale: 0.1, opacity: 0.9 }}
          animate={{ scale: 2.8, opacity: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
          className="absolute w-48 h-48 rounded-full border-2 border-yellow-300/70 pointer-events-none"
        />

        <motion.div
          initial={{ scale: 0.75, opacity: 0, y: 24 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: -20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 280 }}
          className="relative w-full max-w-md bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-2 border-amber-400/80 rounded-3xl p-6 md:p-7 shadow-[0_0_60px_rgba(245,158,11,0.5)] overflow-hidden text-center flex flex-col items-center"
        >
          {/* Animated background gold rays */}
          <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-amber-500/25 blur-3xl animate-pulse pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-yellow-500/20 blur-3xl animate-pulse pointer-events-none" />

          {/* Falling Golden Stars Cascading Particles Background */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {FALLING_STARS.map((s) => (
              <motion.div
                key={s.id}
                initial={{ y: -30, opacity: 0, scale: 0.5 }}
                animate={{
                  y: [-30, 420],
                  opacity: [0, s.opacity, s.opacity, 0],
                  scale: [0.5, 1.25, 0.9, 0.3],
                  rotate: [0, 180],
                }}
                transition={{
                  repeat: Infinity,
                  duration: s.duration,
                  delay: s.delay,
                  ease: 'linear',
                }}
                style={{ left: `${s.left}%`, fontSize: `${s.size}px` }}
                className="absolute text-amber-300 drop-shadow-[0_0_8px_rgba(245,158,11,0.85)] pointer-events-none select-none"
              >
                {s.symbol}
              </motion.div>
            ))}
          </div>

          {/* Badge Icon Header */}
          <div className="relative mb-4 flex items-center justify-center">
            <motion.div
              animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl shadow-2xl border-2 ${
                isFinal
                  ? 'bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 border-amber-300 shadow-amber-500/60 text-slate-950'
                  : 'bg-gradient-to-br from-amber-950 via-slate-900 to-slate-950 border-amber-400/90 shadow-amber-500/40 text-amber-300'
              }`}
            >
              {reward.stage === 1 && <Star className="w-10 h-10 text-amber-300 fill-amber-300 animate-bounce" />}
              {reward.stage === 2 && <ShieldCheck className="w-10 h-10 text-amber-300 fill-amber-400/30 animate-pulse" />}
              {reward.stage === 3 && <Trophy className="w-11 h-11 text-amber-950 fill-amber-300" />}
            </motion.div>

            {/* Stage Progress Pill */}
            <div className="absolute -bottom-2.5 px-3 py-0.5 rounded-full bg-slate-950 border border-amber-400/90 text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase shadow-[0_0_12px_rgba(245,158,11,0.6)]">
              {language === 'RU' ? `ЭТАП ${reward.stage} ИЗ ${reward.totalStages}` : `STAGE ${reward.stage} OF ${reward.totalStages}`}
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-300 tracking-tight uppercase mb-1.5 mt-2">
            {language === 'RU' ? reward.titleRU : reward.titleEN}
          </h2>

          {/* Subtitle */}
          <p className="text-xs md:text-sm text-slate-300 font-sans leading-relaxed mb-4 max-w-xs">
            {language === 'RU' ? reward.subtitleRU : reward.subtitleEN}
          </p>

          {/* Reward Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15 }}
            className="w-full bg-slate-950/80 border border-amber-400/60 rounded-2xl p-3.5 mb-5 flex items-center justify-center gap-2.5 shadow-[inset_0_0_20px_rgba(245,158,11,0.15)]"
          >
            <Sparkles className="w-5 h-5 text-amber-400 shrink-0 animate-spin" />
            <span className="text-xs md:text-sm font-mono font-extrabold text-amber-300 uppercase tracking-wide">
              {language === 'RU' ? reward.rewardRU : reward.rewardEN}
            </span>
          </motion.div>

          {/* Progress Bar Dots */}
          <div className="flex items-center gap-2 mb-5">
            {[1, 2, 3].map((step) => (
              <div
                key={step}
                className={`h-2 rounded-full transition-all duration-300 ${
                  step <= reward.stage
                    ? 'w-8 bg-gradient-to-r from-amber-400 to-yellow-400 shadow-[0_0_12px_rgba(245,158,11,0.9)]'
                    : 'w-2 bg-slate-800'
                }`}
              />
            ))}
          </div>

          {/* Continue Button */}
          <button
            onClick={() => {
              audioService.play('UI_CLICK');
              onClose();
            }}
            className="w-full py-3 px-6 rounded-xl font-black text-xs md:text-sm uppercase tracking-widest transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2"
          >
            <span>{language === 'RU' ? 'ПРОДОЛЖИТЬ' : 'CONTINUE'}</span>
            <ArrowRight className="w-4 h-4 text-slate-950" />
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
