import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export interface User {
  id: string;
  user_id: string;
  full_name: string;
  mobile: string;
  password_hash: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  admin_notes?: string;
  is_two_factor_enabled: boolean;
  two_factor_secret?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  available_balance: number;
  reserved_balance: number;
  total_deposits: number;
  total_withdrawals: number;
  total_game_entries: number;
  total_winnings: number;
  currency: string;
  is_demo: boolean;
  version: number;
  updated_at: string;
}

export type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'GAME_ENTRY' | 'WIN' | 'REFUND' | 'ADJUSTMENT';

export interface WalletTransaction {
  id: string;
  transaction_id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  reference?: string;
  notes?: string;
  admin_id?: string;
  game_id?: string;
  idempotency_key?: string;
  created_at: string;
  completed_at: string;
}

export type GameStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'OPEN'
  | 'LOCKED'
  | 'INNINGS_1'
  | 'INNINGS_BREAK'
  | 'INNINGS_2'
  | 'COMPLETED'
  | 'CANCELLED';

export interface BallRecord {
  id: string;
  game_id: string;
  innings: number;
  ball_number: number;
  batting_team: string;
  bowling_team: string;
  result: '0' | '1' | '2' | '3' | '4' | '6' | 'W';
  runs: number;
  is_wicket: boolean;
  team_score_after: number;
  team_wickets_after: number;
  random_hash: string;
  created_at: string;
}

export interface GameEntry {
  id: string;
  game_id: string;
  user_id: string;
  selection: string; // Team name or 'TIE'
  bet_type: 'BACK' | 'LAY';
  odds: number;
  stake: number;
  potential_return: number;
  status: 'PENDING' | 'WON' | 'LOST' | 'REFUNDED';
  settled_amount: number;
  settled_at?: string;
  created_at: string;
}

export interface Game {
  id: string;
  game_code: string;
  title: string;
  team_a: string;
  team_b: string;
  status: GameStatus;
  scheduled_time: string;
  entry_open_time: string;
  lock_time?: string;
  countdown_seconds: number;
  remaining_seconds: number;
  current_innings: 1 | 2;
  current_ball_index: number; // 0 to 6
  team_a_score: number;
  team_a_wickets: number;
  team_b_score: number;
  team_b_wickets: number;
  target_score?: number;
  winner?: string;
  win_margin?: string;
  is_tie: boolean;
  is_test_mode: boolean;
  test_ball_sequence?: string[];
  forced_next_ball?: '0' | '1' | '2' | '3' | '4' | '6' | 'W';
  server_seed: string;
  server_seed_hash: string;
  is_seed_revealed: boolean;
  forced_winner?: string;
  market_stakes?: {
    team_a: number;
    team_b: number;
  };
  back_odds_team_a: number;
  lay_odds_team_a: number;
  back_odds_team_b: number;
  lay_odds_team_b: number;
  balls: BallRecord[];
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string;
  actor_name?: string;
  action: string;
  target_user_id?: string;
  transaction_id?: string;
  game_id?: string;
  old_value?: string;
  new_value?: string;
  reason?: string;
  ip_address?: string;
  created_at: string;
}

export interface GameConfig {
  id: string;
  name: string;
  prob_dot_ball: number;
  prob_one_run: number;
  prob_two_runs: number;
  prob_three_runs: number;
  prob_four_runs: number;
  prob_six_runs: number;
  prob_wicket: number;
  super_over_balls_per_innings: number;
  max_wickets_per_innings: number;
  tie_breaker_rule: 'BOUNDARY_COUNT' | 'SHARED';
  is_active: boolean;
  is_demo_mode: boolean;
  platform_name: string;
  currency: string;
  min_bet_amount: number;
  updated_at: string;
}

export interface Session {
  id: string;
  token: string;
  user_id: string;
  role: 'ADMIN' | 'USER';
  expires_at: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id?: string; // null for broadcast
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ALERT';
  is_read: boolean;
  created_at: string;
}

interface DatabaseStore {
  users: Record<string, User>; // key = user_id
  wallets: Record<string, Wallet>; // key = user_id
  wallet_transactions: WalletTransaction[];
  games: Record<string, Game>; // key = game.id
  game_entries: GameEntry[];
  audit_logs: AuditLog[];
  game_config: GameConfig;
  sessions: Record<string, Session>; // key = token
  notifications: Notification[];
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');

class DatabaseService {
  private store: DatabaseStore;
  private userLocks: Map<string, Promise<void>> = new Map();

