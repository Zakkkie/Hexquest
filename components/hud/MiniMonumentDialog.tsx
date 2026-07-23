
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Terminal } from 'lucide-react';

interface MiniMonumentDialogProps {
  isOpen: boolean;
  hint: string | undefined;
  onClose: () => void;
}

export const MiniMonumentDialog: React.FC<MiniMonumentDialogProps> = ({ isOpen, hint, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="absolute inset-0 z-[150] flex items-center justify-center p-4 pointer-events-auto">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />
          <motion.div 
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl md:rounded-3xl p-6 md:p-7 w-[90vw] max-w-lg text-center relative z-20 group overflow-hidden"
          >
            {/* Glowing top accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600/30 via-amber-500/60 to-amber-600/30" />

            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800/60 transition-all cursor-pointer">
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>

            <div className="text-[9px] font-bold text-amber-400/80 tracking-wider uppercase mb-1 flex items-center justify-center gap-1.5">
              <Terminal className="w-3.5 h-3.5" /> MONUMENT_TRANSLATION
            </div>
            <h3 className="text-lg md:text-xl font-extrabold text-slate-100 uppercase tracking-wider mb-3">MINI MONUMENT</h3>
            
            <p className="text-slate-300 text-sm leading-relaxed italic font-mono whitespace-pre-line mb-6 bg-slate-900/60 border border-slate-800/80 p-4 rounded-xl">
              {hint}
            </p>

            <button 
              onClick={onClose} 
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold rounded-xl uppercase tracking-wider text-xs transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              CLOSE
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
