-- Disable RLS on messages table to ensure backend can access it
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Grant permissions to anon and authenticated roles (just in case)
GRANT ALL ON messages TO anon;
GRANT ALL ON messages TO authenticated;
GRANT ALL ON messages TO service_role;

-- Verify sender_type constraint (optional, just ensuring it's correct)
-- ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_type_check;
-- ALTER TABLE messages ADD CONSTRAINT messages_sender_type_check CHECK (sender_type IN ('student', 'admin'));
