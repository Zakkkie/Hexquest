import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGameStore } from '../store.ts';
import { textureService } from '../services/textureService.ts';
import { audioService } from '../services/audioService.ts';
import { 
    Cpu, 
    Layers, 
    Radio, 
    Box, 
    Activity, 
    Zap,
    ShieldAlert,
    Wifi
} from 'lucide-react';
import { TEXT } from '../services/i18n.ts';

const CampaignLoading: React.FC = () => {
    const session = useGameStore(state => state.session);
    const loadingLevelId = useGameStore(state => state.loadingLevelId);
    const language = useGameStore(state => state.language);
    const setUIState = useGameStore(state => state.setUIState);
    
    const [progress, setProgress] = useState(0);
    const [phase, setPhase] = useState<'AUTH' | 'TEXTURES' | 'AUDIO' | 'WORLD' | 'DONE'>('AUTH');
    const [statusMsg, setStatusMsg] = useState('DIVERGING_LINK // INITIALIZING');
    const [techData, setTechData] = useState<string[]>([]);
    const loadingStarted = useRef(false);

    // Tech Feed Simulation
    useEffect(() => {
        const lines = [
            'CORE_NET: OK',
            'SENSORY_BUFFER: 0x482',
            'NEBULA_V2: READY',
            'TEXTURE_STACK: QUEUED',
            'MAP_GENERATOR: WORKER_ACTIVE',
            'PARALLAX_BIT: 1',
            'QUANTUM_LOCK: STABLE'
        ];
        
        let i = 0;
        const interval = setInterval(() => {
            setTechData(prev => [lines[i % lines.length], ...prev].slice(0, 8));
            i++;
        }, 1200);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        // Only run preloading ONCE per mount (important for React 18 StrictMode)
        if (loadingStarted.current) return;
        loadingStarted.current = true;

        const runPreload = async () => {
            // PHASE 1: AUTH & SYSTEM (Fast)
            setPhase('AUTH');
            setStatusMsg('VERIFYING_IDENTITY // [HEX-ID]');
            await new Promise(r => setTimeout(r, 600));

            // PHASE 2: AUDIO SYNTH
            setPhase('AUDIO');
            setStatusMsg('SYNTHESIZING_NEBULA_AUDIO_STACK...');
            await audioService.preload();
            await new Promise(r => setTimeout(r, 400));

            // PHASE 3: TEXTURES (The long part)
            setPhase('TEXTURES');
            setStatusMsg('GENERATING_GEOMETRY_MAPS...');
            
            await textureService.preload((p) => {
                // p is 0 to 1
                setProgress(p * 100);
            });

            // PHASE 4: WORLD GENERATION
            setPhase('WORLD');
            setStatusMsg('STABILIZING_WORLD_COORDINATES...');
            
            // Wait for session to be fully created in the background if it's not ready yet
            const checkSessionReady = async () => {
                return new Promise<void>((resolve) => {
                    const check = () => {
                        const currentSession = useGameStore.getState().session;
                        const currentIsLoading = useGameStore.getState().isCampaignLoading;
                        
                        if (currentSession && !currentIsLoading) {
                            resolve();
                        } else if (!currentIsLoading && !currentSession) {
                            // If loading ceased but no session was created (error state), exit gracefully
                            resolve();
                        } else {
                            setTimeout(check, 100);
                        }
                    };
                    check();
                });
            };

            await checkSessionReady();
            
            // DONE
            setPhase('DONE');
            setProgress(100);
            setStatusMsg('LINK_STABLE // ENTERING_HEX');
            
            await new Promise(r => setTimeout(r, 800));
            setUIState('GAME');
        };

        runPreload();
    }, [setUIState]);

    const getPhaseIcon = () => {
        switch(phase) {
            case 'AUTH': return <ShieldAlert className="w-6 h-6 text-indigo-400" />;
            case 'AUDIO': return <Radio className="w-6 h-6 text-cyan-400" />;
            case 'TEXTURES': return <Layers className="w-6 h-6 text-amber-400" />;
            case 'WORLD': return <Box className="w-6 h-6 text-emerald-400" />;
            default: return <Cpu className="w-6 h-6 text-white" />;
        }
    };

    const levelConfig = session?.activeLevelConfig;
    let displayTitle = '';
    if (levelConfig) {
        const levelKey = levelConfig.id.replace('.', '_');
        const titleKey = `LEVEL_${levelKey}_TITLE` as keyof typeof TEXT.EN.CAMPAIGN;
        displayTitle = TEXT[language].CAMPAIGN[titleKey] || levelConfig.title;
    } else if (session?.winCondition?.label) {
        displayTitle = session.winCondition.label;
    } else if (loadingLevelId) {
        displayTitle = `SECTOR_${loadingLevelId}`;
    } else {
        displayTitle = language === 'RU' ? 'БЫСТРЫЙ БОЙ' : 'QUICK SKIRMISH';
    }

    return (
        <div className="fixed inset-0 bg-[#020617] flex items-center justify-center font-mono overflow-hidden select-none z-[100]">
            {/* Background Atmosphere */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent shadow-[0_0_20px_rgba(6,182,212,0.1)]" />
            
            <div className="relative w-full max-w-xl px-12 z-10">
                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-cyan-500/20 blur-lg rounded-full animate-pulse" />
                            {getPhaseIcon()}
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-400 tracking-[0.3em] uppercase">
                                System_Init
                            </h2>
                            <div className="text-[10px] text-cyan-500/60 font-medium">
                                PROTOCOL: HEX_QUEST [v2.0]
                            </div>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-[10px] text-slate-500 uppercase tracking-widest leading-none mb-1">
                            Sector
                        </div>
                        <div className="text-xs font-bold text-slate-300">
                            {levelConfig?.id || loadingLevelId || (session?.winCondition ? 'SKIRMISH' : 'ALPHA-01')}
                        </div>
                    </div>
                </div>

                {/* Level Title */}
                <div className="mb-12 h-16 flex flex-col justify-center">
                    <AnimatePresence mode="wait">
                        {displayTitle && (
                            <motion.div
                                key={displayTitle}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-1"
                            >
                                <div className="text-[10px] text-cyan-500/40 uppercase tracking-[0.5em]">Target_Node</div>
                                <div className="text-3xl font-black text-white italic tracking-tighter uppercase">{displayTitle}</div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Progress Visual */}
                <div className="relative space-y-4 mb-12">
                    <div className="h-1 w-full bg-slate-900 overflow-hidden relative border border-slate-800/50">
                        <motion.div 
                            className="absolute inset-y-0 left-0 bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)]"
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ type: "spring", bounce: 0, duration: 1 }}
                        />
                    </div>
                    
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={statusMsg}
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="text-[11px] font-black text-cyan-400 tracking-tighter uppercase"
                                >
                                    {statusMsg}
                                </motion.div>
                            </AnimatePresence>
                            <div className="text-[9px] text-slate-500 tracking-widest uppercase">
                                Module: {phase}_{Math.floor(progress)}%
                            </div>
                        </div>
                        <div className="text-3xl font-black text-slate-700/50 tracking-tighter tabular-nums selection:bg-transparent">
                            {Math.floor(progress)}
                        </div>
                    </div>
                </div>

                {/* Lower Technical Grid */}
                <div className="grid grid-cols-2 gap-8 border-t border-slate-900 pt-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            <Activity className="w-3 h-3 text-emerald-500" />
                            Live_Feed
                        </div>
                        <div className="space-y-1 overflow-hidden h-24">
                            {techData.map((line, idx) => (
                                <motion.div 
                                    key={`${line}-${idx}`}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1 - (idx * 0.12), x: 0 }}
                                    className="text-[9px] text-cyan-500/70 font-mono flex gap-2"
                                >
                                    <span className="opacity-30">[{8-idx}]</span>
                                    <span>{line}</span>
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                            <Zap className="w-3 h-3 text-amber-500" />
                            Hard_State
                        </div>
                        <div className="space-y-2">
                            {[
                                { lab: 'BUFFER', val: '0x33A' },
                                { lab: 'PARITY', val: 'NOMINAL' },
                                { lab: 'V_SYNC', val: 'LOCK' },
                                { lab: 'CACHE', val: 'WRITING' }
                            ].map((item, i) => (
                                <div key={i} className="flex justify-between items-center text-[9px] font-mono">
                                    <span className="text-slate-600 uppercase tracking-tighter">{item.lab}:</span>
                                    <span className="text-slate-400 font-bold">{item.val}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Decor */}
                <div className="mt-12 flex justify-between items-center text-[8px] text-slate-700 font-black tracking-[0.4em] uppercase opacity-40">
                    <div className="flex gap-4">
                        <span className="flex items-center gap-1"><Wifi className="w-2 h-2" /> Signal_Strong</span>
                        <span>Auth_Token_OK</span>
                    </div>
                    <div>Sector_0x11</div>
                </div>
            </div>

            {/* Scanning Line Effect */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-10">
                <div className="w-full h-1 bg-cyan-500 animate-scanline shadow-[0_0_20px_cyan]" />
            </div>
            
            {/* Corner Markers */}
            <div className="absolute top-8 left-8 w-8 h-8 border-t-2 border-l-2 border-slate-800" />
            <div className="absolute top-8 right-8 w-8 h-8 border-t-2 border-r-2 border-slate-800" />
            <div className="absolute bottom-8 left-8 w-8 h-8 border-b-2 border-l-2 border-slate-800" />
            <div className="absolute bottom-8 right-8 w-8 h-8 border-b-2 border-r-2 border-slate-800" />
        </div>
    );
};

export default CampaignLoading;
