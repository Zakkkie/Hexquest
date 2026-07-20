import React, { useMemo, useCallback } from 'react';
import { useGameStore } from '../store.ts';
import { 
    Zap, Coins, Box, Star, X, Gauge, Radar, Shield, 
    Clock, Layers, TrendingUp, Gem, Copy, Battery, 
    BatteryCharging, Infinity as InfinityIcon, Wrench 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CampaignUpgrades } from '../types.ts';

interface Props {
    onClose: () => void;
}

// ---------------------------------------------------------------------
// STATICS & HELPERS
// ---------------------------------------------------------------------

const getUpgradeCost = (key: string, level: number): number => {
    if (key === 'inventorySlots') return 5 * (level + 1);
    if (key === 'startingEnergy') return 3 * (level + 1);
    if (key === 'maxMaterials') return 2 * (level + 1);
    if (key === 'startingGold') return 2 * (level + 1);
    if (key === 'startingMoves') return 2 + level;
    if (key === 'startingMaterials') return 2 + Math.floor(level / 2);
    if ([
        'fuelEfficiency', 'scanRadius', 'fatigueResistance', 'growthAccelerator', 
        'diggerLuck', 'doubleDigChance', 'reserveCapacitor', 'turboRecharge', 
        'entropyResistance', 'restorationMaster', 'contrastHighlighting'
    ].includes(key)) {
        if (key === 'contrastHighlighting') return 5;
        const base = (key === 'growthAccelerator' || key === 'diggerLuck' || key === 'turboRecharge') ? 3 : 2;
        return base * (level + 1);
    }
    return 1 + level;
};

type SectorId = 'generation' | 'matter' | 'integrity' | 'synthesis';

interface SectorConfig {
    id: SectorId;
    labelRU: string;
    labelEN: string;
    descRU: string;
    descEN: string;
    color: string;
    icon: React.FC<any>;
    keys: readonly (keyof CampaignUpgrades)[];
}

const SECTORS: SectorConfig[] = [
    {
        id: 'generation',
        labelRU: 'ЯДРО ГЕНЕРАЦИИ',
        labelEN: 'GENERATION CORE',
        descRU: 'Управление пусковой мощностью, энергией, ходами и кулдаунами батарей.',
        descEN: 'Controls starting power, movement points, fuel flow, and recovery batteries.',
        color: 'cyan',
        icon: Zap,
        keys: ['startingEnergy', 'startingMoves', 'fuelEfficiency', 'reserveCapacitor', 'turboRecharge'] as const
    },
    {
        id: 'matter',
        labelRU: 'МАТРИЦА ВЕЩЕСТВА',
        labelEN: 'MATTER MATRIX',
        descRU: 'Увеличение лимитов хранения материи, стартовых кредитов, ячеек рюкзака и налогов.',
        descEN: 'Increases cargo capacity, initial materiel, trading capital, backpack space, and passive tax income.',
        color: 'purple',
        icon: Box,
        keys: ['startingMaterials', 'maxMaterials', 'startingGold', 'inventorySlots', 'doubleDigChance', 'economicMultiplier'] as const
    },
    {
        id: 'integrity',
        labelRU: 'СИСТЕМА СТАБИЛЬНОСТИ',
        labelEN: 'SHIELD INTEGRITY',
        descRU: 'Радиус сканера тумана войны, сопротивление усталости и сдерживание энтропии.',
        descEN: 'Extends radar sight range, counters fatigue penalties, and suppresses environmental entropy.',
        color: 'rose',
        icon: Shield,
        keys: ['scanRadius', 'fatigueResistance', 'entropyResistance', 'contrastHighlighting'] as const
    },
    {
        id: 'synthesis',
        labelRU: 'КУЗНЯ СИНТЕЗА',
        labelEN: 'SYNTHESIS FORGE',
        descRU: 'Калибровка скорости возведения объектов, прочности L1-ячеек и удачи при бурении.',
        descEN: 'Fine-tunes nanite construction rates, physical floor durability, and deep-vein salvage luck.',
        color: 'amber',
        icon: Wrench,
        keys: ['growthAccelerator', 'foundationStrength', 'diggerLuck', 'restorationMaster'] as const
    }
];

