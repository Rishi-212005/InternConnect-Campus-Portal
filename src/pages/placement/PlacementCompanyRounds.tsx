import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Building2,
  Users,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  ChevronRight,
  Trophy,
  AlertCircle,
  Eye,
  Calendar,
  Send,
  ListPlus,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';

interface StudentWithResults {
  student_id: string;
  application_id: string;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  student_profile: {
    department: string | null;
    cgpa: number | null;
    roll_number: string | null;
  } | null;
  exam_attempt?: {
    id: string;
    status: string;
    percentage_score: number | null;
    submitted_at: string | null;
    total_score: number | null;
  } | null;
  roundsPassed: number;
  currentRoundStatus: 'pending' | 'passed' | 'failed';
}

interface Assessment {
  id: string;
  title: string;
  status: string;
  passing_score: number;
  duration_minutes: number;
  end_time: string | null;
}

interface Round {
  assessment: Assessment;
  students: {
    pending: StudentWithResults[];
    passed: StudentWithResults[];
    failed: StudentWithResults[];
  };
}

type FilterType = 'all' | 'passed' | 'failed';

const PlacementCompanyRounds: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useSupabaseAuthContext();
  
  const [isLoading, setIsLoading] = useState(true);
  const [jobInfo, setJobInfo] = useState<{ company_name: string; title: string } | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<StudentWithResults[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Dialogs
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithResults | null>(null);
  const [showAssignRoundDialog, setShowAssignRoundDialog] = useState(false);
  const [showScheduleInterviewDialog, setShowScheduleInterviewDialog] = useState(false);
  const [showFailedMessageDialog, setShowFailedMessageDialog] = useState(false);
  
  // Available assessments for next round
  const [availableAssessments, setAvailableAssessments] = useState<Assessment[]>([]);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string>('');
  
  // Interview scheduling
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');
  const [interviewDuration, setInterviewDuration] = useState('60');
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');
  
  // Failed message
  const [failedMessage, setFailedMessage] = useState('Unfortunately, you did not meet the minimum requirements for this round. Please try again next time.');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // All passed students across all rounds (students who passed the latest round they attempted)
  const [allPassedStudents, setAllPassedStudents] = useState<StudentWithResults[]>([]);
  const [allFailedStudents, setAllFailedStudents] = useState<StudentWithResults[]>([]);

  useEffect(() => {
    if (jobId) {
      fetchJobData();
    }
  }, [jobId]);

  const fetchJobData = async () => {
    try {
      // Get job info
      const { data: job } = await supabase
        .from('jobs')
        .select('company_name, title')
        .eq('id', jobId)
        .single();

      if (job) {
        setJobInfo(job);
      }

      // Get assessments for this job
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title, status, passing_score, duration_minutes, end_time')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      setAvailableAssessments(assessments || []);

      // Get faculty-approved applications for this job
      const { data: applications } = await supabase
        .from('applications')
        .select('id, student_id, status')
        .eq('job_id', jobId)
        .in('status', ['faculty_approved', 'shortlisted', 'interview', 'selected']);

      if (!applications || applications.length === 0) {
        setRounds([]);
        setIsLoading(false);
        return;
      }

      // Enrich with profile data
      const enrichedStudents = await Promise.all(
        applications.map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('user_id', app.student_id)
            .maybeSingle();

          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('department, cgpa, roll_number')
            .eq('user_id', app.student_id)
            .maybeSingle();

          return {
            student_id: app.student_id,
            application_id: app.id,
            application_status: app.status,
            profile,
            student_profile: studentProfile,
            roundsPassed: 0,
            currentRoundStatus: 'pending' as const,
          };
        })
      );

      // For each assessment, get exam attempts and categorize students
      const roundsData: Round[] = await Promise.all(
        (assessments || []).map(async (assessment) => {
          const { data: attempts } = await supabase
            .from('exam_attempts')
            .select('id, student_id, status, percentage_score, submitted_at, total_score')
            .eq('assessment_id', assessment.id);

          const attemptsMap = new Map(attempts?.map(a => [a.student_id, a]) || []);

          const pending: StudentWithResults[] = [];
          const passed: StudentWithResults[] = [];
          const failed: StudentWithResults[] = [];

          enrichedStudents.forEach((student: any) => {
            const attempt = attemptsMap.get(student.student_id);
            const studentWithAttempt = { ...student, exam_attempt: attempt };

            if (!attempt || attempt.status === 'in_progress') {
              pending.push(studentWithAttempt);
            } else if (attempt.status === 'completed') {
              if ((attempt.percentage_score || 0) >= assessment.passing_score) {
                passed.push(studentWithAttempt);
              } else {
                failed.push(studentWithAttempt);
              }
            }
          });

          return {
            assessment,
            students: { pending, passed, failed },
          };
        })
      );

      setRounds(roundsData);

      // Calculate overall passed/failed students
      // A student is "passed" if they passed the latest round they took
      // A student is "failed" if they failed any round
      const passedSet = new Map<string, StudentWithResults>();
      const failedSet = new Map<string, StudentWithResults>();

      enrichedStudents.forEach((student: any) => {
        let roundsPassed = 0;
        let hasFailed = false;
        let latestAttempt: any = null;
        let lastRoundIndex = -1;

        roundsData.forEach((round, index) => {
          const inPassed = round.students.passed.find(s => s.student_id === student.student_id);
          const inFailed = round.students.failed.find(s => s.student_id === student.student_id);
          
          if (inPassed) {
            roundsPassed++;
            latestAttempt = inPassed.exam_attempt;
            lastRoundIndex = index;
          }
          if (inFailed) {
            hasFailed = true;
            latestAttempt = inFailed.exam_attempt;
            lastRoundIndex = index;
          }
        });

        const enrichedStudent: StudentWithResults = {
          ...student,
          roundsPassed,
          exam_attempt: latestAttempt,
          currentRoundStatus: hasFailed ? 'failed' : (roundsPassed > 0 ? 'passed' : 'pending'),
        };

        if (hasFailed) {
          failedSet.set(student.student_id, enrichedStudent);
        } else if (roundsPassed > 0) {
          passedSet.set(student.student_id, enrichedStudent);
        }
      });

      setAllPassedStudents(Array.from(passedSet.values()));
      setAllFailedStudents(Array.from(failedSet.values()));

      // Calculate eligible students (those who passed all rounds or haven't been assessed yet)
      const studentsWithoutAssessment = enrichedStudents.filter((student: any) => {
        const hasFailedAny = roundsData.some(round => 
          round.students.failed.some(s => s.student_id === student.student_id)
        );
        return !hasFailedAny;
      });
      setEligibleStudents(studentsWithoutAssessment);

    } catch (error: any) {
      console.error('Error fetching job data:', error);
      toast({ title: 'Error', description: 'Failed to load job data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewResult = (student: StudentWithResults) => {
    setSelectedStudent(student);
    setShowResultModal(true);
  };

  const handleOpenAssignRound = (student: StudentWithResults) => {
    setSelectedStudent(student);
    setSelectedAssessmentId('');
    setShowAssignRoundDialog(true);
  };

  const handleOpenScheduleInterview = (student: StudentWithResults) => {
    setSelectedStudent(student);
    setInterviewDate('');
    setInterviewTime('');
    setInterviewDuration('60');
    setMeetingLink('');
    setInterviewNotes('');
    setShowScheduleInterviewDialog(true);
  };

  const handleOpenFailedMessage = (student: StudentWithResults) => {
    setSelectedStudent(student);
    setFailedMessage('Unfortunately, you did not meet the minimum requirements for this round. Please try again next time.');
    setShowFailedMessageDialog(true);
  };

  const handleAssignNextRound = async () => {
    if (!selectedStudent || !selectedAssessmentId) return;

    setIsSubmitting(true);
    try {
      // Update application status to shortlisted
      await supabase
        .from('applications')
        .update({ status: 'shortlisted' })
        .eq('id', selectedStudent.application_id);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: selectedStudent.student_id,
        title: 'Next Round Assigned',
        message: `You have been assigned to the next assessment round for ${jobInfo?.company_name}. Please check your exams section.`,
        link: '/student/exams',
      });

      toast({ title: 'Success', description: 'Student assigned to next round' });
      setShowAssignRoundDialog(false);
      fetchJobData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleInterview = async () => {
    if (!selectedStudent || !interviewDate || !interviewTime) return;

    setIsSubmitting(true);
    try {
      const scheduledAt = new Date(`${interviewDate}T${interviewTime}`);

      // Create interview schedule
      await supabase.from('interview_schedules').insert({
        application_id: selectedStudent.application_id,
        scheduled_at: scheduledAt.toISOString(),
        duration_minutes: parseInt(interviewDuration),
        meeting_link: meetingLink || null,
        notes: interviewNotes || null,
        scheduled_by: user?.id,
        interview_status: 'scheduled',
      });

      // Update application status to interview
      await supabase
        .from('applications')
        .update({ status: 'interview' })
        .eq('id', selectedStudent.application_id);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: selectedStudent.student_id,
        title: 'Interview Scheduled',
        message: `Your interview for ${jobInfo?.company_name} has been scheduled for ${format(scheduledAt, 'PPp')}.`,
        link: '/student/schedule',
      });

      toast({ title: 'Success', description: 'Interview scheduled successfully' });
      setShowScheduleInterviewDialog(false);
      fetchJobData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendFailedMessage = async () => {
    if (!selectedStudent) return;

    setIsSubmitting(true);
    try {
      // Update application status to rejected
      await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', selectedStudent.application_id);

      // Send notification
      await supabase.from('notifications').insert({
        user_id: selectedStudent.student_id,
        title: 'Assessment Result',
        message: failedMessage,
        link: '/student/applications',
      });

      toast({ title: 'Success', description: 'Status updated and notification sent' });
      setShowFailedMessageDialog(false);
      fetchJobData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter students based on selected filter
  const getFilteredStudents = () => {
    if (filter === 'passed') return allPassedStudents;
    if (filter === 'failed') return allFailedStudents;
    return [...allPassedStudents, ...allFailedStudents];
  };

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
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/placement/candidates')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-heading font-bold text-foreground">
                {jobInfo?.company_name || 'Company'}
              </h1>
              <p className="text-muted-foreground">{jobInfo?.title || 'Position'}</p>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v: FilterType) => setFilter(v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter students" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <ClipboardList className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{rounds.length}</p>
            <p className="text-sm text-muted-foreground">Total Rounds</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Users className="w-6 h-6 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">{eligibleStudents.length}</p>
            <p className="text-sm text-muted-foreground">Eligible Students</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Trophy className="w-6 h-6 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">{allPassedStudents.length}</p>
            <p className="text-sm text-muted-foreground">Passed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold">{allFailedStudents.length}</p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Students Sections */}
      {rounds.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No assessments created for this job yet</p>
            <Button 
              className="mt-4"
              onClick={() => navigate('/placement/assessments')}
            >
              Create Assessment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Passed Students Section */}
          {(filter === 'all' || filter === 'passed') && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <CheckCircle className="w-5 h-5" />
                  Passed Students ({allPassedStudents.length})
                </CardTitle>
                <CardDescription>Students who passed their assessments</CardDescription>
              </CardHeader>
              <CardContent>
                {allPassedStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No students have passed yet</p>
                ) : (
                  <div className="space-y-3">
                    {allPassedStudents.map((student) => (
                      <div key={student.student_id} className="p-4 rounded-lg border border-success/20 bg-success/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={student.profile?.avatar_url || undefined} />
                              <AvatarFallback>{student.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.profile?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {student.student_profile?.roll_number} • {student.student_profile?.department} • 
                                <span className="text-success ml-1">{student.roundsPassed} round(s) passed</span>
                              </p>
                            </div>
                            {student.exam_attempt?.percentage_score !== null && (
                              <Badge variant="secondary" className="bg-success/10 text-success">
                                Score: {student.exam_attempt.percentage_score?.toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewResult(student)}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Result
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenAssignRound(student)}
                            >
                              <ListPlus className="w-4 h-4 mr-1" />
                              Assign Next Round
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleOpenScheduleInterview(student)}
                            >
                              <Calendar className="w-4 h-4 mr-1" />
                              Schedule Interview
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Failed Students Section */}
          {(filter === 'all' || filter === 'failed') && (
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <XCircle className="w-5 h-5" />
                  Failed Students ({allFailedStudents.length})
                </CardTitle>
                <CardDescription>Students who did not meet the minimum requirements</CardDescription>
              </CardHeader>
              <CardContent>
                {allFailedStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No students have failed</p>
                ) : (
                  <div className="space-y-3">
                    {allFailedStudents.map((student) => (
                      <div key={student.student_id} className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={student.profile?.avatar_url || undefined} />
                              <AvatarFallback>{student.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{student.profile?.full_name || 'Unknown'}</p>
                              <p className="text-sm text-muted-foreground">
                                {student.student_profile?.roll_number} • {student.student_profile?.department}
                              </p>
                            </div>
                            {student.exam_attempt?.percentage_score !== null && (
                              <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                                Score: {student.exam_attempt.percentage_score?.toFixed(0)}%
                              </Badge>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenFailedMessage(student)}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Send Update
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Recruitment Pipeline */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Recruitment Pipeline
              </CardTitle>
              <CardDescription>Student progression through assessment rounds to interview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between overflow-x-auto pb-4">
                {rounds.map((round, index) => (
                  <React.Fragment key={round.assessment.id}>
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        round.students.passed.length > 0
                          ? 'bg-success/20 text-success'
                          : 'bg-primary/20 text-primary'
                      }`}>
                        {round.students.passed.length}
                      </div>
                      <p className="text-sm font-medium mt-2 text-center">{round.assessment.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {round.students.passed.length} passed
                      </p>
                    </div>
                    <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                  </React.Fragment>
                ))}
                {/* Interview Stage */}
                <div className="flex flex-col items-center min-w-[120px]">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold bg-accent/20 text-accent">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium mt-2 text-center">Interview</p>
                  <p className="text-xs text-muted-foreground">Final stage</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* View Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exam Result Overview</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={selectedStudent.profile?.avatar_url || undefined} />
                  <AvatarFallback>{selectedStudent.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedStudent.profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.profile?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-2xl font-bold">{selectedStudent.exam_attempt?.percentage_score?.toFixed(1) || 0}%</p>
                </div>
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground">Rounds Passed</p>
                  <p className="text-2xl font-bold">{selectedStudent.roundsPassed}</p>
                </div>
              </div>
              {selectedStudent.exam_attempt?.submitted_at && (
                <p className="text-sm text-muted-foreground">
                  Submitted: {format(new Date(selectedStudent.exam_attempt.submitted_at), 'PPp')}
                </p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResultModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Next Round Dialog */}
      <Dialog open={showAssignRoundDialog} onOpenChange={setShowAssignRoundDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Next Round</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Assign <strong>{selectedStudent?.profile?.full_name}</strong> to the next assessment round.
            </p>
            <div className="space-y-2">
              <Label>Select Assessment</Label>
              <Select value={selectedAssessmentId} onValueChange={setSelectedAssessmentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an assessment" />
                </SelectTrigger>
                <SelectContent>
                  {availableAssessments
                    .filter(a => a.status === 'active' || a.status === 'scheduled')
                    .map((assessment) => (
                      <SelectItem key={assessment.id} value={assessment.id}>
                        {assessment.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAssignRoundDialog(false)}>Cancel</Button>
            <Button onClick={handleAssignNextRound} disabled={!selectedAssessmentId || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleInterviewDialog} onOpenChange={setShowScheduleInterviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Schedule an interview for <strong>{selectedStudent?.profile?.full_name}</strong>.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={interviewDate}
                  onChange={(e) => setInterviewDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={interviewTime}
                  onChange={(e) => setInterviewTime(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select value={interviewDuration} onValueChange={setInterviewDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                  <SelectItem value="90">90 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Meeting Link (optional)</Label>
              <Input
                placeholder="https://meet.google.com/..."
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Any additional notes..."
                value={interviewNotes}
                onChange={(e) => setInterviewNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleInterviewDialog(false)}>Cancel</Button>
            <Button onClick={handleScheduleInterview} disabled={!interviewDate || !interviewTime || isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Failed Message Dialog */}
      <Dialog open={showFailedMessageDialog} onOpenChange={setShowFailedMessageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Status Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a message to <strong>{selectedStudent?.profile?.full_name}</strong> about their assessment result.
            </p>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={failedMessage}
                onChange={(e) => setFailedMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFailedMessageDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleSendFailedMessage} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Send & Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlacementCompanyRounds;
