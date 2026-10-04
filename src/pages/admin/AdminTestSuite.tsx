import React, { useState } from 'react';
import { request } from '../../services/api';
import { Play, CheckCircle2, XCircle, RefreshCw, ShieldCheck, Flame } from 'lucide-react';

export const AdminTestSuite: React.FC = () => {
  const [testData, setTestData] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const handleRunTests = async () => {
    setIsRunning(true);
    try {
      const res = await request('/api/testing/run-suite');
      if (res.success) {
        setTestData(res);
      }
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-black text-white tracking-wider flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span>AUTOMATED SYSTEM VERIFICATION SUITE</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Automated test assertions covering authentication, wallet ledger immutability, RNG determinism, and state machines
          </p>
        </div>

        <button
          onClick={handleRunTests}
          disabled={isRunning}
          className="px-5 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs uppercase tracking-wider transition-colors shadow-md shadow-emerald-500/20 flex items-center gap-2 self-start sm:self-center"
        >
          {isRunning ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>RUNNING SUITE...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              <span>RUN ALL 20+ AUTOMATED TESTS</span>
            </>
          )}
        </button>
      </div>

      {/* Summary Banner if executed */}
      {testData && (
        <div
          className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
            testData.summary.allPassed
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {testData.summary.allPassed ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            ) : (
              <XCircle className="w-8 h-8 text-rose-400 flex-shrink-0" />
            )}
            <div>
              <div className="font-display font-bold text-base uppercase tracking-wider">
                {testData.summary.allPassed
                  ? 'ALL SYSTEM SPECIFICATION TESTS PASSED'
                  : 'SOME TESTS FAILED'}
              </div>
              <div className="text-xs opacity-90">
                {testData.summary.passed} of {testData.summary.totalTests} test suites executed successfully without regression.
              </div>
            </div>
          </div>

          <div className="text-right font-mono-sport text-xs">
            <span className="text-emerald-400 font-bold">{testData.summary.passed} Passed</span> ·{' '}
            <span className={testData.summary.failed > 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
              {testData.summary.failed} Failed
            </span>
          </div>
        </div>
      )}

      {/* Tests Results List */}
      <div className="bg-[#121721] border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="bg-[#161d2a] px-4 py-3 border-b border-slate-800 flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
          <span>SPECIFICATION TEST TARGET</span>
          <span>RESULT</span>
        </div>

        <div className="divide-y divide-slate-800 text-xs font-mono-sport">
          {!testData ? (
            <div className="py-16 text-center text-slate-500">
              Click &quot;RUN ALL 20+ AUTOMATED TESTS&quot; above to execute the server-side test harness.
            </div>
          ) : (
            testData.results?.map((t: any, idx: number) => (
              <div
                key={idx}
                className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-slate-800/30"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                      {t.category}
                    </span>
                    <span className="font-bold text-white font-sans text-sm">{t.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans">{t.message}</div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-center font-bold">
                  {t.passed ? (
                    <span className="text-emerald-400 flex items-center gap-1 bg-emerald-950/60 px-2.5 py-1 rounded border border-emerald-500/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      PASSED
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1 bg-rose-950/60 px-2.5 py-1 rounded border border-rose-500/40">
                      <XCircle className="w-3.5 h-3.5" />
                      FAILED
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
