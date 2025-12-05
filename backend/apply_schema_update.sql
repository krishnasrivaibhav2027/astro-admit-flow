-- Add logout_time and last_active_at columns to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS logout_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
