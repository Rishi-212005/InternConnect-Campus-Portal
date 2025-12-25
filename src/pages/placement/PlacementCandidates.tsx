import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
  Building2,
  Users,
  GraduationCap,
  Mail,
  Phone,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Send,
  CheckCircle,
  User,
  Award,
  BookOpen,
  CalendarIcon,
  AlertCircle,
  Lock,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

interface StudentApplication {
  id: string;
  student_id: string;
  job_id: string;
  status: string;
  created_at: string;
  profile: {
    full_name: string;
    email: string;
    avatar_url: string | null;
    phone: string | null;
  } | null;
  student_profile: {
    department: string | null;
    cgpa: number | null;
    roll_number: string | null;
    skills: string[] | null;
    resume_url: string | null;
  } | null;
}

interface CompanyGroup {
  company_name: string;
  job_id: string;
  job_title: string;
  applications: StudentApplication[];
  hasActiveAssessment?: boolean;
  activeAssessmentTitle?: string;
}

interface Assessment {
  id: string;
  title: string;
  job_id: string;
  status: string;
  duration_minutes: number;
  passing_score: number;
  end_time: string | null;
}

const PlacementCandidates: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [companyGroups, setCompanyGroups] = useState<CompanyGroup[]>([]);
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyGroup | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [selectedAssessment, setSelectedAssessment] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [deadline, setDeadline] = useState<Date | undefined>(undefined);

  const fetchApprovedApplications = async () => {
    try {
      // Fetch applications with faculty_approved status
      const { data: applications, error } = await supabase
        .from('applications')
        .select(`
          id,
          student_id,
          job_id,
          status,
          created_at,
          jobs (id, title, company_name)
        `)
        .eq('status', 'faculty_approved')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch all assessments to check for active ones
      const { data: allAssessments } = await supabase
        .from('assessments')
        .select('id, job_id, status, title, end_time')
        .in('status', ['active', 'scheduled']);

      // Enrich with profile data
      const enrichedApps = await Promise.all(
        (applications || []).map(async (app) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, email, avatar_url, phone')
            .eq('user_id', app.student_id)
            .maybeSingle();

          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('department, cgpa, roll_number, skills, resume_url')
            .eq('user_id', app.student_id)
            .maybeSingle();

          return {
            ...app,
            profile,
            student_profile: studentProfile,
          };
        })
      );

      // Group by company/job
      const grouped: Record<string, CompanyGroup> = {};
      
      enrichedApps.forEach((app: any) => {
        const key = app.job_id;
        if (!grouped[key]) {
          // Check if there's an active assessment for this job
          const activeAssessment = allAssessments?.find(a => a.job_id === app.job_id);
          
          grouped[key] = {
            company_name: app.jobs?.company_name || 'Unknown Company',
            job_id: app.job_id,
            job_title: app.jobs?.title || 'Unknown Position',
            applications: [],
            hasActiveAssessment: !!activeAssessment,
            activeAssessmentTitle: activeAssessment?.title,
          };
        }
        grouped[key].applications.push(app);
      });

      setCompanyGroups(Object.values(grouped));
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast({ title: 'Error', description: 'Failed to load applications', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAssessments = async () => {
    const { data } = await supabase
      .from('assessments')
      .select('id, title, job_id, status, duration_minutes, passing_score, end_time')
      .order('created_at', { ascending: false });
    
    setAssessments(data || []);
  };

  useEffect(() => {
    fetchApprovedApplications();
    fetchAssessments();
  }, []);

  const toggleCompanyExpand = (jobId: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  };

  const handleOpenAssignDialog = (company: CompanyGroup) => {
    setSelectedCompany(company);
    setSelectedStudents(new Set());
    setSelectedAssessment('');
    setShowAssignDialog(true);
  };

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const selectAllStudents = () => {
    if (!selectedCompany) return;
    const allIds = new Set(selectedCompany.applications.map(a => a.student_id));
    setSelectedStudents(allIds);
  };

  const deselectAllStudents = () => {
    setSelectedStudents(new Set());
  };

  const handleAssignAssessment = async () => {
    if (!selectedAssessment || selectedStudents.size === 0 || !selectedCompany || !deadline) {
      toast({ title: 'Error', description: 'Please select an assessment, deadline, and at least one student', variant: 'destructive' });
      return;
    }

    setIsAssigning(true);
    try {
      // Update assessment with deadline and status
      const { error: assessmentError } = await supabase
        .from('assessments')
        .update({ 
          status: 'active',
          end_time: deadline.toISOString()
        })
        .eq('id', selectedAssessment);

      if (assessmentError) throw assessmentError;

      // Send notifications to selected students
      const deadlineFormatted = format(deadline, 'PPp');
      const notifications = Array.from(selectedStudents).map(studentId => ({
        user_id: studentId,
        title: 'Assessment Assigned',
        message: `You have been assigned an assessment for ${selectedCompany.job_title} at ${selectedCompany.company_name}. Deadline: ${deadlineFormatted}`,
        link: '/student/exams',
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) throw notifError;

      toast({ 
        title: 'Assessment Assigned!', 
        description: `${selectedStudents.size} student(s) have been notified. Deadline: ${deadlineFormatted}` 
      });
      
      setShowAssignDialog(false);
      setSelectedStudents(new Set());
      setSelectedAssessment('');
      setDeadline(undefined);
      
      // Refresh data to update hasActiveAssessment status
      fetchApprovedApplications();
      fetchAssessments();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setIsAssigning(false);
    }
  };

  const getJobAssessments = (jobId: string) => {
    // Only return assessments for this specific job that are not already active
    return assessments.filter(a => a.job_id === jobId && a.status !== 'active');
  };

  const hasActiveRound = (jobId: string) => {
    return assessments.some(a => a.job_id === jobId && a.status === 'active');
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
      >
        <h1 className="text-3xl font-heading font-bold text-foreground">Approved Candidates</h1>
        <p className="text-muted-foreground mt-1">
          View faculty-approved applications grouped by company and assign assessments
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Building2 className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold">{companyGroups.length}</p>
            <p className="text-sm text-muted-foreground">Active Companies</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <Users className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-2xl font-bold">
              {companyGroups.reduce((sum, g) => sum + g.applications.length, 0)}
            </p>
            <p className="text-sm text-muted-foreground">Approved Candidates</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <ClipboardList className="w-8 h-8 text-success mx-auto mb-2" />
            <p className="text-2xl font-bold">{assessments.filter(a => a.status === 'active').length}</p>
            <p className="text-sm text-muted-foreground">Active Assessments</p>
          </CardContent>
        </Card>
      </div>

      {/* Company Groups */}
      {companyGroups.length === 0 ? (
        <Card variant="elevated">
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No faculty-approved applications yet</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {companyGroups.map((group, index) => {
            const isExpanded = expandedCompanies.has(group.job_id);
            const jobAssessments = getJobAssessments(group.job_id);
            const isRoundActive = hasActiveRound(group.job_id);
            const allJobAssessments = assessments.filter(a => a.job_id === group.job_id);

            return (
              <motion.div
                key={group.job_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card variant="elevated">
                  <CardHeader 
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleCompanyExpand(group.job_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle 
                            className="text-lg hover:text-primary hover:underline cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/placement/candidates/${group.job_id}`);
                            }}
                          >
                            {group.company_name}
                          </CardTitle>
                          <CardDescription>{group.job_title}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="gap-1">
                          <Users className="w-3 h-3" />
                          {group.applications.length} Candidates
                        </Badge>
                        {allJobAssessments.length > 0 && (
                          <Badge className="bg-green-100 text-green-700 gap-1">
                            <ClipboardList className="w-3 h-3" />
                            {allJobAssessments.length} Assessments
                          </Badge>
                        )}
                        {isRoundActive ? (
                          <Button 
                            variant="outline" 
                            size="sm"
                            disabled
                            className="opacity-60"
                          >
                            <Lock className="w-4 h-4 mr-1" />
                            Round in Progress
                          </Button>
                        ) : (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenAssignDialog(group);
                            }}
                            disabled={jobAssessments.length === 0}
                          >
                            <Send className="w-4 h-4 mr-1" />
                            Assign Assessment
                          </Button>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <CardContent className="pt-0">
                          <div className="border-t pt-4 space-y-3">
                            {group.applications.map((app) => (
                              <div
                                key={app.id}
                                className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                              >
                                <div className="flex items-center gap-4">
                                  <Avatar className="w-10 h-10">
                                    <AvatarImage src={app.profile?.avatar_url || undefined} />
                                    <AvatarFallback>
                                      {app.profile?.full_name?.charAt(0) || 'S'}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{app.profile?.full_name || 'Unknown Student'}</p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                      {app.student_profile?.roll_number && (
                                        <span className="flex items-center gap-1">
                                          <User className="w-3 h-3" />
                                          {app.student_profile.roll_number}
                                        </span>
                                      )}
                                      {app.student_profile?.department && (
                                        <span className="flex items-center gap-1">
                                          <GraduationCap className="w-3 h-3" />
                                          {app.student_profile.department}
                                        </span>
                                      )}
                                      {app.student_profile?.cgpa && (
                                        <span className="flex items-center gap-1">
                                          <Award className="w-3 h-3" />
                                          CGPA: {app.student_profile.cgpa}
                                        </span>
                                      )}
                                      {app.profile?.email && (
                                        <span className="flex items-center gap-1">
                                          <Mail className="w-3 h-3" />
                                          {app.profile.email}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  {app.student_profile?.skills && app.student_profile.skills.length > 0 && (
                                    <div className="flex gap-1">
                                      {app.student_profile.skills.slice(0, 3).map((skill, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs">
                                          {skill}
                                        </Badge>
                                      ))}
                                      {app.student_profile.skills.length > 3 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{app.student_profile.skills.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  )}
                                  {app.student_profile?.resume_url && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => window.open(app.student_profile?.resume_url!, '_blank')}
                                    >
                                      <FileText className="w-4 h-4 mr-1" />
                                      Resume
                                    </Button>
                                  )}
                                  <Badge className="bg-green-100 text-green-700">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Approved
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Assign Assessment Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Assessment</DialogTitle>
            <DialogDescription>
              Select students and an assessment for {selectedCompany?.company_name} - {selectedCompany?.job_title}
            </DialogDescription>
          </DialogHeader>

          {(() => {
            const jobSpecificAssessments = selectedCompany 
              ? assessments.filter(a => a.job_id === selectedCompany.job_id && a.status !== 'active')
              : [];
            
            return (
              <div className="space-y-6">
                {jobSpecificAssessments.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No available assessments for this job.</p>
                    <p className="text-sm text-muted-foreground mt-1">Create an assessment first or wait for the current round to complete.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Select Assessment</Label>
                      <Select value={selectedAssessment} onValueChange={setSelectedAssessment}>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose an assessment for this job" />
                        </SelectTrigger>
                        <SelectContent>
                          {jobSpecificAssessments.map(assessment => (
                            <SelectItem key={assessment.id} value={assessment.id}>
                              <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                <span>{assessment.title}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">{assessment.duration_minutes} mins</Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Set Deadline</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !deadline && "text-muted-foreground")}>
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {deadline ? format(deadline, "PPP") : "Select deadline date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={deadline} onSelect={setDeadline} disabled={(date) => date < new Date()} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Select Students</Label>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={selectAllStudents}>Select All</Button>
                          <Button variant="outline" size="sm" onClick={deselectAllStudents}>Deselect All</Button>
                        </div>
                      </div>
                      <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                        {selectedCompany?.applications.map((app) => (
                          <div key={app.student_id} className="flex items-center gap-3 p-3 hover:bg-muted/30 cursor-pointer" onClick={() => toggleStudentSelection(app.student_id)}>
                            <Checkbox checked={selectedStudents.has(app.student_id)} onCheckedChange={() => toggleStudentSelection(app.student_id)} />
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={app.profile?.avatar_url || undefined} />
                              <AvatarFallback>{app.profile?.full_name?.charAt(0) || 'S'}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <p className="text-sm font-medium">{app.profile?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{app.student_profile?.roll_number} • {app.student_profile?.department}</p>
                            </div>
                            {app.student_profile?.cgpa && <Badge variant="secondary">CGPA: {app.student_profile.cgpa}</Badge>}
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{selectedStudents.size} of {selectedCompany?.applications.length} students selected</p>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowAssignDialog(false)}>Cancel</Button>
                      <Button onClick={handleAssignAssessment} disabled={isAssigning || !selectedAssessment || !deadline || selectedStudents.size === 0}>
                        {isAssigning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                        Assign to {selectedStudents.size} Student(s)
                      </Button>
                    </div>
                  </>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PlacementCandidates;
