-- FIX FOR: "new row violates row-level security policy for table 'admins'"
-- ERROR CODE: 42501

-- INSTRUCTIONS:
-- 1. Go to your Supabase Dashboard (https://supabase.com/dashboard).
-- 2. Open the "SQL Editor" from the left sidebar.
-- 3. Copy and paste the command below.
-- 4. Click "Run".

-- This command disables Row Level Security (RLS) on the 'admins' table.
-- NOTE: This allows the backend to insert new admins using the standard API key.
-- WARNING: If your project is public, this technically allows anyone with your Anon Key to write to this table.
-- For a production app, you should use the 'Service Role Key' in your backend instead.

ALTER TABLE admins DISABLE ROW LEVEL SECURITY;
