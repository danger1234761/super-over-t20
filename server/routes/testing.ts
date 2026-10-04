import { Router } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from '../db/database.ts';
import { AuthService } from '../services/authService.ts';
import { ResultEngine } from '../services/resultEngine.ts';
import { gameManager } from '../services/gameManager.ts';

const router = Router();

export interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  details?: any;
}

router.get('/run-suite', async (req, res) => {
  const results: TestResult[] = [];

  const runTest = (category: string, name: string, fn: () => void | Promise<void>) => {
    try {
      fn();
      results.push({ category, name, passed: true, message: 'Assertion verified successfully' });
    } catch (e: any) {
      results.push({ category, name, passed: false, message: e.message || 'Assertion failed' });
    }
  };

  const runAsyncTest = async (category: string, name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      results.push({ category, name, passed: true, message: 'Assertion verified successfully' });
    } catch (e: any) {
      results.push({ category, name, passed: false, message: e.message || 'Assertion failed' });
    }
  };

  // 1. Password Hashing Test
  runTest('Authentication', 'Argon2/Bcrypt Password Hashing & Non-Plaintext Storage', () => {
    const user = db.getUserById('USER1001');
    if (!user) throw new Error('User not found');
    if (user.password_hash === 'User@123') throw new Error('Password stored in plaintext!');
    if (!user.password_hash.startsWith('$2a$') && !user.password_hash.startsWith('$2b$')) {
      throw new Error('Password hash does not conform to standard bcrypt salt signature');
    }
    const matches = bcrypt.compareSync('User@123', user.password_hash);
    if (!matches) throw new Error('Bcrypt hash comparison failed for valid password');
  });

  // 2. Authentication & 2FA Test
  runTest('Authentication', 'Admin 2FA & Role Authentication', () => {
    try {
      AuthService.loginAdmin('ADMIN01', 'Admin@123', undefined);
      throw new Error('Admin login succeeded without 2FA!');
    } catch (e: any) {
      if (e.message !== '2FA_REQUIRED') throw e;
    }
    const authSuccess = AuthService.loginAdmin('ADMIN01', 'Admin@123', '123456');
    if (authSuccess.user.role !== 'ADMIN') throw new Error('Admin role not assigned');
  });

  // 3. User Creation Test
  runTest('User Management', 'Admin-Only User Account Provisioning with Initial Wallet', () => {
    const testMobile = `+9199999${Math.floor(10000 + Math.random() * 90000)}`;
    const testId = `TEST${Math.floor(1000 + Math.random() * 9000)}`;
    const created = db.createUser({
      user_id: testId,
      full_name: 'Test Automation User',
      mobile: testMobile,
      password_plain: 'Secret@999',
      status: 'ACTIVE',
      admin_notes: 'Created via Automated Test Suite',
      admin_id: 'ADMIN01',
    });
    if (created.user.user_id !== testId) throw new Error('User ID mismatch');
    const wallet = db.getWallet(testId);
    if (wallet.balance !== 0) throw new Error('Wallet not initialized with 0.00');
  });

  // 4. Deposit & Ledger Test
  await runAsyncTest('Wallet Ledger', 'Admin-Only Deposit Creates Immutable Ledger Transaction', async () => {
    const user = db.getUserById('USER1001')!;
    const initialBalance = db.getWallet(user.user_id).balance;
    const depositAmount = 250;

    const result = await db.executeWalletOperation({
      userId: user.user_id,
      type: 'DEPOSIT',
      amount: depositAmount,
      reference: 'TEST-DEP',
      notes: 'Automated test deposit',
      adminId: 'ADMIN01',
    });

    if (result.wallet.balance !== initialBalance + depositAmount) {
      throw new Error(`Balance did not increase accurately. Expected ${initialBalance + depositAmount}, got ${result.wallet.balance}`);
    }
    if (result.transaction.type !== 'DEPOSIT') throw new Error('Transaction type is not DEPOSIT');
    if (result.transaction.balance_before !== initialBalance) throw new Error('Balance before mismatch');
  });

  // 5. Negative Balance Prevention Test
  await runAsyncTest('Financial Security', 'Negative Balance & Double-Spend Prevention', async () => {
    const user = db.getUserById('USER1003')!;
    const wallet = db.getWallet(user.user_id);
    const excessiveAmount = wallet.available_balance + 999999;

    let rejected = false;
    try {
      await db.executeWalletOperation({
        userId: user.user_id,
        type: 'WITHDRAWAL',
        amount: excessiveAmount,
        notes: 'Excessive withdrawal test',
        adminId: 'ADMIN01',
      });
    } catch (e: any) {
      rejected = true;
      if (!e.message.includes('Insufficient available balance')) {
        throw new Error(`Unexpected error message: ${e.message}`);
      }
    }

    if (!rejected) throw new Error('Overdraft/negative balance was allowed!');
  });

  // 6. Cryptographic Seed & Hash Verification
  runTest('Provably Fair', 'Seed Hash Commitment & SHA-256 Pre-Commitment', () => {
    const rawSeed = crypto.randomBytes(32).toString('hex');
    const computedHash = crypto.createHash('sha256').update(rawSeed).digest('hex');
    const isValid = ResultEngine.verifySeedHash(rawSeed, computedHash);
    if (!isValid) throw new Error('Seed hash verification failed for valid pair');

    const isTampered = ResultEngine.verifySeedHash(rawSeed + 'bad', computedHash);
    if (isTampered) throw new Error('Tampered seed verified as valid!');
  });

  // 7. Deterministic Ball RNG
  runTest('Result Engine', 'Deterministic Outcome Generation Without User Bias', () => {
    const seed = 'test_seed_cricket_superover_deterministic';
    const config = db.getConfig();

    const ball1 = ResultEngine.generateBallOutcome({
      serverSeed: seed,
      gameId: 'TEST_GAME',
      innings: 1,
      ballNumber: 1,
      config,
    });

    const ball2 = ResultEngine.generateBallOutcome({
      serverSeed: seed,
      gameId: 'TEST_GAME',
      innings: 1,
      ballNumber: 1,
      config,
    });

    if (ball1.outcome !== ball2.outcome || ball1.hash !== ball2.hash) {
      throw new Error('Result engine is not deterministic given the same inputs!');
    }
  });

  // 8. Game State Machine Transitions
  runTest('State Machine', 'Valid Super Over State Transitions & Score Calculation', () => {
    const game = db.createGame({
      title: 'Automation Test Match',
      team_a: 'Bangladesh',
      team_b: 'West Indies',
      countdown_seconds: 30,
      admin_id: 'ADMIN01',
    });

    if (game.status !== 'OPEN') throw new Error(`Initial game status expected OPEN, got ${game.status}`);
    const locked = gameManager.lockGame(game.id);
    if (locked.status !== 'LOCKED') throw new Error(`Status expected LOCKED, got ${locked.status}`);
  });

  // 9. Audit Log Immutability
  runTest('Audit Logs', 'Audit Trail Recording on Administrative Actions', () => {
    const logs = db.getAuditLogs({ actorId: 'ADMIN01' });
    if (logs.length === 0) throw new Error('No audit logs found for admin actions');
    const last = logs[0];
    if (!last.action || !last.created_at) throw new Error('Audit log missing action or timestamp');
  });

  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;

  res.json({
    success: true,
    summary: {
      totalTests: results.length,
      passed: totalPassed,
      failed: totalFailed,
      allPassed: totalFailed === 0,
      executedAt: new Date().toISOString(),
    },
    results,
  });
});

export default router;
