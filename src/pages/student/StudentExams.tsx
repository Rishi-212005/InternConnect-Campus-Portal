import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Code,
  Loader2,
  AlertTriangle,
  Timer,
  Send,
  ChevronLeft,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type ProgrammingLanguage = 'javascript' | 'python' | 'java' | 'c';

const LANGUAGE_OPTIONS: { value: ProgrammingLanguage; label: string; starterCode: string }[] = [
  { 
    value: 'javascript', 
    label: 'JavaScript',
    starterCode: '// Write your JavaScript solution here\nfunction solution(input) {\n  // Your code here\n  return result;\n}'
  },
  { 
    value: 'python', 
    label: 'Python',
    starterCode: '# Write your Python solution here\ndef solution(input):\n    # Your code here\n    return result'
  },
  { 
    value: 'java', 
    label: 'Java',
    starterCode: '// Write your Java solution here\npublic class Solution {\n    public static int solution(int input) {\n        // Your code here\n        return result;\n    }\n}'
  },
  { 
    value: 'c', 
    label: 'C',
    starterCode: '// Write your C solution here\n#include <stdio.h>\n\nint solution(int input) {\n    // Your code here\n    return result;\n}'
  },
];

interface Assessment {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  status: string;
  jobs?: { title: string; company_name: string };
}

interface CodingQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  constraints: string | null;
  examples: string | null;
  starter_code: string | null;
  test_cases: unknown;
  points: number;
}

interface ExamAttempt {
  id: string;
  assessment_id: string;
  started_at: string;
  submitted_at: string | null;
  total_score: number;
  percentage_score: number;
  status: string;
}

