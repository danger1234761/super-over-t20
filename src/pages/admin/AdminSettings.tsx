import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { GameConfig } from '../../types';
import { Settings, Save, RefreshCw, CheckCircle, AlertCircle, Percent } from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchConfig = async () => {
    setIsLoading(true);
    try {
      const res = await request<GameConfig>('/api/admin/settings');
      if (res.success && res.data) {
        setConfig(res.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;

    // Check that probabilities roughly equal 100%
    const totalProb =
      Number(config.prob_dot_ball) +
      Number(config.prob_one_run) +
      Number(config.prob_two_runs) +
      Number(config.prob_three_runs) +
      Number(config.prob_four_runs) +
      Number(config.prob_six_runs) +
      Number(config.prob_wicket);

    if (Math.abs(totalProb - 100) > 1.5) {
      setSaveError(`Total probabilities must equal ~100% (Current sum: ${totalProb.toFixed(1)}%)`);
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await request('/api/admin/settings', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error?.message || 'Failed to update configuration');
      }
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !config) {
    return <div className="py-16 text-center text-slate-400">Loading platform settings...</div>;
  }

  const currentSum =
    Number(config.prob_dot_ball) +
    Number(config.prob_one_run) +
    Number(config.prob_two_runs) +
    Number(config.prob_three_runs) +
    Number(config.prob_four_runs) +
    Number(config.prob_six_runs) +
    Number(config.prob_wicket);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wider flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" />
            <span>GLOBAL PLATFORM CONFIGURATION</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Super Over outcome distribution engine, virtual currency, and compliance rules
          </p>
        </div>

        <button
          onClick={fetchConfig}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 self-start sm:self-center"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section: Result Engine Probabilities */}
        <div className="bg-[#121721] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Percent className="w-5 h-5 text-amber-400" />
              <h3 className="font-display font-bold text-white text-base uppercase">
                RESULT ENGINE PROBABILITIES (RNG WEIGHTS)
              </h3>
            </div>
            <span
              className={`text-xs font-mono-sport font-bold px-2 py-0.5 rounded ${
                Math.abs(currentSum - 100) < 0.5
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                  : 'bg-rose-950 text-rose-300 border border-rose-500/40'
              }`}
            >
              Sum: {currentSum.toFixed(1)}%
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Configure the baseline percentage probabilities used by the cryptographic HMAC-SHA256 Result Engine.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block uppercase">0 Runs (Dot Ball) %</label>
              <input
                type="number"
                step="0.5"
                value={config.prob_dot_ball}
                onChange={(e) => setConfig({ ...config, prob_dot_ball: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block uppercase">1 Run %</label>
              <input
                type="number"
                step="0.5"
                value={config.prob_one_run}
                onChange={(e) => setConfig({ ...config, prob_one_run: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block uppercase">2 Runs %</label>
              <input
                type="number"
                step="0.5"
                value={config.prob_two_runs}
                onChange={(e) => setConfig({ ...config, prob_two_runs: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block uppercase">3 Runs %</label>
              <input
                type="number"
                step="0.5"
                value={config.prob_three_runs}
                onChange={(e) => setConfig({ ...config, prob_three_runs: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block uppercase">4 Runs (Boundary) %</label>
              <input
                type="number"
                step="0.5"
                value={config.prob_four_runs}
                onChange={(e) => setConfig({ ...config, prob_four_runs: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block uppercase">6 Runs (Six) %</label>
              <input
                type="number"
                step="0.5"
                value={config.prob_six_runs}
                onChange={(e) => setConfig({ ...config, prob_six_runs: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="space-y-1 col-span-2">
              <label className="text-slate-300 font-semibold block uppercase">Wicket (Dismissal) %</label>
              <input
                type="number"
                step="0.5"
                value={config.prob_wicket}
                onChange={(e) => setConfig({ ...config, prob_wicket: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>
        </div>

        {/* Section: Platform Rules & Mode */}
        <div className="bg-[#121721] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4 shadow-lg text-xs">
          <h3 className="font-display font-bold text-white text-base uppercase pb-3 border-b border-slate-800">
            RULES & COMPLIANCE TOGGLES
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block uppercase">
                Tie-Breaker Policy
              </label>
              <select
                value={config.tie_breaker_rule}
                onChange={(e) => setConfig({ ...config, tie_breaker_rule: e.target.value as any })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
              >
                <option value="BOUNDARY_COUNT">BOUNDARY_COUNT (Total 4s & 6s)</option>
                <option value="SHARED">SHARED_POINTS (Shared Draw)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block uppercase">Currency Label</label>
              <input
                type="text"
                value={config.currency}
                onChange={(e) => setConfig({ ...config, currency: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono-sport focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="sm:col-span-2 p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="font-bold text-white uppercase">Virtual Demo Credits Mode</div>
                <div className="text-[11px] text-slate-400">
                  Clearly marks all account balances as virtual credits with zero monetary liability
                </div>
              </div>
              <input
                type="checkbox"
                checked={config.is_demo_mode}
                onChange={(e) => setConfig({ ...config, is_demo_mode: e.target.checked })}
                className="w-5 h-5 rounded text-amber-400 border-slate-700"
              />
            </div>
          </div>
        </div>

        {/* Feedback */}
        {saveError && (
          <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/60 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {saveSuccess && (
          <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Configuration updated and audited successfully!</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 text-slate-950 font-display font-black text-sm uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? 'SAVING...' : 'SAVE & AUDIT CONFIGURATION'}</span>
        </button>
      </form>
    </div>
  );
};
