import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { request } from '../services/api';
import { WalletTransaction, GameEntry } from '../types';
import { ReceiptText, RefreshCw, Trophy, ArrowDownLeft, ArrowUpRight, CheckCircle2, Clock } from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { user, wallet, refreshWallet } = useAuth();
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'BETS'>('TRANSACTIONS');
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [bets, setBets] = useState<GameEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [txRes, betRes] = await Promise.all([
        request<WalletTransaction[]>('/api/wallet/transactions'),
        request<GameEntry[]>('/api/wallet/my-bets'),
      ]);

      if (txRes.success && txRes.data) setTransactions(txRes.data);
      if (betRes.success && betRes.data) setBets(betRes.data);
      await refreshWallet();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (!user) {
    return (
      <div className="py-16 text-center text-slate-400">
        Please log in to view your ledger transactions.
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
            WALLET & TRANSACTION LEDGER
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Immutable financial records and game entries for {user.userId}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
            <button
              onClick={() => setActiveTab('TRANSACTIONS')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'TRANSACTIONS'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Ledger Transactions
            </button>
            <button
              onClick={() => setActiveTab('BETS')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'BETS'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My Super Over Bets
            </button>
          </div>

          <button
            onClick={fetchData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400">Loading ledger records...</div>
      ) : activeTab === 'TRANSACTIONS' ? (
        <div className="bg-[#121721] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-sport border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                  <th className="py-3 px-4">TX ID</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">AMOUNT</th>
                  <th className="py-3 px-4">BALANCE BEFORE</th>
                  <th className="py-3 px-4">BALANCE AFTER</th>
                  <th className="py-3 px-4">REFERENCE / NOTE</th>
                  <th className="py-3 px-4">DATE & TIME</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-500">
                      No transactions recorded yet in ledger.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isCredit =
                      tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'REFUND';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-bold text-slate-200">{tx.transaction_id}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.type === 'DEPOSIT'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                : tx.type === 'WITHDRAWAL'
                                ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                                : tx.type === 'WIN'
                                ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                                : tx.type === 'GAME_ENTRY'
                                ? 'bg-rose-950 text-rose-300 border border-rose-500/40'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td
                          className={`py-3 px-4 font-bold text-sm ${
                            isCredit ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isCredit ? '+' : '-'}💵 {tx.amount.toLocaleString()}
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
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-[#121721] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-sport border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                  <th className="py-3 px-4">BET ID</th>
                  <th className="py-3 px-4">SELECTION</th>
                  <th className="py-3 px-4">TYPE</th>
                  <th className="py-3 px-4">ODDS</th>
                  <th className="py-3 px-4">STAKE</th>
                  <th className="py-3 px-4">POTENTIAL WIN</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">DATE</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {bets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-500">
                      No Super Over bets placed yet.
                    </td>
                  </tr>
                ) : (
                  bets.map((bet) => (
                    <tr key={bet.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-200">{bet.id}</td>
                      <td className="py-3 px-4 font-bold text-white font-display text-sm">
                        {bet.selection}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            bet.bet_type === 'BACK'
                              ? 'bg-cyan-950 text-cyan-300'
                              : 'bg-rose-950 text-rose-300'
                          }`}
                        >
                          {bet.bet_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-400">
                        {Number(bet.odds).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-200 font-bold">
                        💵 {Number(bet.stake).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-bold">
                        💵 {Number(bet.potential_return).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            bet.status === 'WON'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : bet.status === 'LOST'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          }`}
                        >
                          {bet.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(bet.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
