import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  Building2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Trophy,
  AlertCircle,
  Eye,
  Send,
  ListPlus,
  Filter,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

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
  currentStatus: 'pending' | 'passed' | 'failed';
}

interface Assessment {
  id: string;
  title: string;
  status: string;
  passing_score: number;
}

type FilterType = 'all' | 'passed' | 'failed' | 'pending';

const PlacementCompanyRounds: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [jobInfo, setJobInfo] = useState<{ company_name: string; title: string } | null>(null);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  
  // Dialogs
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentWithResults | null>(null);
  const [showFailedMessageDialog, setShowFailedMessageDialog] = useState(false);
  const [failedMessage, setFailedMessage] = useState('Unfortunately, you did not meet the minimum requirements for this assessment. We wish you the best in your future endeavors.');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Students categorized by status
  const [passedStudents, setPassedStudents] = useState<StudentWithResults[]>([]);
  const [failedStudents, setFailedStudents] = useState<StudentWithResults[]>([]);
  const [pendingStudents, setPendingStudents] = useState<StudentWithResults[]>([]);

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

      // Get first assessment for this job (single round)
      const { data: assessments } = await supabase
        .from('assessments')
        .select('id, title, status, passing_score')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true })
        .limit(1);

      const currentAssessment = assessments?.[0] || null;
      setAssessment(currentAssessment);

      // Get faculty-approved applications for this job
      const { data: applications } = await supabase
        .from('applications')
        .select('id, student_id, status')
        .eq('job_id', jobId)
        .in('status', ['faculty_approved', 'shortlisted', 'interview', 'selected']);

      if (!applications || applications.length === 0) {
        setIsLoading(false);
        return;
      }

      // Get exam attempts if assessment exists
      let attemptsMap = new Map<string, any>();
      if (currentAssessment) {
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('id, student_id, status, percentage_score, submitted_at, total_score')
          .eq('assessment_id', currentAssessment.id);
        
        attemptsMap = new Map(attempts?.map(a => [a.student_id, a]) || []);
      }

      // Enrich with profile data and categorize
      const passed: StudentWithResults[] = [];
      const failed: StudentWithResults[] = [];
      const pending: StudentWithResults[] = [];

      await Promise.all(
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

          const attempt = attemptsMap.get(app.student_id);
          
          let currentStatus: 'pending' | 'passed' | 'failed' = 'pending';
          
          if (attempt) {
            if (attempt.status === 'submitted' || attempt.status === 'completed') {
              currentStatus = (attempt.percentage_score || 0) >= (currentAssessment?.passing_score || 60) 
                ? 'passed' 
                : 'failed';
            } else if (attempt.status === 'failed') {
              currentStatus = 'failed';
            }
          }

          const student: StudentWithResults = {
            student_id: app.student_id,
            application_id: app.id,
            profile,
            student_profile: studentProfile,
            exam_attempt: attempt,
            currentStatus,
          };

          if (currentStatus === 'passed') {
            passed.push(student);
          } else if (currentStatus === 'failed') {
            failed.push(student);
          } else {
            pending.push(student);
          }
        })
      );

      setPassedStudents(passed);
      setFailedStudents(failed);
      setPendingStudents(pending);

    } catch (error: any) {
      console.error('Error fetching job data:', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewResult = (student: StudentWithResults) => {
    setSelectedStudent(student);
    setShowResultModal(true);
  };

  const handleAddToInterviewList = async (student: StudentWithResults) => {
    setIsSubmitting(true);
    try {
      await supabase
        .from('applications')
        .update({ status: 'interview' })
        .eq('id', student.application_id);

      await supabase.from('notifications').insert({
        user_id: student.student_id,
        title: 'Added to Interview List',
        message: `Congratulations! You have been added to the interview list for ${jobInfo?.company_name}. The placement cell will schedule your interview soon.`,
        link: '/student/schedule',
      });

      toast({ title: 'Success', description: 'Student added to interview list' });
      fetchJobData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddAllToInterviewList = async () => {
    if (passedStudents.length === 0) {
      toast({ title: 'No students', description: 'No passed students to add', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      for (const student of passedStudents) {
        await supabase
          .from('applications')
          .update({ status: 'interview' })
          .eq('id', student.application_id);

        await supabase.from('notifications').insert({
          user_id: student.student_id,
          title: 'Added to Interview List',
          message: `Congratulations! You have been added to the interview list for ${jobInfo?.company_name}. The placement cell will schedule your interview soon.`,
          link: '/student/schedule',
        });
      }

      toast({ title: 'Success', description: `${passedStudents.length} student(s) added to interview list` });
      fetchJobData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenFailedMessage = (student: StudentWithResults) => {
    setSelectedStudent(student);
    setFailedMessage('Unfortunately, you did not meet the minimum requirements for this assessment. We wish you the best in your future endeavors.');
    setShowFailedMessageDialog(true);
  };

  const handleSendFailedMessage = async () => {
    if (!selectedStudent) return;

    setIsSubmitting(true);
    try {
      await supabase
        .from('applications')
        .update({ status: 'rejected' })
        .eq('id', selectedStudent.application_id);

      await supabase.from('notifications').insert({
        user_id: selectedStudent.student_id,
        title: 'Assessment Result - ' + jobInfo?.company_name,
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

  const handleNotifyAllFailed = async () => {
    if (failedStudents.length === 0) {
      toast({ title: 'No students', description: 'No failed students to notify', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const defaultMessage = 'Unfortunately, you did not meet the minimum requirements for this assessment. We wish you the best in your future endeavors.';
      
      for (const student of failedStudents) {
        await supabase
          .from('applications')
          .update({ status: 'rejected' })
          .eq('id', student.application_id);

        await supabase.from('notifications').insert({
          user_id: student.student_id,
          title: 'Assessment Result - ' + jobInfo?.company_name,
          message: defaultMessage,
          link: '/student/applications',
        });
      }

      toast({ title: 'Success', description: `${failedStudents.length} student(s) notified` });
      fetchJobData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendPendingReminder = async (student: StudentWithResults) => {
    try {
      await supabase.from('notifications').insert({
        user_id: student.student_id,
        title: 'Assessment Reminder',
        message: `You have a pending assessment for ${jobInfo?.company_name}. Please complete it before the deadline.`,
        link: '/student/exams',
      });
      toast({ title: 'Reminder Sent', description: 'Notification sent to student' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleNotifyAllPending = async () => {
    if (pendingStudents.length === 0) {
      toast({ title: 'No students', description: 'No pending students to notify', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      for (const student of pendingStudents) {
        await supabase.from('notifications').insert({
          user_id: student.student_id,
          title: 'Assessment Reminder',
          message: `You have a pending assessment for ${jobInfo?.company_name}. Please complete it before the deadline.`,
          link: '/student/exams',
        });
      }
      toast({ title: 'Success', description: `${pendingStudents.length} reminder(s) sent` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredStudents = () => {
    if (filter === 'passed') return passedStudents;
    if (filter === 'failed') return failedStudents;
    if (filter === 'pending') return pendingStudents;
    return [];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalStudents = passedStudents.length + failedStudents.length + pendingStudents.length;

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

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(v: FilterType) => setFilter(v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="passed">Passed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </motion.div>

      {/* Stats Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Trophy className="w-6 h-6 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-green-600">{passedStudents.length}</p>
            <p className="text-sm text-muted-foreground">Passed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <AlertCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-red-600">{failedStudents.length}</p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-amber-600">{pendingStudents.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Content based on filter */}
      {filter === 'all' ? (
        <div className="space-y-6">
          {/* Passed Students */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <Card variant="elevated">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-green-700">Passed Students ({passedStudents.length})</CardTitle>
                      <CardDescription>Students who cleared the assessment</CardDescription>
                    </div>
                  </div>
                  {passedStudents.length > 0 && (
                    <Button onClick={handleAddAllToInterviewList} disabled={isSubmitting} size="sm">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ListPlus className="w-4 h-4 mr-1" />}
                      Add All to Interview List
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {passedStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No students have passed yet</p>
                ) : (
                  <div className="space-y-2">
                    {passedStudents.map((student) => (
                      <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-green-50 border border-green-100">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={student.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-green-100 text-green-700">{student.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{student.profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{student.student_profile?.roll_number} • {student.student_profile?.department}</p>
                          </div>
                          <Badge className="bg-green-100 text-green-700 ml-2">
                            {student.exam_attempt?.percentage_score?.toFixed(0) || 0}%
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewResult(student)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button size="sm" onClick={() => handleAddToInterviewList(student)} disabled={isSubmitting}>
                            <ListPlus className="w-4 h-4 mr-1" />
                            Add to Interview
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Failed Students */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card variant="elevated">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-red-700">Failed Students ({failedStudents.length})</CardTitle>
                      <CardDescription>Students who did not meet requirements</CardDescription>
                    </div>
                  </div>
                  {failedStudents.length > 0 && (
                    <Button variant="outline" onClick={handleNotifyAllFailed} disabled={isSubmitting} size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                      Notify All Failed
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {failedStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">No students have failed</p>
                ) : (
                  <div className="space-y-2">
                    {failedStudents.map((student) => (
                      <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={student.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-red-100 text-red-700">{student.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{student.profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{student.student_profile?.roll_number} • {student.student_profile?.department}</p>
                          </div>
                          <Badge className="bg-red-100 text-red-700 ml-2">
                            {student.exam_attempt?.percentage_score?.toFixed(0) || 0}%
                          </Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleOpenFailedMessage(student)} className="text-red-600">
                          <Send className="w-4 h-4 mr-1" />
                          Send Status
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Pending Students */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <Card variant="elevated">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-amber-700">Pending Students ({pendingStudents.length})</CardTitle>
                      <CardDescription>Students yet to attempt the assessment</CardDescription>
                    </div>
                  </div>
                  {pendingStudents.length > 0 && (
                    <Button variant="outline" onClick={handleNotifyAllPending} disabled={isSubmitting} size="sm" className="text-amber-600 border-amber-200 hover:bg-amber-50">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Send className="w-4 h-4 mr-1" />}
                      Remind All
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {pendingStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-6">All students have attempted the exam</p>
                ) : (
                  <div className="space-y-2">
                    {pendingStudents.map((student) => (
                      <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-100">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={student.profile?.avatar_url || undefined} />
                            <AvatarFallback className="bg-amber-100 text-amber-700">{student.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">{student.profile?.full_name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{student.student_profile?.roll_number} • {student.student_profile?.department}</p>
                          </div>
                          <Badge className="bg-amber-100 text-amber-700 ml-2">Awaiting</Badge>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleSendPendingReminder(student)} className="text-amber-600">
                          <Send className="w-4 h-4 mr-1" />
                          Send Reminder
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      ) : (
        /* Individual filter views */
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card variant="elevated">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="capitalize">{filter} Students ({getFilteredStudents().length})</CardTitle>
                {filter === 'passed' && passedStudents.length > 0 && (
                  <Button onClick={handleAddAllToInterviewList} disabled={isSubmitting} size="sm">
                    <ListPlus className="w-4 h-4 mr-1" />
                    Add All to Interview List
                  </Button>
                )}
                {filter === 'failed' && failedStudents.length > 0 && (
                  <Button variant="outline" onClick={handleNotifyAllFailed} disabled={isSubmitting} size="sm" className="text-red-600">
                    <Send className="w-4 h-4 mr-1" />
                    Notify All Failed
                  </Button>
                )}
                {filter === 'pending' && pendingStudents.length > 0 && (
                  <Button variant="outline" onClick={handleNotifyAllPending} disabled={isSubmitting} size="sm" className="text-amber-600">
                    <Send className="w-4 h-4 mr-1" />
                    Remind All
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {getFilteredStudents().length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No {filter} students</p>
              ) : (
                <div className="space-y-2">
                  {getFilteredStudents().map((student) => (
                    <div key={student.student_id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={student.profile?.avatar_url || undefined} />
                          <AvatarFallback>{student.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{student.profile?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{student.student_profile?.roll_number} • {student.student_profile?.department}</p>
                        </div>
                        {student.exam_attempt?.percentage_score !== null && student.exam_attempt?.percentage_score !== undefined && (
                          <Badge variant="secondary">{student.exam_attempt.percentage_score.toFixed(0)}%</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {filter === 'passed' && (
                          <>
                            <Button variant="ghost" size="sm" onClick={() => handleViewResult(student)}>
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" onClick={() => handleAddToInterviewList(student)} disabled={isSubmitting}>
                              <ListPlus className="w-4 h-4 mr-1" />
                              Add to Interview
                            </Button>
                          </>
                        )}
                        {filter === 'failed' && (
                          <Button variant="outline" size="sm" onClick={() => handleOpenFailedMessage(student)} className="text-red-600">
                            <Send className="w-4 h-4 mr-1" />
                            Send Status
                          </Button>
                        )}
                        {filter === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => handleSendPendingReminder(student)} className="text-amber-600">
                            <Send className="w-4 h-4 mr-1" />
                            Send Reminder
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* View Result Modal */}
      <Dialog open={showResultModal} onOpenChange={setShowResultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Exam Result</DialogTitle>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="w-14 h-14">
                  <AvatarImage src={selectedStudent.profile?.avatar_url || undefined} />
                  <AvatarFallback>{selectedStudent.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-lg">{selectedStudent.profile?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedStudent.profile?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="text-3xl font-bold">{selectedStudent.exam_attempt?.percentage_score?.toFixed(1) || 0}%</p>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className={`text-lg font-semibold capitalize ${selectedStudent.currentStatus === 'passed' ? 'text-green-600' : selectedStudent.currentStatus === 'failed' ? 'text-red-600' : 'text-amber-600'}`}>
                    {selectedStudent.currentStatus}
                  </p>
                </div>
              </div>
              {selectedStudent.exam_attempt?.submitted_at && (
                <p className="text-sm text-muted-foreground text-center">
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

      {/* Failed Message Dialog */}
      <Dialog open={showFailedMessageDialog} onOpenChange={setShowFailedMessageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Status Update</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Send a notification to <strong>{selectedStudent?.profile?.full_name}</strong> about their result.
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
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Send & Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlacementCompanyRounds;
