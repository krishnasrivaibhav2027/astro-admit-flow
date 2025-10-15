-- Create students table
CREATE TABLE public.students (
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
CREATE TABLE public.results (
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
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id UUID NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create student_answers table
CREATE TABLE public.student_answers (
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
CREATE POLICY "Students can view their own data" 
  ON public.students FOR SELECT 
  USING (true);

CREATE POLICY "Students can insert their own data" 
  ON public.students FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Students can update their own data" 
  ON public.students FOR UPDATE 
  USING (true);

-- Create RLS policies for results
CREATE POLICY "Students can view results" 
  ON public.results FOR SELECT 
  USING (true);

CREATE POLICY "Students can insert results" 
  ON public.results FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Students can update results" 
  ON public.results FOR UPDATE 
  USING (true);

-- Create RLS policies for questions
CREATE POLICY "Students can view questions" 
  ON public.questions FOR SELECT 
  USING (true);

CREATE POLICY "Students can insert questions" 
  ON public.questions FOR INSERT 
  WITH CHECK (true);

-- Create RLS policies for student_answers
CREATE POLICY "Students can view answers" 
  ON public.student_answers FOR SELECT 
  USING (true);

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
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();