-- Mock Institutions Data
-- Migration: 007_mock_institutions.sql
-- Inserts 10 mock institutions (8 approved, 2 pending)

INSERT INTO institutions (name, type, website, affiliation_number, country, state, status) VALUES
('St. Xavier''s College', 'college', 'https://stxaviers.edu', 'CBSE-2024-001', 'India', 'Maharashtra', 'approved'),
('Delhi Public School', 'school', 'https://dpsdelhi.edu.in', 'CBSE-2024-002', 'India', 'Delhi', 'approved'),
('Ryan International', 'school', 'https://ryaninternational.org', 'CBSE-2024-003', 'India', 'Karnataka', 'approved'),
('Presidency College', 'college', 'https://presidency.edu', 'ICSE-2024-001', 'India', 'West Bengal', 'approved'),
('DAV Public School', 'school', 'https://davschools.org', 'CBSE-2024-004', 'India', 'Punjab', 'approved'),
('FIITJEE Coaching', 'coaching', 'https://fiitjee.com', 'COACH-2024-001', 'India', 'Delhi', 'approved'),
('Allen Career Institute', 'coaching', 'https://allen.ac.in', 'COACH-2024-002', 'India', 'Rajasthan', 'approved'),
('Loyola College', 'college', 'https://loyolacollege.edu', 'AICTE-2024-001', 'India', 'Tamil Nadu', 'approved'),
('Vidya Niketan', 'school', 'https://vidyaniketan.edu', 'STATE-2024-001', 'India', 'Gujarat', 'pending'),
('Modern High School', 'school', 'https://modernhigh.edu', 'ICSE-2024-002', 'India', 'Maharashtra', 'pending')
ON CONFLICT DO NOTHING;

-- Insert your email as super admin (platform owner)
INSERT INTO super_admins (email, name) VALUES
('versatilevaibhu@gmail.com', 'Platform Admin')
ON CONFLICT (email) DO NOTHING;
