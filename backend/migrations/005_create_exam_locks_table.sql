-- Create exam_locks table to ensure deterministic question assignment
CREATE TABLE IF NOT EXISTS exam_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id),
    subject TEXT NOT NULL,
    level TEXT NOT NULL,
    question_ids JSONB NOT NULL, -- List of question IDs assigned
    status TEXT DEFAULT 'active', -- active, completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookup of active locks
CREATE INDEX idx_exam_locks_student_active ON exam_locks(student_id, subject, level) WHERE status = 'active';
