import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Trophy, Shield, User, Lock, AlertCircle, KeyRound, ArrowRight } from 'lucide-react';

interface LoginPageProps {
  onSuccess: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login, quickLogin } = useAuth();
  const [roleMode, setRoleMode] = useState<'USER' | 'ADMIN'>('USER');

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [show2FAInput, setShow2FAInput] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!userId || !password) {
      setErrorMessage('Please enter both ID and password');
      return;
    }

    setIsLoading(true);

    try {
      const res = await login(userId, password, roleMode, twoFactorCode);

      if (res.success) {
        onSuccess();
      } else if (res.requires2FA) {
        setShow2FAInput(true);
        setTwoFactorCode(''); // Do not pre-fill for professional launch
      } else {
        setErrorMessage(res.error?.message || 'Authentication failed');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Login error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFastDemoLogin = async (id: string, role: 'USER' | 'ADMIN', code?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      await quickLogin(id, role, code);
      onSuccess();
    } catch (err: any) {
      setErrorMessage(err.message || 'Fast login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Role toggle tabs - Hidden from normal users, only accessible via #admin-panel hash
  const isAdminHash = window.location.hash === '#admin-panel';

  return (
    <div className="max-w-md mx-auto py-8 sm:py-14 px-4 space-y-6">
      {/* Brand Header */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 p-0.5 shadow-xl shadow-amber-500/20 mx-auto flex items-center justify-center">
          <div className="w-full h-full bg-[#0b0e14] rounded-[14px] flex items-center justify-center">
            <Trophy className="w-7 h-7 text-amber-400" />
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-wider">
          SUPER OVER T20
        </h1>
        <p className="text-xs text-slate-400">
          Enter your assigned player credentials
        </p>
      </div>

      {/* Role Toggle Tabs - Only show if hash is present */}
      {isAdminHash && (
        <div className="p-1 bg-[#121721] border border-slate-800 rounded-xl grid grid-cols-2 gap-1">
          <button
            type="button"
            onClick={() => {
              setRoleMode('USER');
              setShow2FAInput(false);
              setErrorMessage(null);
            }}
            className={`
              py-2.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2
              ${
                roleMode === 'USER'
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'text-slate-400 hover:text-white'
              }
            `}
          >
            <User className="w-4 h-4" />
            <span>PLAYER LOGIN</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRoleMode('ADMIN');
              setErrorMessage(null);
            }}
            className={`
              py-2.5 rounded-lg text-xs font-display font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2
              ${
                roleMode === 'ADMIN'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                  : 'text-slate-400 hover:text-white'
              }
            `}
          >
            <Shield className="w-4 h-4" />
            <span>ADMIN LOGIN</span>
          </button>
        </div>
      )}

      {/* Login Card */}
      <div className="bg-[#121721] border border-amber-500/30 rounded-2xl p-6 shadow-2xl shadow-black/80 space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User ID field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
              {roleMode === 'ADMIN' ? 'ADMIN USERNAME / ID' : 'USER ID'}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500">
                <User className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder={roleMode === 'ADMIN' ? 'Enter Administrator ID' : 'Enter User ID'}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white font-mono-sport focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 block uppercase tracking-wider">
              PASSWORD
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-3 text-slate-500">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400"
                required
              />
            </div>
          </div>

          {/* 2FA Input (shown for Admin or when prompted) */}
          {(show2FAInput || roleMode === 'ADMIN') && (
            <div className="space-y-1.5 p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>2FA AUTHENTICATOR CODE</span>
                </label>
              </div>
              <input
                type="text"
                maxLength={6}
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                placeholder="6-digit code"
                className="w-full bg-slate-900 border border-amber-500/60 rounded-lg px-3 py-2 text-sm text-center text-amber-300 font-mono-sport tracking-widest font-bold focus:outline-none"
              />
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`
              w-full py-3.5 rounded-xl font-display font-extrabold text-sm uppercase tracking-wider transition-all duration-200 shadow-lg cursor-pointer
              ${
                roleMode === 'ADMIN'
                  ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-300 text-slate-950 shadow-amber-500/20'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }
            `}
          >
            {isLoading
              ? 'AUTHENTICATING...'
              : roleMode === 'ADMIN'
              ? 'SIGN IN TO ADMIN CONSOLE'
              : 'ENTER SUPER OVER T20'}
          </button>
        </form>

        {/* Notice regarding registration */}
        <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-800">
          User registration is restricted. Only system administrators can provision new accounts.
        </div>
      </div>
    </div>
  );
};
