import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Briefcase,
  Clock,
  Target,
  ArrowUp,
  ArrowDown,
  Loader2
} from 'lucide-react';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useJobs } from '@/hooks/useJobs';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))'];

const RecruiterAnalytics: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const { jobs, isLoading: jobsLoading } = useJobs();
  
  const [analyticsData, setAnalyticsData] = useState({
    totalApplications: 0,
    conversionRate: 0,
    avgTimeToHire: 0,
    activePostings: 0,
    shortlisted: 0,
    interviewed: 0,
    selected: 0,
  });
  const [jobPerformance, setJobPerformance] = useState<any[]>([]);
  const [statusBreakdown, setStatusBreakdown] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const recruiterJobs = jobs.filter(job => job.recruiter_id === user?.id);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!user?.id || recruiterJobs.length === 0) {
        setIsLoading(false);
        return;
      }
      
      try {
        const jobIds = recruiterJobs.map(j => j.id);
        
        // Get all applications for recruiter's jobs
        const { data: apps } = await supabase
          .from('applications')
          .select('*')
          .in('job_id', jobIds);
        
        const applications = apps || [];
        
        // Calculate metrics
        const shortlisted = applications.filter(a => a.status === 'shortlisted').length;
        const interviewed = applications.filter(a => a.status === 'interview').length;
        const selected = applications.filter(a => a.status === 'selected').length;
        const activeJobs = recruiterJobs.filter(j => j.status === 'active').length;
        
        const conversionRate = applications.length > 0 
          ? Math.round((selected / applications.length) * 100 * 10) / 10 
          : 0;
        
        setAnalyticsData({
          totalApplications: applications.length,
          conversionRate,
          avgTimeToHire: 18, // Placeholder - would need interview_schedules data
          activePostings: activeJobs,
          shortlisted,
          interviewed,
          selected,
        });
        
        // Job performance data
        const jobPerfData = recruiterJobs.map(job => {
          const jobApps = applications.filter(a => a.job_id === job.id);
          return {
            title: job.title.length > 20 ? job.title.substring(0, 20) + '...' : job.title,
            applications: jobApps.length,
            interviews: jobApps.filter(a => a.status === 'interview').length,
            offers: jobApps.filter(a => a.status === 'selected').length,
          };
        });
        setJobPerformance(jobPerfData);
        
        // Status breakdown for pie chart
        const statusCounts: Record<string, number> = {};
        applications.forEach(app => {
          const status = app.status || 'pending';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        const statusData = Object.entries(statusCounts).map(([name, value]) => ({
          name: name.replace('_', ' '),
          value,
        }));
        setStatusBreakdown(statusData);
        
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (!jobsLoading) {
      fetchAnalytics();
    }
  }, [user?.id, recruiterJobs.length, jobsLoading]);

  const metrics = [
    { label: 'Total Applications', value: analyticsData.totalApplications.toString(), change: `${analyticsData.shortlisted} shortlisted`, trend: 'up' },
    { label: 'Conversion Rate', value: `${analyticsData.conversionRate}%`, change: `${analyticsData.selected} selected`, trend: 'up' },
    { label: 'Interviews', value: analyticsData.interviewed.toString(), change: 'In progress', trend: 'up' },
    { label: 'Active Postings', value: analyticsData.activePostings.toString(), change: `of ${recruiterJobs.length} total`, trend: 'up' },
  ];

  if (jobsLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <h1 className="text-3xl font-heading font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground mt-1">Track your recruitment performance</p>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * index }}
          >
            <Card variant="elevated">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{metric.value}</p>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <ArrowUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{metric.change}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Performance Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-primary" />
                Job Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {jobPerformance.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No job data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={jobPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="title" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="applications" fill="hsl(var(--primary))" name="Applications" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="interviews" fill="hsl(var(--accent))" name="Interviews" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="offers" fill="hsl(var(--success))" name="Offers" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Application Status Breakdown */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Application Status Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {statusBreakdown.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No applications yet</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {statusBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-4 mt-4">
                    {statusBreakdown.map((item, index) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-muted-foreground capitalize">
                          {item.name}: {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <h4 className="font-semibold text-foreground mb-2">Quick Insights</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    {analyticsData.totalApplications} total applications received
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    {analyticsData.interviewed} candidates in interview stage
                  </li>
                  <li className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" />
                    {analyticsData.selected} offers extended
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default RecruiterAnalytics;
