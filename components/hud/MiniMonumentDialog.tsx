
import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles } from 'lucide-react';

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
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="bg-slate-900 border border-amber-500/50 p-6 rounded-xl shadow-2xl max-w-sm w-full text-center relative z-20"
          >
            <button onClick={onClose} className="absolute top-3 right-3 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-full bg-amber-950 flex items-center justify-center mx-auto mb-4 border border-amber-500/50">
                <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-4">MINI MONUMENT</h3>
            <p className="text-slate-300 text-sm italic whitespace-pre-line mb-6">
                {hint}
            </p>
            <button onClick={onClose} className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded uppercase tracking-wider text-xs">
              CLOSE
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
