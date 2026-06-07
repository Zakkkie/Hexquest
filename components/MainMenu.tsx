
import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store.ts';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, LogOut, Ghost, ArrowRight, Shield, X, LogIn, Lock, Target, Gem, Crown, Bot, Activity, Volume2, VolumeX, BookOpen, Music, ChevronLeft, ChevronRight, Swords, Layers, Map as MapIcon, Box, Hexagon, UserPlus, Fingerprint, User, Mountain, Crosshair, Flame, Shuffle, Settings, Minus, Plus } from 'lucide-react';
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
    const headY = 43;
    const bodyY = 55;
    const eyeColor = '#22d3ee'; // Player eye color cyan

    const renderHead = () => {
        switch(head % 4) {
            case 0: 
                return (
                    <g>
                        <path d={`M 40 ${headY} A 10 10 0 0 1 60 ${headY} Z`} fill="#1e293b" />
                        <rect x="40" y={headY} width="20" height="5" fill="#1e293b" />
                        <line x1="44" y1={headY-8} x2="40" y2={headY-18} stroke="#94a3b8" strokeWidth="2" />
                        <circle cx="40" cy={headY-18} r="1.5" fill={eyeColor} />
                        <circle cx="50" cy={headY-4} r="3" fill={eyeColor} filter="url(#glow)" />
                    </g>
                );
            case 1: 
                return (
                    <g>
                        <path d={`M 42 ${headY+6} L 58 ${headY+6} L 62 ${headY} L 38 ${headY} Z`} fill={color} />
                        <path d={`M 40 ${headY} L 60 ${headY} L 56 ${headY-12} L 44 ${headY-12} Z`} fill="url(#tacGrad)" />
                        <rect x="42" y={headY-5} width="16" height="3" fill={eyeColor} filter="url(#glow)" />
                    </g>
                );
            case 2: 
                return (
                    <g>
                        <rect x="42" y={headY-14} width="16" height="20" rx="2" fill="url(#cylGrad)" />
                        <rect x="42" y={headY-10} width="16" height="2" fill="#0f172a" />
                        <rect x="42" y={headY-5} width="16" height="2" fill="#0f172a" />
                        <rect x="42" y={headY} width="16" height="2" fill="#0f172a" />
                        <rect x="48" y={headY-12} width="4" height="14" fill={eyeColor} filter="url(#glow)" />
                    </g>
                );
            case 3: 
                return (
                    <g>
                        <ellipse cx="50" cy={headY-4} rx="14" ry="8" fill={color} />
                        <ellipse cx="50" cy={headY-4} rx="10" ry="5" fill="#0f172a" />
                        <circle cx="50" cy={headY-4} r="3" fill={eyeColor} filter="url(#glow)" />
                        <circle cx="50" cy={headY-4} r="1" fill="#ffffff" />
                        <circle cx="34" cy={headY-4} r="2" fill="#38bdf8" />
                        <circle cx="66" cy={headY-4} r="2" fill="#38bdf8" />
                    </g>
                );
            default: return <circle cx="50" cy={headY} r="14" fill={color} />;
        }
    };

    const renderBody = () => {
        // Floating Shadow
        const shadow = <ellipse cx="50" cy="67" rx="14" ry="5" fill="rgba(0,0,0,0.4)" filter="url(#blur)" />;

        switch(body % 4) {
            case 0: // Crawler
                return (
                    <g>
                        {shadow}
                        <rect x="32" y={bodyY-6} width="10" height="20" rx="3" fill="#1e293b" />
                        <rect x="58" y={bodyY-6} width="10" height="20" rx="3" fill="#1e293b" />
                        <rect x="34" y={bodyY-4} width="6" height="16" fill={color} />
                        <rect x="60" y={bodyY-4} width="6" height="16" fill={color} />
                        <rect x="34" y={bodyY-4} width="2" height="16" fill="rgba(255,255,255,0.4)" />
                        <rect x="60" y={bodyY-4} width="2" height="16" fill="rgba(255,255,255,0.4)" />
                        <path d={`M 40 ${bodyY-10} L 60 ${bodyY-10} L 62 ${bodyY+8} L 38 ${bodyY+8} Z`} fill="#0f172a" />
                        <circle cx="50" cy={bodyY} r="4" fill="#38bdf8" filter="url(#glow)" />
                    </g>
                );
            case 1: // Glider
                return (
                    <g>
                        {shadow}
                        <ellipse cx="50" cy={bodyY+8} rx="12" ry="4" fill="#10b981" filter="url(#glow)" />
                        <path d={`M 50 ${bodyY-16} L 70 ${bodyY} L 60 ${bodyY+8} L 50 ${bodyY+2} L 40 ${bodyY+8} L 30 ${bodyY} Z`} fill="url(#gliderGrad)" />
                        <path d={`M 50 ${bodyY-10} L 60 ${bodyY} L 40 ${bodyY} Z`} fill="#0f172a" />
                        <circle cx="34" cy={bodyY} r="1.5" fill="#38bdf8" />
                        <circle cx="66" cy={bodyY} r="1.5" fill="#38bdf8" />
                    </g>
                );
            case 2: // Monolith
                return (
                    <g>
                        {shadow}
                        <path d={`M 44 ${bodyY} L 56 ${bodyY} L 50 ${bodyY+14} Z`} fill="#f59e0b" />
                        <path d={`M 47 ${bodyY} L 53 ${bodyY} L 50 ${bodyY+8} Z`} fill="#fef08a" />
                        <rect x="36" y={bodyY-18} width="28" height="22" fill="url(#monoGrad)" />
                        <rect x="36" y={bodyY-18} width="28" height="2" fill="rgba(255,255,255,0.15)" />
                        <rect x="36" y={bodyY-18} width="2" height="22" fill="rgba(255,255,255,0.15)" />
                        <rect x="40" y={bodyY-14} width="20" height="6" fill="#0f172a" />
                        <rect x="40" y={bodyY-4} width="20" height="4" fill="#0f172a" />
                        <rect x="48" y={bodyY-12} width="4" height="10" fill="#e2e8f0" />
                    </g>
                );
            case 3: // Prism
                return (
                    <g>
                        {shadow}
                        <path d={`M 34 ${bodyY-10} L 39 ${bodyY-4} L 30 ${bodyY+2} Z`} fill={color} />
                        <path d={`M 66 ${bodyY-10} L 61 ${bodyY-4} L 70 ${bodyY+2} Z`} fill={color} />
                        <path d={`M 50 ${bodyY-22} L 62 ${bodyY-2} L 50 ${bodyY+14} L 38 ${bodyY-2} Z`} fill="url(#prismGrad)" />
                        <path d={`M 50 ${bodyY-22} L 38 ${bodyY-2} L 50 ${bodyY+14} Z`} fill="rgba(255,255,255,0.3)" />
                    </g>
                );
            default: return <rect x="38" y={bodyY} width="24" height="40" rx="8" fill={color} />;
        }
    };

    return (
        <svg viewBox="0 0 100 100" className="w-24 h-24 drop-shadow-2xl overflow-visible">
            <defs>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
                <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="3" />
                </filter>
                <linearGradient id="gliderGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="30%" stopColor={color} />
                    <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id="monoGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={color} />
                    <stop offset="100%" stopColor="#020617" />
                </linearGradient>
                <linearGradient id="prismGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="20%" stopColor={color} />
                    <stop offset="80%" stopColor="#1e293b" />
                    <stop offset="100%" stopColor="#000000" />
                </linearGradient>
                <linearGradient id="tacGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#334155" />
                    <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>
                <linearGradient id="cylGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1e293b" />
                    <stop offset="50%" stopColor={color} />
                    <stop offset="100%" stopColor="#1e293b" />
                </linearGradient>
            </defs>
            {renderBody()}
            {renderHead()}
        </svg>
    );
};

