-- Add status column to admins table
ALTER TABLE admins ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_admins_status ON admins(status);
