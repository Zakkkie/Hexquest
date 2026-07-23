import React, { useState, useEffect } from 'react';
import { useGameStore } from '../../store.ts';
import { Bug, X, Activity, Terminal, AlertCircle, Shield, ChevronRight, Eye } from 'lucide-react';

export const SiegeDiagnostics: React.FC = () => {
  const session = useGameStore(state => state.session);
  const [isOpen, setIsOpen] = useState(false);
  const [tick, setTick] = useState(0);

  // Force-render update tick every 800ms to pull the latest window log mutations
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 800);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!session || !session.defense?.isDefenseMode) {
    return null;
  }

  const bots = session.bots || [];
  const logs = session.botActivityLog || [];
  const siegeLogs = (typeof window !== 'undefined' ? (window as any).__siegeDebugLogs : null) || {};

  return (
    <>
      {/* Floating Capsule Toggle Button */}
      <div className="absolute right-4 top-[84px] md:top-[104px] z-50 pointer-events-auto">
        <button
          id="siege-diagnostics-toggle"
          onClick={() => setIsOpen(!isOpen)}
          className={`
            flex items-center gap-2 px-3.5 py-2 rounded-full border shadow-lg font-mono text-xs font-black select-none tracking-wider transition-all duration-300
            ${isOpen 
              ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-amber-500/20' 
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white shadow-slate-950/40 hover:scale-105'
            }
          `}
        >
          <Bug className={`w-3.5 h-3.5 ${isOpen ? 'animate-bounce' : 'animate-pulse'}`} />
          <span>AI DIAGNOSTICS</span>
          <span className="bg-slate-950/40 text-[10px] px-1.5 py-0.5 rounded-full text-white/90">
            {bots.length}
          </span>
        </button>
      </div>

      {/* Right Drawer Panel */}
      {isOpen && (
        <div 
          id="siege-diagnostics-drawer"
          className="absolute right-0 top-0 bottom-0 w-full max-w-md md:max-w-lg bg-slate-950/95 border-l border-slate-800 shadow-2xl z-[100] flex flex-col pointer-events-auto text-slate-200 font-sans backdrop-blur-md animate-in slide-in-from-right duration-300"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-amber-500/10 rounded-lg border border-amber-500/20">
                <Terminal className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-widest font-mono text-white">
                  NEXUS COGNITIVE OVERLAY
                </h3>
                <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                  Real-time pathfinding & behavior audit
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Scroll area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar select-none">
            {/* Summary KPI Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Hostile Vectors
                </span>
                <span className="text-2xl font-black font-mono text-white">
                  {bots.length}
                </span>
              </div>
              <div className="p-3 bg-slate-900/40 rounded-xl border border-slate-800/80 flex flex-col gap-1">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">
                  Core Health
                </span>
                <span className={`text-2xl font-black font-mono ${(session.defense?.coreHealth ?? 0) < 30 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`}>
                  {session.defense?.coreHealth ?? 100}%
                </span>
              </div>
            </div>

            {/* AI Vector Audit List */}
            <div className="space-y-3">
              <h4 className="text-xs font-black tracking-widest font-mono text-slate-400 uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-amber-500" />
                Active Vector Heap
              </h4>

              {bots.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500 font-mono border border-dashed border-slate-800 rounded-xl">
                  No active bots detected in simulation.
                </div>
              ) : (
                bots.map(bot => {
                  const debugInfo = siegeLogs[bot.id];
                  const hasPlan = bot.memory?.plan && bot.memory.plan.steps.length > 0;
                  const currentPlanLabel = bot.memory?.plan?.label || 'IDLE';
                  const nextActionType = bot.memory?.plan?.steps?.[0]?.type || 'WAIT';
                  const distToCore = Math.round(
                    Math.sqrt(bot.q * bot.q + bot.r * bot.r + bot.q * bot.r)
                  ); // Approximate hex coordinate distance

                  return (
                    <div 
                      key={bot.id} 
                      className={`
                        p-3.5 rounded-xl border transition-all duration-200 flex flex-col gap-2.5
                        ${hasPlan 
                          ? 'bg-slate-900/30 border-slate-800/80' 
                          : 'bg-rose-950/10 border-rose-500/20 shadow-[inset_0_0_12px_rgba(244,63,94,0.05)]'
                        }
                      `}
                    >
                      {/* Bot Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3.5 h-3.5 rounded-full border border-white/20"
                            style={{ backgroundColor: bot.avatarColor || '#e2e8f0' }}
                          />
                          <div>
                            <span className="text-xs font-black font-mono text-white">
                              Vector {bot.id.slice(-4).toUpperCase()}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono ml-2">
                              {bot.memory?.botRole || 'SIEGE_GRINDER'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px]">
                          <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded border border-slate-800">
                            q:{bot.q}, r:{bot.r}
                          </span>
                          <span className="bg-slate-950 text-amber-400 px-2 py-0.5 rounded border border-slate-800">
                            L{session.grid[`${bot.q},${bot.r}`]?.currentLevel ?? 0}
                          </span>
                        </div>
                      </div>

                      {/* Bot Current Strategy */}
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-900">
                          <span className="text-slate-500 block uppercase tracking-wider text-[9px]">
                            Active Strategy
                          </span>
                          <span className={`font-black ${hasPlan ? 'text-white' : 'text-rose-400 animate-pulse'}`}>
                            {currentPlanLabel}
                          </span>
                        </div>
                        <div className="bg-slate-950/60 p-2 rounded border border-slate-900">
                          <span className="text-slate-500 block uppercase tracking-wider text-[9px]">
                            Executed Step
                          </span>
                          <span className={`font-black ${hasPlan ? 'text-amber-400' : 'text-slate-500'}`}>
                            {nextActionType} {hasPlan ? '-> ' + (bot.memory?.plan?.steps?.[0] as any).targetId?.slice(-4).toUpperCase() : ''}
                          </span>
                        </div>
                      </div>

                      {/* Real-time Pathfinding Diagnostics */}
                      <div className="p-2.5 bg-slate-950/80 rounded border border-slate-900 space-y-2">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-slate-400">Pathfinder Node Search</span>
                          {debugInfo ? (
                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${debugInfo.pathFound ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                              {debugInfo.reason}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">No search tick</span>
                          )}
                        </div>

                        {debugInfo && (
                          <div className="space-y-1.5 text-[10px] font-mono text-slate-300">
                            {/* Detailed boolean conditions */}
                            <div className="grid grid-cols-2 gap-x-2 gap-y-1 border-t border-slate-900 pt-1.5 text-[9px]">
                              <div className="flex justify-between">
                                <span className="text-slate-500">Evaluated:</span>
                                <span className="text-slate-300">{debugInfo.checks?.iterations ?? 0} iter</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Reachable Check:</span>
                                <span className="text-slate-300">{debugInfo.checks?.reachableChecked ?? 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Void Collision:</span>
                                <span className={debugInfo.checks?.blockedByVoidCount > 0 ? 'text-rose-400' : 'text-slate-400'}>
                                  {debugInfo.checks?.blockedByVoidCount ?? 0}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">Heuristic Dist:</span>
                                <span className="text-amber-500 font-bold">{distToCore} hex</span>
                              </div>
                            </div>

                            {/* Boolean Fail Flags if pathfinding failed */}
                            {!debugInfo.pathFound && (
                              <div className="bg-rose-950/20 p-2 rounded border border-rose-500/10 mt-1 space-y-1">
                                <span className="text-[9px] text-rose-400 font-bold uppercase tracking-wider block">
                                  Path Blocks Verified:
                                </span>
                                <ul className="list-disc pl-3 text-[9px] text-rose-300/80 space-y-0.5">
                                  {debugInfo.checks?.endHexIsVoid && <li>Destination core target is engulfed in VOID.</li>}
                                  {debugInfo.checks?.tooFar && <li>Core out of maximum seek radius (MAX_PATH_LENGTH limit).</li>}
                                  {debugInfo.checks?.timeout && <li>A* search exceeded safety limits (MAX_SEARCH_ITERATIONS timeout).</li>}
                                  {!debugInfo.checks?.endHexIsVoid && !debugInfo.checks?.tooFar && !debugInfo.checks?.timeout && (
                                    <li>All surrounding neighbors are VOID or blocked by high physical thresholds.</li>
                                  )}
                                </ul>
                              </div>
                            )}

                            {/* Weighted Obstacles encountered */}
                            {debugInfo.checks?.obstaclesEncountered && debugInfo.checks.obstaclesEncountered.length > 0 && (
                              <div className="mt-1 pt-1 border-t border-slate-900/80">
                                <span className="text-[9px] text-slate-500 block uppercase font-bold tracking-wider">
                                  Weight-Biased Obstacles:
                                </span>
                                <div className="max-h-16 overflow-y-auto space-y-0.5 mt-1 pr-1 text-[9px] text-slate-400 select-text">
                                  {debugInfo.checks.obstaclesEncountered.map((evt: string, idx: number) => (
                                    <div key={idx} className="flex gap-1.5 border-b border-slate-900/30 py-0.5">
                                      <span className="text-amber-500 font-bold">▶</span>
                                      <span>{evt}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Tactical Feed / Bot Log */}
            <div className="space-y-3">
              <h4 className="text-xs font-black tracking-widest font-mono text-slate-400 uppercase flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-500" />
                Live Sector Signal Feed
              </h4>

              <div className="bg-slate-950 p-2 rounded-xl border border-slate-900 max-h-48 overflow-y-auto font-mono text-[10px] space-y-1.5 custom-scrollbar select-text">
                {logs.length === 0 ? (
                  <div className="text-slate-600 text-center py-4 italic">
                    Waiting for tactical telemetry signals...
                  </div>
                ) : (
                  [...logs].reverse().slice(0, 30).map((log, i) => (
                    <div key={log.timestamp + '-' + i} className="border-b border-slate-900/60 pb-1 flex flex-col gap-0.5">
                      <div className="flex items-center justify-between text-[9px] text-slate-500">
                        <span>Vector {log.botId.slice(-4).toUpperCase()} ({log.role})</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-slate-300 leading-normal">
                        <span className="text-amber-500 font-bold mr-1">{log.action}</span>
                        <span>({log.reason})</span>
                        {log.target && <span className="text-slate-400 text-[9px] ml-1 bg-slate-900 px-1 py-0.2 rounded border border-slate-800">Target: {log.target}</span>}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
