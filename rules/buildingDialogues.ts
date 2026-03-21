import { BuildingDialogue } from '../types';

// ─── Inn ─────────────────────────────────────────────────────────────────────

const inn: BuildingDialogue = {
    id: 'city_inn',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Innkeeper Borya', RU: 'Трактирщик Боря' },
            text: {
                EN: 'Welcome, traveler. You look weary. Rest is cheap here — bodies mend faster than reputations.',
                RU: 'Добро пожаловать, путник. Выглядишь уставшим. Отдых у нас недорогой — тело восстанавливается быстрее, чем репутация.',
            },
            choices: [
                { label: { EN: 'Rest a while (−35 cr, +30 HP +5 En)', RU: 'Передохнуть (−35 кр, +30 HP +5 Эн)' }, action: 'GOTO_NODE', nextNode: 'rested_partial', reqCredits: 35, penalty: { credits: 35 }, reward: { energy: 5 }, service: { type: 'REST_PARTIAL', hpAmount: 30 } },
                { label: { EN: 'Full night\'s rest (−60 cr, full HP +15 En)', RU: 'Полный отдых (−60 кр, полное HP +15 Эн)' }, action: 'GOTO_NODE', nextNode: 'rested_full', reqCredits: 60, penalty: { credits: 60 }, reward: { energy: 15 }, service: { type: 'REST_FULL' } },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        rested_partial: {
            id: 'rested_partial',
            npcName: { EN: 'Innkeeper Borya', RU: 'Трактирщик Боря' },
            text: {
                EN: 'Here, a bowl of stew and a corner by the fire. Not glamorous, but you\'ll feel better.',
                RU: 'Вот, тарелка похлёбки и место у огня. Не шикарно, но полегчает.',
            },
            choices: [{ label: { EN: 'Thank you', RU: 'Спасибо' }, action: 'CLOSE' }],
        },
        rested_full: {
            id: 'rested_full',
            npcName: { EN: 'Innkeeper Borya', RU: 'Трактирщик Боря' },
            text: {
                EN: 'A proper room, a proper meal. You wake refreshed. The road ahead looks less grim.',
                RU: 'Нормальная комната, нормальная еда. Просыпаешься бодрым. Дорога впереди выглядит не так мрачно.',
            },
            choices: [{ label: { EN: 'Ready to go', RU: 'Готов идти' }, action: 'CLOSE' }],
        },
    },
};

// ─── Healer ───────────────────────────────────────────────────────────────────

const healer: BuildingDialogue = {
    id: 'city_healer',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Healer Mirya', RU: 'Целительница Мирья' },
            text: {
                EN: 'I sense wounds — old and new. I can help, for the right price. Credits keep the herbs stocked.',
                RU: 'Я чувствую раны — старые и свежие. Смогу помочь, по справедливой цене. Монеты пополняют запасы трав.',
            },
            choices: [
                { label: { EN: 'Full healing (−60 cr)', RU: 'Полное лечение (−60 кр)' }, action: 'GOTO_NODE', nextNode: 'healed', reqCredits: 60, penalty: { credits: 60 }, service: { type: 'REST_FULL' } },
                { label: { EN: 'Quick patch (−25 cr, +15 HP)', RU: 'Быстрое лечение (−25 кр, +15 HP)' }, action: 'GOTO_NODE', nextNode: 'patched', reqCredits: 25, penalty: { credits: 25 }, service: { type: 'REST_PARTIAL', hpAmount: 15 } },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        healed: {
            id: 'healed',
            npcName: { EN: 'Healer Mirya', RU: 'Целительница Мирья' },
            text: {
                EN: 'Breathe. The herbs have done their work. You are whole again.',
                RU: 'Дыши. Травы сделали своё дело. Ты снова в порядке.',
            },
            choices: [{ label: { EN: 'Much better', RU: 'Намного лучше' }, action: 'CLOSE' }],
        },
        patched: {
            id: 'patched',
            npcName: { EN: 'Healer Mirya', RU: 'Целительница Мирья' },
            text: {
                EN: 'Bandaged and cleaned. Not perfect, but you\'ll survive the next hour.',
                RU: 'Перевязала, промыла. Не идеально, но следующий час переживёшь.',
            },
            choices: [{ label: { EN: 'Thanks', RU: 'Спасибо' }, action: 'CLOSE' }],
        },
    },
};

