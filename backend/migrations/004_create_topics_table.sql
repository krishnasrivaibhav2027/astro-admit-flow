-- Create topics table for versioned topic storage
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject TEXT NOT NULL,
    topic_name TEXT NOT NULL,
    difficulty_hint JSONB, -- Optional metadata
    pdf_hash TEXT NOT NULL, -- Versioning
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure we don't duplicate topics for the same file version
    UNIQUE(subject, topic_name, pdf_hash)
);

-- Index for faster lookups during generation
CREATE INDEX idx_topics_subject_hash ON topics(subject, pdf_hash);
