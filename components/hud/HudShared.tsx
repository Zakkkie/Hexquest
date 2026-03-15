
import React, { useEffect, useRef } from 'react';
import { Item, ActiveStatus, ItemRarity } from '../../types';
import { getItemDef } from '../../rules/items';
import { itemRenderer } from '../../services/itemRenderer';
import { Scan, Activity, Pickaxe, Hammer, EyeOff, Skull, Flame, WifiOff, Zap, AlertTriangle } from 'lucide-react';

// --- HELPERS ---

export const getRarityBorder = (rarity: ItemRarity) => {
    switch(rarity) {
        case 'COMMON': return 'border-slate-400';
        case 'UNCOMMON': return 'border-emerald-400';
        case 'RARE': return 'border-purple-500';
        case 'LEGENDARY': return 'border-amber-500 animate-pulse';
        default: return 'border-slate-600';
    }
};

export const resolveItemText = (item: Item, language: 'EN' | 'RU') => {
    const def = getItemDef(item.baseId);
    if (!def) return { 
        name: item.name, 
        description: item.description, 
        effectDesc: item.effectDescription, 
        negDesc: item.negativeEffectLabel
    };
    return {
        name: def.name[language],
        description: def.description[language],
        effectDesc: def.effectLabel[language],
        negDesc: def.negativeEffectLabel[language]
    };
};

// --- COMPONENTS ---

export const StorageBlocks: React.FC<{ current: number, max: number }> = ({ current, max }) => {
    return (
        <div className="flex items-center gap-0.5 md:gap-1">
            {Array.from({ length: Math.max(current, max) }).map((_, i) => {
                const isFilled = i < current;
                const isOverflow = i >= max;
                return (
                    <div 
                        key={i} 
                        className={`
                            w-1.5 h-3 md:w-2.5 md:h-4 rounded-[1px] md:rounded-sm transition-all duration-300
                            ${isOverflow 
                                ? 'bg-amber-500 shadow-[0_0_4px_#f59e0b]' 
                                : isFilled 
                                    ? 'bg-emerald-400 shadow-[0_0_4px_#34d399]' 
                                    : 'bg-emerald-900/30 border border-emerald-500/30'
                            }
                        `}
                    />
                );
            })}
        </div>
    );
};

export const ItemIcon: React.FC<{ item?: Item, def?: any, size?: string, opacity?: number, grayscale?: boolean }> = ({ item, def, size = "w-10 h-10 md:w-10 md:h-10", opacity = 1, grayscale = false }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const target = item || def;
        if (!target) return;

        let visualColor = '#94a3b8'; // Default Slate

        const definition = def || (item ? getItemDef(item.baseId) : null);

        if (definition?.visualColor) {
            visualColor = definition.visualColor;
        } else {
            const rarity = target.rarity || 'COMMON';
            if (rarity === 'COMMON') visualColor = '#cbd5e1';
            if (rarity === 'UNCOMMON') visualColor = '#4ade80';
            if (rarity === 'RARE') visualColor = '#c084fc';
            if (rarity === 'LEGENDARY') visualColor = '#fbbf24';
        }

        const itemId = target.baseId || target.idPrefix;
        const img = itemRenderer.getItemImage(target.visualType, visualColor, target.rarity || 'COMMON', definition?.iconUrl, itemId);
        
        const draw = () => {
            ctx.clearRect(0,0,64,64);
            ctx.globalAlpha = opacity;
            if (grayscale) ctx.filter = 'grayscale(100%) brightness(0.7)';
            ctx.drawImage(img, 0,0,64,64);
            ctx.filter = 'none';
            ctx.globalAlpha = 1.0;
        };

        if (img instanceof HTMLImageElement && !img.complete) {
            img.addEventListener('load', draw);
            const handleError = () => {
                console.warn('Failed to load image, falling back to procedural:', img.src);
                const fallbackImg = itemRenderer.getItemImage(target.visualType, visualColor, target.rarity || 'COMMON', undefined, itemId);
                ctx.clearRect(0,0,64,64);
                ctx.globalAlpha = opacity;
                if (grayscale) ctx.filter = 'grayscale(100%) brightness(0.7)';
                ctx.drawImage(fallbackImg, 0,0,64,64);
                ctx.filter = 'none';
                ctx.globalAlpha = 1.0;
            };
            img.addEventListener('error', handleError);
            return () => {
                img.removeEventListener('load', draw);
                img.removeEventListener('error', handleError);
            };
        } else {
            draw();
        }

    }, [item, def, opacity, grayscale]);

    return <canvas ref={canvasRef} width={64} height={64} className={`${size} object-contain`} />;
};

export const StatusIcon: React.FC<{ status: ActiveStatus }> = ({ status }) => {
    const now = Date.now();
    const remaining = status.expiresAt ? Math.max(0, status.expiresAt - now) : Infinity;
    const isPermanent = !status.expiresAt || status.expiresAt > now + 80000000; 
    const isNegative = status.type.includes('STATUS_FATIGUE') || status.type.includes('CURSE') || status.type.includes('RISK') || status.type.includes('VISION') || status.type.includes('OFFLINE') || status.type.includes('SOIL_EATER');
    
    const getIcon = () => {
        const iconSize = "w-5 h-5"; 
        if (status.type.includes('SCANNER')) return <Scan className={iconSize} />;
        if (status.type.includes('FATIGUE')) return <Activity className={iconSize} />;
        if (status.type.includes('GOLD_RUSH')) return <Pickaxe className={iconSize} />;
        if (status.type.includes('FREE_BUILD')) return <Hammer className={iconSize} />;
        if (status.type.includes('TUNNEL')) return <EyeOff className={iconSize} />;
        if (status.type.includes('CURSE')) return <Skull className={iconSize} />;
        if (status.type.includes('RISK')) return <Flame className={iconSize} />;
        if (status.type.includes('OFFLINE')) return <WifiOff className={iconSize} />;
        if (status.type.includes('ENTROPY_INVERSION')) return <Zap className={iconSize} />;
        return <AlertTriangle className={iconSize} />;
    };

    const colorClass = isNegative ? 'text-red-400 border-red-500/50 bg-red-950/80' : 'text-emerald-400 border-emerald-500/50 bg-emerald-950/80';
    const glowClass = isNegative ? 'shadow-[0_0_10px_rgba(239,68,68,0.3)]' : 'shadow-[0_0_10px_rgba(52,211,153,0.3)]';

    return (
        <div className={`
            relative group flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-full border backdrop-blur-md transition-all hover:scale-110 cursor-help
            ${colorClass} ${glowClass} animate-pulse-slow
        `}>
            {getIcon()}
            {!isPermanent && status.expiresAt && (
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="100" strokeDashoffset={100 - (remaining / (status.type.includes('GOLD') || status.type.includes('FREE') || status.type.includes('DRILL') || status.type.includes('MIDAS') ? 300000 : 30000)) * 100} className="opacity-50" />
                </svg>
            )}
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 w-48 bg-slate-900/95 border border-slate-700 p-3 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 flex flex-col gap-1">
                <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-slate-700 pb-1 mb-1">{status.label}</div>
                <div className="text-[10px] text-slate-400 leading-tight mb-2">{status.description || status.label}</div>
                <div className={`text-[10px] font-mono font-bold text-right ${isNegative ? 'text-red-400' : 'text-emerald-400'}`}>
                    {isPermanent ? 'ACTIVE' : `${Math.ceil(remaining / 1000)}s LEFT`}
                </div>
            </div>
        </div>
    );
};
