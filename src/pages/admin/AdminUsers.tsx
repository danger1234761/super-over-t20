import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { User, Wallet } from '../../types';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  RefreshCw,
  Eye,
  ShieldAlert,
  CheckCircle,
  AlertCircle,
  X,
  Coins,
  ArrowUpCircle,
  ArrowDownCircle,
} from 'lucide-react';

interface AdminUsersProps {
  onSelectUser: (userId: string) => void;
}

export const AdminUsers: React.FC<AdminUsersProps> = ({ onSelectUser }) => {
  const [users, setUsers] = useState<Array<User & { wallet?: Wallet }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED' | 'DISABLED'>('ALL');

  // Create User Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newMobile, setNewMobile] = useState('');
  const [newPassword, setNewPassword] = useState('User@123');
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'DISABLED'>('ACTIVE');
  const [newNotes, setNewNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Top Up Modal state
  const [topUpUser, setTopUpUser] = useState<string | null>(null);
  const [topUpAmount, setTopUpUserAmount] = useState('1000');
  const [isTopUpProcessing, setIsTopUpProcessing] = useState(false);

  // Withdrawal Modal state
  const [withdrawUser, setWithdrawUser] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState('1000');
  const [isWithdrawProcessing, setIsWithdrawProcessing] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await request<Array<User & { wallet?: Wallet }>>('/api/admin/users');
      if (res.success && res.data) {
        setUsers(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (statusFilter !== 'ALL' && u.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.userId.toLowerCase().includes(q) ||
        u.fullName.toLowerCase().includes(q) ||
        u.mobile.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      const res = await request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify({
          userId: newUserId || undefined,
          fullName: newFullName,
          mobile: newMobile,
          password: newPassword,
          status: newStatus,
          adminNotes: newNotes,
        }),
      });

      if (res.success) {
        setIsCreateModalOpen(false);
        setNewUserId('');
        setNewFullName('');
        setNewMobile('');
        setNewNotes('');
        await fetchUsers();
      } else {
        setModalError(res.error?.message || 'Failed to create user');
      }
    } catch (err: any) {
      setModalError(err.message || 'Creation error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topUpUser) return;
    setIsTopUpProcessing(true);
    try {
      const res = await request(`/api/admin/users/${topUpUser}/deposit`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(topUpAmount) }),
      });
      if (res.success) {
        setTopUpUser(null);
        await fetchUsers();
      } else {
        alert(res.error?.message || 'Top-up failed');
      }
    } finally {
      setIsTopUpProcessing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawUser) return;
    setIsWithdrawProcessing(true);
    try {
      const res = await request(`/api/admin/users/${withdrawUser}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(withdrawAmount) }),
      });
      if (res.success) {
        setWithdrawUser(null);
        await fetchUsers();
      } else {
        alert(res.error?.message || 'Withdrawal failed');
      }
    } finally {
      setIsWithdrawProcessing(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wider flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-400" />
            <span>PLAYER ACCOUNT MANAGEMENT</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Administer user identities, wallet ledgers, deposit authorizations, and security statuses
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" />
            <span>CREATE PLAYER</span>
          </button>

          <button
            onClick={fetchUsers}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by User ID, Name, Mobile..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono-sport"
          />
        </div>

        {/* Status filters */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-lg w-full md:w-auto overflow-x-auto">
          {(['ALL', 'ACTIVE', 'SUSPENDED', 'DISABLED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`
                px-3 py-1 rounded-md text-xs font-bold transition-all whitespace-nowrap
                ${
                  statusFilter === s
                    ? 'bg-amber-400 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }
              `}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-sport border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                <th className="py-3 px-4">USER ID</th>
                <th className="py-3 px-4">FULL NAME</th>
                <th className="py-3 px-4">MOBILE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4">WALLET BALANCE</th>
                <th className="py-3 px-4">TOTAL DEPOSITED</th>
                <th className="py-3 px-4 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading player registry...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    No users matching criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => onSelectUser(u.userId)}
                    className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-bold text-amber-300">{u.userId}</td>
                    <td className="py-3 px-4 font-sans font-bold text-white text-sm">
                      {u.fullName}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.mobile}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : u.status === 'SUSPENDED'
                            ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-400 text-sm">
                      💵 {(u.wallet?.available_balance ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      💵 {(u.wallet?.total_deposits ?? 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setTopUpUser(u.userId);
                          }}
                          className="px-2 py-1 rounded bg-emerald-900/30 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 text-[10px] font-black uppercase inline-flex items-center gap-1 border border-emerald-500/30 transition-all"
                        >
                          <ArrowUpCircle className="w-3 h-3" />
                          <span>Top Up</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setWithdrawUser(u.userId);
                          }}
                          className="px-2 py-1 rounded bg-rose-900/30 hover:bg-rose-500 hover:text-white text-rose-400 text-[10px] font-black uppercase inline-flex items-center gap-1 border border-rose-500/30 transition-all"
                        >
                          <ArrowDownCircle className="w-3 h-3" />
                          <span>Withdraw</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectUser(u.userId);
                          }}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold inline-flex items-center gap-1 border border-slate-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Manage</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161d2a] border border-amber-500/40 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                <h3 className="font-display font-bold text-white text-base uppercase">
                  CREATE NEW PLAYER ACCOUNT
                </h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-1">
                  <label className="text-amber-400 font-black block uppercase tracking-wider">
                    Username (Unique ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="e.g. AMIT123"
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono-sport focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-amber-400 font-black block uppercase tracking-wider">
                    Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-slate-900 border-2 border-slate-700 rounded-xl px-4 py-3 text-sm text-white font-mono-sport focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  className="text-slate-500 hover:text-slate-300 font-bold uppercase text-[10px] tracking-widest flex items-center gap-1"
                  onClick={() => {
                    const el = document.getElementById('extra-fields');
                    if (el) el.classList.toggle('hidden');
                  }}
                >
                  <span>Advanced Options (Name, Mobile, Status)</span>
                  <Filter className="w-3 h-3" />
                </button>
              </div>

              <div id="extra-fields" className="hidden space-y-4 pt-2 border-t border-slate-800 mt-2 animate-fadeIn">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">
                    Full Player Name
                  </label>
                  <input
                    type="text"
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block uppercase">
                      Mobile Number
                    </label>
                    <input
                      type="text"
                      value={newMobile}
                      onChange={(e) => setNewMobile(e.target.value)}
                      placeholder="e.g. +919876500000"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold block uppercase">
                      Initial Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="SUSPENDED">SUSPENDED</option>
                      <option value="DISABLED">DISABLED</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">
                    Admin Internal Notes
                  </label>
                  <textarea
                    rows={2}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Internal audit notes..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
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
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold uppercase tracking-wider"
                >
                  {isSubmitting ? 'Provisioning...' : 'Provision User & Wallet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Top Up Modal */}
      {topUpUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161d2a] border border-emerald-500/40 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-400" />
                <h3 className="font-display font-bold text-white text-base uppercase">
                  Top Up Wallet: {topUpUser}
                </h3>
              </div>
              <button
                onClick={() => setTopUpUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleTopUp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Amount to Credit
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-emerald-400 font-bold">💵</span>
                  <input
                    type="number"
                    required
                    value={topUpAmount}
                    onChange={(e) => setTopUpUserAmount(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl pl-9 pr-4 py-3 text-lg text-white font-mono-sport font-black focus:outline-none focus:border-emerald-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['500', '1000', '5000', '10000', '25000', '50000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTopUpUserAmount(val)}
                    className={`py-2 rounded-lg text-xs font-mono-sport font-bold border transition-all ${
                      topUpAmount === val
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-black'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTopUpUser(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTopUpProcessing}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black uppercase text-xs shadow-lg shadow-emerald-900/20"
                >
                  {isTopUpProcessing ? 'Crediting...' : 'Confirm Top Up'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdrawal Modal */}
      {withdrawUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161d2a] border border-rose-500/40 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-rose-400" />
                <h3 className="font-display font-bold text-white text-base uppercase">
                  Withdraw Funds: {withdrawUser}
                </h3>
              </div>
              <button
                onClick={() => setWithdrawUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-rose-400 font-bold">💵</span>
                  <input
                    type="number"
                    required
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="w-full bg-slate-900 border-2 border-slate-800 rounded-xl pl-9 pr-4 py-3 text-lg text-white font-mono-sport font-black focus:outline-none focus:border-rose-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {['500', '1000', '5000', '10000', '25000', '50000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setWithdrawAmount(val)}
                    className={`py-2 rounded-lg text-xs font-mono-sport font-bold border transition-all ${
                      withdrawAmount === val
                        ? 'bg-rose-500 text-white border-rose-400 font-black'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setWithdrawUser(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isWithdrawProcessing}
                  className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase text-xs shadow-lg shadow-rose-900/20"
                >
                  {isWithdrawProcessing ? 'Processing...' : 'Confirm Withdrawal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
