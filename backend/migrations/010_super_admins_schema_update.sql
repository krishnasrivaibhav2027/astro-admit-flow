-- Modify Super Admins Table Schema
-- Migration: 010_super_admins_schema_update.sql
-- Adds columns to match admins table structure

-- Add new columns to super_admins table
ALTER TABLE super_admins
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'super_admin',
ADD COLUMN IF NOT EXISTS logout_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- Migrate existing 'name' data to first_name and last_name
UPDATE super_admins
SET 
    first_name = SPLIT_PART(name, ' ', 1),
    last_name = CASE 
        WHEN POSITION(' ' IN COALESCE(name, '')) > 0 
        THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
        ELSE ''
    END
WHERE first_name IS NULL AND name IS NOT NULL;

-- Optional: Drop the old 'name' column after migration
-- Uncomment if you want to remove the old column
-- ALTER TABLE super_admins DROP COLUMN IF EXISTS name;
