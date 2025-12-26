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
  User,
  Plus,
  Loader2,
  Mail,
  Briefcase,
  Link as LinkIcon,
  Check,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format, isToday, isFuture, parseISO } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface Interview {
  id: string;
  scheduled_at: string;
  duration_minutes: number | null;
  meeting_link: string | null;
  notes: string | null;
  interview_status: string | null;
  application: {
    id: string;
    student_id: string;
    student_name: string;
    student_email: string;
    job_title: string;
  } | null;
}

interface ShortlistedCandidate {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  job_title: string;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Scheduled', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Selected', color: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

const RecruiterInterviews: React.FC = () => {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [shortlistedCandidates, setShortlistedCandidates] = useState<ShortlistedCandidate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    application_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 60,
    meeting_link: '',
    notes: '',
  });

  const fetchInterviews = async () => {
    if (!user) return;
    setIsLoading(true);

    try {
      // Get recruiter's jobs
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('recruiter_id', user.id);

      if (!jobs || jobs.length === 0) {
        setInterviews([]);
        setIsLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      // Get applications for these jobs
      const { data: applications } = await supabase
        .from('applications')
        .select('id')
        .in('job_id', jobIds);

      if (!applications || applications.length === 0) {
        setInterviews([]);
        setIsLoading(false);
        return;
      }

      const appIds = applications.map(a => a.id);

      // Get interviews for these applications
      const { data: interviewData, error } = await supabase
        .from('interview_schedules')
        .select('*')
        .in('application_id', appIds)
        .order('scheduled_at', { ascending: true });

      if (error) throw error;

      // Enrich with application details
      const enrichedInterviews = await Promise.all(
        (interviewData || []).map(async (interview) => {
          const { data: app } = await supabase
            .from('applications')
            .select('id, student_id, jobs (title)')
            .eq('id', interview.application_id)
            .single();

          let studentInfo = null;
          if (app) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', app.student_id)
              .maybeSingle();
            studentInfo = profile;
          }

          return {
            ...interview,
            application: app ? {
              id: app.id,
              student_id: app.student_id,
              student_name: studentInfo?.full_name || 'Unknown',
              student_email: studentInfo?.email || '',
              job_title: (app.jobs as any)?.title || 'Unknown Position',
            } : null,
          };
        })
      );

      setInterviews(enrichedInterviews);
    } catch (error: any) {
      console.error('Error fetching interviews:', error);
      toast({ title: 'Error', description: 'Failed to load interviews', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchShortlistedCandidates = async () => {
    if (!user) return;

    try {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('recruiter_id', user.id);

      if (!jobs || jobs.length === 0) return;

      const jobIds = jobs.map(j => j.id);

      const { data: applications } = await supabase
        .from('applications')
        .select('id, student_id, jobs (title)')
        .in('job_id', jobIds)
        .eq('status', 'shortlisted');

      if (!applications) return;

      const candidates = await Promise.all(
        applications.map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email')
            .eq('user_id', app.student_id)
            .maybeSingle();

          return {
            id: app.id,
            student_id: app.student_id,
            student_name: profile?.full_name || 'Unknown',
            student_email: profile?.email || '',
            job_title: (app.jobs as any)?.title || 'Unknown',
          };
        })
      );

      setShortlistedCandidates(candidates);
    } catch (error) {
      console.error('Error fetching candidates:', error);
    }
  };

  useEffect(() => {
    fetchInterviews();
    fetchShortlistedCandidates();
  }, [user]);

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.application_id || !formData.scheduled_date || !formData.scheduled_time) return;

    setIsSubmitting(true);

    try {
      const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`).toISOString();

      const { error } = await supabase
        .from('interview_schedules')
        .insert({
          application_id: formData.application_id,
          scheduled_at: scheduledAt,
          duration_minutes: formData.duration_minutes,
          meeting_link: formData.meeting_link || null,
          notes: formData.notes || null,
        });

      if (error) throw error;

      // Update application status to 'interview'
      await supabase
        .from('applications')
        .update({ status: 'interview' })
        .eq('id', formData.application_id);

      toast({ title: 'Success', description: 'Interview scheduled successfully!' });
      setShowScheduleDialog(false);
      setFormData({
        application_id: '',
        scheduled_date: '',
        scheduled_time: '',
        duration_minutes: 60,
        meeting_link: '',
        notes: '',
      });
      fetchInterviews();
      fetchShortlistedCandidates();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInterviewDecision = async (interview: Interview, decision: 'selected' | 'rejected') => {
    if (!interview.application) return;

    try {
      // Immediately remove from pending list for dynamic UI
      setInterviews(prev => prev.filter(i => i.id !== interview.id));

      // Update interview status
      const interviewStatus = decision === 'selected' ? 'completed' : 'cancelled';
      const { error: interviewError } = await supabase
        .from('interview_schedules')
        .update({ interview_status: interviewStatus })
        .eq('id', interview.id);

      if (interviewError) {
        console.error('Interview update error:', interviewError);
        throw interviewError;
      }

      // Update application status
      const newStatus = decision === 'selected' ? 'selected' : 'rejected';
      const { error: appError } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', interview.application.id);

      if (appError) {
        console.error('Application update error:', appError);
        throw appError;
      }

      // Get recruiter's company name
      const { data: recruiterProfile } = await supabase
        .from('recruiter_profiles')
        .select('company_name')
        .eq('user_id', user?.id)
        .single();

      // Send notification to student (in-app)
      await supabase
        .from('notifications')
        .insert({
          user_id: interview.application.student_id,
          title: decision === 'selected' ? 'Congratulations! You are Selected' : 'Interview Update',
          message: decision === 'selected' 
            ? `You have been selected for the position of ${interview.application.job_title}! The recruiter will contact you soon.`
            : `Unfortunately, you were not selected for the position of ${interview.application.job_title}. Keep trying!`,
          link: '/student/applications'
        });

      // Send email to student
      await supabase.functions.invoke('send-notification', {
        body: {
          type: decision === 'selected' ? 'candidate_selected' : 'candidate_rejected',
          recipientEmail: interview.application.student_email,
          recipientName: interview.application.student_name,
          data: {
            jobTitle: interview.application.job_title,
            companyName: recruiterProfile?.company_name || 'the company',
          },
        },
      });

      // Get student's mentor
      const { data: mentorRequest } = await supabase
        .from('mentor_requests')
        .select('mentor_id')
        .eq('student_id', interview.application.student_id)
        .eq('status', 'approved')
        .maybeSingle();

      // Notify mentor
      if (mentorRequest?.mentor_id) {
        await supabase
          .from('notifications')
          .insert({
            user_id: mentorRequest.mentor_id,
            title: decision === 'selected' ? 'Mentee Selected!' : 'Mentee Interview Update',
            message: decision === 'selected' 
              ? `Your mentee has been selected for the position of ${interview.application.job_title}!`
              : `Your mentee was not selected for the position of ${interview.application.job_title}.`,
            link: '/faculty/students'
          });
      }

      // Notify all placement admins
      const { data: placementAdmins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'placement');

      if (placementAdmins && placementAdmins.length > 0) {
        const placementNotifications = placementAdmins.map(admin => ({
          user_id: admin.user_id,
          title: decision === 'selected' ? 'Candidate Selected' : 'Candidate Rejected',
          message: decision === 'selected' 
            ? `A candidate has been selected for ${interview.application?.job_title}.`
            : `A candidate was rejected for ${interview.application?.job_title}.`,
          link: decision === 'selected' ? '/placement/placed' : '/placement/interviews'
        }));
        
        await supabase.from('notifications').insert(placementNotifications);
      }

      toast({ 
        title: 'Success', 
        description: decision === 'selected' 
          ? 'Candidate marked as selected! Email sent.' 
          : 'Candidate marked as rejected. Email sent.'
      });
      // Don't call fetchInterviews here - we already removed the interview from state
    } catch (error: any) {
      // Revert local state on error by refetching
      fetchInterviews();
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const todayInterviews = interviews.filter(i => 
    isToday(parseISO(i.scheduled_at)) && i.interview_status === 'scheduled'
  );
  const upcomingInterviews = interviews.filter(i => 
    (isFuture(parseISO(i.scheduled_at)) || isToday(parseISO(i.scheduled_at))) && 
    i.interview_status === 'scheduled'
  );
  const completedInterviews = interviews.filter(i => 
    i.interview_status === 'completed' || i.interview_status === 'cancelled'
  );

  const getInterviewStatus = (interview: Interview) => {
    return interview.interview_status || 'scheduled';
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Interviews</h1>
          <p className="text-muted-foreground mt-1">Manage your interview schedule</p>
        </div>
        <Button 
          variant="accent" 
          className="gap-2"
          onClick={() => setShowScheduleDialog(true)}
          disabled={shortlistedCandidates.length === 0}
        >
          <Plus className="w-4 h-4" />
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
            <Calendar className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{todayInterviews.length}</p>
            <p className="text-sm text-muted-foreground">Today</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Clock className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{upcomingInterviews.length}</p>
            <p className="text-sm text-muted-foreground">Upcoming</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Video className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{completedInterviews.length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <User className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{interviews.length}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Schedule */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1"
          >
            <Card variant="elevated" className="h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Today's Schedule
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayInterviews.length > 0 ? (
                  todayInterviews.map((interview) => (
                    <div 
                      key={interview.id} 
                      className="p-4 bg-primary/5 rounded-lg border-l-4 border-primary"
                    >
                      <p className="font-semibold text-foreground">
                        {interview.application?.student_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {interview.application?.job_title}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {format(parseISO(interview.scheduled_at), 'h:mm a')} ({interview.duration_minutes || 60} min)
                      </div>
                      {interview.meeting_link && (
                        <Button variant="accent" size="sm" className="mt-3 w-full" asChild>
                          <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                            <Video className="w-4 h-4 mr-2" />
                            Join Meeting
                          </a>
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-8">No interviews today</p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* All Interviews */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-2"
          >
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Pending Interviews</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingInterviews.length === 0 ? (
                  <div className="py-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No pending interviews</p>
                    {shortlistedCandidates.length > 0 && (
                      <Button 
                        variant="accent" 
                        className="mt-4"
                        onClick={() => setShowScheduleDialog(true)}
                      >
                        Schedule Your First Interview
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingInterviews.map((interview, index) => {
                      const status = getInterviewStatus(interview);
                      const statusStyle = statusConfig[status] || statusConfig.scheduled;
                      const isScheduled = status === 'scheduled';
                      
                      return (
                        <motion.div
                          key={interview.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.05 * index }}
                          className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                              {interview.application?.student_name?.split(' ').map(n => n[0]).join('') || '?'}
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {interview.application?.student_name}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {interview.application?.job_title}
                              </p>
                            </div>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-foreground">
                              {format(parseISO(interview.scheduled_at), 'MMM dd, yyyy')}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {format(parseISO(interview.scheduled_at), 'h:mm a')}
                            </p>
                          </div>
                          <div className="text-center">
                            <Badge variant="secondary">{interview.duration_minutes || 60} min</Badge>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={statusStyle.color}>{statusStyle.label}</Badge>
                            {interview.meeting_link && (
                              <Button variant="outline" size="sm" asChild>
                                <a href={interview.meeting_link} target="_blank" rel="noopener noreferrer">
                                  <LinkIcon className="w-4 h-4" />
                                </a>
                              </Button>
                            )}
                            {isScheduled && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-green-600 hover:bg-green-50 hover:text-green-700"
                                  onClick={() => handleInterviewDecision(interview, 'selected')}
                                  title="Accept candidate"
                                >
                                  <Check className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="text-red-500 hover:bg-red-50 hover:text-red-600"
                                  onClick={() => handleInterviewDecision(interview, 'rejected')}
                                  title="Reject candidate"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Select a shortlisted candidate and set the interview details.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleScheduleInterview} className="space-y-4">
            <div className="space-y-2">
              <Label>Candidate</Label>
              <Select
                value={formData.application_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, application_id: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a candidate" />
                </SelectTrigger>
                <SelectContent>
                  {shortlistedCandidates.map((candidate) => (
                    <SelectItem key={candidate.id} value={candidate.id}>
                      {candidate.student_name} - {candidate.job_title}
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
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduled_time: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select
                value={formData.duration_minutes.toString()}
                onValueChange={(value) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Meeting Link (optional)</Label>
              <Input
                placeholder="https://zoom.us/j/..."
                value={formData.meeting_link}
                onChange={(e) => setFormData(prev => ({ ...prev, meeting_link: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Interview notes or instructions..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowScheduleDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="accent" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Schedule Interview
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterInterviews;
