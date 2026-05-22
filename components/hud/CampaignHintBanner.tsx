import React, { useMemo } from 'react';
import { useGameStore } from '../../store';
import { motion, AnimatePresence } from 'motion/react';
import { Target, CheckCircle, HelpCircle, ChevronUp, ChevronDown } from 'lucide-react';
import { TEXT } from '../../services/i18n';

const CampaignHintBanner: React.FC = () => {
    const activeLevelConfig = useGameStore(state => state.session?.activeLevelConfig);
    const player = useGameStore(state => state.session?.player);
    const grid = useGameStore(state => state.session?.grid);
    const minedHexes = useGameStore(state => state.session?.minedHexes);
    const language = useGameStore(state => state.language);
    const isCampaignHintCollapsed = useGameStore(state => state.isCampaignHintCollapsed);
    const toggleCampaignHintCollapse = useGameStore(state => state.toggleCampaignHintCollapse);
    const playUiSound = useGameStore(state => state.playUiSound);
    const deviceType = useGameStore(state => state.deviceType);
    const isMobile = deviceType === 'MOBILE';
    
    const entropy = useGameStore(state => state.session?.entropy);
    const totalMinedMaterial = useGameStore(state => state.session?.totalMinedMaterial || 0);
    const restoredHexesCount = useGameStore(state => state.session?.restoredHexesCount || 0);

    const totalDigs = useMemo(() => {
        return Object.values(minedHexes || {}).reduce((sum, val) => sum + val, 0);
    }, [minedHexes]);

    const metrics = useMemo(() => {
        if (!grid || !player || !activeLevelConfig) return null;
        const levelId = activeLevelConfig.id;
        const ownedByLevel = (minLvl: number) =>
            Object.values(grid).filter((h: any) => h.ownerId === player.id && h.maxLevel >= minLvl).length;

        if (levelId === '1.1') return { current: Math.max(0, ownedByLevel(1) - 1), target: 3, label: TEXT[language].HUD.TUT_1_1_COUNTER };
        if (levelId === '1.3') return { current: grid[`0,0`]?.maxLevel ?? 0, target: 2, label: 'LEVEL' };
        if (levelId === '1.4') return { current: grid[`0,0`]?.maxLevel ?? 0, target: 3, label: 'LEVEL' };
        if (levelId === '1.5') return { current: player.coins, target: 150, label: TEXT[language].HUD.TUT_1_5_COUNTER };
        if (levelId === '1.6') return { current: player.playerLevel, target: 4, label: 'RANK' };
        if (levelId === '1.7') {
           return { current: restoredHexesCount, target: 5, label: TEXT[language].HUD.TUT_1_7_COUNTER || 'RESTORED' };
        }
        
        if (levelId === '2.2') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        if (levelId === '2.3') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        if (levelId === '2.4') return { current: player.inventory?.length ?? 0, target: 2, label: 'ITEMS' };
        if (levelId === '2.5') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };
        
        if (levelId === '2.6') {
            const playerHex = grid[`${player.q},${player.r}`];
            const depth = playerHex ? -playerHex.currentLevel : 0;
            return { current: Math.max(0, depth), target: 5, label: 'DEPTH' };
        }

        if (levelId === '3.1') return { current: player.inventory?.filter(i => i.id === 'key_fragment').length || 0, target: 3, label: 'KEYS' };
        if (levelId === '3.2') return { current: player.coins, target: 200, label: 'CREDITS' };
        if (levelId === '3.3') return { current: grid[`0,0`]?.maxLevel ?? 0, target: 3, label: 'LEVEL' };
        if (levelId === '3.4') return { current: player.coins, target: 100, label: 'CREDITS' };
        if (levelId === '3.5') return { current: player.inventory?.length ?? 0, target: 3, label: 'ITEMS' };

        if (levelId === '4.1') return { current: ownedByLevel(2), target: 3, label: 'L2 HEXES' };
        if (levelId === '4.3') return { current: ownedByLevel(3), target: 2, label: 'L3 HEXES' };
        if (levelId === '4.4') return { current: grid[`0,0`]?.maxLevel ?? 0, target: 4, label: 'LEVEL' };
        if (levelId === '4.5') return { current: ownedByLevel(2), target: 6, label: 'L2 HEXES' };
        if (levelId === '4.6') return { current: ownedByLevel(3), target: 8, label: 'L3 HEXES' };
        if (levelId === '4.7') return { current: ownedByLevel(4), target: 2, label: 'L4 HEXES' };

        if (levelId === '4.8') {
             const onMon = grid[`${player.q},${player.r}`]?.structureType === 'MONUMENT';
             const isDone = onMon && ownedByLevel(3) >= 3 && player.coins >= 300 && player.inventory.length >= 2 && (entropy?.current ?? 0) < 60;
             return { current: isDone ? 1 : 0, target: 1, label: 'ASCEND' };
        }

        return null;
    }, [grid, player, activeLevelConfig, language, entropy, totalMinedMaterial, totalDigs, restoredHexesCount]);

    const tutorialHint = useMemo(() => {
        if (!grid || !player || !activeLevelConfig) return null;
        const levelId = activeLevelConfig.id;
        const langRu = language === 'RU';
        const pKey = `${player.q},${player.r}`;
        const pHex = grid[pKey];

        if (levelId === '1.1') {
            if (activeLevelConfig.objectiveHexes?.some(t => {
                const k = `${t.q},${t.r}`;
                return k === pKey && grid[k]?.maxLevel < t.targetLevel;
            })) {
                return langRu ? "Вы на месте. Жмите СТРОЙКУ (Оранжевая кнопка)" : "You are here. Click UPGRADE (Orange button)";
            }
            return langRu ? "Встаньте на один из гексов со стрелкой '↑'" : "Move to one of the hexes with an '↑' arrow";
        }
        if (levelId === '1.2') {
             return langRu ? "Двигайтесь по безопасному ПУТИ. Не сходите с него!" : "Follow the safe PATH. Do not step off!";
        }
        if (levelId === '1.3') {
             const centerSupports = [
                 grid['1,-1'], grid['1,0'], grid['0,1'],
                 grid['-1,1'], grid['-1,0'], grid['0,-1']
             ].filter(h => h && h.maxLevel >= 1);
             
             if (centerSupports.length < 2) {
                 return langRu ? "Улучшите 2 гекса вокруг Центра до 1-го уровня для создания опоры." : "Upgrade 2 hexes around the Center to level 1 for support.";
             }
             if (pHex?.q === 0 && pHex?.r === 0) {
                 return langRu ? "Отлично! Теперь улучшайте Центр." : "Great! Now upgrade the Center.";
             }
             return langRu ? "Опора готова. Возвращайтесь в Центр." : "Support ready. Return to the Center.";
        }
        if (levelId === '1.4') {
             if (player.storage === 0) {
                 if (pHex?.maxLevel === 2) {
                      return langRu ? "Вы на насыпи. Жмите РАСКОПКУ (Красная кнопка) для добычи материала." : "You are on a mound. Click DIG (Red button) to extract material.";
                 }
                 return langRu ? "У вас 0 материалов. Встаньте на НАСЫПЬ (Ур.2)." : "You have 0 materials. Move to a MOUND (Lvl 2).";
             }
             if (pHex?.q === 0 && pHex?.r === 0) {
                 return langRu ? "Материал собран. Стройте Центр!" : "Material extracted. Build the Center!";
             }
             return langRu ? "Возвращайтесь в Центр с материалом." : "Return to the Center with the material.";
        }
        if (levelId === '1.5') {
             if (pHex?.maxLevel === 5) {
                  return langRu ? "Используйте ВОССТАНОВЛЕНИЕ (Синяя) для получения +25 Кредитов." : "Use RECOVER (Blue) to gain +25 Credits.";
             }
             return langRu ? "Встаньте на высокие башни (Ур.5) на краях карты." : "Move to the tall towers (Lvl 5) at the edges.";
        }
        if (levelId === '1.6') {
             return langRu ? "Добывайте материалы в шахтах и стройте высоту быстрее бота!" : "Extract materials in mines and build higher, faster than the bot!";
        }
        if (levelId === '1.7') {
             return langRu ? "Встаньте РЯДОМ с Пустотой и кликните на неё, чтобы заделать разлом." : "Stand ADJACENT to the Void and click it to seal the rift.";
        }
        
        if (levelId === '2.1') {
            if (pHex?.maxLevel === 3 && pKey === '0,0') {
                 return langRu ? "Вы на Монолите! Нажмите «АКТИВАЦИЯ»." : "You are on the Monolith! Click 'ACTIVATE'.";
            }
            if (player.moves <= 2 && !player.recoveredCurrentHex) {
                 return langRu ? "Мало энергии. Жмите ВОССТАНОВЛЕНИЕ (Синяя кнопка) прямо здесь!" : "Low energy. Press RECOVER (Blue button) right here!";
            }
            if (pKey === '0,2' || pKey === '0,1') {
                 return langRu ? "Прямой путь закрыт. Обойдите слева." : "Direct path is blocked. Go around left.";
            }
            return langRu ? "Поднимайтесь по левому хребту (ступени 0 → 1 → 2)." : "Climb the left ridge (steps 0 → 1 → 2).";
        }
        
        if (levelId === '2.2') {
            const itemCount = player.inventory?.length || 0;
            if (itemCount >= 3) {
                 if (pKey === '0,0') return langRu ? "Вставьте 3 предмета и жмите АКТИВИРОВАТЬ." : "Insert 3 items and click ACTIVATE.";
                 return langRu ? "Артефакты собраны! Забирайтесь на Монолит в центре." : "Artifacts gathered! Climb to the Monolith in the center.";
            }
            if (pHex?.currentLevel !== undefined && pHex.currentLevel < 0 && pHex.structureType !== 'MONUMENT') {
                 return langRu ? "Вырыта яма. Продолжайте копать в глубину (-2, -3) для повышения шансов лута!" : "Pit dug. Keep digging deeper (-2, -3) for higher loot chances!";
            }
            return langRu ? "Для Монолита нужны 3 артефакта. Встаньте на пустой гекс и КОПАЙТЕ (Красная)!" : "Monolith needs 3 artifacts. Stand on an empty hex and DIG (Red)!";
        }

        if (levelId === '2.3') {
            if (pKey === '0,0') return langRu ? "Жмите АКТИВИРОВАТЬ!" : "Click ACTIVATE!";
            return langRu ? "Каждый шаг тратит Энтропию. Идите по правому краю (Ур. 2 → 3 → 4) без ошибок!" : "Every move drains Entropy. Take the right edge (Lvl 2 → 3 → 4) without mistakes!";
        }

        if (levelId === '2.4') {
            const itemCount = player.inventory?.length || 0;
            if (itemCount >= 2) {
                 if (pKey === '0,0') return langRu ? "Жмите АКТИВИРОВАТЬ быстрее бота!" : "Click ACTIVATE faster than the bot!";
                 return langRu ? "Артефакты у вас! Бегите к Монолиту (Центр) наперегонки с ботом." : "You have artifacts! Race the bot to the Monolith (Center).";
            }
            return langRu ? "Копайте траншею на пути, чтобы собрать 2 артефакта быстрее Соперника!" : "Dig a trench on your way to collect 2 artifacts faster than the Rival!";
        }

        if (levelId === '2.5') {
            const itemCount = player.inventory?.length || 0;
            if (itemCount >= 3) {
                 if (pKey === '0,0') return langRu ? "Жмите АКТИВИРОВАТЬ!" : "Click ACTIVATE!";
                 return langRu ? "У вас 3 предмета! Немедленно поднимайтесь по спирали на вершину (Ур. 5)!" : "You have 3 items! Quickly climb the spiral to the top (Lvl 5)!";
            }
            return langRu ? "Соберите 3 артефакта, копая гексы, и захватите Вершину раньше ботов!" : "Collect 3 artifacts by digging hexes and claim the Summit before the bots!";
        }

        if (levelId === '2.6') {
             if (pHex?.currentLevel !== undefined && pHex.currentLevel < -1) {
                  return langRu ? "Расширяйте кратер! Копайте соседние ячейки, чтобы укрепить стенки и спуститься глубже." : "Widen the crater! Dig adjacent hexes to fortify walls and descend deeper.";
             }
             return langRu ? "Новое правило: Для копания на глубину -2 и ниже нужно, чтобы 2 соседа были той же глубины." : "New Rule: Digging to -2 or below requires 2 neighbors at the same depth.";
        }

        return null; // fallback
    }, [grid, player, activeLevelConfig, language]);

    if (!activeLevelConfig || !metrics) return null;

    const isCompleted = metrics.current >= metrics.target;
    const progressPercent = Math.min(100, (metrics.current / metrics.target) * 100);

    return (
        <AnimatePresence>
            {!isCampaignHintCollapsed && (
                <motion.div
                    initial={{ opacity: 0, y: isMobile ? 20 : -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: isMobile ? 20 : -20, scale: 0.95 }}
                    className="pointer-events-auto w-full"
                    id="campaign-hint-banner"
                >
                    <div className="p-3 md:p-4 rounded-xl md:rounded-2xl border bg-slate-950/85 backdrop-blur-md shadow-2xl flex flex-col gap-2 transition-all duration-300">
                        <div className="flex items-center gap-2">
                             <div className="p-2 rounded-lg bg-indigo-900/40 border border-indigo-500/30">
                                {isCompleted ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : <Target className="w-5 h-5 text-indigo-400" />}
                             </div>
                             <div className="flex flex-col flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">
                                    {language === 'RU' ? 'ЗАДАЧА СИМУЛЯЦИИ' : 'SIMULATION OBJECTIVE'}
                                </span>
                                <span className="text-xs font-black text-white truncate leading-none uppercase">
                                    {activeLevelConfig.goalText}
                                </span>
                             </div>
                             <button
                                 onClick={(e) => { e.stopPropagation(); toggleCampaignHintCollapse(); playUiSound('CLICK'); }}
                                 className="p-1 px-1.5 rounded bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors shrink-0 cursor-pointer flex items-center justify-center touch-manipulation"
                                 title={language === 'RU' ? 'Свернуть' : 'Collapse'}
                                 id="campaign-hint-collapse-btn"
                             >
                                 {isMobile ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
                             </button>
                        </div>
                        {/* Progress */}
                        <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-slate-900/60 border border-slate-800 mt-1">
                             <div className="flex items-center justify-between text-xs font-bold font-mono">
                                 <span className="text-slate-300 uppercase shrink truncate">{metrics.label}</span>
                                 <span className={isCompleted ? "text-emerald-400" : "text-amber-400"}>
                                     {metrics.current} / {metrics.target}
                                 </span>
                             </div>
                             <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                 <div 
                                     className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                     style={{ width: `${progressPercent}%` }}
                                 />
                             </div>
                        </div>
                        
                        {tutorialHint && !isCompleted && (
                            <div className="mt-1 p-2 md:p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex flex-col md:flex-row items-baseline md:items-start gap-1.5 md:gap-2.5">
                                <div className="flex items-center gap-1.5 shrink-0 text-indigo-400 font-black text-[10px] uppercase tracking-widest leading-none pt-0.5">
                                    <HelpCircle className="w-3 h-3 animate-pulse" />
                                </div>
                                <p className="text-[11px] md:text-xs text-indigo-200/90 font-medium leading-normal md:leading-relaxed">
                                    {tutorialHint}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default CampaignHintBanner;
