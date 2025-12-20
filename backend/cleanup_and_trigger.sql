-- 1. Drop the legacy firebase_uid column from admins table
ALTER TABLE public.admins DROP COLUMN IF EXISTS firebase_uid;

-- 2. Create the function to handle new user signups (specifically for Admins)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Check the role from metadata (set by Signup.tsx)
  IF new.raw_user_meta_data->>'role' = 'admin' THEN
    -- Insert into admins table
    -- Using COALESCE to provide defaults since Signup doesn't ask for names yet
    INSERT INTO public.admins (id, email, first_name, last_name, role)
    VALUES (
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'first_name', 'Admin'),
      COALESCE(new.raw_user_meta_data->>'last_name', 'User'),
      'admin'
    )
    ON CONFLICT (id) DO NOTHING; -- Prevent errors if somehow exists
  END IF;

  -- We DO NOT insert students here, because the frontend Profile.tsx 
  -- relies on a 404 (Missing Record) to trigger the "Complete Profile" flow.
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger (or recreate it)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
