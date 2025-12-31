-- Institution Access Control Schema
-- Migration: 006_institutions_schema.sql
-- Creates institutions, super_admins, institution_admins, and student_access_requests tables

-- ============================================
-- 1. INSTITUTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS institutions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('school', 'college', 'coaching')),
    website TEXT,
    affiliation_number TEXT,
    country TEXT DEFAULT 'India',
    state TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    documents_url TEXT,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID
);

-- ============================================
-- 2. SUPER ADMINS TABLE (Platform Owners)
-- ============================================
CREATE TABLE IF NOT EXISTS super_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 3. INSTITUTION ADMINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS institution_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    phone TEXT,
    designation TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
    magic_link_token TEXT,
    magic_link_expires TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    activated_at TIMESTAMPTZ
);

-- ============================================
-- 4. STUDENT ACCESS REQUESTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS student_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    stream_applied TEXT,
    scorecard_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES institution_admins(id),
    rejection_reason TEXT,
    magic_link_token TEXT,
    magic_link_expires TIMESTAMPTZ,
    last_document_upload_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    -- Unique constraint to prevent duplicate pending requests
    CONSTRAINT unique_pending_request UNIQUE NULLS NOT DISTINCT (email, institution_id, status)
);

-- ============================================
-- 5. MODIFY STUDENTS TABLE
-- ============================================
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id),
ADD COLUMN IF NOT EXISTS access_request_id UUID;

-- ============================================
-- 6. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_institutions_status ON institutions(status);
CREATE INDEX IF NOT EXISTS idx_institution_admins_email ON institution_admins(email);
CREATE INDEX IF NOT EXISTS idx_institution_admins_institution ON institution_admins(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_access_requests_email ON student_access_requests(email);
CREATE INDEX IF NOT EXISTS idx_student_access_requests_institution ON student_access_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_access_requests_status ON student_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_students_institution ON students(institution_id);

-- ============================================
-- 7. RLS POLICIES
-- ============================================
-- Enable RLS on all new tables
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE institution_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_access_requests ENABLE ROW LEVEL SECURITY;

-- Public read access to approved institutions (for dropdown)
CREATE POLICY "Public can view approved institutions" ON institutions
    FOR SELECT USING (status = 'approved');

-- Super admins can do everything
CREATE POLICY "Super admins full access to institutions" ON institutions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM super_admins WHERE email = auth.jwt() ->> 'email')
    );

-- Institution admins can view their own institution
CREATE POLICY "Institution admins view own institution" ON institutions
    FOR SELECT USING (
        id IN (SELECT institution_id FROM institution_admins WHERE email = auth.jwt() ->> 'email')
    );

-- Super admins can view all super_admins
CREATE POLICY "Super admins view super_admins" ON super_admins
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM super_admins WHERE email = auth.jwt() ->> 'email')
    );

-- Institution admins can view themselves
CREATE POLICY "Institution admins view self" ON institution_admins
    FOR SELECT USING (email = auth.jwt() ->> 'email');

-- Institution admins can view student requests for their institution
CREATE POLICY "Institution admins view student requests" ON student_access_requests
    FOR SELECT USING (
        institution_id IN (SELECT institution_id FROM institution_admins WHERE email = auth.jwt() ->> 'email')
    );

-- Students can view their own requests
CREATE POLICY "Students view own requests" ON student_access_requests
    FOR SELECT USING (email = auth.jwt() ->> 'email');