const sectorStyles: Record<SectorId, {
    bgActive: string;
    borderActive: string;
    textActive: string;
    shadowActive: string;
    progressFill: string;
    glowBg: string;
}> = {
    generation: {
        bgActive: 'bg-cyan-500/10',
        borderActive: 'border-cyan-500/50',
        textActive: 'text-cyan-400',
        shadowActive: 'shadow-[0_0_20px_rgba(34,211,238,0.2)] scale-[1.02]',
        progressFill: 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]',
        glowBg: 'from-cyan-500/10'
    },
    matter: {
        bgActive: 'bg-purple-500/10',
        borderActive: 'border-purple-500/50',
        textActive: 'text-purple-400',
        shadowActive: 'shadow-[0_0_20px_rgba(168,85,247,0.2)] scale-[1.02]',
        progressFill: 'bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]',
        glowBg: 'from-purple-500/10'
    },
    integrity: {
        bgActive: 'bg-rose-500/10',
        borderActive: 'border-rose-500/50',
        textActive: 'text-rose-400',
        shadowActive: 'shadow-[0_0_20px_rgba(244,63,94,0.2)] scale-[1.02]',
        progressFill: 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]',
        glowBg: 'from-rose-500/10'
    },
    synthesis: {
        bgActive: 'bg-amber-500/10',
        borderActive: 'border-amber-500/50',
        textActive: 'text-amber-400',
        shadowActive: 'shadow-[0_0_20px_rgba(245,158,11,0.2)] scale-[1.02]',
        progressFill: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]',
        glowBg: 'from-amber-500/10'
    }
};

interface UpgradeConfig {
    labelRU: string;
    labelEN: string;
    descRU: string | ((lvl: number) => string);
    descEN: string | ((lvl: number) => string);
    Icon: React.FC<{ className?: string }>;
    amountPerUpgrade: number;
    colorClass: string;
    maxLevel: number;
}

