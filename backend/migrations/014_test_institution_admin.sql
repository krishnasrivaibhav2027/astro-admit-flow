-- Test Institutional Admin Setup
-- Migration: 014_test_institution_admin.sql
-- Sets up vausdevguptha@gmail.com as admin for ALL institutions for testing

-- First, delete any existing mock institution admins
DELETE FROM admins WHERE admin_type = 'institution_admin' AND email LIKE '%.edu.in';

-- Insert a single admin entry for each institution with the test email
-- Note: Since one email can't be in admins table multiple times (unique constraint),
-- we'll create ONE admin entry and track institution access differently

-- Option A: Single admin with NULL institution_id (can access all institutions)
INSERT INTO admins (email, first_name, last_name, phone, role, institution_id, designation, admin_type, created_at)
VALUES (
    'vausdevguptha@gmail.com',
    'Test',
    'Institution Admin',
    '+919876543210',
    'admin',
    NULL,  -- NULL means access to ALL institutions for testing
    'Test Admin',
    'institution_admin',
    NOW()
)
ON CONFLICT (email) DO UPDATE SET
    admin_type = 'institution_admin',
    designation = 'Test Admin',
    role = 'admin';

-- Verify
SELECT email, first_name, last_name, admin_type, designation FROM admins WHERE email = 'vausdevguptha@gmail.com';
