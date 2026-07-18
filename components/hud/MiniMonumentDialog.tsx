
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
            className="bg-slate-950/45 backdrop-blur-xl border border-amber-500/25 p-5 md:p-6 rounded-2xl shadow-[0_0_50px_rgba(245,158,11,0.15)] w-[90vw] max-w-sm text-center relative z-20 group overflow-hidden"
          >
            {/* Cyber Corner Brackets */}
            <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-amber-500/50" />
            <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-amber-500/50" />
            <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-amber-500/50" />
            <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-amber-500/50" />

            {/* Glowing top accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600/30 via-amber-500/60 to-amber-600/30" />

            <button onClick={onClose} className="absolute top-3.5 right-3.5 text-slate-500 hover:text-white cursor-pointer transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 rounded-xl bg-amber-950/30 flex items-center justify-center mx-auto mb-4 border border-amber-500/30 shadow-lg shadow-amber-950/40">
              <Sparkles className="w-6 h-6 text-amber-500 animate-pulse" />
            </div>

            <div className="text-[8px] font-mono font-black text-amber-500/60 tracking-[0.2em] uppercase mb-1 flex items-center justify-center gap-1">
              <Terminal className="w-3 h-3" /> MONUMENT_TRANSLATION
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-3">MINI MONUMENT</h3>
            
            <p className="text-slate-300 text-xs md:text-sm italic font-mono whitespace-pre-line mb-6 bg-slate-950/30 border border-slate-800/40 p-4 rounded-xl leading-relaxed">
              {hint}
            </p>

            <button 
              onClick={onClose} 
              className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg uppercase tracking-[0.2em] text-xs transition-all active:scale-95 shadow-lg shadow-amber-950/40 cursor-pointer border border-amber-500/30"
            >
              CLOSE
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
