-- RLS Policy Fixes for Production (IDEMPOTENT)
-- Migration: 008_rls_fixes.sql
-- Safe to run multiple times

-- ============================================
-- 1. DROP ALL EXISTING POLICIES FIRST
-- ============================================

-- Institutions policies
DROP POLICY IF EXISTS "Public can view approved institutions" ON institutions;
DROP POLICY IF EXISTS "Super admins full access to institutions" ON institutions;
DROP POLICY IF EXISTS "Super admins manage institutions" ON institutions;
DROP POLICY IF EXISTS "Institution admins view own institution" ON institutions;

-- Super admins policies
DROP POLICY IF EXISTS "Super admins view super_admins" ON super_admins;
DROP POLICY IF EXISTS "Public can check super_admins" ON super_admins;

-- Institution admins policies
DROP POLICY IF EXISTS "Institution admins view self" ON institution_admins;
DROP POLICY IF EXISTS "Super admins manage institution_admins" ON institution_admins;

-- Student access requests policies
DROP POLICY IF EXISTS "Institution admins view student requests" ON student_access_requests;
DROP POLICY IF EXISTS "Students view own requests" ON student_access_requests;
DROP POLICY IF EXISTS "Super admins view all requests" ON student_access_requests;
DROP POLICY IF EXISTS "Institution admins manage requests" ON student_access_requests;

-- ============================================
-- 2. CREATE NEW POLICIES
-- ============================================

-- Allow public to view approved institutions (for login dropdown)
CREATE POLICY "Public can view approved institutions" ON institutions
    FOR SELECT USING (status = 'approved');

-- Allow anyone to check if email is super admin (for frontend auth)
CREATE POLICY "Public can check super_admins" ON super_admins
    FOR SELECT USING (true);

-- Super admins can manage all institutions
CREATE POLICY "Super admins manage institutions" ON institutions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM super_admins WHERE email = auth.jwt() ->> 'email')
    );

-- Super admins can manage all institution admins
CREATE POLICY "Super admins manage institution_admins" ON institution_admins
    FOR ALL USING (
        EXISTS (SELECT 1 FROM super_admins WHERE email = auth.jwt() ->> 'email')
    );

-- Institution admins can view themselves
CREATE POLICY "Institution admins view self" ON institution_admins
    FOR SELECT USING (email = auth.jwt() ->> 'email');

-- Super admins can view all student requests
CREATE POLICY "Super admins view all requests" ON student_access_requests
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM super_admins WHERE email = auth.jwt() ->> 'email')
    );

-- Institution admins can manage student requests for their institution
CREATE POLICY "Institution admins manage requests" ON student_access_requests
    FOR ALL USING (
        institution_id IN (
            SELECT institution_id FROM institution_admins 
            WHERE email = auth.jwt() ->> 'email' AND status = 'active'
        )
    );

-- Students can view their own requests
CREATE POLICY "Students view own requests" ON student_access_requests
    FOR SELECT USING (email = auth.jwt() ->> 'email');

-- ============================================
-- 3. ADD MISSING COLUMNS IF NEEDED
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'institution_admins' AND column_name = 'rejection_reason') THEN
        ALTER TABLE institution_admins ADD COLUMN rejection_reason TEXT;
    END IF;
END $$;
