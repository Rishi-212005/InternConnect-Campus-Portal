import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Users, 
  Search, 
  Filter,
  Mail,
  GraduationCap,
  Eye,
  Loader2,
  FileText,
  ExternalLink,
  Phone,
  Building,
  Briefcase,
  CheckCircle,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface SelectedCandidate {
  id: string;
  application_id: string;
  job: {
    id: string;
    title: string;
    company_name: string;
  } | null;
  student: {
    user_id: string;
    full_name: string;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
  studentProfile: {
    cgpa: number | null;
    department: string | null;
    year_of_study: number | null;
    roll_number: string | null;
    skills: string[] | null;
    resume_url: string | null;
    linkedin_url: string | null;
    github_url: string | null;
  } | null;
}

const RecruiterCandidates: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidates, setSelectedCandidates] = useState<SelectedCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingCandidate, setViewingCandidate] = useState<SelectedCandidate | null>(null);
  const { user } = useSupabaseAuthContext();
  const { toast } = useToast();

  const fetchSelectedCandidates = async () => {
    if (!user) return;
    setIsLoading(true);
    
    try {
      // Get recruiter's jobs first
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, title, company_name')
        .eq('recruiter_id', user.id);
      
      if (!jobs || jobs.length === 0) {
        setSelectedCandidates([]);
        setIsLoading(false);
        return;
      }

      const jobIds = jobs.map(j => j.id);
      const jobMap = new Map(jobs.map(j => [j.id, j]));

      // Get selected applications for these jobs
      const { data: applications, error } = await supabase
        .from('applications')
        .select('id, student_id, job_id')
        .in('job_id', jobIds)
        .eq('status', 'selected')
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Enrich with student data
      const enrichedCandidates = await Promise.all(
        (applications || []).map(async (app) => {
          // Get student profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, phone, avatar_url')
            .eq('user_id', app.student_id)
            .maybeSingle();

          // Get student profile details
          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('cgpa, department, year_of_study, roll_number, skills, resume_url, linkedin_url, github_url')
            .eq('user_id', app.student_id)
            .maybeSingle();

          return {
            id: app.student_id,
            application_id: app.id,
            job: jobMap.get(app.job_id) || null,
            student: profile,
            studentProfile,
          };
        })
      );

      setSelectedCandidates(enrichedCandidates);
    } catch (error: any) {
      console.error('Error fetching candidates:', error);
      toast({ title: 'Error', description: 'Failed to load candidates', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSelectedCandidates();
  }, [user]);

  const handleDownloadResume = async (resumeUrl: string | null | undefined, studentName: string) => {
    if (!resumeUrl) {
      toast({ title: 'Error', description: 'No resume available', variant: 'destructive' });
      return;
    }

    try {
      if (resumeUrl.startsWith('http')) {
        window.open(resumeUrl, '_blank');
      } else {
        const { data } = await supabase.storage
          .from('resumes')
          .createSignedUrl(resumeUrl, 3600);
        
        if (data?.signedUrl) {
          window.open(data.signedUrl, '_blank');
        }
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to open resume', variant: 'destructive' });
    }
  };

  const filteredCandidates = selectedCandidates.filter(c => 
    c.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.studentProfile?.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.job?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group candidates by job
  const candidatesByJob = filteredCandidates.reduce((acc, candidate) => {
    const jobTitle = candidate.job?.title || 'Unknown Position';
    if (!acc[jobTitle]) {
      acc[jobTitle] = [];
    }
    acc[jobTitle].push(candidate);
    return acc;
  }, {} as Record<string, SelectedCandidate[]>);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Selected Candidates</h1>
          <p className="text-muted-foreground mt-1">View your hired candidates with their complete profiles</p>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{selectedCandidates.length}</p>
            <p className="text-sm text-muted-foreground">Total Selected</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Briefcase className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">{Object.keys(candidatesByJob).length}</p>
            <p className="text-sm text-muted-foreground">Positions Filled</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Users className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-3xl font-bold text-foreground">
              {selectedCandidates.filter(c => c.studentProfile?.resume_url).length}
            </p>
            <p className="text-sm text-muted-foreground">Resumes Available</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-4"
      >
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search candidates by name, department, or position..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </motion.div>

      {/* Candidates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : selectedCandidates.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg font-medium">No selected candidates yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Candidates you select after interviews will appear here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(candidatesByJob).map(([jobTitle, candidates], groupIndex) => (
            <motion.div
              key={jobTitle}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * groupIndex }}
            >
              <Card variant="elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    {jobTitle}
                    <Badge variant="secondary" className="ml-2">{candidates.length} selected</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {candidates.map((candidate, index) => (
                      <motion.div
                        key={candidate.id + candidate.application_id}
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
                              <Badge className="bg-green-100 text-green-700">Selected</Badge>
                            </div>

                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <GraduationCap className="w-4 h-4" />
                                {candidate.studentProfile?.cgpa 
                                  ? `CGPA: ${candidate.studentProfile.cgpa}` 
                                  : 'CGPA not provided'}
                              </div>
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="w-4 h-4" />
                                {candidate.student?.email || 'No email'}
                              </div>
                              {candidate.student?.phone && (
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Phone className="w-4 h-4" />
                                  {candidate.student.phone}
                                </div>
                              )}
                            </div>

                            {candidate.studentProfile?.skills && candidate.studentProfile.skills.length > 0 && (
                              <div className="mt-3">
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
                              </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="gap-1"
                                onClick={() => setViewingCandidate(candidate)}
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </Button>
                              {candidate.studentProfile?.resume_url && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleDownloadResume(
                                    candidate.studentProfile?.resume_url, 
                                    candidate.student?.full_name || 'candidate'
                                  )}
                                >
                                  <Download className="w-4 h-4" />
                                  Resume
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* View Candidate Dialog */}
      <Dialog open={!!viewingCandidate} onOpenChange={() => setViewingCandidate(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Candidate Profile</DialogTitle>
          </DialogHeader>
          {viewingCandidate && (
            <Tabs defaultValue="personal" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="academic">Academic Details</TabsTrigger>
                <TabsTrigger value="documents">Documents & Links</TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center text-primary-foreground text-2xl font-semibold">
                    {viewingCandidate.student?.full_name?.split(' ').map(n => n[0]).join('') || '?'}
                  </div>
                  <div>
                    <h3 className="text-2xl font-semibold">{viewingCandidate.student?.full_name}</h3>
                    <p className="text-muted-foreground">{viewingCandidate.job?.title}</p>
                    <Badge className="bg-green-100 text-green-700 mt-2">Selected Candidate</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Mail className="w-4 h-4" />
                      <span className="text-sm">Email</span>
                    </div>
                    <p className="font-medium">{viewingCandidate.student?.email || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">Phone</span>
                    </div>
                    <p className="font-medium">{viewingCandidate.student?.phone || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Building className="w-4 h-4" />
                      <span className="text-sm">Company</span>
                    </div>
                    <p className="font-medium">{viewingCandidate.job?.company_name || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Briefcase className="w-4 h-4" />
                      <span className="text-sm">Position</span>
                    </div>
                    <p className="font-medium">{viewingCandidate.job?.title || 'N/A'}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="academic" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Department</p>
                    <p className="font-medium text-lg">{viewingCandidate.studentProfile?.department || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">CGPA</p>
                    <p className="font-medium text-lg">{viewingCandidate.studentProfile?.cgpa || 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Year of Study</p>
                    <p className="font-medium text-lg">
                      {viewingCandidate.studentProfile?.year_of_study 
                        ? `${viewingCandidate.studentProfile.year_of_study}${
                            viewingCandidate.studentProfile.year_of_study === 1 ? 'st' :
                            viewingCandidate.studentProfile.year_of_study === 2 ? 'nd' :
                            viewingCandidate.studentProfile.year_of_study === 3 ? 'rd' : 'th'
                          } Year` 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">Roll Number</p>
                    <p className="font-medium text-lg">{viewingCandidate.studentProfile?.roll_number || 'N/A'}</p>
                  </div>
                </div>

                {viewingCandidate.studentProfile?.skills && viewingCandidate.studentProfile.skills.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Skills</p>
                    <div className="flex flex-wrap gap-2">
                      {viewingCandidate.studentProfile.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-sm px-3 py-1">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {viewingCandidate.studentProfile?.resume_url && (
                    <Card variant="interactive" className="cursor-pointer" onClick={() => handleDownloadResume(
                      viewingCandidate.studentProfile?.resume_url,
                      viewingCandidate.student?.full_name || 'candidate'
                    )}>
                      <CardContent className="py-6 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Resume</p>
                          <p className="text-sm text-muted-foreground">Click to view/download</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  
                  {viewingCandidate.studentProfile?.linkedin_url && (
                    <a href={viewingCandidate.studentProfile.linkedin_url} target="_blank" rel="noopener noreferrer">
                      <Card variant="interactive" className="cursor-pointer">
                        <CardContent className="py-6 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <ExternalLink className="w-6 h-6 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">LinkedIn Profile</p>
                            <p className="text-sm text-muted-foreground">View professional profile</p>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  )}
                  
                  {viewingCandidate.studentProfile?.github_url && (
                    <a href={viewingCandidate.studentProfile.github_url} target="_blank" rel="noopener noreferrer">
                      <Card variant="interactive" className="cursor-pointer">
                        <CardContent className="py-6 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                            <ExternalLink className="w-6 h-6 text-gray-600" />
                          </div>
                          <div>
                            <p className="font-medium">GitHub Profile</p>
                            <p className="text-sm text-muted-foreground">View code repositories</p>
                          </div>
                        </CardContent>
                      </Card>
                    </a>
                  )}
                </div>

                {!viewingCandidate.studentProfile?.resume_url && 
                 !viewingCandidate.studentProfile?.linkedin_url && 
                 !viewingCandidate.studentProfile?.github_url && (
                  <div className="text-center py-8 text-muted-foreground">
                    No documents or links available for this candidate
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RecruiterCandidates;
