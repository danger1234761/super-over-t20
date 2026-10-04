import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { AuditLog } from '../../types';
import { ShieldCheck, RefreshCw, Search, Filter } from 'lucide-react';

export const AdminAudit: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await request<AuditLog[]>('/api/admin/audit-logs');
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filtered = logs.filter((log) => {
    if (selectedAction !== 'ALL' && !log.action.includes(selectedAction)) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.actor_id.toLowerCase().includes(q) ||
      (log.target_user_id && log.target_user_id.toLowerCase().includes(q)) ||
      (log.reason && log.reason.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-amber-400" />
            <span>IMMUTABLE SYSTEM AUDIT LOGS</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Tamper-proof event logs for sensitive player provisioning, balance changes, and game configurations
          </p>
        </div>

        <button
          onClick={fetchLogs}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 self-start sm:self-center"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Actor, Target Player, Action..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono-sport"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto w-full md:w-auto">
          {(['ALL', 'USER_', 'WALLET_', 'GAME_', 'CONFIG_'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedAction(filter)}
              className={`
                px-3 py-1 rounded text-xs font-bold transition-all whitespace-nowrap
                ${
                  selectedAction === filter
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }
              `}
            >
              {filter === 'ALL' ? 'ALL EVENTS' : filter.replace('_', 'S')}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-sport border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                <th className="py-3 px-4">EVENT ACTION</th>
                <th className="py-3 px-4">ACTOR</th>
                <th className="py-3 px-4">TARGET USER</th>
                <th className="py-3 px-4">DETAILS / REASON</th>
                <th className="py-3 px-4">NEW VALUE</th>
                <th className="py-3 px-4">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading audit records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No audit records found matching criteria.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-amber-300">
                      <span className="bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans font-semibold">
                      {log.actor_name || log.actor_id}
                    </td>
                    <td className="py-3 px-4 font-bold text-cyan-400">
                      {log.target_user_id || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-300 max-w-sm truncate" title={log.reason}>
                      {log.reason || 'Standard operational trigger'}
                    </td>
                    <td
                      className="py-3 px-4 text-slate-400 font-mono text-[11px] max-w-xs truncate"
                      title={log.new_value}
                    >
                      {log.new_value || '-'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
