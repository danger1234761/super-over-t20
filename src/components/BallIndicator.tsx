import React from 'react';

interface BallIndicatorProps {
  result?: string;
  isLatest?: boolean;
  size?: 'sm' | 'md' | 'lg';
  ballNumber?: number;
}

export const BallIndicator: React.FC<BallIndicatorProps> = ({
  result,
  isLatest = false,
  size = 'md',
  ballNumber,
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs',
    md: 'w-8 h-8 sm:w-9 sm:h-9 text-xs sm:text-sm',
    lg: 'w-10 h-10 text-sm sm:text-base',
  }[size];

  if (!result) {
    return (
      <div
        className={`${sizeClasses} rounded-full border border-dashed border-slate-700/70 bg-slate-900/60 flex items-center justify-center text-slate-500 font-mono-sport text-[11px]`}
        title={ballNumber ? `Ball ${ballNumber} (Pending)` : 'Pending'}
      >
        {ballNumber || '·'}
      </div>
    );
  }

  const isWicket = result === 'W';
  const isSix = result === '6';
  const isFour = result === '4';
  const isDot = result === '0';

  let styleClasses = 'bg-slate-800 text-slate-100 border border-slate-700 shadow-sm';

  if (isWicket) {
    styleClasses = 'bg-gradient-to-br from-rose-500 to-red-600 text-white font-black border border-rose-400 shadow-md shadow-rose-950/40 ring-1 ring-rose-400/50';
  } else if (isSix) {
    styleClasses = 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-black border border-emerald-400 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/50';
  } else if (isFour) {
    styleClasses = 'bg-gradient-to-br from-sky-500 to-blue-600 text-white font-black border border-sky-400 shadow-md shadow-blue-950/40 ring-1 ring-sky-400/50';
  } else if (isDot) {
    styleClasses = 'bg-[#0b121c] text-slate-400 border border-slate-800/80 font-bold';
  } else {
    // 1, 2, 3
    styleClasses = 'bg-gradient-to-b from-slate-700 to-slate-800 text-amber-300 font-extrabold border border-slate-600/70 shadow-sm';
  }

  return (
    <div
      className={`
        ${sizeClasses}
        ${styleClasses}
        rounded-full flex items-center justify-center font-mono-sport select-none
        transition-transform duration-200
        ${isLatest ? 'scale-105 ring-2 ring-amber-400 shadow-md' : 'hover:scale-105'}
      `}
      title={isWicket ? 'Wicket!' : `${result} Runs`}
    >
      {result}
    </div>
  );
};

interface BallStripProps {
  balls: Array<{ result: string }>;
  totalBalls?: number;
  size?: 'sm' | 'md' | 'lg';
}

export const BallStrip: React.FC<BallStripProps> = ({ balls, totalBalls = 6, size = 'md' }) => {
  const displaySlots = Array.from({ length: totalBalls });

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {displaySlots.map((_, idx) => {
        const ball = balls[idx];
        const isLatest = idx === balls.length - 1 && balls.length > 0;
        return (
          <BallIndicator
            key={idx}
            result={ball?.result}
            isLatest={isLatest}
            size={size}
            ballNumber={idx + 1}
          />
        );
      })}
    </div>
  );
};
