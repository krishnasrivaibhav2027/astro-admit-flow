
-- 1. Insert user into super_admins table
INSERT INTO public.super_admins (id, email, name, created_at)
VALUES (
  '1fe0f018-7d23-45af-ac8d-18f659b4fd11', -- Using ID from admins table to keep link consistent (or generate new uuid)
  'vausdevguptha@gmail.com', 
  'Vasudev Guptha', 
  NOW()
)
ON CONFLICT (email) DO NOTHING;

-- 2. Verify
SELECT * FROM public.super_admins WHERE email = 'vausdevguptha@gmail.com';
