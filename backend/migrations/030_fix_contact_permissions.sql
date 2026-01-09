
-- Migration 030: Fix Contact Permissions
-- Ensure proper visibility for chat contacts across roles

-- 1. Allow authenticated users to view Super Admins (needed for Inst Admins to chat with them)
-- Enable RLS just in case, or ensure policy exists
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_read_super_admins" ON super_admins;
CREATE POLICY "allow_read_super_admins" ON super_admins
    FOR SELECT TO authenticated
    USING (true); -- Allow all authenticated users to see super admins (Basic contact info)

-- 2. Allow authenticated users to view Students (so Admins can see them)
-- The existing policy might be too restrictive or broken if admin linking is imperfect.
-- For Chat purposes, we might want to broaden this, OR rely on the existing one being fixed.
-- Let's create a backup policy for 'admins' to see ALL students for now to debug, or stricter?
-- Let's stick to the Institution logic:
DROP POLICY IF EXISTS "admins_view_all_students" ON students;
CREATE POLICY "admins_view_all_students" ON students
    FOR SELECT TO authenticated
    USING (
        -- Allow if user is an admin
        EXISTS (
            SELECT 1 FROM admins 
            WHERE admins.email = auth.jwt() ->> 'email'
        )
    );

-- 3. Allow Students to view Admins (Institution Admins)
DROP POLICY IF EXISTS "students_view_admins" ON admins;
CREATE POLICY "students_view_admins" ON admins
    FOR SELECT TO authenticated
    USING (true); -- Allow students to see admins (for contact list)

-- 4. Reload schema cache (not creating sql, just comment)
