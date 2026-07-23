import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, ShieldAlert, Cpu } from 'lucide-react';

interface LevelExitDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    mode?: 'GAME' | 'SANDBOX' | 'EDITOR';
    language: 'RU' | 'EN';
    playUiSound?: (sound: any) => void;
}

export const LevelExitDialog: React.FC<LevelExitDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    mode = 'GAME',
    language,
    playUiSound
}) => {
    // Localization
    const text = useMemo(() => {
        if (mode === 'SANDBOX') {
            return {
                title: language === 'RU' ? 'ПОКИНУТЬ ПОЛИГОН?' : 'LEAVE SANDBOX?',
                desc: language === 'RU' 
                    ? 'Выйти из режима проектирования? Все неэкспортированные геометрические чертежи и конфигурации плит будут безвозвратно стерты из буфера.' 
                    : 'Leave sandbox design mode? Any unexported geometric blueprints and tile layouts will be permanently cleared from active memory.',
                confirm: language === 'RU' ? 'ВЫЙТИ В МЕНЮ' : 'EXIT TO MENU',
                cancel: language === 'RU' ? 'ВЕРНУТЬСЯ К ПРОЕКТИРОВАНИЮ' : 'BACK TO WORKSPACE',
                code: 'SYS_SANDBOX_ABORT_WARN'
            };
        }
        if (mode === 'EDITOR') {
            return {
                title: language === 'RU' ? 'ВЫЙТИ ИЗ РЕДАКТОРА?' : 'EXIT LEVEL EDITOR?',
                desc: language === 'RU' 
                    ? 'Все неэкспортированные структуры, триггеры и измененная топология карты будут потеряны при прерывании сессии.' 
                    : 'All unexported structures, custom triggers, and modified map topologies will be lost upon session termination.',
                confirm: language === 'RU' ? 'ПОДТВЕРДИТЬ ВЫХОД' : 'CONFIRM EXIT',
                cancel: language === 'RU' ? 'ПРОДОЛЖИТЬ РЕДАКТИРОВАНИЕ' : 'CONTINUE EDITING',
                code: 'SYS_MAP_EDITOR_ABORT_WARN'
            };
        }
        return {
            title: language === 'RU' ? 'ПРЕРВАТЬ СВЯЗЬ?' : 'ABORT CONNECTION?',
            desc: language === 'RU' 
                ? 'Прервать текущую симуляцию сектора? Все накопленные в этом заходе ресурсы и несохраненный прогресс будут безвозвратно дезинтегрированы.' 
                : 'Abort current sector simulation? All accumulated resources and unsaved progress from this run will be permanently disintegrated.',
            confirm: language === 'RU' ? 'ПРЕРВАТЬ СВЯЗЬ' : 'ABORT CONNECTION',
            cancel: language === 'RU' ? 'ОТМЕНА' : 'CANCEL',
            code: 'SYS_SECTOR_ABORT_WARN'
        };
    }, [mode, language]);

    // Handle button clicks with sound
    const handleClose = () => {
        if (playUiSound) playUiSound('CLICK');
        onClose();
    };

    const handleConfirm = () => {
        if (playUiSound) playUiSound('CLICK');
        onConfirm();
    };

    // Particles array for ambient neon embers floating inside the modal
    const particles = useMemo(() => {
        return Array.from({ length: 12 }).map((_, i) => ({
            id: i,
            x: Math.random() * 100 - 50, // relative percentage offset
            y: Math.random() * 100 - 50,
            scale: Math.random() * 0.6 + 0.4,
            duration: Math.random() * 10 + 10,
            delay: Math.random() * -10
        }));
    }, []);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="absolute inset-0 z-[500] flex items-center justify-center p-4 pointer-events-auto">
                    {/* Dark glassmorphism background overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-black/85 backdrop-blur-md z-10"
                    />

                    {/* Futuristic warning dialog panel */}
                    <motion.div
                        initial={{ scale: 0.9, y: 30, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 30, opacity: 0 }}
                        transition={{ type: "spring", damping: 25, stiffness: 220 }}
                        className="bg-slate-950/90 backdrop-blur-2xl border border-slate-800/80 shadow-[0_20px_50px_rgba(0,0,0,0.8)] rounded-2xl md:rounded-3xl p-6 md:p-8 w-[92vw] max-w-md text-center relative overflow-hidden z-20 group"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Glowing top stripe */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-600/30 via-rose-500/60 to-rose-600/30 pointer-events-none" />

                        {/* Scanline pattern overlay */}
                        <div className="absolute inset-0 bg-scanlines opacity-[0.04] pointer-events-none" />

                        {/* Warning holographic status tag */}
                        <div className="flex justify-center items-center gap-1.5 mb-4 select-none">
                            <Cpu className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                            <span className="text-[10px] font-mono font-bold text-rose-400 uppercase tracking-wider bg-rose-950/40 px-2.5 py-1 border border-rose-800/60 rounded-lg">
                                [{text.code}]
                            </span>
                        </div>

                        {/* Main holographic warning icon */}
                        <div className="relative w-14 h-14 mx-auto mb-4">
                            <div className="absolute inset-0 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                                <ShieldAlert className="w-7 h-7 text-rose-400" />
                            </div>
                        </div>

                        {/* Title & Description */}
                        <h3 className="text-xl md:text-2xl font-extrabold uppercase tracking-wider text-slate-100 mb-2.5">
                            {text.title}
                        </h3>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6 px-1 md:px-2">
                            {text.desc}
                        </p>

                        {/* Unified Action buttons */}
                        <div className="flex flex-col gap-3 relative z-10">
                            {/* Abort button (Danger) */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleConfirm}
                                className="w-full py-3.5 bg-rose-950/40 border border-rose-800/60 text-rose-300 hover:bg-rose-900/60 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>{text.confirm}</span>
                            </motion.button>

                            {/* Cancel button (Secondary) */}
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleClose}
                                className="w-full py-3.5 bg-slate-900/80 border border-slate-700/60 hover:bg-slate-800 text-slate-200 rounded-xl font-bold uppercase tracking-wider text-xs transition-all cursor-pointer"
                            >
                                {text.cancel}
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
