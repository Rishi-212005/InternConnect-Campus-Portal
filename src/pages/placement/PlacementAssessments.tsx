import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ClipboardList,
  Plus,
  Play,
  Users,
  Clock,
  CheckCircle,
  Loader2,
  Trash2,
  Eye,
  Calendar,
  Target,
  FileQuestion,
  Save,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useJobs } from '@/hooks/useJobs';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Assessment {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  passing_score: number;
  start_time: string | null;
  end_time: string | null;
  status: string;
  created_at: string;
  total_marks: number;
  jobs?: { title: string; company_name: string };
}

interface QuizQuestion {
  id?: string;
  assessment_id?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  marks: number;
}

const PlacementAssessments: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { jobs } = useJobs('active');
  const { toast } = useToast();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);
  const [showAddQuestionsDialog, setShowAddQuestionsDialog] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  const [isSavingQuestions, setIsSavingQuestions] = useState(false);
  
  const [formData, setFormData] = useState({
    job_id: '',
    title: '',
    description: '',
    duration_minutes: 60,
    passing_score: 60,
    start_time: '',
    end_time: '',
  });

  // New question form
  const [newQuestions, setNewQuestions] = useState<QuizQuestion[]>([{
    question_text: '',
    option_a: '',
    option_b: '',
    option_c: '',
    option_d: '',
    correct_answer: 'a',
    marks: 1,
  }]);

  const fetchAssessments = async () => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select(`
          *,
          jobs (title, company_name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssessments(data || []);
    } catch (error: any) {
      console.error('Error fetching assessments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchEligibleStudents = async (jobId: string) => {
    const { data } = await supabase
      .from('applications')
      .select(`
        id,
        student_id,
        profiles!inner (full_name, email),
        student_profiles!inner (department, cgpa)
      `)
      .eq('job_id', jobId)
      .eq('status', 'faculty_approved');
    
    return data || [];
  };

  const fetchQuestions = async (assessmentId: string) => {
    const { data } = await supabase
      .from('quiz_questions')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('created_at', { ascending: true });
    
    return data || [];
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  const handleCreateAssessment = async () => {
    if (!formData.job_id || !formData.title) {
      toast({ title: 'Error', description: 'Please fill in required fields', variant: 'destructive' });
      return;
    }

    try {
      const { data: assessment, error } = await supabase
        .from('assessments')
        .insert({
          job_id: formData.job_id,
          title: formData.title,
          description: formData.description || null,
          duration_minutes: formData.duration_minutes,
          passing_score: formData.passing_score,
          start_time: formData.start_time || null,
          end_time: formData.end_time || null,
          status: 'draft',
          created_by: user?.id,
          total_marks: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: 'Success', description: 'Assessment created! Now add MCQ questions (minimum 10).' });
      setShowCreateDialog(false);
      setFormData({
        job_id: '',
        title: '',
        description: '',
        duration_minutes: 60,
        passing_score: 60,
        start_time: '',
        end_time: '',
      });
      
      // Open add questions dialog for the new assessment
      setSelectedAssessment(assessment);
      setShowAddQuestionsDialog(true);
      fetchAssessments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleAddQuestion = () => {
    setNewQuestions(prev => [...prev, {
      question_text: '',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: 'a',
      marks: 1,
    }]);
  };

  const handleRemoveQuestion = (index: number) => {
    if (newQuestions.length > 1) {
      setNewQuestions(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleQuestionChange = (index: number, field: keyof QuizQuestion, value: string | number) => {
    setNewQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const handleSaveQuestions = async () => {
    if (!selectedAssessment) return;

    // Validate all questions
    const validQuestions = newQuestions.filter(q => 
      q.question_text.trim() && 
      q.option_a.trim() && 
      q.option_b.trim() && 
      q.option_c.trim() && 
      q.option_d.trim()
    );

    if (validQuestions.length < 10) {
      toast({ 
        title: 'Minimum 10 Questions Required', 
        description: `You have ${validQuestions.length} valid questions. Please add at least ${10 - validQuestions.length} more.`,
        variant: 'destructive' 
      });
      return;
    }

    setIsSavingQuestions(true);

    try {
      const questionsToInsert = validQuestions.map(q => ({
        assessment_id: selectedAssessment.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        marks: q.marks,
      }));

      const { error } = await supabase
        .from('quiz_questions')
        .insert(questionsToInsert);

      if (error) throw error;

      // Update total marks in assessment
      const totalMarks = validQuestions.reduce((sum, q) => sum + q.marks, 0);
      await supabase
        .from('assessments')
        .update({ total_marks: totalMarks })
        .eq('id', selectedAssessment.id);

      toast({ title: 'Success', description: `${validQuestions.length} questions added successfully!` });
      setShowAddQuestionsDialog(false);
      setNewQuestions([{
        question_text: '',
        option_a: '',
        option_b: '',
        option_c: '',
        option_d: '',
        correct_answer: 'a',
        marks: 1,
      }]);
      fetchAssessments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsSavingQuestions(false);
    }
  };

  const handleActivateAssessment = async (assessmentId: string, jobId: string) => {
    try {
      // Check if assessment has minimum 10 questions
      const questions = await fetchQuestions(assessmentId);
      
      if (questions.length < 10) {
        toast({ 
          title: 'Cannot Activate', 
          description: `Assessment needs at least 10 questions. Currently has ${questions.length}.`,
          variant: 'destructive' 
        });
        return;
      }

      await supabase
        .from('assessments')
        .update({ 
          status: 'active',
          start_time: new Date().toISOString(),
        })
        .eq('id', assessmentId);

      // Notify eligible students
      const students = await fetchEligibleStudents(jobId);
      
      for (const student of students) {
        await supabase.from('notifications').insert({
          user_id: student.student_id,
          title: 'Quiz Assessment Available',
          message: 'A new quiz assessment is now available for you. Complete it before the deadline.',
          link: '/student/exams',
        });
      }

      toast({ 
        title: 'Assessment Activated', 
        description: `${students.length} students have been notified` 
      });
      fetchAssessments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleViewQuestions = async (assessment: Assessment) => {
    setSelectedAssessment(assessment);
    
    const questionsData = await fetchQuestions(assessment.id);
    setQuestions(questionsData);
    
    const students = await fetchEligibleStudents(assessment.job_id);
    setEligibleStudents(students);
    
    setShowQuestionsDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Scheduled</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Quiz Assessments</h1>
          <p className="text-muted-foreground mt-1">Create and manage MCQ quiz assessments for candidates</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Assessment
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <ClipboardList className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{assessments.length}</p>
            <p className="text-sm text-muted-foreground">Total Assessments</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Play className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{assessments.filter(a => a.status === 'active').length}</p>
            <p className="text-sm text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Clock className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{assessments.filter(a => a.status === 'draft').length}</p>
            <p className="text-sm text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{assessments.filter(a => a.status === 'completed').length}</p>
            <p className="text-sm text-muted-foreground">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Assessments List */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>All Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No assessments created yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                Create Your First Assessment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {assessments.map((assessment, index) => (
                <motion.div
                  key={assessment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileQuestion className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{assessment.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {assessment.jobs?.title} • {assessment.jobs?.company_name}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {assessment.duration_minutes} mins
                        </span>
                        <span className="flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          Pass: {assessment.passing_score}%
                        </span>
                        <span className="flex items-center gap-1">
                          <FileQuestion className="w-3 h-3" />
                          {assessment.total_marks || 0} marks
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(assessment.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(assessment.status)}
                    <Button variant="outline" size="sm" onClick={() => handleViewQuestions(assessment)}>
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    {assessment.status === 'draft' && (
                      <>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            setSelectedAssessment(assessment);
                            setShowAddQuestionsDialog(true);
                          }}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Questions
                        </Button>
                        <Button 
                          variant="accent" 
                          size="sm"
                          onClick={() => handleActivateAssessment(assessment.id, assessment.job_id)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Activate
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Assessment Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Quiz Assessment</DialogTitle>
            <DialogDescription>
              Create a MCQ quiz assessment for job applicants
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Job *</Label>
              <Select value={formData.job_id} onValueChange={(v) => setFormData(prev => ({ ...prev, job_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a job posting" />
                </SelectTrigger>
                <SelectContent>
                  {jobs.map(job => (
                    <SelectItem key={job.id} value={job.id}>
                      {job.title} - {job.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assessment Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Technical Assessment Round 1"
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the assessment..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData(prev => ({ ...prev, duration_minutes: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  value={formData.passing_score}
                  onChange={(e) => setFormData(prev => ({ ...prev, passing_score: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="p-3 bg-primary/10 rounded-lg">
              <p className="text-sm">
                <strong>Note:</strong> After creating the assessment, you'll need to add at least 10 MCQ questions before activating.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssessment}>
              Create Assessment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Questions Dialog */}
      <Dialog open={showAddQuestionsDialog} onOpenChange={setShowAddQuestionsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add MCQ Questions</DialogTitle>
            <DialogDescription>
              Add at least 10 questions to {selectedAssessment?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {newQuestions.map((question, index) => (
              <Card key={index} variant="outline" className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold">Question {index + 1}</h4>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm">Marks:</Label>
                      <Input
                        type="number"
                        min="1"
                        value={question.marks}
                        onChange={(e) => handleQuestionChange(index, 'marks', parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </div>
                    {newQuestions.length > 1 && (
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleRemoveQuestion(index)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Question Text *</Label>
                    <Textarea
                      value={question.question_text}
                      onChange={(e) => handleQuestionChange(index, 'question_text', e.target.value)}
                      placeholder="Enter your question..."
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Option A *</Label>
                      <Input
                        value={question.option_a}
                        onChange={(e) => handleQuestionChange(index, 'option_a', e.target.value)}
                        placeholder="Option A"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Option B *</Label>
                      <Input
                        value={question.option_b}
                        onChange={(e) => handleQuestionChange(index, 'option_b', e.target.value)}
                        placeholder="Option B"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Option C *</Label>
                      <Input
                        value={question.option_c}
                        onChange={(e) => handleQuestionChange(index, 'option_c', e.target.value)}
                        placeholder="Option C"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Option D *</Label>
                      <Input
                        value={question.option_d}
                        onChange={(e) => handleQuestionChange(index, 'option_d', e.target.value)}
                        placeholder="Option D"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Correct Answer *</Label>
                    <Select 
                      value={question.correct_answer} 
                      onValueChange={(v) => handleQuestionChange(index, 'correct_answer', v as 'a' | 'b' | 'c' | 'd')}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="a">Option A</SelectItem>
                        <SelectItem value="b">Option B</SelectItem>
                        <SelectItem value="c">Option C</SelectItem>
                        <SelectItem value="d">Option D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>
            ))}

            <Button variant="outline" onClick={handleAddQuestion} className="w-full gap-2">
              <Plus className="w-4 h-4" />
              Add Another Question
            </Button>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <p className="text-sm">
                Total Questions: <strong>{newQuestions.length}</strong> | 
                Total Marks: <strong>{newQuestions.reduce((sum, q) => sum + q.marks, 0)}</strong>
              </p>
              {newQuestions.length < 10 && (
                <p className="text-sm text-destructive">
                  Need {10 - newQuestions.length} more questions
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowAddQuestionsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveQuestions} disabled={isSavingQuestions} className="gap-2">
              {isSavingQuestions ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Questions
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Questions Dialog */}
      <Dialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedAssessment?.title}</DialogTitle>
            <DialogDescription>
              {selectedAssessment?.jobs?.title} • {selectedAssessment?.jobs?.company_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Eligible Students */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Eligible Students ({eligibleStudents.length})
              </h3>
              {eligibleStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No eligible students (faculty approved) yet</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {eligibleStudents.slice(0, 6).map((student: any) => (
                    <div key={student.id} className="p-2 bg-muted/50 rounded text-sm">
                      {student.profiles?.full_name || 'Unknown'}
                    </div>
                  ))}
                  {eligibleStudents.length > 6 && (
                    <div className="p-2 bg-muted/50 rounded text-sm text-muted-foreground">
                      +{eligibleStudents.length - 6} more
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Questions */}
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <FileQuestion className="w-4 h-4" />
                Quiz Questions ({questions.length})
              </h3>
              {questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions added yet</p>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, index) => (
                    <div key={q.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                          {index + 1}. {q.question_text}
                        </h4>
                        <Badge variant="outline">{q.marks} marks</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className={`p-2 rounded ${q.correct_answer === 'a' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-muted'}`}>
                          A: {q.option_a}
                        </div>
                        <div className={`p-2 rounded ${q.correct_answer === 'b' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-muted'}`}>
                          B: {q.option_b}
                        </div>
                        <div className={`p-2 rounded ${q.correct_answer === 'c' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-muted'}`}>
                          C: {q.option_c}
                        </div>
                        <div className={`p-2 rounded ${q.correct_answer === 'd' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' : 'bg-muted'}`}>
                          D: {q.option_d}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t">
            <Button onClick={() => setShowQuestionsDialog(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlacementAssessments;