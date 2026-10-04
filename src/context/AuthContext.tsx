import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Wallet } from '../types';
import { request, setAuthToken, clearAuthToken, getAuthToken, ApiResponse } from '../services/api';

interface AuthContextType {
  user: User | null;
  wallet: Wallet | null;
  isLoading: boolean;
  login: (userId: string, password: string, role?: 'ADMIN' | 'USER', twoFactorCode?: string) => Promise<ApiResponse>;
  logout: () => Promise<void>;
  refreshWallet: () => Promise<void>;
  quickLogin: (userId: string, role?: 'ADMIN' | 'USER', twoFactorCode?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    const token = getAuthToken();
    if (!token) {
      // Auto-assign starter demo account USER1001 so player immediately has points to place bets
      try {
        const autoRes = await login('USER1001', 'User@123', 'USER');
        if (autoRes.success) {
          setIsLoading(false);
          return;
        }
      } catch {
        // Ignore fallback
      }
      setIsLoading(false);
      return;
    }

    try {
      const res = await request<{ user: User; wallet: Wallet }>('/api/auth/me');
      if (res.success && res.data) {
        setUser(res.data.user);
        setWallet(res.data.wallet);
      } else {
        clearAuthToken();
        setUser(null);
        setWallet(null);
      }
    } catch {
      clearAuthToken();
      setUser(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (
    userId: string,
    password: string,
    role: 'ADMIN' | 'USER' = 'USER',
    twoFactorCode?: string
  ): Promise<ApiResponse> => {
    const res = await request<{ user: User; token: string; wallet: Wallet }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ userId, password, role, twoFactorCode }),
    });

    if (res.success && res.data) {
      setAuthToken(res.data.token);
      setUser(res.data.user);
      setWallet(res.data.wallet);
    }

    return res;
  };

  const logout = async () => {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore
    } finally {
      clearAuthToken();
      setUser(null);
      setWallet(null);
    }
  };

  const refreshWallet = async () => {
    if (!user) return;
    try {
      const res = await request<Wallet>('/api/wallet/my-wallet');
      if (res.success && res.data) {
        setWallet(res.data);
      }
    } catch (e) {
      console.error('Failed to refresh wallet:', e);
    }
  };

  const quickLogin = async (targetId: string, role: 'ADMIN' | 'USER' = 'USER', twoFactorCode?: string) => {
    setIsLoading(true);
    try {
      const password = role === 'ADMIN' ? 'Admin@123' : 'User@123';
      const code = role === 'ADMIN' ? (twoFactorCode || '123456') : undefined;
      await login(targetId, password, role, code);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        isLoading,
        login,
        logout,
        refreshWallet,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
