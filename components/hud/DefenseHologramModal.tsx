import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldAlert, ShieldCheck, Zap, Bot, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export interface DefenseHologramModalProps {
  isOpen: boolean;
  language: 'RU' | 'EN';
  onConfirm: () => void;
}

export const DefenseHologramModal: React.FC<DefenseHologramModalProps> = ({
  isOpen,
  language,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const isRU = language === 'RU';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] pointer-events-auto flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          transition={{ type: 'spring', stiffness: 220, damping: 24 }}
          className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#0c0f17] p-6 shadow-2xl text-slate-100"
        >
          {/* Subtle Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-cyan-500/80" />
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center gap-4 mb-5 border-b border-slate-900 pb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
              <ShieldAlert className="h-5 w-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-500 uppercase block mb-0.5">
                {isRU ? 'ТАКТИЧЕСКИЙ ИНСТРУКТАЖ' : 'TACTICAL BRIEFING'}
              </span>
              <h2 className="text-base font-black tracking-wide text-white font-mono uppercase">
                {isRU ? 'ВЕРТИКАЛЬНАЯ ЗАЩИТА ЯДРА' : 'VERTICAL CORE DEFENSE'}
              </h2>
            </div>
          </div>

          {/* Diagram Illustration Container */}
          <div className="relative my-4 overflow-hidden rounded-xl border border-slate-800 bg-[#07090e] p-4">
            {/* Fine Grid Overlay */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#111726_1px,transparent_1px),linear-gradient(to_bottom,#111726_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />

            <div className="relative z-10 grid grid-cols-2 gap-4 text-center">
              {/* Scenario 1: L0 Threat */}
              <div className="flex flex-col items-center justify-center rounded-xl bg-red-950/15 p-4 border border-red-950">
                <span className="text-[9.5px] font-mono text-red-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 font-bold">
                  <ShieldAlert className="h-3 w-3 text-red-500" />
                  {isRU ? 'Уровень L0 (Угроза)' : 'Tier L0 (Threat)'}
                </span>
                
                {/* Graphic Visual */}
                <div className="relative my-3 flex h-24 w-full items-center justify-center">
                  <div className="absolute bottom-2 h-2.5 w-16 rounded-sm bg-slate-800 border border-slate-700" />
                  <div className="absolute bottom-4.5 flex h-6 w-9 items-center justify-center rounded bg-amber-500/90 text-[9px] font-black text-slate-950 shadow-md">
                    CORE
                  </div>
                  {/* Bot path */}
                  <motion.div
                    animate={{ x: [-22, -2, -22] }}
                    transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut" }}
                    className="absolute bottom-4.5 left-2 flex items-center text-red-500"
                  >
                    <Bot className="h-4 w-4" />
                    <Zap className="h-3 w-3 text-red-500 animate-ping absolute -right-2" />
                  </motion.div>
                </div>

                <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                  {isRU
                    ? 'Враги на одном уровне атакуют Ядро без препятствий!'
                    : 'Enemies at ground level strike the Core without obstruction!'}
                </p>
              </div>

              {/* Scenario 2: L1 Defense */}
              <div className="flex flex-col items-center justify-center rounded-xl bg-cyan-950/10 p-4 border border-cyan-950">
                <span className="text-[9.5px] font-mono text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 font-bold">
                  <ShieldCheck className="h-3 w-3 text-cyan-400" />
                  {isRU ? 'Уровень L1 (Высота)' : 'Tier L1 (Elevated)'}
                </span>

                {/* Graphic Visual */}
                <div className="relative my-3 flex h-24 w-full items-center justify-center">
                  {/* Ground support */}
                  <div className="absolute bottom-1.5 h-2.5 w-20 rounded-sm bg-slate-800 border border-slate-700" />
                  {/* Raised Core */}
                  <div className="absolute bottom-4 h-7 w-12 rounded bg-cyan-400/95 flex flex-col items-center justify-center text-[9px] font-black text-slate-950 shadow-md">
                    <span>L1</span>
                    <span className="text-[8px] opacity-90 tracking-tighter">CORE</span>
                  </div>
                  {/* Bot blocked */}
                  <div className="absolute bottom-1.5 left-1 flex items-center text-slate-600">
                    <Bot className="h-4 w-4" />
                  </div>
                  {/* Energy barrier */}
                  <div className="absolute bottom-4 left-6.5 h-7 w-0.5 rounded bg-cyan-400 animate-pulse" />
                </div>

                <p className="text-[10.5px] text-slate-400 font-sans leading-relaxed">
                  {isRU
                    ? 'Подъем Ядра над землей блокирует прямые атаки!'
                    : 'Raising the Core above ground level blocks direct attacks!'}
                </p>
              </div>
            </div>
          </div>

          {/* Explanation text */}
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium mb-6">
            {isRU
              ? 'Для абсолютной безопасности Ядра от осадных ботов вы должны увеличивать его высоту. Плиты L1 дают вам непревзойденное тактическое превосходство. Улучшите Ядро прямо сейчас!'
              : 'To secure the Core from siege bots, you must elevate it. L1 plates give you unmatched tactical superiority. Upgrade the Core matrix now!'}
          </p>

          {/* Confirm Button */}
          <div className="flex justify-end pt-2 border-t border-slate-900">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onConfirm}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              <CheckCircle2 className="h-4 w-4 stroke-[2.5]" />
              <span>{isRU ? 'ПОНЯТНО' : 'GOT IT'}</span>
            </motion.button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
