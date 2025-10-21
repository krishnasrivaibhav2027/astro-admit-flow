-- Add concession column to results table
-- Run this in Supabase SQL Editor

-- Add concession column (stores percentage as integer: 0, 30, or 50)
ALTER TABLE results ADD COLUMN IF NOT EXISTS concession INTEGER DEFAULT 0;

-- Add check constraint to ensure valid concession values
ALTER TABLE results ADD CONSTRAINT results_concession_check 
CHECK (concession IN (0, 30, 50));

COMMENT ON COLUMN results.concession IS 'Fee concession percentage earned: 0%, 30% (medium passed), or 50% (all levels passed)';
