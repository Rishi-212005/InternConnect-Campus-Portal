-- Return counts of approved students per mentor without exposing student identities
CREATE OR REPLACE FUNCTION public.get_mentor_student_counts(mentor_ids uuid[])
RETURNS TABLE(mentor_id uuid, student_count integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT mr.mentor_id, COUNT(*)::int AS student_count
  FROM public.mentor_requests mr
  WHERE mr.status = 'approved'
    AND mr.mentor_id = ANY(mentor_ids)
  GROUP BY mr.mentor_id;
$$;