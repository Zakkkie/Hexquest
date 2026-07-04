import React, { useState } from 'react';
import { Bot, X, Send, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OracleDialog: React.FC<{
    isOpen: boolean;
    onClose: () => void;
}> = ({ isOpen, onClose }) => {
    const [query, setQuery] = useState('');
    const [response, setResponse] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!query.trim() || loading) return;
        setLoading(true);
        setResponse(null);
        try {
            const res = await fetch('/api/oracle', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: query })
            });
            const data = await res.json();
            if (res.ok) {
                setResponse(data.text);
            } else {
                setResponse(`ERROR: ${data.error}`);
            }
        } catch (e: any) {
            setResponse(`FAILED TO CONNECT TO NEXUS: ${e.message}`);
        }
        setLoading(false);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 z-[150] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
                >
                    <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="w-full max-w-xl bg-gray-900 border-2 border-[#ff3366]/30 shadow-[0_0_50px_rgba(255,51,102,0.15)] rounded-lg overflow-hidden flex flex-col"
                    >
                        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-black/40">
                            <div className="flex items-center gap-3">
                                <Bot className="w-5 h-5 text-[#ff3366]" />
                                <h3 className="font-mono text-white text-lg tracking-wider">NEXUS ORACLE (THINKING MODE)</h3>
                            </div>
                            <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="p-6 flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
                            <p className="font-mono text-sm text-gray-400 leading-relaxed">
                                Welcome, Vector. The Oracle of Nebula uses deep heuristic simulation (ThinkingMode.HIGH) to answer your most complex queries regarding thermodynamics, structural stability, and strategic logic.
                            </p>

                            <div className="flex flex-col gap-2">
                                <label className="text-xs font-mono text-[#ff3366] uppercase tracking-wider">Query Input</label>
                                <div className="flex gap-2">
                                    <input 
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                        placeholder="e.g. How do I survive an Entropy Shift?"
                                        className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#ff3366]/50 transition-colors"
                                    />
                                    <button 
                                        onClick={handleSubmit}
                                        disabled={loading || !query.trim()}
                                        className="px-4 py-2 bg-[#ff3366]/20 text-[#ff3366] border border-[#ff3366]/30 hover:bg-[#ff3366]/30 rounded font-mono text-sm font-bold tracking-widest disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {loading && (
                                <div className="mt-4 p-4 border border-[#00f0ff]/20 bg-[#00f0ff]/5 rounded font-mono text-sm text-[#00f0ff] animate-pulse">
                                    Processing highly complex neural simulation...
                                </div>
                            )}

                            {response && !loading && (
                                <div className="mt-4 p-4 border border-white/10 bg-black/30 rounded font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    <span className="text-white font-bold mb-2 block">&gt; ORACLE RESPONSE:</span>
                                    {response}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
