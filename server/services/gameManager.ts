import { db, Game, BallRecord } from '../db/database.ts';
import { ResultEngine } from './resultEngine.ts';
import { WebSocket } from 'ws';

export interface WsMessage {
  type: string;
  payload: any;
  timestamp: string;
}

export class GameManager {
  private static instance: GameManager;
  private timerInterval: NodeJS.Timeout | null = null;
  private autoPlayIntervals: Map<string, NodeJS.Timeout> = new Map();
  private wsClients: Set<WebSocket> = new Set();
  private isAutoMatchPending: boolean = false;
  private nextTeamPairIndex: number = 0;
  private transitionTimers: Map<string, number> = new Map();
  private nextMatchScheduledAt: number = 0;

  private static readonly TEAM_PAIRS: [string, string][] = [
    ['India', 'Pakistan'],
    ['Australia', 'England'],
    ['South Africa', 'New Zealand'],
    ['West Indies', 'Sri Lanka'],
    ['Afghanistan', 'Bangladesh'],
    ['India', 'Australia'],
    ['Pakistan', 'England'],
    ['South Africa', 'India'],
    ['New Zealand', 'Australia'],
    ['England', 'West Indies'],
  ];

  private constructor() {
    this.startGlobalTimerLoop();
  }

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public registerClient(ws: WebSocket): void {
    this.wsClients.add(ws);

    // Send initial snapshot of all active / open games
    const activeGames = db.getAllGames().filter((g) => g.status !== 'CANCELLED');
    ws.send(
      JSON.stringify({
        type: 'INITIAL_SYNC',
        payload: {
          games: activeGames,
          config: db.getConfig(),
          onlineCount: this.wsClients.size,
        },
        timestamp: new Date().toISOString(),
      })
    );

    this.broadcast('ONLINE_COUNT', { count: this.wsClients.size });
  }

  public unregisterClient(ws: WebSocket): void {
    this.wsClients.delete(ws);
    this.broadcast('ONLINE_COUNT', { count: this.wsClients.size });
  }

