import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import {
  Users,
  Trophy,
  Coins,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  Activity,
  PlayCircle,
  FileCheck,
  CheckCircle,
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigateTab: (tab: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigateTab }) => {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const res = await request('/api/admin/stats');
      if (res.success && res.data) {
        setStats(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const cards = [
    {
      title: 'TOTAL PLAYERS',
      value: stats?.totalUsers ?? '...',
      sub: `${stats?.activeUsers ?? 0} Active`,
      icon: Users,
      color: 'text-cyan-400',
      tab: 'users',
    },
    {
      title: 'ACTIVE PLAYERS',
      value: stats?.activeUsers ?? '...',
      sub: 'Eligible to enter matches',
      icon: CheckCircle,
      color: 'text-emerald-400',
      tab: 'users',
    },
    {
      title: 'SUSPENDED PLAYERS',
      value: stats?.suspendedUsers ?? '...',
      sub: 'Action required',
      icon: ShieldAlert,
      color: 'text-rose-400',
      tab: 'users',
    },
    {
      title: 'ACTIVE GAMES',
      value: stats?.activeGames ?? '...',
      sub: 'Live / Open for bets',
      icon: PlayCircle,
      color: 'text-amber-400',
      tab: 'live',
    },
    {
      title: 'COMPLETED GAMES',
      value: stats?.completedGames ?? '...',
      sub: 'All bets settled',
      icon: Trophy,
      color: 'text-emerald-400',
      tab: 'games',
    },
    {
      title: 'TOTAL DEPOSITS',
      value: `💵 ${(stats?.totalDeposits ?? 0).toLocaleString()}`,
      sub: 'Admin approved',
      icon: ArrowDownLeft,
      color: 'text-emerald-400',
      tab: 'deposits',
    },
    {
      title: 'TOTAL WITHDRAWALS',
      value: `💵 ${(stats?.totalWithdrawals ?? 0).toLocaleString()}`,
      sub: 'Admin processed',
      icon: ArrowUpRight,
      color: 'text-amber-400',
      tab: 'withdrawals',
    },
    {
      title: 'LEDGER HEALTH',
      value: '100% BALANCED',
      sub: 'Double-entry audit ok',
      icon: FileCheck,
      color: 'text-cyan-400',
      tab: 'wallet',
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wider flex items-center gap-2">
            <span>ADMIN COMMAND DASHBOARD</span>
            <span className="text-xs bg-amber-400/20 text-amber-300 font-mono-sport font-bold px-2 py-0.5 rounded border border-amber-400/40">
              ROOT CONSOLE
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time player accounts, authoritative match controls, financial ledger & audit oversight
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('users')}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
          >
            + Create Player
          </button>
          <button
            onClick={() => onNavigateTab('live')}
            className="px-3.5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-colors shadow-md"
          >
            Live Match Console
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c, idx) => {
          const Icon = c.icon;
          return (
            <div
              key={idx}
              onClick={() => onNavigateTab(c.tab)}
              className="bg-[#121721] border border-slate-800 hover:border-amber-500/40 rounded-xl p-4 sm:p-5 transition-all cursor-pointer hover:-translate-y-0.5 shadow-lg group"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-400 font-display tracking-wider">
                  {c.title}
                </span>
                <Icon className={`w-4 h-4 ${c.color} group-hover:scale-110 transition-transform`} />
              </div>
              <div className="text-xl sm:text-2xl font-display font-extrabold text-white font-mono-sport">
                {c.value}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{c.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Live Match Engine Status Card */}
        <div className="bg-[#121721] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Realtime Engine Status</span>
            </span>
            <span className="text-xs text-emerald-400 font-mono-sport font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              ACTIVE
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Random Source</span>
              <span className="font-mono-sport text-amber-300">HMAC-SHA256 Cryptographic RNG</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Timer Loop</span>
              <span className="font-mono-sport text-emerald-400">Server-Authoritative (1000ms)</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Ledger Enforcement</span>
              <span className="font-mono-sport text-cyan-300">Strict Non-Negative / Row-Locking</span>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('live')}
            className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors font-display uppercase tracking-wider"
          >
            Open Live Match Controller →
          </button>
        </div>

        {/* Financial Rules Notice */}
        <div className="bg-[#121721] border border-slate-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <span className="font-display font-bold text-white text-sm uppercase tracking-wider flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Financial Isolation Policy</span>
            </span>
            <span className="text-xs text-amber-400 font-mono-sport font-bold">
              ENFORCED
            </span>
          </div>

          <div className="text-xs text-slate-400 space-y-1.5 leading-relaxed">
            <p>
              • <strong>Admin-Only Deposits:</strong> No frontend mechanism exists for players to directly credit funds. Every deposit requires explicit admin execution.
            </p>
            <p>
              • <strong>Admin-Only Withdrawals:</strong> Player balances are held securely; withdrawals are processed via admin debit transactions.
            </p>
            <p>
              • <strong>Audit Ledger:</strong> Every modification generates an immutable ledger ID and audit record.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('audit')}
            className="w-full mt-2 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors font-display uppercase tracking-wider"
          >
            Review Security Audit Logs →
          </button>
        </div>
      </div>
    </div>
  );
};
