-- Add role column to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE students ADD COLUMN IF NOT EXISTS logout_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT NOT NULL, -- 'all', 'students', 'teachers'
    created_by UUID REFERENCES students(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create admin_settings table
CREATE TABLE IF NOT EXISTS admin_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin domain setting
INSERT INTO admin_settings (key, value) 
VALUES ('allowed_admin_domains', '["admin.com", "institution.edu"]')
ON CONFLICT (key) DO NOTHING;

-- Create question_analytics view (optional, for easier querying)
CREATE OR REPLACE VIEW question_analytics AS
SELECT 
    q.id AS question_id,
    q.question_text,
    q.result_id,
    COUNT(sa.id) AS attempt_count,
    COUNT(CASE WHEN sa.student_answer = q.correct_answer THEN 1 END) AS correct_count,
    AVG(CASE WHEN sa.student_answer = q.correct_answer THEN 1 ELSE 0 END) * 100 AS correct_percentage
FROM questions q
LEFT JOIN student_answers sa ON q.id = sa.question_id
GROUP BY q.id, q.question_text, q.result_id;

-- Create admins table
CREATE TABLE IF NOT EXISTS admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
