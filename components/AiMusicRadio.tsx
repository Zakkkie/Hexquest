import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Sparkles, Play, Pause, Square, AlertCircle, RefreshCw, Layers, Sliders, Volume2, HelpCircle } from 'lucide-react';
import { audioService } from '../services/audioService.ts';
import { useGameStore } from '../store.ts';

interface AiMusicRadioProps {
    onClose?: () => void;
}

const PRESETS = [
    {
        id: 'cyberpunk',
        name: 'Cyberpunk Industrial',
        nameRu: 'Киберпанк Индустриал',
        prompt: 'High-intensity cyberpunk industrial techno synthwave music with deep analog bass and futuristic synthetic beats',
        icon: '⚡',
        vibe: 'Heavy & Dark'
    },
    {
        id: 'cosmic',
        name: 'Cosmic Ambient',
        nameRu: 'Космический Эмбиент',
        prompt: 'Eerie, atmospheric cosmic dark ambient background pad with slow sub-bass sweeps and starry textures',
        icon: '🌌',
        vibe: 'Spacious & Calming'
    },
    {
        id: 'chiptune',
        name: 'Retro Chiptune',
        nameRu: 'Ретро Чиптьюн',
        prompt: 'Playful, dynamic 8-bit chiptune retro adventure track with crunchy synth leads and upbeat driving pulses',
        icon: '🎮',
        vibe: 'Energetic Retro'
    },
    {
        id: 'void',
        name: 'Void Symphony',
        nameRu: 'Симфония Бездны',
        prompt: 'Ethereal mysterious celestial orchestral music with massive synth pad resonance and glass synthesizer glimmers',
        icon: '🔮',
        vibe: 'Mysterious Cinematic'
    },
    {
        id: 'industrial',
        name: 'Geothermal Drill',
        nameRu: 'Термальная Шахта',
        prompt: 'Heavy rhythmic industrial mechanical beats with deep mining hum, hydraulic clicks and electronic alarm synths',
        icon: '🌋',
        vibe: 'Rhythmic Mechanical'
    }
];

