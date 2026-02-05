
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { Trophy, LogOut, Ghost, Play, ArrowRight, Zap, Shield, UserCircle, X, LogIn, Lock, Target, Gem, Crown, Bot, Skull, Activity, Signal, Volume2, VolumeX, BookOpen, Globe, Music, Sliders, ChevronLeft, ChevronRight, Swords, Info, Cpu, Layers, HardDrive, Clock, BarChart, Database, Map as MapIcon, Box, Hexagon } from 'lucide-react';
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

const AVATAR_ICONS = [
  { id: 'user', icon: UserCircle },
  { id: 'zap', icon: Zap },
  { id: 'shield', icon: Shield },
  { id: 'ghost', icon: Ghost },
];

type AuthMode = 'GUEST' | 'LOGIN' | 'REGISTER' | null;

const MenuButton: React.FC<{ 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  subLabel?: string; 
  variant?: 'primary' | 'battle' | 'danger' | 'default';
}> = ({ onClick, icon, label, subLabel, variant = 'default' }) => {
  const getStyle = () => {
    switch(variant) {
      case 'primary': return 'bg-indigo-600/10 border-indigo-500/50 hover:bg-indigo-500/20 hover:border-indigo-500 text-white shadow-[0_0_15px_rgba(99,102,241,0.1)]';
      case 'battle': return 'bg-gradient-to-r from-red-600 via-rose-500 to-red-600 border-red-400 hover:border-white text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] animate-pulse-subtle';
      case 'danger': return 'bg-red-900/10 border-red-900/30 hover:bg-red-900/30 hover:border-red-500 text-red-200';
      default: return 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-500 text-slate-200';
    }
  };

  const getIconStyle = () => {
    switch(variant) {
      case 'primary': return 'bg-indigo-500 text-white';
      case 'battle': return 'bg-white/20 text-white backdrop-blur-sm';
      case 'danger': return 'bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white';
      default: return 'bg-slate-800 text-slate-400 group-hover:bg-white group-hover:text-slate-900';
    }
  };

  return (
    <button 
      onClick={onClick}
      className={`group w-full flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden ${getStyle()}`}
    >
      <div className={`p-3 rounded-xl transition-colors relative z-10 ${getIconStyle()}`}>
        {icon}
      </div>
      <div className="flex flex-col items-start relative z-10 text-left">
        <span className={`text-sm font-black uppercase tracking-widest ${variant === 'battle' ? 'text-white' : ''}`}>{label}</span>
        {subLabel && <span className={`text-[10px] font-mono group-hover:text-slate-200 ${variant === 'battle' ? 'text-red-100' : 'text-slate-500'}`}>{subLabel}</span>}
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
  const deviceType = useGameStore(state => state.deviceType);
  
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
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[5]); 
  const [selectedIconId, setSelectedIconId] = useState('user');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  const soundMenuRef = useRef<HTMLDivElement>(null);

  // Config State
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [botCount, setBotCount] = useState<number>(1);

  const t = TEXT[language].MENU;
  const isMobile = deviceType === 'MOBILE';

  const MISSION_TIERS = {
    1: { level: 5, coins: 250, label: language === 'RU' ? 'Патруль' : 'Patrol', time: '~5m', color: 'text-blue-400', difficulty: 'EASY' as Difficulty },
    2: { level: 7, coins: 500, label: language === 'RU' ? 'Штаб' : 'HQ', time: '~10m', color: 'text-amber-400', difficulty: 'MEDIUM' as Difficulty },
    3: { level: 10, coins: 1000, label: language === 'RU' ? 'Доминация' : 'Dominion', time: '~20m', color: 'text-red-400', difficulty: 'HARD' as Difficulty }
  };

  useEffect(() => {
      audioService.startMusic();
      audioService.updateMusic(250, 500); 
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

  // Sync difficulty when tier changes (Default behavior)
  useEffect(() => {
      if (showMissionConfig) {
          // Reset to default for the tier when opening or switching tier
          // We can do this in the onClick handler for the tier button to allow manual override afterwards
      }
  }, [showMissionConfig]);

  const handleCampaignClick = () => {
     playUiSound('CLICK');
     if (hasActiveSession) {
         if (window.confirm(t.ABANDON_CONFIRM)) {
             abandonSession();
             setUIState('CAMPAIGN_MAP');
         }
     } else {
         setUIState('CAMPAIGN_MAP');
     }
  };

  const handleNewGameClick = () => {
    playUiSound('CLICK');
    if (hasActiveSession) {
      if (window.confirm(t.ABANDON_CONFIRM)) {
        setShowMissionConfig(true);
        // Reset defaults
        setSelectedTier(1);
        setDifficulty('EASY');
      }
    } else {
      setShowMissionConfig(true);
      // Reset defaults
      setSelectedTier(1);
      setDifficulty('EASY');
    }
  };

  const confirmMissionStart = () => {
    playUiSound('CLICK');
    const tier = MISSION_TIERS[selectedTier as 1|2|3];
    const winCondition: WinCondition = {
      levelId: -1,
      targetLevel: tier.level,
      targetCoins: tier.coins,
      botCount: botCount,
      difficulty: difficulty,
      label: `${tier.label}`,
      queueSize: DIFFICULTY_SETTINGS[difficulty].queueSize,
      winType: 'AND' 
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

    if (authMode === 'GUEST') {
      loginAsGuest(inputName, selectedColor, selectedIconId);
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
      const res = registerUser(inputName, inputPassword, selectedColor, selectedIconId);
      if (res.success) {
        setAuthMode(null);
      } else {
        setErrorMessage(res.message || "Registration failed.");
      }
    }
  };

  const renderAvatar = (color: string, iconId: string, size = 'md') => {
    const IconComponent = AVATAR_ICONS.find(i => i.id === iconId)?.icon || UserCircle;
    let dims = size === 'lg' ? 'w-16 h-16' : (size === 'sm' ? 'w-6 h-6' : 'w-8 h-8');
    let iconSize = size === 'lg' ? 'w-8 h-8' : (size === 'sm' ? 'w-3 h-3' : 'w-4 h-4');
    return (
      <div className={`${dims} rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg`} style={{ backgroundColor: color }}>
        <IconComponent className={`${iconSize} text-white`} />
      </div>
    );
  };

  const currentTierData = MISSION_TIERS[selectedTier as 1|2|3];
  const currentMaterialLimit = DIFFICULTY_SETTINGS[difficulty].maxStorage;

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
                  <div className="flex gap-2">
                     <button onClick={() => { setAuthMode('GUEST'); setInputName(''); setErrorMessage(null); playUiSound('CLICK'); }} className="px-3 py-2 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-slate-600 text-slate-300 text-[10px] md:text-xs font-bold uppercase h-10">{t.AUTH_GUEST}</button>
                     <button onClick={() => { setAuthMode('LOGIN'); setInputName(''); setInputPassword(''); setErrorMessage(null); playUiSound('CLICK'); }} className="px-3 py-2 bg-slate-900/50 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-[10px] md:text-xs font-bold uppercase h-10">{t.AUTH_LOGIN}</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-slate-900/90 p-1.5 pl-4 rounded-full border border-slate-700 shadow-2xl">
                    <div className="flex flex-col items-end"><span className="text-xs font-bold text-white leading-tight max-w-[100px] truncate">{user.nickname}</span><span className="text-[10px] text-slate-400 uppercase tracking-widest">{user.isGuest ? t.AUTH_GUEST : 'Commander'}</span></div>
                    {renderAvatar(user.avatarColor, user.avatarIcon, 'sm')}
                    <button onClick={handleLogout} className="p-2 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-400 transition-colors"><LogOut className="w-4 h-4" /></button>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* CENTER MENU */}
      <div className="flex flex-col gap-6 w-full max-w-sm px-6 z-10 max-h-screen overflow-y-auto no-scrollbar py-20 md:py-0">
        
        {/* NEW LOGO BLOCK */}
        <div className="text-center mb-8 relative group cursor-default">
          {/* Animated Glow Layer */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-indigo-500/20 blur-[50px] rounded-full animate-pulse"></div>
          
          {/* Main Visual Composition */}
          <div className="relative flex flex-col items-center justify-center">
              {/* Spinning Outer Ring */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
              
              <div className="relative mb-2">
                  <Hexagon className="w-20 h-20 text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)] fill-indigo-900/20" strokeWidth={1.5} />
                  <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                      <Target className="w-8 h-8 text-white drop-shadow-[0_0_10px_#fff]" />
                  </div>
              </div>

              <h1 className="relative text-5xl md:text-7xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] z-10">
                  {t.TITLE}
              </h1>
              
              <div className="flex items-center gap-3 mt-2 opacity-80">
                  <div className="h-px w-12 bg-indigo-500/50"></div>
                  <p className="text-[10px] md:text-xs text-indigo-300 font-mono tracking-[0.4em] uppercase whitespace-nowrap">{t.SUBTITLE}</p>
                  <div className="h-px w-12 bg-indigo-500/50"></div>
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

      {/* NEW BATTLE CONFIG MODAL (OPTIMIZED COMPACT LAYOUT) */}
      {showMissionConfig && (
        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-4 rounded-[2rem] shadow-2xl w-full max-w-3xl relative overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
             
             {/* Close Button */}
             <button onClick={() => setShowMissionConfig(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1 z-20"><X className="w-5 h-5"/></button>
             
             {/* Header */}
             <div className="flex items-center gap-3 shrink-0 mb-2 px-1">
                <div className="p-2 bg-red-600 rounded-lg shadow-lg"><Swords className="w-4 h-4 text-white" /></div>
                <div>
                   <h2 className="text-lg font-black text-white uppercase tracking-tighter">{t.CONFIG_TITLE}</h2>
                   <p className="text-[9px] text-slate-500 uppercase tracking-widest font-mono">{t.CONFIG_SUB}</p>
                </div>
             </div>

             {/* CONTENT AREA - COMPACT */}
             <div className="flex-1 overflow-y-auto no-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    
                    {/* LEFT COLUMN: MISSION TYPE (Width: 5/12) */}
                    <div className="md:col-span-5 flex flex-col gap-1.5">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-1">{t.COL_GOAL_TITLE}</label>
                        {[1, 2, 3].map(id => {
                              const tier = MISSION_TIERS[id as 1|2|3];
                              const isSelected = selectedTier === id;
                              return (
                                <button 
                                  key={id} 
                                  onClick={() => { setSelectedTier(id as 1|2|3); setDifficulty(tier.difficulty); playUiSound('CLICK'); }}
                                  className={`w-full p-2.5 rounded-xl border text-left transition-all relative overflow-hidden group flex items-center gap-3 ${isSelected ? 'bg-slate-800/80 border-indigo-500 shadow-lg' : 'bg-slate-950/40 border-slate-800 hover:bg-slate-900 hover:border-slate-600'}`}
                                >
                                   <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-500/20 text-indigo-300' : 'bg-slate-900 text-slate-500'}`}>
                                       {id === 1 ? <Target className="w-3.5 h-3.5" /> : (id === 2 ? <Shield className="w-3.5 h-3.5" /> : <Swords className="w-3.5 h-3.5" />)}
                                   </div>
                                   <div className="flex flex-col">
                                       <span className={`text-xs font-black uppercase ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>{tier.label}</span>
                                       <span className="text-[9px] font-mono text-slate-600">{tier.time}</span>
                                   </div>
                                </button>
                              );
                        })}
                    </div>

                    {/* RIGHT COLUMN: PARAMETERS (Width: 7/12) */}
                    <div className="md:col-span-7 flex flex-col gap-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-1">{t.COL_SETUP_TITLE}</label>
                        
                        {/* COMBINED CONFIGURATION BLOCK */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col gap-3 shadow-inner relative overflow-hidden flex-1">
                            
                            {/* Background Pattern */}
                            <div className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px]"></div>
                            
                            {/* 1. OBJECTIVES / STATS */}
                            <div className="grid grid-cols-3 gap-2 relative z-10">
                                {/* Target */}
                                <div className="flex flex-col items-center bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                                    <span className="text-[8px] font-bold uppercase text-slate-500 mb-0.5 flex items-center gap-1"><Crown className="w-2.5 h-2.5" /> Target</span>
                                    <span className="text-lg font-mono font-black text-indigo-400">L{currentTierData.level}</span>
                                </div>
                                {/* Reward */}
                                <div className="flex flex-col items-center bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                                    <span className="text-[8px] font-bold uppercase text-slate-500 mb-0.5 flex items-center gap-1"><Zap className="w-2.5 h-2.5" /> Reward</span>
                                    <span className="text-lg font-mono font-black text-amber-400">{currentTierData.coins}</span>
                                </div>
                                {/* Supply */}
                                <div className="flex flex-col items-center bg-slate-900/50 p-2 rounded-lg border border-slate-800/50">
                                    <span className="text-[8px] font-bold uppercase text-slate-500 mb-0.5 flex items-center gap-1"><Box className="w-2.5 h-2.5" /> Supply</span>
                                    <span className="text-lg font-mono font-black text-emerald-400">{currentMaterialLimit}</span>
                                </div>
                            </div>

                            <div className="h-px bg-slate-800/50 w-full relative z-10 my-1" />

                            {/* 2. DIFFICULTY */}
                            <div className="relative z-10">
                                <label className="text-[8px] uppercase font-black text-slate-500 tracking-widest block mb-1.5">{t.LBL_DIFFICULTY}</label>
                                <div className="flex gap-2">
                                    {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
                                        <button 
                                            key={d} 
                                            onClick={() => { setDifficulty(d); playUiSound('CLICK'); }}
                                            className={`flex-1 flex items-center justify-center rounded-lg border text-[9px] font-bold uppercase transition-all py-2 ${difficulty === d ? (d==='HARD'?'bg-red-900/30 border-red-500 text-red-100 shadow-[0_0_10px_rgba(239,68,68,0.2)]':'bg-slate-700 border-white text-white shadow-lg') : 'bg-slate-900 border-slate-800 text-slate-500 hover:bg-slate-800 hover:border-slate-600'}`}
                                        >
                                            {d === 'EASY' ? t.DIFF_EASY : d === 'MEDIUM' ? t.DIFF_MEDIUM : t.DIFF_HARD}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 3. BOTS */}
                            <div className="relative z-10">
                                <span className="text-[8px] font-bold uppercase text-slate-500 mb-1.5 block flex items-center gap-1"><Bot className="w-3 h-3" /> {t.LBL_RIVALS}</span>
                                <div className="grid grid-cols-4 gap-2">
                                    {[1, 2, 3, 4].map(c => (
                                        <button 
                                            key={c} 
                                            onClick={() => { setBotCount(c); playUiSound('CLICK'); }}
                                            className={`h-8 rounded-lg border flex items-center justify-center gap-1 transition-all ${botCount === c ? 'bg-red-600 border-red-500 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]' : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300'}`}
                                        >
                                            <span className="font-black text-xs">{c}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                        </div>
                    </div>
                 </div>
             </div>

             {/* GLOBAL ACTION */}
             <div className="pt-3 mt-auto border-t border-slate-800">
                 <button 
                    onClick={confirmMissionStart}
                    className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black rounded-xl uppercase tracking-[0.25em] shadow-xl shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                 >
                    <span className="text-xs">{t.BTN_START}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                 </button>
             </div>

          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {authMode && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-sm relative">
            <button onClick={() => setAuthMode(null)} className="absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">{authMode === 'GUEST' ? <Ghost className="w-6 h-6 text-indigo-400" /> : (authMode === 'LOGIN' ? <LogIn className="w-6 h-6 text-indigo-400" /> : <UserCircle className="w-6 h-6 text-indigo-400" />)} {authMode === 'GUEST' ? t.MODAL_GUEST_TITLE : (authMode === 'LOGIN' ? t.MODAL_LOGIN_TITLE : t.MODAL_REGISTER_TITLE)}</h2>
            <div className="space-y-4">
              {errorMessage && <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-xs font-bold text-center">{errorMessage}</div>}
              <div><label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">{t.INPUT_NAME}</label><input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder="Enter name..." className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors" maxLength={16} /></div>
              {authMode !== 'GUEST' && <div><label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">{t.INPUT_PASS}</label><div className="relative"><input type="password" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} placeholder="******" className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors pl-10" /><Lock className="w-4 h-4 text-slate-600 absolute left-3 top-3.5" /></div></div>}
              <button onClick={handleAuthSubmit} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl uppercase tracking-widest shadow-lg transition-all">{authMode === 'GUEST' ? t.BTN_GUEST : (authMode === 'LOGIN' ? t.BTN_LOGIN : t.BTN_REGISTER)}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MainMenu;
