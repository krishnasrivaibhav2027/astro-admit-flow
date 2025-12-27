-- Add foreign key relationships to ai_notes table
-- Run this in Supabase SQL Editor

-- Add foreign key constraint for result_id
ALTER TABLE ai_notes 
ADD CONSTRAINT ai_notes_result_id_fkey 
FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE;

-- Add foreign key constraint for student_id
ALTER TABLE ai_notes 
ADD CONSTRAINT ai_notes_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Add comments
COMMENT ON CONSTRAINT ai_notes_result_id_fkey ON ai_notes IS 'Cascade delete ai_notes when result is deleted';
COMMENT ON CONSTRAINT ai_notes_student_id_fkey ON ai_notes IS 'Cascade delete ai_notes when student is deleted';
