import React, { useState } from 'react';
import { useWebSocket } from '../../context/WebSocketContext';
import { request } from '../../services/api';
import { Game } from '../../types';
import { BallStrip } from '../../components/BallIndicator';
import { TeamFlag } from '../../components/TeamFlag';
import {
  Play,
  Lock,
  RotateCcw,
  CheckCircle,
  XCircle,
  Radio,
  Sliders,
  Sparkles,
  ShieldAlert,
  ArrowRight,
  Flame,
  Coins,
} from 'lucide-react';

export const AdminLiveControl: React.FC = () => {
  const { liveGames, activeGameId, setActiveGameId } = useWebSocket();
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [testSequenceInput, setTestSequenceInput] = useState<string>('1, 6, W, 2, 4, 6');
  const [isTestModeActive, setIsTestModeActive] = useState<boolean>(false);
  const [manualBallSelection, setManualBallSelection] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const games = Object.values(liveGames);
  const currentGame =
    (activeGameId ? liveGames[activeGameId] : null) ||
    games.find((g) => g.status === 'OPEN' || g.status === 'INNINGS_1' || g.status === 'INNINGS_2' || g.status === 'LOCKED') ||
    games[0];

  const handleOpenGame = async (gameId: string) => {
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const res = await request(`/api/admin/games/${gameId}/open`, { method: 'POST' });
      if (res.success) setActionMessage('Market opened for entries!');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLockGame = async (gameId: string) => {
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const res = await request(`/api/admin/games/${gameId}/lock`, { method: 'POST' });
      if (res.success) setActionMessage('Entries locked!');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleStartInnings = async (gameId: string, innings: 1 | 2) => {
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const res = await request(`/api/admin/games/${gameId}/start`, {
        method: 'POST',
        body: JSON.stringify({ innings }),
      });
      if (res.success) setActionMessage(`Innings ${innings} started!`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleNextBall = async (gameId: string) => {
    setIsActionLoading(true);
    setActionMessage(null);
    try {
      const res = await request(`/api/admin/games/${gameId}/next-ball`, { method: 'POST' });
      if (res.success) setActionMessage(`Ball advanced: ${res.data?.ball?.result}`);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleAutoPlay = async (gameId: string, enabled: boolean) => {
    setIsActionLoading(true);
    try {
      await request(`/api/admin/games/${gameId}/auto-play`, {
        method: 'POST',
        body: JSON.stringify({ enabled }),
      });
      setActionMessage(enabled ? 'Auto-play running!' : 'Auto-play paused');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleCancelGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to cancel this match? All bets will be refunded!')) return;
    setIsActionLoading(true);
    try {
      const res = await request(`/api/admin/games/${gameId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin emergency cancellation' }),
      });
      if (res.success) setActionMessage('Match cancelled and stakes refunded');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSetTestSequence = async (gameId: string) => {
    const raw = testSequenceInput.split(',').map((s) => s.trim().toUpperCase());
    setIsActionLoading(true);
    try {
      const res = await request(`/api/admin/games/${gameId}/test-sequence`, {
        method: 'POST',
        body: JSON.stringify({
          isTestMode: isTestModeActive,
          sequence: raw,
        }),
      });
      if (res.success) {
        setActionMessage('Test sequence configured and audited!');
      } else {
        alert(res.error?.message || 'Failed to configure test sequence');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSetManualBall = async (gameId: string, result: string | null) => {
    setIsActionLoading(true);
    try {
      const res = await request(`/api/admin/games/${gameId}/manual-ball`, {
        method: 'POST',
        body: JSON.stringify({ result: result || undefined }),
      });
      if (res.success) {
        setManualBallSelection(result);
        setActionMessage(result ? `Next ball forced to: ${result}` : 'Manual override cleared');
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  if (!currentGame) {
    return <div className="py-16 text-center text-slate-500">No active matches found.</div>;
  }

  const teamABalls = currentGame.balls.filter((b) => b.innings === 1);
  const teamBBalls = currentGame.balls.filter((b) => b.innings === 2);

  const totalStakeA = currentGame.market_stakes?.team_a || 0;
  const totalStakeB = currentGame.market_stakes?.team_b || 0;
  const exposureDiff = Math.abs(totalStakeA - totalStakeB);
  const isHighExposure = exposureDiff > 5000;

  return (
    <div className="space-y-6 pb-12 max-w-5xl mx-auto">
      {/* Exposure Alert */}
      {isHighExposure && (
        <div className="p-4 rounded-xl bg-rose-950/40 border-2 border-rose-500/50 flex items-center gap-4 animate-pulse">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
          <div>
            <div className="text-rose-400 font-display font-black text-sm uppercase tracking-widest">CRITICAL EXPOSURE DETECTED</div>
            <div className="text-rose-200 text-xs font-bold">Difference: 💵 {exposureDiff.toLocaleString()} — Market Risk Engine active.</div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wider flex items-center gap-2">
            <Radio className="w-6 h-6 text-amber-400 animate-pulse" />
            <span>LIVE MATCH COMMAND CENTER</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Control live states, trigger ball deliveries, configure QA test sequences, and monitor odds
          </p>
        </div>

        {/* Match selector */}
        {games.length > 1 && (
          <select
            value={currentGame.id}
            onChange={(e) => setActiveGameId(e.target.value)}
            className="bg-[#121721] border border-amber-500/40 rounded-lg px-3 py-2 text-xs font-mono-sport text-amber-300 font-bold focus:outline-none"
          >
            {games.map((g) => (
              <option key={g.id} value={g.id}>
                {g.game_code}: {g.team_a} vs {g.team_b} ({g.status})
              </option>
            ))}
          </select>
        )}
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold font-mono-sport flex items-center justify-between animate-fadeIn">
          <span>{actionMessage}</span>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            ×
          </button>
        </div>
      )}

      {/* Primary Match Control Panel */}
      <div className="bg-[#121721] border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-6">
        {/* Match Code & State Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-mono-sport font-bold text-slate-400">
              {currentGame.game_code}
            </span>
            <h3 className="text-lg sm:text-xl font-display font-extrabold text-white flex items-center gap-2 mt-0.5">
              <TeamFlag team={currentGame.team_a} size="sm" shape="rounded" />
              <span>{currentGame.team_a}</span>
              <span className="text-slate-500 text-sm">vs</span>
              <TeamFlag team={currentGame.team_b} size="sm" shape="rounded" />
              <span>{currentGame.team_b}</span>
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">STATUS</span>
              <span className="text-sm font-mono-sport font-extrabold text-amber-400 bg-amber-400/10 px-2.5 py-0.5 rounded border border-amber-400/30">
                {currentGame.status}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                COUNTDOWN
              </span>
              <span className="text-sm font-mono-sport font-extrabold text-cyan-400 bg-cyan-400/10 px-2.5 py-0.5 rounded border border-cyan-400/30">
                {currentGame.remaining_seconds}s
              </span>
            </div>
          </div>
        </div>

        {/* Live Score Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TeamFlag team={currentGame.team_a} size="xs" shape="rounded" />
                <span className="font-display font-bold text-white text-base">
                  {currentGame.team_a} (Inn 1)
                </span>
              </div>
              <span className="text-2xl font-mono-sport font-black text-amber-400">
                {currentGame.team_a_score}/{currentGame.team_a_wickets}
              </span>
            </div>
            <BallStrip balls={teamABalls} totalBalls={6} size="sm" />
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TeamFlag team={currentGame.team_b} size="xs" shape="rounded" />
                <span className="font-display font-bold text-white text-base">
                  {currentGame.team_b} (Inn 2)
                </span>
              </div>
              <span className="text-2xl font-mono-sport font-black text-amber-400">
                {currentGame.team_b_score}/{currentGame.team_b_wickets}
              </span>
            </div>
            <BallStrip balls={teamBBalls} totalBalls={6} size="sm" />
          </div>
        </div>

        {/* Market Risk & Auto-Loss Engine Monitor */}
        <div className="p-4 rounded-xl bg-[#0b0e14] border border-amber-500/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <span className="text-xs font-display font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>MARKET RISK & STAKES ENGINE (AUTO-LOSS FOR HIGHER BET TEAM)</span>
            </span>
            <span className="text-[10px] font-mono-sport bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded font-bold">
              POLICY: HIGHER STAKE TEAM MUST LOSE
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono-sport">
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase">{currentGame.team_a} Total Stake</div>
              <div className="text-base font-bold text-cyan-400">
                💵 {(currentGame.market_stakes?.team_a || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase">{currentGame.team_b} Total Stake</div>
              <div className="text-base font-bold text-amber-400">
                💵 {(currentGame.market_stakes?.team_b || 0).toLocaleString()}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-slate-400 text-[10px] uppercase">Engine Target Outcome</div>
              <div className="text-sm font-bold text-emerald-400 truncate">
                {currentGame.forced_winner
                  ? `🏆 ${currentGame.forced_winner} (Winner)`
                  : 'Natural / Fair (Equal Bets)'}
              </div>
            </div>
          </div>

          {/* Dynamic Odds Monitor */}
          <div className="flex items-center justify-between text-[10px] font-mono-sport text-slate-500 pt-1">
            <span>D.O.A.C (Dynamic Odds Auto-Correction) ACTIVE</span>
            <span>Balancing book to minimize liability</span>
          </div>
        </div>

        {/* Interactive Controls Bar */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-display font-bold text-slate-400 uppercase tracking-wider block">
            GAME ENGINE ACTIONS
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {/* Open */}
            <button
              disabled={isActionLoading || currentGame.status === 'COMPLETED'}
              onClick={() => handleOpenGame(currentGame.id)}
              className="p-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-display font-bold text-xs uppercase tracking-wider border border-emerald-500/40 transition-all flex flex-col items-center justify-center gap-1.5"
            >
              <Play className="w-4 h-4" />
              <span>OPEN BETTING</span>
            </button>

            {/* Lock */}
            <button
              disabled={isActionLoading || currentGame.status !== 'OPEN'}
              onClick={() => handleLockGame(currentGame.id)}
              className="p-3 rounded-xl bg-amber-500/20 hover:bg-amber-400 text-amber-300 hover:text-slate-950 font-display font-bold text-xs uppercase tracking-wider border border-amber-500/40 transition-all flex flex-col items-center justify-center gap-1.5"
            >
              <Lock className="w-4 h-4" />
              <span>LOCK ENTRIES</span>
            </button>

            {/* Start Innings 1 */}
            <button
              disabled={isActionLoading || currentGame.status === 'INNINGS_1' || currentGame.status === 'COMPLETED'}
              onClick={() => handleStartInnings(currentGame.id, 1)}
              className="p-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 font-display font-bold text-xs uppercase tracking-wider border border-cyan-500/40 transition-all flex flex-col items-center justify-center gap-1.5"
            >
              <Flame className="w-4 h-4" />
              <span>START INN 1</span>
            </button>

            {/* Advance 1 Ball */}
            <button
              disabled={
                isActionLoading ||
                (currentGame.status !== 'INNINGS_1' && currentGame.status !== 'INNINGS_2')
              }
              onClick={() => handleNextBall(currentGame.id)}
              className="p-3 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-display font-extrabold text-xs uppercase tracking-wider shadow-lg shadow-amber-500/20 transition-all flex flex-col items-center justify-center gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              <span>NEXT BALL</span>
            </button>

            {/* Auto Play Toggle */}
            <button
              disabled={
                isActionLoading ||
                (currentGame.status !== 'INNINGS_1' && currentGame.status !== 'INNINGS_2')
              }
              onClick={() => handleAutoPlay(currentGame.id, true)}
              className="p-3 rounded-xl bg-purple-500/20 hover:bg-purple-500 text-purple-300 hover:text-white font-display font-bold text-xs uppercase tracking-wider border border-purple-500/40 transition-all flex flex-col items-center justify-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>AUTO PLAY</span>
            </button>

            {/* Cancel Game */}
            <button
              disabled={isActionLoading || currentGame.status === 'COMPLETED'}
              onClick={() => handleCancelGame(currentGame.id)}
              className="p-3 rounded-xl bg-rose-950/80 hover:bg-rose-900 text-rose-300 font-display font-bold text-xs uppercase tracking-wider border border-rose-500/40 transition-all flex flex-col items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4" />
              <span>CANCEL MATCH</span>
            </button>
          </div>
        </div>
      </div>

      {/* IMMEDIATE NEXT BALL OVERRIDE */}
      <div className="bg-[#121721] border border-cyan-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-cyan-400">
            <Sliders className="w-5 h-5" />
            <h3 className="font-display font-bold text-white text-base uppercase">
              IMMEDIATE NEXT BALL OVERRIDE
            </h3>
          </div>
          <span className="text-[10px] text-cyan-400 font-mono-sport bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/30">
            LIVE OVERRIDE
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Select the outcome for the <strong>very next</strong> delivery. This override clears automatically after one ball.
        </p>

        <div className="flex flex-wrap gap-2">
          {['0', '1', '2', '3', '4', '6', 'W'].map((val) => (
            <button
              key={val}
              onClick={() => handleSetManualBall(currentGame.id, manualBallSelection === val ? null : val)}
              disabled={isActionLoading || (currentGame.status !== 'INNINGS_1' && currentGame.status !== 'INNINGS_2')}
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center font-mono-sport font-black text-lg transition-all border-2
                ${
                  manualBallSelection === val
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 scale-110 shadow-lg shadow-cyan-900/30'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-cyan-500/50'
                }
              `}
            >
              {val}
            </button>
          ))}
          <button
            onClick={() => handleSetManualBall(currentGame.id, null)}
            disabled={isActionLoading || !manualBallSelection}
            className="px-4 h-12 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs uppercase border border-slate-700 hover:text-white"
          >
            Clear
          </button>
        </div>
      </div>

      {/* BALL OUTCOME SEQUENCE PRE-SET */}
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2 text-amber-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-display font-bold text-white text-base uppercase">
              BALL OUTCOME SEQUENCE PRE-SET (OVERRIDE)
            </h3>
          </div>
          <span className="text-[10px] text-amber-400 font-mono-sport bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
            AUDITED OVERRIDE
          </span>
        </div>

        <p className="text-xs text-slate-400">
          Administrators may predefine a fixed ball delivery sequence <strong>prior</strong> to match start. All overrides are permanently recorded in the audit trail.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={isTestModeActive}
                onChange={(e) => setIsTestModeActive(e.target.checked)}
                className="rounded border-slate-700 text-amber-400 focus:ring-0"
              />
              <span>ENABLE PRESET SEQUENCE</span>
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-semibold block uppercase">
              Predefined Ball Sequence (Comma separated: 0, 1, 2, 3, 4, 6, W)
            </label>
            <input
              type="text"
              value={testSequenceInput}
              onChange={(e) => setTestSequenceInput(e.target.value)}
              placeholder="e.g. 1, 6, W, 2, 4, 6, 0, 4, 6, 1, W"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white font-mono-sport focus:outline-none focus:border-amber-400"
            />
          </div>

          <button
            onClick={() => handleSetTestSequence(currentGame.id)}
            disabled={isActionLoading}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-colors"
          >
            Apply Sequence & Commit to Audit Log
          </button>
        </div>
      </div>
    </div>
  );
};
