import React from 'react';
import { useGameStore } from '../store.ts';
import { Zap, Coins, Box, Star, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  onClose: () => void;
}

// Градация улучшения должна быть такой, что редко игрок может выбрать:
// - объём плюс один к объёму материалов
// - плюс пять к золоту
// - плюс один к энергии
// - и тоже крайне редко плюс один к инвентарю.

export const UpgradesTree: React.FC<Props> = ({ onClose }) => {
    const upgrades = useGameStore(state => state.campaignUpgrades);
    const skillPoints = useGameStore(state => state.skillPoints);
    const updateUpgrades = useGameStore(state => state.updateCampaignUpgrades);
    const setSkillPoints = useGameStore(state => state.setSkillPoints);
    const playSound = useGameStore(state => state.playUiSound);

    const handleUpgrade = (key: keyof typeof upgrades, amount: number, cost: number) => {
        if (skillPoints >= cost) {
            playSound('SUCCESS');
            setSkillPoints(skillPoints - cost);
            updateUpgrades({ [key]: upgrades[key] + amount });
        } else {
            playSound('ERROR');
        }
    };

    const renderNode = (
        key: keyof typeof upgrades, 
        label: string, 
        icon: React.ReactNode, 
        amountPerUpgrade: number, 
        cost: number, 
        colorClass: string,
        maxLevel?: number
    ) => {
        const currentValue = upgrades[key];
        // Calculate level based on baseline
        let baseline = 0;
        if (key === 'inventorySlots') baseline = 3;
        if (key === 'maxMaterials') baseline = 3;

        const level = Math.floor((currentValue - baseline) / amountPerUpgrade);
        const isMaxed = maxLevel !== undefined && level >= maxLevel;
        const canAfford = skillPoints >= cost;

        return (
            <motion.div 
                 whileHover={!isMaxed && canAfford ? { scale: 1.02, y: -2 } : {}}
                 whileTap={!isMaxed && canAfford ? { scale: 0.98 } : {}}
                 className={`flex flex-col items-center bg-slate-900/60 backdrop-blur-md border border-slate-700/50 p-2 md:p-4 rounded-xl md:rounded-2xl transition-all relative overflow-hidden ${canAfford && !isMaxed ? 'hover:bg-slate-800/80 cursor-pointer hover:border-indigo-400 hover:shadow-[0_0_20px_rgba(99,102,241,0.2)]' : 'opacity-80 grayscale-[20%]'}`}
                 onClick={() => !isMaxed && handleUpgrade(key, amountPerUpgrade, cost)}>
                <div className={`p-2.5 md:p-4 rounded-full mb-2 md:mb-3 shadow-[0_0_15px_rgba(255,255,255,0.1)] ${colorClass}`}>
                    {icon}
                </div>
                <h3 className="font-black uppercase tracking-wider text-[11px] md:text-sm mb-0.5 md:mb-1 text-slate-200 text-center leading-tight min-h-[22px] md:min-h-0 flex items-center justify-center">{label}</h3>
                <div className="text-[9px] md:text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-2 md:mb-3">
                    Ур. {level} {isMaxed ? '(МАКС)' : ''}
                </div>
                
                <div className="bg-slate-950/50 border border-slate-800/50 rounded-lg p-1.5 md:p-2 w-full text-center mb-0 md:mb-3 text-[10px] md:text-xs text-indigo-300 font-mono shadow-inner">
                    {currentValue} {isMaxed ? '' : <><span className="text-slate-500 mx-1">→</span><span className="text-white">{currentValue + amountPerUpgrade}</span></>}
                </div>

                {!isMaxed && (
                    <div className={`absolute top-0 right-0 rounded-bl-xl md:static text-[10px] md:text-xs font-black px-2 md:px-3 py-1 md:py-1.5 shadow-md ${canAfford ? 'bg-indigo-600/90 text-white shadow-[0_2px_10px_rgba(99,102,241,0.4)] md:rounded-full' : 'bg-slate-800/90 text-slate-400 border-b border-l md:border border-slate-700/50 md:rounded-full'}`}>
                        {cost} SP
                    </div>
                )}
            </motion.div>
        );
    };

    return (
        <AnimatePresence>
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-md"
        >
            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="bg-slate-950/80 backdrop-blur-xl border border-indigo-500/30 w-full max-w-4xl max-h-[95vh] rounded-2xl md:rounded-[2rem] shadow-[0_0_50px_rgba(0,0,0,0.6),inset_0_0_20px_rgba(99,102,241,0.1)] overflow-hidden flex flex-col"
            >
                <div className="bg-slate-900/50 border-b border-indigo-500/20 p-3 md:p-6 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-base md:text-2xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-br from-white to-indigo-300 tracking-widest leading-tight drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">Узлы Развития</h2>
                        <p className="text-indigo-300/70 text-[9px] md:text-xs font-mono mt-0.5 tracking-widest uppercase">Оптимизация параметров экспедиции</p>
                    </div>
                    <div className="flex items-center gap-2 md:gap-6">
                        <div className="flex flex-col items-end px-3 md:px-4 py-1 md:py-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl shadow-[inset_0_0_10px_rgba(99,102,241,0.1)]">
                            <span className="text-[8px] md:text-[10px] text-indigo-400 font-black uppercase tracking-widest">Skill Points</span>
                            <span className="text-lg md:text-2xl font-black text-white font-mono leading-none drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{skillPoints}</span>
                        </div>
                        <button onClick={onClose} className="p-1 md:p-2 bg-slate-800/40 border border-slate-700/50 hover:bg-slate-700/60 hover:border-slate-500 rounded-full transition-colors text-slate-400 hover:text-white shadow-sm">
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-3 md:p-8 overflow-y-auto no-scrollbar grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 bg-slate-950/40">
                    {renderNode('startingEnergy', 'Ст. Энергия', <Zap className="w-5 h-5 md:w-6 md:h-6"/>, 1, 1, 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30', 10)}
                    {renderNode('startingMoves', 'Ст. Ходы', <Star className="w-5 h-5 md:w-6 md:h-6"/>, 1, 1, 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30', 5)}
                    {renderNode('startingMaterials', 'Ст. Материя', <Box className="w-5 h-5 md:w-6 md:h-6"/>, 1, 1, 'bg-purple-500/20 text-purple-400 border border-purple-500/30', 10)}
                    {renderNode('maxMaterials', 'Объем Материи', <Box className="w-5 h-5 md:w-6 md:h-6"/>, 1, 1, 'bg-pink-500/20 text-pink-400 border border-pink-500/30', 20)}
                    {renderNode('startingGold', 'Ст. Золото', <Coins className="w-5 h-5 md:w-6 md:h-6"/>, 5, 1, 'bg-amber-500/20 text-amber-400 border border-amber-500/30', 10)}
                    {renderNode('inventorySlots', 'Инвентарь', <Box className="w-5 h-5 md:w-6 md:h-6"/>, 1, 3, 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30', 5)}
                </div>
            </motion.div>
        </motion.div>
        </AnimatePresence>
    );
};
