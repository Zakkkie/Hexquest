
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { Trophy, LogOut, Ghost, Play, ArrowRight, Zap, Shield, UserCircle, X, LogIn, Lock, Target, Gem, Crown, Bot, Skull, Activity, Signal, Volume2, VolumeX, BookOpen, Globe, Music, Sliders, ChevronLeft, ChevronRight } from 'lucide-react';
import { WinCondition, Difficulty } from '../types.ts';
import { TEXT } from '../services/i18n.ts';
import { audioService } from '../services/audioService.ts';

const AVATAR_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#22c55e', // Green
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#8b5cf6', // Violet
  '#ec4899'  // Pink
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
  primary?: boolean; 
  danger?: boolean; 
}> = ({ onClick, icon, label, subLabel, primary, danger }) => (
  <button 
    onClick={onClick}
    className={`
      group w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 relative overflow-hidden
      ${primary 
        ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20 hover:border-amber-500 text-white' 
        : danger
          ? 'bg-red-900/10 border-red-900/30 hover:bg-red-900/30 hover:border-red-500 text-red-200'
          : 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/60 hover:border-slate-500 text-slate-200'}
    `}
  >
    <div className={`
      p-3 rounded-full transition-colors relative z-10
      ${primary ? 'bg-amber-500 text-slate-900' : danger ? 'bg-red-500/20 text-red-400 group-hover:bg-red-500 group-hover:text-white' : 'bg-slate-800 text-slate-400 group-hover:bg-white group-hover:text-slate-900'}
    `}>
      {icon}
    </div>
    <div className="flex flex-col items-start relative z-10">
      <span className={`text-sm font-bold uppercase tracking-wider ${primary ? 'text-amber-400' : ''}`}>{label}</span>
      {subLabel && <span className="text-[10px] text-slate-500 font-mono group-hover:text-slate-400">{subLabel}</span>}
    </div>
    
    {/* Hover Effect */}
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer" />
  </button>
);

