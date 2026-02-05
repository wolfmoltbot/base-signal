import pg from 'pg';

// Supabase direct connection (using session pooler)
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
const connectionString = process.env.DATABASE_URL || 
  'postgresql://postgres.tmasgeozycsqxsalxviz:' + process.env.DB_PASSWORD + '@aws-0-eu-central-1.pooler.supabase.com:5432/postgres';

const migration = `
-- Add wallet columns to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS wallet_address TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS withdrawal_nonce INTEGER NOT NULL DEFAULT 0;

-- Create index for wallet
CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address) WHERE wallet_address IS NOT NULL;

-- Update token_balance to BIGINT
ALTER TABLE agents ALTER COLUMN token_balance TYPE BIGINT USING token_balance::BIGINT;

-- Set default balance to 0
ALTER TABLE agents ALTER COLUMN token_balance SET DEFAULT 0;

-- Deposits table
CREATE TABLE IF NOT EXISTS deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  wallet_address TEXT NOT NULL,
  amount BIGINT NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deposits_agent ON deposits(agent_id);
CREATE INDEX IF NOT EXISTS idx_deposits_wallet ON deposits(wallet_address);
CREATE INDEX IF NOT EXISTS idx_deposits_tx ON deposits(tx_hash);
CREATE INDEX IF NOT EXISTS idx_deposits_block ON deposits(block_number);

-- Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  wallet_address TEXT NOT NULL,
  amount BIGINT NOT NULL,
  nonce INTEGER NOT NULL,
  signature TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_withdrawals_agent ON withdrawals(agent_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);

-- Token transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id UUID NOT NULL REFERENCES agents(id),
  action TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tx_agent ON token_transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_tx_action ON token_transactions(action);
CREATE INDEX IF NOT EXISTS idx_tx_created ON token_transactions(created_at);

-- Daily bonuses table
CREATE TABLE IF NOT EXISTS daily_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  bonus_type TEXT NOT NULL,
  post_id UUID REFERENCES posts(id),
  agent_id UUID NOT NULL REFERENCES agents(id),
  amount BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(date, bonus_type, post_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_bonuses_date ON daily_bonuses(date);
CREATE INDEX IF NOT EXISTS idx_daily_bonuses_agent ON daily_bonuses(agent_id);

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
`;

async function runMigration() {
  if (!process.env.DB_PASSWORD) {
    console.log('\\n=== MIGRATION SQL ===');
    console.log('Paste this in Supabase SQL Editor (https://supabase.com/dashboard/project/tmasgeozycsqxsalxviz/sql/new):\\n');
    console.log(migration);
    console.log('\\n=== END MIGRATION SQL ===\\n');
    console.log('Or set DB_PASSWORD env var to run directly.');
    return;
  }

  const client = new pg.Client({ connectionString });
  
  try {
    console.log('Connecting to database...');
    await client.connect();
    
    console.log('Running migration...');
    await client.query(migration);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await client.end();
  }
}

runMigration();
