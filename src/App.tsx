/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import { Navbar } from './components/Navbar';
import { MobileNav } from './components/MobileNav';

// User Pages
import { GamePage } from './pages/GamePage';
import { LobbyPage } from './pages/LobbyPage';
import { ResultsPage } from './pages/ResultsPage';
import { VerifyPage } from './pages/VerifyPage';
import { RulesPage } from './pages/RulesPage';
import { ProfilePage } from './pages/ProfilePage';
import { TransactionsPage } from './pages/TransactionsPage';
import { LoginPage } from './pages/LoginPage';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsers } from './pages/admin/AdminUsers';
import { AdminUserDetail } from './pages/admin/AdminUserDetail';
import { AdminGames } from './pages/admin/AdminGames';
import { AdminLiveControl } from './pages/admin/AdminLiveControl';
import { AdminTransactions } from './pages/admin/AdminTransactions';
import { AdminAudit } from './pages/admin/AdminAudit';
import { AdminSettings } from './pages/admin/AdminSettings';
import { AdminTestSuite } from './pages/admin/AdminTestSuite';

import {
  Shield,
  Users,
  Trophy,
  Radio,
  ArrowDownLeft,
  ArrowUpRight,
  ReceiptText,
  FileCheck,
  Settings,
  Flame,
  ArrowLeft,
  PlayCircle,
} from 'lucide-react';

const MainApp: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('game');
  const [selectedVerifyGameId, setSelectedVerifyGameId] = useState<string | null>(null);
  const [selectedAdminUserId, setSelectedAdminUserId] = useState<string | null>(null);
  const [isAdminView, setIsAdminView] = useState<boolean>(false);
  const [adminTab, setAdminTab] = useState<string>('dashboard');

  // Hidden Admin Access via URL hash
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === '#admin-panel' || window.location.hash === '#admin') {
        if (user && user.role === 'ADMIN') {
          setIsAdminView(true);
          setAdminTab('dashboard');
        } else {
          // If not admin, maybe redirect to login or show alert
          setActiveTab('login');
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user]);

  const handleNavigateToVerify = (gameId: string) => {
    setSelectedVerifyGameId(gameId);
    setActiveTab('verify');
    setIsAdminView(false);
  };

  const handleSelectAdminUser = (userId: string) => {
    setSelectedAdminUserId(userId);
    setAdminTab('user-detail');
  };

  const adminNavItems = [
    { id: 'dashboard', label: 'Overview', icon: Trophy },
    { id: 'users', label: 'Players', icon: Users },
    { id: 'live', label: 'Live Console', icon: Radio },
    { id: 'games', label: 'Matches', icon: PlayCircle },
    { id: 'deposits', label: 'Deposits', icon: ArrowDownLeft },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpRight },
    { id: 'wallet', label: 'Ledger', icon: ReceiptText },
    { id: 'audit', label: 'Audit Trail', icon: FileCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'tests', label: 'System Health', icon: Flame },
  ];

  return (
    <div className="min-h-screen bg-stadium-mesh text-slate-100 flex flex-col selection:bg-amber-400/30 selection:text-amber-300">
      {/* Top Navbar */}
      <Navbar
        activeTab={isAdminView ? 'admin' : activeTab}
        setActiveTab={(tab) => {
          setIsAdminView(false);
          setActiveTab(tab);
        }}
        onNavigateToAdmin={() => {
          setIsAdminView(true);
          setAdminTab('dashboard');
        }}
      />

      {/* Admin Secondary Navigation Header if in Admin Mode */}
      {isAdminView && (
        <div className="bg-[#121721] border-b border-amber-500/30 px-3 sm:px-6 py-2.5 shadow-md">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
              <span className="text-[10px] uppercase font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30 flex items-center gap-1 font-mono-sport">
                <Shield className="w-3.5 h-3.5" /> ROOT ADMIN
              </span>

              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = adminTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setAdminTab(item.id);
                      if (item.id !== 'user-detail') setSelectedAdminUserId(null);
                    }}
                    className={`
                      px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5
                      ${
                        isActive
                          ? 'bg-amber-400 text-slate-950 font-bold shadow-sm'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800'
                      }
                    `}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsAdminView(false)}
              className="text-xs text-slate-400 hover:text-amber-400 font-semibold flex items-center gap-1 self-start md:self-center transition-colors font-mono-sport"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Game View</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-5 sm:py-6">
        {isAdminView ? (
          // ================= ADMIN VIEW =================
          <div>
            {adminTab === 'dashboard' && <AdminDashboard onNavigateTab={(tab) => setAdminTab(tab)} />}
            {adminTab === 'users' && <AdminUsers onSelectUser={handleSelectAdminUser} />}
            {adminTab === 'user-detail' && selectedAdminUserId && (
              <AdminUserDetail
                userId={selectedAdminUserId}
                onBack={() => {
                  setSelectedAdminUserId(null);
                  setAdminTab('users');
                }}
              />
            )}
            {adminTab === 'games' && <AdminGames />}
            {adminTab === 'live' && <AdminLiveControl />}
            {adminTab === 'deposits' && <AdminTransactions filterType="DEPOSIT" />}
            {adminTab === 'withdrawals' && <AdminTransactions filterType="WITHDRAWAL" />}
            {adminTab === 'wallet' && <AdminTransactions />}
            {adminTab === 'audit' && <AdminAudit />}
            {adminTab === 'settings' && <AdminSettings />}
            {adminTab === 'tests' && <AdminTestSuite />}
          </div>
        ) : (
          // ================= USER VIEW =================
          <div>
            {activeTab === 'game' && (
              <GamePage
                onNavigateToVerify={handleNavigateToVerify}
                onNavigateToRules={() => setActiveTab('rules')}
              />
            )}

            {activeTab === 'lobby' && (
              <LobbyPage
                onSelectGame={(gameId) => {
                  setActiveTab('game');
                }}
              />
            )}

            {activeTab === 'results' && (
              <ResultsPage onNavigateToVerify={handleNavigateToVerify} />
            )}

            {activeTab === 'verify' && (
              <VerifyPage
                gameId={selectedVerifyGameId || 'gm_comp_03'}
                onBack={() => setActiveTab('results')}
              />
            )}

            {activeTab === 'rules' && <RulesPage />}

            {activeTab === 'profile' && (
              <ProfilePage onNavigateToLogin={() => setActiveTab('login')} />
            )}

            {activeTab === 'transactions' && <TransactionsPage />}

            {activeTab === 'login' && (
              <LoginPage
                onSuccess={() => {
                  setActiveTab('game');
                }}
              />
            )}
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={isAdminView ? 'admin' : activeTab}
        setActiveTab={(tab) => {
          setIsAdminView(false);
          setActiveTab(tab);
        }}
        onNavigateToAdmin={() => {
          setIsAdminView(true);
          setAdminTab('dashboard');
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <MainApp />
      </WebSocketProvider>
    </AuthProvider>
  );
}
