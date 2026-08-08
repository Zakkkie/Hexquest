import { Item, ItemRarity } from '../../types';
import { getItemDef } from '../../rules/items';

export const getRarityBorder = (rarity: ItemRarity) => {
    switch(rarity) {
        case 'COMMON': return 'border-slate-400';
        case 'UNCOMMON': return 'border-emerald-400';
        case 'RARE': return 'border-purple-500';
        case 'LEGENDARY': return 'border-amber-500 animate-pulse';
        default: return 'border-slate-600';
    }
};

export const resolveItemText = (item: Item, language: 'EN' | 'RU') => {
    const def = getItemDef(item.baseId);
    if (!def) return { 
        name: item.name, 
        description: item.description, 
        effectDesc: item.effectDescription, 
        negDesc: item.negativeEffectLabel
    };

    let effectDesc = def.effectLabel[language];

    // Append beautiful passive information if the item is equipable
    if (def.equipSlot) {
        const isRu = language === 'RU';
        const passivePrefix = isRu ? '\n[Экипировка]: ' : '\n[Equipment]: ';
        let passiveText = '';

        if (def.equipSlot === 'body') {
            const hp = def.maxHpBonus || 15;
            const res = Math.round(hp * 0.75);
            const fs = Math.floor(hp / 10);
            passiveText = isRu 
                ? `Пассивно поглощает ${res}% потерь Энтропии и укрепляет стабильность на +${fs}.`
                : `Passively blocks ${res}% of Entropy loss and reinforces stability by +${fs}.`;
        } else if (def.equipSlot === 'feet') {
            const energy = def.maxEnergyBonus || 10;
            passiveText = isRu
                ? `Снижает расход энергии на перемещение на -${energy}% и ускоряет перезарядку.`
                : `Reduces move energy cost by -${energy}% and speeds up recharging.`;
        } else if (def.equipSlot === 'head') {
            const scanBonus = def.idPrefix.includes('scanner') || def.idPrefix.includes('visor') ? 2 : 1;
            passiveText = isRu
                ? `Обеспечивает постоянный обзор в радиусе +${scanBonus} гекс.`
                : `Provides continuous sensor range boost of +${scanBonus} hexes.`;
        } else if (def.equipSlot === 'ring' || def.equipSlot === 'necklace') {
            passiveText = isRu
                ? `Приносит +20% бонуса ко всем получаемым Кредитам и улучшает курс конвертации.`
                : `Grants +20% bonus to all Credit gains and improves conversion rates.`;
        } else if (def.equipSlot === 'tool') {
            let mult = 15;
            let dChance = 0;
            if (def.idPrefix.includes('plasma_drill')) { mult = 50; dChance = 25; }
            else if (def.idPrefix.includes('hornet_drill')) { mult = 80; dChance = 35; }
            else if (def.idPrefix.includes('pickaxe')) { mult = 25; dChance = 50; }
            
            passiveText = isRu
                ? `Увеличивает награду от раскопок на +${mult}%${dChance > 0 ? ` с шансом ${dChance}% двойной добычи` : ''}.`
                : `Increases excavation rewards by +${mult}%${dChance > 0 ? ` with a ${dChance}% chance of double yield` : ''}.`;
        } else if (def.equipSlot === 'artifact') {
            if (def.idPrefix === 'cargo_prism') {
                passiveText = isRu
                    ? `Увеличивает максимальную ёмкость хранилища и ускоряет рост на +2 эпохи.`
                    : `Expands maximum material storage capacity and speeds up growth by +2 epochs.`;
            } else if (def.idPrefix === 'chronos_core') {
                passiveText = isRu
                    ? `Глубоко искривляет время: +4 к скорости роста эпох и ускоряет перезарядку.`
                    : `Deeply warps time: +4 epochs growth rate and boosts recharge power.`;
            } else if (def.idPrefix === 'apex_core') {
                passiveText = isRu
                    ? `Наномашины ядра дают +5 к скорости роста, +50% к Кредитам и 50% защиты от распада.`
                    : `Core nanites grant +5 to growth speed, +50% to Credit gains, and 50% reality protection.`;
            } else if (def.idPrefix === 'midas_chip') {
                passiveText = isRu
                    ? `Интегрированный чип умножает весь получаемый доход на +75%.`
                    : `Integrated chip multiplies all credit revenues by +75%.`;
            } else {
                passiveText = isRu
                    ? `Генерирует резонансное поле, ускоряющее эволюцию секторов.`
                    : `Generates a resonant field that accelerates sector evolution.`;
            }
        }

        if (passiveText) {
            effectDesc = effectDesc ? `${effectDesc}${passivePrefix}${passiveText}` : `${passivePrefix.trim()}${passiveText}`;
        }
    }

    return {
        name: def.name[language],
        description: def.description[language],
        effectDesc,
        negDesc: def.negativeEffectLabel[language]
    };
};
