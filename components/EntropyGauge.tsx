
import React from 'react';
import { useGameStore } from '../store.ts';

interface EntropyGaugeProps {
    className?: string;
    showLabel?: boolean;
}

const EntropyGauge: React.FC<EntropyGaugeProps> = ({ className = "w-12 h-12", showLabel = false }) => {
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
    <div className={`relative flex items-center justify-center ${className}`}>
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 44 44">
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
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className={`font-mono font-black leading-none ${percentage < 20 ? 'text-red-500 animate-pulse' : 'text-slate-200'} ${parseInt(className) < 10 ? 'text-[8px]' : 'text-[10px]'}`}>
                {current.toFixed(0)}
            </span>
        </div>
        
        {/* Max Capacity Indicator (Visual hint that container is shrinking) */}
        {showLabel && max < 100 && (
            <div className="absolute -bottom-3 text-[8px] text-slate-600 font-mono whitespace-nowrap">
                CAP:{max}
            </div>
        )}
    </div>
  );
};

export default EntropyGauge;
