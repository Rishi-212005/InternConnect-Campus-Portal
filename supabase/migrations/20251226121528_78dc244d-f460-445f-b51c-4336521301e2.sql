-- Allow students to update their own rejected mentor request to resend to a new mentor
CREATE POLICY "Students can update rejected mentor requests"
ON public.mentor_requests
FOR UPDATE
TO authenticated
USING (auth.uid() = student_id AND status = 'rejected')
WITH CHECK (auth.uid() = student_id);
