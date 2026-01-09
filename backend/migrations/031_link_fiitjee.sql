
-- 1. Find FIITJEE ID
SELECT id, name FROM institutions WHERE name = 'FIITJEE Coaching';

-- 2. Link Admin to FIITJEE (This will hide Allen requests)
UPDATE public.admins
SET institution_id = (SELECT id FROM institutions WHERE name = 'FIITJEE Coaching')
WHERE email = 'vausdevguptha@gmail.com';

-- 3. Verify
SELECT a.email, i.name as institution_name 
FROM public.admins a
JOIN institutions i ON a.institution_id = i.id
WHERE a.email = 'vausdevguptha@gmail.com';
