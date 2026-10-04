import React from 'react';
import { Lock, Play, Check, Pause } from 'lucide-react';
import { GameStatus } from '../types';

interface CountdownTimerProps {
  seconds: number;
  totalSeconds?: number;
  status: GameStatus;
  size?: 'sm' | 'md' | 'lg';
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  seconds,
  totalSeconds = 45,
  status,
  size = 'md',
}) => {
  const isLocked = status === 'LOCKED';
  const isLive = status === 'INNINGS_1' || status === 'INNINGS_2';
  const isBreak = status === 'INNINGS_BREAK';
  const isCompleted = status === 'COMPLETED';

  const safeTotal = Math.max(1, totalSeconds);
  const safeSeconds = Math.max(0, seconds);
  const isUrgent = safeSeconds <= 5 && status === 'OPEN';

  // SVG Circle Geometry
  const radius = size === 'sm' ? 14 : size === 'lg' ? 22 : 17;
  const strokeWidth = size === 'sm' ? 2.5 : size === 'lg' ? 3.5 : 3;
  const boxSize = (radius + strokeWidth) * 2 + 4;
  const center = boxSize / 2;
  const circumference = 2 * Math.PI * radius;

  // Fraction left
  const fraction = Math.min(1, Math.max(0, safeSeconds / safeTotal));
  const strokeDashoffset = circumference * (1 - fraction);

  if (isCompleted) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#0d141e] border border-slate-800 px-3 py-1.5 rounded-full shadow-sm">
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
          <Check className="w-3.5 h-3.5 stroke-[3]" />
        </div>
        <div className="font-mono-sport text-xs font-bold text-emerald-400 uppercase tracking-wider">
          FINAL
        </div>
      </div>
    );
  }

  if (isBreak) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#0d141e] border border-amber-500/30 px-3 py-1.5 rounded-full shadow-sm">
        <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 animate-pulse">
          <Pause className="w-3.5 h-3.5 fill-amber-400" />
        </div>
        <div className="font-mono-sport text-xs font-extrabold text-amber-300 uppercase tracking-wider">
          INNINGS BREAK
        </div>
      </div>
    );
  }

  if (isLive) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#0d141e] border border-rose-500/40 px-3 py-1.5 rounded-full shadow-sm">
        <div className="relative w-7 h-7 rounded-full bg-rose-500/20 border border-rose-500/60 flex items-center justify-center text-rose-400">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping absolute"></span>
          <Play className="w-3 h-3 fill-rose-400 relative z-10 ml-0.5" />
        </div>
        <div className="font-mono-sport text-xs font-extrabold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
          <span>LIVE OVER</span>
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="inline-flex items-center gap-2 bg-[#0d141e] border border-slate-700 px-3 py-1.5 rounded-full shadow-sm">
        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
          <Lock className="w-3.5 h-3.5" />
        </div>
        <div className="font-mono-sport text-xs font-bold text-slate-400 uppercase tracking-wider">
          BETTING LOCKED
        </div>
      </div>
    );
  }

  // Active Circular Timer Ring for OPEN status
  const ringColor = isUrgent ? '#f43f5e' : '#f5a623';
  const trackColor = '#182436';

  return (
    <div className="inline-flex items-center gap-2.5 bg-[#0b121c] border border-slate-700/80 px-3 py-1 rounded-full shadow-md">
      {/* Circular Timer SVG Ring */}
      <div className="relative flex items-center justify-center flex-shrink-0">
        <svg
          width={boxSize}
          height={boxSize}
          viewBox={`0 0 ${boxSize} ${boxSize}`}
          className="transform -rotate-90 select-none"
        >
          {/* Background Track Circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={trackColor}
            strokeWidth={strokeWidth}
          />
          {/* Animated Countdown Progress Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="transparent"
            stroke={ringColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-300 ease-linear"
          />
        </svg>

        {/* Center Countdown Number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={`font-mono-sport font-black text-xs tabular-nums select-none ${
              isUrgent ? 'text-rose-400 animate-pulse' : 'text-white'
            }`}
          >
            {safeSeconds}
          </span>
        </div>
      </div>

      {/* Timer Text Information */}
      <div className="flex flex-col pr-1">
        <span
          className={`text-[9px] font-sans font-bold uppercase tracking-wider leading-none ${
            isUrgent ? 'text-rose-400' : 'text-slate-400'
          }`}
        >
          {isUrgent ? 'CLOSING' : 'LOCKS IN'}
        </span>
        <span className="font-mono-sport text-xs font-extrabold text-[#f5a623] leading-tight">
          00:{String(safeSeconds).padStart(2, '0')}s
        </span>
      </div>
    </div>
  );
};
