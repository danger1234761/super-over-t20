import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { WalletTransaction, TransactionType } from '../../types';
import { ReceiptText, RefreshCw, Filter, Search } from 'lucide-react';

interface AdminTransactionsProps {
  filterType?: TransactionType;
}

export const AdminTransactions: React.FC<AdminTransactionsProps> = ({ filterType }) => {
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>(filterType || 'ALL');
  const [search, setSearch] = useState('');

  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const url =
        selectedType === 'ALL'
          ? '/api/admin/wallet/transactions'
          : `/api/admin/wallet/transactions?type=${selectedType}`;
      const res = await request<WalletTransaction[]>(url);
      if (res.success && res.data) {
        setTransactions(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedType]);

  const filtered = transactions.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.transaction_id.toLowerCase().includes(q) ||
      t.user_id.toLowerCase().includes(q) ||
      (t.reference && t.reference.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wider flex items-center gap-2">
            <ReceiptText className="w-6 h-6 text-amber-400" />
            <span>FINANCIAL LEDGER TRANSACTIONS</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Immutable system-wide ledger of all player deposits, withdrawals, wagers, and adjustments
          </p>
        </div>

        <button
          onClick={fetchTransactions}
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
            placeholder="Search TX ID, Player ID, Reference..."
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono-sport"
          />
        </div>

        {/* Type tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg overflow-x-auto w-full md:w-auto">
          {(['ALL', 'DEPOSIT', 'WITHDRAWAL', 'GAME_ENTRY', 'WIN', 'ADJUSTMENT', 'REFUND'] as const).map(
            (type) => (
              <button
                key={type}
                onClick={() => setSelectedType(type)}
                className={`
                  px-2.5 py-1 rounded text-xs font-bold transition-all whitespace-nowrap
                  ${
                    selectedType === type
                      ? 'bg-amber-400 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }
                `}
              >
                {type}
              </button>
            )
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono-sport border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                <th className="py-3 px-4">TX ID</th>
                <th className="py-3 px-4">PLAYER</th>
                <th className="py-3 px-4">TYPE</th>
                <th className="py-3 px-4">AMOUNT</th>
                <th className="py-3 px-4">BEFORE</th>
                <th className="py-3 px-4">AFTER</th>
                <th className="py-3 px-4">ADMIN ACTOR</th>
                <th className="py-3 px-4">NOTES / REFERENCE</th>
                <th className="py-3 px-4">TIMESTAMP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading transactions...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map((tx) => {
                  const isCredit =
                    tx.type === 'DEPOSIT' || tx.type === 'WIN' || tx.type === 'REFUND';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-bold text-slate-200">{tx.transaction_id}</td>
                      <td className="py-3 px-4 font-bold text-amber-300">{tx.user_id}</td>
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
                        className={`py-3 px-4 font-bold ${
                          isCredit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isCredit ? '+' : '-'}💵 {tx.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400">💵 {tx.balance_before.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-200 font-bold">
                        💵 {tx.balance_after.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-sans">{tx.admin_id || 'System'}</td>
                      <td className="py-3 px-4 text-slate-300 max-w-xs truncate" title={tx.notes}>
                        {tx.notes || tx.reference}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
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
    </div>
  );
};
