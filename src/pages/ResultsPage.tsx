import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { BallStrip } from '../components/BallIndicator';
import { TeamFlag } from '../components/TeamFlag';
import { MatchTrendChart } from '../components/MatchTrendChart';
import { request } from '../services/api';
import { Game } from '../types';
import { Trophy, ShieldCheck, CheckCircle2, ChevronRight, BarChart3, RefreshCw } from 'lucide-react';

interface ResultsPageProps {
  onNavigateToVerify: (gameId: string) => void;
}

export const ResultsPage: React.FC<ResultsPageProps> = ({ onNavigateToVerify }) => {
  const { liveGames } = useWebSocket();
  const [historyGames, setHistoryGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch completed match history from API on mount
  const fetchCompletedGames = async () => {
    try {
      setIsLoading(true);
      const res = await request<Game[]>('/api/games?status=COMPLETED');
      if (res.success && res.data) {
        setHistoryGames(res.data);
      }
    } catch (e) {
      console.error('Failed to load completed games', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompletedGames();
  }, []);

  // Merge historical games and real-time live websocket games
  const allCompletedMap = new Map<string, Game>();
  historyGames.forEach((g) => {
    if (g.status === 'COMPLETED') allCompletedMap.set(g.id, g);
  });
  Object.values(liveGames).forEach((g) => {
    if (g.status === 'COMPLETED') allCompletedMap.set(g.id, g);
  });

  const completedGames = Array.from(allCompletedMap.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
            COMPLETED SUPER OVER RESULTS & ANALYTICS
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Official match archives, analytical win/loss trend charts, and provably fair cryptographic seeds
          </p>
        </div>

        <button
          onClick={fetchCompletedGames}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-mono-sport text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Analytical Win/Loss & Score Trend Chart (Last 10 Matches) */}
      {completedGames.length > 0 && (
        <MatchTrendChart games={completedGames} />
      )}

      {/* Matches Archive Feed */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pt-2">
          <h3 className="text-sm font-bold text-slate-300 font-mono-sport uppercase tracking-wider flex items-center gap-2">
            <span>Match Records</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 font-mono-sport">
              {completedGames.length}
            </span>
          </h3>
        </div>

        {completedGames.length === 0 ? (
          <div className="py-16 text-center text-slate-500 bg-[#121721] rounded-xl border border-slate-800">
            No completed matches recorded yet. Matches will appear here after both innings finish.
          </div>
        ) : (
          completedGames.map((game) => {
            const teamABalls = game.balls ? game.balls.filter((b) => b.innings === 1) : [];
            const teamBBalls = game.balls ? game.balls.filter((b) => b.innings === 2) : [];

            return (
              <div
                key={game.id}
                className="card-surface border border-slate-700/60 hover:border-amber-500/50 rounded-2xl p-5 sm:p-6 transition-all shadow-xl"
              >
                {/* Match Header */}
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-sport text-slate-300 font-bold">
                      {game.game_code}
                    </span>
                    <span className="text-sm font-bold text-white">· {game.title}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold font-display bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/30 shadow-sm">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{game.win_margin || `${game.winner} Won`}</span>
                  </div>
                </div>

                {/* Score & Ball Summaries */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                  {/* Team A */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamFlag team={game.team_a} size="sm" shape="rounded" />
                        <span className="font-display font-bold text-white text-base">
                          {game.team_a}
                        </span>
                      </div>
                      <span className="font-mono-sport font-extrabold text-amber-400 text-lg">
                        {game.team_a_score}/{game.team_a_wickets}{' '}
                        <span className="text-xs text-slate-400 font-normal">
                          (0.{teamABalls.length} ov)
                        </span>
                      </span>
                    </div>
                    {teamABalls.length > 0 && (
                      <BallStrip balls={teamABalls} totalBalls={6} size="sm" />
                    )}
                  </div>

                  {/* Team B */}
                  <div className="space-y-2 pt-3 md:pt-0 md:pl-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TeamFlag team={game.team_b} size="sm" shape="rounded" />
                        <span className="font-display font-bold text-white text-base">
                          {game.team_b}
                        </span>
                      </div>
                      <span className="font-mono-sport font-extrabold text-amber-400 text-lg">
                        {game.team_b_score}/{game.team_b_wickets}{' '}
                        <span className="text-xs text-slate-400 font-normal">
                          (0.{teamBBalls.length} ov)
                        </span>
                      </span>
                    </div>
                    {teamBBalls.length > 0 && (
                      <BallStrip balls={teamBBalls} totalBalls={6} size="sm" />
                    )}
                  </div>
                </div>

                {/* Provably Fair Seed Details & Verification CTA */}
                <div className="mt-3 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-lg text-xs">
                  <div className="space-y-1 overflow-hidden">
                    <div className="flex items-center gap-1.5 text-emerald-400 font-semibold font-mono-sport">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Revealed Server Seed:</span>
                      <span className="text-slate-300 font-mono text-[11px] truncate max-w-xs sm:max-w-md">
                        {game.server_seed}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono-sport truncate">
                      Seed Hash: {game.server_seed_hash}
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigateToVerify(game.id)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-all border border-emerald-500/40 flex items-center gap-1.5 self-start sm:self-center cursor-pointer"
                  >
                    <span>Verify Cryptographic Fairness</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
