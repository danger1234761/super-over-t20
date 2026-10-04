import { Router } from 'express';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../services/authService.ts';
import { db } from '../db/database.ts';
import { gameManager } from '../services/gameManager.ts';

const router = Router();

// All routes in this router require authentication and ADMIN role
router.use(requireAuth);
router.use(requireAdmin);

// ==========================================
// 1. DASHBOARD METRICS
// ==========================================
router.get('/stats', (req: AuthenticatedRequest, res) => {
  const users = db.getAllUsers().filter((u) => u.role === 'USER');
  const games = db.getAllGames();
  const transactions = db.getTransactions();

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === 'ACTIVE').length;
  const suspendedUsers = users.filter((u) => u.status === 'SUSPENDED').length;
  const disabledUsers = users.filter((u) => u.status === 'DISABLED').length;

  const activeGames = games.filter(
    (g) => g.status === 'OPEN' || g.status === 'INNINGS_1' || g.status === 'INNINGS_2' || g.status === 'LOCKED'
  ).length;
  const completedGames = games.filter((g) => g.status === 'COMPLETED').length;

  let totalDeposits = 0;
  let totalWithdrawals = 0;

  for (const tx of transactions) {
    if (tx.status === 'COMPLETED') {
      if (tx.type === 'DEPOSIT') totalDeposits += tx.amount;
      if (tx.type === 'WITHDRAWAL') totalWithdrawals += tx.amount;
    }
  }

  res.json({
    success: true,
    data: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      disabledUsers,
      activeGames,
      completedGames,
      totalDeposits,
      totalWithdrawals,
      currency: db.getConfig().currency || 'INR',
    },
  });
});

// ==========================================
// 2. USER MANAGEMENT
// ==========================================

// GET /api/admin/users
router.get('/users', (req: AuthenticatedRequest, res) => {
  const { search, status } = req.query;
  let users = db.getAllUsers().filter((u) => u.role === 'USER');

  if (status && typeof status === 'string' && status !== 'ALL') {
    users = users.filter((u) => u.status === status);
  }

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.user_id.toLowerCase().includes(q) ||
        u.full_name.toLowerCase().includes(q) ||
        u.mobile.toLowerCase().includes(q)
    );
  }

  // Include wallet balance summary with each user
  const usersWithWallet = users.map((u) => {
    const w = db.getWallet(u.user_id);
    return {
      id: u.id,
      userId: u.user_id,
      fullName: u.full_name,
      mobile: u.mobile,
      role: u.role,
      status: u.status,
      adminNotes: u.admin_notes,
      createdAt: u.created_at,
      lastLoginAt: u.last_login_at,
      wallet: {
        balance: w.balance,
        available_balance: w.available_balance,
        total_deposits: w.total_deposits,
        total_withdrawals: w.total_withdrawals,
      },
    };
  });

  res.json({ success: true, data: usersWithWallet });
});

// POST /api/admin/users
router.post('/users', (req: AuthenticatedRequest, res) => {
  try {
    const { userId, fullName, mobile, password, status, adminNotes } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'Username and password are required' },
      });
    }

    const created = db.createUser({
      user_id: userId,
      full_name: fullName || userId,
      mobile: mobile || '0000000000',
      password_plain: password,
      status: status || 'ACTIVE',
      admin_notes: adminNotes,
      admin_id: req.user!.user_id,
    });

    res.json({ success: true, data: created });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'USER_CREATION_FAILED', message: error.message },
    });
  }
});

// GET /api/admin/users/:id
router.get('/users/:id', (req: AuthenticatedRequest, res) => {
  const targetUserId = req.params.id.toUpperCase();
  const user = db.getUserById(targetUserId);

  if (!user) {
    return res.status(404).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'User does not exist' },
    });
  }

  const wallet = db.getWallet(targetUserId);
  const transactions = db.getTransactions(targetUserId).slice(0, 50);
  const gameEntries = db.getGameEntries(undefined, targetUserId).slice(0, 50);
  const auditLogs = db.getAuditLogs({ targetUserId }).slice(0, 50);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        userId: user.user_id,
        fullName: user.full_name,
        mobile: user.mobile,
        role: user.role,
        status: user.status,
        adminNotes: user.admin_notes,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      },
      wallet,
      transactions,
      gameEntries,
      auditLogs,
    },
  });
});

