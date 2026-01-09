-- ============================================
-- Super Admin Invitation System
-- Migration: 035_super_admin_invitations.sql
-- ============================================
-- This migration adds invitation workflow for super admins
-- similar to the institutional admin onboarding flow.

-- 1. Add invitation-related columns to super_admins table
ALTER TABLE super_admins
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'suspended')),
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES super_admins(id),
ADD COLUMN IF NOT EXISTS magic_link_token TEXT,
ADD COLUMN IF NOT EXISTS magic_link_expires TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- 2. Mark existing super admins as 'active' (for migration safety)
UPDATE super_admins SET status = 'active' WHERE status IS NULL;

-- 3. Create super_admin_invitations table for audit trail
CREATE TABLE IF NOT EXISTS super_admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    invited_by UUID REFERENCES super_admins(id) NOT NULL,
    magic_link_token TEXT NOT NULL,
    magic_link_expires TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

-- 4. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_super_admin_invitations_email ON super_admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_super_admin_invitations_token ON super_admin_invitations(magic_link_token);
CREATE INDEX IF NOT EXISTS idx_super_admin_status ON super_admins(status);
CREATE INDEX IF NOT EXISTS idx_super_admin_magic_token ON super_admins(magic_link_token);

-- 5. RLS Policies for super_admin_invitations
ALTER TABLE super_admin_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view invitations" ON super_admin_invitations
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM super_admins WHERE email = auth.jwt() ->> 'email' AND status = 'active')
    );

CREATE POLICY "Super admins can insert invitations" ON super_admin_invitations
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM super_admins WHERE email = auth.jwt() ->> 'email' AND status = 'active')
    );

CREATE POLICY "Super admins can update invitations" ON super_admin_invitations
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM super_admins WHERE email = auth.jwt() ->> 'email' AND status = 'active')
    );

-- Done!
-- To run: psql -f 035_super_admin_invitations.sql
