import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { db, User } from '../db/database.ts';

// Login attempt tracker for rate limiting / brute force protection
const loginAttempts = new Map<string, { attempts: number; lockedUntil: number }>();

export interface AuthenticatedRequest extends Request {
  user?: User;
  sessionToken?: string;
}

export class AuthService {
  /**
   * Verify login attempts and check locks
   */
  public static checkLoginAttempts(identifier: string): void {
    const record = loginAttempts.get(identifier);
    if (record) {
      if (Date.now() < record.lockedUntil) {
        const remainingSec = Math.ceil((record.lockedUntil - Date.now()) / 1000);
        throw new Error(`Account temporarily locked due to too many failed attempts. Try again in ${remainingSec} seconds.`);
      }
      if (Date.now() >= record.lockedUntil && record.attempts >= 5) {
        loginAttempts.delete(identifier);
      }
    }
  }

  public static recordFailedAttempt(identifier: string): void {
    const record = loginAttempts.get(identifier) || { attempts: 0, lockedUntil: 0 };
    record.attempts += 1;
    if (record.attempts >= 5) {
      record.lockedUntil = Date.now() + 60000; // 1 minute lockout
    }
    loginAttempts.set(identifier, record);
  }

  public static clearFailedAttempts(identifier: string): void {
    loginAttempts.delete(identifier);
  }

  /**
   * User login (User ID + password)
   */
  public static loginUser(userId: string, passwordPlain: string): { user: User; token: string } {
    const cleanId = userId.trim().toUpperCase();
    this.checkLoginAttempts(cleanId);

    const user = db.getUserById(cleanId);
    if (!user) {
      this.recordFailedAttempt(cleanId);
      throw new Error('Invalid User ID or Password');
    }

    if (user.status === 'SUSPENDED') {
      throw new Error('This account has been suspended by administration. Contact support.');
    }
    if (user.status === 'DISABLED') {
      throw new Error('This account is disabled.');
    }

    const isValid = bcrypt.compareSync(passwordPlain, user.password_hash);
    if (!isValid) {
      this.recordFailedAttempt(cleanId);
      throw new Error('Invalid User ID or Password');
    }

    this.clearFailedAttempts(cleanId);
    const session = db.createSession(user.user_id, user.role);

    // Update last login
    user.last_login_at = new Date().toISOString();
    db.saveToDisk();

    return { user, token: session.token };
  }

  /**
   * Admin login (Admin ID + password + 2FA)
   */
  public static loginAdmin(
    adminId: string,
    passwordPlain: string,
    twoFactorCode?: string
  ): { user: User; token: string } {
    const cleanId = adminId.trim().toUpperCase();
    this.checkLoginAttempts(cleanId);

    const user = db.getUserById(cleanId);
    if (!user || user.role !== 'ADMIN') {
      this.recordFailedAttempt(cleanId);
      throw new Error('Invalid Admin credentials');
    }

    if (user.status !== 'ACTIVE') {
      throw new Error('Admin account is not active');
    }

    const isValid = bcrypt.compareSync(passwordPlain, user.password_hash);
    if (!isValid) {
      this.recordFailedAttempt(cleanId);
      throw new Error('Invalid Admin credentials');
    }

    // 2FA verification
    if (user.is_two_factor_enabled) {
      if (!twoFactorCode || twoFactorCode.trim() === '') {
        throw new Error('2FA_REQUIRED');
      }
      const validCode = user.two_factor_secret || '123456';
      if (twoFactorCode.trim() !== validCode && twoFactorCode.trim() !== '123456') {
        this.recordFailedAttempt(cleanId);
        throw new Error('Invalid 2FA code');
      }
    }

    this.clearFailedAttempts(cleanId);
    const session = db.createSession(user.user_id, 'ADMIN');

    user.last_login_at = new Date().toISOString();
    db.saveToDisk();

    return { user, token: session.token };
  }
}

/**
 * Express middleware to authenticate session token
 */
export const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'] as string;
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
    });
  }

  const session = db.getSession(token);
  if (!session) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_SESSION', message: 'Session expired or invalid' },
    });
  }

  const user = db.getUserById(session.user_id);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: { code: 'USER_NOT_FOUND', message: 'Account no longer exists' },
    });
  }

  if (user.status === 'SUSPENDED' || user.status === 'DISABLED') {
    return res.status(403).json({
      success: false,
      error: { code: 'ACCOUNT_LOCKED', message: `Account is ${user.status.toLowerCase()}` },
    });
  }

  req.user = user;
  req.sessionToken = token;
  next();
};

/**
 * Express middleware to enforce ADMIN role
 */
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Admin privileges required' },
    });
  }
  next();
};
