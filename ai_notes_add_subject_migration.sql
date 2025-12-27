-- Add subject column to ai_notes table
-- Run this in Supabase SQL Editor

-- Add subject column to ai_notes table
ALTER TABLE ai_notes ADD COLUMN IF NOT EXISTS subject VARCHAR(50) DEFAULT 'physics';

-- Create index for the subject column for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_notes_subject ON ai_notes(subject);

-- Note: NOT adding unique constraint on (student_id, level, subject) because 
-- students can take multiple tests for the same level/subject
-- The existing result_id unique constraint is sufficient

-- Also add subject to ai_reviews table (if table exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_reviews') THEN
        ALTER TABLE ai_reviews ADD COLUMN IF NOT EXISTS subject VARCHAR(50) DEFAULT 'physics';
        CREATE INDEX IF NOT EXISTS idx_ai_reviews_subject ON ai_reviews(subject);
    END IF;
END $$;

COMMENT ON COLUMN ai_notes.subject IS 'Subject of the test (physics, math, chemistry)';
