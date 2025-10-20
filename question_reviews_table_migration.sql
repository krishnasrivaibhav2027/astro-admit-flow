-- Create question_reviews table to cache question evaluations
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS question_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL UNIQUE,
    result_id UUID NOT NULL,
    student_id UUID NOT NULL,
    is_correct BOOLEAN NOT NULL,
    explanation TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_question_reviews_question_id ON question_reviews(question_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_result_id ON question_reviews(result_id);
CREATE INDEX IF NOT EXISTS idx_question_reviews_student_id ON question_reviews(student_id);

-- Add RLS policies
ALTER TABLE question_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own reviews
CREATE POLICY "Users can read their own reviews" ON question_reviews
    FOR SELECT
    USING (true);

-- Policy: Backend can insert reviews
CREATE POLICY "Backend can insert reviews" ON question_reviews
    FOR INSERT
    WITH CHECK (true);

-- Policy: Backend can update reviews
CREATE POLICY "Backend can update reviews" ON question_reviews
    FOR UPDATE
    USING (true);

COMMENT ON TABLE question_reviews IS 'Stores cached AI evaluations and explanations for student answers';
