import { Router } from 'express';
import { db } from '../db/database.ts';
import { requireAuth, AuthenticatedRequest } from '../services/authService.ts';
import { ResultEngine } from '../services/resultEngine.ts';
import { gameManager } from '../services/gameManager.ts';

const router = Router();

// GET /api/games - List all games
router.get('/', (req, res) => {
  const { status } = req.query;
  let games = db.getAllGames();

  if (status && typeof status === 'string' && status !== 'ALL') {
    games = games.filter((g) => g.status === status);
  }

  // Do not expose unrevealed server seed
  const sanitized = games.map((g) => ({
    ...g,
    server_seed: g.is_seed_revealed ? g.server_seed : 'HIDDEN_UNTIL_COMPLETION',
  }));

  res.json({ success: true, data: sanitized });
});

// GET /api/games/active/current - Quick lookup for current live match
router.get('/active/current', (req, res) => {
  const games = db.getAllGames();
  const current =
    games.find((g) => g.status === 'OPEN' || g.status === 'INNINGS_1' || g.status === 'INNINGS_2' || g.status === 'LOCKED') ||
    games.find((g) => g.status === 'SCHEDULED') ||
    games[0];

  if (!current) {
    return res.status(404).json({ success: false, error: { code: 'NO_ACTIVE_GAME', message: 'No games found' } });
  }

  res.json({
    success: true,
    data: {
      ...current,
      server_seed: current.is_seed_revealed ? current.server_seed : 'HIDDEN_UNTIL_COMPLETION',
    },
  });
});

// GET /api/games/:id - Single game details
router.get('/:id', (req, res) => {
  const game = db.getGameById(req.params.id);
  if (!game) {
    return res.status(404).json({
      success: false,
      error: { code: 'GAME_NOT_FOUND', message: 'Game does not exist' },
    });
  }

  res.json({
    success: true,
    data: {
      ...game,
      server_seed: game.is_seed_revealed ? game.server_seed : 'HIDDEN_UNTIL_COMPLETION',
    },
  });
});

// GET /api/games/:id/events - Ball events
router.get('/:id/events', (req, res) => {
  const game = db.getGameById(req.params.id);
  if (!game) {
    return res.status(404).json({
      success: false,
      error: { code: 'GAME_NOT_FOUND', message: 'Game does not exist' },
    });
  }

  res.json({
    success: true,
    data: {
      gameId: game.id,
      gameCode: game.game_code,
      status: game.status,
      currentInnings: game.current_innings,
      balls: game.balls,
    },
  });
});

// GET /api/games/:id/result - Final result
router.get('/:id/result', (req, res) => {
  const game = db.getGameById(req.params.id);
  if (!game) {
    return res.status(404).json({
      success: false,
      error: { code: 'GAME_NOT_FOUND', message: 'Game does not exist' },
    });
  }

  res.json({
    success: true,
    data: {
      gameId: game.id,
      gameCode: game.game_code,
      title: game.title,
      status: game.status,
      winner: game.winner,
      winMargin: game.win_margin,
      teamAScore: `${game.team_a_score}/${game.team_a_wickets}`,
      teamBScore: `${game.team_b_score}/${game.team_b_wickets}`,
      serverSeedHash: game.server_seed_hash,
      serverSeedRevealed: game.is_seed_revealed ? game.server_seed : null,
      balls: game.balls,
    },
  });
});

// GET /api/games/:id/verify - Provably Fair Verification
router.get('/:id/verify', (req, res) => {
  const game = db.getGameById(req.params.id);
  if (!game) {
    return res.status(404).json({
      success: false,
      error: { code: 'GAME_NOT_FOUND', message: 'Game does not exist' },
    });
  }

  if (!game.is_seed_revealed) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'SEED_NOT_REVEALED',
        message: 'Server seed is revealed only after the Super Over is completed to ensure cryptographic integrity.',
      },
    });
  }

  const isHashValid = ResultEngine.verifySeedHash(game.server_seed, game.server_seed_hash);
  const config = db.getConfig();

  // Recalculate deterministic balls
  const recalculatedBalls = ResultEngine.recalculateGameBalls({
    serverSeed: game.server_seed,
    gameId: game.id,
    config,
    totalInnings: 2,
    ballsPerInnings: 6,
  });

  res.json({
    success: true,
    data: {
      gameId: game.id,
      gameCode: game.game_code,
      serverSeed: game.server_seed,
      serverSeedHash: game.server_seed_hash,
      isHashValid,
      actualRecordedBalls: game.balls,
      recalculatedBalls,
      isTestMode: game.is_test_mode,
      verificationStatus: isHashValid ? 'PASSED_PROVABLY_FAIR' : 'FAILED_INTEGRITY_CHECK',
    },
  });
});

// POST /api/games/:id/bet - Place Bet / Game Entry
router.post('/:id/bet', requireAuth, async (req: AuthenticatedRequest, res) => {
  try {
    const gameId = req.params.id;
    const { selection, betType = 'BACK', stake, odds } = req.body;
    const user = req.user!;

    const game = db.getGameById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        error: { code: 'GAME_NOT_FOUND', message: 'Game not found' },
      });
    }

    // Server-authoritative check: Market must be in OPEN state and timer > 0
    if (game.status !== 'OPEN' || game.remaining_seconds <= 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'BETTING_CLOSED',
          message: 'Betting is locked. Market closed when timer reached zero.',
        },
      });
    }

    if (!selection || !stake || !odds) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'Selection, stake, and odds are required' },
      });
    }

    const numStake = Number(stake);
    const numOdds = Number(odds);

    const config = db.getConfig();
    if (numStake < config.min_bet_amount) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STAKE', message: `Minimum bet amount is 💵 ${config.min_bet_amount}` },
      });
    }

    if (numStake <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_STAKE', message: 'Stake must be a positive amount' },
      });
    }

    // Deduct stake from wallet via atomic ledger transaction
    const walletResult = await db.executeWalletOperation({
      userId: user.user_id,
      type: 'GAME_ENTRY',
      amount: numStake,
      reference: `BET-${gameId.substring(0, 8)}`,
      notes: `Super Over Bet: ${selection} (${betType}) @ ${numOdds}`,
      gameId,
    });

    // Create bet entry record
    const entry = db.placeBet({
      userId: user.user_id,
      gameId,
      selection,
      betType: betType as 'BACK' | 'LAY',
      stake: numStake,
      odds: numOdds,
    });

    // Notify WebSocket listeners
    gameManager.broadcast('BET_PLACED', {
      gameId,
      selection,
      stake: numStake,
      odds: numOdds,
    });

    res.json({
      success: true,
      data: {
        entry,
        wallet: walletResult.wallet,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'BET_PLACEMENT_FAILED', message: error.message },
    });
  }
});

export default router;
