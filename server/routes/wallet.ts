import { Router } from 'express';
import { requireAuth, AuthenticatedRequest } from '../services/authService.ts';
import { db } from '../db/database.ts';

const router = Router();

router.use(requireAuth);

// GET /api/wallet/my-wallet
router.get('/my-wallet', (req: AuthenticatedRequest, res) => {
  const wallet = db.getWallet(req.user!.user_id);
  res.json({ success: true, data: wallet });
});

// GET /api/wallet/transactions
router.get('/transactions', (req: AuthenticatedRequest, res) => {
  const txs = db.getTransactions(req.user!.user_id);
  res.json({ success: true, data: txs });
});

// GET /api/wallet/my-bets
router.get('/my-bets', (req: AuthenticatedRequest, res) => {
  const bets = db.getGameEntries(undefined, req.user!.user_id);
  res.json({ success: true, data: bets });
});

export default router;
