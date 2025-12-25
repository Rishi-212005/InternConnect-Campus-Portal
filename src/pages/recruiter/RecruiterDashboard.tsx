import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  Users,
  Calendar,
  TrendingUp,
  Plus,
  MoreHorizontal,
  Eye,
  UserCheck,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useJobs } from '@/hooks/useJobs';
import { supabase } from '@/integrations/supabase/client';

// Import sub-pages
import RecruiterJobs from './RecruiterJobs';
import RecruiterCandidates from './RecruiterCandidates';
import RecruiterInterviews from './RecruiterInterviews';
import RecruiterAnalytics from './RecruiterAnalytics';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-success/20 text-success';
    case 'pending_verification': return 'bg-warning/20 text-warning';
    case 'draft': return 'bg-secondary text-secondary-foreground';
    case 'closed': return 'bg-destructive/20 text-destructive';
    case 'interview': return 'bg-accent/20 text-accent';
    case 'shortlisted': return 'bg-primary/20 text-primary';
    case 'selected': return 'bg-success/20 text-success';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

const RecruiterHome: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { jobs, isLoading: jobsLoading } = useJobs();
  const navigate = useNavigate();
  
  const [applicationsData, setApplicationsData] = useState<any[]>([]);
  const [interviewCount, setInterviewCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filter recruiter's jobs
  const recruiterJobs = jobs.filter(job => job.recruiter_id === user?.id);
  const activeJobs = recruiterJobs.filter(job => job.status === 'active');

  // Fetch applications for recruiter's jobs
  useEffect(() => {
    const fetchApplicationsData = async () => {
      if (!user?.id || recruiterJobs.length === 0) {
        setIsLoading(false);
        return;
      }
      
      try {
        const jobIds = recruiterJobs.map(j => j.id);
        
        // Get all applications for recruiter's jobs
        const { data: apps } = await supabase
          .from('applications')
          .select(`
            *,
            profiles!applications_student_id_fkey1 (full_name, avatar_url)
          `)
          .in('job_id', jobIds);
        
        setApplicationsData(apps || []);
        
        // Count interviews
        const { data: interviews } = await supabase
          .from('interview_schedules')
          .select('id, application_id')
          .in('application_id', apps?.map(a => a.id) || []);
        
        setInterviewCount(interviews?.length || 0);
      } catch (error) {
        console.error('Error fetching applications:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!jobsLoading) {
      fetchApplicationsData();
    }
  }, [user?.id, recruiterJobs.length, jobsLoading]);

  const totalApplicants = applicationsData.length;
  const shortlistedCount = applicationsData.filter(a => 
    ['shortlisted', 'interview', 'selected'].includes(a.status)
  ).length;
  const conversionRate = totalApplicants > 0 
    ? Math.round((shortlistedCount / totalApplicants) * 100) 
    : 0;

  const stats = [
    { label: 'Active Jobs', value: activeJobs.length.toString(), icon: Briefcase, color: 'text-accent', change: '+' + recruiterJobs.filter(j => j.status === 'pending_verification').length + ' pending' },
    { label: 'Total Applicants', value: totalApplicants.toString(), icon: Users, color: 'text-success', change: shortlistedCount + ' shortlisted' },
    { label: 'Interviews Scheduled', value: interviewCount.toString(), icon: Calendar, color: 'text-primary', change: 'This month' },
    { label: 'Conversion Rate', value: `${conversionRate}%`, icon: TrendingUp, color: 'text-warning', change: 'Applications to shortlist' },
  ];

  // Get shortlisted candidates for display
  const shortlistedCandidates = applicationsData
    .filter(a => ['shortlisted', 'interview', 'selected'].includes(a.status))
    .slice(0, 4)
    .map(app => {
      const job = recruiterJobs.find(j => j.id === app.job_id);
      return {
        id: app.id,
        name: app.profiles?.full_name || 'Unknown',
        role: job?.title || 'Unknown Role',
        status: app.status,
        avatar: app.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${app.id}`,
      };
    });

  if (jobsLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-heading">
            Recruiter Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage job postings and track candidates
          </p>
        </div>
        <Button variant="accent" className="w-fit" onClick={() => navigate('/recruiter/jobs')}>
          <Plus className="w-4 h-4 mr-2" />
          Post New Job
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card variant="elevated">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                  <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {stat.change}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Posted Jobs Table */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Posted Opportunities</CardTitle>
                  <CardDescription>Your job listings</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/recruiter/jobs')}>View All</Button>
              </div>
            </CardHeader>
            <CardContent>
              {recruiterJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No jobs posted yet</p>
                  <Button variant="accent" size="sm" className="mt-2" onClick={() => navigate('/recruiter/jobs')}>
                    Post Your First Job
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Applicants</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recruiterJobs.slice(0, 4).map((job) => {
                      const jobApplicants = applicationsData.filter(a => a.job_id === job.id).length;
                      return (
                        <TableRow key={job.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{job.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(job.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Users className="w-4 h-4 text-muted-foreground" />
                              {jobApplicants}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(job.status || '')}>
                              {job.status?.replace('_', ' ')}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Candidate Shortlist */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Candidate Shortlist</CardTitle>
                  <CardDescription>Track your hiring pipeline</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {shortlistedCandidates.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No shortlisted candidates yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {shortlistedCandidates.map((candidate, index) => (
                    <motion.div
                      key={candidate.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-accent/50 hover:shadow-sm transition-all"
                    >
                      <img
                        src={candidate.avatar}
                        alt={candidate.name}
                        className="w-10 h-10 rounded-full"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{candidate.name}</p>
                        <p className="text-xs text-muted-foreground">{candidate.role}</p>
                      </div>
                      <Badge className={getStatusColor(candidate.status)}>{candidate.status}</Badge>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate('/recruiter/candidates')}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

const RecruiterDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<RecruiterHome />} />
        <Route path="jobs" element={<RecruiterJobs />} />
        <Route path="candidates" element={<RecruiterCandidates />} />
        <Route path="interviews" element={<RecruiterInterviews />} />
        <Route path="analytics" element={<RecruiterAnalytics />} />
      </Routes>
    </DashboardLayout>
  );
};

export default RecruiterDashboard;
