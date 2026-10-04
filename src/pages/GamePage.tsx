import React, { useState } from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Scoreboard } from '../components/Scoreboard';
import { MatchOdds } from '../components/MatchOdds';
import { BallStrip } from '../components/BallIndicator';
import { TeamFlag } from '../components/TeamFlag';
import { ShieldCheck, History, Radio, ChevronRight, Lock } from 'lucide-react';
import { Game } from '../types';

interface GamePageProps {
  onNavigateToVerify: (gameId: string) => void;
  onNavigateToRules: () => void;
}

export const GamePage: React.FC<GamePageProps> = ({
  onNavigateToVerify,
  onNavigateToRules,
}) => {
  const { liveGames, activeGameId, setActiveGameId } = useWebSocket();
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>('ALL');

  const gamesList = Object.values(liveGames);

  const liveGame = gamesList.find(
    (g) =>
      g.status === 'OPEN' ||
      g.status === 'LOCKED' ||
      g.status === 'INNINGS_1' ||
      g.status === 'INNINGS_2' ||
      g.status === 'INNINGS_BREAK'
  );

  // Active game: If a live game is active, ALWAYS focus on that live game!
  // If no live game is active (during results celebration), show the recently completed game!
  const activeGame: Game | undefined =
    liveGame ||
    (activeGameId && liveGames[activeGameId] ? liveGames[activeGameId] : null) ||
    gamesList.find((g) => g.status === 'COMPLETED') ||
    gamesList[0];

  if (!activeGame) {
    return (
      <div className="py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3">
          <Radio className="w-6 h-6 text-amber-400 animate-pulse" />
        </div>
        <h3 className="text-lg font-bold text-white mb-1">Connecting to Super Over Match Engine...</h3>
        <p className="text-sm text-slate-400">Loading live matches and market odds</p>
      </div>
    );
  }

  // Filter games for match bar (hide cancelled/rescheduled games)
  const visibleGames = gamesList
    .filter((g) => g.status !== 'CANCELLED' && g.status !== 'DRAFT')
    .slice(0, 6);

  const teamABalls = activeGame.balls.filter((b) => b.innings === 1);
  const teamBBalls = activeGame.balls.filter((b) => b.innings === 2);

  return (
    <div className="space-y-6 pb-12">
      {/* Match Selector Bar if multiple matches exist */}
      {visibleGames.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap pl-1">
            Matches:
          </span>
          {visibleGames.map((g) => {
            const isLive = g.status === 'OPEN' || g.status === 'INNINGS_1' || g.status === 'INNINGS_2' || g.status === 'INNINGS_BREAK' || g.status === 'LOCKED';
            return (
              <button
                key={g.id}
                onClick={() => setActiveGameId(g.id)}
                className={`
                  px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer shadow-sm
                  ${
                    activeGame.id === g.id
                      ? 'bg-gradient-to-r from-amber-500/25 to-amber-600/10 text-white font-extrabold border border-amber-500/60 shadow-amber-950/30'
                      : 'bg-[#0d1422] border border-slate-700/60 text-slate-300 hover:text-white hover:bg-[#131f33]'
                  }
                `}
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isLive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  ></span>
                  <div className="flex items-center gap-1.5">
                    <TeamFlag team={g.team_a} size="xs" shape="rounded" />
                    <span>{g.team_a}</span>
                    <span className="text-slate-500 text-[10px]">v</span>
                    <TeamFlag team={g.team_b} size="xs" shape="rounded" />
                    <span>{g.team_b}</span>
                  </div>
                </span>
                <span className="text-[10px] text-amber-400 font-mono-sport uppercase font-bold">
                  {g.status === 'OPEN' ? 'OPEN' : g.status === 'COMPLETED' ? 'FINAL' : 'LIVE'}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Scoreboard Component */}
      <Scoreboard game={activeGame} />

      {/* Grid: Match Odds & Live Action Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Match Odds Trading Box (col-span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <MatchOdds game={activeGame} />
        </div>

        {/* Live Commentary & Ball Feed */}
        <div className="space-y-4">
          <div className="card-surface border border-slate-700/60 rounded-2xl overflow-hidden shadow-xl">
            <div className="bg-[#101929] px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-amber-400" />
                <h4 className="font-bold text-white text-xs sm:text-sm uppercase tracking-wider">
                  BALL-BY-BALL FEED
                </h4>
              </div>
              <span className="text-[11px] text-amber-400 font-mono-sport font-bold">
                {activeGame.balls.length}/12 balls
              </span>
            </div>

            <div className="p-3 max-h-[360px] overflow-y-auto space-y-2">
              {activeGame.balls.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  Deliveries will appear here as the Super Over commences.
                </div>
              ) : (
                activeGame.balls
                  .slice()
                  .reverse()
                  .map((ball) => {
                    const isWicket = ball.result === 'W';
                    const isSix = ball.result === '6';
                    const isFour = ball.result === '4';
                    const isDot = ball.result === '0';

                    let tokenStyle = 'bg-slate-800 text-white font-bold border border-slate-700';
                    if (isWicket) tokenStyle = 'bg-rose-600 text-white font-black border border-rose-400/50 shadow-sm';
                    else if (isSix) tokenStyle = 'bg-purple-600 text-white font-black border border-purple-400/50 shadow-sm';
                    else if (isFour) tokenStyle = 'bg-blue-600 text-white font-black border border-blue-400/50 shadow-sm';
                    else if (isDot) tokenStyle = 'bg-slate-900 text-slate-400 border border-slate-800';

                    return (
                      <div
                        key={ball.id}
                        className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono-sport text-[11px] text-slate-400">
                            Inn {ball.innings} · B{ball.ball_number}
                          </span>
                          <div>
                            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                              <TeamFlag team={ball.batting_team} size="xs" shape="rounded" />
                              <span>{ball.batting_team}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono-sport">
                              Score: {ball.team_score_after}/{ball.team_wickets_after}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div
                            className={`
                              w-7 h-7 rounded-full flex items-center justify-center font-mono-sport text-xs
                              ${tokenStyle}
                            `}
                          >
                            {ball.result}
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Quick Rules & Help Card */}
          <div className="p-3.5 bg-[#0f141c] border border-slate-800 rounded-xl text-xs text-slate-400 space-y-2">
            <div className="font-bold text-slate-300 text-xs flex items-center justify-between">
              <span>Super Over Rules</span>
              <button
                onClick={onNavigateToRules}
                className="text-amber-400 hover:text-amber-300 text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>Full Rules</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <ul className="space-y-1 text-[11px] list-disc list-inside text-slate-400">
              <li>1 Over (6 legal balls) per team</li>
              <li>Maximum 2 wickets per team</li>
              <li>Ties settled via boundary count rule</li>
              <li>Server-authoritative provably fair seed verification</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
