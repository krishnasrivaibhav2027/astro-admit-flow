-- Fix ai_notes table foreign key to add ON DELETE CASCADE
-- Run this in Supabase SQL Editor

-- First, drop the existing foreign key constraint if it exists
ALTER TABLE ai_notes DROP CONSTRAINT IF EXISTS ai_notes_result_id_fkey;
ALTER TABLE ai_notes DROP CONSTRAINT IF EXISTS ai_notes_student_id_fkey;

-- Add foreign key constraints with ON DELETE CASCADE
ALTER TABLE ai_notes 
ADD CONSTRAINT ai_notes_result_id_fkey 
FOREIGN KEY (result_id) 
REFERENCES results(id) 
ON DELETE CASCADE;

ALTER TABLE ai_notes 
ADD CONSTRAINT ai_notes_student_id_fkey 
FOREIGN KEY (student_id) 
REFERENCES students(id) 
ON DELETE CASCADE;

COMMENT ON CONSTRAINT ai_notes_result_id_fkey ON ai_notes IS 'Cascade delete ai_notes when result is deleted';
COMMENT ON CONSTRAINT ai_notes_student_id_fkey ON ai_notes IS 'Cascade delete ai_notes when student is deleted';
