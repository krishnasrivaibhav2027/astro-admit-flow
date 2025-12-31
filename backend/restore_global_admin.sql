
-- 1. Set global access (NULL) again
UPDATE public.admins
SET institution_id = NULL
WHERE email = 'vausdevguptha@gmail.com';

-- 2. Verify
SELECT * FROM public.admins WHERE email = 'vausdevguptha@gmail.com';
