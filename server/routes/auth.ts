import { Router } from 'express';
import { AuthService, requireAuth, AuthenticatedRequest } from '../services/authService.ts';
import { db } from '../db/database.ts';

const router = Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { userId, password, role = 'USER', twoFactorCode } = req.body;

    if (!userId || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_FIELDS', message: 'User ID and Password are required' },
      });
    }

    if (role === 'ADMIN') {
      const result = AuthService.loginAdmin(userId, password, twoFactorCode);
      const wallet = db.getWallet(result.user.user_id);
      return res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            userId: result.user.user_id,
            fullName: result.user.full_name,
            role: result.user.role,
            status: result.user.status,
            mobile: result.user.mobile,
          },
          token: result.token,
          wallet,
        },
      });
    } else {
      const result = AuthService.loginUser(userId, password);
      const wallet = db.getWallet(result.user.user_id);
      return res.json({
        success: true,
        data: {
          user: {
            id: result.user.id,
            userId: result.user.user_id,
            fullName: result.user.full_name,
            role: result.user.role,
            status: result.user.status,
            mobile: result.user.mobile,
          },
          token: result.token,
          wallet,
        },
      });
    }
  } catch (error: any) {
    if (error.message === '2FA_REQUIRED') {
      return res.status(200).json({
        success: false,
        requires2FA: true,
        message: 'Admin 2FA code required. Enter your 6-digit authenticator code (Demo default: 123456).',
      });
    }
    return res.status(400).json({
      success: false,
      error: { code: 'AUTH_FAILED', message: error.message || 'Authentication failed' },
    });
  }
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req: AuthenticatedRequest, res) => {
  if (req.sessionToken) {
    db.removeSession(req.sessionToken);
  }
  res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  const wallet = db.getWallet(user.user_id);
  const notifications = db.getNotifications(user.user_id).slice(0, 5);

  res.json({
    success: true,
    data: {
      user: {
        id: user.id,
        userId: user.user_id,
        fullName: user.full_name,
        role: user.role,
        status: user.status,
        mobile: user.mobile,
        adminNotes: user.role === 'ADMIN' ? user.admin_notes : undefined,
        createdAt: user.created_at,
        lastLoginAt: user.last_login_at,
      },
      wallet,
      notifications,
    },
  });
});

export default router;
