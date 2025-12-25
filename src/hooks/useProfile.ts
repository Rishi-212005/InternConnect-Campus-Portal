import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type StudentProfile = Database['public']['Tables']['student_profiles']['Row'];
type RecruiterProfile = Database['public']['Tables']['recruiter_profiles']['Row'];
type FacultyProfile = Database['public']['Tables']['faculty_profiles']['Row'];

export const useProfile = (userId: string | undefined) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [recruiterProfile, setRecruiterProfile] = useState<RecruiterProfile | null>(null);
  const [facultyProfile, setFacultyProfile] = useState<FacultyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProfile = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      // Fetch base profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      setProfile(profileData);

      // Fetch role-specific profiles
      const { data: studentData } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setStudentProfile(studentData);

      const { data: recruiterData } = await supabase
        .from('recruiter_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setRecruiterProfile(recruiterData);

      const { data: facultyData } = await supabase
        .from('faculty_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      setFacultyProfile(facultyData);

    } catch (error: any) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!userId) return { error: new Error('No user ID') };
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      setProfile(data);
      toast({ title: 'Success', description: 'Profile updated successfully!' });
      return { data, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { data: null, error };
    }
  };

  const updateStudentProfile = async (updates: Partial<StudentProfile>) => {
    if (!userId) return { error: new Error('No user ID') };
    
    try {
      const { data, error } = await supabase
        .from('student_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      setStudentProfile(data);
      toast({ title: 'Success', description: 'Student profile updated!' });
      return { data, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { data: null, error };
    }
  };

  const updateRecruiterProfile = async (updates: Partial<RecruiterProfile>) => {
    if (!userId) return { error: new Error('No user ID') };
    
    try {
      const { data, error } = await supabase
        .from('recruiter_profiles')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();
      
      if (error) throw error;
      setRecruiterProfile(data);
      toast({ title: 'Success', description: 'Company profile updated!' });
      return { data, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return { data: null, error };
    }
  };

  const uploadAvatar = async (file: File) => {
    if (!userId) return { error: new Error('No user ID') };
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/avatar.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);
      
      // Update profile with new avatar URL
      await updateProfile({ avatar_url: publicUrl });
      
      return { url: publicUrl, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to upload avatar', variant: 'destructive' });
      return { url: null, error };
    }
  };

  const uploadResume = async (file: File) => {
    if (!userId) return { error: new Error('No user ID') };
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${userId}/resume.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath);
      
      // Update student profile with new resume URL
      await updateStudentProfile({ resume_url: publicUrl });
      
      toast({ title: 'Success', description: 'Resume uploaded successfully!' });
      return { url: publicUrl, error: null };
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to upload resume', variant: 'destructive' });
      return { url: null, error };
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [userId]);

  return {
    profile,
    studentProfile,
    recruiterProfile,
    facultyProfile,
    isLoading,
    fetchProfile,
    updateProfile,
    updateStudentProfile,
    updateRecruiterProfile,
    uploadAvatar,
    uploadResume,
  };
};
