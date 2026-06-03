import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useGameStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, ChevronsUp, Key, Zap, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { Hex } from '../../types';

const MonumentHintBanner: React.FC = () => {
    const grid = useGameStore(state => state.session?.grid);
    const playerExists = useGameStore(state => !!state.session?.player);
    const playerQ = useGameStore(state => state.session?.player?.q);
    const playerR = useGameStore(state => state.session?.player?.r);
    const playerInventory = useGameStore(state => state.session?.player?.inventory);

    const player = useMemo(() => {
        if (!playerExists || playerQ === undefined || playerR === undefined) return null;
        return { q: playerQ, r: playerR, inventory: playerInventory ?? [] };
    }, [playerExists, playerQ, playerR, playerInventory]);

    const language = useGameStore(state => state.language);
    const playUiSound = useGameStore(state => state.playUiSound);
    const monumentRequirements = useGameStore(state => state.session?.monumentRequirements);
    const monumentAlternatives = useGameStore(state => state.session?.monumentAlternatives);

    // 1. Find if a Monument exists in the current level grid
    const monument = useMemo(() => {
        if (!grid) return null;
        return Object.values(grid).find((h: Hex) => h.structureType === 'MONUMENT');
    }, [grid]);

    // 2. Is the monument found / revealed?
    const isMonumentFound = useMemo(() => {
        return monument ? !!monument.revealed : false;
    }, [monument]);

    // 3. Is player standing on the monument?
    const isAtMonument = useMemo(() => {
        if (!player || !monument) return false;
        return player.q === monument.q && player.r === monument.r;
    }, [player, monument]);

    // 4. Can player activate the monument?
    const canActivate = useMemo(() => {
        if (!player?.inventory || !monumentRequirements || monumentRequirements.length === 0) return false;
        
        const tempInventory = [...player.inventory];
        for (const req of monumentRequirements) {
            const matchIdx = tempInventory.findIndex(item => {
                if (req === 'ANY') return true;
                if (req === 'COMMON' || req === 'UNCOMMON' || req === 'RARE' || req === 'LEGENDARY') {
                    return item.rarity === req;
                }
                if (req === 'ONE_OF') {
                    return (monumentAlternatives ?? []).includes(item.baseId);
                }
                return item.baseId === req;
            });
            if (matchIdx === -1) return false;
            tempInventory.splice(matchIdx, 1);
        }
        return true;
    }, [player?.inventory, monumentRequirements, monumentAlternatives]);

    // Determine current phase & dynamic messages
    const currentPhase = useMemo(() => {
        if (!monument) return null;
        if (!isMonumentFound) return 'FIND';
        if (!isAtMonument) return 'REACH';
        if (monumentRequirements && monumentRequirements.length > 0 && !canActivate) return 'FIND_KEYS';
        return 'ACTIVATE';
    }, [monument, isMonumentFound, isAtMonument, monumentRequirements, canActivate]);

    const info = useMemo(() => {
        if (!currentPhase) return null;
        
        const langRu = language === 'RU';
        switch (currentPhase) {
            case 'FIND':
                return {
                    text: langRu ? 'Разведайте туман на карте и найдите Древний Монумент' : 'Scout the fog of war to locate the Ancient Monument',
                    title: langRu ? 'Задача: Найти Монумент' : 'Objective: Find Monument',
                    icon: Compass,
                    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/40 shadow-amber-900/10 text-amber-300',
                    badge: langRu ? 'Скрыт в тумане' : 'Hidden in fog'
                };
            case 'REACH':
                return {
                    text: langRu ? 'Поднимите фундамент до уровня Монумента, чтобы взойти на него' : 'Climb to the Monument’s level to step onto its summit',
                    title: langRu ? 'Задача: Достичь Вершины' : 'Objective: Reach Summit',
                    icon: ChevronsUp,
                    color: 'from-sky-500/20 to-indigo-500/10 border-sky-500/40 shadow-sky-900/10 text-sky-300',
                    badge: langRu ? 'Монумент найден' : 'Monument spotted'
                };
            case 'FIND_KEYS':
                return {
                    text: langRu ? 'Найдите нужные артефакты для активации в шахтах или обелисках' : 'Find the required artifacts in mines or obelisks',
                    title: langRu ? 'Задача: Найти Предмет' : 'Objective: Find Items',
                    icon: Key,
                    color: 'from-rose-500/20 to-purple-500/10 border-rose-500/40 shadow-rose-900/10 text-rose-300',
                    badge: langRu ? 'Нужны предметы' : 'Requires items'
                };
            case 'ACTIVATE':
                return {
                    text: langRu ? 'Все предметы собраны! Нажмите «АКТИВАЦИЯ» в меню Монумента' : 'Authorization ready. Trigger monument activation mechanism',
                    title: langRu ? 'Задача: Активировать!' : 'Objective: Activate!',
                    icon: Zap,
                    color: 'from-emerald-500/25 to-teal-500/10 border-emerald-500/40 shadow-emerald-950/10 text-emerald-300',
                    badge: langRu ? 'Готов к запуску' : 'Ready'
                };
        }
    }, [currentPhase, language]);

    // Local state for collapse/expand
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Compute progress metric percentage and textual value
    const currentProgressPercent = useMemo(() => {
        if (!monument) return 0;
        if (currentPhase === 'FIND') {
            return isMonumentFound ? 100 : 0;
        }
        if (currentPhase === 'REACH') {
            const playerLevel = useGameStore.getState().session?.player?.playerLevel ?? 0;
            const targetLevel = monument.maxLevel;
            return targetLevel > 0 ? Math.min(100, (playerLevel / targetLevel) * 100) : 100;
        }
        if (currentPhase === 'FIND_KEYS') {
            if (!monumentRequirements || monumentRequirements.length === 0) return 100;
            const total = monumentRequirements.length;
            if (!player?.inventory) return 0;
            
            let matches = 0;
            const tempInventory = [...player.inventory];
            for (const req of monumentRequirements) {
                const matchIdx = tempInventory.findIndex(item => {
                    if (req === 'ANY') return true;
                    if (req === 'COMMON' || req === 'UNCOMMON' || req === 'RARE' || req === 'LEGENDARY') {
                        return item.rarity === req;
                    }
                    if (req === 'ONE_OF') {
                        return (monumentAlternatives ?? []).includes(item.baseId);
                    }
                    return item.baseId === req;
                });
                if (matchIdx !== -1) {
                    matches++;
                    tempInventory.splice(matchIdx, 1);
                }
            }
            return Math.min(100, (matches / total) * 100);
        }
        return 100;
    }, [currentPhase, isMonumentFound, monument, player?.inventory, monumentRequirements, monumentAlternatives]);

    const progressValueText = useMemo(() => {
        if (!monument) return '';
        if (currentPhase === 'FIND') {
            return isMonumentFound ? '1 / 1' : '0 / 1';
        }
        if (currentPhase === 'REACH') {
            const playerLevel = useGameStore.getState().session?.player?.playerLevel ?? 0;
            return `${playerLevel} / ${monument.maxLevel} Lvl`;
        }
        if (currentPhase === 'FIND_KEYS') {
            if (!monumentRequirements || monumentRequirements.length === 0) return '0 / 0';
            const total = monumentRequirements.length;
            if (!player?.inventory) return `0 / ${total}`;
            
            let matches = 0;
            const tempInventory = [...player.inventory];
            for (const req of monumentRequirements) {
                const matchIdx = tempInventory.findIndex(item => {
                    if (req === 'ANY') return true;
                    if (req === 'COMMON' || req === 'UNCOMMON' || req === 'RARE' || req === 'LEGENDARY') {
                        return item.rarity === req;
                    }
                    if (req === 'ONE_OF') {
                        return (monumentAlternatives ?? []).includes(item.baseId);
                    }
                    return item.baseId === req;
                });
                if (matchIdx !== -1) {
                    matches++;
                    tempInventory.splice(matchIdx, 1);
                }
            }
            return `${matches} / ${total} Items`;
        }
        return language === 'RU' ? 'Готов к запуску' : 'Ready to launch';
    }, [currentPhase, isMonumentFound, monument, player?.inventory, monumentRequirements, monumentAlternatives, language]);

    // Auto-expand on phase/text change for visibility
    const lastValueRef = useRef<string>('');
    const currentPhaseWithText = `${currentPhase || ''}_${info?.text || ''}`;
    useEffect(() => {
        if (!info) return;
        if (lastValueRef.current && lastValueRef.current !== currentPhaseWithText) {
            setIsCollapsed(false);
        }
        lastValueRef.current = currentPhaseWithText;
    }, [currentPhase, info, currentPhaseWithText]);

    if (!monument || !info) return null;

    const IconComponent = info.icon;

    const handleToggleCollapse = (e: React.MouseEvent) => {
        e.stopPropagation();
        playUiSound('CLICK');
        setIsCollapsed(prev => !prev);
    };

    return (
        <AnimatePresence mode="wait">
            {isCollapsed ? (
                <motion.div
                    key="collapsed-monument"
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    onClick={handleToggleCollapse}
                    className={`pointer-events-auto cursor-pointer w-full p-2.5 rounded-xl border bg-slate-950/90 backdrop-blur-md shadow-lg flex items-center justify-between gap-3 text-white transition-all hover:bg-slate-900/95 hover:border-amber-500/40 select-none group bg-gradient-to-r ${info.color.includes('from-') ? info.color : ''}`}
                    title={language === 'RU' ? 'Развернуть' : 'Expand'}
                >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="p-1.5 rounded-lg bg-slate-900/90 border border-slate-800 shrink-0 text-amber-400">
                            <IconComponent className="w-4 h-4 text-current animate-pulse" />
                        </div>
                        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-center">
                            <div className="flex items-center justify-between gap-2.5 leading-none">
                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 truncate">
                                    {info.title}
                                </span>
                                <span className="text-[10px] font-mono font-bold text-amber-400 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-900/80 border border-slate-800/60 leading-none">
                                    {progressValueText}
                                </span>
                            </div>
                            
                            {/* Horizontal progress representation */}
                            <div className="w-full bg-slate-950 h-1.5 rounded-full mt-2 overflow-hidden border border-slate-800/55">
                                <div 
                                    className="h-full rounded-full bg-amber-500 transition-all duration-500"
                                    style={{ width: `${currentProgressPercent}%` }}
                                />
                            </div>
                        </div>
                    </div>
                    {/* Expand icon */}
                    <div className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white transition-colors shrink-0 flex items-center justify-center">
                        <ChevronDown className="w-3.5 h-3.5" />
                    </div>
                </motion.div>
            ) : (
                <motion.div
                    key="expanded-monument"
                    initial={{ opacity: 0, y: -10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="pointer-events-auto w-full"
                >
                    <div className={`p-4 rounded-xl border bg-slate-950/92 backdrop-blur-md shadow-2xl flex flex-col gap-3 transition-all duration-300 relative overflow-hidden group border-amber-500/30`}>
                        {/* Header container */}
                        <div className="flex items-center justify-between gap-2.5 border-b border-slate-900 pb-2.5">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                <div className="p-1.5 rounded-lg bg-slate-900/95 border border-slate-800 shrink-0 text-amber-400">
                                    <IconComponent className="w-5 h-5 text-current animate-pulse" />
                                </div>
                                <div className="flex flex-col min-w-0 justify-center">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 leading-none mb-1">
                                        {info.title}
                                    </span>
                                    <span className="text-[8.5px] text-slate-500 uppercase font-bold tracking-widest leading-none">
                                        {language === 'RU' ? 'ДРЕВНИЙ МОНУМЕНТ' : 'ANCIENT MONUMENT'}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Collapse Button */}
                            <button 
                                onClick={handleToggleCollapse}
                                className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center"
                                title={language === 'RU' ? 'Свернуть' : 'Collapse'}
                            >
                                <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                        </div>

                        {/* Text explanation */}
                        <p className="text-xs text-slate-200 font-medium leading-relaxed font-mono">
                            {info.text}
                        </p>

                        {/* Rich Progress indicator box */}
                        <div className="flex flex-col gap-1.5 p-2.5 rounded-lg bg-slate-900/50 border border-slate-800/80 mt-0.5">
                            <div className="flex items-center justify-between text-[11px] font-bold font-mono">
                                <span className="text-slate-400 uppercase tracking-wide text-[9px]">{language === 'RU' ? 'ПРОГРЕСС МОНУМЕНТА' : 'MONUMENT PROGRESS'}</span>
                                <span className="text-amber-400 uppercase font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-850">
                                    {progressValueText}
                                </span>
                            </div>
                            <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                                <div 
                                    className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                                    style={{ width: `${currentProgressPercent}%` }}
                                />
                            </div>
                        </div>

                        <span className="text-[8.5px] text-slate-500 font-bold uppercase tracking-wider font-mono select-none flex items-center gap-1.5">
                            <HelpCircle className="w-3 h-3 text-slate-600" /> 
                            {language === 'RU' ? 'Активируйте монумент для завершения' : 'Activate the monument to complete the loop'}
                        </span>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default React.memo(MonumentHintBanner);
