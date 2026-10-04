import React, { useState, useEffect } from 'react';
import { Game, GameEntry } from '../types';
import { Lock, Info, Check, AlertCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { request } from '../services/api';
import { TeamFlag } from './TeamFlag';
import confetti from 'canvas-confetti';

interface MatchOddsProps {
  game: Game;
  onBetPlaced?: () => void;
}

export const MatchOdds: React.FC<MatchOddsProps> = ({ game, onBetPlaced }) => {
  const { user, wallet, refreshWallet } = useAuth();

  // Active selection modal - null by default, user must click to select
  const [selectedBet, setSelectedBet] = useState<{
    team: string;
    type: 'BACK' | 'LAY';
    odds: number;
  } | null>(null);

  const [stake, setStake] = useState<number>(500);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [myMatchedBets, setMyMatchedBets] = useState<GameEntry[]>([]);
  const [showBookmaker, setShowBookmaker] = useState(false);

  // Keep odds up to date when game updates
  useEffect(() => {
    if (selectedBet) {
      if (selectedBet.team === game.team_a) {
        setSelectedBet((prev) =>
          prev
            ? {
                ...prev,
                odds:
                  prev.type === 'BACK'
                    ? game.back_odds_team_a || 1.95
                    : game.lay_odds_team_a || 2.05,
              }
            : null
        );
      } else if (selectedBet.team === game.team_b) {
        setSelectedBet((prev) =>
          prev
            ? {
                ...prev,
                odds:
                  prev.type === 'BACK'
                    ? game.back_odds_team_b || 1.95
                    : game.lay_odds_team_b || 2.05,
              }
            : null
        );
      }
    }
  }, [game.id, game.back_odds_team_a, game.back_odds_team_b]);

  // Fetch user's active bets for this game
  const fetchMyBets = async () => {
    if (!user) return;
    try {
      const res = await request<GameEntry[]>('/api/wallet/my-bets');
      if (res.success && res.data) {
        const gameBets = res.data.filter((b) => b.game_id === game.id);
        setMyMatchedBets(gameBets);
      }
    } catch {
      // quiet fail
    }
  };

  useEffect(() => {
    fetchMyBets();
  }, [user, game.id]);

  // Server-authoritative lock: locked if status is not OPEN or remaining_seconds reached 0
  const isLocked =
    game.status !== 'OPEN' ||
    (game.remaining_seconds !== undefined && game.remaining_seconds <= 0);

  const quickStakes = [500, 1000, 2500, 5000, 10000, 25000];

  const handleSelectSlip = (team: string, type: 'BACK' | 'LAY', odds: number) => {
    if (isLocked) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    if (selectedBet?.team === team && selectedBet?.type === type) {
      // Toggle or keep active
      setSelectedBet({ team, type, odds });
    } else {
      setSelectedBet({ team, type, odds });
    }
  };

  const handlePlaceBet = async () => {
    if (!user) {
      setErrorMessage('Please login to place bets');
      return;
    }

    if (!selectedBet) {
      setErrorMessage('Please select Back or Lay price');
      return;
    }

    if (isLocked) {
      setErrorMessage('Market is suspended. Betting is closed.');
      return;
    }

    if (stake <= 0) {
      setErrorMessage('Please enter a valid stake amount');
      return;
    }

    if (stake < 500) {
      setErrorMessage('Minimum bet amount is 💵 500');
      return;
    }

    if (wallet && wallet.available_balance < stake) {
      setErrorMessage(
        `Insufficient balance (Available: 💵 ${wallet.available_balance.toLocaleString()})`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await request(`/api/games/${game.id}/bet`, {
        method: 'POST',
        body: JSON.stringify({
          selection: selectedBet.team,
          betType: selectedBet.type,
          stake,
          odds: selectedBet.odds,
        }),
      });

      if (res.success) {
        setSuccessMessage(`Bet of 💵 ${stake.toLocaleString()} matched on ${selectedBet.team}!`);
        await refreshWallet();
        await fetchMyBets();
        onBetPlaced?.();

        // Celebration confetti for active wager
        confetti({
          particleCount: 35,
          spread: 45,
          origin: { y: 0.8 },
        });

        setTimeout(() => {
          setSuccessMessage(null);
          setSelectedBet(null);
        }, 1200);
      } else {
        setErrorMessage(res.error?.message || 'Failed to place bet');
      }
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to place bet');
    } finally {
      setIsSubmitting(false);
    }
  };

  // P&L Calculations: 10 points/rupees cutting per 500 won
  const potentialReturn = selectedBet
    ? selectedBet.type === 'BACK'
      ? Math.round(stake * selectedBet.odds)
      : Math.round(stake * (selectedBet.odds - 1))
    : 0;

  const commission = Math.round((potentialReturn / 500) * 10);
  const netReceived = Math.max(0, potentialReturn - commission);

  const netProfit = selectedBet
    ? selectedBet.type === 'BACK'
      ? Math.max(0, netReceived - stake)
      : netReceived
    : 0;

  // Projected BetPro P&L for runners based on current active selection
  const getProjectedPL = (teamName: string) => {
    if (!selectedBet || stake <= 0) return 0;
    if (selectedBet.type === 'BACK') {
      if (selectedBet.team === teamName) {
        return netProfit;
      } else {
        return -stake;
      }
    } else {
      // LAY
      if (selectedBet.team === teamName) {
        return -stake;
      } else {
        return netProfit;
      }
    }
  };

  const plTeamA = getProjectedPL(game.team_a);
  const plTeamB = getProjectedPL(game.team_b);

  const renderBetSlip = (runnerName: string) => {
    if (!selectedBet || selectedBet.team !== runnerName) return null;

    const isBack = selectedBet.type === 'BACK';

    return (
      <div
        className={`col-span-12 p-3 sm:p-4 border-y transition-all ${
          isBack
            ? 'bg-[#122238] border-sky-500/50'
            : 'bg-[#29141f] border-rose-500/50'
        }`}
      >
        {/* Bet Slip Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-700/60 mb-3">
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-black uppercase tracking-wider font-mono-sport ${
                isBack
                  ? 'bg-[#72bbef] text-slate-950 shadow-sm'
                  : 'bg-[#faa9ba] text-slate-950 shadow-sm'
              }`}
            >
              {isBack ? 'BACK' : 'LAY'}
            </span>
            <TeamFlag team={selectedBet.team} size="xs" shape="rounded" />
            <span className="font-extrabold text-white text-sm">
              {selectedBet.team}
            </span>
            <span className="text-amber-400 font-mono-sport font-black text-xs">
              @{selectedBet.odds.toFixed(2)}
            </span>
          </div>

          <button
            onClick={() => setSelectedBet(null)}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800/80 cursor-pointer"
            title="Close Bet Slip"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Odds & Stake Steppers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          {/* Odds Display / Stepper */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 font-mono-sport">
              Odds / Rate:
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isLocked || selectedBet.odds <= 1.05}
                onClick={() =>
                  setSelectedBet((prev) =>
                    prev ? { ...prev, odds: Math.max(1.01, +(prev.odds - 0.05).toFixed(2)) } : null
                  )
                }
                className="h-10 w-9 rounded bg-[#182333] hover:bg-[#202e42] border border-slate-700 text-white font-mono-sport font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                -
              </button>
              <div className="flex-1 bg-[#0b121c] border border-slate-700 rounded h-10 flex items-center justify-center font-mono-sport font-extrabold text-amber-400 text-base">
                {selectedBet.odds.toFixed(2)}
              </div>
              <button
                type="button"
                disabled={isLocked}
                onClick={() =>
                  setSelectedBet((prev) =>
                    prev ? { ...prev, odds: +(prev.odds + 0.05).toFixed(2) } : null
                  )
                }
                className="h-10 w-9 rounded bg-[#182333] hover:bg-[#202e42] border border-slate-700 text-white font-mono-sport font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>

          {/* Stake Input */}
          <div>
            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1 font-mono-sport">
              Stake Amount (Cash):
            </label>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={isLocked || stake <= 500}
                onClick={() => setStake((prev) => Math.max(500, prev - 500))}
                className="h-10 w-9 rounded bg-[#182333] hover:bg-[#202e42] border border-slate-700 text-white font-mono-sport font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                -
              </button>
              <div className="relative flex-1">
                <span className="absolute left-2.5 top-2.5 text-xs">💵</span>
                <input
                  type="number"
                  min={500}
                  step={100}
                  disabled={isLocked}
                  value={stake}
                  onChange={(e) => setStake(Math.max(0, Number(e.target.value)))}
                  className="w-full h-10 bg-[#0b121c] border border-slate-700 rounded pl-8 pr-2 text-white font-mono-sport font-black text-sm focus:outline-none focus:border-[#f5a623]"
                />
              </div>
              <button
                type="button"
                disabled={isLocked}
                onClick={() => setStake((prev) => prev + 500)}
                className="h-10 w-9 rounded bg-[#182333] hover:bg-[#202e42] border border-slate-700 text-white font-mono-sport font-black text-sm flex items-center justify-center cursor-pointer disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* BetPro Quick Stake Chips */}
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-3">
          {quickStakes.map((amt) => (
            <button
              key={amt}
              type="button"
              disabled={isLocked}
              onClick={() => setStake(amt)}
              className={`py-1.5 rounded text-xs font-mono-sport font-bold transition-all border cursor-pointer ${
                stake === amt
                  ? 'bg-[#f5a623] text-slate-950 border-[#f5a623] shadow-sm font-black'
                  : 'bg-[#182333] hover:bg-[#223147] text-slate-200 border-slate-700'
              }`}
            >
              {amt >= 1000 ? `${amt / 1000}K` : amt}
            </button>
          ))}
          <button
            type="button"
            disabled={isLocked || !wallet || wallet.available_balance <= 0}
            onClick={() => wallet && setStake(wallet.available_balance)}
            className="py-1.5 rounded text-xs font-mono-sport font-bold bg-[#182333] hover:bg-[#f5a623] hover:text-slate-950 text-amber-400 border border-amber-400/40 cursor-pointer"
          >
            MAX
          </button>
          <button
            type="button"
            disabled={isLocked}
            onClick={() => setStake(0)}
            className="py-1.5 rounded text-xs font-mono-sport font-bold bg-[#182333] hover:bg-slate-700 text-slate-400 border border-slate-700 cursor-pointer"
          >
            CLR
          </button>
        </div>

        {/* P&L Breakdown Summary */}
        <div className="bg-[#0b121c] border border-slate-800 rounded-lg p-2.5 mb-3 flex flex-wrap items-center justify-between text-xs font-mono-sport gap-2">
          <div>
            <span className="text-slate-400">Profit: </span>
            <strong className="text-emerald-400 font-extrabold">+💵 {netProfit.toLocaleString()}</strong>
            <span className="text-[10px] text-slate-500 ml-1.5">(Cutting: -💵 {commission.toLocaleString()})</span>
          </div>

          <div>
            <span className="text-slate-400">Liability: </span>
            <strong className="text-rose-400 font-extrabold">💵 {stake.toLocaleString()}</strong>
          </div>
        </div>

        {/* Feedback Messages */}
        {errorMessage && (
          <div className="mb-2.5 p-2 rounded bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-2.5 p-2 rounded bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* BetPro Action Buttons: Cancel and Place Bet */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSelectedBet(null)}
            className="w-1/3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase font-mono-sport cursor-pointer border border-slate-700 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isSubmitting || isLocked}
            onClick={handlePlaceBet}
            className={`
              w-2/3 py-2.5 rounded-lg font-black text-xs sm:text-sm uppercase tracking-wider transition-all duration-150 shadow-md font-mono-sport
              ${
                isLocked
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : isSubmitting
                  ? 'bg-emerald-800 text-emerald-200 cursor-wait'
                  : 'bg-[#00a65a] hover:bg-[#00924e] text-white shadow-emerald-600/30 cursor-pointer active:scale-[0.99]'
              }
            `}
          >
            {isLocked
              ? 'MARKET SUSPENDED'
              : isSubmitting
              ? 'PLACING BET...'
              : `PLACE BET · 💵 ${stake.toLocaleString()}`}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* BetPro Market Container */}
      <div className="card-surface rounded-2xl overflow-hidden shadow-2xl border border-slate-700/60">
        {/* BetPro Standard Market Bar */}
        <div className="bg-[#101929] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#f5a623] shadow-sm shadow-amber-500/50"></div>
            <h3 className="font-extrabold text-white text-sm sm:text-base tracking-tight font-sans">
              Match Odds
            </h3>
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-pointer hover:text-slate-200" />
            {isLocked ? (
              <span className="text-[10px] font-mono-sport font-extrabold px-2 py-0.5 rounded-full bg-rose-950/80 text-rose-300 border border-rose-500/40 flex items-center gap-1 shadow-sm">
                <Lock className="w-2.5 h-2.5" /> SUSPENDED
              </span>
            ) : (
              <span className="text-[10px] font-mono-sport font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                ACTIVE ({game.remaining_seconds}s)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <div className="text-[11px] font-mono-sport text-slate-400 hidden sm:block">
              Min: <span className="text-white font-bold">500</span> | Max: <span className="text-amber-400 font-bold">50K</span>
            </div>
            <button
              type="button"
              className="px-2.5 py-1 rounded bg-[#18263a] hover:bg-[#20334e] text-[#f5a623] text-[10px] font-extrabold font-mono-sport uppercase tracking-wider border border-[#f5a623]/40 cursor-pointer shadow-sm"
            >
              Cashout
            </button>
          </div>
        </div>

        {/* BetPro Odds Table Headers */}
        <div className="grid grid-cols-12 px-3 sm:px-4 py-2 bg-[#080e18] border-b border-slate-800 text-[11px] font-bold font-mono-sport">
          <div className="col-span-6 sm:col-span-7 text-slate-400 uppercase tracking-wider pl-1">
            Runner
          </div>
          <div className="col-span-3 sm:col-span-2 text-center text-[#06182a] bg-[#72bbef] py-0.5 rounded font-black tracking-wide shadow-sm">
            BACK
          </div>
          <div className="col-span-3 sm:col-span-3 text-center text-[#2a0610] bg-[#faa9ba] py-0.5 rounded font-black tracking-wide shadow-sm">
            LAY
          </div>
        </div>

        {/* Runner Row 1: Team A */}
        <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 items-center border-b border-slate-800/80 hover:bg-[#121c2b]/50 transition-colors">
          <div className="col-span-6 sm:col-span-7">
            <div className="flex items-center gap-2">
              <TeamFlag team={game.team_a} size="sm" shape="rounded" />
              <div className="font-extrabold text-white text-sm sm:text-base font-sans leading-tight">
                {game.team_a}
              </div>
            </div>
            {/* BetPro Live P&L Indicator */}
            <div className="text-[11px] font-mono-sport font-bold mt-0.5 ml-7">
              {plTeamA > 0 ? (
                <span className="text-emerald-400">+💵 {plTeamA.toLocaleString()}</span>
              ) : plTeamA < 0 ? (
                <span className="text-rose-400">-💵 {Math.abs(plTeamA).toLocaleString()}</span>
              ) : (
                <span className="text-slate-500">0.00</span>
              )}
            </div>
          </div>

          {/* Team A Back Button (Soft Sky Blue) */}
          <div className="col-span-3 sm:col-span-2 px-1">
            <button
              disabled={isLocked}
              onClick={() => handleSelectSlip(game.team_a, 'BACK', game.back_odds_team_a || 1.95)}
              className={`
                w-full py-1.5 sm:py-2 rounded font-mono-sport transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm
                ${
                  isLocked
                    ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                    : selectedBet?.team === game.team_a && selectedBet?.type === 'BACK'
                    ? 'bg-[#72bbef] text-slate-950 ring-2 ring-[#72bbef] ring-offset-1 ring-offset-[#0e1622] scale-[1.02]'
                    : 'bg-[#72bbef] hover:brightness-105 text-slate-950'
                }
              `}
            >
              <span className="text-base sm:text-lg font-black leading-tight">
                {isLocked ? <Lock className="w-3.5 h-3.5 my-0.5" /> : (game.back_odds_team_a || 1.95).toFixed(2)}
              </span>
              <span className="text-[9px] font-extrabold text-slate-800 leading-none">
                52.4K
              </span>
            </button>
          </div>

          {/* Team A Lay Button (Soft Pastel Pink) */}
          <div className="col-span-3 sm:col-span-3 px-1">
            <button
              disabled={isLocked}
              onClick={() => handleSelectSlip(game.team_a, 'LAY', game.lay_odds_team_a || 2.05)}
              className={`
                w-full py-1.5 sm:py-2 rounded font-mono-sport transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm
                ${
                  isLocked
                    ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                    : selectedBet?.team === game.team_a && selectedBet?.type === 'LAY'
                    ? 'bg-[#faa9ba] text-slate-950 ring-2 ring-[#faa9ba] ring-offset-1 ring-offset-[#0e1622] scale-[1.02]'
                    : 'bg-[#faa9ba] hover:brightness-105 text-slate-950'
                }
              `}
            >
              <span className="text-base sm:text-lg font-black leading-tight">
                {isLocked ? <Lock className="w-3.5 h-3.5 my-0.5" /> : (game.lay_odds_team_a || 2.05).toFixed(2)}
              </span>
              <span className="text-[9px] font-extrabold text-slate-800 leading-none">
                38.1K
              </span>
            </button>
          </div>
        </div>

        {/* Dropdown Bet Slip if Team A is selected */}
        {renderBetSlip(game.team_a)}

        {/* Runner Row 2: Team B */}
        <div className="grid grid-cols-12 px-3 sm:px-4 py-2.5 items-center border-b border-slate-800/80 hover:bg-[#121c2b]/50 transition-colors">
          <div className="col-span-6 sm:col-span-7">
            <div className="flex items-center gap-2">
              <TeamFlag team={game.team_b} size="sm" shape="rounded" />
              <div className="font-extrabold text-white text-sm sm:text-base font-sans leading-tight">
                {game.team_b}
              </div>
            </div>
            {/* BetPro Live P&L Indicator */}
            <div className="text-[11px] font-mono-sport font-bold mt-0.5 ml-7">
              {plTeamB > 0 ? (
                <span className="text-emerald-400">+💵 {plTeamB.toLocaleString()}</span>
              ) : plTeamB < 0 ? (
                <span className="text-rose-400">-💵 {Math.abs(plTeamB).toLocaleString()}</span>
              ) : (
                <span className="text-slate-500">0.00</span>
              )}
            </div>
          </div>

          {/* Team B Back Button */}
          <div className="col-span-3 sm:col-span-2 px-1">
            <button
              disabled={isLocked}
              onClick={() => handleSelectSlip(game.team_b, 'BACK', game.back_odds_team_b || 1.95)}
              className={`
                w-full py-1.5 sm:py-2 rounded font-mono-sport transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm
                ${
                  isLocked
                    ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                    : selectedBet?.team === game.team_b && selectedBet?.type === 'BACK'
                    ? 'bg-[#72bbef] text-slate-950 ring-2 ring-[#72bbef] ring-offset-1 ring-offset-[#0e1622] scale-[1.02]'
                    : 'bg-[#72bbef] hover:brightness-105 text-slate-950'
                }
              `}
            >
              <span className="text-base sm:text-lg font-black leading-tight">
                {isLocked ? <Lock className="w-3.5 h-3.5 my-0.5" /> : (game.back_odds_team_b || 1.95).toFixed(2)}
              </span>
              <span className="text-[9px] font-extrabold text-slate-800 leading-none">
                44.8K
              </span>
            </button>
          </div>

          {/* Team B Lay Button */}
          <div className="col-span-3 sm:col-span-3 px-1">
            <button
              disabled={isLocked}
              onClick={() => handleSelectSlip(game.team_b, 'LAY', game.lay_odds_team_b || 2.05)}
              className={`
                w-full py-1.5 sm:py-2 rounded font-mono-sport transition-all flex flex-col items-center justify-center cursor-pointer shadow-sm
                ${
                  isLocked
                    ? 'bg-slate-900 text-slate-600 cursor-not-allowed border border-slate-800'
                    : selectedBet?.team === game.team_b && selectedBet?.type === 'LAY'
                    ? 'bg-[#faa9ba] text-slate-950 ring-2 ring-[#faa9ba] ring-offset-1 ring-offset-[#0e1622] scale-[1.02]'
                    : 'bg-[#faa9ba] hover:brightness-105 text-slate-950'
                }
              `}
            >
              <span className="text-base sm:text-lg font-black leading-tight">
                {isLocked ? <Lock className="w-3.5 h-3.5 my-0.5" /> : (game.lay_odds_team_b || 2.05).toFixed(2)}
              </span>
              <span className="text-[9px] font-extrabold text-slate-800 leading-none">
                31.2K
              </span>
            </button>
          </div>
        </div>

        {/* Dropdown Bet Slip if Team B is selected */}
        {renderBetSlip(game.team_b)}
      </div>

      {/* BetPro Matched Bets (Open Bets) Table for this match */}
      {myMatchedBets.length > 0 && (
        <div className="bg-[#0e1622] border border-slate-800 rounded-xl overflow-hidden shadow-md">
          <div className="bg-[#141e2e] px-4 py-2 border-b border-slate-800 flex items-center justify-between">
            <h4 className="font-extrabold text-white text-xs uppercase tracking-wider font-mono-sport">
              Matched Bets ({myMatchedBets.length})
            </h4>
            <span className="text-[10px] text-emerald-400 font-mono-sport font-bold">
              MATCHED
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono-sport border-collapse">
              <thead>
                <tr className="border-b border-slate-800/80 text-slate-400 bg-[#0a1018] text-[10px]">
                  <th className="py-2 px-3">RUNNER</th>
                  <th className="py-2 px-3">TYPE</th>
                  <th className="py-2 px-3">ODDS</th>
                  <th className="py-2 px-3">STAKE</th>
                  <th className="py-2 px-3">POTENTIAL WIN</th>
                  <th className="py-2 px-3">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {myMatchedBets.map((bet) => (
                  <tr key={bet.id} className="hover:bg-slate-800/30">
                    <td className="py-2 px-3 font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <TeamFlag team={bet.selection} size="xs" shape="rounded" />
                        <span>{bet.selection}</span>
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          bet.bet_type === 'BACK'
                            ? 'bg-[#72bbef]/20 text-[#72bbef] border border-[#72bbef]/40'
                            : 'bg-[#faa9ba]/20 text-[#faa9ba] border border-[#faa9ba]/40'
                        }`}
                      >
                        {bet.bet_type}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-amber-400">
                      {Number(bet.odds).toFixed(2)}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-200">
                      💵 {Number(bet.stake).toLocaleString()}
                    </td>
                    <td className="py-2 px-3 font-bold text-emerald-400">
                      💵 {Number(bet.potential_return).toLocaleString()}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] uppercase font-bold text-emerald-400">
                        {bet.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* BetPro Bookmaker / Tied Match Section */}
      <div className="bg-[#0e1622] border border-slate-800 rounded-xl overflow-hidden shadow-md">
        <button
          onClick={() => setShowBookmaker(!showBookmaker)}
          className="w-full bg-[#141e2e] px-4 py-2.5 flex items-center justify-between text-left hover:bg-[#182436] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            <span className="font-bold text-white text-xs sm:text-sm font-sans">
              Bookmaker Market (0% Commission)
            </span>
            <span className="text-[10px] text-cyan-300 font-mono-sport bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              ZERO COMMISSION
            </span>
          </div>
          {showBookmaker ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>

        {showBookmaker && (
          <div className="p-3 border-t border-slate-800 text-xs text-slate-400 font-mono-sport space-y-2">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <TeamFlag team={game.team_a} size="xs" shape="rounded" />
                <span className="text-white font-bold">{game.team_a}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-[#72bbef] text-slate-950 font-black">
                  {(game.back_odds_team_a || 1.95).toFixed(2)}
                </span>
                <span className="px-3 py-1 rounded bg-[#faa9ba] text-slate-950 font-black">
                  {(game.lay_odds_team_a || 2.05).toFixed(2)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <TeamFlag team={game.team_b} size="xs" shape="rounded" />
                <span className="text-white font-bold">{game.team_b}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded bg-[#72bbef] text-slate-950 font-black">
                  {(game.back_odds_team_b || 1.95).toFixed(2)}
                </span>
                <span className="px-3 py-1 rounded bg-[#faa9ba] text-slate-950 font-black">
                  {(game.lay_odds_team_b || 2.05).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
