
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { Trophy, LogOut, Ghost, ArrowRight, Shield, X, LogIn, Lock, Target, Gem, Crown, Bot, Activity, Volume2, VolumeX, BookOpen, Globe, Music, ChevronLeft, ChevronRight, Swords, Layers, Map as MapIcon, Box, Hexagon, UserPlus, Fingerprint, User, Mountain, Crosshair, Flame, Shuffle } from 'lucide-react';
import { WinCondition, Difficulty } from '../types.ts';
import { TEXT } from '../services/i18n.ts';
import { audioService } from '../services/audioService.ts';
import { DIFFICULTY_SETTINGS } from '../rules/config.ts';

const AVATAR_COLORS = [
  '#ef4444', 
  '#f97316', 
  '#eab308', 
  '#22c55e', 
  '#06b6d4', 
  '#3b82f6', 
  '#8b5cf6', 
  '#ec4899'  
];

type AuthMode = 'GUEST' | 'LOGIN' | 'REGISTER' | null;

// Mock Rendering of Character for Preview (Simulates Unit.tsx logic in SVG)
const CharacterPreview: React.FC<{ head: number, body: number, color: string }> = ({ head, body, color }) => {
    
    // Position adjustments for new floating bodies
    const headY = 25;
    const bodyY = 45;

    const renderHead = () => {
        switch(head % 4) {
            case 0: return <circle cx="50" cy={headY} r="14" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />; // Round
            case 1: return <rect x="38" y={headY - 12} width="24" height="24" rx="4" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />; // Block
            case 2: return <path d={`M50 ${headY-15} L62 ${headY+8} L38 ${headY+8} Z`} fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />; // Spike
            case 3: return <rect x="36" y={headY - 10} width="28" height="20" rx="6" fill={color} stroke="rgba(255,255,255,0.2)" strokeWidth="2" />; // Visor
            default: return <circle cx="50" cy={headY} r="14" fill={color} />;
        }
    };

    const renderBody = () => {
        // Floating Shadow
        const shadow = <ellipse cx="50" cy="85" rx="15" ry="4" fill="rgba(0,0,0,0.3)" />;

        switch(body % 4) {
            case 0: // Pod
                return (
                    <g>
                        {shadow}
                        {/* Glow */}
                        <circle cx="50" cy="75" r="10" fill="#0ea5e9" opacity="0.6" />
                        <rect x="35" y={bodyY} width="30" height="35" rx="12" fill={color} />
                        {/* Stripe */}
                        <rect x="47" y={bodyY+2} width="6" height="25" fill="rgba(255,255,255,0.3)" />
                        {/* Bottom Rim */}
                        <rect x="38" y={bodyY+30} width="24" height="6" fill="#1e293b" />
                    </g>
                );
            case 1: // Shard
                return (
                    <g>
                        {shadow}
                        <path d="M35 45 L65 45 L50 80 Z" fill={color} />
                        <path d="M38 45 L62 45 L50 60 Z" fill="#334155" />
                    </g>
                );
            case 2: // Orb
                return (
                    <g>
                        {shadow}
                        <ellipse cx="50" cy="65" rx="22" ry="7" fill="none" stroke="#475569" strokeWidth="3" />
                        <circle cx="50" cy="60" r="16" fill={color} />
                        <circle cx="45" cy="55" r="5" fill="rgba(255,255,255,0.3)" />
                        <ellipse cx="50" cy="65" rx="22" ry="7" fill="none" stroke="#94a3b8" strokeWidth="3" strokeDasharray="20 40" />
                    </g>
                );
            case 3: // Engine
                return (
                    <g>
                        {shadow}
                        <path d="M45 75 L55 75 L50 85 Z" fill="#f59e0b" />
                        <path d="M32 45 L68 45 L60 75 L40 75 Z" fill={color} />
                        <rect x="36" y="52" width="28" height="5" fill="#1e293b" />
                        <rect x="38" y="65" width="24" height="5" fill="#1e293b" />
                    </g>
                );
            default: return <rect x="38" y={bodyY} width="24" height="40" rx="8" fill={color} />;
        }
    };

    const renderEye = () => {
        // Simple Eye/Visor overlay
        switch(head % 4) {
            case 0: return <rect x="42" y={headY-2} width="16" height="6" rx="2" fill="white" opacity="0.8" />;
            case 1: return <g><rect x="44" y={headY-4} width="4" height="4" fill="white"/><rect x="52" y={headY-4} width="4" height="4" fill="white"/></g>;
            case 2: return <circle cx="50" cy={headY+2} r="3" fill="white"/>;
            case 3: return <rect x="40" y={headY-4} width="20" height="4" fill="cyan" filter="blur(1px)"/>;
            default: return null;
        }
    };

    return (
        <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-xl">
            {renderBody()}
            {renderHead()}
            {renderEye()}
        </svg>
    );
};

