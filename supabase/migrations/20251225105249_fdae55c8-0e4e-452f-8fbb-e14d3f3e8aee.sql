-- Fix 1: Remove overly permissive profiles policy that exposes PII to all users
DROP POLICY IF EXISTS "All authenticated users can view profiles" ON public.profiles;

-- Create restricted policy - only relevant roles can view other profiles
CREATE POLICY "Authorized roles can view profiles"
ON public.profiles
FOR SELECT
USING (
  auth.uid() = user_id OR
  has_role(auth.uid(), 'faculty'::app_role) OR 
  has_role(auth.uid(), 'placement'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'recruiter'::app_role)
);

-- Fix 2: Remove overly permissive interview_schedules policy
DROP POLICY IF EXISTS "Users can view relevant interviews" ON public.interview_schedules;

-- Fix 3: Create a secure view for student applications that excludes confidential notes
-- This ensures students cannot see recruiter_notes or faculty_notes
CREATE OR REPLACE VIEW public.student_applications_view
WITH (security_invoker = true)
AS
SELECT 
  id,
  job_id,
  student_id,
  status,
  match_score,
  created_at,
  updated_at,
  faculty_approved_at,
  faculty_id
  -- Intentionally excludes: recruiter_notes, faculty_notes
FROM public.applications;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.student_applications_view TO authenticated;