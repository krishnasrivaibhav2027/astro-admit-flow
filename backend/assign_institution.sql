
-- Assign 'Allen Career Institute' to your admin account
UPDATE public.admins
SET institution_id = '34729f17-26cb-4c05-a652-c3a2799a1765'
WHERE email = 'vausdevguptha@gmail.com';

-- Verify the change
SELECT * FROM public.admins WHERE email = 'vausdevguptha@gmail.com';
