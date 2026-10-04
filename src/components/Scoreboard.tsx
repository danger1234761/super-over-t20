import React from 'react';
import { Game } from '../types';
import { BallStrip } from './BallIndicator';
import { CountdownTimer } from './CountdownTimer';
import { TeamFlag } from './TeamFlag';
import { useWebSocket } from '../context/WebSocketContext';
import { Trophy, Flame, ShieldCheck } from 'lucide-react';

interface ScoreboardProps {
  game: Game;
  onSelectTeamForBet?: (teamName: string, type: 'BACK' | 'LAY', odds: number) => void;
}

const TEAM_CONFIG: Record<string, { code: string; color: string; bg: string }> = {
  'India': { code: 'IND', color: '#38bdf8', bg: 'bg-sky-600' },
  'Pakistan': { code: 'PAK', color: '#34d399', bg: 'bg-emerald-700' },
  'Australia': { code: 'AUS', color: '#fbbf24', bg: 'bg-amber-500' },
  'England': { code: 'ENG', color: '#f87171', bg: 'bg-red-600' },
  'South Africa': { code: 'SA', color: '#10b981', bg: 'bg-emerald-600' },
  'New Zealand': { code: 'NZ', color: '#cbd5e1', bg: 'bg-slate-700' },
  'West Indies': { code: 'WI', color: '#fb7185', bg: 'bg-rose-800' },
  'Sri Lanka': { code: 'SL', color: '#60a5fa', bg: 'bg-blue-700' },
  'Afghanistan': { code: 'AFG', color: '#22d3ee', bg: 'bg-cyan-700' },
  'Bangladesh': { code: 'BAN', color: '#2dd4bf', bg: 'bg-teal-700' },
  'Zimbabwe': { code: 'ZIM', color: '#f87171', bg: 'bg-red-700' },
  'Netherlands': { code: 'NED', color: '#fb923c', bg: 'bg-orange-600' },
};

