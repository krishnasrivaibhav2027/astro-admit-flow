
-- Update the admin record to link with the correct Auth User ID
UPDATE public.admins
SET id = '870e8b6b-4a1a-4f0b-a65a-c0761ac42e3e'  -- The ID from Authentication tab
WHERE email = 'vausdevguptha@gmail.com';         -- The email with the typo

-- Verify the update
SELECT * FROM public.admins WHERE email = 'vausdevguptha@gmail.com';
