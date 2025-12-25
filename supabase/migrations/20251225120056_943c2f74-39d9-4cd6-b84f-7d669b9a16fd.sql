-- Create quiz_questions table for MCQ format
CREATE TABLE public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL CHECK (correct_answer IN ('a', 'b', 'c', 'd')),
  marks INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on quiz_questions
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

-- Policies for quiz_questions
CREATE POLICY "Placement and admin can manage quiz questions"
ON public.quiz_questions
FOR ALL
USING (has_role(auth.uid(), 'placement'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view quiz questions during active exam"
ON public.quiz_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM assessments a
    WHERE a.id = quiz_questions.assessment_id
    AND a.status = 'active'
    AND EXISTS (
      SELECT 1 FROM applications app
      WHERE app.job_id = a.job_id
      AND app.student_id = auth.uid()
      AND app.status = 'faculty_approved'
    )
  )
);

-- Create quiz_responses table to store student answers
CREATE TABLE public.quiz_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  attempt_id UUID NOT NULL REFERENCES public.exam_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  selected_answer TEXT CHECK (selected_answer IN ('a', 'b', 'c', 'd')),
  is_correct BOOLEAN,
  marks_obtained INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(attempt_id, question_id)
);

-- Enable RLS on quiz_responses
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Policies for quiz_responses
CREATE POLICY "Students can manage their own quiz responses"
ON public.quiz_responses
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM exam_attempts ea
    WHERE ea.id = quiz_responses.attempt_id
    AND ea.student_id = auth.uid()
  )
);

CREATE POLICY "Placement and admin can view all quiz responses"
ON public.quiz_responses
FOR SELECT
USING (has_role(auth.uid(), 'placement'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Add min_questions column to assessments (for validation - minimum 10 questions)
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS min_questions INTEGER DEFAULT 10;

-- Add max_marks and total_marks to assessments
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS total_marks INTEGER DEFAULT 0;

-- Add result_confirmed column to exam_attempts to track when admin confirms result
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS result_confirmed BOOLEAN DEFAULT false;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS result_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS result_confirmed_by UUID;

-- Add round_info column to track next round information
ALTER TABLE public.exam_attempts ADD COLUMN IF NOT EXISTS next_round_info TEXT;