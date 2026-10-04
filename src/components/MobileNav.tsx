import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Compass, ReceiptText, Shield, User } from 'lucide-react';

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onNavigateToAdmin?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  setActiveTab,
  onNavigateToAdmin,
}) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const navItems = [
    { id: 'game', label: 'Match', icon: Trophy },
    { id: 'lobby', label: 'Lobby', icon: Compass },
    { id: 'transactions', label: 'Wallet', icon: ReceiptText },
    ...(isAdmin && (window.location.hash === '#admin-panel' || window.location.hash === '#admin' || activeTab === 'admin') ? [{ id: 'admin', label: 'Admin', icon: Shield, isAction: true }] : []),
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1117]/95 backdrop-blur-md border-t border-slate-800/80 px-2 py-1 safe-area-pb">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.isAction) {
                  onNavigateToAdmin?.();
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`
                flex flex-col items-center justify-center py-1.5 px-3 rounded-lg transition-colors
                ${
                  isActive
                    ? 'text-[#f5a623] font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }
              `}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
