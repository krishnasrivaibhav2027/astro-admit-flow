-- Add time_taken column to results table
-- Run this in Supabase SQL Editor

ALTER TABLE results ADD COLUMN IF NOT EXISTS time_taken INTEGER DEFAULT 0;

COMMENT ON COLUMN results.time_taken IS 'Time taken to complete the test in seconds';
