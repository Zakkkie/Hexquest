import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ChevronRight, X, MousePointer, ChevronDown } from 'lucide-react';

export interface CometSpotlightProps {
  targetPos: { x: number; y: number } | null;
  title: string;
  description: string;
  language?: 'RU' | 'EN';
  actionText?: string;
  onAction?: () => void;
  showNextButton?: boolean;
  onNext?: () => void;
  onClose?: () => void;
  onClickSpotlight?: () => void;
  isStrictActionRequired?: boolean;
  isToolbarTarget?: boolean;
  showElevationGraphic?: boolean;
  showSupportRuleGraphic?: boolean;
}

export const CometSpotlight: React.FC<CometSpotlightProps> = ({
  targetPos,
  title,
  description,
  language = 'RU',
  actionText,
  onAction,
  showNextButton = true,
  onNext,
  onClose,
  onClickSpotlight,
  isStrictActionRequired = false,
  isToolbarTarget = false,
  showElevationGraphic = false,
  showSupportRuleGraphic = false,
}) => {
  const [, setViewportTick] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(Boolean(isStrictActionRequired));

  useEffect(() => {
    setIsCollapsed(Boolean(isStrictActionRequired));
  }, [isStrictActionRequired, title]);

  useEffect(() => {
    const handleViewportChange = () => setViewportTick(t => t + 1);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('orientationchange', handleViewportChange);
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener('resize', handleViewportChange);
      vv.addEventListener('scroll', handleViewportChange);
    }
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('orientationchange', handleViewportChange);
      if (vv) {
        vv.removeEventListener('resize', handleViewportChange);
        vv.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, []);

  if (!targetPos) return null;

  const vvHeight = window.visualViewport?.height || window.innerHeight;
  const vvTop = window.visualViewport?.offsetTop || 0;

  // Calculate positioning: if target is in bottom half of viewport, place tooltip near top, else near bottom
  const isUpperHalf = targetPos.y < (vvTop + vvHeight * 0.55);

  const primaryAction = onAction || onNext;
  const primaryText = actionText || (language === 'RU' ? 'Продолжить' : 'Continue');
  const hasButton = Boolean(primaryAction) && !isStrictActionRequired;

  return (
    <div className="aria-hidden:hidden fixed inset-0 z-40 overflow-hidden pointer-events-none font-sans">
      {/* Dynamic Ambient Dimming Overlay - clicking outside collapses expanded briefing window */}
      <div
        onClick={() => {
          if (!isCollapsed) {
            setIsCollapsed(true);
          }
        }}
        className={`absolute inset-0 transition-opacity duration-300 ${
          isCollapsed
            ? 'bg-slate-950/0 backdrop-blur-none pointer-events-none'
            : isStrictActionRequired || isToolbarTarget
            ? 'bg-slate-950/20 backdrop-blur-[0.5px] pointer-events-auto cursor-pointer'
            : 'bg-slate-950/60 backdrop-blur-[1.5px] pointer-events-auto cursor-pointer'
        }`}
      />

      {/* Toolbar Spotlight Ring if targeting Toolbar */}
      {isToolbarTarget && !isCollapsed && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 w-[95vw] max-w-lg h-24 rounded-3xl border-4 border-amber-400 bg-amber-500/20 shadow-[0_0_60px_rgba(245,158,11,0.95)] ring-8 ring-amber-400/60 animate-pulse pointer-events-none z-50" />
      )}

      {/* Contextual Floating Tooltip Container */}
      <AnimatePresence>
        <div
          className={`fixed inset-x-0 z-50 flex justify-center px-4 pointer-events-none transition-all duration-300 ${
            isCollapsed
              ? 'top-[58px] sm:top-[66px] md:top-[76px]'
              : isToolbarTarget || isStrictActionRequired
              ? 'top-16 sm:top-20'
              : isUpperHalf
              ? 'bottom-28 sm:bottom-32'
              : 'top-16 sm:top-20'
          }`}
        >
          {isCollapsed ? (
            /* COMPACT COLLAPSED TASK BAR FOR UNSTRUCTED MAP BUILDING */
            <motion.div
              key={`collapsed-${title}`}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 260, damping: 25 }}
              onClick={() => setIsCollapsed(false)}
              className="pointer-events-auto w-full max-w-md mx-auto cursor-pointer"
            >
              <div className="relative overflow-hidden rounded-2xl border-2 border-amber-400/90 bg-slate-950/90 px-3.5 py-2.5 shadow-[0_0_35px_rgba(245,158,11,0.5)] backdrop-blur-xl text-slate-100 flex items-center justify-between gap-3">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />

                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-500/25 text-amber-300 border border-amber-400/80 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                    <Sparkles className="h-4 w-4 text-yellow-300 animate-pulse" />
                  </div>
                  <div className="min-w-0 flex flex-col justify-center flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] font-mono font-black tracking-widest text-amber-400 uppercase break-words whitespace-pre-wrap leading-tight">
                        {title}
                      </span>
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                    </div>
                    <p className="text-[10px] sm:text-xs font-medium text-slate-200 break-words whitespace-pre-wrap leading-normal font-sans mt-0.5">
                      {description.split('\n')[0]}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCollapsed(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/35 border border-amber-400/50 text-amber-300 text-[10px] font-mono font-bold tracking-wider uppercase transition-colors shrink-0 cursor-pointer touch-manipulation"
                  title={language === 'RU' ? 'Развернуть описание' : 'Expand description'}
                >
                  <span>{language === 'RU' ? 'Инфо' : 'Info'}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            /* EXPANDED FULL BRIEFING CARD */
            <motion.div
              key={`tooltip-${title}`}
              initial={{ opacity: 0, y: isUpperHalf ? 20 : -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              className="pointer-events-auto w-full max-w-sm sm:max-w-md"
            >
              <div 
                className="relative overflow-hidden rounded-3xl border-2 border-amber-400/80 bg-slate-950/95 p-5 shadow-[0_0_60px_rgba(245,158,11,0.45)] backdrop-blur-xl text-slate-100 mt-[20px] pt-[20px]"
              >
                {/* Animated Top Scanline Glow Accent */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent animate-pulse" />
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-amber-500/20 via-transparent to-amber-500/10 pointer-events-none" />

                {/* Ambient Background Glows */}
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-amber-500/20 blur-2xl pointer-events-none" />
                <div className="absolute -left-10 -bottom-10 h-32 w-32 rounded-full bg-yellow-500/15 blur-2xl pointer-events-none" />

                {/* Header: Icon, Title & Controls */}
                <div className="relative z-10 flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/25 text-amber-300 border-2 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.6)]">
                      <Sparkles className="h-5 w-5 animate-pulse text-yellow-300" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono font-bold tracking-widest text-amber-400 uppercase block">
                        {language === 'RU' ? 'ОБУЧЕНИЕ • ИНСТРУКТАЖ' : 'TUTORIAL • BRIEFING'}
                      </span>
                      <h3 
                        className="text-xs sm:text-sm md:text-base font-black tracking-wide text-amber-100 uppercase font-mono break-words whitespace-pre-wrap leading-tight"
                      >
                        {title}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!isStrictActionRequired && onClose && (
                      <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-400 hover:text-amber-200 hover:bg-slate-800/80 transition-colors touch-manipulation border border-transparent hover:border-amber-500/40 cursor-pointer"
                        title={language === 'RU' ? 'Закрыть обучение' : 'Close tutorial'}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Description Text */}
                <p className="relative z-10 text-xs sm:text-sm text-slate-200 leading-relaxed font-sans mb-3 whitespace-pre-line">
                  {description}
                </p>

                {/* Animated Elevation & Defense Visual Presentation */}
                {showElevationGraphic && (
                  <div className="relative z-10 my-3 rounded-2xl border border-amber-500/40 bg-slate-900/90 p-3 overflow-hidden shadow-inner">
                    <div className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>{language === 'RU' ? 'СИМУЛЯЦИЯ ВЫСОТНОЙ ЗАЩИТЫ' : 'ELEVATION DEFENSE SIMULATION'}</span>
                      <span className="text-emerald-400 font-bold font-mono text-[9px] animate-pulse">L0 ➔ L1 (+50% DEFENSE)</span>
                    </div>

                    <div className="relative h-24 w-full flex items-center justify-center bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden">
                      {/* Grid background lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-[size:16px_16px]" />

                      {/* Animated Elevation Diagram */}
                      <div className="relative z-10 flex items-end justify-center gap-6 w-full px-6">
                        {/* L0 Ground Base */}
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] font-mono text-slate-400 mb-1">L0 (0m)</span>
                          <div className="w-16 h-4 bg-slate-800 border border-slate-600 rounded-sm flex items-center justify-center">
                            <span className="text-[8px] font-mono text-slate-400">GROUND</span>
                          </div>
                        </div>

                        {/* Enemy Attack Trajectory Vector */}
                        <div className="absolute left-8 bottom-6 w-24 h-0.5 bg-gradient-to-r from-red-500 via-amber-400 to-transparent animate-pulse origin-left rotate-[-25deg]">
                          <div className="absolute -right-1 -top-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                        </div>

                        {/* Deflection Shield Beam */}
                        <div className="absolute right-14 bottom-7 w-12 h-12 rounded-full border-2 border-amber-400/80 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.6)] animate-pulse flex items-center justify-center">
                          <span className="text-[8px] font-mono font-black text-amber-300 tracking-tighter uppercase">BLOCK</span>
                        </div>

                        {/* Elevated L1 Core Matrix */}
                        <div className="flex flex-col items-center z-10">
                          <span className="text-[9px] font-mono text-amber-300 font-bold mb-1 animate-bounce">L1 (+2m) CORE</span>
                          <div className="w-20 h-10 bg-gradient-to-t from-amber-950 to-amber-600 border-2 border-amber-400 rounded-lg shadow-[0_0_20px_rgba(245,158,11,0.5)] flex flex-col items-center justify-center">
                            <span className="text-[10px] font-mono font-black text-amber-100">CORE [L1]</span>
                            <span className="text-[8px] font-mono text-amber-300/90 font-bold">PROTECTED</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Animated 2-Support Rule Visual Presentation for L2 */}
                {showSupportRuleGraphic && (
                  <div className="relative z-10 my-3 rounded-2xl border border-cyan-500/50 bg-slate-900/95 p-3 overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.2)]">
                    <div className="text-[10px] font-mono font-bold text-cyan-300 uppercase tracking-wider mb-2 flex items-center justify-between">
                      <span>{language === 'RU' ? 'ПРАВИЛО 2 ОПОР (SUPPORT RULE)' : '2-SUPPORT RULE FOR L2'}</span>
                      <span className="text-amber-300 font-bold font-mono text-[9px] animate-pulse">L1 + L1 ➔ L2</span>
                    </div>

                    <div className="relative h-28 w-full flex flex-col items-center justify-center bg-slate-950/90 rounded-xl border border-slate-800 overflow-hidden px-4 py-2">
                      <div className="absolute inset-0 bg-[linear-gradient(to_right,#06b6d410_1px,transparent_1px),linear-gradient(to_bottom,#06b6d410_1px,transparent_1px)] bg-[size:16px_16px]" />

                      <div className="relative z-10 flex flex-col items-center w-full">
                        {/* Top: Elevated L2 Hex */}
                        <div className="relative z-20 flex flex-col items-center mb-1">
                          <div className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 border-2 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.8)] text-center animate-bounce">
                            <span className="text-[11px] font-mono font-black text-white tracking-wider uppercase">ГЕКС L2 (+4m)</span>
                            <span className="text-[8px] font-mono text-cyan-200 block font-bold">ELEVATED LEVEL 2</span>
                          </div>
                        </div>

                        {/* Connecting Support Beams */}
                        <div className="w-32 flex justify-between px-4 -my-1 relative z-10">
                          <div className="w-0.5 h-4 bg-gradient-to-t from-emerald-400 to-cyan-300 animate-pulse" />
                          <div className="w-0.5 h-4 bg-gradient-to-t from-emerald-400 to-cyan-300 animate-pulse" />
                        </div>

                        {/* Bottom: 2 Support Hexes of Level 1 */}
                        <div className="flex items-center justify-center gap-3 w-full">
                          <div className="px-3 py-1 rounded-md bg-emerald-950/90 border border-emerald-400/80 text-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            <span className="text-[9px] font-mono font-bold text-emerald-300 block">ОПОРА 1</span>
                            <span className="text-[8px] font-mono text-emerald-200">ПЛИТА L1</span>
                          </div>

                          <div className="text-[11px] font-black text-amber-400 animate-pulse">+</div>

                          <div className="px-3 py-1 rounded-md bg-emerald-950/90 border border-emerald-400/80 text-center shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            <span className="text-[9px] font-mono font-bold text-emerald-300 block">ОПОРА 2</span>
                            <span className="text-[8px] font-mono text-emerald-200">ПЛИТА L1</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-[9px] font-mono text-cyan-200/90 text-center mt-2 leading-tight">
                        {language === 'RU'
                          ? '⚠️ Для подъема на L2 под гексом должно быть минимум 2 смежные опоры L1'
                          : '⚠️ Elevating an L2 tile requires at least 2 adjacent L1 supports'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Action Bar / Progression Lock Indicator */}
                {isStrictActionRequired ? (
                  <div className="relative z-10 flex items-center justify-between gap-2 py-2.5 px-4 rounded-xl bg-amber-950/70 border-2 border-amber-400/80 text-amber-300 text-xs font-mono font-bold tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                      <MousePointer className="h-4 w-4 text-amber-300 animate-pulse shrink-0" />
                      <span className="break-words whitespace-pre-wrap flex-1 text-[11px] sm:text-xs">
                        {language === 'RU'
                          ? 'НАЖМИТЕ НА ПОДСВЕЧЕННЫЙ ГЕКС НА КАРТЕ'
                          : 'TAP THE HIGHLIGHTED HEX ON MAP'}
                      </span>
                    </div>
                  </div>
                ) : (
                  (hasButton || (!isStrictActionRequired && onClose)) && (
                    <div className="relative z-10 flex items-center justify-between pt-1 gap-2">
                      {!isStrictActionRequired && onClose ? (
                        <button
                          onClick={onClose}
                          className="text-xs font-mono text-slate-400 hover:text-amber-300 underline underline-offset-4 transition-colors px-1 py-1 cursor-pointer"
                        >
                          {language === 'RU' ? 'Пропустить' : 'Skip'}
                        </button>
                      ) : <div />}

                      {showNextButton && primaryAction && (
                        <motion.button
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={primaryAction}
                          className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-300 text-slate-950 uppercase tracking-widest shadow-[0_0_25px_rgba(245,158,11,0.7)] transition-all touch-manipulation font-black cursor-pointer"
                          style={{ fontSize: '10px', lineHeight: '12px', fontStyle: 'normal', fontWeight: 'bold' }}
                        >
                          <span>{primaryText}</span>
                          <ChevronRight className="h-4 w-4" />
                        </motion.button>
                      )}
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </div>
      </AnimatePresence>
    </div>
  );
};

