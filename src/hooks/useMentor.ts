import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MentorRequest {
  id: string;
  student_id: string;
  mentor_id: string;
  department: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

interface FacultyWithProfile {
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  employee_id: string | null;
  is_approved: boolean | null;
  student_count: number;
}

interface StudentWithProfile {
  user_id: string;
  full_name: string;
  email: string;
  department: string | null;
  roll_number: string | null;
  cgpa: number | null;
  request_id: string;
  request_status: string;
  created_at: string;
}

export const useMentor = (userId?: string, userRole?: string) => {
  const [mentorRequest, setMentorRequest] = useState<MentorRequest | null>(null);
  const [availableMentors, setAvailableMentors] = useState<FacultyWithProfile[]>([]);
  const [studentRequests, setStudentRequests] = useState<StudentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch mentor request for student
  const fetchMentorRequest = async () => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('mentor_requests')
        .select('*')
        .eq('student_id', userId)
        .maybeSingle();

      if (error) throw error;
      setMentorRequest(data as MentorRequest | null);
    } catch (error) {
      console.error('Error fetching mentor request:', error);
    }
  };

  // Fetch available mentors for student's department
  const fetchAvailableMentors = async (department: string) => {
    try {
      // Step 1: Get approved faculty in the same department
      const { data: facultyProfiles, error: facultyError } = await supabase
        .from('faculty_profiles')
        .select('user_id, department, designation, employee_id, is_approved')
        .eq('department', department)
        .eq('is_approved', true);

      if (facultyError) {
        console.error('Faculty fetch error:', facultyError);
        setAvailableMentors([]);
        return;
      }

      if (!facultyProfiles || facultyProfiles.length === 0) {
        setAvailableMentors([]);
        return;
      }

      const userIds = facultyProfiles.map(f => f.user_id);

      // Step 2: Fetch profiles for these faculty members (RLS now allows this)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, avatar_url')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Profiles fetch error:', profilesError);
      }

      // Step 3: Get student count for each mentor using the RPC function
      const { data: mentorCounts, error: countError } = await supabase
        .rpc('get_mentor_student_counts', { mentor_ids: userIds });

      if (countError) {
        console.error('Mentor count fetch error:', countError);
      }

      // Build count map from RPC result
      const countMap: Record<string, number> = {};
      if (mentorCounts && Array.isArray(mentorCounts)) {
        mentorCounts.forEach((m: { mentor_id: string; student_count: number }) => {
          countMap[m.mentor_id] = m.student_count;
        });
      }

      // Step 4: Combine all data
      const mentorsWithDetails: FacultyWithProfile[] = facultyProfiles.map(faculty => {
        const profile = profiles?.find(p => p.user_id === faculty.user_id);
        return {
          user_id: faculty.user_id,
          full_name: profile?.full_name || 'Unknown Faculty',
          email: profile?.email || '',
          department: faculty.department,
          designation: faculty.designation,
          employee_id: faculty.employee_id,
          is_approved: faculty.is_approved,
          student_count: countMap[faculty.user_id] || 0,
        };
      });

      console.log('Mentors loaded:', mentorsWithDetails);
      setAvailableMentors(mentorsWithDetails);
    } catch (error) {
      console.error('Error fetching available mentors:', error);
      setAvailableMentors([]);
    }
  };

  // Fetch student requests for faculty
  const fetchStudentRequests = async () => {
    if (!userId || userRole !== 'faculty') return;

    try {
      const { data: requests, error } = await supabase
        .from('mentor_requests')
        .select('*')
        .eq('mentor_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!requests || requests.length === 0) {
        setStudentRequests([]);
        return;
      }

      // Get student profile info
      const studentIds = requests.map(r => r.student_id);
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      const { data: studentProfiles } = await supabase
        .from('student_profiles')
        .select('user_id, department, roll_number, cgpa')
        .in('user_id', studentIds);

      const studentsWithDetails: StudentWithProfile[] = requests.map(request => {
        const profile = profiles?.find(p => p.user_id === request.student_id);
        const studentProfile = studentProfiles?.find(s => s.user_id === request.student_id);
        
        return {
          user_id: request.student_id,
          full_name: profile?.full_name || 'Unknown',
          email: profile?.email || '',
          department: studentProfile?.department || null,
          roll_number: studentProfile?.roll_number || null,
          cgpa: studentProfile?.cgpa || null,
          request_id: request.id,
          request_status: request.status,
          created_at: request.created_at,
        };
      });

      setStudentRequests(studentsWithDetails);
    } catch (error) {
      console.error('Error fetching student requests:', error);
    }
  };

  // Send mentor request (or update existing rejected request)
  const sendMentorRequest = async (mentorId: string, department: string) => {
    if (!userId) return { error: 'Not authenticated' };

    try {
      // First check if there's an existing rejected request
      const { data: existingRequest } = await supabase
        .from('mentor_requests')
        .select('id, status')
        .eq('student_id', userId)
        .maybeSingle();

      let data;
      let error;

      if (existingRequest && existingRequest.status === 'rejected') {
        // Update the existing rejected request with new mentor
        const result = await supabase
          .from('mentor_requests')
          .update({
            mentor_id: mentorId,
            department,
            status: 'pending',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingRequest.id)
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else if (!existingRequest) {
        // No existing request, create a new one
        const result = await supabase
          .from('mentor_requests')
          .insert({
            student_id: userId,
            mentor_id: mentorId,
            department,
            status: 'pending',
          })
          .select()
          .single();
        
        data = result.data;
        error = result.error;
      } else {
        // Existing request is pending or approved - shouldn't send new request
        throw new Error('You already have an active mentor request');
      }

      if (error) throw error;

      setMentorRequest(data as MentorRequest);
      toast({
        title: 'Request Sent',
        description: 'Your mentor request has been sent successfully.',
      });

      return { data, error: null };
    } catch (error: any) {
      console.error('Error sending mentor request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to send mentor request',
        variant: 'destructive',
      });
      return { data: null, error };
    }
  };

  // Cancel mentor request
  const cancelMentorRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('mentor_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;

      setMentorRequest(null);
      toast({
        title: 'Request Cancelled',
        description: 'Your mentor request has been cancelled.',
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error cancelling mentor request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to cancel request',
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Accept/Reject student request (for faculty)
  const updateRequestStatus = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('mentor_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setStudentRequests(prev => 
        prev.map(req => 
          req.request_id === requestId 
            ? { ...req, request_status: status }
            : req
        )
      );

      toast({
        title: status === 'approved' ? 'Request Approved' : 'Request Rejected',
        description: `Student request has been ${status}.`,
      });

      return { error: null };
    } catch (error: any) {
      console.error('Error updating request status:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update request',
        variant: 'destructive',
      });
      return { error };
    }
  };

  // Get mentor student count
  const getMentorStudentCount = async (mentorId: string) => {
    const { data, error } = await supabase
      .from('mentor_requests')
      .select('id')
      .eq('mentor_id', mentorId)
      .eq('status', 'approved');

    if (error) return 0;
    return data?.length || 0;
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      if (userRole === 'student') {
        await fetchMentorRequest();
      } else if (userRole === 'faculty') {
        await fetchStudentRequests();
      }
      
      setIsLoading(false);
    };

    loadData();
  }, [userId, userRole]);

  return {
    mentorRequest,
    availableMentors,
    studentRequests,
    isLoading,
    fetchMentorRequest,
    fetchAvailableMentors,
    fetchStudentRequests,
    sendMentorRequest,
    cancelMentorRequest,
    updateRequestStatus,
    getMentorStudentCount,
  };
};
