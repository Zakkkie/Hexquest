import React from 'react';
import { useGameStore } from '../store.ts';
import { EVENT_REGISTRY } from '../rules/events.ts';
import { runtimeEventCache } from '../services/EventComposer.ts';
import { getItemDef } from '../rules/items.ts';
import { Sparkles, AlertTriangle, ArrowRight, Package } from 'lucide-react';

const EventModal: React.FC = () => {
  const { overworld, resolveEventChoice, closeEventSummary, language } = useGameStore();
  const { activeEventId, activeEventNodeId, player, flags, lastChoiceResult } = overworld;

  if (!activeEventId || !activeEventNodeId) return null;

  const event = EVENT_REGISTRY[activeEventId] ?? runtimeEventCache[activeEventId];
  if (!event) return null;

  const node = event.nodes[activeEventNodeId];
  if (!node) return null;

  // Outcome Summary View
  if (lastChoiceResult) {
    const isRussian = language === 'RU';

    const renderOutcomeItem = (key: string, val: any, isPenalty: boolean) => {
      if (!val) return null;

      let label = key.toUpperCase();
      let valueDisplay = Array.isArray(val) ? val.length : val;

      if (key === 'items' && Array.isArray(val)) {
        // Aggregate items
        const counts: Record<string, number> = {};
        val.forEach(id => {
          counts[id] = (counts[id] || 0) + 1;
        });

        return Object.entries(counts).map(([itemId, count]) => {
          const itemDef = getItemDef(itemId);
          const itemName = itemDef ? itemDef.name[language] : itemId;
          return (
            <div key={itemId} className={`flex items-center justify-between p-3 rounded-xl border ${isPenalty ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium break-words whitespace-pre-wrap">{itemName}</span>
              </div>
              <span className="text-lg font-bold">{isPenalty ? '-' : '+'}{count}</span>
            </div>
          );
        });
      }

      // Standard stats
      if (key === 'credits') label = isRussian ? 'КРЕДИТЫ' : 'CREDITS';
      if (key === 'hp') label = isRussian ? 'ЗДОРОВЬЕ' : 'HP';
      if (key === 'energy') label = isRussian ? 'ЭНЕРГИЯ' : 'ENERGY';
      if (key === 'reputation') label = isRussian ? 'РЕПУТАЦИЯ' : 'REPUTATION';

      return (
        <div key={key} className={`flex items-center justify-between p-3 rounded-xl border ${isPenalty ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
          <span className="text-sm font-medium uppercase tracking-wider break-words whitespace-pre-wrap">{label}</span>
          <span className="text-lg font-bold">{isPenalty ? '-' : '+'}{valueDisplay}</span>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
        <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl md:rounded-3xl shadow-[0_0_40px_rgba(99,102,241,0.15)] max-w-[340px] md:max-w-md w-full max-h-[90vh] overflow-y-auto p-5 md:p-8 flex flex-col gap-4 md:gap-6 animate-in zoom-in-95 duration-300 relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-32 bg-indigo-500/10 blur-[60px] pointer-events-none" />
          
          <div className="flex flex-col items-center text-center gap-3 md:gap-4">
            <div className="p-3 md:p-4 bg-indigo-500/20 rounded-2xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Sparkles className="w-7 h-7 md:w-8 md:h-8" />
            </div>
            <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tight break-words whitespace-pre-wrap">
              {isRussian ? 'Итоги события' : 'Event Outcome'}
            </h2>
            <p className="text-[11px] md:text-sm text-slate-400 leading-relaxed break-words whitespace-pre-wrap">
              {isRussian ? 'Ваши действия привели к следующим результатам:' : 'Your actions led to the following results:'}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            {/* Rewards */}
            {lastChoiceResult.reward && Object.entries(lastChoiceResult.reward).map(([key, val]) => renderOutcomeItem(key, val, false))}
            
            {/* Penalties */}
            {lastChoiceResult.penalty && Object.entries(lastChoiceResult.penalty).map(([key, val]) => renderOutcomeItem(key, val, true))}

            {(!lastChoiceResult.reward && !lastChoiceResult.penalty) && (
              <div className="text-center p-4 text-slate-500 italic text-xs">
                {isRussian ? 'Ничего не изменилось' : 'Nothing changed'}
              </div>
            )}
          </div>

          <button
            onClick={closeEventSummary}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-xs transition-all active:scale-95 shadow-lg shadow-indigo-600/30"
          >
            {isRussian ? 'Завершить' : 'Finish'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 md:p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl md:rounded-3xl shadow-[0_0_40px_rgba(99,102,241,0.15)] max-w-[340px] md:max-w-xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 z-20"></div>
        {/* Glow effect behind modal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />

        <div className="overflow-y-auto no-scrollbar flex flex-col h-full">
          {/* Event Image */}
          {node.image && (
            <div className="w-full h-32 md:h-64 shrink-0 relative">
              <img 
                src={node.image} 
                alt="Event" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
            </div>
          )}

          {/* Event Content */}
          <div className="p-5 md:p-8 flex flex-col gap-5 md:gap-8 relative z-10 shrink-0">
            <div className="flex items-start gap-4 md:gap-6">
              <div className="p-2.5 md:p-3.5 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] shrink-0 mt-0.5">
                <Sparkles className="w-5 h-5 md:w-7 md:h-7" />
              </div>
              <p className="text-[13px] md:text-xl text-slate-100 leading-relaxed font-medium tracking-tight break-words whitespace-pre-wrap">
                {node.text}
              </p>
            </div>

            {/* Choices */}
            <div className="flex flex-col gap-2.5 md:gap-4 mt-1">
              {node.choices.map((choice, idx) => {
                const activeFlags = flags || {};
                const meetsFlag = !choice.reqFlag || !!activeFlags[choice.reqFlag];
                const meetsFlagAbsent = !choice.reqFlagAbsent || !activeFlags[choice.reqFlagAbsent];
                const rep = player.reputation ?? 0;
                const meetsRepMin = choice.reqRepMin === undefined || rep >= choice.reqRepMin;
                const meetsRepMax = choice.reqRepMax === undefined || rep <= choice.reqRepMax;
                const meetsStep = choice.reqStepMin === undefined || (player.stepCount ?? 0) >= choice.reqStepMin;
                // Hide choices whose conditions aren't met
                if (!meetsFlag || !meetsFlagAbsent || !meetsRepMin || !meetsRepMax || !meetsStep) return null;

                const hasReqItem = !choice.reqItem || player.bag.includes(choice.reqItem);
                
                // Check if player has all required items (handling duplicates)
                let hasReqItems = true;
                if (choice.reqItems && choice.reqItems.length > 0) {
                  const bagCounts = player.bag.reduce((acc, item) => {
                    acc[item] = (acc[item] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  const reqCounts = choice.reqItems.reduce((acc, item) => {
                    acc[item] = (acc[item] || 0) + 1;
                    return acc;
                  }, {} as Record<string, number>);
                  
                  for (const [item, count] of Object.entries(reqCounts)) {
                    if ((bagCounts[item] || 0) < count) {
                      hasReqItems = false;
                      break;
                    }
                  }
                }

                const hasReqCredits = !choice.reqCredits || player.credits >= choice.reqCredits;
                const canAfford = hasReqItem && hasReqItems && hasReqCredits;
                const isDisabled = !canAfford && !choice.cannotAffordNode;

                return (
                  <button
                    key={idx}
                    onClick={() => {
                      if (isDisabled) {
                        // If they can't afford it and there's no cannotAffordNode, don't do anything (button is disabled anyway, but just in case)
                        return;
                      }
                      resolveEventChoice(choice);
                    }}
                    disabled={isDisabled}
                    className="group flex flex-col md:flex-row md:items-center justify-between p-3.5 md:p-5 gap-3 md:gap-6 rounded-xl md:rounded-2xl bg-slate-800/60 border border-slate-700/50 hover:bg-indigo-900/40 hover:border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left shadow-sm hover:shadow-[0_0_20px_rgba(99,102,241,0.2)] active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-7 h-7 md:w-9 md:h-9 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors shrink-0">
                        <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </div>
                      <span className="text-sm md:text-lg text-slate-200 font-bold group-hover:text-white transition-colors leading-tight break-words whitespace-pre-wrap">{choice.label}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pl-11 md:pl-0">
                      {choice.reqItem && (
                        <span className={`flex items-center gap-1.5 text-[10px] md:text-xs px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg font-black uppercase tracking-wider shrink-0 break-words whitespace-pre-wrap ${hasReqItem ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {!hasReqItem && <AlertTriangle className="w-3 h-3" />}
                          {getItemDef(choice.reqItem)?.name[language] || choice.reqItem}
                        </span>
                      )}
                      {choice.reqItems && choice.reqItems.length > 0 && (
                        <span className={`flex items-center gap-1.5 text-[10px] md:text-xs px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg font-black uppercase tracking-wider shrink-0 break-words whitespace-pre-wrap ${hasReqItems ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {!hasReqItems && <AlertTriangle className="w-3 h-3" />}
                          {choice.reqItems.length}x {getItemDef(choice.reqItems[0])?.name[language] || choice.reqItems[0]}
                        </span>
                      )}
                      {choice.reqCredits && (
                        <span className={`flex items-center gap-1.5 text-[10px] md:text-xs px-2.5 py-1 md:px-3 md:py-1.5 rounded-lg font-black uppercase tracking-wider shrink-0 break-words whitespace-pre-wrap ${hasReqCredits ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {!hasReqCredits && <AlertTriangle className="w-3 h-3" />}
                          {choice.reqCredits} Cr
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventModal;
