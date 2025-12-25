import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Filter,
  Star,
  Mail,
  GraduationCap,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  FileText,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Database } from '@/integrations/supabase/types';

type ApplicationStatus = Database['public']['Enums']['application_status'];

interface CandidateApplication {
  id: string;
  status: ApplicationStatus | null;
  created_at: string;
  match_score: number | null;
  job: {
    id: string;
    title: string;
    company_name: string;
  } | null;
  student: {
    full_name: string;
    email: string;
    avatar_url: string | null;
  } | null;
  studentProfile: {
    cgpa: number | null;
    department: string | null;
    skills: string[] | null;
    resume_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
  } | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-700' },
  faculty_approved: { label: 'Faculty Approved', color: 'bg-blue-100 text-blue-700' },
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-700' },
  shortlisted: { label: 'Shortlisted', color: 'bg-green-100 text-green-700' },
  interview: { label: 'Interview', color: 'bg-purple-100 text-purple-700' },
  selected: { label: 'Selected', color: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: 'Rejected', color: 'bg-red-100 text-red-700' },
};

const RecruiterCandidates: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [candidates, setCandidates] = useState<CandidateApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingCandidate, setViewingCandidate] = useState<CandidateApplication | null>(null);
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();

  const fetchCandidates = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Get recruiter's jobs first
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id')
        .eq('recruiter_id', user.id);
      
      if (!jobs || jobs.length === 0) {
        setCandidates([]);
        setIsLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);

      // Get applications for these jobs
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          id, status, created_at, match_score,
          jobs (id, title, company_name)
        `)
        .in('job_id', jobIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with student data
      const enrichedCandidates = await Promise.all(
        (applications || []).map(async (app) => {
          const appWithJob = app as any;
          
          // Get student profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url')
            .eq('user_id', appWithJob.student_id || (app as any).student_id)
            .maybeSingle();

          // Get student profile details
          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('cgpa, department, skills, resume_url, linkedin_url, github_url')
            .eq('user_id', appWithJob.student_id || (app as any).student_id)
            .maybeSingle();

          return {
            id: app.id,
            status: app.status,
            created_at: app.created_at,
            match_score: app.match_score,
            job: appWithJob.jobs,
            student: profile,
            studentProfile,
          };
        })
      );

      setCandidates(enrichedCandidates);
    } catch (error: any) {
      console.error('Error fetching candidates:', error);
      toast({ title: 'Error', description: 'Failed to load candidates', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, [user]);

  const updateStatus = async (id: string, newStatus: ApplicationStatus) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setCandidates(prev => prev.map(c => 
        c.id === id ? { ...c, status: newStatus } : c
      ));

      toast({ title: 'Success', description: `Candidate ${newStatus === 'shortlisted' ? 'shortlisted' : 'rejected'}!` });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.studentProfile?.department?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: candidates.length,
    new: candidates.filter(c => c.status === 'faculty_approved' || c.status === 'applied').length,
    shortlisted: candidates.filter(c => c.status === 'shortlisted').length,
    interview: candidates.filter(c => c.status === 'interview').length,
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Candidates</h1>
          <p className="text-muted-foreground mt-1">Review and manage applicants</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-foreground">{stats.total}</p>
            <p className="text-sm text-muted-foreground">Total Candidates</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.new}</p>
            <p className="text-sm text-muted-foreground">New Applications</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">{stats.shortlisted}</p>
            <p className="text-sm text-muted-foreground">Shortlisted</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.interview}</p>
            <p className="text-sm text-muted-foreground">In Interview</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" className="gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </Button>
      </motion.div>

      {/* Candidates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredCandidates.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No candidates yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Applications will appear here once students apply to your jobs
            </p>
          </CardContent>
        </Card>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredCandidates.map((candidate, index) => {
            const status = statusConfig[candidate.status || 'pending'];
            return (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.05 * index }}
              >
                <Card variant="interactive" className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-semibold">
                          {candidate.student?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {candidate.student?.full_name || 'Unknown'}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {candidate.studentProfile?.department || 'No department'}
                          </p>
                        </div>
                      </div>
                      {candidate.match_score && (
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="font-bold text-foreground">{candidate.match_score}%</span>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="w-4 h-4" />
                        {candidate.studentProfile?.cgpa 
                          ? `GPA: ${candidate.studentProfile.cgpa}` 
                          : 'GPA not provided'}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="w-4 h-4" />
                        {candidate.student?.email || 'No email'}
                      </div>
                    </div>

                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        Applied for: {candidate.job?.title || 'Unknown position'}
                      </p>
                      {candidate.studentProfile?.skills && candidate.studentProfile.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {candidate.studentProfile.skills.slice(0, 3).map((skill) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {candidate.studentProfile.skills.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{candidate.studentProfile.skills.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                      <Badge className={status.color}>{status.label}</Badge>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setViewingCandidate(candidate)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {candidate.status !== 'shortlisted' && candidate.status !== 'selected' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-green-600"
                            onClick={() => updateStatus(candidate.id, 'shortlisted')}
                          >
                            <ThumbsUp className="w-4 h-4" />
                          </Button>
                        )}
                        {candidate.status !== 'rejected' && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-red-500"
                            onClick={() => updateStatus(candidate.id, 'rejected')}
                          >
                            <ThumbsDown className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* View Candidate Dialog */}
      <Dialog open={!!viewingCandidate} onOpenChange={() => setViewingCandidate(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Candidate Details</DialogTitle>
          </DialogHeader>
          {viewingCandidate && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-xl font-semibold">
                  {viewingCandidate.student?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{viewingCandidate.student?.full_name}</h3>
                  <p className="text-muted-foreground">{viewingCandidate.student?.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{viewingCandidate.studentProfile?.department || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">CGPA</p>
                  <p className="font-medium">{viewingCandidate.studentProfile?.cgpa || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Applied For</p>
                  <p className="font-medium">{viewingCandidate.job?.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge className={statusConfig[viewingCandidate.status || 'pending'].color}>
                    {statusConfig[viewingCandidate.status || 'pending'].label}
                  </Badge>
                </div>
              </div>

              {viewingCandidate.studentProfile?.skills && viewingCandidate.studentProfile.skills.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {viewingCandidate.studentProfile.skills.map((skill) => (
                      <Badge key={skill} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-4">
                {viewingCandidate.studentProfile?.resume_url && (
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={viewingCandidate.studentProfile.resume_url} target="_blank" rel="noopener noreferrer">
                      <FileText className="w-4 h-4" />
                      View Resume
                    </a>
                  </Button>
                )}
                {viewingCandidate.studentProfile?.linkedin_url && (
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={viewingCandidate.studentProfile.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      LinkedIn
                    </a>
                  </Button>
                )}
                {viewingCandidate.studentProfile?.github_url && (
                  <Button variant="outline" className="gap-2" asChild>
                    <a href={viewingCandidate.studentProfile.github_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4" />
                      GitHub
                    </a>
                  </Button>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="text-red-500"
                  onClick={() => {
                    updateStatus(viewingCandidate.id, 'rejected');
                    setViewingCandidate(null);
                  }}
                >
                  Reject
                </Button>
                <Button 
                  variant="accent"
                  onClick={() => {
                    updateStatus(viewingCandidate.id, 'shortlisted');
                    setViewingCandidate(null);
                  }}
                >
                  Shortlist
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterCandidates;