const StudentExams: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Exam state
  const [activeExam, setActiveExam] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedLanguage, setSelectedLanguage] = useState<ProgrammingLanguage>('javascript');
  const [questionLanguages, setQuestionLanguages] = useState<Record<string, ProgrammingLanguage>>({});
  const [currentAttempt, setCurrentAttempt] = useState<ExamAttempt | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { passed: number; total: number; results?: { passed: boolean; input: unknown; expected: unknown; actual: unknown; error?: string }[] }>>({});

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

      // Fetch questions
      const { data: questionsData } = await supabase
        .from('coding_questions')
        .select('*')
        .eq('assessment_id', assessment.id);

      setQuestions(questionsData || []);
      
      // Initialize answers with starter code and language
      const initialAnswers: Record<string, string> = {};
      const initialLanguages: Record<string, ProgrammingLanguage> = {};
      questionsData?.forEach(q => {
        initialAnswers[q.id] = q.starter_code || LANGUAGE_OPTIONS[0].starterCode;
        initialLanguages[q.id] = 'javascript';
      });
      setAnswers(initialAnswers);
      setQuestionLanguages(initialLanguages);
      setSelectedLanguage('javascript');

      setActiveExam(assessment);
      setTimeRemaining(assessment.duration_minutes * 60);
      setCurrentQuestionIndex(0);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleLanguageChange = (language: ProgrammingLanguage) => {
    const currentQuestion = questions[currentQuestionIndex];
    if (!currentQuestion) return;
    
    setSelectedLanguage(language);
    setQuestionLanguages(prev => ({ ...prev, [currentQuestion.id]: language }));
    
    // Update starter code if answer is empty or still default
    const currentAnswer = answers[currentQuestion.id] || '';
    const isDefaultCode = LANGUAGE_OPTIONS.some(opt => 
      currentAnswer.trim() === opt.starterCode.trim() || currentAnswer.trim() === ''
    );
    
    if (isDefaultCode || currentAnswer === currentQuestion.starter_code) {
      const langOption = LANGUAGE_OPTIONS.find(opt => opt.value === language);
      if (langOption) {
        setAnswers(prev => ({ ...prev, [currentQuestion.id]: langOption.starterCode }));
      }
    }
  };

  const runTests = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;

    const code = answers[questionId];
    const language = questionLanguages[questionId] || 'javascript';
    const testCases = (Array.isArray(question.test_cases) ? question.test_cases : []) as any[];
    
    if (testCases.length === 0) {
      toast({ title: 'No Test Cases', description: 'This question has no test cases defined', variant: 'destructive' });
      return;
    }
    
    setIsRunningTests(true);

    try {
      const response = await supabase.functions.invoke('evaluate-code', {
        body: { code, language, testCases }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      
      setTestResults(prev => ({
        ...prev,
        [questionId]: { 
          passed: result.passed, 
          total: result.total,
          results: result.results 
        }
      }));
      
      toast({
        title: 'Tests Run',
        description: `${result.passed}/${result.total} test cases passed`,
        variant: result.passed === result.total ? 'default' : 'destructive'
      });
    } catch (error: any) {
      console.error('Test run error:', error);
      toast({ 
        title: 'Error', 
        description: error.message || 'Could not evaluate code. Please try again.', 
        variant: 'destructive' 
      });
    } finally {
      setIsRunningTests(false);
    }
  };

  const handleSubmitExam = async () => {
    if (!currentAttempt || !activeExam) return;
    
    setIsSubmitting(true);
    setShowConfirmSubmit(false);

    try {
      let totalTestsPassed = 0;
      let totalTestCases = 0;

      // Save each answer and calculate score based on test cases passed
      for (const question of questions) {
        const code = answers[question.id] || '';
        const language = questionLanguages[question.id] || 'javascript';
        const tcLength = Array.isArray(question.test_cases) ? question.test_cases.length : 0;
        const result = testResults[question.id] || { passed: 0, total: tcLength };
        const score = Math.round((result.passed / (result.total || 1)) * question.points);
        
        totalTestsPassed += result.passed;
        totalTestCases += result.total || tcLength;

        await supabase.from('code_submissions').upsert({
          attempt_id: currentAttempt.id,
          question_id: question.id,
          code,
          language,
          test_cases_passed: result.passed,
          total_test_cases: result.total || tcLength,
          score,
        }, { onConflict: 'attempt_id,question_id' });
      }

      // Calculate percentage based on test cases passed (not points)
      const percentageScore = totalTestCases > 0 
        ? Math.round((totalTestsPassed / totalTestCases) * 100) 
        : 0;
      const passed = percentageScore >= activeExam.passing_score;

      // Update attempt
      await supabase
        .from('exam_attempts')
        .update({
          submitted_at: new Date().toISOString(),
          total_score: totalTestsPassed,
          percentage_score: percentageScore,
          status: passed ? 'passed' : 'failed',
        })
        .eq('id', currentAttempt.id);

      // If passed, update application status
      if (passed) {
        const { data: application } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', activeExam.job_id)
          .eq('student_id', user?.id)
          .single();

        if (application) {
          await supabase
            .from('applications')
            .update({ status: 'shortlisted' })
            .eq('id', application.id);
        }
      }

      // Notify the student's mentor
      if (user?.id) {
        const { data: mentorRequest } = await supabase
          .from('mentor_requests')
          .select('mentor_id')
          .eq('student_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        if (mentorRequest?.mentor_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', user.id)
            .maybeSingle();

          await supabase.from('notifications').insert({
            user_id: mentorRequest.mentor_id,
            title: passed ? 'Student Passed Assessment 🎉' : 'Student Assessment Result',
            message: `${profile?.full_name || 'Your student'} ${passed ? 'passed' : 'did not pass'} the ${activeExam.title} assessment with ${percentageScore}% (${totalTestsPassed}/${totalTestCases} test cases)`,
            link: '/faculty/students',
          });
        }
      }

      if (passed) {
        toast({
          title: 'Congratulations! 🎉',
          description: `You passed with ${percentageScore}% (${totalTestsPassed}/${totalTestCases} test cases passed)!`,
        });
      } else {
        toast({
          title: 'Assessment Completed',
          description: `You scored ${percentageScore}% (${totalTestsPassed}/${totalTestCases} test cases). Required: ${activeExam.passing_score}%`,
          variant: 'destructive',
        });
      }

      // Reset exam state
      setActiveExam(null);
      setQuestions([]);
      setAnswers({});
      setQuestionLanguages({});
      setCurrentAttempt(null);
      setTestResults({});
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
    const currentResult = testResults[currentQuestion.id];

    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-muted/50 border-b">
          <div>
            <h1 className="font-bold">{activeExam.title}</h1>
            <p className="text-sm text-muted-foreground">{activeExam.jobs?.company_name}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${timeRemaining < 300 ? 'bg-red-100 text-red-700' : 'bg-muted'}`}>
              <Timer className="w-4 h-4" />
              <span className="font-mono font-bold">{formatTime(timeRemaining)}</span>
            </div>
            <Button variant="destructive" onClick={() => setShowConfirmSubmit(true)}>
              Submit Exam
            </Button>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-0 overflow-hidden">
          {/* Question Panel */}
          <div className="p-6 overflow-y-auto border-r">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Question {currentQuestionIndex + 1} of {questions.length}</Badge>
                <Badge variant={currentQuestion.difficulty === 'easy' ? 'secondary' : currentQuestion.difficulty === 'medium' ? 'default' : 'destructive'}>
                  {currentQuestion.difficulty}
                </Badge>
                <Badge variant="outline">{currentQuestion.points} pts</Badge>
              </div>
            </div>

            <h2 className="text-xl font-bold mb-4">{currentQuestion.title}</h2>
            <div className="prose prose-sm max-w-none">
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg">
                {currentQuestion.description}
              </pre>
            </div>

            {currentQuestion.constraints && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm mb-2">Constraints:</h3>
                <p className="text-sm text-muted-foreground">{currentQuestion.constraints}</p>
              </div>
            )}

            {/* Test Cases Section */}
            {Array.isArray(currentQuestion.test_cases) && currentQuestion.test_cases.length > 0 && (
              <div className="mt-4">
                <h3 className="font-semibold text-sm mb-2">Test Cases:</h3>
                <div className="space-y-3">
                  {(currentQuestion.test_cases as { input: Record<string, unknown>; expected: unknown }[]).slice(0, 3).map((tc, idx) => (
                    <div key={idx} className="bg-muted/50 p-3 rounded-lg border text-sm font-mono">
                      <div className="flex flex-col gap-1">
                        <div>
                          <span className="text-muted-foreground">Input: </span>
                          <span className="text-foreground">
                            {Object.entries(tc.input).map(([key, value]) => `${key} = ${JSON.stringify(value)}`).join(', ')}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Expected Output: </span>
                          <span className="text-green-600 dark:text-green-400 font-semibold">{JSON.stringify(tc.expected)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(currentQuestion.test_cases as unknown[]).length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      + {(currentQuestion.test_cases as unknown[]).length - 3} hidden test cases
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Question Navigation */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <div className="flex gap-2">
                {questions.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentQuestionIndex(i)}
                    className={`w-8 h-8 rounded-full text-sm font-medium ${
                      i === currentQuestionIndex 
                        ? 'bg-primary text-primary-foreground' 
                        : testResults[questions[i].id]?.passed === testResults[questions[i].id]?.total && testResults[questions[i].id]?.total > 0
                        ? 'bg-green-500 text-white'
                        : 'bg-muted'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
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
          </div>

          {/* Code Editor Panel */}
          <div className="flex flex-col overflow-hidden">
            <div className="p-3 bg-muted/50 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Language:</span>
                <Select
                  value={questionLanguages[currentQuestion.id] || 'javascript'}
                  onValueChange={(value) => handleLanguageChange(value as ProgrammingLanguage)}
                >
                  <SelectTrigger className="w-[140px] h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                {currentResult && (
                  <Badge variant={currentResult.passed === currentResult.total ? 'default' : 'destructive'}>
                    {currentResult.passed}/{currentResult.total} tests passed
                  </Badge>
                )}
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => runTests(currentQuestion.id)}
                  disabled={isRunningTests}
                >
                  {isRunningTests ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 mr-1" />
                  )}
                  Run Tests
                </Button>
              </div>
            </div>
            
            {/* Code Editor */}
            <Textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => setAnswers(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
              className="flex-1 font-mono text-sm resize-none rounded-none border-0 focus-visible:ring-0 min-h-[300px]"
              placeholder="Write your code here..."
            />
            
            {/* Test Results Panel */}
            {currentResult?.results && currentResult.results.length > 0 && (
              <div className="border-t bg-muted/30 p-3 max-h-[200px] overflow-y-auto">
                <h4 className="text-sm font-semibold mb-2">Test Results:</h4>
                <div className="space-y-2">
                  {currentResult.results.map((result, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded-md border text-xs font-mono ${
                        result.passed 
                          ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800' 
                          : 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        {result.passed ? (
                          <CheckCircle className="w-3 h-3 text-green-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-red-600" />
                        )}
                        <span className={result.passed ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}>
                          Test Case {idx + 1}: {result.passed ? 'Passed' : 'Failed'}
                        </span>
                      </div>
                      <div className="pl-5 space-y-0.5 text-muted-foreground">
                        <div>Input: {JSON.stringify(result.input)}</div>
                        <div>Expected: <span className="text-green-600">{JSON.stringify(result.expected)}</span></div>
                        {!result.passed && (
                          <>
                            <div>Got: <span className="text-red-600">{result.actual !== null ? JSON.stringify(result.actual) : 'null'}</span></div>
                            {result.error && (
                              <div className="text-red-500">Error: {result.error}</div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Confirm Submit Dialog */}
        <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Submit Exam?
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to submit? You cannot make changes after submission.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 py-4">
              <p className="text-sm">Questions answered:</p>
              <div className="flex gap-2">
                {questions.map((q, i) => {
                  const result = testResults[q.id];
                  const hasCode = (answers[q.id]?.length || 0) > 50;
                  return (
                    <div
                      key={q.id}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                        result?.passed === result?.total && result?.total > 0
                          ? 'bg-green-500 text-white'
                          : hasCode
                          ? 'bg-yellow-500 text-white'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {i + 1}
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirmSubmit(false)}>
                Continue Exam
              </Button>
              <Button variant="destructive" onClick={handleSubmitExam} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Submit Exam
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Exams list view
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-heading font-bold text-foreground">Online Assessments</h1>
        <p className="text-muted-foreground mt-1">Complete coding assessments for your applications</p>
      </motion.div>

      {assessments.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="py-12 text-center">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No assessments available</p>
            <p className="text-sm text-muted-foreground mt-1">
              Assessments will appear here once your applications are approved by faculty
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assessments.map((assessment, index) => {
            const attempt = getAttemptForAssessment(assessment.id);
            const isCompleted = attempt && attempt.status !== 'in_progress';

            return (
              <motion.div
                key={assessment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card variant="interactive" className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Code className="w-7 h-7 text-primary" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold">{assessment.title}</h3>
                          <p className="text-muted-foreground">
                            {assessment.jobs?.title} • {assessment.jobs?.company_name}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {assessment.duration_minutes} minutes
                            </span>
                            <span className="flex items-center gap-1">
                              Pass: {assessment.passing_score}%
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {isCompleted ? (
                          <div className="space-y-2">
                            <Badge variant={attempt.status === 'passed' ? 'default' : 'destructive'} className="flex items-center gap-1">
                              {attempt.status === 'passed' ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {attempt.status === 'passed' ? 'Passed' : 'Failed'}
                            </Badge>
                            <p className="text-2xl font-bold">{attempt.percentage_score}%</p>
                          </div>
                        ) : (
                          <Button onClick={() => startExam(assessment)} className="gap-2">
                            <Play className="w-4 h-4" />
                            {attempt ? 'Continue' : 'Start Exam'}
                          </Button>
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
