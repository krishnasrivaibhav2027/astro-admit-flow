-- Fix UUID issue by changing ID columns to TEXT to support Firebase UIDs
-- This allows Firebase UIDs (which are not valid UUIDs) to be used as primary keys

-- First, drop foreign key constraints
ALTER TABLE public.results DROP CONSTRAINT results_student_id_fkey;
ALTER TABLE public.questions DROP CONSTRAINT questions_result_id_fkey;
ALTER TABLE public.student_answers DROP CONSTRAINT student_answers_question_id_fkey;

-- Change students.id from UUID to TEXT
ALTER TABLE public.students ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.students ALTER COLUMN id DROP DEFAULT;

-- Change results.id and student_id from UUID to TEXT
ALTER TABLE public.results ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.results ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.results ALTER COLUMN student_id TYPE TEXT;

-- Change questions.id and result_id from UUID to TEXT
ALTER TABLE public.questions ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.questions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.questions ALTER COLUMN result_id TYPE TEXT;

-- Change student_answers.id and question_id from UUID to TEXT
ALTER TABLE public.student_answers ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.student_answers ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.student_answers ALTER COLUMN question_id TYPE TEXT;

-- Recreate foreign key constraints
ALTER TABLE public.results ADD CONSTRAINT results_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE public.questions ADD CONSTRAINT questions_result_id_fkey 
  FOREIGN KEY (result_id) REFERENCES public.results(id) ON DELETE CASCADE;

ALTER TABLE public.student_answers ADD CONSTRAINT student_answers_question_id_fkey 
  FOREIGN KEY (question_id) REFERENCES public.questions(id) ON DELETE CASCADE;