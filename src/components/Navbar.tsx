import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
  Trophy,
  Shield,
  User as UserIcon,
  LogOut,
  ChevronDown,
  Coins,
  History,
  Activity,
  CheckCircle2,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNavigateToAdmin?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNavigateToAdmin,
}) => {
  const { user, wallet, logout, quickLogin } = useAuth();
  const { isConnected, onlineCount } = useWebSocket();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const mainTabs = [
    { id: 'game', label: 'Live Match' },
    { id: 'lobby', label: 'Matches' },
    { id: 'results', label: 'Results' },
    { id: 'rules', label: 'Rules' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#080d17]/95 backdrop-blur-xl border-b border-slate-800/80 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-15 sm:h-16">
          {/* Logo & Brand - Authentic BetPro Exchange */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab('game')}
              className="flex items-center gap-2 group text-left cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <span className="font-black text-xl sm:text-2xl tracking-tighter text-white font-sans drop-shadow-sm">
                  BET<span className="text-[#f5a623]">PRO</span>
                </span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-mono-sport tracking-wider shadow-sm">
                  EXCH
                </span>
              </div>
            </button>

            {/* Desktop Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {mainTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer
                    ${
                      activeTab === tab.id
                        ? 'bg-amber-400/10 text-[#f5a623] font-black border border-amber-400/30 shadow-sm'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right Header Area: BetPro Balance + Exposure + User */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* BetPro Balance & Exposure */}
            {user && wallet && (
              <button
                onClick={() => setActiveTab('transactions')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-b from-[#131d2e] to-[#0c1422] border border-slate-700/80 hover:border-[#f5a623]/80 transition-all cursor-pointer text-left shadow-sm"
                title="Account Balances & Ledger"
              >
                <div className="text-right">
                  <div className="text-[10px] text-slate-400 font-mono-sport uppercase leading-tight">
                    Bal: <strong className="text-emerald-400 font-black">💵 {wallet.available_balance.toLocaleString()}</strong>
                  </div>
                </div>
              </button>
            )}

            {/* User Dropdown or Login */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold border border-slate-800 transition-colors cursor-pointer"
                >
                  <div className="w-5 h-5 rounded-md bg-slate-800 border border-slate-700 text-amber-400 flex items-center justify-center font-bold text-[10px]">
                    {user.userId.substring(0, 2)}
                  </div>
                  <span className="hidden sm:inline font-mono-sport text-slate-300">{user.userId}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-[#141b26] border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-fadeIn">
                    <div className="px-4 py-2 border-b border-slate-800">
                      <div className="text-xs font-bold text-white truncate">{user.fullName}</div>
                      <div className="text-[11px] text-slate-400 font-mono-sport">{user.userId}</div>
                    </div>

                    {(user.role === 'ADMIN' && (window.location.hash === '#admin-panel' || window.location.hash === '#admin')) && (
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          onNavigateToAdmin?.();
                        }}
                        className="w-full text-left px-4 py-2 text-xs text-amber-400 hover:bg-slate-800 flex items-center gap-2 font-bold cursor-pointer"
                      >
                        <Shield className="w-4 h-4 text-amber-400" />
                        Admin Dashboard
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setActiveTab('transactions');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <History className="w-4 h-4 text-slate-400" />
                      Transaction Ledger
                    </button>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        setActiveTab('profile');
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <UserIcon className="w-4 h-4 text-slate-400" />
                      My Profile
                    </button>

                    <div className="border-t border-slate-800 my-1"></div>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-xs text-rose-400 hover:bg-slate-800 flex items-center gap-2 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveTab('login')}
                  className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-sm"
                >
                  Sign In
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
