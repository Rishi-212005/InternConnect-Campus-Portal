import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, Users, Award, Loader2, Briefcase, ClipboardCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FacultyProgress: React.FC = () => {
  const [stats, setStats] = useState({
    totalStudents: 0,
    placedStudents: 0,
    interviewingStudents: 0,
    successRate: 0,
    totalApplications: 0,
    approvedApplications: 0,
  });
  const [progressData, setProgressData] = useState<any[]>([]);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        // Get all students
        const { data: students, count: totalStudents } = await supabase
          .from('student_profiles')
          .select('user_id, department', { count: 'exact' });
        
        // Get all applications
        const { data: applications } = await supabase
          .from('applications')
          .select('student_id, status');
        
        const apps = applications || [];
        
        // Calculate placed and interviewing students
        const placedStudentIds = new Set(
          apps.filter(a => a.status === 'selected').map(a => a.student_id)
        );
        const interviewingStudentIds = new Set(
          apps.filter(a => a.status === 'interview').map(a => a.student_id)
        );
        
        const approvedApps = apps.filter(a => 
          ['faculty_approved', 'applied', 'shortlisted', 'interview', 'selected'].includes(a.status || '')
        ).length;
        
        const successRate = (totalStudents || 0) > 0 
          ? Math.round((placedStudentIds.size / (totalStudents || 1)) * 100) 
          : 0;
        
        setStats({
          totalStudents: totalStudents || 0,
          placedStudents: placedStudentIds.size,
          interviewingStudents: interviewingStudentIds.size,
          successRate,
          totalApplications: apps.length,
          approvedApplications: approvedApps,
        });
        
        // Progress metrics
        const applicationProgress = apps.length > 0 
          ? Math.round((apps.filter(a => a.status !== 'pending').length / apps.length) * 100)
          : 0;
        const interviewProgress = apps.length > 0
          ? Math.round((apps.filter(a => ['interview', 'selected'].includes(a.status || '')).length / apps.length) * 100)
          : 0;
        const offerProgress = apps.length > 0
          ? Math.round((apps.filter(a => a.status === 'selected').length / apps.length) * 100)
          : 0;
        
        setProgressData([
          { name: 'Applications Processed', value: applicationProgress },
          { name: 'Interview Stage', value: interviewProgress },
          { name: 'Offers Made', value: offerProgress },
        ]);
        
        // Department-wise breakdown
        const deptCounts: Record<string, { total: number; placed: number }> = {};
        students?.forEach(student => {
          const dept = student.department || 'Unknown';
          if (!deptCounts[dept]) {
            deptCounts[dept] = { total: 0, placed: 0 };
          }
          deptCounts[dept].total++;
          if (placedStudentIds.has(student.user_id)) {
            deptCounts[dept].placed++;
          }
        });
        
        const deptData = Object.entries(deptCounts)
          .filter(([name]) => name !== 'Unknown')
          .map(([name, data]) => ({
            name: name.length > 12 ? name.substring(0, 12) + '...' : name,
            total: data.total,
            placed: data.placed,
          }));
        setDepartmentData(deptData);
        
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProgress();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-heading font-bold text-foreground">Placement Progress</h1>
        <p className="text-muted-foreground mt-1">Track overall placement achievements</p>
      </motion.div>
      
      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="glass">
            <CardContent className="pt-6 text-center">
              <Users className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.totalStudents}</p>
              <p className="text-sm text-muted-foreground">Total Students</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="glass">
            <CardContent className="pt-6 text-center">
              <Award className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.placedStudents}</p>
              <p className="text-sm text-muted-foreground">Placed</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="glass">
            <CardContent className="pt-6 text-center">
              <Briefcase className="w-8 h-8 text-blue-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.interviewingStudents}</p>
              <p className="text-sm text-muted-foreground">In Interviews</p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="glass">
            <CardContent className="pt-6 text-center">
              <TrendingUp className="w-8 h-8 text-accent mx-auto mb-2" />
              <p className="text-2xl font-bold">{stats.successRate}%</p>
              <p className="text-sm text-muted-foreground">Success Rate</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Progress Bars */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-primary" />
                Placement Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {progressData.map((item, index) => (
                  <motion.div 
                    key={item.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                  >
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      <span className="text-sm font-medium text-foreground">{item.value}%</span>
                    </div>
                    <Progress value={item.value} className="h-3" />
                  </motion.div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.totalApplications}</p>
                    <p className="text-xs text-muted-foreground">Total Applications</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.approvedApplications}</p>
                    <p className="text-xs text-muted-foreground">Processed</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Department Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Department Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {departmentData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No department data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={departmentData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis stroke="hsl(var(--muted-foreground))" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }} 
                    />
                    <Bar dataKey="total" fill="hsl(var(--primary))" name="Total" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="placed" fill="hsl(var(--success))" name="Placed" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default FacultyProgress;
