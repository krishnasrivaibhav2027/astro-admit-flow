-- ============================================
-- Performance Indexes Migration
-- Migration: 036_add_performance_indexes.sql
-- ============================================
-- Adds indexes to frequently queried columns for better query performance.
-- Safe to run multiple times (IF NOT EXISTS).
-- NOTE: Only includes indexes for confirmed existing columns.

-- Students table
CREATE INDEX IF NOT EXISTS idx_students_email ON students(email);
-- CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution_id); -- may not exist

-- Results table (test sessions)
CREATE INDEX IF NOT EXISTS idx_results_student ON results(student_id);
CREATE INDEX IF NOT EXISTS idx_results_subject ON results(subject);
-- Note: level column may not exist on results, skipping composite index

-- Student access requests
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON student_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_institution ON student_access_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_email ON student_access_requests(email);

-- Admins table
CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
-- CREATE INDEX IF NOT EXISTS idx_admins_institution ON admins(institution_id); -- column may not exist

-- Super admins
CREATE INDEX IF NOT EXISTS idx_super_admins_email ON super_admins(email);

-- Institutions
CREATE INDEX IF NOT EXISTS idx_institutions_status ON institutions(status);

-- Chat tables
CREATE INDEX IF NOT EXISTS idx_chat_threads_student ON chat_threads(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages(thread_id);

-- Done! Verify with: SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';
