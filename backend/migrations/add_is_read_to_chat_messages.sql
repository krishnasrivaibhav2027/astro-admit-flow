-- Add is_read column to chat_messages table
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT FALSE;

-- Index for faster unread counts
CREATE INDEX IF NOT EXISTS idx_chat_messages_unread ON chat_messages(thread_id, role, is_read);