export const AiMusicRadio: React.FC<AiMusicRadioProps> = ({ onClose }) => {
    const language = useGameStore(state => state.language);
    const [aiState, setAiState] = useState<any>({
        status: 'idle',
        prompt: '',
        lyrics: '',
        error: '',
        length: 'clip'
    });
    
    const [customPrompt, setCustomPrompt] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('cyberpunk');
    const [trackLength, setTrackLength] = useState<'clip' | 'pro'>('clip');
    const [showPresets, setShowPresets] = useState(true);

    // Subscribe to AI Music changes from AudioService
    useEffect(() => {
        const unsubscribe = audioService.subscribeAiMusic((state) => {
            setAiState(state);
            if (state.prompt) {
                // If the state prompt matches one of our presets, set it, otherwise it's custom
                const matchedPreset = PRESETS.find(p => p.prompt === state.prompt);
                if (matchedPreset) {
                    setSelectedPreset(matchedPreset.id);
                } else {
                    setSelectedPreset('custom');
                    setCustomPrompt(state.prompt);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleGenerate = async (promptText: string) => {
        if (!promptText.trim()) return;
        audioService.play('UI_CLICK');
        await audioService.generateAiMusic(promptText, trackLength);
    };

    const togglePlayback = () => {
        audioService.play('UI_CLICK');
        if (aiState.status === 'playing') {
            audioService.pauseAiMusic();
        } else if (aiState.status === 'paused') {
            audioService.playAiMusic();
        }
    };

    const stopPlayback = () => {
        audioService.play('UI_CLICK');
        audioService.stopAiMusic();
        // Resume normal music if unmuted
        const isMusicMuted = useGameStore.getState().isMusicMuted;
        if (!isMusicMuted) {
            audioService.startMusic();
        }
    };

    const isGenerating = aiState.status === 'generating';
    const isPlaying = aiState.status === 'playing';
    const hasLoadedTrack = aiState.status === 'playing' || aiState.status === 'paused';

    return (
        <div id="ai-music-radio-container" className="flex flex-col h-full bg-slate-950 text-slate-100 rounded-2xl border border-indigo-500/20 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-indigo-500/10 bg-slate-900/60">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Music className={`w-5 h-5 text-indigo-400 ${isPlaying ? 'animate-spin' : ''}`} style={{ animationDuration: '6s' }} />
                        {isPlaying && (
                            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        )}
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-300">Nebula AI Radio</h3>
                        <span className="text-[9px] text-slate-400 font-mono">POWERED BY GOOGLE LYRIA</span>
                    </div>
                </div>
                {onClose && (
                    <button 
                        onClick={() => { audioService.play('UI_CLICK'); onClose(); }}
                        className="text-slate-400 hover:text-white text-xs font-black uppercase px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors"
                    >
                        {language === 'RU' ? 'Закрыть' : 'Close'}
                    </button>
                )}
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                
                {/* Generation Options */}
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            {language === 'RU' ? 'Выберите тему или стиль' : 'Select Theme or Vibe'}
                        </span>
                        
                        <div className="flex gap-1 bg-black/40 p-0.5 rounded-lg border border-slate-800">
                            <button
                                onClick={() => setTrackLength('clip')}
                                className={`px-2 py-0.5 text-[8.5px] font-bold rounded uppercase transition-all ${trackLength === 'clip' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {language === 'RU' ? 'Клип (30с)' : 'Clip (30s)'}
                            </button>
                            <button
                                onClick={() => setTrackLength('pro')}
                                className={`px-2 py-0.5 text-[8.5px] font-bold rounded uppercase transition-all ${trackLength === 'pro' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {language === 'RU' ? 'Трек (Полный)' : 'Track (Full)'}
                            </button>
                        </div>
                    </div>

                    {/* Presets List */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {PRESETS.map((p) => (
                            <button
                                key={p.id}
                                disabled={isGenerating}
                                onClick={() => {
                                    setSelectedPreset(p.id);
                                    handleGenerate(p.prompt);
                                }}
                                className={`flex items-center gap-2.5 p-2 rounded-xl text-left border transition-all ${
                                    selectedPreset === p.id && (isPlaying || isGenerating)
                                        ? 'bg-indigo-950/40 border-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                                        : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                }`}
                            >
                                <span className="text-lg">{p.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10.5px] font-bold truncate">
                                        {language === 'RU' ? p.nameRu : p.name}
                                    </div>
                                    <div className="text-[8px] font-mono text-indigo-400/80 uppercase tracking-wider">{p.vibe}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="relative flex items-center">
                        <div className="flex-grow border-t border-slate-800"></div>
                        <span className="flex-shrink mx-3 text-[8.5px] font-bold text-slate-500 uppercase tracking-widest">{language === 'RU' ? 'Или свой промпт' : 'Or Custom Prompt'}</span>
                        <div className="flex-grow border-t border-slate-800"></div>
                    </div>

                    {/* Custom prompt input */}
                    <div className="flex flex-col gap-1.5">
                        <textarea
                            disabled={isGenerating}
                            value={customPrompt}
                            onChange={(e) => setCustomPrompt(e.target.value)}
                            placeholder={language === 'RU' ? "Например: Мелодичный чиптьюн для пошаговой стратегии в космосе..." : "E.g. A rhythmic dark synthwave track with glitchy retro drums..."}
                            className="bg-black/40 border border-slate-800 rounded-lg p-2 text-[10.5px] font-sans h-16 resize-none focus:outline-none focus:border-indigo-500/50 text-slate-200"
                        />
                        <button
                            disabled={isGenerating || !customPrompt.trim()}
                            onClick={() => handleGenerate(customPrompt)}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-black text-[10px] uppercase tracking-widest py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/10"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            {language === 'RU' ? 'Сгенерировать по промпту' : 'Generate with Prompt'}
                        </button>
                    </div>
                </div>

                {/* Status Indicator & Live Player */}
                <div className="bg-slate-900/60 border border-indigo-500/10 rounded-xl p-3 flex flex-col gap-3 min-h-[90px] justify-center">
                    
                    {/* Idle state */}
                    {aiState.status === 'idle' && (
                        <div className="text-center py-2 flex flex-col items-center gap-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                {language === 'RU' ? 'Радиостанция пуста' : 'Radio Station Idle'}
                            </span>
                            <span className="text-[8.5px] text-slate-600 max-w-xs leading-normal">
                                {language === 'RU' ? 'Сгенерируйте ИИ-трек выше. Procedural FM-синтезатор сейчас играет в фоновом режиме.' : 'Generate an AI track above. Procedural FM Synth is currently playing in the background.'}
                            </span>
                        </div>
                    )}

                    {/* Generating loader */}
                    {isGenerating && (
                        <div className="flex flex-col items-center justify-center gap-2.5 py-3">
                            <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin" />
                            <div className="text-center">
                                <div className="text-[10.5px] font-black uppercase tracking-wider text-indigo-300">
                                    {language === 'RU' ? 'СИНТЕЗ КВАНТОВЫХ ВОЛН...' : 'SYNTHESIZING QUANTUM WAVES...'}
                                </div>
                                <div className="text-[8px] font-mono text-slate-500 uppercase mt-0.5 tracking-wider">
                                    {language === 'RU' ? 'Модели Lyria компилируют гармоники (около 15-20с)' : 'Lyria models compiling harmonics (takes ~15-20s)'}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Playing / Paused Player */}
                    {hasLoadedTrack && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0 pr-2">
                                    <span className="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                                        {isPlaying ? (language === 'RU' ? 'В ЭФИРЕ' : 'ON AIR') : (language === 'RU' ? 'ПАУЗА' : 'PAUSED')}
                                    </span>
                                    <div className="text-[10.5px] font-bold text-slate-200 mt-1.5 truncate">
                                        {aiState.prompt}
                                    </div>
                                    <div className="text-[8px] font-mono text-slate-500 uppercase mt-0.5 tracking-wider">
                                        {language === 'RU' ? `Режим: ${aiState.length === 'pro' ? 'Полный трек' : 'Короткий клип'}` : `Mode: ${aiState.length === 'pro' ? 'Full Track' : 'Short Clip'}`}
                                    </div>
                                </div>

                                <div className="flex gap-1.5 shrink-0">
                                    <button
                                        onClick={togglePlayback}
                                        className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${
                                            isPlaying 
                                                ? 'bg-amber-950/30 border-amber-500/50 text-amber-400 hover:bg-amber-950/50' 
                                                : 'bg-emerald-950/30 border-emerald-500/50 text-emerald-400 hover:bg-emerald-950/50 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
                                        }`}
                                    >
                                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                                    </button>
                                    <button
                                        onClick={stopPlayback}
                                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
                                        title={language === 'RU' ? "Сбросить ИИ и вернуть FM-Синт" : "Reset AI & return to FM Synth"}
                                    >
                                        <Square className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                </div>
                            </div>

                            {/* Decorative rhythmic audio equalizer when playing */}
                            {isPlaying && (
                                <div className="flex items-end justify-center gap-1.5 h-4 px-1 border-t border-slate-800/50 pt-2.5">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                                        <motion.div
                                            key={i}
                                            animate={{
                                                height: [
                                                    '20%', '80%', '40%', '100%', '60%', '20%'
                                                ]
                                            }}
                                            transition={{
                                                duration: 0.8 + (i * 0.15) % 0.7,
                                                repeat: Infinity,
                                                ease: 'easeInOut'
                                            }}
                                            className="w-1 bg-indigo-500 rounded-t"
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Error display */}
                    {aiState.status === 'error' && (
                        <div className="flex items-start gap-2.5 p-2 bg-red-950/30 border border-red-500/20 rounded-lg text-red-200">
                            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-wider">{language === 'RU' ? 'Ошибка генерации' : 'Generation Failed'}</div>
                                <div className="text-[9px] font-mono mt-0.5 text-red-300 leading-normal break-words">{aiState.error}</div>
                                <div className="text-[8.5px] mt-1 text-red-400">
                                    {language === 'RU' ? 'Убедитесь, что GEMINI_API_KEY добавлен в Настройках приложения.' : 'Ensure GEMINI_API_KEY is configured in your Settings.'}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Lyrics / Transcription overlay (If any exist) */}
                {aiState.lyrics && (
                    <div className="bg-slate-900/30 border border-slate-800 rounded-xl p-3">
                        <span className="text-[9px] font-bold text-indigo-400/80 uppercase tracking-widest block mb-1.5">
                            {language === 'RU' ? 'ГЕНЕРАТИВНЫЙ ТЕКСТ / СТИХИ' : 'GENERATIVE LYRICS / TEXT'}
                        </span>
                        <div className="text-[9.5px] font-sans text-slate-300 leading-relaxed max-h-32 overflow-y-auto whitespace-pre-wrap bg-black/20 p-2 rounded border border-slate-900">
                            {aiState.lyrics}
                        </div>
                    </div>
                )}

                {/* Explanation text */}
                <div className="flex items-start gap-2 p-2 bg-slate-900/20 border border-slate-900 rounded-xl text-slate-500 text-[8.5px] leading-normal">
                    <HelpCircle className="w-3.5 h-3.5 shrink-0 text-indigo-500/80 mt-0.5" />
                    <div>
                        {language === 'RU' ? (
                            <span>
                                <strong>Режим AI Radio</strong> временно заменяет наш встроенный пошаговый синтезатор FM. Генерация выполняется через нейросети Lyria. Вы можете в любой момент вернуться к интерактивному FM-Синту, просто остановив AI Radio кнопкой <strong>квадрата</strong>.
                            </span>
                        ) : (
                            <span>
                                <strong>AI Radio mode</strong> temporarily bypasses our interactive procedural FM Synthesizer. Generation is performed in real-time using Lyria AI. You can toggle back to procedural audio at any point by stopping the AI stream via the <strong>Stop (Square)</strong> button.
                            </span>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