export const Scoreboard: React.FC<ScoreboardProps> = ({ game }) => {
  const { onlineCount } = useWebSocket();

  const teamABalls = game.balls.filter((b) => b.innings === 1);
  const teamBBalls = game.balls.filter((b) => b.innings === 2);

  const isCompleted = game.status === 'COMPLETED';
  const isInnings1 = game.status === 'INNINGS_1';
  const isInnings2 = game.status === 'INNINGS_2';
  const isInningsBreak = game.status === 'INNINGS_BREAK';

  const cfgA = TEAM_CONFIG[game.team_a] || { code: game.team_a.substring(0, 3).toUpperCase(), color: '#38bdf8', bg: 'bg-sky-600' };
  const cfgB = TEAM_CONFIG[game.team_b] || { code: game.team_b.substring(0, 3).toUpperCase(), color: '#fbbf24', bg: 'bg-amber-600' };

  // Overs calculation
  const oversA = `0.${teamABalls.length}`;
  const oversB = `0.${teamBBalls.length}`;

  const ballsLeft = Math.max(0, 6 - teamBBalls.length);
  const target = game.target_score || game.team_a_score + 1;
  const runsNeeded = Math.max(0, target - game.team_b_score);

  return (
    <div className="relative rounded-2xl overflow-hidden card-surface border border-slate-700/60 shadow-2xl">
      {/* Top Stadium Accent Glow Line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-[#f5a623] to-transparent opacity-80"></div>

      {/* Top Match Bar */}
      <div className="bg-[#0e1626]/90 px-4 py-3 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 relative">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isCompleted ? 'bg-slate-400' : 'bg-emerald-400'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isCompleted ? 'bg-slate-500' : 'bg-emerald-400'
              }`}
            ></span>
          </span>
          <span className="text-xs font-mono-sport text-white font-bold tracking-wider">
            {game.game_code}
          </span>
          <span className="text-slate-600">·</span>
          <span className="text-xs font-sans text-slate-300 font-semibold tracking-wide">
            Super Over T20
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Online Indicator - Placed "timer k samne" (in front of timer) */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black text-emerald-400 font-mono-sport tracking-wider">
              {onlineCount} ONLINE
            </span>
          </div>

          {/* Server Authoritative Timer / Status */}
          <CountdownTimer
            seconds={game.remaining_seconds}
            totalSeconds={game.countdown_seconds}
            status={game.status}
          />
        </div>
      </div>

      {/* Main Stadium Scoreboard Card */}
      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-800/80">
        {/* TEAM A */}
        <div
          className={`space-y-3.5 pt-2 md:pt-0 transition-all ${
            isInnings1
              ? 'bg-gradient-to-br from-sky-950/40 via-sky-900/15 to-transparent p-4 rounded-xl border border-sky-500/40 shadow-md'
              : 'p-1'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TeamFlag team={game.team_a} size="lg" shape="rounded" className="shadow-md" />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{game.team_a}</span>
                  {isInnings1 && (
                    <span className="text-[10px] font-sans font-extrabold px-2 py-0.5 bg-sky-500/25 text-sky-200 border border-sky-400/50 rounded-full flex items-center gap-1 shadow-sm">
                      <Flame className="w-3 h-3 text-sky-400 animate-pulse" /> BATTING
                    </span>
                  )}
                </h2>
                <div className="text-[11px] text-slate-400 font-mono-sport font-medium">
                  1st Innings
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-mono-sport font-black text-[#fbbf24] tabular-nums drop-shadow-[0_2px_8px_rgba(245,166,35,0.2)]">
                {game.team_a_score}
                <span className="text-slate-400 text-lg font-bold">/{game.team_a_wickets}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono-sport">
                {oversA} / 1.0 ov
              </div>
            </div>
          </div>

          {/* Team A Deliveries */}
          <div className="pt-1">
            <div className="text-[11px] text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Super Over Deliveries</span>
              <span className="text-slate-400 font-mono-sport text-[10px]">
                {teamABalls.length}/6 Balls
              </span>
            </div>
            <BallStrip balls={teamABalls} totalBalls={6} size="md" />
          </div>
        </div>

        {/* TEAM B */}
        <div
          className={`space-y-3.5 pt-4 md:pt-0 md:pl-6 transition-all ${
            isInnings2
              ? 'bg-gradient-to-br from-amber-950/40 via-amber-900/15 to-transparent p-4 rounded-xl border border-amber-500/40 shadow-md'
              : 'p-1'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TeamFlag team={game.team_b} size="lg" shape="rounded" className="shadow-md" />
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{game.team_b}</span>
                  {isInnings2 && (
                    <span className="text-[10px] font-sans font-extrabold px-2 py-0.5 bg-amber-500/25 text-amber-200 border border-amber-400/50 rounded-full flex items-center gap-1 shadow-sm">
                      <Flame className="w-3 h-3 text-amber-400 animate-pulse" /> BATTING
                    </span>
                  )}
                </h2>
                <div className="text-[11px] text-slate-400 font-mono-sport font-medium">
                  2nd Innings (Chase)
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-2xl sm:text-3xl font-mono-sport font-black text-[#fbbf24] tabular-nums drop-shadow-[0_2px_8px_rgba(245,166,35,0.2)]">
                {game.team_b_score}
                <span className="text-slate-400 text-lg font-bold">/{game.team_b_wickets}</span>
              </div>
              <div className="text-[11px] text-slate-400 font-mono-sport">
                {oversB} / 1.0 ov
              </div>
            </div>
          </div>

          {/* Team B Deliveries */}
          <div className="pt-1">
            <div className="text-[11px] text-slate-300 font-medium mb-1.5 flex items-center justify-between">
              <span>Super Over Deliveries</span>
              <span className="text-slate-400 font-mono-sport text-[10px]">
                {teamBBalls.length}/6 Balls
              </span>
            </div>
            <BallStrip balls={teamBBalls} totalBalls={6} size="md" />
          </div>
        </div>
      </div>

      {/* Target & Match Status Bottom Ticker */}
      <div className="bg-[#0b101a] px-4 py-3 border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3">
        {isCompleted ? (
          <div className="flex flex-wrap items-center gap-2.5 text-amber-300 font-bold text-sm sm:text-base">
            <Trophy className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span>RESULT: {game.win_margin || `${game.winner} Won`}</span>
            <span className="text-xs bg-amber-500/15 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded font-mono-sport">
              Next Super Over Starts Shortly
            </span>
          </div>
        ) : isInningsBreak ? (
          <div className="flex items-center gap-2 text-amber-300 font-medium text-xs sm:text-sm">
            <span className="font-bold uppercase tracking-wider text-amber-400">Innings Break:</span>
            <span>
              Target is <strong className="text-white font-mono-sport text-base font-extrabold">{target}</strong> runs ({game.team_b} needs {target} runs in 6 balls)
            </span>
          </div>
        ) : isInnings2 ? (
          <div className="flex items-center gap-2 text-slate-200 font-medium text-xs sm:text-sm">
            <span className="text-slate-400">Target:</span>
            <span className="font-mono-sport font-black text-amber-400 text-base">
              {target}
            </span>
            <span className="text-slate-600">·</span>
            <span>
              {game.team_b} needs{' '}
              <strong className="text-emerald-400 font-extrabold font-mono-sport text-sm">
                {runsNeeded}
              </strong>{' '}
              runs in{' '}
              <strong className="text-white font-extrabold font-mono-sport text-sm">
                {ballsLeft}
              </strong>{' '}
              balls
            </span>
          </div>
        ) : isInnings1 ? (
          <div className="text-xs sm:text-sm text-slate-300 font-medium">
            <span>Innings 1 in progress: </span>
            <span className="text-sky-300 font-semibold">
              {game.team_a} batting to set target score
            </span>
          </div>
        ) : (
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Place Back / Lay selections before countdown timer closes</span>
          </div>
        )}
      </div>
    </div>
  );
};