const UPGRADE_CONFIGS: Record<keyof CampaignUpgrades, UpgradeConfig> = {
    startingEnergy: {
        labelRU: 'Энергия', labelEN: 'Energy',
        descRU: 'Базовый запас энергии на старте', descEN: 'Base starting energy',
        Icon: BatteryCharging, amountPerUpgrade: 1, colorClass: 'text-cyan-400', maxLevel: 10
    },
    startingMoves: {
        labelRU: 'Ходы', labelEN: 'Moves',
        descRU: 'Свободные очки перемещения', descEN: 'Free movement points',
        Icon: TrendingUp, amountPerUpgrade: 1, colorClass: 'text-emerald-400', maxLevel: 5
    },
    startingMaterials: {
        labelRU: 'Материя', labelEN: 'Matter',
        descRU: 'Запас материалов на старте', descEN: 'Starting materials stock',
        Icon: Layers, amountPerUpgrade: 1, colorClass: 'text-purple-400', maxLevel: 10
    },
    maxMaterials: {
        labelRU: 'Склад', labelEN: 'Storage',
        descRU: 'Вместимость грузового отсека', descEN: 'Cargo bay capacity',
        Icon: Box, amountPerUpgrade: 1, colorClass: 'text-pink-400', maxLevel: 20
    },
    startingGold: {
        labelRU: 'Золото', labelEN: 'Credits',
        descRU: 'Капитал для торговли', descEN: 'Trading capital',
        Icon: Coins, amountPerUpgrade: 5, colorClass: 'text-amber-400', maxLevel: 10
    },
    inventorySlots: {
        labelRU: 'Рюкзак', labelEN: 'Backpack',
        descRU: 'Ячейки для артефактов', descEN: 'Slots for artifacts',
        Icon: Gem, amountPerUpgrade: 1, colorClass: 'text-indigo-400', maxLevel: 5
    },
    fuelEfficiency: {
        labelRU: 'Топливо', labelEN: 'Fuel',
        descRU: 'Снижение стоимости хода', descEN: 'Movement cost reduction',
        Icon: Gauge, amountPerUpgrade: 1, colorClass: 'text-orange-400', maxLevel: 2
    },
    scanRadius: {
        labelRU: 'Радар', labelEN: 'Radar',
        descRU: 'Дистанция обзора (Fog of War)', descEN: 'Vision range (Fog of War)',
        Icon: Radar, amountPerUpgrade: 1, colorClass: 'text-teal-400', maxLevel: 2
    },
    fatigueResistance: {
        labelRU: 'Стойкость', labelEN: 'Endurance',
        descRU: 'Защита от штрафов усталости', descEN: 'Protection against fatigue',
        Icon: Shield, amountPerUpgrade: 1, colorClass: 'text-red-400', maxLevel: 2
    },
    growthAccelerator: {
        labelRU: 'Синтез', labelEN: 'Synthesis',
        descRU: 'Скорость стройки объектов', descEN: 'Construction speed',
        Icon: Clock, amountPerUpgrade: 1, colorClass: 'text-blue-400', maxLevel: 2
    },
    foundationStrength: {
        labelRU: 'Основа', labelEN: 'Foundation',
        descRU: 'Прочность L1 гексов (Durability)', descEN: 'L1 hex durability',
        Icon: Layers, amountPerUpgrade: 2, colorClass: 'text-stone-400', maxLevel: 2
    },
    economicMultiplier: {
        labelRU: 'Налоги', labelEN: 'Taxes',
        descRU: 'Пассивный доход золота (%)', descEN: 'Passive credits income (%)',
        Icon: TrendingUp, amountPerUpgrade: 10, colorClass: 'text-yellow-400', maxLevel: 5
    },
    diggerLuck: {
        labelRU: 'Удача', labelEN: 'Luck',
        descRU: 'Шанс редкого лута при копке', descEN: 'Rare loot chance on dig',
        Icon: Star, amountPerUpgrade: 1, colorClass: 'text-fuchsia-400', maxLevel: 2
    },
    doubleDigChance: {
        labelRU: 'Экстрактор', labelEN: 'Extractor',
        descRU: 'Шанс 2x материи при копке (%)', descEN: '2x gather chance (%)',
        Icon: Copy, amountPerUpgrade: 10, colorClass: 'text-violet-400', maxLevel: 3
    },
    reserveCapacitor: {
        labelRU: 'Заряд', labelEN: 'Battery',
        descRU: 'Заряды восстановления L4+', descEN: 'L4+ recovery charges',
        Icon: Battery, amountPerUpgrade: 1, colorClass: 'text-sky-400', maxLevel: 2
    },
    turboRecharge: {
        labelRU: 'Турбо', labelEN: 'Turbo',
        descRU: 'Кулдаун энергетики L4+', descEN: 'L4+ recharge cooldown',
        Icon: Zap, amountPerUpgrade: 5, colorClass: 'text-lime-400', maxLevel: 1
    },
    entropyResistance: {
        labelRU: 'Стабильность', labelEN: 'Stability',
        descRU: 'Снижение роста энтропии (%)', descEN: 'Entropy growth reduction (%)',
        Icon: InfinityIcon, amountPerUpgrade: 10, colorClass: 'text-rose-400', maxLevel: 3
    },
    restorationMaster: {
        labelRU: 'Ремонт', labelEN: 'Repair',
        descRU: 'Шанс восстановления Бездны (%)', descEN: 'Void structural repair chance (%)',
        Icon: Wrench, amountPerUpgrade: 10, colorClass: 'text-amber-500', maxLevel: 3
    },
    contrastHighlighting: {
        labelRU: 'Подсветка', labelEN: 'Highlight',
        descRU: (lvl) => `Отображает контурную сияющую сетку для схем до ${lvl * 20} фигур (уровень ${lvl})`,
        descEN: (lvl) => `Displays glowing outline grid for setups of up to ${lvl * 20} shapes (Level ${lvl})`,
        Icon: Star, amountPerUpgrade: 1, colorClass: 'text-pink-400', maxLevel: 10
    }
};

