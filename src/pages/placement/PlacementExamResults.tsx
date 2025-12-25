import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Video,
  Send,
  User,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ExamResult {
  id: string;
  assessment_id: string;
  student_id: string;
  total_score: number;
  percentage_score: number;
  status: string;
  submitted_at: string;
  assessment?: {
    title: string;
    passing_score: number;
    job_id: string;
    jobs?: { title: string; company_name: string; recruiter_id: string };
  };
  profile?: { full_name: string; email: string };
  student_profile?: { department: string; cgpa: number };
  application_id?: string;
}

const PlacementExamResults: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();
  
  const [results, setResults] = useState<ExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [isScheduling, setIsScheduling] = useState(false);
  
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    duration: 30,
    meetingLink: '',
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
        .select('user_id, full_name, email')
        .in('user_id', studentIds);

      const { data: studentProfiles } = await supabase
        .from('student_profiles')
        .select('user_id, department, cgpa')
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

  const handleSelectResult = (resultId: string) => {
    setSelectedResults(prev => 
      prev.includes(resultId) 
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    );
  };

  const handleSelectAllPassed = () => {
    const passedIds = results.filter(r => r.status === 'passed').map(r => r.id);
    setSelectedResults(passedIds);
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
        
        // Calculate interview time (30 min apart)
        const baseDate = new Date(`${scheduleData.date}T${scheduleData.time}`);
        const interviewTime = new Date(baseDate.getTime() + (i * scheduleData.duration * 60000));

        // Find the application
        const { data: application } = await supabase
          .from('applications')
          .select('id')
          .eq('job_id', result.assessment?.job_id)
          .eq('student_id', result.student_id)
          .single();

        if (!application) continue;

        // Create interview schedule
        await supabase.from('interview_schedules').insert({
          application_id: application.id,
          scheduled_at: interviewTime.toISOString(),
          duration_minutes: scheduleData.duration,
          meeting_link: scheduleData.meetingLink || null,
          scheduled_by: user?.id,
          interview_status: 'scheduled',
        });

        // Update application status
        await supabase
          .from('applications')
          .update({ status: 'interview' })
          .eq('id', application.id);

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
      setScheduleData({ date: '', time: '', duration: 30, meetingLink: '' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsScheduling(false);
    }
  };

  const passedResults = results.filter(r => r.status === 'passed');
  const failedResults = results.filter(r => r.status === 'failed');

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
          <p className="text-muted-foreground mt-1">View assessment results and schedule interviews</p>
        </div>
        {selectedResults.length > 0 && (
          <Button onClick={() => setShowScheduleDialog(true)} className="gap-2">
            <Calendar className="w-4 h-4" />
            Schedule Interviews ({selectedResults.length})
          </Button>
        )}
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
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{passedResults.length}</p>
            <p className="text-sm text-muted-foreground">Passed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <XCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">{failedResults.length}</p>
            <p className="text-sm text-muted-foreground">Failed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {results.length > 0 ? Math.round((passedResults.length / results.length) * 100) : 0}%
            </p>
            <p className="text-sm text-muted-foreground">Pass Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Passed Candidates */}
      <Card variant="elevated">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            Passed Candidates
          </CardTitle>
          {passedResults.length > 0 && (
            <Button variant="outline" size="sm" onClick={handleSelectAllPassed}>
              Select All for Interview
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {passedResults.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No passed candidates yet</p>
          ) : (
            <div className="space-y-3">
              {passedResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 transition-colors cursor-pointer ${
                    selectedResults.includes(result.id) 
                      ? 'border-primary bg-primary/5' 
                      : 'border-transparent bg-muted/30 hover:bg-muted/50'
                  }`}
                  onClick={() => handleSelectResult(result.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedResults.includes(result.id) ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {selectedResults.includes(result.id) && (
                        <CheckCircle className="w-3 h-3 text-primary-foreground" />
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-semibold">
                      {result.profile?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="font-semibold">{result.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.assessment?.jobs?.title} • {result.student_profile?.department}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">{result.percentage_score}%</p>
                      <p className="text-xs text-muted-foreground">
                        {result.submitted_at && format(new Date(result.submitted_at), 'MMM dd, h:mm a')}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-700">Passed</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Failed Candidates */}
      {failedResults.length > 0 && (
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-500" />
              Failed Candidates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {failedResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold">
                      {result.profile?.full_name?.charAt(0) || 'S'}
                    </div>
                    <div>
                      <p className="font-semibold">{result.profile?.full_name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">
                        {result.assessment?.jobs?.title} • Required: {result.assessment?.passing_score}%
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-2xl font-bold text-red-600">{result.percentage_score}%</p>
                    <Badge variant="destructive">Failed</Badge>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
    </div>
  );
};

export default PlacementExamResults;
