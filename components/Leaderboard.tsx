
import React, { useRef, useEffect } from 'react';
import { useGameStore } from '../store.ts';
import { Trophy, Coins, Layers, ArrowLeft, User, Zap, Shield, Ghost, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { TEXT } from '../services/i18n.ts';
import { textureService } from '../services/textureService.ts';

// Helper component to render a single hex preview
const HexPreview: React.FC<{ level: number }> = ({ level }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Get texture from service (returns 64x64)
        const tex = textureService.getTexture(level, 0, 0);
        
        // Increased size for better visibility
        const size = 64; 
        
        ctx.clearRect(0,0,size,size);
        
        // Draw Hexagon shape clip
        ctx.beginPath();
        const radius = size / 2 - 2; // slight padding
        const cx = size / 2;
        const cy = size / 2;
        for (let i = 0; i < 6; i++) {
            const angle = (60 * i + 30) * Math.PI / 180;
            ctx.lineTo(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
        }
        ctx.closePath();
        ctx.save();
        ctx.clip();
        // Draw the 64x64 texture onto the canvas
        ctx.drawImage(tex, 0, 0, 64, 64, 0, 0, size, size);
        ctx.restore();
        
        // Border
        ctx.strokeStyle = level < 0 ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

    }, [level]);

    return (
        <div className="flex flex-col items-center gap-2 shrink-0 mx-2 snap-center transition-transform hover:scale-110 duration-200">
            <canvas ref={canvasRef} width={64} height={64} className="drop-shadow-xl shadow-black/50" />
            <span className={`text-[10px] font-mono font-bold ${level < 0 ? 'text-red-400' : (level > 0 ? 'text-indigo-400' : 'text-slate-500')}`}>
                {level === 0 ? 'L0' : (level > 0 ? `L${level}` : level)}
            </span>
        </div>
    );
};

const Leaderboard: React.FC = () => {
  const leaderboard = useGameStore(state => state.leaderboard);
  const user = useGameStore(state => state.user);
  const setUIState = useGameStore(state => state.setUIState);
  const language = useGameStore(state => state.language);
  const t = TEXT[language].LEADERBOARD;
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const getIconComponent = (id?: string) => {
    switch(id) {
        case 'bot': return Bot;
        case 'zap': return Zap;
        case 'shield': return Shield;
        case 'ghost': return Ghost;
        default: return User;
    }
  };

  const scroll = (offset: number) => {
      if (scrollRef.current) {
          scrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
      }
  };

  // Generate range -10 to 10
  const rankRange = Array.from({ length: 21 }, (_, i) => i - 10);

  return (
    <div className="w-full h-full flex items-center justify-center p-4 md:p-12 pointer-events-auto">
      <div className="w-full max-w-4xl bg-slate-900/95 backdrop-blur border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 md:p-8 border-b border-slate-800 flex items-center justify-between bg-black/20 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="p-2 md:p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20">
              <Trophy className="w-6 h-6 md:w-8 md:h-8 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-wider">{t.TITLE}</h2>
              <p className="text-slate-500 text-[10px] md:text-xs font-mono tracking-widest uppercase">{t.SUBTITLE}</p>
            </div>
          </div>
          <button 
            onClick={() => setUIState('MENU')}
            className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-[10px] md:text-xs font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden md:inline">{t.BTN_BACK}</span>
          </button>
        </div>

        {/* Table Header (Hidden on Mobile) */}
        <div className="hidden md:grid grid-cols-12 gap-4 px-8 py-4 bg-slate-950/50 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] border-b border-slate-800 shrink-0">
          <div className="col-span-1 text-center">#</div>
          <div className="col-span-7">{t.HEADER_COMM}</div>
          <div className="col-span-2 text-right">{t.HEADER_CREDITS}</div>
          <div className="col-span-2 text-right">{t.HEADER_RANK}</div>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 no-scrollbar">
          {leaderboard.map((entry, index) => {
            const IconCmp = getIconComponent(entry.avatarIcon);
            const isSelf = user && entry.nickname === user.nickname;
            
            return (
            <div 
              key={`${entry.nickname}-${index}`}
              className={`
                flex flex-row items-center justify-between px-4 py-3 border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors
                md:grid md:grid-cols-12 md:gap-4 md:px-8 md:py-5
                ${isSelf ? 'bg-indigo-900/20 border-l-4 border-l-indigo-500 pl-3 md:pl-[30px]' : ''}
              `}
            >
              {/* Left Group: Rank, Avatar, Name */}
              <div className="flex items-center gap-3 md:gap-4 md:col-span-8 overflow-hidden">
                 {/* Rank Number */}
                 <div className="font-mono text-slate-500 font-bold w-6 text-center text-xs md:text-base md:col-span-1">
                    {index + 1}
                 </div>

                 {/* Avatar */}
                 <div className="w-8 h-8 md:w-10 md:h-10 rounded-full flex-shrink-0 border border-white/10 flex items-center justify-center shadow-lg" style={{ backgroundColor: entry.avatarColor }}>
                    <IconCmp className="w-4 h-4 md:w-5 md:h-5 text-white" />
                 </div>

                 {/* Name & Date */}
                 <div className="flex flex-col min-w-0">
                    <span className={`text-sm md:text-base font-bold truncate ${isSelf ? 'text-indigo-400' : 'text-white'}`}>
                        {entry.nickname}
                    </span>
                    <span className="text-[9px] text-slate-600 font-mono mt-0.5 hidden md:block">
                        {new Date(entry.timestamp).toLocaleDateString()}
                    </span>
                 </div>
              </div>

              {/* Right Group: Stats */}
              <div className="flex flex-col items-end gap-1 md:contents">
                  {/* Credits */}
                  <div className="md:col-span-2 text-right font-mono text-amber-500 font-bold flex items-center justify-end gap-1.5 text-xs md:text-base">
                    {entry.maxCoins} <Coins className="w-3 h-3 md:w-4 md:h-4 opacity-70" />
                  </div>

                  {/* Rank */}
                  <div className="md:col-span-2 text-right font-mono text-emerald-400 font-bold flex items-center justify-end gap-1.5 text-xs md:text-base">
                    L{entry.maxLevel} <Layers className="w-3 h-3 md:w-4 md:h-4 opacity-70" />
                  </div>
              </div>

            </div>
            );
          })}
          
          {leaderboard.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">{t.EMPTY}</div>
          )}
        </div>

        {/* RANK SPECTRUM FOOTER */}
        <div className="p-4 bg-black/40 border-t border-slate-800 shrink-0">
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-3 text-center">Rank Spectrum (Terrain Data)</div>
            
            <div className="relative flex items-center justify-center">
                {/* Scroll Left */}
                <button 
                    onClick={() => scroll(-300)}
                    className="absolute left-0 z-10 p-2 md:p-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full shadow-xl backdrop-blur-sm transition-all hover:scale-110 active:scale-95 hidden md:flex"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Container */}
                <div 
                    ref={scrollRef}
                    className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-2 px-8 md:px-16 w-full scroll-smooth mask-linear-fade snap-x"
                >
                    {rankRange.map(lvl => <HexPreview key={lvl} level={lvl} />)}
                </div>

                {/* Scroll Right */}
                <button 
                    onClick={() => scroll(300)}
                    className="absolute right-0 z-10 p-2 md:p-3 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full shadow-xl backdrop-blur-sm transition-all hover:scale-110 active:scale-95 hidden md:flex"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Leaderboard;
