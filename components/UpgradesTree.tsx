import React from 'react';
import { useGameStore } from '../store.ts';
import { Zap, Coins, Box, Star, X, Gauge, Radar, Shield, Clock, Layers, TrendingUp, Gem, Copy, Battery, BatteryCharging, Infinity, Wrench } from 'lucide-react';
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
    const language = useGameStore(state => state.language);

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
                 initial={{ opacity: 0, y: 20, scale: 0.98 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 transition={{ delay, duration: 0.4, type: 'spring', stiffness: 260, damping: 25 }}
                 whileHover={!isMaxed && canAfford ? { scale: 1.02, y: -2 } : { scale: 1.01 }}
                 whileTap={!isMaxed && canAfford ? { scale: 0.98 } : {}}
                 className={`group relative flex flex-col p-3 md:p-4 rounded-2xl md:rounded-[1.5rem] transition-all duration-300 h-full
                    ${canAfford && !isMaxed ? 'cursor-pointer hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]' : 'opacity-85 grayscale-[20%] cursor-not-allowed'}
                 `}
                 onClick={() => !isMaxed && handleUpgrade(key, amountPerUpgrade, cost)}
            >
                 {/* Card Background */}
                 <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-lg border border-white/5 transition-all duration-300 rounded-2xl md:rounded-[1.5rem] overflow-hidden
                    ${canAfford && !isMaxed ? 'group-hover:bg-slate-800/80 group-hover:border-white/20' : 'bg-slate-900/20'}
                 `} />

                 {/* Glowing Gradient Accent */}
                 {canAfford && !isMaxed && (
                     <div className={`absolute inset-0 bg-gradient-to-br from-${glowColor}-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl md:rounded-[1.5rem] overflow-hidden`} />
                 )}
                 <div className={`absolute -top-4 -right-4 w-24 h-24 bg-${glowColor}-500/10 blur-[30px] rounded-full pointer-events-none group-hover:opacity-100 transition-opacity duration-500`} />

                 <div className="relative z-10 flex flex-col h-full gap-2">
                     {/* Header Section: Icon & Title & Level */}
                     <div className="flex items-start gap-2.5">
                         <div className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-slate-900 border border-slate-700/40 shadow-inner group-hover:border-${glowColor}-400/30 transition-all duration-300 shrink-0 ${colorClass}`}>
                             {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-5 h-5 md:w-6 md:h-6' })}
                         </div>
                         <div className="min-w-0 flex-1">
                            <h3 className={`text-[10px] md:text-[12px] font-black uppercase tracking-wider leading-tight transition-colors duration-300 mb-1 line-clamp-1
                                ${canAfford && !isMaxed ? 'text-slate-100 group-hover:text-white' : 'text-slate-500'}
                            `}>
                                {label}
                            </h3>
                            <div className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[8px] font-mono tracking-tighter uppercase font-bold
                               ${isMaxed ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800/80 text-indigo-300/80 border-white/5 group-hover:border-white/10'}
                            `}>
                                LVL {level} {isMaxed && '(MAX)'}
                            </div>
                         </div>
                     </div>

                     {/* Body Section: Description */}
                     <div className="flex-1">
                         <p className="text-[9px] md:text-[11px] text-slate-400/80 font-medium leading-normal line-clamp-2 md:line-clamp-3">
                             {description}
                         </p>
                     </div>

                     {/* Bottom Footer: Stats & Cost */}
                     <div className="mt-auto flex items-center justify-between gap-2 pt-2 border-t border-white/5 group-hover:border-white/10 transition-colors">
                        {/* Stats Preview */}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                                <span className="text-[10px] md:text-xs font-mono font-bold text-slate-400">{currentValue}</span>
                                {!isMaxed && (
                                    <>
                                        <TrendingUp className={`w-2.5 h-2.5 text-${glowColor}-400 opacity-60`} />
                                        <span className="text-[10px] md:text-xs font-mono font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                                            {currentValue + amountPerUpgrade}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="text-[8px] font-mono text-slate-500 uppercase">
                                {language === 'RU' ? 'Потрачено:' : 'Spent:'} {level * cost} SP
                            </div>
                        </div>

                        {/* Upgrade Cost Button */}
                        {!isMaxed && (
                            <div className={`px-2.5 py-1 rounded-lg border text-[10px] md:text-[11px] font-black tracking-tight transition-all duration-300
                                ${canAfford ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-white/20' : 'bg-slate-800/40 text-slate-600 border-slate-700/40'}
                            `}>
                                {cost} SP
                            </div>
                        )}
                     </div>
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
            className="absolute inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/90 backdrop-blur-2xl"
        >
            {/* Background floating effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
               <div className="absolute top-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[150px]" />
               <div className="absolute bottom-[10%] right-[20%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 10 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 w-full max-w-6xl h-[95vh] md:h-auto md:max-h-[85vh] rounded-3xl md:rounded-[2.5rem] shadow-[0_0_80px_rgba(0,0,0,0.9)] flex flex-col relative z-10 overflow-hidden"
            >
                {/* Header with Title and Skill Points */}
                <div className="p-2.5 md:p-3 lg:p-4 flex items-center justify-between border-b border-white/5 relative z-20">
                    <div className="flex items-center gap-3 md:gap-4 pl-1">
                        <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                                <div className="bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/20">
                                    <Layers className="w-3.5 h-3.5 md:w-4 md:h-4 text-indigo-400" />
                                </div>
                                <h2 className="text-base md:text-lg lg:text-xl font-black uppercase text-white tracking-[0.15em] leading-none drop-shadow-md">Узлы Развития</h2>
                            </div>
                            <p className="hidden sm:block text-indigo-300/20 text-[7px] md:text-[8px] font-mono tracking-[0.4em] uppercase ml-9 mt-0.5">Exp_Protocol_v2.1</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 pr-1">
                        {/* Lean SP Badge */}
                        <div className="flex items-center gap-2.5 bg-slate-900/60 border border-indigo-500/20 rounded-lg px-2.5 py-1.5 md:px-3 md:py-2 transition-all shadow-inner">
                            <div className="flex flex-col items-center leading-none">
                                <span className="text-[6px] md:text-[7px] text-indigo-400/80 font-black uppercase">Skill</span>
                                <span className="text-[6px] md:text-[7px] text-indigo-400/80 font-black uppercase">Points</span>
                            </div>
                            <div className="w-[1px] h-4 bg-indigo-500/20 mx-0.5" />
                            <span className="text-base md:text-xl font-black text-white font-mono leading-none tracking-tighter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">{skillPoints}</span>
                        </div>

                        <button onClick={onClose} className="p-1.5 md:p-2 bg-slate-800/40 hover:bg-red-500/20 group rounded-lg border border-white/5 transition-all active:scale-95">
                            <X className="w-4 h-4 md:w-5 md:h-5 text-slate-500 group-hover:text-red-400 group-active:text-red-500 transition-colors" />
                        </button>
                    </div>
                </div>

                <div className="p-4 md:p-6 lg:p-8 overflow-y-auto no-scrollbar grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4 relative z-10 flex-1 content-start">
                    {renderNode('startingEnergy', 'Энергия', 'Базовый запас энергии на старте', <BatteryCharging />, 1, 1, 'text-cyan-400', 10, 0.05)}
                    {renderNode('startingMoves', 'Ходы', 'Свободные очки перемещения', <TrendingUp />, 1, 1, 'text-emerald-400', 5, 0.08)}
                    {renderNode('startingMaterials', 'Материя', 'Запас материалов на старте', <Layers />, 1, 1, 'text-purple-400', 10, 0.11)}
                    {renderNode('maxMaterials', 'Склад', 'Вместимость грузового отсека', <Box />, 1, 1, 'text-pink-400', 20, 0.14)}
                    {renderNode('startingGold', 'Золото', 'Капитал для торговли', <Coins />, 5, 1, 'text-amber-400', 10, 0.17)}
                    {renderNode('inventorySlots', 'Рюкзак', 'Ячейки для артефактов', <Gem />, 1, 3, 'text-indigo-400', 5, 0.2)}
                    {renderNode('fuelEfficiency', 'Топливо', 'Снижение стоимости хода', <Gauge />, 1, 2, 'text-orange-400', 2, 0.23)}
                    {renderNode('scanRadius', 'Радар', 'Дистанция обзора (Fog of War)', <Radar />, 1, 2, 'text-teal-400', 2, 0.26)}
                    {renderNode('fatigueResistance', 'Стойкость', 'Защита от штрафов усталости', <Shield />, 1, 2, 'text-red-400', 2, 0.29)}
                    {renderNode('growthAccelerator', 'Синтез', 'Скорость стройки объектов', <Clock />, 1, 3, 'text-blue-400', 2, 0.32)}
                    {renderNode('foundationStrength', 'Основа', 'Прочность L1 гексов (Durability)', <Layers />, 2, 1, 'text-stone-400', 2, 0.35)}
                    {renderNode('economicMultiplier', 'Налоги', 'Пассивный доход золота (%)', <TrendingUp />, 10, 1, 'text-yellow-400', 5, 0.38)}
                    {renderNode('diggerLuck', 'Удача', 'Шанс редкого лута при копке', <Star />, 1, 3, 'text-fuchsia-400', 2, 0.41)}
                    {renderNode('doubleDigChance', 'Экстрактор', 'Шанс 2x материи при копке (%)', <Copy />, 10, 2, 'text-violet-400', 3, 0.44)}
                    {renderNode('reserveCapacitor', 'Заряд', 'Заряды восстановления L4+', <Battery />, 1, 2, 'text-sky-400', 2, 0.47)}
                    {renderNode('turboRecharge', 'Турбо', 'Кулдаун энергетики L4+', <Zap />, 5, 3, 'text-lime-400', 1, 0.5)}
                    {renderNode('entropyResistance', 'Стабильность', 'Снижение роста энтропии (%)', <Infinity />, 10, 2, 'text-rose-400', 3, 0.53)}
                    {renderNode('restorationMaster', 'Ремонт', 'Шанс восстановления Бездны (%)', <Wrench />, 10, 2, 'text-amber-500', 3, 0.56)}
                </div>
            </motion.div>
        </motion.div>
        </AnimatePresence>
    );
};
