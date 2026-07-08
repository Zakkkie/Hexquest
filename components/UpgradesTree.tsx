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

    // Static dictionaries to prevent Tailwind compile omitting-by-interpolation issues
    const glowGradients: Record<string, string> = {
        cyan: 'from-cyan-500/10 hover:from-cyan-500/20 shadow-[0_0_20px_rgba(34,211,238,0.05)]',
        emerald: 'from-emerald-500/10 hover:from-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.05)]',
        purple: 'from-purple-500/10 hover:from-purple-500/20 shadow-[0_0_20px_rgba(192,132,252,0.05)]',
        pink: 'from-pink-500/10 hover:from-pink-500/20 shadow-[0_0_20px_rgba(244,114,182,0.05)]',
        indigo: 'from-indigo-500/10 hover:from-indigo-500/20 shadow-[0_0_20px_rgba(129,140,248,0.05)]',
        amber: 'from-amber-500/10 hover:from-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.05)]',
        orange: 'from-orange-500/10 hover:from-orange-500/20 shadow-[0_0_20px_rgba(251,146,60,0.05)]',
        teal: 'from-teal-500/10 hover:from-teal-500/20 shadow-[0_0_20px_rgba(45,212,191,0.05)]',
        red: 'from-red-500/10 hover:from-red-500/20 shadow-[0_0_20px_rgba(248,113,113,0.05)]',
        blue: 'from-blue-500/10 hover:from-blue-500/20 shadow-[0_0_20px_rgba(96,165,250,0.05)]',
        stone: 'from-stone-500/10 hover:from-stone-500/20 shadow-[0_0_20px_rgba(168,162,158,0.05)]',
        yellow: 'from-yellow-500/10 hover:from-yellow-500/20 shadow-[0_0_20px_rgba(250,204,21,0.05)]',
        fuchsia: 'from-fuchsia-500/10 hover:from-fuchsia-500/20 shadow-[0_0_20px_rgba(232,121,249,0.05)]',
        violet: 'from-violet-500/10 hover:from-violet-500/20 shadow-[0_0_20px_rgba(167,139,250,0.05)]',
        sky: 'from-sky-500/10 hover:from-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.05)]',
        lime: 'from-lime-500/10 hover:from-lime-500/20 shadow-[0_0_20px_rgba(163,230,53,0.05)]',
        rose: 'from-rose-500/10 hover:from-rose-500/20 shadow-[0_0_20px_rgba(251,113,133,0.05)]',
    };

    const glowCircles: Record<string, string> = {
        cyan: 'bg-cyan-500/5',
        emerald: 'bg-emerald-500/5',
        purple: 'bg-purple-500/5',
        pink: 'bg-pink-500/5',
        indigo: 'bg-indigo-500/5',
        amber: 'bg-amber-500/5',
        orange: 'bg-orange-500/5',
        teal: 'bg-teal-500/5',
        red: 'bg-red-500/5',
        blue: 'bg-blue-500/5',
        stone: 'bg-stone-500/5',
        yellow: 'bg-yellow-500/5',
        fuchsia: 'bg-fuchsia-500/5',
        violet: 'bg-violet-500/5',
        sky: 'bg-sky-500/5',
        lime: 'bg-lime-500/5',
        rose: 'bg-rose-500/5',
    };

    const hoverBorders: Record<string, string> = {
        cyan: 'group-hover:border-cyan-400/30',
        emerald: 'group-hover:border-emerald-400/30',
        purple: 'group-hover:border-purple-400/30',
        pink: 'group-hover:border-pink-400/30',
        indigo: 'group-hover:border-indigo-400/30',
        amber: 'group-hover:border-amber-400/30',
        orange: 'group-hover:border-orange-400/30',
        teal: 'group-hover:border-teal-400/30',
        red: 'group-hover:border-red-400/30',
        blue: 'group-hover:border-blue-400/30',
        stone: 'group-hover:border-stone-400/30',
        yellow: 'group-hover:border-yellow-400/30',
        fuchsia: 'group-hover:border-fuchsia-400/30',
        violet: 'group-hover:border-violet-400/30',
        sky: 'group-hover:border-sky-400/30',
        lime: 'group-hover:border-lime-400/30',
        rose: 'group-hover:border-rose-400/30',
    };

    const glowTexts: Record<string, string> = {
        cyan: 'text-cyan-400',
        emerald: 'text-emerald-400',
        purple: 'text-purple-400',
        pink: 'text-pink-400',
        indigo: 'text-indigo-400',
        amber: 'text-amber-400',
        orange: 'text-orange-400',
        teal: 'text-teal-400',
        red: 'text-red-400',
        blue: 'text-blue-400',
        stone: 'text-stone-400',
        yellow: 'text-yellow-400',
        fuchsia: 'text-fuchsia-400',
        violet: 'text-violet-400',
        sky: 'text-sky-400',
        lime: 'text-lime-400',
        rose: 'text-rose-400',
    };

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
        description: string | ((lvl: number) => string),
        icon: React.ReactNode, 
        amountPerUpgrade: number, 
        _cost: number, 
        colorClass: string,
        maxLevel?: number,
        delay: number = 0
    ) => {
        const currentValue = (upgrades[key] as number) || 0;
        let baseline = 0;
        if (key === 'inventorySlots') baseline = 3;
        if (key === 'maxMaterials') baseline = 3;

        const level = Math.floor((currentValue - baseline) / amountPerUpgrade);

        // Calculate progressive and ranked dynamic cost based on importance of the upgrade
        const getUpgradeCost = (k: typeof key, lvl: number): number => {
            // Tier S: Extremely Rare / High value
            if (k === 'inventorySlots') {
                return 5 * (lvl + 1); // 5, 10, 15, 20, 25 SP
            }
            if (k === 'startingEnergy') {
                return 3 * (lvl + 1); // 3, 6, 9, 12, 15, 18, 21, 24, 27, 30 SP
            }
            if (k === 'maxMaterials') {
                return 2 * (lvl + 1); // 2, 4, 6... up to 40 SP
            }
            if (k === 'startingGold') {
                return 2 * (lvl + 1); // 2, 4, 6... up to 20 SP
            }

            // Tier A: Rare / High Utility
            if (k === 'startingMoves') {
                return 2 + lvl; // 2, 3, 4, 5, 6 SP
            }
            if (k === 'startingMaterials') {
                return 2 + Math.floor(lvl / 2); // 2, 2, 3, 3, 4, 4, 5, 5, 6, 6 SP
            }
            if (['fuelEfficiency', 'scanRadius', 'fatigueResistance', 'growthAccelerator', 'diggerLuck', 'doubleDigChance', 'reserveCapacitor', 'turboRecharge', 'entropyResistance', 'restorationMaster', 'contrastHighlighting'].includes(k as string)) {
                if (k === 'contrastHighlighting') return 5;
                const base = (k === 'growthAccelerator' || k === 'diggerLuck' || k === 'turboRecharge') ? 3 : 2;
                return base * (lvl + 1);
            }

            // Tier B: Common
            return 1 + lvl; // 1, 2, 3... SP
        };

        const dynamicCost = getUpgradeCost(key, level);

        const getCumulativeSpent = (k: typeof key, lvl: number): number => {
            let sum = 0;
            for (let i = 0; i < lvl; i++) {
                sum += getUpgradeCost(k, i);
            }
            return sum;
        };

        const spentSP = getCumulativeSpent(key, level);

        const isMaxed = maxLevel !== undefined && level >= maxLevel;
        const canAfford = skillPoints >= dynamicCost;
        const glowColor = colorClass.match(/text-([a-z]+)-400/)?.[1] || 'indigo';

        const resolvedDescription = typeof description === 'function' ? description(level + 1) : description;

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
                 onClick={() => !isMaxed && handleUpgrade(key, amountPerUpgrade, dynamicCost)}
            >
                 {/* Card Background */}
                 <div className={`absolute inset-0 bg-slate-900/40 backdrop-blur-lg border border-white/5 transition-all duration-300 rounded-2xl md:rounded-[1.5rem] overflow-hidden
                    ${canAfford && !isMaxed ? 'group-hover:bg-slate-800/80 group-hover:border-white/20' : 'bg-slate-900/20'}
                 `} />

                 {/* Glowing Gradient Accent */}
                 {canAfford && !isMaxed && (
                     <div className={`absolute inset-0 bg-gradient-to-br ${glowGradients[glowColor] || 'from-indigo-500/10'} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl md:rounded-[1.5rem] overflow-hidden`} />
                 )}
                 <div className={`absolute -top-4 -right-4 w-24 h-24 ${glowCircles[glowColor] || 'bg-indigo-500/5'} blur-[30px] rounded-full pointer-events-none group-hover:opacity-100 transition-opacity duration-500`} />

                 <div className="relative z-10 flex flex-col h-full gap-1.5 md:gap-3">
                     {/* Header Section: Icon & Title & Level */}
                     <div className="flex items-start gap-2 md:gap-3">
                         <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl bg-slate-900 border border-slate-700/40 shadow-inner group-hover:${hoverBorders[glowColor] || 'border-indigo-400/30'} transition-all duration-300 shrink-0 ${colorClass}`}>
                             {React.cloneElement(icon as React.ReactElement<any>, { className: 'w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6' })}
                         </div>
                         <div className="min-w-0 flex-1">
                            <h3 className={`text-[9.5px] sm:text-[11px] md:text-xs lg:text-sm font-black uppercase tracking-wider leading-tight transition-colors duration-300 mb-1 line-clamp-1
                                ${canAfford && !isMaxed ? 'text-slate-100 group-hover:text-white' : 'text-slate-500'}
                            `}>
                                {label}
                            </h3>
                            <div className={`inline-flex items-center px-1 py-0.5 rounded border text-[7px] sm:text-[8px] md:text-[9.5px] font-mono tracking-tighter uppercase font-bold
                               ${isMaxed ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-slate-800/80 text-indigo-300/80 border-white/5 group-hover:border-white/10'}
                            `}>
                                LVL {level + 1} {isMaxed && '(MAX)'}
                            </div>
                         </div>
                     </div>

                     {/* Body Section: Description */}
                     <div className="flex-1">
                         <p className="text-[8.5px] sm:text-[10px] md:text-xs text-slate-400/80 font-medium leading-normal line-clamp-2 md:line-clamp-3">
                             {resolvedDescription}
                         </p>
                     </div>

                     {/* Bottom Footer: Stats & Cost */}
                     <div className="mt-auto flex items-center justify-between gap-1.5 pt-1.5 md:pt-3 border-t border-white/5 group-hover:border-white/10 transition-colors">
                        {/* Stats Preview */}
                        <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 bg-black/20 px-1.5 py-0.5 md:px-2 md:py-1 rounded-md border border-white/5">
                                <span className="text-[9px] sm:text-[11px] md:text-xs font-mono font-bold text-slate-400">{currentValue}</span>
                                {!isMaxed && (
                                    <>
                                        <TrendingUp className={`w-2 h-2 sm:w-2.5 sm:h-2.5 ${glowTexts[glowColor] || 'text-indigo-400'} opacity-60`} />
                                        <span className="text-[9px] sm:text-[11px] md:text-xs font-mono font-bold text-white drop-shadow-[0_0_5px_rgba(255,255,255,0.3)]">
                                            {currentValue + amountPerUpgrade}
                                        </span>
                                    </>
                                )}
                            </div>
                            <div className="text-[7.5px] sm:text-[8.5px] md:text-[9.5px] font-mono text-slate-500 uppercase">
                                {language === 'RU' ? 'Потрачено:' : 'Spent:'} {spentSP} SP
                            </div>
                        </div>

                        {/* Upgrade Cost Button */}
                        {!isMaxed && (
                            <div className={`px-2 py-0.5 md:px-3 md:py-1 rounded-md md:rounded-lg border text-[9px] sm:text-[10px] md:text-xs font-black tracking-tight transition-all duration-300
                                ${canAfford ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 group-hover:bg-indigo-500 group-hover:text-white group-hover:border-white/20' : 'bg-slate-800/40 text-slate-600 border-slate-700/40'}
                            `}>
                                {dynamicCost} SP
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
            className="absolute inset-0 z-[10050] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/95 backdrop-blur-xl"
        >
            {/* Background floating effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
               <div className="absolute top-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[150px]" />
               <div className="absolute bottom-[10%] right-[20%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.96, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: 15 }}
                transition={{ type: "spring", damping: 28, stiffness: 300 }}
                className="bg-slate-950 sm:border-2 sm:border-indigo-500/40 w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-6xl sm:rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.25)] flex flex-col relative z-10 overflow-hidden group"
            >
                {/* Cyber Corner Brackets */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />

                {/* Scanline Effect */}
                <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />

                {/* Header with Title and Skill Points: Notched-safe and beautiful layout */}
                <div className="pt-[calc(env(safe-area-inset-top)+12px)] sm:pt-4 px-3 sm:px-5 pb-3 flex items-center justify-between border-b border-indigo-500/30 bg-slate-950 shrink-0 relative z-20 gap-2">
                    <div className="flex items-center gap-2 md:gap-4 pl-1 min-w-0">
                        <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className="bg-indigo-500/15 p-1.5 rounded-lg border border-indigo-500/35 shrink-0">
                                    <Layers className="w-4 h-4 text-indigo-400" />
                                </div>
                                <h2 className="text-xs xs:text-sm sm:text-base md:text-lg lg:text-xl font-black uppercase text-white tracking-[0.1em] sm:tracking-[0.15em] leading-none drop-shadow-md truncate">
                                    {language === 'RU' ? 'Узлы Развития' : 'Development Nodes'}
                                </h2>
                            </div>
                            <p className="hidden sm:block text-indigo-400/50 text-[8px] font-mono tracking-[0.4em] uppercase ml-11 mt-1 leading-none">Exp_Protocol_v2.1</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 md:gap-3 pr-1 shrink-0">
                        {/* Lean SP Badge: Tighter padding on mobile to save screen width */}
                        <div className="flex items-center gap-1.5 xs:gap-2 bg-slate-900/60 border border-indigo-500/20 rounded-lg px-1.5 py-0.5 xs:px-2 xs:py-1 md:px-3 md:py-2 transition-all shadow-inner">
                            <div className="flex flex-col items-center leading-none">
                                <span className="text-[5px] xs:text-[6px] md:text-[7px] text-indigo-400/85 font-black uppercase leading-none">Skill</span>
                                <span className="text-[5px] xs:text-[6px] md:text-[7px] text-indigo-400/85 font-black uppercase leading-none">Points</span>
                            </div>
                            <div className="w-[1px] h-3.5 bg-indigo-500/25 mx-0.5" />
                            <span className="text-xs xs:text-sm md:text-xl font-black text-white font-mono leading-none tracking-tighter drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">{skillPoints}</span>
                        </div>

                        <button onClick={onClose} className="p-1.5 md:p-2 bg-slate-800/40 hover:bg-red-500/20 group rounded-lg border border-white/5 transition-all transform hover:scale-110 active:scale-95 cursor-pointer shrink-0">
                            <X className="w-4 h-4 md:w-5 md:h-5 text-slate-500 group-hover:text-red-400 group-active:text-red-500 transition-colors" />
                        </button>
                    </div>
                </div>

                {/* Grid layout shifts dynamically: 2 columns on mobile/medium, and up to 5 on desktop */}
                <div className="p-3 sm:p-5 md:p-6 lg:p-8 pb-[calc(env(safe-area-inset-bottom)+20px)] sm:pb-6 overflow-y-auto no-scrollbar grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 md:gap-4 relative z-10 flex-1 content-start">
                    {renderNode('startingEnergy', language === 'RU' ? 'Энергия' : 'Energy', language === 'RU' ? 'Базовый запас энергии на старте' : 'Base starting energy', <BatteryCharging />, 1, 1, 'text-cyan-400', 10, 0.05)}
                    {renderNode('startingMoves', language === 'RU' ? 'Ходы' : 'Moves', language === 'RU' ? 'Свободные очки перемещения' : 'Free movement points', <TrendingUp />, 1, 1, 'text-emerald-400', 5, 0.08)}
                    {renderNode('startingMaterials', language === 'RU' ? 'Материя' : 'Matter', language === 'RU' ? 'Запас материалов на старте' : 'Starting materials stock', <Layers />, 1, 1, 'text-purple-400', 10, 0.11)}
                    {renderNode('maxMaterials', language === 'RU' ? 'Склад' : 'Storage', language === 'RU' ? 'Вместимость грузового отсека' : 'Cargo bay capacity', <Box />, 1, 1, 'text-pink-400', 20, 0.14)}
                    {renderNode('startingGold', language === 'RU' ? 'Золото' : 'Credits', language === 'RU' ? 'Капитал для торговли' : 'Trading capital', <Coins />, 5, 1, 'text-amber-400', 10, 0.17)}
                    {renderNode('inventorySlots', language === 'RU' ? 'Рюкзак' : 'Backpack', language === 'RU' ? 'Ячейки для артефактов' : 'Slots for artifacts', <Gem />, 1, 3, 'text-indigo-400', 5, 0.2)}
                    {renderNode('fuelEfficiency', language === 'RU' ? 'Топливо' : 'Fuel', language === 'RU' ? 'Снижение стоимости хода' : 'Movement cost reduction', <Gauge />, 1, 2, 'text-orange-400', 2, 0.23)}
                    {renderNode('scanRadius', language === 'RU' ? 'Радар' : 'Radar', language === 'RU' ? 'Дистанция обзора (Fog of War)' : 'Vision range (Fog of War)', <Radar />, 1, 2, 'text-teal-400', 2, 0.26)}
                    {renderNode('fatigueResistance', language === 'RU' ? 'Стойкость' : 'Endurance', language === 'RU' ? 'Защита от штрафов усталости' : 'Protection against fatigue', <Shield />, 1, 2, 'text-red-400', 2, 0.29)}
                    {renderNode('growthAccelerator', language === 'RU' ? 'Синтез' : 'Synthesis', language === 'RU' ? 'Скорость стройки объектов' : 'Construction speed', <Clock />, 1, 3, 'text-blue-400', 2, 0.32)}
                    {renderNode('foundationStrength', language === 'RU' ? 'Основа' : 'Foundation', language === 'RU' ? 'Прочность L1 гексов (Durability)' : 'L1 hex durability', <Layers />, 2, 1, 'text-stone-400', 2, 0.35)}
                    {renderNode('economicMultiplier', language === 'RU' ? 'Налоги' : 'Taxes', language === 'RU' ? 'Пассивный доход золота (%)' : 'Passive credits income (%)', <TrendingUp />, 10, 1, 'text-yellow-400', 5, 0.38)}
                    {renderNode('diggerLuck', language === 'RU' ? 'Удача' : 'Luck', language === 'RU' ? 'Шанс редкого лута при копке' : 'Rare loot chance on dig', <Star />, 1, 3, 'text-fuchsia-400', 2, 0.41)}
                    {renderNode('doubleDigChance', language === 'RU' ? 'Экстрактор' : 'Extractor', language === 'RU' ? 'Шанс 2x материи при копке (%)' : '2x gather chance (%)', <Copy />, 10, 2, 'text-violet-400', 3, 0.44)}
                    {renderNode('reserveCapacitor', language === 'RU' ? 'Заряд' : 'Battery', language === 'RU' ? 'Заряды восстановления L4+' : 'L4+ recovery charges', <Battery />, 1, 2, 'text-sky-400', 2, 0.47)}
                    {renderNode('turboRecharge', language === 'RU' ? 'Турбо' : 'Turbo', language === 'RU' ? 'Кулдаун энергетики L4+' : 'L4+ recharge cooldown', <Zap />, 5, 3, 'text-lime-400', 1, 0.5)}
                    {renderNode('entropyResistance', language === 'RU' ? 'Стабильность' : 'Stability', language === 'RU' ? 'Снижение роста энтропии (%)' : 'Entropy growth reduction (%)', <Infinity />, 10, 2, 'text-rose-400', 3, 0.53)}
                    {renderNode('restorationMaster', language === 'RU' ? 'Ремонт' : 'Repair', language === 'RU' ? 'Шанс восстановления Бездны (%)' : 'Void structural repair chance (%)', <Wrench />, 10, 2, 'text-amber-500', 3, 0.56)}
                    {renderNode('contrastHighlighting', language === 'RU' ? 'Подсветка' : 'Highlight', (lvl) => language === 'RU' ? `Отображает контурную сияющую сетку для схем до ${lvl * 20} фигур (уровень ${lvl})` : `Displays glowing outline grid for setups of up to ${lvl * 20} shapes (Level ${lvl})`, <Star />, 1, 5, 'text-pink-400', 10, 0.59)}
                </div>
            </motion.div>
        </motion.div>
        </AnimatePresence>
    );
};
