import React from 'react';
import { useGameStore } from '../store.ts';
import { EVENT_REGISTRY } from '../rules/events.ts';
import { runtimeEventCache } from '../services/EventComposer.ts';
import { getItemDef } from '../rules/items.ts';
import { AlertTriangle, ArrowRight, Package, Terminal, Shield, Activity, Database, Cpu } from 'lucide-react';

const EventModal: React.FC = () => {
  const { overworld, resolveEventChoice, closeEventSummary, language } = useGameStore();
  const { activeEventId, activeEventNodeId, player, flags, lastChoiceResult } = overworld;

  if (!activeEventId || !activeEventNodeId) return null;

  const event = EVENT_REGISTRY[activeEventId] ?? runtimeEventCache[activeEventId];
  if (!event) return null;

  const node = event.nodes[activeEventNodeId];
  if (!node) return null;

  const isRussian = language === 'RU';

  // Outcome Summary View
  if (lastChoiceResult) {
    const renderOutcomeItem = (key: string, val: any, isPenalty: boolean) => {
      if (!val) return null;

      let label = key.toUpperCase();
      let valueDisplay = Array.isArray(val) ? val.length : val;

      if (key === 'items' && Array.isArray(val)) {
        const counts: Record<string, number> = {};
        val.forEach(id => {
          counts[id] = (counts[id] || 0) + 1;
        });

        return Object.entries(counts).map(([itemId, count]) => {
          const itemDef = getItemDef(itemId);
          const itemName = itemDef ? itemDef.name[language] : itemId;
          return (
            <div key={itemId} className={`flex items-center justify-between p-3 border-l-2 font-mono ${isPenalty ? 'bg-red-500/5 border-red-500/40 text-red-400' : 'bg-emerald-500/5 border-emerald-500/40 text-emerald-400'}`}>
              <div className="flex items-center gap-3">
                <Package className="w-3.5 h-3.5 opacity-60" />
                <span className="text-[11px] font-bold uppercase tracking-wide">{itemName}</span>
              </div>
              <span className="text-sm font-black tracking-tighter">{isPenalty ? '-' : '+'}{count}</span>
            </div>
          );
        });
      }

      if (key === 'credits') label = isRussian ? 'КРЕДИТЫ' : 'CREDITS';
      if (key === 'hp') label = isRussian ? 'СТАБИЛЬНОСТЬ' : 'STABILITY';
      if (key === 'reputation') label = isRussian ? 'ДОВЕРИЕ' : 'TRUST';

      return (
        <div key={key} className={`flex items-center justify-between p-3 border-l-2 font-mono ${isPenalty ? 'bg-red-500/5 border-red-500/40 text-red-400' : 'bg-emerald-500/5 border-emerald-500/40 text-emerald-400'}`}>
          <span className="text-[11px] font-bold uppercase tracking-widest">{label}</span>
          <span className="text-sm font-black tracking-tighter">{isPenalty ? '-' : '+'}{valueDisplay}</span>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
        <div className="bg-[#0a0f18] border border-indigo-500/20 shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-md w-full relative overflow-hidden flex flex-col gap-6 p-6 md:p-8">
          {/* Technical Corner Accents */}
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-indigo-500/50" />
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-indigo-500/50" />
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-indigo-500/50" />
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-indigo-500/50" />
          
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-indigo-500/10 pb-4">
              <div className="flex items-center gap-3">
                <Terminal className="w-5 h-5 text-indigo-400" />
                <h2 className="text-lg font-black text-white uppercase tracking-[0.2em] font-mono">
                  {isRussian ? 'ОТЧЕТ_СОБЫТИЯ' : 'EVENT_REPORT'}
                </h2>
              </div>
              <div className="text-[10px] font-mono text-indigo-500/50 uppercase tracking-widest hidden sm:block">
                SYS_REF: {activeEventId.split('_').pop()}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-[10px] font-mono text-indigo-400/60 uppercase tracking-widest mb-2">
                {isRussian ? '// РЕЗУЛЬТАТЫ_ВЗАИМОДЕЙСТВИЯ' : '// INTERACTION_RESULTS'}
              </div>
              <div className="flex flex-col gap-2">
                {lastChoiceResult.reward && Object.entries(lastChoiceResult.reward).map(([key, val]) => renderOutcomeItem(key, val, false))}
                {lastChoiceResult.penalty && Object.entries(lastChoiceResult.penalty).map(([key, val]) => renderOutcomeItem(key, val, true))}
                {(!lastChoiceResult.reward && !lastChoiceResult.penalty) && (
                  <div className="p-4 border border-dashed border-slate-800 text-center text-slate-600 font-mono text-[10px] uppercase tracking-widest">
                    {isRussian ? 'ДАННЫЕ_НЕ_ИЗМЕНЕНЫ' : 'NO_DATA_SHIFT_DETECTED'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={closeEventSummary}
            className="group relative overflow-hidden py-4 bg-indigo-500 hover:bg-indigo-400 transition-colors"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
            <span className="relative flex items-center justify-center gap-3 text-slate-950 font-black uppercase text-xs tracking-widest font-mono">
              {isRussian ? 'ПОДТВЕРДИТЬ_ПРИЕМ' : 'ACKNOWLEDGE_RECEIPT'}
              <ArrowRight className="w-4 h-4" />
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 md:p-4 animate-in fade-in duration-500">
      <div className="bg-[#0a101d] border border-indigo-500/30 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col relative shadow-[0_0_80px_rgba(99,102,241,0.1)]">
        {/* Scanning Line Effect */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.8)] animate-[scan_3s_linear_infinite] z-50 pointer-events-none" />

        {/* Top Header Bar */}
        <div className="bg-indigo-500/10 border-b border-indigo-500/30 p-3 md:p-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-indigo-400 animate-pulse" />
            <span className="text-[10px] md:text-xs font-black text-indigo-300 uppercase tracking-[0.3em] font-mono">
              {isRussian ? 'ВНЕШНИЙ_КОНТАКТ' : 'EXTERNAL_CONTACT_DETECTED'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-[9px] font-mono text-indigo-500/40 uppercase tracking-widest">
            <span className="hidden sm:inline">LOC: {player.q},{player.r}</span>
            <span className="hidden sm:inline">SIG_STR: 88%</span>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-indigo-500/30" />
              <div className="w-1.5 h-1.5 bg-indigo-500/30" />
              <div className="w-1.5 h-1.5 bg-indigo-500/60 animate-pulse" />
            </div>
          </div>
        </div>

        <div className="overflow-y-auto no-scrollbar flex flex-col h-full bg-[radial-gradient(circle_at_center,_rgba(99,102,241,0.03)_0%,_transparent_70%)]">
          {/* Visual Feed */}
          {node.image && (
            <div className="w-full h-32 md:h-56 shrink-0 relative border-b border-indigo-500/10 overflow-hidden">
              <img 
                src={node.image} 
                alt="Feed" 
                className="w-full h-full object-cover filter grayscale brightness-75 contrast-125 sepia-[0.2]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a101d] via-transparent to-transparent" />
              {/* Grid overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.02),rgba(0,255,0,0.01),rgba(0,0,255,0.02))] bg-[length:100%_2px,3px_100%] pointer-events-none" />
              <div className="absolute bottom-4 left-4 flex gap-2">
                <div className="px-2 py-1 bg-black/60 backdrop-blur-md border border-indigo-500/40 text-[9px] font-mono text-indigo-300 uppercase tracking-tighter">
                  REC_MODE: AUTO
                </div>
              </div>
            </div>
          )}

          {/* Narrative Block */}
          <div className="p-6 md:p-10 flex flex-col gap-8 shrink-0">
            <div className="relative">
              <div className="absolute -left-6 top-0 w-1 h-full bg-indigo-500/20" />
              <p className="text-sm md:text-lg text-slate-300 leading-relaxed font-medium tracking-tight break-words whitespace-pre-wrap selection:bg-indigo-500/30">
                <span className="text-indigo-400 font-mono text-xs mr-2 opacity-50 shrink-0 inline-block align-top mt-1 md:mt-2">››</span>
                {node.text}
              </p>
            </div>

            {/* Decisions */}
            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-mono text-indigo-500/40 uppercase tracking-[0.2em] mb-1">
                {isRussian ? '// ВЫБОР_ДЕЙСТВИЯ' : '// PENDING_DECISION_PROTOCOL'}
              </div>
              
              {node.choices.map((choice, idx) => {
                const activeFlags = flags || {};
                if (choice.reqFlag && !activeFlags[choice.reqFlag]) return null;
                if (choice.reqFlagAbsent && activeFlags[choice.reqFlagAbsent]) return null;
                
                const rep = player.reputation ?? 0;
                if (choice.reqRepMin !== undefined && rep < choice.reqRepMin) return null;
                if (choice.reqRepMax !== undefined && rep > choice.reqRepMax) return null;
                if (choice.reqStepMin !== undefined && (player.stepCount ?? 0) < choice.reqStepMin) return null;

                const hasReqItem = !choice.reqItem || player.bag.includes(choice.reqItem);
                const hasReqCredits = !choice.reqCredits || player.credits >= choice.reqCredits;
                const isDisabled = (!hasReqItem || !hasReqCredits) && !choice.cannotAffordNode;

                return (
                  <button
                    key={idx}
                    onClick={() => resolveEventChoice(choice)}
                    disabled={isDisabled}
                    className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-4 md:p-5 gap-3 rounded-md bg-slate-900/40 border border-indigo-900/30 hover:bg-indigo-950/20 hover:border-indigo-400/50 disabled:opacity-30 disabled:grayscale transition-all text-left"
                  >
                    {/* Hover Glow */}
                    <div className="absolute inset-0 bg-indigo-500/0 group-hover:bg-indigo-500/[0.03] transition-colors" />
                    
                    <div className="flex items-center gap-5 relative">
                      <div className="flex flex-col items-center justify-center shrink-0">
                        <div className="w-1.5 h-1.5 bg-indigo-500/40 rotate-45 group-hover:bg-indigo-400 group-hover:scale-125 transition-all" />
                        <div className="w-[1px] h-4 bg-indigo-900 group-hover:bg-indigo-500/40 transition-colors mt-0.5" />
                      </div>
                      <span className="text-xs md:text-sm text-slate-200 font-bold tracking-wide group-hover:text-white transition-colors uppercase font-mono">
                        {choice.label}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 pl-6 sm:pl-0 relative">
                      {choice.reqItem && (
                        <div className={`flex items-center gap-2 text-[9px] px-2 py-1 font-mono uppercase tracking-tighter border ${hasReqItem ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                          {hasReqItem ? <Database className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {getItemDef(choice.reqItem)?.name[language] || choice.reqItem}
                        </div>
                      )}
                      {choice.reqCredits && (
                        <div className={`flex items-center gap-2 text-[9px] px-2 py-1 font-mono uppercase tracking-tighter border ${hasReqCredits ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' : 'bg-red-500/5 border-red-500/20 text-red-400'}`}>
                          {hasReqCredits ? <Cpu className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                          {choice.reqCredits} CR
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Technical Metadata */}
        <div className="bg-indigo-500/5 border-t border-indigo-500/20 p-3 md:p-4 shrink-0 flex items-center justify-between text-[8px] md:text-[9px] font-mono text-indigo-500/40 uppercase tracking-widest">
          <div className="flex gap-4">
            <span>CORE_STABLE</span>
            <span className="hidden sm:inline">REPUTATION_INDEX: {player.reputation ?? 0}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>TRANSMISSION_OPEN</span>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`w-1 h-3 ${i < 3 ? 'bg-indigo-500/40' : 'bg-indigo-500/10'}`} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          from { top: 0; }
          to { top: 100%; }
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default EventModal;