const MenuButton: React.FC<{ 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  subLabel?: string; 
  variant?: 'primary' | 'battle' | 'campaign' | 'danger' | 'default';
}> = ({ onClick, icon, label, subLabel, variant = 'default' }) => {
  const getStyle = () => {
    switch(variant) {
      case 'primary': return 'bg-indigo-600/10 border-indigo-500/50 hover:bg-indigo-500/20 hover:border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]';
      case 'campaign': return 'bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 border-indigo-400 hover:border-white text-white shadow-[0_0_20px_rgba(99,102,241,0.3)] animate-pulse-subtle';
      case 'battle': return 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 border-red-400 hover:border-white text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] animate-pulse-subtle';
      case 'danger': return 'bg-red-900/10 border-red-900/30 hover:bg-red-900/30 hover:border-red-500 text-red-200';
      default: return 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-500 text-slate-200';
    }
  };

  const getIconStyle = () => {
    switch(variant) {
      case 'primary': return 'bg-indigo-500 text-white';
      case 'campaign': return 'bg-white/20 text-white backdrop-blur-sm';
      case 'battle': return 'bg-white/20 text-white backdrop-blur-sm';
      case 'danger': return 'bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white';
      default: return 'bg-slate-800 text-slate-400 group-hover:bg-white group-hover:text-slate-900';
    }
  };

  return (
    <button 
      onClick={onClick}
      className={`group w-full flex items-center gap-4 p-4 md:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden active:scale-95 touch-manipulation ${getStyle()}`}
    >
      <div className={`p-3 md:p-3.5 rounded-xl transition-colors relative z-10 ${getIconStyle()}`}>
        {/* Pass larger icon size down if possible, but container controls visual weight */}
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6 md:w-5 md:h-5' })}
      </div>
      <div className="flex flex-col items-start relative z-10 text-left">
        <span className={`text-base md:text-sm font-black uppercase tracking-widest break-words whitespace-pre-wrap ${variant === 'battle' ? 'text-white' : ''}`}>{label}</span>
        {subLabel && <span className={`text-[11px] md:text-[10px] font-mono group-hover:text-slate-200 break-words whitespace-pre-wrap ${variant === 'battle' ? 'text-red-100' : 'text-slate-500'}`}>{subLabel}</span>}
      </div>
      
      {/* Shimmer Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none" />
    </button>
  );
};

const MainMenu: React.FC = () => {
  const user = useGameStore(state => state.user);
  const hasActiveSession = useGameStore(state => state.hasActiveSession);
  const isMusicMuted = useGameStore(state => state.isMusicMuted);
  const isSfxMuted = useGameStore(state => state.isSfxMuted);
  const language = useGameStore(state => state.language);
  
  const startNewGame = useGameStore(state => state.startNewGame);
  const setUIState = useGameStore(state => state.setUIState);
  const setLanguage = useGameStore(state => state.setLanguage);
  const logout = useGameStore(state => state.logout);
  const loginAsGuest = useGameStore(state => state.loginAsGuest);
  const loginUser = useGameStore(state => state.loginUser);
  const registerUser = useGameStore(state => state.registerUser);
  const abandonSession = useGameStore(state => state.abandonSession);
  const toggleMusic = useGameStore(state => state.toggleMusic);
  const toggleSfx = useGameStore(state => state.toggleSfx);
  const playUiSound = useGameStore(state => state.playUiSound);

  const [authMode, setAuthMode] = useState<AuthMode>(null);
  const [showMissionConfig, setShowMissionConfig] = useState(false);
  const [inputName, setInputName] = useState('');
  const [inputPassword, setInputPassword] = useState('');
  
  // Customization State
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[5]); 
  const [selectedHead, setSelectedHead] = useState(0);
  const [selectedBody, setSelectedBody] = useState(0);
  
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const soundMenuRef = useRef<HTMLDivElement>(null);

  // Animation State
  const [logoVisible, setLogoVisible] = useState(false);

  // Config State
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [botCount, setBotCount] = useState<number>(1);
  const [storageCap, setStorageCap] = useState<number>(4); 
  const [mapType, setMapType] = useState<'FLAT' | 'CHAOTIC'>('FLAT'); // New state

  const t = TEXT[language].MENU;

  // UPDATED MISSION TIERS FOR SUMMIT OBJECTIVE
  const MISSION_TIERS = {
    1: { level: 5, coins: 0, label: language === 'RU' ? 'ПИК УР.5' : 'SUMMIT L5', time: '~10m', color: 'text-blue-400', difficulty: 'EASY' as Difficulty, icon: Mountain, desc: 'Recon' },
    2: { level: 6, coins: 0, label: language === 'RU' ? 'ПИК УР.6' : 'SUMMIT L6', time: '~15m', color: 'text-amber-400', difficulty: 'MEDIUM' as Difficulty, icon: Target, desc: 'Std Ops' },
    3: { level: 7, coins: 0, label: language === 'RU' ? 'ПИК УР.7' : 'SUMMIT L7', time: '~25m', color: 'text-red-400', difficulty: 'HARD' as Difficulty, icon: Crown, desc: 'Apex' }
  };

  useEffect(() => {
      // Trigger entrance animation with a slight delay to ensure the browser registers the initial 'opacity-0' state
      const timer = setTimeout(() => {
          setLogoVisible(true);
      }, 100);
      
      audioService.startMusic();
      audioService.updateMusic(250, 500);
      
      return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (soundMenuRef.current && !soundMenuRef.current.contains(event.target as Node)) {
              setShowSoundMenu(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCampaignClick = () => {
     playUiSound('CLICK');
     if (hasActiveSession) {
         if (window.confirm(t.ABANDON_CONFIRM)) {
             abandonSession();
             setUIState('OVERWORLD');
         }
     } else {
         setUIState('OVERWORLD');
     }
  };

  const handleNewGameClick = () => {
    playUiSound('CLICK');
    if (hasActiveSession) {
      if (window.confirm(t.ABANDON_CONFIRM)) {
        setShowMissionConfig(true);
        setSelectedTier(1);
        setDifficulty('EASY');
      }
    } else {
      setShowMissionConfig(true);
      setSelectedTier(1);
      setDifficulty('EASY');
    }
  };

  const randomizeConfig = () => {
      playUiSound('CLICK');
      // Random Tier (1-3)
      const rTier = (Math.floor(Math.random() * 3) + 1) as 1|2|3;
      // Random Diff
      const diffs: Difficulty[] = ['EASY', 'MEDIUM', 'HARD'];
      const rDiff = diffs[Math.floor(Math.random() * 3)];
      // Random Bots (1-6)
      const rBots = Math.floor(Math.random() * 6) + 1;
      // Random Storage (3-6)
      const rStor = Math.floor(Math.random() * 4) + 3;
      // Random Map
      const rMap = Math.random() > 0.5 ? 'CHAOTIC' : 'FLAT';

      setSelectedTier(rTier);
      setDifficulty(rDiff);
      setBotCount(rBots);
      setStorageCap(rStor);
      setMapType(rMap);
  };

  const confirmMissionStart = () => {
    playUiSound('CLICK');
    const tier = MISSION_TIERS[selectedTier as 1|2|3];
    // Create WinCondition and Inject Storage Cap
    const winCondition: WinCondition = {
      levelId: -1,
      targetLevel: tier.level,
      targetCoins: tier.coins,
      botCount: botCount,
      difficulty: difficulty,
      label: `${tier.label}`,
      queueSize: DIFFICULTY_SETTINGS[difficulty].queueSize,
      winType: 'SUMMIT',
      initialStorage: storageCap, // PASS CUSTOM STORAGE SETTING
      mapType: mapType // Pass map type
    };
    
    startNewGame(winCondition);
    setShowMissionConfig(false);
  };

  const handleLogout = () => {
    playUiSound('CLICK');
    if (hasActiveSession) {
      if (window.confirm(t.LOGOUT_CONFIRM)) {
        logout();
      }
    } else {
      logout();
    }
  };

  const handleAuthSubmit = () => {
    playUiSound('CLICK');
    setErrorMessage(null);
    if (!inputName.trim()) {
      setErrorMessage("Name is required.");
      return;
    }

    const safeColor = selectedColor || AVATAR_COLORS[0];

    if (authMode === 'GUEST') {
      loginAsGuest(inputName, safeColor, selectedHead, selectedBody);
      setAuthMode(null);
    } else if (authMode === 'LOGIN') {
      if (!inputPassword.trim()) {
        setErrorMessage("Password is required.");
        return;
      }
      const res = loginUser(inputName, inputPassword);
      if (res.success) {
        setAuthMode(null);
      } else {
        setErrorMessage(res.message || "Login failed.");
      }
    } else if (authMode === 'REGISTER') {
      if (!inputPassword.trim()) {
        setErrorMessage("Password is required.");
        return;
      }
      const res = registerUser(inputName, inputPassword, safeColor, selectedHead, selectedBody);
      if (res.success) {
        setAuthMode(null);
      } else {
        setErrorMessage(res.message || "Registration failed.");
      }
    }
  };

  const renderAvatar = (color: string, head: number, body: number, size = 'md') => {
    let dims = size === 'lg' ? 'w-16 h-16' : (size === 'sm' ? 'w-6 h-6' : 'w-8 h-8');
    return (
      <div className={`${dims} rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg bg-slate-900 overflow-hidden relative`}>
         <div className="scale-50 translate-y-1">
            <CharacterPreview head={head} body={body} color={color} />
         </div>
      </div>
    );
  };

  const getDifficultyColor = (d: Difficulty) => {
      if (d === 'EASY') return 'text-emerald-400 border-emerald-500/50 bg-emerald-900/20';
      if (d === 'MEDIUM') return 'text-amber-400 border-amber-500/50 bg-amber-900/20';
      return 'text-red-400 border-red-500/50 bg-red-900/20';
  };

  const getDifficultyDesc = (d: Difficulty) => {
      if (d === 'EASY') return language === 'RU' ? 'Принимает любые ключи' : 'Accepts ANY Keys';
      if (d === 'MEDIUM') return language === 'RU' ? 'Ключи: Необычные+' : 'Keys: Uncommon+';
      return language === 'RU' ? 'Ключи: Редкие+' : 'Keys: Rare+ Only';
  };

  const getBotLabel = (count: number) => {
      if (count === 1) return t.BOT_LABEL_DUEL;
      if (count <= 3) return t.BOT_LABEL_SKIRMISH;
      if (count <= 5) return t.BOT_LABEL_WAR;
      return t.BOT_LABEL_CHAOS;
  };

  const cycleOption = (setter: (v: number) => void, current: number, direction: 1 | -1, max: number) => {
      let next = current + direction;
      if (next < 0) next = max - 1;
      if (next >= max) next = 0;
      setter(next);
      playUiSound('CLICK');
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-auto">
      
      {/* HEADER BAR */}
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex flex-col md:flex-row justify-between items-center md:items-start z-50 pointer-events-auto">
        <div className="w-full flex justify-between items-start">
            <div className="flex gap-2 relative">
                <button 
                  onClick={() => { setShowSoundMenu(!showSoundMenu); playUiSound('CLICK'); }}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center backdrop-blur rounded-full transition-all border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                {showSoundMenu && (
                    <div ref={soundMenuRef} className="absolute top-full left-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[200px] z-[60]">
                        <button onClick={() => { toggleMusic(); playUiSound('CLICK'); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left ${isMusicMuted ? 'text-slate-500 hover:bg-slate-800' : 'text-indigo-400 bg-indigo-900/20 hover:bg-indigo-900/30'}`}>
                            {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                            <span className="text-xs font-bold uppercase">Music</span>
                        </button>
                        <button onClick={() => { toggleSfx(); playUiSound('CLICK'); }} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left ${isSfxMuted ? 'text-slate-500 hover:bg-slate-800' : 'text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/30'}`}>
                            {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            <span className="text-xs font-bold uppercase">SFX</span>
                        </button>
                    </div>
                )}
                
                <button onClick={() => setLanguage(language === 'EN' ? 'RU' : 'EN')} className="h-10 md:h-12 px-3 md:px-4 bg-slate-900/50 hover:bg-slate-800 backdrop-blur rounded-full text-slate-400 hover:text-white transition-all border border-slate-800 flex items-center justify-center gap-1 font-bold text-xs">
                  <Globe className="w-4 h-4" /> {language}
                </button>
            </div>

            <div className="flex items-center gap-2">
                {!user ? (
                  <button 
                    onClick={() => { setAuthMode('LOGIN'); setInputName(''); setInputPassword(''); setErrorMessage(null); playUiSound('CLICK'); }} 
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 hover:text-white rounded-xl border border-indigo-500/30 hover:border-indigo-500/50 transition-all shadow-[0_0_10px_rgba(99,102,241,0.1)] group"
                  >
                     <Fingerprint className="w-4 h-4 group-hover:text-indigo-300" />
                     <span className="text-[10px] md:text-xs font-black uppercase tracking-wider">{t.MODAL_LOGIN_TITLE}</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 bg-slate-900/90 p-1.5 pl-4 rounded-full border border-slate-700 shadow-2xl">
                    <div className="flex flex-col items-end"><span className="text-xs font-bold text-white leading-tight max-w-[100px] truncate break-words whitespace-pre-wrap">{user.nickname}</span><span className="text-[10px] text-slate-400 uppercase tracking-widest break-words whitespace-pre-wrap">{user.isGuest ? t.AUTH_GUEST : 'Commander'}</span></div>
                    {renderAvatar(user.avatarColor, user.headIndex, user.bodyIndex, 'sm')}
                    <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* CENTER MENU */}
      <div className="flex flex-col gap-6 w-full max-w-sm px-6 z-10 max-h-screen overflow-y-auto no-scrollbar py-20 md:py-0">
        
        {/* LOGO BLOCK WITH ANIMATION */}
        <div className={`text-center mb-4 md:mb-8 relative group cursor-default transition-all duration-1000 ease-out transform ${logoVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-12 scale-90'}`}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 md:w-48 h-32 md:h-48 bg-indigo-500/20 blur-[30px] md:blur-[50px] rounded-full animate-pulse"></div>
          <div className="relative flex flex-col items-center justify-center">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 md:w-28 h-20 md:h-28 border border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
              <div className="relative mb-1 md:mb-2">
                  <Hexagon className="w-14 h-14 md:w-20 md:h-20 text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] fill-indigo-900/20" strokeWidth={1.5} />
                  <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                      <Target className="w-5 h-5 md:w-8 md:h-8 text-white drop-shadow-[0_0_10px_#fff]" />
                  </div>
              </div>
              <h1 className="relative text-4xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] z-10 break-words whitespace-pre-wrap">
                  {t.TITLE}
              </h1>
              <div className="flex items-center gap-2 md:gap-3 mt-1 md:mt-2 opacity-80">
                  <div className="h-px w-8 md:w-12 bg-indigo-500/50"></div>
                  <p className="text-[8px] md:text-xs text-indigo-300 font-mono tracking-[0.3em] md:tracking-[0.4em] uppercase whitespace-nowrap break-words whitespace-pre-wrap">{t.SUBTITLE}</p>
                  <div className="h-px w-8 md:w-12 bg-indigo-500/50"></div>
              </div>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <MenuButton onClick={handleCampaignClick} variant="primary" icon={<BookOpen className="w-5 h-5 fill-current" />} label={t.CAMPAIGN} subLabel={t.CAMPAIGN_SUB} />
          <MenuButton onClick={handleNewGameClick} variant="battle" icon={<Swords className="w-5 h-5" />} label={t.SKIRMISH} subLabel={t.SKIRMISH_SUB} />
          {hasActiveSession && <MenuButton onClick={() => { setUIState('GAME'); playUiSound('CLICK'); }} icon={<ArrowRight className="w-5 h-5" />} label={t.RESUME} subLabel={t.RESUME_SUB} />}
          <MenuButton onClick={() => { setUIState('LEADERBOARD'); playUiSound('CLICK'); }} icon={<Trophy className="w-5 h-5" />} label={t.LEADERBOARD} subLabel={t.LEADERBOARD_SUB} />
        </div>
      </div>

      {/* AUTH MODAL */}
      {authMode && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-[2rem] shadow-2xl w-full max-w-sm relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
            {/* ... Existing Auth Modal Content (kept as is) ... */}
            <div className="grid grid-cols-2 border-b border-slate-700/50">
                <button onClick={() => { setAuthMode('LOGIN'); playUiSound('CLICK'); }} className={`py-4 text-xs font-black uppercase tracking-widest transition-colors break-words whitespace-pre-wrap ${authMode === 'LOGIN' ? 'bg-slate-800/50 text-indigo-400 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>{t.AUTH_LOGIN}</button>
                <button onClick={() => { setAuthMode('REGISTER'); playUiSound('CLICK'); }} className={`py-4 text-xs font-black uppercase tracking-widest transition-colors break-words whitespace-pre-wrap ${authMode === 'REGISTER' ? 'bg-slate-800/50 text-emerald-400 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>{t.AUTH_REGISTER}</button>
            </div>
            <div className="p-4 md:p-8 flex flex-col gap-4 md:gap-5 overflow-y-auto no-scrollbar max-h-[80vh]">
              <div className="flex items-center gap-2 md:gap-3 mb-1">
                  <div className={`p-2.5 md:p-3 rounded-xl border shadow-lg ${authMode === 'GUEST' ? 'bg-slate-800 border-slate-600' : (authMode === 'LOGIN' ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400' : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400')}`}>
                      {authMode === 'GUEST' ? <Ghost className="w-5 h-5 md:w-6 md:h-6 text-slate-300" /> : (authMode === 'LOGIN' ? <LogIn className="w-5 h-5 md:w-6 md:h-6" /> : <UserPlus className="w-5 h-5 md:w-6 md:h-6" />)}
                  </div>
                  <div>
                      <h2 className="text-lg md:text-xl font-bold text-white leading-none break-words whitespace-pre-wrap">{authMode === 'GUEST' ? t.MODAL_GUEST_TITLE : (authMode === 'LOGIN' ? t.MODAL_LOGIN_TITLE : t.MODAL_REGISTER_TITLE)}</h2>
                      <p className="text-[9px] md:text-[10px] text-slate-500 font-mono mt-1 uppercase tracking-wider break-words whitespace-pre-wrap">{authMode === 'GUEST' ? t.MODAL_GUEST_SUBTITLE : (authMode === 'LOGIN' ? t.MODAL_LOGIN_SUBTITLE : t.MODAL_REGISTER_SUBTITLE)}</p>
                  </div>
              </div>
              {errorMessage && <div className="p-2.5 md:p-3 bg-red-950/40 border border-red-900/50 rounded-xl flex items-center gap-2 text-red-400 text-[10px] md:text-xs font-bold animate-in slide-in-from-top-2 break-words whitespace-pre-wrap"><Shield className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" /> {errorMessage}</div>}
              <div className="space-y-3 md:space-y-4">
                  {(authMode === 'REGISTER' || authMode === 'GUEST') && (
                      <div className="bg-slate-950/50 rounded-2xl border border-slate-800 p-3 md:p-4 flex flex-col items-center gap-3 md:gap-4">
                          <span className="text-[8px] md:text-[9px] font-bold uppercase text-slate-500 tracking-widest w-full text-center break-words whitespace-pre-wrap">{t.UNIT_CONFIG}</span>
                          <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center bg-slate-900 rounded-full border-2 border-slate-800 shadow-inner">
                              <CharacterPreview head={selectedHead} body={selectedBody} color={selectedColor} />
                          </div>
                          <div className="flex gap-1.5 md:gap-2 w-full justify-between items-center">
                              <div className="flex flex-col items-center gap-1">
                                  <span className="text-[7px] md:text-[8px] uppercase text-slate-500 break-words whitespace-pre-wrap">{t.UNIT_HEAD}</span>
                                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800">
                                      <button onClick={() => cycleOption(setSelectedHead, selectedHead, -1, 4)} className="p-1 hover:bg-slate-800 text-slate-400"><ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                                      <button onClick={() => cycleOption(setSelectedHead, selectedHead, 1, 4)} className="p-1 hover:bg-slate-800 text-slate-400"><ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                                  </div>
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                  <span className="text-[7px] md:text-[8px] uppercase text-slate-500 break-words whitespace-pre-wrap">{t.UNIT_HULL}</span>
                                  <div className="flex gap-1 bg-slate-900 p-1 rounded-lg border border-slate-800">
                                      {AVATAR_COLORS.slice(0, 4).map(c => <button key={c} onClick={() => setSelectedColor(c)} style={{backgroundColor: c}} className={`w-3.5 h-3.5 md:w-4 md:h-4 rounded-full ${selectedColor === c ? 'ring-1 ring-white' : 'opacity-50'}`} />)}
                                  </div>
                              </div>
                              <div className="flex flex-col items-center gap-1">
                                  <span className="text-[7px] md:text-[8px] uppercase text-slate-500 break-words whitespace-pre-wrap">{t.UNIT_CHASSIS}</span>
                                  <div className="flex items-center bg-slate-900 rounded-lg border border-slate-800">
                                      <button onClick={() => cycleOption(setSelectedBody, selectedBody, -1, 4)} className="p-1 hover:bg-slate-800 text-slate-400"><ChevronLeft className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                                      <button onClick={() => cycleOption(setSelectedBody, selectedBody, 1, 4)} className="p-1 hover:bg-slate-800 text-slate-400"><ChevronRight className="w-3.5 h-3.5 md:w-4 md:h-4"/></button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
                  <div>
                      <label className="text-[8px] md:text-[9px] uppercase font-bold text-slate-500 tracking-widest mb-1 md:mb-1.5 block flex items-center gap-1.5 break-words whitespace-pre-wrap"><User className="w-3 h-3" /> {t.INPUT_NAME}</label>
                      <input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder={t.INPUT_NAME_PH} className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all font-mono text-xs md:text-sm" maxLength={16} />
                  </div>
                  {authMode !== 'GUEST' && (
                      <div>
                          <label className="text-[8px] md:text-[9px] uppercase font-bold text-slate-500 tracking-widest mb-1 md:mb-1.5 block flex items-center gap-1.5 break-words whitespace-pre-wrap"><Lock className="w-3 h-3" /> {t.INPUT_PASS}</label>
                          <input type="password" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} placeholder={t.INPUT_PASS_PH} className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-3 md:px-4 py-2.5 md:py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:bg-slate-900 transition-all font-mono text-xs md:text-sm" />
                      </div>
                  )}
                  <button onClick={handleAuthSubmit} className={`w-full py-3.5 md:py-4 mt-1 md:mt-2 font-bold rounded-xl uppercase tracking-[0.15em] shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 break-words whitespace-pre-wrap ${authMode === 'GUEST' ? 'bg-slate-700 hover:bg-slate-600 text-white' : (authMode === 'LOGIN' ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30')}`}>
                      {authMode === 'GUEST' ? t.BTN_GUEST : (authMode === 'LOGIN' ? t.BTN_LOGIN : t.BTN_REGISTER)} <ArrowRight className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  </button>
              </div>
              <div className="border-t border-slate-800 pt-4 flex justify-center">
                  {authMode === 'GUEST' ? (
                      <button onClick={() => setAuthMode('LOGIN')} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-400 transition-colors break-words whitespace-pre-wrap">{t.BTN_BACK_LOGIN}</button>
                  ) : (
                      <button onClick={() => setAuthMode('GUEST')} className="text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:text-slate-400 transition-colors flex items-center gap-2 break-words whitespace-pre-wrap"><Ghost className="w-3 h-3" /> {t.BYPASS_SECURITY}</button>
                  )}
              </div>
            </div>
            <button onClick={() => setAuthMode(null)} className="absolute top-3 right-3 p-2 text-slate-600 hover:text-white transition-colors rounded-full hover:bg-slate-800"><X className="w-5 h-5" /></button>
          </div>
        </div>
      
      )}

      {/* COMPACT BATTLE CONFIGURATOR */}
      {showMissionConfig && (
        <div className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950/80 border border-slate-700 rounded-[2rem] shadow-2xl w-full max-w-2xl h-fit max-h-[90vh] relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
             
             {/* Header */}
             <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
                <div className="flex items-center gap-3 md:gap-4">
                    <div className="p-2 bg-red-600/10 border border-red-500/30 rounded-xl shadow-[0_0_15px_rgba(220,38,38,0.2)]">
                        <Swords className="w-4 h-4 md:w-5 md:h-5 text-red-500" />
                    </div>
                    <div>
                        <h2 className="text-base md:text-lg font-black text-white uppercase tracking-tighter leading-none break-words whitespace-pre-wrap">{t.CONFIG_TITLE}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <p className="text-[8px] md:text-[9px] text-emerald-400 uppercase tracking-widest font-mono break-words whitespace-pre-wrap">{t.TERMINAL_ACTIVE}</p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={randomizeConfig} className="p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800 border border-slate-700 hover:border-slate-500" title="Randomize Conditions">
                        <Shuffle className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    <button onClick={() => setShowMissionConfig(false)} className="text-slate-500 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-800"><X className="w-4 h-4 md:w-5 md:h-5"/></button>
                </div>
             </div>

             {/* SCROLLABLE CONTENT */}
             <div className="flex-1 overflow-y-auto no-scrollbar p-3 md:p-6 space-y-4 md:space-y-6">
                 
                 {/* 1. MISSION SELECTION (Compact Grid) */}
                 <div>
                    <h3 className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 mb-1.5 md:mb-3 break-words whitespace-pre-wrap">
                        <Target className="w-2.5 h-2.5 md:w-3 md:h-3" /> {t.COL_GOAL_TITLE}
                    </h3>
                    <div className="grid grid-cols-3 gap-1.5 md:gap-3">
                        {[1, 2, 3].map(id => {
                              const tier = MISSION_TIERS[id as 1|2|3];
                              const isSelected = selectedTier === id;
                              const Icon = tier.icon;
                              return (
                                <button 
                                  key={id} 
                                  onClick={() => { setSelectedTier(id as 1|2|3); setDifficulty(tier.difficulty); playUiSound('CLICK'); }}
                                  className={`
                                    relative flex flex-col items-center justify-center p-1.5 md:p-3 rounded-xl transition-all duration-200 border group h-16 md:h-24
                                    ${isSelected 
                                        ? 'bg-gradient-to-b from-indigo-900/40 to-slate-900/80 border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                        : 'bg-slate-900/30 border-slate-800 hover:border-slate-600 hover:bg-slate-800/50'}
                                  `}
                                >
                                   <Icon className={`w-4 h-4 md:w-6 md:h-6 mb-1 md:mb-2 ${isSelected ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                   <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-wider text-center leading-tight break-words whitespace-pre-wrap ${isSelected ? 'text-white' : 'text-slate-400'}`}>{tier.label}</span>
                                   <span className="text-[7px] md:text-[9px] font-mono text-slate-500 mt-0.5 md:mt-1">{tier.time}</span>
                                </button>
                              );
                        })}
                    </div>
                 </div>

                 <div className="h-px bg-slate-800 w-full" />

                 {/* 2. CONFIGURATION GRID */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                     
                     {/* LEFT: DIFFICULTY & MAP TYPE */}
                     <div className="flex flex-col gap-3 md:gap-4">
                        {/* DIFFICULTY */}
                        <div>
                            <h3 className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 mb-1.5 md:mb-3 break-words whitespace-pre-wrap">
                                <Shield className="w-2.5 h-2.5 md:w-3 md:h-3" /> {t.LBL_DIFFICULTY}
                            </h3>
                            <div className="flex bg-slate-900 p-0.5 md:p-1 rounded-xl border border-slate-800 mb-1.5 md:mb-3">
                                {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => {
                                    const active = difficulty === d;
                                    let colorClass = 'text-slate-500 hover:text-slate-300';
                                    if (active) {
                                        if (d === 'EASY') colorClass = 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20';
                                        if (d === 'MEDIUM') colorClass = 'bg-amber-600 text-white shadow-lg shadow-amber-900/20';
                                        if (d === 'HARD') colorClass = 'bg-red-600 text-white shadow-lg shadow-red-900/20';
                                    }
                                    return (
                                        <button 
                                            key={d} 
                                            onClick={() => { setDifficulty(d); playUiSound('CLICK'); }}
                                            className={`flex-1 py-1 md:py-2 rounded-lg text-[7px] md:text-[10px] font-black uppercase tracking-wider transition-all break-words whitespace-pre-wrap ${colorClass}`}
                                        >
                                            {d === 'EASY' ? t.DIFF_EASY : d === 'MEDIUM' ? t.DIFF_MEDIUM : t.DIFF_HARD}
                                        </button>
                                    );
                                })}
                            </div>
                            
                            <div className={`p-2 md:p-3 rounded-xl border flex items-start gap-2 ${getDifficultyColor(difficulty)}`}>
                                <Activity className="w-2.5 h-2.5 md:w-4 md:h-4 shrink-0 mt-0.5 animate-pulse" />
                                <div>
                                    <span className="block text-[7px] md:text-[9px] font-black uppercase tracking-widest opacity-70 mb-0.5 break-words whitespace-pre-wrap">{t.RULES_ENGAGEMENT}</span>
                                    <span className="text-[8px] md:text-[10px] font-bold leading-tight block break-words whitespace-pre-wrap">{getDifficultyDesc(difficulty)}</span>
                                </div>
                            </div>
                        </div>

                        {/* MAP TYPE SELECTOR */}
                        <div>
                            <h3 className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 mb-1 md:mb-2 break-words whitespace-pre-wrap">
                                <MapIcon className="w-2.5 h-2.5 md:w-3 md:h-3" /> {language === 'RU' ? 'Ландшафт' : 'Terrain'}
                            </h3>
                            <div className="flex bg-slate-900 p-0.5 md:p-1 rounded-xl border border-slate-800">
                                <button 
                                    onClick={() => { setMapType('FLAT'); playUiSound('CLICK'); }}
                                    className={`flex-1 py-1 md:py-2 rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 md:gap-2 break-words whitespace-pre-wrap ${mapType === 'FLAT' ? 'bg-slate-700 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Layers className="w-2.5 h-2.5 md:w-3 md:h-3" /> {language === 'RU' ? 'Плоский' : 'Flat'}
                                </button>
                                <button 
                                    onClick={() => { setMapType('CHAOTIC'); playUiSound('CLICK'); }}
                                    className={`flex-1 py-1 md:py-2 rounded-lg text-[7px] md:text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 md:gap-2 break-words whitespace-pre-wrap ${mapType === 'CHAOTIC' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30' : 'text-slate-500 hover:text-slate-300'}`}
                                >
                                    <Activity className="w-2.5 h-2.5 md:w-3 md:h-3" /> {language === 'RU' ? 'Хаос' : 'Chaos'}
                                </button>
                            </div>
                        </div>
                     </div>

                     {/* RIGHT: BOTS & STORAGE */}
                     <div className="flex flex-col gap-3 md:gap-4">
                        {/* BOTS */}
                        <div>
                            <h3 className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 mb-1 md:mb-2 break-words whitespace-pre-wrap">
                                <Bot className="w-2.5 h-2.5 md:w-3 md:h-3" /> {t.LBL_RIVALS}
                            </h3>
                            <div className="grid grid-cols-6 gap-1 md:gap-1.5">
                                {[1, 2, 3, 4, 5, 6].map(count => (
                                    <button 
                                        key={count} 
                                        onClick={() => { setBotCount(count); playUiSound('CLICK'); }}
                                        className={`
                                            h-7 md:h-9 rounded-lg border flex items-center justify-center transition-all relative overflow-hidden group
                                            ${botCount === count 
                                                ? 'border-red-500 bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.4)]' 
                                                : 'border-slate-800 bg-slate-900 text-slate-600 hover:border-slate-600 hover:text-slate-400'}
                                        `}
                                    >
                                        <span className="text-[9px] md:text-xs font-black">{count}</span>
                                    </button>
                                ))}
                            </div>
                            <div className="flex justify-between mt-0.5 md:mt-1 px-1">
                                <span className="text-[7px] md:text-[9px] text-slate-600 font-mono uppercase tracking-wider break-words whitespace-pre-wrap">
                                    {getBotLabel(botCount)}
                                </span>
                                {botCount >= 4 && <span className="text-[7px] md:text-[9px] text-red-500 font-bold font-mono uppercase flex items-center gap-1"><Flame className="w-2 md:w-3 md:h-3" /> {t.HIGH_CPU}</span>}
                            </div>
                        </div>

                        {/* STORAGE SELECTOR (NEW) */}
                        <div>
                            <h3 className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 mb-1 md:mb-2 break-words whitespace-pre-wrap">
                                <Box className="w-2.5 h-2.5 md:w-3 md:h-3" /> {t.CARGO_CAP}
                            </h3>
                            <div className="flex gap-1 md:gap-2">
                                {[3, 4, 5, 6].map(cap => (
                                    <button
                                        key={cap}
                                        onClick={() => { setStorageCap(cap); playUiSound('CLICK'); }}
                                        className={`
                                            flex-1 h-7 md:h-9 rounded-lg border flex items-center justify-center gap-1 transition-all
                                            ${storageCap === cap 
                                                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]' 
                                                : 'border-slate-800 bg-slate-900 text-slate-600 hover:border-slate-600 hover:text-slate-400'}
                                        `}
                                    >
                                        <span className="text-[9px] md:text-xs font-black">{cap}</span>
                                        <div className="grid grid-cols-2 gap-0.5">
                                            {Array.from({length: cap}).map((_,i) => (
                                                <div key={i} className={`w-0.5 h-0.5 md:w-1 md:h-1 rounded-[1px] ${storageCap===cap ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                     </div>

                 </div>
             </div>

             {/* FOOTER ACTION */}
             <div className="p-3 md:p-6 border-t border-slate-800 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between gap-3 md:gap-4 shrink-0">
                 <div className="flex flex-col">
                     <span className="text-[7px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest break-words whitespace-pre-wrap">{t.EST_REWARD}</span>
                     <span className="text-xs md:text-base font-mono font-black text-amber-400 flex items-center gap-1 md:gap-2 break-words whitespace-pre-wrap">
                        <Gem className="w-3 md:w-4 md:h-4" />
                        {selectedTier === 3 ? t.REWARD_HIGH : (selectedTier === 2 ? t.REWARD_MED : t.REWARD_STD)}
                     </span>
                 </div>
                 <button 
                    onClick={confirmMissionStart}
                    className="flex-1 max-w-xs py-2 md:py-3.5 bg-white hover:bg-indigo-50 text-slate-950 font-black rounded-xl uppercase tracking-[0.2em] md:tracking-[0.25em] shadow-[0_0_20px_rgba(255,255,255,0.2)] active:scale-95 transition-all flex items-center justify-center gap-2 md:gap-3 group text-[9px] md:text-sm break-words whitespace-pre-wrap"
                 >
                    <Crosshair className="w-3.5 h-3.5 md:w-5 md:h-5 text-indigo-600 group-hover:rotate-90 transition-transform duration-500" />
                    <span>{t.BTN_START}</span>
                 </button>
             </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default MainMenu;
