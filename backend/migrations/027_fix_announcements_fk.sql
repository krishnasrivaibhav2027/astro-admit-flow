-- Drop the existing foreign key constraint
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_created_by_fkey;

-- Add the new foreign key constraint referencing the admins table
ALTER TABLE announcements ADD CONSTRAINT announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES admins(id);
