import React from 'react';
import { useGameStore } from '../store.ts';
import { EVENT_REGISTRY } from '../rules/events.ts';
import { runtimeEventCache } from '../services/EventComposer.ts';
import { Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';

const EventModal: React.FC = () => {
  const { overworld, resolveEventChoice } = useGameStore();
  const { activeEventId, activeEventNodeId, player, flags } = overworld;

  if (!activeEventId || !activeEventNodeId) return null;

  const event = EVENT_REGISTRY[activeEventId] ?? runtimeEventCache[activeEventId];
  if (!event) return null;

  const node = event.nodes[activeEventNodeId];
  if (!node) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-indigo-500/30 rounded-xl md:rounded-3xl shadow-[0_0_40px_rgba(99,102,241,0.15)] max-w-xl w-full max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 relative">
        
        {/* Glow effect behind modal */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[150%] h-64 bg-indigo-500/10 blur-[100px] pointer-events-none" />

        <div className="overflow-y-auto no-scrollbar flex flex-col h-full">
          {/* Event Image */}
          {node.image && (
            <div className="w-full h-32 sm:h-56 md:h-64 shrink-0 relative">
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
          <div className="p-4 sm:p-6 md:p-8 flex flex-col gap-4 sm:gap-6 relative z-10 shrink-0">
            <div className="flex items-start gap-2.5 sm:gap-4">
              <div className="p-1.5 sm:p-2.5 bg-indigo-500/20 rounded-lg sm:rounded-xl border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.3)] shrink-0 mt-0.5">
                <Sparkles className="w-4 h-4 sm:w-6 sm:h-6" />
              </div>
              <p className="text-sm sm:text-lg md:text-xl text-slate-100 leading-relaxed font-medium">
                {node.text}
              </p>
            </div>

            {/* Choices */}
            <div className="flex flex-col gap-2 sm:gap-3 mt-1">
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
                const hasReqCredits = !choice.reqCredits || player.credits >= choice.reqCredits;
                const canAfford = hasReqItem && hasReqCredits;

                return (
                  <button
                    key={idx}
                    onClick={() => resolveEventChoice(choice)}
                    disabled={!canAfford}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between p-2.5 sm:p-4 gap-2 sm:gap-0 rounded-lg sm:rounded-2xl bg-slate-800/80 border border-slate-700 hover:bg-indigo-900/40 hover:border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-left shadow-sm hover:shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-slate-700/50 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors shrink-0">
                        <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4" />
                      </div>
                      <span className="text-xs sm:text-base text-slate-200 font-medium group-hover:text-indigo-100 transition-colors">{choice.label}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-1.5 pl-8 sm:pl-0">
                      {choice.reqItem && (
                        <span className={`flex items-center gap-1 text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md font-medium shrink-0 ${hasReqItem ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {!hasReqItem && <AlertTriangle className="w-2.5 h-2.5" />}
                          {choice.reqItem}
                        </span>
                      )}
                      {choice.reqCredits && (
                        <span className={`flex items-center gap-1 text-[9px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md font-medium shrink-0 ${hasReqCredits ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {!hasReqCredits && <AlertTriangle className="w-2.5 h-2.5" />}
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
