import { useMemo } from 'react';
import { useGameStore } from '../../store';
import { Compass, ChevronsUp, Key, Zap } from 'lucide-react';
import { Hex } from '../../types';

export function useMonumentProgress() {
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

    const currentProgressPercent = useMemo(() => {
        if (currentPhase === 'FIND') return isMonumentFound ? 100 : 0;
        if (currentPhase === 'REACH') {
            const playerLevel = useGameStore.getState().session?.player?.playerLevel ?? 0;
            const targetLevel = monument?.maxLevel ?? 0;
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
            return `${matches} / ${total}`;
        }
        return '100%';
    }, [currentPhase, isMonumentFound, monument, player?.inventory, monumentRequirements, monumentAlternatives]);

    return { monument, info, progressValueText, currentProgressPercent, currentPhase };
}
