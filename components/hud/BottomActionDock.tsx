
import React, { useMemo } from 'react';
import { useGameStore } from '../../store';
import { TEXT } from '../../services/i18n';
import { Info, Pickaxe, ChevronsUp, RefreshCw, Hourglass, Mountain, MapPin } from 'lucide-react';
import HexButton from '../HexButton';
import { getHexKey, getNeighbors, getSecondsToGrow } from '../../services/hexUtils';
import { checkGrowthCondition, checkDigCondition } from '../../rules/growth';
import { Item, Hex } from '../../types';
import { ItemIcon, StatusIcon, getRarityBorder } from './HudShared';
import { GAME_CONFIG } from '../../rules/config';

interface BottomActionDockProps {
    onCenterPlayer: () => void;
    onOpenMission: () => void;
    onInspectItem: (item: Item) => void;
}

const BottomActionDock: React.FC<BottomActionDockProps> = ({ onCenterPlayer, onOpenMission, onInspectItem }) => {
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
    const visitPoi = useGameStore(state => state.visitPoi);
    
    const t = TEXT[language].HUD;
    const mainButtonSize = "lg";

    // --- COMPUTED STATE ---
    
    const currentHex = (grid && player) ? grid[getHexKey(player.q, player.r)] : undefined;
    const neighbors = player ? getNeighbors(player.q, player.r) : [];
    const botPositions = useMemo(() => (bots || []).map(b => ({ q: b.q, r: b.r })), [bots]);
    const isMoving = player?.state === 'MOVING';
    const queueSize = winCondition?.queueSize || 3;

    // Conditions
    const upgradeCondition = useMemo(() => {
        if (!currentHex || !player || !grid) return { canGrow: false, reason: 'Invalid Hex' };
        const simulatedHex = { ...currentHex, currentLevel: Math.max(0, currentHex.maxLevel) };
        return checkGrowthCondition(simulatedHex, player, neighbors, grid, botPositions, queueSize);
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
    const digTooltip = isMoving ? "Unit moving" : (!digCondition.canGrow ? (digCondition.reason || "Blocked") : "Excavate");
    const upgradeTooltip = isMoving ? "Unit moving" : (!upgradeCondition.canGrow ? (upgradeCondition.reason || "Blocked") : "Upgrade");
    const recoverTooltip = isMoving ? "Unit moving" : (recoveryState.cooling ? "Cooldown" : (!recoveryState.canRecover ? "Done" : "Recover"));

    // Campaign Metrics — live progress counters per level
    const campaignMetrics = useMemo(() => {
        if (!grid || !player || !activeLevelConfig) return null;
        const levelId = activeLevelConfig.id;
        const ownedByLevel = (minLvl: number) =>
            Object.values(grid).filter((h: Hex) => h.ownerId === player.id && h.maxLevel >= minLvl).length;

        // ── Series 1 ─────────────────────────────────────────────────────────
        if (levelId === '1.1') {
            const owned = ownedByLevel(1);
            return { current: Math.max(0, owned - 1), target: 3, label: t.TUT_1_1_COUNTER };
        }
        if (levelId === '1.3') {
            const lvl = grid[getHexKey(0, 0)]?.maxLevel ?? 0;
            return { current: lvl, target: 2, label: 'LEVEL' };
        }
        if (levelId === '1.4') {
            const lvl = grid[getHexKey(0, 0)]?.maxLevel ?? 0;
            return { current: lvl, target: 3, label: 'LEVEL' };
        }
        if (levelId === '1.5') return { current: player.coins, target: 150, label: t.TUT_1_5_COUNTER };
        if (levelId === '1.6') return { current: player.playerLevel, target: 4, label: 'RANK' };

        // ── Series 2 (Monument races) ─────────────────────────────────────────
        if (levelId === '2.2') return { current: player.inventory?.length ?? 0, target: 2, label: 'ITEMS' };
        if (levelId === '2.3') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        if (levelId === '2.4') return { current: player.inventory?.length ?? 0, target: 2, label: 'ITEMS' };
        if (levelId === '2.5') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };

        // ── Series 3 ─────────────────────────────────────────────────────────
        if (levelId === '3.2') return { current: player.coins, target: 200, label: t.TUT_1_5_COUNTER };
        if (levelId === '3.3') {
            const lvl = grid[getHexKey(0, 0)]?.maxLevel ?? 0;
            return { current: lvl, target: 3, label: 'LEVEL' };
        }
        if (levelId === '3.4') return { current: player.coins, target: 100, label: t.TUT_1_5_COUNTER };
        if (levelId === '3.5') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };

        // ── Series 4 ─────────────────────────────────────────────────────────
        if (levelId === '4.1') return { current: ownedByLevel(2), target: 3, label: 'L2 HEXES' };
        if (levelId === '4.3') return { current: ownedByLevel(3), target: 2, label: 'L3 HEXES' };
        if (levelId === '4.4') {
            const lvl = grid[getHexKey(0, 0)]?.maxLevel ?? 0;
            return { current: lvl, target: 4, label: 'LEVEL' };
        }
        if (levelId === '4.5') return { current: ownedByLevel(2), target: 6, label: 'L2 HEXES' };
        if (levelId === '4.6') return { current: ownedByLevel(3), target: 8, label: 'L3 HEXES' };
        if (levelId === '4.7') return { current: ownedByLevel(4), target: 2, label: 'L4 HEXES' };

        return null;
    }, [grid, player, activeLevelConfig, t, currentTurn]);

    // Mission Status
    const renderMissionStatus = () => {
        // 1. Live progress counter (has exact current/target numbers)
        if (campaignMetrics) {
            const isDone = campaignMetrics.current >= campaignMetrics.target;
            return (
                <div className="flex items-center gap-2 text-[10px] md:text-[10px] font-bold font-mono whitespace-pre-wrap break-words">
                    <span className="text-slate-400 uppercase break-words whitespace-pre-wrap">{campaignMetrics.label}:</span>
                    <span className={isDone ? "text-emerald-400" : "text-white"}>
                        {campaignMetrics.current}/{campaignMetrics.target}
                    </span>
                </div>
            );
        }
        // 2. Static goal text for complex / narrative missions
        if (activeLevelConfig?.goalText) {
            return (
                <div className="flex items-center gap-2 text-[10px] font-bold font-mono overflow-hidden whitespace-pre-wrap break-words">
                    <span className="text-slate-400 shrink-0 break-words whitespace-pre-wrap">GOAL:</span>
                    <span className="text-amber-300 truncate min-w-0 break-words whitespace-pre-wrap">{activeLevelConfig.goalText}</span>
                </div>
            );
        }
        // 3. Skirmish: SUMMIT win type
        if (winCondition?.winType === 'SUMMIT') {
            return (
                <div className="flex items-center gap-2 text-[10px] md:text-[10px] font-bold font-mono whitespace-pre-wrap break-words">
                    <span className="text-slate-400 break-words whitespace-pre-wrap">SUMMIT:</span>
                    <span className="text-amber-400 break-words whitespace-pre-wrap">LEVEL {winCondition?.targetLevel}</span>
                    <Mountain className="w-3 h-3 text-amber-500" />
                </div>
            );
        }
        // 4. Skirmish: standard level/coins goal
        return (
            <div className="flex items-center gap-2 text-[10px] font-bold font-mono whitespace-pre-wrap break-words">
                <span className="text-slate-400 break-words whitespace-pre-wrap">GOAL:</span>
                <span className="text-white break-words whitespace-pre-wrap">L{winCondition?.targetLevel}</span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400 break-words whitespace-pre-wrap">{winCondition?.targetCoins}cr</span>
            </div>
        );
    };

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
        <div className="absolute inset-x-0 bottom-0 p-2 md:p-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] animate-in slide-in-from-bottom-6 pointer-events-none flex flex-col items-center justify-end z-30">
            <div className="mb-2 pointer-events-auto">
                {renderActiveStatuses()}
            </div>
            
            {/* UNIFIED DOCK CONTAINER */}
            <div className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl md:rounded-3xl shadow-2xl p-1.5 md:p-3 pointer-events-auto flex items-center justify-between gap-1.5 md:gap-6 w-full md:w-auto max-w-7xl mx-auto overflow-hidden">
                
                {/* LEFT: INVENTORY & MISSION */}
                <div className="flex flex-col gap-1 md:gap-1.5 shrink min-w-0 flex-1 overflow-hidden">
                    {/* Mission Header */}
                    <div 
                        className="flex items-center justify-between gap-2 md:gap-3 px-2 md:px-3 py-1 md:py-1.5 bg-slate-950/50 rounded-lg md:rounded-xl border border-slate-800 cursor-pointer group hover:bg-slate-800 transition-all max-w-full touch-manipulation" 
                        onClick={() => { onOpenMission(); playUiSound('CLICK'); }}
                    >
                        <div className="truncate flex-1 min-w-0">
                          {renderMissionStatus()}
                        </div>
                        <div className="w-5 h-5 md:w-5 md:h-5 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center group-hover:bg-indigo-500 group-hover:border-indigo-400 transition-colors shrink-0">
                            <Info className="w-3 h-3 md:w-3 md:h-3 text-slate-400 group-hover:text-white" />
                        </div>
                    </div>

                    {/* Inventory Slots */}
                    <div className="flex items-center gap-1 md:gap-1.5 justify-start overflow-x-auto no-scrollbar mask-linear-fade-right pr-2">
                        {inventoryList.map(index => {
                            const item = player.inventory[index];
                            const slotSize = "w-8 h-8 md:w-10 md:h-10"; 
                            return (
                                <div 
                                    key={index} 
                                    onClick={() => { if(item) { onInspectItem(item); playUiSound('CLICK'); } }}
                                    draggable={!!item}
                                    onDragStart={(e) => { if(item) e.dataTransfer.setData("itemId", item.id); }}
                                    className={`
                                        ${slotSize} rounded-md md:rounded-lg border flex items-center justify-center relative group cursor-pointer transition-all shrink-0 touch-manipulation
                                        ${item 
                                            ? `bg-slate-800 ${getRarityBorder(item.rarity)} shadow-md hover:scale-105 active:scale-95` 
                                            : 'bg-slate-950/50 border-slate-800/50 border-dashed'}
                                    `}
                                >
                                    {item ? <ItemIcon item={item} size={slotSize} /> : <div className="w-1.5 h-1.5 rounded-full bg-slate-800/50" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* DIVIDER */}
                <div className="w-px h-12 md:h-16 bg-slate-800 mx-1 hidden md:block shrink-0"></div>

                {/* RIGHT: ACTION BUTTONS */}
                <div className="flex items-end gap-1.5 md:gap-3 shrink-0 ml-auto">
                    {currentHex?.poiType && (
                        <HexButton 
                            variant="blue" 
                            size={mainButtonSize} 
                            onClick={() => { visitPoi(); playUiSound('SUCCESS'); }}
                            className="ring-4 ring-indigo-500/20 rounded-full animate-pulse"
                            title={`Visit ${currentHex.poiType.replace('city_', '').replace('_', ' ')}`}
                        >
                            <MapPin className="w-5 h-5 md:w-8 md:h-8 text-white" />
                        </HexButton>
                    )}
                    <HexButton variant="red" size={mainButtonSize} onClick={() => handleActionClick('DIG')} active={isPlayerGrowing && playerGrowthIntent === 'DIG'} disabled={!canDig} progress={timeData.mode === 'DIG' ? timeData.percent : 0} className={isPlayerGrowing && playerGrowthIntent === 'DIG' ? 'ring-4 ring-red-500/20 rounded-full' : ''} title={digTooltip}>
                        <Pickaxe className={`w-5 h-5 md:w-8 md:h-8 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'DIG' ? 'scale-110 rotate-12' : ''}`} />
                    </HexButton>
                    <HexButton variant="amber" size={mainButtonSize} onClick={() => handleActionClick('UPGRADE')} active={isPlayerGrowing && playerGrowthIntent === 'UPGRADE'} disabled={!canUpgrade} pulsate={canUpgrade && !isPlayerGrowing} progress={timeData.mode === 'UPGRADE' ? timeData.percent : 0} className={isPlayerGrowing && playerGrowthIntent === 'UPGRADE' ? '-translate-y-1 ring-4 ring-amber-500/20 rounded-full' : ''} title={upgradeTooltip}>
                        <ChevronsUp className={`w-6 h-6 md:w-10 md:h-10 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'UPGRADE' ? 'scale-110 -translate-y-1' : ''}`} />
                    </HexButton>
                    <HexButton variant="blue" size={mainButtonSize} onClick={() => handleActionClick('RECOVER')} active={isPlayerGrowing && playerGrowthIntent === 'RECOVER'} disabled={!recoveryState.canRecover} progress={timeData.mode === 'RECOVERY' ? timeData.percent : 0} className={isPlayerGrowing && playerGrowthIntent === 'RECOVER' ? 'ring-4 ring-blue-500/20 rounded-full' : ''} title={recoverTooltip}>
                        {recoveryState.cooling ? (
                            <div className="flex flex-col items-center">
                                <Hourglass className="w-4 h-4 md:w-6 md:h-6 animate-spin-slow text-slate-300" />
                                <span className="text-[8px] md:text-[10px] font-mono mt-0.5 text-slate-400">{recoveryState.label}</span>
                            </div>
                        ) : (
                            <>
                              <RefreshCw className={`w-5 h-5 md:w-8 md:h-8 transition-transform duration-300 ${isPlayerGrowing && playerGrowthIntent === 'RECOVER' ? 'scale-110 rotate-180' : ''}`} />
                              {recoveryState.label && <span className="absolute -bottom-1 md:-bottom-2 bg-slate-900 px-1.5 rounded-full text-[7px] md:text-[9px] font-bold text-emerald-400 border border-emerald-900 shadow-sm">{recoveryState.label}</span>}
                            </>
                        )}
                    </HexButton>
                </div>
            </div>
        </div>
    );
};

export default BottomActionDock;
