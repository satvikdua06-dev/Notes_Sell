-- 002_admin.sql — Authors table, soft-delete flags, author_id on chapters

-- Authors
CREATE TABLE IF NOT EXISTS authors (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  email          TEXT UNIQUE NOT NULL,
  bio            TEXT,
  payout_details JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link chapters to authors (nullable — existing chapters have no author yet)
ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES authors(id) ON DELETE SET NULL;

-- Soft-delete: subjects
ALTER TABLE subjects
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Soft-delete: chapters
ALTER TABLE chapters
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_chapters_author  ON chapters(author_id);
CREATE INDEX IF NOT EXISTS idx_chapters_active  ON chapters(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_subjects_active  ON subjects(is_active) WHERE is_active = true;
