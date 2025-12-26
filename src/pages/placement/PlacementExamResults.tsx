import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Trophy,
  Users,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  Clock,
  Send,
  Eye,
  FileText,
  Download,
  ExternalLink,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import StudentProfileModal from '@/components/faculty/StudentProfileModal';

interface ExamResult {
  id: string;
  assessment_id: string;
  student_id: string;
  total_score: number;
  percentage_score: number;
  status: string;
  submitted_at: string;
  result_confirmed: boolean;
  result_confirmed_at: string | null;
  next_round_info: string | null;
  assessment?: {
    title: string;
    passing_score: number;
    job_id: string;
    total_marks: number;
    jobs?: { title: string; company_name: string; recruiter_id: string };
  };
  profile?: { full_name: string; email: string; phone?: string; avatar_url?: string };
  student_profile?: { 
    department: string; 
    cgpa: number; 
    roll_number?: string;
    skills?: string[];
    resume_url?: string;
    linkedin_url?: string;
    github_url?: string;
    year_of_study?: number;
  };
  application_id?: string;
}

const PlacementExamResults: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();
  
  const [results, setResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'passed' | 'failed'>('pending');
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    duration: 30,
    meetingLink: '',
    notes: '',
  });

  const fetchResults = async () => {
    try {
      const { data, error } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          assessments (
            title,
            passing_score,
            job_id,
            total_marks,
            jobs (title, company_name, recruiter_id)
          )
        `)
        .in('status', ['passed', 'failed'])
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      // Fetch student profiles
      const studentIds = [...new Set(data?.map(r => r.student_id) || [])];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email, phone, avatar_url')
        .in('user_id', studentIds);

      const { data: studentProfiles } = await supabase
        .from('student_profiles')
        .select('user_id, department, cgpa, roll_number, skills, resume_url, linkedin_url, github_url, year_of_study')
        .in('user_id', studentIds);

      const enrichedResults = data?.map(r => ({
        ...r,
        assessment: r.assessments,
        profile: profiles?.find(p => p.user_id === r.student_id),
        student_profile: studentProfiles?.find(sp => sp.user_id === r.student_id),
      })) || [];

      setResults(enrichedResults);
    } catch (error: any) {
      console.error('Error fetching results:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, []);

  const handleViewProfile = (result: ExamResult) => {
    setSelectedStudent({
      full_name: result.profile?.full_name || 'Unknown',
      email: result.profile?.email || '',
      phone: result.profile?.phone,
      avatar_url: result.profile?.avatar_url,
      roll_number: result.student_profile?.roll_number,
      department: result.student_profile?.department,
      year_of_study: result.student_profile?.year_of_study,
      cgpa: result.student_profile?.cgpa,
      skills: result.student_profile?.skills,
      resume_url: result.student_profile?.resume_url,
      linkedin_url: result.student_profile?.linkedin_url,
      github_url: result.student_profile?.github_url,
    });
    setShowProfileDialog(true);
  };

  const handleSelectResult = (resultId: string) => {
    setSelectedResults(prev => 
      prev.includes(resultId) 
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    );
  };

  const handleSelectAll = (type: 'passed' | 'failed') => {
    const ids = results
      .filter(r => r.status === type && !r.result_confirmed)
      .map(r => r.id);
    setSelectedResults(ids);
  };

  const handleConfirmResults = async (status: 'passed' | 'failed', nextRoundInfo?: string) => {
    if (selectedResults.length === 0) {
      toast({ title: 'Error', description: 'Please select students first', variant: 'destructive' });
      return;
    }

    setIsConfirming(true);

    try {
      const selectedResultsData = results.filter(r => selectedResults.includes(r.id));
      
      for (const result of selectedResultsData) {
        // Update exam attempt with confirmation
        await supabase
          .from('exam_attempts')
          .update({
            result_confirmed: true,
            result_confirmed_at: new Date().toISOString(),
            result_confirmed_by: user?.id,
            next_round_info: status === 'passed' ? (nextRoundInfo || 'Interview will be scheduled soon') : null,
          })
          .eq('id', result.id);

        // Notify student (in-app)
        const message = status === 'passed' 
          ? `Congratulations! You have passed the assessment for ${result.assessment?.jobs?.title} at ${result.assessment?.jobs?.company_name}. ${nextRoundInfo || 'Interview will be scheduled soon.'}`
          : `We regret to inform you that you did not pass the assessment for ${result.assessment?.jobs?.title} at ${result.assessment?.jobs?.company_name}. Better luck next time!`;

        await supabase.from('notifications').insert({
          user_id: result.student_id,
          title: status === 'passed' ? 'Assessment Passed! 🎉' : 'Assessment Result',
          message,
          link: '/student/applications',
        });

        // Send email notification
        if (result.profile?.email) {
          await supabase.functions.invoke('send-notification', {
            body: {
              type: status === 'passed' ? 'exam_passed' : 'exam_failed',
              recipientEmail: result.profile.email,
              recipientName: result.profile.full_name || 'Student',
              data: {
                jobTitle: result.assessment?.jobs?.title,
                companyName: result.assessment?.jobs?.company_name,
                assessmentTitle: result.assessment?.title,
                score: `${result.percentage_score?.toFixed(1)}%`,
                passingScore: `${result.assessment?.passing_score}%`,
                nextRoundInfo: status === 'passed' ? (nextRoundInfo || 'Interview will be scheduled soon') : undefined,
              },
            },
          });
        }
      }

      toast({ 
        title: 'Results Confirmed', 
        description: `${selectedResultsData.length} student(s) notified via email` 
      });
      
      setSelectedResults([]);
      fetchResults();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsConfirming(false);
    }
  };

  const handleScheduleInterviews = async () => {
    if (!scheduleData.date || !scheduleData.time) {
      toast({ title: 'Error', description: 'Please select date and time', variant: 'destructive' });
      return;
    }

    setIsScheduling(true);

    try {
      const selectedResultsData = results.filter(r => selectedResults.includes(r.id));
      
      for (let i = 0; i < selectedResultsData.length; i++) {
        const result = selectedResultsData[i];
        
        // Calculate interview time (duration apart)
        const baseDate = new Date(`${scheduleData.date}T${scheduleData.time}`);
        const interviewTime = new Date(baseDate.getTime() + (i * scheduleData.duration * 60000));

        // Find the application
        const { data: application } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', result.assessment?.job_id)
          .eq('student_id', result.student_id)
          .maybeSingle();

        if (!application) continue;

        // Create interview schedule
        await supabase.from('interview_schedules').insert({
          application_id: application.id,
          scheduled_at: interviewTime.toISOString(),
          duration_minutes: scheduleData.duration,
          meeting_link: scheduleData.meetingLink || null,
          scheduled_by: user?.id,
          interview_status: 'scheduled',
          notes: scheduleData.notes || null,
        });

        // Update application status
        await supabase
          .from('applications')
          .update({ status: 'interview' })
          .eq('id', application.id);

        // Update exam attempt with next round info
        await supabase
          .from('exam_attempts')
          .update({ 
            next_round_info: `Interview scheduled for ${format(interviewTime, 'MMM dd, yyyy h:mm a')}` 
          })
          .eq('id', result.id);

        // Notify student
        await supabase.from('notifications').insert({
          user_id: result.student_id,
          title: 'Interview Scheduled! 🎉',
          message: `Your interview for ${result.assessment?.jobs?.title} at ${result.assessment?.jobs?.company_name} is scheduled for ${format(interviewTime, 'MMM dd, yyyy h:mm a')}`,
          link: '/student/schedule',
        });

        // Notify recruiter
        if (result.assessment?.jobs?.recruiter_id) {
          await supabase.from('notifications').insert({
            user_id: result.assessment.jobs.recruiter_id,
            title: 'Interview Scheduled',
            message: `Interview scheduled with ${result.profile?.full_name} for ${result.assessment?.jobs?.title} on ${format(interviewTime, 'MMM dd, yyyy h:mm a')}`,
            link: '/recruiter/interviews',
          });
        }
      }

      toast({ 
        title: 'Interviews Scheduled', 
        description: `${selectedResultsData.length} interviews have been scheduled` 
      });
      
      setShowScheduleDialog(false);
      setSelectedResults([]);
      setScheduleData({ date: '', time: '', duration: 30, meetingLink: '', notes: '' });
      fetchResults();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsScheduling(false);
    }
  };

  // Filter results
  const pendingResults = results.filter(r => !r.result_confirmed);
  const confirmedPassedResults = results.filter(r => r.status === 'passed' && r.result_confirmed);
  const confirmedFailedResults = results.filter(r => r.status === 'failed' && r.result_confirmed);
  
  const pendingPassed = pendingResults.filter(r => r.status === 'passed');
  const pendingFailed = pendingResults.filter(r => r.status === 'failed');

  const currentResults = activeTab === 'pending' 
    ? pendingResults 
    : activeTab === 'passed' 
      ? confirmedPassedResults 
      : confirmedFailedResults;

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
          <h1 className="text-3xl font-heading font-bold text-foreground">Exam Results</h1>
          <p className="text-muted-foreground mt-1">Confirm results and schedule interviews</p>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{results.length}</p>
            <p className="text-sm text-muted-foreground">Total Attempts</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="cursor-pointer hover:ring-2 ring-yellow-500" onClick={() => setActiveTab('pending')}>
          <CardContent className="pt-4 text-center">
            <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{pendingResults.length}</p>
            <p className="text-sm text-muted-foreground">Pending Confirmation</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="cursor-pointer hover:ring-2 ring-green-500" onClick={() => setActiveTab('passed')}>
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{confirmedPassedResults.length}</p>
            <p className="text-sm text-muted-foreground">Confirmed Passed</p>
          </CardContent>
        </Card>
        <Card variant="glass" className="cursor-pointer hover:ring-2 ring-red-500" onClick={() => setActiveTab('failed')}>
          <CardContent className="pt-4 text-center">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{confirmedFailedResults.length}</p>
            <p className="text-sm text-muted-foreground">Confirmed Failed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button 
          variant={activeTab === 'pending' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('pending')}
          className="gap-2"
        >
          <AlertCircle className="w-4 h-4" />
          Pending ({pendingResults.length})
        </Button>
        <Button 
          variant={activeTab === 'passed' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('passed')}
          className="gap-2"
        >
          <CheckCircle className="w-4 h-4" />
          Passed ({confirmedPassedResults.length})
        </Button>
        <Button 
          variant={activeTab === 'failed' ? 'default' : 'ghost'} 
          onClick={() => setActiveTab('failed')}
          className="gap-2"
        >
          <XCircle className="w-4 h-4" />
          Failed ({confirmedFailedResults.length})
        </Button>
      </div>

      {/* Action Buttons */}
      {activeTab === 'pending' && selectedResults.length > 0 && (
        <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground self-center">
            {selectedResults.length} selected
          </span>
          <Button 
            size="sm" 
            className="gap-2 bg-green-600 hover:bg-green-700"
            onClick={() => handleConfirmResults('passed')}
            disabled={isConfirming}
          >
            <ThumbsUp className="w-4 h-4" />
            Confirm Passed
          </Button>
          <Button 
            size="sm" 
            variant="destructive"
            className="gap-2"
            onClick={() => handleConfirmResults('failed')}
            disabled={isConfirming}
          >
            <ThumbsDown className="w-4 h-4" />
            Confirm Failed
          </Button>
        </div>
      )}

      {activeTab === 'passed' && selectedResults.length > 0 && (
        <div className="flex gap-2 p-3 bg-muted/50 rounded-lg">
          <span className="text-sm text-muted-foreground self-center">
            {selectedResults.length} selected
          </span>
          <Button 
            size="sm" 
            className="gap-2"
            onClick={() => setShowScheduleDialog(true)}
          >
            <Calendar className="w-4 h-4" />
            Schedule Interviews
          </Button>
        </div>
      )}

      {/* Results List */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {activeTab === 'pending' && `Pending Confirmation (${pendingResults.length})`}
            {activeTab === 'passed' && `Confirmed Passed (${confirmedPassedResults.length})`}
            {activeTab === 'failed' && `Confirmed Failed (${confirmedFailedResults.length})`}
          </CardTitle>
          {activeTab === 'pending' && pendingResults.length > 0 && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => handleSelectAll('passed')}>
                Select All Passed ({pendingPassed.length})
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleSelectAll('failed')}>
                Select All Failed ({pendingFailed.length})
              </Button>
            </div>
          )}
          {activeTab === 'passed' && confirmedPassedResults.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => {
              const ids = confirmedPassedResults.map(r => r.id);
              setSelectedResults(ids);
            }}>
              Select All for Interview
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {currentResults.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {activeTab === 'pending' && 'No pending results to confirm'}
              {activeTab === 'passed' && 'No confirmed passed students'}
              {activeTab === 'failed' && 'No confirmed failed students'}
            </p>
          ) : (
            <div className="space-y-3">
              {currentResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors ${
                    selectedResults.includes(result.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-transparent bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {(activeTab === 'pending' || activeTab === 'passed') && (
                      <div 
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer ${
                          selectedResults.includes(result.id) ? 'border-primary bg-primary' : 'border-muted-foreground'
                        }`}
                        onClick={() => handleSelectResult(result.id)}
                      >
                        {selectedResults.includes(result.id) && (
                          <CheckCircle className="w-3 h-3 text-primary-foreground" />
                        )}
                      </div>
                    )}
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                      result.status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {result.profile?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="font-semibold">{result.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.student_profile?.roll_number} • {result.student_profile?.department} • CGPA: {result.student_profile?.cgpa || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.assessment?.jobs?.title} • {result.assessment?.jobs?.company_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={`text-xl font-bold ${result.status === 'passed' ? 'text-green-600' : 'text-red-600'}`}>
                        {result.percentage_score}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.total_score}/{result.assessment?.total_marks || 0} marks
                      </p>
                    </div>
                    <Badge className={result.status === 'passed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                      {result.status === 'passed' ? 'Passed' : 'Failed'}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleViewProfile(result)}
                      className="gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      View Profile
                    </Button>
                    {result.student_profile?.resume_url && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => window.open(result.student_profile?.resume_url, '_blank')}
                        className="gap-1"
                      >
                        <FileText className="w-4 h-4" />
                        Resume
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Interview Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Schedule Interviews
            </DialogTitle>
            <DialogDescription>
              Schedule interviews for {selectedResults.length} selected candidates
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">Selected Candidates:</p>
              <div className="flex flex-wrap gap-1 mt-2">
                {selectedResults.slice(0, 5).map(id => {
                  const result = results.find(r => r.id === id);
                  return (
                    <Badge key={id} variant="secondary">
                      {result?.profile?.full_name}
                    </Badge>
                  );
                })}
                {selectedResults.length > 5 && (
                  <Badge variant="outline">+{selectedResults.length - 5} more</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, date: e.target.value }))}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div className="space-y-2">
                <Label>Start Time *</Label>
                <Input
                  type="time"
                  value={scheduleData.time}
                  onChange={(e) => setScheduleData(prev => ({ ...prev, time: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration per Interview (minutes)</Label>
              <Input
                type="number"
                value={scheduleData.duration}
                onChange={(e) => setScheduleData(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
                min={15}
                max={120}
              />
              <p className="text-xs text-muted-foreground">
                Interviews will be scheduled {scheduleData.duration} minutes apart
              </p>
            </div>

            <div className="space-y-2">
              <Label>Meeting Link (Optional)</Label>
              <Input
                value={scheduleData.meetingLink}
                onChange={(e) => setScheduleData(prev => ({ ...prev, meetingLink: e.target.value }))}
                placeholder="https://meet.google.com/..."
              />
            </div>

            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                value={scheduleData.notes}
                onChange={(e) => setScheduleData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional instructions..."
                rows={2}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleScheduleInterviews} disabled={isScheduling}>
              {isScheduling ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Scheduling...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Schedule & Notify</>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <StudentProfileModal
          isOpen={showProfileDialog}
          onClose={() => {
            setShowProfileDialog(false);
            setSelectedStudent(null);
          }}
          student={selectedStudent}
        />
      )}
    </div>
  );
};

export default PlacementExamResults;
