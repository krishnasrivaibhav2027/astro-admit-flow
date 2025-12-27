-- Chat History Tables for Supabase
-- Run this in the Supabase SQL Editor

-- Table for chat threads (conversations)
CREATE TABLE IF NOT EXISTS chat_threads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    thread_id TEXT NOT NULL UNIQUE,
    title TEXT DEFAULT 'New Chat',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table for individual messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    thread_id TEXT NOT NULL REFERENCES chat_threads(thread_id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_chat_threads_student_id ON chat_threads(student_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_updated_at ON chat_threads(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread_id ON chat_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security
ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies (students can only access their own chats)
CREATE POLICY "Students can view own threads" ON chat_threads
    FOR SELECT USING (student_id IN (
        SELECT id FROM students WHERE email = auth.jwt() ->> 'email'
    ));

CREATE POLICY "Students can insert own threads" ON chat_threads
    FOR INSERT WITH CHECK (student_id IN (
        SELECT id FROM students WHERE email = auth.jwt() ->> 'email'
    ));

CREATE POLICY "Students can view messages in own threads" ON chat_messages
    FOR SELECT USING (thread_id IN (
        SELECT thread_id FROM chat_threads WHERE student_id IN (
            SELECT id FROM students WHERE email = auth.jwt() ->> 'email'
        )
    ));

CREATE POLICY "Students can insert messages in own threads" ON chat_messages
    FOR INSERT WITH CHECK (thread_id IN (
        SELECT thread_id FROM chat_threads WHERE student_id IN (
            SELECT id FROM students WHERE email = auth.jwt() ->> 'email'
        )
    ));

-- Service role bypass for backend operations
CREATE POLICY "Service role full access threads" ON chat_threads
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access messages" ON chat_messages
    FOR ALL USING (auth.role() = 'service_role');
