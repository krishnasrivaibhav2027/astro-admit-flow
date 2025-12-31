-- Institution Admin RLS Policies (using admins table)
-- Migration: 013_institution_admin_policies.sql
-- Grants proper permissions for institution admins to manage their institution's data

-- ============================================
-- ADMINS TABLE SELF-ACCESS POLICIES
-- ============================================

-- Allow admins to read their own record
DROP POLICY IF EXISTS "admins_read_own" ON admins;
CREATE POLICY "admins_read_own" ON admins
    FOR SELECT USING (
        auth.jwt() ->> 'email' = email
    );

-- Allow admins to update their own profile
DROP POLICY IF EXISTS "admins_update_own" ON admins;
CREATE POLICY "admins_update_own" ON admins
    FOR UPDATE USING (
        auth.jwt() ->> 'email' = email
    );

-- ============================================
-- STUDENT ACCESS REQUESTS POLICIES
-- ============================================

-- Allow institution admins to view student requests for their institution
DROP POLICY IF EXISTS "institution_admins_view_student_requests" ON student_access_requests;
CREATE POLICY "institution_admins_view_student_requests" ON student_access_requests
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM admins a
            WHERE a.email = auth.jwt() ->> 'email'
            AND a.institution_id = student_access_requests.institution_id
            AND a.admin_type = 'institution_admin'
        )
        OR
        -- Super admins can view all
        EXISTS (
            SELECT 1 FROM super_admins sa
            WHERE sa.email = auth.jwt() ->> 'email'
        )
    );

-- Allow institution admins to update student requests for their institution
DROP POLICY IF EXISTS "institution_admins_update_student_requests" ON student_access_requests;
CREATE POLICY "institution_admins_update_student_requests" ON student_access_requests
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM admins a
            WHERE a.email = auth.jwt() ->> 'email'
            AND a.institution_id = student_access_requests.institution_id
            AND a.admin_type = 'institution_admin'
        )
        OR
        -- Super admins can update all
        EXISTS (
            SELECT 1 FROM super_admins sa
            WHERE sa.email = auth.jwt() ->> 'email'
        )
    );

-- ============================================
-- INSTITUTIONS TABLE POLICIES FOR ADMINS
-- ============================================

-- Allow institution admins to view their own institution
DROP POLICY IF EXISTS "institution_admins_view_own_institution" ON institutions;
CREATE POLICY "institution_admins_view_own_institution" ON institutions
    FOR SELECT USING (
        -- Institution admin can see their own institution
        EXISTS (
            SELECT 1 FROM admins a
            WHERE a.email = auth.jwt() ->> 'email'
            AND a.institution_id = institutions.id
        )
        OR
        -- Super admins can see all
        EXISTS (
            SELECT 1 FROM super_admins sa
            WHERE sa.email = auth.jwt() ->> 'email'
        )
        OR
        -- Public can see approved institutions
        status = 'approved'
    );

-- ============================================
-- STUDENTS TABLE POLICIES FOR INSTITUTION ADMINS
-- ============================================

-- Allow institution admins to view students in their institution
DROP POLICY IF EXISTS "institution_admins_view_students" ON students;
CREATE POLICY "institution_admins_view_students" ON students
    FOR SELECT USING (
        -- Institution admin can see students in their institution
        EXISTS (
            SELECT 1 FROM admins a
            WHERE a.email = auth.jwt() ->> 'email'
            AND a.institution_id = students.institution_id
            AND a.admin_type = 'institution_admin'
        )
        OR
        -- Super admins can see all
        EXISTS (
            SELECT 1 FROM super_admins sa
            WHERE sa.email = auth.jwt() ->> 'email'
        )
        OR
        -- Students can view their own data
        auth.jwt() ->> 'email' = email
    );

-- ============================================
-- VERIFY POLICIES
-- ============================================
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename IN ('admins', 'student_access_requests', 'institutions', 'students')
ORDER BY tablename, policyname;
