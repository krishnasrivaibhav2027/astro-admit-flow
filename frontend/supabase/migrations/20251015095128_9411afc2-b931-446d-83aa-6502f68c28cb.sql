-- Create students table with validation constraints
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) DEFAULT auth.uid(),
  first_name TEXT NOT NULL CHECK (char_length(first_name) > 0),
  last_name TEXT NOT NULL CHECK (char_length(last_name) > 0),
  age INTEGER NOT NULL CHECK (age > 0),
  dob DATE NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  concession INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create results table with validation constraints
CREATE TABLE public.results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('easy', 'medium', 'hard')),
  score REAL CHECK (score >= 0 AND score <= 10),
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

-- Secure RLS policies for students
CREATE POLICY "Users can manage their own student data"
  ON public.students FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Secure RLS policies for results
CREATE POLICY "Users can manage their own results"
  ON public.results FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = results.student_id AND students.user_id = auth.uid()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.students
    WHERE students.id = results.student_id AND students.user_id = auth.uid()
  ));

-- Secure RLS policies for questions and answers (cascaded access)
CREATE POLICY "Users can view questions of their results"
  ON public.questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.results r
    JOIN public.students s ON r.student_id = s.id
    WHERE r.id = result_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Users can view answers to their questions"
  ON public.student_answers FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.questions q
    JOIN public.results r ON q.result_id = r.id
    JOIN public.students s ON r.student_id = s.id
    WHERE q.id = question_id AND s.user_id = auth.uid()
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
CREATE TRIGGER update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_results_updated_at
  BEFORE UPDATE ON public.results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();