import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { User, Wallet, WalletTransaction, GameEntry, AuditLog } from '../../types';
import {
  ArrowLeft,
  Coins,
  ShieldAlert,
  ShieldCheck,
  KeyRound,
  ArrowDownLeft,
  ArrowUpRight,
  Sliders,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

interface AdminUserDetailProps {
  userId: string;
  onBack: () => void;
}

export const AdminUserDetail: React.FC<AdminUserDetailProps> = ({ userId, onBack }) => {
  const [data, setData] = useState<{
    user: User;
    wallet: Wallet;
    transactions: WalletTransaction[];
    gameEntries: GameEntry[];
    auditLogs: AuditLog[];
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState<'TRANSACTIONS' | 'GAMES' | 'AUDIT'>('TRANSACTIONS');

  // Action Modals State
  const [activeModal, setActiveModal] = useState<
    'DEPOSIT' | 'WITHDRAW' | 'ADJUST' | 'RESET_PASS' | 'STATUS_CHANGE' | null
  >(null);

  // Form states
  const [amount, setAmount] = useState<string>('1000');
  const [reference, setReference] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [statusTarget, setStatusTarget] = useState<'ACTIVE' | 'SUSPENDED'>('SUSPENDED');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchUserDetails = async () => {
    setIsLoading(true);
    try {
      const res = await request(`/api/admin/users/${userId}`);
      if (res.success && res.data) {
        setData(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setModalError(null);
    try {
      const res = await request(`/api/admin/users/${userId}/deposit`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount), reference, note }),
      });
      if (res.success) {
        setActiveModal(null);
        await fetchUserDetails();
      } else {
        setModalError(res.error?.message || 'Deposit failed');
      }
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setModalError(null);
    try {
      const res = await request(`/api/admin/users/${userId}/withdraw`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount), reference, note }),
      });
      if (res.success) {
        setActiveModal(null);
        await fetchUserDetails();
      } else {
        setModalError(res.error?.message || 'Withdrawal failed');
      }
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setModalError('A reason is mandatory for manual balance adjustments');
      return;
    }
    setIsProcessing(true);
    setModalError(null);
    try {
      const res = await request(`/api/admin/users/${userId}/adjustment`, {
        method: 'POST',
        body: JSON.stringify({ amount: Number(amount), reason: note }),
      });
      if (res.success) {
        setActiveModal(null);
        await fetchUserDetails();
      } else {
        setModalError(res.error?.message || 'Adjustment failed');
      }
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setModalError(null);
    try {
      const res = await request(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword }),
      });
      if (res.success) {
        setActiveModal(null);
        setNewPassword('');
        await fetchUserDetails();
      } else {
        setModalError(res.error?.message || 'Reset password failed');
      }
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStatusChange = async (target: 'ACTIVE' | 'SUSPENDED') => {
    setIsProcessing(true);
    try {
      const endpoint = target === 'SUSPENDED' ? 'suspend' : 'activate';
      const res = await request(`/api/admin/users/${userId}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ reason: 'Admin status update from console' }),
      });
      if (res.success) {
        setActiveModal(null);
        await fetchUserDetails();
      }
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || !data) {
    return (
      <div className="py-20 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
        <span>Loading player record {userId}...</span>
      </div>
    );
  }

  const { user, wallet, transactions, gameEntries, auditLogs } = data;

  return (
    <div className="space-y-6 pb-12 max-w-6xl mx-auto">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Players Registry</span>
      </button>

      {/* Main Header & Actions Strip */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-800 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-display font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              {user.userId.substring(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
                  {user.fullName}
                </h2>
                <span className="text-xs font-mono-sport text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
                  {user.userId}
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono-sport mt-0.5">
                Mobile: {user.mobile} · Created: {new Date(user.createdAt || '').toLocaleDateString()}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setAmount('1000');
                setReference('BANK-DEP-' + Math.floor(10000 + Math.random() * 90000));
                setNote('Direct bank transfer approved');
                setActiveModal('DEPOSIT');
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <ArrowDownLeft className="w-4 h-4" />
              <span>+ DEPOSIT</span>
            </button>

            <button
              onClick={() => {
                setAmount('500');
                setReference('PAYOUT-WDR-' + Math.floor(10000 + Math.random() * 90000));
                setNote('Player requested payout');
                setActiveModal('WITHDRAW');
              }}
              className="px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>- WITHDRAW</span>
            </button>

            <button
              onClick={() => {
                setAmount('100');
                setNote('');
                setActiveModal('ADJUST');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>ADJUST</span>
            </button>

            <button
              onClick={() => {
                setNewPassword('NewPass@123');
                setActiveModal('RESET_PASS');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              <span>RESET PW</span>
            </button>

            {user.status === 'ACTIVE' ? (
              <button
                onClick={() => handleStatusChange('SUSPENDED')}
                className="px-3 py-1.5 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 border border-rose-500/40 text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>SUSPEND</span>
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange('ACTIVE')}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/40 text-xs font-bold font-display uppercase tracking-wider flex items-center gap-1.5"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ACTIVATE</span>
              </button>
            )}
          </div>
        </div>

        {/* User Information & Wallet Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Balance</span>
            <span className="text-base sm:text-lg font-mono-sport font-extrabold text-amber-400">
              💵 {wallet.balance.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Available</span>
            <span className="text-base sm:text-lg font-mono-sport font-extrabold text-emerald-400">
              💵 {wallet.available_balance.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Deposits</span>
            <span className="text-base sm:text-lg font-mono-sport font-extrabold text-slate-200">
              💵 {wallet.total_deposits.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Withdrawals</span>
            <span className="text-base sm:text-lg font-mono-sport font-extrabold text-slate-200">
              💵 {wallet.total_withdrawals.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Game Stakes</span>
            <span className="text-base sm:text-lg font-mono-sport font-extrabold text-cyan-400">
              💵 {wallet.total_game_entries.toLocaleString()}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-center col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Winnings</span>
            <span className="text-base sm:text-lg font-mono-sport font-extrabold text-emerald-300">
              💵 {wallet.total_winnings.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Detail Sub-Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubTab('TRANSACTIONS')}
          className={`px-4 py-2 rounded-md text-xs font-bold font-display uppercase tracking-wider transition-all ${
            activeSubTab === 'TRANSACTIONS'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Transactions Ledger ({transactions.length})
        </button>

        <button
          onClick={() => setActiveSubTab('GAMES')}
          className={`px-4 py-2 rounded-md text-xs font-bold font-display uppercase tracking-wider transition-all ${
            activeSubTab === 'GAMES'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Game History ({gameEntries.length})
        </button>

        <button
          onClick={() => setActiveSubTab('AUDIT')}
          className={`px-4 py-2 rounded-md text-xs font-bold font-display uppercase tracking-wider transition-all ${
            activeSubTab === 'AUDIT'
              ? 'bg-amber-400 text-slate-950 shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Security Audit Trail ({auditLogs.length})
        </button>
      </div>

      {/* Sub-Tab Contents */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {activeSubTab === 'TRANSACTIONS' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-sport border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                  <th className="py-3 px-4">TX ID</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">AMOUNT</th>
                  <th className="py-3 px-4">BEFORE</th>
                  <th className="py-3 px-4">AFTER</th>
                  <th className="py-3 px-4">NOTES / REFERENCE</th>
                  <th className="py-3 px-4">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No transactions recorded for this user.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-300">{tx.transaction_id}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            tx.type === 'DEPOSIT'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : tx.type === 'WITHDRAWAL'
                              ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td
                        className={`py-3 px-4 font-bold ${
                          tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'REFUND'
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        💵 {tx.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        💵 {tx.balance_before.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-bold">
                        💵 {tx.balance_after.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={tx.notes}>
                        {tx.notes || tx.reference}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : activeSubTab === 'GAMES' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-sport border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                  <th className="py-3 px-4">BET ID</th>
                  <th className="py-3 px-4">MATCH</th>
                  <th className="py-3 px-4">SELECTION</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">ODDS</th>
                  <th className="py-3 px-4">STAKE</th>
                  <th className="py-3 px-4">RETURN</th>
                  <th className="py-3 px-4">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {gameEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-500">
                      No game entries for this user.
                    </td>
                  </tr>
                ) : (
                  gameEntries.map((bet) => (
                    <tr key={bet.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-300">{bet.id}</td>
                      <td className="py-3 px-4 text-slate-400">{bet.game_id}</td>
                      <td className="py-3 px-4 font-display font-bold text-white text-sm">
                        {bet.selection}
                      </td>
                      <td className="py-3 px-4 font-bold text-cyan-400">{bet.bet_type}</td>
                      <td className="py-3 px-4 text-amber-400 font-bold">{Number(bet.odds).toFixed(2)}</td>
                      <td className="py-3 px-4 text-slate-200">
                        💵 {Number(bet.stake).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        💵 {Number(bet.potential_return).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                          {bet.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-sport border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                  <th className="py-3 px-4">ACTION</th>
                  <th className="py-3 px-4">ACTOR</th>
                  <th className="py-3 px-4">REASON / NOTES</th>
                  <th className="py-3 px-4">NEW VALUE</th>
                  <th className="py-3 px-4">TIMESTAMP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No audit history for this player.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-amber-300">{log.action}</td>
                      <td className="py-3 px-4 text-slate-400">{log.actor_id}</td>
                      <td className="py-3 px-4 text-slate-300">{log.reason || 'None specified'}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono text-[11px] max-w-xs truncate">
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
        )}
      </div>

      {/* Dynamic Action Modals */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161d2a] border border-amber-500/40 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-display font-bold text-white text-base uppercase">
                {activeModal === 'DEPOSIT'
                  ? 'ADMIN DIRECT DEPOSIT'
                  : activeModal === 'WITHDRAW'
                  ? 'ADMIN WITHDRAWAL EXECUTION'
                  : activeModal === 'ADJUST'
                  ? 'ADMIN BALANCE ADJUSTMENT'
                  : 'RESET PLAYER PASSWORD'}
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Forms */}
            {activeModal === 'DEPOSIT' && (
              <form onSubmit={handleDeposit} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">
                    Deposit Amount (INR Demo) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport text-base font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">Reference</label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">
                    Audit Note / Explanation
                  </label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
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
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold uppercase tracking-wider"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm Deposit to Ledger'}
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'WITHDRAW' && (
              <form onSubmit={handleWithdraw} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">
                    Withdrawal Amount * (Max Available: 💵 {wallet.available_balance.toLocaleString()})
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={wallet.available_balance}
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport text-base font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">
                    Payment / Contact Reference
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">Audit Note</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
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
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold uppercase tracking-wider"
                  >
                    {isProcessing ? 'Processing...' : 'Confirm Withdrawal Debit'}
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'ADJUST' && (
              <form onSubmit={handleAdjustment} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">
                    Adjustment Amount (+/-) *
                  </label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport text-base font-bold focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-[10px] text-slate-400">
                    Use positive number to credit, negative number to debit.
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">
                    Mandatory Reason for Adjustment *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Manual correction due to settlement discrepancy"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
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
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-display font-bold uppercase tracking-wider"
                  >
                    {isProcessing ? 'Applying...' : 'Apply Ledger Adjustment'}
                  </button>
                </div>
              </form>
            )}

            {activeModal === 'RESET_PASS' && (
              <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block uppercase">
                    New Plaintext Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport text-base font-bold focus:outline-none focus:border-amber-400"
                  />
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
                    onClick={() => setActiveModal(null)}
                    className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold uppercase tracking-wider"
                  >
                    {isProcessing ? 'Hashing...' : 'Confirm Reset Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
