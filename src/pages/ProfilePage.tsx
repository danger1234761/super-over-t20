import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, ShieldCheck, Coins, LogOut, CheckCircle, Clock } from 'lucide-react';

interface ProfilePageProps {
  onNavigateToLogin: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onNavigateToLogin }) => {
  const { user, wallet, logout } = useAuth();

  if (!user) {
    return (
      <div className="py-16 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
          <User className="w-6 h-6 text-amber-400" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">Account Login Required</h3>
        <p className="text-xs text-slate-400 mb-4">
          Please log in to your assigned player account to view your profile and wallet ledger.
        </p>
        <button
          onClick={onNavigateToLogin}
          className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-colors"
        >
          GO TO LOGIN
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
          PLAYER PROFILE
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Account information, wallet status, and player limits
        </p>
      </div>

      {/* Main Profile Info Card */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 font-display font-black text-xl flex items-center justify-center shadow-md">
              {user.userId.substring(0, 2)}
            </div>
            <div>
              <h3 className="font-display font-bold text-white text-lg">{user.fullName}</h3>
              <div className="text-xs text-slate-400 font-mono-sport">{user.userId}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`text-xs font-bold font-mono-sport px-2.5 py-1 rounded-full uppercase ${
                user.status === 'ACTIVE'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
              }`}
            >
              {user.status}
            </span>
            <span className="text-xs font-bold font-mono-sport px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
              ROLE: {user.role}
            </span>
          </div>
        </div>

        {/* User Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono-sport">
          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block uppercase text-[10px] font-sans font-semibold">
              Registered Mobile
            </span>
            <span className="text-slate-200 font-bold text-sm">{user.mobile}</span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block uppercase text-[10px] font-sans font-semibold">
              KYC Status
            </span>
            <span className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4" /> VERIFIED (TIER 1)
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block uppercase text-[10px] font-sans font-semibold">
              Account Created
            </span>
            <span className="text-slate-300">
              {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block uppercase text-[10px] font-sans font-semibold">
              Last Login
            </span>
            <span className="text-slate-300">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Just now'}
            </span>
          </div>
        </div>
      </div>

      {/* Wallet Summary */}
      {wallet && (
        <div className="bg-[#121721] border border-amber-500/30 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <h3 className="font-display font-bold text-white text-base">WALLET BALANCES</h3>
            </div>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-mono-sport flex items-center gap-1">
              <span>💵</span>
              <span>CASH WALLET</span>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Balance</div>
              <div className="text-lg font-mono-sport font-extrabold text-amber-400 mt-0.5">
                💵 {wallet.balance.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Available Balance</div>
              <div className="text-lg font-mono-sport font-extrabold text-emerald-400 mt-0.5">
                💵 {wallet.available_balance.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Deposited</div>
              <div className="text-lg font-mono-sport font-extrabold text-slate-200 mt-0.5">
                💵 {wallet.total_deposits.toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Winnings</div>
              <div className="text-lg font-mono-sport font-extrabold text-cyan-400 mt-0.5">
                💵 {wallet.total_winnings.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compliance and Limits */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl p-5 space-y-3">
        <h4 className="font-display font-bold text-white text-sm flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>RESPONSIBLE GAMING & CONTROLS</span>
        </h4>
        <div className="text-xs text-slate-400 space-y-1.5">
          <p>
            • Daily Limit: <strong>💵 50,000</strong> (Configured by admin)
          </p>
          <p>• Self-Exclusion Status: <strong>NOT EXCLUDED</strong> (Account in good standing)</p>
          <p>
            • To request limit adjustments or account cooling-off periods, contact system administration.
          </p>
        </div>
      </div>

      {/* Logout Action */}
      <div className="pt-2">
        <button
          onClick={logout}
          className="w-full py-3 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 font-display font-bold text-xs uppercase tracking-wider border border-rose-500/40 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          <span>LOGOUT FROM ACCOUNT</span>
        </button>
      </div>
    </div>
  );
};