  public broadcast(type: string, payload: any): void {
    const message: WsMessage = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    const data = JSON.stringify(message);

    for (const client of this.wsClients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(data);
        } catch (e) {
          console.error('Failed to send WS message:', e);
        }
      }
    }
  }

  /**
   * Server-authoritative timer loop ticking every second
   */
  private startGlobalTimerLoop(): void {
    if (this.timerInterval) clearInterval(this.timerInterval);

    this.timerInterval = setInterval(() => {
      const games = db.getAllGames();

      // Find all currently active matches in the system
      const activeGames = games.filter((g) =>
        ['OPEN', 'LOCKED', 'INNINGS_1', 'INNINGS_BREAK', 'INNINGS_2'].includes(g.status)
      );

      // Enforce strictly ONE match rule:
      // If multiple active matches exist, cancel redundant matches so only ONE plays!
      if (activeGames.length > 1) {
        console.warn(
          `[AUTOPLAY] Found ${activeGames.length} concurrent active matches! Retiring ${activeGames.length - 1} extra match(es) so strictly ONE match plays at a time.`
        );
        for (let i = 1; i < activeGames.length; i++) {
          this.stopAutoPlay(activeGames[i].id);
          db.updateGame(activeGames[i].id, {
            status: 'CANCELLED',
            win_margin: 'Match rescheduled - only one match plays at a time',
          });
        }
      }

      const activeGame = activeGames[0];

      if (activeGame) {
        // Dynamic Odds Update during OPEN phase
        if (activeGame.status === 'OPEN') {
          this.recalculateLiveOdds(activeGame.id);
        }

        if (activeGame.status === 'OPEN') {
          if (activeGame.remaining_seconds > 0) {
            activeGame.remaining_seconds -= 1;
            db.updateGame(activeGame.id, { remaining_seconds: activeGame.remaining_seconds });

            this.broadcast('TIMER_TICK', {
              gameId: activeGame.id,
              remainingSeconds: activeGame.remaining_seconds,
              status: activeGame.status,
            });

            if (activeGame.remaining_seconds <= 0) {
              // Lock the game automatically
              this.lockGame(activeGame.id, 'SYSTEM_TIMER');
            }
          } else {
            this.lockGame(activeGame.id, 'SYSTEM_TIMER');
          }
        } else if (activeGame.status === 'LOCKED') {
          // If locked, respect lock banner delay (2.5s) then start Innings 1
          const readyAt = this.transitionTimers.get(activeGame.id) || 0;
          if (Date.now() >= readyAt) {
            this.transitionTimers.delete(activeGame.id);
            console.log(`[AUTOPLAY] Orchestrator commencing Innings 1 for ${activeGame.id}`);
            this.startInnings(activeGame.id, 1, 'SYSTEM_TIMER');
          }
        } else if (activeGame.status === 'INNINGS_1' || activeGame.status === 'INNINGS_2') {
          // Self-healing: Ensure ball-by-ball pacing is actively ticking!
          if (!this.autoPlayIntervals.has(activeGame.id)) {
            console.log(`[AUTOPLAY] Resuming ball-by-ball engine for match ${activeGame.id} (${activeGame.status})`);
            this.startAutoPlay(activeGame.id);
          }
        } else if (activeGame.status === 'INNINGS_BREAK') {
          // Respect break duration (3.5s) then start Innings 2
          const readyAt = this.transitionTimers.get(activeGame.id) || 0;
          if (Date.now() >= readyAt) {
            this.transitionTimers.delete(activeGame.id);
            console.log(`[AUTOPLAY] Commencing Innings 2 for ${activeGame.id} after break`);
            this.startInnings(activeGame.id, 2, 'SYSTEM_TIMER');
          }
        }
      } else {
        // No match currently active!
        // If a match completed recently, allow the full 8s celebration & results review window
        if (Date.now() < this.nextMatchScheduledAt) {
          return;
        }

        // Only after celebration window finishes and no active match exists, start next match
        if (!this.isAutoMatchPending) {
          const scheduledGame = games.find((g) => g.status === 'SCHEDULED');
          if (scheduledGame) {
            this.openGame(scheduledGame.id, 'SYSTEM_TIMER');
          } else {
            this.scheduleAndStartNextGame();
          }
        }
      }
    }, 1000);
  }

  /**
   * Automatically schedule and open the next Super Over match
   */
  public scheduleAndStartNextGame(): Game | null {
    // STRICT GUARD: If any match is currently active, DO NOT start another match!
    const games = db.getAllGames();
    const existingActive = games.find((g) =>
      ['OPEN', 'LOCKED', 'INNINGS_1', 'INNINGS_BREAK', 'INNINGS_2'].includes(g.status)
    );
    if (existingActive) {
      console.log(
        `[AUTOPLAY] Match ${existingActive.id} (${existingActive.title}) is currently ${existingActive.status}. Strictly only 1 match runs at a time.`
      );
      return existingActive;
    }

    if (this.isAutoMatchPending) return null;
    this.isAutoMatchPending = true;
    try {
      const [teamA, teamB] = GameManager.TEAM_PAIRS[
        this.nextTeamPairIndex % GameManager.TEAM_PAIRS.length
      ];
      this.nextTeamPairIndex++;

      const backA = Number((1.88 + Math.random() * 0.12).toFixed(2));
      const layA = Number((backA + 0.1).toFixed(2));
      const backB = Number((1.88 + Math.random() * 0.12).toFixed(2));
      const layB = Number((backB + 0.1).toFixed(2));

      const newGame = db.createGame({
        title: `Super Over T20: ${teamA} vs ${teamB}`,
        team_a: teamA,
        team_b: teamB,
        countdown_seconds: 25,
        back_odds_team_a: backA,
        lay_odds_team_a: layA,
        back_odds_team_b: backB,
        lay_odds_team_b: layB,
        admin_id: 'SYSTEM_AUTOPLAY',
      });

      this.broadcast('STATE_CHANGE', {
        gameId: newGame.id,
        status: 'OPEN',
        remainingSeconds: newGame.countdown_seconds,
        game: newGame,
      });

      this.broadcast('NEW_MATCH_STARTED', {
        game: newGame,
      });

      console.log(`[AUTOPLAY] Auto-started new match: ${teamA} vs ${teamB} (${newGame.game_code})`);
      return newGame;
    } finally {
      this.isAutoMatchPending = false;
    }
  }

  /**
   * Transition game to OPEN
   */
  public openGame(gameId: string, adminId?: string): Game {
    const game = db.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    // Guard: Only allow opening if no other match is currently active
    const active = db.getAllGames().find(
      (g) =>
        g.id !== gameId &&
        ['OPEN', 'LOCKED', 'INNINGS_1', 'INNINGS_BREAK', 'INNINGS_2'].includes(g.status)
    );
    if (active) {
      console.warn(`[AUTOPLAY] Cannot open ${gameId} because ${active.id} is already active.`);
      return game;
    }

    const countdown = game.countdown_seconds || 45;
    const updated = db.updateGame(gameId, {
      status: 'OPEN',
      entry_open_time: new Date().toISOString(),
      lock_time: new Date(Date.now() + countdown * 1000).toISOString(),
      remaining_seconds: countdown,
    });

    if (adminId) {
      db.addAuditLog({
        actor_id: adminId,
        action: 'GAME_OPENED',
        game_id: gameId,
        reason: 'Admin opened betting window',
      });
    }

    this.broadcast('STATE_CHANGE', {
      gameId,
      status: 'OPEN',
      remainingSeconds: countdown,
      game: updated,
    });

    return updated;
  }

  /**
   * Transition game to LOCKED
   */
  /**
   * Determine which team must win based on total stakes.
   * STRICT RULE: The team with more bets MUST LOSE HAR SURAT MEN!
   */
  public determineForcedWinner(gameId: string): string | undefined {
    const game = db.getGameById(gameId);
    if (!game) return undefined;

    const entries = db.getGameEntries(gameId);
    let stakeTeamA = 0;
    let stakeTeamB = 0;

    for (const entry of entries) {
      if (entry.selection === game.team_a) {
        if (entry.bet_type === 'BACK') stakeTeamA += entry.stake;
        else if (entry.bet_type === 'LAY') stakeTeamB += entry.stake;
      } else if (entry.selection === game.team_b) {
        if (entry.bet_type === 'BACK') stakeTeamB += entry.stake;
        else if (entry.bet_type === 'LAY') stakeTeamA += entry.stake;
      }
    }

    if (stakeTeamA > stakeTeamB) {
      // More bets placed on Team A -> Team A MUST LOSE -> Team B MUST WIN!
      return game.team_b;
    } else if (stakeTeamB > stakeTeamA) {
      // More bets placed on Team B -> Team B MUST LOSE -> Team A MUST WIN!
      return game.team_a;
    }
    return undefined;
  }

  /**
   * Transition game to LOCKED
   */
  public lockGame(gameId: string, adminId?: string): Game {
    const game = db.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    // Risk Engine: Evaluate all bets placed on Team A vs Team B
    const forcedWinner = this.determineForcedWinner(gameId);
    const entries = db.getGameEntries(gameId);
    let stakeTeamA = 0;
    let stakeTeamB = 0;

    for (const entry of entries) {
      if (entry.selection === game.team_a) {
        if (entry.bet_type === 'BACK') stakeTeamA += entry.stake;
        else if (entry.bet_type === 'LAY') stakeTeamB += entry.stake;
      } else if (entry.selection === game.team_b) {
        if (entry.bet_type === 'BACK') stakeTeamB += entry.stake;
        else if (entry.bet_type === 'LAY') stakeTeamA += entry.stake;
      }
    }

    if (forcedWinner) {
      const losingTeam = forcedWinner === game.team_a ? game.team_b : game.team_a;
      console.log(
        `[BETTING RISK ENGINE] Match ${gameId}: Stake on ${game.team_a} (${stakeTeamA} PTS) vs ${game.team_b} (${stakeTeamB} PTS). Team with higher bets (${losingTeam}) MUST LOSE! Forced Winner: ${forcedWinner}`
      );
    } else {
      console.log(
        `[BETTING RISK ENGINE] Match ${gameId}: Equal stakes or no bets (${stakeTeamA} PTS vs ${stakeTeamB} PTS). Natural outcome.`
      );
    }

    const updated = db.updateGame(gameId, {
      status: 'LOCKED',
      remaining_seconds: 0,
      forced_winner: forcedWinner,
      market_stakes: {
        team_a: stakeTeamA,
        team_b: stakeTeamB,
      },
    });

    if (adminId && adminId !== 'SYSTEM_TIMER') {
      db.addAuditLog({
        actor_id: adminId,
        action: 'GAME_LOCKED',
        game_id: gameId,
        reason: 'Admin locked betting window',
      });
    }

    this.broadcast('STATE_CHANGE', {
      gameId,
      status: 'LOCKED',
      game: updated,
    });

    // Schedule auto-advance to INNINGS_1 via transitionTimers
    this.transitionTimers.set(gameId, Date.now() + 2500);

    return updated;
  }

  /**
   * Start specified innings (1 or 2)
   */
  public startInnings(gameId: string, innings: 1 | 2, adminId?: string): Game {
    const game = db.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    const forcedWinner = game.forced_winner || this.determineForcedWinner(gameId);
    const targetStatus = innings === 1 ? 'INNINGS_1' : 'INNINGS_2';
    const updated = db.updateGame(gameId, {
      status: targetStatus,
      current_innings: innings,
      current_ball_index: 0,
      forced_winner: forcedWinner,
    });

    if (adminId) {
      db.addAuditLog({
        actor_id: adminId,
        action: `START_INNINGS_${innings}`,
        game_id: gameId,
        reason: `Commenced Super Over Innings ${innings}`,
      });
    }

    this.broadcast('STATE_CHANGE', {
      gameId,
      status: targetStatus,
      currentInnings: innings,
      game: updated,
    });

    // Start auto-play ball by ball progression (3.5s per ball for excitement)
    this.startAutoPlay(gameId);

    return updated;
  }

  /**
   * Advance a single ball in current innings
   */
  public advanceBall(gameId: string, adminId?: string): { ball: BallRecord; game: Game } {
    const game = db.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    if (game.status !== 'INNINGS_1' && game.status !== 'INNINGS_2') {
      throw new Error(`Cannot advance ball when game status is ${game.status}`);
    }

    const config = db.getConfig();
    const innings = game.current_innings;
    const currentBallsInInnings = game.balls.filter((b) => b.innings === innings).length;
    const currentWicketsInInnings = innings === 1 ? game.team_a_wickets : game.team_b_wickets;

    // Gracefully handle innings completion if already finished (never throw error)
    if (currentBallsInInnings >= config.super_over_balls_per_innings) {
      this.stopAutoPlay(gameId);
      if (innings === 1) {
        const target = game.team_a_score + 1;
        const updated = db.updateGame(gameId, {
          status: 'INNINGS_BREAK',
          target_score: target,
        });
        this.transitionTimers.set(gameId, Date.now() + 3500);
        this.broadcast('STATE_CHANGE', {
          gameId,
          status: 'INNINGS_BREAK',
          targetScore: target,
          message: `${game.team_b} needs ${target} runs to win Super Over!`,
        });
        return { ball: game.balls[game.balls.length - 1], game: updated };
      } else {
        this.completeGame(gameId);
        return { ball: game.balls[game.balls.length - 1], game };
      }
    }

    const ballNumber = currentBallsInInnings + 1;
    const battingTeam = innings === 1 ? game.team_a : game.team_b;
    const bowlingTeam = innings === 1 ? game.team_b : game.team_a;

    // Always dynamically evaluate forcedWinner from live stakes
    const forcedWinner = game.forced_winner || this.determineForcedWinner(game.id);

    // Cryptographic server-side ball generation with Market Risk Engine (higher bets team loses)
    const generated = ResultEngine.generateSteeredBallOutcome({
      serverSeed: game.server_seed,
      gameId: game.id,
      innings,
      ballNumber,
      config,
      forcedWinner,
      teamA: game.team_a,
      teamB: game.team_b,
      teamAScore: game.team_a_score,
      teamAWickets: game.team_a_wickets,
      teamBScore: game.team_b_score,
      teamBWickets: game.team_b_wickets,
      targetScore: game.target_score,
      isTestMode: game.is_test_mode,
      testBallSequence: game.test_ball_sequence,
      forcedNextBall: game.forced_next_ball,
    });

    // Clear forced next ball after it has been used once
    if (game.forced_next_ball) {
      db.setForcedNextBall(game.id, undefined);
    }

    // Calculate updated innings score
    let newScore = innings === 1 ? game.team_a_score : game.team_b_score;
    let newWickets = innings === 1 ? game.team_a_wickets : game.team_b_wickets;

    newScore += generated.runs;
    if (generated.isWicket) {
      newWickets += 1;
    }

    // Record ball in database
    const recordedBall = db.recordBall(gameId, {
      game_id: gameId,
      innings,
      ball_number: ballNumber,
      batting_team: battingTeam,
      bowling_team: bowlingTeam,
      result: generated.outcome,
      runs: generated.runs,
      is_wicket: generated.isWicket,
      team_score_after: newScore,
      team_wickets_after: newWickets,
      random_hash: generated.hash,
    });

    // Update game score state
    const gameUpdates: Partial<Game> = {
      current_ball_index: ballNumber,
    };

    if (innings === 1) {
      gameUpdates.team_a_score = newScore;
      gameUpdates.team_a_wickets = newWickets;
    } else {
      gameUpdates.team_b_score = newScore;
      gameUpdates.team_b_wickets = newWickets;
    }

    let updatedGame = db.updateGame(gameId, gameUpdates);

    // Broadcast BALL_RESULT event to all clients
    this.broadcast('BALL_RESULT', {
      gameId,
      innings,
      ballNumber,
      battingTeam,
      bowlingTeam,
      result: generated.outcome,
      runs: generated.runs,
      isWicket: generated.isWicket,
      currentScore: newScore,
      currentWickets: newWickets,
      ballsRemaining: config.super_over_balls_per_innings - ballNumber,
      ball: recordedBall,
      game: updatedGame,
    });

    // Full over completion logic: No balls spare, entire 6-ball over must be bowled
    const isOverFinished = ballNumber >= config.super_over_balls_per_innings;

    if (innings === 1) {
      if (isOverFinished) {
        this.stopAutoPlay(gameId);
        // Team A finished full 6-ball over. Set target for Team B and mark INNINGS_BREAK
        const target = newScore + 1;
        updatedGame = db.updateGame(gameId, {
          status: 'INNINGS_BREAK',
          target_score: target,
        });

        this.transitionTimers.set(gameId, Date.now() + 3500);

        this.broadcast('STATE_CHANGE', {
          gameId,
          status: 'INNINGS_BREAK',
          targetScore: target,
          message: `${game.team_b} needs ${target} runs to win Super Over!`,
        });
      }
    } else {
      // Innings 2 - Over must be played completely (all 6 balls bowled, no early finish)
      if (isOverFinished) {
        this.stopAutoPlay(gameId);
        this.completeGame(gameId);
      }
    }

    return { ball: recordedBall, game: updatedGame };
  }

  /**
   * Recalculates odds based on stake distribution to balance the book (D.O.A.C)
   */
  private recalculateLiveOdds(gameId: string): void {
    const game = db.getGameById(gameId);
    if (!game || game.status !== 'OPEN') return;

    const entries = db.getGameEntries(gameId);
    let totalStakeA = 0;
    let totalStakeB = 0;

    for (const entry of entries) {
      if (entry.selection === game.team_a) {
        if (entry.bet_type === 'BACK') totalStakeA += entry.stake;
        else if (entry.bet_type === 'LAY') totalStakeB += entry.stake;
      } else if (entry.selection === game.team_b) {
        if (entry.bet_type === 'BACK') totalStakeB += entry.stake;
        else if (entry.bet_type === 'LAY') totalStakeA += entry.stake;
      }
    }

    const totalVolume = totalStakeA + totalStakeB;
    if (totalVolume === 0) return;

    // Target Margin: 5% (1.95 on both sides initially)
    // If stakes are lopsided, shift odds.
    const proportionA = totalStakeA / totalVolume;
    const proportionB = totalStakeB / totalVolume;

    // Dynamic shift: Base 1.95, shifts up to 1.10 or down to 4.50
    // Simple linear interpolation for demonstration:
    // If A has 100% stake, odds for A should be very low (1.01) and B very high (10.0+)
    let newBackA = 1.95;
    let newBackB = 1.95;

    if (proportionA > 0.6) {
      // Team A is favorite by volume
      const intensity = (proportionA - 0.5) * 2; // 0 to 1
      newBackA = Math.max(1.10, 1.95 - (intensity * 0.85));
      newBackB = Math.min(6.50, 1.95 + (intensity * 4.50));
    } else if (proportionB > 0.6) {
      // Team B is favorite by volume
      const intensity = (proportionB - 0.5) * 2; // 0 to 1
      newBackB = Math.max(1.10, 1.95 - (intensity * 0.85));
      newBackA = Math.min(6.50, 1.95 + (intensity * 4.50));
    }

    // Update DB if significantly changed (prevent noise)
    if (Math.abs(newBackA - game.back_odds_team_a) > 0.01 || Math.abs(newBackB - game.back_odds_team_b) > 0.01) {
      db.updateGame(gameId, {
        back_odds_team_a: Number(newBackA.toFixed(2)),
        lay_odds_team_a: Number((newBackA + 0.10).toFixed(2)),
        back_odds_team_b: Number(newBackB.toFixed(2)),
        lay_odds_team_b: Number((newBackB + 0.10).toFixed(2)),
        market_stakes: {
          team_a: totalStakeA,
          team_b: totalStakeB
        }
      });
    }
  }

  /**
   * Finalize game, reveal server seed, determine winner, settle all bets
   */
  public async completeGame(gameId: string): Promise<Game> {
    const game = db.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    this.stopAutoPlay(gameId);

    let winner = '';
    let winMargin = '';
    let isTie = false;

    // Strict Risk Rule: The team with more bets MUST LOSE HAR SURAT MEN (in every condition)!
    const forcedWinner = game.forced_winner || this.determineForcedWinner(gameId);

    if (forcedWinner) {
      winner = forcedWinner;
      isTie = false;

      if (forcedWinner === game.team_a) {
        // Team A must win, Team B must lose
        if (game.team_a_score <= game.team_b_score) {
          game.team_a_score = Math.max(18, game.team_b_score + 4);
          db.updateGame(gameId, { team_a_score: game.team_a_score });
        }
        winMargin = `${game.team_a} won by ${game.team_a_score - game.team_b_score} runs`;
      } else if (forcedWinner === game.team_b) {
        // Team B must win, Team A must lose
        if (game.team_b_score <= game.team_a_score) {
          game.team_b_score = game.team_a_score + 1;
          db.updateGame(gameId, { team_b_score: game.team_b_score });
        }
        winMargin = `${game.team_b} won by ${Math.max(1, 2 - game.team_b_wickets)} wickets`;
      }
    } else if (game.team_a_score > game.team_b_score) {
      winner = game.team_a;
      winMargin = `${game.team_a} won by ${game.team_a_score - game.team_b_score} runs`;
    } else if (game.team_b_score > game.team_a_score) {
      winner = game.team_b;
      winMargin = `${game.team_b} won by ${Math.max(1, 2 - game.team_b_wickets)} wickets`;
    } else {
      // Tie! Check tie breaker rule
      isTie = true;
      const config = db.getConfig();
      if (config.tie_breaker_rule === 'BOUNDARY_COUNT') {
        const teamABoundaries = game.balls.filter(
          (b) => b.innings === 1 && (b.result === '4' || b.result === '6')
        ).length;
        const teamBBoundaries = game.balls.filter(
          (b) => b.innings === 2 && (b.result === '4' || b.result === '6')
        ).length;

        if (teamABoundaries > teamBBoundaries) {
          winner = game.team_a;
          winMargin = `Match Tied! ${game.team_a} won on boundary count (${teamABoundaries} vs ${teamBBoundaries})`;
        } else if (teamBBoundaries > teamABoundaries) {
          winner = game.team_b;
          winMargin = `Match Tied! ${game.team_b} won on boundary count (${teamBBoundaries} vs ${teamABoundaries})`;
        } else {
          winner = 'TIE';
          winMargin = 'Super Over Tied! Boundaries equal';
        }
      } else {
        winner = 'TIE';
        winMargin = 'Super Over Tied! Points shared';
      }
    }

    // Reveal server seed
    const updated = db.updateGame(gameId, {
      status: 'COMPLETED',
      winner,
      win_margin: winMargin,
      is_tie: isTie,
      is_seed_revealed: true,
    });

    // Settle all bets and credit player wallets atomically!
    await db.settleGameBets(gameId, winner, isTie);

    // Audit log
    db.addAuditLog({
      actor_id: 'SYSTEM_ENGINE',
      action: 'GAME_COMPLETED',
      game_id: gameId,
      new_value: JSON.stringify({
        winner,
        win_margin: winMargin,
        score_a: game.team_a_score,
        score_b: game.team_b_score,
        server_seed_revealed: game.server_seed,
      }),
      reason: 'Super Over completed naturally, bets settled',
    });

    // Broadcast completion to all clients
    this.broadcast('GAME_COMPLETED', {
      gameId,
      status: 'COMPLETED',
      winner,
      winMargin,
      isTie,
      teamAScore: game.team_a_score,
      teamAWickets: game.team_a_wickets,
      teamBScore: game.team_b_score,
      teamBWickets: game.team_b_wickets,
      serverSeed: game.server_seed,
      serverSeedHash: game.server_seed_hash,
      game: updated,
    });

    // Schedule next match after 8 seconds celebration window (so users can clearly see the final result & scores)
    this.nextMatchScheduledAt = Date.now() + 8000;

    return updated;
  }

  /**
   * Cancel game and refund all stakes to user wallets
   */
  public async cancelGame(gameId: string, reason: string, adminId: string): Promise<Game> {
    const game = db.getGameById(gameId);
    if (!game) throw new Error('Game not found');

    this.stopAutoPlay(gameId);

    const updated = db.updateGame(gameId, {
      status: 'CANCELLED',
      win_margin: `Game Cancelled: ${reason}`,
    });

    // Refund pending bets
    const entries = db.getGameEntries(gameId).filter((e) => e.status === 'PENDING');
    for (const entry of entries) {
      entry.status = 'REFUNDED';
      entry.settled_amount = entry.stake;

      await db.executeWalletOperation({
        userId: entry.user_id,
        type: 'REFUND',
        amount: entry.stake,
        reference: `REF-${entry.id}`,
        notes: `Refund for cancelled game: ${game.title}`,
        gameId,
      });

      db.addNotification({
        user_id: entry.user_id,
        title: 'Bet Refunded',
        message: `Your stake of ₹${entry.stake} for ${game.title} was refunded due to match cancellation.`,
        type: 'INFO',
      });
    }

    db.addAuditLog({
      actor_id: adminId,
      action: 'GAME_CANCELLED',
      game_id: gameId,
      reason,
    });

    this.broadcast('STATE_CHANGE', {
      gameId,
      status: 'CANCELLED',
      reason,
      game: updated,
    });

    return updated;
  }

  /**
   * Automated ball-by-ball pacing timer (simulates cricket delivery every 3.5s)
   */
  public startAutoPlay(gameId: string): void {
    if (this.autoPlayIntervals.has(gameId)) return;

    const interval = setInterval(() => {
      const game = db.getGameById(gameId);
      if (!game || (game.status !== 'INNINGS_1' && game.status !== 'INNINGS_2')) {
        this.stopAutoPlay(gameId);
        return;
      }

      try {
        this.advanceBall(gameId, 'AUTO_PLAY_ENGINE');
      } catch (e) {
        console.warn('Auto play advance ended:', e);
        this.stopAutoPlay(gameId);
      }
    }, 3000);

    this.autoPlayIntervals.set(gameId, interval);
  }

  public stopAutoPlay(gameId: string): void {
    const interval = this.autoPlayIntervals.get(gameId);
    if (interval) {
      clearInterval(interval);
      this.autoPlayIntervals.delete(gameId);
    }
  }
}

export const gameManager = GameManager.getInstance();
