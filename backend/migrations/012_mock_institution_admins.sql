-- Mock Institution Admins using existing admins table
-- Migration: 012_mock_institution_admins.sql
-- Creates admin accounts in the existing admins table for each mock institution

-- First, add institution_id column to admins table if not exists
ALTER TABLE admins ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES institutions(id);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS admin_type TEXT DEFAULT 'institution_admin';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Insert mock admins for each institution into the existing admins table
INSERT INTO admins (email, first_name, last_name, phone, role, institution_id, designation, admin_type)
SELECT 
    LOWER(REPLACE(REPLACE(i.name, ' ', ''), '''', '')) || '.admin@' || 
        CASE 
            WHEN i.type = 'school' THEN 'school.edu.in'
            WHEN i.type = 'college' THEN 'college.edu.in'
            ELSE 'coaching.edu.in'
        END as email,
    'Admin' as first_name,
    'of ' || i.name as last_name,
    '+91' || LPAD(FLOOR(RANDOM() * 9000000000 + 1000000000)::TEXT, 10, '0') as phone,
    'admin' as role,
    i.id as institution_id,
    CASE 
        WHEN i.type = 'school' THEN 'Principal'
        WHEN i.type = 'college' THEN 'Dean of Admissions'
        ELSE 'Center Head'
    END as designation,
    'institution_admin' as admin_type
FROM institutions i
WHERE NOT EXISTS (
    SELECT 1 FROM admins a WHERE a.institution_id = i.id
)
ON CONFLICT (email) DO NOTHING;

-- Display created admins
SELECT 
    a.email, 
    a.first_name || ' ' || a.last_name as name, 
    a.designation, 
    a.admin_type,
    i.name as institution_name
FROM admins a
LEFT JOIN institutions i ON i.id = a.institution_id
WHERE a.institution_id IS NOT NULL
ORDER BY i.name;
