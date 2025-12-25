import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserPlus,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  GraduationCap,
  Mail,
  Building,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useMentor } from '@/hooks/useMentor';
import { supabase } from '@/integrations/supabase/client';

const MAX_STUDENTS_PER_MENTOR = 10;

const StudentMentor: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { studentProfile, isLoading: profileLoading } = useProfile(user?.id);
  const {
    mentorRequest,
    availableMentors,
    isLoading: mentorLoading,
    fetchAvailableMentors,
    sendMentorRequest,
    cancelMentorRequest,
  } = useMentor(user?.id, 'student');

  const [mentorProfile, setMentorProfile] = useState<{
    full_name: string;
    email: string;
    designation: string | null;
  } | null>(null);
  const [isLoadingMentor, setIsLoadingMentor] = useState(false);

  // Fetch available mentors when department is known
  useEffect(() => {
    if (studentProfile?.department) {
      fetchAvailableMentors(studentProfile.department);
    }
  }, [studentProfile?.department]);

  // Fetch mentor profile if request is approved
  useEffect(() => {
    const fetchMentorProfile = async () => {
      if (mentorRequest?.status === 'approved' && mentorRequest.mentor_id) {
        setIsLoadingMentor(true);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', mentorRequest.mentor_id)
          .single();

        const { data: facultyProfile } = await supabase
          .from('faculty_profiles')
          .select('designation')
          .eq('user_id', mentorRequest.mentor_id)
          .single();

        if (profile) {
          setMentorProfile({
            full_name: profile.full_name,
            email: profile.email,
            designation: facultyProfile?.designation || null,
          });
        }
        setIsLoadingMentor(false);
      }
    };

    fetchMentorProfile();
  }, [mentorRequest]);

  const handleSendRequest = async (mentorId: string) => {
    if (!studentProfile?.department) return;
    await sendMentorRequest(mentorId, studentProfile.department);
    await fetchAvailableMentors(studentProfile.department);
  };

  const handleCancelRequest = async () => {
    if (!mentorRequest) return;
    await cancelMentorRequest(mentorRequest.id);
    if (studentProfile?.department) {
      await fetchAvailableMentors(studentProfile.department);
    }
  };

  if (profileLoading || mentorLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Check if student has a department set
  if (!studentProfile?.department) {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-heading font-bold text-foreground">Mentor Selection</h1>
          <p className="text-muted-foreground mt-1">Choose a mentor from your department</p>
        </motion.div>

        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-8 w-8 text-warning" />
              <div>
                <h3 className="font-semibold">Department Not Set</h3>
                <p className="text-sm text-muted-foreground">
                  Please update your profile with your department before selecting a mentor.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If student has an approved mentor
  if (mentorRequest?.status === 'approved') {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-heading font-bold text-foreground">Your Mentor</h1>
          <p className="text-muted-foreground mt-1">Your assigned faculty mentor</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="elevated" className="border-success/30 bg-success/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <Badge variant="default" className="bg-success">
                  Mentor Assigned
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingMentor ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : mentorProfile ? (
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <GraduationCap className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">{mentorProfile.full_name}</h3>
                    <p className="text-muted-foreground">{mentorProfile.designation || 'Faculty'}</p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      {mentorProfile.email}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Building className="w-4 h-4" />
                      {mentorRequest.department}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">Unable to load mentor details</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              You now have access to apply for jobs and submit applications. Your mentor will
              review and approve your job applications before they are sent to recruiters.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // If student has a pending request
  if (mentorRequest?.status === 'pending') {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-heading font-bold text-foreground">Mentor Selection</h1>
          <p className="text-muted-foreground mt-1">Choose a mentor from your department</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="elevated" className="border-warning/30 bg-warning/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                <Badge variant="default" className="bg-warning text-warning-foreground">
                  Request Pending
                </Badge>
              </div>
              <CardTitle>Awaiting Mentor Approval</CardTitle>
              <CardDescription>
                Your mentor request is pending approval. You will be notified once the mentor responds.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleCancelRequest}>
                <XCircle className="w-4 h-4 mr-2" />
                Cancel Request
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // If student has a rejected request
  if (mentorRequest?.status === 'rejected') {
    return (
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-heading font-bold text-foreground">Mentor Selection</h1>
          <p className="text-muted-foreground mt-1">Choose a mentor from your department</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="elevated" className="border-destructive/30 bg-destructive/5">
            <CardHeader>
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <Badge variant="destructive">Request Rejected</Badge>
              </div>
              <CardTitle>Mentor Request Declined</CardTitle>
              <CardDescription>
                Your previous mentor request was declined. Please select another mentor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleCancelRequest}>
                Select New Mentor
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // No request - show available mentors
  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-heading font-bold text-foreground">Mentor Selection</h1>
        <p className="text-muted-foreground mt-1">
          Choose a mentor from your department ({studentProfile.department})
        </p>
      </motion.div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-primary" />
            <p className="text-sm">
              You must select a mentor before you can apply for jobs. Your mentor will guide you
              through the placement process and approve your applications.
            </p>
          </div>
        </CardContent>
      </Card>

      {availableMentors.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="font-semibold">No Mentors Available</h3>
            <p className="text-sm text-muted-foreground mt-1">
              There are no approved mentors in your department ({studentProfile.department}) yet.
              Please check back later.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableMentors.map((mentor, index) => {
            const isFull = mentor.student_count >= MAX_STUDENTS_PER_MENTOR;
            
            return (
              <motion.div
                key={mentor.user_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="interactive" className={isFull ? 'opacity-60' : ''}>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-3">
                        <GraduationCap className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="font-semibold">{mentor.full_name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {mentor.designation || 'Faculty'}
                      </p>
                      {mentor.employee_id && (
                        <p className="text-xs text-muted-foreground">ID: {mentor.employee_id}</p>
                      )}
                      <div className="flex items-center justify-center gap-2 mt-2">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{mentor.email}</span>
                      </div>
                      
                      <div className="mt-4 p-2 rounded-lg bg-secondary">
                        <div className="flex items-center justify-center gap-2">
                          <Users className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            {mentor.student_count} / {MAX_STUDENTS_PER_MENTOR} Students
                          </span>
                        </div>
                        {isFull && (
                          <p className="text-xs text-destructive mt-1">Mentor is at full capacity</p>
                        )}
                      </div>

                      <Button
                        className="w-full mt-4"
                        disabled={isFull}
                        onClick={() => handleSendRequest(mentor.user_id)}
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        {isFull ? 'Not Available' : 'Send Request'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentMentor;
