import React from 'react';
import { BookOpen, ShieldCheck, Scale, AlertCircle, CheckCircle } from 'lucide-react';

export const RulesPage: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <BookOpen className="w-7 h-7 text-amber-400" />
          <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide">
            SUPER OVER T20 RULES & REGULATIONS
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Official gameplay guidelines, score calculations, tie-break procedures, and provably fair specifications
        </p>
      </div>

      {/* Section 1: Super Over Cricket Format */}
      <section className="bg-[#121721] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-bold text-white text-lg flex items-center gap-2 text-amber-300">
          <Scale className="w-5 h-5 text-amber-400" />
          <span>1. SUPER OVER MATCH STRUCTURE</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">
              Deliveries & Innings
            </div>
            <p className="text-slate-400">
              Each Super Over consists of <strong>2 Innings</strong>. Team A bats in Innings 1 for exactly <strong>6 deliveries</strong> (1 over). Team B bats in Innings 2 for exactly <strong>6 deliveries</strong> chasing the target set by Team A.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">
              Wicket Limit
            </div>
            <p className="text-slate-400">
              A maximum of <strong>2 wickets</strong> is allowed per innings. If a team loses 2 wickets before completing 6 deliveries, their innings concludes immediately at that score.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">
              Target & Victory Conditions
            </div>
            <p className="text-slate-400">
              Target for Team B is <code>Team A Score + 1</code>. If Team B reaches or exceeds the target during Innings 2, Team B is immediately declared the winner.
            </p>
          </div>

          <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">
              Tie-Breaker Rule
            </div>
            <p className="text-slate-400">
              If scores are identical after Innings 2, the winner is determined by <strong>Boundary Count</strong> (total number of 4s and 6s hit during the Super Over). If boundary counts are also equal, the result is declared a Tied Match.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Ball Delivery Scoring */}
      <section className="bg-[#121721] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-bold text-white text-lg text-cyan-300">
          2. BALL DELIVERY OUTCOMES & DISTRIBUTION
        </h3>
        <p className="text-xs text-slate-400">
          Every delivery produces one of seven discrete cricket outcomes:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2.5 text-center font-mono-sport text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="font-bold text-slate-400 text-lg">0</div>
            <div className="text-[10px] text-slate-500 mt-1">Dot Ball</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="font-bold text-rose-400 text-lg">1</div>
            <div className="text-[10px] text-slate-500 mt-1">Single Run</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="font-bold text-rose-400 text-lg">2</div>
            <div className="text-[10px] text-slate-500 mt-1">Two Runs</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <div className="font-bold text-rose-400 text-lg">3</div>
            <div className="text-[10px] text-slate-500 mt-1">Three Runs</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/40">
            <div className="font-bold text-emerald-400 text-lg">4</div>
            <div className="text-[10px] text-emerald-300 mt-1">Boundary Four</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-amber-500/40">
            <div className="font-bold text-amber-400 text-lg">6</div>
            <div className="text-[10px] text-amber-300 mt-1">Maximum Six</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-red-500/40">
            <div className="font-bold text-red-400 text-lg">W</div>
            <div className="text-[10px] text-red-300 mt-1">Wicket Out</div>
          </div>
        </div>
      </section>

      {/* Section 3: Provably Fair & RNG Commitment */}
      <section className="bg-[#121721] border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
        <h3 className="font-display font-bold text-white text-lg flex items-center gap-2 text-emerald-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <span>3. PROVABLY FAIR AUDITABILITY & SEED HASH</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          <p>
            Super Over T20 employs a cryptographic <strong>Commitment Scheme</strong>. Prior to entries opening for any game, the server generates a high-entropy 256-bit secret (Server Seed) and publishes its <strong>SHA-256 hash</strong>.
          </p>
          <ul className="space-y-2 list-disc list-inside text-slate-400 pl-1">
            <li>
              <strong>Immutability:</strong> The published hash locks the server into using that exact seed. It cannot be altered after bets are taken.
            </li>
            <li>
              <strong>Unbiased Generation:</strong> The outcome generation does not take user balance, bet amounts, team selections, or participant identities into account.
            </li>
            <li>
              <strong>Post-Match Verification:</strong> Upon conclusion, the server reveals the raw seed. Anyone can verify that <code>SHA256(seed) == publishedHash</code> and recalculate each delivery.
            </li>
          </ul>
        </div>
      </section>

      {/* Section 4: Responsible Gaming & Compliance */}
      <section className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-5 text-xs text-slate-400 space-y-2.5">
        <div className="flex items-center gap-2 text-amber-400 font-bold uppercase tracking-wider text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Responsible Gaming & Virtual Demo Notice</span>
        </div>
        <p>
          This development instance operates exclusively with <strong>Virtual Demo Credits (INR DEMO)</strong>. Virtual credits hold no monetary value, cannot be redeemed for fiat currency, and do not constitute real-money wagering.
        </p>
        <p>
          In production environments, all operations are subject to applicable licensing, age verification (18+), KYC/AML controls, and player self-exclusion policies.
        </p>
      </section>
    </div>
  );
};
