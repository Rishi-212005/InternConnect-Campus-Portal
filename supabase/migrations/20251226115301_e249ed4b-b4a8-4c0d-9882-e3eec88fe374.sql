-- Allow students to view faculty profiles (for mentor selection)
CREATE POLICY "Students can view faculty profiles for mentor selection" 
ON public.profiles 
FOR SELECT 
USING (
  has_role(auth.uid(), 'student'::app_role) 
  AND EXISTS (
    SELECT 1 FROM faculty_profiles fp 
    WHERE fp.user_id = profiles.user_id 
    AND fp.is_approved = true
  )
);