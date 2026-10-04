export interface User {
  id: string;
  userId: string;
  fullName: string;
  role: 'ADMIN' | 'USER';
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  mobile: string;
  adminNotes?: string;
  createdAt?: string;
  lastLoginAt?: string;
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
  selection: string;
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
  current_ball_index: number;
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
  server_seed?: string;
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
}
