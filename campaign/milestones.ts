export interface Milestone {
    id: string;
    goal: number;
    titleEN: string;
    titleRU: string;
    descEN: string;
    descRU: string;
    iconName: string;
}

export const ECONOMIC_MILESTONES: Milestone[] = [
    {
        id: 'corp_tier_1',
        goal: 500,
        titleEN: 'Tier 1: Contractor',
        titleRU: 'Тир 1: Подрядчик',
        descEN: 'Start with +1 Fuel per mission.',
        descRU: 'Старт с +1 Топлива в миссии.',
        iconName: 'TrendingUp'
    },
    {
        id: 'corp_tier_2',
        goal: 1500,
        titleEN: 'Tier 2: Tax Haven',
        titleRU: 'Тир 2: Налоговый Рай',
        descEN: '+10% bonus entirely to all passive income generated.',
        descRU: '+10% бонус ко всему пассивному доходу.',
        iconName: 'Coins'
    },
    {
        id: 'corp_tier_3',
        goal: 4000,
        titleEN: 'Tier 3: Excavation Co.',
        titleRU: 'Тир 3: Буровая Комп.',
        descEN: 'Starting Materials stock increased by +3.',
        descRU: 'Стартовые материалы увеличены на 3.',
        iconName: 'Layers'
    },
    {
        id: 'corp_tier_4',
        goal: 10000,
        titleEN: 'Tier 4: Global Syndicate',
        titleRU: 'Тир 4: Глобальный Синдикат',
        descEN: 'All L4+ Thermoreactors yield +1 permanent recovery charge.',
        descRU: 'Термореакторы L4+ дают +1 заряд восстановления навсегда.',
        iconName: 'Zap'
    },
    {
        id: 'corp_tier_5',
        goal: 25000,
        titleEN: 'Tier 5: Galactic Monopolist',
        titleRU: 'Тир 5: Галактический Монополист',
        descEN: '+25% permanent multiplier to all economy & +1 Fog of War vision.',
        descRU: '+25% постоянный множитель экономики и +1 радиус обзора Тумана Войны.',
        iconName: 'Star'
    }
];

export function getMilestoneModifiers(_totalGoldEarned: number) {
    return {
        extraFuel: 0,
        extraIncomeMult: 0,
        extraStartingMats: 0,
        extraRecoveryCharges: 0,
        extraVision: 0
    };
}
