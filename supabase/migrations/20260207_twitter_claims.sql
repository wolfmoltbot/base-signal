-- Add twitter claim fields to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twitter_verified_at TIMESTAMPTZ;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_code TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS claim_code_expires_at TIMESTAMPTZ;

-- Index for looking up by twitter handle
CREATE INDEX IF NOT EXISTS idx_agents_twitter_handle ON agents(twitter_handle);

-- Index for claim code lookup
CREATE INDEX IF NOT EXISTS idx_agents_claim_code ON agents(claim_code) WHERE claim_code IS NOT NULL;
