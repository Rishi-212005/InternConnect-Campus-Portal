import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Briefcase, 
  GraduationCap, 
  Building2,
  Loader2,
  DollarSign
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useJobs } from '@/hooks/useJobs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const PlacementAnalytics: React.FC = () => {
  const { jobs, isLoading: jobsLoading } = useJobs();
  
  const [stats, setStats] = useState({
    placementRate: 0,
    avgPackage: 0,
    companiesVisited: 0,
    totalStudents: 0,
    placedStudents: 0,
    totalApplications: 0,
  });
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        // Get all students
        const { data: students, count: totalStudents } = await supabase
          .from('student_profiles')
          .select('*, profiles!inner(full_name)', { count: 'exact' });
        
        // Get all applications
        const { data: applications } = await supabase
          .from('applications')
          .select('*');
        
        const apps = applications || [];
        
        // Get placed students
        const placedApps = apps.filter(a => a.status === 'selected');
        const uniquePlacedStudents = new Set(placedApps.map(a => a.student_id));
        
        // Get unique companies
        const activeJobs = jobs.filter(j => j.status === 'active');
        const uniqueCompanies = new Set(activeJobs.map(j => j.company_name));
        
        // Calculate average package
        const salaries = activeJobs.filter(j => j.salary_min).map(j => j.salary_min!);
        const avgPackage = salaries.length > 0 
          ? Math.round(salaries.reduce((a, b) => a + b, 0) / salaries.length / 100000) 
          : 0;
        
        const placementRate = (totalStudents || 0) > 0 
          ? Math.round((uniquePlacedStudents.size / (totalStudents || 1)) * 100) 
          : 0;
        
        setStats({
          placementRate,
          avgPackage,
          companiesVisited: uniqueCompanies.size,
          totalStudents: totalStudents || 0,
          placedStudents: uniquePlacedStudents.size,
          totalApplications: apps.length,
        });
        
        // Department-wise data
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
        
        const deptData = Object.entries(deptCounts)
          .filter(([name]) => name !== 'Unknown')
          .map(([name, data]) => ({
            name: name.length > 15 ? name.substring(0, 15) + '...' : name,
            students: data.total,
            placed: data.placed,
          }));
        setDepartmentData(deptData);
        
        // Monthly application trend (last 6 months)
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyApps: Record<string, number> = {};
        
        apps.forEach(app => {
          const date = new Date(app.created_at);
          const monthKey = `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
          monthlyApps[monthKey] = (monthlyApps[monthKey] || 0) + 1;
        });
        
        const monthly = Object.entries(monthlyApps)
          .slice(-6)
          .map(([month, count]) => ({
            month,
            applications: count,
          }));
        setMonthlyData(monthly);
        
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!jobsLoading) {
      fetchAnalytics();
    }
  }, [jobs, jobsLoading]);

  if (jobsLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-heading font-bold text-foreground">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Comprehensive placement statistics</p>
      </motion.div>
      
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Placement Rate', value: `${stats.placementRate}%`, icon: TrendingUp, color: 'text-green-500' },
          { label: 'Avg Package', value: `₹${stats.avgPackage}L`, icon: DollarSign, color: 'text-primary' },
          { label: 'Partner Companies', value: stats.companiesVisited.toString(), icon: Building2, color: 'text-accent' },
          { label: 'Total Students', value: stats.totalStudents.toString(), icon: GraduationCap, color: 'text-warning' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 * i }}
          >
            <Card variant="elevated">
              <CardContent className="pt-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-secondary ${stat.color}`}>
                  <stat.icon className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Department-wise Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-primary" />
                Department-wise Placements
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departmentData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No department data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="students" fill="hsl(var(--primary))" name="Total Students" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="placed" fill="hsl(var(--success))" name="Placed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Application Trend */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Application Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No application data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="applications" 
                      stroke="hsl(var(--accent))" 
                      strokeWidth={3}
                      dot={{ fill: 'hsl(var(--accent))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>Placement Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-foreground">{stats.placedStudents}</p>
                <p className="text-sm text-muted-foreground">Students Placed</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-foreground">{stats.totalApplications}</p>
                <p className="text-sm text-muted-foreground">Total Applications</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-foreground">{jobs.filter(j => j.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Active Jobs</p>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg text-center">
                <p className="text-3xl font-bold text-foreground">{jobs.filter(j => j.status === 'pending_verification').length}</p>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PlacementAnalytics;
