-- ==========================================================
-- SUPER OVER T20 - Relational Database Schema (PostgreSQL)
-- ==========================================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(32) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) UNIQUE NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  mobile VARCHAR(32) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'USER' REFERENCES roles(id),
  status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'DISABLED'
  admin_notes TEXT,
  is_two_factor_enabled BOOLEAN DEFAULT FALSE,
  two_factor_secret VARCHAR(64),
  last_login_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_users_mobile ON users(mobile);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  available_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  reserved_balance NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_deposits NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_withdrawals NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_game_entries NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  total_winnings NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  currency VARCHAR(8) NOT NULL DEFAULT 'INR',
  is_demo BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);

-- Wallet Transactions (Immutable Ledger)
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id VARCHAR(64) PRIMARY KEY,
  transaction_id VARCHAR(64) UNIQUE NOT NULL,
  user_id VARCHAR(32) NOT NULL REFERENCES users(user_id),
  type VARCHAR(32) NOT NULL, -- 'DEPOSIT', 'WITHDRAWAL', 'GAME_ENTRY', 'WIN', 'REFUND', 'ADJUSTMENT'
  amount NUMERIC(15, 2) NOT NULL,
  balance_before NUMERIC(15, 2) NOT NULL,
  balance_after NUMERIC(15, 2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'FAILED', 'REVERSED'
  reference VARCHAR(128),
  notes TEXT,
  admin_id VARCHAR(64),
  game_id VARCHAR(64),
  idempotency_key VARCHAR(128) UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_id ON wallet_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON wallet_transactions(created_at);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id VARCHAR(64) PRIMARY KEY,
  game_code VARCHAR(32) UNIQUE NOT NULL,
  title VARCHAR(128) NOT NULL,
  team_a VARCHAR(64) NOT NULL,
  team_b VARCHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'DRAFT', 
  -- Statuses: 'DRAFT', 'SCHEDULED', 'OPEN', 'LOCKED', 'INNINGS_1', 'INNINGS_2', 'COMPLETED', 'CANCELLED'
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  entry_open_time TIMESTAMP WITH TIME ZONE,
  lock_time TIMESTAMP WITH TIME ZONE,
  countdown_seconds INTEGER NOT NULL DEFAULT 60,
  current_innings INTEGER NOT NULL DEFAULT 1,
  current_ball_index INTEGER NOT NULL DEFAULT 0,
  team_a_score INTEGER NOT NULL DEFAULT 0,
  team_a_wickets INTEGER NOT NULL DEFAULT 0,
  team_b_score INTEGER NOT NULL DEFAULT 0,
  team_b_wickets INTEGER NOT NULL DEFAULT 0,
  target_score INTEGER,
  winner VARCHAR(64),
  win_margin VARCHAR(64),
  is_tie BOOLEAN DEFAULT FALSE,
  is_test_mode BOOLEAN DEFAULT FALSE,
  test_ball_sequence TEXT, -- JSON string array if test mode enabled
  server_seed VARCHAR(128),
  server_seed_hash VARCHAR(128) NOT NULL,
  is_seed_revealed BOOLEAN DEFAULT FALSE,
  back_odds_team_a NUMERIC(5, 2) DEFAULT 1.95,
  lay_odds_team_a NUMERIC(5, 2) DEFAULT 2.05,
  back_odds_team_b NUMERIC(5, 2) DEFAULT 1.95,
  lay_odds_team_b NUMERIC(5, 2) DEFAULT 2.05,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_scheduled_time ON games(scheduled_time);

-- Balls table (Immutable record of each generated ball)
CREATE TABLE IF NOT EXISTS balls (
  id VARCHAR(64) PRIMARY KEY,
  game_id VARCHAR(64) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  innings INTEGER NOT NULL,
  ball_number INTEGER NOT NULL,
  batting_team VARCHAR(64) NOT NULL,
  bowling_team VARCHAR(64) NOT NULL,
  result VARCHAR(8) NOT NULL, -- '0', '1', '2', '3', '4', '6', 'W'
  runs INTEGER NOT NULL DEFAULT 0,
  is_wicket BOOLEAN NOT NULL DEFAULT FALSE,
  team_score_after INTEGER NOT NULL,
  team_wickets_after INTEGER NOT NULL,
  random_hash VARCHAR(128) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_balls_game_id ON balls(game_id);
CREATE INDEX IF NOT EXISTS idx_balls_innings_ball ON balls(game_id, innings, ball_number);

-- Game Entries / Bets table
CREATE TABLE IF NOT EXISTS game_entries (
  id VARCHAR(64) PRIMARY KEY,
  game_id VARCHAR(64) NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id VARCHAR(32) NOT NULL REFERENCES users(user_id),
  selection VARCHAR(64) NOT NULL, -- Selected Team or 'TIE'
  bet_type VARCHAR(16) NOT NULL DEFAULT 'BACK', -- 'BACK' or 'LAY'
  odds NUMERIC(5, 2) NOT NULL,
  stake NUMERIC(15, 2) NOT NULL,
  potential_return NUMERIC(15, 2) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'WON', 'LOST', 'REFUNDED'
  settled_amount NUMERIC(15, 2) DEFAULT 0.00,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_entries_game_id ON game_entries(game_id);
CREATE INDEX IF NOT EXISTS idx_game_entries_user_id ON game_entries(user_id);

-- Audit Logs (Tamper-proof administrative & critical financial actions)
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  actor_id VARCHAR(64) NOT NULL,
  actor_name VARCHAR(128),
  action VARCHAR(64) NOT NULL,
  target_user_id VARCHAR(64),
  transaction_id VARCHAR(64),
  game_id VARCHAR(64),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  ip_address VARCHAR(64),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_target_user ON audit_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- Game Configurations & Probability distribution
CREATE TABLE IF NOT EXISTS game_configs (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  prob_dot_ball NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  prob_one_run NUMERIC(5, 2) NOT NULL DEFAULT 28.00,
  prob_two_runs NUMERIC(5, 2) NOT NULL DEFAULT 16.00,
  prob_three_runs NUMERIC(5, 2) NOT NULL DEFAULT 4.00,
  prob_four_runs NUMERIC(5, 2) NOT NULL DEFAULT 18.00,
  prob_six_runs NUMERIC(5, 2) NOT NULL DEFAULT 10.00,
  prob_wicket NUMERIC(5, 2) NOT NULL DEFAULT 6.00,
  super_over_balls_per_innings INTEGER NOT NULL DEFAULT 6,
  max_wickets_per_innings INTEGER NOT NULL DEFAULT 2,
  tie_breaker_rule VARCHAR(32) NOT NULL DEFAULT 'BOUNDARY_COUNT', -- 'BOUNDARY_COUNT' or 'SHARED'
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(64) PRIMARY KEY,
  token VARCHAR(128) UNIQUE NOT NULL,
  user_id VARCHAR(32) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(32) REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(128) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(32) NOT NULL, -- 'INFO', 'SUCCESS', 'WARNING', 'ALERT'
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
