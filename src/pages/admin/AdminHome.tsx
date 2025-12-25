import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Shield,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
  Clock,
  Activity,
  Briefcase,
  FileText,
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
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface UserWithRole {
  id: string;
  full_name: string;
  email: string;
  role: string;
  created_at: string;
  is_verified: boolean;
}

interface Stats {
  totalUsers: number;
  students: number;
  recruiters: number;
  faculty: number;
  placement: number;
  activeJobs: number;
  pendingVerification: number;
  totalApplications: number;
}

const AdminHome: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    students: 0,
    recruiters: 0,
    faculty: 0,
    placement: 0,
    activeJobs: 0,
    pendingVerification: 0,
    totalApplications: 0,
  });
  const [recentUsers, setRecentUsers] = useState<UserWithRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchStats = async () => {
    setIsLoading(true);
    
    try {
      // Fetch user counts by role
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role');

      if (rolesError) throw rolesError;

      const roleCounts = roles?.reduce((acc, r) => {
        acc[r.role] = (acc[r.role] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      // Fetch job counts
      const { count: activeJobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: pendingJobsCount } = await supabase
        .from('jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending_verification');

      // Fetch application count
      const { count: applicationsCount } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: roles?.length || 0,
        students: roleCounts['student'] || 0,
        recruiters: roleCounts['recruiter'] || 0,
        faculty: roleCounts['faculty'] || 0,
        placement: roleCounts['placement'] || 0,
        activeJobs: activeJobsCount || 0,
        pendingVerification: pendingJobsCount || 0,
        totalApplications: applicationsCount || 0,
      });

      // Fetch recent users with roles
      const { data: recentRoles } = await supabase
        .from('user_roles')
        .select('user_id, role, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentRoles) {
        const usersWithProfiles = await Promise.all(
          recentRoles.map(async (ur) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('user_id', ur.user_id)
              .maybeSingle();

            return {
              id: ur.user_id,
              full_name: profile?.full_name || 'Unknown',
              email: profile?.email || '',
              role: ur.role,
              created_at: ur.created_at,
              is_verified: true,
            };
          })
        );
        setRecentUsers(usersWithProfiles);
      }
    } catch (error: any) {
      console.error('Error fetching admin stats:', error);
      toast({ title: 'Error', description: 'Failed to load dashboard data', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: Users, color: 'text-accent' },
    { label: 'Students', value: stats.students, icon: UserCheck, color: 'text-blue-500' },
    { label: 'Recruiters', value: stats.recruiters, icon: Briefcase, color: 'text-green-500' },
    { label: 'Active Jobs', value: stats.activeJobs, icon: FileText, color: 'text-purple-500' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
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
          Admin Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          System oversight and platform management
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
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

      {/* Additional Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.faculty}</p>
            <p className="text-sm text-muted-foreground">Faculty Members</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.placement}</p>
            <p className="text-sm text-muted-foreground">Placement Cell</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingVerification}</p>
            <p className="text-sm text-muted-foreground">Pending Jobs</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalApplications}</p>
            <p className="text-sm text-muted-foreground">Applications</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Users */}
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
                    <UserCheck className="w-5 h-5 text-accent" />
                    Recent Registrations
                  </CardTitle>
                  <CardDescription>New users who joined recently</CardDescription>
                </div>
                <Badge variant="secondary">{recentUsers.length} users</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {recentUsers.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No users yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.full_name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{user.role}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                Platform Overview
              </CardTitle>
              <CardDescription>System health and activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-200">System Operational</p>
                      <p className="text-sm text-green-600 dark:text-green-400">All services running normally</p>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Online</Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium">Database Connected</p>
                      <p className="text-sm text-muted-foreground">Real-time sync active</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Connected</Badge>
                </div>

                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-purple-500" />
                    <div>
                      <p className="font-medium">Authentication</p>
                      <p className="text-sm text-muted-foreground">Email auto-confirm enabled</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>

                {stats.pendingVerification > 0 && (
                  <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                      <div>
                        <p className="font-medium text-yellow-800 dark:text-yellow-200">Pending Jobs</p>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400">
                          {stats.pendingVerification} jobs awaiting verification
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline">Review</Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminHome;
