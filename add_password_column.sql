-- Add password column to students table for custom authentication
-- This allows the custom /api/register and /api/login endpoints to work

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Add comment to document the column
COMMENT ON COLUMN students.password IS 'Hashed password for custom authentication (format: salt$hash)';
