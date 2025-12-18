-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Question Bank Table
CREATE TABLE IF NOT EXISTS question_bank (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('easy', 'medium', 'hard')),
    question_content JSONB NOT NULL, -- Stores {"question": "...", "answer": "...", "context": "..."}
    is_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    used_at TIMESTAMP WITH TIME ZONE,
    assigned_result_id UUID REFERENCES results(id)
);

-- Index for fast fetching of unused questions
CREATE INDEX IF NOT EXISTS idx_question_bank_fetch ON question_bank(subject, level, is_used);
