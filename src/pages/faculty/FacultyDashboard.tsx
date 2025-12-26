import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  ClipboardCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PendingApprovalScreen from '@/components/layout/PendingApprovalScreen';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useApplications } from '@/hooks/useApplications';
import { supabase } from '@/integrations/supabase/client';

// Import sub-pages
import FacultyStudents from './FacultyStudents';
import FacultyApprovals from './FacultyApprovals';
import FacultyProgress from './FacultyProgress';
import FacultyMentorRequests from './FacultyMentorRequests';
import FacultyProfile from './FacultyProfile';

const FacultyHome: React.FC = () => {
  const { toast } = useToast();
  const { user } = useSupabaseAuthContext();
  const { applications, isLoading, updateApplicationStatus } = useApplications('faculty', user?.id);
  
  const [studentCount, setStudentCount] = useState(0);
  const [approvedThisMonth, setApprovedThisMonth] = useState(0);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // Fetch additional stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total students count
        const { count: studentsCount } = await supabase
          .from('student_profiles')
          .select('*', { count: 'exact', head: true });
        
        setStudentCount(studentsCount || 0);
        
        // Get approved applications this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: approvedCount } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'faculty_approved')
          .gte('faculty_approved_at', startOfMonth.toISOString());
        
        setApprovedThisMonth(approvedCount || 0);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };
    
    fetchStats();
  }, []);

  // Filter pending applications
  const pendingApprovals = applications.filter(app => app.status === 'pending');

  const handleApprove = async (id: string, studentName: string) => {
    await updateApplicationStatus(id, 'faculty_approved', user?.id);
    toast({
      title: "Request Approved",
      description: `${studentName}'s request has been approved successfully.`,
    });
  };

  const handleReject = async (id: string, studentName: string) => {
    await updateApplicationStatus(id, 'faculty_rejected', user?.id, 'Rejected by faculty');
    toast({
      title: "Request Rejected",
      description: `${studentName}'s request has been rejected.`,
      variant: "destructive",
    });
  };

  const stats = [
    { label: 'Total Students', value: studentCount.toString(), icon: Users, color: 'text-accent' },
    { label: 'Pending Approvals', value: pendingApprovals.length.toString(), icon: Clock, color: 'text-warning' },
    { label: 'Approved This Month', value: approvedThisMonth.toString(), icon: CheckCircle, color: 'text-success' },
    { label: 'Total Applications', value: applications.length.toString(), icon: TrendingUp, color: 'text-primary' },
  ];

  if (isLoading || isLoadingStats) {
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
          Faculty Mentor Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Guide your students towards successful placements
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
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Pending Approvals */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5 text-accent" />
                  Pending Approval Requests
                </CardTitle>
                <CardDescription>Review and approve student applications</CardDescription>
              </div>
              <Badge variant="secondary" className="text-warning">
                {pendingApprovals.length} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success" />
                <p>All caught up! No pending approvals.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingApprovals.slice(0, 5).map((app, index) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg border border-border hover:border-accent/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${app.student_id}`}
                        alt="Student"
                        className="w-12 h-12 rounded-full"
                      />
                      <div>
                        <p className="font-medium">
                          {app.student_profile?.full_name || 'Unknown Student'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Job Application • {app.jobs?.company_name} - {app.jobs?.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-auto md:ml-0">
                      <Button
                        variant="accent"
                        size="sm"
                        onClick={() => handleApprove(app.id, app.student_profile?.full_name || 'Student')}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleReject(app.id, app.student_profile?.full_name || 'Student')}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
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
  );
};

const FacultyDashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useSupabaseAuthContext();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [isCheckingApproval, setIsCheckingApproval] = useState(true);

  useEffect(() => {
    const checkApproval = async () => {
      if (!user?.id) {
        setIsCheckingApproval(false);
        return;
      }

      try {
        const { data: facultyProfile } = await supabase
          .from('faculty_profiles')
          .select('is_approved')
          .eq('user_id', user.id)
          .single();

        setIsApproved(facultyProfile?.is_approved ?? false);
      } catch (error) {
        console.error('Error checking faculty approval:', error);
        setIsApproved(false);
      } finally {
        setIsCheckingApproval(false);
      }
    };

    checkApproval();
  }, [user?.id]);

  if (authLoading || isCheckingApproval) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isApproved) {
    return (
      <PendingApprovalScreen
        title="Approval Pending"
        description="Your faculty account is awaiting approval from the Placement Cell."
        roleType="faculty"
      />
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<FacultyHome />} />
        <Route path="profile" element={<FacultyProfile />} />
        <Route path="mentees" element={<FacultyMentorRequests />} />
        <Route path="students" element={<FacultyStudents />} />
        <Route path="approvals" element={<FacultyApprovals />} />
        <Route path="progress" element={<FacultyProgress />} />
      </Routes>
    </DashboardLayout>
  );
};

export default FacultyDashboard;
