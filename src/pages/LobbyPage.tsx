import React, { useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Game } from '../types';
import { TeamFlag } from '../components/TeamFlag';
import { Trophy, Clock, Play, CheckCircle, ArrowRight } from 'lucide-react';

interface LobbyPageProps {
  onSelectGame: (gameId: string) => void;
}

export const LobbyPage: React.FC<LobbyPageProps> = ({ onSelectGame }) => {
  const { liveGames } = useWebSocket();
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'COMPLETED'>('ALL');

  const games = Object.values(liveGames);

  const filteredGames = games.filter((g) => {
    if (filter === 'ALL') return true;
    if (filter === 'LIVE')
      return g.status === 'OPEN' || g.status === 'INNINGS_1' || g.status === 'INNINGS_2' || g.status === 'LOCKED';
    if (filter === 'SCHEDULED') return g.status === 'SCHEDULED' || g.status === 'DRAFT';
    if (filter === 'COMPLETED') return g.status === 'COMPLETED';
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
            SUPER OVER MATCH LOBBY
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Select a live or upcoming Super Over T20 match to view odds and enter
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {(['ALL', 'LIVE', 'SCHEDULED', 'COMPLETED'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`
                px-3 py-1.5 rounded-md text-xs font-bold transition-all
                ${
                  filter === mode
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }
              `}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-500">
            No matches found in this category.
          </div>
        ) : (
          filteredGames.map((game) => {
            const isLive =
              game.status === 'OPEN' ||
              game.status === 'INNINGS_1' ||
              game.status === 'INNINGS_2' ||
              game.status === 'LOCKED';
            const isCompleted = game.status === 'COMPLETED';

            return (
              <div
                key={game.id}
                onClick={() => onSelectGame(game.id)}
                className={`
                  cursor-pointer card-surface rounded-2xl p-5 transition-all duration-200 hover:-translate-y-1 hover:shadow-2xl
                  ${
                    isLive
                      ? 'border-amber-500/50 hover:border-amber-400 shadow-lg shadow-amber-950/20'
                      : 'border-slate-700/60 hover:border-slate-600'
                  }
                `}
              >
                {/* Match Card Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <span className="text-[11px] font-mono-sport text-slate-300 font-bold">
                    {game.game_code}
                  </span>

                  <span
                    className={`
                      text-[10px] uppercase font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 font-mono-sport shadow-sm
                      ${
                        game.status === 'OPEN'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                          : isLive
                          ? 'bg-rose-950/80 text-rose-300 border border-rose-500/50 animate-pulse'
                          : isCompleted
                          ? 'bg-slate-800/80 text-slate-400 border border-slate-700'
                          : 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                      }
                    `}
                  >
                    {isLive && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>}
                    {game.status}
                  </span>
                </div>

                {/* Teams & Scores */}
                <div className="py-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TeamFlag team={game.team_a} size="sm" shape="rounded" />
                      <span className="font-display font-bold text-white text-base">
                        {game.team_a}
                      </span>
                    </div>
                    <span className="font-mono-sport font-extrabold text-amber-400 text-lg">
                      {game.team_a_score}/{game.team_a_wickets}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TeamFlag team={game.team_b} size="sm" shape="rounded" />
                      <span className="font-display font-bold text-white text-base">
                        {game.team_b}
                      </span>
                    </div>
                    <span className="font-mono-sport font-extrabold text-amber-400 text-lg">
                      {game.team_b_score}/{game.team_b_wickets}
                    </span>
                  </div>
                </div>

                {/* Match Odds snapshot */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 truncate">{game.team_a}</span>
                    <span className="font-mono-sport font-bold text-cyan-400">
                      {(game.back_odds_team_a || 1.95).toFixed(2)}
                    </span>
                  </div>

                  <div className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between">
                    <span className="text-slate-400 truncate">{game.team_b}</span>
                    <span className="font-mono-sport font-bold text-cyan-400">
                      {(game.back_odds_team_b || 1.95).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-3 pt-2 flex items-center justify-between text-xs text-amber-400 font-semibold group-hover:text-amber-300">
                  <span>
                    {isCompleted
                      ? `Winner: ${game.winner}`
                      : isLive
                      ? 'Live match in progress'
                      : 'Scheduled match'}
                  </span>
                  <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