// PATCH /api/admin/users/:id
router.patch('/users/:id', (req: AuthenticatedRequest, res) => {
  try {
    const targetUserId = req.params.id.toUpperCase();
    const { fullName, mobile, status, adminNotes } = req.body;

    const updated = db.updateUser(
      targetUserId,
      {
        full_name: fullName,
        mobile,
        status,
        admin_notes: adminNotes,
      },
      req.user!.user_id
    );

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/users/:id/reset-password
router.post('/users/:id/reset-password', (req: AuthenticatedRequest, res) => {
  try {
    const targetUserId = req.params.id.toUpperCase();
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_PASSWORD', message: 'Password must be at least 6 characters long' },
      });
    }

    db.resetUserPassword(targetUserId, newPassword, req.user!.user_id);

    db.addNotification({
      user_id: targetUserId,
      title: 'Password Reset',
      message: 'Your account password has been reset by administration.',
      type: 'WARNING',
    });

    res.json({ success: true, message: `Password reset successfully for ${targetUserId}` });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'RESET_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/users/:id/suspend
router.post('/users/:id/suspend', (req: AuthenticatedRequest, res) => {
  try {
    const targetUserId = req.params.id.toUpperCase();
    const { reason = 'Administrative suspension' } = req.body;

    const updated = db.setUserStatus(targetUserId, 'SUSPENDED', reason, req.user!.user_id);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'SUSPEND_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/users/:id/activate
router.post('/users/:id/activate', (req: AuthenticatedRequest, res) => {
  try {
    const targetUserId = req.params.id.toUpperCase();
    const { reason = 'Account activated by admin' } = req.body;

    const updated = db.setUserStatus(targetUserId, 'ACTIVE', reason, req.user!.user_id);

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'ACTIVATE_FAILED', message: error.message },
    });
  }
});

// ==========================================
// 3. ADMIN-ONLY FINANCIAL OPERATIONS
// ==========================================

// POST /api/admin/users/:id/deposit
router.post('/users/:id/deposit', async (req: AuthenticatedRequest, res) => {
  try {
    const targetUserId = req.params.id.toUpperCase();
    const { amount, reference, note } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Deposit amount must be a positive number' },
      });
    }

    const result = await db.executeWalletOperation({
      userId: targetUserId,
      type: 'DEPOSIT',
      amount: numAmount,
      reference: reference || 'ADMIN_DEPOSIT',
      notes: note || 'Direct deposit processed by admin',
      adminId: req.user!.user_id,
    });

    db.addNotification({
      user_id: targetUserId,
      title: 'Deposit Received',
      message: `₹${numAmount} credited to your wallet (Ref: ${result.transaction.transaction_id})`,
      type: 'SUCCESS',
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'DEPOSIT_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/users/:id/withdraw
router.post('/users/:id/withdraw', async (req: AuthenticatedRequest, res) => {
  try {
    const targetUserId = req.params.id.toUpperCase();
    const { amount, reference, note } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Withdrawal amount must be a positive number' },
      });
    }

    const result = await db.executeWalletOperation({
      userId: targetUserId,
      type: 'WITHDRAWAL',
      amount: numAmount,
      reference: reference || 'ADMIN_WITHDRAWAL',
      notes: note || 'Withdrawal executed by admin',
      adminId: req.user!.user_id,
    });

    db.addNotification({
      user_id: targetUserId,
      title: 'Withdrawal Processed',
      message: `₹${numAmount} withdrawn from your wallet (Ref: ${result.transaction.transaction_id})`,
      type: 'INFO',
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'WITHDRAWAL_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/users/:id/adjustment
router.post('/users/:id/adjustment', async (req: AuthenticatedRequest, res) => {
  try {
    const targetUserId = req.params.id.toUpperCase();
    const { amount, reason } = req.body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_AMOUNT', message: 'Adjustment amount cannot be zero' },
      });
    }

    if (!reason || reason.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'REASON_REQUIRED', message: 'A mandatory reason is required for balance adjustment' },
      });
    }

    const result = await db.executeWalletOperation({
      userId: targetUserId,
      type: 'ADJUSTMENT',
      amount: numAmount,
      reference: `ADJ-${req.user!.user_id}`,
      notes: reason,
      adminId: req.user!.user_id,
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'ADJUSTMENT_FAILED', message: error.message },
    });
  }
});

// GET /api/admin/wallet/transactions
router.get('/wallet/transactions', (req: AuthenticatedRequest, res) => {
  const { userId, type } = req.query;
  let txs = db.getTransactions(userId as string);

  if (type && typeof type === 'string' && type !== 'ALL') {
    txs = txs.filter((t) => t.type === type);
  }

  res.json({ success: true, data: txs });
});

// ==========================================
// 4. AUDIT LOGS
// ==========================================
router.get('/audit-logs', (req: AuthenticatedRequest, res) => {
  const { actorId, targetUserId, action } = req.query;
  const logs = db.getAuditLogs({
    actorId: actorId as string,
    targetUserId: targetUserId as string,
    action: action as string,
  });

  res.json({ success: true, data: logs });
});

// ==========================================
// 5. GAME MANAGEMENT & LIVE CONTROLS
// ==========================================

