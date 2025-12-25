import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Clock, 
  Video, 
  Loader2,
  Plus,
  User,
  Briefcase,
  Building2,
  CheckCircle,
  XCircle,
  Link2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Interview {
  id: string;
  application_id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_link: string | null;
  notes: string | null;
  interview_status: string | null;
  application: {
    id: string;
    student_id: string;
    job_id: string;
    status: string;
    student_profile?: {
      full_name: string;
      email: string;
    };
    job?: {
      title: string;
      company_name: string;
    };
  } | null;
}

interface EligibleApplication {
  id: string;
  student_id: string;
  job_id: string;
  status: string;
  student_profile?: {
    full_name: string;
    email: string;
  };
  job?: {
    title: string;
    company_name: string;
  };
}

const PlacementInterviews: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [eligibleApplications, setEligibleApplications] = useState<EligibleApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Schedule form
  const [selectedApplication, setSelectedApplication] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [meetingLink, setMeetingLink] = useState('');

  const fetchInterviews = async () => {
    try {
      const { data: interviewData, error } = await supabase
        .from('interview_schedules')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Fetch related application data
      const interviewsWithDetails = await Promise.all(
        (interviewData || []).map(async (interview) => {
          const { data: appData } = await supabase
            .from('applications')
            .select('id, student_id, job_id, status')
            .eq('id', interview.application_id)
            .single();

          if (!appData) return { ...interview, application: null };

          // Get student profile
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', appData.student_id)
            .single();

          // Get job details
          const { data: jobData } = await supabase
            .from('jobs')
            .select('title, company_name')
            .eq('id', appData.job_id)
            .single();

          return {
            ...interview,
            application: {
              ...appData,
              student_profile: profileData,
              job: jobData,
            },
          };
        })
      );

      setInterviews(interviewsWithDetails);
    } catch (error) {
      console.error('Error fetching interviews:', error);
    }
  };

  const fetchEligibleApplications = async () => {
    try {
      // Fetch applications that are shortlisted or faculty_approved
      const { data: appData, error } = await supabase
        .from('applications')
        .select('id, student_id, job_id, status')
        .in('status', ['shortlisted', 'faculty_approved', 'applied']);

      if (error) throw error;

      // Filter out applications that already have interviews
      const existingInterviewAppIds = interviews.map(i => i.application_id);
      const eligibleApps = (appData || []).filter(app => !existingInterviewAppIds.includes(app.id));

      // Fetch details for eligible apps
      const appsWithDetails = await Promise.all(
        eligibleApps.map(async (app) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', app.student_id)
            .single();

          const { data: jobData } = await supabase
            .from('jobs')
            .select('title, company_name')
            .eq('id', app.job_id)
            .single();

          return {
            ...app,
            student_profile: profileData,
            job: jobData,
          };
        })
      );

      setEligibleApplications(appsWithDetails);
    } catch (error) {
      console.error('Error fetching eligible applications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  useEffect(() => {
    if (interviews.length >= 0) {
      fetchEligibleApplications();
    }
  }, [interviews]);

  const handleScheduleInterview = async () => {
    if (!selectedApplication || !scheduleDate || !scheduleTime || !user) {
      toast({
        title: 'Missing information',
        description: 'Please fill all required fields.',
        variant: 'destructive',
      });
      return;
    }

    setProcessingId('scheduling');

    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

      const { error: insertError } = await supabase
        .from('interview_schedules')
        .insert({
          application_id: selectedApplication,
          scheduled_at: scheduledAt,
          duration_minutes: parseInt(duration),
          meeting_link: meetingLink || null,
          scheduled_by: user.id,
          interview_status: 'scheduled',
        });

      if (insertError) throw insertError;

      // Update application status to interview
      await supabase
        .from('applications')
        .update({ status: 'interview' })
        .eq('id', selectedApplication);

      // Get application details for email
      const app = eligibleApplications.find(a => a.id === selectedApplication);
      if (app?.student_profile?.email) {
        await supabase.functions.invoke('send-notification', {
          body: {
            type: 'interview_invite',
            recipientEmail: app.student_profile.email,
            recipientName: app.student_profile.full_name || 'Student',
            data: {
              jobTitle: app.job?.title || 'Position',
              companyName: app.job?.company_name || 'Company',
              interviewDate: format(new Date(scheduledAt), 'MMMM dd, yyyy'),
              interviewTime: format(new Date(scheduledAt), 'h:mm a'),
              meetingLink: meetingLink || undefined,
            },
          },
        });
      }

      toast({
        title: 'Interview Scheduled',
        description: 'The interview has been scheduled and the student has been notified.',
      });

      setShowScheduleDialog(false);
      resetForm();
      fetchInterviews();
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to schedule interview.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateStatus = async (interviewId: string, status: string) => {
    setProcessingId(interviewId);

    try {
      const { error } = await supabase
        .from('interview_schedules')
        .update({ interview_status: status })
        .eq('id', interviewId);

      if (error) throw error;

      // If completed, update application status
      if (status === 'completed') {
        const interview = interviews.find(i => i.id === interviewId);
        if (interview) {
          await supabase
            .from('applications')
            .update({ status: 'selected' })
            .eq('id', interview.application_id);

          // Send email notification
          if (interview.application?.student_profile?.email) {
            await supabase.functions.invoke('send-notification', {
              body: {
                type: 'application_status',
                recipientEmail: interview.application.student_profile.email,
                recipientName: interview.application.student_profile.full_name || 'Student',
                data: {
                  jobTitle: interview.application.job?.title || 'Position',
                  companyName: interview.application.job?.company_name || 'Company',
                  status: 'selected',
                  message: 'Congratulations! You have been selected for this position.',
                },
              },
            });
          }
        }
      }

      toast({
        title: 'Status Updated',
        description: `Interview status updated to ${status}.`,
      });

      fetchInterviews();
    } catch (error) {
      console.error('Error updating interview status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update interview status.',
        variant: 'destructive',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const resetForm = () => {
    setSelectedApplication('');
    setScheduleDate('');
    setScheduleTime('');
    setDuration('60');
    setMeetingLink('');
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      case 'rescheduled':
        return <Badge className="bg-yellow-100 text-yellow-700">Rescheduled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Unknown</Badge>;
    }
  };

  const upcomingInterviews = interviews.filter(i => 
    i.interview_status === 'scheduled' && new Date(i.scheduled_at) >= new Date()
  );
  const pastInterviews = interviews.filter(i => 
    i.interview_status !== 'scheduled' || new Date(i.scheduled_at) < new Date()
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Interview Scheduling</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage interviews for students</p>
        </div>
        <Button onClick={() => setShowScheduleDialog(true)} className="gradient-primary">
          <Plus className="w-4 h-4 mr-2" />
          Schedule Interview
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Calendar className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{upcomingInterviews.length}</p>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {interviews.filter(i => i.interview_status === 'completed').length}
            </p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <User className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{eligibleApplications.length}</p>
            <p className="text-sm text-muted-foreground">Eligible Students</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Video className="w-8 h-8 text-purple-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{interviews.length}</p>
            <p className="text-sm text-muted-foreground">Total Interviews</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Upcoming Interviews */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Upcoming Interviews
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {upcomingInterviews.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">No upcoming interviews scheduled</p>
              </div>
            ) : (
              upcomingInterviews.map((interview, index) => (
                <motion.div
                  key={interview.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * index }}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                      {interview.application?.student_profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {interview.application?.student_profile?.full_name || 'Unknown Student'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Briefcase className="w-3 h-3" />
                        {interview.application?.job?.title} at {interview.application?.job?.company_name}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(interview.scheduled_at), 'MMM dd, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(interview.scheduled_at), 'h:mm a')}
                        </span>
                        {interview.meeting_link && (
                          <a 
                            href={interview.meeting_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary hover:underline"
                          >
                            <Link2 className="w-3 h-3" />
                            Join Meeting
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(interview.interview_status)}
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="accent"
                        disabled={processingId === interview.id}
                        onClick={() => handleUpdateStatus(interview.id, 'completed')}
                      >
                        {processingId === interview.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Mark Done
                          </>
                        )}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="text-red-500"
                        disabled={processingId === interview.id}
                        onClick={() => handleUpdateStatus(interview.id, 'cancelled')}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Past Interviews */}
      {pastInterviews.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Past Interviews
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {pastInterviews.map((interview, index) => (
                <div
                  key={interview.id}
                  className="flex items-center justify-between p-4 bg-muted/20 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold">
                      {interview.application?.student_profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {interview.application?.student_profile?.full_name || 'Unknown Student'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {interview.application?.job?.title} • {format(new Date(interview.scheduled_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(interview.interview_status)}
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule New Interview</DialogTitle>
            <DialogDescription>
              Select a student and set the interview details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Student Application</Label>
              <Select value={selectedApplication} onValueChange={setSelectedApplication}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a student..." />
                </SelectTrigger>
                <SelectContent>
                  {eligibleApplications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.student_profile?.full_name || 'Unknown'} - {app.job?.title} ({app.job?.company_name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input 
                  type="time" 
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meeting Link (optional)</Label>
              <Input 
                type="url" 
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancel
              </Button>
              <Button 
                className="gradient-primary"
                onClick={handleScheduleInterview}
                disabled={processingId === 'scheduling'}
              >
                {processingId === 'scheduling' ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scheduling...</>
                ) : (
                  <>
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Interview
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlacementInterviews;
