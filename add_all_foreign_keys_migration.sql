-- Comprehensive Foreign Key Relationships Migration
-- Run this in Supabase SQL Editor
-- This adds missing foreign key constraints to ensure proper data relationships

-- =====================================================
-- 1. ai_notes table - Add FKs to results and students
-- =====================================================
ALTER TABLE ai_notes 
DROP CONSTRAINT IF EXISTS ai_notes_result_id_fkey;
ALTER TABLE ai_notes 
ADD CONSTRAINT ai_notes_result_id_fkey 
FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE;

ALTER TABLE ai_notes 
DROP CONSTRAINT IF EXISTS ai_notes_student_id_fkey;
ALTER TABLE ai_notes 
ADD CONSTRAINT ai_notes_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- =====================================================
-- 2. question_reviews table - Add FKs to results and students
--    (already has FK to questions)
-- =====================================================
ALTER TABLE question_reviews 
DROP CONSTRAINT IF EXISTS question_reviews_result_id_fkey;
ALTER TABLE question_reviews 
ADD CONSTRAINT question_reviews_result_id_fkey 
FOREIGN KEY (result_id) REFERENCES results(id) ON DELETE CASCADE;

ALTER TABLE question_reviews 
DROP CONSTRAINT IF EXISTS question_reviews_student_id_fkey;
ALTER TABLE question_reviews 
ADD CONSTRAINT question_reviews_student_id_fkey 
FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- =====================================================
-- 3. ai_reviews table - Already has all FKs defined
--    (question_id, result_id, student_id all reference their tables)
-- =====================================================
-- No changes needed

-- =====================================================
-- NOTES on messages table:
-- The messages table uses TEXT columns for sender_id/receiver_id
-- with sender_type/receiver_type to support polymorphic relationships
-- (can be 'student' or 'admin'). Standard foreign keys cannot be added
-- to polymorphic tables. This is a design choice for flexibility.
-- =====================================================

-- Add comments for documentation
COMMENT ON CONSTRAINT ai_notes_result_id_fkey ON ai_notes IS 'Links AI notes to their test result';
COMMENT ON CONSTRAINT ai_notes_student_id_fkey ON ai_notes IS 'Links AI notes to the student';
COMMENT ON CONSTRAINT question_reviews_result_id_fkey ON question_reviews IS 'Links question review to test result';
COMMENT ON CONSTRAINT question_reviews_student_id_fkey ON question_reviews IS 'Links question review to student';

-- =====================================================
-- Summary of table relationships after this migration:
-- 
-- students (1) ──→ (many) results
-- results (1) ──→ (many) questions
-- questions (1) ──→ (many) student_answers
-- questions (1) ──→ (1) question_reviews
-- questions (1) ──→ (1) ai_reviews
-- results (1) ──→ (many) ai_notes
-- students (1) ──→ (many) chat_threads
-- chat_threads (1) ──→ (many) chat_messages
-- =====================================================
