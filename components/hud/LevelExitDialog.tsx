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
                        className="bg-slate-950/45 backdrop-blur-xl border border-red-500/25 p-5 md:p-8 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.15)] w-[92vw] max-w-[380px] md:max-w-md text-center relative overflow-hidden z-20 group"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Glowing neon top stripe */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600/30 via-red-500/60 to-red-600/30 pointer-events-none" />

                        {/* Scanline pattern overlay */}
                        <div className="absolute inset-0 bg-scanlines opacity-[0.06] pointer-events-none" />

                        {/* Tech Corner notches */}
                        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-red-500/50 pointer-events-none" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-red-500/50 pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-red-500/50 pointer-events-none" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-red-500/50 pointer-events-none" />

                        {/* Interactive sweeping laser scan effect */}
                        <motion.div
                            animate={{ y: [-10, 420, -10] }}
                            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
                            className="absolute left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-red-500/65 to-transparent shadow-[0_0_8px_rgba(239,68,68,0.7)] pointer-events-none"
                        />

                        {/* Ambient floating glowing dust particles */}
                        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
                            {particles.map((p) => (
                                <motion.div
                                    key={p.id}
                                    style={{
                                        position: 'absolute',
                                        left: `calc(50% + ${p.x}%)`,
                                        top: `calc(50% + ${p.y}%)`,
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        backgroundColor: '#ef4444',
                                        boxShadow: '0 0 6px #f43f5e'
                                    }}
                                    animate={{
                                        y: [0, -150, 0],
                                        opacity: [0.1, 0.8, 0.1],
                                        scale: [p.scale, p.scale * 1.5, p.scale]
                                    }}
                                    transition={{
                                        duration: p.duration,
                                        repeat: Infinity,
                                        delay: p.delay,
                                        ease: "easeInOut"
                                    }}
                                />
                            ))}
                        </div>

                        {/* Warning holographic status tag */}
                        <div className="flex justify-center items-center gap-1.5 mb-5 select-none">
                            <Cpu className="w-3.5 h-3.5 text-red-500/75 animate-pulse" />
                            <span className="text-[10px] font-mono font-black text-red-400/90 uppercase tracking-[0.2em] bg-red-950/40 px-2 py-0.5 border border-red-500/25 rounded-md">
                                [{text.code}]
                            </span>
                        </div>

                        {/* Main holographic warning icon */}
                        <div className="relative w-16 h-16 mx-auto mb-4">
                            {/* Double pulsing ring */}
                            <motion.div 
                                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                                className="absolute inset-0 rounded-2xl border-2 border-red-500/30"
                            />
                            <motion.div 
                                animate={{ scale: [1, 1.15, 1] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                                className="absolute inset-0 rounded-2xl border border-red-500/50"
                            />
                            <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-red-950/40 to-slate-900 border border-red-500/30 flex items-center justify-center shadow-lg shadow-red-950/30">
                                <ShieldAlert className="w-8 h-8 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.7)]" />
                            </div>
                        </div>

                        {/* Title & Description with glowing effect */}
                        <h3 className="text-xl md:text-2xl font-black font-mono text-white uppercase mb-2.5 tracking-tight break-words whitespace-pre-wrap select-none drop-shadow-[0_0_12px_rgba(255,255,255,0.15)]">
                            {text.title}
                        </h3>
                        <p className="text-xs md:text-sm text-slate-400 mb-7 leading-relaxed px-1 md:px-3 break-words whitespace-pre-wrap font-sans select-none">
                            {text.desc}
                        </p>

                        {/* Unified Action buttons */}
                        <div className="flex flex-col gap-3 relative z-10">
                            {/* Abort button (Primary) */}
                            <motion.button
                                whileHover={{ scale: 1.02, filter: "brightness(1.1)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleConfirm}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black uppercase text-xs tracking-wider transition-all shadow-[0_4px_20px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_rgba(239,68,68,0.65)] border border-red-400/30 cursor-pointer flex items-center justify-center gap-2"
                            >
                                <LogOut className="w-4 h-4" />
                                <span>{text.confirm}</span>
                            </motion.button>

                            {/* Cancel button (Secondary) */}
                            <motion.button
                                whileHover={{ scale: 1.02, backgroundColor: "rgba(30, 41, 59, 0.9)" }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleClose}
                                className="w-full py-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 font-bold uppercase text-[10px] tracking-widest transition-all cursor-pointer shadow-inner"
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
