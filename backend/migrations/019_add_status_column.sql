-- Add status column to question_bank table
ALTER TABLE question_bank ADD COLUMN IF NOT EXISTS status text DEFAULT 'ACTIVE';

-- Index for performance checks
CREATE INDEX IF NOT EXISTS idx_question_bank_status ON question_bank(status);
