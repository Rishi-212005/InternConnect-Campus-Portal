import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, GraduationCap, Briefcase, Search, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';

interface StudentWithProfile {
  user_id: string;
  department: string | null;
  cgpa: number | null;
  skills: string[] | null;
  full_name: string;
  email: string;
  avatar_url: string | null;
  status: string;
  company: string | null;
}

const FacultyStudents: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const [students, setStudents] = useState<StudentWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchStudents = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      
      try {
        // Get only students who are mentees of this faculty (approved mentor requests)
        const { data: menteeRequests } = await supabase
          .from('mentor_requests')
          .select('student_id')
          .eq('mentor_id', user.id)
          .eq('status', 'approved');
        
        if (!menteeRequests || menteeRequests.length === 0) {
          setStudents([]);
          setIsLoading(false);
          return;
        }
        
        const menteeIds = menteeRequests.map(r => r.student_id);
        
        // Get student profiles for mentees only
        const { data: studentProfiles } = await supabase
          .from('student_profiles')
          .select('user_id, department, cgpa, skills')
          .in('user_id', menteeIds);
        
        if (!studentProfiles) {
          setIsLoading(false);
          return;
        }
        
        // Get base profiles for students
        const userIds = studentProfiles.map(s => s.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email, avatar_url')
          .in('user_id', userIds);
        
        // Get applications to determine status
        const { data: applications } = await supabase
          .from('applications')
          .select('student_id, status, jobs(company_name)')
          .in('student_id', userIds);
        
        // Combine data
        const studentsWithDetails: StudentWithProfile[] = studentProfiles.map(student => {
          const profile = profiles?.find(p => p.user_id === student.user_id);
          const studentApps = applications?.filter(a => a.student_id === student.user_id) || [];
          
          // Determine status
          let status = 'searching';
          let company = null;
          
          const selectedApp = studentApps.find(a => a.status === 'selected');
          const interviewApp = studentApps.find(a => a.status === 'interview');
          
          if (selectedApp) {
            status = 'placed';
            company = (selectedApp.jobs as any)?.company_name || null;
          } else if (interviewApp) {
            status = 'interviewing';
            company = (interviewApp.jobs as any)?.company_name || null;
          } else if (studentApps.length > 0) {
            status = 'applied';
          }
          
          return {
            user_id: student.user_id,
            department: student.department,
            cgpa: student.cgpa,
            skills: student.skills,
            full_name: profile?.full_name || 'Unknown',
            email: profile?.email || '',
            avatar_url: profile?.avatar_url,
            status,
            company,
          };
        });
        
        setStudents(studentsWithDetails);
      } catch (error) {
        console.error('Error fetching students:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStudents();
  }, [user]);

  const filteredStudents = students.filter(student =>
    student.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.department?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    student.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string, company: string | null) => {
    switch (status) {
      case 'placed':
        return <Badge className="bg-green-100 text-green-700">Placed {company && `@ ${company}`}</Badge>;
      case 'interviewing':
        return <Badge className="bg-blue-100 text-blue-700">Interviewing {company && `@ ${company}`}</Badge>;
      case 'applied':
        return <Badge className="bg-purple-100 text-purple-700">Applied</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-700">Searching</Badge>;
    }
  };

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
        <h1 className="text-3xl font-heading font-bold text-foreground">My Mentees</h1>
        <p className="text-muted-foreground mt-1">Monitor your mentees' progress and placements</p>
      </motion.div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          placeholder="Search by name, department, or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-foreground">{students.length}</p>
            <p className="text-sm text-muted-foreground">Total Mentees</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-green-600">
              {students.filter(s => s.status === 'placed').length}
            </p>
            <p className="text-sm text-muted-foreground">Placed</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {students.filter(s => s.status === 'interviewing').length}
            </p>
            <p className="text-sm text-muted-foreground">Interviewing</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-yellow-600">
              {students.filter(s => s.status === 'searching').length}
            </p>
            <p className="text-sm text-muted-foreground">Searching</p>
          </CardContent>
        </Card>
      </div>

      {/* Student Cards */}
      {filteredStudents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No mentees found</p>
          <p className="text-sm mt-1">Students will appear here once they send you a mentor request and you approve it.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStudents.map((student, i) => (
            <motion.div
              key={student.user_id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Card variant="interactive">
                <CardContent className="pt-6 text-center">
                  <div className="w-16 h-16 rounded-full gradient-primary mx-auto flex items-center justify-center mb-3">
                    {student.avatar_url ? (
                      <img 
                        src={student.avatar_url} 
                        alt={student.full_name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-primary-foreground" />
                    )}
                  </div>
                  <h3 className="font-semibold text-foreground">{student.full_name}</h3>
                  <p className="text-sm text-muted-foreground">{student.department || 'No Department'}</p>
                  <p className="text-sm text-muted-foreground">
                    CGPA: {student.cgpa ? `${student.cgpa}/10` : 'N/A'}
                  </p>
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                    <Mail className="w-3 h-3" />
                    {student.email}
                  </div>
                  <div className="mt-3">
                    {getStatusBadge(student.status, student.company)}
                  </div>
                  {student.skills && student.skills.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-3">
                      {student.skills.slice(0, 3).map(skill => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                      {student.skills.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{student.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FacultyStudents;
