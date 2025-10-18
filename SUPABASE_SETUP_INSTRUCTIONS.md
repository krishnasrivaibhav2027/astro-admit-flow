# Supabase Setup Instructions

## Step 1: Create Database Tables

Your Supabase project needs to have the database tables set up. Please follow these steps:

### Option A: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: `https://supabase.com/dashboard/project/<your-project-id>`
2. Click on "SQL Editor" in the left sidebar.
3. Click "New query".
4. Copy and paste the following SQL migration and click "Run". This script is now secure and enforces proper data access policies.

```sql
-- Create students table
-- This table now includes a user_id to link students to authenticated users.
CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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

-- Enable RLS on all tables
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Create SECURE RLS policies for students
-- Users can only manage their own student profile.
DROP POLICY IF EXISTS "Users can manage their own student profile" ON public.students;
CREATE POLICY "Users can manage their own student profile"
  ON public.students FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create SECURE RLS policies for results
-- Users can only manage results linked to their student profile.
DROP POLICY IF EXISTS "Users can manage results linked to their student profile" ON public.results;
CREATE POLICY "Users can manage results linked to their student profile"
  ON public.results FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = results.student_id AND students.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = results.student_id AND students.user_id = auth.uid()
  ));

-- Create SECURE RLS policies for questions
-- Users can only manage questions linked to their results.
DROP POLICY IF EXISTS "Users can manage questions linked to their results" ON public.questions;
CREATE POLICY "Users can manage questions linked to their results"
  ON public.questions FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.results
    JOIN public.students ON results.student_id = students.id
    WHERE results.id = questions.result_id AND students.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.results
    JOIN public.students ON results.student_id = students.id
    WHERE results.id = questions.result_id AND students.user_id = auth.uid()
  ));

-- Create SECURE RLS policies for student_answers
-- Users can only manage answers linked to their questions.
DROP POLICY IF EXISTS "Users can manage answers linked to their questions" ON public.student_answers;
CREATE POLICY "Users can manage answers linked to their questions"
  ON public.student_answers FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.questions
    JOIN public.results ON questions.result_id = results.id
    JOIN public.students ON results.student_id = students.id
    WHERE questions.id = student_answers.question_id AND students.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.questions
    JOIN public.results ON questions.result_id = results.id
    JOIN public.students ON results.student_id = students.id
    WHERE questions.id = student_answers.question_id AND students.user_id = auth.uid()
  ));

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

5. Verify the tables were created by going to "Table Editor" in the left sidebar.

### Option B: Using Supabase CLI

If you have Supabase CLI installed:

```bash
cd /app/frontend/supabase
supabase db reset --linked
```

## Step 2: Verify Database Connection

After creating the tables, test the database connection:

1. Check if the Supabase project is active and accessible.
2. Verify your database credentials are correct in your environment variables.
3. Test the connection from the backend.

## Step 3: Important Notes

### Database Credentials
- Your project's credentials (URL, anon key) should be stored securely in environment variables, not in documentation.

### AI Integration
- **Question Generation**: Using Gemini AI (`gemini-1.5-pro` model).
- **Answer Evaluation**: Using Gemini AI for intelligent assessment.
- **API Key**: Ensure your Gemini API key is configured in your backend's `.env` file.

### Email Notifications
- The email sending functionality is currently a placeholder and needs to be implemented.

## Troubleshooting

### If Backend Won't Start:
1. Check backend logs for errors.
2. Verify that the database tables were created in the Supabase dashboard.
3. Ensure your Supabase project is not paused (free tier projects may pause after a week of inactivity).

### If Connection Fails:
1. Go to your Supabase Dashboard → Settings → Database.
2. Check your "Connection Pooling" settings.
3. Verify the connection string is correctly configured in your backend.

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

---

**Need Help?** Check if your Supabase project:
- Is not paused.
- Has database pooling enabled.
- Is configured to allow connections from your application's IP.
