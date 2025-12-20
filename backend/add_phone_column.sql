-- SQL to add Phone Number column to admins table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.admins 
ADD COLUMN IF NOT EXISTS phone TEXT;

-- Verify it worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'admins';
