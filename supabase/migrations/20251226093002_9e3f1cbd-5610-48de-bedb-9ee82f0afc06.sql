-- Add policy to allow recruiters to delete their own jobs
CREATE POLICY "Recruiters can delete their own jobs" 
ON public.jobs 
FOR DELETE 
USING (auth.uid() = recruiter_id);