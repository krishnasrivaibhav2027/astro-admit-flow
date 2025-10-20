-- Create ai_notes table to cache generated AI study notes
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID NOT NULL,
    student_id UUID NOT NULL,
    level VARCHAR(20) NOT NULL,
    topic_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
    incorrect_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(result_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_notes_result_id ON ai_notes(result_id);
CREATE INDEX IF NOT EXISTS idx_ai_notes_student_id ON ai_notes(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_notes_level ON ai_notes(level);

-- Add RLS policies
ALTER TABLE ai_notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own AI notes
CREATE POLICY "Users can read their own AI notes" ON ai_notes
    FOR SELECT
    USING (true);  -- Backend handles authentication, so allow all reads

-- Policy: Backend can insert AI notes
CREATE POLICY "Backend can insert AI notes" ON ai_notes
    FOR INSERT
    WITH CHECK (true);

-- Policy: Backend can update AI notes
CREATE POLICY "Backend can update AI notes" ON ai_notes
    FOR UPDATE
    USING (true);

COMMENT ON TABLE ai_notes IS 'Stores cached AI-generated study notes for test results';
