
import React from 'react';
import { useGameStore } from '../store.ts';

const EntropyGauge: React.FC = () => {
  const entropy = useGameStore(state => state.session?.entropy);
  
  if (!entropy) return null;

  const { current, max } = entropy;
  // Calculate percentage relative to current max capacity
  const percentage = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  
  // Color logic: Blue (Stable) -> Amber (Unstable) -> Red (Critical)
  const getColor = (pct: number) => {
      if (pct > 60) return '#3b82f6'; // Blue-500
      if (pct > 30) return '#f59e0b'; // Amber-500
      return '#ef4444'; // Red-500
  };

  const color = getColor(percentage);
  
  // SVG Config
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-12 h-12 md:w-14 md:h-14 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform">
            {/* Background Track */}
            <circle
                cx="50%" cy="50%" r={radius}
                fill="transparent"
                stroke="#1e293b"
                strokeWidth="4"
            />
            {/* Value Indicator */}
            <circle
                cx="50%" cy="50%" r={radius}
                fill="transparent"
                stroke={color}
                strokeWidth="4"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-300 ease-out"
            />
        </svg>
        
        {/* Digital Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-[10px] md:text-xs font-mono font-black leading-none ${percentage < 20 ? 'text-red-500 animate-pulse' : 'text-slate-200'}`}>
                {current.toFixed(0)}
            </span>
        </div>
        
        {/* Max Capacity Indicator (Visual hint that container is shrinking) */}
        {max < 100 && (
            <div className="absolute -bottom-2 text-[8px] text-slate-600 font-mono">
                CAP:{max}
            </div>
        )}
    </div>
  );
};

export default EntropyGauge;