const MainMenu: React.FC = () => {
  // Use granular selectors to prevent unnecessary re-renders and ensure stable function references
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
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[5]); 
  const [selectedIconId, setSelectedIconId] = useState('user');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Sound Menu
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  // Track name is no longer displayed, but kept for internal consistency if needed
  const [trackName, setTrackName] = useState("Loading...");
  const soundMenuRef = useRef<HTMLDivElement>(null);

  // Mission Config State
  const [selectedTier, setSelectedTier] = useState<1 | 2 | 3>(1);
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM');
  const [botCount, setBotCount] = useState<number>(1);

  const t = TEXT[language].MENU;

  const MISSION_TIERS = {
    1: { level: 5, coins: 250, label: language === 'RU' ? 'Патруль' : 'Sector Patrol' },
    2: { level: 7, coins: 500, label: language === 'RU' ? 'Штаб Региона' : 'Regional Command' },
    3: { level: 10, coins: 1000, label: language === 'RU' ? 'Доминация' : 'Global Domination' }
  };

  useEffect(() => {
      // Ensure music is playing in Menu
      audioService.startMusic();
      // Simulate "wealth" (250 credits) so the menu music has medium intensity
      audioService.updateMusic(250, 500); 
      setTrackName(audioService.getCurrentTrackName());
  }, []);

  // Close sound menu on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (soundMenuRef.current && !soundMenuRef.current.contains(event.target as Node)) {
              setShowSoundMenu(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNextTrack = () => {
      audioService.nextTrack();
      setTrackName(audioService.getCurrentTrackName());
      playUiSound('CLICK');
  };

  const handlePrevTrack = () => {
      audioService.prevTrack();
      setTrackName(audioService.getCurrentTrackName());
      playUiSound('CLICK');
  };

  const resetForm = () => {
    setInputName('');
    setInputPassword('');
    setErrorMessage(null);
  };

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
      }
    } else {
      setShowMissionConfig(true);
    }
  };

  const confirmMissionStart = () => {
    playUiSound('CLICK');
    const tier = MISSION_TIERS[selectedTier];
    const winCondition: WinCondition = {
      levelId: -1,
      targetLevel: tier.level,
      targetCoins: tier.coins,
      botCount: botCount,
      difficulty: difficulty,
      label: `${tier.label} (L${tier.level} + ${tier.coins}c)`,
      queueSize: difficulty === 'EASY' ? 1 : difficulty === 'MEDIUM' ? 2 : 3,
      winType: 'AND' // Enforce AND condition
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
      resetForm();
    } else if (authMode === 'LOGIN') {
      if (!inputPassword.trim()) {
        setErrorMessage("Password is required.");
        return;
      }
      const res = loginUser(inputName, inputPassword);
      if (res.success) {
        setAuthMode(null);
        resetForm();
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
        resetForm();
      } else {
        setErrorMessage(res.message || "Registration failed.");
      }
    }
  };

  const renderAvatar = (color: string, iconId: string, size = 'md') => {
    const IconComponent = AVATAR_ICONS.find(i => i.id === iconId)?.icon || UserCircle;
    
    let dims = 'w-8 h-8';
    let iconSize = 'w-4 h-4';
    
    if (size === 'lg') {
        dims = 'w-16 h-16';
        iconSize = 'w-8 h-8';
    } else if (size === 'sm') {
        dims = 'w-6 h-6';
        iconSize = 'w-3 h-3';
    }
    
    return (
      <div className={`${dims} rounded-full flex items-center justify-center border-2 border-white/20 shadow-lg`} style={{ backgroundColor: color }}>
        <IconComponent className={`${iconSize} text-white`} />
      </div>
    );
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-auto">
      
      {/* HEADER BAR */}
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex flex-col md:flex-row justify-between items-center md:items-start z-50 pointer-events-auto">
        <div className="w-full flex justify-between items-start">
            
            {/* LEFT: SETTINGS */}
            <div className="flex gap-2 relative">
                <button 
                  onClick={() => { setShowSoundMenu(!showSoundMenu); playUiSound('CLICK'); setTrackName(audioService.getCurrentTrackName()); }}
                  className={`w-10 h-10 md:w-12 md:h-12 flex items-center justify-center backdrop-blur rounded-full transition-all border border-slate-800 bg-slate-900/50 text-slate-400 hover:text-white`}
                  title="Sound Settings"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                {showSoundMenu && (
                    <div ref={soundMenuRef} className="absolute top-full left-0 mt-2 bg-slate-900/95 backdrop-blur border border-slate-700 p-3 rounded-xl shadow-2xl flex flex-col gap-2 min-w-[200px] z-[60]">
                        
                        {/* Music Section with Track Controls */}
                        <div className={`flex items-center justify-between pr-1 pl-0 py-0 rounded-lg transition-colors w-full select-none ${isMusicMuted ? 'text-slate-500 hover:bg-slate-800' : 'text-indigo-400 bg-indigo-900/20 hover:bg-indigo-900/30'}`}>
                            <button 
                                onClick={() => { toggleMusic(); playUiSound('CLICK'); }}
                                className="flex items-center gap-3 flex-1 text-left px-3 py-2"
                            >
                                {isMusicMuted ? <VolumeX className="w-4 h-4" /> : <Music className="w-4 h-4" />}
                                <span className="text-xs font-bold uppercase">Music</span>
                            </button>
                            
                            <div className="flex items-center gap-0.5 border-l border-white/10 pl-1 my-1">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handlePrevTrack(); }} 
                                    className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                                >
                                    <ChevronLeft className="w-3 h-3" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); handleNextTrack(); }} 
                                    className="p-1.5 hover:bg-white/20 rounded-md transition-colors"
                                >
                                    <ChevronRight className="w-3 h-3" />
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={() => { toggleSfx(); playUiSound('CLICK'); }}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors w-full text-left ${isSfxMuted ? 'text-slate-500 hover:bg-slate-800' : 'text-emerald-400 bg-emerald-900/20 hover:bg-emerald-900/30'}`}
                        >
                            {isSfxMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                            <span className="text-xs font-bold uppercase">SFX</span>
                        </button>
                    </div>
                )}
                
                <button 
                  onClick={() => setLanguage(language === 'EN' ? 'RU' : 'EN')}
                  className="h-10 md:h-12 px-3 md:px-4 bg-slate-900/50 hover:bg-slate-800 backdrop-blur rounded-full text-slate-400 hover:text-white transition-all border border-slate-800 flex items-center justify-center gap-1 font-bold text-xs"
                >
                  <Globe className="w-4 h-4" /> {language}
                </button>
            </div>

            {/* RIGHT: AUTH */}
            <div className="flex items-center gap-2">
                {!user ? (
                  <div className="flex gap-2">
                     <button 
                      onMouseEnter={() => playUiSound('HOVER')}
                      onClick={() => { setAuthMode('GUEST'); resetForm(); playUiSound('CLICK'); }}
                      className="cursor-pointer flex items-center gap-1 md:gap-2 px-3 py-2 bg-slate-800/80 hover:bg-slate-700 backdrop-blur-md rounded-lg border border-slate-600 text-slate-300 hover:text-white transition-all text-[10px] md:text-xs font-bold uppercase tracking-wider h-10"
                    >
                      <Ghost className="w-3 h-3 md:w-4 md:h-4" /> <span className="hidden sm:inline">{t.AUTH_GUEST}</span><span className="sm:hidden">{t.AUTH_GUEST.substring(0, 5)}</span>
                    </button>
                     <button 
                      onMouseEnter={() => playUiSound('HOVER')}
                      onClick={() => { setAuthMode('LOGIN'); resetForm(); playUiSound('CLICK'); }}
                      className="cursor-pointer px-3 py-2 bg-slate-900/50 hover:bg-slate-800 text-slate-300 rounded-lg border border-slate-800 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors h-10"
                    >
                      {t.AUTH_LOGIN}
                    </button>
                     <button 
                      onMouseEnter={() => playUiSound('HOVER')}
                      onClick={() => { setAuthMode('REGISTER'); resetForm(); playUiSound('CLICK'); }}
                      className="cursor-pointer px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 rounded-lg border border-indigo-500/30 text-[10px] md:text-xs font-bold uppercase tracking-wider transition-colors h-10"
                    >
                      {t.AUTH_REGISTER}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-slate-900/90 p-1.5 pl-4 rounded-full border border-slate-700 shadow-2xl">
                    <div className="flex flex-col items-end">
                      <span className="text-xs font-bold text-white leading-tight max-w-[100px] truncate">{user.nickname}</span>
                      <span className="text-[8px] md:text-[10px] text-slate-400 uppercase tracking-widest">{user.isGuest ? t.AUTH_GUEST : 'Commander'}</span>
                    </div>
                    {renderAvatar(user.avatarColor, user.avatarIcon, 'sm')}
                    <div className="h-6 w-px bg-slate-700 mx-1"></div>
                    <button 
                      onMouseEnter={() => playUiSound('HOVER')}
                      onClick={handleLogout}
                      className="cursor-pointer p-2 hover:bg-red-500/20 rounded-full text-slate-400 hover:text-red-400 transition-colors"
                      title="Logout"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
            </div>
        </div>
      </div>

      {/* CENTER MENU */}
      <div className="flex flex-col gap-6 w-full max-w-sm px-6 z-10 max-h-screen overflow-y-auto no-scrollbar py-20 md:py-0">
        
        {/* Title */}
        <div className="text-center mb-6"> 
          <h1 className="text-3xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-amber-600 italic tracking-tighter drop-shadow-[0_0_25px_rgba(245,158,11,0.4)]">
            {t.TITLE}
          </h1>
          <p className="text-[10px] md:text-xs text-slate-500 font-mono tracking-[0.6em] uppercase mt-2 opacity-60">
            {t.SUBTITLE}
          </p>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-3">
          
          <MenuButton 
            onClick={handleCampaignClick}
            primary 
            icon={<BookOpen className="w-5 h-5 fill-current" />}
            label={t.CAMPAIGN}
            subLabel={t.CAMPAIGN_SUB}
          />

          <MenuButton 
            onClick={handleNewGameClick}
            icon={<Play className="w-5 h-5" />}
            label={t.SKIRMISH}
            subLabel={t.SKIRMISH_SUB}
          />

          {hasActiveSession && (
             <MenuButton 
              onClick={() => { setUIState('GAME'); playUiSound('CLICK'); }}
              icon={<ArrowRight className="w-5 h-5" />}
              label={t.RESUME}
              subLabel={t.RESUME_SUB}
            />
          )}

          <MenuButton 
            onClick={() => { setUIState('LEADERBOARD'); playUiSound('CLICK'); }}
            icon={<Trophy className="w-5 h-5" />}
            label={t.LEADERBOARD}
            subLabel={t.LEADERBOARD_SUB}
          />

          {hasActiveSession && (
            <MenuButton 
              onClick={() => {
                 playUiSound('CLICK');
                 if (window.confirm(t.ABANDON_CONFIRM)) {
                    abandonSession();
                 }
              }}
              icon={<X className="w-5 h-5" />}
              label={t.END_SESSION}
              subLabel={t.END_SESSION_SUB}
              danger
            />
          )}

          <MenuButton 
            onClick={() => {
              playUiSound('CLICK');
              if (hasActiveSession && !window.confirm(t.ABANDON_CONFIRM)) return;
              window.close();
              alert("Application Exit Simulated");
            }}
            icon={<LogOut className="w-5 h-5" />}
            label={t.EXIT}
          />
        </div>
      </div>

      {/* MODALS */}
      {authMode && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-sm relative max-h-[85vh] overflow-y-auto">
            <button 
              onClick={() => { setAuthMode(null); playUiSound('CLICK'); }}
              className="cursor-pointer absolute top-4 right-4 text-slate-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              {authMode === 'GUEST' && <Ghost className="w-6 h-6 text-indigo-400" />}
              {authMode === 'LOGIN' && <LogIn className="w-6 h-6 text-indigo-400" />}
              {authMode === 'REGISTER' && <UserCircle className="w-6 h-6 text-indigo-400" />}
              
              {authMode === 'GUEST' ? t.MODAL_GUEST_TITLE : (authMode === 'LOGIN' ? t.MODAL_LOGIN_TITLE : t.MODAL_REGISTER_TITLE)}
            </h2>

            <div className="space-y-4">
              {errorMessage && (
                <div className="p-3 bg-red-950/50 border border-red-900 rounded-lg text-red-400 text-xs font-bold text-center">
                  {errorMessage}
                </div>
              )}

              <div>
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                  {t.INPUT_NAME}
                </label>
                <input 
                  type="text" 
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Enter name..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  maxLength={16}
                />
              </div>

              {authMode !== 'GUEST' && (
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">
                    {t.INPUT_PASS}
                  </label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={inputPassword}
                      onChange={(e) => setInputPassword(e.target.value)}
                      placeholder="******"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors pl-10"
                    />
                    <Lock className="w-4 h-4 text-slate-600 absolute left-3 top-3.5" />
                  </div>
                </div>
              )}

              {authMode === 'REGISTER' && (
                <>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">{t.AUTH_AVATAR_COLOR}</label>
                    <div className="flex gap-2 flex-wrap">
                      {AVATAR_COLORS.map(c => (
                        <button 
                          key={c}
                          onClick={() => { setSelectedColor(c); playUiSound('CLICK'); }}
                          className={`cursor-pointer w-8 h-8 rounded-full border-2 ${selectedColor === c ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'} transition-all`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">{t.AUTH_INSIGNIA}</label>
                    <div className="flex gap-2 bg-slate-950 p-2 rounded-xl border border-slate-800">
                      {AVATAR_ICONS.map(i => {
                        const Icon = i.icon;
                        return (
                          <button 
                            key={i.id}
                            onClick={() => { setSelectedIconId(i.id); playUiSound('CLICK'); }}
                            className={`cursor-pointer flex-1 h-10 rounded-lg flex items-center justify-center transition-all ${selectedIconId === i.id ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-600 hover:text-slate-400'}`}
                          >
                            <Icon className="w-5 h-5" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <button 
                onClick={handleAuthSubmit}
                onMouseEnter={() => playUiSound('HOVER')}
                className="cursor-pointer w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
              >
                {authMode === 'GUEST' ? t.BTN_GUEST : (authMode === 'LOGIN' ? t.BTN_LOGIN : t.BTN_REGISTER)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIG MODAL */}
      {showMissionConfig && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-3xl shadow-2xl w-full max-w-sm relative max-h-[85vh] overflow-y-auto">
             <button onClick={() => { setShowMissionConfig(false); playUiSound('CLICK'); }} className="cursor-pointer absolute top-4 right-4 text-slate-500 hover:text-white"><X className="w-5 h-5"/></button>
             <h2 className="text-2xl font-bold text-white mb-1">{t.CONFIG_TITLE}</h2>
             <p className="text-xs text-slate-500 mb-6 uppercase tracking-wider">{t.CONFIG_SUB}</p>
             
             <div className="space-y-6">
                {/* Mission Tier */}
                <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">Mission Objective</label>
                   <div className="flex flex-col gap-2">
                      {[1, 2, 3].map(id => {
                        const tier = MISSION_TIERS[id as 1|2|3];
                        return (
                          <button 
                            key={id} 
                            onClick={() => { setSelectedTier(id as 1|2|3); playUiSound('CLICK'); }}
                            className={`w-full p-3 rounded-xl border flex items-center justify-between transition-all ${selectedTier === id ? 'bg-amber-500/10 border-amber-500' : 'bg-slate-950 border-slate-800 opacity-70 hover:opacity-100'}`}
                          >
                             <div className="text-left">
                               <div className={`text-xs font-bold ${selectedTier === id ? 'text-amber-400' : 'text-slate-300'}`}>{tier.label}</div>
                               <div className="text-[10px] text-slate-500 font-mono">Rank {tier.level} • {tier.coins} Credits</div>
                             </div>
                             {selectedTier === id && <Target className="w-4 h-4 text-amber-500" />}
                          </button>
                        );
                      })}
                   </div>
                </div>

                {/* Difficulty */}
                <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">Parameters</label>
                   <div className="flex gap-2">
                      {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => (
                         <button 
                           key={d} 
                           onClick={() => { setDifficulty(d); playUiSound('CLICK'); }}
                           className={`flex-1 py-2 rounded-lg border text-[10px] font-bold uppercase ${difficulty === d ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                         >
                           {d === 'EASY' ? t.DIFF_EASY : d === 'MEDIUM' ? t.DIFF_MEDIUM : t.DIFF_HARD}
                         </button>
                      ))}
                   </div>
                </div>
                
                {/* Bot Count */}
                <div>
                   <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-2 block">Rivals</label>
                   <div className="flex gap-2">
                      {[1, 2, 3, 4].map(c => (
                         <button 
                           key={c} 
                           onClick={() => { setBotCount(c); playUiSound('CLICK'); }}
                           className={`flex-1 py-2 rounded-lg border text-[10px] font-bold uppercase ${botCount === c ? 'bg-red-900/40 border-red-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'}`}
                         >
                           {c} AI
                         </button>
                      ))}
                   </div>
                </div>

                <button 
                  onClick={confirmMissionStart}
                  onMouseEnter={() => playUiSound('HOVER')}
                  className="w-full py-4 bg-white hover:bg-slate-200 text-slate-900 font-black rounded-xl uppercase tracking-widest shadow-lg active:scale-95 transition-all mt-4"
                >
                  {t.BTN_START}
                </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MainMenu;
