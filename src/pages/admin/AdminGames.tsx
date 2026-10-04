import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { Game } from '../../types';
import { TeamFlag } from '../../components/TeamFlag';
import { Trophy, Plus, RefreshCw, X, AlertCircle } from 'lucide-react';

export const AdminGames: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form
  const [teamA, setTeamA] = useState('South Africa');
  const [teamB, setTeamB] = useState('New Zealand');
  const [countdown, setCountdown] = useState(45);
  const [oddsTeamA, setOddsTeamA] = useState(1.95);
  const [oddsTeamB, setOddsTeamB] = useState(1.95);
  const [isTestMode, setIsTestMode] = useState(false);
  const [testSeq, setTestSeq] = useState('1, 6, W, 2, 4, 6');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sampleTeams = [
    'Bangladesh',
    'West Indies',
    'South Africa',
    'New Zealand',
    'Pakistan',
    'Afghanistan',
    'Zimbabwe',
    'Netherlands',
    'India',
    'Australia',
    'England',
    'Sri Lanka',
  ];

  const fetchGames = async () => {
    setIsLoading(true);
    try {
      const res = await request<Game[]>('/api/games');
      if (res.success && res.data) {
        setGames(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleCreateGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (teamA === teamB) {
      setModalError('Team A and Team B must be different');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      const res = await request('/api/admin/games', {
        method: 'POST',
        body: JSON.stringify({
          team_a: teamA,
          team_b: teamB,
          countdown_seconds: countdown,
          back_odds_team_a: oddsTeamA,
          lay_odds_team_a: oddsTeamA + 0.1,
          back_odds_team_b: oddsTeamB,
          lay_odds_team_b: oddsTeamB + 0.1,
          is_test_mode: isTestMode,
          test_ball_sequence: isTestMode
            ? testSeq.split(',').map((s) => s.trim().toUpperCase())
            : undefined,
        }),
      });

      if (res.success) {
        setIsModalOpen(false);
        await fetchGames();
      } else {
        setModalError(res.error?.message || 'Failed to create game');
      }
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wider flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-400" />
            <span>SUPER OVER MATCHES SCHEDULE</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Schedule new Super Over clashes, configure odds margins, and review cryptographic commitments
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>SCHEDULE NEW MATCH</span>
          </button>

          <button
            onClick={fetchGames}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Matches Table */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-sport border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                <th className="py-3 px-4">CODE</th>
                <th className="py-3 px-4">MATCH CLASH</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">SCORE (A / B)</th>
                <th className="py-3 px-4">ODDS (A / B)</th>
                <th className="py-3 px-4">SEED COMMITMENT</th>
                <th className="py-3 px-4">SCHEDULED</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading matches...
                  </td>
                </tr>
              ) : games.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No matches found.
                  </td>
                </tr>
              ) : (
                games.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-amber-300">{g.game_code}</td>
                    <td className="py-3 px-4 font-sans font-bold text-white text-sm">
                      <div className="flex items-center gap-1.5">
                        <TeamFlag team={g.team_a} size="xs" shape="rounded" />
                        <span>{g.team_a}</span>
                        <span className="text-slate-500 text-xs">vs</span>
                        <TeamFlag team={g.team_b} size="xs" shape="rounded" />
                        <span>{g.team_b}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {g.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-400">
                      {g.team_a_score}/{g.team_a_wickets} · {g.team_b_score}/{g.team_b_wickets}
                    </td>
                    <td className="py-3 px-4 text-cyan-400 font-bold">
                      {(g.back_odds_team_a || 1.95).toFixed(2)} / {(g.back_odds_team_b || 1.95).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px] truncate max-w-xs" title={g.server_seed_hash}>
                      {g.server_seed_hash?.substring(0, 16)}...
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(g.scheduled_time).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Schedule Match Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161d2a] border border-amber-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-display font-bold text-white text-base uppercase">
                SCHEDULE SUPER OVER MATCH
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGame} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">Team A</label>
                  <select
                    value={teamA}
                    onChange={(e) => setTeamA(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
                  >
                    {sampleTeams.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">Team B</label>
                  <select
                    value={teamB}
                    onChange={(e) => setTeamB(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
                  >
                    {sampleTeams.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">Countdown (s)</label>
                  <input
                    type="number"
                    min={10}
                    value={countdown}
                    onChange={(e) => setCountdown(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">Odds Team A</label>
                  <input
                    type="number"
                    step="0.01"
                    value={oddsTeamA}
                    onChange={(e) => setOddsTeamA(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">Odds Team B</label>
                  <input
                    type="number"
                    step="0.01"
                    value={oddsTeamB}
                    onChange={(e) => setOddsTeamB(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Custom Ball Sequence Override */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <label className="flex items-center gap-2 text-slate-300 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTestMode}
                    onChange={(e) => setIsTestMode(e.target.checked)}
                    className="rounded text-amber-400 border-slate-700"
                  />
                  <span>Predefine Custom Ball Sequence (Override)</span>
                </label>
                {isTestMode && (
                  <input
                    type="text"
                    value={testSeq}
                    onChange={(e) => setTestSeq(e.target.value)}
                    placeholder="e.g. 1, 6, W, 2, 4, 6"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono-sport"
                  />
                )}
              </div>

              {modalError && (
                <div className="p-2.5 rounded bg-rose-950/80 border border-rose-500/60 text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold uppercase tracking-wider"
                >
                  {isSubmitting ? 'Scheduling...' : 'Commit Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
