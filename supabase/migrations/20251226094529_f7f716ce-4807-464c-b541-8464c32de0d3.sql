-- Allow students to view their approved mentor's profile
CREATE POLICY "Students can view their approved mentor profile"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM mentor_requests mr
    WHERE mr.student_id = auth.uid()
      AND mr.mentor_id = profiles.user_id
      AND mr.status = 'approved'
  )
);