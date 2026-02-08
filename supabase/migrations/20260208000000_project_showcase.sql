-- Migration: Project Showcase (ProductHunt-style)
-- Adds Twitter verification and project-focused schema

-- Add Twitter fields to agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twitter_verified BOOLEAN DEFAULT false;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS twitter_followers INTEGER DEFAULT 0;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS website_url TEXT;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS tagline TEXT;

-- Create projects table (separate from posts for cleaner model)
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  website_url TEXT,
  demo_url TEXT,
  github_url TEXT,
  logo_url TEXT,
  twitter_handle TEXT,
  category TEXT NOT NULL DEFAULT 'other',
  agent_id UUID REFERENCES agents(id),
  submitted_by_twitter TEXT NOT NULL,
  upvotes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  featured_at TIMESTAMPTZ,
  is_approved BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_projects_upvotes ON projects(upvotes DESC);
CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured_at DESC);

-- Create project_upvotes table
CREATE TABLE IF NOT EXISTS project_upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  twitter_handle TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, twitter_handle)
);

CREATE INDEX IF NOT EXISTS idx_project_upvotes_project_id ON project_upvotes(project_id);

-- Create comments table for projects
CREATE TABLE IF NOT EXISTS project_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  twitter_handle TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_comments_project_id ON project_comments(project_id);
