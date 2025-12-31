
-- 1. Remove from super_admins (undoing previous step)
DELETE FROM public.super_admins 
WHERE email = 'vausdevguptha@gmail.com';

-- 2. Set institution_id to NULL in admins table
-- This tells the backed: "This admin is not restricted to one institution (Global Access)"
UPDATE public.admins
SET institution_id = NULL
WHERE email = 'vausdevguptha@gmail.com';

-- 3. Verify
SELECT * FROM public.admins WHERE email = 'vausdevguptha@gmail.com';
