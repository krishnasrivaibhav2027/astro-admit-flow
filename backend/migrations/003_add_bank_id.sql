-- Add bank_id column to questions table to link back to question_bank
ALTER TABLE questions 
ADD COLUMN bank_id UUID REFERENCES question_bank(id);

-- Create index for faster lookups
CREATE INDEX idx_questions_bank_id ON questions(bank_id);

-- Comment
COMMENT ON COLUMN questions.bank_id IS 'Reference to the original question in the question_bank';
