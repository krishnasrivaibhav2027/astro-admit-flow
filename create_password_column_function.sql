-- Create a function that can be called via Supabase RPC to add the password column
-- Run this SQL in Supabase SQL Editor FIRST

CREATE OR REPLACE FUNCTION add_password_column_to_students()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Add password column if it doesn't exist
    ALTER TABLE public.students 
    ADD COLUMN IF NOT EXISTS password TEXT;
    
    RETURN 'Password column added successfully';
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'Error: ' || SQLERRM;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION add_password_column_to_students() TO anon;
GRANT EXECUTE ON FUNCTION add_password_column_to_students() TO authenticated;
