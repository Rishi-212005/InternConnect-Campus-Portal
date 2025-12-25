import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  ClipboardList,
  Clock,
  Play,
  CheckCircle,
  Loader2,
  AlertTriangle,
  Timer,
  Send,
  ChevronLeft,
  ChevronRight,
  XCircle,
  FileQuestion,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Assessment {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  status: string;
  total_marks: number;
  jobs?: { title: string; company_name: string };
}

interface QuizQuestion {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
}

interface ExamAttempt {
  id: string;
  assessment_id: string;
  started_at: string;
  submitted_at: string | null;
  total_score: number;
  percentage_score: number;
  status: string;
  result_confirmed: boolean;
  next_round_info: string | null;
}

const StudentExams: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Exam state
  const [activeExam, setActiveExam] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttempt | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  const fetchAssessments = async () => {
    if (!user) return;
    
    try {
      // Get assessments for jobs where student has faculty_approved applications
      const { data: applications } = await supabase
        .from('applications')
        .select('job_id')
        .eq('student_id', user.id)
        .eq('status', 'faculty_approved');

      if (!applications?.length) {
        setAssessments([]);
        setIsLoading(false);
        return;
      }

      const jobIds = applications.map(a => a.job_id);

      const { data: assessmentsData } = await supabase
        .from('assessments')
        .select(`*, jobs (title, company_name)`)
        .in('job_id', jobIds)
        .eq('status', 'active');

      setAssessments(assessmentsData || []);

      // Get student's attempts
      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('student_id', user.id);

      setAttempts(attemptsData || []);
    } catch (error) {
      console.error('Error fetching assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [user]);

  // Timer
  useEffect(() => {
    if (!activeExam || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeExam, timeRemaining]);

  const startExam = async (assessment: Assessment) => {
    try {
      // Check for existing attempt
      const existingAttempt = attempts.find(a => a.assessment_id === assessment.id);
      
      if (existingAttempt) {
        if (existingAttempt.status !== 'in_progress') {
          toast({ 
            title: 'Already Attempted', 
            description: 'You have already completed this assessment.', 
            variant: 'destructive' 
          });
          return;
        }
        setCurrentAttempt(existingAttempt);
      } else {
        // Create new attempt
        const { data: attempt, error } = await supabase
          .from('exam_attempts')
          .insert({
            assessment_id: assessment.id,
            student_id: user?.id,
            status: 'in_progress',
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentAttempt(attempt);
      }

      // Fetch questions (without correct answers - they shouldn't be sent to client)
      const { data: questionsData } = await supabase
        .from('quiz_questions')
        .select('id, question_text, option_a, option_b, option_c, option_d, marks')
        .eq('assessment_id', assessment.id);

      setQuestions(questionsData || []);
      setAnswers({});
      setActiveExam(assessment);
      setTimeRemaining(assessment.duration_minutes * 60);
      setCurrentQuestionIndex(0);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmitExam = async () => {
    if (!currentAttempt || !activeExam) return;
    
    setIsSubmitting(true);
    setShowConfirmSubmit(false);

    try {
      // Fetch correct answers and calculate score
      const { data: questionsWithAnswers } = await supabase
        .from('quiz_questions')
        .select('id, correct_answer, marks')
        .eq('assessment_id', activeExam.id);

      let totalScore = 0;
      const totalMarks = questionsWithAnswers?.reduce((sum, q) => sum + q.marks, 0) || 0;

      // Save each response
      for (const question of questionsWithAnswers || []) {
        const selectedAnswer = answers[question.id];
        const isCorrect = selectedAnswer === question.correct_answer;
        const marksObtained = isCorrect ? question.marks : 0;
        
        if (isCorrect) {
          totalScore += question.marks;
        }

        await supabase.from('quiz_responses').upsert({
          attempt_id: currentAttempt.id,
          question_id: question.id,
          selected_answer: selectedAnswer || null,
          is_correct: isCorrect,
          marks_obtained: marksObtained,
        }, { onConflict: 'attempt_id,question_id' });
      }

      const percentageScore = totalMarks > 0 
        ? Math.round((totalScore / totalMarks) * 100) 
        : 0;

      // Update attempt - but don't mark as passed/failed yet (admin confirms)
      await supabase
        .from('exam_attempts')
        .update({
          submitted_at: new Date().toISOString(),
          total_score: totalScore,
          percentage_score: percentageScore,
          status: 'submitted', // Not passed/failed until admin confirms
        })
        .eq('id', currentAttempt.id);

      // Notify placement admin about submission
      const { data: placementAdmins } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'placement');

      if (placementAdmins) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user?.id)
          .maybeSingle();

        for (const admin of placementAdmins) {
          await supabase.from('notifications').insert({
            user_id: admin.user_id,
            title: 'Quiz Submission',
            message: `${profile?.full_name || 'A student'} submitted ${activeExam.title} with ${percentageScore}% (${totalScore}/${totalMarks} marks)`,
            link: '/placement/exam-results',
          });
        }
      }

      toast({
        title: 'Exam Submitted',
        description: 'Your exam has been submitted. Results will be announced by the placement cell.',
      });

      // Reset exam state
      setActiveExam(null);
      setQuestions([]);
      setAnswers({});
      setCurrentAttempt(null);
      fetchAssessments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getAttemptForAssessment = (assessmentId: string) => {
    return attempts.find(a => a.assessment_id === assessmentId);
  };

  const getAnsweredCount = () => {
    return Object.keys(answers).filter(k => answers[k]).length;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Active exam view
  if (activeExam && questions.length > 0) {
    const currentQuestion = questions[currentQuestionIndex];
    const progress = (getAnsweredCount() / questions.length) * 100;

    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
          <div>
            <h1 className="font-bold">{activeExam.title}</h1>
            <p className="text-sm text-muted-foreground">{activeExam.jobs?.company_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Answered: {getAnsweredCount()}/{questions.length}
            </div>
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-muted'}`}>
              <Timer className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>
            <Button variant="destructive" onClick={() => setShowConfirmSubmit(true)}>
              Submit Exam
            </Button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 py-2 border-b">
          <Progress value={progress} className="h-2" />
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-0 overflow-hidden">
          {/* Question Panel */}
          <div className="lg:col-span-3 p-6 overflow-y-auto">
            <Card variant="outline" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Question {currentQuestionIndex + 1} of {questions.length}</Badge>
                  <Badge variant="secondary">{currentQuestion.marks} marks</Badge>
                </div>
              </div>

              <h2 className="text-xl font-semibold mb-6">{currentQuestion.question_text}</h2>

              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                className="space-y-4"
              >
                {['a', 'b', 'c', 'd'].map((option) => {
                  const optionText = currentQuestion[`option_${option}` as keyof QuizQuestion] as string;
                  const isSelected = answers[currentQuestion.id] === option;
                  
                  return (
                    <div 
                      key={option}
                      className={`flex items-center space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/5' 
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => handleAnswerChange(currentQuestion.id, option)}
                    >
                      <RadioGroupItem value={option} id={`option-${option}`} />
                      <Label htmlFor={`option-${option}`} className="flex-1 cursor-pointer text-base">
                        <span className="font-semibold mr-2">{option.toUpperCase()}.</span>
                        {optionText}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                
                <div className="text-sm text-muted-foreground">
                  {currentQuestionIndex + 1} / {questions.length}
                </div>

                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </Card>
          </div>

          {/* Question Navigator */}
          <div className="p-4 bg-muted/30 border-l overflow-y-auto">
            <h3 className="font-semibold mb-4">Questions</h3>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = index === currentQuestionIndex;
                
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all
                      ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
                      ${isAnswered 
                        ? 'bg-green-500 text-white' 
                        : 'bg-muted hover:bg-muted/80'
                      }
                    `}
                  >
                    {index + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500" />
                <span>Answered ({getAnsweredCount()})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted border" />
                <span>Not Answered ({questions.length - getAnsweredCount()})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Confirm Submit Dialog */}
        <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Confirm Submission
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to submit your exam?
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p>Questions Answered: <strong>{getAnsweredCount()}</strong> / {questions.length}</p>
                <p>Unanswered: <strong>{questions.length - getAnsweredCount()}</strong></p>
                <p>Time Remaining: <strong>{formatTime(timeRemaining)}</strong></p>
              </div>
              
              {questions.length - getAnsweredCount() > 0 && (
                <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-4">
                  Warning: You have {questions.length - getAnsweredCount()} unanswered questions!
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirmSubmit(false)}>
                Continue Exam
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleSubmitExam}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Submit Exam
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Assessment list view
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-heading font-bold text-foreground">Online Exams</h1>
        <p className="text-muted-foreground mt-1">Take quiz assessments for your job applications</p>
      </motion.div>

      {assessments.length === 0 ? (
        <Card variant="glass">
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Assessments Available</h3>
            <p className="text-muted-foreground">
              Assessments will appear here once your job applications are approved by faculty.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assessments.map((assessment, index) => {
            const attempt = getAttemptForAssessment(assessment.id);
            const canStart = !attempt || attempt.status === 'in_progress';
            const hasSubmitted = attempt?.status === 'submitted';
            const isPassed = attempt?.status === 'passed';
            const isFailed = attempt?.status === 'failed';
            const isConfirmed = attempt?.result_confirmed;
            
            return (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="elevated" className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <FileQuestion className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{assessment.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {assessment.jobs?.title} • {assessment.jobs?.company_name}
                          </p>
                          {assessment.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {assessment.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {assessment.duration_minutes} mins
                            </span>
                            <span className="flex items-center gap-1">
                              <FileQuestion className="w-4 h-4" />
                              {assessment.total_marks} marks
                            </span>
                            <span className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Pass: {assessment.passing_score}%
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        {!attempt && (
                          <Button onClick={() => startExam(assessment)} className="gap-2">
                            <Play className="w-4 h-4" />
                            Start Exam
                          </Button>
                        )}
                        
                        {attempt?.status === 'in_progress' && (
                          <Button onClick={() => startExam(assessment)} variant="secondary" className="gap-2">
                            <Play className="w-4 h-4" />
                            Continue Exam
                          </Button>
                        )}
                        
                        {hasSubmitted && !isConfirmed && (
                          <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">
                            <HelpCircle className="w-3 h-3 mr-1" />
                            Awaiting Results
                          </Badge>
                        )}
                        
                        {isConfirmed && isPassed && (
                          <div className="text-right">
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Passed ({attempt?.percentage_score}%)
                            </Badge>
                            {attempt?.next_round_info && (
                              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                                {attempt.next_round_info}
                              </p>
                            )}
                            {!attempt?.next_round_info && (
                              <p className="text-sm text-green-600 dark:text-green-400 mt-2">
                                Interview will be scheduled soon!
                              </p>
                            )}
                          </div>
                        )}
                        
                        {isConfirmed && isFailed && (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Failed ({attempt?.percentage_score}%)
                          </Badge>
                        )}

                        {attempt && attempt.submitted_at && (
                          <p className="text-xs text-muted-foreground">
                            Submitted: {format(new Date(attempt.submitted_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        )}
                      </div>
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

export default StudentExams;