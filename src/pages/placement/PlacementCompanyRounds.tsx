import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Building2,
  Users,
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Award,
  GraduationCap,
  Mail,
  Loader2,
  ChevronRight,
  Trophy,
  AlertCircle,
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
  } | null;
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

const PlacementCompanyRounds: React.FC = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [jobInfo, setJobInfo] = useState<{ company_name: string; title: string } | null>(null);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [eligibleStudents, setEligibleStudents] = useState<StudentWithResults[]>([]);

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
          };
        })
      );

      // For each assessment, get exam attempts and categorize students
      const roundsData: Round[] = await Promise.all(
        (assessments || []).map(async (assessment) => {
          // Get all exam attempts for this assessment
          const { data: attempts } = await supabase
            .from('exam_attempts')
            .select('id, student_id, status, percentage_score, submitted_at')
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
      
      // Set initial selected round
      if (roundsData.length > 0) {
        setSelectedRound(roundsData[0].assessment.id);
      }

      // Calculate eligible students (those who passed all rounds or haven't been assessed yet)
      const studentsWithoutAssessment = enrichedStudents.filter((student: any) => {
        // Check if student has completed all existing assessments and passed
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

  const handleMoveToNextRound = async (studentIds: string[]) => {
    try {
      // Update application status to shortlisted
      for (const studentId of studentIds) {
        const student = eligibleStudents.find(s => s.student_id === studentId);
        if (student) {
          await supabase
            .from('applications')
            .update({ status: 'shortlisted' })
            .eq('id', student.application_id);
        }
      }

      toast({ 
        title: 'Students Moved', 
        description: `${studentIds.length} student(s) moved to next round` 
      });
      
      fetchJobData();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const currentRound = rounds.find(r => r.assessment.id === selectedRound);

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
        className="flex items-center gap-4"
      >
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
            <p className="text-2xl font-bold">
              {rounds.reduce((sum, r) => sum + r.students.passed.length, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Passed All Rounds</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {rounds.reduce((sum, r) => sum + r.students.failed.length, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Eliminated</p>
          </CardContent>
        </Card>
      </div>

      {/* Rounds Navigation */}
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
          {/* Round Tabs */}
          <Tabs value={selectedRound} onValueChange={setSelectedRound}>
            <TabsList className="flex flex-wrap h-auto gap-2 bg-transparent p-0">
              {rounds.map((round, index) => (
                <TabsTrigger
                  key={round.assessment.id}
                  value={round.assessment.id}
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground px-4 py-2 rounded-lg border"
                >
                  <span className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    {round.assessment.title}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            {rounds.map((round) => (
              <TabsContent key={round.assessment.id} value={round.assessment.id} className="mt-6">
                <Card variant="elevated">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{round.assessment.title}</CardTitle>
                        <CardDescription>
                          Passing Score: {round.assessment.passing_score}% • Duration: {round.assessment.duration_minutes} mins
                          {round.assessment.end_time && (
                            <span> • Deadline: {format(new Date(round.assessment.end_time), 'PPp')}</span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge 
                        className={round.assessment.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}
                      >
                        {round.assessment.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Pending */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Pending ({round.students.pending.length})</span>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {round.students.pending.map((student) => (
                            <StudentCard key={student.student_id} student={student} status="pending" />
                          ))}
                          {round.students.pending.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No pending students</p>
                          )}
                        </div>
                      </div>

                      {/* Passed */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-success">
                          <CheckCircle className="w-4 h-4" />
                          <span className="font-medium">Passed ({round.students.passed.length})</span>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {round.students.passed.map((student) => (
                            <StudentCard key={student.student_id} student={student} status="passed" />
                          ))}
                          {round.students.passed.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No students passed yet</p>
                          )}
                        </div>
                      </div>

                      {/* Failed */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-destructive">
                          <XCircle className="w-4 h-4" />
                          <span className="font-medium">Failed ({round.students.failed.length})</span>
                        </div>
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {round.students.failed.map((student) => (
                            <StudentCard key={student.student_id} student={student} status="failed" />
                          ))}
                          {round.students.failed.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">No students failed</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* Progression Summary */}
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-primary" />
                Recruitment Pipeline
              </CardTitle>
              <CardDescription>Student progression through assessment rounds</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between overflow-x-auto pb-4">
                {rounds.map((round, index) => (
                  <React.Fragment key={round.assessment.id}>
                    <div className="flex flex-col items-center min-w-[120px]">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${
                        round.students.pending.length === 0 && round.students.passed.length > 0
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
                    {index < rounds.length - 1 && (
                      <ChevronRight className="w-6 h-6 text-muted-foreground flex-shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

const StudentCard: React.FC<{ student: StudentWithResults; status: 'pending' | 'passed' | 'failed' }> = ({ student, status }) => {
  const statusColors = {
    pending: 'bg-yellow-50 border-yellow-200',
    passed: 'bg-green-50 border-green-200',
    failed: 'bg-red-50 border-red-200',
  };

  return (
    <div className={`p-3 rounded-lg border ${statusColors[status]}`}>
      <div className="flex items-center gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src={student.profile?.avatar_url || undefined} />
          <AvatarFallback>{student.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{student.profile?.full_name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground truncate">
            {student.student_profile?.roll_number} • {student.student_profile?.department}
          </p>
        </div>
        {student.exam_attempt?.percentage_score !== null && student.exam_attempt?.percentage_score !== undefined && (
          <Badge variant="secondary" className="text-xs">
            {student.exam_attempt.percentage_score.toFixed(0)}%
          </Badge>
        )}
      </div>
    </div>
  );
};

export default PlacementCompanyRounds;
