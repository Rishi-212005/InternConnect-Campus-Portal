import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Job = Database['public']['Tables']['jobs']['Row'];
type JobInsert = Database['public']['Tables']['jobs']['Insert'];
type JobUpdate = Database['public']['Tables']['jobs']['Update'];
type JobStatus = Database['public']['Enums']['job_status'];

export const useJobs = (filterStatus?: JobStatus) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchJobs = async () => {
    setIsLoading(true);
    try {
      let query = supabase.from('jobs').select('*').order('created_at', { ascending: false });
      
      if (filterStatus) {
        query = query.eq('status', filterStatus);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      setJobs(data || []);
    } catch (error: any) {
      console.error('Error fetching jobs:', error);
      toast({ title: 'Error', description: 'Failed to load jobs', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const createJob = async (job: JobInsert) => {
    try {
      const { data, error } = await supabase.from('jobs').insert(job).select().single();
      if (error) throw error;
      setJobs(prev => [data, ...prev]);
      toast({ title: 'Success', description: 'Job posted successfully!' });
      return { data, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { data: null, error };
    }
  };

  const updateJob = async (id: string, updates: JobUpdate) => {
    try {
      const { data, error } = await supabase.from('jobs').update(updates).eq('id', id).select().single();
      if (error) throw error;
      setJobs(prev => prev.map(j => j.id === id ? data : j));
      toast({ title: 'Success', description: 'Job updated successfully!' });
      return { data, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { data: null, error };
    }
  };

  const verifyJob = async (id: string, userId: string, approve: boolean) => {
    const status: JobStatus = approve ? 'active' : 'closed';
    try {
      const { data, error } = await supabase
        .from('jobs')
        .update({ 
          status, 
          verified_by: userId, 
          verified_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      setJobs(prev => prev.map(j => j.id === id ? data : j));
      toast({ title: 'Success', description: approve ? 'Job verified and active!' : 'Job rejected' });
      return { data, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { data: null, error };
    }
  };

  const deleteJob = async (id: string) => {
    try {
      const { error } = await supabase.from('jobs').delete().eq('id', id);
      if (error) throw error;
      setJobs(prev => prev.filter(j => j.id !== id));
      toast({ title: 'Success', description: 'Job deleted successfully!' });
      return { error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { error };
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [filterStatus]);

  return { jobs, isLoading, fetchJobs, createJob, updateJob, verifyJob, deleteJob };
};
