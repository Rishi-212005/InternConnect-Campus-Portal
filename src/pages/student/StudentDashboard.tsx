import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Briefcase,
  TrendingUp,
  Calendar,
  Award,
  Target,
  ChevronRight,
  Star,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import DashboardLayout from '@/components/layout/DashboardLayout';
import PendingApprovalScreen from '@/components/layout/PendingApprovalScreen';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useProfile } from '@/hooks/useProfile';
import { useApplications } from '@/hooks/useApplications';
import { useJobs } from '@/hooks/useJobs';
import { supabase } from '@/integrations/supabase/client';

// Import sub-pages
import StudentProfile from './StudentProfile';
import StudentJobs from './StudentJobs';
import StudentApplications from './StudentApplications';
import StudentSchedule from './StudentSchedule';
import StudentExams from './StudentExams';
import StudentMentor from './StudentMentor';

const StudentHome: React.FC = () => {
  const { user, profile } = useSupabaseAuthContext();
  const { studentProfile, isLoading: profileLoading } = useProfile(user?.id);
  const { applications, isLoading: appsLoading } = useApplications('student', user?.id);
  const { jobs } = useJobs('active');
  const navigate = useNavigate();
  
  const [interviewCount, setInterviewCount] = useState(0);
  const [isLoadingInterviews, setIsLoadingInterviews] = useState(true);

  // Fetch interview count
  useEffect(() => {
    const fetchInterviewCount = async () => {
      if (!user?.id) return;
      
      try {
        const { data: interviewApps } = await supabase
          .from('applications')
          .select('id')
          .eq('student_id', user.id)
          .eq('status', 'interview');
        
        setInterviewCount(interviewApps?.length || 0);
      } catch (error) {
        console.error('Error fetching interviews:', error);
      } finally {
        setIsLoadingInterviews(false);
      }
    };
    
    fetchInterviewCount();
  }, [user?.id]);

  const firstName = profile?.full_name?.split(' ')[0] || 'Student';
  const skillBadges = studentProfile?.skills || [];
  
  // Calculate profile completion
  const profileCompletion = [
    profile?.full_name,
    profile?.phone,
    studentProfile?.department,
    studentProfile?.cgpa,
    studentProfile?.skills?.length,
    studentProfile?.resume_url,
  ].filter(Boolean).length * 16;

  // Get recommended jobs (match based on skills)
  const recommendedJobs = jobs.slice(0, 3).map(job => {
    const studentSkills = studentProfile?.skills || [];
    const jobSkills = job.required_skills || [];
    const matchingSkills = studentSkills.filter(skill => 
      jobSkills.some(js => js.toLowerCase().includes(skill.toLowerCase()))
    );
    const matchScore = jobSkills.length > 0 
      ? Math.round((matchingSkills.length / jobSkills.length) * 100) 
      : 50;
    
    return {
      ...job,
      matchScore: Math.max(matchScore, 50),
      tags: job.required_skills?.slice(0, 3) || [],
    };
  });

  const stats = [
    { label: 'Applications Sent', value: applications.length.toString(), icon: Briefcase, color: 'text-accent' },
    { label: 'Interview Calls', value: interviewCount.toString(), icon: Calendar, color: 'text-success' },
    { label: 'Jobs Available', value: jobs.length.toString(), icon: TrendingUp, color: 'text-primary' },
    { label: 'Skill Badges', value: skillBadges.length.toString(), icon: Award, color: 'text-warning' },
  ];

  if (profileLoading || appsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl md:text-3xl font-bold font-heading">
          Welcome back, {firstName}! 👋
        </h1>
        <p className="text-muted-foreground mt-1">
          Track your applications and discover new opportunities
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-accent" />
                Verifiable Digital Profile
              </CardTitle>
              <CardDescription>Your skill badges and certifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-accent bg-accent/20 flex items-center justify-center text-xl font-bold">
                    {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'S'}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-success rounded-full flex items-center justify-center">
                    <Award className="w-3 h-3 text-success-foreground" />
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold">{profile?.full_name || 'Student Name'}</h3>
                  <p className="text-sm text-muted-foreground">
                    {studentProfile?.department || 'Department'}, Year {studentProfile?.year_of_study || '?'}
                  </p>
                  <p className="text-sm text-accent font-medium">
                    CGPA: {studentProfile?.cgpa ? `${studentProfile.cgpa}/10` : 'Not set'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Skill Badges</p>
                <div className="flex flex-wrap gap-2">
                  {skillBadges.length > 0 ? (
                    skillBadges.map((skill) => (
                      <Badge
                        key={skill}
                        variant="default"
                        className="flex items-center gap-1"
                      >
                        <Star className="w-3 h-3" />
                        {skill}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No skills added yet</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Profile Completion</span>
                  <span className="text-accent font-medium">{profileCompletion}%</span>
                </div>
                <Progress value={profileCompletion} className="h-2" />
              </div>

              <Button variant="outline" className="w-full" onClick={() => navigate('/student/profile')}>
                Edit Profile
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Recommended Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card variant="elevated" className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Recommended Jobs
                  </CardTitle>
                  <CardDescription>Based on your profile and skills</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => navigate('/student/jobs')}>
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recommendedJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Briefcase className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No jobs available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendedJobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="p-4 rounded-lg border border-border hover:border-accent/50 hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h4 className="font-semibold">{job.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {job.company_name} • {job.location || 'Remote'}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {job.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="text-right space-y-2">
                          <div className="flex items-center gap-1">
                            <div
                              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                job.matchScore >= 90
                                  ? 'bg-success/20 text-success'
                                  : job.matchScore >= 70
                                  ? 'bg-accent/20 text-accent'
                                  : 'bg-warning/20 text-warning'
                              }`}
                            >
                              {job.matchScore}%
                            </div>
                          </div>
                          {job.salary_min && (
                            <p className="text-sm font-medium text-accent">
                              ₹{(job.salary_min / 100000).toFixed(1)}L - ₹{((job.salary_max || job.salary_min) / 100000).toFixed(1)}L
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button size="sm" variant="accent" className="flex-1" onClick={() => navigate('/student/jobs')}>
                          View Details
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

const StudentDashboard: React.FC = () => {
  const { user, isLoading: authLoading } = useSupabaseAuthContext();
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);

  useEffect(() => {
    const checkVerification = async () => {
      if (!user?.id) {
        setIsCheckingVerification(false);
        return;
      }

      try {
        const { data: studentProfile } = await supabase
          .from('student_profiles')
          .select('is_verified')
          .eq('user_id', user.id)
          .single();

        setIsVerified(studentProfile?.is_verified ?? false);
      } catch (error) {
        console.error('Error checking student verification:', error);
        setIsVerified(false);
      } finally {
        setIsCheckingVerification(false);
      }
    };

    checkVerification();
  }, [user?.id]);

  if (authLoading || isCheckingVerification) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isVerified) {
    return (
      <PendingApprovalScreen
        title="Verification Pending"
        description="Your student account is awaiting verification from the Placement Cell."
        roleType="student"
      />
    );
  }

  return (
    <DashboardLayout>
      <Routes>
        <Route index element={<StudentHome />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="mentor" element={<StudentMentor />} />
        <Route path="jobs" element={<StudentJobs />} />
        <Route path="applications" element={<StudentApplications />} />
        <Route path="exams" element={<StudentExams />} />
        <Route path="schedule" element={<StudentSchedule />} />
      </Routes>
    </DashboardLayout>
  );
};

export default StudentDashboard;
