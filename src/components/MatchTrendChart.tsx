import React, { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  AreaChart,
  Area,
} from 'recharts';
import { Game } from '../types';
import { TeamFlag } from './TeamFlag';
import { TrendingUp, BarChart3, Activity, ShieldCheck, Flame, Trophy } from 'lucide-react';

interface MatchTrendChartProps {
  games: Game[];
}

export const MatchTrendChart: React.FC<MatchTrendChartProps> = ({ games }) => {
  const [chartType, setChartType] = useState<'SCORES' | 'MARGIN'>('SCORES');

  // Take the last 10 completed matches (sorted chronologically)
  const last10 = [...games]
    .filter((g) => g.status === 'COMPLETED' && g.winner)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .slice(-10);

  if (last10.length === 0) {
    return null;
  }

  // Calculate Analytical Insights
  const bat1stWins = last10.filter((g) => g.winner === g.team_a).length;
  const chaseWins = last10.filter((g) => g.winner === g.team_b).length;
  const bat1stPct = Math.round((bat1stWins / last10.length) * 100);
  const chasePct = 100 - bat1stPct;

  const avgScoreA = (
    last10.reduce((acc, g) => acc + (g.team_a_score || 0), 0) / last10.length
  ).toFixed(1);
  const avgScoreB = (
    last10.reduce((acc, g) => acc + (g.team_b_score || 0), 0) / last10.length
  ).toFixed(1);

  const highestScore = Math.max(
    ...last10.flatMap((g) => [g.team_a_score || 0, g.team_b_score || 0])
  );

  // Transform for Recharts
  const chartData = last10.map((g, idx) => {
    const isTeamAWinner = g.winner === g.team_a;
    const margin = (g.team_a_score || 0) - (g.team_b_score || 0);

    return {
      matchIdx: `#${idx + 1}`,
      matchCode: g.game_code || `M${idx + 1}`,
      teamA: g.team_a,
      teamB: g.team_b,
      scoreA: g.team_a_score || 0,
      scoreB: g.team_b_score || 0,
      wicketsA: g.team_a_wickets || 0,
      wicketsB: g.team_b_wickets || 0,
      winner: g.winner,
      isTeamAWinner,
      margin, // positive if Team A won, negative if Team B won
      absMargin: Math.abs(margin),
      winMarginText: g.win_margin || `${g.winner} Won`,
    };
  });

  return (
    <div className="card-surface border border-slate-700/60 rounded-2xl p-5 shadow-2xl space-y-4">
      {/* Top Header & View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-extrabold text-white text-base tracking-wide flex items-center gap-2">
              <span>LAST 10 MATCHES ANALYTICAL TREND</span>
              <span className="text-[10px] font-mono-sport bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded border border-amber-400/40">
                {last10.length} MATCHES
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Win/loss distribution, 1st innings vs chasing run dynamics & margins
            </p>
          </div>
        </div>

        {/* Chart View Toggle */}
        <div className="flex items-center gap-1 bg-[#0b121e] border border-slate-800 p-1 rounded-xl text-xs font-mono-sport">
          <button
            onClick={() => setChartType('SCORES')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              chartType === 'SCORES'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Team Scores
          </button>
          <button
            onClick={() => setChartType('MARGIN')}
            className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              chartType === 'MARGIN'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Win/Loss Margin
          </button>
        </div>
      </div>

      {/* Analytical KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#131e30] to-[#0c1320] border border-slate-700/70 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 font-mono-sport">
            Bat 1st Win Rate
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black font-mono-sport text-sky-400">{bat1stPct}%</span>
            <span className="text-[11px] text-slate-500 font-mono-sport">({bat1stWins} wins)</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#131e30] to-[#0c1320] border border-slate-700/70 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 font-mono-sport">
            Chase Win Rate
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black font-mono-sport text-amber-400">{chasePct}%</span>
            <span className="text-[11px] text-slate-500 font-mono-sport">({chaseWins} wins)</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#131e30] to-[#0c1320] border border-slate-700/70 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 font-mono-sport">
            Avg 1st / 2nd Score
          </div>
          <div className="flex items-baseline gap-1 mt-1 font-mono-sport font-extrabold text-base">
            <span className="text-sky-300">{avgScoreA}</span>
            <span className="text-slate-600">/</span>
            <span className="text-amber-300">{avgScoreB}</span>
            <span className="text-[10px] text-slate-500 font-normal ml-1">runs</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-gradient-to-b from-[#131e30] to-[#0c1320] border border-slate-700/70 shadow-sm">
          <div className="text-[10px] uppercase font-bold text-slate-400 font-mono-sport">
            Peak Super Over Score
          </div>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-xl font-black font-mono-sport text-emerald-400">{highestScore}</span>
            <span className="text-[11px] text-slate-500 font-mono-sport">runs</span>
          </div>
        </div>
      </div>

      {/* Visual Chart Container */}
      <div className="h-60 sm:h-64 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'SCORES' ? (
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="matchCode"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#0b121c] border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-2 min-w-[210px]">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-[11px] font-mono-sport text-slate-400 font-bold">
                        <span>{d.matchCode}</span>
                        <span className="text-amber-400 font-bold">WINNER: {d.winner}</span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TeamFlag team={d.teamA} size="xs" shape="rounded" />
                            <span className={`font-bold ${d.isTeamAWinner ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {d.teamA}
                            </span>
                          </div>
                          <span className="font-mono-sport font-black text-white">
                            {d.scoreA}/{d.wicketsA}
                          </span>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <TeamFlag team={d.teamB} size="xs" shape="rounded" />
                            <span className={`font-bold ${!d.isTeamAWinner ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {d.teamB}
                            </span>
                          </div>
                          <span className="font-mono-sport font-black text-white">
                            {d.scoreB}/{d.wicketsB}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-800/80 text-[11px] text-amber-300 font-bold flex items-center gap-1">
                        <Trophy className="w-3 h-3 text-amber-400" />
                        <span>{d.winMarginText}</span>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: 8, fontSize: 11, fontFamily: 'monospace' }}
                formatter={(value) => (
                  <span className="text-slate-300 font-bold">
                    {value === 'scoreA' ? '1st Innings (Team A)' : '2nd Innings / Chase (Team B)'}
                  </span>
                )}
              />
              <Bar dataKey="scoreA" name="scoreA" fill="#38bdf8" radius={[4, 4, 0, 0]} maxBarSize={22} />
              <Bar dataKey="scoreB" name="scoreB" fill="#f5a623" radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="matchCode"
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
                axisLine={{ stroke: '#334155' }}
                tickLine={false}
              />
              <ReferenceLine y={0} stroke="#475569" strokeDasharray="3 3" />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const d = payload[0].payload;
                  return (
                    <div className="bg-[#0b121c] border border-slate-700 p-2.5 rounded-xl shadow-2xl text-xs space-y-1.5 min-w-[190px]">
                      <div className="font-mono-sport text-slate-400 font-bold text-[10px]">
                        {d.matchCode} · {d.teamA} vs {d.teamB}
                      </div>
                      <div className="text-white font-extrabold text-sm flex items-center gap-1.5">
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                        <span>Winner: {d.winner}</span>
                      </div>
                      <div className="text-xs text-emerald-400 font-mono-sport font-semibold">
                        {d.winMarginText}
                      </div>
                    </div>
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="absMargin"
                name="Win Margin"
                stroke="#10b981"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#marginGradient)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Mini Streak Indicator Footer */}
      <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-mono-sport text-[11px] font-bold text-slate-300">Recent Winners Streak:</span>
          <div className="flex items-center gap-1">
            {last10.map((m) => (
              <span
                key={m.id}
                title={`${m.winner} won (${m.game_code})`}
                className={`w-5 h-5 rounded flex items-center justify-center font-mono-sport text-[10px] font-black shadow-sm ${
                  m.winner === m.team_a
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                }`}
              >
                {m.winner === m.team_a ? '1st' : '2nd'}
              </span>
            ))}
          </div>
        </div>

        <div className="text-[11px] font-mono-sport text-slate-400 flex items-center gap-2">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-sky-400"></span> Bat 1st
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded bg-amber-400"></span> Chased
          </span>
        </div>
      </div>
    </div>
  );
};
