-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id TEXT NOT NULL, -- Can be UUID or string depending on user type
    sender_type TEXT NOT NULL CHECK (sender_type IN ('student', 'admin')),
    receiver_id TEXT NOT NULL,
    receiver_type TEXT NOT NULL CHECK (receiver_type IN ('student', 'admin')),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