// POST /api/admin/games
router.post('/games', (req: AuthenticatedRequest, res) => {
  try {
    const {
      title,
      team_a,
      team_b,
      countdown_seconds,
      back_odds_team_a,
      lay_odds_team_a,
      back_odds_team_b,
      lay_odds_team_b,
      is_test_mode,
      test_ball_sequence,
    } = req.body;

    if (!team_a || !team_b) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TEAMS', message: 'Team A and Team B are required' },
      });
    }

    const newGame = db.createGame({
      title,
      team_a,
      team_b,
      countdown_seconds: countdown_seconds ? Number(countdown_seconds) : 45,
      back_odds_team_a: back_odds_team_a ? Number(back_odds_team_a) : 1.95,
      lay_odds_team_a: lay_odds_team_a ? Number(lay_odds_team_a) : 2.05,
      back_odds_team_b: back_odds_team_b ? Number(back_odds_team_b) : 1.95,
      lay_odds_team_b: lay_odds_team_b ? Number(lay_odds_team_b) : 2.05,
      is_test_mode: !!is_test_mode,
      test_ball_sequence: Array.isArray(test_ball_sequence) ? test_ball_sequence : undefined,
      admin_id: req.user!.user_id,
    });

    res.json({ success: true, data: newGame });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'GAME_CREATION_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/games/:id/open
router.post('/games/:id/open', (req: AuthenticatedRequest, res) => {
  try {
    const game = gameManager.openGame(req.params.id, req.user!.user_id);
    res.json({ success: true, data: game });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'OPEN_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/games/:id/lock
router.post('/games/:id/lock', (req: AuthenticatedRequest, res) => {
  try {
    const game = gameManager.lockGame(req.params.id, req.user!.user_id);
    res.json({ success: true, data: game });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'LOCK_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/games/:id/start
router.post('/games/:id/start', (req: AuthenticatedRequest, res) => {
  try {
    const innings = Number(req.body.innings || 1) as 1 | 2;
    const game = gameManager.startInnings(req.params.id, innings, req.user!.user_id);
    res.json({ success: true, data: game });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'START_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/games/:id/next-ball
router.post('/games/:id/next-ball', (req: AuthenticatedRequest, res) => {
  try {
    const result = gameManager.advanceBall(req.params.id, req.user!.user_id);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'BALL_ADVANCE_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/games/:id/auto-play
router.post('/games/:id/auto-play', (req: AuthenticatedRequest, res) => {
  const { enabled } = req.body;
  if (enabled) {
    gameManager.startAutoPlay(req.params.id);
  } else {
    gameManager.stopAutoPlay(req.params.id);
  }
  res.json({ success: true, autoPlay: enabled });
});

// POST /api/admin/games/:id/cancel
router.post('/games/:id/cancel', async (req: AuthenticatedRequest, res) => {
  try {
    const { reason = 'Match cancelled by admin' } = req.body;
    const game = await gameManager.cancelGame(req.params.id, reason, req.user!.user_id);
    res.json({ success: true, data: game });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CANCEL_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/games/:id/test-sequence
router.post('/games/:id/test-sequence', (req: AuthenticatedRequest, res) => {
  try {
    const { isTestMode, sequence } = req.body;
    const game = db.getGameById(req.params.id);
    if (!game) throw new Error('Game not found');

    if (game.status !== 'DRAFT' && game.status !== 'SCHEDULED' && game.status !== 'OPEN') {
      throw new Error('Test sequence can only be configured before the match starts');
    }

    const updated = db.updateGame(req.params.id, {
      is_test_mode: !!isTestMode,
      test_ball_sequence: Array.isArray(sequence) ? sequence : [],
    });

    db.addAuditLog({
      actor_id: req.user!.user_id,
      action: 'TEST_SEQUENCE_CONFIGURED',
      game_id: req.params.id,
      new_value: JSON.stringify({ isTestMode, sequence }),
      reason: 'Admin configured predefined test mode ball sequence',
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'TEST_CONFIG_FAILED', message: error.message },
    });
  }
});

// POST /api/admin/games/:id/manual-ball - Immediate override for the VERY NEXT ball
router.post('/games/:id/manual-ball', (req: AuthenticatedRequest, res) => {
  try {
    const { result } = req.body; // '0', '1', '2', '3', '4', '6', 'W' or undefined to clear
    const game = db.setForcedNextBall(req.params.id, result);
    
    db.addAuditLog({
      actor_id: req.user!.user_id,
      action: 'MANUAL_BALL_SET',
      game_id: req.params.id,
      new_value: result || 'CLEARED',
      reason: 'Admin set manual override for immediate next ball',
    });

    res.json({ success: true, data: game });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'MANUAL_BALL_FAILED', message: error.message },
    });
  }
});

// ==========================================
// 6. SETTINGS & PROBABILITIES
// ==========================================
router.get('/settings', (req: AuthenticatedRequest, res) => {
  res.json({ success: true, data: db.getConfig() });
});

router.post('/settings', (req: AuthenticatedRequest, res) => {
  try {
    const updated = db.updateConfig(req.body, req.user!.user_id);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'CONFIG_UPDATE_FAILED', message: error.message },
    });
  }
});

export default router;