const MenuButton: React.FC<{ 
  onClick: () => void; 
  icon: React.ReactNode; 
  label: string; 
  subLabel?: string; 
  variant?: 'primary' | 'battle' | 'campaign' | 'danger' | 'default';
  className?: string;
  style?: React.CSSProperties;
}> = ({ onClick, icon, label, subLabel, variant = 'default', className = '', style }) => {
  const getStyle = () => {
    switch(variant) {
      case 'primary': return 'bg-indigo-950/40 border-indigo-500/30 hover:bg-indigo-900/50 hover:border-indigo-400/80 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(99,102,241,0.2)] backdrop-blur-xl border-t-white/10';
      case 'campaign': return 'bg-gradient-to-r from-indigo-950/40 via-purple-900/30 to-indigo-950/40 border-indigo-400/30 hover:border-purple-400/80 hover:from-indigo-900/50 hover:via-purple-800/40 hover:to-indigo-900/50 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(168,85,247,0.2)] backdrop-blur-xl border-t-white/10 transition-all duration-300';
      case 'battle': return 'bg-gradient-to-r from-red-950/40 via-rose-900/30 to-red-950/40 backdrop-blur-xl border border-red-500/30 hover:border-red-400/80 hover:from-red-900/50 hover:via-rose-800/40 hover:to-red-900/50 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(220,38,38,0.2)] border-t-white/10 transition-all duration-300';
      case 'danger': return 'bg-red-950/30 border-red-900/30 hover:bg-red-900/40 hover:border-red-500/50 text-red-200 backdrop-blur-md border-t-white/5';
      default: return 'bg-slate-900/40 border-slate-700/50 hover:bg-slate-800/50 hover:border-slate-500/80 text-slate-200 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_8px_32px_rgba(255,255,255,0.05)] border-t-white/10';
    }
  };

  const getIconStyle = () => {
    switch(variant) {
      case 'primary': return 'bg-indigo-500/10 border border-indigo-400/20 shadow-inner text-indigo-300 group-hover:text-indigo-100 group-hover:border-indigo-400/50 group-hover:bg-indigo-500/20 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all';
      case 'campaign': return 'bg-purple-500/10 border border-purple-400/20 shadow-inner text-purple-300 group-hover:text-purple-100 group-hover:border-purple-400/50 group-hover:bg-purple-500/20 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.4)] transition-all';
      case 'battle': return 'bg-red-500/10 border border-red-400/20 shadow-inner text-red-300 group-hover:text-red-100 group-hover:border-red-400/50 group-hover:bg-red-500/20 group-hover:shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-all';
      case 'danger': return 'bg-red-900/20 border border-red-800/30 text-red-400 group-hover:bg-red-800/40 group-hover:text-red-200 transition-all';
      default: return 'bg-slate-800/30 border border-slate-600/30 text-slate-400 group-hover:bg-slate-700/50 group-hover:text-slate-200 shadow-inner group-hover:border-slate-500/50 transition-all';
    }
  };

  return (
    <motion.button 
      onClick={onClick}
      whileHover={{ scale: 1.02, x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={`group w-full flex items-center gap-4 p-4 md:p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden touch-manipulation backdrop-blur-sm ${getStyle()} ${className}`}
      style={style}
    >
      <div className={`p-3 md:p-3.5 rounded-xl transition-all duration-300 relative z-10 ${getIconStyle()}`}>
        {/* Pass larger icon size down if possible, but container controls visual weight */}
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-6 h-6 md:w-5 md:h-5 drop-shadow-md' })}
      </div>
      <div className="flex flex-col items-start relative z-10 text-left">
        <span className={`text-base md:text-sm font-black uppercase tracking-widest break-words whitespace-pre-wrap 
          ${variant === 'battle' ? 'text-red-50 drop-shadow-[0_0_10px_rgba(220,38,38,0.6)] group-hover:drop-shadow-[0_0_15px_rgba(220,38,38,0.9)]' : 
            variant === 'campaign' ? 'text-purple-50 drop-shadow-[0_0_10px_rgba(168,85,247,0.6)] group-hover:drop-shadow-[0_0_15px_rgba(168,85,247,0.9)]' : 
            variant === 'primary' ? 'text-indigo-50 drop-shadow-[0_0_10px_rgba(99,102,241,0.6)] group-hover:drop-shadow-[0_0_15px_rgba(99,102,241,0.9)]' : 
            'drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]'
          } transition-all duration-300`}
          style={{ textShadow: variant !== 'default' && variant !== 'danger' ? '0 0 20px currentColor' : undefined }}
        >
          {label}
        </span>
        {subLabel && (
          <span className={`font-mono group-hover:text-slate-300 transition-colors break-words whitespace-pre-wrap 
            ${variant === 'primary' ? 'font-bold text-[13px] md:text-[13px] leading-[17.5px] text-indigo-300' : 'text-[11px] md:text-[10px] text-slate-500'} 
            ${variant === 'battle' ? 'text-red-200/70' : variant === 'campaign' ? 'text-purple-200/70' : ''}`}
          >
            {subLabel}
          </span>
        )}
      </div>
      
      {/* Dynamic Hover Glow */}
      <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      
      {/* Shimmer Effect */}
      <motion.div 
         className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" 
         initial={{ x: '-100%' }}
         animate={{ x: '200%' }}
         transition={{ repeat: Infinity, duration: 2, ease: "linear", repeatDelay: 1 }}
      />
    </motion.button>
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
  const setCampaignMode = useGameStore(state => state.setCampaignMode);
  const logout = useGameStore(state => state.logout);
  const loginAsGuest = useGameStore(state => state.loginAsGuest);
  const loginUser = useGameStore(state => state.loginUser);
  const registerUser = useGameStore(state => state.registerUser);
  const abandonSession = useGameStore(state => state.abandonSession);
  const resetProgress = useGameStore(state => state.resetProgress);
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
  const [confirmAction, setConfirmAction] = useState<{type: 'ABANDON_CAMPAIGN' | 'ABANDON_NEW_GAME' | 'LOGOUT' | 'RESET_PROGRESS_ALL', payload?: any} | null>(null);
  

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

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
          if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
              setIsSettingsOpen(false);
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const startCampaignWithMode = (mode: 'STORY' | 'LEVELS') => {
    playUiSound('CLICK');
    setCampaignMode(mode);
    if (hasActiveSession) {
        setConfirmAction({ type: 'ABANDON_CAMPAIGN', payload: mode });
    } else {
        setUIState(mode === 'STORY' ? 'STORY_BUILDER' : 'CAMPAIGN_MAP');
    }
  };

  const handleNewGameClick = () => {
    playUiSound('CLICK');
    if (hasActiveSession) {
      setConfirmAction({ type: 'ABANDON_NEW_GAME' });
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
      setConfirmAction({ type: 'LOGOUT' });
    } else {
      logout();
    }
  };

  const executeConfirmAction = () => {
    playUiSound('CLICK');
    if (!confirmAction) return;

    if (confirmAction.type === 'ABANDON_CAMPAIGN') {
      abandonSession();
      setUIState(confirmAction.payload === 'STORY' ? 'STORY_BUILDER' : 'CAMPAIGN_MAP');
    } else if (confirmAction.type === 'ABANDON_NEW_GAME') {
      setShowMissionConfig(true);
      setSelectedTier(1);
      setDifficulty('EASY');
    } else if (confirmAction.type === 'LOGOUT') {
      logout();
    } else if (confirmAction.type === 'RESET_PROGRESS_ALL') {
      resetProgress();
    }
    setConfirmAction(null);
  };

  const cancelConfirmAction = () => {
    playUiSound('CLICK');
    setConfirmAction(null);
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
      if (d === 'EASY') return language === 'RU' ? 'Принимает любые предметы' : 'Accepts ANY Item';
      if (d === 'MEDIUM') return language === 'RU' ? 'Предметы: Необычные+' : 'Items: Uncommon+';
      return language === 'RU' ? 'Предметы: Редкие+' : 'Items: Rare+ Only';
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
      <div className="absolute top-0 left-0 w-full p-4 md:p-6 flex justify-between items-start z-50 pointer-events-auto">
        {/* LEFT UP CORNER: ACCESS/AUTH OR PROFILE */}
        <div className="flex items-center gap-2">
            {!user ? (
              <button 
                onClick={() => { setAuthMode('LOGIN'); setInputName(''); setInputPassword(''); setErrorMessage(null); playUiSound('CLICK'); }} 
                className="flex items-center gap-2 px-4 py-2.5 md:py-3 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 hover:text-white rounded-full border border-indigo-500/30 hover:border-indigo-400/60 transition-all shadow-[0_4px_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] backdrop-blur-xl group cursor-pointer"
              >
                 <Fingerprint className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 drop-shadow-[0_0_8px_currentColor]" />
                 <span className="text-[10px] md:text-xs font-black uppercase tracking-widest drop-shadow-md">{t.MODAL_LOGIN_TITLE}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-xl p-1.5 pl-4 md:pl-6 rounded-full border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)] group hover:border-white/20 hover:bg-slate-800/60 transition-all">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-black text-white leading-tight max-w-[100px] truncate break-words whitespace-pre-wrap drop-shadow-md">{user.nickname}</span>
                  <span className="text-[9px] md:text-[10px] text-indigo-300/80 font-mono uppercase tracking-[0.2em] break-words whitespace-pre-wrap">{user.isGuest ? t.AUTH_GUEST : 'Commander'}</span>
                </div>
                {renderAvatar(user.avatarColor, user.headIndex, user.bodyIndex, 'sm')}
                <button onClick={handleLogout} className="p-2 md:p-2.5 rounded-full text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-all bg-black/20 border border-transparent hover:border-red-500/30 cursor-pointer"><LogOut className="w-4 h-4 md:w-5 md:h-5" /></button>
              </div>
            )}
        </div>

        {/* RIGHT UP CORNER: SETTINGS WITH GEAR ICON */}
        <div className="relative" ref={settingsMenuRef}>
            <button 
              onClick={() => { setIsSettingsOpen(!isSettingsOpen); playUiSound('CLICK'); }}
              className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center backdrop-blur-xl rounded-full transition-all border border-indigo-500/30 bg-slate-900/40 text-indigo-300 hover:text-white hover:border-indigo-400/80 hover:bg-indigo-900/50 hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] shadow-[0_4px_20px_rgba(0,0,0,0.3)] cursor-pointer"
            >
              <Settings className="w-5 h-5 animate-[spin_20s_linear_infinite_paused] hover:animate-[spin_4s_linear_infinite]" />
            </button>

            <AnimatePresence>
            {isSettingsOpen && (
                <motion.div 
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ type: "spring", damping: 20, stiffness: 200 }}
                    className="absolute top-full right-0 mt-2 bg-slate-900/95 backdrop-blur-xl border-2 border-indigo-500/40 p-3 md:p-3.5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col gap-2 min-w-[240px] md:min-w-[260px] z-[60]"
                >
                    {/* Header in the dropdown */}
                    <div className="flex flex-col border-b border-indigo-500/20 pb-1.5 mb-0.5">
                        <span className="text-[10px] font-mono text-indigo-400 uppercase tracking-widest leading-none">SYSTEM CONTROL</span>
                        <span className="text-xs md:text-sm font-black text-white uppercase tracking-wider mt-0.5">{language === 'RU' ? 'Панель управления' : 'Control Desk'}</span>
                    </div>

                    {/* Language Settings */}
                    <div className="flex flex-col gap-1">
                        <div className="grid grid-cols-2 gap-1.5 p-0.5 bg-slate-950/80 rounded-xl border border-white/5">
                            <button 
                                onClick={() => { setLanguage('EN'); playUiSound('CLICK'); }}
                                className={`py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${language === 'EN' ? 'bg-indigo-600/30 text-white border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                English
                            </button>
                            <button 
                                onClick={() => { setLanguage('RU'); playUiSound('CLICK'); }}
                                className={`py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer ${language === 'RU' ? 'bg-indigo-600/30 text-white border border-indigo-500/30' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Русский
                            </button>
                        </div>
                    </div>

                    {/* Sounds Settings */}
                    <div className="flex flex-col gap-1">
                        <div className="flex flex-col gap-1">
                            {/* Music Toggle */}
                            <button 
                                onClick={() => { toggleMusic(); playUiSound('CLICK'); }} 
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all text-left cursor-pointer ${isMusicMuted ? 'border-slate-800 bg-slate-950/40 text-slate-500' : 'border-indigo-500/30 bg-indigo-950/20 text-indigo-300 hover:bg-indigo-950/30'}`}
                            >
                                <div className="flex items-center gap-2">
                                    {isMusicMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Music className="w-3.5 h-3.5 text-indigo-400" />}
                                    <span className="text-[11px] font-black uppercase tracking-wider">{language === 'RU' ? 'Музыка' : 'Music'}</span>
                                </div>
                                <span className="text-[9px] font-mono leading-none">{isMusicMuted ? 'OFF' : 'ON'}</span>
                            </button>
                            {/* SFX Toggle */}
                            <button 
                                onClick={() => { toggleSfx(); playUiSound('CLICK'); }} 
                                className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl border transition-all text-left cursor-pointer ${isSfxMuted ? 'border-slate-800 bg-slate-950/40 text-slate-500' : 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/30'}`}
                            >
                                <div className="flex items-center gap-2">
                                    {isSfxMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                                    <span className="text-[11px] font-black uppercase tracking-wider">{language === 'RU' ? 'Эффекты' : 'SFX'}</span>
                                </div>
                                <span className="text-[9px] font-mono leading-none">{isSfxMuted ? 'OFF' : 'ON'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Leaderboard Link inside Dropdown */}
                    <div className="flex flex-col border-t border-indigo-500/20 pt-2 mt-0.5">
                        <button 
                            onClick={() => { setIsSettingsOpen(false); setUIState('LEADERBOARD'); playUiSound('CLICK'); }}
                            className="flex items-center gap-2 w-full p-2 bg-gradient-to-r from-indigo-950/40 to-indigo-900/10 border border-indigo-500/20 hover:border-indigo-400/60 rounded-xl hover:bg-indigo-900/30 hover:text-white transition-all text-left text-indigo-300 text-[10px] font-black uppercase tracking-wider cursor-pointer"
                        >
                            <Trophy className="w-3.5 h-3.5 text-amber-400" />
                            <span>{language === 'RU' ? 'Открыть Рейтинг' : 'Open Rankings'}</span>
                        </button>
                    </div>
                </motion.div>
            )}
            </AnimatePresence>
        </div>
      </div>

      {/* CENTER MENU - ADAPTIVE GRID SYSTEM */}
      <div className="flex flex-col md:grid md:grid-cols-12 gap-10 md:gap-14 lg:gap-20 w-full max-w-sm md:max-w-4xl lg:max-w-5xl px-6 md:px-10 z-10 max-h-screen overflow-y-auto no-scrollbar py-20 md:py-6 items-center justify-center">
        
        {/* LOGO BLOCK WITH ANIMATION (Column 1) */}
        <motion.div 
            initial={{ opacity: 0, x: -40, scale: 0.95 }}
            animate={{ opacity: logoVisible ? 1 : 0, x: logoVisible ? 0 : -40, scale: logoVisible ? 1 : 0.95 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="md:col-span-6 lg:col-span-7 flex flex-col items-center md:items-start text-center md:text-left selection:bg-indigo-500/30 font-sans"
        >
            {/* Top Security Status Header */}
            <div className="hidden md:flex items-center gap-2 mb-3 px-3 py-1 bg-indigo-950/40 border border-indigo-500/20 rounded-full select-none shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-[pulse_3s_ease-in-out_infinite]">
                <Activity className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                <span className="text-[9px] md:text-[10px] text-indigo-300 font-mono font-bold tracking-[0.2em] uppercase">
                    {language === 'RU' ? 'СЕКТОР_НЕБУЛА // СФЕРА_02' : 'NEBULA_SECTOR // HUB_02'}
                </span>
            </div>

            {/* Rotating Cyber HUD and Central Hexagon */}
            <div className="relative w-28 h-28 md:w-36 md:h-36 mb-4 flex items-center justify-center select-none group">
                {/* Background radial overlay */}
                <div className="absolute w-36 h-36 md:w-48 md:h-48 bg-indigo-500/20 blur-[35px] md:blur-[50px] rounded-full animate-[pulse_4s_ease-in-out_infinite]" />

                {/* Rotating Outer Tech Ring with Custom Segments */}
                <svg className="absolute w-full h-full animate-[spin_30s_linear_infinite]" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="44" stroke="#4f46e5" strokeWidth="1" strokeDasharray="6 8 36 8 16 12" fill="none" opacity="0.3" />
                    <circle cx="50" cy="50" r="44" stroke="#c084fc" strokeWidth="2" strokeDasharray="2 18" fill="none" opacity="0.5" />
                </svg>

                {/* Rotating Counter-Clockwise Dotted Ring */}
                <div className="absolute inset-2 border border-dotted border-indigo-400/40 rounded-full animate-[spin_15s_linear_infinite_reverse]" />

                {/* Middle Hex-Boundary Ring */}
                <div className="absolute inset-4 border border-dashed border-indigo-500/20 rounded-full animate-[spin_20s_linear_infinite]" />

                {/* Central Double-layered Hexagon Logo Core */}
                <div className="relative z-10 p-0.5 bg-slate-950/80 rounded-2xl border border-indigo-500/30 shadow-[inset_0_0_15px_rgba(99,102,241,0.3)] transition-transform duration-500 group-hover:scale-110">
                    <Hexagon className="w-14 h-14 md:w-18 md:h-18 text-indigo-400 drop-shadow-[0_0_20px_rgba(99,102,241,0.8)] fill-indigo-950/60" strokeWidth={1.25} />
                    <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                        <Target className="w-5 h-5 md:w-7 md:h-7 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]" />
                    </div>
                </div>

                {/* Isometric coordinate tick marks for corner decoration */}
                <div className="absolute top-2 left-2 text-[7px] text-indigo-400/55 font-mono">Q+0.2</div>
                <div className="absolute bottom-2 right-2 text-[7px] text-indigo-400/55 font-mono">R-0.8</div>
            </div>

            {/* Main Typographic Pile */}
            <div className="flex flex-col items-center md:items-start mt-2 relative group-hover:scale-[1.01] transition-transform duration-500">
                {/* Sci-Fi Decorative Grid Backdrop Accent */}
                <div className="absolute -inset-x-4 -inset-y-2 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.1)_0%,transparent_70%)] pointer-events-none rounded-2xl" />

                {/* Left/Right Bracket Matrix Decorations */}
                <div className="relative flex items-center">
                    <span className="hidden md:inline-block text-indigo-500/30 text-4xl lg:text-5xl font-mono mr-3 select-none leading-none animate-pulse">[</span>
                    
                    <h1 
                        className="relative text-5xl sm:text-6xl md:text-5xl lg:text-7xl xl:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-indigo-50 to-indigo-200 select-none uppercase transition-all duration-300"
                        style={{ 
                            WebkitTextStroke: '1.2px rgba(255,255,255,0.22)',
                            filter: 'drop-shadow(0 0 25px rgba(99,102,241,0.45)) drop-shadow(0 0 50px rgba(168,85,247,0.2))'
                        }}
                    >
                        {t.TITLE}
                        
                        {/* Interactive Scanline Glint Mask */}
                        <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent pointer-events-none mix-blend-color-dodge rounded-lg"
                            initial={{ x: '-100%', skewX: -25 }}
                            animate={{ x: '200%' }}
                            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut", repeatDelay: 1.2 }}
                        />
                    </h1>

                    <span className="hidden md:inline-block text-indigo-500/30 text-4xl lg:text-5xl font-mono ml-3 select-none leading-none animate-pulse">]</span>
                </div>

                {/* Subtitle with Scan Banner background & colorful text gradient */}
                <div className="relative mt-1 px-4 py-1.5 rounded bg-slate-900/50 border border-indigo-500/10 backdrop-blur-sm shadow-[inset_0_0_12px_rgba(99,102,241,0.15)] flex items-center justify-center overflow-hidden">
                    {/* Pulsating horizontal laser light */}
                    <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent animate-pulse" />

                    <div className="text-sm sm:text-base md:text-sm lg:text-lg text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-fuchsia-400 to-pink-400 font-mono font-black uppercase tracking-[0.3em] md:tracking-[0.4em] drop-shadow-[0_0_8px_rgba(168,85,247,0.3)] select-none">
                        {language === 'RU' ? 'ЭКОНОМИКА' : 'ECONOMY'}
                    </div>
                </div>
            </div>

            {/* Custom Divider Line & Subtitle */}
            <div className="flex items-center gap-3 mt-5 md:mt-6 select-none opacity-90 w-full justify-center md:justify-start">
                <div className="h-[2px] w-10 md:w-16 bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent md:to-indigo-500/40"></div>
                <p className="text-[10px] md:text-xs text-indigo-200/90 font-mono font-black tracking-[0.25em] uppercase drop-shadow-[0_0_10px_rgba(99,102,241,0.6)] whitespace-nowrap">
                    {t.SUBTITLE}
                </p>
                <div className="h-[2px] w-10 md:w-16 bg-gradient-to-l from-transparent via-indigo-500/60 to-transparent md:to-indigo-500/40"></div>
            </div>

            {/* Lower decorative protocol footprint */}
            <div className="hidden md:flex items-center gap-1.5 mt-5 text-[8px] text-slate-500 font-mono select-none uppercase tracking-wider">
                <span>VER: 2.0.0</span>
                <span>•</span>
                <span>SYS_INIT_OK</span>
                <span>•</span>
                <span>STABILITY: ACTIVE</span>
            </div>
        </motion.div>

        {/* PANELS & CONTROL ACTIONS BLOCK (Column 2) */}
        <div className="md:col-span-6 lg:col-span-5 flex flex-col gap-3.5 w-full max-w-sm shrink-0">
          <div className="flex flex-col gap-2">
            <MenuButton 
                onClick={() => startCampaignWithMode('STORY')} 
                variant="primary" 
                icon={<BookOpen className="w-5 h-5 fill-current" />} 
                label={t.CAMPAIGN} 
                subLabel={t.CAMPAIGN_SUB} 
                style={{ marginRight: '0px' }}
            />
          </div>

          <MenuButton onClick={handleNewGameClick} variant="battle" icon={<Swords className="w-5 h-5" />} label={t.SKIRMISH} subLabel={t.SKIRMISH_SUB} />
          {hasActiveSession && <MenuButton onClick={() => { setUIState('GAME'); playUiSound('CLICK'); }} icon={<ArrowRight className="w-5 h-5" />} label={t.RESUME} subLabel={t.RESUME_SUB} />}
        </div>

      </div>

      {/* AUTH MODAL */}
      <AnimatePresence>
      {authMode && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
        >
          <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-slate-950 border-2 border-indigo-500/40 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.25)] w-full max-w-sm relative overflow-hidden flex flex-col group"
          >
              {/* Cyber Corner Brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />

              {/* Scanlines */}
              <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
            {/* ... Existing Auth Modal Content (kept as is) ... */}
            <div className="grid grid-cols-2 border-b border-indigo-500/20 bg-slate-900/50">
                <button onClick={() => { setAuthMode('LOGIN'); playUiSound('CLICK'); }} className={`py-4 text-xs font-black uppercase tracking-widest transition-colors break-words whitespace-pre-wrap ${authMode === 'LOGIN' ? 'bg-slate-800/50 text-indigo-400 border-b-2 border-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>{t.AUTH_LOGIN}</button>
                <button onClick={() => { setAuthMode('REGISTER'); playUiSound('CLICK'); }} className={`py-4 text-xs font-black uppercase tracking-widest transition-colors break-words whitespace-pre-wrap ${authMode === 'REGISTER' ? 'bg-slate-800/50 text-emerald-400 border-b-2 border-emerald-500 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'}`}>{t.AUTH_REGISTER}</button>
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
              <AnimatePresence>
              {errorMessage && (
                  <motion.div 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }} 
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center justify-center text-red-400 text-xs font-mono font-black uppercase tracking-wider text-center"
                  >
                      {errorMessage}
                  </motion.div>
              )}
              </AnimatePresence>
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
                      <label className="text-[8px] md:text-[9px] uppercase font-bold text-slate-500 tracking-widest mb-1 block flex items-center gap-1.5"><User className="w-3 h-3 text-indigo-400" /> {t.INPUT_NAME}</label>
                      <div className="relative group">
                          <input type="text" value={inputName} onChange={(e) => setInputName(e.target.value)} placeholder={t.INPUT_NAME_PH} className="w-full bg-slate-950/80 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm shadow-inner group-hover:border-slate-600" maxLength={16} />
                      </div>
                  </div>
                  {authMode !== 'GUEST' && (
                      <div>
                          <label className="text-[8px] md:text-[9px] uppercase font-bold text-slate-500 tracking-widest mb-1 block flex items-center gap-1.5"><Lock className="w-3 h-3 text-indigo-400" /> {t.INPUT_PASS}</label>
                          <div className="relative group">
                              <input type="password" value={inputPassword} onChange={(e) => setInputPassword(e.target.value)} placeholder={t.INPUT_PASS_PH} className="w-full bg-slate-950/80 border border-slate-700/50 rounded-xl px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all font-mono text-sm shadow-inner group-hover:border-slate-600" />
                          </div>
                      </div>
                  )}
                  <motion.button 
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleAuthSubmit} 
                      className={`w-full py-4 mt-4 font-black rounded-2xl uppercase tracking-[0.15em] shadow-lg transition-all flex items-center justify-center gap-2 relative overflow-hidden group ${authMode === 'GUEST' ? 'bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-600/50 shadow-[0_4px_20px_rgba(0,0,0,0.4)]' : (authMode === 'LOGIN' ? 'bg-indigo-600/90 text-white shadow-[0_4px_25px_rgba(99,102,241,0.5)] border-t border-indigo-400/50 hover:bg-indigo-500 backdrop-blur-md' : 'bg-emerald-600/90 text-white shadow-[0_4px_25px_rgba(16,185,129,0.5)] border-t border-emerald-400/50 hover:bg-emerald-500 backdrop-blur-md')}`}
                  >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <span className="relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{authMode === 'GUEST' ? t.BTN_GUEST : (authMode === 'LOGIN' ? t.BTN_LOGIN : t.BTN_REGISTER)}</span> <ArrowRight className="w-4 h-4 relative z-10 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" />
                  </motion.button>
              </div>
              <div className="border-t border-slate-800/80 pt-5 flex justify-center">
                  {authMode === 'GUEST' ? (
                      <button onClick={() => setAuthMode('LOGIN')} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 hover:text-indigo-400 transition-colors">{t.BTN_BACK_LOGIN}</button>
                  ) : (
                      <button onClick={() => setAuthMode('GUEST')} className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 hover:text-slate-300 transition-colors flex items-center gap-2 group"><Ghost className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors" /> {t.BYPASS_SECURITY}</button>
                  )}
              </div>
            </div>
            <button onClick={() => setAuthMode(null)} className="absolute top-3 right-3 p-2 text-slate-600 hover:text-white transition-colors rounded-full hover:bg-slate-800"><X className="w-5 h-5" /></button>
          </motion.div>
        </motion.div>
      
      )}
      </AnimatePresence>

      {/* CONFIRM ACTION MODAL */}
      <AnimatePresence>
      {confirmAction && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 pointer-events-auto"
            onClick={cancelConfirmAction}
          >
            <motion.div 
                initial={{ scale: 0.95, y: 10 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 10 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-slate-900 border border-slate-700/80 rounded-2xl p-6 md:p-8 max-w-sm w-full shadow-2xl relative text-center"
            >
                <div className="w-12 h-12 rounded-full border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4 bg-amber-500/10">
                    <span className="text-amber-500 text-xl font-bold">!</span>
                </div>
                <h3 className="text-xl md:text-2xl font-black font-mono text-white mb-2 tracking-tight uppercase">
                    {language === 'RU' ? 'ВНИМАНИЕ' : 'WARNING'}
                </h3>
                <p className="text-slate-300 mb-6 text-sm md:text-base px-2">
                    {confirmAction.type === 'LOGOUT' 
                        ? (language === 'RU' ? t.LOGOUT_CONFIRM : t.LOGOUT_CONFIRM)
                        : confirmAction.type === 'RESET_PROGRESS_ALL'
                        ? (language === 'RU' 
                            ? 'Вы уверены, что хотите сбросить ВЕСЬ прогресс обучения, чертежей и очков в 0? Это действие необратимо.' 
                            : 'Are you sure you want to reset ALL training progression, blueprints, and points back to 0? This action is irreversible.')
                        : (language === 'RU' ? t.ABANDON_CONFIRM : t.ABANDON_CONFIRM)}
                </p>
                <div className="flex gap-3">
                    <button 
                        onClick={cancelConfirmAction}
                        className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold uppercase tracking-wider text-xs md:text-sm rounded-xl transition-all border border-slate-700 active:scale-95 touch-manipulation"
                    >
                        {language === 'RU' ? 'Отмена' : 'Cancel'}
                    </button>
                    <button 
                        onClick={executeConfirmAction}
                        className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold uppercase tracking-wider text-xs md:text-sm rounded-xl transition-all border border-amber-500/50 shadow-[0_4px_15px_rgba(245,158,11,0.4)] active:scale-95 touch-manipulation"
                    >
                        {language === 'RU' ? 'Продолжить' : 'Proceed'}
                    </button>
                </div>
            </motion.div>
          </motion.div>
      )}
      </AnimatePresence>

      {/* COMPACT BATTLE CONFIGURATOR */}
      <AnimatePresence>
      {showMissionConfig && (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4"
        >
          <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-slate-950 border-2 border-indigo-500/40 rounded-2xl shadow-[0_0_50px_rgba(79,70,229,0.25)] w-full max-w-2xl h-fit max-h-[90vh] relative overflow-hidden flex flex-col group"
          >
              {/* Cyber Corner Brackets */}
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-indigo-500/50 z-30 pointer-events-none" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-indigo-500/50 z-30 pointer-events-none" />

              {/* Scanlines */}
              <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none z-10" />
             
             {/* Header */}
             <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-indigo-500/20 bg-slate-900/50 shrink-0">
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
                    <button onClick={() => setShowMissionConfig(false)} className="text-slate-500 hover:text-white transition-colors p-2 rounded-full hover:bg-slate-800"><X className="w-5 h-5" /></button>
                </div>
             </div>

             {/* SCROLLABLE CONTENT */}
             <div className="flex-1 overflow-y-auto no-scrollbar p-2 md:p-6 space-y-2 md:space-y-6">
                 
                 {/* 1. MISSION SELECTION (Compact Grid) */}
                 <div>
                    <h3 className="text-[8.5px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2 mb-1 md:mb-3 break-words whitespace-pre-wrap">
                        <Target className="w-2.5 h-2.5 md:w-3 md:h-3" /> {t.COL_GOAL_TITLE}
                    </h3>
                    <div className="grid grid-cols-3 gap-1.5 md:gap-3 relative">
                        {[1, 2, 3].map(id => {
                              const tier = MISSION_TIERS[id as 1|2|3];
                              const isSelected = selectedTier === id;
                              const Icon = tier.icon;
                              return (
                                <button 
                                  key={id} 
                                  onClick={() => { setSelectedTier(id as 1|2|3); setDifficulty(tier.difficulty); playUiSound('CLICK'); }}
                                  className={`
                                    relative flex flex-col items-center justify-center p-1 md:p-3 rounded-2xl transition-all duration-300 border focus:outline-none group h-14 md:h-24 overflow-hidden
                                    ${isSelected 
                                        ? 'bg-gradient-to-b from-indigo-500/20 to-slate-900/90 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3),inset_0_0_15px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5),inset_0_0_20px_rgba(99,102,241,0.3)] scale-[1.02]' 
                                        : 'bg-slate-900/40 border-slate-700/50 hover:border-slate-500 hover:bg-slate-800/60 shadow-lg'}
                                  `}
                                >
                                   {isSelected && (
                                     <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/10 to-transparent pointer-events-none" />
                                   )}
                                   {isSelected && (
                                     <div className="absolute inset-0 opacity-30 shadow-[inset_0_0_15px_#818cf8] rounded-2xl pointer-events-none blur-sm" />
                                   )}
                                   <Icon className={`relative z-10 w-3.5 h-3.5 md:w-6 md:h-6 mb-0.5 md:mb-2 transition-all duration-300 ${isSelected ? 'text-indigo-300 drop-shadow-[0_0_10px_rgba(165,180,252,0.8)] scale-110' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                   <span className={`relative z-10 text-[8px] md:text-[10px] font-black uppercase tracking-wider text-center leading-tight break-words whitespace-pre-wrap transition-all duration-300 ${isSelected ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]' : 'text-slate-400'}`}>{tier.label}</span>
                                   <span className={`relative z-10 text-[7px] md:text-[9px] font-mono mt-0 md:mt-1 transition-all duration-300 ${isSelected ? 'text-indigo-200/80 drop-shadow-md' : 'text-slate-600'}`}>{tier.time}</span>
                                </button>
                              );
                        })}
                    </div>
                 </div>

                 <div className="h-px bg-slate-800 w-full" />

                 {/* 2. CONFIGURATION GRID */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                     
                     {/* LEFT: DIFFICULTY & MAP TYPE */}
                     <div className="flex flex-col gap-3 md:gap-5">
                        
                        {/* DIFFICULTY (STYLISH UNIFIED CARD PANEL) */}
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5 md:p-4.5 flex flex-col gap-3 md:gap-4 transition-all hover:border-slate-700/60 shadow-lg relative overflow-hidden group">
                            {/* Accent lighting pattern */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/8 transition-all duration-300 pointer-events-none" />
                            
                            <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
                                <div className="flex flex-col gap-0.5">
                                    <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.12em] text-slate-300 flex items-center gap-2 leading-none">
                                        <Shield className="w-3.5 h-3.5 text-indigo-400" /> {t.LBL_DIFFICULTY}
                                    </h3>
                                    <span className="text-[8px] md:text-[9px] text-slate-500 font-mono uppercase tracking-wider leading-none mt-1">
                                        {difficulty === 'EASY' ? t.DIFF_EASY : difficulty === 'MEDIUM' ? t.DIFF_MEDIUM : t.DIFF_HARD}
                                    </span>
                                </div>

                                <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800 shrink-0 w-44 md:w-52">
                                    {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map(d => {
                                        const active = difficulty === d;
                                        let btnColor = 'text-slate-600 hover:text-slate-400';
                                        if (active) {
                                            if (d === 'EASY') btnColor = 'bg-emerald-600/90 text-white shadow-md shadow-emerald-950/50 font-bold';
                                            if (d === 'MEDIUM') btnColor = 'bg-amber-600/90 text-white shadow-md shadow-amber-950/50 font-bold';
                                            if (d === 'HARD') btnColor = 'bg-red-600/90 text-white shadow-md shadow-red-950/50 font-bold';
                                        }
                                        return (
                                            <button 
                                                key={d} 
                                                type="button"
                                                onClick={() => { setDifficulty(d); playUiSound('CLICK'); }}
                                                className={`flex-1 py-1 rounded-lg text-[7.5px] md:text-[9px] font-black uppercase tracking-wider transition-all break-words ${btnColor}`}
                                            >
                                                {d === 'EASY' ? t.DIFF_EASY : d === 'MEDIUM' ? t.DIFF_MEDIUM : t.DIFF_HARD}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            
                            <div className={`p-2 rounded-xl border flex items-start gap-1.5 md:gap-2.5 transition-all duration-300 relative z-10 ${getDifficultyColor(difficulty)}`}>
                                <Activity className="w-3.5 h-3.5 shrink-0 animate-pulse mt-0.5" />
                                <div>
                                    <span className="block text-[7px] md:text-[8px] font-black uppercase tracking-widest opacity-70 leading-none">{t.RULES_ENGAGEMENT}</span>
                                    <span className="text-[7.5px] md:text-[9.5px] font-medium leading-tight block mt-1">{getDifficultyDesc(difficulty)}</span>
                                </div>
                            </div>
                        </div>

                        {/* MAP TYPE SELECTOR (STYLISH COMPACT CARD PANEL) */}
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5 md:p-4.5 flex items-center justify-between gap-4 transition-all hover:border-slate-700/60 shadow-lg relative overflow-hidden group">
                            {/* Accent lighting pattern */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/3 rounded-full blur-2xl group-hover:bg-cyan-500/5 transition-all duration-300 pointer-events-none" />
                            
                            <div className="flex flex-col gap-0.5 relative z-10">
                                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.12em] text-slate-300 flex items-center gap-2 leading-none">
                                    <MapIcon className="w-3.5 h-3.5 text-cyan-400" /> {language === 'RU' ? 'Ландшафт' : 'Terrain'}
                                </h3>
                                <span className="text-[8px] md:text-[9.5px] text-slate-500 font-mono uppercase tracking-wider leading-normal mt-1 max-w-[120px] md:max-w-[200px]">
                                    {mapType === 'FLAT' 
                                        ? (language === 'RU' ? 'Мягкий плоский сектор' : 'Flat, stable terrain') 
                                        : (language === 'RU' ? 'Опасные аномальные выступы' : 'High tactical verticality')}
                                </span>
                            </div>

                            <div className="flex bg-slate-950 p-0.5 rounded-xl border border-slate-800 shrink-0 w-36 md:w-44 relative z-10">
                                <button 
                                    type="button"
                                    onClick={() => { setMapType('FLAT'); playUiSound('CLICK'); }}
                                    className={`flex-1 py-1 md:py-1.5 rounded-lg text-[7.5px] md:text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${mapType === 'FLAT' ? 'bg-slate-800 text-white shadow-[0_0_8px_rgba(255,255,255,0.1)]' : 'text-slate-600 hover:text-slate-400'}`}
                                >
                                    <Layers className="w-2.5 h-2.5 md:w-3 md:h-3" /> {language === 'RU' ? 'Плоский' : 'Flat'}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => { setMapType('CHAOTIC'); playUiSound('CLICK'); }}
                                    className={`flex-1 py-1 md:py-1.5 rounded-lg text-[7.5px] md:text-[9px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${mapType === 'CHAOTIC' ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-900/30' : 'text-slate-600 hover:text-slate-400'}`}
                                >
                                    <Activity className="w-2.5 h-2.5 md:w-3 md:h-3" /> {language === 'RU' ? 'Хаос' : 'Chaos'}
                                </button>
                            </div>
                        </div>

                     </div>

                     {/* RIGHT: BOTS & STORAGE */}
                     <div className="flex flex-col gap-3 md:gap-5">
                        
                        {/* BOTS (STYLISH RE-ENGINEERED COMPACT CARD PANEL) */}
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5 md:p-4.5 flex items-center justify-between gap-4 transition-all hover:border-slate-700/60 shadow-lg relative overflow-hidden group">
                            {/* Accent lighting pattern */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/3 rounded-full blur-2xl group-hover:bg-rose-500/5 transition-all duration-300 pointer-events-none" />
                            
                            <div className="flex flex-col gap-0.5 flex-1 relative z-10">
                                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.12em] text-slate-300 flex items-center gap-2 leading-none">
                                    <Bot className="w-3.5 h-3.5 text-rose-500 animate-pulse" /> {t.LBL_RIVALS}
                                </h3>
                                <span className="text-[8px] md:text-[9.5px] text-slate-500 font-mono uppercase tracking-wider leading-none mt-1 break-words">
                                    {getBotLabel(botCount)}
                                </span>
                                {botCount >= 4 && (
                                    <span className="text-[7px] md:text-[8px] text-red-500 font-bold font-mono uppercase flex items-center gap-0.5 animate-pulse mt-1 leading-none">
                                        <Flame className="w-2 md:w-2.5 md:h-2.5" /> {t.HIGH_CPU}
                                    </span>
                                )}
                                {/* Matrix Grid dot indicator */}
                                <div className="flex gap-1.5 mt-2.5">
                                    {Array.from({ length: 6 }).map((_, i) => {
                                        const active = i < botCount;
                                        return (
                                            <div 
                                                key={i} 
                                                className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-[1px] transition-all duration-300 ${
                                                    active 
                                                        ? 'bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' 
                                                        : 'bg-slate-800/60'
                                                }`} 
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 w-24 md:w-28 shrink-0 justify-between relative z-10">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (botCount > 1) {
                                            setBotCount(botCount - 1);
                                            playUiSound('CLICK');
                                        }
                                    }}
                                    disabled={botCount <= 1}
                                    className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all ${
                                        botCount <= 1
                                            ? 'text-slate-800 bg-transparent cursor-not-allowed opacity-20'
                                            : 'text-rose-400 bg-slate-900 border border-slate-800/50 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/30 active:scale-95'
                                    }`}
                                >
                                    <Minus className="w-3 h-3 md:w-4 md:h-4" />
                                </button>
                                
                                <span className="text-xs md:text-sm font-mono font-black text-rose-500">
                                    {botCount}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (botCount < 6) {
                                            setBotCount(botCount + 1);
                                            playUiSound('CLICK');
                                        }
                                    }}
                                    disabled={botCount >= 6}
                                    className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all ${
                                        botCount >= 6
                                            ? 'text-slate-800 bg-transparent cursor-not-allowed opacity-20'
                                            : 'text-rose-400 bg-slate-900 border border-slate-800/50 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/30 active:scale-95'
                                    }`}
                                >
                                    <Plus className="w-3 h-3 md:w-4 md:h-4" />
                                </button>
                            </div>
                        </div>

                        {/* STORAGE SELECTOR (STYLISH EMERALD COMPACT CARD PANEL) */}
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-3.5 md:p-4.5 flex items-center justify-between gap-4 transition-all hover:border-slate-700/60 shadow-lg relative overflow-hidden group">
                            {/* Accent lighting pattern */}
                            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/3 rounded-full blur-2xl group-hover:bg-emerald-500/5 transition-all duration-300 pointer-events-none" />
                            
                            <div className="flex flex-col gap-0.5 flex-1 relative z-10">
                                <h3 className="text-[10px] md:text-xs font-black uppercase tracking-[0.12em] text-slate-300 flex items-center gap-2 leading-none">
                                    <Box className="w-3.5 h-3.5 text-emerald-500" /> {t.CARGO_CAP}
                                </h3>
                                <span className="text-[8px] md:text-[9.5px] text-slate-500 font-mono uppercase tracking-wider leading-none mt-1 break-words">
                                    {language === 'RU' ? `Объем склада: ${storageCap}` : `Cargo Capacity: ${storageCap}`}
                                </span>
                                {/* Slots physical status containers */}
                                <div className="flex gap-1.5 mt-2.5">
                                    {Array.from({ length: 6 }).map((_, i) => {
                                        const active = i < storageCap;
                                        return (
                                            <div 
                                                key={i} 
                                                className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-[1px] transition-all duration-300 border ${
                                                    active 
                                                        ? 'border-emerald-500/50 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' 
                                                        : 'border-slate-800 bg-slate-850'
                                                }`} 
                                            />
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 w-24 md:w-28 shrink-0 justify-between relative z-10">
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (storageCap > 3) {
                                            setStorageCap(storageCap - 1);
                                            playUiSound('CLICK');
                                        }
                                    }}
                                    disabled={storageCap <= 3}
                                    className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all ${
                                        storageCap <= 3
                                            ? 'text-slate-800 bg-transparent cursor-not-allowed opacity-20'
                                            : 'text-emerald-400 bg-slate-900 border border-slate-800/50 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-95'
                                    }`}
                                >
                                    <Minus className="w-3 h-3 md:w-4 md:h-4" />
                                </button>
                                
                                <span className="text-xs md:text-sm font-mono font-black text-emerald-400">
                                    {storageCap}
                                </span>

                                <button
                                    type="button"
                                    onClick={() => {
                                        if (storageCap < 6) {
                                            setStorageCap(storageCap + 1);
                                            playUiSound('CLICK');
                                        }
                                    }}
                                    disabled={storageCap >= 6}
                                    className={`w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center transition-all ${
                                        storageCap >= 6
                                            ? 'text-slate-800 bg-transparent cursor-not-allowed opacity-20'
                                            : 'text-emerald-400 bg-slate-900 border border-slate-800/50 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 active:scale-95'
                                    }`}
                                >
                                    <Plus className="w-3 h-3 md:w-4 md:h-4" />
                                </button>
                            </div>
                        </div>

                     </div>

                 </div>
             </div>

             {/* FOOTER ACTION */}
             <div className="p-3 md:p-6 border-t border-indigo-500/20 bg-slate-900/50 backdrop-blur-sm flex items-center justify-between gap-3 md:gap-4 shrink-0">
                 <div className="flex flex-col">
                     <span className="text-[7px] md:text-[9px] text-slate-500 font-bold uppercase tracking-widest break-words whitespace-pre-wrap">{t.EST_REWARD}</span>
                     <span className="text-xs md:text-base font-mono font-black text-amber-400 flex items-center gap-1 md:gap-2 break-words whitespace-pre-wrap">
                        <Gem className="w-3 md:w-4 md:h-4" />
                        {selectedTier === 3 ? t.REWARD_HIGH : (selectedTier === 2 ? t.REWARD_MED : t.REWARD_STD)}
                     </span>
                 </div>
                 <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={confirmMissionStart}
                    className="flex-1 max-w-xs py-3 md:py-4 bg-indigo-600/90 backdrop-blur-md hover:bg-indigo-500 text-white font-black rounded-2xl border-t border-indigo-400/50 uppercase tracking-[0.2em] md:tracking-[0.25em] shadow-[0_8px_32px_rgba(99,102,241,0.4)] hover:shadow-[0_8px_40px_rgba(99,102,241,0.5)] transition-all flex items-center justify-center gap-2 md:gap-3 group text-xs md:text-sm break-words whitespace-pre-wrap"
                 >
                    <Crosshair className="w-3.5 h-3.5 md:w-5 md:h-5 text-indigo-100 group-hover:text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] group-hover:rotate-90 transition-all duration-500" />
                    <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{t.BTN_START}</span>
                 </motion.button>
             </div>

          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

    </div>
  );
};

export default MainMenu;