  constructor() {
    this.store = this.loadOrInitStore();
  }

  private loadOrInitStore(): DatabaseStore {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load store from disk, initializing fresh:', e);
    }

    return this.initSeedData();
  }

  public saveToDisk() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (e) {
      console.error('Error saving store to disk:', e);
    }
  }

  private initSeedData(): DatabaseStore {
    const salt = bcrypt.genSaltSync(10);
    const adminPasswordHash = bcrypt.hashSync('Admin@123', salt);
    const userPasswordHash = bcrypt.hashSync('User@123', salt);

    const now = new Date().toISOString();

    const adminUser: User = {
      id: 'usr_admin_01',
      user_id: 'ADMIN01',
      full_name: 'Master System Administrator',
      mobile: '+919900000001',
      password_hash: adminPasswordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      admin_notes: 'Primary Root Administrator for Super Over T20',
      is_two_factor_enabled: true,
      two_factor_secret: '123456',
      created_at: now,
      updated_at: now,
    };

    const user1: User = {
      id: 'usr_1001',
      user_id: 'USER1001',
      full_name: 'Saleem Khan',
      mobile: '+919876543210',
      password_hash: userPasswordHash,
      role: 'USER',
      status: 'ACTIVE',
      admin_notes: 'Verified High-Activity Super Over Player',
      is_two_factor_enabled: false,
      created_at: now,
      updated_at: now,
    };

    const user2: User = {
      id: 'usr_1002',
      user_id: 'USER1002',
      full_name: 'Rahul Sharma',
      mobile: '+919811122334',
      password_hash: userPasswordHash,
      role: 'USER',
      status: 'ACTIVE',
      admin_notes: 'VIP Player tier 1',
      is_two_factor_enabled: false,
      created_at: now,
      updated_at: now,
    };

    const user3: User = {
      id: 'usr_1003',
      user_id: 'USER1003',
      full_name: 'Ayesha Malik',
      mobile: '+919988776655',
      password_hash: userPasswordHash,
      role: 'USER',
      status: 'ACTIVE',
      admin_notes: 'Standard Player',
      is_two_factor_enabled: false,
      created_at: now,
      updated_at: now,
    };

    const user4: User = {
      id: 'usr_1004',
      user_id: 'USER1004',
      full_name: 'David Miller',
      mobile: '+919777665544',
      password_hash: userPasswordHash,
      role: 'USER',
      status: 'SUSPENDED',
      admin_notes: 'Temporary KYC audit suspension',
      is_two_factor_enabled: false,
      created_at: now,
      updated_at: now,
    };

    const users: Record<string, User> = {
      ADMIN01: adminUser,
    };

    const wallets: Record<string, Wallet> = {
      ADMIN01: {
        id: 'wlt_admin',
        user_id: 'ADMIN01',
        balance: 1000000,
        available_balance: 1000000,
        reserved_balance: 0,
        total_deposits: 1000000,
        total_withdrawals: 0,
        total_game_entries: 0,
        total_winnings: 0,
        currency: 'INR',
        is_demo: false,
        version: 1,
        updated_at: now,
      },
    };

    const wallet_transactions: WalletTransaction[] = [];

    const games: Record<string, Game> = {};
    const game_entries: GameEntry[] = [];
    const audit_logs: AuditLog[] = [];

    const game_config: GameConfig = {
      id: 'cfg_default',
      name: 'Standard Super Over T20 Probabilities',
      prob_dot_ball: 18.0,
      prob_one_run: 28.0,
      prob_two_runs: 16.0,
      prob_three_runs: 4.0,
      prob_four_runs: 18.0,
      prob_six_runs: 10.0,
      prob_wicket: 6.0,
      super_over_balls_per_innings: 6,
      max_wickets_per_innings: 2,
      tie_breaker_rule: 'BOUNDARY_COUNT',
      is_active: true,
      is_demo_mode: false,
      platform_name: 'SUPER OVER T20',
      currency: 'PTS',
      min_bet_amount: 500,
      updated_at: now,
    };

    return {
      users,
      wallets,
      wallet_transactions,
      games,
      game_entries,
      audit_logs,
      game_config,
      sessions: {},
      notifications: [],
    };
  }

  // Row-level lock per user ID
  private async acquireUserLock(userId: string): Promise<() => void> {
    while (this.userLocks.has(userId)) {
      await this.userLocks.get(userId);
    }
    let resolver: () => void = () => {};
    const promise = new Promise<void>((resolve) => {
      resolver = resolve;
    });
    this.userLocks.set(userId, promise);
    return () => {
      this.userLocks.delete(userId);
      resolver();
    };
  }

  // ==========================================
  // USER OPERATIONS
  // ==========================================

  public getUserById(userId: string): User | undefined {
    return this.store.users[userId];
  }

  public getUserByMobile(mobile: string): User | undefined {
    return Object.values(this.store.users).find((u) => u.mobile === mobile);
  }

  public getAllUsers(): User[] {
    return Object.values(this.store.users).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public createUser(params: {
    user_id?: string;
    full_name: string;
    mobile: string;
    password_plain: string;
    status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
    admin_notes?: string;
    admin_id: string;
  }): { user: User; wallet: Wallet } {
    // Check mobile uniqueness
    if (this.getUserByMobile(params.mobile)) {
      throw new Error('A user with this mobile number already exists');
    }

    // Generate unique user ID if not specified
    let targetUserId = params.user_id?.trim().toUpperCase();
    if (!targetUserId) {
      const nextNum = 1000 + Object.keys(this.store.users).length + 1;
      targetUserId = `USER${nextNum}`;
    }

    if (this.store.users[targetUserId]) {
      throw new Error(`User ID ${targetUserId} already exists`);
    }

    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(params.password_plain, salt);
    const now = new Date().toISOString();

    const newUser: User = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: targetUserId,
      full_name: params.full_name,
      mobile: params.mobile,
      password_hash,
      role: 'USER',
      status: params.status || 'ACTIVE',
      admin_notes: params.admin_notes || '',
      is_two_factor_enabled: false,
      created_at: now,
      updated_at: now,
    };

    const newWallet: Wallet = {
      id: `wlt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: targetUserId,
      balance: 0,
      available_balance: 0,
      reserved_balance: 0,
      total_deposits: 0,
      total_withdrawals: 0,
      total_game_entries: 0,
      total_winnings: 0,
      currency: this.store.game_config.currency || 'INR',
      is_demo: this.store.game_config.is_demo_mode,
      version: 1,
      updated_at: now,
    };

    this.store.users[targetUserId] = newUser;
    this.store.wallets[targetUserId] = newWallet;

    this.addAuditLog({
      actor_id: params.admin_id,
      actor_name: this.store.users[params.admin_id]?.full_name || 'Admin',
      action: 'USER_CREATED',
      target_user_id: targetUserId,
      new_value: JSON.stringify({
        user_id: targetUserId,
        name: params.full_name,
        status: params.status,
      }),
      reason: 'Admin created user account',
    });

    this.saveToDisk();
    return { user: newUser, wallet: newWallet };
  }

  public updateUser(
    userId: string,
    updates: Partial<Pick<User, 'full_name' | 'mobile' | 'status' | 'admin_notes'>>,
    adminId: string
  ): User {
    const user = this.store.users[userId];
    if (!user) throw new Error(`User ${userId} not found`);

    const oldValue = JSON.stringify({
      full_name: user.full_name,
      mobile: user.mobile,
      status: user.status,
      admin_notes: user.admin_notes,
    });

    if (updates.mobile && updates.mobile !== user.mobile) {
      const existing = this.getUserByMobile(updates.mobile);
      if (existing && existing.user_id !== userId) {
        throw new Error('Mobile number already in use by another user');
      }
    }

    Object.assign(user, updates, { updated_at: new Date().toISOString() });

    this.addAuditLog({
      actor_id: adminId,
      actor_name: this.store.users[adminId]?.full_name || 'Admin',
      action: 'USER_UPDATED',
      target_user_id: userId,
      old_value: oldValue,
      new_value: JSON.stringify(updates),
      reason: 'Admin updated user profile',
    });

    this.saveToDisk();
    return user;
  }

  public resetUserPassword(userId: string, newPasswordPlain: string, adminId: string): void {
    const user = this.store.users[userId];
    if (!user) throw new Error(`User ${userId} not found`);

    const salt = bcrypt.genSaltSync(10);
    user.password_hash = bcrypt.hashSync(newPasswordPlain, salt);
    user.updated_at = new Date().toISOString();

    this.addAuditLog({
      actor_id: adminId,
      actor_name: this.store.users[adminId]?.full_name || 'Admin',
      action: 'PASSWORD_RESET',
      target_user_id: userId,
      reason: 'Admin initiated password reset',
    });

    this.saveToDisk();
  }

  public setUserStatus(
    userId: string,
    status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED',
    reason: string,
    adminId: string
  ): User {
    const user = this.store.users[userId];
    if (!user) throw new Error(`User ${userId} not found`);

    const oldStatus = user.status;
    user.status = status;
    user.updated_at = new Date().toISOString();

    this.addAuditLog({
      actor_id: adminId,
      actor_name: this.store.users[adminId]?.full_name || 'Admin',
      action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : status === 'ACTIVE' ? 'USER_ACTIVATED' : 'USER_DISABLED',
      target_user_id: userId,
      old_value: oldStatus,
      new_value: status,
      reason,
    });

    this.saveToDisk();
    return user;
  }

  // ==========================================
  // WALLET & TRANSACTION LEDGER OPERATIONS
  // ==========================================

  public getWallet(userId: string): Wallet {
    let wallet = this.store.wallets[userId];
    if (!wallet) {
      const now = new Date().toISOString();
      wallet = {
        id: `wlt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        user_id: userId,
        balance: 0,
        available_balance: 0,
        reserved_balance: 0,
        total_deposits: 0,
        total_withdrawals: 0,
        total_game_entries: 0,
        total_winnings: 0,
        currency: 'INR',
        is_demo: true,
        version: 1,
        updated_at: now,
      };
      this.store.wallets[userId] = wallet;
      this.saveToDisk();
    }
    return wallet;
  }

  public getTransactions(userId?: string): WalletTransaction[] {
    let list = this.store.wallet_transactions;
    if (userId) {
      list = list.filter((t) => t.user_id === userId);
    }
    return list.slice().sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  /**
   * Execute atomic transaction on wallet with ledger entry and row-locking
   */
  public async executeWalletOperation(params: {
    userId: string;
    type: TransactionType;
    amount: number;
    reference?: string;
    notes?: string;
    adminId?: string;
    gameId?: string;
    idempotencyKey?: string;
  }): Promise<{ transaction: WalletTransaction; wallet: Wallet }> {
    const releaseLock = await this.acquireUserLock(params.userId);

    try {
      const user = this.store.users[params.userId];
      if (!user) throw new Error(`User ${params.userId} does not exist`);

      if (params.type !== 'REFUND' && user.status !== 'ACTIVE' && params.type !== 'ADJUSTMENT') {
        throw new Error(`Cannot perform transactions on ${user.status} account`);
      }

      if (params.amount <= 0 && params.type !== 'ADJUSTMENT') {
        throw new Error('Transaction amount must be strictly greater than 0');
      }

      const wallet = this.getWallet(params.userId);
      const balanceBefore = wallet.balance;
      let balanceAfter = balanceBefore;

      if (params.idempotencyKey) {
        const existingTx = this.store.wallet_transactions.find(
          (t) => t.idempotency_key === params.idempotencyKey
        );
        if (existingTx) {
          return { transaction: existingTx, wallet };
        }
      }

      // Check balance constraints
      switch (params.type) {
        case 'DEPOSIT':
          balanceAfter = balanceBefore + params.amount;
          wallet.total_deposits += params.amount;
          break;

        case 'WITHDRAWAL':
          if (wallet.available_balance < params.amount) {
            throw new Error(`Insufficient available balance (Available: ${wallet.available_balance}, Requested: ${params.amount})`);
          }
          balanceAfter = balanceBefore - params.amount;
          wallet.total_withdrawals += params.amount;
          break;

        case 'GAME_ENTRY':
          if (wallet.available_balance < params.amount) {
            throw new Error(`Insufficient balance for game entry (Available: ${wallet.available_balance}, Stake: ${params.amount})`);
          }
          balanceAfter = balanceBefore - params.amount;
          wallet.total_game_entries += params.amount;
          break;

        case 'WIN':
          balanceAfter = balanceBefore + params.amount;
          wallet.total_winnings += params.amount;
          break;

        case 'REFUND':
          balanceAfter = balanceBefore + params.amount;
          break;

        case 'ADJUSTMENT':
          balanceAfter = balanceBefore + params.amount;
          if (balanceAfter < 0) {
            throw new Error(`Adjustment would result in negative balance: ${balanceAfter}`);
          }
          break;
      }

      // Update wallet atomically
      wallet.balance = Math.round(balanceAfter * 100) / 100;
      wallet.available_balance = Math.round((wallet.balance - wallet.reserved_balance) * 100) / 100;
      wallet.version += 1;
      wallet.updated_at = new Date().toISOString();

      // Create immutable transaction ledger record
      const prefix =
        params.type === 'DEPOSIT'
          ? 'DEP'
          : params.type === 'WITHDRAWAL'
          ? 'WDR'
          : params.type === 'GAME_ENTRY'
          ? 'BET'
          : params.type === 'WIN'
          ? 'WIN'
          : params.type === 'REFUND'
          ? 'REF'
          : 'ADJ';

      const txId = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date().toISOString();

      const transaction: WalletTransaction = {
        id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        transaction_id: txId,
        user_id: params.userId,
        type: params.type,
        amount: Math.abs(params.amount),
        balance_before: balanceBefore,
        balance_after: wallet.balance,
        status: 'COMPLETED',
        reference: params.reference || `${params.type} transaction`,
        notes: params.notes || '',
        admin_id: params.adminId,
        game_id: params.gameId,
        idempotency_key: params.idempotencyKey,
        created_at: now,
        completed_at: now,
      };

      this.store.wallet_transactions.unshift(transaction);

      // Audit if admin action
      if (params.adminId) {
        this.addAuditLog({
          actor_id: params.adminId,
          actor_name: this.store.users[params.adminId]?.full_name || 'Admin',
          action: `WALLET_${params.type}`,
          target_user_id: params.userId,
          transaction_id: txId,
          old_value: `Balance: ${balanceBefore}`,
          new_value: `Balance: ${wallet.balance}, Amount: ${params.amount}`,
          reason: params.notes || params.reference,
        });
      }

      this.saveToDisk();
      return { transaction, wallet };
    } finally {
      releaseLock();
    }
  }

  // ==========================================
  // GAMES & RESULT ENGINE STATE
  // ==========================================

  public getAllGames(): Game[] {
    return Object.values(this.store.games).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public getGameById(id: string): Game | undefined {
    return this.store.games[id];
  }

  public createGame(params: {
    title: string;
    team_a: string;
    team_b: string;
    countdown_seconds?: number;
    back_odds_team_a?: number;
    lay_odds_team_a?: number;
    back_odds_team_b?: number;
    lay_odds_team_b?: number;
    is_test_mode?: boolean;
    test_ball_sequence?: string[];
    admin_id: string;
  }): Game {
    const nextGameNum = Object.keys(this.store.games).length + 1;
    const gameCode = `SO-2026-${String(nextGameNum).padStart(3, '0')}`;
    const id = `gm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Cryptographic server seed generation
    const serverSeed = crypto.randomBytes(32).toString('hex');
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');

    const countdown = params.countdown_seconds || 45;
    const now = new Date().toISOString();

    const game: Game = {
      id,
      game_code: gameCode,
      title: params.title || `Super Over T20: ${params.team_a} vs ${params.team_b}`,
      team_a: params.team_a,
      team_b: params.team_b,
      status: 'OPEN',
      scheduled_time: now,
      entry_open_time: now,
      lock_time: new Date(Date.now() + countdown * 1000).toISOString(),
      countdown_seconds: countdown,
      remaining_seconds: countdown,
      current_innings: 1,
      current_ball_index: 0,
      team_a_score: 0,
      team_a_wickets: 0,
      team_b_score: 0,
      team_b_wickets: 0,
      is_tie: false,
      is_test_mode: !!params.is_test_mode,
      test_ball_sequence: params.test_ball_sequence || [],
      server_seed: serverSeed,
      server_seed_hash: serverSeedHash,
      is_seed_revealed: false,
      back_odds_team_a: params.back_odds_team_a || 1.95,
      lay_odds_team_a: params.lay_odds_team_a || 2.05,
      back_odds_team_b: params.back_odds_team_b || 1.95,
      lay_odds_team_b: params.lay_odds_team_b || 2.05,
      balls: [],
      created_at: now,
      updated_at: now,
    };

    this.store.games[id] = game;

    this.addAuditLog({
      actor_id: params.admin_id,
      actor_name: this.store.users[params.admin_id]?.full_name || 'Admin',
      action: 'GAME_CREATED',
      game_id: id,
      new_value: JSON.stringify({
        game_code: gameCode,
        team_a: params.team_a,
        team_b: params.team_b,
        seed_hash: serverSeedHash,
        test_mode: params.is_test_mode,
        test_sequence: params.test_ball_sequence,
      }),
      reason: 'Admin scheduled new Super Over match',
    });

    this.saveToDisk();
    return game;
  }

  public setForcedNextBall(gameId: string, result: '0' | '1' | '2' | '3' | '4' | '6' | 'W' | undefined): Game {
    const game = this.store.games[gameId];
    if (!game) throw new Error(`Game ${gameId} not found`);
    game.forced_next_ball = result;
    this.saveToDisk();
    return game;
  }

  public updateGame(id: string, updates: Partial<Game>): Game {
    const game = this.store.games[id];
    if (!game) throw new Error(`Game ${id} not found`);
    Object.assign(game, updates, { updated_at: new Date().toISOString() });
    this.saveToDisk();
    return game;
  }

  // Record a generated ball
  public recordBall(
    gameId: string,
    ballData: Omit<BallRecord, 'id' | 'created_at'>
  ): BallRecord {
    const game = this.store.games[gameId];
    if (!game) throw new Error(`Game ${gameId} not found`);

    const ball: BallRecord = {
      ...ballData,
      id: `ball_${gameId}_inn${ballData.innings}_b${ballData.ball_number}`,
      created_at: new Date().toISOString(),
    };

    game.balls.push(ball);
    game.updated_at = new Date().toISOString();
    this.saveToDisk();
    return ball;
  }

  // Game Entries (Bets)
  public placeBet(params: {
    userId: string;
    gameId: string;
    selection: string;
    betType: 'BACK' | 'LAY';
    stake: number;
    odds: number;
  }): GameEntry {
    const game = this.store.games[params.gameId];
    if (!game) throw new Error('Game not found');

    if (params.stake < this.store.game_config.min_bet_amount) {
      throw new Error(`Minimum bet amount is 💵 ${this.store.game_config.min_bet_amount}`);
    }

    if (game.status !== 'OPEN' || game.remaining_seconds <= 0) {
      throw new Error(`Betting is locked. Current match status is ${game.status} (remaining: ${game.remaining_seconds}s)`);
    }

    const potentialReturn =
      params.betType === 'BACK'
        ? Math.round(params.stake * params.odds * 100) / 100
        : Math.round(params.stake * (params.odds - 1) * 100) / 100;

    const entry: GameEntry = {
      id: `bet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      game_id: params.gameId,
      user_id: params.userId,
      selection: params.selection,
      bet_type: params.betType,
      odds: params.odds,
      stake: params.stake,
      potential_return: potentialReturn,
      status: 'PENDING',
      settled_amount: 0,
      created_at: new Date().toISOString(),
    };

    this.store.game_entries.unshift(entry);
    this.saveToDisk();
    return entry;
  }

  public getGameEntries(gameId?: string, userId?: string): GameEntry[] {
    let list = this.store.game_entries;
    if (gameId) list = list.filter((e) => e.game_id === gameId);
    if (userId) list = list.filter((e) => e.user_id === userId);
    return list;
  }

  public async settleGameBets(gameId: string, winner: string, isTie: boolean): Promise<void> {
    const entries = this.store.game_entries.filter(
      (e) => e.game_id === gameId && e.status === 'PENDING'
    );

    for (const entry of entries) {
      let isWin = false;

      if (isTie && entry.selection === 'TIE') {
        isWin = true;
      } else if (!isTie && entry.bet_type === 'BACK' && entry.selection === winner) {
        isWin = true;
      } else if (!isTie && entry.bet_type === 'LAY' && entry.selection !== winner) {
        isWin = true;
      }

      if (isWin) {
        entry.status = 'WON';

        // User requirement: "jete hwe points men se 500 men se 10 rupee cutting ho"
        // 10 rupees/points deduction per 500 points won: (grossWinnings / 500) * 10
        const grossWinnings = entry.potential_return;
        const commission = Math.round((grossWinnings / 500) * 10);
        const netPayout = Math.max(0, grossWinnings - commission);

        entry.settled_amount = netPayout;
        entry.settled_at = new Date().toISOString();

        // Credit winnings to wallet atomically
        await this.executeWalletOperation({
          userId: entry.user_id,
          type: 'WIN',
          amount: netPayout,
          reference: `WIN-${entry.id}`,
          notes: `Payout for Super Over win on ${entry.selection} @ ${entry.odds} (Gross: ${grossWinnings} PTS, Cutting: -${commission} PTS)`,
          gameId: gameId,
        });

        this.addNotification({
          user_id: entry.user_id,
          title: 'Congratulations! You Won! 🏆',
          message: `Your Super Over bet on ${entry.selection} won ${netPayout} PTS! (Gross: ${grossWinnings} PTS - ${commission} PTS cutting [10 per 500])`,
          type: 'SUCCESS',
        });
      } else {
        entry.status = 'LOST';
        entry.settled_amount = 0;
        entry.settled_at = new Date().toISOString();
      }
    }

    this.saveToDisk();
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================

  public addAuditLog(entry: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const log: AuditLog = {
      id: `aud_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...entry,
      created_at: new Date().toISOString(),
    };
    this.store.audit_logs.unshift(log);
    this.saveToDisk();
    return log;
  }

  public getAuditLogs(filter?: {
    actorId?: string;
    targetUserId?: string;
    action?: string;
  }): AuditLog[] {
    let logs = this.store.audit_logs;
    if (filter?.actorId) logs = logs.filter((l) => l.actor_id === filter.actorId);
    if (filter?.targetUserId) logs = logs.filter((l) => l.target_user_id === filter.targetUserId);
    if (filter?.action) logs = logs.filter((l) => l.action.includes(filter.action!));
    return logs;
  }

  // ==========================================
  // CONFIG & SETTINGS
  // ==========================================

  public getConfig(): GameConfig {
    return this.store.game_config;
  }

  public updateConfig(updates: Partial<GameConfig>, adminId: string): GameConfig {
    const oldConfig = { ...this.store.game_config };
    Object.assign(this.store.game_config, updates, {
      updated_at: new Date().toISOString(),
    });

    this.addAuditLog({
      actor_id: adminId,
      actor_name: this.store.users[adminId]?.full_name || 'Admin',
      action: 'CONFIG_UPDATED',
      old_value: JSON.stringify(oldConfig),
      new_value: JSON.stringify(updates),
      reason: 'Admin adjusted Super Over platform configuration or probabilities',
    });

    this.saveToDisk();
    return this.store.game_config;
  }

  // ==========================================
  // SESSIONS
  // ==========================================

  public createSession(userId: string, role: 'ADMIN' | 'USER'): Session {
    const token = `tok_${crypto.randomBytes(32).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 86400000 * 7).toISOString(); // 7 days

    const session: Session = {
      id: `ses_${Date.now()}`,
      token,
      user_id: userId,
      role,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
    };

    this.store.sessions[token] = session;
    this.saveToDisk();
    return session;
  }

  public getSession(token: string): Session | undefined {
    const session = this.store.sessions[token];
    if (!session) return undefined;
    if (new Date(session.expires_at) < new Date()) {
      delete this.store.sessions[token];
      this.saveToDisk();
      return undefined;
    }
    return session;
  }

  public removeSession(token: string): void {
    if (this.store.sessions[token]) {
      delete this.store.sessions[token];
      this.saveToDisk();
    }
  }

  // ==========================================
  // NOTIFICATIONS
  // ==========================================

  public addNotification(params: Omit<Notification, 'id' | 'is_read' | 'created_at'>): Notification {
    const notif: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ...params,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    this.store.notifications.unshift(notif);
    this.saveToDisk();
    return notif;
  }

  public getNotifications(userId?: string): Notification[] {
    return this.store.notifications.filter(
      (n) => !n.user_id || n.user_id === userId
    );
  }
}

export const db = new DatabaseService();