// --- MEMOIZED UPGRADE NODE COMPONENT ---
// Prevents re-rendering all nodes when only one is upgraded or when active sector changes.
interface UpgradeNodeProps {
    upgradeKey: keyof CampaignUpgrades;
    currentValue: number;
    skillPoints: number;
    language: 'RU' | 'EN';
    activeGlowBg: string;
    onUpgrade: (key: keyof CampaignUpgrades, amount: number, cost: number) => void;
}

const UpgradeNode = React.memo(({ 
    upgradeKey, currentValue, skillPoints, language, activeGlowBg, onUpgrade 
}: UpgradeNodeProps) => {
    const config = UPGRADE_CONFIGS[upgradeKey];
    
    let baseline = 0;
    if (upgradeKey === 'inventorySlots') baseline = 3;
    if (upgradeKey === 'maxMaterials') baseline = 3;

    const level = Math.floor((currentValue - baseline) / config.amountPerUpgrade);
    const dynamicCost = getUpgradeCost(upgradeKey as string, level);
    const isMaxed = level >= config.maxLevel;
    const canAfford = skillPoints >= dynamicCost;

    const resolvedDescription = typeof config.descRU === 'function' 
        ? (language === 'RU' ? config.descRU(level + 1) : config.descEN(level + 1))
        : (language === 'RU' ? config.descRU : config.descEN);

    return (
        <div 
            className={`group relative flex flex-col justify-between p-2.5 sm:p-3.5 rounded-xl transition-all duration-200 select-none border border-slate-900/80 bg-slate-900/30 hover:bg-slate-900/60 h-auto
                ${canAfford && !isMaxed ? 'cursor-pointer hover:border-slate-800 shadow-md' : 'opacity-85 cursor-not-allowed'}
            `}
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${activeGlowBg} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl`} />

            <div className="flex flex-col sm:flex-row sm:items-stretch justify-between w-full h-full gap-2 relative z-10">
                <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                        <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-md bg-slate-950 border border-slate-800 shrink-0 shadow-inner group-hover:border-slate-700 transition-all duration-200 ${config.colorClass}`}>
                                <config.Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            </div>
                            <h3 className={`text-[10px] sm:text-xs font-black uppercase tracking-wider leading-tight truncate flex-1
                                ${canAfford && !isMaxed ? 'text-slate-100 group-hover:text-white' : 'text-slate-400'}
                            `}>
                                {language === 'RU' ? config.labelRU : config.labelEN}
                            </h3>
                        </div>

                        <div className="mt-1.5 sm:mt-2 flex items-center justify-between gap-1 leading-none">
                            <div className="flex items-baseline gap-1">
                                <span className="text-[6px] sm:text-[8px] uppercase font-black text-slate-500 tracking-wider font-mono">
                                    LVL
                                </span>
                                <span className={`text-lg sm:text-xl font-mono font-black tracking-tight leading-none transition-all duration-300
                                    ${isMaxed ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)]' : 'text-indigo-400 group-hover:text-indigo-300'}
                                `}>
                                    {level}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-slate-600 font-mono">
                                    /{config.maxLevel}
                                </span>
                                {isMaxed && (
                                    <span className="text-[6px] font-black text-amber-500 bg-amber-500/10 border border-amber-500/25 px-1 py-0.5 rounded leading-none ml-1 uppercase">
                                        MAX
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-0.5 sm:gap-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/5 text-[8px] sm:text-[9px] font-mono leading-none shrink-0">
                                <span className="text-slate-400 font-bold">{currentValue}</span>
                                {!isMaxed && (
                                    <>
                                        <TrendingUp className="w-2 h-2 sm:w-2.5 sm:h-2.5 text-indigo-400 opacity-60" />
                                        <span className="text-emerald-400 font-bold">{currentValue + config.amountPerUpgrade}</span>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-0.5 mt-1 sm:mt-1.5 mb-1.5 sm:mb-2 w-full max-w-[130px]">
                            {Array.from({ length: config.maxLevel }).map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-[2px] sm:h-[3px] flex-1 rounded-full transition-all duration-300 ${
                                        idx < level 
                                            ? (isMaxed ? 'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.4)]' : `bg-indigo-400 shadow-[0_0_3px_rgba(99,102,241,0.4)]`) 
                                            : 'bg-slate-800'
                                    }`} 
                                />
                            ))}
                        </div>

                        <p className="text-[8px] sm:text-[9px] text-slate-400 leading-normal mt-1 min-h-[1.5rem] line-clamp-2">
                            {resolvedDescription}
                        </p>
                    </div>
                </div>

                <div className="flex-shrink-0 flex items-center justify-stretch sm:justify-center sm:pl-1.5 sm:border-l border-t sm:border-t-0 border-white/5 pt-1 sm:pt-0">
                    {!isMaxed ? (
                        <button
                            onClick={() => canAfford && onUpgrade(upgradeKey, config.amountPerUpgrade, dynamicCost)}
                            disabled={!canAfford}
                            className={`flex flex-row sm:flex-col items-center justify-center gap-1.5 sm:gap-0 w-full sm:w-11 h-8 sm:h-11 rounded-lg border transition-all duration-150 select-none cursor-pointer relative overflow-hidden group/btn
                                ${canAfford 
                                    ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-200 hover:bg-indigo-500 hover:border-indigo-300 hover:text-white hover:scale-105 active:scale-95 shadow-[0_0_8px_rgba(99,102,241,0.1)] hover:shadow-[0_0_12px_rgba(99,102,241,0.35)]' 
                                    : 'bg-slate-950/60 border-slate-900 text-slate-600 cursor-not-allowed'
                                }
                            `}
                        >
                            <span className="text-[7px] font-mono font-black text-slate-500 group-hover/btn:text-indigo-100 uppercase tracking-widest leading-none">
                                SP
                            </span>
                            <span className="text-xs sm:text-sm font-black tracking-tighter font-mono group-hover/btn:scale-110 transition-transform leading-none">
                                {dynamicCost}
                            </span>
                        </button>
                    ) : (
                        <div className="flex items-center justify-center w-full sm:w-11 h-8 sm:h-11 rounded-lg border border-amber-500/25 bg-amber-500/5 text-amber-400 shrink-0 select-none relative overflow-hidden">
                            <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.4)] animate-pulse" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

// --- MAIN COMPONENT ---

export const UpgradesTree: React.FC<Props> = ({ onClose }) => {
    const upgrades = useGameStore(state => state.campaignUpgrades);
    const skillPoints = useGameStore(state => state.skillPoints);
    const updateUpgrades = useGameStore(state => state.updateCampaignUpgrades);
    const setSkillPoints = useGameStore(state => state.setSkillPoints);
    const playSound = useGameStore(state => state.playUiSound);
    const language = useGameStore(state => state.language);

    const [activeSector, setActiveSector] = React.useState<SectorId>('generation');

    const handleUpgrade = useCallback((key: keyof CampaignUpgrades, amount: number, cost: number) => {
        if (skillPoints >= cost) {
            playSound('SUCCESS');
            setSkillPoints(skillPoints - cost);
            updateUpgrades({ [key]: upgrades[key] + amount });
        } else {
            playSound('ERROR');
        }
    }, [skillPoints, playSound, setSkillPoints, updateUpgrades, upgrades]);

    // Memoized calculation of progress for all sectors to prevent lag on every render
    const sectorProgresses = useMemo(() => {
        const result = {} as Record<SectorId, { current: number; max: number; percentage: number }>;
        
        SECTORS.forEach(s => {
            let currentLevels = 0;
            let totalLevels = 0;

            s.keys.forEach(k => {
                const config = UPGRADE_CONFIGS[k];
                const currentValue = (upgrades[k] as number) || 0;
                let baseline = 0;
                if (k === 'inventorySlots') baseline = 3;
                if (k === 'maxMaterials') baseline = 3;

                const lvl = Math.floor((currentValue - baseline) / config.amountPerUpgrade);
                currentLevels += lvl;
                totalLevels += config.maxLevel;
            });

            result[s.id] = {
                current: currentLevels,
                max: totalLevels,
                percentage: totalLevels > 0 ? Math.round((currentLevels / totalLevels) * 100) : 0
            };
        });

        return result;
    }, [upgrades]);

    const activeSectorProgress = sectorProgresses[activeSector];
    const activeStyle = sectorStyles[activeSector];
    const activeSectorObj = SECTORS.find(s => s.id === activeSector)!;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[10050] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-slate-950/95 backdrop-blur-xl pointer-events-auto"
        >
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-600/15 blur-[120px]" />
                <div className="absolute bottom-[10%] right-[20%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[120px]" />
            </div>

            <motion.div 
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99, y: 10 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-slate-950 sm:border sm:border-indigo-500/30 w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-6xl sm:rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.2)] flex flex-col relative z-10 overflow-hidden"
            >
                <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-indigo-500/40 z-30 pointer-events-none" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t border-r border-indigo-500/40 z-30 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b border-l border-indigo-500/40 z-30 pointer-events-none" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-indigo-500/40 z-30 pointer-events-none" />

                <div className="pt-[calc(env(safe-area-inset-top)+32px)] sm:pt-4 px-4 sm:px-5 pb-3 flex items-center justify-between border-b border-indigo-500/20 bg-slate-950 shrink-0 relative z-20 gap-2">
                    <div className="flex items-center gap-2.5 min-w-0 pl-1">
                        <div className="bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/30 shrink-0">
                            <Layers className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <h2 className="text-sm sm:text-base md:text-lg font-black uppercase text-white tracking-widest leading-none truncate">
                                {language === 'RU' ? 'Узлы Развития' : 'Development Nodes'}
                            </h2>
                            <span className="text-[7px] sm:text-[8px] font-mono text-indigo-500/70 tracking-widest uppercase mt-0.5">Exp_Protocol_v2.2</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 pr-1 shrink-0">
                        <div className="flex items-center gap-1.5 bg-slate-900/50 border border-indigo-500/20 rounded-lg px-2.5 py-1 transition-all shadow-inner">
                            <div className="flex flex-col items-center leading-none">
                                <span className="text-[6px] text-indigo-400 font-bold uppercase leading-none">Skill</span>
                                <span className="text-[6px] text-indigo-400 font-bold uppercase leading-none">Points</span>
                            </div>
                            <div className="w-[1px] h-3 bg-indigo-500/20 mx-1" />
                            <span className="text-sm sm:text-lg font-black text-white font-mono leading-none tracking-tighter drop-shadow-[0_0_6px_rgba(99,102,241,0.4)]">
                                {skillPoints}
                            </span>
                        </div>

                        <button onClick={onClose} className="p-1.5 bg-slate-900/40 hover:bg-red-500/20 rounded-lg border border-white/5 transition-all transform hover:scale-105 active:scale-95 cursor-pointer shrink-0">
                            <X className="w-4 h-4 text-slate-400 hover:text-red-400 transition-colors" />
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0 relative z-10">
                    
                    <div className="hidden md:flex md:flex-col md:w-72 md:border-r border-indigo-500/15 bg-slate-950/40 p-5 shrink-0 justify-between overflow-y-auto no-scrollbar">
                        <div>
                            <span className="text-[9px] font-mono tracking-widest text-indigo-400/75 uppercase font-bold">CORE DIAGNOSTICS</span>
                            <h4 className="text-xs font-black uppercase text-slate-300 mt-1 mb-2 tracking-wider">
                                {language === 'RU' ? 'СОСТОЯНИЕ РЕАКТОРА' : 'REACTOR SYSTEM STATUS'}
                            </h4>

                            <div className="relative w-44 h-44 mx-auto shrink-0 flex items-center justify-center my-6 select-none">
                                <div className="absolute inset-0 rounded-full border border-indigo-500/10 animate-spin-slow pointer-events-none" />
                                <div className="absolute inset-2 rounded-full border border-dashed border-indigo-500/15 animate-reverse-spin pointer-events-none" />
                                
                                <button 
                                    onClick={() => { setActiveSector('generation'); playSound('CLICK'); }}
                                    className={`absolute top-0 left-0 w-[48%] h-[48%] rounded-tl-full border-t border-l flex flex-col items-center justify-center transition-all duration-300 group/quad cursor-pointer
                                        ${activeSector === 'generation' 
                                            ? 'bg-cyan-500/10 border-cyan-400 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)] scale-[1.03]' 
                                            : 'bg-slate-900/30 border-slate-800 text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                                        }
                                    `}
                                >
                                    <Zap className="w-5 h-5 mb-1 group-hover/quad:scale-110 transition-transform duration-200" />
                                    <span className="text-[7px] font-mono tracking-wider uppercase font-black">GEN</span>
                                </button>
                                
                                <button 
                                    onClick={() => { setActiveSector('matter'); playSound('CLICK'); }}
                                    className={`absolute top-0 right-0 w-[48%] h-[48%] rounded-tr-full border-t border-r flex flex-col items-center justify-center transition-all duration-300 group/quad cursor-pointer
                                        ${activeSector === 'matter' 
                                            ? 'bg-purple-500/10 border-purple-400 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)] scale-[1.03]' 
                                            : 'bg-slate-900/30 border-slate-800 text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                                        }
                                    `}
                                >
                                    <Box className="w-5 h-5 mb-1 group-hover/quad:scale-110 transition-transform duration-200" />
                                    <span className="text-[7px] font-mono tracking-wider uppercase font-black">MATTER</span>
                                </button>

                                <button 
                                    onClick={() => { setActiveSector('integrity'); playSound('CLICK'); }}
                                    className={`absolute bottom-0 left-0 w-[48%] h-[48%] rounded-bl-full border-b border-l flex flex-col items-center justify-center transition-all duration-300 group/quad cursor-pointer
                                        ${activeSector === 'integrity' 
                                            ? 'bg-rose-500/10 border-rose-400 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)] scale-[1.03]' 
                                            : 'bg-slate-900/30 border-slate-800 text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                                        }
                                    `}
                                >
                                    <Shield className="w-5 h-5 mb-1 group-hover/quad:scale-110 transition-transform duration-200" />
                                    <span className="text-[7px] font-mono tracking-wider uppercase font-black">SHIELD</span>
                                </button>

                                <button 
                                    onClick={() => { setActiveSector('synthesis'); playSound('CLICK'); }}
                                    className={`absolute bottom-0 right-0 w-[48%] h-[48%] rounded-br-full border-b border-r flex flex-col items-center justify-center transition-all duration-300 group/quad cursor-pointer
                                        ${activeSector === 'synthesis' 
                                            ? 'bg-amber-500/10 border-amber-400 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.15)] scale-[1.03]' 
                                            : 'bg-slate-900/30 border-slate-800 text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                                        }
                                    `}
                                >
                                    <Wrench className="w-5 h-5 mb-1 group-hover/quad:scale-110 transition-transform duration-200" />
                                    <span className="text-[7px] font-mono tracking-wider uppercase font-black">FORGE</span>
                                </button>

                                <div className="absolute w-14 h-14 rounded-full bg-slate-950 border border-indigo-500/20 flex flex-col items-center justify-center shadow-[inset_0_0_10px_rgba(99,102,241,0.2)] pointer-events-none z-10">
                                    <span className="text-[6px] font-mono tracking-[0.2em] text-indigo-400/80 uppercase font-black leading-none">CORE</span>
                                    <span className="text-[8px] font-mono font-black text-white uppercase tracking-tighter mt-0.5 leading-none">NEXUS</span>
                                </div>
                            </div>
                        </div>

                        <div className={`p-4 rounded-xl border ${activeStyle.borderActive} ${activeStyle.bgActive} transition-all duration-300 mt-2`}>
                            <span className="text-[7px] font-mono tracking-widest text-slate-500 uppercase leading-none font-bold block">ACTIVE MODULE</span>
                            <h3 className={`text-xs font-black tracking-wider uppercase mt-1 leading-none ${activeStyle.textActive}`}>
                                {language === 'RU' ? activeSectorObj.labelRU : activeSectorObj.labelEN}
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-1.5 leading-normal">
                                {language === 'RU' ? activeSectorObj.descRU : activeSectorObj.descEN}
                            </p>

                            <div className="mt-4 pt-3 border-t border-slate-900 flex flex-col">
                                <div className="flex items-center justify-between text-[8px] font-mono uppercase mb-1">
                                    <span className="text-slate-500">SYNC CHANNELS</span>
                                    <span className={`font-black ${activeStyle.textActive}`}>{activeSectorProgress.percentage}%</span>
                                </div>
                                <div className="h-1 w-full bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${activeStyle.progressFill}`}
                                        style={{ width: `${activeSectorProgress.percentage}%` }}
                                    />
                                </div>
                                <span className="text-[7px] font-mono text-slate-500 mt-1 uppercase text-right tracking-wider">
                                    {activeSectorProgress.current} / {activeSectorProgress.max} LVLS
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="md:hidden flex flex-col p-2 border-b border-indigo-500/10 bg-slate-950/40 gap-1 shrink-0 relative z-20">
                        <div className="grid grid-cols-4 gap-1">
                            {SECTORS.map(s => {
                                const prog = sectorProgresses[s.id];
                                const isSelected = activeSector === s.id;
                                const style = sectorStyles[s.id];
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => { setActiveSector(s.id); playSound('CLICK'); }}
                                        className={`flex items-center justify-between px-1.5 py-1.5 rounded-lg border transition-all duration-150 select-none cursor-pointer
                                            ${isSelected 
                                                ? `${style.bgActive} ${style.borderActive} ${style.textActive} ${style.shadowActive}` 
                                                : 'bg-slate-900/30 border-slate-800/80 text-slate-500'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-1 min-w-0">
                                            <s.icon className={`w-3 h-3 shrink-0 ${isSelected ? '' : 'text-slate-500'}`} />
                                            <span className="text-[8px] font-black font-mono tracking-wider truncate uppercase">
                                                {language === 'RU' ? s.labelRU.split(' ')[0] : s.labelEN.split(' ')[0]}
                                            </span>
                                        </div>
                                        <span className={`text-[7px] font-black font-mono px-0.5 rounded bg-black/40 shrink-0 ${isSelected ? style.textActive : 'text-slate-600'}`}>
                                            {prog.percentage}%
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 sm:p-5 lg:p-6 bg-slate-950/15 no-scrollbar min-h-0">
                        <div className="md:hidden mb-2 px-1 py-1 flex items-center justify-between border-b border-white/5 pb-1 shrink-0">
                            <span className={`text-[8px] font-mono tracking-widest uppercase font-bold ${activeStyle.textActive}`}>
                                {language === 'RU' ? activeSectorObj.labelRU : activeSectorObj.labelEN}
                            </span>
                            <span className="text-[7px] font-mono text-slate-500 uppercase">
                                {language === 'RU' ? 'АКТИВНЫЕ УЗЛЫ' : 'ACTIVE NODES'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-4 content-start">
                            {activeSectorObj.keys.map(key => (
                                <UpgradeNode 
                                    key={key}
                                    upgradeKey={key}
                                    currentValue={(upgrades[key] as number) || 0}
                                    skillPoints={skillPoints}
                                    language={language}
                                    activeGlowBg={activeStyle.glowBg}
                                    onUpgrade={handleUpgrade}
                                />
                            ))}
                        </div>
                    </div>

                </div>
            </motion.div>
        </motion.div>
    );
};