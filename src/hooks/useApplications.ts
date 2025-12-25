import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Application = Database['public']['Tables']['applications']['Row'];
type ApplicationStatus = Database['public']['Enums']['application_status'];

interface ApplicationWithDetails extends Application {
  jobs?: {
    id: string;
    title: string;
    company_name: string;
    location: string | null;
  } | null;
  student_profile?: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    phone?: string | null;
    department?: string | null;
    cgpa?: number | null;
    skills?: string[] | null;
    resume_url?: string | null;
    roll_number?: string | null;
    year_of_study?: number | null;
    linkedin_url?: string | null;
    github_url?: string | null;
  } | null;
}

export const useApplications = (role: 'student' | 'recruiter' | 'faculty' | 'placement' | 'admin' | null, userId?: string) => {
  const [applications, setApplications] = useState<ApplicationWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchApplications = async () => {
    if (!role) return;
    
    setIsLoading(true);
    try {
      // For faculty, first get their mentees
      let menteeIds: string[] = [];
      if (role === 'faculty' && userId) {
        const { data: menteeRequests } = await supabase
          .from('mentor_requests')
          .select('student_id')
          .eq('mentor_id', userId)
          .eq('status', 'approved');
        
        menteeIds = menteeRequests?.map(r => r.student_id) || [];
        
        if (menteeIds.length === 0) {
          setApplications([]);
          setIsLoading(false);
          return;
        }
      }
      
      // First fetch applications
      // For students, use the secure view that excludes confidential notes
      // For other roles, use the full applications table
      let appData: any[] = [];
      let error: any = null;
      
      if (role === 'student' && userId) {
        // Students use the secure view without confidential notes
        const result = await supabase
          .from('student_applications_view' as any)
          .select('*')
          .eq('student_id', userId)
          .order('created_at', { ascending: false });
        
        appData = result.data || [];
        error = result.error;
        
        // Fetch job details separately for the view
        if (appData.length > 0) {
          const jobIds = [...new Set(appData.map(app => app.job_id))];
          const { data: jobsData } = await supabase
            .from('jobs')
            .select('id, title, company_name, location')
            .in('id', jobIds);
          
          const jobsMap = new Map(jobsData?.map(job => [job.id, job]) || []);
          appData = appData.map(app => ({
            ...app,
            jobs: jobsMap.get(app.job_id) || null
          }));
        }
      } else {
        // Other roles use the full applications table
        let query = supabase
          .from('applications')
          .select(`
            *,
            jobs (id, title, company_name, location)
          `)
          .order('created_at', { ascending: false });
        
        if (role === 'faculty' && menteeIds.length > 0) {
          // Faculty sees pending applications only from their mentees
          query = query.eq('status', 'pending').in('student_id', menteeIds);
        }
        
        const result = await query;
        appData = result.data || [];
        error = result.error;
      }
      
      if (error) throw error;

      // Fetch profile info for each application
      const enrichedApplications = await Promise.all(
        (appData || []).map(async (app) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url, phone')
            .eq('user_id', app.student_id)
            .maybeSingle();

          const { data: studentProfileData } = await supabase
            .from('student_profiles')
            .select('department, cgpa, skills, resume_url, roll_number, year_of_study, linkedin_url, github_url')
            .eq('user_id', app.student_id)
            .maybeSingle();

          return {
            ...app,
            student_profile: profileData ? {
              ...profileData,
              ...studentProfileData,
            } : null,
          };
        })
      );

      setApplications(enrichedApplications);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast({ title: 'Error', description: 'Failed to load applications', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const createApplication = async (jobId: string, studentId: string) => {
    try {
      const { data, error } = await supabase
        .from('applications')
        .insert({ job_id: jobId, student_id: studentId, status: 'pending' })
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          toast({ title: 'Already Applied', description: 'You have already applied to this job.', variant: 'destructive' });
        } else {
          throw error;
        }
        return { data: null, error };
      }
      
      toast({ title: 'Applied!', description: 'Your application has been submitted for faculty approval.' });
      fetchApplications();
      return { data, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { data: null, error };
    }
  };

  const updateApplicationStatus = async (
    id: string, 
    status: ApplicationStatus, 
    facultyId?: string, 
    notes?: string
  ) => {
    try {
      const updates: any = { status };
      
      if (facultyId) {
        updates.faculty_id = facultyId;
        updates.faculty_approved_at = new Date().toISOString();
      }
      if (notes) {
        updates.faculty_notes = notes;
      }
      
      const { data, error } = await supabase
        .from('applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      setApplications(prev => prev.filter(a => a.id !== id));
      
      const statusMessages: Record<string, string> = {
        faculty_approved: 'Application approved! Student can now proceed.',
        faculty_rejected: 'Application rejected.',
        shortlisted: 'Candidate shortlisted!',
        interview: 'Interview scheduled!',
        selected: 'Candidate selected!',
        rejected: 'Application rejected.',
        applied: 'Application submitted.',
      };
      
      toast({ 
        title: 'Updated', 
        description: statusMessages[status] || 'Application status updated.' 
      });
      
      return { data, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { data: null, error };
    }
  };

  useEffect(() => {
    if (role) {
      fetchApplications();
    }
  }, [role, userId]);

  return { applications, isLoading, fetchApplications, createApplication, updateApplicationStatus };
};
