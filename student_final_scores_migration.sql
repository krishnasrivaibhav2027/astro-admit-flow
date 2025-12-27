-- Migration: Create student_final_scores table
-- Purpose: Store computed final scores, cumulative time, and leaderboard data

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the student_final_scores table
CREATE TABLE IF NOT EXISTS student_final_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  
  -- Time tracking (stored in seconds for precision)
  total_time_seconds INTEGER DEFAULT 0,
  
  -- Composite score (0-11 range with bonuses)
  composite_score NUMERIC(5,2) DEFAULT 0,
  
  -- Score breakdown stored as JSON
  score_breakdown JSONB DEFAULT '{}'::jsonb,
  
  -- Levels information
  levels_passed INTEGER DEFAULT 0,
  highest_level VARCHAR(10) DEFAULT NULL, -- 'easy', 'medium', 'hard'
  
  -- Concession/Scholarship percentage
  concession INTEGER DEFAULT 0,
  
  -- Overall pass status (passed at least medium in all subjects or similar criteria)
  is_passed BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one record per student
  UNIQUE(student_id)
);

-- Create index for faster leaderboard queries
CREATE INDEX IF NOT EXISTS idx_final_scores_composite ON student_final_scores(composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_final_scores_student ON student_final_scores(student_id);

-- Add RLS policies
ALTER TABLE student_final_scores ENABLE ROW LEVEL SECURITY;

-- Policy: Students can read their own scores
CREATE POLICY "Students can view own final scores"
  ON student_final_scores FOR SELECT
  USING (auth.uid() = student_id);

-- Policy: Service role can do everything (for backend updates)
CREATE POLICY "Service role full access"
  ON student_final_scores FOR ALL
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON student_final_scores TO authenticated;
GRANT ALL ON student_final_scores TO service_role;

COMMENT ON TABLE student_final_scores IS 'Stores computed leaderboard data: composite scores, cumulative time, and pass status';
