import React from 'react';
import { useGameStore } from '../store.ts';
import { Zap, Coins, Box, Star, X } from 'lucide-react';

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

        return (
            <div className={`flex flex-col items-center bg-slate-900/60 border border-slate-700/50 p-4 rounded-2xl ${skillPoints >= cost && !isMaxed ? 'hover:bg-slate-800/80 cursor-pointer hover:border-indigo-500/50' : 'opacity-80'}`}
                 onClick={() => !isMaxed && handleUpgrade(key, amountPerUpgrade, cost)}>
                <div className={`p-4 rounded-full mb-3 shadow-lg ${colorClass}`}>
                    {icon}
                </div>
                <h3 className="font-black uppercase tracking-wider text-sm mb-1 text-slate-200 text-center">{label}</h3>
                <div className="text-[10px] text-slate-400 font-mono uppercase tracking-widest mb-3">
                    Ур. {level} {isMaxed ? '(МАКС)' : ''}
                </div>
                
                <div className="bg-slate-950/50 rounded-lg p-2 w-full text-center mb-3 text-xs text-indigo-300 font-mono">
                    {currentValue} {isMaxed ? '' : `→ ${currentValue + amountPerUpgrade}`}
                </div>

                {!isMaxed && (
                    <div className={`text-xs font-black px-3 py-1.5 rounded-full ${skillPoints >= cost ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
                        {cost} SP
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="absolute inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-slate-950 border border-slate-700 w-full max-w-4xl max-h-[95vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                <div className="bg-slate-900/50 border-b border-slate-800 p-4 md:p-6 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg md:text-2xl font-black uppercase text-white tracking-widest leading-tight">Узлы Развития</h2>
                        <p className="text-slate-400 text-[10px] md:text-xs font-mono mt-1">Оптимизация параметров экспедиции</p>
                    </div>
                    <div className="flex items-center gap-3 md:gap-6">
                        <div className="flex flex-col items-end">
                            <span className="text-[8px] md:text-[10px] text-slate-500 font-black uppercase tracking-widest">Skill Points</span>
                            <span className="text-xl md:text-2xl font-black text-indigo-400 font-mono leading-none">{skillPoints}</span>
                        </div>
                        <button onClick={onClose} className="p-1.5 md:p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                <div className="p-4 md:p-8 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                    {renderNode('startingEnergy', 'Ст. Энергия', <Zap className="w-5 h-5 md:w-6 md:h-6"/>, 1, 1, 'bg-cyan-500/20 text-cyan-400', 10)}
                    {renderNode('startingMoves', 'Ст. Ходы', <Star className="w-5 h-5 md:w-6 md:h-6"/>, 1, 1, 'bg-emerald-500/20 text-emerald-400', 5)}
                    {renderNode('startingMaterials', 'Ст. Материя', <Box className="w-5 h-5 md:w-6 md:h-6"/>, 1, 1, 'bg-purple-500/20 text-purple-400', 10)}
                    {renderNode('maxMaterials', 'Объем Материи', <Box className="w-5 h-5 md:w-6 md:h-6"/>, 1, 1, 'bg-pink-500/20 text-pink-400', 20)}
                    {renderNode('startingGold', 'Ст. Золото', <Coins className="w-5 h-5 md:w-6 md:h-6"/>, 5, 1, 'bg-amber-500/20 text-amber-400', 10)}
                    {renderNode('inventorySlots', 'Инвентарь', <Box className="w-5 h-5 md:w-6 md:h-6"/>, 1, 3, 'bg-indigo-500/20 text-indigo-400', 5)}
                </div>
            </div>
        </div>
    );
};
