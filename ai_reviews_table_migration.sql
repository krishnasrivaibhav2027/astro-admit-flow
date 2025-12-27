-- Create ai_reviews table to cache detailed AI reviews for questions
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS ai_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL UNIQUE,
    result_id UUID NOT NULL,
    student_id UUID NOT NULL,
    subject VARCHAR(50) DEFAULT 'physics',
    review_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_ai_reviews_question_id ON ai_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_result_id ON ai_reviews(result_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_student_id ON ai_reviews(student_id);
CREATE INDEX IF NOT EXISTS idx_ai_reviews_subject ON ai_reviews(subject);

-- Add RLS policies
ALTER TABLE ai_reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first (makes migration idempotent)
DROP POLICY IF EXISTS "Users can read their own AI reviews" ON ai_reviews;
DROP POLICY IF EXISTS "Backend can insert AI reviews" ON ai_reviews;
DROP POLICY IF EXISTS "Backend can update AI reviews" ON ai_reviews;

-- Policy: Users can read their own reviews
CREATE POLICY "Users can read their own AI reviews" ON ai_reviews
    FOR SELECT
    USING (true);

-- Policy: Backend can insert AI reviews
CREATE POLICY "Backend can insert AI reviews" ON ai_reviews
    FOR INSERT
    WITH CHECK (true);

-- Policy: Backend can update AI reviews
CREATE POLICY "Backend can update AI reviews" ON ai_reviews
    FOR UPDATE
    USING (true);

COMMENT ON TABLE ai_reviews IS 'Stores cached detailed AI reviews for student question answers';
COMMENT ON COLUMN ai_reviews.subject IS 'Subject of the question (physics, math, chemistry)';