// ─── Market ───────────────────────────────────────────────────────────────────

const market: BuildingDialogue = {
    id: 'city_market',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Merchant Dova', RU: 'Торговец Дова' },
            text: {
                EN: 'The Big Market — if it exists, someone\'s selling it here. What do you need?',
                RU: 'Большой Рынок — если что-то существует, здесь это продают. Что нужно?',
            },
            choices: [
                { label: { EN: 'Buy supplies (−30 cr, +20 Energy)', RU: 'Купить припасы (−30 кр, +20 Энергии)' }, action: 'GOTO_NODE', nextNode: 'bought_supplies', reqCredits: 30, penalty: { credits: 30 }, reward: { energy: 20 } },
                { label: { EN: 'Buy energy tonic (−40 cr, +40 Energy)', RU: 'Купить тоник (−40 кр, +40 Энергии)' }, action: 'GOTO_NODE', nextNode: 'bought_tonic', reqCredits: 40, penalty: { credits: 40 }, reward: { energy: 40 } },
                { label: { EN: 'Sell loot (not yet available)', RU: 'Продать добычу (недоступно)' }, action: 'GOTO_NODE', nextNode: 'sell_unavailable' },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        bought_supplies: {
            id: 'bought_supplies',
            npcName: { EN: 'Merchant Dova', RU: 'Торговец Дова' },
            text: {
                EN: 'A ration kit — compressed field provisions. Won\'t fill your stomach, but it\'ll keep you moving.',
                RU: 'Набор сухпайка — прессованные полевые припасы. Желудок не набьёшь, зато на ногах удержишься.',
            },
            choices: [{ label: { EN: 'Good', RU: 'Хорошо' }, action: 'CLOSE' }],
        },
        bought_tonic: {
            id: 'bought_tonic',
            npcName: { EN: 'Merchant Dova', RU: 'Торговец Дова' },
            text: {
                EN: 'Straight from the alchemist\'s lab. Don\'t ask what\'s in it.',
                RU: 'Прямо из лаборатории алхимика. Не спрашивай, что внутри.',
            },
            choices: [{ label: { EN: 'Noted', RU: 'Учту' }, action: 'CLOSE' }],
        },
        sell_unavailable: {
            id: 'sell_unavailable',
            npcName: { EN: 'Merchant Dova', RU: 'Торговец Дова' },
            text: {
                EN: 'My buyer\'s not in today. Come back another time.',
                RU: 'Скупщик сегодня не пришёл. Заходи в другой раз.',
            },
            choices: [{ label: { EN: 'Fine', RU: 'Ладно' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
    },
};

// ─── Blacksmith ───────────────────────────────────────────────────────────────

const blacksmith: BuildingDialogue = {
    id: 'city_blacksmith',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Blacksmith Kram', RU: 'Кузнец Крам' },
            text: {
                EN: 'You want something forged or sharpened? Show me what you\'ve got. I don\'t work for free, but I work well.',
                RU: 'Ковать или точить? Покажи, что принёс. Даром не работаю, но работаю хорошо.',
            },
            choices: [
                { label: { EN: 'Repair tools (−40 cr, +20 HP)', RU: 'Починить снарягу (−40 кр, +20 HP)' }, action: 'GOTO_NODE', nextNode: 'repaired', reqCredits: 40, penalty: { credits: 40 }, service: { type: 'REST_PARTIAL', hpAmount: 20 } },
                { label: { EN: 'Forge armor (−100 cr, full heal)', RU: 'Скуй броню (−100 кр, полное HP)' }, action: 'GOTO_NODE', nextNode: 'armored', reqCredits: 100, penalty: { credits: 100 }, service: { type: 'REST_FULL' } },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        repaired: {
            id: 'repaired',
            npcName: { EN: 'Blacksmith Kram', RU: 'Кузнец Крам' },
            text: {
                EN: 'Good as new. Treat it better this time.',
                RU: 'Как новое. В следующий раз бережнее.',
            },
            choices: [{ label: { EN: 'Will do', RU: 'Буду' }, action: 'CLOSE' }],
        },
        armored: {
            id: 'armored',
            npcName: { EN: 'Blacksmith Kram', RU: 'Кузнец Крам' },
            text: {
                EN: 'That\'s real craftsmanship. You\'ll take more hits before you fall.',
                RU: 'Вот это настоящая работа. Теперь выдержишь больше ударов.',
            },
            choices: [{ label: { EN: 'Impressive', RU: 'Впечатляет' }, action: 'CLOSE' }],
        },
    },
};

// ─── Tavern ───────────────────────────────────────────────────────────────────

const tavern: BuildingDialogue = {
    id: 'city_tavern',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Barkeeper Roza', RU: 'Барменша Роза' },
            text: {
                EN: '"Three Crossroads" — where rumors flow as freely as the ale. Sit down, stranger.',
                RU: '«Три перекрёстка» — где слухи текут так же свободно, как эль. Присаживайся, незнакомец.',
            },
            choices: [
                { label: { EN: 'Buy a drink (−15 cr, +5 Energy)', RU: 'Купить выпивку (−15 кр, +5 Энергии)' }, action: 'GOTO_NODE', nextNode: 'drinking', reqCredits: 15, penalty: { credits: 15 }, reward: { energy: 5 } },
                { label: { EN: 'Ask about rumors', RU: 'Расспросить о слухах' }, action: 'GOTO_NODE', nextNode: 'rumors' },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        drinking: {
            id: 'drinking',
            npcName: { EN: 'Barkeeper Roza', RU: 'Барменша Роза' },
            text: {
                EN: 'There you go. Local brew. Burns going down, but warms you up.',
                RU: 'Вот, держи. Местное варево. Дерёт горло, но согревает.',
            },
            choices: [{ label: { EN: 'Another round?', RU: 'Ещё один?' }, action: 'GOTO_NODE', nextNode: 'greeting' }, { label: { EN: 'That\'s enough', RU: 'Хватит' }, action: 'CLOSE' }],
        },
        rumors: {
            id: 'rumors',
            npcName: { EN: 'Barkeeper Roza', RU: 'Барменша Роза' },
            text: {
                EN: 'Heard the eastern rifts are getting more unstable. Void creatures showing up closer to the city. The Order\'s been quiet about it — which worries me more than the news itself.',
                RU: 'Говорят, восточные разломы становятся нестабильнее. Существа пустоты появляются ближе к городу. Орден молчит об этом — а это тревожит больше, чем сами новости.',
            },
            choices: [{ label: { EN: 'Interesting...', RU: 'Интересно...' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
    },
};

// ─── Temple ───────────────────────────────────────────────────────────────────

const temple: BuildingDialogue = {
    id: 'city_temple',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Priest Vel', RU: 'Жрец Вел' },
            text: {
                EN: 'The Temple of the Builders stands eternal. The Cascade did not touch these stones. What brings you here, seeker?',
                RU: 'Храм Строителей стоит вечно. Каскад не тронул эти камни. Что привело тебя сюда, искатель?',
            },
            choices: [
                { label: { EN: 'Pray for luck (−20 cr)', RU: 'Помолиться об удаче (−20 кр)' }, action: 'GOTO_NODE', nextNode: 'prayed', reqCredits: 20, penalty: { credits: 20 }, reward: { energy: 10 } },
                { label: { EN: 'Ask about the Builders', RU: 'Спросить о Строителях' }, action: 'GOTO_NODE', nextNode: 'lore' },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        prayed: {
            id: 'prayed',
            npcName: { EN: 'Priest Vel', RU: 'Жрец Вел' },
            text: {
                EN: 'The Builders hear all who kneel in good faith. Go — fortune favors the prepared.',
                RU: 'Строители слышат тех, кто склоняется с чистыми помыслами. Иди — удача благоволит подготовленным.',
            },
            choices: [{ label: { EN: 'Thank you', RU: 'Спасибо' }, action: 'CLOSE' }],
        },
        lore: {
            id: 'lore',
            npcName: { EN: 'Priest Vel', RU: 'Жрец Вел' },
            text: {
                EN: 'They built the Hexgrid before memory began. Layer upon layer, each hex a deliberate choice. When the Cascade hit, most knowledge was lost — but the grid remains. And those who understand it... they hold the key.',
                RU: 'Они создали Гексагрид до начала памяти. Слой за слоем, каждый гекс — осознанный выбор. Когда грянул Каскад, большая часть знаний была утеряна — но сеть осталась. И те, кто её понимает... держат ключ.',
            },
            choices: [{ label: { EN: 'Thought-provoking', RU: 'Есть о чём подумать' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
    },
};

// ─── Archive ──────────────────────────────────────────────────────────────────

const archive: BuildingDialogue = {
    id: 'city_archive',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Archivist Shen', RU: 'Архивист Шен' },
            text: {
                EN: 'This archive holds records from before the Cascade. Most are fragmented — but even fragments illuminate. What do you seek?',
                RU: 'Этот архив хранит записи до Каскада. Большинство фрагментированы — но даже фрагменты просветляют. Что ищешь?',
            },
            choices: [
                { label: { EN: 'Read hex-grid lore', RU: 'Прочитать о гексагриде' }, action: 'GOTO_NODE', nextNode: 'lore_hex' },
                { label: { EN: 'Search for patterns', RU: 'Искать закономерности' }, action: 'GOTO_NODE', nextNode: 'patterns' },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        lore_hex: {
            id: 'lore_hex',
            npcName: { EN: 'Archivist Shen', RU: 'Архивист Шен' },
            text: {
                EN: 'The Builders designed hex-layers as energy conduits. Each level above ground amplified the signal. Below — they extracted raw void-matter. The deeper you go, the older the substrate.',
                RU: 'Строители проектировали гекс-слои как энергетические каналы. Каждый уровень над землёй усиливал сигнал. Ниже — добывали сырую материю пустоты. Чем глубже — тем древнее субстрат.',
            },
            choices: [{ label: { EN: 'Fascinating', RU: 'Впечатляет' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
        patterns: {
            id: 'patterns',
            npcName: { EN: 'Archivist Shen', RU: 'Архивист Шен' },
            text: {
                EN: 'I\'ve catalogued anomalies in sector collapse rates. The Void spreads fastest where L1 hexes were left unsupported. The Builders knew this — their designs always had structural redundancy.',
                RU: 'Я каталогизировал аномалии в темпах коллапса секторов. Пустота распространяется быстрее там, где гексы L1 остались без поддержки. Строители знали это — их проекты всегда имели структурную избыточность.',
            },
            choices: [{ label: { EN: 'Useful to know', RU: 'Полезно знать' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
    },
};

// ─── Alchemist ────────────────────────────────────────────────────────────────

const alchemist: BuildingDialogue = {
    id: 'city_alchemist',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Alchemist Zel', RU: 'Алхимик Зел' },
            text: {
                EN: 'Potions, compounds, catalysts — I brew them all. My specialty: entropy stabilizers. But I\'m low on reagents right now.',
                RU: 'Зелья, составы, катализаторы — варю всё. Специализация: стабилизаторы энтропии. Но сейчас мало реагентов.',
            },
            choices: [
                { label: { EN: 'Buy stability potion (−45 cr)', RU: 'Купить зелье стабилизации (−45 кр)' }, action: 'GOTO_NODE', nextNode: 'bought_potion', reqCredits: 45, penalty: { credits: 45 }, reward: { energy: 20, hp: 10 } },
                { label: { EN: 'Ask about craft (coming soon)', RU: 'Спросить о крафте (скоро)' }, action: 'GOTO_NODE', nextNode: 'wip' },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        bought_potion: {
            id: 'bought_potion',
            npcName: { EN: 'Alchemist Zel', RU: 'Алхимик Зел' },
            text: { EN: 'Handle with care. And don\'t shake it.', RU: 'Осторожно. И не трясти.' },
            choices: [{ label: { EN: 'Understood', RU: 'Понял' }, action: 'CLOSE' }],
        },
        wip: {
            id: 'wip',
            npcName: { EN: 'Alchemist Zel', RU: 'Алхимик Зел' },
            text: { EN: 'Still perfecting the process. Check back later.', RU: 'Ещё дорабатываю. Зайди позже.' },
            choices: [{ label: { EN: 'Will do', RU: 'Хорошо' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
    },
};

// ─── Guard Post ───────────────────────────────────────────────────────────────

const guard_post: BuildingDialogue = {
    id: 'city_guard_post',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Guard Captain Turo', RU: 'Начальник стражи Туро' },
            text: {
                EN: 'Syndicate business. State your purpose or move along.',
                RU: 'Дела Синдиката. Назови цель или проходи.',
            },
            choices: [
                { label: { EN: 'Report void activity (coming soon)', RU: 'Сообщить об активности Пустоты (скоро)' }, action: 'GOTO_NODE', nextNode: 'wip' },
                { label: { EN: 'Ask about bounties (coming soon)', RU: 'Узнать о наградах (скоро)' }, action: 'GOTO_NODE', nextNode: 'wip' },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        wip: {
            id: 'wip',
            npcName: { EN: 'Guard Captain Turo', RU: 'Начальник стражи Туро' },
            text: { EN: 'Nothing posted today. Check the notice board.', RU: 'Сегодня пусто. Проверь доску объявлений.' },
            choices: [{ label: { EN: 'Right', RU: 'Ясно' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
    },
};

// ─── Watchtower ───────────────────────────────────────────────────────────────

const watchtower: BuildingDialogue = {
    id: 'city_watchtower',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Lookout Finn', RU: 'Дозорный Финн' },
            text: {
                EN: 'You can see for leagues from up here — if you know what to look for. The fog hides most of it.',
                RU: 'Отсюда видно на многие мили — если знаешь, что искать. Туман скрывает большую часть.',
            },
            choices: [
                { label: { EN: 'Survey the region (−30 cr)', RU: 'Обозреть окрестности (−30 кр)' }, action: 'GOTO_NODE', nextNode: 'surveyed', reqCredits: 30, penalty: { credits: 30 }, service: { type: 'FOG_REVEAL', radius: 5 } },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        surveyed: {
            id: 'surveyed',
            npcName: { EN: 'Lookout Finn', RU: 'Дозорный Финн' },
            text: { EN: 'Marked the landmarks on your map. Stay sharp out there.', RU: 'Отметил ориентиры на твоей карте. Будь осторожен.' },
            choices: [{ label: { EN: 'Thanks', RU: 'Спасибо' }, action: 'CLOSE' }],
        },
    },
};

// ─── Notice Board ─────────────────────────────────────────────────────────────

const notice_board: BuildingDialogue = {
    id: 'city_notice_board',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Notice Board', RU: 'Доска объявлений' },
            text: {
                EN: 'Pinned notices from citizens, merchants, and the city council. Most are requests, some are warnings.',
                RU: 'Объявления от жителей, торговцев и городского совета. Большинство — просьбы, некоторые — предупреждения.',
            },
            choices: [
                { label: { EN: 'Read the urgent notices', RU: 'Прочитать срочные объявления' }, action: 'GOTO_NODE', nextNode: 'urgent' },
                { label: { EN: 'Read bounties (coming soon)', RU: 'Прочитать о наградах (скоро)' }, action: 'GOTO_NODE', nextNode: 'wip' },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        urgent: {
            id: 'urgent',
            npcName: { EN: 'Notice Board', RU: 'Доска объявлений' },
            text: {
                EN: '"MISSING: Two surveyors last seen near the eastern rift gate. Reward offered. Contact the Guard Post." — "WARNING: Do not approach hexes below L−5 without stabilizer equipment."',
                RU: '"ПРОПАЛИ: Двое землемеров, последний раз замечены у восточных врат разлома. Вознаграждение. Обратиться в пост стражи." — "ПРЕДУПРЕЖДЕНИЕ: Не приближаться к гексам ниже L−5 без стабилизирующего снаряжения."',
            },
            choices: [{ label: { EN: 'Noted', RU: 'Принято к сведению' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
        wip: {
            id: 'wip',
            npcName: { EN: 'Notice Board', RU: 'Доска объявлений' },
            text: { EN: 'No active bounties posted today.', RU: 'Сегодня активных наград нет.' },
            choices: [{ label: { EN: 'Back', RU: 'Назад' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
    },
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const storage: BuildingDialogue = {
    id: 'city_storage',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'Storekeeper Mava', RU: 'Хранительница Мава' },
            text: {
                EN: 'Running out of pack space? I rent storage — cheapest in the city. Expand your carry capacity.',
                RU: 'Не хватает места в мешке? Аренда ячеек — дешевле некуда в городе. Расширь вместимость.',
            },
            choices: [
                { label: { EN: 'Expand bag +2 slots (−60 cr)', RU: 'Расширить мешок +2 ячейки (−60 кр)' }, action: 'GOTO_NODE', nextNode: 'expanded', reqCredits: 60, penalty: { credits: 60 }, service: { type: 'EXPAND_BAG', slots: 2 } },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        expanded: {
            id: 'expanded',
            npcName: { EN: 'Storekeeper Mava', RU: 'Хранительница Мава' },
            text: { EN: 'Done. Your pack feels roomier already.', RU: 'Готово. Мешок уже ощущается просторнее.' },
            choices: [{ label: { EN: 'Perfect', RU: 'Отлично' }, action: 'CLOSE' }],
        },
    },
};

// ─── Hub (Central Plaza) ──────────────────────────────────────────────────────

const hub: BuildingDialogue = {
    id: 'city_hub',
    startNodeId: 'greeting',
    nodes: {
        greeting: {
            id: 'greeting',
            npcName: { EN: 'City Guide Ama', RU: 'Городской гид Ама' },
            text: {
                EN: 'The Central Plaza — heart of HexHaven. From here you can reach every quarter. The city grew around this hex; the Builders placed it intentionally.',
                RU: 'Центральная площадь — сердце Гексхейвена. Отсюда можно попасть в любой квартал. Город вырос вокруг этого гекса; Строители разместили его намеренно.',
            },
            choices: [
                { label: { EN: 'Ask about the city history', RU: 'Спросить об истории города' }, action: 'GOTO_NODE', nextNode: 'history' },
                { label: { EN: 'Get directions', RU: 'Узнать дорогу' }, action: 'GOTO_NODE', nextNode: 'directions' },
                { label: { EN: 'Leave', RU: 'Уйти' }, action: 'CLOSE' },
            ],
        },
        history: {
            id: 'history',
            npcName: { EN: 'City Guide Ama', RU: 'Городской гид Ама' },
            text: {
                EN: 'HexHaven survived the Cascade because the walls were built to the Builders\' original spec — L6 stone, indestructible. The gates were designed to open when entropy stabilized. We\'ve been waiting a long time.',
                RU: 'Гексхейвен пережил Каскад, потому что стены построены по оригинальным чертежам Строителей — камень L6, неразрушимый. Ворота были спроектированы открываться при стабилизации энтропии. Мы ждём уже долго.',
            },
            choices: [{ label: { EN: 'Remarkable', RU: 'Удивительно' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
        directions: {
            id: 'directions',
            npcName: { EN: 'City Guide Ama', RU: 'Городской гид Ама' },
            text: {
                EN: 'Inn and Healer to the north. Market and Blacksmith to the east. Temple and Archive to the south. Tavern and Alchemist to the west. Guard Post and Watchtower flank the main gate.',
                RU: 'Трактир и лечебница — на севере. Рынок и кузница — на востоке. Храм и архив — на юге. Таверна и алхимик — на западе. Пост стражи и дозорная башня — у главных ворот.',
            },
            choices: [{ label: { EN: 'Thanks for the tour', RU: 'Спасибо за экскурсию' }, action: 'GOTO_NODE', nextNode: 'greeting' }],
        },
    },
};

// ─── Registry ─────────────────────────────────────────────────────────────────

export const BUILDING_DIALOGUE_REGISTRY: Record<string, BuildingDialogue> = {
    city_inn:          inn,
    city_healer:       healer,
    city_market:       market,
    city_blacksmith:   blacksmith,
    city_tavern:       tavern,
    city_temple:       temple,
    city_archive:      archive,
    city_alchemist:    alchemist,
    city_guard_post:   guard_post,
    city_watchtower:   watchtower,
    city_notice_board: notice_board,
    city_storage:      storage,
    city_hub:          hub,
};
