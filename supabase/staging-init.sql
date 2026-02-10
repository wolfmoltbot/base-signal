-- STAGING INIT: All tables from scratch for basesonar-staging
-- This creates the complete schema matching production + tokenomics

-- 1. Core tables (already exist in production)

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twitter_handle TEXT NOT NULL UNIQUE,
  api_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Tokenomics columns
  subscription_tier TEXT DEFAULT 'free',
  subscription_expires TIMESTAMPTZ,
  wallet_address TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT DEFAULT '',
  website_url TEXT,
  demo_url TEXT,
  github_url TEXT,
  logo_url TEXT,
  twitter_handle TEXT,
  category TEXT DEFAULT 'other',
  submitted_by_twitter TEXT NOT NULL,
  upvotes INTEGER DEFAULT 0,
  is_approved BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS project_upvotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  twitter_handle TEXT NOT NULL,
  is_agent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(project_id, twitter_handle)
);

CREATE TABLE IF NOT EXISTS project_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  twitter_handle TEXT NOT NULL,
  content TEXT NOT NULL,
  is_agent BOOLEAN DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tokenomics tables (from 001_tokenomics.sql)

CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twitter_handle TEXT NOT NULL,
  action_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usage_handle_type_date ON usage_tracking (twitter_handle, action_type, created_at);

CREATE TABLE IF NOT EXISTS subscription_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  twitter_handle TEXT NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  verified_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS weekly_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  epoch_start TIMESTAMPTZ NOT NULL,
  epoch_end TIMESTAMPTZ NOT NULL,
  product_id UUID REFERENCES projects(id),
  twitter_handle TEXT,
  reward_type TEXT,
  snr_amount NUMERIC NOT NULL,
  claimed BOOLEAN DEFAULT false,
  wallet_address TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sponsored_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_type TEXT NOT NULL,
  advertiser TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  image_url TEXT,
  usdc_paid NUMERIC NOT NULL DEFAULT 0,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  -- Self-service columns (from 002_sponsored_self_service.sql)
  booked_by TEXT,
  tx_hash TEXT,
  payment_token TEXT DEFAULT 'USDC',
  payment_amount NUMERIC,
  hold_expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'available',
  week_start DATE,
  week_end DATE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_project_upvotes_project ON project_upvotes(project_id);
CREATE INDEX IF NOT EXISTS idx_project_comments_project ON project_comments(project_id);
