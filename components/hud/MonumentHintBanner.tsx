import React, { useState, useMemo, useEffect } from 'react';
import { useGameStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, ChevronsUp, Key, Zap, X, HelpCircle } from 'lucide-react';
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
                    text: langRu ? 'Найдите нужные артефакты для активации в шахтах или обелисках' : 'Find the required artifact keys in mines or obelisks',
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

    // Track dismissed text to persist cross-render unless text actually changes
    const [dismissedText, setDismissedText] = useState<string | null>(null);

    // Auto-reset hide state if stage text changes for organic reminder
    useEffect(() => {
        if (info && dismissedText && dismissedText !== info.text) {
            setDismissedText(null);
        }
    }, [info, dismissedText]);

    if (!monument || !info) return null;
    if (dismissedText === info.text) return null;

    const IconComponent = info.icon;

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        playUiSound('CLICK');
        setDismissedText(info.text);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                className="pointer-events-auto cursor-pointer w-full"
                onClick={handleDismiss}
                title={language === 'RU' ? 'Нажмите, чтобы скрыть уведомление' : 'Click to dismiss notification'}
            >
                <div className={`p-3 md:p-4 rounded-xl md:rounded-2xl border bg-slate-950/85 backdrop-blur-md shadow-2xl flex items-start gap-3 transition-all duration-300 hover:bg-slate-900/90 active:scale-98 group bg-gradient-to-br ${info.color}`}>
                    <div className="p-2 md:p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 shrink-0">
                        <IconComponent className="w-5 h-5 md:w-6 md:h-6 text-current animate-pulse" />
                    </div>
                    
                    <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-[10px] md:text-[11px] font-black uppercase tracking-wider text-slate-400 font-sans group-hover:text-white transition-colors">
                                {info.title}
                            </span>
                            <span className="text-[7.5px] md:text-[8.5px] px-1.5 py-0.5 rounded bg-slate-900/60 font-semibold border border-slate-800 uppercase tracking-wider">
                                {info.badge}
                            </span>
                        </div>
                        <p className="text-xs text-white/90 font-medium leading-relaxed mt-1 tracking-tight pr-2">
                            {info.text}
                        </p>
                        <span className="text-[8px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 font-mono select-none flex items-center gap-1 group-hover:text-slate-400 transition-colors">
                            <HelpCircle className="w-2.5 h-2.5 inline" /> {language === 'RU' ? 'Нажмите в любое место, чтобы скрыть' : 'Click anywhere to dismiss'}
                        </span>
                    </div>

                    <button 
                        onClick={handleDismiss}
                        className="p-1 rounded-md text-slate-500 hover:text-white hover:bg-slate-800/40 transition-all active:scale-90"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default React.memo(MonumentHintBanner);
