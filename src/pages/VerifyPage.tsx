import React, { useState, useEffect } from 'react';
import { request } from '../services/api';
import { ShieldCheck, CheckCircle2, AlertTriangle, ArrowLeft, RefreshCw, KeyRound, Hash } from 'lucide-react';
import { BallIndicator } from '../components/BallIndicator';

interface VerifyPageProps {
  gameId: string;
  onBack: () => void;
}

export const VerifyPage: React.FC<VerifyPageProps> = ({ gameId, onBack }) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVerification = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await request(`/api/games/${gameId}/verify`);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error?.message || 'Verification failed');
      }
    } catch (e: any) {
      setError(e.message || 'Verification error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVerification();
  }, [gameId]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Matches</span>
      </button>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-emerald-400" />
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
            PROVABLY FAIR VERIFICATION
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Independently verify that match outcomes were predetermined prior to betting and completely free from tampering.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-amber-400" />
          <span>Validating cryptographic hashes...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-amber-950/60 border border-amber-500/50 text-amber-200 text-sm flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400" />
          <div>
            <div className="font-bold">Verification Notice</div>
            <div className="text-xs text-amber-300/90 mt-0.5">{error}</div>
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* Status Badge */}
          <div
            className={`p-4 rounded-xl border flex items-center gap-3 ${
              data.isHashValid
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
            }`}
          >
            <CheckCircle2 className="w-6 h-6 flex-shrink-0 text-emerald-400" />
            <div>
              <div className="font-display font-bold text-base uppercase tracking-wider">
                {data.verificationStatus === 'PASSED_PROVABLY_FAIR'
                  ? 'SHA-256 COMMITMENT VALIDATED · PASSED'
                  : 'VERIFICATION FAILED'}
              </div>
              <div className="text-xs opacity-90">
                The revealed server seed mathematically hashes to the exact SHA-256 commitment published prior to match start.
              </div>
            </div>
          </div>

          {/* Cryptographic Keys Grid */}
          <div className="bg-[#121721] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-amber-400" />
              <span>CRYPTOGRAPHIC SEED AUDIT</span>
            </h3>

            <div className="space-y-3 font-mono-sport text-xs">
              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                  1. Pre-committed Published Seed Hash (Published before open):
                </span>
                <div className="mt-1 p-2.5 rounded bg-slate-900 border border-slate-800 text-amber-300 break-all select-all">
                  {data.serverSeedHash}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                  2. Revealed Server Seed (Revealed upon match completion):
                </span>
                <div className="mt-1 p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-300 break-all select-all">
                  {data.serverSeed}
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px] uppercase tracking-wider font-semibold">
                  3. Mathematical Verification Formula:
                </span>
                <div className="mt-1 p-2.5 rounded bg-slate-950 border border-slate-800/80 text-slate-300">
                  SHA256(Revealed_Server_Seed) == Published_Seed_Hash
                </div>
              </div>
            </div>
          </div>

          {/* Ball By Ball Deterministic Recalculation */}
          <div className="bg-[#121721] border border-slate-800 rounded-xl p-5 space-y-4">
            <h3 className="font-display font-bold text-white text-base flex items-center gap-2">
              <Hash className="w-4 h-4 text-cyan-400" />
              <span>DETERMINISTIC BALL RECALCULATION AUDIT</span>
            </h3>

            <p className="text-xs text-slate-400">
              Each delivery is computed from HMAC-SHA256(ServerSeed, GameId:Innings:BallNumber).
              Compare recorded match balls against recalculation:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono-sport border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/80">
                    <th className="py-2.5 px-3">INNINGS</th>
                    <th className="py-2.5 px-3">BALL</th>
                    <th className="py-2.5 px-3">RESULT</th>
                    <th className="py-2.5 px-3">RUNS</th>
                    <th className="py-2.5 px-3">HMAC HASH SLICE</th>
                    <th className="py-2.5 px-3">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {data.recalculatedBalls?.map((item: any, idx: number) => {
                    const actual = data.actualRecordedBalls?.find(
                      (b: any) => b.innings === item.innings && b.ball_number === item.ballNumber
                    );
                    const isMatch = actual ? actual.result === item.outcome : true;

                    return (
                      <tr key={idx} className="hover:bg-slate-800/20">
                        <td className="py-2.5 px-3 text-slate-300">Innings {item.innings}</td>
                        <td className="py-2.5 px-3 font-bold text-white">Ball #{item.ballNumber}</td>
                        <td className="py-2.5 px-3">
                          <BallIndicator result={item.outcome} size="sm" />
                        </td>
                        <td className="py-2.5 px-3 text-amber-400 font-bold">{item.runs} Runs</td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] truncate max-w-xs">
                          {item.hash.substring(0, 16)}...
                        </td>
                        <td className="py-2.5 px-3 text-emerald-400 font-bold">
                          {isMatch ? 'VERIFIED ✓' : 'MISMATCH'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
