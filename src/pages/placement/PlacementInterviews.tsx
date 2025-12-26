import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Calendar, 
  Clock, 
  Video, 
  Loader2,
  Plus,
  User,
  Building2,
  CheckCircle,
  XCircle,
  Link2,
  ChevronDown,
  ChevronUp,
  Users,
  Send
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
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
      recruiter_id: string;
    };
    mentor_id?: string;
  } | null;
}

interface EligibleStudent {
  application_id: string;
  student_id: string;
  full_name: string;
  email: string;
  job_id: string;
  job_title: string;
  company_name: string;
  recruiter_id: string;
  mentor_id?: string;
}

interface CompanyGroup {
  company_name: string;
  job_title: string;
  job_id: string;
  recruiter_id: string;
  students: EligibleStudent[];
  interviews: Interview[];
}

const PlacementInterviews: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  
  // Schedule dialog
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyGroup | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [duration, setDuration] = useState('60');
  const [meetingLink, setMeetingLink] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch applications with interview status
      const { data: apps, error: appsError } = await supabase
        .from('applications')
        .select('id, student_id, job_id, status')
        .eq('status', 'interview');

      if (appsError) throw appsError;

      // Fetch all interviews
      const { data: interviewsData, error: intError } = await supabase
        .from('interview_schedules')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (intError) throw intError;

      // Get unique job IDs
      const jobIds = [...new Set(apps?.map(a => a.job_id) || [])];
      
      // Fetch job details
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, company_name, recruiter_id')
        .in('id', jobIds);

      const jobsMap = new Map(jobs?.map(j => [j.id, j]) || []);

      // Fetch student profiles
      const studentIds = [...new Set(apps?.map(a => a.student_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Get mentor assignments
      const { data: mentorRequests } = await supabase
        .from('mentor_requests')
        .select('student_id, mentor_id')
        .eq('status', 'approved')
        .in('student_id', studentIds);

      const mentorsMap = new Map(mentorRequests?.map(m => [m.student_id, m.mentor_id]) || []);

      // Group by company
      const groups: Record<string, CompanyGroup> = {};

      apps?.forEach(app => {
        const job = jobsMap.get(app.job_id);
        if (!job) return;

        const key = app.job_id;
        if (!groups[key]) {
          groups[key] = {
            company_name: job.company_name,
            job_title: job.title,
            job_id: job.id,
            recruiter_id: job.recruiter_id,
            students: [],
            interviews: [],
          };
        }

        const profile = profilesMap.get(app.student_id);
        const existingInterview = interviewsData?.find(i => i.application_id === app.id);

        if (!existingInterview) {
          groups[key].students.push({
            application_id: app.id,
            student_id: app.student_id,
            full_name: profile?.full_name || 'Unknown',
            email: profile?.email || '',
            job_id: app.job_id,
            job_title: job.title,
            company_name: job.company_name,
            recruiter_id: job.recruiter_id,
            mentor_id: mentorsMap.get(app.student_id),
          });
        }
      });

      // Add interviews with details
      for (const interview of interviewsData || []) {
        const app = apps?.find(a => a.id === interview.application_id);
        if (!app) continue;

        const job = jobsMap.get(app.job_id);
        const profile = profilesMap.get(app.student_id);
        if (!job) continue;

        const key = app.job_id;
        if (!groups[key]) {
          groups[key] = {
            company_name: job.company_name,
            job_title: job.title,
            job_id: job.id,
            recruiter_id: job.recruiter_id,
            students: [],
            interviews: [],
          };
        }

        groups[key].interviews.push({
          ...interview,
          application: {
            id: app.id,
            student_id: app.student_id,
            job_id: app.job_id,
            status: app.status,
            student_profile: profile ? { full_name: profile.full_name, email: profile.email } : undefined,
            job: { title: job.title, company_name: job.company_name, recruiter_id: job.recruiter_id },
            mentor_id: mentorsMap.get(app.student_id),
          },
        });
      }

      setCompanyGroups(Object.values(groups));
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({ title: 'Error', description: 'Failed to load interviews', variant: 'destructive' });
    } finally {
      setIsLoading(false);
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

  const openScheduleDialog = (company: CompanyGroup) => {
    setSelectedCompany(company);
    setSelectedStudentIds(company.students.map(s => s.application_id));
    setScheduleDate('');
    setScheduleTime('');
    setDuration('60');
    setMeetingLink('');
    setNotes('');
    setShowScheduleDialog(true);
  };

  const handleScheduleInterview = async () => {
    if (!selectedCompany || !scheduleDate || !scheduleTime || selectedStudentIds.length === 0 || !user) {
      toast({ title: 'Missing information', description: 'Please fill all required fields', variant: 'destructive' });
      return;
    }

    setProcessingId('scheduling');

    try {
      const scheduledAt = new Date(`${scheduleDate}T${scheduleTime}`).toISOString();

      // Create interview schedules for all selected students
      for (const appId of selectedStudentIds) {
        const student = selectedCompany.students.find(s => s.application_id === appId);
        if (!student) continue;

        // Insert interview schedule
        const { error: insertError } = await supabase
          .from('interview_schedules')
          .insert({
            application_id: appId,
            scheduled_at: scheduledAt,
            duration_minutes: parseInt(duration),
            meeting_link: meetingLink || null,
            notes: notes || null,
            scheduled_by: user.id,
            interview_status: 'scheduled',
          });

        if (insertError) throw insertError;

        // Notify student
        await supabase.from('notifications').insert({
          user_id: student.student_id,
          title: 'Interview Scheduled',
          message: `Your interview for ${student.job_title} at ${student.company_name} is scheduled for ${format(new Date(scheduledAt), 'PPp')}${meetingLink ? '. Meeting link: ' + meetingLink : ''}`,
          link: '/student/schedule',
        });

        // Notify recruiter
        await supabase.from('notifications').insert({
          user_id: student.recruiter_id,
          title: 'Interview Scheduled',
          message: `Interview scheduled with ${student.full_name} for ${student.job_title} on ${format(new Date(scheduledAt), 'PPp')}`,
          link: '/recruiter/interviews',
        });

        // Notify mentor if exists
        if (student.mentor_id) {
          await supabase.from('notifications').insert({
            user_id: student.mentor_id,
            title: 'Student Interview Scheduled',
            message: `Your mentee ${student.full_name} has an interview scheduled for ${student.job_title} at ${student.company_name} on ${format(new Date(scheduledAt), 'PPp')}`,
            link: '/faculty/students',
          });
        }
      }

      toast({ title: 'Success', description: `Interview scheduled for ${selectedStudentIds.length} student(s)` });
      setShowScheduleDialog(false);
      fetchData();
    } catch (error: any) {
      console.error('Error scheduling interview:', error);
      toast({ title: 'Error', description: error.message || 'Failed to schedule interview', variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const handleUpdateStatus = async (interview: Interview, status: string) => {
    setProcessingId(interview.id);

    try {
      const { error } = await supabase
        .from('interview_schedules')
        .update({ interview_status: status })
        .eq('id', interview.id);

      if (error) throw error;

      // If completed, update application status to selected
      if (status === 'completed' && interview.application) {
        await supabase
          .from('applications')
          .update({ status: 'selected' })
          .eq('id', interview.application_id);

        // Notify student
        await supabase.from('notifications').insert({
          user_id: interview.application.student_id,
          title: 'Congratulations!',
          message: `You have been selected for ${interview.application.job?.title} at ${interview.application.job?.company_name}!`,
          link: '/student/applications',
        });

        // Notify recruiter
        if (interview.application.job?.recruiter_id) {
          await supabase.from('notifications').insert({
            user_id: interview.application.job.recruiter_id,
            title: 'Candidate Selected',
            message: `${interview.application.student_profile?.full_name} has been marked as selected for ${interview.application.job.title}`,
            link: '/recruiter/candidates',
          });
        }

        // Notify mentor
        if (interview.application.mentor_id) {
          await supabase.from('notifications').insert({
            user_id: interview.application.mentor_id,
            title: 'Mentee Selected!',
            message: `Your mentee ${interview.application.student_profile?.full_name} has been selected for ${interview.application.job?.title} at ${interview.application.job?.company_name}!`,
            link: '/faculty/students',
          });
        }
      }

      toast({ title: 'Success', description: `Interview marked as ${status}` });
      fetchData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>;
      case 'completed':
        return <Badge className="bg-green-100 text-green-700">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const totalAwaitingSchedule = companyGroups.reduce((acc, g) => acc + g.students.length, 0);
  const totalScheduled = companyGroups.reduce((acc, g) => acc + g.interviews.filter(i => i.interview_status === 'scheduled').length, 0);
  const totalCompleted = companyGroups.reduce((acc, g) => acc + g.interviews.filter(i => i.interview_status === 'completed').length, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-heading font-bold text-foreground">Interview Management</h1>
        <p className="text-muted-foreground mt-1">Schedule and manage interviews by company</p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Building2 className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{companyGroups.length}</p>
            <p className="text-sm text-muted-foreground">Companies</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Users className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-600">{totalAwaitingSchedule}</p>
            <p className="text-sm text-muted-foreground">Awaiting Schedule</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-blue-600">{totalScheduled}</p>
            <p className="text-sm text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Company Groups */}
      {companyGroups.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No interviews to schedule</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add students to interview list from the Candidates section first
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {companyGroups.map((group, index) => {
            const isExpanded = expandedCompanies.has(group.job_id);
            const scheduledCount = group.interviews.filter(i => i.interview_status === 'scheduled').length;
            const completedCount = group.interviews.filter(i => i.interview_status === 'completed').length;

            return (
              <motion.div
                key={group.job_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card variant="elevated" className="overflow-hidden">
                  {/* Company Header */}
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => toggleCompanyExpand(group.job_id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg text-foreground">{group.company_name}</p>
                        <p className="text-sm text-muted-foreground">{group.job_title}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {group.students.length > 0 && (
                        <Badge className="bg-amber-100 text-amber-700">
                          {group.students.length} Awaiting
                        </Badge>
                      )}
                      {scheduledCount > 0 && (
                        <Badge className="bg-blue-100 text-blue-700">
                          {scheduledCount} Scheduled
                        </Badge>
                      )}
                      {completedCount > 0 && (
                        <Badge className="bg-green-100 text-green-700">
                          {completedCount} Completed
                        </Badge>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="border-t p-4 space-y-4">
                          {/* Awaiting Schedule */}
                          {group.students.length > 0 && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <p className="font-medium text-amber-700 flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  Awaiting Schedule ({group.students.length})
                                </p>
                                <Button size="sm" onClick={() => openScheduleDialog(group)}>
                                  <Calendar className="w-4 h-4 mr-1" />
                                  Schedule Interview
                                </Button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {group.students.map(student => (
                                  <div key={student.application_id} className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-xs font-semibold text-amber-700">
                                      {student.full_name.split(' ').map(n => n[0]).join('')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{student.full_name}</p>
                                      <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Scheduled Interviews */}
                          {group.interviews.length > 0 && (
                            <div className="space-y-3">
                              <p className="font-medium text-blue-700 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Interviews ({group.interviews.length})
                              </p>
                              <div className="space-y-2">
                                {group.interviews.map(interview => (
                                  <div key={interview.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                                        {interview.application?.student_profile?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                                      </div>
                                      <div>
                                        <p className="font-medium">{interview.application?.student_profile?.full_name || 'Unknown'}</p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
                                              Join
                                            </a>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {getStatusBadge(interview.interview_status)}
                                      {interview.interview_status === 'scheduled' && (
                                        <div className="flex gap-1">
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="text-green-600 border-green-200 hover:bg-green-50"
                                            disabled={processingId === interview.id}
                                            onClick={() => handleUpdateStatus(interview, 'completed')}
                                          >
                                            {processingId === interview.id ? (
                                              <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                              <CheckCircle className="w-4 h-4" />
                                            )}
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="text-red-600 border-red-200 hover:bg-red-50"
                                            disabled={processingId === interview.id}
                                            onClick={() => handleUpdateStatus(interview, 'cancelled')}
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              {selectedCompany?.company_name} - {selectedCompany?.job_title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Student Selection */}
            <div className="space-y-2">
              <Label>Select Students ({selectedStudentIds.length} selected)</Label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {selectedCompany?.students.map(student => (
                  <label key={student.application_id} className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.application_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds([...selectedStudentIds, student.application_id]);
                        } else {
                          setSelectedStudentIds(selectedStudentIds.filter(id => id !== student.application_id));
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">{student.full_name}</span>
                    <span className="text-xs text-muted-foreground">({student.email})</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input 
                  type="date" 
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input 
                  type="time" 
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration</Label>
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
              <Label>Meeting Link</Label>
              <Input 
                type="url" 
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Notifications will be sent to selected students, the recruiter, and their mentors.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleScheduleInterview}
              disabled={processingId === 'scheduling' || selectedStudentIds.length === 0}
            >
              {processingId === 'scheduling' ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scheduling...</>
              ) : (
                <>
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule ({selectedStudentIds.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlacementInterviews;
