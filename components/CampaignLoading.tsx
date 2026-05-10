import React, { useEffect, useState } from 'react';
import { useGameStore } from '../store.ts';
import { CAMPAIGN_LEVELS } from '../campaign/levels.ts';
import { motion } from 'motion/react';
import { Hexagon, Terminal, ArrowRight } from 'lucide-react';
import { TEXT } from '../services/i18n.ts';

const CampaignLoading: React.FC = () => {
  const { setUIState, session, language, loadingLevelId } = useGameStore();
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState('');

  const [isReady, setIsReady] = useState(false);
  const playUiSound = useGameStore(state => state.playUiSound);

  useEffect(() => {
    const textsEN = [
      'ESTABLISHING CONNECTION...',
      'GENERATING TERRAIN...',
      'CALIBRATING ENTROPY...',
      'DEPLOYING UNITS...',
      'READY'
    ];
    
    const textsRU = [
      'УСТАНОВКА СОЕДИНЕНИЯ...',
      'ГЕНЕРАЦИЯ ЛАНДШАФТА...',
      'КАЛИБРОВКА ЭНТРОПИИ...',
      'РАЗВЕРТЫВАНИЕ ЮНИТОВ...',
      'ГОТОВО'
    ];
    
    const texts = language === 'RU' ? textsRU : textsEN;

    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.random() * 15;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setIsReady(true);
      }
      setProgress(currentProgress);
      
      const textIndex = Math.min(Math.floor((currentProgress / 100) * texts.length), texts.length - 1);
      setLoadingText(texts[textIndex]);
    }, 200);

    return () => clearInterval(interval);
  }, [language]);

  const handleStart = () => {
    playUiSound('SUCCESS');
    setUIState('GAME');
  };

  const levelConfig = session?.activeLevelConfig || CAMPAIGN_LEVELS.find(l => l.id === loadingLevelId);
  
  let displayTitle = '';
  if (levelConfig) {
      const levelKey = levelConfig.id.replace('.', '_');
      const titleKey = `LEVEL_${levelKey}_TITLE` as keyof typeof TEXT.EN.CAMPAIGN;
      displayTitle = TEXT[language].CAMPAIGN[titleKey] || levelConfig.title;
  }

  return (
    <div className="fixed inset-0 bg-slate-950 z-[100] flex flex-col items-center justify-center p-6 overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#020617_100%)]" />
      <div className="absolute inset-0 overflow-hidden mix-blend-screen opacity-10">
        <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-900/40 blur-[100px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[20%] w-[50%] h-[50%] rounded-full bg-blue-900/40 blur-[100px] animate-blob animation-delay-2000" />
      </div>
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md flex flex-col items-center"
      >
        <div className="relative mb-12">
          <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
          <Hexagon className="w-32 h-32 text-indigo-500 animate-[spin_10s_linear_infinite] opacity-30" strokeWidth={0.5} />
          <Hexagon className="w-32 h-32 text-indigo-400 absolute inset-0 animate-pulse" strokeWidth={1.5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <Terminal className="w-10 h-10 text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          </div>
        </div>

        {levelConfig && (
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-indigo-400 font-mono text-xs tracking-[0.3em] mb-3 uppercase opacity-70 break-words whitespace-pre-wrap">
                {language === 'RU' ? 'УСТАНОВКА СОЕДИНЕНИЯ' : 'ESTABLISHING LINK'} // {levelConfig.id}
              </h2>
              <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] break-words whitespace-pre-wrap">
                {displayTitle}
              </h1>
            </motion.div>
          </div>
        )}

        <div className="w-full max-w-xs h-16 flex flex-col items-center justify-center">
            {!isReady ? (
              <>
                <div className="w-full bg-slate-900/50 rounded-full h-1 mb-4 overflow-hidden border border-slate-800/50 relative">
                  <motion.div 
                    className="bg-gradient-to-r from-indigo-600 to-blue-400 h-full shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                    initial={{ width: '0%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ ease: "linear", duration: 0.2 }}
                  />
                </div>

                <div className="flex justify-between w-full text-[10px] font-mono text-slate-500 tracking-widest uppercase break-words whitespace-pre-wrap">
                  <span className="animate-pulse">{loadingText || (language === 'RU' ? 'ИНИЦИАЛИЗАЦИЯ...' : 'INITIALIZING...')}</span>
                  <span className="text-indigo-400 font-bold">{Math.floor(progress)}%</span>
                </div>
              </>
            ) : (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleStart}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all flex items-center justify-center gap-3 group"
              >
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <span className="break-words whitespace-pre-wrap">{language === 'RU' ? 'ВОЙТИ В СЕКТОР' : 'ENTER SECTOR'}</span>
              </motion.button>
            )}
        </div>

        {/* Decorative elements */}
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-px h-16 bg-gradient-to-t from-transparent via-indigo-500/50 to-transparent" />
      </motion.div>

      {/* Scanning line effect */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        <div className="w-full h-1 bg-indigo-500/50 blur-sm animate-[scan_3s_linear_infinite]" />
      </div>
    </div>
  );
};

export default CampaignLoading;
