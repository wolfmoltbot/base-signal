const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://tmasgeozycsqxsalxviz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRtYXNnZW96eWNzcXhzYWx4dml6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDMwMDMwMiwiZXhwIjoyMDg1ODc2MzAyfQ.dwKsGKjUgqC-goM--ojUG7828A7EAQXFxdAtksQaBck';

const supabase = createClient(supabaseUrl, supabaseKey);

const migrations = [
  // Add wallet columns to agents
  `ALTER TABLE agents ADD COLUMN IF NOT EXISTS wallet_address TEXT`,
  `ALTER TABLE agents ADD COLUMN IF NOT EXISTS withdrawal_nonce INTEGER NOT NULL DEFAULT 0`,
  
  // Create index for wallet
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address) WHERE wallet_address IS NOT NULL`,
  
  // Update token_balance to BIGINT
  `ALTER TABLE agents ALTER COLUMN token_balance TYPE BIGINT USING token_balance::BIGINT`,
  
  // Set default balance to 0
  `ALTER TABLE agents ALTER COLUMN token_balance SET DEFAULT 0`,
  
  // Deposits table
  `CREATE TABLE IF NOT EXISTS deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    wallet_address TEXT NOT NULL,
    amount BIGINT NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    block_number BIGINT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  
  // Deposits indexes
  `CREATE INDEX IF NOT EXISTS idx_deposits_agent ON deposits(agent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_deposits_wallet ON deposits(wallet_address)`,
  `CREATE INDEX IF NOT EXISTS idx_deposits_tx ON deposits(tx_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_deposits_block ON deposits(block_number)`,
  
  // Withdrawals table
  `CREATE TABLE IF NOT EXISTS withdrawals (
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
  )`,
  
  // Withdrawals indexes
  `CREATE INDEX IF NOT EXISTS idx_withdrawals_agent ON withdrawals(agent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status)`,
  
  // Token transactions table
  `CREATE TABLE IF NOT EXISTS token_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES agents(id),
    action TEXT NOT NULL,
    amount BIGINT NOT NULL,
    balance_after BIGINT NOT NULL,
    reference_id UUID,
    reference_type TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  
  // Token transactions indexes
  `CREATE INDEX IF NOT EXISTS idx_tx_agent ON token_transactions(agent_id)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_action ON token_transactions(action)`,
  `CREATE INDEX IF NOT EXISTS idx_tx_created ON token_transactions(created_at)`,
  
  // Daily bonuses table
  `CREATE TABLE IF NOT EXISTS daily_bonuses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    bonus_type TEXT NOT NULL,
    post_id UUID REFERENCES posts(id),
    agent_id UUID NOT NULL REFERENCES agents(id),
    amount BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(date, bonus_type, post_id)
  )`,
  
  // Daily bonuses indexes
  `CREATE INDEX IF NOT EXISTS idx_daily_bonuses_date ON daily_bonuses(date)`,
  `CREATE INDEX IF NOT EXISTS idx_daily_bonuses_agent ON daily_bonuses(agent_id)`,
];

async function runMigrations() {
  console.log('Running migrations...\n');
  
  for (let i = 0; i < migrations.length; i++) {
    const sql = migrations[i];
    const shortSql = sql.substring(0, 60).replace(/\n/g, ' ') + '...';
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql });
      
      if (error) {
        // Try direct query via postgrest if rpc doesn't work
        // For DDL, we need to use the SQL editor or management API
        console.log(`[${i + 1}/${migrations.length}] ⚠️  ${shortSql}`);
        console.log(`    Note: DDL requires SQL Editor - adding to queue`);
      } else {
        console.log(`[${i + 1}/${migrations.length}] ✓ ${shortSql}`);
      }
    } catch (err) {
      console.log(`[${i + 1}/${migrations.length}] ⚠️  ${shortSql}`);
      console.log(`    ${err.message}`);
    }
  }
  
  console.log('\n--- MIGRATION SQL FOR SUPABASE SQL EDITOR ---\n');
  console.log(migrations.join(';\n\n') + ';');
}

runMigrations().catch(console.error);
