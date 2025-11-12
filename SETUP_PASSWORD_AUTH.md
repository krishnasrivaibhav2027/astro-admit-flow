# Setup Instructions for Custom Password Authentication

## Step 1: Add Password Column to Supabase

You need to add a `password` column to the `students` table in your Supabase database.

### Instructions:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project (uminpkhjsrfogjtwqqfn)
3. Navigate to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy and paste the following SQL:

```sql
-- Add password column to students table
ALTER TABLE public.students 
ADD COLUMN password TEXT;

-- Add comment to document the column
COMMENT ON COLUMN public.students.password IS 'Hashed password for custom authentication (format: salt$hash)';

-- Verify the column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;
```

6. Click **Run** button
7. You should see the password column listed in the results

## Step 2: Restart Backend

After adding the password column, restart the backend:

```bash
sudo supervisorctl restart backend
```

## Step 3: Test Authentication

The custom authentication endpoints are now ready:

- **Register**: `POST /api/register`
- **Login**: `POST /api/login`

These endpoints work alongside Firebase authentication for maximum flexibility.

## Security Notes

- Passwords are hashed using SHA256 with a random salt
- The format is: `salt$hash`
- JWT tokens are issued on successful authentication
- Tokens expire after 24 hours (configurable via JWT_EXPIRATION_HOURS)
