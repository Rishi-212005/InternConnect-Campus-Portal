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
  AlertCircle,
  Loader2,
  Code,
  Trash2,
  Eye,
  Calendar,
  Target,
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
  jobs?: { title: string; company_name: string };
}

interface CodingQuestion {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  points: number;
  test_cases: unknown;
}

const sampleQuestions = [
  {
    title: 'Two Sum',
    description: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nExample:\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: nums[0] + nums[1] == 9, so we return [0, 1].',
    difficulty: 'easy',
    constraints: 'Array length: 2 <= nums.length <= 10^4',
    examples: 'Input: nums = [2,7,11,15], target = 9\nOutput: [0,1]',
    starter_code: 'function twoSum(nums, target) {\n  // Your code here\n}',
    test_cases: [
      { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
      { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
      { input: { nums: [3, 3], target: 6 }, expected: [0, 1] },
    ],
    points: 50,
  },
  {
    title: 'Valid Parentheses',
    description: 'Given a string s containing just the characters \'(\', \')\', \'{\', \'}\', \'[\' and \']\', determine if the input string is valid.\n\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\nExample:\nInput: s = "()"\nOutput: true',
    difficulty: 'easy',
    constraints: '1 <= s.length <= 10^4',
    examples: 'Input: s = "(){}[]"\nOutput: true',
    starter_code: 'function isValid(s) {\n  // Your code here\n}',
    test_cases: [
      { input: { s: '()' }, expected: true },
      { input: { s: '()[]{}' }, expected: true },
      { input: { s: '(]' }, expected: false },
    ],
    points: 50,
  },
  {
    title: 'Palindrome Number',
    description: 'Given an integer x, return true if x is a palindrome, and false otherwise.\n\nExample:\nInput: x = 121\nOutput: true\nExplanation: 121 reads as 121 from left to right and from right to left.',
    difficulty: 'easy',
    constraints: '-2^31 <= x <= 2^31 - 1',
    examples: 'Input: x = 121\nOutput: true',
    starter_code: 'function isPalindrome(x) {\n  // Your code here\n}',
    test_cases: [
      { input: { x: 121 }, expected: true },
      { input: { x: -121 }, expected: false },
      { input: { x: 10 }, expected: false },
    ],
    points: 50,
  },
  {
    title: 'Reverse Linked List',
    description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.\n\nExample:\nInput: head = [1,2,3,4,5]\nOutput: [5,4,3,2,1]',
    difficulty: 'medium',
    constraints: 'The number of nodes in the list is in the range [0, 5000]',
    examples: 'Input: [1,2,3,4,5]\nOutput: [5,4,3,2,1]',
    starter_code: 'function reverseList(head) {\n  // Your code here\n}',
    test_cases: [
      { input: { head: [1, 2, 3, 4, 5] }, expected: [5, 4, 3, 2, 1] },
      { input: { head: [1, 2] }, expected: [2, 1] },
      { input: { head: [] }, expected: [] },
    ],
    points: 75,
  },
];

const PlacementAssessments: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { jobs } = useJobs('active');
  const { toast } = useToast();
  
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<CodingQuestion[]>([]);
  const [eligibleStudents, setEligibleStudents] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    job_id: '',
    title: '',
    description: '',
    duration_minutes: 60,
    passing_score: 60,
    start_time: '',
    end_time: '',
  });

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
        profiles!applications_student_id_fkey (full_name, email),
        student_profiles!applications_student_id_fkey (department, cgpa)
      `)
      .eq('job_id', jobId)
      .eq('status', 'faculty_approved');
    
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
        })
        .select()
        .single();

      if (error) throw error;

      // Add sample coding questions
      const questionsToAdd = sampleQuestions.slice(0, 2).map(q => ({
        assessment_id: assessment.id,
        title: q.title,
        description: q.description,
        difficulty: q.difficulty,
        constraints: q.constraints,
        examples: q.examples,
        starter_code: q.starter_code,
        test_cases: q.test_cases,
        points: q.points,
      }));

      await supabase.from('coding_questions').insert(questionsToAdd);

      toast({ title: 'Success', description: 'Assessment created with 2 coding questions' });
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
      fetchAssessments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleActivateAssessment = async (assessmentId: string, jobId: string) => {
    try {
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
          title: 'Assessment Available',
          message: 'A new coding assessment is now available for you. Complete it before the deadline.',
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
    
    const { data } = await supabase
      .from('coding_questions')
      .select('*')
      .eq('assessment_id', assessment.id);
    
    setQuestions(data || []);
    
    const students = await fetchEligibleStudents(assessment.job_id);
    setEligibleStudents(students);
    
    setShowQuestionsDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'scheduled':
        return <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>;
      case 'active':
        return <Badge className="bg-green-100 text-green-700">Active</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-700">Completed</Badge>;
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Online Assessments</h1>
          <p className="text-muted-foreground mt-1">Create and manage coding assessments for candidates</p>
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
                      <Code className="w-6 h-6 text-primary" />
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
                      <Button 
                        variant="accent" 
                        size="sm"
                        onClick={() => handleActivateAssessment(assessment.id, assessment.job_id)}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Activate
                      </Button>
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
            <DialogTitle>Create New Assessment</DialogTitle>
            <DialogDescription>
              Create a coding assessment for job applicants
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
                <strong>Note:</strong> 2 coding questions will be automatically added (Two Sum & Valid Parentheses). 
                You can customize questions after creation.
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
                <Code className="w-4 h-4" />
                Coding Questions ({questions.length})
              </h3>
              <div className="space-y-3">
                {questions.map((q, index) => (
                  <div key={q.id} className="p-4 border border-border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">
                        {index + 1}. {q.title}
                      </h4>
                      <div className="flex items-center gap-2">
                        <Badge variant={q.difficulty === 'easy' ? 'secondary' : q.difficulty === 'medium' ? 'default' : 'destructive'}>
                          {q.difficulty}
                        </Badge>
                        <Badge variant="outline">{q.points} pts</Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">{q.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {Array.isArray(q.test_cases) ? q.test_cases.length : 0} test cases
                    </p>
                  </div>
                ))}
              </div>
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
