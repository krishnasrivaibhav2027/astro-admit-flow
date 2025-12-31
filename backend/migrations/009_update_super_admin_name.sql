-- Quick fix: Update super admin name
-- Run this in Supabase SQL Editor

UPDATE super_admins 
SET name = 'Vaibhav' 
WHERE email = 'versatilevaibhu@gmail.com';
