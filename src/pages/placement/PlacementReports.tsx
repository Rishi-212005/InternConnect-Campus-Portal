import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, Loader2, Users, Briefcase, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useJobs } from '@/hooks/useJobs';
import { format } from 'date-fns';

const PlacementReports: React.FC = () => {
  const { jobs, isLoading: jobsLoading } = useJobs();
  const [reportData, setReportData] = useState({
    totalStudents: 0,
    placedStudents: 0,
    totalApplications: 0,
    totalCompanies: 0,
    activeJobs: 0,
    pendingJobs: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchReportData = async () => {
      if (jobsLoading) return;
      
      try {
        // Get student count
        const { count: studentCount } = await supabase
          .from('student_profiles')
          .select('*', { count: 'exact', head: true });
        
        // Get applications
        const { data: applications } = await supabase
          .from('applications')
          .select('student_id, status');
        
        const placedStudentIds = new Set(
          applications?.filter(a => a.status === 'selected').map(a => a.student_id) || []
        );
        
        // Get unique companies
        const uniqueCompanies = new Set(jobs.map(j => j.company_name));
        
        setReportData({
          totalStudents: studentCount || 0,
          placedStudents: placedStudentIds.size,
          totalApplications: applications?.length || 0,
          totalCompanies: uniqueCompanies.size,
          activeJobs: jobs.filter(j => j.status === 'active').length,
          pendingJobs: jobs.filter(j => j.status === 'pending_verification').length,
        });
      } catch (error) {
        console.error('Error fetching report data:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchReportData();
  }, [jobs, jobsLoading]);

  const generateReport = (type: string) => {
    // Create a simple CSV report
    const currentDate = format(new Date(), 'yyyy-MM-dd');
    let csvContent = '';
    let filename = '';
    
    switch (type) {
      case 'placement':
        csvContent = `Placement Report - ${currentDate}\n\n`;
        csvContent += `Total Students,${reportData.totalStudents}\n`;
        csvContent += `Students Placed,${reportData.placedStudents}\n`;
        csvContent += `Placement Rate,${reportData.totalStudents > 0 ? Math.round((reportData.placedStudents / reportData.totalStudents) * 100) : 0}%\n`;
        csvContent += `Total Applications,${reportData.totalApplications}\n`;
        filename = `placement-report-${currentDate}.csv`;
        break;
      case 'company':
        csvContent = `Company Report - ${currentDate}\n\n`;
        csvContent += `Total Companies,${reportData.totalCompanies}\n`;
        csvContent += `Active Jobs,${reportData.activeJobs}\n`;
        csvContent += `Pending Verification,${reportData.pendingJobs}\n`;
        filename = `company-report-${currentDate}.csv`;
        break;
      case 'student':
        csvContent = `Student Summary - ${currentDate}\n\n`;
        csvContent += `Total Students,${reportData.totalStudents}\n`;
        csvContent += `Placed,${reportData.placedStudents}\n`;
        csvContent += `Searching,${reportData.totalStudents - reportData.placedStudents}\n`;
        filename = `student-summary-${currentDate}.csv`;
        break;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const reports = [
    { 
      name: 'Monthly Placement Report', 
      type: 'placement',
      period: format(new Date(), 'MMMM yyyy'), 
      icon: Users,
      description: 'Overview of placement statistics and student outcomes'
    },
    { 
      name: 'Company Performance Report', 
      type: 'company',
      period: `Q${Math.ceil((new Date().getMonth() + 1) / 3)} ${new Date().getFullYear()}`, 
      icon: Building2,
      description: 'Analysis of company partnerships and hiring activity'
    },
    { 
      name: 'Student Placement Summary', 
      type: 'student',
      period: `Academic Year ${new Date().getFullYear()}`, 
      icon: Briefcase,
      description: 'Comprehensive student placement status breakdown'
    },
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
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-heading font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground mt-1">Generate and download placement reports</p>
      </motion.div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-foreground">{reportData.totalStudents}</p>
            <p className="text-sm text-muted-foreground">Total Students</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">{reportData.placedStudents}</p>
            <p className="text-sm text-muted-foreground">Placed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-blue-600">{reportData.totalCompanies}</p>
            <p className="text-sm text-muted-foreground">Companies</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-accent">{reportData.totalApplications}</p>
            <p className="text-sm text-muted-foreground">Applications</p>
          </CardContent>
        </Card>
      </div>

      {/* Available Reports */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Available Reports
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reports.map((report, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * i }}
              className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <report.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{report.name}</p>
                  <p className="text-sm text-muted-foreground">{report.period}</p>
                  <p className="text-xs text-muted-foreground mt-1">{report.description}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateReport(report.type)}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Report Info */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-accent" />
            Report Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">Data Freshness</h4>
              <p className="text-sm text-muted-foreground">
                All reports are generated with real-time data from the database.
                Reports reflect the current state as of {format(new Date(), 'PPpp')}.
              </p>
            </div>
            <div className="p-4 bg-muted/30 rounded-lg">
              <h4 className="font-semibold text-foreground mb-2">Report Format</h4>
              <p className="text-sm text-muted-foreground">
                Reports are downloaded as CSV files that can be opened in Excel,
                Google Sheets, or any spreadsheet application.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlacementReports;
