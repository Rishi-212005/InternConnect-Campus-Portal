import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  MapPin, 
  Clock, 
  DollarSign, 
  Search,
  Filter,
  Star,
  Building2,
  ArrowRight,
  Loader2,
  Briefcase,
  AlertCircle,
  UserCheck
} from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { useApplications } from '@/hooks/useApplications';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { format, formatDistanceToNow } from 'date-fns';
import JobApplicationModal from '@/components/student/JobApplicationModal';
import { supabase } from '@/integrations/supabase/client';

const StudentJobs: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { user, role } = useSupabaseAuthContext();
  const { jobs, isLoading: jobsLoading } = useJobs('active');
  const { applications, createApplication, isLoading: appsLoading } = useApplications(role, user?.id);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [hasMentor, setHasMentor] = useState<boolean | null>(null);
  const [isCheckingMentor, setIsCheckingMentor] = useState(true);

  // Check if student has an approved mentor
  useEffect(() => {
    const checkMentorStatus = async () => {
      if (!user?.id) {
        setIsCheckingMentor(false);
        return;
      }

      try {
        const { data } = await supabase
          .from('mentor_requests')
          .select('status')
          .eq('student_id', user.id)
          .eq('status', 'approved')
          .maybeSingle();

        setHasMentor(!!data);
      } catch (error) {
        console.error('Error checking mentor status:', error);
        setHasMentor(false);
      } finally {
        setIsCheckingMentor(false);
      }
    };

    checkMentorStatus();
  }, [user?.id]);

  const appliedJobIds = applications.map(app => app.job_id);

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    job.company_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleApply = async (jobId: string) => {
    if (!user || !hasMentor) return;
    setApplyingTo(jobId);
    await createApplication(jobId, user.id);
    setApplyingTo(null);
    setSelectedJob(null);
  };

  const handleOpenApplicationModal = (job: any) => {
    if (!user) return;
    if (!hasMentor) {
      navigate('/student/mentor');
      return;
    }
    setSelectedJob(job);
  };

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return 'Competitive';
    if (min && max) return `$${(min / 1000).toFixed(0)}K - $${(max / 1000).toFixed(0)}K`;
    if (min) return `From $${(min / 1000).toFixed(0)}K`;
    if (max) return `Up to $${(max / 1000).toFixed(0)}K`;
    return 'Competitive';
  };

  const isLoading = jobsLoading || appsLoading || isCheckingMentor;

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Browse Jobs</h1>
          <p className="text-muted-foreground mt-1">Find opportunities that match your skills</p>
        </div>
      </motion.div>

      {/* Search and Filter */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-4"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search jobs by title or company..."
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

      {/* Mentor Warning */}
      {!isCheckingMentor && !hasMentor && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-warning/50 bg-warning/10">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-6 w-6 text-warning flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium">Mentor Required</p>
                  <p className="text-sm text-muted-foreground">
                    You must have an approved mentor to apply for jobs. Please select a mentor first.
                  </p>
                </div>
                <Button variant="outline" onClick={() => navigate('/student/mentor')}>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Select Mentor
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{jobs.length}</p>
            <p className="text-sm text-muted-foreground">Active Jobs</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-accent">{applications.length}</p>
            <p className="text-sm text-muted-foreground">Applied</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-600">
              {jobs.filter(j => j.job_type === 'Internship').length}
            </p>
            <p className="text-sm text-muted-foreground">Internships</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-600">
              {jobs.filter(j => j.job_type === 'Full-time').length}
            </p>
            <p className="text-sm text-muted-foreground">Full-time</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Job Listings */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredJobs.length === 0 ? (
          <Card variant="elevated">
            <CardContent className="py-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No jobs available at the moment</p>
            </CardContent>
          </Card>
        ) : (
          filteredJobs.map((job, index) => {
            const hasApplied = appliedJobIds.includes(job.id);
            const isApplying = applyingTo === job.id;
            
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index }}
              >
                <Card variant="interactive" className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center">
                          <Building2 className="w-7 h-7 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{job.title}</h3>
                          <p className="text-muted-foreground">{job.company_name}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              {formatSalary(job.salary_min, job.salary_max)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          {job.required_skills && job.required_skills.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {job.required_skills.slice(0, 4).map((skill) => (
                                <Badge key={skill} variant="secondary">
                                  {skill}
                                </Badge>
                              ))}
                              {job.required_skills.length > 4 && (
                                <Badge variant="outline">+{job.required_skills.length - 4}</Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {job.min_cgpa && (
                          <div className="flex items-center gap-1 mb-2">
                            <Star className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm text-muted-foreground">Min CGPA: {job.min_cgpa}</span>
                          </div>
                        )}
                        <Badge variant={job.job_type === 'Internship' ? 'default' : 'secondary'}>
                          {job.job_type}
                        </Badge>
                        {job.deadline && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Deadline: {format(new Date(job.deadline), 'MMM dd, yyyy')}
                          </p>
                        )}
                        <div className="flex gap-2 mt-4 justify-end">
                          <Button 
                            variant={hasApplied ? 'outline' : 'accent'} 
                            size="sm" 
                            className="gap-1"
                            disabled={hasApplied || isApplying}
                            onClick={() => handleOpenApplicationModal(job)}
                          >
                            {isApplying ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : hasApplied ? (
                              'Applied'
                            ) : (
                              <>Apply <ArrowRight className="w-4 h-4" /></>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    {job.description && (
                      <p className="text-sm text-muted-foreground mt-4 line-clamp-2">
                        {job.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Application Modal */}
      {selectedJob && user && (
        <JobApplicationModal
          isOpen={!!selectedJob}
          onClose={() => setSelectedJob(null)}
          job={selectedJob}
          userId={user.id}
          onSubmit={handleApply}
        />
      )}
    </div>
  );
};

export default StudentJobs;
