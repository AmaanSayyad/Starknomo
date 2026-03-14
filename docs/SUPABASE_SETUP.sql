-- Starknomo Supabase Database Setup
-- Run these SQL commands in your Supabase SQL Editor
-- https://app.supabase.com/project/[YOUR_PROJECT_ID]/sql/new

-- ============================================================================
-- 1. USER BALANCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(255) NOT NULL UNIQUE,
  balance NUMERIC(20, 6) NOT NULL DEFAULT 0,
  currency VARCHAR(10) NOT NULL DEFAULT 'STRK',
  user_tier VARCHAR(50) NOT NULL DEFAULT 'free',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_balances_address ON user_balances(user_address);
CREATE INDEX idx_user_balances_currency ON user_balances(currency);

-- ============================================================================
-- 2. BET HISTORY TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS bet_history (
  id VARCHAR(255) PRIMARY KEY,
  wallet_address VARCHAR(255) NOT NULL,
  asset VARCHAR(50) NOT NULL,
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('UP', 'DOWN')),
  amount NUMERIC(20, 6) NOT NULL,
  multiplier NUMERIC(10, 2) NOT NULL,
  strike_price NUMERIC(20, 8) NOT NULL,
  end_price NUMERIC(20, 8),
  payout NUMERIC(20, 6),
  won BOOLEAN,
  mode VARCHAR(50) NOT NULL DEFAULT 'creditnomo',
  network VARCHAR(50) NOT NULL DEFAULT 'STRK',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bet_history_wallet ON bet_history(wallet_address);
CREATE INDEX idx_bet_history_created ON bet_history(created_at DESC);
CREATE INDEX idx_bet_history_resolved ON bet_history(resolved_at DESC);
CREATE INDEX idx_bet_history_asset ON bet_history(asset);

-- ============================================================================
-- 3. USER REFERRALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(255) NOT NULL UNIQUE,
  referral_code VARCHAR(50) NOT NULL UNIQUE,
  referral_count INTEGER NOT NULL DEFAULT 0,
  referred_by VARCHAR(255),
  total_referral_volume NUMERIC(20, 6) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_referrals_address ON user_referrals(user_address);
CREATE INDEX idx_user_referrals_code ON user_referrals(referral_code);
CREATE INDEX idx_user_referrals_referred_by ON user_referrals(referred_by);

-- ============================================================================
-- 4. USER PROFILES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(255) NOT NULL UNIQUE,
  username VARCHAR(100),
  email VARCHAR(255),
  avatar_url VARCHAR(500),
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_profiles_address ON user_profiles(user_address);
CREATE INDEX idx_user_profiles_username ON user_profiles(username);

-- ============================================================================
-- 5. WAITLIST TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  wallet_address VARCHAR(255),
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  access_code VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_waitlist_email ON waitlist(email);
CREATE INDEX idx_waitlist_status ON waitlist(status);
CREATE INDEX idx_waitlist_access_code ON waitlist(access_code);

-- ============================================================================
-- 6. ACCESS CODES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) NOT NULL UNIQUE,
  used_by VARCHAR(255),
  is_used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_access_codes_code ON access_codes(code);
CREATE INDEX idx_access_codes_used ON access_codes(is_used);

-- ============================================================================
-- 7. TRANSACTIONS TABLE (for audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_address VARCHAR(255) NOT NULL,
  tx_hash VARCHAR(255),
  type VARCHAR(50) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win', 'refund')),
  amount NUMERIC(20, 6) NOT NULL,
  currency VARCHAR(10) NOT NULL DEFAULT 'STRK',
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  network VARCHAR(50) NOT NULL DEFAULT 'STRK',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_address);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);

