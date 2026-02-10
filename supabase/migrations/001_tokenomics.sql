-- Tokenomics Implementation: $SNR Subscription System
-- Add subscription fields to api_keys table
ALTER TABLE api_keys ADD COLUMN subscription_tier TEXT DEFAULT 'free';
ALTER TABLE api_keys ADD COLUMN subscription_expires TIMESTAMPTZ;
ALTER TABLE api_keys ADD COLUMN wallet_address TEXT;

-- Add usage tracking table
CREATE TABLE usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twitter_handle TEXT NOT NULL,
  action_type TEXT NOT NULL, -- 'submission', 'upvote', 'comment'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast daily/weekly lookups
CREATE INDEX idx_usage_handle_type_date ON usage_tracking (twitter_handle, action_type, created_at);

-- Add subscription payments table
CREATE TABLE subscription_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twitter_handle TEXT NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'failed'
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);

-- Weekly rewards tracking
CREATE TABLE weekly_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  epoch_start TIMESTAMPTZ NOT NULL,
  epoch_end TIMESTAMPTZ NOT NULL,
  product_id UUID REFERENCES projects(id),
  twitter_handle TEXT,
  reward_type TEXT, -- 'product_of_week', 'runner_up', 'curator'
  snr_amount NUMERIC NOT NULL,
  claimed BOOLEAN DEFAULT false,
  wallet_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Sponsored spots table
CREATE TABLE sponsored_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_type TEXT NOT NULL, -- 'homepage_banner', 'product_sidebar'
  advertiser TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  usdc_paid NUMERIC NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);