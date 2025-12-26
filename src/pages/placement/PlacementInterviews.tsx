import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
  Link2,
  ChevronDown,
  ChevronUp,
  Users
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

interface CompanyInterviewGroup {
  company_name: string;
  job_title: string;
  job_id: string;
  interviews: Interview[];
}

const PlacementInterviews: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [eligibleApplications, setEligibleApplications] = useState<EligibleApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());

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
      // Fetch applications that have interview status
      const { data: appData, error } = await supabase
        .from('applications')
        .select('id, student_id, job_id, status')
        .eq('status', 'interview');

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

      // Send in-app notification
      if (app) {
        await supabase.from('notifications').insert({
          user_id: app.student_id,
          title: 'Interview Scheduled',
          message: `Your interview for ${app.job?.title} at ${app.job?.company_name} has been scheduled for ${format(new Date(scheduledAt), 'PPp')}`,
          link: '/student/schedule',
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

          // Send in-app notification
          await supabase.from('notifications').insert({
            user_id: interview.application.student_id,
            title: 'Congratulations! You have been selected',
            message: `You have been selected for the position of ${interview.application.job?.title} at ${interview.application.job?.company_name}!`,
            link: '/student/applications',
          });
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

  const toggleCompanyExpand = (jobId: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  // Group interviews by company
  const groupInterviewsByCompany = (): CompanyInterviewGroup[] => {
    const groups: Record<string, CompanyInterviewGroup> = {};
    
    interviews.forEach(interview => {
      if (!interview.application?.job) return;
      
      const key = interview.application.job_id;
      if (!groups[key]) {
        groups[key] = {
          company_name: interview.application.job.company_name,
          job_title: interview.application.job.title,
          job_id: interview.application.job_id,
          interviews: [],
        };
      }
      groups[key].interviews.push(interview);
    });

    return Object.values(groups);
  };

  // Group eligible applications by company
  const groupEligibleByCompany = () => {
    const groups: Record<string, EligibleApplication[]> = {};
    
    eligibleApplications.forEach(app => {
      if (!app.job) return;
      const key = app.job.company_name;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(app);
    });

    return groups;
  };

  const upcomingInterviews = interviews.filter(i => 
    i.interview_status === 'scheduled' && new Date(i.scheduled_at) >= new Date()
  );
  const pastInterviews = interviews.filter(i => 
    i.interview_status !== 'scheduled' || new Date(i.scheduled_at) < new Date()
  );

  const companyGroups = groupInterviewsByCompany();
  const eligibleByCompany = groupEligibleByCompany();

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
          <p className="text-muted-foreground mt-1">Schedule and manage interviews grouped by company</p>
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
            <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{companyGroups.length}</p>
            <p className="text-sm text-muted-foreground">Companies</p>
          </CardContent>
        </Card>
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
            <User className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{eligibleApplications.length}</p>
            <p className="text-sm text-muted-foreground">Awaiting Schedule</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Awaiting Schedule - By Company */}
      {eligibleApplications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-accent" />
                Students Awaiting Interview Schedule
              </CardTitle>
              <CardDescription>
                Students who passed assessments and are ready for interviews
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(eligibleByCompany).map(([companyName, apps]) => (
                  <div key={companyName} className="p-4 bg-accent/5 rounded-lg border border-accent/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-semibold">{companyName}</p>
                          <p className="text-sm text-muted-foreground">{apps[0]?.job?.title}</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{apps.length} student(s)</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {apps.map(app => (
                        <div key={app.id} className="flex items-center gap-2 p-2 bg-background rounded border">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary">
                            {app.student_profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{app.student_profile?.full_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{app.student_profile?.email}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Scheduled Interviews - By Company */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-500" />
              Interviews by Company
            </CardTitle>
            <CardDescription>All scheduled and past interviews organized by company</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {companyGroups.length === 0 ? (
              <div className="py-8 text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No interviews scheduled yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add students to interview list from the Candidates section
                </p>
              </div>
            ) : (
              companyGroups.map((group, index) => {
                const isExpanded = expandedCompanies.has(group.job_id);
                const scheduledCount = group.interviews.filter(i => i.interview_status === 'scheduled').length;
                const completedCount = group.interviews.filter(i => i.interview_status === 'completed').length;

                return (
                  <motion.div
                    key={group.job_id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <div 
                        className="flex items-center justify-between p-4 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleCompanyExpand(group.job_id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Building2 className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{group.company_name}</p>
                            <p className="text-sm text-muted-foreground">{group.job_title}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge className="bg-blue-100 text-blue-700">
                            {scheduledCount} Scheduled
                          </Badge>
                          <Badge className="bg-green-100 text-green-700">
                            {completedCount} Completed
                          </Badge>
                          <Badge variant="secondary">
                            {group.interviews.length} Total
                          </Badge>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="p-4 border-t space-y-3">
                              {group.interviews.map((interview) => (
                                <div
                                  key={interview.id}
                                  className="flex items-center justify-between p-4 bg-background rounded-lg border"
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                                      {interview.application?.student_profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                    </div>
                                    <div>
                                      <p className="font-medium text-foreground">
                                        {interview.application?.student_profile?.full_name || 'Unknown Student'}
                                      </p>
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
                                            onClick={(e) => e.stopPropagation()}
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
                                    {interview.interview_status === 'scheduled' && (
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
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })
            )}
          </CardContent>
        </Card>
      </motion.div>

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