-- ============================================================================
-- 8. GAME HISTORY TABLE (for analytics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS game_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id VARCHAR(255) NOT NULL,
  asset VARCHAR(50) NOT NULL,
  start_price NUMERIC(20, 8) NOT NULL,
  end_price NUMERIC(20, 8) NOT NULL,
  duration_seconds INTEGER NOT NULL,
  total_volume NUMERIC(20, 6) NOT NULL DEFAULT 0,
  total_bets INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_game_history_round ON game_history(round_id);
CREATE INDEX idx_game_history_asset ON game_history(asset);
CREATE INDEX idx_game_history_created ON game_history(created_at DESC);

-- ============================================================================
-- 9. STORED PROCEDURE: Deduct Balance for Bet
-- ============================================================================
CREATE OR REPLACE FUNCTION deduct_balance_for_bet(
  p_user_address VARCHAR,
  p_bet_amount NUMERIC,
  p_currency VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the row for this user to prevent race conditions
  SELECT balance INTO v_current_balance
  FROM user_balances
  WHERE user_address = LOWER(p_user_address) AND currency = p_currency
  FOR UPDATE;

  -- Check if user exists
  IF v_current_balance IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'User not found',
      'new_balance', 0
    );
  END IF;

  -- Check if balance is sufficient
  IF v_current_balance < p_bet_amount THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Insufficient balance',
      'new_balance', v_current_balance
    );
  END IF;

  -- Deduct the bet amount
  v_new_balance := v_current_balance - p_bet_amount;

  UPDATE user_balances
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE user_address = LOWER(p_user_address) AND currency = p_currency;

  RETURN jsonb_build_object(
    'success', TRUE,
    'error', NULL,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 10. STORED PROCEDURE: Update Balance (for deposits/wins)
-- ============================================================================
CREATE OR REPLACE FUNCTION update_balance(
  p_user_address VARCHAR,
  p_amount NUMERIC,
  p_currency VARCHAR,
  p_operation VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
BEGIN
  -- Lock the row for this user
  SELECT balance INTO v_current_balance
  FROM user_balances
  WHERE user_address = LOWER(p_user_address) AND currency = p_currency
  FOR UPDATE;

  -- If user doesn't exist, create them
  IF v_current_balance IS NULL THEN
    v_current_balance := 0;
    INSERT INTO user_balances (user_address, balance, currency)
    VALUES (LOWER(p_user_address), 0, p_currency)
    ON CONFLICT (user_address) DO NOTHING;
  END IF;

  -- Calculate new balance based on operation
  IF p_operation = 'add' THEN
    v_new_balance := v_current_balance + p_amount;
  ELSIF p_operation = 'subtract' THEN
    v_new_balance := v_current_balance - p_amount;
  ELSE
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Invalid operation',
      'new_balance', v_current_balance
    );
  END IF;

  -- Prevent negative balance
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'Operation would result in negative balance',
      'new_balance', v_current_balance
    );
  END IF;

  -- Update the balance
  UPDATE user_balances
  SET balance = v_new_balance,
      updated_at = NOW()
  WHERE user_address = LOWER(p_user_address) AND currency = p_currency;

  RETURN jsonb_build_object(
    'success', TRUE,
    'error', NULL,
    'new_balance', v_new_balance
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE user_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own balance
CREATE POLICY "Users can view own balance" ON user_balances
  FOR SELECT USING (auth.uid()::text = user_address OR auth.role() = 'service_role');

-- Policy: Users can only see their own bet history
CREATE POLICY "Users can view own bets" ON bet_history
  FOR SELECT USING (auth.uid()::text = wallet_address OR auth.role() = 'service_role');

-- Policy: Users can only see their own referral data
CREATE POLICY "Users can view own referrals" ON user_referrals
  FOR SELECT USING (auth.uid()::text = user_address OR auth.role() = 'service_role');

-- Policy: Users can only see their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid()::text = user_address OR auth.role() = 'service_role');

-- Policy: Users can only see their own transactions
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid()::text = user_address OR auth.role() = 'service_role');

-- Policy: Anyone can view game history (public data)
CREATE POLICY "Anyone can view game history" ON game_history
  FOR SELECT USING (true);

-- Policy: Anyone can view waitlist (public data)
CREATE POLICY "Anyone can view waitlist" ON waitlist
  FOR SELECT USING (true);

-- Policy: Service role can do everything
CREATE POLICY "Service role full access" ON user_balances
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON bet_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON user_referrals
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON transactions
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON game_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON waitlist
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access" ON access_codes
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- 12. SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Insert sample user balance
-- INSERT INTO user_balances (user_address, balance, currency, user_tier)
-- VALUES ('0x1234567890abcdef1234567890abcdef12345678', 100.000000, 'STRK', 'free');

-- Insert sample referral code
-- INSERT INTO user_referrals (user_address, referral_code, referral_count, referred_by)
-- VALUES ('0x1234567890abcdef1234567890abcdef12345678', 'REF123ABC', 0, NULL);

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- Your Supabase database is now ready for Starknomo!
-- 
-- Next steps:
-- 1. Update your .env file with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
-- 2. Run: yarn dev
-- 3. Test the application
