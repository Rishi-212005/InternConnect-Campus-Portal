-- Add policy for recruiters to update interviews for their jobs
CREATE POLICY "Recruiters can update interviews for their jobs" 
ON public.interview_schedules 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM applications a
  JOIN jobs j ON j.id = a.job_id
  WHERE a.id = interview_schedules.application_id 
  AND j.recruiter_id = auth.uid()
));