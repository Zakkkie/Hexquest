
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store';
import { Pickaxe, ChevronsUp, RefreshCw, Hourglass, Backpack, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HexButton from '../HexButton';
import { getHexKey, getNeighbors, getSecondsToGrow } from '../../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../../rules/growth';
import { Item } from '../../types';
import { ItemIcon, StatusIcon, getRarityBorder } from './HudShared';
import { GAME_CONFIG, getLevelConfig } from '../../rules/config';

interface BottomActionDockProps {
    onCenterPlayer: () => void;
    onInspectItem: (item: Item) => void;
    onOpenInventory: () => void;
}

interface ActionTooltipProps {
    visible: boolean;
    title: string;
    costText?: string;
    rewardText?: string;
    statusText: string;
    statusType: 'success' | 'warning' | 'error' | 'info';
    colorTheme?: 'red' | 'amber' | 'blue' | 'indigo' | 'rose' | 'slate';
    language: string;
    align?: 'left' | 'center' | 'right';
}

const ActionTooltip: React.FC<ActionTooltipProps> = ({
    visible,
    title,
    costText,
    rewardText,
    statusText,
    statusType,
    colorTheme = 'slate',
    language,
    align = 'center'
}) => {
    if (!visible) return null;

    const accentBorderColor = {
        red: 'border-t-red-500 shadow-red-500/10',
        amber: 'border-t-amber-500 shadow-amber-500/10',
        blue: 'border-t-sky-500 shadow-sky-500/10',
        indigo: 'border-t-indigo-500 shadow-indigo-500/10',
        rose: 'border-t-rose-500 shadow-rose-500/10',
        slate: 'border-t-slate-500 shadow-slate-500/10',
    }[colorTheme];

    const statusBadge = {
        success: 'text-emerald-400 bg-emerald-950/45 border-emerald-900/40',
        warning: 'text-amber-400 bg-amber-950/45 border-amber-900/40',
        error: 'text-rose-400 bg-rose-950/45 border-rose-900/40',
        info: 'text-sky-400 bg-sky-950/45 border-sky-900/40',
    }[statusType];

    const positionClasses = {
        left: 'absolute bottom-full left-0 translate-x-0 mb-3.5 z-50 pointer-events-none w-64 p-3.5 bg-slate-950/95 backdrop-blur-xl border border-slate-800/80 rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.85)] border-t-2 origin-bottom-left',
        center: 'absolute bottom-full left-1/2 -translate-x-1/2 mb-3.5 z-50 pointer-events-none w-64 p-3.5 bg-slate-950/95 backdrop-blur-xl border border-slate-800/80 rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.85)] border-t-2 origin-bottom',
        right: 'absolute bottom-full right-0 translate-x-0 mb-3.5 z-50 pointer-events-none w-64 p-3.5 bg-slate-950/95 backdrop-blur-xl border border-slate-800/80 rounded-xl shadow-[0_12px_24px_rgba(0,0,0,0.85)] border-t-2 origin-bottom-right',
    }[align];

    const arrowClasses = {
        left: 'absolute top-full left-4 -mt-1 border-4 border-transparent border-t-slate-950',
        center: 'absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-950',
        right: 'absolute top-full right-4 -mt-1 border-4 border-transparent border-t-slate-950',
    }[align];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className={`${positionClasses} ${accentBorderColor} flex flex-col gap-2`}
            >
                {/* Header */}
                <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider font-sans text-slate-100">{title}</span>
                </div>

                {/* Info block */}
                <div className="flex flex-col gap-1 text-[10px] leading-normal text-slate-400">
                    {costText && (
                        <div className="flex justify-between border-b border-slate-900/50 pb-1">
                            <span>{language === 'RU' ? 'Стоимость:' : 'Cost Requirements:'}</span>
                            <span className="font-mono font-semibold text-slate-200">{costText}</span>
                        </div>
                    )}
                    {rewardText && (
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            <span className="text-slate-500 text-[8px] uppercase tracking-tighter">{language === 'RU' ? 'Экономический эффект:' : 'Extraction Reward:'}</span>
                            <span className="text-slate-300 font-sans whitespace-pre-wrap leading-tight text-[9.5px]">{rewardText}</span>
                        </div>
                    )}
                </div>

                {/* Status Indicator */}
                <div className={`mt-1 px-2 py-1 rounded-md border text-[9.5px] font-bold font-mono ${statusBadge} flex items-center gap-1.5`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse shrink-0" />
                    <span className="leading-tight truncate">{statusText}</span>
                </div>

                {/* Arrow */}
                <div className={arrowClasses} />
            </motion.div>
        </AnimatePresence>
    );
};

const BottomActionDock: React.FC<BottomActionDockProps> = ({ onCenterPlayer, onInspectItem, onOpenInventory }) => {
    const player = useGameStore(state => state.session?.player);
    const grid = useGameStore(state => state.session?.grid);
    const bots = useGameStore(state => state.session?.bots);
    const winCondition = useGameStore(state => state.session?.winCondition);
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const isPlayerGrowing = useGameStore(state => state.session?.isPlayerGrowing);
    const playerGrowthIntent = useGameStore(state => state.session?.playerGrowthIntent);
    const currentTurn = useGameStore(state => state.session?.currentTurn);
    
    
    const language = useGameStore(state => state.language);
    const playUiSound = useGameStore(state => state.playUiSound);
    const togglePlayerGrowth = useGameStore(state => state.togglePlayerGrowth);
    const showToast = useGameStore(state => state.showToast);
    
    const sessionStartTime = useGameStore(state => state.session?.sessionStartTime);
    const gameStatus = useGameStore(state => state.session?.gameStatus);
    
    const [timeLeft, setTimeLeft] = useState(75);
    const isLevel1_1 = activeLevelConfig?.id === '1.1';
    const isLevel1_5 = activeLevelConfig?.id === '1.5';
    const isLevel3_2 = activeLevelConfig?.id === '3.2';
    const isTimedLevel = isLevel1_1 || isLevel1_5 || isLevel3_2;

    useEffect(() => {
        if (isTimedLevel && gameStatus === 'PLAYING') {
            const timeLimit = isLevel1_1 ? 120 : (isLevel3_2 ? 180 : 75);
            const interval = setInterval(() => {
                const elapsed = Date.now() - (sessionStartTime || 0);
                const remaining = Math.max(0, timeLimit - Math.floor(elapsed / 1000));
                setTimeLeft(remaining);
            }, 250);
            return () => clearInterval(interval);
        }
    }, [isLevel1_1, isLevel1_5, isLevel3_2, gameStatus, sessionStartTime, isTimedLevel]);

    const [isMobile, setIsMobile] = useState(false);
    const [hoveredId, setHoveredId] = useState<string | null>(null);

    // Tutorial dimming & locks overrides
    const isTutorialLevel1 = activeLevelConfig?.id ? activeLevelConfig.id.startsWith('1.') : false;
    const levelId = activeLevelConfig?.id;

    const digDimmed = useMemo(() => {
        if (!isTutorialLevel1 || !levelId) return false;
        if (levelId === '1.1') return true;
        if (['1.4', '1.5', '1.6', '1.7'].includes(levelId)) return true;
        return false;
    }, [isTutorialLevel1, levelId]);

    const upgradeDimmed = useMemo(() => {
        if (!isTutorialLevel1 || !levelId) return false;
        if (['1.1', '1.2', '1.3', '1.6', '1.7', '1.8'].includes(levelId)) return true;
        return false;
    }, [isTutorialLevel1, levelId]);

    const recoverDimmed = useMemo(() => {
        if (!isTutorialLevel1 || !levelId) return false;
        if (['1.1', '1.2', '1.3', '1.4', '1.5', '1.8'].includes(levelId)) return true;
        return false;
    }, [isTutorialLevel1, levelId]);

    const handleDimmedClick = useCallback(() => {
        playUiSound('WARNING');
        showToast(language === 'RU' ? "Действие заблокировано протоколом обучения" : "Action restricted by training protocol", 'error');
    }, [language, playUiSound, showToast]);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const hasAnyItems = useMemo(() => {
        return player?.inventory && player.inventory.some(Boolean);
    }, [player?.inventory]);

    const mainButtonSize = isMobile ? "md" : "lg";

    // --- COMPUTED STATE ---
    
    const currentHex = (grid && player) ? grid[getHexKey(player.q, player.r)] : undefined;
    const neighbors = player ? getNeighbors(player.q, player.r) : [];
    const botPositions = useMemo(() => (bots || []).map(b => ({ q: b.q, r: b.r })), [bots]);
    const isMoving = player?.state === 'MOVING';
    const queueSize = winCondition?.queueSize || 3;

    // Conditions
    const upgradeCondition = useMemo(() => {
        if (!currentHex || !player || !grid) return { canGrow: false, reason: 'Invalid Hex' };
        return checkGrowthCondition(currentHex, player, neighbors, grid, botPositions, queueSize);
    }, [currentHex, player, grid, neighbors, botPositions, queueSize]);

    const digCondition = useMemo(() => {
        if (!currentHex || !player || !grid) return { canGrow: false, reason: 'Invalid Hex' };
        return checkDigCondition(currentHex, player, neighbors, grid);
    }, [currentHex, player, grid, neighbors]);

    const canUpgrade = upgradeCondition.canGrow;
    const canDig = digCondition.canGrow;

    // Recovery State
    const recoveryState = useMemo(() => {
        if (!currentHex || !player) return { canRecover: false, label: '', cooling: false };
        const isHighLevel = currentHex.maxLevel >= GAME_CONFIG.HIGH_LEVEL_RECOVERY_THRESHOLD;
        
        if (isHighLevel) {
            const now = Date.now();
            const cooldownEnd = currentHex.cooldownEndTime || 0;
            const remaining = Math.max(0, cooldownEnd - now);
            
            if (remaining > 0) {
                return { canRecover: false, label: `${Math.ceil(remaining/1000)}s`, cooling: true };
            }
            
            const charges = currentHex.recoveryCharges ?? GAME_CONFIG.MAX_RECOVERY_POINTS;
            return { canRecover: true, label: `${charges}/${GAME_CONFIG.MAX_RECOVERY_POINTS}`, cooling: false };
        } else {
            const can = !player.recoveredCurrentHex;
            return { canRecover: can, label: '', cooling: false };
        }
    }, [currentHex, player, currentTurn]); // Use turn or tick for reactivity

    // Progress
    const timeData = useMemo(() => {
        if (!currentHex) return { percent: 0, mode: 'IDLE' };
        let currentStepNeeded = 30; 
        let mode = 'IDLE';
        
        if (playerGrowthIntent === 'RECOVER') {
            currentStepNeeded = getSecondsToGrow(currentHex.maxLevel);
            mode = 'RECOVERY';
        } else if (playerGrowthIntent === 'DIG') {
            mode = 'DIG';
            currentStepNeeded = 30; 
        } else { 
            mode = 'UPGRADE';
            currentStepNeeded = getSecondsToGrow(currentHex.currentLevel + 1);
        }
        
        const percent = currentStepNeeded > 0 ? (currentHex.progress / currentStepNeeded) * 100 : 0;
        return { percent, mode };
    }, [currentHex, isPlayerGrowing, playerGrowthIntent]);

    // Tooltips
    const digTooltip = isMoving ? (language === 'RU' ? "В движении" : "Unit moving") : (!digCondition.canGrow ? (digCondition.reason || (language === 'RU' ? "Заблокировано" : "Blocked")) : "Excavate");
    const upgradeTooltip = isMoving ? (language === 'RU' ? "В движении" : "Unit moving") : (!upgradeCondition.canGrow ? (upgradeCondition.reason || (language === 'RU' ? "Заблокировано" : "Blocked")) : "Upgrade");
    const recoverTooltip = isMoving ? (language === 'RU' ? "В движении" : "Unit moving") : (recoveryState.cooling ? (language === 'RU' ? "Охлаждение" : "Cooldown") : (!recoveryState.canRecover ? (language === 'RU' ? "Истощено" : "Done") : "Recover"));

    const digTooltipData = useMemo(() => {
        const nextLevel = (currentHex?.currentLevel ?? 0) - 1;
        const rewardDesc = language === 'RU'
            ? `L >= 1: +1 Материал в рюкзак\nL < 0: +|L| Ходов и случайная добыча в шахте (целевое: L${nextLevel})`
            : `L >= 1: +1 Material inside backpack\nL < 0: +|L| Moves & random underground loot (target: L${nextLevel})`;

        return {
            title: language === 'RU' ? 'БУРЕНИЕ СЕКТОРА (РАСКОПКИ)' : 'EXCAVATE (DIG)',
            costText: language === 'RU' ? '0 мат · -1 ход (базовый)' : '0 Mat · -1 Move (Base)',
            rewardText: rewardDesc,
            statusText: canDig 
                ? (language === 'RU' ? '🟢 ГОТОВО К РАЗГРУЗКЕ' : '🟢 READY TO EXCAVATE')
                : `🔴 LOCKED: ${digCondition.reason || (language === 'RU' ? 'Условия стабильности не выполнены' : 'Stability constraints not met')}`,
            statusType: (canDig ? 'success' : 'error') as any,
        };
    }, [currentHex, canDig, digCondition, language]);

    const upgradeTooltipData = useMemo(() => {
        const targetLevel = (currentHex?.currentLevel ?? 0) + 1;
        const config = getLevelConfig(targetLevel);
        const hasFreeBuild = player?.activeStatuses?.some(s => s.type === 'STATUS_FREE_BUILD');

        const costDesc = language === 'RU'
            ? (hasFreeBuild ? '0 Материалов (Наниты!)' : '1 Материал')
            : (hasFreeBuild ? '0 Materials (Free Build!)' : '1 Material');

        return {
            title: language === 'RU' ? 'СТРОИТЕЛЬСТВО (УЛУЧШЕНИЕ)' : 'CONSTRUCTION (UPGRADE)',
            costText: `${costDesc} · ${language === 'RU' ? 'Требуемый Ранг' : 'Required Rank'}: ${config.reqRank}`,
            rewardText: language === 'RU'
                ? `Повышает сектор до L${targetLevel}. Требуется инженерная поддержка 2 смежных секторов.`
                : `Elevates coordinate structure to L${targetLevel}. Requires engineering layout support from 2 neighbors.`,
            statusText: canUpgrade
                ? (language === 'RU' ? '🟢 ГОТОВО К СТРОИТЕЛЬСТВУ' : '🟢 READY TO UPGRADE')
                : `🔴 LOCKED: ${upgradeCondition.reason || (language === 'RU' ? 'Недостаточно материалов или ранга' : 'Insufficient materials or rank')}`,
            statusType: (canUpgrade ? 'success' : 'error') as any,
        };
    }, [currentHex, player, canUpgrade, upgradeCondition, language]);

    const recoverTooltipData = useMemo(() => {
        const currentLvl = currentHex?.currentLevel ?? 0;
        const rewardCoins = 5 * Math.max(0, currentLvl);

        const rewardDesc = language === 'RU'
            ? `Термический съем: +1 Ход, +${rewardCoins} Кредитов`
            : `Thermodynamic release: +1 Move, +${rewardCoins} Credits`;

        let statusText = '';
        let statusType: 'success' | 'warning' | 'error' | 'info' = 'success';

        if (recoveryState.cooling) {
            statusText = language === 'RU' ? `⏳ ПЕРЕГРЕВ: Термо-кулдаун (${recoveryState.label})` : `⏳ OVERHEATED: Thermal cooldown (${recoveryState.label})`;
            statusType = 'warning';
        } else if (!recoveryState.canRecover) {
            statusText = language === 'RU' ? '⚪ ИСТОЩЕНО: Сделайте шаг для перезарядки' : '⚪ EXHAUSTED: Step away to reset generator';
            statusType = 'error';
        } else {
            statusText = language === 'RU' ? '🔵 ЗАРЯЖЕНО И ГОТОВО' : '🔵 CHARGED & ACTIVE';
            statusType = 'success';
        }

        return {
            title: language === 'RU' ? 'СЪЕМ ЭНЕРГИИ (ВОССТАНОВЛЕНИЕ)' : 'THERMO SIPHON (RECOVER)',
            costText: language === 'RU' ? '0 мат (требует заряд)' : '0 Mat (requires charge)',
            rewardText: rewardDesc,
            statusText,
            statusType,
        };
    }, [currentHex, recoveryState, language]);

    const inventoryTooltipData = useMemo(() => {
        const occupied = player?.inventory ? player.inventory.filter(Boolean).length : 0;
        return {
            title: language === 'RU' ? 'ИНВЕНТАРНЫЙ ПОРТ' : 'BACKPACK CONDUIT',
            costText: language === 'RU' ? '5 ячеек максимум' : '5 Slots capacity',
            rewardText: language === 'RU'
                ? 'Резервуар для сохранения ценных дисков с данными, нано-чипов и древних ключей Обелиска.'
                : 'Shielded containment for encrypted hard drives, nanite chips, and Monolith keys.',
            statusText: language === 'RU' ? `🎒 Слотов занято: ${occupied} / 5` : `🎒 Slots used: ${occupied} / 5`,
            statusType: 'info' as any,
        };
    }, [player?.inventory, language]);


    const renderActiveStatuses = () => {
        if (!player?.activeStatuses || player.activeStatuses.length === 0) return null;
        const now = Date.now();
        const validStatuses = player.activeStatuses.filter(s => !s.expiresAt || s.expiresAt > now);
        if (validStatuses.length === 0) return null;
        return (
            <div className="flex gap-3 md:gap-4 mb-3 justify-center w-full pointer-events-auto">
                {validStatuses.map((status, idx) => (
                    <StatusIcon key={`${status.type}-${idx}`} status={status} />
                ))}
            </div>
        );
    };

    if (!player) return null;

    const inventoryList = [0, 1, 2, 3, 4];

    // Helper for Action Clicks
    const handleActionClick = (intent: 'DIG' | 'UPGRADE' | 'RECOVER') => {
        togglePlayerGrowth(intent);
        onCenterPlayer();
    };

    return (
        <div className="absolute inset-x-0 bottom-0 p-2 md:p-4 pb-[max(0.6rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-6 pointer-events-none flex flex-col items-center justify-end z-30">
            <div className="mb-2 pointer-events-auto">
                {renderActiveStatuses()}
            </div>
            
            {isMobile ? (
                /* REFINED MOBILE VIEW: Stacked elegant layout for comfortable touch targets and clarity */
                <div className="w-full max-w-sm sm:max-w-md mx-auto pointer-events-auto flex flex-col gap-2 relative">
                    
                    {/* SUB-DOCK (Top Row): Inventory tray */}
                    <div className="flex items-center justify-end gap-2 px-1">
                        
                        {/* Backpack Toggle with count badge */}
                        <div 
                            className="relative shrink-0"
                            onClick={() => { onOpenInventory(); playUiSound('CLICK'); }}
                        >
                            <div className="flex items-center justify-center w-10 h-10 bg-slate-900/80 backdrop-blur-lg rounded-xl border border-slate-800/80 cursor-pointer hover:bg-slate-800/90 active:scale-95 transition-all text-slate-400 hover:text-white shadow-lg relative" id="mobile-backpack-btn">
                                <Backpack className="w-5 h-5 text-slate-300" />
                                {hasAnyItems && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[8px] font-black font-mono text-white ring-1 ring-slate-950 animate-pulse">
                                        {player.inventory.filter(Boolean).length}
                                    </span>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* CORE BUTTONS + QUICK SLOTS (Bottom Row) */}
                    <div className="bg-slate-950/85 backdrop-blur-xl border border-slate-800/90 rounded-[1.5rem] shadow-[0_16px_40px_rgba(0,0,0,0.85)] p-2 px-3 flex items-center justify-between gap-3 relative overflow-visible">
                        
                        {/* ITEM SHORTCUT TRAY OR TIMER */}
                        {isTimedLevel && gameStatus === 'PLAYING' ? (
                            <div className="flex items-center gap-2 pr-2 border-r border-slate-800/50 shrink-0 select-none">
                                <div className={`flex items-center gap-2 px-3 py-1 bg-slate-950/80 border rounded-xl h-10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)] ${timeLeft < 15 ? 'border-red-500 animate-pulse' : 'border-slate-800'}`}>
                                    <Clock className={`w-4 h-4 ${timeLeft < 15 ? 'text-red-500 animate-bounce' : 'text-amber-400'}`} />
                                    <span className={`text-base font-black font-mono leading-none tracking-tight ${timeLeft < 15 ? 'text-red-400' : 'text-slate-100'}`}>
                                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-[140px] pr-2 border-r border-slate-800/50 shrink-0">
                                {inventoryList.map(index => {
                                    const item = player.inventory[index];
                                    return (
                                        <div 
                                            key={index}
                                            onClick={() => { if (item) { onInspectItem(item); playUiSound('CLICK'); } }}
                                            className={`w-10 h-10 rounded-lg border flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0 ${
                                                item 
                                                    ? `bg-slate-900 bg-opacity-80 ${getRarityBorder(item.rarity)} shadow-md` 
                                                    : 'bg-slate-950/45 border-slate-800/40 border-dashed'
                                            }`}
                                        >
                                            {item ? (
                                                <ItemIcon item={item} size="w-10 h-10" />
                                            ) : (
                                                <div className="w-1 h-1 rounded-full bg-slate-800/30" />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* CORE ACTION BUTTONS: DIG, UPGRADE, RECOVER (with w-12 h-12 = 48px ideal touch targets!) */}
                        <div className="flex items-center gap-2.5 flex-1 justify-end shrink-0">
                            
                            {/* DIG Action */}
                            <div 
                                className="relative shrink-0"
                                onClick={digDimmed ? handleDimmedClick : () => handleActionClick('DIG')}
                            >
                                <HexButton 
                                    variant="red" 
                                    size="md" 
                                    onDisabledClick={digDimmed ? handleDimmedClick : () => { playUiSound('WARNING'); showToast(digTooltip, 'error'); }}
                                    active={isPlayerGrowing && playerGrowthIntent === 'DIG'}
                                    disabled={!canDig}
                                    dimmed={digDimmed}
                                    pulsate={levelId === '1.2' || levelId === '1.3' || levelId === '1.8'}
                                    progress={timeData.mode === 'DIG' ? timeData.percent : 0}
                                    className={`${isPlayerGrowing && playerGrowthIntent === 'DIG' ? 'ring-2 ring-red-500/30' : ''} !p-0 !m-0`}
                                    title={digDimmed ? (language === 'RU' ? "Заблокировано обучением" : "Locked in training") : digTooltip}
                                >
                                    <div className="flex items-center justify-center p-3">
                                        <Pickaxe className={`w-5 h-5 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'DIG' ? 'scale-110 rotate-12 text-white' : 'text-red-400'}`} />
                                    </div>
                                </HexButton>
                            </div>

                            {/* UPGRADE Action */}
                            <div 
                                className="relative shrink-0"
                                onClick={upgradeDimmed ? handleDimmedClick : () => handleActionClick('UPGRADE')}
                            >
                                <HexButton 
                                    variant="amber" 
                                    size="md" 
                                    onDisabledClick={upgradeDimmed ? handleDimmedClick : () => { playUiSound('WARNING'); showToast(upgradeTooltip, 'error'); }}
                                    active={isPlayerGrowing && playerGrowthIntent === 'UPGRADE'}
                                    disabled={!canUpgrade}
                                    dimmed={upgradeDimmed}
                                    pulsate={levelId === '1.4' || levelId === '1.5' || (canUpgrade && !isPlayerGrowing)}
                                    progress={timeData.mode === 'UPGRADE' ? timeData.percent : 0}
                                    className={`${isPlayerGrowing && playerGrowthIntent === 'UPGRADE' ? 'ring-2 ring-amber-500/30' : ''} !p-0 !m-0`}
                                    title={upgradeDimmed ? (language === 'RU' ? "Заблокировано обучением" : "Locked in training") : upgradeTooltip}
                                >
                                    <div className="flex items-center justify-center p-3">
                                        <ChevronsUp className={`w-5.5 h-5.5 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'UPGRADE' ? 'scale-115 -translate-y-0.5 text-white' : 'text-amber-400'}`} />
                                    </div>
                                </HexButton>
                            </div>

                            {/* RECOVER Action */}
                            <div 
                                className="relative shrink-0"
                                onClick={recoverDimmed ? handleDimmedClick : () => handleActionClick('RECOVER')}
                            >
                                <HexButton 
                                    variant="blue" 
                                    size="md" 
                                    onDisabledClick={recoverDimmed ? handleDimmedClick : () => { playUiSound('WARNING'); showToast(recoverTooltip, 'error'); }}
                                    active={isPlayerGrowing && playerGrowthIntent === 'RECOVER'}
                                    disabled={!recoveryState.canRecover}
                                    dimmed={recoverDimmed}
                                    pulsate={levelId === '1.6' || levelId === '1.7'}
                                    progress={timeData.mode === 'RECOVERY' ? timeData.percent : 0}
                                    className={`${isPlayerGrowing && playerGrowthIntent === 'RECOVER' ? 'ring-2 ring-blue-500/30' : ''} !p-0 !m-0`}
                                    title={recoverDimmed ? (language === 'RU' ? "Заблокировано обучением" : "Locked in training") : recoverTooltip}
                                >
                                    <div className="flex items-center justify-center p-3">
                                        {recoveryState.cooling ? (
                                            <div className="flex flex-col items-center justify-center leading-none">
                                                <Hourglass className="w-5 h-5 animate-spin-slow text-blue-300" />
                                                <span className="text-[7.5px] font-mono mt-0.5 text-slate-400">{recoveryState.label}</span>
                                            </div>
                                        ) : (
                                            <div className="relative flex flex-col items-center justify-center">
                                                <RefreshCw className={`w-5 h-5 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'RECOVER' ? 'scale-110 text-white font-bold' : 'text-blue-400'}`} />
                                                {recoveryState.label && (
                                                    <span className="absolute -bottom-1 bg-slate-950 px-1 rounded-full text-[6.5px] font-black text-emerald-400 border border-emerald-950 border-opacity-40 font-mono">
                                                        {recoveryState.label}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </HexButton>
                            </div>

                        </div>

                    </div>
                </div>
            ) : (
                /* DESKTOP VIEW: High-definition controls panel with maximum clarity and organization */
                <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl md:rounded-3xl shadow-[0_15px_45px_black] p-1.5 md:p-3 pointer-events-auto flex flex-col gap-1.5 md:gap-2.5 w-full md:w-auto max-w-7xl mx-auto overflow-visible animate-in fade-in zoom-in-95 duration-200">
                    
                    <div className="flex items-center gap-1.5 w-full">
                        {/* Inventory Toggle */}
                        <div 
                            className="relative shrink-0"
                            onMouseEnter={() => setHoveredId('inventory')}
                            onMouseLeave={() => setHoveredId(null)}
                        >
                            <div 
                                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-950/60 rounded-xl border border-slate-800 cursor-pointer group hover:bg-slate-800/80 transition-all shrink-0 touch-manipulation active:scale-95" 
                                onClick={() => { onOpenInventory(); playUiSound('CLICK'); }}
                                title={language === 'RU' ? 'Инвентарь' : 'Inventory'}
                            >
                                <Backpack className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-400 transition-colors" />
                                <span className="text-[10px] font-bold text-slate-400 group-hover:text-white font-mono tracking-wider uppercase inline">
                                    {language === 'RU' ? 'ИНВ' : 'INV'}
                                </span>
                            </div>
                            <ActionTooltip 
                                visible={hoveredId === 'inventory'} 
                                {...inventoryTooltipData} 
                                language={language}
                                align="left"
                            />
                        </div>

                    </div>

                    {/* ROW 2: SIDE-BY-SIDE SLOTS & TRIGGERS */}
                    <div className="flex items-center justify-between gap-6 md:flex-row flex-row">
                        
                        {/* LEFT PART: Inventory Slots tray OR TIMER */}
                        <div className="flex-1 min-w-0 pointer-events-auto">
                            {isTimedLevel && gameStatus === 'PLAYING' ? (
                                <div className="flex items-center gap-2 select-none h-11">
                                    <div className={`flex items-center gap-3 px-4 py-2 bg-slate-950/80 border rounded-xl shadow-[inset_0_1px_3px_rgba(255,255,255,0.01)] ${timeLeft < 20 ? 'border-red-500/80 animate-pulse' : 'border-slate-800'}`}>
                                        <div className="relative flex items-center justify-center">
                                            <Clock className={`w-5 h-5 ${timeLeft < 20 ? 'text-red-500 animate-pulse' : 'text-amber-400'}`} />
                                            {timeLeft < 20 && (
                                                <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-25 animate-ping" />
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[7.5px] font-bold font-mono tracking-wider text-slate-500 uppercase leading-none mb-0.5">
                                                {language === 'RU' ? 'ПОДГРУЗКА ЯДРА (ТАЙМЕР)' : 'TIME LIMIT REMAINING'}
                                            </span>
                                            <span className={`text-xl font-black font-mono leading-none ${timeLeft < 20 ? 'text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.45)]' : 'text-slate-100'}`}>
                                                {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar mask-linear-fade-right">
                                    {inventoryList.map(index => {
                                        const item = player.inventory[index];
                                        const slotSize = "w-10 h-10"; 
                                        return (
                                            <div 
                                                key={index} 
                                                onClick={() => { if(item) { onInspectItem(item); playUiSound('CLICK'); } }}
                                                draggable={!!item}
                                                onDragStart={(e) => { if(item) e.dataTransfer.setData("itemId", item.id); }}
                                                className={`
                                                    ${slotSize} rounded-lg border flex items-center justify-center relative group cursor-pointer transition-all shrink-0 touch-manipulation active:scale-95
                                                    ${item 
                                                        ? `bg-slate-800/90 ${getRarityBorder(item.rarity)} shadow-md hover:scale-105` 
                                                        : 'bg-slate-950/45 border-slate-800/40 border-dashed'}
                                                `}
                                            >
                                                {item ? <ItemIcon item={item} size={slotSize} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-800/40" />}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* SLIGHT DIVIDER */}
                        <div className="w-px h-10 bg-slate-800/80 mx-1 shrink-0"></div>

                        {/* RIGHT PART: CORE ACTION TRIGGERS */}
                        <div className="flex items-center justify-center gap-2.5 shrink-0 select-none">
                            {/* DIG TRIGGER */}
                            <div 
                                className="relative shrink-0"
                                onMouseEnter={() => setHoveredId('dig')}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <HexButton 
                                    variant="red" 
                                    size={mainButtonSize} 
                                    onClick={digDimmed ? handleDimmedClick : () => handleActionClick('DIG')} 
                                    onDisabledClick={digDimmed ? handleDimmedClick : () => { playUiSound('WARNING'); showToast(digTooltip, 'error'); }} 
                                    active={isPlayerGrowing && playerGrowthIntent === 'DIG'} 
                                    disabled={!canDig} 
                                    dimmed={digDimmed}
                                    pulsate={levelId === '1.2' || levelId === '1.3' || levelId === '1.8'}
                                    progress={timeData.mode === 'DIG' ? timeData.percent : 0} 
                                    className={isPlayerGrowing && playerGrowthIntent === 'DIG' ? 'ring-2 ring-red-500/30' : ''} 
                                    title={digDimmed ? (language === 'RU' ? "Заблокировано обучением" : "Locked in training") : digTooltip}
                                >
                                    <Pickaxe className={`w-6 h-6 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'DIG' ? 'scale-110 rotate-12 text-white font-bold' : 'text-red-400'}`} />
                                </HexButton>
                                <ActionTooltip 
                                    visible={hoveredId === 'dig'} 
                                    {...digTooltipData} 
                                    language={language}
                                    align="right"
                                />
                            </div>

                            {/* UPGRADE TRIGGER */}
                            <div 
                                className="relative shrink-0"
                                onMouseEnter={() => setHoveredId('upgrade')}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <HexButton 
                                    variant="amber" 
                                    size={mainButtonSize} 
                                    onClick={upgradeDimmed ? handleDimmedClick : () => handleActionClick('UPGRADE')} 
                                    onDisabledClick={upgradeDimmed ? handleDimmedClick : () => { playUiSound('WARNING'); showToast(upgradeTooltip, 'error'); }} 
                                    active={isPlayerGrowing && playerGrowthIntent === 'UPGRADE'} 
                                    disabled={!canUpgrade} 
                                    dimmed={upgradeDimmed}
                                    pulsate={levelId === '1.4' || levelId === '1.5' || (canUpgrade && !isPlayerGrowing)} 
                                    progress={timeData.mode === 'UPGRADE' ? timeData.percent : 0} 
                                    className={isPlayerGrowing && playerGrowthIntent === 'UPGRADE' ? '-translate-y-0.5 ring-2 ring-amber-500/30 font-bold' : ''} 
                                    title={upgradeDimmed ? (language === 'RU' ? "Заблокировано обучением" : "Locked in training") : upgradeTooltip}
                                >
                                    <ChevronsUp className={`w-7 h-7 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'UPGRADE' ? 'scale-115 -translate-y-0.5 text-white' : 'text-amber-400'}`} />
                                </HexButton>
                                <ActionTooltip 
                                    visible={hoveredId === 'upgrade'} 
                                    {...upgradeTooltipData} 
                                    language={language}
                                    align="right"
                                />
                            </div>

                            {/* RECOVER TRIGGER */}
                            <div 
                                className="relative shrink-0"
                                onMouseEnter={() => setHoveredId('recover')}
                                onMouseLeave={() => setHoveredId(null)}
                            >
                                <HexButton 
                                    variant="blue" 
                                    size={mainButtonSize} 
                                    onClick={recoverDimmed ? handleDimmedClick : () => handleActionClick('RECOVER')} 
                                    onDisabledClick={recoverDimmed ? handleDimmedClick : () => { playUiSound('WARNING'); showToast(recoverTooltip, 'error'); }} 
                                    active={isPlayerGrowing && playerGrowthIntent === 'RECOVER'} 
                                    disabled={!recoveryState.canRecover} 
                                    dimmed={recoverDimmed}
                                    pulsate={levelId === '1.6' || levelId === '1.7'}
                                    progress={timeData.mode === 'RECOVERY' ? timeData.percent : 0} 
                                    className={isPlayerGrowing && playerGrowthIntent === 'RECOVER' ? 'ring-2 ring-blue-500/30' : ''} 
                                    title={recoverDimmed ? (language === 'RU' ? "Заблокировано обучением" : "Locked in training") : recoverTooltip}
                                >
                                    {recoveryState.cooling ? (
                                        <div className="flex flex-col items-center">
                                            <Hourglass className="w-5 h-5 animate-spin-slow text-blue-300" />
                                            <span className="text-[9.5px] font-mono mt-0.5 text-slate-400 leading-none">{recoveryState.label}</span>
                                        </div>
                                    ) : (
                                        <div className="relative flex flex-col items-center justify-center">
                                            <RefreshCw className={`w-6 h-6 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'RECOVER' ? 'scale-110 rotate-180 text-white font-bold' : 'text-blue-400'}`} />
                                            {recoveryState.label && <span className="absolute -bottom-1 bg-slate-950 px-1 rounded-full text-[8.5px] font-black text-emerald-400 border border-emerald-940 border-opacity-30 shadow-sm font-mono leading-none">{recoveryState.label}</span>}
                                        </div>
                                    )}
                                </HexButton>
                                <ActionTooltip 
                                    visible={hoveredId === 'recover'} 
                                    {...recoverTooltipData} 
                                    language={language}
                                    align="right"
                                />
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </div>
    );
};

export default React.memo(BottomActionDock);
