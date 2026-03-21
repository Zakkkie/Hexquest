import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useGameStore } from '../store';
import { 
  X, 
  User, 
  Beer, 
  Landmark, 
  ShoppingBag, 
  Hammer, 
  Coins,
  MessageSquare,
  ArrowRight,
  ArrowLeft,
  Package,
} from 'lucide-react';
import { TEXT } from '../services/i18n';
import { OverworldStartQuiz } from './OverworldStartQuiz';
import { getItemDef } from '../rules/items';

export const InteriorView: React.FC = () => {
  const { session, activePoi, language, closeInterior, overworld, buyItem, sellItem, restAtBar, startCampaignLevel } = useGameStore();
  const poiType = session?.activePoi || activePoi;
  
  const [viewState, setViewState] = useState<'MENU' | 'TALK' | 'TRADE'>('MENU');
  const [dialogueStep, setDialogueStep] = useState<number>(0);

  if (!poiType) return null;

  const isCapitol = poiType === 'city_capitol';
  const showQuiz = isCapitol && !overworld.hasCompletedStartQuiz;

  if (showQuiz) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <OverworldStartQuiz />
      </div>
    );
  }

  const getPoiData = () => {
    const type = poiType.toUpperCase().replace('CITY_', '');
    switch (type) {
      case 'BAR':
        return {
          title: TEXT[language].POI.BAR,
          icon: <Beer className="w-12 h-12 text-orange-400" />,
          npcName: language === 'RU' ? 'Бармен Джек' : 'Jack the Bartender',
          description: language === 'RU' 
            ? 'Здесь всегда можно услышать свежие слухи и отдохнуть.' 
            : 'A place to hear the latest rumors and take a rest.',
          bgColor: 'bg-orange-950/40',
          accentColor: 'border-orange-500/30',
          dialogue: [
            language === 'RU' ? 'Приветствую, путник. Чем могу помочь?' : 'Greetings, traveler. How can I help you?',
            language === 'RU' ? 'Слышал, на востоке видели странные огни.' : 'Heard there were strange lights to the east.',
            language === 'RU' ? 'Берегись пустошей, там много опасностей.' : 'Beware the wastelands, many dangers out there.'
          ],
          tradeItems: [
            { id: 'food_bread', cost: 10 },
            { id: 'food_cherry', cost: 15 },
            { id: 'potion_blue', cost: 25 },
          ],
          levels: [
            { id: '1.6', title: 'Sim 1.6: Vertical Limit' }
          ]
        };
      case 'BANK':
        return {
          title: TEXT[language].POI.BANK,
          icon: <Coins className="w-12 h-12 text-yellow-400" />,
          npcName: language === 'RU' ? 'Банкир Грин' : 'Banker Green',
          description: language === 'RU'
            ? 'Ваши кредиты в безопасности. По крайней мере, мы так говорим.'
            : 'Your credits are safe. At least, that\'s what we say.',
          bgColor: 'bg-yellow-950/40',
          accentColor: 'border-yellow-500/30',
          dialogue: [
            language === 'RU' ? 'Деньги любят счет. Чем могу помочь?' : 'Money likes to be counted. How can I help?',
            language === 'RU' ? 'Инвестиции в пустоши - рискованное дело.' : 'Investing in the wastelands is risky business.',
          ],
          tradeItems: [
            { id: 'mat_gold_bar', cost: 100 },
            { id: 'gem_ruby', cost: 200 },
          ],
          levels: [
            { id: '1.5', title: 'Sim 1.5: Oxygen March' }
          ]
        };
      case 'SHOP':
        return {
          title: TEXT[language].POI.SHOP,
          icon: <ShoppingBag className="w-12 h-12 text-emerald-400" />,
          npcName: language === 'RU' ? 'Торговец Сэм' : 'Trader Sam',
          description: language === 'RU'
            ? 'Лучшие товары в этом секторе! Покупай или уходи.'
            : 'Best goods in this sector! Buy or move on.',
          bgColor: 'bg-emerald-950/40',
          accentColor: 'border-emerald-500/30',
          dialogue: [
            language === 'RU' ? 'Смотри, выбирай, покупай!' : 'Look, choose, buy!',
            language === 'RU' ? 'У меня есть всё, что тебе нужно для выживания.' : 'I have everything you need to survive.',
          ],
          tradeItems: [
            { id: 'iron_plate', cost: 50 },
            { id: 'shoes_leather', cost: 40 },
            { id: 'fuel_cell', cost: 30 },
            { id: 'sword_soldier', cost: 75 },
          ],
          levels: [
            { id: '1.4', title: 'Sim 1.4: Excavation' }
          ]
        };
      case 'WORKSHOP':
        return {
          title: TEXT[language].POI.WORKSHOP,
          icon: <Hammer className="w-12 h-12 text-blue-400" />,
          npcName: language === 'RU' ? 'Мастер Ганс' : 'Master Hans',
          description: language === 'RU'
            ? 'Могу починить что угодно, если у тебя есть материалы.'
            : 'I can fix anything, if you have the materials.',
          bgColor: 'bg-blue-950/40',
          accentColor: 'border-blue-500/30',
          dialogue: [
            language === 'RU' ? 'Техника не терпит суеты.' : 'Machinery does not tolerate fuss.',
            language === 'RU' ? 'Приноси детали, сделаю конфетку.' : 'Bring parts, I will make a candy.',
          ],
          tradeItems: [
            { id: 'rusted_scanner', cost: 100 },
            { id: 'plasma_drill', cost: 200 },
            { id: 'tool_pickaxe', cost: 80 },
          ],
          levels: [
            { id: '1.3', title: 'Sim 1.3: Structural Supports' }
          ]
        };
      case 'HUB':
        return {
          title: TEXT[language].POI.HUB || (language === 'RU' ? 'Центральный Хаб' : 'Central Hub'),
          icon: <Landmark className="w-12 h-12 text-indigo-400" />,
          npcName: language === 'RU' ? 'Командор Райдер' : 'Commander Ryder',
          description: language === 'RU'
            ? 'Главный узел связи и распределения задач.'
            : 'Main communication and task distribution node.',
          bgColor: 'bg-indigo-950/40',
          accentColor: 'border-indigo-500/30',
          dialogue: [
            language === 'RU' ? 'Приветствую в Хабе. Здесь мы координируем вылазки.' : 'Welcome to the Hub. We coordinate expeditions here.',
            language === 'RU' ? 'Пройди все симуляции, чтобы получить допуск в пустоши.' : 'Complete all simulations to get clearance for the wastelands.',
          ],
          tradeItems: [
            { id: 'supplies', cost: 20 },
            { id: 'scrap', cost: 10 },
          ],
          levels: [
            { id: '1.2', title: 'Sim 1.2: Advanced' }
          ]
        };
      case 'CAPITOL':
        return {
          title: TEXT[language].POI.CAPITOL,
          icon: <Landmark className="w-12 h-12 text-purple-400" />,
          npcName: language === 'RU' ? 'Мэр Вэнс' : 'Mayor Vance',
          description: language === 'RU'
            ? 'Добро пожаловать в центр управления. Соблюдайте порядок.'
            : 'Welcome to the command center. Maintain order.',
          bgColor: 'bg-purple-950/40',
          accentColor: 'border-purple-500/30',
          dialogue: [
            language === 'RU' ? 'Город процветает благодаря порядку.' : 'The city thrives thanks to order.',
            language === 'RU' ? 'Мы всегда рады полезным гражданам.' : 'We are always glad to have useful citizens.',
          ],
          tradeItems: [
            { id: 'ancient_relic', cost: 500 },
            { id: 'apex_core', cost: 1000 },
          ],
          levels: [
            { id: '1.1', title: 'Sim 1.1: City Protocol' }
          ]
        };
      default:
        return {
          title: poiType,
          icon: <Landmark className="w-12 h-12 text-gray-400" />,
          npcName: 'NPC',
          description: '...',
          bgColor: 'bg-gray-950/40',
          accentColor: 'border-gray-500/30',
          dialogue: ['...'],
          tradeItems: [],
          levels: []
        };
    }
  };

  const data = getPoiData();

  const handleNextDialogue = () => {
    if (dialogueStep < data.dialogue.length - 1) {
      setDialogueStep(prev => prev + 1);
    } else {
      setViewState('MENU');
      setDialogueStep(0);
    }
  };

  const handleBuy = (itemId: string, cost: number) => {
    buyItem(itemId, cost);
  };

  const handleSell = (bagIndex: number, itemId: string) => {
    const def = getItemDef(itemId);
    if (def) {
      const sellPrice = Math.floor((def.effectValue || 10) * 0.5); // Basic sell price logic
      sellItem(bagIndex, sellPrice);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-2 md:p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className={`relative w-full max-w-4xl max-h-[95vh] h-auto md:h-[80vh] ${data.bgColor} border ${data.accentColor} rounded-2xl md:rounded-3xl overflow-hidden flex flex-col shadow-2xl`}>
        {/* Header */}
        <div className="p-4 md:p-6 border-b border-white/10 flex items-center justify-between bg-black/20 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 rounded-xl md:rounded-2xl bg-white/5 border border-white/10 hidden sm:block">
              {data.icon}
            </div>
            <div>
              <h2 className="text-xl md:text-3xl font-bold tracking-tight text-white break-words whitespace-pre-wrap">{data.title}</h2>
              <p className="text-white/50 text-xs md:text-sm italic break-words whitespace-pre-wrap">{data.description}</p>
            </div>
          </div>
          <button 
            onClick={closeInterior}
            className="p-2 md:p-3 rounded-full hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
          {/* NPC Section */}
          <div className="w-full md:w-1/3 border-b md:border-b-0 md:border-r border-white/10 p-4 md:p-8 flex flex-row md:flex-col items-center justify-center md:justify-center bg-black/10 shrink-0 gap-4 md:gap-0">
            <div className="relative mb-0 md:mb-6 shrink-0">
              <div className="w-16 h-16 md:w-48 md:h-48 rounded-full bg-gradient-to-b from-white/10 to-transparent border border-white/20 flex items-center justify-center overflow-hidden">
                <User className="w-10 h-10 md:w-32 md:h-32 text-white/20" />
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 md:px-4 py-0.5 md:py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-[8px] md:text-xs font-bold uppercase tracking-widest text-white/80 whitespace-nowrap">
                {data.npcName}
              </div>
            </div>
            <div className="text-left md:text-center flex-1">
              <p className="text-white/70 italic text-sm md:text-lg leading-relaxed break-words whitespace-pre-wrap">
                "{viewState === 'TALK' ? data.dialogue[dialogueStep] : data.dialogue[0]}"
              </p>
            </div>
          </div>

          {/* Actions Section */}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-black/5">
            {viewState === 'MENU' && (
              <div className="grid grid-cols-1 gap-3 md:gap-4">
                <button 
                  onClick={() => { setViewState('TALK'); setDialogueStep(0); }}
                  className="group flex items-center justify-between p-4 md:p-6 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                      <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-base md:text-xl font-bold text-white break-words whitespace-pre-wrap">{language === 'RU' ? 'Поговорить' : 'Talk'}</h3>
                      <p className="text-white/40 text-xs md:text-sm break-words whitespace-pre-wrap">{language === 'RU' ? 'Узнать последние новости' : 'Ask about latest news'}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-white/20 group-hover:text-white/50 transition-colors" />
                </button>

                <button 
                  onClick={() => setViewState('TRADE')}
                  className="group flex items-center justify-between p-4 md:p-6 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left"
                >
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                      <Coins className="w-5 h-5 md:w-6 md:h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-base md:text-xl font-bold text-white break-words whitespace-pre-wrap">{language === 'RU' ? 'Торговать' : 'Trade'}</h3>
                      <p className="text-white/40 text-xs md:text-sm break-words whitespace-pre-wrap">{language === 'RU' ? 'Обменять ресурсы' : 'Exchange resources'}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-white/20 group-hover:text-white/50 transition-colors" />
                </button>

                {poiType === 'BAR' && (
                  <button 
                    onClick={restAtBar}
                    className="group flex items-center justify-between p-4 md:p-6 bg-white/5 border border-white/10 rounded-xl md:rounded-2xl hover:bg-white/10 hover:border-white/20 transition-all text-left"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div className="p-2 md:p-3 rounded-lg md:rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors">
                        <Beer className="w-5 h-5 md:w-6 md:h-6 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-base md:text-xl font-bold text-white break-words whitespace-pre-wrap">{language === 'RU' ? 'Отдохнуть' : 'Rest'}</h3>
                        <p className="text-white/40 text-xs md:text-sm break-words whitespace-pre-wrap">{language === 'RU' ? 'Восстановить силы (50 кр.)' : 'Recover energy (50 cr.)'}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 md:w-6 md:h-6 text-white/20 group-hover:text-white/50 transition-colors" />
                  </button>
                )}
              </div>
            )}

            {viewState === 'TALK' && (
              <div className="flex flex-col h-full justify-between">
                <div className="bg-white/5 border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 mb-4">
                  <p className="text-white/90 text-sm md:text-lg leading-relaxed break-words whitespace-pre-wrap">
                    "{data.dialogue[dialogueStep]}"
                  </p>
                </div>
                
                {dialogueStep === data.dialogue.length - 1 && data.levels && data.levels.length > 0 && (
                  <div className="flex flex-col gap-2 md:gap-3 mb-4 md:mb-6">
                    <h4 className="text-white/50 text-xs md:text-sm uppercase tracking-wider">
                      {language === 'RU' ? 'Доступные симуляции' : 'Available Simulations'}
                    </h4>
                    {data.levels.map(level => {
                      const isCompleted = overworld.flags?.[`level_${level.id}_completed`];
                      return (
                      <button
                        key={level.id}
                        onClick={() => {
                          closeInterior();
                          startCampaignLevel(level.id);
                        }}
                        className={`flex items-center justify-between p-3 md:p-4 border rounded-xl transition-all text-left group ${
                          isCompleted 
                            ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40' 
                            : 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/40'
                        }`}
                      >
                        <span className={`text-sm md:text-base font-medium break-words whitespace-pre-wrap ${isCompleted ? 'text-emerald-100' : 'text-blue-100'}`}>
                          {level.title} {isCompleted && (language === 'RU' ? '(Пройдено)' : '(Completed)')}
                        </span>
                        <ArrowRight className={`w-4 h-4 md:w-5 md:h-5 group-hover:translate-x-1 transition-transform ${isCompleted ? 'text-emerald-400' : 'text-blue-400'}`} />
                      </button>
                    )})}
                  </div>
                )}

                <div className="flex justify-end gap-2 md:gap-4 mt-auto">
                  <button 
                    onClick={() => setViewState('MENU')}
                    className="px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors text-sm md:text-base"
                  >
                    {language === 'RU' ? 'Уйти' : 'Leave'}
                  </button>
                  <button 
                    onClick={handleNextDialogue}
                    className="px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl bg-blue-500/20 border border-blue-500/50 text-blue-300 hover:bg-blue-500/30 hover:text-white transition-colors flex items-center gap-2 text-sm md:text-base"
                  >
                    {dialogueStep < data.dialogue.length - 1 ? (language === 'RU' ? 'Далее' : 'Next') : (language === 'RU' ? 'Завершить' : 'End')}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {viewState === 'TRADE' && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <h3 className="text-lg md:text-xl font-bold text-white flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
                    {language === 'RU' ? 'Товары' : 'Goods'}
                  </h3>
                  <button 
                    onClick={() => setViewState('MENU')}
                    className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2 text-xs md:text-sm"
                  >
                    <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" />
                    {language === 'RU' ? 'Назад' : 'Back'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 overflow-y-auto pr-2 pb-4">
                  {/* Buy Items */}
                  <div className="col-span-1 md:col-span-2 mb-2">
                    <h4 className="text-xs md:text-sm font-bold text-white/50 uppercase tracking-widest mb-2">{language === 'RU' ? 'Купить' : 'Buy'}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {data.tradeItems.map((item, idx) => {
                        const def = getItemDef(item.id);
                        if (!def) return null;
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 md:p-3 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shrink-0">
                                <Package className="w-4 h-4 md:w-5 md:h-5 text-white/50" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm md:text-base text-white font-medium break-words whitespace-pre-wrap">{def.name[language]}</div>
                                <div className="text-white/40 text-[10px] md:text-xs break-words whitespace-pre-wrap">{def.description[language]}</div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleBuy(item.id, item.cost)}
                              disabled={(overworld?.player?.credits || 0) < item.cost || (overworld?.player?.bag?.length || 0) >= 20}
                              className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm shrink-0"
                            >
                              <Coins className="w-3 h-3 md:w-4 md:h-4" />
                              {item.cost}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Sell Items */}
                  <div className="col-span-1 md:col-span-2 mt-2 md:mt-4">
                    <h4 className="text-xs md:text-sm font-bold text-white/50 uppercase tracking-widest mb-2">{language === 'RU' ? 'Продать' : 'Sell'}</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {overworld?.player?.bag?.map((itemId, idx) => {
                        const def = getItemDef(itemId);
                        if (!def) return null;
                        const sellPrice = Math.floor((def.effectValue || 10) * 0.5);
                        return (
                          <div key={`sell-${idx}`} className="flex items-center justify-between p-2 md:p-3 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex items-center gap-2 md:gap-3">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-black/40 flex items-center justify-center border border-white/5 shrink-0">
                                <Package className="w-4 h-4 md:w-5 md:h-5 text-white/50" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-sm md:text-base text-white font-medium break-words whitespace-pre-wrap">{def.name[language]}</div>
                                <div className="text-white/40 text-[10px] md:text-xs break-words whitespace-pre-wrap">{def.description[language]}</div>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleSell(idx, itemId)}
                              className="px-3 py-1.5 md:px-4 md:py-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/30 transition-colors flex items-center gap-1 md:gap-2 text-xs md:text-sm shrink-0"
                            >
                              <Coins className="w-3 h-3 md:w-4 md:h-4" />
                              +{sellPrice}
                            </button>
                          </div>
                        );
                      })}
                      {(!overworld?.player?.bag || overworld.player.bag.length === 0) && (
                        <div className="p-3 md:p-4 text-center text-white/30 text-xs md:text-sm italic border border-white/5 rounded-xl bg-white/5">
                          {language === 'RU' ? 'Инвентарь пуст' : 'Inventory is empty'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 md:p-4 bg-black/40 border-t border-white/10 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3 md:gap-6">
            <div className="flex items-center gap-1.5 md:gap-2">
              <Coins className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />
              <span className="text-white/80 font-mono text-xs md:text-base">{overworld?.player?.credits || 0}</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2">
              <Package className="w-3 h-3 md:w-4 md:h-4 text-blue-400" />
              <span className="text-white/80 font-mono text-xs md:text-base">{overworld?.player?.bag?.length || 0}/20</span>
            </div>
          </div>
          <div className="text-white/30 text-[8px] md:text-xs font-mono uppercase tracking-widest hidden sm:block">
            {poiType} INTERIOR v1.0
          </div>
        </div>
      </div>
    </motion.div>
  );
};
