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
        description: string,
        icon: React.ReactNode, 
        amountPerUpgrade: number, 
        cost: number, 
        colorClass: string,
        maxLevel?: number,
        delay: number = 0
    ) => {
        const currentValue = upgrades[key];
        let baseline = 0;
        if (key === 'inventorySlots') baseline = 3;
        if (key === 'maxMaterials') baseline = 3;

        const level = Math.floor((currentValue - baseline) / amountPerUpgrade);
        const isMaxed = maxLevel !== undefined && level >= maxLevel;
        const canAfford = skillPoints >= cost;
        const glowColor = colorClass.match(/text-([a-z]+)-400/)?.[1] || 'indigo';

        return (
            <motion.div 
                 initial={{ opacity: 0, y: 30, scale: 0.95 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{ delay, duration: 0.5, type: 'spring', stiffness: 200, damping: 20 }}
                 whileHover={!isMaxed && canAfford ? { scale: 1.04, y: -4 } : { scale: 1.01 }}
                 whileTap={!isMaxed && canAfford ? { scale: 0.97 } : {}}
                 className={`group relative flex flex-col p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden transition-all duration-500
                    ${canAfford && !isMaxed ? 'cursor-pointer hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]' : 'opacity-80 grayscale-[30%] cursor-not-allowed'}
                 `}
                 onClick={() => !isMaxed && handleUpgrade(key, amountPerUpgrade, cost)}
            >
                 {/* Card Background */}
                 <div className={`absolute inset-0 bg-slate-900/50 backdrop-blur-md border border-white/5 transition-all duration-500
                    ${canAfford && !isMaxed ? 'group-hover:bg-slate-800/60 group-hover:border-white/20' : 'bg-slate-900/30'}
                 `} />

                 {/* Glowing Gradient Accent */}
                 {canAfford && !isMaxed && (
                     <div className={`absolute inset-0 bg-gradient-to-br from-${glowColor}-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none`} />
                 )}
                 <div className={`absolute top-0 right-0 w-32 h-32 bg-${glowColor}-500/20 blur-[50px] rounded-full pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity duration-500`} />

                 <div className="relative z-10 flex flex-col h-full">
                     {/* Top Section: Icon & Level */}
                     <div className="flex items-center justify-between mb-3 md:mb-4">
                         <div className="flex items-center gap-3 md:gap-4">
                             <div className={`flex items-center justify-center w-16 h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 shadow-inner group-hover:shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-all duration-500 shrink-0 -mt-4 pl-0 ml-0 ${colorClass}`}>
                                 {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-6 h-6 md:w-8 md:h-8 drop-shadow-lg' })}
                             </div>
                             <div className="-mt-[5px]">
                                <h3 className={`text-sm md:text-lg font-black uppercase tracking-widest leading-tight transition-colors duration-300 drop-shadow-md mb-1 mt-0
                                    ${canAfford && !isMaxed ? 'text-slate-100 group-hover:text-white' : 'text-slate-400'}
                                `}>
                                    {label}
                                </h3>
                                <div className={`inline-block px-2 md:px-3 py-0.5 rounded-full border text-[8px] md:text-[10px] font-mono tracking-widest uppercase font-bold
                                   ${isMaxed ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.3)]' : 'bg-black/30 text-slate-300 border-white/10 group-hover:border-white/20'}
                                `}>
                                    Ур. {level} {isMaxed && '(MAX)'}
                                </div>
                             </div>
                         </div>
                     </div>

                     {/* Middle Section: Description & Value */}
                     <div className="flex-1 mb-3 justify-center flex flex-col">
                         <p className="text-xs md:text-sm text-slate-400/90 font-medium leading-relaxed mb-4">
                             {description}
                         </p>
                         
                         <div className="flex items-center gap-2 md:gap-3 bg-black/30 p-2 md:p-3 rounded-xl border border-white/5 self-start">
                             <span className="text-base md:text-2xl font-mono font-black text-slate-200 drop-shadow-md px-2">{currentValue}</span>
                             {!isMaxed && (
                                 <div className="flex items-center gap-2 md:gap-3 opacity-80 group-hover:opacity-100 transition-all duration-300">
                                     <span className={`text-${glowColor}-400 font-bold`}>→</span>
                                     <span className="text-base md:text-2xl font-mono font-black text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] px-2">{currentValue + amountPerUpgrade}</span>
                                 </div>
                             )}
                         </div>
                     </div>

                     {/* Bottom Section: Cost */}
                     {!isMaxed && (
                         <div className="mt-auto pt-3 md:pt-4 border-t border-white/5 group-hover:border-white/10 transition-colors duration-500 flex justify-between items-center">
                             <span className="text-[10px] md:text-xs font-mono text-slate-400 uppercase tracking-widest">Стоимость:</span>
                             <div className={`px-4 md:px-6 py-1.5 md:py-2 rounded-full border text-[11px] md:text-sm font-black tracking-widest shadow-lg transition-all duration-500
                                 ${canAfford ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/30 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-indigo-400 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.6)]' : 'bg-red-500/10 text-red-400 border-red-500/20'}
                             `}>
                                 {cost} SP
                             </div>
                         </div>
                     )}
                 </div>
            </motion.div>
        );
    };

    return (
        <AnimatePresence>
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/80 backdrop-blur-xl"
        >
            {/* Background floating effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
               <div className="absolute top-[10%] left-[20%] w-[40%] h-[40%] rounded-full bg-indigo-600/30 blur-[120px] animate-pulse-subtle" />
               <div className="absolute bottom-[10%] right-[20%] w-[40%] h-[40%] rounded-full bg-cyan-600/20 blur-[120px] animate-pulse-subtle" style={{ animationDelay: '2s' }} />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 250 }}
                className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[85vh] rounded-[2rem] md:rounded-[3rem] shadow-[0_0_60px_rgba(0,0,0,0.8),inset_0_0_30px_rgba(255,255,255,0.02)] flex flex-col relative z-10"
            >
                {/* Close Button Mobile/Desktop Top Right */}
                <button onClick={onClose} className="absolute top-4 right-4 md:top-6 md:right-6 lg:top-8 lg:right-8 z-30 p-2.5 md:p-3 xl:p-4 bg-slate-800/80 backdrop-blur-md border-t border-white/10 hover:bg-slate-700 hover:border-white/20 rounded-xl md:rounded-full transition-all text-slate-400 hover:text-white shadow-[0_4px_15px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] group">
                    <X className="w-5 h-5 md:w-6 md:h-6 group-hover:rotate-90 transition-transform duration-300" />
                </button>

                <div className="p-4 pt-5 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center shrink-0 border-b border-white/5 relative z-20 gap-4 md:gap-0">
                    <div className="flex-1 pr-14 md:pr-0">
                        <h2 className="text-xl md:text-3xl lg:text-4xl font-black uppercase text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-100 to-indigo-400 tracking-[0.1em] md:tracking-[0.15em] leading-tight drop-shadow-[0_0_15px_rgba(99,102,241,0.4)] mb-1 md:mb-2">Узлы Развития</h2>
                        <div className="flex items-center gap-2 md:gap-3">
                            <div className="h-[2px] w-6 md:w-12 bg-gradient-to-r from-indigo-500 to-transparent"></div>
                            <p className="text-indigo-200/60 text-[9px] md:text-[11px] font-mono tracking-[0.2em] md:tracking-[0.3em] uppercase">Параметры игрока</p>
                        </div>
                    </div>
                    
                    <div className="flex w-full md:w-auto items-center justify-between md:justify-end gap-4 md:gap-8 md:pr-16">
                        <div className="flex items-center gap-4 bg-black/40 md:bg-transparent p-2 md:p-0 rounded-2xl md:rounded-none border border-white/5 md:border-none shadow-inner md:shadow-none backdrop-blur-md md:backdrop-blur-none w-full md:w-auto justify-between md:justify-end">
                            <span className="text-[10px] md:text-[11px] text-indigo-300 font-mono font-bold uppercase tracking-[0.15em] md:tracking-widest drop-shadow-md pl-2 md:pl-0">Skill Points</span>
                            <div className="flex items-center justify-center bg-indigo-500/10 border-t border-indigo-500/30 rounded-xl md:rounded-2xl px-4 py-2 md:px-5 md:py-3 shadow-[0_4px_20px_rgba(99,102,241,0.2),inset_0_0_15px_rgba(99,102,241,0.15)] relative overflow-hidden group">
                                <span className="text-xl md:text-3xl font-black text-white font-mono leading-none drop-shadow-[0_0_10px_rgba(255,255,255,0.6)] relative z-10">{skillPoints}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-8 overflow-y-auto no-scrollbar grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6 lg:gap-8 relative z-10 flex-1 content-start">
                    {renderNode('startingEnergy', 'Стартовая Энергия', 'Увеличивает базовый запас энергии на старте', <Zap />, 1, 1, 'text-cyan-400', 10, 0.1)}
                    {renderNode('startingMoves', 'Стартовые Ходы', 'Увеличивает количество доступных очков перемещения', <Star />, 1, 1, 'text-emerald-400', 5, 0.15)}
                    {renderNode('startingMaterials', 'Стартовая Материя', 'Запас материалов для строительства на старте', <Box />, 1, 1, 'text-purple-400', 10, 0.2)}
                    {renderNode('maxMaterials', 'Хранилище Материи', 'Максимальная вместимость грузового отсека для ресурсов', <Box />, 1, 1, 'text-pink-400', 20, 0.25)}
                    {renderNode('startingGold', 'Стартовое Золото', 'Базовый капитал для торговли и экстренных покупок', <Coins />, 5, 1, 'text-amber-400', 10, 0.3)}
                    {renderNode('inventorySlots', 'Слоты Инвентаря', 'Количество ячеек для хранения находимых артефактов', <Box />, 1, 3, 'text-indigo-400', 5, 0.35)}
                </div>
            </motion.div>
        </motion.div>
        </AnimatePresence>
    );
};
