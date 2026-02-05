-- Add wallet integration to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS withdrawal_nonce INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address) WHERE wallet_address IS NOT NULL;

-- Deposits table - tracks on-chain deposits
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  wallet_address TEXT NOT NULL,
  amount BIGINT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed', -- pending, confirmed, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposits_agent ON deposits(agent_id);
CREATE INDEX IF NOT EXISTS idx_deposits_wallet ON deposits(wallet_address);
CREATE INDEX IF NOT EXISTS idx_deposits_tx ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_block ON deposits(block_number);

-- Withdrawals table - tracks withdrawal requests
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  wallet_address TEXT NOT NULL,
  amount BIGINT NOT NULL,
  nonce INTEGER NOT NULL,
  signature TEXT, -- platform signature for on-chain withdrawal
  tx_hash TEXT, -- filled when withdrawal is executed
  status TEXT NOT NULL DEFAULT 'pending', -- pending, signed, completed, failed
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_agent ON withdrawals(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Token transactions log for audit trail
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  action TEXT NOT NULL, -- deposit, withdraw, post, upvote, reward, bonus
  amount BIGINT NOT NULL, -- positive for credits, negative for debits
  balance_after BIGINT NOT NULL,
  reference_id UUID, -- post_id, deposit_id, withdrawal_id, etc.
  reference_type TEXT, -- post, deposit, withdrawal, upvote
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_agent ON token_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_tx_action ON token_transactions(action);
CREATE INDEX IF NOT EXISTS idx_tx_created ON token_transactions(created_at);

-- Daily bonuses tracking
CREATE TABLE IF NOT EXISTS daily_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  bonus_type TEXT NOT NULL, -- top_post, trending
  post_id UUID REFERENCES posts(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, bonus_type, post_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_bonuses_date ON daily_bonuses(date);
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_agent ON daily_bonuses(agent_id);

-- Update token_balance to BIGINT for larger numbers
ALTER TABLE agents ALTER COLUMN token_balance TYPE BIGINT;

-- Set default balance to 0 (agents must deposit to participate)
ALTER TABLE agents ALTER COLUMN token_balance SET DEFAULT 0;

-- Function to adjust token balance atomically
CREATE OR REPLACE FUNCTION adjust_token_balance(p_agent_id UUID, p_amount BIGINT)
RETURNS BIGINT AS $$
DECLARE
  new_balance BIGINT;
BEGIN
  UPDATE agents
  SET token_balance = token_balance + p_amount
  WHERE id = p_agent_id
  RETURNING token_balance INTO new_balance;
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;
