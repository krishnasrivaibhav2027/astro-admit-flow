# Supabase Setup Instructions

## Step 1: Create Database Tables

Your Supabase project needs to have the database tables set up. Please follow these steps:

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/uminpkhjsrfogjtwqqfn
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the following SQL migration and click "Run":

```sql
-- Create students table
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  dob DATE NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  concession INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create results table
CREATE TABLE IF NOT EXISTS public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('easy', 'medium', 'hard')),
  score REAL,
  result TEXT CHECK (result IN ('pass', 'fail', 'pending')),
  attempts_easy INTEGER DEFAULT 0,
  attempts_medium INTEGER DEFAULT 0,
  attempts_hard INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create questions table
CREATE TABLE IF NOT EXISTS public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student_answers table
CREATE TABLE IF NOT EXISTS public.student_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  student_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for students
DROP POLICY IF EXISTS "Students can view their own data" ON public.students;
CREATE POLICY "Students can view their own data" 
  ON public.students FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Students can insert their own data" ON public.students;
CREATE POLICY "Students can insert their own data" 
  ON public.students FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students can update their own data" ON public.students;
CREATE POLICY "Students can update their own data" 
  ON public.students FOR UPDATE 
  USING (true);

-- Create RLS policies for results
DROP POLICY IF EXISTS "Students can view results" ON public.results;
CREATE POLICY "Students can view results" 
  ON public.results FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Students can insert results" ON public.results;
CREATE POLICY "Students can insert results" 
  ON public.results FOR INSERT 
  WITH CHECK (true);

DROP POLICY IF EXISTS "Students can update results" ON public.results;
CREATE POLICY "Students can update results" 
  ON public.results FOR UPDATE 
  USING (true);

-- Create RLS policies for questions
DROP POLICY IF EXISTS "Students can view questions" ON public.questions;
CREATE POLICY "Students can view questions" 
  ON public.questions FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Students can insert questions" ON public.questions;
CREATE POLICY "Students can insert questions" 
  ON public.questions FOR INSERT 
  WITH CHECK (true);

-- Create RLS policies for student_answers
DROP POLICY IF EXISTS "Students can view answers" ON public.student_answers;
CREATE POLICY "Students can view answers" 
  ON public.student_answers FOR SELECT 
  USING (true);

DROP POLICY IF EXISTS "Students can insert answers" ON public.student_answers;
CREATE POLICY "Students can insert answers" 
  ON public.student_answers FOR INSERT 
  WITH CHECK (true);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers
DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_results_updated_at ON public.results;
CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fix search path for security
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
```

5. Verify the tables were created by going to "Table Editor" in the left sidebar

### Option B: Using Supabase CLI

If you have Supabase CLI installed:

```bash
cd /app/frontend/supabase
supabase db reset --linked
```

## Step 2: Verify Database Connection

After creating the tables, test the database connection:

1. Check if the Supabase project is active and accessible
2. Verify the database password is correct
3. Test the connection from the backend

## Step 3: Important Notes

### Database Credentials
- **Project ID**: uminpkhjsrfogjtwqqfn
- **URL**: https://uminpkhjsrfogjtwqqfn.supabase.co
- **Connection String**: The password contains special characters and is URL-encoded in the backend `.env` file

### AI Integration
- **Question Generation**: Using Gemini AI (`gemini-1.5-pro` model)
- **Answer Evaluation**: Using Gemini AI for intelligent assessment
- **API Key**: Configured in backend `.env` file

### Email Notifications
- Gmail OAuth credentials are configured
- Email sending functionality is placeholder (needs implementation)
- Can be implemented later if needed

## Troubleshooting

### If Backend Won't Start:
1. Check backend logs: `tail -50 /var/log/supervisor/backend.err.log`
2. Verify database tables exist in Supabase dashboard
3. Ensure Supabase project is not paused (free tier projects pause after inactivity)
4. Check if PostgreSQL pooler is enabled in Supabase project settings

### If Connection Fails:
1. Go to Supabase Dashboard → Settings → Database
2. Check "Connection Pooling" settings
3. Use "Transaction" mode pooler
4. Verify the connection string matches

### To Test Backend:
```bash
curl http://localhost:8001/api/health
```

Should return:
```json
{
  "status": "healthy",
  "database": "connected"
}
```

## What's Different from Old Setup

### Before (MongoDB):
- Used MongoDB for database
- Had Supabase Edge Functions for AI operations
- Required Lovable API for question generation

### Now (Supabase PostgreSQL):
- Using Supabase PostgreSQL for all data
- AI operations integrated in FastAPI backend
- Using Gemini API for question generation and evaluation
- Simpler architecture - everything in one place

## Next Steps After Database Setup

1. Run the SQL migration in Supabase SQL Editor
2. Restart the backend: `sudo supervisorctl restart backend`
3. Test the backend connection
4. Test the frontend by registering a student
5. Try generating questions for a test level

---

**Need Help?** Check if your Supabase project:
- Is not paused (free tier projects pause after 1 week of inactivity)
- Has database pooling enabled
- Allows connections from external IPs
