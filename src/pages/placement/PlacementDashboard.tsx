import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Building2,
  Clock,
  TrendingUp,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useJobs } from '@/hooks/useJobs';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';

// Import sub-pages
import PlacementAnalytics from './PlacementAnalytics';
import PlacementVerifications from './PlacementVerifications';
import PlacementCompanies from './PlacementCompanies';
import PlacementMentorApprovals from './PlacementMentorApprovals';
import PlacementInterviews from './PlacementInterviews';
import PlacementReports from './PlacementReports';
import PlacementAssessments from './PlacementAssessments';
import PlacementCandidates from './PlacementCandidates';
import PlacementCompanyRounds from './PlacementCompanyRounds';
import PlacementPlacedCandidates from './PlacementPlacedCandidates';

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high': return 'bg-destructive/20 text-destructive';
    case 'medium': return 'bg-warning/20 text-warning';
    case 'low': return 'bg-success/20 text-success';
    default: return 'bg-secondary text-secondary-foreground';
  }
};

const PlacementHome: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { jobs, isLoading: jobsLoading, verifyJob } = useJobs();
  const navigate = useNavigate();
  
  const [statsData, setStatsData] = useState({
    studentsPlaced: 0,
    totalStudents: 0,
    activePartners: 0,
    pendingApprovals: 0,
  });
  const [departmentStats, setDepartmentStats] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch real stats from database
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get placed students (those with 'selected' applications)
        const { data: placedApps } = await supabase
          .from('applications')
          .select('student_id')
          .eq('status', 'selected');
        
        const uniquePlacedStudents = new Set(placedApps?.map(a => a.student_id) || []);
        
        // Get total students
        const { count: totalStudents } = await supabase
          .from('student_profiles')
          .select('*', { count: 'exact', head: true });
        
        // Get unique companies (active partners)
        const { data: activeJobs } = await supabase
          .from('jobs')
          .select('company_name')
          .eq('status', 'active');
        
        const uniqueCompanies = new Set(activeJobs?.map(j => j.company_name) || []);
        
        // Get department-wise stats
        const { data: students } = await supabase
          .from('student_profiles')
          .select('department, user_id');
        
        const deptCounts: Record<string, { total: number; placed: number }> = {};
        
        students?.forEach(student => {
          const dept = student.department || 'Unknown';
          if (!deptCounts[dept]) {
            deptCounts[dept] = { total: 0, placed: 0 };
          }
          deptCounts[dept].total++;
          if (uniquePlacedStudents.has(student.user_id)) {
            deptCounts[dept].placed++;
          }
        });
        
        const deptStatsArray = Object.entries(deptCounts)
          .filter(([name]) => name !== 'Unknown')
          .map(([name, data]) => ({
            name,
            placed: data.placed,
            total: data.total,
            percentage: data.total > 0 ? Math.round((data.placed / data.total) * 100) : 0,
          }))
          .sort((a, b) => b.percentage - a.percentage)
          .slice(0, 5);
        
        setDepartmentStats(deptStatsArray);
        setStatsData({
          studentsPlaced: uniquePlacedStudents.size,
          totalStudents: totalStudents || 0,
          activePartners: uniqueCompanies.size,
          pendingApprovals: jobs.filter(j => j.status === 'pending_verification').length,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!jobsLoading) {
      fetchStats();
    }
  }, [jobs, jobsLoading]);

  const placementRate = statsData.totalStudents > 0 
    ? Math.round((statsData.studentsPlaced / statsData.totalStudents) * 100) 
    : 0;

  const pendingJobs = jobs.filter(j => j.status === 'pending_verification');

  const stats = [
    { label: 'Students Placed', value: statsData.studentsPlaced.toString(), icon: Users, color: 'text-success', change: `of ${statsData.totalStudents}`, up: true },
    { label: 'Active Partners', value: statsData.activePartners.toString(), icon: Building2, color: 'text-accent', change: 'Companies', up: true },
    { label: 'Pending Approvals', value: statsData.pendingApprovals.toString(), icon: Clock, color: 'text-warning', change: 'Jobs to verify', up: false },
    { label: 'Placement Rate', value: `${placementRate}%`, icon: TrendingUp, color: 'text-primary', change: 'Overall', up: true },
  ];

  const handleApprove = async (jobId: string) => {
    await verifyJob(jobId, user?.id || '', true);
  };

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
      >
        <h1 className="text-2xl md:text-3xl font-bold font-heading">
          Placement Cell Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of campus placement activities and metrics
        </p>
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
                <div className="flex items-center gap-1 text-xs mt-2 text-muted-foreground">
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Verification Queue */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-warning" />
                    Verification Queue
                  </CardTitle>
                  <CardDescription>Pending job approvals</CardDescription>
                </div>
                <Badge variant="secondary">{pendingJobs.length} pending</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {pendingJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                  <p>All jobs verified! No pending approvals.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingJobs.slice(0, 4).map((job, index) => {
                    const daysSinceCreated = Math.floor(
                      (Date.now() - new Date(job.created_at).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    const priority = daysSinceCreated > 3 ? 'high' : daysSinceCreated > 1 ? 'medium' : 'low';
                    
                    return (
                      <motion.div
                        key={job.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex items-center justify-between p-3 rounded-lg border border-border hover:border-accent/50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{job.company_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {job.title} • {new Date(job.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(priority)}>
                            {priority}
                          </Badge>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => navigate('/placement/verifications')}>
                              Review
                            </Button>
                            <Button size="sm" variant="accent" onClick={() => handleApprove(job.id)}>
                              Approve
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Department Statistics */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Department-wise Placements
              </CardTitle>
              <CardDescription>Current placement statistics</CardDescription>
            </CardHeader>
            <CardContent>
              {departmentStats.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No department data available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {departmentStats.map((dept, index) => (
                    <motion.div
                      key={dept.name}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="space-y-2"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{dept.name}</span>
                        <span className="text-muted-foreground">
                          {dept.placed}/{dept.total} ({dept.percentage}%)
                        </span>
                      </div>
                      <Progress
                        value={dept.percentage}
                        className="h-2"
                      />
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

const PlacementDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<PlacementHome />} />
        <Route path="analytics" element={<PlacementAnalytics />} />
        <Route path="verifications" element={<PlacementVerifications />} />
        <Route path="companies" element={<PlacementCompanies />} />
        <Route path="reports" element={<PlacementReports />} />
        <Route path="mentors" element={<PlacementMentorApprovals />} />
        <Route path="interviews" element={<PlacementInterviews />} />
        <Route path="placed" element={<PlacementPlacedCandidates />} />
        <Route path="assessments" element={<PlacementAssessments />} />
        <Route path="candidates" element={<PlacementCandidates />} />
        <Route path="candidates/:jobId" element={<PlacementCompanyRounds />} />
      </Routes>
    </DashboardLayout>
  );
};

export default PlacementDashboard;
