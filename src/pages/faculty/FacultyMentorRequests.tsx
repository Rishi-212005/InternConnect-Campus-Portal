import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Loader2,
  CheckCircle,
  XCircle,
  GraduationCap,
  Mail,
  Building,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSupabaseAuthContext } from '@/contexts/SupabaseAuthContext';
import { useMentor } from '@/hooks/useMentor';
import { supabase } from '@/integrations/supabase/client';

const MAX_STUDENTS_PER_MENTOR = 10;

const FacultyMentorRequests: React.FC = () => {
  const { user } = useSupabaseAuthContext();
  const {
    studentRequests,
    isLoading,
    updateRequestStatus,
    fetchStudentRequests,
  } = useMentor(user?.id, 'faculty');

  const [approvedCount, setApprovedCount] = useState(0);

  useEffect(() => {
    const fetchApprovedCount = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('mentor_requests')
        .select('id')
        .eq('mentor_id', user.id)
        .eq('status', 'approved');
      
      setApprovedCount(data?.length || 0);
    };

    fetchApprovedCount();
  }, [user?.id, studentRequests]);

  const handleApprove = async (requestId: string) => {
    if (approvedCount >= MAX_STUDENTS_PER_MENTOR) {
      return;
    }
    await updateRequestStatus(requestId, 'approved');
    setApprovedCount(prev => prev + 1);
  };

  const handleReject = async (requestId: string) => {
    await updateRequestStatus(requestId, 'rejected');
  };

  const pendingRequests = studentRequests.filter(r => r.request_status === 'pending');
  const approvedRequests = studentRequests.filter(r => r.request_status === 'approved');
  const rejectedRequests = studentRequests.filter(r => r.request_status === 'rejected');

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
        <h1 className="text-3xl font-heading font-bold text-foreground">Mentee Requests</h1>
        <p className="text-muted-foreground mt-1">Manage student mentorship requests</p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold">{studentRequests.length}</p>
            <p className="text-sm text-muted-foreground">Total Requests</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-warning">{pendingRequests.length}</p>
            <p className="text-sm text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-success">{approvedCount}</p>
            <p className="text-sm text-muted-foreground">
              My Mentees ({approvedCount}/{MAX_STUDENTS_PER_MENTOR})
            </p>
          </CardContent>
        </Card>
        <Card variant="glass">
          <CardContent className="pt-6 text-center">
            <p className="text-2xl font-bold text-destructive">{rejectedRequests.length}</p>
            <p className="text-sm text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>
      </div>

      {approvedCount >= MAX_STUDENTS_PER_MENTOR && (
        <Card className="border-warning/50 bg-warning/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-warning" />
              <p className="text-sm">
                You have reached the maximum capacity of {MAX_STUDENTS_PER_MENTOR} students.
                You cannot accept more requests until a student is removed.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="pending" className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Pending ({pendingRequests.length})
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex items-center gap-2">
            <UserCheck className="w-4 h-4" />
            Approved ({approvedRequests.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex items-center gap-2">
            <UserX className="w-4 h-4" />
            Rejected ({rejectedRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-6">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold">No Pending Requests</h3>
                <p className="text-sm text-muted-foreground">
                  You don't have any pending mentorship requests.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingRequests.map((student, index) => (
                <motion.div
                  key={student.request_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="interactive">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-3">
                          <GraduationCap className="w-8 h-8 text-accent" />
                        </div>
                        <h3 className="font-semibold">{student.full_name}</h3>
                        {student.roll_number && (
                          <p className="text-sm text-muted-foreground">
                            Roll: {student.roll_number}
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <Building className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {student.department || 'N/A'}
                          </span>
                        </div>
                        {student.cgpa && (
                          <p className="text-sm font-medium text-accent mt-1">
                            CGPA: {student.cgpa}/10
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{student.email}</span>
                        </div>

                        <div className="flex gap-2 mt-4">
                          <Button
                            className="flex-1"
                            variant="default"
                            onClick={() => handleApprove(student.request_id)}
                            disabled={approvedCount >= MAX_STUDENTS_PER_MENTOR}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            className="flex-1"
                            variant="outline"
                            onClick={() => handleReject(student.request_id)}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          {approvedRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <UserCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold">No Approved Students</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't approved any student mentorship requests yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {approvedRequests.map((student, index) => (
                <motion.div
                  key={student.request_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="elevated" className="border-success/30">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Badge className="bg-success mb-3">Your Mentee</Badge>
                        <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-3">
                          <GraduationCap className="w-8 h-8 text-success" />
                        </div>
                        <h3 className="font-semibold">{student.full_name}</h3>
                        {student.roll_number && (
                          <p className="text-sm text-muted-foreground">
                            Roll: {student.roll_number}
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-1">
                          <Building className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {student.department || 'N/A'}
                          </span>
                        </div>
                        {student.cgpa && (
                          <p className="text-sm font-medium text-accent mt-1">
                            CGPA: {student.cgpa}/10
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{student.email}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rejected" className="mt-6">
          {rejectedRequests.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <UserX className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="font-semibold">No Rejected Requests</h3>
                <p className="text-sm text-muted-foreground">
                  You haven't rejected any mentorship requests.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rejectedRequests.map((student, index) => (
                <motion.div
                  key={student.request_id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card variant="elevated" className="opacity-60">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <Badge variant="destructive" className="mb-3">Rejected</Badge>
                        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-3">
                          <GraduationCap className="w-8 h-8 text-destructive" />
                        </div>
                        <h3 className="font-semibold">{student.full_name}</h3>
                        {student.roll_number && (
                          <p className="text-sm text-muted-foreground">
                            Roll: {student.roll_number}
                          </p>
                        )}
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{student.email}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FacultyMentorRequests;
